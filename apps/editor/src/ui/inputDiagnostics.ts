import {nativeBrushSensors} from '../brushInput';
import {numberField,labelledField} from '../artwork/tools';

export type PressureRange={minimum:number;maximum:number;fixed:number|null};
export const defaultPressureRange:PressureRange={minimum:0,maximum:1,fixed:null};
const key='illustro.input.pressure-range.v1';
export function readPressureRange():PressureRange{
  try{
    const saved=JSON.parse(localStorage.getItem(key)??'null') as PressureRange|null;
    if(saved&&[saved.minimum,saved.maximum].every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&saved.maximum-saved.minimum>=.05&&
      (saved.fixed===null||Number.isFinite(saved.fixed)&&saved.fixed>=0&&saved.fixed<=1))return saved;
  }catch{}
  return {...defaultPressureRange};
}

export function installInputDiagnostics(host:HTMLElement,onRange:(range:PressureRange)=>void){
  const details=document.createElement('details'),summary=document.createElement('summary');
  summary.textContent='ペン入力の確認・筆圧の調整';
  const fields=document.createElement('div');fields.className='c06-clipboard-grid';
  const pad=document.createElement('canvas'),wave=document.createElement('canvas');
  for(const [canvas,label] of [[pad,'入力試験。ここに線を引く'],[wave,'入力時刻と筆圧の波形']] as const){
    canvas.width=400;canvas.height=100;canvas.setAttribute('aria-label',label);
    canvas.style.cssText='display:block;width:100%;height:auto;touch-action:none;border:1px solid currentColor';
  }
  const metric=document.createElement('p'),status=document.createElement('output');
  status.setAttribute('role','status');
  const initial=readPressureRange();
  const minimum=numberField(fields,'筆圧を拾い始める点（%）',Math.round(initial.minimum*100),0,95);
  const maximum=numberField(fields,'最大の強さとして扱う点（%）',Math.round(initial.maximum*100),5,100);
  const constant=document.createElement('input');constant.type='checkbox';constant.checked=initial.fixed!==null;
  labelledField(fields,'ペンの筆圧を一定値にする',constant);
  const fixed=numberField(fields,'一定時の強さ（%）',Math.round((initial.fixed??.5)*100),0,100);
  fixed.disabled=!constant.checked;
  for(const field of [minimum,maximum,constant,fixed])field.onchange=()=>{
    fixed.disabled=!constant.checked;
    if([minimum,maximum,fixed].some(input=>!input.validity.valid||!input.value)||maximum.valueAsNumber-minimum.valueAsNumber<5){
      status.textContent='最小と最大の差を5%以上にしてください。';return;
    }
    const value={minimum:minimum.valueAsNumber/100,maximum:maximum.valueAsNumber/100,fixed:constant.checked?fixed.valueAsNumber/100:null};
    onRange(value);
    try{localStorage.setItem(key,JSON.stringify(value));status.textContent='新しい筆圧の設定を保存しました。';}
    catch{status.textContent='設定の保存先を利用できません。現在の画面には反映しました。';}
  };
  let pointer:number|null=null,samples:{x:number;y:number;t:number;p?:number}[]=[],groups=0,pointerType='';
  const ranges={pressure:[] as number[],tilt:[] as number[],azimuth:[] as number[],twist:[] as number[]};
  const view=(value:readonly number[],digits:number,suffix:string)=>{
    if(!value.length)return '未取得';
    const low=Math.min(...value),high=Math.max(...value);
    if(high-low<.00001)return low.toFixed(digits)+suffix+'（固定値。センサー対応は未確認）';
    return low.toFixed(digits)+'〜'+high.toFixed(digits)+suffix;
  };
  function collect(event:PointerEvent){
    const rect=pad.getBoundingClientRect();
    const coalesced=event.getCoalescedEvents?.()??[];
    if(coalesced.length>1)groups++;
    for(const entry of coalesced.length?coalesced:[event]){
      const reading=nativeBrushSensors(entry);
      const {pressure,tilt,azimuth,twist}=reading;
      samples.push({x:(entry.clientX-rect.left)*pad.width/rect.width,y:(entry.clientY-rect.top)*pad.height/rect.height,t:entry.timeStamp,
        ...(pressure===undefined?{}:{p:pressure})});
      for(const [name,value] of [['pressure',pressure],['tilt',tilt],['azimuth',azimuth],['twist',twist]] as const)
        if(value!==undefined)ranges[name].push(value*(name==='tilt'?90:name==='pressure'?100:180/Math.PI));
    }
    if(samples.length>512){samples=samples.slice(-512);for(const key of Object.keys(ranges) as (keyof typeof ranges)[])ranges[key]=ranges[key].slice(-512);}
    schedule();
  }
  let animation=0;
  function schedule(){
    if(animation)return;
    animation=requestAnimationFrame(()=>{
      animation=0;const first=samples[0],last=samples.at(-1);
      const context=pad.getContext('2d'),graph=wave.getContext('2d');
      if(!first||!last||!context||!graph)return;
      context.clearRect(0,0,pad.width,pad.height);graph.clearRect(0,0,wave.width,wave.height);
      context.strokeStyle=graph.strokeStyle='#297bcb';context.lineWidth=2;graph.lineWidth=2;
      context.beginPath();graph.beginPath();
      let open=false;
      for(const [index,point] of samples.entries()){
        if(index)context.lineTo(point.x,point.y);else context.moveTo(point.x,point.y);
        if(point.p===undefined)continue;
        const x=(point.t-first.t)/Math.max(1,last.t-first.t)*(wave.width-1),y=(1-point.p)*(wave.height-4)+2;
        if(open)graph.lineTo(x,y);else graph.moveTo(x,y);
        open=true;
      }
      context.stroke();graph.stroke();
      metric.textContent='入力 '+(pointerType==='pen'?'ペン':pointerType==='touch'?'指':'マウス')+' ／ '+samples.length+
        '点 ／ まとめて届いた入力 '+groups+'回 ／ '+Math.round(last.t-first.t)+'ms';
      status.textContent='筆圧 '+view(ranges.pressure,0,'%')+' ／ 傾き '+view(ranges.tilt,0,'°')+
        ' ／ 方位 '+view(ranges.azimuth,0,'°')+' ／ 軸回転 '+view(ranges.twist,0,'°');
    });
  }
  pad.onpointerdown=event=>{
    if(pointer!==null||event.button!==0)return;
    event.preventDefault();pointer=event.pointerId;pointerType=event.pointerType;samples=[];groups=0;
    for(const data of Object.values(ranges))data.length=0;
    pad.setPointerCapture(pointer);collect(event);
  };
  pad.onpointermove=event=>{if(event.pointerId===pointer)collect(event);};
  pad.onlostpointercapture=()=>{pointer=null;};
  const note=document.createElement('small');note.textContent='上の枠に弱くから強く一筆描き、ペンを傾けて確認できます。下の図は筆圧の推移です。';
  details.append(summary,note,pad,wave,metric,status,fields);host.append(details);
}
