import {describe,it,expect} from 'vitest';
import {ArtworkClipboard,type ClipboardItem} from './clipboard';

function fillItem(pixels:Uint8ClampedArray,width:number,height:number):ClipboardItem{
  return {
    sourceDocumentId:'work',sourceColorProfile:'srgb',sourceName:'テスト画像',
    originX:37,originY:42,width,height,
    selected:false,merged:true,pixels
  };
}
describe('C06-017 non-destructive paste preview',()=>{
  it('samples at most a 512px preview without allocating a full-canvas image',()=>{
    const width=1024,pixels=new Uint8ClampedArray(width*4);
    for(let x=0;x<width;x++){
      pixels[x*4]=x%256;pixels[x*4+3]=255;
    }
    const clipboard=new ArtworkClipboard();
    (clipboard as unknown as {item:ClipboardItem|null}).item=fillItem(pixels,width,1);
    const preview=clipboard.preview();
    expect(preview).not.toBeNull();
    expect(preview).toMatchObject({
      width:1024,height:1,originX:37,originY:42,
      previewWidth:512,previewHeight:1
    });
    expect(preview?.pixels?.length).toBe(512*4);
    expect(preview?.pixels?.[3]).toBe(255);
    expect(preview?.pixels?.[511*4]).toBe(255);
    expect(pixels.length).toBe(width*4);
  });
  it('shows an outline when a group has no flattened pixels',()=>{
    const clipboard=new ArtworkClipboard();
    (clipboard as unknown as {item:ClipboardItem|null}).item=fillItem(new Uint8ClampedArray(0),4000,4000);
    const image=clipboard.preview();
    expect(image?.previewWidth).toBe(512);
    expect(image?.previewHeight).toBe(512);
    expect(image?.pixels).toBeNull();
  });
  it('invalidates a previously opened preview when the clipboard is cleared',()=>{
    const clipboard=new ArtworkClipboard();
    const previous=clipboard.snapshotId;
    clipboard.clear();
    expect(clipboard.snapshotId).toBeGreaterThan(previous);
    expect(clipboard.preview()).toBeNull();
  });
});
