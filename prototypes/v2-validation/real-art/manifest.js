// Labels frozen before first resolver execution on this corpus.
// Numeric policy selection may use only split="train"; holdout labels are never used for selection.
export const REAL_ART_CORPUS = [
  {
    id: 'met-343905-architectural', split: 'train', kind: 'architectural-clean',
    title: 'Architectural Drawing',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/343905',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/343905/758123/main-image',
    rights: 'Public Domain / The Met Open Access',
    queries: [
      { id: 'left-oval', seed: [0.27, 0.54], expected: 'closed' },
      { id: 'right-lower-panel', seed: [0.72, 0.75], expected: 'closed' },
      { id: 'outer-paper', seed: [0.015, 0.50], expected: 'open' },
    ],
  },
  {
    id: 'met-340292-ornament', split: 'train', kind: 'ornament-dense',
    title: 'Architectural Drawing',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/340292',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/340292/750832/main-image',
    rights: 'Public Domain / The Met Open Access',
    queries: [
      { id: 'top-right-panel', seed: [0.82, 0.15], expected: 'closed' },
      { id: 'lower-right-ornament', seed: [0.84, 0.76], expected: 'closed' },
      { id: 'bottom-paper', seed: [0.50, 0.985], expected: 'open' },
    ],
  },
  {
    id: 'met-340479-venus', split: 'train', kind: 'figure-clean',
    title: 'Venus with Doves',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/340479',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/340479/761183/main-image',
    rights: 'Public Domain / The Met Open Access',
    queries: [
      { id: 'inside-medallion', seed: [0.50, 0.17], expected: 'closed' },
      { id: 'outside-medallion', seed: [0.04, 0.50], expected: 'open' },
    ],
  },
  {
    id: 'commons-swainson-hawk', split: 'train', kind: 'modern-line-art',
    title: 'Black and white line art drawing of swainson hawk bird in flight',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Black_and_white_line_art_drawing_of_swainson_hawk_bird_in_flight.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Black_and_white_line_art_drawing_of_swainson_hawk_bird_in_flight.jpg',
    rights: 'Public Domain; Kerris Paul, U.S. Fish and Wildlife Service',
    queries: [
      { id: 'wing-feather-cell', seed: [0.73, 0.48], expected: 'closed' },
      { id: 'sky', seed: [0.06, 0.08], expected: 'open' },
    ],
  },
  {
    id: 'met-347891-woman-reading', split: 'train', kind: 'wash-loose',
    title: 'Woman Reading',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/347891',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/347891/747729/main-image',
    rights: 'Public Domain / The Met Open Access',
    queries: [
      { id: 'head-loose-boundary', seed: [0.59, 0.26], expected: 'ambiguous' },
      { id: 'paper-corner', seed: [0.04, 0.04], expected: 'open' },
    ],
  },
  {
    id: 'met-347897-potiphar', split: 'train', kind: 'faint-sketch',
    title: "Potiphar's Wife Accusing Joseph Before her Husband",
    sourcePage: 'https://www.metmuseum.org/art/collection/search/347897',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/347897/747727/main-image',
    rights: 'Public Domain / The Met Open Access',
    queries: [
      { id: 'faint-central-figure', seed: [0.47, 0.42], expected: 'ambiguous' },
      { id: 'paper-corner', seed: [0.05, 0.05], expected: 'open' },
    ],
  },
  {
    id: 'met-390078-capital', split: 'holdout', kind: 'wash-ornament',
    title: 'Architectural Drawings',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/390078',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/390078/752109/main-image',
    rights: 'Public Domain / The Met Open Access',
    queries: [
      { id: 'ornament-eye', seed: [0.57, 0.34], expected: 'closed' },
      { id: 'right-paper', seed: [0.97, 0.50], expected: 'open' },
    ],
  },
  {
    id: 'commons-deer-line-art', split: 'holdout', kind: 'modern-hatched-line-art',
    title: 'Animal line art drawing',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Animal_line_art_drawing.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Animal_line_art_drawing.jpg',
    rights: 'Public Domain; Kelley Tom, U.S. Fish and Wildlife Service',
    queries: [
      { id: 'torso-hatched', seed: [0.37, 0.42], expected: 'ambiguous' },
      { id: 'background-between-legs', seed: [0.38, 0.87], expected: 'open' },
    ],
  },
  {
    id: 'met-459238-cottage', split: 'holdout', kind: 'landscape-wash',
    title: 'Cottage near the Entrance to a Wood',
    sourcePage: 'https://www.metmuseum.org/art/collection/search/459238',
    imageUrl: 'https://collectionapi.metmuseum.org/api/collection/v1/iiif/459238/1804812/main-image',
    rights: 'Public Domain / The Met Open Access',
    queries: [
      { id: 'door-and-wash', seed: [0.69, 0.52], expected: 'ambiguous' },
      { id: 'outer-paper', seed: [0.98, 0.50], expected: 'open' },
    ],
  },
];
