/**
 * Range authority of a vehicle-managed weapon attack (WE-2, P6B-D-053).
 *
 * The distance comes from the actual TOKENS of the attacking vehicle and the target on the active scene, the table from the
 * ENCOUNTER's scale (vehicle-encounter-scale.js) and the weapon's Table 10-2 row (data/vehicle-weapon-ranges.json, read through the
 * existing RangeEngine), the modifier from the Core band penalties (vehicle-weapon-range.js). The result is the ONLY source of the
 * band for a vehicle-managed weapon: rollAttack overwrites any caller-supplied band, distance or explicit penalty with it, so a macro
 * cannot move an attack to point blank. Unresolved or out-of-range attacks are refused by the caller before any cost.
 */
import { RangeEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/range-engine.js";
import { resolveEncounterScale } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-encounter-scale.js";
import { resolveVehicleRange, RANGE_REASONS } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-range.js";
import { resolveVehicleWeaponAuthority } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";

const firstToken = actor => {
  const tokens = Array.from(actor?.getActiveTokens?.() ?? []);
  const sceneId = globalThis.canvas?.scene?.id;
  return (sceneId ? tokens.find(t => (t?.document?.parent?.id ?? t?.scene?.id) === sceneId) : null) ?? tokens[0] ?? null;
};
/** The active scene's grid: pixels per square and grid type (1 square, 0 gridless). */
const sceneGrid = () => {
  const c = globalThis.canvas;
  const size = Number(c?.grid?.size ?? c?.scene?.grid?.size);
  const type = c?.grid?.type ?? c?.scene?.grid?.type;
  return { size, type: typeof type === 'number' ? type : undefined };
};

/**
 * @returns {Promise<{ok:true, slug, scale, squares, band, bandLabel}|{ok:false, reason:string, squares?:number, longestBand?:number|null}>}
 */
export async function resolveVehicleAttackRange({ vehicle, weapon, target, combat = globalThis.game?.combat ?? null }) {
  const authority = resolveVehicleWeaponAuthority(weapon);
  if (!authority?.ok) return { ok: false, reason: RANGE_REASONS.TABLE_NOT_IDENTIFIED };
  const slug = authority.rangeSlug ?? null;
  if (!slug) return { ok: false, reason: RANGE_REASONS.TABLE_NOT_IDENTIFIED };
  const scale = resolveEncounterScale({ attacker: vehicle, target, combat }).scale;
  const profiles = await RangeEngine.ensureVehicleProfiles();
  const profile = profiles ? RangeEngine.getVehicleProfile(slug) : null;
  return resolveVehicleRange({ slug, scale, attackerToken: firstToken(vehicle), targetToken: firstToken(target), grid: sceneGrid(), profile });
}

const REASON_TEXT = {
  [RANGE_REASONS.DISTANCE_UNRESOLVED]: 'the distance to the target cannot be measured (the attacker and the target both need a token on the active scene)',
  [RANGE_REASONS.GRID_UNRESOLVED]: 'the scene grid size is unknown',
  [RANGE_REASONS.GRID_UNSUPPORTED]: 'this scene\'s grid type is not supported for vehicle ranges (square or gridless only)',
  [RANGE_REASONS.TABLE_NOT_IDENTIFIED]: 'the weapon\'s type does not identify a Table 10-2 range row',
  [RANGE_REASONS.TABLE_MISSING]: 'the vehicle weapon range table could not be read',
  [RANGE_REASONS.SCALE_UNDETERMINED]: 'the encounter\'s scale cannot be determined',
  [RANGE_REASONS.OUT_OF_RANGE]: 'the target is beyond the weapon\'s long range'
};
export const describeRangeRefusal = r => `${REASON_TEXT[r.reason] ?? r.reason}${r.reason === RANGE_REASONS.OUT_OF_RANGE ? ` (${r.squares} squares; long range ends at ${r.longestBand})` : ''}`;
