import { CLASS_TAG_METADATA } from '/systems/foundryvtt-swse/scripts/data/class-tag-metadata.js';

/**
 * SharedSuggestionUtilities
 *
 * Consolidated utilities for suggestion engines to eliminate code duplication.
 * PHASE F PART 2: Extract DRY violations from multiple suggestion engines.
 *
 * Owns:
 * - Ability score extraction (previously duplicated in ProgressionAdvisor, Level1SkillSuggestionEngine)
 * - Skill name normalization (previously duplicated across 4+ files)
 * - Ability modifier calculation (math previously duplicated in 2+ locations)
 * - Class synergy data lookup (CLASS_SYNERGY_DATA now consolidated)
 *
 * Delegates to: None (pure utility layer)
 * Never owns: State, mutations, UI
 */

/**
 * Extract ability scores from actor, with sensible defaults.
 * Consolidated from ProgressionAdvisor and Level1SkillSuggestionEngine.
 *
 * @param {Actor} actor - The character actor
 * @returns {Object} { str, dex, con, int, wis, cha } - Ability scores
 */
export function extractAbilityScores(actor) {
  if (!actor?.system?.abilities) {
    return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  }

  const abilities = actor.system.abilities;
  return {
    str: abilities.str?.base ?? 10,
    dex: abilities.dex?.base ?? 10,
    con: abilities.con?.base ?? 10,
    int: abilities.int?.base ?? 10,
    wis: abilities.wis?.base ?? 10,
    cha: abilities.cha?.base ?? 10
  };
}

/**
 * Calculate ability modifier from ability score (standard D20 formula).
 * Consolidated from multiple calculation sites.
 *
 * @param {number} score - Ability score (e.g., 14)
 * @returns {number} Modifier (e.g., +2)
 */
export function calculateAbilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

/**
 * Get all ability modifiers for an actor.
 * Consolidated from multiple calculation sites.
 *
 * @param {Actor} actor - The character actor
 * @returns {Object} { str, dex, con, int, wis, cha } - Modifiers
 */
export function extractAbilityModifiers(actor) {
  const scores = extractAbilityScores(actor);
  return {
    str: calculateAbilityModifier(scores.str),
    dex: calculateAbilityModifier(scores.dex),
    con: calculateAbilityModifier(scores.con),
    int: calculateAbilityModifier(scores.int),
    wis: calculateAbilityModifier(scores.wis),
    cha: calculateAbilityModifier(scores.cha)
  };
}

/**
 * Find the highest ability score for an actor.
 * Consolidated from multiple search patterns.
 *
 * @param {Actor} actor - The character actor
 * @returns {string} Ability key ('str', 'dex', etc.)
 */
export function findHighestAbility(actor) {
  const scores = extractAbilityScores(actor);
  const entries = Object.entries(scores);
  return entries.reduce((max, [key, val]) => val > scores[max] ? key : max)[0];
}

/**
 * Normalize skill name for comparison (case-insensitive, trim).
 * Consolidated from Level1SkillSuggestionEngine and others.
 *
 * @param {string} skillName - Raw skill name
 * @returns {string} Normalized name
 */
export function normalizeSkillName(skillName) {
  if (!skillName) return '';
  return String(skillName).toLowerCase().trim();
}

/**
 * Check if actor has a specific skill (case-insensitive).
 * Uses normalized skill names for reliable matching.
 *
 * @param {Actor} actor - The character actor
 * @param {string} skillName - Skill name to check
 * @returns {boolean} true if skill is trained/available
 */
export function hasSkill(actor, skillName) {
  if (!actor?.system?.skills) return false;

  const normalizedTarget = normalizeSkillName(skillName);
  const skillKeys = Object.keys(actor.system.skills);

  return skillKeys.some(key => normalizeSkillName(key) === normalizedTarget);
}

/**
 * Get the modifier for a specific skill.
 *
 * @param {Actor} actor - The character actor
 * @param {string} skillName - Skill name (case-insensitive)
 * @returns {number} Skill modifier
 */
export function getSkillModifier(actor, skillName) {
  if (!actor?.system?.skills) return 0;

  const normalizedTarget = normalizeSkillName(skillName);
  const skillKeys = Object.keys(actor.system.skills);
  const matchingKey = skillKeys.find(key => normalizeSkillName(key) === normalizedTarget);

  if (!matchingKey) return 0;

  const skillData = actor.system.skills[matchingKey];
  return skillData?.modifier ?? skillData?.total ?? 0;
}

/**
 * CLASS_SYNERGY_DATA - canonical semantic class suggestion surface.
 * Derived from class-tag metadata so class meaning lives in the SSOT path.
 */
export const CLASS_SYNERGY_DATA = Object.fromEntries(
  Object.entries(CLASS_TAG_METADATA).map(([name, metadata]) => [
    name,
    {
      abilities: metadata.abilities || [],
      skills: metadata.skills || [],
      feats: metadata.feats || [],
      talents: metadata.talents || [],
      talentTrees: metadata.talentTrees || [],
      theme: metadata.theme || 'general',
      tags: metadata.tags || [],
    }
  ])
);

/**
 * Get class synergy data for a specific class.
 *
 * @param {string} className - Class name
 * @returns {Object|null} Synergy data or null if class not found
 */
export function getClassSynergy(className) {
  return CLASS_SYNERGY_DATA[className] || null;
}

/**
 * Check if an actor's highest ability matches a class's synergistic abilities.
 *
 * @param {Actor} actor - The character actor
 * @param {string} className - Class name to check
 * @returns {boolean} true if highest ability matches class synergy
 */
export function matchesClassAbilitySynergy(actor, className) {
  const synergy = getClassSynergy(className);
  if (!synergy) return false;

  const highestAbility = findHighestAbility(actor);
  return synergy.abilities.includes(highestAbility);
}

export default {
  extractAbilityScores,
  calculateAbilityModifier,
  extractAbilityModifiers,
  findHighestAbility,
  normalizeSkillName,
  hasSkill,
  getSkillModifier,
  getClassSynergy,
  matchesClassAbilitySynergy,
  CLASS_SYNERGY_DATA
};
