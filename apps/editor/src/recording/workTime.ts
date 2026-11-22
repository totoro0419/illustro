import {appPrompt} from '../ui/appDialogs';
import {button} from '../artwork/tools';

const idle=30000;
const prefix='illustro.work-time.v1.';
type Correction=Readonly<{date:string;time:number;delta:number}>;
type SavedTime={measured:Record<string,number>;corrections:Correction[];enabled:boolean};

function today(now=new Date()){
  return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
}
function read(id:string):SavedTime{
  try{
    const parsed=JSON.parse(localStorage.getItem(prefix+id)??'null');
    if(parsed&&typeof parsed.enabled==='boolean'){
      const measured:Record<string,number>={};
      for(const [key,value] of Object.entries(parsed.measured??{}))
        if(/^\d{4}-\d{2}-\d{2}$/.test(key)&&typeof value==='number'&&Number.isFinite(value)&&value>=0)measured[key]=value;
      const corrections:Correction[]=Array.isArray(parsed.corrections)
        ?parsed.corrections.filter((row:Correction)=>row&&typeof row.date==='string'&&Number.isFinite(row.time)&&Number.isFinite(row.delta)):[];
      return {enabled:parsed.enabled,measured,corrections};
    }
  }catch{}
  return {enabled:false,measured:{},corrections:[]};
}
function duration(milliseconds:number){
  const minutes=Math.floor(Math.max(0,milliseconds)/60000);
  const seconds=Math.floor(Math.max(0,milliseconds)/1000)%60;
  return (minutes>=60?Math.floor(minutes/60)+'時間 ':'')+minutes%60+'分 '+seconds+'秒';
}
export function installWorkTime(host:HTMLElement,canvasArea:HTMLElement,documentId:()=>string|null){
  const details=document.createElement('details');
  const title=document.createElement('summary');title.textContent='作業時間';
  const stats=document.createElement('p'),status=document.createElement('output');
  status.setAttribute('role','status');
  const note=document.createElement('small');
  note.textContent='キャンバスへの入力間隔が30秒以内の時間を合計します。入力のない時間は推定に含みません。';
  const pending=new Map<string,Map<string,number>>(),session=new Map<string,number>();
  let last:{id:string;clock:number;date:string}|null=null;
  let settingId:string|null=null,enabled=false,sessionWriteFailed=false;
  function persist(id:string,saved=read(id)){
    const changes=pending.get(id);
    if(changes)for(const [key,duration] of changes)saved.measured[key]=(saved.measured[key]??0)+duration;
    try{localStorage.setItem(prefix+id,JSON.stringify(saved));pending.delete(id);sessionWriteFailed=false;return true;}
    catch{sessionWriteFailed=true;return false;}
  }
  function flush(){for(const id of pending.keys())persist(id);}
  function syncSetting(id:string|null){
    if(id===settingId)return;
    if(settingId&&pending.has(settingId))persist(settingId);
    settingId=id;last=null;enabled=id!==null&&read(id).enabled;
  }
  function activity(){
    const id=documentId();
    syncSetting(id);
    if(!id||!enabled||document.hidden)return;
    const now=performance.now(),date=today();
    if(last?.id===id&&last.date===date&&now-last.clock<=idle){
      const elapsed=now-last.clock,values=pending.get(id)??new Map<string,number>();
      values.set(date,(values.get(date)??0)+elapsed);pending.set(id,values);
      session.set(id,(session.get(id)??0)+elapsed);
    }
    last={id,clock:now,date};
  }
  canvasArea.addEventListener('pointerdown',event=>{
    if(event.isTrusted&&event.target instanceof Element&&!event.target.closest('button,input,select,textarea,[data-canvas-no-input]'))activity();
  },{capture:true,passive:true});
  canvasArea.addEventListener('pointermove',event=>{
    if(event.isTrusted&&event.buttons!==0)activity();
  },{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){last=null;flush();}});
  window.addEventListener('pagehide',flush);
  const toggle=button('計測を開始',()=>{
    const id=documentId();syncSetting(id);if(!id)return;
    const saved=read(id);saved.enabled=!enabled;
    if(!persist(id,saved)){refresh();return;}
    enabled=saved.enabled;last=null;refresh();
  },status);
  const adjust=button('今日の時間を補正',async()=>{
    const id=documentId();if(!id)return;
    const value=await appPrompt('今日の作業時間に加える分数。減らす場合は負の数を入力してください。','0',{
      required:true,validate:text=>{
        const number=Number(text);return Number.isInteger(number)&&Math.abs(number)<=1440?null:'−1440〜1440の整数を入力してください。';
      },
    });
    if(value===null||id!==documentId())return;
    const saved=read(id);
    saved.corrections.push({date:today(),time:Date.now(),delta:Number(value)*60000});
    persist(id,saved);refresh();
  },status);
  const adjustments=document.createElement('details'),adjustmentTitle=document.createElement('summary'),audit=document.createElement('ul');
  adjustmentTitle.textContent='補正の履歴';adjustments.append(adjustmentTitle,audit);
  function refresh(){
    const id=documentId();syncSetting(id);
    toggle.disabled=adjust.disabled=!id;
    if(!id){stats.textContent='作品を開いてください。';return;}
    const saved=read(id),byDate={...saved.measured};
    for(const [key,value] of pending.get(id)??[])byDate[key]=(byDate[key]??0)+value;
    for(const correction of saved.corrections)byDate[correction.date]=(byDate[correction.date]??0)+correction.delta;
    const workingDays=Object.values(byDate).filter(value=>value>0),total=workingDays.reduce((a,b)=>a+b,0);
    stats.textContent='今回 '+duration(session.get(id)??0)+' ／ 今日 '+duration(byDate[today()]??0)+' ／ 合計 '+duration(total)+
      ' ／ 作業日平均 '+duration(total/Math.max(1,workingDays.length));
    toggle.textContent=enabled?'計測を停止':'計測を開始';
    const active=last?.id===id&&performance.now()-last.clock<=idle;
    status.textContent=sessionWriteFailed?'作業時間を端末に保存できません。':enabled?(active?'入力から計測中':'入力待ち'):'停止中';
    if(adjustments.open)audit.replaceChildren(...saved.corrections.slice(-40).reverse().map(row=>{
      const item=document.createElement('li');item.textContent=new Date(row.time).toLocaleString('ja-JP')+' · '+(row.delta>0?'+':'')+row.delta/60000+'分';return item;
    }));
  }
  const settings=document.createElement('div');settings.className='box-actions';settings.append(toggle,adjust);
  details.append(title,stats,note,settings,status,adjustments);
  details.ontoggle=adjustments.ontoggle=()=>{if(details.open)refresh();};
  window.setInterval(()=>{flush();if(details.open&&host.closest('dialog')?.open)refresh();},5000);
  host.append(details);
  return {refresh};
}
