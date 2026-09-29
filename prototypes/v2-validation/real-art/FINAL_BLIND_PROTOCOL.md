# Region V3 Fresh Blind Final Protocol

> Frozen labels commit: `21b92d1447948a6d5ac7bc46474b335231336328`
> Status: **LABELS FROZEN — NOT YET EVALUATED at freeze commit**
> Scope: non-Production Region V3 validation

## Integrity

The final corpus lives in `final-blind-manifest.js`.

The expected labels and normalized seed points were committed before any V3
blind-final evaluation consumed them. None of the five artworks is present in
the existing V2/V3 training or exposed development holdout.

If the first valid blind execution fails, this set becomes exposed. It must not
be tuned against and then reused for a blind CLOSED claim.

## Fixed algorithm

The blind run uses the already-verified V3 classifier and fixed profile:

```text
evidenceThreshold = 0.42
```

No candidate-policy selection is permitted on the blind set.

## Corpus composition

Five unseen public-domain artworks, two queries each:

- historical architectural ink/wash;
- dense ornament ink;
- architectural wash/sketch;
- faint graphite figure study;
- high-contrast U.S. Fish and Wildlife Service line art.

Expected labels:

```text
closed     3
open       5
ambiguous  2
total     10
```

## Predeclared pass criteria

All must hold:

1. overall >= 8 / 10;
2. closed >= 2 / 3;
3. open >= 4 / 5;
4. ambiguous = 2 / 2.

The all-Ambiguous requirement is deliberate: explicitly uncertain artwork must
not be silently promoted to a confident open/closed topology.

## After execution

- PASS does not authorize Production by itself; documentation and Gate C status
  must be reconciled first.
- FAIL means the set is exposed development evidence and a later blind claim
  requires another never-before-evaluated final set after redesign.
