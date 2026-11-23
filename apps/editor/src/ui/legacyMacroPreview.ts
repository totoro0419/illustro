import type {CoreDocument,HistoryLayerFlags,LayerId,LayerNode,RevisionId} from '@illustro/core';

type Frame=Readonly<{revision:RevisionId;changes:ReadonlyMap<LayerId,LayerNode>;parent?:Frame}>;
type Preview=Readonly<{
  revision:RevisionId;root:CoreDocument['root'];flags:readonly HistoryLayerFlags[];
  views:readonly string[];failed?:Readonly<{index:number;reason:string}>;
}>;
const frame=(revision:RevisionId):Frame=>({revision,changes:new Map()});

/** Interpret historical steps without moving the live history cursor or writing to storage. */
export function previewLegacyMacro(document:CoreDocument,initialLayer:LayerId,steps:readonly string[]):Preview{
  const {head,redo,limit}=document.historyNavigationState();
  let current=frame(head),selected=initialLayer;
  const forward=redo.map(frame),views:string[]=[];
  const root=()=>document.revision(current.revision).root.withLayers(current.changes);
  function result(failed?:Preview['failed']):Preview{
    return {revision:current.revision,root:root(),flags:[...current.changes].map(([id,layer])=>({
      id,alphaLocked:!!layer.alphaLocked,clipSourceId:layer.clipSourceId??null,
    })),views:[...views],...(failed?{failed}:{})};
  }
  for(const [index,step] of steps.entries()){
    try{
      if(step==='undo'||step==='redo'){
        if(step==='undo'){
          const parentRevision=document.revision(current.revision).parentIds[0];
          const parent=current.parent??(parentRevision?frame(parentRevision):null);
          if(!parent||limit!==null&&forward.length>=limit)throw Error('これ以上元に戻せません。');
          forward.push(current);current=parent;
        }else{
          const next=forward.pop();
          if(!next)throw Error('これ以上やり直せません。');
          current=next;
        }
        const currentRoot=root();
        if(!currentRoot.hasLayer(selected))selected=currentRoot.rootLayerIds.at(-1)!;
      }else if(step==='layerAlphaLock'||step==='layerClipping'){
        const currentRoot=root(),layer=currentRoot.getLayer(selected);
        if(currentRoot.isLayerLocked(selected)||layer.baseColor)throw Error('編集できる描画レイヤーを選んでください。');
        const changes=new Map(current.changes);
        if(step==='layerAlphaLock')changes.set(selected,Object.freeze({...layer,alphaLocked:!layer.alphaLocked}));
        else{
          const source=layer.clipSourceId?null:currentRoot.availableClippingSource(selected);
          if(!source&&!layer.clipSourceId)throw Error('同じグループにクリップ元のレイヤーがありません。');
          changes.set(selected,Object.freeze({...layer,clipSourceId:source?.id??null}));
        }
        current={revision:current.revision,changes,parent:current};forward.length=0;
      }else views.push(step);
    }catch(error){
      return result({index:index+1,reason:error instanceof Error?error.message:String(error)});
    }
  }
  return result();
}
