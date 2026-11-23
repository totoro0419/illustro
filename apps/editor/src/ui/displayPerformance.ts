const key='illustro.low-load-display.v1';
export const lowLoadDisplay=()=>{
  try{return localStorage.getItem(key)==='on';}catch{return false;}
};
export function setLowLoadDisplay(enabled:boolean){
  localStorage.setItem(key,enabled?'on':'off');
  window.dispatchEvent(new Event('illustro:display-performance'));
}
