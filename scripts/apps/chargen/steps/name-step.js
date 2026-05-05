import { guardAgainstMutation } from "/systems/foundryvtt-swse/scripts/dev/mutation-guard.js";
import { patchName } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/progression-patch.js";

function _buildNamePatch(_characterData, name) {
  return patchName(name);
}

/**
 * Build a ProgressionPatch for selecting a name.
 *
 * @param {Object} characterData
 * @param {string} name
 */
export const buildNamePatch = guardAgainstMutation(_buildNamePatch, 'buildNamePatch');
