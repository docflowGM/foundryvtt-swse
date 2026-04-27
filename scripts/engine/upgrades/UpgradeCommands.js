/**
 * UpgradeCommands — Command implementations for the upgrade app
 *
 * All mutation authority flows through UpgradeService → ActorEngine.
 * These methods are invoked only via CommandBus.execute().
 */

import { UpgradeService } from '/systems/foundryvtt-swse/scripts/engine/upgrades/UpgradeService.js';

export class UpgradeCommands {
  static async applyItemUpgrade({ actor, itemId, upgradeId }) {
    return UpgradeService.applyUpgrade({ actor, itemId, upgradeId });
  }

  static async removeItemUpgrade({ actor, itemId, upgradeIndex }) {
    return UpgradeService.removeUpgrade({ actor, itemId, upgradeIndex });
  }

  static async finalizeItemUpgrades({ actor, itemId }) {
    // Standard items: changes are applied immediately, finalization is a no-op
    // Lightsabers: could trigger a forge completion event in future
    return { success: true, message: 'Upgrades finalized.' };
  }

  static async setLightsaberCrystal({ actor, itemId, crystalId }) {
    return UpgradeService.setLightsaberField({ actor, itemId, field: 'system.crystalId', value: crystalId });
  }

  static async setLightsaberChassis({ actor, itemId, chassisId }) {
    return UpgradeService.setLightsaberField({ actor, itemId, field: 'system.chassisId', value: chassisId });
  }

  static async setLightsaberColor({ actor, itemId, colorId }) {
    return UpgradeService.setLightsaberField({ actor, itemId, field: 'flags.foundryvtt-swse.bladeColor', value: colorId });
  }
}
