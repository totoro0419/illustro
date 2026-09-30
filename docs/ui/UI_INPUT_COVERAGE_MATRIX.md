# Illustro Input Method Coverage Matrix

> Date: 2026-09-30  
> Status: **SEMANTIC INPUT COVERAGE CLOSED / PRODUCTION RUNTIME VALIDATION PENDING**  
> Source: `docs/FEATURE_CATALOG.md` on `design/ui-gate-e-2026-09-29`  
> Production implementation: **LOCKED**

## Reading this matrix

Every catalog feature is assigned to exactly one interaction class:

- **INPUT** — a user-editable value/state/choice with a canonical input primitive;
- **DIRECT** — direct manipulation/gesture surface with explicit alternatives where required;
- **COMMAND** — one-shot action, represented as a command/button/menu item rather than a setting;
- **SENSOR** — physical input source routed through the shared mapping/binding system;
- **STATUS** — read-only information;
- **SYSTEM / POLICY / PRODUCT** — architecture or product behavior, not a standalone user input;
- **DEFERRED-FEATURE** — the feature itself is explicitly Future/Out-of-scope, so its detailed UI is not frozen now.

A row is not considered unresolved merely because engine-dependent numeric ranges are deferred. The **input method** is fixed; values that require prototype/benchmark evidence are tracked separately in `UI_INPUT_DEFERRED_VALUES.md`.

## Coverage summary

| Metric | Count |
|---|---:|
| Catalog feature rows | 326 |
| INPUT | 196 |
| DIRECT | 43 |
| COMMAND | 27 |
| SENSOR | 3 |
| STATUS | 5 |
| SYSTEM | 34 |
| POLICY | 13 |
| PRODUCT | 1 |
| DEFERRED-FEATURE | 4 |
| **UNMAPPED** | **0** |


## A. キャンバス・ドキュメント

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 19 | Raster Canvas | Core | DIRECT | D1 | Primary drawing/direct-manipulation surface. |
| 20 | Tile-based 大規模Canvas | Core / Investigate | SYSTEM | — | Rendering architecture; no standalone user input. |
| 21 | Pan / Zoom / Rotate | Core | INPUT | D1 + N1 + N7 + C7 | Gesture/direct navigation with exact Zoom/Rotation and reset commands. |
| 22 | 最大 64000% Zoom | Required | INPUT | N1 + numeric + C7 | Zoom exploration plus exact percent/Fit/100% commands. |
| 23 | Canvas Flip | Required | COMMAND | C7 | Horizontal/Vertical Flip commands. |
| 24 | Crop | Required | INPUT | D1 + N6 + N7 + C9 + Apply/Cancel | Canvas handles plus exact geometry and explicit commit/cancel. |
| 25 | Canvas Resize | Required | INPUT | N6 + C2 + C9 | Exact dimensions, units and anchor. |
| 26 | Image Resize | Required | INPUT | N6 + C2 | Exact dimensions/unit plus interpolation selector. |
| 27 | Seamless Tile Drawing | Required | INPUT | C6 + preview | Persistent preview mode/toggle with non-destructive display. |
| 28 | 複数Document | Required | INPUT | C10 + C7 | Document tab/list selection plus New/Open/Close commands. |
| 29 | Document Metadata | Required | INPUT | T1 + N3 + C2 | Metadata fields use ordinary text/numeric/choice controls. |

## B. 描画・ブラシエンジン

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 35 | Brush Tool | Core | DIRECT | C8/C3 + D1 | Tool/preset selection followed by direct canvas input; parameters reuse Brush controls. |
| 36 | Eraser | Core | DIRECT | C8/C3 + D1 | Tool/preset selection followed by direct canvas input; parameters reuse Brush controls. |
| 37 | Smudge / Blend Tool | Required | DIRECT | C8/C3 + D1 | Tool/preset selection followed by direct canvas input; parameters reuse Brush controls. |
| 38 | Brush Size / Opacity | Core | INPUT | N2 + N1 | Size uses nonlinear slider + exact value; Opacity uses slider + exact value. |
| 39 | Pressure | Core | SENSOR | E1 + N5 + source picker | Physical sensor is a Dynamics source; mapping uses shared curve/range UI. |
| 40 | Tilt | Required | SENSOR | E1 + N5 + source picker | Physical sensor is a Dynamics source; mapping uses shared curve/range UI. |
| 41 | Azimuth | Required | SENSOR | E1 + N5 + source picker | Physical sensor is a Dynamics source; mapping uses shared curve/range UI. |
| 42 | Stylus Eraser | Required | DIRECT | C8/C3 + D1 | Tool/preset selection followed by direct canvas input; parameters reuse Brush controls. |
| 43 | Barrel Button | Required | INPUT | T5 + C3 + C1 | Choose action and Trigger/Hold/Toggle behavior; Clear/Test available. |
| 44 | Stabilization / Smoothing | Core | INPUT | N1 + numeric + C2 | Strength scalar plus advanced algorithm selector. |
| 45 | Brush Dynamics 共通変調モデル | Core | INPUT | source picker + E1 + N5 | Shared source→target mapping editor. |
| 46 | Dynamics Curve / Range / Invert | Required | INPUT | E1 + N5 + C5 | Curve, input/output ranges and Invert. |
| 47 | Procedural Brush System | Core | INPUT | C3/C8 + D2 + parameter primitives | Module selection/order; module parameters use canonical primitives. |
| 48 | Texture-based Brush Input | Required | INPUT | F1/C8 + N6 + N7 + N8 | Texture asset plus scale/rotation/offset. |
| 49 | Brush Preset | Required | INPUT | C8 + T2 | Searchable visual preset selection. |
| 50 | Brush検索・整理 | Required | INPUT | T2 + C4 + D2 | Search/filter/tag and explicit reorder. |
| 51 | ユーザー作成Brush | Required | INPUT | T1 + canonical Brush primitives + C7 | Name/edit/save commands over standard brush parameters. |
| 52 | Dynamic Wet Media | Core / Investigate | INPUT | N1/N4 + numeric | Wetness/mix/pull/pigment parameters use bounded/signed scalar controls. |
| 53 | Wetness / Pigment等の内部状態 | Investigate | SYSTEM | — | Internal simulation state; user-facing exposed controls map to Wet Media scalars. |
| 54 | 紙質・粒子・質感 | Required / Investigate | INPUT | F1/C8 + N1/N6/N7/N8 | Asset choice plus strength/scale/rotation/offset. |

## C. 線画・Region Intelligence

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 60 | Lineart Region System | Core | SYSTEM | — | Region engine/derived topology; no standalone control. |
| 61 | 閉領域検出 | Core | SYSTEM | — | Region engine/derived topology; no standalone control. |
| 62 | Persistent Region ID | Core | SYSTEM | — | Region engine/derived topology; no standalone control. |
| 63 | Region隣接グラフ | Core | SYSTEM | — | Region engine/derived topology; no standalone control. |
| 64 | Boundary Tracking | Core | SYSTEM | — | Region engine/derived topology; no standalone control. |
| 65 | Line Connectivity Analysis | Core | SYSTEM | — | Region engine/derived topology; no standalone control. |
| 66 | Region Selection | Required | DIRECT | D1 + C10 | Canvas region selection with list/chooser alternative where needed. |
| 67 | Region Fill | Required | COMMAND | C7 + Smart Fill controls | Fill action uses current Region and Smart Fill settings. |
| 68 | Lineart-linked Coloring | Core | INPUT | C5 + C10 + C2 + Apply/Cancel | Explicit enable, source selection, follow policy and review. |
| 69 | 追従強度・条件設定 | Required | INPUT | N1 + numeric + C2/C4 | Follow strength plus condition/policy choices. |
| 70 | 変更結果の確認・Undo | Required | INPUT | Apply/Cancel + C7 | Before/after preview with explicit accept/cancel and Undo. |
| 71 | Semantic Region Label | Investigate | INPUT | T1/C3 | If enabled, text/category assignment; not required for initial release. |

## D. 塗り・彩色

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 77 | Flood Fill | Core | DIRECT | D1 + C7 | Canvas seed action using current Smart Fill settings. |
| 78 | Gap Closing | Required | INPUT | N1 + numeric | Continuous strength/size plus exact value and preview. |
| 79 | Gap Tolerance | Required | INPUT | N1 + numeric | Bounded tolerance scalar. |
| 80 | Boundary Expand / Contract | Required | INPUT | N4 + numeric | Signed expansion/contraction around neutral zero. |
| 81 | Multi-layer Reference Fill | Required | INPUT | C2/C10 | Reference source selection. |
| 82 | Lineart Reference Fill | Required | INPUT | C2/C10 | Reference source selection. |
| 83 | Color Difference Tolerance | Required | INPUT | N1 + numeric | Bounded tolerance scalar. |
| 84 | Enclose and Fill | Required | DIRECT | D1 + C2 | Smart Fill mode selected explicitly; canvas gesture executes. |
| 85 | Trace and Fill | Required | DIRECT | D1 + C2 | Smart Fill mode selected explicitly; canvas gesture executes. |
| 86 | Drag Fill | Required | DIRECT | D1 + C2 | Smart Fill mode selected explicitly; canvas gesture executes. |
| 87 | Continuous Region Fill | Required | DIRECT | D1 + C2 | Smart Fill mode selected explicitly; canvas gesture executes. |
| 88 | Smart Fill 統合UI | Core | INPUT | C2 + N1/N4 + C2 reference | One mode picker with canonical fill parameters. |
| 89 | Smart Color Assist | Core | INPUT | C8 + Apply/Cancel | Candidate cards/swatches with explicit preview/apply. |
| 90 | Base Color候補 | Required / Investigate | INPUT | C8 + C2 + preview | Visual candidate selection; optional method/type choice; no silent apply. |
| 91 | Palette候補 | Required / Investigate | INPUT | C8 + C2 + preview | Visual candidate selection; optional method/type choice; no silent apply. |
| 92 | 隣接色調和支援 | Required / Investigate | INPUT | C8 + C2 + preview | Visual candidate selection; optional method/type choice; no silent apply. |
| 93 | Region Recolor | Required | INPUT | Color input + C10 region target + Apply/Cancel | Choose target region and color, preview before commit. |
| 94 | Shadow / Highlight候補 | Investigate | INPUT | C8 + C2 + preview | Visual candidate selection; optional method/type choice; no silent apply. |
| 95 | Color Temperature調整 | Required | INPUT | N4 + numeric | Signed temperature/tint-style scalar. |
| 96 | 全体色調整 | Required | INPUT | Adjustment primitives | Uses standardized adjustment/filter controls. |

## E. カラーシステム

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 102 | Color Picker | Core | INPUT | N8 Hue/SV + Values tabs | Spatial picker plus exact synchronized values. |
| 103 | Canvas Eyedropper | Core | DIRECT | D1/C7 | Direct sampling tool/temporary mode plus explicit button route. |
| 104 | Reference Eyedropper | Core | DIRECT | D1/C7 | Direct sampling tool/temporary mode plus explicit button route. |
| 105 | Color History | Required | INPUT | C8 | Recent swatch recall. |
| 106 | Palette | Required | INPUT | C8 + D2 + T1 | Swatch selection; edit mode for name/reorder. |
| 107 | Palette Import / Export | Required | INPUT | F1 + C7 | File/asset import/export commands. |
| 108 | HSV/HSL/RGB等のカラーコントロール | Required | INPUT | N1 channel sliders + numeric + model C1/C2 | Synchronized channel/value representations. |
| 109 | Color Harmony支援 | Required / Investigate | INPUT | C2 + C8 + N7 | Harmony type plus visual candidates; angle when relevant. |
| 110 | Grayscale Preview | Required | INPUT | C6 | Immediate view toggle. |
| 111 | Color Management / ICC | Core / Investigate | INPUT | C3 + C2 + C5 | Profile picker, rendering intent, BPC/related state. |
| 112 | Wide Gamut | Core / Investigate | SYSTEM | — | Color pipeline capability; controls appear only through profile/model/proof settings. |
| 113 | 8-bit integer | Required | INPUT | C1 | Bit-depth choice in document/color settings. |
| 114 | 16-bit integer | Required | INPUT | C1 | Bit-depth choice in document/color settings. |
| 115 | 16-bit float | Required / Investigate | INPUT | C1 | Bit-depth choice in document/color settings. |
| 116 | 32-bit float | Investigate | INPUT | C1 | Bit-depth choice in document/color settings. |
| 117 | Embedded ICC Profile | Required | SYSTEM | — | Color pipeline capability; controls appear only through profile/model/proof settings. |
| 118 | Profile Conversion / Display Transform | Required | INPUT | C3 + C2 + Apply/Cancel | Source/destination profile, intent and explicit conversion. |
| 119 | Linear-light Processing Path | Core / Investigate | SYSTEM | — | Color pipeline capability; controls appear only through profile/model/proof settings. |
| 120 | HDR-capable Architecture | Core / Investigate | SYSTEM | — | Color pipeline capability; controls appear only through profile/model/proof settings. |
| 121 | CMYK Native Editing | Investigate | INPUT | C2 + N1/numeric channels | If implemented, model selector and exact channel controls. |
| 122 | Soft Proof | Required | INPUT | C5 + C3 | Enable plus output profile. |
| 123 | Out-of-Gamut Warning | Required | INPUT | C6 | Immediate visualization toggle. |
| 124 | Rendering Intent / Black Point Compensation | Required / Investigate | INPUT | C2 + C5 | Fixed intent list plus BPC switch. |

## F. レイヤー

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 130 | Raster Layer | Core | COMMAND | C7 + C10 | Create command and selectable layer list. |
| 131 | Vector Layer | Required | COMMAND | C7 + C10 | Create command and selectable layer list. |
| 132 | Vector Path / Anchor / Bezier Handle | Required | DIRECT | D1 + N8/N7 | Canvas nodes/handles plus exact point/angle fields. |
| 133 | Vector Stroke Width / Fill / Stroke | Required | INPUT | N1/N2 + Color input | Stroke width and color/fill controls. |
| 134 | Vector Node Add/Delete/Convert | Required | COMMAND | C7 | Explicit node commands; direct canvas targeting. |
| 135 | Vector Simplify / Smooth | Required | INPUT | N1 + numeric + Apply/Cancel | Strength/tolerance preview with explicit apply. |
| 136 | Vector Boolean Operation | Required | COMMAND | C7 | Union/subtract/intersect/etc. are explicit commands. |
| 137 | Vector Eraser / Line Erase | Required | DIRECT | D1 + Brush controls | Canvas erasing using brush-like size/strength. |
| 138 | Rasterize Vector | Required | COMMAND | C7 | Explicit destructive conversion command. |
| 139 | Variable-width Vector Stroke | Required / Investigate | INPUT | D1 + E1/N1 | Direct width handles and/or dynamics/width profile. |
| 140 | Brush-like Rendering on Vector Path | Investigate | INPUT | C8 Brush preset + Brush primitives | Preset selection and canonical brush parameters. |
| 141 | Group | Core | COMMAND | C7 + C10 | Group/Ungroup commands over layer selection. |
| 142 | Mask | Required | INPUT | C7 + C6 + C10 | Add/select/enable/invert/link/apply mask via explicit commands/toggles. |
| 143 | Clipping | Core | INPUT | C6 | Immediate layer-state toggle. |
| 144 | Alpha Lock / Lock Transparency | Core | INPUT | C6 | Immediate layer-state toggle. |
| 145 | Alpha Inheritance / Clipping-equivalent | Required | INPUT | C6 | Immediate layer-state toggle. |
| 146 | Persistent Clipping Control | Core | INPUT | C6 | Immediate layer-state toggle. |
| 147 | Adjustment Layer | Required | INPUT | C3 + adjustment/filter primitives | Choose type then edit canonical parameters. |
| 148 | Filter Layer | Required | INPUT | C3 + adjustment/filter primitives | Choose type then edit canonical parameters. |
| 149 | Layer Style / Layer Effect | Required | INPUT | C5 per effect + canonical parameter primitives | Enable effect and edit its standardized parameters. |
| 150 | Text Layer / Entity | Required | INPUT | T1 text editor + Text standard | Editable text content and typography controls. |
| 151 | Horizontal / Vertical Text | Required | INPUT | C1 | Small exclusive writing-direction choice. |
| 152 | Font Family / Style / Size | Required | INPUT | C3 + C2 + N3 | Searchable font, style list, precise size. |
| 153 | Tracking / Line Height / Baseline | Required | INPUT | N3 + optional N10 | Exact numeric fields; label scrub accelerator on pointer devices. |
| 154 | Font Import | Required | INPUT | F1 | Explicit font import/file provider. |
| 155 | Missing Font Handling | Required | INPUT | C3 + C7 | Replacement font picker plus explicit preserve/replace actions. |
| 156 | Text → Vector/Path | Required | COMMAND | C7 | Explicit conversion command. |
| 157 | Text on Path / Area Text | Investigate | DIRECT | D1 + T1 + Text standard | Direct path/area manipulation plus ordinary text/typography. |
| 158 | Multi-select | Required | INPUT | C10 | Standard multi-select list/tree semantics. |
| 159 | Drag Reorder | Core | INPUT | D2 | Drag plus Move Earlier/Later/Start/End/Move To. |
| 160 | Search | Required | INPUT | T2 | Layer search field. |
| 161 | Filter | Required | INPUT | C4/C2 | Filter chips/options without mutating tree. |
| 162 | Color Tag | Required | INPUT | C8 | Visual tag swatch choice with non-color state marker. |
| 163 | Lock種別 | Required | INPUT | C4/C6 | Independent lock states as toggles/check options. |
| 164 | Solo / Isolate | Required | INPUT | C6 | Immediate view/isolation toggle. |
| 165 | Collapse | Required | INPUT | disclosure button | Explicit expand/collapse control. |
| 166 | Duplicate | Required | COMMAND | C7 | One-shot layer commands. |
| 167 | Merge | Required | COMMAND | C7 | One-shot layer commands. |
| 168 | Merge Visible | Required | COMMAND | C7 | One-shot layer commands. |
| 169 | Flatten Copy | Required | COMMAND | C7 | One-shot layer commands. |
| 170 | Layer Comps | Core | INPUT | C10 + T1 + C7 | Named comp list plus create/apply/update commands. |
| 171 | Canvasから直接Layer選択 | Required | DIRECT | D1 + C10 | Canvas hit-test with chooser/cycle alternative. |
| 172 | 大量レイヤーUI性能 | Core | SYSTEM | — | Performance requirement; no new input primitive. |

## G. 選択・変形

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 178 | Rectangle / Ellipse Selection | Required | DIRECT | D1 + C2/C7 | Selection tool/mode with direct canvas targeting. |
| 179 | Freehand Selection | Required | DIRECT | D1 + C2/C7 | Selection tool/mode with direct canvas targeting. |
| 180 | Polygonal Selection | Required | DIRECT | D1 + C2/C7 | Selection tool/mode with direct canvas targeting. |
| 181 | Color / Similarity Selection | Required | INPUT | N1/N5 + numeric + preview | Threshold/range controls with exact values. |
| 182 | Region Selection | Required | DIRECT | D1 + C2/C7 | Selection tool/mode with direct canvas targeting. |
| 183 | Add / Subtract / Intersect | Required | INPUT | C1 | Visible selection-mode radio/segmented group. |
| 184 | Invert Selection | Required | COMMAND | C7 | One-shot command. |
| 185 | Feather | Required | INPUT | N1 + numeric | Bounded scalar. |
| 186 | Expand / Contract | Required | INPUT | N4 + numeric | Signed scalar. |
| 187 | Saved Selection / Selection Mask | Required | INPUT | C10/C8 + T1 + C7 | Named selection list, save/load commands. |
| 188 | Select from Layer Content | Required | DIRECT | D1 + C2/C7 | Selection tool/mode with direct canvas targeting. |
| 189 | Luminance / Color-range Selection | Required | INPUT | N1/N5 + numeric + preview | Threshold/range controls with exact values. |
| 190 | Move / Scale / Rotate | Core | DIRECT | D1 + N6 + N7 | Handles plus exact transform fields. |
| 191 | Flip | Required | COMMAND | C7 | Horizontal/Vertical transform command. |
| 192 | Free Transform | Required | DIRECT | D1 + exact/context parameters + Apply/Cancel | Direct manipulation with parameter fields and explicit preview transaction. |
| 193 | Perspective / Distort | Required | DIRECT | D1 + exact/context parameters + Apply/Cancel | Direct manipulation with parameter fields and explicit preview transaction. |
| 194 | Warp | Required | DIRECT | D1 + exact/context parameters + Apply/Cancel | Direct manipulation with parameter fields and explicit preview transaction. |
| 195 | Liquify | Required | DIRECT | D1 + exact/context parameters + Apply/Cancel | Direct manipulation with parameter fields and explicit preview transaction. |
| 196 | Transform Interpolation | Required | INPUT | C2 | Fixed interpolation selector. |

## H. 非破壊編集・合成

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 202 | Adjustment Layer | Required | INPUT | C3 + adjustment/filter primitives | Choose type; edit standardized parameters. |
| 203 | Filter Layer | Required | INPUT | C3 + adjustment/filter primitives | Choose type; edit standardized parameters. |
| 204 | Live Blur | Required | INPUT | N1/N2 + numeric | Radius/amount with live preview. |
| 205 | Live Color Adjustment | Required | INPUT | Adjustment primitives | Uses standardized signed/scalar/color controls. |
| 206 | Mask | Required | INPUT | C7/C6 + mask editing surface | Create/enable/select/apply using layer mask standard. |
| 207 | Vector Mask | Required / Investigate | INPUT | C7/C6 + mask editing surface | Create/enable/select/apply using layer mask standard. |
| 208 | Clipping Mask | Required | INPUT | C7/C6 + mask editing surface | Create/enable/select/apply using layer mask standard. |
| 209 | Blend Mode | Core | INPUT | C3 | Searchable categorized blend-mode picker. |
| 210 | Painting Blend Modes | Required | INPUT | C3 | Searchable categorized blend-mode picker. |
| 211 | Blend Mode Live Preview | Required | INPUT | C3 + live preview contract | Picker navigation can preview; selection commits the value. |
| 212 | Blend If 相当 | Core | INPUT | E3/N5 + exact endpoints | Visual tonal range handles with exact values. |
| 213 | Displacement | Required / Investigate | INPUT | F1/C8 + N1/N6 + C2 + Apply/Cancel | Map/source choice plus strength/scale/mode. |
| 214 | Healing | Required | DIRECT | D1 + Brush controls + source command | Direct source/target editing with brush parameters. |
| 215 | Patch | Required | DIRECT | D1 + Brush controls + source command | Direct source/target editing with brush parameters. |
| 216 | Clone | Required | DIRECT | D1 + Brush controls + source command | Direct source/target editing with brush parameters. |
| 217 | Core Adjustment Set | Required | INPUT | Adjustment standard | Each adjustment is mapped to canonical N/E/Color primitives. |
| 218 | Core Live Filter Set | Required | INPUT | C3 + canonical parameter primitives | Filter picker plus parameter controls; preview live. |
| 219 | Filter Masking / Reorder / Opacity / Blend | Required | INPUT | D2 + N1 + C3 + mask controls | Reorder, opacity, blend mode and mask. |
| 220 | Destructive Apply Command | Required | COMMAND | C7 + Apply/Cancel | Explicit destructive commit after preview. |
| 221 | Layer Style: Stroke | Required | INPUT | C5 + canonical parameter primitives | Effect enable plus scalar/color/gradient/angle inputs. |
| 222 | Layer Style: Drop/Inner Shadow | Required | INPUT | C5 + canonical parameter primitives | Effect enable plus scalar/color/gradient/angle inputs. |
| 223 | Layer Style: Outer/Inner Glow | Required | INPUT | C5 + canonical parameter primitives | Effect enable plus scalar/color/gradient/angle inputs. |
| 224 | Layer Style: Color/Gradient/Pattern Overlay | Required | INPUT | C5 + canonical parameter primitives | Effect enable plus scalar/color/gradient/angle inputs. |
| 225 | Layer Style: Bevel/Emboss | Required | INPUT | C5 + canonical parameter primitives | Effect enable plus scalar/color/gradient/angle inputs. |

## I. Reference System

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 231 | Reference Workspace | Core | INPUT | F1 + C10 + D1 | Add/select/manipulate references. |
| 232 | 複数Reference | Required | INPUT | C10 + D1 | Reference multi-selection and direct manipulation. |
| 233 | 自由配置 | Required | DIRECT | D1 + exact Inspector fields | Move/scale/rotate directly, precision via Inspector. |
| 234 | Pin | Required | INPUT | C6 | Immediate persistent/session view-state toggle. |
| 235 | Scale / Rotate | Required | DIRECT | D1 + N1/N7 | Direct transform plus exact scale/angle. |
| 236 | Horizontal Flip | Required | COMMAND | C7 | Explicit flip command. |
| 237 | Grayscale | Required | INPUT | C6 | Immediate persistent/session view-state toggle. |
| 238 | Always on Top | Required | INPUT | C6 | Immediate persistent/session view-state toggle. |
| 239 | Temporary Hide | Required | INPUT | C6 | Immediate persistent/session view-state toggle. |
| 240 | Reference Group | Required | COMMAND | C7 + C10 | Group/Ungroup over selection. |
| 241 | Reference Persistence | Required | SYSTEM | — | Persistence semantics, not an input primitive. |
| 242 | Reference Eyedropper | Core | DIRECT | D1/C7 | Direct sample with explicit eyedropper route. |

## J. 履歴・Snapshot・分岐

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 248 | Undo | Core | COMMAND | C7 | Direct command/shortcut/button. |
| 249 | Redo | Core | COMMAND | C7 | Direct command/shortcut/button. |
| 250 | Command単位履歴 | Core | INPUT | C10 | History list/timeline selection with explicit navigation semantics. |
| 251 | Snapshot System | Core | INPUT | C10 + T1 + C7 | Named snapshot list plus Create/Restore/Delete. |
| 252 | Snapshot比較 | Required | INPUT | C1 + C2 + C7 | Current/Snapshot choice and comparison-mode selector. |
| 253 | Snapshot分岐 | Required / Investigate | COMMAND | C7 + C10 | Explicit Create Branch action from selected revision/snapshot. |
| 254 | History Panel | Required | INPUT | C10 + preview/restore contract | Selectable timeline/list; preview is non-destructive, Restore explicit. |

## K. Timelapse・作業時間

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 260 | 制作履歴ベースTimelapse | Core | INPUT | C7 transport + N1 seek | Playback commands and timeline scrubber. |
| 261 | UIを含めない出力 | Required | SYSTEM | — | Fixed export semantic, not a user toggle by default. |
| 262 | High-resolution Export | Required | INPUT | F1 + N6 + C2 | Destination, dimensions/resolution and format/codec. |
| 263 | Frame Pace調整 | Required | INPUT | N3 + C2 presets | Exact FPS/pace plus useful presets. |
| 264 | Work Time | Core | STATUS | — | Read-only statistics, no standalone input. |
| 265 | Session | Required | STATUS | — | Read-only statistics, no standalone input. |
| 266 | Today | Required | STATUS | — | Read-only statistics, no standalone input. |
| 267 | Total | Required | STATUS | — | Read-only statistics, no standalone input. |
| 268 | Average | Required | STATUS | — | Read-only statistics, no standalone input. |
| 269 | Inactivity除外 | Required | INPUT | C5 + N3 | Enable exclusion plus exact inactivity threshold. |

## L. Automation

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 275 | Auto Actions / Macros | Core | INPUT | C10/C8 + C7 | Macro list/preset selection plus run/edit commands. |
| 276 | Action Recording | Required | COMMAND | C7 | Record/Stop commands with visible recording state. |
| 277 | Parameterized Action | Required / Investigate | INPUT | canonical primitives | Macro parameters reuse target-command primitives. |
| 278 | Macro Preset | Required | INPUT | C8 + T2 | Searchable preset list/grid. |
| 279 | Shortcut Assignment | Required | INPUT | T3 | Press-to-bind shortcut capture. |
| 280 | Quick Menu登録 | Required | INPUT | C3 + D2 | Search/select target and place in slot/order. |

## M. UI・Workspace・操作体系

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 286 | Canvas First | Core | POLICY | — | Cross-cutting interaction principle; no standalone setting. |
| 287 | Direct Manipulation | Core | POLICY | — | Cross-cutting interaction principle; no standalone setting. |
| 288 | Context UI | Core | POLICY | — | Cross-cutting interaction principle; no standalone setting. |
| 289 | Quick Menu | Core | INPUT | C8/C10 + C3 + D2 | Stable slots, searchable add, explicit edit/reorder. |
| 290 | Command / Tool Search | Required | INPUT | T2 + C10 | Search field and result list. |
| 291 | Dock Panel | Required | DIRECT | D1 + C7 | Drag/dock with explicit dock/float commands. |
| 292 | Undock / Floating | Required | DIRECT | D1 + C7 | Drag/dock with explicit dock/float commands. |
| 293 | Panel Resize / Reorder / Hide | Required | INPUT | D1 + D2 + C6 + Resize… | Splitter/reorder/hide with non-drag alternatives. |
| 294 | Workspace Save / Load | Required | INPUT | T1 + C8/C10 + C7 | Name/list/save/load/delete workspace presets. |
| 295 | Canvas Focus Mode | Core | INPUT | C6 | Explicit mode toggle. |
| 296 | Workspace Preset | Required | INPUT | C8 + T2 | Preset card/list selection. |
| 297 | 左右UI反転 | Required | INPUT | C5 | Persistent workspace setting. |
| 298 | Keyboard Shortcut | Core | INPUT | T3 | Press-to-bind capture plus conflict resolver. |
| 299 | Gesture | Core | DIRECT | gesture + explicit command alternative | Gesture is accelerator; no core command is gesture-only. |
| 300 | Hover | Required | DIRECT | supplemental accelerator | Never the only route to important functionality. |
| 301 | 右クリック / Context Click | Required | DIRECT | supplemental accelerator | Never the only route to important functionality. |
| 302 | Custom Toolbar | Required | INPUT | C3 + D2 + C7 | Search/add/remove/reorder toolbar items. |
| 303 | Custom Shortcut | Required | INPUT | T3 | Press-to-bind capture plus conflict resolver. |
| 304 | Keyboard Shortcut Capture | Required | INPUT | T3 | Press-to-bind capture plus conflict resolver. |
| 305 | Custom Gesture | Required | INPUT | T4 + C3 + conflict resolver | Explicit gesture-capture/test mode, action picker, clear/reset. |
| 306 | Scalable UI / Text | Required | INPUT | N1 + numeric + C1 presets | UI/text scale with exact percentage and optional presets. |
| 307 | Single-pointer Alternative | Required | POLICY | — | Accessibility/interaction requirement applied to controls. |
| 308 | Color-independent State Indication | Required | POLICY | — | Accessibility/interaction requirement applied to controls. |
| 309 | Color Description Assistance | Required | INPUT | C5 + C2 | Enable assistance plus description mode/detail if exposed. |
| 310 | Reduced Motion | Required | INPUT | C5 | Persistent accessibility setting. |
| 311 | Touch Target Policy | Required | POLICY | — | Accessibility/interaction requirement applied to controls. |
| 312 | Feedback Sound / Haptic | Required / Investigate | INPUT | C5 + N1 | Enable per channel; intensity/volume scalar where supported. |
| 313 | Keyboard Navigation for Commands | Required | POLICY | — | Accessibility/interaction requirement applied to controls. |

## N. デバイス別適応

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 319 | Desktop専用最適化UI | Core | POLICY | — | Adaptive presentation requirement; semantic inputs remain unchanged across device classes. |
| 320 | Tablet専用最適化UI | Core | POLICY | — | Adaptive presentation requirement; semantic inputs remain unchanged across device classes. |
| 321 | Smartphone専用最適化UI | Core | POLICY | — | Adaptive presentation requirement; semantic inputs remain unchanged across device classes. |

## O. 定規・ガイド・形状・グラデーション

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 330 | Straight / Parallel Ruler | Required | DIRECT | D1 + N7/N8 | Direct ruler placement plus exact position/angle. |
| 331 | 2D Grid | Required | INPUT | D1 + N1/N3 + N7 | Direct origin plus spacing/subdivision/angle fields. |
| 332 | Isometric Grid | Required | INPUT | D1 + N1/N3 + N7 | Direct origin plus spacing/subdivision/angle fields. |
| 333 | Perspective Guide | Required | INPUT | C1 + D1 + N7 | 1/2/3-point mode plus vanishing-point/axis manipulation. |
| 334 | Symmetry / Mirror | Required | INPUT | C5 + D1 + N7 | Enable plus axis/center and angle. |
| 335 | Radial Symmetry | Required | INPUT | C5 + D1 + N9 + N7 | Enable, center, segment count and rotation. |
| 336 | Guide Snapping | Required | INPUT | C5 | Persistent snapping setting with temporary modifier accelerator. |
| 337 | Guide Visibility / Lock | Required | INPUT | C6 | Immediate guide states. |
| 338 | Guide Preset / Save | Required | INPUT | C8/C10 + T1 + C7 | Named preset list plus save/load/delete. |
| 339 | Line / Rectangle / Ellipse / Polygon | Required | DIRECT | D1 + C2/C8 + N6/N9 | Shape tool selection/direct geometry; polygon count when applicable. |
| 340 | Post-stroke Shape Correction | Required / Investigate | INPUT | C5 + N1 + C7 | Enable/strength plus explicit accept/revert when surfaced. |
| 341 | Vector-backed Shape | Required / Investigate | DIRECT | D1 + Vector standard | Uses vector/shape controls. |
| 342 | Linear Gradient | Required | INPUT | E2 + D1 + C2 | Gradient type plus canvas handles and gradient editor. |
| 343 | Radial Gradient | Required | INPUT | E2 + D1 + C2 | Gradient type plus canvas handles and gradient editor. |
| 344 | Reflected / Bilinear Gradient | Required | INPUT | E2 + D1 + C2 | Gradient type plus canvas handles and gradient editor. |
| 345 | Shape-aware Gradient | Required / Investigate | INPUT | E2 + D1 + C2 | Gradient type plus canvas handles and gradient editor. |
| 346 | Editable Gradient Stops | Required | INPUT | E2 | Stops, midpoint, exact positions/colors, add/delete/reverse. |
| 347 | Non-destructive Gradient | Required | INPUT | E2 + persistence | Same editor; parameters remain editable. |
| 348 | Gradient Map | Required | INPUT | E2 + adjustment controls | Gradient editor inside adjustment. |
| 349 | Gradient Dithering | Required / Investigate | INPUT | C5 | Enable/disable where user-facing. |

## O.1 Clipboard / Cross-document Editing

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 357 | Internal Clipboard | Core | SYSTEM | — | Data transport semantics; no standalone input. |
| 358 | Copy / Cut / Paste | Core | COMMAND | C7 | Explicit editing commands. |
| 359 | Copy Merged | Required | COMMAND | C7 | Explicit editing commands. |
| 360 | Paste in Place | Required | COMMAND | C7 | Explicit editing commands. |
| 361 | Native cross-document payload | Required | SYSTEM | — | Data transport semantics; no standalone input. |
| 362 | System Clipboard Bridge | Required / Investigate | COMMAND | C7 + permission/status | Explicit bridge command where supported. |
| 363 | Desktop Drag & Drop | Required | DIRECT | F1 accelerator + C7 destinations | Drag/drop plus explicit Open/Place/Reference alternatives. |

## O.2 Localization

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 369 | Localizable UI resources | Core | SYSTEM | — | Localization/IME capability. |
| 370 | Japanese/CJK layout support | Core | SYSTEM | — | Localization/IME capability. |
| 371 | Locale-aware units/date/number | Required | INPUT | system locale + C2 override | Canonical values stay separate from display formatting. |
| 372 | Shipping locale set | Investigate | PRODUCT | — | Release/product decision, not a runtime input method. |

## P. ファイル・保存・Recovery・Offline

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 378 | .illustro | Core | INPUT | F1 + C7 | Open/Save/Save As via file provider/system destination. |
| 379 | PNG Export | Required | INPUT | C2 format + format-specific primitives + F1 | Format choice, settings and destination. |
| 380 | JPEG Export | Required | INPUT | C2 format + format-specific primitives + F1 | Format choice, settings and destination. |
| 381 | WebP Export | Required | INPUT | C2 format + format-specific primitives + F1 | Format choice, settings and destination. |
| 382 | PSD Import / Export | Investigate / High Priority | INPUT | C2 format + format-specific primitives + F1 | Format choice, settings and destination. |
| 383 | OpenRaster (.ora) | Required | INPUT | C2 format + format-specific primitives + F1 | Format choice, settings and destination. |
| 384 | TIFF | Required | INPUT | C2 format + format-specific primitives + F1 | Format choice, settings and destination. |
| 385 | SVG Import / Export | Required / Investigate | INPUT | C2 format + format-specific primitives + F1 | Format choice, settings and destination. |
| 386 | OpenEXR | Required / Investigate | INPUT | C2 format + format-specific primitives + F1 | Format choice, settings and destination. |
| 387 | AVIF / HEIF | Investigate | INPUT | C2 format + format-specific primitives + F1 | Format choice, settings and destination. |
| 388 | Auto Save | Core | INPUT | C5 if exposed | Default ON; disabling is advanced and risk-labelled. |
| 389 | Crash Recovery | Core | INPUT | C10 + C7 | Recovery candidate list with Restore/Compare/Discard/Export actions. |
| 390 | Recovery Snapshot | Core | SYSTEM | — | Automatic generation; surfaced via recovery chooser/status. |
| 391 | Incremental Save | Core | SYSTEM | — | Save architecture; user interacts through Save/Save As/status/cancel. |
| 392 | 描画を止めない保存 | Core | SYSTEM | — | Save architecture; user interacts through Save/Save As/status/cancel. |
| 393 | Offline First | Core | POLICY | — | Product/runtime behavior, no direct input. |
| 394 | 通常編集でログイン不要 | Core | POLICY | — | Product/runtime behavior, no direct input. |
| 395 | PWA Install | Investigate | COMMAND | C7/system install prompt | Explicit install action where runtime supports it. |

## Q. Performance・Rendering

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 401 | 体感0ラグ | Core | SYSTEM | — | Performance/rendering requirement; no standalone user input. |
| 402 | Low Input Latency | Core | SYSTEM | — | Performance/rendering requirement; no standalone user input. |
| 403 | Stable Frame Time | Core | SYSTEM | — | Performance/rendering requirement; no standalone user input. |
| 404 | Worst Frame計測 | Core | SYSTEM | — | Performance/rendering requirement; no standalone user input. |
| 405 | Memory Scaling | Core | SYSTEM | — | Performance/rendering requirement; no standalone user input. |
| 406 | Canvas Size Scaling | Core | SYSTEM | — | Performance/rendering requirement; no standalone user input. |
| 407 | GPU Brush Compositing | Investigate / likely required | SYSTEM | — | Performance/rendering requirement; no standalone user input. |
| 408 | GPU Filter | Investigate / likely required | SYSTEM | — | Performance/rendering requirement; no standalone user input. |
| 409 | GPU Transform | Investigate / likely required | SYSTEM | — | Performance/rendering requirement; no standalone user input. |
| 410 | WebGPU | Investigate | SYSTEM | — | Performance/rendering requirement; no standalone user input. |
| 411 | GPU Fallback | Required | SYSTEM | — | Performance/rendering requirement; no standalone user input. |

## R. AI補助

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 417 | 生成AIを中心価値にする | Out of scope | DEFERRED-FEATURE | — | Feature itself is outside the current implementation scope; its input surface is not frozen. |
| 418 | 色提案 | Investigate | INPUT | C8/C10 + preview + Apply/Cancel | Candidate/result selection with explicit user-controlled apply. |
| 419 | Region補助 | Investigate | INPUT | C8/C10 + preview + Apply/Cancel | Candidate/result selection with explicit user-controlled apply. |
| 420 | Selection補助 | Investigate | INPUT | C8/C10 + preview + Apply/Cancel | Candidate/result selection with explicit user-controlled apply. |
| 421 | 整理補助 | Investigate | INPUT | C8/C10 + preview + Apply/Cancel | Candidate/result selection with explicit user-controlled apply. |
| 422 | 修正補助 | Investigate | INPUT | C8/C10 + preview + Apply/Cancel | Candidate/result selection with explicit user-controlled apply. |
| 423 | AIなしでも成立する基本機能 | Core | POLICY | — | Product requirement, no standalone input. |

## S. 将来の共同編集

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 429 | 絵チャ / Collaborative Drawing | Future | DEFERRED-FEATURE | — | Feature itself is outside the current implementation scope; its input surface is not frozen. |
| 430 | Realtime Multi-user Editing | Future / Investigate | DEFERRED-FEATURE | — | Feature itself is outside the current implementation scope; its input surface is not frozen. |

## T. Asset Library・Navigator・拡張性

| Line | Feature | Catalog state | Class | Input mapping | Decision |
|---:|---|---|---|---|---|
| 436 | 2D Asset Library | Required | INPUT | T2 + C8/C10 + D2 | Search/browse/select/organize assets. |
| 437 | Brush Asset | Required | INPUT | C8/C10 + T2 | Searchable visual/list asset selection; edit uses type-specific controls. |
| 438 | Brush Tip / Texture Asset | Required | INPUT | C8/C10 + T2 | Searchable visual/list asset selection; edit uses type-specific controls. |
| 439 | Paper Texture | Required | INPUT | C8/C10 + T2 | Searchable visual/list asset selection; edit uses type-specific controls. |
| 440 | Pattern | Required | INPUT | C8/C10 + T2 | Searchable visual/list asset selection; edit uses type-specific controls. |
| 441 | Gradient Preset | Required | INPUT | C8/C10 + T2 | Searchable visual/list asset selection; edit uses type-specific controls. |
| 442 | Color Palette Asset | Required | INPUT | C8/C10 + T2 | Searchable visual/list asset selection; edit uses type-specific controls. |
| 443 | Macro Asset | Required | INPUT | C8/C10 + T2 | Searchable visual/list asset selection; edit uses type-specific controls. |
| 444 | Workspace Asset | Required | INPUT | C8/C10 + T2 | Searchable visual/list asset selection; edit uses type-specific controls. |
| 445 | Reference Set | Required | INPUT | C8/C10 + T2 | Searchable visual/list asset selection; edit uses type-specific controls. |
| 446 | Shape Preset | Required | INPUT | C8/C10 + T2 | Searchable visual/list asset selection; edit uses type-specific controls. |
| 447 | Folder / Collection / Tag | Required | INPUT | T1 + C10 + D2 | Name/select/reorder/organize collections and tags. |
| 448 | Search / Favorite / Recent | Required | INPUT | T2 + C6/C4 + C10 | Search plus favorite/filter/list views. |
| 449 | Asset Import / Export | Required | INPUT | F1 + C7 | File/asset import/export. |
| 450 | Navigator | Required | INPUT | D1 + N1 + N7 + C7 | Viewport direct navigation, zoom/rotation and reset commands. |
| 451 | Dock / Float Navigator | Required | DIRECT | D1 + C7 | Dock/float manipulation plus commands. |
| 452 | Multi-view of same Document | Investigate | INPUT | C10 + C6/C2 | View list plus mirror/value/view-mode controls. |
| 453 | Plugin / Extension API | Future / Investigate | DEFERRED-FEATURE | — | Feature itself is outside the current implementation scope; its input surface is not frozen. |
| 454 | Internal Module Boundaries | Core | SYSTEM | — | Architecture/future API; no current input surface. |
