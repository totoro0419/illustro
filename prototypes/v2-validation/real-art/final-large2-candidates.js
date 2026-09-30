// Gate C second large final blind candidate sources.
//
// Frozen before annotation and before any Region classifier execution on these
// sources. All object IDs were checked against the complete existing Region
// train/holdout/blind/first-large corpora and were unused at freeze time.
//
// Strata:
// - clean-linework: 4
// - structured-wash: 4
// - complex-linewash: 4

export const REGION_FINAL_LARGE_2_CANDIDATES = [
  { objectId: 384159, id: 'met-384159-chimneypiece', stratum: 'clean-linework', title: 'Design for a Chimneypiece' },
  { objectId: 386491, id: 'met-386491-door', stratum: 'clean-linework', title: 'Design for a Door' },
  { objectId: 384165, id: 'met-384165-chimneypiece', stratum: 'clean-linework', title: 'Design for a Chimneypiece' },
  { objectId: 365867, id: 'met-365867-chimneypiece', stratum: 'clean-linework', title: 'Design for a Chimneypiece' },

  { objectId: 336183, id: 'met-336183-ceiling', stratum: 'structured-wash', title: 'Design for a Ceiling' },
  { objectId: 388270, id: 'met-388270-ceiling', stratum: 'structured-wash', title: 'Design for a ceiling' },
  { objectId: 388267, id: 'met-388267-ceiling', stratum: 'structured-wash', title: 'Design for a ceiling' },
  { objectId: 388268, id: 'met-388268-ceiling', stratum: 'structured-wash', title: 'Design for a ceiling' },

  { objectId: 343439, id: 'met-343439-architectural-fantasy', stratum: 'complex-linewash', title: 'Architectural Fantasy' },
  { objectId: 365672, id: 'met-365672-architectural-fantasy', stratum: 'complex-linewash', title: 'Architectural Fantasy' },
  { objectId: 343118, id: 'met-343118-architectural-capriccio', stratum: 'complex-linewash', title: 'Architectural Capriccio' },
  { objectId: 336493, id: 'met-336493-roman-ruins', stratum: 'complex-linewash', title: 'Architectural Fantasy with Roman Ruins' },
];
