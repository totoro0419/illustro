const ADD_ONE_WASM = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x06, 0x01, 0x60, 0x01, 0x7f, 0x01, 0x7f,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x08, 0x01, 0x04, 0x61, 0x64, 0x64, 0x31, 0x00, 0x00,
  0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x41, 0x01, 0x6a, 0x0b,
]);

export type WasmBoundaryBenchmark = Readonly<{
  iterations: number;
  javascriptMs: number;
  wasmMs: number;
  javascriptResult: number;
  wasmResult: number;
}>;

export async function runWasmBoundaryBenchmark(iterations = 1_000_000): Promise<WasmBoundaryBenchmark> {
  if (!Number.isInteger(iterations) || iterations <= 0) throw new Error('iterations must be a positive integer');
  const module = await WebAssembly.instantiate(ADD_ONE_WASM);
  const add1 = (module.instance.exports.add1 as ((value: number) => number) | undefined);
  if (!add1) throw new Error('WASM benchmark export missing');

  let jsValue = 0;
  const jsStart = performance.now();
  for (let i = 0; i < iterations; i += 1) jsValue = (jsValue + 1) | 0;
  const javascriptMs = performance.now() - jsStart;

  let wasmValue = 0;
  const wasmStart = performance.now();
  for (let i = 0; i < iterations; i += 1) wasmValue = add1(wasmValue);
  const wasmMs = performance.now() - wasmStart;

  return { iterations, javascriptMs, wasmMs, javascriptResult: jsValue, wasmResult: wasmValue };
}
