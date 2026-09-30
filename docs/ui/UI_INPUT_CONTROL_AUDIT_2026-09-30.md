# Illustro Input Control — UI Implementation Quality Audit

> Date: 2026-09-30  
> Skill: **UI Implementation Quality v0.3**  
> Scope: `UI_INPUT_CONTROL_STANDARD.md` + `UI_INPUT_CONTROL_ATLAS.html`  
> Production implementation: **LOCKED**  
> Result: **semantic/standalone-prototype defects repaired; full production PASS not claimed**

## 1. Audit method

The audit followed the skill's semantic pattern selection, core rules, Web platform overlay, runtime QA and regression guidance. In particular it checked task reachability, pattern semantics, accessible name/role/state/value, keyboard/focus, drag alternatives, responsive behavior, coarse-pointer targets, numeric semantics, text resizing, and truthful completion claims.

The quality engine was executed for five representative semantic classes. These metadata decisions all returned PASS while explicitly reporting that UI runtime certification is separate:

| Task | Skill decision |
|---|---|
| relative bounded numeric | `PATTERN.SLIDER` |
| precision-first numeric | `PATTERN.SPINBUTTON` |
| immediate boolean | `PATTERN.SWITCH` |
| small visible exclusive choice | `PATTERN.RADIO_GROUP` |
| large searchable selection | `PATTERN.COMBOBOX` |

## 2. Findings and repairs

| Severity | Observed defect | Skill rules / contract | Repair |
|---|---|---|---|
| **Critical** | Nonlinear Brush Size visually represented ~18 px but the original native range exposed an internal position value instead of the semantic px value. | `RANGE.02`, `A11Y.03`, `INPUT.06` | Replaced with a semantic custom slider whose exposed min/max/current/value text are actual px values; the nonlinear track coordinate is internal only. |
| **Major** | At narrow widths the category navigation disappeared, leaving only the first Atlas page reachable. | `ADAPT.01`, `ADAPT.02`, `ADAPT.06` | Narrow layout now keeps all six categories as a horizontal tab list. |
| **Major** | Segmented choices, switches, swatches and anchor cells were visually understandable but did not consistently expose the correct programmatic selection/state model. | `CHOICE.01`, `A11Y.03`, `A11Y.04`, `FOCUS.02` | Radio-group, switch, toggle-button, tab and selected-state contracts were added with roving focus where appropriate. |
| **Major** | Numerous fields / visual-only buttons lacked persistent or accessible names. The first scanner reported many repeated instances of the same root problem. | `FORM.01`, `A11Y.03` | Added labels/names for numeric inputs, swatches, anchors, search, ratio links, reorder commands and other controls. |
| **Major** | Gradient placement, Crop placement and workspace splitter sizing had drag/keyboard routes but no complete non-drag single-pointer route. | `INPUT.03`, `INPUT.05`, `INPUT.06` | Standard now specifies exact geometry fields / `Resize…` controls as non-drag pointer alternatives. Keyboard remains an additional route. |
| **Major** | Peer-page UI had visual navigation without a complete Tabs contract. | `CHOICE.01`, `FOCUS.02`, `A11Y.03` | Atlas categories and Color peer pages now explicitly use tab semantics; focus and selection are distinct. |
| **Moderate** | Original translucent focus outline was weak on the light theme. | `FOCUS.01`, `COLOR.02` | Focus outline is now solid `#756DF5`, 3 px; measured contrast ≈3.99:1 on white and ≈3.78:1 on `#F7F9FC`. |

The original scanner counted **1 critical, 117 major instances, 1 moderate**. The 117 figure is not 117 independent design problems: most were repeated missing-name occurrences across controls. After repair, the defined final static semantic scan reports **0 findings**.

## 3. Standard-level changes

`UI_INPUT_CONTROL_STANDARD.md` was tightened so the specification itself no longer permits ambiguous implementation choices:

- N2 wide-range controls expose the real semantic value to accessibility APIs, never the normalized/nonlinear track coordinate.
- C1 explicitly means radio-group semantics; C5 means switch; C6 means toggle button with a stable accessible name and pressed state.
- C8 is only the visual presentation family; underlying selection semantics are resolved by collection size/use instead of inventing a new state model.
- Color's Picker / Values / Palette / History peer pages use a Tabs contract.
- Gradient and Crop direct manipulation have exact non-drag geometry routes.
- Workspace splitter resizing has a visible `Resize…` route in addition to drag and keyboard.
- Validation/error/unavailable-state behavior and custom-control obligations are now explicit.
- Shortcut recording has an explicit capture state, Escape cancel, and conflict-resolution contract.

## 4. Exact standalone Atlas runtime verification

The repaired exact HTML bytes were loaded in Chromium and exercised, rather than judged from screenshots alone.

| Check | Result |
|---|---|
| 1440×900 / 1024×768 / 720×900 / 480×900 / 320×900 | all six pages reachable; no horizontal overflow; no JS/page errors |
| Navigation | vertical on wide layouts, horizontal tabs at ≤720 px |
| Brush Size keyboard | `18 px` → ArrowRight → `19 px`; numeric field stays synchronized |
| Tabs keyboard | Arrow navigation moves focus and active/selected page together |
| Radio keyboard | Replace → ArrowRight → Add; checked state and roving tabindex update |
| Switch | Space changes `aria-checked` |
| Reorder non-drag route | Layers moved later to `Color, Layers, Brush`; focus remains on the move command |
| Shortcut capture | Escape restores previous chord; a new `Ctrl+Shift+K` chord can be committed |
| Focus | computed outline is `#756DF5 solid 3px` |
| 320 px coarse pointer | no visible button/input/select target below 24×24 CSS px; shortcut capture is 44 px high; checkbox label targets are 44 px high |
| Synthetic text-size ×2 stress | no horizontal overflow or detected clipping at 1440 and 320 widths |

The text-size test is a browser stress approximation (doubling computed text sizes), not evidence for every OS/native text-scaling implementation.

## 5. Remaining UNVERIFIED gates

The skill does not permit a complete/PASS claim from this prototype evidence alone. The following remain UNVERIFIED until the relevant runtime exists: representative NVDA/VoiceOver/TalkBack operation; touch assistive technology for custom controls; real pen/stylus behavior; virtual-keyboard occlusion in Compact UI; native platform text scaling/zoom; production history/transaction integration; live-preview performance/latency; and final Brush Size ranges/steps/nonlinear calibration from device testing.

## 6. Audit conclusion

The **input-method semantic standard** is now internally consistent with the loaded UI Implementation Quality v0.3 rules for the audited patterns, and the **standalone Atlas defects found in this audit have been repaired and regression-tested**. This is narrower than a production UI PASS: device, assistive-technology and application-integration gates remain explicitly UNVERIFIED.