/**
 * attack-domain-router.js — attack-domain selection authority (Phase 4
 * rolling-system alignment).
 *
 * Phase 3 closed the live vehicle-operator-math bug by routing vehicle
 * attacks through a dedicated call site (crew-skill-router.js), but that
 * safety depended on which UI button the player clicked, not on any check
 * inside the shared rollAttack() pipeline itself — a generic attack
 * initiator (a macro, a future button, a document-wide click delegate)
 * could in principle still pass a vehicle actor straight into rollAttack()
 * with no operator/vehicle context and silently get the vehicle's own
 * (empty) BAB/ability schema. This module is the single place that decides
 * which existing math authority an attack belongs to, based on normalized
 * actor/item/context — not on which button fired it — so rollAttack() can
 * enforce that decision for every caller, not just the ones written so far.
 *
 * This module selects an authority; it does not implement one. It must
 * never contain attack-bonus math of its own (that would duplicate
 * combat-roll-math.js/vehicle-attack-math.js) and must never execute a
 * roll (that would duplicate RollEngine/RollCore).
 */

import { isVehicleWeapon } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";

/**
 * @typedef {Object} AttackDomainResult
 * @property {boolean} ok
 * @property {'character'|'vehicle-actor-gunner'|'vehicle-abstract-crew'|null} domain
 * @property {string|null} resolver - name of the math authority to call (not a live reference, to avoid import cycles with the resolvers themselves).
 * @property {Object|null} normalizedContext
 * @property {string} reason
 * @property {string[]} warnings
 */

/**
 * @param {Object} params
 * @param {Actor} params.actor - the actor rollAttack() would fire as.
 * @param {Item} params.item - the weapon item being fired.
 * @param {Actor|null} [params.operator] - resolved crew member, if already known separately from `actor`.
 * @param {Actor|null} [params.vehicle] - vehicle actor, if already known separately from sourceContext.
 * @param {Object} [params.sourceContext] - rollOptions-shaped context (vehicleActor, abstractCrewQuality, etc.).
 * @returns {AttackDomainResult}
 */
export function resolveAttackDomain({ actor, item, operator = null, vehicle = null, sourceContext = {} } = {}) {
  const warnings = [];

  if (!actor || !item) {
    return { ok: false, domain: null, resolver: null, normalizedContext: null, reason: 'missing-actor-or-item', warnings };
  }

  const contextVehicleActor = sourceContext?.vehicleActor ?? vehicle ?? null;
  const abstractCrewQuality = sourceContext?.abstractCrewQuality ?? null;

  // Case 1: the attacking actor IS the vehicle. The only legitimate live
  // shape of this is an explicit abstract-crew declaration (Phase 4) — a
  // vehicle actor with no such signal has no math authority to fall back to
  // (its own BAB/ability schema is empty by design; this is the exact
  // pre-Phase-3 defect). Structured failure, not a silent vehicle-BAB roll.
  if (actor.type === 'vehicle') {
    if (abstractCrewQuality != null) {
      return {
        ok: true,
        domain: 'vehicle-abstract-crew',
        resolver: 'resolveAbstractCrewAttackBonus',
        normalizedContext: { vehicleActor: actor, weapon: item, crewQuality: abstractCrewQuality },
        reason: 'actor is the vehicle itself with an explicit abstractCrewQuality signal',
        warnings
      };
    }
    warnings.push('actor.type === "vehicle" with no abstractCrewQuality context; refusing to use the vehicle\'s own (empty) BAB/ability schema as an attack bonus.');
    return { ok: false, domain: null, resolver: null, normalizedContext: null, reason: 'vehicle-actor-with-no-crew-context', warnings };
  }

  // Case 2: a resolved actor (gunner, pilot, or otherwise) firing a weapon
  // explicitly on behalf of a vehicle.
  if (contextVehicleActor) {
    if (contextVehicleActor.type !== 'vehicle') {
      warnings.push('sourceContext.vehicleActor was supplied but is not a vehicle-type actor.');
      return { ok: false, domain: null, resolver: null, normalizedContext: null, reason: 'invalid-vehicle-context', warnings };
    }
    return {
      ok: true,
      domain: 'vehicle-actor-gunner',
      resolver: 'resolveVehicleAttackBonus',
      normalizedContext: { gunnerActor: operator ?? actor, vehicleActor: contextVehicleActor, weapon: item },
      reason: 'gunner/operator actor with an explicit vehicleActor context',
      warnings
    };
  }

  // Case 3: a vehicle-flagged weapon item fired with no vehicle context at
  // all. This is NOT automatically the vehicle-operator bug: combat-roll-math.js
  // already has a documented, intentional mechanic (the Spacehound talent
  // check in actorIsProficientForAttack) for a character actor personally
  // wielding a vehicle-classified weapon with no vehicle actor involved at
  // all. Hard-blocking this case would break that existing mechanic, which
  // is why this only warns for diagnostic visibility rather than failing —
  // the character formula (which already checks isVehicleWeapon for
  // Spacehound) is the correct authority here, not an error.
  if (isVehicleWeapon(item)) {
    warnings.push('Item is vehicle-flagged but no vehicle/abstract-crew context was supplied; routing through the character formula (matches the existing Spacehound-proficiency personal-use mechanic in combat-roll-math.js — not the vehicle-operator defect Phase 3 fixed, which required actor.type === "vehicle").');
  }

  return {
    ok: true,
    domain: 'character',
    resolver: 'resolveAttackBonus',
    normalizedContext: { actor, weapon: item },
    reason: 'non-vehicle actor',
    warnings
  };
}
