import type {LayerId,RevisionId,TransactionId} from './ids';
import type {LayerNode} from './model';
import {RasterWorkingSet} from './raster/working';
import type {CoreDocument} from './coreDocument';
import {commitTransaction,type CommitReceipt} from './commit';
import {CORE_INTERNAL,type CoreInternalToken} from './internal';

export class DocumentTransaction{
 private readonly baseValue:RevisionId;private readonly rootValue;private readonly idValue:TransactionId;
 private readonly workingValue=new Map<LayerId,RasterWorkingSet>();private readonly updatesValue=new Map<LayerId,LayerNode>();
 private closed=false;private failed=false;
 constructor(private readonly doc:CoreDocument,readonly label:string){
  if(!label.trim())throw new Error('empty transaction label');
  this.baseValue=doc.head;this.rootValue=doc.root;this.idValue=doc._internal(CORE_INTERNAL).ids.transaction();
 }
 get transactionId(){return this.idValue;}
 editTile(layerId:LayerId,x:number,y:number,edit:(b:Uint8Array)=>void){
  this.open();if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||x<0||y<0||x*this.doc.tileSize>=this.rootValue.width||y*this.doc.tileSize>=this.rootValue.height)throw new Error('tile outside document');
  let w=this.workingValue.get(layerId);
  if(!w){const l=this.rootValue.getLayer(layerId);w=new RasterWorkingSet(l.surface,this.doc._internal(CORE_INTERNAL).store,this.doc.tileBytes);this.workingValue.set(layerId,w);}
  try{w.editTile(x,y,edit);}catch(e){this.failed=true;throw e;}
 }
 setPixel(layerId:LayerId,x:number,y:number,rgba:readonly [number,number,number,number]){
  this.open();if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||x<0||y<0||x>=this.rootValue.width||y>=this.rootValue.height)throw new Error('pixel outside document');
  for(const v of rgba)if(!Number.isInteger(v)||v<0||v>255)throw new Error('invalid channel');
  const s=this.doc.tileSize,tx=Math.floor(x/s),ty=Math.floor(y/s),p=((y%s)*s+(x%s))*4;
  this.editTile(layerId,tx,ty,b=>{b[p]=rgba[0];b[p+1]=rgba[1];b[p+2]=rgba[2];b[p+3]=rgba[3];});
 }
 renameLayer(id:LayerId,name:string){this.meta(id,{name:name.trim()});}
 setLayerVisibility(id:LayerId,visible:boolean){this.meta(id,{visible});}
 commit():CommitReceipt{this.open();try{return commitTransaction(this);}catch(e){this.failed=true;throw e;}}
 cancel(){if(this.closed)throw new Error('transaction closed');this.workingValue.clear();this.updatesValue.clear();this.closed=true;}
 _internal(token:CoreInternalToken){if(token!==CORE_INTERNAL)throw new Error('invalid internal capability');return {doc:this.doc,base:this.baseValue,root:this.rootValue,id:this.idValue,working:this.workingValue,updates:this.updatesValue,hasChanges:()=>this.hasChanges(),close:()=>{this.closed=true;}};}
 private hasChanges(){return this.updatesValue.size>0||[...this.workingValue.values()].some(w=>w.changedTileCount>0);}
 private meta(id:LayerId,p:Partial<Pick<LayerNode,'name'|'visible'>>){
  this.open();const b=this.updatesValue.get(id)??this.rootValue.getLayer(id);if(p.name!==undefined&&!p.name)throw new Error('empty layer name');
  if((p.name===undefined||p.name===b.name)&&(p.visible===undefined||p.visible===b.visible))return;
  this.updatesValue.set(id,Object.freeze({...b,...p}));
 }
 private open(){if(this.closed)throw new Error('transaction closed');if(this.failed)throw new Error('transaction failed');}
}
