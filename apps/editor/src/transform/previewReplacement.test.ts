import {describe,expect,it} from 'vitest';
import type {DocumentRoot,LayerId} from '@illustro/core';
import {canReplaceTopmostTransformLayer,originalVisibleWithTransformPreview,transformPreviewReplacementOpacity} from './previewReplacement';

const bottom='bottom' as LayerId,top='top' as LayerId;
type Options={
  order?:LayerId[];visible?:boolean;opacity?:number;mask?:boolean;
  blend?:{mode:string;space:string;tone?:object;effect?:{enabled:boolean};gradientMap?:object};
  clipped?:boolean;grouped?:boolean;linked?:boolean;white?:boolean;
  hiddenUpper?:boolean;upperOpacity?:number;
};
function scene(options:Options={}):DocumentRoot{
  return {
    rootLayerIds:options.order??[bottom,top],
    isLayerVisible:(id:LayerId)=>id===bottom&&options.hiddenUpper?false:options.visible??true,
    groupsForLayer:()=>options.grouped?[{id:'group'}]:[],
    clippingSource:()=>options.clipped?{id:bottom}:null,
    getLayer:(id:LayerId)=>({
      opacity:id===bottom&&options.upperOpacity!==undefined?options.upperOpacity:options.opacity??1,
      ...(options.mask?{vectorMask:{enabled:true}}:{}),
      ...(options.blend?{blend:options.blend}:{}),
      ...(options.linked?{imageLink:{kind:'linked'}}:{}),
      ...(options.white?{baseColor:'white'}:{})
    })
  } as unknown as DocumentRoot;
}
describe('C07-001 transform preview layer replacement',()=>{
  it('replaces only the topmost, visible, normally blended, unmasked raster',()=>{
    expect(canReplaceTopmostTransformLayer(scene(),top,'layer')).toBe(true);
    expect(canReplaceTopmostTransformLayer(scene(),top,'selected')).toBe(true);
    expect(canReplaceTopmostTransformLayer(scene(),top,'boundary')).toBe(false);
    expect(canReplaceTopmostTransformLayer(scene(),bottom,'layer')).toBe(false);
    expect(transformPreviewReplacementOpacity(scene({opacity:.6}),top,'layer')).toBe(.6);
    expect(canReplaceTopmostTransformLayer(scene({opacity:.6}),top,'layer')).toBe(true);
  });
  it('never hides a layer whose compositing requires preserving its original position or effects',()=>{
    for(const options of [
      {visible:false},{opacity:0},{mask:true},{linked:true},{white:true},{clipped:true},{grouped:true},
      {order:[top,bottom]},{blend:{mode:'multiply',space:'encoded'}},
      {blend:{mode:'normal',space:'linear'}},
      {blend:{mode:'normal',space:'encoded',tone:{source:'self'}}},
      {blend:{mode:'normal',space:'encoded',effect:{enabled:true}}},
      {blend:{mode:'normal',space:'encoded',gradientMap:{stops:[]}}}
    ] satisfies Options[]){
      expect(canReplaceTopmostTransformLayer(scene(options),top,'layer')).toBe(false);
    }
  });
  it('accepts the visually topmost layer even when invisible or fully transparent layers are listed above',()=>{
    expect(transformPreviewReplacementOpacity(scene({order:[top,bottom],hiddenUpper:true}),top,'layer')).toBe(1);
    expect(transformPreviewReplacementOpacity(scene({order:[top,bottom],upperOpacity:0,opacity:.35}),top,'layer')).toBe(.35);
    expect(transformPreviewReplacementOpacity(scene({order:[top,bottom],upperOpacity:.01}),top,'layer')).toBeNull();
    expect(transformPreviewReplacementOpacity(scene({order:[bottom,top],opacity:1.1}),top,'layer')).toBeNull();
    expect(transformPreviewReplacementOpacity(scene({order:[bottom,top],opacity:NaN}),top,'layer')).toBeNull();
  });
  it('preserves all other layers and restores the original on preview close or cancellation',()=>{
    expect(originalVisibleWithTransformPreview(true,top,top)).toBe(false);
    expect(originalVisibleWithTransformPreview(true,bottom,top)).toBe(true);
    expect(originalVisibleWithTransformPreview(false,bottom,top)).toBe(false);
    expect(originalVisibleWithTransformPreview(true,top,null)).toBe(true);
    expect(originalVisibleWithTransformPreview(false,top,null)).toBe(false);
  });
});
