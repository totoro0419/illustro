/** C06 bounded asynchronous mask jobs. The input thread never waits for pixel loops. */
import {rasterizeSelection,combineSelection,featherMask,type SelectionShape,type MaskData,type CombineMode} from './mask';
type Reply=Readonly<{id:number;ok:boolean;alpha?:Uint8Array;error?:string}>;
export class MaskRasterWorker{
  private worker:Worker|null=null;
  private nextId=0;
  private pending=new Map<number,{resolve:(value:MaskData)=>void;reject:(reason:Error)=>void;width:number;height:number}>();
  constructor(){
    try{
      this.worker=new Worker(new URL('./mask.worker.ts',import.meta.url),{type:'module'});
      this.worker.onmessage=(event:MessageEvent<Reply>)=>{
        const message=event.data,item=this.pending.get(message.id);
        if(!item)return;
        this.pending.delete(message.id);
        if(message.ok&&message.alpha?.length===item.width*item.height)
          item.resolve({width:item.width,height:item.height,alpha:message.alpha});
        else item.reject(Error(message.error??'選択範囲を生成できませんでした。'));
      };
      this.worker.onerror=event=>{
        for(const item of this.pending.values())item.reject(Error(event.message||'選択範囲の計算に失敗しました。'));
        this.pending.clear();this.worker?.terminate();this.worker=null;
      };
    }catch{this.worker=null;}
  }
  private execute(width:number,height:number,action:'shape'|'feather',params:{
    shape?:SelectionShape;mode?:CombineMode;previous?:MaskData|null;radius?:number
  }):Promise<MaskData>{
    if(!this.worker){
      return Promise.resolve().then(()=>{
        const old=params.previous??null;
        if(action==='feather'){
          if(!old)throw Error('選択範囲がありません。');
          return featherMask(old,params.radius??0);
        }
        if(!params.shape)throw Error('選択の形がありません。');
        return combineSelection(old,rasterizeSelection(params.shape,width,height),params.mode??'replace');
      });
    }
    const id=++this.nextId,old=params.previous?.alpha.slice()??null;
    const request={id,action,width,height,...(params.shape?{shape:params.shape}:{}),
      ...(params.mode?{mode:params.mode}:{}),...(params.radius!==undefined?{radius:params.radius}:{}),
      ...(old?{previous:old}:{})};
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject,width,height});
      this.worker!.postMessage(request,old?[old.buffer]:[]);
    });
  }
  shape(shape:SelectionShape,previous:MaskData|null,mode:CombineMode,width:number,height:number){
    return this.execute(width,height,'shape',{shape,previous,mode});
  }
  feather(mask:MaskData,radius:number){
    return this.execute(mask.width,mask.height,'feather',{previous:mask,radius});
  }
  destroy(){
    this.worker?.terminate();this.worker=null;
    for(const pending of this.pending.values())pending.reject(Error('選択範囲の処理を中止しました。'));
    this.pending.clear();
  }
}
