import {CanonicalBuilder,type StrokeRecord} from '@illustro/brush-rt';
import {symmetryCopies,symmetrySample,type SymmetrySettings} from './strokeSymmetry';

self.onmessage=({data}:MessageEvent<{record:StrokeRecord;settings:SymmetrySettings}>)=>{
  try{
    const {record,settings}=data;
    const copies:StrokeRecord[]=[],paths=[record.raw];
    for(const transform of symmetryCopies(settings)){
      const input=record.raw.map(sample=>symmetrySample(sample,settings,transform));
      const same=paths.some(path=>path.every((sample,index)=>{
        const other=input[index]!;
        return Math.hypot(sample.x-other.x,sample.y-other.y)<.0001;
      }));
      if(same)continue;
      paths.push(input);
      const builder=new CanonicalBuilder(record.version===3?record.foundation:record.preset,
        [record.seed[0],record.seed[1]],record.fast,record.version===3?record.context:undefined);
      for(const sample of input)builder.accept(sample);
      if(record.version===3&&record.releaseInput)builder.release(symmetrySample(record.releaseInput,settings,transform));
      builder.finish();
      copies.push(builder.record());
    }
    self.postMessage({copies});
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
