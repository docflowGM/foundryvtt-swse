/**
 * ProgressionEconomyPlanBuilder
 *
 * Domain compiler for progression HP, credits, Wealth, and Force Point economy.
 *
 * This module is side-effect free. It returns mutation-plan set fragments for the
 * finalizer to merge and apply through ActorEngine.
 */

import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';
import { ProgressionRules } from '/systems/foundryvtt-swse/scripts/engine/progression/ProgressionRules.js';
import { calculateMaxForcePointsForBuildPlan } from '/systems/foundryvtt-swse/scripts/data/force-points.js';
import { buildLevelUpEventContext } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-event-context.js';

function abilityMod(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2);
}

function classKey(classSelection = null) {
  return String(classSelection?.name || classSelection?.label || classSelection?.id || classSelection || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function parseMaxCredits(value) {
  if (Number.isFinite(Number(value))) return Number(value);
  const match = String(value || '').match(/(\d+)d(\d+)\s*(?:x|×|\*)\s*(\d+)/i);
  if (!match) return 0;
  return Number(match[1]) * Number(match[2]) * Number(match[3]);
}

function normalizeNameKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
}

function selectionListHasName(values = [], acceptedNames = []) {
  const accepted = new Set(acceptedNames.map(name => normalizeNameKey(name)).filter(Boolean));
  for (const value of Array.isArray(values) ? values : []) {
    const candidates = [value?.name, value?.label, value?.id, value?._id, value?.slug, value?.system?.name, value?.system?.canonicalName, typeof value === 'string' ? value : null];
    if (candidates.some(candidate => accepted.has(normalizeNameKey(candidate)))) return true;
  }
  return false;
}

function collectSelectionEntries(selections = {}, domainHints = []) {
  const hints = domainHints.map(hint => String(hint || '').toLowerCase());
  const out = [];
  const visit = (value) => {
    if (!value) return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (typeof value === 'object') {
      out.push(value);
      for (const key of ['selected', 'selection', 'value', 'item', 'entry', 'choice', 'candidate', 'talent', 'feat']) {
        if (value[key] && value[key] !== value) visit(value[key]);
      }
      return;
    }
    out.push(value);
  };
  for (const [key, value] of Object.entries(selections || {})) {
    const normalizedKey = String(key || '').toLowerCase();
    if (!hints.length || hints.some(hint => normalizedKey.includes(hint))) visit(value);
  }
  return out;
}

function hasWealthTalentSelection(selections = {}) {
  const talentSelections = [
    ...(Array.isArray(selections.talents) ? selections.talents : []),
    ...collectSelectionEntries(selections, ['talent']),
  ];
  return selectionListHasName(talentSelections, ['Wealth']);
}

function actorHasWealthTalent(actor) {
  return actor?.items?.some?.(item => item?.type === 'talent' && selectionListHasName([item], ['Wealth'])) === true;
}

function isLineageEligibleClass(classSelection = null) {
  const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
  const treeIds = [
    ...(Array.isArray(classModel?.system?.talentTreeIds) ? classModel.system.talentTreeIds : []),
    ...(Array.isArray(classModel?.system?.talentTrees) ? classModel.system.talentTrees : []),
    ...(Array.isArray(classModel?.talentTreeIds) ? classModel.talentTreeIds : []),
    ...(Array.isArray(classModel?.talentTrees) ? classModel.talentTrees : []),
    ...(Array.isArray(classSelection?.system?.talentTreeIds) ? classSelection.system.talentTreeIds : []),
    ...(Array.isArray(classSelection?.system?.talentTrees) ? classSelection.system.talentTrees : []),
  ].map(tree => normalizeNameKey(tree?.id || tree?.key || tree?.name || tree));
  if (treeIds.includes('lineage')) return true;

  const key = normalizeNameKey(classModel?.name || classModel?.label || classModel?.id || classSelection?.name || classSelection);
  return key === 'noble' || key === 'corporateagent';
}

function computePendingLineageEligibleLevel(selections = {}, sessionState = {}) {
  if (!isLineageEligibleClass(selections.class)) return 0;
  const rawLevel = Number(selections?.survey?.startingLevel ?? sessionState?.targetLevel ?? sessionState?.progressionSession?.targetLevel ?? 1) || 1;
  return Math.max(1, Math.floor(rawLevel));
}

function computeWealthCreditGrant(selections = {}, actor = null, sessionState = {}) {
  if (!hasWealthTalentSelection(selections)) return 0;
  const lineageLevel = computePendingLineageEligibleLevel(selections, sessionState);
  return Math.max(0, lineageLevel * 5000);
}

function withWealthProgressionHistory(actor, selections = {}, sessionState = {}) {
  const raw = actor?.flags?.swse?.progressionHistory || actor?.getFlag?.('swse', 'progressionHistory') || {};
  const history = globalThis.foundry?.utils?.deepClone ? foundry.utils.deepClone(raw) : JSON.parse(JSON.stringify(raw || {}));
  const key = 'swse.talent.wealth';
  const lineageLevel = computePendingLineageEligibleLevel(selections, sessionState);
  const existing = history[key] || { levelsGranted: [] };
  const levels = new Set((Array.isArray(existing.levelsGranted) ? existing.levelsGranted : []).map(Number).filter(Number.isFinite));
  for (let level = 1; level <= lineageLevel; level += 1) levels.add(level);
  history[key] = {
    ...existing,
    levelsGranted: Array.from(levels).sort((a, b) => a - b),
    lastGrantedAt: existing.lastGrantedAt || new Date().toISOString(),
    lastGrantedCredits: existing.lastGrantedCredits || lineageLevel * 5000,
    source: existing.source || 'chargen-finalizer',
  };
  return history;
}

function readClassLevelValue(classEntry = null) {
  return Math.max(0, Number(classEntry?.system?.level ?? classEntry?.system?.levels ?? classEntry?.system?.rank ?? classEntry?.level ?? classEntry?.classLevel ?? 0) || 0);
}

function classAggregationKey(classEntry = null) {
  return normalizeNameKey(classEntry?.system?.classId || classEntry?.system?.sourceId || classEntry?.system?.className || classEntry?.classId || classEntry?.sourceId || classEntry?.id || classEntry?.name || classEntry?.className || classEntry);
}

function resolveLevelupSelectedClass(selections = {}, sessionState = {}) {
  return selections?.class || sessionState?.progressionSession?.getSelection?.('class') || sessionState?.progressionSession?.draftSelections?.class || sessionState?.draftSelections?.class || sessionState?.class || null;
}

function getLineageEligibleClassLevelCountAfterLevelup(actor, selections = {}, sessionState = {}) {
  const lineageLevelsByClass = new Map();
  const addClassLevel = (classEntry) => {
    if (!classEntry || !isLineageEligibleClass(classEntry)) return;
    const key = classAggregationKey(classEntry);
    if (!key) return;
    const level = readClassLevelValue(classEntry);
    lineageLevelsByClass.set(key, Math.max(lineageLevelsByClass.get(key) || 0, level));
  };
  for (const classItem of actor?.items || []) if (classItem?.type === 'class') addClassLevel(classItem);
  for (const classEntry of Array.isArray(actor?.system?.classes) ? actor.system.classes : []) addClassLevel(classEntry);
  for (const classEntry of Array.isArray(actor?.system?.progression?.classLevels) ? actor.system.progression.classLevels : []) addClassLevel(classEntry);
  let lineageLevelCount = Array.from(lineageLevelsByClass.values()).reduce((sum, level) => sum + level, 0);
  const selectedClass = resolveLevelupSelectedClass(selections, sessionState);
  if (isLineageEligibleClass(selectedClass)) lineageLevelCount += 1;
  return lineageLevelCount;
}

function getLevelupCharacterLevelKey(actor, selections = {}, sessionState = {}) {
  try {
    const levelContext = buildLevelUpEventContext(actor, sessionState.progressionSession, { selectedClass: selections.class });
    const enteringLevel = Number(levelContext?.enteringLevel);
    if (Number.isFinite(enteringLevel) && enteringLevel > 0) return Math.floor(enteringLevel);
  } catch (_err) {}
  const fallback = Number(sessionState?.targetLevel ?? actor?.system?.level ?? 1);
  return Number.isFinite(fallback) ? Math.max(1, Math.floor(fallback)) : 1;
}

function computeLevelupWealthCreditGrant(actor, selections = {}, sessionState = {}) {
  if (!hasWealthTalentSelection(selections) && !actorHasWealthTalent(actor)) return 0;
  const history = actor?.flags?.swse?.progressionHistory || actor?.getFlag?.('swse', 'progressionHistory') || {};
  const characterLevel = getLevelupCharacterLevelKey(actor, selections, sessionState);
  const grantedCharLevels = history?.['swse.talent.wealth']?.characterLevelsGranted || [];
  if (grantedCharLevels.map(Number).includes(characterLevel)) return 0;
  const lineageLevelCount = getLineageEligibleClassLevelCountAfterLevelup(actor, selections, sessionState);
  return Math.max(0, lineageLevelCount * 5000);
}

function withLevelupWealthProgressionHistory(actor, selections = {}, sessionState = {}, creditDelta = 0) {
  const raw = actor?.flags?.swse?.progressionHistory || actor?.getFlag?.('swse', 'progressionHistory') || {};
  const history = globalThis.foundry?.utils?.deepClone ? foundry.utils.deepClone(raw) : JSON.parse(JSON.stringify(raw || {}));
  const key = 'swse.talent.wealth';
  const lineageLevelCount = getLineageEligibleClassLevelCountAfterLevelup(actor, selections, sessionState);
  const characterLevel = getLevelupCharacterLevelKey(actor, selections, sessionState);
  const existing = history[key] || { levelsGranted: [], characterLevelsGranted: [] };
  const levels = new Set((Array.isArray(existing.levelsGranted) ? existing.levelsGranted : []).map(Number).filter(Number.isFinite));
  for (let level = 1; level <= lineageLevelCount; level += 1) levels.add(level);
  const characterLevels = new Set((Array.isArray(existing.characterLevelsGranted) ? existing.characterLevelsGranted : []).map(Number).filter(Number.isFinite));
  characterLevels.add(characterLevel);
  history[key] = {
    ...existing,
    levelsGranted: Array.from(levels).sort((a, b) => a - b),
    characterLevelsGranted: Array.from(characterLevels).sort((a, b) => a - b),
    lastLineageLevelCount: lineageLevelCount,
    lastGrantedAt: new Date().toISOString(),
    lastGrantedCredits: creditDelta,
    source: 'levelup-finalizer',
  };
  return history;
}

function levelupCreditDeltaIncludesWealth(summary = {}, selections = {}, actor = null) {
  if (hasWealthTalentSelection(selections) || actorHasWealthTalent(actor)) return true;
  return (summary.creditDeltaSources || []).some(source => normalizeNameKey(source?.label || source?.source || '') === 'wealthtalent');
}

function resolveLevelUpCurrentHp({ currentHpValue = 0, hpGain = 0, nextHpMax = 1, mode = 'none' } = {}) {
  const current = Number(currentHpValue);
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const gain = Math.max(0, Number(hpGain || 0) || 0);
  const max = Math.max(1, Number(nextHpMax || 1) || 1);
  switch (mode) {
    case 'refillToMax': return max;
    case 'increaseCurrentByMaxGain': return Math.min(max, safeCurrent + gain);
    case 'none':
    default: return Math.min(max, safeCurrent);
  }
}

function extractClassHitDie(classSelection = null) {
  const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
  const explicit = classModel?.system?.hitDie ?? classModel?.system?.hit_die ?? classModel?.hitDie ?? classModel?.hit_die ?? null;
  if (Number.isFinite(Number(explicit))) return Number(explicit);
  const match = String(explicit || '').match(/d(\d+)/i);
  if (match) return Number(match[1]);
  const hitDice = {
    elite_trooper: 12, independent_droid: 12,
    assassin: 10, bounty_hunter: 10, droid_commander: 10, gladiator: 10, imperial_knight: 10, jedi: 10, jedi_knight: 10, jedi_master: 10, master_privateer: 10, martial_arts_master: 10, pathfinder: 10, sith_apprentice: 10, sith_lord: 10, soldier: 10, vanguard: 10,
    ace_pilot: 8, beast_rider: 8, charlatan: 8, corporate_agent: 8, crime_lord: 8, enforcer: 8, force_adept: 8, force_disciple: 8, gunslinger: 8, improviser: 8, infiltrator: 8, medic: 8, melee_duelist: 8, military_engineer: 8, officer: 8, outlaw: 8, saboteur: 8, scout: 8, shaper: 8,
    noble: 6, scoundrel: 6, slicer: 6,
  };
  return hitDice[classKey(classModel)] || 6;
}

function computeStartingHP(classSelection, attrValues = {}, actor = null, droidBuild = null) {
  const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
  const key = classKey(classModel);
  const baseMap = { jedi: 30, soldier: 30, scout: 24, noble: 18, scoundrel: 18, force_adept: 24 };
  const base = Number(classModel?.system?.base_hp ?? classModel?.system?.baseHp ?? classModel?.baseHp ?? baseMap[key] ?? 18) || 18;
  const isDroid = !!droidBuild || actor?.type === 'droid' || actor?.system?.isDroid;
  const conMod = isDroid ? 0 : abilityMod(attrValues?.con ?? actor?.system?.attributes?.con?.base ?? actor?.system?.abilities?.con?.base ?? actor?.system?.abilities?.con?.value ?? 10);
  return { base, modifiers: conMod, total: Math.max(1, base + conMod) };
}

function computeStartingCredits(classSelection = null, backgroundSelection = null) {
  const classModel = ProgressionContentAuthority.resolveClass(classSelection) || classSelection || {};
  const authority = Number(ProgressionContentAuthority.getStartingCredits({ classSelection, backgroundSelection }) || 0) || 0;
  if (authority > 0) return authority;
  const classCredits = parseMaxCredits(classModel?.startingCredits ?? classModel?.system?.startingCredits ?? classModel?.system?.starting_credits ?? classSelection?.startingCredits ?? classSelection?.system?.starting_credits);
  const backgroundCredits = Number(backgroundSelection?.credits ?? backgroundSelection?.system?.credits ?? 0) || 0;
  if (classCredits + backgroundCredits > 0) return classCredits + backgroundCredits;
  const fallback = { soldier: 3000, scout: 3000, scoundrel: 3000, jedi: 1200, noble: 4800, force_adept: 1200 };
  return fallback[classKey(classModel)] || 0;
}

function getChargenStoreState(actor) {
  try { return actor?.getFlag?.('swse', 'chargenStore') || actor?.flags?.swse?.chargenStore || null; }
  catch (_err) { return actor?.flags?.swse?.chargenStore || null; }
}

function resolveFinalStartingCredits(actor, computedStartingCredits) {
  const computed = Math.max(0, Number(computedStartingCredits || 0));
  const storeState = getChargenStoreState(actor);
  if (!storeState?.initialized) return computed;
  const previousBudget = Math.max(0, Number(storeState.startingCredits || 0));
  const actorCredits = Math.max(0, Number(actor?.system?.credits ?? 0) || 0);
  if (previousBudget > 0 && computed > previousBudget) return actorCredits + (computed - previousBudget);
  return actorCredits;
}

function normalizeAttributeValues(attr = {}, actor = null) {
  const raw = attr?.values && typeof attr.values === 'object' ? attr.values : attr;
  const out = {};
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const value = raw?.[key] ?? raw?.[{ str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }[key]];
    const fallback = actor?.system?.attributes?.[key]?.base ?? actor?.system?.abilities?.[key]?.base ?? actor?.system?.abilities?.[key]?.value ?? 10;
    const score = Number(value?.score ?? value?.base ?? value?.value ?? value?.total ?? value ?? fallback);
    if (Number.isFinite(score)) out[key] = score;
  }
  return out;
}

export class ProgressionEconomyPlanBuilder {
  static buildChargenSet({ actor, selections = {}, sessionState = {}, isDroidProgression = false } = {}) {
    const set = {};
    const summary = selections.survey || {};
    const clazz = selections.class || null;
    const attrValues = normalizeAttributeValues(selections.attributes || {}, actor);
    const background = selections.background || null;

    const computedStartingHp = computeStartingHP(clazz, attrValues, actor, selections.droid).total;
    const startingHp = isDroidProgression ? computedStartingHp : (Number(summary.startingHp || 0) || computedStartingHp);
    if (Number.isFinite(startingHp) && startingHp > 0) {
      set['system.hp.value'] = startingHp;
      set['system.hp.max'] = startingHp;
    }

    const baseStartingCredits = computeStartingCredits(clazz, background);
    const explicitStartingCredits = Number(summary.startingCredits || 0) || 0;
    const wealthBonus = computeWealthCreditGrant(selections, actor, sessionState);
    const explicitSources = Array.isArray(summary.startingCreditsBreakdown) ? summary.startingCreditsBreakdown : [];
    const explicitIncludesWealth = explicitSources.some(source => normalizeNameKey(source?.label || source?.source || '') === 'wealthtalent');
    const startingCredits = explicitStartingCredits > 0
      ? explicitStartingCredits + (wealthBonus > 0 && !explicitIncludesWealth ? wealthBonus : 0)
      : baseStartingCredits + wealthBonus;
    if (Number.isFinite(startingCredits) && startingCredits > 0) set['system.credits'] = resolveFinalStartingCredits(actor, startingCredits);
    if (wealthBonus > 0) set['flags.swse.progressionHistory'] = withWealthProgressionHistory(actor, selections, sessionState);

    const startingLevel = Number(summary.startingLevel || 1) || 1;
    const startingForcePointMax = calculateMaxForcePointsForBuildPlan({
      actor,
      totalLevel: startingLevel,
      selectedClass: clazz,
      classLevels: [{
        class: clazz?.name || clazz?.label || String(clazz || 'Class'),
        classId: clazz?.id || clazz?.classId || clazz?.sourceId || normalizeNameKey(clazz),
        level: startingLevel,
      }],
    });
    set['system.forcePoints.max'] = startingForcePointMax;
    set['system.forcePoints.value'] = startingForcePointMax;
    set['system.progression.lastForcePointRefresh'] = {
      reason: 'chargen-finalization',
      previousValue: Number(actor?.system?.forcePoints?.value ?? 0) || 0,
      previousMax: Number(actor?.system?.forcePoints?.max ?? 0) || 0,
      newValue: startingForcePointMax,
      newMax: startingForcePointMax,
      timestamp: new Date().toISOString(),
    };

    return set;
  }

  static buildLevelUpSet({ actor, selections = {}, sessionState = {}, planSet = {}, isDroidProgression = false } = {}) {
    const set = {};
    const summary = selections.survey || {};
    const clazz = selections.class || null;

    let hpGain = Number(summary.hpGain || 0) || 0;
    if (isDroidProgression && hpGain > 0) {
      const hitDieOnlyMax = extractClassHitDie(clazz);
      if (Number.isFinite(hitDieOnlyMax) && hitDieOnlyMax > 0) hpGain = Math.min(hpGain, hitDieOnlyMax);
    }
    const currentHpMax = Number(actor?.system?.hp?.max ?? actor?.system?.derived?.hp?.max ?? 0) || 0;
    const currentHpValue = Number(actor?.system?.hp?.value ?? currentHpMax) || 0;
    if (hpGain > 0) {
      const nextHpMax = Math.max(1, currentHpMax + hpGain);
      const hpRecoveryMode = ProgressionRules.getLevelUpHpRecoveryMode();
      const nextHpValue = resolveLevelUpCurrentHp({ currentHpValue, hpGain, nextHpMax, mode: hpRecoveryMode });
      set['system.hp.max'] = nextHpMax;
      set['system.hp.value'] = nextHpValue;
      set['system.progression.lastHpGain'] = {
        amount: hpGain,
        method: summary.hpGainMethod || null,
        formula: summary.hpGainFormula || null,
        recoveryMode: hpRecoveryMode,
        previousValue: currentHpValue,
        previousMax: currentHpMax,
        newValue: nextHpValue,
        newMax: nextHpMax,
        timestamp: new Date().toISOString(),
      };
    }

    const targetLevel = Number(planSet['system.level'] || sessionState.targetLevel || sessionState.progressionSession?.targetLevel || (Number(actor?.system?.level || 1) + 1)) || 1;
    const classLevelsAfter = planSet['system.progression.classLevels'] || actor?.system?.progression?.classLevels || null;
    const nextForcePointMax = calculateMaxForcePointsForBuildPlan({ actor, totalLevel: targetLevel, selectedClass: clazz, classLevels: classLevelsAfter });
    set['system.forcePoints.max'] = nextForcePointMax;
    set['system.forcePoints.value'] = nextForcePointMax;
    set['system.progression.lastForcePointRefresh'] = {
      reason: 'level-up',
      previousValue: Number(actor?.system?.forcePoints?.value ?? 0) || 0,
      previousMax: Number(actor?.system?.forcePoints?.max ?? 0) || 0,
      newValue: nextForcePointMax,
      newMax: nextForcePointMax,
      timestamp: new Date().toISOString(),
    };

    const explicitCreditDelta = Number(summary.creditDelta || 0) || 0;
    const canonicalWealthDelta = computeLevelupWealthCreditGrant(actor, selections, sessionState);
    const includesWealth = levelupCreditDeltaIncludesWealth(summary, selections, actor) || canonicalWealthDelta > 0;
    const inferredCreditDelta = includesWealth ? Math.max(explicitCreditDelta, canonicalWealthDelta) : (explicitCreditDelta || canonicalWealthDelta);
    if (inferredCreditDelta !== 0) {
      const currentCredits = Math.max(0, Number(actor?.system?.credits ?? 0) || 0);
      set['system.credits'] = Math.max(0, currentCredits + inferredCreditDelta);
      const rawCreditSources = Array.isArray(summary.creditDeltaSources) ? summary.creditDeltaSources : [];
      const nonWealthSources = rawCreditSources.filter(source => normalizeNameKey(source?.label || source?.source || '') !== 'wealthtalent');
      const creditSources = includesWealth
        ? [...nonWealthSources, { label: 'Wealth Talent', amount: inferredCreditDelta, tone: 'wealth' }]
        : (rawCreditSources.length ? rawCreditSources : [{ label: 'Progression Credits', amount: inferredCreditDelta, tone: 'credits' }]);
      set['system.progression.lastCreditDelta'] = { amount: inferredCreditDelta, sources: creditSources, timestamp: new Date().toISOString() };
      if (includesWealth) set['flags.swse.progressionHistory'] = withLevelupWealthProgressionHistory(actor, selections, sessionState, inferredCreditDelta);
    }

    return set;
  }

  static buildSet({ actor, selections = {}, sessionState = {}, planSet = {}, isDroidProgression = false } = {}) {
    if (sessionState.mode === 'chargen') return this.buildChargenSet({ actor, selections, sessionState, isDroidProgression });
    if (sessionState.mode === 'levelup') return this.buildLevelUpSet({ actor, selections, sessionState, planSet, isDroidProgression });
    return {};
  }
}
