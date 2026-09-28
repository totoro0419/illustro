export const PointerType={
  Mouse:0,
  Pen:1,
  Touch:2,
  Unknown:3,
} as const;

export type PointerTypeCode=(typeof PointerType)[keyof typeof PointerType];

export const SampleValidity={
  Pressure:1<<0,
  Tilt:1<<1,
} as const;

export const SampleProvenance={
  Predicted:1<<15,
} as const;

const SAMPLE_BATCH_TOKEN=Symbol('illustro-sample-batch');
const GEOMETRY_STRIDE=3;
const SENSOR_STRIDE=3;
const META_STRIDE=6;

export class PackedSampleBatch{
  constructor(
    token:typeof SAMPLE_BATCH_TOKEN,
    readonly count:number,
    private readonly geometry:Float64Array,
    private readonly sensors:Float32Array,
    private readonly meta:Uint32Array,
    private readonly validity:Uint16Array,
  ){if(token!==SAMPLE_BATCH_TOKEN)throw new Error('invalid sample batch capability');}
  sequence(i:number){return this.meta[i*META_STRIDE]??0;}
  monotonicTime(i:number){return this.geometry[i*GEOMETRY_STRIDE]??0;}
  x(i:number){return this.geometry[i*GEOMETRY_STRIDE+1]??0;}
  y(i:number){return this.geometry[i*GEOMETRY_STRIDE+2]??0;}
  pressure(i:number){return this.sensors[i*SENSOR_STRIDE]??0;}
  tiltX(i:number){return this.sensors[i*SENSOR_STRIDE+1]??0;}
  tiltY(i:number){return this.sensors[i*SENSOR_STRIDE+2]??0;}
  buttons(i:number){return this.meta[i*META_STRIDE+1]??0;}
  pointerType(i:number){return (this.meta[i*META_STRIDE+2]??PointerType.Unknown) as PointerTypeCode;}
  contact(i:number){return (this.meta[i*META_STRIDE+3]??0)!==0;}
  viewGeneration(i:number){return this.meta[i*META_STRIDE+4]??0;}
  calibrationGeneration(i:number){return this.meta[i*META_STRIDE+5]??0;}
  validityFlags(i:number){return this.validity[i]??0;}
  pressureValid(i:number){return (this.validityFlags(i)&SampleValidity.Pressure)!==0;}
  tiltValid(i:number){return (this.validityFlags(i)&SampleValidity.Tilt)!==0;}
  predicted(i:number){return (this.validityFlags(i)&SampleProvenance.Predicted)!==0;}
}

export class SampleBatchBuilder{
  private readonly geometry:Float64Array;
  private readonly sensors:Float32Array;
  private readonly meta:Uint32Array;
  private readonly validity:Uint16Array;
  private readonly written:Uint8Array;
  private sealed=false;

  constructor(readonly count:number){
    if(!Number.isSafeInteger(count)||count<=0)throw new Error('sample count must be a positive safe integer');
    this.geometry=new Float64Array(count*GEOMETRY_STRIDE);
    this.sensors=new Float32Array(count*SENSOR_STRIDE);
    this.meta=new Uint32Array(count*META_STRIDE);
    this.validity=new Uint16Array(count);
    this.written=new Uint8Array(count);
  }

  write(
    index:number,
    sequence:number,
    monotonicTime:number,
    x:number,
    y:number,
    pressure:number,
    tiltX:number,
    tiltY:number,
    buttons:number,
    pointerType:PointerTypeCode,
    contact:boolean,
    viewGeneration:number,
    calibrationGeneration:number,
    validityFlags:number,
  ):void{
    if(this.sealed)throw new Error('sample batch builder is sealed');
    if(!Number.isSafeInteger(index)||index<0||index>=this.count)throw new Error('sample index out of range');
    validateSample(sequence,monotonicTime,x,y,pressure,tiltX,tiltY,buttons,pointerType,viewGeneration,calibrationGeneration,validityFlags);

    const g=index*GEOMETRY_STRIDE,s=index*SENSOR_STRIDE,m=index*META_STRIDE;
    this.geometry[g]=monotonicTime;this.geometry[g+1]=x;this.geometry[g+2]=y;
    this.sensors[s]=pressure;this.sensors[s+1]=tiltX;this.sensors[s+2]=tiltY;
    this.meta[m]=sequence;this.meta[m+1]=buttons;this.meta[m+2]=pointerType;
    this.meta[m+3]=contact?1:0;this.meta[m+4]=viewGeneration;this.meta[m+5]=calibrationGeneration;
    this.validity[index]=validityFlags;
    this.written[index]=1;
  }

  seal():PackedSampleBatch{
    if(this.sealed)throw new Error('sample batch builder is sealed');
    for(let i=0;i<this.count;i++)if(this.written[i]!==1)throw new Error('sample batch has unwritten slots');
    this.sealed=true;
    return new PackedSampleBatch(SAMPLE_BATCH_TOKEN,this.count,this.geometry,this.sensors,this.meta,this.validity);
  }
}

function validateSample(
  sequence:number,time:number,x:number,y:number,pressure:number,tiltX:number,tiltY:number,
  buttons:number,pointerType:PointerTypeCode,viewGeneration:number,calibrationGeneration:number,validityFlags:number,
):void{
  if(!Number.isSafeInteger(sequence)||sequence<0||sequence>0xffff_ffff)throw new Error('invalid sequence');
  if(!Number.isFinite(time)||time<0||!Number.isFinite(x)||!Number.isFinite(y))throw new Error('invalid sample geometry');
  if(!Number.isFinite(pressure)||!Number.isFinite(tiltX)||!Number.isFinite(tiltY))throw new Error('invalid sample sensors');
  if((validityFlags&SampleValidity.Pressure)!==0&&(pressure<0||pressure>1))throw new Error('pressure must be within 0..1');
  if((validityFlags&SampleValidity.Tilt)!==0&&(tiltX<-90||tiltX>90||tiltY<-90||tiltY>90))throw new Error('tilt must be within -90..90');
  if(!Number.isSafeInteger(buttons)||buttons<0||buttons>0xffff_ffff)throw new Error('invalid buttons');
  if(!Number.isInteger(pointerType)||pointerType<PointerType.Mouse||pointerType>PointerType.Unknown)throw new Error('invalid pointer type');
  if(!Number.isSafeInteger(viewGeneration)||viewGeneration<0||viewGeneration>0xffff_ffff||!Number.isSafeInteger(calibrationGeneration)||calibrationGeneration<0||calibrationGeneration>0xffff_ffff)throw new Error('invalid generation');
  if(!Number.isSafeInteger(validityFlags)||validityFlags<0||validityFlags>0xffff)throw new Error('invalid validity flags');
}
