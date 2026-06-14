// scripts/utils/item-classification.js
// Small semantic item classifiers for sheet display.  These are intentionally
// display-facing helpers only: they do not mutate items and they do not decide
// game legality.  They let the v2 sheet show legacy/progression items that were
// materialized with older item types but still carry canonical execution data.

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function includesAny(value, needles = []) {
  const text = normalizeText(value);
  return needles.some((needle) => text.includes(normalizeText(needle)));
}

function allItemText(item) {
  const system = item?.system ?? {};
  const flags = item?.flags?.swse ?? {};
  const progression = flags.progression ?? {};
  const tags = [
    ...(Array.isArray(system.tags) ? system.tags : []),
    ...(Array.isArray(system.metadata?.tags) ? system.metadata.tags : []),
    ...(Array.isArray(system.abilityMeta?.tags) ? system.abilityMeta.tags : []),
    system.category,
    system.featType,
    system.talentTree,
    system.tree,
    system.subType,
    system.sourceType,
    system.executionModel,
    system.abilityMeta?.executionModel,
    system.progressionType,
    system.grantType,
    system.type,
    progression.selectionKey,
    progression.sourceType,
    flags.sourceType,
    flags.progressionType
  ].filter(Boolean).join(' ');
  return `${item?.type ?? ''} ${item?.name ?? ''} ${tags}`;
}

export function isForcePowerItem(item) {
  if (!item) return false;

  const type = normalizeText(item.type).replace(/\s+/g, '');
  const name = normalizeText(item.name);
  const system = item.system ?? {};
  const executionModel = String(system.executionModel ?? system.abilityMeta?.executionModel ?? '').toUpperCase();

  // Force Training, Force Sensitivity, and other Force-tagged feats are unlocks,
  // not Force Powers.  The Force Suite hand should only contain executable
  // Force Power entries, otherwise feats can appear as usable power cards and
  // consume the visual power count.
  if (name === 'force training' || name === 'force sensitivity') return false;

  if (type === 'forcepower' || type === 'force-power') return true;
  if (executionModel === 'FORCE_POWER') return true;
  if (system.forcePower === true || system.isForcePower === true) return true;

  // Older imports sometimes used loose tags instead of a dedicated type, but
  // feat/ability/class/talent documents with Force-related text must not be
  // promoted into the Force Suite merely because their rules mention powers.
  if (['feat', 'ability', 'class', 'talent'].includes(type)) return false;

  const text = allItemText(item);
  return includesAny(text, ['force power']) && !includesAny(text, ['force training', 'force sensitivity']);
}

export function isClassFeatureItem(item) {
  if (!item || isForcePowerItem(item)) return false;
  const type = normalizeText(item.type).replace(/\s+/g, '');
  const system = item.system ?? {};
  const flags = item.flags?.swse ?? {};
  const progression = flags.progression ?? {};

  // Classes themselves are source records, not granted class features.
  // Talents remain in the talent ledger even if their rules text references a
  // class feature. This ledger is specifically for non-feat, non-talent class
  // features that legacy/progression code often materializes as feat items.
  if (type === 'class' || type === 'talent') return false;

  const directFeatureType = normalizeText(
    system.type
    ?? system.featureType
    ?? system.sourceType
    ?? system.grantType
    ?? flags.sourceType
    ?? progression.sourceType
    ?? progression.selectionKey
  );

  if (system.classFeature === true || system.isClassFeature === true) return true;
  if (flags.classFeature === true || flags.classGranted === true) return true;
  if (system.grantedByClass === true && system.autoGranted === true) return true;
  if (system.sourceType === 'class-feature' || system.sourceType === 'class_feature') return true;
  if (flags.sourceType === 'class-feature' || flags.sourceType === 'class_feature') return true;
  if (includesAny(directFeatureType, [
    'class feature',
    'class automatic feature',
    'scaling feature',
    'class grant'
  ])) return true;

  return false;
}

export function isFeatLikeItem(item) {
  if (!item || isForcePowerItem(item) || isClassFeatureItem(item)) return false;
  const type = normalizeText(item.type).replace(/\s+/g, '');
  const system = item.system ?? {};
  const progressionKey = normalizeText(item.flags?.swse?.progression?.selectionKey);
  const text = allItemText(item);

  if (type === 'feat') return true;
  if (system.featType || system.category === 'feat' || system.sourceType === 'feat') return true;
  if (system.progressionType === 'feat' || system.grantType === 'feat') return true;
  if (progressionKey.includes('feat') || progressionKey.includes('class auto grants')) return true;
  if (includesAny(text, [' selected feats ', ' class auto grants ', ' general feat ', ' class feat '])) return true;

  if (system.executionModel === 'UNLOCK' || system.abilityMeta?.executionModel === 'UNLOCK' || type === 'ability') {
    return includesAny(text, [
      'weapon proficiency',
      'armor proficiency',
      'force sensitivity',
      'force training',
      'skill focus',
      'linguist',
      'proficiency'
    ]);
  }

  return false;
}

export function isTalentLikeItem(item) {
  if (!item || isForcePowerItem(item) || isFeatLikeItem(item)) return false;
  const type = normalizeText(item.type).replace(/\s+/g, '');
  const system = item.system ?? {};
  const progressionKey = normalizeText(item.flags?.swse?.progression?.selectionKey);
  const text = allItemText(item);

  if (type === 'talent') return true;
  if (system.talentTree || system.tree || system.sourceType === 'talent') return true;
  if (system.progressionType === 'talent' || system.grantType === 'talent') return true;
  if (progressionKey.includes('talent')) return true;
  if (includesAny(text, [' selected talents ', ' heroic talent ', ' class talent ', ' talent tree '])) return true;
  return false;
}

export function isPlaceholderSheetItem(item, expectedType = '') {
  if (!item) return true;
  const name = normalizeText(item.name);
  const description = normalizeText(item.system?.description ?? item.system?.description?.value ?? '');
  const expected = normalizeText(expectedType);
  return !!expected && name === `new ${expected}` && !description;
}
