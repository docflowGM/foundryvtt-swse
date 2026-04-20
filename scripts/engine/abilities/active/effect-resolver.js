/**
 * EffectResolver - Apply activated effects to target actors
 *
 * Handles concrete effect application for ACTIVE/EFFECT abilities.
 * Routes effect types to appropriate subsystems:
 * - MODIFIER: Apply numeric bonuses via ModifierEngine
 * - STATUS: Apply conditions via ConditionEngine
 * - HEAL: Apply healing via ActorEngine
 * - CUSTOM: Call custom handler function
 *
 * GOVERNANCE:
 * - No mutations outside ActorEngine
 * - All permanent changes route through ActorEngine
 * - Duration tracking handled externally (DurationEngine)
 * - Pure: Same input = same output (modulo side effects on actor state)
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class EffectResolver {
  /**
   * Apply an effect configuration to a target actor.
   *
   * @param {Object} target - Target actor document
   * @param {Object} sourceAbility - The ACTIVE ability triggering the effect
   * @param {Object} effectConfig - Effect configuration block
   * @returns {Promise<Object>} Result { applied, type, details }
   */
  static async apply(target, sourceAbility, effectConfig) {
    if (!target || !effectConfig) {
      return { applied: false, type: null, details: 'Invalid target or effect config' };
    }

    try {
      const effectType = effectConfig.type?.toUpperCase();
      const payload = effectConfig.payload ?? {};

      SWSELogger.debug(`[EffectResolver] Applying ${effectType} effect to ${target.name}`, {
        ability: sourceAbility.name,
        payload
      });

      switch (effectType) {
        case 'MODIFIER':
          return await this._applyModifier(target, sourceAbility, payload);

        case 'STATUS':
          return await this._applyStatus(target, sourceAbility, payload);

        case 'HEAL':
          return await this._applyHeal(target, sourceAbility, payload);

        case 'CUSTOM':
          return await this._applyCustom(target, sourceAbility, payload);

        default:
          SWSELogger.warn(`[EffectResolver] Unknown effect type: ${effectType}`);
          return { applied: false, type: effectType, details: 'Unknown effect type' };
      }
    } catch (err) {
      SWSELogger.error(`[EffectResolver] Error applying effect to ${target?.name}:`, err);
      return { applied: false, type: null, details: `Error: ${err.message}` };
    }
  }

  /**
   * Apply a MODIFIER effect - numeric bonuses to stats.
   *
   * Payload structure:
   * {
   *   target: "attack" | "defense.reflex" | "skill.acrobatics" | etc.
   *   value: number (the bonus)
   *   type: "untyped" | "racial" | "circumstance" | etc. (for stacking rules)
   *   description: string (for UI display)
   * }
   *
   * @private
   */
  static async _applyModifier(target, sourceAbility, payload) {
    const { target: modTarget, value, type, description } = payload;

    if (!modTarget || !Number.isFinite(value)) {
      return {
        applied: false,
        type: 'MODIFIER',
        details: 'Invalid modifier target or value'
      };
    }

    // Store modifier in custom modifier array on actor (for UI display)
    // The ModifierEngine will pick these up during aggregation
    const customMods = target.getFlag?.('swse', 'customModifiers') ?? [];
    const modId = `${sourceAbility.id}-${Date.now()}`;

    const newMod = {
      id: modId,
      sourceAbilityId: sourceAbility.id,
      sourceAbilityName: sourceAbility.name,
      target: modTarget,
      value,
      type: type ?? 'untyped',
      description: description ?? sourceAbility.name,
      timestamp: Date.now()
    };

    customMods.push(newMod);

    // Update actor (via ActorEngine for governance)
    await ActorEngine.updateActor(target, {
      'flags.swse.customModifiers': customMods
    });

    // Trigger recalculation
    await ActorEngine.recalcAll(target);

    SWSELogger.log(
      `[EffectResolver] Applied MODIFIER: +${value} to ${modTarget} on ${target.name}`,
      { abilityId: sourceAbility.id }
    );

    return {
      applied: true,
      type: 'MODIFIER',
      details: `+${value} to ${modTarget}`
    };
  }

  /**
   * Apply a STATUS effect - conditions/injuries/penalties.
   *
   * Payload structure:
   * {
   *   condition: "bleeding" | "dazed" | "stunned" | etc.
   *   severity: 0-5 (for scaled conditions)
   *   description: string (for UI display)
   * }
   *
   * planned: Integrate with ConditionEngine (Phase 4+)
   *
   * @private
   */
  static async _applyStatus(target, sourceAbility, payload) {
    const { condition, severity, description } = payload;

    if (!condition) {
      return {
        applied: false,
        type: 'STATUS',
        details: 'Invalid condition name'
      };
    }

    // planned: Use ConditionEngine.applyCondition(target, condition, severity)
    // For now, just log the intent
    SWSELogger.warn(
      `[EffectResolver] STATUS effect not yet implemented: ${condition} on ${target.name}`,
      { abilityId: sourceAbility.id, severity }
    );

    return {
      applied: false,
      type: 'STATUS',
      details: 'Status effects not yet implemented'
    };
  }

  /**
   * Apply a HEAL effect - restore hit points.
   *
   * Payload structure:
   * {
   *   formula: "1d6" | "2d8+3" | "CON_MOD*2" | etc.
   *   evaluateAs: "damage" | "healing" (determines rounding/crit interaction)
   * }
   *
   * @private
   */
  static async _applyHeal(target, sourceAbility, payload) {
    const { formula, evaluateAs } = payload;

    if (!formula) {
      return {
        applied: false,
        type: 'HEAL',
        details: 'Invalid healing formula'
      };
    }

    try {
      // Evaluate healing formula
      // planned: Use Roll engine to evaluate formula
      // const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });
      // const healAmount = roll.total;

      const healAmount = parseInt(formula) || 0; // Fallback for now

      if (healAmount <= 0) {
        return {
          applied: false,
          type: 'HEAL',
          details: 'Healing formula evaluated to 0 or less'
        };
      }

      // Apply healing
      const currentHP = target.system?.health?.current ?? 0;
      const maxHP = target.system?.health?.max ?? 1;
      const newHP = Math.min(currentHP + healAmount, maxHP);

      await ActorEngine.updateActor(target, {
        'system.hp.value': newHP
      });

      SWSELogger.log(
        `[EffectResolver] Applied HEAL: +${healAmount} HP on ${target.name} (${currentHP}→${newHP})`,
        { abilityId: sourceAbility.id }
      );

      return {
        applied: true,
        type: 'HEAL',
        details: `Healed ${healAmount} HP (${currentHP}→${newHP})`
      };
    } catch (err) {
      SWSELogger.error(`[EffectResolver] Error applying healing to ${target.name}:`, err);
      return {
        applied: false,
        type: 'HEAL',
        details: `Error: ${err.message}`
      };
    }
  }

  /**
   * Apply a CUSTOM effect - call custom handler function.
   *
   * Payload structure:
   * {
   *   handlerPath: "/systems/.../custom-effect-handler.js" (module path)
   *   handlerName: "applyCustomEffect" (export name)
   *   params: { any custom data }
   * }
   *
   * @private
   */
  static async _applyCustom(target, sourceAbility, payload) {
    const { handlerPath, handlerName, params } = payload;

    if (!handlerPath || !handlerName) {
      return {
        applied: false,
        type: 'CUSTOM',
        details: 'Missing handlerPath or handlerName'
      };
    }

    try {
      const module = await import(handlerPath);
      const handler = module[handlerName];

      if (typeof handler !== 'function') {
        return {
          applied: false,
          type: 'CUSTOM',
          details: `Handler "${handlerName}" is not a function`
        };
      }

      const result = await handler(target, sourceAbility, params);

      SWSELogger.log(
        `[EffectResolver] Applied CUSTOM: ${handlerName} on ${target.name}`,
        { abilityId: sourceAbility.id, result }
      );

      return {
        applied: result?.applied ?? true,
        type: 'CUSTOM',
        details: result?.details ?? 'Custom effect applied'
      };
    } catch (err) {
      SWSELogger.error(`[EffectResolver] Error loading custom handler:`, err);
      return {
        applied: false,
        type: 'CUSTOM',
        details: `Error loading handler: ${err.message}`
      };
    }
  }

  /**
   * Unapply an effect (remove modifier, cure status, etc.)
   * Currently only supports MODIFIER effects; others planned.
   *
   * @param {Object} target - Target actor document
   * @param {string} abilityId - ID of ability that applied the effect
   * @returns {Promise<Object>} Result
   */
  static async remove(target, abilityId) {
    try {
      // Remove from custom modifiers
      const customMods = target.getFlag?.('swse', 'customModifiers') ?? [];
      const filtered = customMods.filter(mod => mod.sourceAbilityId !== abilityId);

      if (filtered.length === customMods.length) {
        // No modifiers were removed
        return { removed: false, type: 'MODIFIER', details: 'No matching effect found' };
      }

      await ActorEngine.updateActor(target, {
        'flags.swse.customModifiers': filtered
      });

      // Trigger recalculation
      await ActorEngine.recalcAll(target);

      SWSELogger.log(`[EffectResolver] Removed effects from ${abilityId} on ${target.name}`);

      return {
        removed: true,
        type: 'MODIFIER',
        details: `Removed ${customMods.length - filtered.length} modifier(s)`
      };
    } catch (err) {
      SWSELogger.error(`[EffectResolver] Error removing effect from ${target?.name}:`, err);
      return { removed: false, type: null, details: `Error: ${err.message}` };
    }
  }
}

export default EffectResolver;
