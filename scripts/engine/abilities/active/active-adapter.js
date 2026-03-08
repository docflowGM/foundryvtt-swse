/**
 * ACTIVE Execution Model - Runtime Adapter
 *
 * Handles activation of ACTIVE/EFFECT and ACTIVE/MODE abilities.
 * Pure wiring of existing engines (ActionEngine, ActivationLimitEngine, ModifierEngine, DurationEngine, ActorEngine).
 *
 * GOVERNANCE:
 * - No mutations outside ActorEngine
 * - All effect application routes through ModifierEngine or ActorEngine
 * - Duration tracking via DurationEngine (in-memory, auto-expires)
 * - Chat output via SWSEChat
 */

import { ACTIVE_SUBTYPES } from "./active-types.js";
import { ActiveContractValidator } from "./active-contract.js";
import { DurationEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/active/duration-engine.js";
import { ActivationLimitEngine, LimitType } from "/systems/foundryvtt-swse/scripts/engine/abilities/ActivationLimitEngine.js";
import { ActionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ActiveAdapter {

  /**
   * Register an active ability on an actor.
   * Validates contract, then dispatches to appropriate handler.
   *
   * @param {Object} actor - The actor document
   * @param {Object} ability - The ability item
   */
  static register(actor, ability) {
    if (ability.system.executionModel !== "ACTIVE") return;

    ActiveContractValidator.validate(ability);

    switch (ability.system.subType) {

      case ACTIVE_SUBTYPES.EFFECT:
        this.handleEffect(actor, ability);
        break;

      case ACTIVE_SUBTYPES.MODE:
        this.handleMode(actor, ability);
        break;
    }
  }

  /**
   * Handle EFFECT subtype - One-time activated abilities with cost/frequency/duration.
   *
   * Pipeline:
   * 1. Validate action economy (ActionEngine)
   * 2. Check frequency limit (ActivationLimitEngine)
   * 3. Verify cost available (Force Points or resources)
   * 4. Resolve targets from targeting block
   * 5. Apply effect to each target (ModifierEngine or ActorEngine)
   * 6. Track duration (DurationEngine)
   * 7. Deduct cost (ActorEngine)
   * 8. Record activation (ActivationLimitEngine)
   * 9. Post result (SWSEChat)
   *
   * @param {Object} actor - Activating actor
   * @param {Object} ability - ACTIVE/EFFECT ability item
   * @returns {Promise<Object>} Result { success, reason, targetCount, duration }
   */
  static async handleEffect(actor, ability) {
    try {
      const meta = ability.system?.abilityMeta;
      const activation = meta?.activation;
      const frequency = meta?.frequency;
      const cost = meta?.cost;
      const targeting = meta?.targeting;
      const effect = meta?.effect;

      // ─── 1. Validate action economy ──────────────────────────────────────────
      if (activation?.actionType && actor.system?.combat?.actionState) {
        const currentTurn = actor.system.combat.actionState;
        const actionCost = this._mapActionType(activation.actionType);
        const check = ActionEngine.previewConsume(currentTurn, actionCost);

        if (!check.allowed) {
          const reason = `Insufficient ${activation.actionType} action available`;
          SWSELogger.log(`[ActiveAdapter] EFFECT blocked (action economy): ${ability.name} — ${reason}`);
          await SWSEChat.postMessage({
            flavor: `❌ ${ability.name}`,
            content: reason,
            actor
          });
          return { success: false, reason };
        }
      }

      // ─── 2. Check frequency limit ────────────────────────────────────────────
      const limitType = frequency?.type ?? LimitType.UNLIMITED;
      const maxUses = frequency?.max ?? 1;
      const limitCheck = ActivationLimitEngine.canActivate(actor, ability.id, limitType, maxUses);

      if (!limitCheck.allowed) {
        SWSELogger.log(`[ActiveAdapter] EFFECT blocked (frequency): ${ability.name} — ${limitCheck.reason}`);
        await SWSEChat.postMessage({
          flavor: `❌ ${ability.name}`,
          content: limitCheck.reason,
          actor
        });
        return { success: false, reason: limitCheck.reason };
      }

      // ─── 3. Verify cost ─────────────────────────────────────────────────────
      let costDetails = '';
      if (cost?.forcePoints > 0) {
        const currentForce = actor.system?.forcePoints?.available ?? 0;
        if (currentForce < cost.forcePoints) {
          const reason = `Insufficient Force Points (need ${cost.forcePoints}, have ${currentForce})`;
          SWSELogger.log(`[ActiveAdapter] EFFECT blocked (cost): ${ability.name} — ${reason}`);
          await SWSEChat.postMessage({
            flavor: `❌ ${ability.name}`,
            content: reason,
            actor
          });
          return { success: false, reason };
        }
        costDetails = `${cost.forcePoints} Force Point${cost.forcePoints !== 1 ? 's' : ''}`;
      }

      // ─── 4. Resolve targets ──────────────────────────────────────────────────
      const targets = this._resolveTargets(actor, targeting);
      if (targets.length === 0 && targeting?.targetType !== 'SELF') {
        const reason = `No valid targets found`;
        SWSELogger.log(`[ActiveAdapter] EFFECT blocked (targeting): ${ability.name} — ${reason}`);
        await SWSEChat.postMessage({
          flavor: `❌ ${ability.name}`,
          content: reason,
          actor
        });
        return { success: false, reason };
      }

      const effectTargets = targets.length > 0 ? targets : [actor];

      // ─── 5. Apply effect to each target ──────────────────────────────────────
      const duration = effect?.duration;
      const durationRounds = this._parseDuration(duration);

      for (const target of effectTargets) {
        await this._applyEffect(target, ability, effect);

        // Track duration if applicable
        if (durationRounds > 0) {
          const currentRound = game?.combat?.round ?? 0;
          DurationEngine.trackEffect(target, ability.id, durationRounds, currentRound);
        }
      }

      // ─── 6. Deduct cost ─────────────────────────────────────────────────────
      if (cost?.forcePoints > 0) {
        await ActorEngine.updateActor(actor, {
          'system.forcePoints.available': Math.max(0, (actor.system?.forcePoints?.available ?? 0) - cost.forcePoints)
        });
      }

      // ─── 7. Record activation ─────────────────────────────────────────────────
      ActivationLimitEngine.recordActivation(actor, ability.id, limitType);

      // ─── 8. Post result ─────────────────────────────────────────────────────
      const successMsg = `✓ **${ability.name}** activated on ${effectTargets.map(t => t.name).join(', ')}`;
      const details = [costDetails, durationRounds > 0 ? `Duration: ${durationRounds} round${durationRounds !== 1 ? 's' : ''}` : null]
        .filter(Boolean)
        .join(' • ');

      await SWSEChat.postMessage({
        flavor: `✓ ${ability.name}`,
        content: successMsg + (details ? `\n${details}` : ''),
        actor
      });

      SWSELogger.log(`[ActiveAdapter] EFFECT success: ${ability.name} on ${effectTargets.length} target(s)`);
      return {
        success: true,
        reason: 'Activated',
        targetCount: effectTargets.length,
        duration: durationRounds
      };

    } catch (err) {
      SWSELogger.error(`[ActiveAdapter] EFFECT error for ${ability.name}:`, err);
      return { success: false, reason: `Error: ${err.message}` };
    }
  }

  /**
   * Handle MODE subtype - Toggle stances/modes with persistent effects.
   *
   * Pipeline:
   * 1. Check if mode is already active
   * 2. If active: deactivate, remove persistent effect
   * 3. If inactive: check exclusive group, deactivate other modes in group, activate this one, apply effect
   * 4. Validate action cost if activating
   * 5. Record activation if applicable
   * 6. Update UI state
   *
   * @param {Object} actor - Activating actor
   * @param {Object} ability - ACTIVE/MODE ability item
   * @returns {Promise<Object>} Result { success, reason, newState }
   */
  static async handleMode(actor, ability) {
    // TODO: implement MODE logic (Phase 3)
  }

  /**
   * Map activation action type to ActionEngine cost structure.
   * @private
   */
  static _mapActionType(actionType) {
    switch (actionType?.toUpperCase()) {
      case 'STANDARD': return { standard: 1, move: 0, swift: 0 };
      case 'MOVE': return { standard: 0, move: 1, swift: 0 };
      case 'SWIFT': return { standard: 0, move: 0, swift: 1 };
      case 'FREE': return { standard: 0, move: 0, swift: 0 };
      default: return { standard: 0, move: 0, swift: 0 };
    }
  }

  /**
   * Resolve target list from targeting configuration.
   * Handles SELF, selected tokens, and proximity-based targeting.
   * @private
   */
  static _resolveTargets(actor, targeting) {
    if (!targeting) return [];

    const targetType = targeting.targetType?.toUpperCase();

    // SELF targeting
    if (targetType === 'SELF') {
      return [actor];
    }

    // Get current selected tokens (assumes active scene)
    const selectedTokens = Array.from(game?.user?.targets ?? []);
    if (selectedTokens.length === 0) {
      return [];
    }

    // Filter by target type
    const validTargets = selectedTokens
      .map(t => t.document?.actor || t.actor)
      .filter(t => {
        if (!t) return false;
        if (targetType === 'ALLY') {
          // TODO: implement alliance check (for now, assume tokens not named "Enemy")
          return !t.name?.includes('Enemy');
        }
        if (targetType === 'ENEMY') {
          return t.name?.includes('Enemy');
        }
        return true; // ANY
      });

    return validTargets;
  }

  /**
   * Parse duration configuration to rounds.
   * @private
   */
  static _parseDuration(duration) {
    if (!duration) return 0;
    if (duration.type === 'INSTANT') return 0;
    return duration.value ?? 1;
  }

  /**
   * Apply effect to a target actor.
   * Handles MODIFIER, STATUS, and HEAL types.
   * @private
   */
  static async _applyEffect(target, ability, effectConfig) {
    if (!target || !effectConfig) return;

    const effectType = effectConfig.type?.toUpperCase();
    const payload = effectConfig.payload ?? {};

    switch (effectType) {
      case 'MODIFIER':
        // TODO: Apply modifier via ModifierEngine (Phase 4)
        break;

      case 'STATUS':
        // TODO: Apply condition/status via ConditionEngine (Phase 4)
        break;

      case 'HEAL':
        // TODO: Apply healing (Phase 4)
        break;

      case 'CUSTOM':
        // TODO: Call custom handler (Phase 4)
        break;
    }
  }
}
