/** R2 D-001: explicit OFF always overrides zoom and current drawing tool. */
export function shouldShowPixelGrid(enabled:boolean,zoom:number,thresholdPercent:number,hasView:boolean){
  return enabled&&hasView&&Number.isFinite(zoom)&&Number.isFinite(thresholdPercent)&&
    zoom>0&&zoom*100>=thresholdPercent;
}
