import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { ThresholdEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/threshold-engine.js";
import { DamageMitigationManager } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-mitigation-manager.js";
import { ForcePointsService } from "/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js";
import { getDamageThresholdSizeBonus } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { ConditionTrackRules } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeRuleType(value) {
  return String(value ?? '').trim().toUpperCase();
}

function normalizeDamageType(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function actorFeatRules(actor, key) {
  const rules = [];
  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
      for (const rule of asArray(item?.system?.abilityMeta?.resourceRules?.[key])) {
        rules.push({ ...rule, sourceName: item.name, sourceId: item.id });
      }
    }
  } catch (_err) {
    // Malformed actor/item data contributes no rule payloads.
  }
  return rules;
}

function firstRule(actor, key, type) {
  const wanted = normalizeRuleType(type);
  return actorFeatRules(actor, key).find(rule => normalizeRuleType(rule?.type) === wanted) ?? null;
}

function activeCombatId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : null;
}

function activeCombatRound() {
  return Number(game?.combat?.round ?? 0) || 0;
}

function isAttackContext(options = {}) {
  if (options?.isAttack === false || options?.attack === false) return false;
  return true;
}

function isAreaAttack(options = {}) {
  return options?.areaAttack === true
    || options?.isAreaAttack === true
    || options?.attackType === 'area'
    || options?.workflowContext?.areaAttack === true
    || options?.workflowContext?.isAreaAttack === true
    || options?.workflowContext?.attackType === 'area';
}

function isAimingAccuracyContext(options = {}) {
  const actionKey = String(options?.actionKey ?? options?.workflowContext?.actionKey ?? options?.combatOptions?.actionKey ?? '').toLowerCase();
  return options?.aimingAccuracy === true
    || options?.useAimingAccuracy === true
    || options?.combatOptions?.aimingAccuracy === true
    || actionKey === 'aiming-accuracy';
}

function readEncounterUse(actor, flagName) {
  const combatId = activeCombatId();
  const flag = actor?.getFlag?.('foundryvtt-swse', flagName);
  if (!combatId) return Number(flag?.count ?? 0) || 0;
  if (!flag || flag.combatId !== combatId) return 0;
  return Math.max(0, Number(flag.count ?? 0) || 0);
}

async function writeEncounterUse(actor, flagName, count) {
  const combatId = activeCombatId();
  if (!combatId) return;
  await actor?.setFlag?.('foundryvtt-swse', flagName, { combatId, count: Math.max(0, Number(count ?? 0) || 0) });
}

function stayUpAlreadyUsed(actor) {
  const combatId = activeCombatId();
  const flag = actor?.getFlag?.('foundryvtt-swse', 'stayUpUsedThisEncounter');
  return !!combatId && flag === combatId;
}

async function markStayUpUsed(actor) {
  const combatId = activeCombatId();
  if (combatId) await actor?.setFlag?.('foundryvtt-swse', 'stayUpUsedThisEncounter', combatId);
}

async function markQuickComebackAvailable(actor, sourceInfo = {}) {
  const combatId = activeCombatId();
  if (!combatId) return;
  await actor?.setFlag?.('foundryvtt-swse', 'quickComebackAvailable', {
    combatId,
    round: activeCombatRound(),
    source: sourceInfo.source ?? 'Quick Comeback',
    workflowId: sourceInfo.workflowId ?? null,
    message: 'Quick Comeback is available until the end of your next turn.'
  });
}

async function markRecoverBlockedByPinpoint(actor, sourceInfo = {}) {
  const combatId = activeCombatId();
  if (!combatId) return;
  await actor?.setFlag?.('foundryvtt-swse', 'recoverBlockedByPinpointAccuracy', {
    combatId,
    round: activeCombatRound(),
    expiresAfterRound: activeCombatRound() + 1,
    source: sourceInfo.source ?? 'Pinpoint Accuracy',
    sourceActorId: sourceInfo.sourceActorId ?? null,
    workflowId: sourceInfo.workflowId ?? null,
    message: 'Pinpoint Accuracy prevents the Recover Action until the end of this actor\'s next turn.'
  });
}

function damageTypeExcluded(rule, damageType) {
  const current = normalizeDamageType(damageType);
  return asArray(rule?.excludesDamageTypes).map(normalizeDamageType).includes(current);
}

/**
 * DamageResolutionEngine - Unified damage orchestration
 */
export class DamageResolutionEngine {
  static #sizeThresholdMap = {
    fine: 0,
    diminutive: 0,
    tiny: 0,
    small: 0,
    medium: 0,
    large: 5,
    huge: 10,
    gargantuan: 20,
    colossal: 50
  };

  static async resolveDamage({ actor, damage, damageType = "normal", source = null, options = {} }) {
    if (!actor) {
      throw new Error('DamageResolutionEngine.resolveDamage: actor required');
    }

    await actor.unsetFlag?.('foundryvtt-swse', 'alreadyRescuedThisResolution');

    if (typeof damage !== 'number' || damage < 0) {
      throw new Error(`DamageResolutionEngine.resolveDamage: invalid damage amount: ${damage}`);
    }

    const system = actor.system;
    const result = {
      hpBefore: system.hp?.value ?? 0,
      bonusHpBefore: 0,
      conditionBefore: system.conditionTrack?.current ?? 0,
      thresholdTotal: 0,
      hpAfter: 0,
      bonusHpAfter: 0,
      damageToHP: 0,
      thresholdExceeded: false,
      thresholdBreakdown: [],
      thresholdRuleResult: null,
      conditionDelta: 0,
      conditionAfter: 0,
      unconscious: false,
      dead: false,
      destroyed: false,
      forceRescueEligible: false
    };

    let remainingDamage = damage;

    try {
      const bonusMods = await ModifierEngine.collectModifiers(actor, {
        domain: "bonusHitPoints",
        context: options
      });

      if (bonusMods.length > 0) {
        result.bonusHpBefore = Math.max(...bonusMods.map(m => m.value));

        if (result.bonusHpBefore > 0) {
          const bonusAfter = Math.max(0, result.bonusHpBefore - damage);
          result.bonusHpAfter = bonusAfter;
          remainingDamage = Math.max(0, damage - result.bonusHpBefore);
        }
      }
    } catch (err) {
      console.warn('DamageResolutionEngine: bonus HP collection failed', err);
    }

    let mitigationResult = {};
    try {
      mitigationResult = DamageMitigationManager.resolve({
        damage: remainingDamage,
        actor,
        damageType,
        weapon: options.weapon || null,
        sourceActor: source,
        options
      });

      const issues = DamageMitigationManager.validate(mitigationResult);
      if (issues.length > 0) {
        console.warn('DamageResolutionEngine: Mitigation validation issues:', issues);
      }
    } catch (err) {
      console.warn('DamageResolutionEngine: DamageMitigationManager failed:', err);
      mitigationResult = {
        originalDamage: remainingDamage,
        afterShield: remainingDamage,
        afterDR: remainingDamage,
        afterTempHP: remainingDamage,
        hpDamage: remainingDamage,
        shield: { applied: 0, degraded: 0, remaining: 0, source: 'Error' },
        damageReduction: { applied: 0, source: '', bypassed: false },
        tempHP: { absorbed: 0, before: 0, after: 0 },
        breakdown: []
      };
    }

    const maxHP = system.hp?.max ?? 100;
    let hpDamageBeforeSpecial = Math.max(0, Number(mitigationResult.hpDamage) || 0);
    let voluntaryConditionShift = 0;

    const stayUpRule = firstRule(actor, 'conditionTrack', 'STAY_UP_HALF_DAMAGE_AND_CT');
    const useStayUp = options.stayUp === true || options.useStayUp === true;
    if (useStayUp && stayUpRule && isAttackContext(options) && hpDamageBeforeSpecial > 0) {
      const conditionCap = ConditionTrackRules.getConditionStepCap();
      if (result.conditionBefore < conditionCap && !stayUpAlreadyUsed(actor)) {
        const multiplier = Math.max(0, Number(stayUpRule.damageMultiplier ?? 0.5) || 0.5);
        hpDamageBeforeSpecial = Math.max(0, Math.floor(hpDamageBeforeSpecial * multiplier));
        voluntaryConditionShift += Math.max(1, Number(stayUpRule.conditionTrackCost ?? 1) || 1);
        await markStayUpUsed(actor);
        result.stayUp = {
          applied: true,
          damageMultiplier: multiplier,
          conditionShift: Math.max(1, Number(stayUpRule.conditionTrackCost ?? 1) || 1),
          source: stayUpRule.sourceName ?? stayUpRule.source ?? 'Stay Up'
        };
      } else {
        result.stayUp = {
          applied: false,
          reason: result.conditionBefore >= conditionCap ? 'Condition track is already at the maximum step' : 'Stay Up has already been used this encounter',
          source: stayUpRule.sourceName ?? stayUpRule.source ?? 'Stay Up'
        };
      }
    }

    const hpDamageMultiplierRaw = Number(options?.hpDamageMultiplier);
    const hpDamageMultiplier = Number.isFinite(hpDamageMultiplierRaw) && hpDamageMultiplierRaw >= 0
      ? hpDamageMultiplierRaw
      : 1;
    result.damageToHP = Math.max(0, Math.floor(hpDamageBeforeSpecial * hpDamageMultiplier));
    result.hpAfter = Math.max(0, result.hpBefore - result.damageToHP);

    result.mitigation = {
      originalDamage: mitigationResult.originalDamage,
      shield: mitigationResult.shield,
      damageReduction: mitigationResult.damageReduction,
      tempHP: mitigationResult.tempHP,
      hpDamageBeforeSpecial,
      hpDamageMultiplier,
      breakdown: mitigationResult.breakdown,
      components: Array.isArray(mitigationResult.components) ? mitigationResult.components : [],
      componentMitigation: mitigationResult.componentMitigation === true
    };

    if (result.damageToHP > 0 && source && isAimingAccuracyContext(options)) {
      const pinpointRule = firstRule(source, 'conditionTrack', 'PREVENT_TARGET_RECOVER_AFTER_AIMING_ACCURACY_DAMAGE');
      if (pinpointRule) {
        await markRecoverBlockedByPinpoint(actor, {
          source: pinpointRule.sourceName ?? pinpointRule.source ?? 'Pinpoint Accuracy',
          sourceActorId: source.id ?? source._id ?? null,
          workflowId: options.workflowId ?? options.workflowContext?.workflowId ?? null
        });
        result.pinpointAccuracy = {
          applied: true,
          targetRecoverBlocked: true,
          source: pinpointRule.sourceName ?? pinpointRule.source ?? 'Pinpoint Accuracy'
        };
      }
    }

    try {
      const thresholdData = await ThresholdEngine.getDamageThreshold(actor, {
        damageType,
        source
      });

      result.thresholdTotal = thresholdData.total;
      result.thresholdBreakdown = thresholdData.breakdown;

      const thresholdOverride = Number(options?.thresholdDamageOverride ?? options?.thresholdMeasuredDamage);
      const thresholdDamage = Number.isFinite(thresholdOverride)
        ? Math.max(0, thresholdOverride)
        : (mitigationResult?.afterDR ?? mitigationResult?.hpDamage ?? damage);
      result.thresholdMeasuredDamage = thresholdDamage;
      result.thresholdRuleResult = ThresholdEngine.evaluateThreshold({
        target: actor,
        damage: thresholdDamage,
        isStun: damageType === 'stun',
        isIon: damageType === 'ion',
        attacker: source
      });

      result.thresholdExceeded = result.thresholdRuleResult?.thresholdExceeded === true;

      if (damageType === 'stun' && result.thresholdExceeded && result.thresholdRuleResult?.addCTShift) {
        const currentShift = Math.max(0, Number(result.thresholdRuleResult.totalCTShift ?? 0));
        if (currentShift < 2) {
          result.thresholdRuleResult.addCTShift(2 - currentShift, false, 'stun-threshold');
        }
        result.thresholdRuleResult.stunThreshold = true;
        if (result.thresholdTotal > 0 && thresholdDamage >= result.thresholdTotal * 2) {
          result.thresholdRuleResult.stunKnockout = true;
        }
      }
    } catch (err) {
      console.warn('DamageResolutionEngine: threshold calculation failed', err);
    }

    result.conditionAfter = Math.min(ConditionTrackRules.getConditionStepCap(), result.conditionBefore + voluntaryConditionShift);
    result.conditionDelta = voluntaryConditionShift;
    result.conditionPersistent = false;

    if (result.thresholdExceeded && result.hpAfter > 0) {
      let thresholdShift = Math.max(0, Number(result.thresholdRuleResult?.totalCTShift ?? 1));

      const damageRules = MetaResourceFeatResolver.getDamageRules(actor);

      if (damageRules.preventFirstThresholdExceedance) {
        const combatId = activeCombatId();
        const firstExceededFlag = actor.getFlag?.('foundryvtt-swse', 'damageThresholdExceededThisEncounter');
        if (combatId && firstExceededFlag !== combatId) {
          thresholdShift = 0;
          await actor.setFlag?.('foundryvtt-swse', 'damageThresholdExceededThisEncounter', combatId);
          result.galacticAllianceMilitaryTraining = { applied: true, preventedConditionShift: true };
        }
      }

      if (damageRules.capIonDamageCtToOneStep && damageType === 'ion') {
        thresholdShift = Math.min(1, thresholdShift);
        result.ionShielding = { applied: true, cappedConditionShift: thresholdShift };
      }

      const damageConversionRule = firstRule(actor, 'conditionTrack', 'DROID_DAMAGE_CONVERSION_THRESHOLD_REPLACEMENT');
      const useDamageConversion = options.damageConversion === true || options.useDamageConversion === true;
      const canUseDamageConversion = useDamageConversion
        && damageConversionRule
        && thresholdShift > 0
        && isAttackContext(options)
        && !(damageConversionRule.excludesAreaAttack === true && isAreaAttack(options))
        && !damageTypeExcluded(damageConversionRule, damageType);

      if (canUseDamageConversion) {
        const useCount = readEncounterUse(actor, 'damageConversionUsesThisEncounter');
        const base = Math.max(0, Number(damageConversionRule.additionalDamageBase ?? 10) || 10);
        const increment = Math.max(0, Number(damageConversionRule.additionalDamageIncrementPerEncounterUse ?? 5) || 5);
        const additionalDamage = base + (increment * useCount);
        result.damageToHP += additionalDamage;
        result.hpAfter = Math.max(0, result.hpAfter - additionalDamage);
        result.damageConversion = {
          applied: true,
          additionalDamage,
          preventedConditionShift: thresholdShift,
          encounterUse: useCount + 1,
          source: damageConversionRule.sourceName ?? damageConversionRule.source ?? 'Damage Conversion'
        };
        thresholdShift = 0;
        await writeEncounterUse(actor, 'damageConversionUsesThisEncounter', useCount + 1);
      } else if (useDamageConversion && damageConversionRule) {
        result.damageConversion = {
          applied: false,
          reason: thresholdShift <= 0 ? 'No condition-track shift to replace' : (isAreaAttack(options) ? 'Area attacks are excluded' : (damageTypeExcluded(damageConversionRule, damageType) ? `${damageType} damage is excluded` : 'Damage Conversion was not available')),
          source: damageConversionRule.sourceName ?? damageConversionRule.source ?? 'Damage Conversion'
        };
      }

      if (thresholdShift > 0) {
        const quickComebackRule = firstRule(actor, 'conditionTrack', 'QUICK_COMEBACK_SINGLE_SWIFT_RECOVERY');
        if (quickComebackRule && isAttackContext(options)) {
          await markQuickComebackAvailable(actor, {
            source: quickComebackRule.sourceName ?? quickComebackRule.source ?? 'Quick Comeback',
            workflowId: options.workflowId ?? options.workflowContext?.workflowId ?? null
          });
          result.quickComeback = { available: true, swiftActionCost: Number(quickComebackRule.swiftActionCost ?? 1) || 1 };
        }
      }

      result.conditionDelta += thresholdShift;
      result.conditionAfter = Math.min(ConditionTrackRules.getConditionStepCap(), result.conditionAfter + thresholdShift);
      result.conditionPersistent = (result.thresholdRuleResult?.ctShifts || []).some(shift => shift?.persistent === true);

      if (damageType === 'stun' && result.thresholdRuleResult?.stunKnockout === true) {
        result.stunKnockout = true;
        result.unconscious = true;
        result.dead = false;
        result.destroyed = false;
        result.forceRescueEligible = false;
        result.conditionAfter = ConditionTrackRules.getConditionStepCap();
        result.conditionDelta = Math.max(0, result.conditionAfter - result.conditionBefore);
      }
    }

    if (result.hpAfter <= 0) {
      result.unconscious = actor.type === 'character' || actor.type === 'npc' || actor.type === 'beast';
      result.disabled = actor.type === 'droid' || actor.type === 'object' || actor.type === 'device' || actor.type === 'vehicle';
      result.conditionDelta = Math.max(0, ConditionTrackRules.getConditionStepCap() - result.conditionBefore);
      result.conditionAfter = ConditionTrackRules.getConditionStepCap();

      if (damageType === 'stun') {
        result.stunKnockout = true;
        result.unconscious = true;
        result.disabled = false;
        result.dead = false;
        result.destroyed = false;
        result.forceRescueEligible = false;
        return result;
      }

      if (result.thresholdExceeded) {
        const preventInstantDeath = result.thresholdRuleResult?.preventInstantDeath === true;
        result.conditionPersistent = result.conditionPersistent || (result.thresholdRuleResult?.ctShifts || []).some(shift => shift?.persistent === true);

        if (!preventInstantDeath) {
          if (actor.type === 'character' || actor.type === 'npc' || actor.type === 'droid') {
            result.forceRescueEligible = ForcePointsService.canRescue(actor, {
              damage: result.thresholdMeasuredDamage,
              hp: result.hpAfter,
              threshold: result.thresholdTotal
            });
          }

          if (actor.type === 'character' || actor.type === 'npc' || actor.type === 'beast') {
            result.dead = true;
          }

          if (actor.type === 'droid' || actor.type === 'object' || actor.type === 'device' || actor.type === 'vehicle') {
            result.destroyed = true;
          }
        }
      }
    }

    return result;
  }
}
