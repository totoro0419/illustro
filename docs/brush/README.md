# Illustro Brush Engine — verified continuation

2026-10-02。実装と自動検証を公開するレビュー候補。**実用完成・競合より優れた描き心地とは判定していません。**

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
npm run brush:browser
npm --prefix prototypes/p0-architecture run test
npm --prefix prototypes/p0-architecture run build
```

ブラウザ検証は既定で3分間の定期入力を実行する。任意の `BRUSH_CHROMIUM_PATH`、`BRUSH_BROWSER_PACKAGE_ROOT` は実行環境の指定用。`BRUSH_SUSTAINED_MS` を短くした結果は3分試験と呼ばない。スクリーンショットの日本語用 `BRUSH_INSPECTION_FONT_ROOT` は検査時だけ使い、出荷HTMLや計測には依存させない。

## 統合の入口

`@illustro/brush` は入力正規化、再構成、動的パラメータ、確定コマンド、CPU被覆・合成、Coreへのコミットを公開する。`BrushEngine` はストローク開始時のPresetとSeedを固定する。`sink` に配信した安定ページを `RasterQueue` で逐次処理し、可変末尾だけをプレビューする。`retain:false` なら呼び出し側がページとgeometryを保存する責任を持つ。

`commitStrokeAsync` は呼び出し側の `yieldWork`、描画予算、AbortSignalを使う。作業中にDocumentのheadが変わったら拒否し、公開を一つのCore transactionにまとめる。既存Undo/Redoのroot切替を維持する。

ラボは描画・比較のための独立UI。製品のLayer/Selection/Transform/Resource Library、GPU、OPFS保存を接続した完成アプリではない。大径ブラシのCPU描画、プレビュー用コピー、履歴保存のメモリ、実機入力品質は続く検証対象。
