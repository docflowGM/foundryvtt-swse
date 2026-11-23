// Class/Force x Force V2, Decision A: direct Force Point decrements are replaced by V2's typed spend/finalize/rollback.
// This file covers the sites cut over so far. Behavior-level where the module imports under the offline shim.
// Not FOUNDRY_TESTED.
//
// combat-executor.js: the former fallback wrote system.forcePoints.value whenever the canonical engine had NOT applied a Force
// die, i.e. it could charge a point that ForcePointsService.authorizeSpend had refused (round cap, restrictions), and it charged
// for a bonus that was never rolled. SWSEInitiative pays through RollCore -> ForcePointSpendCoordinator -> ActorEngine.spendForcePoints.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}
};
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {}, once: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };

const { CombatExecutor } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-executor.js');
const { CombatEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/CombatEngine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0;
const ok = (label) => { n += 1; console.log(`  [${n}] ${label} OK`); };

// Spy on EVERY way the executor could change the balance.
const writers = ['apply', 'updateActor', 'applyMutationPlan', 'spendForcePoints', 'gainForcePoints'];
const calls = [];
const saved = {};
for (const w of writers) { saved[w] = ActorEngine[w]; ActorEngine[w] = async (...a) => { calls.push(w); return { spent: 1 }; }; }
const savedRollInit = CombatEngine.rollInitiative;
const savedRollAttack = CombatEngine.rollAttack;
let initRolls = 0; let attackRolls = 0;

const makeActor = (fp = 3) => ({
  id: 'a1', name: 'Pilot', type: 'character',
  system: { forcePoints: { value: fp, max: 5 } },
  flags: { swse: { combatActions: { shoot: { name: 'Shoot' } } } },
  update() { calls.push('actor.update'); }
});

try {
  // ---- initiative ----
  CombatEngine.rollInitiative = async () => { initRolls += 1; return { total: 15, usedForce: false, chatPosted: true }; };
  {
    const a = makeActor(3); calls.length = 0;
    const r = await CombatExecutor.executeInitiative(a, { useForce: true });
    assert.equal(initRolls, 1, 'the canonical engine rolled');
    assert.equal(r.total, 15);
    assert.deepEqual(calls, [], 'the executor wrote nothing when the canonical engine applied no Force die (the former fallback would have charged a point)');
    assert.equal(a.system.forcePoints.value, 3, 'balance untouched');
    ok('initiative: V2 applied no Force die => the executor charges nothing (no unauthorized fallback debit)');
  }
  CombatEngine.rollInitiative = async () => ({ total: 21, usedForce: true, forceBonus: 4, chatPosted: true });
  {
    const a = makeActor(3); calls.length = 0;
    await CombatExecutor.executeInitiative(a, { useForce: true });
    assert.deepEqual(calls, [], 'when V2 did pay, the executor still adds no second debit');
    assert.equal(a.system.forcePoints.value, 3, 'the canonical engine owns the (receipted) spend; the executor never touches the pool');
    ok('initiative: V2 paid => no double debit from the executor');
  }
  CombatEngine.rollInitiative = async () => ({ total: 12, usedForce: false, chatPosted: true });
  {
    const a = makeActor(3); calls.length = 0;
    await CombatExecutor.executeInitiative(a, { useForce: true, mode: 'take10' });
    assert.deepEqual(calls, []);
    ok('initiative: take-10 never charges');
  }
  {
    const a = makeActor(0); calls.length = 0; initRolls = 0;
    const r = await CombatExecutor.executeInitiative(a, { useForce: true });
    assert.equal(r, null, 'the read-only UX check still refuses an empty pool');
    assert.equal(initRolls, 0);
    assert.deepEqual(calls, []);
    ok('initiative: empty-pool UX check unchanged and writes nothing');
  }

  // ---- attack: fail closed on a Force Point request ----
  CombatEngine.rollAttack = async () => { attackRolls += 1; return { roll: { total: 18 }, usedForce: false }; };
  {
    const a = makeActor(3); calls.length = 0; attackRolls = 0;
    const r = await CombatExecutor.executeAttack(a, 'shoot', { force: true });
    assert.equal(r, null, 'a Force Point request fails closed');
    assert.equal(attackRolls, 0, 'and no roll happens for a payment that cannot be made');
    assert.deepEqual(calls, []);
    assert.equal(a.system.forcePoints.value, 3);
    ok('attack: a Force Point request fails closed (no roll, no debit)');
  }
  {
    const a = makeActor(3); calls.length = 0; attackRolls = 0;
    const r = await CombatExecutor.executeAttack(a, 'shoot', {});
    assert.equal(attackRolls, 1, 'an ordinary attack is unaffected');
    assert.equal(r.roll.total, 18);
    assert.deepEqual(calls, []);
    ok('attack: an ordinary attack is unchanged');
  }

  // ---- structural: no direct balance write remains in the executor ----
  {
    const src = read('scripts/engine/combat/combat-executor.js');
    assert.doesNotMatch(src, /system\.forcePoints\.value/, 'combat-executor writes no Force Point balance');
    assert.doesNotMatch(src, /forcePoints[^\n]*Math\.max\(0,[^\n]*-\s*1\)/);
    ok('structural: no direct Force Point balance write remains in combat-executor.js');
  }
} finally {
  for (const w of writers) ActorEngine[w] = saved[w];
  CombatEngine.rollInitiative = savedRollInit;
  CombatEngine.rollAttack = savedRollAttack;
}
console.log(`class-force-v2-direct-fp-cutover: ${n} checks passed`);
