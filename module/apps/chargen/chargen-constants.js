/**
 * SWSE Character Generator Constants
 * Shared constants for character generation
 */

export const CHARGEN_CONSTANTS = {
    // Point Buy
    POINT_BUY_POOL: 32,
    MIN_ABILITY_SCORE: 8,
    MAX_ABILITY_SCORE: 18,
    DEFAULT_ABILITY_SCORE: 10,
    
    // Dice Rolling
    ORGANIC_ROLL_DICE: "24d6",
    ORGANIC_KEEP_COUNT: 18,
    ORGANIC_GROUPS: 6,
    STANDARD_ROLL: "4d6kh3",
    STANDARD_ROLL_COUNT: 6,
    
    // Defaults
    DEFAULT_HP: 1,
    DEFAULT_FORCE_POINTS: 5,
    DEFAULT_DESTINY_POINTS: 1,
    DEFAULT_SECOND_WIND: 1,
    DEFAULT_SPEED: 6,
    
    // Defense Bases
    BASE_DEFENSE: 10,
    
    // Level Progression
    FEAT_EVERY_N_LEVELS: 2  // Get feat every 2 levels
};

/**
 * Point buy cost calculation
 * @param {number} from - Starting value
 * @param {number} to - Target value
 * @returns {number} Total point cost
 */
export function calculatePointBuyCost(from, to) {
    const costForIncrement = (v) => {
        if (v < 12) return 1;
        if (v < 14) return 2;
        return 3;
    };
    
    let cost = 0;
    for (let v = from; v < to; v++) {
        cost += costForIncrement(v);
    }
    return cost;
}

/**
 * Calculate ability modifier from score
 * @param {number} score - Ability score
 * @returns {number} Modifier value
 */
export function calculateAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
}

/**
 * Calculate half level for various bonuses
 * @param {number} level - Character level
 * @returns {number} Half level (rounded down)
 */
export function calculateHalfLevel(level) {
    return Math.floor(level / 2);
}

/**
 * Get number of feats for a given level
 * @param {number} level - Character level
 * @returns {number} Number of feats
 */
export function getFeatsForLevel(level) {
    return Math.ceil(level / CHARGEN_CONSTANTS.FEAT_EVERY_N_LEVELS);
}

/**
 * Validate ability score is in valid range
 * @param {number} score - Score to validate
 * @returns {boolean} True if valid
 */
export function isValidAbilityScore(score) {
    return score >= CHARGEN_CONSTANTS.MIN_ABILITY_SCORE && 
           score <= CHARGEN_CONSTANTS.MAX_ABILITY_SCORE;
}

/**
 * Default skills list
 */
export const DEFAULT_SKILLS = [
    { key: "acrobatics", name: "Acrobatics", ability: "dex", trained: false },
    { key: "climb", name: "Climb", ability: "str", trained: false },
    { key: "deception", name: "Deception", ability: "cha", trained: false },
    { key: "endurance", name: "Endurance", ability: "con", trained: false },
    { key: "gatherInfo", name: "Gather Information", ability: "cha", trained: false },
    { key: "initiative", name: "Initiative", ability: "dex", trained: false },
    { key: "jump", name: "Jump", ability: "str", trained: false },
    { key: "mechanics", name: "Mechanics", ability: "int", trained: false },
    { key: "perception", name: "Perception", ability: "wis", trained: false },
    { key: "persuasion", name: "Persuasion", ability: "cha", trained: false },
    { key: "pilot", name: "Pilot", ability: "dex", trained: false },
    { key: "stealth", name: "Stealth", ability: "dex", trained: false },
    { key: "survival", name: "Survival", ability: "wis", trained: false },
    { key: "swim", name: "Swim", ability: "str", trained: false },
    { key: "treatInjury", name: "Treat Injury", ability: "wis", trained: false },
    { key: "useComputer", name: "Use Computer", ability: "int", trained: false },
    { key: "useTheForce", name: "Use the Force", ability: "cha", trained: false }
];

/**
 * Common species bonuses
 */
export const SPECIES_BONUSES = {
    "human": {},
    "twilek": { cha: 2, con: -2 },
    "wookiee": { str: 4, con: 2, int: -2, cha: -2 },
    "bothan": { dex: 2, con: -2 },
    "zabrak": { con: 2, wis: 2 },
    "chiss": { dex: 2, int: 2, cha: -2 },
    "rodian": { dex: 2, wis: -2, cha: -2 },
    "duros": { dex: 2, int: 2, con: -2 },
    "sullustan": { dex: 2, con: -2 }
};
