import {CoreDocument} from '@illustro/core';
import {CoreStrokeDocumentPort,EmptyStrokeError} from '../strokeCommit';
import {readLegacyStrokeDocument} from './legacyMigration';
import {createPortableDocument,openPortableDocument} from './portable';

self.onmessage=async({data}:MessageEvent<{bytes:Uint8Array;name?:string}>)=>{
  try{
    const source=readLegacyStrokeDocument(data.bytes);
    if(data.name===undefined){self.postMessage({source});return;}
    const document=new CoreDocument({width:source.width,height:source.height,name:data.name});
    const port=new CoreStrokeDocumentPort(document);
    let outside=0;
    for(const stroke of source.strokes){
      try{await port.commitStroke(port.target(),stroke);}
      catch(error){if(!(error instanceof EmptyStrokeError))throw error;outside++;}
    }
    const notices=[
      '試作版の描線とそのブラシ設定を1枚の描画レイヤーに移しました。',
      '旧ファイルに保存されていない選択範囲、資料、レイヤー構成は復元できません。',
      ...(outside?[outside+'件の描線はキャンバスの外にあり、移行後の履歴には含まれません。']:[])
    ];
    const {bytes}=await createPortableDocument({document,selectedLayerId:document.defaultRasterLayerId,preserved:{
      optionalSections:[],manifestExtras:{legacyMigration:{format:source.format,importedStrokes:source.strokes.length-outside,omittedStrokes:outside}}
    }});
    const reopened=await openPortableDocument(bytes);
    if(reopened.document.rasterReplayPlan().operations.filter(operation=>operation.kind==='brush.stroke').length!==source.strokes.length-outside)
      throw Error('移行後に描線の数が一致しませんでした。');
    const post=self as unknown as Worker;
    post.postMessage({bytes,notices},[bytes.buffer as ArrayBuffer]);
  }catch(error){
    self.postMessage({error:error instanceof Error?error.message:String(error)});
  }
};
