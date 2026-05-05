/**
 * DEPRECATED COMPATIBILITY WRAPPER
 *
 * Droid customization now routes through the unified CustomizationBayApp.
 * This wrapper preserves legacy imports / macros that instantiate
 * DroidCustomizationApp directly while avoiding a parallel droid UI surface.
 */

import { CustomizationBayApp } from "/systems/foundryvtt-swse/scripts/apps/customization/customization-bay-app.js";

export class DroidCustomizationApp extends CustomizationBayApp {
  constructor(actor, options = {}) {
    super(actor, {
      ...options,
      mode: "garage",
      contextMode: options.contextMode ?? "modifyExisting"
    });
  }
}
