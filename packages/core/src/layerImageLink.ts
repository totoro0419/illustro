import type {LayerId} from './ids';

type PlacedImage=Readonly<{name:string;digest:string;x:number;y:number;width:number;height:number}>;
export type LayerImageLink=PlacedImage&(
  | Readonly<{kind:'linked';fileKey:string}>
  | Readonly<{kind:'embedded'}>
  | Readonly<{kind:'instance';sourceId:LayerId}>
);
export function validateLayerImageLink(value:unknown):LayerImageLink|null{
  if(value==null)return null;
  if(typeof value!=='object')throw Error('画像の参照データが正しくありません。');
  const link=value as LayerImageLink;
  const {name,digest,x,y,width,height}=link;
  const uuid=(key:unknown)=>typeof key==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(key);
  if(typeof name!=='string'||!name.trim()||name.length>240||typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest)||
    ![x,y,width,height].every(Number.isSafeInteger)||Math.abs(x)>16384||Math.abs(y)>16384||width<1||height<1||width>8192||height>8192)
    throw Error('画像の参照データが正しくありません。');
  const placement={name:name.trim(),digest,x,y,width,height};
  if(link.kind==='linked'&&uuid(link.fileKey))return Object.freeze({...placement,kind:'linked',fileKey:link.fileKey});
  if(link.kind==='embedded')return Object.freeze({...placement,kind:'embedded'});
  if(link.kind==='instance'&&uuid(link.sourceId))return Object.freeze({...placement,kind:'instance',sourceId:link.sourceId});
  throw Error('画像の参照先が正しくありません。');
}
