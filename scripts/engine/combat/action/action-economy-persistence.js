/**
 * ActionEconomyPersistence — Turn-State Storage & Lifecycle
 *
 * Manages where turn state lives and when it resets.
 *
 * Storage: actor.flags.foundryvtt-swse.actionEconomy
 * Scope: Per actor per combat (survives rerenders, syncs across clients)
 * Reset: On combatant.turn hook (automatic, deterministic)
 *
 * This layer bridges ActionEngine (pure math) and Foundry persistence.
 */

import { ActionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js";

export class ActionEconomyPersistence {
  // Flag storage key
  static FLAG_KEY = "actionEconomy";
  static SCOPE = "foundryvtt-swse";

  static getReactionMax(actor) {
    const raw = actor?.system?.combat?.reactionsMax
      ?? actor?.system?.reactions?.max
      ?? actor?.system?.actionEconomy?.reactionsMax
      ?? actor?.getFlag?.(this.SCOPE, 'reactionsMax')
      ?? 1;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }

  static normalizeTurnState(turnState = {}, actor = null) {
    const base = ActionEngine.startTurn();
    const maxReactions = this.getReactionMax(actor);
    const rawReaction = turnState.reactions ?? {};
    const reactionMax = Math.max(1, Number(rawReaction.max ?? maxReactions) || maxReactions);
    const reactionCurrent = Math.max(0, Math.min(reactionMax, Number(rawReaction.current ?? rawReaction.remaining ?? reactionMax) || 0));

    return {
      ...base,
      ...turnState,
      remaining: { ...base.remaining, ...(turnState.remaining ?? {}) },
      degraded: { ...base.degraded, ...(turnState.degraded ?? {}) },
      fullRoundUsed: turnState.fullRoundUsed === true,
      reactions: {
        current: reactionCurrent,
        max: reactionMax
      },
      history: Array.isArray(turnState.history) ? turnState.history : []
    };
  }

  static startTurn(actor = null) {
    return this.normalizeTurnState(ActionEngine.startTurn(), actor);
  }

  static #snapshotTurnState(turnState = {}) {
    const { history: _history, ...rest } = turnState ?? {};
    return JSON.parse(JSON.stringify(rest));
  }

  static #pushHistory(turnState, entry = {}) {
    const history = Array.isArray(turnState?.history) ? [...turnState.history] : [];
    const scrubbed = {
      ...entry,
      before: entry.before ? this.#snapshotTurnState(entry.before) : undefined,
      after: entry.after ? this.#snapshotTurnState(entry.after) : undefined,
      timestamp: Date.now()
    };
    history.push(scrubbed);
    return { ...turnState, history };
  }

  /**
   * Get current turn state for an actor in a combat
   * @param {Actor} actor - The actor
   * @param {string} combatId - The combat ID (or null if no active combat)
   * @returns {Object} Turn state { remaining, degraded, fullRoundUsed }
   */
  static getTurnState(actor, combatId) {
    if (!actor) return this.startTurn();

    const flag = actor.getFlag(this.SCOPE, this.FLAG_KEY);

    // If flag exists and matches current combat, return normalized state.
    if (flag && flag.combatId === combatId) {
      return this.normalizeTurnState(flag.turnState, actor);
    }

    // Otherwise, return fresh turn state.
    return this.startTurn(actor);
  }

  /**
   * Save turn state for an actor in a combat
   * @param {Actor} actor
   * @param {string} combatId
   * @param {Object} turnState
   */
  static async setTurnState(actor, combatId, turnState) {
    if (!actor) return;

    await actor.setFlag(this.SCOPE, this.FLAG_KEY, {
      combatId: combatId,
      turnState: this.normalizeTurnState(turnState, actor),
      timestamp: Date.now()
    });
  }

  /**
   * Reset turn state to fresh (new turn)
   * @param {Actor} actor
   * @param {string} combatId
   */
  static async resetTurnState(actor, combatId) {
    await this.setTurnState(actor, combatId, this.startTurn(actor));
  }

  /**
   * Clear all turn-state flags for a combat (on delete)
   * @param {Combat} combat
   */
  static async clearCombatTurnStates(combat) {
    if (!combat?.combatants?.size) return;

    const updates = [];
    for (const combatant of combat.combatants) {
      const actor = combatant.actor;
      if (actor) {
        updates.push(
          actor.unsetFlag(this.SCOPE, this.FLAG_KEY)
        );
      }
    }

    await Promise.all(updates);
  }

  /**
   * Called when a new combatant's turn starts
   * Resets their economy and announces fresh turn
   * @param {Combatant} combatant
   */
  static async onCombatantTurn(combatant) {
    if (!combatant?.actor) return;

    const combat = combatant.combat;
    await this.resetTurnState(combatant.actor, combat.id);

    // Log for diagnostics
    console.log(
      `[SWSE] ${combatant.actor.name} begins turn — action economy reset.`
    );
  }

  /**
   * Called when a turn state is consumed
   * Updates the persistent flag
   * @param {Actor} actor
   * @param {string} combatId
   * @param {Object} consumeResult - From ActionEngine.consume()
   */
  static async commitConsumption(actor, combatId, consumeResult, metadata = {}) {
    if (!consumeResult.allowed) {
      console.warn(
        `[SWSE] Attempted to commit invalid consumption for ${actor.name}`
      );
      return;
    }

    const before = this.getTurnState(actor, combatId);
    const after = this.normalizeTurnState(consumeResult.turnState, actor);
    const withHistory = this.#pushHistory(after, {
      type: 'action',
      actionType: metadata.actionType ?? metadata.type ?? 'action',
      before,
      after,
      metadata
    });
    await this.setTurnState(actor, combatId, withHistory);
  }

  static async spendReaction(actor, combatId, metadata = {}) {
    const before = this.getTurnState(actor, combatId);
    const current = Number(before.reactions?.current ?? 1) || 0;
    if (current <= 0) {
      return { allowed: false, turnState: before, violations: ['INSUFFICIENT_REACTION'] };
    }

    const after = this.#pushHistory({
      ...before,
      reactions: {
        current: current - 1,
        max: Number(before.reactions?.max ?? 1) || 1
      }
    }, {
      type: 'reaction',
      actionType: 'reaction',
      before,
      metadata
    });
    await this.setTurnState(actor, combatId, after);
    return { allowed: true, turnState: after, consumed: { reaction: 1 }, violations: [] };
  }

  static async undoLast(actor, combatId) {
    const current = this.getTurnState(actor, combatId);
    const history = Array.isArray(current.history) ? [...current.history] : [];
    const last = history.pop();
    if (!last?.before) {
      return { allowed: false, turnState: current, reason: 'NO_HISTORY' };
    }

    const restored = this.normalizeTurnState({ ...last.before, history }, actor);
    await this.setTurnState(actor, combatId, restored);
    return { allowed: true, turnState: restored, undone: last };
  }
}

export default ActionEconomyPersistence;
