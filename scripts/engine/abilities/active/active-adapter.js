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
import { EffectResolver } from "/systems/foundryvtt-swse/scripts/engine/abilities/active/effect-resolver.js";
import { TargetingEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/active/targeting-engine.js";
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
          'system.forcePoints.value': Math.max(0, (actor.system?.forcePoints?.available ?? 0) - cost.forcePoints)
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
   * 1. Check if mode is currently active
   * 2. If DEACTIVATING: remove persistent effect, update state
   * 3. If ACTIVATING:
   *    a. Check exclusive group constraints
   *    b. Deactivate other modes in same group (if any)
   *    c. Validate action cost (swift/standard only)
   *    d. Apply persistent effect
   *    e. Update state to active
   * 4. Record activation if applicable (usually free/no limit for toggle)
   * 5. Post result to chat
   *
   * @param {Object} actor - Activating actor
   * @param {Object} ability - ACTIVE/MODE ability item
   * @returns {Promise<Object>} Result { success, reason, newState }
   */
  static async handleMode(actor, ability) {
    try {
      const meta = ability.system?.abilityMeta;
      const activation = meta?.activation;
      const mode = meta?.mode;
      const persistentEffect = meta?.persistentEffect;

      // Get current mode state from item flags
      const isActive = ability.getFlag?.('swse', 'modeActive') ?? false;

      // ─── 1. DEACTIVATION PATH ───────────────────────────────────────────────
      if (isActive) {
        // Remove persistent effect
        if (persistentEffect) {
          // planned: Remove modifier via ModifierEngine (Phase 4)
        }

        // Deactivate the mode
        await ability.setFlag('foundryvtt-swse', 'modeActive', false);

        await SWSEChat.postMessage({
          flavor: `◯ ${ability.name}`,
          content: `**${ability.name}** deactivated`,
          actor
        });

        SWSELogger.log(`[ActiveAdapter] MODE deactivated: ${ability.name}`);
        return { success: true, reason: 'Deactivated', newState: false };
      }

      // ─── 2. ACTIVATION PATH ─────────────────────────────────────────────────

      // 2a. Check exclusive group
      if (mode?.exclusiveGroup) {
        const otherModes = actor.items.filter(item =>
          item.system?.executionModel === 'ACTIVE' &&
          item.system?.subType === 'MODE' &&
          item.system?.abilityMeta?.mode?.exclusiveGroup === mode.exclusiveGroup &&
          item.id !== ability.id
        );

        // 2b. Deactivate other modes in same group
        for (const otherMode of otherModes) {
          if (otherMode.getFlag?.('swse', 'modeActive')) {
            await otherMode.setFlag('foundryvtt-swse', 'modeActive', false);
            // planned: Remove persistent effect from other mode (Phase 4)
            SWSELogger.log(`[ActiveAdapter] Deactivated conflicting MODE: ${otherMode.name}`);
          }
        }
      }

      // 2c. Validate action cost
      if (activation?.actionType && actor.system?.combat?.actionState) {
        const currentTurn = actor.system.combat.actionState;
        const actionCost = this._mapActionType(activation.actionType);
        const check = ActionEngine.previewConsume(currentTurn, actionCost);

        if (!check.allowed) {
          const reason = `Insufficient ${activation.actionType} action available`;
          SWSELogger.log(`[ActiveAdapter] MODE blocked (action economy): ${ability.name}`);
          await SWSEChat.postMessage({
            flavor: `❌ ${ability.name}`,
            content: reason,
            actor
          });
          return { success: false, reason };
        }

        // Actually consume the action
        await ActorEngine.updateActor(actor, {
          'system.combat.actionState': check.turnState
        });
      }

      // 2d. Apply persistent effect
      if (persistentEffect) {
        // planned: Apply modifier via ModifierEngine (Phase 4)
      }

      // 2e. Activate the mode
      await ability.setFlag('foundryvtt-swse', 'modeActive', true);

      await SWSEChat.postMessage({
        flavor: `● ${ability.name}`,
        content: `**${ability.name}** activated`,
        actor
      });

      SWSELogger.log(`[ActiveAdapter] MODE activated: ${ability.name}`);
      return { success: true, reason: 'Activated', newState: true };

    } catch (err) {
      SWSELogger.error(`[ActiveAdapter] MODE error for ${ability.name}:`, err);
      return { success: false, reason: `Error: ${err.message}` };
    }
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
   * Delegates to TargetingEngine.
   * @private
   */
  static _resolveTargets(actor, targeting) {
    const result = TargetingEngine.resolve(actor, targeting);
    return result.targets;
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
   * Delegates to EffectResolver.
   * @private
   */
  static async _applyEffect(target, ability, effectConfig) {
    if (!target || !effectConfig) return;
    const result = await EffectResolver.apply(target, ability, effectConfig);
    return result;
  }
}
