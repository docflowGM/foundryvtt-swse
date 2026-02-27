import { getEffectiveHalfLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
// ============================================
// FILE: rolls/defenses.js
// Defense rolling via RollCore (V2 Unified)
// ============================================

import RollCore from "/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * DEPRECATED: calculateDefense() - Use RollCore + ModifierEngine instead
 * Kept for backward compatibility but should not be called for rolls
 * @param {Actor} actor - The actor
 * @param {string} type - Defense type (fortitude, reflex, will)
 * @returns {number} Total defense value from derived data
 */
export function calculateDefense(actor, type) {
  const def = actor.system?.derived?.defenses?.[type];
  if (!def) {return 10;}
  return def.total ?? def.value ?? 10;
}

/**
 * Roll a defense check via RollCore
 * @param {Actor} actor - The actor rolling the defense
 * @param {string} defenseType - Defense type (fortitude, reflex, will)
 * @param {Object} options - Additional options
 * @param {boolean} options.useForce - Spend a Force Point
 * @returns {Promise<Roll|null>} The defense check roll or null if failed
 */
export async function rollDefense(actor, defenseType, options = {}) {
  if (!actor) {
    ui.notifications.warn('No actor specified for defense roll');
    return null;
  }

  // Normalize defense type
  const typeMap = { 'fort': 'fortitude', 'ref': 'reflex' };
  const normalizedType = typeMap[defenseType] || defenseType;

  const defense = actor.system?.derived?.defenses?.[normalizedType];

  if (!defense) {
    ui.notifications.warn(`Defense ${defenseType} not found`);
    return null;
  }

  const label = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);

  // === UNIFIED ROLL EXECUTION via RollCore ===
  const domain = `defense.${normalizedType}`;
  const rollResult = await RollCore.execute({
    actor,
    domain,
    rollOptions: {
      baseDice: '1d20',
      useForce: options.useForce || false
    },
    context: { defenseType: normalizedType }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Defense roll failed: ${rollResult.error}`);
    return null;
  }

  // === RENDER TO CHAT ===
  if (rollResult.roll) {
    await rollResult.roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<strong>${label} Defense</strong><br/>Modifier: ${rollResult.modifierTotal}
               ${rollResult.forcePointBonus > 0 ? `<br/>+ ${rollResult.forcePointBonus} (Force)` : ''}`
    }, { create: true });
  }

  return rollResult.roll;
}

/**
 * Get all defense values from derived data
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
 * Get flat-footed defense (reflex without DEX bonus)
 * @param {Actor} actor - The actor
 * @returns {number} Flat-footed defense value
 */
export function calculateFlatFooted(actor) {
  return actor.system?.derived?.defenses?.flatFooted ?? 10;
}

/**
 * Get damage threshold
 * @param {Actor} actor - The actor
 * @returns {number} Damage threshold value
 */
export function calculateDamageThreshold(actor) {
  return actor.system?.derived?.damageThreshold ?? 0;
}
