/**
 * Stored-choice candidate lookup for scoped feats (V2 realignment 3G, finding F-PRG-002).
 * Moved verbatim from the runtime patch choice-resolution-finalization-patch.js, which wrapped FeatChoiceResolver and ProgressionFinalizer
 * methods at import time (and was only loaded via the Squad Actions macro menu). FeatChoiceResolver and ProgressionFinalizer now use these
 * directly. Pure leaf: no imports.
 */

export function firstScalar(value) {
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

export function choiceCandidates(itemOrFeat = {}) {
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

export function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== undefined && value !== null && String(value).trim() !== '';
}
