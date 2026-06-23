/**
 * Class Suggestion Utilities
 * Pure engine-layer utilities for class calculations
 *
 * These utilities support ClassSuggestionEngine and other engine layers.
 * No dependencies on apps/ or chargen/ layer.
 */

import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";

/**
 * List of base classes in SWSE
 */
export const BASE_CLASSES = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier'];

/**
 * Class synergy data for suggestion engines
 * Maps class name to primary ability and other class characteristics
 */
export const CLASS_SYNERGY_DATA = {
  'Jedi': { primaryAbility: 'Wisdom' },
  'Noble': { primaryAbility: 'Charisma' },
  'Scoundrel': { primaryAbility: 'Dexterity' },
  'Scout': { primaryAbility: 'Dexterity' },
  'Soldier': { primaryAbility: 'Strength' },
  'Nonheroic': { primaryAbility: 'Strength' }
};

/**
 * Convert BAB progression string to numeric multiplier
 * @param {string|number} progression - "slow", "medium", "fast" or a number
 * @returns {number} - Per-level BAB multiplier
 */
function convertBabProgression(progression) {
  if (typeof progression === 'number') {
    return progression;
  }

  const normalized = String(progression || '').toLowerCase();
  const progressionMap = {
    slow: 0.5,
    poor: 0.5,
    low: 0.5,
    medium: 0.75,
    average: 0.75,
    fast: 1.0,
    full: 1.0,
    high: 1.0,
  };

  return progressionMap[normalized] || 0.75; // default to medium
}

/**
 * Navigate nested object properties safely
 * @param {Object} obj - Object to navigate
 * @param {string} path - Dot-separated path (e.g., "system.levelProgression")
 * @param {*} defaultValue - Default if not found
 * @returns {*} Value or defaultValue
 */
function getNestedProperty(obj, path, defaultValue = null) {
  if (!obj || typeof path !== 'string') {
    return defaultValue;
  }

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return defaultValue;
    }
  }

  return current;
}

function coerceFiniteNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9+\-.]/g, '');
    if (!cleaned || cleaned === '+' || cleaned === '-' || cleaned === '.') {
      return null;
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function maxFiniteNumber(values = []) {
  let max = 0;
  for (const value of values) {
    const parsed = coerceFiniteNumber(value);
    if (parsed !== null && parsed > max) {
      max = parsed;
    }
  }
  return max;
}

/**
 * Resolve actor BAB from every current v2/legacy location, then fall back to
 * class-state derivation. Suggestion and mentor code must not read only
 * system.bab because level-up actors often carry BAB in derived data, class
 * items, or system.progression.classLevels.
 *
 * @param {Actor|Object} actor
 * @returns {number}
 */
export function resolveActorBAB(actor) {
  if (!actor) {
    return 0;
  }

  const directBab = maxFiniteNumber([
    actor.system?.derived?.bab?.total,
    actor.system?.derived?.bab?.value,
    actor.system?.derived?.bab,
    actor.system?.derived?.baseAttackBonus,
    actor.system?.bab?.total,
    actor.system?.bab?.value,
    actor.system?.bab,
    actor.system?.baseAttackBonus,
    actor.system?.attributes?.bab?.total,
    actor.system?.attributes?.bab?.value,
    actor.system?.details?.bab,
    actor.system?.combat?.bab?.total,
    actor.system?.combat?.bab?.value,
    actor.system?.combat?.bab,
    actor.system?.combat?.baseAttackBonus,
  ]);

  let classBab = 0;
  try {
    classBab = Number(calculateTotalBAB(actor)) || 0;
  } catch {
    classBab = 0;
  }

  return Math.max(directBab, classBab);
}

/**
 * Calculate total BAB from all class items
 * Engine-layer version: accesses class item properties directly without chargen utilities
 *
 * @param {Actor} actor - The actor
 * @returns {number} Total BAB
 */
export function calculateTotalBAB(actor) {
  const classItems = ActorAbilityBridge.getClasses(actor);
  let totalBAB = 0;

  for (const classItem of classItems || []) {
    const system = classItem?.system || {};
    const classLevel = Number(system.level ?? classItem?.level ?? classItem?.system?.levels ?? 1) || 1;
    const className = classItem?.name || system.class_name || system.classId || 'Unknown Class';

    // Check if class has level_progression data with BAB. Some class
    // records are sparse (or pack-index only) and contain holes; use the
    // highest available row <= classLevel before falling back to progression.
    const levelProgression = system.levelProgression || system.level_progression || classItem?.levelProgression || classItem?.level_progression || getNestedProperty(classItem, 'system.levelProgression', []);
    if (Array.isArray(levelProgression) && levelProgression.length > 0) {
      const rows = levelProgression
        .map(lp => ({ level: Number(lp?.level ?? 0), bab: Number(lp?.bab ?? lp?.baseAttackBonus) }))
        .filter(lp => Number.isFinite(lp.level) && Number.isFinite(lp.bab))
        .sort((a, b) => a.level - b.level);
      const levelData = [...rows].reverse().find(lp => lp.level <= classLevel) || rows[0];
      if (levelData && Number.isFinite(levelData.bab)) {
        totalBAB += levelData.bab;
        continue;
      }
    }

    // Fallback: Use babProgression if available
    const babProgression = system.babProgression || system.bab_progression || classItem?.babProgression || classItem?.bab_progression || classItem?.baseAttackBonus;
    if (babProgression) {
      const babMultiplier = convertBabProgression(babProgression);
      totalBAB += Math.floor(classLevel * babMultiplier);
      continue;
    }

    // Fallback: Calculate from known class names
    const fullBABClasses = ['Jedi', 'Soldier'];
    if (fullBABClasses.includes(className)) {
      totalBAB += classLevel;
    } else {
      // 3/4 BAB for other base classes
      totalBAB += Math.floor(classLevel * 0.75);
    }
  }

  return totalBAB;
}
