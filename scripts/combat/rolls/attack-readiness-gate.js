/**
 * Attack-execution readiness gate (E4-C1 WP5-C1). A thin consumer of the one readiness authority (engine/equipment/combat-readiness.js); it owns no
 * posture rule. Every exported attack-execution entry point (rollAttack, rollAttackAndDamageWithNarration, SWSERoll.rollAttack / rollAutofire /
 * rollFullAttack overrides) calls it before any selection, spend, dice, fire-state mutation or chat message.
 */
import { isCombatSourceReady, getWeaponReadiness, isVirtualUnarmedAttack } from "/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js";
import { resolveAttackDomain } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-domain-router.js";

/**
 * A vehicle weapon ROUTED to a vehicle attack domain (R3). This proves exactly what the attack-domain router and Item ownership can prove, and no more:
 *   - the router accepted a vehicle domain (a real vehicle-type actor is the attack's vehicle context);
 *   - the weapon is the very Item document that vehicle owns (not a look-alike);
 *   - gunner domain: the firing actor is a distinct non-vehicle actor; abstract-crew domain: the firing actor IS that vehicle.
 * It does NOT prove physical installation, crew-station assignment, operator authorization or crew eligibility; no existing combat authority
 * establishes those at this boundary, and no vehicle-mount permission flag is invented here (EQ-004 records the open question).
 * The result is routing evidence only and is reported as such (`certification: 'routing-only'`), never as a certified installation.
 */
export function routedVehicleWeapon(actor, weapon, rollOptions = {}) {
  try {
    const route = resolveAttackDomain({ actor, item: weapon, vehicle: rollOptions.vehicleActor ?? null, sourceContext: { vehicleActor: rollOptions.vehicleActor ?? null, abstractCrewQuality: rollOptions.abstractCrewQuality ?? null } });
    if (!route?.ok || route.domain === 'character') return false;
    const vehicle = route.normalizedContext?.vehicleActor ?? null;
    if (!vehicle || vehicle.type !== 'vehicle') return false;
    if (route.domain === 'vehicle-actor-gunner' && (!actor || actor === vehicle || actor.type === 'vehicle')) return false;
    if (route.domain === 'vehicle-abstract-crew' && actor !== vehicle) return false;
    const held = Array.from(vehicle.items ?? []).find((i) => i === weapon);
    return !!held;
  } catch { return false; }
}

/**
 * E4-C1 WP5-C1/C2: the equipment-readiness gate at the attack EXECUTION boundary (shared by rollAttack and the narrated entry point).
 * It owns no rule: it asks the one readiness authority (combat-readiness.js). It runs before any selection, option spend, temporal spend, ammunition
 * spend, dice, fire-state mutation or chat message, so a refusal leaves nothing behind. It is repeated after every asynchronous boundary and
 * before every irreversible step (see revalidateAttackSource).
 *   - a vehicle weapon ROUTED to a vehicle domain (routedVehicleWeapon: routing evidence only, not installation / operator certification) keeps
 *     the existing vehicle attack path; hand occupancy does not apply to it. Nothing else is exempt: an unrouted vehicle weapon, a mounted or worn
 *     weapon, or a vehicle flag in the options is judged like any other weapon and fails closed.
 *   - the virtual unarmed strike is eligible only when the unarmed-attack authority built it for this actor and it is unaltered (R2).
 *   - every other weapon must BE an Item this actor owns: the very document in actor.items, by identity. A shared id or uuid is not ownership (R1);
 *     the Item that passes is returned as `source` so downstream code can use the exact authorized document.
 * @returns {{ok:boolean, path?:string, source?:object, certification?:string, reason?:string, detail?:object}}
 */
export function checkAttackSourceReadiness(actor, weapon, rollOptions = {}) {
  try {
    if (routedVehicleWeapon(actor, weapon, rollOptions)) return { ok: true, path: 'vehicle-routed-weapon', certification: 'routing-only', source: weapon };
    if (isVirtualUnarmedAttack(actor, weapon)) return { ok: true, path: 'virtual-unarmed', source: weapon };
    const owned = Array.from(actor?.items ?? []).find((i) => i === weapon);
    if (!owned) return { ok: false, reason: 'weapon-not-owned-by-attacker' };
    if (isCombatSourceReady(actor, owned)) return { ok: true, path: 'ready-weapon', source: owned };
    const r = getWeaponReadiness(actor, owned);
    return { ok: false, reason: 'weapon-not-readied', detail: { declared: r?.declaredPosture ?? null, effective: r?.effectivePosture ?? null, gates: r?.gates ?? [], pending: r?.pending ?? null } };
  } catch (err) {
    return { ok: false, reason: 'readiness-unverifiable', detail: { error: err?.message ?? String(err) } };
  }
}

/**
 * R4: re-check an attack source after an asynchronous boundary (dialog, hook, Force Point prompt, special question, action / ammunition spend) and
 * before the next irreversible step. Readiness is read live on every call, so equipment changed while the boundary was open is seen here.
 * On refusal the player is told once and `false` is returned; the caller must stop and roll back whatever it already paid.
 * @param {string} boundary short label of the boundary just crossed (diagnostic only)
 */
export function revalidateAttackSource(actor, weapon, rollOptions = {}, boundary = 'an earlier step') {
  const check = checkAttackSourceReadiness(actor, weapon, rollOptions);
  if (check.ok) return true;
  refuseUnreadyAttack(weapon, { ...check, detail: { ...(check.detail ?? {}), changedDuring: boundary } });
  return false;
}

export function refuseUnreadyAttack(weapon, check) {
  const changed = check.detail?.changedDuring ? ` (checked again after ${check.detail.changedDuring})` : '';
  const why = check.reason === 'weapon-not-owned-by-attacker' ? 'it is not one of this actor\'s own weapons'
    : check.reason === 'readiness-unverifiable' ? 'its readiness could not be verified'
    : `it is not verified ready${check.detail?.effective ? ` (${String(check.detail.effective).toLowerCase()})` : ''}${check.detail?.gates?.length ? ` [${check.detail.gates.join(', ')}]` : ''}`;
  ui?.notifications?.warn?.(`${weapon?.name ?? 'Weapon'} cannot attack: ${why}${changed}.`);
  return null;
}
