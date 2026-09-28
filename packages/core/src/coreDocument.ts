import { cryptoIdFactory,type IdFactory,type LayerId,type RevisionId } from './ids';
import { RevisionHistory } from './history';
import { DocumentRoot,rasterLayer } from './model';
import { PagedMap } from './pagedMap';
import { CanonicalTileStore,type OwnershipTransfer } from './raster/store';
import { RecoveryState } from './recovery';
import { DocumentTransaction } from './transaction';
import { CORE_INTERNAL,type CoreInternalToken } from './internal';

export type CoreOptions=Readonly<{
  width:number;height:number;name?:string;colorProfileId?:string;tileSize?:number;
  ids?:IdFactory;clock?:()=>number;transfer?:OwnershipTransfer;
}>;

export class CoreDocument{
  readonly tileSize:number;readonly tileBytes:number;
  private readonly idsValue:IdFactory;private readonly clockValue:()=>number;
  private readonly storeValue:CanonicalTileStore;private readonly historyValue:RevisionHistory<DocumentRoot>;
  private readonly recoveryValue=new RecoveryState();
  readonly defaultRasterLayerId:LayerId;
  constructor(o:CoreOptions){
    validSize(o.width);validSize(o.height);this.tileSize=o.tileSize??256;validTile(this.tileSize);
    this.tileBytes=this.tileSize*this.tileSize*4;this.idsValue=o.ids??cryptoIdFactory;this.clockValue=o.clock??(()=>Date.now());
    this.storeValue=new CanonicalTileStore(o.transfer);
    const id=this.idsValue.layer(),layer=rasterLayer(id),e=PagedMap.empty<LayerId,typeof layer>().edit();e.set(id,layer);
    const root=new DocumentRoot(this.idsValue.document(),o.width,o.height,o.name??'Untitled',o.colorProfileId??'srgb',e.commit(),[id]);
    this.defaultRasterLayerId=id;this.historyValue=new RevisionHistory(root,this.clockValue());
  }
  get root(){return this.historyValue.current.root;} get head(){return this.historyValue.head;} get revisionCount(){return this.historyValue.count;}
  get canonicalBlockCount(){return this.storeValue.blockCount;} get canonicalRasterBytes(){return this.storeValue.allocatedBytes;}
  begin(label:string){return new DocumentTransaction(this,label);}
  undo(){return this.historyValue.undo();} redo(){return this.historyValue.redo();} hasRevision(id:RevisionId){return this.historyValue.has(id);}
  protect(id:RevisionId){if(!this.historyValue.has(id))throw new Error('unknown revision');return this.recoveryValue.mark(id);}
  _internal(token:CoreInternalToken){if(token!==CORE_INTERNAL)throw new Error('invalid internal capability');return {ids:this.idsValue,clock:this.clockValue,store:this.storeValue,history:this.historyValue};}
  readPixel(layerId:LayerId,x:number,y:number){
    pixel(x,this.root.width);pixel(y,this.root.height);const l=this.root.getLayer(layerId);
    const tx=Math.floor(x/this.tileSize),ty=Math.floor(y/this.tileSize),id=l.surface.getBlockId(tx,ty);
    if(id===undefined)return [0,0,0,0] as const;
    const b=this.storeValue.readCopy(id),p=((y%this.tileSize)*this.tileSize+(x%this.tileSize))*4;
    return [b[p]??0,b[p+1]??0,b[p+2]??0,b[p+3]??0] as const;
  }
}
function validSize(n:number){if(!Number.isSafeInteger(n)||n<=0)throw new Error('invalid canvas size');}
function validTile(n:number){if(!Number.isSafeInteger(n)||n<64||n>1024||(n&(n-1))!==0)throw new Error('invalid tile size');}
function pixel(n:number,max:number){if(!Number.isSafeInteger(n)||n<0||n>=max)throw new Error('pixel outside document');}
