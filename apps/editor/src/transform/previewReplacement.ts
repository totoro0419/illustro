import type {DocumentRoot,LayerId} from '@illustro/core';

/** Only the unmasked, normally blended topmost raster layer can be replaced
 * by a DOM overlay without changing its z-order, clipping or group effects.
 * More complex compositions retain the explicit approximate preview. */
export function canReplaceTopmostTransformLayer(
  root:DocumentRoot,layerId:LayerId,target:'layer'|'selected'|'boundary'
):boolean{
  if(target==='boundary'||root.rootLayerIds.at(-1)!==layerId||!root.isLayerVisible(layerId))
    return false;
  const layer=root.getLayer(layerId),blend=layer.blend;
  if(layer.opacity!==1||layer.baseColor==='white'||layer.vectorMask?.enabled||
    layer.imageLink||root.groupsForLayer(layerId).length||root.clippingSource(layerId))
    return false;
  if(blend&&(blend.mode!=='normal'||blend.space!=='encoded'||!!blend.tone||
    !!blend.effect?.enabled||!!blend.gradientMap))
    return false;
  return true;
}

/** Restore the saved visibility automatically when a transform preview closes. */
export function originalVisibleWithTransformPreview(
  visible:boolean,layerId:LayerId,replacementLayerId:LayerId|null
):boolean{
  return visible&&layerId!==replacementLayerId;
}
