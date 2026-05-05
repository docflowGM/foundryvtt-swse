/**
 * Prestige Delay Calculator
 *
 * Determines when a prestige class becomes eligible when advancing with a
 * specific class choice.
 *
 * Uses:
 *  - projectBAB() helper for incremental BAB projection
 *  - PrerequisiteChecker oracle for eligibility
 *  - +6 level simulation cap
 *  - Detailed projection trace
 *  - Risk tagging for advisory system
 *  - No actor mutation
 *  - Deterministic snapshot simulation
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ClassesDB } from "/systems/foundryvtt-swse/scripts/data/classes-db.js";
import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";

// Will be dynamically loaded when needed to avoid circular dependency
let PrerequisiteChecker = null;

async function _ensurePrerequisiteChecker() {
  if (!PrerequisiteChecker) {
    try {
      const module = await import("/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/prerequisite-checker.js");
      PrerequisiteChecker = module.PrerequisiteChecker;
    } catch (err) {
      SWSELogger.error("[PrestigeDelayCalculator] Failed to load PrerequisiteChecker:", err);
      throw new Error("PrerequisiteChecker not available");
    }
  }
  return PrerequisiteChecker;
}

/**
 * Calculate prestige delay for a class choice
 *
 * @param {Object} actor - Current actor state
 * @param {string} prestigeClassName - Target prestige class name
 * @param {string} candidateClass - Class to advance in
 * @returns {Promise<Object>} {
 *   earliestLevel: number | Infinity,
 *   delay: number,
 *   projection: [{ level, bab, eligible, missing }],
 *   riskTags: string[]
 * }
 */
export async function calculatePrestigeDelay(actor, prestigeClassName, candidateClass) {
  const PrereqChecker = await _ensurePrerequisiteChecker();

  const currentLevel = actor.system?.level || 1;
  const MAX_PROJECTION = 6;

  let earliestLevel = Infinity;
  const projection = [];

  for (let i = 1; i <= MAX_PROJECTION; i++) {
    const projectedLevel = currentLevel + i;

    if (projectedLevel > 20) break;

    const projectedBAB = projectBAB(actor, candidateClass, projectedLevel);

    const simulatedActor = {
      ...actor,
      system: {
        ...actor.system,
        level: projectedLevel,
        bab: projectedBAB
      }
    };

    const result = PrereqChecker.checkPrestigeClassPrerequisites(
      simulatedActor,
      prestigeClassName
    );

    projection.push({
      level: projectedLevel,
      bab: projectedBAB,
      eligible: result.met,
      missing: result.missing || []
    });

    if (result.met) {
      earliestLevel = projectedLevel;
      break;
    }
  }

  const delay =
    earliestLevel === Infinity
      ? MAX_PROJECTION
      : Math.max(0, earliestLevel - (currentLevel + 1));

  const riskTags = _calculatePrestigeRisk(delay, projection);

  return {
    earliestLevel,
    delay,
    projection,
    riskTags
  };
}

/**
 * Project BAB for actor + candidate class at a future level
 *
 * Correctly handles:
 *  - Continuing same class (delta from current)
 *  - Multiclass stacking
 *  - New class dip (from level 0)
 *  - Nonheroic classes
 *
 * @param {Object} actor - Current actor state
 * @param {string} classToAdvance - Class to simulate
 * @param {number} projectedLevel - Target level
 * @returns {number} - Projected BAB at that level
 */
export function projectBAB(actor, classToAdvance, projectedLevel) {
  let totalBAB = 0;

  const currentLevel = actor.system?.level || 1;
  const levelsToAdvance = projectedLevel - currentLevel;

  if (levelsToAdvance <= 0) return actor.system?.bab || 0;

  // For each existing class on actor, compute BAB correctly
  for (const classItem of ActorAbilityBridge.getClasses(actor)) {
    const classId = classItem.system?.classId || classItem.name;
    const classDef = ClassesDB.get(classId);
    if (!classDef) continue;

    const classLevel = classItem.system?.level || 0;

    // If this is the class we're advancing
    if (classId === classToAdvance) {
      const newLevel = classLevel + levelsToAdvance;

      // Use cumulative BAB at new level
      const newBAB = _getClassBABAtLevel(classDef, newLevel);
      totalBAB += newBAB;
    } else {
      // Other classes: use current level
      totalBAB += _getClassBABAtLevel(classDef, classLevel);
    }
  }

  // If advancing into a NEW class (no prior levels)
  const alreadyHasClass = actor.items.some(
    i =>
      i.type === "class" &&
      (i.system?.classId || i.name) === classToAdvance
  );

  if (!alreadyHasClass) {
    const classDef = ClassesDB.get(classToAdvance);
    if (classDef) {
      // New class: BAB from level 0 to levelsToAdvance
      totalBAB += _getClassBABAtLevel(classDef, levelsToAdvance);
    }
  }

  return totalBAB;
}

/**
 * Get BAB contribution of a class at a specific level
 *
 * Handles heroic (from levelProgression) and nonheroic (from table)
 *
 * @param {Object} classDef - Class definition from ClassesDB
 * @param {number} level - Level in class (0-20)
 * @returns {number} - Cumulative BAB at that level
 */
function _getClassBABAtLevel(classDef, level) {
  if (level <= 0) return 0;

  if (classDef.isNonheroic) {
    const NONHEROIC_BAB = [
      0, 1, 2, 3, 3, 4, 5, 6, 6, 7,
      8, 9, 9, 10, 11, 12, 12, 13, 14, 15
    ];

    return NONHEROIC_BAB[Math.min(level - 1, 19)];
  }

  const progression = classDef.levelProgression || [];
  const entry = progression[Math.min(level - 1, progression.length - 1)];

  return entry?.bab || 0;
}

/**
 * Calculate risk tags for advisory messaging
 *
 * Tags feed directly into the advisory system for context-aware messaging
 *
 * @param {number} delay - Levels until prestige is accessible
 * @param {Array} projection - Projection trace from calculatePrestigeDelay
 * @returns {Array<string>} - Risk tags for advisory
 */
function _calculatePrestigeRisk(delay, projection) {
  const tags = [];

  // Prestige delay severity
  if (delay >= 2) {
    tags.push("PRESTIGE_DELAY_MAJOR");
  } else if (delay === 1) {
    tags.push("PRESTIGE_DELAY_MINOR");
  }

  // BAB breakpoints reached during projection
  const babBreakpoints = [7, 12, 16];

  for (const step of projection) {
    if (babBreakpoints.includes(step.bab)) {
      tags.push("BAB_BREAKPOINT_REACHED");
      break;
    }
  }

  // Prerequisites still incomplete
  const missingCommon = projection
    .flatMap(p => p.missing || [])
    .filter(Boolean);

  if (missingCommon.length > 0) {
    tags.push("PREREQ_CHAIN_INCOMPLETE");
  }

  return tags;
}

/**
 * Batch calculate prestige delay for multiple candidates
 *
 * Useful for class suggestion engines to avoid individual async calls per option
 *
 * @param {Object} actor - Current actor state
 * @param {string} prestigeClassName - Target prestige class
 * @param {Array<string>} candidateClasses - Classes to evaluate
 * @returns {Promise<Map<string, Object>>} Map of class → delay result
 */
export async function calculatePrestigeDelayBatch(actor, prestigeClassName, candidateClasses) {
  const results = new Map();

  for (const candidateClass of candidateClasses) {
    try {
      const result = await calculatePrestigeDelay(actor, prestigeClassName, candidateClass);
      results.set(candidateClass, result);
    } catch (err) {
      SWSELogger.error(
        `[PrestigeDelayCalculator] Error calculating delay for ${candidateClass}:`,
        err
      );
      results.set(candidateClass, {
        earliestLevel: Infinity,
        delay: Infinity,
        projection: [],
        riskTags: ["ERROR_CALCULATING_DELAY"]
      });
    }
  }

  return results;
}

/**
 * Enrich buildIntent with prestige delay calculations
 *
 * Computes prestige delays for all prestige affinities and base classes.
 * Adds `prestigeDelays` map to buildIntent for use in scoring.
 *
 * Should be called after buildIntent is created but before scoring.
 *
 * @param {Object} buildIntent - BuildIntent from SuggestionEngine
 * @param {Object} actor - Current actor state
 * @returns {Promise<Object>} - Enriched buildIntent with prestigeDelays field
 */
export async function enrichBuildIntentWithPrestigeDelays(buildIntent, actor) {
  if (!buildIntent?.prestigeAffinities || buildIntent.prestigeAffinities.length === 0) {
    buildIntent.prestigeDelays = new Map();
    return buildIntent;
  }

  const prestigeDelays = new Map();

  // Get all base classes available to the actor
  const actorClasses = actor.items
    .filter(i => i.type === 'class')
    .map(i => i.system?.classId || i.name)
    .filter(Boolean);

  // For top 3 prestige affinities, calculate delay for each potential class choice
  for (const prestige of buildIntent.prestigeAffinities.slice(0, 3)) {
    const prestigeKey = prestige.className;
    const classDelays = new Map();

    // Calculate delay for each class the actor could advance in
    for (const candidateClass of actorClasses) {
      try {
        const delayResult = await calculatePrestigeDelay(
          actor,
          prestige.className,
          candidateClass
        );
        classDelays.set(candidateClass, delayResult);
      } catch (err) {
        SWSELogger.warn(
          `[PrestigeDelayCalculator] Failed to calculate delay for ${prestige.className} with ${candidateClass}:`,
          err
        );
        classDelays.set(candidateClass, {
          earliestLevel: Infinity,
          delay: Infinity,
          projection: [],
          riskTags: ["ERROR_CALCULATING_DELAY"]
        });
      }
    }

    prestigeDelays.set(prestigeKey, classDelays);
  }

  buildIntent.prestigeDelays = prestigeDelays;
  return buildIntent;
}
