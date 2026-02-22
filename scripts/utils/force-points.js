import { ProgressionEngine } from '../engines/progression/engine/progression-engine.js';
import { createChatMessage } from '../core/document-api-v13.js';
/**
 * Force Points utility functions for rolling and spending Force Points
 */

export class ForcePointsUtil {

  /**
   * Roll Force Point dice and optionally apply Dark Side temptation
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

    // Get Force Point dice configuration based on level and dice type
    const diceType = actor.system.forcePoints?.diceType || 'd6';
    const level = actor.system.level?.heroic || actor.system.level || 1;

    // Determine number of dice to roll
    let numDice = 1;
    if (level >= 15) {
      numDice = 3;
    } else if (level >= 8) {
      numDice = 2;
    }

    // Roll the dice with the selected dice type
    const roll = await globalThis.SWSE.RollEngine.safeRoll(`${numDice}${diceType}`).evaluate();

    // For multiple dice, take the highest
    let bonus = 0;
    if (numDice > 1) {
      bonus = Math.max(...roll.dice[0].results.map(r => r.result));
    } else {
      bonus = roll.total;
    }

    // Handle Dark Side temptation
    let darkSideBonus = 0;
    let darkSideUsed = false;
    if (useDarkSide) {
      const darkSideRoll = await globalThis.SWSE.RollEngine.safeRoll(`1${diceType}`).evaluate();
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
      numDice
    });

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: messageContent,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      sound: CONFIG.sounds.dice
    });

    // Increase Dark Side Score if using Dark Side
    if (darkSideUsed) {
      const currentDarkSide = actor.system.darkSideScore || 0;
      await globalThis.SWSE?.ActorEngine?.updateActor(actor, { 'system.darkSideScore': currentDarkSide + 1 });
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
    const darkSideTemptation = game.settings.get('foundryvtt-swse', 'darkSideTemptation');
    if (darkSideTemptation === 'narrative') {return false;}

    // Check if Dark Side Score <= half Wisdom
    const darkSideScore = actor.system.darkSideScore || 0;
    const wisdomScore = actor.system.attributes?.wis?.total || 10;
    const halfWisdom = Math.floor(wisdomScore / 2);

    return darkSideScore <= halfWisdom;
  }

  /**
   * Show dialog for spending Force Point with optional Dark Side temptation
   * @param {Actor} actor - The actor spending the Force Point
   * @param {string} reason - The reason for spending the Force Point
   * @returns {Promise<Object|null>} The result object or null if cancelled
   */
  static async showForcePointDialog(actor, reason = 'boost') {
    const canDarkSide = this.canUseDarkSide(actor);
    const diceType = actor.system.forcePoints?.diceType || 'd6';
    const level = actor.system.level?.heroic || actor.system.level || 1;
    let numDice = 1;
    if (level >= 15) {
      numDice = 3;
    } else if (level >= 8) {
      numDice = 2;
    }
    const diceDesc = numDice > 1 ? `${numDice}${diceType} (take highest)` : `${numDice}${diceType}`;

    return new Promise((resolve) => {
      const dialog = new SWSEDialogV2({
        title: 'Spend Force Point',
        content: `
          <form>
            <div class="form-group">
              <label>Spend a Force Point for ${reason}?</label>
              <p>You will roll ${diceDesc} and add the ${numDice > 1 ? 'highest result' : 'result'} to your roll.</p>
            </div>
            ${canDarkSide ? `
              <div class="form-group">
                <label>
                  <input type="checkbox" name="useDarkSide"/>
                  Call upon the Dark Side (+1${diceType}, increases Dark Side Score by 1)
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
    const { reason, roll, bonus, darkSideRoll, totalBonus, numDice } = data;

    const html = `
      <div class="swse force-point-roll">
        <h3><i class="fa-solid fa-hand-sparkles"></i> Force Point Spent</h3>
        <div class="dice-roll">
          <div class="dice-formula">${roll.formula}</div>
          <div class="dice-tooltip">
            ${roll.dice[0].results.map((r, i) =>
              `<span class="die d6 ${i === roll.dice[0].results.findIndex(x => x.result === bonus) && numDice > 1 ? 'max' : ''}">${r.result}</span>`
            ).join(' ')}
          </div>
          ${numDice > 1 ? `<div class="dice-total">Highest: <strong>${bonus}</strong></div>` : `<div class="dice-total">Result: <strong>${bonus}</strong></div>`}
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
    const currentDarkSide = actor.system.darkSideScore || 0;

    if (currentDarkSide === 0) {
      ui.notifications.info('Your Dark Side Score is already 0.');
      return false;
    }

    // Spend the Force Point
    const spent = await actor.spendForcePoint('reducing Dark Side Score');
    if (!spent) {return false;}

    // Reduce Dark Side Score
    await globalThis.SWSE?.ActorEngine?.updateActor(actor, { 'system.darkSideScore': currentDarkSide - 1 });
    ui.notifications.info(`Dark Side Score reduced to ${currentDarkSide - 1}`);
    return true;
  }

  /**
   * Avoid death by spending a Force Point
   * @param {Actor} actor - The actor avoiding death
   * @returns {Promise<boolean>} Whether death was avoided
   */
  static async avoidDeath(actor) {
    // Spend the Force Point
    const spent = await actor.spendForcePoint('avoiding death');
    if (!spent) {return false;}

    // Set HP to 0 and set condition track to helpless but alive
    await globalThis.SWSE?.ActorEngine?.updateActor(actor, {
      'system.hp.value': 0,
      'system.conditionTrack.current': Math.min(4, actor.system.conditionTrack.current)
    });


    createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><strong>${actor.name}</strong> spends a Force Point to avoid death and falls unconscious!</p>`
    });

    ui.notifications.warn(`${actor.name} avoids death but falls unconscious!`);
    return true;
  }
}
