import { guardAgainstMutation } from "/systems/foundryvtt-swse/scripts/dev/mutation-guard.js";
import { concatPatches, makePatch, patchClass, setField } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/progression-patch.js";
import { TalentSlotCalculator } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/slot-calculator.js";
import { TreeUnlockManager } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-unlock-manager.js";

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

function _buildClassEntitlementsPatch(_characterData, talentsRequired, classDoc, houseRuleSettings) {
  // Phase 1: Create structured talent slots
  const talentSlots = TalentSlotCalculator.calculateL1Slots(classDoc, houseRuleSettings);

  // Initialize tree unlocks
  const unlockedTrees = TreeUnlockManager.initializeL1TreeUnlocks(classDoc, _characterData);

  return makePatch([
    // Keep numeric counter for backward compatibility and UI display
    setField('talentsRequired', Number(talentsRequired ?? 1)),
    // Add structured slots (NEW - Phase 1)
    setField('talentSlots', talentSlots),
    // Track unlocked trees (NEW - Phase 1)
    setField('unlockedTrees', unlockedTrees)
  ]);
}

/**
 * Build a patch for class-scoped entitlements.
 *
 * @param {Object} characterData
 * @param {number} talentsRequired
 * @param {Object} classDoc - Class item document
 * @param {Object} houseRuleSettings - {talentEveryLevel, talentEveryLevelExtraL1}
 */
export const buildClassEntitlementsPatch = guardAgainstMutation(
  _buildClassEntitlementsPatch,
  'buildClassEntitlementsPatch'
);

function _buildClassAtomicPatch(characterData, className, talentsRequired, classDoc, houseRuleSettings) {
  return concatPatches(
    _buildClassSelectionPatch(characterData, className),
    _buildClassResetPatch(characterData),
    _buildClassEntitlementsPatch(characterData, talentsRequired, classDoc, houseRuleSettings),
    makePatch([setField('identityReady', true)])
  );
}

/**
 * Build a single atomic patch for selecting a class.
 *
 * @param {Object} characterData
 * @param {string} className
 * @param {number} talentsRequired
 * @param {Object} classDoc - Class item document (for slot generation)
 * @param {Object} houseRuleSettings - {talentEveryLevel, talentEveryLevelExtraL1}
 */
export const buildClassAtomicPatch = guardAgainstMutation(
  _buildClassAtomicPatch,
  'buildClassAtomicPatch'
);
