# Region V3 Third Fresh Blind Final Protocol

> Label freeze commit: `a7321224d6e39bf52c096d153a53a4d3a2ad4ea4`
> Classifier/evidence freeze commit: `2edf069ec0eb895e05279591f973528bf581078f`
> Purpose: independent final Gate C generalization check after blind sets 1 and 2 became exposed development evidence.

## Integrity

- Five artworks are new to all earlier Region train/holdout/blind sets.
- Ten seed labels were fixed before any V3 execution consumed this corpus.
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

If this corpus passes while the same CI run preserves synthetic semantics, reference benchmarks, the training corpus, and the exposed development holdouts, the Region V3 algorithmic benchmark subgate may close.

This does not authorize Production implementation; Gate F remains separate.
