import type {AssetEntry} from './library';
import {fingerprintFileChunks} from '../persistence/chunkFingerprint';
export type ReferenceStorageMode='embedded'|'linked';
export type ExternalReference=Readonly<{
  assetId:string;name:string;bytes:number;mime:string;fingerprint?:string;
}>;
/** External references never claim that an unrelated local file is the source. */
export function canReuseExternalReference(
  descriptor:ExternalReference|undefined,
  candidate:Pick<AssetEntry,'id'|'kind'|'name'|'bytes'|'mime'|'deleted'>|null
):boolean{
  return !!descriptor&&!!candidate&&!candidate.deleted&&
    candidate.kind==='reference'&&candidate.id===descriptor.assetId&&
    candidate.name===descriptor.name&&candidate.bytes===descriptor.bytes&&
    candidate.mime===descriptor.mime;
}
/** A matching name, size and ID is not enough: compare bounded content hashes. */
export async function verifyExternalReference(
  descriptor:ExternalReference|undefined,candidate:AssetEntry|null
):Promise<boolean>{
  if(!descriptor?.fingerprint||!candidate||!canReuseExternalReference(descriptor,candidate))
    return false;
  try{return await fingerprintFileChunks(candidate.data)===descriptor.fingerprint;}
  catch{return false;}
}
export function parseExternalReferences(input:unknown):ExternalReference[]{
  if(!Array.isArray(input)||input.length>80)throw Error('外部参考画像の情報が正しくありません。');
  const seen=new Set<string>(),result:ExternalReference[]=[];
  for(const raw of input){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('外部参考画像の記録が壊れています。');
    const ref=raw as Record<string,unknown>;
    if(typeof ref.assetId!=='string'||!ref.assetId||ref.assetId.length>120||
      seen.has(ref.assetId)||typeof ref.name!=='string'||!ref.name||ref.name.length>240||
      typeof ref.mime!=='string'||!ref.mime.startsWith('image/')||ref.mime.length>180||
      !Number.isSafeInteger(ref.bytes)||(ref.bytes as number)<1||(ref.bytes as number)>32*1024*1024||
      (ref.fingerprint!==undefined&&(typeof ref.fingerprint!=='string'||
        !/^sha256-chunks-v1:[a-f0-9]{64}$/.test(ref.fingerprint))))
      throw Error('外部参考画像の情報が正しくありません。');
    seen.add(ref.assetId);
    result.push({assetId:ref.assetId,name:ref.name,bytes:ref.bytes as number,mime:ref.mime,
      ...(typeof ref.fingerprint==='string'?{fingerprint:ref.fingerprint}:{})});
  }
  return result;
}
