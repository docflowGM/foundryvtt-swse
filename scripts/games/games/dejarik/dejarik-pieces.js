/** Dejarik holomonster catalog. */

export const DEJARIK_PIECES = Object.freeze([
  { id: 'mantellian_savrip', label: 'Mantellian Savrip', atk: 4, hp: 8, rng: 1, mov: 2, ability: 'brutal-slam' },
  { id: 'kintan_strider', label: 'Kintan Strider', atk: 3, hp: 6, rng: 1, mov: 3, ability: 'lunge' },
  { id: 'ghhhk', label: 'Ghhhk', atk: 2, hp: 5, rng: 2, mov: 2, ability: 'spit' },
  { id: 'grimtaash', label: 'Grimtaash the Molator', atk: 5, hp: 7, rng: 1, mov: 1, ability: 'maul' },
  { id: 'houjix', label: 'Houjix', atk: 2, hp: 7, rng: 1, mov: 2, ability: 'guard' },
  { id: 'klor_slug', label: "K'lor'slug", atk: 3, hp: 4, rng: 1, mov: 3, ability: 'burrow' },
  { id: 'monnok', label: 'Monnok', atk: 3, hp: 5, rng: 2, mov: 2, ability: 'pounce' },
  { id: 'ngok', label: "Ng'ok", atk: 4, hp: 6, rng: 1, mov: 2, ability: 'rend' },
  { id: 'bulbous', label: 'Bulbous', atk: 2, hp: 8, rng: 1, mov: 1, ability: 'anchor' },
  { id: 'scrimp', label: 'Scrimp', atk: 1, hp: 3, rng: 3, mov: 3, ability: 'skitter' },
  { id: 'karkath', label: 'Karkath', atk: 4, hp: 5, rng: 2, mov: 2, ability: 'snap' }
]);

export function getDejarikPiece(id) {
  return DEJARIK_PIECES.find(piece => piece.id === id) ?? DEJARIK_PIECES[0];
}

export function defaultDejarikTeam(offset = 0) {
  return [0, 1, 2, 3].map(index => DEJARIK_PIECES[(index + offset) % DEJARIK_PIECES.length].id);
}
