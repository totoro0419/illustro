export const ILLUSTRO_CONTAINER_VERSION=1 as const;
const HEADER_MAGIC=new TextEncoder().encode('ILSTRO01');
const FOOTER_MAGIC=new TextEncoder().encode('ILSTROFT');
const HEADER_BYTES=24,FOOTER_BYTES=40;
const RESERVED_MANIFEST=new Set(['schema','version','generationId','documentId','snapshotRevisionId','createdAt','payloadLength','sections']);

export type IllustroCodec='none';
export type PortableSectionInput=Readonly<{
  id:string;type:string;required:boolean;bytes:Uint8Array;codec?:IllustroCodec;descriptorExtras?:Readonly<Record<string,unknown>>;
}>;
export type PortableManifestSection=Readonly<{
  id:string;type:string;required:boolean;codec:IllustroCodec;offset:number;length:number;sha256:string;extras:Readonly<Record<string,unknown>>;
}>;
export type PortableManifest=Readonly<{
  schema:'illustro.container.manifest';version:1;generationId:string;documentId:string;snapshotRevisionId:string;createdAt:number;
  payloadLength:number;sections:readonly PortableManifestSection[];extras:Readonly<Record<string,unknown>>;
}>;
export type DecodedPortableFile=Readonly<{manifest:PortableManifest;sections:ReadonlyMap<string,Readonly<{descriptor:PortableManifestSection;bytes:Uint8Array}>>}>;

export type PortableLimits=Readonly<{maxFileBytes:number;maxManifestBytes:number;maxSectionBytes:number;maxSections:number;maxStringBytes:number}>;
export const M05_PORTABLE_LIMITS:PortableLimits=Object.freeze({
  maxFileBytes:1024*1024*1024,maxManifestBytes:8*1024*1024,maxSectionBytes:512*1024*1024,maxSections:200_000,maxStringBytes:4096,
});

export async function encodeIllustroFile(input:Readonly<{
  generationId:string;documentId:string;snapshotRevisionId:string;createdAt:number;sections:readonly PortableSectionInput[];
  manifestExtras?:Readonly<Record<string,unknown>>;limits?:PortableLimits;
}>):Promise<Uint8Array>{
  const limits=input.limits??M05_PORTABLE_LIMITS;
  validText(input.generationId,'generationId',limits);validText(input.documentId,'documentId',limits);validText(input.snapshotRevisionId,'snapshotRevisionId',limits);
  if(!Number.isSafeInteger(input.createdAt)||input.createdAt<0)throw new Error('invalid createdAt');
  if(input.sections.length>limits.maxSections)throw new Error('too many sections');
  const ids=new Set<string>(),descriptors:PortableManifestSection[]=[];let offset=0;
  for(const section of input.sections){
    validText(section.id,'section id',limits);validText(section.type,'section type',limits);if(ids.has(section.id))throw new Error('duplicate section id');ids.add(section.id);
    if(section.codec!==undefined&&section.codec!=='none')throw new Error('unsupported section codec');
    if(section.bytes.byteLength>limits.maxSectionBytes)throw new Error('section too large');
    const extras=cleanExtras(section.descriptorExtras??{},new Set(['id','type','required','codec','offset','length','sha256']));
    const digest=await sha256Hex(section.bytes);descriptors.push(Object.freeze({id:section.id,type:section.type,required:section.required,codec:'none',offset,length:section.bytes.byteLength,sha256:digest,extras}));
    offset=safeAdd(offset,section.bytes.byteLength,limits.maxFileBytes);
  }
  const extras=cleanExtras(input.manifestExtras??{},RESERVED_MANIFEST);
  const plainSections=descriptors.map(s=>Object.freeze({...s.extras,id:s.id,type:s.type,required:s.required,codec:s.codec,offset:s.offset,length:s.length,sha256:s.sha256}));
  const manifestObject=Object.freeze({...extras,schema:'illustro.container.manifest',version:1,generationId:input.generationId,documentId:input.documentId,snapshotRevisionId:input.snapshotRevisionId,
    createdAt:input.createdAt,payloadLength:offset,sections:plainSections});
  const manifestBytes=new TextEncoder().encode(JSON.stringify(manifestObject));
  if(manifestBytes.byteLength>limits.maxManifestBytes)throw new Error('manifest too large');
  const total=safeAdd(safeAdd(HEADER_BYTES,manifestBytes.byteLength,limits.maxFileBytes),safeAdd(offset,FOOTER_BYTES,limits.maxFileBytes),limits.maxFileBytes);
  const out=new Uint8Array(total),view=new DataView(out.buffer);out.set(HEADER_MAGIC,0);view.setUint16(8,ILLUSTRO_CONTAINER_VERSION,true);view.setUint16(10,HEADER_BYTES,true);view.setUint32(12,0,true);
  view.setUint32(16,manifestBytes.byteLength,true);view.setUint32(20,descriptors.length,true);out.set(manifestBytes,HEADER_BYTES);
  let write=HEADER_BYTES+manifestBytes.byteLength;
  for(const section of input.sections){out.set(section.bytes,write);write+=section.bytes.byteLength;}
  out.set(FOOTER_MAGIC,write);out.set(await sha256(manifestBytes),write+8);
  return out;
}

export async function decodeIllustroFile(bytes:Uint8Array,options:Readonly<{limits?:PortableLimits;knownRequiredTypes?:ReadonlySet<string>}>=Object.freeze({})):Promise<DecodedPortableFile>{
  const limits=options.limits??M05_PORTABLE_LIMITS;if(bytes.byteLength>limits.maxFileBytes)throw new Error('file too large');
  if(bytes.byteLength<HEADER_BYTES+FOOTER_BYTES)throw new Error('truncated container');
  exactMagic(bytes,0,HEADER_MAGIC,'invalid container magic');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const version=view.getUint16(8,true),headerBytes=view.getUint16(10,true),flags=view.getUint32(12,true),manifestLength=view.getUint32(16,true),headerSectionCount=view.getUint32(20,true);
  if(version!==ILLUSTRO_CONTAINER_VERSION)throw new Error('unsupported container version');if(headerBytes!==HEADER_BYTES||flags!==0)throw new Error('unsupported container header');
  if(manifestLength>limits.maxManifestBytes)throw new Error('manifest too large');if(headerSectionCount>limits.maxSections)throw new Error('too many sections');
  const payloadStart=safeAdd(HEADER_BYTES,manifestLength,bytes.byteLength),footerStart=bytes.byteLength-FOOTER_BYTES;if(payloadStart>footerStart)throw new Error('truncated manifest');
  exactMagic(bytes,footerStart,FOOTER_MAGIC,'invalid container footer');
  const manifestBytes=bytes.slice(HEADER_BYTES,payloadStart),expectedManifestHash=bytes.slice(footerStart+8);
  if(!equalBytes(await sha256(manifestBytes),expectedManifestHash))throw new Error('manifest integrity check failed');
  let parsed:unknown;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(manifestBytes));}catch{throw new Error('malformed manifest');}
  const raw=asRecord(parsed,'manifest');if(raw.schema!=='illustro.container.manifest'||raw.version!==1)throw new Error('unsupported manifest');
  const generationId=readText(raw.generationId,'generationId',limits),documentId=readText(raw.documentId,'documentId',limits),snapshotRevisionId=readText(raw.snapshotRevisionId,'snapshotRevisionId',limits);
  const createdAt=readSafeInteger(raw.createdAt,'createdAt',0),payloadLength=readSafeInteger(raw.payloadLength,'payloadLength',0);
  const rawSections=raw.sections;if(!Array.isArray(rawSections))throw new Error('manifest sections missing');if(rawSections.length!==headerSectionCount||rawSections.length>limits.maxSections)throw new Error('section count mismatch');
  if(payloadLength!==footerStart-payloadStart)throw new Error('payload length mismatch');
  const extras=extractExtras(raw,RESERVED_MANIFEST),descriptors:PortableManifestSection[]=[];const sections=new Map<string,Readonly<{descriptor:PortableManifestSection;bytes:Uint8Array}>>(),ids=new Set<string>();
  let expectedOffset=0;
  for(const item of rawSections){
    const s=asRecord(item,'section'),id=readText(s.id,'section id',limits),type=readText(s.type,'section type',limits);if(ids.has(id))throw new Error('duplicate section id');ids.add(id);
    if(typeof s.required!=='boolean')throw new Error('invalid section required flag');if(s.codec!=='none')throw new Error('unsupported section codec');
    const offset=readSafeInteger(s.offset,'section offset',0),length=readSafeInteger(s.length,'section length',0);if(length>limits.maxSectionBytes)throw new Error('section too large');
    if(offset!==expectedOffset)throw new Error('section layout gap or overlap');expectedOffset=safeAdd(offset,length,payloadLength);if(expectedOffset>payloadLength)throw new Error('section outside payload');
    const digest=readHash(s.sha256),required=s.required;if(required&&options.knownRequiredTypes&&!options.knownRequiredTypes.has(type))throw new Error('unknown required section');
    const descriptorExtras=extractExtras(s,new Set(['id','type','required','codec','offset','length','sha256']));
    const descriptor=Object.freeze({id,type,required,codec:'none' as const,offset,length,sha256:digest,extras:descriptorExtras});descriptors.push(descriptor);
    const body=bytes.slice(payloadStart+offset,payloadStart+offset+length),valid=await sha256Hex(body)===digest;
    if(!valid){if(required)throw new Error('section integrity check failed');continue;}
    sections.set(id,Object.freeze({descriptor,bytes:body}));
  }
  if(expectedOffset!==payloadLength)throw new Error('payload layout mismatch');
  const manifest=Object.freeze({schema:'illustro.container.manifest' as const,version:1 as const,generationId,documentId,snapshotRevisionId,createdAt,payloadLength,sections:Object.freeze(descriptors),extras});
  return Object.freeze({manifest,sections});
}

function asRecord(value:unknown,name:string):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid '+name);return value as Record<string,unknown>;}
function validText(value:string,name:string,limits:PortableLimits){if(typeof value!=='string'||value.length===0||new TextEncoder().encode(value).byteLength>limits.maxStringBytes||/[\u0000-\u001f]/.test(value))throw new Error('invalid '+name);}
function readText(value:unknown,name:string,limits:PortableLimits){if(typeof value!=='string')throw new Error('invalid '+name);validText(value,name,limits);return value;}
function readSafeInteger(value:unknown,name:string,min:number){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min)throw new Error('invalid '+name);return value;}
function readHash(value:unknown){if(typeof value!=='string'||!/^[0-9a-f]{64}$/.test(value))throw new Error('invalid section hash');return value;}
function safeAdd(a:number,b:number,max:number){const n=a+b;if(!Number.isSafeInteger(n)||n>max)throw new Error('container size limit exceeded');return n;}
function exactMagic(bytes:Uint8Array,offset:number,magic:Uint8Array,message:string){for(let i=0;i<magic.length;i++)if(bytes[offset+i]!==magic[i])throw new Error(message);}
function equalBytes(a:Uint8Array,b:Uint8Array){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=(a[i]??0)^(b[i]??0);return diff===0;}
async function sha256(bytes:Uint8Array){const source=bytes.byteOffset===0&&bytes.byteLength===bytes.buffer.byteLength?bytes:bytes.slice();return new Uint8Array(await crypto.subtle.digest('SHA-256',source as Uint8Array<ArrayBuffer>));}
async function sha256Hex(bytes:Uint8Array){return [...await sha256(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function cleanExtras(value:Readonly<Record<string,unknown>>,reserved:ReadonlySet<string>){for(const key of Object.keys(value))if(reserved.has(key))throw new Error('reserved manifest field: '+key);return Object.freeze({...value});}
function extractExtras(value:Record<string,unknown>,reserved:ReadonlySet<string>){const out:Record<string,unknown>={};for(const [key,v] of Object.entries(value))if(!reserved.has(key))out[key]=v;return Object.freeze(out);}
