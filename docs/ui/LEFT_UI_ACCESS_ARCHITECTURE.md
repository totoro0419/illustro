# Illustro Left UI Access Architecture

> Status: **ACTIVE DESIGN / LEFT-UI FOCUS**
> Date: 2026-09-29
> Scope: PC / tablet Left UI as the universal access root
> Parent: [UI Gate E](UI_GATE_E.md)
> Coverage appendix: [Left UI Access Coverage](LEFT_UI_ACCESS_COVERAGE.md)
> Related specs: [Pinned Rail Specification](LEFT_PINNED_RAIL_SPEC.md) / [Left Tool Surface Options](LEFT_TOOL_SURFACE_OPTIONS.md)

## 1. Decision

Illustroの左UIは、単なるToolboxではなく **全ユーザー向け機能へ到達するためのRoot Navigation** とする。

ただし、すべてを常時表示しない。

常設面は高頻度項目をユーザーがPinする **Pinned Rail** とし、常設しない機能は **All Features** からカテゴリ階層で到達する。

上部バー、右Workspace/PiP、六角形Quick Controller、ショートカット、Gestureは別の入口を持ってよいが、主要機能は左UIからも到達可能にする。

例外:

- 描画Engine、Tile Cache、GPU Pipelineなどの内部機構は直接ユーザー操作ではないため、左UIに偽の入口を作らない。
- Future機能は現行UIに露出させない。
- RecoveryやAutosave等の自動機能は、状態確認/設定が必要な部分だけ左UIから到達可能にする。

## 2. UIimprove適用方針

UI Implementation Quality Skillの方針に従い、以下をGate E制約とする。

- 見た目を簡単にするために主要/高頻度機能を隠さない。
- UIパターンは見た目ではなく操作の意味で選ぶ。
- 主要タスクはPointer / Pen / Touch / Keyboardの適用可能な経路から到達できる。
- Viewport幅だけで入力方式を決めない。
- Selected / Disabled / Error / Recovery状態を明示する。
- Visual polishよりtask correctness、discoverability、recoverabilityを優先する。

## 3. 競合から採用する構造上の知見

### Photoshop

ToolbarとExtra Toolsを分離し、追加・削除・並べ替え・グループ化を許す。

Illustroへの採用:

- 全機能母集団と常設項目を分離する。
- Pinned Railはユーザー編集可能にする。
- 「見えていない = 存在しない」にならないAll Features入口を常設する。

### CLIP STUDIO PAINT

Tool / Sub Toolを移動・再グループ化でき、Sub Toolを独立Toolとして昇格できる。

Illustroへの採用:

- Tool Familyを基本単位にする。
- Family内部のMode/Toolを個別Pin可能にする。
- PinしてもCore command/tool identityは増やさない。

### Procreate

高頻度操作だけを強く露出し、Selection/Transformは選択後にContextual toolbarを出す。

Illustroへの採用:

- Default Railを機能カタログの縮小コピーにしない。
- Tool選択後の操作はContext UI / 右PiPに委ねる。
- 左UIは入口、Canvasは作業場所という役割を守る。

### Krita / ibisPaint

Kritaは広いToolboxを持ち、ibisPaintは小さいMain Toolbarと大きなTool Select Windowを分ける。

Illustroへの採用:

- 全機能に到達できる大きな選択面を持つ。
- ただし常設Railは小さく保つ。

## 4. Left UIの4層

### L0 — Pinned Rail

Canvas左端に常設する細いアイコン主体Rail。

ここにはユーザーが選んだ項目だけを置く。

Pin可能Type:

- Tool Family
- individual Tool / Mode
- Command
- Toggle
- Workspace/PiP opener
- Category shortcut
- specific Brush Preset / Shape Preset等のdynamic entry（許可されたもの）

つまり、LayersやColorを左へPinしたいユーザーも許可する。

ただし **Default Rail** は高頻度Tool中心とし、最終構成は別途決める。

### L1 — All Features

Railに **常に存在するRoot button**。

このボタンはユーザーが削除できない。

役割:

- 全カテゴリへの入口
- 全機能Search
- Pin編集
- Category shortcut追加
- 最近使った機能への補助アクセス

All Features自体は作品を編集するCommandではなく、Navigation UIなのでArtwork Historyへ入れない。

### L2 — Category Palette

All Featuresから左側にanchoredなPaletteを開く。

PC:
- Railの右側へanchored panelとして展開。
- Canvasを必要以上に押し縮めず、通常はoverlay。
- Keyboard/Searchで直接絞り込み可能。

Tablet:
- 同じ情報構造を維持し、pen/touchで扱えるanchored drawer/cardへ投影。
- 画面幅ではなくinput capability / available spaceで密度を調整。

カテゴリは以下の12個。

#### Create

1. **描画**
2. **塗り・色・Region**
3. **選択・変形**
4. **ベクター・文字・図形**
5. **定規・ガイド**

#### Structure / Edit

6. **レイヤー・合成**
7. **補正・フィルター・修復**
8. **資料・アセット**
9. **履歴・自動化**

#### Canvas / App

10. **キャンバス・表示**
11. **ドキュメント・編集・出力**
12. **ワークスペース・設定**

カテゴリ名はLocalization対象。内部IDは表示名と分離する。

### L3 — Category contents

カテゴリを選択すると、そのカテゴリ内を **Family / Group** 単位で表示する。

深い多段menuにはしない。

基本は:

```
Category
  ├─ Tool / Mode
  ├─ Command
  ├─ Workspace opener
  └─ Settings / Properties
```

複雑なFamilyはinline expansionでModeを表示する。

例:

```
選択・変形
  ├─ Selection
  │   ├─ Rectangle
  │   ├─ Ellipse
  │   ├─ Freehand
  │   ├─ Polygon
  │   ├─ Similar Color
  │   └─ Region
  ├─ Move
  ├─ Transform
  │   ├─ Free
  │   ├─ Perspective / Distort
  │   ├─ Warp
  │   └─ Liquify
  └─ Selection Commands
      ├─ Invert
      ├─ Feather
      ├─ Expand / Contract
      └─ Save Selection
```

## 5. 左から右UIへつなぐ規則

左UIが全機能への入口でも、詳細設定を左へ詰め込まない。

左から選ばれた項目は意味に応じて3種類のdestinationを持つ。

### A. Canvas activation

Tool/Mode。

例:
- Brush
- Fill
- Selection
- Transform
- Text

挙動:
1. 左で選択
2. Canvas input modeを変更
3. 必要ならContext Surface更新
4. 詳細設定は右PiPに残す/呼び出せる

Tool選択だけで右PiPを強制openしない。ユーザーのWorkspaceを勝手に変えない。

### B. Right Workspace/PiP focus

Panel / Settings / Properties。

例:
- Layers
- Brush settings
- Color
- History
- Reference
- Asset Library
- Layer Effects
- Color Management

挙動:
1. 左で選択
2. 対応Blockが既にopen → focus/bring forward
3. 閉じている → 右magnetic Workspaceにopen
4. detached済み → そのdetached blockをfocus
5. 同じ意味のBlockを重複生成しない（複数instanceを仕様化した機能を除く）

### C. Immediate command

一回実行Command。

例:
- Undo / Redo
- Invert Selection
- Merge
- Canvas Flip
- Copy Merged

挙動:
1. 左から実行
2. 結果/失敗を即時feedback
3. 必要ならContext/右PiPで結果を確認
4. 同じsemantic CommandをQuick Controller/shortcut等も呼ぶ

## 6. Category contents — initial information architecture

### 6.1 描画

Tool:
- Brush
- Eraser
- Smudge / Blend

Brush workspace links:
- Brush Presets
- Brush Search / Organize
- Brush Settings
- Dynamics
- Stabilization
- Procedural Brush
- Texture / Paper / Particle
- Wet Media

Destination:
- ToolはCanvas
- 詳細はBrush PiP

### 6.2 塗り・色・Region

Tool/Mode:
- Smart Fill
  - Flood
  - Region
  - Enclose & Fill
  - Trace & Fill
  - Drag Fill
  - Continuous Fill
- Gradient
- Eyedropper
  - Canvas
  - Reference

Workspace / settings:
- Color Picker
- Palette / History / Harmony
- Fill tolerance / Gap / Reference source
- Region / Lineart-linked Coloring
- Smart Color Assist
- Recolor / Temperature / overall color adjustment

### 6.3 選択・変形

Tool/Mode:
- Selection family
- Move
- Transform
- Warp
- Liquify

Commands/properties:
- Add / Subtract / Intersect
- Invert
- Feather
- Expand / Contract
- Saved Selection
- Select from Layer
- Interpolation
- Flip

### 6.4 ベクター・文字・図形

Tool/Mode:
- Object / Vector Select
- Node Edit
- Pen / Path
- Shape
- Text
- Vector Eraser
- Variable Width

Properties/commands:
- Fill / Stroke
- Boolean
- Simplify / Smooth
- Rasterize
- Typography properties
- Text → Path
- Shape presets

### 6.5 定規・ガイド

Tool/Mode:
- Straight / Parallel
- Perspective
- Symmetry / Mirror
- Radial symmetry
- 2D Grid
- Isometric Grid
- Guide edit

Commands/settings:
- Snap
- Visibility
- Lock
- Preset / Save

### 6.6 レイヤー・合成

Workspace:
- Layers PiP

Commands/properties:
- Layer create types
- Group
- Mask / Vector Mask
- Clipping / Alpha Lock
- Blend mode
- Multi-select
- Reorder
- Search / Filter / Tag
- Lock / Solo / Collapse
- Duplicate / Merge / Flatten Copy
- Layer Comps
- Layer Styles / Effects

### 6.7 補正・フィルター・修復

Tool:
- Healing
- Patch
- Clone

Workspace/commands:
- Adjustment Layer
- Filter Layer
- Live Blur / Live Color
- Core Adjustment set
- Core Live Filter set
- Blend If equivalent
- Displacement
- destructive Apply

### 6.8 資料・アセット

Workspace:
- Reference
- Asset Library

Functions:
- multiple references
- pin / transform / flip / grayscale / temporary hide
- Reference groups
- Brush / Texture / Paper / Pattern / Gradient / Palette / Macro / Workspace / Shape assets
- folders / collections / tags / search / favorites / recent
- import / export

### 6.9 履歴・自動化

Workspace:
- History
- Snapshot
- Timelapse
- Work Time
- Macro / Auto Action

Commands:
- Undo / Redo
- Snapshot create / compare / branch
- Recording
- Macro preset
- Shortcut assignment
- Quick Controller registration

Undo/Redoのdefault primary exposureは右UIおよび六角形Controllerだが、左経路も保持する。

### 6.10 キャンバス・表示

Tool/commands/workspaces:
- Pan
- Zoom
- Rotate View
- Canvas Flip
- Seamless Tile
- Focus Mode
- Navigator
- Multi-view
- Soft Proof / Grayscale previewへのshortcut（Color Management側にもcross-link可）

### 6.11 ドキュメント・編集・出力

Top barがprimary routeだが、左からも到達可能。

- Document switch / metadata
- Crop / Canvas Resize / Image Resize
- Clipboard
- Save / Recovery status
- Import / Export
- .illustro
- PNG / JPEG / WebP / ORA / TIFF / SVG / OpenEXR / other supported formats
- Color Management / ICC / bit depth / profile conversion
- Offline / recovery settings

Home/Save等はTop barからも同一semantic Commandを呼ぶ。

### 6.12 ワークスペース・設定

- Workspace layout / preset / save / load
- magnetic PiP configuration
- Left UI customization
- Quick Controller customization
- Shortcut / Gesture
- Pen / stylus input
- left/right UI mirroring
- accessibility
- reduced motion
- UI scale / text
- feedback sound / haptic
- language / region
- extensions
- diagnostics where exposed

## 7. Pin system

Canonical specification:

- [Left UI — Pinned Rail Specification](LEFT_PINNED_RAIL_SPEC.md)

Key decisions:

- All Features is a non-removable fixed root entry at the bottom of the Rail.
- Overflow, when needed, sits immediately above All Features.
- The Rail itself does not scroll by default.
- Overflow preserves the logical Pin order; it does not reorder by frequency or context.
- Tool Family, individual Mode, Command, Toggle, Workspace/PiP opener, Category shortcut, supported dynamic preset and one-level Custom Stack may be pinned.
- Category shortcuts are explicitly pinnable.
- Custom Stack nesting is limited to one level.
- Rail reordering/add/remove/Stack editing uses explicit customization mode.
- Workspace/PiP Pins use open/focus semantics rather than implicit open/close toggling.

Pin-capable targets have stable semantic IDs, for example:

- `tool.brush`
- `tool.selection.region`
- `workspace.layers`
- `category.selection-transform`
- `command.canvas.flip.horizontal`
- `command.history.undo`
- `brush.preset.<id>`

## 8. Tool Family behavior

Pinned Tool Family:

- single tap: last-used modeでactivate
- active familyを再選択: family chooserを開く候補
- secondary click / pen hold: family chooser acceleratorとして利用可能
- ただしfamily chooserへ到達する唯一の経路にhover/right-click/long-pressを使わない
- L2/L3から常に明示的にModeへ到達可能

具体例:

```
[Selection]
 tap -> last used: Freehand
 chooser -> Rectangle / Ellipse / Freehand / Polygon / Similar / Region...
```

## 9. Search

All Features Palette上部にSearchを統合する。

検索対象:
- Tool
- Mode
- Command
- Workspace/PiP
- Setting
- Brush/Preset
- Macro
- Asset
- category

Searchは別Command Search UIを重複実装するのではなく、同じCommand indexを利用する。

Keyboard shortcut等からSearchを直接openしても、左UIのAll Featuresと同じ検索結果/semantic commandへ到達する。

## 10. Accessibility / input invariants

- icon-only Railにはaccessible nameを必須とする。
- pointer環境ではtooltipを提供する。
- tooltipは機能発見の唯一の手段にしない。
- selected stateは色だけに依存しない。
- Pen/Touch向けhit targetはplatform/input capabilityに適応する。
- keyboard focus pathを持つ。
- right click / hover / long pressはacceleratorであって唯一の経路にしない。
- disabled項目は理由表示が有用な場合、消去ではなく状態表示を優先する。
- destructive commandは通常Commandと視覚・確認挙動を区別する。
- modalを大量に使用せず、可能な限りright PiP / Canvas preview / inline contextを使う。

## 11. Performance invariants

All Featuresを開くだけで:

- 全Brush thumbnail生成
- 全Asset decode
- Document全走査
- Region再解析
- Layer全thumbnail再生成

を行わない。

Indexはmetadata中心に保ち、preview/thumbnailはlazy loadする。

## 12. Feature-catalog coverage rule

`FEATURE_CATALOG.md`の各項目を以下のいずれかに分類する。

1. Left → Canvas Tool/Mode
2. Left → Right Workspace/PiP
3. Left → Immediate Command
4. Internal / automatic — fake UI entryを作らない
5. Future — 現行UIには出さない

現在のcoverage appendixでは **326項目** を分類している。

このappendixは「各機能がどの経路で到達可能か」を監査するための設計資料であり、Default Railを意味しない。

## 13. Remaining unresolved decisions

Pinned Railの構造は `LEFT_PINNED_RAIL_SPEC.md` でBaseline化した。

まだ固定しない:

- Default Railに何を何個置くか
- Category Paletteのexact width / columns / animation
- dynamic Brush/Shape preset Pinを初期リリースから有効にするか
- final icon artwork / spacing / visual density

PC/tabletは同じ論理Pin orderを保持し、viewport/input capabilityに応じてvisible capacityとpalette projectionだけを変える。特別なdevice別auto-reorderは行わない。
