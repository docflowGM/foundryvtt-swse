/**
 * Reconciliation domain adapters (17-domain overhaul, Phase 1). Real reconciler, real class data, real
 * calculateMaxForcePointsForBuildPlan. In-memory actors only. Node harness - NOT Foundry runtime verification.
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
const A = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/domain-adapters.js');
const F = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-findings.js');
const { settleDerived } = await import('./helpers/derived-lifecycle-fixture.mjs');
const E = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/async-enrichment.js');
const L = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/derived-lifecycle.js');
const { HouseRuleService } = await import('/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js');
const { resolveFinding } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-resolvers.js');

for (const line of fs.readFileSync(path.join(ROOT, 'packs/classes.db'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const model = normalizeClass(JSON.parse(line));
  ClassesDB.classes.set(model.id, model);
}
ClassesDB.isBuilt = true;

let seq = 0;
const item = (type, name, system = {}, flags = {}) => ({ id: `i${++seq}`, type, name, system, flags: { swse: flags } });
const cls = (name, level) => item('class', name, { level, classId: name.toLowerCase().replace(/\s+/g, '_') });
const row = (name, level) => ({ class: name, classId: name.toLowerCase().replace(/\s+/g, '_'), level });
const forceBoon = () => item('feat', 'Force Boon', { abilityMeta: { resourceRules: { forcePoints: [{ type: 'MAX_BONUS', value: 3 }] } } });

function pc({ classes = [['Soldier', 3]], fpMax, fpValue = fpMax, items = [], type = 'character', flags = {}, level, refreshMax, override } = {}) {
  const total = classes.reduce((n, [, l]) => n + l, 0);
  return {
    id: `a${++seq}`, name: 'Fixture', type, flags: { swse: { ...(override ? { overrides: { forcePointsMax: override } } : {}), ...flags } }, _stats: { modifiedTime: seq },
    items: [...classes.map(([n, l]) => cls(n, l)), ...items],
    system: {
      level: level ?? total, hp: { max: 30 }, attributes: { con: { base: 10 } },
      forcePoints: { value: fpValue, max: fpMax },
      progression: { classLevels: classes.map(([n, l]) => row(n, l)), ...(refreshMax !== undefined ? { lastForcePointRefresh: { reason: 'level-up', newMax: refreshMax } } : {}) },
    },
    getFlag(scope, key) { return this.flags?.[scope === 'swse' ? 'swse' : scope]?.[key]; },
  };
}
const R = new ProgressionReconciler();
const report = a => R.reconcileActor(a, {});
const fpRow = a => report(a).derivedStats.rows.find(r => r.id === 'force-points-max');
const fpFinding = a => F.buildFindings(report(a)).find(f => f.code === 'FORCE_POINT_MAX_MISMATCH');
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };

const optionals = a => F.buildOptionalActions(report(a));
const wait = () => new Promise(r => setImmediate(r)); // lets already-settled microtasks drain; NOT a correctness gate
const verdict = (over = {}) => ({ domain: 'test', id: 'test-domain', label: 'Test', status: 'CONFIRMED_DISCREPANCY', expected: 1, actual: 2, issue: 'Test discrepancy.', authority: 'test', reason: '', resolve: { kind: 'none', label: '' }, ...over });

// ---------------------------------------------------------------- Force Point maximum classification (D-2)
await check('1. correctly initialized maximum (progression-written, formula agrees) is VALID and silent', () => {
  const a = pc({ fpMax: 6, refreshMax: 6 });
  assert.equal(fpRow(a).status, 'ok'); assert.equal(fpRow(a).needsAttention, false);
  assert.equal(fpFinding(a), undefined); assert.equal(optionals(a).length, 0);
});

await check('2. PROVEN stale formula-managed value (progression wrote it, untouched since, formula now differs) is the only confirmed case', () => {
  const f = fpFinding(pc({ fpMax: 5, refreshMax: 5 }));
  assert.ok(f); assert.equal(f.expected, 6); assert.equal(f.actual, 5);
  assert.equal(f.id, 'derived:force-points-max:6:5');
  assert.equal(f.resolve.kind, 'set-force-point-max'); assert.equal(f.resolve.dataset.value, 6); assert.equal(f.ignorable, true);
});

await check('3. manual character with the template default 0: NO error; optional initialization only, not counted toward the !', () => {
  const a = pc({ fpMax: 0, fpValue: 0 });
  assert.equal(fpFinding(a), undefined);
  assert.equal(fpRow(a).needsAttention, false); assert.equal(fpRow(a).reason, 'uninitialized');
  const opt = optionals(a);
  assert.equal(opt.length, 1); assert.equal(opt[0].id, 'optional:force-points-max'); assert.equal(opt[0].resolve.dataset.value, 6);
  const sheetAudit = ProgressionReconciler.safeReconcileActor(a, { output: 'sheet', fresh: true });
  assert.equal(sheetAudit.validation.findings.some(f => f.code === 'FORCE_POINT_MAX_MISMATCH'), false);
  assert.equal(sheetAudit.validation.optional.length, 1, 'shown in the overlay as optional');
});

await check('4. unknown provenance (differs, no progression record, no override): informational + optional, never an error', () => {
  const a = pc({ fpMax: 9 });
  assert.equal(fpFinding(a), undefined); assert.equal(fpRow(a).reason, 'unknown-provenance');
  assert.equal(optionals(a).length, 1);
  const edited = pc({ fpMax: 9, refreshMax: 6 }); // changed after progression last wrote 6
  assert.equal(fpFinding(edited), undefined, 'a value edited after progression is not formula-managed');
});

await check('5. documented GM override is VALID; a stale override record (value later changed) is not honored', () => {
  const a = pc({ fpMax: 12, override: { value: 12, authority: 'gm', setBy: 'u1', setAt: 't' } });
  assert.equal(fpRow(a).status, 'ok'); assert.equal(fpRow(a).reason, 'authorized-override');
  assert.equal(fpFinding(a), undefined); assert.equal(optionals(a).length, 0);
  const stale = pc({ fpMax: 11, override: { value: 12, authority: 'gm' } });
  assert.equal(fpRow(stale).reason, 'unknown-provenance');
  const notGm = pc({ fpMax: 12, override: { value: 12, authority: 'player' } });
  assert.equal(fpRow(notGm).reason, 'unknown-provenance', 'only a GM-authorized record counts');
});

await check('6. Force Point feat bonus and prestige / high-water bases are honored by the canonical formula', () => {
  assert.equal(fpRow(pc({ fpMax: 9, items: [forceBoon()] })).status, 'ok');
  assert.equal(fpFinding(pc({ fpMax: 6, refreshMax: 6, items: [forceBoon()] })).expected, 9);
  assert.equal(fpRow(pc({ classes: [['Soldier', 2], ['Gunslinger', 2]], fpMax: 8 })).status, 'ok');
  assert.equal(fpRow(pc({ classes: [['Soldier', 4], ['Jedi Master', 2]], fpMax: 10 })).status, 'ok');
  assert.equal(fpRow(pc({ fpMax: 7, flags: { hasPrestigeFPBonus: true } })).status, 'ok');
  assert.equal(fpRow(pc({ classes: [['Soldier', 3], ['Scout', 3]], fpMax: 8 })).status, 'ok');
});

await check('7. spent / excess current Force Points are never findings; non-characters are NOT_APPLICABLE', () => {
  assert.equal(fpFinding(pc({ fpMax: 6, refreshMax: 6, fpValue: 0 })), undefined);
  assert.equal(fpFinding(pc({ fpMax: 6, refreshMax: 6, fpValue: 99 })), undefined);
  for (const type of ['npc', 'droid', 'vehicle']) {
    assert.equal(A.forcePointMaxAdapter(pc({ fpMax: 1, type })).status, A.DOMAIN_STATUS.NOT_APPLICABLE);
    assert.equal(A.adapterToRow(A.forcePointMaxAdapter(pc({ fpMax: 1, type }))), null);
  }
});

await check('8. missing / conflicting evidence is UNVERIFIABLE', () => {
  const noMax = pc({ fpMax: undefined }); noMax.system.forcePoints = {};
  assert.equal(A.forcePointMaxAdapter(noMax).status, A.DOMAIN_STATUS.UNVERIFIABLE);
  assert.notEqual(A.forcePointMaxAdapter(pc({ classes: [['Mystery Class', 3]], fpMax: 99, refreshMax: 99 })).status, A.DOMAIN_STATUS.CONFIRMED_DISCREPANCY);
  const conflict = pc({ fpMax: 99, refreshMax: 99 }); conflict.system.progression.classLevels = [row('Soldier', 2)];
  assert.notEqual(A.forcePointMaxAdapter(conflict).status, A.DOMAIN_STATUS.CONFIRMED_DISCREPANCY);
  assert.equal(A.forcePointMaxAdapter(pc({ fpMax: 99, refreshMax: 99, level: 9 })).status, A.DOMAIN_STATUS.UNVERIFIABLE);
});

await check('9. adapters are read-only and repeatable', () => {
  const a = pc({ classes: [['Soldier', 2], ['Gunslinger', 2]], fpMax: 1, refreshMax: 1 });
  let writes = 0; a.setFlag = () => { writes += 1; }; a.update = () => { writes += 1; }; a.updateSource = () => { writes += 1; };
  const before = JSON.stringify(a.system) + JSON.stringify(a.flags);
  const v1 = A.forcePointMaxAdapter(a), v2 = A.forcePointMaxAdapter(a); report(a);
  assert.equal(writes, 0); assert.equal(JSON.stringify(a.system) + JSON.stringify(a.flags), before); assert.deepEqual(v1, v2);
});

await check('10. a throwing adapter is isolated (sync and async)', async () => {
  const out = A.runDomainAdapters(pc({ fpMax: 6 }), [function boom() { throw new Error('boom'); }, A.forcePointMaxAdapter]);
  assert.equal(out[0].reason, 'adapter-error'); assert.equal(A.adapterToRow(out[0]).needsAttention, false);
  const outAsync = await A.runAsyncDomainAdapters(pc({ fpMax: 6 }), [async function boomAsync() { throw new Error('boom'); }]);
  assert.equal(outAsync[0].status, A.DOMAIN_STATUS.UNVERIFIABLE);
});

// ---------------------------------------------------------------- Resolve safety (P1-F2)
function resolveDeps(actor, over = {}) {
  const calls = [];
  return { calls, deps: {
    findFindings: x => [...F.buildFindings(report(x)), ...F.buildOptionalActions(report(x))],
    actorRevision: x => x._stats.modifiedTime,
    setForcePointMax: async (x, v, { previous } = {}) => {
      if (Number(x.system.forcePoints.max) !== Number(previous)) { const e = new Error('changed'); e.code = 'STALE_VALUE'; throw e; }
      calls.push(v); x.system.forcePoints.max = v; x.system.progression.lastForcePointRefresh = { newMax: v }; x._stats.modifiedTime += 1;
    },
    recalcAll: async () => {}, openStep: async () => {}, grantHouseRule: async () => {}, ...over,
  } };
}

await check('11. Resolve revalidates and writes the verified value once; idempotent; unchanged is reported honestly', async () => {
  const a = pc({ fpMax: 5, refreshMax: 5 });
  const { calls, deps } = resolveDeps(a);
  const id = fpFinding(a).id;
  assert.equal((await resolveFinding({ actor: a, findingId: id, deps })).status, 'resolved'); assert.deepEqual(calls, [6]);
  assert.equal((await resolveFinding({ actor: a, findingId: id, deps })).status, 'already-resolved'); assert.equal(calls.length, 1);
  const b = pc({ fpMax: 5, refreshMax: 5 });
  const noop = resolveDeps(b, { setForcePointMax: async () => {} });
  assert.equal((await resolveFinding({ actor: b, findingId: fpFinding(b).id, deps: noop.deps })).status, 'unchanged');
});

await check('12. stale Resolve: actor changed after the finding was built => nothing written', async () => {
  // revision moves between the start of the action and the write
  const a = pc({ fpMax: 5, refreshMax: 5 });
  let n = 0; const { calls, deps } = resolveDeps(a, { actorRevision: () => (n += 1) });
  const res = await resolveFinding({ actor: a, findingId: fpFinding(a).id, deps });
  assert.equal(res.status, 'stale'); assert.equal(calls.length, 0);
  // the canonical expected value changed (a Force Point feat was added) after the finding was displayed
  const b = pc({ fpMax: 5, refreshMax: 5 });
  const stalePlan = fpFinding(b);
  b.items.push(forceBoon()); b._stats.modifiedTime += 1;
  const fixed = resolveDeps(b);
  // simulate the displayed (old) finding by serving it on the first read only
  let reads = 0; const real = fixed.deps.findFindings;
  fixed.deps.findFindings = x => (reads++ === 0 ? [stalePlan] : real(x));
  const res2 = await resolveFinding({ actor: b, findingId: stalePlan.id, deps: fixed.deps });
  assert.equal(res2.status, 'stale'); assert.equal(fixed.calls.length, 0, 'the previously captured value is not trusted');
  // the stored value changed under us: the writer refuses
  const c = pc({ fpMax: 5, refreshMax: 5 });
  const guard = resolveDeps(c);
  const f = fpFinding(c); c.system.forcePoints.max = 5; // unchanged here...
  let first = true; const w = guard.deps.setForcePointMax;
  guard.deps.setForcePointMax = async (x, v, o) => { if (first) { first = false; x.system.forcePoints.max = 8; } return w(x, v, o); };
  assert.equal((await resolveFinding({ actor: c, findingId: f.id, deps: guard.deps })).status, 'stale'); assert.equal(guard.calls.length, 0);
});

await check('13. optional initialization resolves through the same safe path', async () => {
  const a = pc({ fpMax: 0, fpValue: 0 });
  const { calls, deps } = resolveDeps(a);
  assert.equal((await resolveFinding({ actor: a, findingId: 'optional:force-points-max', deps })).status, 'resolved');
  assert.deepEqual(calls, [6]); assert.equal(optionals(a).length, 0);
});

await check('14. Ignore persists and a materially changed discrepancy is a NEW finding', () => {
  const a = pc({ fpMax: 5, refreshMax: 5 });
  const f = fpFinding(a);
  a.flags.swse.reconciliationIgnored = F.addIgnored([], f, {});
  const part = F.partitionFindings(F.buildFindings(report(a)), F.readIgnored(a));
  assert.equal(part.visible.filter(x => x.code === 'FORCE_POINT_MAX_MISMATCH').length, 0); assert.equal(part.ignored.length, 1);
  a.system.level = 4; a.items[0].system.level = 4; a.system.progression.classLevels = [row('Soldier', 4)]; a._stats.modifiedTime += 1;
  const next = F.buildFindings(report(a)).find(x => x.code === 'FORCE_POINT_MAX_MISMATCH');
  assert.equal(next.expected, 7); assert.notEqual(next.id, f.id);
});

// ---------------------------------------------------------------- derived lifecycle (D-1 / P1-F5)
function babActor(derivedBab = 2) {
  return {
    id: `b${++seq}`, name: 'Bab', type: 'character', flags: { swse: {} }, _stats: { modifiedTime: 1 },
    items: [cls('Soldier', 4)],
    system: { level: 4, hp: {}, derived: { bab: derivedBab }, progression: { classLevels: [row('Soldier', 4)] } },
  };
}
const babFinding = (a, opts = {}) => F.buildFindings(ProgressionReconciler.safeReconcileActor(a, { output: 'report', ...opts })).find(f => f.code === 'BAB_MISMATCH');

await check('15. calculation pending => NO accusation; applied => the discrepancy is evaluated', () => {
  const a = babActor();
  assert.equal(L.derivedLifecycle(a).state, 'pending');
  assert.equal(babFinding(a, { fresh: true }), undefined, 'no false ! while the derived pass has not been applied');
  const row = ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true }).derivedStats.rows.find(r => r.id === 'bab');
  assert.equal(row.status, 'unverifiable'); assert.equal(row.needsAttention, false);
  settleDerived(a);
  assert.equal(L.derivedLifecycle(a).state, 'current');
  assert.ok(babFinding(a, { fresh: true }), 'applied for the current state: real discrepancy is reported');
});

await check('16. derived reset and reapplication: a reset destination is pending again, reapplication restores it', () => {
  const a = settleDerived(babActor());
  assert.ok(babFinding(a, { fresh: true }));
  const bab = a.system.derived.bab; a.system.derived = {}; // Foundry reconstructs system.derived
  assert.equal(L.derivedLifecycle(a).state, 'pending'); assert.equal(babFinding(a, { fresh: true }), undefined);
  a.system.derived = { bab }; settleDerived(a);
  assert.ok(babFinding(a, { fresh: true }));
});

await check('17. memo: a derived pass landing WITHOUT any actor update is not hidden by a cached pending report', () => {
  const a = babActor();
  assert.equal(babFinding(a), undefined);            // cached while pending (memoized)
  settleDerived(a);                                  // _stats.modifiedTime unchanged
  assert.ok(babFinding(a), 'lifecycle is part of the memo key');
  assert.equal(babFinding(a) !== undefined, true);
});

await check('18. persisted defense overrides are never read as the class defense (D-2); only the prepared value is', () => {
  const a = settleDerived(babActor(4));
  a.system.derived.defenses = { fortitude: { classBonus: 2 }, reflex: { classBonus: 0 }, will: { classBonus: 0 } };
  a.system.defenses = { fortitude: { classBonus: 99, class: 99 }, reflex: { classBonus: 99 }, will: { classBonus: 99 } };
  settleDerived(a);
  const rows = ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true }).derivedStats.rows;
  const fort = rows.find(r => r.id === 'fortitude-class-defense');
  assert.equal(fort.current, 2, 'the deliberate persisted override (99) is ignored; the prepared value is compared');
});

// ---------------------------------------------------------------- async enrichment (D-3)
await check('19. enrichment waits for the derived lifecycle (no timers), runs once, then merges a still-applicable result', async () => {
  E.AsyncReconciliationEnrichment.reset();
  const a = babActor(); let runs = 0; let refreshed = 0;
  const adapter = async () => { runs += 1; return verdict(); };
  assert.equal(E.AsyncReconciliationEnrichment.ensureRequested(a, { adapters: [adapter], refresh: () => { refreshed += 1; } }), 'waiting');
  E.AsyncReconciliationEnrichment.ensureRequested(a, { adapters: [adapter] }); // same revision: coalesced
  await wait(); assert.equal(runs, 0, 'derived pass not applied => the adapter does not run');
  settleDerived(a);
  E.AsyncReconciliationEnrichment.onDerivedApplied(a);
  await wait(); await wait();
  assert.equal(runs, 1); assert.equal(refreshed, 1);
  const merged = E.AsyncReconciliationEnrichment.mergeApplicable(a, ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true }));
  assert.ok(F.buildFindings(merged).some(f => f.id === 'derived:test-domain:1:2'));
  assert.equal(F.buildFindings(ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true })).some(f => f.id === 'derived:test-domain:1:2'), true, 'reconciler merges the applicable result itself');
});

await check('20. a result arriving after a newer actor update is discarded and never displayed', async () => {
  E.AsyncReconciliationEnrichment.reset();
  const a = settleDerived(babActor());
  let release; const gate = new Promise(r => { release = r; });
  const adapter = async () => { await gate; return verdict(); };
  E.AsyncReconciliationEnrichment.ensureRequested(a, { adapters: [adapter], refresh: () => {} });
  a._stats.modifiedTime += 1; settleDerived(a);       // newer actor state while the adapter is still evaluating
  release(); await wait(); await wait();
  assert.equal(E.AsyncReconciliationEnrichment.getApplicable(a), null);
  assert.equal(F.buildFindings(ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true })).some(f => f.id.startsWith('derived:test-domain')), false);
});

await check('21. a settled result is re-validated at READ time (outdated findings are never shown as current)', async () => {
  E.AsyncReconciliationEnrichment.reset();
  const a = settleDerived(babActor());
  E.AsyncReconciliationEnrichment.ensureRequested(a, { adapters: [async () => verdict()], refresh: () => {} });
  await wait(); await wait();
  assert.ok(E.AsyncReconciliationEnrichment.getApplicable(a));
  a._stats.modifiedTime += 1;
  assert.equal(E.AsyncReconciliationEnrichment.getApplicable(a), null);
  const memoed = ProgressionReconciler.safeReconcileActor(a, { output: 'report' });
  assert.equal(F.buildFindings(memoed).some(f => f.id.startsWith('derived:test-domain')), false);
});

await check('22. a house-rule change while a calculation is pending invalidates the result', async () => {
  E.AsyncReconciliationEnrichment.reset();
  const original = HouseRuleService.getSafe;
  try {
    const a = babActor();
    E.AsyncReconciliationEnrichment.ensureRequested(a, { adapters: [async () => verdict()], refresh: () => {} }); // pending
    HouseRuleService.getSafe = (key, fb) => (key === 'talentEveryLevel' ? true : original.call(HouseRuleService, key, fb));
    settleDerived(a); E.AsyncReconciliationEnrichment.onDerivedApplied(a);
    await wait(); await wait();
    assert.equal(E.AsyncReconciliationEnrichment.getApplicable(a), null, 'rules signature changed since the request');
  } finally { HouseRuleService.getSafe = original; E.AsyncReconciliationEnrichment.reset(); }
});

await check('23. enrichment never mutates the actor; the diagnostic adapter can never raise a !', async () => {
  E.AsyncReconciliationEnrichment.reset();
  for (const settled of [false, true]) {
    const a = babActor(); if (settled) settleDerived(a);
    let writes = 0; a.update = () => { writes += 1; }; a.updateSource = () => { writes += 1; }; a.setFlag = () => { writes += 1; };
    const before = JSON.stringify([a.system, a.flags, a.items]);
    const [v] = await A.runAsyncDomainAdapters(a);
    E.AsyncReconciliationEnrichment.ensureRequested(a, { adapters: A.ASYNC_DOMAIN_ADAPTERS, refresh: () => {} });
    await wait(); await wait();
    assert.equal(v.domain, 'derived-preparation'); assert.notEqual(v.status, A.DOMAIN_STATUS.CONFIRMED_DISCREPANCY);
    assert.equal(v.status, settled ? A.DOMAIN_STATUS.VALID : A.DOMAIN_STATUS.UNVERIFIABLE);
    assert.equal(A.adapterToRow(v), null, 'diagnostics never become rows or findings');
    assert.equal(writes, 0); assert.equal(JSON.stringify([a.system, a.flags, a.items]), before);
  }
});

await check('24. no false ! during asynchronous preparation for a legitimate manual character; sheet reads request enrichment safely', () => {
  E.AsyncReconciliationEnrichment.reset();
  const a = pc({ fpMax: 6, refreshMax: 6 });
  const audit = ProgressionReconciler.safeReconcileActor(a, { output: 'sheet' });
  const derivedCodes = audit.validation.findings.filter(f => /^(BAB|DEFENSE|DERIVED|HP_LEDGER|FORCE_POINT)/.test(f.code));
  assert.equal(derivedCodes.length, 0);
});

await check('25. wiring (static)', () => {
  const sheet = fs.readFileSync(path.join(ROOT, 'scripts/sheets/v2/character-like-sheet.js'), 'utf8');
  assert.match(sheet, /actorRevision: \(actor\) => actor\?\._stats\?\.modifiedTime/);
  assert.match(sheet, /e\.code = 'STALE_VALUE'/);
  assert.match(sheet, /findFindings: \(actor\) => this\._freshReconciliationActionables\(actor\)/);
  const src = fs.readFileSync(path.join(ROOT, 'scripts/apps/progression-framework/shell/reconciliation/domain-adapters.js'), 'utf8');
  assert.doesNotMatch(src, /calculateMaxForcePoints\(|updateActorForcePoints|\.setFlag\(|\.update\(/);
  const base = fs.readFileSync(path.join(ROOT, 'scripts/actors/v2/base-actor.js'), 'utf8');
  assert.match(base, /announceDerivedApplied\(this, signature\)/);
  const editor = fs.readFileSync(path.join(ROOT, 'scripts/sheets/v2/character-sheet/resource-editor.js'), 'utf8');
  assert.match(editor, /game\?\.user\?\.isGM === true/); assert.match(editor, /buildOverrideUpdate\('forcePointsMax'/);
  const tpl = fs.readFileSync(path.join(ROOT, 'templates/shell/partials/shell-overlay-layer.hbs'), 'utf8');
  assert.match(tpl, /Optional \(not an error\)/);
});

console.log('reconciliation-domain-adapters.test.mjs: all assertions passed');
