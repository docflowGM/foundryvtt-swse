
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

function rapidAlchemyDamageBonus(actor, weapon) {
  const state = rapidAlchemyState(actor);
  if (!state?.sacrificePending) return 0;
  return weaponMatchesId(weapon, state.weaponId) ? Number(state.damageBonus ?? 5) || 5 : 0;
}

async function clearRapidAlchemyDamageBonus(actor, weapon) {
  const state = rapidAlchemyState(actor);
  if (!state?.sacrificePending || !weaponMatchesId(weapon, state.weaponId)) return;
  await actor?.setFlag?.('swse', 'rapidAlchemy', { ...state, sacrificePending: false, consumedAt: Date.now() });
}

function forceItemState(weapon) {
  return weapon?.getFlag?.('swse', 'forceItem') ?? weapon?.flags?.swse?.forceItem ?? null;
}

function forceItemAttackBonus(actor, weapon) {
  const state = forceItemState(weapon);
  if (String(state?.attuned?.actorId ?? '') !== String(actor?.id ?? '')) return 0;
  return Number(state.attuned.attackBonus ?? 1) || 1;
}

function firstWeaponDamageDieFormula(weapon) {
  const formula = String(weapon?.system?.damage ?? weapon?.system?.damageFormula ?? '1d6');
  const match = formula.match(/(\d*)d(\d+)/i);
  if (!match) return '';
  return `1d${match[2]}`;
}

function forceItemExtraDamageFormula(actor, weapon) {
  const state = forceItemState(weapon);
  if (String(state?.empowered?.actorId ?? '') !== String(actor?.id ?? '')) return '';
  return firstWeaponDamageDieFormula(weapon);
}


function actorHasTalentNamed(actor, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : [names])
    .map(name => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean));
  if (!wanted.size) return false;
  try {
    return Array.from(actor?.items ?? []).some(item => {
      if (item?.type !== 'talent') return false;
      const key = String(item.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      return wanted.has(key);
    });
  } catch (_err) {
    return false;
  }
}

function actorHasFeatNamed(actor, names = []) {
  const wanted = new Set((Array.isArray(names) ? names : [names])
    .map(name => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean));
  if (!wanted.size) return false;
  try {
    return Array.from(actor?.items ?? []).some(item => {
      if (item?.type !== 'feat') return false;
      const key = String(item.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      return wanted.has(key);
    });
  } catch (_err) {
    return false;
  }
}

function targetActorFromDamageContext(context = {}) {
  return context?.target ?? context?.targetActor ?? game?.user?.targets?.first?.()?.actor ?? null;
}

function inquisitionExtraDamageFormula(actor, weapon, context = {}) {
  if (!actorHasTalentNamed(actor, 'Inquisition')) return '';
  const target = targetActorFromDamageContext(context);
  if (!target || !actorHasFeatNamed(target, 'Force Sensitivity')) return '';
  return firstWeaponDamageDieFormula(weapon);
}

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { mergeCombatWorkflowContextIntoRollOptions, summarizeCombatWorkflowContext } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js";
import { resolveDamagePacketType } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js";
import { damageTypesFromContext } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";
import { getCriticalDamageBonus, computeDamageBonus } from "/systems/foundryvtt-swse/scripts/combat/utils/combat-utils.js";
import { TalentEffectEngine } from "/systems/foundryvtt-swse/scripts/engine/talent/talent-effect-engine.js";
import { isNpcStatblockMode } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js";
import { getCriticalMultiplier as getRawCriticalMultiplier, isAreaAttack } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
/**
 * Compute talent-based damage bonuses (Sneak Attack, Skirmisher, etc.)
 * @param {Actor} actor - The attacking actor
 * @param {Object} context - Attack context {target, weapon, isCritical, aimedThisTurn}
 * @returns {Object} {formula: string, breakdown: Array}
 */
function computeTalentDamageBonus(actor, context = {}) {
  try {
    return TalentEffectEngine.calculateDamageBonus(actor, context);
  } catch (err) {
    swseLogger.warn('Failed to calculate talent damage bonus:', err);
    return { formula: '', bonusDice: [], flatBonus: 0, breakdown: [], notifications: [] };
  }
}

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


  const baseFormula = weapon.system?.damage ?? '1d6';
  const dmgBonus = computeDamageBonus(actor, weapon, {
    ...rollContext,
    forceTwoHanded: rollContext.twoHanded || false
  }) + rapidAlchemyDamageBonus(actor, weapon);

  // Calculate talent-based damage bonuses
  const talentContext = { ...rollContext, weapon };
  const talentBonus = computeTalentDamageBonus(actor, talentContext);

  // Build complete formula
  const formulaParts = [baseFormula];
  if (dmgBonus !== 0) {
    formulaParts.push(dmgBonus.toString());
  }
  if (talentBonus.formula) {
    formulaParts.push(talentBonus.formula);
  }

  const forceItemDamageFormula = forceItemExtraDamageFormula(actor, weapon);
  if (forceItemDamageFormula) {
    formulaParts.push(forceItemDamageFormula);
  }

  const inquisitionDamageFormula = inquisitionExtraDamageFormula(actor, weapon, rollContext);
  if (inquisitionDamageFormula) {
    formulaParts.push(inquisitionDamageFormula);
  }

  // Add Force Point bonus if present
  const fpBonus = rollContext.fpBonus || 0;
  if (fpBonus !== 0) {
    formulaParts.push(fpBonus.toString());
  }

  // Add custom modifier if present
  const customModifier = rollContext.customModifier || 0;
  if (customModifier !== 0) {
    formulaParts.push(customModifier.toString());
  }

  let formula = formulaParts.join(' + ');

  // RAW: confirmed critical hits multiply damage; area attacks do not deal
  // double damage on a critical. Extra critical-only bonuses are appended after
  // the multiplier so they do not get accidentally multiplied twice.
  const critMultiplier = Number(rollContext.critMultiplier ?? getRawCriticalMultiplier(weapon, 2)) || 2;
  if (rollContext.isCritical && !isAreaAttack(weapon, rollContext) && critMultiplier > 1) {
    formula = `(${formula}) * ${critMultiplier}`;
  }

  if (rollContext.isCritical) {
    const critBonusFormula = getCriticalDamageBonus(actor, weapon);
    if (critBonusFormula) {
      formula = `${formula} + (${critBonusFormula})`;
    }
  }

  const roll = await globalThis.SWSE.RollEngine.safeRoll(formula);
  if (roll) {
    roll.swseDamageFormula = formula;
  }

  // Build flavor text with breakdown
  let flavor = `${weapon.name} Damage`;
  if (rollContext.isCritical) {
    flavor += ` [CRITICAL]`;
  }
  if (talentBonus.breakdown.length > 0) {
    flavor += ` (${talentBonus.breakdown.join(', ')})`;
  }
  if (fpBonus !== 0) {
    flavor += ` [FP: +${fpBonus}]`;
  }
  if (customModifier !== 0) {
    flavor += ` [Mod: ${customModifier >= 0 ? '+' : ''}${customModifier}]`;
  }

  // Show notifications for talent bonuses
  for (const notification of talentBonus.notifications) {
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
        critMultiplier,
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
export async function rollAndApplyDamage(actor, weapon, token) {
  const roll = await rollDamage(actor, weapon);
  if (!roll) {return null;}

  await applyDamage(token, roll.total);
  return roll;
}
