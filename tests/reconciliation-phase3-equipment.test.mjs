/** Reconciliation 17-domain Phase 3 - carried-weight evidence (informational); armor / modification / combat checks deferred. Node harness only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
const { character, item } = await import('./helpers/recon-fixture.mjs');
const { settleDerived } = await import('./helpers/derived-lifecycle-fixture.mjs');
const A = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/domain-adapters.js');
const F = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-findings.js');
const { EncumbranceEngine } = await import('/systems/foundryvtt-swse/scripts/engine/encumbrance/EncumbranceEngine.js');
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };
const gear = (name, weight, type = 'equipment') => item(type, name, weight === undefined ? {} : { weight });
const sheet = a => ProgressionReconciler.safeReconcileActor(a, { output: 'sheet', fresh: true });

await check('1. all carried items have recorded weights (including a verified 0): VALID and silent', () => {
  const a = character({ items: [gear('Medkit', 1.5), gear('Cord', 0), gear('Blaster', 2, 'weapon')] });
  assert.equal(A.carriedWeightEvidenceAdapter(a).status, A.DOMAIN_STATUS.VALID);
  assert.equal(sheet(a).validation.notes.some(n => n.id === 'note:carried-weight-evidence'), false);
});
await check('2. items without a verified weight => uncertainty note (uses the canonical report), never a load finding', () => {
  const a = character({ items: [gear('Mystery Box'), gear('Rope', 'two kilos'), gear('Medkit', 1)] });
  const canonical = EncumbranceEngine.carriedWeightReport(a);
  assert.equal(canonical.unverified.length, 2);
  const v = A.carriedWeightEvidenceAdapter(a);
  assert.equal(v.status, A.DOMAIN_STATUS.UNVERIFIABLE); assert.equal(v.reason, 'unverified-item-weight');
  settleDerived(a);
  const audit = sheet(a);
  assert.ok(audit.validation.notes.some(n => n.id === 'note:carried-weight-evidence' && /2 carried items/.test(n.text)));
  assert.equal(audit.validation.findings.some(f => /ENCUMB|WEIGHT|LOAD/i.test(f.code)), false);
});
await check('3. zero-quantity and non-carried item types are not counted', () => {
  const a = character({ items: [item('equipment', 'Spent', { quantity: 0 }), item('feat', 'Not gear')] });
  assert.equal(A.carriedWeightEvidenceAdapter(a).status, A.DOMAIN_STATUS.VALID);
});
await check('4. NPCs and vehicles are NOT_APPLICABLE; droids are evaluated', () => {
  for (const type of ['npc', 'vehicle']) assert.equal(A.carriedWeightEvidenceAdapter(character({ type })).status, A.DOMAIN_STATUS.NOT_APPLICABLE);
  assert.equal(A.carriedWeightEvidenceAdapter(character({ type: 'droid', items: [gear('Tool')] })).status, A.DOMAIN_STATUS.UNVERIFIABLE);
});
await check('5. read-only, repeatable, and isolated when the authority throws', () => {
  const a = character({ items: [gear('Mystery')] });
  const before = JSON.stringify([a.system, a.flags, a.items]);
  assert.deepEqual(A.carriedWeightEvidenceAdapter(a), A.carriedWeightEvidenceAdapter(a));
  assert.equal(JSON.stringify([a.system, a.flags, a.items]), before);
  const orig = EncumbranceEngine.carriedWeightReport;
  try { EncumbranceEngine.carriedWeightReport = () => { throw new Error('boom'); }; const [v] = A.runDomainAdapters(a, [A.carriedWeightEvidenceAdapter]); assert.equal(v.reason, 'adapter-error'); }
  finally { EncumbranceEngine.carriedWeightReport = orig; }
});
await check('6. deferred equipment domains are documented, not guessed', () => {
  const rep = fs.readFileSync('docs/audits/reconciliation-v2-17-domain-implementation-report.md', 'utf8');
  assert.match(rep, /Phase 3[\s\S]*modification/i);
  assert.equal(A.DOMAIN_ADAPTERS.some(f => /armor|modif|weapon|combat/i.test(f.name)), false);
});
console.log('reconciliation-phase3-equipment.test.mjs: all assertions passed');
