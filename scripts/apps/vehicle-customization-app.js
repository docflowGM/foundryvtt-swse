/**
 * DEPRECATED COMPATIBILITY WRAPPER
 *
 * Vehicle/starship customization now routes through the unified
 * CustomizationBayApp. This wrapper preserves legacy imports / macros that
 * instantiate VehicleCustomizationApp directly while avoiding a parallel
 * vehicle UI surface.
 */

import { CustomizationBayApp } from "/systems/foundryvtt-swse/scripts/apps/customization/customization-bay-app.js";

export class VehicleCustomizationApp extends CustomizationBayApp {
  constructor(actor, options = {}) {
    super(actor, {
      ...options,
      mode: "shipyard",
      contextMode: options.contextMode ?? "modifyExisting"
    });
  }
}
