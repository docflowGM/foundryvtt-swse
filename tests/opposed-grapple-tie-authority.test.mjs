import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Batch 1, round 7: opposed Grapple ties
// (docs/audits/v2-math-integrity-authority-ledger.md, "Certification-
// correction addendum 7"; docs/audits/combat-phase-0f-grapple-ion-seam-
// ledger.json's "grapple-opposed-meets-beats" entry).
//
// SWSE's opposed Grapple check uses the general d20 "meets or beats" rule:
// the attacker succeeds when their result equals OR exceeds the
// defender's. SWSEGrappling.grappleCheck() and _opposedGrappleForManeuver()
// (the shared helper Trip and Throw both call) used a strict `>` and,
// worse, grappleCheck() additionally short-circuited on a tie with an
// early `return result` BEFORE the (already-true) attackerWins value could
// advance any state -- so an attacker who tied a defender's check, a
// common and unremarkable outcome (not an edge case), incorrectly lost
// every initiating opposed Grapple check: the plain grapple check, Pin
// (which reuses grappleCheck() directly), and Trip/Throw.
//
// Fixed: a single shared decision authority, resolveOpposedGrappleOutcome()
// (exported from grappling-system.js), used by both grappleCheck() and
// _opposedGrappleForManeuver() -- no `>=` re-coded independently at either
// site -- and the tie-specific early return in grappleCheck() is removed
// entirely. isTie is still reported for chat-card wording, but never gates
// the outcome.
//
// This test live-executes the real production methods (not a
// reimplementation): SWSEGrappling.grappleCheck(), .attemptPin(),
// ._opposedGrappleForManeuver() (Trip and Throw), and .tripGrappledOpponent()
// end to end, with RollEngine.safeRoll stubbed to return controlled totals
// (the same pattern already established in
// attempt-grab-reflex-defense-authority.test.mjs) and FeatRegistry
// initialized from the REAL data/feat-catalog.json so Pin/Trip/Throw feat
// gating passes against real production feat data, not a hand-typed stub.

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.window = globalThis.window ?? globalThis;
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({ id: 'stub-message' }) };
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { FeatRegistry } = await import('/systems/foundryvtt-swse/scripts/registries/feat-registry.js');
const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'feat-catalog.json'), 'utf8'));
FeatRegistry._resetIndexes();
FeatRegistry._indexDocuments(catalog);
FeatRegistry._initialized = true;

const { SWSEGrappling, resolveOpposedGrappleOutcome } = await import(
  '/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js'
);
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
globalThis.SWSE = globalThis.SWSE ?? {};
globalThis.SWSE.RollEngine = RollEngine;

// ─── 0. The shared decision authority itself, directly ────────────────────

assert.equal(resolveOpposedGrappleOutcome(24, 23).attackerWins, true, 'attacker 24 vs defender 23: attacker must succeed');
assert.equal(resolveOpposedGrappleOutcome(24, 24).attackerWins, true, 'attacker 24 vs defender 24 (tie): attacker must succeed (meets or beats)');
assert.equal(resolveOpposedGrappleOutcome(24, 24).isTie, true, 'attacker 24 vs defender 24 must be reported as a tie for narrative purposes');
assert.equal(resolveOpposedGrappleOutcome(23, 24).attackerWins, false, 'attacker 23 vs defender 24: attacker must fail');

console.log('  [1/5] resolveOpposedGrappleOutcome() (the shared decision authority): attacker succeeds on a tie, per the required fail-before matrix OK');

// ─── Fixtures ───────────────────────────────────────────────────────────

function makeGrappleActor(name, { items = [], effects = [] } = {}) {
  const actor = {
    id: name.toLowerCase(),
    name,
    type: 'character',
    items,
    effects,
    system: {
      level: 8,
      size: 'medium',
      attributes: {
        str: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 10, racial: 0, enhancement: 0, temp: 0 }
      },
      derived: {
        grappleBonus: 0,
        grappleBonusParts: { core: 0, staticModifiers: 0, total: 0 },
        modifiers: { breakdown: {} }
      }
    },
    async createEmbeddedDocuments(embeddedName, data) {
      if (embeddedName === 'ActiveEffect') {
        for (const effect of data) this.effects.push(effect);
      }
      return data;
    }
  };
  return actor;
}

function grappledEffect(sourceActor) {
  return { flags: { swse: { grappleState: { state: 'grappled', sourceId: sourceActor.id } } } };
}

// Queues fixed roll totals in call order (attacker roll first, then
// defender roll, matching grappleCheck()/_opposedGrappleForManeuver()'s
// own sequential await order) so the exact d20 totals in the required
// fail-before matrix are reproduced deterministically -- not a
// probabilistic real roll.
function withFixedRollTotals(totals) {
  const queue = [...totals];
  const original = RollEngine.safeRoll;
  RollEngine.safeRoll = async () => {
    const total = queue.length ? queue.shift() : 10;
    return { total, dice: [{ results: [{ result: 10 }] }] };
  };
  return () => { RollEngine.safeRoll = original; };
}

// ─── 1. SWSEGrappling.grappleCheck() ───────────────────────────────────────

{
  const cases = [
    { label: 'attacker 24 vs defender 23', totals: [24, 23], expectedWins: true, expectedTie: false },
    { label: 'attacker 24 vs defender 24 (tie)', totals: [24, 24], expectedWins: true, expectedTie: true },
    { label: 'attacker 23 vs defender 24', totals: [23, 24], expectedWins: false, expectedTie: false }
  ];
  for (const { label, totals, expectedWins, expectedTie } of cases) {
    const attacker = makeGrappleActor('Attacker');
    const defender = makeGrappleActor('Defender');
    const restore = withFixedRollTotals(totals);
    const result = await SWSEGrappling.grappleCheck(attacker, defender, { skipLegalityConfirm: true });
    restore();
    assert.equal(result.attackerWins, expectedWins, `[grappleCheck ${label}] attackerWins`);
    assert.equal(result.isTie, expectedTie, `[grappleCheck ${label}] isTie`);
  }
  // The tie case must actually advance state, not silently no-op the way
  // the pre-round-7 early `if (isTie) return result;` did.
  {
    const attacker = makeGrappleActor('Attacker');
    const defender = makeGrappleActor('Defender');
    const restore = withFixedRollTotals([24, 24]);
    await SWSEGrappling.grappleCheck(attacker, defender, { skipLegalityConfirm: true });
    restore();
    assert.ok(defender.effects.some(e => e?.flags?.swse?.grappleState?.state === 'grappled'), 'a tied grappleCheck() must advance the defender to Grappled, not silently no-op');
  }
}

console.log('  [2/5] SWSEGrappling.grappleCheck(): attacker wins on 24v23 and 24v24 (tie), fails on 23v24, and a tie actually advances state OK');

// ─── 2. SWSEGrappling.attemptPin() (reuses grappleCheck() directly) ────────

{
  const attacker = makeGrappleActor('Attacker', { items: [{ type: 'feat', name: 'Pin' }] });
  const defender = makeGrappleActor('Defender');
  attacker.effects.push(grappledEffect(defender));
  defender.effects.push(grappledEffect(attacker));

  const restore = withFixedRollTotals([24, 24]);
  const result = await SWSEGrappling.attemptPin(attacker, defender, { skipLegalityConfirm: true });
  restore();
  assert.equal(result.attackerWins, true, 'attemptPin(): a tied opposed check must succeed for the attacker');
  assert.equal(result.pinned, true, 'attemptPin(): a tied opposed check must actually pin the defender');
}

console.log('  [3/5] SWSEGrappling.attemptPin(): a tied opposed check succeeds and pins the defender OK');

// ─── 3. The shared opposed-maneuver helper, for both Trip and Throw ────────

{
  for (const maneuver of ['trip', 'throw']) {
    const attacker = makeGrappleActor('Attacker');
    const defender = makeGrappleActor('Defender');
    const restore = withFixedRollTotals([24, 24]);
    const check = await SWSEGrappling._opposedGrappleForManeuver(attacker, defender, maneuver, {});
    restore();
    assert.equal(check.attackerWins, true, `_opposedGrappleForManeuver('${maneuver}'): a tied opposed check must succeed for the attacker`);
    assert.equal(check.isTie, true, `_opposedGrappleForManeuver('${maneuver}'): a tied opposed check must be reported as a tie`);
  }
}

console.log('  [4/5] _opposedGrappleForManeuver() (the shared helper Trip and Throw both call): a tied opposed check succeeds for the attacker, for both maneuver names OK');

// ─── 4. tripGrappledOpponent() end to end -- both the tie-success case and
//        a genuine failure, proving no false positive was introduced ──────

{
  const attacker = makeGrappleActor('Attacker', { items: [{ type: 'feat', name: 'Trip' }] });
  const defender = makeGrappleActor('Defender');
  attacker.effects.push(grappledEffect(defender));
  defender.effects.push(grappledEffect(attacker));

  const restoreTie = withFixedRollTotals([24, 24]);
  const tieResult = await SWSEGrappling.tripGrappledOpponent(attacker, defender, { skipLegalityConfirm: true });
  restoreTie();
  assert.equal(tieResult.attackerWins, true, 'tripGrappledOpponent(): a tied opposed check must succeed');
  assert.equal(tieResult.tripped, true, 'tripGrappledOpponent(): a tied opposed check must actually trip the defender');
}

{
  const attacker = makeGrappleActor('Attacker', { items: [{ type: 'feat', name: 'Trip' }] });
  const defender = makeGrappleActor('Defender');
  attacker.effects.push(grappledEffect(defender));
  defender.effects.push(grappledEffect(attacker));

  const restoreLose = withFixedRollTotals([23, 24]);
  const loseResult = await SWSEGrappling.tripGrappledOpponent(attacker, defender, { skipLegalityConfirm: true });
  restoreLose();
  assert.equal(loseResult.attackerWins, false, 'tripGrappledOpponent(): a genuine loss (23 vs 24) must still fail -- the tie fix must not introduce a false positive');
  assert.ok(!loseResult.tripped, 'tripGrappledOpponent(): a genuine loss must not trip the defender');
}

console.log('  [5/5] tripGrappledOpponent() end to end: a tie succeeds and trips the defender; a genuine loss still fails (no false positive) OK');

console.log('opposed-grapple-tie-authority.test.mjs: all assertions passed');
