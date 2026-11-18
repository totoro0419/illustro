import type {ArtPoint,EditablePath,EditableText} from '@illustro/core';
import {layoutEditableText} from './textLayout';
import {verticalGlyphAdjustment} from './verticalGlyph';
import {addAsset,getAsset,listAssets,type AssetInfo,type AssetEntry} from '../assets/library';
import type {Font,PathCommand} from 'opentype.js';

const familyName=(id:string)=>'IllustroFont-'+id;
const liveFonts=new Map<string,Promise<FontFace>>();
export const fontAssets=async()=> (await listAssets()).filter(asset=>asset.kind==="font");

export async function importFont(file:File):Promise<AssetInfo>{
  if(!/\.(ttf|otf|woff2?)$/i.test(file.name)||file.size>24*1024*1024)
    throw Error('TTF、OTF、WOFF形式の24MB以下のフォントを選んでください。');
  const buffer=await file.arrayBuffer(),id=crypto.randomUUID();
  const face=await new FontFace(familyName(id),buffer).load();
  const asset=await addAsset({id,kind:'font',name:file.name,data:file,origin:file.name});
  registerLoadedFont(id,face);
  return asset;
}
export function registerLoadedFont(id:string,face:FontFace){
  document.fonts.add(face);
  liveFonts.set(id,Promise.resolve(face));
}

export async function ensureFont(id:string){
  const existing=liveFonts.get(id);
  if(existing)return existing;
  const loading=(async()=>{
    const asset=await getAsset(id);
    if(!asset||asset.deleted||asset.kind!=='font')throw Error('元のフォントが見つかりません。フォントを選び直してから適用してください。');
    const face=await new FontFace(familyName(id),await asset.data.arrayBuffer()).load();
    document.fonts.add(face);return face;
  })();
  liveFonts.set(id,loading);
  try{return await loading;}catch(error){liveFonts.delete(id);throw error;}
}
export function fontFamily(id:string){return familyName(id);}

// A browser can display WOFF2 through FontFace even though opentype.js cannot trace it.
// Check the file signature, not only the filename: extensions can be renamed.
async function outlineFont(asset:AssetEntry):Promise<Font>{
  const head=new Uint8Array(await asset.data.slice(0,4).arrayBuffer());
  if(String.fromCharCode(...head)==='wOF2')
    throw Error('WOFF2は表示できますが、輪郭化には未対応です。輪郭化する場合はTTF・OTF・WOFF版のフォントを読み込んでください。');
  try{
    const {parse}=await import('opentype.js');
    return parse(await asset.data.arrayBuffer());
  }catch{
    throw Error('このフォントは表示できますが、輪郭化のための形状を読み取れません。TTF・OTF・WOFF形式をお試しください。');
  }
}

export async function fontOutlineCapability(id:string):Promise<string|null>{
  const asset=await getAsset(id);
  if(!asset||asset.deleted||asset.kind!=='font')
    return '元のフォントがありません。フォントを読み込み直してください。';
  try{await outlineFont(asset);return null;}
  catch(error){return error instanceof Error?error.message:String(error);}
}

function appendCommands(points:ArtPoint[],commands:readonly PathCommand[]){
  for(const command of commands){
    if(command.type==='Z'){
      const previous=points.at(-1);
      if(previous)points[points.length-1]={...previous,close:true};
      continue;
    }
    if(command.x===undefined||command.y===undefined)continue;
    const item={x:command.x,y:command.y};
    const old=points.at(-1);
    if(command.type==='M'){points.push({...item,move:true});continue;}
    if(command.type==='C'&&old&&command.x1!==undefined&&command.y1!==undefined&&command.x2!==undefined&&command.y2!==undefined){
      points[points.length-1]={...old,outX:command.x1,outY:command.y1};
      points.push({...item,inX:command.x2,inY:command.y2});
    }else if(command.type==='Q'&&old&&command.x1!==undefined&&command.y1!==undefined){
      const x=command.x1,y=command.y1;
      points[points.length-1]={...old,outX:old.x+(x-old.x)*2/3,outY:old.y+(y-old.y)*2/3};
      points.push({...item,inX:item.x+(x-item.x)*2/3,inY:item.y+(y-item.y)*2/3});
    }else points.push(item);
  }
}

function vectorize(text:EditableText,font:Font):ArtPoint[]{
  const points:ArtPoint[]=[],ascent=font.ascender*text.size/font.unitsPerEm;
  const lines=layoutEditableText(text,characters=>
    font.getAdvanceWidth(characters,text.size,{kerning:true})+
      (Array.from(characters).length-1)*text.spacing).lines;
  for(let i=0;i<lines.length;i++){
    const line=lines[i]!,characters=Array.from(line);
    if(text.vertical){
      for(const [j,character] of characters.entries()){
        const placement=verticalGlyphAdjustment(character,text.size);
        const x=text.origin.x-i*text.size*text.lineHeight+placement.dx;
        const y=text.origin.y+j*(text.size+text.spacing)+placement.dy;
        const width=font.getAdvanceWidth(character,text.size);
        const commands=font.getPath(character,0,ascent,text.size).commands;
        const rotated=placement.rotate;
        const place=(u:number,v:number):[number,number]=>rotated?[x-(v-text.size/2),y+text.size/2+(u-width/2)]:[x+u-width/2,y+v];
        appendCommands(points,commands.map(command=>{
          const copy={...command};
          if(command.x!==undefined&&command.y!==undefined)[copy.x,copy.y]=place(command.x,command.y);
          if(command.x1!==undefined&&command.y1!==undefined)[copy.x1,copy.y1]=place(command.x1,command.y1);
          if(command.x2!==undefined&&command.y2!==undefined)[copy.x2,copy.y2]=place(command.x2,command.y2);
          return copy;
        }));
      }
      continue;
    }
    const y=text.origin.y+i*text.size*text.lineHeight+ascent;
    const widths=characters.map(character=>font.getAdvanceWidth(character,text.size)+text.spacing);
    const width=text.spacing?widths.reduce((sum,w)=>sum+w,0)-text.spacing:font.getAdvanceWidth(line,text.size,{kerning:true});
    let x=text.origin.x-(text.align==='center'?width/2:text.align==='right'?width:0);
    if(text.spacing){
      characters.forEach((character,j)=>{appendCommands(points,font.getPath(character,x,y,text.size).commands);x+=widths[j]!;});
    }else appendCommands(points,font.getPath(line,x,y,text.size,{kerning:true}).commands);
  }
  return points;
}
export async function outlineText(text:EditableText):Promise<EditablePath>{
  if(!text.fontAsset)throw Error('パスへ変換するには、読み込んだフォントを文字レイヤーに適用してください。');
  const font=await getAsset(text.fontAsset);
  if(!font||font.deleted||font.kind!=='font')throw Error('輪郭を取得するフォントが見つかりません。');
  const parsed=await outlineFont(font);
  if(Array.from(text.text).some(character=>!/^\s$/u.test(character)&&!parsed.charToGlyphIndex(character)))
    throw Error('このフォントには一部の文字がありません。文字を含むフォントを選んでください。');
  const points=vectorize(text,parsed);
  if(points.length<2||points.length>4096)throw Error('文字を短く分けてから、輪郭へ変換してください。');
  return {kind:'path',shape:'bezier',points,closed:false,stroke:text.color,fill:text.color,width:0};
}
