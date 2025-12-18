/**
 * SWSE Vehicle Combat System Entry Point (v13+)
 * 
 * This file exposes the main Vehicle Combat API while ensuring that
 * all submodules ("shared", "weapons", "dogfighting", "calculations", "collisions")
 * are initialized and integrated with the core SWSE systems:
 *
 *  - SWSECombat (attack orchestration)
 *  - SWSERoll (dice + FP middleware)
 *  - DamageSystem (SR/DR/threshold)
 *  - ActiveEffectsManager (vehicle conditions)
 */

import { SWSEVehicleCombat } from './vehicle/vehicle-combat-main.js';

// Initialize when SWSE system loads
Hooks.once("ready", () => {
  if (game.modules.get("foundryvtt-swse")?.active) {
    console.log("SWSE | Vehicle Combat System Loaded (v13+)");
    SWSEVehicleCombat.init?.();
  }
});

export { SWSEVehicleCombat };
