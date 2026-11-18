export type ArtworkWorkerFont=Readonly<{family:string;data:Blob}>;

/** Each artwork worker holds at most four imported faces. Failed loads are
 * discarded so a later request can retry; eviction releases the FontFaceSet. */
export class ArtworkWorkerFonts {
 private loaded=new Map<string,FontFace>();
 async ensure(source:ArtworkWorkerFont,fonts:FontFaceSet):Promise<void>{
   if(!source.family.startsWith('IllustroFont-')||!source.data.size||source.data.size>24*1024*1024)
     throw Error('描画用フォントのデータが正しくありません。');
   const existing=this.loaded.get(source.family);
   if(existing){this.loaded.delete(source.family);this.loaded.set(source.family,existing);return;}
   const face=await new FontFace(source.family,await source.data.arrayBuffer()).load();
   fonts.add(face);this.loaded.set(source.family,face);
   while(this.loaded.size>4){
     const oldest=this.loaded.keys().next().value!;
     fonts.delete(this.loaded.get(oldest)!);this.loaded.delete(oldest);
   }
 }
}
