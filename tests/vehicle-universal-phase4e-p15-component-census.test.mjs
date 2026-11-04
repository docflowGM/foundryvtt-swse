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
  for (const x of r.records.filter(x => x.disposition === 'CORRECTION_REQUIRED')) assert.ok(['PDF_CONFIRMATION_REQUIRED', 'SUPERSEDED_BY_PDF_RECONCILIATION'].includes(x.applyStatus), x.catalogId);
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
  const cert = { ...load('data/vehicle-modifications/certification-p6a.json').rows, ...load('data/vehicle-modifications/certification.json').rows };
  for (const l of ledger.rows) {
    if (l.mechanicSpecified) { assert.ok(l.sourceVerified?.book && l.sourceVerified?.printedPage, l.catalogId); assert.equal(cert[l.catalogId].status, 'MECHANIC_SPECIFIED'); }
    if (l.operationallyIntegrated) assert.ok(l.mechanicSpecified, l.catalogId);
  }
  assert.equal(ledger.counts.mechanicSpecified, 66, '54 effects + the 12 plain cannon/turbolaser rows (laser P6B weapon slice; blaster, ion and turbolaser WE-1)');
  // sensor arrays: specified and installable, but no runtime consumer reads vehicle Intelligence yet -> not applied
  for (const id of ['sensor-array-2', 'sensor-array-4', 'sensor-array-6']) {
    assert.equal(ready.rows.find(r => r.catalogId === id).installable, true, id);
    assert.equal(ready.rows.find(r => r.catalogId === id).mechanicallyApplied, false, id);
  }
  // combat-usable only for certified weapon specifications (V-P2-04 slice); firing still needs mount + Item + preflight
  // (laser cannons: P6B weapon slice; blaster cannons, ion cannons and turbolasers: WE-1)
  assert.deepEqual(ready.rows.filter(r => r.combatUsable).map(r => r.catalogId).sort(), ['blaster-cannon-heavy', 'blaster-cannon-light', 'blaster-cannon-medium',
    'ion-cannon-heavy', 'ion-cannon-light', 'ion-cannon-medium', 'laser-cannon-heavy', 'laser-cannon-light', 'laser-cannon-medium', 'turbolaser-heavy', 'turbolaser-light', 'turbolaser-medium']);
  for (const r of ready.rows) { if (r.installable) assert.ok(cert[r.catalogId]?.status === 'MECHANIC_SPECIFIED'); }
  assert.ok(ready.rows.find(r => r.catalogId === 'laser-cannon-light').reasons.includes('REQUIRES_CERTIFIED_MOUNT_OWNED_ITEM_AND_ATTACK_PREFLIGHT'));
  // atmospheric thrusters: applied since P6B-0 through the GM-set environment (only in an explicit atmosphere)
  assert.equal(ready.rows.find(r => r.catalogId === 'atmospheric-thrusters').mechanicallyApplied, true);
});

test('PDF authority: all 172 printed rows reconciled to catalog identities; corrections applied except errata checks', () => {
  const r = load(`${DIR}/pdf-reconciliation.json`);
  assert.equal(r.counts.pdfRows, 172);
  assert.equal(r.counts.pdfRowsUnmappedToCatalog, 0);
  assert.equal(r.records.length, 187);
  const by = id => r.records.find(x => x.catalogId === id);
  // V-P6A-05 (owner ruling): the three unusual printed SotG prices are adopted; old values kept in history
  const acc = load('data/vehicle-modifications/accessories.json');
  const price = id => acc.find(a => a.id === id);
  assert.deepEqual(['cloaking-stygium', 'hangar-bay', 'hangar-bay-concealed'].map(id => price(id).cost), [100000000, 10, 1000]);
  assert.equal(price('hangar-bay').legacy.p6a.cost.value, 10000);
  assert.equal(price('hangar-bay').legacy.p6aHistory.at(-1).authority, 'OWNER_RULING');
  assert.equal(by('hangar-bay').ownerRuling, 'V-P6A-05');
  assert.equal(r.records.filter(x => x.disposition === 'CORRECTION_REQUIRED').length, 0, 'every printed/errata difference is applied');
  // Baffled Drive is a table-listed Scum and Villainy system, not statblock-only
  assert.equal(by('baffled-drive').disposition, 'MATCHED_CANONICAL');
  assert.deepEqual([by('baffled-drive').source.book, by('baffled-drive').source.printedPage], ['Scum and Villainy', 58]);
  // Clone Wars / Rebellion Era weapon prose has no purchase table: economics unknown, never invented
  const w = load('data/vehicle-modifications/weapon-systems.json');
  for (const id of ['composite-beam-cannon', 'mass-driver-cannon-standard', 'rail-cannon', 'anti-aircraft-flak-pod']) {
    const row = w.find(x => x.id === id);
    assert.deepEqual([row.emplacementPoints, row.availability, row.cost], [null, null, null], id);
    assert.equal(by(id).disposition, 'UNRESOLVED_SOURCE');
    assert.ok(row.legacy.p6a.cost.value > 0, 'old value kept as legacy evidence');
  }
  assert.equal(w.find(x => x.id === 'mass-driver-cannon-standard').sizeRestriction, 'Gargantuan or Larger');
});

test('printed dash is unknown, not zero; legacy values and citations are preserved', () => {
  const w = load('data/vehicle-modifications/weapon-systems.json');
  for (const id of ['ion-bomb', 'gravity-mine-standard', 'gravity-mine-magnetic', 'defoliator-shell']) {
    const row = w.find(x => x.id === id);
    assert.equal(row.emplacementPoints, null, id);
    assert.equal(row.legacy.p6a.emplacementPoints.value, 0);
    assert.match(row.legacy.p6a.emplacementPoints.correctedFrom, /printed "—"/);
  }
  const d = load('data/vehicle-modifications/defense-systems.json');
  assert.deepEqual([d.find(x => x.id === 'security-bracing').cost, d.find(x => x.id === 'security-bracing').sizeRestriction], [2000, 'Gargantuan or Larger']);
});

test('certification overlay: PDF-verified rows are SOURCE_VERIFIED unless a tested effect is registered, and the loader keeps certification.json precedence', async () => {
  const { EFFECTS } = await import('../scripts/domain/vehicles/vehicle-modification-effects.js');
  const overlay = load('data/vehicle-modifications/certification-p6a.json').rows;
  const base = load('data/vehicle-modifications/certification.json').rows;
  assert.ok(Object.keys(overlay).length > 100);
  for (const [id, row] of Object.entries(overlay)) {
    assert.equal(row.status, EFFECTS[id] ? 'MECHANIC_SPECIFIED' : 'SOURCE_VERIFIED', id);
    if (EFFECTS[id]) assert.equal(row.effectTest, EFFECTS[id].kind === 'weapon' ? (EFFECTS[id].testFile ?? 'tests/vehicle-universal-phase4e-p21-weapon-slice.test.mjs') : 'tests/vehicle-universal-phase4e-p19-p6b2-accessories.test.mjs', id);
    assert.ok(row.book && Number.isInteger(row.printedPage), id);
    assert.equal(base[id], undefined, 'no overlap with certification.json');
  }
  assert.equal(overlay['turbolaser-heavy'].printedPage, 47);
  const svc = readFileSync('scripts/engine/vehicles/vehicle-installation-service.js', 'utf8');
  assert.match(svc, /certification-p6a\.json/);
  assert.match(svc, /\.\.\.\(p6aRes\.ok[^;]*\.\.\.\(\(await certRes\.json\(\)\)\.rows/);
  const ready = load(`${DIR}/readiness-manifest.json`);
  assert.equal(ready.counts.installable, 66);
  assert.equal(ready.counts.combatUsable, 12);
});

test('all 91 worksheet items carry a PDF disposition and a reconciliation outcome', () => {
  const ws = load(`${DIR}/pdf-review-worksheet.json`);
  assert.equal(ws.resolution.length, 91);
  for (const x of ws.resolution) { assert.ok(x.pdfDisposition, x.id); assert.ok(x.reconciliation, x.id); }
});

test('V-P6A-06: dash-EP ammunition is consumable (no invented EP) and never becomes an installation job', async () => {
  const L = await import('../scripts/domain/vehicles/vehicle-installation-ledger.js');
  const w = load('data/vehicle-modifications/weapon-systems.json');
  for (const id of ['ion-bomb', 'gravity-mine-standard', 'gravity-mine-magnetic', 'defoliator-shell']) {
    const row = w.find(x => x.id === id);
    assert.deepEqual([row.installationKind, row.emplacementPoints, row.emplacementPointsPrinted], ['consumable-ammunition', null, '—'], id);
    const plan = L.planVehicleInstallation({ record: { identity: { sourceEntryKey: 'k' } }, flags: {}, catalogEntry: row, installId: 'i', availableCredits: 1e9 });
    assert.deepEqual(plan.reasons, ['CONSUMABLE_AMMUNITION_NOT_AN_INSTALLATION']);
  }
  // printed 0 is a real zero: a missile row is not reclassified
  assert.equal(w.find(x => x.id === 'proton-torpedo').emplacementPoints, 0);
  assert.equal(w.find(x => x.id === 'proton-torpedo').installationKind, undefined);
});

test('Errata 1.0 layer: precedence recorded; footnote, Extended Range and stock-frame Strength corrected with the printed value kept', () => {
  const e = load('data/audits/vehicles/errata/sotg-errata-1.0.json');
  assert.deepEqual(e.precedence, ['published source', 'published errata', 'explicit project-owner ruling', 'implementation']);
  const w = load('data/vehicle-modifications/weapon-systems.json');
  const footnoted = w.filter(x => x.legacy?.p6aHistory?.some(h => h.authority === 'PUBLISHED_ERRATA' && h.field === 'sizeRestriction'));
  assert.equal(footnoted.length, 10);
  for (const x of footnoted) assert.equal(x.sizeRestriction, 'Colossal (Frigate) or Larger', x.id);
  assert.equal(load('data/vehicle-modifications/accessories.json').find(x => x.id === 'extended-range').emplacementPoints, 1);
  const frames = load('data/canonical/vehicles/construction/stock-frames.json').frames;
  const f = id => frames.find(x => x.id === id);
  assert.deepEqual(['heavy-freighter', 'corvette', 'frigate', 'cruiser', 'battlecruiser'].map(id => f(id).strength), [56, 58, 60, 94, 100]);
  assert.deepEqual(f('cruiser').errataApplied[0], { field: 'strength', printed: 118, corrected: 94, errata: 'SOTG-E1-STOCK-STRENGTH', source: e.errata, verification: 'INDEPENDENTLY_VERIFIED' });
  assert.equal(f('superiority-fighter').errataApplied, undefined);
  const rec = load(`${DIR}/pdf-reconciliation.json`).records.find(x => x.catalogId === 'turbolaser-heavy');
  assert.equal(rec.authority, 'PUBLISHED_ERRATA');
  assert.equal(rec.errata.printed, 'Colossal or larger starships only');
});

test('errata publication proposals are applied to exactly the named sealed records', () => {
  const p = load('data/audits/vehicles/errata/sotg-errata-1.0-publication-proposals.json');
  const records = new Map(readFileSync('data/canonical/vehicles/vehicles.json', 'utf8').trim().split('\n').map(JSON.parse).map(r => [r.identity.sourceEntryKey, r]));
  const e = load('data/audits/vehicles/errata/sotg-errata-1.0.json');
  assert.equal(e.provenance.status, 'INDEPENDENTLY_VERIFIED');
  assert.deepEqual(e.provenance.verificationHistory.map(h => h.status), ['NOT_VERIFIED_IN_SESSION', 'INDEPENDENTLY_VERIFIED'], 'history preserved');
  const ywings = p.proposals.filter(x => x.errataId === 'SOTG-E1-Y-WING-SHIELDS');
  assert.equal(ywings.length, 3);
  for (const x of ywings) {
    const r = records.get(x.sourceEntryKey);
    assert.equal(r.publication.page, x.page);
    assert.equal(x.status, 'APPLIED');
    assert.equal(r.defenses.shieldRating, x.proposed);
    assert.equal(r.publication.errataApplied[0].changes[0].printed, x.printed);
  }
  const gw = p.proposals.find(x => x.errataId === 'SOTG-E1-GRAVITY-WELL-AREA');
  assert.match(JSON.stringify(records.get(gw.sourceEntryKey).armament.firingGroups), /3x3 starship squares \(Errata 1\.0; printed 4x4\)/);
  for (const u of p.explicitlyUnchanged) assert.equal(records.get(u.sourceEntryKey).defenses.shieldRating, u.shieldRating, u.sourceEntryKey);
  // the generic component row keeps its own printed prose until V-P6A-07 is ruled
  assert.match(load('data/vehicle-modifications/weapon-systems.json').find(x => x.id === 'gravity-well-projector').effect, /4x4/);
  const inv = load('data/audits/vehicles/errata/errata-inventory.json');
  assert.equal(inv.books.length, 14);
  assert.equal(inv.books.filter(b => b.status === 'OFFICIAL_PUBLISHED_VERIFIED').length, 1);
});
