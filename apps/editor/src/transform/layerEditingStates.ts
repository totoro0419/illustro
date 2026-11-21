/** A summary from persisted layer metadata only: no GPU readback,
 * expensive image checks, or automatic change to layer state. */
export type LayerEditingIndicators=Readonly<{
 vectorMask?:Readonly<{enabled?:boolean;linked?:boolean}>|null;
 deformation?:Readonly<{enabled?:boolean}>|null;
 imageLink?:Readonly<{kind:'linked'|'embedded'|'instance'}>|null;
}>;
export function layerEditingStates(layer:LayerEditingIndicators):string[]{
 const labels:string[]=[];
 if(layer.deformation)labels.push(layer.deformation.enabled===false?'変形OFF':'変形を再編集可');
 if(layer.imageLink){
  labels.push(layer.imageLink.kind==='linked'?'外部画像を参照':
   layer.imageLink.kind==='embedded'?'画像を埋め込み':'他のレイヤーの画像を使用');
 }
 if(layer.vectorMask){
  labels.push(layer.vectorMask.enabled===false?'マスクOFF':
   layer.vectorMask.linked===false?'マスク：独立':'マスク：連動');
 }
 return labels;
}

/** Direct navigation targets for the layer page. Only show controls for
 * operations actually present on the selected layer. */
export type LayerEditingTarget=Readonly<{kind:'transform'|'image-link'|'mask';label:string}>;
export function layerEditingTargets(layer:LayerEditingIndicators):LayerEditingTarget[]{
 return [
  ...(layer.deformation?[{kind:'transform' as const,label:'変形'}]:[]),
  ...(layer.imageLink?[{kind:'image-link' as const,label:'画像'}]:[]),
  ...(layer.vectorMask?[{kind:'mask' as const,label:'マスク'}]:[])
 ];
}
