/** M08: view-only geometry. Coordinates remain in document pixels. */
export type Point=Readonly<{x:number;y:number}>;
export type ViewState=Readonly<{documentWidth:number;documentHeight:number;cssWidth:number;cssHeight:number;zoom:number;rotation:number;panX:number;panY:number;flipX:boolean;flipY:boolean}>;
export class CanvasView {
 readonly documentWidth:number;readonly documentHeight:number;
 cssWidth=1;cssHeight=1;zoom=1;rotation=0;panX=0;panY=0;flipX=false;flipY=false;
 private fitted=false;
 constructor(width:number,height:number){if(!(width>0&&height>0))throw new Error('Invalid canvas size');this.documentWidth=width;this.documentHeight=height;}
 get state():ViewState{return {documentWidth:this.documentWidth,documentHeight:this.documentHeight,cssWidth:this.cssWidth,cssHeight:this.cssHeight,zoom:this.zoom,rotation:this.rotation,panX:this.panX,panY:this.panY,flipX:this.flipX,flipY:this.flipY};}
 resize(width:number,height:number){if(!(width>0&&height>0))return;this.cssWidth=width;this.cssHeight=height;if(!this.fitted){this.fit();this.fitted=true;}}
 fit(){const c=Math.abs(Math.cos(this.rotation)),s=Math.abs(Math.sin(this.rotation));const w=this.documentWidth*c+this.documentHeight*s,h=this.documentWidth*s+this.documentHeight*c;this.zoom=Math.max(0.001,Math.min(this.cssWidth/w,this.cssHeight/h));this.panX=0;this.panY=0;}
 screen(point:Point):Point{let x=(point.x-this.documentWidth/2)*(this.flipX?-1:1),y=(point.y-this.documentHeight/2)*(this.flipY?-1:1);const c=Math.cos(this.rotation),s=Math.sin(this.rotation);return {x:this.cssWidth/2+this.panX+(x*c-y*s)*this.zoom,y:this.cssHeight/2+this.panY+(x*s+y*c)*this.zoom};}
 document(point:Point):Point{const x=(point.x-this.cssWidth/2-this.panX)/this.zoom,y=(point.y-this.cssHeight/2-this.panY)/this.zoom,c=Math.cos(this.rotation),s=Math.sin(this.rotation);return {x:this.documentWidth/2+(x*c+y*s)*(this.flipX?-1:1),y:this.documentHeight/2+(-x*s+y*c)*(this.flipY?-1:1)};}
 pan(dx:number,dy:number){if(!Number.isFinite(dx+dy))return;this.panX+=dx;this.panY+=dy;}
 private anchor(point:Point,desired:Point){const actual=this.screen(point);this.pan(desired.x-actual.x,desired.y-actual.y);}
 zoomAt(factor:number,center:Point){if(!Number.isFinite(factor)||factor<=0)return;const d=this.document(center);this.zoom=Math.max(0.01,Math.min(64,this.zoom*factor));this.anchor(d,center);}
 rotateAt(delta:number,center:Point){if(!Number.isFinite(delta))return;const d=this.document(center);this.rotation=(this.rotation+delta)%(2*Math.PI);this.anchor(d,center);}
 setZoom(zoom:number,center:Point={x:this.cssWidth/2,y:this.cssHeight/2}){if(zoom>0&&Number.isFinite(zoom))this.zoomAt(zoom/this.zoom,center);}
 setRotation(angle:number){if(!Number.isFinite(angle))return;const center={x:this.cssWidth/2,y:this.cssHeight/2},d=this.document(center);this.rotation=angle;this.anchor(d,center);}
 toggleFlip(axis:'x'|'y'){if(axis==='x')this.flipX=!this.flipX;else this.flipY=!this.flipY;}
 /** Packing shared by WebGPU and WebGL2: three aligned vec4 values. */
 uniform(backingWidth:number,backingHeight:number):Float32Array{return new Float32Array([backingWidth,backingHeight,this.cssWidth,this.cssHeight,this.documentWidth,this.documentHeight,this.zoom,this.rotation,this.panX,this.panY,this.flipX?-1:1,this.flipY?-1:1]);}
}
