/**
 * Capital-ship attack penalty (Core Rulebook, Vehicle Combat, "Attack with Vehicle Weapon" -> Capital Ships):
 * capital ship weapons are built for bombardment of large or immobile targets and have difficulty hitting small
 * enemies; when attacking a target smaller than Colossal, a vehicle that is Colossal (frigate) size or larger takes a
 * -20 penalty on attack rolls. Point-defense weapons are designed to attack small targets and take no penalty
 * (Starships of the Galaxy: a point-defense weapon "takes no penalty for attacking targets of smaller than Colossal
 * size"; "like all capital ship weapons" a heavy space mine takes the -20).
 *
 * Scope as implemented: the penalty belongs to the ATTACKER (a vehicle of Colossal (frigate), (cruiser) or (station)
 * size) and applies to every attack it makes at a target of a size smaller than Colossal, except with a point-defense
 * weapon. No point-defense weapon is installable (the modification is not in the catalog), so none is exempt here.
 * Rule text verified by the project owner against Core Rulebook printed p. 171 (PDF p. 172); the repository OCR of
 * that sentence is partly damaged, so the PDF is the authority.
 *
 * Sizes come from verified records / the vehicle's size, never from names. An unknown size is UNKNOWN, not "small".
 * Pure; no Foundry globals.
 */
export const CAPITAL_SHIP_TARGETING_PENALTY = -20;

const ORDER = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
const CAPITAL = new Set(['colossal (frigate)', 'colossal (cruiser)', 'colossal (station)']);

/** Normalise a printed size to a rank (Colossal and every Colossal subtype share the top rank). null = unknown. */
export function sizeRank(size) {
  const s = String(size ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith('colossal')) return ORDER.indexOf('colossal');
  const i = ORDER.indexOf(s);
  return i < 0 ? null : i;
}

export const isCapitalShipSize = size => CAPITAL.has(String(size ?? '').trim().toLowerCase());

/**
 * @param {{attackerSize:string|null, targetSize:string|null, pointDefense?:boolean}} p
 * @returns {{status:'NOT_CAPITAL_ATTACKER'|'POINT_DEFENSE_EXEMPT'|'TARGET_NOT_SMALLER'|'APPLIES'|'ATTACKER_SIZE_UNKNOWN'|'TARGET_SIZE_UNKNOWN', value:number}}
 */
export function capitalShipAttackPenalty({ attackerSize, targetSize, pointDefense = false }) {
  if (sizeRank(attackerSize) === null) return { status: 'ATTACKER_SIZE_UNKNOWN', value: 0 };
  if (!isCapitalShipSize(attackerSize)) return { status: 'NOT_CAPITAL_ATTACKER', value: 0 };
  if (pointDefense === true) return { status: 'POINT_DEFENSE_EXEMPT', value: 0 };
  const t = sizeRank(targetSize);
  if (t === null) return { status: 'TARGET_SIZE_UNKNOWN', value: 0 };
  return t < ORDER.indexOf('colossal') ? { status: 'APPLIES', value: CAPITAL_SHIP_TARGETING_PENALTY } : { status: 'TARGET_NOT_SMALLER', value: 0 };
}
