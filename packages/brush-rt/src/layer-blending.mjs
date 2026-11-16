// Numeric contract NDE-001. Keep the component expressions shared across CPU,
// GLSL and WGSL so that blend modes cannot drift between display and export.
const equations=[
 's','min(b,s)','max(b,s)','b*s','b+s-b*s','burn(b,s)','dodge(b,s)',
 'hardLight(b,s)','hardLight(s,b)','softLight(b,s)','abs(b-s)','b+s-2.*b*s',
 'max(0.,b+s-1.)','min(1.,b+s)','vividLight(b,s)','clamp(b+2.*s-1.,0.,1.)',
 'pinLight(b,s)','step(.5,vividLight(b,s))','max(0.,b-s)','divide(b,s)',
];
const modeNames=[
 'normal','darken','lighten','multiply','screen','color-burn','color-dodge','hard-light','overlay','soft-light',
 'difference','exclusion','linear-burn','linear-dodge','vivid-light','linear-light','pin-light','hard-mix','subtract','divide',
 'hue','saturation','color','luminosity','dissolve',
];
export const layerToneChannel=channel=>Math.max(0,['luminosity','red','green','blue'].indexOf(channel));
export const layerBlendIndex=mode=>Math.max(0,modeNames.indexOf(mode));
const clamp=(x,lo=0,hi=1)=>Math.max(lo,Math.min(hi,x));
const burn=(b,s)=>b===1?1:s===0?0:1-Math.min(1,(1-b)/s);
const dodge=(b,s)=>b===0?0:s===1?1:Math.min(1,b/(1-s));
const hardLight=(b,s)=>s<=.5?2*b*s:1-2*(1-b)*(1-s);
const softLight=(b,s)=>s<=.5?b-(1-2*s)*b*(1-b):b+(2*s-1)*((b<=.25?((16*b-12)*b+4)*b:Math.sqrt(b))-b);
const vividLight=(b,s)=>s<=.5?burn(b,2*s):dodge(b,2*s-1);
const pinLight=(b,s)=>s<=.5?Math.min(b,2*s):Math.max(b,2*s-1);
const separable=[
 (b,s)=>s,Math.min,Math.max,(b,s)=>b*s,(b,s)=>b+s-b*s,burn,dodge,
 hardLight,(b,s)=>hardLight(s,b),softLight,(b,s)=>Math.abs(b-s),(b,s)=>b+s-2*b*s,
 (b,s)=>Math.max(0,b+s-1),(b,s)=>Math.min(1,b+s),vividLight,(b,s)=>clamp(b+2*s-1),
 pinLight,(b,s)=>Number(vividLight(b,s)>=.5),(b,s)=>Math.max(0,b-s),(b,s)=>s===0?1:Math.min(1,b/s),
];
const lum=([r,g,b])=>.3*r+.59*g+.11*b;
const sat=c=>Math.max(...c)-Math.min(...c);
function setLum(rgb,lightness){
 const offset=lightness-lum(rgb);
 let c=rgb.map(value=>value+offset);
 const l=lum(c),low=Math.min(...c),high=Math.max(...c);
 if(low<0)c=c.map(x=>l+(x-l)*l/(l-low));
 if(high>1)c=c.map(x=>l+(x-l)*(1-l)/(high-l));
 return c;
}
function setSat(c,saturation){
 const low=Math.min(...c),span=Math.max(...c)-low;
 return span?c.map(x=>(x-low)*saturation/span):[0,0,0];
}
const linear=c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
const encoded=c=>c<=.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-.055;

const toneColor=(channels,channel)=>channel?channels[channel-1]:.2126*channels[0]+.7152*channels[1]+.0722*channels[2];
const ease=(value,a,b)=>{
 if(a===b)return Number(value>=a);
 const t=clamp((value-a)/(b-a));
 return t*t*(3-2*t);
};
export function artworkToneWeight(tone,channels){
 const value=toneColor(channels,layerToneChannel(tone.channel));
 const upper=tone.lightStart===tone.lightEnd?Number(value<=tone.lightEnd):1-ease(value,tone.lightStart,tone.lightEnd);
 return ease(value,tone.darkStart,tone.darkEnd)*upper;
}
export function applyArtworkEffect(effect,source,coverage){
 if(!effect?.enabled||coverage<=0)return source;
 const light=source.map(value=>clamp((value-.5)*effect.contrast+.5+effect.brightness));
 const gray=toneColor(light,0);
 return light.map((value,index)=>{
  const saturated=clamp(gray+(value-gray)*effect.saturation);
  return source[index]+coverage*((effect.invert?1-saturated:saturated)-source[index]);
 });
}
export function blendArtworkPixel(destination,offset,source,alpha,blend,x,y,effectCoverage=1){
 let b=[destination[offset]/255,destination[offset+1]/255,destination[offset+2]/255];
 let s=applyArtworkEffect(blend.effect,[source[offset]/255,source[offset+1]/255,source[offset+2]/255],effectCoverage);
 if(blend.tone){
  if(blend.tone.source==='backdrop'&&!destination[offset+3])return;
  alpha*=artworkToneWeight(blend.tone,blend.tone.source==='backdrop'?b:s);
  if(alpha<=0)return;
 }
 const mode=layerBlendIndex(blend.mode);
 if(mode===24&&alpha<1){
  if(hashPixel(blend.seed,x,y)>=alpha)return;
  alpha=1;
 }
 const baseAlpha=destination[offset+3]/255,a=alpha+baseAlpha*(1-alpha);
 const inLinear=blend.space==='linear'&&mode!==24;
 if(inLinear){b=b.map(linear);s=s.map(linear);}
 let mixed=s;
 if(mode<20&&mode!==0)mixed=[0,1,2].map(i=>separable[mode](b[i],s[i]));
 else if(mode===20)mixed=setLum(setSat(s,sat(b)),lum(b));
 else if(mode===21)mixed=setLum(setSat(b,sat(s)),lum(b));
 else if(mode===22)mixed=setLum(s,lum(b));
 else if(mode===23)mixed=setLum(b,lum(s));
 for(let i=0;i<3;i++){
  const out=clamp(((1-alpha)*baseAlpha*b[i]+(1-baseAlpha)*alpha*s[i]+alpha*baseAlpha*mixed[i])/a);
  destination[offset+i]=Math.round((inLinear?encoded(out):out)*255);
 }
 destination[offset+3]=Math.round(a*255);
}

// The one-block SHA-256 message is four unsigned big-endian words
// [layer seed, document x, document y, channel 0]. Only the leading result
// word is needed for the threshold; the rounding step is identical on GPU.
const K=[
 0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
 0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
 0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
 0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
 0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
 0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
 0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
 0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
];
const rotate=(n,bits)=>(n>>>bits)|(n<<(32-bits));
const hashWords=new Uint32Array(64);
function hashPixel(seed,x,y){
 const w=hashWords;
 w[0]=seed;w[1]=x;w[2]=y;w[4]=0x80000000;w[15]=128;
 let a=0x6a09e667,b=0xbb67ae85,c=0x3c6ef372,d=0xa54ff53a,e=0x510e527f,f=0x9b05688c,g=0x1f83d9ab,h=0x5be0cd19;
 for(let i=0;i<64;i++){
  if(i>=16){
   const j=w[i-15],k=w[i-2];
   w[i]=(rotate(j,7)^rotate(j,18)^(j>>>3))+w[i-16]+(rotate(k,17)^rotate(k,19)^(k>>>10))+w[i-7];
  }
  const t=h+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+K[i]+w[i];
  const u=(rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c));
  h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+u)|0;
 }
 return ((a+0x6a09e667)>>>8)/16777216;
}

function shaderFunctions(wg){
 const vec=wg?'vec3f':'vec3',sc=wg?'f32':'float';
 const fn=(name,args,out,body)=>wg
  ?'fn '+name+'('+args.map(([type,id])=>id+':'+type).join(',')+')->'+out+'{'+body+'}'
  :out+' '+name+'('+args.map(([type,id])=>type+' '+id).join(',')+'){'+body+'}';
 const args=(type,...names)=>names.map(name=>[type,name]);
 const pair=args(sc,'b','s'),dec=(name,expr)=>wg?'var '+name+'='+expr+';':sc+' '+name+'='+expr+';';
 const branch=(condition,result)=>'if('+condition+'){return '+result+';}';
 return [
  fn('burn',pair,sc,branch('b>=1.','1.')+branch('s<=0.','0.')+'return 1.-min(1.,(1.-b)/s);'),
  fn('dodge',pair,sc,branch('b<=0.','0.')+branch('s>=1.','1.')+'return min(1.,b/(1.-s));'),
  fn('hardLight',pair,sc,branch('s<=.5','2.*b*s')+'return 1.-2.*(1.-b)*(1.-s);'),
  fn('softLight',pair,sc,branch('s<=.5','b-(1.-2.*s)*b*(1.-b)')+dec('curve','sqrt(b)')+'if(b<=.25){curve=((16.*b-12.)*b+4.)*b;}return b+(2.*s-1.)*(curve-b);'),
  fn('vividLight',pair,sc,branch('s<=.5','burn(b,2.*s)')+'return dodge(b,2.*s-1.);'),
  fn('pinLight',pair,sc,branch('s<=.5','min(b,2.*s)')+'return max(b,2.*s-1.);'),
  fn('divide',pair,sc,branch('s<=0.','1.')+'return min(1.,b/s);'),
  fn('blendChannel',[...pair,[wg?'i32':'int','mode']],sc,equations.map((eq,i)=>branch('mode=='+i,eq)).join('')+'return s;'),
  fn('blendLum',args(vec,'c'),sc,'return dot(c,'+vec+'(.3,.59,.11));'),
  fn('blendSat',args(vec,'c'),sc,'return max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));'),
  fn('blendSetSat',[[vec,'c'],[sc,'sat']],vec,dec('lo','min(c.r,min(c.g,c.b))')+dec('span','blendSat(c)')+branch('span<=0.',vec+'(0.)')+'return (c-'+vec+'(lo))*sat/span;'),
  fn('blendSetLum',[[vec,'c'],[sc,'desired']],vec,
   (wg?'var rgb=':vec+' rgb=')+'c+'+vec+'(desired-blendLum(c));'+dec('l','blendLum(rgb)')+dec('lo','min(rgb.r,min(rgb.g,rgb.b))')+
   dec('hi','max(rgb.r,max(rgb.g,rgb.b))')+'if(lo<0.){rgb='+vec+'(l)+(rgb-'+vec+'(l))*l/(l-lo);}if(hi>1.){rgb='+vec+'(l)+(rgb-'+vec+'(l))*(1.-l)/(hi-l);}return rgb;'),
  fn('artisticBlend',[...args(vec,'b','s'),[wg?'i32':'int','mode']],vec,
   branch('mode==20','blendSetLum(blendSetSat(s,blendSat(b)),blendLum(b))')+
   branch('mode==21','blendSetLum(blendSetSat(b,blendSat(s)),blendLum(b))')+
   branch('mode==22','blendSetLum(s,blendLum(b))')+branch('mode==23','blendSetLum(b,blendLum(s))')+
   'return '+vec+'(blendChannel(b.r,s.r,mode),blendChannel(b.g,s.g,mode),blendChannel(b.b,s.b,mode));'),
  fn('toneChannel',[[vec,'rgb'],[sc,'mode']],sc,
   branch('mode==1.','rgb.r')+branch('mode==2.','rgb.g')+branch('mode==3.','rgb.b')+
   'return dot(rgb,'+vec+'(.2126,.7152,.0722));'),
  fn('toneWeight',args(sc,'value','low','lowSoft','highSoft','high'),sc,
   dec('rise','step(low,value)')+dec('fall','step(value,high)')+
   'if(lowSoft>low){rise=smoothstep(low,lowSoft,value);}if(high>highSoft){fall=1.-smoothstep(highSoft,high,value);}return rise*fall;'),
  fn('effectColor',[[vec,'rgb'],[sc,'amount'],[sc,'brightness'],[sc,'contrast'],[sc,'saturation'],[sc,'invert']],vec,
   (wg?'var color=':vec+' color=')+'clamp((rgb-'+vec+'(.5))*contrast+'+vec+'(.5+brightness),'+vec+'(0.),'+vec+'(1.));'+
   dec('gray','toneChannel(color,0.)')+'color=clamp('+vec+'(gray)+(color-'+vec+'(gray))*saturation,'+vec+'(0.),'+vec+'(1.));'+
   'if(invert>0.){color='+vec+'(1.)-color;}return mix(rgb,color,amount);'),
  fn('toLinear',args(sc,'c'),sc,branch('c<=.04045','c/12.92')+'return pow((c+.055)/1.055,2.4);'),
  fn('toEncoded',args(sc,'c'),sc,branch('c<=.0031308','12.92*c')+'return 1.055*pow(c,1./2.4)-.055;'),
 ].join('\n');
}

function shaderHash(wg){
 const vars=wg?'var ':'uint ';
 const constants=K.map(k=>'0x'+k.toString(16)+'u').join(',');
 return (wg
  ?`const blendK=array<u32,64>(${constants});fn rotr(v:u32,n:u32)->u32{return (v>>n)|(v<<(32u-n));}
fn blendHash(seed:u32,x:u32,y:u32)->f32{var w:array<u32,64>;`
  :`const uint blendK[64]=uint[64](${constants});uint rotr(uint v,uint n){return (v>>n)|(v<<(32u-n));}
float blendHash(uint seed,uint x,uint y){uint w[64];for(int i=0;i<16;i++)w[i]=0u;`)
  +`w[0]=seed;w[1]=x;w[2]=y;w[4]=0x80000000u;w[15]=128u;
${vars}a=0x6a09e667u;${vars}b=0xbb67ae85u;${vars}c=0x3c6ef372u;${vars}d=0xa54ff53au;
${vars}e=0x510e527fu;${vars}f=0x9b05688cu;${vars}g=0x1f83d9abu;${vars}h=0x5be0cd19u;
for(${wg?'var':'int'} i=0;i<64;i++){
 if(i>=16){
  ${vars}j=w[i-15];${vars}k=w[i-2];
  w[i]=(rotr(j,7u)^rotr(j,18u)^(j>>3u))+w[i-16]+(rotr(k,17u)^rotr(k,19u)^(k>>10u))+w[i-7];
 }
 ${vars}t=h+(rotr(e,6u)^rotr(e,11u)^rotr(e,25u))+((e&f)^(~e&g))+blendK[i]+w[i];
 ${vars}u=(rotr(a,2u)^rotr(a,13u)^rotr(a,22u))+((a&b)^(a&c)^(b&c));
 h=g;g=f;f=e;e=d+t;d=c;c=b;b=a;a=t+u;
}
return ${wg?'f32':'float'}((a+0x6a09e667u)>>8u)/16777216.;}`;
}

export function makeLayerBlendShader(source,wg,tile){
 const header=shaderFunctions(wg)+'\n'+shaderHash(wg)+'\n';
 if(wg){
  const functions=header+`@group(0)@binding(13)var layerBackdrop:texture_2d<f32>;
@group(0)@binding(14)var effectMaskImage:texture_2d<f32>;
fn compositeArtwork(q:vec2i,src:vec4f,coverage:f32)->vec4f{
 let dst=textureLoad(layerBackdrop,q,0);
 var a=src.a*coverage;
 var paint=src.rgb;
 if(p.v[2].y>0.){
  var amount=p.v[2].z;
  if(p.v[2].y>1.){amount=textureLoad(effectMaskImage,q,0).r;}
  paint=effectColor(paint,amount,p.v[2].w,p.v[3].x,p.v[3].y,p.v[3].z);
 }
 let paper=(1.-dst.a)*p.v[6].w;
 if(p.v[0].z>0.){
  var measured=paint;
  if(p.v[0].z>1.){
   if(dst.a+paper<=0.){return dst;}
   measured=(dst.rgb+vec3f(paper))/max(dst.a+paper,.000001);
  }
  let value=toneChannel(measured,p.v[0].w);
  a*=toneWeight(value,p.v[1].x,p.v[1].y,p.v[1].z,p.v[1].w);
  if(p.v[2].x>0.&&a>0.){return vec4f(mix(dst.rgb,vec3f(1.,.26,.54),a*.65),max(dst.a,a));}
 }
 if(a<=0.){return dst;}
 let mode=i32(p.v[5].x);
 if(mode==24){
  let seed=(u32(p.v[4].z)<<16u)|u32(p.v[4].w);
  let xy=vec2u(p.v[0].xy+vec2f(q));
  if(a<1.&&blendHash(seed,xy.x,xy.y)>=a){return dst;}
  return vec4f(paint,1.);
 }
 let ba=dst.a+paper;
 var b=(dst.rgb+vec3f(paper))/max(ba,.000001);
 var s=paint;
 let inLinear=p.v[5].y>0.;
 if(inLinear){b=vec3f(toLinear(b.r),toLinear(b.g),toLinear(b.b));s=vec3f(toLinear(s.r),toLinear(s.g),toLinear(s.b));}
 let blend=artisticBlend(b,s,mode);
 let alpha=a+ba*(1.-a);
 var rgb=((1.-a)*ba*b+(1.-ba)*a*s+a*ba*blend)/alpha;
 if(inLinear){rgb=vec3f(toEncoded(rgb.r),toEncoded(rgb.g),toEncoded(rgb.b));}
 return vec4f(clamp(rgb*alpha-vec3f(paper*(1.-a)),vec3f(0.),vec3f(1.)),a+dst.a*(1.-a));
}\n`;
  const result=tile?'color':'d';
  return source.replace('@fragment fn fragment(',functions+'@fragment fn fragment(').replace(
   'return vec4f('+result+'.rgb*'+result+'.a,'+result+'.a);',
   'return compositeArtwork(q,'+result+',p.v[7].w*clipCoverage(q)*shapeCoverage(q));',
  );
 }
 const functions=header+`uniform highp sampler2D layerBackdrop,effectMaskImage;
vec4 compositeArtwork(ivec2 q,vec4 src,float coverage){
 int bottom=int(min(128.,params[4].y-params[0].y))-1-q.y;
 vec4 dst=texelFetch(layerBackdrop,ivec2(q.x,bottom),0);
 float a=src.a*coverage;
 vec3 paint=src.rgb;
 if(params[2].y>0.){
  float amount=params[2].z;
  if(params[2].y>1.)amount=texelFetch(effectMaskImage,q,0).r;
  paint=effectColor(paint,amount,params[2].w,params[3].x,params[3].y,params[3].z);
 }
 float paper=(1.-dst.a)*params[6].w;
 if(params[0].z>0.){
  vec3 measured=paint;
  if(params[0].z>1.){
   if(dst.a+paper<=0.)return dst;
   measured=(dst.rgb+paper)/max(dst.a+paper,.000001);
  }
  float value=toneChannel(measured,params[0].w);
  a*=toneWeight(value,params[1].x,params[1].y,params[1].z,params[1].w);
  if(params[2].x>0.&&a>0.)return vec4(mix(dst.rgb,vec3(1.,.26,.54),a*.65),max(dst.a,a));
 }
 if(a<=0.)return dst;
 int mode=int(params[5].x);
 if(mode==24){
  uint seed=(uint(params[4].z)<<16u)|uint(params[4].w);
  uvec2 xy=uvec2(params[0].xy+vec2(q));
  if(a<1.&&blendHash(seed,xy.x,xy.y)>=a)return dst;
  return vec4(paint,1.);
 }
 float ba=dst.a+paper;
 vec3 b=(dst.rgb+paper)/max(ba,.000001);
 vec3 s=paint;
 bool inLinear=params[5].y>0.;
 if(inLinear){b=vec3(toLinear(b.r),toLinear(b.g),toLinear(b.b));s=vec3(toLinear(s.r),toLinear(s.g),toLinear(s.b));}
 vec3 blend=artisticBlend(b,s,mode);
 float alpha=a+ba*(1.-a);
 vec3 rgb=((1.-a)*ba*b+(1.-ba)*a*s+a*ba*blend)/alpha;
 if(inLinear)rgb=vec3(toEncoded(rgb.r),toEncoded(rgb.g),toEncoded(rgb.b));
 return vec4(clamp(rgb*alpha-paper*(1.-a),0.,1.),a+dst.a*(1.-a));
}\n`;
 const result=tile?'color':'d';
 return source.replace('void main()',functions+'void main()').replace(
  'result=vec4('+result+'.rgb*'+result+'.a,'+result+'.a);',
  'result=compositeArtwork(q,'+result+',params[7].w*clipCoverage(q)*shapeCoverage(q));',
 );
}
