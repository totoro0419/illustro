/** C06 screen-space selection preview. Samples the real mask at visible zoom. */
import type {BrushSurface} from '../brushSurface';
import type {MaskData} from './mask';

export class SelectionOverlay{
  private readonly canvas:HTMLCanvasElement;
  private readonly ctx:CanvasRenderingContext2D|null;
  private mask:MaskData|null=null;
  private visible=true;
  private frame=0;
  private image:ImageData|null=null;
  private readonly resize=()=>this.updateView();

  constructor(private readonly viewport:HTMLElement,private readonly surface:()=>BrushSurface|null){
    this.canvas=document.createElement('canvas');
    this.canvas.className='c06-mask-preview';
    this.canvas.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:6;';
    this.canvas.hidden=true;
    viewport.append(this.canvas);
    this.ctx=this.canvas.getContext('2d',{alpha:true});
    window.addEventListener('resize',this.resize);
  }
  setVisible(visible:boolean){
    this.visible=visible;
    this.canvas.hidden=!visible||!this.mask;
    if(visible)this.updateView();
  }
  set(mask:MaskData|null){
    this.mask=mask;
    this.canvas.hidden=!this.visible||!mask;
    this.updateView();
  }
  updateView(){
    if(this.frame||!this.visible||!this.mask||!this.ctx||this.canvas.hidden)return;
    // One repaint per display frame, no full-artwork mask scaling or GPU readback.
    this.frame=requestAnimationFrame(()=>{this.frame=0;this.render();});
  }
  private render(){
    const drawing=this.surface(),mask=this.mask,ctx=this.ctx;
    if(!drawing||!mask||!ctx||this.canvas.hidden)return;
    const cssWidth=this.viewport.clientWidth,cssHeight=this.viewport.clientHeight;
    if(cssWidth<=0||cssHeight<=0)return;
    // The displayed canvas (not the whole 4000px artwork) determines work.
    // At a 1:1 zoom this retains individual artwork pixels.
    const width=Math.max(1,Math.ceil(cssWidth)),height=Math.max(1,Math.ceil(cssHeight));
    if(this.canvas.width!==width||this.canvas.height!==height||!this.image){
      this.canvas.width=width;this.canvas.height=height;
      this.image=ctx.createImageData(width,height);
    }else this.image.data.fill(0);
    const data=this.image.data;
    const o=drawing.screenToDocument({x:0,y:0});
    const right=drawing.screenToDocument({x:cssWidth,y:0});
    const down=drawing.screenToDocument({x:0,y:cssHeight});
    const stepXx=(right.x-o.x)/width,stepXy=(right.y-o.y)/width;
    const stepYx=(down.x-o.x)/height,stepYy=(down.y-o.y)/height;
    for(let y=0;y<height;y++){
      let sx=o.x+(y+.5)*stepYx+.5*stepXx;
      let sy=o.y+(y+.5)*stepYy+.5*stepXy;
      for(let x=0;x<width;x++,sx+=stepXx,sy+=stepXy){
        const px=Math.floor(sx),py=Math.floor(sy);
        if(px<0||py<0||px>=mask.width||py>=mask.height)continue;
        const index=py*mask.width+px,alpha=mask.alpha[index]!;
        if(!alpha)continue;
        const border=(px>0&&mask.alpha[index-1]!<alpha/2)||
          (px+1<mask.width&&mask.alpha[index+1]!<alpha/2)||
          (py>0&&mask.alpha[index-mask.width]!<alpha/2)||
          (py+1<mask.height&&mask.alpha[index+mask.width]!<alpha/2);
        const at=(y*width+x)*4;
        data[at]=38;data[at+1]=164;data[at+2]=214;
        data[at+3]=Math.round(alpha*(border?.7:.13));
      }
    }
    ctx.putImageData(this.image,0,0);
  }
  destroy(){
    if(this.frame)cancelAnimationFrame(this.frame);
    window.removeEventListener('resize',this.resize);
    this.canvas.remove();this.image=null;this.mask=null;
  }
}
