import {cryptoIdFactory,type IdFactory,type LayerId,type RevisionId,type WriterEpochId} from './ids';
import {RevisionHistory} from './history';
import {DocumentRoot,rasterLayer} from './model';
import {PagedMap} from './pagedMap';
import {CanonicalTileStore,type OwnershipTransfer} from './raster/store';
import {bytesPerPixel,CANONICAL_TILE_SIZE,pixelToTile,type RasterSampleEncoding} from './raster/surface';
import {DocumentTransaction} from './transaction';
import {CORE_INTERNAL,type CoreInternalToken} from './internal';

export type CoreOptions=Readonly<{width:number;height:number;name?:string;colorProfileId?:string;sampleEncoding?:RasterSampleEncoding;ids?:IdFactory;clock?:()=>number;transfer?:OwnershipTransfer}>;
export class CoreDocument{
  readonly tileSize=CANONICAL_TILE_SIZE;readonly tileBytes:number;private readonly idsValue:IdFactory;private readonly clockValue:()=>number;
  private readonly storeValue:CanonicalTileStore;private readonly historyValue:RevisionHistory<DocumentRoot>;private commitSequenceValue=0n;
  readonly writerEpochId:WriterEpochId;readonly defaultRasterLayerId:LayerId;
  constructor(o:CoreOptions){validSize(o.width);validSize(o.height);this.idsValue=o.ids??cryptoIdFactory;this.clockValue=o.clock??(()=>Date.now());this.writerEpochId=this.idsValue.writerEpoch();
    const sampleEncoding=o.sampleEncoding??'rgba.unorm8.v1';this.tileBytes=CANONICAL_TILE_SIZE*CANONICAL_TILE_SIZE*bytesPerPixel(sampleEncoding);this.storeValue=new CanonicalTileStore(this.idsValue,o.transfer);
    const id=this.idsValue.layer(),layer=rasterLayer(id,this.idsValue.surface(),o.colorProfileId??'srgb',sampleEncoding),e=PagedMap.empty<LayerId,typeof layer>().edit();e.set(id,layer);
    const root=new DocumentRoot(this.idsValue.document(),o.width,o.height,o.name??'Untitled',o.colorProfileId??'srgb',e.commit(),[id]);this.defaultRasterLayerId=id;this.historyValue=new RevisionHistory(root,this.idsValue,this.clockValue());}
  get root(){return this.historyValue.current.root;}get head(){return this.historyValue.head;}get revisionCount(){return this.historyValue.count;}get currentRevision(){return this.historyValue.current;}
  get commitSequence(){return this.commitSequenceValue;}get canonicalBlockCount(){return this.storeValue.blockCount;}get canonicalRasterBytes(){return this.storeValue.allocatedBytes;}
  begin(label:string){return new DocumentTransaction(this,label);}undo(){return this.historyValue.undo();}redo(){return this.historyValue.redo();}hasRevision(id:RevisionId){return this.historyValue.has(id);}revision(id:RevisionId){return this.historyValue.get(id);}
  getTileValue(layerId:LayerId,tileX:number,tileY:number){return this.root.getLayer(layerId).surface.getValue(tileX,tileY);}
  readPixel(layerId:LayerId,x:number,y:number){if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))throw new Error('invalid pixel coordinate');const l=this.root.getLayer(layerId);
    if(l.surface.descriptor.sampleEncoding!=='rgba.unorm8.v1')throw new Error('readPixel helper only supports rgba.unorm8.v1');const tx=pixelToTile(x),ty=pixelToTile(y),value=l.surface.getValue(tx.tile,ty.tile);
    if(!value)return [0,0,0,0] as const;if(value.mutations.length)throw new Error('strict raster materialization pending');if(value.baseBlockId===null)return [0,0,0,0] as const;
    const b=this.storeValue.readCopy(value.baseBlockId),p=(ty.local*CANONICAL_TILE_SIZE+tx.local)*4;return [b[p]??0,b[p+1]??0,b[p+2]??0,b[p+3]??0] as const;}
  _internal(token:CoreInternalToken){if(token!==CORE_INTERNAL)throw new Error('invalid internal capability');return {ids:this.idsValue,clock:this.clockValue,store:this.storeValue,history:this.historyValue,
    nextCommitStamp:()=>Object.freeze({writerEpochId:this.writerEpochId,commitSequence:this.commitSequenceValue+1n}),acceptCommitSequence:(n:bigint)=>{if(n!==this.commitSequenceValue+1n)throw new Error('invalid commit sequence');this.commitSequenceValue=n;}};}
}
function validSize(n:number){if(!Number.isSafeInteger(n)||n<=0)throw new Error('invalid canvas size');}
