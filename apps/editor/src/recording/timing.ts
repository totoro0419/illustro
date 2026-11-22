export type FramePacing='even'|'recorded'|'compress';

export function frameDurations(times:readonly number[],framesPerSecond:number,pacing:FramePacing,holdSeconds:number){
  const interval=1000/framesPerSecond;
  return times.map((time,index)=>{
    const next=times[index+1];
    if(next===undefined)return interval+holdSeconds*1000;
    if(pacing==='even'||!Number.isFinite(time)||!Number.isFinite(next))return interval;
    const gap=Math.max(0,next-time);
    if(pacing==='recorded')return Math.max(interval,Math.min(6000,gap));
    // Long pauses contribute a little context without delaying the whole replay.
    const compressed=gap<=1500?gap:1500+Math.log2(1+(gap-1500)/1000)*220;
    return Math.max(interval,Math.min(3000,compressed));
  });
}
