# 検証結果 — 2026-10-05

**本番実装を開始してよい。Core Drawing Sliceは未完成。** 基準と接続骨格を検証した判断であり、全機能・実機UX・競合より高品質という判定ではない。

## 実行して確認したこと

| 対象 | 結果 / 根拠 |
|---|---|
| GitHub | main `bdc7135`、PR #6〜#11、open #5をAPI/gitで直接確認。#12のbaseも同じmain |
| 現在のBrush | source `4a7b488`、文書同期後head `d9b325e`。code/test/HTML差分なし。HTML blob `548736458cf0d51a73e8c6b7e31d3fd056936ab0`、549706bytes |
| Brush Node | 91/91 PASS、ローカルとCI。既存の強制入り抜き独立性/長線/短線/再生を含む |
| Brush CI | [37286523766](https://github.com/totoro0419/illustro/actions/runs/37286523766) completed/success。両方式各229比較・38性能条件、targeted各18/18、各3分試験43200/43200入力保持。ログから独立抽出 |
| 旧Brush / Core | 旧Brush170/170、Core8/8、P0既存29/29、各Core/Brush TypeScript型検査PASS。Coreに必要な元branchの3ファイル依存を補い再検査 |
| Source整合 | 65成果のSHA-256と元commitのGit objectを独立byte比較。HTMLを再buildして元blobと一致。旧設計branchが祖先でなく旧ADR-0005不在 |
| 本番骨格 | Editor TypeScript/Vite build PASS。Worker実bundleを含む。CI [37291492186](https://github.com/totoro0419/illustro/actions/runs/37291492186) source `11fe2a9` completed/success |
| ブラウザ | WebGL2/WebGPUで実描画画素を確認。7選択肢、太さSlider/数値、強制入り抜きON/OFF、消しゴム/Brush表示同期、幅変更、Drawer開閉/Focus復帰、未接続Save無効を確認 |
| 画面サイズ | 両方式で1024×768、760×700、390×844、320×640、740×390。横はみ出しなし。1440×900とCompactの実スクリーンショットを回収・目視確認 |
| ブラウザ実行エラー | 両方式ともconsole/pageerrorなし |
| 文書の整合 | 402分類path、14owner、重複owner/pathなし、正本Markdownリンク切れ0。既存停止指示を現在の正本から除外。最終件数を再検査済み |
| Raster Lab | 元sourceを維持。13構造群、225 Raster条件（各2回）、10延長群、9緩和群PASS。fixtures生成後に実行し、出力を元の記録と混同せず別保存。人間精度合格を代用しない |

## 修正して再確認したこと

- 選別移植で欠けたCoreのstroke記録依存3ファイルを元branchから補完。
- Skeletonの厳密TypeScriptで指摘されたoptional forceFade参照を修正しbuild。
- 実画像の独立確認で消しゴム選択とBrush名表示の矛盾を発見し同期。専用assertを追加し両方式再確認。
- Workspaceのnative resizeと共有幅状態が別になる経路を除去し、splitter/Sliderに統一。
- 生成されたmodule出力を成果の正本に混ぜず、再生成物として追跡から外した。正本HTMLは保持。

## 未確認 / 残件

- 新Skeletonの実ペン追従、手のひら除外、実端末のsafe area/仮想キーボード、支援技術、全ブラシ/高DPIでのUX。
- 最新強制入り抜きの長さ式はsizeを直接使わない。依頼文の説明との差は記録し、合格した描画挙動を変更しない。
- 旧WebGL2鉛筆512/240初回反復+32.33ms FAILの原因は未特定。最新の全successで原因解消とはしない。
- Core V2のschema整合、Layer追加、文書への一筆確定、文書全体のUndo/Redo、Save/Recovery、再読込復元、Exportは未実装。接続口のみ。
- Quick Controller、切離し/再ドック、色相環/HSV等の最終UIは既決仕様を固定したがSkeletonでは未実装。Compactの最終見た目はユーザー未承認。
- Regionは採用予定試作。製品の永続ID/訂正/History/Save・精度受入は後続機能で確認。
- 6社比較の総合優位性は未検証。

ローカルのChromium取得は非ZIP応答で失敗したため、ローカルGPU/画面検査をPASS扱いせず、GitHub Actionsの実ブラウザで確認した。回収ZIP SHA-256は `f05b304c50d5f47ab78c4e3b5f572765b019534313aa6b4f2497394e2bb171df` とartifact digestに一致。

最終文書整合を含む [CI37292097873](https://github.com/totoro0419/illustro/actions/runs/37292097873) は commit `4bd6571250fc704a1a68ed1cb975481e191cc857` で completed/success。Core CI37292105444もsuccess。この後の更新はこの検証報告のみで、apps/packages/scripts/package/CI定義は検証済みコードから不変。

## 判定

唯一の入口は [IMPLEMENTATION_BASELINE](../IMPLEMENTATION_BASELINE.md)。正本・採用試作・古い設計を分離し、開始骨格/担当/順序/性能規則があり、実行可能な範囲の検査を通った。**設計・試作を続けるために全体を止めず、Core Drawing Sliceの本番実装へ進む。** 最初は既存CoreのV2整合と「描いた一筆を選択Layerへ正式に残す」経路。mainは変更・mergeしていない。
