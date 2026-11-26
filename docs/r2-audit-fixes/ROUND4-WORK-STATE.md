# Round 4 work state

Base: Round 3 head `5428c9d1c4074ea929981d25baa4b73507918191` (only documentation differs from verified `193e87dc3243b5a5a73b764aadd53ecf91e102b0`).

- SEL-001: numeric rectangle now uses the same applyShape path as pointer selections. Code committed; full-mask combination tests via browser prepared.
- BRU-011: versioned portable brush snapshot, per-work local restoration, custom preset/resource preservation, save-start snapshot and temporary eraser handling. Code committed; codec and native round-trip tests prepared.
- LIN-006: automatic/likely/confirmation review, cropped worker neighborhood, rejection/acceptance recording and gap validation range consistency. Automatic repair algorithm unchanged. Original fixture tests and browser scenario prepared.

## Verification state
Verified code commit `8315cf8d3705bda5db651b0191a38ab60c424584` in [Actions run 45809858057](https://github.com/totoro0419/illustro/actions/runs/45809858057): 106 test files, 435/435 tests passed, editor typecheck and isolated production build passed. Original line-art fixture test passed. Prepublish browser: BRU-011 passed native brush state, duplicate, fresh-context restore and subsequent stroke/resave; D-007 and D-028 regression passed. SEL-001 runner terminated with exit 143 before a conclusive result. LIN-006 timed out opening the image before reaching candidate operations. Publish and postpublish tests were skipped. Fixed browser import warning handling and added per-mode logging in `8197649c3a44b6a31e94d7ec3dea74993a13f733`; rerun triggered by push. Final results remain unverified. The workflow gates deployment on all prepublish checks. Draft PR #118, no merge. Original reported failures are recorded in the Round 2 audit CSV; independent full pre-fix reproduction remains unverified. Drag/numeric parity, custom-material actual stroke comparison, detailed save/reload boundary pixel checks, large-canvas performance and physical input remain open until evidence is available. D-008 browser regression coverage remains open.

## Resume
Inspect Round 4 workflow jobs/logs, fix any failures, extend missing acceptance tests, rerun affected checks and verify release.json against the tested commit. Do not merge or modify other branches. Completion requires actual passing evidence, not just committed code.

## Latest checkpoint
- Code/build release: `60bb340807fc9682dcf77b83b663ffb421ae7888`.
- [Actions run 45811929102](https://github.com/totoro0419/illustro/actions/runs/45811929102): 435/435 tests, typecheck and build passed; all six prepublish browser jobs passed (SEL-001, BRU-011, LIN-006, D-007, D-008, D-028). Numeric selection checked full persisted mask for five modes, undo/redo and invalid/cancel, and portable mask. BRU native duplicate/fresh-context restore and subsequent stroke passed. LIN original fixture two gaps and rejection/save passed.
- Prior stopped queue retired; new concurrency group executed without allowing the obsolete pending run to publish. Selection verification optimized by direct persisted pixel read and one native export rather than repeated whole-work saves.
- gh-pages commit `2aaebb2a0e33dd791535e48b0a592adfc4bc41ce`: independently checked all 52 changed files reside only in r2-audit-fixes-round4/. release.json in branch matches tested source. Actual served release check and postpublish browser results pending at this checkpoint.
- Remaining acceptance coverage: pointer/numeric parity and edge cases; custom-brush actual stroke pixel equivalence and broader brush configuration/work-switch checks; complete line boundary/paint pixel and reload comparison, large-canvas performance and physical inputs. Do not claim all acceptance criteria passed.

## Publication and postpublish results
- Run 45811929102: publication succeeded; the actual served release.json and index.html matched source `60bb340807fc9682dcf77b83b663ffb421ae7888`. All three postpublish browser jobs completed successfully (SEL-001, BRU-011, LIN-006).
- Public preview: https://totoro0419.github.io/illustro/r2-audit-fixes-round4/
- Draft PR: https://github.com/totoro0419/illustro/pull/118 (not merged).
- Implemented browser scenarios and regressions are green; additional acceptance coverage identified above is not verified. No physical device test claimed.
