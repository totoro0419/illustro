import type {EditableArtwork,EditablePath} from '@illustro/core';

type Profile='srgb'|'linear-srgb'|'display-p3';
type Color=[number,number,number];

function profile(id:string):Profile|null{
  switch(id.trim().toLowerCase()){
    case 'srgb':case 's-rgb':case 'srgb-iec61966-2.1':case 'srgb iec61966-2.1':return 'srgb';
    case 'linear-srgb':case 'srgb-linear':return 'linear-srgb';
    case 'display-p3':case 'displayp3':return 'display-p3';
    default:return null;
  }
}
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const decode=(v:number)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const encode=(v:number)=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
const float256=Float64Array.from({length:256},(_,i)=>decode(i/255));
const byte4096=Uint8Array.from({length:4097},(_,i)=>Math.round(255*encode(i/4096)));

export function legacyProfileTransform(source:string,target:string){
  if(source===target)return null;
  const from=profile(source),to=profile(target);
  if(!from||!to)throw Error('元と貼り付け先の色設定が異なります。ICCを特定できない旧形式の色は自動で変換できません。');
  if(from===to)return null;
  const matrix=from==='display-p3'?
    [1.2249402,-.2249402,0,-.042057,1.042057,0,-.0196376,-.0786361,1.0982735]:
    to==='display-p3'?[.822462,.177538,0,.0331942,.9668058,0,.0170826,.0723974,.9105199]:null;
  const linearSource=from==='linear-srgb',linearTarget=to==='linear-srgb';
  function color([r,g,b]:Color):Color{
    if(!linearSource){r=decode(r);g=decode(g);b=decode(b);}
    if(matrix)[r,g,b]=[
      matrix[0]!*r+matrix[1]!*g+matrix[2]!*b,
      matrix[3]!*r+matrix[4]!*g+matrix[5]!*b,
      matrix[6]!*r+matrix[7]!*g+matrix[8]!*b,
    ];
    return [r,g,b].map(value=>clamp(linearTarget?value:encode(clamp(value)))) as Color;
  }
  const hex=(value:string)=>'#'+color([1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255) as Color)
    .map(n=>Math.round(n*255).toString(16).padStart(2,'0')).join('');
  async function pixels<T extends Uint8Array|Uint8ClampedArray>(base:T):Promise<T>{
    const out=base.slice() as T;
    const write=linearTarget?(value:number)=>Math.round(255*clamp(value)):
      (value:number)=>byte4096[Math.round(4096*clamp(value))]!;
    const read=linearSource?(value:number)=>value/255:(value:number)=>float256[value]!;
    for(let i=0;i<base.length;i+=4){
      const r=read(base[i]!),g=read(base[i+1]!),b=read(base[i+2]!);
      out[i]=write(matrix?matrix[0]!*r+matrix[1]!*g+matrix[2]!*b:r);
      out[i+1]=write(matrix?matrix[3]!*r+matrix[4]!*g+matrix[5]!*b:g);
      out[i+2]=write(matrix?matrix[6]!*r+matrix[7]!*g+matrix[8]!*b:b);
      if((i&0xfffff)===0xffffc)await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
    return out;
  }
  function path(content:EditablePath):EditablePath{
    const operands=content.booleanOperands;
    return {...content,stroke:hex(content.stroke),fill:content.fill?hex(content.fill):null,
      ...(content.fillRuns?{fillRuns:content.fillRuns.map(run=>({...run,color:hex(run.color)}))}:{}),
      ...(operands?{booleanOperands:{...operands,a:path(operands.a),b:path(operands.b)}}:{})};
  }
  function editable(content:EditableArtwork):EditableArtwork{
    if(content.kind==='path')return path(content);
    if(content.kind==='gradient')return {...content,stops:content.stops.map(stop=>({...stop,color:hex(stop.color)})),
      ...(typeof content.follow==='object'?{follow:path(content.follow)}:{})};
    return {...content,color:hex(content.color),
      ...(content.styleRanges?{styleRanges:content.styleRanges.map(range=>range.color?{...range,color:hex(range.color)}:range)}:{})};
  }
  return {color,hex,pixels,editable};
}
