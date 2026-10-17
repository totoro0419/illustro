export type HistoryDirection='undo'|'redo';
type Request=Readonly<{direction:HistoryDirection;sequence:number;at:number}>;
type Ports={prepare:()=>Promise<void>;apply:(directions:readonly HistoryDirection[])=>Promise<void>;state:()=>void;failed:(message:string,unprocessed:number)=>void};

/** A bounded command queue. Every accepted command keeps its order; only derived
 * presentation is batched. No debounce timer, repeat suppression or dropped clicks. */
export class HistoryNavigation{
  private requests:Request[]=[];private running=false;private issued=0;private finished=0;
  private waiters:Array<{through:number;resolve:()=>void;reject:(error:Error)=>void}>=[];
  private fault:Error|null=null;private active:readonly Request[]=[];
  private accepted=0;private refused=0;private batches=0;private peak=0;
  private traces:Array<{sequence:number;direction:HistoryDirection;queueMs:number;completeMs:number}>=[];
  constructor(private readonly ports:Ports,private readonly measure=false,private readonly capacity=256){}
  get pending(){return this.running||this.requests.length>0;}
  enqueue(direction:HistoryDirection){
    if(this.fault||this.requests.length+this.active.length>=this.capacity){this.refused++;this.ports.failed(this.fault?.message??'Undo / Redoの受付上限です。反映が進んでからもう一度操作してください。',0);return false;}
    this.requests.push({direction,sequence:++this.issued,at:performance.now()});this.accepted++;this.peak=Math.max(this.peak,this.requests.length+this.active.length);
    if(!this.running){this.running=true;this.ports.state();void this.pump();}else this.ports.state();return true;
  }
  barrier(){if(this.fault)return Promise.reject(this.fault);if(this.finished===this.issued)return Promise.resolve();return new Promise<void>((resolve,reject)=>this.waiters.push({through:this.issued,resolve,reject}));}
  get diagnostics(){return {pending:this.pending,queued:this.requests.length,active:this.active.length,accepted:this.accepted,refused:this.refused,batches:this.batches,peak:this.peak,fault:this.fault?.message??null,traces:this.measure?this.traces:[]};}
  private async pump(){
    try{
      await this.ports.prepare();
      while(this.requests.length){
        // Admission already bounds this batch. A fixed 32-command slice forced
        // repeated dirty reconstruction/presentation for an already queued burst.
        this.active=this.requests.splice(0);const start=performance.now();await this.ports.apply(this.active.map(r=>r.direction));this.batches++;
        const end=performance.now();for(const r of this.active){this.finished=r.sequence;if(this.measure)this.traces.push({sequence:r.sequence,direction:r.direction,queueMs:start-r.at,completeMs:end-r.at});}
        if(this.traces.length>1200)this.traces.splice(0,this.traces.length-1200);this.active=[];
        this.waiters=this.waiters.filter(w=>{if(w.through>this.finished)return true;w.resolve();return false;});this.ports.state();
      }
    }catch(error){
      this.fault=error instanceof Error?error:new Error(String(error));const unprocessed=this.requests.length+this.active.length;this.requests=[];this.active=[];
      for(const w of this.waiters)w.reject(this.fault);this.waiters=[];this.ports.failed(this.fault.message,unprocessed);
    }finally{this.running=false;this.ports.state();}
  }
}
