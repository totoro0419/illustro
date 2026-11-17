import type {AssetInfo} from './library';
export type MaterialUseRoute='image-layer'|'editable-artwork'|'macro'|'workspace';
/** Never dispatch arbitrary JSON or image bytes to a handler that expects a
 * different type. Every returned route has a real editor action.
 */
export function materialUseRoute(item:Pick<AssetInfo,'kind'|'mime'>):MaterialUseRoute|null{
  if(item.kind==='macro'&&/^(application\/json|text\/plain)$/.test(item.mime))return 'macro';
  if(item.kind==='workspace'&&/^(application\/json|text\/plain)$/.test(item.mime))return 'workspace';
  if((item.kind==='shape'||item.kind==='gradient')&&
    /^(application\/json|text\/plain)$/.test(item.mime))return 'editable-artwork';
  if(['tip','paper','texture','pattern','gradient','shape','reference'].includes(item.kind)&&
    /^image\/(png|jpeg|webp|avif|gif)$/.test(item.mime))return 'image-layer';
  return null;
}
export function materialUseLabel(route:MaterialUseRoute):string{
  switch(route){
    case 'image-layer':return '画像レイヤーとして配置';
    case 'editable-artwork':return '図形・グラデーションとして適用';
    case 'macro':return '操作セットとして読み込む';
    case 'workspace':return '作業場の設定として読み込む';
  }
}
