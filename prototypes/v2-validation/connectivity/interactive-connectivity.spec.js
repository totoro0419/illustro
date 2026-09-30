import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildStandalone } from './build-connectivity-standalone.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
let server,origin;
const MIME=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8']]);
const pageErrors=new WeakMap();
test.beforeEach(async({page})=>{const errors=[];pageErrors.set(page,errors);page.on('pageerror',error=>errors.push(error.message));});
test.afterEach(async({page})=>{expect(pageErrors.get(page)).toEqual([]);});

function safePath(urlPath){
  const decoded=decodeURIComponent(urlPath.split('?')[0]);
  const requested=decoded==='/'?'/connectivity/interactive-connectivity.html':decoded;
  const full=path.resolve(ROOT,`.${requested}`);
  return full.startsWith(ROOT)?full:null;
}
test.beforeAll(async()=>{
  await buildStandalone();
  await mkdir(path.join(ROOT, 'results'), { recursive: true });
  await copyFile(path.join(ROOT, 'connectivity', 'interactive-connectivity-standalone.html'), path.join(ROOT, 'results', 'interactive-connectivity-standalone.html'));
  server=createServer(async(req,res)=>{
    const full=safePath(req.url||'/');if(!full){res.writeHead(403).end('forbidden');return}
    try{
      const info=await stat(full);if(!info.isFile())throw new Error('not file');
      const body=await readFile(full);res.writeHead(200,{'content-type':MIME.get(path.extname(full))||'application/octet-stream','cache-control':'no-store'});res.end(body);
    }catch{res.writeHead(404).end('not found')}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{if(server)await new Promise(resolve=>server.close(resolve))});

async function drawPointerStroke(page,points,pointerType='touch'){
  await page.evaluate(({points,pointerType})=>{
    const target=document.querySelector('#canvas'),rect=target.getBoundingClientRect();
    const emit=(type,point,buttons)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:17,pointerType,isPrimary:true,buttons,pressure:buttons?.55:0,clientX:rect.left+rect.width*point[0],clientY:rect.top+rect.height*point[1]}));
    emit('pointerdown',points[0],1);for(const point of points.slice(1,-1))emit('pointermove',point,1);emit('pointerup',points.at(-1),0);
  },{points,pointerType});
}
async function tapEndpointById(page,endpointId){
  await page.evaluate(endpointId=>{
    const snapshot=window.__illustroConnectivityEval.getSnapshot();
    const endpoint=snapshot.graph.endpoints.find(item=>item.endpointId===endpointId);
    if(!endpoint)throw new Error(`missing endpoint ${endpointId}`);
    const target=document.querySelector('#canvas'),rect=target.getBoundingClientRect();
    target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:91,pointerType:'touch',isPrimary:true,buttons:1,clientX:rect.left+endpoint.position.x,clientY:rect.top+endpoint.position.y}));
  },endpointId);
}
async function exerciseEvaluator(page,url){
  await page.goto(url);await expect(page.getByRole('heading',{name:'端点のつながり評価'})).toBeVisible();
  await drawPointerStroke(page,[[.15,.45],[.28,.45],[.40,.45]]);
  await drawPointerStroke(page,[[.405,.45],[.53,.45],[.66,.45]]);
  const snapshot=await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot());
  expect(snapshot.strokeCount).toBe(2);expect(snapshot.endpointCount).toBe(4);expect(snapshot.edgeCount).toBeGreaterThanOrEqual(1);
  await page.getByRole('button',{name:'正解を指定',exact:true}).first().click();
  await page.locator('#endpointA').selectOption('stroke-1:end');await page.locator('#endpointB').selectOption('stroke-2:start');
  await page.locator('#togglePair').click();
  await expect(page.locator('#truthStatus')).toContainText('1組');
  await page.locator('#reviewed').check();await page.locator('#finalizeTruth').click();
  await expect(page.locator('#precisionMetric')).not.toHaveText('—');await expect(page.locator('#recallMetric')).not.toHaveText('—');
  const scored=await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot());
  expect(scored.truthFinalized).toBe(true);expect(scored.truthCount).toBe(1);expect(scored.metrics).toBeTruthy();
  expect(Number.isFinite(scored.metrics.precision)).toBe(true);expect(Number.isFinite(scored.metrics.recall)).toBe(true);expect(Number.isFinite(scored.metrics.f1)).toBe(true);
}
test('connectivity evaluator accepts touch strokes and human endpoint truth',async({page})=>{await exerciseEvaluator(page,`${origin}/connectivity/interactive-connectivity.html`)});
test('standalone connectivity evaluator opens from file URL',async({page})=>{await exerciseEvaluator(page,pathToFileURL(path.join(ROOT,'connectivity/interactive-connectivity-standalone.html')).href)});

test('dense endpoint labeling, save, export, reload and clear recovery are reachable',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await exerciseEvaluator(page,`${origin}/connectivity/interactive-connectivity.html`);
  await page.locator('#saveScene').click();await page.locator('#saveScene').click();
  expect((await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot())).archiveCount).toBe(1);
  const downloadPromise=page.waitForEvent('download');await page.locator('#exportJson').click();const download=await downloadPromise;
  const payload=JSON.parse(await readFile(await download.path(),'utf8'));
  expect(payload.records.length).toBe(1);expect(payload.records[0].session.reviewedAfterDrawing).toBe(true);
  expect(payload.records[0].session.inputCounts.untrusted).toBeGreaterThan(0);
  expect(payload.records[0].session.automaticPreviewBeforeTruth).toBe(false);
  await page.locator('#clearAll').click();expect((await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot())).strokeCount).toBe(0);
  await page.locator('#restoreClear').click();expect((await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot())).strokeCount).toBe(2);
  await page.reload();await expect(page.locator('#archiveStatus')).toContainText('1枚');expect(errors).toEqual([]);
});

test('resize preserves stroke coordinates; narrow and intermediate layouts do not overflow',async({page})=>{
  for(const width of [320,600,900,1100,1440]){
    await page.setViewportSize({width,height:900});await page.goto(`${origin}/connectivity/interactive-connectivity.html`);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await drawPointerStroke(page,[[.2,.4],[.3,.4],[.4,.4]],'pen');
  const before=await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot().graph.endpoints);
  await page.setViewportSize({width:400,height:800});
  expect(await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot().graph.endpoints)).toEqual(before);
  await page.screenshot({path:path.join(ROOT,'results','connectivity-mobile.png'),fullPage:true});
});

test('pointer cancel retains real samples; wrong pointer cannot add a phantom endpoint',async({page})=>{
  await page.goto(`${origin}/connectivity/interactive-connectivity.html`);
  await page.evaluate(()=>{
    const c=document.querySelector('#canvas'),r=c.getBoundingClientRect();
    const emit=(type,id,x)=>c.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'pen',isPrimary:true,buttons:1,clientX:r.left+x,clientY:r.top+100}));
    emit('pointerdown',1,30);emit('pointermove',2,900);emit('pointermove',1,60);emit('pointercancel',1,900);
  });
  const s=await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot());expect(s.strokeCount).toBe(1);
  expect(s.graph.endpoints[1].position.x).toBeCloseTo(60);expect(s.currentRecord.strokes[0].cancelled).toBe(true);
});

test('keyboard can label and finalize; empty truth and edits invalidate metrics',async({page})=>{
  await page.goto(`${origin}/connectivity/interactive-connectivity.html`);await drawPointerStroke(page,[[.2,.4],[.3,.4],[.4,.4]]);
  await page.locator('#truthMode').focus();await page.keyboard.press('Enter');
  await page.locator('#endpointA').focus();await page.keyboard.press('Home');await page.locator('#endpointB').focus();await page.keyboard.press('End');
  await page.locator('#togglePair').focus();await page.keyboard.press('Enter');await expect(page.locator('#truthStatus')).toContainText('1組');
  await page.locator('#togglePair').focus();await page.keyboard.press('Enter');await page.locator('#reviewed').focus();await page.keyboard.press('Space');
  await page.locator('#finalizeTruth').focus();await page.keyboard.press('Enter');await expect(page.locator('#exactMetric')).toHaveText('一致');
  await page.locator('#drawMode').click();await drawPointerStroke(page,[[.6,.5],[.7,.5],[.8,.5]]);
  await expect(page.locator('#precisionMetric')).toHaveText('—');await expect(page.locator('#finalizeTruth')).toBeDisabled();
});

test('T junction truth can select a segment, score it, export it and restore it',async({page})=>{
  await page.goto(`${origin}/connectivity/interactive-connectivity.html`);
  await drawPointerStroke(page,[[.15,.4],[.5,.4],[.85,.4]],'pen');
  await drawPointerStroke(page,[[.5,.4],[.5,.55],[.5,.7]],'touch');
  const g=await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot().graph);
  expect(g.edges.some(e=>e.to.kind==='segment')).toBe(true);
  await page.locator('#truthMode').click();await page.locator('#segmentEndpoint').selectOption('stroke-2:start');await page.locator('#targetStroke').selectOption('stroke-1');await page.locator('#targetFraction').fill('50');await page.locator('#toggleSegment').click();
  await page.locator('#reviewed').check();await page.locator('#finalizeTruth').click();
  await expect(page.locator('#precisionMetric')).toHaveText('100.0%');await expect(page.locator('#recallMetric')).toHaveText('100.0%');
  await page.locator('#saveScene').click();await page.locator('#clearAll').click();await page.locator('#restoreClear').click();
  expect((await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot())).truthCount).toBe(1);
  await expect(page.locator('#summary')).toContainText('線 2本');await expect(page.locator('#hint')).toBeHidden();
  await expect(page.locator('#segmentEndpoint option')).toHaveCount(4);
  await page.locator('#reviewed').check();await page.locator('#finalizeTruth').click();await expect(page.locator('#exactMetric')).toHaveText('一致');
  await page.screenshot({path:path.join(ROOT,'results','connectivity-T-junction.png'),fullPage:true});
});

test('canvas endpoint then segment tap is a second complete T labeling path',async({page})=>{
  await page.goto(`${origin}/connectivity/interactive-connectivity.html`);
  await drawPointerStroke(page,[[.15,.4],[.5,.4],[.85,.4]]);await drawPointerStroke(page,[[.5,.4],[.5,.55],[.5,.7]]);
  await page.locator('#truthMode').click();await tapEndpointById(page,'stroke-2:start');
  await page.evaluate(()=>{const c=document.querySelector('#canvas'),r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointerdown',{isPrimary:true,pointerType:'touch',clientX:r.left+r.width*.55,clientY:r.top+r.height*.4}));});
  expect((await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot())).truthCount).toBe(1);
});

test('all rendered cap choices enter native stroke geometry and storage failure remains exportable',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','QuotaExceededError');};});
  await page.goto(`${origin}/connectivity/interactive-connectivity.html`);
  for(const [i,cap] of ['round','butt','square'].entries()){await page.locator('#brushCap').selectOption(cap);await drawPointerStroke(page,[[.15,.2+i*.2],[.3,.2+i*.2],[.45,.2+i*.2]],'pen');}
  expect((await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot())).currentRecord.strokes.map(s=>s.cap)).toEqual(['round','butt','square']);
  await page.locator('#reviewed').check();await page.locator('#finalizeTruth').click();await page.locator('#saveScene').click();
  await expect(page.locator('#archiveStatus')).toContainText('保存は失敗');await expect(page.locator('#exportJson')).toBeEnabled();
  const pending=page.waitForEvent('download');await page.locator('#exportJson').click();const download=await pending;const payload=JSON.parse(await readFile(await download.path(),'utf8'));expect(payload.records).toHaveLength(1);
});
