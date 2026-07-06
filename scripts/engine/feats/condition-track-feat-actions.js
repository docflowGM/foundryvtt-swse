import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { ActionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js";
import { ActionEconomyPersistence } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js";

function activeCombatId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : null;
}

function actorCurrentCondition(actor) {
  return Math.max(0, Number(actor?.system?.conditionTrack?.current ?? 0) || 0);
}

function isPersistentCondition(actor) {
  return actor?.system?.conditionTrack?.persistent === true;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeRuleType(value) {
  return String(value ?? '').trim().toUpperCase();
}

function actorConditionTrackRules(actor) {
  const rules = [];
  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
      for (const rule of asArray(item?.system?.abilityMeta?.resourceRules?.conditionTrack)) {
        rules.push({ ...rule, sourceName: item.name, sourceId: item.id });
      }
    }
  } catch (_err) {
    // Malformed actor/items simply contribute no condition-track rules.
  }
  return rules;
}

function hasConditionTrackRule(actor, type) {
  const wanted = normalizeRuleType(type);
  return actorConditionTrackRules(actor).some(rule => normalizeRuleType(rule?.type) === wanted);
}

function readRecoverProgress(actor) {
  try {
    return foundry?.utils?.deepClone?.(actor?.getFlag?.('foundryvtt-swse', 'conditionRecoverProgress') ?? {}) ?? {};
  } catch (_err) {
    return {};
  }
}

async function clearRecoverProgress(actor) {
  try { await actor?.unsetFlag?.('foundryvtt-swse', 'conditionRecoverProgress'); }
  catch (_err) { /* flag cleanup must not block the recovery action */ }
}

function activeRecoverBlock(actor) {
  const combatId = activeCombatId();
  const flag = actor?.getFlag?.('foundryvtt-swse', 'recoverBlockedByPinpointAccuracy');
  if (!flag || typeof flag !== 'object') return null;
  if (flag.combatId && combatId && flag.combatId !== combatId) return null;
  const currentRound = Number(game?.combat?.round ?? 0);
  const expiresAfterRound = Number(flag.expiresAfterRound ?? flag.expiresRound ?? 0);
  if (expiresAfterRound && currentRound > expiresAfterRound) return null;
  return {
    source: flag.source ?? 'Pinpoint Accuracy',
    reason: 'recover-blocked',
    message: flag.message ?? 'Recover Action is blocked until the end of this actor\'s next turn.'
  };
}

async function consumeSwiftActions(actor, swiftActionCost, metadata = {}) {
  const combatId = activeCombatId();
  if (!combatId) {
    return {
      allowed: true,
      consumed: { swift: 0 },
      reason: 'NO_ACTIVE_COMBAT'
    };
  }

  const cost = { swift: Math.max(0, Number(swiftActionCost ?? 0) || 0) };
  if (cost.swift <= 0) {
    return {
      allowed: true,
      consumed: { swift: 0 },
      reason: 'NO_ACTION_COST'
    };
  }

  const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);
  const consumeResult = ActionEngine.consume(turnState, cost);
  if (!consumeResult.allowed) return consumeResult;

  await ActionEconomyPersistence.commitConsumption(actor, combatId, consumeResult, {
    actionType: 'swift',
    source: metadata.source ?? 'Condition Track Action',
    feat: metadata.feat ?? metadata.source ?? 'Condition Track Action',
    cost
  });
  return consumeResult;
}

export class ConditionTrackFeatActions {
  /**
   * Recover Action: spend three Swift Actions to move +1 step up the
   * Condition Track. The three Swift Actions may be spent in one round or
   * across consecutive rounds. Persistent conditions and explicit temporary
   * Recover blocks, such as Pinpoint Accuracy, prevent this action.
   */
  static async recover(actor, options = {}) {
    if (!actor) {
      return { success: false, reason: 'No actor provided' };
    }

    const currentCondition = actorCurrentCondition(actor);
    if (currentCondition <= 0) {
      return { success: false, reason: 'Actor is already at the top of the condition track' };
    }

    if (isPersistentCondition(actor) && options.ignorePersistent !== true) {
      return { success: false, reason: 'persistent' };
    }

    const block = activeRecoverBlock(actor);
    if (block && options.ignoreRecoverBlock !== true) {
      return { success: false, ...block };
    }

    const combatId = activeCombatId();
    if (!combatId) {
      const result = await ActorEngine.applyConditionShift(actor, -1, options.source ?? 'Recover Action');
      await clearRecoverProgress(actor);
      return {
        success: true,
        complete: true,
        conditionBefore: currentCondition,
        conditionAfter: Math.max(0, currentCondition - 1),
        applied: result?.applied ?? -1,
        spent: 3,
        remaining: 0,
        inCombat: false,
        source: 'Recover Action'
      };
    }

    let actionResult = { allowed: true, consumed: { swift: 0 } };
    if (options.consumeActionCost !== false) {
      actionResult = await consumeSwiftActions(actor, 1, {
        source: 'Recover Action',
        feat: 'Recover Action'
      });
      if (!actionResult.allowed) {
        return {
          success: false,
          reason: 'Insufficient swift actions',
          violations: actionResult.violations ?? [],
          actionResult
        };
      }
    }

    const combat = game.combat;
    const round = Number(combat?.round ?? 0);
    const progress = readRecoverProgress(actor);
    const sameCombat = progress.combatId === combatId;
    const previousRound = Number(progress.round ?? -999);
    const sameRound = previousRound === round;
    const nextRound = previousRound === (round - 1);
    const spent = (sameCombat && (sameRound || nextRound)) ? Number(progress.spent ?? 0) + 1 : 1;

    if (spent >= 3) {
      const result = await ActorEngine.applyConditionShift(actor, -1, options.source ?? 'Recover Action');
      await clearRecoverProgress(actor);
      return {
        success: true,
        complete: true,
        conditionBefore: currentCondition,
        conditionAfter: Math.max(0, currentCondition - 1),
        applied: result?.applied ?? -1,
        spent,
        remaining: 0,
        inCombat: true,
        actionResult,
        source: 'Recover Action'
      };
    }

    await actor.setFlag?.('foundryvtt-swse', 'conditionRecoverProgress', { combatId, round, spent });
    return {
      success: true,
      complete: false,
      conditionBefore: currentCondition,
      conditionAfter: currentCondition,
      spent,
      remaining: Math.max(0, 3 - spent),
      inCombat: true,
      actionResult,
      source: 'Recover Action'
    };
  }

  static canRecover(actor) {
    const currentCondition = actorCurrentCondition(actor);
    const persistent = isPersistentCondition(actor);
    const block = activeRecoverBlock(actor);
    return {
      allowed: !!actor && currentCondition > 0 && !persistent && !block,
      currentCondition,
      persistent,
      blocked: !!block,
      block,
      swiftActionCost: 1,
      totalSwiftActionsRequired: 3,
      reason: !actor ? 'no-actor' : (currentCondition <= 0 ? 'no-condition' : (persistent ? 'persistent' : (block?.reason ?? null)))
    };
  }

  /**
   * Shake It Off: spend two swift actions to move +1 step up the condition track.
   */
  static async shakeItOff(actor, options = {}) {
    if (!actor) {
      return { success: false, reason: 'No actor provided' };
    }

    const rules = MetaResourceFeatResolver.getConditionTrackRules(actor);
    if (!rules.swiftActionConditionRecovery) {
      return { success: false, reason: 'Actor does not have a Shake It Off-style condition recovery rule' };
    }

    const currentCondition = actorCurrentCondition(actor);
    if (currentCondition <= 0) {
      return { success: false, reason: 'Actor is already at the top of the condition track' };
    }

    const swiftActionCost = Math.max(0, Number(rules.swiftActionCost ?? 2) || 2);
    let actionResult = { allowed: true, consumed: { swift: 0 } };
    if (options.consumeActionCost !== false) {
      actionResult = await consumeSwiftActions(actor, swiftActionCost, {
        source: 'Shake It Off',
        feat: 'Shake It Off'
      });
      if (!actionResult.allowed) {
        return {
          success: false,
          reason: 'Insufficient swift actions',
          violations: actionResult.violations ?? [],
          actionResult
        };
      }
    }

    const result = await ActorEngine.applyConditionShift(actor, -1, 'Shake It Off');
    return {
      success: true,
      conditionBefore: currentCondition,
      conditionAfter: Math.max(0, currentCondition - 1),
      applied: result?.applied ?? -1,
      actionCost: options.consumeActionCost === false ? 0 : swiftActionCost,
      actionResult,
      source: 'Shake It Off'
    };
  }

  static canShakeItOff(actor) {
    const rules = MetaResourceFeatResolver.getConditionTrackRules(actor);
    return {
      allowed: !!rules.swiftActionConditionRecovery && actorCurrentCondition(actor) > 0,
      currentCondition: actorCurrentCondition(actor),
      swiftActionCost: Math.max(0, Number(rules.swiftActionCost ?? 2) || 2),
      hasRule: !!rules.swiftActionConditionRecovery
    };
  }

  /**
   * Quick Comeback: after a qualifying threshold attack moved the actor down the
   * Condition Track, spend one Swift Action to move +1 step. This is not the
   * Recover Action, so temporary Recover blocks do not apply.
   */
  static async quickComeback(actor, options = {}) {
    if (!actor) return { success: false, reason: 'No actor provided' };
    if (!hasConditionTrackRule(actor, 'QUICK_COMEBACK_SINGLE_SWIFT_RECOVERY')) {
      return { success: false, reason: 'Actor does not have Quick Comeback' };
    }
    const flag = actor.getFlag?.('foundryvtt-swse', 'quickComebackAvailable');
    const combatId = activeCombatId();
    if (!flag || (flag.combatId && combatId && flag.combatId !== combatId)) {
      return { success: false, reason: 'Quick Comeback is not currently available' };
    }
    const currentCondition = actorCurrentCondition(actor);
    if (currentCondition <= 0) return { success: false, reason: 'Actor is already at the top of the condition track' };

    let actionResult = { allowed: true, consumed: { swift: 0 } };
    if (options.consumeActionCost !== false) {
      actionResult = await consumeSwiftActions(actor, 1, {
        source: 'Quick Comeback',
        feat: 'Quick Comeback'
      });
      if (!actionResult.allowed) {
        return { success: false, reason: 'Insufficient swift actions', violations: actionResult.violations ?? [], actionResult };
      }
    }

    const result = await ActorEngine.applyConditionShift(actor, -1, 'Quick Comeback');
    await actor.unsetFlag?.('foundryvtt-swse', 'quickComebackAvailable');
    return {
      success: true,
      conditionBefore: currentCondition,
      conditionAfter: Math.max(0, currentCondition - 1),
      applied: result?.applied ?? -1,
      actionCost: options.consumeActionCost === false ? 0 : 1,
      actionResult,
      source: 'Quick Comeback'
    };
  }

  static canQuickComeback(actor) {
    const currentCondition = actorCurrentCondition(actor);
    const flag = actor?.getFlag?.('foundryvtt-swse', 'quickComebackAvailable');
    const combatId = activeCombatId();
    const active = !!flag && (!flag.combatId || !combatId || flag.combatId === combatId);
    return {
      allowed: !!actor && active && currentCondition > 0 && hasConditionTrackRule(actor, 'QUICK_COMEBACK_SINGLE_SWIFT_RECOVERY'),
      currentCondition,
      swiftActionCost: 1,
      hasRule: hasConditionTrackRule(actor, 'QUICK_COMEBACK_SINGLE_SWIFT_RECOVERY'),
      active
    };
  }
}

export default ConditionTrackFeatActions;
