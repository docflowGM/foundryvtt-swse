import assert from 'node:assert/strict';
import { resolveAttackOutcome } from '../scripts/engine/combat/attack-outcome-resolver.js';

// Natural 1 is an automatic miss regardless of total/defense (Phase 1 fix:
// scripts/combat/rolls/attacks.js previously computed isHit purely from
// roll.total >= targetDefense, so a natural 1 with enough bonus could still
// register as a hit).
{
  const outcome = resolveAttackOutcome({ naturalD20: 1, total: 45, targetDefense: 10, criticalThreshold: 20, critMultiplier: 2 });
  assert.equal(outcome.hit, false);
  assert.equal(outcome.automaticMiss, true);
  assert.equal(outcome.automaticHit, false);
  assert.equal(outcome.critical, false);
  assert.equal(outcome.criticalThreat, false);
  assert.equal(outcome.damageMultiplier, 1);
  assert.equal(outcome.reason, 'natural-1-automatic-miss');
}

// Natural 20 is an automatic hit and critical, with no confirmation roll.
{
  const outcome = resolveAttackOutcome({ naturalD20: 20, total: 5, targetDefense: 30, criticalThreshold: 20, critMultiplier: 2 });
  assert.equal(outcome.hit, true);
  assert.equal(outcome.automaticHit, true);
  assert.equal(outcome.automaticMiss, false);
  assert.equal(outcome.critical, true);
  assert.equal(outcome.criticalThreat, true);
  assert.equal(outcome.damageMultiplier, 2);
  assert.equal(outcome.reason, 'natural-20-automatic-hit');
}

// Ordinary hit below the critical threshold does not crit.
{
  const outcome = resolveAttackOutcome({ naturalD20: 15, total: 25, targetDefense: 20, criticalThreshold: 20, critMultiplier: 2 });
  assert.equal(outcome.hit, true);
  assert.equal(outcome.critical, false);
  assert.equal(outcome.criticalThreat, false);
  assert.equal(outcome.damageMultiplier, 1);
  assert.equal(outcome.reason, 'meets-or-beats-defense');
}

// Ordinary miss (non-1, non-20) stays a miss.
{
  const outcome = resolveAttackOutcome({ naturalD20: 8, total: 12, targetDefense: 20, criticalThreshold: 20, critMultiplier: 2 });
  assert.equal(outcome.hit, false);
  assert.equal(outcome.critical, false);
  assert.equal(outcome.reason, 'below-defense');
}

// Expanded critical threat range (e.g. 19-20): a threat roll that meets
// defense confirms as a critical without a separate confirmation roll.
{
  const outcome = resolveAttackOutcome({ naturalD20: 19, total: 25, targetDefense: 20, criticalThreshold: 19, critMultiplier: 3 });
  assert.equal(outcome.hit, true);
  assert.equal(outcome.criticalThreat, true);
  assert.equal(outcome.critical, true);
  assert.equal(outcome.damageMultiplier, 3);
}

// Expanded critical threat range must NOT create a critical on a roll that is
// not otherwise a hit — an in-range natural roll that still misses defense
// does not crit.
{
  const outcome = resolveAttackOutcome({ naturalD20: 19, total: 15, targetDefense: 20, criticalThreshold: 19, critMultiplier: 3 });
  assert.equal(outcome.hit, false);
  assert.equal(outcome.criticalThreat, false);
  assert.equal(outcome.critical, false);
  assert.equal(outcome.damageMultiplier, 1);
}

// A natural 1 in an expanded threat range still automatically misses and
// never crits — automatic-miss overrides everything else.
{
  const outcome = resolveAttackOutcome({ naturalD20: 1, total: 40, targetDefense: 5, criticalThreshold: 1, critMultiplier: 2 });
  assert.equal(outcome.hit, false);
  assert.equal(outcome.critical, false);
  assert.equal(outcome.criticalThreat, false);
}

// No target defense (GM adjudication / manual mode with no value): hit is
// undetermined, but natural 1/20 overrides still apply since they do not
// depend on a defense value.
{
  const undetermined = resolveAttackOutcome({ naturalD20: 12, total: 18, targetDefense: null });
  assert.equal(undetermined.hit, null);
  assert.equal(undetermined.reason, 'no-target-defense');

  const stillAutoMiss = resolveAttackOutcome({ naturalD20: 1, total: 18, targetDefense: null });
  assert.equal(stillAutoMiss.hit, false);
  assert.equal(stillAutoMiss.automaticMiss, true);

  const stillAutoHit = resolveAttackOutcome({ naturalD20: 20, total: 2, targetDefense: null });
  assert.equal(stillAutoHit.hit, true);
  assert.equal(stillAutoHit.automaticHit, true);
  assert.equal(stillAutoHit.critical, true);
}

// Attack chat data, damage workflow context, and rerolls must all be able to
// consume an identical outcome object for the same inputs (no hidden state).
{
  const inputs = { naturalD20: 20, total: 30, targetDefense: 12, criticalThreshold: 20, critMultiplier: 2 };
  const forChat = resolveAttackOutcome(inputs);
  const forDamageWorkflow = resolveAttackOutcome(inputs);
  assert.deepEqual(forChat, forDamageWorkflow);
}

console.log('AttackOutcomeResolver natural-1/natural-20/critical-threat guards passed.');
