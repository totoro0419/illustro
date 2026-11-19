const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');

const target = 'https://totoro0419.github.io/illustro/qa/c03-c10-operability/';
const source = '58ac1410009606b568343a5fa95d4ac4c36aa47a';
const output = 'artifacts/operability';
const report = { target, source, cases: [], inventories: {}, console: [], emulation: {}, measuredAt: new Date().toISOString() };
const sizes = [
  ['PC', 1365, 768, false],
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
        id: el.id || null, scope: el.closest('[data-box-id]')?.dataset.boxId || el.closest('dialog')?.id || null,
        type: el.getAttribute('role') || el.getAttribute('type') || el.localName,
        label: (el.getAttribute('aria-label') || el.labels?.[0]?.innerText || el.getAttribute('title') || el.innerText || '').trim().slice(0, 150),
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
  page.setDefaultTimeout(3200);
  page.on('pageerror', e => report.console.push({ mode, level: 'pageerror', message: String(e) }));
  page.on('console', m => {
    if (['error', 'warning'].includes(m.type())) report.console.push({ mode, level: m.type(), message: m.text().slice(0, 700) });
  });
  const canvas = page.locator('#canvas');
  const testName = 'QA Operability ' + mode;
  const cdp = touch ? await context.newCDPSession(page) : null;
  const click = async locator => {
    const control = typeof locator === 'string' ? page.locator(locator) : locator;
    if (touch) await control.tap();
    else await control.click();
  };
  const byName = (name, scope = page) => scope.getByRole('button', { name, exact: true });
  const picture = async name => page.screenshot({ path: output + '/' + mode + '-' + name + '.png' });
  const snap = async () => canvas.screenshot();
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
    const entry = { mode, operation: name };
    try {
      entry.details = await fn();
      entry.status = '正常';
    } catch (error) {
      entry.status = '要確認';
      entry.details = String(error.message).split('Call log:')[0].slice(0, 500);
      if (name.startsWith('01') || name.startsWith('02') || name.startsWith('17')) {
        await picture(name.slice(0, 2) + '-failure').catch(() => {});
      }
    }
    report.cases.push(entry);
    console.log(JSON.stringify(entry));
    return entry.status === '正常';
  };
  const stage = (name, fn) => capture(name, fn);
  const observeHere = name => observe(page, mode + '/' + name);
  const openBox = async id => {
    if (await page.locator('#layerPage').isVisible()) await click('#closeLayerPage');
    if (await page.locator('#workspace').evaluate(el => el.inert)) await click('#workspaceToggle');
    const toggle = page.locator('[aria-controls="' + id + 'Body"].box-toggle');
    if (await toggle.getAttribute('aria-expanded') === 'false') await click(toggle);
  };
  const strokes = async (a, b, hold) => {
    const r = await canvas.boundingBox();
    assert.ok(r, 'canvas has no screen rectangle');
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
    report.emulation[mode] = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, touch: navigator.maxTouchPoints, ua: navigator.userAgent }));
    await observeHere('home');
    await picture('home');
    if (!limited) {
      await stage('ホーム・紹介 次の機能', async () => {
        const title = await page.locator('#ihFeatureTitle').textContent();
        await click('#ihFeatureNext');
        assert.notEqual(await page.locator('#ihFeatureTitle').textContent(), title);
      });
      await stage('ホーム・紹介 前の機能', async () => {
        const title = await page.locator('#ihFeatureTitle').textContent();
        await click('#ihFeaturePrev');
        assert.notEqual(await page.locator('#ihFeatureTitle').textContent(), title);
      });
      await stage('ホーム・機能を詳しく見る', async () => {
        await click('#ihFeatureMore');
        assert.ok(await page.locator('#ihDetailTitle').isVisible());
        await observeHere('feature');
        await click('#ihNavHome');
        assert.ok(await page.locator('#ihStart').isVisible());
      });
      await stage('ホーム・紹介画像から詳細', async () => {
        await click('#ihFeatureVisual');
        assert.ok(await page.locator('#ihDetailTitle').isVisible());
        await click('#ihBrand');
        assert.ok(await page.locator('#ihStart').isVisible());
      });
      await stage('ホーム・設定', async () => {
        await click('#ihNavSettings');
        assert.ok(await page.locator('#ihSettingsTitle').isVisible());
        await observeHere('settings');
        return await page.locator('[data-ih-screen="settings"]').innerText();
      });
      await stage('ホーム・マイ作品のタブ', async () => {
        await click('#ihNavWorks');
        assert.ok(await page.locator('#ihWorksTitle').isVisible());
        await observeHere('works-empty');
        await click('#ihNavHome');
        assert.ok(await page.locator('#ihStart').isVisible());
      });
      await stage('ホーム・マイ作品のカード', async () => {
        await click('#ihWorks');
        assert.ok(await page.locator('#ihWorksTitle').isVisible());
        await click('#ihNavHome');
      });
    }
    const created = await stage('01 キャンバスを作成', async () => {
      await click('#ihStart');
      await observeHere('new');
      await picture('new-initial');
      const createPosition = await page.locator('#ihNewCreate').evaluate(el => {
        const b = el.getBoundingClientRect();
        const d = el.closest('dialog').getBoundingClientRect();
        const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return { buttonBottom: Math.round(b.bottom), dialogBottom: Math.round(d.bottom), visibleCenter: !!hit && el.contains(hit) };
      });
      if (!limited) {
        await stage('新規・ファイルから開くへの切替', async () => {
          await click('#ihChoiceFile');
          assert.ok(await page.locator('#ihSelectFile').isVisible());
          await observeHere('new-file');
          await click('#ihChoiceBlank');
          assert.ok(await page.locator('#ihNewName').isVisible());
        });
        await stage('新規・作品情報の展開', async () => {
          const section = page.locator('#ihBlankForm summary');
          await click(section);
          assert.ok(await section.evaluate(el => el.parentElement.open));
          await observeHere('new-metadata');
          await click(section);
        });
      }
      await page.locator('#ihNewName').fill(testName);
      await click('#ihNewCreate');
      await page.locator('#ihNewDialog').waitFor({ state: 'hidden', timeout: limited ? 14000 : 22000 });
      await canvas.waitFor({ state: 'visible' });
      await idle();
      await observeHere('editor');
      await picture('editor');
      return { createPosition, canvas: await info() };
    });
    if (!created || limited) return;
    await stage('02 ブラシを選び線を描く', async () => {
      await click('#paint');
      assert.equal(await page.locator('#paint').getAttribute('aria-pressed'), 'true');
      const original = await info();
      const blank = await snap();
      let visibleDuring = 0;
      await strokes([.25, .29], [.67, .29], async () => {
        await page.waitForTimeout(130);
        const held = await snap();
        await fs.writeFile(output + '/' + mode + '-drawing-held.png', held);
        visibleDuring = difference(blank, held);
      });
      const after = await info();
      assert.ok(after.strokes > original.strokes, 'stroke counter did not advance');
      const visibleAfter = difference(blank, await snap());
      await stage('03 描画中と終了後の線の表示', async () => {
        assert.ok(visibleDuring > 15 && visibleAfter > 15, JSON.stringify({ visibleDuring, visibleAfter }));
        return { visibleDuring, visibleAfter };
      });
      if (touch) assert.equal(after.pointer, 'touch');
      return { visibleAfter, pointer: after.pointer };
    });
    await stage('04 色と太さの変更', async () => {
      await openBox('colorBox');
      const color = page.locator('#colorHex');
      await color.fill('#EF243C');
      await color.press('Enter');
      assert.equal((await color.inputValue()).toUpperCase(), '#EF243C');
      await openBox('brushBox');
      const size = page.locator('#sizeNumber');
      await size.fill('28');
      await size.press('Tab');
      assert.equal(Number(await size.inputValue()), 28);
      return { color: await color.inputValue(), size: await size.inputValue() };
    });
    if (width <= 900 && !(await page.locator('#workspace').evaluate(el => el.inert))) {
      await stage('編集・右パネルを閉じる', async () => {
        await click('#workspaceToggle');
        assert.ok(await page.locator('#workspace').evaluate(el => el.inert));
      });
    }
    await stage('05 色を変えた線と太さの変化', async () => {
      const before = await snap();
      await strokes([.22, .42], [.68, .42]);
      const after = await snap();
      const redIncrease = reds(after) - reds(before);
      assert.ok(redIncrease > 80, 'red pixel increase=' + redIncrease);
      return { redIncrease };
    });
    await stage('06 消しゴムで線の一部を消す', async () => {
      await click('#erase');
      const before = await snap();
      await strokes([.46, .36], [.46, .51]);
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
      if (width <= 900 && !(await page.locator('#workspace').evaluate(el => el.inert))) await click('#workspaceToggle');
      const before = await snap();
      const selected = (await info()).selected;
      await strokes([.28, .64], [.66, .64]);
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
      if (width <= 900 && !(await page.locator('#workspace').evaluate(el => el.inert))) await click('#workspaceToggle');
      const before = await snap();
      await strokes([.22, .57], [.64, .76]);
      const delta = difference(before, await snap());
      assert.ok(delta > 10, 'selection marker changed pixels=' + delta);
      return { delta };
    });
    await stage('13 選択した内容の変形', async () => {
      await click('#transform');
      const panel = page.locator('[data-edit-panel="transform"]');
      assert.ok(await panel.isVisible());
      await observeHere('transform');
      const description = (await panel.innerText()).slice(0, 800);
      throw Error('変形画面を開いた。移動の確定・画素変化はまだ検査していない。 ' + description);
    });
    await stage('14 塗りつぶし', async () => {
      if (width <= 900 && !(await page.locator('#workspace').evaluate(el => el.inert))) await click('#workspaceToggle');
      await click('#smartFill');
      const before = await snap();
      const r = await canvas.boundingBox();
      if (touch) await page.touchscreen.tap(r.x + r.width * .30, r.y + r.height * .82);
      else await page.mouse.click(r.x + r.width * .30, r.y + r.height * .82);
      await idle();
      const changes = difference(before, await snap());
      assert.ok(changes > 100, 'fill output not confirmed; changed pixels=' + changes);
      return { changes };
    });
    await stage('15 作品を保存', async () => {
      const old = await page.locator('#saveState').innerText();
      await click('#save');
      await page.waitForTimeout(500);
      return { before: old, after: await page.locator('#saveState').innerText(), status: await page.locator('#status').innerText() };
    });
    let baseline, savedState;
    await stage('16 ページを再読み込み', async () => {
      await idle();
      baseline = await snap();
      savedState = await info();
      await picture('before-reload');
      await page.reload({ waitUntil: 'domcontentloaded' });
      const url = page.url();
      return { url, home: await page.locator('#ihStart').isVisible() };
    });
    await stage('17 保存した線・色・レイヤーを復元', async () => {
      if (!(await canvas.isVisible())) {
        await click('#ihNavWorks');
        await observeHere('works-saved');
        await click(page.getByRole('button', { name: new RegExp(testName) }).first());
      }
      await canvas.waitFor({ state: 'visible', timeout: 11000 });
      await idle();
      const restored = await snap();
      await picture('reopened');
      const actual = await info();
      assert.equal(actual.layers, savedState.layers);
      assert.ok(reds(restored) > 30, 'restored image has no measured red stroke');
      const compared = difference(baseline, restored);
      assert.ok(compared < 2200, 'canvas pixels changed after reopen=' + compared);
      return { layers: actual.layers, reds: reds(restored), compared };
    });
    let exported;
    await stage('18 PNGを書き出す', async () => {
      if (!(await page.locator('#exportImage').isVisible())) await openBox('documentBox');
      await click('#exportImage');
      await observeHere('export');
      await picture('export-dialog');
      await page.locator('#exportFormat').selectOption('png');
      const download = page.waitForEvent('download', { timeout: 12000 });
      await click('#exportRun');
      const file = await download;
      assert.ok(file.suggestedFilename().endsWith('.png'));
      const path = output + '/' + mode + '-export.png';
      await file.saveAs(path);
      exported = await fs.readFile(path);
      return { filename: file.suggestedFilename(), bytes: exported.length };
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
      await click('#home');
      await click('#ihNavWorks');
      await observeHere('works-return');
      await click(page.getByRole('button', { name: new RegExp(testName) }).first());
      await canvas.waitFor({ state: 'visible', timeout: 11000 });
      await idle();
      const before = await snap();
      await click('#paint');
      if (width <= 900 && !(await page.locator('#workspace').evaluate(el => el.inert))) await click('#workspaceToggle');
      await strokes([.27, .79], [.64, .79]);
      const changed = difference(before, await snap());
      assert.ok(changed > 15, 'post-reopen changed pixels=' + changed);
      return { changed };
    });
    await stage('編集・全機能と各カテゴリ', async () => {
      await click('#allFeatures');
      await observeHere('features');
      const cats = await page.locator('#featuresCategories [data-category]').evaluateAll(els => els.map(el => el.dataset.category));
      const opened = [];
      for (const category of cats) {
        await stage('全機能・' + category, async () => {
          await click('#featuresCategories [data-category="' + category + '"]');
          assert.ok(await page.locator('#featuresBack').isVisible());
          await observeHere('features-' + category);
          opened.push(category);
          await click('#featuresBack');
        });
      }
      await click('#featuresClose');
      assert.ok(!(await page.locator('#allFeaturesPanel').isVisible()));
      return { opened };
    });
    await stage('編集・レイヤー詳細画面', async () => {
      await click('#layer');
      assert.ok(await page.locator('#layerPage').isVisible());
      await observeHere('layer-page');
      await click('#closeLayerPage');
      assert.ok(!(await page.locator('#layerPage').isVisible()));
    });
    await stage('編集・右側パネルの展開と折りたたみ', async () => {
      const ids = await page.locator('.workspace-box .box-toggle').evaluateAll(els => els.map(el => el.getAttribute('aria-controls')));
      for (const id of ids) {
        await stage('パネル・' + id, async () => {
          const toggle = page.locator('.box-toggle[aria-controls="' + id + '"]');
          if (await page.locator('#workspace').evaluate(el => el.inert)) await click('#workspaceToggle');
          if (await toggle.getAttribute('aria-expanded') === 'true') await click(toggle);
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
          await click(toggle);
          assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
          await observeHere('panel-' + id);
          const container = toggle.locator('xpath=ancestor::section[contains(@class,"workspace-box")]');
          const more = container.locator('.box-more');
          await click(more);
          assert.ok(await container.locator('.box-more-menu').isVisible());
          await observeHere('menu-' + id);
          await click(more);
          const details = await page.locator('#' + id + ' details').evaluateAll(els => els.map((el, n) => [n, el.open]));
          for (const [n, opened] of details) {
            const detail = page.locator('#' + id + ' details').nth(n);
            const summary = detail.locator(':scope > summary');
            if (!opened && await summary.isVisible()) {
              await stage('詳細・' + id + '・' + (await summary.innerText()).slice(0, 60), async () => {
                await click(summary);
                assert.ok(await detail.evaluate(el => el.open));
                await observeHere('details-' + id + '-' + n);
                await click(summary);
              });
            }
          }
          await click(toggle);
        });
      }
    });
    await stage('キャンバス・拡大、全体表示、左右反転', async () => {
      const zoom = await page.locator('#zoomPercent').innerText();
      await click('#zoomIn');
      assert.notEqual(await page.locator('#zoomPercent').innerText(), zoom);
      await click('#fitView');
      await click('#flipH');
      assert.equal(await page.locator('#flipH').getAttribute('aria-pressed'), 'true');
      await click('#flipH');
      assert.equal(await page.locator('#flipH').getAttribute('aria-pressed'), 'false');
    });
    await stage('画面の縦横を変更して編集画面を継続', async () => {
      await page.setViewportSize({ width: width === 800 ? 1280 : 800, height: width === 800 ? 800 : 1280 });
      assert.ok(await canvas.isVisible());
      await click('#paint');
      const before = await snap();
      await strokes([.19, .15], [.47, .15]);
      assert.ok(difference(before, await snap()) > 15);
      await picture('resized');
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
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  try {
    await Promise.all(sizes.map(size => run(browser, size)));
  } finally {
    await browser.close();
    await fs.writeFile(output + '/results.json', JSON.stringify(report, null, 2));
  }
  const limited = await chromium.launch({ headless: true, args: ['--disable-webgl', '--disable-webgpu'] });
  try {
    await run(limited, ['gpu-unavailable', 1365, 768, false], true);
  } finally {
    await limited.close();
    await fs.writeFile(output + '/results.json', JSON.stringify(report, null, 2));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
