import { guardAgainstMutation } from '../../../dev/mutation-guard.js';
import { concatPatches, makePatch, patchClass, setField } from '../../../engines/progression/engine/progression-patch.js';

function _buildClassSelectionPatch(_characterData, className) {
  return patchClass(className);
}

/**
 * Build a patch for selecting a class.
 *
 * @param {Object} characterData
 * @param {string} className
 */
export const buildClassSelectionPatch = guardAgainstMutation(
  _buildClassSelectionPatch,
  'buildClassSelectionPatch'
);

function _buildClassResetPatch(_characterData) {
  return makePatch([
    setField('talents', []),
    setField('feats', [])
  ]);
}

/**
 * Build a patch to reset class-dependent selections.
 *
 * @param {Object} characterData
 */
export const buildClassResetPatch = guardAgainstMutation(
  _buildClassResetPatch,
  'buildClassResetPatch'
);

function _buildClassEntitlementsPatch(_characterData, talentsRequired) {
  return makePatch([
    setField('talentsRequired', Number(talentsRequired ?? 1))
  ]);
}

/**
 * Build a patch for class-scoped entitlements.
 *
 * @param {Object} characterData
 * @param {number} talentsRequired
 */
export const buildClassEntitlementsPatch = guardAgainstMutation(
  _buildClassEntitlementsPatch,
  'buildClassEntitlementsPatch'
);

function _buildClassAtomicPatch(characterData, className, talentsRequired) {
  return concatPatches(
    _buildClassSelectionPatch(characterData, className),
    _buildClassResetPatch(characterData),
    _buildClassEntitlementsPatch(characterData, talentsRequired),
    makePatch([setField('identityReady', true)])
  );
}

/**
 * Build a single atomic patch for selecting a class.
 *
 * @param {Object} characterData
 * @param {string} className
 * @param {number} talentsRequired
 */
export const buildClassAtomicPatch = guardAgainstMutation(
  _buildClassAtomicPatch,
  'buildClassAtomicPatch'
);
