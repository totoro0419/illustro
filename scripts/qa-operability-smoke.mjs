import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

// Minimal real-browser audit. This does NOT certify the full application.
// Work must still inspect every visible control and workflow manually.
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.AUDIT_PLAYWRIGHT||'playwright');
const output=process.env.AUDIT_OUTPUT||'artifacts/operability';
const target=process.env.AUDIT_URL||'http://127.0.0.1:4173/';
await mkdir(output,{recursive:true});
const report={url:target,at:new Date().toISOString(),cases:[],errors:[],consoleErrors:[],inventories:{}};
let failed=false;
const check=(name,ok,details='')=>{report.cases.push({name,ok,details});if(!ok)failed=true;};
const inventory=async page=>page.evaluate(()=>[...document.querySelectorAll('button,input,select,textarea,[role="button"],[role="slider"]')].map(el=>{
  const s=getComputedStyle(el),r=el.getBoundingClientRect();
  const hidden=!!el.closest('[hidden],[inert]')||s.display==='none'||s.visibility==='hidden'||r.width===0||r.height===0;
  return {id:el.id||null,tag:el.tagName.toLowerCase(),text:(el.getAttribute('aria-label')||el.textContent||el.getAttribute('title')||'').trim().slice(0,100),hidden,disabled:!!el.disabled,rect:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}};
}));
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader']});
try{
  for(const config of [{name:'desktop',viewport:{width:1365,height:768},mobile:false},{name:'tablet-portrait-touch',viewport:{width:800,height:1280},mobile:true}]){
    const context=await browser.newContext({viewport:config.viewport,hasTouch:config.mobile,isMobile:config.mobile,deviceScaleFactor:1});
    const page=await context.newPage();
    page.on('pageerror',e=>report.errors.push({context:config.name,message:String(e)}));
    page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push({context:config.name,message:m.text().slice(0,800)});});
    try{
      const response=await page.goto(target,{waitUntil:'domcontentloaded',timeout:45000});
      check(config.name+': page loads',!!response&&response.ok(),response?.status()+'');
      await page.locator('#ihStart').waitFor({state:'visible',timeout:25000});
      check(config.name+': new-work button visible',await page.locator('#ihStart').isVisible());
      report.inventories[config.name+'-home']=await inventory(page);
      await page.screenshot({path:path.join(output,config.name+'-01-home.png'),fullPage:true});
      if(config.mobile){
        const b=await page.locator('#ihStart').boundingBox();
        if(!b)throw Error('New-work button has no clickable rectangle');
        await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);
      }else await page.locator('#ihStart').click({timeout:10000});
      await page.locator('#ihNewDialog').waitFor({state:'visible',timeout:15000});
      check(config.name+': new-work dialog opens',await page.locator('#ihNewDialog').isVisible());
      report.inventories[config.name+'-dialog']=await inventory(page);
      await page.screenshot({path:path.join(output,config.name+'-02-create-dialog.png'),fullPage:true});
      await page.locator('#ihNewCreate').click({timeout:10000});
      await page.locator('#ihNewDialog').waitFor({state:'hidden',timeout:35000});
      check(config.name+': create-work action returns to editor',await page.locator('#app').evaluate(el=>!el.inert));
      report.inventories[config.name+'-editor']=await inventory(page);
      await page.screenshot({path:path.join(output,config.name+'-03-editor.png'),fullPage:true});
    }catch(error){check(config.name+': interactive smoke',false,String(error?.stack||error));report.errors.push({context:config.name,message:String(error?.stack||error)});try{await page.screenshot({path:path.join(output,config.name+'-error.png'),fullPage:true})}catch{}}
    finally{await context.close()}
  }
}finally{
  await browser.close();
  await writeFile(path.join(output,'smoke-result.json'),JSON.stringify(report,null,2),'utf8');
  console.log('Operability smoke:',JSON.stringify({passed:report.cases.filter(c=>c.ok).length,total:report.cases.length,errors:report.errors.length,output},null,2));
}
if(failed)process.exitCode=1;
