import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
/**
 * Macro functions for SWSE
 */
export function registerMacroFunctions() {
  SWSELogger.log('SWSE | Registering macro functions...');

  game.swse.rollSkill = async function(actorId, skillKey) {
    const actor = game.actors.get(actorId);
    if (!actor) {return;}

    await SWSERoll.rollSkill(actor, skillKey);
  };

  SWSELogger.log('SWSE | Macro functions registered');
}
