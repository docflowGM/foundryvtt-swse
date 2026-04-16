const FEAT_TYPE_KEYS = new Set([
  'general',
  'force',
  'species',
  'team',
  'martial_arts'
]);

export const FEAT_TYPE_LABELS = {
  general: 'General',
  force: 'Force',
  species: 'Species',
  team: 'Team',
  martial_arts: 'Martial Arts',
};

let _mappingCache = null;

function stripHtmlToText(value) {
  const raw = String(value ?? '');
  if (!raw) return '';
  return raw
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map(line => line.trim()).join('\n').trim();
}

export function normalizeFeatTypeKey(rawValue) {
  const raw = String(rawValue ?? '').trim().toLowerCase();
  if (FEAT_TYPE_KEYS.has(raw)) return raw;
  return 'general';
}

export function getFeatTypeLabel(featType) {
  return FEAT_TYPE_LABELS[normalizeFeatTypeKey(featType)] || 'General';
}

export function resolveFeatDescription(rawFeat) {
  const description = rawFeat?.system?.description;
  if (description && typeof description === 'object' && typeof description.value === 'string' && description.value.trim()) {
    return stripHtmlToText(description.value);
  }
  if (typeof description === 'string' && description.trim()) {
    return stripHtmlToText(description);
  }
  const benefit = rawFeat?.system?.benefit;
  if (typeof benefit === 'string' && benefit.trim()) {
    return stripHtmlToText(benefit);
  }
  return '';
}

export function resolveFeatPrerequisites(rawFeat) {
  return {
    prerequisiteText: typeof rawFeat?.system?.prerequisite === 'string'
      ? rawFeat.system.prerequisite.trim()
      : '',
    prerequisitesStructured: rawFeat?.system?.prerequisitesStructured ?? null,
  };
}

function normalizeFeatNameKey(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function resolveMappingEntry(rawFeat, mapping) {
  const perFeat = mapping?.perFeat || {};
  if (!rawFeat?.name) return null;
  const exact = perFeat[rawFeat.name];
  if (exact) return exact;

  const normalizedName = normalizeFeatNameKey(rawFeat.name);
  if (!normalizedName) return null;

  for (const [key, value] of Object.entries(perFeat)) {
    if (normalizeFeatNameKey(key) === normalizedName) {
      return value;
    }
  }
  return null;
}

export function resolveFeatUiBroadTags(rawFeat, mapping) {
  const entry = resolveMappingEntry(rawFeat, mapping);
  return Array.isArray(entry?.uiBroadTags) ? entry.uiBroadTags.slice() : [];
}

export function resolveFeatBonusFeatFor(rawFeat) {
  const raw = rawFeat?.system?.bonus_feat_for;
  if (Array.isArray(raw)) {
    return raw.map(value => String(value).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return [raw.trim()];
  }
  return [];
}

export function normalizeFeatRuntime(rawFeat, { mapping = null } = {}) {
  if (!rawFeat) return rawFeat;

  const id = rawFeat.id || rawFeat._id || rawFeat.uuid || rawFeat.name;
  const featType = normalizeFeatTypeKey(rawFeat?.system?.featType ?? rawFeat?.category ?? rawFeat?.system?.category);
  const description = resolveFeatDescription(rawFeat);
  const { prerequisiteText, prerequisitesStructured } = resolveFeatPrerequisites(rawFeat);
  const uiBroadTags = resolveFeatUiBroadTags(rawFeat, mapping);
  const tags = Array.isArray(rawFeat?.system?.tags) ? rawFeat.system.tags.slice() : [];

  return {
    ...rawFeat,
    id,
    _id: id,
    sourceId: rawFeat?.sourceId ?? rawFeat?.flags?.core?.sourceId ?? rawFeat?.flags?.cf?.sourceId ?? null,
    name: rawFeat?.name ?? '',
    img: rawFeat?.img ?? 'icons/svg/upgrade.svg',
    featType,
    featTypeLabel: getFeatTypeLabel(featType),
    description,
    benefit: typeof rawFeat?.system?.benefit === 'string' ? rawFeat.system.benefit : '',
    prerequisiteText,
    prerequisitesStructured,
    special: typeof rawFeat?.system?.special === 'string' ? rawFeat.system.special : '',
    normalText: typeof rawFeat?.system?.normalText === 'string' ? rawFeat.system.normalText : '',
    tags,
    uiBroadTags,
    sourcebook: rawFeat?.system?.sourcebook ?? '',
    page: rawFeat?.system?.page ?? '',
    bonusFeatFor: resolveFeatBonusFeatFor(rawFeat),
  };
}

export async function loadFeatBucketsMapping() {
  if (_mappingCache) return _mappingCache;

  try {
    const response = await fetch('systems/foundryvtt-swse/data/feat-buckets-and-subbuckets.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    _mappingCache = await response.json();
  } catch (error) {
    console.warn('[FeatShape] Failed to load feat bucket mapping:', error);
    _mappingCache = { perFeat: {}, intent: { addsUiSubBuckets: [] } };
  }

  return _mappingCache;
}
