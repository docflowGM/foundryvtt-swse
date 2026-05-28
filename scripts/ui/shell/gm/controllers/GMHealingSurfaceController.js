/**
 * GMHealingSurfaceController
 *
 * Owns GM Combat & Recovery surface wiring and the natural-rest trigger.
 * Recovery mechanics still flow through GMHealingTrigger so droid/rest rules stay
 * in the canonical healing subsystem.
 */

import { GMHealingTrigger } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-healing-trigger.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class GMHealingSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-healing');
    if (!pageElement) return;

    const triggerButton = pageElement.querySelector('[data-action="trigger-healing"]');
    if (triggerButton) {
      triggerButton.addEventListener('click', async (event) => {
        event.preventDefault();
        await this._triggerNaturalHealing();
      }, { signal });
    }
  }


  /** Trigger natural healing for eligible party members. */
  async _triggerNaturalHealing() {
    try {
      const result = await GMHealingTrigger.triggerNaturalHealing({ isFullRest: true, skipHolonetNotification: false });
      if (result.success) {
        ui?.notifications?.info?.(`Natural healing triggered: ${result.totalHealed} actors healed, ${result.totalSkipped} skipped`);
        SWSELogger.info('[GMHealingSurfaceController] Natural healing triggered:', result);
        await this.host?.render?.(false);
      } else {
        ui?.notifications?.error?.(`Failed to trigger healing: ${result.error}`);
      }
    } catch (err) {
      SWSELogger.error('[GMHealingSurfaceController] Error triggering natural healing:', err);
      ui?.notifications?.error?.(`Error: ${err.message}`);
    }
  }


  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }
}
