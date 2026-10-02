// Inherited Philox4x32-10. Exact unsigned multiply high via 16-bit limbs (no hot-path BigInt).
function high(a: number, b: number) {
  const a0 = a & 65535,
    a1 = a >>> 16,
    b0 = b & 65535,
    b1 = b >>> 16;
  const low = a0 * b0,
    mid = a1 * b0 + a0 * b1 + (low >>> 16);
  return (a1 * b1 + Math.floor(mid / 65536)) >>> 0;
}
export function philox(
  counter: readonly [number, number, number, number],
  key: readonly [number, number],
): readonly [number, number, number, number] {
  let [a, b, c, d] = counter;
  let [k, l] = key;
  for (let i = 0; i < 10; i++) {
    const hi0 = high(0xd2511f53, a),
      lo0 = Math.imul(0xd2511f53, a) >>> 0,
      hi1 = high(0xcd9e8d57, c),
      lo1 = Math.imul(0xcd9e8d57, c) >>> 0;
    a = (hi1 ^ b ^ k) >>> 0;
    b = lo1;
    c = (hi0 ^ d ^ l) >>> 0;
    d = lo0;
    k = (k + 0x9e3779b9) >>> 0;
    l = (l + 0xbb67ae85) >>> 0;
  }
  return [a, b, c, d];
}
export function random(
  seed: readonly [number, number],
  index: number,
  stream: number,
) {
  return (
    philox([index >>> 0, Math.floor(index / 4294967296), stream, 0], seed)[0] /
    4294967296
  );
}
