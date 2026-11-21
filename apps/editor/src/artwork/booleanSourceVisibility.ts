import type {DocumentRoot,LayerId} from '@illustro/core';

/** Validate the two source shapes before creating a boolean result.
 * The editor keeps the source contents and hides them in the SAME history step
 * that creates the result; Undo can therefore restore both atomically. */
export function validatedBooleanSourceVisibility(
  root:DocumentRoot,sourceIds:readonly LayerId[],editing?:LayerId
):readonly LayerId[]{
  if(!sourceIds.length)return [];
  if(editing||sourceIds.length!==2||new Set(sourceIds).size!==2)
    throw Error('演算元の2レイヤーを選び直してください。');
  for(const id of sourceIds){
    if(!root.hasLayer(id)||root.getLayer(id).editable?.kind!=='path'||root.isLayerLocked(id))
      throw Error('元の形が変更されたか、ロックされています。演算元を確認してやり直してください。');
  }
  return sourceIds;
}
