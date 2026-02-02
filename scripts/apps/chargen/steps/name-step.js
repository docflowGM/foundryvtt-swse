import { guardAgainstMutation } from '../../../dev/mutation-guard.js';
import { patchName } from '../../../progression/engine/progression-patch.js';

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
