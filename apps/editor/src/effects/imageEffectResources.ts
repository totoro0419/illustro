type Triplet=readonly [number,number,number];
type ColorTable=Readonly<{kind:'colorTable';name:string;size:number;dimension:1|3;min:Triplet;max:Triplet;bytes:string}>;
type Displacement=Readonly<{kind:'displacement';name:string;width:number;height:number;bytes:string}>;
export type EffectResource=ColorTable|Displacement;
type Bytes=Uint8Array|Uint8ClampedArray;

const bounded=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const cleanName=(name:string)=>name.replace(/[\u0000-\u001f]/g,'').trim().slice(0,120)||'参照データ';
function asBase64(bytes:Bytes){
  const parts:string[]=[];
  for(let i=0;i<bytes.length;i+=8192)parts.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
  return btoa(parts.join(''));
}
const fromBase64=(data:string)=>Uint8Array.from(atob(data),c=>c.charCodeAt(0));

export function validateEffectResource(input:unknown,kind:EffectResource['kind']):EffectResource|null{
  if(!input||typeof input!=='object')return null;
  const item=input as Record<string,unknown>;
  if(item.kind!==kind||typeof item.name!=='string'||!item.name||item.name.length>120||typeof item.bytes!=='string')return null;
  const {name,bytes}=item;
  const hasBytes=(length:number)=>bytes.length===Math.ceil(length/3)*4&&
    /^[A-Za-z0-9+/]*(?:==|=)?$/.test(bytes)&&
    (length%3===0?!bytes.endsWith('='):length%3===1?bytes.endsWith('=='):bytes.endsWith('=')&&!bytes.endsWith('=='));
  if(kind==='colorTable'){
    const {size,dimension,min,max}=item;
    const triplet=(value:unknown):value is Triplet=>Array.isArray(value)&&value.length===3&&value.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=100);
    if(typeof size!=='number'||!Number.isInteger(size)||size<2||
      dimension!==1&&dimension!==3||size>(dimension===3?33:4096)||!triplet(min)||!triplet(max)||
      !min.every((v,i)=>v<max[i]!)||!hasBytes(size**dimension*3))return null;
    return {kind,name,bytes,size,dimension,min:[...min],max:[...max]};
  }
  const {width,height}=item;
  const side=(n:unknown):n is number=>typeof n==='number'&&Number.isInteger(n)&&n>=1&&n<=256;
  if(!side(width)||!side(height)||!hasBytes(width*height*2))return null;
  return {kind,name,bytes,width,height};
}

export function parseCube(text:string,name:string):ColorTable{
  if(text.length>4_194_304)throw Error('LUTファイルは4MBまでです。');
  let size=0,dimension:1|3=3,min:Triplet=[0,0,0],max:Triplet=[1,1,1];
  let bytes:Uint8Array|undefined,offset=0;
  for(const raw of text.replace(/^\uFEFF/,'').split(/\r?\n/)){
    const line=raw.replace(/#.*$/,'').trim();if(!line)continue;
    const [label,...fields]=line.split(/\s+/);
    if(label==='TITLE')continue;
    if(label==='DOMAIN_MIN'||label==='DOMAIN_MAX'){
      const triplet=fields.map(Number);
      if(triplet.length!==3||!triplet.every(v=>Number.isFinite(v)&&Math.abs(v)<=100))throw Error('LUTの入力範囲が正しくありません。');
      if(label==='DOMAIN_MIN')min=triplet as unknown as Triplet;
      else max=triplet as unknown as Triplet;
      continue;
    }
    if(label==='LUT_1D_SIZE'||label==='LUT_3D_SIZE'){
      if(bytes||fields.length!==1)throw Error('1つの色変換表を含む .cube を選んでください。');
      size=Number(fields[0]);dimension=label==='LUT_1D_SIZE'?1:3;
      if(!Number.isInteger(size)||size<2||size>(dimension===3?33:4096))throw Error('LUTは3Dで33段階、1Dで4096段階までです。');
      bytes=new Uint8Array(size**dimension*3);continue;
    }
    const values=[label,...fields].map(Number);
    if(!bytes||values.length!==3||!values.every(Number.isFinite)||offset+3>bytes.length)throw Error('LUTの色変換表が正しくありません。');
    for(const value of values)bytes[offset++]=Math.round(255*bounded(value,0,1));
  }
  if(!bytes||offset!==bytes.length||!min.every((v,i)=>v<max[i]!))throw Error('LUTの入力範囲または色数が正しくありません。');
  return {kind:'colorTable',name:cleanName(name),size,dimension,min,max,bytes:asBase64(bytes)};
}

export async function readDisplacementImage(file:File):Promise<Displacement>{
  if(file.size>16*1024*1024||!/^image\/(?:png|jpeg|webp)$/.test(file.type))throw Error('16MB以内のPNG、JPEG、WebPを選んでください。');
  const image=await createImageBitmap(file);
  try{
    const ratio=Math.min(1,256/Math.max(image.width,image.height));
    const width=Math.max(1,Math.round(image.width*ratio)),height=Math.max(1,Math.round(image.height*ratio));
    const canvas=Object.assign(document.createElement('canvas'),{width,height}),ctx=canvas.getContext('2d');
    if(!ctx)throw Error('変位用の画像を開けません。');
    ctx.fillStyle='#808080';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
    const rgba=ctx.getImageData(0,0,width,height).data,data=new Uint8Array(width*height*2);
    for(let p=0;p<width*height;p++){data[p*2]=rgba[p*4]!;data[p*2+1]=rgba[p*4+1]!;}
    return {kind:'displacement',name:cleanName(file.name),width,height,bytes:asBase64(data)};
  }finally{image.close();}
}

export function applyColorTable(source:Bytes,table:ColorTable){
  const {size,dimension,min,max}=table,bytes=fromBase64(table.bytes),out=new Uint8ClampedArray(source);
  const coords=Array.from({length:3},(_,ch)=>Float32Array.from({length:256},(_,v)=>bounded((v/255-min[ch]!)/(max[ch]!-min[ch]!),0,1)*(size-1)));
  const axis=(value:number)=>Math.min(size-2,Math.floor(value));
  const interpolate=(a:number,b:number,t:number)=>a+(b-a)*t;
  for(let i=0;i<source.length;i+=4){
    if(!source[i+3])continue;
    const r=coords[0]![source[i]!]!,g=coords[1]![source[i+1]!]!,b=coords[2]![source[i+2]!]!;
    const ri=axis(r),gi=axis(g),bi=axis(b);
    for(let ch=0;ch<3;ch++){
      if(dimension===1){
        const p=ch===0?r:ch===1?g:b,q=axis(p),at=q*3+ch;
        out[i+ch]=interpolate(bytes[at]!,bytes[at+3]!,p-q);
        continue;
      }
      const base=(ri+gi*size+bi*size*size)*3+ch,green=size*3,blue=green*size;
      const row=(offset:number)=>interpolate(bytes[base+offset]!,bytes[base+offset+3]!,r-ri);
      out[i+ch]=interpolate(interpolate(row(0),row(green),g-gi),interpolate(row(blue),row(blue+green),g-gi),b-bi);
    }
  }
  return out;
}

export function applyDisplacement(source:Bytes,width:number,height:number,map:Displacement,horizontal:number,vertical:number,edge:number,tile:boolean){
  const out=new Uint8ClampedArray(source.length),bytes=fromBase64(map.bytes);
  const wrap=(p:number,length:number)=>((p%length)+length)%length;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=tile?x%map.width:Math.floor(x*map.width/width),v=tile?y%map.height:Math.floor(y*map.height/height);
    const spot=(v*map.width+u)*2;
    let sx=Math.round(x+(bytes[spot]!-128)*horizontal/127),sy=Math.round(y+(bytes[spot+1]!-128)*vertical/127);
    if(edge===1&&(sx<0||sy<0||sx>=width||sy>=height))continue;
    sx=edge===0?wrap(sx,width):bounded(sx,0,width-1);
    sy=edge===0?wrap(sy,height):bounded(sy,0,height-1);
    const sample=(sy*width+sx)*4,to=(y*width+x)*4;
    for(let c=0;c<4;c++)out[to+c]=source[sample+c]!;
  }
  return out;
}
