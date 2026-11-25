# Illustro R2｜第2回修正 再開記録（2026-11-25）

- 対象: D-016〜D-021のみ。D-022〜024は別管理。
- HEAD（最新検証対象のコードコミット）: `bc88a9ca82efd0f349b5d1f8d0a97fe5634ddfa8`。この記録だけの後続コミットはビルド内容を変更しない。
- ブランチ: `fix/r2-audit-round2-2026-11-25`。基準: `fix/r2-audit-round1-2026-11-23`（分岐時54f43f0116c0fcf2818ba83215223280bd8a22af）。
- 仕様: ROUND2-DECISIONS.md。Draft PR: https://github.com/totoro0419/illustro/pull/115 （統合禁止）。
- 最新コードのCI: https://github.com/totoro0419/illustro/actions/runs/45598127705 全成功。
- 公開前6件のブラウザー操作: https://github.com/totoro0419/illustro/actions/runs/45598127689 全6件成功。
- 公開先: https://totoro0419.github.io/illustro/r2-audit-fixes-round2/ 。gh-pagesに専用フォルダとrelease.jsonを配置済み。release.jsonのsourceCommitは上記コードSHA。公開URLの応答・SHA確認成功。
- gh-pagesの旧フォルダSHAは公開前後一致: r2-preview=7f7e489af68a970ad78c000c5bfbe523d2738085、r2-audit-fixes=e52fc9100106ac3ee56649864ac324d07d1f9366。Vercel検査版への操作なし。本番検査記録・既存ブランチ・PRには書込なし。

| ID | 状態 | 証拠 |
|---|---|---|
| D-016 | 公開版の実操作合格 | 履歴メニューと検索、実際の記録保存・取消・再生・画素とUndo/Redo |
| D-017 | 公開版の実操作合格 | 描画直後の2点を検出、上限48画素（既定6は4pxブラシ点には不足）、片方除去、Undo/Redo |
| D-018 | 公開版の実操作合格 | 文字・ボタン拡大、288/344/440pxの設定欄、標準2列復帰 |
| D-019 | 公開版の実操作合格 | 日英選択肢・色相環の読み上げ名往復 |
| D-020 | 公開版の実操作合格 | hold割当表示、実際の移動、解放・手動道具選択維持 |
| D-021 | 公開版の実操作合格 | 実ファイル保存→新規ブラウザー環境で読込→画素・Undo/Redo→再保存→再読込。95,188,688バイトの合成作品の区画/変形履歴検査も合格 |

## 重要な変更・保護
- worker保存と通常保存で必須区画生成を共有。通常の復元経路で保存前検査。元ファイルを上書き修復しない。旧形式の不足マーカーのみを補完した合成ファイルの復元を検証。
- D-017は描画確定と他処理を最大5秒待ち、別作品・レイヤー・選択範囲への変更時は中止。読み取り専用の固定履歴を使用。
- 分離名 illustro-r2-audit-fixes-round2。旧SWのprefix削除範囲と重ならないcache prefixを採用。別フォルダ以外へのgit差分を検査してから公開。
- 主要コミット: 043c83b5（保存）、1e5c073e（他5件）、fca06ff5（独立公開・追加修正）、a732cc93（配信パス）、77bbeaaa（競合と再検証）、bc88a9ca（4px点の面積条件）。
- 初回ブラウザー検証は4件不合格。次回はD-017のみ候補0件。3回目は6件成功。過去の失敗は完了扱いしない。

## 残作業・次に行う具体的な操作
1. 公開Actions 45598127689 の publish と browser-smoke 各job結論を取得。公開版6件・関連回帰D-007/D-013/specksのログ確認。未合格の原因だけ修正し再検証。すでに合格した工程をやり直さない。
2. ブラシ・塗り等の拡大時UIやタブレット幅について必要な追加操作、動的読み上げ・登録モードの関連回帰、ストレージ分離の横断検査など、正式仕様に残る未検証範囲を確認する。
3. Windows物理端末の標準保存ダイアログ、元の約93MB作品（提供なし）は未実施。95MB合成作品の単体・小規模実ファイルのChrome保存読込とは区別。旧実物救済は未確認。
4. 最新結果を本書・PR #115に保存しDraft維持。本番検査は別のQAブランチから再開。ユーザーが「続けて」と送ったらHEAD・仕様・本書から上記未完了だけ実行。

公開版・必要な回帰操作・物理実機の未確認を明示し、全体完了とは判定しない。

## 公開後の最新確認
- browser-smoke (D-020): success
- browser-smoke (D-016): success
- browser-smoke (D-013): success
- browser-smoke (D-019): success
- browser-smoke (D-017): success
- browser-smoke (specks): success
- browser-smoke (D-007): success
- browser-smoke (D-021): success
- browser-smoke (D-018): success
公開ジョブ成功。未確認の項目だけ次回取得する。
