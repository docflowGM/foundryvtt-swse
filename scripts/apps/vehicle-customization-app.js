/**
 * DEPRECATED COMPATIBILITY WRAPPER
 *
 * Vehicle/starship customization now routes through the unified
 * CustomizationBayApp. This wrapper preserves legacy imports / macros that
 * instantiate VehicleCustomizationApp directly while avoiding a parallel
 * vehicle UI surface.
 *
 * @deprecated Use {@link CustomizationBayApp} directly with `mode: "shipyard"` instead.
 *            Or use {@link openVehicleCustomization} router function.
 *            This class will be pruned once legacy macros/imports are migrated.
 * @see CustomizationBayApp
 */

import { CustomizationBayApp } from "/systems/foundryvtt-swse/scripts/apps/customization/customization-bay-app.js";

export class VehicleCustomizationApp extends CustomizationBayApp {
  /**
   * Constructor routes to CustomizationBayApp with shipyard mode.
   * @param {Actor} actor - The vehicle actor.
   * @param {object} options - Options (contextMode defaults to "modifyExisting").
   * @deprecated Use CustomizationBayApp or openVehicleCustomization instead.
   */
  constructor(actor, options = {}) {
    super(actor, {
      ...options,
      mode: "shipyard",
      contextMode: options.contextMode ?? "modifyExisting"
    });
  }
}
