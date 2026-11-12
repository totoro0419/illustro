> Classification: EXPERIMENTAL / historical research and validation. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Evidence index — device acceptance candidate

This directory keeps machine-validation evidence. The candidate freeze does not add new benchmarks or repeat tests just to obtain PASS.

## Current acceptance evidence

- `run-37131153403-webgpu-full-audit.json` — latest WebGPU full run audit; full workload PASS.
- `run-37131153403-webgl2-full-audit.json` — latest WebGL2 full run audit; full workload PASS.
- `run-37131153403-webgpu-targeted-audit.json` — WebGPU repeated targeted checks; 18/18 PASS.
- `run-37131153403-webgl2-targeted-audit.json` — WebGL2 repeated targeted checks; 17/18 PASS and retains the first pencil 512px / 240Hz +32.33ms total-growth FAIL.
- `local-paired-webgl2-latest.json` — local alternating comparison; the CI pencil failure did not reproduce.
- `g-pen-tap-before-after.json` — retained evidence for the corrected invisible small G-pen tap.
- `node-tap-default.txt` / `local-tap-default-webgpu.json` / `local-tap-default-webgl2.json` — visibility and contract checks for the current G-pen default.

Historical failures and older runs remain in this directory and are intentionally not deleted.

## Status boundary

Machine evidence is sufficient to move to user device acceptance. It does **not** establish physical pen-to-screen latency, natural pressure/entry/exit, invisible preview-to-final switching, or actual-device behavior. Those remain UNVERIFIED until the user performs the checks in `../HUMAN_CHECKS.md`.
