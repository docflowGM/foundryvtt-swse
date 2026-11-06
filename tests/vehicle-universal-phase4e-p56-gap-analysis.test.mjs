/**
 * Validation of the Gap Consolidation and Owner Decision Report (ANALYSIS ONLY): the report and its companion JSON are reproducible from the repository inputs,
 * every blocked stock group is represented exactly once, the counts reconcile with the committed coverage audit and the owner's baseline, overlapping blocker
 * counts are never summed, every aftermarket row is accounted for, certified-unarmed vehicles are never counted as missing support, and the owner docket is
 * PENDING with scopes that point at real blocked groups. The test changes nothing; it also pins that the analysis tool wrote no canonical data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const J = f => JSON.parse(readFileSync(f, 'utf8'));
const A = J('data/audits/vehicles/vehicle-100-percent-completion-analysis.json');
const COV = J('data/audits/vehicles/stock-weapon-coverage.json');
const UNARMED = J('data/audits/vehicles/unarmed-vehicle-certification.json');
const CATALOG = J('data/vehicle-modifications/weapon-systems.json');
const REPORT = readFileSync('docs/audits/vehicles/vehicle-100-percent-completion-analysis.md', 'utf8');

const allGroups = COV.vehicles.flatMap(v => v.groups.map(g => ({ ...g, vehicle: v.sourceEntryKey })));
const blockedCov = allGroups.filter(g => !g.offlineExecutable);

test('REPRODUCIBLE: the builder reports the report and JSON up to date', () => {
  const r = spawnSync(process.execPath, ['tools/audits/vehicles/build-vehicle-100-percent-analysis.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('BASELINE: HEAD counts equal the committed coverage audit; the difference from the owner baseline is exactly the eleven documented groups', () => {
  const h = A.baseline.head;
  assert.equal(h.vehicles, 429); assert.equal(h.groups, 846); assert.equal(h.groups, allGroups.length);
  assert.equal(h.executableGroups, COV.totals.offlineExecutableGroups);
  assert.equal(h.blockedGroups, blockedCov.length);
  assert.equal(h.executableGroups + h.blockedGroups, h.groups);
  assert.equal(h.vehiclesWithExecutableGroup, COV.totals.vehiclesWithOfflineExecutableGroup);
  assert.equal(h.vehiclesFullyExecutable, COV.totals.vehiclesAllGroupsExecutable);
  const diff = Object.fromEntries(A.baseline.differences.map(d => [d.metric, d.difference]));
  assert.deepEqual(diff, { vehicles: 0, groups: 0, executableGroups: 11, blockedGroups: -11, vehiclesWithExecutableGroup: 1, vehiclesFullyExecutable: 5, aftermarketRows: 0, aftermarketInstallable: 0 });
  assert.equal(A.baseline.explanation.denominatorsChanged, false);
  assert.equal(A.baseline.explanation.groups.length, 11);
  for (const g of A.baseline.explanation.groups) { assert.ok(g.groupKey, 'the explaining group exists'); assert.equal(allGroups.find(x => x.groupKey === g.groupKey)?.offlineExecutable, true); }
  assert.equal(A.metrics.distinctions.liveVerifiedGroups, 0);
});

test('CENSUS: every blocked group appears exactly once and nothing executable appears', () => {
  const keys = A.blockedGroups.map(b => b.groupKey);
  assert.equal(new Set(keys).size, keys.length, 'no duplicates');
  assert.deepEqual([...keys].sort(), blockedCov.map(g => g.groupKey).sort());
  for (const b of A.blockedGroups) {
    assert.equal(b.executable, false);
    assert.ok(b.causes.length >= 1, `${b.groupKey} has at least one cause`);
    assert.ok(b.refusalCodes.length >= 1);
    for (const c of b.causes) {
      assert.ok('ABCDEFG'.includes(c.rootCause), `${b.groupKey}: root cause ${c.rootCause}`);
      assert.ok(c.classes.length >= 1 && c.classes.every(x => A.classes.includes(x)), `${b.groupKey}: classification`);
      assert.ok(A.sourceStatuses.includes(c.sourceStatus), `${b.groupKey}: source status`);
      assert.ok(c.rationale && c.engine && c.whatWouldUnlockIt, `${b.groupKey}: ${c.code} carries rationale, mechanic status and unlock path`);
    }
    // multiple blockers are preserved: every blocking code is represented
    for (const code of b.blockingCodes) assert.ok(b.causes.some(c => c.code === code), `${b.groupKey}: ${code}`);
  }
});

test('REFUSAL CODES: per-code group counts reconcile with the coverage audit (the umbrella and mode reasons are explained, never dropped)', () => {
  const tally = {};
  for (const b of A.blockedGroups) for (const c of b.refusalCodes) tally[c] = (tally[c] ?? 0) + 1;
  assert.deepEqual(tally, COV.refusalReasons);
  for (const b of A.blockedGroups) {
    const listed = new Set([...b.blockingCodes, ...b.nonBlockingModeReasons, 'STOCK_AMMUNITION_LIMITED_UNTRACKED']);
    for (const c of b.refusalCodes) assert.ok(listed.has(c), `${b.groupKey}: ${c} is either blocking, a non-blocking mode reason or the umbrella`);
  }
});

test('OVERLAPS: gross counts exceed the distinct group count and are never presented as additive; sole-blocker counts partition', () => {
  const gross = A.sharedBlockers.reduce((n, s) => n + s.grossGroups, 0);
  assert.ok(gross > A.blockedGroups.length, 'gross cause counts overlap');
  const solo = A.sharedBlockers.reduce((n, s) => n + s.soleBlockerGroups, 0);
  assert.equal(solo, A.blockedGroups.filter(b => b.causeKeys.length === 1).length, 'sole-blocker groups are counted once each');
  for (const s of A.sharedBlockers) {
    assert.ok(s.soleBlockerGroups <= s.immediatelyUnlockedGroups + 0 && s.immediatelyUnlockedGroups <= s.grossAffectedGroups);
    assert.equal(s.grossAffectedGroups, s.grossGroups);
    assert.ok(s.vehiclesBecomingFullyExecutable <= s.vehiclesGainingAnyGroup);
  }
  for (const p of A.packages) assert.ok(p.result.immediatelyUnlockedGroups <= p.result.grossAffectedGroups, p.id);
  const last = A.greedyPath.filter(s => s.step).at(-1);
  assert.equal(last.cumulativeGroups + A.greedyPath.find(s => s.note).groupsStillBlocked, A.blockedGroups.length);
});

test('VEHICLES: the 429 are classified exactly once; certified-unarmed vehicles are excluded from the armed denominator and have no stock groups', () => {
  assert.equal(A.vehicleIdentities.length, 429);
  assert.equal(new Set(A.vehicleIdentities.map(v => v.sourceEntryKey)).size, 429);
  assert.equal(Object.values(A.vehicleClassCounts).reduce((a, b) => a + b, 0), 429);
  assert.equal(A.vehicleClassCounts.UNARMED_CONFIRMED, UNARMED.counts.UNARMED_CONFIRMED);
  assert.equal(A.vehicleClassCounts.ARMED_RECORD_GAP, UNARMED.counts.ARMED_RECORD_GAP);
  const armed = A.vehicleIdentities.filter(v => v.class !== 'UNARMED_CONFIRMED');
  assert.equal(armed.length, COV.totals.armedVehicles);
  assert.equal(armed.filter(v => v.executableGroups > 0).length, COV.totals.armedVehiclesWithExecutableGroup);
  assert.equal(armed.filter(v => v.class === 'ARMED_FULLY_EXECUTABLE').length, COV.totals.armedVehiclesFullyExecutable);
  for (const v of A.vehicleIdentities.filter(x => x.class === 'UNARMED_CONFIRMED')) {
    assert.equal(v.groups, 0, `${v.sourceEntryKey} is unarmed and has no group`);
    assert.ok(!A.blockedGroups.some(b => b.vehicleKey === v.sourceEntryKey), 'an unarmed vehicle is never counted as missing weapon support');
  }
});

test('AFTERMARKET: all 63 catalog rows are accounted for exactly once, with the original 30 installable', () => {
  assert.equal(A.aftermarketRows.length, 63);
  assert.deepEqual(A.aftermarketRows.map(r => r.catalogId).sort(), CATALOG.map(c => c.id).sort());
  assert.equal(A.aftermarketRows.filter(r => r.installable).length, 30);
  assert.equal(A.baseline.head.aftermarketRows, 63);
  assert.equal(A.aftermarketRows.filter(r => r.category === 'Ammunition' && r.installable).length, 0, 'ammunition rows are consumables, never installable components');
  for (const r of A.aftermarketRows) assert.ok(r.rowClass && r.why);
});

test('FAMILIES: every stock group is owned by exactly one partition family or reported as unclassified', () => {
  const owned = A.families.filter(f => f.isPartitionOwner).reduce((n, f) => n + f.stockGroups, 0);
  assert.equal(owned + A.unclassifiedStock.groups, 846);
});

test('DOCKET: every decision is PENDING, recommends nothing as authority, and its scope names real blocked groups', () => {
  assert.ok(A.docket.length >= 1 && A.docket.length <= 8, 'smallest practical docket');
  const blocked = new Set(A.blockedGroups.map(b => b.groupKey));
  const ids = A.docket.map(d => d.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const d of A.docket) {
    assert.match(d.id, /^V100-\d\d$/);
    assert.equal(d.ownerRuling, 'PENDING');
    assert.ok(d.options.length >= 2 && d.unlockEstimates.length === d.options.length);
    assert.ok(d.scope.groupKeys.every(k => blocked.has(k)), `${d.id} scope`);
    assert.match(d.recommended, /recommendation|Labelled/i);
    for (const e of d.unlockEstimates) assert.ok(e.immediatelyUnlockedGroups <= e.grossAffectedGroups);
  }
  assert.ok(REPORT.includes('Owner ruling: PENDING'));
});

test('REPORT: all nine parts are present and the report states it stopped at the owner gate without claiming live verification', () => {
  for (const part of ['Part I -', 'Part II -', 'Part III -', 'Part IV -', 'Part V -', 'Part VI -', 'Part VII -', 'Part VIII -', 'Part IX -']) assert.ok(REPORT.includes(`## ${part}`), part);
  assert.ok(/STOPPED AT THE OWNER DECISION GATE/.test(REPORT));
  assert.ok(/LIVE_VERIFIED\s*\|\s*0/.test(REPORT));
  assert.ok(/100% canonical is \*\*not promised\*\*/.test(REPORT));
});

test('NO CANONICAL CHANGE: the analysis tools never write canonical data, gates or house rules', () => {
  for (const f of ['tools/audits/vehicles/build-vehicle-100-percent-analysis.mjs', 'tools/audits/vehicles/lib/analysis-report-md.mjs', 'tools/audits/vehicles/lib/statblock-locator.mjs']) {
    const src = readFileSync(f, 'utf8');
    const writes = [...src.matchAll(/writeFileSync\(([^,)]+)/g)].map(m => m[1].trim());
    for (const w of writes) assert.ok(/^OUT_(JSON|MD)$/.test(w), `${f} writes only its own report outputs (${w})`);
  }
});
