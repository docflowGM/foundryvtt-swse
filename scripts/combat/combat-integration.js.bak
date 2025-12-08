import { SWSELogger } from '../utils/logger.js';
import { SWSEActiveEffectsManager } from './active-effects-manager.js';

/**
 * Combat automation and integration for SWSE
 * Handles combat start, turn progression, and condition recovery
 */
export class SWSECombatIntegration {

    static getSelectedActor() {
        return canvas.tokens.controlled[0]?.actor;
    }


  static init() {
    SWSELogger.log("SWSE | Initializing combat integration...");

    // Combat lifecycle hooks
    Hooks.on("createCombat", this._onCombatStart.bind(this));
    Hooks.on("deleteCombat", this._onCombatEnd.bind(this));
    Hooks.on("combatRound", this._onCombatRound.bind(this));
    Hooks.on("combatTurn", this._onCombatTurn.bind(this));

    // Combatant hooks
    Hooks.on("createCombatant", this._onCombatantAdd.bind(this));
    Hooks.on("deleteCombatant", this._onCombatantRemove.bind(this));

    SWSELogger.log("SWSE | Combat integration ready");
  }

  /**
   * Handle combat start
   */
  static async _onCombatStart(combat, options, userId) {
    if (!game.user.isGM) return;

    SWSELogger.log(`SWSE | Combat "${combat.id}" started`);

    // Reset resources for all combatants
    for (const combatant of combat.combatants) {
      if (combatant.actor) {
        await this._resetCombatantResources(combatant.actor);
      }
    }

    // Send notification
    ChatMessage.create({
      content: `<div class="swse-combat-start">
        <h2><i class="fas fa-swords"></i> Combat Started!</h2>
        <p>Roll initiative!</p>
      </div>`,
      speaker: { alias: 'System' }
    });
  }

  /**
   * Handle combat end
   */
  static async _onCombatEnd(combat, options, userId) {
    if (!game.user.isGM) return;

    SWSELogger.log(`SWSE | Combat "${combat.id}" ended`);

    // Clean up combat-specific effects
    for (const combatant of combat.combatants) {
      if (combatant.actor) {
        await this._cleanupCombatEffects(combatant.actor);
      }
    }

    // Send notification
    ChatMessage.create({
      content: `<div class="swse-combat-end">
        <h2><i class="fas fa-flag-checkered"></i> Combat Ended</h2>
      </div>`,
      speaker: { alias: 'System' }
    });
  }

  /**
   * Handle combat round progression
   */
  static async _onCombatRound(combat, updateData, updateOptions) {
    if (!game.user.isGM) return;

    const round = updateData.round;
    SWSELogger.log(`SWSE | Combat round ${round}`);

    // Optional: Announce new round
    if (game.settings.get('swse', 'announceRounds') !== false) {
      ChatMessage.create({
        content: `<div class="swse-round-start">
          <h3><i class="fas fa-circle-notch"></i> Round ${round}</h3>
        </div>`,
        speaker: { alias: 'System' }
      });
    }
  }

  /**
   * Handle combat turn changes
   */
  static async _onCombatTurn(combat, updateData, updateOptions) {
    const combatant = combat.combatant;
    if (!combatant?.actor) return;

    const actor = combatant.actor;
    SWSELogger.log(`SWSE | Turn: ${actor.name}`);

    // Reset action economy for the new turn
    if (game.user.isGM) {
      await combatant.resetActions();
    }

    // Check for condition recovery
    await this._checkConditionRecovery(combatant);

    // Announce turn (if setting enabled)
    if (game.settings.get('swse', 'announceTurns') !== false) {
      ChatMessage.create({
        content: `<div class="swse-turn-start">
          <h3>${actor.name}'s Turn</h3>
        </div>`,
        speaker: { alias: 'System' }
      });
    }
  }

  /**
   * Handle combatant added to combat
   */
  static async _onCombatantAdd(combatant, options, userId) {
    if (!game.user.isGM) return;

    SWSELogger.log(`SWSE | ${combatant.name} added to combat`);

    if (combatant.actor) {
      await this._resetCombatantResources(combatant.actor);
    }
  }

  /**
   * Handle combatant removed from combat
   */
  static async _onCombatantRemove(combatant, options, userId) {
    if (!game.user.isGM) return;

    SWSELogger.log(`SWSE | ${combatant.name} removed from combat`);

    if (combatant.actor) {
      await this._cleanupCombatEffects(combatant.actor);
    }
  }

  /**
   * Reset combatant resources at combat start
   * @private
   */
  static async _resetCombatantResources(actor) {
    const updates = {
      'system.secondWind.uses': 1,
      'system.actionEconomy': {
        swift: true,
        move: true,
        standard: true,
        fullRound: true,
        reaction: true
      }
    };

    // Reset Force Points if setting enabled
    if (game.settings.get('swse', 'resetForcePointsOnCombat') === true) {
      const maxForcePoints = actor.system.forcePoints?.max || 0;
      updates['system.forcePoints.value'] = maxForcePoints;
    }

    await actor.update(updates);
  }

  /**
   * Clean up combat-specific effects
   * @private
   */
  static async _cleanupCombatEffects(actor) {
    // Remove turn-based effects
    const tempEffects = actor.effects.filter(e =>
      e.flags?.swse?.combatAction || e.duration?.turns
    );

    if (tempEffects.length > 0) {
      const ids = tempEffects.map(e => e.id);
      await actor.deleteEmbeddedDocuments('ActiveEffect', ids);
    }

    // Reset action economy
    await actor.update({
      'system.actionEconomy': {
        swift: true,
        move: true,
        standard: true,
        fullRound: true,
        reaction: true
      }
    });
  }

  /**
   * Check for automatic condition recovery
   * @private
   */
  static async _checkConditionRecovery(combatant) {
    const actor = combatant.actor;
    const condition = actor.system.conditionTrack?.current;

    // Only offer recovery if injured
    if (!condition || condition === 'normal' || condition === 'helpless') {
      return;
    }

    // Check if auto-recovery is enabled
    const autoRecovery = game.settings.get('swse', 'autoConditionRecovery');
    if (!autoRecovery) return;

    // Only prompt for player characters or if GM
    if (!actor.hasPlayerOwner && !game.user.isGM) return;

    // Prompt for recovery
    const confirmed = await Dialog.confirm({
      title: "Condition Recovery",
      content: `<p>${actor.name} can attempt condition recovery (DC 15 Endurance check)</p>
                <p>Current condition: <strong>${condition}</strong></p>`,
      defaultYes: false
    });

    if (!confirmed) return;

    // Roll Endurance check
    const endurance = actor.system.skills?.endurance?.total || 0;
    const roll = await new Roll(`1d20 + ${endurance}`).evaluate({async: true});

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor}),
      flavor: `<div class="swse-condition-recovery">
        <h3>Condition Recovery (DC 15)</h3>
        <p>Endurance Check: ${roll.total}</p>
      </div>`
    });

    // Check success
    if (roll.total >= 15) {
      const tracks = ['normal', '-1', '-2', '-5', '-10', 'helpless'];
      const currentIndex = tracks.indexOf(condition);
      if (currentIndex > 0) {
        const newCondition = tracks[currentIndex - 1];
        await actor.update({ 'system.conditionTrack.current': newCondition });

        ui.notifications.info(`${actor.name} recovered! Condition improved from ${condition} to ${newCondition}`);

        // Apply the new condition effect
        await SWSEActiveEffectsManager.applyConditionEffect(actor, newCondition);
      }
    } else {
      ui.notifications.warn(`${actor.name} failed to recover from ${condition}`);
    }
  }
}
