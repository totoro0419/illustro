import { blockId,type BlockId } from '../ids';

export interface OwnershipTransfer{transferBatch(bytes:readonly Uint8Array[]):readonly Uint8Array[]}
type Clone=<T>(value:T,options?:{transfer?:readonly ArrayBuffer[]})=>T;

export const defaultOwnershipTransfer:OwnershipTransfer={
  transferBatch(bytes){
    const buffers:ArrayBuffer[]=[];
    for(const b of bytes){
      if(b.byteOffset!==0||b.byteLength!==b.buffer.byteLength)throw new Error('tile must own its ArrayBuffer');
      buffers.push(b.buffer as ArrayBuffer);
    }
    if(new Set(buffers).size!==buffers.length)throw new Error('duplicate transfer buffer');
    const clone=(globalThis as {structuredClone?:Clone}).structuredClone;
    if(!clone)throw new Error('structuredClone transfer unavailable');
    return clone(bytes,{transfer:buffers}) as readonly Uint8Array[];
  }
};

export class CanonicalTileStore{
  private readonly blocks=new Map<BlockId,Uint8Array>();private next=1;
  constructor(readonly transfer:OwnershipTransfer=defaultOwnershipTransfer){}
  get blockCount(){return this.blocks.size;}
  get allocatedBytes(){let n=0;for(const b of this.blocks.values())n+=b.byteLength;return n;}
  adoptBatch(buffers:readonly Uint8Array[]){
    const owned=this.transfer.transferBatch(buffers),ids:BlockId[]=[];
    if(owned.length!==buffers.length)throw new Error('transfer batch mismatch');
    for(const bytes of owned){const id=blockId(this.next++);this.blocks.set(id,bytes);ids.push(id);}
    return ids as readonly BlockId[];
  }
  readCopy(id:BlockId){const b=this.blocks.get(id);if(!b)throw new Error('missing block');return b.slice();}
}
