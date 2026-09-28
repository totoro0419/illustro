export const PointerType={Mouse:0,Pen:1,Touch:2,Unknown:3} as const;
export type PointerTypeCode=(typeof PointerType)[keyof typeof PointerType];
export const SampleValidity={Pressure:1<<0,Tilt:1<<1} as const;
export const SampleProvenance={Predicted:1<<15} as const;

const SAMPLE_BATCH_TOKEN=Symbol('illustro-sample-batch');
const GEOMETRY_STRIDE=3,SENSOR_STRIDE=3,META_STRIDE=6;

export class PackedSampleBatch{
 readonly count:number;
 readonly #geometry:Float64Array;readonly #sensors:Float32Array;readonly #meta:Uint32Array;readonly #flags:Uint16Array;
 constructor(token:typeof SAMPLE_BATCH_TOKEN,count:number,geometry:Float64Array,sensors:Float32Array,meta:Uint32Array,flags:Uint16Array){
  if(token!==SAMPLE_BATCH_TOKEN)throw new Error('invalid sample batch capability');
  this.count=count;this.#geometry=geometry;this.#sensors=sensors;this.#meta=meta;this.#flags=flags;Object.freeze(this);
 }
 sequence(i:number){return this.#meta[i*META_STRIDE]??0;}monotonicTime(i:number){return this.#geometry[i*GEOMETRY_STRIDE]??0;}
 x(i:number){return this.#geometry[i*GEOMETRY_STRIDE+1]??0;}y(i:number){return this.#geometry[i*GEOMETRY_STRIDE+2]??0;}
 pressure(i:number){return this.#sensors[i*SENSOR_STRIDE]??0;}tiltX(i:number){return this.#sensors[i*SENSOR_STRIDE+1]??0;}tiltY(i:number){return this.#sensors[i*SENSOR_STRIDE+2]??0;}
 buttons(i:number){return this.#meta[i*META_STRIDE+1]??0;}pointerType(i:number){return (this.#meta[i*META_STRIDE+2]??PointerType.Unknown) as PointerTypeCode;}
 contact(i:number){return (this.#meta[i*META_STRIDE+3]??0)!==0;}viewGeneration(i:number){return this.#meta[i*META_STRIDE+4]??0;}calibrationGeneration(i:number){return this.#meta[i*META_STRIDE+5]??0;}
 flags(i:number){return this.#flags[i]??0;}pressureValid(i:number){return (this.flags(i)&SampleValidity.Pressure)!==0;}tiltValid(i:number){return (this.flags(i)&SampleValidity.Tilt)!==0;}predicted(i:number){return (this.flags(i)&SampleProvenance.Predicted)!==0;}
}

export class SampleBatchBuilder{
 readonly count:number;
 readonly #geometry:Float64Array;readonly #sensors:Float32Array;readonly #meta:Uint32Array;readonly #flags:Uint16Array;readonly #written:Uint8Array;
 #sealed=false;
 constructor(count:number){
  if(!Number.isSafeInteger(count)||count<=0)throw new Error('sample count must be a positive safe integer');
  this.count=count;this.#geometry=new Float64Array(count*GEOMETRY_STRIDE);this.#sensors=new Float32Array(count*SENSOR_STRIDE);this.#meta=new Uint32Array(count*META_STRIDE);this.#flags=new Uint16Array(count);this.#written=new Uint8Array(count);
 }
 write(index:number,sequence:number,monotonicTime:number,x:number,y:number,pressure:number,tiltX:number,tiltY:number,buttons:number,pointerType:PointerTypeCode,contact:boolean,viewGeneration:number,calibrationGeneration:number,flags:number):void{
  if(this.#sealed)throw new Error('sample batch builder is sealed');if(!Number.isSafeInteger(index)||index<0||index>=this.count)throw new Error('sample index out of range');
  validateSample(sequence,monotonicTime,x,y,pressure,tiltX,tiltY,buttons,pointerType,viewGeneration,calibrationGeneration,flags);
  const g=index*GEOMETRY_STRIDE,s=index*SENSOR_STRIDE,m=index*META_STRIDE;
  this.#geometry[g]=monotonicTime;this.#geometry[g+1]=x;this.#geometry[g+2]=y;
  this.#sensors[s]=(flags&SampleValidity.Pressure)!==0?pressure:0;this.#sensors[s+1]=(flags&SampleValidity.Tilt)!==0?tiltX:0;this.#sensors[s+2]=(flags&SampleValidity.Tilt)!==0?tiltY:0;
  this.#meta[m]=sequence;this.#meta[m+1]=buttons;this.#meta[m+2]=pointerType;this.#meta[m+3]=contact?1:0;this.#meta[m+4]=viewGeneration;this.#meta[m+5]=calibrationGeneration;
  this.#flags[index]=flags;this.#written[index]=1;
 }
 seal(){
  if(this.#sealed)throw new Error('sample batch builder is sealed');for(let i=0;i<this.count;i++)if(this.#written[i]!==1)throw new Error('sample batch has unwritten slots');
  this.#sealed=true;return new PackedSampleBatch(SAMPLE_BATCH_TOKEN,this.count,this.#geometry,this.#sensors,this.#meta,this.#flags);
 }
}

function validateSample(sequence:number,time:number,x:number,y:number,pressure:number,tiltX:number,tiltY:number,buttons:number,pointerType:PointerTypeCode,viewGeneration:number,calibrationGeneration:number,flags:number){
 if(!Number.isSafeInteger(sequence)||sequence<0||sequence>0xffff_ffff)throw new Error('invalid sequence');
 if(!Number.isFinite(time)||time<0||!Number.isFinite(x)||!Number.isFinite(y))throw new Error('invalid sample geometry');
 if((flags&SampleValidity.Pressure)!==0&&(!Number.isFinite(pressure)||pressure<0||pressure>1))throw new Error('pressure must be within 0..1');
 if((flags&SampleValidity.Tilt)!==0&&(!Number.isFinite(tiltX)||!Number.isFinite(tiltY)||tiltX<-90||tiltX>90||tiltY<-90||tiltY>90))throw new Error('tilt must be within -90..90');
 if(!Number.isSafeInteger(buttons)||buttons<0||buttons>0xffff_ffff)throw new Error('invalid buttons');
 if(!Number.isInteger(pointerType)||pointerType<PointerType.Mouse||pointerType>PointerType.Unknown)throw new Error('invalid pointer type');
 if(!Number.isSafeInteger(viewGeneration)||viewGeneration<0||viewGeneration>0xffff_ffff||!Number.isSafeInteger(calibrationGeneration)||calibrationGeneration<0||calibrationGeneration>0xffff_ffff)throw new Error('invalid generation');
 if(!Number.isSafeInteger(flags)||flags<0||flags>0xffff)throw new Error('invalid sample flags');
}
