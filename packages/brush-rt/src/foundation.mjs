import {makeDab,curve,linear} from '@legacy/dynamics';
import {random} from '@legacy/random';
import {normalize} from '@legacy/input';
import {validatePreset} from '@legacy/record';

export const FOUNDATION='illustro-foundation-1';
const tau=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const copy=v=>structuredClone(v);
const finite=(x,a,b,name)=>{if(!Number.isFinite(x)||x<a||x>b)throw Error('invalid '+name);};
const keys=(v,allowed,name)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('unsupported '+name);};
const choice=(v,choices,name)=>{if(!choices.includes(v))throw Error('unsupported '+name+': '+v);};
const text=v=>{if(typeof v!=='string'||!v.length||v.length>4096)throw Error('invalid text');};
function checkCurve(c){if(!Array.isArray(c)||c.length<2||c.length>128||c[0][0]!==0||c.at(-1)[0]!==1)throw Error('invalid curve');let x=-1;for(const pair of c){if(!Array.isArray(pair)||pair.length!==2)throw Error('invalid curve');finite(pair[0],0,1,'curve x');finite(pair[1],0,1,'curve y');if(pair[0]<=x)throw Error('unordered curve');x=pair[0];}}
const sources=['pressure','velocity','tilt','azimuth','twist','direction','distance','time','random'];
const targets=['size','opacity','flow','spacing','rotation','aspect','scatter','density','grain','hue','saturation','value'];
const baseLegacy={version:1,compatibility:'illustro-brush-1',preview:'stroke:1',signature:false,size:16,opacity:1,flow:1,spacing:.09,rotation:0,follow:false,scatter:0,stabilization:0,pressureSmoothing:0,pressureCurve:linear,tip:'round',aspect:1,hardness:1,bristles:7,grain:0,grainKind:'paper',grainScale:2,grainRotation:0,sizeJitter:0,opacityJitter:0,flowJitter:0,rotationJitter:0,hueJitter:0,taperStart:0,taperEnd:0,taperMinimum:.05,exposureMs:0,blend:'normal',color:[.12,.15,.2],mappings:[]};
const textureDefault={kind:'paper',resource:null,strength:0,minimum:0,scale:2,sizeMode:'absolute',space:'paper',rotation:0,followDirection:false,invert:false,aa:false};
const envelopeDefault={mode:'none',unit:'distance',length:0,minimum:1,curve:linear};
const forceFadeDefault={scope:'brush',enabled:false,start:0,end:0,minimum:.03,curve:linear};

/** Complete, independently serializable brush settings. No mutable stroke state. */
export function createPreset(id,name,changes={}){
 const p={format:'illustro-brush-preset',version:2,engine:FOUNDATION,id,name,category:'基準ブラシ',purpose:name,kind:'mono',renderer:'auto',size:16,opacity:1,flow:1,color:[.12,.15,.2],blend:'normal',paint:'saturated',tip:{shape:'round',resource:null,aspect:1,hardness:1,angle:0,direction:false,azimuth:false,twist:false},spacing:{unit:'relative',value:.09,minimum:.25,maximum:32,exposureMs:0},pressure:{deviceCurve:linear,curve:linear,smoothing:.15,fallback:1,sizeSlope:0},stabilization:{scope:'brush',constant:.25,fast:0,speedMode:'increase',post:0},forceFade:copy(forceFadeDefault),prediction:{enabled:false,source:'auto',horizon:6,maxDistance:.75,turnCos:.95},dynamics:[],uiSizeRange:null,limits:{size:[.01,4096],opacity:[0,1],flow:[0,1]},taper:{size:{start:copy(envelopeDefault),end:copy(envelopeDefault)},opacity:{start:copy(envelopeDefault),end:copy(envelopeDefault)},flow:{start:copy(envelopeDefault),end:copy(envelopeDefault)},grain:{start:copy(envelopeDefault),end:copy(envelopeDefault)}},texture:{tip:copy(textureDefault),paper:copy(textureDefault),stroke:copy(textureDefault)},scatter:{enabled:false,radius:0,radiusMode:'relative',particleSize:1,sizeMode:'relative',density:1,bias:0,rotation:'tip'},random:[],resources:{},extensions:{}};
 return merge(p,changes);
}
function merge(a,b){const out=copy(a);for(const [k,v]of Object.entries(b)){if(v&&typeof v==='object'&&!Array.isArray(v)&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))out[k]=merge(a[k],v);else out[k]=copy(v);}return out;}
export function validateFoundation(p){
 keys(p,['format','version','engine','id','name','category','purpose','kind','renderer','size','opacity','flow','color','blend','paint','tip','spacing','pressure','stabilization','forceFade','prediction','dynamics','uiSizeRange','limits','taper','texture','scatter','random','resources','extensions'],'preset');
 if(p.format!=='illustro-brush-preset'||p.version!==2||p.engine!==FOUNDATION)throw Error('unsupported preset version');
 for(const k of ['id','name','category','purpose','kind','renderer'])text(p[k]);
 finite(p.size,.01,4096,'size');finite(p.opacity,0,1,'opacity');finite(p.flow,0,1,'flow');if(!Array.isArray(p.color)||p.color.length!==3)throw Error('invalid color');p.color.forEach(v=>finite(v,0,1,'color'));
 choice(p.blend,['normal','erase','multiply','screen'],'blend');choice(p.paint,['saturated','build-up'],'paint');
 keys(p.tip,['shape','resource','aspect','hardness','angle','direction','azimuth','twist'],'tip');text(p.tip.shape);finite(p.tip.aspect,.01,1,'aspect');finite(p.tip.hardness,0,1,'hardness');finite(p.tip.angle,-100,100,'angle');for(const k of ['direction','azimuth','twist'])if(typeof p.tip[k]!=='boolean')throw Error('invalid tip '+k);
 keys(p.spacing,['unit','value','minimum','maximum','exposureMs'],'spacing');choice(p.spacing.unit,['relative','absolute'],'spacing unit');finite(p.spacing.value,.001,4096,'spacing');finite(p.spacing.minimum,.01,4096,'minimum spacing');finite(p.spacing.maximum,p.spacing.minimum,8192,'maximum spacing');finite(p.spacing.exposureMs,0,10000,'exposure');
 keys(p.pressure,['deviceCurve','curve','smoothing','fallback','sizeSlope'],'pressure');checkCurve(p.pressure.deviceCurve);checkCurve(p.pressure.curve);finite(p.pressure.smoothing,0,1,'pressure smoothing');finite(p.pressure.fallback,0,1,'pressure fallback');if(p.pressure.sizeSlope!==undefined)finite(p.pressure.sizeSlope,0,16,'pressure size slope');
 keys(p.stabilization,['scope','constant','fast','speedMode','post'],'stabilization');choice(p.stabilization.scope,['brush','common'],'stabilization scope');choice(p.stabilization.speedMode,['increase','reduce'],'speed mode');for(const k of ['constant','fast','post'])finite(p.stabilization[k],0,1,k);
 if(p.forceFade!==undefined){keys(p.forceFade,['scope','enabled','start','end','minimum','curve'],'force fade');choice(p.forceFade.scope,['brush','common'],'force fade scope');if(typeof p.forceFade.enabled!=='boolean')throw Error('invalid force fade flag');finite(p.forceFade.start,0,1,'force fade start');finite(p.forceFade.end,0,1,'force fade end');finite(p.forceFade.minimum,0,1,'force fade minimum');checkCurve(p.forceFade.curve);}
 keys(p.prediction,['enabled','source','horizon','maxDistance','turnCos'],'prediction');if(typeof p.prediction.enabled!=='boolean')throw Error('invalid prediction');choice(p.prediction.source,['auto','browser','linear'],'prediction source');finite(p.prediction.horizon,0,12,'prediction horizon');finite(p.prediction.maxDistance,0,16,'prediction distance');finite(p.prediction.turnCos,.7,1,'turn cosine');
 if(p.uiSizeRange!==null&&p.uiSizeRange!==undefined){if(!Array.isArray(p.uiSizeRange)||p.uiSizeRange.length!==2)throw Error('invalid UI size range');finite(p.uiSizeRange[0],.01,4096,'UI size minimum');finite(p.uiSizeRange[1],p.uiSizeRange[0],4096,'UI size maximum');}
 if(!Array.isArray(p.dynamics)||p.dynamics.length>128)throw Error('invalid dynamics');for(const m of p.dynamics){keys(m,['source','target','min','max','mode','curve','input','repeat','fallback'],'mapping');choice(m.source,sources,'source');choice(m.target,targets,'target');choice(m.mode,['multiply','add','replace'],'mode');finite(m.min,-10000,10000,'mapping min');finite(m.max,m.min,10000,'mapping max');checkCurve(m.curve);if(m.input!==undefined){if(!Array.isArray(m.input)||m.input.length!==2)throw Error('invalid input range');finite(m.input[0],-1e9,1e9,'input minimum');finite(m.input[1],m.input[0]+1e-9,1e9,'input maximum');}if(m.repeat!==undefined&&typeof m.repeat!=='boolean')throw Error('invalid repeat');if(m.fallback!==undefined)finite(m.fallback,0,1,'fallback');}
 keys(p.limits,['size','opacity','flow'],'limits');for(const k of ['size','opacity','flow']){const r=p.limits[k];if(!Array.isArray(r)||r.length!==2)throw Error('invalid range');finite(r[0],k==='size'?.01:0,k==='size'?4096:1,'range');finite(r[1],r[0],k==='size'?4096:1,'range');}
 keys(p.taper,['size','opacity','flow','grain'],'taper');for(const value of Object.values(p.taper)){keys(value,['start','end'],'taper phase');for(const phase of ['start','end']){const e=value[phase];keys(e,['mode','unit','length','minimum','curve'],'envelope');choice(e.mode,phase==='start'?['none','ramp']:['none','pressure','fade','known','release'],'envelope mode');choice(e.unit,['distance','time'],'envelope unit');finite(e.length,0,1e9,'envelope length');finite(e.minimum,0,2,'envelope minimum');checkCurve(e.curve);}}
 keys(p.resources,Object.keys(p.resources??{}),'resources');if(Object.keys(p.resources).length>64)throw Error('too many resources');for(const [id,r]of Object.entries(p.resources)){text(id);keys(r,['kind','width','height','alpha','label'],'resource');choice(r.kind,['mask','texture'],'resource kind');finite(r.width,1,1024,'resource width');finite(r.height,1,1024,'resource height');if(!Number.isInteger(r.width)||!Number.isInteger(r.height)||!Array.isArray(r.alpha)||r.alpha.length!==r.width*r.height)throw Error('invalid resource');r.alpha.forEach(v=>finite(v,0,1,'resource alpha'));}
 if(p.tip.shape==='mask'&&(!Object.hasOwn(p.resources,p.tip.resource)||p.resources[p.tip.resource].kind!=='mask'))throw Error('missing or incompatible tip resource');
 keys(p.texture,['tip','paper','stroke'],'texture layers');for(const t of Object.values(p.texture)){keys(t,Object.keys(textureDefault),'texture');choice(t.kind,['paper','hatch','noise','image'],'texture kind');choice(t.sizeMode,['absolute','relative'],'texture size');choice(t.space,['paper','tip'],'texture space');finite(t.strength,0,1,'texture strength');finite(t.minimum,0,1,'texture minimum');finite(t.scale,.1,2048,'texture scale');finite(t.rotation,-100,100,'texture rotation');for(const k of ['followDirection','invert','aa'])if(typeof t[k]!=='boolean')throw Error('invalid texture flag');if(t.kind==='image'&&(!Object.hasOwn(p.resources,t.resource)||p.resources[t.resource].kind!=='texture'))throw Error('missing or incompatible texture resource');}
 keys(p.scatter,['enabled','radius','radiusMode','particleSize','sizeMode','density','bias','rotation'],'scatter');if(typeof p.scatter.enabled!=='boolean')throw Error('invalid scatter flag');choice(p.scatter.radiusMode,['relative','absolute'],'scatter radius');choice(p.scatter.sizeMode,['relative','absolute'],'particle size');choice(p.scatter.rotation,['tip','direction','center'],'particle rotation');finite(p.scatter.radius,0,4096,'scatter radius');finite(p.scatter.particleSize,.01,4096,'particle size');finite(p.scatter.density,1,64,'density');finite(p.scatter.bias,-1,1,'scatter bias');
 if(!Array.isArray(p.random)||p.random.length>64)throw Error('invalid random');for(const r of p.random){keys(r,['target','amount'],'random');choice(r.target,[...targets,'position'],'random target');finite(r.amount,0,10,'random amount');}
 keys(p.extensions,Object.keys(p.extensions??{}),'extensions');return p;
}

/** Providers are explicit: unsupported simulation/settings never silently fall back. */
export class RendererRegistry {
 constructor(){this.providers=new Map;}
 register(id,provider){text(id);if(this.providers.has(id)||typeof provider.compile!=='function')throw Error('invalid renderer provider');this.providers.set(id,provider);return ()=>this.providers.delete(id);}
 compile(p,context){const provider=this.providers.get(p.renderer);if(!provider)throw Error('renderer extension required: '+p.renderer);return provider.compile(copy(p),copy(context));}
}
export const rendererRegistry=new RendererRegistry;
export function compilePreset(input,context={}){
 const p=copy(validateFoundation(input));
 keys(context,['commonStabilization','commonForceFade','deviceCurve','knownLength','knownDuration'],'stroke context');
 if(context.deviceCurve){checkCurve(context.deviceCurve);p.pressure.deviceCurve=copy(context.deviceCurve);}
 if(p.stabilization.scope==='common'&&context.commonStabilization){keys(context.commonStabilization,['constant','fast','speedMode','post'],'common stabilization');p.stabilization={...p.stabilization,...context.commonStabilization};}
 if(p.forceFade?.scope==='common'&&context.commonForceFade){keys(context.commonForceFade,['enabled','start','end','minimum','curve'],'common force fade');p.forceFade={...p.forceFade,...copy(context.commonForceFade)};}
 for(const k of ['knownLength','knownDuration'])if(context[k]!==undefined)finite(context[k],0,1e9,k);
 validateFoundation(p);
 if(p.kind!=='mono'||!['auto','continuous','stamp','soft','sweep'].includes(p.renderer))return rendererRegistry.compile(p,context);
 if(Object.keys(p.extensions).length)throw Error('material extension requires a renderer provider');
 choice(p.tip.shape,['round','ellipse','rect','mask','bristle','star','leaf'],'tip shape');
 if(p.stabilization.post)throw Error('post correction requires explicit correctGeometry(), not live finalization');
 for(const value of Object.values(p.taper))if(value.end.mode==='known'&&context[value.end.unit==='time'?'knownDuration':'knownLength']===undefined)throw Error('known endpoint taper requires geometry context');for(const [target,value] of Object.entries(p.taper))if(value.end.mode==='release'&&target!=='size')throw Error('release taper currently supports size only');
 const active=Object.values(p.texture).filter(t=>t.strength>0);if(active.length>1)throw Error('multiple texture layers require a material provider');
 const texture=active[0]??p.texture.paper;
 const solid=p.paint==='saturated'&&p.limits.opacity[1]===1&&p.limits.flow[1]===1&&!['stamp','soft','sweep'].includes(p.renderer)&&p.tip.shape==='round'&&p.tip.hardness===1&&p.tip.aspect===1&&p.flow===1&&!texture.strength&&!p.scatter.enabled&&!p.random.length&&p.dynamics.every(m=>m.target==='size')&&['opacity','flow','grain'].every(t=>Object.values(p.taper[t]).every(e=>e.mode==='none'));
 if(p.renderer==='continuous'&&!solid)throw Error('continuous material requires round solid size-only dynamics');
 const coverageUnion=p.renderer==='sweep'&&p.paint==='saturated'&&p.tip.shape==='round'&&p.tip.aspect===1&&!p.scatter.enabled&&!p.random.length&&p.dynamics.every(m=>['size','opacity','flow','grain'].includes(m.target));
 if(p.renderer==='sweep'&&!coverageUnion)throw Error('swept coverage requires round saturated single-color material');
 const image=id=>{const r=p.resources[id];if(!r)return undefined;return {width:r.width,height:r.height,alpha:r.alpha.map(v=>Math.round(v*255)/255)};};
 const out={...copy(baseLegacy),id:p.id,name:p.name,category:p.category,purpose:p.purpose,size:p.size,opacity:p.opacity,flow:p.flow,spacing:solid?.09:Math.max(.01,Math.min(4,p.spacing.unit==='relative'?p.spacing.value:p.spacing.value/p.size)),rotation:p.tip.angle,follow:p.tip.direction,aspect:p.tip.aspect,hardness:p.tip.hardness,tip:p.tip.shape,grain:texture.strength,grainKind:texture.kind,grainScale:texture.scale,grainRotation:texture.rotation,stabilization:p.stabilization.constant,pressureSmoothing:p.pressure.smoothing,pressureCurve:p.pressure.curve,blend:p.blend,color:p.color,exposureMs:p.spacing.exposureMs,mappings:solid?p.dynamics.map(m=>({...m,source:'pressure',curve:linear})):[]};
 if(out.tip==='mask')out.mask=image(p.tip.resource);if(texture.kind==='image')out.texture=image(texture.resource);
 // Validate the compatibility surface before adding private renderer metadata.
 const forValidation={...out,mappings:[]};validatePreset(forValidation);
 out.__foundation={version:1,preset:p,context:copy(context),solid,...(coverageUnion?{coverageUnion:true}:{}),material:!solid,texture,opacity:solid?1:p.paint==='saturated'?p.opacity:1};return out;
}
function sourceValue(m,q,speed,dir,distance,time,seed,index){
 let raw;switch(m.source){case 'pressure':raw=q.valid&1?q.p:(m.fallback??q.p);break;case 'velocity':raw=speed;break;case 'tilt':raw=q.valid&2?q.tilt:(m.fallback??0);break;case 'azimuth':raw=q.valid&4?((q.azimuth%tau+tau)%tau):((m.fallback??0)*tau);break;case 'twist':raw=q.valid&8?((q.twist%tau+tau)%tau):((m.fallback??0)*tau);break;case 'direction':raw=(dir+tau)%tau;break;case 'distance':raw=distance;break;case 'time':raw=time;break;case 'random':raw=random(seed,index,100+pseudoStream(m));break;}
 const ranges={pressure:[0,1],velocity:[0,1500],tilt:[0,1],azimuth:[0,tau],twist:[0,tau],direction:[0,tau],distance:[0,500],time:[0,1000],random:[0,1]},r=m.input??ranges[m.source];let v=(raw-r[0])/(r[1]-r[0]);if(m.repeat)v=(v%1+1)%1;return m.min+(m.max-m.min)*curve(m.curve,v);
}
function pseudoStream(m){return targets.indexOf(m.target)*16+sources.indexOf(m.source);}
function envelope(e,phase,q,distance,time,context){if(e.mode==='none'||e.mode==='release')return 1;let v=1;const x=e.unit==='time'?time:distance;if(phase==='start')v=e.length?x/e.length:1;else if(e.mode==='pressure')v=q.valid&1?q.p:1;else if(e.mode==='fade')v=e.length?1-x/e.length:0;else{const total=context[e.unit==='time'?'knownDuration':'knownLength'];v=e.length?(total-x)/e.length:1;}return e.minimum+(1-e.minimum)*curve(e.curve,clamp(v));}
export function evaluateDynamics(q,renderPreset,index,seed,distance,speed,direction,time,applyEnvelopes=true){
 const f=renderPreset.__foundation,p=f.preset,values={size:p.size,opacity:1,flow:p.flow,spacing:p.spacing.value,rotation:p.tip.angle+(p.tip.direction?direction:0)+(p.tip.azimuth&&q.valid&4?q.azimuth:0)+(p.tip.twist&&q.valid&8?q.twist:0),aspect:p.tip.aspect,scatter:p.scatter.radius,density:p.scatter.density,grain:f.texture.strength,hue:0,saturation:1,value:1};
 for(const m of p.dynamics){const n=sourceValue(m,q,speed,direction,distance,time,seed,index);values[m.target]=m.mode==='multiply'?values[m.target]*n:m.mode==='add'?values[m.target]+n:n;}
 for(let i=0;i<p.random.length;i++){const r=p.random[i];if(r.target==='position')continue;const n=(random(seed,index,400+i)*2-1)*r.amount;values[r.target]=['rotation','hue'].includes(r.target)?values[r.target]+n:values[r.target]*(1+n);}
 if(applyEnvelopes)for(const target of Object.keys(p.taper))for(const phase of ['start','end'])values[target]*=envelope(p.taper[target][phase],phase,q,distance,time,f.context);
 values.size=clamp(values.size,...p.limits.size);values.opacity=clamp(values.opacity,...p.limits.opacity);values.flow=clamp(values.flow,...p.limits.flow);values.grain=clamp(values.grain);values.aspect=clamp(values.aspect,.01,1);
 values.spacing=clamp(p.spacing.unit==='relative'?values.spacing*values.size:values.spacing,p.spacing.minimum,p.spacing.maximum);
 if(p.paint==='build-up')values.opacity*=p.opacity;
 return values;
}
export function foundationDabs(q,p,index,seed,distance,speed,dir,time){
 const f=p.__foundation,b=f.preset,v=evaluateDynamics(q,p,index,seed,distance,speed,dir,time);
 const particle=b.scatter.enabled,count=particle?Math.max(1,Math.min(64,Math.round(v.density))):1,dabs=[];
 for(let j=0;j<count;j++){
  const size=particle?(b.scatter.sizeMode==='absolute'?b.scatter.particleSize:b.scatter.particleSize*v.size):v.size;
  const settings={...p,size,aspect:v.aspect,rotation:v.rotation,follow:false,opacity:f.solid?p.opacity:v.opacity,flow:v.flow,grain:v.grain,mappings:v.hue===0&&v.saturation===1&&v.value===1?[]:[{source:'pressure',target:'hue',mode:'replace',min:v.hue,max:v.hue,curve:linear},{source:'pressure',target:'saturation',mode:'replace',min:v.saturation,max:v.saturation,curve:linear},{source:'pressure',target:'value',mode:'replace',min:v.value,max:v.value,curve:linear}]};
  const d=makeDab(q,settings,index+j,seed,distance,speed,dir,time);d[14]=v.spacing/Math.max(.01,size);
  const r=stream=>random(seed,index+j,stream),position=b.random.find(a=>a.target==='position')?.amount??0;
  if(particle){const angle=r(700)*tau,u=r(701),exponent=b.scatter.bias>=0?.5+b.scatter.bias*3:.5/(1-b.scatter.bias*3),radius=(b.scatter.radiusMode==='absolute'?v.scatter:v.scatter*v.size)*u**exponent;d[0]+=Math.cos(angle)*radius;d[1]+=Math.sin(angle)*radius;if(b.scatter.rotation==='direction')d[4]+=dir;else if(b.scatter.rotation==='center')d[4]+=angle+Math.PI;}
  if(position){d[0]+=(r(702)*2-1)*position*v.size;d[1]+=(r(703)*2-1)*position*v.size;}
  dabs.push(d);
 }return {dabs,spacing:v.spacing};
}
/** Prediction uses actual points only; browser endpoints pass the same safety gate. */
export function predictFoundation(points,now,browser,preset){
 const p=preset.__foundation.preset.prediction;if(!p.enabled||!p.horizon||!p.maxDistance||preset.__foundation.preset.scatter.enabled)return null;const b=points.at(-1),a=points.at(-2),c=points.at(-3);if(!c||now-b.t>Math.min(20,p.horizon*2)||b.valid&1&&b.p<.15)return null;
 const dt=b.t-a.t,prior=a.t-c.t;if(dt<=0||dt>40||prior<=0)return null;
 const vx=(b.x-a.x)/dt,vy=(b.y-a.y)/dt,speed=Math.hypot(vx,vy),ux=(a.x-c.x)/prior,uy=(a.y-c.y)/prior,previous=Math.hypot(ux,uy),cos=(ux*vx+uy*vy)/Math.max(1e-9,previous*speed);
 if(speed<.05||previous<.05||cos<p.turnCos||speed<previous*.7||speed>previous*1.5)return null;
 let next=p.source!=='linear'?browser.find(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.t)&&v.t>b.t&&v.t-b.t<=p.horizon):null;if(!next&&p.source==='browser')return null;
 const h=Math.min(p.horizon,Math.max(0,now-b.t+2));next??={x:b.x+vx*h,y:b.y+vy*h,t:b.t+h};const dx=next.x-b.x,dy=next.y-b.y,d=Math.hypot(dx,dy);if(!d||(dx*vx+dy*vy)/(d*speed)<p.turnCos)return null;
 // Prediction never changes pressure, thickness or material state; max 0.75px by default.
 const limit=Math.min(p.maxDistance,speed*p.horizon);return {...b,x:b.x+dx*Math.min(1,limit/d),y:b.y+dy*Math.min(1,limit/d),t:next.t,predicted:true};
}
export function captureInput(e,transform=(x,y)=>[x,y],capabilities={},origin='raw'){
 const samples=e.getCoalescedEvents?.()??[],events=samples.length?samples:[e];return events.map(v=>{const [x,y]=transform(v.clientX,v.clientY);return {x,y,t:v.timeStamp,pressure:v.pressure,pointerType:v.pointerType,origin:origin==='predicted'?'predicted':samples.length?'coalesced':origin,...(origin==='predicted'?{predicted:true}:{}),...(capabilities.tilt?{tilt:Math.min(1,Math.hypot(v.tiltX??0,v.tiltY??0)/90)}:{}),...(capabilities.azimuth?{azimuth:v.azimuthAngle}:{}),...(capabilities.twist?{twist:(v.twist??0)*Math.PI/180}:{})};});
}
/** Saved settings and temporary overrides are separate; select never edits saved values. */
export class PresetState {
 constructor(presets){validatePresetList(presets);if(!presets.length)throw Error('empty brush list');this.saved=new Map(presets.map(p=>[p.id,copy(p)]));this.temporary=new Map;this.shared={};this.id=presets[0].id;}
 select(id,policy='restore'){if(!this.saved.has(id))throw Error('unknown brush');choice(policy,['restore','per-brush','shared'],'brush lock policy');if(policy==='restore')this.temporary.delete(id);this.id=id;this.policy=policy;return this.current();}
 override(values){keys(values,['size','opacity','flow','color','pressure','stabilization','prediction','taper'],'temporary settings');const next=merge(this.policy==='shared'?this.shared:this.temporary.get(this.id)??{},values),current=validateFoundation(merge(this.saved.get(this.id),next));if(this.policy==='shared')this.shared=next;else this.temporary.set(this.id,next);return current;}
 current(){const v=this.policy==='shared'?this.shared:this.temporary.get(this.id)??{};return validateFoundation(merge(this.saved.get(this.id),v));}
 commit(){this.saved.set(this.id,copy(this.current()));this.temporary.delete(this.id);}
}
function validatePresetList(presets){if(!Array.isArray(presets)||presets.length>256)throw Error('unsupported brush pack');const ids=new Set;for(const p of presets){validateFoundation(p);if(ids.has(p.id))throw Error('duplicate brush');ids.add(p.id);}}
export function exportPresets(presets){validatePresetList(presets);const json=JSON.stringify({format:'illustro-brush-pack',version:1,presets},null,2);if(json.length>32*1024*1024)throw Error('invalid brush pack');return json;}
export function importPresets(json){if(typeof json!=='string'||json.length>32*1024*1024)throw Error('invalid brush pack');const pack=JSON.parse(json);keys(pack,['format','version','presets'],'brush pack');if(pack.format!=='illustro-brush-pack'||pack.version!==1)throw Error('unsupported brush pack');validatePresetList(pack.presets);return copy(pack.presets);}
export function cursorState(preset,sample,context={}){const p=compilePreset(preset,context),q=normalize(sample),f=p.__foundation;q.p=curve(p.pressureCurve,q.valid&1?curve(f.preset.pressure.deviceCurve,q.p):f.preset.pressure.fallback);const v=evaluateDynamics(q,p,0,[0,0],0,0,0,0,false),mappings=['hue','saturation','value'].map(target=>({source:'pressure',target,mode:'replace',min:v[target],max:v[target],curve:linear})),dab=makeDab(q,{...p,size:v.size,aspect:v.aspect,rotation:v.rotation,follow:false,mappings},0,[0,0],0,0,0,0);return {shape:p.tip,resource:f.preset.tip.resource,size:v.size,aspect:v.aspect,rotation:v.rotation,color:Array.from(dab.slice(8,11)),opacity:f.preset.paint==='build-up'?v.opacity:p.opacity*v.opacity,barrelRoll:q.valid&8?q.twist:null};}
export function geometryContext(samples){const points=samples.map(normalize);let distance=0;for(let i=1;i<points.length;i++)distance+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);return {knownLength:distance,knownDuration:points.length?points.at(-1).t-points[0].t:0};}
/** Explicit edit operation. It does not run on pointerup or mutate saved artwork. */
export function correctGeometry(samples,strength=0){finite(strength,0,1,'post correction');samples.forEach(normalize);return samples.map((s,i)=>{if(!i||i===samples.length-1)return {...s};const a=samples[i-1],b=samples[i+1],dx=(a.x+b.x)*.5-s.x,dy=(a.y+b.y)*.5-s.y,scale=Math.min(strength,1/Math.max(1,Math.hypot(dx,dy)));return {...s,x:s.x+dx*scale,y:s.y+dy*scale};});}
export function textureFactor(c,x,y,p){
 const t=p.__foundation.texture;if(!c[7])return 1;
 let u=t.space==='tip'?x-c[0]:x,v=t.space==='tip'?y-c[1]:y;
 const angle=t.rotation+(t.followDirection?c[22]:0),cs=Math.cos(angle),sn=Math.sin(angle),scale=t.scale*(t.sizeMode==='relative'?c[2]:1),gx=(u*cs+v*sn)/scale,gy=(-u*sn+v*cs)/scale;
 let value;if(t.kind==='hatch')value=.15+.85*Math.abs(Math.sin((gx+gy)*Math.PI))**.7;
 else if(t.kind==='image'){const image=p.texture,sample=(a,b)=>image.alpha[((b%image.height+image.height)%image.height)*image.width+(a%image.width+image.width)%image.width];const a=(gx%1+1)%1*image.width,b=(gy%1+1)%1*image.height;if(t.aa){const ix=Math.floor(a-.5),iy=Math.floor(b-.5),fx=a-.5-ix,fy=b-.5-iy;value=(sample(ix,iy)*(1-fx)+sample(ix+1,iy)*fx)*(1-fy)+(sample(ix,iy+1)*(1-fx)+sample(ix+1,iy+1)*fx)*fy;}else value=sample(Math.floor(a),Math.floor(b));}
 else{const h=Math.imul((Math.imul(Math.floor(gx),73856093)^Math.imul(Math.floor(gy),19349663)),83492791)>>>0;value=h/4294967295;if(t.kind==='paper')value=.25+.75*value;}
 if(t.invert)value=1-value;value=t.minimum+(1-t.minimum)*value;return 1-c[7]+c[7]*value;
}
const pressureSize=(minimum,curvePoints=linear)=>({source:'pressure',target:'size',mode:'multiply',min:minimum,max:1,curve:curvePoints});
export const referenceBrushes=[
 createPreset('foundation-g-pen','Gペン',{size:16,uiSizeRange:[.75,30],limits:{size:[.75,4096]},dynamics:[pressureSize(.03,[[0,0],[.25,.12],[.6,.55],[1,1]])],pressure:{smoothing:.2,sizeSlope:1.75},forceFade:{enabled:true,start:.12,end:.4,minimum:.03,curve:[[0,0],[.35,.1],[.7,.55],[1,1]]},taper:{size:{start:{mode:'ramp',unit:'distance',length:12,minimum:.08,curve:[[0,0],[.3,.1],[.7,.55],[1,1]]},end:{mode:'none',unit:'distance',length:0,minimum:1,curve:linear}}},purpose:'筆圧の太さに、ブラシ自身の入りとペンアップ後の強制入り抜きを重ねる。'}),
 createPreset('foundation-round-pen','丸ペン',{size:4,uiSizeRange:[.3,60],dynamics:[pressureSize(.12)],pressure:{smoothing:.25},purpose:'細い曲線・小さい形・短線を筆圧で描く。'}),
 createPreset('foundation-technical','ミリペン / 製図ペン',{size:4,uiSizeRange:[.3,60],purpose:'太さと濃さが一定の線を描く。'}),
 createPreset('foundation-marker','マーカー',{size:128,uiSizeRange:[1,500],opacity:.45,purpose:'一筆の濃さを一定に保ち、別の線とは重なります。'}),
 createPreset('foundation-pencil','鉛筆',{size:4,uiSizeRange:[.3,120],flow:1,renderer:'sweep',tip:{hardness:.9},texture:{paper:{kind:'noise',strength:.9,scale:1.6}},dynamics:[pressureSize(.2),{source:'pressure',target:'flow',mode:'multiply',min:.35,max:1,curve:[[0,0],[.3,.12],[1,1]]},{source:'pressure',target:'grain',mode:'multiply',min:.55,max:1.1,curve:[[0,1],[1,0]]}],spacing:{value:.12},purpose:'筆圧で太さと黒鉛の付着量・粒状感が変わる。薄い筆圧を透明度だけで表現しない。'}),
 createPreset('foundation-hard-eraser','硬い消しゴム',{size:128,uiSizeRange:[1,1000],blend:'erase',purpose:'丸い輪郭で消す。線画と同じ連続描画を使います。'}),
 createPreset('foundation-soft-eraser','柔らかい消しゴム',{size:128,uiSizeRange:[1,1000],blend:'erase',renderer:'sweep',tip:{hardness:.05},flow:.65,spacing:{value:.12},purpose:'柔らかい輪郭で少しずつ消す。'}),
];

export function interpolateAngle(a,b,f){return a+((b-a+Math.PI)%tau+tau)%tau*f-Math.PI*f;}
