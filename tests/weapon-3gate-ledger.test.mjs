import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildLedger, OUT_JSON } from '../tools/audit-weapon-v2-3gate-field-consumers.mjs';

// Weapon three-gate Gate A/B ledger invariants (no false green): the committed ledger is current, every census path has a disposition,
// no DIRECT_CONSUMER claim lacks a verified consumer probe, and every ORPHANED field / operation key is itemized (never silent).
const DISPOSITIONS = new Set(['DIRECT_CONSUMER', 'CONSUMED_VIA_DUPLICATE', 'PARTIAL_CONSUMER', 'DISPLAY_ONLY', 'VALIDATION_ONLY', 'GM_ADJUDICATED', 'BLOCKED_BY_SUBSYSTEM', 'SOURCE_UNRESOLVED', 'ORPHANED']);
const ledger = buildLedger();

test('ledger is current with its inputs', () => {
  assert.equal(JSON.stringify(ledger, null, 2) + '\n', fs.readFileSync(OUT_JSON, 'utf8'), 'run: node tools/audit-weapon-v2-3gate-field-consumers.mjs');
});
test('every census path is present exactly once with an allowed disposition', () => {
  const census = JSON.parse(fs.readFileSync('data/audits/weapon-phase-5b-schema-field-census.json', 'utf8'));
  assert.equal(ledger.fields.length, census.fields.length);
  assert.equal(new Set(ledger.fields.map((f) => `${f.namespace}:${f.fieldPath}`)).size, census.fields.length);
  for (const f of ledger.fields) assert.ok(DISPOSITIONS.has(f.disposition), `${f.fieldPath}: ${f.disposition}`);
});
test('no executable DIRECT_CONSUMER / duplicate claim has an unverified consumer probe', () => {
  for (const f of ledger.fields) if (f.role === 'EXECUTION' && ['DIRECT_CONSUMER', 'CONSUMED_VIA_DUPLICATE'].includes(f.disposition) && f.consumer) assert.notEqual(f.evidenceStatus, 'NOT_PROVEN', f.fieldPath);
});
test('reconciled families name a real consumer and a real test', () => {
  for (const id of ledger.summary.familiesReconciledAgainstCurrentCode) {
    const fam = ledger.families[id];
    assert.equal(fam.reconciled, true);
    if (fam.consumer) { assert.notEqual(fam.evidenceStatus, 'NOT_PROVEN', id); assert.ok(fam.behaviorTest && fs.existsSync(fam.behaviorTest), id); }
    else assert.ok(fam.blockingDecision, `${id}: blocked families name the missing subsystem`);
  }
});
test('orphans are itemized, never silent: every ORPHANED field and operation key is listed in the summary / key table', () => {
  assert.deepEqual(ledger.summary.orphanedFields, ledger.fields.filter((f) => f.disposition === 'ORPHANED').map((f) => f.fieldPath));
  assert.equal(ledger.operationKeys.length, 41);
  for (const k of ledger.operationKeys) { assert.ok(DISPOSITIONS.has(k.disposition)); if (k.disposition === 'ORPHANED') assert.deepEqual(k.productionReferences, [], `${k.key} claims no consumer but one exists`); }
});
