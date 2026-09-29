// Region V3 sixth fresh blind final corpus.
//
// INTEGRITY RULE:
// - Expected labels and seeds are frozen in Git BEFORE any Region execution
//   consumes this manifest.
// - None of these five artworks appears in the training corpus, exposed V2
//   holdout, or blind sets 1–5.
// - Classifier/evidence behavior is frozen at commit
//   810d84268efb43d7af1edd6364e67477ea1a6fd4.
// - This corpus is the fresh independent Gate C closure set. If it fails, Gate C
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

export const REGION_V3_FINAL_BLIND_6 = [
  {
    id: 'met-362925-ceiling-oval',
    title: 'Design for a Ceiling, an Oblong with an Oval Center',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/362925',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/362925/764051/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'inside-large-central-oval',
        seed: [0.50, 0.33],
        expected: 'closed',
        rationale: 'Blank field inside the clearly enclosed large central oval, away from the smaller internal medallions.',
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
    id: 'met-389394-oval-trompe-loeil',
    title: "Design for a Ceiling with an Oval Trompe L'Oeil Painting",
    sourcePage: 'https://www.metmuseum.org/art/collection/search/389394',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/389394/750267/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'inside-oval-painted-field',
        seed: [0.77, 0.23],
        expected: 'closed',
        rationale: 'Interior field of the large oval trompe-l’oeil painting, bounded by its continuous ornamental frame.',
      },
      {
        id: 'left-sheet-edge',
        seed: [0.015, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the image exterior.',
      },
    ],
  },
  {
    id: 'met-386260-round-oculus',
    title: 'Design for a ceiling painted with clouds and trellis work',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/386260',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/386260/760993/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-right-oculus-sector',
        seed: [0.62, 0.30],
        expected: 'closed',
        rationale: 'Pale sky sector inside the circular oculus, enclosed by the circular frame and radial trellis members.',
      },
      {
        id: 'bottom-sheet-edge',
        seed: [0.50, 0.985],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the image exterior.',
      },
    ],
  },
  {
    id: 'met-338938-vaulted-colonnade',
    title: 'Architectural Capriccio: Vaulted Colonnade of a Palace',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338938',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/338938/759961/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-colonnade-perspective',
        seed: [0.68, 0.58],
        expected: 'ambiguous',
        rationale: 'Columns, floor construction lines, figures, and receding arches create competing possible boundaries rather than one reliable fill enclosure.',
      },
      {
        id: 'upper-sheet-edge',
        seed: [0.50, 0.015],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the image exterior.',
      },
    ],
  },
  {
    id: 'met-389778-gray-wash-capriccio',
    title: 'Architectural Capriccio',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/389778',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/389778/751560/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-ornament-wash-overlap',
        seed: [0.58, 0.54],
        expected: 'ambiguous',
        rationale: 'Layered architectural ornament, column forms, gray wash, and broken contours do not define one reliable semantic enclosure.',
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

export const REGION_V3_FINAL_BLIND_6_CRITERIA = Object.freeze({
  totalQueries: 10,
  minimumOverallPass: 8,
  expectedByLabel: Object.freeze({ closed: 3, open: 5, ambiguous: 2 }),
  minimumPassByLabel: Object.freeze({ closed: 2, open: 4, ambiguous: 2 }),
});
