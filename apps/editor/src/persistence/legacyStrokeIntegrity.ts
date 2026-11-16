import type {StrokeRecord} from '@illustro/brush-rt';
import type {SemanticOperation} from '@illustro/core';

/** Strictly compare every surviving stroke's serialized data after save/reopen. */
export function assertLegacyStrokeIntegrity(
  originals:readonly StrokeRecord[],operations:readonly SemanticOperation[],
){
  const strokes=operations.filter(operation=>operation.kind==='brush.stroke');
  if(strokes.length!==originals.length)throw Error('移行後に描線の数が一致しませんでした。');
  for(let i=0;i<originals.length;i++){
    if(!sameJsonValue(originals[i],strokes[i]?.parameters.strokeRecord))
      throw Error('移行後の描線・ブラシ設定が元の作品と一致しません（'+(i+1)+'本目）。');
  }
}

// The legacy source has already been parsed from JSON. Compare without
// serializing entire large brush records into another string in memory.
function sameJsonValue(left:unknown,right:unknown):boolean{
  if(left===right)return true;
  if(left===null||right===null||typeof left!==typeof right||
    typeof left!=='object'||typeof right!=='object')return false;
  if(Array.isArray(left)||Array.isArray(right)){
    if(!Array.isArray(left)||!Array.isArray(right)||left.length!==right.length)return false;
    for(let i=0;i<left.length;i++)if(!sameJsonValue(left[i],right[i]))return false;
    return true;
  }
  const a=left as Record<string,unknown>,b=right as Record<string,unknown>;
  const ka=Object.keys(a).filter(key=>a[key]!==undefined),kb=Object.keys(b).filter(key=>b[key]!==undefined);
  if(ka.length!==kb.length)return false;
  for(const key of ka)if(!Object.prototype.hasOwnProperty.call(b,key)||
    !sameJsonValue(a[key],b[key]))return false;
  return true;
}
