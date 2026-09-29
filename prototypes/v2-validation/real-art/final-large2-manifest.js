// Gate C second large final blind corpus.
//
// Freeze rules:
// - Candidate artwork IDs were frozen before annotation.
// - Annotation used only source images from the source-preflight artifact.
// - Region classifier/evidence was not run on these sources before this freeze.
// - Classifier/evidence freeze: 0978b358cc0b0fe892d3f3c16254e73182a9069b.
// - Decoded source identity is guarded by width/height/dHash64.
//
// Balanced labels: closed 8 / open 8 / ambiguous 8.

export const REGION_V3_FINAL_LARGE_2 = [
  {
    objectId: 384159,
    id: 'met-384159-chimneypiece',
    title: 'Design for a Chimneypiece',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/384159',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP805420.jpg',
    fingerprint: Object.freeze({ width: 599, height: 496, dHash64: 'b7b69e8edede8e3f' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-fireplace-opening',
        seed: [0.50, 0.52],
        expected: 'closed',
        rationale: 'Interior of the large architectural opening enclosed by the jambs, lintel, and lower frame line.',
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
    objectId: 386491,
    id: 'met-386491-door',
    title: 'Design for a Door',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/386491',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP806493.jpg',
    fingerprint: Object.freeze({ width: 418, height: 625, dHash64: 'a4a6b8b8aca4b894' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'middle-right-octagonal-panel',
        seed: [0.56, 0.47],
        expected: 'closed',
        rationale: 'Interior field of the clearly outlined octagonal panel in the right-hand door design.',
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
    objectId: 384165,
    id: 'met-384165-chimneypiece',
    title: 'Design for a Chimneypiece',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/384165',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP805427.jpg',
    fingerprint: Object.freeze({ width: 599, height: 472, dHash64: 'c7ec79696961600f' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'dark-fireplace-opening',
        seed: [0.50, 0.52],
        expected: 'closed',
        rationale: 'Dark central fireplace field visibly enclosed by the surrounding architectural frame.',
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
    objectId: 365867,
    id: 'met-365867-chimneypiece',
    title: 'Design for a Chimneypiece',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/365867',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP800989.jpg',
    fingerprint: Object.freeze({ width: 600, height: 439, dHash64: 'cdccdc4d5d55554f' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-fireplace-field',
        seed: [0.50, 0.55],
        expected: 'closed',
        rationale: 'Blank central fireplace field bounded by the jambs, lintel, and continuous lower baseline.',
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
    objectId: 336183,
    id: 'met-336183-ceiling',
    title: 'Design for a Ceiling',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/336183',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP827883.jpg',
    fingerprint: Object.freeze({ width: 600, height: 567, dHash64: 'ed78571b1f2b6a1f' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'lower-horse-figure-overlap',
        seed: [0.58, 0.70],
        expected: 'ambiguous',
        rationale: 'Horse, figure, rock/wash, and faint construction lines overlap without one reliable semantic fill enclosure.',
      },
      {
        id: 'left-figure-wash-overlap',
        seed: [0.14, 0.45],
        expected: 'ambiguous',
        rationale: 'Broken figure contours and wash at the left side overlap with faint construction lines, making closure unsafe.',
      },
    ],
  },
  {
    objectId: 388270,
    id: 'met-388270-ceiling',
    title: 'Design for a ceiling',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/388270',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP811703.jpg',
    fingerprint: Object.freeze({ width: 600, height: 454, dHash64: '2f0f0f07273f1717' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-pale-field',
        seed: [0.50, 0.40],
        expected: 'closed',
        rationale: 'Large pale central ceiling field enclosed by the continuous blue-and-gold inner frame.',
      },
      {
        id: 'lower-right-scroll-ornament',
        seed: [0.87, 0.80],
        expected: 'ambiguous',
        rationale: 'Flower, scroll, corner frame, and adjacent band lines overlap without a single safe fill enclosure.',
      },
    ],
  },
  {
    objectId: 388267,
    id: 'met-388267-ceiling',
    title: 'Design for a ceiling',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/388267',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP811706.jpg',
    fingerprint: Object.freeze({ width: 600, height: 404, dHash64: '2717170f0f171777' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'large-central-field',
        seed: [0.50, 0.50],
        expected: 'closed',
        rationale: 'Large pale central field bounded by the continuous rounded architectural frame.',
      },
      {
        id: 'upper-left-corner-ornament',
        seed: [0.17, 0.18],
        expected: 'ambiguous',
        rationale: 'Dense blue scrollwork, red corner panel, and multiple nested outlines create competing local enclosures.',
      },
    ],
  },
  {
    objectId: 388268,
    id: 'met-388268-ceiling',
    title: 'Design for a ceiling',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/388268',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP811705.jpg',
    fingerprint: Object.freeze({ width: 600, height: 358, dHash64: '313539313517571f' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-central-blue-panel',
        seed: [0.62, 0.18],
        expected: 'closed',
        rationale: 'Interior of the pale-blue upper central rectangular panel enclosed by its continuous colored frame.',
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
    objectId: 343118,
    id: 'met-343118-architectural-capriccio',
    title: 'Architectural Capriccio',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/343118',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP812017.jpg',
    fingerprint: Object.freeze({ width: 520, height: 625, dHash64: '8ec7c282a2c6b08a' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'top-green-frame-band',
        seed: [0.50, 0.08],
        expected: 'closed',
        rationale: 'Green rectangular band enclosed between continuous outer and inner frame lines.',
      },
      {
        id: 'lower-ruin-figure-overlap',
        seed: [0.50, 0.72],
        expected: 'ambiguous',
        rationale: 'Ruins, figures, vegetation, wash, and broken architectural contours overlap without one reliable semantic enclosure.',
      },
    ],
  },
  {
    objectId: 343439,
    id: 'met-343439-architectural-fantasy',
    title: 'Architectural Fantasy',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/343439',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DT9549.jpg',
    fingerprint: Object.freeze({ width: 599, height: 386, dHash64: '4b47e72507440505' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-colonnade-overlap',
        seed: [0.55, 0.55],
        expected: 'ambiguous',
        rationale: 'Repeated arches, statues, perspective lines, figures, and wash produce multiple competing region boundaries.',
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
    objectId: 365672,
    id: 'met-365672-architectural-fantasy',
    title: 'Architectural Fantasy',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/365672',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP804344.jpg',
    fingerprint: Object.freeze({ width: 599, height: 460, dHash64: 'f2ce8e8e8d8c86c6' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-ruin-object-overlap',
        seed: [0.55, 0.55],
        expected: 'ambiguous',
        rationale: 'Wall blocks, urns, foliage, figures, shadows, and broken ruin contours overlap without a single safe enclosure.',
      },
      {
        id: 'outer-right-frame-edge',
        seed: [0.995, 0.50],
        expected: 'open',
        rationale: 'Extreme image edge outside the interior composition is connected to the exterior.',
      },
    ],
  },
  {
    objectId: 336493,
    id: 'met-336493-roman-ruins',
    title: 'Architectural Fantasy with Roman Ruins',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/336493',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/1975.131.98.jpg',
    fingerprint: Object.freeze({ width: 599, height: 478, dHash64: '082e3787c74f4dd4' }),
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-arch-column-overlap',
        seed: [0.56, 0.55],
        expected: 'ambiguous',
        rationale: 'Nested arches, columns, carved reliefs, vegetation, and wash provide several competing local boundaries.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.995, 0.50],
        expected: 'open',
        rationale: 'Extreme sheet/crop edge connected to the exterior.',
      },
    ],
  },
];

export const REGION_V3_FINAL_LARGE_2_CRITERIA = Object.freeze({
  totalQueries: 24,
  expectedByLabel: Object.freeze({ closed: 8, open: 8, ambiguous: 8 }),
  minimumOverallPass: 21,
  minimumPassByLabel: Object.freeze({ closed: 7, open: 7, ambiguous: 7 }),
});
