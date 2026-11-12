> Classification: EXPERIMENTAL / historical research and validation. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Current validation report

2026-10-02。**レビュー可能な実装と自動検証はある。実用完成の判定は保留。** 過去チェックポイントの253件等は今回のテスト数に含めない。

## 1. 現行実装の監査

[AUDIT](AUDIT.md)に基点・継承・修正を記載。main `bdc7135`、PR #8 checkpoint `dad1be0` から別branchで継続し、Region/Connectivity/UIの他作業を混ぜていない。今回の判定対象は `packages/brush`、Core semantic adapter、`prototypes/brush-lab`。

## 2. 競合との比較

[公式情報比較](COMPETITORS.md)。6製品の基本parameter群との対応を整理。競合アプリを同一端末で測定しておらず、描き心地・速度・安定性の優越はUNVERIFIED。

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
| Brush TypeScript / tests | PASS、163件 | [実行記録](evidence/automated-checks.txt)。Philox既知値/独立参照、入力、補正OFF、preview不変、ページ配信、全ペン、多形状、容量、画像、bounds、合成、Core adapter |
| Existing Core TypeScript / tests | PASS、8件 | 同記録。既存history/transaction regression |
| Existing P0 | PASS、29件、typecheck/build | [tests](evidence/p0-tests.txt)、[build](evidence/p0-build.txt) |
| ラボTypeScript / offline build | PASS | 現行ソースから単一HTMLを生成 |
| Browser workflow | PASS、17項目 | [raw report](evidence/browser-checks.json)。Chromium133.0.6943.0、ファイル直接実行、HTTP依存なし |
| 全ペンのfixture | PASS | line/curve/circle/S/zigzag/small-loop/long/dot、30/120/240Hz、size倍率0.15/1/4 |
| CPU replay一致 | PASS、試験corpus内 | JSON reopen、tile16/64/128/256、137pixel slices、独立pixel bounds走査 |
| Physical device / artist judgement | UNVERIFIED | CDP pen/touch/CPU throttleはソフトウェア試験 |

ブラウザ項目はmouse capture、Undo/Redo byte一致、CDP pressure/tilt、cancel、JSON/reload、corrupt import、search/no-result、invalid custom preset、comparison/toggles、8shape、held airbrush、320/390/720/1024/1440幅と200%文字、touch/DPR2.75/CPU throttle4、keyboard focus、3分入力、script/network errors。

## 8. 性能とメモリ

[Node raw distributions](evidence/node-performance.json) は `v24.19.0` / shared Linux execution hostでの計測。ブラウザ試験等と同じ実行環境であり、専用端末の最大性能ではない。

5回それぞれ100,000入力を受理。emit数=実際にsinkへ配信した数=12,210。32入力batch p95は 0.076, 0.042, 0.041, 0.027, 0.020ms。これは再構成/生成で、renderer・record JSON clone・物理全遅延を含まない。active packed stagingは1,081,344bytes、履歴とrasterは別。

100入力の曲線、512×320 document、5回のwhole-stroke materialization p95と4096pixel/2ms候補slice：

| CPU case | Whole-stroke p95 ms | Slice p95 ms | Slice observed max ms |
|---|---:|---:|---:|
| 丸2px | 13.80 | 1.24 | 6.66 |
| 丸16px | 9.90 | 0.75 | 3.22 |
| 丸128px | 32.18 | 0.65 | 1.37 |
| 丸512px | 74.31 | 0.77 | 5.62 |
| ドライ筆 | 32.42 | 1.43 | 3.22 |
| 星スタンプ | 59.94 | 1.46 | 4.31 |
| 輪郭ペン | 8.68 | 1.40 | 2.30 |
| 束ね | 57.03 | 2.03 | 2.18 |

whole-stroke費用はframeごとの費用ではない。一方、2msの候補予算もmaxで超過している。OS/GC/clock check/preview cloneの影響があり、120Hzの安全な描画予算を満たしたとは判定しない。巨大brushの負荷とプレビュー全copyが主要な改善点。

forced-GC input workload heap before 7,227,544bytes / after 7,504,512bytes。observerの全benchmark GC max 5.90ms。object/sampleやqueue allocationsは残り、leak-free/GC-freeの証明ではない。

[3分raw telemetry](evidence/browser-sustained.json) はソフトウェアで240Hzを目標にした定期入力。release待ちも所要時間に含むため平均240Hz固定とは限らない。物理sample lossや熱を証明しない。処理/描画/RAF telemetryは各8192点までのring、releaseは全stroke。計測値は末尾ringの分布であり、3分全frameの保存ではない。今回の実行は180227ms、42,873入力、36stroke、記録error 0件。入力処理p95 0.10ms、描画callback p95 7.10ms、受取→次RAF p95 13.50ms、release p95 0.50ms。active raster peak 11,534,336bytes。保存frame ringには25ms超が31、50ms超が24あり、無停止・全frame予算内とは主張しない。[summary](evidence/browser-summary.json)も保存。

合成静止ノイズはstrengthを上げるとRMSが減少した一方、小ループの原形との差も増えた。強い補正が常に良いとは言えず、artistが0〜1を用途で選ぶ。

## 9. 再現・レビュー用ファイル

[README](README.md)のコマンドで再実行。[オフラインラボ](../../prototypes/brush-lab/illustro-brush-lab.html)、[desktop](evidence/browser-desktop.png)、[mobile](evidence/browser-mobile.png)。日本語inspection fontは出荷物と計測から独立。CI定義を追加したが、GitHub Actionsの実行結果はローカルPASSとは別に確認する。

## 10. 完成条件と残作業

以下は要件を実装/証拠へ分解したレビュー用20項目。PASSは記載した試験範囲に限る。

| # | 条件 | 状態 / 次の証拠 |
|---:|---|---|
| 1 | current main/旧Brush監査 | PASS、基点と採否を記録 |
| 2 | 6競合公式仕様 | PASS、公式情報。実アプリ比較は未検証 |
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

次に行う作業：tile差分previewとworker/GPU評価、large-brushのprofile別budget、resource hash/packed persistence/OPFS/crash tests、Selection/Layer/UIとの統合。製品UXのtemporary eraser、hover cursor、touch navigationも未接続。

実機プロトコル：このラボで端末/OS/browser/penを記録し、圧力線・速描き・小ループ・逆方向・低筆圧・保持airbrush・大径/質感・3分描画を実行。RAW/補正の比較と本人の感想、観測sensor range、エラー、保存後のbyte replay、温度/OS状態を別に記録する。機器のinput-to-displayは外部撮影等で計測し、受取→次RAFと混同しない。合成イベントや旧Xiaomi記録を現在の物理PASSへ置換しない。
