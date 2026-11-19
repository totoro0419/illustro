import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const output = process.env.PREVIEW_SMOKE_OUTPUT ?? 'artifacts/preview-smoke';
const before = process.env.PREVIEW_SMOKE_BASELINE;
const after = process.env.PREVIEW_SMOKE_BUILD ?? 'apps/editor/dist';
const expectedCommit = process.env.EXPECTED_COMMIT_SHA;
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp',
};
let root = after;
const server = http.createServer(async (request, response) => {
  const prefix = '/illustro/preview/';
  const route = new URL(request.url, 'http://localhost').pathname;
  if (!route.startsWith(prefix)) {
    response.writeHead(404).end();
    return;
  }
  const relative = route.slice(prefix.length) || 'index.html';
  try {
    response.setHeader('Content-Type', mime[path.extname(relative)] ?? 'application/octet-stream');
    response.end(await readFile(path.join(root, relative)));
  } catch {
    response.writeHead(404).end();
  }
});
await mkdir(output, { recursive: true });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = process.env.PREVIEW_SMOKE_URL ??
  `http://127.0.0.1:${server.address().port}/illustro/preview/?perf=1`;
const browser = await chromium.launch({
  executablePath: process.env.PREVIEW_SMOKE_CHROMIUM,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const report = { browser: browser.version(), url, timings: [], checks: [] };

function countPixels(png, test) {
  const { data } = PNG.sync.read(png);
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (test(data[i], data[i + 1], data[i + 2])) count++;
  }
  return count;
}
const dark = (r, g, b) => Math.max(r, g, b) < 100;
const red = (r, g, b) => r > 160 && r - g > 60 && r - b > 60;
const white = (r, g, b) => Math.min(r, g, b) > 247;

async function run(label, full = false, touch = false) {
  const viewport = touch ? { width: 390, height: 700 } : { width: 1280, height: 800 };
  const context = await browser.newContext({ viewport, hasTouch: touch, serviceWorkers: 'block', acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(() => {
    // Exercise the application's usual file-download fallback in headless Chromium.
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined });
    document.addEventListener('click', event => {
      if (event.target.closest('#ihNewCreate')) performance.mark('smoke-create-click');
    }, { capture: true });
  });
  const canvas = page.locator('#canvas');
  const surface = page.locator('.surface').first();
  const click = selector => page.locator(selector).click();
  const state = () => canvas.evaluate(el => ({ ...el.dataset }));
  const snapshot = () => surface.screenshot({ animations: 'disabled' });
  const check = (name, condition) => {
    assert.ok(condition, name);
    report.checks.push(`${label}: ${name}`);
  };
  const clickKey = async selector => {
    await page.locator(selector).focus();
    await page.keyboard.press('Enter');
  };
  const cdp = touch ? await context.newCDPSession(page) : null;
  async function draw(xStart, xEnd, y, during) {
    const box = await surface.boundingBox();
    const from = { x: Math.round(box.x + box.width * xStart), y: Math.round(box.y + box.height * y) };
    const to = { x: Math.round(box.x + box.width * xEnd), y: from.y };
    if (cdp) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
      for (let i = 1; i <= 10; i++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: Math.round(from.x + (to.x - from.x) * i / 10), y: from.y }],
        });
      }
    } else {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 12 });
    }
    try {
      await during?.();
    } finally {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      else await page.mouse.up();
    }
  }
  const waitStrokes = count => page.waitForFunction(count =>
    Number(document.querySelector('#canvas').dataset.committedStrokes) === count, count);
  const idle = () => page.waitForFunction(() => document.querySelector('#canvas').dataset.historyBusy === 'false');
  const ready = () => page.waitForFunction(() => !document.querySelector('#app').inert && location.hash === '#editor');
  try {
    await page.goto(url, { waitUntil: 'commit' });
    await page.locator('#ihStart').waitFor();
    const homeReady = await page.evaluate(() => performance.now());
    if (full && !touch) {
      await clickKey('#ihStart');
      await page.keyboard.press('Escape');
      check('Escape returns focus to New Work', await page.locator('#ihStart').evaluate(el => document.activeElement === el));
    }
    await click('#ihStart');
    if (full) {
      const create = await page.locator('#ihNewCreate').boundingBox();
      check('Create button is visible without scrolling', create.y >= 0 && create.y + create.height <= viewport.height);
    }
    await click('#ihNewCreate');
    await ready();
    const editorReady = await page.evaluate(() => performance.now() - performance.getEntriesByName('smoke-create-click').at(-1).startTime);
    const canvasState = await state();
    if (expectedCommit && label.startsWith('after')) assert.equal(canvasState.commit, expectedCommit);
    const visible = await snapshot();
    check('white paper has real rendered pixels', countPixels(visible, white) > 500);
    if (full) await page.screenshot({ path: path.join(output, label + '-canvas.png') });
    const beforeInk = countPixels(visible, dark);
    const baseline = label.startsWith('before');
    let firstInk = null;
    let liveInk = false;
    await draw(0.34, 0.62, 0.44, async () => {
      const deadline = performance.now() + 1800;
      do {
        liveInk = countPixels(await snapshot(), dark) > beforeInk + 20;
      } while (!liveInk && performance.now() < deadline);
      if (liveInk) firstInk = await page.evaluate(() =>
        performance.now() - performance.getEntriesByName('smoke-create-click').at(-1).startTime);
      if (!baseline) check('line visible with pointer still held', liveInk);
    });
    await waitStrokes(1);
    await idle();
    const committedInk = countPixels(await snapshot(), dark) > beforeInk + 20;
    if (!baseline) check('line remains after release', committedInk);
    report.timings.push({
      label, homeReadyMs: Math.round(homeReady), clickToEditorMs: Math.round(editorReady),
      clickToObservedLiveInkMs: firstInk === null ? null : Math.round(firstInk), liveInk, committedInk, backend: canvasState.backend,
      stages: await page.evaluate(() => performance.getEntriesByType('measure')
        .filter(entry => entry.name.startsWith('illustro-canvas:'))
        .map(entry => [entry.name, Math.round(entry.duration)])),
    });
    if (!full) return;

    check('QA controls absent', await page.locator('#qaSummary').count() === 0);
    check('recovery command stays hidden while autosave is healthy', !await page.locator('#rescueWorkSave').isVisible());
    check('hidden selection preview does not cover the canvas', !await page.locator('.c06-mask-preview').isVisible());
    check('workspace fits the screen width', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check('finger drawing initially enabled', await page.locator('#quickFinger').getAttribute('aria-pressed') === 'true');
    await click('#quickFinger');
    check('switching finger drawing off changes the real preference', !await page.locator('#finger').isChecked());
    await click('#quickFinger');
    if (touch) {
      await page.setViewportSize({ width: 800, height: 500 });
      await page.waitForFunction(() => document.querySelector('.surface').getBoundingClientRect().width > 600);
      check('line remains after rotation and resize', countPixels(await snapshot(), dark) > 20);
      check('workspace does not open by itself after rotation', await page.locator('#workspace').evaluate(el => el.inert));
      await draw(0.34, 0.61, 0.56);
      await waitStrokes(2);
      return;
    }
    await click('#c04ContextTool');
    const picker = page.locator('#brush');
    await picker.selectOption('foundation-g-pen');
    await click('#workspaceToggle');
    await click('#quickColor');
    await page.locator('#colorHex').fill('#ef2016');
    await page.locator('#colorHex').press('Enter');
    await click('#workspaceToggle');
    await page.locator('#sizeNumber').fill('32');
    await page.locator('#sizeNumber').press('Tab');
    check('brush diameter is synchronized to the slider', await page.locator('#size').inputValue() === '32');
    await draw(0.34, 0.62, 0.56);
    await waitStrokes(2);
    await idle();
    const redBeforeErase = countPixels(await snapshot(), red);
    check('new ink has the selected color', redBeforeErase > 100);
    const beforeErase = (await state()).revisionId;
    await click('#erase');
    await page.locator('#sizeNumber').fill('84');
    await page.locator('#sizeNumber').press('Tab');
    await draw(0.46, 0.51, 0.56);
    await waitStrokes(3);
    await idle();
    check('eraser removed red pixels', countPixels(await snapshot(), red) < redBeforeErase - 30);
    const erased = (await state()).revisionId;
    await click('#undo');
    await page.waitForFunction(id => document.querySelector('#canvas').dataset.revisionId === id, beforeErase);
    await idle();
    check('Undo restores the erased pixels', countPixels(await snapshot(), red) > redBeforeErase - 30);
    await click('#redo');
    await page.waitForFunction(id => document.querySelector('#canvas').dataset.revisionId === id, erased);
    await idle();
    check('Redo removes the same ink', countPixels(await snapshot(), red) < redBeforeErase - 30);

    await click('#c04ContextLayer');
    const layerCount = Number((await state()).layerCount);
    await click('#addLayerPage');
    check('layer added and selected', Number((await state()).layerCount) === layerCount + 1);
    await click('#workspaceToggle');
    const [file] = await Promise.all([page.waitForEvent('download'), click('#save')]);
    check('native artwork file downloaded', file.suggestedFilename().endsWith('.illustro') && await file.failure() === null);
    const workId = (await state()).documentId;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await click('#ihNavWorks');
    await click(`[data-work-id="${workId}"] .ih-work-preview`);
    await ready();
    await idle();
    check('artwork reopens from the local library after reload', (await state()).documentId === workId);
    check('reopened artwork has the saved layers', Number((await state()).layerCount) === layerCount + 1);
    check('reopened artwork has both visible ink colors', countPixels(await snapshot(), dark) > 20 && countPixels(await snapshot(), red) > 20);
    await page.screenshot({ path: path.join(output, label + '-saved.png') });
    await click('#paint');
    const graphics = await context.newCDPSession(page);
    const area = await surface.boundingBox();
    const startX = Math.round(area.x + area.width * 0.4);
    const penY = Math.round(area.y + area.height * 0.64);
    const savedCount = Number((await state()).committedStrokes);
    const pen = (type, x, buttons, force) => graphics.send('Input.dispatchMouseEvent', {
      type, pointerType: 'pen', x, y: penY, button: type === 'mouseMoved' ? 'none' : 'left',
      buttons, force, clickCount: 1,
    });
    await pen('mousePressed', startX, 1, 0.65);
    for (let i = 1; i <= 12; i++) await pen('mouseMoved', startX + i * 7, 1, 0.65);
    await pen('mouseReleased', startX + 84, 0, 0);
    await waitStrokes(savedCount + 1);
    await idle();
    check('emulated pen produces another committed stroke', Number((await state()).committedStrokes) === savedCount + 1);
    assert.deepEqual(errors, []);
  } catch (error) {
    await page.screenshot({ path: path.join(output, label + '-error.png') }).catch(() => {});
    console.error(label, error, errors);
    throw error;
  } finally {
    await context.close();
  }
}

try {
  if (before && !process.env.PREVIEW_SMOKE_URL) {
    root = before;
    try {
      for (let trial = 0; trial < 3; trial++) await run('before-' + (trial + 1));
    } catch (error) {
      report.baselineError = String(error);
    }
  }
  root = after;
  for (let trial = 0; trial < 3; trial++) await run('after-' + (trial + 1), trial === 2);
  await run('after-phone-touch', true, true);
} finally {
  console.log(JSON.stringify(report, null, 2));
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  server.close();
}
