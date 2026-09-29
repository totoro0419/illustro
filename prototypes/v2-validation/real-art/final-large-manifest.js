// Gate C large final blind corpus.
//
// Integrity:
// - Candidate artwork IDs were frozen before annotation.
// - Annotation used only the source images; Region V3 was not run on these sources.
// - Source image URLs and SHA-256 digests are frozen with labels/seeds.
// - Classifier/evidence implementation is frozen at
//   28b90c658004ee1c83ce25d93cb50a856f50ab22.
// - Any failed first run permanently exposes this corpus.
//
// Balanced labels: closed 8 / open 8 / ambiguous 8.

export const REGION_V3_FINAL_LARGE = [
  {
    objectId: 679427,
    id: 'met-679427-door',
    title: 'Design for a Door',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/679427',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP842063.jpg',
    sha256: 'e0ea5107e95703871d98cf67db30976f70638840b947fe8f6e4f81180e92860b',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'door-opening',
        seed: [0.52, 0.62],
        expected: 'closed',
        rationale: 'Interior of the clearly framed central door opening, bounded by the two jambs, lintel, and lower frame line.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Blank sheet/crop edge connected to the exterior.',
      },
    ],
  },
  {
    objectId: 386492,
    id: 'met-386492-door',
    title: 'Design for a Door',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/386492',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP806494.jpg',
    sha256: '8758063be74641b8f30f6feb4bd6b8f8b4101b8a90c7d9ade2df0871122e4afd',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'middle-octagonal-panel',
        seed: [0.55, 0.49],
        expected: 'closed',
        rationale: 'Interior of the concentric outlined octagonal panel in the middle-right portion of the door design.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Blank sheet/crop edge connected to the exterior.',
      },
    ],
  },
  {
    objectId: 384153,
    id: 'met-384153-chimneypiece',
    title: 'Design for a Chimneypiece',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/384153',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP805413.jpg',
    sha256: '28ac6cd13b0197c94aff481f6eb4c1b91eeffd0cecb47b078f4491beb46e599c',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'fireplace-opening',
        seed: [0.50, 0.55],
        expected: 'closed',
        rationale: 'Interior of the large rectangular fireplace opening enclosed by the architectural frame.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Blank sheet/crop edge connected to the exterior.',
      },
    ],
  },
  {
    objectId: 335918,
    id: 'met-335918-chimneypiece',
    title: 'Design for a Chimneypiece',
    stratum: 'clean-linework',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/335918',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP818915.jpg',
    sha256: '4ca25e17e53389a5d36cabface94444f0e98528422a0ed4dd877bda49e39eee2',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-round-medallion',
        seed: [0.51, 0.52],
        expected: 'closed',
        rationale: 'Interior field of the clearly outlined circular central medallion.',
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
    objectId: 388263,
    id: 'met-388263-ceiling',
    title: 'Design for a ceiling',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/388263',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP811699.jpg',
    sha256: 'a2e902102e17aae5744e8f3abcc8cba0c7b5ae13ec4aa697869d0efcb3870f65',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'round-corner-medallion',
        seed: [0.84, 0.80],
        expected: 'closed',
        rationale: 'Interior of the circular corner medallion enclosed by a continuous round frame.',
      },
      {
        id: 'border-junction',
        seed: [0.73, 0.69],
        expected: 'ambiguous',
        rationale: 'Multiple colored bands, corner turns, and ornamental strokes meet at the border junction, producing competing fill interpretations.',
      },
    ],
  },
  {
    objectId: 388251,
    id: 'met-388251-ceiling',
    title: 'Design for a ceiling',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/388251',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP811648.jpg',
    sha256: '4d3ea1ddc8495e038cfcd4ad4acd505851dc211d35e6bfc117772a7ec171ca72',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-ceiling-field',
        seed: [0.50, 0.55],
        expected: 'closed',
        rationale: 'Large pale central field enclosed by the continuous inner architectural frame.',
      },
      {
        id: 'lower-ornamental-flourish',
        seed: [0.50, 0.83],
        expected: 'ambiguous',
        rationale: 'Layered scrolls, wash, and incomplete ornamental contours overlap at the lower central flourish.',
      },
    ],
  },
  {
    objectId: 343266,
    id: 'met-343266-wall-decoration',
    title: 'Design for a Painted Wall Decoration',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/343266',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP801520.jpg',
    sha256: '4e8af5cfc865bc5474eac2daa0f375b6d11cbb8f1b55cb1fe02c12ec2b10e480',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'inscribed-stone-plaque',
        seed: [0.29, 0.64],
        expected: 'closed',
        rationale: 'Interior of the small rectangular inscribed plaque bounded by a continuous architectural outline.',
      },
      {
        id: 'central-column-arch-overlap',
        seed: [0.52, 0.44],
        expected: 'ambiguous',
        rationale: 'Column, arch, masonry, wash, and perspective contours overlap without a single reliable enclosing boundary.',
      },
    ],
  },
  {
    objectId: 361860,
    id: 'met-361860-door-stucco',
    title: 'Design for a Door and Stucco Overdoor Decorations',
    stratum: 'structured-wash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/361860',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP803173.jpg',
    sha256: '7b937b439e7b69b48f94a33211a07e93b6acc923f18b5ca30755adf66d34f19c',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'left-upper-door-panel',
        seed: [0.44, 0.56],
        expected: 'closed',
        rationale: 'Interior field of the upper-left door panel enclosed by its decorative frame.',
      },
      {
        id: 'overdoor-scrollwork',
        seed: [0.45, 0.25],
        expected: 'ambiguous',
        rationale: 'Dense overlapping scrolls and broken ornamental contours above the door do not define one safe fill enclosure.',
      },
    ],
  },

  {
    objectId: 338935,
    id: 'met-338935-vaulted-passage',
    title: 'Architectural Capriccio: Vaulted Passageway Leading to a Square',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338935',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP810127.jpg',
    sha256: 'f887ba7c5a65394aab5723568240cf384a8ed1e637525f3605b284420f36f6c8',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-receding-architecture',
        seed: [0.50, 0.68],
        expected: 'ambiguous',
        rationale: 'Receding arches, figures, floor lines, broken contours, and wash create multiple plausible region boundaries.',
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
    objectId: 338936,
    id: 'met-338936-vaulted-passage',
    title: 'Architectural Capriccio: A Vaulted Passageway',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338936',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP810410.jpg',
    sha256: '0baaed0a14fdcd2e14fd7b9c0767967103c2a348ad1a255bf551a0f92f06aa8c',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-arch-stair-overlap',
        seed: [0.50, 0.58],
        expected: 'ambiguous',
        rationale: 'Nested arches, stair/perspective lines, figures, and wash overlap without a single reliable enclosure.',
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
    objectId: 338948,
    id: 'met-338948-grand-staircase',
    title: 'Architectural Fantasy: Figures on a Grand Staircase',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/338948',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP810420.jpg',
    sha256: '611b089ca5f169aa4f02141782775556bf42916b24b5f9c993b1aaea0a738e2b',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'stair-figure-overlap',
        seed: [0.51, 0.69],
        expected: 'ambiguous',
        rationale: 'Grand-stair lines, figures, columns, and brown wash intersect without one unambiguous semantic fill region.',
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
    objectId: 340309,
    id: 'met-340309-door-knocker',
    title: 'Design for a Door-Knocker (?) With Two Nymphs',
    stratum: 'complex-linewash',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/340309',
    imageUrl: 'https://images.metmuseum.org/CRDImages/dp/web-large/DP803178.jpg',
    sha256: '0f4f813008eee6f85e5838ac6ff043a28051882a777882683a2f417632a7c6c4',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-ornament-overlap',
        seed: [0.50, 0.53],
        expected: 'ambiguous',
        rationale: 'Figures, drapery, masks, scrolls, and wash overlap around the center, giving multiple plausible local enclosures.',
      },
      {
        id: 'right-paper-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer sheet/crop edge connected to the exterior.',
      },
    ],
  },
];

export const REGION_V3_FINAL_LARGE_CRITERIA = Object.freeze({
  totalQueries: 24,
  expectedByLabel: Object.freeze({ closed: 8, open: 8, ambiguous: 8 }),
  minimumOverallPass: 21,
  minimumPassByLabel: Object.freeze({ closed: 7, open: 7, ambiguous: 7 }),
});
