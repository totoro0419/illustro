import type {ArtPoint,EditableArtwork,EditableGradient,EditablePath,EditableText,LayerMask} from '@illustro/core';
import {layoutEditableText} from './textLayout';
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
function gradientPosition(gradient:EditableGradient,x:number,y:number){
  const dx=gradient.end.x-gradient.start.x,dy=gradient.end.y-gradient.start.y;
  const u=x-gradient.start.x,v=y-gradient.start.y,den=dx*dx+dy*dy;
  if(!den)return 0;
  if(gradient.mode==='radial')return Math.hypot(u,v)/Math.sqrt(den);
  if(gradient.mode==='angular')return wrap((Math.atan2(v,u)-Math.atan2(dy,dx))/(2*Math.PI));
  const t=(u*dx+v*dy)/den;
  return gradient.mode==='reflected'?Math.abs(t):t;
}
function boundaryDistance(alpha:Uint8Array,width:number,height:number){
  const distances=new Float32Array(alpha.length);
  const diagonal=Math.SQRT2;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;
    if(!alpha[i])continue;
    distances[i]=Math.min(
      x?distances[i-1]!+1:1,y?distances[i-width]!+1:1,
      x&&y?distances[i-width-1]!+diagonal:Infinity,
      x+1<width&&y?distances[i-width+1]!+diagonal:Infinity
    );
  }
  for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
    const i=y*width+x;
    if(!alpha[i])continue;
    distances[i]=Math.min(distances[i]!,
      x+1<width?distances[i+1]!+1:1,y+1<height?distances[i+width]!+1:1,
      x+1<width&&y+1<height?distances[i+width+1]!+diagonal:Infinity,
      x&&y+1<height?distances[i+width-1]!+diagonal:Infinity
    );
  }
  return distances;
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
      const pixels=ctx.getImageData(0,0,outputWidth,outputHeight).data;
      for(let i=0;i<alpha.length;i++)alpha[i]=pixels[i*4+3]!;
    }
  }
  const shapeCoverage=alpha;
  const distance=alpha?boundaryDistance(alpha,outputWidth,outputHeight):null;
  const spread=Math.max(1,Math.hypot(gradient.end.x-gradient.start.x,gradient.end.y-gradient.start.y));
  const distanceScale=Math.sqrt(factorX*factorY)/spread;
  for(let y=0;y<outputHeight;y++)for(let x=0;x<outputWidth;x++){
    const index=y*outputWidth+x;
    if(shapeCoverage&&!shapeCoverage[index])continue;
    const sx=(x+.5)*factorX,sy=(y+.5)*factorY;
    const t=distance?Math.max(0,distance[index]!-1)*distanceScale:gradientPosition(gradient,sx,sy);
    let high=1;
    while(high<stops.length-1&&stops[high]!.at<t)high++;
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
        const x=text.origin.x-line*text.size*text.lineHeight+placement.dx;
        const y=text.origin.y+row*(text.size+text.spacing)+placement.dy;
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
    const line=lines[row]!,y=text.origin.y+row*text.size*text.lineHeight;
    if(!text.spacing){ctx.textAlign=text.align;ctx.fillText(line,text.origin.x,y);continue;}
    const characters=Array.from(line),widths=characters.map(character=>ctx.measureText(character).width+text.spacing);
    const total=widths.reduce((sum,w)=>sum+w,0)-text.spacing;
    let x=text.origin.x-(text.align==='center'?total/2:text.align==='right'?total:0);
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
    if(content.fill){ctx.fillStyle=content.fill;ctx.fill('evenodd');}
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
