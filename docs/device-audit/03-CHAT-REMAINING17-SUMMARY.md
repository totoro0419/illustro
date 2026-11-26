# R2 チャット検査17件 — 実行結果と再開記録

2026-11-26。第4回修正版（PR #118）を基準とし、検査専用ブランチで実行。本体変更・公開版上書き・main統合なし。既存検査記録 #113 は変更していない。

- 判定済み: 1/17（使える1、使いづらい0、使えない0）
- 未判定: 16（部分操作成功・測定不一致・検査側エラーを含む）
- 2026-11-26実行: [第3回](https://github.com/totoro0419/illustro/actions/runs/45828801051)／[第4回](https://github.com/totoro0419/illustro/actions/runs/45830785700)
- 2回ともビルド・検査実行・成果物アップロード・GitHubへの保存は実施済み。総合Actions判定は未完了条件により failure。
- 第4回のGST-005は13条件すべて合格。物理キーは実機確認を別管理。
- AUT-004は8条件すべて合格（模擬失敗、実際の出力ファイル、原画像の全画素比較）。上書き確認が未検査。
- COL-008は警告画素表示に成功。切替前後の画像の1,907画素に差があり、原因未確定。保存画像をPython/Pillowで独立計測（ピンク594画素ずつ）。
- FX-007はブラシ検索14件を確認し、修復・パッチ・クローンは各0件。検索の入口に問題あり。機能の有無・本体動作は未判定。
- 各結果の対象コミット・証拠はCSV/JSONの各行で確認可能。過去実行の証拠も runs 以下に保管。
- 実機追加確認: 物理キーボード・OS固有の保存先操作・実端末の表示色/印刷色・主観的操作感。ヘッドレス検査環境の日本語フォント不足による文字表示はアプリの欠陥と判定しない。

| ID | 判定 | 実操作検査 | 再開位置 |
|---|---|---|---|
| SAV-006 | 未判定 | 専用ブラウザー検査未実行 | 保存検査の起動・失敗原因を確認してから容量不足、権限、競合、外部変更を個別再現。 |
| SAV-007 | 未判定 | PASS | offline layers/selection/transform/reference/history/filter/macro / ERROR / Implemented subchecks passed, see manifest for coverage gaps |
| REF-006 | 未判定 | ERROR | 参考資料パネル（referenceBox）を明示的に開く操作に修正。埋め込み・外部参照を個別検査。 |
| GST-005 | 使える | PASS | 実物のキーボードの配列・OS固有の入力挙動のみ実機追加確認。ブラウザー内13条件は合格。 |
| IO-006 | 未判定 | PASS | independent output color/alpha comparison / AVIF/EXR input and real HEIC input/unsupported notice / ERROR / Implemented subchecks passed, see manifest for coverage gaps |
| FIL-005 | 未判定 | PASS | closed-region-only and leak candidate / Undo, selection/mask/alpha protection / ERROR / Implemented subchecks passed, see manifest for coverage gaps |
| LIN-007 | 未判定 | PASS | blank invalid/normal drawing and confirmed fixture now exercised; source modification, exclusion, reopen and invalid fill request still pending / ERROR / Implemented subchecks passed, see manifest for coverage gaps |
| TRN-005 | 未判定 | ERROR | レイヤーの操作メニュー（layerSettingsTrigger）を開く手順を追加して再検査。 |
| VEC-004 | 未判定 | ERROR | ベクター編集用の正規コマンドから開き、全画素・元形状・Undoを検査。 |
| LAY-005 | 未判定 | ERROR | レイヤーの操作メニュー（layerSettingsTrigger）を開き、マスク項目を展開する。 |
| COL-008 | 未判定 | FAIL | 仕上がり線を除外した条件で再測定し、元の色と出力色の比較、警告の解除、原画・PNG出力・採色の一致まで確認。 |
| FX-007 | 未判定 | ERROR | 対象機能が実装済みなら各名称・別名から検索できるようにする。機能一覧の入口と実装有無を調べ、実操作検査へ進む。 |
| HIS-005 | 未判定 | PASS | snapshot/copy-region comparison, undo and invalid layer mapping / ERROR / Implemented subchecks passed, see manifest for coverage gaps |
| AUT-002 | 未判定 | PASS | missing target and parameter types / ERROR / Implemented subchecks passed, see manifest for coverage gaps |
| AUT-003 | 未判定 | PASS | cancel, preview and undo attempted; controlled mid-sequence failure and later edit preservation still pending / ERROR / Implemented subchecks passed, see manifest for coverage gaps |
| AUT-004 | 未判定 | PASS | 同名ファイルの上書き確認を追加。OSの実フォルダー権限・上書きは実機確認と区別する。 |
| AUT-005 | 未判定 | PASS | export, asset registration, search attempted; clean-context import, Quick/key/asset invocation and unsupported command still pending / ERROR / Implemented subchecks passed, see manifest for coverage gaps |

詳細: [CSV](03-CHAT-REMAINING17.csv) / [JSON](03-chat-evidence/actual-results.json)。未判定を合格扱いしない。
