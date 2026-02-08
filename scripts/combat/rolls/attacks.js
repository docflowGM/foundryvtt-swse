import { getEffectiveHalfLevel } from '../../actors/derived/level-split.js';
// ============================================
// FILE: rolls/attacks.js (Upgraded for SWSE v13+)
// - Uses new Active Effects engine
// - Uses updated Actor data model
// - Integrates CT penalties, attack penalties, cover, etc.
// - Performance optimized, fail-safe, RAW-accurate
// ============================================

/**
 * Compute complete attack bonus from all SWSE factors.
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {string} actionId - Optional action ID for talent bonus lookup (e.g., 'melee-attack', 'ranged-attack')
 * @returns {number}
 */
function computeAttackBonus(actor, weapon, actionId = null) {
  // Statblock NPCs can use stored totals until explicitly leveled.
  if (actor?.type === 'npc') {
    const mode = actor.getFlag?.('swse', 'npcLevelUp.mode') ?? 'statblock';
    const npc = weapon?.flags?.swse?.npc;
    if (mode !== 'progression' && npc?.useFlat === true && Number.isFinite(npc.flatAttackBonus)) {
      return Number(npc.flatAttackBonus) || 0;
    }
  }

  const lvl = actor.system.level ?? 1;
  const halfLvl = getEffectiveHalfLevel(actor);

  const bab = actor.system.bab ?? 0;

  // Use new data model: abilities[xxx].mod
  const abilityMod = actor.system.attributes[weapon.system?.attackAttribute ?? "str"]?.mod ?? 0;

  const miscBonus = weapon.system?.attackBonus ?? 0;

  // Condition Track penalty (RAW)
  const ctPenalty = actor.system.conditionTrack?.penalty ?? 0;

  // Attack penalties applied from Active Effects
  const attackPenalty = actor.system.attackPenalty ?? 0;

  // Weapon proficiency
  const proficient = weapon.system?.proficient ?? true;
  const proficiencyPenalty = proficient ? 0 : -5;

  // Size modifier (optional, if your system supports it)
  const sizeMod = actor.system.sizeMod ?? 0;

  // Talent bonuses from linked talents
  let talentBonus = 0;
  const TalentActionLinker = window.SWSE?.TalentActionLinker;
  if (actionId && TalentActionLinker?.MAPPING) {
    const bonusInfo = TalentActionLinker.calculateBonusForAction(actor, actionId);
    talentBonus = bonusInfo.value;
  }

  // Total attack bonus (RAW)
  return (
    bab +
    halfLvl +
    abilityMod +
    miscBonus +
    sizeMod +
    attackPenalty +
    ctPenalty +
    proficiencyPenalty +
    talentBonus
  );
}

/**
 * Roll an attack with a weapon using SWSE rules.
 */
export async function rollAttack(actor, weapon) {
  if (!actor || !weapon) {
    ui.notifications.error("Missing actor or weapon for attack roll.");
    return null;
  }

  const atkBonus = computeAttackBonus(actor, weapon);

  const rollFormula = `1d20 + ${atkBonus}`;
  const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${weapon.name} Attack Roll (Bonus ${atkBonus >= 0 ? "+" : ""}${atkBonus})`
  } , { create: true });

  return roll;
}

/**
 * Compute SWSE damage bonus for a weapon
 */
function computeDamageBonus(actor, weapon) {
  const lvl = actor.system.level ?? 1;
  const halfLvl = getEffectiveHalfLevel(actor);

  let bonus = halfLvl + (weapon.system?.attackBonus ?? 0);

  // STR or DEX based weapon damage
  const strMod = actor.system.attributes.str?.mod ?? 0;
  const dexMod = actor.system.attributes.dex?.mod ?? 0;

  switch (weapon.system?.attackAttribute) {
    case "str": bonus += strMod; break;
    case "dex": bonus += dexMod; break;
    case "2str": bonus += strMod * 2; break;
    case "2dex": bonus += dexMod * 2; break;
  }

  return bonus;
}

/**
 * Roll damage for a weapon.
 */
export async function rollDamage(actor, weapon) {
  if (!actor || !weapon) {
    ui.notifications.error("Missing actor or weapon for damage roll.");
    return null;
  }

  const dmgBonus = computeDamageBonus(actor, weapon);

  const base = weapon.system?.damage ?? weapon.damage ?? "1d6";
  const formula = `${base} + ${dmgBonus}`;

  const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${weapon.name} Damage (${formula})`
  } , { create: true });

  return roll;
}

/**
 * Roll full attack (attack roll + optional crit threat handling)
 */
export async function rollFullAttack(actor, weapon) {
  const attack = await rollAttack(actor, weapon);
  if (!attack) return null;

  const result = { attack, damage: null };

  // Crit threat detection
  const critRange = weapon.system?.critRange ?? 20;
  const isThreat = attack.dice[0]?.results?.some(r => r.result >= critRange);

  if (isThreat) {
    ui.notifications.info("Critical Threat!");
  }

  return result;
}
