# Illustro UI Theme Candidates — 2026-09-30

> Status: **CANDIDATE / USER VISUAL REVIEW PENDING**
> Scope: UI Gate E visual-theme exploration, Expanded 1440×900 baseline
> Production implementation: **LOCKED**
> Canonical theme selection: **NOT DECIDED**
>
> The six themes preserve the same approved PC composition, control positions, component sizes, Box order, navigation semantics, state semantics, and Quick Controller geometry. This document records candidate visual tokens only.

## 1. Theme order

1. Aurora
2. Halo
3. Bloom
4. Cosmo
5. Simple
6. Mono

Mono remains last by product decision.

## 2. Shared semantic token model

Each candidate supplies the same semantic roles:

- `app-bg`
- `surround`
- `surface`
- `surface-2`
- `surface-3`
- `border`
- `border-strong`
- `text`
- `muted`
- `faint`
- `accent`
- `accent-2`
- `accent-3`
- `accent-ink`
- `accent-soft`
- `focus`
- `indicator`
- `brand`
- `ring`
- `ring-glow`

The prototype intentionally does **not** change layout or interaction semantics per theme.

## 3. Candidate directions and key tokens

| Theme | Background / surround | Surface | Text / muted | Accent family | Distinguishing expression |
|---|---|---|---|---|---|
| **Aurora** | `#F5F8FC` / `#E9EFF6` | `#FFFFFF` | `#1E2633` / `#657184` | `#5CA8FF`, `#8C83FF`, `#D986D9`; support `#62D4BF`, `#FFB06F` | Blue→violet→pink appears only in semantic indicators, branding and Quick Controller ring. Ordinary surfaces remain white/light-neutral. |
| **Halo** | `#F7FBFD` / `#ECF4F8` | `#FFFFFF` | `#1D2A33` / `#647684` | `#6CCBFF`, `#8CA7FF`, `#C8B6FF` | Narrower cyan/blue/violet range, pale luminous borders and a soft ring halo. No warm secondary hue. |
| **Bloom** | `#FFF8FB` / `#F6EEF4` | `#FFFFFF` | `#2B2530` / `#776778` | `#F29BCB`, `#B19CFF`, `#FFBE8A` | Warm blush surround, pink/lavender/apricot semantic highlights; restrained enough to avoid a toy-like feel. |
| **Cosmo** | `#F4F6FB` / `#E8ECF5` | `#FBFCFF` | `#1B2332` / `#5F6A80` | `#4D7CFF`, `#6D63E6`, `#7E8AA8` | Cooler, sharper indigo hierarchy and deeper border/shadow contrast while remaining a light theme. |
| **Simple** | `#F7F9FC` / `#EEF3F8` | `#FFFFFF` | `#1F2732` / `#697585` | primarily `#6FA8FF` | Minimal ornament. Selected/focus/slider states use one blue family; surfaces carry most hierarchy. |
| **Mono** | `#F7F8F9` / `#ECEFF2` | `#FFFFFF` | `#1F252C` / `#68717B` | charcoal `#343B43` | State is communicated with contrast, borders, inset bars and geometry rather than hue. No chromatic UI accent. |

## 4. Shared Expanded baseline preserved

The comparison prototype keeps:

- viewport: **1440×900**;
- Left Pinned Rail: Brush, Eraser, Smudge / Blend, Eyedropper, Smart Fill, Selection, Transform, Move, fixed All Features;
- Right Workspace width: **344px**;
- Right Box order: Layers / Color / Brush / Inspector / Reference / Assets / Effects / Navigator / History / Automation / Document / Workspace;
- default expanded Boxes: Layers / Color / Brush;
- fixed bottom strip: Layer Page / Undo / Redo / Horizontal Flip / Vertical Flip;
- Brush Context Surface near Canvas;
- Quick Controller review geometry: 112×112 footprint, 100px ring outer diameter, 44px center hole, 28px buttons, 36px center radius, flat-top six-point regular hexagon.

## 5. Accessibility / state policy in the prototype

- Selected tool/layer states use a structural inset marker/border in addition to hue.
- Focus uses an explicit 3px focus outline.
- Base text and muted text were checked against the primary surface; the candidate token pairs used in this prototype are at or above a 4.5:1 contrast ratio for those foreground/background pairs.
- The comparison does not claim full WCAG conformance; runtime keyboard, zoom/text-scale and assistive-technology behavior remain outside this theme-only artifact.

## 6. Verification performed on the candidate HTML

Automated browser verification was run at **1440×900** after direct authoring.

Verified:

- all six themes render at exactly 1440×900;
- document viewport has no horizontal or vertical overflow (`scrollWidth=1440`, `scrollHeight=900`);
- 12 Right Boxes exist and match the required order;
- Layers / Color / Brush are the only expanded default Boxes;
- eight default Left tools + fixed All Features are present in the required order;
- the five fixed bottom commands are present;
- Right Workspace measured width is 344px;
- Context Surface and Quick Controller remain inside the Canvas workspace;
- Quick Controller centers form the accepted radius-36 flat-top regular hexagon;
- every 28px button is fully inside the 100px outer ring and outside the 44px center hole;
- theme switching changes the theme state successfully;
- verification run recorded **0 JavaScript runtime exceptions**.

The earlier prototype initially exposed a sub-pixel Quick Controller error: diagonal button centers were rounded to approximately 35.85px radius, allowing about 0.15px intrusion into the center-hole boundary. The candidate was corrected to fractional Y offsets so all six centers resolve to the intended 36px radius.

## 7. Rendering method

The Superdesign CLI preflight timed out in the available shell. Per the Superdesign skill's direct-authoring fallback, the comparison was authored as literal standalone HTML using the existing Gate E specifications as context, then rendered and runtime-checked through Chromium DevTools Protocol.

This fallback does not make the themes canonical.

## 8. Review status

**User visual decision required.**

Review in plain terms:

- Is any theme too bright or too dull?
- Does any theme's color feel noisy?
- Does the UI attract more attention than the artwork?
- Does Aurora actually feel like an aurora without using too much gradient?
- Do Aurora and Halo feel clearly different?
- Do all six look different enough while still feeling like the same Illustro app?
- Does any theme look tiring for long drawing sessions?
- Does Mono still make selected/current states obvious without color?

No candidate is canonical until the user explicitly approves it.