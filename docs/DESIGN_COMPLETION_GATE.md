# Illustro Design Completion Gate

> Status: **OPEN**
> Date: 2026-09-28
> Purpose: Architecture実装可能性と、Illustro全体の設計完了を混同しないためのGate。

## 1. Current interpretation

Architecture V1はCore基盤の実装可能性を確認した。

しかし以下は同義ではない。

- Architecture Gate PASS
- Product / Interaction / Algorithm / UI全体のDesign Complete

Production Vertical Slice 001は基礎Infrastructureとして存在するが、後続Subsystem実装はこのGateに従う。

## 2. Global principles that must be reflected

- Canvas First / Direct Manipulation
- Creation Proximity
- PiP / Detachable Workspace
- Brush Engine First
- Quick Controller / Spatial Memory
- Lineart / Region as a core differentiator
- Shared Region Resolver
- Confidence / Ambiguity
- Live Preview / Non-destructive
- Undo / History / Save / Recovery separation
- Canonical State / Cache separation
- Tile / Partial Update / Bounded Work
- Offline First
- Device-specific UI
- Existing-app research before needless reinvention
- Legacy reference as Reference Only

Canonical source: `REDESIGN_PRINCIPLES.md`.

## 3. Subsystem readiness rule

A Production subsystem may move from design to implementation only when its required decisions are complete.

Required checklist:

1. Problem statement
2. User-facing semantics
3. Interaction lifecycle
4. Data / canonical semantics
5. Undo / History boundary
6. Save / Recovery implications
7. Failure / conflict / ambiguity behavior
8. Performance hot-path contract
9. Device behavior
10. Creation-Proximity implications
11. Legacy reference comparison where applicable
12. Competitor research where it can materially improve the design
13. Acceptance criteria

UI-bearing subsystems additionally require user co-design and dedicated UI Design Skill.

## 4. Current status

### Infrastructure foundation

- Document / Sparse Raster / Revision foundation: implemented as Vertical Slice 001
- Must remain subject to design re-audit when later subsystem requirements expose missing semantics

### Not yet authorized as design-complete

- Brush Engine final algorithm contract
- Renderer production contract
- Production Persistence / Recovery integration
- Shared Region Resolver
- Lineart Region production algorithm
- Selection/Region shared semantics
- advanced Color/ICC implementation
- Wet Media
- advanced Effect/Filter system
- PiP / Detachable Workspace concrete interaction
- Quick Controller concrete interaction/form
- complete UI visual/layout design
- portable .illustro physical encoding

## 5. Implementation rule

Do not infer "次" or an Architecture PASS alone as permission to implement a subsystem whose design checklist above is still open.

When design is sufficiently complete, implementation may proceed subsystem-by-subsystem.

## 6. Completion

This Gate changes to **CLOSED / DESIGN READY** only after a fresh specification audit verifies that:

- no P0 design-critical backlog remains for the intended implementation scope
- cross-subsystem semantics are coherent
- UI-dependent decisions that affect Core contracts are identified
- user has reviewed the design state before broad Production implementation continues


## 7. Production implementation lock

Current lock state:

> **Production implementation is stopped after Vertical Slice 001. Vertical Slice 002 and later Production changes are not authorized.**

Even after a design scope satisfies this Gate, that state means **DESIGN READY FOR USER REVIEW**, not automatic implementation permission.

Production resumes only after the user explicitly authorizes the intended implementation scope.

Design documents, research, benchmarks and non-Production prototypes may continue while this lock is active, provided they do not silently adopt user-owned UI decisions.

## 8. Cross-cutting re-entry requirements

The current first-pass audit is tracked in [DESIGN_COMPLETION_AUDIT_2026-09-28.md](DESIGN_COMPLETION_AUDIT_2026-09-28.md).

Before broad Production continuation, at minimum resolve:

1. stable Entity / Transaction / Revision / runtime Block / durable Content identity taxonomy;
2. Canonical Raster pixel/alpha/precision/Tile/coordinate contract;
3. semantic Operation / Transaction / Revision contract;
4. logical Persistence / Recovery dependency-closure and acknowledgement contract;
5. UI-to-Core action boundary independent of any unapproved PiP/Quick Controller form;
6. explicit Retain / Modify / Replace disposition for Vertical Slice 001 foundations.

The intended next subsystem must additionally satisfy the Section 3 subsystem readiness rule. Brush and Region/Fill have dedicated high-coupling gates in the audit.

Physical file encoding, feature-local advanced UI and calibration constants need not all be frozen before unrelated Production work, unless they alter one of the cross-cutting contracts above.
