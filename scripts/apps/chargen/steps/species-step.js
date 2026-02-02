import { guardAgainstMutation } from '../../../dev/mutation-guard.js';
import { concatPatches, makePatch, patchSpecies, setField } from '../../../progression/engine/progression-patch.js';

/**
 * Compute how many feats must be chosen at level 1 based on species and actor type.
 * Mirrors legacy chargen behavior.
 *
 * @param {Object} params
 * @param {boolean} params.isHuman
 * @param {boolean} params.isNPC
 * @param {boolean} params.isDroid
 * @returns {number}
 */
export function computeStartingFeatsRequired({ isHuman, isNPC, isDroid }) {
  if (isDroid) return 0;
  if (isNPC) return isHuman ? 3 : 2;
  return isHuman ? 2 : 1;
}

function _buildSpeciesEntitlementsPatch(characterData, speciesName, actorType) {
  const isHuman = String(speciesName ?? '') === 'Human';
  const isNPC = String(actorType ?? '') === 'npc';
  const isDroid = Boolean(characterData?.isDroid);
  const featsRequired = computeStartingFeatsRequired({ isHuman, isNPC, isDroid });

  return makePatch([setField('featsRequired', featsRequired)]);
}

/**
 * Build a patch for species-scoped entitlements.
 *
 * @param {Object} characterData
 * @param {string} speciesName
 * @param {string} actorType
 */
export const buildSpeciesEntitlementsPatch = guardAgainstMutation(
  _buildSpeciesEntitlementsPatch,
  'buildSpeciesEntitlementsPatch'
);

function _buildSpeciesAtomicPatch(characterData, speciesDoc, actorType) {
  const speciesName = speciesDoc?.name ?? '';
  const speciesSource = speciesDoc?.system?.source ?? '';

  return concatPatches(
    patchSpecies(speciesName, { speciesSource }),
    _buildSpeciesEntitlementsPatch(characterData, speciesName, actorType)
  );
}

/**
 * Build a single atomic patch for selecting species.
 *
 * @param {Object} characterData
 * @param {Object} speciesDoc
 * @param {string} actorType
 */
export const buildSpeciesAtomicPatch = guardAgainstMutation(
  _buildSpeciesAtomicPatch,
  'buildSpeciesAtomicPatch'
);
