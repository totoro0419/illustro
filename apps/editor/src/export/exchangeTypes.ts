import type {LayerBlendMode} from '@illustro/core';
export type ExchangeFormat='psd'|'psb'|'ora'|'tiff'|'svg'|'avif';
export type ExchangeLayer=Readonly<{
  name:string;x:number;y:number;width:number;height:number;pixels:Uint8ClampedArray;
  opacity:number;visible:boolean;blend:LayerBlendMode;
}>;
export type ExchangeArtwork=Readonly<{
  width:number;height:number;name:string;dpi?:number|undefined;
  /** In the same order as the editor: bottom to top. */
  layers:readonly ExchangeLayer[];merged?:Uint8ClampedArray|undefined;warnings:readonly string[];
}>;
export const MAX_IMAGE_PIXELS=33_554_432;
export const MAX_EXCHANGE_BYTES=256*1024*1024;
export function assertImageSize(width:number,height:number){
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
    width>8192||height>8192||width*height>MAX_IMAGE_PIXELS)throw Error('この画像の大きさは交換形式で扱える範囲を超えています。');
}
export function imageLayer(name:string,width:number,height:number,pixels:Uint8ClampedArray):ExchangeLayer{
  assertImageSize(width,height);
  if(pixels.length!==width*height*4)throw Error('画素の長さが画像の大きさと一致しません。');
  return {name,x:0,y:0,width,height,pixels,opacity:1,visible:true,blend:'normal'};
}
export function cleanFileName(name:string){
  return (name.replace(/[\\/:*?"<>|\x00-\x1F]/g,'_').replace(/\.[a-z0-9]{2,8}$/i,'').trim()||'Illustro').slice(0,120);
}
export const xmlText=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
export const toComposite:Partial<Record<LayerBlendMode,string>>={
  normal:'svg:src-over',multiply:'svg:multiply',screen:'svg:screen',overlay:'svg:overlay',
  darken:'svg:darken',lighten:'svg:lighten','color-dodge':'svg:color-dodge','color-burn':'svg:color-burn',
  'hard-light':'svg:hard-light','soft-light':'svg:soft-light',difference:'svg:difference',exclusion:'svg:exclusion',
  hue:'svg:hue',saturation:'svg:saturation',color:'svg:color',luminosity:'svg:luminosity',
};
export const fromComposite=new Map(Object.entries(toComposite).map(([key,value])=>[value,key as LayerBlendMode]));
export const supportsOraBlend=(mode:LayerBlendMode)=>!!toComposite[mode];
