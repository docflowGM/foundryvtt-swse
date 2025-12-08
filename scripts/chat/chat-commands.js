import { SWSELogger } from '../utils/logger.js';
import { ProgressionEngine } from "./scripts/progression/engine/progression-engine.js";
/**
 * Chat commands for SWSE
 */
export function registerChatCommands() {
  SWSELogger.log("SWSE | Registering chat commands...");
  
  Hooks.on("chatMessage", (chatLog, message) => {
    const [command, ...args] = message.split(" ");
    
    if (command === "/damage") {
      const amount = parseInt(args[0]);
      if (isNaN(amount)) return true;
      
      for (const token of canvas.tokens.controlled) {
        if (token.actor) {
          token.actor.applyDamage(amount, { checkThreshold: true });
        }
      }
      return false;
    }
    
    if (command === "/heal") {
      const amount = parseInt(args[0]);
      if (isNaN(amount)) return true;
      
      for (const token of canvas.tokens.controlled) {
        if (token.actor) {
          const newHP = Math.min(
            token.actor.system.hp.value + amount,
            token.actor.system.hp.max
          );
          token.// AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: actor.update({ 'system.hp.value': newHP });
actor.update({ 'system.hp.value': newHP });
/* ORIGINAL: actor.update({ 'system.hp.value': newHP }); */

        }
      }
      return false;
    }
    
    return true;
  });
  
  SWSELogger.log("SWSE | Chat commands registered");
}
