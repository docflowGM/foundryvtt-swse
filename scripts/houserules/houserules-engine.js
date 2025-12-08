// scripts/houserules/houserules-engine.js
import { swseLogger } from "../utils/logger.js";

export const HouseRules = {
  init() {
    // Register settings for known rules or validate registration
    try {
      // Example: critical rule
      if (!game.settings?.settings.has('swse.useCustomCritical')) {
        game.settings.register('swse', 'useCustomCritical', {
          name: 'Use custom crit rules',
          hint: 'Enable custom critical hit handling',
          scope: 'world',
          config: true,
          default: false,
          type: Boolean
        });
      }
      swseLogger.info("HouseRules initialized");
    } catch (err) {
      swseLogger.error("HouseRules.init failed", err);
    }

    // Hook points (example)
    Hooks.on('preCreateChatMessage', async (doc, options, userId) => {
      if (!game.settings.get('swse','useCustomCritical')) return;
      // Custom intercept would go here
    });
  }
};
