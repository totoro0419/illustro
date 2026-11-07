# C03 incremental implementation — evidence boundary

Base: PR #12 HEAD `29cafab8a7c8a5c2823b789138bf78858ac8d787`.

This commit adds:
- NDE-001 reference nonseparable kernels and fixes W3C burn/dodge boundaries; dissolve and production raster integration remain pending.
- NDE-002 Blend If scalar memberships, channel/space selectors, histogram and tests; product compositor/UI pending.
- SAV-007 service worker installed by the build output, caching the full app shell only after first successful online install, with cache-generation invalidation and offline-fallback GET reads.
- Independent C03 alpha Pages build route, preserving C01 and C02 by assembling each from its own source branch.

**NOT DONE:** 24 feature product integration, C03-layered worker composition, user-facing layer/history/save controls, Native v3 product round-trip, fail-injection, C02 vs C03 input-to-display measurements and user real-device approval. Passing pure-function tests does not satisfy these acceptance gates. This is an in-progress Draft PR, not an approved release.
