/**
 * Validation logic for SWSE Level Up system
 * Handles prerequisite checking for classes, talents, and feats
 */

import { PrerequisiteRequirements } from '../../progression/feats/prerequisite_engine.js';
import { SWSELogger } from '../../utils/logger.js';
import { isBaseClass } from './levelup-shared.js';

// Cache for prestige class prerequisites loaded from JSON
let _prestigePrereqCache = null;

/**
 * Load prestige class prerequisites from JSON configuration
 * @returns {Promise<Object>} - Prerequisites object
 */
async function loadPrestigeClassPrerequisites() {
  if (_prestigePrereqCache) {
    return _prestigePrereqCache;
  }

  try {
    const response = await fetch('systems/foundryvtt-swse/data/prestige-class-prerequisites.json');
    if (!response.ok) {
      throw new Error(`Failed to load prerequisites: ${response.status} ${response.statusText}`);
    }
    _prestigePrereqCache = await response.json();
    SWSELogger.log('SWSE LevelUp | Loaded prestige class prerequisites from JSON');
    return _prestigePrereqCache;
  } catch (err) {
    SWSELogger.error('SWSE LevelUp | Failed to load prestige class prerequisites:', err);
    ui.notifications.warn('Failed to load prestige class prerequisites. Some classes may not validate correctly.');
    _prestigePrereqCache = {};
    return _prestigePrereqCache;
  }
}

/**
 * Get prerequisites for a prestige class
 * @param {string} className - Name of the prestige class
 * @returns {Promise<string|null>} - Prerequisite string or null
 */
export async function getPrestigeClassPrerequisites(className) {
  const prerequisites = await loadPrestigeClassPrerequisites();
  const classPrereqs = prerequisites[className];

  if (!classPrereqs) {
    return null;
  }

  // Return the description field which contains the formatted prerequisite string
  return classPrereqs.description || null;
}

/**
 * Check if character meets prerequisites for a class
 * @param {Object} classDoc - The class document
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections (feats, skills, etc.)
 * @returns {Promise<boolean>}
 */
export async function meetsClassPrerequisites(classDoc, actor, pendingData) {
  // Base classes have no prerequisites
  if (isBaseClass(classDoc)) return true;

  // Load prerequisites for prestige classes from JSON configuration
  const prestigePrerequisites = await getPrestigeClassPrerequisites(classDoc.name);

  // If we have prerequisites from JSON, use those
  if (prestigePrerequisites) {
    const check = PrerequisiteValidator.checkClassPrerequisites(
      { system: { prerequisites: prestigePrerequisites } },
      actor,
      pendingData
    );
    return check.valid;
  }

  // Fall back to checking classDoc prerequisites
  const check = PrerequisiteValidator.checkClassPrerequisites(classDoc, actor, pendingData);
  return check.valid;
}

/**
 * Check if character meets prerequisites for a talent
 * @param {Object} talent - The talent document
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections (feats, talents, etc.)
 * @returns {{valid: boolean, reasons: string[]}}
 */
export function checkTalentPrerequisites(talent, actor, pendingData) {
  return PrerequisiteRequirements.checkTalentPrerequisites(actor, talent, pendingData);
}

/**
 * Filter feats based on prerequisites
 * @param {Array} feats - Array of feat documents
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections
 * @returns {Array} Filtered feats with isQualified flag
 */
export function filterQualifiedFeats(feats, actor, pendingData) {
  return PrerequisiteValidator.filterQualifiedFeats(feats, actor, pendingData);
}
