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
const proceduralDeposit = `#version 300 es
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
float documentGrain(vec2 xy){
  vec2 g=vec2(dot(xy,rotation.zw),dot(xy,vec2(-rotation.w,rotation.z)))/grainStyle.x;
  float tex;
  if(kinds.z==3)tex=img(grainImage,g,true);
  else if(kinds.z==1)tex=.15+.85*pow(abs(sin((g.x+g.y)*3.141592653589793)),.7);
  else{
   uint hash=(uint(int(floor(g.x))*73856093)^uint(int(floor(g.y))*19349663))*83492791u;
   tex=float(hash)/4294967295.;if(kinds.z==0)tex=.25+.75*tex;
  }
 return tex;
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
  f*=1.-ink.z+ink.z*documentGrain(xy);
 }
 float a=max(0.,ink.x-old.a)*sat(f)*ink.y;
 result=old+vec4(pigment.rgb,1.)*a;
}`;
// Document-space grain is prepared once instead of rehashed per input.
const grainCacheShader =
  proceduralDeposit.slice(0, proceduralDeposit.indexOf("void main(){")) +
  "void main(){result=vec4(documentGrain(gl_FragCoord.xy),0,0,0);}";
const deposit = proceduralDeposit
  .replace(
    "uniform sampler2D src, maskImage, grainImage;",
    "uniform sampler2D src, maskImage, grainImage, documentGrainImage;",
  )
  .replace(
    "ink.z*documentGrain(xy)",
    "ink.z*texelFetch(documentGrainImage,ivec2(xy),0).r",
  );
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
// A short mutable tail is evaluated directly into the visible canvas.
const direct = deposit
  .replace(
    "uniform ivec3 kinds;",
    "uniform ivec3 kinds; uniform int alphaOnly; uniform sampler2D base; uniform int mode; uniform vec3 color; uniform float height;",
  )
  .replace(
    "void main(){",
    `vec4 compose(vec4 s, ivec2 pos){
 vec4 d=texelFetch(base,pos,0);
 if(s.a==0.)return d;
 if(mode==3){float a=floor(d.a*(1.-s.a)*255.+.5)/255.;return a==0.?vec4(0):vec4(d.rgb,a);}
 vec3 sc=s.rgb/s.a,b=sc;
 if(mode==1)b=sc*d.rgb;else if(mode==2)b=1.-(1.-sc)*(1.-d.rgb);
 float a=s.a+d.a*(1.-s.a);
 vec3 c=((1.-s.a)*d.a*d.rgb+(1.-d.a)*s.a*sc+s.a*d.a*b)/a;
 return floor(clamp(vec4(c,a),0.,1.)*255.+.5)/255.;
}
void main(){`,
  )
  .replace(
    "ivec2 pos=ivec2(gl_FragCoord.xy);vec2 xy=gl_FragCoord.xy,delta=xy-geometry.xy;",
    "vec2 xy=vec2(gl_FragCoord.x,height-gl_FragCoord.y);ivec2 pos=ivec2(xy);vec2 delta=xy-geometry.xy;",
  )
  .replace(
    " vec4 old=texelFetch(src,pos,0);",
    " vec4 old=texelFetch(src,pos,0); if(alphaOnly==1)old=vec4(color*old.r,old.r);",
  )
  .replace(
    "if(old.a>=ink.x){result=old;return;}",
    "if(old.a>=ink.x){result=compose(old,pos);return;}",
  )
  .replace(
    " result=old+vec4(pigment.rgb,1.)*a;",
    " result=compose(old+vec4(pigment.rgb,1.)*a,pos);",
  );
const circleCoverage = `
float coverage(vec2 delta,float r){
 if(r*r<.08)return max(0.,1.-abs(delta.x))*max(0.,1.-abs(delta.y))*min(1.,3.141592653589793*r*r);
 float dist=length(delta);return dist<=r?1.:clamp(r+.5-dist,0.,1.);
}`;
const circleStamp = `#version 300 es
precision highp float;
flat in vec4 geometry,ink,pigment,rotation;
uniform sampler2D documentGrainImage;
out vec4 result;
${circleCoverage}
void main(){
 float f=coverage(gl_FragCoord.xy-geometry.xy,geometry.z*.5);
 if(ink.z>0.)f*=1.-ink.z+ink.z*texelFetch(documentGrainImage,ivec2(gl_FragCoord.xy),0).r;
 float k=clamp(f,0.,1.)*ink.y;
 result=vec4(ink.x*k,0,0,k);
}`;
const circleDirect = `#version 300 es
precision highp float;
uniform sampler2D src,base,documentGrainImage;
uniform vec4 geometry,ink;
uniform vec3 color;
uniform float height;
out vec4 result;
${circleCoverage}
void main(){
 vec2 xy=vec2(gl_FragCoord.x,height-gl_FragCoord.y);ivec2 pos=ivec2(xy);
 float old=texelFetch(src,pos,0).r;
 float f=coverage(xy-geometry.xy,geometry.z*.5);
 if(ink.z>0.)f*=1.-ink.z+ink.z*texelFetch(documentGrainImage,pos,0).r;
 float s=old+max(0.,ink.x-old)*clamp(f,0.,1.)*ink.y;
 vec4 d=texelFetch(base,pos,0);
 float a=s+d.a*(1.-s);
 if(a==0.){result=vec4(0);return;}
 vec3 c=((1.-s)*d.a*d.rgb+s*color)/a;
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
  private directProgram: WebGLProgram;
  private circleDirectProgram: WebGLProgram;
  private circleStampProgram: WebGLProgram;
  private circle = false;
  private grainProgram: WebGLProgram;
  private documentGrain: Surface;
  private grainKey = "";
  private grainTexture: Mask | undefined;
  private maskData: Mask | undefined;
  private maskReady = false;
  private readonly floatBlend: boolean;
  private stampVAO: WebGLVertexArrayObject;
  private stampBuffer: WebGLBuffer;
  private stampData = new Float32Array(0);
  private fastBlend = false;
  private dirty: Bounds | undefined;
  private oldTail: Bounds | undefined;
  private strokeBounds: Bounds | undefined;
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
  private fence: WebGLSync | undefined;
  private pending: Float64Array[] = [];
  private paced = false;
  // Immutable commands belong to the commit path. Live work has a fixed dab budget,
  // independent of input bursts and stroke length. Never enqueue obsolete tails.
  private pendingOffset = 0;
  private queuedDabs = 0;
  private livePrefixBudget = 4;
  private liveTailBudget = 4;
  private lastLiveDabs = 0;
  private droppedPreviewDabs = 0;
  private lastLiveData = new Float64Array();
  private provisionalCommits = 0;
  coalesced = 0;
  private discardFence() {
    if (this.fence) this.gl.deleteSync(this.fence);
    this.fence = undefined;
  }
  canPresent() {
    if (!this.paced || !this.fence) return true;
    const g = this.gl,
      state = g.clientWaitSync(this.fence, 0, 0);
    if (state === g.TIMEOUT_EXPIRED) {
      this.coalesced++;
      return false;
    }
    this.discardFence();
    if (state === g.WAIT_FAILED) throw new Error("GPU completion query failed");
    return true;
  }
  get pipeline() {
    return {
      inFlight: this.fence ? 1 : 0,
      coalesced: this.coalesced,
      paced: this.paced,
      pendingCommitDabs: this.queuedDabs,
      liveDabBudget: this.livePrefixBudget + this.liveTailBudget,
      lastLiveDabs: this.lastLiveDabs,
      droppedPreviewDabs: this.droppedPreviewDabs,
      provisionalCommits: this.provisionalCommits,
    };
  }
  get hasPendingCommit() {
    return this.queuedDabs > 0;
  }
  private flushPrefix(budget = Infinity) {
    let drawn = 0;
    while (this.pending.length && drawn < budget) {
      const page = this.pending[0]!;
      const count = Math.min(
        page.length / STRIDE - this.pendingOffset,
        budget - drawn,
      );
      const data = page.subarray(
        this.pendingOffset * STRIDE,
        (this.pendingOffset + count) * STRIDE,
      );
      this.draw(this.prefix, data);
      this.dirty = union(this.dirty, this.bounds(data));
      drawn += count;
      this.queuedDabs -= count;
      this.pendingOffset += count;
      if (this.pendingOffset * STRIDE === page.length) {
        this.pending.shift();
        this.pendingOffset = 0;
      }
    }
    return drawn;
  }
  private latestPending() {
    const chunks: Float64Array[] = [];
    let count = this.liveTailBudget;
    for (let i = this.pending.length - 1; i >= 0 && count; i--) {
      const page = this.pending[i]!;
      const first = i === 0 ? this.pendingOffset * STRIDE : 0;
      const start = Math.max(first, page.length - count * STRIDE);
      const chunk = page.subarray(start);
      chunks.unshift(chunk);
      count -= chunk.length / STRIDE;
    }
    const data = new Float64Array((this.liveTailBudget - count) * STRIDE);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    return data;
  }
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
    this.floatBlend = !!gl.getExtension("EXT_float_blend");
    this.inkProgram = this.program(deposit);
    this.compositeProgram = this.program(composite);
    this.stampProgram = this.program(blendedDeposit, stampVertex);
    this.directProgram = this.program(direct);
    this.circleDirectProgram = this.program(circleDirect);
    this.circleStampProgram = this.program(circleStamp, stampVertex);
    this.grainProgram = this.program(grainCacheShader);
    this.documentGrain = this.surface(true, true);
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
          "documentGrainImage",
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
  private clear(s: Surface, bounds?: Bounds) {
    const g = this.gl;
    if (bounds) {
      g.enable(g.SCISSOR_TEST);
      g.scissor(
        bounds.x0,
        bounds.y0,
        bounds.x1 - bounds.x0,
        bounds.y1 - bounds.y0,
      );
    } else g.disable(g.SCISSOR_TEST);
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
  prepare(p: Preset) {
    if (!this.maskReady || p.mask !== this.maskData) {
      this.uploadMask(this.mask, p.mask);
      this.maskData = p.mask;
      this.maskReady = true;
    }
    const key = [p.grainKind, p.grainScale, p.grainRotation].join(":");
    if (key === this.grainKey && p.texture === this.grainTexture) return;
    const g = this.gl,
      program = this.grainProgram;
    this.uploadMask(this.grain, p.texture);
    g.useProgram(program);
    this.sampler(program, "grainImage", this.grain, 2);
    g.uniform4f(this.uniform(program, "grainStyle"), p.grainScale, 0, 0, 0);
    g.uniform4f(
      this.uniform(program, "rotation"),
      0,
      0,
      Math.cos(p.grainRotation),
      Math.sin(p.grainRotation),
    );
    g.uniform3i(
      this.uniform(program, "kinds"),
      0,
      0,
      ["paper", "hatch", "noise", "image"].indexOf(p.grainKind),
    );
    g.bindFramebuffer(g.FRAMEBUFFER, this.documentGrain.framebuffer);
    g.disable(g.SCISSOR_TEST);
    g.viewport(0, 0, this.canvas.width, this.canvas.height);
    g.drawArrays(g.TRIANGLES, 0, 3);
    this.grainKey = key;
    this.grainTexture = p.texture;
  }
  begin(p: Preset) {
    this.prepare(p);
    this.discardFence();
    this.pending = [];
    this.pendingOffset = this.queuedDabs = this.lastLiveDabs = 0;
    this.paced = p.size >= 192;
    this.livePrefixBudget = this.liveTailBudget = 1;
    this.lastLiveData = new Float64Array();
    this.preset = p;
    this.circle =
      p.tip === "round" &&
      p.aspect === 1 &&
      p.hardness === 1 &&
      !p.dual &&
      !p.mappings.some((m) => m.target === "aspect");
    this.dirty = this.oldTail = this.strokeBounds = undefined;
    this.fastBlend =
      this.floatBlend &&
      p.opacityJitter === 0 &&
      p.hueJitter === 0 &&
      !p.mappings.some((m) =>
        ["opacity", "hue", "saturation", "value"].includes(m.target),
      );
    // A constant-color stroke needs one float channel for coverage, not four.
    this.prefix = this.fastBlend ? this.alphaPrefix : this.colorPrefix;
    this.preview = this.fastBlend ? this.alphaPreview : this.colorPreview;
    // finish/cancel leave the stroke surfaces empty; contact does not clear the whole document.
  }
  append(data: ArrayLike<number>) {
    const bounds = this.bounds(data);
    this.strokeBounds = union(this.strokeBounds, bounds);
    if (this.paced) {
      this.pending.push(Float64Array.from(data));
      this.queuedDabs += data.length / STRIDE;
    } else {
      this.dirty = union(this.dirty, bounds);
      this.draw(this.prefix, data);
    }
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
  present(data: ArrayLike<number>, force = true) {
    const realtime = this.paced && !force;
    this.lastLiveDabs = this.flushPrefix(
      realtime ? this.livePrefixBudget : Infinity,
    );
    if (realtime) {
      const length = Math.min(data.length, this.liveTailBudget * STRIDE);
      this.droppedPreviewDabs += (data.length - length) / STRIDE;
      const latest = data.length ? new Float64Array() : this.latestPending();
      const live = new Float64Array(latest.length + length);
      live.set(latest);
      for (let i = 0; i < length; i++)
        live[latest.length + i] = data[data.length - length + i]!;
      data = live;
    }
    this.lastLiveDabs += data.length / STRIDE;
    this.lastLiveData = Float64Array.from(data);
    const tail = this.bounds(data),
      changed = union(union(this.dirty, this.oldTail), tail);
    if (changed) {
      this.strokeBounds = union(this.strokeBounds, changed);
      if (data.length === 0) this.show(this.prefix, undefined, changed);
      else if (data.length === STRIDE) this.showDirect(data, changed);
      else {
        this.copy(this.prefix, this.preview, changed);
        this.draw(this.preview, data);
        this.show(this.preview, undefined, changed);
      }
    }
    this.dirty = undefined;
    this.oldTail = tail;
    this.presentations++;
    this.discardFence();
    if (this.paced) {
      const fence = this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!fence) throw new Error("GPU completion fence unavailable");
      this.fence = fence;
    }
    this.gl.flush();
  }
  private draw(target: Surface, data: ArrayLike<number>) {
    const g = this.gl,
      p = this.preset,
      program = this.fastBlend
        ? this.circle
          ? this.circleStampProgram
          : this.stampProgram
        : this.inkProgram;
    g.useProgram(program);
    g.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.sampler(program, "src", target.texture, 0);
    this.sampler(program, "maskImage", this.mask, 1);
    this.sampler(program, "grainImage", this.grain, 2);
    this.sampler(program, "documentGrainImage", this.documentGrain.texture, 4);
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
  private showDirect(data: ArrayLike<number>, bounds: Bounds) {
    const g = this.gl,
      p = this.preset,
      program =
        this.fastBlend && this.circle && p.blend === "normal"
          ? this.circleDirectProgram
          : this.directProgram;
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    g.viewport(0, 0, this.canvas.width, this.canvas.height);
    g.useProgram(program);
    this.sampler(program, "src", this.prefix.texture, 0);
    this.sampler(program, "maskImage", this.mask, 1);
    this.sampler(program, "grainImage", this.grain, 2);
    this.sampler(program, "documentGrainImage", this.documentGrain.texture, 4);
    this.sampler(program, "base", this.base.texture, 3);
    const a = data[C.ANGLE]!;
    g.uniform4f(
      this.uniform(program, "geometry"),
      data[C.X]!,
      data[C.Y]!,
      data[C.SIZE]!,
      data[C.SIZE]! * data[C.ASPECT]!,
    );
    g.uniform4f(
      this.uniform(program, "ink"),
      data[C.OPACITY]!,
      data[C.FLOW]!,
      data[C.GRAIN]!,
      0,
    );
    g.uniform4f(
      this.uniform(program, "pigment"),
      data[C.R]!,
      data[C.G]!,
      data[C.B]!,
      0,
    );
    g.uniform4f(
      this.uniform(program, "rotation"),
      Math.cos(a),
      Math.sin(a),
      Math.cos(p.grainRotation),
      Math.sin(p.grainRotation),
    );
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
    g.uniform1i(this.uniform(program, "alphaOnly"), this.fastBlend ? 1 : 0);
    g.uniform1i(
      this.uniform(program, "mode"),
      ["normal", "multiply", "screen", "erase"].indexOf(p.blend),
    );
    g.uniform3fv(this.uniform(program, "color"), p.color);
    g.uniform1f(this.uniform(program, "height"), this.canvas.height);
    g.enable(g.SCISSOR_TEST);
    g.scissor(
      bounds.x0,
      this.canvas.height - bounds.y1,
      bounds.x1 - bounds.x0,
      bounds.y1 - bounds.y0,
    );
    g.drawArrays(g.TRIANGLES, 0, 3);
    g.disable(g.SCISSOR_TEST);
  }
  /** Prepare driver pipelines at startup without visible marks. */
  warm(p: Preset) {
    const d = new Float64Array(STRIDE);
    d[C.X] = 2;
    d[C.Y] = 2;
    d[C.SIZE] = 2;
    d[C.ASPECT] = 1;
    d[C.OPACITY] = 1;
    d[C.FLOW] = 1;
    d[C.R] = p.color[0];
    d[C.G] = p.color[1];
    d[C.B] = p.color[2];
    const b = { x0: 0, y0: 0, x1: 4, y1: 4 };
    this.begin(p);
    this.draw(this.prefix, d);
    this.showDirect(d, b);
    this.circle = false;
    this.draw(this.prefix, d);
    this.fastBlend = false;
    this.prefix = this.colorPrefix;
    this.preview = this.colorPreview;
    this.clear(this.prefix);
    this.draw(this.prefix, d);
    this.showDirect(d, b);
    this.show(this.prefix, this.nextBase, b);
    this.gl.readPixels(
      0,
      0,
      1,
      1,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array(4),
    );
    this.clear(this.base);
    this.clear(this.nextBase);
    for (const surface of [
      this.colorPrefix,
      this.colorPreview,
      this.alphaPrefix,
      this.alphaPreview,
    ])
      this.clear(surface);
    this.begin(p);
    this.cancel();
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
  finish(force = true) {
    // A release must not turn CPU commit debt into an unbounded GPU queue.
    // The independent canonical worker owns every command and supplies the exact base.
    const provisional =
      this.paced && !force && this.queuedDabs > this.pipeline.liveDabBudget;
    if (!provisional) this.flushPrefix();
    else {
      this.pending = [];
      this.pendingOffset = this.queuedDabs = 0;
      this.provisionalCommits++;
    }
    this.discardFence();
    const bounds = this.strokeBounds;
    if (bounds) {
      if (provisional) {
        this.copy(this.prefix, this.preview, bounds);
        this.draw(this.preview, this.lastLiveData);
      }
      this.show(
        provisional ? this.preview : this.prefix,
        this.nextBase,
        bounds,
      );
      this.copy(this.nextBase, this.base, bounds);
      this.clear(this.prefix, bounds);
      this.clear(this.preview, bounds);
      this.show(this.preview, undefined, bounds);
    }
    this.strokeBounds = this.dirty = this.oldTail = undefined;
    this.presentations++;
    this.gl.flush();
  }
  cancel() {
    this.discardFence();
    this.pending = [];
    this.pendingOffset = this.queuedDabs = 0;
    this.strokeBounds = this.dirty = this.oldTail = undefined;
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
