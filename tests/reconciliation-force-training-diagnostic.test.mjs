/** R17-F3: Force Training diagnostic consumes the EXISTING FeatGrantEntitlementResolver and never confirms anything. Node harness only. */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
const { character, item } = await import('./helpers/recon-fixture.mjs');
const { settleDerived } = await import('./helpers/derived-lifecycle-fixture.mjs');
const A = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/domain-adapters.js');
const F = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-findings.js');
const { FeatGrantEntitlementResolver: R } = await import('/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js');
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };
const ft = () => item('feat', 'Force Training');
const power = (name, type = 'forcePower') => item(type, name);
const sheet = a => ProgressionReconciler.safeReconcileActor(settleDerived(a), { output: 'sheet', fresh: true });

await check('1. the diagnostic uses the existing resolver (no second formula): totals equal the resolver output, summed over repeated instances', () => {
  const a = character({ items: [ft(), ft()] });
  const per = R.getForceTrainingSlotsPerInstance(a);
  const direct = a.items.filter(i => i.name === 'Force Training').flatMap((f, i) => R.resolveForFeat(a, f, i)).reduce((n, e) => n + e.count, 0);
  assert.equal(direct, per * 2);
  const v = A.forceTrainingEntitlementDiagnosticAdapter(a);
  assert.equal(v.expected, per * 2); assert.equal(v.actual, 0);
});
await check('2. fewer powers owned than selections opened: informational note only (no finding, no !, no resolve)', () => {
  const a = character({ items: [ft()] });
  const v = A.forceTrainingEntitlementDiagnosticAdapter(a);
  assert.equal(v.status, A.DOMAIN_STATUS.UNVERIFIABLE); assert.equal(v.reason, 'possible-unspent-force-training');
  const audit = sheet(a);
  assert.ok(audit.validation.notes.some(n => n.id === 'note:force-training-entitlement' && /not checked further/.test(n.text)));
  assert.equal(audit.validation.findings.some(f => /FORCE_TRAINING/.test(f.code)), false);
  assert.equal(F.buildOptionalActions(ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true })).some(o => /force-training/.test(o.id)), false);
});
await check('3. enough powers owned (either item type spelling in the codebase): VALID and silent; extra powers are not an error', () => {
  const need = R.getForceTrainingSlotsPerInstance(character({ items: [ft()] }));
  const a = character({ items: [ft(), ...Array.from({ length: need }, (_, i) => power(`P${i}`, i % 2 ? 'force-power' : 'forcePower'))] });
  assert.equal(A.forceTrainingEntitlementDiagnosticAdapter(a).status, A.DOMAIN_STATUS.VALID);
  const many = character({ items: [ft(), ...Array.from({ length: need + 5 }, (_, i) => power(`Q${i}`))] });
  assert.equal(A.forceTrainingEntitlementDiagnosticAdapter(many).status, A.DOMAIN_STATUS.VALID);
  assert.equal(sheet(a).validation.notes.some(n => n.id === 'note:force-training-entitlement'), false);
});
await check('4. no Force Training / non-characters: NOT_APPLICABLE; read-only; resolver untouched', () => {
  assert.equal(A.forceTrainingEntitlementDiagnosticAdapter(character()).reason, 'no-force-training');
  assert.equal(A.forceTrainingEntitlementDiagnosticAdapter(character({ type: 'npc', items: [ft()] })).reason, 'actor-type');
  const a = settleDerived(character({ items: [ft()] })); const before = JSON.stringify([a.system, a.flags, a.items]);
  A.forceTrainingEntitlementDiagnosticAdapter(a); ProgressionReconciler.safeReconcileActor(a, { output: 'sheet', fresh: true });
  assert.equal(JSON.stringify([a.system, a.flags, a.items]), before);
  const b = character({ items: [ft()] }); const sb = JSON.stringify([b.system.forcePoints, b.flags, b.items]);
  A.forceTrainingEntitlementDiagnosticAdapter(b); assert.equal(JSON.stringify([b.system.forcePoints, b.flags, b.items]), sb);
});
console.log('reconciliation-force-training-diagnostic.test.mjs: all assertions passed');
