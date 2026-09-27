# Device Compatibility Audit — PC / Tablet / Smartphone

> Date: 2026-09-27  
> Scope: Architecture v0.2のユーザー環境適応性  
> Result: **DESIGN PASS / RUNTIME UNVERIFIED**  
> Meaning: PC・Tablet・Smartphoneへ適応できるArchitectureになっている。実装がないため実機動作PASSではない。

## 1. Audit conclusion

現在Architectureは3端末カテゴリへ適応可能。

ただし次の前提を追加しないと問題が起きるため、ADR-0010として修正した。

1. device classだけで機能分岐しない
2. WebGPUを全端末で必須にしない
3. direct File System pickerを必須にしない
4. hover/keyboardをTablet/Phoneで必須にしない
5. stylus sensor valuesを常に存在すると仮定しない
6. mobile background/discard前のunload保存に依存しない
7. deviceMemoryをRAM budget authorityにしない
8. viewport/safe area/keyboard/orientationを動的に扱う
9. Worker数をdevice classだけで決めない
10. mobileでinactive advanced featureを常駐させない

## 2. PC

### Design status: PASS

正常動作に必要なCore APIはoptional high-end featureから分離されている。

Expected:

- Mouse/Keyboard: primary
- Pen tablet: optional first-class
- Touch: optional
- Multi-panel/hover/shortcut UI

Fallback:

- no WebGPU → compatibility renderer
- no SAB → transferable transport
- no direct file picker → export/download/import
- no pen → mouse drawing

Main remaining risk:

- Desktop browser/GPU/pen-tablet combinationsのinput-to-present差

## 3. Tablet

### Design status: PASS after corrections

Target:

- iPadOS
- Android tablets

Key requirements:

- pen + touch arbitration
- touch-only fallback
- no hover dependency
- keyboard/trackpad hot attachment
- orientation/split view reflow
- mobile lifecycle recovery
- conservative memory/cache

Current web facts support feasibility:

- Safari 26 ships WebGPU on iPadOS, but runtime/device-level fallback remains necessary.
- Android Chrome has WebGPU on supported devices and newer compatibility paths, but device fragmentation remains.
- Pointer Events/pressure/tilt are broadly implemented interfaces.
- OPFS is broadly available.

Main remaining risks:

- Safari/iPad WebGPU device-specific behavior
- stylus latency/device variations
- memory/thermal throttling
- app background kill

## 4. Smartphone

### Design status: PASS after corrections

Target:

- iOS
- Android

Required assumptions:

- touch-only must be sufficient
- no hover
- no physical keyboard
- no direct file handle
- WebGPU may be absent/unreliable
- smaller memory/thermal envelope
- process may be discarded after backgrounding

Design fixes:

- Compact UI
- VisualViewport + safe area
- lazy advanced modules
- reduced background concurrency
- OPFS recovery journal
- visibility-hidden flush attempt
- portable file export fallback
- CPU/GPU compatibility path

Main remaining risk:

- large/high-bit-depth projects may exceed practical smartphone resources.

Policy:

Do not remove features by category, but expose measured resource requirements and use bounded caches/async processing.

## 5. Cross-device file semantics

### PASS by design

Same .illustro semantics across PC/Tablet/Phone.

Renderer backend, UI layout, Worker placement and caches must not change artwork meaning.

A document saved on phone must not become a different semantic document when opened on PC.

## 6. Input portability

### PASS by design

Normalized Pointer model already avoids hard dependency on a single device.

Required refinement added:

- capability observation per pointer
- unsupported sensor defaults are not interpreted as real values
- pen/touch arbitration
- touch-action ownership
- pointer capture
- touch-only mode

## 7. Storage portability

### PASS after correction

OPFS is suitable as working store, not portable user file.

Direct File System Access picker is not universal.

Required fallback:

- portable Blob/download/export
- import by file picker/input
- optional platform share adapter

Mobile lifecycle means recovery must be continuous rather than unload-driven.

## 8. GPU portability

### PASS by fallback architecture

WebGPU is useful but not universal enough to be the only Core path.

Required:

- capability + smoke test
- device-loss recovery
- G1/G2 fallback
- no GPU-only canonical state

WebGPU feature presence alone is not sufficient proof of stable support on a particular GPU/OS/browser.

## 9. Memory portability

### PASS conceptually / requires measurement

Fixed PC/Tablet/Phone RAM budgets are rejected.

Dynamic/adaptive budget required.

deviceMemory is not universal and is privacy-coarsened; use only as an optional hint.

Main challenge:

Smartphone huge Canvas + many Layer + high bit depth.

This is expected to be a resource-limit problem, not a semantic compatibility failure.

## 10. UI portability

### PASS at architecture level

Three initial layouts:

- Expanded
- Medium
- Compact

But runtime capability may promote/demote.

Examples:

- iPad + trackpad may use Expanded behavior
- touch PC must retain large touch targets where needed
- stylus phone can expose pen-specific controls

UI generation has not started, so actual usability remains unverified.

## 11. Platform single-point-of-failure check

| Dependency | May be absent? | Core fallback |
|---|---:|---|
| WebGPU | Yes | WebGL2 / CPU path |
| SharedArrayBuffer | Yes | Transferable buffers |
| Direct File Picker | Yes | export/download + import |
| Stylus | Yes | mouse/touch |
| Pressure/Tilt | Yes | static/default brush dynamics |
| Hover | Yes | explicit/context UI |
| Keyboard | Yes | touch UI / Quick Menu |
| OPFS | Architecture expects it for web working store | fallback storage adapter required if future target lacks it |
| PWA install | Yes | browser-tab Core editing |
| General ICC fast hardware path | Yes | lazy CPU/WASM/general transform |

No optional high-end browser feature remains an intended single point of failure.

## 12. New required test gate

Before UI is called device-compatible, run the same functional script on:

### PC

create → draw → layer → undo → transform → save → reopen

### Tablet

create → stylus/touch draw → gesture → layer → background → resume → save → reopen

### Smartphone

create → touch draw → compact controls → rotate orientation → background/kill → recovery → export → reopen

Then move the same .illustro file across the three and compare canonical output.

## 13. Final judgement

**Architecture/design adaptability: PASS**

**Actual normal operation on PC: UNVERIFIED**
**Actual normal operation on Tablet: UNVERIFIED**
**Actual normal operation on Smartphone: UNVERIFIED**

The next evidence required is a cross-device architecture prototype, not further paper design.
