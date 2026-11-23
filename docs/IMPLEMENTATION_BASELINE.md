# Illustro｜現行の実装と検査の基準（2026-11-23）

最初に[正式設計の優先関係](DESIGN_AUTHORITY.md)と[実機検査計画](device-audit/00-TEST-PLAN.md)を参照してください。

- アプリ本体の現行実装対象は[Draft PR #110](https://github.com/totoro0419/illustro/pull/110)（`implementation/round2-seven-groups`）。`main`と基準ブランチ`quality/C03-C10-integration`を無断更新しない。
- 機能計画と実装の照合は[ROUND2-IMPLEMENTATION-STATUS.md](roadmap/ROUND2-IMPLEMENTATION-STATUS.md)。**R2実装143＋既存保護91＝234機能**を今回の実機検査対象とする。
- R2実装ブランチ`f4e8e796`の実際のコードは公開元`c0afe578`と同じ。差分は当時の検査結果文書2件のみ（2026-11-23確認）。公開URLが起動するか、実際の端末での確認は別。
- 検査時はコード・データ・公開設定を変更しない。使いづらさ・不具合を記録し、後の修正工程で影響範囲だけ再検査する。
- 保存データ・既存作品・M01〜M10の受入済み成果・QAページ・履歴を保護する。Gitの旧ロードマップ削除は過去の承認を撤回することを意味しない。
- 旧C01〜C17の開発順序や「次はC03」等の古い進捗記述を、現在の実機合否・次の実装指示に使用しない。
- アプリが動くこと、操作しやすいこと、応答が軽いこと、保存・再読込が正しいことを区別して確認する。

過去の実装基準は[移行前の保存版](migration/before-archive-2026-11-12/IMPLEMENTATION_BASELINE.md)、従来の受入結果は[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)を参照。
