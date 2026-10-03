# Validation state

Accepted baseline: user-confirmed lightness/tracking, as stated in this request. No device or physical latency number was supplied. Preserve the previous branch/HTML/source for comparison.

Local Node run: 62 tests pass (42 legacy regression + 20 new Foundation tests). Covers seven brushes, deterministic replay, pressure curves, causal finish invariance, 200 taps/short strokes, absolute spacing, particles/random/texture, version/resource validation, conservative prediction, known geometry, strong stabilization and temporary settings. This is not a visual/performance certification.

GPU/visual/performance results: first run 37095147652 failed cumulative proxy gates; see FAILURE_ANALYSIS.md. The corrected source is awaiting a fresh run. New tests compare actual GPU viewport during input, after lift, after confirmation and CPU reference, for all seven brushes at 4/16/128/512/1024. Erase tests include real colored underpaint. Additional material tests exercise masks, image texture/filtering, scatter, variable color/opacity and phase envelopes. Each case checks undo/redo/save/load equality. Existing 56-preset and sustained tests are rerun, not copied as proof.

Human checks: compare the accepted baseline and new page on the same device. Test G-pen/round pen with weak→strong→weak pressure, small circles, S curves, reversal, taps and 2–5px strokes. Test marker/hard/soft erase at 512/1024 for at least 4 seconds. Try prediction off/on and weak/strong correction. Watch for later extension, thinning, texture appearance, tip jump or visible replacement. Use the page's Japanese checklist and export observations/results.

UNVERIFIED: new real-pen pressure/entry/exit feel, natural prediction misses, screen-level visibility of transitions, real-GPU performance regression, high-DPI/compositor latency, optional tilt/azimuth/twist hardware, device-loss recovery, temporary VRAM pressure with many unconfirmed strokes. New quality is not declared complete merely because code exists.

Pre-handoff review fixes: prevent double multiplication of solid marker opacity at final commit; select material accumulation for build-up/limited flow; shortest-arc stylus rotation; normalized material tail composites over its prefix; reject invalid browser prediction coordinates; retain release metadata without depositing paint. The final run must execute these source fixes.
