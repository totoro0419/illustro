// Region V3 second fresh blind final corpus.
//
// INTEGRITY RULE:
// - These labels and seeds are committed BEFORE any algorithm execution consumes
//   this manifest.
// - None of these five artworks appears in the training corpus, exposed V2
//   holdout, or first V3 blind corpus.
// - The classifier is frozen at commit 88b7bf7c9bee8e0961a605c93defd76f737cc09e.
// - If this set fails, it becomes exposed development evidence and cannot be
//   reused as a final blind set after tuning.
//
// Predeclared criteria (10 queries):
// - overall >= 8 / 10
// - closed >= 2 / 3
// - open >= 4 / 5
// - ambiguous = 2 / 2
//
// Labels are human topological judgments made from source artwork before any
// V3 execution on this corpus.

export const REGION_V3_FINAL_BLIND_2 = [
  {
    id: 'met-343074-arabesque',
    title: 'Design for an Arabesque',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/343074',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/343074/760746/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-medallion',
        seed: [0.50, 0.27],
        expected: 'closed',
        rationale: 'Interior of the clearly outlined central oval medallion.',
      },
      {
        id: 'outer-left-mat',
        seed: [0.025, 0.50],
        expected: 'open',
        rationale: 'Outer mat area connected to the cropped image boundary.',
      },
    ],
  },
  {
    id: 'met-365520-door',
    title: 'Architectural project for door',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/365520',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/365520/751240/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-central-oval',
        seed: [0.50, 0.24],
        expected: 'closed',
        rationale: 'Interior of the large, clearly bounded oval cartouche.',
      },
      {
        id: 'left-paper-margin',
        seed: [0.025, 0.62],
        expected: 'open',
        rationale: 'Blank sheet margin connected to the source exterior.',
      },
    ],
  },
  {
    id: 'met-387020-room-plan',
    title: 'Plan of a Room',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/387020',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/387020/756444/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-round-table',
        seed: [0.49, 0.51],
        expected: 'closed',
        rationale: 'Interior of the outlined circular central table.',
      },
      {
        id: 'upper-right-paper',
        seed: [0.90, 0.12],
        expected: 'open',
        rationale: 'Unbounded blank paper outside the room-plan outline.',
      },
    ],
  },
  {
    id: 'met-338931-guardi',
    title: 'Architectural Capriccio: Grand Staircase Seen through an Archway',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338931',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/338931/759838/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'right-stair-wash',
        seed: [0.77, 0.56],
        expected: 'ambiguous',
        rationale: 'Loose broken contour, wash, and hatching do not define a single reliable region boundary.',
      },
      {
        id: 'upper-left-paper',
        seed: [0.06, 0.05],
        expected: 'open',
        rationale: 'Sheet/background area connected to the image exterior.',
      },
    ],
  },
  {
    id: 'met-340246-dense-architecture',
    title: 'Architectural Drawing',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/340246',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/340246/750939/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-bay-sketch',
        seed: [0.50, 0.58],
        expected: 'ambiguous',
        rationale: 'Dense overlapping architectural sketch lines and incomplete contours make closure uncertain.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge should remain connected to the exterior.',
      },
    ],
  },
];

export const REGION_V3_FINAL_BLIND_2_CRITERIA = Object.freeze({
  totalQueries: 10,
  minimumOverallPass: 8,
  expectedByLabel: Object.freeze({ closed: 3, open: 5, ambiguous: 2 }),
  minimumPassByLabel: Object.freeze({ closed: 2, open: 4, ambiguous: 2 }),
});
