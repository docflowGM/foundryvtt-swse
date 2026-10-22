/**
 * ActionEconomyConsumption
 *
 * Shared imperative helper for non-sheet call sites that need to spend turn
 * economy through the same ActionEngine + ActionEconomyPersistence + policy
 * stack used by the v2 character sheet. Chat-card follow-through buttons are
 * the first consumer: they should not bypass action economy just because they
 * originate from chat instead of the combat action row.
 */

function labelActionType(value) {
  const normalized = normalizeActionType(value);
  const labels = {
    'full-round': 'Full-Round',
    standard: 'Standard',
    move: 'Move',
    swift: 'Swift',
    reaction: 'Reaction',
    free: 'Free',
    passive: 'Passive'
  };
  return labels[normalized] ?? String(value ?? 'Action');
}

function normalizeActionType(value) {
  const raw = String(value ?? '').toLowerCase().trim();
  if (!raw) return 'standard';
  if (raw.includes('full')) return 'full-round';
  if (raw.includes('swift')) return 'swift';
  if (raw.includes('move')) return 'move';
  if (raw.includes('free')) return 'free';
  if (raw.includes('reaction') || raw.includes('immediate')) return 'reaction';
  if (raw.includes('passive')) return 'passive';
  if (raw.includes('standard')) return 'standard';
  return raw;
}

function costForActionType(actionType, Engine = null) {
  const normalized = normalizeActionType(actionType);
  if (Engine?.costForActionType) return Engine.costForActionType(normalized);
  if (normalized === 'full-round') return { fullRound: true, standard: 1, move: 1, swift: 1 };
  if (normalized === 'move') return { move: 1 };
  if (normalized === 'swift') return { swift: 1 };
  if (normalized === 'free' || normalized === 'reaction' || normalized === 'passive') return {};
  return { standard: 1 };
}

function isPermitted(policyResult, engineResult) {
  if (!policyResult) return engineResult?.allowed !== false;
  if (policyResult === false) return false;
  if (policyResult?.permitted === false) return false;
  return true;
}

function policyMessage(policyResult, engineResult, actionType) {
  return policyResult?.uiState?.tooltip
    ?? policyResult?.uiState?.message
    ?? policyResult?.reason
    ?? (Array.isArray(engineResult?.violations) && engineResult.violations.length
      ? engineResult.violations.join(', ')
      : null)
    ?? `${labelActionType(actionType)} economy could not be spent.`;
}

function notifyPolicy(policyResult, engineResult, actionType, { notify = true } = {}) {
  if (!notify) return;
  const message = policyMessage(policyResult, engineResult, actionType);
  if (!message) return;
  const mode = policyResult?.mode ?? game?.settings?.get?.('foundryvtt-swse', 'actionEconomyMode') ?? 'loose';
  if (policyResult?.permitted === false || mode === 'strict') {
    ui?.notifications?.warn?.(message);
  } else if (engineResult?.allowed === false) {
    ui?.notifications?.info?.(`${labelActionType(actionType)} economy warning: ${message}`);
  }
}

async function resolveModules() {
  const [{ ActionEconomyPersistence }, { ActionEngine }, policyMod] = await Promise.all([
    import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js'),
    import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js'),
    import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-policy-controller.js').catch(async () => import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-policy.js'))
  ]);
  return {
    Persistence: ActionEconomyPersistence,
    Engine: ActionEngine,
    Policy: policyMod.ActionPolicyController ?? policyMod.default ?? null
  };
}

/**
 * Rollback that undoes ONLY the expenditure it made, and reports exactly what happened. `Persistence.undoLast` pops whatever history entry is
 * last, so another action recorded in the meantime would be undone instead (and this one left in place). Every spend therefore stamps a unique
 * `spendId` into its own history entry. The rollback resolves a strict boolean and records `handle.rollbackStatus`:
 *   'refunded'    true  — this spend's entry was the last one, was undone, and is verifiably gone from the history
 *   'superseded'  false — another action was recorded after it; NOTHING was changed (the later action is untouched, this one stays spent)
 *   'failed'      false — the undo did not complete or did not remove this spend's entry; nothing is claimed
 * A second call after 'refunded' does nothing (false, status stays 'refunded'). Whenever the action stays spent the player is told once, because a
 * caller that rolled back must never proceed as though the action had been restored.
 */
function newSpendId() { return `spend-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
function ownRollback(handle, Persistence, actor, combatId, spendId, { notify = true, label = 'The' } = {}) {
  const stillSpent = (status) => {
    handle.rollbackStatus = status;
    if (notify) ui?.notifications?.warn?.(`${label} action could not be refunded automatically (${status === 'superseded' ? 'another action was recorded since' : 'the undo did not complete'}). Please correct the action tracker by hand.`);
    return false;
  };
  return async () => {
    if (handle.rollbackStatus === 'refunded') return false;   // already refunded: never undo twice
    if (typeof Persistence.undoLast !== 'function' || typeof Persistence.getTurnState !== 'function') return stillSpent('failed');
    const history = Persistence.getTurnState(actor, combatId)?.history;
    const last = Array.isArray(history) ? history[history.length - 1] : null;
    if (!last || last.metadata?.spendId !== spendId) return stillSpent(Array.isArray(history) && history.some((h) => h?.metadata?.spendId === spendId) ? 'superseded' : 'failed');
    const undone = await Persistence.undoLast(actor, combatId);   // no await between the check above and undoLast's own read
    const after = Persistence.getTurnState(actor, combatId)?.history;
    const gone = Array.isArray(after) && !after.some((h) => h?.metadata?.spendId === spendId);
    if (undone?.allowed !== true || !gone) return stillSpent('failed');   // never claim a refund the history does not show
    handle.rollbackStatus = 'refunded';
    return true;
  };
}

function actorInCombat(actor, combat = game?.combat) {
  if (!actor || !combat) return false;
  return Boolean(combat.combatants?.find?.(c => c.actor?.id === actor.id || c.actor?._id === actor.id));
}

function normalizeEngineResult(result, fallbackCost = {}) {
  if (!result) return { allowed: false, turnState: null, violations: ['ACTION_ENGINE_FAILED'], consumed: {} };
  if (result?.allowed === undefined && result?.updatedTurnState) {
    return {
      allowed: result.allowed !== false,
      turnState: result.updatedTurnState,
      violations: result.reason ? [result.reason] : [],
      consumed: result.consumedCost ?? fallbackCost
    };
  }
  return result;
}

export class ActionEconomyConsumption {
  static normalizeActionType(value) {
    return normalizeActionType(value);
  }

  static labelActionType(value) {
    return labelActionType(value);
  }

  static async spend(actor, actionType = 'standard', metadata = {}, options = {}) {
    const normalizedType = normalizeActionType(actionType);
    const noOp = (reason = 'no-consumption') => ({
      allowed: true,
      permitted: true,
      committed: false,
      noOp: true,
      reason,
      actionType: normalizedType,
      rollback: async () => false
    });

    if (!actor) return { ...noOp('missing-actor'), allowed: false, permitted: false };
    if (normalizedType === 'free' || normalizedType === 'passive') return noOp(normalizedType);
    if (!game?.combat || !actorInCombat(actor, game.combat)) return noOp('out-of-combat');

    const { Persistence, Engine, Policy } = await resolveModules();
    if (!Persistence || !Engine) return noOp('economy-modules-unavailable');

    const combatId = game.combat.id;
    const turnState = Persistence.getTurnState?.(actor, combatId) ?? Persistence.startTurn?.(actor) ?? {};
    const actionName = metadata.actionName ?? metadata.sourceName ?? metadata.source ?? labelActionType(normalizedType);

    if (normalizedType === 'reaction') {
      const current = Number(turnState?.reactions?.current ?? Persistence.getReactionMax?.(actor) ?? 1) || 0;
      const engineResult = current > 0
        ? { allowed: true, turnState, consumed: { reaction: 0 }, violations: [] }
        : { allowed: false, turnState, consumed: { reaction: 0 }, violations: ['INSUFFICIENT_REACTION'] };
      const policyResult = Policy?.handle
        ? await Policy.handle({ actor, result: engineResult, actionName, context: metadata, gmOverride: options.gmOverride === true || metadata.gmOverride === true })
        : { permitted: engineResult.allowed !== false };
      notifyPolicy(policyResult, engineResult, normalizedType, options);
      if (!isPermitted(policyResult, engineResult)) {
        return { allowed: false, permitted: false, committed: false, actionType: normalizedType, engineResult, policyResult, rollback: async () => false };
      }
      if (engineResult.allowed && typeof Persistence.spendReaction === 'function') {
        const spendId = newSpendId();
        const reactionResult = await Persistence.spendReaction(actor, combatId, { ...metadata, actionType: normalizedType, spendId });
        const normalizedReactionResult = normalizeEngineResult(reactionResult, { reaction: 0 });
        if (normalizedReactionResult.allowed === false) {
          notifyPolicy(policyResult, normalizedReactionResult, normalizedType, options);
          return { allowed: false, permitted: false, committed: false, actionType: normalizedType, engineResult: normalizedReactionResult, policyResult, rollback: async () => false };
        }
        Hooks.callAll?.('swse.actionEconomySpent', { actor, actionType: normalizedType, metadata, source: 'ActionEconomyConsumption' });
        const handle = { allowed: true, permitted: true, committed: true, actionType: normalizedType, engineResult: normalizedReactionResult, policyResult, rollbackStatus: 'none' };
        handle.rollback = ownRollback(handle, Persistence, actor, combatId, spendId, { notify: options.notify !== false, label: labelActionType(normalizedType) });
        return handle;
      }
      return { allowed: true, permitted: true, committed: false, actionType: normalizedType, engineResult, policyResult, rollback: async () => false };
    }

    const cost = costForActionType(normalizedType, Engine);
    const rawResult = typeof Engine.consume === 'function'
      ? Engine.consume(turnState, cost)
      : await Engine.consumeAction?.(turnState, { actionType: normalizedType, metadata, cost });
    const engineResult = normalizeEngineResult(rawResult, cost);
    const policyResult = Policy?.handle
      ? await Policy.handle({ actor, result: engineResult, actionName, context: metadata, gmOverride: options.gmOverride === true || metadata.gmOverride === true })
      : { permitted: engineResult?.allowed !== false };

    notifyPolicy(policyResult, engineResult, normalizedType, options);
    if (!isPermitted(policyResult, engineResult)) {
      return { allowed: false, permitted: false, committed: false, actionType: normalizedType, cost, engineResult, policyResult, rollback: async () => false };
    }

    if (engineResult?.allowed !== false) {
      const spendId = newSpendId();
      if (typeof Persistence.commitConsumption === 'function') {
        await Persistence.commitConsumption(actor, combatId, engineResult, { ...metadata, actionType: normalizedType, cost, spendId });
      } else if (typeof Persistence.setTurnState === 'function') {
        await Persistence.setTurnState(actor, combatId, engineResult.turnState ?? engineResult);
      }
      Hooks.callAll?.('swse.actionEconomySpent', { actor, actionType: normalizedType, metadata, source: 'ActionEconomyConsumption' });
      const handle = { allowed: true, permitted: true, committed: true, actionType: normalizedType, cost, engineResult, policyResult, rollbackStatus: 'none' };
      handle.rollback = ownRollback(handle, Persistence, actor, combatId, spendId, { notify: options.notify !== false, label: labelActionType(normalizedType) });
      return handle;
    }

    // Loose/no enforcement may permit an over-spend for table flow, but should
    // not corrupt the stored turn state. This mirrors the v2 sheet behavior.
    return { allowed: true, permitted: true, committed: false, actionType: normalizedType, cost, engineResult, policyResult, rollback: async () => false };
  }
}

export default ActionEconomyConsumption;
