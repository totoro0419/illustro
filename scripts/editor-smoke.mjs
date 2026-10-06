import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const {PNG}=require(process.env.PREP_PNG_PATH??'pngjs');
const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
const evidence=path.resolve(process.env.PREP_EVIDENCE_DIRECTORY??'/tmp/illustro-editor-smoke');
await fs.mkdir(evidence,{recursive:true});
const server=http.createServer(async(q,r)=>{
  try{const relative=decodeURIComponent((q.url??'/').split('?')[0]),file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
    if(!file.startsWith(root+path.sep)){r.writeHead(403);r.end();return;}
    const data=await fs.readFile(file);r.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');r.end(data);
  }catch{r.writeHead(404);r.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface']});
const report={scope:'production skeleton only; NOT complete Core Drawing Slice or physical pen acceptance',backends:[],layouts:[]};
function dark(buffer){const {data}=PNG.sync.read(buffer);let n=0;for(let i=0;i<data.length;i+=4)if(data[i]<160&&data[i+1]<160&&data[i+2]<160&&data[i+3]>0)n++;return n;}
try{
  for(const backend of ['webgl2','webgpu']){
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(url+'/?backend='+backend);await page.waitForLoadState('networkidle');
    assert.ok((await page.locator('body').innerText()).includes('Illustro'));
    assert.equal(await page.locator('vite-error-overlay').count(),0);
    await page.getByRole('button',{name:'新規キャンバス',exact:true}).click();
    await page.waitForFunction(()=>!document.getElementById('brush').disabled,{timeout:45000});
    assert.equal(await page.locator('#brush option').count(),7);
    assert.equal(await page.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
    const before=dark(await page.locator('canvas').screenshot());
    const box=await page.locator('canvas').boundingBox();assert.ok(box);
    await page.mouse.move(box.x+80,box.y+100);await page.mouse.down();
    await page.mouse.move(box.x+320,box.y+160,{steps:24});await page.mouse.up();
    // M01 publishes the formal Document commit after pointer-up. Wait for that
    // state rather than a historical status-message phrase.
    await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.committedStrokes==='1',{timeout:15000});
    assert.match(await page.locator('#status').textContent(),/作品に反映/);
    // Poll actual presented pixels; notification text alone is not evidence.
    let painted=0;for(let i=0;i<30;i++){painted=dark(await page.locator('canvas').screenshot());if(painted>before+50)break;await page.waitForTimeout(50);}
    assert.ok(painted>before+50,'stroke did not produce visible pixels');
    await page.locator('#sizeNumber').fill('512');assert.equal(await page.locator('#size').inputValue(),'512');
    await page.locator('#force').check();assert.equal(await page.locator('#force').isChecked(),true);
    await page.locator('#brush').selectOption('4');await page.getByRole('button',{name:'消しゴム',exact:true}).click();
    assert.equal(await page.locator('#erase').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#brush').inputValue(),'5','brush picker contradicts active eraser');
    await page.locator('#paint').click();assert.equal(await page.locator('#brush').inputValue(),'4');
    await page.locator('#splitter').focus();await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#splitter').getAttribute('aria-valuenow'),'354');
    await page.screenshot({path:path.join(evidence,backend+'-desktop.png')});
    for(const viewport of [{width:1024,height:768},{width:760,height:700},{width:390,height:844},{width:320,height:640},{width:740,height:390}]){
      await page.setViewportSize(viewport);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
      if(viewport.width<=760){const root=page.locator('#compactWorkspaceRoot'),workspace=page.locator('#workspaceCompact');await page.locator('#drawer').click();assert.equal(await root.getAttribute('data-open'),'true');assert.equal(await workspace.isVisible(),true);
        assert.equal(await page.locator('.bottom').getByRole('button',{name:'Undo',exact:true}).isVisible(),true);
        await page.locator('#compactClose').click();assert.equal(await root.getAttribute('data-open'),'false');
        assert.equal(await workspace.evaluate(el=>el.inert),true,'closed compact Workspace must be inert');
        assert.equal(await root.evaluate(el=>getComputedStyle(el).display),'block','compact Workspace overlay root must remain mounted');
        assert.equal(await workspace.evaluate(el=>getComputedStyle(el).display),'none','closed rebuilt Workspace drawer must not paint');
        const workspaceCoversCenter=await page.evaluate(()=>{const c=document.querySelector('canvas'),w=document.getElementById('workspaceCompact'),root=document.getElementById('compactWorkspaceRoot');if(!c||!w||!root)return true;const r=c.getBoundingClientRect();return document.elementsFromPoint(r.left+r.width*.5,r.top+r.height*.5).some(el=>el===w||w.contains(el)||el===root);});
        assert.equal(workspaceCoversCenter,false,'closed rebuilt Workspace still participates in Canvas hit testing');
        assert.equal(await workspace.evaluate(el=>el.contains(document.activeElement)),false,'closed Workspace retained focus');
      }
      report.layouts.push({backend,...viewport,horizontalOverflow:false});
      if(viewport.width===390)await page.screenshot({path:path.join(evidence,backend+'-compact.png')});
    }
    assert.deepEqual(errors,[]);report.backends.push({backend,status:'PASS',sevenBrushes:true,visibleStrokePixels:painted-before,
      sizeSliderAndNumber:true,forceFadeToggle:true,eraserRoute:true,workspaceWidthKeyboard:true,unconnectedSaveDisabled:true,consoleErrors:errors});
    await page.close();
  }
  report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;throw e;}
finally{await fs.writeFile(path.join(evidence,'editor-smoke.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify(report,null,2));
