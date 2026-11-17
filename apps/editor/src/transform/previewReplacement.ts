import type {DocumentRoot,LayerId} from '@illustro/core';

/** A DOM overlay sits above the whole GPU compositor. Replacing the source
 * is safe only when no other visible layer needs to be drawn on top of it.
 * Preserve the source layer's opacity; otherwise semi-transparent artwork
 * would become opaque when displayed in the overlay.
 *
 * Complex masks, isolated groups, clipping and nonstandard blends remain
 * on the explicitly approximate path until the shared compositor supports
 * a true in-stack preview. This decision never changes saved document data. */
export function transformPreviewReplacementOpacity(
  root:DocumentRoot,layerId:LayerId,target:'layer'|'selected'|'boundary'
):number|null{
  if(target==='boundary'||!root.rootLayerIds.includes(layerId)||!root.isLayerVisible(layerId))
    return null;
  const layer=root.getLayer(layerId),blend=layer.blend;
  const opacity=layer.opacity;
  if(!Number.isFinite(opacity)||opacity<=0||opacity>1||
    layer.baseColor==='white'||layer.vectorMask?.enabled||
    layer.imageLink||root.groupsForLayer(layerId).length||root.clippingSource(layerId))
    return null;
  if(blend&&(blend.mode!=='normal'||blend.space!=='encoded'||!!blend.tone||
    !!blend.effect?.enabled||!!blend.gradientMap))
    return null;
  // Hidden layers and fully transparent layers above the edited layer do not
  // affect the displayed image, regardless of their place in the layer list.
  const index=root.rootLayerIds.indexOf(layerId);
  const hasVisibleLayerAbove=root.rootLayerIds.slice(index+1).some(id=>{
    if(!root.isLayerVisible(id))return false;
    const above=root.getLayer(id);
    return Number.isFinite(above.opacity)&&above.opacity>0;
  });
  return hasVisibleLayerAbove?null:opacity;
}

/** Compatibility predicate for callers interested only in whether the
 * replacement path is permitted. */
export function canReplaceTopmostTransformLayer(
  root:DocumentRoot,layerId:LayerId,target:'layer'|'selected'|'boundary'
):boolean{
  return transformPreviewReplacementOpacity(root,layerId,target)!==null;
}

/** Restore the saved visibility automatically when a transform preview closes. */
export function originalVisibleWithTransformPreview(
  visible:boolean,layerId:LayerId,replacementLayerId:LayerId|null
):boolean{
  return visible&&layerId!==replacementLayerId;
}
