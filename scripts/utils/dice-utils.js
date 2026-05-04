import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
// ============================================
// FILE: dice-utils.js
// Compatibility dice utilities backed by RollEngine + SWSEChat
// ============================================

async function postRoll(roll, flavor, context = {}) {
  if (!roll) return null;
  await SWSEChat.postRoll({
    roll,
    speaker: ChatMessage.getSpeaker(),
    flavor,
    context
  });
  return roll;
}

/** Roll dice with a formula. */
export async function rollDice(formula, data = {}, label = 'Roll') {
  try {
    const roll = await globalThis.SWSE.RollEngine.safeRoll(formula, data, {
      domain: 'utility.dice',
      context: { label }
    });
    return await postRoll(roll, label, { type: 'utility', label, formula });
  } catch (err) {
    ui.notifications.error(`Dice roll failed: ${err.message}`);
    SWSELogger.error(err);
    return null;
  }
}

/** Quick d20 roll. */
export async function d20(modifier = 0, label = 'd20') {
  return rollDice(`1d20 + ${modifier}`, {}, label);
}

/** Roll an attack with modifiers. */
export async function rollAttack(baseAttack, modifiers = [], rollData = {}) {
  const totalMod = modifiers.reduce((sum, mod) => sum + mod, baseAttack);
  const roll = await globalThis.SWSE.RollEngine.safeRoll('1d20 + @total', { ...rollData, total: totalMod }, {
    domain: 'utility.attack',
    context: { baseAttack, modifiers }
  });
  return await postRoll(roll, 'Attack Roll', { type: 'attack', baseAttack, modifiers, totalMod });
}

/** Roll damage dice. */
export async function rollDamage(damageDice, modifier = 0, rollData = {}) {
  const roll = await globalThis.SWSE.RollEngine.safeRoll(`${damageDice} + @mod`, { ...rollData, mod: modifier }, {
    domain: 'utility.damage',
    context: { damageDice, modifier }
  });
  return await postRoll(roll, 'Damage', { type: 'damage', damageDice, modifier });
}

/** Roll for initiative. */
export async function rollInitiative(initiativeBonus = 0, rollData = {}) {
  const roll = await globalThis.SWSE.RollEngine.safeRoll('1d20 + @init', { ...rollData, init: initiativeBonus }, {
    domain: 'utility.initiative',
    context: { initiativeBonus }
  });
  return await postRoll(roll, 'Initiative', { type: 'initiative', initiativeBonus });
}

/** Roll a skill check. */
export async function rollSkillCheck(skillModifier = 0, rollData = {}) {
  const roll = await globalThis.SWSE.RollEngine.safeRoll('1d20 + @skill', { ...rollData, skill: skillModifier }, {
    domain: 'utility.skill',
    context: { skillModifier }
  });
  return await postRoll(roll, 'Skill Check', { type: 'skill', skillModifier });
}

/** Check for a critical hit. */
export function isCriticalThreat(rollResult, criticalRange = 20) {
  return rollResult >= criticalRange;
}

/** Roll with advantage. */
export async function rollWithAdvantage(formula, label = 'Roll with Advantage') {
  const roll1 = await globalThis.SWSE.RollEngine.safeRoll(formula, {}, { domain: 'utility.advantage', context: { label, instance: 1 } });
  const roll2 = await globalThis.SWSE.RollEngine.safeRoll(formula, {}, { domain: 'utility.advantage', context: { label, instance: 2 } });
  const higherRoll = roll1.total >= roll2.total ? roll1 : roll2;
  return await postRoll(higherRoll, `${label} (${roll1.total} vs ${roll2.total})`, { type: 'advantage', label, firstTotal: roll1.total, secondTotal: roll2.total });
}

/** Roll with disadvantage. */
export async function rollWithDisadvantage(formula, label = 'Roll with Disadvantage') {
  const roll1 = await globalThis.SWSE.RollEngine.safeRoll(formula, {}, { domain: 'utility.disadvantage', context: { label, instance: 1 } });
  const roll2 = await globalThis.SWSE.RollEngine.safeRoll(formula, {}, { domain: 'utility.disadvantage', context: { label, instance: 2 } });
  const lowerRoll = roll1.total <= roll2.total ? roll1 : roll2;
  return await postRoll(lowerRoll, `${label} (${roll1.total} vs ${roll2.total})`, { type: 'disadvantage', label, firstTotal: roll1.total, secondTotal: roll2.total });
}
