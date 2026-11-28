/**
 * Shared utilities for SWSE Level Up system
 * Contains helper functions and constants used across multiple level-up modules
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HPGeneratorEngine } from "/systems/foundryvtt-swse/scripts/engine/HP/HPGeneratorEngine.js";
import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";
import { resolveClassModel, getClassHitDie } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js";


const CLASS_HIT_DICE = Object.freeze({
  // d12 classes
  'elite trooper': 12,
  'independent droid': 12,
  // d10 classes
  assassin: 10,
  'bounty hunter': 10,
  'droid commander': 10,
  gladiator: 10,
  'imperial knight': 10,
  jedi: 10,
  'jedi knight': 10,
  'jedi master': 10,
  'master privateer': 10,
  'martial arts master': 10,
  pathfinder: 10,
  'sith apprentice': 10,
  'sith lord': 10,
  soldier: 10,
  vanguard: 10,
  // d8 classes
  'ace pilot': 8,
  'beast rider': 8,
  charlatan: 8,
  'corporate agent': 8,
  'crime lord': 8,
  enforcer: 8,
  'force adept': 8,
  'force disciple': 8,
  gunslinger: 8,
  improviser: 8,
  infiltrator: 8,
  medic: 8,
  'melee duelist': 8,
  'military engineer': 8,
  officer: 8,
  outlaw: 8,
  saboteur: 8,
  scout: 8,
  shaper: 8,
  // d6 classes
  noble: 6,
  scoundrel: 6,
  slicer: 6,
});

function normalizeClassNameKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function parseHitDieValue(value) {
  if (Number.isFinite(Number(value))) {
    const numeric = Number(value);
    return [4, 6, 8, 10, 12].includes(numeric) ? numeric : null;
  }
  const match = String(value || '').match(/(?:1?d)?(4|6|8|10|12)\b/i);
  return match ? Number(match[1]) : null;
}

/**
 * Resolve a class hit die from any live level-up class payload.
 * Uses the canonical class registry first, then explicit numeric/string fields,
 * then a Saga class-name fallback. This prevents level-up HP from falling back
 * to d6 when thin class payloads carry system.hitDie: 10 or only a class id.
 *
 * @param {object|string} classDoc - class item/model/selection/name
 * @returns {number} hit die size
 */
export function resolveLevelUpHitDie(classDoc) {
  const resolved = resolveClassModel(classDoc) || null;
  const canonical = resolved ? getClassHitDie(resolved) : null;
  if ([4, 6, 8, 10, 12].includes(canonical)) return canonical;

  const candidates = [
    classDoc?.system?.hitDie,
    classDoc?.system?.hit_die,
    classDoc?.hitDie,
    classDoc?.hit_die,
    resolved?.system?.hitDie,
    resolved?.system?.hit_die,
    resolved?.hitDie,
    resolved?.hit_die,
  ];
  for (const candidate of candidates) {
    const parsed = parseHitDieValue(candidate);
    if (parsed) return parsed;
  }

  const nameCandidates = [
    resolved?.name,
    resolved?.className,
    classDoc?.name,
    classDoc?.className,
    classDoc?.displayName,
    typeof classDoc === 'string' ? classDoc : null,
  ].filter(Boolean);

  for (const name of nameCandidates) {
    const key = normalizeClassNameKey(name);
    if (CLASS_HIT_DICE[key]) return CLASS_HIT_DICE[key];
  }

  SWSELogger.warn('SWSE LevelUp | Could not resolve class hit die; defaulting to d6', {
    className: classDoc?.name || classDoc?.className || classDoc?.id || classDoc,
    payloadKeys: classDoc && typeof classDoc === 'object' ? Object.keys(classDoc) : [],
  });
  return 6;
}

/**
 * List of base classes in SWSE (legacy - should use isBaseClass with class docs instead)
 */
export const BASE_CLASSES = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier'];

/**
 * Check if a class is a base class (by document or name)
 * PREFERRED: Pass a class document to read from system.base_class field
 * FALLBACK: Pass a class name string to check against BASE_CLASSES array
 *
 * @param {Object|string} classDocOrName - Class document (with system.base_class) or class name string
 * @returns {boolean} - true if base class, false if prestige
 */
export function isBaseClass(classDocOrName) {
  // If it's an object, check for base_class flag
  if (typeof classDocOrName === 'object' && classDocOrName !== null) {
    // Check both normalized (baseClass) and raw (system.base_class) formats
    const baseClassFlag = classDocOrName.baseClass ?? classDocOrName.system?.base_class;
    // Explicit true means base class, anything else (false/undefined) means prestige
    return baseClassFlag === true;
  }

  // Fallback: if it's a string, check against BASE_CLASSES array
  if (typeof classDocOrName === 'string') {
    return BASE_CLASSES.includes(classDocOrName);
  }

  // Unknown type, assume prestige for safety
  return false;
}

/**
 * Check if a class is a prestige class (opposite of isBaseClass)
 * @param {Object|string} classDocOrName - Class document or class name string
 * @returns {boolean} - true if prestige class, false if base
 */
export function isPrestigeClass(classDocOrName) {
  return !isBaseClass(classDocOrName);
}

/**
 * Get the current level in a specific class
 * @param {Actor} actor - The actor
 * @param {string} className - Name of the class
 * @returns {number} Current level in that class
 */
export function getClassLevel(actor, className) {
  const classItem = ActorAbilityBridge.getClasses(actor).find(c => c.name === className);
  return classItem ? (classItem.level || 0) : 0;
}

/**
 * Get character's current classes as a map of className -> level
 * @param {Actor} actor - The actor
 * @returns {Object} Map of class names to levels
 */
export function getCharacterClasses(actor) {
  const classItems = ActorAbilityBridge.getClasses(actor);
  const classes = {};

  classItems.forEach(classItem => {
    classes[classItem.name] = classItem.level || 1;
  });

  return classes;
}

/**
 * Check if the new level grants an ability score increase
 * @param {number} newLevel - The new character level
 * @param {boolean} isNonheroic - Whether this is a nonheroic class level
 * @returns {boolean}
 */
export function getsAbilityIncrease(newLevel, isNonheroic = false) {
  // NONHEROIC RULE: Nonheroic characters get ability increases every 4 levels (same levels)
  // But they only get to increase 1 ability score by 1 point (instead of 2 scores)
  return [4, 8, 12, 16, 20].includes(newLevel);
}

/**
 * Get the number of ability score increases at this level
 * @param {number} newLevel - The new character level
 * @param {boolean} isNonheroic - Whether this is a nonheroic class level
 * @returns {number} - Number of ability scores that can be increased (1 or 2)
 */
export function getAbilityIncreaseCount(newLevel, isNonheroic = false) {
  if (![4, 8, 12, 16, 20].includes(newLevel)) {
    return 0;
  }

  // NONHEROIC RULE: Nonheroic characters only get 1 ability score increase (instead of 2)
  return isNonheroic ? 1 : 2;
}

/**
 * Check if the new level grants a milestone feat
 * @param {number} newLevel - The new character level
 * @returns {boolean}
 */
export function getsMilestoneFeat(newLevel) {
  return [3, 6, 9, 12, 15, 18].includes(newLevel);
}

/**
 * Calculate HP gain for a level-up
 * @param {Object} classDoc - The class document
 * @param {Actor} actor - The actor
 * @param {number} newLevel - The new character level
 * @returns {number} HP to gain
 */
export function calculateHPGain(classDoc, actor, newLevel) {
  // Check if this is a nonheroic class
  const isNonheroic = classDoc?.system?.isNonheroic || classDoc?.isNonheroic || false;
  const hitDie = isNonheroic ? 4 : resolveLevelUpHitDie(classDoc);

  SWSELogger.log(`SWSE LevelUp | HP hit die resolved: d${hitDie}`, {
    className: classDoc?.name || classDoc?.className || classDoc?.id || '(unknown)',
    newLevel,
    isNonheroic,
  });

  // Use centralized HP generator engine
  const hpGain = HPGeneratorEngine.calculateHPGain(actor, newLevel, hitDie, {
    context: 'levelup',
    isNonheroic
  });

  return hpGain;
}
