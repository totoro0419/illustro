/** C06 bounded asynchronous mask jobs. The input thread never waits for pixel loops. */
import {rasterizeSelection,combineSelection,featherMask,growOrShrink,selectionBorder,brushSelection,type SelectionBrushPoint,type SelectionBrushSettings,type SelectionShape,type MaskData,type CombineMode} from './mask';
import {selectFromPixels,type AnalyzeOptions} from './autoSelect';
import type {SelectionBrushPreviewRaster} from './brushPreview';
type Reply=Readonly<{id:number;ok:boolean;alpha?:Uint8Array;preview?:SelectionBrushPreviewRaster;error?:string}>;
export class MaskRasterWorker{
  private worker:Worker|null=null;
  private nextId=0;
  private pending=new Map<number,{resolve:(value:MaskData)=>void;reject:(reason:Error)=>void;width:number;height:number}>();
  private previews=new Map<number,{resolve:(value:SelectionBrushPreviewRaster)=>void;reject:(reason:Error)=>void}>();
  private liveKey:string|null=null;
  constructor(){
    try{
      this.worker=new Worker(new URL('./mask.worker.ts',import.meta.url),{type:'module'});
      this.worker.onmessage=(event:MessageEvent<Reply>)=>{
        const message=event.data,preview=this.previews.get(message.id);
        if(preview){
          this.previews.delete(message.id);
          if(message.ok&&message.preview&&message.preview.alpha.length===message.preview.width*message.preview.height)
            preview.resolve(message.preview);
          else preview.reject(Error(message.error??'選択ブラシの途中表示を作れませんでした。'));
          return;
        }
        const item=this.pending.get(message.id);
        if(!item)return;
        this.pending.delete(message.id);
        if(message.ok&&message.alpha?.length===item.width*item.height)
          item.resolve({width:item.width,height:item.height,alpha:message.alpha});
        else item.reject(Error(message.error??'選択範囲を生成できませんでした。'));
      };
      this.worker.onerror=event=>{
        for(const item of this.pending.values())item.reject(Error(event.message||'選択範囲の計算に失敗しました。'));
        for(const item of this.previews.values())item.reject(Error(event.message||'選択ブラシの途中表示に失敗しました。'));
        this.previews.clear();this.liveKey=null;
        this.pending.clear();this.worker?.terminate();this.worker=null;
      };
    }catch{this.worker=null;}
  }
  private execute(width:number,height:number,action:'shape'|'feather'|'grow'|'shrink'|'border'|'brush',params:{
    shape?:SelectionShape;mode?:CombineMode;previous?:MaskData|null;radius?:number;
    brushPoints?:readonly SelectionBrushPoint[];brushSettings?:SelectionBrushSettings
  }):Promise<MaskData>{
    if(!this.worker){
      return Promise.resolve().then(()=>{
        const old=params.previous??null;
        if(action==='feather'){
          if(!old)throw Error('選択範囲がありません。');
          return featherMask(old,params.radius??0);
        }
        if(action==='brush'){
          if(!params.brushPoints||!params.brushSettings)throw Error('選択ブラシの設定が不足しています。');
          return brushSelection(old??{width,height,alpha:new Uint8Array(width*height)},params.brushPoints,params.brushSettings);
        }
        if(action==='grow'||action==='shrink'||action==='border'){
          if(!old)throw Error('選択範囲がありません。');
          return action==='border'?selectionBorder(old,params.radius??0):growOrShrink(old,params.radius??0,action);
        }
        if(!params.shape)throw Error('選択の形がありません。');
        return combineSelection(old,rasterizeSelection(params.shape,width,height),params.mode??'replace');
      });
    }
    const id=++this.nextId,old=params.previous?.alpha.slice()??null;
    const request={id,action,width,height,...(params.shape?{shape:params.shape}:{}),
      ...(params.mode?{mode:params.mode}:{}),...(params.radius!==undefined?{radius:params.radius}:{}),
      ...(params.brushPoints?{brushPoints:params.brushPoints}:{}),
      ...(params.brushSettings?{brushSettings:params.brushSettings}:{}),
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
  adjust(mask:MaskData,radius:number,mode:'grow'|'shrink'|'border'){
    return this.execute(mask.width,mask.height,mode,{previous:mask,radius});
  }
  brush(previous:MaskData|null,width:number,height:number,points:readonly SelectionBrushPoint[],settings:SelectionBrushSettings){
    return this.execute(width,height,'brush',{previous,brushPoints:points,brushSettings:settings});
  }
  get supportsBrushPreview(){return this.worker!==null;}
  brushPreview(liveKey:string,previous:MaskData|null,width:number,height:number,points:readonly SelectionBrushPoint[],settings:SelectionBrushSettings){
    if(!this.worker)return Promise.reject(Error('選択ブラシの途中計算を使えません。'));
    const id=++this.nextId,initialize=this.liveKey!==liveKey;
    return new Promise<SelectionBrushPreviewRaster>((resolve,reject)=>{
      this.previews.set(id,{resolve,reject});
      try{
        this.worker!.postMessage({id,action:'brush-preview',liveKey,initialize,width,height,
          brushPoints:points,brushSettings:settings,...(initialize&&previous?{previous:previous.alpha}:{})});
        this.liveKey=liveKey;
      }catch(error){this.previews.delete(id);reject(error);}
    });
  }
  endBrushPreview(liveKey:string){
    if(this.liveKey!==liveKey)return;
    this.liveKey=null;
    this.worker?.postMessage({action:'brush-preview-end',liveKey});
  }
  analyze(pixels:Uint8ClampedArray,options:AnalyzeOptions):Promise<MaskData>{
    if(pixels.length!==options.width*options.height*4)
      return Promise.reject(Error('選択に必要な画素が不足しています。'));
    if(!this.worker)return Promise.resolve().then(()=>selectFromPixels(pixels,options));
    const id=++this.nextId,transfer=new Uint8ClampedArray(pixels);
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject,width:options.width,height:options.height});
      this.worker!.postMessage({
        id,action:'analyze',width:options.width,height:options.height,
        analyze:options,pixels:transfer
      },[transfer.buffer]);
    });
  }
  destroy(){
    this.worker?.terminate();this.worker=null;
    for(const pending of this.pending.values())pending.reject(Error('選択範囲の処理を中止しました。'));
    this.pending.clear();
    for(const pending of this.previews.values())pending.reject(Error('選択ブラシの途中表示を終了しました。'));
    this.previews.clear();this.liveKey=null;
  }
}
