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
    try {
      const subsystems = SubsystemEngine.getSubsystems(actor);
      const penalties = SubsystemEngine.getAggregatePenalties(actor);

      return {
        enabled: Boolean(SubsystemEngine.enabled),
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
    try {
      const shieldZones = EnhancedShields.getShieldState(actor);
      if (!shieldZones) return null;

      return {
        enabled: Boolean(EnhancedShields.enabled),
        shieldZones
      };
    } catch (err) {
      console.warn('[VehicleRulesAdapter] EnhancedShields access failed:', err);
      return null;
    }
  }

  /**
   * Build power management data IF enhanced engineer rule is enabled
   *
   * @param {Actor} actor - The vehicle actor
   * @returns {Object|null} Power data or null
   */
  static buildPowerData(actor) {
    try {
      const allocation = EnhancedEngineer.getPowerAllocation(actor);
      const budget = allocation?.budget ?? EnhancedEngineer.getPowerBudget(actor);
      const allocated = allocation?.spent ?? ((allocation?.weapons ?? 0) + (allocation?.shields ?? 0) + (allocation?.engines ?? 0));

      return {
        powerData: {
          enabled: Boolean(EnhancedEngineer.enabled),
          budget,
          allocated,
          available: Math.max(0, budget - allocated),
          allocation,
          subsystemLoads: [
            { key: 'weapons', name: 'Weapons', power: allocation?.weapons ?? 0 },
            { key: 'shields', name: 'Shields', power: allocation?.shields ?? 0 },
            { key: 'engines', name: 'Engines', power: allocation?.engines ?? 0 }
          ]
        }
      };
    } catch (err) {
      console.warn('[VehicleRulesAdapter] EnhancedEngineer access failed:', err);
      return null;
    }
  }

  /**
   * Build pilot maneuver control data IF enhanced pilot rule is enabled
   *
   * @param {Actor} actor - The vehicle actor
   * @returns {Object|null} Pilot data or null
   */
  static buildPilotData(actor) {
    try {
      const currentManeuver = EnhancedPilot.getCurrentManeuver(actor);

      return {
        pilotData: {
          enabled: Boolean(EnhancedPilot.enabled),
          currentManeuver
        }
      };
    } catch (err) {
      console.warn('[VehicleRulesAdapter] EnhancedPilot access failed:', err);
      return null;
    }
  }

  /**
   * Build commander order control data IF enhanced commander rule is enabled
   *
   * @param {Actor} actor - The vehicle actor
   * @returns {Object|null} Commander data or null
   */
  static buildCommanderData(actor) {
    try {
      const currentOrder = EnhancedCommander.getCurrentOrder(actor);

      return {
        commanderData: {
          enabled: Boolean(EnhancedCommander.enabled),
          currentOrder
        }
      };
    } catch (err) {
      console.warn('[VehicleRulesAdapter] EnhancedCommander access failed:', err);
      return null;
    }
  }

  /**
   * Build turn phase tracker data IF turn controller rule is enabled
   *
   * @param {Actor} actor - The vehicle actor
   * @returns {Object|null} Turn phase data or null
   */
  static buildTurnPhaseData(actor) {
    try {
      const turnState = VehicleTurnController.getTurnState(actor);

      return {
        turnPhaseData: {
          enabled: Boolean(VehicleTurnController.enabled),
          turnState
        }
      };
    } catch (err) {
      console.warn('[VehicleRulesAdapter] VehicleTurnController access failed:', err);
      return null;
    }
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
