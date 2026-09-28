import type {CommitReceipt} from '../commit';
import type {CoreDocument} from '../coreDocument';
import type {LayerId} from '../ids';
import {CORE_INTERNAL} from '../internal';
import type {PackedSampleBatch,PointerTypeCode} from '../input/sample';
import {ArcLengthDabSampler} from './arcSampler';
import {DabStreamBuilder,type PackedDabStream} from './dabStream';
import {rasterizeOpaqueRoundDab} from './rasterizeOpaqueRound';
import {createOpaqueRoundBrushV1,diameterForPressure,type OpaqueRoundBrushV1} from './style';

export type BrushStrokeFinish=Readonly<{
  commit:CommitReceipt;
  dabs:PackedDabStream;
  sampleCount:number;
}>;

export class BrushStrokeSession{
  readonly style:OpaqueRoundBrushV1;
  private readonly transaction;
  private readonly sampler;
  private readonly dabs=new DabStreamBuilder();
  private lastSequence=-1;
  private lastTime=-Infinity;
  private pointerTypeValue:PointerTypeCode|null=null;
  private sampleCountValue=0;
  private closed=false;
  private failed=false;

  constructor(
    readonly document:CoreDocument,
    readonly layerId:LayerId,
    style:OpaqueRoundBrushV1,
    label='Brush stroke',
  ){
    if(document.root.pixelFormat!=='rgba8-straight-v1')throw new Error('opaque-round-v1 requires rgba8-straight-v1');
    const layer=document.root.getLayer(layerId);
    if(layer.kind!=='raster')throw new Error('brush target must be raster');
    if(layer.locked)throw new Error('brush target is locked');
    this.style=createOpaqueRoundBrushV1(style);
    this.transaction=document.begin(label);
    this.sampler=new ArcLengthDabSampler(this.style);
  }

  get sampleCount(){return this.sampleCountValue;}
  get pointerType(){return this.pointerTypeValue;}

  push(batch:PackedSampleBatch):void{
    this.assertOpen();
    try{
      for(let i=0;i<batch.count;i++)this.pushOne(batch,i);
    }catch(error){
      this.failed=true;
      throw error;
    }
  }

  finish():BrushStrokeFinish|null{
    this.assertOpen();
    if(this.sampleCountValue===0){
      this.transaction.cancel();
      this.closed=true;
      return null;
    }

    const internal=this.transaction._internal(CORE_INTERNAL);
    if(!internal.hasChanges()){
      this.transaction.cancel();
      this.closed=true;
      return null;
    }

    const dabs=this.dabs.seal();
    const pointerType=this.pointerTypeValue;
    if(pointerType===null)throw new Error('stroke pointer type missing');

    internal.recordSemantic(Object.freeze({
      kind:'brush.stroke' as const,
      layerId:this.layerId,
      algorithmVersion:'linear-arc-opaque-round-v1' as const,
      brush:this.style,
      pointerType,
      sampleCount:this.sampleCountValue,
      dabs,
    }));

    try{
      const commit=this.transaction.commit();
      this.closed=true;
      return Object.freeze({commit,dabs,sampleCount:this.sampleCountValue});
    }catch(error){
      this.failed=true;
      throw error;
    }
  }

  cancel():void{
    if(this.closed)throw new Error('brush stroke is closed');
    this.transaction.cancel();
    this.closed=true;
  }

  private pushOne(batch:PackedSampleBatch,index:number):void{
    const sequence=batch.sequence(index),time=batch.monotonicTime(index);
    if(batch.predicted(index))throw new Error('predicted samples are not canonical');
    if(sequence<=this.lastSequence)throw new Error('sample sequence must be strictly increasing');
    if(time<this.lastTime)throw new Error('sample time must be monotonic');
    if(!batch.contact(index))throw new Error('active brush stroke requires contact samples');

    const pointerType=batch.pointerType(index);
    if(this.pointerTypeValue===null)this.pointerTypeValue=pointerType;
    else if(pointerType!==this.pointerTypeValue)throw new Error('pointer type changed within stroke');

    const diameter=diameterForPressure(this.style,batch.pressure(index),batch.pressureValid(index));
    this.sampler.push(batch.x(index),batch.y(index),diameter,(x,y,d)=>{
      this.dabs.append(x,y,d);
      rasterizeOpaqueRoundDab(this.document,this.transaction,this.layerId,this.style,x,y,d);
    });

    this.lastSequence=sequence;
    this.lastTime=time;
    this.sampleCountValue++;
  }

  private assertOpen():void{
    if(this.closed)throw new Error('brush stroke is closed');
    if(this.failed)throw new Error('brush stroke failed');
  }
}
