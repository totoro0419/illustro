# Round 4 work state

Base: Round 3 head `5428c9d1c4074ea929981d25baa4b73507918191` (only documentation differs from verified `193e87dc3243b5a5a73b764aadd53ecf91e102b0`).

- SEL-001: numeric rectangle now uses the same applyShape path as pointer selections. Code committed; full-mask combination tests via browser prepared.
- BRU-011: versioned portable brush snapshot, per-work local restoration, custom preset/resource preservation, save-start snapshot and temporary eraser handling. Code committed; codec and native round-trip tests prepared.
- LIN-006: automatic/likely/confirmation review, cropped worker neighborhood, rejection/acceptance recording and gap validation range consistency. Automatic repair algorithm unchanged. Original fixture tests and browser scenario prepared.

## Verification state
Verified code commit `8315cf8d3705bda5db651b0191a38ab60c424584` in [Actions run 45809858057](https://github.com/totoro0419/illustro/actions/runs/45809858057): 106 test files, 435/435 tests passed, editor typecheck and isolated production build passed. Original line-art fixture test passed. Prepublish browser: BRU-011 passed native brush state, duplicate, fresh-context restore and subsequent stroke/resave; D-007 and D-028 regression passed. SEL-001 runner terminated with exit 143 before a conclusive result. LIN-006 timed out opening the image before reaching candidate operations. Publish and postpublish tests were skipped. Fixed browser import warning handling and added per-mode logging in `8197649c3a44b6a31e94d7ec3dea74993a13f733`; rerun triggered by push. Final results remain unverified. The workflow gates deployment on all prepublish checks. Draft PR #118, no merge. Original reported failures are recorded in the Round 2 audit CSV; independent full pre-fix reproduction remains unverified. Drag/numeric parity, custom-material actual stroke comparison, detailed save/reload boundary pixel checks, large-canvas performance and physical input remain open until evidence is available. D-008 browser regression coverage remains open.

## Resume
Inspect Round 4 workflow jobs/logs, fix any failures, extend missing acceptance tests, rerun affected checks and verify release.json against the tested commit. Do not merge or modify other branches. Completion requires actual passing evidence, not just committed code.
