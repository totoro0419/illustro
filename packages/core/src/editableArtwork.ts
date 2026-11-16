export type ArtPoint=Readonly<{x:number;y:number;inX?:number;inY?:number;outX?:number;outY?:number;pressure?:number;move?:boolean;close?:boolean}>;
export type GradientStop=Readonly<{at:number;color:string;opacity:number;midpoint:number}>;
export type EditableGradient=Readonly<{
  kind:'gradient';mode:'linear'|'radial'|'reflected'|'angular';start:ArtPoint;end:ArtPoint;
  stops:readonly GradientStop[];
  follow?:'mask'|EditablePath;
}>;
export type EditablePath=Readonly<{
  kind:'path';shape:'rectangle'|'ellipse'|'polyline'|'bezier'|'freehand';
  points:readonly ArtPoint[];closed:boolean;stroke:string;fill:string|null;width:number;
  lineStyle?:'solid'|'dashed'|'dotted'|'pressure';
  opacity?:number; originalStrokeLayer?:string;
  /** Original operands remain editable; points store the rendered result for legacy readers. */
  booleanOperands?:Readonly<{mode:'union'|'intersection'|'difference'|'xor';a:EditablePath;b:EditablePath}>;
}>;
export type EditableText=Readonly<{
  kind:'text';text:string;origin:ArtPoint;vertical:boolean;size:number;family:string;color:string;
  align:'left'|'center'|'right';spacing:number;lineHeight:number;fontAsset?:string;embedFont?:boolean;
}>;
export type EditableArtwork=EditableGradient|EditablePath|EditableText;

const field=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
const color=(value:unknown):value is string=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const numeric=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const coordinate=(value:unknown):value is number=>numeric(value,-1e6,1e6);
const invalid=()=>new Error('編集できるレイヤーのデータが正しくありません。');
const known=new WeakSet<object>();
function point(value:unknown):ArtPoint{
  if(!field(value)||!coordinate(value.x)||!coordinate(value.y))throw invalid();
  const {x,y,inX,inY,outX,outY,pressure,move,close}=value;
  if(pressure!==undefined&&!numeric(pressure,0,1))throw invalid();
  if((move!==undefined&&typeof move!=='boolean')||(close!==undefined&&typeof close!=='boolean'))throw invalid();
  if((inX!==undefined||inY!==undefined)&&(!coordinate(inX)||!coordinate(inY)))throw invalid();
  if((outX!==undefined||outY!==undefined)&&(!coordinate(outX)||!coordinate(outY)))throw invalid();
  return Object.freeze({x,y,...(typeof pressure==='number'?{pressure}:{}),...(move?{move:true}:{}),...(close?{close:true}:{}),...(coordinate(inX)&&coordinate(inY)?{inX,inY}:{}),...(coordinate(outX)&&coordinate(outY)?{outX,outY}:{})});
}
export function validateEditableArtwork(value:unknown):EditableArtwork|null{
  if(value===undefined||value===null)return null;
  if(!field(value))throw invalid();
  if(known.has(value))return value as EditableArtwork;
  let checked:EditableArtwork;
  if(value.kind==='gradient'){
    const mode=value.mode;
    if(mode!=='linear'&&mode!=='radial'&&mode!=='reflected'&&mode!=='angular')throw invalid();
    if(!Array.isArray(value.stops)||value.stops.length<2||value.stops.length>64)throw invalid();
    const stops:GradientStop[]=value.stops.map(stop=>{
      if(!field(stop)||!numeric(stop.at,0,1)||!color(stop.color)||!numeric(stop.opacity,0,1)||!numeric(stop.midpoint,.01,.99))throw invalid();
      return Object.freeze({at:stop.at,color:stop.color,opacity:stop.opacity,midpoint:stop.midpoint});
    });
    stops.sort((a,b)=>a.at-b.at);
    let follow:EditableGradient['follow'];
    if(value.follow==='mask')follow='mask';
    else if(value.follow!==undefined){
      if(!field(value.follow)||value.follow.kind!=='path')throw invalid();
      const boundary=validateEditableArtwork(value.follow);
      if(boundary?.kind!=='path'||!(boundary.closed||boundary.shape==='ellipse'||boundary.shape==='rectangle'))throw invalid();
      follow=boundary;
    }
    checked=Object.freeze({kind:'gradient',mode,start:point(value.start),end:point(value.end),stops:Object.freeze(stops),
      ...(follow?{follow}:{})});
  }else if(value.kind==='path'){
    const {shape,points,closed,stroke,fill,width,lineStyle,opacity,originalStrokeLayer,booleanOperands}=value;
    if(shape!=='rectangle'&&shape!=='ellipse'&&shape!=='polyline'&&shape!=='bezier'&&shape!=='freehand')throw invalid();
    if(!Array.isArray(points)||points.length<2||points.length>4096||typeof closed!=='boolean'||!color(stroke)||
      (opacity!==undefined&&!numeric(opacity,0,1))||
      (originalStrokeLayer!==undefined&&(typeof originalStrokeLayer!=='string'||!originalStrokeLayer||originalStrokeLayer.length>128))||
      (fill!==null&&!color(fill))||!numeric(width,0,4096)||
      (lineStyle!==undefined&&lineStyle!=='solid'&&lineStyle!=='dashed'&&lineStyle!=='dotted'&&lineStyle!=='pressure'))throw invalid();
    let construction:EditablePath['booleanOperands'];
    if(booleanOperands!==undefined){
      if(!field(booleanOperands)||!['union','intersection','difference','xor'].includes(String(booleanOperands.mode))||
        !field(booleanOperands.a)||!field(booleanOperands.b)||
        booleanOperands.a.booleanOperands!==undefined||booleanOperands.b.booleanOperands!==undefined)throw invalid();
      const a=validateEditableArtwork(booleanOperands.a),b=validateEditableArtwork(booleanOperands.b);
      if(a?.kind!=='path'||b?.kind!=='path')throw invalid();
      construction=Object.freeze({mode:booleanOperands.mode as 'union'|'intersection'|'difference'|'xor',a,b});
    }
    checked=Object.freeze({kind:'path',shape,points:Object.freeze(points.map(point)),closed,stroke,fill,width,...(lineStyle?{lineStyle}:{}),
      ...(typeof opacity==='number'?{opacity}:{}),...(typeof originalStrokeLayer==='string'?{originalStrokeLayer}:{}),
      ...(construction?{booleanOperands:construction}:{})});
  }else if(value.kind==='text'){
    const {text,origin,vertical,size,family,align,spacing,lineHeight,fontAsset,embedFont}=value;
    if(typeof text!=='string'||!text.trim()||text.length>8192||typeof vertical!=='boolean'||!numeric(size,1,4096)||
      typeof family!=='string'||!family.trim()||family.length>128||!color(value.color)||
      (align!=='left'&&align!=='center'&&align!=='right')||!numeric(spacing,-4096,4096)||!numeric(lineHeight,.2,8)||
      (fontAsset!==undefined&&(typeof fontAsset!=='string'||fontAsset.length>128))||
      (embedFont!==undefined&&typeof embedFont!=='boolean'))throw invalid();
    checked=Object.freeze({kind:'text',text,origin:point(origin),vertical,size,family,align,spacing,lineHeight,
      color:value.color,...(typeof fontAsset==='string'?{fontAsset,...(embedFont?{embedFont:true}:{})}:{})});
  }else throw invalid();
  known.add(checked);
  return checked;
}

export function moveEditableArtwork(content:EditableArtwork,dx:number,dy:number):EditableArtwork{
  const move=(point:ArtPoint):ArtPoint=>({
    x:point.x+dx,y:point.y+dy,...(point.pressure!==undefined?{pressure:point.pressure}:{}),...(point.move?{move:true}:{}),...(point.close?{close:true}:{}),
    ...(point.inX!==undefined&&point.inY!==undefined?{inX:point.inX+dx,inY:point.inY+dy}:{}),
    ...(point.outX!==undefined&&point.outY!==undefined?{outX:point.outX+dx,outY:point.outY+dy}:{})
  });
  if(content.kind==='gradient'){
    const follow=content.follow;
    return {...content,start:move(content.start),end:move(content.end),
      ...(follow&&follow!=='mask'?{follow:{...follow,points:follow.points.map(move)}}:{})};
  }
  if(content.kind==='text')return {...content,origin:move(content.origin)};
  const operands=content.booleanOperands;
  return {...content,points:content.points.map(move),...(operands?{booleanOperands:{
    mode:operands.mode,
    a:{...operands.a,points:operands.a.points.map(move)},
    b:{...operands.b,points:operands.b.points.map(move)}
  }}:{})};
}
