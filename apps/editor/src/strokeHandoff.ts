import type {StrokeRecord} from '@illustro/brush-rt';
import type {EditorController} from './controller';
import type {DrawingTarget,StrokeCommitResult} from './ports';
import {EmptyStrokeError} from './strokeCommit';

export type StrokeReservation={readonly sequence:number;readonly target:DrawingTarget};
type Pending={reservation:StrokeReservation;record?:StrokeRecord;additional?:readonly StrokeRecord[];resolve?:(value:StrokeCommitResult)=>void;reject?:(error:unknown)=>void};
/** Only revisions published by this queue may advance a reserved local base. */
export class StrokeHandoff{
  private items:Pending[]=[];private sequence=0;private running=false;private expected:DrawingTarget['baseRevision']|null=null;private fault:unknown=null;
  private waiters:Array<{resolve:()=>void;reject:(error:unknown)=>void}>=[];
  constructor(private controller:EditorController,private published:(reservation:StrokeReservation,record:StrokeRecord,additional:readonly StrokeRecord[],result:StrokeCommitResult)=>void){}
  get pending(){return this.items.length;}
  reserve(target:DrawingTarget){
    if(this.fault)throw this.fault;if(!this.items.length&&!this.running)this.expected=target.baseRevision;
    if(this.controller.document.head!==this.expected)throw new Error('描画中に作品の状態が変わりました。');
    const reservation=Object.freeze({sequence:++this.sequence,target});this.items.push({reservation});return reservation;
  }
  cancel(reservation:StrokeReservation){const index=this.items.findIndex(item=>item.reservation===reservation);if(index<0)return;if(this.items[index]?.record)throw new Error('Cannot cancel a released stroke');this.items.splice(index,1);void this.pump();}
  release(reservation:StrokeReservation,record:StrokeRecord,additional:readonly StrokeRecord[]=[]):Promise<StrokeCommitResult>{
    const item=this.items.find(item=>item.reservation===reservation);if(!item||item.record)return Promise.reject(new Error('Unknown or repeated stroke release'));if(this.fault)return Promise.reject(this.fault);
    const result=new Promise<StrokeCommitResult>((resolve,reject)=>{Object.assign(item,{record,additional,resolve,reject});});void this.pump();return result;
  }
  fail(error:unknown){this.fault=error;for(const item of this.items)item.reject?.(error);for(const waiter of this.waiters)waiter.reject(error);this.waiters=[];}
  barrier():Promise<void>{if(this.fault)return Promise.reject(this.fault);if(!this.items.length&&!this.running)return Promise.resolve();return new Promise((resolve,reject)=>this.waiters.push({resolve,reject}));}
  private async pump(){
    if(this.running||this.fault)return;this.running=true;
    try{while(this.items[0]?.record){const item=this.items[0],record=item.record!,additional=item.additional??[];
      if(this.controller.document.head!==this.expected)throw new Error('描画中に作品の状態が変わりました。');
      try{const target={...item.reservation.target,baseRevision:this.expected!},result=await this.controller.finishStroke(target,record,additional);
        this.expected=result.revisionId;this.items.shift();try{this.published(item.reservation,record,additional,result);}catch(error){item.reject!(error);throw error;}item.resolve!(result);
      }catch(error){if(error instanceof EmptyStrokeError){this.items.shift();item.reject!(error);continue;}throw error;}
    }}catch(error){this.fail(error);}finally{this.running=false;if(!this.items.length&&!this.fault){for(const waiter of this.waiters)waiter.resolve();this.waiters=[];}}
  }
}
