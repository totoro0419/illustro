/** C06 pixel-derived selection. Transparent pixels are never treated as white. */
import type {MaskData} from './mask';
export type AnalyzeOptions=Readonly<{
  action:'color'|'brightness'|'alpha';
  width:number;height:number;seedX:number;seedY:number;
  tolerance:number;connected:boolean;brightnessMin:number;brightnessMax:number;
}>;
export function selectFromPixels(pixels:Uint8ClampedArray|Uint8Array,options:AnalyzeOptions):MaskData{
  const {width,height,action,tolerance,connected}=options;
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
    width*height>64_000_000||pixels.length!==width*height*4)throw Error('選択対象の画像データが正しくありません。');
  const n=width*height,alpha=new Uint8Array(n);
  const x=Math.max(0,Math.min(width-1,Math.floor(options.seedX))),
    y=Math.max(0,Math.min(height-1,Math.floor(options.seedY))),seed=y*width+x;
  const s=seed*4,target=[pixels[s]!,pixels[s+1]!,pixels[s+2]!,pixels[s+3]!];
  const toleranceValue=Math.max(0,Math.min(100,tolerance))*2.55;
  const brightnessMin=Math.max(0,Math.min(255,options.brightnessMin));
  const brightnessMax=Math.max(brightnessMin,Math.min(255,options.brightnessMax));
  function match(i:number){
    const offset=i*4,r=pixels[offset]!,g=pixels[offset+1]!,b=pixels[offset+2]!,a=pixels[offset+3]!;
    if(action==='alpha')return a;
    if(action==='brightness'){
      if(a===0)return 0;
      const v=.2126*r+.7152*g+.0722*b;
      return v>=brightnessMin&&v<=brightnessMax?a:0;
    }
    // Alpha is an independent channel: a transparent background is not white.
    const colorDistance=Math.sqrt(((r-target[0]!)**2+(g-target[1]!)**2+(b-target[2]!)**2)/3);
    const channelDistance=Math.max(colorDistance,Math.abs(a-target[3]!));
    if(channelDistance>toleranceValue)return 0;
    const edge=toleranceValue?Math.min(1,(toleranceValue-channelDistance)/Math.max(1,toleranceValue*.2)):1;
    return Math.round(255*edge);
  }
  if(!connected||action==='alpha'){
    for(let i=0;i<n;i++)alpha[i]=match(i);
    return {width,height,alpha};
  }
  const checked=new Uint8Array(n),queue=new Uint32Array(n);
  let front=0,back=1;queue[0]=seed;checked[seed]=1;
  while(front<back){
    const current=queue[front++]!,weight=match(current);
    if(!weight)continue;
    alpha[current]=weight;
    const px=current%width,py=Math.floor(current/width);
    const add=(i:number)=>{
      if(checked[i])return;
      checked[i]=1;queue[back++]=i;
    };
    if(px>0)add(current-1);
    if(px<width-1)add(current+1);
    if(py>0)add(current-width);
    if(py<height-1)add(current+width);
  }
  return {width,height,alpha};
}
