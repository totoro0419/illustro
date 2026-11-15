import type {SemanticOperation} from '@illustro/core';
/** A cached image may be extended only along the same effective operation prefix. */
export function canExtendProjection(cached:readonly Pick<SemanticOperation,'key'|'kind'>[],current:readonly Pick<SemanticOperation,'key'|'kind'>[]){
 if(cached.length>current.length||cached.some((op,i)=>op.key.transactionId!==current[i]?.key.transactionId||op.key.operationOrdinal!==current[i]?.key.operationOrdinal))return false;
 // Geometry changes need materialized base pixels, not a stroke-only extension.
 return current.slice(cached.length).every(op=>op.kind==='brush.stroke'||op.kind==='layer.add-raster');
}
