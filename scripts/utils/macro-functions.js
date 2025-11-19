import { SWSELogger } from './logger.js';
/**
 * Macro functions for SWSE
 */
export function registerMacroFunctions() {
  SWSELogger.log("SWSE | Registering macro functions...");
  
  game.swse.rollSkill = async function(actorId, skillKey) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    
    const skill = actor.system.skills[skillKey];
    const roll = await new Roll(`1d20 + ${skill.total}`).evaluate({async: true});
    
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor}),
      flavor: `${skillKey} Check`
    });
  };
  
  SWSELogger.log("SWSE | Macro functions registered");
}
