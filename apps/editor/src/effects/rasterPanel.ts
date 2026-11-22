import {button,labelledField,numberField} from '../artwork/tools';
import {newEffect,neighborhoodEffects,rasterEffects,type EffectStep,type RasterEffect} from './rasterSettings';
import type {RasterEffectRequest} from './raster.worker';
import './rasterPanel.css';

type EffectCapture=Readonly<{
  source:Uint8Array;width:number;height:number;mask:Uint8Array|null;
  alphaLocked:boolean;name:string;steps:readonly EffectStep[];valid:()=>boolean;
  apply:(pixels:Uint8ClampedArray,steps:readonly EffectStep[])=>Promise<void>;
}>;
type Result=Readonly<{capture:EffectCapture;pixels:Uint8ClampedArray}>;

function runEffect(request:RasterEffectRequest,signal:AbortSignal):Promise<Uint8ClampedArray>{
  signal.throwIfAborted();
  const worker=new Worker(new URL('./raster.worker.ts',import.meta.url),{type:'module'});
  return new Promise((resolve,reject)=>{
    function finish(){
      worker.terminate();signal.removeEventListener('abort',aborted);
    }
    function aborted(){finish();reject(signal.reason);}
    signal.addEventListener('abort',aborted,{once:true});
    worker.onmessage=(event:MessageEvent<{pixels?:Uint8ClampedArray;error?:string}>)=>{
      finish();
      if(event.data.pixels)resolve(event.data.pixels);
      else reject(Error(event.data.error??'効果を計算できませんでした。'));
    };
    worker.onerror=()=>{finish();reject(Error('効果を計算できませんでした。'));};
    worker.onmessageerror=()=>{finish();reject(Error('効果の結果を受け取れませんでした。'));};
    try{worker.postMessage(request);}catch(error){finish();reject(error);}
  });
}

function showPreview(canvas:HTMLCanvasElement,source:Uint8Array|Uint8ClampedArray,width:number,height:number){
  const ratio=Math.min(1,300/Math.max(width,height));
  canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
  const preview=new ImageData(canvas.width,canvas.height);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const sx=Math.floor((x+.5)*width/canvas.width),sy=Math.floor((y+.5)*height/canvas.height);
    const index=(sy*width+sx)*4,out=(y*canvas.width+x)*4;
    for(let channel=0;channel<4;channel++)preview.data[out+channel]=source[index+channel]!;
  }
  const context=canvas.getContext('2d');
  if(!context)throw Error('比較画像を表示できません。');
  context.putImageData(preview,0,0);
}

export function installRasterEffects(host:HTMLElement,api:{
  capture:(edit:boolean)=>Promise<EffectCapture>;bake:()=>Promise<void>;
}){
  const panel=document.createElement('details');
  panel.className='c06-clipboard-panel raster-effects';
  const title=document.createElement('summary');title.textContent='レイヤーのフィルター';
  const controls=document.createElement('div');controls.className='c06-clipboard-grid';
  const recipe=document.createElement('ol');recipe.className='raster-effect-recipe';
  const parameters=document.createElement('div');parameters.className='c06-clipboard-grid';
  const status=document.createElement('output');status.setAttribute('role','status');
  const comparison=document.createElement('div');comparison.className='raster-effect-comparison';comparison.hidden=true;
  const before=document.createElement('canvas'),after=document.createElement('canvas');
  for(const [label,canvas] of [['適用前',before],['適用後',after]] as const){
    const figure=document.createElement('figure'),caption=document.createElement('figcaption');
    caption.textContent=label;canvas.setAttribute('aria-label',label);figure.append(caption,canvas);comparison.append(figure);
  }
  const choose=document.createElement('select');
  for(const [kind,effect] of Object.entries(neighborhoodEffects))choose.add(new Option(effect.label,kind));
  labelledField(controls,'追加する効果',choose);
  let steps:EffectStep[]=[newEffect('gaussian')],selected=0,session:EffectCapture|null=null;
  let running:AbortController|null=null,result:Result|null=null,applying=false;

  function clearResult(){
    result=null;comparison.hidden=true;
    before.width=after.width=1;
  }
  function invalidate(){
    running?.abort();clearResult();
  }
  function refresh(){
    recipe.replaceChildren(...steps.map((step,index)=>{
      const li=document.createElement('li');
      const select=button(rasterEffects[step.kind].label,()=>{selected=index;refresh();},status);
      select.setAttribute('aria-pressed',String(index===selected));
      const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=step.enabled;enabled.ariaLabel=rasterEffects[step.kind].label+'を有効にする';
      enabled.onchange=()=>{steps[index]={...steps[index]!,enabled:enabled.checked};invalidate();};
      const move=(offset:number)=>{
        [steps[index],steps[index+offset]]=[steps[index+offset]!,steps[index]!];
        selected=index+offset;invalidate();refresh();
      };
      const up=button('↑',()=>move(-1),status),down=button('↓',()=>move(1),status);
      up.disabled=index===0;down.disabled=index===steps.length-1;
      up.ariaLabel='効果を前へ';down.ariaLabel='効果を後ろへ';
      const remove=button('削除',()=>{steps.splice(index,1);selected=Math.max(0,Math.min(selected,steps.length-1));invalidate();refresh();},status);
      li.append(enabled,select,up,down,remove);return li;
    }));
    parameters.replaceChildren();
    const step=steps[selected];
    if(!step)return;
    const definition=rasterEffects[step.kind];
    definition.parameters.forEach((param,index)=>{
      const write=(value:number)=>{
        const current=steps[selected]!;
        const values=[...current.values];values[index]=value;
        steps[selected]={...current,values};invalidate();
      };
      if(param.min===0&&param.max===1&&param.step===1){
        const control=document.createElement('input');control.type='checkbox';control.checked=!!step.values[index];
        labelledField(parameters,param.label,control);control.onchange=()=>write(Number(control.checked));
      }else{
        const field=numberField(parameters,param.label,step.values[index]!,param.min,param.max,param.step);
        field.oninput=()=>{invalidate();if(field.validity.valid&&Number.isFinite(field.valueAsNumber))write(field.valueAsNumber);};
      }
    });
    const strength=numberField(parameters,'効果の強さ（%）',step.strength,0,100,1);
    strength.oninput=()=>{
      invalidate();
      if(strength.validity.valid&&Number.isFinite(strength.valueAsNumber))steps[selected]={...steps[selected]!,strength:strength.valueAsNumber};
    };
  }
  async function calculate(){
    if(running)return null;
    if(!steps.some(step=>step.enabled&&step.strength>0))throw Error('少なくとも1つの効果を有効にしてください。');
    if(parameters.querySelector('input:invalid')||[...parameters.querySelectorAll<HTMLInputElement>('input[type=number]')].some(field=>!field.value))
      throw Error('効果の設定値を確認してください。');
    if(result?.capture.valid())return result;
    const abort=new AbortController();running=abort;cancel.disabled=false;
    const snapshot=[...steps];
    try{
      status.textContent='レイヤーの画素を取得しています。';
      const capture=session??await api.capture(false);
      abort.signal.throwIfAborted();
      if(!capture.valid())throw Error('対象が変わりました。「新しい効果」から開き直してください。');
      status.textContent='効果を計算しています。';
      const {source,width,height,mask,alphaLocked}=capture;
      const pixels=await runEffect({source,width,height,mask,alphaLocked,steps:snapshot},abort.signal);
      if(!capture.valid())throw Error('計算中に対象が変わりました。');
      return result={capture,pixels};
    }catch(error){if(!abort.signal.aborted)throw error;return null;}
    finally{running=null;cancel.disabled=true;}
  }
  const add=button('効果を追加',()=>{
    if(steps.length>=8)throw Error('効果は8個まで組み合わせられます。');
    steps.push(newEffect(choose.value as RasterEffect));selected=steps.length-1;invalidate();refresh();
  },status);
  const fresh=button('新しい効果',()=>{
    if(applying)return;
    session=null;steps=[newEffect(choose.value as RasterEffect)];selected=0;invalidate();refresh();
    status.textContent='選んでいるレイヤーに効果を追加します。';
  },status);
  const edit=button('保存した設定を開く',async()=>{
    if(applying||running)return;
    const capture=await api.capture(true);
    session=capture;steps=[...capture.steps];selected=0;invalidate();refresh();
    status.textContent=capture.name+'の効果設定を開きました。';
  },status);
  const compare=button('前後を比較',async()=>{
    if(applying)return;
    const ready=await calculate();if(!ready)return;
    const {capture,pixels}=ready;
    showPreview(before,capture.source,capture.width,capture.height);
    showPreview(after,pixels,capture.width,capture.height);
    comparison.hidden=false;
    status.textContent=capture.name+'の比較。選択範囲がある場合はその内側を編集します。';
  },status);
  const cancel=button('計算を中止',()=>{invalidate();status.textContent='計算を中止しました。';},status);
  cancel.disabled=true;
  const apply=button('レイヤーに適用',async()=>{
    if(applying||running)return;
    applying=true;
    try{
      const ready=await calculate();if(!ready)return;
      await ready.capture.apply(ready.pixels,[...steps]);
      session=null;invalidate();
      status.textContent='レイヤーに反映しました。取り消しや設定の再編集ができます。';
    }finally{applying=false;}
  },status);
  const bake=button('効果を画素に固定',async()=>{
    if(applying||running)return;
    await api.bake();session=null;invalidate();
    status.textContent='現在の見た目を画素として固定しました。';
  },status);
  controls.append(add,fresh,edit);
  const actions=document.createElement('div');actions.className='box-actions';
  actions.append(compare,apply,cancel,bake);
  panel.append(title,controls,recipe,parameters,actions,status,comparison);
  panel.addEventListener('toggle',()=>{if(!panel.open){session=null;invalidate();}});
  host.append(panel);refresh();
  return {open:()=>{panel.open=true;}};
}
