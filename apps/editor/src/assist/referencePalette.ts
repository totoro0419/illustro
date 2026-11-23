import type {RGB} from './analyze';

const distance=(a:RGB,b:RGB)=>.3*(a[0]-b[0])**2+.55*(a[1]-b[1])**2+.15*(a[2]-b[2])**2;

export function learnReferencePalette(rgba:Uint8ClampedArray,limit=6):RGB[]{
  const colors=new Map<number,{rgb:RGB;weight:number}>();
  for(let i=0;i<rgba.length;i+=4){
    if(rgba[i+3]!<96)continue;
    const rgb=[rgba[i]!,rgba[i+1]!,rgba[i+2]!] as const;
    const key=(rgb[0]>>3)*1024+(rgb[1]>>3)*32+(rgb[2]>>3);
    const sample=colors.get(key);
    if(sample)sample.weight++;
    else colors.set(key,{rgb,weight:1});
  }
  const samples=[...colors.values()].sort((a,b)=>b.weight-a.weight);
  if(!samples.length)return [];
  let centers=[samples[0]!.rgb];
  while(centers.length<Math.min(8,limit,samples.length)){
    let next:RGB|null=null,score=18;
    for(const {rgb,weight} of samples){
      const value=Math.min(...centers.map(center=>distance(rgb,center)))*Math.sqrt(weight);
      if(value>score){score=value;next=rgb;}
    }
    if(!next)break;
    centers.push(next);
  }
  for(let pass=0;pass<8;pass++){
    const totals=centers.map(()=>({r:0,g:0,b:0,weight:0}));
    for(const {rgb,weight} of samples){
      let at=0,closest=distance(rgb,centers[0]!);
      for(let c=1;c<centers.length;c++){
        const value=distance(rgb,centers[c]!);if(value<closest){at=c;closest=value;}
      }
      const total=totals[at]!;
      total.r+=rgb[0]*weight;total.g+=rgb[1]*weight;total.b+=rgb[2]*weight;total.weight+=weight;
    }
    centers=centers.map((rgb,index)=>{
      const {r,g,b,weight}=totals[index]!;
      return weight?[Math.round(r/weight),Math.round(g/weight),Math.round(b/weight)]:rgb;
    });
  }
  return centers;
}

export async function readReferencePalette(file:File){
  if(file.size>16*1024*1024||!['image/png','image/jpeg','image/webp','image/avif'].includes(file.type))
    throw Error('16MB以内のPNG、JPEG、WebP、AVIFを選んでください。');
  const image=await createImageBitmap(file);
  try{
    const scale=Math.min(1,96/Math.max(image.width,image.height));
    const width=Math.max(1,Math.round(scale*image.width)),height=Math.max(1,Math.round(scale*image.height));
    const canvas=Object.assign(document.createElement('canvas'),{width,height}),context=canvas.getContext('2d');
    if(!context)throw Error('資料画像を開けません。');
    context.drawImage(image,0,0,width,height);
    const colors=learnReferencePalette(context.getImageData(0,0,width,height).data);
    if(colors.length<2)throw Error('資料に異なる色が2色以上必要です。');
    return {name:'資料画像から抽出・'+file.name.slice(0,70),colors};
  }finally{image.close();}
}
