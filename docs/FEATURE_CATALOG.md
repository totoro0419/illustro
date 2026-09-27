# Illustro 機能カタログ

> 状態: 上位製品仕様から作成した初期マスターカタログ。競合調査により継続更新する。  
> 目的: Illustro が最終的に持つ機能・調査対象を一覧化する。詳細挙動は将来 `docs/features/*.md` に分離する。  
> 注意: ここに載っていることは「実装済み」を意味しない。

## ステータス定義

- **Core** — 基盤・製品定義級。初期アーキテクチャから考慮必須。
- **Required** — 最終製品に搭載する方針。
- **Investigate** — 方向性は重要だが、具体方式は調査・検証後に確定。
- **Future** — コアペイントアプリ完成後に扱う。
- **Out of scope** — 現在の製品方針として対象外。

## A. キャンバス・ドキュメント

| 機能 | 状態 | 備考 |
|---|---|---|
| Raster Canvas | Core | 主描画面 |
| Tile-based 大規模Canvas | Core / Investigate | 大規模キャンバス要件を満たす有力方式 |
| Pan / Zoom / Rotate | Core | 即応性最重要 |
| 最大 64000% Zoom | Required | 高倍率でも座標精度を維持 |
| Canvas Flip | Required | 水平/垂直 |
| Crop | Required | 詳細操作は未確定 |
| Canvas Resize | Required | |
| Image Resize | Required | 補間方式は別途仕様化 |
| Seamless Tile Drawing | Required | 上下左右反復をリアルタイム確認 |
| 複数Document | Required | UX未確定 |
| Document Metadata | Required | .illustroで保持 |

## B. 描画・ブラシエンジン

| 機能 | 状態 | 備考 |
|---|---|---|
| Brush Tool | Core | 低遅延 |
| Eraser | Core | Brush Engineと統一的に扱える設計を優先 |
| Smudge / Blend Tool | Required | 詳細方式未確定 |
| Brush Size / Opacity | Core | 高速アクセス必須 |
| Pressure | Core | 対応端末 |
| Tilt | Required | 対応端末 |
| Azimuth | Required | 対応端末 |
| Stylus Eraser | Required | 対応端末 |
| Barrel Button | Required | 対応端末 |
| Stabilization / Smoothing | Core | Global / per-brush の両方を想定。アクセシビリティにも利用 |
| Brush Dynamics 共通変調モデル | Core | Pressure/Tilt/Azimuth/Speed/Direction/Distance/Time/Random等を共通入力として扱う |
| Dynamics Curve / Range / Invert | Required | 入力→Brush Parameterの対応を共通UIで設定 |
| Procedural Brush System | Core | Illustroの主要独自機能 |
| Texture-based Brush Input | Required | Proceduralと併用 |
| Brush Preset | Required | |
| Brush検索・整理 | Required | |
| ユーザー作成Brush | Required | |
| Dynamic Wet Media | Core / Investigate | イラスト向け湿式表現 |
| Wetness / Pigment等の内部状態 | Investigate | Wet Media基盤 |
| 紙質・粒子・質感 | Required / Investigate | Brush/Wet Media連携 |

## C. 線画・Region Intelligence

| 機能 | 状態 | 備考 |
|---|---|---|
| Lineart Region System | Core | 製品定義級の独自機能 |
| 閉領域検出 | Core | 第一段階の必須能力 |
| Persistent Region ID | Core | 再計算後の対応付けが必要 |
| Region隣接グラフ | Core | 彩色支援等に利用 |
| Boundary Tracking | Core | |
| Line Connectivity Analysis | Core | |
| Region Selection | Required | |
| Region Fill | Required | |
| Lineart-linked Coloring | Core | 線画変更後に既存塗りを再マッピング |
| 追従強度・条件設定 | Required | |
| 変更結果の確認・Undo | Required | 自動変更をユーザー制御下に置く |
| Semantic Region Label | Investigate | 初期段階では必須にしない |

## D. 塗り・彩色

| 機能 | 状態 | 備考 |
|---|---|---|
| Flood Fill | Core | |
| Gap Closing | Required | |
| Gap Tolerance | Required | |
| Boundary Expand / Contract | Required | |
| Multi-layer Reference Fill | Required | |
| Lineart Reference Fill | Required | |
| Color Difference Tolerance | Required | |
| Enclose and Fill | Required | 囲って塗る |
| Trace and Fill | Required | なぞって塗る |
| Drag Fill | Required | |
| Continuous Region Fill | Required | |
| Smart Fill 統合UI | Core | モード分散を避ける |
| Smart Color Assist | Core | ユーザー補助。生成AI主体にしない |
| Base Color候補 | Required / Investigate | 決定的アルゴリズム優先 |
| Palette候補 | Required / Investigate | |
| 隣接色調和支援 | Required / Investigate | |
| Region Recolor | Required | |
| Shadow / Highlight候補 | Investigate | |
| Color Temperature調整 | Required | |
| 全体色調整 | Required | |

## E. カラーシステム

| 機能 | 状態 | 備考 |
|---|---|---|
| Color Picker | Core | |
| Canvas Eyedropper | Core | |
| Reference Eyedropper | Core | Illustro独自の高速資料採色 |
| Color History | Required | |
| Palette | Required | |
| Palette Import / Export | Required | 形式未確定 |
| HSV/HSL/RGB等のカラーコントロール | Required | 最終対応モデル未確定 |
| Color Harmony支援 | Required / Investigate | |
| Grayscale Preview | Required | Referenceにも利用 |
| Color Management / ICC | Core / Investigate | ドキュメント・合成モデル確定前に仕様化必須 |
| Wide Gamut | Core / Investigate | Display P3等を扱えるColor Pipelineを前提にする |
| 8-bit integer | Required | |
| 16-bit integer | Required | 高精度編集用途 |
| 16-bit float | Required / Investigate | HDR/高精度Filter基盤として検討 |
| 32-bit float | Investigate | メモリ・性能コストを含め評価 |
| Embedded ICC Profile | Required | Native documentで保持 |
| Profile Conversion / Display Transform | Required | |
| Linear-light Processing Path | Core / Investigate | Blend/Filterの一部で利用可能な構造 |
| HDR-capable Architecture | Core / Investigate | 初期UI実装とは分離しても将来を塞がない |
| CMYK Native Editing | Investigate | 一枚絵制作での必要性とコストを評価 |

## F. レイヤー

| 機能 | 状態 | 備考 |
|---|---|---|
| Raster Layer | Core | |
| Vector Layer | Required | 一枚絵の線画・図形・Mask用途に最適化 |
| Vector Path / Anchor / Bezier Handle | Required | Open/Closed Pathを編集可能 |
| Vector Stroke Width / Fill / Stroke | Required | |
| Vector Node Add/Delete/Convert | Required | |
| Vector Simplify / Smooth | Required | |
| Vector Boolean Operation | Required | |
| Vector Eraser / Line Erase | Required | |
| Rasterize Vector | Required | |
| Variable-width Vector Stroke | Required / Investigate | |
| Brush-like Rendering on Vector Path | Investigate | Procedural Brushとの統合を検討 |
| Group | Core | |
| Mask | Required | |
| Clipping | Core | 高頻度操作 |
| Persistent Clipping Control | Core | レイヤーUI上で即時確認・切替 |
| Adjustment Layer | Required | |
| Filter Layer | Required | |
| Text Layer / Entity | Required | 編集可能なTextを保持 |
| Horizontal / Vertical Text | Required | 日本語用途を考慮 |
| Font Family / Style / Size | Required | |
| Tracking / Line Height / Baseline | Required | |
| Font Import | Required | Platformが許す範囲 |
| Missing Font Handling | Required | 警告・代替を明示 |
| Text → Vector/Path | Required | |
| Text on Path / Area Text | Investigate | DTP化しすぎない範囲で評価 |
| Multi-select | Required | |
| Drag Reorder | Core | |
| Search | Required | |
| Filter | Required | |
| Color Tag | Required | |
| Lock種別 | Required | |
| Solo / Isolate | Required | |
| Collapse | Required | |
| Duplicate | Required | |
| Merge | Required | |
| Merge Visible | Required | |
| Flatten Copy | Required | |
| Layer Comps | Core | |
| Canvasから直接Layer選択 | Required | 大量レイヤー時の高速操作 |
| 大量レイヤーUI性能 | Core | Virtualization等を検討 |

## G. 選択・変形

| 機能 | 状態 | 備考 |
|---|---|---|
| Rectangle / Ellipse Selection | Required | |
| Freehand Selection | Required | |
| Polygonal Selection | Required | |
| Color / Similarity Selection | Required | アルゴリズム未確定 |
| Region Selection | Required | Region System連携 |
| Add / Subtract / Intersect | Required | |
| Invert Selection | Required | |
| Feather | Required | |
| Expand / Contract | Required | |
| Saved Selection / Selection Mask | Required | 再利用可能なグレースケール選択 |
| Select from Layer Content | Required | |
| Luminance / Color-range Selection | Required | |
| Move / Scale / Rotate | Core | |
| Flip | Required | |
| Free Transform | Required | |
| Perspective / Distort | Required | |
| Warp | Required | 可能な限り非破壊 |
| Liquify | Required | 可能な限り非破壊 |
| Transform Interpolation | Required | 方式未確定 |

## H. 非破壊編集・合成

| 機能 | 状態 | 備考 |
|---|---|---|
| Adjustment Layer | Required | |
| Filter Layer | Required | |
| Live Blur | Required | |
| Live Color Adjustment | Required | |
| Mask | Required | |
| Vector Mask | Required / Investigate | |
| Clipping Mask | Required | |
| Blend Mode | Core | Normal/Multiply/Screen/Overlay/Soft Light/Hard Light/Color Dodge/Burn/Linear Dodge/Burn/Darken/Lighten/Difference/Exclusion/Hue/Saturation/Color/Luminosity等をCore Setとする |
| Painting Blend Modes | Required | Erase/Behind/Alpha関連等を描画Engineと統合 |
| Blend Mode Live Preview | Required | Canvas上で即時比較 |
| Blend If 相当 | Core | より視覚的なUIへ再設計 |
| Displacement | Required / Investigate | |
| Healing | Required | イラスト向けに最適化 |
| Patch | Required | イラスト向けに最適化 |
| Clone | Required | 直接操作を重視 |
| Core Adjustment Set | Required | Brightness/Contrast, Levels, Curves, Exposure, Hue/Saturation, Vibrance, Color Balance, Temperature/Tint, B&W, Channel Mixer, Selective Color, Invert, Posterize, Threshold, Gradient Map, LUT等 |
| Core Live Filter Set | Required | Gaussian/Motion/Radial Blur, Sharpen, Unsharp Mask, High Pass, Noise, Median系, Pixelate/Mosaic, Offset, Displacement, Halftone等 |
| Filter Masking / Reorder / Opacity / Blend | Required | 非破壊Filterを組み合わせ可能にする |
| Destructive Apply Command | Required | 明示操作として残す |

## I. Reference System

| 機能 | 状態 | 備考 |
|---|---|---|
| Reference Workspace | Core | |
| 複数Reference | Required | |
| 自由配置 | Required | |
| Pin | Required | |
| Scale / Rotate | Required | |
| Horizontal Flip | Required | |
| Grayscale | Required | |
| Always on Top | Required | |
| Temporary Hide | Required | |
| Reference Group | Required | |
| Reference Persistence | Required | |
| Reference Eyedropper | Core | |

## J. 履歴・Snapshot・分岐

| 機能 | 状態 | 備考 |
|---|---|---|
| Undo | Core | 深く・高速・安定 |
| Redo | Core | |
| Command単位履歴 | Core | 可能な範囲で意味のある履歴 |
| Snapshot System | Core | 明示的Checkpoint |
| Snapshot比較 | Required | |
| Snapshot分岐 | Required / Investigate | |
| History Panel | Required | UX未確定 |

## K. Timelapse・作業時間

| 機能 | 状態 | 備考 |
|---|---|---|
| 制作履歴ベースTimelapse | Core | 画面録画より履歴利用を優先 |
| UIを含めない出力 | Required | |
| High-resolution Export | Required | |
| Frame Pace調整 | Required | |
| Work Time | Core | 実作業時間を測る |
| Session | Required | |
| Today | Required | |
| Total | Required | |
| Average | Required | |
| Inactivity除外 | Required | |

## L. Automation

| 機能 | 状態 | 備考 |
|---|---|---|
| Auto Actions / Macros | Core | |
| Action Recording | Required | |
| Parameterized Action | Required / Investigate | |
| Macro Preset | Required | |
| Shortcut Assignment | Required | |
| Quick Menu登録 | Required | |

## M. UI・Workspace・操作体系

| 機能 | 状態 | 備考 |
|---|---|---|
| Canvas First | Core | 上位設計原則 |
| Direct Manipulation | Core | 上位設計原則 |
| Context UI | Core | |
| Quick Menu | Core | ユーザーカスタマイズ可能 |
| Command / Tool Search | Required | 機能発見性 |
| Dock Panel | Required | PC系 |
| Undock / Floating | Required | PC系 |
| Panel Resize / Reorder / Hide | Required | |
| Workspace Save / Load | Required | |
| Workspace Preset | Required | Drawing/Painting/Coloring等 |
| 左右UI反転 | Required | Toolbarだけに限定しない |
| Keyboard Shortcut | Core | PC |
| Gesture | Core | Touch Device |
| Hover | Required | 対応環境 |
| 右クリック / Context Click | Required | 重要機能をここだけに隠さない |
| Custom Toolbar | Required | |
| Custom Shortcut | Required | |
| Custom Gesture | Required | |
| Scalable UI / Text | Required | Accessibility |
| Single-pointer Alternative | Required | Multi-touch必須操作に代替手段を用意 |
| Color-independent State Indication | Required | 色だけで状態を伝えない |
| Color Description Assistance | Required | 色覚支援 |
| Reduced Motion | Required | Motionを減らす設定 |
| Touch Target Policy | Required | Touch環境で十分なHit Areaを確保 |
| Feedback Sound / Haptic | Required / Investigate | Platform対応時 |
| Keyboard Navigation for Commands | Required | 描画以外の主要操作を中心に |

## N. デバイス別適応

| 機能 | 状態 | 備考 |
|---|---|---|
| Desktop専用最適化UI | Core | Keyboard/Mouse/Pen/Panel/Hover |
| Tablet専用最適化UI | Core | Pen/Touch/片手/Canvas面積 |
| Smartphone専用最適化UI | Core | 親指/Quick Menu/小画面 |
| 機能そのものは可能な限り共通 | Core | 端末を理由に高度機能を削らない |

## O. 定規・ガイド・形状・グラデーション

競合一次資料の第1パスで、これらは一枚絵制作における確立した重要領域であることを確認した。

| 機能 | 状態 | 備考 |
|---|---|---|
| Straight / Parallel Ruler | Required | 詳細な定規一覧は継続調査 |
| 2D Grid | Required | Canvas上で直接編集 |
| Isometric Grid | Required | |
| Perspective Guide | Required | 1/2/3点透視 |
| Symmetry / Mirror | Required | |
| Radial Symmetry | Required | |
| Guide Snapping | Required | 対応ツールで予測可能に動作 |
| Guide Visibility / Lock | Required | |
| Guide Preset / Save | Required | |
| Line / Rectangle / Ellipse / Polygon | Required | |
| Post-stroke Shape Correction | Required / Investigate | 描画後に自然に整形 |
| Vector-backed Shape | Required / Investigate | Vector Layerと統合 |
| Linear Gradient | Required | |
| Radial Gradient | Required | |
| Reflected / Bilinear Gradient | Required | |
| Shape-aware Gradient | Required / Investigate | |
| Editable Gradient Stops | Required | |
| Non-destructive Gradient | Required | |
| Gradient Map | Required | Adjustmentとしても利用 |
| Gradient Dithering | Required / Investigate | 低bit出力でBanding低減 |

詳細根拠は `docs/research/COMPETITOR_MATRIX.md` を参照。

## P. ファイル・保存・Recovery・Offline

| 機能 | 状態 | 備考 |
|---|---|---|
| .illustro | Core | Native Document |
| PNG Export | Required | |
| JPEG Export | Required | |
| WebP Export | Required | |
| PSD Import / Export | Investigate / High Priority | 完全互換を謳わずFeature-by-feature互換表とLoss Reportを持つ |
| OpenRaster (.ora) | Required | OpenなLayer交換形式 |
| TIFF | Required | 高品質Raster交換 |
| SVG Import / Export | Required / Investigate | Vector交換用途 |
| OpenEXR | Required / Investigate | HDR交換用途 |
| AVIF / HEIF | Investigate | 画質・HDR・互換性を評価 |
| Auto Save | Core | |
| Crash Recovery | Core | |
| Recovery Snapshot | Core | |
| Incremental Save | Core | |
| 描画を止めない保存 | Core | |
| Offline First | Core | |
| 通常編集でログイン不要 | Core | |
| PWA Install | Investigate | 最終Runtime次第 |

## Q. Performance・Rendering

| 要件 | 状態 | 備考 |
|---|---|---|
| 体感0ラグ | Core | 品質目標 |
| Low Input Latency | Core | |
| Stable Frame Time | Core | |
| Worst Frame計測 | Core | |
| Memory Scaling | Core | |
| Canvas Size Scaling | Core | |
| GPU Brush Compositing | Investigate / likely required | |
| GPU Filter | Investigate / likely required | |
| GPU Transform | Investigate / likely required | |
| WebGPU | Investigate | 技術候補。未固定 |
| GPU Fallback | Required | 互換性上必要な場合 |

## R. AI補助

| 機能 | 状態 | 備考 |
|---|---|---|
| 生成AIを中心価値にする | Out of scope | 明示的方針 |
| 色提案 | Investigate | 決定的アルゴリズム優先 |
| Region補助 | Investigate | |
| Selection補助 | Investigate | |
| 整理補助 | Investigate | |
| 修正補助 | Investigate | ユーザー制御必須 |
| AIなしでも成立する基本機能 | Core | Offline/再現性/Privacy |

## S. 将来の共同編集

| 機能 | 状態 | 備考 |
|---|---|---|
| 絵チャ / Collaborative Drawing | Future | 本体完成後 |
| Realtime Multi-user Editing | Future / Investigate | 今は設計中心にしない |

## T. Asset Library・Navigator・拡張性

| 機能 | 状態 | 備考 |
|---|---|---|
| 2D Asset Library | Required | Local-first |
| Brush Asset | Required | |
| Brush Tip / Texture Asset | Required | |
| Paper Texture | Required | |
| Pattern | Required | |
| Gradient Preset | Required | |
| Color Palette Asset | Required | |
| Macro Asset | Required | |
| Workspace Asset | Required | |
| Reference Set | Required | |
| Shape Preset | Required | |
| Folder / Collection / Tag | Required | |
| Search / Favorite / Recent | Required | |
| Asset Import / Export | Required | |
| Navigator | Required | Thumbnail + Viewport + Zoom/Pan |
| Dock / Float Navigator | Required | |
| Multi-view of same Document | Investigate | 全体/細部、Mirror、Value確認等 |
| Plugin / Extension API | Future / Investigate | Core完成前に公開APIを固定しない |
| Internal Module Boundaries | Core | 将来拡張を不必要に阻害しない |

## U. まだ確定していない「内部方式」

第2パスまでで、主要な一般機能の**有無**についての空白はかなり減った。残る未確定は主として実装方式・互換性境界である。

- Blend Modeの正確な数式・色空間・PSD互換マッピング
- Color Pipelineの内部Working Space
- ICC変換ライブラリ/実装方式
- HDR出力・Display Mappingの具体方式
- Brush Graph / Moduleのデータモデル
- Dynamic Wet MediaのSimulation Model
- Vector Strokeの内部データモデル
- Text Shaping Engine / Font Fallback
- Selection Edge / Anti-aliasing Algorithm
- Transform Interpolation Algorithm
- Filter Execution Graph
- Tile Size / Cache / Eviction Policy
- Undo Delta / Checkpoint Policy
- Snapshot Branching Storage
- .illustro Container Layout / Versioning / Recovery Journal
- PSD Parser/Writer方式と互換境界
- Platform別File Access / PWA制約
- Canvas作成Preset・上限値
- Export Metadata Policy
- Keyboard / Gesture Default Mapping
- 一枚絵制作に必要な印刷・Soft Proof範囲

これらは推測で固定せず、個別機能仕様・アーキテクチャ設計・Prototype計測によって決定する。

第2パスの根拠は `docs/research/COMPETITOR_PASS2.md` を参照。
