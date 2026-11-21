import {validateEditableArtwork,type EditablePath,type LayerId} from '@illustro/core';
import {appendPathStroke} from './pathOperations';
import type {ArtworkActions} from './tools';

/** One session owns a serial queue; every saved stroke is a separate transaction.
 * Read the current path at execution time so Undo never leaves a stale base. */
export function continuousVectorSession(api:ArtworkActions,newLayer:boolean,
  saved:(path:EditablePath,id:LayerId)=>void){
  const origin=api.context();
  if(!origin)throw Error('作品を開いてください。');
  let active=true,first=true,selected=origin.selected.id,pending=Promise.resolve();
  const abort=new AbortController();
  const stop=()=>{active=false;abort.abort();};
  const valid=()=>{
    const context=api.context();
    if(!active||!context||context.drawing!==origin.drawing||context.documentKey!==origin.documentKey||context.selected.id!==selected)
      throw Error('道具・作品・選択レイヤーが変更されたため、ベクター描画を終了しました。');
    return context;
  };
  const append=(stroke:EditablePath)=>{
    // Freeze the style and all pressure/curve samples at pen release.
    const captured=validateEditableArtwork(stroke) as EditablePath;
    const result=pending.then(async()=>{
      const context=valid(),base=context.selected.content;
      let content=captured,id:LayerId|undefined;
      if(!(newLayer&&first)&&base?.kind==='path'){
        content=validateEditableArtwork(appendPathStroke(base,captured)) as EditablePath;
        id=context.selected.id;
      }else if(!(newLayer&&first)&&base){
        throw Error('このレイヤーには線を追加できません。「新しいレイヤーに連続して描く」を選んでください。');
      }
      await api.save(content,'ベクター線',id,undefined,undefined,'vector',undefined,abort.signal);
      const next=api.context();
      if(!next||next.drawing!==origin.drawing||next.documentKey!==origin.documentKey)throw Error('作品が切り替わりました。');
      selected=next.selected.id;first=false;
      if(active)saved(content,selected);
    });
    // An error terminates the whole session; queued strokes cannot overtake it.
    pending=result.catch(error=>{stop();throw error;});
    void pending.catch(()=>{});
    return result;
  };
  return {append,stop,get active(){return active;}};
}
