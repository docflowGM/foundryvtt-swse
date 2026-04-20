/**
 * Action Handlers Utilities for Character Generator
 * Provides helper functions for user interaction handling
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { applyProgressionPatch } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/apply-progression-patch.js";
import { buildNamePatch } from "/systems/foundryvtt-swse/scripts/apps/chargen/steps/name-step.js";

/**
 * Handle random name selection
 * @param {Array<string>} names - Pool of names to choose from
 * @param {Object} characterData - Character data to update
 * @param {string} categoryLabel - Label for notification (e.g., "Random name")
 * @returns {string} The selected name
 */
export function selectRandomName(names, characterData, categoryLabel = 'Random name') {
  if (!names || names.length === 0) {
    ui.notifications.warn(`No ${categoryLabel.toLowerCase()} available to choose from.`);
    return null;
  }

  const randomIndex = Math.floor(Math.random() * names.length);
  const selectedName = names[randomIndex];

  const patch = buildNamePatch(characterData, selectedName);
  const updated = applyProgressionPatch(characterData, patch);

  ui.notifications.info(`${categoryLabel} selected: ${selectedName}`);
  return selectedName;
}

/**
 * Handle type selection (living/droid)
 * @param {Object} characterData - Character data to update
 * @param {string} typeSelection - 'living' or 'droid'
 */
export function applyTypeSelection(characterData, typeSelection) {
  if (typeSelection === 'droid') {
    characterData.isDroid = true;
  } else {
    characterData.isDroid = false;
  }
  SWSELogger.log(`[CHARGEN] Type selected: ${typeSelection}`);
}

/**
 * Handle degree selection (droid)
 * @param {Object} characterData - Character data to update
 * @param {string} degree - Selected droid degree
 */
export function applyDegreeSelection(characterData, degree) {
  characterData.droidDegree = degree;
  SWSELogger.log(`[CHARGEN] Droid degree selected: ${degree}`);
}

/**
 * Handle size selection (droid)
 * @param {Object} characterData - Character data to update
 * @param {string} size - Selected droid size
 */
export function applySizeSelection(characterData, size) {
  characterData.droidSize = size;
  SWSELogger.log(`[CHARGEN] Droid size selected: ${size}`);
}

/**
 * Handle free build toggle
 * @param {boolean} enabled - Whether free build is enabled
 * @returns {boolean} The new free build state
 */
export function toggleFreeBuild(enabled) {
  SWSELogger.log(`[CHARGEN] Free build mode: ${enabled}`);
  return enabled;
}

/**
 * Handle navigation event prevention
 * @param {Event} event - The event
 */
export function preventNavigation(event) {
  event.preventDefault();
}

/**
 * Get error message for missing required selection
 * @param {string} itemType - Type of item (feat, talent, etc.)
 * @param {number} required - Number required
 * @param {number} selected - Number selected
 * @returns {string} Error message
 */
export function getMissingSelectionMessage(itemType, required, selected) {
  const plural = required === 1 ? '' : 's';
  return `You must select ${required} ${itemType}${plural} (currently selected: ${selected}).`;
}

/**
 * Validate selection count matches requirement
 * @param {number} selected - Number of items selected
 * @param {number} required - Number of items required
 * @returns {boolean} True if selection count is valid
 */
export function validateSelectionCount(selected, required) {
  return selected >= required;
}

/**
 * Handle selection state update
 * @param {Array} selections - Current selections array
 * @param {Object} item - Item to add/remove
 * @param {boolean} isSelected - Whether item is being selected
 * @returns {Array} Updated selections
 */
export function updateSelectionState(selections, item, isSelected) {
  if (isSelected) {
    if (!selections.find(s => s._id === item._id)) {
      selections.push(item);
    }
  } else {
    const idx = selections.findIndex(s => s._id === item._id);
    if (idx >= 0) {
      selections.splice(idx, 1);
    }
  }
  return selections;
}

/**
 * Log action execution
 * @param {string} actionName - Name of the action
 * @param {Object} data - Action data
 */
export function logAction(actionName, data = {}) {
  SWSELogger.log(`[CHARGEN] Action: ${actionName}`, data);
}
