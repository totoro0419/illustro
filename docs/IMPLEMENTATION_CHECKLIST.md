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
- 現在のEditorは一筆の正式Document/Layer確定、M02のRaster Layer追加・現在Layer選択・選択Layerへの次ストローク確定、M03の正式Document HistoryによるUndo/Redoまで接続済み。Save/Recovery/Reload/Exportは未接続。
- M01は✅合格・固定。実機合格、固定QA、PR #13統合、統合後Core CI / Production PreparationまでPASS済み。現在の統合基準commitは `f58de8c4a0650c6fdd32c4b17a40a2021cd79145`。
- M01〜M03は✅合格・固定。M01の正式Stroke、M02のLayer追加・選択、M03のDocument History Undo / Redoまでproduction integrationへ統合済み。
- 現在の実装対象はM04「Eraser正式統合」。M04作業branchは `milestone/M04-eraser-integration`。2026-10-07時点ではproduction integrationとの差分0で、まだ製品実装差分はない。
- M05以降の正式ロードマップは下表のM05〜M47。旧M05〜M40の番号・順序は廃止し、この表を今後の進行基準とする。

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

## ロードマップ固定ルール

- M01〜M47の番号・名称・順序は、ユーザーが更新したこの表を正本とする。
- Managerや実装チャットが独自判断でマイルストーンを統合・分割・改番・入れ替えしない。
- 技術上どうしても内部サブタスクへ分ける必要がある場合でも、外側のマイルストーンIDは維持する。大きな再編が必要ならユーザー承認を得る。
- 各マイルストーンは、その時点までの✅固定成果を回帰基準として保持する。
- M47「Illustro v1.0 Release Gate」が最終完成判定。M46まで完了しても自動的にv1.0完成とは扱わない。

## マイルストーン

| ID | 名前 | 状態 | 開始commit | 終了commit | branch / PR | 自動検査 | ユーザー確認 | 専用QA URL | 参考にした主要アプリ | 未解決事項 |
|---|---|---|---|---|---|---|---|---|---|---|
| M01 | 一筆を選択Layerへ正式確定 | ✅ | `cb95bd2` | `c4fa55d` | `milestone/M01-stroke-commit` / PR #13 merged | PASS（Core / adapter / Brush 93 tests / WebGL2 / WebGPU / 公開QA / 統合後回帰） | PASS（2026-10-05 修正版を実機合格） | https://totoro0419.github.io/illustro/qa/m01/ | ibisPaint / CLIP STUDIO PAINT / Procreate / Krita / Photoshop / Affinity | なし。固定QAを回帰基準として保持 |
| M02 | Layer追加・選択 | ✅ | `15bc917` | `e7bf30b` | `milestone/M02-layer-add-select` / PR #14 merged | PASS（run `37384158243`: Core / production-prep / M01 adapter / M02統合 / Brush 93 tests / Editor build / production smoke / WebGL2・WebGPU local+public / 390×844・DPR2 / CSS背景黒でも白紙表示 / 実touch保持中も全体黒化なし / Android UA auto=WebGPUでもPASS / console errorなし / M01 QA保持 / 統合後Core CI・Production Preparation） | PASS（2026-10-06 実機でM02完了確認） | https://totoro0419.github.io/illustro/qa/m02/ | ibisPaint / CLIP STUDIO PAINT / Procreate / Krita / Photoshop / Affinity | なし。M02固定QAを回帰基準として保持 |
| M03 | Undo / Redo | ✅ | `1d1eb23` | `5af86f4` | `milestone/M03-undo-redo` / PR #15 merged | PASS（run `37629222977`: source lock / M01-M03 Editor unit / Brush 93 / Editor build / production regression / WebGL2・WebGPU local+public / Stroke・Layer Undo/Redo / LayerId・SurfaceId保持 / Redo破棄 / Keyboard / active stroke競合 / pointercancel / rapid History / Compact / Workspace閉鎖後Pen・Touch live描画 / M01・M02固定QA保持 / exact HEAD公開 / 統合後Core CI・Production Preparation） | PASS（2026-10-07 実機でM03完了確認） | https://totoro0419.github.io/illustro/qa/m03/ | ibisPaint / CLIP STUDIO PAINT / Procreate / Krita / Photoshop / Affinity | なし。M03固定QAを回帰基準として保持 |
| M04 | Eraser正式統合 | ⬜ | `166ffae` | — | `milestone/M04-eraser-integration` / PR未作成 | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m04/ | 実装前に必須 | 現在の実装対象。M01〜M03固定成果を壊さず正式Document/History経路へ統合 |
| M05 | Save基盤 — .illustro、Autosave、Reload、Recovery、Offline、Document Metadata | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m05/ | 実装前に必須 | — |
| M06 | 基本Export — PNG / JPEG / WebP、保存・書き出しUI | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m06/ | 実装前に必須 | — |
| M07 | 本番PC/Tablet UI骨格 — Left UI、Right UI、Layer Page入口、上部・下部固定UI、Aurora基礎 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m07/ | 実装前に必須 | 仮UIを最終仕様にしない |
| M08 | Canvas操作 — Pan / Zoom / Rotate / 高倍率Zoom / Flip / Crop / Canvas・Image Resize / Seamless Tile | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m08/ | 実装前に必須 | — |
| M09 | Color基本機能 — Picker、Eyedropper、History、Palette、HSV/HSL/RGB、Palette I/O | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m09/ | 実装前に必須 | — |
| M10 | Brush正式機能 — Preset、検索、ユーザーBrush、Texture、Dynamics、Pressure、Tilt、Stabilization等 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m10/ | 実装前に必須 | Brush Foundation固定成果を土台に拡張 |
| M11 | Layer完成系 — Group、Mask、Clipping、Alpha Lock、Multi-select、検索・整理・複製・Merge等 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m11/ | 実装前に必須 | — |
| M12 | Workspace — Resize / Reorder / Hide / Preset / Save・Load / Dock / Detach / Floating / PC・Tablet PiP | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m12/ | 実装前に必須 | Workspace正本を反映 |
| M13 | Quick Controller・Search・Shortcut — カスタム6枠、Command Search、キー割当、Gesture、Custom Toolbar | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m13/ | 実装前に必須 | — |
| M14 | 描画系追加Tool — Smudge / Mix、Stylus Eraser、Barrel Buttonなど入力機器統合 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m14/ | 実装前に必須 | — |
| M15 | Selection完成 — 矩形・楕円・投げ縄・多角形・色選択・加減算・Feather・Saved Selection等 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m15/ | 実装前に必須 | — |
| M16 | Transform完成 — Move / Scale / Rotate / Perspective / Distort / Warp / 非破壊 / Group対応 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m16/ | 実装前に必須 | — |
| M17 | Liquify完成 — Layer / 複数Layer / Folder、Undo、非破壊処理 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m17/ | 実装前に必須 | — |
| M18 | Fill完成 — Flood / Gap Close / Expand / Multi-layer / Enclose / Trace / Drag / Smart Fill | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m18/ | 実装前に必須 | — |
| M19 | Lineart Region System — 境界抽出、閉領域、Persistent ID、隣接関係、手動修正 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m19/ | 実装前に必須 | Region採用試作と正本境界を確認 |
| M20 | Region彩色 — Region Selection / Fill、Lineart-linked Coloring、追従、Recolor、Smart Color Assist | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m20/ | 実装前に必須 | — |
| M21 | 複数Document・Clipboard — Copy/Cut/Paste、Copy Merged、Paste in Place、Cross-document、Drag & Drop | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m21/ | 実装前に必須 | — |
| M22 | Vector完成 — Path、Anchor、Bezier、Stroke/Fill、Boolean、Vector Eraser、Rasterize、Region連携 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m22/ | 実装前に必須 | — |
| M23 | Text完成 — 編集可能Text、日本語縦横書き、Font、文字間隔、Font Import、Text→Path | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m23/ | 実装前に必須 | — |
| M24 | 定規・Guide — Parallel / Grid / Isometric / Perspective / Symmetry / Radial / Snap / Preset | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m24/ | 実装前に必須 | — |
| M25 | Shape・Gradient — 図形、描画後修正、Vector Shape、各種Gradient、Stops、非破壊Gradient | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m25/ | 実装前に必須 | — |
| M26 | 合成・Mask基盤 — Blend Mode、Painting Mode、Blend Preview、Blend If、Vector/Clipping Mask | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m26/ | 実装前に必須 | — |
| M27 | Adjustment・Filter・Layer Style — Curves等、Blur等、非破壊Filter、Shadow/Glow/Overlay等 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m27/ | 実装前に必須 | — |
| M28 | Healing / Patch / Clone | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m28/ | 実装前に必須 | — |
| M29 | Reference + Navigator — 複数資料、自由配置、採色、Group、Persistence、Navigator、Floating | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m29/ | 実装前に必須 | — |
| M30 | Asset Library — Brush/Texture/Pattern/Gradient/Palette/Macro/Workspace等の整理・検索・Import/Export | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m30/ | 実装前に必須 | — |
| M31 | History高度機能 — History Panel、Snapshot、比較、分岐、Layer Comp | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m31/ | 実装前に必須 | M03のDocument Historyを土台に拡張 |
| M32 | Timelapse + Work Time — 履歴ベースTimelapse、高解像度出力、制作時間 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m32/ | 実装前に必須 | — |
| M33 | Macro / Automation — Record、Edit、Preset、Parameter、Quick Menu/Shortcut連携 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m33/ | 実装前に必須 | — |
| M34 | 高度Color Management — ICC、8/16bit、Wide Gamut、Profile変換、Soft Proof、Gamut Warning | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m34/ | 実装前に必須 | — |
| M35 | ファイル互換 — OpenRaster、TIFF、PSD＋Loss Report、SVG / EXRなど正式対応範囲 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m35/ | 実装前に必須 | 対応範囲は実装前に正式確定 |
| M36 | Compact / Smartphone UI — 左Rail、下Bar、Drawer、全機能導線、Compact PiP | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m36/ | 実装前に必須 | Compact正本を反映 |
| M37 | 端末適応 — Desktop / Tablet / Smartphone、Touch/Pen/Mouse、GPU fallback、Mobile lifecycle、Resource Budget | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m37/ | 実装前に必須 | — |
| M38 | Accessibility + 日本語/Localization — UI拡大、色以外の状態表示、1本指代替、Reduced Motion、CJK等 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m38/ | 実装前に必須 | — |
| M39 | Motion + Aurora最終UI — Workspace、Quick Controller、Layer、Color等のAnimationとVisual Polish | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m39/ | 実装前に必須 | 描画追従 > 入力応答 > UI Motionを維持 |
| M40 | Performance Hardening — 入力遅延、FPS、Memory、大Canvas、多Layer、Filter、起動速度 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m40/ | 実装前に必須 | — |
| M41 | Save / Recovery破壊試験 — 強制終了、保存中断、容量不足、Recovery、データ整合性 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m41/ | 実装前に必須 | — |
| M42 | 全端末実機QA — PC / Tablet / Smartphone / Pen / Touch / Mouse / 高DPI等 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m42/ | 実装前に比較対象・端末表を確定 | — |
| M43 | Investigate項目最終整理 — Wet Media等について採用・延期・非採用を根拠付きで確定 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m43/ | 必要に応じ公式・原論文等を確認 | 調査結果だけでなくv1範囲を正式決定 |
| M44 | 一枚絵制作総合試験 — Illustroだけで新規作成→完成→保存→再編集→Export | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m44/ | 主要制作フローを再確認 | — |
| M45 | 主要ペイントアプリ比較QA — ibisPaint / CSP / Procreate / Krita / Photoshopと主要制作フロー比較 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m45/ | 主要アプリ最新仕様を再調査 | 比較結果から残課題を抽出・修正 |
| M46 | v1 Release Candidate — 全機能横断回帰、残存バグ修正、Release候補固定 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m46/ | 必要に応じ再確認 | M47合格前はv1.0完成扱いにしない |
| M47 | Illustro v1.0 Release Gate — 最終完成判定 | ⬜ | — | — | — | 未実施 | 必須 | https://totoro0419.github.io/illustro/qa/m47/ | 主要比較対象・要件を最終確認 | 全機能・品質・回帰・実機・保存安全性を横断して最終判定 |

## Stage Checkpoints

### Stage A — 描画を正式な作品データとして成立
M01〜M04。Stroke、Layer、Undo/Redo、Eraserまでを同じDocument/History基盤上で成立させる。

### Stage B — 保存・書き出し
M05〜M06。.illustro保存、Autosave/Recovery/Reload/Offline、基本画像Exportまで成立させる。

### Stage C — 制作の中核UI・基本制作環境
M07〜M14。本番PC/Tablet UI、Canvas操作、Color、Brush、Layer、Workspace、Quick Controller/Search/Shortcut、追加描画Toolを統合する。

### Stage D — 選択・変形・塗り・Region
M15〜M20。Selection、Transform、Liquify、Fill、Lineart Region、Region彩色を完成させる。

### Stage E — 高度制作機能
M21〜M30。複数Document/Clipboard、Vector、Text、定規、Shape/Gradient、合成/Mask、Adjustment/Filter/Layer Style、Healing、Reference/Navigator、Asset Libraryを完成させる。

### Stage F — 履歴・自動化・色管理・互換
M31〜M35。高度History、Timelapse/Work Time、Macro/Automation、高度Color Management、ファイル互換を完成させる。

### Stage G — 端末UI・アクセシビリティ・最終Visual
M36〜M39。Compact/Smartphone UI、端末適応、Accessibility/Localization、Motion/Aurora最終UIを完成させる。

### Stage H — 品質強化
M40〜M43。Performance、Save/Recovery破壊試験、全端末実機QA、Investigate項目のv1判断を完了する。

### Stage I — 製品完成判定
M44〜M47。一枚絵制作総合試験、主要アプリ比較QA、Release Candidate、v1.0 Release Gateの順で最終確認する。**M47合格のみをv1.0最終完成判定とする。**

## 更新ルール

各マイルストーン開始時に開始commit、branch/PR、調査対象を記入する。その前に `IMPLEMENTATION_BASELINE.md`、`CANONICAL_INDEX.md`、対象分野のCANONICAL ownerを確認したことを前提とする。実装チャットが完了を申告してもManagerがGitHubを独立確認するまで状態を進めない。

自動検査が通っただけなら最大で🧪。人間の感覚が重要な機能は、専用QA URLをGitHub Pagesへ公開し、Managerが実URL到達を確認した後に👤へ進める。ユーザーが明確に合格と判断するまで✅にしない。

✅になった機能は固定成果として扱い、別機能の都合で理由なく変更しない。変更が不可避なら影響範囲と回帰検査を明記する。

各マイルストーン終了時に、参考にした主要アプリ、参考にした点、Illustroへ採用した点、採用しなかった点と理由を記録する。主要アプリ調査なしの我流実装は原則完了扱いにしない。

mainへはManager/ユーザーの明示判断なしにmergeしない。
