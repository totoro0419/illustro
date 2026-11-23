import {CoreDocument} from '@illustro/core';
import {CoreStrokeDocumentPort,EmptyStrokeError} from '../strokeCommit';
import {readLegacyStrokeDocument} from './legacyMigration';
import {createPortableDocument,openPortableDocument} from './portable';
import {assertLegacyStrokeIntegrity} from './legacyStrokeIntegrity';
import type {StrokeRecord} from '@illustro/brush-rt';

self.onmessage=async({data}:MessageEvent<{bytes:Uint8Array;name?:string}>)=>{
  try{
    const source=readLegacyStrokeDocument(data.bytes);
    if(data.name===undefined){self.postMessage({source});return;}
    const document=new CoreDocument({width:source.width,height:source.height,name:data.name});
    const port=new CoreStrokeDocumentPort(document);
    let outside=0;const accepted:StrokeRecord[]=[];
    for(const stroke of source.strokes){
      try{await port.commitStroke(port.target(),stroke);accepted.push(stroke);}
      catch(error){if(!(error instanceof EmptyStrokeError))throw error;outside++;}
    }
    const notices=[
      '試作版の描線とそのブラシ設定を1枚の描画レイヤーに移しました。',
      '旧ファイルに保存されていない選択範囲、資料、レイヤー構成は復元できません。',
      ...(outside?[outside+'件の描線はキャンバスの外にあり、移行後の履歴には含まれません。']:[])
    ];
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(data.bytes)));
    const sourceSha256=Array.from(digest,value=>value.toString(16).padStart(2,'0')).join('');
    const sketchReaderVersions=[...new Set(source.strokes.map(stroke=>stroke.engine))];
    const {bytes}=await createPortableDocument({document,selectedLayerId:document.defaultRasterLayerId,preserved:{
      optionalSections:[],manifestExtras:{legacyMigration:{format:source.format,sourceSha256,sketchReaderVersions,importedStrokes:source.strokes.length-outside,omittedStrokes:outside}}
    }});
    const reopened=await openPortableDocument(bytes);
    // Reject a portable file if migration/re-encoding lost any stroke, point,
    // brush parameter or original order. Pixel-level visual equality still
    // needs a separate render comparison on representative real artworks.
    assertLegacyStrokeIntegrity(accepted,reopened.document.rasterReplayPlan().operations);
    if(reopened.document.root.width!==source.width||reopened.document.root.height!==source.height)
      throw Error('移行後に作品サイズが一致しませんでした。');
    notices.push('移行したデータを再読み込みし、作品サイズ、筆跡の順序、筆圧・ブラシ設定を照合しました。');
    const post=self as unknown as Worker;
    post.postMessage({bytes,notices},[bytes.buffer as ArrayBuffer]);
  }catch(error){
    self.postMessage({error:error instanceof Error?error.message:String(error)});
  }
};
