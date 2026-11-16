import {validateEditableArtwork,type ArtPoint,type EditableGradient,type EditablePath,type GradientStop,type LayerId,type LayerMask} from '@illustro/core';
import {runArtwork} from './run';
import {button,labelledField,locate,numberField,paintPreview,selectField,type ArtworkActions} from './tools';

function curve(a:ArtPoint,b:ArtPoint,c:ArtPoint):ArtPoint[]{
  return [{...a,outX:b.x,outY:b.y},{...c,inX:b.x,inY:b.y}];
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
    ['rectangle','長方形'],['ellipse','楕円'],['polyline','直線・折れ線'],['bezier','ベジェ曲線']
  ] as const);
  const width=numberField(shapeFields,'線幅（px）',8,0,4096);
  const stroke=document.createElement('input');stroke.type='color';labelledField(shapeFields,'線の色',stroke);
  const fill=document.createElement('input');fill.type='color';fill.value='#faac49';labelledField(shapeFields,'内側の色',fill);
  const filled=document.createElement('input');filled.type='checkbox';labelledField(shapeFields,'内側を塗る',filled);
  const closed=document.createElement('input');closed.type='checkbox';labelledField(shapeFields,'道筋を閉じる',closed);
  const square=document.createElement('input');square.type='checkbox';labelledField(shapeFields,'縦と横の長さをそろえる',square);
  const mode=selectField(gradientFields,'広がり方',[
    ['linear','直線'],['radial','放射'],['reflected','反射'],['angular','角度']
  ] as const);
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
    if(type.value==='gradient')return validateEditableArtwork({kind:'gradient',mode:mode.value,start,end,stops,...(follow?{follow:getBoundary()}:{})}) as EditableGradient;
    let result=points.length>=2?[...points]:[start,end];
    result[0]={...result[0],...start};
    result[result.length-1]={...result.at(-1),...end};
    if(square.checked&&(shape.value==='rectangle'||shape.value==='ellipse')){
      const length=Math.max(Math.abs(end.x-start.x),Math.abs(end.y-start.y));
      result=[start,{x:start.x+Math.sign(end.x-start.x||1)*length,y:start.y+Math.sign(end.y-start.y||1)*length}];
    }
    return validateEditableArtwork({kind:'path',shape:shape.value,points:result,
      closed:closed.checked,lineStyle,stroke:stroke.value,fill:filled.checked?fill.value:null,width:width.valueAsNumber}) as EditablePath;
  }
  function stopHandles(){
    if(editingHandles)draftDrawing?.setCanvasEditGesture(null);
    editingHandles=false;
  }
  /** Show editable points on the actual canvas; the drawing engine owns the live drag outline. */
  function editOnCanvas(){
    const current=api.context();
    if(!current||current.drawing!==draftDrawing)throw Error('作品を開き直したため、編集をやり直してください。');
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
    for(const [index,stop] of stops.entries()){
      const row=document.createElement('div');row.className='c06-clipboard-grid';
      const position=numberField(row,'位置（%）',stop.at*100,0,100,.1);
      const color=document.createElement('input');color.type='color';color.value=stop.color;labelledField(row,'色',color);
      const opacity=numberField(row,'不透明度（%）',stop.opacity*100,0,100,.1);
      const midpoint=numberField(row,'次の色との中間（%）',stop.midpoint*100,1,99,.1);
      row.onchange=()=>{
        stops[index]={at:Math.max(0,Math.min(1,position.valueAsNumber/100)),color:color.value,
          opacity:Math.max(0,Math.min(1,opacity.valueAsNumber/100)),midpoint:Math.max(.01,Math.min(.99,midpoint.valueAsNumber/100))};
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
    // Coalesce rapid edits: never start another pair of image workers while an older preview runs.
    if(previewRunning){previewPending=true;return;}
    previewRunning=true;
    do{
      previewPending=false;
      const current=api.context(),id=previewId;
      if(!current)break;
      try{
        const scale=Math.min(1,260/Math.max(current.width,current.height));
        const outputWidth=Math.max(1,Math.round(current.width*scale)),outputHeight=Math.max(1,Math.round(current.height*scale));
        const size={width:current.width,height:current.height,outputWidth,outputHeight,mask:getMask(),previewMask:true};
        const compare=type.value==='gradient'?view.value:'normal';
        const [base,followed]=await Promise.all([
          compare==='follow'?null:runArtwork({...size,content:data(false)}),
          compare==='normal'?null:runArtwork({...size,content:data(true)})
        ]);
        const pixels=base??followed!;
        if(base&&followed)for(let y=0;y<outputHeight;y++){
          const start=(y*outputWidth+Math.floor(outputWidth/2))*4;
          base.set(followed.subarray(start,(y+1)*outputWidth*4),start);
        }
        if(id===previewId)paintPreview(preview,pixels,outputWidth,outputHeight);
      }catch(error){if(id===previewId){
        preview.hidden=true;status.textContent=error instanceof Error?error.message:String(error);
      }}
    }while(previewPending&&panel.open);
    previewRunning=false;
  }
  function reset(){
    stopHandles();
    const current=api.context();
    if(!current)throw Error('作品を開いてください。');
    editing=undefined;stroke.value=current.color;lineStyle='solid';
    draftDrawing=current.drawing;draftMask=current.selectionMask();savedBoundary=undefined;loadBoundaries();
    applied.checked=false;view.value='normal';
    setPoints([{x:current.width*.22,y:current.height*.25},{x:current.width*.78,y:current.height*.75}]);
    status.textContent='新しいレイヤーに作ります。';void refresh();
  }
  function updateFields(){shapeFields.hidden=type.value!=='shape';gradientFields.hidden=type.value!=='gradient';redrawStops();}
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
        const a=path[0]!,b=path.at(-1)!;
        if(path.length===1)return;
        setPoints(type.value==='gradient'||shape.value==='rectangle'||shape.value==='ellipse'?[a,b]:
          shape.value==='bezier'?curve(a,path[Math.floor(path.length/2)]!,b):path);
        void refresh();
      });
    },status),
    button('選んだレイヤーを編集',()=>{
      stopHandles();
      const current=api.context(),selected=current?.selected.content;
      if(!current||!selected||selected.kind==='text')throw Error('図形かグラデーションのレイヤーを選んでください。');
      editing=current.selected.id;draftDrawing=current.drawing;
      if(selected.kind==='gradient'){
        type.value='gradient';mode.value=selected.mode;stops=[...selected.stops];setPoints([selected.start,selected.end]);
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
      await api.save(content,content.kind==='gradient'?'グラデーション':'図形',editing,
        content.kind==='gradient'?draftMask:undefined);
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
    if(!panel.open){stopHandles();++previewId;}
    else if(api.context()&&(!points.length||draftDrawing!==api.context()?.drawing))reset();
  };
  updateFields();
  panel.append(heading,controls,tools,stopsArea,preview,status);host.append(panel);
}
