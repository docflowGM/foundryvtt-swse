/**
 * Vehicle & Starship Rules Adapter
 *
 * Canonical access point for Vehicles/Starship family rules.
 * All vehicle/starship family rule reads go through this adapter.
 * Adapter reads through HouseRuleService (SSOT).
 *
 * PHASE 3F MIGRATION: Vehicle family routed through adapter pattern.
 */

import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

export class VehicleRules {
  /**
   * Vehicle Damage Mechanics Rules
   */

  static lastGraspEnabled() {
    return HouseRuleService.getBoolean('enableLastGrasp', false);
  }

  static emergencyPatchEnabled() {
    return HouseRuleService.getBoolean('enableEmergencyPatch', false);
  }

  static subsystemRepairCostEnabled() {
    return HouseRuleService.getBoolean('enableSubsystemRepairCost', false);
  }

  /**
   * Starship Engine Module Rules
   */

  static scaleEngineEnabled() {
    return HouseRuleService.getBoolean('enableScaleEngine', false);
  }

  static swesEnabled() {
    return HouseRuleService.getBoolean('enableSWES', false);
  }

  static enhancedShieldsEnabled() {
    return HouseRuleService.getBoolean('enableEnhancedShields', false);
  }

  static enhancedEngineerEnabled() {
    return HouseRuleService.getBoolean('enableEnhancedEngineer', false);
  }

  static enhancedPilotEnabled() {
    return HouseRuleService.getBoolean('enableEnhancedPilot', false);
  }

  static enhancedCommanderEnabled() {
    return HouseRuleService.getBoolean('enableEnhancedCommander', false);
  }

  static vehicleTurnControllerEnabled() {
    return HouseRuleService.getBoolean('enableVehicleTurnController', false);
  }
}
