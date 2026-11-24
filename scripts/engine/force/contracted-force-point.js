/**
 * One transaction shape for every certified ability Force Point contract (FP-RD-003):
 *   1. debit the contract's printed action (ActionEconomyConsumption; no-op out of combat),
 *   2. pay the Force Point through ForcePointsService / ActorEngine (the contract is re-verified there),
 *   3. run the ability's effect,
 *   4. finalize the receipt only after the effect applied; otherwise return the exact Force Point AND the action.
 * The effect returns a falsy value (or throws) to mean "nothing was applied". No other code path pays these contracts.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ABILITY_OPTION_CONTRACTS } from "/systems/foundryvtt-swse/scripts/engine/force/ability-option-contracts.js";

// Printed costs that are a real action in the action economy. 'reaction' consumes the round's reaction; 'free' and
// 'part-of-activation' (the cost is the activation the caller is already performing) consume nothing extra.
const DEBITED_ACTIONS = new Set(['standard', 'move', 'swift', 'full-round', 'reaction']);

export async function runContractedForcePoint(actor, ref, context = {}, effect = async () => true, { label = null } = {}) {
  const contract = ABILITY_OPTION_CONTRACTS[ref];
  if (!contract) return { ok: false, reason: 'No certified Force Point contract for this ability' };
  const name = label ?? String(ref).split(':').pop();

  let action = null;
  if (DEBITED_ACTIONS.has(contract.actionCost) && context.skipActionDebit !== true) {
    const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
    action = await ActionEconomyConsumption.spend(actor, contract.actionCost === 'full-round' ? 'full-round' : contract.actionCost, { actionName: name, abilitySourceRef: ref });
    if (action?.permitted === false) return { ok: false, reason: `${name}: no ${contract.actionCost} action available` };
  }

  let receipt = null;
  try {
    receipt = await ActorEngine.spendForcePoints(actor, 1, { ...context, useKind: 'ability-option', abilitySourceRef: ref });
  } catch (error) {
    await action?.rollback?.();
    return { ok: false, reason: error.message };
  }
  if (!receipt?.spent) {
    await action?.rollback?.();
    return { ok: false, reason: `${name}: no Force Point was spent` };
  }

  let result;
  try {
    result = await effect(receipt);
  } catch (error) {
    await ActorEngine.rollbackForcePointSpend(actor, receipt).catch(() => {});
    await action?.rollback?.();
    throw error;
  }
  if (!result) {
    await ActorEngine.rollbackForcePointSpend(actor, receipt);
    await action?.rollback?.();
    return { ok: false, reason: `${name}: nothing was applied; the Force Point was returned` };
  }
  await ActorEngine.finalizeForcePointSpend(actor, receipt);
  return { ok: true, result, receipt };
}

export default runContractedForcePoint;

/**
 * Two-phase form of the same transaction for call sites whose effect is the remainder of an existing function:
 *   const fp = await beginContractedForcePoint(actor, ref, context); if (!fp.ok) return null;
 *   return fp.settle(async () => { ...effect...; return result; });
 * settle() finalizes when the effect returns a truthy value, otherwise (falsy or thrown) returns the exact Force Point
 * and the debited action. An un-settled begin() is never finalized.
 */
export async function beginContractedForcePoint(actor, ref, context = {}, { label = null, notify = true } = {}) {
  const contract = ABILITY_OPTION_CONTRACTS[ref];
  const name = label ?? String(ref).split(':').pop();
  const fail = (reason) => {
    if (notify) globalThis.ui?.notifications?.warn?.(reason);
    return { ok: false, reason, settle: async () => null };
  };
  let action = null;
  if (contract && DEBITED_ACTIONS.has(contract.actionCost) && context.skipActionDebit !== true) {
    const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
    action = await ActionEconomyConsumption.spend(actor, contract.actionCost, { actionName: name, abilitySourceRef: ref });
    if (action?.permitted === false) return fail(`${name}: no ${contract.actionCost} action available`);
  }
  let receipt = null;
  try {
    // Uncontracted refs still reach ForcePointsService, which accepts only explicit, attributable GM adjudication.
    receipt = await ActorEngine.spendForcePoints(actor, 1, { ...context, useKind: 'ability-option', abilitySourceRef: ref });
  } catch (error) {
    await action?.rollback?.();
    return fail(`${name}: ${error.message}`);
  }
  if (!receipt?.spent) {
    await action?.rollback?.();
    return fail(`${name} requires spending 1 Force Point.`);
  }
  let settled = false;
  const refund = async () => {
    await ActorEngine.rollbackForcePointSpend(actor, receipt).catch(() => {});
    await action?.rollback?.();
  };
  return {
    ok: true, receipt,
    async settle(effect) {
      if (settled) throw new Error('Force Point transaction already settled');
      settled = true;
      let result;
      try {
        result = await effect(receipt);
      } catch (error) {
        await refund();
        throw error;
      }
      if (result) await ActorEngine.finalizeForcePointSpend(actor, receipt);
      else await refund();
      return result;
    }
  };
}

/**
 * The actor's own most recent qualifying attack this round, read from its authoritative outgoing-attack record
 * (never a client claim). Returns { id } usable as context.attackEvent, or null.
 */
export function latestOwnAttackEvent(actor, { targetId = null, critical = false } = {}) {
  const record = actor?.getFlag?.('swse', 'outgoingAttackEvents') ?? actor?.flags?.swse?.outgoingAttackEvents;
  const combat = globalThis.game?.combat;
  const events = Array.isArray(record?.events) ? record.events : [];
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.attackerId !== actor.id || e.state !== 'pending' || e.hit !== true) continue;
    if (critical && e.critical !== true) continue;
    if (targetId && e.defenderId !== targetId) continue;
    if (e.combatId && (!combat?.started || e.combatId !== combat.id || e.round !== combat.round)) continue;
    return { id: e.id, defenderId: e.defenderId, weaponId: e.weaponId };
  }
  return null;
}

/** Most recent melee attack that HIT this actor this round, from the attackers' records. Returns { id, attackerId } or null. */
export function latestMeleeHitAgainst(actor) {
  const combat = globalThis.game?.combat;
  const attackers = combat?.started ? Array.from(combat.combatants ?? []).map(c => c.actor).filter(Boolean) : [];
  let best = null;
  for (const attacker of attackers) {
    if (attacker.id === actor.id) continue;
    const record = attacker.getFlag?.('swse', 'outgoingAttackEvents') ?? attacker.flags?.swse?.outgoingAttackEvents;
    for (const e of Array.isArray(record?.events) ? record.events : []) {
      if (e.defenderId !== actor.id || e.attackerId !== attacker.id || e.state !== 'pending' || e.hit !== true || e.attackType !== 'melee') continue;
      if (e.combatId !== combat.id || e.round !== combat.round) continue;
      if (!best || (e.createdAt ?? 0) > (best.createdAt ?? 0)) best = { id: e.id, attackerId: attacker.id, createdAt: e.createdAt ?? 0 };
    }
  }
  return best ? { id: best.id, attackerId: best.attackerId } : null;
}
