import {validateEditableArtwork,type EditableArtwork,type ArtPoint} from '@illustro/core';
import {assertImageSize,imageLayer,MAX_EXCHANGE_BYTES,type ExchangeArtwork} from './exchangeTypes';
const NS='http://www.w3.org/2000/svg';
const shape=['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','opacity','transform'];
const allowed:Record<string,readonly string[]>={
  svg:['width','height','viewBox','xmlns'],g:['aria-label','opacity','display'],
  rect:['x','y','width','height',...shape],ellipse:['cx','cy','rx','ry',...shape],path:['d','fill-rule',...shape],
  text:['xml:space','dominant-baseline','text-anchor','fill','font-family','font-size','letter-spacing','transform'],
  tspan:['x','y'],image:['width','height','href','x','y','opacity']
};
const invalid=()=>Error('安全に対応できないSVGの要素・参照があります。外部参照・スクリプト・未対応の装飾は読み込めません。');
const numeric=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const num=(value:string|null,fallback?:number)=>{
  if(value===null&&fallback!==undefined)return fallback;
  if(value===null||!numeric.test(value.trim()))throw invalid();
  const n=Number(value);if(!Number.isFinite(n)||Math.abs(n)>1e6)throw invalid();return n;
};
const color=(value:string)=>/^#[0-9a-f]{6}$/i.test(value);
const matrix=(value:string)=>{
  const m=/^matrix\(([^)]+)\)$/.exec(value);if(!m)throw invalid();
  const n=m[1]!.trim().split(/[\s,]+/).map(x=>num(x));if(n.length!==6)throw invalid();
  return {a:n[0]!,b:n[1]!,c:n[2]!,d:n[3]!,e:n[4]!,f:n[5]!};
};
const fraction=(value:string|null)=>{const n=num(value,1);if(n<0||n>1)throw invalid();return n;};
function dimension(value:string|null){const m=/^(\d+(?:\.\d+)?)(px|in)?$/.exec(value?.trim()??'');if(!m)throw invalid();return num(m[1]!) *(m[2]==='in'?96:1);}
function pngBytes(value:string){
  if(value.length>64*1024*1024||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw invalid();
  const h=atob(value.slice(22,54));
  if(h.length<24||h.slice(0,8)!=='\x89PNG\r\n\x1a\n'||h.slice(12,16)!=='IHDR')throw invalid();
  const n=(at:number)=>((h.charCodeAt(at)*256+h.charCodeAt(at+1))*256+h.charCodeAt(at+2))*256+h.charCodeAt(at+3);
  const w=n(16),hgt=n(20);assertImageSize(w,hgt);return w*hgt*4;
}
export function validateSvgSource(source:string){
  if(source.length>64*1024*1024||/<!DOCTYPE|<!ENTITY/i.test(source))throw invalid();
  const doc=new DOMParser().parseFromString(source,'image/svg+xml'),root=doc.documentElement;
  if(root.localName!=='svg'||root.namespaceURI!==NS||doc.getElementsByTagName('parsererror').length)throw invalid();
  // XMP is not part of the drawing. Discard it before any browser image decode.
  for(const child of [...root.children])if(child.localName==='metadata'&&child.namespaceURI===NS)child.remove();
  let nodes=0,embeddedBytes=0,images=0;
  function walk(el:Element,depth:number){
    const tag=el.localName;
    if(depth>12||++nodes>50000||el.namespaceURI!==NS||!Object.hasOwn(allowed,tag)||tag==='svg'&&depth!==0)throw invalid();
    if(tag==='tspan'&&el.parentElement?.localName!=='text')throw invalid();
    if(!['svg','g','text'].includes(tag)&&el.children.length)throw invalid();
    if(tag==='text'&&[...el.children].some(c=>c.localName!=='tspan'))throw invalid();
    for(const a of [...el.attributes]){
      const k=a.name,v=a.value;
      if(!allowed[tag]!.includes(k))throw invalid();
      if(k==='href'){if(tag!=='image'||++images>128)throw invalid();embeddedBytes+=pngBytes(v);if(embeddedBytes>MAX_EXCHANGE_BYTES)throw invalid();}
      else if(k==='fill'||k==='stroke'){if(v!=='none'&&!color(v))throw invalid();}
      else if(k==='opacity')fraction(v);
      else if(k==='display'){if(v!=='none'&&v!=='inline')throw invalid();}
      else if(k==='transform')matrix(v);
      else if(k==='font-family'){if(!['sans-serif','serif','monospace'].includes(v))throw invalid();}
      else if(k==='stroke-linecap'||k==='stroke-linejoin'){if(v!=='round')throw invalid();}
      else if(k==='fill-rule'){if(v!=='evenodd'&&v!=='nonzero')throw invalid();}
      else if(k==='dominant-baseline'){if(v!=='text-before-edge')throw invalid();}
      else if(k==='text-anchor'){if(!['start','middle','end'].includes(v))throw invalid();}
      else if(k==='xml:space'){if(v!=='preserve'&&v!=='default')throw invalid();}
      else if(k==='aria-label'){if(v.length>4096)throw invalid();}
      else if(k==='xmlns'){if(v!==NS)throw invalid();}
      else if(k==='viewBox'){const a=v.trim().split(/[\s,]+/);if(a.length!==4)throw invalid();a.forEach(x=>num(x));}
      else if(k==='d'){if(v.length>500000||!/^[MmLlCcZzHhVvQqTtSsAa0-9eE.,+\-\s]*$/.test(v))throw invalid();}
      else if(depth===0&&(k==='width'||k==='height'))dimension(v);
      else num(v);
    }
    if(tag==='image'&&!el.hasAttribute('href'))throw invalid();
    for(const child of [...el.children])walk(child,depth+1);
  }
  walk(root,0);
  const box=root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(x=>num(x));
  const width=Math.round(box?box[2]!:dimension(root.getAttribute('width'))),height=Math.round(box?box[3]!:dimension(root.getAttribute('height')));
  assertImageSize(width,height);
  if(box&&(box[2]!<=0||box[3]!<=0))throw invalid();
  const layers=[...root.children];
  if(!layers.length||layers.length>128||layers.length*width*height*4>MAX_EXCHANGE_BYTES)throw Error('SVGのレイヤー数または画素数が上限を超えています。');
  return {root,width,height,layers,identity:!box||(box[0]===0&&box[1]===0&&box[2]===width&&box[3]===height)};
}
function parsePath(d:string):{points:ArtPoint[];closed:boolean}|null{
  const tokens=d.match(/[MLCZ]|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g)??[];
  if(tokens.join('')!==d.replace(/[\s,]+/g,'')||tokens.length>30000)return null;
  const points:ArtPoint[]=[];let i=0,closed=false;
  const next=()=>num(tokens[i++]??null);
  while(i<tokens.length){
    const cmd=tokens[i++];
    if(cmd==='M'||cmd==='L'){if(cmd==='L'&&!points.length)return null;points.push({x:next(),y:next(),...(cmd==='M'&&points.length?{move:true}:{})});}
    else if(cmd==='C'){const prior=points.at(-1);if(!prior)return null;const outX=next(),outY=next(),inX=next(),inY=next();points[points.length-1]={...prior,outX,outY};points.push({x:next(),y:next(),inX,inY});}
    else if(cmd==='Z'){if(!points.length)return null;points[points.length-1]={...points.at(-1)!,close:true};closed=i===tokens.length;}
    else return null;
  }
  return {points,closed};
}
function editableGeometry(el:Element):EditableArtwork|null{
  try{
    const tag=el.localName,n=(k:string,d?:number)=>num(el.getAttribute(k),d);
    const transform=el.hasAttribute('transform')?{transform:matrix(el.getAttribute('transform')!)}:{};
    if(['rect','ellipse','path'].includes(tag)){
      const fill=el.getAttribute('fill')??'#000000',stroke=el.getAttribute('stroke')??'none';
      if(stroke!=='none'&&(el.getAttribute('stroke-linecap')!=='round'||el.getAttribute('stroke-linejoin')!=='round'))return null;
      let points:ArtPoint[],shape:'rectangle'|'ellipse'|'bezier',closed=true;
      if(tag==='rect'){const x=n('x',0),y=n('y',0),w=n('width'),h=n('height');if(w<0||h<0)return null;points=[{x,y},{x:x+w,y:y+h}];shape='rectangle';}
      else if(tag==='ellipse'){const cx=n('cx',0),cy=n('cy',0),rx=n('rx'),ry=n('ry');if(rx<0||ry<0)return null;points=[{x:cx-rx,y:cy-ry},{x:cx+rx,y:cy+ry}];shape='ellipse';}
      else{if(fill!=='none'&&el.getAttribute('fill-rule')!=='evenodd')return null;const parsed=parsePath(el.getAttribute('d')??'');if(!parsed)return null;({points,closed}=parsed);shape='bezier';}
      return validateEditableArtwork({kind:'path',shape,points,closed,stroke:stroke==='none'?'#000000':stroke,fill:fill==='none'?null:fill,width:stroke==='none'?0:n('stroke-width',1),lineStyle:'solid',opacity:fraction(el.getAttribute('opacity')),...transform});
    }
    if(tag==='text'&&el.getAttribute('dominant-baseline')==='text-before-edge'){
      const spans=[...el.children];if(!spans.length||spans.some(x=>x.localName!=='tspan'))return null;
      const size=n('font-size'),x=num(spans[0]!.getAttribute('x')),y=num(spans[0]!.getAttribute('y'));
      const lineHeight=spans.length>1?(num(spans[1]!.getAttribute('y'))-y)/size:1.2;
      if(spans.some((span,i)=>num(span.getAttribute('x'))!==x||Math.abs(num(span.getAttribute('y'))-y-i*lineHeight*size)>1e-5))return null;
      const anchor=el.getAttribute('text-anchor');
      return validateEditableArtwork({kind:'text',text:spans.map(x=>x.textContent??'').join('\n'),origin:{x,y},vertical:false,size,family:el.getAttribute('font-family')??'sans-serif',color:el.getAttribute('fill')??'#000000',align:anchor==='middle'?'center':anchor==='end'?'right':'left',spacing:n('letter-spacing',0),lineHeight,...transform});
    }
  }catch{return null;}
  return null;
}
async function renderLayer(root:Element,child:Element,width:number,height:number){
  const output=root.cloneNode(false) as Element;
  output.setAttribute('width',String(width));output.setAttribute('height',String(height));
  const cloned=child.cloneNode(true) as Element;
  if(cloned.localName==='g'){cloned.removeAttribute('opacity');cloned.removeAttribute('display');}
  output.append(cloned);
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(output)],{type:'image/svg+xml'}));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  try{
    const image=new Image();image.src=url;await image.decode();
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('SVGの画素を取得できません。');
    ctx.drawImage(image,0,0,width,height);return ctx.getImageData(0,0,width,height).data;
  }finally{URL.revokeObjectURL(url);canvas.width=canvas.height=1;}
}
export async function importSvg(file:File,name:string):Promise<ExchangeArtwork>{
  if(file.size>64*1024*1024)throw Error('SVGは64MBまで読み込めます。');
  const {root,width,height,layers,identity}=validateSvgSource(await file.text());
  const output:ExchangeArtwork['layers'][number][]=[],warnings=new Set<string>();
  warnings.add('対応する単純な図形・文字は再編集できます。埋め込み画像と未対応の安全な形状は画素として開きます。');
  for(const [index,child] of layers.entries()){
    const group=child.localName==='g',geometry=group&&child.children.length===1?child.children[0]!:child;
    const editable=identity?editableGeometry(geometry):null;
    const pixels=await renderLayer(root,child,width,height);
    output.push({...imageLayer(child.getAttribute('aria-label')??(layers.length===1?name:'レイヤー '+(index+1)),width,height,pixels),
      opacity:group?fraction(child.getAttribute('opacity')):1,visible:!group||child.getAttribute('display')!=='none',...(editable?{editable}:{})});
    if(!editable&&geometry.localName!=='image')warnings.add('一部のSVG形状は見た目を保つため画像に変換しました。');
  }
  const w=root.getAttribute('width')??'',dpi=w.endsWith('in')?width/num(w.slice(0,-2)):undefined;
  return {width,height,name,layers:output,warnings:[...warnings],...(dpi&&dpi>=1&&dpi<=2400?{dpi}:{})};
}
