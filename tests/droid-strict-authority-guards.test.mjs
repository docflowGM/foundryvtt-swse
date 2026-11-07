import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Wave 2A -- the four droid strict authority guards are ENFORCED (they run in
// the rolling suite and the droid workflow) and each one still rejects what it
// exists to reject. Positive: the real repository passes. Negative: fixtures
// and mutated copies of the real files fail, so a guard cannot pass vacuously.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let n = 0;
const ok = m => console.log(`  [${++n}] ${m} OK`);

// 1. The real repository passes every guard in --strict mode (same command CI runs).
for (const guard of ['check-droid-authority-ssot', 'check-droid-calculation-mode-authority', 'check-droid-reconciliation-authority', 'check-droid-installation-write-authority']) {
  const run = spawnSync(process.execPath, [path.join(ROOT, 'tools', `${guard}.mjs`), '--strict'], { encoding: 'utf8' });
  assert.equal(run.status, 0, `${guard} --strict must pass:\n${run.stdout}`);
}
ok('all four strict guards exit 0 on the repository');

// ---- Task 1: SSOT guard -----------------------------------------------------------------------
const { competingRuleKeys, collectCanonicalIds, MIN_MATCHING_KEYS } = await import('../tools/check-droid-authority-ssot.mjs');
const canonical = new Set(collectCanonicalIds());
assert.ok(canonical.size > 50 && canonical.has('hand') && canonical.has('claw') && canonical.has('probe'));

// the real alias-only map is no longer evidence of a competing table, and the file is not exempted
assert.ok(competingRuleKeys(read('scripts/domain/droids/droid-component-source-review.js'), canonical).length < MIN_MATCHING_KEYS);
// a pure alias map of any size is not a rule table
assert.equal(competingRuleKeys(`const A = {\n  'hand': 'droid-hand',\n  'claw': 'droid-claw',\n  "tool": "droid-tool",\n  probe: 'droid-probe', // note\n  'instrument': 'droid-instrument'\n};`, canonical).length, 0);
// ...but a REAL competing table still fails, whatever shape its values take
const objectTable = `export const T = {\n  'hand': { cost: 50, weight: 5 },\n  'claw': { cost: 20 },\n  'tool': { cost: 10 }\n};`;
const functionTable = `const T = {\n  hand: (f) => 50 * f,\n  claw: (f) => 20 * f,\n  tool: (f) => 10 * f\n};`;
const numberTable = `const COST = {\n  'hand': 50,\n  'claw': 20,\n  'tool': 10\n};`;
const proseTable = `const D = {\n  'hand': 'A manipulating limb with fingers',\n  'claw': 'A gripping limb',\n  'tool': 'A fitted tool'\n};`;
for (const [label, src] of [['object', objectTable], ['function', functionTable], ['number', numberTable], ['prose', proseTable]]) {
  assert.ok(competingRuleKeys(src, canonical).length >= MIN_MATCHING_KEYS, `${label} rule table must still be flagged`);
}
// a table hidden in an alias-looking map by mixing in one rule value is still counted per rule entry
assert.ok(competingRuleKeys(`const M = {\n  'hand': 'droid-hand',\n  'claw': { cost: 20 },\n  'tool': { cost: 10 },\n  'probe': { cost: 2 }\n};`, canonical).length >= MIN_MATCHING_KEYS);
ok('SSOT guard: alias-only map passes; object / function / number / prose rule tables still fail');

// ---- Tasks 2 and 3: explicit-action call sites ---------------------------------------------------
const { checkApprovedHandlerCalls, checkHandlerDispatch, hasServiceCall, stripComments } = await import('../tools/lib/droid-explicit-action-sites.mjs');
const sheet = read('scripts/sheets/v2/droid-actor-sheet.js');
const dispatch = read('scripts/sheets/v2/character-like-sheet.js');
const CONVERT = { callNames: ['convertToPlayableDerived'], approvedMethods: ['_convertDroidToPlayable'] };
const RECON = { callNames: ['applyReconciliation', 'rollbackReconciliation'], approvedMethods: ['_reconcileDroidSystems', '_rollbackDroidReconciliation'] };

// real files pass
assert.deepEqual(checkApprovedHandlerCalls(sheet, CONVERT).problems, []);
assert.deepEqual(checkApprovedHandlerCalls(sheet, RECON).problems, []);
assert.deepEqual(checkHandlerDispatch(dispatch, ['_convertDroidToPlayable', '_reconcileDroidSystems', '_rollbackDroidReconciliation']).problems, []);
// the real handlers are actually found (the checks are not vacuous)
assert.ok(hasServiceCall(sheet, CONVERT.callNames) && hasServiceCall(sheet, RECON.callNames));
ok('real droid sheet + dispatch pass the structural explicit-action checks (and the calls are really found)');

// mutated copies fail
const moved = sheet.replace('async _inspectDroidConversion() {', 'async _prepareContext() {\n    await convertToPlayableDerived(this.actor);\n  }\n\n  async _inspectDroidConversion() {');
assert.notEqual(moved, sheet);
assert.ok(checkApprovedHandlerCalls(moved, CONVERT).problems.some(p => /_prepareContext/.test(p)), 'conversion in prepare code is rejected');
const noConfirm = sheet.replace(/(async _convertDroidToPlayable\(\) \{[\s\S]*?)SWSEDialogV2\.confirm\(/, '$1SWSEDialogV2.prompt(');
assert.notEqual(noConfirm, sheet);
assert.ok(checkApprovedHandlerCalls(noConfirm, CONVERT).problems.some(p => /confirmation/.test(p)), 'unconfirmed conversion is rejected');
const noConfirmRecon = sheet.replace(/(async _reconcileDroidSystems\(\) \{[\s\S]*?)SWSEDialogV2\.confirm\(/, '$1SWSEDialogV2.prompt(');
assert.ok(checkApprovedHandlerCalls(noConfirmRecon, RECON).problems.some(p => /confirmation/.test(p)), 'unconfirmed reconciliation is rejected');
const autoRecon = sheet.replace('async _inspectDroidReconciliation() {', 'async _onRender() {\n    await applyReconciliation(this.actor, {});\n  }\n\n  async _inspectDroidReconciliation() {');
assert.notEqual(autoRecon, sheet);
assert.ok(checkApprovedHandlerCalls(autoRecon, RECON).problems.some(p => /_onRender/.test(p)), 'reconciliation during render is rejected');
const renamed = sheet.replace(/_rollbackDroidReconciliation/g, '_rollbackSomethingElse');
assert.ok(checkApprovedHandlerCalls(renamed, RECON).problems.some(p => /not in an approved handler/.test(p)), 'an unapproved handler name is rejected');
// a comment that merely mentions a call is not a call
assert.equal(hasServiceCall('// applyReconciliation() is documented here\n/* convertToPlayableDerived( x ) */', [...CONVERT.callNames, ...RECON.callNames]), false);
assert.equal(stripComments('a // b\nc').length, 'a // b\nc'.length, 'offsets are preserved');
ok('structural check rejects: call in prepare/render, missing confirmation, unapproved handler; ignores comments');

const badDispatch = dispatch.replace("const convertBtn = ev.target.closest(\"[data-action='convert-droid-to-playable']\");\n      if (convertBtn) {", "const convertBtn = true;\n      if (convertBtn) {");
assert.notEqual(badDispatch, dispatch);
assert.ok(checkHandlerDispatch(badDispatch, ['_convertDroidToPlayable']).problems.length > 0, 'a handler not keyed on a data-action click is rejected');
assert.ok(checkHandlerDispatch('class X {\n  _prepareContext() {\n    this._reconcileDroidSystems();\n  }\n}\n', ['_reconcileDroidSystems']).problems.length >= 1, 'a handler invoked from preparation code is rejected');
ok('dispatch check rejects handlers not reached through a data-action click');

// ---- Task 3: the service-side protections the guard relies on are still pinned -------------------
const svc = read('scripts/domain/droids/droid-converted-system-reconciliation-service.js');
assert.match(svc, /intent\.actorId\s*!==\s*actor\.id/);
assert.match(svc, /intent\.inspectionRevision/);
assert.match(svc, /'plan'\s*in\s*intent|'mutationPlan'\s*in\s*intent/);
ok('reconciliation service still verifies actor identity, revision freshness and rejects plan-shaped intents');

// ---- Task 2: vehicle record field vs droid flag -----------------------------------------------------
const { isVehicleRecordFieldOnly } = await import('../tools/check-droid-calculation-mode-authority.mjs');
assert.equal(isVehicleRecordFieldOnly('scripts/engine/import/vehicle-import-normalizer.js', read('scripts/engine/import/vehicle-import-normalizer.js')), true);
assert.equal(isVehicleRecordFieldOnly('scripts/engine/import/vehicle-import-normalizer.js', "const a = flags.swse.stockDroidAttack.publishedAttackTotal;"), false, 'touching the droid flag is never exempt');
assert.equal(isVehicleRecordFieldOnly('scripts/engine/combat/some-attack-helper.js', "const t = x.publishedAttackTotal;"), false, 'a non-vehicle file is never exempt');
ok('vehicle record-field exemption is narrow: path must be vehicle-domain and must not touch stockDroidAttack');

// ---- Task 4: installation write authority -----------------------------------------------------------
const { writesOutsideBranch } = await import('../tools/check-droid-installation-write-authority.mjs');
const upgrade = read('scripts/engine/upgrades/UpgradeService.js');
assert.deepEqual(writesOutsideBranch(upgrade, 'vehicle-actor-'), [], 'UpgradeService writes only in vehicle branches');
assert.ok(!/installedSystems\[targetId\]\s*;?\s*\n\s*await ActorEngine/.test(upgrade.slice(upgrade.indexOf("droid-actor-"), upgrade.indexOf('Vehicle actor system removal'))), 'no droid raw fallback text remains');
const reintroduced = upgrade.replace("      throw new Error(result.error || `Failed to remove ${identified?.id ?? targetId}`);",
  "      const installedSystems = { ...(actor.system?.installedSystems ?? {}) };\n      delete installedSystems[targetId];\n      await ActorEngine.applyMutationPlan(actor, { set: { 'system.installedSystems': installedSystems } });\n      return { success: true };");
assert.notEqual(reintroduced, upgrade);
assert.ok(writesOutsideBranch(reintroduced, 'vehicle-actor-').some(o => /droid-actor-/.test(o)), 'a reintroduced droid fallback is detected');
assert.ok(writesOutsideBranch("function f() { return {'system.installedSystems': x}; }", 'vehicle-actor-').length === 1, 'a write outside any branch is detected');
ok('write-authority guard: UpgradeService scoped to vehicle branches; a reintroduced droid fallback is detected');

console.log(`Droid strict authority guard tests passed (${n} groups).`);
