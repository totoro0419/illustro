import {validateRecord,type StrokeDocument} from '@illustro/brush-rt';

export function readLegacyStrokeDocument(bytes:Uint8Array):StrokeDocument{
  if(bytes.length>128*1024*1024)throw Error('旧形式の作品が128MBを超えています。');
  const input:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('旧形式の作品データが正しくありません。');
  const {format,width,height,strokes}=input as StrokeDocument;
  if(format!=='illustro-rt-document-2')throw Error('対応する旧形式（Illustro試作版の描線ファイル）ではありません。');
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192||
    !Array.isArray(strokes)||strokes.length>10000)throw Error('旧形式のキャンバスの大きさか描線数が対象範囲を超えています。');
  return {format,width,height,strokes:strokes.map(validateRecord)};
}
