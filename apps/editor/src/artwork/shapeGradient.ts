import {validateEditableArtwork,type ArtPoint,type EditableGradient,type EditablePath,type GradientStop,type LayerId,type LayerMask} from '@illustro/core';
import {layerMaskCoverage} from '@illustro/brush-rt';
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
/** Apply the same vector/pixel mask coverage as the committed layer,
 * sampled at the preview pixel center in original document coordinates. */
export function applyShapePreviewMask(
  pixels:Uint8ClampedArray,mask:LayerMask|null|undefined,
  width:number,height:number,outputWidth:number,outputHeight:number,
  sampleCoverage:(mask:LayerMask,x:number,y:number)=>number=layerMaskCoverage
):void{
  if(!mask?.enabled)return;
  for(let y=0;y<outputHeight;y++)for(let x=0;x<outputWidth;x++){
    const at=(y*outputWidth+x)*4;
    const coverage=mask.shape==='rectangle'&&sampleCoverage===layerMaskCoverage&&
      (outputWidth<width||outputHeight<height)
      ?rectanglePreviewCoverage(mask,x*width/outputWidth,y*height/outputHeight,
        (x+1)*width/outputWidth,(y+1)*height/outputHeight)
      :sampleCoverage(mask,(x+.5)*width/outputWidth,(y+.5)*height/outputHeight);
    pixels[at+3]=Math.round(pixels[at+3]!*coverage);
  }
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
  let points:ArtPoint[]=[];
  let stops:GradientStop[]=[{at:0,color:'#23252d',opacity:1,midpoint:.5},{at:1,color:'#f5a950',opacity:1,midpoint:.5}];
  let editing:LayerId|undefined,previewId=0,lineStyle:NonNullable<EditablePath['lineStyle']>='solid';
  let previewRunning=false,previewPending=false,editingHandles=false;
  let previewAbort:AbortController|null=null;
  let editedOpacity:number|undefined,originalStrokeLayer:string|undefined;
  let draftDrawing:NonNullable<ReturnType<ArtworkActions['context']>>['drawing']|undefined;
  let draftMask:LayerMask|null=null,savedBoundary:EditablePath|undefined;
  const getMask=()=>{
    const selected=api.context()?.selected;
    return editing?(selected?.id===editing?selected.mask:null):draftMask;
  };
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
    const [a,b]=[points[0]!,points.at(-1)!];
    [a.x,a.y,b.x,b.y].forEach((value,index)=>{coords[index]!.value=String(Math.round(value*10)/10);});
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
    if(editingHandles)draftDrawing?.setCanvasEditGesture(null);
    editingHandles=false;
  }
  /** Show editable points on the actual canvas; the drawing engine owns the live drag outline. */
  function editOnCanvas(){
    const current=api.context();
    if(!current||current.drawing!==draftDrawing)throw Error('作品を開き直したため、編集をやり直してください。');
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
    const edits:Array<{point:ArtPoint;change:(point:ArtPoint)=>void}>=[];
    const edges:Array<[number,number]>=[];
    if(content.kind==='gradient'){
      const start=content.start,end=content.end;
      edits.push({point:start,change:point=>setPoints([point,end])},
        {point:end,change:point=>setPoints([start,point])});
      edges.push([0,1]);
    }else{
      if(content.points.length>128)throw Error('編集点が128個を超えています。必要な点を減らしてから調整してください。');
      for(const [index,point] of content.points.entries()){
        edits.push({point,change:next=>{
          const dx=next.x-point.x,dy=next.y-point.y;
          const moved={...point,x:next.x,y:next.y,
            ...(point.inX===undefined?{}:{inX:point.inX+dx,inY:point.inY!+dy}),
            ...(point.outX===undefined?{}:{outX:point.outX+dx,outY:point.outY!+dy})};
          setPoints(content.points.map((p,i)=>i===index?moved:p));
        }});
        if(index)edges.push([index-1,index]);
      }
      if(content.closed&&content.points.length>2)edges.push([content.points.length-1,0]);
      for(const [index,point] of content.points.entries()){
        if(point.inX!==undefined&&point.inY!==undefined){
          const i=edits.length;
          edits.push({point:{x:point.inX,y:point.inY},change:next=>{
            setPoints(content.points.map((p,k)=>k===index?{...p,inX:next.x,inY:next.y}:p));
          }});edges.push([index,i]);
        }
        if(point.outX!==undefined&&point.outY!==undefined){
          const i=edits.length;
          edits.push({point:{x:point.outX,y:point.outY},change:next=>{
            setPoints(content.points.map((p,k)=>k===index?{...p,outX:next.x,outY:next.y}:p));
          }});edges.push([index,i]);
        }
      }
    }
    if(edits.length>256)throw Error('表示する編集点が多すぎます。');
    current.drawing.setCanvasEditGesture({path:false,width:2,color:'#43bfea',complete:()=>{},
      pointEdit:{points:edits.map(item=>item.point),edges,closed:false,commit:(index,point)=>{
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
      bar.style.background='linear-gradient(to right,'+sorted.map(s=>s.color+' '+(s.at*100)+'%').join(',')+')';
    };
    updateBar();
    const markers:HTMLButtonElement[]=[];
    const updateMarkers=()=>markers.forEach((marker,i)=>{marker.style.left=(stops[i]!.at*100)+'%';});
    for(const [index,stop] of stops.entries()){
      const marker=document.createElement('button');
      marker.type='button';marker.title='色 '+(index+1)+' をドラッグして位置を調整';
      marker.setAttribute('aria-label',marker.title);
      marker.style.cssText='position:absolute;top:4px;transform:translateX(-50%);width:17px;height:24px;border:2px solid white;border-radius:5px;background:'+stop.color+';box-shadow:0 0 0 1px #252525;cursor:ew-resize;touch-action:none;padding:0';
      let dragging:number|null=null;
      const move=(clientX:number)=>{
        const rect=bar.getBoundingClientRect();
        if(rect.width<=0)return;
        stops[index]={...stops[index]!,at:Math.round(Math.max(0,Math.min(1,(clientX-rect.left)/rect.width))*1000)/1000};
        const field=stopsArea.querySelectorAll<HTMLInputElement>('input[data-stop-position]')[index];
        if(field)field.value=String(Math.round(stops[index]!.at*1000)/10);
        updateMarkers();updateBar();
      };
      marker.onpointerdown=event=>{
        if(event.button!==0)return;
        event.preventDefault();dragging=event.pointerId;marker.setPointerCapture(event.pointerId);move(event.clientX);
      };
      marker.onpointermove=event=>{if(dragging===event.pointerId)move(event.clientX);};
      const finish=(event:PointerEvent)=>{
        if(dragging!==event.pointerId)return;
        move(event.clientX);dragging=null;
        if(marker.hasPointerCapture(event.pointerId))marker.releasePointerCapture(event.pointerId);
        void refresh();
      };
      marker.onpointerup=finish;
      marker.onpointercancel=event=>{if(dragging!==event.pointerId)return;dragging=null;void refresh();};
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
        stops[index]={at:Math.max(0,Math.min(1,position.valueAsNumber/100)),color:color.value,
          opacity:Math.max(0,Math.min(1,opacity.valueAsNumber/100)),midpoint:Math.max(.01,Math.min(.99,midpoint.valueAsNumber/100))};
        markers[index]!.style.background=color.value;updateMarkers();updateBar();
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
        const size={width:current.width,height:current.height,outputWidth,outputHeight,mask:getMask(),previewMask:true};
        const compare=type.value==='gradient'?view.value:'normal';
        const [base,followed]=await Promise.all([
          compare==='follow'?null:runArtwork({...size,content:data(false)},{signal:abort.signal,priority:'preview'}),
          compare==='normal'?null:runArtwork({...size,content:data(true)},{signal:abort.signal,priority:'preview'})
        ]);
        const pixels=base??followed!;
        // The shared renderer does not mask editable paths at preview size.
        // Apply the same layer-mask coverage here to avoid showing paint outside the selection.
        if(type.value==='shape')
          applyShapePreviewMask(pixels,size.mask,current.width,current.height,outputWidth,outputHeight);
        if(base&&followed)for(let y=0;y<outputHeight;y++){
          const start=(y*outputWidth+Math.floor(outputWidth/2))*4;
          base.set(followed.subarray(start,(y+1)*outputWidth*4),start);
        }
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
    editing=undefined;editedOpacity=undefined;originalStrokeLayer=undefined;stroke.value=current.color;lineStyle='solid';
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
      editing=current.selected.id;draftDrawing=current.drawing;
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
      // Commit the exact selection mask shown in the preview. Without this
      // snapshot, a newly created path would use whichever selection happened
      // to be active when Save ran, even though the preview used draftMask.
      // Existing editable layers keep their own stored vector mask.
      await api.save(content,content.kind==='gradient'?'グラデーション':'図形',editing,
        shapeGradientInitialMask(editing,draftMask));
      stopHandles();
      status.textContent='作品に反映しました。';
    },status),
    button('変更を取り消す',()=>{
      stopHandles();
      ++previewId;editing=undefined;points=[];draftDrawing=undefined;draftMask=null;
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
