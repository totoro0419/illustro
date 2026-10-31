# Illustro 第③段階 — 再監査と到達状態

## 判定：**NOT COMPLETE**

2026-10-31 JST現在。これは「第③段階の一部を修正・検証した」記録であり、設計完成の宣言ではない。本格的な製品実装は未着手。今回のブランチはPR #8のHEAD 050574f6436d9116775ccee2e069c439e1631182を元に作成し、未マージの積み上げPRを破壊していない。PR #8で検出した問題を既に閉鎖されたものとして扱わない。

## 1. 監査19件と修正結果

元件数 P0=0、P1=7、P2=11、P3=1。今回は19件の修正・残余条件を一件ずつ [台帳](AUDIT_REMEDIATION.md)／[機械可読版](AUDIT_REMEDIATION.json)へ整理。

- **モデル検証に到達**：AUD-001 Undo実行の入口、AUD-002 Layer正本のUndo、AUD-003 Sessionと作品Undo、AUD-008検索別名。Node試験に加えChromiumで主要導線を部分確認。
- **コード改訂だが端末/アクセシビリティが未検証**：AUD-004 Focus一時Panel、AUD-007 Session/Sheet遮蔽、AUD-009 focus復帰、AUD-011指重心、AUD-012 SVG再生成、AUD-017中間幅、AUD-018色面、AUD-019小画面タッチ。
- **設計契約を補強したが実際の正確性が未検証**：AUD-005 no-document Intent、AUD-006非破壊Transform後のErase/Smudge/Mask、AUD-014接地中の容量不足、AUD-015恒久Job失敗、AUD-016名前付き履歴。
- **依然不足**：AUD-010実画面入口ごとの手数/開始状態、AUD-013全入口のactionとDOM等価性（現在は代表サンプルのみ）。

**監査閉鎖件数は0（厳格判定）。残存はP0=0、P1=7、P2=11、P3=1。** 修正コードがあること、モデルで合格したこと、対象端末での再現消失を確認したことを混同しない。

潜在的な追加問題として、モデル正本導入後のLayer DOM再構成によるキーボード焦点消失リスクをコードレビューで検出。focus restorationを追加し、Chromiumのキー操作による回帰試験を増設した。修正前の実操作失敗は未採録なので、新規確定不具合数としては計上しない。

## 2. 247機能の整合性と限界

PR #5の現行スコープを変更しない：30分野247件、通常234・限定2・保留10・対象外1。既存台帳から作った [247件の設計対応表](FEATURE_CONTRACT_CROSSWALK_247.json) に、個別の目的、主入口、parameters、実行前提、責務、正本/派生、他機能、Undo、保存、取消、端末、受入試験**案**、監査指摘IDを全件連結。

ID・名称・分類・スコープのデータ照合が成功しても、**機能の実画像・仕様・横断相互作用が全件正しいと証明したことにはならない**。重要な欠落は Brush×Transform×Undo、Fill×Selection×Layer、Mask×Clip×Blend、Effect×Cache×GPU、Save×Undo×Recovery、ICC×Export、Reference×Layer×History、AI×NonDestructive×Undoの統合golden試験。

## 3. システム設計の到達点

[システム契約](SYSTEM_CONTRACTS.md) は12領域を責務・型・ライフサイクル・取消・障害復旧で結合。 no-documentの判別Intent unionを型案へ追加。 A→B→Undo→Save→A完了→Redo→Reload の保存時点Aと表示A+Bを分離した参照結果を定義。GPU投入仕事の中断不能性、同世代表示swap、SaveFence、入力writer途中OOM、恒久失敗時の依存枝切断、色/ICC/precisionの採用条件を追加。

[後段編集の意味案](TRANSFORM_POSTPAINT_SEMANTICS.md) はEraseを単純な透明overlayとは区別する。Smudge/AlphaLock/Maskも動作を固定したが、正式画素と保存後のgolden結果がないので**AUD-006の設計確定ではない**。

[比較・採否](TECHNICAL_DECISIONS.md) のCondition付き候補を、実性能の測定値と偽っていない。tile寸法、GPU仕事の分割量、cache予算、数値誤差・tail latency許容値は未確定。

## 4. UI/UXプロトタイプ

単体HTML： [qa/ui-prototype/index.html](../../qa/ui-prototype/index.html)。RendererはSVG/モデルによる試作であり正式の描画/保存ではない。Focus色・層、対象帯、Layer状態、検索、色面SV、Sessionと作品Undo、二指アンカー補正、スマホLayoutを改訂。代表8制作シナリオの充足/未実装を [UI_UX_REVIEW.md](UI_UX_REVIEW.md) に区別。

Chromium画面試験で元の監査反例の代表例は動作確認できたが、端末実機、画面読上げ、ペン+指、仮想キーボード/OSのバックジェスチャー、初見ユーザー評価は未実行。

## 5. 再現と検証の独立証拠

- GitHub Actions（旧成功ラン）：[41192206865](https://github.com/totoro0419/illustro/actions/runs/41192206865)。Node既存12件+新規10件、Chromium DOM10件、Node syntax、Python生成と単体HTML一致が成功。
- 追加のNode構造検査は247 ID/30分野/234+2+10+1件、19件auditのreverse graph・閉鎖偽装がないことを検査。
- TypeScriptはno-document/view/settings/documentのunionと不可能なフィールド混入をコンパイル検証。
- 新たなLayer focusのChromium回帰を1件追加。**最新実行の成功/失敗はGitHub Actionsの該当HEADで確認すること**。
- GitHub Pages公開ワークフローは [41192229090](https://github.com/totoro0419/illustro/actions/runs/41192229090) および以降の同類ランで、runner開始前に失敗。原因は**未確定**。新たな外部公開URLの動作確認はできていない。既存のPR #7公開サイトを更新後版の証拠として流用しない。

## 6. 判定ゲート

| 判定基準 | 結果 | 根拠 |
|---|---|---|
| A 247機能/正式スコープ保持 | 資料構造上は一致 | JSON間の1対1照合。全機能振舞いは未証明 |
| B システムの責務/型/不変条件 | 重要境界の案を改善 | GPU/Save/Failure/transformの完全モデル/画像結果未実証 |
| C 操作プロトタイプ | 代表導線で改善 | Chrome E2E、端末実機・初見UX未実施 |
| D 技術的成立性 | 未完了 | atomic handoff/非破壊消去/ICC/Saveの正式検証がない |
| E P0/P1閉鎖と再監査 | **未達** | P1=7件が閉鎖基準未達 |

第④段階への**無条件引渡し不可**。今回の成果を土台として残すが、最も重要なAUD-006の期待画素/Alphaモデル、CPU referenceの正式評価、正式/preview同世代表示、資源枯渇/保存保護、実端末でのナビ・編集を証拠付きで成立させる必要がある。

同じAIによる反例検査は第三者の完全独立監査ではない。この限界を明示し、完成を宣言しない。
