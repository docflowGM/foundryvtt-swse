const CANONICAL_SKILL_DEFS = {
  acrobatics: { defaultAbility: 'dex' },
  animalHandling: { defaultAbility: 'cha' },
  athleticism: { defaultAbility: 'str' },
  awareness: { defaultAbility: 'wis' },
  climb: { defaultAbility: 'str' },
  concentration: { defaultAbility: 'con' },
  deception: { defaultAbility: 'cha' },
  endurance: { defaultAbility: 'con' },
  gatherInformation: { defaultAbility: 'cha' },
  initiative: { defaultAbility: 'dex' },
  insight: { defaultAbility: 'wis' },
  intimidate: { defaultAbility: 'cha' },
  jump: { defaultAbility: 'str' },
  knowledge: { defaultAbility: 'int' },
  mechanics: { defaultAbility: 'int' },
  medicine: { defaultAbility: 'wis' },
  perception: { defaultAbility: 'wis' },
  persuasion: { defaultAbility: 'cha' },
  pilot: { defaultAbility: 'dex' },
  piloting: { defaultAbility: 'dex' },
  ride: { defaultAbility: 'dex' },
  stealth: { defaultAbility: 'dex' },
  survival: { defaultAbility: 'wis' },
  swim: { defaultAbility: 'str' },
  treatInjury: { defaultAbility: 'wis' },
  useComputer: { defaultAbility: 'int' },
  useTheForce: { defaultAbility: 'cha' }
};

const SKILL_KEY_ALIASES = {
  'Acrobatics': 'acrobatics',
  'Animal Handling': 'animalHandling',
  'Athleticism': 'athleticism',
  'Awareness': 'awareness',
  'Climb': 'climb',
  'Concentration': 'concentration',
  'Deception': 'deception',
  'Endurance': 'endurance',
  'Gather Information': 'gatherInformation',
  gatherInfo: 'gatherInformation',
  gatherInformation: 'gatherInformation',
  'Initiative': 'initiative',
  'Insight': 'insight',
  'Intimidate': 'intimidate',
  'Jump': 'jump',
  'Knowledge': 'knowledge',
  'Mechanics': 'mechanics',
  'Medicine': 'medicine',
  'Perception': 'perception',
  'Persuasion': 'persuasion',
  'Pilot': 'pilot',
  pilot: 'pilot',
  'Piloting': 'piloting',
  piloting: 'piloting',
  'Ride': 'ride',
  'Stealth': 'stealth',
  'Survival': 'survival',
  'Swim': 'swim',
  'Treat Injury': 'treatInjury',
  treatInjury: 'treatInjury',
  'Use Computer': 'useComputer',
  useComputer: 'useComputer',
  'Use the Force': 'useTheForce',
  useTheForce: 'useTheForce'
};

function coerceBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function coerceNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function inferLegacyTotal(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function canonicalizeSkillKey(rawKey) {
  if (!rawKey) {
    return null;
  }

  if (SKILL_KEY_ALIASES[rawKey]) {
    return SKILL_KEY_ALIASES[rawKey];
  }

  const key = String(rawKey).trim();
  if (!key) {
    return null;
  }

  const knowledgeMatch = key.match(/^Knowledge\s*\((.+)\)$/i);
  if (knowledgeMatch) {
    const suffix = String(knowledgeMatch[1] || '')
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, ch) => ch.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
    return suffix ? `knowledge${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}` : 'knowledge';
  }

  const normalized = key
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, ch) => ch.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');

  return normalized ? normalized.charAt(0).toLowerCase() + normalized.slice(1) : null;
}

function normalizeSkillEntry(skillKey, rawValue) {
  const defaultAbility = CANONICAL_SKILL_DEFS[skillKey]?.defaultAbility || '';
  const base = {
    trained: false,
    focused: false,
    miscMod: 0,
    selectedAbility: defaultAbility,
    total: 0
  };

  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    const legacyTotal = inferLegacyTotal(rawValue.legacyTotal ?? rawValue.total);
    return {
      ...base,
      ...rawValue,
      trained: coerceBoolean(rawValue.trained),
      focused: coerceBoolean(rawValue.focused),
      miscMod: coerceNumber(rawValue.miscMod, 0),
      selectedAbility: typeof rawValue.selectedAbility === 'string' && rawValue.selectedAbility.trim()
        ? rawValue.selectedAbility
        : (typeof rawValue.ability === 'string' && rawValue.ability.trim() ? rawValue.ability : defaultAbility),
      total: coerceNumber(rawValue.total, legacyTotal ?? 0),
      legacyTotal,
      legacyStaticTotal: rawValue.legacyStaticTotal === true
    };
  }

  const legacyTotal = inferLegacyTotal(rawValue);
  return {
    ...base,
    total: legacyTotal ?? 0,
    legacyTotal,
    legacyStaticTotal: legacyTotal !== null
  };
}

export function normalizeSkillMap(rawSkills, options = {}) {
  const includeDefaults = options.includeDefaults !== false;
  const normalized = {};
  const input = rawSkills && typeof rawSkills === 'object' ? rawSkills : {};

  for (const [rawKey, rawValue] of Object.entries(input)) {
    const skillKey = canonicalizeSkillKey(rawKey) || rawKey;
    normalized[skillKey] = normalizeSkillEntry(skillKey, rawValue);
  }

  if (includeDefaults) {
    for (const [skillKey, def] of Object.entries(CANONICAL_SKILL_DEFS)) {
      normalized[skillKey] ??= normalizeSkillEntry(skillKey, {
        selectedAbility: def.defaultAbility
      });
    }
  }

  return normalized;
}

export { CANONICAL_SKILL_DEFS };
