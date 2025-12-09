import { SWSELogger } from '../../utils/logger.js';
import { ProgressionEngine } from "../../progression/engine/progression-engine.js";
/**
 * Grappling System for SWSE
 * Implements the complete grappling subsystem including:
 * - Grab attacks (initial unarmed grapple attempt)
 * - Grapple checks (opposed rolls)
 * - Three grapple states: Grabbed, Grappled, Pinned
 * - Escape mechanics
 * - Pin feat support
 */

export class SWSEGrappling {

    static getSelectedActor() {
        return canvas.tokens.controlled[0]?.actor;
    }


  /**
   * Initiate a Grab attack
   * @param {Actor} attacker - The grappling actor
   * @param {Actor} target - The target being grabbed
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Grab attempt result
   */
  static async attemptGrab(attacker, target, options = {}) {
    // Grab is an unarmed attack with -5 penalty if untrained
    const isTrainedUnarmed = this._hasUnarmedTraining(attacker);
    const penalty = isTrainedUnarmed ? 0 : -5;

    // Calculate attack bonus (similar to normal attack)
    const system = attacker.system;
    const bab = system.baseAttack || system.bab || 0;
    const strMod = system.abilities?.str?.mod || 0;
    const sizeMod = this._getSizeModifier(system.size);
    const misc = options.bonus || 0;

    const attackBonus = bab + strMod + sizeMod + misc + penalty;

    // Roll attack vs Reflex Defense
    const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${attackBonus}`).evaluate({async: true});
    const reflexDefense = target.system.defenses?.reflex?.total || 10;

    const result = {
      attacker,
      target,
      roll,
      total: roll.total,
      reflexDefense,
      hits: roll.total >= reflexDefense,
      penalty,
      breakdown: { bab, strMod, sizeMod, penalty, misc }
    };

    // If hit, apply Grabbed condition
    if (result.hits) {
      await this.applyGrabbedCondition(target, attacker);

      // Notify and offer grapple check
      ui.notifications.info(`${attacker.name} grabs ${target.name}!`);
    }

    // Create chat message
    await this._createGrabMessage(result);

    return result;
  }

  /**
   * Perform opposed Grapple check
   * @param {Actor} attacker - The active grappler
   * @param {Actor} defender - The defending grappler
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Grapple check result
   */
  static async opposedGrappleCheck(attacker, defender, options = {}) {
    // Calculate grapple bonuses for both
    const attackerBonus = this._calculateGrappleBonus(attacker);
    const defenderBonus = this._calculateGrappleBonus(defender);

    // Roll opposed checks
    const attackerRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${attackerBonus}`).evaluate({async: true});
    const defenderRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${defenderBonus}`).evaluate({async: true});

    const result = {
      attacker,
      defender,
      attackerRoll,
      defenderRoll,
      attackerTotal: attackerRoll.total,
      defenderTotal: defenderRoll.total,
      attackerBonus,
      defenderBonus,
      attackerWins: attackerRoll.total > defenderRoll.total,
      tie: attackerRoll.total === defenderRoll.total
    };

    // Handle tie (both maintain current state)
    if (result.tie) {
      ui.notifications.info(`Grapple check tied! Both maintain their positions.`);
    } else if (result.attackerWins) {
      ui.notifications.info(`${attacker.name} wins the grapple check!`);

      // Offer options: maintain, move, damage, or pin
      await this._showGrappleOptions(attacker, defender, options);
    } else {
      ui.notifications.info(`${defender.name} wins the grapple check!`);

      // Defender can escape or reverse
      await this._showDefenderOptions(defender, attacker, options);
    }

    // Create chat message
    await this._createGrappleCheckMessage(result);

    return result;
  }

  /**
   * Attempt to pin the target (requires Pin feat)
   * @param {Actor} attacker - The pinner
   * @param {Actor} target - The target being pinned
   * @returns {Promise<boolean>} Success status
   */
  static async attemptPin(attacker, target) {
    // Check if attacker has Pin feat
    const hasPinFeat = this._hasFeat(attacker, 'Pin');

    if (!hasPinFeat) {
      ui.notifications.warn(`${attacker.name} does not have the Pin feat!`);
      return false;
    }

    // Must already be grappling
    const isGrappling = this._hasCondition(attacker, 'Grappling') || this._hasCondition(attacker, 'Grabbed');
    if (!isGrappling) {
      ui.notifications.warn(`${attacker.name} must be grappling to pin!`);
      return false;
    }

    // Perform grapple check
    const result = await this.opposedGrappleCheck(attacker, target, { attemptPin: true });

    if (result.attackerWins) {
      await this.applyPinnedCondition(target, attacker);
      ui.notifications.info(`${attacker.name} pins ${target.name}!`);
      return true;
    }

    return false;
  }

  /**
   * Attempt to escape from grapple
   * @param {Actor} escaper - The actor trying to escape
   * @param {Actor} grappler - The grappler
   * @returns {Promise<boolean>} Success status
   */
  static async attemptEscape(escaper, grappler) {
    // Perform opposed grapple check
    const result = await this.opposedGrappleCheck(escaper, grappler, { attemptEscape: true });

    if (result.attackerWins) {
      await this.removeGrappleConditions(escaper);
      await this.removeGrappleConditions(grappler);
      ui.notifications.info(`${escaper.name} escapes the grapple!`);
      return true;
    }

    ui.notifications.info(`${escaper.name} fails to escape!`);
    return false;
  }

  /**
   * Apply Grabbed condition
   * @param {Actor} target - The grabbed actor
   * @param {Actor} grabber - The grabbing actor
   */
  static async applyGrabbedCondition(target, grabber) {
    const condition = {
      id: `grabbed-${randomID()}`,
      name: 'Grabbed',
      type: 'grapple',
      source: grabber.id,
      effects: {
        reflexDefense: -5,
        cannotMoveAway: true
      }
    };

    await this._addCondition(target, condition);
  }

  /**
   * Apply Grappled condition (both parties)
   * @param {Actor} actor1 - First grappler
   * @param {Actor} actor2 - Second grappler
   */
  static async applyGrappledCondition(actor1, actor2) {
    const condition1 = {
      id: `grappled-${randomID()}`,
      name: 'Grappled',
      type: 'grapple',
      source: actor2.id,
      effects: {
        reflexDefense: -5,
        cantMove: true,
        canOnlyAttackGrappler: true
      }
    };

    const condition2 = {
      id: `grappled-${randomID()}`,
      name: 'Grappled',
      type: 'grapple',
      source: actor1.id,
      effects: {
        reflexDefense: -5,
        cantMove: true,
        canOnlyAttackGrappler: true
      }
    };

    await this._addCondition(actor1, condition1);
    await this._addCondition(actor2, condition2);
  }

  /**
   * Apply Pinned condition
   * @param {Actor} target - The pinned actor
   * @param {Actor} pinner - The pinner
   */
  static async applyPinnedCondition(target, pinner) {
    const condition = {
      id: `pinned-${randomID()}`,
      name: 'Pinned',
      type: 'grapple',
      source: pinner.id,
      effects: {
        helpless: true,
        reflexDefense: -10,
        cannotMove: true,
        cannotAttack: true
      }
    };

    await this._addCondition(target, condition);
  }

  /**
   * Remove all grapple conditions from actor
   * @param {Actor} actor - The actor
   */
  static async removeGrappleConditions(actor) {
    const conditions = actor.system.conditions || [];
    const grappleConditions = conditions.filter(c => c.type === 'grapple');

    for (const condition of grappleConditions) {
      await this._removeCondition(actor, condition.id);
    }
  }

  // ========== Helper Methods ==========

  /**
   * Calculate grapple bonus
   * @private
   */
  static _calculateGrappleBonus(actor) {
    const system = actor.system;
    const bab = system.baseAttack || system.bab || 0;
    const strMod = system.abilities?.str?.mod || 0;
    const sizeMod = this._getSizeModifier(system.size);
    const grappleBonus = system.grappleBonus || 0;

    return bab + strMod + sizeMod + grappleBonus;
  }

  /**
   * Get size modifier for grappling
   * @private
   */
  static _getSizeModifier(size) {
    const sizeModifiers = {
      'fine': -16, 'diminutive': -12, 'tiny': -8, 'small': -4,
      'medium': 0, 'large': 4, 'huge': 8, 'gargantuan': 12, 'colossal': 16
    };
    return sizeModifiers[size?.toLowerCase()] || 0;
  }

  /**
   * Check if actor has unarmed training
   * @private
   */
  static _hasUnarmedTraining(actor) {
    // Check for Martial Arts feats or proficiency
    return this._hasFeat(actor, 'Martial Arts') ||
           this._hasFeat(actor, 'Weapon Proficiency (simple)');
  }

  /**
   * Check if actor has a feat
   * @private
   */
  static _hasFeat(actor, featName) {
    const feats = actor.items.filter(i => i.type === 'feat');
    return feats.some(f => f.name.toLowerCase().includes(featName.toLowerCase()));
  }

  /**
   * Check if actor has a condition
   * @private
   */
  static _hasCondition(actor, conditionName) {
    const conditions = actor.system.conditions || [];
    return conditions.some(c => c.name.toLowerCase() === conditionName.toLowerCase());
  }

  /**
   * Add condition to actor
   * @private
   */
  static async _addCondition(actor, condition) {
    const conditions = actor.system.conditions || [];
    conditions.push(condition);
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
globalThis.SWSE.ActorEngine.updateActor(actor, {'system.conditions': conditions});
  }

  /**
   * Remove condition from actor
   * @private
   */
  static async _removeCondition(actor, conditionId) {
    const conditions = actor.system.conditions || [];
    const filtered = conditions.filter(c => c.id !== conditionId);
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
globalThis.SWSE.ActorEngine.updateActor(actor, {'system.conditions': filtered});
  }

  /**
   * Show grapple options dialog for attacker
   * @private
   */
  static async _showGrappleOptions(attacker, defender, options) {
    return new Promise((resolve) => {
      new Dialog({
        title: `${attacker.name} - Grapple Options`,
        content: `
          <div class="swse-grapple-options">
            <p><strong>${attacker.name}</strong> won the grapple check!</p>
            <p>Choose an action:</p>
          </div>
        `,
        buttons: {
          maintain: {
            icon: '<i class="fas fa-hand-rock"></i>',
            label: 'Maintain Grapple',
            callback: async () => {
              ui.notifications.info(`${attacker.name} maintains the grapple.`);
              resolve('maintain');
            }
          },
          move: {
            icon: '<i class="fas fa-arrows-alt"></i>',
            label: 'Move',
            callback: async () => {
              ui.notifications.info(`${attacker.name} moves while grappling.`);
              resolve('move');
            }
          },
          damage: {
            icon: '<i class="fas fa-fist-raised"></i>',
            label: 'Deal Damage',
            callback: async () => {
              // Roll unarmed damage
              ui.notifications.info(`${attacker.name} deals damage while grappling.`);
              resolve('damage');
            }
          },
          pin: {
            icon: '<i class="fas fa-lock"></i>',
            label: 'Pin (requires feat)',
            callback: async () => {
              await this.attemptPin(attacker, defender);
              resolve('pin');
            }
          }
        },
        default: 'maintain'
      }).render(true);
    });
  }

  /**
   * Show defender options dialog
   * @private
   */
  static async _showDefenderOptions(defender, attacker, options) {
    return new Promise((resolve) => {
      new Dialog({
        title: `${defender.name} - Grapple Defense`,
        content: `
          <div class="swse-grapple-options">
            <p><strong>${defender.name}</strong> won the grapple check!</p>
            <p>Choose an action:</p>
          </div>
        `,
        buttons: {
          escape: {
            icon: '<i class="fas fa-running"></i>',
            label: 'Escape',
            callback: async () => {
              await this.removeGrappleConditions(defender);
              await this.removeGrappleConditions(attacker);
              ui.notifications.info(`${defender.name} escapes!`);
              resolve('escape');
            }
          },
          reverse: {
            icon: '<i class="fas fa-exchange-alt"></i>',
            label: 'Reverse Grapple',
            callback: async () => {
              ui.notifications.info(`${defender.name} reverses the grapple!`);
              // Swap grappler/defender roles
              resolve('reverse');
            }
          }
        },
        default: 'escape'
      }).render(true);
    });
  }

  /**
   * Create grab attack chat message
   * @private
   */
  static async _createGrabMessage(result) {
    const { attacker, target, roll, total, reflexDefense, hits, breakdown } = result;

    const content = `
      <div class="swse-grapple-roll">
        <div class="grapple-header">
          <h3><i class="fas fa-hand-rock"></i> Grab Attempt</h3>
        </div>
        <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-formula">${roll.formula}</div>
            <div class="dice-total">${total}</div>
          </div>
        </div>
        <div class="grapple-breakdown">
          <strong>Breakdown:</strong>
          BAB ${breakdown.bab >= 0 ? '+' : ''}${breakdown.bab},
          STR ${breakdown.strMod >= 0 ? '+' : ''}${breakdown.strMod},
          Size ${breakdown.sizeMod >= 0 ? '+' : ''}${breakdown.sizeMod}
          ${breakdown.penalty !== 0 ? `, Untrained ${breakdown.penalty}` : ''}
        </div>
        <div class="grapple-result">
          <strong>vs ${target.name}'s Reflex Defense (${reflexDefense})</strong>
          <div class="result-text ${hits ? 'hit' : 'miss'}">
            ${hits ? '<i class="fas fa-check-circle"></i> GRABBED!' : '<i class="fas fa-times-circle"></i> MISS!'}
          </div>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: attacker}),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll
    });
  }

  /**
   * Create grapple check chat message
   * @private
   */
  static async _createGrappleCheckMessage(result) {
    const { attacker, defender, attackerRoll, defenderRoll, attackerTotal, defenderTotal, attackerWins } = result;

    const content = `
      <div class="swse-grapple-check">
        <div class="grapple-header">
          <h3><i class="fas fa-hand-rock"></i> Grapple Check</h3>
        </div>
        <div class="opposed-rolls">
          <div class="grappler-roll">
            <strong>${attacker.name}:</strong>
            <div class="dice-total ${attackerWins ? 'winner' : ''}">${attackerTotal}</div>
          </div>
          <div class="vs">VS</div>
          <div class="defender-roll">
            <strong>${defender.name}:</strong>
            <div class="dice-total ${!attackerWins ? 'winner' : ''}">${defenderTotal}</div>
          </div>
        </div>
        <div class="grapple-result">
          <strong>Result:</strong>
          <div class="result-text ${attackerWins ? 'hit' : 'miss'}">
            ${attackerWins ? `${attacker.name} wins!` : `${defender.name} wins!`}
          </div>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: attacker}),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Initialize grappling system
   */
  static init() {
    SWSELogger.log('SWSE | Grappling system initialized');
  }
}

// Make available globally
window.SWSEGrappling = SWSEGrappling;
