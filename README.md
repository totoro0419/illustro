# Illustro

一枚絵の制作体験を主要ペイントアプリより良くする。優先順位は直感的な操作、使いやすさ・軽さ・追従、多機能。

## 現在の開始地点

本番準備ブランチ `integration/production-prep-2026-10-05`。mainから有効な成果だけを移植し、合格済みBrush Foundationを固定。mainは変更していない。

- [現在の状態](docs/STATUS.md)
- [唯一の本番実装基準](docs/IMPLEMENTATION_BASELINE.md)
- [正本と試作の一覧](docs/CANONICAL_INDEX.md)
- [実際の検査結果と未確認](docs/production-prep/VERIFICATION.md)
- [PR/branchの扱い](docs/production-prep/PR_DISPOSITION.md)

## 開発

Node 24、`npm ci`。

```sh
npm run brush:build
npm run editor:dev
```

`apps/editor`は既存Coreと固定Foundationの接続骨格。新規キャンバス・Brush・Eraserの描画確認ができる。文書全体のLayer操作、History、Save/Recovery/Exportは未接続のため無効表示する。これをCore Drawing Slice完成とは扱わない。

```sh
npm run core:check
npm run brush:typecheck
npm run brush:test
npm run brush:regression
npm run editor:build
npm run prep:check
```

正本HTMLは `prototypes/brush-rt/dist/illustro-brush-rt.html`。Regionの採用試作は `experiments/raster-region-lab-v01`。旧設計branchを一括mergeせず本番基準へ移植する。
