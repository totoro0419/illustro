# Illustro Brush Engine — verified continuation

2026-10-02。実装と自動検証を公開するレビュー候補。**実用完成・競合より優れた描き心地とは判定していません。**

品質の合格基準は、主要なペイントアプリを総合的に上回ること。旧Illustroとの回帰一致や性能差は、不具合防止と実装検査の材料に限る。競合の描き心地・筆圧・表現・編集・初期ペン・速度・安定性を同条件で比較し、不足を解消するまで完成としない。水彩物理の実装自体はユーザー指定で不要。

保存時に別の更新 `dd35eb8` を検出したため、そのコードと履歴を保って修正を統合した。独立して再構成した比較候補は `brush/comparison-candidate-2026-10-02` に保存した。候補同士にはPreset定義や記録項目の違いがあり、同じversion表記だけで相互互換と判断しない。PR #8の正本はこのbranchの `packages/brush`。比較候補の102件・14ブラウザ件・性能値をPR #8の現行検証へ流用しない。

- [入力時描画の修正と検証](LATENCY.md)
- [実装監査](AUDIT.md)、[競合の公式仕様比較](COMPETITORS.md)、[実装仕様](SPEC.md)、[56本の用途と定義](PRESETS.md)、[検証結果・完成条件](VALIDATION.md)
- [オフライン描画ラボ](../../prototypes/brush-lab/illustro-brush-lab.html)：ファイルをダウンロードしブラウザで開く。
- [56本の確定描画アトラス](evidence/preset-atlas.html)：同じ筆圧曲線を使った用途確認用。人の描き心地評価ではない。

## 再実行

Node 24系、`npm ci` 後に以下を実行。

```sh
npm run brush:check
npm exec -- tsc -p prototypes/brush-lab/tsconfig.json --noEmit
npm run brush:lab
npm run brush:atlas
npm run brush:benchmark
npx playwright-core install chromium
npm run brush:latency
npm run brush:browser
npm --prefix prototypes/p0-architecture run test
npm --prefix prototypes/p0-architecture run build
```

ブラウザ検証は既定で3分間の定期入力を実行する。任意の `BRUSH_CHROMIUM_PATH`、`BRUSH_BROWSER_PACKAGE_ROOT` は実行環境の指定用。`BRUSH_SUSTAINED_MS` を短くした結果は3分試験と呼ばない。スクリーンショットの日本語用 `BRUSH_INSPECTION_FONT_ROOT` は検査時だけ使い、出荷HTMLや計測には依存させない。

## 統合の入口

`@illustro/brush` は入力正規化、再構成、動的パラメータ、確定コマンド、CPU被覆・合成、Coreへのコミットを公開する。`BrushEngine` はストローク開始時のPresetとSeedを固定する。`sink` に安定命令を配信する。入力ごとの `publishStable()` ならページ完成前にも配信でき、記録のページ分割は変えない。可変末尾を補正済みの最新位置までプレビューする。`retain:false` なら呼び出し側がページとgeometryを保存する責任を持つ。

`commitStrokeAsync` は呼び出し側の `yieldWork`、描画予算、AbortSignalを使う。作業中にDocumentのheadが変わったら拒否し、公開を一つのCore transactionにまとめる。既存Undo/Redoのroot切替を維持する。

ラボは入力時のGPU描画、差分CPU代替、厳密な確定計算用workerを接続した独立UI。製品のLayer/Selection/Transform/Resource Library、OPFS保存への統合は未完了。実GPUの表示遅延、巨大文書・大径ブラシ、履歴メモリ、実機の描き心地は続く検証対象。
