import {TYPE_RGBA_8,cmsFLAGS_BLACKPOINTCOMPENSATION,cmsFLAGS_COPY_ALPHA,cmsFLAGS_GAMUTCHECK,
  cmsFLAGS_SOFTPROOFING,cmsInfoDescription,instantiate} from 'lcms-wasm';
import wasm from 'lcms-wasm/dist/lcms.wasm?url';

import {ICC_LIMIT} from './iccMetadata';
export function validIccBytes(bytes:Uint8Array){
  if(bytes.length<132||bytes.length>ICC_LIMIT)return false;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const length=view.getUint32(0),tags=view.getUint32(128);
  return length>=132&&length<=bytes.length&&view.getUint32(36)===0x61637370&&
    tags<=4096&&132+tags*12<=length;
}

let loading:ReturnType<typeof instantiate>|null=null;
const deviceCms=()=>loading??=instantiate({locateFile:()=>wasm}).catch(error=>{loading=null;throw error;});
type CMS=Awaited<ReturnType<typeof instantiate>>;
type Pixels=Uint8Array|Uint8ClampedArray;
type Options=Readonly<{intent:number;blackPoint:boolean;gamut:boolean}>;

export function iccProcessor(cms:CMS,bytes:Uint8Array,options:Options,proof:boolean){
  if(!validIccBytes(bytes))throw Error('ICCプロファイルが正しくないか、4MBを超えています。');
  if(!Number.isInteger(options.intent)||options.intent<0||options.intent>3)throw Error('色変換方法を選んでください。');
  const profile=cms.cmsOpenProfileFromMem(bytes,bytes.length),srgb=cms.cmsCreate_sRGBProfile();
  let transform=0,alarms=0,closed=false;
  const close=()=>{
    if(closed)return;
    closed=true;
    if(transform)cms.cmsDeleteTransform(transform);
    if(alarms)cms.cmsDeleteTransform(alarms);
    if(profile)cms.cmsCloseProfile(profile);
    if(srgb)cms.cmsCloseProfile(srgb);
  };
  try{
    if(!profile||!srgb)throw Error('ICCプロファイルを読み込めません。');
    const colorSpace=cms.cmsGetColorSpaceASCII(profile);
    if(proof?!['RGB','CMYK','GRAY','Gray'].includes(colorSpace??''):colorSpace!=='RGB')
      throw Error(proof?'RGB・CMYK・グレーの出力プロファイルを選んでください。':'元の画像のRGB配列に適用できないICCプロファイルです。');
    const flags=cmsFLAGS_COPY_ALPHA|(options.blackPoint?cmsFLAGS_BLACKPOINTCOMPENSATION:0);
    transform=proof?cms.cmsCreateProofingTransform(srgb,TYPE_RGBA_8,srgb,TYPE_RGBA_8,profile,options.intent,options.intent,flags|cmsFLAGS_SOFTPROOFING):
      cms.cmsCreateTransform(profile,TYPE_RGBA_8,srgb,TYPE_RGBA_8,options.intent,flags);
    if(!transform)throw Error('このICCプロファイルで色変換を作成できません。');
    if(proof&&options.gamut){
      alarms=cms.cmsCreateProofingTransform(srgb,TYPE_RGBA_8,srgb,TYPE_RGBA_8,profile,options.intent,options.intent,
        flags|cmsFLAGS_SOFTPROOFING|cmsFLAGS_GAMUTCHECK);
      if(!alarms)throw Error('このプロファイルで色域を判定できません。');
    }
    const name=cms.cmsGetProfileInfoASCII(profile,cmsInfoDescription,'en','US')||colorSpace||'ICC';
    function apply(input:Pixels){
      if(closed||input.length%4)throw Error('色を変換する画素の形式が正しくありません。');
      const source=new Uint8Array(input.buffer,input.byteOffset,input.length);
      const output=new Uint8ClampedArray(input.length);
      const range=alarms?new Uint8Array(input.length/4):null;
      const blockSize=262144;
      for(let start=0;start<input.length;start+=blockSize){
        const block=source.subarray(start,start+blockSize);
        const adjusted=cms.cmsDoTransform(transform,block,block.length/4);
        output.set(adjusted,start);
        if(range){
          const marked=cms.cmsDoTransform(alarms,block,block.length/4);
          for(let k=0;k<block.length;k+=4){
            if(block[k+3]&&(marked[k]!==adjusted[k]||marked[k+1]!==adjusted[k+1]||marked[k+2]!==adjusted[k+2]))
              range[(start+k)/4]=255;
          }
        }
      }
      return {pixels:output,outOfGamut:range};
    }
    return {name,apply,close};
  }catch(error){close();throw error;}
}

export async function openIccProcessor(bytes:Uint8Array,options:Options,proof:boolean){
  return iccProcessor(await deviceCms(),bytes,options,proof);
}
