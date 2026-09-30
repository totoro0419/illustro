import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildStandalone } from './build-connectivity-standalone.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
let server,origin;
const MIME=new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8']]);

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
  await tapEndpointById(page,'stroke-1:end');await tapEndpointById(page,'stroke-2:start');
  await expect(page.locator('#truthStatus')).toContainText('1組');
  await page.locator('#finalizeTruth').click();
  await expect(page.locator('#precisionMetric')).not.toHaveText('—');await expect(page.locator('#recallMetric')).not.toHaveText('—');
  const scored=await page.evaluate(()=>window.__illustroConnectivityEval.getSnapshot());
  expect(scored.truthFinalized).toBe(true);expect(scored.truthCount).toBe(1);expect(scored.metrics).toBeTruthy();
  expect(Number.isFinite(scored.metrics.precision)).toBe(true);expect(Number.isFinite(scored.metrics.recall)).toBe(true);expect(Number.isFinite(scored.metrics.f1)).toBe(true);
}
test('connectivity evaluator accepts touch strokes and human endpoint truth',async({page})=>{await exerciseEvaluator(page,`${origin}/connectivity/interactive-connectivity.html`)});
test('standalone connectivity evaluator opens from file URL',async({page})=>{await exerciseEvaluator(page,pathToFileURL(path.join(ROOT,'connectivity/interactive-connectivity-standalone.html')).href)});
