import { ProgressionEngine } from "../progression/engine/progression-engine.js";
/**
 * Custom Combat Document for SWSE
 * Extends Foundry's Combat class to implement SWSE-specific combat rules
 */
export class SWSECombatDocument extends Combat {

  /**
   * Override initiative formula to use SWSE initiative calculation
   * @param {SWSECombatant} combatant - The combatant whose initiative is being rolled
   * @returns {string} The initiative formula
   */
  _getInitiativeFormula(combatant) {
    const actor = combatant.actor;
    if (!actor) return "1d20";

    // Use the actor's initiative total from the initiative skill
    const initiativeTotal = actor.system.initiative || 0;
    return `1d20 + ${initiativeTotal}`;
  }

  /**
   * Override rollInitiative to handle SWSE-specific initiative rolling
   * @param {string|string[]} ids - Combatant IDs to roll initiative for
   * @param {object} options - Additional options
   * @returns {Promise<Combat>}
   */
  async rollInitiative(ids, {formula=null, updateTurn=true, messageOptions={}}={}) {
    // Ensure array of IDs
    ids = typeof ids === "string" ? [ids] : ids;

    // Iterate over Combatants and roll initiative
    const updates = [];
    const messages = [];

    for (let id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) continue;

      // Get the initiative formula
      const rollFormula = formula || this._getInitiativeFormula(combatant);
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({async: true});

      updates.push({_id: id, initiative: roll.total});

      // Create chat message
      const actor = combatant.actor;
      const messageData = foundry.utils.mergeObject({
        speaker: ChatMessage.getSpeaker({
          actor: actor,
          token: combatant.token,
          alias: combatant.name
        }),
        flavor: game.i18n.format("COMBAT.RollsInitiative", {name: combatant.name}),
        flags: {"core.initiativeRoll": true}
      }, messageOptions);

      const chatData = await roll.toMessage(messageData, {create: false});

      // Play dice sound
      if (roll.dice.length) chatData.sound = CONFIG.sounds.dice;

      messages.push(chatData);
    }

    if (!updates.length) return this;

    // Update multiple combatants
    await this.updateEmbeddedDocuments("Combatant", updates);

    // Create multiple chat messages
    await ChatMessage.implementation.create(messages);

    // Optionally advance to the next turn
    if (updateTurn && this.round === 0) {
      await this.startCombat();
    }

    return this;
  }

  /**
   * Override rollAll to use SWSE initiative for all combatants
   * @param {object} options - Additional options
   * @returns {Promise<Combat>}
   */
  async rollAll(options={}) {
    const ids = this.combatants.reduce((ids, c) => {
      if (c.isOwner && (c.initiative === null)) ids.push(c.id);
      return ids;
    }, []);
    return this.rollInitiative(ids, options);
  }

  /**
   * Override rollNPC to use SWSE initiative for NPC combatants
   * @param {object} options - Additional options
   * @returns {Promise<Combat>}
   */
  async rollNPC(options={}) {
    const ids = this.combatants.reduce((ids, c) => {
      if (c.isOwner && c.isNPC && (c.initiative === null)) ids.push(c.id);
      return ids;
    }, []);
    return this.rollInitiative(ids, options);
  }

  /**
   * Begin combat tracking - reset resources at start
   * @override
   */
  async startCombat() {
    // Reset Second Wind for all combatants
    if (game.user.isGM) {
      for (const combatant of this.combatants) {
        if (combatant.actor) {
          await globalThis.SWSE.ActorEngine.updateActor(combatant.actor, {
            'system.secondWind.uses': 1,
            'system.actionEconomy': {
              swift: true,
              move: true,
              standard: true,
              fullRound: true,
              reaction: true
            }
          });
        }
      }
    }

    return super.startCombat();
  }

  /**
   * Advance to the next turn
   * @override
   */
  async nextTurn() {
    const result = await super.nextTurn();

    // Reset action economy for the new combatant
    const combatant = this.combatant;
    if (combatant?.actor && game.user.isGM) {
      await globalThis.SWSE.ActorEngine.updateActor(combatant.actor, {
        'system.actionEconomy': {
          swift: true,
          move: true,
          standard: true,
          fullRound: true,
          reaction: true
        }
      });
    }

    return result;
  }

  /**
   * Advance to the next round
   * @override
   */
  async nextRound() {
    const result = await super.nextRound();

    // Log round progression
    if (game.user.isGM) {
      swseLogger.log(`SWSE | Combat Round ${this.round}`);
    }

    return result;
  }
}
