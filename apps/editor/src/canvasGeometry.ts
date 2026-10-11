export type Size={width:number;height:number};
export type Filter='nearest'|'bilinear'|'bicubic'|'lanczos3';
export function validateSize(s:Size){if(!Number.isSafeInteger(s.width)||!Number.isSafeInteger(s.height)||s.width<1||s.height<1||s.width>8192||s.height>8192)throw Error('画像サイズは1～8192px');}
export function canvasResize(p:Uint8Array|Uint8ClampedArray,a:Size,b:Size,dx:number,dy:number){
 validateSize(b);if(p.length!==a.width*a.height*4)throw Error('pixel count mismatch');
 if(!Number.isSafeInteger(dx)||!Number.isSafeInteger(dy))throw Error('invalid offset');
 const out=new Uint8Array(b.width*b.height*4),left=Math.max(0,dx),right=Math.min(b.width,a.width+dx);
 for(let y=Math.max(0,dy);y<Math.min(b.height,a.height+dy);y++)if(right>left){const source=((y-dy)*a.width+left-dx)*4;out.set(p.subarray(source,source+(right-left)*4),(y*b.width+left)*4);}
 return out;
}
export function crop(p:Uint8Array|Uint8ClampedArray,a:Size,x:number,y:number,w:number,h:number){return canvasResize(p,a,{width:w,height:h},-x,-y);}
const sinc=(x:number)=>x===0?1:Math.sin(Math.PI*x)/(Math.PI*x);
function kernel(filter:Filter,x:number){x=Math.abs(x);if(filter==='nearest')return x<.5?1:0;if(filter==='bilinear')return Math.max(0,1-x);if(filter==='lanczos3')return x<3?sinc(x)*sinc(x/3):0;if(x<1)return (1.5*x-2.5)*x*x+1;if(x<2)return ((-.5*x+2.5)*x-4)*x+2;return 0;}
export function imageResize(p:Uint8Array|Uint8ClampedArray,a:Size,b:Size,filter:Filter){
 validateSize(b);if(p.length!==a.width*a.height*4)throw Error('pixel count mismatch');
 if(!(['nearest','bilinear','bicubic','lanczos3'] as string[]).includes(filter))throw Error('invalid filter');
 const out=new Uint8Array(b.width*b.height*4),scaleX=a.width/b.width,scaleY=a.height/b.height;
 const makeTaps=(old:number,now:number,scale:number)=>{
  const taps:[number,number][][]=[],radius=filter==='nearest'?.5:filter==='bilinear'?1:filter==='bicubic'?2:3,spread=Math.max(1,scale);
  for(let q=0;q<now;q++){if(filter==='nearest'){taps.push([[Math.min(old-1,Math.floor((q+.5)*scale)),1]]);continue;}
   const center=(q+.5)*scale-.5,t:[number,number][]=[],lo=Math.max(0,Math.floor(center-radius*spread)),hi=Math.min(old-1,Math.ceil(center+radius*spread));let sum=0;
   for(let i=lo;i<=hi;i++){const w=kernel(filter,(center-i)/spread);if(w){t.push([i,w]);sum+=w;}}taps.push(t.map(([i,w])=>[i,w/sum]));}
  return taps;
 };
 const xs=makeTaps(a.width,b.width,scaleX),ys=makeTaps(a.height,b.height,scaleY);
 for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++){
  let red=0,green=0,blue=0,alpha=0;
  for(const [j,wy] of ys[y]!)for(const [i,wx] of xs[x]!) {const k=(j*a.width+i)*4,w=wy*wx,aa=p[k+3]!/255;alpha+=w*aa;red+=w*aa*p[k]!;green+=w*aa*p[k+1]!;blue+=w*aa*p[k+2]!;}
  const k=(y*b.width+x)*4;out[k+3]=Math.round(Math.max(0,Math.min(1,alpha))*255);
  if(alpha>1e-6){out[k]=Math.round(Math.max(0,Math.min(255,red/alpha)));out[k+1]=Math.round(Math.max(0,Math.min(255,green/alpha)));out[k+2]=Math.round(Math.max(0,Math.min(255,blue/alpha)));}
 }
 return out;
}
