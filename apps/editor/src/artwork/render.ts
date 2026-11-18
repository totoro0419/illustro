import type {ArtPoint,EditableArtwork,EditableGradient,EditablePath,EditableText,LayerMask} from '@illustro/core';
import {layoutEditableText} from './textLayout';
import {layoutStyledText,textCanvasFont} from './textStyles';
import {alignedTextLineStart,textRowTop,textVerticalCell} from './textPlacement';
import {gradientBoundaryField} from './gradientDistance';
import {readCanvasAlphaBands} from './alphaBands';
import {verticalGlyphAdjustment} from './verticalGlyph';
import {layerMaskCoverage} from '@illustro/brush-rt';
import {sampledPath} from './pathOperations';

type Context=CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D;
type RenderSize={width:number;height:number;outputWidth:number;outputHeight:number;mask?:LayerMask|null;previewMask?:boolean};

export function tracePath(ctx:Context,path:EditablePath){
  const [first,last]=[path.points[0]!,path.points.at(-1)!];
  ctx.beginPath();
  if(path.shape==='rectangle'){
    ctx.rect(Math.min(first.x,last.x),Math.min(first.y,last.y),Math.abs(last.x-first.x),Math.abs(last.y-first.y));
    return;
  }
  if(path.shape==='ellipse'){
    ctx.ellipse((first.x+last.x)/2,(first.y+last.y)/2,Math.abs(last.x-first.x)/2,Math.abs(last.y-first.y)/2,0,0,Math.PI*2);
    return;
  }
  ctx.moveTo(first.x,first.y);
  for(let i=1;i<path.points.length;i++){
    const a=path.points[i-1]!,b=path.points[i]!;
    if(b.move){ctx.moveTo(b.x,b.y);continue;}
    if(a.outX!==undefined||b.inX!==undefined)
      ctx.bezierCurveTo(a.outX??a.x,a.outY??a.y,b.inX??b.x,b.inY??b.y,b.x,b.y);
    else ctx.lineTo(b.x,b.y);
    if(b.close)ctx.closePath();
  }
  if(path.closed){
    if(last.outX!==undefined||first.inX!==undefined)
      ctx.bezierCurveTo(last.outX??last.x,last.outY??last.y,first.inX??first.x,first.inY??first.y,first.x,first.y);
    ctx.closePath();
  }
}

function rgba(color:string){return [1,3,5].map(i=>parseInt(color.slice(i,i+2),16));}
const wrap=(t:number)=>((t%1)+1)%1;
/** Prepare canvas-invariant gradient math once, rather than for every
 * pixel of a 4K raster (especially the angular atan2 and radial sqrt). */
export function gradientPositionSampler(gradient:EditableGradient):(x:number,y:number)=>number{
  const {x:startX,y:startY}=gradient.start;
  const dx=gradient.end.x-startX,dy=gradient.end.y-startY,den=dx*dx+dy*dy;
  if(!den)return ()=>0;
  if(gradient.mode==='radial'){
    if(gradient.radialRatio===undefined||gradient.radialRatio===1){
      const radius=1/Math.sqrt(den);
      return (x,y)=>Math.hypot(x-startX,y-startY)*radius;
    }
    const ratio=gradient.radialRatio;
    return (x,y)=>{
      const u=x-startX,v=y-startY;
      return Math.hypot((u*dx+v*dy)/den,(-u*dy+v*dx)/den/ratio);
    };
  }
  if(gradient.mode==='angular'){
    const angle=Math.atan2(dy,dx),inverse=1/(2*Math.PI);
    return (x,y)=>wrap((Math.atan2(y-startY,x-startX)-angle)*inverse);
  }
  const inverse=1/den;
  return gradient.mode==='reflected'
    ?(x,y)=>Math.abs(((x-startX)*dx+(y-startY)*dy)*inverse)
    :(x,y)=>((x-startX)*dx+(y-startY)*dy)*inverse;
}

/** Lower bound for the first stop at or after t, clamped to [1,last].
 * A binary search avoids up to 63 comparisons per pixel for 64-stop gradients.
 * Equality and duplicate stop positions preserve the previous linear scan. */
export function gradientStopUpperIndex(stops:readonly {at:number}[],t:number):number{
  let low=1,high=stops.length-1;
  while(low<high){
    const mid=(low+high)>>>1;
    if(stops[mid]!.at<t)low=mid+1;else high=mid;
  }
  return low;
}
function gradientPixels(gradient:EditableGradient,size:RenderSize,canvas:HTMLCanvasElement|OffscreenCanvas){
  const {width,height,outputWidth,outputHeight}=size;
  const output=new Uint8ClampedArray(outputWidth*outputHeight*4);
  const stops=gradient.stops.map(stop=>({...stop,channels:rgba(stop.color)}));
  const factorX=width/outputWidth,factorY=height/outputHeight;
  const {follow}=gradient;
  let alpha:Uint8Array|undefined;
  if(follow){
    alpha=new Uint8Array(outputWidth*outputHeight);
    if(follow==='mask'){
      if(!size.mask?.enabled)throw Error('形状に沿わせるには、有効なレイヤーマスクが必要です。');
      for(let y=0;y<outputHeight;y++)for(let x=0;x<outputWidth;x++)
        alpha[y*outputWidth+x]=layerMaskCoverage(size.mask,(x+.5)*factorX,(y+.5)*factorY)*255;
    }else{
      canvas.width=outputWidth;canvas.height=outputHeight;
      const ctx=canvas.getContext('2d') as Context|null;
      if(!ctx)throw Error('図形の内側を取得できません。');
      ctx.scale(1/factorX,1/factorY);
      tracePath(ctx,follow);ctx.fill('evenodd');
      // Read only a short row band at once: avoid an additional full 4K RGBA
      // image during full-resolution shape-following gradient rendering.
      alpha=readCanvasAlphaBands(outputWidth,outputHeight,(row,rows)=>
        ctx.getImageData(0,row,outputWidth,rows).data);
    }
  }
  const shapeCoverage=alpha;
  const distance=alpha?gradientBoundaryField(alpha,outputWidth,outputHeight,factorX,factorY):null;
  const spread=Math.max(1,Math.hypot(gradient.end.x-gradient.start.x,gradient.end.y-gradient.start.y));
  const position=distance?null:gradientPositionSampler(gradient);
  const fieldLeft=distance?.left??0,top=distance?.top??0;
  const right=fieldLeft+(distance?.width??outputWidth),bottom=top+(distance?.height??outputHeight);
  for(let y=top;y<bottom;y++)for(let x=fieldLeft;x<right;x++){
    const index=y*outputWidth+x;
    if(shapeCoverage&&!shapeCoverage[index])continue;
    const sx=(x+.5)*factorX,sy=(y+.5)*factorY;
    let t=distance?Math.max(0,distance.values[(y-top)*distance.width+x-fieldLeft]!-Math.min(factorX,factorY))/spread:position!(sx,sy);
    if(gradient.spread==='repeat')t=wrap(t);
    else if(gradient.spread==='reflect'){
      const period=wrap(t/2)*2;t=period<=1?period:2-period;
    }
    const high=gradientStopUpperIndex(stops,t);
    const a=stops[high-1]!,b=stops[high]!;
    const u=b.at===a.at?Number(t>=b.at):Math.max(0,Math.min(1,(t-a.at)/(b.at-a.at)));
    const weight=u<=a.midpoint?u/(2*a.midpoint):.5+(u-a.midpoint)/(2*(1-a.midpoint));
    const left=(1-weight)*a.opacity,right=weight*b.opacity,alpha=left+right,p=(y*outputWidth+x)*4;
    if(alpha===0)continue;
    for(let i=0;i<3;i++)output[p+i]=(left*a.channels[i]!+right*b.channels[i]!)/alpha;
    const shapeAlpha=follow&&follow!=='mask'?shapeCoverage![index]!/255:1;
    const maskAlpha=size.previewMask?layerMaskCoverage(size.mask,sx,sy):1;
    output[p+3]=alpha*shapeAlpha*maskAlpha*255;
  }
  return output;
}

function drawText(ctx:Context,text:EditableText){
  const family=text.family.replace(/["\\\n\r]/g,'');
  const font=['serif','sans-serif','monospace'].includes(family)?family:`"${family}", sans-serif`;
  ctx.font=`${text.size}px ${font}`;
  ctx.fillStyle=text.color;ctx.textBaseline='top';
  if(text.styleRanges?.length){
    const laidOut=layoutStyledText(text,(character,size,bold,italic,family)=>{
      ctx.font=textCanvasFont(family,size,bold,italic);
      return ctx.measureText(character).width;
    });
    ctx.textAlign='left';
    for(const line of laidOut.lines){
      const left=alignedTextLineStart(text,line.width);
      for(const glyph of line.glyphs){
        ctx.save();
        ctx.font=textCanvasFont(glyph.family,glyph.size,glyph.bold,glyph.italic);
        ctx.fillStyle=glyph.color;
        if(text.vertical){
          const cell={x:text.origin.x-line.offset,y:text.origin.y+glyph.position};
          const placement=verticalGlyphAdjustment(glyph.character,glyph.size);
          ctx.textAlign='center';
          ctx.translate(cell.x+placement.dx,cell.y+placement.dy+glyph.size/2);
          if(placement.rotate)ctx.rotate(Math.PI/2);
          ctx.fillText(glyph.character,0,-glyph.size/2);
        }else ctx.fillText(glyph.character,left+glyph.position,text.origin.y+line.offset);
        ctx.restore();
      }
    }
    return;
  }
  const lines=layoutEditableText(text,characters=>{
    const width=ctx.measureText(characters).width;
    return text.spacing?width+Math.max(0,Array.from(characters).length-1)*text.spacing:width;
  }).lines;
  if(text.vertical){
    ctx.textAlign='center';
    for(let line=0;line<lines.length;line++){
      let row=0;
      for(const character of Array.from(lines[line]!)){
        const placement=verticalGlyphAdjustment(character,text.size);
        const cell=textVerticalCell(text,line,row);
        const x=cell.x+placement.dx,y=cell.y+placement.dy;
        ctx.save();
        ctx.translate(x,y+text.size/2);
        if(placement.rotate)ctx.rotate(Math.PI/2);
        ctx.fillText(character,0,-text.size/2);
        ctx.restore();
        row++;
      }
    }
    return;
  }
  for(let row=0;row<lines.length;row++){
    const line=lines[row]!,y=textRowTop(text,row);
    if(!text.spacing){ctx.textAlign='left';ctx.fillText(line,alignedTextLineStart(text,ctx.measureText(line).width),y);continue;}
    const characters=Array.from(line),widths=characters.map(character=>ctx.measureText(character).width+text.spacing);
    const total=widths.reduce((sum,w)=>sum+w,0)-text.spacing;
    let x=alignedTextLineStart(text,total);
    ctx.textAlign='left';
    characters.forEach((character,i)=>{ctx.fillText(character,x,y);x+=widths[i]!;});
  }
}

export function renderArtwork(content:EditableArtwork,size:RenderSize,canvas:HTMLCanvasElement|OffscreenCanvas){
  if(content.kind==='gradient')return gradientPixels(content,size,canvas);
  canvas.width=size.outputWidth;canvas.height=size.outputHeight;
  const ctx=canvas.getContext('2d') as Context|null;
  if(!ctx)throw Error('表示用画像を作れません。');
  ctx.scale(size.outputWidth/size.width,size.outputHeight/size.height);
  if(content.kind==='text')drawText(ctx,content);
  else{
    ctx.globalAlpha=content.opacity??1;
    tracePath(ctx,content);
    if(content.fill){
      if(content.fillRuns?.length){
        for(const run of content.fillRuns){
          tracePath(ctx,{...content,points:content.points.slice(run.start,run.end),closed:false});
          ctx.fillStyle=run.color;ctx.fill('evenodd');
        }
        tracePath(ctx,content);
      }else{ctx.fillStyle=content.fill;ctx.fill('evenodd');}
    }
    if(content.width){
      ctx.lineWidth=content.width;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=content.stroke;
      if(content.lineStyle==='dashed')ctx.setLineDash([content.width*4,content.width*2]);
      if(content.lineStyle==='dotted')ctx.setLineDash([.01,content.width*2]);
      if(content.lineStyle==='pressure'){
        ctx.fillStyle=content.stroke;
        const radius=(point:ArtPoint)=>content.width*(.15+.35*(point.pressure??1));
        for(const line of sampledPath(content)){
          for(let i=1;i<line.length;i++){
            const a=line[i-1]!,b=line[i]!,dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
            if(!length)continue;
            const u=dx/length,v=dy/length,ra=radius(a),rb=radius(b);
            ctx.beginPath();ctx.moveTo(a.x-v*ra,a.y+u*ra);ctx.lineTo(b.x-v*rb,b.y+u*rb);
            ctx.lineTo(b.x+v*rb,b.y-u*rb);ctx.lineTo(a.x+v*ra,a.y-u*ra);ctx.closePath();ctx.fill();
          }
          for(const point of line){ctx.beginPath();ctx.arc(point.x,point.y,radius(point),0,2*Math.PI);ctx.fill();}
        }
      }else ctx.stroke();
    }
  }
  // getImageData already owns a dedicated byte buffer. Returning it directly
  // avoids a second full-canvas allocation and copy (64 MB / about 61 MiB at 4000×4000).
  const pixels=ctx.getImageData(0,0,size.outputWidth,size.outputHeight).data;
  // A new typed-array view shares the ImageData buffer without copying its bytes.
  return new Uint8ClampedArray(pixels.buffer as ArrayBuffer,pixels.byteOffset,pixels.byteLength);
}

export function movePoint(point:ArtPoint,x:number,y:number):ArtPoint{
  const dx=x-point.x,dy=y-point.y;
  return {...point,x,y,...(point.inX===undefined||point.inY===undefined?{}:{inX:point.inX+dx,inY:point.inY+dy}),
    ...(point.outX===undefined||point.outY===undefined?{}:{outX:point.outX+dx,outY:point.outY+dy})};
}
