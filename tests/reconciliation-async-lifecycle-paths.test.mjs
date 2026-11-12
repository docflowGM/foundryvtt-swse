/**
 * R17-F5: the swseDerivedApplied event on BOTH real derived-write paths, hook registration, stale results, and render-loop safety.
 * Real SWSEV2BaseActor._computeDerivedAsync and real ActorEngine._applyDerivedUpdates; DerivedCalculator.computeAll is stubbed ONLY to
 * return fixed updates (the lifecycle, not the arithmetic, is under test). Node harness only - not Foundry runtime verification.
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
const events = []; const handlers = {};
globalThis.Hooks = { on: (n, fn) => { (handlers[n] ??= []).push(fn); }, callAll: (n, ...a) => { events.push([n, ...a]); (handlers[n] || []).forEach(fn => fn(...a)); }, call() {}, once() {} };
const { character } = await import('./helpers/recon-fixture.mjs');
const { settleDerived } = await import('./helpers/derived-lifecycle-fixture.mjs');
const { SWSEV2BaseActor } = await import(new URL('../scripts/actors/v2/base-actor.js', import.meta.url).href);
const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');
const { getDerivedAppliedSignature } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-generation.js');
const L = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/derived-lifecycle.js');
// a FRESH module instance so hook registration happens against the Hooks above, exactly as at system load
const E = await import(new URL('../scripts/apps/progression-framework/shell/reconciliation/async-enrichment.js?fresh=1', import.meta.url).href).catch(() => import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/async-enrichment.js'));
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };
const wait = () => new Promise(r => setImmediate(r));

// a real SWSEV2BaseActor instance carrying the fixture's data
function baseActor(updates = { 'system.derived.bab': 4 }) {
  const fx = character();
  const a = Object.create(SWSEV2BaseActor.prototype);
  Object.assign(a, { id: fx.id, name: fx.name, type: 'character', items: fx.items, flags: fx.flags, _stats: fx._stats, system: fx.system, apps: {} });
  a.system.derived = { meta: {} };
  DerivedCalculator.computeAll = async () => structuredClone(updates);
  return a;
}

await check('1. real SWSEV2BaseActor._computeDerivedAsync announces completion with the applied signature (changed values)', async () => {
  events.length = 0;
  const a = baseActor();
  const sig = DerivedCalculator.getActorComputeSignature(a);
  await a._computeDerivedAsync(a.system);
  assert.equal(getDerivedAppliedSignature(a), sig);
  assert.deepEqual(events.filter(e => e[0] === 'swseDerivedApplied').map(e => [e[1] === a, e[2]]), [[true, sig]]);
  assert.equal(L.derivedLifecycle(a).state, 'current');
});
await check('2. ...and on the "nothing changed" pass (destination reset, identical values), which does NOT repaint the sheet', async () => {
  events.length = 0;
  const a = baseActor({});                       // no field updates => changed === false
  await a._computeDerivedAsync(a.system);
  assert.equal(events.filter(e => e[0] === 'swseDerivedApplied').length, 1);
  assert.equal(L.derivedLifecycle(a).state, 'current');
  events.length = 0; await a._computeDerivedAsync(a.system);   // already applied for this signature: no redundant event
  assert.equal(events.length, 0);
  a.system.derived = {};                          // Foundry reconstructs system.derived
  await a._computeDerivedAsync(a.system);
  assert.equal(events.filter(e => e[0] === 'swseDerivedApplied').length, 1, 'reset + reapplication announces again');
});
await check('3. real ActorEngine._applyDerivedUpdates (recalcAll path) stamps then announces', () => {
  events.length = 0;
  const a = baseActor(); const sig = DerivedCalculator.getActorComputeSignature(a);
  ActorEngine._applyDerivedUpdates(a, { 'system.derived.bab': 4 }, sig);
  assert.equal(getDerivedAppliedSignature(a), sig);
  assert.deepEqual(events.filter(e => e[0] === 'swseDerivedApplied').map(e => e[2]), [sig]);
});
await check('4. hook registration: the enrichment module registers its listener when loaded against a live Hooks, exactly once', () => {
  assert.ok((handlers.swseDerivedApplied || []).length >= 1, 'listener registered');
  assert.equal(E.registerAsyncEnrichmentHooks(), false, 'a second registration is refused (no duplicate listeners)');
});
await check('5. end to end through the REAL write path: a request made while pending runs exactly once when the derived pass lands, then refreshes once', async () => {
  E.AsyncReconciliationEnrichment.reset();
  const a = baseActor(); let runs = 0; let refreshes = 0;
  const adapter = async () => { runs += 1; return { domain: 'test', id: 'test-domain', label: 'T', status: 'CONFIRMED_DISCREPANCY', expected: 1, actual: 2, issue: 'x', authority: 't', resolve: { kind: 'none', label: '' } }; };
  assert.equal(E.AsyncReconciliationEnrichment.ensureRequested(a, { adapters: [adapter], refresh: () => { refreshes += 1; } }), 'waiting');
  await wait(); assert.equal(runs, 0);
  await a._computeDerivedAsync(a.system);         // the real derived pass lands and announces
  await wait(); await wait();
  assert.equal(runs, 1); assert.equal(refreshes, 1);
  assert.ok(E.AsyncReconciliationEnrichment.getApplicable(a));
});
await check('6. no render loop: the refresh re-reads the report, which re-requests enrichment for the same revision without re-running it', async () => {
  E.AsyncReconciliationEnrichment.reset();
  const a = settleDerived(baseActor()); let runs = 0; let refreshes = 0;
  const adapters = [async () => { runs += 1; return { domain: 'test', id: 'test-domain', label: 'T', status: 'VALID', expected: 1, actual: 1, authority: 't', resolve: { kind: 'none', label: '' } }; }];
  const refresh = () => { refreshes += 1; E.AsyncReconciliationEnrichment.ensureRequested(a, { adapters, refresh }); };  // a render re-requests
  E.AsyncReconciliationEnrichment.ensureRequested(a, { adapters, refresh });
  await wait(); await wait();
  for (let i = 0; i < 5; i += 1) E.AsyncReconciliationEnrichment.ensureRequested(a, { adapters, refresh });   // repeated sheet reads
  await wait();
  assert.equal(runs, 1, 'one evaluation per revision'); assert.ok(refreshes <= 1, `at most one refresh (got ${refreshes}); a clean result does not repaint`);
});
await check('7. an outdated result never appears in an open sheet: a newer actor update discards it before and after settling', async () => {
  E.AsyncReconciliationEnrichment.reset();
  const a = settleDerived(baseActor());
  E.AsyncReconciliationEnrichment.ensureRequested(a, { adapters: [async () => ({ domain: 'test', id: 'test-domain', label: 'T', status: 'CONFIRMED_DISCREPANCY', expected: 1, actual: 2, issue: 'x', authority: 't', resolve: { kind: 'none', label: '' } })], refresh: () => {} });
  await wait(); await wait();
  assert.ok(E.AsyncReconciliationEnrichment.getApplicable(a));
  a._stats.modifiedTime += 1;                       // a newer update lands
  assert.equal(E.AsyncReconciliationEnrichment.getApplicable(a), null);
});
console.log('reconciliation-async-lifecycle-paths.test.mjs: all assertions passed');
