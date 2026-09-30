// Region V3 fresh blind final corpus.
//
// INTEGRITY RULE:
// - These expected labels and seeds are frozen in Git BEFORE any V3 blind-final
//   execution consumes this manifest.
// - None of these five artworks appears in the V2/V3 training or exposed
//   development-holdout corpus.
// - If this blind set fails, it becomes exposed development evidence. Do not
//   tune V3 against it and then call the same set blind.
//
// Predeclared final criteria (10 queries):
// - overall: >= 8 / 10 (80%)
// - explicitly ambiguous: 2 / 2 must remain ambiguous
// - closed: >= 2 / 3
// - open: >= 4 / 5
//
// The expected labels are human topological judgments from the source artwork,
// not algorithm outputs.

export const REGION_V3_FINAL_BLIND = [
  {
    id: 'met-342267-architectural',
    title: 'Architectural Drawing',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/342267',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/342267/749458/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-tall-panel',
        seed: [0.54, 0.52],
        expected: 'closed',
        rationale: 'Interior of the clearly framed tall central architectural panel.',
      },
      {
        id: 'right-sheet-margin',
        seed: [0.965, 0.48],
        expected: 'open',
        rationale: 'Unbounded paper at the outer right sheet margin.',
      },
    ],
  },
  {
    id: 'met-356327-ornament',
    title: 'Ornament design after the antique',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/356327',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/356327/749542/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-bird-wing',
        seed: [0.555, 0.225],
        expected: 'closed',
        rationale: 'Interior of the outlined wing shape on the central bird.',
      },
      {
        id: 'right-sheet-margin',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Paper adjacent to the outer right edge/frame.',
      },
    ],
  },
  {
    id: 'met-339088-juvarra',
    title: 'Architectural Study (recto); Separate Sheet with Architectural Drawing (verso)',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/339088',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/339088/760893/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'vault-wash-and-sketch',
        seed: [0.52, 0.20],
        expected: 'ambiguous',
        rationale: 'Dense overlapping wash/sketch evidence without a single reliable closed contour.',
      },
      {
        id: 'left-sheet-margin',
        seed: [0.015, 0.50],
        expected: 'open',
        rationale: 'Outer paper margin at the left edge.',
      },
    ],
  },
  {
    id: 'met-16209-durand',
    title: 'Figure Study (from Sketchbook)',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/16209',
    imageUrl: 'https://images.metmuseum.org/CRDImages/ad/original/263737.jpg',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'faint-head-contour',
        seed: [0.60, 0.30],
        expected: 'ambiguous',
        rationale: 'Very faint incomplete graphite head/neck contour; should not be forced closed.',
      },
      {
        id: 'upper-right-paper',
        seed: [0.85, 0.15],
        expected: 'open',
        rationale: 'Blank paper clearly connected to the sheet exterior.',
      },
    ],
  },
  {
    id: 'commons-willet-line-art',
    title: 'Willet bird line art',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Willet_bird_line_art.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Willet_bird_line_art.jpg',
    provenance: 'Robert W. Hines / U.S. Fish and Wildlife Service; Public Domain',
    queries: [
      {
        id: 'upper-wing-white-patch',
        seed: [0.75, 0.15],
        expected: 'closed',
        rationale: 'White patch enclosed by the dark upper wing structure.',
      },
      {
        id: 'background',
        seed: [0.08, 0.10],
        expected: 'open',
        rationale: 'Blank exterior background.',
      },
    ],
  },
];

export const REGION_V3_FINAL_BLIND_CRITERIA = Object.freeze({
  totalQueries: 10,
  minimumOverallPass: 8,
  expectedByLabel: Object.freeze({ closed: 3, open: 5, ambiguous: 2 }),
  minimumPassByLabel: Object.freeze({ closed: 2, open: 4, ambiguous: 2 }),
});
