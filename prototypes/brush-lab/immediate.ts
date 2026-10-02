import {
  C,
  STRIDE,
  type Preset,
  type Mask,
  type Tip,
} from "../../packages/brush/src/types";
import { dabBounds } from "../../packages/brush/src/coverage";

const vertex = `#version 300 es
void main(){ vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2); gl_Position=vec4(p*2.-1.,0,1); }`;
const deposit = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D src, maskImage, grainImage;
uniform vec4 geometry, ink, pigment, rotation;
uniform vec4 style, grainStyle;
uniform ivec3 kinds;
out vec4 result;
float sat(float x){return clamp(x,0.,1.);}
float img(sampler2D t,vec2 uv,bool repeatImage){
 if(repeatImage) uv=fract(uv);
 else if(any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1)))) return 0.;
 ivec2 sz=textureSize(t,0);return texelFetch(t,min(sz-1,ivec2(floor(uv*vec2(sz)))),0).r;
}
float shape(int kind,vec2 xy,vec2 r){
 if(kind==0 && r.x*r.y<.08) return 0.;
 if(kind==2 || kind==3){
  float a=sat(.5-max(abs(xy.x)-r.x,abs(xy.y)-r.y));
  if(kind==3) a*=.3+.7*pow(abs(sin(xy.y/max(.35,r.y/max(1.,style.y))*3.141592653589793)),.5);
  return a;
 }
 if(kind==0 && r.x==r.y){
  float dist=length(xy),hard=r.x*style.x;
  if(dist<=hard)return 1.;
  return style.x==1.?sat(r.x+.5-dist):sat((r.x+.5-dist)/max(.5,r.x-hard));
 }
 float sum=0.;
 for(int x=0;x<2;x++)for(int y=0;y<2;y++){
  vec2 uv=(xy+vec2(float(x)*.5-.25,float(y)*.5-.25))/r;
  float d=length(uv);
  if(kind==6)sum+=img(maskImage,uv/2.+.5,false);
  else if(kind==0||kind==1)sum+=d<1.?(style.x==1.?1.:sat((1.-d)/max(.001,1.-style.x))):0.;
  else if(kind==4)sum+=d<.65+.35*cos(atan(uv.y,uv.x)*5.)?1.:0.;
  else if(kind==5)sum+=abs(uv.y)<sqrt(max(0.,1.-uv.x*uv.x))*(1.-abs(uv.x)*.7)?1.:0.;
 }
 return sum/4.;
}
void main(){
 ivec2 pos=ivec2(gl_FragCoord.xy);vec2 xy=gl_FragCoord.xy,delta=xy-geometry.xy;
 vec4 old=texelFetch(src,pos,0);
 if(old.a>=ink.x){result=old;return;}
 vec2 local=vec2(dot(delta,rotation.xy),dot(delta,vec2(-rotation.y,rotation.x)));
 vec2 r=geometry.zw*.5;
 float f=(kinds.x==0 && r.x*r.y<.08)?max(0.,1.-abs(delta.x))*max(0.,1.-abs(delta.y))*min(1.,3.141592653589793*r.x*r.y):shape(kinds.x,local,r);
 if(kinds.y>=0)f*=shape(kinds.y,local,vec2(r.x,r.x*style.z));
 if(ink.z>0. && f>0.){
  vec2 g=vec2(dot(xy,rotation.zw),dot(xy,vec2(-rotation.w,rotation.z)))/grainStyle.x;
  float tex;
  if(kinds.z==3)tex=img(grainImage,g,true);
  else if(kinds.z==1)tex=.15+.85*pow(abs(sin((g.x+g.y)*3.141592653589793)),.7);
  else{
   uint hash=(uint(int(floor(g.x))*73856093)^uint(int(floor(g.y))*19349663))*83492791u;
   tex=float(hash)/4294967295.;if(kinds.z==0)tex=.25+.75*tex;
  }
  f*=1.-ink.z+ink.z*tex;
 }
 float a=max(0.,ink.x-old.a)*sat(f)*ink.y;
 result=old+vec4(pigment.rgb,1.)*a;
}`;
const composite = `#version 300 es
precision highp float;
uniform sampler2D base, stroke;
uniform int mode, flip;
uniform float height;
out vec4 result;
void main(){
 ivec2 pos=ivec2(gl_FragCoord.xy);if(flip==1)pos.y=int(height)-1-pos.y;
 vec4 d=texelFetch(base,pos,0),s=texelFetch(stroke,pos,0);
 if(s.a==0.){result=d;return;}
 if(mode==3){float a=floor(d.a*(1.-s.a)*255.+.5)/255.;result=a==0.?vec4(0):vec4(d.rgb,a);return;}
 vec3 sc=s.rgb/s.a,b=sc;
 if(mode==1)b=sc*d.rgb;else if(mode==2)b=1.-(1.-sc)*(1.-d.rgb);
 float a=s.a+d.a*(1.-s.a);
 vec3 c=((1.-s.a)*d.a*d.rgb+(1.-d.a)*s.a*sc+s.a*d.a*b)/a;
 result=floor(clamp(vec4(c,a),0.,1.)*255.+.5)/255.;
}`;
const tip = (t?: Tip) =>
  t === undefined
    ? -1
    : ["round", "ellipse", "rect", "bristle", "star", "leaf", "mask"].indexOf(
        t,
      );
type Surface = { texture: WebGLTexture; framebuffer: WebGLFramebuffer };
/** Input-time presentation. Never waits for the reference raster or a later animation frame. */
export class ImmediateRenderer {
  readonly gl: WebGL2RenderingContext;
  private inkProgram: WebGLProgram;
  private compositeProgram: WebGLProgram;
  private prefix: Surface;
  private preview: Surface;
  private scratch: Surface;
  private base: Surface;
  private nextBase: Surface;
  private mask: WebGLTexture;
  private grain: WebGLTexture;
  private preset!: Preset;
  presentations = 0;
  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      desynchronized: true,
    });
    if (!gl || !gl.getExtension("EXT_color_buffer_float"))
      throw new Error("Float WebGL2 unavailable");
    this.gl = gl;
    this.inkProgram = this.program(deposit);
    this.compositeProgram = this.program(composite);
    this.prefix = this.surface(true);
    this.preview = this.surface(true);
    this.scratch = this.surface(true);
    this.base = this.surface(false);
    this.nextBase = this.surface(false);
    this.mask = this.maskTexture();
    this.grain = this.maskTexture();
    for (const s of [
      this.prefix,
      this.preview,
      this.scratch,
      this.base,
      this.nextBase,
    ])
      this.clear(s);
    this.show(this.preview);
  }
  private program(source: string) {
    const g = this.gl,
      p = g.createProgram()!;
    for (const [type, text] of [
      [g.VERTEX_SHADER, vertex],
      [g.FRAGMENT_SHADER, source],
    ] as const) {
      const s = g.createShader(type)!;
      g.shaderSource(s, text);
      g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS))
        throw new Error(g.getShaderInfoLog(s) ?? "shader compile");
      g.attachShader(p, s);
      g.deleteShader(s);
    }
    g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS))
      throw new Error(g.getProgramInfoLog(p) ?? "shader link");
    return p;
  }
  private surface(float: boolean): Surface {
    const g = this.gl,
      t = g.createTexture()!,
      f = g.createFramebuffer()!;
    g.bindTexture(g.TEXTURE_2D, t);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    g.texStorage2D(
      g.TEXTURE_2D,
      1,
      float ? g.RGBA32F : g.RGBA8,
      this.canvas.width,
      this.canvas.height,
    );
    g.bindFramebuffer(g.FRAMEBUFFER, f);
    g.framebufferTexture2D(
      g.FRAMEBUFFER,
      g.COLOR_ATTACHMENT0,
      g.TEXTURE_2D,
      t,
      0,
    );
    if (g.checkFramebufferStatus(g.FRAMEBUFFER) !== g.FRAMEBUFFER_COMPLETE)
      throw new Error("Incomplete immediate framebuffer");
    return { texture: t, framebuffer: f };
  }
  private maskTexture() {
    const g = this.gl,
      t = g.createTexture()!;
    g.bindTexture(g.TEXTURE_2D, t);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    return t;
  }
  private uploadMask(t: WebGLTexture, m?: Mask) {
    const g = this.gl;
    g.bindTexture(g.TEXTURE_2D, t);
    g.texImage2D(
      g.TEXTURE_2D,
      0,
      g.R32F,
      m?.width ?? 1,
      m?.height ?? 1,
      0,
      g.RED,
      g.FLOAT,
      new Float32Array(m?.alpha ?? [1]),
    );
  }
  private clear(s: Surface) {
    const g = this.gl;
    g.disable(g.SCISSOR_TEST);
    g.bindFramebuffer(g.FRAMEBUFFER, s.framebuffer);
    g.clearColor(0, 0, 0, 0);
    g.clear(g.COLOR_BUFFER_BIT);
  }
  private copy(a: Surface, b: Surface) {
    const g = this.gl,
      w = this.canvas.width,
      h = this.canvas.height;
    g.disable(g.SCISSOR_TEST);
    g.bindFramebuffer(g.READ_FRAMEBUFFER, a.framebuffer);
    g.bindFramebuffer(g.DRAW_FRAMEBUFFER, b.framebuffer);
    g.blitFramebuffer(0, 0, w, h, 0, 0, w, h, g.COLOR_BUFFER_BIT, g.NEAREST);
  }
  private sampler(
    p: WebGLProgram,
    name: string,
    t: WebGLTexture,
    unit: number,
  ) {
    const g = this.gl;
    g.activeTexture(g.TEXTURE0 + unit);
    g.bindTexture(g.TEXTURE_2D, t);
    g.uniform1i(g.getUniformLocation(p, name), unit);
  }
  begin(p: Preset) {
    this.preset = p;
    this.clear(this.prefix);
    this.clear(this.preview);
    this.uploadMask(this.mask, p.mask);
    this.uploadMask(this.grain, p.texture);
  }
  append(data: ArrayLike<number>) {
    this.draw(this.prefix, data);
  }
  present(data: ArrayLike<number>) {
    this.copy(this.prefix, this.preview);
    this.draw(this.preview, data);
    this.show(this.preview);
    this.presentations++;
    this.gl.flush();
  }
  private draw(target: Surface, data: ArrayLike<number>) {
    const g = this.gl,
      p = this.preset,
      program = this.inkProgram;
    g.useProgram(program);
    g.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.sampler(program, "src", target.texture, 0);
    this.sampler(program, "maskImage", this.mask, 1);
    this.sampler(program, "grainImage", this.grain, 2);
    g.uniform4f(
      g.getUniformLocation(program, "style"),
      p.hardness,
      p.bristles,
      p.dualAspect ?? p.aspect,
      0,
    );
    g.uniform4f(
      g.getUniformLocation(program, "grainStyle"),
      p.grainScale,
      0,
      0,
      0,
    );
    g.uniform3i(
      g.getUniformLocation(program, "kinds"),
      tip(p.tip),
      tip(p.dual),
      ["paper", "hatch", "noise", "image"].indexOf(p.grainKind),
    );
    g.enable(g.SCISSOR_TEST);
    for (let o = 0; o < data.length; o += STRIDE) {
      const b = dabBounds(data, o, p),
        x = Math.max(0, b.x0),
        y = Math.max(0, b.y0),
        w = Math.min(this.canvas.width, b.x1) - x,
        h = Math.min(this.canvas.height, b.y1) - y;
      if (w <= 0 || h <= 0) continue;
      const a = data[o + C.ANGLE]!,
        c = Math.cos(a),
        s = Math.sin(a);
      g.uniform4f(
        g.getUniformLocation(program, "geometry"),
        data[o + C.X]!,
        data[o + C.Y]!,
        data[o + C.SIZE]!,
        data[o + C.SIZE]! * data[o + C.ASPECT]!,
      );
      g.uniform4f(
        g.getUniformLocation(program, "ink"),
        data[o + C.OPACITY]!,
        data[o + C.FLOW]!,
        data[o + C.GRAIN]!,
        0,
      );
      g.uniform4f(
        g.getUniformLocation(program, "pigment"),
        data[o + C.R]!,
        data[o + C.G]!,
        data[o + C.B]!,
        0,
      );
      g.uniform4f(
        g.getUniformLocation(program, "rotation"),
        c,
        s,
        Math.cos(p.grainRotation),
        Math.sin(p.grainRotation),
      );
      g.bindFramebuffer(g.FRAMEBUFFER, this.scratch.framebuffer);
      g.scissor(x, y, w, h);
      g.drawArrays(g.TRIANGLES, 0, 3);
      g.activeTexture(g.TEXTURE0);
      g.bindTexture(g.TEXTURE_2D, target.texture);
      g.copyTexSubImage2D(g.TEXTURE_2D, 0, x, y, x, y, w, h);
    }
    g.disable(g.SCISSOR_TEST);
  }
  private show(stroke: Surface, destination?: Surface) {
    const g = this.gl,
      p = this.compositeProgram;
    g.disable(g.SCISSOR_TEST);
    g.bindFramebuffer(g.FRAMEBUFFER, destination?.framebuffer ?? null);
    g.viewport(0, 0, this.canvas.width, this.canvas.height);
    g.useProgram(p);
    this.sampler(p, "base", this.base.texture, 0);
    this.sampler(p, "stroke", stroke.texture, 1);
    g.uniform1i(
      g.getUniformLocation(p, "mode"),
      ["normal", "multiply", "screen", "erase"].indexOf(
        this.preset?.blend ?? "normal",
      ),
    );
    g.uniform1i(g.getUniformLocation(p, "flip"), destination ? 0 : 1);
    g.uniform1f(g.getUniformLocation(p, "height"), this.canvas.height);
    g.drawArrays(g.TRIANGLES, 0, 3);
  }
  finish() {
    this.show(this.prefix, this.nextBase);
    [this.base, this.nextBase] = [this.nextBase, this.base];
    this.clear(this.prefix);
    this.clear(this.preview);
    this.show(this.preview);
    this.presentations++;
    this.gl.flush();
  }
  cancel() {
    this.clear(this.prefix);
    this.clear(this.preview);
    this.show(this.preview);
    this.gl.flush();
  }
  setBase(bytes: Uint8ClampedArray) {
    const g = this.gl;
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, this.base.texture);
    g.texSubImage2D(
      g.TEXTURE_2D,
      0,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
      g.RGBA,
      g.UNSIGNED_BYTE,
      bytes,
    );
    this.cancel();
  }
  /** Test-only readback; never used in the drawing handler. */
  readPixels() {
    const g = this.gl,
      w = this.canvas.width,
      h = this.canvas.height,
      out = new Uint8Array(w * h * 4),
      bytes = new Uint8ClampedArray(out.length);
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, out);
    for (let y = 0; y < h; y++)
      bytes.set(out.subarray(y * w * 4, (y + 1) * w * 4), (h - 1 - y) * w * 4);
    return bytes;
  }
}
