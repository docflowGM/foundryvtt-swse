/**
 * SWSE Entity Dialog prerequisite engine.
 *
 * Pure, presentation-safe prerequisite helpers for item dialogs. The engine
 * never mutates actors/items and never reaches into Foundry during evaluation;
 * callers may provide a subject built from an actor or any compatible test
 * object. Raw text prerequisites remain supported alongside structured clauses.
 */

const ABILITY_LABELS = Object.freeze({
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma'
});

const CLAUSE_KIND_LABELS = Object.freeze({
  ability: 'Ability',
  bab: 'Base Attack Bonus',
  level: 'Character Level',
  class: 'Class Level',
  feat: 'Feat',
  talent: 'Talent',
  skill: 'Skill',
  proficiency: 'Proficiency',
  prof: 'Proficiency',
  descriptor: 'Descriptor',
  custom: 'GM / Custom'
});

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value ?? {});
  return JSON.parse(JSON.stringify(value ?? {}));
}

function objectToArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, entry]) => entry)
    .filter((entry) => entry && typeof entry === 'object');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  if (typeof value === 'string') return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function asText(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'object') {
    if (typeof value.value === 'string') return value.value;
    if (typeof value.text === 'string') return value.text;
    if (typeof value.label === 'string') return value.label;
    return fallback;
  }
  return String(value);
}

function toNumber(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeKind(value) {
  const normalized = String(value || 'custom').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases = {
    base_attack_bonus: 'bab',
    base_attack: 'bab',
    character_level: 'level',
    class_level: 'class',
    trained_skill: 'skill',
    skill_trained: 'skill',
    weapon_proficiency: 'proficiency',
    armor_proficiency: 'proficiency',
    prof: 'proficiency',
    gm: 'custom',
    gm_gate: 'custom'
  };
  return aliases[normalized] || normalized || 'custom';
}

function normalizeAbility(value) {
  const normalized = String(value || '').trim().toLowerCase().slice(0, 3);
  return ['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(normalized) ? normalized : 'str';
}

function normalizeLogic(value) {
  const normalized = String(value || 'AND').trim().toUpperCase();
  return normalized === 'OR' ? 'OR' : 'AND';
}

function normalizeClause(raw = {}, index = 0) {
  const clause = clone(raw ?? {});
  const kind = normalizeKind(clause.kind || clause.type);
  const key = kind === 'ability'
    ? normalizeAbility(clause.key || clause.ability || clause.name)
    : asText(clause.key || clause.name || clause.group || clause.id || clause.value, '');
  const label = asText(clause.label || clause.name || clause.group || clause.id || clause.value, '');
  const value = kind === 'custom' || kind === 'feat' || kind === 'talent' || kind === 'proficiency' || kind === 'descriptor'
    ? asText(clause.value || clause.id || clause.group || clause.name || label, '')
    : toNumber(clause.value ?? clause.level ?? clause.ranks ?? clause.minimum, 0);

  return {
    index,
    kind,
    kindLabel: CLAUSE_KIND_LABELS[kind] || kind,
    key,
    value,
    label,
    logic: normalizeLogic(clause.logic),
    trained: clause.trained === true || clause.trained === 'true' || clause.trained === 'on',
    notes: asText(clause.notes || clause.note || '', '')
  };
}

export function normalizePrereqClauses(value) {
  return objectToArray(value)
    .map((entry, index) => normalizeClause(entry, index))
    .filter((entry) => entry.kind || entry.key || entry.value || entry.label || entry.notes);
}

function getSet(subject, key) {
  const value = subject?.[key];
  if (value instanceof Set) return value;
  return new Set(asArray(value).map((entry) => String(entry).toLowerCase()));
}

function getMapValue(subject, key, lookup, fallback = 0) {
  const value = subject?.[key];
  if (value instanceof Map) return value.get(lookup) ?? value.get(String(lookup).toLowerCase()) ?? fallback;
  if (value && typeof value === 'object') return value[lookup] ?? value[String(lookup).toLowerCase()] ?? fallback;
  return fallback;
}

function hasNamed(subject, key, lookup) {
  const needle = String(lookup || '').toLowerCase();
  if (!needle) return false;
  const set = getSet(subject, key);
  if (set.has(needle)) return true;
  return Array.from(set).some((entry) => String(entry).toLowerCase() === needle || String(entry).toLowerCase().includes(needle));
}

function evaluateClause(clause, subject = {}) {
  const c = normalizeClause(clause);
  let met = null;
  let detail = '';
  let display = c.label || c.key || String(c.value || '');

  switch (c.kind) {
    case 'ability': {
      const have = toNumber(subject?.abilities?.[c.key], 0);
      const need = toNumber(c.value, 0);
      met = have >= need;
      display = `${ABILITY_LABELS[c.key] || c.key} ${need}`;
      detail = `${have}`;
      break;
    }
    case 'bab': {
      const have = toNumber(subject?.bab, 0);
      const need = toNumber(c.value, 0);
      met = have >= need;
      display = `BAB +${need}`;
      detail = `+${have}`;
      break;
    }
    case 'level': {
      const have = toNumber(subject?.level, 0);
      const need = toNumber(c.value, 0);
      met = have >= need;
      display = `Character Level ${need}`;
      detail = `${have}`;
      break;
    }
    case 'class': {
      const have = toNumber(getMapValue(subject, 'classes', c.key || c.label, 0), 0);
      const need = toNumber(c.value, 1);
      met = have >= need;
      display = `${c.label || c.key || 'Class'} ${need}`;
      detail = `${have}`;
      break;
    }
    case 'feat': {
      met = hasNamed(subject, 'feats', c.value || c.key || c.label);
      display = c.label || c.value || c.key || 'Feat';
      break;
    }
    case 'talent': {
      met = hasNamed(subject, 'talents', c.value || c.key || c.label);
      display = c.label || c.value || c.key || 'Talent';
      break;
    }
    case 'skill': {
      const skillName = c.label || c.key || c.value;
      const skill = getMapValue(subject, 'skills', skillName, null);
      const trained = typeof skill === 'object' ? !!skill.trained : skill === true;
      const ranks = typeof skill === 'object' ? toNumber(skill.ranks, 0) : 0;
      if (c.trained) {
        met = trained;
        detail = trained ? 'trained' : 'untrained';
      } else {
        const need = toNumber(c.value, 0);
        met = ranks >= need;
        detail = `${ranks}`;
      }
      display = c.trained ? `${skillName} trained` : `${skillName} ${c.value || 0}`;
      break;
    }
    case 'proficiency': {
      met = hasNamed(subject, 'proficiencies', c.value || c.key || c.label);
      display = `Proficiency: ${c.label || c.value || c.key || 'Required'}`;
      break;
    }
    case 'descriptor': {
      met = hasNamed(subject, 'descriptors', c.value || c.key || c.label);
      display = c.label || c.value || c.key || 'Descriptor';
      break;
    }
    case 'custom':
    default: {
      met = null;
      display = c.label || c.value || c.key || 'GM adjudicated prerequisite';
      detail = 'GM adjudicated';
      break;
    }
  }

  return {
    ...c,
    met,
    status: met === true ? 'met' : met === false ? 'unmet' : 'gm',
    statusLabel: met === true ? 'Met' : met === false ? 'Unmet' : 'GM',
    display,
    detail
  };
}

export function evaluatePrerequisites(clauses = [], subject = null) {
  const normalized = normalizePrereqClauses(clauses);
  if (!normalized.length) {
    return { allMet: true, hasGmGate: false, hasSubject: !!subject, results: [], metCount: 0, unmetCount: 0, gmCount: 0 };
  }
  if (!subject) {
    return {
      allMet: false,
      hasGmGate: true,
      hasSubject: false,
      results: normalized.map((clause) => ({ ...clause, met: null, status: 'gm', statusLabel: 'Actor?', display: clause.label || clause.key || clause.kindLabel, detail: 'No actor context' })),
      metCount: 0,
      unmetCount: 0,
      gmCount: normalized.length
    };
  }
  const results = normalized.map((clause) => evaluateClause(clause, subject));
  const metCount = results.filter((r) => r.met === true).length;
  const unmetCount = results.filter((r) => r.met === false).length;
  const gmCount = results.filter((r) => r.met === null).length;
  return {
    allMet: unmetCount === 0,
    hasGmGate: gmCount > 0,
    hasSubject: true,
    results,
    metCount,
    unmetCount,
    gmCount
  };
}

function actorAbility(actorSystem, key) {
  return toNumber(actorSystem?.abilities?.[key]?.value ?? actorSystem?.abilities?.[key] ?? actorSystem?.[key], 0);
}

function actorItemsOfType(actor, type) {
  const items = actor?.items;
  if (!items) return [];
  if (typeof items.filter === 'function') return items.filter((item) => item?.type === type);
  if (Array.isArray(items)) return items.filter((item) => item?.type === type);
  return [];
}

export function subjectFromActor(actor) {
  if (!actor) return null;
  const system = actor.system ?? {};
  const feats = actorItemsOfType(actor, 'feat');
  const talents = actorItemsOfType(actor, 'talent');
  const skills = actorItemsOfType(actor, 'skill');
  const skillMap = new Map();
  for (const skill of skills) {
    const name = skill?.name ?? skill?.system?.name;
    if (!name) continue;
    skillMap.set(String(name).toLowerCase(), {
      trained: skill?.system?.trained === true || skill?.system?.trainedOnly === true,
      ranks: toNumber(skill?.system?.ranks ?? skill?.system?.bonus, 0)
    });
  }

  const classes = new Map();
  const classList = Array.isArray(system.classes) ? system.classes : Object.values(system.classes ?? {});
  for (const entry of classList) {
    const name = entry?.name ?? entry?.label ?? entry?.id;
    if (!name) continue;
    classes.set(String(name).toLowerCase(), toNumber(entry?.levels ?? entry?.level ?? entry?.value, 0));
  }

  const featNames = new Set(feats.flatMap((item) => [item?.id, item?._id, item?.name]).filter(Boolean).map((entry) => String(entry).toLowerCase()));
  const talentNames = new Set(talents.flatMap((item) => [item?.id, item?._id, item?.name]).filter(Boolean).map((entry) => String(entry).toLowerCase()));
  const proficiencies = new Set([
    ...asArray(system.proficiencies),
    ...asArray(system.weaponProficiencies),
    ...asArray(system.armorProficiencies),
    ...asArray(system.traits?.proficiencies),
    ...feats.filter((feat) => /proficiency/i.test(String(feat?.name || ''))).map((feat) => feat.name)
  ].filter(Boolean).map((entry) => String(entry).toLowerCase()));

  return {
    abilities: {
      str: actorAbility(system, 'str'),
      dex: actorAbility(system, 'dex'),
      con: actorAbility(system, 'con'),
      int: actorAbility(system, 'int'),
      wis: actorAbility(system, 'wis'),
      cha: actorAbility(system, 'cha')
    },
    level: toNumber(system.details?.level ?? system.level ?? system.characterLevel, 0),
    bab: toNumber(system.attack?.bab ?? system.bab ?? system.derived?.bab, 0),
    classes,
    feats: featNames,
    talents: talentNames,
    skills: skillMap,
    proficiencies,
    descriptors: new Set(asArray(system.descriptors ?? system.tags).map((entry) => String(entry).toLowerCase()))
  };
}

export const PrereqEngine = {
  normalizePrereqClauses,
  evaluatePrerequisites,
  evaluateClause,
  subjectFromActor
};
