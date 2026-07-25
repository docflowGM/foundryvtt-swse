/**
 * AttackOutcomeResolver — single authority for interpreting an attack roll's
 * natural d20 result against SWSE hit/critical rules.
 *
 * Phase 1 rolling-system alignment fix: the canonical attack path
 * (scripts/combat/rolls/attacks.js) computed `isHit` from `roll.total >=
 * targetDefense` without ever forcing a natural 1 to miss, and computed
 * `isCritical` independently, duplicating the same natural-20/threat logic
 * that other call sites (rollFullAttack's threat check, vehicle attacks)
 * re-derive on their own. This module is the one place that decides hit,
 * critical, and their automatic-1/automatic-20 overrides, so every consumer
 * (chat card, damage workflow, rerolls, reactions) reads the same verdict.
 *
 * SWSE does not use a separate critical-confirmation roll: a threat that is
 * otherwise a hit is a confirmed critical. This resolver never asks for one.
 *
 * Pure function — no Foundry dependencies, no actor mutation, no chat.
 */

/**
 * @param {Object} input
 * @param {number} input.naturalD20 - The unmodified d20 result (1-20).
 * @param {number} input.total - The final attack roll total (natural + all bonuses).
 * @param {number|null} [input.targetDefense=null] - Defense to beat, or null when unknown (GM adjudication/no target).
 * @param {number} [input.criticalThreshold=20] - Natural roll at/above which a hit becomes a critical threat.
 * @param {number} [input.critMultiplier=2] - Damage multiplier to apply on a confirmed critical.
 * @returns {{hit: boolean|null, automaticHit: boolean, automaticMiss: boolean, critical: boolean, criticalThreat: boolean, damageMultiplier: number, reason: string}}
 */
export function resolveAttackOutcome(input = {}) {
  const naturalD20 = Number(input.naturalD20);
  const total = Number(input.total);
  const targetDefense = input.targetDefense == null ? null : Number(input.targetDefense);
  const criticalThreshold = Number.isFinite(Number(input.criticalThreshold)) ? Math.min(20, Number(input.criticalThreshold)) : 20;
  const critMultiplier = Math.max(1, Number(input.critMultiplier) || 2);

  const automaticMiss = naturalD20 === 1;
  const automaticHit = naturalD20 === 20;

  let hit;
  let reason;
  if (automaticMiss) {
    hit = false;
    reason = 'natural-1-automatic-miss';
  } else if (automaticHit) {
    hit = true;
    reason = 'natural-20-automatic-hit';
  } else if (targetDefense == null) {
    hit = null;
    reason = 'no-target-defense';
  } else {
    hit = Number.isFinite(total) && total >= targetDefense;
    reason = hit ? 'meets-or-beats-defense' : 'below-defense';
  }

  // An expanded critical threat range never creates a critical on a roll that
  // is not otherwise a hit (e.g. natural 1, or below defense) — only a
  // confirmed hit whose natural roll is within the threat range crits, and
  // SWSE applies that critical without a separate confirmation roll.
  const criticalThreat = hit === true && Number.isFinite(naturalD20) && naturalD20 >= criticalThreshold;
  const critical = criticalThreat;
  const damageMultiplier = critical ? critMultiplier : 1;

  return { hit, automaticHit, automaticMiss, critical, criticalThreat, damageMultiplier, reason };
}

export const AttackOutcomeResolver = { resolve: resolveAttackOutcome };
export default AttackOutcomeResolver;
