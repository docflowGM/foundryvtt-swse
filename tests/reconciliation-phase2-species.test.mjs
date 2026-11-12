/** Reconciliation 17-domain Phase 2 - species grant integrity (informational) + deferred Force Training / skill entitlements. Node harness only. */
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
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };
const speciesItem = (name, key) => item('feat', name, {}, { speciesGranted: true, speciesGrantKey: key });
const sheet = a => ProgressionReconciler.safeReconcileActor(a, { output: 'sheet', fresh: true });

await check('1. manual character (no manifest) is silent: UNVERIFIABLE, no note, no finding', () => {
  const a = character();
  const v = A.speciesGrantIntegrityAdapter(a);
  assert.equal(v.status, A.DOMAIN_STATUS.UNVERIFIABLE); assert.equal(v.reason, 'no-species-manifest');
  assert.equal(sheet(a).validation.notes.some(n => n.id === 'note:species-grant-integrity'), false);
});
await check('2. wizard-built character whose species items match the manifest is VALID', () => {
  const a = character({ flags: { speciesGrantManifest: { grantKey: 'human' } }, items: [speciesItem('Bonus Feat', 'human')] });
  assert.equal(A.speciesGrantIntegrityAdapter(a).status, A.DOMAIN_STATUS.VALID);
});
await check('3. items from a DIFFERENT species grant are an informational note, never a finding or a !', () => {
  const a = character({ flags: { speciesGrantManifest: { grantKey: 'human' } }, items: [speciesItem('Darkvision', 'zabrak'), speciesItem('Bonus Feat', 'human')] });
  const v = A.speciesGrantIntegrityAdapter(a);
  assert.equal(v.status, A.DOMAIN_STATUS.UNVERIFIABLE); assert.equal(v.reason, 'stale-species-items');
  settleDerived(a);
  const audit = sheet(a);
  assert.ok(audit.validation.notes.some(n => n.id === 'note:species-grant-integrity' && /different species grant/.test(n.text)));
  assert.equal(audit.validation.findings.some(f => /SPECIES/.test(f.code)), false);
  assert.equal(F.buildFindings(ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true })).some(f => /SPECIES/.test(f.code)), false);
});
await check('4. legacy / unkeyed species items and non-species items are ignored; NPCs and droids are NOT_APPLICABLE', () => {
  const legacy = character({ flags: { speciesGrantManifest: { grantKey: 'human' } }, items: [item('feat', 'Legacy', {}, { speciesGranted: true }), item('feat', 'Ordinary')] });
  assert.equal(A.speciesGrantIntegrityAdapter(legacy).status, A.DOMAIN_STATUS.VALID);
  for (const type of ['npc', 'droid', 'vehicle']) assert.equal(A.speciesGrantIntegrityAdapter(character({ type })).status, A.DOMAIN_STATUS.NOT_APPLICABLE);
});
await check('5. read-only', () => {
  const a = character({ flags: { speciesGrantManifest: { grantKey: 'human' } }, items: [speciesItem('X', 'zabrak')] });
  const before = JSON.stringify([a.system, a.flags, a.items]); A.speciesGrantIntegrityAdapter(a); sheet(a);
  assert.equal(JSON.stringify([a.system, a.flags, a.items]), before);
});
await check('6. deferred domains are recorded, not guessed (register + no adapter)', () => {
  const reg = fs.readFileSync('docs/audits/swse-rules-decisions-pending.md', 'utf8');
  assert.match(reg, /## RECON-006/); assert.match(reg, /## RECON-007/);
  assert.equal(A.DOMAIN_ADAPTERS.some(f => /skill|forcetraining/i.test(f.name)), false);
});
console.log('reconciliation-phase2-species.test.mjs: all assertions passed');
