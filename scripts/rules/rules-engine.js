/* scripts/rules/rules-engine.js
   Centralized rules engine for world settings and rule application.
   Importable module. */
export class RulesEngine {
  static init() {
    // Called on ready in index.js
    // Register any hooks that implement house rules
    Hooks.on('preCreateChatMessage', RulesEngine.handlePreCreateChatMessage);
    Hooks.on('updateCombat', RulesEngine.onCombatUpdate);
    // Add any additional hook registrations here
    console.log('SWSE | RulesEngine initialized');
  }

  static async handlePreCreateChatMessage(doc, options, userId) {
    // Intercept chat messages that contain rolls and optionally modify them
    try {
      const useCustomCritical = game.settings?.get?.('swse','useCustomCritical') ?? false;
      if (!useCustomCritical) return;

      // Example: modify dice results or augment chat content
      // Keep this minimal and safe — use RollManager for heavy lifting
      return;
    } catch (err) {
      console.error('SWSE RulesEngine preCreateChatMessage error', err);
    }
  }

  static async onCombatUpdate(combat, changed, options, userId) {
    // If the turn advanced, call upkeep handler from Upkeep module (if present)
    try {
      if (!changed || typeof changed !== 'object') return;
      // foundry signals advancement by 'turn' in changed
      if ('turn' in changed || 'round' in changed) {
        // Defer to Upkeep if present
        if (globalThis?.SWSE_UPKEEP?.applyTurnUpkeep) {
          try {
            await globalThis.SWSE_UPKEEP.applyTurnUpkeep(combat, changed);
          } catch (e) {
            console.error('SWSE | Upkeep error', e);
          }
        }
      }
    } catch (err) {
      console.error('SWSE RulesEngine onCombatUpdate error', err);
    }
  }
}
