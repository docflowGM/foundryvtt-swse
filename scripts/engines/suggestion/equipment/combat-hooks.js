/**
 * Combat Suggestion Engine Hook Registration
 *
 * Triggers suggestion evaluation at key combat moments.
 */

import { CombatSuggestionEngine } from './combat-engine.js';
import { SWSELogger } from '../../utils/logger.js';

export function registerCombatSuggestionHooks() {
  /**
   * On combat turn start: evaluate tactical state
   */
  Hooks.on('combatTurnChange', async (combat, combatant, options) => {
    if (game.user.isGM && combat.started) {
      await CombatSuggestionEngine.evaluate({
        combat,
        reason: 'turn-start'
      });
    }
  });

  /**
   * On combat round start
   */
  Hooks.on('combatRoundChange', async (combat, options) => {
    if (game.user.isGM && combat.started) {
      await CombatSuggestionEngine.evaluate({
        combat,
        reason: 'round-start'
      });
    }
  });

  /**
   * On combat start
   */
  Hooks.on('combatStart', async (combat, options) => {
    if (game.user.isGM) {
      SWSELogger.log('[CombatSuggestions] Combat started, evaluating...');
      await CombatSuggestionEngine.evaluate({
        combat,
        reason: 'combat-start'
      });
    }
  });

  /**
   * On actor token update (HP change, etc.)
   * Debounced to avoid spam
   */
  let debounceTimer = null;
  Hooks.on('updateToken', async (token, update, context) => {
    if (!game.user.isGM || !game.combat?.started) {return;}

    // Clear previous timer
    if (debounceTimer) {clearTimeout(debounceTimer);}

    // Debounce evaluation: 500ms after last token change
    debounceTimer = setTimeout(() => {
      CombatSuggestionEngine.evaluate({
        combat: game.combat,
        reason: 'state-change'
      });
    }, 500);
  });

  SWSELogger.log('[CombatSuggestionHooks] Registered 4 combat evaluation hooks');
}

/**
 * Manual trigger: GM calls this to evaluate current combat
 * Useful for macros or explicit requests
 */
export async function requestCombatEvaluation() {
  if (!game.user.isGM) {
    ui.notifications.warn('Combat evaluation is GM-only');
    return;
  }

  if (!game.combat) {
    ui.notifications.info('No active combat');
    return;
  }

  await CombatSuggestionEngine.evaluate({
    combat: game.combat,
    reason: 'manual'
  });

  ui.notifications.info('Combat suggestion engine evaluated');
}
