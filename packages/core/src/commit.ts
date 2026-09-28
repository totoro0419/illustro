import type { BlockId,LayerId } from './ids';
import type { Revision } from './history';
import type { DocumentRoot,LayerNode } from './model';
import type { RecoveryEnvelope } from './recovery';
import type { TileKey } from './raster/surface';
import type { DocumentTransaction } from './transaction';
import { CORE_INTERNAL } from './internal';

export type CommitReceipt=Readonly<{
  revision:Revision<DocumentRoot>;changedBlockIds:readonly BlockId[];recovery:RecoveryEnvelope;
}>;

export function commitTransaction(tx:DocumentTransaction):CommitReceipt{
  const d=tx.doc,s=d._internal(CORE_INTERNAL);s.history.assertHead(tx.base);if(!tx.hasChanges())throw new Error('empty transaction');
  const all:Array<{layerId:LayerId;key:TileKey;bytes:Uint8Array}>=[];
  for(const [layerId,w] of tx.working)for(const m of w.mutations())all.push({layerId,key:m.key,bytes:m.bytes});
  const ids=s.store.adoptBatch(all.map(x=>x.bytes)),byLayer=new Map<LayerId,Map<TileKey,BlockId>>();
  all.forEach((m,i)=>{const id=ids[i];if(id===undefined)throw new Error('block mismatch');let x=byLayer.get(m.layerId);if(!x){x=new Map();byLayer.set(m.layerId,x);}x.set(m.key,id);});
  const updates=new Map<LayerId,LayerNode>(tx.updates);
  for(const [layerId,blocks] of byLayer){const l=updates.get(layerId)??tx.root.getLayer(layerId);updates.set(layerId,Object.freeze({...l,surface:l.surface.withBlocks(blocks)}));}
  const root=tx.root.withLayers(updates),ops:string[]=[];
  for(const [id,w] of tx.working)if(w.changedTileCount)ops.push('raster:'+id+':'+w.changedTileCount);
  for(const id of tx.updates.keys())ops.push('layer:'+id);
  const revision=s.history.publish(tx.base,tx.id,root,{label:tx.label,operations:ops},s.clock());
  tx.close();
  const recovery=Object.freeze({revisionId:revision.id,parentRevisionId:tx.base,transactionId:tx.id,changedBlockIds:Object.freeze([...ids])});
  return Object.freeze({revision,changedBlockIds:Object.freeze([...ids]),recovery});
}
