type Interruption=Readonly<{work:string;at:number;keep:boolean}>;
const key='illustro.input-interruptions.v1';

export function readInputInterruptions():Interruption[]{
  try{
    const values:unknown=JSON.parse(localStorage.getItem(key)??'[]');
    if(!Array.isArray(values))return [];
    return values.filter((item):item is Interruption=>item&&typeof item.work==='string'&&
      Number.isFinite(item.at)&&typeof item.keep==='boolean').slice(0,5);
  }catch{return [];}
}

export function recordInputInterruption(work:string,keep:boolean){
  try{
    const entries:Interruption[]=[{work:work.slice(0,120),at:Date.now(),keep},...readInputInterruptions()];
    localStorage.setItem(key,JSON.stringify(entries.slice(0,5)));
  }catch{/* Recovery journal still records any committed stroke. */}
}
