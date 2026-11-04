/**
 * Autofire and Burst Fire of an AUTOFIRE-CAPABLE vehicle weapon (owner ruling V-P6C-08: Burst Fire applies to autofire-capable vehicle weapons).
 *
 *   Autofire (Core, Special Combat Rules: Autofire): an area attack at -5. At starship scale every area attack is resolved against a single target
 *   (Core, Vehicles), and a miss deals half damage (V-P6C-07). At character scale autofire covers a 2x2 area of targets, which is not automated: refused.
 *   Burst Fire (feat): autofire against ONE target at -5 for +2 weapon dice, not an area attack. The dice are added before the damage multiplier
 *   (V-P6C-10). The feat belongs to the NAMED operating actor; an abstract crew has no feats, so it is refused.
 *
 * A weapon is autofire-capable only when its sealed/certified authority says so (never inferred from a name). Pure: facts are passed in.
 */
export const FIRE_MODE_REASONS = Object.freeze({
  NOT_CAPABLE: 'AUTOFIRE_CAPABILITY_NOT_ESTABLISHED',
  NO_NAMED_OPERATOR: 'BURST_FIRE_REQUIRES_A_NAMED_OPERATOR',
  NO_FEAT: 'BURST_FIRE_FEAT_NOT_OWNED_BY_OPERATOR',
  AREA_AT_CHARACTER_SCALE: 'AUTOFIRE_AREA_AT_CHARACTER_SCALE_NOT_AUTOMATED',
  UNKNOWN_SCALE: 'AUTOFIRE_ENCOUNTER_SCALE_UNDETERMINED'
});
export const AUTOFIRE_PENALTY = -5;

export function requestedVehicleFireMode(o = {}, burstActive = false) {
  if (burstActive || o.fireMode === 'burst') return 'burst';
  if (o.autofire === true || o.attackMode === 'autofire' || o.fireMode === 'autofire') return 'autofire';
  return 'single';
}

/** @returns {{ok:true, mode:string}|{ok:true, mode:'autofire'|'burst', attackPenalty:number, extraDice:number, halfDamageOnMiss:boolean}|{ok:false, reason:string}} */
export function resolveVehicleFireMode({ requested, authority, operatorActor, scale, burstOption = null }) {
  if (requested === 'single' || !requested) return { ok: true, mode: 'single' };
  if (!authority?.ok || authority.autofireCapable !== true) return { ok: false, reason: FIRE_MODE_REASONS.NOT_CAPABLE };
  if (scale !== 'starship' && scale !== 'character') return { ok: false, reason: FIRE_MODE_REASONS.UNKNOWN_SCALE };
  if (requested === 'burst') {
    // Burst Fire is the CombatOptionResolver's own option (feat ownership, eligibility, penalty and extra dice): this adapter only supplies the
    // named operating actor's result. An abstract crew has no feats.
    if (!operatorActor || operatorActor.type === 'vehicle') return { ok: false, reason: FIRE_MODE_REASONS.NO_NAMED_OPERATOR };
    if (!burstOption?.available) return { ok: false, reason: FIRE_MODE_REASONS.NO_FEAT };
    return { ok: true, mode: 'burst', attackPenalty: burstOption.attackModifier, extraDice: burstOption.damageExtraWeaponDice, halfDamageOnMiss: false };
  }
  if (scale === 'character') return { ok: false, reason: FIRE_MODE_REASONS.AREA_AT_CHARACTER_SCALE };
  return { ok: true, mode: 'autofire', attackPenalty: AUTOFIRE_PENALTY, extraDice: 0, halfDamageOnMiss: true };
}

/** The persisted firing mode of one weapon (a vehicle flag keyed by the weapon Item id). Only 'autofire' is ever stored. */
export const FIRE_MODE_FLAG = 'vehicleFireMode';
export const MODE_REASONS = Object.freeze({ MODE_NOT_SET: 'AUTOFIRE_MODE_NOT_SET', NOT_AUTHORIZED: 'FIRE_MODE_NOT_AUTHORIZED', ACTION_UNAVAILABLE: 'FIRE_MODE_SWIFT_ACTION_UNAVAILABLE' });
export const readPersistedFireMode = (vehicle, itemId) => (vehicle?.flags?.swse?.[FIRE_MODE_FLAG]?.[itemId] === 'autofire' ? 'autofire' : 'single');
