const M0 = 0xD2511F53n;
const M1 = 0xCD9E8D57n;
const W0 = 0x9E3779B9;
const W1 = 0xBB67AE85;
const MASK32 = 0xffffffffn;

function mulHiLo(a, b) {
  const p = BigInt(a >>> 0) * BigInt(b >>> 0);
  return [Number((p >> 32n) & MASK32) >>> 0, Number(p & MASK32) >>> 0];
}

export function philox4x32_10(counter, key) {
  let [x0, x1, x2, x3] = counter.map(v => v >>> 0);
  let [k0, k1] = key.map(v => v >>> 0);
  for (let round = 0; round < 10; round++) {
    const [hi0, lo0] = mulHiLo(Number(M0), x0);
    const [hi1, lo1] = mulHiLo(Number(M1), x2);
    [x0, x1, x2, x3] = [
      (hi1 ^ x1 ^ k0) >>> 0,
      lo1,
      (hi0 ^ x3 ^ k1) >>> 0,
      lo0,
    ];
    if (round !== 9) {
      k0 = (k0 + W0) >>> 0;
      k1 = (k1 + W1) >>> 0;
    }
  }
  return [x0, x1, x2, x3];
}

export function streamU32(seedLo, seedHi, index, streamId) {
  const lo = Number(BigInt(index) & MASK32) >>> 0;
  const hi = Number((BigInt(index) >> 32n) & MASK32) >>> 0;
  return philox4x32_10([lo, hi, streamId >>> 0, 0], [seedLo >>> 0, seedHi >>> 0])[0];
}

export function uniform01(seedLo, seedHi, index, streamId) {
  return streamU32(seedLo, seedHi, index, streamId) / 0x100000000;
}
