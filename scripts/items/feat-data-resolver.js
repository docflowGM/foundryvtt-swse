/**
 * Canonical presentation resolver for feat item sheets.
 *
 * This does not migrate feat storage. It reads the repo's current feat fields
 * and exposes one stable view model for the entity dialog body.
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

function normalizeFeatType(value) {
  const normalized = String(value || 'general').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases = {
    class_feature: 'class_feature',
    class: 'class_feature',
    species: 'species',
    racial: 'species',
    team: 'team',
    teamwork: 'team',
    force: 'force',
    destiny: 'destiny',
    general: 'general',
    combat: 'combat',
    bonus: 'bonus',
    skill: 'skill'
  };
  return aliases[normalized] || normalized || 'general';
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
    repeatable: choiceMeta.repeatable === true || system?.repeatable === true || /may be selected multiple times/i.test(asText(system?.special)),
    kind: asText(choiceMeta.choiceKind || system?.choiceKind || system?.choiceType || '', ''),
    label: asText(choiceMeta.label || system?.choiceLabel || 'Choice', 'Choice'),
    selected: typeof selectedChoice === 'object' ? JSON.stringify(selectedChoice) : asText(selectedChoice, ''),
    storagePath: asText(choiceMeta.storagePath || system?.choiceStoragePath || '', ''),
    optionRegistry: asText(choiceMeta.optionRegistry || '', '')
  };
}

export function resolveFeatData(itemOrData = {}) {
  const item = itemOrData?.system ? itemOrData : { system: itemOrData ?? {} };
  const system = clone(item?.system ?? {});
  const featType = normalizeFeatType(system.featType || system.category || system.subType || 'general');
  const tags = asArray(system.tags);
  const benefit = asText(system.benefit || system.effect || system.rawImport?.effect || system.description, '');
  const prerequisites = asText(system.prerequisite || system.prerequisites || system.prerequisitesText || system.rawImport?.prerequisitesText, '');
  const description = asText(system.description || system.description?.value, '');
  const shortSummary = asText(system.shortSummary || system.summary || system.indexBenefit || '', '');
  const executionModel = asText(system.executionModel || system.abilityMeta?.executionModel || 'PASSIVE', 'PASSIVE').toUpperCase();
  const subType = asText(system.subType || system.abilityMeta?.subType || '', '');
  const mechanicsMode = asText(system.abilityMeta?.mechanicsMode || system.mechanicsMode || '', '');
  const applicationScope = asText(system.abilityMeta?.applicationScope || system.applicationScope || '', '');
  const conditionSummary = asText(system.abilityMeta?.conditionSummary || system.abilityMeta?.description || '', '');
  const referenceBooks = asArray(system.referenceBooks || system.rawImport?.referenceBooks || system.rawImport?.indexReferenceBooks);
  const bonusFeatFor = asArray(system.bonusFeatFor || system.bonus_feat_for || system.bonusFeatClasses);
  const choice = getChoiceMeta(system);
  const structuredPrereqs = system.prereqClauses || system.prerequisitesStructured || system.structuredPrerequisites || null;

  return {
    featType,
    featTypeLabel: labelize(featType),
    featTypeOptions: [
      { value: 'general', label: 'General' },
      { value: 'combat', label: 'Combat' },
      { value: 'force', label: 'Force' },
      { value: 'species', label: 'Species' },
      { value: 'team', label: 'Team' },
      { value: 'destiny', label: 'Destiny' },
      { value: 'class_feature', label: 'Class Feature' },
      { value: 'bonus', label: 'Bonus' },
      { value: 'skill', label: 'Skill' }
    ],
    sourcebook: asText(system.sourcebook || system.source || referenceBooks[0] || 'Manual', 'Manual'),
    page: toNumber(system.page, 0),
    sourceUrl: asText(system.sourceUrl || system.rawImport?.url || '', ''),
    tags,
    tagsText: tags.join(', '),
    prerequisites,
    structuredPrereqs,
    structuredPrereqCount: Array.isArray(structuredPrereqs) ? structuredPrereqs.length : (Array.isArray(structuredPrereqs?.conditions) ? structuredPrereqs.conditions.length : 0),
    benefit,
    effect: asText(system.effect || benefit, ''),
    normalText: asText(system.normalText || system.normal || '', ''),
    special: asText(system.special, ''),
    description,
    shortSummary,
    executionModel,
    subType,
    mechanicsMode,
    applicationScope,
    conditionSummary,
    choice,
    choiceRequired: choice.required,
    repeatable: choice.repeatable,
    bonusFeatFor,
    bonusFeatForText: bonusFeatFor.join(', '),
    usesCurrent: toNumber(system.uses?.current, 0),
    usesMax: toNumber(system.uses?.max, 0),
    usesPerDay: system.uses?.perDay === true,
    effectCount: Array.isArray(item?.effects) ? item.effects.length : 0
  };
}
