# M09 Color基本機能 — 公式資料比較・採否記録
2026-10-12。対象は公開されている操作仕様のみ。非公開の内部構造・保存アルゴリズムは推測しない。

## 確認した正本
- `docs/IMPLEMENTATION_BASELINE.md`, `docs/CANONICAL_INDEX.md`, `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/FEATURE_SPEC.md`, `docs/ui/LEFT_UI_SPEC.md`, `docs/ui/RIGHT_UI_SPEC.md`, `docs/ui/UI_INPUT_CONTROL_STANDARD.md`
- `docs/architecture/ARCHITECTURE_V2.md`, `docs/architecture/CANONICAL_RASTER_V2.md`, `docs/architecture/BRUSH_RENDER_CONTRACT_V2.md`, `docs/architecture/PERSISTENCE_RECOVERY_LOGICAL_V2.md`

**正本間の表現差**: RIGHT_UI_SPEC R2 は Picker/Palette/Harmony を代表例として挙げ、UI_INPUT_CONTROL_STANDARD 6.1 は Picker/Values/Palette/History の4つの同等タブと Values 内HSV/HSL/RGB切替を明示している。M09では後者のより具体的な入力仕様とM09ロードマップを採用し、Harmonyは未実装の後続機能として残す。Right Box登録IDは `right.color` を保持。

## 6アプリ比較・採用/非採用
| 公式アプリ | 公開資料で確認した優秀点 | Illustro M09への採用 | M09で採用しない点・理由 |
|---|---|---|---|
| **ibisPaint** | 色相環＋HSB領域、HEX入力、HSB/RGB切替。現在色とカラーウィンドウを開いた時点の変更前色を表示。色履歴は描画で使った色を最大100件。スポイトは全レイヤー合成/現在レイヤーを切替できる。 | Hue Ring＋SV正方形、Current/Previous、HEX・HSV・RGB入力、採色対象の切替、履歴・保存色を別扱いにする。 | 100件履歴は狭いRight Boxで一覧の操作負担が大きいため24件を上限とし、構造上変更可能にする。Previousの定義は「最後に確定した色」へ統一し、編集中の変更元は別途保持。 |
| **CLIP STUDIO PAINT** | Color SettingsでOriginal/Setの比較、HSV/HLS/RGB/HEXの数値、Color Wheel/History/Color Setを切替。Color Setでは追加・置換・削除・並べ替え、.clsと.acoの入出力。Tabletでは長押し一時スポイト。 | 正確値入力と復元、HSV/HSL/RGB、Paletteを作成・編集、タブ操作、露出したスポイト入口とPCキーボード経路。 | .cls/.acoは互換仕様の独立確認・完全な相互運用検査が必要なため現時点で推測実装しない。 |
| **Procreate** | Disc（外側Hueと内側Saturation）、Classic、Value（数値/HEX）、Palettes。Historyは最大10件、Clearあり。スポイトでは新旧色を比較するルーペと長押し操作。 | 色相環＋正確入力の併用、上部Current、履歴Clear、スポイトの操作中プレビュー・ペン/指入口。 | 色の調和提案はM09の基本色操作ではない。過度の画面常駐を避け、タブとして段階的に表示する。 |
| **Krita** | Advanced Color SelectorはHSXモデルや形状変更、色履歴パッチがある。Palette Dockerは色群・グリッド並べ替え・インポート、保存場所として文書/利用者リソースを選択。 | 色モデルの別表示、パレットは描画Revisionではない独立した資産として保存、並べ替え、今後M30/M34に拡張可能な境界。 | 詳細なプロファイル/モデル特化セレクターはM34。外部形式の一括対応は互換性調査を要する。 |
| **Photoshop** | Color Panelはforeground/background、スライダーと数値入力を持ち、色見本はSwatches Panelへ分離。Adobe Color PickerでHSB/RGB/CMYK/Lab/HEX入力。スポイトはSampling size/sourceを選べる。 | Current表示、モデル切替・正確入力、選択色と保存色の役割分離、1px/合成/レイヤー採色の明示。 | 高度CMYK/Lab/Profile/UIはM34。1px以外の統計的採色は性能・仕様検証後に実装。 |
| **Affinity Photo** | 官方Photo 2ヘルプは Colour/Swatches パネルを区別。公式旧ヘルプでは最近の10色、Document/Application/System palette、palette入出力、色見本の追加/編集、foreground/background切替を説明。 | Paletteを作品本体と分離したワークスペースの保存領域へ配置し、手動のImport/Exportで持ち運ぶ。 | Document/System palette統合や独自拡張形式はM30/M34以降。旧版の細かな操作がPhoto 2でも同一であるとは断定しない。 |

## 公式出典
1. ibisPaint「カラーウィンドウで色選択」 https://ibispaint.com/lecture/index.jsp?lang=ja&no=11
2. ibisPaint「キャンバスやレイヤーから色を取得する」 https://ibispaint.com/lecture/index.jsp?lang=ja&no=15
3. CSP Color Settings https://help.clip-studio.com/en-us/manual_en/300_color/Color_Settings_Dialog.htm
4. CSP Color Set https://help.clip-studio.com/en-us/manual_en/300_color/Color_Set_palette.htm
5. CSP Studio Mode https://help.clip-studio.com/en-us/manual_en/090_tablet/Using_Studio_Mode.htm
6. Procreate Interface https://help.procreate.com/procreate/handbook/colors/colors-interface
7. Krita Advanced Color Selector https://docs.krita.org/en/reference_manual/dockers/advanced_color_selector.html
8. Krita Palette Docker https://docs.krita.org/ja/reference_manual/dockers/palette_docker.html
9. Photoshop Color Panel (2026-09-30) https://helpx.adobe.com/photoshop/desktop/adjust-color/choose-colors/choose-colors-in-the-color-panel.html
10. Photoshop Color Picker https://helpx.adobe.com/photoshop/desktop/adjust-color/choose-colors/choose-colors-with-the-adobe-color-picker.html
11. Photoshop Eyedropper https://helpx.adobe.com/photoshop/using/tool-techniques/eyedropper-tool.html
12. Affinity Photo 2 official Help landing https://affinity.help/photo2/English.lproj
13. Affinity original official Swatches documentation (historical) https://s3-eu-west-1.amazonaws.com/affinity-docs/help/photo/English.lproj/pages/Panels/swatchesPanel.html

## M09境界・選択の確定ルール
- **単一Foreground Color State**: モデルは数値`RGB{r,g,b}`を0..1で保持する。HSV/HSL/HEXは表示・編集時の変換であり別の状態を持たない。8bitへの丸めはHEX表示時のみ。作業色のColor Space情報を長期のArtwork Raster形式と混同せず、M34のプロファイル設計を拘束しない。
- **Previous**: ユーザー操作を正式確定した際の変更元。ドラッグ中の途中色はHistoryに入れない。Hue・SV・数値編集中はキャンセル元のColorを別に保持。
- **History**: 24件、有効なユーザーによる色変更の確定で1件、最新を先頭、同色は1件にまとめる。Artwork Undoと分離。起動を越えるワークスペース資産に保存。
- **Palette**: 32パレット/各256色、作成・改名・色追加・選択・削除・前後移動。アプリ/ワークスペース資産（ブラウザ内storage）に保存し、作品Revisionへは含めない。M30のAsset Libraryへ移行可能な形式。`.illustro`内へ何でも混入させない。
- **Palette I/O**: 開示可能な`illustro-palette` JSON version 1のみ。RGB色空間名と浮動小数RGB値・ID・並び順を明示。厳格な型/大きさ/色数/ID/色範囲検査。外部専用形式のパーサは未実装（互換宣言なし）。
- **Eyedropper**: 合成（Canvas）と選択Layerを明確に区別、1px readback、最新のPointer移動を優先する。ピクセルのデータ値と紙（画面背景）の見かけを同一視しない。採色位置の外/透明は色を上書きしない。一時スポイトから描画ツールへ復帰。
- **Performance**: Colorの値変更はArtwork Revisionを増やさない。Stroke開始時点でPreset ColorをCaptureし過去Strokeに影響しない。RendererのDPR/表示を触らない。
- **M10/M34境界**: Brushの輪郭品質・textureの改造はM10。ICC/Wide Gamut/高bit-depth/Soft ProofはM34。

この文書は採用判断。CI/実機の合格宣言は個別の実行証拠が必要。