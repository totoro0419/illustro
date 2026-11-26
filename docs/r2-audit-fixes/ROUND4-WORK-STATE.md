# Round 4 work state

Base: Round 3 head `5428c9d1c4074ea929981d25baa4b73507918191` (only documentation differs from verified `193e87dc3243b5a5a73b764aadd53ecf91e102b0`).

- SEL-001: numeric rectangle now uses the same applyShape path as pointer selections. Code committed; full-mask combination tests via browser prepared.
- BRU-011: versioned portable brush snapshot, per-work local restoration, custom preset/resource preservation, save-start snapshot and temporary eraser handling. Code committed; codec and native round-trip tests prepared.
- LIN-006: automatic/likely/confirmation review, cropped worker neighborhood, rejection/acceptance recording and gap validation range consistency. Automatic repair algorithm unchanged. Original fixture tests and browser scenario prepared.

## Verification state
No test result is marked PASS at this checkpoint. The Round 4 workflow builds, runs related Vitest tests, checks types, runs browser scenarios on the exact build, then publishes only the isolated Round 4 folder and checks the served commit and browser operations. See Actions for actual outcomes. Original reported failures are recorded in the Round 2 audit CSV; independent full pre-fix reproduction remains unverified. Drag/numeric parity, custom-material actual stroke comparison, detailed save/reload boundary pixel checks, large-canvas performance and physical input remain open until evidence is available. D-008 browser regression coverage remains open.

## Resume
Inspect Round 4 workflow jobs/logs, fix any failures, extend missing acceptance tests, rerun affected checks and verify release.json against the tested commit. Do not merge or modify other branches. Completion requires actual passing evidence, not just committed code.
