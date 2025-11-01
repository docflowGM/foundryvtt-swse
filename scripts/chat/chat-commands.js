/**
 * Chat commands for SWSE
 */
export function registerChatCommands() {
  console.log("SWSE | Registering chat commands...");
  
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
          token.actor.update({ 'system.hp.value': newHP });
        }
      }
      return false;
    }
    
    return true;
  });
  
  console.log("SWSE | Chat commands registered");
}
