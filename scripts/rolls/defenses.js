import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';
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

  if (!def) {return 10;}

  const base = 10;

  // Use abilityKey if available, otherwise fall back to default abilities by type
  let abilityKey = def.abilityKey;
  if (!abilityKey) {
    const defaultAbilities = { fortitude: 'str', reflex: 'dex', will: 'wis' };
    abilityKey = defaultAbilities[type] || 'str';
  }

  const abilityScore = actor.system.attributes[abilityKey]?.base ?? 10;
  const ability = utils.math.calculateAbilityModifier(abilityScore);
  const armor = def.armor || 0;
  const misc = def.misc || def.modifier || 0;
  const cls = def.classBonus || def.class || 0;

  return utils.math.calculateDefense(
    base,
    ability,
    armor,
    [lvl, cls, misc]
  );
}

/**
 * Roll a defense check
 * @param {Actor} actor - The actor rolling the defense
 * @param {string} defenseType - Defense type (fortitude, reflex, will)
 * @returns {Promise<Roll>} The defense check roll
 */
export async function rollDefense(actor, defenseType) {
  const utils = game.swse.utils;

  if (!actor) {
    ui.notifications.warn('No actor specified for defense roll');
    return null;
  }

  // Normalize defense type
  const typeMap = { 'fort': 'fortitude', 'ref': 'reflex' };
  const normalizedType = typeMap[defenseType] || defenseType;

  const defense = actor.system?.defenses?.[normalizedType];

  if (!defense) {
    ui.notifications.warn(`Defense ${defenseType} not found`);
    return null;
  }

  const defenseValue = defense.total ?? 10;
  const label = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);

  const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${defenseValue}`).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${label} Defense Check (vs DC ${defenseValue})`
  }, { create: true });

  return roll;
}

/**
 * Calculate all defenses for an actor
 * @param {Actor} actor - The actor
 * @returns {object} All defense values
 */
export function calculateAllDefenses(actor) {
  return {
    fortitude: calculateDefense(actor, 'fortitude'),
    reflex: calculateDefense(actor, 'reflex'),
    will: calculateDefense(actor, 'will')
  };
}

/**
 * Get defense with cover bonus
 * @param {Actor} actor - The actor
 * @param {string} type - Defense type
 * @param {string} coverType - Cover type (none, partial, cover, improved)
 * @returns {number} Defense with cover
 */
export function getDefenseWithCover(actor, type, coverType = 'none') {
  const utils = game.swse.utils;
  const baseDefense = calculateDefense(actor, type);
  const coverBonus = utils.combat.getCoverBonus(coverType);

  return baseDefense + coverBonus;
}

/**
 * Calculate flat-footed defense (reflex without DEX bonus)
 * @param {Actor} actor - The actor
 * @returns {number} Flat-footed defense value
 */
export function calculateFlatFooted(actor) {
  const base = 10;
    const cls = actor.system.defenses.reflex?.classBonus || 0;
  const misc = actor.system.defenses.reflex?.misc || 0;

  return base + getEffectiveHalfLevel(actor) + cls + misc;
}

/**
 * Calculate damage threshold
 * @param {Actor} actor - The actor
 * @returns {number} Damage threshold value
 */
export function calculateDamageThreshold(actor) {
  const utils = game.swse.utils;
  const fortitude = calculateDefense(actor, 'fortitude');
  const size = actor.system.size || 'medium';

  return utils.math.calculateDamageThreshold(fortitude, size);
}
