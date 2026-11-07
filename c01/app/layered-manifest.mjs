import {FORMAT,validateDocument,readManifest} from './model.mjs';
/** C03 native archive envelope. The C01/C02 single-layer writer is untouched.
 * This reader validates all raster payloads before the document is admitted.
 */
const PNG_PREFIX='data:image/png;base64,';
const ids=new Set(['raster','group','vector','mask']);
function assertLayer(layer,seen){
 if(!layer||typeof layer!=='object'||typeof layer.id!=='string'||!layer.id||seen.has(layer.id))throw Error('Invalid or duplicate layer id');
 seen.add(layer.id);
 if(!ids.has(layer.type))throw Error('Unsupported layer type');
 if(typeof layer.name!=='string')throw Error('Invalid layer name');
 if(typeof layer.visible!=='boolean')throw Error('Invalid visibility');
 if(!Number.isFinite(layer.opacity)||layer.opacity<0||layer.opacity>1)throw Error('Invalid opacity');
 if(layer.type==='raster'&&(!layer.png||!layer.png.startsWith(PNG_PREFIX)))throw Error('Invalid raster PNG');
 if(layer.children!==undefined&&(!Array.isArray(layer.children)||layer.type!=='group'))throw Error('Invalid layer children');
 if(layer.children)for(const child of layer.children)assertLayer(child,seen);
}
export function createLayeredManifest(metadata,layers,revision,{brushArchive,history}={}){
 const {width,height,dpi}=validateDocument(metadata.width,metadata.height,metadata.dpi);
 if(!Array.isArray(layers)||layers.length===0)throw Error('At least one layer is required');
 const seen=new Set();
 for(const layer of layers)assertLayer(layer,seen);
 if(!Number.isSafeInteger(revision)||revision<0)throw Error('Invalid revision');
 return {format:FORMAT,formatVersion:3,savedRevision:revision,document:{
  name:String(metadata.name||'無題'),author:String(metadata.author||''),
  description:String(metadata.description||''),width,height,dpi,
  profile:'srgb8',background:metadata.background==='transparent'?'transparent':'white'
 },layers:structuredClone(layers),...(brushArchive?{brushArchive:structuredClone(brushArchive)}:{}),
 ...(history?{history:structuredClone(history)}:{})};
}
export function readLayeredManifest(raw){
 const j=typeof raw==='string'?JSON.parse(raw):raw;
 if(j?.formatVersion!==3)return readManifest(j);
 if(j.format!==FORMAT)throw Error('Unsupported document format');
 validateDocument(j.document?.width,j.document?.height,j.document?.dpi);
 if(j.document?.profile!=='srgb8')throw Error('Unsupported color profile');
 if(!Array.isArray(j.layers)||j.layers.length===0)throw Error('Missing layers');
 const seen=new Set();
 for(const layer of j.layers)assertLayer(layer,seen);
 if(!Number.isSafeInteger(j.savedRevision)||j.savedRevision<0)throw Error('Invalid revision');
 return j;
}
