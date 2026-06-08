/**
 * Canonical presentation resolver for talent item sheets.
 * Reads current talent pack fields without migrating storage.
 */

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value ?? {});
  return JSON.parse(JSON.stringify(value ?? {}));
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter((entry) => entry !== null && entry !== undefined && String(entry).trim() !== '');
  if (typeof value === 'string') return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function asText(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'object') {
    if (typeof value.value === 'string') return value.value;
    if (typeof value.text === 'string') return value.text;
    return fallback;
  }
  return String(value);
}

function toNumber(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function labelize(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getChoiceMeta(system) {
  const choiceMeta = system?.choiceMeta && typeof system.choiceMeta === 'object' ? clone(system.choiceMeta) : {};
  const abilityMeta = system?.abilityMeta && typeof system.abilityMeta === 'object' ? system.abilityMeta : {};
  const selectedChoice = system?.selectedChoice ?? system?.selectedChoices ?? choiceMeta.selectedChoice ?? choiceMeta.choice ?? '';
  const required = choiceMeta.required === true
    || abilityMeta.requiresSelectedChoice === true
    || system?.requiresSelectedChoice === true
    || asArray(system?.tags).some((tag) => /choice_required|immediate_choice/.test(String(tag)));
  return {
    required,
    kind: asText(choiceMeta.choiceKind || system?.choiceKind || system?.choiceType || '', ''),
    label: asText(choiceMeta.label || system?.choiceLabel || 'Choice', 'Choice'),
    selected: typeof selectedChoice === 'object' ? JSON.stringify(selectedChoice) : asText(selectedChoice, ''),
    storagePath: asText(choiceMeta.storagePath || system?.choiceStoragePath || '', '')
  };
}

export function resolveTalentData(itemOrData = {}) {
  const item = itemOrData?.system ? itemOrData : { system: itemOrData ?? {} };
  const system = clone(item?.system ?? {});
  const tree = asText(system.tree || system.talentTree || system.talent_tree || system.category || 'General', 'General');
  const category = asText(system.category || system.class || '', '');
  const tags = asArray(system.tags);
  const prerequisites = asText(system.prerequisites || system.prerequisite || system.prerequisitesText || '', '');
  const benefit = asText(system.benefit || system.effect || system.description?.value, '');
  const executionModel = asText(system.executionModel || system.abilityMeta?.executionModel || 'PASSIVE', 'PASSIVE').toUpperCase();
  const subType = asText(system.subType || system.abilityMeta?.subType || '', '');
  const mechanicsMode = asText(system.abilityMeta?.mechanicsMode || system.mechanicsMode || '', '');
  const applicationScope = asText(system.abilityMeta?.applicationScope || system.applicationScope || '', '');
  const staticSheetPolicy = asText(system.abilityMeta?.staticSheetPolicy || '', '');
  const implementedBy = asText(system.abilityMeta?.implementedBy || '', '');
  const conditionSummary = asText(system.abilityMeta?.conditionSummary || system.abilityMeta?.description || system.abilityMeta?.notes || '', '');
  const choice = getChoiceMeta(system);
  const structuredPrereqs = system.prereqClauses || system.prerequisitesStructured || system.structuredPrerequisites || null;

  return {
    tree,
    treeLabel: labelize(tree),
    talentTree: tree,
    category,
    categoryLabel: labelize(category),
    classId: asText(system.class || '', ''),
    treeId: asText(system.treeId || '', ''),
    sourcebook: asText(system.sourcebook || system.source || 'Manual', 'Manual'),
    page: toNumber(system.page, 0),
    tags,
    tagsText: tags.join(', '),
    prerequisites,
    structuredPrereqs,
    structuredPrereqCount: Array.isArray(structuredPrereqs) ? structuredPrereqs.length : (Array.isArray(structuredPrereqs?.conditions) ? structuredPrereqs.conditions.length : 0),
    benefit,
    special: asText(system.special, ''),
    executionModel,
    subType,
    mechanicsMode,
    applicationScope,
    staticSheetPolicy,
    implementedBy,
    conditionSummary,
    choice,
    choiceRequired: choice.required,
    usesCurrent: toNumber(system.uses?.current, 0),
    usesMax: toNumber(system.uses?.max, 0),
    usesPerEncounter: system.uses?.perEncounter === true,
    usesPerDay: system.uses?.perDay === true,
    isCustom: system.isCustom !== false,
    effectCount: Array.isArray(item?.effects) ? item.effects.length : 0
  };
}
