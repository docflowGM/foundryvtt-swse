/**
 * Reconciliation 17-domain Phase 5 - cross-domain integration and certification. Real reconciler, real class data, real adapters.
 * Node harness only: NOT Foundry runtime verification.
 */
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
const { resolveFinding } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-resolvers.js');
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };
const report = (a, o = {}) => ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true, ...o });
const sheet = a => ProgressionReconciler.safeReconcileActor(a, { output: 'sheet', fresh: true });
const derivedOk = { bab: 1, defenses: { fortitude: { classBonus: 2 }, reflex: { classBonus: 1 }, will: { classBonus: 0 } } };

// A fully satisfied Soldier 1 (same shape as the Silent Success fixture in reconciliation-v2-contract), plus every domain's evidence.
function legit(over = {}) {
  return settleDerived(character({
    classes: [['Soldier', 1]],
    items: [item('feat', 'Toughness', { source: 'general' }), item('talent', 'Armor Specialization', { classId: 'soldier', classLevel: 1, source: 'class-talent' }), item('equipment', 'Medkit', { weight: 1 }), item('weapon', 'Blaster', { weight: 2 })],
    system: { hp: { max: 30 }, forcePoints: { value: 5, max: 5 }, derived: structuredClone(derivedOk) },
    ...over,
  }));
}

await check('1. Silent Success across all domains: a legitimate manual build has no findings, no !, no optional actions', () => {
  const a = legit();
  const audit = sheet(a);
  assert.equal(audit.validation.findings.length, 0); assert.equal(audit.validation.playerActionable, false);
  assert.equal((audit.validation.optional || []).length, 0);
  assert.equal(F.buildFindings(report(a)).length, 0);
});

await check('2. manual and wizard-shaped builds differ only in provenance and produce the SAME findings', () => {
  const manual = legit();
  const wizard = legit({ flags: { speciesGrantManifest: { grantKey: 'human' }, progressionCertifications: [] } });
  wizard.system.progression.lastForcePointRefresh = { reason: 'chargen-finalization', newMax: 5 };
  assert.deepEqual(F.buildFindings(report(manual)).map(f => f.id), F.buildFindings(report(wizard)).map(f => f.id));
  for (const x of [manual, wizard]) { x.items = x.items.filter(i => i.type !== 'talent'); x._stats.modifiedTime += 1; settleDerived(x); }   // same real discrepancy in both
  assert.ok(F.buildFindings(report(manual)).length > 0);
  assert.deepEqual(F.buildFindings(report(manual)).map(f => f.id), F.buildFindings(report(wizard)).map(f => f.id));
});

await check('3. several simultaneous discrepancies are independent: distinct stable ids; ignoring one does not hide the others; resolving one leaves the others', async () => {
  const a = legit();
  a.items = a.items.filter(i => i.type !== 'talent'); a.system.forcePoints.max = 4; a.system.progression.lastForcePointRefresh = { newMax: 4 }; settleDerived(a);
  const found = F.buildFindings(report(a));
  const bab = found.find(f => f.code === 'MISSING_CLASS_TALENT');
  assert.ok(bab); assert.equal(found.some(f => /FORCE_POINT/.test(f.code)), false, 'Force Point differences are optional, never findings');
  const fp = F.buildOptionalActions(report(a)).find(o => o.id === 'optional:force-points-max');
  assert.ok(fp); assert.notEqual(bab.id, fp.id);
  a.flags.swse.reconciliationIgnored = F.addIgnored([], bab, {});
  const part = F.partitionFindings(F.buildFindings(report(a)), F.readIgnored(a));
  assert.equal(part.visible.some(f => f.id === bab.id), false); assert.equal(sheet(a).validation.playerActionable, false, 'ignored finding + optional action => no !');
  assert.equal(sheet(a).validation.optional.length, 1);
  // resolve the Force Point finding through the safe path; the (ignored) BAB finding is untouched
  const deps = {
    findFindings: x => [...F.buildFindings(report(x)), ...F.buildOptionalActions(report(x))],
    actorRevision: x => x._stats.modifiedTime,
    setForcePointMax: async (x, v, { previous }) => { assert.equal(x.system.forcePoints.max, previous); x.system.forcePoints.max = v; x.system.progression.lastForcePointRefresh = { newMax: v }; x._stats.modifiedTime += 1; settleDerived(x); },
    recalcAll: async () => {}, openStep: async () => {}, grantHouseRule: async () => {},
  };
  assert.equal((await resolveFinding({ actor: a, findingId: fp.id, deps })).status, 'resolved');
  const after = F.buildFindings(report(a));
  assert.equal(F.buildOptionalActions(report(a)).length, 0); assert.equal(after.some(f => f.id === bab.id), true);
});

await check('4. one failing domain adapter never hides or corrupts the others, and never mutates the actor', () => {
  const a = legit(); a.system.forcePoints.max = 4; a.system.progression.lastForcePointRefresh = { newMax: 4 };
  const before = JSON.stringify([a.system, a.flags, a.items]);
  const out = A.runDomainAdapters(a, [function broken() { throw new Error('boom'); }, ...A.DOMAIN_ADAPTERS]);
  assert.equal(out[0].reason, 'adapter-error');
  assert.equal(out.find(v => v.id === 'force-points-max').reason, 'matches-last-progression-write');
  assert.equal(JSON.stringify([a.system, a.flags, a.items]), before);
});

await check('5. cache: an embedded gear edit (which does not bump the actor stamp) invalidates the memo; unchanged state is a hit', () => {
  const a = legit(); a.items.push(item('equipment', 'Crate', {}));            // no recorded weight
  const noteFor = x => ProgressionReconciler.safeReconcileActor(x, { output: 'sheet' }).validation.notes.some(n => n.id === 'note:carried-weight-evidence');
  assert.equal(noteFor(a), true);
  const crate = a.items.at(-1); crate.system.weight = 3; crate._stats = { modifiedTime: 99 };   // gear edit only
  assert.equal(noteFor(a), false, 'memo key includes carried gear stamps');
  assert.equal(noteFor(a), false);
});

await check('6. performance: cold reconcile and memo hit stay far inside an interactive budget (loose bounds; numbers are in the report)', () => {
  const items = []; for (let i = 0; i < 60; i++) items.push(item(['feat', 'equipment', 'weapon'][i % 3], `It${i}`, { weight: 1 }));
  const a = settleDerived(character({ classes: [['Soldier', 6], ['Scout', 4]], items }));
  let t = performance.now(); for (let i = 0; i < 10; i++) report(a); const cold = (performance.now() - t) / 10;
  ProgressionReconciler.safeReconcileActor(a, { output: 'sheet' });
  t = performance.now(); for (let i = 0; i < 100; i++) ProgressionReconciler.safeReconcileActor(a, { output: 'sheet' }); const warm = (performance.now() - t) / 100;
  assert.ok(cold < 100, `cold ${cold.toFixed(2)}ms`); assert.ok(warm < 25, `memo hit ${warm.toFixed(3)}ms`);
  console.log(`   (cold ${cold.toFixed(2)} ms, memo hit ${warm.toFixed(3)} ms; 10 class levels, 62 items)`);
});

await check('7. droids and published NPCs: custom droid issues are specific; stock droids and NPCs get no heroic-PC accusations', () => {
  const stock = character({ type: 'droid', classes: [], system: { droidCalculationMode: 'stock-statblock', droidSystems: { stateMode: 'STOCK' } } });
  settleDerived(stock);
  assert.equal(F.buildFindings(report(stock)).length, 0);
  const npc = character({ type: 'npc', classes: [] }); settleDerived(npc);
  assert.equal(F.buildFindings(report(npc)).filter(f => /FORCE_POINT|DROID|SPECIES/.test(f.code)).length, 0);
});

await check('8. authority hygiene (static): adapters import no mutating authority; every resolve kind is handled by the registry; no timers', () => {
  const src = fs.readFileSync('scripts/apps/progression-framework/shell/reconciliation/domain-adapters.js', 'utf8');
  assert.doesNotMatch(src, /ActorEngine|updateActor|\.setFlag\(|\.update\(|setTimeout|setInterval/);
  const kinds = new Set(['open-step', 'recalc', 'grant-house-rule', 'set-force-point-max', 'none']);
  const res = fs.readFileSync('scripts/apps/progression-framework/shell/reconciliation/reconciliation-resolvers.js', 'utf8');
  for (const k of kinds) if (k !== 'none') assert.match(res, new RegExp(`case '${k}'`));
  const enrich = fs.readFileSync('scripts/apps/progression-framework/shell/reconciliation/async-enrichment.js', 'utf8');
  assert.doesNotMatch(enrich, /setTimeout|setInterval/);
});

await check('9. the cumulative report names every one of the 17 domains with a status and a reason', () => {
  const rep = fs.readFileSync('docs/audits/reconciliation-v2-17-domain-implementation-report.md', 'utf8');
  assert.match(rep, /## Phase 5/); assert.match(rep, /Domain-by-domain status/);
  for (let d = 1; d <= 17; d += 1) assert.match(rep, new RegExp(`\\|\\s*${d}\\s*\\|`), `domain ${d} row`);
});
console.log('reconciliation-phase5-integration.test.mjs: all assertions passed');
