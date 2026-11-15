import type {BrushSurface} from '../brushSurface';
import type {MaskData} from '../selection/mask';
import type {Point} from '../transform/geometry';
import type {FillSettings,RegionGraph,Walls} from './pixels';
import {runFill} from './run';

type Reference='active'|'merged'|'layer'|'vector';
type Destination='active'|'new';
export type FillCapture=Readonly<{
  name:string;key:string;width:number;height:number;source:Uint8Array;target:Uint8Array|null;
  selection:MaskData|null;alphaLocked:boolean;valid:()=>boolean;referenceValid:()=>boolean;
  apply:(pixels:Uint8ClampedArray)=>Promise<void>;select:(mask:MaskData)=>void;
}>;

export function installFillPanel(host:HTMLElement,api:{
  drawing:()=>BrushSurface|null;color:()=>string;references:()=>readonly {id:string;name:string;vector:boolean}[];
  capture:(reference:Reference,destination:Destination,layerId:string,needTarget:boolean)=>Promise<FillCapture>;
}){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const summary=document.createElement('summary');summary.textContent='塗りつぶし・線画の領域';
  const options=document.createElement('div');options.className='c06-clipboard-grid';
  const actions=document.createElement('div');actions.className='c06-clipboard-grid';
  const output=document.createElement('output');output.setAttribute('role','status');
  const preview=document.createElement('canvas');preview.hidden=true;preview.style.cssText='max-width:100%;border:1px solid currentColor';
  let gesture:BrushSurface|null=null,running=false,graph:RegionGraph|null=null,previous:RegionGraph|null=null;
  let capture:FillCapture|null=null,graphTolerance=0,graphGap=0;
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
  const number=(text:string,value:number,max:number)=>{
    const control=document.createElement('input');control.type='number';control.min='0';control.max=String(max);control.value=String(value);
    makeLabel(text,control);
    return control;
  };
  const checkbox=(text:string,initial=false)=>{
    const control=document.createElement('input');control.type='checkbox';control.checked=initial;
    makeLabel(text,control);
    return control;
  };
  const method=select('塗る範囲',[['color','同じ色'],['line','線で囲まれた領域'],['lasso','手描きで囲んだ範囲']]);
  const reference=select('参照する絵',[['active','選んだレイヤー'],['merged','見えている絵の全体'],['layer','指定するレイヤー'],['vector','ベクター線画']]);
  const referenceLayer=select('参照するレイヤー',[]);
  const destination=select('塗る場所',[['active','選んだレイヤー'],['new','新しいレイヤー']]);
  const tolerance=number('色の許容範囲・線の濃さ（%）',15,100);
  const gap=number('埋める隙間（px）',0,12);
  const opacity=number('塗りの濃さ（%）',100,100);
  const contiguous=checkbox('続いている部分だけ',true);
  const closedOnly=checkbox('閉じた領域だけ',true);
  const erase=checkbox('指定部分を透明にする');
  const compare=checkbox('前回の解析結果を表示');
  const value=(input:HTMLInputElement,max:number)=>Math.max(0,Math.min(max,input.valueAsNumber||0));
  const settings=():FillSettings=>({
    method:method.value as FillSettings['method'],tolerance:value(tolerance,100),gap:value(gap,12),opacity:value(opacity,100)/100,
    color:api.color(),erase:erase.checked,contiguous:contiguous.checked,closedOnly:closedOnly.checked
  });
  function button(label:string,handler:()=>void|Promise<void>){
    const control=document.createElement('button');control.type='button';control.textContent=label;
    control.onclick=()=>void work(handler);
    actions.append(control);
  }
  async function work(handler:()=>void|Promise<void>){
    if(running)return;
    running=true;
    try{await handler();}catch(error){output.textContent=error instanceof Error?error.message:String(error);}
    finally{running=false;}
  }
  function updateReferenceOptions(){
    const before=referenceLayer.value;
    referenceLayer.replaceChildren(...api.references().filter(item=>reference.value!=='vector'||item.vector).map(({id,name})=>new Option(name,id)));
    if([...referenceLayer.options].some(option=>option.value===before))referenceLayer.value=before;
    referenceLayer.disabled=reference.value!=='layer'&&reference.value!=='vector';
  }
  const read=(needTarget:boolean)=>api.capture(reference.value as Reference,destination.value as Destination,referenceLayer.value,needTarget);
  function paintGraph(){
    const current=compare.checked&&previous?previous:graph;
    preview.hidden=!current;
    if(!current)return;
    const {width,height,labels,external,walls}=current,scale=Math.min(1,300/Math.max(width,height));
    const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    preview.width=w;preview.height=h;
    const context=preview.getContext('2d');
    if(!context)return;
    const image=context.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=Math.floor(y*height/h)*width+Math.floor(x*width/w),at=(y*w+x)*4,id=labels[p]!;
      const color=walls[p]?[32,32,35]:external[id]?[207,212,219]:
        [100+id*37%130,115+id*71%115,130+id*109%100];
      image.data.set([...color,255],at);
    }
    context.putImageData(image,0,0);
  }
  async function analyze(points?:readonly Point[],remove=false){
    const source=await read(false),old=manuals.get(source.key)??[];
    const manual=points?[...old,{points,remove}]:old;
    const current=settings();
    const response=await runFill({type:'graph',source:source.source,width:source.width,height:source.height,settings:current,manual});
    if(!source.valid()||!response.graph)throw Error('参照元が変わりました。もう一度解析してください。');
    manuals.set(source.key,manual);
    previous=capture?.key===source.key?graph:null;
    graph=response.graph;capture=source;graphTolerance=current.tolerance;graphGap=current.gap;compare.checked=false;compare.disabled=!previous;
    paintGraph();
    const outside=graph.external.reduce((sum,x)=>sum+x,0);
    output.textContent=`${source.name}・閉じた領域 ${graph.count-outside} 件・画面端につながる領域 ${outside} 件`;
  }
  function stopGesture(){gesture?.setCanvasEditGesture(null);gesture=null;}
  function onCanvas(label:string,complete:(points:readonly Point[])=>Promise<void>){
    stopGesture();
    const drawing=api.drawing();
    if(!drawing)throw Error('作品を開いてください。');
    gesture=drawing;output.textContent=label;
    drawing.setCanvasEditGesture({path:true,width:2,color:'#ffb742',complete:points=>{
      stopGesture();
      if(points.length)void work(()=>complete(points));
    }});
  }
  async function fill(points:readonly Point[],asSelection:boolean){
    const source=await read(!asSelection),options=settings();
    if(options.method==='line'&&(!graph||capture?.key!==source.key||!capture.referenceValid()||options.tolerance!==graphTolerance||options.gap!==graphGap))
      throw Error('参照元が変わっています。「線画を解析・更新」を押してください。');
    if(options.erase&&destination.value==='new'&&!asSelection)throw Error('透明にする場合は、既存のレイヤーを選んでください。');
    const result=await runFill({type:'fill',source:source.source,target:source.target,width:source.width,height:source.height,
      graph:options.method==='line'?graph:null,selection:asSelection?null:source.selection,settings:options,points,
      output:asSelection?'selection':'pixels',alphaLocked:source.alphaLocked});
    if(!source.valid())throw Error('塗る対象が変わりました。');
    if(asSelection&&result.mask){source.select(result.mask);output.textContent='領域を選択しました。';}
    else if(result.pixels){await source.apply(result.pixels);output.textContent='塗りを反映しました。';}
    else output.textContent='指定の範囲に変更される画素がありません。';
  }
  button('キャンバスで塗る',()=>onCanvas('塗る場所をタップするか、範囲をなぞって指定してください。',points=>fill(points,false)));
  button('領域を選択範囲にする',()=>onCanvas('選びたい領域をタップしてください。',points=>fill(points,true)));
  button('線画を解析・更新',()=>analyze());
  button('境界線を足す',()=>onCanvas('線をつなぎたい場所をなぞってください。',points=>analyze(points)));
  button('境界線を消す',()=>onCanvas('消したい境界線をなぞってください。',points=>analyze(points,true)));
  button('境界の手直しを取り消す',async()=>{
    if(!capture)return;
    const before=manuals.get(capture.key)??[];
    manuals.set(capture.key,before.slice(0,-1));
    await analyze();
  });
  button('キャンバス操作をやめる',()=>{stopGesture();output.textContent='操作を取り消しました。';});
  reference.onchange=()=>{if(reference.value==='vector')method.value='line';updateReferenceOptions();};
  compare.onchange=paintGraph;compare.disabled=true;
  panel.ontoggle=()=>{if(panel.open)updateReferenceOptions();else stopGesture();};
  panel.append(summary,options,actions,preview,output);host.append(panel);
}
