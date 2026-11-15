/** Local brush discovery preferences. These never change document pixels or brush presets. */
type Store=Pick<Storage,'getItem'|'setItem'>;
const KEY='illustro.brush-usage.v1';
const safeIds=(input:unknown,max:number):string[]=>{
 if(!Array.isArray(input))return [];
 return [...new Set(input.filter((x):x is string=>typeof x==='string'&&x.length>0&&x.length<=160))].slice(0,max);
};
export class BrushUsage{
 private readonly store:Store|null;
 private favoriteList:string[]=[];
 private recentList:string[]=[];
 constructor(store?:Store|null){
  if(store!==undefined)this.store=store;
  else{let value:Store|null=null;try{value=localStorage;}catch{}this.store=value;}
  try{
   const raw=this.store?.getItem(KEY);if(!raw)return;
   const parsed:unknown=JSON.parse(raw);
   if(!parsed||typeof parsed!=='object')return;
   const value=parsed as Record<string,unknown>;
   this.favoriteList=safeIds(value.favorites,128);
   this.recentList=safeIds(value.recent,30);
  }catch{/* Invalid or inaccessible personal preferences must not block drawing. */}
 }
 get favoriteIds():readonly string[]{return [...this.favoriteList];}
 get recentIds():readonly string[]{return [...this.recentList];}
 isFavorite(id:string):boolean{return this.favoriteList.includes(id);}
 markUsed(id:string){
  if(!id||id.length>160)return;
  this.recentList=[id,...this.recentList.filter(x=>x!==id)].slice(0,30);
  this.persist();
 }
 toggleFavorite(id:string):boolean{
  if(!id||id.length>160)return false;
  this.favoriteList=this.isFavorite(id)?this.favoriteList.filter(x=>x!==id):[...this.favoriteList.filter(x=>x!==id),id].slice(-128);
  this.persist();return this.isFavorite(id);
 }
 remove(id:string){
  this.favoriteList=this.favoriteList.filter(x=>x!==id);
  this.recentList=this.recentList.filter(x=>x!==id);
  this.persist();
 }
 private persist(){try{this.store?.setItem(KEY,JSON.stringify({favorites:this.favoriteList,recent:this.recentList}));}catch{/* Storage restrictions are non-fatal. */}}
}
