import {describe,expect,it} from 'vitest';
import {CoreDocument} from '@illustro/core';
import type {StrokeRecord} from '@illustro/brush-rt';
import {CoreStrokeDocumentPort} from './strokeCommit';

function command(x:number,y:number,previousX=x,previousY=y,size=12){
  const c=Array(24).fill(0);c[0]=x;c[1]=y;c[2]=size;c[16]=previousX;c[17]=previousY;c[18]=size/2;c[19]=1;return c;
}
function record(commands:number[][],raw:Array<Record<string,unknown>>=[{x:1,y:1,t:1,pressure:.5,pointerType:'pen'}]):StrokeRecord{
  return {version:2,engine:'illustro-rt-2.5',smoothing:'local-regression-adaptive-48ms-bounded-2',fast:0,random:'philox4x32-10',
    seed:[1,2],preset:{id:'test-pen',blend:'normal'},raw,geometry:[],commands} as unknown as StrokeRecord;
}

describe('M01 stroke -> Document adapter',()=>{
  it('commits one stroke once, maps only dirty canonical tiles, and keeps it after the next stroke',async()=>{
    const d=new CoreDocument({width:1024,height:768}),port=new CoreStrokeDocumentPort(d),layer=d.defaultRasterLayerId;
    const first=await port.commitStroke(port.target(),record([command(270,100,240,100)]));
    expect(d.revisionCount).toBe(2);expect(first.dirtyTileCount).toBe(2);
    expect(d.getTileValue(layer,0,0)?.mutations).toHaveLength(1);expect(d.getTileValue(layer,1,0)?.mutations).toHaveLength(1);
    expect(d.getTileValue(layer,3,2)).toBeUndefined();
    const firstKey=d.getTileValue(layer,0,0)?.mutations[0]?.operationKey;
    const second=await port.commitStroke(port.target(),record([command(80,360,60,360)]));
    expect(d.revisionCount).toBe(3);expect(second.revisionId).not.toBe(first.revisionId);
    expect(d.getTileValue(layer,0,0)?.mutations[0]?.operationKey).toEqual(firstKey);
    expect(d.getTileValue(layer,0,1)?.mutations).toHaveLength(1);
  });
  it('rejects predicted canonical input without advancing the Document',async()=>{
    const d=new CoreDocument({width:512,height:512}),port=new CoreStrokeDocumentPort(d),head=d.head,count=d.revisionCount;
    await expect(port.commitStroke(port.target(),record([command(30,30)], [{x:30,y:30,t:1,predicted:true}]))).rejects.toThrow(/予測入力/);
    expect(d.head).toBe(head);expect(d.revisionCount).toBe(count);
  });
  it('rejects a stale captured target without publishing a partial stroke',async()=>{
    const d=new CoreDocument({width:512,height:512}),port=new CoreStrokeDocumentPort(d),target=port.target(),layer=d.defaultRasterLayerId;
    const intervening=d.begin('intervening');intervening.setPixel(layer,2,2,[1,2,3,255]);intervening.commit();const head=d.head,count=d.revisionCount;
    await expect(port.commitStroke(target,record([command(30,30)]))).rejects.toThrow(/作品の状態が変わりました/);
    expect(d.head).toBe(head);expect(d.revisionCount).toBe(count);
  });
  it('does not offer a locked Raster Layer as a drawing target',()=>{
    const d=new CoreDocument({width:512,height:512}),port=new CoreStrokeDocumentPort(d),layer=d.defaultRasterLayerId;
    const tx=d.begin('lock');tx.setLayerLocked(layer,true);tx.commit();
    expect(()=>port.target()).toThrow(/ロック/);
  });
  it('indexes distant commands only into tiles they can affect',async()=>{
    const d=new CoreDocument({width:2048,height:512}),port=new CoreStrokeDocumentPort(d),layer=d.defaultRasterLayerId;
    await port.commitStroke(port.target(),record([command(40,60,30,60,6),command(1800,60,1790,60,6)]));
    const left=d.getTileValue(layer,0,0)?.mutations[0],right=d.getTileValue(layer,7,0)?.mutations[0];
    expect(left?.commandIndices).toEqual([0]);expect(right?.commandIndices).toEqual([1]);
    expect(d.getTileValue(layer,3,0)).toBeUndefined();
  });
});
