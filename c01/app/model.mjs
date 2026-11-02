/** @typedef {{x:number,y:number}} Point */
/** @typedef {Point & {p?:number}} StrokePoint */
/** @typedef {{x:number,y:number,scale:number,rotation:number,flipX:boolean,flipY:boolean}} ViewPose */
/** @typedef {{width:number,height:number,dpi:number,name?:string,author?:string,description?:string,background?:string,profile?:string}} DocumentMeta */
/** Illustro C01: deterministic, browser-independent document/colour/view contracts. */
export const FORMAT = 'illustro.native.raster';
export const VERSION = 1;
/** @type {(n:number,lo:number,hi:number)=>number} */
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
/** @type {(v:number,digits?:number)=>number} */
export const round = (v, digits = 2) => Number(v.toFixed(digits));
/** @param {number} width @param {number} height @param {number} [dpi] */
export function validateDocument(width, height, dpi = 300) {
  if (![width, height, dpi].every(Number.isFinite) || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > 16_777_216 || dpi < 1 || dpi > 2400) throw new RangeError('作品サイズは1〜8192px、合計16777216px以下、DPIは1〜2400です');
  return {width, height, dpi};
}
/** @param {number} value @param {string} unit @param {number} dpi */
export function toPixels(value, unit, dpi) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError('正の値を指定してください');
  if (unit === 'px') return Math.round(value);
  if (unit === 'mm') return Math.round(value * dpi / 25.4);
  throw new RangeError('単位が不正です');
}
/** @param {string} hex */
export function hexToRgb(hex) {
  const s = String(hex).trim().replace(/^#/, '');
  if (!/^(?:[0-9a-f]{6})$/i.test(s)) throw new RangeError('HEXは6桁で入力してください');
  return [0,2,4].map(i => parseInt(s.slice(i,i+2),16));
}
/** @type {(rgb:number[])=>string} */
export const rgbToHex = ([r,g,b]) => '#' + [r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
/** @param {number} h @param {number} s @param {number} v */
export function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360; s=clamp(s,0,1); v=clamp(v,0,1);
  const c=v*s, x=c*(1-Math.abs((h/60)%2-1)), m=v-c;
  const [r,g,b] = h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return [r,g,b].map(q=>Math.round((q+m)*255));
}
/** @param {number[]} rgb */
export function rgbToHsv([r,g,b]) {
  [r,g,b]=[r,g,b].map(q=>clamp(q/255,0,1));const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;if(d){if(max===r)h=60*((g-b)/d%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4)}
  return [((h%360)+360)%360, max===0?0:d/max,max];
}
/** @param {number} h @param {number} s @param {number} l */
export function hslToRgb(h,s,l) {h=((h%360)+360)%360;s=clamp(s,0,1);l=clamp(l,0,1);const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h/60%2-1)),m=l-c/2;const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return [r,g,b].map(q=>Math.round((q+m)*255))}
/** @param {number[]} rgb */
export function rgbToHsl(rgb) {const [h,s,v]=rgbToHsv(rgb),l=v*(1-s/2);return [h, l===0||l===1?0:(v-l)/Math.min(l,1-l),l]}
/** @param {Point} p @param {ViewPose} v */
export function screenToDoc(p, v) {
  const dx=p.x-v.x, dy=p.y-v.y, a=-v.rotation*Math.PI/180, co=Math.cos(a),si=Math.sin(a);
  return {x:(dx*co-dy*si)/v.scale/(v.flipX?-1:1),y:(dx*si+dy*co)/v.scale/(v.flipY?-1:1)};
}
/** @param {Point} p @param {ViewPose} v */
export function docToScreen(p,v) {
  const dx=p.x*(v.flipX?-1:1)*v.scale,dy=p.y*(v.flipY?-1:1)*v.scale,a=v.rotation*Math.PI/180;
  return {x:v.x+dx*Math.cos(a)-dy*Math.sin(a),y:v.y+dx*Math.sin(a)+dy*Math.cos(a)};
}
/** @param {ViewPose} v @param {number} factor @param {Point} anchor @param {number} [rotationDelta] */
export function zoomAt(v, factor, anchor, rotationDelta=0) {
  const doc=screenToDoc(anchor,v), result={...v,scale:clamp(v.scale*factor,.05,64),rotation:v.rotation+rotationDelta};
  const moved=docToScreen(doc,{...result,x:0,y:0});result.x=anchor.x-moved.x;result.y=anchor.y-moved.y;return result;
}
/** One accepted operation => one history item; no view state enters this class. */
export class History {
  /** @type {Array<{label:string}>} */
  items=[];
  constructor(){this.index=0;this.revision=0}
/** @param {{label:string}} action */
  accept(action){if(this.index<this.items.length)this.items.length=this.index;this.items.push(action);this.index++;this.revision++;return this.revision}
  undo(){if(!this.index)return null;this.revision++;return this.items[--this.index]}
  redo(){if(this.index>=this.items.length)return null;this.revision++;return this.items[this.index++]}
  get canUndo(){return this.index>0}
  get canRedo(){return this.index<this.items.length}
  get undoName(){return this.canUndo?this.items[this.index-1].label:''}
  get redoName(){return this.canRedo?this.items[this.index].label:''}
}
/** @param {DocumentMeta} metadata @param {string} png @param {number} revision */
export function createManifest(metadata, png, revision) {
  const {width,height,dpi}=validateDocument(metadata.width,metadata.height,metadata.dpi);
  if(typeof png!=='string'||!png.startsWith('data:image/png;base64,'))throw new Error('Raster PNGがありません');
  return {format:FORMAT,formatVersion:VERSION,savedRevision:revision,document:{name:String(metadata.name||'無題'),author:String(metadata.author||''),description:String(metadata.description||''),width,height,dpi,profile:'srgb8',background:metadata.background==='transparent'?'transparent':'white'},layers:[{id:'raster-1',type:'raster',name:'レイヤー1',visible:true,opacity:1,png}]};
}
/** @param {any} raw */
export function readManifest(raw) {
  const j=typeof raw==='string'?JSON.parse(raw):raw;
  if(j?.format!==FORMAT||j?.formatVersion!==VERSION)throw new Error('非対応のIllustro形式/バージョン');
  if(!Array.isArray(j.layers)||j.layers.length!==1||j.layers[0]?.type!=='raster'||typeof j.layers[0]?.png!=='string'||!j.layers[0].png.startsWith('data:image/png;base64,'))throw new Error('Rasterレイヤーが破損しています');
  validateDocument(j.document?.width,j.document?.height,j.document?.dpi);
  if(j.document.profile!=='srgb8')throw new Error('未対応の色プロファイル');
  return j;
}
/** @param {StrokePoint[]} points @param {number} size @param {number} width @param {number} height */
export function brushBounds(points,size,width,height){
  if(!points.length)return {x:0,y:0,w:0,h:0};
  const r=size*1.5+4; let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity; for(const p of points){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)} const x=Math.max(0,Math.floor(minX-r)),y=Math.max(0,Math.floor(minY-r));
  return {x,y,w:Math.max(0,Math.min(width,Math.ceil(maxX+r))-x),h:Math.max(0,Math.min(height,Math.ceil(maxY+r))-y)};
}