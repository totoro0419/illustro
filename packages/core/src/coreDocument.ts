import { cryptoIdFactory,type IdFactory,type LayerId,type RevisionId } from './ids';
import { RevisionHistory } from './history';
import { DocumentRoot,rasterLayer } from './model';
import { PagedMap } from './pagedMap';
import { CanonicalTileStore,type OwnershipTransfer } from './raster/store';
import { RecoveryState } from './recovery';
import { DocumentTransaction } from './transaction';

export type CoreOptions=Readonly<{
  width:number;height:number;name?:string;colorProfileId?:string;tileSize?:number;
  ids?:IdFactory;clock?:()=>number;transfer?:OwnershipTransfer;
}>;

export class CoreDocument{
  readonly tileSize:number;readonly tileBytes:number;readonly ids:IdFactory;
  readonly clock:()=>number;readonly store:CanonicalTileStore;
  readonly history:RevisionHistory<DocumentRoot>;readonly recovery=new RecoveryState();
  readonly defaultRasterLayerId:LayerId;
  constructor(o:CoreOptions){
    validSize(o.width);validSize(o.height);this.tileSize=o.tileSize??256;validTile(this.tileSize);
    this.tileBytes=this.tileSize*this.tileSize*4;this.ids=o.ids??cryptoIdFactory;this.clock=o.clock??(()=>Date.now());
    this.store=new CanonicalTileStore(o.transfer);
    const id=this.ids.layer(),layer=rasterLayer(id),e=PagedMap.empty<LayerId,typeof layer>().edit();e.set(id,layer);
    const root=new DocumentRoot(this.ids.document(),o.width,o.height,o.name??'Untitled',o.colorProfileId??'srgb',e.commit(),[id]);
    this.defaultRasterLayerId=id;this.history=new RevisionHistory(root,this.clock());
  }
  get root(){return this.history.current.root;} get head(){return this.history.head;}
  begin(label:string){return new DocumentTransaction(this,label);}
  undo(){return this.history.undo();} redo(){return this.history.redo();}
  protect(id:RevisionId){if(!this.history.has(id))throw new Error('unknown revision');return this.recovery.mark(id);}
  readPixel(layerId:LayerId,x:number,y:number){
    pixel(x,this.root.width);pixel(y,this.root.height);const l=this.root.getLayer(layerId);
    const tx=Math.floor(x/this.tileSize),ty=Math.floor(y/this.tileSize),id=l.surface.getBlockId(tx,ty);
    if(id===undefined)return [0,0,0,0] as const;
    const b=this.store.readCopy(id),p=((y%this.tileSize)*this.tileSize+(x%this.tileSize))*4;
    return [b[p]??0,b[p+1]??0,b[p+2]??0,b[p+3]??0] as const;
  }
}
function validSize(n:number){if(!Number.isSafeInteger(n)||n<=0)throw new Error('invalid canvas size');}
function validTile(n:number){if(!Number.isSafeInteger(n)||n<64||n>1024||(n&(n-1))!==0)throw new Error('invalid tile size');}
function pixel(n:number,max:number){if(!Number.isSafeInteger(n)||n<0||n>=max)throw new Error('pixel outside document');}
