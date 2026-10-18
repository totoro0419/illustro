import type {StrokeRecord} from '@illustro/brush-rt';
import type {EditorController} from './controller';
import type {DrawingTarget,StrokeCommitResult} from './ports';
import {EmptyStrokeError} from './strokeCommit';

export type StrokeReservation={readonly sequence:number;readonly target:DrawingTarget};
type Pending={reservation:StrokeReservation;record?:StrokeRecord;additional:readonly StrokeRecord[];hidden:boolean;discarded:boolean;publishing:boolean;resolve?:(value:StrokeCommitResult|null)=>void;reject?:(error:unknown)=>void};
/** Reservations are history entries from pointer-down, before a worker record exists.
 * Hidden entries retain their record for Redo, but never block publication or Undo.
 * Only a visible prefix is published into the immutable document. */
export class StrokeHandoff{
  private items:Pending[]=[];private redoItems:Pending[]=[];private entries=new Map<StrokeReservation,Pending>();
  private sequence=0;private running=false;private expected:DrawingTarget['baseRevision']|null=null;private fault:unknown=null;
  private waiters:Array<{resolve:()=>void;reject:(error:unknown)=>void}>=[];
  constructor(private controller:EditorController,private published:(reservation:StrokeReservation,record:StrokeRecord,additional:readonly StrokeRecord[],result:StrokeCommitResult,undone?:boolean)=>void,private discarded:(record:StrokeRecord)=>void=()=>{}){}
  owns(reservation:StrokeReservation){return this.entries.has(reservation);}
  get pending(){return this.items.length;}
  get canUndo(){return this.items.some(item=>!item.hidden&&!item.discarded);}
  get canRedo(){return this.redoItems.length>0;}
  get publishing(){return this.items.some(item=>item.publishing);}
  get diagnostics(){return {pending:this.pending,redo:this.redoItems.length,publishing:this.publishing,entries:[...this.entries.values()].map(e=>({sequence:e.reservation.sequence,visible:!e.hidden,recordReady:!!e.record,phase:e.publishing?'publishing':e.discarded?'discarded':e.hidden?'undone':'reserved'}))};}
  reserve(target:DrawingTarget){
    if(this.fault)throw this.fault;if(!this.items.length&&!this.running)this.expected=target.baseRevision;
    if(this.controller.document.head!==this.expected)throw new Error('描画中に作品の状態が変わりました。');
    this.discardRedo();
    const reservation=Object.freeze({sequence:++this.sequence,target});const item:Pending={reservation,additional:[],hidden:false,discarded:false,publishing:false};
    this.entries.set(reservation,item);this.items.push(item);return reservation;
  }
  discardRedo(){for(const item of this.redoItems){item.discarded=true;if(item.record&&!item.publishing){this.discarded(item.record);this.entries.delete(item.reservation);}}this.redoItems=[];}
  /** Synchronous history admission. No record, GPU or document barrier here. */
  undoPending(){
    const item=this.items.findLast(e=>!e.hidden&&!e.discarded);if(!item)return null;
    item.hidden=true;this.redoItems.push(item);if(!item.publishing)this.items.splice(this.items.indexOf(item),1);
    item.resolve?.(null);void this.pump();return item.reservation;
  }
  redoPending(){
    const item=this.redoItems.pop();if(!item)return null;item.hidden=false;
    if(!this.items.includes(item)){this.items.push(item);this.items.sort((a,b)=>a.reservation.sequence-b.reservation.sequence);}
    // The caller restores preview ownership before publication starts.
    return item.reservation;
  }
  resume(){void this.pump();}
  rebase(){if(!this.items.length&&!this.running)this.expected=this.controller.document.head;}
  cancel(reservation:StrokeReservation){const item=this.entries.get(reservation);if(!item)return;if(item.record)throw new Error('Cannot cancel a released stroke');item.discarded=true;this.items=this.items.filter(e=>e!==item);this.entries.delete(reservation);void this.pump();}
  release(reservation:StrokeReservation,record:StrokeRecord,additional:readonly StrokeRecord[]=[]):Promise<StrokeCommitResult|null>{
    const item=this.entries.get(reservation);if(!item||item.record)return Promise.reject(new Error('Unknown or repeated stroke release'));if(this.fault)return Promise.reject(this.fault);
    Object.assign(item,{record,additional});if(item.discarded){this.discarded(record);this.entries.delete(reservation);return Promise.resolve(null);}
    if(item.hidden)return Promise.resolve(null);
    const result=new Promise<StrokeCommitResult|null>((resolve,reject)=>{Object.assign(item,{resolve,reject});});void this.pump();return result;
  }
  fail(error:unknown){this.fault=error;for(const item of this.entries.values())item.reject?.(error);for(const waiter of this.waiters)waiter.reject(error);this.waiters=[];}
  barrier():Promise<void>{if(this.fault)return Promise.reject(this.fault);if(!this.items.length&&!this.running)return Promise.resolve();return new Promise((resolve,reject)=>this.waiters.push({resolve,reject}));}
  private async pump(){
    if(this.running||this.fault)return;this.running=true;
    try{while(this.items[0]?.record){const item=this.items[0],record=item.record!,additional=item.additional;
      if(this.controller.document.head!==this.expected)throw new Error('描画中に作品の状態が変わりました。');
      try{item.publishing=true;const target={...item.reservation.target,baseRevision:this.expected!},result=await this.controller.finishStroke(target,record,additional);
        this.expected=result.revisionId;this.items.shift();
        // An asynchronous document port may complete after cancellation. Move its
        // immutable entry directly into Redo without submitting formal GPU work.
        const undone=item.hidden||item.discarded;if(undone){this.controller.undo();this.expected=this.controller.document.head;this.redoItems=this.redoItems.filter(e=>e!==item);}
        this.published(item.reservation,record,additional,result,undone);this.entries.delete(item.reservation);item.resolve?.(result);
      }catch(error){if(error instanceof EmptyStrokeError){this.items=this.items.filter(e=>e!==item);this.redoItems=this.redoItems.filter(e=>e!==item);this.entries.delete(item.reservation);item.reject?.(error);continue;}throw error;}
    }}catch(error){this.fail(error);}finally{this.running=false;if(!this.items.length&&!this.fault){for(const waiter of this.waiters)waiter.resolve();this.waiters=[];}}
  }
}
