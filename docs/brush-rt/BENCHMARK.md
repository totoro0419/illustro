> Classification: EXPERIMENTAL / historical research and validation. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Benchmark protocol and measured failures

Three evidence levels remain distinct:

1. Node geometry/scheduling simulation:180s × sizes16/128/512/1024 × rates60/120/240/480. All actual input is retained, local fit is bounded and mailbox capacity is one. No raster GPU/physical latency result.
2. Browser software-GPU wall-clock trial: sizes16/128/512/1024 × rates60/120/240 on2048×1536, four seconds each; intentional formal stall;180s wide continuous stroke. Twelve shape cases and active/final pixel tests are separate. Report actual duration/input count, generator lateness and viewport/document dimensions.
3. Real GPU/stylus: UNVERIFIED. Same device/canvas/brush/correction/motion is required for ibis/CSP comparison. Film the initial/final seconds if possible.

The primary software gate compares first/last1s p95 GPU-completion input age: end minus start ≤20ms with samples in both windows. This is `PASS_PROXY`, never physical PASS. Large absolute age remains unacceptable even if growth is small; missing end samples fail. Timestamp generation lateness is reported separately, without rewriting old input as fresh input.

## Results actually observed

| Run / document | Selected measurement | Verdict |
|---|---|---|
|37034137600 /512×384 | WebGL2 512px240Hz:81.7→952.3ms;1024px240Hz:79.3→954.0ms | FAIL; long-run confirmed drain timed out |
|37040087180 /2048×1536 | WebGPU16px240Hz:273.3→824.7ms; wide matrix incomplete after drain timeout | FAIL |
|37043019906 /2048×1536 | WebGL2 16px240Hz:71.4→70.4ms;512px240Hz:184.8→2035.1ms | Narrow proxy growth pass, wide FAIL |
|37043019906 /2048×1536 | WebGPU1024px240Hz:474.8→10281.7ms, actual test duration10810.8ms | FAIL; software workload also starved the input generator |

These failed candidates motivate incremental readiness, exact no-op elision, instanced confirmed solids, dirty composition and scissored prefix coverage. Subsequent source changes are not counted as performance success until executed. Per-run JSON summaries are retained in `evidence`.

Run:

```sh
node prototypes/brush-rt/build.mjs
node --test packages/brush-rt/test/*.test.mjs
RT_PLAYWRIGHT_PATH=/path/to/playwright RT_LONG_TEST=1 node prototypes/brush-rt/browser-check.mjs
```

`RT_BACKEND=webgl2` or `webgpu` selects one backend. CI runs both as independent jobs and preserves failures. Backend metadata keeps hardwareVerified=false. Pointer API availability and observed predicted samples are distinct; synthesized test prediction is not real pen prediction.

A formal chunk remains one128px tile and up to16 commands;1–8 ordinary chunks per GPU batch follow live feedback. Exact covered-tile no-ops can be consumed without GPU deposition. This work bound cannot promise arbitrary hardware milliseconds or GPU preemption.


## 密な鉛筆の追加試験：CI37089526671 WebGL2

4秒高速曲線、rough-pencil、予測OFF、240/480Hz。1px開始p95=86.9/67.9ms→終了53.4/52.9ms、4px開始68.2/68.1ms→終了55.5/55.5ms。16pxを含む6条件は開始・中間・終了を比較する累積proxy Gateを成功。これらはSwiftShaderでのGPU完了代用値であり、実GPUやpen-to-photon値ではない。絶対遅延の良さは主張しない。

描画中・終了直後・正式描画後の12鉛筆画像試験も追加した。完全な結果は`evidence/run-37089526671-webgl2-results.json`。全体には星型512pxのFAILが残る。


同実行のWebGPUでも細線6件を含む20件の短時間proxyと12鉛筆画像Gateは成功。ただし180秒は開始1秒のサンプルが1件のみでFAIL_OR_INSUFFICIENT。開始623.1ms→終了91.4msという減少を理由に合格へ変更しない。全43200入力保持、開始時の不足を結果に記録する。


## 最新の全条件：f20a028a / CI37090457149

SwiftShader/headless Chromium、GPU-completion proxy。画面提示・実ペン・光学測定ではない。Preset全設定、seed、fast補正、入力発生の遅れ、正式待ちを完全なJSONへ記録した。開始・中間・終了のp95差を比較し、各窓2件未満は成功にしない。

|Backend|px|Hz|時間s|形状/紙|開始p95 ms|中間p95 ms|終了p95 ms|Gate|
|---|---:|---:|---:|---|---:|---:|---:|---|
|webgl2|1024|240|180.0|long|389.4|117.1|67.7|PASS_PROXY|
|webgl2|1|240|4.0|fast-curve|119.8|70.6|69.9|PASS_PROXY|
|webgl2|1|480|4.0|fast-curve|115.3|71.0|69.6|PASS_PROXY|
|webgl2|4|240|4.0|fast-curve|103.9|70.9|70.9|PASS_PROXY|
|webgl2|4|480|4.0|fast-curve|119.6|69.0|69.4|PASS_PROXY|
|webgl2|16|240|4.0|fast-curve|103.8|70.7|71.3|PASS_PROXY|
|webgl2|16|480|4.0|fast-curve|100.3|69.4|70.5|PASS_PROXY|
|webgl2|16|60|4.0|fast-curve|93.2|79.2|78.3|PASS_PROXY|
|webgl2|16|120|4.0|fast-curve|109.4|75.4|75.4|PASS_PROXY|
|webgl2|16|240|4.0|fast-curve|99.9|71.2|70.3|PASS_PROXY|
|webgl2|128|60|4.0|fast-curve|106.7|75.3|76.3|PASS_PROXY|
|webgl2|128|120|4.0|fast-curve|108.5|72.0|75.4|PASS_PROXY|
|webgl2|128|240|4.0|fast-curve|135.6|84.4|70.1|PASS_PROXY|
|webgl2|512|60|4.0|fast-curve|159.1|93.4|92.4|PASS_PROXY|
|webgl2|512|120|4.0|fast-curve|174.4|93.1|95.5|PASS_PROXY|
|webgl2|512|240|4.0|fast-curve|183.5|89.7|100.0|PASS_PROXY|
|webgl2|1024|60|4.0|fast-curve|191.8|124.9|125.7|PASS_PROXY|
|webgl2|1024|120|4.0|fast-curve|206.4|124.1|107.4|PASS_PROXY|
|webgl2|1024|240|4.0|fast-curve|219.1|122.4|117.8|PASS_PROXY|
|webgl2|1024|240|5.0|reversal|282.7|220.7|183.9|PASS_PROXY|
|webgl2|1024|240|4.0|fast-curve/4K|166.8|86.0|86.3|PASS_PROXY|
|webgpu|1024|240|180.0|long|458.2|667.2|66.8|PASS_PROXY|
|webgpu|1|240|4.0|fast-curve|214.3|84.6|92.3|PASS_PROXY|
|webgpu|1|480|4.0|fast-curve|218.8|81.7|87.1|PASS_PROXY|
|webgpu|4|240|4.0|fast-curve|216.3|90.8|90.9|PASS_PROXY|
|webgpu|4|480|4.0|fast-curve|216.4|83.8|88.4|PASS_PROXY|
|webgpu|16|240|4.0|fast-curve|226.9|88.8|86.2|PASS_PROXY|
|webgpu|16|480|4.0|fast-curve|226.7|84.4|91.6|PASS_PROXY|
|webgpu|16|60|4.0|fast-curve|210.5|87.3|95.9|PASS_PROXY|
|webgpu|16|120|4.0|fast-curve|209.0|82.7|86.6|PASS_PROXY|
|webgpu|16|240|4.0|fast-curve|214.3|81.0|86.0|PASS_PROXY|
|webgpu|128|60|4.0|fast-curve|216.0|122.0|120.8|PASS_PROXY|
|webgpu|128|120|4.0|fast-curve|217.3|114.2|115.3|PASS_PROXY|
|webgpu|128|240|4.0|fast-curve|220.3|114.4|120.9|PASS_PROXY|
|webgpu|512|60|4.0|fast-curve|290.3|188.2|188.1|PASS_PROXY|
|webgpu|512|120|4.0|fast-curve|289.9|197.3|177.7|PASS_PROXY|
|webgpu|512|240|4.0|fast-curve|290.9|186.3|180.2|PASS_PROXY|
|webgpu|1024|60|4.0|fast-curve|416.9|299.7|251.1|PASS_PROXY|
|webgpu|1024|120|4.0|fast-curve|421.5|318.4|244.9|PASS_PROXY|
|webgpu|1024|240|4.0|fast-curve|419.3|293.1|243.7|PASS_PROXY|
|webgpu|1024|240|5.0|reversal|463.0|496.0|343.3|PASS_PROXY|
|webgpu|1024|240|4.0|fast-curve/4K|288.0|135.6|138.1|PASS_PROXY|

両backendとも21条件を成功。1024px長時間では43200入力を保持した。開始時の大きい絶対値や最大距離を隠さず、実機の良い描き味を証明したとは主張しない。値の全体は`evidence/run-37090457149-results.json`。全条件は新しい書式のため過去の試験結果と混同しない。
