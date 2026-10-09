# Illustro 機能要求仕様

> 状態: Functional Baseline v0.1  
> 目的: `PRODUCT_SPEC.md` と `FEATURE_CATALOG.md` を、実装・UI・アーキテクチャ設計で参照できる要求単位へ落とす。  
> 優先順位: `PRODUCT_SPEC.md` > 本書 > 個別機能仕様 > UI/実装仕様。  
> 注意: 本書は「実装済み」を意味しない。内部アルゴリズムが未決定でも、ユーザーから見た能力・制約・品質要件を固定する。
>
> 2026-10-04 cross-feature integration: [FEATURE_SYSTEM_INTEGRATION_2026-10-04.md](FEATURE_SYSTEM_INTEGRATION_2026-10-04.md) defines the integrated user-route/cross-feature baseline for families 1–12. User-facing completion is governed by [FEATURE_DELIVERY_GATE.md](FEATURE_DELIVERY_GATE.md).

## 1. 要求の表記

- **FR-***: Functional Requirement
- **QR-***: Quality Requirement
- **IR-***: Interaction Requirement
- **DR-***: Data / Document Requirement
- **CR-***: Compatibility Requirement
- **FUT-***: 将来要件

`MUST` 相当の要求は「〜しなければならない」、設計候補は「検討する」と明記する。

---

## 2. Document / Canvas

### FR-CANVAS-001 基本描画面

IllustroはRaster描画可能なCanvasを持たなければならない。

### FR-CANVAS-002 View Transform

Canvas Viewは少なくとも以下を即時操作できなければならない。

- Pan
- Zoom
- Rotate
- Horizontal Flip
- Fit to Screen
- 100% / actual-pixel相当表示

### FR-CANVAS-003 High Zoom

最大Zoomは **64000%を目標値**とし、高倍率でも座標の飛び・線のズレ・選択境界の破綻を起こさない設計にしなければならない。

### FR-CANVAS-004 Canvas Resize / Image Resize

Canvas ResizeとImage Resizeは別操作として提供しなければならない。

Image Resizeでは補間方式を選択可能にする。最終アルゴリズム一覧は個別仕様で決定する。

### FR-CANVAS-005 Crop

CropはCanvas上の直接操作を基本とし、必要に応じて数値指定も可能にする。

### FR-CANVAS-006 Multiple Documents

複数Documentを同時に開ける構造を持たなければならない。

### FR-CANVAS-007 Seamless Tile

Seamless Tile Drawingでは上下左右に反復表示し、境界を越える描画を反対側へリアルタイム反映しなければならない。

### QR-CANVAS-001 Large Canvas Scaling

Canvas Size増加に対して、毎操作で全画像を処理する設計を避けなければならない。

Tile-based方式を第一候補として検証する。

---

## 3. Input

### FR-INPUT-001 対応入力

以下をサポートする。

- Mouse
- Keyboard
- Touch
- Stylus

### FR-INPUT-002 Stylus Data

Platform/Deviceが提供する場合、以下を利用できなければならない。

- Pressure
- Tilt
- Azimuth
- Barrel rotation where available
- Eraser
- Barrel button

### FR-INPUT-003 Input Normalization

Device固有入力をBrush Engineが直接依存する形にせず、内部で正規化された入力イベントへ変換する。

### FR-INPUT-004 Global Input Assistance

Stroke StabilizationはBrushごとの設定に加え、必要な利用者向けにGlobal設定も提供する。

### QR-INPUT-001 Latency

Pointer入力から可視Stroke更新までの遅延を最重要性能指標として扱う。

平均FPSのみを性能評価基準にしてはならない。

---

## 4. Brush Engine

### FR-BRUSH-001 Procedural Brush

BrushはRaster Stampのみでなく、複数Parameterを動的に組み合わせて定義可能でなければならない。

### FR-BRUSH-002 Modulation Sources

Brush Parameterは少なくとも以下を変調入力として利用できる構造にする。

- Pressure
- Tilt
- Azimuth / barrel rotation
- Speed
- Direction
- Stroke distance
- Time
- Stroke start/end phase
- Random
- Custom curve

### FR-BRUSH-003 Modulatable Properties

少なくとも以下を共通変調対象として設計する。

- Size
- Opacity
- Flow
- Spacing
- Rotation
- Scatter
- Shape deformation
- Texture scale/strength/rotation
- Hue/Saturation/Value
- Edge hardness
- Mix/Pull
- Wetness
- Pigment-related values
- Noise/particle values

### FR-BRUSH-004 Mapping UI

入力値→ParameterのMappingはCurve、Range、Invert等を共通方式で設定可能にする。

### FR-BRUSH-005 Texture

Procedural方式はRaster Textureを排除しない。

Brush Tip、Grain、Paper Texture等を組み合わせられる。

### FR-BRUSH-006 Stabilization

以下を実現できる設計とする。

- simple smoothing
- moving-average系Stabilization
- advanced motion filtering系処理
- pressure smoothing
- response curve

正確なアルゴリズムはPrototypeで比較する。

### FR-BRUSH-007 Smudge / Mix

既存Pixelを引きずるSmudgeと、Pigmentを追加しながら混色するPaint Mixingを区別して扱える構造にする。

### FR-BRUSH-008 Eraser

EraserはBrush Engineの能力を可能な限り再利用し、専用機能不足を避ける。

### QR-BRUSH-001 Brush Switch

Brush切替によって制作の流れを阻害する待ち時間を発生させないことを目標とする。

---

## 5. Dynamic Wet Media

### FR-WET-001 Stateful Media

Wet Mediaは単なるStamp表現ではなく、必要に応じてCanvas側の内部状態を参照・更新できる。

### DR-WET-001 Candidate State

少なくとも以下を表現可能なモデルを検証する。

- Wetness
- Pigment
- Flow
- Absorption
- Dryness

### FR-WET-002 Simulation Goal

完全物理再現ではなく、以下の優先順位で最適化する。

1. イラストとして望ましい見た目
2. 操作の予測可能性
3. 速度
4. 物理的妥当性

### FR-WET-003 Determinism

Undo/Redo、Timelapse、保存/再開のため、同一State/Commandから再現可能な挙動を可能な限り維持する。

---

## 6. Lineart Region System

### DR-REGION-001 Region

RegionをDocument内の明示的なデータ概念として扱える構造を持つ。

### DR-REGION-002 Region Properties

Regionは少なくとも以下を持てる。

- Region ID
- Boundary
- adjacency
- source/reference information
- validity/confidence state
- mapping metadata

### FR-REGION-001 Closed Region Detection

線画から閉領域を検出できなければならない。

### FR-REGION-002 Gap Tolerance

小さな線の隙間を設定に応じて閉領域として扱える。

### FR-REGION-003 Stable Identity

線画の軽微な変更後も、可能な限り同一Regionとして対応付ける。

単純な配列index等をRegion identityとして使用してはならない。

### FR-REGION-004 Adjacency

Region間の隣接関係を取得可能にする。

### FR-REGION-005 Region Selection / Fill

RegionはSelection、Fill、Color Assistの入力として利用可能にする。

### FR-REGION-006 User Override

誤認識が発生した場合、ユーザーがRegionの結合・分離・無視・再計算等を制御できる方式を持つ。

### FR-REGION-007 Optional Semantics

Hair/Skin等の意味ラベルは将来拡張可能にするが、基本Region機能は意味認識なしで成立しなければならない。

---

## 7. Lineart-linked Coloring

### FR-LINKCOLOR-001 Boundary Recalculation

Lineart変更後、影響するRegion境界を再評価する。

### FR-LINKCOLOR-002 Color Remapping

既存Color情報を、新しいRegionへ可能な範囲で再マッピングできる。

### FR-LINKCOLOR-003 Preview

自動追従による大きな変更はユーザーが結果を確認可能でなければならない。

### FR-LINKCOLOR-004 Undo

追従処理全体をUndo可能なCommandとして記録する。

### FR-LINKCOLOR-005 Control

追従のON/OFF、強度、対象、条件を設定可能にする。

---

## 8. Fill / Coloring

### FR-FILL-001 Flood Fill

通常のColor Tolerance型Flood Fillを提供する。

### FR-FILL-002 Reference Source

Fillは以下を参照元として選択できる設計にする。

- current layer
- selected layers
- reference-designated layers
- visible composite
- Region model

### FR-FILL-003 Gap Closing

Gap ClosingとToleranceを提供する。

### FR-FILL-004 Boundary Expansion

Fill結果のExpand/Contractを設定可能にする。

### FR-FILL-005 Unified Smart Fill

以下をバラバラな独立アプリ機能として散在させず、一貫したFill Familyとして設計する。

- Region Fill
- Enclose and Fill
- Trace and Fill
- Drag Fill
- Continuous Fill

### FR-COLORASSIST-001 Smart Color Assist

Smart Color Assistはユーザーの既存Artwork/Region/Paletteを入力とする補助機能として動作する。

### FR-COLORASSIST-002 Deterministic-first

可能な処理は、AI推論を必須にせず決定的アルゴリズムで成立させる。

---

## 9. Color System / Color Management

### FR-COLOR-001 Picker

Color Picker / Eyedropper / History / Paletteを提供する。

### FR-COLOR-002 Multiple Models

少なくともRGB系とHSV/HSL系の実用的なColor Controlを提供する。

### DR-COLOR-001 ICC

Native DocumentはICC Profileまたは同等のColor Space識別情報を保持できなければならない。

### FR-COLOR-003 Color Conversion

Profile ConversionとDisplay Transformを行える構造にする。

### DR-COLOR-002 Precision

内部Document/Tile表現は、8-bit sRGBのみへ固定して将来の高精度化を不可能にしてはならない。

少なくとも以下を設計対象とする。

- 8-bit integer
- 16-bit integer
- 16-bit float
- 32-bit float（検証対象）

### FR-COLOR-004 Wide Gamut

Display P3等のWide Gamutを扱えるColor Pipelineを目標とする。

### FR-COLOR-005 Linear Processing

Filter/Blend等で必要な場合、Linear-light計算を選択・内部利用できる設計にする。

### FR-COLOR-006 HDR-ready

初期ReleaseでHDR Authoring UIを完備しない場合でも、Document/Render architectureで将来実装を不必要に塞がない。

### FR-COLOR-007 Soft Proof

指定した出力ICC Profile等を用いて、最終出力の色域・色変化をCanvas上でPreviewできるSoft Proofを提供する。

### FR-COLOR-008 Gamut Warning

Soft Proof時に、出力先で再現できない色をOut-of-Gamut Warningとして可視化できる。

Soft ProofはDocument View単位でON/OFFできる設計を優先し、元Pixelを変更してはならない。

---

## 10. Layers

### FR-LAYER-001 Layer Types

最終製品では少なくとも次を扱う。

- Raster
- Vector
- Group
- Mask
- Adjustment
- Filter
- Text

ReferenceはArtwork Layerとは意味を分離して管理できる。

### FR-LAYER-002 Multi-select

複数Layerを選択し、Move/Transform/Visibility等の適切なCommandをまとめて適用できる。

### FR-LAYER-003 Organization

以下を持つ。

- Reorder
- Search
- Filter
- Color Tag
- Lock types
- Solo/Isolate
- Collapse
- Duplicate
- Merge
- Merge Visible
- Flatten Copy

### FR-LAYER-004 Alpha Lock / Clipping

Alpha Lock / Lock Transparencyを高頻度彩色機能として提供する。

Clipping / Alpha Inheritance相当の機能も提供し、状態はLayer UIで即時認識・切替可能にする。

### FR-LAYER-005 Layer Style

Layerへ非破壊Effectを適用できるLayer Styleを提供する。

対象候補:

- Stroke
- Drop Shadow
- Inner Shadow
- Outer Glow
- Inner Glow
- Color Overlay
- Gradient Overlay
- Pattern Overlay
- Bevel / Emboss

Effectは展開・非表示・再編集可能にする。

### FR-LAYER-006 Direct Canvas Selection

Canvas上の描画内容から対応Layerを高速に選択する方法を提供する。

### QR-LAYER-001 Large Layer Count

Layer Panelは大量Layerで全Itemを常時重くRenderする実装を避ける。

Virtualization等を使用してUI応答性を維持する。

---

## 11. Vector

### FR-VECTOR-001 Path Model

Vector Layerは少なくとも以下を持つ。

- Path
- Anchor Point
- Bezier Handle
- Open/Closed Path
- Fill
- Stroke

### FR-VECTOR-002 Edit

NodeのAdd/Delete/Convert、Path Transform、Smooth/Simplifyを提供する。

### FR-VECTOR-003 Boolean

実用的なPath Boolean Operationを提供する。

### FR-VECTOR-004 Illustration-oriented Stroke

一枚絵のLineart用途に適したStroke Width編集、可変幅、Vector Eraser等を提供する。

### FR-VECTOR-005 Rasterize

Vectorを明示的にRasterizeできる。

### FR-VECTOR-006 Region Integration

Vector LineartをRegion Boundary Sourceとして利用できる方式を検討する。

---

## 12. Text

### FR-TEXT-001 Editable Text

TextはRaster化するまで編集可能なText Entityとして保持する。

### FR-TEXT-002 Japanese Support

Horizontal/Vertical TextをRequiredとする。

### FR-TEXT-003 Typography Basics

少なくとも以下を提供する。

- Font family
- style/weight
- size
- alignment
- tracking/letter spacing
- line height
- baseline
- color

### FR-TEXT-004 Font Import

Platformが許す場合、local font importを提供する。

### FR-TEXT-005 Missing Font

Fontが存在しない場合、無言で別Fontへ置換せず、missing/substitution状態を認識可能にする。

### FR-TEXT-006 Convert

TextをVector Pathへ変換する機能を提供する。

---

## 13. Selection

### FR-SELECT-001 Basic Modes

以下を提供する。

- Rectangle
- Ellipse
- Freehand
- Polygon
- Color/Similarity
- Luminance/Color Range
- Region-based
- Layer-content

### FR-SELECT-002 Boolean Operations

Add/Subtract/Intersect/Invertを提供する。

### FR-SELECT-003 Edge

Feather、Expand、Contractを提供する。

### FR-SELECT-004 Saved Selection

Selectionを一時表示だけでなく、Selection Mask等として保存・再利用可能にする。

### FR-SELECT-005 Select All / Deselect / Reselect

Select All、Deselect、直前SelectionのReselectをCommandとして提供する。

DeselectはSelection削除ではなくActive Selection解除として扱い、Undo/Reselect可能な履歴を保持できる。

### DR-SELECT-001 Grayscale

Selectionはbinaryだけでなく濃度を持つMaskとして表現可能にする。

---

## 14. Transform / Liquify / Warp

### FR-TRANSFORM-001 Basic

Move/Scale/Rotate/Flipを提供する。

### FR-TRANSFORM-002 Advanced

Perspective、Distort、Warpを提供する。

### FR-TRANSFORM-003 Liquify

Liquifyを提供する。

### FR-TRANSFORM-004 Interpolation

Raster Transformでは補間方式を選択可能にする。

### IR-TRANSFORM-001 Direct Manipulation

Canvas上Handle/Dragを主要操作とし、数値入力は補助手段とする。

### FR-TRANSFORM-005 Non-destructive

可能なTransformは非破壊状態として保持できる方式を検討・優先する。

---

## 15. Guides / Rulers / Shapes / Gradients

### FR-GUIDE-001 Guide Types

少なくとも次を提供する。

- Straight / Parallel
- 2D Grid
- Isometric
- Perspective 1/2/3 point
- Symmetry / Mirror
- Radial Symmetry

### FR-GUIDE-002 Canvas Editing

GuideはCanvas上Handleで直接編集可能にする。

### FR-GUIDE-003 Snapping

対応Drawing ToolはGuideへSnapできる。

### FR-SHAPE-001 Shapes

Line、Rectangle、Ellipse、Polygonを提供する。

### FR-SHAPE-002 Post-stroke Correction

Freehandで描いたShapeを保持操作等で幾何形状へ補正する高速操作を提供する方向で設計する。

### FR-GRADIENT-001 Gradient Types

少なくとも以下を提供する。

- Linear
- Radial
- Reflected/Bilinear

Shape-aware方式は追加検討。

### FR-GRADIENT-002 Editable

Gradient Stop、位置、向き等を作成後に変更できる非破壊表現を提供する。

---

## 16. Blend / Non-destructive Editing

### FR-BLEND-001 Core Blend Modes

少なくとも次の系統を提供する。

- Normal / Dissolve
- Darken / Multiply / Burn系
- Lighten / Screen / Dodge系
- Overlay / Soft Light / Hard Light系
- Vivid/Linear/Pin/Hard Mix系
- Difference / Exclusion
- Subtract / Divide
- Hue / Saturation / Color / Luminosity

### FR-BLEND-002 Painting Modes

Erase/Behind/Alpha関連等、Paintingに有用なModeをBrush側でも利用できる設計にする。

### FR-BLEND-003 Preview

Blend Modeを選択するときCanvas上Live Previewを提供する。

### FR-BLENDIF-001 Blend If Equivalent

Layer自身または下地のTone/Channel Rangeに応じて合成を制御できる。

UIはTone Rangeと結果の関係を視覚的に理解できる方式を優先する。

---

## 17. Adjustments / Filters

### FR-ADJ-001 Adjustment Layer

AdjustmentをLayerとして非破壊保持できる。

### FR-ADJ-002 Core Adjustments

少なくとも以下を対象とする。

- Brightness/Contrast
- Levels
- Curves
- Exposure
- Hue/Saturation/Lightness
- Vibrance
- Color Balance
- Temperature/Tint
- Black & White
- Channel Mixer
- Selective Color
- Invert
- Posterize
- Threshold
- Gradient Map
- LUT/Color Lookup

### FR-FILTER-001 Live Filter

Filterを再編集可能な非破壊状態として保持できる。

### FR-FILTER-002 Core Filters

少なくとも以下を対象とする。

- Gaussian Blur
- Motion Blur
- Radial Blur
- Sharpen
- Unsharp Mask
- High Pass
- Noise
- Median系cleanup
- Pixelate/Mosaic
- Offset
- Displacement
- Halftone/Screentone-oriented effect

### FR-FILTER-003 Composition

Live Filterは必要に応じてMask、Opacity、Blend Mode、Reorderを利用できる。

### FR-FILTER-004 Destructive Apply

高速・単純な用途向けに、明示的な破壊適用Commandも提供できる。

---

## 18. Healing / Patch / Clone

### FR-REPAIR-001 Healing

周囲のTexture/Colorを利用した修復Brushを提供する。

### FR-REPAIR-002 Patch

選択領域を別領域から修復するPatch Workflowを提供する。

### FR-REPAIR-003 Clone

Source Pointを指定して描画するCloneを提供する。

### IR-REPAIR-001 Illustration-oriented

写真編集Dialog中心ではなく、Canvas上でSource/Targetを確認できる直接操作を優先する。

---

## 19. Reference Workspace

### FR-REF-001 Independent References

ReferenceはArtwork Layerとは独立して管理可能にする。

### FR-REF-002 Multiple

複数Referenceを同時表示可能にする。

### FR-REF-003 Manipulation

Referenceごとに以下を提供する。

- Move
- Scale
- Rotate
- Flip
- Grayscale
- Pin
- Hide
- Always-on-top相当

### FR-REF-004 Groups

Reference Groupを作成可能にする。

### FR-REF-005 Eyedropper

Reference上から直接Color Pickできる。

### DR-REF-001 Persistence

DocumentまたはWorkspaceにReference状態を保存できる。

---

## 20. History / Snapshot / Layer Comp / Timelapse

### DR-HISTORY-001 Command History

Undo/Redoは可能な範囲で意味のあるCommand単位で管理する。

### FR-HISTORY-001 Deep Undo

長い作業でも実用的なUndo Depthを維持する。

### FR-SNAPSHOT-001 Snapshot

ユーザーが名前付きCheckpointを保存できる。

### FR-SNAPSHOT-002 Compare

Snapshot間またはCurrentとの比較を容易にする。

### FR-SNAPSHOT-003 Branch

Snapshotから分岐制作できる構造を検討する。

### FR-LAYERCOMP-001 Layer Comp

LayerのVisibility/Opacity/Blend Mode等の状態セットを保存・復元できる。

### FR-TIMELAPSE-001 History-based

Timelapseは可能な限りDocument変更履歴を利用し、UIを映さない。

### FR-TIMELAPSE-002 Export

高解像度出力とFrame pacing調整を提供する。

### CONCEPT-HISTORY-001 Separation

以下はユーザー向け概念として区別する。

- Undo History
- Snapshot
- Layer Comp
- Macro
- Timelapse

内部Primitiveの共有は許容する。

---

## 21. Work Time

### FR-WORKTIME-001 Active Time

Documentを開いている時間ではなく、実際の編集活動を基準に時間を計測する。

### FR-WORKTIME-002 Idle

長時間入力・編集がない期間は自動除外する。

### FR-WORKTIME-003 Views

少なくとも次を表示可能にする。

- Session
- Today
- Total
- Average

### FR-WORKTIME-004 Privacy

Work TimeはOfflineで成立し、外部Server送信を必須にしない。

---

## 22. Macro / Automation

### FR-MACRO-001 Record

複数Commandを記録し再生できる。

### FR-MACRO-002 Edit

記録済みMacroからCommandの有効/無効、順序変更等を可能にする。

### FR-MACRO-003 Parameterization

適切なCommand Parameterを実行時入力・Preset化できる方式を検討する。

### FR-MACRO-004 Access

Macroは以下から起動できる。

- Macro Panel
- Shortcut
- Quick Menu
- Command Search

---

## 23. Quick Menu / Search

### FR-QUICK-001 Customization

Quick Menuへ少なくとも以下を登録可能にする。

- Tool
- Command
- Brush
- Color
- Macro
- Layer Action
- Canvas Action

### FR-QUICK-002 Item Metadata

ItemはIcon、Label、Shortcut、Group等を持てる。

### FR-QUICK-003 Context

ユーザーの固定Customizationを尊重しながら、Contextに応じた候補表示・Profile切替を検討する。

### FR-SEARCH-001 Command Search

Tool/Command/Panel/Brush/Macro/Setting等を横断検索できる。

### FR-SEARCH-002 Add from Search

検索結果からQuick Menu/Toolbar等へ追加できる操作を検討する。

### FR-SHORTCUT-001 Press-to-bind

Keyboard Shortcutの追加は、キー名を文字列入力・リスト選択する方式をPrimaryにしない。

対象Commandの「ショートカットを追加」を実行するとCapture Modeへ入り、**ユーザーが実際に押したキー組み合わせをShortcutとして登録する方式**を標準とする。

例:

Commandを選択 → ショートカットを追加 → Capture Mode → 実際に `Ctrl + Shift + K` を押す → 候補表示 → 確定。

### FR-SHORTCUT-002 Live capture display

Capture Mode中は、現在認識しているキー・Modifierをリアルタイム表示する。

少なくとも次を区別する。

- Ctrl
- Shift
- Alt / Option
- Meta / Command
- main key

### FR-SHORTCUT-003 Conflict detection

入力されたShortcutが既存Bindingと衝突する場合、確定前に衝突先を表示する。

ユーザーは少なくとも次を選択できる。

- 既存Bindingを置換
- 新規登録をキャンセル
- 別のShortcutを入力

Silent overrideは禁止する。

### FR-SHORTCUT-004 Multiple bindings

一つのCommandへ複数Shortcutを登録可能にする。

Default ShortcutとUser Shortcutを区別して保持できる構造にする。

### FR-SHORTCUT-005 Remove / cancel

- Capture Modeは `Esc` 等でキャンセル可能にする。
- 既存Shortcutは明示操作で解除可能にする。
- Shortcut解除とCommand削除を混同しない。

### FR-SHORTCUT-006 Reserved shortcut warning

OS / Browser / Runtimeが優先して取得する可能性のあるShortcutは、登録時に警告する。

Runtime上確実に受け取れない組み合わせを「使用可能」と誤表示しない。

### FR-SHORTCUT-007 Event-derived binding

Shortcut Captureでは実Keyboard EventからBinding情報を取得する。

単なる表示文字列だけを保存せず、少なくとも以下を区別して保持できる設計とする。

- normalized modifiers
- logical key
- physical key code
- display label

Keyboard Layout差を考慮し、保存データをUI表示文字列そのものへ依存させない。

### FR-SHORTCUT-008 Modifier-only policy

Modifier単体のShortcutは誤操作・OS競合が大きいためDefaultでは割当対象外とする。

高度設定として許可するかは、Input/UI Prototypeで再評価する。

### FR-SHORTCUT-009 Immediate discoverability

Shortcut編集画面だけでなく、Command Search、Quick Menu、Menu/Tooltip等から現在のShortcutを確認できる設計にする。

### FR-SHORTCUT-010 Touch-device equivalence

Physical KeyboardがないTablet/Smartphoneでも同じCommandへ到達可能でなければならない。

Keyboard Shortcutは高速アクセス手段であり、Command唯一の入口にしてはならない。

---

## 24. Workspace / Device Adaptation

### FR-WORKSPACE-001 Desktop Panels

PCではDock/Undock/Floating/Resize/Reorder/Hideを提供する。

### FR-WORKSPACE-002 Save / Load

Workspaceを保存・復元できる。

### FR-WORKSPACE-003 Presets

Drawing/Painting/Coloring/Photo Editing/Pixel Art/Minimal等のPresetを提供する方向で設計する。

### FR-WORKSPACE-004 Canvas Focus Mode

Panel/Toolbar等の非必須UIを一操作で一時的に隠し、Canvas面積を最大化するFocus/Canvas-only Modeを提供する。

- selected Toolを維持する
- Artwork stateを変更しない
- Undo Historyへ入れない
- keyboardなし端末でも解除可能
- storage/recovery/error等の重大状態を完全に不可視化しない

### FR-DEVICE-001 Adaptive UI

Desktop/Tablet/Smartphoneで、同一UIを単純Scaleして使い回してはならない。

### FR-DEVICE-002 Capability Preservation

画面サイズを理由として高度機能そのものを削除することを原則としない。

アクセス方法を再設計する。

### FR-DEVICE-003 Left/Right

Left/Right LayoutをToolbarだけでなくPanel/Popup/Quick Menu/主要操作位置まで考慮する。

### FR-DEVICE-004 Capability-driven Adaptation

PC / Tablet / Smartphoneという端末分類だけでRenderer、入力方式、Worker数、機能可否を決めてはならない。

Viewport、Pointer、Hover、Keyboard、GPU、Storage等をRuntime Capabilityとして検出し、実際の環境へ適応する。

User-Agent文字列を主要な機能分岐根拠にしない。

### FR-DEVICE-005 Core Fallback Independence

以下はCore paintingの必須条件にしない。

- WebGPU
- SharedArrayBuffer
- Stylus
- Pressure / Tilt
- Hover
- Physical Keyboard
- Direct File System Picker
- PWA install

利用できない場合もCore Normal Operationが成立しなければならない。

### FR-DEVICE-006 Core Normal Operation

PC / Tablet / Smartphoneで少なくとも以下が同じDocument semanticsで成立することを必須とする。

- Document create/open
- Raster Brush / Eraser
- Color Pick / Change
- Layer / Group / Clipping
- Undo / Redo
- Pan / Zoom / Rotate
- Basic Selection / Transform
- Reference viewing
- Autosave / Recovery
- portable .illustro export/import
- PNG / JPEG / WebP export

### FR-DEVICE-007 Input Arbitration

Pen / Touch / Mouseが同時に存在する環境を前提とする。

DefaultではPenをDrawing、TouchをCanvas Gestureへ割り当て、Finger Drawingは設定可能にする。

Sensor値がHardware/Browserから提供されない場合に、default値を実測Sensor値として扱ってはならない。

### FR-DEVICE-008 Mobile Viewport Adaptation

Smartphone / Tabletでは以下を動的に扱う。

- safe area
- Visual Viewport
- software keyboard
- orientation
- split view / window resize
- browser chromeによるviewport変化

重要UIがnotch、home indicator、software keyboard等の背後に隠れないようにする。

### FR-DEVICE-009 Mobile Lifecycle Recovery

MobileではBackground化後のprocess termination / tab discardを通常のFailure Modeとして扱う。

beforeunload / unload完了をData Safety条件にしてはならない。

通常編集時からRecovery Journalを進め、visibility hiddenを追加flushの契機として利用する。

### FR-DEVICE-010 Dynamic Resource Budget

Memory、GPU Cache、Worker数、Background Job量をPC/Tablet/Smartphoneごとの固定値だけで決めない。

Runtime capabilityと実測負荷から調整可能にする。

navigator.deviceMemory等のoptional/coarsened情報はhintとしてのみ利用する。

---

## 25. Accessibility

### FR-A11Y-001 Scalable UI

UI/Text Sizeを拡大可能にする。

### FR-A11Y-002 Single-pointer Alternative

Multi-touchでしか実行できない主要操作を作らず、代替UIを持たせる。

### FR-A11Y-003 Non-color-only State

状態・警告・選択を色だけで伝えない。

### FR-A11Y-004 Color Assistance

Color Name/Description等、色覚を補助する機能を提供する方向で設計する。

### FR-A11Y-005 Reduced Motion

不要なAnimationを減らす設定を持つ。

### FR-A11Y-006 Stabilization

Global Motion Filtering/Stabilizationを利用可能にする。

### FR-A11Y-007 Targets

Touch Deviceでは十分なHit Targetを保証するDesign Tokenを定義する。

### FR-A11Y-008 Keyboard

描画そのものを除く主要Commandは、PCでKeyboardから到達可能にすることを目標とする。

---

## 26. Asset Library

### FR-ASSET-001 Asset Types

少なくとも次を管理できる。

- Brush
- Brush tip
- Texture
- Paper
- Pattern
- Gradient
- Palette
- Macro
- Workspace
- Reference Set
- Shape

### FR-ASSET-002 Organization

Folder/Collection/Tag/Search/Favorite/Recentを提供する。

### FR-ASSET-003 Import / Export

AssetをImport/Exportできる。

### FR-ASSET-004 Local-first

Cloud接続なしでAsset Libraryが成立する。

---

## 27. Navigator / Multi-view

### FR-NAV-001 Navigator

Artwork ThumbnailとCurrent Viewportを表示するNavigatorを提供する。

### FR-NAV-002 Direct Navigation

NavigatorからPan/Zoomできる。

### FR-NAV-003 Workspace

NavigatorはDock/Float/Hide可能にする。

### FR-NAV-004 Multi-view

同一Documentを複数Viewで表示する機能をInvestigateする。

---

## 27.1 Clipboard / Cross-document Transfer

### FR-CLIP-001 Internal Clipboard

Illustro内部Clipboardを持ち、System Clipboardの可否に依存せずCopy/Cut/Pasteを成立させる。

### FR-CLIP-002 Copy / Cut / Paste

少なくとも以下を提供する。

- Copy
- Cut
- Paste
- Copy Merged
- Paste in Place

Selectionがある場合はSelection範囲を尊重する。

### FR-CLIP-003 Native Payload

Illustro内Document間では、可能な対象についてRaster化せずNative Layer/Object情報を保持できるClipboard payloadを優先する。

Copy Merged等は明示的にRaster結果を作る。

### FR-CLIP-004 System Clipboard Bridge

Browser/OSが許す場合、画像等をSystem Clipboardと交換可能にする。

System Clipboard API/permissionをCore Copy/Pasteの必須条件にしない。

### FR-CLIP-005 Paste Destination

PasteはDefaultでactive layer/group contextの直上へ新しいLayer/Objectとして追加する。

Paste in PlaceはIllustro内部Clipboardでsource document coordinatesが分かる場合、その位置関係を保持する。

### FR-CLIP-006 Cross-device Access

KeyboardのないTablet/SmartphoneでもCopy/Cut/PasteへUIから到達可能にする。

## 27.2 Localization / Internationalization

### FR-I18N-001 Localizable UI

UI文字列を実装コードへ散在させず、localization可能なresourceとして管理する。

### FR-I18N-002 Japanese Layout Support

日本語UI文字列、CJK font fallback、IME入力、長い翻訳文字列でも主要UIが破綻しないLayoutを前提にする。

### FR-I18N-003 Locale-independent Identity

Command ID、Shortcut binding、File schema、Macro等の内部Identityへlocalized display stringを使用してはならない。

### FR-I18N-004 Formatting

数値、単位、日時等はLocaleに応じた表示を可能にするが、Document canonical numeric valuesとは分離する。

初期出荷Locale一覧はUI/Product phaseで確定する。

## 28. File Format / Persistence

### DR-FILE-001 Native Format

Native Formatは **.illustro** とする。

### DR-FILE-002 Native Data

.illustroは少なくとも以下を保存可能にする。

- Canvas
- Layer tree
- Masks
- Vector
- Text
- Brush/document-specific brush data
- Region
- References
- Snapshot
- Layer Comp
- Timelapse/history-related data
- Workspace/document metadata
- Color profile
- Recovery/version metadata

### FR-FILE-001 Standard Export

PNG/JPEG/WebPをRequiredとする。

### FR-FILE-002 OpenRaster

OpenRaster (.ora)をLayer交換形式としてRequiredとする。

### FR-FILE-003 TIFF

TIFFを高品質Raster交換形式としてRequiredとする。

### FR-FILE-004 PSD

PSD Import/ExportはHigh-priority Investigate。

「完全互換」を前提にせず、Feature-by-feature互換性を管理する。

### CR-PSD-001 Loss Reporting

PSD Import/Exportで情報損失が発生する場合、可能な限りユーザーへ明示する。

### CR-PSD-002 Round Trip

PSD対応を実装する場合はRound-trip Test Suiteを持つ。

### FR-FILE-005 SVG / EXR

SVGとOpenEXRをそれぞれVector/HDR Interchange候補として検証する。

---

## 29. Autosave / Recovery / Offline

### FR-SAVE-001 Autosave

制作中の定期・イベント駆動保存を提供する。

### FR-SAVE-002 Incremental Save

Document全体を書き直さず変更分を安全に永続化できる方式を優先する。

### FR-SAVE-003 Crash Recovery

Crash後に最後の安全な状態へ復旧できる。

### FR-SAVE-004 Recovery Snapshot

通常Saveと独立したRecovery Stateを保持する。

### QR-SAVE-001 Non-blocking

保存処理でStroke/Inputを長時間Blockしてはならない。

### FR-OFFLINE-001 Offline Core

以下はInternetなしで成立しなければならない。

- Draw
- Edit
- Save
- Layer
- Brush
- Undo/Redo
- Reference
- Filter
- Macro
- Asset Library

### FR-OFFLINE-002 Login

通常のLocal制作でLoginを必須にしない。

---

## 30. Performance

### QR-PERF-001 Perceived Zero Lag

「体感0ラグ」を目標とする。

### QR-PERF-002 Metrics

少なくとも以下を継続計測対象とする。

- Input latency
- frame time
- worst frame
- memory usage
- canvas-size scaling
- layer-count scaling
- Undo latency
- brush-switch latency
- save interruption

### QR-PERF-003 Partial Update

変更範囲のみを更新できるArchitectureを優先する。

### QR-PERF-004 GPU

GPUが有効な環境ではBrush/Filter/Transform/Blend/Preview等へ積極利用する。

### QR-PERF-005 Fallback

GPU Feature差によって基本編集不能にならないFallback戦略を持つ。

### QR-PERF-006 Zero-cost inactive features

使用していない高度機能が、通常描画の恒常的なCPU/GPU処理を発生させてはならない。

例:

- Region解析はRegion依存機能を使用しないDocumentでは常時実行しない
- Soft Proof OFF時はProof変換を実行しない
- Wet Media未使用時はWet stateを確保しない
- PSD/EXR等のCodecは必要になるまでロードしない
- Timelapse用の高コストな動画生成処理は制作Hot Pathで行わない

### QR-PERF-007 Startup / First Draw

アプリ起動から最初のStrokeまでに、通常描画へ不要な高度Moduleの初期化完了を待たせてはならない。

Module/Shader/Codec/Assetは可能な限り遅延ロード・遅延Compileする。

### QR-PERF-008 Copy / Allocation Budget

Hot Pathでは大きなBufferの不要なCopy、短命Objectの大量生成、全Tile/全Layerの複製を避ける。

JS↔WASM↔Worker↔GPU間の境界は、抽象化の統一性より**実測されたCopy/Serialization cost**を優先して配置する。

### QR-PERF-009 Background Work Budget

Background解析・Materialization・Cache生成はForegroundのInput/Present予算を侵食しない。

Idleであることだけを理由に無制限のBackground処理を開始せず、CPU/GPU/Memory/Thermal budgetを持つ。

### QR-PERF-010 Adaptive architecture

Thread/Worker/WASM/GPUの配置は一つの理想構造へ固定せず、Target deviceで最も軽い構成を選択できるようにする。

同じSemantic contractを保つ限り、DesktopとMobileで物理実行構成が異なることを許容する。

---

## 31. AI Policy

### FR-AI-001 Author-first

AIがArtwork完成を主体的に代行することをIllustroの中心価値にしない。

### FR-AI-002 Assistive Only

AI利用候補はColor/Region/Selection/Organization/Repair等の補助を中心とする。

### FR-AI-003 Deterministic Alternative

可能な機能はAIなしでも成立するAlgorithmを優先する。

### FR-AI-004 Offline / Privacy

AI FeatureがなくてもCore Painting Workflowは完全に成立しなければならない。

---

## 32. Extension Policy

### FUT-EXT-001 Plugin API

Plugin/Extension APIは本体完成前の必須機能にしない。

### DR-EXT-001 Internal Boundaries

将来のExtensionを不必要に妨げないよう、Command/Document/Render/Import-Export等の内部Module Boundaryを明確にする。

### FUT-EXT-002 Potential Extension Points

将来候補:

- Commands
- import/export codec
- filters
- brush modules
- panels
- automation functions

任意コードの無制限実行を前提としない。

---

## 33. Future Collaboration / 絵チャ

### FUT-COLLAB-001

絵チャ・Realtime共同描画は、Core Illustro完成後のFuture Scopeとする。

### DR-COLLAB-001

現段階でRealtime Collaboration向けの複雑性をCore設計へ持ち込まない。

ただし、Document ID、Command、Entity identity等について、将来の共同編集を不必要に不可能にする制約は避ける。

---

## 34. 仕様上の未確定事項

Architecture V2によりCross-cutting Core semanticsは以下まで確定した。

- stable ID / Revision / Operation taxonomy
- signed sparse Raster coordinate model
- canonical logical Tile 256
- Surface-level UNORM8 / UNORM16 / FLOAT32 Raster precision
- straight alpha / hidden RGB
- semantic Brush record / deterministic random boundary
- Persistence / Recovery dependency closure
- Shared Region Resolver fixed/live/confidence/identity boundary

以下は引き続き、主にFeature-specific implementation / Prototype / UIで決める。

- working color spaceの製品Default
- ICC implementation/library
- HDR output/display mapping
- exact Blend Mode compatibility formula
- Brush stabilization/reconstruction calibration constants
- Wet Media simulation
- Region evidence/gap/confidence thresholds
- Vector stroke representation
- text shaping engine
- selection antialiasing/resampling kernels
- advanced transform interpolation
- live-filter render graph details
- physical .illustro container/versioning/compression
- PSD parser/writer mapping
- Web/PWA/Desktop runtime composition
- default keyboard/gesture mapping
- concrete PiP / Quick Controller / Panel / Color / Brush UI

これらは該当Subsystem Gateで確定する。Cross-cutting Core仕様へ逆流する変更が必要になった場合はArchitecture V2を明示的に改訂する。

---

## 35. 次段階へのGate

### 35.1 Architecture Gate

Current semantic design baseline:

- `docs/architecture/ARCHITECTURE_V2.md`

Architecture V1の5 Gate + Second Auditは、実現可能性・性能基盤のEvidenceとして保持する。

V2で追加確定した主要事項:

- UUID stable identity + runtime handle + content digest分離
- one Transaction → one immutable Revision
- semantic Operation records
- signed overscan Raster
- canonical logical Tile 256 / adaptive execution subdivision
- UNORM8 / UNORM16 / FLOAT32 Raster Surface
- straight alpha / hidden RGB
- Brush semantic record / Philox4x32-10 random
- Preview / strict materialization boundary
- WriterEpoch + CommitSequence + dependency-closed Recovery
- Shared Region Resolver / fixed-live / confidence / lineage rules

Architecture design completionだけではProduction implementation authorizationにならない。

### 35.2 Interaction Gate

Core painting workflowについては `docs/interaction/INTERACTION_MODEL.md` と `docs/features/*.md` をSourceとして使用する。

Core painting interaction baselineはVisual prototypeへ進める精度がある。

Concrete UI placement/shape/layoutはユーザー共同設計とする。

### 35.3 Brush Production Gate

Semantic design: **COMPLETE**。

Production前に `docs/architecture/BRUSH_RENDER_CONTRACT_V2.md` のPrototype/Benchmark Gateを通す。

Calibration対象:

- stabilizer/reconstruction coefficients
- mutable-tail budgets
- preview tolerance
- materialization limits
- supported-device performance profile

### 35.4 Region / Fill Production Gate

Semantic design: **COMPLETE**。

Production前に `docs/architecture/REGION_RESOLVER_V2.md` のlabeled corpus benchmarkを通す。

Calibration対象:

- evidence threshold
- gap/bridge threshold
- confidence/margin threshold
- update/work budgets

### 35.5 Persistence / Native File Gate

Logical Save/Recovery semanticsは `docs/architecture/PERSISTENCE_RECOVERY_LOGICAL_V2.md` で確定。

Production Persistence / portable `.illustro` 前にphysical encodingを決める。

### 35.6 UI generation rule

Visual UIはユーザーと共同で設計する。

UI生成を行う場合は専用UI Design Skillを使用し、Interaction SpecやArchitectureを勝手に補完・変更してはならない。

未承認:

- PiP具体形
- Quick Controller具体形
- Panel layout
- Color UI
- Brush Settings UI
- Desktop / Tablet / Smartphone concrete layout
- icons/theme/visual hierarchy

### 35.7 Production authorization

**Core Drawing Slice implementation is authorized under IMPLEMENTATION_BASELINE.md by the 2026-10-05 user task.**

Architecture V2 completion、Prototype PASS、UI prototype完成のいずれも、自動的な実装許可ではない。

今回の許可範囲は本番準備と最小骨格。続くCore Drawing Sliceは正本基準に従って開始可能。mainへのmergeは許可されていない。

### 35.8 Still-open calibration decisions

次はArchitectureのsemantic defectではなく、該当Feature/Runtimeの測定項目。

- heavy-kernel TS/WASM split
- exact memory/cache budgets
- scheduler deadlines
- Brush calibration constants
- Region thresholds
- ICC implementation/library
- physical .illustro encoding/compression
- PSD mapping
- advanced-feature interaction details

代表的なProduction-like workload / labeled corpusで測定し、該当仕様へversioned resultとして追加する。
