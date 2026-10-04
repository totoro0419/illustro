# Illustro 1–12 Feature Performance Resolution — 2026-10-04

> Status: **CANONICAL CROSS-FEATURE PERFORMANCE RESOLUTION**
> Applies to: integrated user-facing feature families 1–12
> Parent policies: `PRODUCT_SPEC.md`, `PERFORMANCE_POLICY.md`, `ARCHITECTURE_V2.md`
> Related: `FEATURE_SYSTEM_INTEGRATION_2026-10-04.md`, `FEATURE_DELIVERY_GATE.md`
> Goal: rich editable features without making ordinary drawing heavy

## 0. Core decision

Illustro does **not** define “non-destructive” as “keep a full-resolution duplicate for every feature, every layer, every history step, and every preview”.

Canonical rule:

> **Canonical edit state may be rich. Expensive computed state must be lazy, local, bounded, shareable, and discardable wherever correctness permits.**

Therefore:

- committed artwork/parameters/relationships are canonical;
- preview images, navigator images, filter outputs, thumbnails, Region evidence caches, decoded asset images and similar outputs are derived caches;
- derived caches may be evicted and regenerated;
- dormant features must have near-zero recurring CPU/GPU cost;
- full-document work must not be triggered by ordinary pen movement unless the operation intrinsically changes the full document and the user explicitly requested it;
- quality may be reduced only for transient preview, never silently for committed artwork.

---

# 1. Evidence from major applications

This section records **documented public behavior only**. It does not claim knowledge of unpublished internal algorithms.

## 1.1 Adobe Photoshop — workload-specific cache and history cost

Adobe documents:

- image caching is used to speed high-resolution redraw;
- cache level/tile-size choices depend on workload;
- larger cache tiles are better suited to intensive operations such as filters;
- smaller cache tiles are better suited to brush strokes/fine edits;
- history storage cost depends strongly on how many pixels an operation changes;
- full-image operations cost much more history storage than small brush edits;
- scratch storage is used when RAM pressure grows.

Source:
- https://helpx.adobe.com/jp/photoshop/using/performance-preferences.html

### Illustro lesson

Do **not** force Brush, Filter, History and large-image operations into one physical tile/cache profile.

Logical artwork tiles may remain unified while physical cache/evaluation granularity is workload-adaptive.

History budgeting must be based on changed data, not merely “number of commands”.

## 1.2 Krita — Instant Preview and memory/swap separation

Krita documents an Instant Preview mechanism that uses a smaller canvas representation for immediate feedback on very large images while the real result is calculated separately. Krita also exposes RAM/swap controls and allows Instant Preview for Transform/Move/Filters.

Sources:
- https://docs.krita.org/en/reference_manual/instant_preview.html
- https://docs.krita.org/en/reference_manual/preferences/performance_settings.html

### Illustro lesson

Heavy interactive Transform/Filter/Liquify may use a lower-cost preview representation during motion, provided:

- the semantic operation is identical;
- Apply/settle produces the exact certified result;
- preview error stays inside a validated tolerance;
- preview never becomes the canonical committed artwork.

Cold data may spill to local storage instead of consuming all RAM.

## 1.3 CLIP STUDIO PAINT — recovery is not full save; save may run in background

CLIP STUDIO PAINT documents:

- recovery information can be recorded after editing operations;
- this is explicitly not equivalent to saving the complete canvas after every operation;
- normal save can run in the background while editing continues;
- edits made after the save snapshot begins are not part of that save;
- layer cache may be used to accelerate save/export.

Sources:
- https://help.clip-studio.com/ja-jp/manual_jp/720_preferences/%E7%92%B0%E5%A2%83%E8%A8%AD%E5%AE%9A.htm
- https://help.clip-studio.com/en-us/manual_en/210_file/Information_Palette.htm

### Illustro lesson

Keep these separate:

- logical commit;
- recovery journal/protection;
- explicit/native save;
- export encoding.

Recovery should store the minimum reconstruction closure/delta required for safety, not rewrite the full project after every stroke.

Save/export should reuse valid derived layer/composite caches when correctness allows.

## 1.4 Procreate — resource-dependent layer capacity

Procreate documents that maximum layer count depends on:

- device RAM;
- canvas pixel dimensions.

Source:
- https://help.procreate.com/articles/YB7CjQ-maximum-layer-limit

### Illustro lesson

Avoid a universal arbitrary “maximum layers = N” rule.

Use capability/resource budgets and warn/limit only from measured resource conditions.

## 1.5 ibisPaint — device/canvas-dependent layer limits

ibisPaint documents that maximum layer count varies by device and that larger pixel-count canvases reduce the available layer count; additional layers also increase storage use.

Source:
- https://ibispaint.com/lecture/index.jsp?lang=ja&no=18

### Illustro lesson

Layer/resource limits are a **budget problem**, not merely a UI count problem.

Illustro should automatically adapt cache/history/background work before forcing destructive layer merges.

---

# 2. Runtime data classes

To prevent feature richness from becoming permanent cost, runtime data is classified.

## 2.1 Canonical document state — never evicted as a performance trick

Examples:

- committed Raster tile references/data;
- Vector/Text objects and edit parameters;
- layer/group tree;
- masks;
- effect/adjustment parameters;
- transform/warp parameters;
- Region identity/assignment/manual overrides;
- guide definitions;
- document color/profile identity;
- save/recovery lineage metadata.

This state defines the artwork.

## 2.2 Hot derived cache — fast, bounded, evictable

Examples:

- currently visible composited tiles;
- active brush generated resources;
- active transform preview tiles;
- currently visible filter result tiles;
- current viewport color-management LUT results;
- recent thumbnails needed by visible UI.

Eviction may cause recomputation but must not alter artwork.

## 2.3 Cold derived cache — strongly evictable

Examples:

- offscreen group composites;
- old filter materializations;
- navigator mip levels not currently needed;
- hidden/offscreen layer thumbnails;
- inactive Region evidence/spatial indexes;
- decoded reference images outside active need;
- asset preview images.

These are first targets under memory pressure.

## 2.4 Optional modules/resources — lazy

Examples:

- PSD/TIFF/EXR codecs;
- advanced filter kernels;
- Wet Media simulator;
- Region solver implementation module;
- soft-proof machinery;
- large asset packs;
- timelapse encoder.

They are loaded/compiled only when needed or during idle prewarm within a strict budget.

---

# 3. Runtime activation levels

Every heavy feature uses the same four-level lifecycle.

## Dormant

Feature is unused.

Requirements:

- near-zero recurring CPU/GPU;
- no full-resolution dedicated buffers;
- no background document scan;
- no dedicated Worker merely to remain idle when role sharing is cheaper;
- heavy module may remain unloaded.

## Document-enabled

Document contains the feature, but user is not currently interacting with it.

Requirements:

- retain lightweight canonical parameters/references;
- retain only bounded useful cache;
- no continuous whole-document recompute;
- stale derived cache is allowed and may be regenerated on demand.

## Active interactive

User is manipulating the feature.

Allowed:

- viewport/ROI priority;
- temporary proxy preview;
- active-operation scratch buffers;
- temporary GPU resources;
- higher priority while the gesture is active.

Still forbidden:

- unbounded full-document dispatch that blocks input;
- permanent duplication of every child/layer merely for preview.

## Settled / commit

After interaction settles:

- exact output is refined for visible/needed areas first;
- Apply publishes the semantic Revision;
- background refinement outside the viewport is allowed only if the published semantics already define a correct eventual result and stale areas are never presented as current without indication.

---

# 4. Global foreground priority

When resource competition occurs, order is:

1. pointer/pen intake;
2. active brush/eraser/smudge visible-tip work;
3. active Canvas navigation and current visible compositing;
4. active interactive tool preview;
5. Undo/Redo requested by user;
6. recovery protection required to meet safety SLA;
7. visible UI thumbnails/navigator;
8. user-requested analysis/Region update;
9. optional background cache/refinement;
10. export/timelapse/asset indexing maintenance.

A lower-priority task must yield, coalesce, reduce concurrency, or pause rather than causing accumulating pen latency.

---

# 5. Family 1 — Brush / Eraser / Smudge

## Risk

Advanced Brush dynamics, textures, multiple tips, stabilization, wet/particle features and asset decoding can accidentally become permanent per-sample overhead.

## Resolution

- compile a preset-specific active execution plan when preset/settings change, not per pointer sample;
- inactive dynamics are removed from the active plan rather than evaluated as no-op branches for every sample where practical;
- tip/texture assets decode/upload lazily;
- reusable GPU/CPU buffers replace object-per-dab allocation;
- visible-tip preview has strict priority over commit catch-up;
- advanced Wet/particle engines remain unloaded unless selected;
- switching brushes may prewarm only the selected/recent small set, never the entire brush library.

## Major-app lesson used

Photoshop’s documented distinction between small-tile fine editing and large-tile intensive work reinforces that Brush physical cache/update granularity must stay optimized for local edits, not filter workloads.

---

# 6. Family 2 — Fill / Coloring

## Risk

Flood/Enclose/Trace/Continuous Fill can trigger repeated whole-canvas scans or duplicate slightly different boundary analyses.

## Resolution

- all compatible Fill modes share the Region Resolver primitives;
- ordinary color flood queries use a finite query domain and tile/segment frontier rather than unconditional whole-document scan;
- existing valid Region topology is reused when applicable;
- gap handling uses local evidence around relevant boundaries;
- drag/continuous fill coalesces repeated samples and avoids solving the same unchanged Region repeatedly;
- visible preview may be provisional, but committed fill must use exact resolver semantics;
- reference composites are cached by source generation and invalidated only by affected source changes.

---

# 7. Family 3 — Selection

## Risk

Large soft selections can consume full-canvas memory even when the selected area is small.

## Resolution

- selection coverage uses sparse/tiled representation where beneficial;
- Region/Color selection freezes only the resulting coverage, not the entire Region resolver state;
- feather/expand/contract execute on affected bounds plus required kernel margin;
- named/saved selections share immutable blocks where unchanged;
- empty/default tiles are implicit and consume no full tile allocation.

---

# 8. Family 4 — Transform / Liquify

## Risk

The earlier group-level non-destructive requirement can become extremely heavy if implemented as:

- a full-resolution duplicate of the whole Group;
- full Group recomposition every pointer move;
- per-child destructive resampling;
- cumulative preview resampling.

## Resolution

### 8.1 Transform representation

The canonical operation stores **parameters/coordinate mapping**, not a duplicated transformed bitmap.

For a Group, the transform is inherited/evaluated over descendants during rendering.

No child is permanently resampled merely because the Group is transformed.

### 8.2 Group composite cache

A Group may keep an evictable derived composite/tile cache keyed by:

- child Revision generations;
- group effect/transform generation;
- relevant mask/clipping dependencies.

Only invalidated output tiles are recomputed.

### 8.3 Interactive preview

During drag:

- prioritize current viewport;
- reuse source tiles;
- use a validated lower-cost proxy/LOD when exact evaluation would miss interaction latency;
- never resample the previous preview as new source.

On settle/Apply:

- exact result is generated from canonical source + current transform parameters.

This follows the same broad public principle as Krita Instant Preview: fast transient feedback, exact underlying result.

### 8.4 Liquify

Canonical Liquify state should prefer a compact warp field/control representation over a full bitmap copy.

Evaluation:

- affected ROI + deformation influence margin;
- visible tiles first;
- same warp mapping may be inherited by Group descendants without baking each child;
- edit under an existing Group Liquify invalidates only affected transformed output tiles.

If exact Group Liquify semantics for a particular pass-through/compositing mode cannot be maintained within bounded cost, UI must mark the unsupported combination and offer an explicit alternative rather than silently flattening.

---

# 9. Family 5 — Layers / Groups / Masks

## Risk

Many layers can make:

- layer tree DOM/rendering;
- thumbnails;
- compositing;
- search/filter;
- offscreen group caches

grow without bound.

## Resolution

- virtualize Layer Page rows;
- visible rows get thumbnail priority;
- offscreen thumbnails update lazily;
- thumbnail generation is dirty-bounds/revision driven, not periodic full refresh;
- collapsed Groups do not require all child thumbnails to remain decoded;
- layer name/type/tag search uses incremental metadata index only;
- hidden Groups/layers may discard derived render caches;
- Group composite caches are bounded and evictable;
- visibility toggle recomposes only affected output dependencies.

## Capacity policy

Do not use a universal fixed layer cap as the primary design.

Procreate and ibisPaint both publicly document resource/canvas-dependent layer capacity. Illustro therefore uses measured capability/resource budgets and warns/degrades caches/background work before refusing a new layer.

---

# 10. Family 6 — Lineart Region

## Risk

Persistent Region identity and lineart-linked coloring could turn every line stroke into a topology solve.

## Resolution

Retain the existing accepted policy and strengthen it:

- source edit only records dirty bounds/generation synchronously;
- no topology solve while the pen stroke waits;
- repeated edits coalesce;
- solver starts on Region-dependent demand or bounded idle budget;
- dirty connected component/local influence area is processed instead of full document where correct;
- Region evidence/topology caches have explicit byte budget;
- inactive Region documents keep no heavy evidence cache;
- low-confidence/stale results are marked Updating/Ambiguous rather than silently reused;
- manual corrections are lightweight canonical constraints, not baked full masks.

## Memory pressure

Region derived caches are evictable. Stable identity/assignment/manual constraints remain canonical and must survive cache eviction.

---

# 11. Family 7 — Color / ICC / Reference Eyedropper

## Risk

General ICC conversion, soft proof and large reference images can add cost to every pixel and every frame.

## Resolution

- common working-space fast path;
- general profile transform/LUT only when required;
- LUT/profile transforms cached by profile pair + rendering intent/generation;
- Soft Proof does no work while disabled;
- gamut warning is generated only for visible/queried content;
- Reference images keep compressed/original source but decode only display-needed representations;
- inactive/offscreen reference decodes are evictable;
- reference eyedropper requests only the pixel/area required from the active reference representation.

---

# 12. Family 8 — Rulers / Guides / Snapping

## Risk

Too many simultaneous guides or global snapping searches can add per-sample cost to Brush.

## Resolution

- inactive guide families do no snapping work;
- active guide math uses compact analytic forms where possible;
- candidate snapping is restricted to active/nearby relevant guides;
- static guide display is a lightweight overlay separate from artwork compositing;
- smart-guide/object searches are enabled for transform/shape operations, not ordinary Brush unless explicitly requested;
- snap computation must have a bounded candidate set before entering Brush Hot Path.

---

# 13. Family 9 — Vector / Shape / Text

## Risk

Rasterizing all vectors/text at full document resolution for every zoom/pan causes unnecessary work; loading every font can inflate startup.

## Resolution

- Vector/Text stay semantic/canonical;
- raster/tessellation caches are viewport/scale dependent and evictable;
- glyph/vector cache is shared where safe;
- font resources load on demand for actually used/visible text;
- missing-font discovery must not require a blocking startup scan of every system font;
- invisible/offscreen vector objects need no full-resolution raster cache;
- Region boundary extraction from Vector reuses vector geometry directly rather than first rasterizing the whole layer when possible.

---

# 14. Family 10 — Adjustments / Filters / Retouch

## Risk

A stack of non-destructive effects can cause every visible frame to recursively recompute the complete document.

## Resolution

### 14.1 Tile/dependency cache

Each effect result is keyed by:

- source generation;
- parameter generation;
- mask generation;
- affected tile/ROI.

Unchanged effect tiles are reused.

### 14.2 Workload-specific physical evaluation

The logical document tile model does not require every filter kernel to use the same physical chunk size.

Following the documented Photoshop lesson:

- local Brush/fine edit paths may use small update regions;
- large convolution/filter work may batch larger physical regions when benchmarked faster.

### 14.3 Preview LOD

During slider/handle motion, expensive filters may use a lower-cost viewport proxy similar in principle to Krita Instant Preview.

Requirements:

- exact algorithm semantics remain the target;
- preview quality tolerance is tested;
- settle/apply refines exact visible output;
- committed result is never the low-quality proxy.

### 14.4 Hidden/inactive effects

- disabled effect = no evaluation;
- hidden Group/layer effect output cache may be evicted;
- offscreen exact refinement is lower priority than active drawing;
- filter modules/shaders compile lazily.

### 14.5 Explicit Bake

Bake remains an optional performance escape hatch, but never the automatic answer to slow non-destructive stacks.

---

# 15. Family 11 — Canvas / View / Navigator / Reference

## Risk

Navigator, whole-art preview, reference windows and multi-view can accidentally duplicate full-resolution canvases.

## Resolution

### Navigator / whole-art preview

- uses a mip/downsample representation, never an independent full-resolution duplicate;
- updates from dirty visible/composited tiles;
- refresh is throttled/coalesced during rapid drawing;
- exact full-resolution data remains the main Document, not the Navigator.

### Multi-view

Multiple views share one Document and underlying caches. Each view may keep only:

- view transform;
- viewport-specific visible tile set;
- small display caches.

It must not duplicate canonical artwork.

### Reference images

- lazy decode;
- display-resolution mip/tiles;
- original compressed/source data retained for fidelity;
- hidden references may release decoded memory.

### Hidden/background behavior

On mobile/background:

- pause Navigator/reference refresh;
- pause nonessential preview refinement;
- keep recovery protection priority.

---

# 16. Family 12 — History / Save / Recovery / Import / Export

## Risk

Deep Undo + snapshots + autosave + timelapse + recovery can multiply the same artwork data many times.

## Resolution

### 16.1 History representation

Do not store a full-document bitmap for every command.

Prefer:

- immutable Revision roots;
- structural sharing;
- changed tile/block references;
- compact command metadata where useful;
- hot recent history in RAM;
- cold history spill to local working storage.

History budget is based on **changed bytes/tiles and reconstruction cost**, not just command count.

This follows the documented Photoshop observation that history cost grows with changed pixel area.

### 16.2 Snapshot / Checkpoint

A pinned Snapshot stores a Revision/root reference and protects the blocks needed by that Revision.

It does not immediately duplicate every unchanged tile.

Copy-on-write/shared immutable blocks remain shared until changed.

### 16.3 Recovery

Following the CLIP STUDIO distinction:

- per-operation recovery protection is not a full project save;
- record only the journal/delta/dependency closure required to reconstruct protected state;
- batch writes within the Recovery SLA;
- never sync-flush the entire document per stroke.

### 16.4 Native Save

- fixed Revision snapshot;
- background encode/write;
- only dirty/new blocks need new storage when native format supports incremental generations;
- edits after snapshot continue into a newer Revision;
- last successful generation remains intact until the new generation is verified/published.

### 16.5 Export

- reuse valid layer/composite caches where correctness allows;
- heavy codec is lazy-loaded;
- export runs lower priority than current drawing;
- export from fixed Revision so continued drawing does not force restart.

### 16.6 Timelapse

Do not capture a full video frame on every input event.

Prefer semantic/history-based reconstruction and encode on demand/background.

Encoding module stays unloaded while timelapse export is unused.

---

# 17. Asset / preset system

Although Assets span multiple families, they are a major hidden performance risk.

## Resolution

- startup loads asset metadata/index, not every asset bitmap/texture;
- thumbnail decode/generation is viewport-demand driven;
- Brush Tip/Texture full resources load only for selected/prewarmed brushes;
- search indexes metadata incrementally;
- asset import/index maintenance is low-priority and pausable;
- unused asset GPU textures are evictable;
- “recent/favorite” may stay hot because it is small and high value.

---

# 18. UI / PiP / detached panels

## Risk

Detaching Color/Brush/Reference/Navigator/Layers could accidentally instantiate duplicate expensive models or previews.

## Resolution

- detached Box is another view of the **same semantic state/model**, never a duplicated document subsystem;
- collapsed/covered Box stops expensive live preview work;
- offscreen lists remain virtualized;
- detached Navigator/Reference follows the same mip/lazy-decode policy;
- opening a Box may lazy-load its heavy editor module, but the UI shell/discovery metadata remains lightweight.

---

# 19. Memory-pressure degradation order

When memory pressure is detected or predicted, Illustro degrades in this order:

1. stop/pause optional background work;
2. reduce background Worker concurrency;
3. evict inactive asset/reference decoded resources;
4. evict offscreen thumbnails/Navigator/preview caches;
5. evict cold effect/group composite caches;
6. evict Region derived caches not actively required;
7. spill cold Undo/History to local working storage;
8. reduce transient preview resolution/quality within certified tolerance;
9. unload dormant optional modules/resources;
10. warn the user before safety margins are exhausted.

Never sacrifice as a silent performance optimization:

- current committed artwork;
- Last Good Save;
- required Recovery protection;
- canonical layer/group structure;
- Region manual corrections/identity metadata;
- current active operation state needed for exact Apply/Cancel.

---

# 20. Storage-pressure degradation order

When local storage becomes constrained:

1. delete evictable derived caches;
2. trim regenerable asset thumbnails;
3. trim non-pinned cold history according to user/history policy;
4. preserve pinned Snapshots and Last Good Save;
5. reduce future optional timelapse/cache growth;
6. warn before Recovery SLA can no longer be met.

No current artwork is deleted automatically.

---

# 21. Automatic capability profile

Major apps expose different resource policies: Procreate/ibisPaint adapt limits to device/canvas resources; Photoshop/Krita also expose explicit performance controls.

Illustro default policy:

> **automatic first, expert override second.**

Automatic profile uses measured runtime behavior and capability hints to choose:

- cache byte budgets;
- Worker concurrency;
- preview LOD;
- background refinement cadence;
- prewarm amount;
- cold-history spill thresholds.

Device class (PC/tablet/phone) is not itself a performance guarantee.

Advanced settings may expose:

- performance mode;
- cache/history budget preference;
- high-quality preview override;
- diagnostic counters.

The normal user should not need to tune tile sizes or Worker counts.

---

# 22. Performance acceptance additions

A feature cannot pass F5 in `FEATURE_DELIVERY_GATE.md` without a completed Cost Contract and measurements appropriate to the feature.

Minimum evidence:

- inactive recurring CPU/GPU cost;
- startup/module load cost;
- peak and steady memory;
- bytes copied across major boundaries;
- invalidated area per representative operation;
- background work under active drawing;
- worst interactive frame;
- pen-to-visible-tip regression when feature exists but is inactive;
- behavior under memory/storage pressure.

## Regression rule

Adding a feature is a regression failure if, while the feature is unused, it measurably and materially worsens the accepted Brush Foundation latency/large-brush behavior beyond the certified tolerance.

---

# 23. Resolved high-risk points

| Risk | Resolution |
|---|---|
| Group Transform duplicates every child | inherited semantic transform + derived tile caches |
| Group Liquify full recomposite every sample | compact warp mapping + ROI/viewport cache + LOD preview |
| Region solves every line stroke | dirty generation only; demand/idle incremental solve |
| Filter stack recomputes whole document | dependency/tile cache + viewport demand + preview LOD |
| Deep Undo fills RAM | structural sharing + changed blocks + cold storage spill |
| Snapshot duplicates whole project | pinned Revision/root + shared immutable blocks |
| Autosave rewrites whole project per stroke | recovery journal/bounded batch + incremental save generations |
| Navigator duplicates full canvas | mip/downsample derived view |
| Reference images all fully decoded | lazy decode + mip/viewport representations |
| Hundreds of layer thumbnails update every stroke | row virtualization + dirty/visible thumbnail priority |
| Asset library loads all resources | metadata-first + lazy resource decode/upload |
| ICC/Soft Proof affects every frame | fast common profile path; proof only while enabled |
| Vector/Text full raster cache at every zoom | viewport/scale derived cache |
| Multiple PiPs duplicate state | multiple views, one semantic model |
| Fixed global layer cap | resource/capability budget with automatic degradation/warning |

---

# 24. What remains unverified

This document resolves **architecture/specification risk**, not measured performance.

The following still require implementation benchmark/real-device evidence:

- exact cache byte budgets;
- exact preview LOD ratios;
- exact Worker concurrency;
- Group Liquify kernel/warp representation;
- filter chunk sizes;
- history spill thresholds;
- Region background cadence;
- mobile storage write cadence;
- browser-specific memory-pressure detection reliability;
- exact maximum practical layers/canvas sizes.

No numeric guarantee is created until measured on target devices.
