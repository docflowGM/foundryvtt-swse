/**
 * Vehicle Customization Router
 *
 * Phase 5: Entry point routing for vehicle customization
 *
 * ROUTING: Ensures vehicles are routed to dedicated vehicle customization,
 * NOT generic first-wave item customization, and NOT droid customization.
 *
 * This is a critical seam for maintaining separation:
 * - Vehicles are NOT treated as generic gear with slots
 * - Vehicles are NOT treated like droids
 * - Vehicles have their own customization lane with distinct rules
 * - The router enforces this distinction at all entry points
 */

import { ShellRouter } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/core/logger.js';

export class VehicleCustomizationRouter {
  /**
   * Open vehicle customization UI for an owned vehicle
   *
   * This is the primary entry point for vehicle customization.
   * It routes vehicles away from generic first-wave customization and droid flows
   * into the dedicated vehicle lane.
   */
  static openVehicleCustomization(actor, options = {}) {
    if (!actor) {
      ui.notifications.error('No vehicle selected');
      return;
    }

    // Routing guard: ensure this is actually a vehicle
    if (actor.type !== 'vehicle') {
      SWSELogger.warn(`VehicleCustomizationRouter: Attempted to open vehicle customization for non-vehicle actor (${actor.type})`);
      ui.notifications.error('This customization interface is for vehicles only');
      return;
    }

    try {
      return ShellRouter.openSurface(actor, 'customization', {
        ...options,
        mode: 'shipyard',
        contextMode: options.contextMode ?? 'modifyExisting'
      });
    } catch (err) {
      SWSELogger.error('Failed to open vehicle customization:', err);
      ui.notifications.error('Failed to open vehicle customization UI');
    }
  }

  /**
   * Determine if an actor should use vehicle customization
   * Helper for sheet/UI routing decisions
   */
  static shouldUseVehicleCustomization(actor) {
    return actor && actor.type === 'vehicle';
  }

  /**
   * Get customization UI label for vehicle (for UI display)
   */
  static getVehicleCustomizationLabel() {
    return 'Open Shipyard';
  }
}
