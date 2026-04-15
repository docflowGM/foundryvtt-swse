/**
 * Class Resolution Helper - Phase 3
 *
 * Centralizes canonical class resolution for progression consumers.
 * Single seam for converting thin class payloads to full ClassModel.
 *
 * Responsibilities:
 * - Resolve selected class from shell/session/actor context
 * - Provide safe accessors for class mechanics
 * - Fail-closed when resolution fails
 * - Log warnings at seam boundaries
 */

import { ClassesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

/**
 * Resolve a class selection to full ClassModel from canonical authority
 *
 * Handles both chargen (thin shell payload) and levelup (actor.system.classes) contexts.
 * Falls back gracefully if resolution fails.
 *
 * @param {Object|string} classSelection - Class selection object or ID string
 * @returns {Object|null} Full ClassModel or null if resolution failed
 */
export function resolveClassModel(classSelection) {
  if (!classSelection) {
    return null;
  }

  // Extract identifiers from various payload formats
  const classId = classSelection.id || classSelection.classId || classSelection._id;
  const sourceId = classSelection.sourceId;
  const className = classSelection.name || classSelection.className;

  // Attempt resolution by ID (preferred)
  if (classId) {
    const model = ClassesRegistry.getById(classId);
    if (model) {
      swseLogger.debug(`[ClassResolution] Resolved class by ID: ${classId}`);
      return model;
    }
  }

  // Fallback to sourceId resolution
  if (sourceId) {
    const all = ClassesRegistry.getAll();
    const model = all.find(c => c.sourceId === sourceId);
    if (model) {
      swseLogger.debug(`[ClassResolution] Resolved class by sourceId: ${sourceId}`);
      return model;
    }
  }

  // Final fallback to name resolution (compatibility only)
  if (className) {
    const model = ClassesRegistry.getByName(className);
    if (model) {
      swseLogger.debug(`[ClassResolution] Resolved class by name: ${className} (compatibility fallback)`);
      return model;
    }
  }

  // Resolution failed
  swseLogger.warn(`[ClassResolution] Failed to resolve class:`, {
    classId,
    sourceId,
    className,
    payload: classSelection
  });
  return null;
}

/**
 * Resolve selected class from progression shell
 * Safe for chargen context (may not have actor.system.classes yet)
 *
 * @param {Object} shell - Progression shell/session
 * @returns {Object|null} Full ClassModel or null
 */
export function resolveSelectedClassFromShell(shell) {
  if (!shell) {
    return null;
  }

  // Try canonical session first
  const classSelection =
    shell.progressionSession?.getSelection?.('class')
    || shell.committedSelections?.get?.('class')
    || null;

  if (classSelection) {
    return resolveClassModel(classSelection);
  }

  return null;
}

/**
 * Resolve class from actor (levelup context)
 * Returns the most recent/current class
 *
 * @param {Object} actor - Actor document
 * @returns {Object|null} Full ClassModel of current class or null
 */
export function resolveClassFromActor(actor) {
  if (!actor || !actor.system?.classes || actor.system.classes.length === 0) {
    return null;
  }

  // Get the most recent class (last in array)
  const currentClassDoc = actor.system.classes[actor.system.classes.length - 1];
  if (!currentClassDoc) {
    return null;
  }

  return resolveClassModel({
    id: currentClassDoc._id,
    sourceId: currentClassDoc._id,
    name: currentClassDoc.name
  });
}

/**
 * Safe accessor for class skill list
 *
 * @param {Object} classModel - Full ClassModel from resolution
 * @returns {string[]} Array of class skill IDs/keys
 */
export function getClassSkills(classModel) {
  if (!classModel) {
    return [];
  }
  return Array.isArray(classModel.classSkills) ? classModel.classSkills : [];
}

/**
 * Safe accessor for class bonus feat lookup keys
 * Returns [classId, sourceId, name] for legality checks
 *
 * @param {Object} classModel - Full ClassModel from resolution
 * @returns {Object} {classId, sourceId, name} for feat legality matching
 */
export function getClassBonusFeatsLookupKeys(classModel) {
  if (!classModel) {
    return { classId: null, sourceId: null, name: null };
  }
  return {
    classId: classModel.id,
    sourceId: classModel.sourceId,
    name: classModel.name
  };
}

/**
 * Safe accessor for class talent tree lookup keys
 *
 * @param {Object} classModel - Full ClassModel from resolution
 * @returns {Object} {treeIds, treeNames} for tree authority matching
 */
export function getClassTalentTreeLookupKeys(classModel) {
  if (!classModel) {
    return { treeIds: [], treeNames: [] };
  }
  return {
    treeIds: Array.isArray(classModel.talentTreeIds) ? classModel.talentTreeIds : [],
    treeNames: Array.isArray(classModel.talentTreeNames) ? classModel.talentTreeNames : []
  };
}

/**
 * Safe accessor for hit die
 *
 * @param {Object} classModel - Full ClassModel from resolution
 * @returns {number} Hit die (6, 8, 10, or 12)
 */
export function getClassHitDie(classModel) {
  if (!classModel || ![6, 8, 10, 12].includes(classModel.hitDie)) {
    return 10; // Safe default
  }
  return classModel.hitDie;
}

/**
 * Safe accessor for base HP
 *
 * @param {Object} classModel - Full ClassModel from resolution
 * @returns {number} Base HP at level 1
 */
export function getClassBaseHp(classModel) {
  if (!classModel) {
    return 0;
  }
  return Number.isFinite(classModel.baseHp) ? classModel.baseHp : 0;
}

/**
 * Safe accessor for defense bonuses
 *
 * @param {Object} classModel - Full ClassModel from resolution
 * @returns {Object} {fortitude, reflex, will}
 */
export function getClassDefenses(classModel) {
  if (!classModel || !classModel.defenses) {
    return { fortitude: 0, reflex: 0, will: 0 };
  }
  return {
    fortitude: classModel.defenses.fortitude || 0,
    reflex: classModel.defenses.reflex || 0,
    will: classModel.defenses.will || 0
  };
}

/**
 * Safe accessor for starting credits
 *
 * @param {Object} classModel - Full ClassModel from resolution
 * @returns {number|null} Starting credits or null if not specified
 */
export function getClassStartingCredits(classModel) {
  if (!classModel) {
    return null;
  }
  return classModel.startingCredits === null || classModel.startingCredits === undefined
    ? null
    : Number.isFinite(Number(classModel.startingCredits)) ? Number(classModel.startingCredits) : null;
}

/**
 * Safe accessor for trained skills per level
 *
 * @param {Object} classModel - Full ClassModel from resolution
 * @returns {number} Skill points per level
 */
export function getClassTrainedSkillsPerLevel(classModel) {
  if (!classModel) {
    return 0;
  }
  return Number.isFinite(classModel.trainedSkills) ? classModel.trainedSkills : 0;
}

export default {
  resolveClassModel,
  resolveSelectedClassFromShell,
  resolveClassFromActor,
  getClassSkills,
  getClassBonusFeatsLookupKeys,
  getClassTalentTreeLookupKeys,
  getClassHitDie,
  getClassBaseHp,
  getClassDefenses,
  getClassStartingCredits,
  getClassTrainedSkillsPerLevel
};
