/**
 * Phase 6 independent-review fixes: (1) HP repair is NOT automated (and the recomputeHP crash is deliberately left alone), (2) targeted progression repair.
 * TEST SCOPE: unit / integration-with-stubs. The real timeline builder and real reconciler produce the focused steps. The shell
 * and sheet wiring is checked statically; opening the real progression surface needs Foundry V13.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
const fnd = globalThis.foundry ?? (globalThis.foundry = {});
fnd.applications = fnd.applications ?? {};
fnd.applications.api = fnd.applications.api ?? { ApplicationV2: class {}, DialogV2: class {}, HandlebarsApplicationMixin: B => B };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const { ClassesDB } = await import('/systems/foundryvtt-swse/scripts/data/classes-db.js');
const { normalizeClass } = await import('/systems/foundryvtt-swse/scripts/data/class-normalizer.js');
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const F = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-findings.js');
const { focusResolutionSteps } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/progression-timeline-builder.js');

for (const line of read('packs/classes.db').split(/\r?\n/).filter(Boolean)) {
  const model = normalizeClass(JSON.parse(line));
  ClassesDB.classes.set(model.id, model);
}
ClassesDB.isBuilt = true;

let seq = 0;
const cls = (name, level, extra = {}) => ({ id: `c${++seq}`, type: 'class', name, system: { level, classId: name.toLowerCase(), ...extra }, flags: { swse: {} } });
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };

function hpActor({ items, level, max, con = 14, type = 'character' }) {
  return {
    id: `h${++seq}`, name: 'HP', type, flags: { swse: {} }, items,
    system: { level, hp: { max }, attributes: { con: { base: con } } },
  };
}

await check('1. recomputeHP no longer reconstructs a maximum: it applies ledger deltas only (Defect A retired; Defect B moot)', () => {
  const engine = read('scripts/governance/actor-engine/actor-engine.js');
  assert.doesNotMatch(engine, /conTotal = conBase/, 'out-of-scope CON variables are gone');
  assert.doesNotMatch(engine, /hpAtFirstLevel \+ \(level - 1\)/, 'stateless reconstruction formula is retired');
  assert.match(engine, /planHpRecompute\(actor\)/);
  const pinned = read('tests/hp-preservation-authority.test.mjs');
  assert.match(pinned, /108/);
});

await check('2. HP repair is not wired: no Resolve for the finding, none in the resolver registry, none from the sheet', async () => {
  const actor = hpActor({ items: [cls('Soldier', 3, { hitDie: 10 })], level: 3, max: 5, con: 10 });
  actor.system.class = { id: 'soldier', name: 'Soldier' };
  actor.system.progression = { classLevels: [{ class: 'Soldier', classId: 'soldier', level: 3 }], hpGainHistory: [{ level: 2, amount: 6 }, { level: 3, amount: 6 }] };
  const hp = F.buildFindings(ProgressionReconciler.safeReconcileActor(actor, { output: 'report', fresh: true })).find(f => f.code === 'HP_BELOW_MINIMUM');
  assert.ok(hp);
  assert.equal(hp.resolve.kind, 'none');
  assert.ok(!read('scripts/apps/progression-framework/shell/reconciliation/reconciliation-resolvers.js').includes("'recompute-hp'"));
  const sheet = read('scripts/sheets/v2/character-like-sheet.js');
  const handler = sheet.slice(sheet.indexOf('async _handleReconciliationAction'), sheet.indexOf('Advisory acquisition check'));
  assert.ok(!/recomputeHP/.test(handler));
});

function missingFeatActor() {
  return {
    id: 'm1', name: 'M', type: 'character', flags: { swse: {} }, _stats: { modifiedTime: 1 },
    items: [cls('Soldier', 4)],
    system: { level: 4, hp: {}, progression: { classLevels: [{ class: 'Soldier', classId: 'soldier', level: 4 }] } },
  };
}

await check('3. targeted routing: the finding resolves to EXACTLY its own step (class, class level, kind) from the real timeline', () => {
  const actor = missingFeatActor();
  const report = ProgressionReconciler.safeReconcileActor(actor, { output: 'report', fresh: true });
  const finding = F.buildFindings(report).find(f => f.id === 'slot:soldier-4-class-feat-1');
  assert.ok(finding, 'missing Soldier level-4 class feat');
  assert.equal(finding.resolve.dataset.slotId, 'soldier-4-class-feat-1');
  const steps = focusResolutionSteps(report.timeline, finding.resolve.dataset.slotId);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].baseStepId, 'class-feat');
  assert.equal(steps[0].classId, 'soldier');
  assert.equal(steps[0].classLevel, 4);
  assert.equal(steps[0].reconciliationContext.slotId, 'soldier-4-class-feat-1');
  // other outstanding choices exist but are NOT part of the focused session
  assert.ok(report.timeline.resolutionSteps.length > 1);
  assert.ok(!steps.some(s => s.slotId !== 'soldier-4-class-feat-1'));
  // stale / unknown slot => no focused steps (callers fall back to the briefing)
  assert.deepEqual(focusResolutionSteps(report.timeline, 'no-such-slot'), []);
  assert.deepEqual(focusResolutionSteps(report.timeline, null), []);
});

await check('4. targeted routing covers talents, general feats and ability-increase slots', () => {
  const actor = missingFeatActor();
  const report = ProgressionReconciler.safeReconcileActor(actor, { output: 'report', fresh: true });
  const want = { 'soldier-3-class-talent-1': 'class-talent', 'general-feat-level-3': 'general-feat' };
  for (const [slotId, base] of Object.entries(want)) {
    const steps = focusResolutionSteps(report.timeline, slotId);
    assert.equal(steps.length, 1, slotId);
    assert.equal(steps[0].baseStepId, base);
  }
});

await check('5. wiring (static): focused mode skips the briefing, adds no class step, and cannot level up', () => {
  const shell = read('scripts/apps/progression-framework/levelup-shell.js');
  const reconcileFn = shell.slice(shell.indexOf('  _getReconciliationCanonicalDescriptors() {'), shell.indexOf('  _descriptorForReconciliationStep(step'));
  assert.ok(reconcileFn.indexOf('focusResolutionSteps(') > 0 && reconcileFn.indexOf('focusResolutionSteps(') < reconcileFn.indexOf("stepId: 'reconciliation-overview'"), 'focus decided before the briefing is added');
  assert.match(reconcileFn, /return focused;/);
  const stepFn = shell.slice(shell.indexOf('  _descriptorForReconciliationStep(step'), shell.indexOf('  _getLegacyCanonicalDescriptors() {'));
  for (const base of ['attribute', 'general-feat', 'class-feat', 'general-talent', 'class-talent']) assert.ok(stepFn.includes(`case '${base}'`));
  assert.ok(!/case 'class'|case 'species'|ClassStep/.test(stepFn), 'reconcile mode has no class-selection step, so no level can be added');
  const sheet = read('scripts/sheets/v2/character-like-sheet.js');
  const open = sheet.slice(sheet.indexOf('async _openProgressionReconciliationStep('), sheet.indexOf('async _openProgressionReconciliationStep(') + 2200);
  assert.match(open, /const focused = !!reconciliation\.slotId;/);
  assert.match(open, /\.\.\.\(focused \? \{\} : \{/);
  const fin = read('scripts/apps/progression-framework/shell/progression-finalizer.js');
  assert.match(fin, /const levelUpManifest = sessionState\.mode === 'levelup' && !this\._isReconciliationSession\(sessionState\)/);
});

console.log('reconciliation-phase6-review-fixes: all assertions passed');
