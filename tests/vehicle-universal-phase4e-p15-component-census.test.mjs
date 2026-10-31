import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const load = p => JSON.parse(readFileSync(p, 'utf8'));
const DIR = 'data/audits/vehicles/p6a';

test('the census outputs are reproducible from the pinned OCR, sources and catalog (--check)', () => {
  execFileSync(process.execPath, ['tools/audits/vehicles/build-p6a-component-census.mjs', '--check'], { stdio: 'pipe' });
  execFileSync(process.execPath, ['tools/audits/vehicles/apply-p6a-corrections.mjs', '--check'], { stdio: 'pipe' });
});

test('all 14 sourcebooks examined; every curated entry anchored in its OCR text', () => {
  const reg = load(`${DIR}/registry.json`);
  assert.equal(Object.keys(reg.books).length, 14);
  for (const b of Object.values(reg.books)) { assert.match(b.status, /^EXAMINED/); assert.match(b.sha256, /^[0-9a-f]{64}$/); }
  for (const e of reg.entries.filter(e => e.origin === 'p6a-curated' || e.origin === 'p6a-heading')) assert.ok(e.anchors.length > 0, e.censusId);
  assert.equal(new Set(reg.entries.map(e => e.censusId)).size, reg.entries.length, 'no duplicate identities');
});

test('every one of the 187 catalog records has exactly one documented disposition', () => {
  const r = load(`${DIR}/reconciliation.json`);
  const catalog = ['movement-systems', 'defense-systems', 'weapon-systems', 'accessories'].flatMap(f => load(`data/vehicle-modifications/${f}.json`));
  assert.equal(catalog.length, 187);
  assert.deepEqual(r.records.map(x => x.catalogId).sort(), catalog.map(c => c.id).sort());
  const allowed = ['MATCHED_CANONICAL', 'CORRECTION_REQUIRED', 'DUPLICATE_OR_ALIAS', 'WRONG_SOURCE_IDENTITY', 'NOT_FOUND_IN_SOURCE', 'UNRESOLVED_SOURCE', 'NONCANONICAL_HOMEBREW'];
  for (const x of r.records) assert.ok(allowed.includes(x.disposition), x.catalogId);
  // what remains CORRECTION_REQUIRED is only what needs the PDF (never auto-applied)
  for (const x of r.records.filter(x => x.disposition === 'CORRECTION_REQUIRED')) assert.equal(x.applyStatus, 'PDF_CONFIRMATION_REQUIRED', x.catalogId);
  for (const x of r.records.filter(x => x.disposition === 'NOT_FOUND_IN_SOURCE')) assert.ok(x.basis, x.catalogId);
});

test('confirmed corrections are applied with legacy evidence; statblock-only items are not presented as installable options', () => {
  const w = load('data/vehicle-modifications/weapon-systems.json');
  const row = id => w.find(x => x.id === id);
  assert.equal(row('discord-missile-launcher').sizeRestriction, 'Huge or Larger');
  assert.equal(row('mass-driver-cannon-heavy').sizeRestriction, 'Gargantuan or Larger');
  assert.equal(row('rail-cannon').sizeRestriction, 'Gargantuan or Larger');
  assert.equal(row('chaff-gun').availability, null, 'Galaxy at War prints no availability: unknown, not Common');
  assert.equal(row('chaff-gun').legacy.p6a.availability.value, 'Common');
  assert.equal(row('autoblaster').damage, null);
  const r = load(`${DIR}/reconciliation.json`).records;
  for (const id of ['harpoon-gun', 'ion-pulse-cannon', 'energy-bomblet-generator']) assert.equal(r.find(x => x.catalogId === id).basis, 'STATBLOCK_EQUIPMENT_ONLY');
});

test('missing canonical components are recorded separately (not added to production until certified)', () => {
  const r = load(`${DIR}/reconciliation.json`);
  const ids = r.missing.map(m => m.censusId);
  for (const id of ['sotg-concussion-missile-armor-piercing', 'sotg-cargo-pod-detachable', 'sotg-proton-launcher-capacity']) assert.ok(ids.includes(id), id);
  assert.equal(r.missing.find(m => m.censusId === 'sotg-cannon-triple').disposition, 'ALIAS_OF_EXISTING');
  const catalogIds = new Set(['movement-systems', 'defense-systems', 'weapon-systems', 'accessories'].flatMap(f => load(`data/vehicle-modifications/${f}.json`)).map(c => c.id));
  for (const id of ids) assert.equal(catalogIds.has(id), false);
});

test('certification ledger and readiness manifest never overstate operation', () => {
  const ledger = load(`${DIR}/certification-ledger.json`), ready = load(`${DIR}/readiness-manifest.json`);
  const cert = load('data/vehicle-modifications/certification.json').rows;
  for (const l of ledger.rows) {
    if (l.mechanicSpecified) { assert.ok(l.sourceVerified?.book && l.sourceVerified?.printedPage, l.catalogId); assert.equal(cert[l.catalogId].status, 'MECHANIC_SPECIFIED'); }
    if (l.operationallyIntegrated) assert.ok(l.mechanicSpecified, l.catalogId);
  }
  assert.equal(ledger.counts.mechanicSpecified, 39);
  assert.equal(ready.counts.combatUsable, 0);
  for (const r of ready.rows) { assert.equal(r.combatUsable, false); if (r.installable) assert.ok(cert[r.catalogId]?.status === 'MECHANIC_SPECIFIED'); }
  // atmospheric thrusters: certified but conditional -> not mechanically applied
  assert.equal(ready.rows.find(r => r.catalogId === 'atmospheric-thrusters').mechanicallyApplied, false);
});
