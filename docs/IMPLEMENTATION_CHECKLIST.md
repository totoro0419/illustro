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
- 現在のEditorは一筆の正式Document/Layer確定まで接続済み。Layer追加、文書Undo/Redo、Save/Recovery/Reload/Exportは未接続。
- M01は強制入り抜きのタイミングについて追加問題が見つかり、Brush Foundationを最小修正して自動検査・固定QA再公開まで完了。入りは早めに通常太さへ乗り、抜きは終端寄りで細くなる左右別カーブへ調整済み。現在は👤ユーザー実機再確認待ち。M02以降は未着手。
- M01では「一筆を選択Layerへ正式確定」を成立させるために必要な範囲だけ、既存CoreをArchitecture V2へ整合させる。M02以降の機能を先取りしない。

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
| M01 | 一筆を選択Layerへ正式確定 | 👤 | `cb95bd2` | — | `milestone/M01-stroke-commit` / Draft PR #13 | PASS（Core / adapter / Brush 93 tests / WebGL2 / WebGPU / 公開QA） | 再確認必須（旧合格は追加問題報告により撤回） | https://totoro0419.github.io/illustro/qa/m01/ | ibisPaint / CLIP STUDIO PAINT / Procreate / Krita / Photoshop / Affinity | 強制入り抜きの左右別タイミング修正版を実機再確認する |
| M02 | Layer追加・選択 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m02/ | 未調査 | — |
| M03 | Undo / Redo | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m03/ | 未調査 | — |
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

各マイルストーン開始時に開始commit、branch/PR、調査対象を記入する。実装チャットが完了を申告してもManagerがGitHubを独立確認するまで状態を進めない。

自動検査が通っただけなら最大で🧪。人間の感覚が重要な機能は、専用QA URLをGitHub Pagesへ公開し、Managerが実URL到達を確認した後に👤へ進める。ユーザーが明確に合格と判断するまで✅にしない。

✅になった機能は固定成果として扱い、別機能の都合で理由なく変更しない。変更が不可避なら影響範囲と回帰検査を明記する。

各マイルストーン終了時に、参考にした主要アプリ、参考にした点、Illustroへ採用した点、採用しなかった点と理由を記録する。主要アプリ調査なしの我流実装は原則完了扱いにしない。

mainへはManager/ユーザーの明示判断なしにmergeしない。
