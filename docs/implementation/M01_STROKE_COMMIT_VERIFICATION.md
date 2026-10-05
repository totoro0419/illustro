# M01 Stroke Commit — Verification

> Milestone: M01「一筆を選択Layerへ正式確定」
> Status: USER REVIEW REQUIRED
> Fixed QA URL: https://totoro0419.github.io/illustro/qa/m01/
> Public QA build source commit: `5e79cfd32c6c8cb99543d1c68e2b7e0f92e50a96`

## Verified facts

### Repository / branch

- Work branch: `milestone/M01-stroke-commit`
- Draft PR: #13
- Base branch: `integration/production-prep-2026-10-05`
- The base branch moved during M01 by three documentation-only commits.
- Their changes were inspected first, then synchronized into M01 and recorded as an ancestry merge.
- After reconciliation, M01 is not behind the current base.

### Brush Foundation

- No file under `packages/brush-rt/**` is changed by PR #13.
- The frozen Brush runtime is built before focused regression tests.
- Focused Brush Foundation regression passed in M01 CI.
- M01 does not change Renderer/Input/smoothing/shaders/realtime GPU scheduling.

### Core / adapter automated verification

M01 Stroke Commit workflow run `37301377488` passed on the implementation candidate after the latest Editor/Core changes.

Verified in CI:

- `npm run core:check`: 9 test files / 15 tests passed.
- `npm run prep:check`: PASS.
- M01 stroke adapter tests: 1 file / 5 tests passed.
- focused frozen Brush Foundation regression: PASS.
- `npm run editor:build`: PASS.
- local browser integration:
  - WebGL2: PASS
  - WebGPU: PASS
  - no formal commit before pointer-up
  - exactly one formal commit per completed stroke
  - first stroke remains after the second
  - canonical 256px tile-boundary stroke touches multiple dirty tiles
  - pointercancel does not become artwork
  - console errors: none

### Public GitHub Pages QA verification

Publish/verify workflow run `37301950385` passed.

The workflow:

1. checked out the existing `gh-pages` branch;
2. preserved all existing published content;
3. replaced only `qa/m01/**`;
4. pushed only the M01 QA files;
5. waited until the fixed public URL returned HTTP 200 with the Illustro page;
6. opened the actual public URL with Chromium;
7. tested both WebGL2 and WebGPU on the public page.

Public-page browser result:

- URL: `https://totoro0419.github.io/illustro/qa/m01/`
- WebGL2: PASS, 2 formal committed strokes, console errors 0
- WebGPU: PASS, 2 formal committed strokes, console errors 0

The `gh-pages` publishing commit `9c4c05ac526771cda2b6c2dd3140e25f122ac701` changed only:

- `qa/m01/index.html`
- `qa/m01/assets/index-*.js`
- `qa/m01/assets/index-*.css`
- `qa/m01/assets/canonical.worker-*.js`
- `qa/m01/assets/rt-*.js`

No earlier QA path or existing Brush/P0 page was deleted or overwritten by that commit.

## M01 behavior verified structurally

- final Brush `StrokeRecord` is committed only after pen-up;
- target Document/Layer/Surface/base Revision are captured and revalidated;
- one completed stroke is one Core Transaction and one Revision;
- stale target is rejected;
- locked Raster Layer is rejected;
- predicted canonical input is rejected;
- pointercancel does not create a formal Revision;
- only touched canonical 256px logical tiles receive mutation references;
- no whole-Canvas readback is used by the M01 commit path;
- no full-Layer copy or full-Document serialization is introduced per stroke;
- semantic brush operation remains authority; visible framebuffer is not promoted as artwork authority;
- direct strict-byte Core edits retain ownership/immutable publication behavior;
- WriterEpoch/CommitSequence persistence ordering boundary is present without implementing product Save/Recovery.

## Scope not implemented

M02 and later work remains intentionally unimplemented:

- Layer add/select product UI;
- product Undo/Redo UI;
- Eraser milestone completion;
- Save / Recovery / Reload / PNG Export;
- Selection / Transform / Fill / Region / Effects / Liquify;
- final Color/Brush/Layer UI;
- Quick Controller / Compact / final Motion/Aurora polish.

## Human verification still required

Automated browser checks cannot certify physical pen feel, perceived continuity at pen-up, or whether the previously accepted low-latency feel remains acceptable on the user's actual device.

Therefore M01 is **not ✅**.

Current handoff state: **👤 ユーザー実機確認待ち / USER REVIEW REQUIRED**.
