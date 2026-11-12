# Illustro — 開発マネージャー管理入口（C01〜C17）

**2026-11-12作成。** 今後の管理記録はGitHubに残し、チャットの記憶だけに依存しない。

## 最初に読む

1. [MANAGER_OPERATIONS.md](MANAGER_OPERATIONS.md) — 全体の現在地、C01〜C17の進捗、管理上の約束、開始手順。
2. [FEATURE_STATUS.json](FEATURE_STATUS.json) — 247機能の固有ID・採否・主担当チャンク・個別検証状態（現時点の未照合をPASSと誤記しない）。
3. [C03_SCOPE_AND_HANDOFF.md](C03_SCOPE_AND_HANDOFF.md) — **次の対象C03の24機能、旧M11との差、実装開始前に確認すること**。
4. [C01_C17_ROADMAP.md](../roadmap/C01_C17_ROADMAP.md) — チャンクの分野・M01〜M10との対応。
5. [DESIGN_AUTHORITY.md](../DESIGN_AUTHORITY.md) — 仕様の正式な入口。
6. [IMPLEMENTATION_CHECKLIST.md](../IMPLEMENTATION_CHECKLIST.md) — **旧M01〜M10の実機合格記録（歴史資料として保持）**。

## 確認済みの最重要事項

- 正式Repository `totoro0419/illustro`、製品統合 `integration/production-prep-2026-10-05`、調査時HEAD `47c560078ba436d07219d35a6b22c9c9241cfb82`。
- アーカイブ設計のPR #68は統合済み、#69は旧M11準備ブランチへ同期済み。
- M01〜M10はユーザー合格済み。新しいC01/C02全IDの合格とは別。旧M11 PR #67はDraft・製品コード未変更。
- **C03は24件の管理上の対象を確定、製品の実装・自動検証・実機承認は未実施。**
- アーカイブの製品仕様247件＝対象236（通常234＋限定2）、保留10、対象外1。現行管理表は原典のIDを維持し重複計上しない。
- C04〜C16の具体的なID配分は一部**暫定**。今後、設計の該当部分とコードを照合して確定させる。

## 新しいチャットへの引継ぎ

「このフォルダーの3資料と`docs/DESIGN_AUTHORITY.md`を読み、GitHubのintegration/PRの最新状態に照らして更新する。ユーザー合格なしに機能やチャンクを合格へ進めず、Workへの指示書と独立検証を担い、製品コードの修正はWorkに任せる。」

**この管理専用PRの統合前は、資料は管理ブランチ上だけに存在する。** 統合後の最新コミットを次のWorkの開始位置として再確認すること。
