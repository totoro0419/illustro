# 一筆限定プレビュー検証

Source: `1828947625dea1a16ec7532fd5275c4e0ccaec53`
Baseline PR30: `d9f52391bb2eeed4750e571262c8a089171d011e`

実機未確認・ユーザー受入未判定。以下はChromium/SwiftShaderのプロキシ値で、物理FPSや入力から発光までの時間ではありません。

画質比較 84条件、性能行列 576件、4,000px全体表示の各方式3反復。正式画像・記録・履歴の一致を両バックエンドで確認。

|処理|ブラシ|仮表示まで p95 A → C (ms)|更新間隔 p95 A → C (ms)|入力後の追いつき A → C (ms)|
|---|---|---:|---:|---:|
|webgl2|thin|1.6 → 2.0|10.7 → 11.0|251.6 → 263.2|
|webgl2|broad|2.2 → 4.0|14.5 → 11.0|3125.6 → 3054.6|
|webgl2|pencil|1.8 → 3.0|10.1 → 11.0|1770.6 → 1636.3|
|webgl2|eraser|2.7 → 105.7|11.2 → 632.2|2176.8 → 4611.9|
|webgpu|thin|1.3 → 1.9|10.0 → 10.7|519.9 → 417.7|
|webgpu|broad|2.1 → 4.7|10.0 → 10.9|4713.5 → 4481.5|
|webgpu|pencil|2.0 → 2.9|9.8 → 10.1|3059.5 → 2946.7|
|webgpu|eraser|2.5 → 22.5|10.2 → 806.1|3431.1 → 8998.1|

消しゴムは正確なGPU経路の値。各条件の逆転・遅い場面を含む生データはJSONに保持。Cの品質向上による処理増加も含めて比較。

- Android phone/tablet physical stylus/finger performance, heat/power and user acceptance unverified
- Erase/lower/unsupported cases use the existing exact sparse GPU feedback route and retain its GPU scheduling cost
- Transparent GPU preparation moves first-dispatch work into startup; initialization cost is recorded separately
- Cropped high-density handoff guard incurs readback/copy cost; memory counters are owned-allocation estimates, not RSS/VRAM
- Very fine artwork below a display pixel is intrinsically faint; preview coverage is display-only and preserves canonical coordinates
- Force Fade final endpoint effect remains governed by the existing Foundation
