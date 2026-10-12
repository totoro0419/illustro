> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Device Test Matrix — PC / Tablet / Smartphone

> Status: **Support / regression validation matrix — not a Core implementation blocker**  
> Date: 2026-09-27  
> Purpose: 実装後にPC / Tablet / Smartphone対応を「Supported」と宣言するための共通テスト。

## 0. Gate placement

このMatrixをPC / Tablet / Smartphoneすべてで完走することは、Core Editor本実装を開始する前提ではない。

Implementation前:
- Architecture semantics / fallbackを設計
- automated CI / browser testsを通す
- 少なくとも1つの代表的な実端末でRealtime pathの仮説を検証

Implementation後、Supported environment宣言前:
- このMatrixで該当Device classをRegression検証

2026-09-28時点ではXiaomi tablet + Xiaomi penでMain/Worker入力経路の実測証拠がある。ただしこれはTablet Core Normal Operation全体のPROTOTYPE PASSを意味しない。

## 1. Core Normal Operation Script

全Device Classで同じ順序を実行する。

1. App launch
2. New document
3. Draw with default brush
4. Change color
5. Erase
6. Create layer
7. Reorder / hide / show layer
8. Alpha Lock / Clipping
9. Undo / Redo
10. Pan / Zoom / Rotate
11. Basic selection
12. Basic transform
13. Open reference
14. Save/recovery checkpoint
15. Background/minimize where applicable
16. Resume
17. Export .illustro
18. Close/terminate
19. Reopen .illustro
20. Export PNG
21. Compare canonical artwork with pre-close state

PASSには、操作成功だけでなくData loss、incorrect input arbitration、unbounded memory growth、UI obstructionがないことを含む。

## 2. PC matrix

### Primary environments

- Windows desktop/laptop
- macOS desktop/laptop
- Linux desktop/laptop

### Input variants

- Mouse + keyboard
- Trackpad + keyboard
- Pen tablet
- Touchscreen + mouse/keyboard
- Pen display where available

### Required scenarios

- hover present
- touch absent
- touch present
- pen absent
- pen present
- WebGPU available
- WebGPU unavailable/fallback forced
- SharedArrayBuffer unavailable
- direct save picker unavailable
- window resize
- high-DPI display
- monitor/DPR change where practical

### PC PASS criteria

- no keyboard/mouse-only dependency blocks pen/touch
- no pen dependency blocks mouse use
- canvas input remains responsive while panels are open
- save/export works without direct file handle
- renderer fallback preserves document semantics

## 3. Tablet matrix

### Primary environments

- iPadOS Safari / Home Screen web app
- Android tablet Chrome / installed web app where available

### Input variants

- Touch only
- Stylus only for drawing + touch gestures
- Stylus + external keyboard
- Stylus + trackpad/mouse
- Touch + keyboard/trackpad

### Required scenarios

- portrait
- landscape
- split view / reduced viewport
- software keyboard visible
- safe area
- background → foreground
- process/tab termination
- low-memory/cache downgrade
- WebGPU success
- WebGPU fallback
- stylus pressure available
- stylus tilt unavailable
- direct save picker unavailable

### Tablet PASS criteria

- pen stroke and touch gesture do not conflict in default mode
- touch-only user can perform Core Normal Operation
- orientation/split-view does not lose canvas position/document state
- background termination loses no work older than current recovery guarantee
- permanent hover is not required for any Core action

## 4. Smartphone matrix

### Primary environments

- iOS Safari / Home Screen web app
- Android Chrome / installed web app where available

### Input variants

- Touch only
- Stylus where hardware/browser provides it

### Required scenarios

- portrait
- landscape
- notch / safe area
- software keyboard
- one-hand compact layout
- app switch
- browser process kill
- storage near quota
- low-memory/cache pressure
- WebGPU unavailable
- WebGPU device loss
- no physical keyboard
- no hover
- no direct file handle

### Smartphone PASS criteria

- all Core Normal Operation commands remain reachable
- no essential hover-only or right-click-only command
- safe areas/keyboard do not cover active critical controls
- browser gesture does not steal active drawing interaction
- background/kill recovery works from last protected revision
- memory policy degrades caches/background features before artwork state

## 5. Cross-device document test

Create one project on each class and open it on the other two.

Required combinations:

- PC → Tablet → Smartphone
- Tablet → Smartphone → PC
- Smartphone → PC → Tablet

Compare:

- canvas dimensions
- pixel content
- layer tree/order
- masks/clipping
- vector/text canonical state when present
- color profile
- selections saved in document
- references metadata where stored
- snapshot/layer comp metadata
- region identity/assignments where present

Renderer backend or UI layout must not alter canonical meaning.

## 6. Capability fallback tests

Force-disable one capability at a time:

- WebGPU
- SharedArrayBuffer
- OffscreenCanvas worker rendering
- direct File System picker
- pressure
- tilt
- hover
- keyboard
- stylus

Core Normal Operation must remain possible.

If OPFS itself is unavailable in a future target/runtime, Storage Adapter fallback must be provided before that environment can be marked supported.

## 7. Performance observations

Collect per device:

- launch → canvas usable
- launch → first visible stroke
- pointer → visible pixel
- p50 / p95 / p99 frame time
- peak RAM proxy/available diagnostics
- GPU device loss/errors
- idle CPU
- background CPU
- storage writes per edit minute
- recovery flush latency
- battery/thermal observations where measurable

No cross-device numeric target is fixed before measurements.

## 8. Status labels

- **DESIGN PASS** — architecture has a valid fallback path
- **PROTOTYPE PASS** — prototype completed Core script on representative device
- **SUPPORTED** — regression suite repeatedly passes on defined supported environment
- **DEGRADED** — semantics correct, performance below target
- **UNSUPPORTED** — Core script cannot be completed safely

Current status:

- PC: **DESIGN PASS / Core runtime unverified**
- Tablet: **DESIGN PASS / Main-vs-Worker input benchmark measured on Xiaomi tablet + Xiaomi pen / full Core runtime unverified**
- Smartphone: **DESIGN PASS / Core runtime unverified**

Full-device validation remains required before Support claims, but is not required before Core implementation begins.
