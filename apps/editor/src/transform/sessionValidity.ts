import type {CoreDocument,LayerId} from '@illustro/core';

type Stamp=Readonly<{
  drawing:object;artwork:CoreDocument;
  layer:ReturnType<CoreDocument['root']['getLayer']>;
  width:number;height:number;selection:object|null;target:'layer'|'selected'|'boundary';
}>;
type Current=Readonly<{drawing:object|null;artwork:CoreDocument;selectedLayerId:LayerId;selection:object|null}>;
export function transformTargetIsCurrent(stamp:Stamp,current:Current){
  if(stamp.drawing!==current.drawing||stamp.artwork!==current.artwork)return false;
  const root=current.artwork.root,id=stamp.layer.id;
  return root.width===stamp.width&&root.height===stamp.height&&current.selectedLayerId===id&&
    root.hasLayer(id)&&root.getLayer(id)===stamp.layer&&
    (stamp.target==='layer'||current.selection===stamp.selection)&&
    (stamp.target==='boundary'||!root.isLayerContentLocked(id)&&!root.isLayerPositionLocked(id));
}
