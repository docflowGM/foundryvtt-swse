import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { SecondWindRules } from "/systems/foundryvtt-swse/scripts/engine/combat/SecondWindRules.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;
let activeSecondWindApplication = null;

function normalizeKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  try { return foundry?.utils?.deepClone?.(value) ?? JSON.parse(JSON.stringify(value)); }
  catch (_err) { return JSON.parse(JSON.stringify(value)); }
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function abilityMod(actor, ability = 'con') {
  const key = String(ability || 'con').toLowerCase().slice(0, 3);
  const value = actor?.system?.derived?.attributes?.[key]?.mod
    ?? actor?.system?.abilities?.[key]?.mod
    ?? actor?.system?.attributes?.[key]?.mod
    ?? actor?.system?.derived?.abilities?.[key]?.mod
    ?? 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function itemSecondWindRules(item) {
  const rules = [];
  rules.push(...asArray(item?.system?.abilityMeta?.rules).filter(rule => normalizeKey(rule?.type ?? '').startsWith('second-wind')));
  rules.push(...asArray(item?.system?.abilityMeta?.secondWindRules));
  return rules.map(rule => ({ ...clone(rule), source: rule.source ?? item?.name, sourceName: item?.name, sourceId: item?.id }));
}

function collectSecondWindRiders(actor) {
  const riders = [];
  const system = actor?.system?.secondWind ?? {};
  riders.push(...asArray(system.riders).map(rule => ({ ...clone(rule), source: rule.source ?? 'Actor Second Wind', sourceName: rule.sourceName ?? 'Actor Second Wind' })));
  riders.push(...asArray(system.config?.riders).map(rule => ({ ...clone(rule), source: rule.source ?? 'Actor Second Wind Config', sourceName: rule.sourceName ?? 'Actor Second Wind Config' })));

  for (const item of actorItems(actor)) {
    if (!['feat', 'talent', 'species', 'class'].includes(item?.type) || item?.system?.disabled === true) continue;
    riders.push(...itemSecondWindRules(item));
  }
  return riders;
}

function normalizeActionCost(value) {
  const normalized = normalizeKey(value);
  if (normalized === 'free') return 'free';
  if (normalized === 'reaction') return 'reaction';
  if (normalized === 'move') return 'move';
  if (normalized === 'standard') return 'standard';
  if (normalized === 'full-round' || normalized === 'fullround') return 'full-round';
  return 'swift';
}

function addConModHealing(rules, actor, healing = {}) {
  const multiplier = Number(healing.conModMultiplier ?? healing.extraHealingConModMultiplier ?? healing.multiplierPerConMod);
  if (!Number.isFinite(multiplier)) return;
  const minimum = Number.isFinite(Number(healing.minimum ?? healing.min ?? 0)) ? Number(healing.minimum ?? healing.min ?? 0) : 0;
  const mod = abilityMod(actor, healing.ability ?? 'con');
  rules.extraHealing += Math.max(minimum, mod * multiplier);
}

function applySecondWindConfig(rules, config = {}, actor = null) {
  const encounter = config.encounter ?? {};
  if (Number.isFinite(Number(encounter.uses ?? config.encounterUses))) {
    rules.encounterUses = Math.max(1, Number(encounter.uses ?? config.encounterUses));
    rules.encounterUseCap = rules.encounterUses;
  }
  if (encounter.ignoreCap === true || config.ignoreEncounterCap === true) rules.ignoreEncounterCap = true;

  const daily = config.daily ?? {};
  if (Number.isFinite(Number(daily.baseUses ?? config.dailyBaseUses))) rules.dailyBaseUses = Math.max(1, Number(daily.baseUses ?? config.dailyBaseUses));
  if (Number.isFinite(Number(daily.flatBonus ?? daily.bonusUses ?? config.dailyUseBonus))) rules.dailyUseBonus += Math.max(0, Number(daily.flatBonus ?? daily.bonusUses ?? config.dailyUseBonus));
  if (Number.isFinite(Number(daily.extraUseMultiplier ?? config.extraUseMultiplier))) rules.extraUseMultiplier += Math.max(0, Number(daily.extraUseMultiplier ?? config.extraUseMultiplier));
  if (daily.allowNonHeroicUse === true || config.allowNonHeroicUse === true) rules.allowNonHeroicUse = true;

  const healing = config.healing ?? {};
  if (healing && typeof healing === 'object') {
    rules.healing = { ...(rules.healing ?? {}), ...clone(healing) };
    addConModHealing(rules, actor, healing);
  }
  if (healing?.mode || config.healingMode) rules.healingMode = healing.mode ?? config.healingMode;
  if (Number.isFinite(Number(healing?.hpFraction ?? config.healingFraction))) rules.healingFraction = Number(healing.hpFraction ?? config.healingFraction);
  if (Number.isFinite(Number(healing?.multiplier ?? config.healingMultiplier))) rules.healingMultiplier = Number(healing.multiplier ?? config.healingMultiplier);
  if (Number.isFinite(Number(healing?.minimum ?? config.minimumHealing))) rules.minimumHealing = Math.max(0, Number(healing.minimum ?? config.minimumHealing));
  if (Number.isFinite(Number(healing?.flatBonus ?? config.extraHealing))) rules.extraHealing += Number(healing.flatBonus ?? config.extraHealing);
  if (healing?.noImmediateHealing === true || config.noImmediateHealingOnUse === true) rules.noImmediateHealingOnUse = true;

  const activation = config.activation ?? {};
  if (activation.allowAboveThreshold === true || activation.allowAboveHalfHp === true || config.allowAboveHalfHp === true) {
    rules.allowAboveHalfHp = true;
    rules.allowAboveThreshold = true;
  }
  if (Number.isFinite(Number(activation.hpThresholdFraction ?? config.hpThresholdFraction))) rules.hpThresholdFraction = Number(activation.hpThresholdFraction ?? config.hpThresholdFraction);
  if (Number.isFinite(Number(activation.hpThresholdValue ?? config.hpThresholdValue))) rules.hpThresholdValue = Number(activation.hpThresholdValue ?? config.hpThresholdValue);

  const actionEconomy = config.actionEconomy ?? {};
  if (actionEconomy.action || config.actionCost) {
    rules.actionCost = normalizeActionCost(actionEconomy.action ?? config.actionCost);
    rules.freeAction = rules.actionCost === 'free';
  }
  if (Number.isFinite(Number(actionEconomy.swiftActions ?? config.swiftActions))) rules.swiftActions = Math.max(0, Number(actionEconomy.swiftActions ?? config.swiftActions));
  rules.actionEconomy = { ...(rules.actionEconomy ?? {}), ...clone(actionEconomy) };

  const conditionTrack = config.conditionTrack ?? {};
  if (Number.isFinite(Number(conditionTrack.recoverySteps ?? config.conditionRecoverySteps))) {
    rules.conditionRecoverySteps += Math.max(0, Number(conditionTrack.recoverySteps ?? config.conditionRecoverySteps));
  }

  const postUse = config.postUse ?? {};
  if (postUse.regainForcePower === true || config.regainForcePowerOnUse === true) rules.regainForcePowerOnUse = true;
  if (postUse.grantMoveAction === true || config.grantMoveActionOnUse === true) rules.grantMoveActionOnUse = true;
  if (postUse.grantMovement === true || config.grantMovementOnUse === true) rules.grantMovementOnUse = true;
  if (postUse.grantStandardAction === true || config.grantStandardActionOnUse === true) rules.grantStandardActionOnUse = true;
  if (postUse.grantSwiftAction === true || config.grantSwiftActionOnUse === true) rules.grantSwiftActionOnUse = true;
  if (postUse.grantReaction === true || config.grantReactionOnUse === true) rules.grantReactionOnUse = true;
  if (postUse.halfHealingForMovement === true || config.halfHealingForMovement === true) rules.halfHealingForMovement = true;
  if (postUse.movement || config.movement) rules.secondWindMovement = clone(postUse.movement ?? config.movement);
  if (postUse.delayedHealing || config.delayedHealing) {
    rules.delayedHealing = clone(postUse.delayedHealing ?? config.delayedHealing);
    if (rules.delayedHealing?.noImmediateHealing === true || postUse.noImmediateHealing === true || config.noImmediateHealingOnUse === true) {
      rules.noImmediateHealingOnUse = true;
    }
  }

  return rules;
}

function applySecondWindRider(rules, rider = {}, actor = null) {
  const type = normalizeKey(rider.type ?? rider.ruleType ?? 'second-wind-rider');
  rules.riders.push(clone(rider));

  switch (type) {
    case 'second-wind-encounter-uses':
    case 'second-wind-encounter-use-cap': {
      const value = Number(rider.value ?? rider.uses ?? rider.maxUses ?? 1) || 1;
      rules.encounterUses = Math.max(rules.encounterUses ?? 1, value);
      rules.encounterUseCap = rules.encounterUses;
      break;
    }
    case 'second-wind-daily-uses':
      if (Number.isFinite(Number(rider.baseUses))) rules.dailyBaseUses = Math.max(1, Number(rider.baseUses));
      if (Number.isFinite(Number(rider.bonusUses ?? rider.value))) rules.dailyUseBonus += Math.max(0, Number(rider.bonusUses ?? rider.value));
      if (rider.allowNonHeroicUse === true) rules.allowNonHeroicUse = true;
      break;
    case 'second-wind-healing':
      applySecondWindConfig(rules, { healing: rider.healing ?? rider }, actor);
      break;
    case 'second-wind-activation':
      applySecondWindConfig(rules, { activation: rider.activation ?? rider }, actor);
      break;
    case 'second-wind-action-economy':
      applySecondWindConfig(rules, { actionEconomy: rider.actionEconomy ?? rider }, actor);
      break;
    case 'second-wind-condition-recovery':
      rules.conditionRecoverySteps += Math.max(0, Number(rider.steps ?? rider.value ?? 1) || 1);
      break;
    case 'second-wind-post-use-action':
    case 'second-wind-post-use-rider':
      applySecondWindConfig(rules, { postUse: rider.postUse ?? rider }, actor);
      break;
    case 'second-wind-allow-above-half-hp':
      rules.allowAboveHalfHp = true;
      rules.allowAboveThreshold = true;
      break;
    case 'second-wind-ignore-encounter-cap':
      rules.ignoreEncounterCap = true;
      break;
    default:
      if (rider.config && typeof rider.config === 'object') applySecondWindConfig(rules, rider.config, actor);
      break;
  }
}

function enrichSecondWindRules(actor, baseRules = {}) {
  const defaults = SecondWindRules.defaultConfig();
  const rules = {
    ...defaults,
    ...clone(baseRules),
    config: defaults,
    riders: [],
    secondWindRiders: [],
    encounterUses: Number(baseRules.encounterUses ?? baseRules.encounterUseCap ?? 1) || 1,
    encounterUseCap: Number(baseRules.encounterUseCap ?? baseRules.encounterUses ?? 1) || 1,
    dailyUseBonus: Number(baseRules.dailyUseBonus ?? 0) || 0,
    allowNonHeroicUse: baseRules.allowNonHeroicUse === true,
    noImmediateHealingOnUse: baseRules.noImmediateHealingOnUse === true,
    actionCost: normalizeActionCost(baseRules.actionCost ?? (baseRules.freeAction ? 'free' : 'swift')),
    swiftActions: Number(baseRules.swiftActions ?? 1) || 1,
    healing: { ...defaults.healing, ...(baseRules.healing ?? {}) },
    actionEconomy: { ...defaults.actionEconomy, ...(baseRules.actionEconomy ?? {}) }
  };

  applySecondWindConfig(rules, actor?.system?.secondWind?.config ?? {}, actor);
  applySecondWindConfig(rules, actor?.system?.secondWind ?? {}, actor);

  for (const rider of collectSecondWindRiders(actor)) applySecondWindRider(rules, rider, actor);
  rules.encounterUseCap = Math.max(1, Number(rules.encounterUseCap ?? rules.encounterUses ?? 1) || 1);
  rules.encounterUses = rules.encounterUseCap;
  rules.secondWindRiders = rules.riders;
  return rules;
}

function delayedHealingSelected(rules = {}, options = {}) {
  const delayed = rules.delayedHealing;
  if (!delayed) return false;
  if (delayed.optional !== true) return true;
  return options.delayedHealing === true
    || options.regenerativeHealing === true
    || options.useDelayedSecondWindHealing === true
    || normalizeKey(options.secondWindMode) === 'regenerative-healing';
}

function applySecondWindSelections(rules = {}, options = {}) {
  const selected = delayedHealingSelected(rules, options);
  if (rules.delayedHealing?.optional === true && !selected) {
    return {
      ...rules,
      delayedHealing: null,
      noImmediateHealingOnUse: false
    };
  }
  if (selected && (rules.delayedHealing?.noImmediateHealing === true || rules.noImmediateHealingOnUse === true)) {
    return { ...rules, noImmediateHealingOnUse: true };
  }
  return rules;
}

function readEncounterUseCount(encounterFlag, activeCombatId) {
  if (!activeCombatId || !encounterFlag) return 0;
  if (typeof encounterFlag === 'string') return encounterFlag === activeCombatId ? 1 : 0;
  if (typeof encounterFlag !== 'object') return 0;
  const combatId = encounterFlag.combatId ?? encounterFlag.id ?? encounterFlag.encounterId ?? null;
  if (combatId !== activeCombatId) return 0;
  return Math.max(0, Number(encounterFlag.count ?? encounterFlag.uses ?? encounterFlag.used ?? 1) || 1);
}

function patchSecondWindRulesResolver() {
  if (MetaResourceFeatResolver.__swseSecondWindRiderPatched === true) return;
  const original = MetaResourceFeatResolver.getSecondWindRules?.bind(MetaResourceFeatResolver);
  MetaResourceFeatResolver.getSecondWindRules = function patchedGetSecondWindRules(actor) {
    const base = typeof original === 'function' ? original(actor) : {};
    const enriched = enrichSecondWindRules(actor, base);
    if (activeSecondWindApplication?.actor === actor) {
      return applySecondWindSelections(enriched, activeSecondWindApplication.options ?? {});
    }
    return enriched;
  };
  MetaResourceFeatResolver.__swseSecondWindRiderPatched = true;
}

function patchSecondWindEncounterUsage() {
  if (ActorEngine.__swseSecondWindEncounterCountPatched === true) return;
  const original = ActorEngine.applySecondWind?.bind(ActorEngine);
  ActorEngine.applySecondWind = async function patchedApplySecondWind(actor, options = {}) {
    if (typeof original !== 'function') return { success: false, reason: 'Second Wind actor engine is unavailable.' };
    const activeCombatId = game.combat?.started ? game.combat.id : null;
    const beforeFlag = actor?.getFlag?.('foundryvtt-swse', 'secondWindEncounterUsed') ?? null;
    const beforeCount = readEncounterUseCount(beforeFlag, activeCombatId);
    const selectedRules = applySecondWindSelections(MetaResourceFeatResolver.getSecondWindRules(actor), options);
    const suppressImmediateHealing = selectedRules?.noImmediateHealingOnUse === true && delayedHealingSelected(selectedRules, options);
    const originalCalculateHealing = SecondWindRules.calculateHealingAmount;

    activeSecondWindApplication = { actor, options };
    if (suppressImmediateHealing) {
      SecondWindRules.calculateHealingAmount = function suppressedSecondWindHealing() {
        return -Number(selectedRules.extraHealing || 0);
      };
    }

    let result;
    try {
      result = await original(actor, options);
    } finally {
      SecondWindRules.calculateHealingAmount = originalCalculateHealing;
      activeSecondWindApplication = null;
    }

    if (result?.success && activeCombatId) {
      const rules = MetaResourceFeatResolver.getSecondWindRules(actor);
      const count = beforeCount + 1;
      await actor.setFlag?.('foundryvtt-swse', 'secondWindEncounterUsed', {
        combatId: activeCombatId,
        count,
        max: Number(rules.encounterUseCap ?? rules.encounterUses ?? 1) || 1,
        lastUsedAt: Date.now()
      });
      result.encounterUsesThisEncounter = count;
      result.encounterUseCap = Number(rules.encounterUseCap ?? rules.encounterUses ?? 1) || 1;
    }
    if (result?.success && selectedRules?.secondWindMovement) result.secondWindMovement = selectedRules.secondWindMovement;
    if (result?.success && suppressImmediateHealing) result.immediateHealingSuppressed = true;
    return result;
  };
  ActorEngine.__swseSecondWindEncounterCountPatched = true;
}

export const SecondWindRiderRuntime = {
  collectSecondWindRiders,
  enrichSecondWindRules,
  applySecondWindRider,
  applySecondWindSelections
};

export function registerSecondWindRiderRuntimePatches() {
  if (registered) return;
  registered = true;
  patchSecondWindRulesResolver();
  patchSecondWindEncounterUsage();
  game.swse ??= {};
  game.swse.combat ??= {};
  game.swse.combat.secondWind ??= {};
  game.swse.combat.secondWind.riderRuntime = SecondWindRiderRuntime;
  SWSELogger.log('[SecondWindRiders] Runtime patches registered');
}

export default registerSecondWindRiderRuntimePatches;
