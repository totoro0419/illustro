import {CanonicalBuilder,cpuReference,type FoundationPreset,type StrokeContext,type Sample} from '@illustro/brush-rt';
import {nativeBrushSensors} from '../brushInput';
import {button,labelledField,numberField,selectField} from '../artwork/tools';
import {defaultWet,needsSource,paintWet,type Point,type WetMode,type WetSettings} from './paint';
import {wetModes} from './panel';
const key='illustro.round2.wet-pad.v1';
export function installWetPad(host:HTMLElement,api:{settings:()=>WetSettings|undefined;sample:(rgb:readonly number[])=>void;brushes:()=>readonly FoundationPreset[];activeBrush:()=>string;context:()=>StrokeContext}){
  const panel=document.createElement('details');panel.id='sharedBrushTestPad';panel.className='c06-clipboard-panel';
  const summary=document.createElement('summary');summary.textContent='ブラシ共通の試し描き';
  const settings=document.createElement('div');settings.className='c06-clipboard-grid';
  const size=selectField(settings,'大きさ',[['192','192 × 120'],['320','320 × 200'],['480','480 × 300']]);
  const mode=selectField(settings,'使う筆',[['active','現在のブラシ'],...wetModes] as const);
  const refreshBrushes=()=>{
    const before=mode.value;
    mode.replaceChildren(new Option('現在のブラシ','active'),...api.brushes().map(p=>new Option(p.name,'preset:'+p.id)),
      ...wetModes.map(([id,label])=>new Option(label,id)));
    mode.value=[...mode.options].some(item=>item.value===before)?before:'active';
  };
  panel.addEventListener('toggle',()=>{if(panel.open)refreshBrushes();});
  const sizeBrush=numberField(settings,'共通の直径（px）',32,1,256);
  const background=selectField(settings,'背景',[['light','白い紙'],['dark','暗い紙'],['plain','透明']]);
  const pick=document.createElement('input');pick.type='checkbox';labelledField(settings,'次のタップで色を採る',pick);
  const sourcePick=document.createElement('input');sourcePick.type='checkbox';labelledField(settings,'次のタップで修復の採取元を指定',sourcePick);
  let sourcePoint:Point|null=null;
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=120;
  canvas.style.cssText='display:block;width:100%;height:auto;touch-action:none;border:1px solid #8293a5';
  canvas.setAttribute('aria-label','作品と独立したsRGB試し描きパッド');
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)return;
  const ctx=context,history:ImageData[]=[];
  const status=document.createElement('output');status.setAttribute('role','status');
  let pointer:number|null=null,points:Sample[]=[],pressTimer:number|undefined,consumed=false,started=false;
  const padRect=()=>({x:0,y:0,width:canvas.width,height:canvas.height});
  let last:{source:ImageData;points:Sample[]}|null=null;
  const point=(event:PointerEvent):Sample=>{
    const rect=canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)/rect.width*canvas.width,y:(event.clientY-rect.top)/rect.height*canvas.height,
      ...nativeBrushSensors(event),t:event.timeStamp,pressure:event.pointerType==='pen'?event.pressure:.85};
  };
  function save(){
    try{localStorage.setItem(key,JSON.stringify({size:size.value,background:background.value,png:canvas.toDataURL('image/png')}));}
    catch{status.textContent='パッドを端末に保存できません。';}
  }
  function setPaper(){
    canvas.style.background=background.value==='dark'?'#292e36':background.value==='light'?'#fff':'repeating-conic-gradient(#fff 0% 25%,#e0e4e9 0% 50%) 0 0/16px 16px';
  }
  function resize(){
    const old=ctx.getImageData(0,0,canvas.width,canvas.height);
    canvas.width=Number(size.value);canvas.height=canvas.width*5/8;
    ctx.putImageData(old,0,0);history.length=0;
  }
  function restore(){
    try{
      const record=JSON.parse(localStorage.getItem(key)??'null');
      if(!record||!['192','320','480'].includes(record.size)||!['light','dark','plain'].includes(record.background)||
         typeof record.png!=='string'||!record.png.startsWith('data:image/png;base64,'))return;
      size.value=record.size;background.value=record.background;resize();setPaper();
      const image=new Image();image.onload=()=>{if(!started&&image.width===canvas.width&&image.height===canvas.height)ctx.drawImage(image,0,0);};
      image.src=record.png;
    }catch{/* local corrupt data never prevents drawing */}
  }
  function keep(){
    history.push(ctx.getImageData(0,0,canvas.width,canvas.height));
    if(history.length>10)history.shift();
  }
  function sample(pos:Point){
    const x=Math.max(0,Math.min(canvas.width-1,Math.floor(pos.x))),y=Math.max(0,Math.min(canvas.height-1,Math.floor(pos.y)));
    const {data}=ctx.getImageData(x,y,1,1);
    if(!data[3]){status.textContent='透明な場所です。描いた部分から色を選んでください。';return;}
    api.sample([data[0]!,data[1]!,data[2]!]);status.textContent='描画色に採りました。';
  }
  canvas.onpointerdown=event=>{
    if(pointer!==null||event.button!==0)return;
    event.preventDefault();started=true;consumed=false;
    const start=point(event);
    if(pick.checked){sample(start);pick.checked=false;return;}
    if(sourcePick.checked){sourcePoint=start;sourcePick.checked=false;status.textContent='修復の採取元を選びました。';return;}
    pointer=event.pointerId;points=[start];canvas.setPointerCapture(pointer);
    pressTimer=window.setTimeout(()=>{consumed=true;sample(start);},500);
  };
  canvas.onpointermove=event=>{
    if(pointer!==event.pointerId||consumed)return;
    const next=point(event),prev=points.at(-1)!;
    if(Math.hypot(next.x-prev.x,next.y-prev.y)<1)return;
    clearTimeout(pressTimer);
    if(points.length<2048)points.push(next);
  };
  function render(source:ImageData,trace:Sample[]){
    const value=String(mode.value),wet=wetModes.find(([id])=>id===value)?.[0];
    const settings=api.settings()??defaultWet;
    if(!sizeBrush.validity.valid||!sizeBrush.value)throw Error('筆の直径を指定してください。');
    if(wet){
      const patch={area:padRect(),pixels:source.data};
      const donor=needsSource(wet)?sourcePoint:null,first=trace[0]!;
      if(needsSource(wet)&&!donor)throw Error('試し描きに使う採取元を指定してください。');
      return paintWet({destination:patch,reference:donor?patch:null,points:trace,
        offset:donor?{x:donor.x-first.x,y:donor.y-first.y}:{x:0,y:0},selection:null,alphaLocked:false,
        settings:{...settings,mode:wet,size:sizeBrush.valueAsNumber}}).pixels;
    }
    const id=value==='active'?api.activeBrush():value.slice('preset:'.length);
    const preset=api.brushes().find(item=>item.id===id);
    if(!preset)throw Error('試すブラシを選んでください。');
    const builder=new CanonicalBuilder({...preset,size:sizeBrush.valueAsNumber,
      color:settings.color.map(value=>value/255) as [number,number,number]},[731,401],0,
      {...api.context(),freehandStabilizationScale:1,forceFadeGeometry:'adaptive-v1'});
    for(const point of trace)builder.accept(point);
    builder.finish();
    return cpuReference(builder.record(),canvas.width,canvas.height,source.data);
  }
  function apply(source:ImageData,trace:Sample[]){
    const start=performance.now(),pixels=render(source,trace);
    keep();ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels),canvas.width,canvas.height),0,0);
    save();status.textContent='試し描き '+Math.round(performance.now()-start)+' ms';
  }
  canvas.onpointerup=event=>{
    if(pointer!==event.pointerId)return;
    clearTimeout(pressTimer);pointer=null;
    if(consumed)return;
    try{
      const source=ctx.getImageData(0,0,canvas.width,canvas.height);
      apply(source,points);last={source,points};
    }catch(error){status.textContent=(error as Error).message;}
  };
  canvas.onpointercancel=()=>{clearTimeout(pressTimer);pointer=null;};
  size.onchange=()=>{started=true;last=null;sourcePoint=null;resize();save();};
  background.onchange=()=>{started=true;setPaper();save();};
  const actions=document.createElement('div');actions.className='box-actions';
  actions.append(button('同じ筆跡で今の筆を比べる',()=>{
    if(!last)throw Error('比較する筆跡を一筆描いてください。');
    apply(last.source,last.points);
  },status),button('パッドだけ戻す',()=>{
    const image=history.pop();if(image){ctx.putImageData(image,0,0);save();}
  },status),button('パッドを消す',()=>{started=true;last=null;keep();ctx.clearRect(0,0,canvas.width,canvas.height);save();},status));
  panel.append(summary,settings,canvas,actions,status);host.append(panel);setPaper();restore();
}
