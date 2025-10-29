// ============================================
// FILE: rolls/dice.js
// Generic dice rolling using SWSE utils
// ============================================

/**
 * Roll dice with a formula
 * @param {string} formula - Dice formula (e.g., "2d6+3")
 * @param {object} data - Data for formula variables
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The roll result
 */
export async function rollDice(formula, data = {}, label = "Roll") {
  try {
    const roll = await new Roll(formula, data).evaluate({async: true});
    
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: label
    });
    
    return roll;
  } catch (err) {
    assets/ui.notifications.error(`Dice roll failed: ${err.message}`);
    console.error(err);
    return null;
  }
}

/**
 * Roll with advantage (roll twice, take higher)
 * @param {string} formula - Dice formula
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The higher roll
 */
export async function rollWithAdvantage(formula, label = "Roll with Advantage") {
  const roll1 = await new Roll(formula).evaluate({async: true});
  const roll2 = await new Roll(formula).evaluate({async: true});
  
  const higherRoll = roll1.total >= roll2.total ? roll1 : roll2;
  
  await higherRoll.toMessage({
    speaker: ChatMessage.getSpeaker(),
    flavor: `${label} (${roll1.total} vs ${roll2.total})`
  });
  
  return higherRoll;
}

/**
 * Roll with disadvantage (roll twice, take lower)
 * @param {string} formula - Dice formula
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The lower roll
 */
export async function rollWithDisadvantage(formula, label = "Roll with Disadvantage") {
  const roll1 = await new Roll(formula).evaluate({async: true});
  const roll2 = await new Roll(formula).evaluate({async: true});
  
  const lowerRoll = roll1.total <= roll2.total ? roll1 : roll2;
  
  await lowerRoll.toMessage({
    speaker: ChatMessage.getSpeaker(),
    flavor: `${label} (${roll1.total} vs ${roll2.total})`
  });
  
  return lowerRoll;
}

/**
 * Qassets/uick d20 roll
 * @param {number} modifier - Modifier to add
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The roll result
 */
export async function d20(modifier = 0, label = "d20") {
  return rollDice(`1d20 + ${modifier}`, {}, label);
}
