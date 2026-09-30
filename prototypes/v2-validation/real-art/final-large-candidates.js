// Gate C large final blind candidate sources.
// Candidate selection is frozen before human seed/label annotation and before
// any Region classifier execution on these sources.
//
// Strata:
// - clean-linework: 4
// - structured-wash: 4
// - complex-linewash: 4
//
// All sources are Metropolitan Museum of Art Open Access / Public Domain and
// were checked against all existing Region train/holdout/blind manifests before
// this file was created.

export const REGION_FINAL_LARGE_CANDIDATES = [
  { objectId: 679427, id: 'met-679427-door', stratum: 'clean-linework', title: 'Design for a Door' },
  { objectId: 386492, id: 'met-386492-door', stratum: 'clean-linework', title: 'Design for a Door' },
  { objectId: 384153, id: 'met-384153-chimneypiece', stratum: 'clean-linework', title: 'Design for a Chimneypiece' },
  { objectId: 335918, id: 'met-335918-chimneypiece', stratum: 'clean-linework', title: 'Design for a Chimneypiece' },

  { objectId: 388263, id: 'met-388263-ceiling', stratum: 'structured-wash', title: 'Design for a ceiling' },
  { objectId: 388251, id: 'met-388251-ceiling', stratum: 'structured-wash', title: 'Design for a ceiling' },
  { objectId: 343266, id: 'met-343266-wall-decoration', stratum: 'structured-wash', title: 'Design for a Painted Wall Decoration' },
  { objectId: 361860, id: 'met-361860-door-stucco', stratum: 'structured-wash', title: 'Design for a Door and Stucco Overdoor Decorations' },

  { objectId: 338935, id: 'met-338935-vaulted-passage', stratum: 'complex-linewash', title: 'Architectural Capriccio: Vaulted Passageway Leading to a Square' },
  { objectId: 338936, id: 'met-338936-vaulted-passage', stratum: 'complex-linewash', title: 'Architectural Capriccio: A Vaulted Passageway' },
  { objectId: 338948, id: 'met-338948-grand-staircase', stratum: 'complex-linewash', title: 'Architectural Fantasy: Figures on a Grand Staircase' },
  { objectId: 340309, id: 'met-340309-door-knocker', stratum: 'complex-linewash', title: 'Design for a Door-Knocker (?) With Two Nymphs' },
];
