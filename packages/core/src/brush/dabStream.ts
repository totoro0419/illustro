const STRIDE=3;
const CHUNK_DABS=256;

class DabChunk{
  constructor(private readonly data:Float64Array,readonly count:number){}
  x(i:number){return this.data[i*STRIDE]??0;}
  y(i:number){return this.data[i*STRIDE+1]??0;}
  diameter(i:number){return this.data[i*STRIDE+2]??0;}
  copyInto(target:Float64Array,targetDabOffset:number){
    target.set(this.data.subarray(0,this.count*STRIDE),targetDabOffset*STRIDE);
  }
}

export class PackedDabStream{
  constructor(private readonly chunks:readonly DabChunk[],readonly count:number){}
  x(index:number){const [c,i]=this.locate(index);return c.x(i);}
  y(index:number){const [c,i]=this.locate(index);return c.y(i);}
  diameter(index:number){const [c,i]=this.locate(index);return c.diameter(i);}
  toFloat64Array(){
    const out=new Float64Array(this.count*STRIDE);
    let offset=0;
    for(const chunk of this.chunks){chunk.copyInto(out,offset);offset+=chunk.count;}
    return out;
  }
  private locate(index:number):readonly [DabChunk,number]{
    if(!Number.isSafeInteger(index)||index<0||index>=this.count)throw new Error('dab index out of range');
    const chunkIndex=Math.floor(index/CHUNK_DABS),local=index%CHUNK_DABS,chunk=this.chunks[chunkIndex];
    if(!chunk)throw new Error('missing dab chunk');
    return [chunk,local];
  }
}

export class DabStreamBuilder{
  private readonly chunks:DabChunk[]=[];
  private current=new Float64Array(CHUNK_DABS*STRIDE);
  private currentCount=0;
  private total=0;
  private sealed=false;

  append(x:number,y:number,diameter:number){
    if(this.sealed)throw new Error('dab stream is sealed');
    if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(diameter)||diameter<=0)throw new Error('invalid dab');
    const p=this.currentCount*STRIDE;
    this.current[p]=x;this.current[p+1]=y;this.current[p+2]=diameter;
    this.currentCount++;this.total++;
    if(this.currentCount===CHUNK_DABS)this.flushFullChunk();
  }

  seal():PackedDabStream{
    if(this.sealed)throw new Error('dab stream is sealed');
    this.sealed=true;
    if(this.currentCount>0)this.chunks.push(new DabChunk(this.current,this.currentCount));
    return new PackedDabStream(Object.freeze([...this.chunks]),this.total);
  }

  private flushFullChunk(){
    this.chunks.push(new DabChunk(this.current,this.currentCount));
    this.current=new Float64Array(CHUNK_DABS*STRIDE);
    this.currentCount=0;
  }
}
