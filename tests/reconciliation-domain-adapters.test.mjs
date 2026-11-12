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

function pc({ classes = [['Soldier', 3]], fpMax, fpValue = fpMax, items = [], type = 'character', flags = {}, level } = {}) {
  const total = classes.reduce((n, [, l]) => n + l, 0);
  return {
    id: `a${++seq}`, name: 'Fixture', type, flags: { swse: flags }, _stats: { modifiedTime: seq },
    items: [...classes.map(([n, l]) => cls(n, l)), ...items],
    system: {
      level: level ?? total, hp: { max: 30 }, attributes: { con: { base: 10 } },
      forcePoints: { value: fpValue, max: fpMax },
      progression: { classLevels: classes.map(([n, l]) => row(n, l)) },
    },
    getFlag(scope, key) { return this.flags?.[scope === 'swse' ? 'swse' : scope]?.[key]; },
  };
}
const R = new ProgressionReconciler();
const report = a => R.reconcileActor(a, {});
const fpRow = a => report(a).derivedStats.rows.find(r => r.id === 'force-points-max');
const fpFinding = a => F.buildFindings(report(a)).find(f => f.code === 'FORCE_POINT_MAX_MISMATCH');
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };

await check('1. valid base-class character: Force Point max is VALID and silent', () => {
  const a = pc({ fpMax: 6 }); // 5 + floor(3/2)
  assert.equal(fpRow(a).status, 'ok'); assert.equal(fpRow(a).needsAttention, false);
  assert.equal(fpFinding(a), undefined);
});

await check('2. confirmed mismatch: one finding with expected / actual and the canonical authority', () => {
  const f = fpFinding(pc({ fpMax: 5 }));
  assert.ok(f); assert.equal(f.expected, 6); assert.equal(f.actual, 5);
  assert.match(f.id, /^derived:force-points-max:6:5$/);
  assert.equal(f.resolve.kind, 'set-force-point-max'); assert.equal(f.resolve.dataset.value, 6);
  assert.equal(f.ignorable, true);
});

await check('3. Force Point feat bonus (Force Boon +3) is honored by the canonical formula', () => {
  assert.equal(fpRow(pc({ fpMax: 9, items: [forceBoon()] })).status, 'ok');
  assert.equal(fpFinding(pc({ fpMax: 6, items: [forceBoon()] })).expected, 9);
});

await check('4. prestige base 6 and Force-Disciple-style base 7 are applied; persisted high-water flag raises the base', () => {
  assert.equal(fpRow(pc({ classes: [['Soldier', 2], ['Gunslinger', 2]], fpMax: 8 })).status, 'ok'); // 6 + 2
  assert.equal(fpRow(pc({ classes: [['Soldier', 4], ['Jedi Master', 2]], fpMax: 10 })).status, 'ok'); // 7 + 3
  assert.equal(fpRow(pc({ fpMax: 7, flags: { hasPrestigeFPBonus: true } })).status, 'ok', 'once unlocked the bonus persists');
});

await check('5. spent Force Points are never an error; value above max is not this domain\'s finding', () => {
  assert.equal(fpFinding(pc({ fpMax: 6, fpValue: 0 })), undefined);
  assert.equal(fpFinding(pc({ fpMax: 6, fpValue: 99 })), undefined);
});

await check('6. non-characters are NOT_APPLICABLE: no row, no finding', () => {
  for (const type of ['npc', 'droid', 'vehicle']) {
    const a = pc({ fpMax: 1, type });
    assert.equal(A.forcePointMaxAdapter(a).status, A.DOMAIN_STATUS.NOT_APPLICABLE);
    assert.equal(A.adapterToRow(A.forcePointMaxAdapter(a)), null);
  }
});

await check('7. missing evidence is UNVERIFIABLE, never an error', () => {
  const noMax = pc({ fpMax: undefined }); noMax.system.forcePoints = {};
  assert.equal(A.forcePointMaxAdapter(noMax).status, A.DOMAIN_STATUS.UNVERIFIABLE);
  const unknownClass = pc({ classes: [['Mystery Class', 3]], fpMax: 99 });
  assert.notEqual(A.forcePointMaxAdapter(unknownClass).status, A.DOMAIN_STATUS.CONFIRMED_DISCREPANCY);
  const conflict = pc({ fpMax: 99 }); conflict.system.progression.classLevels = [row('Soldier', 2)];
  assert.notEqual(A.forcePointMaxAdapter(conflict).status, A.DOMAIN_STATUS.CONFIRMED_DISCREPANCY, 'class record conflict is domain 2, not an FP accusation');
  const levelConflict = pc({ fpMax: 99, level: 9 });
  assert.equal(A.forcePointMaxAdapter(levelConflict).status, A.DOMAIN_STATUS.UNVERIFIABLE);
});

await check('8. multiclass sums levels across classes', () => {
  assert.equal(fpRow(pc({ classes: [['Soldier', 3], ['Scout', 3]], fpMax: 8 })).status, 'ok'); // 5 + 3
});

await check('9. the adapter is read-only: no flag write, no mutation, repeated runs identical', () => {
  const a = pc({ classes: [['Soldier', 2], ['Gunslinger', 2]], fpMax: 1 });
  let writes = 0;
  a.setFlag = () => { writes += 1; }; a.update = () => { writes += 1; }; a.updateSource = () => { writes += 1; };
  const before = JSON.stringify(a.system) + JSON.stringify(a.flags);
  const v1 = A.forcePointMaxAdapter(a), v2 = A.forcePointMaxAdapter(a);
  report(a);
  assert.equal(writes, 0, 'calculateMaxForcePoints would have set a flag; the build-plan variant must not');
  assert.equal(JSON.stringify(a.system) + JSON.stringify(a.flags), before);
  assert.deepEqual(v1, v2);
});

await check('10. a throwing adapter is isolated: UNVERIFIABLE diagnostics, report still produced, nothing corrupted', () => {
  const boom = function boomAdapter() { throw new Error('boom'); };
  const out = A.runDomainAdapters(pc({ fpMax: 6 }), [boom, A.forcePointMaxAdapter]);
  assert.equal(out[0].status, A.DOMAIN_STATUS.UNVERIFIABLE); assert.equal(out[0].reason, 'adapter-error');
  assert.equal(out[1].status, A.DOMAIN_STATUS.VALID);
  assert.equal(A.adapterToRow(out[0]).needsAttention, false);
});

await check('11. Resolve calls the injected canonical writer once with the verified value; idempotent; unchanged is reported honestly', async () => {
  const a = pc({ fpMax: 5 });
  const calls = [];
  const deps = {
    findFindings: x => F.buildFindings(report(x)),
    setForcePointMax: async (x, v) => { calls.push(v); x.system.forcePoints.max = v; x._stats.modifiedTime += 1; },
    recalcAll: async () => {}, openStep: async () => {}, grantHouseRule: async () => {},
  };
  const id = fpFinding(a).id;
  const first = await resolveFinding({ actor: a, findingId: id, deps });
  assert.equal(first.status, 'resolved'); assert.deepEqual(calls, [6]);
  const second = await resolveFinding({ actor: a, findingId: id, deps });
  assert.equal(second.status, 'already-resolved'); assert.equal(calls.length, 1, 'second click writes nothing');
  const b = pc({ fpMax: 5 });
  const noop = await resolveFinding({ actor: b, findingId: fpFinding(b).id, deps: { ...deps, setForcePointMax: async () => {} } });
  assert.equal(noop.status, 'unchanged');
});

await check('12. Ignore persists, and a materially changed discrepancy is a NEW finding', () => {
  const a = pc({ fpMax: 5 });
  const f = fpFinding(a);
  a.flags.swse.reconciliationIgnored = F.addIgnored([], f, {});
  const part = F.partitionFindings(F.buildFindings(report(a)), F.readIgnored(a));
  assert.equal(part.visible.filter(x => x.code === 'FORCE_POINT_MAX_MISMATCH').length, 0);
  assert.equal(part.ignored.length, 1);
  // level 3 -> 4: expected changes (6 -> 7), so the old ignore no longer matches
  a.system.level = 4; a.items[0].system.level = 4; a.system.progression.classLevels = [row('Soldier', 4)]; a._stats.modifiedTime += 1;
  const next = F.buildFindings(report(a)).find(x => x.code === 'FORCE_POINT_MAX_MISMATCH');
  assert.equal(next.expected, 7); assert.notEqual(next.id, f.id);
  assert.equal(F.partitionFindings([next], F.readIgnored(a)).visible.length, 1);
});

await check('13. Silent Success: a fully consistent character has no Force Point row needing attention and no finding', () => {
  const a = pc({ fpMax: 6 });
  assert.equal(report(a).derivedStats.rows.some(r => r.id === 'force-points-max' && r.needsAttention), false);
  assert.equal(F.buildFindings(report(a)).some(f => f.code === 'FORCE_POINT_MAX_MISMATCH'), false);
});

await check('14. wiring (static): sheet routes Resolve through ActorEngine.updateActor; adapters import no mutating authority', () => {
  const sheet = fs.readFileSync(path.join(ROOT, 'scripts/sheets/v2/character-like-sheet.js'), 'utf8');
  assert.match(sheet, /setForcePointMax: \(actor, value\) => ActorEngine\.updateActor\(actor, \{ 'system\.forcePoints\.max': value \}/);
  const src = fs.readFileSync(path.join(ROOT, 'scripts/apps/progression-framework/shell/reconciliation/domain-adapters.js'), 'utf8');
  assert.doesNotMatch(src, /calculateMaxForcePoints\(|updateActorForcePoints|\.setFlag\(|\.update\(/);
});

console.log('reconciliation-domain-adapters.test.mjs: all assertions passed');
