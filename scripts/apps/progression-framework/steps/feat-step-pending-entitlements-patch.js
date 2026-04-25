/**
 * PATCH: FeatStep - Pending Entitlements & Immediate Choices Integration
 *
 * This patch adds support for:
 * 1. Creating pending entitlements when Skill Training, Linguist, Force Training, Starship Tactics selected
 * 2. Launching immediate pickers for Skill Focus, Weapon Proficiency, Weapon Focus
 * 3. Storing immediate choice results in progression state
 *
 * INTEGRATION POINTS:
 * - Import at top of feat-step.js:
 *   import { PendingEntitlementService } from '../services/pending-entitlement-service.js';
 *
 * - In onDataReady(), after wire feat focus (line 270), add:
 *   this._wireImmediateChoicePickers(shell);
 *
 * - In getSelection() (line 734), after return, add entitlement/choice logic
 *
 * MODIFIED METHODS:
 * - onDataReady() — Wire up immediate choice picker buttons
 * - getSelection() — Return selected feat + track entitlements/choices
 * - New: _wireImmediateChoicePickers() — Set up click handlers
 * - New: _promptImmediateChoice() — Launch picker modal
 * - New: _isChoiceBearingFeat() — Detect which feats need immediate choices
 * - New: _validateFeatSelection() — Check if feat requires unresolved choice
 */

/**
 * PATCH FRAGMENT FOR onDataReady (after line 270):
 *
 * Add this at the end of onDataReady(), before the closing brace:
 */
export const onDataReadyPatch = `
    // NEW: Wire immediate choice pickers for choice-bearing feats
    this._wireImmediateChoicePickers(shell);
`;

/**
 * NEW METHOD: _wireImmediateChoicePickers
 * Set up click handlers for feats that require immediate subtype choices
 */
export function _wireImmediateChoicePickers(shell) {
  if (!shell.element) return;

  const { signal } = this._renderAbort;

  // Wire buttons for choice-bearing feat selections
  const selectFeatBtns = shell.element.querySelectorAll('[data-action="select-feat"]');
  selectFeatBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const featId = btn.dataset.featId;
      if (!featId) return;

      // Find the feat
      const feat = this._allFeats.find(f => (f._id || f.id) === featId);
      if (!feat) return;

      // Check if this feat requires an immediate choice
      const choiceType = this._getImmediateChoiceTypeForFeat(feat);
      if (!choiceType) {
        // No immediate choice needed — just select it
        this._selectedFeatId = featId;
        this._selectedFeatItem = feat;
        shell.render();
        return;
      }

      // Feat requires immediate choice — launch picker
      await this._promptImmediateChoice(shell, feat, choiceType);
    }, { signal });
  });
}

/**
 * NEW METHOD: _getImmediateChoiceTypeForFeat
 * Returns the choice type if feat requires immediate resolution, null otherwise
 */
export function _getImmediateChoiceTypeForFeat(feat) {
  if (!feat || !feat.name) return null;

  const name = String(feat.name).toLowerCase().trim();

  // Map feat names to immediate choice types
  const choiceMap = {
    'skill focus': 'skill_focus_choice',
    'weapon proficiency': 'weapon_proficiency_choice',
    'weapon focus': 'weapon_focus_choice',
  };

  for (const [featName, choiceType] of Object.entries(choiceMap)) {
    if (name.includes(featName)) {
      return choiceType;
    }
  }

  return null;
}

/**
 * NEW METHOD: _isEntitlementBearingFeat
 * Returns the entitlement type if feat creates pending entitlements, null otherwise
 */
export function _isEntitlementBearingFeat(feat) {
  if (!feat || !feat.name) return null;

  const name = String(feat.name).toLowerCase().trim();

  const entitlementMap = {
    'skill training': 'skill_training_slot',
    'linguist': 'language_pick',
    'force training': 'force_power_pick',
    'starship tactics': 'maneuver_pick',
  };

  for (const [featName, type] of Object.entries(entitlementMap)) {
    if (name.includes(featName)) {
      return type;
    }
  }

  return null;
}

/**
 * NEW METHOD: _promptImmediateChoice
 * Launch a modal/picker for the user to make the immediate choice
 */
export async function _promptImmediateChoice(shell, feat, choiceType) {
  try {
    // Call the appropriate picker based on choice type
    let selectedValue;

    switch (choiceType) {
      case 'skill_focus_choice':
        selectedValue = await this._promptSkillFocusPicker(shell);
        break;
      case 'weapon_proficiency_choice':
        selectedValue = await this._promptWeaponProficiencyPicker(shell);
        break;
      case 'weapon_focus_choice':
        selectedValue = await this._promptWeaponFocusPicker(shell);
        break;
      default:
        console.warn(`[FeatStep] Unknown choice type: ${choiceType}`);
        return;
    }

    if (selectedValue === null || selectedValue === undefined) {
      // User cancelled — don't commit the feat
      console.info('[FeatStep] Choice cancelled by user');
      return;
    }

    // Selection successful — commit feat and store choice
    this._selectedFeatId = feat._id || feat.id;
    this._selectedFeatItem = feat;

    // Store the immediate choice in progression state
    const choice = PendingEntitlementService.createImmediateChoice(choiceType, {
      stepId: this.descriptor?.stepId,
      featId: feat._id || feat.id,
      featName: feat.name,
    }, {
      required: true,
      allowedOptions: [], // Populated by picker
    });

    const resolvedChoice = PendingEntitlementService.resolveImmediateChoice(choice, selectedValue);

    // Add to progression session
    if (!shell.progressionSession.draftSelections.immediateChoices) {
      shell.progressionSession.draftSelections.immediateChoices = [];
    }

    shell.progressionSession.draftSelections.immediateChoices.push(resolvedChoice);

    // Render to reflect changes
    shell.render();
  } catch (err) {
    console.error('[FeatStep] Error during immediate choice:', err);
  }
}

/**
 * NEW METHOD: _promptSkillFocusPicker
 * Prompt user to choose a trained skill for Skill Focus
 * Returns selected skill key or null if cancelled
 */
export async function _promptSkillFocusPicker(shell) {
  // Get actor's trained skills
  const actor = shell.actor;
  const trainedSkills = (actor?.system?.skills || {});

  const trained = Object.entries(trainedSkills)
    .filter(([key, skillData]) => skillData?.trained === true)
    .map(([key, skillData]) => ({
      key,
      name: skillData?.name || key,
    }));

  if (trained.length === 0) {
    // No trained skills available
    ui.notifications.warn('No trained skills available for Skill Focus');
    return null;
  }

  // TODO: Launch modal dialog with skill list
  // For now, return first trained skill (demo)
  return trained[0].key;
}

/**
 * NEW METHOD: _promptWeaponProficiencyPicker
 * Prompt user to choose a weapon group/category for Weapon Proficiency
 * Returns selected weapon group or null if cancelled
 */
export async function _promptWeaponProficiencyPicker(shell) {
  // Get legal weapon groups (from WeaponLegalityChecker or similar)
  const actor = shell.actor;

  // TODO: Get canonical weapon groups from repo
  const allWeaponGroups = [
    'simple melee weapons',
    'martial melee weapons',
    'simple ranged weapons',
    'martial ranged weapons',
  ];

  // Get already-owned proficiencies
  const ownedProficiencies = new Set(actor.items
    .filter(i => i.type === 'feat' && String(i.name || '').toLowerCase().includes('weapon proficiency'))
    .map(i => i.data?.data?.associatedWeapon || null)
    .filter(Boolean));

  const available = allWeaponGroups.filter(group => !ownedProficiencies.has(group));

  if (available.length === 0) {
    ui.notifications.warn('No weapon groups available for Weapon Proficiency');
    return null;
  }

  // TODO: Launch modal dialog with weapon group list
  // For now, return first available
  return available[0];
}

/**
 * NEW METHOD: _promptWeaponFocusPicker
 * Prompt user to choose a weapon group for Weapon Focus
 * Constraints: must be proficient in group
 * Returns selected weapon group or null if cancelled
 */
export async function _promptWeaponFocusPicker(shell) {
  const actor = shell.actor;

  // Get proficient weapon groups
  const proficiencies = new Set(actor.items
    .filter(i => i.type === 'feat' && String(i.name || '').toLowerCase().includes('weapon proficiency'))
    .map(i => i.data?.data?.associatedWeapon)
    .filter(Boolean));

  if (proficiencies.size === 0) {
    ui.notifications.warn('No weapon proficiencies for Weapon Focus');
    return null;
  }

  // TODO: Launch modal dialog with proficient weapon groups
  // For now, return first proficiency
  return Array.from(proficiencies)[0];
}

/**
 * PATCH TO getSelection() return object (after line 738):
 *
 * Replace the return in getSelection() with:
 */
export const getSelectionPatchReturn = `
  getSelection() {
    const isComplete = this._validateFeatSelection();
    return {
      selected: this._selectedFeatId ? [this._selectedFeatId] : [],
      count: this._selectedFeatId ? 1 : 0,
      isComplete,
      // NEW: Track pending entitlements & immediate choices
      pendingEntitlements: this._selectedFeatId
        ? this._createEntitlementsForSelectedFeat()
        : [],
      immediateChoices: shell.progressionSession?.draftSelections?.immediateChoices || [],
    };
  }
`;

/**
 * NEW METHOD: _createEntitlementsForSelectedFeat
 * Create pending entitlements if the selected feat grants them
 */
export function _createEntitlementsForSelectedFeat() {
  if (!this._selectedFeatItem) return [];

  const entitlementType = this._isEntitlementBearingFeat(this._selectedFeatItem);
  if (!entitlementType) return [];

  // Calculate quantity based on type
  let quantity = 1;

  if (entitlementType === 'language_pick') {
    // 1 + INT mod (minimum 1)
    const intMod = this._buildPendingAbilityData(shell)?.int?.mod || 0;
    quantity = Math.max(1, 1 + intMod);
  } else if (entitlementType === 'force_power_pick') {
    // 1 + WIS mod (minimum 1)
    const wisMod = this._buildPendingAbilityData(shell)?.wis?.mod || 0;
    quantity = Math.max(1, 1 + wisMod);
  } else if (entitlementType === 'maneuver_pick') {
    // 1 + WIS mod (minimum 1)
    const wisMod = this._buildPendingAbilityData(shell)?.wis?.mod || 0;
    quantity = Math.max(1, 1 + wisMod);
  }

  const entitlement = PendingEntitlementService.createEntitlement(
    entitlementType,
    {
      stepId: this.descriptor?.stepId,
      featId: this._selectedFeatItem._id || this._selectedFeatItem.id,
      featName: this._selectedFeatItem.name,
    },
    quantity
  );

  return [entitlement];
}

/**
 * NEW METHOD: _validateFeatSelection
 * Check if selected feat's requirements are met
 */
export function _validateFeatSelection() {
  if (!this._selectedFeatId) return false;

  // Check if feat requires an immediate choice
  const choiceType = this._getImmediateChoiceTypeForFeat(this._selectedFeatItem);
  if (!choiceType) {
    // No choice needed — feat is valid
    return true;
  }

  // Feat requires immediate choice — check if resolved
  const session = this.shell?.progressionSession;
  if (!session) return false;

  const choices = session.draftSelections?.immediateChoices || [];
  const resolvedChoice = choices.find(c =>
    c.source?.featId === (this._selectedFeatItem._id || this._selectedFeatItem.id) &&
    c.type === choiceType
  );

  return !!resolvedChoice?.resolved;
}
`;

export default {
  onDataReadyPatch,
  _wireImmediateChoicePickers,
  _getImmediateChoiceTypeForFeat,
  _isEntitlementBearingFeat,
  _promptImmediateChoice,
  _promptSkillFocusPicker,
  _promptWeaponProficiencyPicker,
  _promptWeaponFocusPicker,
  getSelectionPatchReturn,
  _createEntitlementsForSelectedFeat,
  _validateFeatSelection,
};
