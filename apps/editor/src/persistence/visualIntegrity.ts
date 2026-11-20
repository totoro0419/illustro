/** Byte-for-byte RGBA comparison after the same rendering pipeline.
 * The original 4000px pixel array is never retained between replays:
 * only its 32-byte digest and the PNG for the user's comparison remain.
 */
export type VisualFingerprint=Readonly<{width:number;height:number;sha256:string}>;
export async function fingerprintRenderedPixels(
  pixels:Uint8Array|Uint8ClampedArray,width:number,height:number,
):Promise<VisualFingerprint>{
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
     width>8192||height>8192||pixels.length!==width*height*4)
    throw new Error('表示画像の画素数が正しくありません。');
  // renderFrozenArtwork creates an owned full Uint8ClampedArray: digest its
  // ArrayBuffer directly instead of allocating another full-size copy.
  const source=pixels.buffer;
  const exact=source instanceof ArrayBuffer&&pixels.byteOffset===0&&pixels.byteLength===source.byteLength
    ?source:Uint8Array.from(pixels).buffer;
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',exact));
  return {width,height,sha256:[...digest].map(byte=>byte.toString(16).padStart(2,'0')).join('')};
}
export function sameRenderedPixels(original:VisualFingerprint,converted:VisualFingerprint):boolean{
  return original.width===converted.width&&original.height===converted.height&&original.sha256===converted.sha256;
}
