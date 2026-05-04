import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";

// ============================================
// FILE: rolls/dice.js
// Generic dice rolling through the V2 roll facade
// ============================================

/**
 * Roll dice with a formula and render through SWSEChat.
 * @param {string} formula - Dice formula (e.g., "2d6+3")
 * @param {object} data - Data for formula variables
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll|null>} The roll result
 */
export async function rollDice(formula, data = {}, label = 'Roll') {
  try {
    const roll = await globalThis.SWSE.RollEngine.safeRoll(formula, data, {
      domain: 'generic.dice',
      context: { label }
    });

    await SWSEChat.postRoll({
      roll,
      speaker: ChatMessage.getSpeaker(),
      flavor: label,
      context: { type: 'generic', label, formula }
    });

    return roll;
  } catch (err) {
    ui.notifications.error(game.i18n.format('SWSE.Notifications.Rolls.DiceRollFailed', { error: err.message }));
    SWSELogger.error(err);
    return null;
  }
}

/**
 * Roll with advantage (roll twice, take higher)
 * @param {string} formula - Dice formula
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll|null>} The higher roll
 */
export async function rollWithAdvantage(formula, label = 'Roll with Advantage') {
  const roll1 = await globalThis.SWSE.RollEngine.safeRoll(formula, {}, { domain: 'generic.advantage', context: { label, instance: 1 } });
  const roll2 = await globalThis.SWSE.RollEngine.safeRoll(formula, {}, { domain: 'generic.advantage', context: { label, instance: 2 } });

  const higherRoll = roll1.total >= roll2.total ? roll1 : roll2;

  await SWSEChat.postRoll({
    roll: higherRoll,
    speaker: ChatMessage.getSpeaker(),
    flavor: `${label} (${roll1.total} vs ${roll2.total})`,
    context: { type: 'advantage', label, firstTotal: roll1.total, secondTotal: roll2.total }
  });

  return higherRoll;
}

/**
 * Roll with disadvantage (roll twice, take lower)
 * @param {string} formula - Dice formula
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll|null>} The lower roll
 */
export async function rollWithDisadvantage(formula, label = 'Roll with Disadvantage') {
  const roll1 = await globalThis.SWSE.RollEngine.safeRoll(formula, {}, { domain: 'generic.disadvantage', context: { label, instance: 1 } });
  const roll2 = await globalThis.SWSE.RollEngine.safeRoll(formula, {}, { domain: 'generic.disadvantage', context: { label, instance: 2 } });

  const lowerRoll = roll1.total <= roll2.total ? roll1 : roll2;

  await SWSEChat.postRoll({
    roll: lowerRoll,
    speaker: ChatMessage.getSpeaker(),
    flavor: `${label} (${roll1.total} vs ${roll2.total})`,
    context: { type: 'disadvantage', label, firstTotal: roll1.total, secondTotal: roll2.total }
  });

  return lowerRoll;
}

/**
 * Quick d20 roll
 * @param {number} modifier - Modifier to add
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll|null>} The roll result
 */
export async function d20(modifier = 0, label = 'd20') {
  return rollDice(`1d20 + ${modifier}`, {}, label);
}
