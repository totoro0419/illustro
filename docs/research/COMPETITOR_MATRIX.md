# Illustro 競合調査マトリクス

> 状態: 公式一次資料による第1パス調査  
> 確認日: 2026-09-27  
> 対象: Illustro の一枚絵制作に関係する描画・編集ワークフロー  
> 注意: 各製品の全機能を完全網羅したという意味ではない。

## 調査ルール

公式製品ドキュメントで確認できた内容だけを「確認済み」とする。

この文書の目的は次の4点。

1. Illustro が一般機能を取りこぼさないこと
2. 参考にすべき優れた操作体系を見つけること
3. Illustro が再設計すべき領域を明確にすること
4. 独自機能と既存の確立した制作機能の依存関係を把握すること

## 1. Clip Studio Paint

### 確認できた関連機能

Clip Studio Paint Ver.5.0 の公式User Guideでは、少なくとも次の領域が明示されている。

- Pen / Brush
- Layer
- Color
- Selection
- Transform
- Filter / Adjustment
- Fill / Gradient
- Figure / Shape
- Text
- Ruler
- Vector Layer
- Perspective Ruler
- Timelapse
- Material

Reference Layer は Fill / Selection の参照元として利用でき、Brushにも参照レイヤーの線を越えない設定がある。

Fill Tool は編集レイヤーのみ参照、複数レイヤー参照などを持ち、線の隙間を閉じる設定も持つ。

Vector Layer は単なるRaster Pixelではなく、線のPathやControl Point等を保持し、描画後の線編集が可能。

Gradient Layer は作成後にも色・範囲・方向を変更できる非破壊的な表現を持つ。

### Illustroへの反映

**採用・同等以上を目標**

- Fill/SelectionのReference Source指定
- Gap Closing
- 編集可能なVector Stroke
- Ruler / Perspective Assistance
- 編集可能なGradient
- 高度なSelection / Transform / Layer基盤

**改善対象**

Clip Studio Paintの高度設定は非常に強力だが、設定項目が深くなりやすい。Illustroでは機能を削らず、Context UI・検索・Quick Menu等によって高頻度項目を前面化する。

**独自機能との接続**

Lineart Region System はReference Layer方式を置き換えるものではない。

Region解析を使いたくないケースでも、従来型のReference Fillを利用可能にする。

### 公式資料

- https://help.clip-studio.com/en-us/
- https://help.clip-studio.com/en-us/manual_en/180_layers/Reference_layers.htm
- https://help.clip-studio.com/en-us/manual_en/420_fill/Fill_Tool.htm
- https://help.clip-studio.com/en-us/manual_en/180_layers/Vector_layers.htm
- https://help.clip-studio.com/en-us/manual_en/180_layers/Gradient_layers.htm
- https://help.clip-studio.com/en-us/manual_en/510_ruler/Drawing_while_snapping_to_a_ruler.htm
- https://help.clip-studio.com/en-us/manual_en/360_transform/Liquify_tool.htm

## 2. Procreate

### 確認できた関連機能

Procreate公式Handbookでは次を確認した。

- Bounding BoxとHandleを使った直接的なTransform
- 複数方式のSelection
- 2D Grid
- Isometric Guide
- Perspective Guide
- Symmetry Guide
- Drawing Assist
- QuickShape
- カスタマイズ可能なQuickMenu Profile
- 複数Layer選択
- Canvas上からのLayer Select
- Reference Companion
- Reference Companion上からのEyedropper
- RGB / Display P3 / CMYK系Color Profile
- Custom Color Profile Import
- Gradient Map
- Clone
- Reference Layerを利用した別LayerへのFill

### Illustroへの反映

**採用・同等以上を目標**

- Gesture主体のDirect Manipulation
- Canvas上Transform Handle
- Canvasから直接Layerを選ぶ操作
- Perspective / Symmetry Assistance
- 描いたShapeをその場で整える操作
- Floating Reference + Direct Eyedropper
- 高速でカスタマイズ可能なCommand Surface

**改善対象**

IllustroはProcreateの低摩擦操作を参考にしつつ、より高度なLayer / Adjustment / Selection / Automationを同じ操作思想で扱う。

**独自機能との接続**

Quick Menuは固定的なツール一覧ではなく、Macro、Region Action、Layer Action、Color、Brush、Canvas Commandを登録可能にする。

Contextによる候補変化とユーザーカスタマイズの両立を検討する。

### 公式資料

- https://help.procreate.com/procreate/handbook/transform/transform-interface-gestures
- https://help.procreate.com/procreate/handbook/5.4/selections
- https://help.procreate.com/procreate/handbook/guides/guide-create
- https://help.procreate.com/procreate/handbook/guides/guides-symmetry
- https://help.procreate.com/jp/procreate/handbook/guides/quickshape
- https://help.procreate.com/procreate/handbook/5.3/interface-gestures/quickmenu
- https://help.procreate.com/procreate/handbook/layers/layers-organize
- https://help.procreate.com/procreate/handbook/5.3/actions/actions-canvas
- https://help.procreate.com/procreate/handbook/colors/colors-profiles
- https://help.procreate.com/procreate/handbook/5.1/adjustments/adjustments-color
- https://help.procreate.com/procreate/handbook/adjustments/adjustments-clone

## 3. ibisPaint

### 確認できた関連機能

ibisPaint公式資料では次を確認した。

- 大規模なBrush Library
- Material Library
- 多数のFilter
- Adjustment Layer
- PSD書き出し
- Clipping
- Alpha Lock
- Perspective Transform
- Mesh Transform
- Transform時のInterpolation設定
- Mirror Ruler
- Perspective Array Ruler
- Folder単位のMove / Transform

### Illustroへの反映

**採用・同等以上を目標**

- Touch Device上での高い機能密度
- Clipping等、高頻度Layer操作への短いアクセス
- Mobileでも利用しやすいPerspective/Ruler
- Illustration AppでもAdjustment Layerを自然に扱える設計
- Transform Interpolation
- Material / Preset管理

**改善対象**

機能数の多さがWindowやMenuの多さに直結しないよう、Context UI・Quick Menu・Gesture・Searchへ再構成する。

**独自機能との接続**

Region Fill、Smart Fill、Quick Clipping、Reference Eyedropperを組み合わせ、Mobileでの彩色手数を削減する余地が大きい。

### 公式資料

- https://ibispaint.com/about.jsp
- https://ibispaint.com/newFeature.jsp
- https://ibispaint.com/lecture/index.jsp?no=173
- https://ibispaint.com/lecture/index.jsp?lang=en&no=154
- https://ibispaint.com/lecture/index.jsp?no=156
- https://ibispaint.com/lecture/index.jsp?lang=en&no=47
- https://ibispaint.com/lecture/index.jsp?lang=en&no=90

## 4. Krita

### 確認できた関連機能

Krita公式Manualでは次を確認した。

- 複数Brush Engine
- Brush Sensor / Texture / Opacity / Flow
- Color Smudge
- Masked Brush
- 多数のLayer / Mask種別
- Selection Mask
- 複数Selection Tool
- Perspective / Warp / Cage / Liquify Transform
- Drawing Assistant
- Symmetry / Mirror
- Wrap Around系ワークフロー
- Little CMSを用いたColor Management
- ICCを意識したWorkflow
- Vector Layer
- 複数種のGradient

### Illustroへの反映

**採用・同等以上を目標**

- Brush Engineの深さ
- Sensor Mapping
- SelectionをMaskとして保持する方式
- Transformの幅
- Drawing Assistant
- Color Management
- Vector機能
- Gradient機能

**改善対象**

Engine能力の深さはKritaを参考にするが、ユーザーがBrush Engineの種類そのものを理解しないと使えない構造は避けたい。

Progressive Disclosureによって一貫したBrush UIへまとめる。

**独自機能との接続**

Procedural BrushとDynamic Wet Mediaを互いに孤立した別機能にせず、共有可能なBrush Parameter / Sensor / Material基盤として設計する。

### 公式資料

- https://docs.krita.org/en/reference_manual/brushes/brush_settings.html
- https://docs.krita.org/ja/reference_manual/brushes/brush_engines/color_smudge_engine.html
- https://docs.krita.org/en/reference_manual/brushes/brush_settings/masked_brush.html
- https://docs.krita.org/en/reference_manual/layers_and_masks.html
- https://docs.krita.org/en/user_manual/selections.html
- https://docs.krita.org/en/reference_manual/tools/transform.html
- https://docs.krita.org/en/reference_manual/tools/assistant.html
- https://docs.krita.org/en/reference_manual/preferences/color_management_settings.html
- https://docs.krita.org/en/reference_manual/layers_and_masks/vector_layers.html
- https://docs.krita.org/en/reference_manual/tools/gradient_draw.html

## 5. Adobe Photoshop

### 確認できた関連機能

Adobe公式資料では次を確認した。

- Adjustment Layer
- Scale / Rotate / Skew / Distort / Perspective / Warp
- Mesh / Control Pointを使うTransform Warp
- Liquify
- Healing Brush
- Patch Tool
- Action Recording
- ICCベースのColor Management
- Embedded Color Profile
- Blend IfによるTone Range Compositing
- Smart Objectを利用した非破壊Liquify

### Illustroへの反映

**採用・同等以上を目標**

- 高度な非破壊編集
- Tone-dependent Compositing
- Action / Macro
- ICC / Profile Management
- Warp
- Healing / Patch

**改善対象**

写真編集ソフト由来のDialog中心UIをそのまま持ち込まない。

Blend If、Warp、Healing、Patch、AdjustmentはCanvas上PreviewとDirect Manipulationを優先する。

**独自機能との接続**

Blend IfはSliderだけではなく、対象Tone RangeをCanvas上で可視化・選択できるUIを検討する。

MacroはQuick Menu / Shortcut / Context UIへ直接登録可能にする。

### 公式資料

- https://helpx.adobe.com/photoshop/web/get-set-up/learn-the-basics/compare-photoshop-web-and-desktop-features.html
- https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/transform-manipulate-reshape/transformation-options-in-adobe-photoshop.html
- https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/transform-manipulate-reshape/reshape-and-distort-images-with-transform-warp.html
- https://helpx.adobe.com/photoshop/desktop/effects-filters/artistic-stylize-filters/overview-of-liquify-filter.html
- https://helpx.adobe.com/photoshop/desktop/automate-tasks/automation-settings-and-presets/actions-overview.html
- https://helpx.adobe.com/photoshop/desktop/adjust-color/color-profiles/about-color-profiles.html
- https://helpx.adobe.com/photoshop/desktop/adjust-color/color-profiles/embed-color-profiles.html
- https://helpx.adobe.com/photoshop/using/layer-opacity-blending.html

## 6. Affinity Photo 2

### 確認できた関連機能

Affinity Photo 2公式Helpでは次を確認した。

- Adjustment Layer
- Live Filter
- Layer Mask
- Live Layer Mask
- Blend Range
- Layer State
- Snapshot
- Macro Recording / Batch
- Liquify
- Custom Brush
- Paint Mixing
- Symmetry / Mirror
- Snapping / Grid
- Dock / Floating Panel
- Custom Workspace
- Layer Tag / Find / Isolate / Lock
- Color Management
- Non-destructive Displacement
- Non-destructive Lighting Effect
- Vector/Text Tooling

### Illustroへの反映

**採用・同等以上を目標**

- Live Non-destructive Effect
- Snapshot
- Layer State
- Macro
- Flexible Workspace
- Blend Range
- Layer Search / Tag / Isolation

**改善対象**

SnapshotとLayer Compがユーザーから見て混同されないよう、保存する状態の意味を明確に分ける。

**独自機能との接続**

Snapshot、Layer Comp、History、Timelapse、Macroは内部では共通のCommand/History基盤を利用できる可能性が高い。

ただしUI上の概念は明確に分離する。

### 公式資料

- https://affinity.help/photo2/English.lproj
- https://affinity.help/photo2ipad/en-US.lproj/pages/Layers/layerBlendModes.html
- https://affinity.help/photo2ipad/en-US.lproj/pages/Channels/maskingChannels.html
- https://affinity.help/photo2ipad/English.lproj/pages/Filters/lighting_effects.html
- https://affinity.help/photo2ipad/en-US.lproj/pages/Filters/filter_displace.html
- https://affinity.help/photo2ipad/English.lproj/pages/Workspace/shortcuts.html

## 7. 横断マトリクス

凡例:

- **✓** — 今回確認した公式資料で直接確認できた
- **—** — 今回の調査では未確認。機能が存在しないことを意味しない

| 領域 | CSP | Procreate | ibisPaint | Krita | Photoshop | Affinity |
|---|---:|---:|---:|---:|---:|---:|
| Reference-based Fill | ✓ | ✓ | — | — | — | — |
| Gap-aware Fill | ✓ | — | — | — | — | — |
| Vector Layer / Vector Content | ✓ | — | ✓* | ✓ | ✓* | ✓ |
| Perspective / Drawing Guide | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Symmetry / Mirror Drawing | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Advanced Transform / Warp | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Adjustment / Non-destructive Effect | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| Tone-dependent Blend Range | — | — | — | — | ✓ | ✓ |
| Snapshot / Checkpoint | — | — | — | — | — | ✓ |
| Recorded Macro / Action | — | — | — | — | ✓ | ✓ |
| Reference + Direct Eyedropper | — | ✓ | — | — | — | — |
| ICC / Profile Color Management | — | ✓ | — | ✓ | ✓ | ✓ |
| Customizable Fast Command Surface | — | ✓ | — | — | — | — |

\* 今回は大分類として確認。具体的なデータモデルや編集能力は製品ごとに異なる。

## 8. 第1パス調査から確定した仕様上の影響

### 8.1 Drawing Guide / Ruler — Requiredへ昇格

Illustroは少なくとも次を明示的な機能領域として持つ。

- Straight / Parallel系Ruler
- Symmetry / Mirror
- Radial Symmetry
- 2D Grid
- Isometric Grid
- 1/2/3点Perspective
- GuideへのSnap
- Canvas上Handleによる直接編集
- Visibility / Lock
- Guide設定の保存

詳細なRuler種別は継続調査する。

### 8.2 Shape Correction / Shape Tool — Requiredへ昇格

次の統合方式を検討する。

- Line / Rectangle / Ellipse / Polygon
- Stroke後のShape Correction
- QuickShapeに近い自然な形状Snap
- 必要に応じたVector-backed Shape

### 8.3 Gradient System — Requiredへ昇格

少なくとも次を対象とする。

- Linear
- Radial
- Reflected / Bilinear
- Shape-aware Gradient
- Editable Stop
- Non-destructive Gradient
- Dithering
- Gradient Map

### 8.4 Color Management — Core Architecture Requirementへ昇格

Render / Document Modelを固定する前に、最低でも次を決定する。

- Color Model
- Bit Depth
- Document Color Space
- ICC Profile保持
- Display Conversion
- Import Profile Policy
- Export Profile Policy
- Wide Gamut
- CMYKを編集対象にするか、Import/Export中心にするか
- HDR / Linear-light

Color Managementは後付けで安全に解決できる前提にしない。

### 8.5 Selectionを再利用可能なデータとして扱う — Required

Selectionを一時的な「点線」だけに限定しない。

- Selection Mask
- Saved Selection
- Featherを含むGrayscale Selection
- Region → Selection
- Layer Content → Selection
- Luminance / Color Range Selection
- Boolean Operation

を対象とする。

### 8.6 大量Layer向けNavigation — Required

- Search
- Tag
- Filter
- Solo / Isolate
- Canvasから直接Layer選択
- 高速Collapse / Expand
- UI Virtualization

を前提にする。

### 8.7 History系概念を分離する

UI上では次を別概念として扱う。

- **Undo History** — 実際に行ったCommandの可逆履歴
- **Snapshot** — 名前付きDocument Checkpoint
- **Layer Comp** — Layer表示・状態セット
- **Macro** — 再利用可能なCommand列
- **Timelapse** — 制作履歴から生成する可視化・動画

内部Primitiveを共有することは可能だが、ユーザー向け概念は混同させない。

## 9. 継続調査が必要な領域

完全機能仕様と呼べる状態にするには、少なくとも次の第2パスが必要。

- Brush Dynamics / Sensorの完全な項目体系
- Vector Editing Model
- Text機能範囲
- Blend Mode完全一覧
- Filter / Adjustment完全一覧
- File Format Compatibility
- Bit Depth / HDR
- Selection Edge Algorithm
- Interpolation Algorithm
- Canvas Preset / Limit
- Material / Asset Management
- Navigator / Multi-view
- Accessibility
- Plugin / Extensibility
- Platform別File System

これらを確認するまでは「主要競合と完全同等以上」といった結論は出さない。
