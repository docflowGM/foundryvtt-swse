import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { ConditionTrackRules } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js";
import { ActionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js";
import { ActionEconomyPersistence } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js";

function activeCombatId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : null;
}

function actorCurrentCondition(actor) {
  return Math.max(0, Number(actor?.system?.conditionTrack?.current ?? 0) || 0);
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
    source: metadata.source ?? 'Condition Track Feat',
    feat: metadata.feat ?? metadata.source ?? 'Condition Track Feat',
    cost
  });
  return consumeResult;
}

export class ConditionTrackFeatActions {
  /**
   * Shake It Off: spend two swift actions to move +1 step up the condition track.
   *
   * This is intentionally an action adapter, not a second condition-track engine:
   * - feat presence/rules come from MetaResourceFeatResolver
   * - action cost goes through ActionEngine/ActionEconomyPersistence
   * - CT mutation goes through ActorEngine.applyConditionShift
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
}

export default ConditionTrackFeatActions;
