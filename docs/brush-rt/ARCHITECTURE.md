# New realtime engine decision

Status: implementation candidate; production promotion requires device gates.

| Approach | Latency / wide brush | Complex brushes / quality | GPU / memory | Difficulty / browsers / 4K / extension |
|---|---|---|---|---|
| A All GPU stamps | Handles CPU pixels but overdraw and command backlog remain | Strong preset fidelity | Large overlapping footprints; sparse tiles help memory | Moderate; WebGPU + WebGL2; 4K still needs bounded work |
| B Capsules + stamps | Constant primitive count for smooth solid feedback | Capsules only for compatible settings; stamps retain textures | Lower solid overdraw; per-tile stroke state | More code; both APIs; tiled storage extends to 4K |
| C Lower resolution preview | Can bound fill cost for huge tips | Grain/AA changes can be visible at replacement | Smaller viewport texture; final stays full resolution | Moderate; use only explicit/adaptive preview quality; requires visual gates |
| D Prediction + confirmed | Covers input/stabilization delay; alone cannot fix GPU backlog | Direction reversal can overshoot | Small provisional tail; separate input record | Moderate; browser prediction optional, guarded fallback |

Selected: B + D + bounded viewport preview (C capability), **not A alone**.

Input keeps real sensors and timestamps. Only one physical movement stream is selected. Main-thread preview smoothing is O(local samples), with no pixel loops. Real samples go to a worker which produces deterministic canonical geometry/commands. Prediction is ephemeral and never sent to that worker.

Canonical stroke version 2 stores raw samples, stabilized geometry, full preset, Philox seed, smoothing version and commands. History is a stroke journal. Old v1 presets remain untouched. New v2 command semantics are explicit; no silent reuse of the v1 reconstruction identifier.

A latest-state mailbox has capacity one. If multiple revisions arrive while a GPU batch is in flight, only the newest snapshot is submitted next. At most one GPU submission is in flight. Each submission renders the newest live snapshot first, then 1–8 confirmed tile chunks, adapted from the prior GPU completion time. Work already submitted cannot be preempted; this structural bound is not an absolute millisecond bound on arbitrary hardware.

Confirmed work accumulates independently, including all actual commands. Tiles are 128px; each job is one tile and at most 16 commands. Submitted chunks are frozen before worker arrivals can append work. Layer state is RGBA8 straight color; stroke accumulation is float premultiplied color. Composition implements normal/multiply/screen/erase and quantizes on stroke boundaries. GPU buffers/canvas are not cloned to construct preview.

Live feedback uses at most 64 local geometries, capsules for solid brushes and instanced footprint shapes for complex brushes. It is transient. Preview opacity is combined with confirmed active stroke before compositing to avoid double-darkening overlap. Browser/default prediction is limited in time and distance, suppressed at corners, and removed on lift/cancel/new actual data. Canonical commands are never thinned for display purposes.

Display priority: live snapshot → visible confirmed tiles → final tail/refinement → history/export. History replays with the same bounded tile jobs. CPU Float64 reference is isolated from realtime and is used for final pixel comparison only.

Integration surface: `RealtimeSession` (input/history), `TileDocument` (accurate jobs), `GpuRenderer` (capability-selected backend), worker protocol, and v2 records. The page is a test harness, not the Illustro product UI. Existing app/core interfaces require an explicit adapter; this candidate does not claim full app integration.
