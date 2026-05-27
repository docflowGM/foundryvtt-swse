/** GM Combat & Recovery surface view-model. */

import { GMCombatRecoveryService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-combat-recovery-service.js';

export class GMHealingSurfaceService {
  static async buildViewModel() {
    return GMCombatRecoveryService.buildViewModel();
  }
}
