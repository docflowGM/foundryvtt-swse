/**
 * Droid Customization Router
 *
 * Phase 4: Entry point routing for droid customization
 *
 * ROUTING: Ensures droids are routed to dedicated droid customization,
 * NOT generic first-wave item customization.
 *
 * This is a critical seam for maintaining separation:
 * - Droids are NOT treated as generic gear with slots
 * - Droids have their own customization lane
 * - The router enforces this distinction at all entry points
 */

import { ShellRouter } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/core/logger.js';

export class DroidCustomizationRouter {
  /**
   * Open droid customization UI for an owned droid
   *
   * This is the primary entry point for droid customization.
   * It routes droids away from generic first-wave customization and into
   * the dedicated droid lane.
   */
  static openDroidCustomization(actor, options = {}) {
    if (!actor) {
      ui.notifications.error('No droid selected');
      return;
    }

    // Routing guard: ensure this is actually a droid
    if (actor.type !== 'droid') {
      SWSELogger.warn(`DroidCustomizationRouter: Attempted to open droid customization for non-droid actor (${actor.type})`);
      ui.notifications.error('This customization interface is for droids only');
      return;
    }

    try {
      return ShellRouter.openSurface(actor, 'customization', {
        ...options,
        mode: 'garage',
        contextMode: options.contextMode ?? 'modifyExisting'
      });
    } catch (err) {
      SWSELogger.error('Failed to open droid customization:', err);
      ui.notifications.error('Failed to open droid customization UI');
    }
  }

  /**
   * Determine if an actor should use droid customization
   * Helper for sheet/UI routing decisions
   */
  static shouldUseDroidCustomization(actor) {
    return actor && actor.type === 'droid';
  }

  /**
   * Get customization UI label for droid (for UI display)
   */
  static getDroidCustomizationLabel() {
    return 'Open Droid Garage';
  }
}
