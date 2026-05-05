/**
 * DEPRECATED COMPATIBILITY WRAPPER
 *
 * Droid customization now routes through the unified CustomizationBayApp.
 * This wrapper preserves legacy imports / macros that instantiate
 * DroidCustomizationApp directly while avoiding a parallel droid UI surface.
 *
 * @deprecated Use {@link CustomizationBayApp} directly with `mode: "garage"` instead.
 *            Or use {@link openDroidCustomization} router function.
 *            This class will be pruned once legacy macros/imports are migrated.
 * @see CustomizationBayApp
 */

import { CustomizationBayApp } from "/systems/foundryvtt-swse/scripts/apps/customization/customization-bay-app.js";

export class DroidCustomizationApp extends CustomizationBayApp {
  /**
   * Constructor routes to CustomizationBayApp with garage mode.
   * @param {Actor} actor - The droid actor.
   * @param {object} options - Options (contextMode defaults to "modifyExisting").
   * @deprecated Use CustomizationBayApp or openDroidCustomization instead.
   */
  constructor(actor, options = {}) {
    super(actor, {
      ...options,
      mode: "garage",
      contextMode: options.contextMode ?? "modifyExisting"
    });
  }
}
