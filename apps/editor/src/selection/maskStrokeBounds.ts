import type {StrokeRecord} from '@illustro/brush-rt';
import type {MaskData} from './mask';

/** Conservative fast rejection before a selected stroke reads every occupied
 * GPU tile. A false result must never discard ink that could reach the mask.
 * Long diagonal strokes inspect a narrow segment envelope, not its huge box. */
export function selectedStrokeMayAffectMask(mask:MaskData,records:readonly StrokeRecord[]):boolean{
  const {width,height,alpha}=mask;
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
    alpha.length!==width*height)return true;
  const budget=1_048_576;
  let examined=0;
  const clamp=(value:number)=>Math.max(0,Math.min(1,value));
  for(const record of records)for(const command of record.commands){
    const x=command[0],y=command[1],size=command[2];
    const mode=command[19]??0;
    const connected=mode>0;
    const ax=connected?(command[16]??x):x,ay=connected?(command[17]??y):y;
    const extra=command[18]??0;
    if(![x,y,size,ax,ay,extra,mode].every(value=>typeof value==='number'&&Number.isFinite(value))||
      size!<0||extra<0)return true; // Unexpected commands must use the exact path.
    // Use the same conservative footprint as the previous box check.
    const radius=Math.max(size!/2,extra)*(connected?1:Math.SQRT2)+4;
    if(!Number.isFinite(radius))return true;
    const top=Math.max(0,Math.floor(Math.min(y!,ay!)-radius));
    const bottom=Math.min(height,Math.ceil(Math.max(y!,ay!)+radius));
    if(top>=bottom)continue;
    const lower=ay!<=y!?{x:ax!,y:ay!}:{x:x!,y:y!};
    const upper=ay!<=y!?{x:x!,y:y!}:{x:ax!,y:ay!};
    const dy=upper.y-lower.y,dx=upper.x-lower.x;
    if(!Number.isFinite(dy)||!Number.isFinite(dx))return true;
    for(let row=top;row<bottom;row++){
      // Every possible brush point within this row's vertical radius has
      // an X coordinate between these endpoints (including horizontal lines).
      const t0=dy?clamp((row+.5-radius-lower.y)/dy):0;
      const t1=dy?clamp((row+.5+radius-lower.y)/dy):1;
      const x0=lower.x+dx*t0;
      const x1=lower.x+dx*t1;
      if(!Number.isFinite(x0)||!Number.isFinite(x1))return true;
      const left=Math.max(0,Math.floor(Math.min(x0,x1)-radius));
      const right=Math.min(width,Math.ceil(Math.max(x0,x1)+radius));
      if(left>=right)continue;
      examined+=right-left;
      if(examined>budget)return true; // Never replace GPU work with a full-frame scan.
      // Scan in place: a 4K diagonal should not allocate one subarray per row.
      const start=row*width+left,end=row*width+right;
      for(let index=start;index<end;index++)if(alpha[index]!==0)return true;
    }
  }
  return false;
}
