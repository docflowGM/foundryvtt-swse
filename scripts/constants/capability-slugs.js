/**
 * Canonical Capability Slugs
 *
 * Central definition of all capability identifiers.
 * These replace hardcoded strings scattered throughout the codebase.
 *
 * Sourced from audit findings + prerequisite-checker definitions.
 * Do not modify without audit trail.
 */

export const CAPABILITY_SLUGS = {
  // ========== FORCE CAPABILITIES ==========
  FORCE_SENSITIVITY: 'force-sensitivity',

  // ========== FEAT PATTERNS ==========
  WEAPON_FOCUS: 'weapon-focus',
  WEAPON_FOCUS_I: 'weapon-focus-i',
  WEAPON_FOCUS_II: 'weapon-focus-ii',
  WEAPON_FOCUS_III: 'weapon-focus-iii',

  WEAPON_SPECIALIZATION: 'weapon-specialization',
  WEAPON_SPECIALIZATION_I: 'weapon-specialization-i',
  WEAPON_SPECIALIZATION_II: 'weapon-specialization-ii',
  WEAPON_SPECIALIZATION_III: 'weapon-specialization-iii',

  DUAL_WEAPON_MASTERY: 'dual-weapon-mastery',
  DUAL_WEAPON_MASTERY_I: 'dual-weapon-mastery-i',
  DUAL_WEAPON_MASTERY_II: 'dual-weapon-mastery-ii',
  DUAL_WEAPON_MASTERY_III: 'dual-weapon-mastery-iii',

  // ========== PROFICIENCY FEATS ==========
  ARMOR_PROFICIENCY: 'armor-proficiency',
  ARMOR_PROFICIENCY_LIGHT: 'armor-proficiency-light',
  ARMOR_PROFICIENCY_MEDIUM: 'armor-proficiency-medium',
  ARMOR_PROFICIENCY_HEAVY: 'armor-proficiency-heavy',

  WEAPON_PROFICIENCY: 'weapon-proficiency',
  WEAPON_PROFICIENCY_SIMPLE: 'weapon-proficiency-simple',
  WEAPON_PROFICIENCY_MARTIAL: 'weapon-proficiency-martial',
  WEAPON_PROFICIENCY_EXOTIC: 'weapon-proficiency-exotic',

  // ========== COMBAT FEATS ==========
  COMBAT_REFLEXES: 'combat-reflexes',
  IMPROVED_INITIATIVE: 'improved-initiative',
  POINT_BLANK_SHOT: 'point-blank-shot',
  PRECISE_SHOT: 'precise-shot',
  VEHICULAR_COMBAT: 'vehicular-combat',
  STARSHIP_TACTICS: 'starship-tactics',

  // ========== UTILITY FEATS ==========
  LINGUIST: 'linguist',
  FORCE_TRAINING: 'force-training',
  SKILL_TRAINING: 'skill-training',
  SKILL_FOCUS: 'skill-focus',

  // ========== TALENT PATTERNS ==========
  ARMORED_DEFENSE: 'armored-defense',
  IMPROVED_ARMORED_DEFENSE: 'improved-armored-defense',
  ARMOR_MASTERY: 'armor-mastery',

  // ========== VEHICLE/COMBAT ==========
  PIN: 'pin',
  IMPROVED_PIN: 'improved-pin',

  // ========== FORCE POWERS & TECHNIQUES ==========
  FORCE_POWER: 'force-power',
  FORCE_TECHNIQUE: 'force-technique',
  FORCE_SECRET: 'force-secret',

  // ========== SHIELD TYPES ==========
  ENERGY_SHIELD: 'energy-shield',
  SHIELD_GAUNTLET: 'shield-gauntlet',
};

/**
 * Proficiency Categories (non-slug, used with array checks)
 * These map to actor.system.weaponProficiencies and armorProficiencies
 */
export const PROFICIENCY_CATEGORIES = {
  // Weapon proficiencies
  WEAPON_SIMPLE: 'simple',
  WEAPON_MARTIAL: 'martial',
  WEAPON_EXOTIC: 'exotic',

  // Armor proficiencies
  ARMOR_LIGHT: 'light',
  ARMOR_MEDIUM: 'medium',
  ARMOR_HEAVY: 'heavy',
};

/**
 * System Access Keys (used for flags, attribute access)
 */
export const SYSTEM_ACCESS = {
  FORCE_SENSITIVE: 'force-sensitive',
  FORCE_DOMAIN_UNIVERSAL: 'force-domain-universal',
  FORCE_DOMAIN_CONTROL: 'force-domain-control',
  FORCE_DOMAIN_SENSE: 'force-domain-sense',
  FORCE_DOMAIN_ALTER: 'force-domain-alter',
};

/**
 * Vehicular Combat Keys
 */
export const VEHICLE_ACCESS = {
  VEHICLE_COMBAT: 'vehicle-combat',
  STARSHIP_TACTICS: 'starship-tactics',
  MISSILE_ATTACK: 'missile-attack',
  DOGFIGHT: 'dogfight',
};
