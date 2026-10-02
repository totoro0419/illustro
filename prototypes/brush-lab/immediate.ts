import {
  C,
  STRIDE,
  type Preset,
  type Mask,
  type Tip,
} from "../../packages/brush/src/types";
import { dabBounds, type Bounds } from "../../packages/brush/src/coverage";

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
// Constant pigment/opacity deposits are the same recurrence as fixed-function blending.
// Instanced footprint quads keep brush geometry resident for the whole input batch.
const stampVertex = `#version 300 es
layout(location=0) in vec4 stampGeometry;
layout(location=1) in vec4 stampInk;
layout(location=2) in vec4 stampPigment;
layout(location=3) in vec4 stampRotation;
layout(location=4) in vec4 bounds;
uniform vec2 extent;
flat out vec4 geometry, ink, pigment, rotation;
void main(){
 vec2 corner=vec2((gl_VertexID==1||gl_VertexID==2||gl_VertexID==4)?1.:0.,(gl_VertexID==2||gl_VertexID==4||gl_VertexID==5)?1.:0.);
 vec2 p=mix(bounds.xy,bounds.zw,corner);
 gl_Position=vec4(p/extent*2.-1.,0,1);
 geometry=stampGeometry;ink=stampInk;pigment=stampPigment;rotation=stampRotation;
}`;
const blendedDeposit = deposit
  .replace(
    "uniform vec4 geometry, ink, pigment, rotation;",
    "flat in vec4 geometry, ink, pigment, rotation;",
  )
  .replace(
    " vec4 old=texelFetch(src,pos,0);\n if(old.a>=ink.x){result=old;return;}",
    "",
  )
  .replace(
    " float a=max(0.,ink.x-old.a)*sat(f)*ink.y;\n result=old+vec4(pigment.rgb,1.)*a;",
    " float k=sat(f)*ink.y;\n result=vec4(ink.x*k,0.,0.,k);",
  );
const union = (a?: Bounds, b?: Bounds): Bounds | undefined =>
  !a
    ? b
    : !b
      ? a
      : {
          x0: Math.min(a.x0, b.x0),
          y0: Math.min(a.y0, b.y0),
          x1: Math.max(a.x1, b.x1),
          y1: Math.max(a.y1, b.y1),
        };
const composite = `#version 300 es
precision highp float;
uniform sampler2D base, stroke;
uniform int mode, flip, alphaOnly;
uniform vec3 color;
uniform float height;
out vec4 result;
void main(){
 ivec2 pos=ivec2(gl_FragCoord.xy);if(flip==1)pos.y=int(height)-1-pos.y;
 vec4 d=texelFetch(base,pos,0),s=texelFetch(stroke,pos,0);
 if(alphaOnly==1)s=vec4(color*s.r,s.r);
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
  private uniforms = new WeakMap<
    WebGLProgram,
    Map<string, WebGLUniformLocation | null>
  >();
  private inkProgram: WebGLProgram;
  private compositeProgram: WebGLProgram;
  private stampProgram: WebGLProgram;
  private stampVAO: WebGLVertexArrayObject;
  private stampBuffer: WebGLBuffer;
  private stampData = new Float32Array(0);
  private fastBlend = false;
  private dirty: Bounds | undefined;
  private oldTail: Bounds | undefined;
  private colorPrefix: Surface;
  private colorPreview: Surface;
  private alphaPrefix: Surface;
  private alphaPreview: Surface;
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
    this.stampProgram = this.program(blendedDeposit, stampVertex);
    this.stampVAO = gl.createVertexArray()!;
    this.stampBuffer = gl.createBuffer()!;
    gl.bindVertexArray(this.stampVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.stampBuffer);
    for (let i = 0; i < 5; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 80, i * 16);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bindVertexArray(null);
    this.colorPrefix = this.surface(true);
    this.colorPreview = this.surface(true);
    this.alphaPrefix = this.surface(true, true);
    this.alphaPreview = this.surface(true, true);
    this.prefix = this.colorPrefix;
    this.preview = this.colorPreview;
    this.scratch = this.surface(true);
    this.base = this.surface(false);
    this.nextBase = this.surface(false);
    this.mask = this.maskTexture();
    this.grain = this.maskTexture();
    for (const s of [
      this.prefix,
      this.preview,
      this.alphaPrefix,
      this.alphaPreview,
      this.scratch,
      this.base,
      this.nextBase,
    ])
      this.clear(s);
    this.show(this.preview);
  }
  private program(source: string, vertexSource = vertex) {
    const g = this.gl,
      p = g.createProgram()!;
    for (const [type, text] of [
      [g.VERTEX_SHADER, vertexSource],
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
    this.uniforms.set(
      p,
      new Map(
        [
          "src",
          "maskImage",
          "grainImage",
          "geometry",
          "ink",
          "pigment",
          "rotation",
          "style",
          "grainStyle",
          "kinds",
          "extent",
          "base",
          "stroke",
          "mode",
          "flip",
          "height",
          "alphaOnly",
          "color",
        ].map((name) => [name, g.getUniformLocation(p, name)]),
      ),
    );
    return p;
  }
  private uniform(p: WebGLProgram, name: string) {
    return this.uniforms.get(p)!.get(name) ?? null;
  }
  private surface(float: boolean, alphaOnly = false): Surface {
    const g = this.gl,
      t = g.createTexture()!,
      f = g.createFramebuffer()!;
    g.bindTexture(g.TEXTURE_2D, t);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    g.texStorage2D(
      g.TEXTURE_2D,
      1,
      float ? (alphaOnly ? g.R32F : g.RGBA32F) : g.RGBA8,
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
  private copy(a: Surface, b: Surface, bounds: Bounds) {
    const g = this.gl,
      { x0, y0, x1, y1 } = bounds;
    g.disable(g.SCISSOR_TEST);
    g.bindFramebuffer(g.READ_FRAMEBUFFER, a.framebuffer);
    g.bindFramebuffer(g.DRAW_FRAMEBUFFER, b.framebuffer);
    g.blitFramebuffer(
      x0,
      y0,
      x1,
      y1,
      x0,
      y0,
      x1,
      y1,
      g.COLOR_BUFFER_BIT,
      g.NEAREST,
    );
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
    g.uniform1i(this.uniform(p, name), unit);
  }
  begin(p: Preset) {
    this.preset = p;
    this.dirty = this.oldTail = undefined;
    this.fastBlend =
      !!this.gl.getExtension("EXT_float_blend") &&
      p.opacityJitter === 0 &&
      p.hueJitter === 0 &&
      !p.mappings.some((m) =>
        ["opacity", "hue", "saturation", "value"].includes(m.target),
      );
    // A constant-color stroke needs one float channel for coverage, not four.
    this.prefix = this.fastBlend ? this.alphaPrefix : this.colorPrefix;
    this.preview = this.fastBlend ? this.alphaPreview : this.colorPreview;
    this.clear(this.prefix);
    this.clear(this.preview);
    this.uploadMask(this.mask, p.mask);
    this.uploadMask(this.grain, p.texture);
  }
  append(data: ArrayLike<number>) {
    this.dirty = union(this.dirty, this.bounds(data));
    this.draw(this.prefix, data);
  }
  private bounds(data: ArrayLike<number>) {
    let result: Bounds | undefined;
    for (let o = 0; o < data.length; o += STRIDE) {
      const b = dabBounds(data, o, this.preset);
      const clipped = {
        x0: Math.max(0, b.x0),
        y0: Math.max(0, b.y0),
        x1: Math.min(this.canvas.width, b.x1),
        y1: Math.min(this.canvas.height, b.y1),
      };
      if (clipped.x1 > clipped.x0 && clipped.y1 > clipped.y0)
        result = union(result, clipped);
    }
    return result;
  }
  present(data: ArrayLike<number>) {
    const tail = this.bounds(data),
      changed = union(union(this.dirty, this.oldTail), tail);
    if (changed) {
      this.copy(this.prefix, this.preview, changed);
      this.draw(this.preview, data);
      this.show(this.preview, undefined, changed);
    }
    this.dirty = undefined;
    this.oldTail = tail;
    this.presentations++;
    this.gl.flush();
  }
  private draw(target: Surface, data: ArrayLike<number>) {
    const g = this.gl,
      p = this.preset,
      program = this.fastBlend ? this.stampProgram : this.inkProgram;
    g.useProgram(program);
    g.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.sampler(program, "src", target.texture, 0);
    this.sampler(program, "maskImage", this.mask, 1);
    this.sampler(program, "grainImage", this.grain, 2);
    g.uniform4f(
      this.uniform(program, "style"),
      p.hardness,
      p.bristles,
      p.dualAspect ?? p.aspect,
      0,
    );
    g.uniform4f(this.uniform(program, "grainStyle"), p.grainScale, 0, 0, 0);
    g.uniform3i(
      this.uniform(program, "kinds"),
      tip(p.tip),
      tip(p.dual),
      ["paper", "hatch", "noise", "image"].indexOf(p.grainKind),
    );
    if (this.fastBlend) {
      const count = data.length / STRIDE;
      if (!count) return;
      if (this.stampData.length < count * 20)
        this.stampData = new Float32Array(
          Math.max(count * 20, this.stampData.length * 2),
        );
      for (let o = 0, i = 0; o < data.length; o += STRIDE, i += 20) {
        const a = data[o + C.ANGLE]!,
          b = dabBounds(data, o, p);
        this.stampData.set(
          [
            data[o + C.X]!,
            data[o + C.Y]!,
            data[o + C.SIZE]!,
            data[o + C.SIZE]! * data[o + C.ASPECT]!,
            data[o + C.OPACITY]!,
            data[o + C.FLOW]!,
            data[o + C.GRAIN]!,
            0,
            data[o + C.R]!,
            data[o + C.G]!,
            data[o + C.B]!,
            0,
            Math.cos(a),
            Math.sin(a),
            Math.cos(p.grainRotation),
            Math.sin(p.grainRotation),
            b.x0,
            b.y0,
            b.x1,
            b.y1,
          ],
          i,
        );
      }
      g.bindFramebuffer(g.FRAMEBUFFER, target.framebuffer);
      // No framebuffer feedback: the instanced shader does not sample target.
      g.activeTexture(g.TEXTURE0);
      g.bindTexture(g.TEXTURE_2D, null);
      g.bindVertexArray(this.stampVAO);
      g.bindBuffer(g.ARRAY_BUFFER, this.stampBuffer);
      g.bufferData(
        g.ARRAY_BUFFER,
        this.stampData.subarray(0, count * 20),
        g.STREAM_DRAW,
      );
      g.uniform2f(
        this.uniform(program, "extent"),
        this.canvas.width,
        this.canvas.height,
      );
      g.disable(g.SCISSOR_TEST);
      g.enable(g.BLEND);
      g.blendColor(0, 0, 0, data[C.OPACITY]!);
      g.blendEquation(g.FUNC_ADD);
      g.blendFuncSeparate(
        g.ONE,
        g.ONE_MINUS_SRC_ALPHA,
        g.CONSTANT_ALPHA,
        g.ONE_MINUS_SRC_ALPHA,
      );
      g.drawArraysInstanced(g.TRIANGLES, 0, 6, count);
      g.disable(g.BLEND);
      g.bindVertexArray(null);
      return;
    }
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
        this.uniform(program, "geometry"),
        data[o + C.X]!,
        data[o + C.Y]!,
        data[o + C.SIZE]!,
        data[o + C.SIZE]! * data[o + C.ASPECT]!,
      );
      g.uniform4f(
        this.uniform(program, "ink"),
        data[o + C.OPACITY]!,
        data[o + C.FLOW]!,
        data[o + C.GRAIN]!,
        0,
      );
      g.uniform4f(
        this.uniform(program, "pigment"),
        data[o + C.R]!,
        data[o + C.G]!,
        data[o + C.B]!,
        0,
      );
      g.uniform4f(
        this.uniform(program, "rotation"),
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
  private show(stroke: Surface, destination?: Surface, bounds?: Bounds) {
    const g = this.gl,
      p = this.compositeProgram;
    if (bounds) {
      g.enable(g.SCISSOR_TEST);
      g.scissor(
        bounds.x0,
        destination ? bounds.y0 : this.canvas.height - bounds.y1,
        bounds.x1 - bounds.x0,
        bounds.y1 - bounds.y0,
      );
    } else g.disable(g.SCISSOR_TEST);
    g.bindFramebuffer(g.FRAMEBUFFER, destination?.framebuffer ?? null);
    g.viewport(0, 0, this.canvas.width, this.canvas.height);
    g.useProgram(p);
    this.sampler(p, "base", this.base.texture, 0);
    this.sampler(p, "stroke", stroke.texture, 1);
    g.uniform1i(
      this.uniform(p, "mode"),
      ["normal", "multiply", "screen", "erase"].indexOf(
        this.preset?.blend ?? "normal",
      ),
    );
    g.uniform1i(this.uniform(p, "flip"), destination ? 0 : 1);
    g.uniform1i(this.uniform(p, "alphaOnly"), this.fastBlend ? 1 : 0);
    g.uniform3fv(this.uniform(p, "color"), this.preset?.color ?? [0, 0, 0]);
    g.uniform1f(this.uniform(p, "height"), this.canvas.height);
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
