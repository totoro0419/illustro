import type {Point} from '../transform/geometry';
import type {FillSettings} from './pixels';

/** A deliberately approximate, bounded preview for ordinary color filling.
 * Never use this thumbnail mask for final pixels. The existing worker uses
 * the original image, exact selection/masks and full-resolution conditions. */
export class LiveColorFillPreview{
 readonly width:number;
 readonly height:number;
 readonly pixels:Uint8ClampedArray<ArrayBuffer>;
 private readonly sampled:Uint8Array<ArrayBuffer>;
 private readonly filled:Uint8Array<ArrayBuffer>;
 private readonly queue:Uint32Array<ArrayBuffer>;
 private readonly sourceWidth:number;
 private readonly sourceHeight:number;
 private reference:number|null=null;
 private changed=false;
 constructor(source:Uint8Array,sourceWidth:number,sourceHeight:number,maxDimension=512){
  if(!Number.isSafeInteger(sourceWidth)||!Number.isSafeInteger(sourceHeight)||
     sourceWidth<1||sourceHeight<1||source.length!==sourceWidth*sourceHeight*4||
     !Number.isSafeInteger(maxDimension)||maxDimension<8||maxDimension>1024)
    throw Error('色塗りの仮表示の画像サイズが正しくありません。');
  this.sourceWidth=sourceWidth;this.sourceHeight=sourceHeight;
  const scale=Math.min(1,maxDimension/Math.max(sourceWidth,sourceHeight));
  this.width=Math.max(1,Math.round(sourceWidth*scale));
  this.height=Math.max(1,Math.round(sourceHeight*scale));
  const length=this.width*this.height;
  this.sampled=new Uint8Array(length*4);
  this.filled=new Uint8Array(length);
  this.queue=new Uint32Array(length);
  this.pixels=new Uint8ClampedArray(length*4);
  for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++){
   const sx=Math.floor((x+.5)*sourceWidth/this.width);
   const sy=Math.floor((y+.5)*sourceHeight/this.height);
   const src=(Math.min(sourceHeight-1,sy)*sourceWidth+Math.min(sourceWidth-1,sx))*4;
   this.sampled.set(source.subarray(src,src+4),(y*this.width+x)*4);
  }
 }
 /** Add the newly touched part of a stroke; returns whether visible regions changed. */
 add(from:Point,to:Point,settings:Pick<FillSettings,'tolerance'|'alphaTolerance'|'contiguous'>):boolean{
  const length=Math.hypot(to.x-from.x,to.y-from.y);
  if(!Number.isFinite(length)||length>this.sourceWidth+this.sourceHeight)return false;
  this.changed=false;
  const steps=Math.min(4096,Math.max(1,Math.ceil(length*Math.max(this.width/this.sourceWidth,this.height/this.sourceHeight)*2)));
  for(let step=0;step<=steps;step++){
   const x=Math.floor((from.x+(to.x-from.x)*step/steps)*this.width/this.sourceWidth);
   const y=Math.floor((from.y+(to.y-from.y)*step/steps)*this.height/this.sourceHeight);
   if(x<0||y<0||x>=this.width||y>=this.height)continue;
   this.seed(y*this.width+x,settings);
  }
  return this.changed;
 }
 private same(index:number,settings:Pick<FillSettings,'tolerance'|'alphaTolerance'|'contiguous'>):boolean{
  if(this.reference===null)return false;
  const at=index*4,target=this.reference*4;
  const alpha=this.sampled[at+3]!,sampleAlpha=this.sampled[target+3]!;
  const alphaTolerance=(settings.alphaTolerance??settings.tolerance)*2.55;
  if(!alpha&&!sampleAlpha)return true;
  if(Math.abs(alpha-sampleAlpha)>alphaTolerance)return false;
  if(!alpha||!sampleAlpha)return true;
  const diff=Math.hypot(this.sampled[at]!-this.sampled[target]!,
    this.sampled[at+1]!-this.sampled[target+1]!,
    this.sampled[at+2]!-this.sampled[target+2]!)/Math.sqrt(3);
  return diff<=settings.tolerance*2.55;
 }
 private seed(seed:number,settings:Pick<FillSettings,'tolerance'|'alphaTolerance'|'contiguous'>){
  if(this.reference===null){
   this.reference=seed;
   if(!settings.contiguous){
    for(let i=0;i<this.filled.length;i++)if(this.same(i,settings)){
     this.filled[i]=1;this.changed=true;
    }
    return;
   }
  }
  if(this.filled[seed]||!this.same(seed,settings))return;
  let front=0,back=1;
  this.queue[0]=seed;this.filled[seed]=1;this.changed=true;
  const visit=(i:number)=>{if(!this.filled[i]&&this.same(i,settings)){
   this.filled[i]=1;this.queue[back++]=i;
  }};
  while(front<back){
   const at=this.queue[front++]!,x=at%this.width,y=Math.floor(at/this.width);
   if(x)visit(at-1);
   if(x+1<this.width)visit(at+1);
   if(y)visit(at-this.width);
   if(y+1<this.height)visit(at+this.width);
  }
 }
 render():ImageData{
  for(let i=0;i<this.filled.length;i++){
   const at=i*4;
   this.pixels[at]=43;this.pixels[at+1]=161;this.pixels[at+2]=238;
   this.pixels[at+3]=this.filled[i]?112:0;
  }
  return new ImageData(this.pixels,this.width,this.height);
 }
 /** Allows pure tests without requiring an actual canvas. */
 coverage():Uint8Array<ArrayBuffer>{return this.filled.slice();}
}
