import {compilePreset,type FoundationPreset,type Resource} from '@illustro/brush-rt';

export type BrushMaterialKind='tip'|'paper'|'texture'|'pattern';
/** Stamp silhouettes use transparency when present, otherwise dark ink on
 * white. Paper textures use luminance with transparent pixels treated as white. */
export function materialResource(
 kind:BrushMaterialKind,width:number,height:number,pixels:Uint8ClampedArray,label:string
):Resource{
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
    width>256||height>256||pixels.length!==width*height*4)
   throw Error('素材画像の大きさが正しくありません。');
 let transparent=false;
 for(let i=3;i<pixels.length;i+=4)if(pixels[i]!<255){transparent=true;break;}
 const alpha:number[]=[];
 for(let i=0;i<pixels.length;i+=4){
   const opacity=pixels[i+3]!/255;
   const light=(pixels[i]!*0.2126+pixels[i+1]!*0.7152+pixels[i+2]!*0.0722)/255;
   const value=kind==='tip'?(transparent?opacity:(1-light)*opacity):1-opacity+light*opacity;
   alpha.push(Math.round(value*255)/255);
 }
 if(kind==='tip'&&!alpha.some(value=>value>0))throw Error('ブラシ先端に使える形がありません。');
 return {kind:kind==='tip'?'mask':'texture',width,height,alpha,label:label.slice(0,100)};
}

export async function readBrushMaterial(blob:Blob,kind:BrushMaterialKind,label:string):Promise<Resource>{
 const bitmap=await createImageBitmap(blob);
 try{
   const scale=Math.min(1,256/Math.max(bitmap.width,bitmap.height));
   const width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const context=canvas.getContext('2d',{willReadFrequently:true});
   if(!context)throw Error('素材画像を読み取れません。');
   context.drawImage(bitmap,0,0,width,height);
   return materialResource(kind,width,height,context.getImageData(0,0,width,height).data,label);
 }finally{bitmap.close();}
}

/** Resource pixels live inside the saved preset, so moving or deleting a
 * library asset cannot invalidate an existing brush or recorded stroke. */
export function withBrushMaterial(source:FoundationPreset,kind:BrushMaterialKind,resource:Resource):FoundationPreset{
 const preset=structuredClone(source),key=kind==='tip'?'library-tip':'library-texture';
 // Preserve any existing resource with the same name when another slot uses it.
 let id=key,index=1;
 while(Object.hasOwn(preset.resources,id))id=key+'-'+index++;
 preset.resources[id]=structuredClone(resource);
 if(kind==='tip'){
   preset.tip.shape='mask';preset.tip.resource=id;preset.tip.aspect=1;
 }else{
   // The standard renderer supports one texture at a time. This action replaces
   // the current texture rather than producing an unrenderable combination.
   for(const layer of Object.values(preset.texture))layer.strength=0;
   preset.texture.paper={...preset.texture.paper,kind:'image',resource:id,
     strength:1,minimum:0,scale:1,sizeMode:'absolute',space:'paper',
     rotation:0,followDirection:false,invert:false,aa:true};
 }
 if(preset.renderer==='continuous'||preset.renderer==='sweep')preset.renderer='auto';
 compilePreset(preset,{forceFadeGeometry:'adaptive-v1'});
 return preset;
}
