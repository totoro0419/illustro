import {CoreDocument,type LayerId} from '@illustro/core';
import type {DrawingTarget,EditorPorts,StrokeCommitResult} from './ports';
import type {StrokeRecord} from '@illustro/brush-rt';
import {CoreStrokeDocumentPort} from './strokeCommit';

export class EditorController{
  readonly document:CoreDocument;readonly ports:EditorPorts;committedStrokeCount=0;lastCommit:StrokeCommitResult|null=null;
  private selectedLayerIdValue:LayerId;private readonly committedByLayer=new Map<LayerId,number>();
  constructor(width=512,height=384,ports:EditorPorts={}){
    this.document=new CoreDocument({width,height,name:'新しい作品'});this.selectedLayerIdValue=this.document.defaultRasterLayerId;
    this.ports={...ports,document:ports.document??new CoreStrokeDocumentPort(this.document,()=>this.selectedLayerIdValue)};
  }
  get selectedLayerId(){return this.selectedLayerIdValue;}
  get selectedLayer(){return this.document.root.getLayer(this.selectedLayerIdValue);}
  get layers(){const root=this.document.root;return Object.freeze(root.rootLayerIds.map(id=>root.getLayer(id)));}
  selectLayer(id:LayerId){const root=this.document.root;if(!root.hasLayer(id))throw new Error('レイヤーが存在しません。');const layer=root.getLayer(id);if(layer.kind!=='raster')throw new Error('このレイヤーはM02では選択できません。');this.selectedLayerIdValue=id;}
  addRasterLayer(){const {layerId}=this.document.addRasterLayerAbove(this.selectedLayerIdValue);this.selectedLayerIdValue=layerId;return layerId;}
  strokeCountForLayer(id:LayerId){return this.committedByLayer.get(id)??0;}
  target():DrawingTarget{const port=this.ports.document;if(!port)throw new Error('Document connection unavailable');return port.target();}
  async finishStroke(target:DrawingTarget,record:StrokeRecord){
    const port=this.ports.document;if(!port)throw new Error('Document connection unavailable');const result=await port.commitStroke(target,record);
    this.committedStrokeCount++;this.committedByLayer.set(target.layerId,this.strokeCountForLayer(target.layerId)+1);this.lastCommit=result;return result;
  }
}
