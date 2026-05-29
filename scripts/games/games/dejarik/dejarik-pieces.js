/** Dejarik holomonster catalog. */

/**
 * Classic Dejarik stat fields are stored alongside the Holopad skirmish fields.
 * The current engine still uses HP/range/damage for play, but these Attack /
 * Defense / Movement ratings let the UI and future classic-rules mode expose
 * the fuller monster stat blocks without inventing a second catalog later.
 */
export const DEJARIK_PIECES = Object.freeze([
  {
    id: 'mantellian_savrip', label: 'Mantellian Savrip', atk: 4, hp: 8, rng: 1, mov: 2,
    classic: { attack: 6, defense: 6, movement: 2 }, ability: 'brutal-slam', abilityLabel: 'Brutal Slam',
    abilityDescription: 'On a surviving adjacent hit, pushes the target one legal space directly away if possible.'
  },
  {
    id: 'kintan_strider', label: 'Kintan Strider', atk: 3, hp: 6, rng: 1, mov: 3,
    classic: { attack: 2, defense: 7, movement: 3 }, ability: 'lunge', abilityLabel: 'Lunge',
    abilityDescription: 'Threatens one extra space in a clear line when attacking.'
  },
  {
    id: 'ghhhk', label: 'Ghhhk', atk: 2, hp: 5, rng: 2, mov: 2,
    classic: { attack: 4, defense: 3, movement: 2 }, ability: 'spit', abilityLabel: 'Spit',
    abilityDescription: 'Keeps its longer ranged attack profile and ignores one point of guard reduction.'
  },
  {
    id: 'grimtaash', label: 'Grimtaash the Molator', atk: 5, hp: 7, rng: 1, mov: 1,
    classic: { attack: 8, defense: 2, movement: 2 }, ability: 'maul', abilityLabel: 'Maul',
    abilityDescription: 'Deals +1 damage to an already wounded target.'
  },
  {
    id: 'houjix', label: 'Houjix', atk: 2, hp: 7, rng: 1, mov: 2,
    classic: { attack: 4, defense: 4, movement: 1 }, ability: 'guard', abilityLabel: 'Guard',
    abilityDescription: 'Reduces incoming non-spit damage by 1, to a minimum of 1.'
  },
  {
    id: 'klor_slug', label: "K'lor'slug", atk: 3, hp: 4, rng: 1, mov: 3,
    classic: { attack: 7, defense: 3, movement: 2 }, ability: 'sacrifice', abilityLabel: "K'lor'slug Sacrifice",
    abilityDescription: 'When it attacks adjacent, both the K\'lor\'slug and its target are defeated.'
  },
  {
    id: 'monnok', label: 'Monnok', atk: 3, hp: 5, rng: 2, mov: 2,
    classic: { attack: 6, defense: 5, movement: 3 }, ability: 'pounce', abilityLabel: 'Pounce',
    abilityDescription: 'Threatens one extra space in a clear line when attacking.'
  },
  {
    id: 'ngok', label: "Ng'ok", atk: 4, hp: 6, rng: 1, mov: 2,
    classic: { attack: 3, defense: 8, movement: 1 }, ability: 'rend', abilityLabel: 'Rend',
    abilityDescription: 'Deals +1 damage if the target was already damaged.'
  },
  {
    id: 'bulbous', label: 'Bulbous', atk: 2, hp: 8, rng: 1, mov: 1,
    classic: { attack: 3, defense: 7, movement: 1 }, ability: 'anchor', abilityLabel: 'Anchor',
    abilityDescription: 'Cannot be pushed by slam effects.'
  },
  {
    id: 'scrimp', label: 'Scrimp', atk: 1, hp: 3, rng: 3, mov: 3,
    classic: { attack: 2, defense: 5, movement: 3 }, ability: 'skitter', abilityLabel: 'Skitter',
    abilityDescription: 'May immediately retreat to the space it just left.'
  },
  {
    id: 'karkath', label: 'Karkath', atk: 4, hp: 5, rng: 2, mov: 2,
    classic: { attack: 5, defense: 4, movement: 2 }, ability: 'snap', abilityLabel: 'Snap',
    abilityDescription: 'Deals +1 damage when striking from beyond adjacent range.'
  }
]);

export function getDejarikPiece(id) {
  return DEJARIK_PIECES.find(piece => piece.id === id) ?? DEJARIK_PIECES[0];
}

export function defaultDejarikTeam(offset = 0) {
  return [0, 1, 2, 3].map(index => DEJARIK_PIECES[(index + offset) % DEJARIK_PIECES.length].id);
}
