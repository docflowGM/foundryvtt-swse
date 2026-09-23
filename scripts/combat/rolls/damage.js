
function currentCombatEncounterId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
}

function weaponMatchesId(weapon, id) {
  if (!weapon || !id) return false;
  return String(weapon.id ?? weapon._id ?? '') === String(id);
}

function rapidAlchemyState(actor) {
  const state = actor?.getFlag?.('swse', 'rapidAlchemy') ?? null;
  if (!state || state.encounterId !== currentCombatEncounterId()) return null;
  return state;
}

async function clearRapidAlchemyDamageBonus(actor, weapon) {
  const state = rapidAlchemyState(actor);
  if (!state?.sacrificePending || !weaponMatchesId(weapon, state.weaponId)) return;
  await actor?.setFlag?.('swse', 'rapidAlchemy', { ...state, sacrificePending: false, consumedAt: Date.now() });
}

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { mergeCombatWorkflowContextIntoRollOptions, summarizeCombatWorkflowContext } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js";
import { buildDamagePacket, resolveDamagePacketType } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js";
import { damageTypesFromContext } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";
import { resolveDamageComposition, buildDamageFormula } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js";
import { TalentEffectEngine } from "/systems/foundryvtt-swse/scripts/engine/talent/talent-effect-engine.js";
import { isNpcStatblockMode } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js";
import { isAreaAttack } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";

/**
 * Roll damage for a SWSE weapon/power.
 * Handles:
 *  - Complete SWSE damage math
 *  - Talent-based damage bonuses (Sneak Attack, Skirmisher, etc.)
 *  - Active Effects (Actor.applyDamage handles thresholds)
 *
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon used
 * @param {Object} context - Optional context {target, isCritical, aimedThisTurn}
 */
export async function rollDamage(actor, weapon, context = {}) {
  const rollContext = mergeCombatWorkflowContextIntoRollOptions(context, context?.combatContext ?? context?.workflowContext ?? null);
  const workflowContext = summarizeCombatWorkflowContext(rollContext.combatContext ?? rollContext.workflowContext ?? rollContext, {
    actor,
    weapon,
    target: rollContext.target,
    isCritical: rollContext.isCritical === true,
    critMultiplier: rollContext.critMultiplier,
    damageMode: rollContext.damageMode ?? null,
    damageType: rollContext.damageType ?? null,
    damageTypes: damageTypesFromContext({ weapon, workflowContext: rollContext.combatContext ?? rollContext.workflowContext ?? null, options: rollContext }).expanded,
    damageComponents: rollContext.damageComponents ?? rollContext.combatContext?.damage?.damageComponents ?? rollContext.workflowContext?.damage?.damageComponents ?? [],
    isStun: rollContext.stun === true || rollContext.damageMode === 'stun',
    isIon: rollContext.ion === true,
    contextTags: rollContext.damageMode === 'stun' || rollContext.stun === true ? ['stun'] : []
  });
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for damage roll.');
    return null;
  }

  // Statblock NPCs can roll printed damage formula until explicitly leveled.
  if (actor.type === 'npc' && isNpcStatblockMode(actor)) {
    const npc = weapon?.flags?.swse?.npc;
    const flatFormula = npc?.flatDamageFormula;

    if (npc?.useFlat === true && typeof flatFormula === 'string' && flatFormula.trim()) {
      const roll = await RollEngine.safeRoll(flatFormula);
      if (roll) {
        roll.swseDamageFormula = flatFormula;
        if (rollContext.suppressChat !== true) {
          await SWSEChat.postRoll({
          roll,
          actor,
          flavor: `${actor.name} — ${weapon.name} Damage`,
          flags: { swse: { damageRoll: true, weaponId: weapon.id, workflowContext } },
          context: { type: 'damage', weaponId: weapon.id, weapon, workflowContext, damageType: resolveDamagePacketType({ weapon, workflowContext, options: rollContext }), damageTypes: damageTypesFromContext({ weapon, workflowContext, options: rollContext }).expanded, damageComponents: rollContext.damageComponents ?? workflowContext?.damage?.damageComponents ?? [] }
        });
      }
      return roll;
    }
  }
  }


  // Canonical Damage SSOT (combat-roll-math.js): resolveDamageComposition()
  // is the single authority for every dice-shaped and additive damage
  // contribution (base dice, die-size steps, extra weapon dice, ½ level/
  // ability/enhancement/rage/effect-intent/combat-option/scoped-feat,
  // talent dice, Force Item/Inquisition dice, critical multiplier and
  // critical-only bonus formula). This orchestration wrapper's job is only
  // to gather workflow context, call composition + buildDamageFormula(),
  // roll it, and post/consume state — it no longer computes any damage
  // term itself. This is the actual fix for the confirmed live bug where
  // Deadeye/Burst Fire/Mighty Swing/Rapid Shot/Rapid Strike/unarmed
  // die-step contributions were silently dropped on this exact path.
  const compositionContext = { ...rollContext, weapon, forceTwoHanded: rollContext.twoHanded || false };
  const composition = resolveDamageComposition(actor, weapon, compositionContext);

  // Add Force Point bonus if present
  const fpBonus = rollContext.fpBonus || 0;
  // Add custom modifier if present
  const customModifier = rollContext.customModifier || 0;

  const formula = buildDamageFormula(composition, {
    extraTerms: [fpBonus !== 0 ? fpBonus : null, customModifier !== 0 ? customModifier : null],
    isAreaAttack: isAreaAttack(weapon, rollContext)
  });

  const roll = await globalThis.SWSE.RollEngine.safeRoll(formula);
  if (roll) {
    roll.swseDamageFormula = formula;
  }

  // Build flavor text with breakdown
  let flavor = `${weapon.name} Damage`;
  if (rollContext.isCritical) {
    flavor += ` [CRITICAL]`;
  }
  if (composition.dice.talentBreakdown.length > 0) {
    flavor += ` (${composition.dice.talentBreakdown.join(', ')})`;
  }
  if (fpBonus !== 0) {
    flavor += ` [FP: +${fpBonus}]`;
  }
  if (customModifier !== 0) {
    flavor += ` [Mod: ${customModifier >= 0 ? '+' : ''}${customModifier}]`;
  }

  // Show notifications for talent bonuses
  for (const notification of composition.talentNotifications) {
    ui.notifications.info(notification);
  }

  if (rollContext.suppressChat !== true) {
    await SWSEChat.postRoll({
      roll,
      actor,
      flavor,
      flags: { swse: { damageRoll: true, weaponId: weapon.id, workflowContext } },
      context: {
        type: 'damage',
        weaponId: weapon.id,
        weapon,
        isCritical: rollContext.isCritical === true,
        critMultiplier: composition.critical.multiplier,
        workflowContext,
        target: rollContext.target ?? null,
        targetContext: rollContext.targetContext ?? null,
        damageType: resolveDamagePacketType({ weapon, workflowContext, options: rollContext }),
        damageTypes: damageTypesFromContext({ weapon, workflowContext, options: rollContext }).expanded,
        damageComponents: rollContext.damageComponents ?? workflowContext?.damage?.damageComponents ?? []
      }
    });
  }

  await clearRapidAlchemyDamageBonus(actor, weapon);

  return roll;
}

/**
 * Roll damage with full combat integration.
 * Includes talent damage bonuses and applies post-damage effects.
 *
 * @param {Actor} actor - The attacking actor
 * @param {Item} weapon - The weapon used
 * @param {Actor} target - The target actor (for post-damage effects)
 * @param {Object} context - {isCritical, aimedThisTurn}
 */
export async function rollDamageWithEffects(actor, weapon, target, context = {}) {
  const roll = await rollDamage(actor, weapon, { ...context, target });
  if (!roll) {return null;}

  // Apply post-damage effects if we have a target
  if (target) {
    const effectContext = {
      ...context,
      weapon,
      target,
      damageDealt: roll.total
    };

    try {
      await TalentEffectEngine.applyPostDamageEffects(actor, target, effectContext);
    } catch (err) {
      swseLogger.warn('Failed to apply post-damage effects:', err);
    }

    // Track last attack target for Skirmisher
    await actor.setFlag('foundryvtt-swse', 'lastAttackTarget', target.id);

    // Mark sneak attack as used this round
    const abilityPanel = AbilityEngine.getCardPanelModelForActor(actor);
    if (abilityPanel.all?.some(a => a.id === 'sneak-attack')) {
      await actor.setFlag('foundryvtt-swse', 'sneakAttackUsedThisRound', true);
    }
  }

  return roll;
}

/**
 * Roll generic damage (powers, hazards, GM tools)
 */
export async function rollDamageGeneric(actor, formula = '1d6', label = 'Damage') {
  if (!actor) {
    ui.notifications.warn('No actor available for damage roll.');
    return null;
  }

  const roll = await globalThis.SWSE.RollEngine.safeRoll(formula);

  await SWSEChat.postRoll({
    roll,
    actor,
    flavor: `${label} (${formula})`,
    context: { type: 'damage', label }
  });

  return roll;
}

/**
 * Apply damage to an Actor via SWSEActorBase.applyDamage().
 * NO DIRECT HP MANIPULATION ANYMORE.
 */
export async function applyDamage(token, amount, options = {}) {
  const actor = token?.actor;

  if (!actor) {
    ui.notifications.warn('No actor found on token.');
    return null;
  }

  if (typeof amount !== 'number') {
    ui.notifications.error('Damage amount must be a number.');
    return null;
  }

  try {
    await actor.applyDamage(amount, options); // Uses your new CT + threshold logic
    ui.notifications.info(`${actor.name} takes ${amount} damage!`);
  } catch (err) {
    swseLogger.error(err);
    ui.notifications.error('Failed to apply damage.');
  }

  return actor;
}

/**
 * Roll damage + Apply damage in one step (optional helper)
 */
export async function rollAndApplyDamage(actor, weapon, token, context = {}) {
  const target = token?.actor ?? context?.target ?? context?.targetActor ?? null;
  const rollContext = { ...context, target };
  const roll = await rollDamage(actor, weapon, rollContext);
  if (!roll) {return null;}

  if (!target) {
    await applyDamage(token, roll.total);
    return roll;
  }

  const workflowContext = rollContext.combatContext ?? rollContext.workflowContext ?? rollContext;
  const packet = buildDamagePacket({
    attacker: actor,
    target,
    weapon,
    roll,
    amount: roll.total,
    workflowContext,
    options: rollContext
  });

  const { DamageSystem } = await import('/systems/foundryvtt-swse/scripts/combat/damage-system.js');
  await DamageSystem.applyPacketToActor(target, packet);
  return roll;
}
