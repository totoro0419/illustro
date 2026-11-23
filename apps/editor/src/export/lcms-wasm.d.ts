declare module 'lcms-wasm' {
  export const TYPE_RGBA_8:number;
  export const cmsFLAGS_BLACKPOINTCOMPENSATION:number;
  export const cmsFLAGS_COPY_ALPHA:number;
  export const cmsFLAGS_GAMUTCHECK:number;
  export const cmsFLAGS_SOFTPROOFING:number;
  export const cmsInfoDescription:number;
  export function instantiate(options?:{locateFile?:()=>string;wasmBinary?:Uint8Array}):Promise<{
    cmsOpenProfileFromMem(bytes:Uint8Array,size:number):number;
    cmsCloseProfile(profile:number):void;
    cmsCreate_sRGBProfile():number;
    cmsGetProfileInfoASCII(profile:number,attribute:number,language:string,region:string):string;
    cmsGetColorSpaceASCII(profile:number):string|null;
    cmsCreateTransform(source:number,inType:number,target:number,outType:number,intent:number,flags:number):number;
    cmsCreateProofingTransform(source:number,inType:number,target:number,outType:number,proof:number,
      intent:number,proofIntent:number,flags:number):number;
    cmsDoTransform(transform:number,data:Uint8Array,count:number):Uint8Array;
    cmsDeleteTransform(transform:number):void;
  }>;
}
