# Illustro Implementation Checklist

> 正本: Illustro完成までの実装進捗はこのファイルで管理する。
>
> 状態: ⬜ 未着手 / 🛠 実装中 / 🧪 自動検査済み / 👤 ユーザー確認待ち / ✅ 合格・固定 / ⚠️ 問題あり・修正中
>
> 管理開始日: 2026-10-05
> 管理開始時の機能基準commit: `6e102e5e1527d476307dca8d4993e03f907b2e44`
> 基準branch: `integration/production-prep-2026-10-05`
> 基準Draft PR: #12
> main: `bdc7135b51033982d90ea5dad104bb04fc107df2`
>
> 注意: 上記commit以降にこの進捗表だけを更新する管理commitが入っても、M01の機能基準は上記commitの実装状態を指す。実装チャットは開始時に最新branch headを再確認する。

## 現在地点

- 本番実装開始基準は検証済み。ただしCore Drawing Sliceは未完成。
- Brush Foundationは固定基盤として扱う。別マイルストーン都合でRenderer/Input/補正/GPU構造を理由なく再設計しない。
- Region / Lineartは採用予定試作であり、製品統合済みではない。
- 現在のEditorは一筆の正式Document/Layer確定に加え、M02でRaster Layer追加・現在Layer選択・選択Layerへの次ストローク確定まで接続済み。文書Undo/Redo、Save/Recovery/Reload/Exportは未接続。
- M01は✅合格・固定。実機合格、固定QA、PR #13統合、統合後Core CI / Production PreparationまでPASS済み。現在の統合基準commitは `f58de8c4a0650c6fdd32c4b17a40a2021cd79145`。
- M02「Layer追加・選択」は固定QA公開・公開URL自動検査まで完了し、👤ユーザー確認待ち。Android実機で報告された黒画面は端末別fallbackを撤回し、WebGL2/WebGPU共通の最終表示段で透明な作品を明示的に白紙へ合成する根本修正を公開済み。2026-10-06に報告元Android実機で黒画面解消をユーザー確認済み。M03以降は未着手。
- M02ではLayer追加・選択に必要な範囲だけを実装し、M03 Undo / RedoやM10 Layer Page基本は先取りしていない。

## マイルストーン開始前ゲート

各マイルストーンは、実装開始前に以下を確認する。

- `docs/IMPLEMENTATION_BASELINE.md` を読む。
- `docs/CANONICAL_INDEX.md` を読む。
- 対象分野のCANONICAL ownerを特定して読む。
- 現行の仮実装を最終仕様として扱わない。
- UI対象では該当するLeft UI / Right UI / Layer Page / Input Control / Workspace Customization / Compact UI正本を確認する。
- 対象の正本設計を独自解釈で変更しない。重大な矛盾のみ未確認事項として記録する。
- 実装プロンプトにもこの開始ゲートを必ず明記する。

## 固定QA URL運用

各マイルストーンは、実装とユーザー確認ページをセットで管理する。

- M01 → `https://totoro0419.github.io/illustro/qa/m01/`
- M02 → `https://totoro0419.github.io/illustro/qa/m02/`
- M03 → `https://totoro0419.github.io/illustro/qa/m03/`
- 以降も `/qa/mNN/` の固定規則を使う。
- 新しいマイルストーンの公開で過去QAページを削除・上書きしない。
- 同一マイルストーンの修正中は専用URLを更新してよい。✅合格・固定後はそのURLの内容も固定成果として扱う。
- QAページには今回確認する内容だけを表示し、後続機能を混ぜない。
- 実装チャットはQAページのGitHub Pages公開まで行い、Managerは完了判定時に実URLを独立確認する。
- 専用QA URLが開けなければ「ユーザー確認待ち」へ進めない。
- 現在のPagesは単一artifact方式のため、新しい公開処理は過去QAと既存公開物を保持する構成を必須とする。

## マイルストーン

| ID | 名前 | 状態 | 開始commit | 終了commit | branch / PR | 自動検査 | ユーザー確認 | 専用QA URL | 参考にした主要アプリ | 未解決事項 |
|---|---|---|---|---|---|---|---|---|---|---|
| M01 | 一筆を選択Layerへ正式確定 | ✅ | `cb95bd2` | `c4fa55d` | `milestone/M01-stroke-commit` / PR #13 merged | PASS（Core / adapter / Brush 93 tests / WebGL2 / WebGPU / 公開QA / 統合後回帰） | PASS（2026-10-05 修正版を実機合格） | https://totoro0419.github.io/illustro/qa/m01/ | ibisPaint / CLIP STUDIO PAINT / Procreate / Krita / Photoshop / Affinity | なし。固定QAを回帰基準として保持 |
| M02 | Layer追加・選択 | ✅ | `15bc917` | `e7bf30b` | `milestone/M02-layer-add-select` / PR #14 merged | PASS（run `37384158243`: Core / production-prep / M01 adapter / M02統合 / Brush 93 tests / Editor build / production smoke / WebGL2・WebGPU local+public / 390×844・DPR2 / CSS背景黒でも白紙表示 / 実touch保持中も全体黒化なし / Android UA auto=WebGPUでもPASS / console errorなし / M01 QA保持 / 統合後Core CI・Production Preparation） | PASS（2026-10-06 実機でM02完了確認） | https://totoro0419.github.io/illustro/qa/m02/ | ibisPaint / CLIP STUDIO PAINT / Procreate / Krita / Photoshop / Affinity | なし。M02固定QAを回帰基準として保持 |
| M03 | Undo / Redo | ⬜ | `786aea1` | — | `milestone/M03-undo-redo` / PR未作成 | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m03/ | 未調査。実装前に必須 | M01/M02固定成果を壊さずDocument履歴のUndo/RedoをUIへ接続する |
| M04 | Eraser正式統合 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m04/ | 未調査 | — |
| M05 | Save | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m05/ | 未調査 | — |
| M06 | Reload / Recovery | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m06/ | 未調査 | — |
| M07 | PNG Export | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m07/ | 未調査 | — |
| M08 | Color UI | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m08/ | 未調査 | — |
| M09 | Brush UI | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m09/ | 未調査 | — |
| M10 | Layer Page基本 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m10/ | 未調査 | — |
| M11 | Smudge / Blend / Eyedropper | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m11/ | 未調査 | — |
| M12 | Selection基礎 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m12/ | 未調査 | — |
| M13 | Selection高度機能 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m13/ | 未調査 | — |
| M14 | Transform | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m14/ | 未調査 | — |
| M15 | Group / Folder Transform | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m15/ | 未調査 | — |
| M16 | 通常Fill | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m16/ | 未調査 | — |
| M17 | 囲って塗る等のFill拡張 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m17/ | 未調査 | — |
| M18 | Lineart Layer / Region統合 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m18/ | 未調査 | 実装開始前に小マイルストーンへ分割する |
| M19 | Effects / Adjustments | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m19/ | 未調査 | — |
| M20 | Liquify | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m20/ | 未調査 | — |
| M21 | Folder Liquify | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m21/ | 未調査 | — |
| M22 | Motion System完成 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m22/ | 未調査 | 共通Motion基盤は必要最小限を前段から導入可 |
| M23 | Workspace Motion | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m23/ | 未調査 | — |
| M24 | Quick Controller | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m24/ | 未調査 | — |
| M25 | Layer Motion | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m25/ | 未調査 | — |
| M26 | Tool / Color Motion | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m26/ | 未調査 | — |
| M27 | Reference | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m27/ | 未調査 | — |
| M28 | Navigator | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m28/ | 未調査 | — |
| M29 | Assets | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m29/ | 未調査 | — |
| M30 | Automation | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m30/ | 未調査 | — |
| M31 | Compact基本UI | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m31/ | 未調査 | — |
| M32 | Compact制作UI | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m32/ | 未調査 | — |
| M33 | Landscape / Safe Area / Keyboard等 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m33/ | 未調査 | — |
| M34 | Aurora Visual Polish | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m34/ | 未調査 | — |
| M35 | Motion Polish | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m35/ | 未調査 | — |
| M36 | Performance Hardening | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m36/ | 未調査 | — |
| M37 | Save / Recovery破壊試験 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m37/ | 未調査 | — |
| M38 | Device QA | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m38/ | 未調査 | — |
| M39 | Illustroだけで一枚絵を最初から最後まで制作 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m39/ | 主要比較対象を再確認 | — |
| M40 | Illustro v1 Release Candidate | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m40/ | 主要比較対象を再確認 | M01〜M39消化だけでは自動合格にしない |

## Stage Checkpoints

### Stage A — 作品データとして描画を成立
M01〜M04。描画した一筆が正しいLayerへ正式に残り、Layer操作、Undo/Redo、Eraserまで作品データとして成立すること。

### Stage B — 保存できるアプリへ
M05〜M07。描く → Layerを使う → Undo → 保存 → 閉じる → 開き直す → PNG出力まで成立すること。

### Stage C — 基本制作機能
M08〜M11。

### Stage D — Selection / Transform
M12〜M15。

### Stage E — Fill / Region
M16〜M18。M18は実装直前に、ユーザーが短時間で判断できる大きさへ分割する。

### Stage F — 高度編集
M19〜M21。

### Stage G — Motion / UI高度化
M22〜M26。描画追従 > 入力応答 > UI Motionを絶対条件とする。

### Stage H — 補助機能
M27〜M30。

### Stage I — Compact
M31〜M33。

### Stage J — 最終仕上げ
M34〜M40。

## 更新ルール

各マイルストーン開始時に開始commit、branch/PR、調査対象を記入する。その前に `IMPLEMENTATION_BASELINE.md`、`CANONICAL_INDEX.md`、対象分野のCANONICAL ownerを確認したことを前提とする。実装チャットが完了を申告してもManagerがGitHubを独立確認するまで状態を進めない。

自動検査が通っただけなら最大で🧪。人間の感覚が重要な機能は、専用QA URLをGitHub Pagesへ公開し、Managerが実URL到達を確認した後に👤へ進める。ユーザーが明確に合格と判断するまで✅にしない。

✅になった機能は固定成果として扱い、別機能の都合で理由なく変更しない。変更が不可避なら影響範囲と回帰検査を明記する。

各マイルストーン終了時に、参考にした主要アプリ、参考にした点、Illustroへ採用した点、採用しなかった点と理由を記録する。主要アプリ調査なしの我流実装は原則完了扱いにしない。

mainへはManager/ユーザーの明示判断なしにmergeしない。
