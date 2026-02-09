/**
 * Character Creation and Management Utilities for SWSE
 */

/**
 * Calculate starting hit points
 * @param {string} className - Class name
 * @param {number} conModifier - Constitution modifier
 * @returns {number} Starting HP
 */
export function calculateStartingHP(className, conModifier) {
    const classHP = {
        jedi: 30,
        noble: 18,
        scoundrel: 18,
        scout: 24,
        soldier: 30
    };

    const baseHP = classHP[className.toLowerCase()] || 24;
    return baseHP + conModifier;
}

/**
 * Get starting credits for a class
 * @param {string} className - Class name
 * @returns {string} Credits formula (e.g., "3d4 x 250")
 */
export function getStartingCredits(className) {
    const credits = {
        jedi: '3d4 x 100',
        noble: '3d4 x 400',
        scoundrel: '3d4 x 250',
        scout: '3d4 x 250',
        soldier: '3d4 x 250'
    };

    return credits[className.toLowerCase()] || '3d4 x 250';
}

/**
 * Calculate skill points per level
 * @param {number} trainedSkills - Number of trained skills from class
 * @param {number} intModifier - Intelligence modifier
 * @returns {number} Skill points per level
 */
export function calculateSkillPoints(trainedSkills, intModifier) {
    return trainedSkills + Math.max(intModifier, 0);
}

/**
 * Get ability score cost for point buy
 * @param {number} score - Ability score
 * @returns {number} Point cost
 */
export function getAbilityScoreCost(score) {
    const costs = {
        8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5,
        14: 6, 15: 8, 16: 10, 17: 13, 18: 16
    };
    return costs[score] || 0;
}

/**
 * Validate ability score array for point buy
 * @param {number[]} scores - Array of 6 ability scores
 * @param {number} pointBudget - Point buy budget (default 25)
 * @returns {object} Validation result
 */
export function validateAbilityScores(scores, pointBudget = 25) {
    if (scores.length !== 6) {
        return { valid: false, message: 'Must have exactly 6 ability scores' };
    }

    const totalCost = scores.reduce((sum, score) => sum + getAbilityScoreCost(score), 0);

    if (totalCost > pointBudget) {
        return {
            valid: false,
            message: `Total cost (${totalCost}) exceeds budget (${pointBudget})`
        };
    }

    return { valid: true, cost: totalCost, remaining: pointBudget - totalCost };
}

/**
 * Get available talent trees for a class
 * @param {string} className - Class name
 * @returns {string[]} Array of talent tree names
 */
export function getTalentTreesForClass(className) {
    // This would typically load from your classes data
    // Placeholder implementation
    return [];
}
