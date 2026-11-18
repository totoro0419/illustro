import type {StrokeRecord} from '@illustro/brush-rt';
import type {MaskData} from './mask';

/** Conservative fast rejection before a selected stroke reads every occupied
 * GPU tile. False means no brush command can reach a selected pixel; true
 * leaves the existing exact Worker brush calculation in charge. */
export function selectedStrokeMayAffectMask(mask:MaskData,records:readonly StrokeRecord[]):boolean{
  const {width,height,alpha}=mask;
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
    alpha.length!==width*height)return true;
  let left=width,top=height,right=0,bottom=0,commands=0;
  for(const record of records)for(const command of record.commands){
    const x=command[0],y=command[1],size=command[2];
    const connected=(command[19]??0)>0;
    const ax=connected?(command[16]??x):x,ay=connected?(command[17]??y):y;
    const extra=command[18]??0;
    if(![x,y,size,ax,ay,extra].every(value=>typeof value==='number'&&Number.isFinite(value)))
      return true; // Never reject a stroke with unexpected brush data.
    // Match the selection tile worker's command footprint with a further
    // safety margin; false positives cost readback, false negatives lose ink.
    const radius=Math.max(size!/2,extra)*(connected?1:Math.SQRT2)+4;
    if(!Number.isFinite(radius))return true;
    left=Math.min(left,Math.max(0,Math.floor(Math.min(x!,ax!)-radius)));
    top=Math.min(top,Math.max(0,Math.floor(Math.min(y!,ay!)-radius)));
    right=Math.max(right,Math.min(width,Math.ceil(Math.max(x!,ax!)+radius)));
    bottom=Math.max(bottom,Math.min(height,Math.ceil(Math.max(y!,ay!)+radius)));
    commands++;
  }
  if(!commands||left>=right||top>=bottom)return false;
  // Never turn a conservative optimization into another full-frame scan.
  // Large or diagonal strokes proceed to the existing exact Worker path.
  if((right-left)*(bottom-top)>1_048_576)return true;
  for(let y=top;y<bottom;y++)
    if(alpha.subarray(y*width+left,y*width+right).some(value=>value!==0))return true;
  return false;
}
