/** GM natural healing surface view-model. */

import { GMHealingTrigger } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-healing-trigger.js';

export class GMHealingSurfaceService {
  static async buildViewModel() {
    const summary = await GMHealingTrigger.getHealingSummary();

    return {
      pageTitle: 'Natural Healing',
      pageDescription: 'Trigger natural healing recovery for eligible party members',
      healingSummary: summary,
      eligible: summary.eligible,
      ineligible: summary.ineligible,
      eligibleActors: summary.eligibleActors || [],
      ineligibleActors: summary.ineligibleActors || []
    };
  }
}
