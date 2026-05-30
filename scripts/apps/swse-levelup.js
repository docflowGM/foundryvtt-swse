/**
 * @deprecated Legacy level-up compatibility shim.
 *
 * This file is intentionally no longer a sheet entry point. Active sheets must
 * import `launchProgression` from `scripts/apps/progression-framework/progression-entry.js`
 * directly so the unified progression shell remains the single authority for
 * class, feat, talent, Force, attribute, and derived-data progression.
 *
 * Keep this shim only for older macros/modules that still call SWSELevelUp.open()
 * or SWSELevelUp.openEnhanced(). Do not add new behavior here.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { launchProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";

export class SWSELevelUp {
  static async open(actor, options = {}) {
    return this.openEnhanced(actor, options);
  }

  static async openEnhanced(actor, options = {}) {
    if (!actor) {
      ui?.notifications?.error?.('No actor provided for level up.');
      return false;
    }

    try {
      swseLogger.warn('[SWSELevelUp] Deprecated shim used; route active UI through launchProgression() directly.', {
        actor: actor.name,
        source: options?.source ?? 'legacy-swse-levelup-shim',
      });
      await launchProgression(actor, {
        ...options,
        source: options?.source ?? 'legacy-swse-levelup-shim',
      });
      return true;
    } catch (err) {
      swseLogger.error('SWSE Level Up | Error opening unified progression:', err);
      ui?.notifications?.error?.('Failed to open level up dialog.');
      return false;
    }
  }
}
