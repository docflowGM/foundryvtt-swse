/**
 * Phase 6 - Advisory reconciliation: Error | Explanation | Resolve | Ignore.
 *
 * TEST SCOPE: unit / mock-environment (hand-built actors, stub authorities). The live sheet handlers,
 * overlay rendering, real ActorEngine.recalcAll / recomputeHP, and the real progression step opening
 * need Foundry V13 runtime verification and are checked here only statically.
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ClassesDB } = await import('/systems/foundryvtt-swse/scripts/data/classes-db.js');
const { normalizeClass } = await import('/systems/foundryvtt-swse/scripts/data/class-normalizer.js');
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const F = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-findings.js');
const { resolveFinding } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-resolvers.js');
const acq = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/acquisition-authority.js');
const { AbilityEngine } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js');
const { settleDerived } = await import('./helpers/derived-lifecycle-fixture.mjs');
const { DropResolutionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/interactions/drop-resolution-engine.js');

for (const line of fs.readFileSync(path.join(ROOT, 'packs/classes.db'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const model = normalizeClass(JSON.parse(line));
  ClassesDB.classes.set(model.id, model);
}
ClassesDB.isBuilt = true;

let seq = 0;
const cls = (name, level) => ({ id: `c${++seq}`, type: 'class', name, system: { level, classId: name.toLowerCase() }, flags: { swse: {} } });
const man = (name, level, extra = {}) => settleDerived({
  id: `a${++seq}`, name: 'Manual', type: 'character', flags: { swse: {} }, _stats: { modifiedTime: 1 },
  items: [cls(name, level)],
  system: { level, hp: {}, progression: { classLevels: [{ class: name, classId: name.toLowerCase(), level }] }, ...extra },
});
const find = (actor, id) => F.buildFindings(ProgressionReconciler.safeReconcileActor(actor, { output: 'report', fresh: true })).find(f => f.id === id);
const sheet = actor => ProgressionReconciler.safeReconcileActor(actor, { output: 'sheet', fresh: true });
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };

await check('1. findings are specific mechanical discrepancies with stable identity, explanation and a resolve action; a BAB cross-check difference is informational only (R17-F2)', () => {
  const actor = man('Soldier', 4, { derived: { bab: 2, babAdjustment: 0 } });
  const r = ProgressionReconciler.safeReconcileActor(actor, { output: 'report', fresh: true });
  const fs_ = F.buildFindings(r);
  assert.equal(fs_.some(f => f.code === 'BAB_MISMATCH' || f.code === 'DEFENSE_MISMATCH'), false, 'no confirmed BAB / defense finding from the competing arithmetic');
  const row = r.derivedStats.rows.find(x => x.id === 'bab');
  assert.equal(row.needsAttention, false); assert.equal(row.status, 'unverifiable');
  assert.match(row.noteText, /BAB.*not reported as an error/);
  assert.ok(sheet(actor).validation.notes.some(n => n.id === 'note:bab'), 'shown as an informational note');
  const talent = fs_.find(f => f.code === 'MISSING_CLASS_TALENT');
  assert.match(talent.id, /^slot:soldier-1-class-talent-1$/);
  assert.equal(talent.resolve.kind, 'open-step');
  assert.equal(talent.resolve.dataset.classId, 'soldier');
  assert.equal(talent.resolve.dataset.classLevel, 1);
  assert.ok(talent.resolve.dataset.stepId);
});

await check('1b. a legitimate permanent BAB modifier is NOT a discrepancy (derived BAB includes the adjustment)', () => {
  const actor = man('Soldier', 4, { derived: { bab: 6, babAdjustment: 2 } }); // class BAB 4 + a +2 permanent modifier
  const row = ProgressionReconciler.safeReconcileActor(actor, { output: 'report', fresh: true }).derivedStats.rows.find(x => x.id === 'bab');
  assert.equal(row.status, 'ok'); assert.equal(row.needsAttention, false); assert.ok(!row.noteText);
  assert.equal(sheet(actor).validation.notes.some(n => n.id === 'note:bab'), false);
  const noAdj = man('Soldier', 4, { derived: { bab: 6 } });   // adjustment unknown => cannot separate => silent
  assert.equal(sheet(noAdj).validation.notes.some(n => n.id === 'note:bab'), false);
});

await check('2. manual build with no provenance/certification and correct mechanics: no findings, no !', () => {
  const actor = man('Soldier', 1, { derived: { bab: 1, babAdjustment: 0, defenses: { fortitude: { classBonus: 2 }, reflex: { classBonus: 1 }, will: { classBonus: 0 } } }, hp: {} });
  actor.items.push({ id: 'f1', type: 'feat', name: 'Toughness', system: {}, flags: { swse: {} } }, { id: 't1', type: 'talent', name: 'Armor Specialization', system: {}, flags: { swse: {} } });
  const s = sheet(actor);
  assert.equal(s.validation.findings.length, 0);
  assert.equal(s.validation.playerActionable, false);
});

await check('3. Ignore: suppresses ONLY that warning, persists, changes nothing mechanical, header state follows', () => {
  const actor = man('Soldier', 4, { derived: { bab: 2, babAdjustment: 0 } });
  const before = sheet(actor);
  assert.ok(before.validation.findings.some(f => f.id === 'slot:soldier-1-class-talent-1'));
  const babFinding = find(actor, 'slot:soldier-1-class-talent-1');
  actor.flags.swse.reconciliationIgnored = F.addIgnored(F.readIgnored(actor), babFinding, { userId: 'u1', userName: 'Pat' });
  actor.flags.swse.reconciliationIgnored = F.addIgnored(F.readIgnored(actor), babFinding, { userId: 'u1' });
  assert.equal(actor.flags.swse.reconciliationIgnored.length, 1, 'ignoring twice is idempotent');
  const after = sheet(actor);
  assert.ok(!after.validation.findings.some(f => f.id === 'slot:soldier-1-class-talent-1'));
  assert.equal(after.validation.ignored.length, 1);
  assert.equal(after.validation.ignored[0].ignoredByName, 'Pat');
  assert.equal(actor.system.derived.bab, 2, 'character statistics are untouched');
  assert.equal(actor.items.length, 1);
  assert.ok(!after.derivedStats.rows.find(r => r.id === 'bab').needsAttention, 'the ledger/derived projection no longer nags');
  // other findings remain
  assert.ok(after.validation.findings.length > 0);
});

await check('4. Ignore all => header ! disappears; material change => NEW finding reappears; old record is stale', () => {
  const actor = man('Soldier', 4, { derived: { bab: 2, babAdjustment: 0 } });
  let all = F.buildFindings(ProgressionReconciler.safeReconcileActor(actor, { output: 'report', fresh: true }));
  for (const f of all) actor.flags.swse.reconciliationIgnored = F.addIgnored(F.readIgnored(actor), f, {});
  let s = sheet(actor);
  assert.equal(s.validation.findings.length, 0);
  assert.equal(s.validation.playerActionable, false, 'every finding ignored => hidden');
  // level up: a new entitlement appears, which the earlier ignores do not cover
  const ignoredIds = new Set(all.map(f => f.id));
  actor.items[0].system.level = 5; actor.system.level = 5; actor.system.progression.classLevels[0].level = 5; actor._stats.modifiedTime = 2;
  settleDerived(actor);
  s = sheet(actor);
  assert.ok(s.validation.findings.length > 0 && s.validation.findings.every(f => !ignoredIds.has(f.id)), 'the NEW finding reappears; the old ones stay ignored');
  assert.equal(s.validation.playerActionable, true);
  // an ignore record whose discrepancy no longer exists is reported stale and can be cleared
  actor.flags.swse.reconciliationIgnored = [...F.readIgnored(actor), { id: 'slot:gone-1', code: 'MISSING_CLASS_TALENT' }];
  s = sheet(actor);
  assert.ok(s.validation.staleIgnored.some(r => r.id === 'slot:gone-1'), 'the stale ignore record is reported');
  actor.flags.swse.reconciliationIgnored = F.removeIgnored(F.readIgnored(actor), s.validation.staleIgnored.map(r => r.id));
  assert.ok(!sheet(actor).validation.staleIgnored.length);
});

await check('5. Restore returns the warning; restore is idempotent', () => {
  const actor = man('Soldier', 4, { derived: { bab: 2, babAdjustment: 0 } });
  const f = find(actor, 'slot:soldier-1-class-talent-1');
  actor.flags.swse.reconciliationIgnored = F.addIgnored([], f, {});
  assert.ok(!sheet(actor).validation.findings.some(x => x.id === f.id));
  actor.flags.swse.reconciliationIgnored = F.removeIgnored(F.readIgnored(actor), f.id);
  actor.flags.swse.reconciliationIgnored = F.removeIgnored(F.readIgnored(actor), f.id);
  assert.ok(sheet(actor).validation.findings.some(x => x.id === f.id));
});

await check('6. memo: an ignore/restore flag change is honoured on the very next sheet projection (no stale memo)', () => {
  const actor = man('Soldier', 4, { derived: { bab: 2, babAdjustment: 0 } });
  assert.ok(ProgressionReconciler.safeReconcileActor(actor, { output: 'sheet' }).validation.findings.some(f => f.id === 'slot:soldier-1-class-talent-1'));
  const f = find(actor, 'slot:soldier-1-class-talent-1');
  actor.flags.swse.reconciliationIgnored = F.addIgnored([], f, {});
  actor._stats.modifiedTime = 2;
  assert.ok(!ProgressionReconciler.safeReconcileActor(actor, { output: 'sheet' }).validation.findings.some(x => x.id === f.id));
});

// BAB cross-checks are informational (R17-F2), so no REAL finding carries a 'recalc' resolve any more. The resolver registry's
// idempotence / verification / in-flight guarantees are exercised against a synthetic finding of that shape.
const SYNTH = 'derived:bab:4:2';
const synthBab = a => (a.system.derived.bab === 4 ? [] : [{ id: SYNTH, subject: 'derived:bab', code: 'SYNTHETIC_RECALC', resolve: { kind: 'recalc', label: 'Recalculate' } }]);
function resolverDeps(actor, log, overrides = {}) {
  return {
    findFindings: a => [...F.buildFindings(ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true })), ...synthBab(a)],
    recalcAll: async a => { log.push('recalc'); a.system.derived.bab = 4; },
    openStep: async ds => { log.push(`open:${ds.stepId}`); },
    confirm: async () => true,
    ...overrides,
  };
}

await check('7. Resolve BAB: invokes the canonical recalculation (never overwrites), verifies, and a second click is a no-op', async () => {
  const actor = man('Soldier', 4, { derived: { bab: 2, babAdjustment: 0 } });
  const log = [];
  const first = await resolveFinding({ actor, findingId: SYNTH, deps: resolverDeps(actor, log) });
  assert.equal(first.status, 'resolved');
  const second = await resolveFinding({ actor, findingId: SYNTH, deps: resolverDeps(actor, log) });
  assert.equal(second.status, 'already-resolved');
  assert.deepEqual(log, ['recalc'], 'recalculated exactly once');
});

await check('8. Resolve that does not fix the value says so (no false success, no forced value)', async () => {
  const actor = man('Soldier', 4, { derived: { bab: 2, babAdjustment: 0 } });
  const log = [];
  const res = await resolveFinding({ actor, findingId: SYNTH, deps: resolverDeps(actor, log, { recalcAll: async () => { log.push('recalc'); } }) });
  assert.equal(res.status, 'unchanged');
  assert.equal(actor.system.derived.bab, 2);
});

await check('9. a repair that moves the value to ANOTHER wrong value is not reported as resolved', async () => {
  const actor = man('Soldier', 4, { derived: { bab: 2, babAdjustment: 0 } });
  const res = await resolveFinding({ actor, findingId: SYNTH, deps: resolverDeps(actor, [], { recalcAll: async a => { a.system.derived.bab = 3; } }) });
  assert.equal(res.status, 'unchanged', 'subject-based verification: BAB still mismatched');
});

await check('10. HP discrepancy is review + ignore only: no Resolve is offered (different HP formulas), and it stays ignorable', async () => {
  const actor = man('Soldier', 3, { hp: { max: 5 } });
  actor.system.progression.hpGainHistory = [{ level: 2, amount: 6 }, { level: 3, amount: 6 }];
  // a recorded contribution the stored maximum does not reflect: ledger says CON +0 was included, CON is now +2 (x 3 levels)
  actor.system.attributes = { con: { base: 14 } };
  actor.system.progression.hpLedger = { conMod: 0, featBonus: 0, bonus: 0, level: 3 };
  const hp = F.buildFindings(ProgressionReconciler.safeReconcileActor(actor, { output: 'report', fresh: true })).find(f => f.code === 'HP_LEDGER_MISMATCH');
  assert.ok(hp, 'the discrepancy is still detected');
  assert.equal(hp.resolve.kind, 'none');
  assert.equal(hp.resolve.reviewOnly, true);
  assert.match(hp.explanation, /Review your hit points/);
  const res = await resolveFinding({ actor, findingId: hp.id, deps: resolverDeps(actor, []) });
  assert.equal(res.status, 'unsupported', 'even a forced Resolve cannot recompute HP');
  actor.flags.swse.reconciliationIgnored = F.addIgnored([], hp, {});
  assert.ok(!sheet(actor).validation.findings.some(f => f.id === hp.id));
});

await check('11. Resolve missing talent: opens the matching selection step (no mutation, no level change); repeated clicks never mutate', async () => {
  const actor = man('Soldier', 1);
  const log = [];
  const id = 'slot:soldier-1-class-talent-1';
  const before = JSON.stringify(actor.system);
  const res = await resolveFinding({ actor, findingId: id, deps: resolverDeps(actor, log) });
  assert.equal(res.status, 'opened-step');
  await resolveFinding({ actor, findingId: id, deps: resolverDeps(actor, log) });
  assert.equal(log.length, 2);
  assert.ok(log.every(l => l.startsWith('open:')));
  assert.equal(JSON.stringify(actor.system), before, 'resolving never touches the actor');
  assert.equal(actor.system.level, 1);
});

await check('12. rapid double click is absorbed by the in-flight guard', async () => {
  const actor = man('Soldier', 4, { derived: { bab: 2, babAdjustment: 0 } });
  const log = [];
  let release; const gate = new Promise(r => { release = r; });
  const deps = resolverDeps(actor, log, { recalcAll: async a => { log.push('recalc'); await gate; a.system.derived.bab = 4; } });
  const p1 = resolveFinding({ actor, findingId: SYNTH, deps });
  const p2 = await resolveFinding({ actor, findingId: SYNTH, deps });
  assert.equal(p2.status, 'busy');
  release();
  assert.equal((await p1).status, 'resolved');
  assert.deepEqual(log, ['recalc']);
});

await check('13. advisory acquisition (default): proven problems never block; they come back as advisories; strict is opt-in', () => {
  AbilityEngine.evaluateAcquisition = () => ({ legal: false, missingPrereqs: ['BAB +5'], unresolved: [] });
  const actor = man('Soldier', 1);
  actor.items.push({ id: 'f1', type: 'feat', name: 'A', system: { acquisition: { sourceSession: 'S', slotType: 'general', characterLevel: 1 } }, flags: { swse: { progression: { sourceSession: 'S', slotType: 'general' } } } });
  const item = { id: 'd', type: 'feat', name: 'Dodge', system: {}, flags: {} };
  const v = acq.validateAcquisition({ actor, item, isGM: false });
  assert.equal(v.decision, 'allow');
  assert.ok(v.advisories.length >= 1);
  assert.equal(acq.validateAcquisition({ actor, item, isGM: false, strict: true }).decision, 'block');
  assert.equal(acq.getAcquisitionMode(), 'advisory');
});

await check('14. manual class drop uses the EXISTING class-level writer: +1 level, class item, ledger (no second writer, no Level Up)', () => {
  const actor = { id: 'm', type: 'character', items: [], system: { level: 1, progression: { classLevels: [{ class: 'Soldier', classId: 'soldier', level: 1 }] } } };
  actor.items = [cls('Soldier', 1)];
  const dropped = { id: 'k', type: 'class', name: 'Soldier', system: { classId: 'soldier' }, toObject() { return { name: 'Soldier', type: 'class', system: { classId: 'soldier' } }; } };
  const plan = DropResolutionEngine._handleItemDrop(actor, dropped);
  assert.ok(plan?.mutationPlan, 'a class drop yields a mutation plan');
  const text = JSON.stringify(plan.mutationPlan);
  assert.match(text, /system\.level/);
  assert.match(text, /classLevels/);
  const sheetSrc = fs.readFileSync(path.join(ROOT, 'scripts/sheets/v2/character-like-sheet.js'), 'utf8');
  const gateBody = sheetSrc.slice(sheetSrc.indexOf('async _gateItemAcquisition(item)'), sheetSrc.indexOf('async _handleBackgroundDrop'));
  assert.ok(!gateBody.includes("item.type === 'class'"), 'the acquisition check does not intercept class drops');
});

await check('15. wiring (static): handlers use only canonical authorities; the overlay is the four-column interface; ignore uses the flag, not the actor data', () => {
  const sheetSrc = fs.readFileSync(path.join(ROOT, 'scripts/sheets/v2/character-like-sheet.js'), 'utf8');
  const body = sheetSrc.slice(sheetSrc.indexOf('async _handleReconciliationAction'), sheetSrc.indexOf('async _gateItemAcquisition') > 0 ? sheetSrc.indexOf('/**\n   * Advisory acquisition check') : undefined);
  assert.match(body, /ActorEngine\.recalcAll/);
  assert.ok(!/recomputeHP/.test(body), 'no HP repair is wired from the sheet');
  assert.match(body, /_openProgressionReconciliationStep/);
  assert.match(body, /IGNORE_FLAG_PATH/);
  assert.ok(!/system\.hp\.max|system\.derived\.bab|actor\.update\(/.test(body));
  const tpl = fs.readFileSync(path.join(ROOT, 'templates/shell/partials/shell-overlay-layer.hbs'), 'utf8');
  for (const heading of ['<th>Error</th>', '<th>Explanation</th>', '<th>Resolve</th>']) assert.ok(tpl.includes(heading));
  assert.match(tpl, /data-action="ignore-finding"[^>]*title="Ignore this warning"/);
  assert.match(tpl, /data-action="restore-finding"/);
});

console.log('reconciliation-phase6-advisory: all assertions passed');
