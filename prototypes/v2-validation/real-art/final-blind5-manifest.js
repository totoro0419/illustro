// Region V3 fifth fresh blind final corpus.
//
// INTEGRITY RULE:
// - Expected labels and seeds are frozen in Git BEFORE any Region execution
//   consumes this manifest.
// - None of these five artworks appears in the training corpus, exposed V2
//   holdout, or blind sets 1–4.
// - Classifier/evidence behavior is frozen at commit
//   5bae2461ab4dd2dd75e717c3b507376af6766f71.
// - If this set fails, it becomes exposed development evidence and cannot be
//   reused as a final blind set after tuning.
//
// Predeclared criteria (10 queries):
// - overall >= 8 / 10
// - closed >= 2 / 3
// - open >= 4 / 5
// - ambiguous = 2 / 2
//
// Labels are human topological judgments made from official Public Domain
// source images before any algorithm execution on this corpus.

export const REGION_V3_FINAL_BLIND_5 = [
  {
    id: 'met-384827-altar',
    title: 'Elevation of a design for an altar and painted wall decoration',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/384827',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/384827/760936/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-brown-panel',
        seed: [0.50, 0.53],
        expected: 'closed',
        rationale: 'Interior of the large brown rectangular panel, visibly enclosed by its gold frame.',
      },
      {
        id: 'upper-left-sheet-margin',
        seed: [0.02, 0.08],
        expected: 'open',
        rationale: 'Blank sheet margin connected to the image exterior.',
      },
    ],
  },
  {
    id: 'met-362962-chimneypiece',
    title: 'Design for a Chimneypiece',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/362962',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/362962/755334/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-blue-field',
        seed: [0.50, 0.29],
        expected: 'closed',
        rationale: 'Interior of the large pale-blue upper field, enclosed by the ornamental frame.',
      },
      {
        id: 'lower-left-sheet-margin',
        seed: [0.02, 0.86],
        expected: 'open',
        rationale: 'Blank paper at the outer sheet margin, connected to the exterior.',
      },
    ],
  },
  {
    id: 'met-386749-church-gate',
    title: 'Design for a Church Gate',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/386749',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/386749/755931/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-central-flower-cell',
        seed: [0.50, 0.14],
        expected: 'closed',
        rationale: 'Interior of the central colored floral cell in the enclosed upper ornamental band.',
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
    id: 'met-338939-guardi-courtyard',
    title: 'Architectural Capriccio: Courtyard of a Palace',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338939',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/338939/760905/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'lower-left-courtyard-overlap',
        seed: [0.32, 0.72],
        expected: 'ambiguous',
        rationale: 'Loose stairs, figures, architectural strokes, and wash overlap without one reliable enclosing boundary.',
      },
      {
        id: 'upper-right-sheet-edge',
        seed: [0.985, 0.08],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the exterior.',
      },
    ],
  },
  {
    id: 'met-340502-perspective',
    title: 'Design for a Painted Perspective Wall Decoration',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/340502',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/340502/751487/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-distant-perspective',
        seed: [0.46, 0.46],
        expected: 'ambiguous',
        rationale: 'Faint distant architecture seen through overlapping arches and columns yields competing possible boundaries.',
      },
      {
        id: 'bottom-sheet-edge',
        seed: [0.50, 0.985],
        expected: 'open',
        rationale: 'Bottom paper/crop margin connected to the image exterior.',
      },
    ],
  },
];

export const REGION_V3_FINAL_BLIND_5_CRITERIA = Object.freeze({
  totalQueries: 10,
  minimumOverallPass: 8,
  expectedByLabel: Object.freeze({ closed: 3, open: 5, ambiguous: 2 }),
  minimumPassByLabel: Object.freeze({ closed: 2, open: 4, ambiguous: 2 }),
});
