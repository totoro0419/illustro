import {validateEditableArtwork,type ArtPoint,type EditableGradient,type EditablePath,type GradientStop,type LayerId} from '@illustro/core';
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
  const coords=(['始点 X','始点 Y','終点 X','終点 Y'] as const)
    .map(label=>numberField(controls,label,0,-8192,16384,.5));
  let points:ArtPoint[]=[];
  let stops:GradientStop[]=[{at:0,color:'#23252d',opacity:1,midpoint:.5},{at:1,color:'#f5a950',opacity:1,midpoint:.5}];
  let editing:LayerId|undefined,previewId=0,lineStyle:NonNullable<EditablePath['lineStyle']>='solid';
  function setPoints(next:readonly ArtPoint[]){
    points=[...next];
    if(!points.length)return;
    const [a,b]=[points[0]!,points.at(-1)!];
    [a.x,a.y,b.x,b.y].forEach((value,index)=>{coords[index]!.value=String(Math.round(value*10)/10);});
  }
  function data(){
    const [x,y,endX,endY]=coords.map(i=>i.valueAsNumber);
    const start={x:x??0,y:y??0},end={x:endX??0,y:endY??0};
    if(type.value==='gradient')return validateEditableArtwork({kind:'gradient',mode:mode.value,start,end,stops}) as EditableGradient;
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
    const current=api.context(),id=++previewId;
    if(!current)return;
    try{
      const content=data(),scale=Math.min(1,260/Math.max(current.width,current.height));
      const outputWidth=Math.max(1,Math.round(current.width*scale)),outputHeight=Math.max(1,Math.round(current.height*scale));
      const pixels=await runArtwork({content,width:current.width,height:current.height,outputWidth,outputHeight});
      if(id===previewId)paintPreview(preview,pixels,outputWidth,outputHeight);
    }catch(error){if(id===previewId)status.textContent=error instanceof Error?error.message:String(error);}
  }
  function reset(){
    const current=api.context();
    if(!current)throw Error('作品を開いてください。');
    editing=undefined;stroke.value=current.color;lineStyle='solid';
    setPoints([{x:current.width*.22,y:current.height*.25},{x:current.width*.78,y:current.height*.75}]);
    status.textContent='新しいレイヤーに作ります。';void refresh();
  }
  function updateFields(){shapeFields.hidden=type.value!=='shape';gradientFields.hidden=type.value!=='gradient';redrawStops();}
  type.onchange=()=>{editing=undefined;updateFields();void refresh();};
  controls.addEventListener('change',()=>void refresh());
  tools.append(
    button('新しく作る',reset,status),
    button('キャンバスで形や向きを指定',()=>{
      const current=api.context();
      if(!current)throw Error('作品を開いてください。');
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
      const current=api.context(),selected=current?.selected.content;
      if(!current||!selected||selected.kind==='text')throw Error('図形かグラデーションのレイヤーを選んでください。');
      editing=current.selected.id;
      if(selected.kind==='gradient'){
        type.value='gradient';mode.value=selected.mode;stops=[...selected.stops];setPoints([selected.start,selected.end]);
      }else{
        type.value='shape';shape.value=selected.shape==='freehand'?'polyline':selected.shape;
        stroke.value=selected.stroke;filled.checked=!!selected.fill;lineStyle=selected.lineStyle??'solid';
        if(selected.fill)fill.value=selected.fill;
        closed.checked=selected.closed;width.value=String(selected.width);square.checked=false;
        setPoints(selected.points);
      }
      status.textContent=current.selected.name+'を編集します。';updateFields();void refresh();
    },status),
    button('適用',async()=>{
      const content=data();
      await api.save(content,content.kind==='gradient'?'グラデーション':'図形',editing);
      status.textContent='作品に反映しました。';
    },status)
  );
  panel.ontoggle=()=>{if(panel.open&&!points.length&&api.context())reset();};
  updateFields();
  panel.append(heading,controls,tools,stopsArea,preview,status);host.append(panel);
}
