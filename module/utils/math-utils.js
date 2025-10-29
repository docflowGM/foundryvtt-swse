/**
 * Mathematical Utilities for SWSE
 */

/**
 * Calculate ability modifier from ability score
 * @param {number} score - Ability score
 * @returns {number} Ability modifier
 */
export function calculateAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
}

/**
 * Calculate Base Attack Bonus
 * @param {number} level - Character level
 * @param {string} progression - "fast", "medium", or "slow"
 * @returns {number} Base Attack Bonus
 */
export function calculateBAB(level, progression = "medium") {
    const rates = { 
        fast: 1.0, 
        medium: 0.75, 
        slow: 0.5 
    };
    return Math.floor(level * (rates[progression] || 0.75));
}

/**
 * Calculate defense value
 * @param {number} base - Base defense (usually 10)
 * @param {number} abilityMod - Ability modifier
 * @param {number} armorBonus - Armor bonus
 * @param {number[]} otherBonuses - Array of other bonuses
 * @returns {number} Total defense
 */
export function calculateDefense(base = 10, abilityMod = 0, armorBonus = 0, otherBonuses = []) {
    const otherTotal = otherBonuses.reduce((sum, bonus) => sum + bonus, 0);
    return base + abilityMod + armorBonus + otherTotal;
}

/**
 * Calculate damage threshold
 * @param {number} fortitudeDefense - Fortitude defense value
 * @param {string} size - Creature size
 * @returns {number} Damage threshold
 */
export function calculateDamageThreshold(fortitudeDefense, size = "medium") {
    const sizeMods = {
        fine: -10,
        diminutive: -5,
        tiny: -5,
        small: 0,
        medium: 0,
        large: 5,
        huge: 10,
        gargantuan: 20,
        colossal: 50,
        "colossal (frigate)": 100,
        "colossal (crassets/uiser)": 150,
        "colossal (station)": 200
    };
    
    const sizeMod = sizeMods[size.toLowerCase()] || 0;
    return fortitudeDefense + sizeMod;
}

/**
 * Calculate half level
 * @param {number} level - Character level
 * @returns {number} Half level (rounded down)
 */
export function halfLevel(level) {
    return Math.floor(level / 2);
}

/**
 * Calculate carrying capacity
 * @param {number} strength - Strength score
 * @param {string} size - Creature size
 * @returns {object} Carrying capacity limits
 */
export function calculateCarryingCapacity(strength, size = "medium") {
    const baseCapacity = strength * 10;
    const sizeMultipliers = {
        fine: 0.125,
        diminutive: 0.25,
        tiny: 0.5,
        small: 0.75,
        medium: 1,
        large: 2,
        huge: 4,
        gargantuan: 8,
        colossal: 16
    };
    
    const multiplier = sizeMultipliers[size.toLowerCase()] || 1;
    const capacity = baseCapacity * multiplier;
    
    return {
        light: capacity,
        medium: capacity * 2,
        heavy: capacity * 3
    };
}
