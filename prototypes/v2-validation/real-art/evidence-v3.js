import { EvidenceGrid } from '../src/region.js';

const clamp01 = v => Math.max(0, Math.min(1, v));

function percentile(values, p) {
  const sorted = Array.from(values).sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

function boxBlur(src, width, height, radius) {
  if (radius <= 0) return Float32Array.from(src);
  const stride = width + 1;
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let row = 0;
    for (let x = 0; x < width; x += 1) {
      row += src[y * width + x];
      integral[(y + 1) * stride + (x + 1)] = integral[y * stride + (x + 1)] + row;
    }
  }
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(width - 1, x + radius);
      const sum = integral[(y1 + 1) * stride + (x1 + 1)] - integral[y0 * stride + (x1 + 1)] - integral[(y1 + 1) * stride + x0] + integral[y0 * stride + x0];
      out[y * width + x] = sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
    }
  }
  return out;
}

function gradients(src, width, height) {
  const gx = new Float32Array(width * height);
  const gy = new Float32Array(width * height);
  const at = (x, y) => src[Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const i = y * width + x;
    gx[i] = 0.5 * (at(x + 1, y) - at(x - 1, y));
    gy[i] = 0.5 * (at(x, y + 1) - at(x, y - 1));
  }
  return { gx, gy };
}

function structureFeatures(gx, gy, width, height) {
  const n = width * height;
  const xx = new Float32Array(n), yy = new Float32Array(n), xy = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    xx[i] = gx[i] * gx[i]; yy[i] = gy[i] * gy[i]; xy[i] = gx[i] * gy[i];
  }
  const jxx = boxBlur(xx, width, height, 2);
  const jyy = boxBlur(yy, width, height, 2);
  const jxy = boxBlur(xy, width, height, 2);
  const coherence = new Float32Array(n), tx = new Float32Array(n), ty = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const trace = jxx[i] + jyy[i];
    const disc = Math.hypot(jxx[i] - jyy[i], 2 * jxy[i]);
    coherence[i] = trace > 1e-7 ? clamp01(disc / trace) : 0;
    const gradientAngle = 0.5 * Math.atan2(2 * jxy[i], jxx[i] - jyy[i]);
    const tangentAngle = gradientAngle + Math.PI / 2;
    tx[i] = Math.cos(tangentAngle); ty[i] = Math.sin(tangentAngle);
  }
  return { coherence, tx, ty };
}

function orientedBridgeField(score, tx, ty, coherence, texture, wash, width, height, maxGap = 5, endpointThreshold = 0.46, minStructural = 0.20, minAlignment = 0.58, maxStepsCap = 5) {
  const out = new Float32Array(score.length);
  const dirs = [[1, 0], [2, 1], [1, 1], [1, 2], [0, 1], [-1, 2], [-1, 1], [-2, 1]];
  const idx = (x, y) => y * width + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
  const align = (i, dx, dy) => {
    const inv = 1 / Math.hypot(dx, dy);
    return Math.abs(tx[i] * dx * inv + ty[i] * dy * inv);
  };
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
    const center = idx(x, y);
    if (score[center] >= 0.72 || score[center] < 0.02) continue;
    let best = 0;
    for (const [dx, dy] of dirs) {
      const stepLength = Math.hypot(dx, dy);
      const maxSteps = Math.min(maxStepsCap, Math.max(1, Math.ceil((maxGap + 1) / stepLength)));
      for (let a = 1; a <= maxSteps; a += 1) {
        const ax = x - dx * a, ay = y - dy * a;
        if (!inside(ax, ay)) break;
        const ai = idx(ax, ay);
        if (score[ai] < endpointThreshold) continue;
        for (let b = 1; b <= maxSteps; b += 1) {
          if ((a + b - 1) * stepLength > maxGap) break;
          const bx = x + dx * b, by = y + dy * b;
          if (!inside(bx, by)) break;
          const bi = idx(bx, by);
          if (score[bi] < endpointThreshold) continue;
          const aa = align(ai, dx, dy), ab = align(bi, dx, dy);
          if (aa < minAlignment || ab < minAlignment) continue;
          const structural = Math.sqrt(Math.max(0, coherence[ai] * coherence[bi]));
          if (structural < minStructural) continue;
          if ((wash[ai] + wash[bi]) * 0.5 > 0.48) continue;
          let pathTexture = 0, pathN = 0;
          for (let s = -a + 1; s < b; s += 1) {
            const pi = idx(x + dx * s, y + dy * s);
            pathTexture += texture[pi]; pathN += 1;
          }
          const textureFactor = 1 - 0.75 * clamp01((pathTexture / Math.max(1, pathN) - 0.62) / 0.38);
          best = Math.max(best, Math.min(score[ai], score[bi]) * Math.sqrt(aa * ab) * (0.72 + 0.28 * structural) * textureFactor);
        }
      }
    }
    out[center] = clamp01(best);
  }
  return out;
}

function directionalDilate(score, gx, gy, coherence, texture, width, height) {
  const out = Float32Array.from(score);
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
    const i = y * width + x;
    if (score[i] < 0.52 || coherence[i] < 0.22 || texture[i] > 0.62) continue;
    const mag = Math.hypot(gx[i], gy[i]);
    if (mag < 1e-5) continue;
    const nx = gx[i] / mag, ny = gy[i] / mag;
    for (const sign of [-1, 1]) {
      const xx = Math.round(x + sign * nx), yy = Math.round(y + sign * ny);
      if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
      const j = yy * width + xx;
      out[j] = Math.max(out[j], score[i] * 0.74);
    }
  }
  return out;
}

function toGrid(values, width, height, edgeMargin) {
  const grid = new EvidenceGrid(width, height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const i = y * width + x;
    grid.set(x, y, x < edgeMargin || y < edgeMargin || x >= width - edgeMargin || y >= height - edgeMargin ? 0 : values[i]);
  }
  return grid;
}

export function buildRealArtEvidenceV3(decoded) {
  const { width, height } = decoded;
  const luma = Float32Array.from(decoded.luma);
  const paper = percentile(luma, 0.90);
  const dark = percentile(luma, 0.08);
  const range = Math.max(0.08, paper - dark);
  const blur1 = boxBlur(luma, width, height, 1);
  const blur3 = boxBlur(luma, width, height, 3);
  const blur7 = boxBlur(luma, width, height, 7);
  const { gx, gy } = gradients(blur1, width, height);
  const { coherence, tx, ty } = structureFeatures(gx, gy, width, height);
  const { gx: softGx, gy: softGy } = gradients(blur3, width, height);
  const { coherence: softCoherence } = structureFeatures(softGx, softGy, width, height);
  const n = width * height;
  const gradient = new Float32Array(n), fineLine = new Float32Array(n), dog = new Float32Array(n), broadInk = new Float32Array(n);
  const softGradient = new Float32Array(n);
  const gradEnergy = new Float32Array(n), gradPresence = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    gradient[i] = clamp01(Math.hypot(gx[i], gy[i]) / (0.045 + 0.18 * range));
    softGradient[i] = clamp01(Math.hypot(softGx[i], softGy[i]) / (0.012 + 0.07 * range));
    fineLine[i] = clamp01((blur3[i] - luma[i]) / (0.035 + 0.16 * range));
    dog[i] = clamp01(Math.abs(blur1[i] - blur7[i]) / (0.030 + 0.12 * range));
    broadInk[i] = clamp01((paper - blur7[i]) / range);
    gradEnergy[i] = gradient[i] * gradient[i];
    gradPresence[i] = gradient[i] > 0.28 ? 1 : 0;
  }
  const localGradEnergy = boxBlur(gradEnergy, width, height, 3);
  const localGradient = boxBlur(gradient, width, height, 3);
  const localGradPresence = boxBlur(gradPresence, width, height, 4);
  const line = new Float32Array(n), texture = new Float32Array(n), wash = new Float32Array(n), softEdge = new Float32Array(n), conservative = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const variance = Math.max(0, localGradEnergy[i] - localGradient[i] * localGradient[i]);
    texture[i] = clamp01(((localGradPresence[i] - 0.18) / 0.50) * (0.65 + 0.55 * (1 - coherence[i])) + (Math.sqrt(variance) / 0.60) * 0.20 * (1 - coherence[i]));
    line[i] = clamp01(Math.max(0.92 * fineLine[i], 0.74 * dog[i], 0.70 * gradient[i] * (0.55 + 0.45 * coherence[i])));
    wash[i] = clamp01(broadInk[i] * (1 - 0.72 * fineLine[i]) * (0.65 + 0.35 * (1 - coherence[i])));
    // Smooth tonal boundaries (e.g. light watercolor fills) are separate from
    // narrow ink lines. Multi-scale gradient + coherence preserves them while
    // texture/wash terms prevent broad noisy wash from becoming a hard wall.
    softEdge[i] = clamp01(
      softGradient[i] *
      (0.45 + 0.55 * softCoherence[i]) *
      (1 - 0.55 * texture[i]) *
      (1 - 0.65 * wash[i])
    );
    conservative[i] = clamp01(line[i] * (1 - 0.60 * texture[i]) - 0.38 * wash[i]);
  }
  const bridgeShort = orientedBridgeField(conservative, tx, ty, coherence, texture, wash, width, height, 5, 0.46, 0.20, 0.58, 5);
  const bridgeLong = orientedBridgeField(conservative, tx, ty, coherence, texture, wash, width, height, 13, 0.34, 0.38, 0.48, 7);
  const dilated = directionalDilate(conservative, gx, gy, coherence, texture, width, height);
  const balanced = new Float32Array(n), permissive = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    balanced[i] = clamp01(Math.max(
      dilated[i],
      0.95 * bridgeShort[i],
      0.88 * softEdge[i],
      line[i] * (1 - 0.48 * texture[i]) - 0.26 * wash[i]
    ));
    permissive[i] = clamp01(Math.max(
      balanced[i],
      bridgeLong[i],
      softEdge[i],
      line[i] * (1 - 0.34 * texture[i]) - 0.15 * wash[i]
    ));
  }
  const edgeMargin = Math.max(3, Math.round(Math.min(width, height) * 0.04));
  const grids = {
    conservative: toGrid(conservative, width, height, edgeMargin),
    balanced: toGrid(balanced, width, height, edgeMargin),
    permissive: toGrid(permissive, width, height, edgeMargin),
  };
  return {
    width, height, paper, dark, range, edgeMargin, grids,
    features: { line, texture, wash, coherence, bridge: bridgeLong, bridgeShort, bridgeLong, gradient, fineLine, broadInk, softEdge, softCoherence, softGradient },
  };
}

export function evidenceV3LocalSummary(bundle, nx, ny, radius = 5) {
  const { width, height, features } = bundle;
  const cx = Math.max(0, Math.min(width - 1, Math.round(nx * (width - 1))));
  const cy = Math.max(0, Math.min(height - 1, Math.round(ny * (height - 1))));
  const sums = { line: 0, texture: 0, wash: 0, coherence: 0, bridge: 0, n: 0 };
  for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y += 1) for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x += 1) {
    const i = y * width + x;
    sums.line += features.line[i]; sums.texture += features.texture[i]; sums.wash += features.wash[i]; sums.coherence += features.coherence[i]; sums.bridge += features.bridge[i]; sums.n += 1;
  }
  const n = Math.max(1, sums.n);
  return { line: sums.line / n, texture: sums.texture / n, wash: sums.wash / n, coherence: sums.coherence / n, bridge: sums.bridge / n };
}
