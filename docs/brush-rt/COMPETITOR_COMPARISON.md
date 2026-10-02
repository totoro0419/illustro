# What was adopted and what differs

ibisPaint: public Constant + Fast Strokes controls, realtime/after separation, guarded prediction intent and per-brush settings informed the test controls and separation. Illustro's local regression,6px corner guard,12ms/16px prediction bounds and shader layout are Illustro design choices, not ibisPaint formulas. Vendor fade/tracking improvements are not evidence that our56 presets match them.

CLIP STUDIO: public temporary predicted stroke display and device-specific prediction settings motivated noncanonical preview and browser/fallback prediction. CSP explicitly conditions/suppresses preview for some large/strong/tool combinations. Illustro instead attempts bounded feedback for every supported preset; whether it succeeds on actual512/1024px hardware is open. CSP quality/spacing tradeoffs informed isolated preview simplification rather than silently changing final stroke data.

Krita: explicit smaller foreground feedback/background accurate computation supports the architecture. Illustro uses viewport-sized GPU feedback and document-resolution sparse tiles; this is not a claim that Krita uses the same GPU pipeline.

libmypaint/Procreate/Photoshop: distance/time dab semantics, stamp/shape/grain controls and documented complexity/spacing costs informed preset routing and CPU reference tests. Affinity's rope/window tradeoffs motivated avoiding a long dragged tail by default. Concepts' editable strokes informed journaling; its120Hz feature does not establish our performance.

No application was exercised here with the same stylus/hardware/brush. Draw-feel comparison and speed ranking remain UNVERIFIED.
