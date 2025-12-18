import { swseLogger } from "../../utils/logger.js";

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

  let bonus = halfLvl + (weapon.system?.modifier ?? 0);

  // Ability modifiers
  const strMod = actor.system.abilities?.str?.mod ?? 0;
  const dexMod = actor.system.abilities?.dex?.mod ?? 0;

  switch (weapon.system?.damageAttr) {
    case "str": bonus += strMod; break;
    case "dex": bonus += dexMod; break;
    case "2str": bonus += (strMod * 2); break;
    case "2dex": bonus += (dexMod * 2); break;
  }

  // Weapon Specialization RAW = +2 damage
  if (weapon.system?.specialization === true) {
    bonus += 2;
  }

  return bonus;
}

/**
 * Roll damage for a SWSE weapon/power.
 * Handles:
 *  - Complete SWSE damage math
 *  - Active Effects (Actor.applyDamage handles thresholds)
 */
export async function rollDamage(actor, weapon) {
  if (!actor || !weapon) {
    ui.notifications.error("Missing actor or weapon for damage roll.");
    return null;
  }

  const baseFormula = weapon.system?.damage ?? "1d6";
  const dmgBonus = computeDamageBonus(actor, weapon);
  const formula = `${baseFormula} + ${dmgBonus}`;

  const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${weapon.name} Damage (${formula})`
  });

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
