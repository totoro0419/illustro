import type {GradientMap} from '@illustro/core';
import {gradientMapIndex,gradientMapTable} from '@illustro/brush-rt';

/** Inspect exact tone lookup steps independently from the downscaled artwork
 * preview. A tone ramp has 256 input levels; spatial dithering may still
 * change which level is used at other canvas coordinates. */
export function gradientToneInspection(map:GradientMap,tone:number){
 const table=gradientMapTable(map),step=Math.max(0,Math.min(255,Math.round(tone)));
 const sampled=(n:number)=>{
   const entry=gradientMapIndex(map,n/255,0,0)*4;
   return Array.from(table.subarray(entry,entry+4)) as number[];
 };
 const rgba=sampled(step);
 const previous=sampled(Math.max(0,step-1));
 const next=sampled(Math.min(255,step+1));
 const difference=(a:readonly number[],b:readonly number[])=>a.reduce((m,v,i)=>Math.max(m,Math.abs(v-b[i]!)),0);
 let transitions=0;
 for(let i=1;i<256;i++){
   const a=gradientMapIndex(map,i/255,0,0)*4,b=gradientMapIndex(map,(i-1)/255,0,0)*4;
   if(table[a]!==table[b]||table[a+1]!==table[b+1]||table[a+2]!==table[b+2]||table[a+3]!==table[b+3])
     transitions++;
 }
 return {tone:step,rgba,previousDifference:difference(rgba,previous),
   nextDifference:difference(rgba,next),transitions};
}
