// Region V3 fourth fresh blind final corpus.
//
// INTEGRITY RULE:
// - Expected labels and seeds are frozen in Git BEFORE any Region execution
//   consumes this manifest.
// - None of these five artworks appears in the training corpus, exposed V2
//   holdout, or blind sets 1–3.
// - Classifier/evidence behavior is frozen at commit
//   ec7a77fa187e7ac0f76d903ebfb0db0d6d209c31.
// - If this set fails, it becomes exposed development evidence and cannot be
//   reused as a final blind set after tuning.
//
// Predeclared criteria (10 queries):
// - overall >= 8 / 10
// - closed >= 2 / 3
// - open >= 4 / 5
// - ambiguous = 2 / 2
//
// Labels are human topological judgments made from the official source images
// before any algorithm execution on this corpus.

export const REGION_V3_FINAL_BLIND_4 = [
  {
    id: 'met-343064-painted-medallions',
    title: 'Painted Wall Decor Featuring Three Medallions',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/343064',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/343064/756277/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-round-medallion',
        seed: [0.50, 0.39],
        expected: 'closed',
        rationale: 'Blue interior field of the clearly bounded central circular medallion.',
      },
      {
        id: 'upper-right-paper',
        seed: [0.95, 0.10],
        expected: 'open',
        rationale: 'Blank paper outside the painted wall design, connected to the sheet exterior.',
      },
    ],
  },
  {
    id: 'met-340509-palazzo-wall',
    title: 'Design for an Interior Wall Decoration of a Palazzo with Two Doorways and a Decorated Panelling with Trophies',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/340509',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/340509/752101/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-ornate-panel',
        seed: [0.60, 0.43],
        expected: 'closed',
        rationale: 'Blank center of the large ornate rectangular panel on the right half of the wall design.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the exterior.',
      },
    ],
  },
  {
    id: 'met-365529-arch-variants',
    title: 'Two One Half Variants of a Design for Painted Wall Decoration with Arch and Perspective View Inside',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/365529',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/365529/771069/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-central-shield',
        seed: [0.50, 0.14],
        expected: 'closed',
        rationale: 'Interior of the clearly enclosed shield/cartouche at the crown of the arch.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer paper edge connected to the exterior.',
      },
    ],
  },
  {
    id: 'met-340607-landscape-ruins',
    title: 'Design for a Painted Wall Decoration, with Figures in a Landscape with Classical Ruins',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/340607',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/340607/752103/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'left-landscape-overlap',
        seed: [0.30, 0.52],
        expected: 'ambiguous',
        rationale: 'Loose figures, landscape contour, wash, and ruin lines overlap without one reliable enclosing boundary.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer paper/crop margin connected to the exterior.',
      },
    ],
  },
  {
    id: 'met-365516-perspective-interior',
    title: 'Architectural Perspective: Design for Painted Wall Decoration (?)',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/365516',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/365516/751228/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-column-perspective',
        seed: [0.53, 0.58],
        expected: 'ambiguous',
        rationale: 'Overlapping columns, ruled construction, wash, and faint perspective lines do not form one reliable semantic enclosure.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the exterior.',
      },
    ],
  },
];

export const REGION_V3_FINAL_BLIND_4_CRITERIA = Object.freeze({
  totalQueries: 10,
  minimumOverallPass: 8,
  expectedByLabel: Object.freeze({ closed: 3, open: 5, ambiguous: 2 }),
  minimumPassByLabel: Object.freeze({ closed: 2, open: 4, ambiguous: 2 }),
});
