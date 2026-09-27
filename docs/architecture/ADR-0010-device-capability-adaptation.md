# ADR-0010: Device Capability Adaptation — PC / Tablet / Smartphone

## Status

**Accepted for prototype**

## Date

2026-09-27

## Problem

IllustroをPC・Tablet・Smartphoneの3系統で正常に動作させるため、入力、画面、GPU、Storage、Memory、Lifecycleの差を吸収する方法を定義する。

「PC版 / Tablet版 / Smartphone版」という固定実装へ分裂させず、同じDocument semanticsとCore editing capabilityを保ちながら、UI・実行配置・Budgetだけを環境へ適応させる必要がある。

## Current requirements

- PC / Tablet / Smartphoneの3系統でCore paintingが正常動作
- 同一UIの単純Scaleは禁止
- 高度機能を端末カテゴリだけを理由に削らない
- Stylus / Touch / Mouse / Keyboard対応
- Offline First
- WebGPU単独依存禁止
- lightweight / pay-for-use
- mobile background/discardによるData loss防止

## Decision

## 1. Device class is only a layout default

PC / Tablet / Smartphoneは**初期UI Layoutの候補**として使う。

機能・入力・Renderer・Worker配置はUser-Agentや端末名で決めない。

Safari 26もconditional codeではUA stringよりfeature detectionを推奨しているため、IllustroもCapability-driven adaptationを採用する。

### Default layout classes

- **Expanded** — PC、大型Tablet + keyboard/trackpad等
- **Medium** — Tablet
- **Compact** — Smartphone

Viewport、available space、safe area、input capabilitiesに応じてRuntime中に切替可能にする。

iPad + keyboard/trackpad、touch-enabled PC、stylus smartphone等を例外扱いしない。

## 2. Capability Profile

Runtimeは少なくとも以下のCapabilityを個別に検出する。

### Input

- Pointer Events
- observed pointer types: mouse / touch / pen
- pressure
- tilt
- azimuth/altitude
- buttons / eraser
- hover / any-hover
- pointer precision / any-pointer
- keyboard/modifier availability when actually observed

### Graphics

- WebGPU availability
- adapter/device creation success
- required limits/features
- runtime smoke test
- device-loss history
- WebGL2 availability
- Canvas2D/CPU compatibility

### Storage

- OPFS
- Worker OPFS path
- SyncAccessHandle where available
- StorageManager.estimate()
- persistent-storage result where available
- direct File System picker/handle availability
- download/import fallback

### Display / Layout

- viewport size
- devicePixelRatio
- VisualViewport
- safe-area insets
- orientation changes
- color-gamut capability
- fullscreen/standalone status where useful

### Compute hints

- hardwareConcurrency
- deviceMemory only when available

deviceMemoryはLimited Availabilityかつcoarsened valueであるため、Memory Budgetのauthorityにはしない。

hardwareConcurrencyもhintであり、その数だけWorkerを作成しない。

## 3. Graphics profiles

### G0 — WebGPU

WebGPU adapter/device作成とIllustro smoke testが成功した場合。

API存在確認だけでG0へ入れない。

確認:

- texture formats required by current document
- maximum texture/storage limits
- representative brush compute/render pass
- canvas presentation
- device lost/error behavior

### G1 — Compatibility GPU

WebGL2等でCore Raster compositingを行う。

高度ComputeはCPU/WASMへfallback可能。

### G2 — CPU compatibility

GPU pathが安全に利用できない場合。

Core painting semanticsを維持するが、Canvas/Filter等の実用上限・性能差は測定値に基づいて提示する。

## 4. Input arbitration

### Pen

Penが観測された場合、Canvas上ではDefault drawing pointerとする。

Pressure/Tilt等はそのEventでvalidなものだけ利用する。

unsupported sensorの0/default値を「実際に水平・無圧」と誤認しない。

### Touch

Default:

- one-/multi-touch gesture: Pan / Zoom / Rotate
- finger drawing: user-configurable

Pen active中のTouchはDefaultでCanvas navigation/gesture用途とし、同時にBrush strokeへしない。

Palm判定をTouch size等の単純heuristicだけで強制しない。OS/device palm rejectionを尊重しつつ、必要ならconservative filteringをPrototypeする。

### Mouse / Trackpad

- hover
- buttons
- wheel/trackpad zoom
- context interaction
- keyboard modifiers

Touch-enabled PCでTouchも同時利用可能。

## 5. Canvas direct-manipulation ownership

Canvas drawing surfaceはPointer Events + Pointer Captureを基本とする。

Custom Pan/Zoom/Rotateを確実に受け取る領域ではtouch-actionを事前に適切に指定する。

Canvas全体を無条件にBrowser scrollへ渡さない一方、Panel/List等はNative scrollingを維持する。

touch-actionをpointerdown後に変更して現在Gestureを奪える前提にしない。

## 6. Layout adaptation

### PC / Expanded

Default:

- multi-panel
- Dock/Floating
- hover affordances
- keyboard shortcuts
- mouse/pen tablet
- high information density

Touchがある場合はTouch targetsを小さく固定せず、hybrid modeを許可。

### Tablet / Medium

Default:

- stylus + touch
- medium/large touch targets
- Canvas priority
- contextual panels
- gesture navigation
- optional keyboard/trackpad shortcut layer

Keyboard/trackpad接続でExpanded寄りへ遷移可能。

### Smartphone / Compact

Default:

- Canvas occupancy最大化
- Quick Menu / Context UI中心
- thumb reachable primary controls
- no hover dependency
- large hit targets
- panels are transient/sheets rather than permanent columns where appropriate
- portrait/landscape双方にreflow

Advanced functionality自体は削除せず、access pathをCompact化する。

## 7. Safe area / visual viewport

Mobile UIはCSS safe-area environment variablesを考慮する。

- notch
- rounded corners
- home indicator
- fold/segment where relevant

On-screen keyboard等でvisual viewportが縮むため、Text input / numeric input / search時はVisualViewportを参照し、重要UIをkeyboard下へ隠さない。

固定screen sizeを記憶してlayoutしない。

## 8. Orientation and resize

Orientation change、split view、browser toolbar変化、desktop window resizeをRuntime eventとして扱う。

Document view transform自体は維持し、UI shellをreflowする。

Canvas backing resolutionを毎小変化で即再確保せず、debounce/coalesceして不要なGPU/Memory churnを避ける。

## 9. Memory adaptation

PC / Tablet / Smartphoneへ固定RAM budgetを割り当てない。

Budget source:

1. current project working set
2. GPU adapter limits
3. viewport demand
4. cache hit/miss telemetry
5. storage quota
6. hardwareConcurrency / deviceMemory等のoptional hints
7. observed allocation/device loss failures

Policy:

- conservative initial cache
- no giant startup preallocation
- caches grow only with demonstrated need
- mobileではbackground cache growthを抑える
- device loss / memory pressure後はprofileをdowngrade可能
- current canonical artwork / recovery closureはcacheより優先

## 10. Scheduling adaptation

Worker数はDevice categoryではなくRuntime profileで決める。

### Smartphone default candidate

- minimal worker count
- Region/codec/effect jobs coalesced
- no idle busy-work
- hidden stateではbackground analysis停止

### Tablet

- one or few utility lanes
- stylus foreground優先
- thermal/backpressureで縮退

### PC

- more compute lanes possible
- still no one-worker-per-core rule
- foreground latency優先

## 11. Mobile lifecycle resilience

Mobile browser/web appはBackground後にfreeze/discard/terminateされ得る。

IllustroはbeforeunloadをRecoveryの主要triggerにしてはならない。

Required:

- normal editing中からRecovery Journalを継続
- visibilitychange: hidden でprepared recovery packetのflushを高優先化
- hidden時はRegion/preview/cache等の不要background workを停止
- pagehide等は補助signal
- unload callback完了をData safety条件にしない
- process kill / tab discardからlast protected revisionを復元可能

## 12. Storage adaptation

OPFSをWorking Storeの第一候補とする。

OPFSは広く利用可能だが、ユーザーが直接見るportable fileではない。

Portable .illustro save:

### Direct file handle available

- explicit save/update

### Direct file handle unavailable

- Blob/download/export
- file input/import
- platform share/export adapter if available

showSaveFilePicker()はLimited AvailabilityなのでCore workflowの必須条件にしない。

StorageManager.estimate()でquota/usageを監視できる環境では使用する。

## 13. PWA / installability

PWA/Home Screen installは便利機能であり、Core editingの前提条件にしない。

Browser tabでもCore editingが成立する。

Installed modeでは:

- larger standalone workspace
- offline app shell
- quicker launch

等を活用可能。

## 14. Core Normal Operation definition

PC / Tablet / Smartphoneで、少なくとも以下が同じDocument semanticsで成立することを「正常動作」の最低条件とする。

- create/open document
- raster brush
- eraser
- color pick/change
- basic layers/group/clipping
- Undo / Redo
- Pan / Zoom / Rotate
- basic Selection / Transform
- Reference viewing
- Autosave / Recovery
- portable .illustro export/import
- PNG/WebP/JPEG export
- offline continuation after app shell is cached/installed where platform permits

Advanced featuresも端末カテゴリだけでは削除しないが、Region/Wet Media/large Live Filter等はresource budgetに応じて非同期処理・cache縮小・実用上限表示を許容する。

## 15. Support matrix baseline

### PC

Target environment categories:

- Windows
- macOS
- Linux

Input:

- mouse + keyboard mandatory baseline
- pen tablet optional
- touch optional

Core does not require WebGPU, SAB, touchscreen, stylus, direct file handle.

### Tablet

Target environment categories:

- iPadOS
- Android tablet

Input:

- touch mandatory baseline
- stylus optional but first-class
- keyboard/trackpad optional

Core does not require hover, keyboard, direct file handle, or WebGPU.

### Smartphone

Target environment categories:

- iOS
- Android

Input:

- touch mandatory baseline
- stylus optional

Core does not require hover, physical keyboard, direct file handle, WebGPU, SAB.

## 16. Current platform findings

As of 2026-09:

- Pointer Events Level 3 is a W3C Recommendation and covers mouse/pen/touch, coalesced/predicted events, pressure/orientation-related fields.
- pressure and tilt are broadly available web properties, but actual hardware values remain device-dependent.
- OffscreenCanvas and OPFS are broadly available APIs.
- WebGPU is available in Safari 26 on macOS/iOS/iPadOS/visionOS, but must still be runtime tested.
- Chrome WebGPU on Android depends on OS/GPU/device support; Chrome 146 adds a compatibility mode path starting on Android.
- GPUCanvasContext remains non-Baseline across the full web ecosystem.
- direct Save File Picker remains limited availability.
- iOS/iPadOS Home Screen web apps are supported, and Safari 26 further broadens web-app launch behavior.
- safe-area environment variables and VisualViewport are available tools for mobile layout adaptation.

Therefore no optional API above is allowed to be a single point of failure for Core editing.

## 17. Rejected approaches

### UA-based device branches

Rejected.

Reason:

- hybrid devices
- iPad keyboard/trackpad
- touch PCs
- stylus smartphones
- UA freezing/reduction
- browser recommendation favors feature detection

### Separate product cores per device

Rejected.

Reason:

- behavior divergence
- file semantic mismatch
- maintenance duplication

UI shell and execution profile may differ, Document semantics remain common.

### Lowest-common-denominator UI

Rejected.

Reason:

- wastes PC/tablet capabilities
- conflicts with device-specific optimization goal

## 18. Validation plan

### PC

- mouse-only
- mouse + keyboard
- pen tablet
- touch laptop
- multi-monitor / DPR changes
- resize/minimize/restore
- WebGPU available/unavailable

### Tablet

- iPadOS Safari/Home Screen
- Android Chrome/PWA
- touch-only
- stylus
- stylus + touch gestures
- external keyboard/trackpad
- portrait/landscape
- split-screen
- background/resume/kill

### Smartphone

- iOS Safari/Home Screen
- Android Chrome/PWA
- portrait/landscape
- touch-only
- virtual keyboard
- safe area
- background/app switch/process kill
- low-memory/cache-pressure simulation
- WebGPU unavailable/device-loss fallback

### Common

- OPFS available
- direct file picker absent
- offline start after cache
- storage near quota
- recovery after abrupt termination
- same .illustro file moved between all three device classes

## 19. Acceptance

PC / Tablet / Smartphoneそれぞれについて、Core Normal Operationの全項目を実機でPASSしなければPlatform対応完了とはしない。

設計検査時点では**対応可能性はPASS**。

実装がまだ存在しないため、**実動作は未確認**。


## 20. Official references

- W3C Pointer Events Level 3: https://www.w3.org/TR/pointerevents3/
- W3C Media Queries Level 4: https://www.w3.org/TR/mediaqueries-4/
- WebKit Safari 26 features / WebGPU / web apps: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- Chrome WebGPU Android / compatibility mode: https://developer.chrome.com/blog/new-in-webgpu-146
- MDN Origin Private File System: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
- MDN showSaveFilePicker: https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
- MDN OffscreenCanvas: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- MDN GPUCanvasContext: https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext
- MDN deviceMemory: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
- MDN VisualViewport: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
- MDN StorageManager.estimate: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate
- MDN beforeunload reliability: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
