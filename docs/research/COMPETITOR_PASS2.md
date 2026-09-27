# Illustro 競合調査 第2パス — 機能体系・基盤仕様

> 状態: 公式一次資料による第2パス調査  
> 確認日: 2026-09-27  
> 目的: 第1パスで未確定だった Brush Dynamics / Vector / Text / Blend / Adjustment / Color Depth / HDR / File Interchange / Navigator / Material / Accessibility / Extensibility を中心に、Illustro の正式機能体系へ反映する。

## 1. Brush Dynamics

### 確認事項

Procreate Brush Studio は、Stroke Path、Stabilization、Rendering、Wet Mix、Color Dynamics、Dynamics、Apple Pencil などを分離して設定できる。

確認した代表的入力・変調要素:

- Pressure
- Tilt
- Speed
- Random / Jitter
- Size
- Opacity
- Flow
- Bleed
- Hue / Saturation / Brightness
- Secondary Color
- Wetness / Dilution / Charge / Pull
- Stabilization / Motion Filtering

Clip Studio Paint も Brush Size、Opacity等に対し、Pen Pressure、Tilt、Speed、Random を入力源として割り当てられる。

ibisPaintも Brush Parameter に Random、Dynamic、Pressure、Speed、Texture/Paper等の概念を持つ。

### Illustro判断

IllustroのProcedural Brushは、設定項目を個別実装の寄せ集めにせず、次の共通モデルを持つべき。

**Input Sources**
- Pressure
- Tilt
- Azimuth / Barrel rotation where available
- Speed
- Direction
- Stroke distance
- Time
- Initial / terminal phase
- Random
- Custom curve

**Modulatable Properties**
- Size
- Opacity
- Flow
- Spacing
- Rotation
- Scatter
- Shape deformation
- Texture strength/scale/rotation
- Hue/Saturation/Value
- Edge hardness
- Mix/Pull
- Wetness/Pigment-related parameters
- Particle/noise parameters

各入力→出力の関係はCurve/Range/Invert等を共通UIで設定できる構造を目標とする。

### 公式資料

- https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings
- https://help.clip-studio.com/en-us/manual_en/240_brushes/Customizing_brush_tools.htm
- https://ibispaint.com/lecture/index.jsp?lang=en&no=118

## 2. Stroke Stabilization / Accessibility

### 確認事項

Procreateには以下がある。

- StreamLine
- Stabilization
- Motion Filtering
- Motion Filtering Expression
- Tip Attachment
- Global pressure sensitivity
- Single Touch Gestures Companion
- Dynamic Type
- VoiceOver連携
- larger color cards
- color description notifications
- feedback sounds

特にMotion Filteringは手の震えを抑えるアクセシビリティ用途を明示している。

### Illustro判断

StabilizationはBrushの一設定だけではなく、**アプリ全体の入力支援層**としても持つ。

アクセシビリティは後付けオプションではなくRequired。

最低限の設計対象:

- Global / per-brush stabilization
- Pressure response curve
- single-pointer alternative for multi-touch-only operations
- scalable UI/text
- keyboard-only access to non-drawing commands where practical
- icon + text/tooltip support
- colorだけに依存しない状態表示
- color-name/description assistance
- reduced motion preference
- configurable gesture alternatives
- target size / touch hit-area policy
- feedback sound/haptic where platform allows

### 公式資料

- https://help.procreate.com/procreate/handbook/interface-gestures/accessibility
- https://help.procreate.com/procreate/handbook/actions/actions-preferences

## 3. Vector Editing

### 確認事項

Clip Studio PaintのVector Layerは、線をPixelだけでなくPath/Control Pointとして保持して描画後に編集できる。

PhotoshopはPen/Path/Shapeを持ち、Anchor Point/Handleを編集できる。

KritaもVector Layerを持つ。

### Illustro判断

IllustroのVector LayerはIllustrator型DTP全般を目標にせず、**一枚絵の線画・図形・Mask用途に最適化**する。

Required:

- Path
- Anchor Point
- Bezier Handle
- Open/Closed Path
- Fill / Stroke
- Stroke width
- brush-like stroke rendering where practical
- node add/delete/convert
- line smoothing
- path simplify
- path transform
- path boolean operations
- vector eraser / line erase
- vector selection
- rasterize
- vector mask integration
- Shape tool integration

Investigate:

- variable-width stroke profile
- raster brush appearance on vector path
- Region SystemとのVector boundary integration

### 公式資料

- https://help.clip-studio.com/en-us/manual_en/180_layers/Vector_layers.htm
- https://helpx.adobe.com/photoshop/desktop/draw-shapes-paths/draw-lines-curves/draw-paths-with-the-pen-tool.html
- https://docs.krita.org/en/reference_manual/layers_and_masks/vector_layers.html

## 4. Text

### 確認事項

ProcreateはTextをVector形式で保持し、font import、kerning、tracking、baseline等を提供する。

Photoshopはeditable Type Layer、Horizontal/Vertical Type、path上/shape内Text、text→shape/path変換を持つ。

### Illustro判断

TextはRequiredだが、DTPをIllustroの中心にはしない。

Required:

- editable text layer/entity
- horizontal text
- vertical text
- font family/style/size
- alignment
- letter spacing / tracking
- line height
- baseline shift
- color
- transform
- local font import where platform allows
- rasterize
- text → vector/path conversion
- missing-font warning/substitution handling

Investigate:

- text on path
- area text
- OpenType advanced feature exposure
- variable font axes

### 公式資料

- https://help.procreate.com/procreate/handbook/text
- https://help.procreate.com/procreate/handbook/text/text-fonts
- https://helpx.adobe.com/photoshop/desktop/text-typography/text-on-paths-shapes/add-text-along-paths-or-inside-shapes.html
- https://helpx.adobe.com/photoshop/desktop/text-typography/text-on-paths-shapes/convert-text-to-shapes-or-work-paths.html

## 5. Blend Modes

### 確認事項

Kritaは非常に広いBlend Mode集合を持ち、LayerだけでなくStrokeにも適用可能。

PhotoshopはLayer blend modesとlive previewを持つ。

ibisPaintもLayer Blend Modeをイラストの光・影表現に用いる。

### Illustro判断

Blend ModeはCore。

最低限の互換性Core Set:

- Normal
- Dissolve
- Darken
- Multiply
- Color Burn
- Linear Burn
- Lighten
- Screen
- Color Dodge
- Linear Dodge / Add
- Overlay
- Soft Light
- Hard Light
- Vivid Light
- Linear Light
- Pin Light
- Hard Mix
- Difference
- Exclusion
- Subtract
- Divide
- Hue
- Saturation
- Color
- Luminosity

追加でPainting用途向け:

- Erase
- Behind
- Alpha-related modes / inherit-alpha equivalent as architecture permits

正確な数式・色空間・PSD互換マッピングは実装仕様で固定する。

Blend Modeの結果はDocument Color Space / Linear-light policyに依存するため、Color Pipeline仕様と同時に確定する。

### 公式資料

- https://docs.krita.org/en/reference_manual/blending_modes.html
- https://helpx.adobe.com/photoshop/using/layer-opacity-blending.html
- https://ibispaint.com/lecture/index.jsp?no=83

## 6. Adjustment / Filter

### 確認事項

PhotoshopのAdjustment LayerはBrightness/Contrast、Levels、Curves、Exposure、Hue/Saturation、Color Balance、Black & White、Photo Filter、Channel Mixer、Color Lookup、Selective Color、Invert、Posterize、Threshold、Gradient Map等を非破壊で扱う。

Krita Filter MaskはBlur、Levels、Brightness/Contrast等を元画像を破壊せず適用できる。

ibisPaintもAdjustment Layerで複数LayerへFilter/色調補正を再編集可能に適用できる。

### Illustro判断

**Core Adjustment Set**

- Brightness / Contrast
- Levels
- Curves
- Exposure
- Hue / Saturation / Lightness
- Vibrance
- Color Balance
- Temperature / Tint
- Black & White / Grayscale conversion
- Channel Mixer
- Selective Color
- Invert
- Posterize
- Threshold
- Gradient Map
- Color Lookup / LUT
- Solid Color / Gradient / Pattern Fill where appropriate

**Core Filter Set**

- Gaussian Blur
- Box Blur
- Motion Blur
- Radial Blur
- Lens/Depth-like Blur — Investigate exact form
- Sharpen
- Unsharp Mask
- High Pass
- Noise / Add Noise
- Median / despeckle-type cleanup
- Pixelate / Mosaic
- Offset
- Displacement
- Edge detection / stylization subset
- Halftone / screentone-oriented effect

原則:

- 非破壊版を優先
- realtime preview
- maskable
- reorderable
- blend mode / opacity control where useful
- destructive applicationも明示的Commandとして利用可能

完全なFilter数競争はしない。一枚絵制作に有効かを品質基準で判断する。

### 公式資料

- https://helpx.adobe.com/photoshop/desktop/create-manage-layers/color-adjustment-fill-layers/work-with-adjustment-and-fill-layers.html
- https://docs.krita.org/en/reference_manual/layers_and_masks/filter_masks.html
- https://ibispaint.com/lecture/index.jsp?no=173
- https://helpx.adobe.com/photoshop/using/high-dynamic-range-images.html

## 7. Color Depth / HDR / Color Pipeline

### 確認事項

Photoshopは8/16/32 Bits per Channelを扱い、32bpcをHDRとして扱う。

KritaはHDRを含むColor Managed Workflowを持ち、Rec.2020 PQやlinear spaceの概念を公式に扱う。

PhotoshopにはRGB blendingのGamma設定もあり、合成計算の色空間が見た目に影響する。

### Illustro判断

Color Managementは**Core Architecture Requirement**。

初期アーキテクチャは少なくとも次を表現可能にする。

- 8-bit integer
- 16-bit integer
- 16-bit float
- 32-bit float（必要性・メモリコストを検証）
- sRGB
- Display P3 / wide gamut
- embedded ICC profile
- profile conversion
- display transform
- linear-light capable processing path
- HDR-capable document/render pathを将来塞がない

初期公開版で全モードを同時実装する必要はないが、Document/Tile/Filter/Blendのデータ構造を8bit sRGBに固定して後から破壊的変更が必要になる設計は避ける。

CMYKは一枚絵制作の中心ではないため、**Investigate**。少なくともImport/Export/soft-proofの需要を調査した上で判断する。

### 公式資料

- https://helpx.adobe.com/uk/photoshop/using/bit-depth.html
- https://helpx.adobe.com/photoshop/using/high-dynamic-range-images.html
- https://helpx.adobe.com/photoshop/using/color-settings.html
- https://docs.krita.org/en/reference_manual/preferences/color_management_settings.html
- https://docs.krita.org/en/general_concepts.html

## 8. File Interchange / PSD

### 確認事項

Krita公式ManualはPSDについて、仕様が公開された交換フォーマットではなく完全互換が困難であることを明記している。KritaはRaster Layer、Blend Mode、Layer Style、Vector Shape、Text Layer、Group、Transparency Mask等を読み書きする。

ProcreateもPSDをImport/Exportし、compatible layer/blend dataを扱うが、Vector/TextはImport時Rasterizeされうる。

### Illustro判断

PSD対応目標を「完全互換」と表現しない。

PSD仕様:

- Feature-by-feature compatibility matrixを持つ
- Unsupported dataを読み込み時に明示する
- 書き出し時のloss reportを表示可能にする
- 可能ならunknown/unsupported dataの保持戦略を検討
- round-trip test suiteを持つ

さらにオープンなLayer交換形式として **OpenRaster (.ora)** をRequired候補へ昇格する。

追加候補:

- TIFF
- SVG（vector exchange）
- EXR（HDR / interchange）
- AVIF/HEIF（export/import usefulnessを検討）

### 公式資料

- https://docs.krita.org/en/general_concepts/file_formats/file_psd.html
- https://docs.krita.org/en/general_concepts/file_formats/file_ora.html
- https://docs.krita.org/en/general_concepts/file_formats.html
- https://help.procreate.com/procreate/handbook/gallery/gallery-file-types

## 9. Material / Asset Management

### 確認事項

Clip Studio PaintはBrush/Tool、Image/Texture、Gradient Set、Color Set、Auto Action、WorkspaceなどをMaterialとして管理できる。

### Illustro判断

3D MaterialをIllustroの中核にはしないが、2D一枚絵制作に必要なAsset LibraryはRequired。

Asset対象:

- Brush
- Brush tip / texture
- Paper texture
- Pattern
- Gradient preset
- Color palette
- Macro
- Workspace
- Reference set
- Shape preset

Required behavior:

- folder / collection
- tag
- search
- favorite
- recent
- import / export
- duplicate
- rename
- preview
- local-first storage

Cloud marketplaceはCore要件にしない。

### 公式資料

- https://help.clip-studio.com/en-us/manual_en/630_material/Materials_in_Clip_Studio_Paint.htm
- https://help.clip-studio.com/en-us/manual_en/630_material/How_to_use_materials.htm

## 10. Navigator / Multi-view

### 確認事項

Photoshop NavigatorはArtwork thumbnailと現在の表示領域を示し、thumbnail上からPan/Zoomできる。

KritaにはOverview Dockerが存在する。

### Illustro判断

NavigatorはRequired。

機能:

- document thumbnail
- current viewport表示
- click/drag to navigate
- zoom control
- canvas rotation indicator
- optional mirror/grayscale quick preview
- hideable/dockable/floating

さらに同一Documentの複数ViewをInvestigateする。

用途:

- 全体を見ながら細部描画
- color/value check
- mirrored view
- reference-scale comparison

### 公式資料

- https://helpx.adobe.com/photoshop/using/viewing-images.html
- https://docs.krita.org/en/reference_manual/dockers.html

## 11. Workspace / Search / Automation

### 確認事項

Clip Studio PaintのQuick AccessはTool、Command、Auto Action、Drawing Colorを登録でき、機能検索も持つ。

Auto Actionsは複数操作を記録・再生でき、Quick Access/Shortcutから起動できる。

PhotoshopもAction Recordingを持つ。

### Illustro判断

既存のQuick Menu / Macro方針を維持し、さらに**Command SearchをRequired**とする。

検索対象:

- commands
- tools
- panels
- brushes
- macros
- layers where context allows
- settings

Search resultからQuick Menu / Toolbarへの追加を可能にする案を採用候補とする。

### 公式資料

- https://help.clip-studio.com/en-us/manual_en/690_interface/Quick_Access_palette.htm
- https://help.clip-studio.com/en-us/manual_en/720_preferences/Auto_Actions.htm
- https://helpx.adobe.com/photoshop/desktop/automate-tasks/automation-settings-and-presets/actions-overview.html

## 12. Extensibility / Plugins

### 確認事項

KritaにはPython Plugin Managerがあり、Docker/Extensionとしてユーザー製Pluginを追加できる。

### Illustro判断

Plugin Systemは**Future / Investigate**。

理由:

- 強力だが、初期のDocument/Render/APIを早期固定すると開発速度を落とす
- Security / sandbox / version compatibilityが必要
- Mobile/Web Runtimeでは実行制約が大きい

ただし内部モジュール境界を明確にし、将来のExtension APIを不必要に阻害しない。

将来候補:

- Command extension
- Import/export codec
- Filter/adjustment extension
- Brush node/module
- Panel
- Automation function

任意コードを無制限に実行させる方式を前提にしない。

### 公式資料

- https://docs.krita.org/en/reference_manual/default_python_plugins.html
- https://docs.krita.org/en/user_manual/python_scripting/install_custom_python_plugin.html

## 13. 第2パス後の確定事項

以下はIllustroのRequired/Coreへ昇格させる。

### Core

- shared Brush Dynamics modulation model
- Color-managed document/render architecture
- Blend Mode foundation
- scalable input/stabilization layer
- accessibility-aware interaction primitives

### Required

- editable Vector Layer
- editable Text
- Saved Selection / Selection Mask
- Navigator
- 2D Asset Library
- OpenRaster interchange
- broad Adjustment Layer set
- broad Live Filter set
- accessibility settings
- Command Search

### Future / Investigate

- Plugin / Extension API
- CMYK-native editing
- full HDR authoring UX
- advanced OpenType/DTP text
- unrestricted external scripting

## 14. 残る未確定事項

機能の「有無」という意味での大きな空白は第2パスでかなり減った。

ただし実装仕様としては次が未確定。

- Blend Modeの正確な数式と互換性
- Color Pipelineの内部working space
- Brush graph/module形式
- Vector stroke data model
- Wet Media simulation model
- PSD parser/writer方式
- .illustro container layout
- Tile size/cache policy
- Undo delta/checkpoint policy
- filter execution graph
- text shaping engine
- device-specific UI mapping

これらは次の「システム設計・個別機能仕様」段階で確定する。
