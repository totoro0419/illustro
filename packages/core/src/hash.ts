export function pageIndex(key:string,pages=64):number{
  let hash=0;
  for(let i=0;i<key.length;i++) hash=(hash*33+key.charCodeAt(i))%2147483647;
  return hash%pages;
}
