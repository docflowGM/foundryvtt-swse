/**
 * species-patch.js — Shared species patch builder for the progression framework.
 *
 * AUTHORITY: This is the single neutral home for species-selection patch logic.
 * Both the progression framework and any legacy consumer should reference this
 * module rather than the old scripts/apps/chargen/steps/species-step.js path.
 *
 * Input contract
 * --------------
 * Accepts a SpeciesRegistryEntry (the canonical shape from SpeciesRegistry):
 *   { name, source, ... }
 *
 * Also tolerates a raw Foundry compendium document for backward compatibility:
 *   { name, system: { source } }
 *
 * The two shapes are resolved at the top of buildSpeciesAtomicPatch — callers
 * do not need to pre-convert.
 */

import {
  concatPatches,
  makePatch,
  patchSpecies,
  setField,
} from '/systems/foundryvtt-swse/scripts/engine/progression/engine/progression-patch.js';
import { guardAgainstMutation } from '/systems/foundryvtt-swse/scripts/dev/mutation-guard.js';

// ---------------------------------------------------------------------------
// Feat entitlements
// ---------------------------------------------------------------------------

/**
 * Compute how many feats must be chosen at level 1 based on species and actor type.
 *
 * @param {{ isHuman: boolean, isNPC: boolean, isDroid: boolean }} params
 * @returns {number}
 */
export function computeStartingFeatsRequired({ isHuman, isNPC, isDroid }) {
  if (isDroid) return 0;
  if (isNPC)   return isHuman ? 3 : 2;
  return isHuman ? 2 : 1;
}

function _buildSpeciesEntitlementsPatch(characterData, speciesName, actorType) {
  const isHuman  = String(speciesName ?? '') === 'Human';
  const isNPC    = String(actorType ?? '') === 'npc';
  const isDroid  = Boolean(characterData?.isDroid);
  const featsRequired = computeStartingFeatsRequired({ isHuman, isNPC, isDroid });
  return makePatch([setField('featsRequired', featsRequired)]);
}

// ---------------------------------------------------------------------------
// Main patch builder
// ---------------------------------------------------------------------------

/**
 * Build a single atomic patch for selecting a species.
 *
 * @param {Object} characterData  - Actor system data (used for droid/NPC checks)
 * @param {Object} speciesEntry   - SpeciesRegistryEntry OR full Foundry species document
 * @param {string} actorType      - Actor type: 'character' | 'npc'
 * @returns {import('/systems/foundryvtt-swse/scripts/engine/progression/engine/progression-patch.js').ProgressionPatch}
 */
function _buildSpeciesAtomicPatch(characterData, speciesEntry, actorType) {
  const speciesName = speciesEntry?.name ?? '';

  // Resolve source from registry entry shape (entry.source) OR full Foundry doc shape
  // (doc.system.source). Registry entries are the canonical input — full docs are tolerated
  // for backward compatibility only.
  const speciesSource = speciesEntry?.source ?? speciesEntry?.system?.source ?? '';

  return concatPatches(
    patchSpecies(speciesName, { speciesSource }),
    _buildSpeciesEntitlementsPatch(characterData, speciesName, actorType),
  );
}

/**
 * Build a single atomic patch for selecting a species.
 * Wrapped with guardAgainstMutation so dev-mode throws if characterData is mutated directly.
 *
 * @param {Object} characterData  - Actor system data (used for droid/NPC checks)
 * @param {Object} speciesEntry   - SpeciesRegistryEntry OR full Foundry species document
 * @param {string} actorType      - Actor type: 'character' | 'npc'
 * @returns {import('/systems/foundryvtt-swse/scripts/engine/progression/engine/progression-patch.js').ProgressionPatch}
 */
export const buildSpeciesAtomicPatch = guardAgainstMutation(
  _buildSpeciesAtomicPatch,
  'buildSpeciesAtomicPatch',
);
