import { ReasonFactory } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ReasonFactory.js";
import { getForceAbilityConfig } from "/systems/foundryvtt-swse/scripts/engine/suggestion/force-rule-adapter.js";
import { resolveClassModel, getClassSkills } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js";

const DEFAULT_SKILL_ABILITY_MAP = {
  str: ['Climb', 'Jump', 'Swim'],
  dex: ['Acrobatics', 'Initiative', 'Pilot', 'Stealth', 'Ride'],
  con: ['Endurance'],
  int: ['Mechanics', 'Use Computer', 'Knowledge'],
  wis: ['Perception', 'Survival', 'Treat Injury'],
  cha: ['Deception', 'Gather Information', 'Persuasion', 'Use the Force']
};

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const POINT_BUY_BASE = 8;
const POINT_BUY_COST = Object.freeze({
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 6,
  15: 8,
  16: 10,
  17: 13,
  18: 16
});
const CLASS_WEIGHT_MAP = Object.freeze({
  jedi: { str: 1.5, dex: 0.75, con: 0.75, wis: 2.25, cha: 1.75 },
  noble: { dex: 0.5, int: 1.5, wis: 1.0, cha: 2.5 },
  scout: { dex: 2.5, con: 0.75, int: 1.5, wis: 1.5 },
  scoundrel: { dex: 2.5, int: 1.0, wis: 0.5, cha: 1.75 },
  soldier: { str: 2.25, dex: 2.0, con: 1.5, wis: 0.5 }
});
const STYLE_IDS = ['amplify', 'balanced', 'mitigate'];

async function loadJson(url) {
  if (url.protocol === 'file:') {
    const fs = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const raw = await fs.readFile(fileURLToPath(url), 'utf-8');
    return JSON.parse(raw);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load JSON: ${url}`);
  return res.json();
}

const attributeReasonsUrl = new URL('../../../data/dialogue/attribute-reasons.json', import.meta.url);
const attributeBiasMapUrl = new URL('../../../data/attribute-bias-mapping.json', import.meta.url);
const ATTRIBUTE_REASON_MAP = await loadJson(attributeReasonsUrl);
const ATTRIBUTE_BIAS_MAP = await loadJson(attributeBiasMapUrl);

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function dedupePush(map, key, value) {
  if (!map[key]) map[key] = [];
  if (!map[key].includes(value)) map[key].push(value);
}

function renderTemplate(text, vars = {}) {
  return String(text || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function labelForAbility(key) {
  return ATTRIBUTE_REASON_MAP?.abilityLabels?.[key] || String(key || '').toUpperCase();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getPointCost(score) {
  return POINT_BUY_COST[score] ?? POINT_BUY_COST[18];
}

function modifier(score) {
  if (!Number.isFinite(Number(score))) return 0;
  return Math.floor((Number(score) - 10) / 2);
}

function emptyAbilityMap(fill = 0, allowed = ABILITY_KEYS) {
  const out = {};
  for (const key of allowed) out[key] = fill;
  return out;
}

function getAssignableAbilityKeys(shell = null, pendingData = {}) {
  const configKeys = shell?.progressionSession?.droidContext?.attributeGenerationConfig?.abilitySystemKeys
    || pendingData?.attributeGenerationConfig?.abilitySystemKeys
    || ABILITY_KEYS;
  const excluded = new Set(
    (shell?.progressionSession?.droidContext?.excludedAbilities
      || pendingData?.excludedAbilities
      || [])
      .map((key) => String(key).toLowerCase())
  );
  return configKeys.map((key) => String(key).toLowerCase()).filter((key) => !excluded.has(key));
}

function getSpeciesSource(shell = null, pendingData = {}) {
  return pendingData?.species
    || shell?.progressionSession?.draftSelections?.species
    || shell?.progressionSession?.committedSelections?.get?.('species')
    || null;
}

function getSpeciesName(species) {
  return species?.name || species?.label || species?.speciesName || null;
}

function getSpeciesTags(species) {
  const raw = species?.tags || species?.speciesData?.tags || species?.system?.tags || [];
  return Array.isArray(raw) ? raw.map((tag) => String(tag).toLowerCase()) : [];
}

function topAbilitiesFromWeights(weights = {}, allowed = ABILITY_KEYS, limit = 3) {
  return Object.entries(weights)
    .filter(([key]) => allowed.includes(key))
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => key);
}

function topPositiveSpeciesAbilities(speciesMods = {}, allowed = ABILITY_KEYS, limit = 2) {
  return Object.entries(speciesMods)
    .filter(([key, value]) => allowed.includes(key) && Number(value) > 0)
    .sort((a, b) => (Number(b[1]) - Number(a[1])) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => key);
}

function topNegativeSpeciesAbilities(speciesMods = {}, allowed = ABILITY_KEYS, limit = 2) {
  return Object.entries(speciesMods)
    .filter(([key, value]) => allowed.includes(key) && Number(value) < 0)
    .sort((a, b) => (Number(a[1]) - Number(b[1])) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => key);
}

function chooseRecommendedStyle(profile) {
  const positive = topPositiveSpeciesAbilities(profile.speciesMods, profile.allowedAbilities, 2);
  const negative = topNegativeSpeciesAbilities(profile.speciesMods, profile.allowedAbilities, 2);
  if (positive.length && !negative.length) return 'amplify';
  if (negative.length >= 2) return 'mitigate';
  return 'balanced';
}

function buildSpeciesReason(textKey, vars = {}, strength = 0.86) {
  const text = renderTemplate(ATTRIBUTE_REASON_MAP?.reasons?.[textKey], vars);
  return text
    ? ReasonFactory.create({ domain: 'attributes', code: textKey.toUpperCase(), text, strength, safe: true })
    : null;
}

function getConfiguredSkillAbilityMap() {
  const { executionAbility } = getForceAbilityConfig();
  const map = {
    str: [...DEFAULT_SKILL_ABILITY_MAP.str],
    dex: [...DEFAULT_SKILL_ABILITY_MAP.dex],
    con: [...DEFAULT_SKILL_ABILITY_MAP.con],
    int: [...DEFAULT_SKILL_ABILITY_MAP.int],
    wis: [...DEFAULT_SKILL_ABILITY_MAP.wis],
    cha: [...DEFAULT_SKILL_ABILITY_MAP.cha.filter((s) => s !== 'Use the Force')]
  };
  dedupePush(map, executionAbility, 'Use the Force');
  return map;
}

export function getSkillAbility(skillName) {
  const needle = norm(skillName);
  const map = getConfiguredSkillAbilityMap();
  for (const [ability, skills] of Object.entries(map)) {
    if (skills.some((entry) => needle.includes(norm(entry)) || norm(entry).includes(needle))) {
      return ability;
    }
  }
  return null;
}

function applyClassWeights(abilityWeights, classModel) {
  const className = String(classModel?.name || classModel?.label || classModel?.id || '').toLowerCase();
  const match = Object.entries(CLASS_WEIGHT_MAP).find(([key]) => className.includes(key));
  if (!match) return null;
  const [matchedKey, weights] = match;
  for (const [ability, value] of Object.entries(weights || {})) {
    if (abilityWeights[ability] !== undefined) abilityWeights[ability] += Number(value || 0);
  }
  return matchedKey;
}

export function extractSpeciesMods(shell = null, pendingData = {}) {
  const species = getSpeciesSource(shell, pendingData);
  const raw = species?.abilityScores || species?.speciesData?.abilityScores || species?.values || {};
  return {
    str: Number(raw.str ?? raw.STR ?? 0) || 0,
    dex: Number(raw.dex ?? raw.DEX ?? 0) || 0,
    con: Number(raw.con ?? raw.CON ?? 0) || 0,
    int: Number(raw.int ?? raw.INT ?? 0) || 0,
    wis: Number(raw.wis ?? raw.WIS ?? 0) || 0,
    cha: Number(raw.cha ?? raw.CHA ?? 0) || 0
  };
}

export function buildAttributePlanningProfile({ actor = null, pendingData = {}, shell = null } = {}) {
  const allowedAbilities = getAssignableAbilityKeys(shell, pendingData);
  const abilityWeights = emptyAbilityMap(0, allowedAbilities);
  const species = getSpeciesSource(shell, pendingData);
  const speciesMods = extractSpeciesMods(shell, pendingData);
  const surveyBias = pendingData?.mentorBiases || actor?.system?.swse?.mentorBuildIntentBiases || {};
  const classSelection = pendingData?.selectedClass || pendingData?.classes?.[0] || shell?.progressionSession?.getSelection?.('class') || null;
  const classModel = resolveClassModel(classSelection);
  const classSkills = getClassSkills(classModel);
  const reasons = [];

  for (const [ability, mod] of Object.entries(speciesMods)) {
    if (!allowedAbilities.includes(ability)) continue;
    if (mod > 0) {
      abilityWeights[ability] += mod * 3.0;
      reasons.push(`species:${ability}+${mod}`);
    } else if (mod < 0) {
      abilityWeights[ability] -= Math.abs(mod) * 0.45;
      reasons.push(`species:${ability}${mod}`);
    }
  }

  const matchedClassKey = classModel ? applyClassWeights(abilityWeights, classModel) : null;
  if (matchedClassKey) reasons.push(`class:${matchedClassKey}`);

  for (const [ability, value] of Object.entries(surveyBias.attributeBiasWeights || {})) {
    if (abilityWeights[ability] !== undefined) {
      abilityWeights[ability] += Number(value || 0) * 2.25;
      reasons.push(`survey-attribute:${ability}`);
    }
  }

  for (const [skill, weight] of Object.entries(surveyBias.skillBiasWeights || {})) {
    const ability = getSkillAbility(skill);
    if (ability && abilityWeights[ability] !== undefined) {
      abilityWeights[ability] += Number(weight || 0) * 1.35;
      reasons.push(`survey-skill:${skill}->${ability}`);
    }
  }

  if (classSkills?.length) {
    for (const skillRef of classSkills) {
      const skillName = skillRef?.name || skillRef?.label || skillRef?.id || skillRef;
      const ability = getSkillAbility(skillName);
      if (ability && abilityWeights[ability] !== undefined) abilityWeights[ability] += 1.0;
    }
    reasons.push('class-skills');
  }

  const { capacityAbility, executionAbility } = getForceAbilityConfig();
  const featWeights = surveyBias.featBiasWeights || {};
  const talentWeights = surveyBias.talentBiasWeights || {};
  const forceLean = Number(featWeights.force_training || 0)
    + Number(featWeights.skill_focus_use_the_force || 0)
    + Number(talentWeights.force || 0)
    + Number(talentWeights.force_support || 0);
  if (forceLean > 0) {
    if (abilityWeights[capacityAbility] !== undefined) abilityWeights[capacityAbility] += 1.5 + forceLean * 0.75;
    if (abilityWeights[executionAbility] !== undefined) abilityWeights[executionAbility] += 1.0 + forceLean * 0.5;
    reasons.push(`force-axes:${capacityAbility}/${executionAbility}`);
  }

  if (abilityWeights.con !== undefined) abilityWeights.con += 0.8;
  if (abilityWeights.dex !== undefined) abilityWeights.dex += 0.8;
  if (abilityWeights.wis !== undefined) abilityWeights.wis += 0.35;

  return {
    abilityWeights,
    species,
    speciesName: getSpeciesName(species),
    speciesTags: getSpeciesTags(species),
    speciesMods,
    classModel,
    classSkills,
    surveyBias,
    forceAxes: { capacityAbility, executionAbility },
    reasons,
    allowedAbilities,
    recommendedStyle: chooseRecommendedStyle({ abilityWeights, speciesMods, allowedAbilities })
  };
}

export function rankAbilitiesForPlan(profile, options = {}) {
  const styleWeights = deriveStyleWeights(profile, options.style || 'balanced');
  return Object.entries(styleWeights)
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .map(([ability]) => ability);
}

function deriveStyleWeights(profile, style = 'balanced') {
  const allowed = profile.allowedAbilities || ABILITY_KEYS;
  const out = emptyAbilityMap(0, allowed);
  for (const ability of allowed) out[ability] = Number(profile.abilityWeights?.[ability] || 0);

  const positiveSpecies = topPositiveSpeciesAbilities(profile.speciesMods, allowed, 2);
  const negativeSpecies = topNegativeSpeciesAbilities(profile.speciesMods, allowed, 2);

  if (style === 'amplify') {
    positiveSpecies.forEach((ability, index) => { out[ability] += index === 0 ? 3.0 : 2.0; });
    negativeSpecies.forEach((ability) => { out[ability] -= 0.4; });
  } else if (style === 'mitigate') {
    negativeSpecies.forEach((ability, index) => { out[ability] += index === 0 ? 3.0 : 2.0; });
    if (out.con !== undefined) out.con += 1.2;
    if (out.dex !== undefined) out.dex += 1.0;
    if (out.wis !== undefined) out.wis += 0.5;
  } else {
    if (out.dex !== undefined) out.dex += 1.1;
    if (out.con !== undefined) out.con += 1.1;
    if (out.wis !== undefined) out.wis += 0.6;
    positiveSpecies.forEach((ability, index) => { out[ability] += index === 0 ? 1.4 : 0.8; });
    negativeSpecies.forEach((ability) => { out[ability] += 0.6; });
  }

  return out;
}

function buildFloorTargets(profile, style = 'balanced') {
  const allowed = profile.allowedAbilities || ABILITY_KEYS;
  const floors = emptyAbilityMap(POINT_BUY_BASE, allowed);
  const positiveSpecies = topPositiveSpeciesAbilities(profile.speciesMods, allowed, 2);
  const negativeSpecies = topNegativeSpeciesAbilities(profile.speciesMods, allowed, 2);
  const ordered = rankAbilitiesForPlan(profile, { style });
  const primary = ordered[0];
  const secondary = ordered[1];

  if (style === 'amplify') {
    if (primary) floors[primary] = Math.max(floors[primary], 14);
    if (secondary) floors[secondary] = Math.max(floors[secondary], 12);
    positiveSpecies.forEach((ability, index) => {
      floors[ability] = Math.max(floors[ability], index === 0 ? 14 : 12);
    });
    if (floors.dex !== undefined) floors.dex = Math.max(floors.dex, 10);
    if (floors.con !== undefined) floors.con = Math.max(floors.con, 10);
  } else if (style === 'mitigate') {
    if (primary) floors[primary] = Math.max(floors[primary], 13);
    if (secondary) floors[secondary] = Math.max(floors[secondary], 12);
    negativeSpecies.forEach((ability) => {
      floors[ability] = Math.max(floors[ability], 10);
    });
    if (floors.dex !== undefined) floors.dex = Math.max(floors.dex, 12);
    if (floors.con !== undefined) floors.con = Math.max(floors.con, 12);
  } else {
    if (primary) floors[primary] = Math.max(floors[primary], 13);
    if (secondary) floors[secondary] = Math.max(floors[secondary], 12);
    if (floors.dex !== undefined) floors.dex = Math.max(floors.dex, 12);
    if (floors.con !== undefined) floors.con = Math.max(floors.con, 12);
    if (floors.wis !== undefined) floors.wis = Math.max(floors.wis, 10);
  }

  return floors;
}

function totalPointSpend(attrs = {}, allowed = ABILITY_KEYS) {
  return allowed.reduce((sum, ability) => {
    const score = Number(attrs[ability] || POINT_BUY_BASE);
    return sum + (getPointCost(score) - getPointCost(POINT_BUY_BASE));
  }, 0);
}

function incrementCost(current, next) {
  return getPointCost(next) - getPointCost(current);
}

function nextBreakpoint(currentBase, speciesMod = 0) {
  const currentFinal = currentBase + speciesMod;
  const currentMod = modifier(currentFinal);
  for (let next = currentBase + 1; next <= 18; next++) {
    if (modifier(next + speciesMod) > currentMod) return next;
  }
  return null;
}

function applyFloors(attrs, floors, pool, allowed) {
  const orderedFloors = Object.entries(floors || {})
    .filter(([ability, floor]) => allowed.includes(ability) && Number(floor) > POINT_BUY_BASE)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  for (const [ability, floor] of orderedFloors) {
    while (attrs[ability] < floor) {
      const next = attrs[ability] + 1;
      const added = incrementCost(attrs[ability], next);
      if (totalPointSpend(attrs, allowed) + added > pool) return attrs;
      attrs[ability] = next;
    }
  }
  return attrs;
}

function bestBreakpointUpgrade(attrs, weights, speciesMods, pool, allowed) {
  const spent = totalPointSpend(attrs, allowed);
  let best = null;

  for (const ability of allowed) {
    const current = Number(attrs[ability] || POINT_BUY_BASE);
    if (current >= 18) continue;
    const bp = nextBreakpoint(current, Number(speciesMods?.[ability] || 0));
    if (!bp) continue;
    const deltaCost = incrementCost(current, bp);
    if (spent + deltaCost > pool) continue;
    const currentFinal = current + Number(speciesMods?.[ability] || 0);
    const nextFinal = bp + Number(speciesMods?.[ability] || 0);
    const modGain = modifier(nextFinal) - modifier(currentFinal);
    if (modGain <= 0) continue;
    const weight = Number(weights?.[ability] || 0.1);
    const score = (weight * (modGain * 10)) / Math.max(deltaCost, 1);
    if (!best || score > best.score || (score === best.score && weight > best.weight)) {
      best = { ability, next: bp, deltaCost, score, weight };
    }
  }

  return best;
}

function bestPartialUpgrade(attrs, weights, speciesMods, pool, allowed) {
  const spent = totalPointSpend(attrs, allowed);
  let best = null;

  for (const ability of allowed) {
    const current = Number(attrs[ability] || POINT_BUY_BASE);
    const next = current + 1;
    if (next > 18) continue;
    const deltaCost = incrementCost(current, next);
    if (spent + deltaCost > pool) continue;
    const currentFinal = current + Number(speciesMods?.[ability] || 0);
    const nextFinal = next + Number(speciesMods?.[ability] || 0);
    const deltaToBreakpoint = Math.max(0, nextBreakpoint(current, Number(speciesMods?.[ability] || 0)) - current);
    const modGain = modifier(nextFinal) - modifier(currentFinal);
    const weight = Number(weights?.[ability] || 0.1);
    const setupBonus = modGain > 0 ? 3 : deltaToBreakpoint <= 2 ? 0.8 : 0.15;
    const score = (weight + setupBonus) / Math.max(deltaCost, 1);
    if (!best || score > best.score || (score === best.score && weight > best.weight)) {
      best = { ability, next, deltaCost, score, weight, immediate: modGain > 0 };
    }
  }

  return best;
}

export function planPointBuyAllocation(profile, pool = 25, options = {}) {
  const style = options.style || profile.recommendedStyle || 'balanced';
  const allowed = profile.allowedAbilities || ABILITY_KEYS;
  const weights = deriveStyleWeights(profile, style);
  const attrs = emptyAbilityMap(POINT_BUY_BASE, allowed);
  const floors = buildFloorTargets(profile, style);

  applyFloors(attrs, floors, pool, allowed);

  while (true) {
    const upgrade = bestBreakpointUpgrade(attrs, weights, profile.speciesMods, pool, allowed);
    if (!upgrade) break;
    attrs[upgrade.ability] = upgrade.next;
  }

  while (totalPointSpend(attrs, allowed) < pool) {
    const partial = bestPartialUpgrade(attrs, weights, profile.speciesMods, pool, allowed);
    if (!partial) break;
    attrs[partial.ability] = partial.next;
  }

  return attrs;
}

function abilityArrayToObject(values = [], allowed = ABILITY_KEYS) {
  const out = {};
  allowed.forEach((ability, index) => {
    out[ability] = Number(values[index] ?? null);
  });
  return out;
}

export function planPooledAssignment(values, profile, mode = 'standard', options = {}) {
  const style = options.style || profile.recommendedStyle || 'balanced';
  const ordered = rankAbilitiesForPlan(profile, { style });
  const result = {};

  if (mode === 'organic') {
    const sorted = [...values].map(Number).filter(Number.isFinite).sort((a, b) => b - a);
    let cursor = 0;
    for (const ability of ordered) {
      result[ability] = sorted.slice(cursor, cursor + 3);
      cursor += 3;
    }
    return result;
  }

  const sorted = [...values].map(Number).filter(Number.isFinite).sort((a, b) => b - a);
  for (let i = 0; i < ordered.length; i++) {
    result[ordered[i]] = sorted[i] ?? null;
  }
  return result;
}

function assignmentToBaseValues(assignment, mode, allowed) {
  if (mode === 'organic') {
    const out = {};
    for (const ability of allowed) {
      const dice = Array.isArray(assignment?.[ability]) ? assignment[ability] : [];
      out[ability] = dice.length ? dice.reduce((sum, value) => sum + Number(value || 0), 0) : null;
    }
    return out;
  }

  const out = {};
  for (const ability of allowed) {
    const value = assignment?.[ability];
    out[ability] = Number.isFinite(Number(value)) ? Number(value) : null;
  }
  return out;
}

function finalScoresFromBase(baseScores = {}, speciesMods = {}, allowed = ABILITY_KEYS) {
  const out = {};
  for (const ability of allowed) {
    const base = Number(baseScores?.[ability]);
    out[ability] = Number.isFinite(base)
      ? base + Number(speciesMods?.[ability] || 0)
      : null;
  }
  return out;
}

function strongestAbilitiesFromScores(finalScores = {}, allowed = ABILITY_KEYS, limit = 2) {
  return Object.entries(finalScores)
    .filter(([ability, value]) => allowed.includes(ability) && Number.isFinite(Number(value)))
    .sort((a, b) => (modifier(Number(b[1])) - modifier(Number(a[1]))) || (Number(b[1]) - Number(a[1])) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([ability]) => ability);
}

function weakestAbilitiesFromScores(finalScores = {}, allowed = ABILITY_KEYS, limit = 2) {
  return Object.entries(finalScores)
    .filter(([ability, value]) => allowed.includes(ability) && Number.isFinite(Number(value)))
    .sort((a, b) => (modifier(Number(a[1])) - modifier(Number(b[1]))) || (Number(a[1]) - Number(b[1])) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([ability]) => ability);
}

function buildPlanSummary(style) {
  return ATTRIBUTE_REASON_MAP?.styles?.[style]?.summary || '';
}

function buildPlanSubtitle(style) {
  return ATTRIBUTE_REASON_MAP?.styles?.[style]?.subtitle || '';
}

function buildPlanTitle(style, profile) {
  if (style === 'amplify' && !topPositiveSpeciesAbilities(profile.speciesMods, profile.allowedAbilities, 1).length) {
    return 'Focused Build';
  }
  if (style === 'mitigate' && !topNegativeSpeciesAbilities(profile.speciesMods, profile.allowedAbilities, 1).length) {
    return 'Safety Net Build';
  }
  return ATTRIBUTE_REASON_MAP?.styles?.[style]?.title || style;
}

function toReasonList(list) {
  return list.filter(Boolean);
}

function buildOutlookReasons(primaryAbility, secondaryAbility) {
  const reasons = [];
  const primaryConfig = ATTRIBUTE_REASON_MAP?.abilityOutlooks?.[primaryAbility];
  if (primaryConfig?.reason) {
    reasons.push(ReasonFactory.strong('attributes', `FOCUS_${String(primaryAbility).toUpperCase()}`, renderTemplate(primaryConfig.reason, { ability: labelForAbility(primaryAbility) })));
  }
  if (secondaryAbility && secondaryAbility !== primaryAbility) {
    const secondaryConfig = ATTRIBUTE_REASON_MAP?.abilityOutlooks?.[secondaryAbility];
    if (secondaryConfig?.reason) {
      reasons.push(ReasonFactory.moderate('attributes', `SUPPORT_${String(secondaryAbility).toUpperCase()}`, renderTemplate(secondaryConfig.reason, { ability: labelForAbility(secondaryAbility) })));
    }
  }
  return reasons;
}

function buildForecastReasons(primaryAbility, secondaryAbility) {
  const reasons = [];
  const abilities = [primaryAbility, secondaryAbility].filter(Boolean);
  for (const ability of abilities) {
    const config = ATTRIBUTE_REASON_MAP?.abilityOutlooks?.[ability];
    if (config?.forecast) {
      reasons.push(ReasonFactory.moderate('forecast', `FORECAST_${String(ability).toUpperCase()}`, renderTemplate(config.forecast, { ability: labelForAbility(ability) })));
    }
  }
  return reasons.slice(0, 2);
}

function buildCautionReasons(style, weakestAbilities = [], finalScores = {}, allowed = ABILITY_KEYS) {
  const cautions = [];
  const styleCaution = ATTRIBUTE_REASON_MAP?.styles?.[style]?.caution;
  if (styleCaution) cautions.push(ReasonFactory.moderate('attributes', `STYLE_${String(style).toUpperCase()}_CAUTION`, styleCaution));

  for (const ability of weakestAbilities.slice(0, 2)) {
    if (!allowed.includes(ability)) continue;
    const score = Number(finalScores?.[ability]);
    if (Number.isFinite(score) && score <= 10) {
      cautions.push(ReasonFactory.weak('attributes', `LOW_${String(ability).toUpperCase()}`, `${labelForAbility(ability)} stays modest here, so that lane may feel weaker until later improvements.`));
    }
  }

  return cautions.slice(0, 2);
}

function buildPlanReasonPacket({ style, profile, method, pool, values, baseScores, finalScores }) {
  const allowed = profile.allowedAbilities || ABILITY_KEYS;
  const primaryAbility = strongestAbilitiesFromScores(finalScores, allowed, 2)[0] || topAbilitiesFromWeights(profile.abilityWeights, allowed, 1)[0];
  const secondaryAbility = strongestAbilitiesFromScores(finalScores, allowed, 2)[1] || topAbilitiesFromWeights(profile.abilityWeights, allowed, 2)[1];
  const weakestAbilities = weakestAbilitiesFromScores(finalScores, allowed, 2);
  const positiveSpecies = topPositiveSpeciesAbilities(profile.speciesMods, allowed, 2);
  const negativeSpecies = topNegativeSpeciesAbilities(profile.speciesMods, allowed, 2);

  const reasons = [
    buildSpeciesReason('breakpoint_focus'),
    method === 'point-buy'
      ? buildSpeciesReason('live_budget', { budget: pool })
      : buildSpeciesReason('live_pool')
  ];

  if (style === 'amplify') {
    positiveSpecies.forEach((ability, index) => {
      reasons.push(buildSpeciesReason('species_bonus_amplified', { ability: labelForAbility(ability) }, index === 0 ? 0.9 : 0.82));
    });
  }

  if (style === 'mitigate') {
    negativeSpecies.forEach((ability, index) => {
      reasons.push(buildSpeciesReason('species_penalty_mitigated', { ability: labelForAbility(ability) }, index === 0 ? 0.9 : 0.82));
    });
  }

  if (!positiveSpecies.length && !negativeSpecies.length) {
    reasons.push(buildSpeciesReason('species_signal_absent', {}, 0.8));
  }

  if (method === 'point-buy') {
    const oddAbility = allowed.find((ability) => Number(baseScores?.[ability]) % 2 === 1 && Number(baseScores?.[ability]) >= 13);
    if (oddAbility) reasons.push(buildSpeciesReason('odd_score_setup', { ability: labelForAbility(oddAbility) }, 0.62));
  } else {
    const strongest = strongestAbilitiesFromScores(baseScores, allowed, 1)[0];
    if (strongest) reasons.push(buildSpeciesReason('top_roll_assignment', { ability: labelForAbility(strongest) }, 0.84));
  }

  const primaryReasons = toReasonList([
    ...buildOutlookReasons(primaryAbility, secondaryAbility),
    ...reasons
  ]);
  const forecastReasons = buildForecastReasons(primaryAbility, secondaryAbility);
  const cautionReasons = buildCautionReasons(style, weakestAbilities, finalScores, allowed);

  const summary = buildPlanSummary(style);
  const topReason = primaryReasons[0]?.text || summary || 'This is a solid starting spread.';

  return {
    summary,
    reasonSummary: topReason,
    reasons: primaryReasons.slice(0, 4),
    cautions: cautionReasons,
    forecasts: forecastReasons,
    bullets: [
      ...primaryReasons.map((reason) => reason.text),
      ...forecastReasons.map((reason) => reason.text),
      ...cautionReasons.map((reason) => reason.text)
    ].filter(Boolean).slice(0, 5)
  };
}

function buildPlanDisplayRows(baseScores, finalScores, speciesMods, allowed) {
  return allowed.map((ability) => {
    const base = baseScores?.[ability];
    const finalScore = finalScores?.[ability];
    const speciesMod = Number(speciesMods?.[ability] || 0);
    return {
      id: ability,
      label: labelForAbility(ability),
      base: Number.isFinite(Number(base)) ? Number(base) : '—',
      speciesMod,
      speciesModFormatted: speciesMod > 0 ? `+${speciesMod}` : `${speciesMod}`,
      final: Number.isFinite(Number(finalScore)) ? Number(finalScore) : '—',
      modifier: Number.isFinite(Number(finalScore)) ? (modifier(Number(finalScore)) >= 0 ? `+${modifier(Number(finalScore))}` : `${modifier(Number(finalScore))}`) : '—'
    };
  });
}

function createBuildPlan({ style, profile, method, pool, values, baseScores, assignment = null }) {
  const allowed = profile.allowedAbilities || ABILITY_KEYS;
  const finalScores = finalScoresFromBase(baseScores, profile.speciesMods, allowed);
  const reasonPacket = buildPlanReasonPacket({ style, profile, method, pool, values, baseScores, finalScores });
  return {
    id: style,
    style,
    title: buildPlanTitle(style, profile),
    subtitle: buildPlanSubtitle(style),
    recommended: style === (profile.recommendedStyle || 'balanced'),
    summary: reasonPacket.summary,
    reasonSummary: reasonPacket.reasonSummary,
    reasons: reasonPacket.reasons,
    cautions: reasonPacket.cautions,
    forecasts: reasonPacket.forecasts,
    bullets: reasonPacket.bullets,
    baseScores,
    finalScores,
    displayRows: buildPlanDisplayRows(baseScores, finalScores, profile.speciesMods, allowed),
    pointBuySpent: method === 'point-buy' ? totalPointSpend(baseScores, allowed) : null,
    poolSource: method === 'point-buy' ? `Live ${pool}-point budget` : 'Live generated pool',
    assignment
  };
}

export function buildSuggestedAttributeBuilds({ actor = null, pendingData = {}, shell = null, method = 'point-buy', pool = 25, values = [], arrayType = 'standard' } = {}) {
  const profile = buildAttributePlanningProfile({ actor, pendingData, shell });
  const builds = [];

  for (const style of STYLE_IDS) {
    if (method === 'point-buy') {
      const baseScores = planPointBuyAllocation(profile, pool, { style });
      builds.push(createBuildPlan({ style, profile, method, pool, values, baseScores }));
      continue;
    }

    const assignment = planPooledAssignment(values, profile, method === 'organic' ? 'organic' : 'standard', { style, arrayType });
    const baseScores = assignmentToBaseValues(assignment, method === 'organic' ? 'organic' : 'standard', profile.allowedAbilities || ABILITY_KEYS);
    builds.push(createBuildPlan({ style, profile, method, pool, values, baseScores, assignment }));
  }

  return builds;
}

export function getAttributePlanningTelemetry(plan, profile) {
  const allowed = profile.allowedAbilities || ABILITY_KEYS;
  const strongest = strongestAbilitiesFromScores(plan.finalScores || {}, allowed, 2);
  return {
    style: plan.style,
    recommended: plan.recommended,
    strongest,
    weakest: weakestAbilitiesFromScores(plan.finalScores || {}, allowed, 2)
  };
}

export function abilityBiasForecast(ability) {
  const entry = ATTRIBUTE_BIAS_MAP?.[ability] || {};
  return {
    mechanicalBias: entry.mechanicalBias || {},
    roleBias: entry.roleBias || {}
  };
}
