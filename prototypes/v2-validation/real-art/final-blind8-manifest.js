// Region V3 eighth fresh blind final corpus.
//
// INTEGRITY RULE:
// - Expected labels and seeds are frozen in Git BEFORE any Region execution
//   consumes this manifest.
// - None of these five artworks appears in the training corpus, exposed V2
//   holdout, or blind sets 1–7.
// - Classifier/evidence behavior is frozen at commit
//   5f6d1acf2b73e388b88af4898f98e271165a8f6b.
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

export const REGION_V3_FINAL_BLIND_8 = [
  {
    id: 'met-388272-lachaise-ceiling',
    title: 'Design for a ceiling',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/388272',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/388272/760960/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'inside-main-decorative-panel',
        seed: [0.40, 0.35],
        expected: 'closed',
        rationale: 'Quiet field inside the large continuously framed decorative ceiling panel.',
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
    id: 'met-343378-marot-ceiling',
    title: 'Design for a Ceiling',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/343378',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/343378/753701/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-oval-sky',
        seed: [0.50, 0.33],
        expected: 'closed',
        rationale: 'Pale sky field inside the large central oval, enclosed by its continuous architectural frame.',
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
    id: 'met-384157-chimneypiece',
    title: 'Design for a Chimneypiece',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/384157',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/384157/754295/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-central-pink-panel',
        seed: [0.56, 0.19],
        expected: 'closed',
        rationale: 'Interior of the clearly outlined rectangular colored panel above the fireplace opening.',
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
    id: 'met-338944-palace-colonnade',
    title: 'Architectural Capriccio: A Palace Colonnade',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338944',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/338944/759953/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'lower-stair-colonnade-overlap',
        seed: [0.32, 0.70],
        expected: 'ambiguous',
        rationale: 'Stairs, railings, columns, figures, broken ink contours, and wash overlap without one reliable semantic enclosure.',
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
    id: 'met-338949-guardi-courtyard',
    title: 'Architectural Capriccio: Courtyard of a Palace',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338949',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/338949/759957/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-arch-wash-overlap',
        seed: [0.56, 0.63],
        expected: 'ambiguous',
        rationale: 'Arches, columns, figures, dark wash, and broken perspective contours overlap without one reliable fill enclosure.',
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

export const REGION_V3_FINAL_BLIND_8_CRITERIA = Object.freeze({
  totalQueries: 10,
  minimumOverallPass: 8,
  expectedByLabel: Object.freeze({ closed: 3, open: 5, ambiguous: 2 }),
  minimumPassByLabel: Object.freeze({ closed: 2, open: 4, ambiguous: 2 }),
});
