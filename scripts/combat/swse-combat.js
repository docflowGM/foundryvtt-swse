import { swseLogger } from '../utils/logger.js';

/**
 * SWSE Combat Document (v13+)
 * - Uses correct SWSE initiative (Skill-based)
 * - Uses updated Second Wind + Action Economy systems
 * - Removes deprecated ActorEngine calls
 * - Fully v13-compatible combat lifecycle overrides
 */
export class SWSECombatDocument extends Combat {

  /* -------------------------------------------- */
  /* INITIATIVE FORMULA                           */
  /* -------------------------------------------- */

  /**
   * SWSE Initiative = 1d20 + Initiative Skill Total + Vehicle Size Modifier (if applicable)
   *
   * Vehicle Size Modifiers (SWSE Rules):
   * Colossal: -10, Gargantuan: -5, Huge: -2, Large: -1, Medium/Small/Tiny: 0
   */
  _getInitiativeFormula(combatant) {
    const actor = combatant.actor;
    if (!actor) {return '1d20';}

    let initTotal = actor.system.skills?.initiative?.total ?? 0;

    // Add vehicle size modifier if this is a vehicle
    if (actor.type === 'vehicle') {
      const sizeMod = this._getVehicleSizeModifier(actor);
      initTotal += sizeMod;
    }

    return `1d20 + ${initTotal}`;
  }

  /**
   * Get the size modifier for a vehicle's Initiative
   * Follows SWSE rules for vehicle-scale combat
   * @param {Actor} vehicle - The vehicle actor
   * @returns {number} The size modifier to apply to Initiative
   */
  _getVehicleSizeModifier(vehicle) {
    const size = vehicle.system.size?.toLowerCase() || 'medium';

    const sizeModifiers = {
      'colossal': -10,
      'gargantuan': -5,
      'huge': -2,
      'large': -1,
      'medium': 0,
      'small': 0,
      'tiny': 0,
      'diminutive': 0,
      'fine': 0
    };

    return sizeModifiers[size] ?? 0;
  }

  /* -------------------------------------------- */
  /* ROLL INITIATIVE                              */
  /* -------------------------------------------- */

  async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    ids = typeof ids === 'string' ? [ids] : ids;

    const updates = [];
    const messages = [];

    for (const id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) {continue;}

      const actor = combatant.actor;
      const rollFormula = formula || this._getInitiativeFormula(combatant);

      // safeRoll is async and already evaluates the roll, so just await it directly
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula);

      updates.push({ _id: id, initiative: roll.total });

      const chatData = await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor, token: combatant.token, alias: combatant.name }),
        flavor: game.i18n.format('COMBAT.RollsInitiative', { name: combatant.name }),
        flags: { 'core.initiativeRoll': true },
        ...messageOptions
      }, { create: true });

      if (roll.dice.length) {chatData.sound = CONFIG.sounds.dice;}
      messages.push(chatData);
    }

    if (updates.length) {
      await this.updateEmbeddedDocuments('Combatant', updates);
      await ChatMessage.implementation.create(messages);
    }

    if (updateTurn && this.round === 0) {
      await this.startCombat();
    }

    return this;
  }

  /* -------------------------------------------- */
  /* ROLL ALL INITIATIVE                          */
  /* -------------------------------------------- */

  async rollAll(options = {}) {
    const ids = this.combatants
      .filter(c => c.isOwner && c.initiative === null)
      .map(c => c.id);

    return this.rollInitiative(ids, options);
  }

  /* -------------------------------------------- */
  /* ROLL NPC INITIATIVE                          */
  /* -------------------------------------------- */

  async rollNPC(options = {}) {
    const ids = this.combatants
      .filter(c => c.isOwner && !c.actor.hasPlayerOwner && c.initiative === null)
      .map(c => c.id);

    return this.rollInitiative(ids, options);
  }

  /* -------------------------------------------- */
  /* START COMBAT                                 */
  /* -------------------------------------------- */

  async startCombat() {
    if (game.user.isGM) {
      // PHASE 3: Route through ActorEngine
      const { ActorEngine } = await import('../../actors/engine/actor-engine.js');

      for (const combatant of this.combatants) {
        const actor = combatant.actor;
        if (!actor) {continue;}

        // Reset Second Wind (RAW: once per day, but many tables want per encounter)
        await ActorEngine.resetSecondWind(actor);

        // Reset action economy
        await ActorEngine.updateActionEconomy(actor, {
          swift: true,
          move: true,
          standard: true,
          fullRound: true,
          reaction: true
        });
      }
    }

    return super.startCombat();
  }

  /* -------------------------------------------- */
  /* NEXT TURN                                    */
  /* -------------------------------------------- */

  async nextTurn() {
    const result = await super.nextTurn();

    // Reset action economy when turn starts
    // PHASE 3: Route through ActorEngine
    if (game.user.isGM) {
      const c = this.combatant;
      const actor = c?.actor;

      if (actor) {
        const { ActorEngine } = await import('../../actors/engine/actor-engine.js');
        await ActorEngine.updateActionEconomy(actor, {
          swift: true,
          move: true,
          standard: true,
          fullRound: true,
          reaction: true
        });
      }
    }

    return result;
  }

  /* -------------------------------------------- */
  /* NEXT ROUND                                   */
  /* -------------------------------------------- */

  async nextRound() {
    const result = await super.nextRound();

    if (game.user.isGM) {
      swseLogger.log(`SWSE | Combat Round ${this.round}`);
    }

    return result;
  }
}
