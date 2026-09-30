import { buildRealArtEvidenceV3 } from './evidence-v3.js';
import { classifyV4, FIXED_V4_POLICY } from './v4-classifier.js';
import { resolveRegion } from '../src/region.js';

const MAX_SIDE = 256;
const STORAGE_KEY = 'illustro.region-evaluation.v1';
const STATUS_TEXT = Object.freeze({
  closed: '閉じている',
  open: '開いている',
  ambiguous: '判断保留',
});

const els = Object.fromEntries([
  'imageInput', 'fileName', 'resetAll', 'statusPill', 'statusText', 'canvasShell', 'canvasStage',
  'imageCanvas', 'overlayCanvas', 'emptyHint', 'brushSize', 'brushValue', 'recheck', 'closureMetric',
  'reliabilityMetric', 'riskMetric', 'sessionLine', 'showFill', 'showBoundary', 'showEdits', 'undo',
  'redo', 'clearEdits', 'clearSeed', 'exportLog', 'recordState',
].map(id => [id, document.getElementById(id)]));

const modeButtons = [...document.querySelectorAll('[data-mode]')];
const ratingButtons = [...document.querySelectorAll('[data-rating]')];

const state = {
  mode: 'inspect',
  sourceImage: null,
  sourceFileName: null,
  originalBundle: null,
  workingBundle: null,
  seed: null,
  result: null,
  topologyResult: null,
  selectedComponent: null,
  edits: [],
  redoEdits: [],
  activeStroke: null,
  imageRect: null,
  sessionStartedAt: null,
  lastInteractionAt: null,
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function percent(value) {
  return Number.isFinite(value) ? `${Math.round(clamp01(value) * 100)}%` : '—';
}

function setMode(mode) {
  state.mode = mode;
  for (const button of modeButtons) button.classList.toggle('active', button.dataset.mode === mode);
  els.overlayCanvas.style.cursor = mode === 'inspect' ? 'crosshair' : 'cell';
}

function updateButtons() {
  const loaded = !!state.originalBundle;
  els.resetAll.disabled = !loaded;
  els.recheck.disabled = !loaded || !state.seed;
  els.undo.disabled = state.edits.length === 0;
  els.redo.disabled = state.redoEdits.length === 0;
  els.clearEdits.disabled = state.edits.length === 0;
  els.clearSeed.disabled = !state.seed;
  for (const button of ratingButtons) button.disabled = !state.result;
}

function updateStatus() {
  const result = state.result;
  els.statusPill.className = 'status-pill';
  if (!result) {
    els.statusPill.textContent = '未判定';
    els.statusText.textContent = state.originalBundle ? '塗りたい場所をタップしてください' : '画像を選択してください';
    els.closureMetric.textContent = '—';
    els.reliabilityMetric.textContent = '—';
    els.riskMetric.textContent = '—';
  } else {
    els.statusPill.classList.add(result.label);
    els.statusPill.textContent = STATUS_TEXT[result.label] ?? result.label;
    els.statusText.textContent = `自動判定: ${STATUS_TEXT[result.label] ?? result.label}`;
    els.closureMetric.textContent = percent(result.closureConfidence);
    els.reliabilityMetric.textContent = percent(result.componentReliability);
    els.riskMetric.textContent = percent(result.textureNetworkRisk);
  }
  const joinCount = state.edits.filter(edit => edit.type === 'join').length;
  const cutCount = state.edits.filter(edit => edit.type === 'cut').length;
  els.sessionLine.textContent = `補正: つなぐ ${joinCount}回 / 切る ${cutCount}回`;
  updateButtons();
}

function cloneTypedArray(value) {
  return value?.slice ? value.slice() : value;
}

function cloneBundle(bundle) {
  const grids = {};
  for (const [key, grid] of Object.entries(bundle.grids)) grids[key] = grid.clone();
  const features = {};
  for (const [key, value] of Object.entries(bundle.features)) features[key] = cloneTypedArray(value);
  return {
    ...bundle,
    grids,
    features,
  };
}

function paintGridCell(bundle, x, y, type) {
  if (x < 0 || y < 0 || x >= bundle.width || y >= bundle.height) return;
  const index = y * bundle.width + x;
  const connect = type === 'join';
  for (const grid of Object.values(bundle.grids)) {
    grid.data[index] = connect ? 1 : 0;
    grid.userPinned[index] = connect ? 1 : 0;
  }

  const fields = ['line', 'coherence', 'bridge', 'bridgeShort', 'bridgeLong', 'fineLine', 'gradient', 'softEdge', 'softCoherence', 'softGradient'];
  if (connect) {
    for (const key of fields) if (bundle.features[key]) bundle.features[key][index] = 1;
    if (bundle.features.texture) bundle.features.texture[index] = 0;
    if (bundle.features.wash) bundle.features.wash[index] = 0;
  } else {
    for (const key of fields) if (bundle.features[key]) bundle.features[key][index] = 0;
  }
}

function paintDisc(bundle, x, y, radius, type) {
  const r = Math.max(0.5, radius);
  const minX = Math.floor(x - r), maxX = Math.ceil(x + r);
  const minY = Math.floor(y - r), maxY = Math.ceil(y + r);
  const rr = r * r;
  for (let yy = minY; yy <= maxY; yy += 1) {
    for (let xx = minX; xx <= maxX; xx += 1) {
      const dx = xx - x, dy = yy - y;
      if (dx * dx + dy * dy <= rr) paintGridCell(bundle, xx, yy, type);
    }
  }
}

function applyStroke(bundle, stroke) {
  if (!stroke.points.length) return;
  const radius = stroke.width / 2;
  paintDisc(bundle, stroke.points[0][0], stroke.points[0][1], radius, stroke.type);
  for (let p = 1; p < stroke.points.length; p += 1) {
    const [x0, y0] = stroke.points[p - 1];
    const [x1, y1] = stroke.points[p];
    const distance = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
    const steps = Math.max(1, Math.ceil(distance * 1.6));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      paintDisc(bundle, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, stroke.type);
    }
  }
}

function rebuildWorkingBundle() {
  if (!state.originalBundle) return;
  state.workingBundle = cloneBundle(state.originalBundle);
  for (const edit of state.edits) applyStroke(state.workingBundle, edit);
}

function standardPolicy() {
  return {
    evidenceThreshold: FIXED_V4_POLICY.evidenceThreshold,
    gapMax: 0,
    confidenceThreshold: 0,
    retainIou: 0.8,
    identityMargin: 0.2,
    ambiguousIouFloor: 0.3,
    lineageOverlapFraction: 0.18,
    candidateSearchPx: 4,
  };
}

function componentAtSeed(result, seed) {
  if (!result || !seed) return null;
  const w = result.gridWidth, h = result.gridHeight;
  const cx = Math.max(0, Math.min(w - 1, Math.round(seed[0] * (w - 1))));
  const cy = Math.max(0, Math.min(h - 1, Math.round(seed[1] * (h - 1))));
  for (let radius = 0; radius <= 5; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const label = result.topology.labels[y * w + x];
        if (label >= 0) return result.topology.components[label];
      }
    }
  }
  return null;
}

function evaluate() {
  if (!state.workingBundle || !state.seed) {
    state.result = null;
    state.topologyResult = null;
    state.selectedComponent = null;
    updateStatus();
    render();
    return;
  }
  const query = { seed: state.seed };
  state.result = classifyV4(state.workingBundle, query);
  state.topologyResult = resolveRegion(state.workingBundle.grids.balanced, standardPolicy());
  state.selectedComponent = componentAtSeed(state.topologyResult, state.seed);
  state.lastInteractionAt = performance.now();
  updateStatus();
  render();
}

async function loadImageFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    state.sourceImage = image;
    state.sourceFileName = file.name || 'image';
    state.seed = null;
    state.result = null;
    state.edits = [];
    state.redoEdits = [];
    state.sessionStartedAt = performance.now();
    els.fileName.textContent = state.sourceFileName;
    els.emptyHint.classList.add('hidden');

    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(8, Math.round(image.naturalWidth * scale));
    const height = Math.max(8, Math.round(image.naturalHeight * scale));
    const scratch = document.createElement('canvas');
    scratch.width = width;
    scratch.height = height;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, width, height);
    const rgba = ctx.getImageData(0, 0, width, height).data;
    const luma = new Float32Array(width * height);
    for (let i = 0, p = 0; i < rgba.length; i += 4, p += 1) {
      luma[p] = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;
    }
    state.originalBundle = buildRealArtEvidenceV3({ width, height, luma });
    rebuildWorkingBundle();
    updateStatus();
    resizeCanvases();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasSize() {
  const rect = els.canvasStage.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  return {
    cssWidth: Math.max(1, rect.width),
    cssHeight: Math.max(1, rect.height),
    pixelWidth: Math.max(1, Math.round(rect.width * dpr)),
    pixelHeight: Math.max(1, Math.round(rect.height * dpr)),
    dpr,
  };
}

function resizeCanvases() {
  const size = canvasSize();
  for (const canvas of [els.imageCanvas, els.overlayCanvas]) {
    if (canvas.width !== size.pixelWidth || canvas.height !== size.pixelHeight) {
      canvas.width = size.pixelWidth;
      canvas.height = size.pixelHeight;
    }
  }
  render();
}

function computeImageRect() {
  if (!state.sourceImage) return null;
  const size = canvasSize();
  const scale = Math.min(size.cssWidth / state.sourceImage.naturalWidth, size.cssHeight / state.sourceImage.naturalHeight);
  const width = state.sourceImage.naturalWidth * scale;
  const height = state.sourceImage.naturalHeight * scale;
  return {
    x: (size.cssWidth - width) / 2,
    y: (size.cssHeight - height) / 2,
    width,
    height,
  };
}

function drawSourceImage() {
  const ctx = els.imageCanvas.getContext('2d');
  const size = canvasSize();
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  ctx.clearRect(0, 0, size.cssWidth, size.cssHeight);
  if (!state.sourceImage) return;
  const rect = computeImageRect();
  state.imageRect = rect;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(state.sourceImage, rect.x, rect.y, rect.width, rect.height);
}

function gridPointToCanvas(x, y) {
  const rect = state.imageRect;
  const bundle = state.workingBundle;
  return [
    rect.x + ((x + 0.5) / bundle.width) * rect.width,
    rect.y + ((y + 0.5) / bundle.height) * rect.height,
  ];
}

function eventToGrid(event) {
  if (!state.workingBundle || !state.imageRect) return null;
  const canvasRect = els.overlayCanvas.getBoundingClientRect();
  const x = event.clientX - canvasRect.left;
  const y = event.clientY - canvasRect.top;
  const rect = state.imageRect;
  if (x < rect.x || y < rect.y || x > rect.x + rect.width || y > rect.y + rect.height) return null;
  const nx = clamp01((x - rect.x) / rect.width);
  const ny = clamp01((y - rect.y) / rect.height);
  return {
    nx,
    ny,
    gx: nx * (state.workingBundle.width - 1),
    gy: ny * (state.workingBundle.height - 1),
  };
}

function renderBoundary(ctx) {
  if (!els.showBoundary.checked || !state.workingBundle || !state.imageRect) return;
  const grid = state.workingBundle.grids.balanced;
  const off = document.createElement('canvas');
  off.width = grid.width;
  off.height = grid.height;
  const octx = off.getContext('2d');
  const image = octx.createImageData(grid.width, grid.height);
  for (let i = 0; i < grid.data.length; i += 1) {
    const v = grid.data[i];
    const p = i * 4;
    if (v >= 0.55) {
      image.data[p] = 72; image.data[p + 1] = 224; image.data[p + 2] = 144; image.data[p + 3] = 164;
    } else if (v >= FIXED_V4_POLICY.evidenceThreshold) {
      image.data[p] = 255; image.data[p + 1] = 209; image.data[p + 2] = 92; image.data[p + 3] = 142;
    } else if (v >= 0.28) {
      image.data[p] = 255; image.data[p + 1] = 102; image.data[p + 2] = 119; image.data[p + 3] = 88;
    }
  }
  octx.putImageData(image, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, state.imageRect.x, state.imageRect.y, state.imageRect.width, state.imageRect.height);
  ctx.restore();
}

function renderFill(ctx) {
  if (!els.showFill.checked || !state.selectedComponent || !state.workingBundle || !state.imageRect) return;
  const bundle = state.workingBundle;
  const off = document.createElement('canvas');
  off.width = bundle.width;
  off.height = bundle.height;
  const octx = off.getContext('2d');
  const image = octx.createImageData(bundle.width, bundle.height);
  const color = state.result?.label === 'closed'
    ? [76, 147, 255, 70]
    : state.result?.label === 'open'
      ? [255, 95, 110, 54]
      : [245, 183, 62, 64];
  for (const i of state.selectedComponent.cells) {
    const p = i * 4;
    image.data[p] = color[0]; image.data[p + 1] = color[1]; image.data[p + 2] = color[2]; image.data[p + 3] = color[3];
  }
  octx.putImageData(image, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, state.imageRect.x, state.imageRect.y, state.imageRect.width, state.imageRect.height);
  ctx.restore();
}

function drawStroke(ctx, stroke, active = false) {
  if (!stroke.points.length || !state.workingBundle || !state.imageRect) return;
  const scale = state.imageRect.width / state.workingBundle.width;
  ctx.save();
  ctx.strokeStyle = stroke.type === 'join' ? '#53d6ff' : '#e373ff';
  ctx.globalAlpha = active ? 1 : 0.88;
  ctx.lineWidth = Math.max(2, stroke.width * scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const [sx, sy] = gridPointToCanvas(stroke.points[0][0], stroke.points[0][1]);
  ctx.moveTo(sx, sy);
  for (let p = 1; p < stroke.points.length; p += 1) {
    const [x, y] = gridPointToCanvas(stroke.points[p][0], stroke.points[p][1]);
    ctx.lineTo(x, y);
  }
  if (stroke.points.length === 1) ctx.lineTo(sx + 0.01, sy + 0.01);
  ctx.stroke();
  ctx.restore();
}

function renderEdits(ctx) {
  if (!els.showEdits.checked) return;
  for (const stroke of state.edits) drawStroke(ctx, stroke);
  if (state.activeStroke) drawStroke(ctx, state.activeStroke, true);
}

function renderSeed(ctx) {
  if (!state.seed || !state.imageRect) return;
  const x = state.imageRect.x + state.seed[0] * state.imageRect.width;
  const y = state.imageRect.y + state.seed[1] * state.imageRect.height;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#111318';
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 11, y); ctx.lineTo(x + 11, y); ctx.moveTo(x, y - 11); ctx.lineTo(x, y + 11); ctx.stroke();
  ctx.restore();
}

function render() {
  drawSourceImage();
  const ctx = els.overlayCanvas.getContext('2d');
  const size = canvasSize();
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  ctx.clearRect(0, 0, size.cssWidth, size.cssHeight);
  if (!state.sourceImage) return;
  renderFill(ctx);
  renderBoundary(ctx);
  renderEdits(ctx);
  renderSeed(ctx);
}

function beginStroke(event) {
  const point = eventToGrid(event);
  if (!point) return;
  if (state.mode === 'inspect') {
    state.seed = [point.nx, point.ny];
    evaluate();
    return;
  }
  state.activeStroke = {
    type: state.mode,
    width: Number(els.brushSize.value),
    points: [[point.gx, point.gy]],
  };
  try { els.overlayCanvas.setPointerCapture(event.pointerId); } catch {}
  render();
}

function continueStroke(event) {
  if (!state.activeStroke) return;
  const point = eventToGrid(event);
  if (!point) return;
  const last = state.activeStroke.points.at(-1);
  if (!last || Math.hypot(point.gx - last[0], point.gy - last[1]) >= 0.45) {
    state.activeStroke.points.push([point.gx, point.gy]);
    render();
  }
}

function endStroke(event) {
  if (!state.activeStroke) return;
  const point = eventToGrid(event);
  if (point) state.activeStroke.points.push([point.gx, point.gy]);
  state.edits.push(state.activeStroke);
  state.activeStroke = null;
  state.redoEdits = [];
  rebuildWorkingBundle();
  evaluate();
  try { els.overlayCanvas.releasePointerCapture(event.pointerId); } catch {}
}

function resetAll() {
  if (!state.originalBundle) return;
  state.seed = null;
  state.result = null;
  state.edits = [];
  state.redoEdits = [];
  rebuildWorkingBundle();
  updateStatus();
  render();
}

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRating(rating) {
  if (!state.result || !state.seed) return;
  const records = loadRecords();
  const now = performance.now();
  const record = {
    schema: 'illustro.region-user-evaluation.v1',
    recordedAt: new Date().toISOString(),
    fileName: state.sourceFileName,
    evidenceSize: [state.workingBundle.width, state.workingBundle.height],
    seed: state.seed.map(v => Number(v.toFixed(6))),
    result: state.result.label,
    decision: state.result.decision,
    rating,
    correction: {
      joinStrokes: state.edits.filter(edit => edit.type === 'join').length,
      cutStrokes: state.edits.filter(edit => edit.type === 'cut').length,
      totalStrokes: state.edits.length,
    },
    metrics: {
      closureConfidence: state.result.closureConfidence,
      componentReliability: state.result.componentReliability,
      textureNetworkRisk: state.result.textureNetworkRisk,
    },
    elapsedMs: state.sessionStartedAt ? Math.round(now - state.sessionStartedAt) : null,
  };
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  els.recordState.textContent = `記録しました（この端末: ${records.length}件）`;
}

function exportRecords() {
  const records = loadRecords();
  const payload = {
    schema: 'illustro.region-user-evaluation-export.v1',
    exportedAt: new Date().toISOString(),
    records,
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `illustro-region-evaluation-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  els.recordState.textContent = records.length ? `${records.length}件を書き出しました。` : '記録はまだありません。空の記録を書き出しました。';
}

els.imageInput.addEventListener('change', event => loadImageFile(event.target.files?.[0]).catch(error => {
  console.error(error);
  els.statusText.textContent = `画像を読み込めませんでした: ${error.message}`;
}));
for (const button of modeButtons) button.addEventListener('click', () => setMode(button.dataset.mode));
els.brushSize.addEventListener('input', () => { els.brushValue.textContent = els.brushSize.value; });
els.recheck.addEventListener('click', evaluate);
els.resetAll.addEventListener('click', resetAll);
els.undo.addEventListener('click', () => {
  const edit = state.edits.pop();
  if (!edit) return;
  state.redoEdits.push(edit);
  rebuildWorkingBundle();
  evaluate();
});
els.redo.addEventListener('click', () => {
  const edit = state.redoEdits.pop();
  if (!edit) return;
  state.edits.push(edit);
  rebuildWorkingBundle();
  evaluate();
});
els.clearEdits.addEventListener('click', () => {
  if (!state.edits.length) return;
  state.redoEdits.push(...state.edits.splice(0));
  rebuildWorkingBundle();
  evaluate();
});
els.clearSeed.addEventListener('click', () => {
  state.seed = null;
  state.result = null;
  state.topologyResult = null;
  state.selectedComponent = null;
  updateStatus();
  render();
});
for (const checkbox of [els.showFill, els.showBoundary, els.showEdits]) checkbox.addEventListener('change', render);
for (const button of ratingButtons) button.addEventListener('click', () => saveRating(button.dataset.rating));
els.exportLog.addEventListener('click', exportRecords);

els.overlayCanvas.addEventListener('pointerdown', event => {
  if (!state.originalBundle || event.button > 0 || !event.isPrimary) return;
  event.preventDefault();
  beginStroke(event);
});
els.overlayCanvas.addEventListener('pointermove', event => {
  if (!state.activeStroke) return;
  event.preventDefault();
  continueStroke(event);
});
els.overlayCanvas.addEventListener('pointerup', event => {
  if (!state.activeStroke) return;
  event.preventDefault();
  endStroke(event);
});
els.overlayCanvas.addEventListener('pointercancel', event => {
  if (!state.activeStroke) return;
  event.preventDefault();
  endStroke(event);
});

const resizeObserver = new ResizeObserver(resizeCanvases);
resizeObserver.observe(els.canvasStage);
window.addEventListener('orientationchange', () => requestAnimationFrame(resizeCanvases));
window.addEventListener('resize', resizeCanvases);

setMode('inspect');
updateStatus();
resizeCanvases();
