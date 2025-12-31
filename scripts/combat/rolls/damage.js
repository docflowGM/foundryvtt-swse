import { swseLogger } from "../../utils/logger.js";
import { TalentAbilitiesEngine } from "../../engine/TalentAbilitiesEngine.js";

/**
 * Compute SWSE RAW damage bonus.
 * - Half level
 * - Ability-based (STR or DEX)
 * - Weapon modifier
 * - Weapon Specialization (+2)
 * - Future Active Effects can adjust final bonus
 */
function computeDamageBonus(actor, weapon) {
  const lvl = actor.system.level ?? 1;
  const halfLvl = Math.floor(lvl / 2);

  let bonus = halfLvl + (weapon.system?.attackBonus ?? 0);

  // Ability modifiers
  const strMod = actor.system.abilities?.str?.mod ?? 0;
  const dexMod = actor.system.abilities?.dex?.mod ?? 0;

  switch (weapon.system?.attackAttribute) {
    case "str": bonus += strMod; break;
    case "dex": bonus += dexMod; break;
    case "2str": bonus += (strMod * 2); break;
    case "2dex": bonus += (dexMod * 2); break;
  }

  return bonus;
}

/**
 * Compute talent-based damage bonuses (Sneak Attack, Skirmisher, etc.)
 * @param {Actor} actor - The attacking actor
 * @param {Object} context - Attack context {target, weapon, isCritical, aimedThisTurn}
 * @returns {Object} {formula: string, breakdown: Array}
 */
function computeTalentDamageBonus(actor, context = {}) {
  try {
    return TalentAbilitiesEngine.calculateDamageBonus(actor, context);
  } catch (err) {
    swseLogger.warn("Failed to calculate talent damage bonus:", err);
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
  if (!actor || !weapon) {
    ui.notifications.error("Missing actor or weapon for damage roll.");
    return null;
  }

  const baseFormula = weapon.system?.damage ?? "1d6";
  const dmgBonus = computeDamageBonus(actor, weapon);

  // Calculate talent-based damage bonuses
  const talentContext = { ...context, weapon };
  const talentBonus = computeTalentDamageBonus(actor, talentContext);

  // Build complete formula
  let formulaParts = [baseFormula];
  if (dmgBonus !== 0) {
    formulaParts.push(dmgBonus.toString());
  }
  if (talentBonus.formula) {
    formulaParts.push(talentBonus.formula);
  }
  const formula = formulaParts.join(' + ');

  const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });

  // Build flavor text with breakdown
  let flavor = `${weapon.name} Damage`;
  if (talentBonus.breakdown.length > 0) {
    flavor += ` (${talentBonus.breakdown.join(', ')})`;
  }

  // Show notifications for talent bonuses
  for (const notification of talentBonus.notifications) {
    ui.notifications.info(notification);
  }

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor
  });

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
  if (!roll) return null;

  // Apply post-damage effects if we have a target
  if (target) {
    const effectContext = {
      ...context,
      weapon,
      target,
      damageDealt: roll.total
    };

    try {
      await TalentAbilitiesEngine.applyPostDamageEffects(actor, target, effectContext);
    } catch (err) {
      swseLogger.warn("Failed to apply post-damage effects:", err);
    }

    // Track last attack target for Skirmisher
    await actor.setFlag('foundryvtt-swse', 'lastAttackTarget', target.id);

    // Mark sneak attack as used this round
    const abilities = TalentAbilitiesEngine.getAbilitiesForActor(actor);
    if (abilities.all.some(a => a.id === 'sneak-attack')) {
      await actor.setFlag('foundryvtt-swse', 'sneakAttackUsedThisRound', true);
    }
  }

  return roll;
}

/**
 * Roll generic damage (powers, hazards, GM tools)
 */
export async function rollDamageGeneric(actor, formula = "1d6", label = "Damage") {
  if (!actor) {
    ui.notifications.warn("No actor available for damage roll.");
    return null;
  }

  const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${label} (${formula})`
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
    ui.notifications.warn("No actor found on token.");
    return null;
  }

  if (typeof amount !== "number") {
    ui.notifications.error("Damage amount must be a number.");
    return null;
  }

  try {
    await actor.applyDamage(amount, options); // Uses your new CT + threshold logic
    ui.notifications.info(`${actor.name} takes ${amount} damage!`);
  } catch (err) {
    swseLogger.error(err);
    ui.notifications.error("Failed to apply damage.");
  }

  return actor;
}

/**
 * Roll damage + Apply damage in one step (optional helper)
 */
export async function rollAndApplyDamage(actor, weapon, token) {
  const roll = await rollDamage(actor, weapon);
  if (!roll) return null;

  await applyDamage(token, roll.total);
  return roll;
}
