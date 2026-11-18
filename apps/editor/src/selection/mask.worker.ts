import {rasterizeSelection,combineSelection,featherMask,growOrShrink,selectionBorder,brushSelection,boundsOfSelection,type SelectionBrushPoint,type SelectionBrushSettings,type MaskData,type SelectionShape,type CombineMode} from './mask';
import {selectFromPixels,type AnalyzeOptions} from './autoSelect';
import {LiveSelectionBrushPreview} from './liveBrushPreview';
type Request={id:number;action:'shape'|'feather'|'grow'|'shrink'|'border'|'analyze'|'brush'|'brush-preview'|'brush-preview-end';width:number;height:number;pixels?:Uint8ClampedArray;analyze?:AnalyzeOptions;
  liveKey?:string;initialize?:boolean;
  shape?:SelectionShape;previous?:Uint8Array;mode?:CombineMode;radius?:number;
  brushPoints?:readonly SelectionBrushPoint[];brushSettings?:SelectionBrushSettings;};
let live:{key:string;preview:LiveSelectionBrushPreview}|null=null;
self.onmessage=(event:MessageEvent<Request>)=>{
  const input=event.data;
  try{
    if(input.action==='brush-preview-end'){
      if(live?.key===input.liveKey)live=null;
      return;
    }
    if(input.action==='brush-preview'&&input.liveKey&&input.brushPoints&&input.brushSettings){
      if(input.initialize)live={key:input.liveKey,preview:new LiveSelectionBrushPreview({width:input.width,height:input.height,
        alpha:input.previous??new Uint8Array(input.width*input.height)})};
      if(live?.key!==input.liveKey)throw Error('選択ブラシの途中表示を準備できませんでした。');
      const preview=live.preview.render(input.brushPoints,input.brushSettings);
      (self as unknown as Worker).postMessage({id:input.id,ok:true,preview},[preview.alpha.buffer as ArrayBuffer]);
      return;
    }
    let result:MaskData;
    if(input.action==='shape'&&input.shape){
      const fresh=rasterizeSelection(input.shape,input.width,input.height);
      const previous=input.previous?{width:input.width,height:input.height,alpha:input.previous}:null;
      result=combineSelection(previous,fresh,input.mode??'replace');
    }else if(input.action==='feather'&&input.previous){
      result=featherMask({width:input.width,height:input.height,alpha:input.previous},input.radius??0);
    }else if(input.action==='brush'&&input.brushPoints&&input.brushSettings){
      const previous=input.previous??new Uint8Array(input.width*input.height);
      result=brushSelection({width:input.width,height:input.height,alpha:previous},input.brushPoints,input.brushSettings);
    }else if(input.action==='analyze'&&input.pixels&&input.analyze){
      result=selectFromPixels(input.pixels,input.analyze);
    }else if(input.previous&&(input.action==='grow'||input.action==='shrink'||input.action==='border')){
      const previous={width:input.width,height:input.height,alpha:input.previous};
      result=input.action==='border'?selectionBorder(previous,input.radius??0):
        growOrShrink(previous,input.radius??0,input.action);
    }else throw Error('選択範囲の計算方法が正しくありません。');
    const bounds=boundsOfSelection(result);
    (self as unknown as Worker).postMessage({id:input.id,ok:true,alpha:result.alpha,bounds},[result.alpha.buffer]);
  }catch(error){
    (self as unknown as Worker).postMessage({id:input.id,ok:false,
      error:error instanceof Error?error.message:String(error)});
  }
};
