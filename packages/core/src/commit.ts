import type {BlockId,LayerId,ResourceId} from './ids';
import {finalizeOperation,type Revision,type SemanticOperation,type SemanticOperationDraft} from './history';
import type {DocumentRoot,LayerNode} from './model';
import type {PersistenceHandoff} from './recovery';
import {CANONICAL_TILE_SIZE,parseTileKey,type TileKey} from './raster/surface';
import type {DocumentTransaction} from './transaction';
import {CORE_INTERNAL} from './internal';

export type CommitReceipt=Readonly<{revision:Revision<DocumentRoot>;changedBlockIds:readonly BlockId[];persistence:PersistenceHandoff}>;
export function commitTransaction(tx:DocumentTransaction):CommitReceipt{
  const v=tx._internal(CORE_INTERNAL),s=v.doc._internal(CORE_INTERNAL);s.history.assertHead(v.base);if(!v.hasChanges())throw new Error('empty transaction');
  const all:Array<{layerId:LayerId;key:TileKey;bytes:Uint8Array}>=[];for(const [layerId,w] of v.working)for(const m of w.mutations())all.push({layerId,key:m.key,bytes:m.bytes});
  const prepared=s.store.prepareBatch(all.map(item=>{const layer=v.updates.get(item.layerId)??v.root.getLayer(item.layerId);return {bytes:item.bytes,descriptor:Object.freeze({sampleEncoding:layer.surface.descriptor.sampleEncoding,bounds:Object.freeze({x0:0,y0:0,x1:CANONICAL_TILE_SIZE,y1:CANONICAL_TILE_SIZE})})};}));
  const byLayer=new Map<LayerId,Map<TileKey,BlockId>>();all.forEach((m,i)=>{const entry=prepared.entries[i];if(!entry)throw new Error('block mismatch');let changes=byLayer.get(m.layerId);if(!changes){changes=new Map();byLayer.set(m.layerId,changes);}changes.set(m.key,entry.id);});
  const updates=new Map<LayerId,LayerNode>(v.updates);for(const [layerId,blocks] of byLayer){const layer=updates.get(layerId)??v.root.getLayer(layerId);updates.set(layerId,Object.freeze({...layer,surface:layer.surface.withBlocks(blocks)}));}
  const operations:SemanticOperation[]=[];
  for(let ordinal=0;ordinal<v.slots.length;ordinal++){const slot=v.slots[ordinal];if(!slot)throw new Error('operation slot mismatch');
    if(slot.type==='working'){const working=v.working.get(slot.layerId);if(!working||!working.changedTileCount)throw new Error('empty raster delta');const footprint=working.mutations().map(m=>{const [tileX,tileY]=parseTileKey(m.key);return Object.freeze({layerId:slot.layerId,tileX,tileY,bounds:Object.freeze({x0:0,y0:0,x1:CANONICAL_TILE_SIZE,y1:CANONICAL_TILE_SIZE})});});
      const resultValueRefs=[...(byLayer.get(slot.layerId)?.values()??[])];const draft:SemanticOperationDraft=Object.freeze({kind:'raster.strict-delta',schemaVersion:1,targetEntityIds:Object.freeze([slot.layerId]),parameters:Object.freeze({tileCount:working.changedTileCount}),algorithmVersionRefs:Object.freeze([]),resourceRefs:Object.freeze([]),sourceRevisionIds:Object.freeze([v.base]),selectionSnapshotRefs:Object.freeze([]),resultValueRefs:Object.freeze(resultValueRefs),dirtyFootprint:Object.freeze(footprint)});operations.push(finalizeOperation(v.id,ordinal,draft));
    }else if(slot.type==='metadata'){const draft:SemanticOperationDraft=Object.freeze({kind:'layer.metadata',schemaVersion:2,targetEntityIds:Object.freeze([slot.layerId]),parameters:Object.freeze({}),algorithmVersionRefs:Object.freeze([]),resourceRefs:Object.freeze([]),sourceRevisionIds:Object.freeze([v.base]),selectionSnapshotRefs:Object.freeze([]),resultValueRefs:Object.freeze([]),dirtyFootprint:Object.freeze([])});operations.push(finalizeOperation(v.id,ordinal,draft));
    }else if(slot.type==='structure'){const draft:SemanticOperationDraft=Object.freeze({kind:'layer.add-raster',schemaVersion:1,targetEntityIds:Object.freeze([slot.layerId]),parameters:Object.freeze({surfaceId:slot.surfaceId,insertIndex:slot.insertIndex,name:slot.name}),algorithmVersionRefs:Object.freeze([]),resourceRefs:Object.freeze([]),sourceRevisionIds:Object.freeze([v.base]),selectionSnapshotRefs:Object.freeze([]),resultValueRefs:Object.freeze([slot.surfaceId]),dirtyFootprint:Object.freeze([])});operations.push(finalizeOperation(v.id,ordinal,draft));
    }else{let layer=updates.get(slot.layerId)??v.root.getLayer(slot.layerId);layer=Object.freeze({...layer,surface:layer.surface.withMutations(slot.key,slot.dirtyTiles)});updates.set(slot.layerId,layer);operations.push(finalizeOperation(v.id,ordinal,slot.draft));}}
  const root=v.rootLayerIds?v.root.withLayerState(updates,v.rootLayerIds):v.root.withLayers(updates),stamp=s.nextCommitStamp(),command=Object.freeze({version:2 as const,kind:'core.transaction.v2' as const,label:tx.label,operations:Object.freeze(operations)});
  let published=false;try{s.store.publishPrepared(prepared);published=true;const revision=s.history.publish(v.base,v.id,root,command,s.clock(),stamp);s.acceptCommitSequence(stamp.commitSequence);v.close();
    const requiredResourceIds=uniqueResources(operations.flatMap(x=>x.resourceRefs)),requiredAlgorithms=Object.freeze([...new Set(operations.flatMap(x=>x.algorithmVersionRefs))]);
    const persistence:PersistenceHandoff=Object.freeze({schemaVersion:2 as const,commitStamp:stamp,transactionId:v.id,parentRevisionIds:Object.freeze([v.base]),resultRevisionId:revision.id,
      documentRootRef:Object.freeze({documentId:root.documentId,revisionId:revision.id}),semanticOperationRefs:Object.freeze(operations.map(x=>x.key)),requiredBlockIds:Object.freeze(prepared.entries.map(x=>x.id)),
      requiredResourceIds,requiredAlgorithmVersionRefs:requiredAlgorithms,closureState:'pending' as const});return Object.freeze({revision,changedBlockIds:Object.freeze(prepared.entries.map(x=>x.id)),persistence});
  }catch(e){if(published)s.store.rollbackPrepared(prepared);throw e;}
}
function uniqueResources(values:readonly ResourceId[]){return Object.freeze([...new Set(values)]);}
