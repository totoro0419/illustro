> Classification: EXPERIMENTAL / supporting historical UI detail. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Illustro Left UI Access Coverage

> Generated from `docs/FEATURE_CATALOG.md` and reconciled with canonical Left/Right UI ownership on 2026-09-29.
> Purpose: every catalog item is classified as Left-reachable, Dedicated Settings, System/Internal, or Future.
> This is a design coverage audit, not implementation status.

## Summary

| Category | Items | Canvas | Right PiP | Settings | Command/Feature | System/Future |
|---|---:|---:|---:|---:|---:|---:|
| キャンバス・表示 | 10 | 0 | 2 | 0 | 6 | 2 |
| ドキュメント・編集・出力 | 44 | 1 | 12 | 1 | 21 | 9 |
| 描画 | 20 | 4 | 10 | 0 | 2 | 4 |
| 塗り・色・Region | 50 | 7 | 13 | 0 | 25 | 5 |
| 選択・変形 | 21 | 11 | 1 | 0 | 9 | 0 |
| レイヤー・合成 | 39 | 0 | 3 | 0 | 35 | 1 |
| ベクター・文字・図形 | 19 | 1 | 4 | 0 | 14 | 0 |
| 補正・フィルター・修復 | 13 | 3 | 0 | 0 | 10 | 0 |
| 資料・アセット | 26 | 1 | 5 | 0 | 20 | 0 |
| 履歴・自動化 | 23 | 0 | 12 | 0 | 9 | 2 |
| ワークスペース・設定 | 52 | 0 | 3 | 9 | 16 | 24 |
| 定規・ガイド | 9 | 0 | 3 | 0 | 6 | 0 |

## Coverage

| Catalog section | Feature | Product status | Left category | Group | Semantic type | Destination | Route |
|---|---|---|---|---|---|---|---|
| A. キャンバス・ドキュメント | Raster Canvas | Core | キャンバス・表示 | Canvas / View | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| A. キャンバス・ドキュメント | Tile-based 大規模Canvas | Core / Investigate | キャンバス・表示 | Canvas / View | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| A. キャンバス・ドキュメント | Pan / Zoom / Rotate | Core | キャンバス・表示 | Canvas / View | Command/Feature | command | Left → All Features → キャンバス・表示 → Canvas / View → Pan / Zoom / Rotate |
| A. キャンバス・ドキュメント | 最大 64000% Zoom | Required | キャンバス・表示 | Canvas / View | Command/Feature | command | Left → All Features → キャンバス・表示 → Canvas / View → 最大 64000% Zoom |
| A. キャンバス・ドキュメント | Canvas Flip | Required | キャンバス・表示 | Canvas / View | Command/Feature | command | Left → All Features → キャンバス・表示 → Canvas / View → Canvas Flip |
| A. キャンバス・ドキュメント | Crop | Required | ドキュメント・編集・出力 | Document / Save | Tool/Mode | canvas | Left Pin可 / Left → All Features → ドキュメント・編集・出力 → Document / Save → Crop → Canvas mode |
| A. キャンバス・ドキュメント | Canvas Resize | Required | ドキュメント・編集・出力 | Document / Save | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Document / Save → Canvas Resize |
| A. キャンバス・ドキュメント | Image Resize | Required | ドキュメント・編集・出力 | Document / Save | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Document / Save → Image Resize |
| A. キャンバス・ドキュメント | Seamless Tile Drawing | Required | キャンバス・表示 | Canvas / View | Command/Feature | command | Left → All Features → キャンバス・表示 → Canvas / View → Seamless Tile Drawing |
| A. キャンバス・ドキュメント | 複数Document | Required | ドキュメント・編集・出力 | Document / Save | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Document / Save → 複数Document |
| A. キャンバス・ドキュメント | Document Metadata | Required | ドキュメント・編集・出力 | Document / Save | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Document / Save → Document Metadata |
| B. 描画・ブラシエンジン | Brush Tool | Core | 描画 | Tool | Tool/Mode | canvas | Left Pin可 / Left → All Features → 描画 → Tool → Brush Tool → Canvas mode |
| B. 描画・ブラシエンジン | Eraser | Core | 描画 | Tool | Tool/Mode | canvas | Left Pin可 / Left → All Features → 描画 → Tool → Eraser → Canvas mode |
| B. 描画・ブラシエンジン | Smudge / Blend Tool | Required | 描画 | Tool | Tool/Mode | canvas | Left Pin可 / Left → All Features → 描画 → Tool → Smudge / Blend Tool → Canvas mode |
| B. 描画・ブラシエンジン | Brush Size / Opacity | Core | 描画 | Brush | Setting/Property | rightPiP | Left → All Features → 描画 → Brush → Brush Size / Opacity → Right PiP/Settings |
| B. 描画・ブラシエンジン | Pressure | Core | 描画 | Brush | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| B. 描画・ブラシエンジン | Tilt | Required | 描画 | Brush | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| B. 描画・ブラシエンジン | Azimuth | Required | 描画 | Brush | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| B. 描画・ブラシエンジン | Stylus Eraser | Required | 描画 | Tool | Tool/Mode | canvas | Left Pin可 / Left → All Features → 描画 → Tool → Stylus Eraser → Canvas mode |
| B. 描画・ブラシエンジン | Barrel Button | Required | 描画 | Brush | Command/Feature | command | Left → All Features → 描画 → Brush → Barrel Button |
| B. 描画・ブラシエンジン | Stabilization / Smoothing | Core | 描画 | Brush | Setting/Property | rightPiP | Left → All Features → 描画 → Brush → Stabilization / Smoothing → Right PiP/Settings |
| B. 描画・ブラシエンジン | Brush Dynamics 共通変調モデル | Core | 描画 | Brush | Setting/Property | rightPiP | Left → All Features → 描画 → Brush → Brush Dynamics 共通変調モデル → Right PiP/Settings |
| B. 描画・ブラシエンジン | Dynamics Curve / Range / Invert | Required | 描画 | Brush | Setting/Property | rightPiP | Left → All Features → 描画 → Brush → Dynamics Curve / Range / Invert → Right PiP/Settings |
| B. 描画・ブラシエンジン | Procedural Brush System | Core | 描画 | Brush | Command/Feature | command | Left → All Features → 描画 → Brush → Procedural Brush System |
| B. 描画・ブラシエンジン | Texture-based Brush Input | Required | 描画 | Brush | Setting/Property | rightPiP | Left → All Features → 描画 → Brush → Texture-based Brush Input → Right PiP/Settings |
| B. 描画・ブラシエンジン | Brush Preset | Required | 描画 | Brush | Panel/Workspace | rightPiP | Left → All Features → 描画 → Brush → Brush Preset → Right magnetic PiPをopen/focus |
| B. 描画・ブラシエンジン | Brush検索・整理 | Required | 描画 | Brush | Panel/Workspace | rightPiP | Left → All Features → 描画 → Brush → Brush検索・整理 → Right magnetic PiPをopen/focus |
| B. 描画・ブラシエンジン | ユーザー作成Brush | Required | 描画 | Brush | Setting/Property | rightPiP | Left → All Features → 描画 → Brush → ユーザー作成Brush → Right PiP/Settings |
| B. 描画・ブラシエンジン | Dynamic Wet Media | Core / Investigate | 描画 | Brush | Setting/Property | rightPiP | Left → All Features → 描画 → Brush → Dynamic Wet Media → Right PiP/Settings |
| B. 描画・ブラシエンジン | Wetness / Pigment等の内部状態 | Investigate | 描画 | Brush | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| B. 描画・ブラシエンジン | 紙質・粒子・質感 | Required / Investigate | 描画 | Brush | Setting/Property | rightPiP | Left → All Features → 描画 → Brush → 紙質・粒子・質感 → Right PiP/Settings |
| C. 線画・Region Intelligence | Lineart Region System | Core | 塗り・色・Region | Fill / Region | Command/Feature | command | Left → All Features → 塗り・色・Region → Fill / Region → Lineart Region System |
| C. 線画・Region Intelligence | 閉領域検出 | Core | 塗り・色・Region | Color | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| C. 線画・Region Intelligence | Persistent Region ID | Core | 塗り・色・Region | Fill / Region | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| C. 線画・Region Intelligence | Region隣接グラフ | Core | 塗り・色・Region | Fill / Region | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| C. 線画・Region Intelligence | Boundary Tracking | Core | 塗り・色・Region | Fill / Region | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| C. 線画・Region Intelligence | Line Connectivity Analysis | Core | 塗り・色・Region | Color | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| C. 線画・Region Intelligence | Region Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas | Left Pin可 / Left → All Features → 選択・変形 → Selection → Region Selection → Canvas mode |
| C. 線画・Region Intelligence | Region Fill | Required | 塗り・色・Region | Fill / Region | Command/Feature | command | Left → All Features → 塗り・色・Region → Fill / Region → Region Fill |
| C. 線画・Region Intelligence | Lineart-linked Coloring | Core | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → Lineart-linked Coloring |
| C. 線画・Region Intelligence | 追従強度・条件設定 | Required | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → 追従強度・条件設定 |
| C. 線画・Region Intelligence | 変更結果の確認・Undo | Required | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → 変更結果の確認・Undo |
| C. 線画・Region Intelligence | Semantic Region Label | Investigate | 塗り・色・Region | Fill / Region | Command/Feature | command | Left → All Features → 塗り・色・Region → Fill / Region → Semantic Region Label |
| D. 塗り・彩色 | Flood Fill | Core | 塗り・色・Region | Fill / Region | Tool/Mode | canvas | Left Pin可 / Left → All Features → 塗り・色・Region → Fill / Region → Flood Fill → Canvas mode |
| D. 塗り・彩色 | Gap Closing | Required | 塗り・色・Region | Fill / Region | Setting/Property | rightPiP | Left → All Features → 塗り・色・Region → Fill / Region → Gap Closing → Right PiP/Settings |
| D. 塗り・彩色 | Gap Tolerance | Required | 塗り・色・Region | Fill / Region | Setting/Property | rightPiP | Left → All Features → 塗り・色・Region → Fill / Region → Gap Tolerance → Right PiP/Settings |
| D. 塗り・彩色 | Boundary Expand / Contract | Required | 塗り・色・Region | Fill / Region | Command/Feature | command | Left → All Features → 塗り・色・Region → Fill / Region → Boundary Expand / Contract |
| D. 塗り・彩色 | Multi-layer Reference Fill | Required | 塗り・色・Region | Fill / Region | Setting/Property | rightPiP | Left → All Features → 塗り・色・Region → Fill / Region → Multi-layer Reference Fill → Right PiP/Settings |
| D. 塗り・彩色 | Lineart Reference Fill | Required | 塗り・色・Region | Fill / Region | Setting/Property | rightPiP | Left → All Features → 塗り・色・Region → Fill / Region → Lineart Reference Fill → Right PiP/Settings |
| D. 塗り・彩色 | Color Difference Tolerance | Required | 塗り・色・Region | Color | Setting/Property | rightPiP | Left → All Features → 塗り・色・Region → Color → Color Difference Tolerance → Right PiP/Settings |
| D. 塗り・彩色 | Enclose and Fill | Required | 塗り・色・Region | Fill / Region | Tool/Mode | canvas | Left Pin可 / Left → All Features → 塗り・色・Region → Fill / Region → Enclose and Fill → Canvas mode |
| D. 塗り・彩色 | Trace and Fill | Required | 塗り・色・Region | Fill / Region | Tool/Mode | canvas | Left Pin可 / Left → All Features → 塗り・色・Region → Fill / Region → Trace and Fill → Canvas mode |
| D. 塗り・彩色 | Drag Fill | Required | 塗り・色・Region | Fill / Region | Tool/Mode | canvas | Left Pin可 / Left → All Features → 塗り・色・Region → Fill / Region → Drag Fill → Canvas mode |
| D. 塗り・彩色 | Continuous Region Fill | Required | 塗り・色・Region | Fill / Region | Tool/Mode | canvas | Left Pin可 / Left → All Features → 塗り・色・Region → Fill / Region → Continuous Region Fill → Canvas mode |
| D. 塗り・彩色 | Smart Fill 統合UI | Core | 塗り・色・Region | Fill / Region | Command/Feature | command | Left → All Features → 塗り・色・Region → Fill / Region → Smart Fill 統合UI |
| D. 塗り・彩色 | Smart Color Assist | Core | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → Smart Color Assist |
| D. 塗り・彩色 | Base Color候補 | Required / Investigate | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → Base Color候補 |
| D. 塗り・彩色 | Palette候補 | Required / Investigate | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → Palette候補 |
| D. 塗り・彩色 | 隣接色調和支援 | Required / Investigate | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → 隣接色調和支援 |
| D. 塗り・彩色 | Region Recolor | Required | 塗り・色・Region | Fill / Region | Command/Feature | command | Left → All Features → 塗り・色・Region → Fill / Region → Region Recolor |
| D. 塗り・彩色 | Shadow / Highlight候補 | Investigate | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → Shadow / Highlight候補 |
| D. 塗り・彩色 | Color Temperature調整 | Required | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → Color Temperature調整 |
| D. 塗り・彩色 | 全体色調整 | Required | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → 全体色調整 |
| E. カラーシステム | Color Picker | Core | 塗り・色・Region | Color | Panel/Workspace | rightPiP | Left → All Features → 塗り・色・Region → Color → Color Picker → Right magnetic PiPをopen/focus |
| E. カラーシステム | Canvas Eyedropper | Core | 塗り・色・Region | Color | Tool/Mode | canvas | Left Pin可 / Left → All Features → 塗り・色・Region → Color → Canvas Eyedropper → Canvas mode |
| E. カラーシステム | Reference Eyedropper | Core | 塗り・色・Region | Color | Tool/Mode | canvas | Left Pin可 / Left → All Features → 塗り・色・Region → Color → Reference Eyedropper → Canvas mode |
| E. カラーシステム | Color History | Required | 塗り・色・Region | Color | Setting/Property | rightPiP | Left → All Features → 塗り・色・Region → Color → Color History → Right PiP/Settings |
| E. カラーシステム | Palette | Required | 塗り・色・Region | Color | Panel/Workspace | rightPiP | Left → All Features → 塗り・色・Region → Color → Palette → Right magnetic PiPをopen/focus |
| E. カラーシステム | Palette Import / Export | Required | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → Palette Import / Export |
| E. カラーシステム | HSV/HSL/RGB等のカラーコントロール | Required | 塗り・色・Region | Color | Setting/Property | rightPiP | Left → All Features → 塗り・色・Region → Color → HSV/HSL/RGB等のカラーコントロール → Right PiP/Settings |
| E. カラーシステム | Color Harmony支援 | Required / Investigate | 塗り・色・Region | Color | Setting/Property | rightPiP | Left → All Features → 塗り・色・Region → Color → Color Harmony支援 → Right PiP/Settings |
| E. カラーシステム | Grayscale Preview | Required | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → Grayscale Preview |
| E. カラーシステム | Color Management / ICC | Core / Investigate | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Color Management → Color Management / ICC → Right PiP/Properties |
| E. カラーシステム | Wide Gamut | Core / Investigate | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Color Management → Wide Gamut → Right PiP/Properties |
| E. カラーシステム | 8-bit integer | Required | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Color Management → 8-bit integer → Right PiP/Properties |
| E. カラーシステム | 16-bit integer | Required | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Color Management → 16-bit integer → Right PiP/Properties |
| E. カラーシステム | 16-bit float | Required / Investigate | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Color Management → 16-bit float → Right PiP/Properties |
| E. カラーシステム | 32-bit float | Investigate | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Color Management → 32-bit float → Right PiP/Properties |
| E. カラーシステム | Embedded ICC Profile | Required | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Color Management → Embedded ICC Profile → Right PiP/Properties |
| E. カラーシステム | Profile Conversion / Display Transform | Required | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Color Management → Profile Conversion / Display Transform → Right PiP/Properties |
| E. カラーシステム | Linear-light Processing Path | Core / Investigate | ドキュメント・編集・出力 | Color Management | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Color Management → Linear-light Processing Path |
| E. カラーシステム | HDR-capable Architecture | Core / Investigate | ドキュメント・編集・出力 | Color Management | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Color Management → HDR-capable Architecture |
| E. カラーシステム | CMYK Native Editing | Investigate | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Color Management → CMYK Native Editing → Right PiP/Properties |
| E. カラーシステム | Soft Proof | Required | ドキュメント・編集・出力 | Document / Save | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Document / Save → Soft Proof → Right PiP/Settings |
| E. カラーシステム | Out-of-Gamut Warning | Required | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Color Management → Out-of-Gamut Warning → Right PiP/Settings |
| E. カラーシステム | Rendering Intent / Black Point Compensation | Required / Investigate | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP | Left → All Features → ドキュメント・編集・出力 → Color Management → Rendering Intent / Black Point Compensation → Right PiP/Properties |
| F. レイヤー | Raster Layer | Core | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Raster Layer |
| F. レイヤー | Vector Layer | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Vector Layer |
| F. レイヤー | Vector Path / Anchor / Bezier Handle | Required | ベクター・文字・図形 | Vector | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Vector → Vector Path / Anchor / Bezier Handle |
| F. レイヤー | Vector Stroke Width / Fill / Stroke | Required | ベクター・文字・図形 | Vector | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Vector → Vector Stroke Width / Fill / Stroke |
| F. レイヤー | Vector Node Add/Delete/Convert | Required | ベクター・文字・図形 | Vector | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Vector → Vector Node Add/Delete/Convert |
| F. レイヤー | Vector Simplify / Smooth | Required | ベクター・文字・図形 | Vector | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Vector → Vector Simplify / Smooth |
| F. レイヤー | Vector Boolean Operation | Required | ベクター・文字・図形 | Vector | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Vector → Vector Boolean Operation |
| F. レイヤー | Vector Eraser / Line Erase | Required | ベクター・文字・図形 | Vector | Tool/Mode | canvas | Left Pin可 / Left → All Features → ベクター・文字・図形 → Vector → Vector Eraser / Line Erase → Canvas mode |
| F. レイヤー | Rasterize Vector | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Rasterize Vector |
| F. レイヤー | Variable-width Vector Stroke | Required / Investigate | ベクター・文字・図形 | Vector | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Vector → Variable-width Vector Stroke |
| F. レイヤー | Brush-like Rendering on Vector Path | Investigate | ベクター・文字・図形 | Vector | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Vector → Brush-like Rendering on Vector Path |
| F. レイヤー | Group | Core | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Group |
| F. レイヤー | Mask | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Mask |
| F. レイヤー | Clipping | Core | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Clipping |
| F. レイヤー | Alpha Lock / Lock Transparency | Core | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Alpha Lock / Lock Transparency |
| F. レイヤー | Alpha Inheritance / Clipping-equivalent | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Alpha Inheritance / Clipping-equivalent |
| F. レイヤー | Persistent Clipping Control | Core | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Persistent Clipping Control |
| F. レイヤー | Adjustment Layer | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Adjustment Layer |
| F. レイヤー | Filter Layer | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Filter Layer |
| F. レイヤー | Layer Style / Layer Effect | Required | レイヤー・合成 | Layer Effects | Command/Feature | command | Left → All Features → レイヤー・合成 → Layer Effects → Layer Style / Layer Effect |
| F. レイヤー | Text Layer / Entity | Required | ベクター・文字・図形 | Text | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Text → Text Layer / Entity |
| F. レイヤー | Horizontal / Vertical Text | Required | ベクター・文字・図形 | Text | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Text → Horizontal / Vertical Text |
| F. レイヤー | Font Family / Style / Size | Required | ベクター・文字・図形 | Text | Setting/Property | rightPiP | Left → All Features → ベクター・文字・図形 → Text → Font Family / Style / Size → Right PiP/Settings |
| F. レイヤー | Tracking / Line Height / Baseline | Required | ベクター・文字・図形 | Text | Setting/Property | rightPiP | Left → All Features → ベクター・文字・図形 → Text → Tracking / Line Height / Baseline → Right PiP/Settings |
| F. レイヤー | Font Import | Required | ベクター・文字・図形 | Text | Setting/Property | rightPiP | Left → All Features → ベクター・文字・図形 → Text → Font Import → Right PiP/Settings |
| F. レイヤー | Missing Font Handling | Required | ベクター・文字・図形 | Text | Setting/Property | rightPiP | Left → All Features → ベクター・文字・図形 → Text → Missing Font Handling → Right PiP/Settings |
| F. レイヤー | Text → Vector/Path | Required | ベクター・文字・図形 | Text | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Text → Text → Vector/Path |
| F. レイヤー | Text on Path / Area Text | Investigate | ベクター・文字・図形 | Text | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Text → Text on Path / Area Text |
| F. レイヤー | Multi-select | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Multi-select |
| F. レイヤー | Drag Reorder | Core | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Drag Reorder |
| F. レイヤー | Search | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Search |
| F. レイヤー | Filter | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Filter |
| F. レイヤー | Color Tag | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Color Tag |
| F. レイヤー | Lock種別 | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Lock種別 |
| F. レイヤー | Solo / Isolate | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Solo / Isolate |
| F. レイヤー | Collapse | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Collapse |
| F. レイヤー | Duplicate | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Duplicate |
| F. レイヤー | Merge | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Merge |
| F. レイヤー | Merge Visible | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Merge Visible |
| F. レイヤー | Flatten Copy | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Flatten Copy |
| F. レイヤー | Layer Comps | Core | レイヤー・合成 | Layers / Compositing | Panel/Workspace | rightPiP | Left → All Features → レイヤー・合成 → Layers / Compositing → Layer Comps → Right magnetic PiPをopen/focus |
| F. レイヤー | Canvasから直接Layer選択 | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Canvasから直接Layer選択 |
| F. レイヤー | 大量レイヤーUI性能 | Core | レイヤー・合成 | Layers / Compositing | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| G. 選択・変形 | Rectangle / Ellipse Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas | Left Pin可 / Left → All Features → 選択・変形 → Selection → Rectangle / Ellipse Selection → Canvas mode |
| G. 選択・変形 | Freehand Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas | Left Pin可 / Left → All Features → 選択・変形 → Selection → Freehand Selection → Canvas mode |
| G. 選択・変形 | Polygonal Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas | Left Pin可 / Left → All Features → 選択・変形 → Selection → Polygonal Selection → Canvas mode |
| G. 選択・変形 | Color / Similarity Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas | Left Pin可 / Left → All Features → 選択・変形 → Selection → Color / Similarity Selection → Canvas mode |
| G. 選択・変形 | Region Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas | Left Pin可 / Left → All Features → 選択・変形 → Selection → Region Selection → Canvas mode |
| G. 選択・変形 | Add / Subtract / Intersect | Required | 選択・変形 | Transform | Command/Feature | command | Left → All Features → 選択・変形 → Transform → Add / Subtract / Intersect |
| G. 選択・変形 | Invert Selection | Required | 選択・変形 | Selection | Command/Feature | command | Left → All Features → 選択・変形 → Selection → Invert Selection |
| G. 選択・変形 | Feather | Required | 選択・変形 | Selection | Command/Feature | command | Left → All Features → 選択・変形 → Selection → Feather |
| G. 選択・変形 | Expand / Contract | Required | 選択・変形 | Transform | Command/Feature | command | Left → All Features → 選択・変形 → Transform → Expand / Contract |
| G. 選択・変形 | Saved Selection / Selection Mask | Required | 選択・変形 | Selection | Command/Feature | command | Left → All Features → 選択・変形 → Selection → Saved Selection / Selection Mask |
| G. 選択・変形 | Select from Layer Content | Required | 選択・変形 | Selection | Command/Feature | command | Left → All Features → 選択・変形 → Selection → Select from Layer Content |
| G. 選択・変形 | Luminance / Color-range Selection | Required | 選択・変形 | Selection | Command/Feature | command | Left → All Features → 選択・変形 → Selection → Luminance / Color-range Selection |
| G. 選択・変形 | Move / Scale / Rotate | Core | 選択・変形 | Transform | Tool/Mode | canvas | Left Pin可 / Left → All Features → 選択・変形 → Transform → Move / Scale / Rotate → Canvas mode |
| G. 選択・変形 | Flip | Required | 選択・変形 | Transform | Command/Feature | command | Left → All Features → 選択・変形 → Transform → Flip |
| G. 選択・変形 | Free Transform | Required | 選択・変形 | Transform | Tool/Mode | canvas | Left Pin可 / Left → All Features → 選択・変形 → Transform → Free Transform → Canvas mode |
| G. 選択・変形 | Perspective / Distort | Required | 選択・変形 | Transform | Tool/Mode | canvas | Left Pin可 / Left → All Features → 選択・変形 → Transform → Perspective / Distort → Canvas mode |
| G. 選択・変形 | Warp | Required | 選択・変形 | Transform | Tool/Mode | canvas | Left Pin可 / Left → All Features → 選択・変形 → Transform → Warp → Canvas mode |
| G. 選択・変形 | Liquify | Required | 選択・変形 | Transform | Tool/Mode | canvas | Left Pin可 / Left → All Features → 選択・変形 → Transform → Liquify → Canvas mode |
| G. 選択・変形 | Transform Interpolation | Required | 選択・変形 | Transform | Setting/Property | rightPiP | Left → All Features → 選択・変形 → Transform → Transform Interpolation → Right PiP/Settings |
| H. 非破壊編集・合成 | Adjustment Layer | Required | 補正・フィルター・修復 | Adjust / Filter | Command/Feature | command | Left → All Features → 補正・フィルター・修復 → Adjust / Filter → Adjustment Layer |
| H. 非破壊編集・合成 | Filter Layer | Required | 補正・フィルター・修復 | Adjust / Filter | Command/Feature | command | Left → All Features → 補正・フィルター・修復 → Adjust / Filter → Filter Layer |
| H. 非破壊編集・合成 | Live Blur | Required | 補正・フィルター・修復 | Adjust / Filter | Command/Feature | command | Left → All Features → 補正・フィルター・修復 → Adjust / Filter → Live Blur |
| H. 非破壊編集・合成 | Live Color Adjustment | Required | 補正・フィルター・修復 | Adjust / Filter | Command/Feature | command | Left → All Features → 補正・フィルター・修復 → Adjust / Filter → Live Color Adjustment |
| H. 非破壊編集・合成 | Mask | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Mask |
| H. 非破壊編集・合成 | Vector Mask | Required / Investigate | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Vector Mask |
| H. 非破壊編集・合成 | Clipping Mask | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Clipping Mask |
| H. 非破壊編集・合成 | Blend Mode | Core | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Blend Mode |
| H. 非破壊編集・合成 | Painting Blend Modes | Required | レイヤー・合成 | Layers / Compositing | Command/Feature | command | Left → All Features → レイヤー・合成 → Layers / Compositing → Painting Blend Modes |
| H. 非破壊編集・合成 | Blend Mode Live Preview | Required | レイヤー・合成 | Layers / Compositing | Subfeature/Property | rightPiP | Left → All Features → レイヤー・合成 → Layers / Compositing → parent feature → Blend Mode Live Preview |
| H. 非破壊編集・合成 | Blend If 相当 | Core | 補正・フィルター・修復 | Adjust / Filter | Command/Feature | command | Left → All Features → 補正・フィルター・修復 → Adjust / Filter → Blend If 相当 |
| H. 非破壊編集・合成 | Displacement | Required / Investigate | 補正・フィルター・修復 | Adjust / Filter | Command/Feature | command | Left → All Features → 補正・フィルター・修復 → Adjust / Filter → Displacement |
| H. 非破壊編集・合成 | Healing | Required | 補正・フィルター・修復 | Retouch | Tool/Mode | canvas | Left Pin可 / Left → All Features → 補正・フィルター・修復 → Retouch → Healing → Canvas mode |
| H. 非破壊編集・合成 | Patch | Required | 補正・フィルター・修復 | Retouch | Tool/Mode | canvas | Left Pin可 / Left → All Features → 補正・フィルター・修復 → Retouch → Patch → Canvas mode |
| H. 非破壊編集・合成 | Clone | Required | 補正・フィルター・修復 | Retouch | Tool/Mode | canvas | Left Pin可 / Left → All Features → 補正・フィルター・修復 → Retouch → Clone → Canvas mode |
| H. 非破壊編集・合成 | Core Adjustment Set | Required | 補正・フィルター・修復 | Adjust / Filter | Command/Feature | command | Left → All Features → 補正・フィルター・修復 → Adjust / Filter → Core Adjustment Set |
| H. 非破壊編集・合成 | Core Live Filter Set | Required | 補正・フィルター・修復 | Adjust / Filter | Command/Feature | command | Left → All Features → 補正・フィルター・修復 → Adjust / Filter → Core Live Filter Set |
| H. 非破壊編集・合成 | Filter Masking / Reorder / Opacity / Blend | Required | レイヤー・合成 | Layers / Compositing | Subfeature/Property | rightPiP | Left → All Features → レイヤー・合成 → Layers / Compositing → parent feature → Filter Masking / Reorder / Opacity / Blend |
| H. 非破壊編集・合成 | Destructive Apply Command | Required | 補正・フィルター・修復 | Adjust / Filter | Command/Feature | command | Left → All Features → 補正・フィルター・修復 → Adjust / Filter → Destructive Apply Command |
| H. 非破壊編集・合成 | Layer Style: Stroke | Required | レイヤー・合成 | Layer Effects | Command/Feature | command | Left → All Features → レイヤー・合成 → Layer Effects → Layer Style: Stroke |
| H. 非破壊編集・合成 | Layer Style: Drop/Inner Shadow | Required | レイヤー・合成 | Layer Effects | Command/Feature | command | Left → All Features → レイヤー・合成 → Layer Effects → Layer Style: Drop/Inner Shadow |
| H. 非破壊編集・合成 | Layer Style: Outer/Inner Glow | Required | レイヤー・合成 | Layer Effects | Command/Feature | command | Left → All Features → レイヤー・合成 → Layer Effects → Layer Style: Outer/Inner Glow |
| H. 非破壊編集・合成 | Layer Style: Color/Gradient/Pattern Overlay | Required | レイヤー・合成 | Layer Effects | Command/Feature | command | Left → All Features → レイヤー・合成 → Layer Effects → Layer Style: Color/Gradient/Pattern Overlay |
| H. 非破壊編集・合成 | Layer Style: Bevel/Emboss | Required | レイヤー・合成 | Layer Effects | Command/Feature | command | Left → All Features → レイヤー・合成 → Layer Effects → Layer Style: Bevel/Emboss |
| I. Reference System | Reference Workspace | Core | 資料・アセット | Reference | Panel/Workspace | rightPiP | Left → All Features → 資料・アセット → Reference → Reference Workspace → Right magnetic PiPをopen/focus |
| I. Reference System | 複数Reference | Required | 資料・アセット | Reference | Subfeature/Property | rightPiP | Left → All Features → 資料・アセット → Reference → parent feature → 複数Reference |
| I. Reference System | 自由配置 | Required | 資料・アセット | Asset Library | Subfeature/Property | rightPiP | Left → All Features → 資料・アセット → Asset Library → parent feature → 自由配置 |
| I. Reference System | Pin | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Pin |
| I. Reference System | Scale / Rotate | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Scale / Rotate |
| I. Reference System | Horizontal Flip | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Horizontal Flip |
| I. Reference System | Grayscale | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Grayscale |
| I. Reference System | Always on Top | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Always on Top |
| I. Reference System | Temporary Hide | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Temporary Hide |
| I. Reference System | Reference Group | Required | 資料・アセット | Reference | Command/Feature | command | Left → All Features → 資料・アセット → Reference → Reference Group |
| I. Reference System | Reference Persistence | Required | 資料・アセット | Reference | Subfeature/Property | rightPiP | Left → All Features → 資料・アセット → Reference → parent feature → Reference Persistence |
| I. Reference System | Reference Eyedropper | Core | 資料・アセット | Reference | Tool/Mode | canvas | Left Pin可 / Left → All Features → 資料・アセット → Reference → Reference Eyedropper → Canvas mode |
| J. 履歴・Snapshot・分岐 | Undo | Core | 履歴・自動化 | History / Snapshot | Command/Feature | command | Left → All Features → 履歴・自動化 → History / Snapshot → Undo |
| J. 履歴・Snapshot・分岐 | Redo | Core | 履歴・自動化 | History / Snapshot | Command/Feature | command | Left → All Features → 履歴・自動化 → History / Snapshot → Redo |
| J. 履歴・Snapshot・分岐 | Command単位履歴 | Core | 履歴・自動化 | History / Snapshot | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| J. 履歴・Snapshot・分岐 | Snapshot System | Core | 履歴・自動化 | History / Snapshot | Panel/Workspace | rightPiP | Left → All Features → 履歴・自動化 → History / Snapshot → Snapshot System → Right magnetic PiPをopen/focus |
| J. 履歴・Snapshot・分岐 | Snapshot比較 | Required | 履歴・自動化 | History / Snapshot | Command/Feature | command | Left → All Features → 履歴・自動化 → History / Snapshot → Snapshot比較 |
| J. 履歴・Snapshot・分岐 | Snapshot分岐 | Required / Investigate | 履歴・自動化 | History / Snapshot | Command/Feature | command | Left → All Features → 履歴・自動化 → History / Snapshot → Snapshot分岐 |
| J. 履歴・Snapshot・分岐 | History Panel | Required | 履歴・自動化 | History / Snapshot | Panel/Workspace | rightPiP | Left → All Features → 履歴・自動化 → History / Snapshot → History Panel → Right magnetic PiPをopen/focus |
| K. Timelapse・作業時間 | 制作履歴ベースTimelapse | Core | 履歴・自動化 | Timelapse / Work Time | Panel/Workspace | rightPiP | Left → All Features → 履歴・自動化 → Timelapse / Work Time → 制作履歴ベースTimelapse → Right magnetic PiPをopen/focus |
| K. Timelapse・作業時間 | UIを含めない出力 | Required | 履歴・自動化 | History / Snapshot | Subfeature/Property | rightPiP | Left → All Features → 履歴・自動化 → History / Snapshot → parent feature → UIを含めない出力 |
| K. Timelapse・作業時間 | High-resolution Export | Required | 履歴・自動化 | History / Snapshot | Subfeature/Property | rightPiP | Left → All Features → 履歴・自動化 → History / Snapshot → parent feature → High-resolution Export |
| K. Timelapse・作業時間 | Frame Pace調整 | Required | 履歴・自動化 | History / Snapshot | Subfeature/Property | rightPiP | Left → All Features → 履歴・自動化 → History / Snapshot → parent feature → Frame Pace調整 |
| K. Timelapse・作業時間 | Work Time | Core | 履歴・自動化 | Timelapse / Work Time | Panel/Workspace | rightPiP | Left → All Features → 履歴・自動化 → Timelapse / Work Time → Work Time → Right magnetic PiPをopen/focus |
| K. Timelapse・作業時間 | Session | Required | 履歴・自動化 | Timelapse / Work Time | Subfeature/Property | rightPiP | Left → All Features → 履歴・自動化 → Timelapse / Work Time → parent feature → Session |
| K. Timelapse・作業時間 | Today | Required | 履歴・自動化 | Timelapse / Work Time | Subfeature/Property | rightPiP | Left → All Features → 履歴・自動化 → Timelapse / Work Time → parent feature → Today |
| K. Timelapse・作業時間 | Total | Required | 履歴・自動化 | Timelapse / Work Time | Subfeature/Property | rightPiP | Left → All Features → 履歴・自動化 → Timelapse / Work Time → parent feature → Total |
| K. Timelapse・作業時間 | Average | Required | 履歴・自動化 | Timelapse / Work Time | Subfeature/Property | rightPiP | Left → All Features → 履歴・自動化 → Timelapse / Work Time → parent feature → Average |
| K. Timelapse・作業時間 | Inactivity除外 | Required | 履歴・自動化 | History / Snapshot | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| L. Automation | Auto Actions / Macros | Core | 履歴・自動化 | Automation | Panel/Workspace | rightPiP | Left → All Features → 履歴・自動化 → Automation → Auto Actions / Macros → Right magnetic PiPをopen/focus |
| L. Automation | Action Recording | Required | 履歴・自動化 | Automation | Command/Feature | command | Left → All Features → 履歴・自動化 → Automation → Action Recording |
| L. Automation | Parameterized Action | Required / Investigate | 履歴・自動化 | Automation | Command/Feature | command | Left → All Features → 履歴・自動化 → Automation → Parameterized Action |
| L. Automation | Macro Preset | Required | 履歴・自動化 | Automation | Command/Feature | command | Left → All Features → 履歴・自動化 → Automation → Macro Preset |
| L. Automation | Shortcut Assignment | Required | 履歴・自動化 | Automation | Command/Feature | command | Left → All Features → 履歴・自動化 → Automation → Shortcut Assignment |
| L. Automation | Quick Menu登録 | Required | 履歴・自動化 | Automation | Command/Feature | command | Left → All Features → 履歴・自動化 → Automation → Quick Menu登録 |
| M. UI・Workspace・操作体系 | Canvas First | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| M. UI・Workspace・操作体系 | Direct Manipulation | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| M. UI・Workspace・操作体系 | Context UI | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| M. UI・Workspace・操作体系 | Quick Menu | Core | ワークスペース・設定 | Workspace / Settings | Command/Feature | command | Left → All Features → ワークスペース・設定 → Workspace / Settings → Quick Menu |
| M. UI・Workspace・操作体系 | Command / Tool Search | Required | ワークスペース・設定 | Workspace / Settings | Command/Feature | command | Left → All Features → ワークスペース・設定 → Workspace / Settings → Command / Tool Search |
| M. UI・Workspace・操作体系 | Dock Panel | Required | ワークスペース・設定 | Workspace / Settings | Command/Feature | command | Left → All Features → ワークスペース・設定 → Workspace / Settings → Dock Panel |
| M. UI・Workspace・操作体系 | Undock / Floating | Required | ワークスペース・設定 | Workspace / Settings | Command/Feature | command | Left → All Features → ワークスペース・設定 → Workspace / Settings → Undock / Floating |
| M. UI・Workspace・操作体系 | Panel Resize / Reorder / Hide | Required | ワークスペース・設定 | Workspace / Settings | Command/Feature | command | Left → All Features → ワークスペース・設定 → Workspace / Settings → Panel Resize / Reorder / Hide |
| M. UI・Workspace・操作体系 | Workspace Save / Load | Required | ワークスペース・設定 | Workspace / Settings | Setting/Property | rightPiP | Left → All Features → ワークスペース・設定 → Workspace / Settings → Workspace Save / Load → Right PiP/Settings |
| M. UI・Workspace・操作体系 | Canvas Focus Mode | Core | キャンバス・表示 | Canvas / View | Command/Feature | command | Left → All Features → キャンバス・表示 → Canvas / View → Canvas Focus Mode |
| M. UI・Workspace・操作体系 | Workspace Preset | Required | ワークスペース・設定 | Workspace / Settings | Setting/Property | rightPiP | Left → All Features → ワークスペース・設定 → Workspace / Settings → Workspace Preset → Right PiP/Settings |
| M. UI・Workspace・操作体系 | 左右UI反転 | Required | ワークスペース・設定 | Workspace / Settings | Command/Feature | command | Left → All Features → ワークスペース・設定 → Workspace / Settings → 左右UI反転 |
| M. UI・Workspace・操作体系 | Keyboard Shortcut | Core | ワークスペース・設定 | Input / Accessibility | Command/Feature | command | Left → All Features → ワークスペース・設定 → Input / Accessibility → Keyboard Shortcut |
| M. UI・Workspace・操作体系 | Gesture | Core | ワークスペース・設定 | Input / Accessibility | Command/Feature | command | Left → All Features → ワークスペース・設定 → Input / Accessibility → Gesture |
| M. UI・Workspace・操作体系 | Hover | Required | ワークスペース・設定 | Input / Accessibility | Command/Feature | command | Left → All Features → ワークスペース・設定 → Input / Accessibility → Hover |
| M. UI・Workspace・操作体系 | 右クリック / Context Click | Required | ワークスペース・設定 | Workspace / Settings | Command/Feature | command | Left → All Features → ワークスペース・設定 → Workspace / Settings → 右クリック / Context Click |
| M. UI・Workspace・操作体系 | Custom Toolbar | Required | ワークスペース・設定 | Workspace / Settings | Setting/Property | rightPiP | Left → All Features → ワークスペース・設定 → Workspace / Settings → Custom Toolbar → Right PiP/Settings |
| M. UI・Workspace・操作体系 | Custom Shortcut | Required | ワークスペース・設定 | Input / Accessibility | Setting/Property | settings | Left → All Features → ワークスペース・設定 → Input / Accessibility → Custom Shortcut → Dedicated Settings surface |
| M. UI・Workspace・操作体系 | Keyboard Shortcut Capture | Required | ワークスペース・設定 | Input / Accessibility | Command/Feature | command | Left → All Features → ワークスペース・設定 → Input / Accessibility → Keyboard Shortcut Capture |
| M. UI・Workspace・操作体系 | Custom Gesture | Required | ワークスペース・設定 | Input / Accessibility | Setting/Property | settings | Left → All Features → ワークスペース・設定 → Input / Accessibility → Custom Gesture → Dedicated Settings surface |
| M. UI・Workspace・操作体系 | Scalable UI / Text | Required | ワークスペース・設定 | Workspace / Settings | Setting/Property | settings | Left → All Features → ワークスペース・設定 → Workspace / Settings → Scalable UI / Text → Dedicated Settings surface |
| M. UI・Workspace・操作体系 | Single-pointer Alternative | Required | ワークスペース・設定 | Workspace / Settings | Command/Feature | command | Left → All Features → ワークスペース・設定 → Workspace / Settings → Single-pointer Alternative |
| M. UI・Workspace・操作体系 | Color-independent State Indication | Required | ワークスペース・設定 | Workspace / Settings | Command/Feature | command | Left → All Features → ワークスペース・設定 → Workspace / Settings → Color-independent State Indication |
| M. UI・Workspace・操作体系 | Color Description Assistance | Required | ワークスペース・設定 | Workspace / Settings | Setting/Property | settings | Left → All Features → ワークスペース・設定 → Workspace / Settings → Color Description Assistance → Dedicated Settings surface |
| M. UI・Workspace・操作体系 | Reduced Motion | Required | ワークスペース・設定 | Input / Accessibility | Setting/Property | settings | Left → All Features → ワークスペース・設定 → Input / Accessibility → Reduced Motion → Dedicated Settings surface |
| M. UI・Workspace・操作体系 | Touch Target Policy | Required | ワークスペース・設定 | Input / Accessibility | Setting/Property | settings | Left → All Features → ワークスペース・設定 → Input / Accessibility → Touch Target Policy → Dedicated Settings surface |
| M. UI・Workspace・操作体系 | Feedback Sound / Haptic | Required / Investigate | ワークスペース・設定 | Input / Accessibility | Setting/Property | settings | Left → All Features → ワークスペース・設定 → Input / Accessibility → Feedback Sound / Haptic → Dedicated Settings surface |
| M. UI・Workspace・操作体系 | Keyboard Navigation for Commands | Required | ワークスペース・設定 | Input / Accessibility | Command/Feature | command | Left → All Features → ワークスペース・設定 → Input / Accessibility → Keyboard Navigation for Commands |
| N. デバイス別適応 | Desktop専用最適化UI | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| N. デバイス別適応 | Tablet専用最適化UI | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| N. デバイス別適応 | Smartphone専用最適化UI | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| O. 定規・ガイド・形状・グラデーション | Straight / Parallel Ruler | Required | 定規・ガイド | Guides / Rulers | Command/Feature | command | Left → All Features → 定規・ガイド → Guides / Rulers → Straight / Parallel Ruler |
| O. 定規・ガイド・形状・グラデーション | 2D Grid | Required | 定規・ガイド | Guides / Rulers | Command/Feature | command | Left → All Features → 定規・ガイド → Guides / Rulers → 2D Grid |
| O. 定規・ガイド・形状・グラデーション | Isometric Grid | Required | 定規・ガイド | Guides / Rulers | Command/Feature | command | Left → All Features → 定規・ガイド → Guides / Rulers → Isometric Grid |
| O. 定規・ガイド・形状・グラデーション | Perspective Guide | Required | 定規・ガイド | Guides / Rulers | Command/Feature | command | Left → All Features → 定規・ガイド → Guides / Rulers → Perspective Guide |
| O. 定規・ガイド・形状・グラデーション | Symmetry / Mirror | Required | 定規・ガイド | Guides / Rulers | Command/Feature | command | Left → All Features → 定規・ガイド → Guides / Rulers → Symmetry / Mirror |
| O. 定規・ガイド・形状・グラデーション | Radial Symmetry | Required | 定規・ガイド | Guides / Rulers | Command/Feature | command | Left → All Features → 定規・ガイド → Guides / Rulers → Radial Symmetry |
| O. 定規・ガイド・形状・グラデーション | Guide Snapping | Required | 定規・ガイド | Guides / Rulers | Setting/Property | rightPiP | Left → All Features → 定規・ガイド → Guides / Rulers → Guide Snapping → Right PiP/Settings |
| O. 定規・ガイド・形状・グラデーション | Guide Visibility / Lock | Required | 定規・ガイド | Guides / Rulers | Setting/Property | rightPiP | Left → All Features → 定規・ガイド → Guides / Rulers → Guide Visibility / Lock → Right PiP/Settings |
| O. 定規・ガイド・形状・グラデーション | Guide Preset / Save | Required | 定規・ガイド | Guides / Rulers | Setting/Property | rightPiP | Left → All Features → 定規・ガイド → Guides / Rulers → Guide Preset / Save → Right PiP/Settings |
| O. 定規・ガイド・形状・グラデーション | Line / Rectangle / Ellipse / Polygon | Required | ベクター・文字・図形 | Shape | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Shape → Line / Rectangle / Ellipse / Polygon |
| O. 定規・ガイド・形状・グラデーション | Post-stroke Shape Correction | Required / Investigate | ベクター・文字・図形 | Shape | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Shape → Post-stroke Shape Correction |
| O. 定規・ガイド・形状・グラデーション | Vector-backed Shape | Required / Investigate | ベクター・文字・図形 | Shape | Command/Feature | command | Left → All Features → ベクター・文字・図形 → Shape → Vector-backed Shape |
| O. 定規・ガイド・形状・グラデーション | Linear Gradient | Required | 塗り・色・Region | Gradient | Command/Feature | command | Left → All Features → 塗り・色・Region → Gradient → Linear Gradient |
| O. 定規・ガイド・形状・グラデーション | Radial Gradient | Required | 塗り・色・Region | Gradient | Command/Feature | command | Left → All Features → 塗り・色・Region → Gradient → Radial Gradient |
| O. 定規・ガイド・形状・グラデーション | Reflected / Bilinear Gradient | Required | 塗り・色・Region | Gradient | Command/Feature | command | Left → All Features → 塗り・色・Region → Gradient → Reflected / Bilinear Gradient |
| O. 定規・ガイド・形状・グラデーション | Shape-aware Gradient | Required / Investigate | 塗り・色・Region | Gradient | Command/Feature | command | Left → All Features → 塗り・色・Region → Gradient → Shape-aware Gradient |
| O. 定規・ガイド・形状・グラデーション | Editable Gradient Stops | Required | 塗り・色・Region | Gradient | Subfeature/Property | rightPiP | Left → All Features → 塗り・色・Region → Gradient → parent feature → Editable Gradient Stops |
| O. 定規・ガイド・形状・グラデーション | Non-destructive Gradient | Required | 塗り・色・Region | Gradient | Subfeature/Property | rightPiP | Left → All Features → 塗り・色・Region → Gradient → parent feature → Non-destructive Gradient |
| O. 定規・ガイド・形状・グラデーション | Gradient Map | Required | 塗り・色・Region | Gradient | Command/Feature | command | Left → All Features → 塗り・色・Region → Gradient → Gradient Map |
| O. 定規・ガイド・形状・グラデーション | Gradient Dithering | Required / Investigate | 塗り・色・Region | Gradient | Subfeature/Property | rightPiP | Left → All Features → 塗り・色・Region → Gradient → parent feature → Gradient Dithering |
| O.1 Clipboard / Cross-document Editing | Internal Clipboard | Core | ドキュメント・編集・出力 | Document / Save | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| O.1 Clipboard / Cross-document Editing | Copy / Cut / Paste | Core | ドキュメント・編集・出力 | Document / Save | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Document / Save → Copy / Cut / Paste |
| O.1 Clipboard / Cross-document Editing | Copy Merged | Required | ドキュメント・編集・出力 | Document / Save | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Document / Save → Copy Merged |
| O.1 Clipboard / Cross-document Editing | Paste in Place | Required | ドキュメント・編集・出力 | Document / Save | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Document / Save → Paste in Place |
| O.1 Clipboard / Cross-document Editing | Native cross-document payload | Required | ドキュメント・編集・出力 | Document / Save | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| O.1 Clipboard / Cross-document Editing | System Clipboard Bridge | Required / Investigate | ドキュメント・編集・出力 | Document / Save | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Document / Save → System Clipboard Bridge |
| O.1 Clipboard / Cross-document Editing | Desktop Drag & Drop | Required | ドキュメント・編集・出力 | Document / Save | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Document / Save → Desktop Drag & Drop |
| O.2 Localization | Localizable UI resources | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| O.2 Localization | Japanese/CJK layout support | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| O.2 Localization | Locale-aware units/date/number | Required | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| O.2 Localization | Shipping locale set | Investigate | ワークスペース・設定 | Workspace / Settings | Setting/Property | settings | Left → All Features → ワークスペース・設定 → Workspace / Settings → Shipping locale set → Dedicated Settings surface |
| P. ファイル・保存・Recovery・Offline | .illustro | Core | ドキュメント・編集・出力 | Document / Save | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Document / Save → .illustro |
| P. ファイル・保存・Recovery・Offline | PNG Export | Required | ドキュメント・編集・出力 | Import / Export | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Import / Export → PNG Export |
| P. ファイル・保存・Recovery・Offline | JPEG Export | Required | ドキュメント・編集・出力 | Import / Export | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Import / Export → JPEG Export |
| P. ファイル・保存・Recovery・Offline | WebP Export | Required | ドキュメント・編集・出力 | Import / Export | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Import / Export → WebP Export |
| P. ファイル・保存・Recovery・Offline | PSD Import / Export | Investigate / High Priority | ドキュメント・編集・出力 | Import / Export | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Import / Export → PSD Import / Export |
| P. ファイル・保存・Recovery・Offline | OpenRaster (.ora) | Required | ドキュメント・編集・出力 | Import / Export | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Import / Export → OpenRaster (.ora) |
| P. ファイル・保存・Recovery・Offline | TIFF | Required | ドキュメント・編集・出力 | Import / Export | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Import / Export → TIFF |
| P. ファイル・保存・Recovery・Offline | SVG Import / Export | Required / Investigate | ドキュメント・編集・出力 | Import / Export | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Import / Export → SVG Import / Export |
| P. ファイル・保存・Recovery・Offline | OpenEXR | Required / Investigate | ドキュメント・編集・出力 | Import / Export | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Import / Export → OpenEXR |
| P. ファイル・保存・Recovery・Offline | AVIF / HEIF | Investigate | ドキュメント・編集・出力 | Import / Export | Command/Feature | command | Left → All Features → ドキュメント・編集・出力 → Import / Export → AVIF / HEIF |
| P. ファイル・保存・Recovery・Offline | Auto Save | Core | ドキュメント・編集・出力 | Document / Save | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| P. ファイル・保存・Recovery・Offline | Crash Recovery | Core | ドキュメント・編集・出力 | Document / Save | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| P. ファイル・保存・Recovery・Offline | Recovery Snapshot | Core | ドキュメント・編集・出力 | Document / Save | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| P. ファイル・保存・Recovery・Offline | Incremental Save | Core | ドキュメント・編集・出力 | Document / Save | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| P. ファイル・保存・Recovery・Offline | 描画を止めない保存 | Core | ドキュメント・編集・出力 | Document / Save | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| P. ファイル・保存・Recovery・Offline | Offline First | Core | ドキュメント・編集・出力 | Document / Save | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| P. ファイル・保存・Recovery・Offline | 通常編集でログイン不要 | Core | ドキュメント・編集・出力 | Document / Save | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| P. ファイル・保存・Recovery・Offline | PWA Install | Investigate | ドキュメント・編集・出力 | Document / Save | Subfeature/Property | settings | Left → All Features → ドキュメント・編集・出力 → Document / Save → PWA Install → Dedicated Settings surface |
| Q. Performance・Rendering | 体感0ラグ | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| Q. Performance・Rendering | Low Input Latency | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| Q. Performance・Rendering | Stable Frame Time | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| Q. Performance・Rendering | Worst Frame計測 | Core | ワークスペース・設定 | Workspace / Settings | Diagnostic | settings | Left → All Features → ワークスペース・設定 → Workspace / Settings → Worst Frame計測 → Dedicated Settings surface |
| Q. Performance・Rendering | Memory Scaling | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| Q. Performance・Rendering | Canvas Size Scaling | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| Q. Performance・Rendering | GPU Brush Compositing | Investigate / likely required | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| Q. Performance・Rendering | GPU Filter | Investigate / likely required | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| Q. Performance・Rendering | GPU Transform | Investigate / likely required | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| Q. Performance・Rendering | WebGPU | Investigate | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| Q. Performance・Rendering | GPU Fallback | Required | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| R. AI補助 | 生成AIを中心価値にする | Out of scope | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| R. AI補助 | 色提案 | Investigate | 塗り・色・Region | Color | Command/Feature | command | Left → All Features → 塗り・色・Region → Color → 色提案 |
| R. AI補助 | Region補助 | Investigate | 塗り・色・Region | Fill / Region | Command/Feature | command | Left → All Features → 塗り・色・Region → Fill / Region → Region補助 |
| R. AI補助 | Selection補助 | Investigate | 選択・変形 | Selection | Command/Feature | command | Left → All Features → 選択・変形 → Selection → Selection補助 |
| R. AI補助 | 整理補助 | Investigate | ワークスペース・設定 | Workspace / Settings | Command/Feature | command | Left → All Features → ワークスペース・設定 → Workspace / Settings → 整理補助 |
| R. AI補助 | 修正補助 | Investigate | 補正・フィルター・修復 | Adjust / Filter | Command/Feature | command | Left → All Features → 補正・フィルター・修復 → Adjust / Filter → 修正補助 |
| R. AI補助 | AIなしでも成立する基本機能 | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
| S. 将来の共同編集 | 絵チャ / Collaborative Drawing | Future | ワークスペース・設定 | Workspace / Settings | Future | none | Future。現行Left UIには露出しない。 |
| S. 将来の共同編集 | Realtime Multi-user Editing | Future / Investigate | ワークスペース・設定 | Workspace / Settings | Future | none | Future。現行Left UIには露出しない。 |
| T. Asset Library・Navigator・拡張性 | 2D Asset Library | Required | 資料・アセット | Asset Library | Panel/Workspace | rightPiP | Left → All Features → 資料・アセット → Asset Library → 2D Asset Library → Right magnetic PiPをopen/focus |
| T. Asset Library・Navigator・拡張性 | Brush Asset | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Brush Asset |
| T. Asset Library・Navigator・拡張性 | Brush Tip / Texture Asset | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Brush Tip / Texture Asset |
| T. Asset Library・Navigator・拡張性 | Paper Texture | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Paper Texture |
| T. Asset Library・Navigator・拡張性 | Pattern | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Pattern |
| T. Asset Library・Navigator・拡張性 | Gradient Preset | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Gradient Preset |
| T. Asset Library・Navigator・拡張性 | Color Palette Asset | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Color Palette Asset |
| T. Asset Library・Navigator・拡張性 | Macro Asset | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Macro Asset |
| T. Asset Library・Navigator・拡張性 | Workspace Asset | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Workspace Asset |
| T. Asset Library・Navigator・拡張性 | Reference Set | Required | 資料・アセット | Reference | Command/Feature | command | Left → All Features → 資料・アセット → Reference → Reference Set |
| T. Asset Library・Navigator・拡張性 | Shape Preset | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Shape Preset |
| T. Asset Library・Navigator・拡張性 | Folder / Collection / Tag | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Folder / Collection / Tag |
| T. Asset Library・Navigator・拡張性 | Search / Favorite / Recent | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Search / Favorite / Recent |
| T. Asset Library・Navigator・拡張性 | Asset Import / Export | Required | 資料・アセット | Asset Library | Command/Feature | command | Left → All Features → 資料・アセット → Asset Library → Asset Import / Export |
| T. Asset Library・Navigator・拡張性 | Navigator | Required | キャンバス・表示 | Navigator | Panel/Workspace | rightPiP | Left → All Features → キャンバス・表示 → Navigator → Navigator → Right magnetic PiPをopen/focus |
| T. Asset Library・Navigator・拡張性 | Dock / Float Navigator | Required | キャンバス・表示 | Navigator | Panel/Workspace | rightPiP | Left → All Features → キャンバス・表示 → Navigator → Dock / Float Navigator → Right magnetic PiPをopen/focus |
| T. Asset Library・Navigator・拡張性 | Multi-view of same Document | Investigate | キャンバス・表示 | Navigator | Command/Feature | command | Left → All Features → キャンバス・表示 → Navigator → Multi-view of same Document |
| T. Asset Library・Navigator・拡張性 | Plugin / Extension API | Future / Investigate | ワークスペース・設定 | Workspace / Settings | Command/Feature | command | Left → All Features → ワークスペース・設定 → Workspace / Settings → Plugin / Extension API |
| T. Asset Library・Navigator・拡張性 | Internal Module Boundaries | Core | ワークスペース・設定 | Workspace / Settings | System/Internal | none | ユーザーが直接実行する機能ではない。関連する設定/状態がある場合のみ該当カテゴリから到達。 |
