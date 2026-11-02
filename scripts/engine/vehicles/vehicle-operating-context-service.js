/**
 * P6B-0 runtime entry points for the vehicle operating context: GM environment adjudication and the vehicle Pilot
 * check through the existing skill roll authority (scripts/rolls/skills.js rollSkill). No second dice engine.
 */
import { planEnvironmentChange, vehiclePilotCheck } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-operating-context.js";
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
   * Pilot check for a vehicle. With a crew Actor: that Actor's Pilot roll with the vehicle's size and effective
   * Dexterity modifiers as a custom modifier. Without: the published generic-crew Pilot modifier.
   */
  static async rollPilotCheck(vehicle, { pilotActor = null, ...options } = {}) {
    const check = vehiclePilotCheck(vehicle, { pilotActor });
    if (!check.ok) { globalThis.ui?.notifications?.warn?.(`Pilot check unavailable: ${check.reasons.join(', ')}`); return { success: false, reasons: check.reasons, check }; }
    const vehicleContext = { vehicleId: vehicle.id, vehicleName: vehicle.name, mode: check.mode, breakdown: check.breakdown };
    if (check.mode === 'CREW_ACTOR') {
      const result = await rollSkill(pilotActor, 'pilot', { ...options, customModifier: Number(options.customModifier || 0) + check.modifier, vehicleContext });
      return { success: result?.success !== false && !!result, result, check };
    }
    const result = await RollCore.executeFormula({ formula: `1d20 + ${check.modifier}`, actor: vehicle, domain: 'skill.pilot', context: vehicleContext });
    if (result?.roll?.toMessage) await result.roll.toMessage({ speaker: { alias: vehicle.name }, flavor: `${vehicle.name} (generic crew) Pilot check` });
    return { success: result?.success !== false && !!result, result, check };
  }
}
