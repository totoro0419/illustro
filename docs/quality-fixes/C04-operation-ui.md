# C04 操作UI・設定 — 担当10件の再判定と修正記録

- 調査元: PR #73 `docs/quality-audit/C04.md`、固定起点 `dc28d2d0380352b8d07bcff570def7be8a3db2d4`
- 統合先: `quality/C03-C10-integration`（`main`へはマージしない）
- 担当: C04-001〜003、007〜009、011〜012、014〜015
- 方針: アートワークの内容と履歴・保存方式は変更しない。既存の設定形式は維持する。共有の `main.ts` は変更しない。

## 再判定・作業内容

| 問題ID | コード再判定 | 実装・判断 | 検証上の限界 |
|---|---|---|---|
| C04-001 | キーを離してから描画終了までの復帰待ち、フォーカス喪失処理が不十分になり得る | 一時ツールの元の選択を記録。描画終了後に復帰、別のキー操作や手動変更を優先。画面非表示でも解除 | 実機ペン・キーボード、長いストローク、重なった保持キーは未確認 |
| C04-002 | `invoke` は即時に成功を返し、クリック先の非同期作業完了を保証しない | `invokeAsync` と順次待機のマクロ処理を追加。例外・途中失敗を報告。クリックのみで非同期完了を確認できない操作は続きの手順を実行せず停止。末尾なら「実行指示を送信・完了は未確認」と正確に表示 | `main.ts` のUndo/Redo等が完了を返す接続は未対応。完全な完了保証は**未達** |
| C04-003 | レイヤー画面のフィルター・折畳で検索候補が欠落 | 絞り込みを受けない `#layerList` の全レイヤー行を検索対象に変更 | 実機でレイヤー選択が反映されるかは未検証 |
| C04-007 | 6枠満杯で最終枠を無確認で置換 | 自動上書きを廃止。入替対象の枠をユーザーが選択する操作へ変更 | ペン・タッチでの操作性は未確認 |
| C04-008 | 保存失敗後に成功表示・メモリ上の上書きが可能 | 保存に成功した場合にのみWorkspace一覧を更新。削除・取り込みも同じ契約に統一 | localStorageの書込み拒否を実機で再現していない |
| C04-009 | キー設定の保存失敗後に成功表示・メモリ上の更新が可能 | 登録・削除・全解除・取り込みの各操作で保存失敗を伝え、変更前の設定を維持 | 書込み拒否の実機再現は未確認 |
| C04-011 | Quickの表示後、選択までに追加タップが必要 | Quickボタンから指・ペンを離さず枠まで滑らせて選ぶ経路を追加。既存タップ操作も維持 | Procreateの放射状配置そのものは未導入。端末での操作速度測定は未実施 |
| C04-012 | Workspaceとキー設定の移行操作が別々 | 個別形式を維持したまま、両設定を1ファイルにまとめて出力・読み込み。形式チェック、上書き確認、書込み失敗時の復旧処理を実装。再読み込みはユーザーが作品保存後に行う | 復旧失敗の極端な環境、端末間互換の実機検証は未実施 |
| C04-014 | FocusでQuickパネル自体がCSSで消える | Focus中も専用Quickボタンを表示し、必要時だけメニューを開けるように修正 | 実機表示とキャンバスへの干渉は未検証 |
| C04-015 | 公式Aurora配色とCSSとの差異は仮説 | 承認記録の青→青紫→紫→小さな紫桃の4色 `#5EA8FF / #708FFF / #8B7CFF / #C681DE` と `aurora.css` の変数が一致。配色変更は行わない | ブラウザ計算後の全CSS色・実機表示は未測定 |

## 実装対象

- `apps/editor/src/ui/commandPalette.ts`
- `apps/editor/src/ui/shortcutSettings.ts`
- `apps/editor/src/ui/simpleMacros.ts`
- `apps/editor/src/ui/workspaceProfiles.ts`
- `apps/editor/src/ui/focusMode.ts`
- `apps/editor/src/ui/c04.css`
- `apps/editor/src/ui/c04Quality.test.ts`（追加）
- `.github/workflows/c04-quality.yml`（この作業専用の型検査・ビルド・回帰テスト）
- この記録ファイル

## 統合担当への依頼（共有ファイルを変更しない）

**C04-002**: 現状のDOMクリック経由のコマンドは、クリックした後に完了する非同期描画・履歴・保存の結果を返さない。 `apps/editor/src/main.ts` 側で、Undo/Redoなどの既存処理に接続する「完了を待てるコマンド実行」方式を設計し、C04の `CommandService.invokeAsync` へ接続すること。完了通知がない操作を成功確定と表示してはならない。データ・履歴の整合を優先する。

## 検証・承認の扱い

- 既存機能の動作条件はコードとPR #73の記録で再照合した。
- 自動回帰は `apps/editor/src/ui/c04Quality.test.ts` に登録し、GitHub Actions `C04 Operation UI Quality` で型検査・編集アプリのビルドと併せて確認する。
- 初回実装コミット `a660e484e788eae3189eb9fe5d7ee0c31a1ba5ae` のGitHub Actionsで `C04 Operation UI Quality` [43889839217](https://github.com/totoro0419/illustro/actions/runs/43889839217) と `C03-C10 quality integration checks` [43889839213](https://github.com/totoro0419/illustro/actions/runs/43889839213) が成功（型検査、アプリビルド、C04テスト、コア・描画・全Editorテスト）。
- マクロ安全化とテスト更新後のコードコミット `3d14a29b1cc57faf600b6e662c0dbc2b6a727465` でもC04専用CI [43890316184](https://github.com/totoro0419/illustro/actions/runs/43890316184) が成功（型検査・アプリビルド・C04テスト）。それ以降の変更は記録文書のみ。
- **現行コードの統合CIが成功**。文書更新時のコミット `4b04bc265040de0dcb0c171c51d78015668643e4` で [C03-C10 quality integration checks #43890743425](https://github.com/totoro0419/illustro/actions/runs/43890743425) と [C04 Operation UI Quality #43890743793](https://github.com/totoro0419/illustro/actions/runs/43890743793) の両方が成功。旧コミット `a411e626` の一時的な失敗 [#43890289452](https://github.com/totoro0419/illustro/actions/runs/43890289452) は、修正後のマクロ仕様に対して更新前のテストが残っていたことによるもので、後続のテスト更新と再実行で解消。
- **Android端末での実操作は未検証のため「全件完全解決」「実機合格」は主張しない。**
- 必須実機検査: 6枠満杯→入替先選択、FocusでQuick表示、タッチドラッグで一回選択、レイヤー絞り込み中検索、キー離上げを描画中/描画後/画面切替時に実施、localStorage拒否時に設定破損しないこと、統合インポート、Undoを含む連続マクロ。
- ストロークや作品保存の本体処理は変更していないが、操作経由で呼ぶため、描画・履歴・保存の回帰検査は統合時に必須。

## 競合公式資料

- Procreate QuickMenu: https://help.procreate.com/jp/procreate/handbook/interface-gestures/quickmenu （6つのカスタマイズ枠、呼出し後のタッチドラッグ選択）。Illustroには既存の長方形6枠を維持したままジェスチャのみ選択採用した。
- Aurora承認記録: `docs/ui/UI_THEME_CANDIDATES_2026-09-30.md` 第10〜11節。既存デザインを独断で変更しない。
