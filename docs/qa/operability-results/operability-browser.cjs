const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');

const target = 'https://totoro0419.github.io/illustro/qa/c03-c10-operability/';
const source = '58ac1410009606b568343a5fa95d4ac4c36aa47a';
const output = 'artifacts/operability';
const report = { target, source, cases: [], inventories: {}, console: [], emulation: {}, measuredAt: new Date().toISOString() };
const sizes = [
  ['tablet-landscape', 1280, 800, true],
  ['tablet-portrait', 800, 1280, true],
];

function difference(left, right) {
  const a = PNG.sync.read(left);
  const b = PNG.sync.read(right);
  assert.equal(a.width, b.width);
  assert.equal(a.height, b.height);
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) +
        Math.abs(a.data[i + 2] - b.data[i + 2]) > 55) changed++;
  }
  return changed;
}

function reds(bytes) {
  const { data } = PNG.sync.read(bytes);
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 140 && data[i + 1] < data[i] - 65 && data[i + 2] < data[i] - 65 && data[i + 3] > 140) count++;
  }
  return count;
}

async function observe(page, key) {
  report.inventories[key] = await page.evaluate(() => {
    const modal = document.querySelector('dialog:modal');
    return [...document.querySelectorAll('button,input,select,textarea,summary,a[href],canvas,[role="button"],[role="slider"],[role="separator"],[contenteditable="true"]')].flatMap(el => {
      const style = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if ((modal && !modal.contains(el)) || el.closest('[hidden],[inert]') ||
          !el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) ||
          style.visibility !== 'visible' || !r.width || !r.height) return [];
      const x = Math.round(r.x + r.width / 2);
      const y = Math.round(r.y + r.height / 2);
      const hit = document.elementFromPoint(x, y);
      return [{
        id: el.id || null, scope: el.closest('[data-box-id]')?.dataset.boxId || el.closest('dialog')?.id || el.closest('[data-ih-screen]')?.dataset.ihScreen || null,
        type: el.getAttribute('role') || el.getAttribute('type') || el.localName,
        label: (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent).join(' ') || el.labels?.[0]?.innerText || el.getAttribute('title') || el.innerText || '').trim().slice(0, 150),
        disabled: el.matches(':disabled,[aria-disabled="true"]'),
        rect: [r.x, r.y, r.width, r.height].map(Math.round),
        viewportCenter: x >= 0 && y >= 0 && x < innerWidth && y < innerHeight,
        centerHitsControl: !!hit && (hit === el || el.contains(hit)),
      }];
    });
  });
}

async function run(browser, [mode, width, height, touch], limited = false) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(7500);
  page.on('pageerror', e => report.console.push({ mode, level: 'pageerror', message: String(e) }));
  page.on('console', m => {
    if (['error', 'warning'].includes(m.type())) report.console.push({ mode, level: m.type(), message: m.text().slice(0, 700) });
  });
  const canvas = page.locator('#canvas');
  const testName = 'QA Operability ' + mode;
  const cdp = touch ? await context.newCDPSession(page) : null;
  const cases = [];
  const click = async locator => {
    const control = typeof locator === 'string' ? page.locator(locator) : locator;
    const current = cases.at(-1);
    if (current) {
      const descriptor = await control.evaluate(el => ({
        id: el.id || null,
        scope: el.closest('[data-box-id]')?.dataset.boxId || el.closest('dialog')?.id || el.closest('[data-ih-screen]')?.dataset.ihScreen || null,
        label: (el.getAttribute('aria-label') || el.labels?.[0]?.innerText || el.getAttribute('title') || el.innerText || '').trim().slice(0, 150),
        disabled: el.matches(':disabled,[aria-disabled="true"]'),
      }), null, { timeout: 2800 });
      current.controls.push({ ...descriptor, action: String(typeof locator === 'string' ? locator : control), tapped: false });
    }
    if (touch) await control.tap();
    else await control.click();
    if (current) current.controls.at(-1).tapped = true;
  };
  const byName = (name, scope = page) => scope.getByRole('button', { name, exact: true });
  const picture = async name => page.screenshot({ timeout: 30000, path: output + '/' + mode + '-' + name + '.png' });
  const snap = async () => canvas.screenshot({ timeout: 20000 });
  const idle = async () => {
    await page.waitForFunction(() => document.querySelector('#canvas')?.dataset.historyBusy === 'false', null, { timeout: 10000 });
    await page.waitForTimeout(180);
  };
  const info = async () => canvas.evaluate(el => ({
    rev: el.dataset.revisionId, strokes: Number(el.dataset.committedStrokes),
    layers: Number(el.dataset.layerCount), selected: el.dataset.selectedLayerName,
    pointer: el.dataset.lastPointerType,
  }));
  const capture = async (name, fn) => {
    const entry = { mode, operation: name, controls: [] };
    cases.push(entry);
    try {
      entry.details = await fn();
      entry.status = '正常';
    } catch (error) {
      entry.status = '要確認';
      entry.details = String(error.message).slice(0, 2000);
      const prefix = /^\d{2}/.exec(name)?.[0];
      if (prefix) {
        entry.screenshot = mode + '-' + prefix + '-failure.png';
        await picture(prefix + '-failure').catch(() => {});
        const message = await page.locator('dialog:modal').innerText({ timeout: 300 }).catch(() => '');
        if (message) entry.dialogTail = message.slice(-450);
      }
    }
    cases.pop();
    report.cases.push(entry);
    console.log(JSON.stringify({ ...entry, controls: entry.controls.map(({id,label,tapped}) => [id,label,tapped]) }));
    return entry.status === '正常';
  };
  const stage = (name, fn) => capture(name, fn);
  const observeHere = name => observe(page, mode + '/' + name);
  const goHome = async () => {
    if (await page.locator('#ihNewDialog').isVisible()) await click('#ihNewClose');
    if (await page.locator('#ihStart').isVisible()) return;
    if (await page.locator('#ihNavHome').isVisible()) await click('#ihNavHome');
    else await click('#home');
    await page.locator('#ihStart').waitFor({ state: 'visible' });
  };
  const workList = async () => {
    if (await page.locator('#ihWorksTitle').isVisible()) return;
    await goHome();
    await click('#ihNavWorks');
    await page.locator('#ihWorksTitle').waitFor({ state: 'visible' });
  };
  const openSaved = async () => {
    if (!(await page.locator('#app').evaluate(el => el.inert))) return;
    await workList();
    const card = byName(testName + 'を開く');
    await card.waitFor({ state: 'visible', timeout: 13000 });
    await click(card);
    await canvas.waitFor({ state: 'visible', timeout: 13000 });
    await idle();
  };
  const openBox = async id => {
    if (await page.locator('#layerPage').isVisible()) await click('#closeLayerPage');
    if (await page.locator('#workspace').evaluate(el => el.inert)) await click('#workspaceToggle');
    const toggle = page.locator('[aria-controls="' + id + 'Body"].box-toggle');
    if (await toggle.getAttribute('aria-expanded') === 'false') await click(toggle);
  };
  const closeOverlay = async () => {
    if (await page.locator('body').evaluate(el => el.classList.contains('right-overlay'))) {
      await click('#workspaceToggle');
      assert.ok(await page.locator('#workspace').evaluate(el => el.inert));
      return true;
    }
    return false;
  };
  const getPosition = () => page.locator('#canvas').evaluate(el => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  });
  const tapCanvas = async (x, y) => {
    const b = await getPosition();
    const p = [Math.round(b.x + b.width * x), Math.round(b.y + b.height * y)];
    if (touch) await page.touchscreen.tap(...p);
    else await page.mouse.click(...p);
  };
  const strokes = async (a, b, hold) => {
    const r = await getPosition();
    assert.ok(r.width > 0 && r.height > 0, 'canvas has no screen rectangle');
    const point = p => ({ x: Math.round(r.x + r.width * p[0]), y: Math.round(r.y + r.height * p[1]), id: 1 });
    const from = point(a);
    const to = point(b);
    if (cdp) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
      for (let i = 1; i <= 12; i++) {
        const x = Math.round(from.x + (to.x - from.x) * i / 12);
        const y = Math.round(from.y + (to.y - from.y) * i / 12);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
      }
    } else {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 18 });
    }
    try {
      if (hold) await hold();
    } finally {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      else await page.mouse.up();
    }
    await idle();
  };
  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 24000 });
    await page.locator('#ihStart').waitFor({ state: 'visible' });
    const stamp = await page.request.get(target + 'audit-build.json');
    assert.equal((await stamp.json()).sourceCommit, source);
    report.emulation[mode] = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, touch: navigator.maxTouchPoints, ua: navigator.userAgent, nativeSavePicker: typeof window.showSaveFilePicker }));
    report.emulation[mode].graphics = await page.evaluate(async () => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const adapter = await Promise.race([navigator.gpu?.requestAdapter().catch(() => null), new Promise(resolve => setTimeout(() => resolve(null), 4500))]);
      const result = { webGpuAdapter: !!adapter, webGl2: !!gl, floatTargets: !!gl?.getExtension('EXT_color_buffer_float') };
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      return result;
    });
    await observeHere('home');
    await picture('home').catch(error => report.console.push({ mode, level: 'test-runner', message: String(error.message).slice(0, 200) }));
    const created = await stage('01 キャンバスを作成', async () => {
      await goHome();
      await click('#ihStart');
      await observeHere('new');
      await picture('new-initial').catch(() => {});
      const createPosition = await page.locator('#ihNewCreate').evaluate(el => {
        const b = el.getBoundingClientRect();
        const d = el.closest('dialog').getBoundingClientRect();
        const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return { buttonBottom: Math.round(b.bottom), dialogBottom: Math.round(d.bottom), visibleCenter: !!hit && el.contains(hit) };
      });


      await page.locator('#ihNewName').fill(testName);
      await click('#ihNewCreate');
      await page.locator('#ihNewDialog').waitFor({ state: 'hidden', timeout: limited ? 15000 : 22000 });
      await canvas.waitFor({ state: 'visible' });
      await idle();
      await observeHere('editor');
      await picture('editor').catch(() => {});
      return { createPosition, canvas: await info() };
    });
    if (!created || limited) return;
    if (touch) {
      await stage('タッチ・初期状態の指描き', async () => {
        await openBox('brushBox');
        const finger = page.locator('#finger');
        const enabled = await finger.isChecked();
        await closeOverlay();
        const before = (await info()).strokes;
        await strokes([.16, .13], [.48, .13]);
        const after = (await info()).strokes;
        assert.equal(after > before, enabled);
        return { enabled, strokeCountBefore: before, strokeCountAfter: after };
      });
      await stage('タッチ・指で描く設定をオン', async () => {
        await openBox('brushBox');
        const finger = page.locator('#finger');
        const label = finger.locator('xpath=parent::label');
        await label.scrollIntoViewIfNeeded({timeout:6000});
        await picture('finger-control');
        if (!(await finger.isChecked())) await click(label);
        await page.waitForTimeout(400);
        const state = await finger.evaluate(el => ({
          checked: el.checked,
          style: getComputedStyle(el).display,
          label: el.parentElement.innerText,
          bounds: el.getBoundingClientRect().toJSON(),
        }));
        assert.ok(state.checked, JSON.stringify(state));
        await closeOverlay();
        return state;
      });
    }
    let fingerStrokeOk = false;
    await stage('02 ブラシを選び線を描く', async () => {
      await closeOverlay();
      await click('#paint');
      assert.equal(await page.locator('#paint').getAttribute('aria-pressed'), 'true');
      const original = await info();
      const blank = await snap();
      let visibleDuring = 0;
      await strokes([.29, .43], [.67, .43], async () => {
        await page.waitForTimeout(130);
        const held = await snap();
        await fs.writeFile(output + '/' + mode + '-drawing-held.png', held);
        visibleDuring = difference(blank, held);
      });
      const after = await info();
      assert.ok(after.strokes > original.strokes, 'stroke counter did not advance');
      const committed = await snap();
      await fs.writeFile(output + '/' + mode + '-drawing-committed.png', committed);
      const visibleAfter = difference(blank, committed);
      await stage('03 描画中と終了後の線の表示', async () => {
        assert.ok(visibleDuring > 15 && visibleAfter > 15, JSON.stringify({ visibleDuring, visibleAfter }));
        return { visibleDuring, visibleAfter };
      });
      if (touch) assert.equal(after.pointer, 'touch');
      fingerStrokeOk = true;
      return { visibleAfter, pointer: after.pointer };
    });
    async function pen(a,b) {
      const r = await getPosition();
      const point = p => ({ x: Math.round(r.x + r.width*p[0]), y: Math.round(r.y + r.height*p[1]) });
      const first = point(a), last = point(b);
      const hit = await page.evaluate(({x,y}) => document.elementFromPoint(x,y)?.id, first);
      assert.equal(hit,'canvas','pen starts on '+hit);
      const send = (type, p, buttons) => cdp.send('Input.dispatchMouseEvent', {type,...p,button:type==='mouseMoved'?'none':'left',buttons,clickCount:1,pointerType:'pen',force: buttons ? 0.55 : 0});
      await send('mousePressed',first,1);
      for (let i=1;i<=18;i++) {
        await send('mouseMoved',{x:Math.round(first.x+(last.x-first.x)*i/18),y:Math.round(first.y+(last.y-first.y)*i/18)},1);
      }
      await send('mouseReleased',last,0);
      await idle();
    }
    if (!fingerStrokeOk) {
      await stage('再確認・ブラウザでペン入力を再現', async () => {
        await closeOverlay();
        const before = await info();
        const pixels = await snap();
        await pen([.29,.43],[.67,.43]);
        const after = await info();
        const changed = difference(pixels,await snap());
        assert.equal(after.pointer,'pen');
        assert.ok(after.strokes > before.strokes && changed>15, JSON.stringify({after,changed}));
        await picture('pen-stroke');
        return {pointer:after.pointer,changed};
      });
    }
    const draw = fingerStrokeOk ? strokes : pen;
    let firstSize, changedSize;
    await stage('04 色と太さの変更', async () => {
      await openBox('colorBox');
      const color = page.locator('#colorHex');
      await color.fill('#EF243C');
      await color.press('Enter');
      assert.equal((await color.inputValue()).toUpperCase(), '#EF243C');
      await openBox('brushBox');
      const size = page.locator('#sizeNumber');
      const previousSize = await size.inputValue();
      firstSize = Number(previousSize);
      await size.fill('28');
      await size.press('Tab');
      assert.equal(Number(await size.inputValue()), 28);
      changedSize = 28;
      assert.notEqual(changedSize, firstSize);
      return { color: await color.inputValue(), size: await size.inputValue(), previousSize };
    });
    await stage('編集・右パネルを閉じて再度開く', async () => {
      const workspace = page.locator('#workspace');
      if (!(await workspace.evaluate(el => el.inert))) await click('#workspaceToggle');
      assert.ok(await workspace.evaluate(el => el.inert));
      await click('#workspaceToggle');
      assert.ok(!(await workspace.evaluate(el => el.inert)));
      await closeOverlay();
    });
    await stage('05 色を変えた線と太さの変化', async () => {
      const before = await snap();
      await draw([.28, .53], [.69, .53]);
      const after = await snap();
      const redIncrease = reds(after) - reds(before);
      assert.ok(redIncrease > 80, 'red pixel increase=' + redIncrease);
      return { redIncrease, previousSize: firstSize, changedSize };
    });
    await stage('06 消しゴムで線の一部を消す', async () => {
      await click('#erase');
      const before = await snap();
      await draw([.46, .48], [.46, .59]);
      const redRemoved = reds(before) - reds(await snap());
      assert.ok(redRemoved > 5, 'red pixel decrease=' + redRemoved);
      return { redRemoved };
    });
    await stage('07 レイヤーを追加', async () => {
      await openBox('layersBox');
      const before = await info();
      await click('#addLayer');
      await idle();
      const after = await info();
      assert.equal(after.layers, before.layers + 1);
      assert.notEqual(after.selected, before.selected);
      await observeHere('layers-inline');
      return after;
    });
    await stage('08 追加したレイヤーに描く', async () => {
      await click('#paint');
      await closeOverlay();
      const before = await snap();
      const selected = (await info()).selected;
      await draw([.28, .60], [.66, .60]);
      assert.equal((await info()).selected, selected);
      const pixels = difference(before, await snap());
      assert.ok(pixels > 15, 'changed pixels=' + pixels);
      return { selected, pixels };
    });
    let shownImage, hiddenImage;
    await stage('09 レイヤーの表示切替', async () => {
      await openBox('layersBox');
      const selected = (await info()).selected;
      shownImage = await snap();
      await click(byName(selected + 'を非表示にする', page.locator('#layerList')));
      await idle();
      assert.ok(await byName(selected + 'を表示する', page.locator('#layerList')).isVisible());
      hiddenImage = await snap();
      const pixels = difference(shownImage, hiddenImage);
      assert.ok(pixels > 15, 'layer switch did not change rendered pixels: ' + pixels);
      return { selected, pixels, visualChanged: pixels > 15 };
    });
    await stage('10 元に戻す', async () => {
      await click('#undo');
      await idle();
      const selected = (await info()).selected;
      assert.ok(await byName(selected + 'を非表示にする', page.locator('#layerList')).isVisible());
      if (shownImage) assert.ok(difference(shownImage, await snap()) < 100, 'undo rendering differs from prior state');
    });
    await stage('11 やり直す', async () => {
      await click('#redo');
      await idle();
      const selected = (await info()).selected;
      assert.ok(await byName(selected + 'を表示する', page.locator('#layerList')).isVisible());
      if (hiddenImage) assert.ok(difference(hiddenImage, await snap()) < 100, 'redo rendering differs from prior state');
      await click(byName(selected + 'を表示する', page.locator('#layerList')));
      await idle();
    });
    await stage('12 四角い選択範囲を作る', async () => {
      await click('#selection');
      await closeOverlay();
      const before = await snap();
      await draw([.24, .56], [.63, .67]);
      const delta = difference(before, await snap());
      const selectionStatus = await page.locator('#selectionStatus').textContent();
      assert.match(selectionStatus, /範囲を設定しました/);
      assert.ok(delta > 10, 'selection marker changed pixels=' + delta);
      return { delta, selectionStatus };
    });
    await stage('13 選択した内容の変形', async () => {
      await openBox('documentBox');
      const panel = page.locator('[data-edit-panel="transform"]');
      if (!(await panel.evaluate(el => el.open))) await click(panel.locator(':scope > summary'));
      await observeHere('transform');
      await panel.getByLabel('変形する対象').selectOption('selected');
      await click(byName('変形を始める', panel));
      const dx = panel.locator('label').filter({hasText:'横の移動（px）'}).locator('input');
      const message = panel.locator(':scope > output').first();
      await page.waitForTimeout(350);
      assert.ok(await dx.isEnabled(), await message.textContent());
      await dx.waitFor({ state: 'visible' });
      await dx.fill('28');
      await dx.press('Tab');
      assert.equal(Number(await dx.inputValue()), 28);
      const old = (await info()).rev;
      await click(byName('変形を適用', panel));
      await panel.getByText('変形を適用しました。', { exact: true }).waitFor({ timeout: 10000 });
      await idle();
      const next = (await info()).rev;
      assert.notEqual(next, old, 'transform left the document revision unchanged');
      await picture('transform-result');
      await click(panel.locator(':scope > summary'));
      return { old, next, movedBy: 28 };
    });
    await stage('選択範囲・解除', async () => {
      await openBox('documentBox');
      const clear = page.locator('#selectionClear');
      if (await clear.isEnabled()) await click(clear);
      assert.match(await page.locator('#selectionStatus').textContent(), /選択範囲なし/);
    });
    await stage('14 塗りつぶし', async () => {
      await openBox('documentBox');
      const panel = page.locator("#documentBoxBody details > summary").filter({ hasText: "塗りつぶし・線画の領域" }).locator("xpath=..");
      const summary = panel.locator(':scope > summary');
      if (!(await panel.evaluate(el => el.open))) await click(summary);
      await observeHere('fill');
      await panel.locator('select').filter({has:page.locator('option[value=under]')}).selectOption('under');
      await click(byName('キャンバスで塗る', panel));
      const old = await info();
      await tapCanvas(.30, .50);
      const apply = byName('候補を適用', panel);
      await click(apply);
      await panel.getByText(/塗りを反映しました/).waitFor({ timeout: 9000 });
      await idle();
      const next = await info();
      assert.notEqual(next.rev, old.rev);
      assert.equal(next.layers, old.layers + 1);
      await picture('fill-result');
      await click(summary);
      return { beforeLayers: old.layers, afterLayers: next.layers };
    });
    let documentFile;
    await stage('15 作品を保存', async () => {
      const download = page.waitForEvent('download', { timeout: 18000 }).catch(() => null);
      await click('#save');
      const file = await download;
      const status = await page.locator('#status').innerText();
      assert.ok(file, 'No .illustro download. Status: ' + status);
      assert.ok(file.suggestedFilename().endsWith('.illustro'));
      documentFile = output + '/' + mode + '-artwork.illustro';
      await file.saveAs(documentFile);
      const bytes = (await fs.stat(documentFile)).size;
      assert.ok(bytes > 300);
      return { filename: file.suggestedFilename(), bytes, status };
    });
    let baseline, savedState;
    await stage('16 ページを再読み込み', async () => {
      await idle();
      await closeOverlay();
      baseline = await snap();
      savedState = await info();
      await picture('before-reload');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#ihApp, #canvas').first().waitFor({ state: 'attached', timeout: 15000 });
      const url = page.url();
      return { url, home: await page.locator('#ihStart').isVisible() };
    });
    await stage('17 保存した線・色・レイヤーを復元', async () => {
      await page.waitForFunction(() => document.querySelector('#ihStart') || (document.querySelector('#canvas')?.dataset.layerCount > 0), null, { timeout: 13000 });
      if (await page.locator('#app').evaluate(el => el.inert)) {
        await click('#ihNavWorks');
        await byName(testName + 'を開く').waitFor({ state: 'visible', timeout: 10000 });
        await observeHere('works-saved');
        await click(byName(testName + 'を開く'));
      }
      await canvas.waitFor({ state: 'visible', timeout: 11000 });
      await idle();
      await closeOverlay();
      const restored = await snap();
      await picture('reopened');
      const actual = await info();
      assert.equal(actual.layers, savedState.layers);
      assert.ok(reds(restored) > 30, 'restored image has no measured red stroke');
      assert.equal(actual.rev, savedState.rev);
      let compared = null;
      const before = PNG.sync.read(baseline);
      const after = PNG.sync.read(restored);
      if (before.width === after.width && before.height === after.height) {
        compared = difference(baseline, restored);
        assert.ok(compared < 2200, 'canvas pixels changed after reopen=' + compared);
      }
      return { layers: actual.layers, revision: actual.rev, reds: reds(restored), compared };
    });
    let exported;
    await stage('18 PNGを書き出す', async () => {
      await openSaved();
      await openBox('documentBox');
      const control = page.locator('#documentBoxBody').getByRole('button', {name:'画像を書き出す', exact:true}).first();
      const layout = await control.evaluate(el => {
        const r = el.getBoundingClientRect();
        return { text: el.innerText, width: Math.round(r.width), height: Math.round(r.height), scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight, whiteSpace: getComputedStyle(el).whiteSpace };
      });
      await click(control);
      await observeHere('export');
      await picture('export-dialog');
      await page.locator('#exportFormat').selectOption('png');
      const download = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
      await click('#exportRun');
      const file = await download;
      assert.ok(file?.suggestedFilename().endsWith('.png'));
      const path = output + '/' + mode + '-export.png';
      await file.saveAs(path);
      exported = await fs.readFile(path);
      return { filename: file.suggestedFilename(), bytes: exported.length, layout };
    });
    await stage('19 書き出したPNGの内容', async () => {
      assert.ok(exported, 'No downloaded file to inspect');
      const result = PNG.sync.read(exported);
      assert.deepEqual([result.width, result.height], [512, 384]);
      const red = reds(exported);
      assert.ok(red > 30, 'exported red pixel count=' + red);
      return { width: result.width, height: result.height, red };
    });
    await stage('20 ホームから開いて編集を継続', async () => {
      await goHome();
      await workList();
      await observeHere('works-return');
      await click(byName(testName + 'を開く'));
      await canvas.waitFor({ state: 'visible', timeout: 11000 });
      await idle();
      await click('#paint');
      await closeOverlay();
      const before = await snap();
      await draw([.27, .48], [.64, .48]);
      const changed = difference(before, await snap());
      assert.ok(changed > 15, 'post-reopen changed pixels=' + changed);
      return { changed };
    });
  } catch (e) {
    report.cases.push({ mode, operation: '実行環境またはページの停止', status: '要確認', details: String(e.stack).slice(0, 1200) });
    await picture('fatal').catch(() => {});
  } finally {
    await context.close();
  }
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const flags = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader', '--disable-blink-features=FileSystemAccessLocal'];
  report.flags = flags;
  const browser = await chromium.launch({ headless: true, args: flags });
  try {
    for (const size of sizes) await run(browser, size);
  } finally {
    await browser.close();
    await fs.writeFile(output + '/results.json', JSON.stringify(report, null, 2));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
