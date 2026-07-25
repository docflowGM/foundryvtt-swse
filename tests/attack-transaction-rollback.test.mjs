import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static guard proving the canonical attack workflow rolls back refundable
// action-option/ammunition costs when the attack roll itself fails to
// execute. This was already structurally correct (the try block wrapping
// AmmoSystem.spendForWorkflow also wraps RollEngine.safeRoll(), and
// RollEngine.safeRoll() throws rather than returning a failure object on
// error), so this test documents/locks that invariant rather than describing
// a new fix.

const attacks = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');
const rollEngine = await readFile(new URL('../scripts/engine/roll-engine.js', import.meta.url), 'utf8');

// RollEngine.safeRoll must throw (not silently return a failed result) so a
// roll failure is caught by the surrounding transaction try/catch.
assert.match(rollEngine, /throw new Error\(result\?\.error \|\| `Failed to execute formula/);

function assertRollbackWrapsRoll(fnSource, label) {
  // The attack roll (RollEngine.safeRoll) must be executed inside the same
  // try block whose catch rolls back both ammo and action-option costs.
  const tryIndex = fnSource.indexOf('try {');
  const rollIndex = fnSource.indexOf('RollEngine.safeRoll(rollFormula');
  const catchIndex = fnSource.indexOf('} catch (err) {', tryIndex);
  assert.ok(tryIndex >= 0 && rollIndex > tryIndex && catchIndex > rollIndex, `${label}: attack roll must execute inside the cost transaction's try block.`);
  const catchBlock = fnSource.slice(catchIndex, catchIndex + 400);
  assert.match(catchBlock, /AmmoSystem\.rollbackSpend\(actor, weapon, ammoSpend\)/, `${label}: catch block must roll back ammo spend.`);
  assert.match(catchBlock, /actionOptionSpend\?\.rollback\?\.\(\)/, `${label}: catch block must roll back action-option spend.`);
}

const rollAttackSource = attacks.slice(attacks.indexOf('export async function rollAttack('), attacks.indexOf('export async function rollDamage('));
assertRollbackWrapsRoll(rollAttackSource, 'rollAttack');

const narrationSource = attacks.slice(attacks.indexOf('export async function rollAttackAndDamageWithNarration('));
assertRollbackWrapsRoll(narrationSource, 'rollAttackAndDamageWithNarration');

console.log('Attack roll execution transaction-rollback guards passed.');
