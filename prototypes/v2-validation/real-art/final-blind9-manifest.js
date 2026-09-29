// Region V3 ninth fresh blind final corpus.
//
// INTEGRITY RULE:
// - Expected labels and seeds are frozen in Git BEFORE any Region execution
//   consumes this manifest.
// - None of these five artworks appears in the training corpus, exposed V2
//   holdout, or blind sets 1–8.
// - Classifier/evidence behavior is frozen at commit
//   28b90c658004ee1c83ce25d93cb50a856f50ab22.
// - This corpus is a fresh independent Gate C closure set. If it fails, Gate C
//   remains open; labels/seeds must not be edited to obtain a pass.
//
// Predeclared criteria (10 queries):
// - overall >= 8 / 10
// - closed >= 2 / 3
// - open >= 4 / 5
// - ambiguous = 2 / 2
//
// Labels are human topological judgments made from official Public Domain
// source images before any algorithm execution on this corpus.

export const REGION_V3_FINAL_BLIND_9 = [
  {
    id: 'met-364341-adam-ceiling',
    title: 'Design for a Ceiling',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/364341',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/364341/747947/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'inside-central-oval',
        seed: [0.50, 0.38],
        expected: 'closed',
        rationale: 'Quiet field inside the large central oval, enclosed by the continuous oval frame.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the image exterior.',
      },
    ],
  },
  {
    id: 'met-362930-chambers-ceiling',
    title: 'Design for a Ceiling',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/362930',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/362930/764055/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-green-panel',
        seed: [0.67, 0.23],
        expected: 'closed',
        rationale: 'Interior of the clearly bounded green rectangular ornamental panel.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the image exterior.',
      },
    ],
  },
  {
    id: 'met-334910-berain-ceiling',
    title: 'Design for a Ceiling',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/334910',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/334910/754753/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-left-gray-cartouche',
        seed: [0.16, 0.22],
        expected: 'closed',
        rationale: 'Gray ornamental field enclosed by a continuous dark cartouche outline at the upper left.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the image exterior.',
      },
    ],
  },
  {
    id: 'met-338934-guardi-garden-entrance',
    title: 'Architectural Capriccio: Garden Entrance to a Palace',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338934',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/338934/760891/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'stair-column-wash-overlap',
        seed: [0.60, 0.66],
        expected: 'ambiguous',
        rationale: 'Stair lines, column edges, figures, broken contours, and brown wash overlap without one reliable semantic enclosure.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the image exterior.',
      },
    ],
  },
  {
    id: 'met-338932-guardi-courtyard',
    title: 'Architectural Capriccio: Courtyard of a Palace',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338932',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/338932/759959/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-column-arch-overlap',
        seed: [0.58, 0.55],
        expected: 'ambiguous',
        rationale: 'Large column, arches, receding architecture, figures, and wash create competing possible boundaries rather than one reliable fill enclosure.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the image exterior.',
      },
    ],
  },
];

export const REGION_V3_FINAL_BLIND_9_CRITERIA = Object.freeze({
  totalQueries: 10,
  minimumOverallPass: 8,
  expectedByLabel: Object.freeze({ closed: 3, open: 5, ambiguous: 2 }),
  minimumPassByLabel: Object.freeze({ closed: 2, open: 4, ambiguous: 2 }),
});
