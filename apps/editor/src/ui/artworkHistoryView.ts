import type {CoreDocument,RevisionId} from '@illustro/core';
import {CanvasNavigation} from '../canvasNavigation';
import {CanvasView} from '../canvasView';
import {captureExport,renderFrozenArtwork,renderFrozenArtworkTiledPreview,encodePng} from '../export/basicExport';
import {HistoryPreviewQueue} from './historyPreviewQueue';

// Reuse both completed and in-flight thumbnails. A 4000px preview can otherwise
// allocate several full-resolution pixel buffers for duplicate concurrent calls.
const cachedThumbnails=new WeakMap<CoreDocument,Map<RevisionId,Promise<Blob>>>();
const historyPreviewQueue=new HistoryPreviewQueue();
export function historyPreviewDimensions(width:number,height:number,maxWidth:number,maxHeight:number){
  if(![width,height,maxWidth,maxHeight].every(Number.isFinite)||[width,height,maxWidth,maxHeight].some(v=>v<1))
    throw new Error('履歴画像の大きさが正しくありません。');
  const scale=Math.min(1,maxWidth/width,maxHeight/height);
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}

// Full-resolution pixels are rendered exactly once; only the small on-screen image
// is encoded to PNG. Full-size comparisons remain available on explicit request.
async function renderHistoryPreview(artwork:CoreDocument,revision:RevisionId,maxWidth:number,maxHeight:number){
  const frozen=captureExport(artwork,undefined,revision);
  const {width,height}=historyPreviewDimensions(frozen.width,frozen.height,maxWidth,maxHeight);
  // A GPU/backend that cannot read individual tiles still uses the original
  // fully accurate rendering route; thumbnail failure must not lose history.
  let fastPixels:Uint8ClampedArray|null=null;
  try{fastPixels=await renderFrozenArtworkTiledPreview(frozen,width,height);}
  catch{fastPixels=null;}
  if(fastPixels)return {blob:await encodePng(fastPixels,width,height),width,height};
  const pixels=await renderFrozenArtwork(frozen);
  const bitmap=await createImageBitmap(
    new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>,frozen.width,frozen.height),
    {resizeWidth:width,resizeHeight:height,resizeQuality:'high'},
  );
  try{
    const canvas=new OffscreenCanvas(width,height),context=canvas.getContext('2d');
    if(!context)throw new Error('履歴画像を縮小できません。');
    context.drawImage(bitmap,0,0);
    return {blob:await canvas.convertToBlob({type:'image/png'}),width,height};
  }finally{bitmap.close();}
}

export function historyComparisonPreview(artwork:CoreDocument,revision:RevisionId){
  return historyPreviewQueue.run(()=>renderHistoryPreview(artwork,revision,1600,1200),'foreground');
}

export async function historyThumbnail(artwork:CoreDocument,revision:RevisionId){
  let cache=cachedThumbnails.get(artwork);
  if(!cache){cache=new Map();cachedThumbnails.set(artwork,cache);}
  const cached=cache.get(revision);
  if(cached)return cached;
  const thumbnail=historyPreviewQueue.run(()=>renderHistoryPreview(artwork,revision,160,120).then(result=>result.blob));
  if(cache.size>=24)cache.delete(cache.keys().next().value!);
  cache.set(revision,thumbnail);
  try{return await thumbnail;}
  catch(error){if(cache.get(revision)===thumbnail)cache.delete(revision);throw error;}
}

export function createHistoryComparison(url:string,caption:string,width:number,height:number){
  const figure=document.createElement('figure'),viewport=document.createElement('div'),image=new Image();
  const controls=document.createElement('div'),description=document.createElement('figcaption');
  const view=new CanvasView(width,height,.93);
  const render=()=>{
    const origin=view.screen({x:0,y:0}),x=view.screen({x:1,y:0}),y=view.screen({x:0,y:1});
    image.style.transform='matrix('+[x.x-origin.x,x.y-origin.y,y.x-origin.x,y.y-origin.y,origin.x,origin.y].join(',')+')';
  };
  const navigation=new CanvasNavigation(view,()=>{},render,()=>{});
  const abort=new AbortController(),signal=abort.signal;
  const point=(event:PointerEvent|WheelEvent)=>{
    const rect=viewport.getBoundingClientRect();
    return {x:event.clientX-rect.left,y:event.clientY-rect.top};
  };
  viewport.className='history-image-viewport';
  viewport.tabIndex=0;
  viewport.setAttribute('aria-label',caption+'。ドラッグで移動、ピンチで拡大・回転。');
  image.src=url;image.alt=caption;image.draggable=false;
  image.style.width=width+'px';image.style.height=height+'px';
  viewport.append(image);
  viewport.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    event.preventDefault();viewport.setPointerCapture(event.pointerId);
    if(event.pointerType==='touch')navigation.touchDown(event.pointerId,point(event),true);
    else navigation.mouseDown(event.pointerId,point(event));
  },{signal});
  viewport.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')navigation.touchMove(event.pointerId,point(event));
    else navigation.mouseMove(event.pointerId,point(event));
  },{signal});
  const release=(event:PointerEvent)=>{
    if(event.pointerType==='touch')navigation.touchUp(event.pointerId);
    else navigation.mouseUp(event.pointerId);
  };
  for(const type of ['pointerup','pointercancel','lostpointercapture'] as const)viewport.addEventListener(type,release,{signal});
  viewport.addEventListener('wheel',event=>{event.preventDefault();navigation.wheelZoom(event.deltaY,point(event));},{passive:false,signal});
  const button=(text:string,action:()=>void)=>{
    const control=document.createElement('button');
    control.type='button';control.textContent=text;
    control.onclick=()=>{action();render();};
    return control;
  };
  controls.className='history-image-controls';
  controls.append(button('拡大',()=>view.zoomAt(1.25,{x:view.cssWidth/2,y:view.cssHeight/2})),
    button('縮小',()=>view.zoomAt(.8,{x:view.cssWidth/2,y:view.cssHeight/2})),
    button('回転',()=>view.setRotation(view.rotation+Math.PI/2)),
    button('全体',()=>{view.setRotation(0);view.fit();}));
  description.textContent=caption;
  figure.append(description,viewport,controls);
  const observer=new ResizeObserver(()=>{
    if(viewport.clientWidth&&viewport.clientHeight){
      view.resize(viewport.clientWidth,viewport.clientHeight);render();
    }
  });
  observer.observe(viewport);
  return {figure,dispose:()=>{observer.disconnect();abort.abort();navigation.dispose();}};
}
