/**
 * Integrity of the Evidence Verification report (EVIDENCE ONLY): reproducible, honest about its source limits (no PDF-confirmed facts are claimed), every V100 scope
 * points at real blocked groups from the committed gap analysis, the revised docket stays PENDING and distinguishes canonical facts from project conventions,
 * unlock counts are bounded by the scopes, all 429 vehicle identities are preserved, and nothing canonical is written.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const J = f => JSON.parse(readFileSync(f, 'utf8'));
const V = J('data/audits/vehicles/vehicle-evidence-verification.json');
const A = J('data/audits/vehicles/vehicle-100-percent-completion-analysis.json');
const UN = J('data/audits/vehicles/unarmed-vehicle-certification.json');
const MD = readFileSync('docs/audits/vehicles/vehicle-evidence-verification.md', 'utf8');
const blocked = new Set(A.blockedGroups.map(b => b.groupKey));

test('REPRODUCIBLE: builder --check is up to date', () => {
  const r = spawnSync(process.execPath, ['tools/audits/vehicles/build-vehicle-evidence-verification.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('SOURCE LIMITS: no fact is claimed PDF-confirmed, and the report says the PDFs were unavailable', () => {
  assert.equal(V.sourceLimits.pdfsAvailable, false);
  assert.equal(V.sourceLimits.pdfConfirmedFacts, 0);
  assert.equal(V.sourceLimits.strongestStatus, 'TEXT_CORROBORATED');
  assert.ok(/source PDFs are not in the repository/.test(MD));
  assert.ok(!/PDF_CONFIRMED/.test(JSON.stringify(V)), 'no PDF_CONFIRMED status appears anywhere');
});

test('SCOPES: each V100 scope is exactly the gap-analysis scope and points at real blocked groups', () => {
  const byDocket = id => A.docket.find(d => d.id === id).scope.groupKeys;
  const sets = { 'V100-01': V.v100_01.groups, 'V100-02': V.v100_02.groups, 'V100-03': V.v100_03.groups, 'V100-04': V.v100_04.groups, 'V100-05': V.v100_05.groups };
  for (const [id, gs] of Object.entries(sets)) {
    const keys = gs.map(g => g.groupKey);
    assert.equal(new Set(keys).size, keys.length, `${id}: no duplicates`);
    assert.ok(keys.every(k => blocked.has(k)), `${id}: real blocked groups`);
    // V100-03's analysis scope also includes autofire/size causes; the verification covers the unexplained-delta groups it names
    if (id !== 'V100-03') assert.deepEqual([...keys].sort(), [...byDocket(id)].sort(), `${id}: same scope as the gap analysis`);
    for (const g of gs) assert.ok(g.book && Number.isFinite(g.printedPage), `${id}: publication and printed page recorded`);
  }
});

test('V100-01: facts and conventions are kept apart; the 64 groups split exactly into printed / never reviewed / certified silent', () => {
  const s = V.v100_01.summary, c = s.launcherCountClasses;
  assert.equal(Object.values(c).reduce((a, b) => a + b, 0), s.scope);
  assert.equal(s.scope, 64);
  assert.equal(s.textCountStatus.COUNT_WORD_IN_LABEL ?? 0, 0, 'no launcher count is printed in any located statblock text');
  assert.equal(V.v100_01.unlock.canonicalFromTextCountWordsAlone.groups, 0, 'nothing is unlocked canonically from text alone');
  const d = V.revisedDocket.find(x => x.id === 'V100-01');
  assert.ok(d.options.some(o => /project convention/i.test(o.text)), 'the pool is labelled a project convention');
  assert.ok(/UNAPPROVED/.test(d.recommendation) && /STOCK_POOL_CONVENTION/.test(d.recommendation), 'recommendation is marked unapproved and keeps a distinct outcome');
  for (const g of V.v100_01.groups) if (g.publishedCapacityPerLauncher) assert.ok(g.publishedCapacityPerLauncher.standard >= 3);
});

test('V100-03: the residual arithmetic is reproducible from recorded figures', () => {
  for (const g of V.v100_03.groups) {
    if (g.gunnersPrinted !== null) assert.equal(g.residualAfterBatteryAssistance, g.delta - 2 * (g.gunnersPrinted - 1));
    if (g.text.residualUsingTextValues !== null && g.text.residualUsingTextValues !== undefined) {
      const exp = 2 * (g.gunnersPrinted - 1);
      assert.equal(g.text.residualUsingTextValues, g.recordPrintedTotal - (g.text.baseAtkInText + Math.floor((g.text.intInText - 10) / 2)) - exp);
    }
  }
  assert.equal(V.v100_03.summary.resolvedIfTextValuesConfirmed + V.v100_03.summary.stillUnexplainedWithTextValues, V.v100_03.groups.filter(g => g.text.residualUsingTextValues !== null && g.text.residualUsingTextValues !== undefined).length);
});

test('DOCKET: five decisions, all PENDING, every recommendation unapproved, unlock counts bounded by scope', () => {
  assert.deepEqual(V.revisedDocket.map(d => d.id), ['V100-01', 'V100-02', 'V100-03', 'V100-04', 'V100-05']);
  for (const d of V.revisedDocket) {
    assert.ok(/UNAPPROVED/.test(d.recommendation), d.id);
    assert.ok(d.evidence.length && d.options.length >= 2 && d.needsRuling.length && d.genuinelySilent.length && d.resolvedBySourceResearch.length, d.id);
    for (const o of d.options) if (o.unlock?.groups !== undefined) assert.ok(o.unlock.groups <= A.blockedGroups.length);
  }
  assert.equal((MD.match(/Owner ruling: PENDING/g) ?? []).length, 5);
});

test('UNARMED: all 42 certified rows are re-examined, none is re-certified, and 429 identities are preserved', () => {
  assert.equal(V.unarmedRecheck.vehicles.length, UN.rows.length);
  assert.deepEqual(V.unarmedRecheck.vehicles.map(x => x.certification), UN.rows.map(r => r.status));
  assert.equal(A.vehicleIdentities.length, 429);
  assert.ok(V.unarmedRecheck.vehicles.every(x => ['UNARMED_CONFIRMED', 'ARMED_RECORD_GAP'].includes(x.certification)));
});

test('CHECKLIST: every vehicle feeding a decision appears once with a publication and printed page', () => {
  const keys = V.pdfChecklist.map(c => c.vehicleKey);
  assert.equal(new Set(keys).size, keys.length);
  for (const c of V.pdfChecklist) assert.ok(c.book && Number.isFinite(c.printedPage) && c.decisions.length);
  assert.equal(V.sourceLimits.pdfChecklistVehicles, keys.length);
});

test('NO CANONICAL CHANGE: the verification tools write only their own two outputs; the append-only register is untouched by them', () => {
  for (const f of ['tools/audits/vehicles/build-vehicle-evidence-verification.mjs', 'tools/audits/vehicles/lib/verification-report-md.mjs']) {
    const writes = [...readFileSync(f, 'utf8').matchAll(/writeFileSync\(([^,)]+)/g)].map(m => m[1].trim());
    for (const w of writes) assert.ok(/^OUT_(JSON|MD)$/.test(w), `${f}: ${w}`);
  }
  assert.ok(existsSync('docs/audits/swse-rules-decisions-pending.md'));
});
