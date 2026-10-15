import * as B from '@rt/baseline-shaders';
import {PresentationPyramid} from '@rt/minification';
import {TILE,STRIDE,keysFor,commandBounds,LatestMailbox,continuous,solidTileCovered,liveAccumulation} from '@rt/model';
import * as S from '@rt/shaders';
// Solid ink and swept material share exact single-stroke MAX coverage.
// Restrict scheduling changes to the new Foundation, retaining legacy behavior.
const foundationUnion=p=>!!p?.__foundation&&(continuous(p)||!!p.__foundation.coverageUnion);
/** View-only duplicates of live preview near the seamless image edges. */
function previewShifts(bounds,width,height){
 const xs=[0],ys=[0];if(bounds.x0<0)xs.push(width);if(bounds.x1>width)xs.push(-width);
 if(bounds.y0<0)ys.push(height);if(bounds.y1>height)ys.push(-height);
 const shifts=[];for(const dx of xs)for(const dy of ys)if(dx||dy)shifts.push([dx,dy]);
 return shifts;
}
function extendPreviewBounds(bounds,commands){
 for(const c of commands){const b=commandBounds(c);
  bounds.x0=Math.min(bounds.x0,b.x0);bounds.y0=Math.min(bounds.y0,b.y0);
  bounds.x1=Math.max(bounds.x1,b.x1);bounds.y1=Math.max(bounds.y1,b.y1);
 }
}
function translatedCommand(c,dx,dy){const out=Float64Array.from(c);out[0]+=dx;out[1]+=dy;out[16]+=dx;out[17]+=dy;return out;}
function previewTranslated(state,id,dx,dy,stable){
 const translate=c=>translatedCommand(c,dx,dy);
 const point=p=>p?{...p,x:p.x+dx,y:p.y+dy}:p;
 return {...state,id,stableSource:stable,commands:(state.commands??[]).map(translate),
  tip:point(state.tip),inputTip:point(state.inputTip),previewTip:point(state.previewTip),rawTip:point(state.rawTip)};
}
const emptyPreset={hardness:1,bristles:7,aspect:1,grainScale:1,grainRotation:0,tip:'round',grainKind:'paper',blend:'normal'};
const HISTORY_GPU_BUDGET=16*1024*1024,HISTORY_TILE_RESERVATION=TILE*TILE*4*2;
const surfaceTileKey=(surfaceKey,key)=>surfaceKey+'\u0000'+key;
function canApplyHistory(backend,steps){
 const states=new Map,after=new Set;
 for(const step of steps){const patch=backend.historyPatches.get(step.id),state=states.get(step.id)??patch?.state;if(!patch||state!==(step.direction==='undo'?'applied':'undone'))return false;
  for(const [key,p]of patch.tiles){if(!backend.tiles.has(surfaceTileKey(p.surfaceKey,p.key)))return false;if(step.direction==='redo'&&!p.after&&!after.has(step.id+'\u0000'+key))return false;if(step.direction==='undo')after.add(step.id+'\u0000'+key);}
  states.set(step.id,step.direction==='undo'?'undone':'applied');
 }return true;
}
/** Apply ordered exact snapshots in the same submission as their presentation. */
function applyQueuedHistory(backend,encoder,dirty){
 const steps=backend.pendingHistory;if(!steps?.length)return;backend.pendingHistory=null;if(!canApplyHistory(backend,steps))throw Error('History snapshots changed before submission');
 const copy=(a,b)=>encoder?encoder.copyTextureToTexture({texture:a},{texture:b},[TILE,TILE]):backend.copySurface(a,b);
 for(const {id,direction}of steps){const patch=backend.historyPatches.get(id);
  for(const p of patch.tiles.values()){const t=backend.tiles.get(surfaceTileKey(p.surfaceKey,p.key));
   if(direction==='undo'){
    if(!p.after){p.after=encoder?backend.texture(TILE,TILE,'rgba8unorm'):backend.surface(TILE,TILE,backend.gl.RGBA8,backend.gl.UNSIGNED_BYTE);copy(t.layer[t.l],p.after);p.afterArchiveId=backend.layered?undefined:backend.archiveIds.get(p.key);}
    copy(p.before,t.layer[t.l]);t.committedId=p.beforeCommittedId;t.preset=p.beforePreset;
   }else{copy(p.after,t.layer[t.l]);t.committedId=id;t.preset=p.afterPreset;}
   if(!backend.layered){const archiveId=direction==='undo'?p.beforeArchiveId:p.afterArchiveId;if(archiveId===undefined)backend.archiveIds.delete(p.key);else backend.archiveIds.set(p.key,archiveId);}dirty.add(p.key);
  }patch.state=direction==='undo'?'undone':'applied';backend.historyTouch(id);
 }
}
/** M08 QA-only source pixels, uploaded once. Never written to Document or exports. */
function makeReferencePattern(){
 const n=512,a=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const cx=x>>7,cy=y>>7,xx=x&127,yy=y&127;let red=255,green=255,blue=255,alpha=255;
  if(cy===0&&cx===0){const v=(xx^yy)&1?20:245;red=green=blue=v;}
  else if(cy===0&&cx===1){const v=Math.abs(xx-yy)<=0?0:255;red=green=blue=v;}
  else if(cy===0&&cx===2){const v=(xx%4<2)?0:255;red=green=blue=v;}
  else if(cy===0&&cx===3){red=xx*2;green=255-xx*2;blue=128;}
  else if(cy===1&&cx===0){const v=((xx+yy)%6<2)?20:245;red=green=blue=v;}
  else if(cy===1&&cx===1){const d=Math.hypot(xx-64,yy-64);const v=(Math.floor(d/2)%2===0)?30:240;red=green=blue=v;}
  else if(cy===1&&cx===2){red=255;green=xx<64?32:244;blue=yy<64?28:244;}
  else if(cy===1&&cx===3){alpha=xx<64?128:255;red=alpha;green=0;blue=alpha/2;}
  else if(cy===2){const v=((xx+2*yy)%7<2)?0:255;red=green=blue=v;}
  else {const v=Math.min(255,Math.max(0,Math.round(xx*2)));red=v;green=(yy*2)&255;blue=255-v;}
  const i=(y*n+x)*4;a[i]=red;a[i+1]=green;a[i+2]=blue;a[i+3]=alpha;
 }
 return a;
}
const PRESENT_GL_VERTEX=`#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
const PRESENT_GL_FRAGMENT=`#version 300 es
precision highp float;
uniform sampler2D source;uniform vec4 viewScreen,viewDocument,viewMotion,viewOptions;
out vec4 outColor;
vec4 takePixel(ivec2 p){
 ivec2 size=textureSize(source,0);
 if(viewOptions.x>0.5||viewOptions.z>0.5)p=ivec2((p.x%size.x+size.x)%size.x,(p.y%size.y+size.y)%size.y);
 else p=clamp(p,ivec2(0),size-1);
 return texelFetch(source,p,0);
}
void main(){
 vec2 screen=vec2(gl_FragCoord.x,viewScreen.y-gl_FragCoord.y)*viewScreen.zw/viewScreen.xy;
 vec2 pos=(screen-viewScreen.zw*.5-viewMotion.xy)/viewDocument.z;
 float c=cos(viewDocument.w),s=sin(viewDocument.w);
 vec2 doc=vec2(pos.x*c+pos.y*s,-pos.x*s+pos.y*c)*viewMotion.zw+viewDocument.xy*.5;
 if(viewOptions.x<.5&&(doc.x<0.||doc.y<0.||doc.x>=viewDocument.x||doc.y>=viewDocument.y)){
  vec2 outside=max(max(-doc,doc-viewDocument.xy),vec2(0.));
  float shadow=.075*exp(-length(outside)*viewDocument.z/13.);
  outColor=vec4(vec3(.945,.955,.977)-vec3(shadow),1.);return;
 }
 float scale=max(1.,viewOptions.w);vec2 pixel=vec2(doc.x,viewOptions.z>.5?doc.y:viewDocument.y-doc.y)/scale-.5;
 ivec2 at=ivec2(floor(pixel));vec2 w=fract(pixel);
 vec4 color;float footprint=max(viewScreen.z/viewScreen.x,viewScreen.w/viewScreen.y)/viewDocument.z/scale;
 if(viewOptions.y<.5&&footprint>1.5){
 int taps=int(clamp(ceil(footprint),2.,8.));vec4 accum=vec4(0.);
 for(int yy=0;yy<8;yy++){if(yy>=taps)break;for(int xx=0;xx<8;xx++){if(xx>=taps)break;
 vec2 location=pixel+(vec2(float(xx)+.5,float(yy)+.5)/float(taps)-.5)*footprint;accum+=takePixel(ivec2(floor(location+.5)));}}
 color=accum/float(taps*taps);
 }else color=viewOptions.y>.5?takePixel(ivec2(floor(pixel+.5))):mix(mix(takePixel(at),takePixel(at+ivec2(1,0)),w.x),mix(takePixel(at+ivec2(0,1)),takePixel(at+ivec2(1,1)),w.x),w.y);
 vec3 paperColor=color.rgb+vec3(1.-color.a);
 float distanceToEdge=min(min(doc.x,doc.y),min(viewDocument.x-doc.x,viewDocument.y-doc.y))*viewDocument.z;
 float outline=(1.-smoothstep(0.,1.25,distanceToEdge))*.6;
 outColor=vec4(mix(paperColor,vec3(.60,.68,.81),outline),1.);
}`;
const PRESENT_WGSL=`struct VertexOut{@builtin(position) position:vec4f}
struct PresentView{screen:vec4f,document:vec4f,motion:vec4f,options:vec4f}
@vertex fn vertex(@builtin(vertex_index) i:u32)->VertexOut{
 var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
 var o:VertexOut;o.position=vec4f(p[i],0.,1.);return o;
}
@group(0) @binding(0) var source:texture_2d<f32>;
@group(0) @binding(1) var<uniform> view:PresentView;
fn takePixel(p:vec2i)->vec4f{
 let size=vec2i(textureDimensions(source));var q=p;
 if(view.options.x>0.5||view.options.z>0.5){q=((p%size)+size)%size;}
 else {q=clamp(p,vec2i(0),size-vec2i(1));}
 return textureLoad(source,q,0);
}
@fragment fn fragment(in:VertexOut)->@location(0) vec4f{
 let screen=in.position.xy*view.screen.zw/view.screen.xy;
 let pos=(screen-view.screen.zw*.5-view.motion.xy)/view.document.z;
 let c=cos(view.document.w);let s=sin(view.document.w);
 let doc=vec2f(pos.x*c+pos.y*s,-pos.x*s+pos.y*c)*view.motion.zw+view.document.xy*.5;
 if(view.options.x<.5&&(doc.x<0.||doc.y<0.||doc.x>=view.document.x||doc.y>=view.document.y)){
  let outside=max(max(-doc,doc-view.document.xy),vec2f(0.));
  let shadow=.075*exp(-length(outside)*view.document.z/13.);
  return vec4f(vec3f(.945,.955,.977)-vec3f(shadow),1.);
 }
 let scale=max(1.,view.options.w);let pixel=doc/scale-vec2f(.5);let at=vec2i(floor(pixel));let w=fract(pixel);
 var color:vec4f;
 let footprint=max(view.screen.z/view.screen.x,view.screen.w/view.screen.y)/view.document.z/scale;
 if(view.options.y<.5&&footprint>1.5){
 let taps=i32(clamp(ceil(footprint),2.,8.));var accum=vec4f(0.);
 for(var yy:i32=0;yy<8;yy=yy+1){if(yy>=taps){break;}
 for(var xx:i32=0;xx<8;xx=xx+1){if(xx>=taps){break;}
 let location=pixel+(vec2f(f32(xx)+.5,f32(yy)+.5)/f32(taps)-.5)*footprint;accum+=takePixel(vec2i(floor(location+.5)));}}
 color=accum/f32(taps*taps);
 }else if(view.options.y>.5){color=takePixel(vec2i(floor(pixel+.5)));}
 else{color=mix(mix(takePixel(at),takePixel(at+vec2i(1,0)),w.x),mix(takePixel(at+vec2i(0,1)),takePixel(at+vec2i(1,1)),w.x),w.y);}
 let paperColor=color.rgb+vec3f(1.-color.a);
 let distanceToEdge=min(min(doc.x,doc.y),min(view.document.x-doc.x,view.document.y-doc.y))*view.document.z;
 let outline=(1.-smoothstep(0.,1.25,distanceToEdge))*.6;
 return vec4f(mix(paperColor,vec3f(.60,.68,.81),outline),1.);
}`;
export function parameters(p=emptyPreset,x=0,y=0,n=0,mode=0,w=2048,h=1536,cw=1024,ch=768,same=false,liveBlend=0,bandSectors=64){const out=new Float32Array([x,y,n,mode,p.hardness,p.bristles,p.dualAspect??p.aspect,p.grainScale,Math.cos(p.grainRotation),Math.sin(p.grainRotation),S.kinds[p.tip],p.dual?S.kinds[p.dual]:-1,S.grainKinds[p.grainKind],S.blends[p.blend],p.__foundation?.coverageUnion?2:p.__foundation?.material?1:0,p.__foundation?.opacity??1,w,h,0,0,cw,ch,0,0,same?1:0,liveBlend,0,liveAccumulation(p)?1:0,0,bandSectors,p.__legacyStarAa?1:0,0,...new Array(32).fill(0)]);const t=p.__foundation?.texture;if(t){out[32]=t.sizeMode==='relative'?1:0;out[33]=t.space==='tip'?1:0;out[34]=t.followDirection?1:0;out[35]=t.invert?1:0;out[36]=t.minimum;out[37]=t.aa?1:0;}return out;}

// GPU-only slots 12/15 carry rotation coefficients; canonical commands are untouched.
export const pack=cs=>{const a=new Float32Array(cs.length*STRIDE);cs.forEach((c,i)=>{const at=i*STRIDE;a.set(c,at);a[at+12]=Math.cos(c[4]);a[at+15]=Math.sin(c[4]);a[at+14]=c[22];});return a;};
// Snapshot end is frozen even though its append-only source may grow before rendering.
// Only unseen geometry is visited; superseding notifications never remove geometry.
export function publishedCommands(snapshot,v){
 if(snapshot.stableSource){const end=snapshot.stableEnd,start=v.stableCursor??0;if(!Number.isInteger(end)||end<start||end>snapshot.stableSource.length)throw Error('invalid stable snapshot cursor');const cs=snapshot.stableSource.slice(start,end);v.stableCursor=end;if(cs.length)v.index=cs.at(-1)[13];return cs;}
 const cs=(snapshot.stableCommands??[]).filter(c=>c[13]>v.index);if(cs.length)v.index=cs.at(-1)[13];return cs;
}
export function previewDirty(v,stable,live,width,height,dirty,tipTime=Infinity){v.fullTiles??=new Set;v.realKeys??=new Set;for(const c of stable)for(const key of keysFor(c,width,height)){v.keys.add(key);v.realKeys.add(key);if(!v.fullTiles.has(key))dirty.add(key);if(continuous(v.preset)&&solidTileCovered(c,key))v.fullTiles.add(key);}for(const key of v.tailKeys??[])if(!v.fullTiles.has(key))dirty.add(key);v.tailKeys=new Set;for(const c of live)for(const key of keysFor(c,width,height)){v.keys.add(key);v.tailKeys.add(key);if(c[20]<=tipTime)v.realKeys.add(key);if(!v.fullTiles.has(key))dirty.add(key);}}
export function sweepPrefixCommands(v,p,published,live=[]){
 const texture=p.__foundation.texture,stable=[],worldFixed=texture.space==='paper'&&texture.sizeMode==='absolute'&&!texture.followDirection;
 const same=(a,b)=>a&&b&&a[19]===2&&b[19]===2&&a[2]>=128&&a[18]===a[2]/2&&b[18]===a[18]&&a[0]===b[16]&&a[1]===b[17]&&[2,3,5,6,7,8,9,10].every(i=>a[i]===b[i]);
 let previous=v.sweepPrevious,r=0,required=1;
 for(let i=0;i<published.length;i++){const c=published[i],next=published[i+1]??live[0],length=next?Math.hypot(next[0]-next[16],next[1]-next[17]):0;
  if(worldFixed&&same(previous,c)&&same(c,next)&&length>.2&&Math.hypot(c[0]-c[16],c[1]-c[17])>.2){const q=c.slice();q[23]=-2;q[11]=Math.atan2(next[1]-next[17],next[0]-next[16]);q[20]=Math.asin(Math.min(1,.05/length))+.001;stable.push(q);r=Math.max(r,c[2]/2);const incoming=Math.atan2(c[1]-c[17],c[0]-c[16]),turn=((q[11]-incoming+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI,extent=Math.abs(turn)+q[20]*2;required=Math.max(required,Math.ceil(extent/(2*Math.acos((c[2]/2+.5)/(c[2]/2+2)))));}else stable.push(c);
  previous=c;
 }
 v.sweepPrevious=previous;
 const sectors=2**Math.ceil(Math.log2(required));
 return {stable,prefixKeys:new Set,sectors,vertexCount:r?6+sectors*3:6};
}
export function livePrefixCommands(v,p,published,width,height,live=[]){const prefixKeys=new Set,stable=[];if(p.__foundation?.coverageUnion)return sweepPrefixCommands(v,p,published,live);if(!continuous(p))return {stable:published,prefixKeys,vertexCount:6};let old=v.circle;for(const c of published){let changed=false;for(const key of keysFor(c,width,height))if(!v.fullTiles?.has(key)){prefixKeys.add(key);changed=true;}if(changed){const incremental=c[2]>=256&&c[18]===c[2]/2&&old?.guaranteed&&old.x===c[16]&&old.y===c[17]&&old.r===c[18];if(incremental){const q=c.slice();q[23]=-1;stable.push(q);}else stable.push(c);}old={x:c[0],y:c[1],r:c[2]/2,guaranteed:!changed||c[18]===c[2]/2};}v.circle=old;const radii=stable.filter(c=>c[23]===-1).map(c=>c[2]/2),r=Math.max(0,...radii),required=r?Math.ceil(Math.PI/(2*Math.acos((r+.5)/(r+2)))):0,sectors=Math.max(16,2**Math.ceil(Math.log2(Math.max(1,required))));return {stable,prefixKeys,sectors,vertexCount:radii.length?sectors*12:6};}
function tileViewport(key,width,height,cw,ch){const [x,y]=key.split(',').map(Number),x0=Math.max(0,Math.floor(x*TILE*cw/width)),y0=Math.max(0,Math.floor(y*TILE*ch/height)),x1=Math.min(cw,Math.ceil((x+1)*TILE*cw/width)),y1=Math.min(ch,Math.ceil((y+1)*TILE*ch/height));return [x0,y0,Math.max(0,x1-x0),Math.max(0,y1-y0)];}
export function previewBatches(backend,states){
 const pending=states.filter(s=>s.id>backend.archivedThrough),batches=[];
 // Rebuild/undo/load can have committed tiles with no live feedback.
 // Still run the viewport compositor once so restored artwork becomes visible.
 if(!pending.length)return [{states:[],archive:false}];
 // Completed artwork is necessary scene geometry, not an obsolete display notification.
 // Keep every stroke; fold chronological groups into the archive in this submission.
 for(let i=0;i<pending.length;i+=4){const group=pending.slice(i,i+4),archive=i+4<pending.length;if(archive&&group.some(s=>!s.finished))throw Error('only ended feedback can be archived');batches.push({states:group,archive});}
 return batches;
}

export class TileDocument {
 constructor(width,height){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192)throw Error('invalid dimensions');this.width=width;this.height=height;this.jobs=[];this.open=new Map;this.touched=new Map;this.count=0;this.knownTime=0;this.full=new Set;this.solidSeen=new Map;}
 append(id,preset,commands,keyFilter=null,surfaceKey='default'){const solid=continuous(preset);let seen=this.solidSeen.get(id);if(solid&&!seen)this.solidSeen.set(id,seen=new Set);let touched=this.touched.get(id);if(!touched){touched={surfaceKey,keys:new Set};this.touched.set(id,touched);}else if(touched.surfaceKey!==surfaceKey)throw Error('stroke surface changed');for(const c of commands)this.knownTime=Math.max(this.knownTime,c[20]);for(const c of commands){if(solid&&c[19]===1){const tag=[0,1,2,16,17,18].map(i=>Math.fround(c[i])).join(',');if(seen.has(tag))continue;seen.add(tag);}for(const key of keysFor(c,this.width,this.height)){if(keyFilter&&!keyFilter.has(key))continue;touched.keys.add(key);const tag=surfaceKey+'\u0000'+id+':'+key;if(solid&&this.full.has(tag))continue;let j=this.open.get(tag);if(!j){j={id,key,surfaceKey,preset,commands:[],offset:0,commit:false};this.jobs.push(j);this.open.set(tag,j);}j.commands.push(c);this.count++;}}}
 end(id,preset,surfaceKey='default'){const touched=this.touched.get(id),keys=[...(touched?.keys??[])];if(touched&&touched.surfaceKey!==surfaceKey)throw Error('stroke surface changed');for(const key of keys){const tag=surfaceKey+'\u0000'+id+':'+key;this.open.delete(tag);this.jobs.push({id,key,surfaceKey,preset,commands:[],offset:0,commit:true});}this.touched.delete(id);this.solidSeen.delete(id);return keys;}
 peek(){const j=this.jobs[0];if(!j)return null;return {...j,commands:j.commands.slice(j.offset,j.offset+16),t:j.commands[j.offset]?.[20]??null};}
 complete(job){const j=this.jobs[0];if(!j||j.id!==job.id||j.key!==job.key||j.surfaceKey!==job.surfaceKey)throw Error('job ordering');const tag=j.surfaceKey+'\u0000'+j.id+':'+j.key;if(!j.commit){if(continuous(j.preset)&&job.commands.some(c=>solidTileCovered(c,j.key)))this.full.add(tag);j.offset+=job.commands.length;this.count-=job.commands.length;}if(j.commit)this.full.delete(tag);if(j.commit||j.offset===j.commands.length){this.jobs.shift();if(this.open.get(tag)===j)this.open.delete(tag);}}
 peekMany(limit=1){
  const out=[];let used=0;
  for(const j of this.jobs){if(used>=limit||out.length>=limit+32)break;const tag=j.surfaceKey+'\u0000'+j.id+':'+j.key;if(this.open.get(tag)===j)this.open.delete(tag);
   if(!j.commit&&continuous(j.preset)&&this.full.has(tag)){out.push({...j,commands:j.commands.slice(j.offset),t:j.commands[j.offset]?.[20]??null,skip:true});continue;}
   if(j.commit){out.push({...j,commands:[],t:null});used++;}else for(let offset=j.offset;offset<j.commands.length&&used<limit;offset+=16){out.push({...j,commands:j.commands.slice(offset,offset+16),t:j.commands[offset][20]});used++;}
  }return out;
 }
 get oldestTime(){let t=Infinity;for(const j of this.jobs)if(!j.commit&&!this.full.has(j.surfaceKey+'\u0000'+j.id+':'+j.key))t=Math.min(t,j.commands[j.offset]?.[20]??Infinity);return t;}
 cancel(id){
  if(this.jobs.some(j=>j.id===id&&j.commit))throw Error('cannot cancel an ended stroke');
  const touched=this.touched.get(id),surfaceKey=touched?.surfaceKey??'default',keys=[...(touched?.keys??[])];
  this.jobs=this.jobs.filter(j=>{if(j.id!==id)return true;this.count-=j.commands.length-j.offset;return false;});
  for(const [tag,j]of this.open)if(j.id===id)this.open.delete(tag);
  for(const key of keys)this.full.delete(surfaceKey+'\u0000'+id+':'+key);
  this.touched.delete(id);this.solidSeen.delete(id);return {surfaceKey,keys};
 }
 reset(){this.jobs=[];this.open.clear();this.touched.clear();this.count=0;this.knownTime=0;this.full.clear();this.solidSeen.clear();}
}
export class GpuRenderer {
 static async create(canvas,width,height,backend='auto',options={}){
  const requested=backend,selection={requested,selected:null,fallbackUsed:false,webgpu:{apiAvailable:!!navigator.gpu,attempted:false,usable:false,stage:'not-attempted',error:null}};
  if(backend!=='webgl2'){
   if(!navigator.gpu){
    selection.webgpu.stage='api-unavailable';selection.webgpu.error='navigator.gpu unavailable';
    if(backend==='webgpu')throw Error('WebGPU unavailable at api stage: navigator.gpu unavailable');
   }else{
    selection.webgpu.attempted=true;let stage='request-adapter';
    try{
     selection.webgpu.stage=stage;const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
     if(!adapter)throw Error('requestAdapter returned null');
     stage='request-device';selection.webgpu.stage=stage;const device=await adapter.requestDevice();
     stage='initialize-renderer';selection.webgpu.stage=stage;const r=new WebGpuBackend(canvas,width,height,device,adapter);await r.initialize();
     stage='ready';selection.webgpu.stage=stage;selection.webgpu.usable=true;selection.selected='webgpu';r.info.selection=selection;if(options.strokeHandoff)await initializeSparseBackend(r);return new GpuRenderer(r,width,height,options);
    }catch(e){
     const message=e instanceof Error?e.message:String(e);selection.webgpu.stage=stage;selection.webgpu.error=message;
     if(backend==='webgpu')throw Error('WebGPU unavailable at '+stage+': '+message,{cause:e});
    }
   }
  }
  selection.fallbackUsed=backend==='auto';selection.selected='webgl2';
  try{const r=new WebGlBackend(canvas,width,height,options.webglDesynchronized??true);r.info.selection=selection;if(options.strokeHandoff)await initializeSparseBackend(r);return new GpuRenderer(r,width,height,options);}
  catch(e){const message=e instanceof Error?e.message:String(e);throw Error((selection.fallbackUsed?'WebGPU unavailable ('+selection.webgpu.stage+': '+selection.webgpu.error+'); ':'')+'WebGL2 initialization failed: '+message,{cause:e});}
 }
 constructor(backend,width,height,options={}){backend.historyBudget=Number.isSafeInteger(options.historyGpuBudgetBytes)?Math.max(HISTORY_TILE_RESERVATION,Math.min(64*1024*1024,options.historyGpuBudgetBytes)):HISTORY_GPU_BUDGET;this.historyPreparing=false;this.navigationEpoch=0;this.historySupersededGpuJobs=0;this.historySupersededGpuCommands=0;this.historyBaseReuses=0;this.strokeHandoff=!!options.strokeHandoff;this.inputStarts=new Map;this.inputPreviewSamples=[];this.strokeFrames=new Map;this.presentedStrokes=new Set;this.submissionNumber=0;this.backend=backend;this.document=new TileDocument(width,height);this.mailbox=new LatestMailbox;this.snapshot=null;this.inflight=false;this.completions=[];this.confirmedTime=0;this.errors=[];this.disposed=false;this.ended=new Set;this.formalQuantum=4;this.lastGpuWork=0;this.previewStates=new Map;this.seamlessPreview=false;this.wrapPreviews=new Map;this.wrapCaches=new Map;this.confirmDelay=0;this.lastConfirmed=0;this.onComplete=null;this.needsFrame=true;this.viewPending=false;this.finishSubmission=null;this.onPresentation=null;this.performance={presentations:0,viewPresentations:0,renders:0,compositedTiles:0,compositedLayerPasses:0,supersededViews:0,samples:[]};}
 setSurfaceStack(surfaceKeys){if(!Array.isArray(surfaceKeys)||!surfaceKeys.length||new Set(surfaceKeys).size!==surfaceKeys.length||surfaceKeys.some(x=>typeof x!=='string'||!x))throw Error('invalid surface stack');if(this.backend.surfaceStack?.length===surfaceKeys.length&&surfaceKeys.every((key,i)=>key===this.backend.surfaceStack[i]))return;this.backend.setSurfaceStack(surfaceKeys);this.needsFrame=true;}
 setSeamlessPreview(enabled){this.seamlessPreview=!!enabled;}
 clearSeamlessPreviews(id){
  for(const key of this.wrapPreviews.get(id)??[]){this.previewStates.delete(key);this.backend.retirePreview(key);}
  this.wrapPreviews.delete(id);this.wrapCaches.delete(id);this.needsFrame=true;
 }
 setLive(state){
  if(this.strokeHandoff&&!this.inputStarts.has(state.id))this.inputStarts.set(state.id,{at:performance.now(),submitted:false});
  this.previewStates.set(state.id,{...state});
  if(this.seamlessPreview){
   if(state.resetPreview)for(const id of this.wrapPreviews.get(state.id)??[])this.backend.retirePreview(id);
   const source=state.stableSource??[];
   let cache=this.wrapCaches.get(state.id);
   if(!cache||cache.source!==source||cache.stableLen>source.length||state.resetPreview){
    cache={source,stableLen:0,bounds:{x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity},copies:new Map};
    this.wrapCaches.set(state.id,cache);
   }
   // Only new confirmed commands are scanned and translated. This avoids
   // O(total stroke length) work on every pen move near a seamless boundary.
   extendPreviewBounds(cache.bounds,source.slice(cache.stableLen));
   cache.stableLen=source.length;
   extendPreviewBounds(cache.bounds,state.commands??[]);
   const shifts=previewShifts(cache.bounds,this.document.width,this.document.height),active=[];
   for(const [dx,dy] of shifts){
    const name=dx+','+dy,rank=(dx>0?1:dx<0?2:0)+(dy>0?3:dy<0?6:0)-1;
    const id=this.strokeHandoff?state.id+(dx===0?0:dx>0?3:6)+(dy===0?0:dy>0?1:2):8_000_000+state.id*9+rank;
    let copy=cache.copies.get(name);
    if(!copy){copy={id,dx,dy,len:0,stable:[]};cache.copies.set(name,copy);}
    // Forced taper can replace existing commands after pointer-up.
    if(state.resetPreview||copy.len>source.length){copy.len=0;copy.stable=[];}
    for(let i=copy.len;i<source.length;i++)copy.stable.push(translatedCommand(source[i],dx,dy));
    copy.len=source.length;
    active.push(id);this.previewStates.set(id,previewTranslated(state,id,dx,dy,copy.stable));
   }
   this.wrapPreviews.set(state.id,active);
  }
  this.mailbox.set(state);this.requestPreview();
 }
 // One deferred request consumes the newest notification after an input batch.
 // Do not launch a GPU submission for every coalesced input sample.
 requestWork(){if(!this.strokeHandoff)return this.requestPreview();if(this.disposed||this.inflight||this.previewRequested)return;this.previewRequested=true;queueMicrotask(()=>{this.previewRequested=false;this.frame(performance.now());});}
 requestPreview(){if(this.strokeHandoff)return this.requestWork();if(this.disposed||this.inflight||this.previewRequested||!this.backend.immediatePreview||!foundationUnion(this.mailbox.value?.preset)||this.mailbox.value.finished)return;this.previewRequested=true;queueMicrotask(()=>{this.previewRequested=false;this.frame(performance.now());});}
 markEnded(id){this.ended.add(id);}

 presentView(now){
  if(!this.viewPending||this.backend.presentationHeld)return false;
  const started=performance.now();
  try{if(this.backend.presentView&&!this.backend.presentView())return false;}catch(e){this.errors.push(e.message);this.disposed=true;this.inflight=false;return false;}
  if(!this.backend.presentView)this.backend.presentCurrent();
  this.viewPending=false;this.recordPresentation(now,started,'view');return true;
 }
 recordPresentation(now,started,kind){const p=this.performance;p.presentations++;if(kind==='view')p.viewPresentations++;
  const sample={at:performance.now(),inputAt:this.viewRequestedAt??now,cpuMs:performance.now()-started,kind};if(this.performanceEnabled){p.samples.push(sample);if(p.samples.length>240)p.samples.shift();}this.onPresentation?.(sample);
 }
 setPerformanceEnabled(enabled){if(this.performanceEnabled===!!enabled)return;this.performanceEnabled=!!enabled;this.performance.samples=[];this.inputPreviewSamples=[];}
 performanceSummary(){const p=this.performance,a=p.samples,intervals=a.slice(1).map((v,i)=>v.at-a[i].at),p95=values=>values.length?[...values].sort((x,y)=>x-y)[Math.ceil(values.length*.95)-1]:null;
  return {scope:'submission-proxy; physical scanout and GPU execution time unmeasured',inputToPreviewSubmitP95Ms:p95(this.inputPreviewSamples.map(x=>x.submitMs)),inputToPreviewCompletionP95Ms:p95(this.inputPreviewSamples.map(x=>x.completeMs)),presentations:p.presentations,viewPresentations:p.viewPresentations,renders:p.renders,compositedTiles:p.compositedTiles,compositedLayerPasses:p.compositedLayerPasses,supersededViews:p.supersededViews,submissionFps:a.length>1?(a.length-1)*1000/(a.at(-1).at-a[0].at):null,frameIntervalP95Ms:p95(intervals),inputToSubmissionP95Ms:p95(a.filter(x=>x.kind==='view').map(x=>x.at-x.inputAt)),cpuSubmitP95Ms:p95(a.map(x=>x.cpuMs)),queueCompletionProxyMs:this.lastGpuWork,gpuExecutionMs:null,historyGpuReservedBytes:this.backend.historyReservedBytes??0,historyGpuBudgetBytes:this.backend.historyBudget??HISTORY_GPU_BUDGET,historyBaseReuses:this.historyBaseReuses,historySupersededGpuJobs:this.historySupersededGpuJobs,historySupersededGpuCommands:this.historySupersededGpuCommands,historyCachedStrokes:this.backend.historyPatches?.size??0,historyRetirementPeakBytes:this.backend.historyRetirementPeak??0,historyRetiredPendingBytes:(this.backend.historyRetired?.length??0)*TILE*TILE*4,occupiedGpuTiles:this.backend.tiles?.size??0,minificationBytes:this.backend.presentationPyramid?.bytes??0,minificationUpdates:this.backend.presentationPyramid?.updates??0,previewBytes:this.backend.previewBytes??0,previewPoolBytes:this.backend.previewPoolBytes??0,peakPreviewBytes:this.backend.peakPreviewBytes??0,formalJobs:this.document.jobs.length,formalCommands:this.document.count};
 }
 frame(now){if(this.disposed)return false;if(this.backend.poll?.()===true)this.finishSubmission?.();if(this.inflight||this.cancellingStroke||this.historyPreparing)return this.presentView(now);const latest=this.mailbox.take();if(latest?.resetPreview)this.backend.retirePreview(latest.id);if(latest)this.snapshot=latest;if(this.strokeHandoff)for(const state of this.previewStates.values())if(state.resetPreview&&this.backend.previews.get(state.id)?.resetState!==state){this.backend.retirePreview(state.id);}
 const jobs=this.strokeHandoff?boundedFormalJobs(this.document,this.snapshot&&!this.snapshot.finished?1_000_000:2_000_000):(this.confirmDelay<=0||now-this.lastConfirmed>=this.confirmDelay)?this.document.peekMany(this.snapshot&&!this.snapshot.finished?(this.lastGpuWork>32||this.snapshot.preset?.__foundation?.coverageUnion||(this.backend.immediatePreview&&foundationUnion(this.snapshot.preset))?0:1):this.formalQuantum):[],job=jobs[0]??null;if(!latest&&!job&&!this.needsFrame)return this.presentView(now);this.needsFrame=false;const s=this.snapshot;this.inflight=true;
  try{const submittedAt=performance.now(),submission=++this.submissionNumber,firstInputs=[];if(this.strokeHandoff)for(const state of this.previewStates.values()){const input=this.inputStarts.get(state.id);if(input&&!input.submitted){input.submitted=true;firstInputs.push(input);}}let finished=false;this.performance.renders++;const initialDirty=this.backend.dirtyConfirmed?.size??0;
   const finish=()=>{if(finished||this.disposed)return;finished=true;this.finishSubmission=null;const end=performance.now();if(this.performanceEnabled)for(const input of firstInputs){this.inputPreviewSamples.push({submitMs:submittedAt-input.at,completeMs:end-input.at});if(this.inputPreviewSamples.length>1200)this.inputPreviewSamples.shift();}for(const j of jobs){this.document.complete(j);if(j.t!==null)this.confirmedTime=Math.max(this.confirmedTime,j.commands.at(-1)?.[20]??0);}if(this.strokeHandoff)for(const [id,frame]of this.strokeFrames)if(frame<=submission){this.strokeFrames.delete(id);this.presentedStrokes.add(id);this.inputStarts.delete(id);}if(job)this.lastConfirmed=end;const work=end-submittedAt;this.lastGpuWork=work;this.formalQuantum=work>50?Math.max(1,Math.floor(this.formalQuantum/2)):work<34?Math.min(8,this.formalQuantum+1):this.formalQuantum;
   if(s&&s.tip){const m={stage:'gpu-complete-proxy',revision:s.revision,completedAt:end,inputAge:end-s.tip.t,latestInputAge:end-(s.inputTip??s.tip).t,tip:{...s.tip},previewTip:{...(s.previewTip??s.tip)},previewQueueAge:this.mailbox.value?.tip?Math.max(0,end-(this.mailbox.value.inputTip??this.mailbox.value.tip).t):0,oldestQueueAge:Number.isFinite(this.document.oldestTime)?Math.max(0,end-this.document.oldestTime):0,confirmedLag:Math.max(0,(s.inputTip??s.tip).t-Math.min(this.document.knownTime,this.document.oldestTime)),obsoletePreviewCount:this.mailbox.obsolete+(this.backend.obsoleteFinished??0),formalJobs:this.document.jobs.length,inFlightSubmissions:1,gpuWorkMs:work,...(this.backend.lastSubmission?{submission:{...this.backend.lastSubmission}}:{})};this.completions.push(m);if(this.completions.length>24000)this.completions.splice(0,12000);this.onComplete?.(m);}for(const j of jobs)if(j.commit&&this.ended.has(j.id)&&!this.document.jobs.some(q=>q.id===j.id)){this.backend.retirePreview(j.id);this.previewStates.delete(j.id);this.ended.delete(j.id);if(this.strokeHandoff)this.strokeFrames.set(j.id,submission+1);if(this.snapshot?.id===j.id)this.snapshot=null;}
   // Preserve a newer zoom/pan/rotation invalidation issued while GPU work was in flight.
   this.inflight=false;this.needsFrame=this.needsFrame||!!job;this.requestWork();};
   this.finishSubmission=finish;const pending=this.backend.render(s,jobs,[...this.previewStates.values()].sort((a,b)=>a.id-b.id));this.performance.compositedTiles+=this.backend.lastSubmission?.compositedTiles??initialDirty;this.performance.compositedLayerPasses+=this.backend.lastSubmission?.compositedLayerPasses??0;
   if(!this.backend.presentationHeld){this.viewPending=false;this.recordPresentation(now,submittedAt,'content');}
   Promise.resolve(pending).then(finish).catch(e=>{this.errors.push(e.message);this.inflight=false;this.disposed=true;});return true;
  }catch(e){this.errors.push(e.message);this.inflight=false;this.disposed=true;return false;}
 }
 async waitStroke(ids){const start=performance.now(),epoch=this.navigationEpoch;while(ids.some(id=>!this.presentedStrokes.has(id))){if(epoch!==this.navigationEpoch)return {superseded:true};if(this.errors.length||this.disposed)throw Error(this.errors.join(';')||'Renderer stopped');if(performance.now()-start>120000)throw Error('Stroke GPU completion timeout');await new Promise(resolve=>requestAnimationFrame(resolve));this.frame(performance.now());}for(const id of ids)this.presentedStrokes.delete(id);}
 async drain(finalFrame=true){const start=performance.now();while(this.inflight||this.document.jobs.length){if(this.errors.length)throw Error(this.errors.join(';'));if(performance.now()-start>120000)throw Error('confirmed renderer drain timeout');await new Promise(r=>requestAnimationFrame(r));this.frame(performance.now());}if(finalFrame){this.needsFrame=true;this.frame(performance.now());while(this.inflight){await new Promise(r=>requestAnimationFrame(r));this.backend.poll?.();}}if(this.errors.length)throw Error(this.errors.join(';'));}
 async read(surfaceKey='default'){await this.drain();return this.backend.read(surfaceKey);}
 async cancelStroke(id){
  if(this.ended.has(id))throw Error('cannot cancel an ended stroke');
  if(this.cancellingStroke)throw Error('stroke cancellation already pending');
  this.cancellingStroke=true;
  const copies=this.wrapPreviews.get(id)??[],started=performance.now();
  this.previewStates.delete(id);this.inputStarts.delete(id);for(const copy of copies)this.previewStates.delete(copy);
  if(this.mailbox.value?.id===id)this.mailbox.value=null;if(this.snapshot?.id===id)this.snapshot=null;
  try{
   // A submitted batch still owns its queued jobs/resources. Acknowledge it before
   // deleting remaining jobs. View-only frames remain available during this wait.
   while(this.inflight){if(this.disposed||this.errors.length)throw Error(this.errors.join(';')||'renderer disposed');if(performance.now()-started>120000)throw Error('stroke cancellation GPU timeout');await new Promise(resolve=>requestAnimationFrame(resolve));this.frame(performance.now());}
   const {surfaceKey,keys}=this.document.cancel(id);this.backend.cancelStroke(id,keys,surfaceKey);
   this.backend.retirePreview(id);for(const copy of copies)this.backend.retirePreview(copy);
   this.wrapPreviews.delete(id);this.wrapCaches.delete(id);this.needsFrame=true;
  }finally{this.cancellingStroke=false;}
  if(this.strokeHandoff)this.requestWork();else await this.drain();
 }
 async reset(){await this.drain();this.document.reset();this.backend.clear();this.snapshot=null;this.mailbox.value=null;this.ended.clear();this.inputStarts.clear();this.strokeFrames.clear();this.presentedStrokes.clear();this.previewStates.clear();this.confirmedTime=0;this.needsFrame=true;}
 async rebuildTiles(keys,entries,surfaceKey='default'){await this.drain(false);const filter=new Set(keys);if(!filter.size)return;this.backend.setPresentationHeld(true);let complete=false;try{this.backend.invalidateTiles(filter,surfaceKey);this.needsFrame=true;for(const entry of entries){this.document.append(entry.id,entry.preset,entry.commands,filter,surfaceKey);this.document.end(entry.id,entry.preset,surfaceKey);}await this.drain();complete=true;}finally{this.backend.setPresentationHeld(false);}if(complete)await this.backend.presentCurrent();}
 async prepareHistory(){
  this.historyPreparing=true;const started=performance.now();
  while(this.inflight){if(this.errors.length||this.disposed||performance.now()-started>120000)throw Error('History submission wait failed');await new Promise(resolve=>requestAnimationFrame(resolve));this.frame(performance.now());}
 }
 resumeHistory(){this.historyPreparing=false;this.requestWork();}
 discardPendingForHistory(entries,allRemoved){
  if(this.inflight)throw Error('History preparation still owns an active submission');const discarded=this.document.jobs.length>0,ids=entries.map(p=>p.id),wanted=new Set(ids),pending=new Set(this.document.jobs.map(j=>j.id));
  const baseReused=discarded&&allRemoved&&pending.size===wanted.size&&[...this.backend.tiles.values()].every(t=>!wanted.has(t.committedId));
  // Before any pending stroke reaches a layer commit, completed layer images
  // already ARE the requested base. Only its scratch coverage must be discarded.
  if(baseReused){for(const entry of entries)this.backend.cancelStroke(entry.id,entry.keys,entry.surfaceKey);this.historyBaseReuses+=ids.length;}
  if(discarded){this.historySupersededGpuJobs+=this.document.jobs.length;this.historySupersededGpuCommands+=this.document.count;this.document.reset();this.dropHistory(ids);for(const id of this.backend.previews.keys())this.backend.retirePreview(id);this.previewStates.clear();this.snapshot=null;this.mailbox.value=null;this.wrapPreviews.clear();this.wrapCaches.clear();}
  // Old completion waiters observe explicit supersession, never a fake GPU finish.
  this.navigationEpoch++;this.ended.clear();this.strokeFrames.clear();this.presentedStrokes.clear();this.inputStarts.clear();this.historyPreparing=false;return {discarded,baseReused};
 }
 async applyHistory(steps){
  await this.drain(false);if(!canApplyHistory(this.backend,steps))return false;
  this.backend.pendingHistory=steps;this.needsFrame=true;await this.drain();return true;
 }
 async rebuildTileGroups(groups){
  await this.drain(false);this.backend.setPresentationHeld(true);let complete=false;
  try{for(const {keys,entries,surfaceKey}of groups){const filter=new Set(keys);if(!filter.size)continue;this.backend.invalidateTiles(filter,surfaceKey);for(const entry of entries){this.document.append(entry.id,entry.preset,entry.commands,filter,surfaceKey);this.document.end(entry.id,entry.preset,surfaceKey);}}this.needsFrame=true;await this.drain();complete=true;}
  finally{this.backend.setPresentationHeld(false);}if(complete)await this.backend.presentCurrent();
 }
 async undoCommit(id){await this.drain(false);const ok=await this.backend.undoCommit(id);if(!ok)return false;this.needsFrame=true;await this.drain();return true;}
 async redoCommit(id){await this.drain(false);const ok=await this.backend.redoCommit(id);if(!ok)return false;this.needsFrame=true;await this.drain();return true;}
 dropHistory(ids){this.backend.dropHistory(ids);}
 destroy(){if(this.backend.sparsePreview)destroySparse(this.backend);this.disposed=true;this.wrapPreviews.clear();this.wrapCaches.clear();this.backend.destroy();}
 setViewTransform(values){const previous=this.backend.viewTransform;if(previous&&previous.length===values.length&&values.every((v,i)=>v===previous[i]))return;
  if(this.viewPending)this.performance.supersededViews++;this.backend.setViewTransform(values);this.viewPending=true;this.viewRequestedAt=performance.now();}
 get info(){return this.backend.info;}
}
class WebGlBackend {
 constructor(canvas,width,height,desynchronized=true){this.immediatePreview=true;this.canvas=canvas;this.width=width;this.height=height;this.presentationHeld=false;this.viewTransform=null;this.historyPatches=new Map;this.historyOrder=[];this.historyReservedBytes=0;this.historyRejectedId=-1;const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:true,desynchronized});if(!gl||!gl.getExtension('EXT_color_buffer_float'))throw Error('WebGL2 float render targets unavailable');this.gl=gl;this.tiles=new Map;this.surfaceStack=['default'];this.layered=false;this.previews=new Map;this.dirtyConfirmed=new Set;this.archiveIds=new Map;this.archivedThrough=-1;this.obsoleteFinished=0;this.images=new Map;this.maskKeys=new WeakMap;this.resources=[];this.uniforms=new Map;this.fence=null;this.pending=null;this.lost=false;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.pending?.reject(Error('GPU context lost; raw strokes remain exportable'));});this.deposit=this.program(B.glQuad,B.glDeposit);this.foundationDeposit=this.program(S.glQuad,S.glDeposit);this.live=this.program(B.glLiveVertex,B.glLive);this.foundationLive=this.program(S.glLiveVertex,S.glLive);this.foundationSweepPlain=this.program(S.glLiveVertex,S.glSweepPlain);this.solidLive=this.program(B.glLiveVertex,B.glSolidLive);this.display=this.program(S.glDisplayVertex,S.glDisplay);this.sweepDisplay=this.program(S.glDisplayVertex,S.glSweepDisplay);this.present=this.program(PRESENT_GL_VERTEX,PRESENT_GL_FRAGMENT);this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);this.buffer=gl.createBuffer();this.liveTarget=this.surface(this.width,this.height,gl.RGBA8,gl.UNSIGNED_BYTE);this.archiveTarget=this.surface(this.width,this.height,gl.RGBA8,gl.UNSIGNED_BYTE);this.referenceImage=this.surface(512,512,gl.RGBA8,gl.UNSIGNED_BYTE);gl.bindTexture(gl.TEXTURE_2D,this.referenceImage.t);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,512,512,gl.RGBA,gl.UNSIGNED_BYTE,makeReferencePattern());this.zeroStroke=this.surface(TILE,TILE,gl.RGBA32F,gl.FLOAT);this.zeroLayer=this.surface(TILE,TILE,gl.RGBA8,gl.UNSIGNED_BYTE);this.defaultImage=this.image(null);this.zeroLive=this.surface(1,1,this.gl.RGBA16F,this.gl.HALF_FLOAT);const attrs=gl.getContextAttributes();this.info={backend:'WebGL2',desynchronized:!!attrs.desynchronized,alpha:!!attrs.alpha,premultipliedAlpha:!!attrs.premultipliedAlpha,artworkAlpha:true,presentationOpaque:true,renderer:gl.getParameter(gl.RENDERER),hardwareVerified:false};this.presentationPyramid=new PresentationPyramid(this,PRESENT_GL_VERTEX);this.presentationPyramid.initialize();this.presentCurrent();}
 program(v,f){const g=this.gl,p=g.createProgram();for(const [kind,src] of [[g.VERTEX_SHADER,v],[g.FRAGMENT_SHADER,f]]){const s=g.createShader(kind);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));g.attachShader(p,s);g.deleteShader(s);}g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));this.resources.push(['program',p]);return p;}
 surface(w,h,format,type,withDepth=false){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texImage2D(g.TEXTURE_2D,0,format,w,h,0,g.RGBA,type,null);const f=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,f);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,t,0);let depth=null;if(withDepth){depth=g.createRenderbuffer();g.bindRenderbuffer(g.RENDERBUFFER,depth);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT16,w,h);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,depth);}if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('incomplete framebuffer');g.clearColor(0,0,0,0);g.depthMask(true);g.clearDepth(1);g.clear(g.COLOR_BUFFER_BIT|(depth?g.DEPTH_BUFFER_BIT:0));return {t,f,w,h,depth};}
 release(a){const g=this.gl;g.deleteTexture(a.t);if(a.f)g.deleteFramebuffer(a.f);if(a.depth)g.deleteRenderbuffer(a.depth);}
 copySurface(src,dst){const g=this.gl;g.bindFramebuffer(g.READ_FRAMEBUFFER,src.f);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,dst.f);g.blitFramebuffer(0,0,TILE,TILE,0,0,TILE,TILE,g.COLOR_BUFFER_BIT,g.NEAREST);}
 historyTouch(id){const i=this.historyOrder.indexOf(id);if(i>=0)this.historyOrder.splice(i,1);this.historyOrder.push(id);}
 historyRelease(id){const patch=this.historyPatches.get(id);if(!patch)return;for(const p of patch.tiles.values()){this.release(p.before);if(p.after)this.release(p.after);}this.historyReservedBytes=Math.max(0,this.historyReservedBytes-patch.tiles.size*HISTORY_TILE_RESERVATION);this.historyPatches.delete(id);const i=this.historyOrder.indexOf(id);if(i>=0)this.historyOrder.splice(i,1);}
 historyReserve(id){while(this.historyReservedBytes+HISTORY_TILE_RESERVATION>(this.historyBudget??HISTORY_GPU_BUDGET)){const victim=this.historyOrder.find(x=>x!==id);if(victim===undefined)return false;this.historyRelease(victim);}this.historyReservedBytes+=HISTORY_TILE_RESERVATION;return true;}
 captureBefore(id,key,t,preset){if(this.presentationHeld||this.historyRejectedId===id)return;let patch=this.historyPatches.get(id);if(!patch){patch={state:'applied',tiles:new Map};this.historyPatches.set(id,patch);this.historyTouch(id);}const qualified=surfaceTileKey(t.surfaceKey,key);if(patch.tiles.has(qualified))return;if(!this.historyReserve(id)){this.historyRelease(id);this.historyRejectedId=id;return;}const before=this.surface(TILE,TILE,this.gl.RGBA8,this.gl.UNSIGNED_BYTE);this.copySurface(t.layer[t.l],before);patch.tiles.set(qualified,{surfaceKey:t.surfaceKey,key,before,after:null,beforeCommittedId:t.committedId??-1,beforePreset:t.preset,afterPreset:preset,beforeArchiveId:this.layered?undefined:this.archiveIds.get(key),afterArchiveId:undefined});}
 async undoCommit(id){const patch=this.historyPatches.get(id);if(!patch||patch.state!=='applied')return false;for(const p of patch.tiles.values()){const t=this.tiles.get(surfaceTileKey(p.surfaceKey,p.key));if(!t)return false;if(!p.after){p.after=this.surface(TILE,TILE,this.gl.RGBA8,this.gl.UNSIGNED_BYTE);this.copySurface(t.layer[t.l],p.after);p.afterArchiveId=this.layered?undefined:this.archiveIds.get(p.key);}this.copySurface(p.before,t.layer[t.l]);t.committedId=p.beforeCommittedId;t.preset=p.beforePreset;if(!this.layered){if(p.beforeArchiveId===undefined)this.archiveIds.delete(p.key);else this.archiveIds.set(p.key,p.beforeArchiveId);}this.dirtyConfirmed.add(p.key);}patch.state='undone';this.historyTouch(id);return true;}
 async redoCommit(id){const patch=this.historyPatches.get(id);if(!patch||patch.state!=='undone')return false;for(const p of patch.tiles.values()){const t=this.tiles.get(surfaceTileKey(p.surfaceKey,p.key));if(!t||!p.after)return false;this.copySurface(p.after,t.layer[t.l]);t.committedId=id;t.preset=p.afterPreset;if(!this.layered){if(p.afterArchiveId===undefined)this.archiveIds.delete(p.key);else this.archiveIds.set(p.key,p.afterArchiveId);}this.dirtyConfirmed.add(p.key);}patch.state='applied';this.historyTouch(id);return true;}
 dropHistory(ids){for(const id of ids)this.historyRelease(id);}
 setPresentationHeld(held){this.presentationHeld=held;}
 setViewTransform(values){this.viewTransform=new Float32Array(values);}
 presentView(){const g=this.gl;if(this.lost)throw Error('WebGL context lost');
  if(this.viewFence){const status=g.clientWaitSync(this.viewFence,0,0);if(status===g.TIMEOUT_EXPIRED)return false;g.deleteSync(this.viewFence);this.viewFence=null;if(status===g.WAIT_FAILED)throw Error('presentation fence failed');}
  this.presentCurrent();this.viewFence=g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE,0);g.flush();return true;
 }
 presentCurrent(){const g=this.gl,values=this.viewTransform??new Float32Array([this.canvas.width,this.canvas.height,this.canvas.clientWidth||this.width,this.canvas.clientHeight||this.height,this.width,this.height,1,0,0,0,1,1,0,0,0,0]),image=this.presentationPyramid.source(values);const a=values.slice();a[15]=image.scale;g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,this.canvas.width,this.canvas.height);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.bindVertexArray(this.vao);g.useProgram(this.present);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,image.source.t);g.uniform1i(this.uniformLocation(this.present,'source'),0);for(const [i,n]of ['viewScreen','viewDocument','viewMotion','viewOptions'].entries())g.uniform4fv(this.uniformLocation(this.present,n),a.subarray(i*4,i*4+4));g.drawArrays(g.TRIANGLES,0,3);g.flush();}
 image(mask){let key=mask?this.maskKeys.get(mask):'default';if(mask&&!key){key=JSON.stringify(mask);this.maskKeys.set(mask,key);}if(this.images.has(key))return this.images.get(key);const g=this.gl,w=mask?.width??1,h=mask?.height??1,a=new Uint8Array(w*h*4);for(let i=0;i<w*h;i++)a[i*4]=Math.round((mask?.alpha[i]??1)*255);const s=this.surface(w,h,g.RGBA8,g.UNSIGNED_BYTE);g.bindTexture(g.TEXTURE_2D,s.t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,a);this.images.set(key,s);return s;}
 tile(key,surfaceKey='default'){const qualified=surfaceTileKey(surfaceKey,key);let t=this.tiles.get(qualified);if(!t){if(this.tiles.size>=4096)throw Error('document tile limit');const [x,y]=key.split(',').map(Number);t={key,surfaceKey,x:x*TILE,y:y*TILE,layer:[this.surface(TILE,TILE,this.gl.RGBA8,this.gl.UNSIGNED_BYTE),this.surface(TILE,TILE,this.gl.RGBA8,this.gl.UNSIGNED_BYTE)],l:0,stroke:null,s:0,active:null,preset:emptyPreset};this.tiles.set(qualified,t);}return t;}
 setSurfaceStack(surfaceKeys){this.surfaceStack=[...surfaceKeys];this.layered=!!this.sparsePreview||!(surfaceKeys.length===1&&surfaceKeys[0]==='default');this.archiveIds.clear();this.archivedThrough=-1;for(const t of this.tiles.values())this.dirtyConfirmed.add(t.key);for(const v of this.previews.values())for(const key of v.keys??[])this.dirtyConfirmed.add(key);}
 uniformLocation(program,name){let locations=this.uniforms.get(program);if(!locations)this.uniforms.set(program,locations=new Map);if(!locations.has(name))locations.set(name,this.gl.getUniformLocation(program,name));return locations.get(name);}
 use(program,params,textures={}){const g=this.gl;g.useProgram(program);g.uniform4fv(this.uniformLocation(program,'params'),params);let i=0;for(const [name,s]of Object.entries(textures)){g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,s.t);g.uniform1i(this.uniformLocation(program,name),i++);}}
 render(snapshot,jobs,states=[]){const submissionStart=performance.now(),diagnostics={publishedCommands:0,liveCommands:0,dirtyTiles:0,tailClearPixels:0,previewPasses:0,compositedTiles:0,compositedLayerPasses:0};const dirty=new Set(this.dirtyConfirmed);this.dirtyConfirmed.clear();const g=this.gl;if(this.lost)throw Error('GPU context lost');g.bindVertexArray(this.vao);applyQueuedHistory(this,null,dirty);const batches=this.layered?[{states,archive:false}]:previewBatches(this,states);
  if(this.sparsePreview)renderSparseGl(this,states,dirty,diagnostics);else{
  for(const batch of batches){for(const snapshot of batch.states){const p=snapshot.preset,live=snapshot.commands??[],mp=this.image(p.mask),gp=this.image(p.texture);let v=this.previews.get(snapshot.id);if(!v){v={id:snapshot.id,surfaceKey:snapshot.surfaceKey??'default',preset:p,prefix:this.surface(this.width,this.height,g.RGBA16F,g.HALF_FLOAT,continuous(p)),tail:this.surface(this.width,this.height,g.RGBA16F,g.HALF_FLOAT),index:-1,keys:new Set};this.previews.set(v.id,v);}if(v.surfaceKey!==(snapshot.surfaceKey??'default'))throw Error('preview surface changed');if(v.lastState===snapshot)continue;v.lastState=snapshot;const published=publishedCommands(snapshot,v);const {stable,vertexCount,sectors}=livePrefixCommands(v,p,published,this.width,this.height,live);const oldTail=v.tailKeys??[];previewDirty(v,stable,live,this.width,this.height,dirty,snapshot.inputTip?.t??snapshot.tip?.t??Infinity);diagnostics.publishedCommands+=stable.length;diagnostics.liveCommands+=live.length;diagnostics.dirtyTiles+=dirty.size;for(const [target,commands,clear]of [[v.prefix,stable,false],[v.tail,live,true]]){if(!commands.length&&(!clear||!oldTail.size))continue;diagnostics.previewPasses++;g.bindFramebuffer(g.FRAMEBUFFER,target.f);g.viewport(0,0,this.width,this.height);if(clear){g.clearColor(0,0,0,0);g.enable(g.SCISSOR_TEST);for(const key of oldTail){const [x,y,w,h]=tileViewport(key,this.width,this.height,this.width,this.height);if(!w||!h)continue;g.scissor(x,this.height-y-h,w,h);g.clear(g.COLOR_BUFFER_BIT);diagnostics.tailClearPixels+=w*h;}g.disable(g.SCISSOR_TEST);}if(!commands.length)continue;const program=continuous(p)?this.solidLive:p.__foundation?.coverageUnion&&commands.every(c=>c[7]===0)?this.foundationSweepPlain:p.__foundation?this.foundationLive:this.live;const depth=!clear&&target.depth;if(depth){g.enable(g.DEPTH_TEST);g.depthFunc(g.LESS);g.depthMask(false);}else g.disable(g.DEPTH_TEST);g.enable(g.BLEND);g.blendEquation(liveAccumulation(p)?g.FUNC_ADD:g.MAX);g.blendFunc(g.ONE,liveAccumulation(p)?g.ONE_MINUS_SRC_ALPHA:g.ONE);this.use(program,parameters(p,0,0,commands.length,0,this.width,this.height,this.width,this.height,false,0,sectors),{maskImage:mp,grainImage:gp});g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,pack(commands),g.DYNAMIC_DRAW);for(let i=0;i<6;i++){g.enableVertexAttribArray(i);g.vertexAttribPointer(i,4,g.FLOAT,false,96,i*16);g.vertexAttribDivisor(i,1);}if(commands.length){g.depthMask(false);g.drawArraysInstanced(g.TRIANGLES,0,clear?6:vertexCount,commands.length);if(depth){g.depthMask(true);this.use(continuous(p)?this.solidLive:p.__foundation?this.foundationLive:this.live,parameters(p,0,0,commands.length,1,this.width,this.height,this.width,this.height,false,0,sectors),{maskImage:mp,grainImage:gp});g.drawArraysInstanced(g.TRIANGLES,0,clear?6:vertexCount,commands.length);}}g.disable(g.DEPTH_TEST);g.depthMask(true);for(let i=0;i<6;i++){g.disableVertexAttribArray(i);g.vertexAttribDivisor(i,0);}g.disable(g.BLEND);}}
   const overlays=[];for(const v of this.previews.values())overlays.push({id:v.id,surfaceKey:v.surfaceKey,preset:v.preset,texture:v.prefix},{id:v.id,surfaceKey:v.surfaceKey,preset:v.preset,texture:v.tail});
   g.bindFramebuffer(g.FRAMEBUFFER,this.liveTarget.f);g.viewport(0,0,this.width,this.height);
   for(const key of dirty){diagnostics.compositedTiles++;
    if(this.layered){
     const [vx,vy,vw,vh]=tileViewport(key,this.width,this.height,this.width,this.height);if(!vw||!vh)continue;g.enable(g.SCISSOR_TEST);g.scissor(vx,this.height-vy-vh,vw,vh);g.disable(g.BLEND);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.disable(g.SCISSOR_TEST);g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);
     for(const surfaceKey of this.surfaceStack){const t=this.tiles.get(surfaceTileKey(surfaceKey,key)),surfaceOverlays=overlays.filter(o=>o.surfaceKey===surfaceKey);if(!t&&!surfaceOverlays.length)continue;const [tx,ty]=key.split(',').map(Number),tp=t?.preset??emptyPreset,params=parameters(tp,tx*TILE,ty*TILE,0,0,this.width,this.height,this.width,this.height);params[24]=t?.active??-1;params[25]=t?.committedId??-1;params[26]=surfaceOverlays.length;params[28]=-1;const textures={layer:t?.layer[t.l]??this.zeroLayer,src:t?.stroke?.[t.s]??this.zeroStroke,archiveImage:this.archiveTarget};for(let i=0;i<8;i++){textures['liveImage'+i]=surfaceOverlays[i]?.texture??this.zeroLive;params[32+i*4]=surfaceOverlays[i]?.id??-1;params[33+i*4]=S.blends[surfaceOverlays[i]?.preset.blend??'normal'];params[34+i*4]=surfaceOverlays[i]?.preset.__foundation?.opacity??surfaceOverlays[i]?.preset.opacity??1;params[35+i*4]=surfaceOverlays[i]?.preset.__foundation?.coverageUnion?3:surfaceOverlays[i]?.preset.__foundation?.material?2:surfaceOverlays[i]&&liveAccumulation(surfaceOverlays[i].preset)?1:0;}const direct=surfaceOverlays.length===2&&(continuous(surfaceOverlays[0].preset)||foundationUnion(surfaceOverlays[0].preset))&&t?.active==null&&surfaceOverlays[0].id>(t?.committedId??-1);if(direct&&!surfaceOverlays[0].preset.__foundation)params[34]=1;this.use(direct?this.sweepDisplay:this.display,params,direct?{layer:textures.layer,liveImage0:textures.liveImage0,liveImage1:textures.liveImage1}:textures);g.drawArrays(g.TRIANGLES,0,6);diagnostics.compositedLayerPasses++;}g.disable(g.BLEND);
    }else{
     const t=this.tiles.get(surfaceTileKey('default',key)),[tx,ty]=key.split(',').map(Number),tp=t?.preset??emptyPreset,params=parameters(tp,tx*TILE,ty*TILE,0,0,this.width,this.height,this.width,this.height);params[24]=t?.active??-1;params[25]=t?.committedId??-1;params[26]=overlays.length;params[28]=this.archiveIds.get(key)??-1;const textures={layer:t?.layer[t.l]??this.zeroLayer,src:t?.stroke?.[t.s]??this.zeroStroke,archiveImage:this.archiveTarget};for(let i=0;i<8;i++){textures['liveImage'+i]=overlays[i]?.texture??this.zeroLive;params[32+i*4]=overlays[i]?.id??-1;params[33+i*4]=S.blends[overlays[i]?.preset.blend??'normal'];params[34+i*4]=overlays[i]?.preset.__foundation?.opacity??overlays[i]?.preset.opacity??1;params[35+i*4]=overlays[i]?.preset.__foundation?.coverageUnion?3:overlays[i]?.preset.__foundation?.material?2:overlays[i]&&liveAccumulation(overlays[i].preset)?1:0;}const direct=overlays.length===2&&(continuous(overlays[0].preset)||foundationUnion(overlays[0].preset))&&t?.active==null&&!this.archiveIds.has(key)&&overlays[0].id>(t?.committedId??-1);if(direct&&!overlays[0].preset.__foundation)params[34]=1;this.use(direct?this.sweepDisplay:this.display,params,direct?{layer:textures.layer,liveImage0:textures.liveImage0,liveImage1:textures.liveImage1}:textures);g.drawArrays(g.TRIANGLES,0,6);diagnostics.compositedLayerPasses++;
    }
   }
   if(batch.archive&&!this.layered){g.bindFramebuffer(g.READ_FRAMEBUFFER,this.liveTarget.f);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,this.archiveTarget.f);g.blitFramebuffer(0,0,this.width,this.height,0,0,this.width,this.height,g.COLOR_BUFFER_BIT,g.NEAREST);for(const v of this.previews.values()){this.archivedThrough=Math.max(this.archivedThrough,v.id);for(const key of v.realKeys??[])this.archiveIds.set(key,Math.max(this.archiveIds.get(key)??-1,v.id));this.release(v.prefix);this.release(v.tail);}this.previews.clear();}this.presentationPyramid.invalidate(dirty);dirty.clear();
  }
  }
  if(!this.presentationHeld)this.presentCurrent();
  for(const job of jobs){if(job.skip)continue;this.dirtyConfirmed.add(job.key);const existed=this.tiles.has(surfaceTileKey(job.surfaceKey,job.key)),t=this.tile(job.key,job.surfaceKey),solid=continuous(job.preset);if(!existed)t.uncommittedOwner=job.id;if(!job.commit)this.captureBefore(job.id,job.key,t,job.preset);if(t.active!==job.id&&!job.commit){if(t.stroke)for(const s of t.stroke)this.release(s);t.stroke=[this.surface(TILE,TILE,solid?g.RGBA16F:g.RGBA32F,solid?g.HALF_FLOAT:g.FLOAT),this.surface(TILE,TILE,solid?g.RGBA16F:g.RGBA32F,solid?g.HALF_FLOAT:g.FLOAT)];t.s=0;t.active=job.id;t.previousPreset=t.preset;t.preset=job.preset;}if(!t.stroke)throw Error('commit has no stroke');const target=job.commit?t.layer[1-t.l]:t.stroke[solid?t.s:1-t.s];g.bindFramebuffer(g.FRAMEBUFFER,target.f);g.viewport(0,0,TILE,TILE);if(solid&&!job.commit){g.enable(g.BLEND);g.blendEquation(g.MAX);g.blendFunc(g.ONE,g.ONE);this.use(this.solidLive,parameters(job.preset,t.x,t.y,job.commands.length,2,TILE,TILE,TILE,TILE),{maskImage:this.image(job.preset.mask),grainImage:this.image(job.preset.texture)});g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,pack(job.commands),g.DYNAMIC_DRAW);for(let i=0;i<6;i++){g.enableVertexAttribArray(i);g.vertexAttribPointer(i,4,g.FLOAT,false,96,i*16);g.vertexAttribDivisor(i,1);}g.drawArraysInstanced(g.TRIANGLES,0,6,job.commands.length);for(let i=0;i<6;i++){g.disableVertexAttribArray(i);g.vertexAttribDivisor(i,0);}g.disable(g.BLEND);}else{const params=parameters(job.preset,t.x,t.y,job.commands.length,job.commit?1:0);const program=job.preset.__foundation?this.foundationDeposit:this.deposit;this.use(program,params,{src:t.stroke[t.s],layer:t.layer[t.l],maskImage:this.image(job.preset.mask),grainImage:this.image(job.preset.texture)});const data=new Float32Array(96*4);data.set(pack(job.commands));g.uniform4fv(this.uniformLocation(program,'commands'),data);g.drawArrays(g.TRIANGLES,0,3);}if(job.commit){t.l=1-t.l;t.committedId=job.id;t.active=null;delete t.uncommittedOwner;delete t.previousPreset;if(!this.layered&&(this.archiveIds.get(job.key)??Infinity)<=job.id)this.archiveIds.delete(job.key);for(const s of t.stroke)this.release(s);t.stroke=null;}else if(!solid)t.s=1-t.s;}
  this.lastSubmission={...diagnostics,cpuSubmitMs:performance.now()-submissionStart};const err=g.getError();if(err!==g.NO_ERROR)throw Error('WebGL error '+err);this.fence=g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE,0);g.flush();return new Promise((resolve,reject)=>{this.pending={resolve,reject};});
 }
 poll(){if(!this.fence)return;const g=this.gl,s=g.clientWaitSync(this.fence,0,0);if(s===g.ALREADY_SIGNALED||s===g.CONDITION_SATISFIED){g.deleteSync(this.fence);this.fence=null;const p=this.pending;this.pending=null;p.resolve();return true;}else if(s===g.WAIT_FAILED){g.deleteSync(this.fence);this.fence=null;this.pending.reject(Error('GPU fence failed'));this.pending=null;}}
 readViewport(){const g=this.gl,w=this.width,h=this.height,a=new Uint8Array(w*h*4),out=new Uint8ClampedArray(a.length);g.bindFramebuffer(g.FRAMEBUFFER,this.liveTarget.f);g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,a);for(let y=0;y<h;y++)out.set(a.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);return out;}
 read(surfaceKey='default'){const g=this.gl,out=new Uint8ClampedArray(this.width*this.height*4);for(const t of this.tiles.values()){if(t.surfaceKey!==surfaceKey)continue;g.bindFramebuffer(g.FRAMEBUFFER,t.layer[t.l].f);const a=new Uint8Array(TILE*TILE*4);g.readPixels(0,0,TILE,TILE,g.RGBA,g.UNSIGNED_BYTE,a);for(let y=0;y<TILE&&t.y+y<this.height;y++){const n=Math.min(TILE,this.width-t.x);out.set(a.subarray(y*TILE*4,(y*TILE+n)*4),((t.y+y)*this.width+t.x)*4);}}return out;}
 retirePreview(id){const v=this.previews.get(id);if(v?.tiles){retireSparsePreview(this,v);return;}if(v){for(const key of v.keys)this.dirtyConfirmed.add(key);this.release(v.prefix);this.release(v.tail);this.previews.delete(id);}}
 cancelStroke(id,keys,surfaceKey){for(const key of keys){const qualified=surfaceTileKey(surfaceKey,key),t=this.tiles.get(qualified);if(t?.active!==id)continue;for(const s of t.stroke??[])this.release(s);t.stroke=null;t.active=null;t.preset=t.previousPreset??emptyPreset;delete t.previousPreset;if(t.uncommittedOwner===id){for(const s of t.layer)this.release(s);this.tiles.delete(qualified);}this.dirtyConfirmed.add(key);}this.dropHistory([id]);}
 invalidateTiles(keys,surfaceKey='default'){for(const key of keys){const qualified=surfaceTileKey(surfaceKey,key),t=this.tiles.get(qualified);if(t){for(const s of t.layer)this.release(s);if(t.stroke)for(const s of t.stroke)this.release(s);this.tiles.delete(qualified);}if(!this.layered)this.archiveIds.delete(key);this.dirtyConfirmed.add(key);}}
 clear(){this.presentationPyramid.clear();for(const id of this.previews.keys())this.retirePreview(id);for(const id of [...this.historyPatches.keys()])this.historyRelease(id);for(const t of this.tiles.values()){for(const s of t.layer)this.release(s);if(t.stroke)for(const s of t.stroke)this.release(s);}this.tiles.clear();this.dirtyConfirmed.clear();this.archiveIds.clear();this.archivedThrough=-1;this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.liveTarget.f);this.gl.clearColor(0,0,0,0);this.gl.clear(this.gl.COLOR_BUFFER_BIT);}
 destroy(){if(this.viewFence)this.gl.deleteSync(this.viewFence);if(this.fence)this.gl.deleteSync(this.fence);this.pending?.reject(Error('renderer destroyed'));this.pending=null;this.fence=null;this.presentationPyramid.destroy();this.clear();for(const s of this.images.values())this.release(s);this.release(this.liveTarget);this.release(this.archiveTarget);this.release(this.referenceImage);this.release(this.zeroLive);this.release(this.zeroStroke);this.release(this.zeroLayer);for(const [_,p]of this.resources)this.gl.deleteProgram(p);this.gl.deleteBuffer(this.buffer);this.gl.deleteVertexArray(this.vao);this.uniforms.clear();}
}
class WebGpuBackend {
 // WebGPU resolves completion independently; WebGL fences are polled by the RAF loop.
 constructor(canvas,width,height,device,adapter){this.immediatePreview=true;this.canvas=canvas;this.width=width;this.height=height;this.presentationHeld=false;this.historyPatches=new Map;this.historyOrder=[];this.historyReservedBytes=0;this.historyRejectedId=-1;this.historyRetired=null;this.historyRetirementPeak=0;this.device=device;this.adapter=adapter;this.tiles=new Map;this.surfaceStack=['default'];this.layered=false;this.previews=new Map;this.dirtyConfirmed=new Set;this.archiveIds=new Map;this.archivedThrough=-1;this.obsoleteFinished=0;this.images=new Map;this.maskKeys=new WeakMap;this.transient=[];this.error=null;this.device.lost.then(i=>{this.error=Error('GPU device lost: '+i.reason+'; raw strokes remain exportable');});this.device.addEventListener('uncapturederror',e=>{this.error=e.error;});this.info={backend:'WebGPU',adapter:adapter.info?.description??'unspecified',hardwareVerified:false,desynchronized:false,alpha:false,premultipliedAlpha:false,artworkAlpha:true,presentationOpaque:true};}
 async initialize(){const d=this.device;this.format=navigator.gpu.getPreferredCanvasFormat();const tex=(binding,sampleType='unfilterable-float')=>({binding,visibility:GPUShaderStage.COMPUTE|GPUShaderStage.FRAGMENT,texture:{sampleType}});const u={binding:0,visibility:GPUShaderStage.COMPUTE|GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}};
  this.depositLayout=d.createBindGroupLayout({entries:[u,tex(1),{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:'write-only',format:'rgba32float'}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}},tex(4),tex(5),tex(6),{binding:7,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:'write-only',format:'rgba8unorm'}}]});
  this.liveLayout=d.createBindGroupLayout({entries:[u,{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:'read-only-storage'}},tex(2),tex(3)]});this.displayLayout=d.createBindGroupLayout({entries:[u,tex(1),tex(2),...Array.from({length:8},(_,i)=>tex(i+3)),tex(11)]});
  d.pushErrorScope('validation');const module=code=>d.createShaderModule({code});for(const code of [S.wgDeposit,S.wgLive,S.wgDisplay,PRESENT_WGSL]){const info=await module(code).getCompilationInfo();const errors=info.messages.filter(x=>x.type==='error');if(errors.length)throw Error(errors.map(x=>x.message).join('\n'));}
  this.deposit=await d.createComputePipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.depositLayout]}),compute:{module:module(B.wgDeposit),entryPoint:'main'}});
  this.live=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.liveLayout]}),vertex:{module:module(B.wgLive),entryPoint:'vertex'},fragment:{module:module(B.wgLive),entryPoint:'fragment',targets:[{format:'rgba16float',blend:{color:{operation:'max',srcFactor:'one',dstFactor:'one'},alpha:{operation:'max',srcFactor:'one',dstFactor:'one'}}}]},primitive:{topology:'triangle-list'}});
  this.liveSolid=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.liveLayout]}),vertex:{module:module(B.wgLive),entryPoint:'vertex'},fragment:{module:module(B.wgLive),entryPoint:'fragmentSolid',targets:[{format:'rgba16float',blend:{color:{operation:'max',srcFactor:'one',dstFactor:'one'},alpha:{operation:'max',srcFactor:'one',dstFactor:'one'}}}]},primitive:{topology:'triangle-list'}});
  this.liveFlow=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.liveLayout]}),vertex:{module:module(B.wgLive),entryPoint:'vertex'},fragment:{module:module(B.wgLive),entryPoint:'fragment',targets:[{format:'rgba16float',blend:{color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
  const depthPipeline=(entry,write)=>d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.liveLayout]}),vertex:{module:module(B.wgLive),entryPoint:'vertex'},fragment:{module:module(B.wgLive),entryPoint:entry,targets:[{format:'rgba16float',blend:{color:{operation:'max',srcFactor:'one',dstFactor:'one'},alpha:{operation:'max',srcFactor:'one',dstFactor:'one'}}}]},primitive:{topology:'triangle-list'},depthStencil:{format:'depth24plus',depthWriteEnabled:write,depthCompare:'less'}});this.liveDepth=await depthPipeline('fragmentSolid',false);this.liveOpaque=await depthPipeline('fragmentOpaqueSolid',true);
  this.foundationDeposit=await d.createComputePipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.depositLayout]}),compute:{module:module(S.wgDeposit),entryPoint:'main'}});
  this.foundationLive=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.liveLayout]}),vertex:{module:module(S.wgLive),entryPoint:'vertex'},fragment:{module:module(S.wgLive),entryPoint:'fragment',targets:[{format:'rgba16float',blend:{color:{operation:'max',srcFactor:'one',dstFactor:'one'},alpha:{operation:'max',srcFactor:'one',dstFactor:'one'}}}]},primitive:{topology:'triangle-list'}});
  this.foundationSweep=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.liveLayout]}),vertex:{module:module(S.wgLive),entryPoint:'vertex'},fragment:{module:module(S.wgLive),entryPoint:'fragmentSweep',targets:[{format:'rgba16float',blend:{color:{operation:'max',srcFactor:'one',dstFactor:'one'},alpha:{operation:'max',srcFactor:'one',dstFactor:'one'}}}]},primitive:{topology:'triangle-list'}});
  this.foundationSweepPlain=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.liveLayout]}),vertex:{module:module(S.wgLive),entryPoint:'vertex'},fragment:{module:module(S.wgLive),entryPoint:'fragmentSweepPlain',targets:[{format:'rgba16float',blend:{color:{operation:'max',srcFactor:'one',dstFactor:'one'},alpha:{operation:'max',srcFactor:'one',dstFactor:'one'}}}]},primitive:{topology:'triangle-list'}});
  this.foundationFlow=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.liveLayout]}),vertex:{module:module(S.wgLive),entryPoint:'vertex'},fragment:{module:module(S.wgLive),entryPoint:'fragment',targets:[{format:'rgba16float',blend:{color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
  this.sweepDisplay=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.displayLayout]}),vertex:{module:module(S.wgDisplay),entryPoint:'vertex'},fragment:{module:module(S.wgDisplay),entryPoint:'fragmentSweepDisplay',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
  this.display=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.displayLayout]}),vertex:{module:module(S.wgDisplay),entryPoint:'vertex'},fragment:{module:module(S.wgDisplay),entryPoint:'fragment',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
  this.displayLayered=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.displayLayout]}),vertex:{module:module(S.wgDisplay),entryPoint:'vertex'},fragment:{module:module(S.wgDisplay),entryPoint:'fragment',targets:[{format:this.format,blend:{color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
  this.sweepDisplayLayered=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.displayLayout]}),vertex:{module:module(S.wgDisplay),entryPoint:'vertex'},fragment:{module:module(S.wgDisplay),entryPoint:'fragmentSweepDisplay',targets:[{format:this.format,blend:{color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
  this.presentLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}]});this.presentUniform=d.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  this.present=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.presentLayout]}),vertex:{module:module(PRESENT_WGSL),entryPoint:'vertex'},fragment:{module:module(PRESENT_WGSL),entryPoint:'fragment',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
  this.presentationPyramid=new PresentationPyramid(this,PRESENT_GL_VERTEX);this.presentationPyramid.initialize();
  const error=await d.popErrorScope();if(error)throw error;
  this.context=this.canvas.getContext('webgpu');this.context.configure({device:d,format:this.format,alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT});this.liveTarget=d.createTexture({size:[this.width,this.height],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST});this.archiveTarget=d.createTexture({size:[this.width,this.height],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST});this.referenceImage=d.createTexture({size:[512,512],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});d.queue.writeTexture({texture:this.referenceImage},makeReferencePattern(),{bytesPerRow:512*4},[512,512]);this.zeroStroke=this.texture(TILE,TILE,'rgba32float');this.zeroLayer=this.texture(TILE,TILE,'rgba8unorm');this.defaultImage=this.image(null);this.zeroLive=this.texture(1,1,'rgba16float');this.zeroTailTile=this.texture(TILE,TILE,'rgba16float');this.zeroPresentTile=d.createTexture({size:[TILE,TILE],format:this.format,usage:GPUTextureUsage.COPY_SRC|GPUTextureUsage.RENDER_ATTACHMENT});
  await this.presentCurrent();
 }
 texture(w,h,format){return this.device.createTexture({size:[w,h],format,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST});}
 image(mask){let key=mask?this.maskKeys.get(mask):'default';if(mask&&!key){key=JSON.stringify(mask);this.maskKeys.set(mask,key);}if(this.images.has(key))return this.images.get(key);const w=mask?.width??1,h=mask?.height??1,a=new Uint8Array(w*h*4);for(let i=0;i<w*h;i++)a[i*4]=Math.round((mask?.alpha[i]??1)*255);const t=this.texture(w,h,'rgba8unorm');this.device.queue.writeTexture({texture:t},a,{bytesPerRow:w*4},[w,h]);this.images.set(key,t);return t;}
 buffer(a,usage){const b=this.device.createBuffer({size:Math.max(16,a.byteLength),usage:usage|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(b,0,a);this.transient.push(b);return b;}
 group(layout,entries){return this.device.createBindGroup({layout,entries:entries.map((resource,binding)=>({binding,resource:resource.createView?resource.createView():{buffer:resource}}))});}
 tile(key,surfaceKey='default'){const qualified=surfaceTileKey(surfaceKey,key);let t=this.tiles.get(qualified);if(!t){if(this.tiles.size>=4096)throw Error('document tile limit');const [x,y]=key.split(',').map(Number);t={key,surfaceKey,x:x*TILE,y:y*TILE,layer:[this.texture(TILE,TILE,'rgba8unorm'),this.texture(TILE,TILE,'rgba8unorm')],l:0,stroke:null,s:0,active:null,preset:emptyPreset};this.tiles.set(qualified,t);}return t;}
 setSurfaceStack(surfaceKeys){this.surfaceStack=[...surfaceKeys];this.layered=!!this.sparsePreview||!(surfaceKeys.length===1&&surfaceKeys[0]==='default');this.archiveIds.clear();this.archivedThrough=-1;for(const t of this.tiles.values())this.dirtyConfirmed.add(t.key);for(const v of this.previews.values())for(const key of v.keys??[])this.dirtyConfirmed.add(key);}
 historyTouch(id){const i=this.historyOrder.indexOf(id);if(i>=0)this.historyOrder.splice(i,1);this.historyOrder.push(id);}
 historyRelease(id){const patch=this.historyPatches.get(id);if(!patch)return;for(const p of patch.tiles.values()){this.retireHistoryTexture(p.before);if(p.after)this.retireHistoryTexture(p.after);}this.historyReservedBytes=Math.max(0,this.historyReservedBytes-patch.tiles.size*HISTORY_TILE_RESERVATION);this.historyPatches.delete(id);const i=this.historyOrder.indexOf(id);if(i>=0)this.historyOrder.splice(i,1);}
 retireHistoryTexture(texture){if(this.historyRetired){this.historyRetired.push(texture);this.historyRetirementPeak=Math.max(this.historyRetirementPeak,this.historyRetired.length*TILE*TILE*4);}else texture.destroy();}
 historyReserve(id){while(this.historyReservedBytes+HISTORY_TILE_RESERVATION>(this.historyBudget??HISTORY_GPU_BUDGET)){const victim=this.historyOrder.find(x=>x!==id);if(victim===undefined)return false;this.historyRelease(victim);}this.historyReservedBytes+=HISTORY_TILE_RESERVATION;return true;}
 captureBefore(id,key,t,preset,e){if(this.presentationHeld||this.historyRejectedId===id)return;let patch=this.historyPatches.get(id);if(!patch){patch={state:'applied',tiles:new Map};this.historyPatches.set(id,patch);this.historyTouch(id);}const qualified=surfaceTileKey(t.surfaceKey,key);if(patch.tiles.has(qualified))return;if(!this.historyReserve(id)){this.historyRelease(id);this.historyRejectedId=id;return;}const before=this.texture(TILE,TILE,'rgba8unorm');e.copyTextureToTexture({texture:t.layer[t.l]},{texture:before},[TILE,TILE]);patch.tiles.set(qualified,{surfaceKey:t.surfaceKey,key,before,after:null,beforeCommittedId:t.committedId??-1,beforePreset:t.preset,afterPreset:preset,beforeArchiveId:this.layered?undefined:this.archiveIds.get(key),afterArchiveId:undefined});}
 async undoCommit(id){const patch=this.historyPatches.get(id);if(!patch||patch.state!=='applied')return false;const e=this.device.createCommandEncoder();for(const p of patch.tiles.values()){const t=this.tiles.get(surfaceTileKey(p.surfaceKey,p.key));if(!t)return false;if(!p.after){p.after=this.texture(TILE,TILE,'rgba8unorm');e.copyTextureToTexture({texture:t.layer[t.l]},{texture:p.after},[TILE,TILE]);p.afterArchiveId=this.layered?undefined:this.archiveIds.get(p.key);}e.copyTextureToTexture({texture:p.before},{texture:t.layer[t.l]},[TILE,TILE]);t.committedId=p.beforeCommittedId;t.preset=p.beforePreset;if(!this.layered){if(p.beforeArchiveId===undefined)this.archiveIds.delete(p.key);else this.archiveIds.set(p.key,p.beforeArchiveId);}this.dirtyConfirmed.add(p.key);}this.device.queue.submit([e.finish()]);await this.device.queue.onSubmittedWorkDone();patch.state='undone';this.historyTouch(id);return true;}
 async redoCommit(id){const patch=this.historyPatches.get(id);if(!patch||patch.state!=='undone')return false;const e=this.device.createCommandEncoder();for(const p of patch.tiles.values()){const t=this.tiles.get(surfaceTileKey(p.surfaceKey,p.key));if(!t||!p.after)return false;e.copyTextureToTexture({texture:p.after},{texture:t.layer[t.l]},[TILE,TILE]);t.committedId=id;t.preset=p.afterPreset;if(!this.layered){if(p.afterArchiveId===undefined)this.archiveIds.delete(p.key);else this.archiveIds.set(p.key,p.afterArchiveId);}this.dirtyConfirmed.add(p.key);}this.device.queue.submit([e.finish()]);await this.device.queue.onSubmittedWorkDone();patch.state='applied';this.historyTouch(id);return true;}
 dropHistory(ids){for(const id of ids)this.historyRelease(id);}
 setPresentationHeld(held){this.presentationHeld=held;}
 setViewTransform(values){this.viewTransform=new Float32Array(values);}
 encodePresentation(e){const v=this.viewTransform??new Float32Array([this.canvas.width,this.canvas.height,this.canvas.clientWidth||this.width,this.canvas.clientHeight||this.height,this.width,this.height,1,0,0,0,1,1,0,0,0,0]);const image=this.presentationPyramid.source(v,e),values=v.slice();values[15]=image.scale;this.device.queue.writeBuffer(this.presentUniform,0,values);const p=e.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:1,g:1,b:1,a:1},loadOp:'clear',storeOp:'store'}]});p.setPipeline(this.present);p.setBindGroup(0,this.device.createBindGroup({layout:this.presentLayout,entries:[{binding:0,resource:image.source.createView()},{binding:1,resource:{buffer:this.presentUniform}}]}));p.draw(3);p.end();}
 presentView(){if(this.error)throw this.error;if(this.viewSubmission)return false;
  this.viewSubmission=true;this.presentCurrent().catch(e=>{this.error=e;}).finally(()=>{this.viewSubmission=false;});return true;
 }
 async presentCurrent(){const d=this.device,e=d.createCommandEncoder();this.encodePresentation(e);d.queue.submit([e.finish()]);await d.queue.onSubmittedWorkDone();}
 async render(snapshot,jobs,states=[]){const submissionStart=performance.now(),diagnostics={publishedCommands:0,liveCommands:0,dirtyTiles:0,tailClearPixels:0,previewPasses:0,compositedTiles:0,compositedLayerPasses:0};const dirty=new Set(this.dirtyConfirmed);this.dirtyConfirmed.clear();if(this.error)throw this.error;const d=this.device,e=d.createCommandEncoder();const uniform=a=>this.buffer(a,GPUBufferUsage.UNIFORM);const archivedResources=[];let rp;const batches=this.layered?[{states,archive:false}]:previewBatches(this,states);const historyRetired=[];this.historyRetired=historyRetired;try{
  applyQueuedHistory(this,e,dirty);if(this.sparsePreview)renderSparseGpu(this,e,states,dirty,diagnostics);else{
  for(const batch of batches){for(const snapshot of batch.states){const p=snapshot.preset,live=snapshot.commands??[];let v=this.previews.get(snapshot.id);if(!v){v={id:snapshot.id,surfaceKey:snapshot.surfaceKey??'default',preset:p,prefix:this.texture(this.width,this.height,'rgba16float'),tail:this.texture(this.width,this.height,'rgba16float'),index:-1,keys:new Set,depth:continuous(p)?d.createTexture({size:[this.width,this.height],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT}):null,depthFresh:true};this.previews.set(v.id,v);}if(v.surfaceKey!==(snapshot.surfaceKey??'default'))throw Error('preview surface changed');if(v.lastState===snapshot)continue;v.lastState=snapshot;const published=publishedCommands(snapshot,v);const {stable,vertexCount,sectors}=livePrefixCommands(v,p,published,this.width,this.height,live);const oldTail=v.tailKeys??[];previewDirty(v,stable,live,this.width,this.height,dirty,snapshot.inputTip?.t??snapshot.tip?.t??Infinity);diagnostics.publishedCommands+=stable.length;diagnostics.liveCommands+=live.length;diagnostics.dirtyTiles+=dirty.size;for(const [target,commands,clear]of [[v.prefix,stable,false],[v.tail,live,true]]){if(clear)for(const key of oldTail){const [x,y,w,h]=tileViewport(key,this.width,this.height,this.width,this.height);if(!w||!h)continue;e.copyTextureToTexture({texture:this.zeroTailTile},{texture:target,origin:[x,y]},[w,h]);diagnostics.tailClearPixels+=w*h;}if(!commands.length)continue;diagnostics.previewPasses++;const depth=!clear&&v.depth,descriptor={colorAttachments:[{view:target.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'load',storeOp:'store'}]};if(depth){descriptor.depthStencilAttachment={view:depth.createView(),depthClearValue:1,depthLoadOp:v.depthFresh?'clear':'load',depthStoreOp:'store'};v.depthFresh=false;}rp=e.beginRenderPass(descriptor);if(commands.length){rp.setPipeline(depth?this.liveDepth:continuous(p)?this.liveSolid:p.__foundation?(p.__foundation.coverageUnion?(commands.every(c=>c[7]===0)?this.foundationSweepPlain:this.foundationSweep):liveAccumulation(p)?this.foundationFlow:this.foundationLive):(liveAccumulation(p)?this.liveFlow:this.live));rp.setBindGroup(0,this.group(this.liveLayout,[uniform(parameters(p,0,0,commands.length,0,this.width,this.height,this.width,this.height,false,0,sectors)),this.buffer(pack(commands),GPUBufferUsage.STORAGE),this.image(p.mask),this.image(p.texture)]));rp.draw(clear?6:vertexCount,commands.length);if(depth){rp.setPipeline(this.liveOpaque);rp.draw(clear?6:vertexCount,commands.length);}}rp.end();}}
   const overlays=[];for(const v of this.previews.values())overlays.push({id:v.id,surfaceKey:v.surfaceKey,preset:v.preset,texture:v.prefix},{id:v.id,surfaceKey:v.surfaceKey,preset:v.preset,texture:v.tail});
   if(this.layered){for(const key of dirty){const [tx,ty]=key.split(',').map(Number),x=tx*TILE,y=ty*TILE,w=Math.min(TILE,this.width-x),h=Math.min(TILE,this.height-y);if(w>0&&h>0)e.copyTextureToTexture({texture:this.zeroPresentTile},{texture:this.liveTarget,origin:[x,y]},[w,h]);}}
   rp=e.beginRenderPass({colorAttachments:[{view:this.liveTarget.createView(),loadOp:'load',storeOp:'store'}]});
   for(const key of dirty){diagnostics.compositedTiles++;
    if(this.layered){
     for(const surfaceKey of this.surfaceStack){const t=this.tiles.get(surfaceTileKey(surfaceKey,key)),surfaceOverlays=overlays.filter(o=>o.surfaceKey===surfaceKey);if(!t&&!surfaceOverlays.length)continue;const [tx,ty]=key.split(',').map(Number),params=parameters(t?.preset??emptyPreset,tx*TILE,ty*TILE,0,0,this.width,this.height,this.width,this.height);params[24]=t?.active??-1;params[25]=t?.committedId??-1;params[26]=surfaceOverlays.length;params[28]=-1;const textures=[];for(let i=0;i<8;i++){textures.push(surfaceOverlays[i]?.texture??this.zeroLive);params[32+i*4]=surfaceOverlays[i]?.id??-1;params[33+i*4]=S.blends[surfaceOverlays[i]?.preset.blend??'normal'];params[34+i*4]=surfaceOverlays[i]?.preset.__foundation?.opacity??surfaceOverlays[i]?.preset.opacity??1;params[35+i*4]=surfaceOverlays[i]?.preset.__foundation?.coverageUnion?3:surfaceOverlays[i]?.preset.__foundation?.material?2:surfaceOverlays[i]&&liveAccumulation(surfaceOverlays[i].preset)?1:0;}const direct=surfaceOverlays.length===2&&(continuous(surfaceOverlays[0].preset)||foundationUnion(surfaceOverlays[0].preset))&&t?.active==null&&surfaceOverlays[0].id>(t?.committedId??-1);if(direct&&!surfaceOverlays[0].preset.__foundation)params[34]=1;rp.setPipeline(direct?this.sweepDisplayLayered:this.displayLayered);rp.setBindGroup(0,this.group(this.displayLayout,[uniform(params),t?.layer[t.l]??this.zeroLayer,t?.stroke?.[t.s]??this.zeroStroke,...textures,this.archiveTarget]));rp.draw(6);diagnostics.compositedLayerPasses++;}
    }else{
     const t=this.tiles.get(surfaceTileKey('default',key)),[tx,ty]=key.split(',').map(Number),params=parameters(t?.preset??emptyPreset,tx*TILE,ty*TILE,0,0,this.width,this.height,this.width,this.height);params[24]=t?.active??-1;params[25]=t?.committedId??-1;params[26]=overlays.length;params[28]=this.archiveIds.get(key)??-1;const textures=[];for(let i=0;i<8;i++){textures.push(overlays[i]?.texture??this.zeroLive);params[32+i*4]=overlays[i]?.id??-1;params[33+i*4]=S.blends[overlays[i]?.preset.blend??'normal'];params[34+i*4]=overlays[i]?.preset.__foundation?.opacity??overlays[i]?.preset.opacity??1;params[35+i*4]=overlays[i]?.preset.__foundation?.coverageUnion?3:overlays[i]?.preset.__foundation?.material?2:overlays[i]&&liveAccumulation(overlays[i].preset)?1:0;}const direct=overlays.length===2&&(continuous(overlays[0].preset)||foundationUnion(overlays[0].preset))&&t?.active==null&&!this.archiveIds.has(key)&&overlays[0].id>(t?.committedId??-1);if(direct&&!overlays[0].preset.__foundation)params[34]=1;rp.setPipeline(direct?this.sweepDisplay:this.display);rp.setBindGroup(0,this.group(this.displayLayout,[uniform(params),t?.layer[t.l]??this.zeroLayer,t?.stroke?.[t.s]??this.zeroStroke,...textures,this.archiveTarget]));rp.draw(6);diagnostics.compositedLayerPasses++;
    }
   }rp.end();
   if(batch.archive&&!this.layered){e.copyTextureToTexture({texture:this.liveTarget},{texture:this.archiveTarget},[this.width,this.height]);for(const v of this.previews.values()){this.archivedThrough=Math.max(this.archivedThrough,v.id);for(const key of v.realKeys??[])this.archiveIds.set(key,Math.max(this.archiveIds.get(key)??-1,v.id));archivedResources.push(v.prefix,v.tail);if(v.depth)archivedResources.push(v.depth);}this.previews.clear();}this.presentationPyramid.invalidate(dirty);dirty.clear();
  }
  }
  if(!this.presentationHeld)this.encodePresentation(e);
  const retired=[...archivedResources];for(const job of jobs){if(job.skip)continue;this.dirtyConfirmed.add(job.key);const existed=this.tiles.has(surfaceTileKey(job.surfaceKey,job.key)),t=this.tile(job.key,job.surfaceKey),solid=continuous(job.preset);if(!existed)t.uncommittedOwner=job.id;if(!job.commit)this.captureBefore(job.id,job.key,t,job.preset,e);if(t.active!==job.id&&!job.commit){if(t.stroke)retired.push(...t.stroke);t.stroke=[this.texture(TILE,TILE,solid?'rgba16float':'rgba32float'),this.texture(TILE,TILE,solid?'rgba16float':'rgba32float')];t.s=0;t.active=job.id;t.previousPreset=t.preset;t.preset=job.preset;}if(!t.stroke)throw Error('commit has no stroke');const cb=this.buffer(pack(job.commands.length?job.commands:[new Float32Array(STRIDE)]),GPUBufferUsage.STORAGE);if(solid&&!job.commit){const pass=e.beginRenderPass({colorAttachments:[{view:t.stroke[t.s].createView(),loadOp:'load',storeOp:'store'}]});pass.setPipeline(this.liveSolid);pass.setBindGroup(0,this.group(this.liveLayout,[uniform(parameters(job.preset,t.x,t.y,job.commands.length,2,TILE,TILE,TILE,TILE)),cb,this.image(job.preset.mask),this.image(job.preset.texture)]));pass.draw(6,job.commands.length);pass.end();}else{const gp=this.group(this.depositLayout,[uniform(parameters(job.preset,t.x,t.y,job.commands.length,job.commit?1:0)),t.stroke[t.s],solid?this.zeroStroke:t.stroke[1-t.s],cb,this.image(job.preset.mask),this.image(job.preset.texture),t.layer[t.l],t.layer[1-t.l]]);const cp=e.beginComputePass();cp.setPipeline(job.preset.__foundation?this.foundationDeposit:this.deposit);cp.setBindGroup(0,gp);cp.dispatchWorkgroups(16,16);cp.end();}if(job.commit){t.l=1-t.l;t.committedId=job.id;t.active=null;delete t.uncommittedOwner;delete t.previousPreset;if(!this.layered&&(this.archiveIds.get(job.key)??Infinity)<=job.id)this.archiveIds.delete(job.key);retired.push(...t.stroke);t.stroke=null;}else if(!solid)t.s=1-t.s;}
  d.queue.submit([e.finish()]);this.lastSubmission={...diagnostics,cpuSubmitMs:performance.now()-submissionStart};await d.queue.onSubmittedWorkDone();for(const b of this.transient)b.destroy();this.transient=[];for(const t of retired)t.destroy();if(this.error)throw this.error;
  }finally{this.historyRetired=null;for(const texture of historyRetired)texture.destroy();}
 }
 async readViewport(){const d=this.device,w=this.width,h=this.height,stride=Math.ceil(w*4/256)*256,b=d.createBuffer({size:stride*h,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),e=d.createCommandEncoder();e.copyTextureToBuffer({texture:this.liveTarget},{buffer:b,bytesPerRow:stride},[w,h]);d.queue.submit([e.finish()]);await b.mapAsync(GPUMapMode.READ);const a=new Uint8Array(b.getMappedRange()),out=new Uint8ClampedArray(w*h*4),bgra=this.format.startsWith('bgra');for(let y=0;y<h;y++)for(let x=0;x<w;x++){const src=y*stride+x*4,dst=(y*w+x)*4;out[dst]=a[src+(bgra?2:0)];out[dst+1]=a[src+1];out[dst+2]=a[src+(bgra?0:2)];out[dst+3]=a[src+3];}b.unmap();b.destroy();return out;}
 async read(surfaceKey='default'){const d=this.device,out=new Uint8ClampedArray(this.width*this.height*4);for(const t of this.tiles.values()){if(t.surfaceKey!==surfaceKey)continue;const b=d.createBuffer({size:TILE*TILE*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});const e=d.createCommandEncoder();e.copyTextureToBuffer({texture:t.layer[t.l]},{buffer:b,bytesPerRow:TILE*4},[TILE,TILE]);d.queue.submit([e.finish()]);await b.mapAsync(GPUMapMode.READ);const a=new Uint8Array(b.getMappedRange());for(let y=0;y<TILE&&t.y+y<this.height;y++){const n=Math.min(TILE,this.width-t.x);out.set(a.subarray(y*TILE*4,(y*TILE+n)*4),((t.y+y)*this.width+t.x)*4);}b.unmap();b.destroy();}return out;}
 retirePreview(id){const v=this.previews.get(id);if(v?.tiles){retireSparsePreview(this,v);return;}if(v){for(const key of v.keys)this.dirtyConfirmed.add(key);v.prefix.destroy();v.tail.destroy();v.depth?.destroy();this.previews.delete(id);}}
 cancelStroke(id,keys,surfaceKey){for(const key of keys){const qualified=surfaceTileKey(surfaceKey,key),t=this.tiles.get(qualified);if(t?.active!==id)continue;for(const s of t.stroke??[])s.destroy();t.stroke=null;t.active=null;t.preset=t.previousPreset??emptyPreset;delete t.previousPreset;if(t.uncommittedOwner===id){for(const s of t.layer)s.destroy();this.tiles.delete(qualified);}this.dirtyConfirmed.add(key);}this.dropHistory([id]);}
 invalidateTiles(keys,surfaceKey='default'){for(const key of keys){const qualified=surfaceTileKey(surfaceKey,key),t=this.tiles.get(qualified);if(t){for(const s of t.layer)s.destroy();if(t.stroke)for(const s of t.stroke)s.destroy();this.tiles.delete(qualified);}if(!this.layered)this.archiveIds.delete(key);this.dirtyConfirmed.add(key);}}
 clear(){this.presentationPyramid.clear();for(const id of this.previews.keys())this.retirePreview(id);for(const id of [...this.historyPatches.keys()])this.historyRelease(id);for(const t of this.tiles.values()){for(const s of t.layer)s.destroy();if(t.stroke)for(const s of t.stroke)s.destroy();}this.tiles.clear();this.dirtyConfirmed.clear();this.archiveIds.clear();this.archivedThrough=-1;const e=this.device.createCommandEncoder(),p=e.beginRenderPass({colorAttachments:[{view:this.liveTarget.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});p.end();this.device.queue.submit([e.finish()]);}
 destroy(){this.presentationPyramid.destroy();this.clear();for(const t of this.images.values())t.destroy();this.liveTarget.destroy();this.archiveTarget.destroy();this.referenceImage.destroy();this.presentUniform.destroy();this.zeroLive.destroy();this.zeroTailTile.destroy();this.zeroStroke.destroy();this.zeroLayer.destroy();this.zeroPresentTile.destroy();this.context.unconfigure();this.device.destroy();}
}
// Full precision, sparse 128px feedback. Formal deposition and brush reconstruction
// are unchanged. The pool is bounded independently of retained canonical history.
const PREVIEW_POOL_BUDGET=16*1024*1024,PREVIEW_LIMIT=256*1024*1024;
export function boundedFormalJobs(document,budget=2_000_000){
 const candidates=document.peekMany(128),out=[];let cost=0;
 for(const job of candidates){let work=job.commit?TILE*TILE:0;if(!job.commit){if(continuous(job.preset)){const [tx,ty]=job.key.split(',').map(Number);for(const c of job.commands){const b=commandBounds(c);work+=Math.max(0,Math.min((tx+1)*TILE,b.x1)-Math.max(tx*TILE,b.x0))*Math.max(0,Math.min((ty+1)*TILE,b.y1)-Math.max(ty*TILE,b.y0));}}else work=TILE*TILE*job.commands.length;}if(out.length&&cost+work>budget)break;out.push(job);cost+=work;
 }return out;
}
async function initializeSparseBackend(b){
 b.sparsePreview=true;b.layered=true;b.previewBytes=0;b.previewPoolBytes=0;b.peakPreviewBytes=0;b.previewPool=[];
 if(b.gl){const g=b.gl;b.release(b.archiveTarget);b.archiveTarget=b.surface(1,1,g.RGBA8,g.UNSIGNED_BYTE);b.feedbackCompose=b.program(S.glFeedbackComposeVertex,S.glFeedbackCompose);b.feedbackContinue=b.program(S.glFeedbackComposeVertex,S.glFeedbackContinue);b.feedbackTile=b.program(S.glDisplayVertex,S.glFeedbackTile);b.feedbackDirect=b.program(S.glDisplayVertex,S.glFeedbackDirect);b.feedbackScratch=[b.surface(TILE,TILE,g.RGBA8,g.UNSIGNED_BYTE),b.surface(TILE,TILE,g.RGBA8,g.UNSIGNED_BYTE)];}
 else{const d=b.device;b.archiveTarget.destroy();b.archiveTarget=b.texture(1,1,b.format);const make=async(code,entry,format,blend)=>{const module=d.createShaderModule({code});return d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[b.displayLayout]}),vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:entry,targets:[{format,...(blend?{blend}:{})}]},primitive:{topology:'triangle-list'}});};b.feedbackCompose=await make(S.wgFeedbackCompose,'fragment','rgba8unorm');b.feedbackDirect=await make(S.wgFeedbackDirect,'fragment',b.format,{color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}});b.feedbackTile=await make(S.wgFeedbackTile,'fragment',b.format,{color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}});b.feedbackScratch=[b.texture(TILE,TILE,'rgba8unorm'),b.texture(TILE,TILE,'rgba8unorm')];}
}
function dropPreviewTile(b,t){if(b.gl){b.release(t.prefix);b.release(t.tail);}else{t.prefix.destroy();t.tail.destroy();t.depth?.destroy();}}
function acquirePreviewTile(b,depth){
 const bytes=TILE*TILE*(16+(depth?4:0));let index=b.previewPool.findIndex(t=>t.hasDepth===depth),t;
 if(index>=0){t=b.previewPool.splice(index,1)[0];b.previewPoolBytes-=t.bytes;}else{while(b.previewPool.length&&b.previewBytes+b.previewPoolBytes+bytes>PREVIEW_LIMIT){const old=b.previewPool.shift();b.previewPoolBytes-=old.bytes;dropPreviewTile(b,old);}if(b.previewBytes+b.previewPoolBytes+bytes>PREVIEW_LIMIT)throw Error('Preview memory limit reached; accepted canonical input remains retained');
  if(b.gl){const g=b.gl;t={prefix:b.surface(TILE,TILE,g.RGBA16F,g.HALF_FLOAT,depth),tail:b.surface(TILE,TILE,g.RGBA16F,g.HALF_FLOAT)};}
  else t={prefix:b.texture(TILE,TILE,'rgba16float'),tail:b.texture(TILE,TILE,'rgba16float'),depth:depth?b.device.createTexture({size:[TILE,TILE],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT}):null};
 }
 t.bytes=bytes;t.hasDepth=depth;t.fresh=true;t.depthFresh=true;b.previewBytes+=bytes;b.peakPreviewBytes=Math.max(b.peakPreviewBytes,b.previewBytes+b.previewPoolBytes);return t;
}
function retireSparsePreview(b,v){for(const key of v.keys)b.dirtyConfirmed.add(key);for(const t of v.tiles.values()){b.previewBytes-=t.bytes;if(b.previewPoolBytes+t.bytes<=PREVIEW_POOL_BUDGET){b.previewPool.push(t);b.previewPoolBytes+=t.bytes;}else dropPreviewTile(b,t);}b.previews.delete(v.id);}
function destroySparse(b){for(const v of [...b.previews.values()])if(v.tiles)retireSparsePreview(b,v);for(const t of b.previewPool)dropPreviewTile(b,t);b.previewPool=[];b.previewPoolBytes=0;for(const t of b.feedbackScratch??[])b.gl?b.release(t):t.destroy();}
function sparseWork(b,state,dirty,diag){
 let v=b.previews.get(state.id);if(!v){v={id:state.id,preset:state.preset,surfaceKey:state.surfaceKey??'default',keys:new Set,index:-1,tiles:new Map,resetState:state.resetPreview?state:null};b.previews.set(v.id,v);}
 if(v.lastState===state)return null;if(v.surfaceKey!==(state.surfaceKey??'default'))throw Error('Preview surface changed');v.lastState=state;
 const p=state.preset,live=state.commands??[],published=publishedCommands(state,v),{stable,vertexCount,sectors}=livePrefixCommands(v,p,published,b.width,b.height,live),oldTail=v.tailKeys??new Set;
 previewDirty(v,stable,live,b.width,b.height,dirty,state.inputTip?.t??state.tip?.t??Infinity);diag.publishedCommands+=stable.length;diag.liveCommands+=live.length;
 const work=new Map;const entry=key=>{let e=work.get(key);if(!e)work.set(key,e={key,stable:[],live:[],clear:oldTail.has(key)});return e;};for(const key of oldTail)entry(key);for(const [commands,name]of [[stable,'stable'],[live,'live']])for(const c of commands)for(const key of keysFor(c,b.width,b.height))entry(key)[name].push(c);
 return {v,p,work,vertexCount,sectors};
}
function sparseLayers(b,key){const layers=[];for(const surfaceKey of b.surfaceStack){const t=b.tiles.get(surfaceTileKey(surfaceKey,key)),overlays=[];for(const v of [...b.previews.values()].sort((a,b)=>a.id-b.id)){if(v.surfaceKey!==surfaceKey||v.id<=(t?.committedId??-1))continue;const tile=v.tiles.get(key);if(tile)overlays.push({id:v.id,preset:v.preset,texture:tile.prefix},{id:v.id,preset:v.preset,texture:tile.tail});}if(t||overlays.length)layers.push({t,overlays});}return layers;}
function compositionParams(b,key,t,overlays,continuation=false){const [tx,ty]=key.split(',').map(Number),params=parameters(t?.preset??emptyPreset,tx*TILE,ty*TILE,0,0,b.width,b.height,b.width,b.height);params[24]=continuation?-1:t?.active??-1;params[25]=continuation?-1:t?.committedId??-1;params[26]=overlays.length;params[28]=-1;params[31]=1;for(let i=0;i<8;i++){const o=overlays[i];params[32+i*4]=o?.id??-1;params[33+i*4]=S.blends[o?.preset.blend??'normal'];params[34+i*4]=o?.preset.__foundation?.opacity??o?.preset.opacity??1;params[35+i*4]=o?.preset.__foundation?.coverageUnion?3:o?.preset.__foundation?.material?2:o&&liveAccumulation(o.preset)?1:0;}return params;}
function glTextures(b,t,overlays,base){const textures={layer:base??t?.layer[t.l]??b.zeroLayer,src:base?b.zeroStroke:t?.stroke?.[t.s]??b.zeroStroke,archiveImage:b.archiveTarget};for(let i=0;i<8;i++)textures['liveImage'+i]=overlays[i]?.texture??b.zeroLive;return textures;}
function gpuTextures(b,t,overlays,base){return [base??t?.layer[t.l]??b.zeroLayer,base?b.zeroStroke:t?.stroke?.[t.s]??b.zeroStroke,...Array.from({length:8},(_,i)=>overlays[i]?.texture??b.zeroLive),b.archiveTarget];}
function glLiveDraw(b,target,commands,p,x,y,clear,vertexCount,sectors){
 const g=b.gl;g.bindFramebuffer(g.FRAMEBUFFER,target.f);g.viewport(0,0,TILE,TILE);if(clear){g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);}if(!commands.length)return;
 const program=continuous(p)?b.solidLive:p.__foundation?.coverageUnion&&commands.every(c=>c[7]===0)?b.foundationSweepPlain:p.__foundation?b.foundationLive:b.live,depth=!!target.depth;
 if(depth){g.enable(g.DEPTH_TEST);g.depthFunc(g.LESS);g.depthMask(false);}else g.disable(g.DEPTH_TEST);g.enable(g.BLEND);g.blendEquation(liveAccumulation(p)?g.FUNC_ADD:g.MAX);g.blendFunc(g.ONE,liveAccumulation(p)?g.ONE_MINUS_SRC_ALPHA:g.ONE);
 const textures={maskImage:b.image(p.mask),grainImage:b.image(p.texture)};b.use(program,parameters(p,x,y,commands.length,0,TILE,TILE,TILE,TILE,false,0,sectors),textures);g.bindBuffer(g.ARRAY_BUFFER,b.buffer);g.bufferData(g.ARRAY_BUFFER,pack(commands),g.DYNAMIC_DRAW);for(let i=0;i<6;i++){g.enableVertexAttribArray(i);g.vertexAttribPointer(i,4,g.FLOAT,false,96,i*16);g.vertexAttribDivisor(i,1);}g.drawArraysInstanced(g.TRIANGLES,0,vertexCount,commands.length);
 if(depth){g.depthMask(true);b.use(continuous(p)?b.solidLive:p.__foundation?b.foundationLive:b.live,parameters(p,x,y,commands.length,1,TILE,TILE,TILE,TILE,false,0,sectors),textures);g.drawArraysInstanced(g.TRIANGLES,0,vertexCount,commands.length);}
 g.disable(g.DEPTH_TEST);g.depthMask(true);for(let i=0;i<6;i++){g.disableVertexAttribArray(i);g.vertexAttribDivisor(i,0);}g.disable(g.BLEND);
}
function renderSparseGl(b,states,dirty,diag){
 const g=b.gl;for(const state of states){const data=sparseWork(b,state,dirty,diag);if(!data)continue;const {v,p,work,vertexCount,sectors}=data;for(const item of work.values()){let tile=v.tiles.get(item.key);if(!tile){tile=acquirePreviewTile(b,continuous(p));v.tiles.set(item.key,tile);}const [tx,ty]=item.key.split(',').map(Number);if(tile.fresh){for(const target of [tile.prefix,tile.tail]){g.bindFramebuffer(g.FRAMEBUFFER,target.f);g.clearColor(0,0,0,0);g.depthMask(true);g.clearDepth(1);g.clear(g.COLOR_BUFFER_BIT|(target.depth?g.DEPTH_BUFFER_BIT:0));}tile.fresh=false;}
   glLiveDraw(b,tile.prefix,item.stable,p,tx*TILE,ty*TILE,false,vertexCount,sectors);glLiveDraw(b,tile.tail,item.live,p,tx*TILE,ty*TILE,item.clear,6,sectors);diag.previewPasses+=+(item.stable.length>0)+ +(item.clear||item.live.length>0);if(item.clear)diag.tailClearPixels+=TILE*TILE;
 }}
 // Clear all changed regions together, then keep the large scene target bound.
 // compose() already produces quantized RGBA8 values, so the intermediate
 // straight-alpha scratch image is redundant for up to eight overlays.
 g.bindFramebuffer(g.FRAMEBUFFER,b.liveTarget.f);g.viewport(0,0,b.width,b.height);g.enable(g.SCISSOR_TEST);g.clearColor(0,0,0,0);
 for(const key of dirty){const [x,y,w,h]=tileViewport(key,b.width,b.height,b.width,b.height);if(!w||!h)continue;g.scissor(x,b.height-y-h,w,h);g.clear(g.COLOR_BUFFER_BIT);diag.compositedTiles++;}
 g.disable(g.SCISSOR_TEST);
 for(const key of dirty){
  for(const {t,overlays}of sparseLayers(b,key)){
   if(b.feedbackDirect&&overlays.length<=8){g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);b.use(b.feedbackDirect,compositionParams(b,key,t,overlays),glTextures(b,t,overlays,null));g.drawArrays(g.TRIANGLES,0,6);g.disable(g.BLEND);diag.compositedLayerPasses++;diag.feedbackDirectPasses=(diag.feedbackDirectPasses??0)+1;continue;}
   let base=null;for(let at=0;at<Math.max(1,overlays.length);at+=8){const group=overlays.slice(at,at+8),params=compositionParams(b,key,t,group,at>0),target=b.feedbackScratch[(at/8)%2];g.bindFramebuffer(g.FRAMEBUFFER,target.f);g.viewport(0,0,TILE,TILE);g.disable(g.BLEND);b.use(at?b.feedbackContinue:b.feedbackCompose,params,glTextures(b,t,group,base));g.drawArrays(g.TRIANGLES,0,6);base=target;}
   g.bindFramebuffer(g.FRAMEBUFFER,b.liveTarget.f);g.viewport(0,0,b.width,b.height);g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);b.use(b.feedbackTile,compositionParams(b,key,null,[]),{layer:base});g.drawArrays(g.TRIANGLES,0,6);g.disable(g.BLEND);diag.compositedLayerPasses++;
  }
 }diag.dirtyTiles=dirty.size;b.presentationPyramid.invalidate(dirty);
}
function gpuLiveDraw(b,e,tile,target,commands,p,x,y,clear,vertexCount,sectors){
 if(!commands.length&&!clear)return;const depth=target===tile.prefix&&tile.depth,descriptor={colorAttachments:[{view:target.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:clear?'clear':'load',storeOp:'store'}]};if(depth){descriptor.depthStencilAttachment={view:depth.createView(),depthClearValue:1,depthLoadOp:tile.depthFresh?'clear':'load',depthStoreOp:'store'};tile.depthFresh=false;}const rp=e.beginRenderPass(descriptor);if(commands.length){rp.setPipeline(depth?b.liveDepth:continuous(p)?b.liveSolid:p.__foundation?(p.__foundation.coverageUnion?(commands.every(c=>c[7]===0)?b.foundationSweepPlain:b.foundationSweep):liveAccumulation(p)?b.foundationFlow:b.foundationLive):(liveAccumulation(p)?b.liveFlow:b.live));rp.setBindGroup(0,b.group(b.liveLayout,[b.buffer(parameters(p,x,y,commands.length,0,TILE,TILE,TILE,TILE,false,0,sectors),GPUBufferUsage.UNIFORM),b.buffer(pack(commands),GPUBufferUsage.STORAGE),b.image(p.mask),b.image(p.texture)]));rp.draw(vertexCount,commands.length);if(depth){rp.setPipeline(b.liveOpaque);rp.draw(vertexCount,commands.length);}}rp.end();
}
function renderSparseGpu(b,e,states,dirty,diag){
 for(const state of states){const data=sparseWork(b,state,dirty,diag);if(!data)continue;const {v,p,work,vertexCount,sectors}=data;for(const item of work.values()){let tile=v.tiles.get(item.key);if(!tile){tile=acquirePreviewTile(b,continuous(p));v.tiles.set(item.key,tile);}if(tile.fresh){for(const target of [tile.prefix,tile.tail])e.beginRenderPass({colorAttachments:[{view:target.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]}).end();tile.fresh=false;}const [tx,ty]=item.key.split(',').map(Number);gpuLiveDraw(b,e,tile,tile.prefix,item.stable,p,tx*TILE,ty*TILE,false,vertexCount,sectors);gpuLiveDraw(b,e,tile,tile.tail,item.live,p,tx*TILE,ty*TILE,item.clear,6,sectors);diag.previewPasses+=+(item.stable.length>0)+ +(item.clear||item.live.length>0);if(item.clear)diag.tailClearPixels+=TILE*TILE;}}
 // Copy clears before the scene render pass. Direct tile/layer draws then share
 // one pass; an oversized overlay group alone needs the exact scratch fallback.
 for(const key of dirty){const [tx,ty]=key.split(',').map(Number),x=tx*TILE,y=ty*TILE,w=Math.min(TILE,b.width-x),h=Math.min(TILE,b.height-y);if(w<=0||h<=0)continue;e.copyTextureToTexture({texture:b.zeroPresentTile},{texture:b.liveTarget,origin:[x,y]},[w,h]);diag.compositedTiles++;}
 let scenePass=null;const scene=()=>scenePass??=(e.beginRenderPass({colorAttachments:[{view:b.liveTarget.createView(),loadOp:'load',storeOp:'store'}]}));
 for(const key of dirty){
  for(const {t,overlays}of sparseLayers(b,key)){if(b.feedbackDirect&&overlays.length<=8){const rp=scene();rp.setPipeline(b.feedbackDirect);rp.setBindGroup(0,b.group(b.displayLayout,[b.buffer(compositionParams(b,key,t,overlays),GPUBufferUsage.UNIFORM),...gpuTextures(b,t,overlays,null)]));rp.draw(6);diag.compositedLayerPasses++;diag.feedbackDirectPasses=(diag.feedbackDirectPasses??0)+1;continue;}
   scenePass?.end();scenePass=null;let base=null;for(let at=0;at<Math.max(1,overlays.length);at+=8){const group=overlays.slice(at,at+8),params=compositionParams(b,key,t,group,at>0),target=b.feedbackScratch[(at/8)%2],rp=e.beginRenderPass({colorAttachments:[{view:target.createView(),loadOp:'load',storeOp:'store'}]});rp.setPipeline(b.feedbackCompose);rp.setBindGroup(0,b.group(b.displayLayout,[b.buffer(params,GPUBufferUsage.UNIFORM),...gpuTextures(b,t,group,base)]));rp.draw(6);rp.end();base=target;}
   const rp=scene();rp.setPipeline(b.feedbackTile);rp.setBindGroup(0,b.group(b.displayLayout,[b.buffer(compositionParams(b,key,null,[]),GPUBufferUsage.UNIFORM),base,b.zeroStroke,...Array(8).fill(b.zeroLive),b.archiveTarget]));rp.draw(6);diag.compositedLayerPasses++;
  }
 }scenePass?.end();diag.dirtyTiles=dirty.size;b.presentationPyramid.invalidate(dirty);
}
