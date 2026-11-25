import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { ForcePointsService } from "/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
/**
 * Force Points utility functions for rolling and spending Force Points
 */

export class ForcePointsUtil {

  /**
   * Roll Force Point dice and optionally apply Dark Side temptation
   * Uses ForcePointsService for canonical heroic scaling
   *
   * @param {Actor} actor - The actor spending the Force Point
   * @param {Object} options - Options for the roll
   * @param {string} options.reason - The reason for spending the Force Point
   * @param {boolean} options.useDarkSide - Whether to use Dark Side temptation
   * @returns {Promise<number>} The bonus from the Force Point roll
   */
  static async rollForcePoint(actor, options = {}) {
    // Guard: Ensure SWSE engine is loaded
    if (!globalThis.SWSE?.RollEngine) {
      ui.notifications?.error('Force Point roll failed: SWSE system not fully loaded.');
      return 0;
    }

    const { reason = 'boost', useDarkSide = false } = options;

    // Get heroic scaling from ForcePointsService (canonical source). Pass the
    // roll context so feats like Gungan Weapon Master can alter the die size for
    // specific weapon/roll uses without changing global Force Point dice.
    const { diceCount, dieSize } = await ForcePointsService.getScalingDice(actor, { ...options, reason });
    const forceDice = `${diceCount}${dieSize}`;

    // Roll the dice with heroic scaling
    const roll = await globalThis.SWSE.RollEngine.safeRoll(forceDice, {}, { domain: 'force-point', context: { ...options, reason } });

    // For multiple dice, take the highest
    let bonus = 0;
    if (diceCount > 1) {
      bonus = Math.max(...roll.dice[0].results.map(r => r.result));
    } else {
      bonus = roll.total;
    }

    // Handle Dark Side temptation
    let darkSideBonus = 0;
    let darkSideUsed = false;
    if (useDarkSide) {
      const darkSideRoll = await globalThis.SWSE.RollEngine.safeRoll(`1${dieSize}`, {}, { domain: 'force-point.dark-side', context: { ...options, reason } });
      darkSideBonus = darkSideRoll.total;
      darkSideUsed = true;
    }

    const totalBonus = bonus + darkSideBonus;

    // Create chat message
    const messageContent = await this._createForcePointMessage(actor, {
      reason,
      roll,
      bonus,
      darkSideRoll: darkSideUsed ? darkSideBonus : null,
      totalBonus,
      diceCount
    });

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: messageContent,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      sound: CONFIG.sounds.dice
    });

    // Increase Dark Side Score if using Dark Side
    if (darkSideUsed) {
      const nextDarkSide = DSPEngine.getNextValue(actor, 1);
      await globalThis.SWSE?.ActorEngine?.updateActor(actor, { 'system.darkSide.value': nextDarkSide });
    }

    return totalBonus;
  }

  /**
   * Check if actor can use Dark Side temptation
   * @param {Actor} actor - The actor to check
   * @returns {boolean} Whether the actor can use Dark Side
   */
  static canUseDarkSide(actor) {
    // Check if Dark Side Temptation is enabled
    const darkSideTemptation = HouseRuleService.getString('darkSideTemptation', 'strict');
    if (darkSideTemptation === 'narrative') {return false;}

    // Check if Dark Side Score <= half Wisdom
    const wisdomScore = SchemaAdapters.getAbilityScore(actor, 'wis');
    const halfWisdom = Math.floor(wisdomScore / 2);

    return DSPEngine.getValue(actor) <= halfWisdom;
  }

  /**
   * Show dialog for spending Force Point with optional Dark Side temptation
   * @param {Actor} actor - The actor spending the Force Point
   * @param {string} reason - The reason for spending the Force Point
   * @param {Object} options - Additional Force Point context
   * @returns {Promise<Object|null>} The result object or null if cancelled
   */
  static async showForcePointDialog(actor, reason = 'boost', options = {}) {
    const canDarkSide = this.canUseDarkSide(actor);
    const context = { ...options, reason };
    const diceDesc = await ForcePointsService.getFormulaDisplay(actor, context);
    const { diceCount, dieSize } = await ForcePointsService.getScalingDice(actor, context);

    return new Promise((resolve) => {
      const dialog = new SWSEDialogV2({
        title: 'Spend Force Point',
        content: `
          <form>
            <div class="form-group">
              <label>Spend a Force Point for ${reason}?</label>
              <p>You will roll ${diceDesc} and add the ${diceCount > 1 ? 'highest result' : 'result'} to your roll.</p>
            </div>
            ${canDarkSide ? `
              <div class="form-group">
                <label>
                  <input type="checkbox" name="useDarkSide"/>
                  Call upon the Dark Side (+1${dieSize}, increases Dark Side Score by 1)
                </label>
              </div>
            ` : ''}
            <div class="form-group">
              <p><strong>Force Points Remaining:</strong> ${actor.system.forcePoints.value}/${actor.system.forcePoints.max}</p>
            </div>
          </form>
        `,
        buttons: {
          spend: {
            icon: '<i class="fa-solid fa-dice"></i>',
            label: 'Spend Force Point',
            callback: html => {
              const element = html instanceof HTMLElement ? html : html[0];
              const checkbox = element?.querySelector('[name="useDarkSide"]');
              const useDarkSide = checkbox?.checked || false;
              resolve({ confirmed: true, useDarkSide });
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'spend',
        close: () => resolve(null)
      });
      dialog.render(true);
    });
  }

  /**
   * Create HTML message for Force Point roll
   * @private
   */
  static async _createForcePointMessage(actor, data) {
    const { reason, roll, bonus, darkSideRoll, totalBonus, diceCount } = data;

    const html = `
      <div class="swse force-point-roll">
        <h3><i class="fa-solid fa-hand-sparkles"></i> Force Point Spent</h3>
        <div class="dice-roll">
          <div class="dice-formula">${roll.formula}</div>
          <div class="dice-tooltip">
            ${roll.dice[0].results.map((r, i) =>
              `<span class="die d6 ${i === roll.dice[0].results.findIndex(x => x.result === bonus) && diceCount > 1 ? 'max' : ''}">${r.result}</span>`
            ).join(' ')}
          </div>
          ${diceCount > 1 ? `<div class="dice-total">Highest: <strong>${bonus}</strong></div>` : `<div class="dice-total">Result: <strong>${bonus}</strong></div>`}
        </div>
        ${darkSideRoll !== null ? `
          <div class="dark-side-bonus">
            <i class="fa-solid fa-moon"></i> Dark Side Bonus: +${darkSideRoll}
            <div class="warning">Dark Side Score increased by 1</div>
          </div>
        ` : ''}
        <div class="force-point-total">
          <strong>Total Bonus: +${totalBonus}</strong>
        </div>
        <div class="force-point-reason">
          Used for: <em>${reason}</em>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Reduce Dark Side Score by spending a Force Point
   * @param {Actor} actor - The actor reducing their Dark Side Score
   * @returns {Promise<boolean>} Whether the reduction was successful
   */
  static async reduceDarkSide(actor) {
    const engine = globalThis.SWSE?.ActorEngine;
    if (!engine) return false;
    const currentDarkSide = DSPEngine.getValue(actor);
    if (!(currentDarkSide > 0)) {
      ui.notifications.info('Your Dark Side Score is already 0.');
      return false;
    }

    const context = { useKind: 'reduce-dark-side-score' };
    const policy = ForcePointsService.authorizeSpend(actor, context);
    if (!policy.valid) {
      ui.notifications.error(`Cannot reduce Dark Side Score: ${policy.message}`);
      return false;
    }

    let receipt;
    try {
      receipt = await engine.spendForcePoints(actor, 1, context);
    } catch (error) {
      ui.notifications.error(`Force Point was not authorized or committed: ${error.message}`);
      return false;
    }

    try {
      const nextDarkSide = DSPEngine.getNextValue(actor, -1);
      await engine.updateActor(actor, { 'system.darkSide.value': nextDarkSide });
      // No automatic refund after the mechanical benefit succeeds.
      const finality = await engine.finalizeForcePointSpend(actor, receipt);
      if (!finality?.finalized) console.error('Dark Side reduction applied but FP receipt finalization failed', finality);
      ui.notifications.info(`Dark Side Score reduced to ${nextDarkSide}`);
      return true;
    } catch (error) {
      // Compensate only while the consequence has not been applied.
      if (DSPEngine.getValue(actor) === currentDarkSide) {
        try {
          const rollback = await engine.rollbackForcePointSpend(actor, receipt);
          if (!rollback?.rolledBack) console.error('Force Point rollback refused', rollback);
        } catch (refundError) { console.error('Force Point rollback indeterminate', refundError); }
      } else {
        console.error('Dark Side Score was reduced but transaction completion was not confirmed; no automatic refund', error);
      }
      ui.notifications.error('Dark Side Score reduction could not be completed or confirmed. Review the actor resources.');
      return false;
    }
  }
}
