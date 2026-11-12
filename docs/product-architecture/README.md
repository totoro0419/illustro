# 製品アーキテクチャ・247機能アクセス・UI基本設計

2026-10-31 JST。**設計レビュー版。製品実装の開始・ユーザーによるUI承認・製品性能達成を示さない。**

## レビューの入口

- [操作できるUIプロトタイプ](../../qa/ui-prototype/index.html)：単体HTML。外部依存・ログイン・作品送信なし。公開プレビューは [PREVIEW.md](PREVIEW.md) を参照。
- [画面と導線](UI_NAVIGATION.md)：旧レイアウト、12 Workspace、端末別配置、発見・戻る・Focus。
- [247機能対応表](FEATURE_ACCESS_MAP.md)／[詳細台帳JSON](FEATURE_ACCESS_LEDGER.json)：主・補助入口、状態、設定、確定取消、Undo、端末差、関連、研究、原仕様。
- [責務・データ・実行モデル](PRODUCT_ARCHITECTURE.md)／[境界の型案](contracts.d.ts)：UIからCommand、Transaction、Revision、Job、表示、保存への接続。
- [制作フローと状態遷移](FLOWS_AND_STATES.md)：ラフから書き出し、同時操作、失敗・取消。
- [検証計画・未決定](VALIDATION_AND_DECISIONS.md)：技術案の比較、製品性能未実証の扱い、UI評価。
- [原典・衝突記録](SOURCE_AND_CONFLICTS.md)／[保護対象ハッシュ](SOURCE_BASELINE.json)：読んだ版、旧UI実装、仕様の優先順位。
- [検査結果](VALIDATION_REPORT.md)／[機械検査結果](validation.json)：実行済と未実施を区別。

## 設計した範囲

30分野247 IDを保持。通常234、限定2、保留10、対象外1。現行対象236件には操作入口、残る11件には採否説明への入口を設ける。**保留を実行可能ボタンとして見せない**。COL-010のProof／変換出力とVEC-008に交差する基本文字は、既存の対象機能へ案内する。

操作可能な試作で確認するのは導線・配置・UIの状態意味。正式ブラシ、全247機能の処理本体、GPU/Worker、Native保存、ICC処理はここでは実装していない。試筆はSVG上の模擬線で、消しゴムも紙色の模擬線。人工待機はCPU/GPU負荷ではない。ページ再読込で模擬作品の編集は消える。

## 再生成・検査

リポジトリのルートから実行：

```sh
python tools/build_ui_prototype.py
python tools/validate_ui_design.py
node qa/ui-prototype/tests.cjs
```

生成元は原典JSON＋`tools/build_ui_routes.py`の入口・操作所有者の明示マッピング。台帳・表示用データ・単体HTMLを同じ入力から生成して差異を防ぐ。既存仕様・研究・Labは変更しない。

## 次の工程

ユーザーがプロトタイプでUIを確認 → 指摘を設計へ反映 → 技術検証の未閉鎖条件を対象ごとに確認 → 小さい製品スライスで実装。今回のPRを作ったことだけで本体全面実装へ進まない。
