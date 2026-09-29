// Region V3 third fresh blind final corpus.
//
// INTEGRITY RULE:
// - These expected labels and seeds are frozen in Git BEFORE any V3 execution
//   consumes this manifest.
// - None of these five artworks appears in the training corpus, exposed V2
//   holdout, first V3 blind corpus, or second V3 blind corpus.
// - Classifier/evidence behavior is frozen at commit
//   2edf069ec0eb895e05279591f973528bf581078f.
// - If this set fails, it becomes exposed development evidence and cannot be
//   reused as a final blind set after tuning.
//
// Predeclared criteria (10 queries):
// - overall >= 8 / 10
// - closed >= 2 / 3
// - open >= 4 / 5
// - ambiguous = 2 / 2
//
// Labels are human topological judgments made from the source artwork before
// any V3 execution on this corpus.

export const REGION_V3_FINAL_BLIND_3 = [
  {
    id: 'met-344613-briccio-wall',
    title: "Design for a Painted Wall Decoration for Palazzo Massimo all'Aracoeli (Rome)",
    sourcePage: 'https://www.metmuseum.org/art/collection/search/344613',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/344613/748649/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-central-medallion',
        seed: [0.42, 0.16],
        expected: 'closed',
        rationale: 'Interior of the clearly outlined circular medallion above the left central opening.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop margin connected to the image exterior.',
      },
    ],
  },
  {
    id: 'met-384155-chimneypiece',
    title: 'Design for a Chimneypiece',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/384155',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/384155/754292/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'left-upper-rosette',
        seed: [0.225, 0.19],
        expected: 'closed',
        rationale: 'Interior of the circular rosette at the upper left of the chimneypiece.',
      },
      {
        id: 'upper-right-paper',
        seed: [0.92, 0.10],
        expected: 'open',
        rationale: 'Blank paper outside the architectural drawing, connected to the sheet exterior.',
      },
    ],
  },
  {
    id: 'met-367301-gothic-mirror',
    title: 'Design for a Gothic Mirror',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/367301',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/367301/753056/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-left-round-ornament',
        seed: [0.33, 0.20],
        expected: 'closed',
        rationale: 'Interior of a visibly enclosed round ornamental cell in the upper Gothic frame.',
      },
      {
        id: 'upper-left-paper',
        seed: [0.06, 0.08],
        expected: 'open',
        rationale: 'Blank sheet area outside the mirror design and connected to the exterior.',
      },
    ],
  },
  {
    id: 'met-367315-gothic-interior',
    title: 'Design for a Gothic Interior',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/367315',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/367315/752845/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'chair-floor-overlap',
        seed: [0.55, 0.73],
        expected: 'ambiguous',
        rationale: 'Chair structure, floor construction lines, hatching, and wash overlap without one reliable semantic enclosure.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer paper/crop edge connected to the exterior.',
      },
    ],
  },
  {
    id: 'met-340732-perspective-wash',
    title: 'Design for a Painted Wall Decoration: Architectural Perspective Seen Through an Arch',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/340732',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/340732/751661/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-perspective-wash',
        seed: [0.48, 0.60],
        expected: 'ambiguous',
        rationale: 'Overlapping perspective construction, columns, wash, and faint architectural edges do not define one reliable closed region.',
      },
      {
        id: 'bottom-sheet-edge',
        seed: [0.50, 0.985],
        expected: 'open',
        rationale: 'Bottom sheet/crop margin connected to the image exterior.',
      },
    ],
  },
];

export const REGION_V3_FINAL_BLIND_3_CRITERIA = Object.freeze({
  totalQueries: 10,
  minimumOverallPass: 8,
  expectedByLabel: Object.freeze({ closed: 3, open: 5, ambiguous: 2 }),
  minimumPassByLabel: Object.freeze({ closed: 2, open: 4, ambiguous: 2 }),
});
