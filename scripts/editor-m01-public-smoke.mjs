import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const base=process.env.M01_PUBLIC_URL??'https://totoro0419.github.io/illustro/qa/m01/';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
const report={url:base,status:'FAIL',backends:[]};
async function draw(page,box,a,b,steps=24){
  await page.mouse.move(box.x+a[0]*box.width,box.y+a[1]*box.height);
  await page.mouse.down();
  await page.mouse.move(box.x+b[0]*box.width,box.y+b[1]*box.height,{steps});
  await page.mouse.up();
}
try{
  for(const backend of ['webgl2','webgpu']){
    const page=await browser.newPage({viewport:{width:1200,height:860}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base+`?backend=${backend}&qa-public-check=1`,{waitUntil:'networkidle',timeout:45000});
    assert.equal(await page.locator('#qaPanel').count(),1,'fixed QA URL did not activate M01 QA mode');
    await page.locator('#qaPanel > summary').click();
    await page.getByRole('button',{name:'新規キャンバス',exact:true}).click();
    await page.waitForFunction(()=>!(document.getElementById('brush')?.disabled),{timeout:45000});
    const canvas=page.locator('canvas'),box=await canvas.boundingBox();assert.ok(box);
    assert.equal(await canvas.getAttribute('data-committed-strokes'),'0');
    await draw(page,box,[.14,.24],[.78,.32],28);
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1',{timeout:15000});
    const r1=await canvas.getAttribute('data-revision-id');assert.ok(r1);
    await draw(page,box,[.18,.62],[.82,.70],28);
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='2',{timeout:15000});
    const r2=await canvas.getAttribute('data-revision-id');assert.ok(r2&&r2!==r1);
    assert.deepEqual(errors,[]);
    report.backends.push({backend,status:'PASS',committedStrokes:2,consoleErrors:errors});
    await page.close();
  }
  report.status='PASS';
}finally{
  await browser.close();
}
console.log(JSON.stringify(report,null,2));
if(report.status!=='PASS')process.exitCode=1;
