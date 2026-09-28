import type { BlockId,LayerId } from './ids';
import type { Revision,CommandOperation } from './history';
import type { DocumentRoot,LayerNode } from './model';
import type { RecoveryEnvelope } from './recovery';
import type { TileKey } from './raster/surface';
import type { DocumentTransaction } from './transaction';
import { CORE_INTERNAL } from './internal';

export type CommitReceipt=Readonly<{
  revision:Revision<DocumentRoot>;changedBlockIds:readonly BlockId[];recovery:RecoveryEnvelope;
}>;

export function commitTransaction(tx:DocumentTransaction):CommitReceipt{
  const v=tx._internal(CORE_INTERNAL),s=v.doc._internal(CORE_INTERNAL);s.history.assertHead(v.base);if(!v.hasChanges())throw new Error('empty transaction');
  const all:Array<{layerId:LayerId;key:TileKey;bytes:Uint8Array}>=[];
  for(const [layerId,w] of v.working)for(const m of w.mutations())all.push({layerId,key:m.key,bytes:m.bytes});
  const ids=s.store.adoptBatch(all.map(x=>x.bytes)),byLayer=new Map<LayerId,Map<TileKey,BlockId>>();
  all.forEach((m,i)=>{const id=ids[i];if(id===undefined)throw new Error('block mismatch');let x=byLayer.get(m.layerId);if(!x){x=new Map();byLayer.set(m.layerId,x);}x.set(m.key,id);});
  const updates=new Map<LayerId,LayerNode>(v.updates);
  for(const [layerId,blocks] of byLayer){const l=updates.get(layerId)??v.root.getLayer(layerId);updates.set(layerId,Object.freeze({...l,surface:l.surface.withBlocks(blocks)}));}
  const root=v.root.withLayers(updates),ops:CommandOperation[]=[];
  for(const [id,w] of v.working)if(w.changedTileCount)ops.push({kind:'raster.tiles',layerId:id,tileCount:w.changedTileCount});
  for(const id of v.updates.keys())ops.push({kind:'layer.metadata',layerId:id});
  const revision=s.history.publish(v.base,v.id,root,{version:1,kind:'core.transaction',label:tx.label,operations:ops},s.clock());
  v.close();
  const recovery=Object.freeze({revisionId:revision.id,parentRevisionId:v.base,transactionId:v.id,changedBlockIds:Object.freeze([...ids])});
  return Object.freeze({revision,changedBlockIds:Object.freeze([...ids]),recovery});
}
