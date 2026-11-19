import {validateEditableArtwork,type EditablePath,type LayerId} from '@illustro/core';
import {combineShapes} from './pathOperations';

type Entry=Readonly<{id:LayerId;content:EditablePath}>;
/** Follow live source layers in dependency order. Deleted/rasterized sources
 * retain their last embedded editable shape, so the saved result stays valid.
 * No rasterization or destructive source edits occur here. */
export async function linkedBooleanUpdates(
 entries:readonly Entry[],changedId:LayerId,next:EditablePath
):Promise<Entry[]>{
 const paths=new Map(entries.map(entry=>[entry.id,entry.content]));
 paths.set(changedId,validateEditableArtwork(next) as EditablePath);
 const state=new Map<LayerId,'visiting'|'done'>(),affected=new Set<LayerId>([changedId]);
 const updates:Entry[]=[];
 const visit=async(id:LayerId):Promise<void>=>{
  if(state.get(id)==='visiting')throw Error('図形の参照が循環しています。演算の元を選び直してください。');
  if(state.get(id)==='done')return;
  state.set(id,'visiting');
  const path=paths.get(id)!,operands=path.booleanOperands,ids=operands?.sourceLayerIds;
  if(ids){
   for(const source of ids)if(paths.has(source as LayerId))await visit(source as LayerId);
   if(id!==changedId&&ids.some(source=>affected.has(source as LayerId))){
    const a=paths.get(ids[0] as LayerId)??operands.a;
    const b=paths.get(ids[1] as LayerId)??operands.b;
    // An empty intersection/difference is a valid intermediate state. Keep
    // invisible degenerate geometry plus live sources for subsequent edits.
    const result=await combineShapes(a,b,operands.mode,true);
    const content=validateEditableArtwork({...result,stroke:path.stroke,fill:path.fill,width:path.width,
     lineStyle:path.lineStyle,opacity:path.opacity,
     booleanOperands:{...result.booleanOperands!,sourceLayerIds:ids}}) as EditablePath;
    paths.set(id,content);affected.add(id);updates.push({id,content});
   }
  }
  state.set(id,'done');
 };
 for(const id of paths.keys())await visit(id);
 return updates;
}
