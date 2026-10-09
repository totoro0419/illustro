> Classification: EXPERIMENTAL / historical research and validation. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# What was adopted and what differs

ibisPaint: public Constant + Fast Strokes controls, realtime/after separation, guarded prediction intent and per-brush settings informed the test controls and separation. Illustro's local regression,6px corner guard,12ms/16px prediction bounds and shader layout are Illustro design choices, not ibisPaint formulas. Vendor fade/tracking improvements are not evidence that our56 presets match them.

CLIP STUDIO: public temporary predicted stroke display and device-specific prediction settings motivated noncanonical preview and browser/fallback prediction. CSP explicitly conditions/suppresses preview for some large/strong/tool combinations. Illustro instead attempts bounded feedback for every supported preset; whether it succeeds on actual512/1024px hardware is open. CSP quality/spacing tradeoffs informed isolated preview simplification rather than silently changing final stroke data.

Krita: explicit smaller foreground feedback/background accurate computation supports the architecture. Illustro uses viewport-sized GPU feedback and document-resolution sparse tiles; this is not a claim that Krita uses the same GPU pipeline.

libmypaint/Procreate/Photoshop: distance/time dab semantics, stamp/shape/grain controls and documented complexity/spacing costs informed preset routing and CPU reference tests. Affinity's rope/window tradeoffs motivated avoiding a long dragged tail by default. Concepts' editable strokes informed journaling; its120Hz feature does not establish our performance.

No application was exercised here with the same stylus/hardware/brush. Draw-feel comparison and speed ranking remain UNVERIFIED.


## 最新の見え方の基準

ibisPaintの公開する高速追従と自然な太さ・不透明度変化、CLIP STUDIOの条件付き予測表示を参考に、Illustroでは一筆の途中・終了・確定の連続性を評価する。内部アルゴリズムを再現したという意味ではない。Kritaが公開するLODのpoppingの制約は、今回の要件では許容しない。

最新通知を捨てる際に鉛筆の途中形状まで64個で切り捨てていたのはIllustro実装の失敗であり、競合の方式を理由に正当化しない。同条件の実機比較は未実施で、速度の優位性を主張しない。
