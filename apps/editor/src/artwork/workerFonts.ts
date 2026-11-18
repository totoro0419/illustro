export type ArtworkWorkerFont=Readonly<{family:string;data:Blob}>;

/** Each artwork worker holds at most four imported faces. Failed loads are
 * discarded so a later request can retry; eviction releases the FontFaceSet. */
export class ArtworkWorkerFonts {
 private loaded=new Map<string,FontFace>();
 private pinned=new Set<string>();
 private trim(fonts:FontFaceSet){
   for(const [family,face] of this.loaded){
     if(this.loaded.size<=4)break;
     if(this.pinned.has(family))continue;
     fonts.delete(face);this.loaded.delete(family);
   }
 }
 async withFonts<T>(sources:readonly ArtworkWorkerFont[],fonts:FontFaceSet,render:()=>T):Promise<T>{
   this.pinned=new Set(sources.map(source=>source.family));
   try{for(const source of sources)await this.ensure(source,fonts);return render();}
   finally{this.pinned.clear();this.trim(fonts);}
 }
 async ensure(source:ArtworkWorkerFont,fonts:FontFaceSet):Promise<void>{
   if(!source.family.startsWith('IllustroFont-')||!source.data.size||source.data.size>24*1024*1024)
     throw Error('描画用フォントのデータが正しくありません。');
   const existing=this.loaded.get(source.family);
   if(existing){this.loaded.delete(source.family);this.loaded.set(source.family,existing);return;}
   const face=await new FontFace(source.family,await source.data.arrayBuffer()).load();
   fonts.add(face);this.loaded.set(source.family,face);
   this.trim(fonts);
 }
}
