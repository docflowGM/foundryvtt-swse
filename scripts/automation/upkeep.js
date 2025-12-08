/* scripts/automation/upkeep.js
   Basic upkeep system applied on combat turn changes.
*/
export class Upkeep {
  static init() {
    // Expose globally for RulesEngine to call
    globalThis.SWSE_UPKEEP = this;
    console.log('SWSE | Upkeep initialized');
  }

  static async applyTurnUpkeep(combat, changed) {
    try {
      const combatant = combat.combatant;
      if (!combatant) return;
      const actor = combatant.actor;
      if (!actor) return;
      // Example upkeep: decrement durations of active effects with flags.swse.upkeep:true
      const effects = actor.effects.filter(e => e.getFlag('swse','upkeep') === true);
      for (const eff of effects) {
        const dur = eff.duration;
        // If duration.rounds exists, Foundry handles decrement automatically; here is placeholder logic
        // Apply any maintenance cost here (e.g., reduce resource, hp drain, etc.)
      }
      // Placeholder: notify GM
      // ui.notifications?.info(`${actor.name} upkeep processed`);
    } catch (err) {
      console.error('SWSE | applyTurnUpkeep error', err);
    }
  }
}
