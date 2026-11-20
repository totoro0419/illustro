/** Canvas-order affine matrix; original points and text stay editable. */
export type ArtworkAffine=Readonly<{a:number;b:number;c:number;d:number;e:number;f:number}>;
export const identityArtworkAffine:ArtworkAffine={a:1,b:0,c:0,d:1,e:0,f:0};
export function composeArtworkAffine(next:ArtworkAffine,previous:ArtworkAffine=identityArtworkAffine):ArtworkAffine{
  return {a:next.a*previous.a+next.c*previous.b,b:next.b*previous.a+next.d*previous.b,
    c:next.a*previous.c+next.c*previous.d,d:next.b*previous.c+next.d*previous.d,
    e:next.a*previous.e+next.c*previous.f+next.e,f:next.b*previous.e+next.d*previous.f+next.f};
}
export function inverseArtworkAffine(t:ArtworkAffine):ArtworkAffine{
  const det=t.a*t.d-t.b*t.c;
  if(!Number.isFinite(det)||Math.abs(det)<1e-12)throw Error('変形の倍率が小さすぎます。');
  return {a:t.d/det,b:-t.b/det,c:-t.c/det,d:t.a/det,
    e:(t.c*t.f-t.d*t.e)/det,f:(t.b*t.e-t.a*t.f)/det};
}
export function mapArtworkPoint<T extends {x:number;y:number}>(p:T,t?:ArtworkAffine):T{
  return t?{...p,x:t.a*p.x+t.c*p.y+t.e,y:t.b*p.x+t.d*p.y+t.f}:p;
}
export type ArtPoint=Readonly<{x:number;y:number;inX?:number;inY?:number;outX?:number;outY?:number;pressure?:number;move?:boolean;close?:boolean}>;
export type GradientStop=Readonly<{at:number;color:string;opacity:number;midpoint:number}>;
export type EditableGradient=Readonly<{
  kind:'gradient';mode:'linear'|'radial'|'reflected'|'angular';start:ArtPoint;end:ArtPoint;
  stops:readonly GradientStop[];
  follow?:'mask'|EditablePath;
  spread?:'pad'|'repeat'|'reflect';
  /** Radius perpendicular to start→end, relative to the primary radius. */
  radialRatio?:number;
}>;
export type EditablePath=Readonly<{
  transform?:ArtworkAffine;
  kind:'path';shape:'rectangle'|'ellipse'|'polyline'|'bezier'|'freehand';
  points:readonly ArtPoint[];closed:boolean;stroke:string;fill:string|null;width:number;
  lineStyle?:'solid'|'dashed'|'dotted'|'pressure';
  opacity?:number; originalStrokeLayer?:string;
  /** A linked operation may temporarily have no filled area. */
  empty?:true;
  /** Ordered painted glyph groups; indices refer to complete point ranges. */
  fillRuns?:readonly Readonly<{start:number;end:number;color:string}>[];
  /** Original operands remain editable; points store the rendered result for legacy readers. */
  booleanOperands?:Readonly<{mode:'union'|'intersection'|'difference'|'xor';a:EditablePath;b:EditablePath;
    /** Live layer links; embedded shapes remain safe fallbacks after deletion. */
    sourceLayerIds?:readonly [string,string]}>;
}>;
/** UTF-16 offsets match textarea.selectionStart/End, including emoji. */
export type TextStyleRange=Readonly<{start:number;end:number;color?:string;size?:number;bold?:boolean;italic?:boolean;family?:'sans-serif'|'serif'|'monospace';fontAsset?:string|null}>;
export type EditableText=Readonly<{
  transform?:ArtworkAffine;
  kind:'text';text:string;origin:ArtPoint;vertical:boolean;size:number;family:string;color:string;
  align:'left'|'center'|'right';spacing:number;lineHeight:number;fontAsset?:string;embedFont?:boolean;
  /** Optional editable text frame; absent fields retain legacy unbounded text. */
  boxWidth?:number;boxHeight?:number;
  /** Optional two-digit horizontal cells within Japanese vertical text. */
  combineDigits?:true;
  /** Optional non-overlapping overrides; old documents have no ranges. */
  styleRanges?:readonly TextStyleRange[];
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
    const {spread,radialRatio}=value;
    if((spread!==undefined&&spread!=='pad'&&spread!=='repeat'&&spread!=='reflect')||
       (radialRatio!==undefined&&!numeric(radialRatio,.01,100)))throw invalid();
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
      ...(spread!==undefined?{spread}:{}),...(typeof radialRatio==='number'?{radialRatio}:{}),
      ...(follow?{follow}:{})});
  }else if(value.kind==='path'){
    const {shape,points,closed,stroke,fill,width,lineStyle,opacity,originalStrokeLayer,booleanOperands,fillRuns,empty}=value;
    if(shape!=='rectangle'&&shape!=='ellipse'&&shape!=='polyline'&&shape!=='bezier'&&shape!=='freehand')throw invalid();
    if(!Array.isArray(points)||points.length<2||points.length>4096||typeof closed!=='boolean'||!color(stroke)||
      (opacity!==undefined&&!numeric(opacity,0,1))||
      (empty!==undefined&&empty!==true)||
      (originalStrokeLayer!==undefined&&(typeof originalStrokeLayer!=='string'||!originalStrokeLayer||originalStrokeLayer.length>128))||
      (fill!==null&&!color(fill))||!numeric(width,0,4096)||
      (lineStyle!==undefined&&lineStyle!=='solid'&&lineStyle!=='dashed'&&lineStyle!=='dotted'&&lineStyle!=='pressure'))throw invalid();
    let paints:EditablePath['fillRuns'];
    if(fillRuns!==undefined){
      if(!Array.isArray(fillRuns)||!fillRuns.length||fillRuns.length>points.length/2||shape==='rectangle'||shape==='ellipse')throw invalid();
      let previous=0;
      paints=Object.freeze(fillRuns.map(run=>{
        if(!field(run)||!Number.isSafeInteger(run.start)||!Number.isSafeInteger(run.end)||
          run.start!==previous||(run.end as number)<previous+2||(run.end as number)>points.length||!color(run.color))throw invalid();
        if(previous>0&&!field(points[previous]))throw invalid();
        if(previous>0&&!(points[previous] as Record<string,unknown>).move)throw invalid();
        previous=run.end as number;
        return Object.freeze({start:run.start as number,end:previous,color:run.color});
      }));
      if(previous!==points.length)throw invalid();
    }
    let construction:EditablePath['booleanOperands'];
    if(booleanOperands!==undefined){
      if(!field(booleanOperands)||!['union','intersection','difference','xor'].includes(String(booleanOperands.mode))||
        !field(booleanOperands.a)||!field(booleanOperands.b)||
        booleanOperands.a.booleanOperands!==undefined||booleanOperands.b.booleanOperands!==undefined)throw invalid();
      const a=validateEditableArtwork(booleanOperands.a),b=validateEditableArtwork(booleanOperands.b);
      if(a?.kind!=='path'||b?.kind!=='path')throw invalid();
      const ids=booleanOperands.sourceLayerIds;
      if(ids!==undefined&&(!Array.isArray(ids)||ids.length!==2||ids[0]===ids[1]||
        ids.some(id=>typeof id!=='string'||!id||id.length>128)))throw invalid();
      construction=Object.freeze({mode:booleanOperands.mode as 'union'|'intersection'|'difference'|'xor',a,b,
        ...(ids?{sourceLayerIds:Object.freeze([ids[0],ids[1]]) as readonly [string,string]}:{})});
    }
    checked=Object.freeze({kind:'path',shape,points:Object.freeze(points.map(point)),closed,stroke,fill,width,...(lineStyle?{lineStyle}:{}),
      ...(typeof opacity==='number'?{opacity}:{}),...(typeof originalStrokeLayer==='string'?{originalStrokeLayer}:{}),
      ...(construction?{booleanOperands:construction}:{}),...(paints?{fillRuns:paints}:{}),...(empty?{empty:true as const}:{})});
  }else if(value.kind==='text'){
    const {text,origin,vertical,size,family,align,spacing,lineHeight,fontAsset,embedFont,boxWidth,boxHeight,styleRanges,combineDigits}=value;
    if(typeof text!=='string'||!text.trim()||text.length>8192||typeof vertical!=='boolean'||!numeric(size,1,4096)||
      typeof family!=='string'||!family.trim()||family.length>128||!color(value.color)||
      (align!=='left'&&align!=='center'&&align!=='right')||!numeric(spacing,-4096,4096)||!numeric(lineHeight,.2,8)||
      (fontAsset!==undefined&&(typeof fontAsset!=='string'||fontAsset.length>128))||
      (embedFont!==undefined&&typeof embedFont!=='boolean')||
      (combineDigits!==undefined&&combineDigits!==true)||
      (boxWidth!==undefined&&!numeric(boxWidth,1,32768))||
      (boxHeight!==undefined&&!numeric(boxHeight,1,32768)))throw invalid();
    const styles:TextStyleRange[]=[];
    if(styleRanges!==undefined){
      if(!Array.isArray(styleRanges)||styleRanges.length>text.length)throw invalid();
      let previousEnd=0;
      const boundary=(offset:number)=>offset===0||offset===text.length||
        !(text.charCodeAt(offset-1)>=0xd800&&text.charCodeAt(offset-1)<=0xdbff&&
          text.charCodeAt(offset)>=0xdc00&&text.charCodeAt(offset)<=0xdfff);
      for(const item of styleRanges){
        if(!field(item)||!Number.isSafeInteger(item.start)||!Number.isSafeInteger(item.end)||
          (item.start as number)<previousEnd||(item.end as number)<=(item.start as number)||
          (item.end as number)>text.length||!boundary(item.start as number)||!boundary(item.end as number)||
          (item.color===undefined&&item.size===undefined&&item.bold===undefined&&item.italic===undefined&&item.family===undefined&&item.fontAsset===undefined)||
          (item.color!==undefined&&!color(item.color))||
          (item.size!==undefined&&!numeric(item.size,1,4096))||
          (item.bold!==undefined&&typeof item.bold!=='boolean')||
          (item.italic!==undefined&&typeof item.italic!=='boolean')||
          (item.family!==undefined&&item.family!=='sans-serif'&&item.family!=='serif'&&item.family!=='monospace')||
          (item.fontAsset!==undefined&&item.fontAsset!==null&&(typeof item.fontAsset!=='string'||!item.fontAsset.length||item.fontAsset.length>128)))throw invalid();
        const start=item.start as number,end=item.end as number;
        styles.push(Object.freeze({start,end,...(item.color!==undefined?{color:item.color as string}:{}),
          ...(item.size!==undefined?{size:item.size as number}:{}),
          ...(typeof item.bold==='boolean'?{bold:item.bold}:{}),
          ...(typeof item.italic==='boolean'?{italic:item.italic}:{}),
          ...(item.family!==undefined?{family:item.family as NonNullable<TextStyleRange['family']>}:{}),
          ...(item.fontAsset!==undefined?{fontAsset:item.fontAsset as string|null}:{})}));
        previousEnd=end;
      }
    }
    checked=Object.freeze({kind:'text',text,origin:point(origin),vertical,size,family,align,spacing,lineHeight,
      color:value.color,...(typeof fontAsset==='string'?{fontAsset}:{}),...(embedFont?{embedFont:true}:{}),
      ...(combineDigits?{combineDigits:true as const}:{}),
      ...(typeof boxWidth==='number'?{boxWidth}:{}),...(typeof boxHeight==='number'?{boxHeight}:{}),
      ...(styles.length?{styleRanges:Object.freeze(styles)}:{})});
  }else throw invalid();
  if(value.transform!==undefined){
    if(checked.kind==='gradient'||!field(value.transform))throw invalid();
    const t=value.transform;
    if(!['a','b','c','d','e','f'].every(key=>coordinate(t[key])))throw invalid();
    const transform={a:t.a as number,b:t.b as number,c:t.c as number,d:t.d as number,e:t.e as number,f:t.f as number};
    inverseArtworkAffine(transform);
    checked=Object.freeze({...checked,transform:Object.freeze(transform)});
  }
  known.add(checked);
  return checked;
}

export function moveEditableArtwork(content:EditableArtwork,dx:number,dy:number):EditableArtwork{
  if(content.kind!=='gradient'&&content.transform)return validateEditableArtwork({...content,transform:composeArtworkAffine({a:1,b:0,c:0,d:1,e:dx,f:dy},content.transform)})!;
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
    ...operands,
    a:moveEditableArtwork(operands.a,dx,dy) as EditablePath,
    b:moveEditableArtwork(operands.b,dx,dy) as EditablePath
  }}:{})};
}
