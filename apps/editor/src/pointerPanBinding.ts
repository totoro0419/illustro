export type PointerPanBinding=Readonly<{device:'pen'|'mouse';button:number;mask:number}>;
const masks=[1,4,2,8,16,32] as const;
const key='illustro.pointer-hold-pan.v1';

function supported(device:unknown,button:unknown):PointerPanBinding|null{
  if((device!=='pen'&&device!=='mouse')||typeof button!=='number'||!Number.isInteger(button)||
    (device==='pen'&&button!==2)||(device==='mouse'&&(button<1||button>4)))return null;
  return {device,button,mask:masks[button]!};
}

export function capturePointerPanBinding(event:Pick<PointerEvent,'pointerType'|'button'|'buttons'>){
  const binding=supported(event.pointerType,event.button);
  return binding&&((event.buttons&binding.mask)!==0)?binding:null;
}

export function readPointerPanBinding():PointerPanBinding|null{
  try{
    const value=JSON.parse(localStorage.getItem(key)??'null');
    return supported(value?.device,value?.button);
  }catch{return null;}
}
export function storePointerPanBinding(binding:PointerPanBinding|null){
  if(binding)localStorage.setItem(key,JSON.stringify({device:binding.device,button:binding.button}));
  else localStorage.removeItem(key);
}

export const buttonActions=[
  ['hold-pan','押している間だけ表示を移動'],
  ['toggle-pan','表示移動を切り替え'],
  ['toggle-eraser','消しゴムを切り替え'],
  ['sample','一度だけ色を取る'],
  ['undo','一度だけ元に戻す'],
  ['redo','一度だけやり直す'],
  ['fit','全体を表示'],
] as const;
export type PointerButtonAction=typeof buttonActions[number][0];
export type PointerButtonScope='any'|'drawing'|'tool';
export type PointerButtonBinding=PointerPanBinding&Readonly<{action:PointerButtonAction;scope:PointerButtonScope}>;
const bindingsKey='illustro.pointer-buttons.v1';

function bindingDevice(device:unknown,button:unknown):PointerPanBinding|null{
  if(device==='pen'&&button===5)return {device,button,mask:32};
  return supported(device,button);
}
export function capturePointerButton(event:Pick<PointerEvent,'pointerType'|'button'|'buttons'>){
  const binding=bindingDevice(event.pointerType,event.button);
  return binding&&(event.buttons&binding.mask)!==0?binding:null;
}
export function readPointerButtons():PointerButtonBinding[]{
  try{
    const source:unknown=JSON.parse(localStorage.getItem(bindingsKey)??'null');
    if(Array.isArray(source))return source.slice(0,18).flatMap(value=>{
      if(!value||!buttonActions.some(([id])=>id===value.action)||!['any','drawing','tool'].includes(value.scope))return [];
      const button=bindingDevice(value.device,value.button);
      return button?[{...button,action:value.action,scope:value.scope}]:[];
    });
  }catch{}
  const old=readPointerPanBinding();
  return old?[{...old,action:'hold-pan',scope:'any'}]:[];
}
export function storePointerButtons(bindings:readonly PointerButtonBinding[]){
  localStorage.setItem(bindingsKey,JSON.stringify(bindings));
}
export function matchPointerButton(
  bindings:readonly PointerButtonBinding[],
  event:Pick<PointerEvent,'pointerType'|'button'|'buttons'>,
  scene:Exclude<PointerButtonScope,'any'>,allowHeld=false
){
  const matches=(value:PointerButtonBinding)=>value.device===event.pointerType&&(event.buttons&value.mask)!==0&&
    (event.button===value.button||allowHeld&&value.action==='hold-pan');
  return bindings.find(value=>value.scope===scene&&matches(value))??bindings.find(value=>value.scope==='any'&&matches(value));
}
