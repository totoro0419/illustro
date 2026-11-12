/** M09 foreground color is workspace state, not an artwork transaction. */
export type RGB=Readonly<{r:number;g:number;b:number}>;
export type Triple=Readonly<{h:number;s:number;v:number}>;
export type PaletteSwatch={id:string;color:RGB};
export type Palette={id:string;name:string;swatches:PaletteSwatch[]};
export const clamp=(n:number,min=0,max=1)=>Math.min(max,Math.max(min,n));
export const validRGB=(o:unknown):o is RGB=>!!o&&typeof o==='object'&&['r','g','b'].every(k=>Number.isFinite((o as Record<string,unknown>)[k])&&Number((o as Record<string,unknown>)[k])>=0&&Number((o as Record<string,unknown>)[k])<=1);
export const rgb=(r:number,g:number,b:number):RGB=>({r:clamp(r),g:clamp(g),b:clamp(b)});
export const same=(a:RGB,b:RGB)=>Math.abs(a.r-b.r)<1/510&&Math.abs(a.g-b.g)<1/510&&Math.abs(a.b-b.b)<1/510;
export function rgbToHsv(c:RGB):Triple {
 const max=Math.max(c.r,c.g,c.b),min=Math.min(c.r,c.g,c.b),d=max-min;
 let h=0;if(d>0){if(max===c.r)h=((c.g-c.b)/d)%6;else if(max===c.g)h=(c.b-c.r)/d+2;else h=(c.r-c.g)/d+4;}
 return {h:(h*60+360)%360,s:max===0?0:d/max,v:max};
}
export function hsvToRgb(h:number,s:number,v:number):RGB {
 h=((h%360)+360)%360;s=clamp(s);v=clamp(v);
 const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
 const t=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
 return rgb(t[0]!+m,t[1]!+m,t[2]!+m);
}
export function rgbToHsl(c:RGB):{h:number;s:number;l:number}{
 const max=Math.max(c.r,c.g,c.b),min=Math.min(c.r,c.g,c.b),d=max-min,l=(max+min)/2,h=rgbToHsv(c).h;
 return {h,s:d===0?0:d/(1-Math.abs(2*l-1)),l};
}
export function hslToRgb(h:number,s:number,l:number):RGB {
 s=clamp(s);l=clamp(l);const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(((((h%360)+360)%360)/60)%2-1)),m=l-c/2;
 const hue=((h%360)+360)%360,t=hue<60?[c,x,0]:hue<120?[x,c,0]:hue<180?[0,c,x]:hue<240?[0,x,c]:hue<300?[x,0,c]:[c,0,x];
 return rgb(t[0]!+m,t[1]!+m,t[2]!+m);
}
export const hex=(c:RGB)=>'#'+[c.r,c.g,c.b].map(x=>Math.round(clamp(x)*255).toString(16).padStart(2,'0')).join('').toUpperCase();
export function fromHex(text:string):RGB|null{
 const v=text.trim().replace(/^#/,'');if(!/^[0-9a-f]{6}$/i.test(v))return null;
 return rgb(parseInt(v.slice(0,2),16)/255,parseInt(v.slice(2,4),16)/255,parseInt(v.slice(4,6),16)/255);
}
const key='illustro.workspace.colors.m09.v1',MAX_HISTORY=24,MAX_PALETTES=32,MAX_SWATCHES=256;
const ident=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():'sw-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const cleanName=(name:string)=>name.trim().slice(0,80);
export function parsePalette(text:string):Palette {
 if(text.length>262144)throw new Error('ファイルが大きすぎます（256KBまで）。');
 let data:unknown;try{data=JSON.parse(text);}catch{throw new Error('ファイルの形式を読み取れません。');}
 if(!data||typeof data!=='object')throw new Error('パレットが不正です。');
 const p=data as Record<string,unknown>;
 if(p.format!=='illustro-palette'||p.version!==1)throw new Error('対応していないパレット形式またはバージョンです。');
 if(typeof p.name!=='string'||!cleanName(p.name)||!Array.isArray(p.swatches)||p.swatches.length>MAX_SWATCHES)throw new Error('パレット名または色の数が不正です。');
 const ids=new Set<string>(),swatches:PaletteSwatch[]=[];
 for(const entry of p.swatches){
  if(!entry||typeof entry!=='object')throw new Error('色の情報が不正です。');
  const sw=entry as Record<string,unknown>,spec=sw.color as Record<string,unknown>|null;
  if(typeof sw.id!=='string'||sw.id.length<1||sw.id.length>100||ids.has(sw.id))throw new Error('色の識別番号が重複または不正です。');
  if(!spec||typeof spec!=='object'||spec.space!=='srgb'||!Array.isArray(spec.channels)||spec.channels.length!==3||!spec.channels.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1))throw new Error('使えない色データが含まれています。');
  ids.add(sw.id);swatches.push({id:sw.id,color:rgb(spec.channels[0],spec.channels[1],spec.channels[2])});
 }
 return {id:ident(),name:cleanName(p.name),swatches};
}
export function exportPalette(p:Palette):string{
 return JSON.stringify({format:'illustro-palette',version:1,name:p.name,swatches:p.swatches.map(s=>({id:s.id,color:{space:'srgb',channels:[s.color.r,s.color.g,s.color.b]}}))},null,2);
}
export class ForegroundColor {
 current:RGB=rgb(.12,.15,.2);previous:RGB=rgb(.12,.15,.2);history:RGB[]=[];
 palettes:Palette[]=[{id:ident(),name:'マイパレット',swatches:[]}];paletteId=this.palettes[0]!.id;
 private origin:RGB|null=null;private listeners=new Set<()=>void>();
 constructor(storage=true){if(!storage)return;try{const stored=localStorage.getItem(key);if(!stored)return;const d=JSON.parse(stored) as Record<string,unknown>;
  if(d?.version!==1)return;if(validRGB(d.current))this.current=rgb(d.current.r,d.current.g,d.current.b);
  if(validRGB(d.previous))this.previous=rgb(d.previous.r,d.previous.g,d.previous.b);
  if(Array.isArray(d.history))this.history=d.history.filter(validRGB).slice(0,MAX_HISTORY);
  if(Array.isArray(d.palettes)){const items=d.palettes.slice(0,MAX_PALETTES).map((p:unknown)=>{const q=p as Palette;if(typeof q?.id!=='string'||typeof q.name!=='string'||!Array.isArray(q.swatches))return null;return {id:q.id,name:cleanName(q.name),swatches:q.swatches.slice(0,MAX_SWATCHES).filter(s=>typeof s?.id==='string'&&validRGB(s.color))};}).filter((p):p is Palette=>p!==null&&!!p.name);if(items.length)this.palettes=items;}
  if(typeof d.paletteId==='string'&&this.palettes.some(p=>p.id===d.paletteId))this.paletteId=d.paletteId;
 }catch{/* Corrupt workspace preferences never prevent startup. */}}
 get isEditing(){return this.origin!==null;}
 subscribe(f:()=>void){this.listeners.add(f);return ()=>this.listeners.delete(f);}
 private notify(){for(const f of this.listeners)f();}
 private save(){try{localStorage.setItem(key,JSON.stringify({version:1,current:this.current,previous:this.previous,history:this.history,palettes:this.palettes,paletteId:this.paletteId}));}catch{/* Storage quota/unavailable is nonfatal; palette export stays usable. */}}
 begin(){if(!this.origin)this.origin=this.current;}
 preview(c:RGB){if(!validRGB(c))return;this.current=rgb(c.r,c.g,c.b);this.notify();}
 commit(c?:RGB){if(c)this.preview(c);const prior=this.origin??this.current;this.origin=null;
  if(!same(prior,this.current)){this.previous=prior;this.history=[this.current,...this.history.filter(x=>!same(x,this.current))].slice(0,MAX_HISTORY);}
  this.save();this.notify();
 }
 cancel(){if(this.origin){this.current=this.origin;this.origin=null;this.notify();}}
 choose(c:RGB){this.begin();this.preview(c);this.commit();}
 clearHistory(){this.history=[];this.save();this.notify();}
 get palette(){return this.palettes.find(p=>p.id===this.paletteId)??this.palettes[0]!;}
 selectPalette(id:string){if(this.palettes.some(p=>p.id===id)){this.paletteId=id;this.save();this.notify();}}
 createPalette(name:string){if(this.palettes.length>=MAX_PALETTES)throw new Error('パレットは32個までです。');const n=cleanName(name);if(!n)throw new Error('名前を入力してください。');const p={id:ident(),name:n,swatches:[]};this.palettes.push(p);this.paletteId=p.id;this.save();this.notify();}
 renamePalette(name:string){const n=cleanName(name);if(!n)throw new Error('名前を入力してください。');this.palette.name=n;this.save();this.notify();}
 addSwatch(){if(this.palette.swatches.length>=MAX_SWATCHES)throw new Error('1パレットは256色までです。');this.palette.swatches.push({id:ident(),color:this.current});this.save();this.notify();}
 removeSwatch(id:string){this.palette.swatches=this.palette.swatches.filter(s=>s.id!==id);this.save();this.notify();}
 moveSwatch(id:string,delta:number){const a=this.palette.swatches,i=a.findIndex(s=>s.id===id),j=i+delta;if(i<0||j<0||j>=a.length)return;[a[i],a[j]]=[a[j]!,a[i]!];this.save();this.notify();}
 importPalette(text:string){const p=parsePalette(text);if(this.palettes.length>=MAX_PALETTES)throw new Error('パレットは32個までです。');this.palettes.push(p);this.paletteId=p.id;this.save();this.notify();}
}
