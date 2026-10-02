export const kinds={round:0,ellipse:1,rect:2,bristle:3,star:4,leaf:5,mask:6};
export const grainKinds={paper:0,hatch:1,noise:2,image:3};
export const blends={normal:0,multiply:1,screen:2,erase:3};
export const glMath=`
float sat(float x){return clamp(x,0.,1.);}
float img(sampler2D t,vec2 uv,bool repeatImage){if(repeatImage)uv=fract(uv);else if(any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1))))return 0.;ivec2 sz=textureSize(t,0);return texelFetch(t,min(sz-1,ivec2(floor(uv*vec2(sz)))),0).r;}
float shape(int kind,vec2 xy,vec2 r){
 if(kind==0&&r.x*r.y<.08)return 0.;
 if(kind==2||kind==3){float a=sat(.5-max(abs(xy.x)-r.x,abs(xy.y)-r.y));if(kind==3)a*=.3+.7*pow(abs(sin(xy.y/max(.35,r.y/max(1.,params[1].y))*3.141592653589793)),.5);return a;}
 if(kind==0&&r.x==r.y){float d=length(xy),h=r.x*params[1].x;if(d<=h)return 1.;return params[1].x==1.?sat(r.x+.5-d):sat((r.x+.5-d)/max(.5,r.x-h));}
 if(kind==1&&params[1].x==1.&&params[2].z==1.&&params[2].w<0.){float k0=length(xy/r),k1=length(xy/(r*r));return k1>1e-12?sat(.5-k0*(k0-1.)/k1):sat(.5+min(r.x,r.y));}
 float sum=0.;for(int x=0;x<2;x++)for(int y=0;y<2;y++){vec2 uv=(xy+vec2(float(x)*.5-.25,float(y)*.5-.25))/r;float d=length(uv);if(kind==6)sum+=img(maskImage,uv/2.+.5,false);else if(kind==0||kind==1)sum+=d<1.?(params[1].x==1.?1.:sat((1.-d)/max(.001,1.-params[1].x))):0.;else if(kind==4)sum+=d<.65+.35*cos(atan(uv.y,uv.x)*5.)?1.:0.;else if(kind==5)sum+=abs(uv.y)<sqrt(max(0.,1.-uv.x*uv.x))*(1.-abs(uv.x)*.7)?1.:0.;}return sum/4.;
}
float cov(vec4 a,vec4 b,vec4 color,vec4 extra,vec4 seg,vec2 xy){
 vec2 delta=xy-a.xy;vec2 r=vec2(a.z,a.z*a.w)*.5;
 if(seg.w==1.){vec2 d=a.xy-seg.xy;float f=sat(dot(xy-seg.xy,d)/max(.000001,dot(d,d)));return sat(mix(seg.z,r.x,f)+.5-length(xy-seg.xy-d*f));}
 float cs=cos(b.x),sn=sin(b.x);vec2 local=vec2(dot(delta,vec2(cs,sn)),dot(delta,vec2(-sn,cs)));
 int kind=int(params[2].z);float v=(kind==0&&r.x*r.y<.08)?max(0.,1.-abs(delta.x))*max(0.,1.-abs(delta.y))*min(1.,3.141592653589793*r.x*r.y):shape(kind,local,r);
 if(params[2].w>=0.)v*=shape(int(params[2].w),local,vec2(r.x,r.x*params[1].z));
 if(b.w>0.&&v>0.){vec2 g=vec2(dot(xy,params[2].xy),dot(xy,vec2(-params[2].y,params[2].x)))/params[1].w;float t;int k=int(params[3].x);if(k==3)t=img(grainImage,g,true);else if(k==1)t=.15+.85*pow(abs(sin((g.x+g.y)*3.141592653589793)),.7);else{uint hash=(uint(int(floor(g.x))*73856093)^uint(int(floor(g.y))*19349663))*83492791u;t=float(hash)/4294967295.;if(k==0)t=.25+.75*t;}v*=1.-b.w+b.w*t;}
 return sat(v);
}
vec4 compose(vec4 d,vec4 s,int mode){if(s.a<=0.)return d;if(mode==3){float a=floor(d.a*(1.-s.a)*255.+.5)/255.;return a==0.?vec4(0):vec4(d.rgb,a);}vec3 sc=s.rgb/s.a,b=sc;if(mode==1)b=sc*d.rgb;else if(mode==2)b=1.-(1.-sc)*(1.-d.rgb);float a=s.a+d.a*(1.-s.a);vec3 c=((1.-s.a)*d.a*d.rgb+(1.-d.a)*s.a*sc+s.a*d.a*b)/max(a,.000001);vec4 q=floor(clamp(vec4(c,a),0.,1.)*255.+.5)/255.;return q.a==0.?vec4(0):q;}
`;
export const glDeposit=`#version 300 es
precision highp float;precision highp int;
uniform vec4 params[16],commands[96];uniform sampler2D src,layer,maskImage,grainImage;out vec4 result;
${glMath}
void main(){ivec2 pos=ivec2(gl_FragCoord.xy);vec4 old=texelFetch(src,pos,0);if(params[0].w==1.){result=compose(texelFetch(layer,pos,0),old,int(params[3].y));return;}vec2 xy=gl_FragCoord.xy+params[0].xy;for(int j=0;j<16;j++){if(j>=int(params[0].z))break;int i=j*6;vec4 a=commands[i],b=commands[i+1],color=commands[i+2],extra=commands[i+3],seg=commands[i+4];if(old.a>=b.y)continue;float k=cov(a,b,color,extra,seg,xy)*b.z;float d=seg.w==1.?max(0.,b.y*k-old.a):max(0.,b.y-old.a)*k;old+=vec4(color.rgb,1.)*d;}result=old;}`;
export const glQuad=`#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`;
export const glLiveVertex=`#version 300 es
layout(location=0)in vec4 a;layout(location=1)in vec4 b;layout(location=2)in vec4 c;layout(location=3)in vec4 e;layout(location=4)in vec4 s;layout(location=5)in vec4 t;
uniform vec4 params[16];flat out vec4 oa,ob,oc,oe,os;
void main(){vec2 corner=vec2((gl_VertexID==1||gl_VertexID==2||gl_VertexID==4)?1.:0.,(gl_VertexID==2||gl_VertexID==4||gl_VertexID==5)?1.:0.);float r=max(a.z*.5,s.z)*(s.w==1.?1.:1.414213562)+2.;vec2 start=s.w==1.?s.xy:a.xy;vec2 lo=min(a.xy,start)-r,hi=max(a.xy,start)+r;vec2 p=(mix(lo,hi,corner)-params[0].xy)/params[4].xy;gl_Position=vec4(p.x*2.-1.,params[0].w==2.?p.y*2.-1.:1.-p.y*2.,0,1);oa=a;ob=b;oc=c;oe=e;os=s;}`;
export const glLive=`#version 300 es
precision highp float;precision highp int;
uniform vec4 params[16];uniform sampler2D maskImage,grainImage;flat in vec4 oa,ob,oc,oe,os;out vec4 result;
${glMath}
void main(){vec2 xy=vec2(gl_FragCoord.x,params[0].w==2.?gl_FragCoord.y:params[5].y-gl_FragCoord.y)*params[4].xy/params[5].xy+params[0].xy;float k=cov(oa,ob,oc,oe,os,xy)*ob.z;if(params[0].w==1.&&k<1.)discard;float a=params[6].w==1.?k:ob.y*k;result=vec4(oc.rgb*a,a);}`;
export const glDisplayVertex=`#version 300 es
uniform vec4 params[16];out vec2 doc;
void main(){vec2 corner=vec2((gl_VertexID==1||gl_VertexID==2||gl_VertexID==4)?1.:0.,(gl_VertexID==2||gl_VertexID==4||gl_VertexID==5)?1.:0.);doc=params[0].xy+corner*128.;vec2 p=doc/params[4].xy;gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0,1);}`;
export const glDisplay=`#version 300 es
precision highp float;precision highp int;
uniform vec4 params[16];uniform sampler2D layer,src,maskImage,grainImage;in vec2 doc;out vec4 result;
uniform sampler2D liveImage0;
uniform sampler2D liveImage1;
uniform sampler2D liveImage2;
uniform sampler2D liveImage3;
uniform sampler2D liveImage4;
uniform sampler2D liveImage5;
uniform sampler2D liveImage6;
uniform sampler2D liveImage7;
${glMath}
vec4 preview(int i,ivec2 pos){if(i==0)return texelFetch(liveImage0,pos,0);if(i==1)return texelFetch(liveImage1,pos,0);if(i==2)return texelFetch(liveImage2,pos,0);if(i==3)return texelFetch(liveImage3,pos,0);if(i==4)return texelFetch(liveImage4,pos,0);if(i==5)return texelFetch(liveImage5,pos,0);if(i==6)return texelFetch(liveImage6,pos,0);if(i==7)return texelFetch(liveImage7,pos,0);return vec4(0);}
void main(){ivec2 q=ivec2(doc-params[0].xy),pos=ivec2(gl_FragCoord.xy);vec4 d=texelFetch(layer,q,0),s=texelFetch(src,q,0);bool applied=false;for(int i=0;i<8;i+=2){if(i>=int(params[6].z))break;float id=params[8+i].x;if(id<=params[6].y)continue;vec4 a=preview(i,pos),b=preview(i+1,pos);vec4 l=params[8+i].w==1.?(a+b*(1.-a.a))*params[8+i].z:max(a,b);if(id==params[6].x){float delta=max(0.,l.a-s.a);s+=vec4(l.a>0.?l.rgb/l.a:vec3(0),1.)*delta;d=compose(d,s,int(params[3].y));applied=true;}else{if(!applied&&params[6].x>params[6].y&&params[6].x<id){d=compose(d,s,int(params[3].y));applied=true;}d=compose(d,l,int(params[8+i].y));}}if(!applied)d=compose(d,s,int(params[3].y));result=vec4(d.rgb*d.a,d.a);}`;

// WGSL equations are explicitly matched to the Float64 reference. Integer grain
// hashing uses wrapping u32 arithmetic; geometry is intentionally f32 on GPU.
export const wgMath=`
fn sat(x:f32)->f32{return clamp(x,0.,1.);}
fn img(t:texture_2d<f32>,uv0:vec2f,repeatImage:bool)->f32{var uv=uv0;if(repeatImage){uv=fract(uv);}else if(any(uv<vec2f(0))||any(uv>vec2f(1))){return 0.;}let sz=textureDimensions(t);return textureLoad(t,min(vec2u(floor(uv*vec2f(sz))),sz-1u),0).r;}
fn shape(kind:i32,xy:vec2f,r:vec2f)->f32{
 if(kind==0&&r.x*r.y<.08){return 0.;}
 if(kind==2||kind==3){var a=sat(.5-max(abs(xy.x)-r.x,abs(xy.y)-r.y));if(kind==3){a*=.3+.7*pow(abs(sin(xy.y/max(.35,r.y/max(1.,p.v[1].y))*3.141592653589793)),.5);}return a;}
 if(kind==0&&r.x==r.y){let d=length(xy);let h=r.x*p.v[1].x;if(d<=h){return 1.;}if(p.v[1].x==1.){return sat(r.x+.5-d);}return sat((r.x+.5-d)/max(.5,r.x-h));}
 if(kind==1&&p.v[1].x==1.&&p.v[2].z==1.&&p.v[2].w<0.){let k0=length(xy/r);let k1=length(xy/(r*r));if(k1>1e-12){return sat(.5-k0*(k0-1.)/k1);}return sat(.5+min(r.x,r.y));}
 var sum=0.;for(var x=0;x<2;x++){for(var y=0;y<2;y++){let uv=(xy+vec2f(f32(x)*.5-.25,f32(y)*.5-.25))/r;let d=length(uv);if(kind==6){sum+=img(maskImage,uv/2.+.5,false);}else if(kind==0||kind==1){if(d<1.){if(p.v[1].x==1.){sum+=1.;}else{sum+=sat((1.-d)/max(.001,1.-p.v[1].x));}}}else if(kind==4){if(d<.65+.35*cos(atan2(uv.y,uv.x)*5.)){sum+=1.;}}else if(kind==5){if(abs(uv.y)<sqrt(max(0.,1.-uv.x*uv.x))*(1.-abs(uv.x)*.7)){sum+=1.;}}}}return sum/4.;
}
fn cov(a:vec4f,b:vec4f,color:vec4f,extra:vec4f,seg:vec4f,xy:vec2f)->f32{
 let delta=xy-a.xy;let r=vec2f(a.z,a.z*a.w)*.5;
 if(seg.w==1.){let d=a.xy-seg.xy;let f=sat(dot(xy-seg.xy,d)/max(.000001,dot(d,d)));return sat(mix(seg.z,r.x,f)+.5-length(xy-seg.xy-d*f));}
 let cs=cos(b.x);let sn=sin(b.x);let local=vec2f(dot(delta,vec2f(cs,sn)),dot(delta,vec2f(-sn,cs)));let kind=i32(p.v[2].z);var v=0.;if(kind==0&&r.x*r.y<.08){v=max(0.,1.-abs(delta.x))*max(0.,1.-abs(delta.y))*min(1.,3.141592653589793*r.x*r.y);}else{v=shape(kind,local,r);}if(p.v[2].w>=0.){v*=shape(i32(p.v[2].w),local,vec2f(r.x,r.x*p.v[1].z));}
 if(b.w>0.&&v>0.){let g=vec2f(dot(xy,p.v[2].xy),dot(xy,vec2f(-p.v[2].y,p.v[2].x)))/p.v[1].w;var t=0.;let k=i32(p.v[3].x);if(k==3){t=img(grainImage,g,true);}else if(k==1){t=.15+.85*pow(abs(sin((g.x+g.y)*3.141592653589793)),.7);}else{let hash=((bitcast<u32>(i32(floor(g.x)))*73856093u) ^ (bitcast<u32>(i32(floor(g.y)))*19349663u))*83492791u;t=f32(hash)/4294967295.;if(k==0){t=.25+.75*t;}}v*=1.-b.w+b.w*t;}return sat(v);
}
fn compose(d:vec4f,s:vec4f,mode:i32)->vec4f{if(s.a<=0.){return d;}if(mode==3){let a=floor(d.a*(1.-s.a)*255.+.5)/255.;if(a==0.){return vec4f(0);}return vec4f(d.rgb,a);}let sc=s.rgb/s.a;var b=sc;if(mode==1){b=sc*d.rgb;}else if(mode==2){b=1.-(1.-sc)*(1.-d.rgb);}let a=s.a+d.a*(1.-s.a);let c=((1.-s.a)*d.a*d.rgb+(1.-d.a)*s.a*sc+s.a*d.a*b)/max(a,.000001);let q=floor(clamp(vec4f(c,a),vec4f(0),vec4f(1))*255.+.5)/255.;if(q.a==0.){return vec4f(0);}return q;}
`;
export const wgDeposit=`
struct Params{v:array<vec4f,16>};struct Commands{v:array<vec4f>};
@group(0)@binding(0)var<uniform>p:Params;
@group(0)@binding(1)var src:texture_2d<f32>;
@group(0)@binding(2)var dst:texture_storage_2d<rgba32float,write>;
@group(0)@binding(3)var<storage,read>commands:Commands;
@group(0)@binding(4)var maskImage:texture_2d<f32>;
@group(0)@binding(5)var grainImage:texture_2d<f32>;
@group(0)@binding(6)var layer:texture_2d<f32>;
@group(0)@binding(7)var layerOut:texture_storage_2d<rgba8unorm,write>;
${wgMath}
@compute @workgroup_size(8,8)fn main(@builtin(global_invocation_id)id:vec3u){if(any(id.xy>=vec2u(128))){return;}let pos=vec2i(id.xy);var old=textureLoad(src,pos,0);if(p.v[0].w==1.){textureStore(layerOut,pos,compose(textureLoad(layer,pos,0),old,i32(p.v[3].y)));return;}let xy=vec2f(id.xy)+.5+p.v[0].xy;for(var j=0u;j<u32(p.v[0].z);j++){let i=j*6u;let a=commands.v[i];let b=commands.v[i+1u];let color=commands.v[i+2u];let extra=commands.v[i+3u];let seg=commands.v[i+4u];if(old.a>=b.y){continue;}let k=cov(a,b,color,extra,seg,xy)*b.z;let delta=select(max(0.,b.y-old.a)*k,max(0.,b.y*k-old.a),seg.w==1.);old+=vec4f(color.rgb,1.)*delta;}textureStore(dst,pos,old);}`;
export const wgLive=`
struct Params{v:array<vec4f,16>};struct Commands{v:array<vec4f>};
@group(0)@binding(0)var<uniform>p:Params;
@group(0)@binding(1)var<storage,read>commands:Commands;
@group(0)@binding(2)var maskImage:texture_2d<f32>;
@group(0)@binding(3)var grainImage:texture_2d<f32>;
${wgMath}
struct VOut{@builtin(position)position:vec4f,@location(0)@interpolate(flat)a:vec4f,@location(1)@interpolate(flat)b:vec4f,@location(2)@interpolate(flat)c:vec4f,@location(3)@interpolate(flat)e:vec4f,@location(4)@interpolate(flat)s:vec4f};
@vertex fn vertex(@builtin(vertex_index)v:u32,@builtin(instance_index)n:u32)->VOut{let a=commands.v[n*6u];let s=commands.v[n*6u+4u];let corner=vec2f(select(0.,1.,v==1u||v==2u||v==4u),select(0.,1.,v==2u||v==4u||v==5u));let r=max(a.z*.5,s.z)*select(1.414213562,1.,s.w==1.)+2.;let start=select(a.xy,s.xy,s.w==1.);let xy=(mix(min(a.xy,start)-r,max(a.xy,start)+r,corner)-p.v[0].xy)/p.v[4].xy;var o:VOut;o.position=vec4f(xy.x*2.-1.,1.-xy.y*2.,0,1);o.a=a;o.b=commands.v[n*6u+1u];o.c=commands.v[n*6u+2u];o.e=commands.v[n*6u+3u];o.s=s;return o;}
@fragment fn fragment(v:VOut)->@location(0)vec4f{let xy=v.position.xy*p.v[4].xy/p.v[5].xy+p.v[0].xy;let k=cov(v.a,v.b,v.c,v.e,v.s,xy)*v.b.z;let a=select(v.b.y*k,k,p.v[6].w==1.);return vec4f(v.c.rgb*a,a);}
@fragment fn fragmentOpaque(v:VOut)->@location(0)vec4f{let xy=v.position.xy*p.v[4].xy/p.v[5].xy+p.v[0].xy;let k=cov(v.a,v.b,v.c,v.e,v.s,xy)*v.b.z;if(k<1.){discard;}return vec4f(v.c.rgb*v.b.y,v.b.y);}`;
export const wgDisplay=`
struct Params{v:array<vec4f,16>};
@group(0)@binding(0)var<uniform>p:Params;
@group(0)@binding(1)var layer:texture_2d<f32>;
@group(0)@binding(2)var src:texture_2d<f32>;
@group(0)@binding(3)var liveImage0:texture_2d<f32>;
@group(0)@binding(4)var liveImage1:texture_2d<f32>;
@group(0)@binding(5)var liveImage2:texture_2d<f32>;
@group(0)@binding(6)var liveImage3:texture_2d<f32>;
@group(0)@binding(7)var liveImage4:texture_2d<f32>;
@group(0)@binding(8)var liveImage5:texture_2d<f32>;
@group(0)@binding(9)var liveImage6:texture_2d<f32>;
@group(0)@binding(10)var liveImage7:texture_2d<f32>;

// The shared math references mask/grain even when display only uses composition.
fn compose(d:vec4f,s:vec4f,mode:i32)->vec4f{if(s.a<=0.){return d;}if(mode==3){let a=floor(d.a*(1.-s.a)*255.+.5)/255.;if(a==0.){return vec4f(0);}return vec4f(d.rgb,a);}let sc=s.rgb/s.a;var b=sc;if(mode==1){b=sc*d.rgb;}else if(mode==2){b=1.-(1.-sc)*(1.-d.rgb);}let a=s.a+d.a*(1.-s.a);let c=((1.-s.a)*d.a*d.rgb+(1.-d.a)*s.a*sc+s.a*d.a*b)/max(a,.000001);let q=floor(clamp(vec4f(c,a),vec4f(0),vec4f(1))*255.+.5)/255.;if(q.a==0.){return vec4f(0);}return q;}
fn preview(i:i32,pos:vec2i)->vec4f{if(i==0){return textureLoad(liveImage0,pos,0);}if(i==1){return textureLoad(liveImage1,pos,0);}if(i==2){return textureLoad(liveImage2,pos,0);}if(i==3){return textureLoad(liveImage3,pos,0);}if(i==4){return textureLoad(liveImage4,pos,0);}if(i==5){return textureLoad(liveImage5,pos,0);}if(i==6){return textureLoad(liveImage6,pos,0);}if(i==7){return textureLoad(liveImage7,pos,0);}return vec4f(0);}
struct VOut{@builtin(position)position:vec4f,@location(0)doc:vec2f};
@vertex fn vertex(@builtin(vertex_index)v:u32)->VOut{let corner=vec2f(select(0.,1.,v==1u||v==2u||v==4u),select(0.,1.,v==2u||v==4u||v==5u));var o:VOut;o.doc=p.v[0].xy+corner*128.;let xy=o.doc/p.v[4].xy;o.position=vec4f(xy.x*2.-1.,1.-xy.y*2.,0,1);return o;}
@fragment fn fragment(v:VOut)->@location(0)vec4f{let q=vec2i(v.doc-p.v[0].xy);var d=textureLoad(layer,q,0);var s=textureLoad(src,q,0);var applied=false;for(var i=0;i<8;i+=2){if(i>=i32(p.v[6].z)){break;}let id=p.v[8+i].x;if(id<=p.v[6].y){continue;}let a=preview(i,vec2i(v.position.xy));let b=preview(i+1,vec2i(v.position.xy));let l=select(max(a,b),(a+b*(1.-a.a))*p.v[8+i].z,p.v[8+i].w==1.);if(id==p.v[6].x){let delta=max(0.,l.a-s.a);s+=vec4f(l.rgb/max(l.a,.000001),1.)*delta;d=compose(d,s,i32(p.v[3].y));applied=true;}else{if(!applied&&p.v[6].x>p.v[6].y&&p.v[6].x<id){d=compose(d,s,i32(p.v[3].y));applied=true;}d=compose(d,l,i32(p.v[8+i].y));}}if(!applied){d=compose(d,s,i32(p.v[3].y));}return vec4f(d.rgb*d.a,d.a);}`;
