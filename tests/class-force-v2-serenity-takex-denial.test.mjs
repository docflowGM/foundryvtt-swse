// Class/Force x Force V2 integration (issue #1166, slice 2 follow-up): owner-accepted Serenity Take-X + Force Point denial.
// RollCore.execute evaluates `isTakeX && rollOptions.useForce` BEFORE any Force Point debit and before Serenity is consumed.
// The denial must (a) refuse, (b) leave the Force Point pool and ledger untouched, (c) leave the Serenity entitlement unchanged,
// (d) not silently drop the paid option or improvise a natural-20 fallback, and (e) leave a legal retry able to proceed.
// Not FOUNDRY_TESTED: offline Node + Foundry shim only.
import assert from 'node:assert/strict';
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

const { RollCore } = await import('/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js');
const { ModifierEngine } = await import('/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js');
const { serenityNatural20Eligible, readSerenityState } =
  await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/serenity-state.js');

const combat = { id: 'enc-1', started: true, round: 5, turn: 0 };
globalThis.game = Object.assign(globalThis.game ?? {}, { combat });

const SERENITY = { phase: 'prepared', encounterId: 'enc-1', exitRound: 4, eligibleRound: 5, consumed: false };
const DOMAIN = 'skill.useTheForce';
const makeActor = () => ({
  id: 'jedi-master', name: 'Jedi Master', type: 'character',
  system: { forcePoints: { value: 3, max: 3 }, conditionTrack: { current: 0 }, darkSideScore: { value: 0 }, level: { heroic: 10 } },
  flags: { swse: {
    bonusForcePoints: { value: 0, entries: [] },
    forcePointLedger: { receipts: [] },
    classFeatures: { jediMaster: { serenity: { ...SERENITY } } }
  } },
  items: [],
  getFlag(scope, name) { return this.flags?.[scope]?.[name]; }
});
const snapshot = (a) => JSON.stringify({
  fp: a.system.forcePoints, bonus: a.flags.swse.bonusForcePoints, ledger: a.flags.swse.forcePointLedger,
  serenity: a.flags.swse.classFeatures.jediMaster.serenity
});

// Stub only what the guard is documented to run BEFORE; record anything that must NOT run.
const calls = { executeRoll: 0, takeX: 0, paidLogic: 0, paidArgs: [] };
const saved = {
  resolveTarget: ModifierEngine.resolveTarget, exec: RollCore._executeRollWithSerenity,
  takeX: RollCore._handleTakeX, paid: RollCore.applyForcePointLogic
};
ModifierEngine.resolveTarget = async () => ({ total: 0, breakdown: {}, ledger: [], suppressed: [] });
RollCore._executeRollWithSerenity = async () => { calls.executeRoll += 1; return { total: 18, dice: [{ results: [{ result: 18 }] }], formula: '1d20' }; };
RollCore._handleTakeX = async () => { calls.takeX += 1; return { success: true, total: 10, domain: DOMAIN, takeX: true }; };
RollCore.applyForcePointLogic = async (...args) => { calls.paidLogic += 1; calls.paidArgs.push(args); return { success: false, reason: 'stub', spent: 0 }; };
const reset = () => { calls.executeRoll = 0; calls.takeX = 0; calls.paidLogic = 0; calls.paidArgs = []; };

let n = 0;
const ok = (label) => { n += 1; console.log(`  [${n}] ${label} OK`); };

try {
  const actor = makeActor();
  assert.equal(serenityNatural20Eligible(actor, combat, DOMAIN, '1d20 + 10'), true, 'fixture: Serenity entitlement is live this round');
  const before = snapshot(actor);

  // 1. Take-X + Force Point is refused with V2's error.
  const denied = await RollCore.execute({ actor, domain: DOMAIN, rollOptions: { isTakeX: true, takeXValue: 10, useForce: true } });
  assert.equal(denied.success, false);
  assert.equal(denied.error, 'Force Point use is not supported for take-X checks');
  ok('take-X + useForce is refused with the V2 error');

  // 2. Nothing was debited, rolled, taken, or consumed.
  assert.equal(snapshot(actor), before, 'Force Point balance, ledger and Serenity entitlement are byte-identical after the denial');
  assert.equal(actor.system.forcePoints.value, 3);
  assert.deepEqual(actor.flags.swse.forcePointLedger.receipts, []);
  assert.equal(readSerenityState(actor).consumed, false, 'Serenity entitlement NOT consumed');
  assert.equal(calls.paidLogic, 0, 'no paid-option processing ran (the paid option is refused, not silently dropped)');
  assert.equal(calls.takeX, 0, 'no fixed take-X result was produced');
  assert.equal(calls.executeRoll, 0, 'no improvised natural-20 or other roll was executed');
  ok('denial leaves FP balance, ledger and Serenity entitlement unchanged; no roll, take-X or paid logic ran');

  // 3. Repeating the denied request is stable (idempotent refusal).
  const deniedAgain = await RollCore.execute({ actor, domain: DOMAIN, rollOptions: { isTakeX: true, takeXValue: 20, useForce: true } });
  assert.equal(deniedAgain.success, false);
  assert.equal(snapshot(actor), before);
  ok('a repeated denied request is equally inert');

  // 4. Legal retry A: Serenity-eligible take-X WITHOUT a Force Point does not take X; it proceeds to the real roll path
  //    (the existing qualifying-natural-20 rule governs), and does not hit the take-X shortcut.
  reset();
  await RollCore.execute({ actor, domain: DOMAIN, rollOptions: { isTakeX: true, takeXValue: 10 } });
  assert.equal(calls.takeX, 0, 'Serenity-only take-X never uses the fixed take-X shortcut');
  assert.equal(calls.executeRoll, 1, 'it proceeds to the real (Serenity-governed) roll');
  ok('legal retry A: Serenity-only take-X proceeds to the real roll, not the take-X shortcut');

  // 5. Legal retry B: a normal paid roll (no take-X) reaches the Force Point logic.
  reset();
  await RollCore.execute({ actor, domain: DOMAIN, rollOptions: { useForce: true } });
  assert.equal(calls.paidLogic, 1, 'a legal paid roll proceeds to the Force Point logic');
  ok('legal retry B: a normal paid roll proceeds to the Force Point path');

  // 6. Legal retry C: ordinary take-X with no Serenity entitlement still works as before.
  reset();
  const plain = makeActor();
  plain.flags.swse.classFeatures.jediMaster.serenity = null;
  const r = await RollCore.execute({ actor: plain, domain: DOMAIN, rollOptions: { isTakeX: true, takeXValue: 10 } });
  assert.equal(calls.takeX, 1, 'take-X without Serenity or Force Point is unchanged');
  assert.equal(r.success, true);
  ok('legal retry C: ordinary take-X is unchanged');
} finally {
  ModifierEngine.resolveTarget = saved.resolveTarget;
  RollCore._executeRollWithSerenity = saved.exec;
  RollCore._handleTakeX = saved.takeX;
  RollCore.applyForcePointLogic = saved.paid;
}
console.log(`class-force-v2-serenity-takex-denial: ${n} checks passed`);
