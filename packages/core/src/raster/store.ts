import { blockId, type BlockId } from '../ids';

export interface OwnershipTransfer{transfer(bytes:Uint8Array):Uint8Array}
type Clone=<T>(value:T,options?:{transfer?:readonly ArrayBuffer[]})=>T;

export const defaultOwnershipTransfer:OwnershipTransfer={
  transfer(bytes){
    if(bytes.byteOffset!==0||bytes.byteLength!==bytes.buffer.byteLength)throw new Error('tile must own its ArrayBuffer');
    const clone=(globalThis as {structuredClone?:Clone}).structuredClone;
    if(!clone)throw new Error('structuredClone transfer unavailable');
    return clone(bytes,{transfer:[bytes.buffer as ArrayBuffer]});
  }
};

export class CanonicalTileStore{
  readonly blocks=new Map<BlockId,Uint8Array>();
  next=1;
  constructor(readonly transfer:OwnershipTransfer=defaultOwnershipTransfer){}
  get blockCount(){return this.blocks.size;}
  get allocatedBytes(){let n=0;for(const b of this.blocks.values())n+=b.byteLength;return n;}
  adoptBatch(buffers:readonly Uint8Array[]){
    const owned=buffers.map(b=>this.transfer.transfer(b));
    const ids:BlockId[]=[];
    for(const bytes of owned){const id=blockId(this.next++);this.blocks.set(id,bytes);ids.push(id);}
    return ids as readonly BlockId[];
  }
  readCopy(id:BlockId){const b=this.blocks.get(id);if(!b)throw new Error('missing block');return b.slice();}
}
