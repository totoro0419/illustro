import {rasterizeSelection,combineSelection,featherMask,boundsOfSelection,type MaskData,type SelectionShape,type CombineMode} from './mask';
type Request={id:number;action:'shape'|'feather';width:number;height:number;
  shape?:SelectionShape;previous?:Uint8Array;mode?:CombineMode;radius?:number};
self.onmessage=(event:MessageEvent<Request>)=>{
  const input=event.data;
  try{
    let result:MaskData;
    if(input.action==='shape'&&input.shape){
      const fresh=rasterizeSelection(input.shape,input.width,input.height);
      const previous=input.previous?{width:input.width,height:input.height,alpha:input.previous}:null;
      result=combineSelection(previous,fresh,input.mode??'replace');
    }else if(input.action==='feather'&&input.previous){
      result=featherMask({width:input.width,height:input.height,alpha:input.previous},input.radius??0);
    }else throw Error('選択範囲の計算方法が正しくありません。');
    const bounds=boundsOfSelection(result);
    (self as unknown as Worker).postMessage({id:input.id,ok:true,alpha:result.alpha,bounds},[result.alpha.buffer]);
  }catch(error){
    (self as unknown as Worker).postMessage({id:input.id,ok:false,
      error:error instanceof Error?error.message:String(error)});
  }
};
