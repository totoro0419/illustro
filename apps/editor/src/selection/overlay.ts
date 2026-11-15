/** C06 view-only selection density preview. Never touches source raster pixels. */
import type {BrushSurface} from '../brushSurface';
import type {MaskData} from './mask';
export class SelectionOverlay{
  private canvas:HTMLCanvasElement;
  private mask:MaskData|null=null;
  private visible=true;
  setVisible(visible:boolean){this.visible=visible;this.canvas.hidden=!visible||!this.mask;}
  private ctx:CanvasRenderingContext2D|null;
  constructor(private viewport:HTMLElement,private surface:()=>BrushSurface|null){
    this.canvas=document.createElement('canvas');
    this.canvas.className='c06-mask-preview';
    this.canvas.style.cssText='position:absolute;left:0;top:0;pointer-events:none;transform-origin:0 0;z-index:6;';
    this.canvas.hidden=true;
    viewport.append(this.canvas);
    this.ctx=this.canvas.getContext('2d');
    window.addEventListener('resize',()=>this.updateView());
  }
  set(mask:MaskData|null){
    this.mask=mask;
    if(!mask){this.canvas.hidden=true;return;}
    const scale=Math.min(1,640/Math.max(mask.width,mask.height));
    const w=Math.max(1,Math.round(mask.width*scale)),h=Math.max(1,Math.round(mask.height*scale));
    this.canvas.width=w;this.canvas.height=h;
    const ctx=this.ctx;if(!ctx)return;
    const image=ctx.createImageData(w,h),values=image.data;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const px=Math.min(mask.width-1,Math.floor((x+.5)*mask.width/w)),
        py=Math.min(mask.height-1,Math.floor((y+.5)*mask.height/h));
      const alpha=mask.alpha[py*mask.width+px]??0,i=(y*w+x)*4;
      if(!alpha)continue;
      const border=
        (mask.alpha[py*mask.width+Math.max(0,px-1)]??0)<alpha/2||
        (mask.alpha[py*mask.width+Math.min(mask.width-1,px+1)]??0)<alpha/2||
        (mask.alpha[Math.max(0,py-1)*mask.width+px]??0)<alpha/2||
        (mask.alpha[Math.min(mask.height-1,py+1)*mask.width+px]??0)<alpha/2;
      values[i]=38;values[i+1]=164;values[i+2]=214;
      values[i+3]=Math.round(alpha*(border?.7:.13));
    }
    ctx.putImageData(image,0,0);
    this.canvas.hidden=!this.visible;
    this.updateView();
  }
  updateView(){
    const drawing=this.surface(),mask=this.mask;
    if(!drawing||!mask||this.canvas.hidden)return;
    const origin=drawing.documentToScreen({x:0,y:0}),
      right=drawing.documentToScreen({x:mask.width,y:0}),
      down=drawing.documentToScreen({x:0,y:mask.height}),
      w=this.canvas.width,h=this.canvas.height;
    const a=(right.x-origin.x)/w,b=(right.y-origin.y)/w,
      c=(down.x-origin.x)/h,d=(down.y-origin.y)/h;
    this.canvas.style.transform='matrix('+[a,b,c,d,origin.x,origin.y].join(',')+')';
  }
  destroy(){this.canvas.remove();}
}
