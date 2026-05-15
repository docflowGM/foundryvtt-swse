const FEAT_TYPE_KEYS = new Set([
  'recommended',
  'combat',
  'weapon_armor',
  'force',
  'skill',
  'species',
  'droid_cybernetic',
  'faction',
  'destiny_story',
  'team',
  'general',
  'uncategorized',
]);

export const FEAT_TYPE_LABELS = {
  recommended: 'Recommended',
  combat: 'Combat',
  weapon_armor: 'Weapon & Armor Proficiency',
  force: 'Force',
  skill: 'Skill',
  species: 'Racial / Heritage',
  droid_cybernetic: 'Droid / Cybernetics',
  faction: 'Faction / Military / Organization',
  destiny_story: 'Destiny / Story / GM Approval',
  team: 'Team',
  general: 'General',
  uncategorized: 'Uncategorized / Needs Data Cleanup',
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
  const raw = String(rawValue ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
  const aliases = {
    martial_arts: 'combat',
    martialarts: 'combat',
    weapon: 'weapon_armor',
    armor: 'weapon_armor',
    weapon_armor_proficiency: 'weapon_armor',
    weapon_and_armor_proficiency: 'weapon_armor',
    racial: 'species',
    heritage: 'species',
    race: 'species',
    droid: 'droid_cybernetic',
    cybernetic: 'droid_cybernetic',
    cybernetics: 'droid_cybernetic',
    organization: 'faction',
    organisation: 'faction',
    military: 'faction',
    destiny: 'destiny_story',
    story: 'destiny_story',
    gm: 'destiny_story',
  };
  const normalized = aliases[raw] || raw;
  if (FEAT_TYPE_KEYS.has(normalized)) return normalized;
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

function coercePrerequisiteText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (Array.isArray(value)) {
      const joined = value.map((entry) => String(entry ?? '').trim()).filter(Boolean).join('; ');
      if (joined) return joined;
    }
    if (value && typeof value === 'object' && typeof value.raw === 'string' && value.raw.trim()) {
      return value.raw.trim();
    }
  }
  return '';
}


function resolveFeatShortSummary(rawFeat, description = '') {
  const candidates = [
    rawFeat?.shortSummary,
    rawFeat?.summary,
    rawFeat?.system?.shortSummary,
    rawFeat?.system?.summary,
    rawFeat?.system?.benefit,
    description,
    rawFeat?.system?.description?.value,
  ];

  for (const candidate of candidates) {
    const cleaned = stripHtmlToText(candidate).replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    const firstSentence = cleaned.match(/^.+?(?:[.!?](?=\s|$)|$)/)?.[0]?.trim() || cleaned;
    if (firstSentence) return firstSentence.length > 170 ? `${firstSentence.slice(0, 167).trim()}...` : firstSentence;
  }

  return '';
}

export function resolveFeatPrerequisites(rawFeat) {
  const prerequisiteText = coercePrerequisiteText(
    rawFeat?.prerequisiteText,
    rawFeat?.prerequisiteLine,
    rawFeat?.system?.prerequisite,
    rawFeat?.system?.prerequisites,
  );

  return {
    prerequisiteText,
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


function lowerList(values) {
  return (Array.isArray(values) ? values : [])
    .map(value => String(value || '').toLowerCase().trim())
    .filter(Boolean);
}

function hasAny(values, ...needles) {
  const set = new Set(lowerList(values));
  return needles.some(needle => set.has(String(needle).toLowerCase()));
}

function textContains(text, pattern) {
  return pattern.test(String(text || '').toLowerCase());
}

function resolvePrimaryBrowseCategory(rawFeat, mappingEntry) {
  const rawExplicit = normalizeFeatTypeKey(rawFeat?.system?.featType ?? rawFeat?.category ?? rawFeat?.system?.category);
  const mappedExplicit = normalizeFeatTypeKey(mappingEntry?.featType);
  const metadataCategory = String(mappingEntry?.metadataCategory || '').toLowerCase().trim();
  const metadataTags = lowerList(mappingEntry?.metadataTags);
  const packTags = lowerList(mappingEntry?.packTags);
  const broadTags = lowerList(mappingEntry?.uiBroadTags);

  const nameText = String(rawFeat?.name || '').toLowerCase();
  const prereqText = [rawFeat?.system?.prerequisite, rawFeat?.system?.prerequisites, rawFeat?.prerequisiteText, mappingEntry?.prerequisite]
    .flat()
    .map(value => String(value || '').toLowerCase())
    .join(' ');
  const metadataText = [metadataCategory, ...metadataTags, ...packTags.filter(tag => tag !== 'non-force'), ...broadTags]
    .join(' ')
    .toLowerCase();
  const allText = `${nameText} ${prereqText} ${metadataText}`;

  // Strong explicit categories win first. Most legacy feat pack rows say "general",
  // so only non-general explicit values should short-circuit the metadata rules.
  if (rawExplicit !== 'general' && rawExplicit !== 'uncategorized') return rawExplicit;
  if (mappedExplicit !== 'general' && mappedExplicit !== 'uncategorized') return mappedExplicit;

  // Important: pack tags often include "non-force". Do NOT let that match Force.
  const positiveForceTag = hasAny(metadataTags, 'force') || hasAny(packTags, 'force') || metadataCategory === 'force';
  const forceNameOrPrereq = /(^|\b)force\s+(sensitivity|training|boon|point|power|regimen|readiness|secret|technique|stun|slam|grip|blast|thrust|whirlwind|lightning|haze|shield|pilot|perception|recovery|tradition|adept|disciple|flow|fortification|harmony|intuition|meld|mind|treatment|weapon|warrior)\b/.test(`${nameText} ${prereqText}`)
    || /\bstrong in the force\b|\buse the force\b.*\bforce sensitivity\b|\bforce sensitivity\b/.test(`${nameText} ${prereqText}`);
  if (positiveForceTag || forceNameOrPrereq) return 'force';

  if (hasAny(broadTags, 'species', 'racial', 'heritage')
    || /\b(species|racial|heritage|gamorrean|nelvaanian|near[-\s]?human|wookiee|ithorian|gungan|ewok|trandoshan|zabrak|bothan|quarren|mon calamari|jawa|noghri|yuuzhan vong)\b/.test(allText)) {
    return 'species';
  }

  if (/\b(droid|cyborg|cybernetic|appendage|locomotion|processor|implant|claw appendage|hand appendage)\b/.test(allText)) {
    return 'droid_cybernetic';
  }

  if (/\b(destiny|gamemaster|game master|gm approval|story)\b/.test(allText)) {
    return 'destiny_story';
  }

  if (/\b(military|republic|imperial|separatist|galactic alliance|officer|organization|organisation|faction|mandalorian|sith military|jedi academy|order)\b/.test(allText)) {
    return 'faction';
  }

  // Weapon/armor proficiency is a first-class browse group. Do this before broad combat.
  if (/\b(weapon proficiency|armor proficiency|armour proficiency|advanced melee weapon proficiency|heavy weapon proficiency|exotic weapon proficiency|rifle proficiency|pistol proficiency|simple weapon proficiency|proficient with)\b/.test(allText)) {
    return 'weapon_armor';
  }

  if (hasAny(broadTags, 'skill')
    || metadataCategory.startsWith('skill')
    || /\b(skill focus|skill training|trained in|acrobatics|deception|endurance|gather information|initiative|jump|knowledge|mechanics|perception|persuasion|pilot|ride|stealth|survival|swim|treat injury|use computer|use the force)\b/.test(allText)) {
    return 'skill';
  }

  if (hasAny(broadTags, 'combat')
    || metadataCategory.startsWith('combat')
    || /\b(attack|defense|defence|dodge|mobility|cleave|charge|grapple|melee|ranged|autofire|martial|aim|damage|critical|fighting|shot|strike|draw|weapon focus|weapon specialization|devastating|rapid|point blank|power attack|running attack)\b/.test(allText)) {
    return 'combat';
  }

  if (rawExplicit === 'team' || mappedExplicit === 'team') return 'team';
  return rawExplicit === 'uncategorized' || mappedExplicit === 'uncategorized' ? 'uncategorized' : 'general';
}

function resolveFeatSubcategory(rawFeat, mappingEntry, primaryCategory) {
  const skillTags = Array.isArray(mappingEntry?.uiSkillTags) ? mappingEntry.uiSkillTags.filter(Boolean) : [];
  if (primaryCategory === 'skill' && skillTags.length) return skillTags[0];
  const metadataCategory = String(mappingEntry?.metadataCategory || '').trim();
  if (metadataCategory) {
    return metadataCategory
      .replace(/^combat[-_\s]*/i, '')
      .replace(/^skill[-_\s]*/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  const broadTags = Array.isArray(mappingEntry?.uiBroadTags) ? mappingEntry.uiBroadTags.filter(Boolean) : [];
  const fallback = broadTags.find(tag => normalizeFeatTypeKey(tag) !== primaryCategory);
  return fallback || '';
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
  const mappingEntry = resolveMappingEntry(rawFeat, mapping);
  const featType = resolvePrimaryBrowseCategory(rawFeat, mappingEntry);
  const subcategory = resolveFeatSubcategory(rawFeat, mappingEntry, featType);
  const description = resolveFeatDescription(rawFeat);
  const shortSummary = resolveFeatShortSummary(rawFeat, description);
  const { prerequisiteText, prerequisitesStructured } = resolveFeatPrerequisites(rawFeat);
  const uiBroadTags = Array.isArray(mappingEntry?.uiBroadTags) ? mappingEntry.uiBroadTags.slice() : resolveFeatUiBroadTags(rawFeat, mapping);
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
    subcategory,
    description,
    shortSummary,
    benefit: typeof rawFeat?.system?.benefit === 'string' ? rawFeat.system.benefit : '',
    prerequisiteText,
    prerequisitesStructured,
    prerequisiteLine: prerequisiteText,
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
