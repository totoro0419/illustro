# Current validation report

2026-10-02。**レビュー可能な実装と自動検証はある。実用完成の判定は保留。** 過去チェックポイントの253件等は今回のテスト数に含めない。

品質基準は**主要なペイントアプリを総合的に上回ること**。旧Illustroは合格基準ではない。比較対象を最初の6本で閉じず、機能不足と同条件の実測・制作評価を残す。水彩物理はユーザー指定で不要。現在はその総合優位を立証していない。

保存時に別更新 `dd35eb8` を検出したため、その履歴・コードを保ち、描画計算再利用/末尾メモリ/入力検証/設定固定の修正を統合した。1344本の記録と56本の画像をdd35と照合し完全一致。これは回帰検査で、競合に対する品質合格ではない。[一致記録](evidence/integration-equivalence.json)。元の報告は[dd35時点](https://github.com/totoro0419/illustro/blob/dd35eb845c954399060a31651414070b7495b8fc/docs/brush/VALIDATION.md)に保存。別の再構成候補の証拠は現行のPASSに含めない。

## 最新：512px以上の表示待ち行列（f7bc767）

[構造・公式参照元・測定と限界](THICK_LATENCY.md)。確定用の全入力を保持しつつ、古いpreviewをGPU送信前に破棄する。連続入力中の表示は最大1 in-flight frame、1回あたり確定dab1個＋最新先端dab1個。releaseの確定仕事を一括GPU投入せず、過負荷時はworkerの厳密画像へ更新する。

- 現行ソースのBrush CI 37021120903、Core CI 37021120899はsuccess。170＋8件、P0 29件、型/build、表示9ゲート、13条件39照合、throughput、過負荷2条件、paced8条件、通常ブラウザ17項目・3分試験を通過。[CI証拠](evidence/ci-thick-v3.json)。
- ローカル512/1024px、120/240Hz、各3秒：最新先端の描画完了年齢p95約27〜35ms。後半への増加は最大23.1ms、test fence最大2、coreの表示フレーム最大1。全入力/保存再生一致。
- 過負荷で確定命令1,839/919個が残る間に最新補正位置のink画素を確認。releaseはGPU押印各1個、blocking query 0、全82入力を保存再生一致。
- 10秒鉛筆の再試験はp95=60.5/33.5msで継続的な年齢増加なし。一方、最初の512px試験はp95=161.7msで絶対遅延gateにFAIL。その記録を保持し、長時間の低遅延品質の安定性は未認証。
- 1024px読み込みが512pxへ丸められる既存UI不具合を修正。今回の検査は実効Preset.sizeをassertしている。

過負荷の暫定表示は確定後に変わり得る。物理pen-to-visible-tip、補正済み位置と生のペン位置の差、GPU/端末間の安定性、連続する短いストロークのrelease滞留、巨大文書と製品統合、競合との同条件評価は未認証。**今回の自動PASSを実用完成の判定にしない。** 以下の旧数値はその時点の記録として保持する。

## 描画遅延の修正（今回の判定）

以前のPASSは、軌跡が入力後に遅れて現れる欠陥を見逃した。連続入力で約1.7秒の描画停止を再現し、表示を入力ハンドラー内で行うGPU/差分CPU経路へ変更した。補正済みの最新位置を表示し、保存用の厳密計算はworkerへ移した。次の線をその計算待ちで止めない。

[変更・表示画素の検査・残る限界](LATENCY.md)。Brush 169件、Core 8件の型・テストがPASS。追加した7ゲートで、接触初点、補正OFF/中/強の最新位置、native移動全イベント、次の線、56Presetと画像・4合成、GPU喪失、CPU代替を確認した。GPU表示には輪郭の一部にfloat境界差があり、保存後の再現は完全一致。物理ペンでの実表示遅延や、主要アプリへの優越は未認証。

以下は以前のチェックポイントの監査・比較・数値を保持する記録。現行の表示遅延の判断には上の表示検査と最新のブラウザ証拠を使う。旧167件や旧CPUラボの性能値を新GPUの実測として流用しない。

## 1. 現行実装の監査

[AUDIT](AUDIT.md)に基点・継承・修正を記載。main `bdc7135`、PR #8 checkpoint `dad1be0` から別branchで継続し、Region/Connectivity/UIの他作業を混ぜていない。今回の判定対象は `packages/brush`、Core semantic adapter、`prototypes/brush-lab`。

## 2. 競合との比較

[公式情報比較](COMPETITORS.md)。10製品の公式資料を起点に、不足・調査の限界・追加比較対象を整理。競合アプリを同一端末で測定しておらず、描き心地・速度・安定性の優越はUNVERIFIED。

## 3. エンジン設計

[SPEC](SPEC.md)。共通mapping、7先端、document-space grain、seeded streams、immutable canonical record、実際のpage sink、切り分けたpreview、FIFO分割描画。Independent dual engines、wet physics、既存pixel blurは実装していない。

## 4. 初期ペンの範囲

50標準+6独自、13カテゴリ。名称を除いた有効設定fingerprintは全て異なる。全56本のfinite・再現性・実際のcoverageをテスト。用途カバレッジの候補であり、人の実描画から必要十分と判定した本数ではない。

## 5. 標準ペン

[全用途表](PRESETS.md)と[全定義](evidence/presets.json)。ラフ・線画・鉛筆・マーカー・筆/厚塗り・塗り・エア/影/光・肌/髪・背景・質感・装飾・ドット・消しゴムを含む。[アトラス](evidence/preset-atlas.html)は同じ筆圧付き曲線の確定描画。

## 6. 独自ペン

絹糸、束ね、芽吹き、影織り、彩層、星脈。それぞれ筆圧/先端/粒/flow/方向/色/距離curveの有効組合せが違う。用途と次に人が確認する点はPRESETSの表に記載。独自命名は市場で唯一の技法という意味ではない。

## 7. 自動検証

| 検証 | 結果 | 証拠と範囲 |
|---|---|---|
| Brush TypeScript / tests | PASS、167件 | [実行記録](evidence/integration-checks.txt)。Philox既知値/独立参照、入力、補正OFF、preview不変、ページ配信、全ペン、多形状、容量、画像、bounds、合成、Core adapter |
| Existing Core TypeScript / tests | PASS、8件 | 同integration記録。既存history/transaction regression |
| Existing P0 | PASS、29件、typecheck/build | [tests](evidence/p0-tests.txt)、[build](evidence/p0-build.txt) |
| ラボTypeScript / offline build | PASS | 現行ソースから単一HTMLを生成 |
| Browser workflow | PASS、17項目 | [raw report](evidence/browser-checks.json)。Chromium133.0.6943.0、ファイル直接実行、HTTP依存なし |
| 全ペンのfixture | PASS | line/curve/circle/S/zigzag/small-loop/long/dot、30/120/240Hz、size倍率0.15/1/4 |
| CPU replay一致 | PASS、試験corpus内 | JSON reopen、tile16/64/128/256、137pixel slices、独立pixel bounds走査 |
| Physical device / artist judgement | UNVERIFIED | CDP pen/touch/CPU throttleはソフトウェア試験 |

ブラウザ項目はmouse capture、Undo/Redo byte一致、CDP pressure/tilt、cancel、JSON/reload、corrupt import、search/no-result、invalid custom preset、comparison/toggles、8shape、held airbrush、320/390/720/1024/1440幅と200%文字、touch/DPR2.75/CPU throttle4、keyboard focus、3分入力、script/network errors。

## 8. 性能とメモリ

[Node raw distributions](evidence/node-performance.json) は `v24.19.0` / shared Linux execution hostでの計測。ブラウザ試験等と同じ実行環境であり、専用端末の最大性能ではない。

5回それぞれ100,000入力を受理。emit数=実際にsinkへ配信した数=12,210。32入力batch p95は 0.050, 0.038, 0.025, 0.023, 0.016ms。これは再構成/生成で、renderer・record JSON clone・物理全遅延を含まない。この入力試験のactive packed stagingは98,304bytes、履歴とrasterは別。

100入力の曲線、512×320 document、5回のwhole-stroke materialization p95と4096pixel/2ms候補slice：

| CPU case | Whole-stroke p95 ms | Slice p95 ms | Slice observed max ms |
|---|---:|---:|---:|
| 丸2px | 6.582 | 0.844 | 2.013 |
| 丸16px | 4.508 | 0.474 | 0.682 |
| 丸128px | 18.154 | 0.434 | 1.491 |
| 丸512px | 39.613 | 0.533 | 0.904 |
| ドライ筆 | 27.188 | 0.980 | 2.034 |
| 星スタンプ | 44.725 | 1.046 | 2.001 |
| 輪郭ペン | 5.020 | 0.746 | 5.489 |
| 束ね | 45.936 | 1.821 | 4.133 |

whole-stroke費用はframeごとの費用ではない。一方、2msの候補予算もmaxで超過している。OS/GC/clock check/preview cloneの影響があり、120Hzの安全な描画予算を満たしたとは判定しない。巨大brushの負荷とプレビュー全copyが主要な改善点。

forced-GC input workload heap before 7,231,336bytes / after 7,522,064bytes。observerの全benchmark GC max 4.156ms。object/sampleやqueue allocationsは残り、leak-free/GC-freeの証明ではない。

[3分raw telemetry](evidence/browser-sustained.json) はソフトウェアで240Hzを目標にした定期入力。release待ちも所要時間に含むため平均240Hz固定とは限らない。物理sample lossや熱を証明しない。処理/描画/RAF telemetryは各8192点までのring、releaseは全stroke。計測値は末尾ringの分布であり、3分全frameの保存ではない。今回の実行は180208ms、42,868入力、36stroke、記録error 0件。入力処理p95 0.10ms、描画callback p95 6.30ms、受取→次RAF p95 14.10ms、release p95 2.30ms。active raster peak 11,534,336bytes。保存frame ringには25ms超が37、50ms超が24あり、無停止・全frame予算内とは主張しない。[summary](evidence/integration-browser-summary.json)も保存。

合成静止ノイズはstrengthを上げるとRMSが減少した一方、小ループの原形との差も増えた。強い補正が常に良いとは言えず、artistが0〜1を用途で選ぶ。

## 9. 再現・レビュー用ファイル

[README](README.md)のコマンドで再実行。[オフラインラボ](../../prototypes/brush-lab/illustro-brush-lab.html)、[desktop](evidence/browser-desktop.png)、[mobile](evidence/browser-mobile.png)。日本語inspection fontは出荷物と計測から独立。mobile画像はinspection fontを加えた別の画面確認で撮り直し、文字と線を視認した。CI定義を追加したが、GitHub Actionsの実行結果はローカルPASSとは別に確認する。dd35のCIではvitestが解決できず失敗した。lockに一時workspaceへの相対リンクが入っていたため、通常のregistry依存として作り直し、クリーンインストール後の167件と8件、型・buildを検査した。生成HTMLは3分試験したファイルとbyte一致した。修正後の実装コミット `ad3258d28451613e0353947cf260da048914660a` では [Brush CI](https://github.com/totoro0419/illustro/actions/runs/36989102014) と [Core CI](https://github.com/totoro0419/illustro/actions/runs/36989102039) が成功。型・単体/統合・P0・build・benchmark・3分を含むブラウザ検査がリモートでも通った。これは競合への総合優位や実機認証ではない。

## 10. 完成条件と残作業

以下は要件を実装/証拠へ分解したレビュー用20項目。PASSは記載した試験範囲に限る。

| # | 条件 | 状態 / 次の証拠 |
|---:|---|---|
| 1 | current main/旧Brush監査 | PASS、基点と採否を記録 |
| 2 | 主要アプリを基準とする比較 | 公式仕様整理。対象の深掘りと実アプリ比較は未完了 |
| 3 | 共通pipeline | PASS、型と自動テスト |
| 4 | canonical入力/予測排除 | PASS、fixtures。物理複数端末は未検証 |
| 5 | 補正OFF/連続調整 | PASS、合成ジッタ/shape変化測定 |
| 6 | pressure/tilt等の欠損fallback | PASS、明示profile。機器profile自動確定は未完 |
| 7 | dynamics curves | PASS、共通mapping。wet/particleは範囲外 |
| 8 | tip/texture/image | PASS、7種と画像検証。資源library接続は未完 |
| 9 | opacityとflowの独立 | PASS、CPU試験 |
| 10 | size/spacing/angle/scatter/taper | PASS、corpus内 |
| 11 | deterministic canonical replay | PASS、CPU同一runtime/corpus。GPU/全browser一致未検証 |
| 12 | preview/commitの状態分離 | PASS、canonical不変とfinal一致。active preview品質は実機待ち |
| 13 | 安定ページ実配信とbounded tail | PASS、10万入力。受信側disk spill未実装 |
| 14 | 50標準+6signature | PASS、有効定義・再生。人の用途評価未検証 |
| 15 | 調整/比較ラボ | PASS、オフライン17項目。製品UI統合未完 |
| 16 | Core transaction / Undo / handoff | PASS、sync/async/stale/cancel tests。製品OPFS/crash recovery未検証 |
| 17 | PC/phone/tablet layoutと入力 | PASS、software browser profiles。実機Android/iPad未検証 |
| 18 | 3分/長stroke/CPU performance | MEASURED、汎用性能PASSではない |
| 19 | 実機ペン/熱/物理遅延/描き心地 | UNVERIFIED、ユーザー端末で実描画が必要 |
| 20 | mainを保ちreview可能なpublication | 別branch/Draft PRに保存。mergeなし。完成宣言なし |

次に行う作業：独立Dual/Multi-brush、既存pixel混色/Smudge/ぼかし、画像素材の視覚編集・整理、初期ペンの制作評価。Renderer側は実GPUのqueue/表示遅延、large-brushのprofile別budget、resource hash/packed persistence/OPFS/crash tests、Selection/Layer/UIとの統合。製品UXのtemporary eraser、hover cursor、touch navigationも未接続。

実機プロトコル：このラボで端末/OS/browser/penを記録し、圧力線・速描き・小ループ・逆方向・低筆圧・保持airbrush・大径/質感・3分描画を実行。RAW/補正の比較と本人の感想、観測sensor range、エラー、保存後のbyte replay、温度/OS状態を別に記録する。機器のinput-to-displayは外部撮影等で計測し、受取→次RAFと混同しない。合成イベントや旧Xiaomi記録を現在の物理PASSへ置換しない。
