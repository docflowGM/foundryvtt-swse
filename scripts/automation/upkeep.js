// scripts/automation/upkeep.js
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const Upkeep = {
  init() {
    globalThis.SWSE_UPKEEP = this;
    Hooks.on('updateCombat', (combat, changed, options, userId) => {
      if ('turn' in changed || 'round' in changed) {
        // iterate combatants and apply upkeep
      }
    });
    swseLogger.info('Upkeep initialized');
  }
};
