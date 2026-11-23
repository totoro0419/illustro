import {CanonicalBuilder,cpuReference,TILE,type FoundationPreset,type Sample,type StrokeContext,type StrokeRecord} from '@illustro/brush-rt';
import type {LayerBlend,LayerMask} from '@illustro/core';
import {compositeArtworkRegion,type FrozenExport} from './export/basicExport';
import type {MaskData} from './selection/mask';
import type {ProjectionCache} from './persistence/projectionCache';
import {strokeTilesForCanvas} from './strokeCommit';

type Tile=Readonly<{surfaceKey:string;key:string;x:number;y:number;pixels:Uint8Array<ArrayBuffer>}>;
type Request=Readonly<{surfaceId:string;key:string}>;
type Style=Readonly<{surfaceKey:string;visible:boolean;opacity:number;clipKey?:string;white?:boolean;
  blend?:LayerBlend;mask?:LayerMask;isolation?:readonly string[]}>;
type Entry=Readonly<{record:StrokeRecord;surfaceKey:string;keys:readonly string[];cached?:boolean}>;
const keyOf=(surfaceKey:string,key:string)=>surfaceKey+'\0'+key;
const chunk=()=>new Promise<void>(resolve=>setTimeout(resolve,0));

/** Retains canonical tiles and uses Canvas2D for devices without a GPU renderer. */
export class CpuDrawingHost{
  readonly info={backend:'canvas2d',alpha:true,premultipliedAlpha:false,artworkAlpha:true};
  readonly errors:string[]=[];
  readonly completions:unknown[]=[];
  readonly document={count:0,jobs:[]};
  readonly session=new CpuStrokeSession(this);
  readonly backend={
    tiles:new Map<string,Tile>(),viewTransform:null as Float32Array|null,
    readTiles:async (requests:readonly Request[])=>requests.map(request=>({...request,
      pixels:this.backend.tiles.get(keyOf(request.surfaceId,request.key))?.pixels.slice()??new Uint8Array(TILE*TILE*4)})),
  };
  onPresentation:(()=>void)|null=null;

  private disposed=false;
  private frameId=0;
  private work=Promise.resolve();
  private waiting=new Map<number,Promise<void>>();
  private layers:FrozenExport['layers']=[];
  private completed=new Map<string,HTMLCanvasElement>();
  private dirty=new Set<string>();
  private readonly target:HTMLCanvasElement;
  private readonly context:CanvasRenderingContext2D;
  private readonly bitmap:ImageBitmapRenderingContext|null;
  private readonly whitePaper:HTMLCanvasElement;
  private readonly viewTables=new Map<object,Uint8Array>();

  constructor(private canvas:HTMLCanvasElement,readonly width:number,readonly height:number){
    this.bitmap=canvas.getContext('bitmaprenderer');
    this.target=this.bitmap?document.createElement('canvas'):canvas;
    const context=this.target.getContext('2d');
    if(!context)throw Error('この端末で基本の2Dキャンバスを開けません。');
    this.context=context;
    this.whitePaper=document.createElement('canvas');this.whitePaper.width=1;this.whitePaper.height=1;
    const white=this.whitePaper.getContext('2d')!;white.fillStyle='#fff';white.fillRect(0,0,1,1);
  }

  private schedule(){
    if(!this.frameId&&!this.disposed)this.frameId=requestAnimationFrame(()=>{
      this.frameId=0;
      void this.present().catch(error=>this.errors.push(String(error)));
    });
  }
  setViewTransform(view:Float32Array){this.backend.viewTransform=view;this.schedule();}
  setSurfaceStack(_keys:readonly string[]){}
  setSurfaceStyles(styles:readonly Style[]){
    this.layers=styles.map(({surfaceKey,clipKey,white,...rest})=>({
      ...rest,surfaceId:surfaceKey,...(clipKey?{clipSurfaceId:clipKey}:{}),...(white?{baseColor:'white' as const}:{}),
    }));
    this.viewTables.clear();
    for(const tile of this.backend.tiles.values())this.dirty.add(tile.key);
    this.schedule();
  }
  private presentSerial=0;
  private async present(){
    const view=this.backend.viewTransform;
    if(!view||this.disposed)return;
    const serial=++this.presentSerial;
    for(const key of [...this.dirty]){
      const tile=await this.composite(key,true);
      if(serial!==this.presentSerial||this.disposed)return;
      this.dirty.delete(key);
      let canvas=this.completed.get(key);
      if(!canvas){canvas=document.createElement('canvas');canvas.width=TILE;canvas.height=TILE;this.completed.set(key,canvas);}
      canvas.getContext('2d')!.putImageData(new ImageData(tile,TILE,TILE),0,0);
      if(this.dirty.size>24&&this.dirty.size%12===0)await chunk();
    }
    if(this.disposed||serial!==this.presentSerial)return;
    const [width,height,cssWidth,cssHeight,docWidth,docHeight,zoom,rotation,panX,panY,flipX,flipY,repeat,nearest]=view as unknown as
      [number,number,number,number,number,number,number,number,number,number,number,number,number,number];
    const ctx=this.context,sx=width/cssWidth,sy=height/cssHeight;
    if(this.target.width!==width)this.target.width=width;
    if(this.target.height!==height)this.target.height=height;
    ctx.setTransform(sx,0,0,sy,0,0);ctx.clearRect(0,0,cssWidth,cssHeight);
    ctx.translate(cssWidth/2+panX,cssHeight/2+panY);ctx.rotate(rotation);
    ctx.scale(zoom*flipX,zoom*flipY);ctx.translate(-docWidth/2,-docHeight/2);
    ctx.imageSmoothingEnabled=!nearest;
    const radius=repeat?Math.min(repeat-1,4):0;
    const paper=this.layers.find(layer=>layer.baseColor&&layer.visible);
    for(let row=-radius;row<=radius;row++)for(let col=-radius;col<=radius;col++){
      ctx.save();ctx.translate(col*docWidth,row*docHeight);
      ctx.beginPath();ctx.rect(0,0,docWidth,docHeight);ctx.clip();
      if(paper){ctx.globalAlpha=paper.opacity;ctx.drawImage(this.whitePaper,0,0,docWidth,docHeight);ctx.globalAlpha=1;}
      for(const [key,tile] of this.completed){
        const [x,y]=key.split(',').map(Number);
        ctx.clearRect(x!*TILE,y!*TILE,TILE,TILE);
        ctx.drawImage(tile,x!*TILE,y!*TILE);
      }
      ctx.restore();
    }
    this.session.preview(ctx,view);
    if(this.bitmap){
      const image=await createImageBitmap(this.target);
      if(serial!==this.presentSerial||this.disposed){image.close();return;}
      if(this.canvas.width!==width)this.canvas.width=width;
      if(this.canvas.height!==height)this.canvas.height=height;
      this.bitmap.transferFromImageBitmap(image);
    }
    this.onPresentation?.();
  }

  private async composite(key:string,includeWhite:boolean){
    const [tx,ty]=key.split(',').map(Number);
    const result=await compositeArtworkRegion(includeWhite?this.layers:this.layers.filter(layer=>!layer.baseColor),
      {x:tx!*TILE,y:ty!*TILE,width:TILE,height:TILE},async id=>
        this.backend.tiles.get(keyOf(id,key))?.pixels??new Uint8Array(TILE*TILE*4),undefined,this.viewTables);
    if(!result)throw Error('合成に必要な画素がありません。');
    return new Uint8ClampedArray(result);
  }
  private write(surfaceKey:string,key:string,pixels:Uint8Array<ArrayBuffer>){
    const [tx,ty]=key.split(',').map(Number);
    this.backend.tiles.set(keyOf(surfaceKey,key),{surfaceKey,key,x:tx!*TILE,y:ty!*TILE,pixels});
    this.dirty.add(key);
  }
  async paint(record:StrokeRecord,surfaceKey:string,keys?:readonly string[]){
    const allowed=keys?new Set(keys):null,hints=await strokeTilesForCanvas(record,this.width,this.height);
    for(const {tileX,tileY,commandIndices} of hints){
      const key=tileX+','+tileY;
      if(allowed&&!allowed.has(key))continue;
      const tile=this.backend.tiles.get(keyOf(surfaceKey,key))?.pixels;
      const base=tile?new Uint8ClampedArray(tile):new Uint8ClampedArray(TILE*TILE*4);
      const commands=commandIndices!.map(index=>record.commands[index]!);
      const pixels=cpuReference({...record,commands},TILE,TILE,base,undefined,tileX*TILE,tileY*TILE);
      this.write(surfaceKey,key,new Uint8Array(pixels));
    }
  }
  enqueue(id:number,action:()=>Promise<void>){
    const job=this.work.then(async()=>{if(!this.disposed)await action();});
    this.work=job.catch(error=>{this.errors.push(String(error));});
    this.waiting.set(id,job);
    void job.finally(()=>this.schedule()).catch(()=>{});
  }
  async waitStroke(ids:readonly number[]){
    try{await Promise.all(ids.map(id=>this.waiting.get(id)));}
    finally{for(const id of ids)this.waiting.delete(id);}
    return {superseded:this.disposed};
  }
  async restore(entries:readonly Entry[],cache?:ProjectionCache){
    await this.work;
    this.backend.tiles.clear();this.completed.clear();this.dirty.clear();
    for(const layer of cache?.layers??[]){
      if('tiles' in layer)for(const {key,pixels} of layer.tiles)this.write(layer.surfaceId,key,new Uint8Array(pixels));
      else for(let y=0;y<this.height;y+=TILE)for(let x=0;x<this.width;x+=TILE){
        const w=Math.min(TILE,this.width-x),h=Math.min(TILE,this.height-y),pixels=new Uint8Array(TILE*TILE*4);
        for(let row=0;row<h;row++){
          const start=((y+row)*this.width+x)*4;
          pixels.set(layer.pixels.subarray(start,start+w*4),row*TILE*4);
        }
        if(pixels.some(Boolean))this.write(layer.surfaceId,(x/TILE)+','+(y/TILE),pixels);
      }
    }
    for(const [i,entry] of entries.entries()){
      if(!entry.cached)await this.paint(entry.record,entry.surfaceKey,entry.keys);
      if(i%8===7)await chunk();
    }
    this.schedule();
  }

  async drain(){await this.work;}
  async inspect(){await this.work;}
  async read(surfaceKey='default'){return this.readPixelArea(0,0,this.width,this.height,surfaceKey);}
  async readPixel(x:number,y:number,surfaceKey:string|null){return [...await this.readPixelArea(x,y,1,1,surfaceKey)];}
  async readPixelArea(x:number,y:number,width:number,height:number,surfaceKey:string|null){
    await this.work;
    const result=new Uint8Array(width*height*4);
    for(let ty=Math.floor(y/TILE);ty<=Math.floor((y+height-1)/TILE);ty++){
      for(let tx=Math.floor(x/TILE);tx<=Math.floor((x+width-1)/TILE);tx++){
        const key=tx+','+ty,ox=tx*TILE,oy=ty*TILE;
        const tile=surfaceKey?this.backend.tiles.get(keyOf(surfaceKey,key))?.pixels:await this.composite(key,false);
        if(!tile)continue;
        const left=Math.max(x,ox),top=Math.max(y,oy),right=Math.min(x+width,ox+TILE),bottom=Math.min(y+height,oy+TILE);
        for(let row=top;row<bottom;row++){
          const start=((row-oy)*TILE+left-ox)*4;
          result.set(tile.subarray(start,start+(right-left)*4),((row-y)*width+left-x)*4);
        }
      }
    }
    return result;
  }
  async call(name:string,params:{surfaceKey?:string;white?:boolean;layers?:readonly {id:string;surfaceKey:string}[];x?:number;y?:number}){
    if(name==='restore'){await this.restore([]);return;}
    if(name==='layerHits'){
      const hits:string[]=[];
      for(const layer of params.layers??[])if((await this.readPixel(params.x!,params.y!,layer.surfaceKey))[3])hits.push(layer.id);
      return hits;
    }
    return null;
  }
  update(){}
  refreshPreview(){this.schedule();}
  hideStrokePreview(id:number){this.session.hide(id);}
  restoreStrokePreview(_id:number){}
  setSeamlessPreview(_value:boolean){}
  clearSeamlessPreviews(_id:number){}
  beginViewportNavigation(){}
  endViewportNavigation(){}
  async prepareHistory(){await this.work;}
  resumeHistory(){}
  setPerformanceEnabled(_value:boolean){}
  performanceSummary(){return {execution:'canvas2d-basic'};}
  destroy(){
    this.disposed=true;cancelAnimationFrame(this.frameId);
    this.backend.tiles.clear();this.completed.clear();this.viewTables.clear();
  }
}

class CpuStrokeSession{
  readonly errors:string[]=[];
  readonly recordIds=new WeakMap<StrokeRecord,number>();
  readonly browserPredictions=0;
  rawAccepted=0;
  id=0;
  private active:{id:number;builder:CanonicalBuilder;preset:FoundationPreset;surfaceKey:string;points:Sample[]}|null=null;
  constructor(readonly renderer:CpuDrawingHost){}
  begin(preset:FoundationPreset,fast=0,context:StrokeContext={},surfaceKey='default',_preview=true,_mask?:MaskData){
    const id=++this.id;
    this.active={id,builder:new CanonicalBuilder(preset,[0x12345678,id],fast,context),preset,surfaceKey,points:[]};
    return id;
  }
  accept(sample:Sample){
    if(!this.active||sample.t<(this.active.points.at(-1)?.t??-Infinity))return;
    this.active.builder.accept(sample);this.active.points.push(sample);this.rawAccepted++;this.renderer.refreshPreview();
  }
  async end(release:Sample|null){
    const active=this.active;if(!active)return null;
    this.active=null;
    if(release)active.builder.release(release);
    active.builder.finish();const record=active.builder.record();this.recordIds.set(record,active.id);
    this.renderer.refreshPreview();return record;
  }
  hide(id:number){if(this.active?.id===id){this.active=null;this.renderer.refreshPreview();}}
  async cancel(){this.active=null;this.renderer.refreshPreview();}
  predictions(_samples:readonly Sample[]){}
  frame(_now:number){return false;}
  commitRecord(record:StrokeRecord,additional:readonly StrokeRecord[],surfaceKey:string){
    const id=this.recordIds.get(record)??++this.id;
    this.renderer.enqueue(id,async()=>{
      for(const stroke of [record,...additional])await this.renderer.paint(stroke,surfaceKey);
    });
    return [id];
  }
  commitUndoneRecord(_record:StrokeRecord,_additional:readonly StrokeRecord[],_surfaceKey:string){}
  forgetStaged(_record:StrokeRecord){}
  async discardUncommitted(_record:StrokeRecord){this.renderer.refreshPreview();}
  discardRedo(){}
  setSurfaceStack(_keys:readonly string[]){}
  async navigateDerived(steps:readonly unknown[]){if(steps.length)throw Error('Raster baseline restore required');}
  async restore(entries:readonly Entry[],cache?:ProjectionCache){return this.renderer.restore(entries,cache);}
  preview(ctx:CanvasRenderingContext2D,view:Float32Array){
    const active=this.active;
    if(!active?.points.length||active.preset.blend==='erase')return;
    ctx.save();
    const [r,g,b]=active.preset.color.map(channel=>Math.round(channel*255));
    ctx.strokeStyle='rgb('+r+' '+g+' '+b+')';ctx.fillStyle=ctx.strokeStyle;
    ctx.globalAlpha=active.preset.opacity;ctx.lineWidth=active.preset.size;ctx.lineCap=ctx.lineJoin='round';
    ctx.beginPath();
    const first=active.points[0]!;
    ctx.moveTo(first.x,first.y);
    for(const point of active.points.slice(1))ctx.lineTo(point.x,point.y);
    if(active.points.length===1){ctx.arc(first.x,first.y,active.preset.size/2,0,Math.PI*2);ctx.fill();}
    else ctx.stroke();
    ctx.restore();void view;
  }
  destroy(){this.renderer.destroy();}
}
