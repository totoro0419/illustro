# Illustro Left UI Access Coverage

> Generated from `docs/FEATURE_CATALOG.md` on 2026-09-29.
> Purpose: ensure every catalog item is either reachable from the Left UI, explicitly internal/automatic, or explicitly Future.
> This is a design coverage audit, not an implementation-status table.

## Summary

| Category | Catalog items | Canvas | Right PiP | Command | Internal/Future |
|---|---:|---:|---:|---:|---:|
| 描画 | 20 | 4 | 8 | 8 | 0 |
| 塗り・色・Region | 50 | 7 | 12 | 31 | 0 |
| 選択・変形 | 21 | 13 | 1 | 7 | 0 |
| ベクター・文字・図形 | 19 | 5 | 3 | 11 | 0 |
| 定規・ガイド | 9 | 0 | 1 | 8 | 0 |
| レイヤー・合成 | 39 | 0 | 8 | 31 | 0 |
| 補正・フィルター・修復 | 13 | 3 | 0 | 10 | 0 |
| 資料・アセット | 26 | 1 | 6 | 19 | 0 |
| 履歴・自動化 | 23 | 0 | 9 | 14 | 0 |
| キャンバス・表示 | 10 | 0 | 2 | 8 | 0 |
| ドキュメント・編集・出力 | 44 | 1 | 4 | 39 | 0 |
| ワークスペース・設定 | 52 | 0 | 11 | 27 | 14 |

## Coverage

| Original catalog section | Feature | Status | Left category | Group | Semantic type | Destination | Note |
|---|---|---|---|---|---|---|---|
| A. キャンバス・ドキュメント | Raster Canvas | Core | キャンバス・表示 | Canvas | Feature | command |  |
| A. キャンバス・ドキュメント | Tile-based 大規模Canvas | Core / Investigate | キャンバス・表示 | Canvas | Feature | command |  |
| A. キャンバス・ドキュメント | Pan / Zoom / Rotate | Core | キャンバス・表示 | Canvas | Feature | command |  |
| A. キャンバス・ドキュメント | 最大 64000% Zoom | Required | キャンバス・表示 | Canvas | Feature | command |  |
| A. キャンバス・ドキュメント | Canvas Flip | Required | キャンバス・表示 | Canvas | Command | command |  |
| A. キャンバス・ドキュメント | Crop | Required | ドキュメント・編集・出力 | Canvas | Tool/Mode | canvas |  |
| A. キャンバス・ドキュメント | Canvas Resize | Required | ドキュメント・編集・出力 | Canvas | Feature | command |  |
| A. キャンバス・ドキュメント | Image Resize | Required | ドキュメント・編集・出力 | Canvas | Feature | command |  |
| A. キャンバス・ドキュメント | Seamless Tile Drawing | Required | キャンバス・表示 | Canvas | Feature | command |  |
| A. キャンバス・ドキュメント | 複数Document | Required | ドキュメント・編集・出力 | Document | Feature | command |  |
| A. キャンバス・ドキュメント | Document Metadata | Required | ドキュメント・編集・出力 | Document | Feature | command |  |
| B. 描画・ブラシエンジン | Brush Tool | Core | 描画 | Tools | Tool/Mode | canvas |  |
| B. 描画・ブラシエンジン | Eraser | Core | 描画 | Tools | Tool/Mode | canvas |  |
| B. 描画・ブラシエンジン | Smudge / Blend Tool | Required | 描画 | Tools | Tool/Mode | canvas |  |
| B. 描画・ブラシエンジン | Brush Size / Opacity | Core | 描画 | Brush | Setting/Property | rightPiP |  |
| B. 描画・ブラシエンジン | Pressure | Core | 描画 | Brush | Setting/Property | rightPiP |  |
| B. 描画・ブラシエンジン | Tilt | Required | 描画 | Brush | Setting/Property | rightPiP |  |
| B. 描画・ブラシエンジン | Azimuth | Required | 描画 | Brush | Setting/Property | rightPiP |  |
| B. 描画・ブラシエンジン | Stylus Eraser | Required | 描画 | Tools | Tool/Mode | canvas |  |
| B. 描画・ブラシエンジン | Barrel Button | Required | 描画 | Brush | Feature | command |  |
| B. 描画・ブラシエンジン | Stabilization / Smoothing | Core | 描画 | Brush | Setting/Property | rightPiP |  |
| B. 描画・ブラシエンジン | Brush Dynamics 共通変調モデル | Core | 描画 | Brush | Setting/Property | rightPiP |  |
| B. 描画・ブラシエンジン | Dynamics Curve / Range / Invert | Required | 描画 | Brush | Setting/Property | rightPiP |  |
| B. 描画・ブラシエンジン | Procedural Brush System | Core | 描画 | Brush | Feature | command |  |
| B. 描画・ブラシエンジン | Texture-based Brush Input | Required | 描画 | Brush | Feature | command |  |
| B. 描画・ブラシエンジン | Brush Preset | Required | 描画 | Brush | Feature | command |  |
| B. 描画・ブラシエンジン | Brush検索・整理 | Required | 描画 | Brush | Panel/Workspace | rightPiP |  |
| B. 描画・ブラシエンジン | ユーザー作成Brush | Required | 描画 | Brush | Feature | command |  |
| B. 描画・ブラシエンジン | Dynamic Wet Media | Core / Investigate | 描画 | Brush | Feature | command |  |
| B. 描画・ブラシエンジン | Wetness / Pigment等の内部状態 | Investigate | 描画 | Brush | Feature | command |  |
| B. 描画・ブラシエンジン | 紙質・粒子・質感 | Required / Investigate | 描画 | Brush | Feature | command |  |
| C. 線画・Region Intelligence | Lineart Region System | Core | 塗り・色・Region | Region | Feature | command |  |
| C. 線画・Region Intelligence | 閉領域検出 | Core | 塗り・色・Region | Region | Feature | command |  |
| C. 線画・Region Intelligence | Persistent Region ID | Core | 塗り・色・Region | Region | Feature | command |  |
| C. 線画・Region Intelligence | Region隣接グラフ | Core | 塗り・色・Region | Region | Feature | command |  |
| C. 線画・Region Intelligence | Boundary Tracking | Core | 塗り・色・Region | Region | Setting/Property | rightPiP |  |
| C. 線画・Region Intelligence | Line Connectivity Analysis | Core | 塗り・色・Region | Region | Feature | command |  |
| C. 線画・Region Intelligence | Region Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas |  |
| C. 線画・Region Intelligence | Region Fill | Required | 塗り・色・Region | Region | Feature | command |  |
| C. 線画・Region Intelligence | Lineart-linked Coloring | Core | 塗り・色・Region | Region | Feature | command |  |
| C. 線画・Region Intelligence | 追従強度・条件設定 | Required | 塗り・色・Region | Region | Feature | command |  |
| C. 線画・Region Intelligence | 変更結果の確認・Undo | Required | 塗り・色・Region | Region | Command | command |  |
| C. 線画・Region Intelligence | Semantic Region Label | Investigate | 塗り・色・Region | Region | Feature | command |  |
| D. 塗り・彩色 | Flood Fill | Core | 塗り・色・Region | Fill | Tool/Mode | canvas |  |
| D. 塗り・彩色 | Gap Closing | Required | 塗り・色・Region | Color Assist | Setting/Property | rightPiP |  |
| D. 塗り・彩色 | Gap Tolerance | Required | 塗り・色・Region | Color Assist | Setting/Property | rightPiP |  |
| D. 塗り・彩色 | Boundary Expand / Contract | Required | 塗り・色・Region | Color Assist | Setting/Property | rightPiP |  |
| D. 塗り・彩色 | Multi-layer Reference Fill | Required | 塗り・色・Region | Fill | Setting/Property | rightPiP |  |
| D. 塗り・彩色 | Lineart Reference Fill | Required | 塗り・色・Region | Fill | Setting/Property | rightPiP |  |
| D. 塗り・彩色 | Color Difference Tolerance | Required | 塗り・色・Region | Color Assist | Setting/Property | rightPiP |  |
| D. 塗り・彩色 | Enclose and Fill | Required | 塗り・色・Region | Fill | Tool/Mode | canvas |  |
| D. 塗り・彩色 | Trace and Fill | Required | 塗り・色・Region | Fill | Tool/Mode | canvas |  |
| D. 塗り・彩色 | Drag Fill | Required | 塗り・色・Region | Fill | Tool/Mode | canvas |  |
| D. 塗り・彩色 | Continuous Region Fill | Required | 塗り・色・Region | Fill | Tool/Mode | canvas |  |
| D. 塗り・彩色 | Smart Fill 統合UI | Core | 塗り・色・Region | Fill | Feature | command |  |
| D. 塗り・彩色 | Smart Color Assist | Core | 塗り・色・Region | Color Assist | Feature | command |  |
| D. 塗り・彩色 | Base Color候補 | Required / Investigate | 塗り・色・Region | Color Assist | Feature | command |  |
| D. 塗り・彩色 | Palette候補 | Required / Investigate | 塗り・色・Region | Color Assist | Panel/Workspace | rightPiP |  |
| D. 塗り・彩色 | 隣接色調和支援 | Required / Investigate | 塗り・色・Region | Color Assist | Feature | command |  |
| D. 塗り・彩色 | Region Recolor | Required | 塗り・色・Region | Color Assist | Feature | command |  |
| D. 塗り・彩色 | Shadow / Highlight候補 | Investigate | 塗り・色・Region | Color Assist | Feature | command |  |
| D. 塗り・彩色 | Color Temperature調整 | Required | 塗り・色・Region | Color Assist | Feature | command |  |
| D. 塗り・彩色 | 全体色調整 | Required | 塗り・色・Region | Color Assist | Feature | command |  |
| E. カラーシステム | Color Picker | Core | 塗り・色・Region | Color | Panel/Workspace | rightPiP |  |
| E. カラーシステム | Canvas Eyedropper | Core | 塗り・色・Region | Color | Tool/Mode | canvas |  |
| E. カラーシステム | Reference Eyedropper | Core | 塗り・色・Region | Color | Tool/Mode | canvas |  |
| E. カラーシステム | Color History | Required | 塗り・色・Region | Color | Panel/Workspace | rightPiP |  |
| E. カラーシステム | Palette | Required | 塗り・色・Region | Color | Panel/Workspace | rightPiP |  |
| E. カラーシステム | Palette Import / Export | Required | 塗り・色・Region | Color | Command | command |  |
| E. カラーシステム | HSV/HSL/RGB等のカラーコントロール | Required | 塗り・色・Region | Color | Feature | command |  |
| E. カラーシステム | Color Harmony支援 | Required / Investigate | 塗り・色・Region | Color | Setting/Property | rightPiP |  |
| E. カラーシステム | Grayscale Preview | Required | 塗り・色・Region | Color | Feature | command |  |
| E. カラーシステム | Color Management / ICC | Core / Investigate | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP |  |
| E. カラーシステム | Wide Gamut | Core / Investigate | ドキュメント・編集・出力 | Color Management | Feature | command |  |
| E. カラーシステム | 8-bit integer | Required | ドキュメント・編集・出力 | Color Management | Feature | command |  |
| E. カラーシステム | 16-bit integer | Required | ドキュメント・編集・出力 | Color Management | Feature | command |  |
| E. カラーシステム | 16-bit float | Required / Investigate | ドキュメント・編集・出力 | Color Management | Feature | command |  |
| E. カラーシステム | 32-bit float | Investigate | ドキュメント・編集・出力 | Color Management | Feature | command |  |
| E. カラーシステム | Embedded ICC Profile | Required | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP |  |
| E. カラーシステム | Profile Conversion / Display Transform | Required | ドキュメント・編集・出力 | Color Management | Setting/Property | rightPiP |  |
| E. カラーシステム | Linear-light Processing Path | Core / Investigate | ドキュメント・編集・出力 | Color Management | Feature | command |  |
| E. カラーシステム | HDR-capable Architecture | Core / Investigate | ドキュメント・編集・出力 | Color Management | Feature | command |  |
| E. カラーシステム | CMYK Native Editing | Investigate | ドキュメント・編集・出力 | Color Management | Feature | command |  |
| E. カラーシステム | Soft Proof | Required | ドキュメント・編集・出力 | Color Management | Feature | command |  |
| E. カラーシステム | Out-of-Gamut Warning | Required | ドキュメント・編集・出力 | Color Management | Feature | command |  |
| E. カラーシステム | Rendering Intent / Black Point Compensation | Required / Investigate | ドキュメント・編集・出力 | Color Management | Feature | command |  |
| F. レイヤー | Raster Layer | Core | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Vector Layer | Required | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Vector Path / Anchor / Bezier Handle | Required | ベクター・文字・図形 | Vector | Tool/Mode | canvas |  |
| F. レイヤー | Vector Stroke Width / Fill / Stroke | Required | ベクター・文字・図形 | Vector | Feature | command |  |
| F. レイヤー | Vector Node Add/Delete/Convert | Required | ベクター・文字・図形 | Vector | Feature | command |  |
| F. レイヤー | Vector Simplify / Smooth | Required | ベクター・文字・図形 | Vector | Feature | command |  |
| F. レイヤー | Vector Boolean Operation | Required | ベクター・文字・図形 | Vector | Feature | command |  |
| F. レイヤー | Vector Eraser / Line Erase | Required | ベクター・文字・図形 | Vector | Tool/Mode | canvas |  |
| F. レイヤー | Rasterize Vector | Required | レイヤー・合成 | Layers | Command | command |  |
| F. レイヤー | Variable-width Vector Stroke | Required / Investigate | ベクター・文字・図形 | Vector | Feature | command |  |
| F. レイヤー | Brush-like Rendering on Vector Path | Investigate | ベクター・文字・図形 | Vector | Tool/Mode | canvas |  |
| F. レイヤー | Group | Core | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Mask | Required | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Clipping | Core | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Alpha Lock / Lock Transparency | Core | レイヤー・合成 | Layers | Setting/Property | rightPiP |  |
| F. レイヤー | Alpha Inheritance / Clipping-equivalent | Required | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Persistent Clipping Control | Core | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Adjustment Layer | Required | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Filter Layer | Required | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Layer Style / Layer Effect | Required | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Text Layer / Entity | Required | ベクター・文字・図形 | Text | Tool/Mode | canvas |  |
| F. レイヤー | Horizontal / Vertical Text | Required | ベクター・文字・図形 | Text | Feature | command |  |
| F. レイヤー | Font Family / Style / Size | Required | ベクター・文字・図形 | Text | Setting/Property | rightPiP |  |
| F. レイヤー | Tracking / Line Height / Baseline | Required | ベクター・文字・図形 | Text | Setting/Property | rightPiP |  |
| F. レイヤー | Font Import | Required | ベクター・文字・図形 | Text | Command | command |  |
| F. レイヤー | Missing Font Handling | Required | ベクター・文字・図形 | Text | Setting/Property | rightPiP |  |
| F. レイヤー | Text → Vector/Path | Required | ベクター・文字・図形 | Text | Feature | command |  |
| F. レイヤー | Text on Path / Area Text | Investigate | ベクター・文字・図形 | Text | Feature | command |  |
| F. レイヤー | Multi-select | Required | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Drag Reorder | Core | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Search | Required | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Filter | Required | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | Color Tag | Required | レイヤー・合成 | Layers | Setting/Property | rightPiP |  |
| F. レイヤー | Lock種別 | Required | レイヤー・合成 | Layers | Setting/Property | rightPiP |  |
| F. レイヤー | Solo / Isolate | Required | レイヤー・合成 | Layers | Command | command |  |
| F. レイヤー | Collapse | Required | レイヤー・合成 | Layers | Command | command |  |
| F. レイヤー | Duplicate | Required | レイヤー・合成 | Layers | Command | command |  |
| F. レイヤー | Merge | Required | レイヤー・合成 | Layers | Command | command |  |
| F. レイヤー | Merge Visible | Required | レイヤー・合成 | Layers | Command | command |  |
| F. レイヤー | Flatten Copy | Required | レイヤー・合成 | Layers | Command | command |  |
| F. レイヤー | Layer Comps | Core | レイヤー・合成 | Layers | Panel/Workspace | rightPiP |  |
| F. レイヤー | Canvasから直接Layer選択 | Required | レイヤー・合成 | Layers | Feature | command |  |
| F. レイヤー | 大量レイヤーUI性能 | Core | レイヤー・合成 | Layers | Feature | command |  |
| G. 選択・変形 | Rectangle / Ellipse Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas |  |
| G. 選択・変形 | Freehand Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas |  |
| G. 選択・変形 | Polygonal Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas |  |
| G. 選択・変形 | Color / Similarity Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas |  |
| G. 選択・変形 | Region Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas |  |
| G. 選択・変形 | Add / Subtract / Intersect | Required | 選択・変形 | Transform | Feature | command |  |
| G. 選択・変形 | Invert Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas |  |
| G. 選択・変形 | Feather | Required | 選択・変形 | Transform | Feature | command |  |
| G. 選択・変形 | Expand / Contract | Required | 選択・変形 | Transform | Feature | command |  |
| G. 選択・変形 | Saved Selection / Selection Mask | Required | 選択・変形 | Selection | Feature | command |  |
| G. 選択・変形 | Select from Layer Content | Required | 選択・変形 | Transform | Feature | command |  |
| G. 選択・変形 | Luminance / Color-range Selection | Required | 選択・変形 | Selection | Tool/Mode | canvas |  |
| G. 選択・変形 | Move / Scale / Rotate | Core | 選択・変形 | Transform | Tool/Mode | canvas |  |
| G. 選択・変形 | Flip | Required | 選択・変形 | Transform | Command | command |  |
| G. 選択・変形 | Free Transform | Required | 選択・変形 | Transform | Tool/Mode | canvas |  |
| G. 選択・変形 | Perspective / Distort | Required | 選択・変形 | Transform | Tool/Mode | canvas |  |
| G. 選択・変形 | Warp | Required | 選択・変形 | Transform | Tool/Mode | canvas |  |
| G. 選択・変形 | Liquify | Required | 選択・変形 | Transform | Tool/Mode | canvas |  |
| G. 選択・変形 | Transform Interpolation | Required | 選択・変形 | Transform | Setting/Property | rightPiP |  |
| H. 非破壊編集・合成 | Adjustment Layer | Required | 補正・フィルター・修復 | Adjust / Filter | Feature | command |  |
| H. 非破壊編集・合成 | Filter Layer | Required | 補正・フィルター・修復 | Adjust / Filter | Feature | command |  |
| H. 非破壊編集・合成 | Live Blur | Required | 補正・フィルター・修復 | Adjust / Filter | Feature | command |  |
| H. 非破壊編集・合成 | Live Color Adjustment | Required | 補正・フィルター・修復 | Adjust / Filter | Feature | command |  |
| H. 非破壊編集・合成 | Mask | Required | レイヤー・合成 | Compositing | Feature | command |  |
| H. 非破壊編集・合成 | Vector Mask | Required / Investigate | レイヤー・合成 | Compositing | Feature | command |  |
| H. 非破壊編集・合成 | Clipping Mask | Required | レイヤー・合成 | Compositing | Feature | command |  |
| H. 非破壊編集・合成 | Blend Mode | Core | レイヤー・合成 | Compositing | Setting/Property | rightPiP |  |
| H. 非破壊編集・合成 | Painting Blend Modes | Required | レイヤー・合成 | Compositing | Setting/Property | rightPiP |  |
| H. 非破壊編集・合成 | Blend Mode Live Preview | Required | レイヤー・合成 | Compositing | Setting/Property | rightPiP |  |
| H. 非破壊編集・合成 | Blend If 相当 | Core | 補正・フィルター・修復 | Adjust / Filter | Feature | command |  |
| H. 非破壊編集・合成 | Displacement | Required / Investigate | 補正・フィルター・修復 | Adjust / Filter | Feature | command |  |
| H. 非破壊編集・合成 | Healing | Required | 補正・フィルター・修復 | Retouch | Tool/Mode | canvas |  |
| H. 非破壊編集・合成 | Patch | Required | 補正・フィルター・修復 | Retouch | Tool/Mode | canvas |  |
| H. 非破壊編集・合成 | Clone | Required | 補正・フィルター・修復 | Retouch | Tool/Mode | canvas |  |
| H. 非破壊編集・合成 | Core Adjustment Set | Required | 補正・フィルター・修復 | Adjust / Filter | Feature | command |  |
| H. 非破壊編集・合成 | Core Live Filter Set | Required | 補正・フィルター・修復 | Adjust / Filter | Feature | command |  |
| H. 非破壊編集・合成 | Filter Masking / Reorder / Opacity / Blend | Required | レイヤー・合成 | Compositing | Setting/Property | rightPiP |  |
| H. 非破壊編集・合成 | Destructive Apply Command | Required | 補正・フィルター・修復 | Adjust / Filter | Command | command |  |
| H. 非破壊編集・合成 | Layer Style: Stroke | Required | レイヤー・合成 | Layer Effects | Feature | command |  |
| H. 非破壊編集・合成 | Layer Style: Drop/Inner Shadow | Required | レイヤー・合成 | Layer Effects | Feature | command |  |
| H. 非破壊編集・合成 | Layer Style: Outer/Inner Glow | Required | レイヤー・合成 | Layer Effects | Feature | command |  |
| H. 非破壊編集・合成 | Layer Style: Color/Gradient/Pattern Overlay | Required | レイヤー・合成 | Layer Effects | Feature | command |  |
| H. 非破壊編集・合成 | Layer Style: Bevel/Emboss | Required | レイヤー・合成 | Layer Effects | Feature | command |  |
| I. Reference System | Reference Workspace | Core | 資料・アセット | Reference | Panel/Workspace | rightPiP |  |
| I. Reference System | 複数Reference | Required | 資料・アセット | Reference | Feature | command |  |
| I. Reference System | 自由配置 | Required | 資料・アセット | Reference | Feature | command |  |
| I. Reference System | Pin | Required | 資料・アセット | Reference | Command | command |  |
| I. Reference System | Scale / Rotate | Required | 資料・アセット | Reference | Feature | command |  |
| I. Reference System | Horizontal Flip | Required | 資料・アセット | Reference | Command | command |  |
| I. Reference System | Grayscale | Required | 資料・アセット | Reference | Feature | command |  |
| I. Reference System | Always on Top | Required | 資料・アセット | Reference | Feature | command |  |
| I. Reference System | Temporary Hide | Required | 資料・アセット | Reference | Command | command |  |
| I. Reference System | Reference Group | Required | 資料・アセット | Reference | Feature | command |  |
| I. Reference System | Reference Persistence | Required | 資料・アセット | Reference | Feature | command |  |
| I. Reference System | Reference Eyedropper | Core | 資料・アセット | Reference | Tool/Mode | canvas |  |
| J. 履歴・Snapshot・分岐 | Undo | Core | 履歴・自動化 | History / Snapshot | Command | command |  |
| J. 履歴・Snapshot・分岐 | Redo | Core | 履歴・自動化 | History / Snapshot | Command | command |  |
| J. 履歴・Snapshot・分岐 | Command単位履歴 | Core | 履歴・自動化 | History / Snapshot | Feature | command |  |
| J. 履歴・Snapshot・分岐 | Snapshot System | Core | 履歴・自動化 | History / Snapshot | Panel/Workspace | rightPiP |  |
| J. 履歴・Snapshot・分岐 | Snapshot比較 | Required | 履歴・自動化 | History / Snapshot | Panel/Workspace | rightPiP |  |
| J. 履歴・Snapshot・分岐 | Snapshot分岐 | Required / Investigate | 履歴・自動化 | History / Snapshot | Panel/Workspace | rightPiP |  |
| J. 履歴・Snapshot・分岐 | History Panel | Required | 履歴・自動化 | History / Snapshot | Panel/Workspace | rightPiP |  |
| K. Timelapse・作業時間 | 制作履歴ベースTimelapse | Core | 履歴・自動化 | Timelapse / Work Time | Panel/Workspace | rightPiP |  |
| K. Timelapse・作業時間 | UIを含めない出力 | Required | 履歴・自動化 | Timelapse / Work Time | Feature | command |  |
| K. Timelapse・作業時間 | High-resolution Export | Required | 履歴・自動化 | Timelapse / Work Time | Command | command |  |
| K. Timelapse・作業時間 | Frame Pace調整 | Required | 履歴・自動化 | Timelapse / Work Time | Feature | command |  |
| K. Timelapse・作業時間 | Work Time | Core | 履歴・自動化 | Timelapse / Work Time | Panel/Workspace | rightPiP |  |
| K. Timelapse・作業時間 | Session | Required | 履歴・自動化 | Timelapse / Work Time | Feature | command |  |
| K. Timelapse・作業時間 | Today | Required | 履歴・自動化 | Timelapse / Work Time | Feature | command |  |
| K. Timelapse・作業時間 | Total | Required | 履歴・自動化 | Timelapse / Work Time | Feature | command |  |
| K. Timelapse・作業時間 | Average | Required | 履歴・自動化 | Timelapse / Work Time | Feature | command |  |
| K. Timelapse・作業時間 | Inactivity除外 | Required | 履歴・自動化 | Timelapse / Work Time | Feature | command |  |
| L. Automation | Auto Actions / Macros | Core | 履歴・自動化 | Automation | Panel/Workspace | rightPiP |  |
| L. Automation | Action Recording | Required | 履歴・自動化 | Automation | Feature | command |  |
| L. Automation | Parameterized Action | Required / Investigate | 履歴・自動化 | Automation | Feature | command |  |
| L. Automation | Macro Preset | Required | 履歴・自動化 | Automation | Panel/Workspace | rightPiP |  |
| L. Automation | Shortcut Assignment | Required | 履歴・自動化 | Automation | Setting/Property | rightPiP |  |
| L. Automation | Quick Menu登録 | Required | 履歴・自動化 | Automation | Feature | command |  |
| M. UI・Workspace・操作体系 | Canvas First | Core | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Direct Manipulation | Core | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Context UI | Core | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Quick Menu | Core | ワークスペース・設定 | Quick Controller | Feature | command |  |
| M. UI・Workspace・操作体系 | Command / Tool Search | Required | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Dock Panel | Required | ワークスペース・設定 | Workspace / Input | Panel/Workspace | rightPiP |  |
| M. UI・Workspace・操作体系 | Undock / Floating | Required | ワークスペース・設定 | Workspace / Input | Command | command |  |
| M. UI・Workspace・操作体系 | Panel Resize / Reorder / Hide | Required | ワークスペース・設定 | Workspace / Input | Panel/Workspace | rightPiP |  |
| M. UI・Workspace・操作体系 | Workspace Save / Load | Required | ワークスペース・設定 | Workspace / Input | Panel/Workspace | rightPiP |  |
| M. UI・Workspace・操作体系 | Canvas Focus Mode | Core | キャンバス・表示 | View | Command | command |  |
| M. UI・Workspace・操作体系 | Workspace Preset | Required | ワークスペース・設定 | Workspace / Input | Panel/Workspace | rightPiP |  |
| M. UI・Workspace・操作体系 | 左右UI反転 | Required | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Keyboard Shortcut | Core | ワークスペース・設定 | Workspace / Input | Setting/Property | rightPiP |  |
| M. UI・Workspace・操作体系 | Gesture | Core | ワークスペース・設定 | Workspace / Input | Setting/Property | rightPiP |  |
| M. UI・Workspace・操作体系 | Hover | Required | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | 右クリック / Context Click | Required | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Custom Toolbar | Required | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Custom Shortcut | Required | ワークスペース・設定 | Workspace / Input | Setting/Property | rightPiP |  |
| M. UI・Workspace・操作体系 | Keyboard Shortcut Capture | Required | ワークスペース・設定 | Workspace / Input | Setting/Property | rightPiP |  |
| M. UI・Workspace・操作体系 | Custom Gesture | Required | ワークスペース・設定 | Workspace / Input | Setting/Property | rightPiP |  |
| M. UI・Workspace・操作体系 | Scalable UI / Text | Required | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Single-pointer Alternative | Required | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Color-independent State Indication | Required | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Color Description Assistance | Required | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Reduced Motion | Required | ワークスペース・設定 | Workspace / Input | Setting/Property | rightPiP |  |
| M. UI・Workspace・操作体系 | Touch Target Policy | Required | ワークスペース・設定 | Workspace / Input | Setting/Property | rightPiP |  |
| M. UI・Workspace・操作体系 | Feedback Sound / Haptic | Required / Investigate | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| M. UI・Workspace・操作体系 | Keyboard Navigation for Commands | Required | ワークスペース・設定 | Workspace / Input | Feature | command |  |
| N. デバイス別適応 | Desktop専用最適化UI | Core | ワークスペース・設定 | Device / Input | Feature | command |  |
| N. デバイス別適応 | Tablet専用最適化UI | Core | ワークスペース・設定 | Device / Input | Feature | command |  |
| N. デバイス別適応 | Smartphone専用最適化UI | Core | ワークスペース・設定 | Device / Input | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Straight / Parallel Ruler | Required | 定規・ガイド | Guides / Rulers | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | 2D Grid | Required | 定規・ガイド | Guides / Rulers | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Isometric Grid | Required | 定規・ガイド | Guides / Rulers | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Perspective Guide | Required | 定規・ガイド | Guides / Rulers | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Symmetry / Mirror | Required | 定規・ガイド | Guides / Rulers | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Radial Symmetry | Required | 定規・ガイド | Guides / Rulers | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Guide Snapping | Required | 定規・ガイド | Guides / Rulers | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Guide Visibility / Lock | Required | 定規・ガイド | Guides / Rulers | Setting/Property | rightPiP |  |
| O. 定規・ガイド・形状・グラデーション | Guide Preset / Save | Required | 定規・ガイド | Guides / Rulers | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Line / Rectangle / Ellipse / Polygon | Required | ベクター・文字・図形 | Shape | Tool/Mode | canvas |  |
| O. 定規・ガイド・形状・グラデーション | Post-stroke Shape Correction | Required / Investigate | ベクター・文字・図形 | Shape | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Vector-backed Shape | Required / Investigate | ベクター・文字・図形 | Shape | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Linear Gradient | Required | 塗り・色・Region | Gradient | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Radial Gradient | Required | 塗り・色・Region | Gradient | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Reflected / Bilinear Gradient | Required | 塗り・色・Region | Gradient | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Shape-aware Gradient | Required / Investigate | 塗り・色・Region | Gradient | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Editable Gradient Stops | Required | 塗り・色・Region | Gradient | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Non-destructive Gradient | Required | 塗り・色・Region | Gradient | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Gradient Map | Required | 塗り・色・Region | Gradient | Feature | command |  |
| O. 定規・ガイド・形状・グラデーション | Gradient Dithering | Required / Investigate | 塗り・色・Region | Gradient | Feature | command |  |
| O.1 Clipboard / Cross-document Editing | Internal Clipboard | Core | ドキュメント・編集・出力 | Clipboard / Cross-document | Feature | command |  |
| O.1 Clipboard / Cross-document Editing | Copy / Cut / Paste | Core | ドキュメント・編集・出力 | Clipboard / Cross-document | Command | command |  |
| O.1 Clipboard / Cross-document Editing | Copy Merged | Required | ドキュメント・編集・出力 | Clipboard / Cross-document | Command | command |  |
| O.1 Clipboard / Cross-document Editing | Paste in Place | Required | ドキュメント・編集・出力 | Clipboard / Cross-document | Command | command |  |
| O.1 Clipboard / Cross-document Editing | Native cross-document payload | Required | ドキュメント・編集・出力 | Clipboard / Cross-document | Feature | command |  |
| O.1 Clipboard / Cross-document Editing | System Clipboard Bridge | Required / Investigate | ドキュメント・編集・出力 | Clipboard / Cross-document | Feature | command |  |
| O.1 Clipboard / Cross-document Editing | Desktop Drag & Drop | Required | ドキュメント・編集・出力 | Clipboard / Cross-document | Feature | command |  |
| O.2 Localization | Localizable UI resources | Core | ワークスペース・設定 | Language / Region | Feature | command |  |
| O.2 Localization | Japanese/CJK layout support | Core | ワークスペース・設定 | Language / Region | Feature | command |  |
| O.2 Localization | Locale-aware units/date/number | Required | ワークスペース・設定 | Language / Region | Feature | command |  |
| O.2 Localization | Shipping locale set | Investigate | ワークスペース・設定 | Language / Region | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | .illustro | Core | ドキュメント・編集・出力 | Save / Recovery | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | PNG Export | Required | ドキュメント・編集・出力 | Import / Export | Command | command |  |
| P. ファイル・保存・Recovery・Offline | JPEG Export | Required | ドキュメント・編集・出力 | Import / Export | Command | command |  |
| P. ファイル・保存・Recovery・Offline | WebP Export | Required | ドキュメント・編集・出力 | Import / Export | Command | command |  |
| P. ファイル・保存・Recovery・Offline | PSD Import / Export | Investigate / High Priority | ドキュメント・編集・出力 | Import / Export | Command | command |  |
| P. ファイル・保存・Recovery・Offline | OpenRaster (.ora) | Required | ドキュメント・編集・出力 | Import / Export | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | TIFF | Required | ドキュメント・編集・出力 | Import / Export | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | SVG Import / Export | Required / Investigate | ドキュメント・編集・出力 | Import / Export | Command | command |  |
| P. ファイル・保存・Recovery・Offline | OpenEXR | Required / Investigate | ドキュメント・編集・出力 | Import / Export | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | AVIF / HEIF | Investigate | ドキュメント・編集・出力 | Import / Export | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | Auto Save | Core | ドキュメント・編集・出力 | Save / Recovery | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | Crash Recovery | Core | ドキュメント・編集・出力 | Save / Recovery | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | Recovery Snapshot | Core | ドキュメント・編集・出力 | Save / Recovery | Panel/Workspace | rightPiP |  |
| P. ファイル・保存・Recovery・Offline | Incremental Save | Core | ドキュメント・編集・出力 | Save / Recovery | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | 描画を止めない保存 | Core | ドキュメント・編集・出力 | Save / Recovery | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | Offline First | Core | ドキュメント・編集・出力 | Save / Recovery | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | 通常編集でログイン不要 | Core | ドキュメント・編集・出力 | Save / Recovery | Feature | command |  |
| P. ファイル・保存・Recovery・Offline | PWA Install | Investigate | ドキュメント・編集・出力 | Save / Recovery | Feature | command |  |
| Q. Performance・Rendering | 体感0ラグ | Core | ワークスペース・設定 | Performance | Internal | none | 通常ユーザーの直接操作ではない。診断UIを提供する場合のみWorkspace/Settingsから到達。 |
| Q. Performance・Rendering | Low Input Latency | Core | ワークスペース・設定 | Performance | Internal | none | 通常ユーザーの直接操作ではない。診断UIを提供する場合のみWorkspace/Settingsから到達。 |
| Q. Performance・Rendering | Stable Frame Time | Core | ワークスペース・設定 | Performance | Internal | none | 通常ユーザーの直接操作ではない。診断UIを提供する場合のみWorkspace/Settingsから到達。 |
| Q. Performance・Rendering | Worst Frame計測 | Core | ワークスペース・設定 | Performance | Internal | none | 通常ユーザーの直接操作ではない。診断UIを提供する場合のみWorkspace/Settingsから到達。 |
| Q. Performance・Rendering | Memory Scaling | Core | ワークスペース・設定 | Performance | Internal | none | 通常ユーザーの直接操作ではない。診断UIを提供する場合のみWorkspace/Settingsから到達。 |
| Q. Performance・Rendering | Canvas Size Scaling | Core | ワークスペース・設定 | Performance | Internal | none | 通常ユーザーの直接操作ではない。診断UIを提供する場合のみWorkspace/Settingsから到達。 |
| Q. Performance・Rendering | GPU Brush Compositing | Investigate / likely required | ワークスペース・設定 | Performance | Internal | none | 通常ユーザーの直接操作ではない。診断UIを提供する場合のみWorkspace/Settingsから到達。 |
| Q. Performance・Rendering | GPU Filter | Investigate / likely required | ワークスペース・設定 | Performance | Internal | none | 通常ユーザーの直接操作ではない。診断UIを提供する場合のみWorkspace/Settingsから到達。 |
| Q. Performance・Rendering | GPU Transform | Investigate / likely required | ワークスペース・設定 | Performance | Internal | none | 通常ユーザーの直接操作ではない。診断UIを提供する場合のみWorkspace/Settingsから到達。 |
| Q. Performance・Rendering | WebGPU | Investigate | ワークスペース・設定 | Performance | Internal | none | 通常ユーザーの直接操作ではない。診断UIを提供する場合のみWorkspace/Settingsから到達。 |
| Q. Performance・Rendering | GPU Fallback | Required | ワークスペース・設定 | Performance | Internal | none | 通常ユーザーの直接操作ではない。診断UIを提供する場合のみWorkspace/Settingsから到達。 |
| R. AI補助 | 生成AIを中心価値にする | Out of scope | ワークスペース・設定 | Assist / Policy | Feature | command |  |
| R. AI補助 | 色提案 | Investigate | 塗り・色・Region | Assist | Feature | command |  |
| R. AI補助 | Region補助 | Investigate | 塗り・色・Region | Assist | Feature | command |  |
| R. AI補助 | Selection補助 | Investigate | 選択・変形 | Assist | Feature | command |  |
| R. AI補助 | 整理補助 | Investigate | ワークスペース・設定 | Assist / Policy | Feature | command |  |
| R. AI補助 | 修正補助 | Investigate | 補正・フィルター・修復 | Assist | Feature | command |  |
| R. AI補助 | AIなしでも成立する基本機能 | Core | ワークスペース・設定 | Assist / Policy | Feature | command |  |
| S. 将来の共同編集 | 絵チャ / Collaborative Drawing | Future | ワークスペース・設定 | Future | Future | none | Future。現行UI導線は設計しない。 |
| S. 将来の共同編集 | Realtime Multi-user Editing | Future / Investigate | ワークスペース・設定 | Future | Future | none | Future。現行UI導線は設計しない。 |
| T. Asset Library・Navigator・拡張性 | 2D Asset Library | Required | 資料・アセット | Asset Library | Panel/Workspace | rightPiP |  |
| T. Asset Library・Navigator・拡張性 | Brush Asset | Required | 資料・アセット | Asset Library | Feature | command |  |
| T. Asset Library・Navigator・拡張性 | Brush Tip / Texture Asset | Required | 資料・アセット | Asset Library | Feature | command |  |
| T. Asset Library・Navigator・拡張性 | Paper Texture | Required | 資料・アセット | Asset Library | Feature | command |  |
| T. Asset Library・Navigator・拡張性 | Pattern | Required | 資料・アセット | Asset Library | Feature | command |  |
| T. Asset Library・Navigator・拡張性 | Gradient Preset | Required | 資料・アセット | Asset Library | Feature | command |  |
| T. Asset Library・Navigator・拡張性 | Color Palette Asset | Required | 資料・アセット | Asset Library | Panel/Workspace | rightPiP |  |
| T. Asset Library・Navigator・拡張性 | Macro Asset | Required | 資料・アセット | Asset Library | Panel/Workspace | rightPiP |  |
| T. Asset Library・Navigator・拡張性 | Workspace Asset | Required | 資料・アセット | Asset Library | Panel/Workspace | rightPiP |  |
| T. Asset Library・Navigator・拡張性 | Reference Set | Required | 資料・アセット | Asset Library | Feature | command |  |
| T. Asset Library・Navigator・拡張性 | Shape Preset | Required | 資料・アセット | Asset Library | Feature | command |  |
| T. Asset Library・Navigator・拡張性 | Folder / Collection / Tag | Required | 資料・アセット | Asset Library | Setting/Property | rightPiP |  |
| T. Asset Library・Navigator・拡張性 | Search / Favorite / Recent | Required | 資料・アセット | Asset Library | Feature | command |  |
| T. Asset Library・Navigator・拡張性 | Asset Import / Export | Required | 資料・アセット | Asset Library | Command | command |  |
| T. Asset Library・Navigator・拡張性 | Navigator | Required | キャンバス・表示 | Navigator | Panel/Workspace | rightPiP |  |
| T. Asset Library・Navigator・拡張性 | Dock / Float Navigator | Required | キャンバス・表示 | Navigator | Panel/Workspace | rightPiP |  |
| T. Asset Library・Navigator・拡張性 | Multi-view of same Document | Investigate | キャンバス・表示 | Navigator | Feature | command |  |
| T. Asset Library・Navigator・拡張性 | Plugin / Extension API | Future / Investigate | ワークスペース・設定 | Extensions | Feature | command |  |
| T. Asset Library・Navigator・拡張性 | Internal Module Boundaries | Core | ワークスペース・設定 | Extensions | Internal | none |  |
