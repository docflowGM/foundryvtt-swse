/**
 * Species Ability Effect Handlers
 *
 * Custom effect handlers for migrated species abilities.
 * These extend EffectResolver with species-specific logic.
 *
 * Handlers in this module:
 * - modifierApplication: Apply stat/defense/skill modifiers
 * - damageRoll: Roll and apply damage
 * - healing: Restore hit points
 * - drainHeal: Damage enemy and heal self
 * - custom: Species-specific custom handlers
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { RageEngine } from "/systems/foundryvtt-swse/scripts/engine/species/rage-engine.js";

/**
 * Handler registry for custom species ability effects
 */
export const SPECIES_EFFECT_HANDLERS = {
  shapeshifter_custom: handleShapeshifter,
  lucky_reroll: handleLuckyReroll,
  rage_mode: handleRageMode,
  irrepressible_immunity: handleIrrepressibleImmunity
};

/**
 * Apply modifier application effect
 * Applies bonuses/penalties to specific targets
 *
 * @param {Object} target - Target actor
 * @param {Object} sourceAbility - Source ability
 * @param {Object} effect - Effect config with modifier, value, duration
 */
export async function applyModifierApplication(target, sourceAbility, effect) {
  const { modifier, value, duration } = effect;

  if (!modifier || value === undefined) {
    return {
      applied: false,
      type: 'modifierApplication',
      details: 'Missing modifier or value'
    };
  }

  try {
    // Store modifier in flags for tracking
    const modifiers = target.flags?.swse?.modifiers ?? {};
    const abilityKey = sourceAbility.id;

    modifiers[abilityKey] = {
      modifier,
      value,
      duration,
      appliedAt: Date.now()
    };

    await ActorEngine.updateActor(target, {
      'flags.swse.modifiers': modifiers
    });

    // Trigger recalculation
    if (typeof ActorEngine.recalcAll === 'function') {
      await ActorEngine.recalcAll(target);
    }

    SWSELogger.log(
      `[SpeciesHandlers] Applied ${modifier} modifier: ${value > 0 ? '+' : ''}${value} to ${target.name}`,
      { abilityId: abilityKey }
    );

    return {
      applied: true,
      type: 'modifierApplication',
      details: `${modifier}: ${value > 0 ? '+' : ''}${value}`
    };
  } catch (err) {
    SWSELogger.error(`[SpeciesHandlers] Error applying modifier:`, err);
    return {
      applied: false,
      type: 'modifierApplication',
      details: `Error: ${err.message}`
    };
  }
}

/**
 * Apply damage roll effect
 * Rolls damage and applies to target
 *
 * @param {Object} target - Target actor
 * @param {Object} sourceAbility - Source ability
 * @param {Object} effect - Effect config with damageType, diceFormula
 */
export async function applyDamageRoll(target, sourceAbility, effect) {
  const { damageType, diceFormula } = effect;

  if (!diceFormula) {
    return {
      applied: false,
      type: 'damageRoll',
      details: 'Missing damage formula'
    };
  }

  try {
    // planned: Use actual Roll system when available
    // For now, simulate simple damage
    const baseDamage = parseInt(diceFormula) || 0;

    if (baseDamage > 0) {
      const currentHP = target.system?.health?.current ?? 0;
      const newHP = Math.max(0, currentHP - baseDamage);

      await ActorEngine.updateActor(target, {
        'system.hp.value': newHP
      });

      SWSELogger.log(
        `[SpeciesHandlers] Applied ${baseDamage} ${damageType || 'damage'} to ${target.name}`,
        { abilityId: sourceAbility.id }
      );

      return {
        applied: true,
        type: 'damageRoll',
        details: `${baseDamage} ${damageType || 'damage'} (${currentHP}→${newHP} HP)`
      };
    }

    return {
      applied: false,
      type: 'damageRoll',
      details: 'Damage formula evaluated to 0 or less'
    };
  } catch (err) {
    SWSELogger.error(`[SpeciesHandlers] Error applying damage:`, err);
    return {
      applied: false,
      type: 'damageRoll',
      details: `Error: ${err.message}`
    };
  }
}

/**
 * Apply healing effect
 * Restores hit points
 *
 * @param {Object} target - Target actor
 * @param {Object} sourceAbility - Source ability
 * @param {Object} effect - Effect config with formula or healAmount
 */
export async function applyHealing(target, sourceAbility, effect) {
  const { formula, healAmount } = effect;

  try {
    let amount = 0;

    if (formula === 'CHARACTER_LEVEL') {
      amount = target.system?.level ?? 1;
    } else if (typeof healAmount === 'number') {
      amount = healAmount;
    } else if (formula) {
      amount = parseInt(formula) || 0;
    }

    if (amount <= 0) {
      return {
        applied: false,
        type: 'healing',
        details: 'Healing formula evaluated to 0 or less'
      };
    }

    const currentHP = target.system?.health?.current ?? 0;
    const maxHP = target.system?.health?.max ?? 1;
    const newHP = Math.min(currentHP + amount, maxHP);

    await ActorEngine.updateActor(target, {
      'system.hp.value': newHP
    });

    SWSELogger.log(
      `[SpeciesHandlers] Applied healing: +${amount} HP to ${target.name} (${currentHP}→${newHP})`,
      { abilityId: sourceAbility.id }
    );

    return {
      applied: true,
      type: 'healing',
      details: `Healed ${amount} HP (${currentHP}→${newHP})`
    };
  } catch (err) {
    SWSELogger.error(`[SpeciesHandlers] Error applying healing:`, err);
    return {
      applied: false,
      type: 'healing',
      details: `Error: ${err.message}`
    };
  }
}

/**
 * Apply drain-heal effect
 * Damage enemy and heal attacker
 *
 * @param {Object} target - Target actor
 * @param {Object} sourceAbility - Source ability
 * @param {Object} effect - Effect config with diceFormula, healAmount
 * @param {Object} source - Source actor (the one using the ability)
 */
export async function applyDrainHeal(target, sourceAbility, effect, source) {
  const { diceFormula, healAmount } = effect;

  if (!diceFormula && !healAmount) {
    return {
      applied: false,
      type: 'drainHeal',
      details: 'Missing damage formula or heal amount'
    };
  }

  try {
    let damageAmount = 0;

    if (typeof healAmount === 'number') {
      damageAmount = healAmount;
    } else if (diceFormula) {
      damageAmount = parseInt(diceFormula) || 0;
    }

    if (damageAmount <= 0) {
      return {
        applied: false,
        type: 'drainHeal',
        details: 'Damage formula evaluated to 0 or less'
      };
    }

    // Apply damage to target
    const targetHP = target.system?.hp?.value ?? 0;
    const targetNewHP = Math.max(0, targetHP - damageAmount);

    await ActorEngine.updateActor(target, {
      'system.hp.value': targetNewHP
    });

    // Apply healing to source
    if (source) {
      const sourceHP = source.system?.hp?.value ?? 0;
      const sourceMaxHP = source.system?.hp?.max ?? 1;
      const sourceNewHP = Math.min(sourceHP + damageAmount, sourceMaxHP);

      await ActorEngine.updateActor(source, {
        'system.hp.value': sourceNewHP
      });
    }

    SWSELogger.log(
      `[SpeciesHandlers] Applied drain-heal: ${damageAmount} damage to ${target.name}, ` +
      `healed ${source?.name ?? 'source'} for ${damageAmount} HP`,
      { abilityId: sourceAbility.id }
    );

    return {
      applied: true,
      type: 'drainHeal',
      details: `Dealt ${damageAmount} damage, healed ${damageAmount} HP`
    };
  } catch (err) {
    SWSELogger.error(`[SpeciesHandlers] Error applying drain-heal:`, err);
    return {
      applied: false,
      type: 'drainHeal',
      details: `Error: ${err.message}`
    };
  }
}

/**
 * Custom handler: Clawdite Shapeshifter
 * Allows changing appearance
 */
async function handleShapeshifter(target, sourceAbility, payload) {
  try {
    // Store shapeshifter state in flags
    await ActorEngine.updateActor(target, {
      'flags.swse.shapeshifterActive': true,
      'flags.swse.shapeshifterForm': payload?.form ?? 'altered'
    });

    SWSELogger.log(
      `[SpeciesHandlers] Shapeshifter activated: ${target.name} altered appearance`,
      { abilityId: sourceAbility.id }
    );

    return {
      applied: true,
      type: 'custom',
      details: 'Appearance altered successfully'
    };
  } catch (err) {
    SWSELogger.error(`[SpeciesHandlers] Error applying Shapeshifter:`, err);
    return {
      applied: false,
      type: 'custom',
      details: `Error: ${err.message}`
    };
  }
}

/**
 * Custom handler: Gungan Lucky
 * Enables a reroll (deferred to next roll)
 */
async function handleLuckyReroll(target, sourceAbility, payload) {
  try {
    // Set flag allowing next roll to be rerolled
    await ActorEngine.updateActor(target, {
      'flags.swse.luckyRerollActive': true,
      'flags.swse.luckyRerollAbilityId': sourceAbility.id
    });

    SWSELogger.log(
      `[SpeciesHandlers] Lucky reroll activated for ${target.name}`,
      { abilityId: sourceAbility.id }
    );

    return {
      applied: true,
      type: 'custom',
      details: 'Lucky reroll available for next check'
    };
  } catch (err) {
    SWSELogger.error(`[SpeciesHandlers] Error applying Lucky:`, err);
    return {
      applied: false,
      type: 'custom',
      details: `Error: ${err.message}`
    };
  }
}

/**
 * Custom handler: Mantellian Savrip Rage
 * Grants bonuses but with restrictions
 */
async function handleRageMode(target, sourceAbility, payload = {}) {
  try {
    const mode = payload?.mode ?? payload?.rageMode ?? 'rage';
    const result = await RageEngine.startRage(target, { mode });
    if (result?.blocked) {
      return {
        applied: false,
        type: 'custom',
        details: result.reason || 'Rage is not available.'
      };
    }

    const rageRounds = result?.duration ?? RageEngine.getRageDurationRounds(target);

    SWSELogger.log(
      `[SpeciesHandlers] Rage activated for ${target.name} (${rageRounds} rounds)`,
      { abilityId: sourceAbility.id, mode: result?.mode ?? mode, action: result?.action, usesSpent: result?.usesSpent, usesPerDay: result?.usesPerDay }
    );

    return {
      applied: true,
      type: 'custom',
      details: result?.mode === 'channelRage'
        ? `Channeled Rage for +5 Will Defense (${result.usesSpent}/${result.usesPerDay} uses spent today)`
        : `Entered Rage for ${rageRounds} rounds (${result.usesSpent}/${result.usesPerDay} uses spent today)`
    };
  } catch (err) {
    SWSELogger.error(`[SpeciesHandlers] Error applying Rage:`, err);
    return {
      applied: false,
      type: 'custom',
      details: `Error: ${err.message}`
    };
  }
}

/**
 * Custom handler: Zabrak Irrepressible
 * Immunity to stunned/dazed for one turn
 */
async function handleIrrepressibleImmunity(target, sourceAbility, payload) {
  try {
    await ActorEngine.updateActor(target, {
      'flags.swse.irrepressibleActive': true,
      'flags.swse.irrepressibleExpires': Date.now() + 6000 // Roughly 1 turn
    });

    SWSELogger.log(
      `[SpeciesHandlers] Irrepressible immunity activated for ${target.name}`,
      { abilityId: sourceAbility.id }
    );

    return {
      applied: true,
      type: 'custom',
      details: 'Immune to stunned/dazed for one turn'
    };
  } catch (err) {
    SWSELogger.error(`[SpeciesHandlers] Error applying Irrepressible:`, err);
    return {
      applied: false,
      type: 'custom',
      details: `Error: ${err.message}`
    };
  }
}
