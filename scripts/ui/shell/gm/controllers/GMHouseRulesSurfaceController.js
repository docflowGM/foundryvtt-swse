/**
 * GMHouseRulesSurfaceController
 *
 * Owns DOM wiring for the GM House Rules surface while leaving rule mutation in
 * HouseRuleService.
 */

import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { mutateAndRepaint } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';

export class GMHouseRulesSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-house-rules');
    if (!pageElement) return;

    pageElement.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', async (event) => {
        const key = event.target.dataset.ruleKey;
        const checked = event.target.checked;
        if (!key) return;

        try {
          await mutateAndRepaint(this.host, () => HouseRuleService.set(key, checked), {
            reason: 'gm-house-rule-toggle',
            surfaceId: 'house-rules'
          });
          SWSELogger.info(`[GMDatapad House Rules] Updated ${key} = ${checked}`);
        } catch (err) {
          SWSELogger.error(`[GMDatapad House Rules] Failed to update ${key}:`, err);
          event.target.checked = !checked;
        }
      }, { signal });
    });

    pageElement.querySelectorAll('.rule-category').forEach((category) => {
      category.addEventListener('mouseenter', (event) => {
        event.currentTarget.classList.add('hovered');
      }, { signal });
      category.addEventListener('mouseleave', (event) => {
        event.currentTarget.classList.remove('hovered');
      }, { signal });
    });
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }
}
