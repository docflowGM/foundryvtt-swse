/**
 * Follower Deriver
 *
 * Followers are dependent actors, not class-leveled participants. Creation stores
 * persistent choices; level-up re-derives from owner heroic level with no player
 * choices.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { getHeroicLevel } from '/systems/foundryvtt-swse/scripts/actors/derived/level-split.js';
import { FollowerCreator } from '../../follower-creator.js';

const TEMPLATE_ABILITY_OPTIONS = Object.freeze({
  aggressive: ['str', 'con'],
  defensive: ['dex', 'wis'],
  utility: ['int', 'cha']
});

const DEFENSE_KEY_MAP = Object.freeze({
  fort: 'fort',
  fortitude: 'fort',
  ref: 'ref',
  reflex: 'ref',
  will: 'will'
});

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function normalizeDefenseKey(key) {
  return DEFENSE_KEY_MAP[key] || key;
}

function abilityMod(score, absent = false) {
  if (absent) return 0;
  return Math.floor((Number(score || 10) - 10) / 2);
}

function recalcAbilityMods(abilities) {
  for (const [key, data] of Object.entries(abilities)) {
    data.mod = abilityMod(data.base, data.absent === true || (key === 'con' && data.base === 0));
  }
  return abilities;
}

function normalizeAbilityMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [rawKey, rawValue] of Object.entries(raw)) {
    const key = String(rawKey || '').toLowerCase().slice(0, 3);
    if (!ABILITY_KEYS.includes(key)) continue;
    const value = Number(rawValue);
    if (Number.isFinite(value) && value !== 0) out[key] = value;
  }
  return out;
}

function parseAbilityText(text) {
  const out = {};
  const source = String(text || '');
  if (!source.trim()) return out;
  const rx = /([+-]\s*\d+)\s*(str(?:ength)?|dex(?:terity)?|con(?:stitution)?|int(?:elligence)?|wis(?:dom)?|cha(?:risma)?)/gi;
  let match;
  while ((match = rx.exec(source))) {
    const key = match[2].toLowerCase().slice(0, 3);
    const value = Number(String(match[1]).replace(/\s+/g, ''));
    if (ABILITY_KEYS.includes(key) && Number.isFinite(value)) out[key] = (out[key] || 0) + value;
  }
  return out;
}

async function resolveSpeciesRecord(speciesName) {
  if (!speciesName || String(speciesName).toLowerCase().includes('droid')) return null;
  try {
    const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
    if (!SpeciesRegistry.isInitialized?.()) await SpeciesRegistry.initialize?.();
    return SpeciesRegistry.getByName?.(speciesName)
      || SpeciesRegistry.getById?.(speciesName)
      || null;
  } catch (err) {
    swseLogger.warn('[FollowerDeriver] Could not resolve species registry entry:', err);
    return null;
  }
}

function getNested(obj, path) {
  return path.split('.').reduce((value, key) => value?.[key], obj);
}

function extractSpeciesAbilityMods(persistentChoices = {}, speciesRecord = null) {
  const candidates = [
    persistentChoices.speciesAbilityMods,
    persistentChoices.speciesSelection?.abilityScores,
    persistentChoices.speciesSelection?.abilityMods,
    persistentChoices.speciesSelection?.speciesData?.abilityScores,
    persistentChoices.speciesSelection?.speciesData?.abilityMods,
    persistentChoices.speciesSelection?.speciesData?.system?.abilityMods,
    persistentChoices.speciesSelection?.speciesData?.system?.canonicalStats?.abilityMods,
    persistentChoices.pendingSpeciesContext?.abilities,
    persistentChoices.pendingSpeciesContext?.identity?.doc?.abilityScores,
    persistentChoices.pendingSpeciesContext?.identity?.doc?.abilityMods,
    persistentChoices.pendingSpeciesContext?.identity?.doc?.system?.abilityMods,
    persistentChoices.pendingSpeciesContext?.identity?.doc?.system?.canonicalStats?.abilityMods,
    speciesRecord?.abilityScores,
    speciesRecord?.abilityMods,
    speciesRecord?.system?.abilityMods,
    speciesRecord?.system?.canonicalStats?.abilityMods,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAbilityMap(candidate);
    if (Object.keys(normalized).length) return normalized;
  }

  const textSources = [
    persistentChoices.speciesSelection?.abilities,
    persistentChoices.speciesSelection?.speciesData?.abilities,
    persistentChoices.speciesSelection?.speciesData?.system?.abilities,
    persistentChoices.speciesSelection?.speciesData?.system?.canonicalStats?.abilities,
    persistentChoices.pendingSpeciesContext?.identity?.doc?.abilities,
    persistentChoices.pendingSpeciesContext?.identity?.doc?.system?.abilities,
    speciesRecord?.abilities,
    speciesRecord?.system?.abilities,
    speciesRecord?.system?.canonicalStats?.abilities,
    speciesRecord?.system?.canonicalStats?.abilityText,
  ].filter(Boolean);

  for (const text of textSources) {
    const parsed = parseAbilityText(Array.isArray(text) ? text.join(', ') : text);
    if (Object.keys(parsed).length) return parsed;
  }

  return {};
}

function extractSpeciesMovement(persistentChoices = {}, speciesRecord = null) {
  const selection = persistentChoices.speciesSelection || {};
  const system = selection.speciesData?.system || selection.system || {};
  const pendingDoc = persistentChoices.pendingSpeciesContext?.identity?.doc || {};
  const pendingSystem = pendingDoc.system || {};
  const recordSystem = speciesRecord?.system || {};
  const speed = selection.speed
    ?? system.speed
    ?? system.canonicalStats?.speed
    ?? pendingDoc.speed
    ?? pendingSystem.speed
    ?? pendingSystem.canonicalStats?.speed
    ?? speciesRecord?.speed
    ?? recordSystem.speed
    ?? recordSystem.canonicalStats?.speed
    ?? null;
  const movement = selection.movement
    ?? system.movement
    ?? system.canonicalStats?.movement
    ?? pendingDoc.movement
    ?? pendingSystem.movement
    ?? pendingSystem.canonicalStats?.movement
    ?? speciesRecord?.movement
    ?? recordSystem.movement
    ?? recordSystem.canonicalStats?.movement
    ?? null;
  const size = selection.size
    ?? system.size
    ?? system.canonicalStats?.size
    ?? pendingDoc.size
    ?? pendingSystem.size
    ?? pendingSystem.canonicalStats?.size
    ?? speciesRecord?.size
    ?? recordSystem.size
    ?? recordSystem.canonicalStats?.size
    ?? null;
  return { speed, movement, size };
}

async function buildBaseAbilities(templateType, template, persistentChoices = {}, speciesRecord = null) {
  const isDroid = persistentChoices?.droidConfig?.isDroid === true || String(persistentChoices?.speciesName || '').toLowerCase().includes('droid');
  const abilities = {
    str: { base: 10, mod: 0 },
    dex: { base: 10, mod: 0 },
    con: { base: isDroid ? 0 : 10, mod: 0, absent: isDroid },
    int: { base: 10, mod: 0 },
    wis: { base: 10, mod: 0 },
    cha: { base: 10, mod: 0 }
  };

  if (isDroid) {
    const key = persistentChoices?.droidConfig?.abilityChoice;
    if (key && key !== 'con' && abilities[key]) abilities[key].base += 2;
  } else {
    const speciesMods = extractSpeciesAbilityMods(persistentChoices, speciesRecord);
    for (const [key, value] of Object.entries(speciesMods)) {
      if (abilities[key]) abilities[key].base += Number(value || 0);
    }

    const options = TEMPLATE_ABILITY_OPTIONS[templateType] || [];
    const key = options.includes(persistentChoices?.abilityChoice)
      ? persistentChoices.abilityChoice
      : options[0];
    if (key && abilities[key]) abilities[key].base += Number(template?.abilityBonus || 0);
  }

  const humanBonus = persistentChoices?.humanTemplateBonus;
  if (!isDroid && humanBonus?.bonusType === 'ability' && abilities[humanBonus.value]) {
    const templates = persistentChoices.__templates || {};
    const sourceTemplate = templates[humanBonus.templateType] || {};
    abilities[humanBonus.value].base += Number(sourceTemplate.abilityBonus || template?.abilityBonus || 2);
  }

  return recalcAbilityMods(abilities);
}

function applyDefenseBonus(defenses, bonusSource, sourceLabel = 'template') {
  for (const [rawKey, rawBonus] of Object.entries(bonusSource || {})) {
    const key = normalizeDefenseKey(rawKey);
    if (!defenses[key]) continue;
    const bonus = Number(rawBonus || 0);
    defenses[key].bonus = Number(defenses[key].bonus || 0) + bonus;
    defenses[key].sources = [...(defenses[key].sources || []), { source: sourceLabel, bonus }];
  }
}

export async function deriveFollowerStats(targetHeroicLevel, speciesName, templateType, persistentChoices = {}) {
  const level = Math.max(1, Number(targetHeroicLevel || 1));
  const templates = await FollowerCreator.getFollowerTemplates();
  const template = templates[templateType];

  if (!template) {
    swseLogger.error('[FollowerDeriver] Invalid template:', templateType);
    throw new Error(`Unknown follower template: ${templateType}`);
  }

  const speciesRecord = await resolveSpeciesRecord(speciesName);
  const choices = { ...persistentChoices, speciesName, templateType, __templates: templates };
  const abilities = await buildBaseAbilities(templateType, template, choices, speciesRecord);
  const speciesProfile = extractSpeciesMovement(choices, speciesRecord);

  const defenses = {
    fort: { base: 10 + Math.max(abilities.str.mod, abilities.con.mod) + level, bonus: 0 },
    ref: { base: 10 + abilities.dex.mod + level, bonus: 0 },
    will: { base: 10 + abilities.wis.mod + level, bonus: 0 }
  };

  applyDefenseBonus(defenses, template.defenseBonus, 'template');

  const humanBonus = choices.humanTemplateBonus;
  if (humanBonus?.bonusType === 'defense') {
    const sourceTemplate = templates[humanBonus.templateType] || {};
    const rawDefenseKey = humanBonus.value;
    const rawBonus = sourceTemplate.defenseBonus?.[rawDefenseKey] ?? sourceTemplate.defenseBonus?.[normalizeDefenseKey(rawDefenseKey)];
    if (rawBonus !== undefined) {
      applyDefenseBonus(defenses, { [rawDefenseKey]: rawBonus }, 'human-template-bonus');
    }
  }

  for (const defense of Object.values(defenses)) {
    defense.total = defense.base + Number(defense.bonus || 0);
  }

  const conMod = abilities.con?.mod || 0;
  const hpValue = Math.max(1, 10 + level + conMod);
  const hp = { max: hpValue, value: hpValue };
  const bab = template.babProgression?.[Math.min(level - 1, 19)] ?? 0;
  const damageThreshold = defenses.fort.total + Number(template.damageThresholdBonus || 0);
  const grappleBonus = abilities.str.mod;

  swseLogger.log('[FollowerDeriver] Derived follower stats', {
    level,
    hp: hp.max,
    bab,
    templateType,
    speciesName,
    speciesAbilityMods: extractSpeciesAbilityMods(choices, speciesRecord)
  });

  delete choices.__templates;
  return {
    level,
    abilities,
    defenses,
    hp,
    bab,
    damageThreshold,
    grappleBonus,
    template,
    templateType,
    speciesName,
    speciesProfile,
    persistentChoices: choices
  };
}

export function computeFollowerExistenceState(existingFollower, ownerHeroicLevel) {
  const targetLevel = Math.max(1, ownerHeroicLevel || 1);
  const currentLevel = existingFollower?.system?.level || 0;
  const isNew = currentLevel === 0;
  const needsUpdate = !isNew && currentLevel !== targetLevel;

  return {
    isNew,
    isExisting: !isNew,
    currentLevel,
    targetLevel,
    needsUpdate,
    levelChanged: targetLevel > currentLevel
  };
}

function mirrorCanonicalDraftChoices(draft = {}) {
  const species = draft.species || null;
  const background = draft.background || null;
  const skills = draft.skills || null;
  const languages = draft.languages || null;

  const skillChoices = Array.isArray(draft.skillChoices) ? draft.skillChoices
    : Array.isArray(draft.followerSkills) ? draft.followerSkills
    : Array.isArray(skills) ? skills
    : Array.isArray(skills?.trained) ? skills.trained
    : Array.isArray(skills?.trainedSkills) ? skills.trainedSkills
    : [];

  const languageChoices = Array.isArray(draft.languageChoices) ? draft.languageChoices
    : Array.isArray(draft.followerLanguages) ? draft.followerLanguages
    : Array.isArray(languages) ? languages
    : Array.isArray(languages?.selected) ? languages.selected
    : Array.isArray(languages?.languages) ? languages.languages
    : [];

  const backgroundChoice = draft.backgroundChoice
    ?? draft.followerBackground
    ?? (Array.isArray(background?.backgroundIds) ? background.backgroundIds[0] : null)
    ?? background?.id
    ?? background?.name
    ?? null;

  return {
    ...(species ? {
      speciesSelection: species,
      speciesName: species.name || species.speciesName || draft.speciesName,
      speciesId: species.id || species.speciesId || species.sourceId || draft.speciesId,
      speciesAbilityMods: species.abilityScores || species.abilityMods || null,
      pendingSpeciesContext: draft.pendingSpeciesContext || species.pendingContext || null,
    } : {}),
    ...(background ? {
      backgroundSelection: background,
      backgroundChoice,
      pendingBackgroundContext: draft.pendingBackgroundContext || background.pendingContext || null,
    } : {}),
    ...(skillChoices.length ? { skillChoices } : {}),
    ...(languageChoices.length ? { languageChoices } : {}),
  };
}

export async function getFollowerDerivationContext(session, ownerActor, existingFollower = null) {
  if (!session?.dependencyContext) {
    swseLogger.warn('[FollowerDeriver] No dependency context in session');
    return null;
  }

  const ownerHeroicLevel = getHeroicLevel(ownerActor) || 1;
  const existenceState = computeFollowerExistenceState(existingFollower, ownerHeroicLevel);
  const templates = await FollowerCreator.getFollowerTemplates();
  const draft = session.draftSelections || {};
  const existingChoices = existingFollower?.system?.progression?.followerChoices || {};
  const contextChoices = session.dependencyContext.persistentChoices || {};
  const canonicalDraft = mirrorCanonicalDraftChoices(draft);

  const persistentChoices = {
    ...contextChoices,
    ...existingChoices,
    ...canonicalDraft,
    ...(draft.followerKind !== undefined ? { followerKind: draft.followerKind } : {}),
    ...(draft.followerName !== undefined ? { followerName: String(draft.followerName || '').trim() } : {}),
    ...(draft.speciesName !== undefined ? { speciesName: draft.speciesName } : {}),
    ...(draft.speciesId !== undefined ? { speciesId: draft.speciesId } : {}),
    ...(draft.speciesSelection !== undefined ? { speciesSelection: draft.speciesSelection } : {}),
    ...(draft.pendingSpeciesContext !== undefined ? { pendingSpeciesContext: draft.pendingSpeciesContext } : {}),
    ...(draft.templateType !== undefined ? { templateType: draft.templateType } : {}),
    ...(draft.abilityChoice !== undefined ? { abilityChoice: draft.abilityChoice } : {}),
    ...(draft.skillChoices !== undefined ? { skillChoices: draft.skillChoices } : {}),
    ...(draft.followerSkills !== undefined ? { skillChoices: draft.followerSkills } : {}),
    ...(draft.featChoices !== undefined ? { featChoices: draft.featChoices } : {}),
    ...(draft.followerFeats !== undefined ? { featChoices: draft.followerFeats } : {}),
    ...(draft.languageChoices !== undefined ? { languageChoices: draft.languageChoices } : {}),
    ...(draft.followerLanguages !== undefined ? { languageChoices: draft.followerLanguages } : {}),
    ...(draft.backgroundChoice !== undefined ? { backgroundChoice: draft.backgroundChoice } : {}),
    ...(draft.backgroundSelection !== undefined ? { backgroundSelection: draft.backgroundSelection } : {}),
    ...(draft.followerBackground !== undefined ? { backgroundChoice: draft.followerBackground } : {}),
    ...(draft.humanTemplateBonus !== undefined ? { humanTemplateBonus: draft.humanTemplateBonus } : {}),
    ...(draft.droidConfig !== undefined ? { droidConfig: draft.droidConfig } : {}),
    ...(draft.startingCredits !== undefined ? { startingCredits: draft.startingCredits } : {}),
    ...(draft.startingCreditsMode !== undefined ? { startingCreditsMode: draft.startingCreditsMode } : {}),
    ...(draft.startingCreditsFormula !== undefined ? { startingCreditsFormula: draft.startingCreditsFormula } : {})
  };

  const templateType = persistentChoices.templateType
    || existingFollower?.system?.progression?.followerTemplate
    || session.dependencyContext.templateType;
  const speciesName = persistentChoices.speciesName
    || existingFollower?.system?.race
    || session.dependencyContext.speciesName;
  const template = templates[templateType];

  persistentChoices.speciesName = speciesName;
  persistentChoices.templateType = templateType;

  return {
    ownerActor,
    existingFollower,
    ownerHeroicLevel,
    template,
    templateType,
    existenceState,
    persistentChoices,
    speciesName
  };
}

export async function deriveFollowerStateForApply(targetHeroicLevel, speciesName, templateType, persistentChoices) {
  const derivedStats = await deriveFollowerStats(targetHeroicLevel, speciesName, templateType, persistentChoices);
  const isDroid = persistentChoices?.droidConfig?.isDroid === true || String(speciesName || '').toLowerCase().includes('droid');
  const size = isDroid ? persistentChoices?.droidConfig?.size : derivedStats.speciesProfile?.size;
  const speed = isDroid ? persistentChoices?.droidConfig?.speed : derivedStats.speciesProfile?.speed;
  const movement = isDroid
    ? { walk: persistentChoices?.droidConfig?.speed || 6 }
    : (derivedStats.speciesProfile?.movement || (speed ? { walk: Number(speed) } : undefined));

  return {
    level: derivedStats.level,
    abilities: derivedStats.abilities,
    defenses: derivedStats.defenses,
    hp: derivedStats.hp,
    baseAttackBonus: derivedStats.bab,
    damageThreshold: derivedStats.damageThreshold,
    race: speciesName,
    ...(size ? { size } : {}),
    ...(speed ? { speed: Number(speed) } : {}),
    ...(movement ? { movement } : {}),
    progression: {
      followerChoices: derivedStats.persistentChoices,
      followerTemplate: templateType,
      isFollower: true
    }
  };
}
