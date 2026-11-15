> Classification: EXPERIMENTAL / supporting historical UI detail. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Illustro Input Values Deferred Registry

> Date: 2026-09-30  
> Status: **INPUT METHOD FIXED / EVIDENCE-DEPENDENT VALUES DEFERRED**  
> Production implementation: **LOCKED**

## 1. Purpose

The Input Control Standard now decides **which interaction method is used** for every current-scope input-bearing feature. This registry prevents that design completion from being confused with premature locking of engine- or device-dependent numeric values.

A deferred item below does **not** reopen the input-method decision. It only remains numerically/algorithmically open until the named evidence exists.

## 2. Brush / stylus

| Deferred value | Input method already fixed | Evidence gate |
|---|---|---|
| Brush Size minimum/maximum/default | N2 nonlinear slider + exact px field | Brush engine/device benchmark + practical artwork tests |
| Brush Size nonlinear slider transfer function | N2 | Pen/mouse/touch acquisition study across small/large sizes |
| Normal/fine/coarse step sizes | Numeric/slider stepping contract | Device + keyboard usability test |
| Stabilization strength range/default | N1 + numeric | Stabilizer prototype comparison |
| Stabilization algorithm list/default | C2 | Brush stabilization benchmark |
| Pressure smoothing coefficients/default curve | E1/N1 | Stylus dataset/device benchmark |
| Dynamics default curves/ranges | E1 + N5 | Brush preset calibration |
| Wetness/Mix/Pull/Pigment ranges | N1/N4 + numeric | Wet-media prototype |
| Brush texture scale/rotation bounds | N6/N7 | Brush engine/asset tests |

## 3. Region / Fill / Selection

| Deferred value | Input method already fixed | Evidence gate |
|---|---|---|
| Region connectivity/confidence thresholds | not directly exposed; policy/candidate review UI fixed | Region dataset validation |
| Linked-color auto-follow confidence threshold | policy selector + preview/apply | Region dataset validation |
| Follow-strength numeric range/default | N1 + numeric | User test + Region behavior calibration |
| Gap Closing numeric range/default | N1 + numeric + visual preview | Fill dataset/prototype |
| Gap tolerance/default | N1 + numeric | Fill dataset/prototype |
| Color-difference tolerance model/range | N1 + numeric | Color/fill validation |
| Feather/Expand/Contract practical bounds | N1/N4 + numeric | Selection implementation tests |
| Similarity/Luminance range scaling | N1/N5 + numeric | Selection algorithm prototype |

## 4. Color / color management

| Deferred value | Input method already fixed | Evidence gate |
|---|---|---|
| Final supported color-model set beyond required RGB + HSV/HSL family | Values model selector + channel controls | Color-pipeline product decision |
| Availability of Lab/CMYK/native channel editing | C2 + channel sliders/numerics | Color architecture validation |
| Working color-space product default | C3 profile picker | Color-management decision |
| Bit-depth default | C1 | Memory/performance + workflow tests |
| Soft-proof default profile/intent | C3 + C2 + C5 | Color-management policy |
| Wide-gamut/HDR authoring exposure timing | same color primitives | Pipeline/runtime readiness |

## 5. Transform / Guides / Gradients / Filters

| Deferred value | Input method already fixed | Evidence gate |
|---|---|---|
| Transform interpolation algorithm list/default | C2 | Image-quality/performance comparison |
| Grid spacing/subdivision bounds/defaults | N1/N3 | Guide prototype |
| Perspective/Symmetry defaults | C1/N9/N7/D1 | Guide UX test |
| Gradient interpolation/repeat options | C2 | Gradient renderer design |
| Gradient dithering default/strength if exposed | C5 (+ N1 only if renderer proves useful) | Banding/output tests |
| Filter-specific radius/amount ranges | N1/N2/N4 + numeric | Filter implementation/quality tests |
| Curves/Levels point precision/limits | E1/E3 + exact fields | Adjustment engine precision |
| Liquify/Warp parameter bounds | D1 + canonical scalar fields | Transform prototype |

## 6. Timelapse / work-time / automation

| Deferred value | Input method already fixed | Evidence gate |
|---|---|---|
| Timelapse pace preset values | N3 + C2 presets | Export/runtime tests |
| Timelapse max output resolution/frame rate | N6/N3/C2 | Encoder/performance tests |
| Inactivity timeout default/range | C5 + N3 | Work-time behavior study |
| Macro parameter constraints | target primitive reused | Individual command schema |
| Gesture recognizer thresholds | T4 gesture capture | Device gesture-conflict tests |

## 7. Device / accessibility / workspace

| Deferred value | Input method already fixed | Evidence gate |
|---|---|---|
| Final hit-area/component metrics per platform/input capability | same semantic controls | PC/tablet/phone runtime QA |
| Compact-sheet geometry | same semantic controls | Compact visual/runtime review |
| Text/UI scale min/max/default | N1 + numeric + presets | Accessibility/layout stress tests |
| Motion durations/easing | Reduced Motion C5 remains fixed | Motion prototype/user preference tests |
| Haptic/sound intensity ranges | C5 + N1 | Platform capability/device tests |
| Panel min/max sizes | D1 splitter + Resize… alternative | Workspace layout tests |
| Quick Menu default activation gesture/button | explicit on-screen entry + configurable accelerators | Device prototype |

## 8. Document / export / platform

| Deferred value | Input method already fixed | Evidence gate |
|---|---|---|
| New-document factory preset sizes | C8 + N6/N3 fields | Product/device workflow study |
| Export format-specific quality ranges/defaults | N1/N3/C2 as appropriate | Codec implementation |
| Supported import/export option sets | C2/C4 + F1 | Format capability matrix |
| Recovery retention limits | recovery C10 + C7 actions | Storage architecture/pressure tests |
| Reserved shortcut lists | T3 capture + conflict/warning UI | Runtime/platform detection |
| Locale shipping set | Product decision; not runtime input | Release plan |

## 9. Investigate / future features

Features whose **feature existence itself** is still Future/Investigate do not block current input-method completion. When activated for implementation, they must use the closest existing primitive before any new widget type is introduced.

Examples include collaborative drawing, realtime multi-user editing, plugin/extension UI, advanced CMYK/HDR authoring, and optional semantic Region labeling.

## 10. Reopening rule

An input-method decision is reopened only if prototype/runtime evidence demonstrates a concrete usability, accessibility, reachability, precision, or performance defect.

A preference for different styling, or discovery that a numeric bound needs changing, does not by itself reopen the semantic input method.
