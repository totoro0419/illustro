import type { LayerId,RevisionId,TransactionId } from './ids';
import type { LayerNode } from './model';
import { RasterWorkingSet } from './raster/working';
import type { CoreDocument } from './coreDocument';
import { commitTransaction,type CommitReceipt } from './commit';

export class DocumentTransaction{
  readonly base:RevisionId;readonly root;readonly id:TransactionId;
  readonly working=new Map<LayerId,RasterWorkingSet>();
  readonly updates=new Map<LayerId,LayerNode>();closed=false;
  constructor(readonly doc:CoreDocument,readonly label:string){
    if(!label.trim())throw new Error('empty transaction label');
    this.base=doc.head;this.root=doc.root;this.id=doc.ids.transaction();
  }
  editTile(layerId:LayerId,x:number,y:number,edit:(b:Uint8Array)=>void){
    this.open();if(x<0||y<0||x*this.doc.tileSize>=this.root.width||y*this.doc.tileSize>=this.root.height)throw new Error('tile outside document');
    let w=this.working.get(layerId);
    if(!w){const l=this.root.getLayer(layerId);w=new RasterWorkingSet(l.surface,this.doc.store,this.doc.tileBytes);this.working.set(layerId,w);}
    w.editTile(x,y,edit);
  }
  setPixel(layerId:LayerId,x:number,y:number,rgba:readonly [number,number,number,number]){
    this.open();if(x<0||y<0||x>=this.root.width||y>=this.root.height)throw new Error('pixel outside document');
    for(const v of rgba)if(!Number.isInteger(v)||v<0||v>255)throw new Error('invalid channel');
    const s=this.doc.tileSize,tx=Math.floor(x/s),ty=Math.floor(y/s),p=((y%s)*s+(x%s))*4;
    this.editTile(layerId,tx,ty,b=>{b[p]=rgba[0];b[p+1]=rgba[1];b[p+2]=rgba[2];b[p+3]=rgba[3];});
  }
  renameLayer(id:LayerId,name:string){this.meta(id,{name:name.trim()});}
  setLayerVisibility(id:LayerId,visible:boolean){this.meta(id,{visible});}
  commit(){this.open();return commitTransaction(this);}
  cancel(){this.open();this.working.clear();this.updates.clear();this.closed=true;}
  hasChanges(){return this.updates.size>0||[...this.working.values()].some(w=>w.changedTileCount>0);}
  close(){this.closed=true;}
  private meta(id:LayerId,p:Partial<Pick<LayerNode,'name'|'visible'>>){
    this.open();const b=this.updates.get(id)??this.root.getLayer(id);
    if(p.name!==undefined&&!p.name)throw new Error('empty layer name');
    this.updates.set(id,Object.freeze({...b,...p}));
  }
  private open(){if(this.closed)throw new Error('transaction closed');}
}
export type { CommitReceipt };
