/**
 * Mentor Transitions for Prestige Classes
 * Maps prestige/advanced classes to their corresponding mentors
 */

/**
 * Mentor transition rules:
 * Maps a prestige/advanced class → new mentor key
 * Allows automatic mentor switching when character takes a prestige class
 */
export const MENTOR_TRANSITIONS = {
    // Sith classes → Sith mentors
    "Sith Apprentice": "Sith Apprentice",
    "Sith Lord": "Sith Lord",

    // Imperial Knight → Imperial Knight mentor
    "Imperial Knight": "Imperial Knight",

    // Prestige Scout classes
    "Pathfinder": "Scout",

    // Prestige Soldier classes
    "Elite Trooper": "Soldier",
    "Martial Arts Master": "Soldier",
    "Bounty Hunter": "Soldier",
    "Officer": "Soldier",
    "Vanguard": "Soldier",

    // Prestige Scoundrel classes
    "Gunslinger": "Scoundrel",
    "Assassin": "Scoundrel",
    "Master Privateer": "Scoundrel",
    "Outlaw": "Scoundrel",

    // Prestige Noble classes
    "Enforcer": "Noble",
    "Shaper": "Noble",

    // Prestige Force classes
    "Force Adept": "Jedi",
    "Force Disciple": "Force Disciple",

    // Other prestige classes
    "Gladiator": "Soldier"
};

/**
 * Get the mentor for a prestige class transition
 * @param {string} prestigeClass - The name of the prestige class being taken
 * @returns {string|null} The mentor key for this prestige class, or null if no transition
 */
export function getMentorForPrestigeClass(prestigeClass) {
    return MENTOR_TRANSITIONS[prestigeClass] || null;
}
