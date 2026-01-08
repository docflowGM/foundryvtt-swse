// ============================================
// FILE: rolls/defenses.js
// Defense calculations using SWSE utils
// ============================================

/**
 * Calculate a defense value
 * @param {Actor} actor - The actor
 * @param {string} type - Defense type (fortitude, reflex, will)
 * @returns {number} Total defense value
 */
export function calculateDefense(actor, type) {
  const utils = game.swse.utils;
  const def = actor.system.defenses?.[type];
  
  if (!def) return 10;

  const base = 10;
  const lvl = actor.system.level || 1;
  const abilityScore = actor.system.attributes[def.ability]?.base ?? 10;
  const ability = utils.math.calculateAbilityModifier(abilityScore);
  const armor = def.armor || 0;
  const misc = def.modifier || 0;
  const cls = def.class || 0;

  return utils.math.calculateDefense(
    base,
    ability,
    armor,
    [lvl, cls, misc]
  );
}

/**
 * Calculate all defenses for an actor
 * @param {Actor} actor - The actor
 * @returns {object} All defense values
 */
export function calculateAllDefenses(actor) {
  return {
    fortitude: calculateDefense(actor, "fortitude"),
    reflex: calculateDefense(actor, "reflex"),
    will: calculateDefense(actor, "will")
  };
}

/**
 * Get defense with cover bonus
 * @param {Actor} actor - The actor
 * @param {string} type - Defense type
 * @param {string} coverType - Cover type (none, partial, cover, improved)
 * @returns {number} Defense with cover
 */
export function getDefenseWithCover(actor, type, coverType = "none") {
  const utils = game.swse.utils;
  const baseDefense = calculateDefense(actor, type);
  const coverBonus = utils.combat.getCoverBonus(coverType);
  
  return baseDefense + coverBonus;
}

/**
 * Calculate damage threshold
 * @param {Actor} actor - The actor
 * @returns {number} Damage threshold value
 */
export function calculateDamageThreshold(actor) {
  const utils = game.swse.utils;
  const fortitude = calculateDefense(actor, "fortitude");
  const size = actor.system.size || "medium";
  
  return utils.math.calculateDamageThreshold(fortitude, size);
}
