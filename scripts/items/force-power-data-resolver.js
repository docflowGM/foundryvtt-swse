/**
 * Canonical presentation resolver for Force Power item sheets.
 * Uses the current force-power item schema and pack metadata.
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

function normalizeAction(value) {
  const text = String(value || '').trim().toLowerCase();
  if (/full/.test(text)) return 'full';
  if (/reaction/.test(text)) return 'reaction';
  if (/swift/.test(text)) return 'swift';
  if (/move/.test(text)) return 'move';
  if (/free/.test(text)) return 'free';
  if (/minute/.test(text)) return 'minute';
  if (/hour/.test(text)) return 'hour';
  if (/standard/.test(text)) return 'standard';
  return text || 'standard';
}

export function getForceDescriptorAccent(descriptors = [], discipline = '', tags = []) {
  const haystack = [...asArray(descriptors), discipline, ...asArray(tags)].join(' ').toLowerCase();
  if (/dark|sith|lightning|fear|rage/.test(haystack)) return 'dark';
  if (/light\s*side|healing|vital transfer|serenity/.test(haystack)) return 'light';
  if (/telekin|move object|phase|grip|push|slam/.test(haystack)) return 'telekinetic';
  if (/mind|telepath|affect|illusion|scry|farseeing/.test(haystack)) return 'mind';
  if (/vital|healing|control|plant/.test(haystack)) return 'vital';
  return 'neutral';
}

function descriptorText(descriptor, discipline) {
  const list = asArray(descriptor);
  if (list.length) return list.join(', ');
  return asText(discipline || 'General', 'General');
}

export function resolveForcePowerData(itemOrData = {}) {
  const item = itemOrData?.system ? itemOrData : { system: itemOrData ?? {} };
  const system = clone(item?.system ?? {});
  const descriptor = asArray(system.descriptor);
  const tags = asArray(system.tags);
  const dcChart = Array.isArray(system.dcChart) ? system.dcChart.map((tier, index) => ({
    index,
    dc: toNumber(tier?.dc, 0),
    effect: asText(tier?.effect, ''),
    description: asText(tier?.description, '')
  })) : [];
  const discipline = asText(system.discipline || descriptor[0] || 'general', 'general');
  const accent = getForceDescriptorAccent(descriptor, discipline, tags);
  const time = asText(system.time || system.action || 'Standard Action', 'Standard Action');

  return {
    discipline,
    descriptor,
    descriptorText: descriptorText(descriptor, discipline),
    descriptorInput: descriptorText(descriptor, ''),
    accent,
    accentClass: `swse-entity-dialog--force-${accent}`,
    powerLevel: toNumber(system.powerLevel ?? system.level, 1),
    useTheForce: toNumber(system.useTheForce, 15),
    time,
    actionKey: normalizeAction(time),
    range: asText(system.range, ''),
    target: asText(system.target, ''),
    duration: asText(system.duration, ''),
    effect: asText(system.effect || system.description?.value, ''),
    special: asText(system.special, ''),
    sourcebook: asText(system.sourcebook || system.source || 'Manual', 'Manual'),
    page: toNumber(system.page, 0),
    sourceUrl: asText(system.sourceUrl || '', ''),
    tags,
    tagsText: tags.join(', '),
    dcChart,
    dcTierCount: dcChart.length,
    maintainable: system.maintainable === true,
    inSuite: system.inSuite === true,
    spent: system.spent === true,
    discarded: system.discarded === true,
    usesCurrent: toNumber(system.uses?.current, 0),
    usesMax: toNumber(system.uses?.max, 0),
    costNumeric: system.costNumeric == null ? '' : toNumber(system.costNumeric, 0),
    executionModel: asText(system.executionModel || 'FORCE_POWER', 'FORCE_POWER'),
    technique: system.technique && typeof system.technique === 'object' ? clone(system.technique) : null,
    effectCount: Array.isArray(item?.effects) ? item.effects.length : 0
  };
}
