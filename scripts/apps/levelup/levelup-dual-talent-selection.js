/**
 * Dual Talent Selection UI and Logic for SWSE Level Up (Hardened v2-Compliant)
 *
 * Handles selection of both:
 * - Heroic Level Talents (can pick from ANY unlocked talent tree)
 * - Class Level Talents (restricted to selected class's trees)
 *
 * Pure UI-layer orchestration.
 * No mutation. No rule math. No engine logic duplication.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import {
  getTalentProgressionInfo,
  getAvailableTalentTreesForHeroicTalent,
  getAvailableTalentTreesForClassTalent
} from "/systems/foundryvtt-swse/scripts/apps/levelup/levelup-dual-talent-progression.js";

/**
 * Get the talent selection UI state based on current level progression.
 *
 * @param {Object} selectedClass
 * @param {Actor} actor
 * @returns {{
 *   needsHeroicTalent: boolean,
 *   needsClassTalent: boolean,
 *   totalNeeded: number,
 *   heroicCount: number,
 *   classCount: number
 * }}
 */
export function getTalentSelectionState(selectedClass, actor) {
  if (!selectedClass || !actor) {
    return {
      needsHeroicTalent: false,
      needsClassTalent: false,
      totalNeeded: 0,
      heroicCount: 0,
      classCount: 0
    };
  }

  const progression = getTalentProgressionInfo(selectedClass, actor) ?? {};

  const heroic = progression.heroic ?? 0;
  const classCount = progression.class ?? 0;
  const total = progression.total ?? (heroic + classCount);

  return {
    needsHeroicTalent: heroic > 0,
    needsClassTalent: classCount > 0,
    totalNeeded: total,
    heroicCount: heroic,
    classCount
  };
}

/**
 * Get available talent trees for heroic talent selection.
 * Returns UNION of all trees unlocked by character classes.
 *
 * @param {Actor} actor
 * @returns {Promise<Set<string>>}
 */
export async function getHeroicTalentTrees(actor) {
  if (!actor) return new Set();
  return await getAvailableTalentTreesForHeroicTalent(actor);
}

/**
 * Get available talent trees for class talent selection.
 *
 * @param {Object} selectedClass
 * @returns {Array<string>}
 */
export function getClassTalentTrees(selectedClass) {
  if (!selectedClass) return [];
  return getAvailableTalentTreesForClassTalent(selectedClass) ?? [];
}

/**
 * Validate and record a talent selection.
 *
 * UI-layer helper only — does NOT mutate actor.
 *
 * @param {Object} selectedTalent
 * @param {"heroic"|"class"} selectionType
 * @param {Actor} actor
 * @param {Object} selectedClass
 * @returns {Object|null}
 */
export function recordTalentSelection(selectedTalent, selectionType, actor, selectedClass) {
  if (!selectedTalent || !["heroic", "class"].includes(selectionType)) {
    if (CONFIG?.SWSE?.debugTalents) {
      SWSELogger.warn("[DUAL-TALENT-SELECT] Invalid selection:", {
        selectedTalent,
        selectionType
      });
    }
    return null;
  }

  const source =
    selectionType === "heroic"
      ? "Heroic Level"
      : selectedClass?.name
        ? `Class: ${selectedClass.name}`
        : "Class Talent";

  const recorded = {
    ...selectedTalent,
    _source: source,
    _selectionType: selectionType
  };

  if (CONFIG?.SWSE?.debugTalents) {
    SWSELogger.log(
      `[DUAL-TALENT-SELECT] Recorded ${selectionType} talent:`,
      recorded?.name ?? "Unnamed"
    );
  }

  return recorded;
}

/**
 * Check if character needs more talent selections.
 *
 * @param {Object} selectedClass
 * @param {Actor} actor
 * @param {{ heroicTalent?: Object, classTalent?: Object }} currentSelections
 * @returns {{
 *   complete: boolean,
 *   remaining: string[],
 *   totalNeeded: number,
 *   currentCount: number
 * }}
 */
export function checkTalentSelectionsComplete(
  selectedClass,
  actor,
  currentSelections = {}
) {
  const state = getTalentSelectionState(selectedClass, actor);

  const remaining = [];

  if (state.needsHeroicTalent && !currentSelections.heroicTalent) {
    remaining.push("heroic");
  }

  if (state.needsClassTalent && !currentSelections.classTalent) {
    remaining.push("class");
  }

  const currentCount =
    (currentSelections.heroicTalent ? 1 : 0) +
    (currentSelections.classTalent ? 1 : 0);

  return {
    complete: remaining.length === 0,
    remaining,
    totalNeeded: state.totalNeeded,
    currentCount
  };
}

/**
 * Get UI display metadata for selected talents.
 *
 * @param {{ heroicTalent?: Object, classTalent?: Object }} selections
 * @returns {{
 *   heroicTalent: Object|null,
 *   classTalent: Object|null,
 *   completionPercentage: number
 * }}
 */
export function getTalentSelectionDisplay(selections = {}) {
  const display = {
    heroicTalent: null,
    classTalent: null,
    completionPercentage: 0
  };

  if (selections.heroicTalent) {
    display.heroicTalent = {
      name: selections.heroicTalent.name ?? "Unnamed Talent",
      tree: selections.heroicTalent.system?.tree ?? "Unknown",
      source: "Any unlocked class talent tree"
    };
  }

  if (selections.classTalent) {
    display.classTalent = {
      name: selections.classTalent.name ?? "Unnamed Talent",
      tree: selections.classTalent.system?.tree ?? "Unknown",
      source: "Class-specific talent tree"
    };
  }

  const total =
    (selections.heroicTalent ? 1 : 0) +
    (selections.classTalent ? 1 : 0);

  display.completionPercentage =
    total === 2 ? 100 :
    total === 1 ? 50 :
    0;

  return display;
}