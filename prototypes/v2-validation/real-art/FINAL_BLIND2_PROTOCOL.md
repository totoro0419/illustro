# Region V3 Second Fresh Blind Final Protocol

> Label freeze commit: `aa94246418c6b58bbf762472e839587497944a42`
> Classifier freeze commit: `88b7bf7c9bee8e0961a605c93defd76f737cc09e`
> Purpose: final independent Gate C generalization check after the first V3 blind set became exposed development evidence.

## Integrity

- Five artworks are new to all earlier Region train/holdout/blind sets.
- Ten seed labels were fixed before any V3 execution consumed this corpus.
- No threshold, feature weight, classifier branch, or expected label may change before this run.
- A failure exposes this corpus. Any subsequent algorithm change requires a third fresh blind set before Gate C can close.

## Predeclared criteria

- total queries: 10
- overall pass: >= 8/10
- closed: >= 2/3
- open: >= 4/5
- ambiguous: 2/2

All criteria must pass simultaneously.

## Interpretation

Passing this protocol, together with preserved synthetic semantics and the existing real-art training/development results, is sufficient evidence to close the current Region V3 algorithmic benchmark subgate.

It does not authorize Production implementation by itself.
