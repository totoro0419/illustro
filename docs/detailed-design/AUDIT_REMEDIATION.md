# 第③段階 監査19件の修正・検証台帳

**完了扱い禁止：19件とも元監査の閉鎖条件を満たす証跡が揃っていない。** 未解決 P0 0 / P1 7 / P2 11 / P3 1。P1のモデル修正を実行したことと、P1問題の全面閉鎖は別。

元監査：[findings.md](../audits/findings.md)。詳細の指摘/原因/影響/変更/残作業/閉鎖基準は [AUDIT_REMEDIATION.json](AUDIT_REMEDIATION.json)。

| ID | 重要度 | 技術・UI上の対応段階 | 残る検証 |
|---|---|---|---|
| AUD-001 | P1 | model/action-level verified | 実DOM上の全入口・キー・Quickの等価性未実行 |
| AUD-002 | P1 | model-level verified | DOM実操作・Native永続・各層交錯は未検証 |
| AUD-003 | P1 | model-level verified | 焦点/対象と複数領域のUX実機未検証 |
| AUD-004 | P1 | code-only | PC/Tablet/Phoneでの目視・クリック・遮蔽検査未実行 |
| AUD-005 | P1 | contract-only | TypeScript型コンパイルと実command adapterの検証未実行 |
| AUD-006 | P1 | candidate-only | 正式ゴールデン画像・色精度・実機比較がなく意味契約未確定 |
| AUD-007 | P1 | code-only | 320/390/740px実browser hit-test・仮想キーボード未検証 |
| AUD-008 | P2 | model-level verified | 初見発見率や一般同義語コーパスは未測定 |
| AUD-009 | P2 | code-only | 実DOM focus順・閉じた入口での復帰未検証 |
| AUD-010 | P2 | not-addressed | 実UI経路・可視性・起点ごとの手数計測は未実施 |
| AUD-011 | P2 | code-only | browser/touchで中心・端・反転を再投影検証していない |
| AUD-012 | P2 | code-only | 実DOM置換計数/長履歴の経過時間を測定していない |
| AUD-013 | P2 | partial-test | 修正前失敗のCI実証とDOM操作・全entry比較が未実施 |
| AUD-014 | P2 | contract-only | 容量枯渇/入力救出のテスト・閾値未検証 |
| AUD-015 | P2 | contract-only | Job DAG・回復・永続保存のモデル/実機検証未実施 |
| AUD-016 | P2 | contract-only | 試筆/資料/Sessionを交互編集する操作実証なし |
| AUD-017 | P2 | code-only | 760/800/960/1180pxのCanvas測定・操作時間未検証 |
| AUD-018 | P2 | code-only | 実タッチ/ペン・HSV全色・アクセシビリティ操作の検証なし |
| AUD-019 | P3 | code-only | 44px推奨の適用例外と実指誤タップ、文字拡大検査未実施 |

## 証拠の区別

- **実行済**：GitHub Actionsの既存12＋追加10モデル検査、Node構文、単体HTML再生成一致（実行時SHAはActionsに記録）。
- **コード修正のみ**：UIクリック/焦点/遮蔽、色面、gesture。Node構文検査はブラウザーでの機能正常を証明しない。
- **設計契約のみ**：no-document Intent、入力容量/障害復旧、後段操作の意味。型/参照演算/実装連携検証は未完了。
- **未実行**：本格的なペン+指、WebGPU device loss、Native/OPFS耐久、ICC精度、長時間、高多層・画素一致、初見ユーザー試験。

閉鎖条件の緩和は行わない。修正後の新たな問題発生も未監査であり、「新規指摘0」は確定していない。
