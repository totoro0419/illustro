import {selectFromExamples,type SelectionExample} from './exampleSelection';
export type RGB=readonly [number,number,number];
export type Speck=Readonly<{pixels:Uint32Array;x:number;y:number}>;
export type AssistRequest=Readonly<{
  width:number;height:number;source:Uint8Array;coverage?:Uint8Array;
}> & (
  | {kind:'area';x:number;y:number;tolerance:number;examples?:readonly SelectionExample[];confidence?:number}
  | {kind:'color';palette:readonly RGB[];strength:number;style:'tone'|'accent'}
  | {kind:'specks';maxArea:number}
);
export type AssistResult=
  | {kind:'area';alpha:Uint8Array<ArrayBuffer>;count:number}
  | {kind:'color';pixels:Uint8ClampedArray<ArrayBuffer>;count:number}
  | {kind:'specks';spots:readonly Speck[];capped:boolean};

export const ANALYSIS_MAX_PIXELS=16_777_216;
const lum=(r:number,g:number,b:number)=>.2126*r+.7152*g+.0722*b;
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

export function analyzeImage(request:AssistRequest):AssistResult{
  const {width,height,source,coverage}=request,size=width*height;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||size>ANALYSIS_MAX_PIXELS||
    source.length!==size*4||coverage&&coverage.length!==size)throw Error('解析する画像の大きさが正しくありません。');
  if(request.kind==='area'){
    if(request.examples)return {kind:'area',...selectFromExamples(source,width,height,request.examples,request.confidence??50,coverage)};
    if(!Number.isFinite(request.x+request.y+request.tolerance))throw Error('中央の見本画像から起点を選んでください。');
    const x=clamp(Math.floor(request.x),0,width-1),y=clamp(Math.floor(request.y),0,height-1);
    const seed=y*width+x,s=seed*4,t=clamp(request.tolerance,1,255)**2;
    const rgbWeight=source[s+3]!/255,mask=new Uint8Array(size),seen=new Uint8Array(size);
    const queue=new Uint32Array(size);let end=0;
    function enqueue(index:number,previous:number){
      if(seen[index]||coverage?.[index]===0)return;
      const i=index*4,p=previous*4,a=source[i+3]!,w=Math.min(rgbWeight,a/255);
      // Both the seed and the last accepted neighbor limit leakage through
      // gradual antialiasing and transparent pixels.
      const distance=(from:number)=>(source[i+3]!-source[from+3]!)**2+
        w*(.25*(source[i]!-source[from]!)**2+.5*(source[i+1]!-source[from+1]!)**2+.25*(source[i+2]!-source[from+2]!)**2);
      if(distance(s)>t||distance(p)>t*.8)return;
      seen[index]=1;mask[index]=coverage?.[index]??255;queue[end++]=index;
    }
    enqueue(seed,seed);
    for(let i=0;i<end;i++){
      const p=queue[i]!,px=p%width;
      if(px>0)enqueue(p-1,p);if(px<width-1)enqueue(p+1,p);
      if(p>=width)enqueue(p-width,p);if(p<size-width)enqueue(p+width,p);
    }
    return {kind:'area',alpha:mask,count:end};
  }
  if(request.kind==='color'){
    const palette=request.palette.slice(0,64).filter(color=>color.length===3&&color.every(c=>Number.isFinite(c)&&c>=0&&c<=255));
    if(palette.length<2||!Number.isFinite(request.strength))throw Error('2色以上のパレットと適用の強さを指定してください。');
    const entries=palette.map(rgb=>({rgb,l:lum(...rgb)})).sort((a,b)=>a.l-b.l);
    const first=entries[0]!,last=entries.at(-1)!,strength=clamp(request.strength,0,1);
    const result=new Uint8ClampedArray(source.length);let count=0;
    // The 256-entry table keeps the tonal ordering of the selected palette.
    const tones=Array.from({length:256},(_,value)=>{
      const mapped=first.l+(last.l-first.l)*value/255;
      const rightIndex=entries.findIndex(stop=>stop.l>=mapped),right=entries[rightIndex]??last,left=entries[rightIndex-1]??first;
      const fraction=right.l>left.l?(mapped-left.l)/(right.l-left.l):0;
      return left.rgb.map((c,ch)=>c+(right.rgb[ch]!-c)*fraction);
    });
    for(let p=0;p<size;p++){
      const i=p*4,a=source[i+3]!,m=(coverage?.[p]??255)/255;
      if(!a||!m||!strength)continue;
      const y=Math.round(lum(source[i]!,source[i+1]!,source[i+2]!)),target=tones[y]!;
      const effective=strength*(request.style==='accent'?(1-Math.abs(y-127.5)/127.5)*.85+.15:1);
      for(let c=0;c<3;c++)result[i+c]=target[c]!*(request.style==='accent'?.8:1)+
        (request.style==='accent'?source[i+c]!*.2:0);
      result[i+3]=a*m*effective;
      if(result[i+3])count++;
    }
    return {kind:'color',pixels:result,count};
  }
  const maxArea=clamp(Math.floor(request.maxArea),1,48);
  const seen=new Uint8Array(size),queue=new Uint32Array(size),spots:Speck[]=[];
  let capped=false;
  for(let start=0;start<size;start++){
    if(seen[start]||!source[start*4+3])continue;
    let end=0,contained=true,sx=0,sy=0;
    function enqueue(p:number){
      if(seen[p]||!source[p*4+3])return;
      if(coverage&&coverage[p]!==255)contained=false;
      seen[p]=1;queue[end++]=p;
    }
    enqueue(start);
    for(let i=0;i<end;i++){
      const p=queue[i]!,x=p%width,y=Math.floor(p/width);
      sx+=x;sy+=y;
      if(x===0||y===0||x===width-1||y===height-1)contained=false;
      // Include diagonally touching ink so that a tapered line endpoint is
      // never split from its parent just because it joins at a corner.
      for(let cy=Math.max(0,y-1);cy<=Math.min(height-1,y+1);cy++)
        for(let cx=Math.max(0,x-1);cx<=Math.min(width-1,x+1);cx++)enqueue(cy*width+cx);
    }
    if(end>maxArea||!contained)continue;
    if(spots.length===32){capped=true;break;}
    spots.push({pixels:queue.slice(0,end),x:Math.round(sx/end),y:Math.round(sy/end)});
  }
  return {kind:'specks',spots,capped};
}
