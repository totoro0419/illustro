import type {BlockId,IdFactory} from '../ids';
import type {LocalDirtyRect,RasterSampleEncoding} from './surface';
import {bytesPerPixel} from './surface';

export interface OwnershipTransfer{transferBatch(bytes:readonly Uint8Array[]):readonly Uint8Array[]}
type Clone=<T>(value:T,options?:{transfer?:readonly ArrayBuffer[]})=>T;
export const defaultOwnershipTransfer:OwnershipTransfer={transferBatch(bytes){
  const buffers:ArrayBuffer[]=[];for(const b of bytes){if(b.byteOffset!==0||b.byteLength!==b.buffer.byteLength)throw new Error('block must own its ArrayBuffer');buffers.push(b.buffer as ArrayBuffer);}
  if(new Set(buffers).size!==buffers.length)throw new Error('duplicate transfer buffer');
  const clone=(globalThis as {structuredClone?:Clone}).structuredClone;if(!clone)throw new Error('structuredClone transfer unavailable');
  return clone(bytes,{transfer:buffers}) as readonly Uint8Array[];
}};

export type RasterBlockDescriptor=Readonly<{sampleEncoding:RasterSampleEncoding;bounds:LocalDirtyRect}>;
export type BlockInput=Readonly<{bytes:Uint8Array;descriptor:RasterBlockDescriptor}>;
type StoredBlock=Readonly<{descriptor:RasterBlockDescriptor;bytes:Uint8Array}>;
export type PreparedBlockBatch=Readonly<{entries:readonly Readonly<{id:BlockId;block:StoredBlock}>[]}>;

export class CanonicalTileStore{
  private readonly blocks=new Map<BlockId,StoredBlock>();
  constructor(private readonly ids:IdFactory,readonly transfer:OwnershipTransfer=defaultOwnershipTransfer){}
  get blockCount(){return this.blocks.size;}
  get allocatedBytes(){let n=0;for(const b of this.blocks.values())n+=b.bytes.byteLength;return n;}
  prepareBatch(inputs:readonly BlockInput[]):PreparedBlockBatch{
    for(const input of inputs)validateInput(input);
    const owned=this.transfer.transferBatch(inputs.map(x=>x.bytes));if(owned.length!==inputs.length)throw new Error('transfer batch mismatch');
    const entries=owned.map((bytes,i)=>{const input=inputs[i];if(!input)throw new Error('block mismatch');
      return Object.freeze({id:this.ids.block(),block:Object.freeze({descriptor:input.descriptor,bytes})});});
    return Object.freeze({entries:Object.freeze(entries)});
  }
  publishPrepared(batch:PreparedBlockBatch){for(const entry of batch.entries){if(this.blocks.has(entry.id))throw new Error('duplicate block id');}
    for(const entry of batch.entries)this.blocks.set(entry.id,entry.block);return Object.freeze(batch.entries.map(x=>x.id));}
  rollbackPrepared(batch:PreparedBlockBatch){for(const entry of batch.entries)this.blocks.delete(entry.id);}
  readCopy(id:BlockId){const b=this.blocks.get(id);if(!b)throw new Error('missing block');return b.bytes.slice();}
  descriptor(id:BlockId){const b=this.blocks.get(id);if(!b)throw new Error('missing block');return b.descriptor;}
}
function validateInput(input:BlockInput){const b=input.descriptor.bounds;for(const n of [b.x0,b.y0,b.x1,b.y1])if(!Number.isInteger(n)||n<0||n>256)throw new Error('invalid block bounds');
  if(b.x1<=b.x0||b.y1<=b.y0)throw new Error('empty block');const expected=(b.x1-b.x0)*(b.y1-b.y0)*bytesPerPixel(input.descriptor.sampleEncoding);
  if(input.bytes.byteLength!==expected)throw new Error('block byte length mismatch');}
