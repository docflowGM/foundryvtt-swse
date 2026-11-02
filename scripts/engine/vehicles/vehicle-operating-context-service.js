/**
 * P6B-0 runtime entry points for the vehicle operating context: GM environment adjudication and the vehicle Pilot
 * check through the existing skill roll authority (scripts/rolls/skills.js rollSkill). No second dice engine.
 */
import { planEnvironmentChange, vehiclePilotCheck, assignedPilotEntry, decidePilotRoller, vehicleSkillEquipmentBonus } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-operating-context.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { rollSkill } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { RollCore } from "/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js";

export class VehicleOperatingContextService {
  /** GM sets 'atmosphere' | 'space' | 'unknown' (audited). */
  static async setEnvironment(vehicle, state, reason = '') {
    const plan = planEnvironmentChange(vehicle, { state, user: globalThis.game?.user, reason, at: Date.now() });
    if (!plan.ok) return { success: false, reasons: plan.reasons };
    await ActorEngine.updateActor(vehicle, plan.update, { source: 'vehicle-environment' });
    return { success: true, state };
  }

  /**
   * Pilot check for a vehicle. An assigned pilot is resolved here and must be a valid, rollable Actor: an unresolved
   * assignment fails explicitly (ASSIGNED_PILOT_UNAVAILABLE) and never falls back to the generic crew. With nobody
   * assigned the published generic-crew Pilot modifier is used. `pilotActor` (already resolved by the crew-roll caller)
   * is validated the same way. deps.resolveUuid / deps.user are injectable for tests.
   */
  static async rollPilotCheck(vehicle, { pilotActor: explicitPilot = null, resolveUuid = globalThis.fromUuid, user = globalThis.game?.user, purpose = null, allOutMovement = false, ...options } = {}) {
    const entry = assignedPilotEntry(vehicle);
    let resolved = null;
    if (!explicitPilot && entry.assigned && entry.uuid) {
      try { resolved = await resolveUuid?.(entry.uuid); } catch { resolved = null; }
    }
    const who = decidePilotRoller({ vehicle, resolved, user, explicitPilot });
    if (!who.ok) { globalThis.ui?.notifications?.warn?.(`Pilot check unavailable: ${who.reasons.join(', ')}`); return { success: false, reasons: who.reasons, detail: who.detail ?? null }; }
    const pilotActor = who.pilotActor;
    const check = vehiclePilotCheck(vehicle, { pilotActor, purpose, allOutMovement });
    if (!check.ok) { globalThis.ui?.notifications?.warn?.(`Pilot check unavailable: ${check.reasons.join(', ')}`); return { success: false, reasons: check.reasons, check }; }
    const vehicleContext = { vehicleId: vehicle.id, vehicleName: vehicle.name, mode: check.mode, breakdown: check.breakdown };
    if (check.mode === 'CREW_ACTOR') {
      const result = await rollSkill(pilotActor, 'pilot', { ...options, customModifier: Number(options.customModifier || 0) + check.modifier, vehicleContext });
      return { success: !!result, result, check };
    }
    const result = await RollCore.executeFormula({ formula: `1d20 + ${check.modifier}`, actor: vehicle, domain: 'skill.pilot', context: vehicleContext });
    if (result?.roll?.toMessage) await result.roll.toMessage({ speaker: { alias: vehicle.name }, flavor: `${vehicle.name} (generic crew) Pilot check` });
    return { success: result?.success !== false && !!result, result, check };
  }

  /**
   * Use Computer (astrogate) check by a crew Actor aboard a vehicle: the crew member's own canonical skill roll plus the
   * vehicle's equipment bonus (navicomputer +5, advanced +10). Roll authority: the crew Actor's owner or a GM.
   * The navicomputer's "need not be trained" clause has no consumer yet (no training gate exists for astrogation).
   */
  static async rollAstrogationCheck(vehicle, { crewActor, user = globalThis.game?.user, ...options } = {}) {
    if (!crewActor || crewActor.type === 'vehicle') return { success: false, reasons: ['CREW_ACTOR_REQUIRED'] };
    if (!(user?.isGM === true || crewActor.isOwner === true)) return { success: false, reasons: ['CREW_ROLL_NOT_AUTHORIZED'] };
    const eq = vehicleSkillEquipmentBonus(vehicle, { skill: 'useComputer', use: 'astrogate' });
    const result = await rollSkill(crewActor, 'useComputer', { ...options, skillUse: { key: 'astrogate' }, customModifier: Number(options.customModifier || 0) + eq.total,
      vehicleContext: { vehicleId: vehicle.id, vehicleName: vehicle.name, equipment: eq.sources } });
    return { success: !!result, result, equipmentBonus: eq };
  }

  /**
   * A crew Actor's Perception or Use Computer check made to operate the ship's sensors, with the certified installed
   * equipment bonus (Sensor Enhancement Package +5). Other uses of those skills never get it.
   */
  static async rollSensorCheck(vehicle, { crewActor, skill, user = globalThis.game?.user, ...options } = {}) {
    if (!['perception', 'useComputer'].includes(skill)) return { success: false, reasons: ['SENSOR_SKILL_INVALID'] };
    if (!crewActor || crewActor.type === 'vehicle') return { success: false, reasons: ['CREW_ACTOR_REQUIRED'] };
    if (!(user?.isGM === true || crewActor.isOwner === true)) return { success: false, reasons: ['CREW_ROLL_NOT_AUTHORIZED'] };
    const eq = vehicleSkillEquipmentBonus(vehicle, { skill, use: 'sensors' });
    const result = await rollSkill(crewActor, skill, { ...options, customModifier: Number(options.customModifier || 0) + eq.total,
      vehicleContext: { vehicleId: vehicle.id, vehicleName: vehicle.name, purpose: 'sensors', equipment: eq.sources } });
    return { success: !!result, result, equipmentBonus: eq };
  }
}
