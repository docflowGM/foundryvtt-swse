// ============================================
// FILE: dice-utils.js
// Merged dice rolling utilities for SWSE
// ============================================

/**
 * Evaluate a roll and send to chat
 * @param {Roll} roll - The roll to evaluate
 * @param {object} options - Chat message options
 * @returns {Promise<Roll>} Evaluated roll
 */
async function evaluateRoll(roll, options = {}) {
    await roll.evaluate({async: true});
    await roll.toMessage(options);
    return roll;
}

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
        ui.notifications.error(`Dice roll failed: ${err.message}`);
        console.error(err);
        return null;
    }
}

/**
 * Quick d20 roll
 * @param {number} modifier - Modifier to add
 * @param {string} label - Label for the roll
 * @returns {Promise<Roll>} The roll result
 */
export async function d20(modifier = 0, label = "d20") {
    return rollDice(`1d20 + ${modifier}`, {}, label);
}

/**
 * Roll an attack with modifiers
 * @param {number} baseAttack - Base attack bonus
 * @param {number[]} modifiers - Array of additional modifiers
 * @param {object} rollData - Additional roll data
 * @returns {Promise<Roll>} The evaluated roll
 */
export async function rollAttack(baseAttack, modifiers = [], rollData = {}) {
    const totalMod = modifiers.reduce((sum, mod) => sum + mod, baseAttack);
    const roll = new Roll("1d20 + @total", { ...rollData, total: totalMod });
    return await evaluateRoll(roll, {
        speaker: ChatMessage.getSpeaker(),
        flavor: "Attack Roll"
    });
}

/**
 * Roll damage dice
 * @param {string} damageDice - Damage dice formula (e.g., "2d6")
 * @param {number} modifier - Damage modifier
 * @param {object} rollData - Additional roll data
 * @returns {Promise<Roll>} The evaluated roll
 */
export async function rollDamage(damageDice, modifier = 0, rollData = {}) {
    const roll = new Roll(`${damageDice} + @mod`, { ...rollData, mod: modifier });
    return await evaluateRoll(roll, {
        speaker: ChatMessage.getSpeaker(),
        flavor: "Damage"
    });
}

/**
 * Roll for initiative
 * @param {number} initiativeBonus - Initiative bonus
 * @param {object} rollData - Additional roll data
 * @returns {Promise<Roll>} The evaluated roll
 */
export async function rollInitiative(initiativeBonus = 0, rollData = {}) {
    const roll = new Roll("1d20 + @init", { ...rollData, init: initiativeBonus });
    return await evaluateRoll(roll, {
        speaker: ChatMessage.getSpeaker(),
        flavor: "Initiative"
    });
}

/**
 * Roll a skill check
 * @param {number} skillModifier - Total skill modifier
 * @param {object} rollData - Additional roll data
 * @returns {Promise<Roll>} The evaluated roll
 */
export async function rollSkillCheck(skillModifier = 0, rollData = {}) {
    const roll = new Roll("1d20 + @skill", { ...rollData, skill: skillModifier });
    return await evaluateRoll(roll, {
        speaker: ChatMessage.getSpeaker(),
        flavor: "Skill Check"
    });
}

/**
 * Check for a critical hit
 * @param {number} rollResult - The d20 roll result
 * @param {number} criticalRange - The critical threat range (default 20)
 * @returns {boolean} True if critical threat
 */
export function isCriticalThreat(rollResult, criticalRange = 20) {
    return rollResult >= criticalRange;
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
