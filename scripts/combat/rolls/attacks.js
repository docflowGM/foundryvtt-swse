import { getEffectiveHalfLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { isNpcStatblockMode } from "/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js";

// ============================================
// FILE: rolls/attacks.js (Upgraded for SWSE v13+)
// - Uses new Active Effects engine
// - Uses updated Actor data model
// - Integrates CT penalties, attack penalties, cover, etc.
// - Performance optimized, fail-safe, RAW-accurate
// ============================================

/**
 * Compute complete attack bonus from all SWSE factors.
 * PHASE 4: Includes state-dependent modifiers
 *
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {string} actionId - Optional action ID for talent bonus lookup (e.g., 'melee-attack', 'ranged-attack')
 * @param {Object} context - Optional context for state predicates (weapon, attackType, etc.)
 * @returns {number}
 */
function computeAttackBonus(actor, weapon, actionId = null, context = {}) {
  // Statblock NPCs can use stored totals until explicitly leveled.
  if (actor?.type === 'npc' && isNpcStatblockMode(actor)) {
    const npc = weapon?.flags?.swse?.npc;
    if (npc?.useFlat === true && Number.isFinite(npc.flatAttackBonus)) {
      return Number(npc.flatAttackBonus) || 0;
    }
  }

  const lvl = actor.system.level ?? 1;
  const halfLvl = getEffectiveHalfLevel(actor);

  const bab = SchemaAdapters.getBAB(actor);

  // Use new data model: abilities[xxx].mod
  const abilityMod = SchemaAdapters.getAbilityMod(actor, weapon.system?.attackAttribute ?? 'str');

  const miscBonus = weapon.system?.attackBonus ?? 0;

  // Condition Track penalty (read from authoritative derived source)
  // CANONICAL: DerivedCalculator computes and stores this in system.derived.damage.conditionPenalty
  // Also applied to skill totals in DerivedCalculator.computeAll() (line 339-340)
  const ctPenalty = actor.system?.derived?.damage?.conditionPenalty ??
                    actor.system?.conditionTrack?.penalty ??
                    0;

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

  // PHASE 4: Get state-dependent modifiers
  let stateBonus = 0;
  try {
    if (actor?.items) {
      const enrichedContext = { weapon, ...context };
      for (const item of actor.items) {
        if (item.system?.executionModel !== 'PASSIVE' || item.system?.subType !== 'STATE') {
          continue;
        }

        const meta = item.system?.abilityMeta;
        if (!meta?.modifiers || !Array.isArray(meta.modifiers)) {
          continue;
        }

        // Apply each modifier in the PASSIVE/STATE item
        for (const modifier of meta.modifiers) {
          // Check if this modifier applies to attack rolls
          const targets = Array.isArray(modifier.target) ? modifier.target : [modifier.target];
          const appliesToAttack = targets.some(t => t === 'attack' || t === 'attack.bonus');

          if (!appliesToAttack) continue;

          // Evaluate predicates (all must be true)
          const predicates = modifier.predicates || [];
          const predicatesMatch = evaluateStatePredicates(actor, predicates, enrichedContext);

          if (predicatesMatch && modifier.value) {
            stateBonus += modifier.value;
          }
        }
      }
    }
  } catch (err) {
    console.error('Error evaluating PASSIVE/STATE in attack bonus:', err);
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
    talentBonus +
    stateBonus
  );
}

/**
 * Roll an attack with a weapon using SWSE rules.
 */
export async function rollAttack(actor, weapon) {
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for attack roll.');
    return null;
  }

  const atkBonus = computeAttackBonus(actor, weapon);

  const rollFormula = `1d20 + ${atkBonus}`;
  const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula);

  await SWSEChat.postRoll({
    roll,
    actor,
    flavor: `${weapon.name} Attack Roll (Bonus ${atkBonus >= 0 ? '+' : ''}${atkBonus})`
  });

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
    case 'str': bonus += strMod; break;
    case 'dex': bonus += dexMod; break;
    case '2str': bonus += strMod * 2; break;
    case '2dex': bonus += dexMod * 2; break;
  }

  return bonus;
}

/**
 * Roll damage for a weapon.
 */
export async function rollDamage(actor, weapon) {
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for damage roll.');
    return null;
  }

  const dmgBonus = computeDamageBonus(actor, weapon);

  const base = weapon.system?.damage ?? weapon.damage ?? '1d6';
  const formula = `${base} + ${dmgBonus}`;

  const roll = await globalThis.SWSE.RollEngine.safeRoll(formula);

  await SWSEChat.postRoll({
    roll,
    actor,
    flavor: `${weapon.name} Damage (${formula})`
  });

  return roll;
}

/**
 * Roll full attack (attack roll + optional crit threat handling)
 */
export async function rollFullAttack(actor, weapon) {
  const attack = await rollAttack(actor, weapon);
  if (!attack) {return null;}

  const result = { attack, damage: null };

  // Crit threat detection
  const critRange = weapon.system?.critRange ?? 20;
  const isThreat = attack.dice[0]?.results?.some(r => r.result >= critRange);

  if (isThreat) {
    ui.notifications.info('Critical Threat!');
  }

  return result;
}

/* ============= Phase 4: Narration Wrappers ============= */

/**
 * Helper: get first targeted token name
 */
function _firstTargetName() {
  try {
    const t = Array.from(game.user.targets ?? []);
    if (!t.length) return null;
    return t[0]?.name ?? t[0]?.document?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Roll attack + damage together with narration
 * Does NOT reference defenses; narration is supplemental only
 */
export async function rollAttackAndDamageWithNarration(actor, weapon) {
  if (!actor || !weapon) {
    ui.notifications.error('Missing actor or weapon for attack roll.');
    return null;
  }

  const targetName = _firstTargetName();
  const atkBonus = computeAttackBonus(actor, weapon);
  const dmgBonus = computeDamageBonus(actor, weapon);

  const rollFormula = `1d20 + ${atkBonus}`;
  const dmgFormula = `${weapon.system?.damage ?? weapon.damage ?? '1d6'} + ${dmgBonus}`;

  const attackRoll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula);
  const damageRoll = await globalThis.SWSE.RollEngine.safeRoll(dmgFormula);

  const atkTotal = attackRoll?.total;
  const dmgTotal = damageRoll?.total;

  // Post attack roll card
  await SWSEChat.postRoll({
    roll: attackRoll,
    actor,
    flavor: `${weapon.name} Attack Roll (Bonus ${atkBonus >= 0 ? '+' : ''}${atkBonus})`
  });

  // Post damage roll card
  await SWSEChat.postRoll({
    roll: damageRoll,
    actor,
    flavor: `${weapon.name} Damage`
  });

  // Post supplemental narration (gated by setting)
  if (typeof atkTotal === "number" && typeof dmgTotal === "number") {
    try {
      const { ActionChatEngine } = await import("/systems/foundryvtt-swse/scripts/chat/action-chat-engine.js");
      await ActionChatEngine.narrationAttack(actor, weapon.name ?? "Weapon", atkTotal, dmgTotal, { targetName });
    } catch {
      // Narration engine not available; continue anyway
    }
  }

  return { attack: attackRoll, damage: damageRoll };
}
