import {toolConfirmation} from '../ui/toolConfirmation';
import {parseCube,readDisplacementImage} from './imageEffectResources';
import type {PixelLayerMask} from '@illustro/core';
import {samplePixelMask} from '@illustro/brush-rt';
import {installToneCurvePanel} from './toneCurvePanel';
import {button,labelledField,numberField,selectField} from '../artwork/tools';
import {newEffect,neighborhoodEffects,rasterEffects,toneEffects,type EffectBlend,type EffectStep,type RasterEffect} from './rasterSettings';
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

function showPreview(canvas:HTMLCanvasElement,source:Uint8Array|Uint8ClampedArray,width:number,height:number,
  options?:{base:Uint8Array;difference:boolean;highlight?:boolean;outerMask:Uint8Array|null;stepMask:PixelLayerMask|undefined;strength:number}){
  const ratio=Math.min(1,300/Math.max(width,height));
  canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
  const preview=new ImageData(canvas.width,canvas.height);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const sx=Math.floor((x+.5)*width/canvas.width),sy=Math.floor((y+.5)*height/canvas.height);
    const index=(sy*width+sx)*4,out=(y*canvas.width+x)*4;
    if(options?.highlight){
      for(let channel=0;channel<4;channel++)preview.data[out+channel]=options.base[index+channel]!;
    }else if(options){
      let value:number;
      if(options.difference){
        const {base}=options,oldAlpha=base[index+3]!,newAlpha=source[index+3]!;
        value=Math.abs(oldAlpha-newAlpha);
        for(let c=0;c<3;c++)value=Math.max(value,Math.abs(base[index+c]!*oldAlpha-source[index+c]!*newAlpha)/255);
        value=Math.min(255,value*3);
      }else{
        const {outerMask,stepMask}=options;
        const stepCoverage=stepMask?.enabled?samplePixelMask(stepMask,sx+.5,sy+.5):255;
        value=stepCoverage*(outerMask?.[index/4]??255)*options.strength/25500;
      }
      preview.data.set([value,value,value,255],out);
    }else for(let channel=0;channel<4;channel++)preview.data[out+channel]=source[index+channel]!;
  }
  // Aggregate all changed source pixels into the reduced preview. Nearest
  // neighbor sampling alone can miss a 4px speck on a large artwork.
  if(options?.highlight)for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,a=options.base[i+3]!,b=source[i+3]!;
    if(a===b&&options.base[i]!*a===source[i]!*b&&
      options.base[i+1]!*a===source[i+1]!*b&&options.base[i+2]!*a===source[i+2]!*b)continue;
    const px=Math.min(canvas.width-1,Math.floor((x+.5)*canvas.width/width));
    const py=Math.min(canvas.height-1,Math.floor((y+.5)*canvas.height/height));
    preview.data.set([255,45,140,255],(py*canvas.width+px)*4);
  }
  const context=canvas.getContext('2d');
  if(!context)throw Error('比較画像を表示できません。');
  context.putImageData(preview,0,0);
}

export function installRasterEffects(host:HTMLElement,api:{
  capture:(edit:boolean,explicitMasks?:boolean)=>Promise<EffectCapture>;selectionMask:()=>PixelLayerMask|null;bake:(copy:boolean,composite?:boolean)=>Promise<boolean>;
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
  const display=selectField(comparison,'比較に表示',[['result','適用後'],['highlight','変更予定（ピンク）'],['difference','変更された画素'],['scope','選択中の効果の作用範囲']]);
  const afterCaption=after.parentElement!.querySelector('figcaption')!;
  const choose=document.createElement('select');
  for(const [label,effects] of [['ぼかし・画質',neighborhoodEffects],['色・特殊効果',toneEffects]] as const){
    const group=document.createElement('optgroup');group.label=label;
    for(const [kind,effect] of Object.entries(effects))group.append(new Option(effect.label,kind));
    choose.append(group);
  }
  labelledField(controls,'追加する効果',choose);
  let steps:EffectStep[]=[newEffect('gaussian')],selected=0,session:EffectCapture|null=null;
  let running:AbortController|null=null,result:Result|null=null,applying=false;
  let curve:ReturnType<typeof installToneCurvePanel>|null=null,lastCompared:EffectCapture|null=null,dragFrom:number|null=null;
  let samplePointer:{id:number;y:number}|null=null;

  function drawComparison(){
    if(!result)return;
    const {capture,pixels}=result;
    const {source,width,height}=capture;
    const mode=display.value,label=display.selectedOptions[0]?.label??'適用後',step=steps[selected];
    afterCaption.textContent=label+(mode==='difference'?'（明るいほど変化が大きい）':mode==='scope'?'（白いほど強く適用）':'');
    after.setAttribute('aria-label',label);
    showPreview(after,pixels,width,height,mode==='result'?undefined:{
      base:source,difference:mode==='difference',highlight:mode==='highlight',outerMask:capture.mask,stepMask:step?.mask,strength:step?.enabled?step.strength:0
    });
  }
  display.onchange=drawComparison;
  function clearResult(){
    result=null;lastCompared=null;comparison.hidden=true;after.hidden=false;samplePointer=null;
    before.width=after.width=1;
  }
  function invalidate(){
    running?.abort();clearResult();
  }
  function moveStep(from:number,to:number){
    if(from===to||!steps[from]||!steps[to])return;
    const [step]=steps.splice(from,1);steps.splice(to,0,step!);
    selected=to;invalidate();refresh();
  }
  function refresh(){
    curve=null;
    recipe.replaceChildren(...steps.map((step,index)=>{
      const li=document.createElement('li');
      li.draggable=true;
      li.ondragstart=event=>{dragFrom=index;event.dataTransfer?.setData('text/plain',String(index));};
      li.ondragover=event=>{if(dragFrom!==null)event.preventDefault();};
      li.ondragend=()=>{dragFrom=null;};
      li.ondrop=event=>{
        if(dragFrom===null)return;
        event.preventDefault();const from=dragFrom;dragFrom=null;moveStep(from,index);
      };
      const select=button(rasterEffects[step.kind].label,()=>{selected=index;refresh();drawComparison();},status);
      select.setAttribute('aria-pressed',String(index===selected));
      const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=step.enabled;enabled.ariaLabel=rasterEffects[step.kind].label+'を有効にする';
      enabled.onchange=()=>{steps[index]={...steps[index]!,enabled:enabled.checked};invalidate();};
      const move=(offset:number)=>moveStep(index,index+offset);
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
    if(step.kind==='curves'){
      const index=selected;
      curve=installToneCurvePanel(parameters,step,edited=>{
        const current=steps[index];
        if(!current||current.kind!=='curves')return;
        steps[index]={...current,values:edited.values,curve:edited.curve!};running?.abort();result=null;
        if(lastCompared){after.hidden=true;status.textContent='カーブを調整しました。前後を比較して更新できます。';}
      },status);
    }else definition.parameters.forEach((param,index)=>{
      const write=(value:number)=>{
        const current=steps[selected]!;
        const values=[...current.values];values[index]=value;
        steps[selected]={...current,values};invalidate();
      };
      if(param.max===0xffffff){
        const field=document.createElement('input');field.type='color';
        field.value='#'+step.values[index]!.toString(16).padStart(6,'0');
        labelledField(parameters,param.label,field);field.oninput=()=>write(Number.parseInt(field.value.slice(1),16));
      }else if(param.min===0&&param.max===1&&param.step===1){
        const control=document.createElement('input');control.type='checkbox';control.checked=!!step.values[index];
        labelledField(parameters,param.label,control);control.onchange=()=>write(Number(control.checked));
      }else{
        const field=numberField(parameters,param.label,step.values[index]!,param.min,param.max,param.step);
        field.oninput=()=>{invalidate();if(field.validity.valid&&Number.isFinite(field.valueAsNumber))write(field.valueAsNumber);};
      }
    });
    if(step.kind==='lut'||step.kind==='displace'||step.kind==='lens'){
      const input=document.createElement('input');input.type='file';
      const lut=step.kind==='lut',index=selected;
      input.accept=lut?'.cube':'image/png,image/jpeg,image/webp';
      labelledField(parameters,lut?'LUTファイル（.cube、出力色は8ビット）':step.kind==='lens'?'深度画像（任意。グレー画像の赤成分を使う）':'変位画像（赤: 横、緑: 縦）',input);
      const fileStatus=document.createElement('span');fileStatus.textContent=step.resource?.name??(step.kind==='lens'?'未指定時は画面の高さで焦点を決めます。':'参照ファイルを選んでください。');
      parameters.append(fileStatus);
      if(step.kind==='lens'&&step.resource)parameters.append(button('深度画像を外す',()=>{
        const {resource,...settings}=steps[index]!;
        steps[index]=settings;invalidate();refresh();
      },status));
      input.onchange=async()=>{
        const file=input.files?.[0],original=steps[index];
        if(!file||!original||original.kind!==step.kind)return;
        try{
          if(lut&&file.size>4_194_304)throw Error('LUTファイルは4MBまでです。');
          const resource=lut?parseCube(await file.text(),file.name):await readDisplacementImage(file);
          if(steps[index]!==original)return;
          steps[index]={...original,resource};invalidate();refresh();status.textContent='参照データを読み込みました。';
        }catch(error){status.textContent=error instanceof Error?error.message:String(error);}
      };
    }
    const blend=selectField(parameters,'効果の合成',[
      ['normal','通常'],['multiply','乗算'],['screen','スクリーン'],['difference','差の絶対値'],
    ]);
    blend.value=step.blend??'normal';
    blend.onchange=()=>{steps[selected]={...steps[selected]!,blend:blend.value as EffectBlend};invalidate();};
    const maskInfo=document.createElement('span');
    maskInfo.textContent=step.mask?'この効果に範囲マスクを保存しています。':'この効果に個別の範囲マスクはありません。';
    const setMask=button('現在の選択範囲をこの効果に固定',()=>{
      const mask=api.selectionMask();
      if(!mask)throw Error('先に選択範囲を作ってください。');
      steps[selected]={...steps[selected]!,mask};invalidate();refresh();
    },status);
    const removeMask=button('この効果のマスクを外す',()=>{
      const {mask,...plain}=steps[selected]!;steps[selected]=plain;invalidate();refresh();
    },status);
    removeMask.disabled=!step.mask;
    parameters.append(maskInfo,setMask,removeMask);
    const strength=numberField(parameters,'効果の強さ（%）',step.strength,0,100,1);
    strength.oninput=()=>{
      invalidate();
      if(strength.validity.valid&&Number.isFinite(strength.valueAsNumber))steps[selected]={...steps[selected]!,strength:strength.valueAsNumber};
    };
  }
  async function calculate(){
    if(running)return null;
    if(!steps.some(step=>step.enabled&&step.strength>0))throw Error('少なくとも1つの効果を有効にしてください。');
    if(steps.some(step=>step.enabled&&step.strength>0&&(step.kind==='lut'||step.kind==='displace')&&!step.resource))
      throw Error('LUTや変位の参照ファイルを選んでください。');
    if(parameters.querySelector('input:invalid')||[...parameters.querySelectorAll<HTMLInputElement>('input[type=number]')].some(field=>!field.value))
      throw Error('効果の設定値を確認してください。');
    if(result?.capture.valid())return result;
    const abort=new AbortController();running=abort;cancel.disabled=false;
    const snapshot=[...steps];
    try{
      status.textContent='レイヤーの画素を取得しています。';
      const capture=session??await api.capture(false,snapshot.some(step=>step.mask));
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
    const {capture}=ready;
    showPreview(before,capture.source,capture.width,capture.height);
    const enabled=steps.filter(step=>step.enabled);
    if(enabled.length===1&&enabled[0]?.kind==='median'&&enabled[0].values[2])display.value='highlight';
    drawComparison();
    lastCompared=capture;after.hidden=false;comparison.hidden=false;
    status.textContent=capture.name+'の比較。選択範囲がある場合はその内側を編集します。';
  },status);
  before.style.touchAction='none';
  function sampleImage(event:PointerEvent){
    if(!curve||!lastCompared)return;
    const bounds=before.getBoundingClientRect();
    const x=Math.min(before.width-1,Math.max(0,Math.floor((event.clientX-bounds.left)*before.width/bounds.width)));
    const y=Math.min(before.height-1,Math.max(0,Math.floor((event.clientY-bounds.top)*before.height/bounds.height)));
    const value=before.getContext('2d')?.getImageData(x,y,1,1).data;
    if(value)curve.inspect(value);
  }
  before.onpointerdown=event=>{
    if(!curve||!lastCompared||event.button!==0)return;
    sampleImage(event);samplePointer={id:event.pointerId,y:event.clientY};before.setPointerCapture(event.pointerId);
    curve.drag(event,null);
  };
  before.onpointermove=event=>{
    if(samplePointer?.id===event.pointerId)curve?.drag(event,event.clientY-samplePointer.y);
    else sampleImage(event);
  };
  before.onlostpointercapture=()=>{samplePointer=null;curve?.release();};
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
    if(!await api.bake(false))return;
    session=null;invalidate();status.textContent='現在の見た目を画素として固定しました。';
  },status);
  const bakeCopy=button('元を残して固定コピーを作る',async()=>{
    if(applying||running||!await api.bake(true))return;
    session=null;invalidate();status.textContent='元の効果を保ち、同じ画素の非表示コピーを作りました。';
  },status);
  const bakeComposite=button('マスク・合成を含めて外観を固定',async()=>{
    if(applying||running||!await api.bake(true,true))return;
    session=null;invalidate();status.textContent='作品全体の外観を固定したコピーを作りました。';
  },status);
  controls.append(add,fresh,edit);
  const actions=document.createElement('div');actions.className='box-actions';
  actions.append(compare,toolConfirmation(apply,'apply'),toolConfirmation(cancel,'cancel'),bakeCopy,bake,bakeComposite);
  panel.append(title,controls,recipe,parameters,actions,status,comparison);
  panel.addEventListener('toggle',()=>{if(!panel.open){session=null;invalidate();}});
  host.append(panel);refresh();
  return {open:()=>{panel.open=true;}};
}
