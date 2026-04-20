/**
 * Vehicle Rules Adapter (Phase 1)
 *
 * Isolates all vehicle house-rule checks.
 * Prevents direct feature-flag reads in sheet/template.
 * Routes all rule checks through adapter methods.
 *
 * PHASE 1: buildSubsystemPanel and buildShieldPanel are fully implemented.
 * Other methods return null (Phase 2+).
 */

import { SubsystemEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/subsystem-engine.js";
import { EnhancedShields } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-shields.js";
import { EnhancedEngineer } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-engineer.js";
import { EnhancedPilot } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-pilot.js";
import { EnhancedCommander } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-commander.js";
import { VehicleTurnController } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/vehicle-turn-controller.js";

export class VehicleRulesAdapter {
  /**
   * Build subsystem panel context IF rule is enabled
   * Returns null if subsystems disabled (panel will not render)
   *
   * @param {Actor} actor - The vehicle actor
   * @returns {Object|null} Subsystem data or null
   */
  static buildSubsystemData(actor) {
    // Check if rule is enabled
    try {
      if (!SubsystemEngine.enabled) {
        return null;
      }
    } catch {
      return null;
    }

    // Rule is enabled; fetch data from engine
    try {
      const subsystems = SubsystemEngine.getSubsystems(actor);
      const penalties = SubsystemEngine.getAggregatePenalties(actor);

      return {
        subsystemData: subsystems,
        subsystemPenalties: penalties
      };
    } catch (err) {
      console.warn('[VehicleRulesAdapter] SubsystemEngine failed:', err);
      return null;
    }
  }

  /**
   * Build shield management data IF enhanced shields rule is enabled
   * Returns null if rule disabled (panel will not render)
   *
   * @param {Actor} actor - The vehicle actor
   * @returns {Object|null} Shield zone data or null
   */
  static buildShieldData(actor) {
    // Check if rule is enabled
    try {
      if (!EnhancedShields.enabled) {
        return null;
      }
    } catch {
      return null;
    }

    // Rule is enabled; fetch data from system
    try {
      const shieldZones = actor.system?.enhancedShields ?? null;
      if (!shieldZones) {
        return null;
      }

      return {
        shieldZones
      };
    } catch (err) {
      console.warn('[VehicleRulesAdapter] EnhancedShields access failed:', err);
      return null;
    }
  }

  /**
   * Build power management data IF enhanced engineer rule is enabled
   * PHASE 2: Placeholder. Returns null in Phase 1.
   *
   * @param {Actor} actor - The vehicle actor
   * @returns {Object|null} Power data or null
   */
  static buildPowerData(actor) {
    // Phase 1: Not yet implemented
    return null;
  }

  /**
   * Build pilot maneuver control data IF enhanced pilot rule is enabled
   * PHASE 2: Placeholder. Returns null in Phase 1.
   *
   * @param {Actor} actor - The vehicle actor
   * @returns {Object|null} Pilot data or null
   */
  static buildPilotData(actor) {
    // Phase 1: Not yet implemented
    return null;
  }

  /**
   * Build commander order control data IF enhanced commander rule is enabled
   * PHASE 2: Placeholder. Returns null in Phase 1.
   *
   * @param {Actor} actor - The vehicle actor
   * @returns {Object|null} Commander data or null
   */
  static buildCommanderData(actor) {
    // Phase 1: Not yet implemented
    return null;
  }

  /**
   * Build turn phase tracker data IF turn controller rule is enabled
   * PHASE 2: Placeholder. Returns null in Phase 1.
   *
   * @param {Actor} actor - The vehicle actor
   * @returns {Object|null} Turn phase data or null
   */
  static buildTurnPhaseData(actor) {
    // Phase 1: Not yet implemented
    return null;
  }

  /**
   * Aggregate all house rule contexts into a single object
   * Returns only non-null contexts (missing contexts omit corresponding panels from render)
   *
   * @param {Actor} actor - The vehicle actor
   * @returns {Object} houseRuleContexts with optional panels
   */
  static buildAllRuleContexts(actor) {
    const subsystemData = this.buildSubsystemData(actor);
    const shieldData = this.buildShieldData(actor);
    const powerData = this.buildPowerData(actor);
    const pilotData = this.buildPilotData(actor);
    const commanderData = this.buildCommanderData(actor);
    const turnPhaseData = this.buildTurnPhaseData(actor);

    return {
      subsystemData: subsystemData?.subsystemData ?? null,
      subsystemPenalties: subsystemData?.subsystemPenalties ?? null,
      shieldZones: shieldData?.shieldZones ?? null,
      powerData: powerData?.powerData ?? null,
      pilotData: pilotData?.pilotData ?? null,
      commanderData: commanderData?.commanderData ?? null,
      turnPhaseData: turnPhaseData?.turnPhaseData ?? null
    };
  }
}
