// ============================================
// Shared utilities and constants for CharGen
// ============================================

/**
 * Get default skills list
 * @returns {Array} Array of skill objects
 */
export function _getDefaultSkills() {
  return [
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
}

/**
 * Get available skills from cache or default
 * @returns {Array} Array of skill objects
 */
export function _getAvailableSkills() {
  return this._skillsJson || this._getDefaultSkills();
}

/**
 * Get available talent trees based on character's selected classes
 * @returns {Array} Array of talent tree names
 */
export function _getAvailableTalentTrees() {
  // If no classes selected, return empty array
  if (!this.characterData.classes || this.characterData.classes.length === 0) {
    return [];
  }

  // If classes compendium isn't loaded, return empty array
  if (!this._packs.classes || this._packs.classes.length === 0) {
    return [];
  }

  // Collect talent trees from all selected classes
  const talentTrees = new Set();

  for (const charClass of this.characterData.classes) {
    const classData = this._packs.classes.find(c => c.name === charClass.name);

    if (classData && classData.system && classData.system.talent_trees) {
      // Add all talent trees from this class
      for (const tree of classData.system.talent_trees) {
        talentTrees.add(tree);
      }
    }
  }

  // Convert Set to Array and return sorted
  return Array.from(talentTrees).sort();
}
