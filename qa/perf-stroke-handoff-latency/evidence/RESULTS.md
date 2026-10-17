# 長線の直後の一筆 — 比較結果

Source: `df364354d71ec199a49c7e2a7a3d16ebc13aaeca`
PR #31 baseline: `1828947625dea1a16ec7532fd5275c4e0ccaec53`

4,000×4,000、390×844相当・DPR 3、同一runner・同一ブラウザ・同一入力。全体/100%、短線後・長線後・150ms待機・正式表示後・長線3連続、強制入り抜きON/OFFを各3反復（A/C順序を交替）。合計720ケース。ソフトウェアGPUのCPU/命令送信プロキシで、Android実機や物理表示の測定ではありません。

|処理|表示|ブラシ|入り抜き|次の仮表示まで p50 (ms) PR31→新|予定入力から更新 p50 (ms) PR31→新|前の線の正式表示 p50 (ms) PR31→新|
|---|---|---|---|---:|---:|---:|
|webgl2|fit|thin|off|25.8 → 8.7|31.5 → 43.0|1934.5 → 2356.3|
|webgl2|fit|thin|on|27.3 → 6.8|264.4 → 52.3|1899.6 → 2425.3|
|webgl2|100|thin|off|100.0 → 10.9|132.0 → 35.4|528.1 → 510.6|
|webgl2|100|thin|on|61.6 → 13.8|186.0 → 39.5|626.4 → 589.5|
|webgl2|fit|broad|off|12.3 → 12.0|119.0 → 73.1|4009.1 → 4470.3|
|webgl2|fit|broad|on|23.4 → 28.7|224.6 → 107.7|4259.6 → 4871.0|
|webgl2|100|broad|off|28.7 → 13.5|74.2 → 48.9|1165.4 → 1225.2|
|webgl2|100|broad|on|118.1 → 37.8|391.6 → 45.6|1856.7 → 1819.1|
|webgl2|fit|pencil|off|51.3 → 5.4|101.2 → 29.4|2770.0 → 3165.7|
|webgl2|100|pencil|off|89.2 → 20.4|106.5 → 37.8|770.6 → 816.5|
|webgl2|fit|eraser|off|56.9 → 60.0|76.4 → 74.9|1926.4 → 1901.7|
|webgl2|100|eraser|off|23.4 → 16.1|29.0 → 29.2|521.2 → 535.1|
|webgpu|fit|thin|off|61.1 → 3.7|79.2 → 21.1|2740.2 → 2732.9|
|webgpu|fit|thin|on|17.9 → 3.7|89.2 → 24.0|2784.1 → 2759.1|
|webgpu|100|thin|off|95.7 → 5.9|112.1 → 25.3|571.9 → 574.7|
|webgpu|100|thin|on|34.1 → 11.3|133.1 → 25.1|640.0 → 650.3|
|webgpu|fit|broad|off|6.1 → 7.1|40.7 → 37.4|4542.0 → 4337.5|
|webgpu|fit|broad|on|11.8 → 15.4|128.2 → 54.1|4795.0 → 4615.3|
|webgpu|100|broad|off|14.6 → 13.4|49.9 → 55.4|1188.8 → 1177.8|
|webgpu|100|broad|on|100.1 → 44.1|352.8 → 50.7|1824.1 → 1678.8|
|webgpu|fit|pencil|off|78.2 → 4.5|93.0 → 20.2|8346.4 → 8415.1|
|webgpu|100|pencil|off|102.7 → 20.5|120.1 → 35.5|2100.9 → 2033.8|
|webgpu|fit|eraser|off|1486.0 → 52.7|1491.9 → 85.4|7410.4 → 7858.3|
|webgpu|100|eraser|off|131.4 → 130.4|138.6 → 155.9|916.3 → 1089.5|

|処理|表示|ブラシ|入り抜き|修正後・短線の後 p50 (ms)|修正後・長線の後 p50 (ms)|
|---|---|---|---|---:|---:|
|webgl2|fit|thin|off|4.3|8.7|
|webgl2|fit|thin|on|8.0|6.8|
|webgl2|100|thin|off|8.4|10.9|
|webgl2|100|thin|on|8.5|13.8|
|webgl2|fit|broad|off|7.2|12.0|
|webgl2|fit|broad|on|22.8|28.7|
|webgl2|100|broad|off|14.9|13.5|
|webgl2|100|broad|on|83.5|37.8|
|webgl2|fit|pencil|off|5.7|5.4|
|webgl2|100|pencil|off|9.4|20.4|
|webgl2|fit|eraser|off|485.2|60.0|
|webgl2|100|eraser|off|456.2|16.1|
|webgpu|fit|thin|off|10.1|3.7|
|webgpu|fit|thin|on|8.2|3.7|
|webgpu|100|thin|off|7.9|5.9|
|webgpu|100|thin|on|12.2|11.3|
|webgpu|fit|broad|off|7.8|7.1|
|webgpu|fit|broad|on|14.1|15.4|
|webgpu|100|broad|off|14.1|13.4|
|webgpu|100|broad|on|88.0|44.1|
|webgpu|fit|pencil|off|6.9|4.5|
|webgpu|100|pencil|off|17.1|20.5|
|webgpu|fit|eraser|off|264.9|52.7|
|webgpu|100|eraser|off|171.4|130.4|

追加のWebGPU消しゴム比較（各3反復。GPU表示要求の時刻であり物理表示ではない）

|表示|条件|次の表示要求 p50 PR31→新 (ms)|前線の正式表示 p50 PR31→新 (ms)|
|---|---|---:|---:|
|fit|short-next|211.2 → 277.4|839.9 → 1101.9|
|fit|long-next|1550.3 → 63.4|7438.0 → 7860.7|
|fit|long-chain|374.4 → 75.5|8829.1 → 8998.5|
|100|short-next|179.1 → 178.2|617.8 → 629.2|
|100|long-next|142.0 → 133.8|926.9 → 1091.2|
|100|long-chain|74.4 → 154.9|1962.9 → 2363.8|

「予定入力から更新」は前のpointerup直前を起点とする自動入力の待ちを含みます。「次の仮表示」はイベント到着からCPU仮画像更新まで（消しゴムのみGPU命令送信まで）。物理表示ではありません。p50/p95/p99・短線後との比較・CPU長時間処理・更新間隔・所有メモリ・待機条件は `qa-status.json` と `performance/*/report.json` に記録しています。p95/p99は3反復では高い信頼度の推定にならないため、標本数と最大値を併記します。

正式画素・記録・重なり・Undo/Redo・全再生一致を両GPUで検証。全体表示の画質90組と、前の正式処理を保留した16条件の実表示画像を確認。新しい青線と前の赤線が同時に表示され、正式表示後は仮画像が残らないことを検査。

- Android phone/tablet stylus/finger performance and physical display timing remain unmeasured; user acceptance is false
- CPU upload is not a displayed frame; timer dispatch delay includes main-task scheduling and the synthetic driver
- p95/p99 of three per-condition repetitions are sparse order statistics; raw cases and sample counts are retained
- Exact WebGPU feedback is bounded to 8 queued tiles per submission where eligible; CPU-to-GPU guarded transitions and resource-pressure paths retain correctness-first draining. Already submitted GPU work cannot be preempted
- Per-stroke bitmaps and private final-taper replacement add bounded transient memory; owned bytes are estimates, not RSS or VRAM
- Broad active strokes can still have heavier individual raster updates; no unconditional frame-time guarantee
- No submitted canonical stroke, input pressure/coordinates or Foundation taper was discarded or simplified
