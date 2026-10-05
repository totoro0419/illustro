import {CANONICAL_TILE_SIZE,CoreDocument,type DirtyTileHint} from '@illustro/core';
import type {StrokeRecord} from '@illustro/brush-rt';
import type {DocumentPort,DrawingTarget,StrokeCommitResult} from './ports';

type Bounds={x0:number;y0:number;x1:number;y1:number};
type Accum={bounds:Bounds;commands:number[]};
export class CoreStrokeDocumentPort implements DocumentPort{
  constructor(readonly document:CoreDocument){}
  target():DrawingTarget{
    const root=this.document.root,layer=root.getLayer(this.document.defaultRasterLayerId);
    if(layer.kind!=='raster')throw new Error('選択中のレイヤーには描けません。');
    if(layer.locked)throw new Error('選択中のレイヤーはロックされています。');
    return Object.freeze({documentId:root.documentId,layerId:layer.id,surfaceId:layer.surface.descriptor.surfaceId,width:root.width,height:root.height,baseRevision:this.document.head});
  }
  async commitStroke(target:DrawingTarget,record:StrokeRecord):Promise<StrokeCommitResult>{
    const root=this.document.root;if(root.documentId!==target.documentId)throw new Error('描画先の文書が変わりました。');
    if(this.document.head!==target.baseRevision)throw new Error('描画中に作品の状態が変わりました。');
    const layer=root.getLayer(target.layerId);if(layer.kind!=='raster'||layer.surface.descriptor.surfaceId!==target.surfaceId)throw new Error('描画先のレイヤーが変わりました。');
    if(layer.locked)throw new Error('描画先のレイヤーはロックされています。');
    shallowRecordGuard(record);const dirty=dirtyTiles(record);if(!dirty.length)throw new Error('確定できる線がありません。');
    const tx=this.document.begin('Brush stroke');
    const operationKey=tx.recordRasterOperation(target.layerId,{
      kind:'brush.stroke',schemaVersion:1,parameters:Object.freeze({strokeRecord:record,strokeRecordVersion:record.version,engine:record.engine,brushId:brushId(record),action:record.preset.blend==='erase'?'erase':'paint'}),
      algorithmVersionRefs:Object.freeze([`engine:${record.engine}`,`reconstruction:${record.smoothing}`,`prng:${record.random}`,`stroke-schema:${record.version}`]),sourceRevisionIds:Object.freeze([target.baseRevision]),
    },dirty);
    const receipt=tx.commit();return Object.freeze({revisionId:receipt.revision.id,operationKey,dirtyTileCount:dirty.length});
  }
}
function shallowRecordGuard(record:StrokeRecord){
  if((record.version!==2&&record.version!==3)||record.random!=='philox4x32-10'||!Array.isArray(record.commands)||!Array.isArray(record.raw)||record.raw.length>500000)throw new Error('未対応の線データです。');
  for(const sample of record.raw){if(sample.predicted)throw new Error('予測入力は作品データに確定できません。');}
  if('releaseInput' in record&&record.releaseInput?.predicted)throw new Error('予測入力は作品データに確定できません。');
}
function brushId(record:StrokeRecord){return record.version===3?record.foundation.id:record.preset.id;}
function dirtyTiles(record:StrokeRecord):readonly DirtyTileHint[]{
  const map=new Map<string,Accum>();
  for(let index=0;index<record.commands.length;index++){const c=record.commands[index];if(!c||c.length<20)throw new Error('壊れた線データです。');
    const required=[c[0],c[1],c[2],c[16],c[17],c[18],c[19]];if(required.some(v=>v===undefined||!Number.isFinite(v)))throw new Error('壊れた線データです。');
    const solid=(c[19]??0)>0,r=Math.max((c[2]??0)/2,c[18]??0)*(solid?1:Math.SQRT2)+2,ax=solid?(c[16]??c[0]??0):(c[0]??0),ay=solid?(c[17]??c[1]??0):(c[1]??0);
    addBounds(map,{x0:Math.min(c[0]??0,ax)-r,y0:Math.min(c[1]??0,ay)-r,x1:Math.max(c[0]??0,ax)+r,y1:Math.max(c[1]??0,ay)+r},index);
  }
  return Object.freeze([...map.entries()].map(([key,value])=>{const [tileX,tileY]=key.split(',').map(Number) as [number,number],ox=tileX*CANONICAL_TILE_SIZE,oy=tileY*CANONICAL_TILE_SIZE;
    const bounds=Object.freeze({x0:Math.max(0,Math.floor(value.bounds.x0-ox)),y0:Math.max(0,Math.floor(value.bounds.y0-oy)),x1:Math.min(CANONICAL_TILE_SIZE,Math.ceil(value.bounds.x1-ox)),y1:Math.min(CANONICAL_TILE_SIZE,Math.ceil(value.bounds.y1-oy))});
    return Object.freeze({tileX,tileY,bounds,workUnits:Math.max(1,value.commands.length),commandIndices:Object.freeze(value.commands)});}));
}
function addBounds(map:Map<string,Accum>,bounds:Bounds,index:number){
  if(!(bounds.x1>bounds.x0&&bounds.y1>bounds.y0))return;const minX=Math.floor(bounds.x0/CANONICAL_TILE_SIZE),maxX=Math.ceil(bounds.x1/CANONICAL_TILE_SIZE)-1,minY=Math.floor(bounds.y0/CANONICAL_TILE_SIZE),maxY=Math.ceil(bounds.y1/CANONICAL_TILE_SIZE)-1;
  const tileCount=(maxX-minX+1)*(maxY-minY+1);if(!Number.isSafeInteger(tileCount)||tileCount>65536)throw new Error('線の範囲が大きすぎます。');
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const key=`${x},${y}`,current=map.get(key);if(current){current.bounds.x0=Math.min(current.bounds.x0,bounds.x0);current.bounds.y0=Math.min(current.bounds.y0,bounds.y0);current.bounds.x1=Math.max(current.bounds.x1,bounds.x1);current.bounds.y1=Math.max(current.bounds.y1,bounds.y1);current.commands.push(index);}else map.set(key,{bounds:{...bounds},commands:[index]});}
}
