/**
 * Canonical enum definitions for archetype bias and attribute keys.
 * These enums enforce contract discipline and prevent freeform key corruption.
 *
 * All keys are snake_case for normalization.
 * No duplicates. No synonyms.
 * Validation occurs at archetype load time.
 */

export const MECHANICAL_BIAS_KEYS = Object.freeze([
  "controller",
  "defender",
  "defense",
  "force_control",
  "force_dps",
  "frontline_damage",
  "pilot",
  "ranged",
  "sniper",
  "striker",
  "support",
  "utility"
]);

export const ROLE_BIAS_KEYS = Object.freeze([
  "controller",
  "defender",
  "defense",
  "offense",
  "scout",
  "striker",
  "support",
  "utility"
]);

export const ATTRIBUTE_KEYS = Object.freeze([
  "STR",
  "DEX",
  "CON",
  "INT",
  "WIS",
  "CHA"
]);

export const ARCHETYPE_STATUS = Object.freeze([
  "active",
  "experimental",
  "disabled",
  "stub"
]);

/**
 * Helper: Check if a bias key exists in mechanical enum
 */
export function isValidMechanicalBiasKey(key) {
  return MECHANICAL_BIAS_KEYS.includes(key);
}

/**
 * Helper: Check if a bias key exists in role enum
 */
export function isValidRoleBiasKey(key) {
  return ROLE_BIAS_KEYS.includes(key);
}

/**
 * Helper: Check if an attribute key exists in attribute enum
 */
export function isValidAttributeKey(key) {
  return ATTRIBUTE_KEYS.includes(key);
}

/**
 * Helper: Check if a status value is valid
 */
export function isValidArchetypeStatus(status) {
  return ARCHETYPE_STATUS.includes(status);
}
