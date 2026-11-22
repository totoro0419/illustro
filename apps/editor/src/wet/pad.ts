import {button,labelledField,numberField,selectField} from '../artwork/tools';
import {defaultWet,paintWet,type Point,type WetMode,type WetSettings} from './paint';
import {wetModes} from './panel';
const key='illustro.round2.wet-pad.v1';
export function installWetPad(host:HTMLElement,api:{settings:()=>WetSettings|undefined;sample:(rgb:readonly number[])=>void}){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const summary=document.createElement('summary');summary.textContent='混色の試し描き';
  const settings=document.createElement('div');settings.className='c06-clipboard-grid';
  const size=selectField(settings,'大きさ',[['192','192 × 120'],['320','320 × 200'],['480','480 × 300']]);
  const mode=selectField(settings,'使う筆',wetModes.filter(([id])=>id!=='clone'&&id!=='heal'&&id!=='patch'));mode.value='mix';
  const sizeBrush=numberField(settings,'直径（px）',32,1,128);
  const background=selectField(settings,'背景',[['light','白い紙'],['dark','暗い紙'],['plain','透明']]);
  const pick=document.createElement('input');pick.type='checkbox';labelledField(settings,'次のタップで色を採る',pick);
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=120;
  canvas.style.cssText='display:block;width:100%;height:auto;touch-action:none;border:1px solid #8293a5';
  canvas.setAttribute('aria-label','作品と独立したsRGB試し描きパッド');
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)return;
  const ctx=context,history:ImageData[]=[];
  const status=document.createElement('output');status.setAttribute('role','status');
  let pointer:number|null=null,points:Point[]=[],pressTimer:number|undefined,consumed=false,started=false;
  const padRect=()=>({x:0,y:0,width:canvas.width,height:canvas.height});
  const point=(event:PointerEvent)=>{
    const rect=canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)/rect.width*canvas.width,y:(event.clientY-rect.top)/rect.height*canvas.height,
      pressure:event.pointerType==='pen'?event.pressure:.85};
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
  canvas.onpointerup=event=>{
    if(pointer!==event.pointerId)return;
    clearTimeout(pressTimer);pointer=null;
    if(consumed)return;
    try{
      const source=ctx.getImageData(0,0,canvas.width,canvas.height),newSettings=api.settings()??defaultWet;
      if(!sizeBrush.validity.valid||!sizeBrush.value)throw Error('筆の直径を指定してください。');
      const result=paintWet({destination:{area:padRect(),pixels:source.data},reference:null,points,
        offset:{x:0,y:0},selection:null,alphaLocked:false,
        settings:{...newSettings,mode:mode.value as WetMode,size:sizeBrush.valueAsNumber}});
      if(result.changed){
        keep();ctx.putImageData(new ImageData(new Uint8ClampedArray(result.pixels),canvas.width,canvas.height),0,0);save();
      }
    }catch(error){status.textContent=(error as Error).message;}
  };
  canvas.onpointercancel=()=>{clearTimeout(pressTimer);pointer=null;};
  size.onchange=()=>{started=true;resize();save();};
  background.onchange=()=>{started=true;setPaper();save();};
  const actions=document.createElement('div');actions.className='box-actions';
  actions.append(button('パッドだけ戻す',()=>{
    const image=history.pop();if(image){ctx.putImageData(image,0,0);save();}
  },status),button('パッドを消す',()=>{started=true;keep();ctx.clearRect(0,0,canvas.width,canvas.height);save();},status));
  panel.append(summary,settings,canvas,actions,status);host.append(panel);setPaper();restore();
}
