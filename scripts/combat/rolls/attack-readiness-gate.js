/**
 * Attack-execution readiness gate (E4-C1 WP5-C1). A thin consumer of the one readiness authority (engine/equipment/combat-readiness.js); it owns no
 * posture rule. Every exported attack-execution entry point (rollAttack, rollAttackAndDamageWithNarration, SWSERoll.rollAttack / rollAutofire /
 * rollFullAttack overrides) calls it before any selection, spend, dice, fire-state mutation or chat message.
 */
import { isCombatSourceReady, getWeaponReadiness, isVirtualUnarmedAttack } from "/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js";
import { resolveAttackDomain } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-domain-router.js";

/** A VERIFIED vehicle / starship installation: the attack routes to a vehicle domain through a real vehicle-type actor that owns this very weapon Item. A flag in the attack options proves nothing. */
export function verifiedVehicleInstallation(actor, weapon, rollOptions = {}) {
  try {
    const route = resolveAttackDomain({ actor, item: weapon, vehicle: rollOptions.vehicleActor ?? null, sourceContext: { vehicleActor: rollOptions.vehicleActor ?? null, abstractCrewQuality: rollOptions.abstractCrewQuality ?? null } });
    if (!route?.ok || route.domain === 'character') return false;
    const vehicle = route.normalizedContext?.vehicleActor ?? null;
    if (!vehicle || vehicle.type !== 'vehicle') return false;
    const held = vehicle.items?.get?.(weapon?.id) ?? Array.from(vehicle.items ?? []).find((i) => i?.id === weapon?.id);
    return !!held && held === weapon;
  } catch { return false; }
}

/**
 * E4-C1 WP5-C1: the equipment-readiness gate at the attack EXECUTION boundary (shared by rollAttack and the narrated entry point).
 * It owns no rule: it asks the one readiness authority (combat-readiness.js). It runs before any selection, option spend, temporal spend, ammunition
 * spend, dice, fire-state mutation or chat message, so a refusal leaves nothing behind.
 *   - a VERIFIED vehicle / starship installation (a real vehicle-type actor that owns this very weapon Item, per the attack-domain router) is the
 *     existing certified crew/installation path; hand occupancy does not apply to it. Nothing else is exempt: an unverified vehicle weapon, a
 *     mounted or worn weapon, or a vehicle flag in the options is judged like any other weapon and fails closed.
 *   - the genuine virtual unarmed strike is eligible through its narrow authority (isVirtualUnarmedAttack).
 *   - every other weapon must be an Item this actor OWNS (the very document, not a look-alike sharing an id) and be verified READIED.
 * @returns {{ok:boolean, path?:string, reason?:string, detail?:object}}
 */
export function checkAttackSourceReadiness(actor, weapon, rollOptions = {}) {
  try {
    if (verifiedVehicleInstallation(actor, weapon, rollOptions)) return { ok: true, path: 'vehicle-installation' };
    if (isVirtualUnarmedAttack(actor, weapon)) return { ok: true, path: 'virtual-unarmed' };
    const owned = Array.from(actor?.items ?? []).find((i) => i === weapon || (weapon?.uuid && i?.uuid === weapon.uuid));
    if (!owned) return { ok: false, reason: 'weapon-not-owned-by-attacker' };
    if (isCombatSourceReady(actor, owned)) return { ok: true, path: 'ready-weapon' };
    const r = getWeaponReadiness(actor, owned);
    return { ok: false, reason: 'weapon-not-readied', detail: { declared: r?.declaredPosture ?? null, effective: r?.effectivePosture ?? null, gates: r?.gates ?? [], pending: r?.pending ?? null } };
  } catch (err) {
    return { ok: false, reason: 'readiness-unverifiable', detail: { error: err?.message ?? String(err) } };
  }
}

export function refuseUnreadyAttack(weapon, check) {
  const why = check.reason === 'weapon-not-owned-by-attacker' ? 'it is not one of this actor\'s own weapons'
    : check.reason === 'readiness-unverifiable' ? 'its readiness could not be verified'
    : `it is not verified ready${check.detail?.effective ? ` (${String(check.detail.effective).toLowerCase()})` : ''}${check.detail?.gates?.length ? ` [${check.detail.gates.join(', ')}]` : ''}`;
  ui?.notifications?.warn?.(`${weapon?.name ?? 'Weapon'} cannot attack: ${why}.`);
  return null;
}
