/** Reconciliation 17-domain Phase 4 - mode-aware droid construction. Real DroidValidationEngine and droid-mode-adapter. Node harness only. */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
const { character } = await import('./helpers/recon-fixture.mjs');
const A = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/domain-adapters.js');
const F = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-findings.js');
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };
const full = { stateMode: 'FINALIZED', locomotion: { id: 'wheels' }, appendages: [{ id: 'hands' }], processor: { id: 'p1' }, armor: { id: 'a1' } };
const droid = (droidSystems, system = {}, flags = {}, classes = []) => {
  const d = character({ type: 'droid', classes, system: { droidSystems, ...system }, flags });
  return d;
};
const report = a => ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true });
const finding = a => F.buildFindings(report(a)).find(f => f.code === 'DROID_CONSTRUCTION_INCOMPLETE');
const sheet = a => ProgressionReconciler.safeReconcileActor(a, { output: 'sheet', fresh: true });

await check('1. finalized custom droid with every required system: VALID, silent (works with no class items)', () => {
  const a = droid(full);
  assert.equal(A.droidConstructionAdapter(a).status, A.DOMAIN_STATUS.VALID);
  assert.equal(finding(a), undefined); assert.equal(sheet(a).validation.findings.length, 0);
});
await check('2. finalized custom droid that lost a required system: one confirmed finding naming it, no resolve', () => {
  const a = droid({ ...full, processor: {}, appendages: [] });
  const f = finding(a);
  assert.ok(f); assert.match(f.explanation, /Processor/); assert.match(f.explanation, /Appendage/);
  assert.equal(f.resolve.kind, 'none'); assert.equal(f.ignorable, true);
  assert.equal(sheet(a).validation.playerActionable, true);
});
await check('3. unfinalized / unrecorded builds are UNVERIFIABLE, never an error', () => {
  for (const stateMode of ['PENDING', 'NEW', 'REJECTED', undefined]) {
    const a = droid({ ...full, processor: {}, stateMode });
    assert.equal(A.droidConstructionAdapter(a).status, A.DOMAIN_STATUS.UNVERIFIABLE); assert.equal(finding(a), undefined);
  }
  assert.equal(A.droidConstructionAdapter(droid(undefined)).reason, 'no-build-record');
});
await check('4. stock-statblock droids are NOT_APPLICABLE even with no components (explicit and legacy-flag mode)', () => {
  const explicit = droid({ stateMode: 'STOCK' }, { droidCalculationMode: 'stock-statblock' });
  assert.equal(A.droidConstructionAdapter(explicit).reason, 'stock-statblock'); assert.equal(finding(explicit), undefined);
  const legacy = droid({ stateMode: 'FINALIZED' }, {}, { stockDroidImport: { importMode: 'statblock' } });
  assert.equal(A.droidConstructionAdapter(legacy).reason, 'stock-statblock');
  assert.equal(A.adapterToRow(A.droidConstructionAdapter(explicit)), null);
});
await check('5. stock droids converted to playable are NOT_APPLICABLE (the conversion service owns them)', () => {
  const converted = droid({ stateMode: 'FINALIZED' }, { droidCalculationMode: 'playable-derived' });
  assert.equal(A.droidConstructionAdapter(converted).reason, 'converted-stock-droid'); assert.equal(finding(converted), undefined);
  const legacyConverted = droid({ stateMode: 'FINALIZED' }, {}, { stockDroidImport: { importMode: 'playable' } });
  assert.equal(A.droidConstructionAdapter(legacyConverted).reason, 'converted-stock-droid');
});
await check('6. non-droids are NOT_APPLICABLE; published NPCs / heroic PCs are not treated as droids', () => {
  for (const type of ['character', 'npc', 'vehicle']) assert.equal(A.droidConstructionAdapter(character({ type })).status, A.DOMAIN_STATUS.NOT_APPLICABLE);
});
await check('7. finding identity changes when the problem changes (Ignore re-identification); read-only', () => {
  const a = droid({ ...full, processor: {} });
  const f1 = finding(a); a.system.droidSystems.armor = {}; a._stats.modifiedTime += 1; const f2 = finding(a);
  assert.notEqual(f1.id, f2.id);
  const before = JSON.stringify([a.system, a.flags]); A.droidConstructionAdapter(a); report(a);
  assert.equal(JSON.stringify([a.system, a.flags]), before);
});
console.log('reconciliation-phase4-droid.test.mjs: all assertions passed');
