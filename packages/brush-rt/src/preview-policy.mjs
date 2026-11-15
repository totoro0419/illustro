// Presentation-only policy. Measurements are upload / GPU-completion proxies,
// not physical scanout. Neither route changes the authoritative StrokeRecord.
const LIMIT=48,SAMPLES=24,TTL=120000;
const bucket=n=>Math.round(Math.log2(Math.max(.001,n)));
const p95=a=>{const b=[...a].sort((a,b)=>a-b);return b[Math.ceil(b.length*.95)-1]??null;};
export function previewContext(view,p,backend){
 const f=p.__foundation;
 return [view[4],view[5],bucket(view[6]),bucket(view[0]/view[2]),p.id??p.tip,f?.material?1:0,p.blend,bucket(p.size),p.hardness,p.grainScale,p.grainKind,p.tip,f?.texture?.mode??'',f?.texture?.kind??'',f?.texture?.strength??0,f?.texture?.scale??1,backend.surfaceStack?.length??1].join('|');
}
export class PreviewPolicy{
 constructor({mode='auto',now=()=>performance.now()}={}){if(!['auto','cpu','gpu'].includes(mode))throw Error('Invalid preview mode');this.mode=mode;this.now=now;this.profiles=new Map;this.choices=new Map;this.switches=0;this.serial=0;this.last=null;}
 profile(key){let p=this.profiles.get(key);if(!p||this.now()-p.at>TTL)p={cpu:[],gpu:[],at:this.now(),strokes:0,lastProbe:-8,preferred:'cpu'};this.profiles.delete(key);this.profiles.set(key,p);while(this.profiles.size>LIMIT)this.profiles.delete(this.profiles.keys().next().value);return p;}
 choose(id,key,{cpuAvailable=true,gpuAvailable=true,gpuWaitMs=0,memoryPressure=false,cpuOrderPending=false,newerGpuPending=false}={}){
  const previous=this.choices.get(id);
  if(previous){if(previous.route==='cpu'&&newerGpuPending&&gpuAvailable){previous.route='gpu';this.switches++;previous.reason='後の線との重なり順を守るため、直接表示に移行';}if(previous.route==='cpu'&&!cpuAvailable&&gpuAvailable){previous.route='gpu';this.switches++;previous.reason='レイヤーの状態が変わったため、直接表示に移行';}if(previous.route==='gpu'&&!gpuAvailable&&cpuAvailable){previous.route='cpu';this.switches++;previous.reason='表示処理が使えなくなったため、入力を保持して仮線を表示';}return previous;}
  const p=this.profile(key);p.strokes++;const cpuVisible=p.cpu.filter(x=>!x.unpresented),other=p.preferred==='cpu'?'gpu':'cpu',canProbe=other==='cpu'||gpuWaitMs<40&&gpuWaitMs<=Math.max(2,(p95(cpuVisible.map(x=>x.latency))??20)*.8);let probing=false,route=p.preferred,reason=p.preferred==='gpu'?'直近の仮線表示が間に合わなかったため、直接表示':'比較の記録が少ないため、仮線を表示';
  if(this.mode!=='auto'){route=this.mode;reason='比較用に指定された方式';}
  else if(p.strokes-p.lastProbe>=8&&!memoryPressure&&canProbe&&p[p.preferred].length>=3&&((other==='cpu'?cpuVisible:p.gpu).length<3||this.now()-(p[other].at(-1)?.at??0)>30000)){
   route=p.preferred==='cpu'?'gpu':'cpu';probing=true;reason='別の一筆で、未計測または古くなった表示方法を比較';
  }
  else if(cpuVisible.length>=3&&p.gpu.length>=3){const cpu=p95(cpuVisible.map(x=>x.latency+Math.max(0,x.cpuMs-3))),gpu=p95(p.gpu.map(x=>x.latency+Math.max(0,x.cpuMs-3)));if(route==='cpu'&&gpu+2<cpu*.8)route='gpu';else if(route==='gpu'&&(cpu+2<gpu*.8||gpuWaitMs>Math.max(40,cpu*2)))route='cpu';reason='直近の遅い側の記録と処理時間を比較し、小さな差では変更しない';p.preferred=route;}
  if(this.mode==='auto'&&cpuOrderPending&&cpuAvailable&&route==='gpu'){route='cpu';reason='前の仮線との重なり順を守るため、今回も仮線を表示';}
  if(newerGpuPending&&route==='cpu'&&gpuAvailable){route='gpu';reason='後の線との重なり順を守るため、直接表示';}
  if(memoryPressure&&route==='cpu'&&gpuAvailable){route='gpu';reason='仮線の使用メモリが上限に近いため';}
  if(!cpuAvailable){route='gpu';reason='このレイヤーやブラシは直接表示が必要';}
  if(!gpuAvailable&&cpuAvailable){route='cpu';reason='表示処理が使えないため、入力を保持して仮線を表示';}
  if(probing&&route===other)p.lastProbe=p.strokes;
  if(this.last&&this.last.route!==route)this.switches++;const choice={id,key,route,reason,serial:++this.serial,at:this.now()};this.choices.set(id,choice);while(this.choices.size>256)this.choices.delete(this.choices.keys().next().value);this.last=choice;return choice;
 }
 observe(id,route,{latency,cpuMs=0,queueMs=0,bytes=0,unpresented=false}){const c=this.choices.get(id);if(!c||!Number.isFinite(latency)||latency<0||latency>10000)return;const p=this.profile(c.key),a=p[route];a.push({latency,cpuMs,queueMs,bytes,unpresented,at:this.now()});if(a.length>SAMPLES)a.shift();p.at=this.now();}
 fallbackCpu(id,latency){const c=this.choices.get(id);if(!c||c.route!=='cpu'||this.mode!=='auto')return false;this.observe(id,'cpu',{latency,unpresented:true});const p=this.profile(c.key);p.preferred='gpu';c.route='gpu';c.reason='仮線が表示に間に合わないため、入力を保って直接表示へ移行';this.switches++;return true;}
 forget(id){this.choices.delete(id);}
 summary(){const c=this.last,p=c&&this.profiles.get(c.key);return {mode:this.mode,route:c?.route??null,reason:c?.reason??'まだ描画していない',switches:this.switches,profiles:this.profiles.size,cpuP95Ms:p?p95(p.cpu.filter(x=>!x.unpresented).map(x=>x.latency)):null,cpuWaitLowerBoundP95Ms:p?p95(p.cpu.filter(x=>x.unpresented).map(x=>x.latency)):null,gpuP95Ms:p?p95(p.gpu.map(x=>x.latency)):null,cpuUnpresentedSamples:p?.cpu.filter(x=>x.unpresented).length??0,cpuSamples:p?.cpu.length??0,gpuSamples:p?.gpu.length??0};}
}
