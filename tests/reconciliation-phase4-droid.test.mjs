/**
 * Reconciliation 17-domain Phase 4 (revised after R17-F1) - provenance-aware droid construction.
 * Uses the REAL Store construction path: quoteDroidBuild() -> buildCustomDroidActorData(). Node harness only.
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'u1' }, actors: { get: () => null }, users: [] } });
globalThis.foundry.utils ??= {};
globalThis.window.location ??= { hostname: 'test' };
const { character } = await import('./helpers/recon-fixture.mjs');
const Q = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-build-quote.js');
const K = await import('/systems/foundryvtt-swse/scripts/engine/store/store-droid-construction.js');
const A = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/domain-adapters.js');
const F = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-findings.js');
const { DroidValidationEngine } = await import('/systems/foundryvtt-swse/scripts/engine/droid-validation-engine.js');
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };
const report = a => ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true });
const finding = a => F.buildFindings(report(a)).find(f => f.code === 'DROID_CONSTRUCTION_INCOMPLETE');
const sheet = a => ProgressionReconciler.safeReconcileActor(a, { output: 'sheet', fresh: true });

// A valid Store build: baseline chassis plus a paid appendage, exactly as the Store pipeline produces it.
const selection = { droidSize: 'medium', droidDegree: '2nd-degree', droidSystems: { locomotion: { id: 'wheeled' }, processor: { id: 'heuristic' }, appendages: [{ id: 'hand-1' }, { id: 'hand-2' }, { id: 'hand' }] } };
const quote = Q.quoteDroidBuild(selection, { speciesDroidBuilder: null });
assert.equal(quote.status, 'OK', `fixture quote must be OK: ${quote.reasons}`);
const delivered = K.buildCustomDroidActorData({ quote, name: 'Store Droid', approvalId: 'appr1', owner: { id: 'own1', name: 'Owner' } });
function asActor(data, over = {}) {
  const a = character({ type: 'droid', classes: [], system: structuredClone(data.system) });
  a.flags.swse = { ...structuredClone(data.flags.swse), ...(over.flags || {}) };
  Object.assign(a.system, over.system || {});
  return a;
}

await check('0. precondition (the conflict): the real Store output has NO armor and the older validator rejects it', () => {
  assert.equal(delivered.system.droidSystems.armor, undefined);
  assert.equal(delivered.system.droidSystems.stateMode, 'FINALIZED');
  assert.equal(DroidValidationEngine.validateDroidConfiguration(delivered.system.droidSystems).valid, false);
});
await check('1. a valid Store-built finalized droid (no armor) is VALID and silent', () => {
  const a = asActor(delivered);
  assert.equal(A.droidConstructionAdapter(a).status, A.DOMAIN_STATUS.VALID);
  assert.equal(finding(a), undefined); assert.equal(sheet(a).validation.findings.length, 0);
});
await check('2. a Store-built droid that later lost a quote-required system IS a confirmed, review-only finding naming it', () => {
  const a = asActor(delivered); a.system.droidSystems.processor = null; a.system.droidSystems.appendages = [];
  const f = finding(a);
  assert.ok(f); assert.match(f.explanation, /processor/); assert.match(f.explanation, /appendage/);
  assert.equal(f.resolve.kind, 'none');
});
await check('3. catalog drift / unknown component is UNVERIFIABLE (quote BLOCKED), never an error', () => {
  const a = asActor(delivered); a.system.droidSystems.locomotion = { id: 'no-such-locomotion' };
  const v = A.droidConstructionAdapter(a);
  assert.equal(v.status, A.DOMAIN_STATUS.UNVERIFIABLE); assert.equal(v.reason, 'quote-blocked'); assert.equal(finding(a), undefined);
});
await check('4. a finalized droid of UNKNOWN provenance is UNVERIFIABLE even if the older validator would reject it', () => {
  const a = asActor(delivered); delete a.system.storeAcquisition; delete a.flags.swse.storeDroidConstruction;
  a.system.droidSystems.processor = null;
  const v = A.droidConstructionAdapter(a);
  assert.equal(v.status, A.DOMAIN_STATUS.UNVERIFIABLE); assert.equal(v.reason, 'governing-requirements-not-established'); assert.equal(finding(a), undefined);
});
await check('5. unfinalized / unrecorded builds are UNVERIFIABLE', () => {
  for (const stateMode of ['PENDING', 'NEW', 'REJECTED', undefined]) {
    const a = asActor(delivered); a.system.droidSystems.stateMode = stateMode;
    assert.equal(A.droidConstructionAdapter(a).status, A.DOMAIN_STATUS.UNVERIFIABLE);
  }
  const none = asActor(delivered); delete none.system.droidSystems;
  assert.equal(A.droidConstructionAdapter(none).reason, 'no-build-record');
});
await check('6. stock-statblock droids are NOT_APPLICABLE (explicit mode and legacy import flag)', () => {
  assert.equal(A.droidConstructionAdapter(asActor(delivered, { system: { droidCalculationMode: 'stock-statblock' } })).reason, 'stock-statblock');
  assert.equal(A.droidConstructionAdapter(asActor(delivered, { flags: { stockDroidImport: { importMode: 'statblock' } } })).reason, 'stock-statblock');
});
await check('7. converted stock droids are NOT_APPLICABLE only on conversion PROVENANCE', () => {
  assert.equal(A.droidConstructionAdapter(asActor(delivered, { flags: { stockDroidImport: { importMode: 'playable' } } })).reason, 'converted-stock-droid');
  assert.equal(A.droidConstructionAdapter(asActor(delivered, { flags: { stockDroidConversion: { sourceName: 'X' } } })).reason, 'converted-stock-droid');
});
await check('8. an explicit playable-derived mode ALONE is not proof of stock import: a custom droid with it is still evaluated', () => {
  const a = asActor(delivered, { system: { droidCalculationMode: 'playable-derived' } });
  assert.equal(A.droidConstructionAdapter(a).status, A.DOMAIN_STATUS.VALID, 'evaluated, not treated as a converted stock droid');
  a.system.droidSystems.processor = null;
  assert.ok(finding(a), 'and a real inconsistency is still found');
});
await check('9. non-droids are NOT_APPLICABLE; finding identity changes with the problem; read-only', () => {
  for (const type of ['character', 'npc', 'vehicle']) assert.equal(A.droidConstructionAdapter(character({ type })).status, A.DOMAIN_STATUS.NOT_APPLICABLE);
  const a = asActor(delivered); a.system.droidSystems.processor = null; const f1 = finding(a);
  a.system.droidSystems.appendages = []; a._stats.modifiedTime += 1; const f2 = finding(a);
  assert.notEqual(f1.id, f2.id);
  const before = JSON.stringify([a.system, a.flags]); A.droidConstructionAdapter(a); report(a);
  assert.equal(JSON.stringify([a.system, a.flags]), before);
});
console.log('reconciliation-phase4-droid.test.mjs: all assertions passed');
