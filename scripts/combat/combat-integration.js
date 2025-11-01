/**
 * Combat automation for SWSE
 */
export class SWSECombatIntegration {
  
  static init() {
    console.log("SWSE | Initializing combat automation...");
    
    Hooks.on("createCombat", this._onCombatStart.bind(this));
    Hooks.on("combatTurn", this._onCombatTurn.bind(this));
    
    console.log("SWSE | Combat automation ready");
  }
  
  static async _onCombatStart(combat) {
    if (!game.user.isGM) return;
    console.log("SWSE | Combat started");
    
    for (const combatant of combat.combatants) {
      if (combatant.actor) {
        await combatant.actor.update({ 'system.secondWind.uses': 1 });
      }
    }
  }
  
  static async _onCombatTurn(combat, turnData) {
    if (!game.settings.get('swse', 'autoConditionRecovery')) return;
    
    const combatant = combat.combatant;
    if (!combatant?.actor) return;
    
    const actor = combatant.actor;
    if (actor.system.conditionTrack === 'normal') return;
    
    const confirmed = await Dialog.confirm({
      title: "Condition Recovery",
      content: `<p>${actor.name} can attempt condition recovery (DC 15 Endurance)</p>`,
      defaultYes: false
    });
    
    if (confirmed) {
      const skill = actor.system.skills.endurance.total;
      const roll = await new Roll(`1d20 + ${skill}`).evaluate({async: true});
      
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor}),
        flavor: "Condition Recovery (DC 15)"
      });
      
      if (roll.total >= 15) {
        const tracks = ['normal', '-1', '-2', '-5', '-10', 'helpless'];
        const idx = tracks.indexOf(actor.system.conditionTrack);
        await actor.update({ 'system.conditionTrack': tracks[Math.max(idx - 1, 0)] });
        ui.notifications.info(`${actor.name} recovered!`);
      }
    }
  }
}
