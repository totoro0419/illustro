# 長線の直後の一筆 — 比較結果

Source: `e78fcc41bffaaa351153b1ba3cdd22f75223ecd8`
PR #31 baseline: `1828947625dea1a16ec7532fd5275c4e0ccaec53`

4,000×4,000、390×844相当・DPR 3、同一runner・同一ブラウザ・同一入力。全体/100%、短線後・長線後・150ms待機・正式表示後・長線3連続、強制入り抜きON/OFFを各3反復（A/C順序を交替）。合計720ケース。ソフトウェアGPUのCPU/命令送信プロキシで、Android実機や物理表示の測定ではありません。

|処理|表示|ブラシ|入り抜き|次の仮表示まで p50 (ms) PR31→新|予定入力から更新 p50 (ms) PR31→新|前の線の正式表示 p50 (ms) PR31→新|
|---|---|---|---|---:|---:|---:|
|webgl2|fit|thin|off|66.1 → 5.8|208.5 → 42.1|1882.6 → 2396.3|
|webgl2|fit|thin|on|29.1 → 8.1|276.7 → 42.4|1910.8 → 2424.0|
|webgl2|100|thin|off|87.2 → 12.8|113.7 → 37.7|527.1 → 512.2|
|webgl2|100|thin|on|69.7 → 17.3|182.4 → 38.5|630.6 → 577.5|
|webgl2|fit|broad|off|8.8 → 8.1|61.0 → 45.9|2060.7 → 2303.8|
|webgl2|fit|broad|on|14.9 → 25.1|146.8 → 69.7|2324.4 → 2560.6|
|webgl2|100|broad|off|19.7 → 15.2|47.9 → 42.6|704.9 → 720.2|
|webgl2|100|broad|on|57.0 → 67.2|216.4 → 91.3|1115.5 → 1104.3|
|webgl2|fit|pencil|off|60.2 → 7.0|127.1 → 41.4|4264.8 → 4898.2|
|webgl2|100|pencil|off|122.1 → 28.4|144.1 → 51.0|1139.4 → 1106.3|
|webgl2|fit|eraser|off|153.2 → 66.3|162.0 → 73.0|3030.5 → 2905.0|
|webgl2|100|eraser|off|29.2 → 123.7|54.0 → 132.5|787.7 → 754.3|
|webgpu|fit|thin|off|39.6 → 4.0|61.0 → 21.8|2740.3 → 2708.7|
|webgpu|fit|thin|on|17.8 → 3.6|92.6 → 21.6|2774.7 → 2727.0|
|webgpu|100|thin|off|91.1 → 5.2|109.1 → 20.4|561.8 → 565.9|
|webgpu|100|thin|on|56.1 → 7.0|146.7 → 23.7|650.1 → 660.6|
|webgpu|fit|broad|off|6.3 → 5.4|35.5 → 38.1|5323.3 → 5072.0|
|webgpu|fit|broad|on|12.5 → 17.4|139.4 → 56.8|5613.7 → 5391.6|
|webgpu|100|broad|off|24.1 → 13.7|61.2 → 45.7|1232.1 → 1212.4|
|webgpu|100|broad|on|130.5 → 45.9|389.3 → 51.7|1936.2 → 1818.3|
|webgpu|fit|pencil|off|42.5 → 2.7|50.7 → 12.3|3827.7 → 3861.3|
|webgpu|100|pencil|off|78.8 → 10.6|86.4 → 20.6|992.3 → 962.0|
|webgpu|fit|eraser|off|1527.7 → 1506.6|1549.0 → 1512.7|7450.4 → 7435.5|
|webgpu|100|eraser|off|141.4 → 107.3|148.5 → 145.8|923.2 → 923.9|

|処理|表示|ブラシ|入り抜き|修正後・短線の後 p50 (ms)|修正後・長線の後 p50 (ms)|
|---|---|---|---|---:|---:|
|webgl2|fit|thin|off|7.5|5.8|
|webgl2|fit|thin|on|7.5|8.1|
|webgl2|100|thin|off|8.4|12.8|
|webgl2|100|thin|on|7.4|17.3|
|webgl2|fit|broad|off|6.1|8.1|
|webgl2|fit|broad|on|9.7|25.1|
|webgl2|100|broad|off|7.0|15.2|
|webgl2|100|broad|on|59.2|67.2|
|webgl2|fit|pencil|off|9.3|7.0|
|webgl2|100|pencil|off|14.6|28.4|
|webgl2|fit|eraser|off|605.2|66.3|
|webgl2|100|eraser|off|596.1|123.7|
|webgpu|fit|thin|off|7.6|4.0|
|webgpu|fit|thin|on|6.1|3.6|
|webgpu|100|thin|off|6.3|5.2|
|webgpu|100|thin|on|10.2|7.0|
|webgpu|fit|broad|off|6.6|5.4|
|webgpu|fit|broad|on|23.6|17.4|
|webgpu|100|broad|off|11.5|13.7|
|webgpu|100|broad|on|95.9|45.9|
|webgpu|fit|pencil|off|6.6|2.7|
|webgpu|100|pencil|off|9.3|10.6|
|webgpu|fit|eraser|off|203.5|1506.6|
|webgpu|100|eraser|off|178.4|107.3|

「予定入力から更新」は前のpointerup直前を起点とする自動入力の待ちを含みます。「次の仮表示」はイベント到着からCPU仮画像更新まで（消しゴムのみGPU命令送信まで）。物理表示ではありません。p50/p95/p99・短線後との比較・CPU長時間処理・更新間隔・所有メモリ・待機条件は `qa-status.json` と `performance/*/report.json` に記録しています。p95/p99は3反復では高い信頼度の推定にならないため、標本数と最大値を併記します。

正式画素・記録・重なり・Undo/Redo・全再生一致を両GPUで検証。全体表示の画質90組と、前の正式処理を保留した16条件の実表示画像を確認。新しい青線と前の赤線が同時に表示され、正式表示後は仮画像が残らないことを検査。

- Android phone/tablet stylus/finger performance and physical display timing remain unmeasured; user acceptance is false
- CPU upload is not a displayed frame; timer dispatch delay includes main-task scheduling and the synthetic driver
- p95/p99 of three per-condition repetitions are sparse order statistics; raw cases and sample counts are retained
- Eraser/lower-layer cases keep the exact sparse GPU feedback route; already submitted GPU work cannot be preempted
- Per-stroke bitmaps and private final-taper replacement add bounded transient memory; owned bytes are estimates, not RSS or VRAM
- Broad active strokes can still have heavier individual raster updates; no unconditional frame-time guarantee
- No submitted canonical stroke, input pressure/coordinates or Foundation taper was discarded or simplified
