/**
 * Synthetic Nonheroic class model.
 *
 * Nonheroic is not stored in the canonical classes compendium because it is an
 * NPC advancement track, but progression consumers still need a stable class
 * model for cards, entitlement math, BAB/HP lookups, and finalization.
 */

import { getFeatSelectionScopeKey } from '../feats/feat-shape.js';

const NONHEROIC_CLASS_SKILLS = Object.freeze([
  'acrobatics',
  'climb',
  'deception',
  'endurance',
  'gatherInformation',
  'initiative',
  'jump',
  'knowledgeBureaucracy',
  'knowledgeGalacticLore',
  'knowledgeLifeSciences',
  'knowledgePhysicalSciences',
  'knowledgeSocialSciences',
  'knowledgeTactics',
  'knowledgeTechnology',
  'mechanics',
  'perception',
  'persuasion',
  'pilot',
  'ride',
  'stealth',
  'survival',
  'swim',
  'treatInjury',
  'useComputer',
]);

const NONHEROIC_BAB_TABLE = Object.freeze([
  0, 1, 2, 3, 3,
  4, 5, 6, 6, 7,
  8, 9, 9, 10, 11,
  12, 12, 13, 14, 15,
]);

function buildLevelProgression(maxLevel = 20) {
  return Array.from({ length: maxLevel }, (_, index) => {
    const level = index + 1;
    return {
      level,
      bab: NONHEROIC_BAB_TABLE[index] ?? Math.floor(level * 0.75),
      force_points: 0,
      features: [],
      defense_bonus: 0,
      bonus_talents: 0,
      bonus_feats: level === 1 || level % 3 === 0 ? 1 : 0,
    };
  });
}

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function isNonheroicClassRef(ref) {
  const candidates = typeof ref === 'object'
    ? [
        ref?.id,
        ref?.classId,
        ref?._id,
        ref?.sourceId,
        ref?.name,
        ref?.className,
        ref?.system?.classId,
        ref?.system?.class_name,
        ref?.system?.className,
      ]
    : [ref];

  if (typeof ref === 'object' && (ref?.isNonheroic === true || ref?.system?.isNonheroic === true)) return true;

  return candidates
    .filter(Boolean)
    .some(value => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') === 'nonheroic');
}

export function createNonheroicClassModel(overrides = {}) {
  const levelProgression = buildLevelProgression();
  const system = {
    classId: 'nonheroic',
    class_name: 'Nonheroic',
    className: 'Nonheroic',
    level: Number(overrides?.system?.level ?? overrides?.level ?? 0) || 0,
    isNonheroic: true,
    base_class: false,
    prestigeClass: false,
    hitDie: '1d4',
    hit_die: '1d4',
    hitDieValue: 4,
    babProgression: 'nonheroic',
    trainedSkills: 1,
    trained_skills: 1,
    classSkills: [...NONHEROIC_CLASS_SKILLS],
    class_skills: [...NONHEROIC_CLASS_SKILLS],
    defenses: { fortitude: 0, reflex: 0, will: 0 },
    forceSensitive: false,
    grants_force_points: false,
    grantsForcePoints: false,
    force_point_base: 0,
    forcePointBase: 0,
    talentTrees: [],
    talent_trees: [],
    talentTreeIds: [],
    starting_features: [],
    startingFeatures: [],
    level_progression: clone(levelProgression),
    levelProgression: clone(levelProgression),
    source: 'Synthetic Nonheroic Progression Track',
    description: 'NPC-only nonheroic advancement. Uses d4 hit dice, nonheroic BAB progression, no class talents, and no heroic class defense bonuses.',
    ...(overrides?.system || {}),
  };

  return {
    id: 'nonheroic',
    classId: 'nonheroic',
    sourceId: 'nonheroic',
    name: 'Nonheroic',
    isNonheroic: true,
    baseClass: true,
    prestigeClass: false,
    hitDie: 4,
    babProgression: 'nonheroic',
    trainedSkills: 1,
    classSkills: [...NONHEROIC_CLASS_SKILLS],
    talentTreeNames: [],
    talentTreeSourceIds: [],
    talentTreeUuids: [],
    talentTreeIds: [],
    defenses: { fortitude: 0, reflex: 0, will: 0 },
    startingFeatures: [],
    levelProgression,
    forceSensitive: false,
    grantsForcePoints: false,
    forcePointBase: 0,
    role: 'nonheroic',
    tags: ['nonheroic', 'npc', 'advancement_track'],
    baseHp: 0,
    startingCredits: null,
    description: system.description,
    fantasy: system.description,
    source: system.source,
    img: 'icons/svg/mystery-man.svg',
    ...overrides,
    // The fully merged system block must win: a trailing `...overrides` would
    // otherwise replace it with the partial override (dropping isNonheroic,
    // classId, hit die, BAB progression...) on the committed class selection.
    system,
  };
}

export const NONHEROIC_CLASS_MODEL = Object.freeze(createNonheroicClassModel());

// ---------------------------------------------------------------------------
// Nonheroic starting-feat entitlement (single source-backed authority)
// ---------------------------------------------------------------------------
//
// Source: Saga Edition Core Rulebook, "Nonheroic Characters" (class write-up,
// printed p.277): "A nonheroic character gains three starting feats at 1st
// level, chosen from the following list: Armor Proficiency (light), Armor
// Proficiency (medium), Skill Focus*, Skill Training*, Weapon Proficiency
// (advanced melee weapons), Weapon Proficiency (heavy weapons), Weapon
// Proficiency (pistols), Weapon Proficiency (rifles), Weapon Proficiency
// (simple weapons). * This feat may be selected more than once. Each time the
// feat is selected, it applies to a different skill."
//
// The same page says nonheroic characters "gain feats normally as they advance
// in level, as shown in Table 3-1", so the ordinary level-1 general feat is a
// SEPARATE entitlement from these three class starting feats.
//
// `choiceGroup` values are the canonical weapon-group ids used by
// FeatChoiceResolver / data/feat-choice-options.json (weaponGroups).

export const NONHEROIC_STARTING_FEAT_SLOT_TYPE = 'nonheroic-starting';
export const NONHEROIC_STARTING_FEAT_SOURCE = 'nonheroic-starting-feats';

export const NONHEROIC_STARTING_FEAT_RULE = Object.freeze({
  count: 3,
  source: 'Saga Edition Core Rulebook, Nonheroic Characters, p.277',
  options: Object.freeze([
    Object.freeze({ key: 'armor-proficiency-light', feat: 'Armor Proficiency (Light)', repeatable: false }),
    Object.freeze({ key: 'armor-proficiency-medium', feat: 'Armor Proficiency (Medium)', repeatable: false }),
    Object.freeze({ key: 'skill-focus', feat: 'Skill Focus', repeatable: true, scope: 'skill' }),
    Object.freeze({ key: 'skill-training', feat: 'Skill Training', repeatable: true, scope: 'skill' }),
    Object.freeze({ key: 'weapon-proficiency-advanced-melee', feat: 'Weapon Proficiency', scope: 'weapon-group', choiceGroup: 'advanced-melee', repeatable: false }),
    Object.freeze({ key: 'weapon-proficiency-heavy-weapons', feat: 'Weapon Proficiency', scope: 'weapon-group', choiceGroup: 'heavy-weapons', repeatable: false }),
    Object.freeze({ key: 'weapon-proficiency-pistols', feat: 'Weapon Proficiency', scope: 'weapon-group', choiceGroup: 'pistols', repeatable: false }),
    Object.freeze({ key: 'weapon-proficiency-rifles', feat: 'Weapon Proficiency', scope: 'weapon-group', choiceGroup: 'rifles', repeatable: false }),
    Object.freeze({ key: 'weapon-proficiency-simple', feat: 'Weapon Proficiency', scope: 'weapon-group', choiceGroup: 'simple', repeatable: false }),
  ]),
});

function featKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2018\u2019\u201B\u2032']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const WEAPON_GROUP_ALIASES = Object.freeze({
  simple: 'simple', 'simple weapons': 'simple', 'simple weapon': 'simple',
  pistols: 'pistols', pistol: 'pistols',
  rifles: 'rifles', rifle: 'rifles',
  'heavy weapons': 'heavy-weapons', 'heavy weapon': 'heavy-weapons', 'heavy-weapons': 'heavy-weapons',
  'advanced melee': 'advanced-melee', 'advanced melee weapons': 'advanced-melee',
  'advanced melee weapon': 'advanced-melee', 'advanced-melee': 'advanced-melee',
});

/** Scope key of a stored selectedChoice (canonical helper lives in feat-shape.js). */
export const getStartingFeatChoiceKey = getFeatSelectionScopeKey;

function canonicalWeaponGroup(choice) {
  const raw = getStartingFeatChoiceKey(choice).replace(/_/g, ' ');
  return WEAPON_GROUP_ALIASES[raw] || null;
}

/**
 * Map a (feat name, selected choice) pair onto one of the nine printed
 * starting-feat options. Returns the option, or null when it is not a legal
 * Nonheroic starting feat. Grouped "Weapon Proficiency" feats require a
 * selected group; legacy per-group names ("Weapon Proficiency (Pistols)") are
 * honored when the compendium still carries them.
 */
export function matchNonheroicStartingFeatOption(featName, selectedChoice = null) {
  const name = featKey(featName);
  if (!name) return null;
  const options = NONHEROIC_STARTING_FEAT_RULE.options;

  const nonWeapon = options.find(opt => opt.scope !== 'weapon-group' && featKey(opt.feat) === name);
  if (nonWeapon) return nonWeapon;

  if (name === 'weapon proficiency') {
    const group = canonicalWeaponGroup(selectedChoice);
    return group ? options.find(opt => opt.choiceGroup === group) || null : null;
  }

  const variant = name.match(/^weapon proficiency (.+)$/);
  if (variant) {
    const group = WEAPON_GROUP_ALIASES[variant[1]] || null;
    return group ? options.find(opt => opt.choiceGroup === group) || null : null;
  }
  if (name === 'simple weapon proficiency') return options.find(opt => opt.choiceGroup === 'simple') || null;
  if (name === 'heavy weapon proficiency') return options.find(opt => opt.choiceGroup === 'heavy-weapons') || null;
  if (name === 'advanced melee weapon proficiency') return options.find(opt => opt.choiceGroup === 'advanced-melee') || null;
  return null;
}

/** True when the feat NAME can ever be offered for the starting-feat entitlement. */
export function isNonheroicStartingFeatFamily(featName) {
  const name = featKey(featName);
  if (!name) return false;
  if (name === 'weapon proficiency') return true;
  return NONHEROIC_STARTING_FEAT_RULE.options.some(opt => opt.scope !== 'weapon-group' && featKey(opt.feat) === name)
    || matchNonheroicStartingFeatOption(featName, null) !== null;
}

/** Uniform identity for a selection: feat identity plus scope (never feat id alone). */
export function getStartingFeatSelectionKey(entry) {
  const base = entry?.id || entry?._id || entry?.featId || entry?.name || '';
  const choice = getStartingFeatChoiceKey(entry?.system?.selectedChoice ?? entry?.selectedChoice ?? entry?.choice ?? null);
  return choice ? `${base}::${choice}` : String(base);
}

/**
 * Pure validation of the three class starting feats. Does NOT evaluate
 * prerequisites (the canonical AbilityEngine/FeatChoiceResolver do that in the
 * step and again in the finalizer); it enforces the printed entitlement shape:
 * exactly three, only listed options, repeatables scoped & distinct, the rest
 * non-duplicated.
 */
export function validateNonheroicStartingFeats(selections = [], { requireComplete = true } = {}) {
  const errors = [];
  const list = Array.isArray(selections) ? selections : [];
  const seen = new Set();

  if (list.length > NONHEROIC_STARTING_FEAT_RULE.count) {
    errors.push(`Nonheroic characters receive exactly ${NONHEROIC_STARTING_FEAT_RULE.count} starting feats (selected ${list.length}).`);
  }
  if (requireComplete && list.length < NONHEROIC_STARTING_FEAT_RULE.count) {
    errors.push(`Select ${NONHEROIC_STARTING_FEAT_RULE.count - list.length} more starting feat(s).`);
  }

  for (const entry of list) {
    const name = entry?.name || entry?.id || '(unnamed feat)';
    const choice = entry?.system?.selectedChoice ?? entry?.selectedChoice ?? entry?.choice ?? null;
    const option = matchNonheroicStartingFeatOption(entry?.name, choice);
    if (!option) {
      errors.push(`${name} is not a legal Nonheroic starting feat.`);
      continue;
    }
    let identity = option.key;
    if (option.scope === 'skill') {
      const skill = getStartingFeatChoiceKey(choice);
      if (!skill) {
        errors.push(`${name} requires a skill choice.`);
        continue;
      }
      identity = `${option.key}::${skill}`;
    }
    if (seen.has(identity)) {
      errors.push(option.repeatable
        ? `${name} was selected more than once for the same skill.`
        : `${name} cannot be selected more than once.`);
    }
    seen.add(identity);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Canonical class selection for the implicit Nonheroic track: the same shape
 * ClassStep commits via normalizeClass() (id, sourceId, name, grants, system),
 * built from the synthetic class model so Summary and the Finalizer agree on
 * class identity without a manual class-selection step.
 */
export function buildNonheroicClassSelection({ level = 1 } = {}) {
  const model = createNonheroicClassModel({ system: { level } });
  return {
    id: model.id,
    sourceId: model.sourceId,
    name: model.name,
    grants: {
      hp: null,
      trainedSkills: model.trainedSkills || 0,
      proficiencies: [],
      startingFeats: [],
      talentAccess: [],
    },
    system: model.system,
    metadata: { source: 'synthetic-nonheroic', createdAt: Date.now() },
  };
}

/**
 * Single heroic/nonheroic transition policy shared by the NPC level-up entry
 * and ClassStep. `heroicLevel`/`nonheroicLevel` come from getLevelSplit().
 *
 * Source: Core Rulebook p.277 — "A nonheroic character can multiclass into a
 * heroic class. The normal multiclassing rules apply." The Core text does not
 * authorize the reverse direction; the repository's existing behavior
 * (ClassStep refused Nonheroic once heroic levels exist) is preserved and the
 * open rules question is recorded as SWSE-NPC-RD-001.
 */
export function evaluateNonheroicTransition({ heroicLevel = 0, nonheroicLevel = 0, target } = {}) {
  const heroic = Number(heroicLevel) || 0;
  const nonheroic = Number(nonheroicLevel) || 0;
  if (target === 'nonheroic') {
    if (heroic > 0) {
      return {
        allowed: false,
        code: 'heroic-to-nonheroic',
        reason: 'This NPC already has heroic class levels. The Core Rulebook allows a nonheroic character to multiclass into a heroic class, but does not provide for taking nonheroic levels after heroic levels.',
      };
    }
    return { allowed: true, code: nonheroic > 0 ? 'nonheroic-continue' : 'nonheroic-start', reason: '' };
  }
  if (target === 'heroic') {
    return { allowed: true, code: nonheroic > 0 ? 'nonheroic-to-heroic' : (heroic > 0 ? 'heroic-continue' : 'heroic-start'), reason: '' };
  }
  return { allowed: false, code: 'unknown-target', reason: `Unknown progression target "${target}".` };
}

export function getNonheroicClassModel(overrides = {}) {
  return createNonheroicClassModel(overrides);
}
