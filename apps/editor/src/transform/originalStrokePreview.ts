import {CanonicalBuilder,type FoundationPreset,type Sample} from '@illustro/brush-rt';
import {renderPostPaintPreview} from './postPaintPreview';

export type OriginalPreviewStroke=Readonly<{preset:FoundationPreset;samples:readonly Sample[];seed:[number,number];alphaLocked:boolean}>;
/** Same brush input, pressure, seed and completion rules as the final source
 * edit. This runs in the existing transform worker, never on pointermove. */
export function renderOriginalStrokePreview(base:Uint8ClampedArray,originalWidth:number,originalHeight:number,
 width:number,height:number,stroke:OriginalPreviewStroke):Uint8ClampedArray{
 if(!stroke.samples.length)return base;
 const builder=new CanonicalBuilder(stroke.preset,stroke.seed,0,stroke.alphaLocked?{alphaLocked:true}:{});
 for(const sample of stroke.samples)builder.accept(sample);
 builder.release({...stroke.samples.at(-1)!,phase:'release'});builder.finish();
 return renderPostPaintPreview(base,originalWidth,originalHeight,width,height,[{selection:null,records:[builder.record()]}]);
}
