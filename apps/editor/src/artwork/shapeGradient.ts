import {validateEditableArtwork,type ArtPoint,type EditableGradient,type EditablePath,type GradientStop,type LayerId,type LayerMask} from '@illustro/core';
import {layerMaskCoverage,samplePixelMask} from '@illustro/brush-rt';
import {runArtwork} from './run';
import {button,labelledField,locate,numberField,paintPreview,selectField,type ArtworkActions} from './tools';

function curve(a:ArtPoint,b:ArtPoint,c:ArtPoint):ArtPoint[]{
  return [{...a,outX:b.x,outY:b.y},{...c,inX:b.x,inY:b.y}];
}
/** Round corners as editable cubic segments; no new file format is needed. */
export function roundedRectanglePoints(a:ArtPoint,b:ArtPoint,radius:number):ArtPoint[]{
  const l=Math.min(a.x,b.x),r=Math.max(a.x,b.x),t=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y);
  const d=Math.max(0,Math.min(radius,(r-l)/2,(bottom-t)/2)),k=4*(Math.SQRT2-1)/3*d;
  if(!d)return [{x:l,y:t},{x:r,y:t},{x:r,y:bottom},{x:l,y:bottom}];
  return [
    {x:l+d,y:t,inX:l+d-k,inY:t},
    {x:r-d,y:t,outX:r-d+k,outY:t},
    {x:r,y:t+d,inX:r,inY:t+d-k},
    {x:r,y:bottom-d,outX:r,outY:bottom-d+k},
    {x:r-d,y:bottom,inX:r-d+k,inY:bottom},
    {x:l+d,y:bottom,outX:l+d-k,outY:bottom},
    {x:l,y:bottom-d,inX:l,inY:bottom-d+k},
    {x:l,y:t+d,outX:l,outY:t+d-k}
  ];
}
export function regularPolygonPoints(a:ArtPoint,b:ArtPoint,count:number):ArtPoint[]{
  const sides=Math.max(3,Math.min(64,Math.round(count)));
  const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,rx=Math.abs(a.x-b.x)/2,ry=Math.abs(a.y-b.y)/2;
  return Array.from({length:sides},(_,i)=>{
    const angle=-Math.PI/2+2*Math.PI*i/sides;
    return {x:cx+rx*Math.cos(angle),y:cy+ry*Math.sin(angle)};
  });
}
/** Reverse the actual color interpolation, including each interval's midpoint.
 * The midpoint belongs to the interval starting at the preceding stop. */
export function reverseGradientStops(current:readonly GradientStop[]):GradientStop[]{
  const ordered=[...current].sort((a,b)=>a.at-b.at);
  return ordered.reverse().map((stop,index)=>({...stop,at:1-stop.at,
    midpoint:index<ordered.length-1?1-ordered[index+1]!.midpoint:stop.midpoint}));
}
/** A new shape and its preview must use the same frozen selection snapshot.
 * An edited layer instead keeps its existing vector mask in ArtworkActions.save. */
export function shapeGradientInitialMask(editing:LayerId|undefined,draftMask:LayerMask|null):LayerMask|null|undefined{
  return editing?undefined:draftMask;
}
/** Preserve the original layer mask in a preview when selection changes. */
export function shapeGradientPreviewMask(
  editing:LayerId|undefined,selected:Readonly<{id:LayerId;mask:LayerMask|null}>|null|undefined,
  originalMask:LayerMask|null,draftMask:LayerMask|null
):LayerMask|null{
  return editing?(selected?.id===editing?selected.mask:originalMask):draftMask;
}
/** Exact box-average for a rectangular selection in a downscaled preview.
 * A tiny selection must not disappear just because the output pixel center
 * happens to fall outside it. Full-resolution rendering is unchanged. */
export function rectanglePreviewCoverage(
  mask:Readonly<{x:number;y:number;width:number;height:number;density:number;inverted:boolean}>,left:number,top:number,right:number,bottom:number
):number{
  const coveredWidth=Math.max(0,Math.min(right,mask.x+mask.width)-Math.max(left,mask.x));
  const coveredHeight=Math.max(0,Math.min(bottom,mask.y+mask.height)-Math.max(top,mask.y));
  const inside=(coveredWidth*coveredHeight)/((right-left)*(bottom-top));
  return mask.inverted?1-mask.density*inside:1-mask.density*(1-inside);
}
/** Area-averaged coverage for ellipse selections. Integrate the ellipse's
 * horizontal span rather than sampling only the output pixel center, so a
 * subpixel ellipse is still visible at low preview resolution. */
export function ellipsePreviewCoverage(
  mask:Readonly<{x:number;y:number;width:number;height:number;density:number;inverted:boolean}>,
  left:number,top:number,right:number,bottom:number
):number{
  const rx=mask.width/2,ry=mask.height/2,area=(right-left)*(bottom-top);
  const outside=mask.inverted?1:1-mask.density;
  if(!(rx>0&&ry>0&&area>0))return outside;
  const cx=mask.x+rx,cy=mask.y+ry;
  const x0=Math.max(left,mask.x),x1=Math.min(right,mask.x+mask.width);
  const y0=Math.max(top,mask.y),y1=Math.min(bottom,mask.y+mask.height);
  if(x0>=x1||y0>=y1)return outside;
  const within=(x:number,y:number)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
  let covered:number;
  if(within(left,top)&&within(left,bottom)&&within(right,top)&&within(right,bottom))
    covered=area;
  else if(mask.x>=left&&mask.x+mask.width<=right&&mask.y>=top&&mask.y+mask.height<=bottom)
    covered=Math.PI*rx*ry;
  else{
    const span=(y:number)=>{
      const ratio=(y-cy)/ry,half=rx*Math.sqrt(Math.max(0,1-ratio*ratio));
      return Math.max(0,Math.min(x1,cx+half)-Math.max(x0,cx-half));
    };
    // Only pixels crossing the curved boundary need numerical integration.
    const slices=32,step=(y1-y0)/slices;
    let sum=span(y0)+span(y1);
    for(let i=1;i<slices;i++)sum+=(i%2?4:2)*span(y0+i*step);
    covered=sum*step/3;
  }
  const inside=Math.max(0,Math.min(1,covered/area));
  return mask.inverted?1-mask.density*inside:1-mask.density*(1-inside);
}
/** Integrate a small polygon against a preview pixel using the same even-odd
 * fill rule as the committed path mask. Sampling only the pixel center can
 * erase a tiny selection completely at fit-to-screen zoom.
 * Use this only for paths spanning at most two preview pixels per axis:
 * large/complex paths retain the bounded-cost existing mask sampler. */
export function smallPathPreviewCoverage(
  mask:Extract<LayerMask,{shape:'path'}>,left:number,top:number,right:number,bottom:number
):number{
  const points=mask.points,n=points.length;
  const breaks=[top,bottom];
  const addY=(y:number)=>{if(y>top&&y<bottom)breaks.push(y);};
  for(let i=0;i<n;i++){
    const a=points[i]!,b=points[(i+1)%n]!;
    addY(a.y);
    if(a.x!==b.x)for(const x of [left,right]){
      const t=(x-a.x)/(b.x-a.x);
      if(t>0&&t<1)addY(a.y+t*(b.y-a.y));
    }
  }
  // A self-intersecting path uses even-odd fill. Split where edges cross so
  // the occupied horizontal span is linear between consecutive breakpoints.
  for(let i=0;i<n;i++){
    const a=points[i]!,b=points[(i+1)%n]!,ax=b.x-a.x,ay=b.y-a.y;
    for(let j=i+1;j<n;j++){
      const c=points[j]!,d=points[(j+1)%n]!,bx=d.x-c.x,by=d.y-c.y;
      const determinant=ax*by-ay*bx;
      if(!determinant)continue;
      const dx=c.x-a.x,dy=c.y-a.y;
      const t=(dx*by-dy*bx)/determinant,u=(dx*ay-dy*ax)/determinant;
      if(t>0&&t<1&&u>0&&u<1)addY(a.y+t*ay);
    }
  }
  breaks.sort((a,b)=>a-b);
  let covered=0;
  for(let i=1;i<breaks.length;i++){
    const y0=breaks[i-1]!,y1=breaks[i]!;
    if(y1<=y0)continue;
    const y=(y0+y1)/2,xs:number[]=[];
    for(let j=0;j<n;j++){
      const a=points[j]!,b=points[(j+1)%n]!;
      if((a.y>y)!==(b.y>y))xs.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));
    }
    xs.sort((a,b)=>a-b);
    for(let j=0;j+1<xs.length;j+=2)
      covered+=(y1-y0)*Math.max(0,Math.min(right,xs[j+1]!)-Math.max(left,xs[j]!));
  }
  const inside=Math.max(0,Math.min(1,covered/((right-left)*(bottom-top))));
  return mask.inverted?1-mask.density*inside:1-mask.density*(1-inside);
}
/** Apply the same vector/pixel mask coverage as the committed layer,
 * sampled at the preview pixel center in original document coordinates. */
export function applyShapePreviewMask(
  pixels:Uint8ClampedArray,mask:LayerMask|null|undefined,
  width:number,height:number,outputWidth:number,outputHeight:number,
  sampleCoverage:(mask:LayerMask,x:number,y:number)=>number=layerMaskCoverage
):void{
  // A zero-density mask cannot change any pixel; skip even the mask tile lookup.
  if(!mask?.enabled||mask.density===0)return;
  const defaultSampler=sampleCoverage===layerMaskCoverage;
  const downscaled=defaultSampler&&(outputWidth<width||outputHeight<height);
  // Pixel masks already store 64px source tiles. Reading their samples
  // directly avoids allocating 128x128 coverage tiles across a 4K preview.
  // Use the document pixel center, matching layerMaskCoverage's raster rule.
  const directPixelMask=defaultSampler&&mask.shape==='pixels'?mask:null;
  // Only small polygons use the exact area integral. This keeps the usual
  // 4K path preview on its existing fast raster-tile path.
  let tinyPathBounds:[number,number,number,number]|null=null;
  if(downscaled&&mask.shape==='path'&&mask.points.length<=128){
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const point of mask.points){
      minX=Math.min(minX,point.x);minY=Math.min(minY,point.y);
      maxX=Math.max(maxX,point.x);maxY=Math.max(maxY,point.y);
    }
    const previewPixelWidth=width/outputWidth,previewPixelHeight=height/outputHeight;
    const compact=maxX-minX<=2*previewPixelWidth&&maxY-minY<=2*previewPixelHeight;
    // A long, very thin selection can miss every preview pixel center.
    // Its narrow axis limits the number of expensive exact area evaluations.
    const thin=mask.points.length<=16&&
      (maxX-minX<=2*previewPixelWidth||maxY-minY<=2*previewPixelHeight);
    if(compact||thin)tinyPathBounds=[minX,minY,maxX,maxY];
  }
  for(let y=0;y<outputHeight;y++)for(let x=0;x<outputWidth;x++){
    const at=(y*outputWidth+x)*4;
    // An already transparent shape pixel cannot become visible through a
    // selection mask. Avoid costly 4K mask tile lookups for empty canvas area.
    if(pixels[at+3]===0)continue;
    const left=x*width/outputWidth,top=y*height/outputHeight;
    const right=(x+1)*width/outputWidth,bottom=(y+1)*height/outputHeight;
    const coverage=downscaled&&mask.shape==='rectangle'
      ?rectanglePreviewCoverage(mask,left,top,right,bottom)
      :downscaled&&mask.shape==='ellipse'
        ?ellipsePreviewCoverage(mask,left,top,right,bottom)
        :tinyPathBounds&&mask.shape==='path'
          ?(right<=tinyPathBounds[0]||bottom<=tinyPathBounds[1]||
            left>=tinyPathBounds[2]||top>=tinyPathBounds[3]
            ?(mask.inverted?1:1-mask.density)
            :smallPathPreviewCoverage(mask,left,top,right,bottom))
          :directPixelMask
            ?samplePixelMask(directPixelMask,Math.floor((left+right)/2)+.5,Math.floor((top+bottom)/2)+.5)/255
            :sampleCoverage(mask,(left+right)/2,(top+bottom)/2);
    pixels[at+3]=Math.round(pixels[at+3]!*coverage);
  }
}
/** The color-stop bar also works with a pen, touch, and keyboard. Keep
 * the displayed position on the same 0.1% grid as its numeric field. */
export function gradientStopPointerPosition(clientX:number,left:number,width:number):number|null{
  if(!Number.isFinite(clientX)||!Number.isFinite(left)||!Number.isFinite(width)||width<=0)return null;
  return Math.round(Math.max(0,Math.min(1,(clientX-left)/width))*1000)/1000;
}
export function gradientStopKeyboardPosition(current:number,key:string,shift=false):number|null{
  if(!Number.isFinite(current))return null;
  if(key==='Home')return 0;
  if(key==='End')return 1;
  if(key!=='ArrowLeft'&&key!=='ArrowRight')return null;
  const delta=(shift?10:1)*(key==='ArrowRight'?1:-1);
  return Math.max(0,Math.min(1000,Math.round(current*1000)+delta))/1000;
}
/** Keep the control handles attached to an anchor while moving it.
 * Both the live preview and the eventual commit use this same geometry. */
/** Keep full floating-point coordinates between the on-canvas handle preview
 * and the final saved artwork. Rounding here causes a visible jump at zoom. */
export function shapeAnchorFieldValues(points:readonly ArtPoint[]):[number,number,number,number]{
  const a=points[0],b=points.at(-1);
  return [a?.x??0,a?.y??0,b?.x??0,b?.y??0];
}
/** Invalid or temporarily blank numeric fields must not poison saved stops. */
export function safeGradientStopValue(value:number,min:number,max:number,fallback:number):number{
  return Math.max(min,Math.min(max,Number.isFinite(value)?value:fallback));
}
export function moveShapeAnchor(points:readonly ArtPoint[],index:number,next:ArtPoint):ArtPoint[]{
  const point=points[index];
  if(!point||!Number.isFinite(next.x)||!Number.isFinite(next.y))return [...points];
  const dx=next.x-point.x,dy=next.y-point.y;
  const moved={...point,x:next.x,y:next.y,
    ...(point.inX===undefined?{}:{inX:point.inX+dx,inY:point.inY!+dy}),
    ...(point.outX===undefined?{}:{outX:point.outX+dx,outY:point.outY!+dy})};
  return points.map((candidate,i)=>i===index?moved:candidate);
}
/** Keep the live on-canvas preview light at fit zoom, but use more detail
 * when zoomed in. Main-thread fallback is deliberately smaller to avoid
 * blocking pointer input on browsers without OffscreenCanvas. */
/** Keep gradient mask rasterization on the Worker for large live previews.
 * Thumbnail-size previews use area coverage to retain subpixel selections. */
/** Cancel a stale Worker render only after it has delayed a newer pointer
 * position long enough to be noticeable. Canceling on every pointermove
 * would starve the preview during a continuous drag. */
export function shouldCancelStaleShapePreview(elapsedMs:number):boolean{
  return Number.isFinite(elapsedMs)&&elapsedMs>=120;
}
export function shapeLiveMaskOnMainThread(kind:'path'|'gradient',outputWidth:number,outputHeight:number):boolean{
  return kind==='path'||outputWidth*outputHeight<=100000;
}
export function shapeLivePreviewDimensions(width:number,height:number,zoom:number,workerAvailable:boolean){
  const edge=workerAvailable?(Number.isFinite(zoom)&&zoom>=4?1024:Number.isFinite(zoom)&&zoom>=2?768:512):256;
  const scale=Math.min(1,edge/Math.max(width,height));
  return {outputWidth:Math.max(1,Math.round(width*scale)),outputHeight:Math.max(1,Math.round(height*scale))};
}
/** The stop bar and markers must show the opacity that the saved gradient uses. */
export function gradientStopCssColor(stop:Pick<GradientStop,'color'|'opacity'>):string{
  const red=parseInt(stop.color.slice(1,3),16);
  const green=parseInt(stop.color.slice(3,5),16);
  const blue=parseInt(stop.color.slice(5,7),16);
  return `rgba(${red}, ${green}, ${blue}, ${stop.opacity})`;
}
export function gradientStopSwatchBackground(stop:Pick<GradientStop,'color'|'opacity'>):string{
  const color=gradientStopCssColor(stop);
  return `linear-gradient(${color},${color}),repeating-conic-gradient(#d5d5d5 0% 25%,#fff 0% 50%) 50% / 8px 8px`;
}
export function installShapeGradientPanel(host:HTMLElement,api:ArtworkActions){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const heading=document.createElement('summary');heading.textContent='図形・グラデーション';
  const controls=document.createElement('div');controls.className='c06-clipboard-grid';
  const tools=document.createElement('div');tools.className='c06-clipboard-grid';
  const stopsArea=document.createElement('div'),status=document.createElement('output');
  const preview=document.createElement('canvas');preview.hidden=true;preview.style.maxWidth='100%';
  status.setAttribute('role','status');
  const type=selectField(controls,'描くもの',[
    ['shape','図形'],['gradient','グラデーション']
  ] as const);
  const shapeFields=document.createElement('div');shapeFields.className='c06-clipboard-grid';
  const gradientFields=document.createElement('div');gradientFields.className='c06-clipboard-grid';
  controls.append(shapeFields,gradientFields);
  const shape=selectField(shapeFields,'形',[
    ['rectangle','長方形'],['rounded','角丸長方形'],['polygon','多角形'],
    ['ellipse','楕円'],['polyline','直線・折れ線'],['bezier','ベジェ曲線']
  ] as const);
  const width=numberField(shapeFields,'線幅（px）',8,0,4096);
  const radius=numberField(shapeFields,'角の丸み（px）',24,0,4096,.5);
  const sides=numberField(shapeFields,'角の数',6,3,64);
  const stroke=document.createElement('input');stroke.type='color';labelledField(shapeFields,'線の色',stroke);
  const fill=document.createElement('input');fill.type='color';fill.value='#faac49';labelledField(shapeFields,'内側の色',fill);
  const filled=document.createElement('input');filled.type='checkbox';labelledField(shapeFields,'内側を塗る',filled);
  const closed=document.createElement('input');closed.type='checkbox';labelledField(shapeFields,'道筋を閉じる',closed);
  const square=document.createElement('input');square.type='checkbox';labelledField(shapeFields,'縦と横の長さをそろえる',square);
  gradientFields.append(button('色の並びを反転',()=>{
    stops=reverseGradientStops(stops);
    redrawStops();void refresh();
  },status));
  const mode=selectField(gradientFields,'広がり方',[
    ['linear','直線'],['radial','放射'],['reflected','反射'],['angular','角度']
  ] as const);
  const spread=selectField(gradientFields,'色の繰り返し',[
    ['pad','端の色を延ばす'],['repeat','同じ並びを繰り返す'],['reflect','往復して繰り返す']
  ] as const);
  const radialRatio=numberField(gradientFields,'放射の縦横比（%、100で円）',100,1,10000,1);
  mode.onchange=()=>{radialRatio.parentElement!.hidden=mode.value!=='radial';};
  const followFields=document.createElement('div');followFields.className='c06-clipboard-grid';
  gradientFields.append(followFields);
  const boundary=selectField(followFields,'形状追従に使う範囲',[
    ['mask','レイヤーのマスク']
  ] as const);
  const view=selectField(followFields,'見比べる',[
    ['normal','通常'],['follow','形状に沿う候補'],['split','左右で比較']
  ] as const);
  const applied=document.createElement('input');applied.type='checkbox';
  labelledField(followFields,'形状に沿う候補を採用する',applied);
  const coords=(['始点 X','始点 Y','終点 X','終点 Y'] as const)
    .map(label=>numberField(controls,label,0,-8192,16384,.5));
  // Programmatic handle drags may land between 0.5px increments.
  // Let numeric fields preserve that exact value for the final commit.
  coords.forEach(field=>{field.step='any';});
  let points:ArtPoint[]=[];
  let stops:GradientStop[]=[{at:0,color:'#23252d',opacity:1,midpoint:.5},{at:1,color:'#f5a950',opacity:1,midpoint:.5}];
  let editing:LayerId|undefined,previewId=0,lineStyle:NonNullable<EditablePath['lineStyle']>='solid';
  let previewRunning=false,previewPending=false,editingHandles=false;
  let previewAbort:AbortController|null=null;
  let liveVersion=0,liveRunning=false,liveAbort:AbortController|null=null;
  let liveStartedAt=-1;
  type LiveCandidate={content:EditablePath|EditableGradient;mask:LayerMask|null|undefined;
    context:NonNullable<ReturnType<ArtworkActions['context']>>;version:number;replacement:LayerId|undefined};
  let livePending:LiveCandidate|null=null;
  let editedOpacity:number|undefined,originalStrokeLayer:string|undefined;
  let draftDrawing:NonNullable<ReturnType<ArtworkActions['context']>>['drawing']|undefined;
  let draftMask:LayerMask|null=null,editingMask:LayerMask|null=null,savedBoundary:EditablePath|undefined;
  const getMask=()=>shapeGradientPreviewMask(editing,api.context()?.selected,editingMask,draftMask);
  const closedPaths=()=>api.context()?.paths.filter(item=>item.content.kind==='path'&&
    (item.content.closed||item.content.shape==='rectangle'||item.content.shape==='ellipse'))??[];
  function loadBoundaries(){
    boundary.replaceChildren(new Option('レイヤーのマスク','mask'));
    if(savedBoundary)boundary.add(new Option('保存した形状','saved'));
    for(const item of closedPaths())boundary.add(new Option(item.name,item.id));
  }
  function getBoundary():NonNullable<EditableGradient['follow']>{
    if(boundary.value==='mask'){
      if(!getMask()?.enabled)throw Error('マスクを使うには、範囲を選んで新しく作るか、レイヤーにマスクを付けてください。');
      return 'mask';
    }
    const path=boundary.value==='saved'?savedBoundary:closedPaths().find(item=>item.id===boundary.value)?.content;
    if(path?.kind!=='path')throw Error('内側が閉じた図形を選んでください。');
    return {kind:'path',shape:path.shape,points:path.points,closed:path.closed,stroke:path.stroke,fill:path.fill,width:path.width};
  }
  function setPoints(next:readonly ArtPoint[]){
    points=[...next];
    if(!points.length)return;
    shapeAnchorFieldValues(points).forEach((value,index)=>{coords[index]!.value=String(value);});
  }
  function data(follow=applied.checked){
    const [x,y,endX,endY]=coords.map(i=>i.valueAsNumber);
    const start={x:x??0,y:y??0},end={x:endX??0,y:endY??0};
    if(type.value==='gradient')return validateEditableArtwork({kind:'gradient',mode:mode.value,start,end,stops,
      ...(spread.value==='pad'?{}:{spread:spread.value}),
      ...(radialRatio.valueAsNumber===100?{}:{radialRatio:radialRatio.valueAsNumber/100}),
      ...(follow?{follow:getBoundary()}:{})}) as EditableGradient;
    let result=points.length>=2?[...points]:[start,end];
    result[0]={...result[0],...start};
    result[result.length-1]={...result.at(-1),...end};
    if(square.checked&&(shape.value==='rectangle'||shape.value==='ellipse')){
      const length=Math.max(Math.abs(end.x-start.x),Math.abs(end.y-start.y));
      result=[start,{x:start.x+Math.sign(end.x-start.x||1)*length,y:start.y+Math.sign(end.y-start.y||1)*length}];
    }
    const shapeKind=shape.value==='rounded'?'bezier':shape.value==='polygon'?'polyline':shape.value;
    if(shape.value==='rounded')result=roundedRectanglePoints(start,result.at(-1)!,radius.valueAsNumber);
    if(shape.value==='polygon')result=regularPolygonPoints(start,result.at(-1)!,sides.valueAsNumber);
    return validateEditableArtwork({kind:'path',shape:shapeKind,points:result,
      closed:shape.value==='rounded'||shape.value==='polygon'||closed.checked,lineStyle,stroke:stroke.value,fill:filled.checked?fill.value:null,width:width.valueAsNumber,
      ...(editedOpacity===undefined?{}:{opacity:editedOpacity}),
      ...(originalStrokeLayer?{originalStrokeLayer}:{})}) as EditablePath;
  }
  function stopHandles(){
    const wasEditing=editingHandles;
    editingHandles=false;
    ++liveVersion;
    livePending=null;
    liveAbort?.abort();
    if(wasEditing){
      draftDrawing?.showArtworkPreview(null);
      draftDrawing?.setCanvasEditGesture(null);
    }
  }
  /** Keep at most one raster preview in flight, coalescing fast pointer events.
   * A small Worker-rendered image follows the drag without allocating 4K RGBA
   * on the UI thread; stale results are never published after release/cancel. */
  async function pumpLive(){
    if(liveRunning)return;
    liveRunning=true;
    try{
      while(editingHandles&&livePending){
        const task=livePending;livePending=null;
        const {context,content,mask,version,replacement}=task;
        const {outputWidth,outputHeight}=shapeLivePreviewDimensions(
          context.width,context.height,context.drawing.viewState?.zoom??1,
          typeof OffscreenCanvas!=='undefined');
        const abort=new AbortController();liveAbort=abort;liveStartedAt=performance.now();
        const postMask=shapeLiveMaskOnMainThread(content.kind,outputWidth,outputHeight);
        try{
          const pixels=await runArtwork({width:context.width,height:context.height,
            outputWidth,outputHeight,mask:mask??null,previewMask:!postMask,content},
            {signal:abort.signal,priority:'preview'});
          if(abort.signal.aborted||version!==liveVersion||!editingHandles||
            draftDrawing!==context.drawing||api.context()?.drawing!==context.drawing)continue;
          // Large gradient previews stay masked in the drawing Worker rather
          // than blocking the UI thread with a second full-image pass.
          if(postMask)applyShapePreviewMask(pixels,mask,context.width,context.height,outputWidth,outputHeight);
          context.drawing.showArtworkPreview(new ImageData(pixels,outputWidth,outputHeight),
            false,replacement??null);
        }catch(error){
          if(!abort.signal.aborted&&version===liveVersion&&editingHandles&&
            draftDrawing===context.drawing&&api.context()?.drawing===context.drawing){
            // Do not leave an older geometry preview visible after the
            // newest render fails: the saved artwork must not be misrepresented.
            context.drawing.showArtworkPreview(null);
            status.textContent=error instanceof Error?error.message:String(error);
          }
        }finally{
          if(liveAbort===abort){liveAbort=null;liveStartedAt=-1;}
        }
      }
    }finally{liveRunning=false;liveAbort=null;liveStartedAt=-1;}
  }
  /** Show editable points on the actual canvas; the drawing engine owns the live drag outline. */
  function editOnCanvas(){
    const current=api.context();
    if(!current||current.drawing!==draftDrawing)throw Error('作品を開き直したため、編集をやり直してください。');
    stopHandles();
    // A generated preset must become editable path points before the first handle drag;
    // otherwise each preview would regenerate the preset and discard edited vertices.
    if(type.value==='shape'&&(shape.value==='rounded'||shape.value==='polygon')){
      const generated=data();
      if(generated.kind==='path'){
        shape.value=generated.shape;
        closed.checked=generated.closed;
        setPoints(generated.points);
        shape.onchange?.(new Event('change'));
      }
    }
    const content=data();
    const edits:Array<{point:ArtPoint;change:(point:ArtPoint)=>void;
      preview:(point:ArtPoint)=>EditablePath|EditableGradient}>=[];
    const edges:Array<[number,number]>=[];
    if(content.kind==='gradient'){
      const start=content.start,end=content.end;
      edits.push({point:start,change:point=>setPoints([point,end]),
        preview:point=>({...content,start:point})},
        {point:end,change:point=>setPoints([start,point]),
        preview:point=>({...content,end:point})});
      edges.push([0,1]);
    }else{
      if(content.points.length>128)throw Error('編集点が128個を超えています。必要な点を減らしてから調整してください。');
      for(const [index,point] of content.points.entries()){
        edits.push({point,change:next=>setPoints(moveShapeAnchor(content.points,index,next)),
          preview:next=>({...content,points:moveShapeAnchor(content.points,index,next)})});
        if(index)edges.push([index-1,index]);
      }
      if(content.closed&&content.points.length>2)edges.push([content.points.length-1,0]);
      for(const [index,point] of content.points.entries()){
        if(point.inX!==undefined&&point.inY!==undefined){
          const i=edits.length;
          edits.push({point:{x:point.inX,y:point.inY},change:next=>{
            setPoints(content.points.map((p,k)=>k===index?{...p,inX:next.x,inY:next.y}:p));
          },preview:next=>({...content,points:content.points.map((p,k)=>
            k===index?{...p,inX:next.x,inY:next.y}:p)})});edges.push([index,i]);
        }
        if(point.outX!==undefined&&point.outY!==undefined){
          const i=edits.length;
          edits.push({point:{x:point.outX,y:point.outY},change:next=>{
            setPoints(content.points.map((p,k)=>k===index?{...p,outX:next.x,outY:next.y}:p));
          },preview:next=>({...content,points:content.points.map((p,k)=>
            k===index?{...p,outX:next.x,outY:next.y}:p)})});edges.push([index,i]);
        }
      }
    }
    if(edits.length>256)throw Error('表示する編集点が多すぎます。');
    current.drawing.setCanvasEditGesture({path:false,width:2,color:'#43bfea',complete:()=>{},
      cancel:()=>{
        editingHandles=false;++liveVersion;livePending=null;liveAbort?.abort();
        current.drawing.showArtworkPreview(null);
        status.textContent='編集点の移動を取り消しました。';
      },
      pointEdit:{points:edits.map(item=>item.point),edges,closed:false,
        preview:(index,point)=>{
          const candidate=edits[index]?.preview(point);
          if(!candidate||!editingHandles)return;
          livePending={content:candidate,mask:getMask(),context:current,
            version:++liveVersion,replacement:editing};
          // Keep rendering during fast pointer motion, but abandon an old
          // frame if it has blocked the latest pointer position for 120ms.
          if(liveAbort&&liveStartedAt>=0&&
            shouldCancelStaleShapePreview(performance.now()-liveStartedAt))
            liveAbort.abort();
          void pumpLive();
        },
        commit:(index,point)=>{
          stopHandles();
          edits[index]?.change(point);
          void refresh();
          editOnCanvas();
        }}});
    editingHandles=true;
    status.textContent='丸い編集点を直接ドラッグできます。位置を確認してから「適用」を押してください。';
  }
  function redrawStops(){
    stopsArea.replaceChildren();
    if(type.value!=='gradient')return;
    // Color bar with draggable stop markers, including touch / pen input.
    const bar=document.createElement('div');
    bar.style.cssText='position:relative;height:32px;border:1px solid #8c929b;border-radius:6px;touch-action:none;margin:6px 12px 18px';
    bar.setAttribute('aria-label','グラデーションの色帯');
    const updateBar=()=>{
      const sorted=[...stops].sort((a,b)=>a.at-b.at);
      bar.style.background='linear-gradient(to right,'+sorted.map(s=>gradientStopCssColor(s)+' '+(s.at*100)+'%').join(',')+'),repeating-conic-gradient(#d5d5d5 0% 25%,#fff 0% 50%) 50% / 12px 12px';
    };
    updateBar();
    const markers:HTMLButtonElement[]=[];
    const updateMarkers=()=>markers.forEach((marker,i)=>{marker.style.left=(stops[i]!.at*100)+'%';});
    for(const [index,stop] of stops.entries()){
      const marker=document.createElement('button');
      marker.type='button';marker.title='色 '+(index+1)+' をドラッグして位置を調整';
      marker.setAttribute('aria-label',marker.title);
      marker.style.cssText='position:absolute;top:4px;transform:translateX(-50%);width:17px;height:24px;border:2px solid white;border-radius:5px;background:'+gradientStopSwatchBackground(stop)+';box-shadow:0 0 0 1px #252525;cursor:ew-resize;touch-action:none;padding:0';
      let dragging:number|null=null,positionBeforeDrag=stop.at;
      const setPosition=(at:number):boolean=>{
        if(stops[index]!.at===at)return false;
        stops[index]={...stops[index]!,at};
        const field=stopsArea.querySelectorAll<HTMLInputElement>('input[data-stop-position]')[index];
        if(field)field.value=String(Math.round(at*1000)/10);
        updateMarkers();updateBar();
        return true;
      };
      const move=(clientX:number)=>{
        const rect=bar.getBoundingClientRect();
        const at=gradientStopPointerPosition(clientX,rect.left,rect.width);
        if(at!==null&&setPosition(at))void refresh();
      };
      marker.onpointerdown=event=>{
        if(event.button!==0)return;
        event.preventDefault();positionBeforeDrag=stops[index]!.at;
        dragging=event.pointerId;marker.setPointerCapture(event.pointerId);move(event.clientX);
      };
      marker.onpointermove=event=>{if(dragging===event.pointerId)move(event.clientX);};
      const finish=(event:PointerEvent)=>{
        if(dragging!==event.pointerId)return;
        move(event.clientX);dragging=null;
        if(marker.hasPointerCapture(event.pointerId))marker.releasePointerCapture(event.pointerId);
        void refresh();
      };
      marker.onpointerup=finish;
      marker.onpointercancel=event=>{
        if(dragging!==event.pointerId)return;
        dragging=null;setPosition(positionBeforeDrag);
        if(marker.hasPointerCapture(event.pointerId))marker.releasePointerCapture(event.pointerId);
        void refresh();
      };
      // Capture can be lost without a pointercancel (for example, when the
      // browser interrupts the gesture). Never leave a half-dragged stop.
      marker.onlostpointercapture=()=>{
        if(dragging===null)return;
        dragging=null;setPosition(positionBeforeDrag);void refresh();
      };
      marker.onkeydown=event=>{
        const at=gradientStopKeyboardPosition(stops[index]!.at,event.key,event.shiftKey);
        if(at===null)return;
        event.preventDefault();setPosition(at);void refresh();
      };
      markers.push(marker);bar.append(marker);
    }
    updateMarkers();stopsArea.append(bar);
    for(const [index,stop] of stops.entries()){
      const row=document.createElement('div');row.className='c06-clipboard-grid';
      const position=numberField(row,'位置（%）',stop.at*100,0,100,.1);
      position.dataset.stopPosition=String(index);
      const color=document.createElement('input');color.type='color';color.value=stop.color;labelledField(row,'色',color);
      const opacity=numberField(row,'不透明度（%）',stop.opacity*100,0,100,.1);
      const midpoint=numberField(row,'次の色との中間（%）',stop.midpoint*100,1,99,.1);
      row.onchange=()=>{
        const previous=stops[index]!;
        const at=safeGradientStopValue(position.valueAsNumber/100,0,1,previous.at);
        const alpha=safeGradientStopValue(opacity.valueAsNumber/100,0,1,previous.opacity);
        const middle=safeGradientStopValue(midpoint.valueAsNumber/100,.01,.99,previous.midpoint);
        stops[index]={at,color:color.value,opacity:alpha,midpoint:middle};
        position.value=String(at*100);opacity.value=String(alpha*100);midpoint.value=String(middle*100);
        markers[index]!.style.background=gradientStopSwatchBackground(stops[index]!);updateMarkers();updateBar();
        void refresh();
      };
      if(stops.length>2)row.append(button('色を外す',()=>{stops.splice(index,1);redrawStops();void refresh();},status));
      stopsArea.append(row);
    }
    if(stops.length<64)stopsArea.append(button('色を追加',()=>{
      stops.push({at:.5,color:'#ffffff',opacity:1,midpoint:.5});redrawStops();void refresh();
    },status));
  }
  async function refresh(){
    ++previewId;
    previewAbort?.abort();
    // Coalesce rapid edits: cancel stale work so a full-size save is not
    // blocked behind a slow thumbnail on a 4000px canvas.
    if(previewRunning){previewPending=true;return;}
    previewRunning=true;
    do{
      previewPending=false;
      const current=api.context(),id=previewId;
      if(!current)break;
      const abort=new AbortController();previewAbort=abort;
      try{
        const scale=Math.min(1,260/Math.max(current.width,current.height));
        const outputWidth=Math.max(1,Math.round(current.width*scale)),outputHeight=Math.max(1,Math.round(current.height*scale));
        const size={width:current.width,height:current.height,outputWidth,outputHeight,mask:getMask(),previewMask:false};
        const compare=type.value==='gradient'?view.value:'normal';
        const [base,followed]=await Promise.all([
          compare==='follow'?null:runArtwork({...size,content:data(false)},{signal:abort.signal,priority:'preview'}),
          compare==='normal'?null:runArtwork({...size,content:data(true)},{signal:abort.signal,priority:'preview'})
        ]);
        const pixels=base??followed!;
        // Combine unmasked comparison halves first; then apply the same
        // area-averaged selection mask exactly once to either artwork kind.
        if(base&&followed)for(let y=0;y<outputHeight;y++){
          const start=(y*outputWidth+Math.floor(outputWidth/2))*4;
          base.set(followed.subarray(start,(y+1)*outputWidth*4),start);
        }
        applyShapePreviewMask(pixels,size.mask,current.width,current.height,outputWidth,outputHeight);
        if(id===previewId)paintPreview(preview,pixels,outputWidth,outputHeight);
      }catch(error){if(id===previewId){
        preview.hidden=true;status.textContent=error instanceof Error?error.message:String(error);
      }}
    }while(previewPending&&panel.open);
    previewRunning=false;previewAbort=null;
  }
  function reset(){
    stopHandles();
    const current=api.context();
    if(!current)throw Error('作品を開いてください。');
    editing=undefined;editingMask=null;editedOpacity=undefined;originalStrokeLayer=undefined;stroke.value=current.color;lineStyle='solid';
    draftDrawing=current.drawing;draftMask=current.selectionMask();savedBoundary=undefined;loadBoundaries();
    applied.checked=false;view.value='normal';
    setPoints([{x:current.width*.22,y:current.height*.25},{x:current.width*.78,y:current.height*.75}]);
    status.textContent='新しいレイヤーに作ります。';void refresh();
  }
  function updateFields(){shapeFields.hidden=type.value!=='shape';gradientFields.hidden=type.value!=='gradient';shape.onchange?.(new Event('change'));mode.onchange?.(new Event('change'));redrawStops();}
  shape.onchange=()=>{
    radius.parentElement!.hidden=shape.value!=='rounded';
    sides.parentElement!.hidden=shape.value!=='polygon';
    if(shape.value==='rounded'||shape.value==='polygon')closed.checked=true;
  };
  type.onchange=()=>{reset();updateFields();};
  boundary.onchange=()=>{applied.checked=false;view.value='follow';};
  applied.onchange=()=>{view.value=applied.checked?'follow':'normal';};
  controls.addEventListener('change',()=>{
    if(editingHandles){try{editOnCanvas();}catch(error){status.textContent=String(error);stopHandles();}}
    void refresh();
  });
  tools.append(
    button('新しく作る',reset,status),
    button('キャンバスで形や向きを指定',()=>{
      const current=api.context();
      if(!current)throw Error('作品を開いてください。');
      stopHandles();
      status.textContent='絵の上をドラッグしてください。';
      locate(current.drawing,path=>{
        // Only line-like shapes and gradient directions follow drawing rulers.
        // Snapping rectangle/ellipse corners could collapse their height.
        const guided=type.value==='gradient'||shape.value==='polyline'||shape.value==='bezier';
        const located=guided&&current.snapGuidedPath?current.snapGuidedPath(path):path;
        const a=located[0]!,b=located.at(-1)!;
        if(path.length===1)return;
        setPoints(type.value==='gradient'||['rectangle','rounded','polygon','ellipse'].includes(shape.value)?[a,b]:
          shape.value==='bezier'?curve(a,located[Math.floor(located.length/2)]!,b):located);
        void refresh();
      });
    },status),
    button('選んだレイヤーを編集',()=>{
      stopHandles();
      const current=api.context(),selected=current?.selected.content;
      if(!current||!selected||selected.kind==='text')throw Error('図形かグラデーションのレイヤーを選んでください。');
      if(selected.kind==='path'&&selected.fillRuns)throw Error('複数色の文字輪郭は「ベクター線・点の編集」で点や色を調整してください。');
      editing=current.selected.id;editingMask=current.selected.mask;draftDrawing=current.drawing;
      editedOpacity=selected.kind==='path'?selected.opacity:undefined;
      originalStrokeLayer=selected.kind==='path'?selected.originalStrokeLayer:undefined;
      if(selected.kind==='gradient'){
        type.value='gradient';mode.value=selected.mode;stops=[...selected.stops];setPoints([selected.start,selected.end]);
        spread.value=selected.spread??'pad';radialRatio.value=String((selected.radialRatio??1)*100);
        savedBoundary=typeof selected.follow==='object'?selected.follow:undefined;loadBoundaries();
        boundary.value=savedBoundary?'saved':'mask';applied.checked=!!selected.follow;
        view.value=applied.checked?'follow':'normal';
      }else{
        type.value='shape';shape.value=selected.shape==='freehand'?'polyline':selected.shape;
        stroke.value=selected.stroke;filled.checked=!!selected.fill;lineStyle=selected.lineStyle??'solid';
        if(selected.fill)fill.value=selected.fill;
        closed.checked=selected.closed;width.value=String(selected.width);square.checked=false;
        setPoints(selected.points);
      }
      status.textContent=current.selected.name+'を編集します。';updateFields();void refresh();
    },status),
    button('キャンバスで編集点を動かす',()=>editOnCanvas(),status),
    button('編集点の操作を終了',()=>{stopHandles();status.textContent='キャンバス上の編集点を閉じました。';},status),
    button('適用',async()=>{
      if(api.context()?.drawing!==draftDrawing)throw Error('作品を開き直したため、「新しく作る」か「選んだレイヤーを編集」を選んでください。');
      const content=data();
      previewAbort?.abort();
      // Freeze the handle position before the asynchronous save. A second
      // pointer move must not change the preview while older data is saved.
      stopHandles();
      // Commit the exact selection mask shown in the preview. Without this
      // snapshot, a newly created path would use whichever selection happened
      // to be active when Save ran, even though the preview used draftMask.
      // Existing editable layers keep their own stored vector mask.
      await api.save(content,content.kind==='gradient'?'グラデーション':'図形',editing,
        shapeGradientInitialMask(editing,draftMask));
      status.textContent='作品に反映しました。';
    },status),
    button('変更を取り消す',()=>{
      stopHandles();
      ++previewId;editing=undefined;editingMask=null;points=[];draftDrawing=undefined;draftMask=null;
      preview.hidden=true;panel.open=false;status.textContent='変更を取り消しました。';
    },status)
  );
  panel.ontoggle=()=>{
    if(!panel.open){stopHandles();++previewId;previewAbort?.abort();}
    else if(api.context()&&(!points.length||draftDrawing!==api.context()?.drawing))reset();
  };
  updateFields();
  panel.append(heading,controls,tools,stopsArea,preview,status);host.append(panel);
}
