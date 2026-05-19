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
  const system = item.system ?? {};
  if (type === 'forcepower' || type === 'force-power') return true;
  if (system.executionModel === 'FORCE_POWER') return true;
  if (system.abilityMeta?.executionModel === 'FORCE_POWER') return true;
  if (system.forcePower === true || system.isForcePower === true) return true;
  return includesAny(allItemText(item), ['force power']);
}

export function isFeatLikeItem(item) {
  if (!item || isForcePowerItem(item)) return false;
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
