# Region V3 Ninth Fresh Blind Final Protocol

> Label freeze commit: `04ae65ae32217dbc56875c60808f56e8984ce05d`
> Classifier/evidence freeze commit: `28b90c658004ee1c83ce25d93cb50a856f50ab22`
> Purpose: independent Gate C closure check after blind sets 1–8 became exposed development evidence.

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
