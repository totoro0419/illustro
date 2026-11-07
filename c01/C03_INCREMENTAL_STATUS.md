# C03 incremental implementation — evidence boundary

Base: PR #12 HEAD `29cafab8a7c8a5c2823b789138bf78858ac8d787`.

This commit adds:
- NDE-001 reference nonseparable kernels and fixes W3C burn/dodge boundaries; dissolve and production raster integration remain pending.
- NDE-002 Blend If scalar memberships, channel/space selectors, histogram and tests; product compositor/UI pending.
- SAV-007 service worker installed by the build output, caching the full app shell only after first successful online install, with cache-generation invalidation and offline-fallback GET reads.
- Independent C03 alpha Pages build route, preserving C01 and C02 by assembling each from its own source branch.

**NOT DONE:** Full 24-feature integration, advanced layer/history UI, masks/groups, auto recovery, fail-injection, comprehensive golden tests, C02-vs-C03 latency measurements and user real-device approval. Passing pure-function tests does not satisfy these acceptance gates. This is an in-progress Draft PR, not an approved release.

### 2026-11-07 actual raster-alpha integration
- `c01/app/raster-layers.mjs`: isolated worker-owned raster surfaces; accepted strokes routed to frozen layer ID/lifetime.
- UI: Raster add/select, visibility and opacity; changes become artwork Undo transactions.
- Worker: composite dirty tiles with Canvas2D Normal/Multiply/Screen; Native v3 save/read supports multiple Raster layers.
- C03 browser E2E added to Pages CI to require drawing on the new layer, hide/show, Undo, v3 separated pixel payload, reload.
- Current production compositing is Canvas2D and not verified against numeric goldens; other blends remain disabled. Snapshot, branching, mask, offline edits and auto-recovery are not product-integrated.

### 2026-11-07 metadata and Solo pass
- UI metadata actions: rename, color tag, name filter, 3 lock flags, Normal/Multiply/Screen selection; document Undo stores metadata changes; Native v3 preserves properties.
- Solo uses a separate worker presentation override, not normal visibility, not document history, and never writes the temporary state to Native.
- Full all-mode blend and grouped/masked compositing, advanced filtering, position edits and visual lock refusal remain incomplete.

### 2026-11-07 offline runtime verification
- Built C03 service worker cache maps the scoped index route `/c03/` to cached `/c03/index.html`, avoiding offline root-navigation failures.
- A browser E2E on the built production shell validates first online install, SW activation, offline reload, layer creation, offline drawing and absence of Worker errors.
- Untested: storage eviction/quota recovery, cache corruption, simultaneous clients, offline persistence across process restarts.
