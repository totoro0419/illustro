// Region V3 seventh fresh blind final corpus.
//
// INTEGRITY RULE:
// - Expected labels and seeds are frozen in Git BEFORE any Region execution
//   consumes this manifest.
// - None of these five artworks appears in the training corpus, exposed V2
//   holdout, or blind sets 1–6.
// - Classifier/evidence behavior is frozen at commit
//   3d8ff53cafafa288f032a3aa458954277bc2e69e.
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

export const REGION_V3_FINAL_BLIND_7 = [
  {
    id: 'met-363354-altar-frontal',
    title: 'Design for Altar Frontal',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/363354',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/363354/750932/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-ornamental-panel',
        seed: [0.52, 0.62],
        expected: 'closed',
        rationale: 'Blank interior of the clearly outlined central ornamental panel.',
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
    id: 'met-385988-rococo-oculus',
    title: "Design for a ceiling in rococo style with a trompe l'oeil oculus",
    sourcePage: 'https://www.metmuseum.org/art/collection/search/385988',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/385988/761484/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-oculus-sky',
        seed: [0.50, 0.26],
        expected: 'closed',
        rationale: 'Pale sky inside the large circular oculus, enclosed by its continuous ornamental frame.',
      },
      {
        id: 'right-sheet-edge',
        seed: [0.985, 0.50],
        expected: 'open',
        rationale: 'Outer paper/crop margin connected to the image exterior.',
      },
    ],
  },
  {
    id: 'met-389369-allegory-dawn',
    title: 'Design for a Ceiling with the Allegory of Dawn',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/389369',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/389369/750351/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'upper-oval-sky',
        seed: [0.50, 0.18],
        expected: 'closed',
        rationale: 'Blank upper field inside the large oval compartment, bounded by the continuous oval frame.',
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
    id: 'met-817136-panini-capriccio',
    title: 'Architectural capriccio with Figures and Antiquities',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/817136',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/817136/2014709/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-receding-colonnade',
        seed: [0.63, 0.58],
        expected: 'ambiguous',
        rationale: 'Receding arches, columns, reliefs, figures, and tonal wash create competing possible boundaries rather than one reliable fill enclosure.',
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
    id: 'met-459622-guardi-ruins',
    title: 'An Architectural Capriccio, with Classical Ruins',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/459622',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/459622/913585/main-image',
    provenance: 'The Metropolitan Museum of Art Open Access; Public Domain',
    queries: [
      {
        id: 'central-ruin-overlap',
        seed: [0.50, 0.55],
        expected: 'ambiguous',
        rationale: 'Broken arches, columns, figures, wash, and perspective construction overlap without one reliable semantic enclosure.',
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

export const REGION_V3_FINAL_BLIND_7_CRITERIA = Object.freeze({
  totalQueries: 10,
  minimumOverallPass: 8,
  expectedByLabel: Object.freeze({ closed: 3, open: 5, ambiguous: 2 }),
  minimumPassByLabel: Object.freeze({ closed: 2, open: 4, ambiguous: 2 }),
});
