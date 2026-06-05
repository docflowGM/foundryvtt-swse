const ATHLETICS_COMPONENT_KEYS = ['acrobatics', 'climb', 'jump', 'swim'];
const ATHLETICS_COMPONENT_NAMES = ['Acrobatics', 'Climb', 'Jump', 'Swim'];

/**
 * Returns true when the Athletics Consolidation house rule is active.
 * Cached per call to avoid repeated setting reads in tight loops.
 */
function athleticsConsolidationActive() {
  try { return game.settings.get('foundryvtt-swse', 'athleticsConsolidation') === true; }
  catch { return false; }
}

const CANONICAL_SKILL_DEFS = {
  acrobatics: { label: 'Acrobatics', defaultAbility: 'dex', untrained: true, armorPenalty: true },
  climb: { label: 'Climb', defaultAbility: 'str', untrained: true, armorPenalty: true },
  deception: { label: 'Deception', defaultAbility: 'cha', untrained: true, armorPenalty: false },
  endurance: { label: 'Endurance', defaultAbility: 'con', untrained: true, armorPenalty: true },
  gatherInformation: { label: 'Gather Information', defaultAbility: 'cha', untrained: true, armorPenalty: false },
  initiative: { label: 'Initiative', defaultAbility: 'dex', untrained: true, armorPenalty: true },
  jump: { label: 'Jump', defaultAbility: 'str', untrained: true, armorPenalty: true },
  knowledgeBureaucracy: { label: 'Knowledge (Bureaucracy)', defaultAbility: 'int', untrained: false, armorPenalty: false },
  knowledgeGalacticLore: { label: 'Knowledge (Galactic Lore)', defaultAbility: 'int', untrained: false, armorPenalty: false },
  knowledgeLifeSciences: { label: 'Knowledge (Life Sciences)', defaultAbility: 'int', untrained: false, armorPenalty: false },
  knowledgePhysicalSciences: { label: 'Knowledge (Physical Sciences)', defaultAbility: 'int', untrained: false, armorPenalty: false },
  knowledgeSocialSciences: { label: 'Knowledge (Social Sciences)', defaultAbility: 'int', untrained: false, armorPenalty: false },
  knowledgeTactics: { label: 'Knowledge (Tactics)', defaultAbility: 'int', untrained: false, armorPenalty: false },
  knowledgeTechnology: { label: 'Knowledge (Technology)', defaultAbility: 'int', untrained: false, armorPenalty: false },
  mechanics: { label: 'Mechanics', defaultAbility: 'int', untrained: true, armorPenalty: false },
  perception: { label: 'Perception', defaultAbility: 'wis', untrained: true, armorPenalty: false },
  persuasion: { label: 'Persuasion', defaultAbility: 'cha', untrained: true, armorPenalty: false },
  pilot: { label: 'Pilot', defaultAbility: 'dex', untrained: true, armorPenalty: false },
  ride: { label: 'Ride', defaultAbility: 'dex', untrained: true, armorPenalty: false },
  stealth: { label: 'Stealth', defaultAbility: 'dex', untrained: true, armorPenalty: true },
  survival: { label: 'Survival', defaultAbility: 'wis', untrained: true, armorPenalty: false },
  swim: { label: 'Swim', defaultAbility: 'str', untrained: true, armorPenalty: true },
  treatInjury: { label: 'Treat Injury', defaultAbility: 'wis', untrained: true, armorPenalty: false },
  useComputer: { label: 'Use Computer', defaultAbility: 'int', untrained: true, armorPenalty: false },
  useTheForce: { label: 'Use the Force', defaultAbility: 'cha', untrained: true, armorPenalty: false },
  // Athletics: consolidated skill (house rule). Always present so feat prereq data
  // that already references "Athletics" or "athletics" resolves correctly at all times.
  athletics: { label: 'Athletics', defaultAbility: 'dex', untrained: true, armorPenalty: true, _consolidated: true }
};

const SKILL_KEY_ALIASES = {
  'Acrobatics': 'acrobatics',
  'Climb': 'climb',
  'Deception': 'deception',
  'Endurance': 'endurance',
  'Gather Information': 'gatherInformation',
  gatherInfo: 'gatherInformation',
  gatherInformation: 'gatherInformation',
  'Initiative': 'initiative',
  'Jump': 'jump',
  'Knowledge (Bureaucracy)': 'knowledgeBureaucracy',
  'Knowledge Bureaucracy': 'knowledgeBureaucracy',
  knowledgeBureaucracy: 'knowledgeBureaucracy',
  'Knowledge (Galactic Lore)': 'knowledgeGalacticLore',
  'Knowledge Galactic Lore': 'knowledgeGalacticLore',
  knowledgeGalacticLore: 'knowledgeGalacticLore',
  'Knowledge (Life Sciences)': 'knowledgeLifeSciences',
  'Knowledge Life Sciences': 'knowledgeLifeSciences',
  knowledgeLifeSciences: 'knowledgeLifeSciences',
  'Knowledge (Physical Sciences)': 'knowledgePhysicalSciences',
  'Knowledge Physical Sciences': 'knowledgePhysicalSciences',
  knowledgePhysicalSciences: 'knowledgePhysicalSciences',
  'Knowledge (Social Sciences)': 'knowledgeSocialSciences',
  'Knowledge Social Sciences': 'knowledgeSocialSciences',
  knowledgeSocialSciences: 'knowledgeSocialSciences',
  'Knowledge (Tactics)': 'knowledgeTactics',
  'Knowledge Tactics': 'knowledgeTactics',
  knowledgeTactics: 'knowledgeTactics',
  'Knowledge (Technology)': 'knowledgeTechnology',
  'Knowledge Technology': 'knowledgeTechnology',
  knowledgeTechnology: 'knowledgeTechnology',
  'Mechanics': 'mechanics',
  'Perception': 'perception',
  'Persuasion': 'persuasion',
  'Pilot': 'pilot',
  pilot: 'pilot',
  'Piloting': 'pilot',
  piloting: 'pilot',
  'Ride': 'ride',
  'Stealth': 'stealth',
  'Survival': 'survival',
  'Swim': 'swim',
  'Treat Injury': 'treatInjury',
  treatInjury: 'treatInjury',
  'Use Computer': 'useComputer',
  useComputer: 'useComputer',
  'Use the Force': 'useTheForce',
  useTheForce: 'useTheForce',
  // Athletics consolidated skill aliases
  'Athletics': 'athletics',
  athletics: 'athletics'
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
