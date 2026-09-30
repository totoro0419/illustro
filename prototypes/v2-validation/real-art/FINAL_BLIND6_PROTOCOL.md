# Region V3 Sixth Fresh Blind Final Protocol

> Label freeze commit: `92809c0e47332411b1e370e51fd5fb01462dc864`
> Classifier/evidence freeze commit: `810d84268efb43d7af1edd6364e67477ea1a6fd4`
> Purpose: independent Gate C closure check after blind sets 1–5 became exposed development evidence.

## Integrity

- Five artworks are new to all earlier Region train/holdout/blind sets.
- Ten seed labels were fixed before any Region execution consumed this corpus.
- No threshold, feature weight, classifier branch, evidence path, seed, or expected label may change before this run.
- If this set fails, Gate C remains open. This set becomes exposed and cannot be reused as a fresh closure set.

## Predeclared criteria

All criteria must pass simultaneously:

- total queries: 10
- overall pass: >= 8 / 10
- closed: >= 2 / 3
- open: >= 4 / 5
- ambiguous: 2 / 2

## Closure interpretation

Gate C may be marked closed only if this fresh corpus passes and the same CI run also preserves:

- reference semantic tests,
- reference benchmarks,
- browser/real-art regression suites,
- existing exposed development corpora.

Passing Gate C does not authorize Production implementation; Gate F remains separate.
