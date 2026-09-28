# Region V2 Representative Real-Art Corpus

> Labels were frozen before the first resolver execution on this corpus.

This corpus uses actual public-domain/open-access artwork rather than generated geometric fixtures.

## Method

- Sources are fetched from The Metropolitan Museum of Art Open Access IIIF endpoints and Wikimedia Commons public-domain files.
- Each work has normalized seed queries labeled in advance as `closed`, `open`, or `ambiguous`.
- Numeric policy selection uses **train** works only.
- **Holdout labels are never used for profile selection.**
- The same evidence extraction and perturbation-based stability classifier is then run on holdout works.
- Expected labels are not changed after observing results.

## Training works

- The Met 343905 — Architectural Drawing
- The Met 340292 — Architectural Drawing
- The Met 340479 — Venus with Doves
- Wikimedia Commons — Swainson hawk line art
- The Met 347891 — Woman Reading
- The Met 347897 — Potiphar's Wife Accusing Joseph Before her Husband

## Holdout works

- The Met 390078 — Architectural Drawings
- Wikimedia Commons — Animal line art drawing
- The Met 459238 — Cottage near the Entrance to a Wood

## Source provenance

Every entry in `manifest.js` stores its collection page, direct image URL, and rights statement.

The corpus intentionally mixes:
- clean architectural ink;
- dense ornament;
- figure line drawing;
- modern public-domain wildlife line art;
- wash/loose drawing;
- faint sketch;
- hatched line art;
- landscape wash.

## Gate rule

Gate C closes only if the training-selected profile reaches the predeclared minimum on both sets:

- train accuracy >= 90%
- holdout accuracy >= 80%
- holdout includes an Ambiguous-labeled case

If the holdout misses, do **not** relabel the holdout or lower the threshold after seeing the result. Improve the evidence algorithm using training evidence only, then rerun the unchanged holdout.
