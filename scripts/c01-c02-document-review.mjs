import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {decodeIllustroFile} from '../apps/editor/src/persistence/format.ts';

const {chromium}=createRequire(import.meta.url)(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const root=path.resolve(process.env.ILLUSTRO_DIST??'apps/editor/dist');
const evidence=process.env.C01_C02_DOCUMENT_EVIDENCE??'/tmp/c01-c02-evidence/document-review.json';
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost'),name=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!name.startsWith(root+path.sep))return res.writeHead(403).end();
    const bytes=await readFile(name);
    res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(name)]??'application/octet-stream');
    res.end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const cases=[];
let browser;
try{
  browser=await chromium.launch({args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan']});
  for(const backend of ['webgl2','webgpu']){
    const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:800},hasTouch:true});
    try{
      await context.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/?backend='+backend,{waitUntil:'domcontentloaded'});
      await page.locator('#ihStart').click();

      await page.locator('#ihNewWidth').fill('320');
      await page.locator('#ihNewHeight').fill('240');
      await page.locator('#ihNewDpi').fill('600');
      await page.locator('#ihNewName').fill('Canvas review');
      assert.match(await page.locator('#ihPixelPreview').innerText(),/320 × 240 px/);
      await page.locator('#ihNewCreate').click();
      try{await page.locator('#ihNewDialog').waitFor({state:'hidden',timeout:30_000});}
      catch(error){throw new Error(JSON.stringify(await page.locator('#ihBlankForm').evaluate(form=>({
        invalid:[...form.querySelectorAll(':invalid')].map(input=>({id:input.id,message:input.validationMessage})),
        error:document.getElementById('ihNewError')?.textContent,status:document.getElementById('status')?.textContent,
      }))),{cause:error});}
      await page.waitForFunction(()=>!document.getElementById('brush').disabled);
      const info=async()=>{await page.locator('#documentInfoOpen').evaluate(button=>button.click());await page.locator('#documentInfoDialog').waitFor();};
      const undo=async(direction)=>{await page.locator('#'+direction).evaluate(button=>button.click());await page.waitForFunction(()=>document.getElementById('canvas').dataset.historyBusy==='false');};
      await info();
      assert.equal(await page.locator('#documentInfoDpi').inputValue(),'600');
      await page.locator('#documentInfoAuthor').fill('Artist');
      await page.locator('#documentInfoDescription').fill('First\nSecond');
      await page.locator('#documentInfoName').fill('Edited review');
      await page.locator('#documentInfoForm button[type=submit]').click();
      await page.locator('#documentInfoDialog').waitFor({state:'hidden'});
      await undo('undo');await info();
      assert.equal(await page.locator('#documentInfoName').inputValue(),'Canvas review');
      await page.locator('#documentInfoClose').click();
      await undo('redo');await info();
      assert.equal(await page.locator('#documentInfoAuthor').inputValue(),'Artist');
      await page.locator('#canvasTemplateName').fill('Review template');
      await page.locator('#canvasTemplateForm button[type=submit]').click();
      assert.match(await page.locator('#documentInfoStatus').innerText(),/保存しました/);
      await page.locator('#documentInfoClose').click();

      const box=await page.locator('.surface').boundingBox();
      await page.mouse.move(box.x+box.width*.45,box.y+box.height*.44);
      await page.mouse.down();
      await page.mouse.move(box.x+box.width*.55,box.y+box.height*.55,{steps:7});
      await page.mouse.up();
      await page.waitForFunction(()=>document.getElementById('canvas').dataset.committedStrokes==='1');
      const download=page.waitForEvent('download');
      await page.locator('#saveCopy').evaluate(button=>button.click());
      const file=await download;
      const bytes=new Uint8Array(await readFile(await file.path()));
      const decoded=await decodeIllustroFile(bytes,{knownRequiredTypes:new Set(['document.core.v1','raster.block.v1'])});
      const snapshot=JSON.parse(new TextDecoder().decode(decoded.sections.get('document').bytes));
      const revision=snapshot.revisions.find(r=>r.id===snapshot.snapshotRevisionId);
      assert.deepEqual([revision.root.width,revision.root.height,revision.root.dpi],[320,240,600]);
      assert.equal(revision.root.author,'Artist');
      assert.equal(revision.root.description,'First\nSecond');
      assert.equal(revision.root.name,'Edited review');
      assert.equal(revision.command.operations[0].kind,'brush.stroke');
      const reopened=await browser.newContext({acceptDownloads:true});
      try{
        const restored=await reopened.newPage();
        await restored.goto(origin+'/?backend='+backend,{waitUntil:'domcontentloaded'});
        await restored.locator('#openFile').setInputFiles({name:'Review.illustro',mimeType:'application/octet-stream',buffer:Buffer.from(bytes)});
        try{
          await restored.waitForFunction(()=>document.getElementById('canvas')?.dataset.committedStrokes==='1'&&
            document.getElementById('app')?.inert===false,null,{timeout:40_000});
        }catch(error){
          const state=await restored.evaluate(()=>({status:document.getElementById('status')?.textContent,
            notice:document.getElementById('ihNotice')?.textContent,strokes:document.getElementById('canvas')?.dataset.committedStrokes}));
          throw new Error(JSON.stringify(state),{cause:error});
        }
        await restored.locator('#documentInfoOpen').evaluate(button=>button.click());
        assert.equal(await restored.locator('#documentInfoAuthor').inputValue(),'Artist');
        assert.equal(await restored.locator('#documentInfoDpi').inputValue(),'600');
      }finally{await reopened.close();}
      await page.locator('#ihNavHome').evaluate(button=>button.click());
      await page.locator('#ihStart').click();
      await page.locator('#ihTemplateSelect').selectOption('Review template');
      assert.deepEqual(await Promise.all(['#ihNewWidth','#ihNewHeight','#ihNewDpi'].map(id=>page.locator(id).inputValue())),['320','240','600']);
      assert.deepEqual(errors,[]);
      cases.push({backend,result:'PASS',pixels:[320,240],dpi:600,undoRedo:true,saveCopy:true,template:true});
    }finally{await context.close();}
  }
}catch(error){cases.push({result:'FAIL',error:error.stack??String(error)});process.exitCode=1;}
finally{
  await browser?.close();server.close();
  await mkdir(path.dirname(evidence),{recursive:true});
  await writeFile(evidence,JSON.stringify({commit:process.env.EXPECTED_COMMIT_SHA??'',cases},null,2));
}
console.log(JSON.stringify(cases));
