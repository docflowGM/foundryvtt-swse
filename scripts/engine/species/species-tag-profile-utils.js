import speciesTraitsData from "/systems/foundryvtt-swse/data/species-traits.json" with { type: "json" };

const ABILITY_ROLE_TAGS = {
  str: ['ability_str', 'offense_melee', 'melee', 'damage', 'grapple', 'athletics', 'jump', 'strength_synergy'],
  dex: ['ability_dex', 'offense_ranged', 'ranged', 'accuracy', 'initiative', 'mobility', 'reflex', 'reflex_defense', 'defense', 'pilot', 'stealth', 'dexterity_synergy', 'evasion'],
  con: ['ability_con', 'hp', 'survivability', 'fortitude', 'fortitude_defense', 'endurance', 'healing', 'combat_stamina'],
  int: ['ability_int', 'skill_training', 'languages', 'knowledge', 'tech', 'use_computer', 'mechanics', 'engineering', 'intelligence_synergy'],
  wis: ['ability_wis', 'perception', 'survival', 'tracking', 'will', 'will_defense', 'force_training', 'force_capacity', 'healing'],
  cha: ['ability_cha', 'social', 'leadership', 'persuasion', 'deception', 'force_power', 'force_execution', 'use_the_force']
};

const ABILITY_FORECAST = {
  str: {
    positive: 'Leans into melee offense, grappling, and raw physical pressure.',
    negative: 'You may want to shore this up later if you want a heavy melee path.'
  },
  dex: {
    positive: 'Leans into Reflex, ranged pressure, mobility, and stealth.',
    negative: 'You may want to mitigate this if you want defense, ranged play, or agility.'
  },
  con: {
    positive: 'Leans into hit points, Fortitude, and durability.',
    negative: 'You may want to mitigate this if you want better durability and staying power.'
  },
  int: {
    positive: 'Leans into trained skills, languages, and technical competence.',
    negative: 'You may want to mitigate this if you want a wider skill and knowledge profile.'
  },
  wis: {
    positive: 'Leans into Will, perception, survival, and Force training potential.',
    negative: 'You may want to mitigate this if you want awareness, Will, or Force breadth.'
  },
  cha: {
    positive: 'Leans into social presence, leadership, and Force power execution.',
    negative: 'You may want to mitigate this if you want social play or stronger Force execution.'
  }
};

const SKILL_TO_TAGS = {
  acrobatics: ['mobility', 'acrobatics', 'skirmisher'],
  climb: ['athletics', 'climb', 'mobility'],
  deception: ['social', 'deception'],
  endurance: ['endurance', 'survivability'],
  'gather information': ['social', 'gather_information', 'information_control'],
  initiative: ['initiative', 'mobility', 'tactical_awareness'],
  jump: ['athletics', 'jump', 'mobility'],
  mechanics: ['tech', 'mechanics', 'engineering'],
  perception: ['perception', 'tracking', 'scout'],
  persuasion: ['social', 'persuasion', 'leadership'],
  pilot: ['pilot', 'vehicle', 'mobility'],
  stealth: ['stealth', 'infiltration', 'scout'],
  survival: ['survival', 'tracking', 'wilderness'],
  'treat injury': ['healing', 'medical', 'support'],
  'use computer': ['tech', 'use_computer', 'hacking'],
  'use the force': ['force_training', 'force_execution', 'use_the_force'],
  knowledge: ['knowledge', 'intelligence_synergy', 'utility']
};

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function compactKey(value) {
  return normalizeKey(value).replace(/_/g, '');
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function addMany(target, values = []) {
  for (const value of values) {
    if (value) target.add(value);
  }
}

function getTraitRecordMap() {
  const map = new Map();
  for (const record of speciesTraitsData || []) {
    const names = [record?.name, record?.renameTo].filter(Boolean);
    for (const name of names) {
      map.set(normalizeKey(name), record);
      map.set(compactKey(name), record);
    }
  }
  return map;
}

const TRAIT_RECORD_MAP = getTraitRecordMap();

function resolveSupplementaryRecord(name, seen = new Set()) {
  const key = normalizeKey(name);
  if (!key || seen.has(key)) return null;
  seen.add(key);

  const record = TRAIT_RECORD_MAP.get(key) || TRAIT_RECORD_MAP.get(compactKey(name));
  if (!record) return null;

  const resolved = {
    ...record,
    structuralTraits: [...(record.structuralTraits || [])],
    activatedAbilities: [...(record.activatedAbilities || [])],
    conditionalTraits: [...(record.conditionalTraits || [])],
    bonusFeats: [...(record.bonusFeats || [])],
    equipmentGrants: [...(record.equipmentGrants || [])],
    tags: [...(record.tags || [])],
    notes: [...(record.notes || [])]
  };

  if (record.inherits) {
    const parent = resolveSupplementaryRecord(record.inherits, seen);
    if (parent) {
      resolved.structuralTraits = [...(parent.structuralTraits || []), ...resolved.structuralTraits];
      resolved.activatedAbilities = [...(parent.activatedAbilities || []), ...resolved.activatedAbilities];
      resolved.conditionalTraits = [...(parent.conditionalTraits || []), ...resolved.conditionalTraits];
      resolved.bonusFeats = [...(parent.bonusFeats || []), ...resolved.bonusFeats];
      resolved.equipmentGrants = [...(parent.equipmentGrants || []), ...resolved.equipmentGrants];
      resolved.tags = [...(parent.tags || []), ...resolved.tags];
      resolved.notes = [...(parent.notes || []), ...resolved.notes];
    }
  }

  return resolved;
}

function extractTraitTexts(supplementary = null) {
  if (!supplementary) return [];
  const out = [];

  for (const trait of supplementary.structuralTraits || []) {
    if (trait?.name) out.push(trait.name);
    if (trait?.description) out.push(trait.description);
  }
  for (const trait of supplementary.conditionalTraits || []) {
    if (trait?.name) out.push(trait.name);
    if (trait?.description) out.push(trait.description);
  }
  for (const trait of supplementary.activatedAbilities || []) {
    if (trait?.name) out.push(trait.name);
    if (trait?.description) out.push(trait.description);
  }
  for (const trait of supplementary.bonusFeats || []) {
    if (trait?.name) out.push(trait.name);
    if (trait?.description) out.push(trait.description);
  }
  for (const note of supplementary.notes || []) {
    out.push(note);
  }

  return out.filter(Boolean);
}

function deriveAbilityTags(abilityScores = {}, target) {
  for (const [ability, mod] of Object.entries(abilityScores || {})) {
    const numeric = Number(mod || 0);
    if (numeric > 0) {
      addMany(target, ABILITY_ROLE_TAGS[ability] || []);
      target.add(`species_bonus_${ability}`);
    } else if (numeric < 0) {
      target.add(`species_penalty_${ability}`);
    }
  }
}

function derivePhysicalTags(entry, target) {
  const size = String(entry?.size || '').toLowerCase();
  const speed = Number(entry?.speed || 0);

  if (size) target.add(`size_${normalizeKey(size)}`);
  if (size === 'small') addMany(target, ['stealth', 'mobility', 'reflex_defense']);
  if (size === 'large') addMany(target, ['offense_melee', 'survivability', 'grapple']);
  if (speed > 6) addMany(target, ['mobility', 'skirmisher']);
  if ((entry?.languages || []).length > 1) addMany(target, ['languages', 'linguist', 'utility']);
}

function deriveTraitTextTags(text, target) {
  const raw = String(text || '');
  if (!raw) return;
  const lower = raw.toLowerCase();

  for (const [skill, tags] of Object.entries(SKILL_TO_TAGS)) {
    if (lower.includes(skill)) addMany(target, tags);
  }

  if (/reflex defense|\breflex\b/.test(lower)) addMany(target, ['defense', 'reflex', 'reflex_defense']);
  if (/fortitude defense|\bfortitude\b/.test(lower)) addMany(target, ['defense', 'fortitude', 'fortitude_defense', 'survivability']);
  if (/will defense|\bwill\b/.test(lower)) addMany(target, ['defense', 'will', 'will_defense']);
  if (/hit points?|\bhp\b/.test(lower)) addMany(target, ['hp', 'survivability']);
  if (/damage reduction|damage threshold|resistance/.test(lower)) addMany(target, ['defense', 'survivability', 'damage_reduction']);
  if (/darkvision/.test(lower)) addMany(target, ['darkvision', 'perception', 'scout']);
  if (/low-light vision/.test(lower)) addMany(target, ['low_light_vision', 'perception', 'scout']);
  if (/blindsense|tremorsense|scent/.test(lower)) addMany(target, ['perception', 'tracking', 'scout']);
  if (/telepathy|telepathic/.test(lower)) addMany(target, ['social', 'utility']);
  if (/force sensitivity|force power|use the force|force point/.test(lower)) addMany(target, ['force_training', 'force_power', 'force_execution', 'use_the_force', 'force_capacity']);
  if (/bonus feat/.test(lower)) addMany(target, ['bonus_feat', 'flexibility']);
  if (/bonus language|additional language|unassigned language/.test(lower)) addMany(target, ['languages', 'linguist']);
  if (/skill training|trained skill/.test(lower)) addMany(target, ['skill_training', 'utility']);
  if (/claw|bite|talon|slam|gore|natural weapon/.test(lower)) addMany(target, ['offense_melee', 'damage', 'natural_weapon']);
  if (/flight|flying|fly speed|hover|glide/.test(lower)) addMany(target, ['mobility', 'flight']);
  if (/swim speed|swim/.test(lower)) addMany(target, ['mobility', 'swim', 'survival']);
  if (/climb speed|climb/.test(lower)) addMany(target, ['mobility', 'climb']);
  if (/burrow/.test(lower)) addMany(target, ['mobility', 'burrow']);
  if (/reroll/.test(lower)) addMany(target, ['consistency', 'reroll']);
}

function buildSpeciesIdentityTags(name) {
  const slug = normalizeKey(name);
  const compact = compactKey(name);
  const tags = ['species', 'heritage', `species_${slug}`];
  if (compact && compact !== slug) tags.push(`species_${compact}`);
  return { slug, tags };
}

function buildAttributeForecast(abilityScores = {}) {
  const boosts = [];
  const mitigations = [];

  for (const [ability, value] of Object.entries(abilityScores || {})) {
    const numeric = Number(value || 0);
    if (!numeric) continue;
    const config = ABILITY_FORECAST[ability];
    if (!config) continue;

    const item = {
      ability,
      value: numeric,
      signedValue: `${numeric > 0 ? '+' : ''}${numeric}`,
      summary: numeric > 0 ? config.positive : config.negative
    };

    if (numeric > 0) boosts.push(item);
    if (numeric < 0) mitigations.push(item);
  }

  return { boosts, mitigations };
}

export function buildSpeciesMetadataProfile(entry = {}) {
  const sourceTags = unique((entry.tags || []).map(normalizeKey));
  const derived = new Set();
  const supplementary = resolveSupplementaryRecord(entry.name);
  const traitTexts = [
    ...(entry.abilities || []),
    ...(entry.languages || []),
    ...(extractTraitTexts(supplementary))
  ];

  const { slug, tags: identityTags } = buildSpeciesIdentityTags(entry.name);
  addMany(derived, identityTags);
  deriveAbilityTags(entry.abilityScores || {}, derived);
  derivePhysicalTags(entry, derived);
  addMany(derived, (supplementary?.tags || []).map(normalizeKey));

  for (const text of traitTexts) {
    deriveTraitTextTags(text, derived);
  }

  const derivedTags = unique([...derived].map(normalizeKey));
  const tags = unique([...sourceTags, ...derivedTags]);

  return {
    speciesSlug: slug,
    sourceTags,
    derivedTags,
    tags,
    supplementaryTraits: supplementary,
    attributeForecast: buildAttributeForecast(entry.abilityScores || {})
  };
}

export function resolveSpeciesMetadataProfile(name) {
  return resolveSupplementaryRecord(name);
}

export function humanizeSpeciesTag(tag) {
  const value = String(tag || '');
  if (!value) return '';
  return value
    .replace(/^species_/, '')
    .replace(/^ability_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
