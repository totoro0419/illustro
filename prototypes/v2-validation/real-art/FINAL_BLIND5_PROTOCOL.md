# Region V3 Fifth Fresh Blind Final Protocol

> Label freeze commit: `80fc08d35d39266ba212eec586c1b734e5827146`
> Classifier/evidence freeze commit: `5bae2461ab4dd2dd75e717c3b507376af6766f71`
> Purpose: independent Gate C generalization check after blind sets 1–4 became exposed development evidence.

## Integrity

- Five artworks are new to all earlier Region train/holdout/blind sets.
- Ten seed labels were fixed before any Region execution consumed this corpus.
- No threshold, feature weight, classifier branch, evidence path, seed, or expected label may change before this run.
- A failure exposes this corpus. Any subsequent algorithm change requires another fresh blind set before Gate C can close.

## Predeclared criteria

All criteria must pass simultaneously:

- total queries: 10
- overall pass: >= 8 / 10
- closed: >= 2 / 3
- open: >= 4 / 5
- ambiguous: 2 / 2

## Interpretation

If this corpus passes while the same CI run preserves synthetic semantics, reference benchmarks, the training corpus, and exposed development sets, the Region V3 algorithmic benchmark subgate may close.

This does not authorize Production implementation; Gate F remains separate.
