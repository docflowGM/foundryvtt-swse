import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard for Phase 2: SWSE does not use a critical-confirmation roll.
// scripts/combat/rolls/enhanced-rolls.js's rollAutofire()/rollFullAttack()
// used to call analyzeCriticalThreat()/rollCriticalConfirmation() (a second
// attack roll made solely to "confirm" a threat). Both call sites were
// removed in favor of AttackOutcomeResolver, which has no confirmation step.

const enhancedRolls = await readFile(new URL('../scripts/combat/rolls/enhanced-rolls.js', import.meta.url), 'utf8');
const rollConfig = await readFile(new URL('../scripts/rolls/roll-config.js', import.meta.url), 'utf8');

assert.doesNotMatch(enhancedRolls, /\brollCriticalConfirmation\s*\(/, 'enhanced-rolls.js must not call rollCriticalConfirmation().');
assert.doesNotMatch(enhancedRolls, /\banalyzeCriticalThreat\s*\(/, 'enhanced-rolls.js must not call analyzeCriticalThreat().');
assert.doesNotMatch(enhancedRolls, /\bmode === "take10" \? 10 : roll\.dice\[0\]/, 'The undefined-`mode` ReferenceError bug in rollAutofire() must be gone.');

// AttackOutcomeResolver must be the replacement authority in both functions.
const outcomeCalls = enhancedRolls.match(/AttackOutcomeResolver\.resolve\(/g) || [];
assert.ok(outcomeCalls.length >= 2, 'Expected AttackOutcomeResolver.resolve() in both rollAutofire() and rollFullAttack().');

// roll-config.js keeps the deprecated definitions (compatibility exports,
// zero active callers) but they must be clearly marked deprecated.
assert.match(rollConfig, /@deprecated[\s\S]{0,1200}export function analyzeCriticalThreat/);
assert.match(rollConfig, /@deprecated[\s\S]{0,1200}export async function rollCriticalConfirmation/);

console.log('Phase 2 critical-confirmation removal guards passed.');
