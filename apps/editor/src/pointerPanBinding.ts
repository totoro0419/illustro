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
