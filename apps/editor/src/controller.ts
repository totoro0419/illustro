import {CoreDocument,type LayerId,type PersistenceHandoff,type RevisionId,type SemanticOperation} from '@illustro/core';
import type {DrawingTarget,EditorPorts,StrokeCommitResult} from './ports';
import type {StrokeRecord} from '@illustro/brush-rt';
import {CoreStrokeDocumentPort} from './strokeCommit';

export type EditorHistoryChange=Readonly<{
  direction:'undo'|'redo';changed:boolean;fromRevision:RevisionId;toRevision:RevisionId;
  operations:readonly SemanticOperation[];selectedLayerId:LayerId;
}>;

export class EditorController{
  readonly document:CoreDocument;readonly ports:EditorPorts;committedStrokeCount=0;committedEraserStrokeCount=0;lastCommit:StrokeCommitResult|null=null;lastPersistenceHandoff:PersistenceHandoff|null=null;
  private selectedLayerIdValue:LayerId;private readonly committedByLayer=new Map<LayerId,number>();
  constructor(width=512,height=384,ports:EditorPorts={},document?:CoreDocument,selectedLayerId?:LayerId){
    this.document=document??new CoreDocument({width,height,name:'新しい作品'});const fallback=this.document.root.rootLayerIds[0];if(!fallback)throw new Error('Document has no selectable Raster Layer');
    this.selectedLayerIdValue=selectedLayerId&&this.document.root.hasLayer(selectedLayerId)?selectedLayerId:fallback;
    this.ports={...ports,document:ports.document??new CoreStrokeDocumentPort(this.document,()=>this.selectedLayerIdValue)};this.rebuildStrokeCounters();
  }
  static restored(document:CoreDocument,selectedLayerId?:LayerId,ports:EditorPorts={}){return new EditorController(document.root.width,document.root.height,ports,document,selectedLayerId);}
  get selectedLayerId(){return this.selectedLayerIdValue;}
  get selectedLayer(){return this.document.root.getLayer(this.selectedLayerIdValue);}
  get layers(){const root=this.document.root;return Object.freeze(root.rootLayerIds.map(id=>root.getLayer(id)));}
  get canUndo(){return this.document.canUndo;}get canRedo(){return this.document.canRedo;}
  selectLayer(id:LayerId){const root=this.document.root;if(!root.hasLayer(id))throw new Error('レイヤーが存在しません。');const layer=root.getLayer(id);if(layer.kind!=='raster')throw new Error('このレイヤーは選択できません。');this.selectedLayerIdValue=id;}
  addRasterLayer(){const {layerId,receipt}=this.document.addRasterLayerAbove(this.selectedLayerIdValue);this.selectedLayerIdValue=layerId;this.lastPersistenceHandoff=receipt.persistence;return layerId;}
  strokeCountForLayer(id:LayerId){return this.committedByLayer.get(id)??0;}
  target():DrawingTarget{const port=this.ports.document;if(!port)throw new Error('Document connection unavailable');return port.target();}
  async finishStroke(target:DrawingTarget,record:StrokeRecord){
    const port=this.ports.document;if(!port)throw new Error('Document connection unavailable');const result=await port.commitStroke(target,record);
    this.committedStrokeCount++;if(record.preset.blend==='erase')this.committedEraserStrokeCount++;this.committedByLayer.set(target.layerId,this.strokeCountForLayer(target.layerId)+1);this.lastCommit=result;this.lastPersistenceHandoff=result.persistence;return result;
  }
  undo():EditorHistoryChange{
    const from=this.document.currentRevision,oldRoot=this.document.root,operations=from.command?.operations??[];
    const to=this.document.undo(),changed=to.id!==from.id;if(changed){this.reconcileSelection(oldRoot.rootLayerIds);this.adjustStrokeCounters('undo',operations);}
    return Object.freeze({direction:'undo',changed,fromRevision:from.id,toRevision:to.id,operations,selectedLayerId:this.selectedLayerIdValue});
  }
  redo():EditorHistoryChange{
    const from=this.document.currentRevision,to=this.document.redo(),changed=to.id!==from.id,operations=changed?(to.command?.operations??[]):[];
    if(changed){this.reconcileSelection(this.document.root.rootLayerIds);this.adjustStrokeCounters('redo',operations);}
    return Object.freeze({direction:'redo',changed,fromRevision:from.id,toRevision:to.id,operations,selectedLayerId:this.selectedLayerIdValue});
  }
  private rebuildStrokeCounters(){
    this.committedByLayer.clear();this.committedStrokeCount=0;this.committedEraserStrokeCount=0;
    for(const operation of this.document.operationsTo()){if(operation.kind!=='brush.stroke')continue;const layerId=operation.targetEntityIds[0];if(!layerId)continue;this.committedStrokeCount++;if(operation.parameters.action==='erase')this.committedEraserStrokeCount++;this.committedByLayer.set(layerId,this.strokeCountForLayer(layerId)+1);}
  }
  private reconcileSelection(previousOrder:readonly LayerId[]){
    const root=this.document.root;if(root.hasLayer(this.selectedLayerIdValue))return;
    const order=root.rootLayerIds;if(!order.length)throw new Error('Document has no selectable Raster Layer');
    const oldIndex=previousOrder.indexOf(this.selectedLayerIdValue),fallbackIndex=Math.max(0,Math.min(order.length-1,oldIndex>0?oldIndex-1:0));
    const fallback=order[fallbackIndex];if(fallback===undefined)throw new Error('Document has no selectable Raster Layer');this.selectedLayerIdValue=fallback;
  }
  private adjustStrokeCounters(direction:'undo'|'redo',operations:readonly SemanticOperation[]){
    const delta=direction==='undo'?-1:1;
    for(const operation of operations){if(operation.kind!=='brush.stroke')continue;const layerId=operation.targetEntityIds[0];if(layerId===undefined)continue;
      this.committedStrokeCount=Math.max(0,this.committedStrokeCount+delta);if(operation.parameters.action==='erase')this.committedEraserStrokeCount=Math.max(0,this.committedEraserStrokeCount+delta);this.committedByLayer.set(layerId,Math.max(0,this.strokeCountForLayer(layerId)+delta));}
  }
}
