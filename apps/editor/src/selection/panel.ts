/** C06 selection workbench. Paint and geometry are intentionally different modes. */
import type {BrushSurface} from '../brushSurface';
import {rasterizeSelection,combineSelection,invertSelection,fullSelection,translateSelection,featherMask,boundsOfSelection,
  type SelectionShape,type MaskData,type CombineMode,type SelectionBrushPoint} from './mask';
import {listSavedSelections,saveNamedSelection,loadNamedSelection,deleteNamedSelection,storeCurrentSelection,loadCurrentSelection} from './store';
import {MaskRasterWorker} from './maskWorker';
import {selectionBrushPreviewDabs,selectionBrushPreviewRaster,type SelectionBrushPreviewRaster} from './brushPreview';
import {SelectionOverlay} from './overlay';
import {snapMagneticPoint} from './magnetic';
import type {AnalyzeOptions} from './autoSelect';
import type {PreservedPortableData} from '../persistence/portable';
import type {PortableSectionInput} from '../persistence/format';
import {exportSelectionSections,importSelectionSections} from './native';

export type SelectionWorkbench=Readonly<{
  active:()=>MaskData|null;
  isPending:()=>boolean;
  documentChanged:()=>void;
  refresh:()=>void;
  updateView:()=>void;
  applyRectangle:(rect:Readonly<{x:number;y:number;width:number;height:number}>)=>void;
  clear:()=>void;
  shiftActive:(dx:number,dy:number)=>void;
  replaceActive:(mask:MaskData)=>void;
  exportNative:()=>Promise<readonly PortableSectionInput[]>;
  importNative:(preserved:PreservedPortableData|undefined)=>Promise<void>;
}>;
type SelectionCallbacks=Readonly<{
  getSurface:()=>BrushSurface|null;
  getDocument:()=>{id:string;width:number;height:number}|null;
  onMaskChanged:(mask:MaskData|null)=>void;
  capturePixels:(source:'layer'|'merged')=>Promise<Uint8ClampedArray>;
  moveContent:(dx:number,dy:number)=>Promise<void>;
}>;
type Tool='rectangle'|'ellipse'|'lasso'|'magnetic'|'polygon'|'autoColor'|'autoBrightness'|'autoInk'|'brushAdd'|'brushSubtract';
const asButton=(label:string,fn:()=>void)=>{
  const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=fn;
  return button;
};
export function installSelectionWorkbench(callbacks:SelectionCallbacks):SelectionWorkbench{
  const host=document.getElementById('documentBoxBody');
  if(!host)return {active:()=>null,isPending:()=>false,documentChanged:()=>{},refresh:()=>{},updateView:()=>{},applyRectangle:()=>{},clear:()=>{},shiftActive:()=>{},replaceActive:()=>{},exportNative:async()=>[],importNative:async()=>{}};
  const panel=document.createElement('details');panel.className='c06-selection-panel';
  const summary=document.createElement('summary');summary.textContent='選択範囲を編集';
  const intro=document.createElement('p');
  intro.textContent='選択の形を作り、足す・引く・重なる部分だけ残す操作ができます。解除しても描いた画素は消えません。';
  const tools=document.createElement('div');tools.className='c06-selection-tools';
  const modes=document.createElement('div');modes.className='c06-selection-tools';
  const actions=document.createElement('div');actions.className='c06-selection-tools';
  const brushTools=document.createElement('div');brushTools.className='c06-selection-brush';
  const autoTools=document.createElement('div');autoTools.className='c06-auto-selection';
  const saveArea=document.createElement('div');saveArea.className='c06-selection-save';
  const status=document.createElement('output');status.setAttribute('role','status');
  const allowFinger=document.createElement('input');allowFinger.type='checkbox';allowFinger.checked=false;
  const fingerLabel=document.createElement('label');fingerLabel.className='c06-visibility';
  fingerLabel.append(allowFinger,document.createTextNode('指で選択範囲を描く（OFFなら指はキャンバス移動）'));
  const showSelection=document.createElement('input');showSelection.type='checkbox';showSelection.checked=true;
  const showSelectionLabel=document.createElement('label');showSelectionLabel.className='c06-visibility';
  showSelectionLabel.append(showSelection,document.createTextNode('選択の境界を表示する（隠しても選択は有効）'));
  showSelection.onchange=()=>{
    // The true mask overlay is more precise than a rectangular bounds frame.
    callbacks.getSurface()?.setSelectionVisible(showSelection.checked&&!visual);
    visual?.setVisible(showSelection.checked);
    preview.hidden=!showSelection.checked;
    brushRaster.hidden=!showSelection.checked||!brushPoints.length;
    updateQuickPosition();
    status.textContent=showSelection.checked?'選択範囲の表示を戻しました。':'選択範囲は有効なまま、境界を隠しました。';
  };
  const mode=document.createElement('select');mode.setAttribute('aria-label','選択範囲を組み合わせる方法');
  for(const [key,label] of [
    ['replace','新しい範囲に置き換える'],['add','範囲を足す'],
    ['subtract','範囲を引く'],['intersect','重なる部分だけ残す']
  ] as const)mode.add(new Option(label,key));
  modes.append(mode);
  const shapeButtons=new Map<Tool,HTMLButtonElement>();
  let tool:Tool|null=null,active:MaskData|null=null,points:{x:number;y:number}[]=[],
    brushPoints:SelectionBrushPoint[]=[],magneticPixels:Uint8ClampedArray|null=null,
    drawing:{pointer:number;first:{x:number;y:number}}|null=null;
  const history:(MaskData|null)[]=[];const future:(MaskData|null)[]=[];
  const MAX_MASK_UNDO_BYTES=64*1024*1024;
  function boundUndo(stack:(MaskData|null)[]){
    let bytes=0;
    for(let i=stack.length-1;i>=0;i--){
      bytes+=stack[i]?.alpha.byteLength??0;
      if(bytes>MAX_MASK_UNDO_BYTES){stack.splice(0,i+1);break;}
    }
    while(stack.length>30)stack.shift();
  }
  let raster=new MaskRasterWorker();let job=0,lastSelection:MaskData|null=null;
  // A pen stroke must not start against a stale mask while a new one is pending.
  let pendingSelectionJob=0;
  let pendingStore:{id:string;mask:MaskData|null}|null=null;
  let storeTimer:number|null=null,storeQueue:Promise<void>=Promise.resolve();
  function flushStoredSelection(){
    if(storeTimer!==null){clearTimeout(storeTimer);storeTimer=null;}
    const record=pendingStore;pendingStore=null;
    if(!record)return;
    storeQueue=storeQueue.catch(()=>{}).then(()=>storeCurrentSelection(record.id,record.mask))
      .catch(error=>{if(callbacks.getDocument()?.id===record.id)status.textContent='選択範囲の保存に失敗しました。'+String(error);});
  }
  function scheduleStore(id:string,mask:MaskData|null){
    pendingStore={id,mask};
    if(storeTimer!==null)clearTimeout(storeTimer);
    storeTimer=window.setTimeout(flushStoredSelection,450);
  }
  const viewport=document.querySelector<HTMLElement>('.surface');
  const visual=viewport?new SelectionOverlay(viewport,callbacks.getSurface):null;
  let previewDialog:HTMLDialogElement|null=null;
  const box=document.createElement('div');box.className='c06-selection-notice';box.hidden=true;
  const preview=document.createElement('svg');
  preview.classList.add('c06-selection-preview');preview.setAttribute('aria-hidden','true');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  const svgNs='http://www.w3.org/2000/svg';
  const brushTrace=document.createElementNS(svgNs,'g');
  const brushGuide=document.createElementNS(svgNs,'path');
  brushGuide.setAttribute('fill','none');
  brushGuide.setAttribute('stroke-linecap','round');
  brushGuide.setAttribute('stroke-linejoin','round');
  brushGuide.setAttribute('stroke-width','1');
  brushGuide.setAttribute('opacity','.3');
  const brushDefs=document.createElementNS(svgNs,'defs');
  const brushGradient=document.createElementNS(svgNs,'radialGradient');
  const brushGradientId='c06-brush-preview-'+Math.random().toString(36).slice(2);
  brushGradient.id=brushGradientId;
  const brushCenter=document.createElementNS(svgNs,'stop');
  const brushEdge=document.createElementNS(svgNs,'stop');
  brushEdge.setAttribute('offset','100%');
  brushEdge.setAttribute('stop-opacity','0');
  brushGradient.append(brushCenter,brushEdge);brushDefs.append(brushGradient);
  brushTrace.append(brushGuide);
  preview.append(path,brushDefs,brushTrace);
  viewport?.append(preview,box);
  const brushRaster=document.createElement('canvas');
  brushRaster.className='c06-selection-brush-raster';
  brushRaster.hidden=true;
  brushRaster.setAttribute('aria-hidden','true');
  viewport?.append(brushRaster);
  let currentWork:null|string=null;
  let selectionBounds:ReturnType<typeof boundsOfSelection>=null;
  const source=()=>{
    const info=callbacks.getDocument();
    if(!info||!callbacks.getSurface())return null;
    const identity=info.id+':'+info.width+'x'+info.height;
    if(identity!==currentWork){
      raster.destroy();raster=new MaskRasterWorker();
      if(previewDialog?.open)previewDialog.close();
      flushStoredSelection();
      currentWork=identity;active=null;lastSelection=null;selectionBounds=null;history.length=0;future.length=0;
      pendingSelectionJob=0;
      tool=null;points=[];brushPoints=[];magneticPixels=null;drawing=null;visual?.set(null);box.hidden=true;callbacks.onMaskChanged(null);refresh();
      const request=++job,loadedId=info.id;
      // A saved selection must finish loading BEFORE the user may draw:
      // otherwise the first stroke could paint outside its restored mask.
      pendingSelectionJob=request;
      void storeQueue.then(()=>loadCurrentSelection(loadedId)).then(loaded=>{
        const doc=callbacks.getDocument();
        if(request!==job||!doc||doc.id!==loadedId||!loaded||
          loaded.width!==doc.width||loaded.height!==doc.height)return;
        publish(loaded,false,false);
      }).catch(error=>{if(callbacks.getDocument()?.id===loadedId)status.textContent='保存された範囲を復元できませんでした。'+String(error);})
        .finally(()=>{if(pendingSelectionJob===request)pendingSelectionJob=0;});
    }
    return info;
  };
  const toDoc=(e:PointerEvent)=>{
    const drawing=callbacks.getSurface(),rect=drawing?.viewportRect;
    if(!drawing||!rect)return {x:0,y:0};
    return drawing.screenToDocument({x:e.clientX-rect.left,y:e.clientY-rect.top});
  };
  function overlayPath(){
    const drawingSurface=callbacks.getSurface();
    if(!viewport||!drawingSurface||!tool||points.length===0){
      path.setAttribute('d','');
      preview.setAttribute('data-empty',brushPoints.length?'false':'true');return;
    }
    const viewPoints=points.map(p=>drawingSurface.documentToScreen(p));
    const d=(tool==='rectangle'||tool==='ellipse')&&viewPoints.length>=2?
      (()=>{const a=viewPoints[0]!,b=viewPoints.at(-1)!;
        if(tool==='rectangle')return [
          'M',a.x,a.y,'L',b.x,a.y,'L',b.x,b.y,'L',a.x,b.y,'Z'].join(' ');
        const x=(a.x+b.x)/2,y=(a.y+b.y)/2,rx=Math.abs(b.x-a.x)/2,ry=Math.abs(b.y-a.y)/2;
        return 'M '+(x-rx)+' '+y+' a '+rx+' '+ry+' 0 1 0 '+2*rx+' 0 a '+rx+' '+ry+' 0 1 0 '+(-2*rx)+' 0';
      })():viewPoints.map((p,i)=>(i?'L ':'M ')+p.x+' '+p.y).join(' ');
    path.setAttribute('d',d);preview.setAttribute('data-empty','false');
  }
  let brushPreviewFrame=0;
  let liveBrushKey='',liveBrushRequest='',liveBrushSettings='',liveBrushDocument='';
  let liveBrushPrior:MaskData|null=null,liveBrushImage:SelectionBrushPreviewRaster|null=null,liveBrushRunning=false;
  function stopBrushPreview(){
    if(liveBrushKey)raster.endBrushPreview(liveBrushKey);
    liveBrushKey=liveBrushRequest=liveBrushSettings=liveBrushDocument='';
    liveBrushImage=null;liveBrushPrior=null;liveBrushRunning=false;
  }
  function workerBrushPreview(doc:{id:string;width:number;height:number},settings:Parameters<MaskRasterWorker['brush']>[4]){
    if(liveBrushKey&&(liveBrushPrior!==active||liveBrushDocument!==doc.id))stopBrushPreview();
    if(!liveBrushKey){liveBrushKey=crypto.randomUUID();liveBrushPrior=active;liveBrushDocument=doc.id;}
    const key=liveBrushKey,prior=active,options=JSON.stringify(settings);
    const request=brushPoints.length+':'+options;
    if(!liveBrushRunning&&request!==liveBrushRequest){
      liveBrushRunning=true;liveBrushRequest=request;
      void raster.brushPreview(key,prior,doc.width,doc.height,brushPoints,settings).then(image=>{
        if(liveBrushKey===key&&active===prior&&callbacks.getDocument()?.id===doc.id){
          liveBrushImage=image;liveBrushSettings=options;
        }
      }).catch(()=>{
        // Unsupported worker environments retain the bounded raster/SVG guide.
      }).finally(()=>{
        if(liveBrushKey===key){liveBrushRunning=false;brushOverlayPath();}
      });
    }
    return liveBrushSettings===options?liveBrushImage:null;
  }
  function paintBrushOverlay(){
    brushPreviewFrame=0;
    const drawingSurface=callbacks.getSurface();
    if(!drawingSurface||!brushPoints.length||
      !(tool==='brushAdd'||tool==='brushSubtract')){
      stopBrushPreview();
      brushGuide.setAttribute('d','');
      brushTrace.replaceChildren(brushGuide);
      brushRaster.hidden=true;
      if(!points.length)preview.setAttribute('data-empty','true');
      return;
    }
    // Use exactly the same dab spacing and pressure-to-radius rule as
    // brushSelection. Limit DOM work to the newest dabs; keep a thin guide for
    // the older points so long strokes remain visible while drawing.
    const color=tool==='brushAdd'?'#18bad9':'#e77845';
    const visible=brushPoints.slice(-2048);
    const coords=visible.map(point=>drawingSurface.documentToScreen(point));
    brushGuide.setAttribute('d',coords.map((point,index)=>
      (index?'L ':'M ')+point.x+' '+point.y).join(' '));
    brushGuide.setAttribute('stroke',color);
    const size=Number(brushSize.value),opacity=Number(brushDensity.value)/100;
    const hardness=Number(brushHardness.value)/100;
    const doc=callbacks.getDocument();
    const settings={size,opacity,hardness,mode:tool==='brushAdd'?'add' as const:'subtract' as const};
    if(!raster.supportsBrushPreview&&liveBrushKey)stopBrushPreview();
    const short=doc&&!liveBrushKey?selectionBrushPreviewRaster(active,brushPoints,settings,doc.width,doc.height):null;
    const exact=short??(doc&&raster.supportsBrushPreview?workerBrushPreview(doc,settings):null);
    if(exact&&showSelection.checked){
      if(brushRaster.width!==exact.width)brushRaster.width=exact.width;
      if(brushRaster.height!==exact.height)brushRaster.height=exact.height;
      const context=brushRaster.getContext('2d');
      if(context){
        const image=context.createImageData(exact.width,exact.height),pixels=image.data;
        const color=tool==='brushAdd'?[24,186,217]:[231,120,69];
        for(let i=0;i<exact.alpha.length;i++){
          const alpha=exact.alpha[i]!;
          if(!alpha)continue;
          const offset=i*4;
          pixels[offset]=color[0]!;
          pixels[offset+1]=color[1]!;
          pixels[offset+2]=color[2]!;
          pixels[offset+3]=Math.round(alpha*.75);
        }
        context.putImageData(image,0,0);
        const topLeft=drawingSurface.documentToScreen({x:exact.x,y:exact.y});
        const horizontal=drawingSurface.documentToScreen({x:exact.x+(exact.scaleX??1),y:exact.y});
        const vertical=drawingSurface.documentToScreen({x:exact.x,y:exact.y+(exact.scaleY??1)});
        brushRaster.style.transform='matrix('+[
          horizontal.x-topLeft.x,horizontal.y-topLeft.y,
          vertical.x-topLeft.x,vertical.y-topLeft.y,
          topLeft.x,topLeft.y
        ].join(',')+')';
        brushRaster.hidden=false;
        brushTrace.replaceChildren(brushGuide);
        preview.setAttribute('data-empty','false');
        return;
      }
    }
    brushRaster.hidden=true;
    const left=drawingSurface.documentToScreen({x:0,y:0});
    const right=drawingSurface.documentToScreen({x:1,y:0});
    const zoom=Math.hypot(right.x-left.x,right.y-left.y);
    const dots=selectionBrushPreviewDabs(brushPoints,size,256);
    const fragment=document.createDocumentFragment();
    brushCenter.setAttribute('offset',String(Math.max(0,Math.min(1,hardness))*100)+'%');
    brushCenter.setAttribute('stop-color',color);
    brushCenter.setAttribute('stop-opacity',String(Math.max(0,Math.min(1,opacity))));
    brushEdge.setAttribute('stop-color',color);
    for(const dot of dots){
      const center=drawingSurface.documentToScreen(dot);
      const circle=document.createElementNS(svgNs,'circle');
      circle.setAttribute('cx',String(center.x));
      circle.setAttribute('cy',String(center.y));
      circle.setAttribute('r',String(Math.max(.5,dot.radius*zoom)));
      circle.setAttribute('fill','url(#'+brushGradientId+')');
      fragment.append(circle);
    }
    brushTrace.replaceChildren(brushGuide,fragment);
    preview.setAttribute('data-empty','false');
  }
  function brushOverlayPath(){
    if(!brushPoints.length){
      if(brushPreviewFrame)cancelAnimationFrame(brushPreviewFrame);
      paintBrushOverlay();
    }else if(!brushPreviewFrame)brushPreviewFrame=requestAnimationFrame(paintBrushOverlay);
  }
  function publish(next:MaskData|null,record=true,persist=true){
    const doc=source();if(!doc)return;
    job++;pendingSelectionJob=0;
    if(next&&(next.width!==doc.width||next.height!==doc.height))throw Error('作品と選択範囲の大きさが異なります。');
    if(record){history.push(active);boundUndo(history);future.length=0;}
    if(active)lastSelection=active;
    active=next;
    visual?.set(active);
    const bounds=active?boundsOfSelection(active):null;
    selectionBounds=bounds;
    updateQuickPosition();
    callbacks.getSurface()?.restoreRectangleSelection(bounds);
    callbacks.getSurface()?.setSelectionVisible(showSelection.checked&&!visual);
    callbacks.onMaskChanged(active);
    if(persist)scheduleStore(doc.id,active);
    box.hidden=!active;
    box.textContent=bounds?'選択中：'+bounds.width+'×'+bounds.height+'px'+
      ' · 加算・減算・解除ができます。':'選択範囲はありません。';
    status.textContent=bounds?'選択範囲を更新しました。':'選択を解除しました。';
    refresh();
  }
  function applyShape(shape:SelectionShape){
    const doc=source();if(!doc)return;
    const current=++job,currentMode=mode.value as CombineMode,previous=active;
    pendingSelectionJob=current;
    points=[];drawing=null;overlayPath();tool=null;magneticPixels=null;refresh();
    status.textContent='選択の形を反映しています。キャンバス操作は続けられます。';
    void raster.shape(shape,previous,currentMode,doc.width,doc.height)
      .then(next=>{
        if(current!==job||callbacks.getDocument()?.id!==doc.id)return;
        publish(next);
      }).catch(error=>{status.textContent=error instanceof Error?error.message:String(error);})
      .finally(()=>{if(pendingSelectionJob===current)pendingSelectionJob=0;});
  }
  function endStroke(){
    if(!drawing||!tool)return;
    if(points.length<2){points=[];drawing=null;overlayPath();return;}
    if(tool==='rectangle'||tool==='ellipse'){
      const a=points[0]!,b=points.at(-1)!;
      applyShape({type:tool,x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y)});
    }else if((tool==='lasso'||tool==='magnetic')&&points.length>=3)applyShape({type:'lasso',points});
    else{points=[];drawing=null;overlayPath();}
  }
  function arm(shape:Tool){
    const doc=source();if(!doc)return;
    if(shape==='magnetic'){
      if(tool==='magnetic'){
        ++job;tool=null;magneticPixels=null;refresh();overlayPath();return;
      }
      const request=++job;
      tool=null;magneticPixels=null;points=[];drawing=null;
      pendingSelectionJob=request;
      callbacks.getSurface()?.setSelectionMode(false);
      refresh();overlayPath();
      status.textContent='磁気選択のため、画像の輪郭を準備しています。';
      void callbacks.capturePixels('layer').then(pixels=>{
        if(request!==job||callbacks.getDocument()?.id!==doc.id)return;
        magneticPixels=pixels;
        tool='magnetic';refresh();
        status.textContent='輪郭に沿ってペンを動かしてください。輪郭のない場所では通常の投げ縄になります。';
      }).catch(error=>{
        if(request===job)status.textContent='磁気選択を開始できませんでした。'+String(error);
      }).finally(()=>{if(pendingSelectionJob===request)pendingSelectionJob=0;});
      return;
    }
    tool=tool===shape?null:shape;magneticPixels=null;points=[];brushPoints=[];drawing=null;brushOverlayPath();
    callbacks.getSurface()?.setSelectionMode(false);
    refresh();overlayPath();
  }
  for(const [name,label] of [
    ['rectangle','四角形'],['ellipse','楕円'],['lasso','投げ縄'],['magnetic','輪郭に吸い付く投げ縄'],['polygon','多角形']
  ] as const){
    const button=asButton(label,()=>arm(name));shapeButtons.set(name,button);tools.append(button);
  }
  const undoPoint=asButton('直前の点を戻す',()=>{
    if(tool==='polygon'){points.pop();overlayPath();refresh();}
  });
  const finishPolygon=asButton('多角形を閉じる',()=>{
    if(tool==='polygon'&&points.length>=3)applyShape({type:'polygon',points});
  });
  tools.append(undoPoint,finishPolygon);
  // Pixel-derived selection works with the artwork's actual pixel data.
  // All expensive scanning and connected-region search occurs in the worker.
  const autoSource=document.createElement('select');autoSource.setAttribute('aria-label','自動選択に使う画像');
  autoSource.add(new Option('選択中のレイヤー','layer'));
  autoSource.add(new Option('見えている絵の合成','merged'));
  const tolerance=document.createElement('input');tolerance.type='range';tolerance.min='0';tolerance.max='100';tolerance.step='1';tolerance.value='18';
  tolerance.setAttribute('aria-label','色の許容範囲');
  const tolLabel=document.createElement('output');tolLabel.textContent='許容範囲：18';
  tolerance.oninput=()=>{tolLabel.textContent='許容範囲：'+tolerance.value;};
  const connected=document.createElement('input');connected.type='checkbox';connected.checked=true;
  const contiguous=document.createElement('label');contiguous.append(connected,document.createTextNode('つながった部分だけ選ぶ'));
  const low=document.createElement('input');low.type='number';low.min='0';low.max='255';low.step='1';low.value='0';
  const high=document.createElement('input');high.type='number';high.min='0';high.max='255';high.step='1';high.value='255';
  low.setAttribute('aria-label','明るさの下限');high.setAttribute('aria-label','明るさの上限');
  const autoColor=asButton('色をタップして選ぶ',()=>armAuto('autoColor'));
  const autoBrightness=asButton('明るさをタップして選ぶ',()=>armAuto('autoBrightness'));
  const alpha=asButton('レイヤーの描いた部分',()=>void pickAutomatic('alpha',{x:0,y:0}));
  const autoInk=asButton('線画で囲まれた部分を選ぶ',()=>armAuto('autoInk'));
  const brightRange=document.createElement('label');
  brightRange.textContent='明るさの範囲（0〜255）';
  const levels=document.createElement('div');levels.className='c06-selection-brightness';levels.append(low,high);
  brightRange.append(levels);
  autoTools.append(autoSource,tolLabel,tolerance,contiguous,brightRange,autoColor,autoBrightness,autoInk,alpha);
  const armAuto=(name:'autoColor'|'autoBrightness'|'autoInk')=>{
    if(!source())return;
    tool=tool===name?null:name;points=[];drawing=null;
    callbacks.getSurface()?.setSelectionMode(false);refresh();overlayPath();
    if(tool)status.textContent=name==='autoInk'?'線画があるレイヤーを選び、線で囲まれた中をタップしてください。':'作品の中で選びたい色・明るさの場所をタップしてください。';
  };
  async function pickAutomatic(action:AnalyzeOptions['action'],seed:{x:number;y:number}){
    const doc=source();if(!doc)return;
    const request=++job,previous=active,combine=mode.value as CombineMode;
    const target=action==='lineRegion'?'layer' as const:autoSource.value==='merged'?'merged' as const:'layer' as const;
    const levelMin=Number(low.value),levelMax=Number(high.value);
    if(!Number.isInteger(levelMin)||!Number.isInteger(levelMax)||levelMin<0||levelMax>255||levelMin>levelMax){
      status.textContent='明るさの範囲は0〜255の正しい順序で入力してください。';return;
    }
    tool=null;points=[];overlayPath();refresh();
    pendingSelectionJob=request;
    status.textContent='画像から選択範囲を調べています。';
    try{
      const pixels=await callbacks.capturePixels(target);
      if(request!==job||callbacks.getDocument()?.id!==doc.id)return;
      const result=await raster.analyze(pixels,{
        action,width:doc.width,height:doc.height,
        seedX:seed.x,seedY:seed.y,tolerance:Number(tolerance.value),
        connected:connected.checked,brightnessMin:levelMin,brightnessMax:levelMax
      });
      if(request!==job||callbacks.getDocument()?.id!==doc.id)return;
      const next=combineSelection(previous,result,combine);
      publish(next);
      if(!boundsOfSelection(next))status.textContent='一致する色の範囲がありませんでした。';
    }catch(error){status.textContent=error instanceof Error?error.message:String(error);}
    finally{if(pendingSelectionJob===request)pendingSelectionJob=0;}
  }
  const addByBrush=asButton('選択を筆で足す',()=>arm('brushAdd'));
  const eraseByBrush=asButton('選択を筆で消す',()=>arm('brushSubtract'));
  const brushSize=document.createElement('input');brushSize.type='number';brushSize.min='1';brushSize.max='800';brushSize.step='1';brushSize.value='28';
  const brushDensity=document.createElement('input');brushDensity.type='range';brushDensity.min='1';brushDensity.max='100';brushDensity.value='100';
  const brushHardness=document.createElement('input');brushHardness.type='range';brushHardness.min='0';brushHardness.max='100';brushHardness.value='65';
  const brushLabel=(label:string,control:HTMLInputElement)=>{
    const text=document.createElement('label');text.textContent=label;text.append(control);return text;
  };
  brushTools.append(addByBrush,eraseByBrush,
    brushLabel('選択ブラシの太さ（px）',brushSize),
    brushLabel('選択の濃さ（%）',brushDensity),
    brushLabel('縁の硬さ（%）',brushHardness));
  function addBrushPoint(event:PointerEvent){
    const point=toDoc(event),last=brushPoints.at(-1);
    const size=Number(brushSize.value);
    if(brushPoints.length>=10000)return;
    if(last&&Math.hypot(last.x-point.x,last.y-point.y)<Math.max(.8,size*.075))return;
    brushPoints.push({...point,pressure:event.pressure>0?event.pressure:.5});
    brushOverlayPath();
  }
  function finishBrushStroke(){
    const doc=source(),input=brushPoints.slice(),initial=active;
    brushPoints=[];drawing=null;brushOverlayPath();
    if(!doc||!input.length||!(tool==='brushAdd'||tool==='brushSubtract'))return;
    const operation=tool==='brushAdd'?'add' as const:'subtract' as const;
    const size=Number(brushSize.value),opacity=Number(brushDensity.value)/100,
      hardness=Number(brushHardness.value)/100;
    if(!Number.isFinite(size)||size<1||size>800){status.textContent='ブラシの太さを1〜800pxにしてください。';return;}
    const current=++job;pendingSelectionJob=current;
    status.textContent='選択ブラシを反映しています。';
    void raster.brush(initial,doc.width,doc.height,input,{size,opacity,hardness,mode:operation})
      .then(next=>{
        if(current===job&&callbacks.getDocument()?.id===doc.id)publish(next);
      }).catch(error=>{status.textContent=error instanceof Error?error.message:String(error);})
      .finally(()=>{if(pendingSelectionJob===current)pendingSelectionJob=0;});
  }
  const all=asButton('すべて選ぶ',()=>{const d=source();if(d)publish(fullSelection(d.width,d.height));});
  const clear=asButton('選択を解除',()=>publish(null));
  const reselect=asButton('直前を選び直す',()=>{if(lastSelection)publish(lastSelection);});
  const invert=asButton('選択を反転',()=>{
    const d=source();if(d)publish(invertSelection(active??fullSelection(d.width,d.height)));
  });
  const shift=asButton('境界だけ移動',()=>{
    if(!active)return;
    const dx=window.prompt('横に何pxずらしますか？','0');if(dx===null)return;
    const dy=window.prompt('縦に何pxずらしますか？','0');if(dy===null)return;
    if(!Number.isFinite(Number(dx))||!Number.isFinite(Number(dy)))return;
    publish(translateSelection(active,Number(dx),Number(dy)));
  });
  const movePixels=asButton('選んだ絵そのものを移動',()=>void moveSelectedArtwork());
  const moveSelectedArtwork=async()=>{
    if(!active)return;
    const x=window.prompt('絵を横に何px移動しますか？（負の数も使用可）','0');
    if(x===null)return;
    const y=window.prompt('絵を縦に何px移動しますか？（負の数も使用可）','0');
    if(y===null)return;
    const dx=Number(x),dy=Number(y);
    if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)>16384||Math.abs(dy)>16384||(dx===0&&dy===0)){
      status.textContent='移動距離を正しく入力してください。';return;
    }
    if(!window.confirm('選択した絵を移動します。選択枠だけの移動とは異なり、作品の画素も変わります。実行しますか？'))return;
    status.textContent='絵を移動しています。';
    try{
      await callbacks.moveContent(dx,dy);
      if(active)publish(translateSelection(active,dx,dy));
      status.textContent='絵を移動しました。元に戻すで取り消せます。';
    }catch(error){status.textContent=error instanceof Error?error.message:String(error);}
  };
  function previewAdjustment(before:MaskData,after:MaskData,label:string):Promise<boolean>{
    if(!visual)return Promise.resolve(window.confirm(label+'の変更を適用しますか？'));
    visual.set(after);
    return new Promise(resolve=>{
      const dialog=document.createElement('dialog');
      previewDialog=dialog;
      dialog.style.cssText='position:fixed;top:12px;right:12px;left:auto;bottom:auto;margin:0;max-width:min(340px,90vw);padding:14px;border:1px solid #75bacb;border-radius:12px;background:var(--a-surface,#fff);color:inherit;box-shadow:0 12px 40px #1115;';
      const info=document.createElement('p');
      info.textContent=label+'の変更案をキャンバスに表示しています。変更前と比較して決められます。';
      const compare=asButton('変更前を見る',()=>{
        if(compare.textContent==='変更前を見る'){
          visual.set(before);compare.textContent='変更後を見る';
        }else{visual.set(after);compare.textContent='変更前を見る';}
      });
      const apply=asButton('この変更を適用',()=>{accepted=true;dialog.close();});
      const cancel=asButton('変更せず戻る',()=>dialog.close());
      for(const button of [compare,apply,cancel])button.style.cssText='min-height:40px;margin:3px;padding:7px;border:1px solid #aaa;border-radius:7px;';
      dialog.append(info,compare,apply,cancel);
      let accepted=false;
      dialog.addEventListener('close',()=>{
        if(previewDialog===dialog)previewDialog=null;
        dialog.remove();
        if(!accepted)visual.set(active);
        resolve(accepted);
      },{once:true});
      document.body.append(dialog);
      try{dialog.showModal();}
      catch{dialog.remove();previewDialog=null;visual.set(active);resolve(false);}
    });
  }
  const feather=asButton('選択の縁をぼかす',()=>{
    if(!active)return;
    const value=window.prompt('ぼかし幅 0〜32px','3');if(value===null)return;
    const amount=Number(value);if(!Number.isInteger(amount)||amount<0||amount>32){status.textContent='0〜32pxで指定してください。';return;}
    const original=active,doc=source(),current=++job;if(!doc)return;
    pendingSelectionJob=current;
    status.textContent='選択の縁を整えています。';
    void raster.feather(original,amount).then(async next=>{
      if(current!==job||callbacks.getDocument()?.id!==doc.id)return;
      if(await previewAdjustment(original,next,'選択のぼかし')&&current===job&&callbacks.getDocument()?.id===doc.id)
        publish(next);
    }).catch(error=>{status.textContent=String(error);})
      .finally(()=>{if(pendingSelectionJob===current)pendingSelectionJob=0;});
  });
  const grow=asButton('範囲を広げる',()=>void adjust('grow'));
  const shrink=asButton('範囲を縮める',()=>void adjust('shrink'));
  const border=asButton('境界だけ選ぶ',()=>void adjust('border'));
  async function adjust(operation:'grow'|'shrink'|'border'){
    if(!active)return;
    const question=operation==='grow'?'広げる幅':operation==='shrink'?'縮める幅':'境界の幅';
    const response=window.prompt(question+'（0〜128px）','5');
    if(response===null)return;
    const radius=Number(response);
    if(!Number.isInteger(radius)||radius<0||radius>128){status.textContent='0〜128pxで指定してください。';return;}
    const initial=active,doc=source(),current=++job;if(!doc)return;
    pendingSelectionJob=current;
    status.textContent=question+'を計算しています。';
    try{
      const next=await raster.adjust(initial,radius,operation);
      if(job!==current||callbacks.getDocument()?.id!==doc.id)return;
      if(await previewAdjustment(initial,next,question)&&job===current&&callbacks.getDocument()?.id===doc.id)
        publish(next);
    }catch(error){status.textContent=error instanceof Error?error.message:String(error);}
    finally{if(pendingSelectionJob===current)pendingSelectionJob=0;}
  }
  const undo=asButton('選択だけ元に戻す',()=>{
    if(!history.length)return;
    const prior=history.pop()??null;future.push(active);boundUndo(future);
    publish(prior,false);
  });
  const redo=asButton('選択だけやり直す',()=>{
    if(!future.length)return;
    history.push(active);boundUndo(history);
    publish(future.pop()??null,false);
  });
  actions.append(all,clear,reselect,invert,shift,movePixels,grow,shrink,feather,border,undo,redo);
  // Collapsed, position-aware edit tools save a round-trip to the side panel.
  // The user can ignore or close these without losing the active selection.
  const quick=document.createElement('details');quick.className='c06-selection-quick';quick.hidden=true;
  quick.style.cssText='position:absolute;z-index:13;min-width:128px;max-width:200px;border:1px solid #66aec7;border-radius:8px;background:var(--a-surface,#fff);box-shadow:0 4px 14px #0003;color:inherit;font-size:12px;';
  const quickTitle=document.createElement('summary');
  quickTitle.textContent='選択の操作';quickTitle.style.cssText='min-height:34px;padding:8px;cursor:pointer;';
  const quickButtons=document.createElement('div');
  quickButtons.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:5px;';
  const quickCopy=asButton('コピー',()=>document.getElementById('c06CopySelection')?.click());
  const quickCut=asButton('切り取る',()=>document.getElementById('c06CutSelection')?.click());
  const quickInvert=asButton('反転',()=>invert.click());
  const quickFeather=asButton('ぼかす',()=>feather.click());
  for(const button of [quickCopy,quickCut,quickInvert,quickFeather])
    button.style.cssText='min-height:40px;padding:5px;border:1px solid #aab9c1;border-radius:5px;background:var(--a-accent-soft,#fff5e7);color:inherit;';
  quickButtons.append(quickCopy,quickCut,quickInvert,quickFeather);
  quick.append(quickTitle,quickButtons);viewport?.append(quick);
  function updateQuickPosition(){
    const bounds=selectionBounds,drawingSurface=callbacks.getSurface();
    if(!viewport||!bounds||!drawingSurface||!showSelection.checked){
      quick.hidden=true;quick.open=false;return;
    }
    const at=drawingSurface.documentToScreen({x:bounds.x,y:bounds.y});
    quick.style.left=Math.max(4,Math.min(viewport.clientWidth-138,at.x))+'px';
    quick.style.top=Math.max(4,Math.min(viewport.clientHeight-50,at.y-46))+'px';
    quick.hidden=false;
  }
  const named=document.createElement('select');named.setAttribute('aria-label','保存した選択範囲');
  const save=asButton('名前を付けて保存',()=>void saveCurrent());
  const overwrite=asButton('選んだ保存を上書き',()=>void overwriteCurrent());
  const load=asButton('保存した範囲を使う',()=>void loadCurrent());
  const remove=asButton('保存した範囲を削除',()=>void deleteCurrent());
  const savedPreview=document.createElement('canvas');
  savedPreview.width=112;savedPreview.height=80;
  savedPreview.hidden=true;savedPreview.setAttribute('role','img');
  savedPreview.setAttribute('aria-label','保存した選択範囲の形');
  savedPreview.style.cssText='grid-column:1/-1;width:112px;height:80px;max-width:100%;image-rendering:pixelated;border:1px solid var(--a-border,#aaa);border-radius:6px;';
  let previewRequest=0;
  async function updateNamedPreview(){
    const id=named.value,doc=source(),current=++previewRequest;
    savedPreview.hidden=true;
    if(!id||!doc)return;
    try{
      const entry=(await listSavedSelections(doc.id)).find(item=>item.id===id);
      if(!entry)return;
      const mask=await loadNamedSelection(entry);
      if(current!==previewRequest||source()?.id!==doc.id||named.value!==id)return;
      const ctx=savedPreview.getContext('2d');
      if(!ctx)return;
      const image=ctx.createImageData(savedPreview.width,savedPreview.height);
      const pixels=image.data;
      for(let y=0;y<savedPreview.height;y++)for(let x=0;x<savedPreview.width;x++){
        const sx=Math.min(mask.width-1,Math.floor((x+.5)*mask.width/savedPreview.width));
        const sy=Math.min(mask.height-1,Math.floor((y+.5)*mask.height/savedPreview.height));
        const value=mask.alpha[sy*mask.width+sx]!;
        const i=(y*savedPreview.width+x)*4;
        const base=(x+y)%2?242:223;
        pixels[i]=Math.round(base*(255-value)/255+49*value/255);
        pixels[i+1]=Math.round(base*(255-value)/255+154*value/255);
        pixels[i+2]=Math.round(base*(255-value)/255+207*value/255);
        pixels[i+3]=255;
      }
      ctx.putImageData(image,0,0);
      savedPreview.hidden=false;
    }catch{
      savedPreview.hidden=true;
    }
  }
  named.onchange=()=>{refresh();void updateNamedPreview();};
  saveArea.append(named,savedPreview,save,overwrite,load,remove);
  async function updateNamed(){
    const doc=source();if(!doc)return;
    const previousName=named.value;
    const list=await listSavedSelections(doc.id);
    if(source()?.id!==doc.id)return;
    named.replaceChildren(new Option('保存した範囲を選ぶ',''),...list.map(x=>new Option(x.name,x.id)));
    if(list.some(item=>item.id===previousName))named.value=previousName;
    refresh();void updateNamedPreview();
  }
  async function saveCurrent(){
    const doc=source();if(!doc||!active)return;
    const name=window.prompt('選択範囲の名前','選択範囲');if(!name)return;
    try{
      const saved=await saveNamedSelection(doc.id,name,active);
      await updateNamed();named.value=saved.id;refresh();void updateNamedPreview();
      status.textContent='選択範囲を保存しました。';
    }catch(error){status.textContent=String(error);}
  }
  async function overwriteCurrent(){
    const doc=source(),selectedId=named.value;
    if(!doc||!active||!selectedId)return;
    try{
      const entry=(await listSavedSelections(doc.id)).find(item=>item.id===selectedId);
      if(!entry)throw Error('上書きする保存済み範囲が見つかりません。');
      if(!window.confirm('「'+entry.name+'」の保存内容を現在の選択範囲に置き換えますか？'))return;
      await saveNamedSelection(doc.id,entry.name,active,entry.id);
      await updateNamed();named.value=entry.id;refresh();void updateNamedPreview();
      status.textContent='「'+entry.name+'」を上書きしました。';
    }catch(error){status.textContent=String(error);}
  }
  async function loadCurrent(){
    const doc=source();if(!doc)return;
    try{
      const entry=(await listSavedSelections(doc.id)).find(x=>x.id===named.value);
      if(!entry)throw Error('保存した範囲が見つかりません。');
      const mask=await loadNamedSelection(entry);
      if(mask.width!==doc.width||mask.height!==doc.height)throw Error('キャンバスサイズが違います。移し替えるときは座標を調整してください。');
      publish(combineSelection(active,mask,mode.value as CombineMode));
    }catch(error){status.textContent=String(error);}
  }
  async function deleteCurrent(){
    const doc=source();if(!doc||!named.value)return;
    if(!window.confirm('保存した選択範囲を削除しますか？ 現在の選択は維持します。'))return;
    await deleteNamedSelection(named.value);await updateNamed();
  }
  panel.append(summary,intro,modes,showSelectionLabel,fingerLabel,tools,brushTools,autoTools,actions,saveArea,status);host.append(panel);
  panel.addEventListener('toggle',()=>{if(panel.open)void updateNamed();});
  function refresh(){
    for(const [name,button] of shapeButtons){button.setAttribute('aria-pressed',String(tool===name));}
    autoColor.setAttribute('aria-pressed',String(tool==='autoColor'));
    autoBrightness.setAttribute('aria-pressed',String(tool==='autoBrightness'));
    autoInk.setAttribute('aria-pressed',String(tool==='autoInk'));
    addByBrush.setAttribute('aria-pressed',String(tool==='brushAdd'));
    eraseByBrush.setAttribute('aria-pressed',String(tool==='brushSubtract'));
    undoPoint.disabled=tool!=='polygon'||points.length===0;
    finishPolygon.disabled=tool!=='polygon'||points.length<3;
    const enabled=!!active;
    for(const button of [clear,invert,shift,movePixels,grow,shrink,feather,border])button.disabled=!enabled;
    reselect.disabled=!lastSelection;undo.disabled=!history.length;redo.disabled=!future.length;
    save.disabled=!enabled;overwrite.disabled=!enabled||!named.value;
  }
  // Intercept only while intentionally entering a selection gesture. In all other
  // cases brush, pen, touch navigation and pointer capture remain untouched.
  document.addEventListener('pointerdown',event=>{
    if(pendingSelectionJob&&pendingSelectionJob===job&&
      event.target instanceof Element&&event.target.closest('.surface')&&
      !event.target.closest('button,input,select,textarea,[contenteditable],.c05-reference-frame,.c06-selection-quick,.c06-placement-preview')){
      event.preventDefault();event.stopImmediatePropagation();
      status.textContent='選択範囲を反映中です。完了後に描画してください。';
      return;
    }
    if(!tool||(!allowFinger.checked&&event.pointerType==='touch')||
      (drawing!==null&&event.pointerId!==drawing.pointer)||!source()||!viewport||
      !(event.target instanceof Element)||!event.target.closest('.surface')||
      event.target.closest('button,input,select,textarea,[contenteditable],.c05-reference-frame,.c06-selection-quick,.c06-placement-preview')||
      event.button!==0)return;
    event.preventDefault();event.stopImmediatePropagation();
    const point=toDoc(event);
    if(tool==='autoColor'||tool==='autoBrightness'||tool==='autoInk'){
      void pickAutomatic(tool==='autoColor'?'color':tool==='autoInk'?'lineRegion':'brightness',point);
      return;
    }
    if(tool==='brushAdd'||tool==='brushSubtract'){
      if(drawing)return;
      drawing={pointer:event.pointerId,first:point};brushPoints=[];addBrushPoint(event);
      try{viewport.setPointerCapture(event.pointerId);}catch{}
      return;
    }
    if(tool==='polygon'){
      if(points.length<4096)points.push(point);
      overlayPath();refresh();return;
    }
    if(drawing)return;
    drawing={pointer:event.pointerId,first:point};
    try{viewport.setPointerCapture(event.pointerId);}catch{}
    const first=tool==='magnetic'&&magneticPixels?
      snapMagneticPoint(magneticPixels,source()!.width,source()!.height,point,null):point;
    points=[first,first];overlayPath();
  },true);
  document.addEventListener('pointermove',event=>{
    if(!drawing||event.pointerId!==drawing.pointer||!tool)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(tool==='brushAdd'||tool==='brushSubtract'){
      addBrushPoint(event);return;
    }
    const point=toDoc(event);
    if(tool==='lasso'||tool==='magnetic'){
      const last=points.at(-1)!;
      const current=tool==='magnetic'&&magneticPixels&&source()?
        snapMagneticPoint(magneticPixels,source()!.width,source()!.height,point,last):point;
      if(Math.hypot(current.x-last.x,current.y-last.y)>2&&points.length<4096)points.push(current);
    }else points[1]=point;
    overlayPath();
  },true);
  document.addEventListener('pointerup',event=>{
    if(!drawing||event.pointerId!==drawing.pointer)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(tool==='brushAdd'||tool==='brushSubtract'){
      addBrushPoint(event);finishBrushStroke();
      try{viewport?.releasePointerCapture(event.pointerId);}catch{}
      return;
    }
    const point=toDoc(event);
    if(tool==='lasso'||tool==='magnetic'){
      const last=points.at(-1)??point;
      const current=tool==='magnetic'&&magneticPixels&&source()?
        snapMagneticPoint(magneticPixels,source()!.width,source()!.height,point,last):point;
      if(points.length<4096)points.push(current);
    }else points[1]=point;
    endStroke();
    try{viewport?.releasePointerCapture(event.pointerId);}catch{}
  },true);
  document.addEventListener('pointercancel',event=>{
    if(!drawing||event.pointerId!==drawing.pointer)return;
    drawing=null;points=[];brushPoints=[];overlayPath();brushOverlayPath();
  },true);
  const documentChanged=()=>{
    if(previewDialog?.open)previewDialog.close();
    job++;pendingSelectionJob=0;currentWork=null;source();
    callbacks.getSurface()?.setSelectionVisible(showSelection.checked&&!visual);
    void updateNamed();};
  refresh();documentChanged();
  return {
    active:()=>active,
    isPending:()=>pendingSelectionJob!==0&&pendingSelectionJob===job,
    documentChanged,
    updateView:()=>{visual?.updateView();overlayPath();brushOverlayPath();updateQuickPosition();},
    refresh,
    clear:()=>{job++;publish(null);},
    replaceActive:mask=>{job++;publish(mask);},
    shiftActive:(dx,dy)=>{if(active)publish(translateSelection(active,dx,dy));},
    exportNative:async()=>{
      const doc=source();if(!doc)return [];
      return exportSelectionSections(doc.id,doc.width,doc.height,active);
    },
    importNative:async preserved=>{
      const doc=source();if(!doc)return;
      const request=++job;
      const imported=await importSelectionSections(preserved,doc.id,doc.width,doc.height);
      if(request!==job||callbacks.getDocument()?.id!==doc.id||imported===undefined)return;
      publish(imported,false);
      await updateNamed();
    },
    applyRectangle:rect=>{if(source())applyShape({type:'rectangle',...rect});}
  };
}
