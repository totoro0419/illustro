# キャンバス操作・入り抜き・下層表示の検証

対象ソース: `ce816789701c484841895aca2617df5efd77cefd`

修正前: `45d93027eabdd3d17fd74db185146c2533994f51`。Chromium SwiftShaderの比較です。実機FPS、物理入力遅延、ユーザー合格は未確認です。

## キャンバス操作

表示要求の間隔・入力通知から表示要求までのp95（遅い側5%の境界）。各条件1往復の診断であり、実機60fpsの達成証拠ではありません。反応回数が少ない条件のp95は実質的に最大値となり、精密な分位点推定ではありません。

|描画方式・画面相当|表示間隔p95 前→後|入力→表示要求p95 前→後|長線直後の間隔p95 前→後|
|---|---:|---:|---:|
|webgl2 / phone|216.7 → 199.7 ms|0.5 → 101.2 ms|374.0 → 201.0 ms|
|webgl2 / tablet|600.6 → 614.0 ms|0.3 → 333.8 ms|1196.4 → 567.5 ms|
|webgpu / phone|316.5 → 256.6 ms|282.5 → 246.8 ms|677.5 → 262.5 ms|
|webgpu / tablet|754.9 → 745.5 ms|745.4 → 718.5 ms|1743.7 → 750.8 ms|

## 描画の維持

同じ入力を旧新各3回、順序を交互に測定。以下は次の線の入力から最初の仮画像更新までの中央値です。細い線・太い線・鉛筆、4k、全体/100%、入り抜きON/OFFを含みます。

|条件|前|後|正式確定 前→後|
|---|---:|---:|---:|
|webgl2/thin/fit/off/short-next|9.3 ms|8.4 ms|458.7 → 447.4 ms|
|webgl2/thin/fit/off/long-next|9.2 ms|6.6 ms|2386.0 → 2843.8 ms|
|webgl2/thin/fit/on/short-next|7.4 ms|6.2 ms|460.4 → 480.1 ms|
|webgl2/thin/fit/on/long-next|10.2 ms|3.4 ms|2442.9 → 2911.4 ms|
|webgl2/thin/100/off/short-next|6.8 ms|9.6 ms|447.5 → 421.9 ms|
|webgl2/thin/100/off/long-next|9.6 ms|9.1 ms|514.4 → 450.6 ms|
|webgl2/thin/100/on/short-next|11.2 ms|9.4 ms|460.0 → 460.2 ms|
|webgl2/thin/100/on/long-next|9.9 ms|5.2 ms|601.0 → 512.9 ms|
|webgl2/broad/fit/off/short-next|6.5 ms|6.4 ms|720.0 → 645.1 ms|
|webgl2/broad/fit/off/long-next|12.4 ms|11.4 ms|4549.2 → 4966.3 ms|
|webgl2/broad/fit/on/short-next|18.1 ms|20.4 ms|817.8 → 891.6 ms|
|webgl2/broad/fit/on/long-next|26.9 ms|13.0 ms|4824.1 → 5361.8 ms|
|webgl2/broad/100/off/short-next|11.3 ms|13.3 ms|471.6 → 457.9 ms|
|webgl2/broad/100/off/long-next|26.3 ms|18.4 ms|1212.4 → 1038.8 ms|
|webgl2/broad/100/on/short-next|95.9 ms|61.3 ms|964.2 → 1115.4 ms|
|webgl2/broad/100/on/long-next|113.9 ms|40.5 ms|1829.5 → 2109.8 ms|
|webgl2/pencil/fit/off/short-next|8.4 ms|7.4 ms|613.7 → 511.7 ms|
|webgl2/pencil/fit/off/long-next|8.9 ms|12.4 ms|6211.1 → 6571.2 ms|
|webgl2/pencil/100/off/short-next|16.8 ms|22.7 ms|503.3 → 444.9 ms|
|webgl2/pencil/100/off/long-next|33.6 ms|31.4 ms|1425.1 → 1307.1 ms|
|webgpu/thin/fit/off/short-next|6.0 ms|6.1 ms|490.0 → 531.3 ms|
|webgpu/thin/fit/off/long-next|6.4 ms|5.7 ms|2683.2 → 3227.2 ms|
|webgpu/thin/fit/on/short-next|5.6 ms|4.6 ms|500.1 → 538.5 ms|
|webgpu/thin/fit/on/long-next|4.3 ms|3.2 ms|2737.1 → 3280.6 ms|
|webgpu/thin/100/off/short-next|6.3 ms|8.6 ms|474.2 → 509.5 ms|
|webgpu/thin/100/off/long-next|5.5 ms|9.2 ms|568.7 → 532.0 ms|
|webgpu/thin/100/on/short-next|11.4 ms|8.0 ms|487.6 → 521.7 ms|
|webgpu/thin/100/on/long-next|9.4 ms|5.6 ms|641.0 → 603.1 ms|
|webgpu/broad/fit/off/short-next|7.4 ms|6.0 ms|778.4 → 710.9 ms|
|webgpu/broad/fit/off/long-next|5.0 ms|8.0 ms|5053.4 → 5503.9 ms|
|webgpu/broad/fit/on/short-next|16.9 ms|18.4 ms|922.0 → 938.3 ms|
|webgpu/broad/fit/on/long-next|18.1 ms|11.1 ms|5395.4 → 6056.3 ms|
|webgpu/broad/100/off/short-next|10.8 ms|9.4 ms|533.9 → 532.7 ms|
|webgpu/broad/100/off/long-next|18.2 ms|9.7 ms|1203.7 → 1035.3 ms|
|webgpu/broad/100/on/short-next|73.3 ms|77.5 ms|1054.6 → 1189.3 ms|
|webgpu/broad/100/on/long-next|103.7 ms|41.6 ms|1745.5 → 1982.3 ms|
|webgpu/pencil/fit/off/short-next|6.3 ms|5.9 ms|712.8 → 613.5 ms|
|webgpu/pencil/fit/off/long-next|5.0 ms|7.7 ms|8387.8 → 8785.8 ms|
|webgpu/pencil/100/off/short-next|16.3 ms|22.6 ms|567.0 → 523.3 ms|
|webgpu/pencil/100/off/long-next|24.3 ms|20.8 ms|2014.2 → 1809.0 ms|

## 正しさ

両GPUで7ブラシ・レイヤー・重なり・取消/やり直し・再生・旧記録の画素/記録を比較。新しい入り抜きは入力点の間を補間するため、旧形状との画素一致とは分け、再生一致・圧力/時間/機器/点数の独立性を検査しています。

- webgl2: 下層消失を観測した表示回数 0 → 0。半透明の二重描画・上層の青を隠さないことも画素で検査。
- webgpu: 下層消失を観測した表示回数 4 → 0。半透明の二重描画・上層の青を隠さないことも画素で検査。

全検査を実機合格の代用にしません。詳細な停止時間・最長間隔・更新回数・生の画素・入力記録はJSONに保持します。
