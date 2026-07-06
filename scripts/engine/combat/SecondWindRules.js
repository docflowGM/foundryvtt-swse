import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { ConditionTrackRules } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

function clampNonNegativeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

function readEncounterUseCount(encounterFlag, activeCombatId) {
  if (!activeCombatId || !encounterFlag) return 0;
  if (typeof encounterFlag === 'string') return encounterFlag === activeCombatId ? 1 : 0;
  if (typeof encounterFlag !== 'object') return 0;
  const combatId = encounterFlag.combatId ?? encounterFlag.id ?? encounterFlag.encounterId ?? null;
  if (combatId !== activeCombatId) return 0;
  return Math.max(0, Number(encounterFlag.count ?? encounterFlag.uses ?? encounterFlag.used ?? 1) || 1);
}

function getSecondWindHpThreshold(maxHP, rules = {}) {
  if (Number.isFinite(Number(rules.hpThresholdValue))) return Math.max(0, Number(rules.hpThresholdValue));
  const fraction = Number.isFinite(Number(rules.hpThresholdFraction)) ? Number(rules.hpThresholdFraction) : 0.5;
  return Math.floor(Math.max(0, Number(maxHP) || 0) * Math.max(0, fraction));
}

function getActionCost(rules = {}) {
  return String(rules.actionCost ?? rules.actionEconomy?.action ?? (rules.freeAction ? 'free' : 'swift')).toLowerCase();
}

export class SecondWindRules {
  static defaultConfig() {
    return {
      schemaVersion: 2,
      encounter: { uses: 1, ignoreCap: false },
      daily: { baseUses: 1, extraUseMultiplier: 0, flatBonus: 0 },
      healing: {
        mode: 'maxQuarterMaxHpOrConScore',
        hpFraction: 0.25,
        abilityScore: 'con',
        flatBonus: 0,
        multiplier: 1,
        minimum: 0
      },
      activation: { hpThresholdFraction: 0.5, allowAboveThreshold: false },
      actionEconomy: { action: 'swift', swiftActions: 1 },
      conditionTrack: { recoverySteps: 0 },
      postUse: {
        regainForcePower: false,
        grantMoveAction: false,
        grantMovement: false,
        grantStandardAction: false,
        grantSwiftAction: false,
        grantReaction: false
      },
      riders: []
    };
  }

  static canUseSecondWind(actor, options = {}, featRules = {}) {
    const heroicLevel = Number(actor.system?.heroicLevel ?? actor.system?.level ?? 0);
    const isHeroic = actor.type === 'character' || heroicLevel > 0;
    const canNonHeroicSecondWind = featRules.extraUseMultiplier > 0 || featRules.allowNonHeroicUse === true;

    if (!isHeroic && !canNonHeroicSecondWind) {
      return { allowed: false, reason: `${actor.name} is not eligible to use Second Wind` };
    }

    const currentHP = SchemaAdapters.getHP(actor);
    const maxHP = SchemaAdapters.getMaxHP(actor);
    const threshold = getSecondWindHpThreshold(maxHP, featRules);
    const allowAboveThreshold = featRules.allowAboveHalfHp === true || featRules.allowAboveThreshold === true;
    if (currentHP > threshold && !allowAboveThreshold) {
      return { allowed: false, reason: `Second Wind may only be used at ${threshold} Hit Points or lower` };
    }

    const activeCombatId = game.combat?.started ? game.combat.id : null;
    const encounterFlag = actor.getFlag?.('foundryvtt-swse', 'secondWindEncounterUsed') ?? null;
    const encounterUseCap = Math.max(1, Number(featRules.encounterUses ?? featRules.encounterUseCap ?? 1) || 1);
    const encounterUsed = readEncounterUseCount(encounterFlag, activeCombatId);
    if (activeCombatId && encounterUsed >= encounterUseCap && !featRules.ignoreEncounterCap) {
      return { allowed: false, reason: `Second Wind can only be used ${encounterUseCap} time${encounterUseCap === 1 ? '' : 's'} per encounter` };
    }

    if (options.validateCombat !== false) {
      const inCombat = game.combat?.combatants.some(c => c.actor?.id === actor.id);
      if (inCombat) {
        const combatant = game.combat.combatants.find(c => c.actor?.id === actor.id);
        const actionCost = getActionCost(featRules);
        const swiftActions = Math.max(0, Number(featRules.swiftActions ?? featRules.actionEconomy?.swiftActions ?? (actionCost === 'swift' ? 1 : 0)) || 0);
        if (actionCost === 'swift' && swiftActions > 0 && !combatant?.resources?.swift) {
          return { allowed: false, reason: 'Cannot use Second Wind: no swift action available' };
        }
      }
    }

    return { allowed: true, reason: '' };
  }

  static calculateHealingAmount(maxHP, conScore, rules = {}) {
    const healing = rules.healing ?? {};
    const fraction = Number.isFinite(Number(rules.healingFraction ?? healing.hpFraction)) ? Number(rules.healingFraction ?? healing.hpFraction) : 0.25;
    const hpFractionAmount = Math.floor(Math.max(0, Number(maxHP) || 0) * Math.max(0, fraction));
    const abilityAmount = Math.max(0, Number(conScore) || 0);
    const mode = String(rules.healingMode ?? healing.mode ?? 'maxQuarterMaxHpOrConScore');

    let base;
    if (mode === 'hpFractionOnly') base = hpFractionAmount;
    else if (mode === 'abilityScoreOnly') base = abilityAmount;
    else if (mode === 'flatOnly') base = 0;
    else base = Math.max(hpFractionAmount, abilityAmount);

    const multiplier = Number.isFinite(Number(rules.healingMultiplier ?? healing.multiplier)) ? Number(rules.healingMultiplier ?? healing.multiplier) : 1;
    const minimum = clampNonNegativeNumber(rules.minimumHealing ?? healing.minimum, 0);
    return Math.max(minimum, Math.floor(base * multiplier));
  }

  static calculateMaxUses(conMod, fortClassBonus, featRules = {}, hasToughAsNails = false) {
    const baseDailyUses = Number.isFinite(Number(featRules.dailyBaseUses))
      ? Math.max(1, Number(featRules.dailyBaseUses))
      : (HouseRuleService.isEnabled('secondWindWebEnhancement') ? Math.max(1, 1 + fortClassBonus + conMod) : 1);
    const flatBonus = Math.max(0, Number(featRules.dailyUseBonus ?? 0) || 0);
    const extraUseMultiplier = Number(featRules.extraUseMultiplier || 0) + (hasToughAsNails ? 1 : 0);
    return Math.max(1, baseDailyUses + flatBonus + (baseDailyUses * extraUseMultiplier));
  }

  static calculateConditionRecovery(featRules = {}, improvedHouseRule = false) {
    const houseRuleSteps = improvedHouseRule ? 1 : 0;
    const featSteps = Math.max(0, Number(featRules.conditionRecoverySteps || 0));
    return houseRuleSteps + featSteps;
  }

  static canUseEdgeOfExhaustion(actor) {
    const uses = actor.system.secondWind?.uses ?? 0;
    if (uses > 0) return { allowed: false, reason: 'Second Wind uses still available (not at edge of exhaustion)' };

    const isHeroic = actor.type === 'character' || (actor.type === 'npc' && actor.system.class);
    if (!isHeroic) return { allowed: false, reason: `${actor.name} is not heroic and cannot use Edge of Exhaustion` };

    const inCombat = game.combat?.combatants.some(c => c.actor?.id === actor.id);
    if (!inCombat) return { allowed: false, reason: 'Edge of Exhaustion can only be used in active combat' };

    const currentCT = Number(actor.system.conditionTrack?.current ?? 0);
    const conditionStepCap = ConditionTrackRules.getConditionStepCap();
    if (currentCT >= conditionStepCap) return { allowed: false, reason: 'Cannot accept condition penalty when already at helpless' };

    return { allowed: true, reason: '' };
  }
}
