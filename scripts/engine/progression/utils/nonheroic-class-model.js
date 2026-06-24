/**
 * Synthetic Nonheroic class model.
 *
 * Nonheroic is not stored in the canonical classes compendium because it is an
 * NPC advancement track, but progression consumers still need a stable class
 * model for cards, entitlement math, BAB/HP lookups, and finalization.
 */

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
    system,
    ...overrides,
  };
}

export const NONHEROIC_CLASS_MODEL = Object.freeze(createNonheroicClassModel());

export function getNonheroicClassModel(overrides = {}) {
  return createNonheroicClassModel(overrides);
}
