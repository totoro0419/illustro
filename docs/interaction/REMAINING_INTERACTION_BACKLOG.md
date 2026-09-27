# Remaining Interaction Design Backlog

> Status: **Tracked open interaction decisions after P0 remediation**  
> Date: 2026-09-27  
> Principle: ここに載っている項目は「存在を忘れている」のではなく、意図的に未確定として追跡する。

## 1. Dynamic Wet Media — P1

Before feature-specific final UI:

- Wet/Dry stateをユーザーへどの程度見せるか
- explicit Dry / Re-wet commandの有無
- canvas/layer全体のwet stateか、local brush-mediated stateか
- SmudgeとWet MixingのTool上の区別
- sampling existing pigmentの操作
- Paper/Absorption preset変更時の既存Artworkへの影響
- wet simulation pause/freeze
- undo grouping
- save中のwet state serialization
- low-power/mobile degradation presentation

## 2. Vector — P1

- freehand vector vs pen/path toolの入口
- node selection model
- direct-selection vs object-selection
- open/close path
- anchor/handle creation gesture
- variable-width editing UI
- vector eraser semantics
- raster brush appearance on vector path
- shape→path conversion
- rasterize warning/undo
- mixed raster/vector selection behavior

## 3. Text — P1

- point text vs area text
- click/tap to create flow
- IME/composition behavior
- horizontal/vertical mode switching
- text edit commit/cancel
- text tool focus vs global shortcuts
- mobile software keyboard
- missing font resolution
- font import
- text→path conversion
- text on path / area text adoption decision
- Japanese punctuation/tate-chu-yoko等をどこまで扱うか

## 4. Guides / Rulers / Shapes / Gradient — P1

- guide create/delete/edit
- multiple guide selection
- guide locking
- snap temporary override
- symmetry axis manipulation
- perspective vanishing point manipulation
- shape quick-correction trigger
- geometric shape commit/cancel
- gradient create/edit/delete stop
- gradient direct-manipulation handles
- non-destructive gradient layer/entity representation in UI
- phone compact interaction

## 5. Blend Modes / Blend If — P1

- blend mode browser organization
- live preview browsing behavior
- favorite/recent modes
- keyboard cycling
- Blend If range-handle model
- split/feather range manipulation
- source/self channel selection
- on-canvas visualization
- reset/copy/paste settings
- compatibility mode display when importing PSD

## 6. Adjustments / Live Filters — P1

- Adjustment Layer creation flow
- Filter Layer vs Layer-attached Live Filter presentation
- destructive Apply vs non-destructive Add
- parameter edit transaction
- Apply/Cancel/Reset
- before/after compare
- mask creation default
- effect reorder
- disabled/bypass behavior
- cache/materialization indication if needed
- long filter computation cancellation

## 7. Healing / Patch / Clone — P1

- source point set gesture
- aligned/non-aligned source behavior
- sample current/all/reference layers
- source visualization
- patch source/target direction
- selection interaction
- transform/scale source support
- tablet pen-button flow
- phone touch-only source selection

## 8. Macro / Automation — P1

- Record start/stop UI
- what commands are recordable
- commands that must be skipped/rejected
- recording parameter drags
- nested macro policy
- macro failure behavior
- rollback on mid-macro failure
- parameter prompt
- dry-run/preview
- macro execution undo grouping
- long-running/cancellable macro
- permission/security model for future extensions

Default candidate: one macro execution = one top-level Undo group, unless an explicitly advanced mode exposes substeps.

## 9. Asset Library — P1

- import flow
- duplicate-name conflict
- replace existing asset
- delete asset currently referenced by document/history
- versioned brush resource
- tag/folder edit
- favorites/recent
- drag/drop
- asset preview
- local-only vs externally linked resource
- export bundle
- missing dependency repair

## 10. Navigator / Multi-view — P2

- Navigator click/drag semantics
- rotation indicator interaction
- mirror/grayscale preview
- create/close second view
- view transform independent/shared
- active tool shared across views
- active selection shared
- which view receives shortcut
- multi-view GPU/cache cost

## 11. Work Time — P2

- Default ON/OFF
- pause manually
- idle classification visibility
- session reset semantics
- edit types counted
- privacy/export
- displayed precision
- corrections to incorrectly counted time

No fixed idle threshold before usage testing.

## 12. Gesture Customization — P1

Keyboard ShortcutはPress-to-bindで詳細化済みだが、Gesture customizationは未詳細。

Need:

- gesture capture vs list selection
- OS/browser reserved gestures
- pen + touch gesture conflicts
- one/two/three-finger taxonomy
- hold/tap/double-tap
- context scope
- conflict detection
- reset/default profiles
- left/right-handed mapping
- accessibility alternatives

## 13. Workspace layout — P1

- dock target behavior
- floating panel snap
- tabbed panels
- phone sheet hierarchy
- tablet panel collapse
- workspace preset switch with unsaved layout
- reset workspace
- panel minimum sizes
- hybrid touch PC density

Visual generation should handle this only after dedicated UI skill is used.

## 14. Accessibility feature-by-feature QA — P1

Global policy exists, but each feature must verify:

- accessible names
- focus order
- keyboard reachability
- touch target
- non-color-only state
- reduced motion
- screen reader announcements where applicable
- no multi-touch-only Core action

## 15. File interoperability UI — P1

- PSD loss report format
- import compatibility warning
- export compatibility preview
- unsupported effects/layers handling
- profile conversion warning
- missing font/resource report
- OpenRaster limitations
- image metadata controls

## 16. AI assist features — later

Policy is sufficient for now.

Before concrete feature implementation:

- explicit activation
- input data scope
- offline behavior
- deterministic alternative
- preview/apply/cancel
- privacy disclosure
- no silent artwork modification

## 17. Plugin / Collaboration — Future

Intentionally deferred. No UI design now.

## 18. Completion rule

A backlog area moves to **Interaction Ready** only after it has:

- Entry
- Default
- Active State
- Commit
- Cancel or explicit N/A
- Undo
- Failure/conflict
- Device mapping
- Persistence
- Performance cost
- Acceptance criteria

and is cross-checked with Architecture.


## 18. Pixel Art specialized behavior — P1

Pixel Art Workspace presetだけでは不十分。

Need:

- hard-edge 1px brush behavior
- anti-aliasing OFF semantics
- nearest-neighbor transform default
- pixel grid visibility / threshold
- integer-coordinate snapping
- selection/transform avoiding half-pixel blur
- palette-oriented workflow
- export scaling with nearest-neighbor
- device-independent crisp preview

Indexed-color document mode itselfをCoreへ入れるかは別途評価。

## 19. Export / Metadata / Physical-output details — P1/P2

Need:

- PNG alpha/profile behavior
- JPEG background flatten + quality
- WebP quality/lossless/alpha
- TIFF options
- ICC embed/strip
- EXIF orientation normalization on import
- metadata preserve/strip
- export resize
- filename extension behavior
- overwrite
- transparency warning for non-alpha formats
- soft-proof-to-export relationship

Direct Print機能は一枚絵用途に有益か調査するが、DTP化はしない。
初期Coreは高品質Export + Soft Proofを優先。

## 20. Input binding beyond keyboard — P1

Keyboard press-to-bindは詳細化済み。

Need:

- mouse button assignment
- pen barrel button assignment
- stylus eraser behavior customization
- touch gesture assignment
- double tap / hold / multi-finger gestures
- device-specific unavailable binding indication
- context conflicts
- OS/browser reserved gesture detection
- import/export/reset binding profile

Binding identityはDevice-specific raw codesとCommand semanticsを分離する。

## 21. UI Theme / Canvas presentation — Visual UI phase

Need decisions:

- neutral default theme
- light/dark variants
- canvas surround/background
- transparency checker
- pixel grid colors
- selection/guide colors
- high-contrast accessibility variants

Color-critical artwork perceptionを不必要に歪めないこと。

These are visual decisions and must use the dedicated UI design skill.
