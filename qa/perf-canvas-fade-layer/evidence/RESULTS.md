# キャンバス操作・入り抜き・下層表示の検証

対象ソース: `8376eb2d359c42e4469fbe3f6f5acde01231e21f`

修正前: `45d93027eabdd3d17fd74db185146c2533994f51`。Chromium SwiftShaderの比較です。実機FPS、物理入力遅延、ユーザー合格は未確認です。

## キャンバス操作

表示要求の間隔・入力通知から表示要求までのp95（遅い側5%の境界）。各条件1往復の診断であり、実機60fpsの達成証拠ではありません。反応回数が少ない条件のp95は実質的に最大値となり、精密な分位点推定ではありません。

|描画方式・画面相当|表示間隔p95 前→後|入力→表示要求p95 前→後|長線直後の間隔p95 前→後|
|---|---:|---:|---:|
|webgl2 / phone|166.6 → 133.4 ms|0.4 → 117.5 ms|274.6 → 150.1 ms|
|webgl2 / tablet|449.6 → 433.1 ms|0.3 → 433.6 ms|753.4 → 382.7 ms|
|webgpu / phone|257.4 → 207.0 ms|247.6 → 184.0 ms|615.7 → 207.1 ms|
|webgpu / tablet|752.0 → 613.8 ms|700.6 → 596.4 ms|1771.8 → 616.7 ms|

## 描画の維持

同じ入力を旧新各3回、順序を交互に測定。以下は次の線の入力から最初の仮画像更新までの中央値です。細い線・太い線・鉛筆、4k、全体/100%、入り抜きON/OFFを含みます。

|条件|前|後|正式確定 前→後|
|---|---:|---:|---:|
|webgl2/thin/fit/off/short-next|6.9 ms|8.1 ms|556.9 → 636.1 ms|
|webgl2/thin/fit/off/long-next|6.3 ms|2.9 ms|1762.3 → 2099.3 ms|
|webgl2/thin/fit/on/short-next|7.6 ms|5.1 ms|541.1 → 633.7 ms|
|webgl2/thin/fit/on/long-next|6.2 ms|3.6 ms|1742.4 → 2118.9 ms|
|webgl2/thin/100/off/short-next|7.1 ms|5.3 ms|536.9 → 610.7 ms|
|webgl2/thin/100/off/long-next|6.9 ms|7.8 ms|371.9 → 405.4 ms|
|webgl2/thin/100/on/short-next|6.0 ms|9.6 ms|545.3 → 613.9 ms|
|webgl2/thin/100/on/long-next|4.9 ms|9.4 ms|433.9 → 423.6 ms|
|webgl2/broad/fit/off/short-next|5.0 ms|5.6 ms|774.1 → 801.5 ms|
|webgl2/broad/fit/off/long-next|6.8 ms|5.9 ms|3400.2 → 3646.8 ms|
|webgl2/broad/fit/on/short-next|17.0 ms|12.4 ms|827.1 → 919.1 ms|
|webgl2/broad/fit/on/long-next|22.2 ms|9.6 ms|3536.9 → 3966.7 ms|
|webgl2/broad/100/off/short-next|10.4 ms|10.8 ms|540.9 → 648.3 ms|
|webgl2/broad/100/off/long-next|12.5 ms|14.2 ms|936.4 → 771.5 ms|
|webgl2/broad/100/on/short-next|85.8 ms|66.9 ms|709.7 → 873.2 ms|
|webgl2/broad/100/on/long-next|82.3 ms|27.5 ms|1366.5 → 1605.9 ms|
|webgl2/pencil/fit/off/short-next|7.6 ms|5.4 ms|663.0 → 702.3 ms|
|webgl2/pencil/fit/off/long-next|8.2 ms|4.3 ms|4840.0 → 5003.5 ms|
|webgl2/pencil/100/off/short-next|11.5 ms|11.7 ms|525.4 → 616.8 ms|
|webgl2/pencil/100/off/long-next|21.8 ms|18.5 ms|1074.0 → 1034.5 ms|
|webgpu/thin/fit/off/short-next|9.5 ms|6.5 ms|495.1 → 533.0 ms|
|webgpu/thin/fit/off/long-next|3.8 ms|4.0 ms|2699.0 → 3221.5 ms|
|webgpu/thin/fit/on/short-next|5.0 ms|4.3 ms|501.8 → 547.1 ms|
|webgpu/thin/fit/on/long-next|3.9 ms|3.3 ms|2732.4 → 3278.9 ms|
|webgpu/thin/100/off/short-next|7.6 ms|7.6 ms|470.2 → 499.6 ms|
|webgpu/thin/100/off/long-next|5.5 ms|4.6 ms|565.9 → 541.8 ms|
|webgpu/thin/100/on/short-next|10.5 ms|10.2 ms|484.8 → 524.6 ms|
|webgpu/thin/100/on/long-next|12.0 ms|5.9 ms|657.5 → 619.4 ms|
|webgpu/broad/fit/off/short-next|7.4 ms|6.6 ms|793.2 → 718.1 ms|
|webgpu/broad/fit/off/long-next|5.8 ms|5.6 ms|5094.3 → 5495.7 ms|
|webgpu/broad/fit/on/short-next|18.1 ms|17.6 ms|928.1 → 939.1 ms|
|webgpu/broad/fit/on/long-next|17.3 ms|11.6 ms|5424.7 → 6067.4 ms|
|webgpu/broad/100/off/short-next|12.3 ms|11.2 ms|527.1 → 534.1 ms|
|webgpu/broad/100/off/long-next|19.4 ms|11.2 ms|1218.5 → 1045.6 ms|
|webgpu/broad/100/on/short-next|84.5 ms|76.9 ms|1070.8 → 1184.0 ms|
|webgpu/broad/100/on/long-next|42.2 ms|40.4 ms|1769.1 → 2007.2 ms|
|webgpu/pencil/fit/off/short-next|6.3 ms|6.7 ms|725.0 → 626.7 ms|
|webgpu/pencil/fit/off/long-next|5.1 ms|4.6 ms|8424.5 → 8807.3 ms|
|webgpu/pencil/100/off/short-next|22.6 ms|18.0 ms|557.1 → 520.4 ms|
|webgpu/pencil/100/off/long-next|26.5 ms|24.3 ms|2018.3 → 1841.1 ms|

## 正しさ

両GPUで7ブラシ・レイヤー・重なり・取消/やり直し・再生・旧記録の画素/記録を比較。新しい入り抜きは入力点の間を補間するため、旧形状との画素一致とは分け、再生一致・圧力/時間/機器/点数の独立性を検査しています。

- webgl2: 下層消失を観測した表示回数 0 → 0。半透明の二重描画・上層の青を隠さないことも画素で検査。
- webgpu: 下層消失を観測した表示回数 4 → 0。半透明の二重描画・上層の青を隠さないことも画素で検査。

全検査を実機合格の代用にしません。詳細な停止時間・最長間隔・更新回数・生の画素・入力記録はJSONに保持します。

## 前回公開版からの追加改善

比較元579c31deと対象版の表示処理を交互に3回、各18表示で測定。下表はGPUキューの完了待ちの中央値とp95で、画面への発光時刻ではありません。元画像・DPR・縮小用画像・面積平均は維持しています。

|方式・画面相当・作品px|完了待ち中央値 前→後|完了待ちp95 前→後|操作中の最大画素差 /255|
|---|---:|---:|---:|
|webgl2 / phone / 4000|82.1 → 53.9 ms|110.0 → 78.5 ms|1|
|webgl2 / phone / 4001|74.6 → 49.2 ms|89.9 → 65.4 ms|1|
|webgl2 / tablet / 4000|191.4 → 122.9 ms|238.9 → 175.1 ms|1|
|webgl2 / tablet / 4001|190.9 → 123.7 ms|238.3 → 174.3 ms|1|
|webgpu / phone / 4000|134.7 → 90.2 ms|152.3 → 112.9 ms|1|
|webgpu / phone / 4001|134.7 → 90.7 ms|154.9 → 112.6 ms|1|
|webgpu / tablet / 4000|330.4 → 209.8 ms|401.3 → 296.2 ms|1|
|webgpu / tablet / 4001|332.0 → 212.6 ms|401.5 → 296.4 ms|1|

キャンバス外の省略と操作後の表示は前回版の全表示画素と完全一致。操作中だけGPU標準の同じ線形補間を使用し、丸め差を計測しています。作品の正式画素・保存記録はこの表示サンプラーを経由しません。入力を止めた後は座標イベントがなくても従来の表示へ戻します。実機60fps・入力から発光まで・ユーザー合格は未確認です。
