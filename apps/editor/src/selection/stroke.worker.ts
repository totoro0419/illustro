import {cpuReference,layerMaskTile,TILE,validateRecord,type StrokeRecord} from '@illustro/brush-rt';

import type {PixelLayerMask} from '@illustro/core';
import {renderSelectedStrokeTiles,type RasterWorkerTile} from './tileStroke';
type Pass={selection:PixelLayerMask|null;records:readonly unknown[]};
type Job={width:number;height:number}&(
  ({pixels:Uint8Array}&({alpha?:Uint8Array;records:readonly StrokeRecord[]}|{passes:readonly Pass[]}))
  |{tiles:RasterWorkerTile[];alpha?:Uint8Array;records:readonly StrokeRecord[]}
);
let retainedMask:Uint8Array|null=null,retainedWidth=0,retainedHeight=0;

self.onmessage=({data}:MessageEvent<Job>)=>{
  try{
    const {width,height}=data;
    let alpha:Uint8Array|null=null;
    if('records' in data){
      if(data.alpha){
        if(data.alpha.length!==width*height)throw Error('選択マスクの大きさが作品に一致しません。');
        retainedMask=data.alpha;retainedWidth=width;retainedHeight=height;
      }else if(!retainedMask||retainedWidth!==width||retainedHeight!==height)
        throw Error('選択マスクの再利用情報が失われました。');
      alpha=retainedMask;
    }
    if('tiles' in data){
      const result=renderSelectedStrokeTiles(width,height,alpha!,data.tiles,data.records);
      (self as unknown as Worker).postMessage({tiles:result},result?.map(tile=>tile.pixels.buffer as ArrayBuffer)??[]);
      return;
    }
    const pixels=data.pixels;
    const passes='passes' in data?data.passes:[{selection:null,records:data.records}];
    let changed=false;
    for(const pass of passes)for(const raw of pass.records){
      const record='passes' in data?validateRecord(raw):raw as StrokeRecord;
      const commandsByTile=new Map<number,Array<StrokeRecord['commands'][number]>>();
      const columns=Math.ceil(width/TILE);
      for(const command of record.commands){
        const [x=0,y=0,size=0]=command;
        const connected=(command[19]??0)>0;
        const ax=connected?(command[16]??x):x,ay=connected?(command[17]??y):y;
        const radius=Math.max(size/2,command[18]??0)*(connected?1:Math.SQRT2)+2;
        const left=Math.max(0,Math.floor((Math.min(x,ax)-radius)/TILE));
        const top=Math.max(0,Math.floor((Math.min(y,ay)-radius)/TILE));
        const right=Math.min(columns,Math.ceil((Math.max(x,ax)+radius)/TILE));
        const bottom=Math.min(Math.ceil(height/TILE),Math.ceil((Math.max(y,ay)+radius)/TILE));
        for(let row=top;row<bottom;row++)for(let col=left;col<right;col++){
          const key=row*columns+col,commands=commandsByTile.get(key);
          if(commands)commands.push(command);else commandsByTile.set(key,[command]);
        }
      }
      for(const [key,commands] of commandsByTile){
        const x=(key%columns)*TILE,y=Math.floor(key/columns)*TILE;
        const w=Math.min(TILE,width-x),h=Math.min(TILE,height-y),mask=new Uint8Array(w*h);
        const tile=pass.selection?layerMaskTile(pass.selection,(x/TILE)+','+(y/TILE)):255;
        for(let row=0;row<h;row++){
          const offset=(y+row)*width+x;
          if(alpha)mask.set(alpha.subarray(offset,offset+w),row*w);
          else if(typeof tile==='number')mask.fill(tile,row*w,(row+1)*w);
          else mask.set(tile.subarray(row*TILE,row*TILE+w),row*w);
        }
        if(!mask.some(Boolean))continue;
        const base=new Uint8ClampedArray(w*h*4);
        for(let row=0;row<h;row++){
          const offset=((y+row)*width+x)*4;
          base.set(pixels.subarray(offset,offset+w*4),row*w*4);
        }
        const rendered=cpuReference({...record,commands},w,h,base,mask,x,y);
        if(!rendered.some((value,index)=>value!==base[index]))continue;
        changed=true;
        for(let row=0;row<h;row++)pixels.set(rendered.subarray(row*w*4,(row+1)*w*4),((y+row)*width+x)*4);
      }
    }
    const keep=changed||'passes' in data;
    (self as unknown as Worker).postMessage({pixels:keep?pixels:null},keep?[pixels.buffer as ArrayBuffer]:[]);
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
