import { ProgressionFinalizer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js';
import { FeatChoiceResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js';

const PATCH_ID = 'choice-resolution-finalization-patch-v1';

function firstScalar(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return firstScalar(
      value.key
      ?? value.slug
      ?? value.skillKey
      ?? value.skillId
      ?? value.skill
      ?? value.system?.key
      ?? value.system?.skillKey
      ?? value.system?.skillId
      ?? value.value?.key
      ?? value.value?.slug
      ?? value.value?.skillKey
      ?? value.value?.skillId
      ?? value.name
      ?? value.label
      ?? value.displayName
      ?? value.value?.name
      ?? value.value?.label
      ?? value.value
      ?? value.id
      ?? value._id
      ?? value.internalId
    );
  }
  const text = String(value).trim();
  return text && text !== '[object Object]' ? text : '';
}

function choiceCandidates(itemOrFeat = {}) {
  const system = itemOrFeat.system || itemOrFeat.data?.system || {};
  const flags = itemOrFeat.flags || {};
  return [
    system.selectedChoice,
    system.selectedChoices,
    system.choice,
    system.choiceValue,
    system.choiceResolvedValue,
    itemOrFeat.selectedChoice,
    itemOrFeat.selectedChoices,
    itemOrFeat.choice,
    itemOrFeat.choiceValue,
    flags.swse?.selectedChoice,
    flags.swse?.selectedChoices,
    flags.swse?.choice,
    flags.swse?.choiceValue,
    flags.swse?.progression?.selectedChoice,
    flags.swse?.progression?.choice,
    flags.swse?.acquisition?.selectedChoice,
    flags.swse?.acquisition?.choice,
    flags['foundryvtt-swse']?.selectedChoice,
    flags['foundryvtt-swse']?.choice,
  ];
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function setPropertySafe(target, path, value) {
  if (!target || !path) return;
  if (globalThis.foundry?.utils?.setProperty) {
    foundry.utils.setProperty(target, path, value);
    return;
  }
  const parts = String(path).split('.');
  let cursor = target;
  while (parts.length > 1) {
    const part = parts.shift();
    cursor[part] ??= {};
    cursor = cursor[part];
  }
  cursor[parts[0]] = value;
}

function registerFinalizerChoicePatch() {
  if (!ProgressionFinalizer || ProgressionFinalizer.__swseChoiceResolutionPatch === PATCH_ID) return;

  const originalCanonicalSkillKey = ProgressionFinalizer._canonicalSkillKey?.bind(ProgressionFinalizer);
  if (typeof originalCanonicalSkillKey === 'function') {
    ProgressionFinalizer._canonicalSkillKey = function patchedCanonicalSkillKey(value) {
      const direct = originalCanonicalSkillKey(value);
      if (direct) return direct;
      const scalar = firstScalar(value);
      return scalar && scalar !== value ? (originalCanonicalSkillKey(scalar) || '') : '';
    };
  }

  const originalExtractSkillFocusKeys = ProgressionFinalizer._extractSkillFocusKeysFromSelections?.bind(ProgressionFinalizer);
  if (typeof originalExtractSkillFocusKeys === 'function') {
    ProgressionFinalizer._extractSkillFocusKeysFromSelections = function patchedExtractSkillFocusKeys(selections = {}) {
      const keys = new Set(originalExtractSkillFocusKeys(selections) || []);
      const feats = [
        ...(Array.isArray(selections.feats) ? selections.feats : []),
        ...(Array.isArray(selections.selectedFeats) ? selections.selectedFeats : []),
      ];
      for (const feat of feats) {
        const name = String(feat?.name || feat?.label || feat || '').trim().toLowerCase();
        if (!name.startsWith('skill focus')) continue;
        for (const candidate of choiceCandidates(feat)) {
          const key = ProgressionFinalizer._canonicalSkillKey(candidate);
          if (key) keys.add(key);
        }
      }
      return Array.from(keys);
    };
  }

  ProgressionFinalizer.__swseChoiceResolutionPatch = PATCH_ID;
}

function registerFeatChoiceResolverPatch() {
  if (!FeatChoiceResolver || FeatChoiceResolver.__swseChoiceResolutionPatch === PATCH_ID) return;

  const originalGetStoredChoice = FeatChoiceResolver.getStoredChoice?.bind(FeatChoiceResolver);
  FeatChoiceResolver.getStoredChoice = function patchedGetStoredChoice(actor, itemOrFeat) {
    const original = originalGetStoredChoice?.(actor, itemOrFeat);
    if (hasValue(original)) return original;
    return choiceCandidates(itemOrFeat).find(hasValue);
  };

  const originalBuildChoicePatch = FeatChoiceResolver.buildChoicePatch?.bind(FeatChoiceResolver);
  if (typeof originalBuildChoicePatch === 'function') {
    FeatChoiceResolver.buildChoicePatch = function patchedBuildChoicePatch(itemOrFeat, selectedChoice) {
      const patch = originalBuildChoicePatch(itemOrFeat, selectedChoice) || {};
      if (hasValue(selectedChoice)) {
        setPropertySafe(patch, 'system.selectedChoice', selectedChoice);
        setPropertySafe(patch, 'flags.swse.selectedChoice', selectedChoice);
        setPropertySafe(patch, 'flags.swse.progression.selectedChoice', selectedChoice);
      }
      return patch;
    };
  }

  FeatChoiceResolver.__swseChoiceResolutionPatch = PATCH_ID;
}

export function registerChoiceResolutionFinalizationPatch() {
  registerFinalizerChoicePatch();
  registerFeatChoiceResolverPatch();
}

registerChoiceResolutionFinalizationPatch();

export default registerChoiceResolutionFinalizationPatch;
