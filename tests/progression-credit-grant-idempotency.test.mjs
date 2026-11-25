import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Finding F-STO-004 (V2 realignment Phase 3C): GRANT_CREDITS (Lineage level multiplier) wrote the credits in one ActorEngine.updateActor call and
// the idempotency record (flags.swse.progressionHistory) in a SECOND call. If the second write failed, the credits were already granted but the
// level was not recorded as granted, so the next run granted the same levels again.
//
// This test runs the real ProgressionEventProcessor._grantCredits against a model of ActorEngine.updateActor with failure injection on the write
// that carries the idempotency record. Level: L1 (one client, offline). No Foundry runtime claim.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.ChatMessage = { getSpeaker: () => ({}), create: async () => ({}) };

const { ProgressionEventProcessor } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/progression/progression-event-processor.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { swseLogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const l of ['log', 'info', 'warn', 'error', 'debug']) if (swseLogger[l]) swseLogger[l] = () => {};

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const clone = (v) => JSON.parse(JSON.stringify(v));
const setPath = (o, p, v) => { const parts = p.split('.'); let t = o; for (let i = 0; i < parts.length - 1; i++) t = (t[parts[i]] ??= {}); t[parts.at(-1)] = clone(v); };

const MULT = 1000, LEVEL = 3;
ProgressionEventProcessor._computeLineageEligibleLevel = () => LEVEL;
const ability = { id: 'ab1', name: 'Lineage', type: 'talent', flags: { swse: { id: 'lineage-wealth' } }, system: {} };
const effect = { type: 'GRANT_CREDITS', amount: { type: 'LINEAGE_LEVEL_MULTIPLIER', multiplier: MULT } };

let actor; const writes = []; let failWriteWithKey = null;
const mk = () => ({ id: 'a1', name: 'Heir', system: { credits: 500 }, flags: { swse: {} }, items: [],
  getFlag(s, k) { return this.flags?.[s]?.[k]; } });
const reset = () => { actor = mk(); writes.length = 0; failWriteWithKey = null; };
ActorEngine.updateActor = async (a, update) => {
  writes.push(Object.keys(update));
  if (failWriteWithKey && Object.keys(update).includes(failWriteWithKey)) throw new Error('write rejected');   // nothing from a rejected write is applied
  for (const [k, v] of Object.entries(update)) setPath(a, k, v);
  return a;
};
const grant = () => ProgressionEventProcessor._grantCredits(actor, ability, effect, {});

// 1. REPRODUCTION: failure on the write that records the grant, then retry. The total granted must be exactly one grant, never two.
{
  reset(); failWriteWithKey = 'flags.swse.progressionHistory';
  await grant().catch(() => {});                       // first attempt: the history write is rejected
  failWriteWithKey = null;
  await grant();                                       // retry
  assert.equal(actor.system.credits, 500 + MULT * LEVEL, 'the levels were granted exactly once across the failed attempt and the retry');
  ok('a failed idempotency-record write cannot lead to a second grant on retry');
}

// 2. Credits and the idempotency record are persisted by ONE write.
{
  reset();
  await grant();
  const carrying = writes.filter((keys) => keys.includes('system.credits') || keys.includes('flags.swse.progressionHistory'));
  assert.equal(carrying.length, 1, 'one updateActor call carries both the credits and the idempotency record');
  assert.ok(carrying[0].includes('system.credits') && carrying[0].includes('flags.swse.progressionHistory'));
  assert.equal(actor.system.credits, 500 + MULT * LEVEL);
  ok('credits and idempotency record are written together');
}

// 3. Re-running after success grants nothing more (idempotent).
{
  reset();
  await grant();
  const after = actor.system.credits;
  await grant();
  assert.equal(actor.system.credits, after, 'a second run grants nothing');
  ok('a completed grant is idempotent');
}

// 4. New Lineage levels still grant only the new levels.
{
  reset();
  await grant();
  ProgressionEventProcessor._computeLineageEligibleLevel = () => LEVEL + 2;
  await grant();
  assert.equal(actor.system.credits, 500 + MULT * (LEVEL + 2), 'only the two new levels were granted');
  ProgressionEventProcessor._computeLineageEligibleLevel = () => LEVEL;
  ok('later level-ups grant only the newly eligible levels');
}
console.log('progression-credit-grant-idempotency: ok');
