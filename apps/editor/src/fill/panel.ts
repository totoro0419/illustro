import type {ColorHint,LayerId,LineRegions,RevisionId} from '@illustro/core';
import type {BrushSurface} from '../brushSurface';
import {combineSelection,type MaskData} from '../selection/mask';
import type {Point} from '../transform/geometry';
import type {FillSettings,GapCandidate,RegionGraph,Walls} from './pixels';
import {runFill} from './run';
import {visibleFillReferenceIds} from './reference';
import {sampleFillDetail} from './detailPreview';
import {addTraceRegions,renderLiveRegionPreview} from './liveRegionPreview';
import {LiveColorFillPreview} from './liveColorPreview';

export type Reference=LineRegions['reference'];
export type Destination='active'|'new'|'under'|'color-layer';
export const fillLayerName=(destination:Destination,color:string)=>destination==='color-layer'?'彩色 '+color.toUpperCase():destination==='under'?'塗りつぶしの下地':'塗りつぶし';
export type FillCapture=Readonly<{
  name:string;targetName:string;key:string;width:number;height:number;source:Uint8Array;target:Uint8Array|null;
  revision:RevisionId;sourceIds:readonly LayerId[];reference:Reference;
  selection:MaskData|null;targetMask:MaskData|null;alphaLocked:boolean;valid:()=>boolean;canAdjust:()=>boolean;referenceValid:()=>boolean;
  apply:(pixels:Uint8ClampedArray,color:string,hints?:{id:LayerId;recipe:LineRegions})=>Promise<void>;select:(mask:MaskData)=>void;
}>;
type Candidate={source:FillCapture;points:readonly Point[];asSelection:boolean;excluded:number[];included:number[];adjustment?:boolean;savedGraph?:RegionGraph;workingGraph?:RegionGraph;workingGraphKey?:string;manual?:Walls;hints?:readonly ColorHint[]};
type Entry={id:LayerId;name:string;data:LineRegions};

export function installFillPanel(host:HTMLElement,api:{
  drawing:()=>BrushSurface|null;color:()=>string;documentId:()=>string;targetName:()=>string;
  references:()=>readonly {id:string;name:string;vector:boolean;visible:boolean}[];
  regionLayers:()=>readonly Entry[];
  saveRegion:(regions:LineRegions,id?:LayerId)=>Promise<LayerId>;
  capture:(reference:Reference,destination:Destination,layerIds:readonly string[],needTarget:boolean,stored?:LineRegions)=>Promise<FillCapture>;
}){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const summary=document.createElement('summary');summary.textContent='塗りつぶし・線画の領域';
  const options=document.createElement('div');options.className='c06-clipboard-grid';
  const actions=document.createElement('div');actions.className='c06-clipboard-grid';
  const output=document.createElement('output');output.setAttribute('role','status');
  const targets=document.createElement('output');
  const analysisState=document.createElement('output');analysisState.setAttribute('role','status');
  const preview=document.createElement('canvas');preview.hidden=true;preview.style.cssText='max-width:100%;border:1px solid currentColor;image-rendering:auto';
  preview.setAttribute('aria-label','塗り候補と線画領域のプレビュー');
  const detailPreview=document.createElement('canvas');
  detailPreview.hidden=true;detailPreview.width=64;detailPreview.height=64;
  detailPreview.style.cssText='width:192px;max-width:100%;height:auto;aspect-ratio:1;border:1px solid currentColor;image-rendering:pixelated';
  detailPreview.setAttribute('aria-label','タップした位置の元の画素を一つずつ拡大表示');
  const gapZoom=document.createElement('canvas');
  gapZoom.hidden=true;gapZoom.width=144;gapZoom.height=144;gapZoom.style.cssText='max-width:100%;border:1px solid currentColor';
  gapZoom.setAttribute('aria-label','隙間候補の拡大表示');
  let gesture:BrushSurface|null=null,running=false,currentGraph:RegionGraph|null=null,previous:RegionGraph|null=null;
  let capture:FillCapture|null=null,previousCapture:FillCapture|null=null,graphTolerance=0,graphGap=0,confirmed=false;
  let saved:Entry|undefined,candidate:Candidate|null=null,lastFill:Candidate|null=null,excludedGap=-1,inspectedRegion=0;
  let pending:Awaited<ReturnType<typeof runFill>>|null=null;
  let displayDocument='';
  let candidateGeneration=0,pendingColor='#000000';
  let previewAbort:AbortController|null=null,analysisAbort:AbortController|null=null;
  let hints:readonly ColorHint[]=[];
  let manualDraft=false,inspectPoint:Point|undefined;
  let localGaps:readonly GapCandidate[]|null=null;
  let analysisError:string|null=null,analyzing=false,excludedAreas:readonly Point[]=[];
  let detailPosition:Point|null=null;
  const manuals=new Map<string,Walls>();
  const makeLabel=(text:string,control:HTMLElement)=>{
    const label=document.createElement('label');label.append(text,control);options.append(label);
  };
  const select=(text:string,entries:readonly [string,string][])=>{
    const control=document.createElement('select');
    for(const [id,name] of entries)control.add(new Option(name,id));
    makeLabel(text,control);
    return control;
  };
  const number=(text:string,value:number,min:number,max:number)=>{
    const control=document.createElement('input');control.type='number';control.min=String(min);control.max=String(max);control.value=String(value);
    makeLabel(text,control);
    return control;
  };
  const checkbox=(text:string,initial=false)=>{
    const control=document.createElement('input');control.type='checkbox';control.checked=initial;
    makeLabel(text,control);
    return control;
  };
  const method=select('塗る範囲',[['color','同じ色'],['line','線をなぞって領域を指定'],['lasso','囲い全体'],['lasso-closed','囲いの中の閉じた領域']]);
  const reference=select('参照する絵',[['active','選んだレイヤー'],['merged','見えている絵の全体'],
    ['layer','指定するレイヤー'],['layers','指定する複数のレイヤー'],
    ['vector','ベクターのパス'],['vector-visible','ベクターの見た目']]);
  const referenceLayer=select('参照するレイヤー',[]);
  const omittedLayer=select('全体参照から外すレイヤー',[]);
  const selectedRefs=document.createElement('div');selectedRefs.className='c06-clipboard-grid';options.append(selectedRefs);
  const destination=select('塗る場所',[['active','選んだレイヤー'],['new','上の新しいレイヤー'],['under','下の新しいレイヤー'],['color-layer','色の名前でレイヤーを作る']]);
  const regionLayers=select('作品に保存した線画領域',[]);
  const view=select('解析の表示',[['regions','色分け'],['walls','境界と補完候補'],['outside','外側と閉領域'],['holes','囲まれた穴'],['original','元の線画']]);
  const tolerance=number('色の近さ・線の濃さ（%）',15,0,100);
  const alphaTolerance=number('透明度の違いの許容範囲（%）',15,0,100);
  const gap=number('埋める隙間（px）',0,0,12);
  const edge=number('塗りの拡張・縮小（px）',0,-24,24);
  const inspectId=number('調べる領域の番号',1,1,1);
  const mergeTarget=select('つなぐ隣の領域',[]);
  const issue=select('確認する箇所',[]);
  const edgeShape=select('拡張・縮小の角',[['square','角を保つ'],['round','角を丸める']]);
  const diagnostic=checkbox('補完と塗り残しの候補を表示');
  const smooth=checkbox('輪郭を滑らかにする（1pxの薄い縁を追加）');
  const trace=number('なぞりの幅（px）',1,1,25);
  const showHints=checkbox('色指示の線を表示',true);
  const clearHint=checkbox('透明にする指示');
  const hintList=select('取り消す色指示',[]);
  const opacity=number('塗りの濃さ（%）',100,0,100);
  const condition=select('塗る先の画素の条件',[['all','すべて'],['transparent','透明な画素だけ'],['color','指定した元の色に近い画素だけ']]);
  const matchColor=document.createElement('input');matchColor.type='color';
  matchColor.value=/^#[0-9a-f]{6}$/i.test(api.color())?api.color():'#000000';
  makeLabel('塗り替えたい元の色',matchColor);
  matchColor.parentElement!.hidden=true;
  const contiguous=checkbox('続いている部分だけ',true);
  const closedOnly=checkbox('閉じた領域だけ',true);
  const erase=checkbox('指定部分を透明にする');
  const compare=checkbox('比較する解析結果を表示');
  const showBefore=checkbox('塗る前を表示');
  const value=(input:HTMLInputElement)=>Math.max(Number(input.min),Math.min(Number(input.max),input.valueAsNumber||0));
  const usesRegions=()=>method.value==='line'||method.value==='lasso-closed';
  const settings=():FillSettings=>({
    method:method.value as FillSettings['method'],tolerance:value(tolerance),alphaTolerance:value(alphaTolerance),
    matchColor:matchColor.value,gap:value(gap),opacity:value(opacity)/100,
    edge:Math.round(value(edge)),edgeShape:edgeShape.value as 'square'|'round',traceWidth:value(trace),condition:condition.value as 'all'|'transparent'|'color',
    color:api.color(),erase:erase.checked,contiguous:contiguous.checked,closedOnly:closedOnly.checked,antialias:smooth.checked
  });
  const activeIds=()=>reference.value==='layers'
    ?[...selectedRefs.querySelectorAll<HTMLInputElement>('input:checked')].map(input=>input.value)
    :referenceLayer.value?[referenceLayer.value]:[];
  function rememberRefs(){
    try{localStorage.setItem('illustro.fill.references.'+api.documentId(),JSON.stringify(activeIds()));}catch{}
  }
  function button(label:string,handler:()=>void|Promise<void>){
    const control=document.createElement('button');control.type='button';control.textContent=label;
    control.onclick=()=>void work(handler);
    actions.append(control);
    return control;
  }
  async function work(handler:()=>void|Promise<void>){
    if(running)return;
    running=true;
    try{await handler();}catch(error){
      if(!(error instanceof Error&&error.name==='AbortError'))output.textContent=error instanceof Error?error.message:String(error);
    }
    finally{running=false;sync();}
  }
  function refreshReferences(replace=false){
    const all=api.references(),id=api.documentId();
    const omitted=omittedLayer.value;
    omittedLayer.replaceChildren(new Option('選択してください',''),
      ...all.filter(item=>item.visible).map(({id,name})=>new Option(name,id)));
    omittedLayer.value=all.some(item=>item.visible&&item.id===omitted)?omitted:'';
    let checked=activeIds();
    if(replace){try{checked=JSON.parse(localStorage.getItem('illustro.fill.references.'+id)??'[]');}catch{checked=[];}}
    if(!Array.isArray(checked))checked=[];
    const vector=reference.value==='vector'||reference.value==='vector-visible';
    referenceLayer.replaceChildren(new Option('選択してください',''),...all.filter(item=>!vector||item.vector).map(({id,name})=>new Option(name,id)));
    const previous=checked[0]??'';
    if(previous&&![...referenceLayer.options].some(option=>option.value===previous))
      referenceLayer.add(new Option('見つからない参照レイヤー',previous));
    referenceLayer.value=previous;
    selectedRefs.replaceChildren(...[...all,...checked.filter(item=>!all.some(row=>row.id===item)).map(id=>({id,name:'見つからない参照レイヤー',vector:false}))].map(({id,name})=>{
      const input=document.createElement('input');input.type='checkbox';input.value=id;input.checked=checked.includes(id);
      input.onchange=()=>{rememberRefs();forgetAnalysis();sync();};
      const label=document.createElement('label');label.append(input,name);
      return label;
    }));
    referenceLayer.parentElement!.hidden=reference.value==='active'||reference.value==='merged'||reference.value==='layers';
    selectedRefs.hidden=reference.value!=='layers';
  }
  function refreshRegionList(){
    const current=regionLayers.value,entries=api.regionLayers();
    regionLayers.replaceChildren(new Option('選択してください',''),...entries.map(entry=>new Option(entry.name,entry.id)));
    regionLayers.value=entries.some(entry=>entry.id===current)?current:'';
  }
  function forgetAnalysis(){detailPosition=null;detailPreview.hidden=true;previewAbort?.abort();previewAbort=null;candidateGeneration++;capture=previousCapture=null;currentGraph=previous=null;saved=undefined;confirmed=false;candidate=null;lastFill=null;pending=null;hints=[];refreshHintList();manualDraft=false;analysisError=null;excludedAreas=[];issue.replaceChildren();excludedGap=-1;localGaps=null;inspectedRegion=0;mergeTarget.replaceChildren();paint();}
  const gapCandidates=()=>localGaps??currentGraph?.candidates??[];
  const sourceAvailable=()=>!saved||api.regionLayers().some(entry=>entry.id===saved?.id&&entry.data===saved.data);
  const graphUsable=()=>!!currentGraph?.hasInk&&currentGraph.count>0;
  function regionAt(graph:RegionGraph,point:Point){
    const x=Math.floor(point.x),y=Math.floor(point.y);
    return x>=0&&x<graph.width&&y>=0&&y<graph.height?graph.labels[y*graph.width+x]!:0;
  }
  function issueList(graph:RegionGraph){
    const list=[new Option('選択してください','')];
    const ignored=new Set(excludedAreas.map(point=>regionAt(graph,point)));
    for(let i=0;i<Math.min(64,graph.candidates.length);i++)list.push(new Option('補完の確認 '+(i+1),'gap:'+i));
    for(let id=1,options=0;id<=graph.count&&options<64;id++){
      if(!graph.external[id]&&!ignored.has(id))continue;
      options++;
      list.push(new Option(ignored.has(id)?'除外した領域 '+id:'外側につながる領域 '+id,'area:'+id));
    }
    issue.replaceChildren(...list);
  }
  function sync(){
    if(displayDocument!==api.documentId()){
      displayDocument=api.documentId();forgetAnalysis();refreshReferences(true);
    }
    const names=api.references().filter(entry=>activeIds().includes(entry.id)).map(entry=>entry.name);
    const sourceName=reference.value==='active'?api.targetName():reference.value==='merged'?'表示中の全レイヤー':names.join('、')||'未指定';
    const outputLayer=destination.value as Destination;
    const color=pending?pendingColor:api.color();
    const layerName=candidate?.hints?'色指示の彩色':fillLayerName(outputLayer,color);
    const placement=outputLayer==='under'?'の下':'の上';
    const targetName=outputLayer==='active'?api.targetName():api.targetName()+placement+'に「'+layerName+'」を作成';
    targets.textContent='参照元 '+(pending&&candidate?candidate.source.name:sourceName)+'　塗り先 '+targetName;
    const available=sourceAvailable(),usable=graphUsable();
    stopCalculation.disabled=!previewAbort&&!analysisAbort;
    analysisState.textContent=analyzing?'解析中…':analysisError?'⚠ 解析エラー '+analysisError:
      !currentGraph?'○ 未解析':!usable?'⚠ 無効。境界と領域の両方がある線画を指定してください。':
      !available?'⚠ 保存済みの領域が変更されました。使う版を選び直してください。':
      !confirmed?'○ 確定待ち。問題箇所を確認できます。':
      capture&&!capture.referenceValid()?'△ 元の線画は変更済み。塗りは確定した版を使用します。':
      currentGraph.candidates.length||saved?.data.review==='needs-review'?'△ 確定済み。補完に要確認の箇所があります。':'● 確定済み';
    confirmGraph.disabled=running||!usable||!capture||confirmed;
    excludeIssue.disabled=running||!usable||!issue.value.startsWith('area:')||manualDraft;
    useOrdinary.disabled=running;
    applyPaint.disabled=running||!pending||!candidate;
    applyPaint.textContent=candidate?.asSelection||outputLayer==='active'?'候補を適用':'レイヤーを作成して塗る';
    dropPaint.disabled=!candidate;
    adjustPaint.disabled=running||!lastFill?.source.canAdjust();
    finishAdjustment.disabled=!lastFill;
    rejectGap.disabled=running||manualDraft||!capture||excludedGap<0;
    nextGap.disabled=running||!gapCandidates().length;
    previousGap.disabled=nextGap.disabled;
    acceptGap.disabled=rejectGap.disabled;
    vectorCompare.disabled=running||!(capture?.reference==='vector'||capture?.reference==='vector-visible');
    addHint.disabled=previewHints.disabled=!usable||!confirmed||!available||running;
    previewHints.disabled||=!hints.length;
    removeHint.disabled=!hints.length||running;
    persistHints.disabled=!saved||running;
    mergeRegions.disabled=running||manualDraft||!currentGraph||!inspectedRegion||!mergeTarget.value||compare.checked;
    cancelGraph.disabled=running||!currentGraph||confirmed;
  }
  const read=(needTarget:boolean,stored?:LineRegions)=>
    api.capture(reference.value as Reference,destination.value as Destination,activeIds(),needTarget,stored);
  function paintDetail(){
    const frozen=candidate?.source??(compare.checked&&previousCapture?previousCapture:capture);
    if(!detailPosition||!frozen){detailPreview.hidden=true;return;}
    const pixels=(!showBefore.checked?pending?.pixels:null)??(
      pending&&candidate?.source.target?candidate.source.target:frozen.source);
    const context=detailPreview.getContext('2d');
    if(!context){detailPreview.hidden=true;return;}
    const detail=sampleFillDetail(pixels,frozen.width,frozen.height,detailPosition.x,detailPosition.y,64);
    context.putImageData(new ImageData(detail,64,64),0,0);
    detailPreview.hidden=false;
  }
  function paint(){
    const graph=pending&&candidate?.workingGraph?candidate.workingGraph:compare.checked&&previous?previous:currentGraph;
    const frozen=pending&&candidate?candidate.source:compare.checked&&previousCapture?previousCapture:capture;
    preview.hidden=!frozen;gapZoom.hidden=true;
    if(!frozen){detailPreview.hidden=true;return;}
    paintDetail();
    // A higher preview resolution keeps thin line details visible without full-size allocation.
    const {width,height,source}=frozen,scale=Math.min(1,1024/Math.max(width,height));
    const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    preview.width=w;preview.height=h;
    const context=preview.getContext('2d');
    if(!context)return;
    const image=context.createImageData(w,h);
    const result=showBefore.checked?null:pending;
    const neighbors=graph&&inspectedRegion?new Set(graph.neighbors.subarray(
      graph.neighborOffsets[inspectedRegion],graph.neighborOffsets[inspectedRegion+1]
    )):null;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=Math.floor(y*height/h)*width+Math.floor(x*width/w),at=(y*w+x)*4,id=graph?.labels[p]??0;
      const pixels=result?.pixels??(pending&&candidate?.source.target?candidate.source.target:source),alpha=pixels[p*4+3]!/255;
      let r=pixels[p*4]!*alpha+240*(1-alpha),g=pixels[p*4+1]!*alpha+240*(1-alpha),b=pixels[p*4+2]!*alpha+240*(1-alpha);
      if(result?.mask){
        const intensity=result.mask.alpha[p]!/255*.42;
        r=r*(1-intensity)+245*intensity;g=g*(1-intensity)+145*intensity;b=b*(1-intensity);
        if(result.diagnostics?.bridges[p]){r=244;g=152;b=30;}
        if(result.diagnostics?.remaining[p]){r=216;g=34;b=149;}
      }else if(!pending&&graph&&view.value!=='original'){
        if(graph.bridges[p]){r=231;g=124;b=26;}
        else if(graph.walls[p]){r=32;g=32;b=35;}
        else if(id===inspectedRegion){r=239;g=130;b=40;}
        else if(neighbors?.has(id)){r=57;g=173;b=206;}
        else if(graph.external[id]){r=207;g=212;b=219;}
        else if(view.value==='holes'){
          if(graph.depth[id]!>=2){r=149;g=100;b=215;}else{r=223;g=223;b=223;}
        }
        else if(view.value==='outside'){r=86;g=148;b=205;}
        else if(view.value==='regions'){r=100+id*37%130;g=115+id*71%115;b=130+id*109%100;}
      }
      image.data[at]=r;image.data[at+1]=g;image.data[at+2]=b;image.data[at+3]=255;
    }
    context.putImageData(image,0,0);
    if(candidate?.points.length&&pending){
      context.strokeStyle='#e11769';context.lineWidth=1.5;
      context.beginPath();
      candidate.points.forEach((point,index)=>{
        const x=point.x*w/width,y=point.y*h/height;
        if(index)context.lineTo(x,y);else context.moveTo(x,y);
      });
      if(method.value.startsWith('lasso'))context.closePath();
      context.stroke();
    }
    if(showHints.checked&&hints.length&&!(pending&&showBefore.checked)){
      context.lineCap='round';
      for(const hint of hints){
        context.strokeStyle=hint.color??'#ed51bf';
        context.setLineDash(hint.color?[]:[5,3]);
        context.lineWidth=Math.max(2,hint.width*scale);
        context.beginPath();
        hint.points.forEach((point,index)=>{
          const x=point.x*w/width,y=point.y*h/height;
          if(index)context.lineTo(x,y);else{context.moveTo(x,y);context.lineTo(x+.01,y);}
        });
        context.stroke();
      }
      context.setLineDash([]);
    }
    const gap=gapCandidates()[excludedGap];
    if(gap&&!pending){
      context.lineWidth=2;context.strokeStyle='#e11769';context.beginPath();
      context.moveTo((gap.from.x+.5)*w/width,(gap.from.y+.5)*h/height);
      context.lineTo((gap.to.x+.5)*w/width,(gap.to.y+.5)*h/height);context.stroke();
      const zoom=gapZoom.getContext('2d'),length=36;
      if(zoom){
        const local=zoom.createImageData(length,length),factor=gapZoom.width/length;
        const x0=Math.round((gap.from.x+gap.to.x)/2-length/2),y0=Math.round((gap.from.y+gap.to.y)/2-length/2);
        for(let dy=0;dy<length;dy++)for(let dx=0;dx<length;dx++){
          const x=dx+x0,y=dy+y0,index=(dy*length+dx)*4;
          const inside=x>=0&&x<width&&y>=0&&y<height,offset=(y*width+x)*4;
          const alpha=inside?(source[offset+3]??0)/255:0;
          for(let c=0;c<3;c++)local.data[index+c]=(source[offset+c]??0)*alpha+242*(1-alpha);
          local.data[index+3]=255;
        }
        const small=document.createElement('canvas');small.width=length;small.height=length;
        small.getContext('2d')?.putImageData(local,0,0);
        zoom.imageSmoothingEnabled=false;zoom.drawImage(small,0,0,gapZoom.width,gapZoom.height);
        zoom.strokeStyle='#e11769';zoom.lineWidth=2;zoom.beginPath();
        zoom.moveTo((gap.from.x+.5-x0)*factor,(gap.from.y+.5-y0)*factor);
        zoom.lineTo((gap.to.x+.5-x0)*factor,(gap.to.y+.5-y0)*factor);zoom.stroke();
        gapZoom.hidden=false;
      }
    }
  }
  async function analyze(points?:readonly Point[],remove=false,stored?:LineRegions,restoring=false,preserveInk=false){
    analysisAbort?.abort();
    const abort=new AbortController();analysisAbort=abort;
    analyzing=true;analysisError=null;sync();
    output.textContent='線画を解析しています。';
    try{
      const source=await read(false,stored),old=restoring?stored?.manual??[]:manuals.get(source.key)??stored?.manual??[];
      const manual=points?[...old,{points,remove,...(preserveInk?{preserveInk:true}:{})}]:old;
      const current=settings();
      const response=await runFill({type:'graph',source:source.source,width:source.width,height:source.height,settings:current,manual},abort.signal);
      if(!source.valid()||!response.graph)throw Error('参照元が変わりました。もう一度解析してください。');
      manuals.set(source.key,manual);
      previous=capture?.key===source.key?currentGraph:null;
      previousCapture=previous?capture:null;
      currentGraph=response.graph;capture=source;graphTolerance=current.tolerance;graphGap=current.gap;
      compare.checked=false;compare.disabled=!previous;confirmed=restoring;manualDraft=!!points;excludedGap=-1;localGaps=null;inspectedRegion=0;inspectPoint=undefined;mergeTarget.replaceChildren();candidate=null;pending=null;
      inspectId.max=String(Math.max(1,currentGraph.count));
      if(restoring&&stored){hints=stored.hints??[];excludedAreas=stored.excluded??[];refreshHintList();}
      issueList(currentGraph);
      paint();
      const outside=currentGraph.external.reduce((sum,x)=>sum+x,0);
      output.textContent=(confirmed?'保存済み':'確認待ち')+' '+source.name+'。閉領域 '+(currentGraph.count-outside)+' 件、外側 '+outside+' 件。';
    }catch(error){
      if(!(error instanceof Error&&error.name==='AbortError'))
        analysisError=error instanceof Error?error.message:String(error);
      throw error;
    }
    finally{analyzing=false;if(analysisAbort===abort)analysisAbort=null;sync();}
  }
  function stopGesture(){gesture?.setCanvasEditGesture(null);gesture=null;}
  async function onCanvas(label:string,complete:(points:readonly Point[])=>Promise<void>,closed=false,traceColor='#ffb742',liveFill=false){
    stopGesture();
    const drawing=api.drawing();
    if(!drawing)throw Error('作品を開いてください。');
    const graph=liveFill&&method.value==='line'&&confirmed&&currentGraph&&capture?.referenceValid()&&
      value(tolerance)===graphTolerance&&value(gap)===graphGap?currentGraph:null;
    // The color preview is a 512px guide only; actual fill stays full-resolution.
    // Do not falsely imply exactness when a selection, target mask or edge
    // effects must be applied by the final Worker.
    let liveColor:LiveColorFillPreview|null=null;
    let colorValid:(()=>boolean)|null=null;
    if(liveFill&&method.value==='color'&&condition.value==='all'&&!value(edge)&&!smooth.checked){
      output.textContent='塗りの仮表示に使う絵を読み込んでいます。';
      const source=await read(false);
      if(drawing!==api.drawing()||!source.valid())throw Error('作品が変わったため、塗りの準備を中止しました。');
      if(!source.selection&&!source.targetMask){
        colorValid=source.valid;
        liveColor=new LiveColorFillPreview(source.source,source.width,source.height,512);
      }
    }
    const picked=new Set<number>();
    let processed=0,previewPixels:Uint8ClampedArray<ArrayBuffer>|undefined;
    gesture=drawing;
    output.textContent=graph||liveColor
      ?label+' 青い仮表示は目安です。正確な結果は指を離した後に計算します。':label;
    drawing.setCanvasEditGesture({path:closed,width:usesRegions()?value(trace):2,color:traceColor,
      ...(graph||liveColor?{update:(points:readonly Point[])=>{
        if(colorValid&&!colorValid()){
          stopGesture();output.textContent='作品が変わったため塗りの入力を終了しました。';
          return;
        }
        if(points.length<processed){processed=0;picked.clear();}
        if(graph){
          const before=picked.size;
          for(let i=Math.max(0,processed-1);i<points.length;i++){
            const point=points[i]!,previous=points[Math.max(0,i-1)]!;
            addTraceRegions(graph,previous,point,value(trace),closedOnly.checked,picked);
          }
          processed=points.length;
          if(!picked.size||picked.size===before)return;
          const image=renderLiveRegionPreview(graph,picked,512,previewPixels);
          previewPixels=image.pixels;
          drawing.showFillGesturePreview(new ImageData(image.pixels,image.width,image.height));
        }else if(liveColor){
          let changed=false;
          for(let i=Math.max(0,processed-1);i<points.length;i++){
            const point=points[i]!,previous=points[Math.max(0,i-1)]!;
            changed=liveColor.add(previous,point,settings())||changed;
          }
          processed=points.length;
          if(changed)drawing.showFillGesturePreview(liveColor.render());
        }
      }}:{}),
      complete:points=>{
        stopGesture();
        if(points.length)void work(()=>complete(points));
      }});
  }
  const candidateValid=(item:Candidate)=>item.adjustment?item.source.canAdjust():item.source.valid();
  async function refreshCandidate(){
    const request=++candidateGeneration;
    previewAbort?.abort();
    const abort=new AbortController();
    previewAbort=abort;
    pending=null;paint();
    if(!candidate||!candidateValid(candidate))throw Error('塗る対象が変わりました。');
    const edit=candidate,{source,asSelection,points}=edit,options=settings();
    if(options.erase&&destination.value!=='active'&&!asSelection)
      throw Error('透明にする場合は、既存のレイヤーを選んでください。');
    const selection=source.targetMask?combineSelection(source.selection,source.targetMask,'intersect'):source.selection;
    let graph=usesRegions()?edit.savedGraph??currentGraph:null;
    if(edit.adjustment&&graph){
      const key=options.tolerance+':'+options.gap;
      if(edit.workingGraphKey!==key){
        if(options.tolerance!==graphTolerance||options.gap!==graphGap){
          const result=await runFill({type:'graph',source:source.source,width:source.width,height:source.height,settings:options,manual:edit.manual??[]},abort.signal);
          if(!result.graph)throw Error('調整した線画領域を作れませんでした。');
          graph=result.graph;
        }
        if(edit.workingGraphKey||graph!==edit.savedGraph){edit.excluded=[];edit.included=[];}
        edit.workingGraph=graph;edit.workingGraphKey=key;
      }
      graph=edit.workingGraph??graph;
    }
    const excluded=graph?[...edit.excluded,...excludedAreas.map(point=>regionAt(graph!,point)).filter(Boolean)]:edit.excluded;
    const input={source:source.source,target:source.target,width:source.width,height:source.height,settings:{...options,excluded},alphaLocked:source.alphaLocked};
    if(edit.hints&&!graph)throw Error('色指示に使う線画領域が見つかりません。');
    const result=await (edit.hints&&graph?runFill({...input,type:'hints',graph,hints:edit.hints,selection},abort.signal):
      runFill({...input,type:'fill',graph,selection:asSelection?null:selection,
        settings:{...input.settings,included:edit.included},points,
        output:asSelection?'selection':'pixels',diagnostics:diagnostic.checked},abort.signal));
    if(candidate!==edit||request!==candidateGeneration||!candidateValid(edit))return;
    pending=result;pendingColor=options.color;if(previewAbort===abort)previewAbort=null;paint();
    output.textContent=diagnostic.checked
      ?'オレンジは補った隙間、ピンクは縁の未塗り候補です。範囲と角を調整して適用できます。'
      :'塗り候補を表示しました。範囲や濃さを調整してから適用できます。';
  }
  async function fill(points:readonly Point[],asSelection:boolean){
    const options=settings();
    if(options.erase&&destination.value!=='active'&&!asSelection)throw Error('透明にする場合は、既存のレイヤーを選んでください。');
    if(usesRegions()&&(!graphUsable()||!currentGraph||!capture||!confirmed||options.tolerance!==graphTolerance||options.gap!==graphGap))
      throw Error('先に「線画を解析・更新」で候補を作り、領域を確定してください。');
    if(usesRegions()){
      if(saved&&!api.regionLayers().some(item=>item.id===saved?.id&&item.data===saved.data))
        throw Error('保存した線画領域が変更されました。使う版を選び直してください。');
      if(!saved&&!capture?.referenceValid())throw Error('元の線画が変わりました。解析を更新してください。');
    }
    const source=await read(!asSelection,usesRegions()?saved?.data:undefined);
    if(usesRegions()&&(!currentGraph||source.width!==currentGraph.width||source.height!==currentGraph.height||source.key!==capture?.key))
      throw Error('塗る作品と解析した線画の版が一致しません。');
    lastFill=null;
    candidate={source,points,asSelection,excluded:[],included:[],
      ...(usesRegions()&&currentGraph?{savedGraph:currentGraph,manual:manuals.get(source.key)??[]}:{} )};
    await refreshCandidate();
  }
  button('表示中の絵から1枚を除外して参照',()=>{
    const all=api.references(),ids=visibleFillReferenceIds(all,omittedLayer.value);
    reference.value='layers';refreshReferences();
    for(const input of selectedRefs.querySelectorAll<HTMLInputElement>('input'))input.checked=ids.includes(input.value);
    rememberRefs();forgetAnalysis();sync();
    output.textContent='表示中のレイヤーから選んだ1枚を外しました。参照元を確認してから塗ってください。';
  });
  button('キャンバスで塗る',()=>onCanvas('塗る場所をタップするか、範囲をなぞって指定してください。',points=>fill(points,false),method.value.startsWith('lasso'),'#ffb742',true));
  button('領域を選択範囲にする',()=>onCanvas('選びたい領域をタップしてください。',points=>fill(points,true),method.value.startsWith('lasso'),'#ffb742',true));
  const applyPaint=button('候補を適用',async()=>{
    if(!candidate||!candidateValid(candidate))throw Error('塗る対象が変わりました。');
    const {source,asSelection}=candidate;
    if(asSelection&&pending?.mask)source.select(pending.mask);
    else if(pending?.pixels){
      const target=saved;
      if(candidate.hints){
        if(!target||!api.regionLayers().some(item=>item.id===target.id&&item.data===target.data))
          throw Error('保存した領域を開き直してください。');
        await source.apply(pending.pixels,pendingColor,{id:target.id,recipe:{...target.data,hints:candidate.hints}});
        saved=api.regionLayers().find(entry=>entry.id===target.id);
        lastFill=null;
      }else{
        await source.apply(pending.pixels,pendingColor);
        lastFill={...candidate,adjustment:true};
      }
    }else throw Error('変更される画素がありません。');
    candidate=null;pending=null;paint();output.textContent=asSelection?'領域を選択しました。':'塗りを反映しました。すぐに直すには「直前の塗りを調整」を押してください。';
  });
  const adjustPaint=button('直前の塗りを調整',async()=>{
    if(!lastFill?.source.canAdjust())throw Error('別の編集を開始したため、直前の塗りを置き換えられません。');
    candidate={...lastFill};await refreshCandidate();
  });
  const finishAdjustment=button('直前の調整を終える',()=>{
    if(candidate?.adjustment){candidate=null;pending=null;paint();}
    lastFill=null;
    output.textContent='直前の塗りの調整を終了しました。';
  });
  const dropPaint=button('塗り候補を取り消す',()=>{previewAbort?.abort();candidateGeneration++;candidate=null;pending=null;paint();output.textContent='塗り候補を取り消しました。';});
  // This control bypasses work() so cancellation remains responsive while busy.
  const stopCalculation=document.createElement('button');
  stopCalculation.type='button';
  stopCalculation.textContent='計算を中止';
  stopCalculation.onclick=()=>{
    previewAbort?.abort();analysisAbort?.abort();
    previewAbort=null;analysisAbort=null;
    candidateGeneration++;candidate=null;pending=null;
    output.textContent='塗りつぶしの計算を中止しました。';
    paint();sync();
  };
  actions.append(stopCalculation);
  button('線画を解析・更新',async()=>{await analyze();confirmed=false;});
  const vectorCompare=button('ベクターのパスと見た目を比較',async()=>{
    const original=capture;
    if(!original||!currentGraph||!(original.reference==='vector'||original.reference==='vector-visible'))
      throw Error('ベクターの線画レイヤーを選んで解析してください。');
    const other=original.reference==='vector'?'vector-visible':'vector';
    const alternate=await read(false,{reference:other,sourceRevision:original.revision,sources:original.sourceIds,
      tolerance:graphTolerance,gap:graphGap,manual:manuals.get(original.key)??[]});
    const response=await runFill({type:'graph',source:alternate.source,width:original.width,height:original.height,
      settings:{...settings(),tolerance:graphTolerance,gap:graphGap},manual:manuals.get(original.key)??[]});
    if(!alternate.valid()||capture!==original||!response.graph)throw Error('参照元が変わりました。');
    previous=response.graph;previousCapture=alternate;compare.disabled=false;compare.checked=true;
    paint();
    output.textContent='比較中 '+(other==='vector'?'パスを細い線として表示':'線幅・線種・塗り・マスクを含む見た目')+'。チェックを外すと採用する方式に戻ります。';
  });
  const confirmGraph=button('線画領域を確定・保存',async()=>{
    const source=capture;
    const isFrozen=!!saved&&source?.revision===saved.data.sourceRevision&&api.regionLayers().some(item=>item.id===saved?.id&&item.data===saved.data);
    if(!source||!currentGraph||!source.referenceValid()&&!isFrozen)throw Error('参照元が変わったため、解析を更新してください。');
    const recipe:LineRegions={sourceRevision:source.revision,sources:source.sourceIds,reference:source.reference,
      tolerance:graphTolerance,gap:graphGap,manual:manuals.get(source.key)??[],hints,excluded:excludedAreas,
      review:currentGraph.candidates.length?'needs-review':'reviewed'};
    const id=await api.saveRegion(recipe,saved?.id);
    saved=api.regionLayers().find(entry=>entry.id===id);confirmed=true;manualDraft=false;refreshRegionList();regionLayers.value=id;
    output.textContent='線画領域を作品に保存しました。';
  });
  button('保存した領域を使う',async()=>{
    const entry=api.regionLayers().find(item=>item.id===regionLayers.value);
    if(!entry)throw Error('保存した線画領域を選んでください。');
    saved=entry;reference.value=entry.data.reference==='active'?'layer':entry.data.reference;refreshReferences();
    referenceLayer.value=entry.data.sources[0]??'';
    for(const input of selectedRefs.querySelectorAll('input'))input.checked=entry.data.sources.some(id=>id===input.value);
    tolerance.value=String(entry.data.tolerance);gap.value=String(entry.data.gap);
    method.value='line';await analyze(undefined,false,entry.data,true);
  });
  function refreshHintList(){
    hintList.replaceChildren(...hints.map((hint,index)=>new Option(
      `指示 ${index+1} ${hint.color??'透明'}`,String(index)
    )));
  }
  const addHint=button('色指示を描く',()=>{
    if(!currentGraph||!confirmed||!saved)throw Error('先に線画領域を確定してください。');
    if(hints.length>=256)throw Error('色指示は256件までです。');
    method.value='line';
    const color=clearHint.checked?null:api.color(),width=value(trace);
    onCanvas('色を入れたい面をなぞってください。',async points=>{
      if(points.length>4096)throw Error('一つの指示が長すぎます。いくつかに分けてください。');
      hints=[...hints,{color,width,points}];candidate=null;pending=null;lastFill=null;
      refreshHintList();hintList.value=String(hints.length-1);paint();
      output.textContent='指示を追加しました。重なった面は後の指示を使います。';
    },false,color??'#ed51bf');
  });
  const changeHintColor=button('選んだ色指示の色を変更',()=>{
    const index=Number(hintList.value);
    if(!Number.isInteger(index)||index<0||index>=hints.length)throw Error('変更する色指示を選んでください。');
    const color=clearHint.checked?null:api.color();
    hints=hints.map((hint,i)=>i===index?{...hint,color}:hint);
    candidate=null;pending=null;refreshHintList();hintList.value=String(index);paint();
    output.textContent='色指示を変更しました。「色指示だけを保存」で作品に反映できます。';
  });
  const moveHint=button('選んだ色指示を移動',()=>{
    const index=Number(hintList.value),graph=currentGraph;
    if(!Number.isInteger(index)||index<0||index>=hints.length||!graph)throw Error('移動する色指示と線画領域を選んでください。');
    onCanvas('色指示を置きたい中心をタップしてください。',async points=>{
      const current=hints[index];
      if(!current||!points.length)return;
      const cx=current.points.reduce((sum,point)=>sum+point.x,0)/current.points.length;
      const cy=current.points.reduce((sum,point)=>sum+point.y,0)/current.points.length;
      const dx=points[0]!.x-cx,dy=points[0]!.y-cy;
      const next=current.points.map(point=>({
        x:Math.min(graph.width-1,Math.max(0,point.x+dx)),
        y:Math.min(graph.height-1,Math.max(0,point.y+dy))
      }));
      hints=hints.map((hint,i)=>i===index?{...hint,points:next}:hint);
      candidate=null;pending=null;paint();
      output.textContent='色指示を移動しました。「色指示だけを保存」で作品に反映できます。';
    });
  });
  const removeHint=button('選んだ色指示を取り消す',()=>{
    hints=hints.filter((_hint,index)=>index!==Number(hintList.value));
    candidate=null;pending=null;refreshHintList();paint();
    output.textContent='選んだ色指示を取り消しました。既存の彩色は残っています。';
  });
  const previewHints=button('色指示で塗る候補を作る',async()=>{
    if(!currentGraph||!saved||!confirmed||!hints.length)throw Error('確定した線画領域に色指示を描いてください。');
    if(destination.value!=='active'&&hints.every(hint=>hint.color===null))
      throw Error('透明にする指示だけの場合は、既存の彩色レイヤーを選んでください。');
    const source=await read(true,saved.data);
    method.value='line';erase.checked=false;lastFill=null;
    candidate={source,asSelection:false,points:[],excluded:[],included:[],savedGraph:currentGraph,hints};
    await refreshCandidate();
  });
  const persistHints=button('色指示だけを保存',async()=>{
    const target=saved;
    if(!target||!api.regionLayers().some(item=>item.id===target.id&&item.data===target.data))
      throw Error('保存した線画領域を選び直してください。');
    const id=await api.saveRegion({...target.data,hints},target.id);
    saved=api.regionLayers().find(entry=>entry.id===id);
    candidate=null;pending=null;
    output.textContent='色指示を保存しました。';
    paint();
  });
  const makeManualCandidate=async(points:readonly Point[],remove:boolean,preserveInk=false)=>{
    if(!currentGraph||!capture||manualDraft)throw Error('線画を解析し、今の手直しを適用するか取り消してください。');
    if(saved&&!api.regionLayers().some(entry=>entry.id===saved?.id&&entry.data===saved.data))
      throw Error('保存した線画領域を開き直してください。');
    const frozen=saved&&capture.revision===saved.data.sourceRevision?saved.data:undefined;
    await analyze(points,remove,frozen,false,preserveInk);
    output.textContent='境界を手直ししました。前の状態と比較して、確定するか取り消してください。';
  };
  button('境界線を足す',()=>onCanvas('接続や分割したい場所をなぞってください。',points=>makeManualCandidate(points,false)));
  button('境界線を切る',()=>onCanvas('消したい境界線をなぞってください。',points=>makeManualCandidate(points,true)));
  const mergeRegions=button('選んだ二つの領域をつなぐ候補',async()=>{
    if(!currentGraph)throw Error('線画を解析してください。');
    const result=await runFill({type:'boundary',graph:currentGraph,first:inspectedRegion,second:Number(mergeTarget.value),
      ...(inspectPoint?{near:inspectPoint}:{})});
    if(!result.boundary)throw Error('つなぐ境界を見つけられませんでした。');
    await makeManualCandidate(result.boundary,true);
  });
  issue.onchange=()=>{
    const [kind,index]=issue.value.split(':'),id=Number(index);
    if(kind==='gap'&&currentGraph){localGaps=null;excludedGap=id-1;focusGap(1);}
    if(kind==='area'&&currentGraph)inspect(currentGraph,id);
    sync();
  };
  const excludeIssue=button('この領域の除外を切り替える',()=>{
    const graph=currentGraph,id=Number(issue.value.split(':')[1]);
    if(!graph||id<1||id>graph.count)throw Error('問題一覧から対象の領域を選んでください。');
    if(excludedAreas.some(point=>regionAt(graph,point)===id))
      excludedAreas=excludedAreas.filter(point=>regionAt(graph,point)!==id);
    else{
      if(excludedAreas.length>=512)throw Error('除外は512件までです。');
      const pixel=graph.anchors[id]!;
      excludedAreas=[...excludedAreas,{x:pixel%graph.width,y:Math.floor(pixel/graph.width)}];
    }
    candidate=null;pending=null;
    confirmed=false;issueList(graph);issue.value='area:'+id;paint();
    output.textContent='領域の扱いを変更しました。「線画領域を確定・保存」で反映できます。';
  });
  const useOrdinary=button('見えている絵を参照して通常の色で塗る',()=>{
    method.value='color';reference.value='merged';candidate=null;pending=null;lastFill=null;refreshReferences();paint();
    output.textContent='色の近い部分を塗る方式に切り替えました。キャンバスで塗る場所を選んでください。';
  });
  const cancelGraph=button('手直し・解析候補を取り消す',async()=>{
    if(saved){
      tolerance.value=String(saved.data.tolerance);gap.value=String(saved.data.gap);
      await analyze(undefined,false,saved.data,true);
    }else{
      if(capture)manuals.delete(capture.key);
      forgetAnalysis();
    }
    output.textContent='候補を取り消しました。保存した線画と彩色は保持しています。';
  });
  function focusGap(direction:number){
    const candidates=gapCandidates(),count=candidates.length;
    if(!count)return;
    excludedGap=(excludedGap+direction+count)%count;view.value='walls';paint();
    const kind=candidates[excludedGap]?.kind;
    const label=kind==='tips'?'線の端どうし':kind==='edge'?'線の端と途中':kind==='junction'?'交差付近':kind==='near'?'近い境界':'短い隙間';
    output.textContent='隙間候補 '+(excludedGap+1)+'/'+count+'、'+label+'。ピンクの線を確認してください。';
  }
  const nextGap=button('次の隙間候補',()=>focusGap(1));
  const previousGap=button('前の隙間候補',()=>focusGap(excludedGap<0?0:-1));
  button('キャンバスで隙間を調べる',()=>onCanvas('隙間の近くをタップしてください。',async points=>{
    if(!currentGraph||!capture||manualDraft)throw Error('線画を解析し、手直し中の候補を確定するか取り消してください。');
    const result=await runFill({type:'local-gaps',graph:currentGraph,point:points[0]!,reach:value(gap)||8,
      manual:manuals.get(capture.key)??[]});
    localGaps=result.gaps??[];excludedGap=-1;
    if(localGaps.length)focusGap(1);
    else{paint();output.textContent='周囲に候補がありません。必要なら境界線を手で足せます。';}
  }));
  const acceptGap=button('この接続を採用',async()=>{
    const item=gapCandidates()[excludedGap];
    if(item)await makeManualCandidate([item.from,item.to],false);
  });
  const rejectGap=button('この接続を取り消す',async()=>{
    const item=gapCandidates()[excludedGap];
    if(item){
      const dx=item.to.x-item.from.x,dy=item.to.y-item.from.y,steps=Math.max(Math.abs(dx),Math.abs(dy));
      const from={x:Math.round(item.from.x+dx/steps),y:Math.round(item.from.y+dy/steps)};
      const to={x:Math.round(item.to.x-dx/steps),y:Math.round(item.to.y-dy/steps)};
      await makeManualCandidate([from,to],true,true);
    }
  });
  button('キャンバス操作をやめる',()=>{stopGesture();output.textContent='操作を取り消しました。';});
  reference.onchange=()=>{forgetAnalysis();refreshReferences();rememberRefs();sync();};
  referenceLayer.onchange=()=>{forgetAnalysis();rememberRefs();sync();};
  method.onchange=()=>{candidate=null;lastFill=null;pending=null;paint();sync();};
  destination.onchange=()=>{candidate=null;lastFill=null;pending=null;paint();sync();};
  compare.onchange=()=>{inspectedRegion=0;mergeTarget.replaceChildren();inspectId.max=String(Math.max(1,(compare.checked?previous:currentGraph)?.count??1));paint();sync();};
  showBefore.onchange=paint;showHints.onchange=paint;view.onchange=paint;compare.disabled=true;
  condition.addEventListener('change',()=>{
    matchColor.parentElement!.hidden=condition.value!=='color';
    if(condition.value==='color'&&/^#[0-9a-f]{6}$/i.test(api.color()))matchColor.value=api.color();
  });
  const updatePreview=()=>{
    if(!candidate)return;
    void refreshCandidate().catch(error=>{
      if(!(error instanceof Error&&error.name==='AbortError'))
        output.textContent=error instanceof Error?error.message:String(error);
    }).finally(sync);
  };
  for(const control of [opacity,edge,edgeShape,diagnostic,smooth,trace,condition,closedOnly,erase,contiguous,matchColor,alphaTolerance]){
    control.addEventListener('change',updatePreview);
  }
  for(const control of [gap,tolerance])control.addEventListener('change',()=>{
    if(candidate?.adjustment){updatePreview();return;}
    if(usesRegions()){
      if(currentGraph){confirmed=false;candidate=null;pending=null;output.textContent='条件を変えたため、線画をもう一度解析して確定してください。';paint();sync();}
    }else if(candidate)updatePreview();
  });
  function inspect(graph:RegionGraph,id:number){
    if(id<1||id>graph.count)return;
    inspectedRegion=id;inspectId.value=String(id);paint();
    const neighbors=Array.from(graph.neighbors.subarray(graph.neighborOffsets[id],graph.neighborOffsets[id+1]));
    const kind=graph.external[id]?'外側につながる領域':graph.depth[id]!>=2?'閉領域に囲まれた穴':'閉じた領域';
    const labels=neighbors.map(item=>item===0?'キャンバスの外':String(item));
    mergeTarget.replaceChildren(new Option('選択してください',''),...neighbors.filter(item=>item!==0).map(item=>
      new Option(item+(graph.external[item]?'（外側へ通じる）':''),String(item))));
    sync();
    output.textContent='領域 '+id+' は'+kind+'です。隣り合う領域 '+(labels.join('、')||'なし')+'。';
  }
  mergeTarget.onchange=sync;
  inspectId.onchange=()=>{
    inspectPoint=undefined;
    const graph=compare.checked?previous:currentGraph;
    if(graph)inspect(graph,value(inspectId));
  };
  preview.onclick=event=>{
    const inspectedGraph=candidate?.workingGraph??(compare.checked&&previous&&!pending?previous:currentGraph);
    const frozen=candidate?.source??capture;
    if(!frozen)return;
    const rect=preview.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)*frozen.width/rect.width),y=Math.floor((event.clientY-rect.top)*frozen.height/rect.height);
    if(x<0||x>=frozen.width||y<0||y>=frozen.height)return;
    detailPosition={x,y};paintDetail();
    if(!inspectedGraph)return;
    const region=inspectedGraph.labels[y*frozen.width+x]!;
    if(region&&candidate&&!candidate.hints&&usesRegions()){
      const c=candidate;
      if(c.excluded.includes(region))c.excluded=c.excluded.filter(id=>id!==region);
      else if(pending?.mask?.alpha[y*frozen.width+x])c.excluded.push(region);
      else if(method.value==='line')c.included=[...c.included,region];
      void work(refreshCandidate);
    }else if(region){inspectPoint={x,y};inspect(inspectedGraph,region);}
    else output.textContent='線画境界です。';
  };
  // Keep common fill actions visible, with advanced line-art tools in one panel.
  const advanced=document.createElement('details');
  const advancedTitle=document.createElement('summary');
  advancedTitle.textContent='線画の解析・細かい調整';
  const advancedOptions=document.createElement('div');advancedOptions.className='c06-clipboard-grid';
  for(const input of [regionLayers,view,inspectId,mergeTarget,issue,edgeShape,diagnostic,trace,showHints,
    clearHint,hintList,closedOnly,compare,showBefore]){
    const parent=input.parentElement;
    if(parent)advancedOptions.append(parent);
  }
  const advancedActions=document.createElement('div');advancedActions.className='c06-clipboard-grid';
  const basic=new Set(['キャンバスで塗る','領域を選択範囲にする','候補を適用','塗り候補を取り消す',
    '表示中の絵から1枚を除外して参照',
    '直前の塗りを調整','キャンバス操作をやめる','計算を中止']);
  for(const control of Array.from(actions.querySelectorAll('button'))){
    if(!basic.has(control.textContent??''))advancedActions.append(control);
  }
  advanced.append(advancedTitle,advancedOptions,advancedActions);
  panel.ontoggle=()=>{if(panel.open){sync();refreshReferences();refreshRegionList();}else stopGesture();};
  panel.append(summary,options,targets,analysisState,actions,advanced,preview,detailPreview,gapZoom,output);host.append(panel);sync();
  return {refresh:()=>{if(panel.open)sync();}};
}
