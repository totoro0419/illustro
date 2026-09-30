// Gate C third large final blind corpus.
//
// Integrity:
// - Candidate artwork IDs were frozen at
//   81d5ef507a1e435da367ac6e1eb07e307e085b62 before annotation.
// - Annotation used only the source-preflight images.
// - No Region classifier has consumed these sources before this manifest freeze.
// - V4 classifier freeze: 972ed07173d300e355935ddcea3b92af5e1d1f8d.
// - Decoded source identity is guarded by width/height/dHash64.
//
// Balanced labels: closed 8 / open 8 / ambiguous 8.

export const REGION_V4_FINAL_LARGE_3 = [
  {
    objectId: 362951,
    id: 'met-362951-chimneypiece',
    title: 'Design for a Chimneypiece',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/362951',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP806059.jpg',
    fingerprint: Object.freeze({ width: 429, height: 624, dHash64: '17334e4df0e0e061' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-fireplace-field',
        seed: [0.50, 0.72],
        expected: 'closed',
        rationale: 'Dark central fireplace field enclosed by the architectural jambs, lintel, and lower frame.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the exterior.',
      },
    ],
  },
  {
    objectId: 365866,
    id: 'met-365866-chimneypiece',
    title: 'Design for a Chimneypiece',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/365866',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP801000.jpg',
    fingerprint: Object.freeze({ width: 599, height: 481, dHash64: '95c4f8f9e1f1e96b' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-gray-fireplace-field',
        seed: [0.50, 0.52],
        expected: 'closed',
        rationale: 'Gray central fireplace field enclosed by the surrounding rectangular architectural frame.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the exterior.',
      },
    ],
  },
  {
    objectId: 384167,
    id: 'met-384167-chimneypiece',
    title: 'Design for a Chimneypiece',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/384167',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP805401.jpg',
    fingerprint: Object.freeze({ width: 600, height: 377, dHash64: '4d4d4d4d4d4d7737' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-fireplace-opening',
        seed: [0.50, 0.50],
        expected: 'closed',
        rationale: 'Blank central fireplace opening bounded by the continuous inner frame.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the exterior.',
      },
    ],
  },
  {
    objectId: 362944,
    id: 'met-362944-george-iii-chimneypiece',
    title: 'Design for a Chimneypiece, Incorporating a Portrait of George III',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/362944',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP800983.jpg',
    fingerprint: Object.freeze({ width: 345, height: 624, dHash64: '33f0e8f8dcce8e86' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'portrait-medallion-field',
        seed: [0.50, 0.32],
        expected: 'closed',
        rationale: 'Interior field of the large circular portrait medallion enclosed by its continuous ring.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the exterior.',
      },
    ],
  },

  {
    objectId: 388249,
    id: 'met-388249-ceiling',
    title: 'Design for a ceiling',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/388249',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP811652.jpg',
    fingerprint: Object.freeze({ width: 600, height: 487, dHash64: '0f1f1f170f0f0f1f' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'lower-left-round-medallion',
        seed: [0.17, 0.76],
        expected: 'closed',
        rationale: 'Interior of the round lower-left ornamental medallion enclosed by a visible circular frame.',
      },
      {
        id: 'lower-leaf-band-overlap',
        seed: [0.45, 0.84],
        expected: 'ambiguous',
        rationale: 'Leaf forms, colored band outlines, and adjacent frame strokes overlap into several plausible local regions.',
      },
    ],
  },
  {
    objectId: 388275,
    id: 'met-388275-ceiling',
    title: 'Design for a ceiling',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/388275',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP811682.jpg',
    fingerprint: Object.freeze({ width: 600, height: 364, dHash64: '414d0f0f0b0d4d41' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'large-central-round-field',
        seed: [0.50, 0.50],
        expected: 'closed',
        rationale: 'Large pale central round field enclosed by the continuous circular architectural frame.',
      },
      {
        id: 'upper-left-circle-panel-junction',
        seed: [0.31, 0.29],
        expected: 'ambiguous',
        rationale: 'Curved circular frame and nested angular panel lines meet here, producing competing enclosure interpretations.',
      },
    ],
  },
  {
    objectId: 388321,
    id: 'met-388321-ceiling',
    title: 'Design for a ceiling',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/388321',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP811662.jpg',
    fingerprint: Object.freeze({ width: 443, height: 624, dHash64: '8e8f8f97938787be' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'right-round-medallion',
        seed: [0.82, 0.33],
        expected: 'closed',
        rationale: 'Interior of the clearly outlined round medallion on the right side of the ceiling design.',
      },
      {
        id: 'lower-left-panel-ornament-overlap',
        seed: [0.24, 0.77],
        expected: 'ambiguous',
        rationale: 'Nested panel borders, scroll ornament, and corner arcs overlap without one uniquely safe fill region.',
      },
    ],
  },
  {
    objectId: 388286,
    id: 'met-388286-ceiling',
    title: 'Design for a ceiling',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/388286',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP811667.jpg',
    fingerprint: Object.freeze({ width: 600, height: 387, dHash64: '173327371737331f' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'large-central-panel',
        seed: [0.50, 0.52],
        expected: 'closed',
        rationale: 'Large pale central panel enclosed by the continuous stepped colored frame.',
      },
      {
        id: 'upper-interlaced-ribbon-junction',
        seed: [0.50, 0.17],
        expected: 'ambiguous',
        rationale: 'Several interlaced colored ribbon strokes cross and overlap near the upper central frame.',
      },
    ],
  },

  {
    objectId: 343076,
    id: 'met-343076-architectural-fantasy',
    title: 'Architectural Fantasy',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/343076',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP811620.jpg',
    fingerprint: Object.freeze({ width: 600, height: 596, dHash64: 'e08c9c1e0e9cd8f0' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-city-overlap',
        seed: [0.50, 0.50],
        expected: 'ambiguous',
        rationale: 'Buildings, vegetation, figures, wash, and broken perspective contours overlap without one reliable semantic enclosure.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.995, 0.50],
        expected: 'open',
        rationale: 'Extreme paper edge outside the circular composition is connected to the exterior.',
      },
    ],
  },
  {
    objectId: 338203,
    id: 'met-338203-architectural-fantasy',
    title: 'Architectural fantasy',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338203',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP807906.jpg',
    fingerprint: Object.freeze({ width: 600, height: 595, dHash64: 'f0d0c6070382c0f0' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-figure-arch-overlap',
        seed: [0.50, 0.50],
        expected: 'ambiguous',
        rationale: 'Figure, arches, columns, floor lines, and dense wash create multiple competing local boundaries.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.995, 0.50],
        expected: 'open',
        rationale: 'Extreme paper edge outside the circular composition is connected to the exterior.',
      },
    ],
  },
  {
    objectId: 340507,
    id: 'met-340507-temple-fantasy',
    title: 'Architectural Fantasy: Temple-like Building with Colonnades, a Monumental Staircase, and a Burnt Offering (Sacrifice) in the Foreground',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/340507',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP803658.jpg',
    fingerprint: Object.freeze({ width: 599, height: 470, dHash64: 'ccd9dbb925a35387' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'stair-colonnade-overlap',
        seed: [0.52, 0.65],
        expected: 'ambiguous',
        rationale: 'Stair lines, colonnade edges, figures, shadows, and perspective construction overlap without a single safe enclosure.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the exterior.',
      },
    ],
  },
  {
    objectId: 338204,
    id: 'met-338204-architectural-fantasy',
    title: 'Architectural fantasy',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338204',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP807907.jpg',
    fingerprint: Object.freeze({ width: 600, height: 601, dHash64: 'f0cc8c9d8d8cecf8' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-colonnade-figure-overlap',
        seed: [0.50, 0.55],
        expected: 'ambiguous',
        rationale: 'Columns, arches, figures, relief detail, and dark wash overlap into several plausible local regions.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.995, 0.50],
        expected: 'open',
        rationale: 'Extreme paper edge outside the circular composition is connected to the exterior.',
      },
    ],
  },
];

export const REGION_V4_FINAL_LARGE_3_CRITERIA = Object.freeze({
  totalQueries: 24,
  expectedByLabel: Object.freeze({ closed: 8, open: 8, ambiguous: 8 }),
  minimumOverallPass: 21,
  minimumPassByLabel: Object.freeze({ closed: 7, open: 7, ambiguous: 7 }),
});
