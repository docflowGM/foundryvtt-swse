import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for Phase 2's multi-target/autofire per-target outcome fix.
// scripts/combat/rolls/enhanced-rolls.js's rollAutofire() shares one attack
// roll (one natural d20/total) across every target in the area, but each
// target must still get its own independently-resolved AttackOutcomeResolver
// verdict against its own defense — not one outcome object computed once and
// reused/mutated across the target loop.

const enhancedRolls = await readFile(new URL('../scripts/combat/rolls/enhanced-rolls.js', import.meta.url), 'utf8');

const autofireBody = enhancedRolls.slice(
  enhancedRolls.indexOf('static async rollAutofire('),
  enhancedRolls.indexOf('static async rollFullAttack(')
);

// The outcome must be resolved INSIDE the per-target loop (after the
// `for (const target of context.targets)` line), using that target's own
// defense value, not once before the loop starts.
const forLoopIndex = autofireBody.indexOf('for (const target of context.targets)');
const outcomeCallIndex = autofireBody.indexOf('AttackOutcomeResolver.resolve({');
assert.ok(forLoopIndex >= 0, 'Expected a per-target loop in rollAutofire().');
assert.ok(outcomeCallIndex > forLoopIndex, 'AttackOutcomeResolver.resolve() must be called inside the per-target loop, not before it.');
assert.match(autofireBody.slice(outcomeCallIndex, outcomeCallIndex + 200), /targetDefense: targetReflex/, 'Each target\'s outcome must use that target\'s own defense value.');

// Only one AttackOutcomeResolver.resolve() call site should exist in this
// function (the per-target one) — not a second pre-loop call whose result
// could leak into every target.
const outcomeCallsInAutofire = (autofireBody.match(/AttackOutcomeResolver\.resolve\(/g) || []).length;
assert.equal(outcomeCallsInAutofire, 1, 'rollAutofire() should resolve outcome exactly once per target-loop iteration, not pre-compute a shared outcome.');

// Each target's result object must carry its own outcome, not a shared
// reference mutated across iterations.
assert.match(autofireBody, /targetResults\.push\(\{[\s\S]{0,120}outcome,/, 'Each pushed target result must include its own outcome.');

console.log('Phase 2 multi-target outcome independence guards passed.');
