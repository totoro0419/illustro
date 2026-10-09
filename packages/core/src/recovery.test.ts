import {describe,expect,it} from 'vitest';
import {createDeterministicIdFactory} from './ids';
import {ProtectionTracker} from './recovery';

describe('M05 recovery ordering',()=>{
  it('advances only across a contiguous verified CommitSequence',()=>{
    const ids=createDeterministicIdFactory(),epoch=ids.writerEpoch(),tracker=new ProtectionTracker(epoch);
    const stamp=(commitSequence:bigint)=>({writerEpochId:epoch,commitSequence});
    expect(tracker.acknowledge(stamp(3n),true)).toBe(0n);
    expect(tracker.acknowledge(stamp(1n),true)).toBe(1n);
    expect(tracker.acknowledge(stamp(3n),true)).toBe(1n);
    expect(tracker.acknowledge(stamp(2n),true)).toBe(3n);
  });
  it('does not advance for an unverified dependency closure or duplicate packet',()=>{
    const ids=createDeterministicIdFactory(),epoch=ids.writerEpoch(),tracker=new ProtectionTracker(epoch),one={writerEpochId:epoch,commitSequence:1n};
    expect(tracker.acknowledge(one,false)).toBe(0n);
    expect(tracker.acknowledge(one,true)).toBe(1n);
    expect(tracker.acknowledge(one,true)).toBe(1n);
  });
  it('rejects packets from another WriterEpoch',()=>{
    const ids=createDeterministicIdFactory(),tracker=new ProtectionTracker(ids.writerEpoch());
    expect(()=>tracker.acknowledge({writerEpochId:ids.writerEpoch(),commitSequence:1n},true)).toThrow(/epoch/);
  });
});
