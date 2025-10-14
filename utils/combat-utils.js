/**
 * Combat-Related Utilities for SWSE
 */

/**
 * Calculate attack bonus
 * @param {number} bab - Base attack bonus
 * @param {number} abilityMod - Ability modifier
 * @param {number[]} otherBonuses - Other bonuses
 * @returns {number} Total attack bonus
 */
export function calculateAttackBonus(bab, abilityMod, otherBonuses = []) {
    return bab + abilityMod + otherBonuses.reduce((sum, bonus) => sum + bonus, 0);
}

/**
 * Calculate damage
 * @param {string} baseDamage - Base damage dice
 * @param {number} abilityMod - Ability modifier
 * @param {number[]} otherBonuses - Other bonuses
 * @returns {object} Damage formula and total modifier
 */
export function calculateDamage(baseDamage, abilityMod, otherBonuses = []) {
    const totalMod = abilityMod + otherBonuses.reduce((sum, bonus) => sum + bonus, 0);
    return {
        formula: `${baseDamage} + ${totalMod}`,
        modifier: totalMod
    };
}

/**
 * Apply condition track penalty
 * @param {string} conditionTrack - Current condition track position
 * @returns {number} Penalty value
 */
export function getConditionPenalty(conditionTrack) {
    const penalties = {
        normal: 0,
        "-1": -1,
        "-2": -2,
        "-5": -5,
        "-10": -10,
        disabled: -10,
        unconscious: -10,
        dead: -100
    };
    return penalties[conditionTrack] || 0;
}

/**
 * Calculate cover bonus
 * @param {string} coverType - "none", "partial", "cover", "improved"
 * @returns {number} Cover bonus to Reflex Defense
 */
export function getCoverBonus(coverType) {
    const bonuses = {
        none: 0,
        partial: 2,
        cover: 5,
        improved: 10
    };
    return bonuses[coverType] || 0;
}

/**
 * Calculate concealment miss chance
 * @param {string} concealmentType - "none", "partial", "total"
 * @returns {number} Percentage miss chance
 */
export function getConcealmentMissChance(concealmentType) {
    const chances = {
        none: 0,
        partial: 20,
        concealment: 20,
        total: 50
    };
    return chances[concealmentType] || 0;
}

/**
 * Check if attack hits based on concealment
 * @param {number} missChance - Miss chance percentage
 * @returns {boolean} True if attack hits
 */
export function checkConcealmentHit(missChance) {
    const roll = Math.floor(Math.random() * 100) + 1;
    return roll > missChance;
}

/**
 * Calculate flanking bonus
 * @param {boolean} isFlanking - Is attacker flanking
 * @returns {number} Flanking bonus
 */
export function getFlankingBonus(isFlanking) {
    return isFlanking ? 2 : 0;
}
