import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const publicBase=(process.env.M07_PUBLIC_URL??'').trim(),expectedCommit=process.env.EXPECTED_COMMIT_SHA??'';
const evidence=path.resolve(process.env.M07_EVIDENCE_DIRECTORY??'/tmp/m07-evidence');
await fs.mkdir(evidence,{recursive:true});
let server=null,base=publicBase;
if(!base){
  const root=path.resolve(import.meta.dirname,'../apps/editor/dist');
  server=http.createServer(async(req,res)=>{
    try{
      const name=decodeURIComponent((req.url??'/').split('?')[0]),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
      if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      const data=await fs.readFile(file),ext=path.extname(file);
      res.setHeader('Content-Type',ext==='.js'?'text/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html;charset=utf-8':ext==='.json'?'application/json':ext==='.webmanifest'?'application/manifest+json':'application/octet-stream');
      res.end(data);
    }catch{res.writeHead(404);res.end();}
  });await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base='http://127.0.0.1:'+server.address().port+'/';
}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-vulkan=swiftshader','--disable-vulkan-surface','--enable-features=Vulkan','--enable-precise-memory-info']});
const report={source:expectedCommit,mode:publicBase?'public':'local',status:'FAIL',cases:[],errors:[]};
const qa=async p=>JSON.parse((await p.locator('#qaAuto').textContent())||'{}');
const workspaceOpen=async p=>p.evaluate(()=>!document.getElementById('workspace').inert);
async function draw(page){
  const box=await page.locator('#canvas').boundingBox();assert.ok(box&&box.width>100,'Canvas not visible');
  await page.mouse.move(box.x+box.width*.22,box.y+box.height*.4);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.53,{steps:16});await page.mouse.up();
}
async function waitCount(page,n){
  await page.waitForFunction(x=>document.getElementById('canvas')?.dataset.committedStrokes===String(x)&&document.getElementById('canvas')?.dataset.historyBusy==='false',n,{timeout:45000});
}

async function startFrameCapture(page){
  await page.evaluate(()=>{
    window.__m07FrameIntervals=[];window.__m07FrameSampling=true;
    let previous=0;
    const next=(time)=>{
      if(previous)window.__m07FrameIntervals.push(time-previous);
      previous=time;
      if(window.__m07FrameSampling&&window.__m07FrameIntervals.length<900)requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  });
}
async function stopFrameCapture(page){
  return page.evaluate(()=>{
    window.__m07FrameSampling=false;
    const arr=(window.__m07FrameIntervals??[]).filter(x=>Number.isFinite(x)).sort((a,b)=>a-b);
    const at=p=>arr.length?arr[Math.min(arr.length-1,Math.floor(arr.length*p))]:null;
    return {frameSamples:arr.length,p50FrameMs:at(.5),p95FrameMs:at(.95),
      heapBytes:performance.memory?.usedJSHeapSize??null,
      domNodes:document.querySelectorAll('*').length};
  });
}
async function penStroke(page){
  const box=await page.locator('#canvas').boundingBox();assert.ok(box);
  const x=box.x+box.width*.19,y=box.y+box.height*.64;
  const x2=box.x+box.width*.73,y2=box.y+box.height*.7;
  const session=await page.context().newCDPSession(page);
  await session.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,pointerType:'pen'});
  await session.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1,pointerType:'pen'});
  for(let i=1;i<=16;i++)await session.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+(x2-x)*i/16,y:y+(y2-y)*i/16,button:'left',buttons:1,pointerType:'pen'});
  await session.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x2,y:y2,button:'left',buttons:0,clickCount:1,pointerType:'pen'});
  await session.detach();
}
async function touchStroke(page){
  const box=await page.locator('#canvas').boundingBox();assert.ok(box);
  const x=box.x+box.width*.14,y=box.y+box.height*.27;
  const x2=box.x+box.width*.61,y2=box.y+box.height*.31;
  const session=await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=15;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(x2-x)*i/15,y:y+(y2-y)*i/15}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await session.detach();
}
async function boxScrollCost(page){
  return page.evaluate(()=>{
    const box=document.getElementById('boxStack');
    const before=performance.now();let range=0;
    for(let i=0;i<25;i++){box.scrollTop=i%2?0:box.scrollHeight;range=Math.max(range,box.scrollHeight-box.clientHeight);void box.getBoundingClientRect().height;}
    const elapsed=performance.now()-before;return {scrollRangePx:range,layoutAndScroll25ChangesMs:elapsed};
  });
}

async function verifyAuroraIconReview(page){
  const result=await page.evaluate(()=>{
    const qa=document.querySelector('#qaSummary'),panel=document.querySelector('#qaPanel');
    const svg=(selector)=>[...document.querySelectorAll(selector)].every(el=>!!el.querySelector('svg.ui-icon'));
    const root=getComputedStyle(document.documentElement);
    const selected=getComputedStyle(document.querySelector('#paint'));
    return {
      qaInitiallyOpen:qa?.open===true,
      touchFirst:matchMedia('(any-pointer:coarse)').matches||navigator.maxTouchPoints>0,
      checklistInitiallyOpen:panel?.open===true,
      checklistCount:panel?.querySelectorAll('ol>li').length,
      qaHeading:qa?.querySelector('summary')?.textContent?.trim(),
      toolVectors:svg('.rail .tool-button'),
      bottomVectors:svg('.commands button'),
      topVectors:svg('.topbar #home, .topbar #save, .topbar #workspaceToggle'),
      allFeatureVector:!!document.querySelector('#allFeatures svg.ui-icon'),
      boxHeaderVectors:document.querySelectorAll('.box-glyph svg.ui-icon').length,
      categoryVectors:document.querySelectorAll('.feature-category > svg.ui-icon').length,
      auroraBlue:root.getPropertyValue('--aurora-blue').trim().toLowerCase(),
      auroraViolet:root.getPropertyValue('--aurora-violet').trim().toLowerCase(),
      selectedGradient:selected.backgroundImage,
      qaVisible:!!qa&&qa.getBoundingClientRect().height>120,
    };
  });
  assert.ok(result.checklistInitiallyOpen,'QA inner checklist remains available');
  assert.equal(result.qaInitiallyOpen,!result.touchFirst,
    'QA opens by default on desktop but stays unobtrusive on tablets/phones');
  assert.equal(result.checklistCount,12,'All 12 QA items must be visible by scrolling');
  assert.match(result.qaHeading,/実機確認.*12項目/);
  assert.equal(result.qaVisible,!result.touchFirst,'Touch devices must start with an unobstructed Canvas');
  assert.ok(result.toolVectors&&result.bottomVectors&&result.topVectors&&result.allFeatureVector,'Every primary icon is an SVG motif');
  assert.equal(result.boxHeaderVectors,12);assert.equal(result.categoryVectors,12);
  assert.equal(result.auroraBlue,'#5ea8ff');assert.equal(result.auroraViolet,'#8b7cff');
  assert.match(result.selectedGradient,/gradient/i,'Active tool must carry restrained Aurora light');
  if(result.touchFirst)await page.locator('#qaEntry').click();
  const qaPlacement=await page.evaluate(()=>{
    const q=document.querySelector('#qaSummary').getBoundingClientRect(),a=document.querySelector('.document-actions').getBoundingClientRect();
    const overlap=q.left<a.right&&q.right>a.left&&q.top<a.bottom&&q.bottom>a.top;
    return {left:q.left,top:q.top,right:q.right,bottom:q.bottom,height:q.height,overlapsDocuments:overlap};
  });
  assert.ok(!qaPlacement.overlapsDocuments,'Floating QA must not cover New/Open/Export operations');
  assert.ok(qaPlacement.left>=0&&qaPlacement.top>=0&&qaPlacement.right<=await page.evaluate(()=>innerWidth+1),'QA stays within viewport');
  await page.locator('#qaSummary>summary').click();
  assert.equal(await page.locator('#qaSummary').getAttribute('open'),null,'QA can be folded before drawing');
  await page.locator('#qaEntry').click();
  assert.equal(await page.locator('#qaSummary').getAttribute('open'),'','Topbar button reopens hidden QA');
  await page.locator('#qaEntry').click();
  return {...result,qaPlacement};
}

async function verifyTouchAndMouseFeedback(page){
  const all=page.locator('#allFeatures'),r=await all.boundingBox();
  assert.ok(r,'All Features must be touch reachable');
  const cx=r.x+r.width/2,cy=r.y+r.height/2;
  const initial=await page.evaluate(()=>getComputedStyle(document.querySelector('#allFeatures')).backgroundColor);
  await page.touchscreen.tap(cx,cy);
  assert.equal(await page.locator('#allFeaturesPanel').isVisible(),true,'Touch opens feature overlay');
  await page.touchscreen.tap(cx,cy);
  assert.equal(await page.locator('#allFeaturesPanel').isVisible(),false,'Second touch closes feature overlay');
  // CSS transitions can briefly report partially transparent RGB values.
  // Assess the settled touch state, not an animation's intermediate color.
  await page.waitForTimeout(200);
  const after=await page.evaluate(()=>{
    const element=document.querySelector('#allFeatures');
    return {input:document.documentElement.dataset.uiInput,
      color:getComputedStyle(element).backgroundColor,
      hovered:element.matches(':hover'),
      stuckFocus:document.activeElement===element,
      open:element.getAttribute('aria-expanded')};
  });
  assert.equal(after.input,'touch','Actual touch pointer input switches off hover CSS');
  assert.equal(after.color,'rgba(0, 0, 0, 0)',
    'After tap and animation settles, button must have fully transparent unhovered background');
  assert.equal(after.stuckFocus,false,'Tapped button must not retain keyboard-like focus');
  assert.equal(after.open,'false','Transient overlay open state returns to false');

  // Real mouse input restores hover styling, even on a tablet with both a
  // touchscreen and a connected mouse. Emulated touch must not disable mouse.
  await page.mouse.move(cx+Math.min(14,r.width/3),cy);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.uiInput),'hover',
    'Real mouse motion restores mouse hover affordance');
  await page.touchscreen.tap(cx,cy);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.uiInput),'touch',
    'Touch input supersedes mouse hover without sticky retention');
  await page.locator('#featuresClose').click();
  return {initialBackground:initial,afterTouch:after};
}

async function verifyPopupPositionAndAurora(page){
  await page.locator('#allFeatures').click();
  const g=await page.evaluate(()=>{
    const panel=document.getElementById('allFeaturesPanel');
    const trigger=document.getElementById('allFeatures').getBoundingClientRect();
    const box=panel.getBoundingClientRect();
    const bar=document.querySelector('.topbar').getBoundingClientRect();
    const dock=document.getElementById('rightDock').getBoundingClientRect();
    const dockVisible=innerWidth>760&&!document.body.classList.contains('right-collapsed');
    const rules=[...document.styleSheets].flatMap(sheet=>{
      try{return [...sheet.cssRules].map(rule=>rule.cssText)}catch{return []}
    }).join(' ');
    return {
      visible:!panel.hidden,triggerBottom:trigger.bottom,
      rect:{left:box.left,top:box.top,right:box.right,bottom:box.bottom,width:box.width,height:box.height},
      barBottom:bar.bottom,dockLeft:dock.left,dockVisible,
      legacyYellow:/(#fff1c7|#ffdf83|#fff7dc|#f3b83e|#fff0c3|#ffdd84|#edcf81)/i.test(rules),
      backgrounds:{
        features:getComputedStyle(panel).backgroundColor,
        activeTool:getComputedStyle(document.querySelector('#paint')).backgroundImage
      }
    };
  });
  assert.ok(g.visible,'All Features must open');
  assert.ok(g.rect.left>=0&&g.rect.top>=g.barBottom,'Palette must not overlap topbar');
  assert.ok(g.rect.right<=await page.evaluate(()=>innerWidth+1),'Palette must stay onscreen');
  assert.ok(g.rect.bottom<=await page.evaluate(()=>innerHeight+1),'Palette must stay inside viewport');
  assert.ok(g.rect.width>=220&&g.rect.height>100,'Palette must have readable dimensions');
  assert.ok(!g.dockVisible||g.rect.right<=g.dockLeft-4,'Palette must not cover Right Workspace');
  assert.ok(Math.abs(g.rect.bottom-g.triggerBottom)<22,'Palette is anchored to launcher instead of arbitrary screen corner');
  assert.equal(g.legacyYellow,false,'No old yellow CSS tokens may survive in M07');
  await page.locator('[data-category="document-output"]').click();
  const selected=await page.locator('#featuresActions').isVisible();
  assert.ok(selected,'Palette sub-category should open');
  await page.locator('#featuresClose').click();
  return g;
}

async function verifyRightBoxHeaderTargets(page,{all=false}={}){
  const rows=page.locator('.workspace-box');
  assert.equal(await rows.count(),12,'All 12 Right Boxes must be present');
  const indexes=all?Array.from({length:12},(_,i)=>i):[0,1,2,11];
  for(const index of indexes){
    const row=rows.nth(index),arrow=row.locator('.box-toggle'),title=row.locator('.box-title');
    const body=row.locator('.box-body'),summary=row.locator('.box-summary'),more=row.locator('.box-more');
    assert.equal(await title.locator('button').count(),0,'Title is a heading, not a hidden toggle');
    assert.equal(await arrow.locator('.chevron').count(),1,'Dedicated arrow button required');
    const bodyId=await body.getAttribute('id');
    assert.equal(await arrow.getAttribute('aria-controls'),bodyId);
    const before=await arrow.getAttribute('aria-expanded');
    const hit=await arrow.boundingBox(),labelBox=await title.boundingBox();
    assert.ok(hit&&hit.width>=39&&hit.width<=45&&hit.height>=39,
      'Chevron has a bounded 40px hit area');
    assert.ok(labelBox&&hit.x+hit.width<=labelBox.x+1,
      'Chevron hit rectangle must not span the title');
    await title.click();
    assert.equal(await row.evaluate(el=>document.activeElement===el),false,
      'Tapping a static Box title must not place focus on its container');
    assert.equal(await arrow.getAttribute('aria-expanded'),before,
      'Clicking title must NOT fold Right Box');
    await summary.click();
    assert.equal(await row.evaluate(el=>document.activeElement===el),false,
      'Tapping a static Box summary must not place focus on its container');
    assert.equal(await arrow.getAttribute('aria-expanded'),before,
      'Clicking contextual summary must NOT fold Right Box');
    await more.click();
    assert.equal(await arrow.getAttribute('aria-expanded'),before,
      'Clicking More must not implicitly collapse the Box');
    assert.equal(await row.locator('.box-more-menu').isVisible(),true);
    const openerUnobscured=await more.evaluate(el=>{
      const r=el.getBoundingClientRect();
      const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return top===el||el.contains(top);
    });
    assert.equal(openerUnobscured,true,'Floating More menu must never cover its own launcher');
    await more.click();
    assert.equal(await row.locator('.box-more-menu').isVisible(),false);
    await arrow.click();
    assert.notEqual(await arrow.getAttribute('aria-expanded'),before,
      'Only actual chevron click should fold/unfold Box');
    assert.equal(await body.isVisible(),before!=='true');
    const label=await arrow.getAttribute('aria-label');
    assert.match(label,before==='true'?/開く$/:/折りたたむ$/,
      'Chevron accessible label must describe the next action');
    await arrow.focus();await page.keyboard.press('Space');
    assert.equal(await arrow.getAttribute('aria-expanded'),before,
      'Space restores Box expansion without pointer input');
  }
  const first=rows.first().locator('.box-toggle');
  const initial=await first.getAttribute('aria-expanded');
  await first.focus();await page.keyboard.press('Enter');
  assert.notEqual(await first.getAttribute('aria-expanded'),initial);
  await page.keyboard.press('Enter');
  assert.equal(await first.getAttribute('aria-expanded'),initial);
}

async function verifyNaturalMenuAndKeyboard(page){
  const first=page.locator('.workspace-box').first();
  const second=page.locator('.workspace-box').nth(1);
  if(!(await first.locator('.box-more').isVisible()))return;
  const menu=first.locator('.box-more-menu');
  const before=await second.boundingBox();assert.ok(before,'Second Box visible');
  const stackBefore=await page.locator('#boxStack').evaluate(el=>el.scrollHeight);
  await first.locator('.box-more').click();
  const after=await second.boundingBox();assert.ok(after);
  const stackAfter=await page.locator('#boxStack').evaluate(el=>el.scrollHeight);
  assert.ok(Math.abs(before.y-after.y)<1,'Opening More must not shift adjacent Boxes');
  assert.equal(stackBefore,stackAfter,'Opening floating menu must not change stack scroll length');
  assert.equal(await menu.evaluate(el=>getComputedStyle(el).position),'absolute','More is an overlay, not a layout row');
  const bounds=await menu.boundingBox(),stack=await page.locator('#boxStack').boundingBox();
  assert.ok(bounds&&stack&&bounds.x>=stack.x-2&&bounds.x+bounds.width<=stack.x+stack.width+2,
    'More menu stays within Workspace horizontal bounds: '+JSON.stringify({bounds,stack}));
  await first.locator('.box-more').click();

  const more=first.locator('.box-more');
  await more.focus();await page.keyboard.press('Enter');
  assert.equal(await menu.isVisible(),true,'Keyboard can open More');
  assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-collapse-box')),true,
    'Keyboard open focuses the first action');
  await page.keyboard.press('Escape');
  assert.equal(await menu.isVisible(),false,'Escape closes More');
  assert.equal(await more.evaluate(el=>document.activeElement===el),true,
    'Escape restores keyboard focus to opener');

  const all=page.locator('#allFeatures');
  await all.focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#allFeaturesPanel').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('feature-category')),true,
    'Keyboard open must focus first available category');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#featuresActions').isVisible(),true,
    'Category activates using keyboard');
  assert.ok(await page.locator('#featuresItems button').count()>0,'First category exposes actions');
  assert.equal(await page.evaluate(()=>document.activeElement?.closest('#featuresItems')!==null),true,
    'Keyboard category moves focus to first action');
  await page.locator('#featuresBack').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#featuresCategories').isVisible(),true,'Back returns to categories');
  assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('feature-category')),true,
    'Back restores keyboard focus to previous category');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#allFeaturesPanel').isVisible(),false);
  assert.equal(await all.evaluate(el=>document.activeElement===el),true,
    'Escape returns focus to palette launcher');
}

// Light-dismiss regression: a single natural outside gesture closes any
// temporary UI without swallowing the user's drawing or toolbar input.
async function verifyTransientOverlays(page){
  const feature=page.locator('#allFeaturesPanel');
  const qaCard=page.locator('#qaSummary');
  await page.locator('#qaEntry').click();
  assert.equal(await qaCard.getAttribute('open'),'','QA review opens on demand');
  await page.locator('#status').click();
  assert.equal(await qaCard.getAttribute('open'),null,'Outside click naturally hides QA');
  assert.equal(await page.locator('#qaEntry').getAttribute('aria-expanded'),'false');
  await page.locator('#qaEntry').click();
  await page.keyboard.press('Escape');
  assert.equal(await qaCard.getAttribute('open'),null,'Escape dismisses QA review');

  await page.locator('#allFeatures').click();
  assert.equal(await feature.isVisible(),true);
  await page.locator('[data-category="history-automation"]').click();
  assert.equal(await page.locator('#featuresActions').isVisible(),true);
  await page.locator('#status').click();
  assert.equal(await feature.isVisible(),false,'Click outside closes feature palette');
  assert.equal(await page.locator('#allFeatures').getAttribute('aria-expanded'),'false');
  await page.locator('#allFeatures').click();
  assert.equal(await page.locator('#featuresCategories').isVisible(),true,'Reopen shows root categories');
  await page.keyboard.press('Escape');
  assert.equal(await feature.isVisible(),false,'Escape dismisses feature palette');
  assert.equal(await page.locator('#allFeatures').getAttribute('aria-expanded'),'false');
  await page.locator('#allFeatures').click();
  await page.locator('#allFeatures').click();
  assert.equal(await feature.isVisible(),false,'Clicking launcher again closes palette');

  const rightVisible=await page.locator('#workspace').isVisible();
  if(rightVisible){
    const box1=page.locator('.workspace-box').first(),box2=page.locator('.workspace-box').nth(1);
    await box1.locator('.box-more').click();
    assert.equal(await box1.locator('.box-more-menu').isVisible(),true);
    await box2.locator('.box-more').click();
    assert.equal(await box1.locator('.box-more-menu').isVisible(),false,'Next menu closes previous');
    assert.equal(await box2.locator('.box-more-menu').isVisible(),true);
    await page.keyboard.press('Escape');
    assert.equal(await box2.locator('.box-more-menu').isVisible(),false,'Escape closes box menu');
    assert.equal(await box2.locator('.box-more').getAttribute('aria-expanded'),'false');
    await box1.locator('.box-more').click();
    await page.locator('#status').click();
    assert.equal(await box1.locator('.box-more-menu').isVisible(),false,'Outside click closes box menu');
  }
  return {features:true,qa:true,boxMore:rightVisible};
}

// Android selection/callout contract: UI chrome is not prose to copy.
// Real editors remain selectable, so that clipboard and accessibility work.
async function verifyNativeTouchSelectionPolicy(page){
  const styles=await page.evaluate(()=>{
    const inspect=(selector)=>{
      const el=document.querySelector(selector);if(!el)throw Error('Missing touch style target '+selector);
      const css=getComputedStyle(el);
      return {selector,userSelect:css.userSelect,
        webkitUserSelect:css.webkitUserSelect,
        tapHighlight:css.webkitTapHighlightColor,
        webkitCallout:css.getPropertyValue('-webkit-touch-callout')};
    };
    const controls=[
      '.topbar #workspaceToggle','.rail .tool-button','.commands #undo',
      '.workspace-box .box-title','.workspace-box .box-summary',
      '.workspace-box .box-toggle','.workspace-box .box-more',
      '#allFeatures','.feature-category','.box-body label',
      '#qaSummary>summary','#canvas'
    ].map(inspect);
    const input=inspect('#sizeNumber');
    const status=inspect('#status');
    // This textarea is created only in the test to ensure WebKit/Chromium's
    // inheritance quirk doesn't disable native selection inside Box labels.
    const label=document.querySelector('.box-body label');
    const textarea=document.createElement('textarea');
    textarea.value='自由に選択できます';
    label?.append(textarea);textarea.focus();textarea.select();
    const editable=textarea.selectionStart===0&&
      textarea.selectionEnd===textarea.value.length;
    const textareaStyle=getComputedStyle(textarea).userSelect;
    textarea.remove();
    return {controls,input,status,textareaStyle,editable};
  });
  for(const item of styles.controls){
    assert.equal(item.userSelect,'none',
      item.selector+' must not invoke Android copy/select handles');
    assert.equal(item.webkitUserSelect,'none',
      item.selector+' must not invoke Android WebKit text selection');
    assert.ok(item.tapHighlight==='transparent'||item.tapHighlight==='rgba(0, 0, 0, 0)',
      item.selector+' must not show the browser native blue tap overlay');
  }
  assert.equal(styles.input.userSelect,'text','Real numeric editor keeps text selection');
  assert.equal(styles.textareaStyle,'text','Text editor inside a UI label remains selectable');
  assert.ok(styles.editable,'Select-all in real editable controls continues to work');
  assert.notEqual(styles.status.userSelect,'none','Read-only diagnostic text stays copyable');
  if(await page.evaluate(()=>navigator.maxTouchPoints>0)){
    const button=page.locator('#allFeatures'),box=await button.boundingBox();
    assert.ok(box);
    await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
    await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
    assert.equal(await page.locator('#allFeaturesPanel').isVisible(),false,
      'Touch selection policy must not break opening and closing palettes');
  }
  return {controlSurfaces:styles.controls.length,editingPreserved:true};
}

async function checkPage(page,profile){
  const structure=await page.evaluate(()=>{
    const boxes=[...document.querySelectorAll('[data-box-id]')].map(x=>x.getAttribute('data-box-id'));
    return {
      rail:[...document.querySelectorAll('.rail .tool-button')].map(x=>x.id),
      allLast:document.querySelector('.rail')?.lastElementChild?.id,
      boxes,
      categories:document.querySelectorAll('#featuresCategories [data-category]').length,
      buttons:[...document.querySelectorAll('.commands button')].map(x=>x.id),
      top:[...document.querySelectorAll('.topbar>button')].map(x=>x.id),
      layers:[...document.querySelectorAll('#layerPage')].length,
      width:getComputedStyle(document.documentElement).getPropertyValue('--workspace').trim(),
      stackScrollable:getComputedStyle(document.querySelector('.box-stack')).overflowY==='auto',
      stripDocked:!!document.querySelector('.right-dock>.commands'),
      flipDisabled:document.getElementById('flipH').disabled&&document.getElementById('flipV').disabled,
      canvasPresent:!!document.getElementById('canvas'),
      bodyScrollX:document.documentElement.scrollWidth>innerWidth+1
    };
  });
  assert.deepEqual(structure.rail,['paint','erase','smudge','eyedropper','smartFill','selection','transform','move']);
  assert.equal(structure.allLast,'allFeatures');
  assert.equal(structure.boxes.length,12);assert.equal(new Set(structure.boxes).size,12);
  assert.deepEqual(structure.buttons,['layer','undo','redo','flipH','flipV']);
  assert.equal(structure.categories,12);assert.equal(structure.layers,1);
  assert.ok(structure.top.includes('home')&&structure.top.includes('save'));
  assert.ok(structure.stackScrollable&&structure.stripDocked&&structure.flipDisabled&&structure.canvasPresent);
  assert.equal(structure.bodyScrollX,false);
  const expected=profile==='tablet'?360:344;assert.equal(structure.width,expected+'px');
  return structure;
}
try{
  for(const backend of ['webgl2','webgpu']){
    const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base+(publicBase?'?backend='+backend+'&build='+expectedCommit:'?qa=1&backend='+backend),{waitUntil:'networkidle',timeout:45000});
    const visual=await verifyAuroraIconReview(page);
    const popup=await verifyPopupPositionAndAurora(page);
    const transient=await verifyTransientOverlays(page);
    const selectionPolicy=await verifyNativeTouchSelectionPolicy(page);
    const structure=await checkPage(page,'pointer');
    await verifyRightBoxHeaderTargets(page,{all:true});
    await verifyNaturalMenuAndKeyboard(page);
    await startFrameCapture(page);
    await page.locator('#new').click();
    await page.waitForFunction(()=>!document.getElementById('brush')?.disabled,{timeout:45000});
    const state=await qa(page);assert.equal(state.milestone,'M07');assert.equal(state.backendSelection.selected,backend);if(expectedCommit)assert.equal(state.commit,expectedCommit);
    const initFrames=state.presentationFrames;
    await draw(page);await waitCount(page,1);
    // Box state is independent of renderer lifecycle.
    await page.locator('#brushBoxBody').evaluate(el=>el.closest('.workspace-box')?.querySelector('.box-toggle')?.click());
    assert.equal(await page.locator('#brushBoxBody').getAttribute('hidden'),'');
    await page.locator('#workspaceToggle').click();
    await draw(page);await waitCount(page,2);
    await page.locator('#workspaceToggle').click();
    await page.locator('#layer').click();
    assert.notEqual(await page.evaluate(()=>document.activeElement?.id),'closeLayerPage',
      'Pointer opening Layer Page must not move focus to its Close button');
    assert.equal(await page.locator('#layerPage').isVisible(),true);
    assert.equal(await page.locator('#workspace').isVisible(),false);
    assert.ok(await page.locator('#canvas').isVisible());
    await page.locator('#addLayerPage').click();
    await page.waitForFunction(()=>document.getElementById('canvas')?.dataset.layerCount==='2',{timeout:20000});
    await page.locator('#layerPageList .layer-row').first().click();
    assert.equal(await page.locator('#layerPageList .layer-row[aria-pressed=true]').count(),1);
    await draw(page);await waitCount(page,3);
    await page.locator('#layer').click();
    assert.equal(await page.locator('#layerPage').isVisible(),false);
    // Keyboard entry must still transfer focus into the Layer Page.
    await page.locator('#layer').focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'closeLayerPage',
      'Keyboard navigation into Layer Page should focus its Close control');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#layerPage').isVisible(),false);
    assert.equal(await page.locator('#layerList .layer-row[aria-pressed=true]').count(),1);
    await draw(page);await waitCount(page,4);
    const b=page.locator('#splitter .resize-grip');const rect=await b.boundingBox();assert.ok(rect);
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
    await page.mouse.move(rect.x-70,rect.y+rect.height/2,{steps:7});await page.mouse.up();
    const resized=await page.evaluate(()=>Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--workspace')));
    assert.ok(resized>344,'Workspace width did not increase');await draw(page);await waitCount(page,5);
    await verifyPopupPositionAndAurora(page);
    // The text spans are separate DOM hit targets from their parent buttons.
    // They must work without weakening the real ghost-click guard.
    await page.locator('#undo span').click();
    await page.waitForFunction(()=>document.getElementById('canvas')?.dataset.committedStrokes==='4',{timeout:20000});
    await page.locator('#redo span').click();await waitCount(page,5);
    assert.equal((await qa(page)).blockedHistoryGhostClicks,0,
      'Valid presses on Undo/Redo labels must not be classified as ghost clicks');
    await penStroke(page);await waitCount(page,6);
    assert.equal((await qa(page)).lastInputType,'pen','Browser stylus-equivalent input must reach Canvas');
    assert.ok((await qa(page)).presentationFrames>=initFrames);
    assert.deepEqual(errors,[],'JS runtime errors');
    const perf=await stopFrameCapture(page);
    await page.locator('[data-box-id="right.brush"] .box-toggle').click();
    const scrolling=await boxScrollCost(page);
    assert.ok(perf.frameSamples>20,'Frame pacing capture had too few samples');
    assert.ok(scrolling.scrollRangePx>0,'Right Box stack must scroll independently');
    await page.screenshot({path:path.join(evidence,backend+'-1440.png')});
    report.cases.push({backend,auroraIconReview:visual,popup,transient,selectionPolicy,layout:structure,widthAfterResize:resized,drawAfterWorkspaceClosed:true,drawWithLayerPageOpen:true,drawAfterResize:true,stylusEquivalentDraw:true,layerSynced:true,performance:perf,scrolling,errors});
    await context.close();
  }
  for(const [name,width,height,touch] of [
    ['desktop-1920',1920,1080,false],['desktop-1366',1366,768,false],
    ['tablet-1280',1280,800,true],['tablet-1024',1024,768,true],['tablet-portrait',800,1100,true],
    ['compact',390,844,true],['compact-small',360,640,true]
  ]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:false,acceptDownloads:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base+(publicBase?'?backend=webgl2&build='+expectedCommit:'?qa=1&backend=webgl2'),{waitUntil:'networkidle',timeout:45000});
    await verifyAuroraIconReview(page);
    await verifyPopupPositionAndAurora(page);
    if(width>760)await verifyTransientOverlays(page);
    if(touch){await verifyNativeTouchSelectionPolicy(page);await verifyTouchAndMouseFeedback(page);}
    const compact=width<=760;
    if(compact){
      const shortcuts=await page.evaluate(()=>['colorPage','brushPage','layersPage','allFeatures'].map(id=>{
        const button=document.getElementById(id);
        const label=button?.querySelector('span:last-child');
        const b=button?.getBoundingClientRect(),r=label?.getBoundingClientRect();
        return {id,visual:!!button?.querySelector('svg.ui-icon'),
          width:b?.width??0,height:b?.height??0,railWidth:document.querySelector('.rail')?.getBoundingClientRect().width??0,
          labelWidth:r?.width??0,labelScrollWidth:label?.scrollWidth??Infinity};
      }));
      for(const item of shortcuts){
        assert.ok(item.visual,'Compact shortcut SVG missing '+item.id);
        assert.ok(item.labelScrollWidth<=item.labelWidth+1,'Compact caption clipped '+item.id);
        assert.ok(item.height>=40&&item.height<=68,'Compact shortcut cannot occupy a multi-line tall box '+item.id);
        assert.ok(item.width<=item.railWidth,'Compact shortcut exceeds rail '+item.id);
      }
    }
    console.log('M07 viewport',name,width,height,touch);
    if(!compact){
      await checkPage(page,touch?'tablet':'pointer');
      // Light-dismiss testing may close the transient tablet Workspace.
      // Reopen it before checking its 40px Box hit areas.
      if(!(await page.locator('#workspace').isVisible()))await page.locator('#workspaceToggle').click();
      await verifyRightBoxHeaderTargets(page);
      if(name==='desktop-1366'||name==='tablet-1280')await verifyNaturalMenuAndKeyboard(page);
       // A touchscreen must never transfer focus to Workspace Toggle when
       // closing via an inner action. Keyboard activation DOES restore it.
       if(touch&&name==='tablet-1280'){
         // Another palette may have dismissed the floating tablet dock;
         // explicitly restore it before testing controls inside it.
         if(!(await page.locator('#workspace').isVisible()))await page.locator('#workspaceToggle').click();
         // The Workspace-settings Box is collapsed by default. Reveal the
         // action before attempting to tap it; do not mask a hidden target.
         const settingsToggle=page.locator('[data-box-id="right.workspace"] .box-toggle');
         await settingsToggle.scrollIntoViewIfNeeded();
         if(await settingsToggle.getAttribute('aria-expanded')==='false')await settingsToggle.click();
         const hide=page.locator('#hideWorkspace');
         await hide.scrollIntoViewIfNeeded();
         const hit=await hide.boundingBox();assert.ok(hit,'Workspace close action reachable');
         await page.touchscreen.tap(hit.x+hit.width/2,hit.y+hit.height/2);
         assert.equal(await workspaceOpen(page),false,'Touch can close Workspace from its settings');
         assert.notEqual(await page.evaluate(()=>document.activeElement?.id),'workspaceToggle',
           'Touch close must not leave a keyboard focus ring on Workspace Toggle');
         await page.locator('#workspaceToggle').click();
         await hide.scrollIntoViewIfNeeded();
         await hide.focus();await page.keyboard.press('Enter');
         assert.equal(await workspaceOpen(page),false,'Keyboard close still works');
         assert.equal(await page.evaluate(()=>document.activeElement?.id),'workspaceToggle',
           'Keyboard closing Workspace restores a visible focus target');
         await page.locator('#workspaceToggle').click();
       }
    }
    await page.locator('#new').click();await page.waitForFunction(()=>!document.getElementById('brush')?.disabled,{timeout:45000});
    await draw(page);await waitCount(page,1);
    if(touch&&!compact&&name==='tablet-1280'){
      await page.locator('#finger').check();
      await touchStroke(page);await waitCount(page,2);
      assert.equal((await qa(page)).lastInputType,'touch','Touch input must reach Canvas when enabled');
    }
    const canvas=await page.locator('#canvas').boundingBox();assert.ok(canvas&&canvas.width>100);
    if(!compact){
      const isOverlay=await page.evaluate(()=>document.body.classList.contains('right-overlay'));
      if(isOverlay){
        // Temporary Right Workspace: outside gesture hides it; reopened
        // Layer Page also dismisses without losing the drawing gesture.
        await page.locator('#status').click();
        assert.equal(await workspaceOpen(page),false,'Tablet overlay closes outside');
        await page.locator('#workspaceToggle').click();
        assert.equal(await workspaceOpen(page),true,'Tablet overlay can reopen');
        await page.keyboard.press('Escape');
        assert.equal(await workspaceOpen(page),false,'Escape closes tablet overlay');
        await page.locator('#workspaceToggle').click();
        assert.equal(await workspaceOpen(page),true);
      }
      await page.locator('#layer').click();await draw(page);await waitCount(page,name==='tablet-1280'?3:2);
      if(isOverlay){
        assert.equal(await workspaceOpen(page),false,'Painting light-dismisses overlay without swallowing stroke');
        await page.locator('#workspaceToggle').click();
      }
      const x=await page.evaluate(()=>({bodyOverflow:document.documentElement.scrollWidth>innerWidth+1,overlay:document.body.classList.contains('right-overlay')}));
      assert.equal(x.bodyOverflow,false);
      await page.screenshot({path:path.join(evidence,name+'.png')});
    }else{
      assert.equal((await qa(page)).workspaceOpen,false);
      await page.locator('#drawer').click();
      await verifyRightBoxHeaderTargets(page);
      await page.locator('#status').click();
      assert.equal(await workspaceOpen(page),false,'Compact drawer closes on outside tap');
      await page.locator('#drawer').click();
      await page.keyboard.press('Escape');
      assert.equal(await workspaceOpen(page),false,'Escape closes compact drawer');
      await page.locator('#drawer').click();
      const box=await page.locator('#canvas').boundingBox();assert.ok(box);
      const dock=await page.locator('#rightDock').boundingBox();assert.ok(dock);
      const exposed=Math.max(0,Math.min(box.y+box.height,dock.y)-box.y);
      assert.ok(exposed>=42,'Compact drawer must leave a useful visible part of Canvas');
      const sx=box.x+box.width*.5,sy=box.y+Math.min(24,exposed*.5);
      await page.mouse.move(sx,sy);await page.mouse.down();
      await page.mouse.move(sx+Math.min(55,box.width*.2),sy+Math.min(15,box.height*.05),{steps:8});
      await page.mouse.up();await waitCount(page,2);
      assert.equal(await workspaceOpen(page),false,'First painting contact dismisses drawer and reaches Canvas');
      await page.screenshot({path:path.join(evidence,name+'.png')});
    }
    assert.deepEqual(errors,[]);
    report.cases.push({name,viewport:width+'x'+height,touch,canvasWidth:canvas.width,errors});
    await context.close();
  }
  report.status='PASS';console.log('M07 QA PASS '+JSON.stringify({cases:report.cases.length}));
}catch(e){report.errors.push(e.stack||String(e));console.error('M07 QA FAIL',e);process.exitCode=1;}
finally{
  await fs.writeFile(path.join(evidence,publicBase?'m07-public.json':'m07-local.json'),JSON.stringify(report,null,2));
  await browser.close();if(server)await new Promise(ok=>server.close(ok));
}
