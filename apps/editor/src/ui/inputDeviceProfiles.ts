import {buttonActions,capturePointerButton,readPointerButtons,storePointerButtons,type PointerButtonBinding,type PointerPanBinding,type PointerButtonAction,type PointerButtonScope} from '../pointerPanBinding';
/** GST-003: device roles are applied at pointer dispatch, never to document pixels. */
import {installInputDiagnostics,type PressureRange} from './inputDiagnostics';
import type {BrushSurface,PointerRoleSettings,InputPointerRole} from '../brushSurface';
const KEY='illustro.c04.input.pointer-roles.v1';
const DEFAULT:PointerRoleSettings={pen:'draw',mouse:'draw'};
export function readPointerRoles():PointerRoleSettings{
  try{
    const value=JSON.parse(localStorage.getItem(KEY)||'null') as Record<string,unknown>|null;
    if(value?.version===1&&['draw','pan','sample'].includes(value.pen as string)&&['draw','pan','sample'].includes(value.mouse as string))
      return {pen:value.pen as InputPointerRole,mouse:value.mouse as InputPointerRole};
  }catch{/* no available personal settings */}
  return {...DEFAULT};
}
const safeWrite=(roles:PointerRoleSettings)=>{
  try{localStorage.setItem(KEY,JSON.stringify({version:1,...roles}));return true;}catch{return false;}
};
export function installInputDeviceProfiles(getSurface:()=>BrushSurface|null,pressure:(range:PressureRange)=>void){
  const workspace=document.getElementById('workspaceBoxBody');
  if(!workspace)return;
  let roles=readPointerRoles();
  const outer=document.createElement('details');outer.className='c04-device-profile';
  const summary=document.createElement('summary');summary.textContent='指・ペン・マウスの操作設定';
  const body=document.createElement('div');body.className='c04-device-profile-fields';
  const help=document.createElement('p');
  help.textContent='機器ごとに、キャンバスに触れたときの動作を指定します。二本指の表示操作は保ちます。';
  const makeSelect=(title:string,options:readonly [string,string][],value:string)=>{
    const label=document.createElement('label');
    const text=document.createElement('span');text.textContent=title;
    const select=document.createElement('select');select.setAttribute('aria-label',title);
    for(const [key,name] of options)select.add(new Option(name,key));
    select.value=value;label.append(text,select);body.append(label);
    return select;
  };
  const fingerToggle=document.getElementById('finger') as HTMLInputElement|null;
  const finger=makeSelect('指',['navigate','draw'].map(x=>[x,x==='navigate'?'絵を動かす・拡大':'描く']) as [string,string][],fingerToggle?.checked?'draw':'navigate');
  const pen=makeSelect('ペン先',[['draw','描く'],['pan','絵を動かす'],['sample','色を取る']],roles.pen);
  const mouse=makeSelect('マウス左ボタン',[['draw','描く'],['pan','絵を動かす'],['sample','色を取る']],roles.mouse);
  const guard=document.getElementById('palmGuard') as HTMLInputElement|null;
  const barrel=document.getElementById('penBarrelErase') as HTMLInputElement|null;
  const palmLabel=document.createElement('label'),palm=document.createElement('input');
  palm.type='checkbox';palm.checked=guard?.checked??true;
  palmLabel.append(palm,document.createTextNode(' ペン使用中の大きな手のひら入力を抑える'));
  const barrelLabel=document.createElement('label'),barrelEnabled=document.createElement('input');
  barrelEnabled.type='checkbox';barrelEnabled.checked=barrel?.checked??false;
  barrelLabel.append(barrelEnabled,document.createTextNode(' ペンの消去ボタンで消す（対応端末のみ）'));
  const capture=document.createElement('button');capture.type='button';capture.textContent='接続した機器を確認';
  const reset=document.createElement('button');reset.type='button';reset.textContent='初期設定に戻す';
  const status=document.createElement('output');status.setAttribute('role','status');
  const actions=document.createElement('div');actions.className='c04-workspace-actions';actions.append(capture,reset);
  body.prepend(help);body.append(palmLabel,barrelLabel,actions,status);outer.append(summary,body);workspace.append(outer);
  const forward=(source:HTMLInputElement|null,checked:boolean)=>{if(!source)return;source.checked=checked;source.dispatchEvent(new Event('change',{bubbles:true}));};
  const sync=()=>{
    roles={pen:pen.value as InputPointerRole,mouse:mouse.value as InputPointerRole};
    getSurface()?.setPointerRoles(roles);
    const saved=safeWrite(roles);
    if(!saved)status.textContent='この端末では設定を保存できません。次の起動時には初期設定に戻ります。';
  };
  pen.onchange=mouse.onchange=sync;
  finger.onchange=()=>{
    forward(fingerToggle,finger.value==='draw');
    status.textContent=finger.value==='draw'?'指で描く設定にしました。二本指の移動・拡大は利用できます。':'指で表示を動かす設定にしました。';
  };
  palm.onchange=()=>forward(guard,palm.checked);
  barrelEnabled.onchange=()=>forward(barrel,barrelEnabled.checked);
  // Capture a REAL PointerEvent, not an assumption about the operating system.
  let capturing=false;
  function onCaptured(event:PointerEvent){
    if(!capturing)return;
    if(event.pointerType!=='touch'&&event.pointerType!=='pen'&&event.pointerType!=='mouse')return;
    capturing=false;capture.textContent='接続した機器を確認';
    capture.removeEventListener('pointerdown',onCaptured,true);
    const label=event.pointerType==='touch'?'指':event.pointerType==='pen'?'ペン':'マウス';
    status.textContent=label+'の入力を認識しました。利用可能な操作だけ登録してください。';
    event.stopPropagation();
  }
  const originalListener=(event:PointerEvent)=>{
    if(!capturing){
      capturing=true;capture.textContent='もう一度触れて機器を確認（Escで中止）';
      status.textContent='このボタンを使いたい機器で再度押してください。';
      event.preventDefault();return;
    }
    onCaptured(event);
  };
  capture.addEventListener('pointerdown',originalListener,true);
  const cancelCapture=(event:KeyboardEvent)=>{
    if(!capturing||event.key!=='Escape')return;
    capturing=false;capture.textContent='接続した機器を確認';status.textContent='確認を中止しました。';
  };
  document.addEventListener('keydown',cancelCapture);
  const buttonSetup=document.createElement('button'),buttonStatus=document.createElement('output');
  buttonSetup.type='button';buttonStatus.setAttribute('role','status');
  buttonSetup.textContent='ペン・マウスのボタンを登録';
  const gesture=makeSelect('登録する動作',buttonActions.map(([id,title])=>[id,title]),'hold-pan');
  const scope=makeSelect('使う場面',[['any','キャンバス全般'],['drawing','筆や消しゴムを使用中'],['tool','選択・変形などを使用中']],'any');
  const list=document.createElement('ul');
  let bindings=readPointerButtons(),listening=false,suppressMenuUntil=0;
  const name=(binding:PointerPanBinding)=>binding.device==='mouse'?'マウスのボタン '+binding.button:
    binding.button===5?'ペンの後端':'ペンの横ボタン';
  const apply=(next:PointerButtonBinding[])=>{
    bindings=next;getSurface()?.setPointerButtons(bindings);render();
    try{storePointerButtons(bindings);return true;}
    catch{buttonStatus.textContent='現在の画面には反映しました。端末への保存はできませんでした。';return false;}
  };
  function render(){
    list.replaceChildren(...bindings.map((binding,index)=>{
      const row=document.createElement('li'),remove=document.createElement('button');
      const label=name(binding)+'／'+buttonActions.find(([id])=>id===binding.action)?.[1]+
        '／'+[...scope.options].find(option=>option.value===binding.scope)?.label;
      remove.type='button';remove.textContent='解除';remove.setAttribute('aria-label',label+'の割当を解除');
      remove.onclick=()=>{if(apply(bindings.filter((_,i)=>i!==index)))buttonStatus.textContent='割当を解除しました。';};
      row.append(label,' ',remove);return row;
    }));
  }
  buttonSetup.onclick=()=>{
    listening=true;
    buttonStatus.textContent='この設定欄の上で、登録したい追加ボタンかペンの後端を押してください。Escで中止できます。';
  };
  outer.addEventListener('pointerdown',event=>{
    if(!listening)return;
    const button=capturePointerButton(event);
    if(!button)return;
    event.preventDefault();event.stopPropagation();
    listening=false;suppressMenuUntil=performance.now()+1200;
    const binding={...button,action:gesture.value as PointerButtonAction,scope:scope.value as PointerButtonScope};
    const rest=bindings.filter(value=>value.device!==binding.device||value.button!==binding.button||value.scope!==binding.scope);
    if(apply([...rest,binding]))buttonStatus.textContent=name(button)+'を登録しました。';
  },true);
  outer.addEventListener('contextmenu',event=>{
    if(listening||performance.now()<suppressMenuUntil){suppressMenuUntil=0;event.preventDefault();}
  });
  document.addEventListener('keydown',event=>{
    if(listening&&event.key==='Escape'){listening=false;buttonStatus.textContent='登録を中止しました。';}
  });
  body.append(buttonSetup,list,buttonStatus);render();
  installInputDiagnostics(body,pressure);
  reset.onclick=()=>{
    roles={...DEFAULT};pen.value=roles.pen;mouse.value=roles.mouse;sync();
    finger.value='navigate';finger.onchange?.(new Event('change'));
    palm.checked=true;palm.onchange?.(new Event('change'));
    barrelEnabled.checked=false;barrelEnabled.onchange?.(new Event('change'));apply([]);
    status.textContent='各機器の標準操作に戻しました。';
  };
}
