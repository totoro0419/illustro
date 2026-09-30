// DOM/event contract tests, not browser rendering or physical device evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html=await readFile(new URL('../connectivity/interactive-connectivity.html',import.meta.url),'utf8');
let instance=0;
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners=new Map();this.style={setProperty(){}};this.classList={toggle(){}};this.disabled=false;this.checked=false;this._value='';this.textContent='';this.width=500;this.height=400;this.selectedIndex=0;}
 get options(){return this.children;}get value(){return this.tagName==='select'?(this._value||this.children[this.selectedIndex]?.value||''):this._value;}set value(v){this._value=String(v);}
 append(...children){this.children.push(...children);}replaceChildren(...children){this.children=children;this.textContent='';this._value='';this.selectedIndex=0;}
 setAttribute(k,v){this[k]=v;}addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
 dispatch(type,event={}){for(const fn of this.listeners.get(type)??[])fn({preventDefault(){},...event});}
 click(){this.dispatch('click');}getBoundingClientRect(){return {left:0,top:0,width:500,height:400};}setPointerCapture(){}releasePointerCapture(){}focus(){this.focused=true;}scrollIntoView(){}
}
async function boot(storage=new Map(),failWrites=false){
 const nodes=new Map();for(const match of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const e=new Element(match[1]);e.checked=/\bchecked\b/.test(match[2]);e.value=/\bvalue="([^"]*)"/.exec(match[2])?.[1]??'';nodes.set(match[3],e);}
 assert.equal(nodes.size,[...html.matchAll(/\bid="[^"]+"/g)].length,'unique HTML IDs');
 nodes.get('brushCap').value='round';
 const drawing=[];const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>drawing.push({op:k,args}),set:(o,k,v)=>(o[k]=v,true)});nodes.get('canvas').getContext=()=>ctx;
 const document={getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})};
 const originals=new Map();const globals={document,localStorage:{getItem:k=>storage.get(k)??null,setItem(k,v){if(failWrites)throw Error('test quota failure');storage.set(k,v);}},window:{addEventListener(){}},navigator:{userAgent:'Node DOM contract test'},ResizeObserver:class {observe(){}},requestAnimationFrame:fn=>fn(),devicePixelRatio:1,innerWidth:500,innerHeight:800};
 for(const [k,v] of Object.entries(globals)){originals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL,downloads=[];URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:test';};URL.revokeObjectURL=()=>{};
 await import(`../connectivity/interactive-connectivity.js?dom-contract=${++instance}`);
 const get=()=>window.__illustroConnectivityEval.getSnapshot();
 const draw=(points,id=1)=>{const emit=(type,p)=>nodes.get('canvas').dispatch(type,{pointerId:id,pointerType:'touch',isPrimary:true,button:0,buttons:1,clientX:p[0],clientY:p[1],pressure:.5,timeStamp:performance.now(),isTrusted:false});emit('pointerdown',points[0]);for(const p of points.slice(1,-1))emit('pointermove',p);emit('pointerup',points.at(-1));};
 const note=text=>{nodes.get('feedbackNote').value=text;nodes.get('feedbackNote').dispatch('input');};
 const cleanup=()=>{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;for(const [k,v] of originals){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}};
 return {nodes,get,draw,note,drawing,storage,downloads,cleanup};
}
test('quick review draws T colors immediately, records a blocking note, then starts an empty trial',async()=>{
 const b=await boot();try{
  b.draw([[40,80],[150,80],[260,80]]);b.draw([[150,80],[150,130],[150,180]]);
  assert.equal(b.get().display.groups.length,1);assert.equal(b.get().truthFinalized,false);assert.equal(b.get().metrics,null);assert.ok(b.drawing.some(r=>r.op==='fillText'&&r.args[0].includes('線1 50%・組1')));
  b.note('端点3と線1の途中の接続位置がおかしい');const before=b.get().currentRecord;b.nodes.get('nextTrial').click();
  assert.equal(b.get().strokeCount,0);assert.equal(b.get().note,'');assert.equal(b.get().archiveCount,1);assert.ok(b.nodes.get('nextTrial').disabled);
  const records=JSON.parse(b.storage.get('illustro-connectivity-evaluation-v2'));assert.equal(records[0].feedback.note,before.feedback.note);assert.deepEqual(records[0].graph.edges,before.graph.edges);assert.equal(records[0].session.automaticPreviewBeforeTruth,true);assert.equal(records[0].metrics,null);
  b.nodes.get('restoreClear').click();assert.equal(b.get().strokeCount,2);assert.equal(b.get().note,before.feedback.note);b.note('修正したメモ');b.nodes.get('nextTrial').click();assert.equal(b.get().archiveCount,1);assert.equal(JSON.parse(b.storage.get('illustro-connectivity-evaluation-v2'))[0].feedback.note,'修正したメモ');
 }finally{b.cleanup();}
});
test('blank memo is saved without claiming correctness, and export contains every trial',async()=>{
 const b=await boot();try{
  b.draw([[30,40],[60,40],[90,40]]);b.nodes.get('nextTrial').click();b.draw([[10,100],[40,100],[70,100]]);b.note('端点1と2の間');b.nodes.get('exportJson').click();
  const payload=JSON.parse(await b.downloads.at(-1).text());assert.equal(payload.records.length,2);assert.equal(payload.records[0].feedback.note,'');assert.equal(payload.aggregate.sceneCount,0);assert.equal(payload.records[1].feedback.severity,'blocking');assert.equal(payload.records[1].feedback.note,'端点1と2の間');assert.equal(payload.records[0].session.truthFinalized,false);
 }finally{b.cleanup();}
});
test('draft strokes and Japanese notes survive reload; previous trial can be recovered after advancing and reloading',async()=>{
 const storage=new Map();let b=await boot(storage);b.draw([[40,40],[90,40],[140,40]]);b.note('端点2：線1の途中との誤接続。🚫\n長いメモ');const old=b.get().currentRecord;b.cleanup();
 b=await boot(storage);try{assert.equal(b.get().strokeCount,1);assert.equal(b.get().note,old.feedback.note);assert.deepEqual(b.get().currentRecord.strokes,old.strokes);b.nodes.get('nextTrial').click();}finally{b.cleanup();}
 b=await boot(storage);try{assert.equal(b.get().strokeCount,0);assert.equal(b.get().archiveCount,1);b.nodes.get('restoreClear').click();assert.equal(b.get().note,old.feedback.note);assert.equal(b.get().strokeCount,1);}finally{b.cleanup();}
});
test('failed saving retains the current strokes and note and still allows export',async()=>{
 const b=await boot(new Map(),true);try{b.draw([[40,40],[90,40],[140,40]]);b.note('妥協できない不具合');b.nodes.get('nextTrial').click();assert.equal(b.get().strokeCount,1);assert.equal(b.get().note,'妥協できない不具合');assert.match(b.nodes.get('reviewStatus').textContent,/保存に失敗/);b.nodes.get('exportJson').click();const payload=JSON.parse(await b.downloads.at(-1).text());assert.equal(payload.records.length,1);assert.equal(payload.records[0].feedback.note,'妥協できない不具合');}finally{b.cleanup();}
});
test('cannot advance mid-stroke, and a completed stroke with a pending candidate remains undecided',async()=>{
 const b=await boot();try{b.nodes.get('canvas').dispatch('pointerdown',{pointerId:1,pointerType:'pen',isPrimary:true,button:0,clientX:40,clientY:40,isTrusted:false});assert.equal(b.nodes.get('nextTrial').disabled,true);b.nodes.get('nextTrial').click();assert.equal(b.get().archiveCount,0);b.nodes.get('canvas').dispatch('pointermove',{pointerId:1,clientX:80,clientY:40,isTrusted:false});b.nodes.get('canvas').dispatch('pointercancel',{pointerId:1});assert.equal(b.get().strokeCount,1);assert.equal(b.nodes.get('nextTrial').disabled,false);}finally{b.cleanup();}
});
