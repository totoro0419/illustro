> Classification: EXPERIMENTAL / supporting historical UI detail. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Illustro Right UI Feature Coverage

> Status: **AUDITED / CANONICAL RIGHT-DESTINATION COVERAGE**
> Date: 2026-09-29
> Canonical: [Right UI — Canonical Specification](RIGHT_UI_SPEC.md)
> Source: `LEFT_UI_ACCESS_COVERAGE.md`

## Result

- Existing Left coverage rows routed to Right/Settings: **78**
- Unowned rows: **0**
- Right semantic Boxes: 12
- Global application settings are intentionally owned by a dedicated Settings surface rather than a normal Right Box.

## Ownership counts

| Owner | Items |
|---|---:|
| right.brush | 10 |
| right.inspector | 16 |
| right.color | 5 |
| right.document | 12 |
| right.layers | 2 |
| right.effects | 1 |
| right.reference | 4 |
| right.history | 11 |
| right.automation | 1 |
| right.workspace | 3 |
| settings.global | 10 |
| right.assets | 1 |
| right.navigator | 2 |

## Coverage

| Feature | Catalog section | Existing group | Canonical owner | Canonical route |
|---|---|---|---|---|
| Brush Size / Opacity | B. 描画・ブラシエンジン | Brush | R3 Brush | Left/Search → R3 Brush → Brush Size / Opacity |
| Stabilization / Smoothing | B. 描画・ブラシエンジン | Brush | R3 Brush | Left/Search → R3 Brush → Stabilization / Smoothing |
| Brush Dynamics 共通変調モデル | B. 描画・ブラシエンジン | Brush | R3 Brush | Left/Search → R3 Brush → Brush Dynamics 共通変調モデル |
| Dynamics Curve / Range / Invert | B. 描画・ブラシエンジン | Brush | R3 Brush | Left/Search → R3 Brush → Dynamics Curve / Range / Invert |
| Texture-based Brush Input | B. 描画・ブラシエンジン | Brush | R3 Brush | Left/Search → R3 Brush → Texture-based Brush Input |
| Brush Preset | B. 描画・ブラシエンジン | Brush | R3 Brush | Left/Search → R3 Brush → Brush Preset |
| Brush検索・整理 | B. 描画・ブラシエンジン | Brush | R3 Brush | Left/Search → R3 Brush → Brush検索・整理 |
| ユーザー作成Brush | B. 描画・ブラシエンジン | Brush | R3 Brush | Left/Search → R3 Brush → ユーザー作成Brush |
| Dynamic Wet Media | B. 描画・ブラシエンジン | Brush | R3 Brush | Left/Search → R3 Brush → Dynamic Wet Media |
| 紙質・粒子・質感 | B. 描画・ブラシエンジン | Brush | R3 Brush | Left/Search → R3 Brush → 紙質・粒子・質感 |
| Gap Closing | D. 塗り・彩色 | Fill / Region | R4 Inspector | Left/Search → R4 Inspector → Gap Closing |
| Gap Tolerance | D. 塗り・彩色 | Fill / Region | R4 Inspector | Left/Search → R4 Inspector → Gap Tolerance |
| Multi-layer Reference Fill | D. 塗り・彩色 | Fill / Region | R4 Inspector | Left/Search → R4 Inspector → Multi-layer Reference Fill |
| Lineart Reference Fill | D. 塗り・彩色 | Fill / Region | R4 Inspector | Left/Search → R4 Inspector → Lineart Reference Fill |
| Color Difference Tolerance | D. 塗り・彩色 | Color | R4 Inspector | Left/Search → R4 Inspector → Fill/Region → Color Difference Tolerance |
| Color Picker | E. カラーシステム | Color | R2 Color | Left/Search → R2 Color → Color Picker |
| Color History | E. カラーシステム | Color | R2 Color | Left/Search → R2 Color → Color History |
| Palette | E. カラーシステム | Color | R2 Color | Left/Search → R2 Color → Palette |
| HSV/HSL/RGB等のカラーコントロール | E. カラーシステム | Color | R2 Color | Left/Search → R2 Color → HSV/HSL/RGB等のカラーコントロール |
| Color Harmony支援 | E. カラーシステム | Color | R2 Color | Left/Search → R2 Color → Color Harmony支援 |
| Color Management / ICC | E. カラーシステム | Color Management | R11 Document | Left/Search → R11 Document → Color Management / ICC |
| Wide Gamut | E. カラーシステム | Color Management | R11 Document | Left/Search → R11 Document → Wide Gamut |
| 8-bit integer | E. カラーシステム | Color Management | R11 Document | Left/Search → R11 Document → 8-bit integer |
| 16-bit integer | E. カラーシステム | Color Management | R11 Document | Left/Search → R11 Document → 16-bit integer |
| 16-bit float | E. カラーシステム | Color Management | R11 Document | Left/Search → R11 Document → 16-bit float |
| 32-bit float | E. カラーシステム | Color Management | R11 Document | Left/Search → R11 Document → 32-bit float |
| Embedded ICC Profile | E. カラーシステム | Color Management | R11 Document | Left/Search → R11 Document → Embedded ICC Profile |
| Profile Conversion / Display Transform | E. カラーシステム | Color Management | R11 Document | Left/Search → R11 Document → Profile Conversion / Display Transform |
| CMYK Native Editing | E. カラーシステム | Color Management | R11 Document | Left/Search → R11 Document → CMYK Native Editing |
| Soft Proof | E. カラーシステム | Document / Save | R11 Document | Left/Search → R11 Document → Soft Proof |
| Out-of-Gamut Warning | E. カラーシステム | Color Management | R11 Document | Left/Search → R11 Document → Out-of-Gamut Warning |
| Rendering Intent / Black Point Compensation | E. カラーシステム | Color Management | R11 Document | Left/Search → R11 Document → Rendering Intent / Black Point Compensation |
| Font Family / Style / Size | F. レイヤー | Text | R4 Inspector | Left/Search → R4 Inspector → Font Family / Style / Size |
| Tracking / Line Height / Baseline | F. レイヤー | Text | R4 Inspector | Left/Search → R4 Inspector → Tracking / Line Height / Baseline |
| Font Import | F. レイヤー | Text | R4 Inspector | Left/Search → R4 Inspector → Font Import |
| Missing Font Handling | F. レイヤー | Text | R4 Inspector | Left/Search → R4 Inspector → Missing Font Handling |
| Layer Comps | F. レイヤー | Layers / Compositing | R1 Layers | Left/Search → R1 Layers → Layer Comps |
| Transform Interpolation | G. 選択・変形 | Transform | R4 Inspector | Left/Search → R4 Inspector → Transform Interpolation |
| Blend Mode Live Preview | H. 非破壊編集・合成 | Layers / Compositing | R1 Layers | Left/Search → R1 Layers → Blend Mode Live Preview |
| Filter Masking / Reorder / Opacity / Blend | H. 非破壊編集・合成 | Layers / Compositing | R7 Effects | Left/Search → R7 Effects → Filter Masking / Reorder / Opacity / Blend |
| Reference Workspace | I. Reference System | Reference | R5 Reference | Left/Search → R5 Reference → Reference Workspace |
| 複数Reference | I. Reference System | Reference | R5 Reference | Left/Search → R5 Reference → 複数Reference |
| 自由配置 | I. Reference System | Asset Library | R5 Reference | Left/Search → R5 Reference → 自由配置 |
| Reference Persistence | I. Reference System | Reference | R5 Reference | Left/Search → R5 Reference → Reference Persistence |
| Snapshot System | J. 履歴・Snapshot・分岐 | History / Snapshot | R9 History | Left/Search → R9 History → Snapshot System |
| History Panel | J. 履歴・Snapshot・分岐 | History / Snapshot | R9 History | Left/Search → R9 History → History Panel |
| 制作履歴ベースTimelapse | K. Timelapse・作業時間 | Timelapse / Work Time | R9 History | Left/Search → R9 History → 制作履歴ベースTimelapse |
| UIを含めない出力 | K. Timelapse・作業時間 | History / Snapshot | R9 History | Left/Search → R9 History → UIを含めない出力 |
| High-resolution Export | K. Timelapse・作業時間 | History / Snapshot | R9 History | Left/Search → R9 History → High-resolution Export |
| Frame Pace調整 | K. Timelapse・作業時間 | History / Snapshot | R9 History | Left/Search → R9 History → Frame Pace調整 |
| Work Time | K. Timelapse・作業時間 | Timelapse / Work Time | R9 History | Left/Search → R9 History → Work Time |
| Session | K. Timelapse・作業時間 | Timelapse / Work Time | R9 History | Left/Search → R9 History → Session |
| Today | K. Timelapse・作業時間 | Timelapse / Work Time | R9 History | Left/Search → R9 History → Today |
| Total | K. Timelapse・作業時間 | Timelapse / Work Time | R9 History | Left/Search → R9 History → Total |
| Average | K. Timelapse・作業時間 | Timelapse / Work Time | R9 History | Left/Search → R9 History → Average |
| Auto Actions / Macros | L. Automation | Automation | R10 Automation | Left/Search → R10 Automation → Auto Actions / Macros |
| Workspace Save / Load | M. UI・Workspace・操作体系 | Workspace / Settings | R12 Workspace | Left/Search → R12 Workspace → Workspace Save / Load |
| Workspace Preset | M. UI・Workspace・操作体系 | Workspace / Settings | R12 Workspace | Left/Search → R12 Workspace → Workspace Preset |
| Custom Toolbar | M. UI・Workspace・操作体系 | Workspace / Settings | R12 Workspace | Left/Search → R12 Workspace → Custom Toolbar |
| Custom Shortcut | M. UI・Workspace・操作体系 | Input / Accessibility | Dedicated Settings | Left/Search → Settings → Custom Shortcut |
| Custom Gesture | M. UI・Workspace・操作体系 | Input / Accessibility | Dedicated Settings | Left/Search → Settings → Custom Gesture |
| Scalable UI / Text | M. UI・Workspace・操作体系 | Workspace / Settings | Dedicated Settings | Left/Search → Settings → Scalable UI / Text |
| Color Description Assistance | M. UI・Workspace・操作体系 | Workspace / Settings | Dedicated Settings | Left/Search → Settings → Color Description Assistance |
| Reduced Motion | M. UI・Workspace・操作体系 | Input / Accessibility | Dedicated Settings | Left/Search → Settings → Reduced Motion |
| Touch Target Policy | M. UI・Workspace・操作体系 | Input / Accessibility | Dedicated Settings | Left/Search → Settings → Touch Target Policy |
| Feedback Sound / Haptic | M. UI・Workspace・操作体系 | Input / Accessibility | Dedicated Settings | Left/Search → Settings → Feedback Sound / Haptic |
| Guide Snapping | O. 定規・ガイド・形状・グラデーション | Guides / Rulers | R4 Inspector | Left/Search → R4 Inspector → Guide Snapping |
| Guide Visibility / Lock | O. 定規・ガイド・形状・グラデーション | Guides / Rulers | R4 Inspector | Left/Search → R4 Inspector → Guide Visibility / Lock |
| Guide Preset / Save | O. 定規・ガイド・形状・グラデーション | Guides / Rulers | R4 Inspector | Left/Search → R4 Inspector → Guide Preset / Save |
| Editable Gradient Stops | O. 定規・ガイド・形状・グラデーション | Gradient | R4 Inspector | Left/Search → R4 Inspector → Editable Gradient Stops |
| Non-destructive Gradient | O. 定規・ガイド・形状・グラデーション | Gradient | R4 Inspector | Left/Search → R4 Inspector → Non-destructive Gradient |
| Gradient Dithering | O. 定規・ガイド・形状・グラデーション | Gradient | R4 Inspector | Left/Search → R4 Inspector → Gradient Dithering |
| Shipping locale set | O.2 Localization | Workspace / Settings | Dedicated Settings | Left/Search → Settings → Shipping locale set |
| PWA Install | P. ファイル・保存・Recovery・Offline | Document / Save | Dedicated Settings | Left/Search → Settings → PWA Install |
| Worst Frame計測 | Q. Performance・Rendering | Workspace / Settings | Dedicated Settings | Left/Search → Settings → Worst Frame計測 |
| 2D Asset Library | T. Asset Library・Navigator・拡張性 | Asset Library | R6 Assets | Left/Search → R6 Assets → 2D Asset Library |
| Navigator | T. Asset Library・Navigator・拡張性 | Navigator | R8 Navigator | Left/Search → R8 Navigator → Navigator |
| Dock / Float Navigator | T. Asset Library・Navigator・拡張性 | Navigator | R8 Navigator | Left/Search → R8 Navigator → Dock / Float Navigator |
