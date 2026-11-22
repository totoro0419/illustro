export type WetMode='blur'|'smudge'|'mix'|'water'|'oil'|'pastel'|'clone'|'heal'|'patch';
export type Point=Readonly<{x:number;y:number;pressure?:number}>;
export type Area=Readonly<{x:number;y:number;width:number;height:number}>;
export type Patch=Readonly<{area:Area;pixels:Uint8ClampedArray}>;
export type WetSettings=Readonly<{
  mode:WetMode;size:number;strength:number;pigment:number;diffusion:number;edge:number;grain:number;
  paperScale:number;absorb:number;thickness:number;color:readonly number[];
}>;
export type WetJob=Readonly<{
  destination:Patch;reference:Patch|null;selection:Uint8Array|null;points:readonly Point[];
  offset:Point;alphaLocked:boolean;settings:WetSettings;
}>;
type Sample=readonly [number,number,number,number]; // premultiplied RGB, alpha in 0..1
const clear:Sample=[0,0,0,0];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const int=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(n)));
const mix=(a:Sample,b:Sample,t:number):Sample=>[
  a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t,
];
export const needsSource=(mode:WetMode)=>mode==='clone'||mode==='heal'||mode==='patch';
export const defaultWet:WetSettings={mode:'smudge',size:36,strength:.65,pigment:.45,diffusion:.4,edge:.35,grain:.25,paperScale:3,absorb:.45,thickness:.5,color:[0,0,0]};

export function strokeArea(points:readonly Point[],padding:number,width:number,height:number):Area|null{
  if(!points.length)return null;
  const x=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x))-padding));
  const y=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y))-padding));
  const right=Math.min(width,Math.ceil(Math.max(...points.map(p=>p.x))+padding));
  const bottom=Math.min(height,Math.ceil(Math.max(...points.map(p=>p.y))+padding));
  return right>x&&bottom>y?{x,y,width:right-x,height:bottom-y}:null;
}

export function tileAlignedArea(area:Area,width:number,height:number,size:number):Area{
  const x=Math.floor(area.x/size)*size,y=Math.floor(area.y/size)*size;
  return {x,y,width:Math.min(width,Math.ceil((area.x+area.width)/size)*size)-x,
    height:Math.min(height,Math.ceil((area.y+area.height)/size)*size)-y};
}

function sample(patch:Patch,x:number,y:number):Sample{
  const {area,pixels}=patch;
  const xx=Math.floor(x)-area.x,yy=Math.floor(y)-area.y;
  if(xx<0||yy<0||xx>=area.width||yy>=area.height)return clear;
  const i=(yy*area.width+xx)*4,a=pixels[i+3]!/255;
  return [pixels[i]!/255*a,pixels[i+1]!/255*a,pixels[i+2]!/255*a,a];
}

function average(patch:Patch,x:number,y:number,r:number):Sample{
  const out=[0,0,0,0];
  for(const [dx,dy] of [[0,0],[-r,0],[r,0],[0,-r],[0,r]] as const){
    const src=sample(patch,x+dx,y+dy);
    for(let i=0;i<4;i++)out[i]=out[i]!+src[i]!/5;
  }
  return [out[0]!,out[1]!,out[2]!,out[3]!];
}

function write(pixels:Uint8ClampedArray,index:number,value:Sample,lock:boolean):boolean{
  const alpha=lock?pixels[index+3]!:Math.round(clamp(value[3])*255);
  if(lock&&(!alpha||value[3]<=0))return false;
  const encode=(c:number)=>alpha&&value[3]>0?Math.round(clamp(c/value[3])*255):0;
  const r=encode(value[0]),g=encode(value[1]),b=encode(value[2]);
  if(pixels[index]===r&&pixels[index+1]===g&&pixels[index+2]===b&&pixels[index+3]===alpha)return false;
  pixels[index]=r;pixels[index+1]=g;pixels[index+2]=b;pixels[index+3]=alpha;return true;
}

function sourceOver(base:Sample,source:Sample,t:number):Sample{
  const rest=1-source[3]*t;
  return [base[0]*rest+source[0]*t,base[1]*rest+source[1]*t,base[2]*rest+source[2]*t,base[3]*rest+source[3]*t];
}

function paper(x:number,y:number,scale:number){
  let code=Math.imul(Math.floor(x/scale)+731,0x753d0bf9)^Math.imul(Math.floor(y/scale)-417,0x37d3937b);
  code=Math.imul(code^(code>>>16),0x45d9f3b);
  return ((code^(code>>>16))>>>0)/4294967295;
}

function* dabs(points:readonly Point[],spacing:number){
  const first=points[0];if(!first)return;
  yield first;
  let from=first,remaining=spacing;
  for(const to of points.slice(1)){
    const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy);
    let distance=remaining;
    while(distance<=len){
      const f=distance/len,p=from.pressure??1;
      yield {x:from.x+f*dx,y:from.y+f*dy,pressure:p+f*((to.pressure??1)-p)};
      distance+=spacing;
    }
    remaining=distance-len;from=to;
  }
  if(remaining<spacing/2)yield from;
}

export function paintWet(job:WetJob):Readonly<{pixels:Uint8ClampedArray;changed:boolean}>{
  const {destination,reference,points,offset,selection,alphaLocked,settings}=job;
  const {area,pixels}=destination;
  if(pixels.length!==area.width*area.height*4||selection&&selection.length*4!==pixels.length)throw Error('描画範囲と画素が一致しません。');
  if(needsSource(settings.mode)&&!reference)throw Error('採取元の画素を読み込めません。');
  const {mode,size,strength,pigment,diffusion,edge,grain,paperScale,absorb,thickness,color}=settings;
  const out=new Uint8ClampedArray(pixels),dest={area,pixels:out},source=reference??destination;
  const radius=size/2,sampleStep=Math.max(1,Math.round(radius*.45));
  const pigmentColor:Sample=[(color[0]??0)/255,(color[1]??0)/255,(color[2]??0)/255,1];
  let changed=false,work=0;
  function cell(x:number,y:number,distance:number,drag:Point,carried:Sample){
    const index=(y-area.y)*area.width+x-area.x,at=index*4;
    const mask=(selection?.[index]??255)/255;if(!mask)return;
    const old=sample(dest,x,y);
    const falloff=clamp((1-distance)/(mode==='patch'?Math.max(.05,1-edge):.6));
    const weight=clamp(strength*falloff*mask);
    let value:Sample;
    if(mode==='clone'||mode==='heal'||mode==='patch'){
      const donor=sample(source,x+offset.x,y+offset.y);
      if(donor[3]===0)return;
      if(mode==='heal'&&old[3]){
        const neighborhood=average(source,x+offset.x,y+offset.y,sampleStep),target=average(destination,x,y,sampleStep);
        const tone=(i:number)=>clamp(donor[i]!/donor[3]-(neighborhood[3]?neighborhood[i]!/neighborhood[3]:0)+
          (target[3]?target[i]!/target[3]:old[i]!/old[3]))*donor[3];
        value=sourceOver(old,[tone(0),tone(1),tone(2),donor[3]],weight);
      }else value=sourceOver(old,donor,weight);
    }else if(mode==='blur')value=mix(old,average(source,x,y,sampleStep),weight);
    else if(mode==='smudge')value=mix(old,mix(sample(reference??dest,x-drag.x*.85,y-drag.y*.85),carried,.4),weight);
    else {
      const textured=mode==='water'||mode==='oil'||mode==='pastel';
      const noise=textured?paper(x,y,paperScale):.5;
      const dry=mode==='pastel'?clamp((noise-absorb*.78)*2):1;
      const spread=mode==='water'?clamp((1-distance)*(1+2*diffusion)):1;
      const rim=mode==='water'?1+edge*Math.max(0,1-Math.abs(distance-.78)*6):1;
      const texture=textured?(1-grain+grain*noise)*dry:1;
      const ink=mode==='oil'?mix(pigmentColor,[1,1,1,1],thickness*.18*(1-distance)):pigmentColor;
      const retrieved=mode==='water'?average(source,x,y,Math.max(1,Math.round(diffusion*sampleStep))):carried;
      const paint=sourceOver(retrieved,ink,clamp(pigment*spread*rim*texture));
      value=sourceOver(old,paint,weight*(mode==='water'?(.45-.25*absorb):.65));
    }
    changed=write(out,at,value,alphaLocked)||changed;
  }

  if(mode==='patch'){
    const from=points[0],to=points.at(-1);
    if(!from||!to)return {pixels:out,changed};
    const left=Math.min(from.x,to.x),top=Math.min(from.y,to.y);
    const width=Math.max(1,Math.abs(to.x-from.x)),height=Math.max(1,Math.abs(to.y-from.y));
    for(let y=Math.max(area.y,Math.floor(top));y<Math.min(area.y+area.height,top+height);y++)
      for(let x=Math.max(area.x,Math.floor(left));x<Math.min(area.x+area.width,left+width);x++){
        const d=Math.max(Math.abs((x+.5-left)/width-.5),Math.abs((y+.5-top)/height-.5))*2;
        cell(x,y,d,{x:0,y:0},clear);
      }
    return {pixels:out,changed};
  }

  let previous=points[0]??{x:0,y:0},carried=sample(source,previous.x,previous.y);
  for(const dab of dabs(points,Math.max(.9,radius*.5))){
    const r=Math.max(.65,radius*(.4+.6*clamp(dab.pressure??1)));
    const drag={x:dab.x-previous.x,y:dab.y-previous.y};
    const bounds={x:int(dab.x-r,area.x,area.x+area.width),y:int(dab.y-r,area.y,area.y+area.height),
      endX:int(dab.x+r+1,area.x,area.x+area.width),endY:int(dab.y+r+1,area.y,area.y+area.height)};
    work+=(bounds.endX-bounds.x)*(bounds.endY-bounds.y);
    if(work>14000000)throw Error('一度に処理する範囲が大きすぎます。線を分けてください。');
    for(let y=bounds.y;y<bounds.endY;y++)for(let x=bounds.x;x<bounds.endX;x++){
      const distance=Math.hypot(x+.5-dab.x,y+.5-dab.y)/r;
      if(distance<1)cell(x,y,distance,drag,carried);
    }
    carried=mix(carried,sample(reference??dest,dab.x,dab.y),.2);
    previous=dab;
  }
  return {pixels:out,changed};
}
