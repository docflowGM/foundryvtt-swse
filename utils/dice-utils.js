/**
 * Dice Rolling Utilities for SWSE
 */

/**
 * Roll an attack with modifiers
 * @param {number} baseAttack - Base attack bonus
 * @param {number[]} modifiers - Array of additional modifiers
 * @returns {Roll} The roll object
 */
export function rollAttack(baseAttack, modifiers = []) {
    const totalMod = modifiers.reduce((sum, mod) => sum + mod, baseAttack);
    const roll = new Roll("1d20 + @total", { total: totalMod });
    return roll;
}

/**
 * Roll damage dice
 * @param {string} damageDice - Damage dice formula (e.g., "2d6")
 * @param {number} modifier - Damage modifier
 * @returns {Roll} The roll object
 */
export function rollDamage(damageDice, modifier = 0) {
    const roll = new Roll(`${damageDice} + @mod`, { mod: modifier });
    return roll;
}

/**
 * Roll for initiative
 * @param {number} initiativeBonus - Initiative bonus
 * @returns {Roll} The roll object
 */
export function rollInitiative(initiativeBonus = 0) {
    const roll = new Roll("1d20 + @init", { init: initiativeBonus });
    return roll;
}

/**
 * Roll a skill check
 * @param {number} skillModifier - Total skill modifier
 * @returns {Roll} The roll object
 */
export function rollSkillCheck(skillModifier = 0) {
    const roll = new Roll("1d20 + @skill", { skill: skillModifier });
    return roll;
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
