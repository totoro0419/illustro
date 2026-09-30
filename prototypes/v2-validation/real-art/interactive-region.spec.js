import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
let server;
let origin;

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
]);

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const requested = decoded === '/' ? '/real-art/interactive-region.html' : decoded;
  const full = path.resolve(ROOT, `.${requested}`);
  return full.startsWith(ROOT) ? full : null;
}

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const full = safePath(req.url || '/');
    if (!full) { res.writeHead(403).end('forbidden'); return; }
    try {
      const info = await stat(full);
      if (!info.isFile()) throw new Error('not file');
      const body = await readFile(full);
      res.writeHead(200, { 'content-type': MIME.get(path.extname(full)) || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => {
  if (!server) return;
  await new Promise(resolve => server.close(resolve));
});

async function syntheticPng(page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    ctx.strokeRect(35, 24, 90, 72);
    ctx.beginPath();
    ctx.moveTo(35, 60);
    ctx.lineTo(16, 60);
    ctx.stroke();
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(base64, 'base64');
}

async function dispatchTouchStroke(page, selector, points) {
  await page.evaluate(({ selector, points }) => {
    const target = document.querySelector(selector);
    const rect = target.getBoundingClientRect();
    const emit = (type, point, buttons) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 41,
      pointerType: 'touch',
      isPrimary: true,
      buttons,
      clientX: rect.left + rect.width * point[0],
      clientY: rect.top + rect.height * point[1],
    }));
    emit('pointerdown', points[0], 1);
    for (const point of points.slice(1, -1)) emit('pointermove', point, 1);
    emit('pointerup', points.at(-1), 0);
  }, { selector, points });
}

test('interactive Region evaluator loads, classifies, and accepts touch corrections', async ({ page }) => {
  await page.goto(`${origin}/real-art/interactive-region.html`);
  await expect(page.getByRole('heading', { name: 'Region / Fill 実使用評価' })).toBeVisible();

  const png = await syntheticPng(page);
  await page.locator('#imageInput').setInputFiles({ name: 'synthetic-region.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('#fileName')).toHaveText('synthetic-region.png');
  await expect(page.locator('#emptyHint')).toHaveClass(/hidden/);

  await dispatchTouchStroke(page, '#overlayCanvas', [[0.50, 0.50], [0.50, 0.50]]);
  await expect(page.locator('#statusPill')).not.toHaveText('未判定');
  await expect(page.locator('#statusText')).toContainText('自動判定:');

  await page.getByRole('button', { name: 'つなぐ' }).click();
  await dispatchTouchStroke(page, '#overlayCanvas', [[0.42, 0.35], [0.50, 0.35], [0.58, 0.35]]);
  await expect(page.locator('#sessionLine')).toContainText('つなぐ 1回');
  await expect(page.locator('#undo')).toBeEnabled();

  await page.locator('#undo').click();
  await expect(page.locator('#sessionLine')).toContainText('つなぐ 0回');
  await expect(page.locator('#redo')).toBeEnabled();
  await page.locator('#redo').click();
  await expect(page.locator('#sessionLine')).toContainText('つなぐ 1回');

  await page.getByRole('button', { name: '切る' }).click();
  await dispatchTouchStroke(page, '#overlayCanvas', [[0.50, 0.25], [0.50, 0.31], [0.50, 0.37]]);
  await expect(page.locator('#sessionLine')).toContainText('切る 1回');

  await page.getByRole('button', { name: 'そのまま使える' }).click();
  await expect(page.locator('#recordState')).toContainText('記録しました');
});
