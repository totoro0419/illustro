import type {RGB,Speck} from './analyze';

export function findBackgroundSpecks(source:Uint8Array,width:number,height:number,maxArea:number,coverage?:Uint8Array){
  const size=width*height,spots:Speck[]=[];
  if(width<3||height<3)return {spots,capped:false};
  const edge=[[],[],[]] as [number[],number[],number[]];
  for(let i=0;i<128;i++){
    const x=Math.round(i*(width-1)/127),y=Math.round(i*(height-1)/127);
    for(const p of [x,(height-1)*width+x,y*width,y*width+width-1]){
      if(source[p*4+3]!<248)continue;
      for(let ch=0;ch<3;ch++)edge[ch]!.push(source[p*4+ch]!);
    }
  }
  if(edge[0].length<256)return {spots,capped:false};
  const paper=edge.map(values=>{values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)]!;}) as unknown as RGB;
  let matching=0;
  for(let i=0;i<edge[0].length;i++){
    // Components are sorted independently. Use a robust interquartile spread
    // rather than treating the original border as uniformly clean.
    if(edge.every((channel,ch)=>Math.abs(channel[i]!-paper[ch]!)<=12))matching++;
  }
  if(matching<edge[0].length*.75)return {spots,capped:false};
  const foreground=new Uint8Array(size);
  for(let p=0;p<size;p++){
    const i=p*4;
    if(source[i+3]!<248){foreground[p]=2;continue;}
    const delta=Math.max(Math.abs(source[i]!-paper[0]),Math.abs(source[i+1]!-paper[1]),Math.abs(source[i+2]!-paper[2]));
    if(delta>14)foreground[p]=1;
  }
  const queue=new Uint32Array(size);
  for(let start=0;start<size;start++){
    if(foreground[start]!==1)continue;
    let end=0,isolated=true,sx=0,sy=0,minX=width,minY=height,maxX=0,maxY=0;
    function enqueue(p:number){foreground[p]=3;queue[end++]=p;}
    enqueue(start);
    for(let i=0;i<end;i++){
      const p=queue[i]!,x=p%width,y=Math.floor(p/width);
      if(x===0||y===0||x===width-1||y===height-1||coverage&&coverage[p]!==255)isolated=false;
      sx+=x;sy+=y;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      for(let cy=Math.max(0,y-1);cy<=Math.min(height-1,y+1);cy++)for(let cx=Math.max(0,x-1);cx<=Math.min(width-1,x+1);cx++){
        const next=cy*width+cx;
        if(foreground[next]===1)enqueue(next);
        else if(foreground[next]===2)isolated=false;
      }
    }
    const w=maxX-minX+1,h=maxY-minY+1;
    if(!isolated||end>maxArea||Math.max(w,h)>Math.max(2,2*Math.min(w,h)))continue;
    if(spots.length===32)return {spots,capped:true};
    spots.push({pixels:queue.slice(0,end),x:Math.round(sx/end),y:Math.round(sy/end),fill:[...paper,255]});
  }
  return {spots,capped:false};
}
