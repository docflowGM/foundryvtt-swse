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

function normalizeDefenseKey(key) {
  return DEFENSE_KEY_MAP[key] || key;
}

function abilityMod(score, absent = false) {
  if (absent) return 0;
  return Math.floor((Number(score || 10) - 10) / 2);
}

function recalcAbilityMods(abilities) {
  for (const [key, data] of Object.entries(abilities)) {
    data.mod = abilityMod(data.base, data.absent === true || key === 'con' && data.base === 0);
  }
  return abilities;
}

function buildBaseAbilities(templateType, template, persistentChoices = {}) {
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

  const choices = { ...persistentChoices, speciesName, templateType, __templates: templates };
  const abilities = buildBaseAbilities(templateType, template, choices);

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
    speciesName
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

  const persistentChoices = {
    ...contextChoices,
    ...existingChoices,
    ...(draft.followerKind !== undefined ? { followerKind: draft.followerKind } : {}),
    ...(draft.speciesName !== undefined ? { speciesName: draft.speciesName } : {}),
    ...(draft.speciesId !== undefined ? { speciesId: draft.speciesId } : {}),
    ...(draft.templateType !== undefined ? { templateType: draft.templateType } : {}),
    ...(draft.abilityChoice !== undefined ? { abilityChoice: draft.abilityChoice } : {}),
    ...(draft.skillChoices !== undefined ? { skillChoices: draft.skillChoices } : {}),
    ...(draft.followerSkills !== undefined ? { skillChoices: draft.followerSkills } : {}),
    ...(draft.featChoices !== undefined ? { featChoices: draft.featChoices } : {}),
    ...(draft.followerFeats !== undefined ? { featChoices: draft.followerFeats } : {}),
    ...(draft.languageChoices !== undefined ? { languageChoices: draft.languageChoices } : {}),
    ...(draft.followerLanguages !== undefined ? { languageChoices: draft.followerLanguages } : {}),
    ...(draft.backgroundChoice !== undefined ? { backgroundChoice: draft.backgroundChoice } : {}),
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

  return {
    level: derivedStats.level,
    abilities: derivedStats.abilities,
    defenses: derivedStats.defenses,
    hp: derivedStats.hp,
    baseAttackBonus: derivedStats.bab,
    damageThreshold: derivedStats.damageThreshold,
    race: speciesName,
    progression: {
      followerChoices: derivedStats.persistentChoices,
      followerTemplate: templateType,
      isFollower: true
    }
  };
}
