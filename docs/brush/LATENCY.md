> Classification: EXPERIMENTAL / historical research and validation. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# 入力時の描画と長い線の負荷

**最新の512px以上の表示構造は [THICK_LATENCY.md](THICK_LATENCY.md)。以下は78ad82b以前の変更と測定の記録であり、新スケジューラの認証に流用しない。**

2026-10-02。接触した初点と補正済みの最新位置を、入力処理中に描画へ渡す。補正・保存・厳密な再現計算の完了を待たせない。これは主要ペイントアプリを上回るという品質目標の最低条件であり、総合的な完成判定ではない。

## 再報告を受けた追加修正

入力時描画の候補でも、ユーザーから「まだ追いかける」「太い線が重い」「長い線の確定済み部分も計算していないか」と再報告された。前回の送信時間・最新点の表示検査だけでは、GPUへの滞留を検出できていなかった。

確定済みブラシ命令の再生成・再押印はしていなかった。一方、入力のたびに確定済み画素を含む全画面をprefix→previewへコピーし、全画面を合成していた。CPU代替はpreviewのforkで全履歴タイルを毎回走査していた。全画面処理自体は一本の長さに比例して増える処理ではないが、入力ごとの無駄な仕事が連続し、GPUに滞留する可能性がある。これを線全体の再計算と同一視しない。

今回の変更：

- GPUのprefixを保持し、新しく確定した範囲・前回の可変末尾・今回の可変末尾の和集合だけをコピー・合成する。以前の末尾の画素を確実に戻し、反転・重なり・入り抜きで残像を残さない。終了、取消、背景更新は全画面で整合を取る。
- 色・濃さが一定のブラシは、粒をインスタンスとして一度に描く。coverageに対する濃さの漸化式をGPUの固定合成へ移し、粒ごとのframebuffer読み取り・copyTexSubImage2Dをなくす。色と濃さが変わる設定、EXT_float_blend未対応環境は従来の汎用depositを使う。
- 上記の一定色のストロークはR32F一チャンネルに濃さを保持し、画面合成時に色を適用する。押印・prefix→previewコピーの帯域を減らす。厳密な保存計算は従来のFloat64のまま。
- uniform位置をプログラム作成時に保存する。描画ループでgetUniformLocationを呼ばない。
- CPUのforkは末尾が触れるタイルのみを共有する。前の末尾や確定画素の表示は親から読み、履歴全体の列挙をなくす。親とpreviewのcopy-on-writeの独立性も検査する。
- 通常描画時に透明な2D canvasをGPU canvasの上へ置かない。GPU canvas自身が入力を受ける。診断の点を表示する時だけoverlayを出し、getContextAttributes().desynchronizedの実際の値を診断APIへ出す。

### 既存実装・公式資料から採用した考え方

- [libmypaintのタイル処理](https://github.com/mypaint/libmypaint/blob/master/mypaint-tiled-surface.c)：新しい操作を影響タイルに積み、dirty範囲を処理する。今回のCPU局所forkとGPU差分更新に、この考え方を採用した。Cコードの転載はしていない。
- [regl-gpu-lines](https://github.com/rreusser/regl-gpu-lines)：GPU instancingで描画呼出しをまとめる公開実装を参考に、Illustroの粒の形状と合成に適用した。polyline描画へ置き換えてはいない。
- [Chrome公式の低遅延canvas資料](https://developer.chrome.com/blog/desynchronized)：属性だけでは不十分で、alpha:trueのcanvasには上にDOM要素を置かない条件がある。透明な2D入力canvasを上へ置く構成を修正した。属性がtrueでも物理画面の低遅延を保証するものではない。
- [ibisPaint 14.1.0の公式紹介](https://ibispaint.com/newFeature.jsp?lang=ja)：事前補正への変更と高速なペン移動での遅れ改善を確認した。内部の補間式やshaderは公開説明から取得できないため、今回のコードを「ibis内部方式の再現」とは呼ばない。
- [Krita Instant Preview](https://docs.krita.org/en/reference_manual/instant_preview.html)：低解像度の表示と本解像度の計算を分ける公開方式も確認した。今回のmask・document grainの見た目を崩す縮小近似は導入していない。

### 長い線とGPU完了の検査

`npm run brush:throughput`。同じ128入力の経路を一本の線として4096入力まで続け、入力257〜384と3969〜4096を比較する。16/128/512pxの鉛筆で描画命令数・コピー画素数が履歴長に従って増えないことをgateにした。これとは別に、インクと鉛筆を16/128/512/1024pxで100入力描く。

送信時間だけで終わらせず、測定の境界でfinishに続けて1画素をreadPixelsする。読み戻し完了までの時間はGPU処理とブラウザの同期費用を含み、純粋なGPU時間やpen-to-photonとは呼ばない。入力の製品経路にreadPixelsやfinishは入れていない。旧方式の測定はcommit `1bde406` のHTML、現行はこのbranchの生成HTMLを使う。双方は同じheadless Chromium/SwiftShader。性能値は実GPU・実ペンの認証へ拡張しない。

[修正前](evidence/throughput-before-v2.json) / [修正後](evidence/throughput-after-v2.json)。100入力では旧方式の全画面コピーと合成がそれぞれ39,321,600画素あった。現行では変更範囲に限定し、通常インク・鉛筆の粒ごとのコピー数を0にした。補正の入力→補正位置の差はこの検査で最大約2.38pxのままであり、補正を含む物理的な追従遅延を解消したと断言しない。

今回の長い一本の線の測定（128入力あたりのコピー面積）：

| 鉛筆の太さ | 修正前・前半 | 修正後・前半 | 修正後・後半 | 後半のdraw呼出し数 |
|---|---:|---:|---:|---:|
| 16px | 50,331,648 | 137,224 | 137,468 | 388（前半 389） |
| 128px | 50,331,648 | 1,609,781 | 1,606,457 | 375（前半 375） |
| 512px | 50,331,648 | 16,945,250 | 16,943,490 | 292（前半 292） |

100入力の送信後に描画完了を待つ測定では、修正前の鉛筆512pxは約1047ms、修正後は約582msだった。16px鉛筆は約580msから約66ms。ソフトウェアGPUの一括投入の測定であり、実機の接触遅延や競合との速度差ではない。太い鉛筆512pxの長い線は128入力の完了まで約717〜794msかかっており、この環境で240Hz表示を保証する結果にはなっていない。手ブレ補正の数式も変更していない。

ローカル検査：Brushの型・170件、Coreの型・8件、P0の29件、ラボの型/build、表示の9ゲート（追加：overlay不在と可変末尾の反転復元）、長い線のthroughputゲートがPASS。通常ブラウザ17項目もPASS。3分は180235ms、42648入力、36本、script error 0。frame間隔p95は16.8ms、最大50.0msで、常時60/120Hzの認証ではない。現行コードのリモートCIは公開後に別途確認する。今回の表示差は従来のround-marker輪郭1チャンネル44/255を維持し、それ以外は小さな丸め差。保存のCPU再生は一致した。

以下の前回結果は履歴として残す。最新の生成HTMLや今回の修正の検証結果として流用しない。

## 発見した問題

旧ラボはRAF内でCPU描画を分割し、各入力でプレビューを作り直していた。全部を計算できた回だけ表示するため、連続入力で未表示のまま作業をやり直し、最後に軌跡を追いかけていた。128pxのマウス線を80回移動する検査では、画面への描画間隔に約1735msの空白が生じた。[修正前の計測](evidence/latency-before.json)。以前の17項目のPASSはこの欠陥を見逃した。成功時だけ計った「受取→RAF」も停止の検出に使えていなかった。

## 修正した経路

- 接触・移動を受けた同じハンドラーで、安定した命令を一度だけ配信し、可変末尾を補正済みの最新位置まで描く。後続点やRAF、256命令ページの完成を待たない。
- WebGL2で7先端、dual形状、画像mask、document-space grain、筆圧由来の命令、4合成を表示する。安定した画素をGPUに残し、可変末尾を分離する。描画中にreadPixelsやGPU完了待ちは行わない。
- pointerrawupdateが届いたらその時点で描く。後から届くpointermoveの同じ入力を二重処理しない。未対応のブラウザはpointermoveを処理し、coalesced samplesを保持する。
- CPUへの代替経路も入力ハンドラー内で描く。タイルを共有し、変化したタイルだけを複写・合成・表示する。プレビューの完了待ちを作らない。
- ペンを離したら表示側をその場で確定し、次の線を受け付ける。厳密なFloat64計算はinline workerで順序通り処理する。命令は転送可能なpacked配列にし、geometry全体のコピーを描画の確定に挟まない。
- workerの古い結果がUndo/復元後や描画中の背景を上書きしないよう、epochとsequenceを検査する。GPUコンテキスト喪失時は確定済みの記録を復元し、描画中だった線だけ取り消す。
- 診断履歴の整列、JSON保存を描画中に実行しない。描画を中止した後も確定済みの線の保存を再開する。

記録形式・乱数・補正・Float64被覆と合成は維持した。publishStableの配信単位は変わっても、保存されたページ分割と全命令は変わらないことをテストした。

## 表示を直接検査するゲート

`npm run brush:latency`。[機械可読の結果](evidence/latency-check.json)と[実行ログ](evidence/latency-checks.txt)。ソフトウェアGPUのChromiumを使用する。次を別々に検査する。

| 検査 | 観察・条件 |
|---|---|
| 初点 | 接触ハンドラーから戻る前に実際の表示バッファを読み、接触位置のalphaを確認 |
| 最新の補正位置 | 補正OFF・中・強の各100入力直後に表示を読み、最新の補正位置でalphaを確認 |
| 連続入力 | 128px・80移動のnative mouseで、全移動が同じイベント内で描画を送信 |
| 保存計算中の次の線 | workerの結果が届く前に次の線を開始し、その初点も表示される |
| 確定時の見た目 | 56Preset、画像mask・画像grain・dual・全4合成をCPUの同じ命令と比較 |
| 保存の再現 | workerの確定画像と全記録のCPU再生がbyte単位で一致 |
| GPU喪失 | 確定済みの線を保持し、進行中の線だけ取消、CPU表示へ復帰 |
| CPU代替 | 初点・最新位置を同期描画し、表示alphaを厳密CPU結果と比較 |

native入力の測定値は「入力の受取→描画命令の送信」であり、ペン本体から発光までの遅延ではない。表示バッファの読み取り検査はGPUを同期するので、描画の性能計測と混同しない。

56Presetの表示比較では多くが完全一致し、少数が1/255程度の丸め差だった。丸マーカーでは輪郭の1チャンネルに最大44/255の差があった。GPUのfloat計算とCPUのdouble計算の境界差を残しており、表示と保存の全画素完全一致とは呼ばない。画像素材・合成の追加ケースは完全一致。CPU canvasの読み取りにはpremultiply往復によるRGB差（最大2/255）があるが、alphaは一致し、保存結果は完全一致する。

追加の通常ブラウザ検査17項目もPASS。3分の定期240Hz入力は180312ms、42478入力、36線、script error 0。描画送信p95は0.4ms、max 11.3ms。frame間隔p95は33.2ms、max 133.4msであり、このsoftware GPU環境が常時60/120Hzで表示できたという結果ではない。[3分の記録](evidence/browser-sustained.json)。送信時間とframe間隔を分けて評価する。

物理ペン、実GPUでのqueue滞留・pen-to-photon、高リフレッシュレート、4K文書、4096px先端、端末別の長時間性能は未確認。GLへの即時送信だけで画面までの低遅延を認証しない。製品のLayer/Selection/UIへの統合と、主要アプリとの同条件比較も未完了。

## 検証コードの実行費用

最初のリモートCIでは既存の全画素deep equalityが5秒の上限に当たった。全7先端・48条件・96×96の走査とbyte比較を維持し、配列の長さと最初の不一致を直接検査する形に変えた。timeoutは引き上げていない。Brushの169件は約8秒でPASSし、Coreの8件もPASS。[再実行ログ](evidence/latency-unit-checks.txt)。描画コードとオフラインHTMLはこの検証コード修正で変えていない。

## リモート検証

実装・検証コードのcommit `437b987f8dcab521e1f6238b52ee6fb84070e85b` で、[Brush Engine CI](https://github.com/totoro0419/illustro/actions/runs/36995862426)と[Core CI](https://github.com/totoro0419/illustro/actions/runs/36995862441)が成功した。型・169/8テスト、P0、build、benchmark、新しい表示検査7項目、3分を含む通常ブラウザ検査をリモートでも実行した。これは物理ペンや競合優越の認証ではない。その時点の追記は報告だけで、描画コードと生成HTMLを変えていない。HTMLのSHA-256は `0c00a6c51bc4b5366336069a6c67a1d90221f8f3245c3a60f35f733edbf81d4e`。
