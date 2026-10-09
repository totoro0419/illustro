# 今の状態 — 2026-10-05

**Core Drawing Sliceの本番実装を開始できる基準を整えた。アプリ本体の一連の操作は未完成。** 検証の最終結果は [VERIFICATION](production-prep/VERIFICATION.md) を参照する。

- 正本入口: [IMPLEMENTATION_BASELINE](IMPLEMENTATION_BASELINE.md)。各文書の古い停止/受入待ち宣言より優先。
- source: mainからの `integration/production-prep-2026-10-05`。既存branchは保持し、旧Lineart ADRは除外。
- Brush: `4a7b488`と一致する採用試作を固定。現在の実機評価はユーザー申告、自動検査は別の根拠。
- UI: PC/Tabletの承認済み構成維持。Compactの開始用骨格を固定。最終見た目・実ペン/手のひら操作・支援技術は未確認。
- Lineart: Raster Labを同じbytesで保存。領域構造の採用予定試作であり製品統合済みではない。
- 最小画面: `apps/editor`に文書初期化、Canvas、Foundation adapter、Layer/History/Save/Recovery接続口。新規Canvas・基準Brush・Eraserの接続確認。正式文書へのstroke確定・Layer追加・文書全体の取消・Save/Recovery/Exportは未接続として無効表示。
- 次の最初の実装: **既存CoreのV2整合と、一筆を選択Layerへ正式確定する経路**。その後Layer/Undo/Redo/Save/再読込復元/PNGを一つの経路として完成させる。

本番開始を妨げない残件: 各機能の実機受入、Regionの本番精度/訂正、Compact最終表現、永続ファイルの物理符号化。前者と異なり、V2のID/保存保護/画素形式の整合は最初の実装工程に必須で、省略して旧schemaを製品固定しない。
