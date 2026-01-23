/**
 * Dual Talent Selection UI and Logic for SWSE Level Up
 *
 * Handles selection of both:
 * - Heroic Level Talents (can pick from ANY talent tree unlocked by character's classes)
 *   Example: Soldier gets Armor Specialist, Commando, Weapon Specialist trees.
 *           Scout adds Camouflage, Spy trees.
 *           Heroic talent can be from ANY of these 5 trees.
 * - Class Level Talents (can ONLY pick from that specific class's trees)
 *   Example: When leveling Soldier, can ONLY pick from Armor Specialist, Commando, Weapon Specialist.
 */

import { SWSELogger } from '../../utils/logger.js';
import {
  getTalentProgressionInfo,
  getAvailableTalentTreesForHeroicTalent,
  getAvailableTalentTreesForClassTalent
} from './levelup-dual-talent-progression.js';

/**
 * Get the talent selection UI state based on current level progression
 * @param {Object} selectedClass - The selected class
 * @param {Actor} actor - The character actor
 * @returns {Object} { needsHeroicTalent, needsClassTalent, totalNeeded }
 */
export function getTalentSelectionState(selectedClass, actor) {
  if (!selectedClass) {
    return { needsHeroicTalent: false, needsClassTalent: false, totalNeeded: 0 };
  }

  const progression = getTalentProgressionInfo(selectedClass, actor);

  return {
    needsHeroicTalent: progression.heroic > 0,
    needsClassTalent: progression.class > 0,
    totalNeeded: progression.total,
    heroicCount: progression.heroic,
    classCount: progression.class
  };
}

/**
 * Get available talent trees for heroic talent selection
 * Returns the UNION of all talent trees available to any of the character's classes
 * @param {Actor} actor - The character actor
 * @returns {Promise<Set<string>>} Available talent trees (combined from all classes)
 */
export async function getHeroicTalentTrees(actor) {
  return await getAvailableTalentTreesForHeroicTalent(actor);
}

/**
 * Get available talent trees for class talent selection
 * @param {Object} selectedClass - The selected class
 * @returns {Array<string>} Available talent trees
 */
export function getClassTalentTrees(selectedClass) {
  return getAvailableTalentTreesForClassTalent(selectedClass);
}

/**
 * Validate and record a talent selection
 * @param {Object} selectedTalent - The talent being selected
 * @param {string} selectionType - 'heroic' or 'class'
 * @param {Actor} actor - The character actor
 * @returns {Object} Validated talent with source info
 */
export function recordTalentSelection(selectedTalent, selectionType, actor) {
  if (!selectedTalent || !['heroic', 'class'].includes(selectionType)) {
    SWSELogger.warn(`[DUAL-TALENT-SELECT] Invalid selection:`, { selectedTalent, selectionType });
    return null;
  }

  const source = selectionType === 'heroic' ? 'Heroic Level' : `Class: ${actor.name}`;

  const recorded = {
    ...selectedTalent,
    _source: source,
    _selectionType: selectionType
  };

  SWSELogger.log(`[DUAL-TALENT-SELECT] Recorded ${selectionType} talent:`, recorded.name);

  return recorded;
}

/**
 * Check if character needs more talent selections
 * @param {Object} selectedClass - The selected class
 * @param {Actor} actor - The character actor
 * @param {Object} currentSelections - { heroicTalent: Object, classTalent: Object }
 * @returns {Object} { complete: boolean, remaining: string[] }
 */
export function checkTalentSelectionsComplete(selectedClass, actor, currentSelections = {}) {
  const state = getTalentSelectionState(selectedClass, actor);

  const remaining = [];

  if (state.needsHeroicTalent && !currentSelections.heroicTalent) {
    remaining.push('heroic');
  }

  if (state.needsClassTalent && !currentSelections.classTalent) {
    remaining.push('class');
  }

  return {
    complete: remaining.length === 0,
    remaining,
    totalNeeded: state.totalNeeded,
    currentCount: Object.keys(currentSelections).filter(k => currentSelections[k]).length
  };
}

/**
 * Get UI display strings for talent selection
 * @param {Object} selections - { heroicTalent: Object, classTalent: Object }
 * @returns {Object} Display strings for UI
 */
export function getTalentSelectionDisplay(selections) {
  const display = {
    heroicTalent: null,
    classTalent: null,
    completionPercentage: 0
  };

  if (selections.heroicTalent) {
    display.heroicTalent = {
      name: selections.heroicTalent.name,
      tree: selections.heroicTalent.system?.tree || 'Unknown',
      source: 'Any class talent tree'
    };
  }

  if (selections.classTalent) {
    display.classTalent = {
      name: selections.classTalent.name,
      tree: selections.classTalent.system?.tree || 'Unknown',
      source: 'Class-specific talent tree'
    };
  }

  const total = (selections.heroicTalent ? 1 : 0) + (selections.classTalent ? 1 : 0);
  display.completionPercentage = total === 2 ? 100 : (total === 1 ? 50 : 0);

  return display;
}
