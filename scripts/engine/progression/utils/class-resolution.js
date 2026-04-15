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
 *
 * PHASE 3.1: Comprehensive diagnostic logging for hydration failures.
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
    swseLogger.debug('[ClassResolution] Null classSelection provided');
    return null;
  }

  const diagnostics = {
    selectionType: classSelection?.constructor?.name || typeof classSelection,
    payloadKeys: classSelection && typeof classSelection === 'object' ? Object.keys(classSelection) : [],
  };

  try {
    // Extract identifiers from various payload formats
    const classId = classSelection.id || classSelection.classId || classSelection._id;
    const sourceId = classSelection.sourceId;
    const className = classSelection.name || classSelection.className;

    diagnostics.extractedIds = {
      classId: classId || null,
      sourceId: sourceId || null,
      className: className || null,
    };

    // Attempt resolution by ID (preferred)
    if (classId) {
      try {
        const model = ClassesRegistry.getById(classId);
        if (model) {
          diagnostics.resolution = {
            method: 'getById',
            classId,
            success: true,
            modelName: model.name || 'unknown',
          };
          swseLogger.debug(`[ClassResolution] Resolved class by ID: ${classId}`, { diagnostics });
          return model;
        }
        diagnostics.getByIdResult = 'no model found';
      } catch (registryErr) {
        diagnostics.getByIdError = registryErr.message;
        swseLogger.warn(`[ClassResolution] ClassesRegistry.getById threw exception for ID ${classId}`, {
          error: registryErr.message,
          diagnostics,
        });
      }
    }

    // Fallback to sourceId resolution
    if (sourceId) {
      try {
        const all = ClassesRegistry.getAll();
        const model = all.find(c => c.sourceId === sourceId);
        if (model) {
          diagnostics.resolution = {
            method: 'getAll + sourceId match',
            sourceId,
            success: true,
            modelName: model.name || 'unknown',
          };
          swseLogger.debug(`[ClassResolution] Resolved class by sourceId: ${sourceId}`, { diagnostics });
          return model;
        }
        diagnostics.getAllSourceIdResult = 'no model found for sourceId';
      } catch (registryErr) {
        diagnostics.getAllError = registryErr.message;
        swseLogger.warn(`[ClassResolution] ClassesRegistry.getAll threw exception while resolving sourceId ${sourceId}`, {
          error: registryErr.message,
          diagnostics,
        });
      }
    }

    // Final fallback to name resolution (compatibility only)
    if (className) {
      try {
        const model = ClassesRegistry.getByName(className);
        if (model) {
          diagnostics.resolution = {
            method: 'getByName (compatibility fallback)',
            className,
            success: true,
            modelName: model.name || 'unknown',
          };
          swseLogger.debug(`[ClassResolution] Resolved class by name: ${className} (compatibility fallback)`, { diagnostics });
          return model;
        }
        diagnostics.getByNameResult = 'no model found';
      } catch (registryErr) {
        diagnostics.getByNameError = registryErr.message;
        swseLogger.warn(`[ClassResolution] ClassesRegistry.getByName threw exception for name ${className}`, {
          error: registryErr.message,
          diagnostics,
        });
      }
    }

    // Resolution failed
    diagnostics.resolution = {
      method: 'none',
      success: false,
      reason: 'all resolution methods failed or no identifiers provided',
    };
    swseLogger.warn(`[ClassResolution] Failed to resolve class after all methods`, {
      classId,
      sourceId,
      className,
      diagnostics,
    });
    return null;
  } catch (err) {
    // Catch any unhandled exceptions during resolution
    diagnostics.exception = {
      message: err.message,
      stack: err.stack,
    };
    swseLogger.error(`[ClassResolution] Unhandled exception in resolveClassModel`, {
      error: err.message,
      diagnostics,
    });
    return null;
  }
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
    swseLogger.debug('[ClassResolution.resolveSelectedClassFromShell] Null shell provided');
    return null;
  }

  const diagnostics = {
    shellAvailable: !!shell,
    progressionSessionAvailable: !!shell.progressionSession,
    committedSelectionsAvailable: !!shell.committedSelections,
  };

  try {
    // Try canonical session first
    let classSelection = null;
    try {
      classSelection = shell.progressionSession?.getSelection?.('class');
      diagnostics.progressionSessionGetSelection = {
        attempted: true,
        found: !!classSelection,
      };
    } catch (sessionErr) {
      diagnostics.progressionSessionGetSelectionError = sessionErr.message;
      swseLogger.warn('[ClassResolution.resolveSelectedClassFromShell] progressionSession.getSelection threw', {
        error: sessionErr.message,
      });
    }

    // Fallback to committed selections
    if (!classSelection) {
      try {
        classSelection = shell.committedSelections?.get?.('class');
        diagnostics.committedSelectionsGet = {
          attempted: true,
          found: !!classSelection,
        };
      } catch (committedErr) {
        diagnostics.committedSelectionsGetError = committedErr.message;
        swseLogger.warn('[ClassResolution.resolveSelectedClassFromShell] committedSelections.get threw', {
          error: committedErr.message,
        });
      }
    }

    if (classSelection) {
      diagnostics.classSelectionFound = true;
      const resolved = resolveClassModel(classSelection);
      diagnostics.resolutionSuccess = !!resolved;
      return resolved;
    }

    diagnostics.classSelectionFound = false;
    swseLogger.debug('[ClassResolution.resolveSelectedClassFromShell] No class selection in shell', { diagnostics });
    return null;
  } catch (err) {
    diagnostics.exception = {
      message: err.message,
      stack: err.stack,
    };
    swseLogger.error('[ClassResolution.resolveSelectedClassFromShell] Unhandled exception', {
      error: err.message,
      diagnostics,
    });
    return null;
  }
}

/**
 * Resolve class from actor (levelup context)
 * Returns the most recent/current class
 *
 * @param {Object} actor - Actor document
 * @returns {Object|null} Full ClassModel of current class or null
 */
export function resolveClassFromActor(actor) {
  const actorName = actor?.name || 'unknown';
  const diagnostics = {
    actorName,
    actorAvailable: !!actor,
    systemAvailable: !!actor?.system,
    classesArrayExists: !!actor?.system?.classes,
  };

  if (!actor || !actor.system?.classes) {
    diagnostics.reason = 'actor or system.classes missing';
    swseLogger.debug('[ClassResolution.resolveClassFromActor] Invalid actor context', { diagnostics });
    return null;
  }

  try {
    const classesArray = actor.system.classes;
    diagnostics.classesArrayLength = classesArray.length;

    if (classesArray.length === 0) {
      diagnostics.reason = 'classes array empty';
      swseLogger.debug('[ClassResolution.resolveClassFromActor] Actor has no classes', { diagnostics });
      return null;
    }

    // Get the most recent class (last in array)
    const currentClassDoc = classesArray[classesArray.length - 1];
    if (!currentClassDoc) {
      diagnostics.reason = 'current class doc is null/undefined';
      swseLogger.warn('[ClassResolution.resolveClassFromActor] Could not access last element of classes array', { diagnostics });
      return null;
    }

    diagnostics.currentClassDocAvailable = true;
    diagnostics.currentClassDocKeys = Object.keys(currentClassDoc);

    const classModel = resolveClassModel({
      id: currentClassDoc._id,
      sourceId: currentClassDoc._id,
      name: currentClassDoc.name
    });

    diagnostics.resolutionSuccess = !!classModel;
    if (classModel) {
      swseLogger.debug('[ClassResolution.resolveClassFromActor] Resolved current class', {
        actorName,
        className: classModel.name,
        diagnostics,
      });
    }

    return classModel;
  } catch (err) {
    diagnostics.exception = {
      message: err.message,
      stack: err.stack,
    };
    swseLogger.error('[ClassResolution.resolveClassFromActor] Unhandled exception', {
      actorName,
      error: err.message,
      diagnostics,
    });
    return null;
  }
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
