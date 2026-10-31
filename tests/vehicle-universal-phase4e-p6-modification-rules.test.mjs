import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as R from '../scripts/domain/vehicles/vehicle-modification-rules.js';

const evidence = JSON.parse(readFileSync('data/audits/vehicles/swse-p2-sotg-modification-evidence.json', 'utf8'));
const overlay = JSON.parse(readFileSync('data/vehicle-modifications/certification.json', 'utf8'));
const frames = JSON.parse(readFileSync('data/canonical/vehicles/construction/stock-frames.json', 'utf8'));
const catalog = ['accessories', 'defense-systems', 'movement-systems', 'weapon-systems']
  .flatMap(f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8')));

// ---- the book's own worked examples (SotG p. 38) are the oracle ----
test('Table 3-1: regenerating shields cost 25,000 on a Colossal ship and 2,500,000 on a Colossal (cruiser)', () => {
  const regen = { cost: 5000, costType: 'base' };
  assert.equal(R.systemCost(regen, 'Colossal').credits, 25000);
  assert.equal(R.systemCost(regen, 'Colossal (cruiser)').credits, 2500000);
  assert.equal(R.systemCost(regen, 'Colossal (frigate)').credits, 250000);
  assert.equal(R.systemCost(regen, 'Colossal (station)').credits, 25000000);
  assert.equal(R.systemCost(regen, 'Gargantuan').credits, 10000);
  assert.equal(R.systemCost(regen, 'Huge').credits, 5000);
  // a plain credit price is the same for every size
  assert.equal(R.systemCost({ cost: 2000, costType: 'flat' }, 'Colossal (cruiser)').credits, 2000);
});

test('sizes without a published cost modifier, and unresolved cost types, are refused (never defaulted)', () => {
  for (const size of ['Large', 'Medium', undefined, 'Tiny']) assert.equal(R.costModifierForSize(size), null);
  assert.equal(R.systemCost({ cost: 5000, costType: 'base' }, 'Large').ok, false);
  for (const type of ['multiplier', 'modifier', undefined]) assert.equal(R.systemCost({ cost: 2, costType: type }, 'Colossal').ok, false);
  assert.equal(R.systemCost({ cost: -1, costType: 'flat' }, 'Colossal').ok, false);
  assert.equal(R.systemCost({ costType: 'flat' }, 'Colossal').ok, false);
});

test('giving up cargo for emplacement points: 4 points on a Corellian Corvette costs 200 tons', () => {
  assert.equal(R.cargoTonsForEmplacementPoints('Colossal (frigate)', 4), 200);
  assert.equal(R.cargoTonsForEmplacementPoints('Huge', 3), 3);
  assert.equal(R.cargoTonsForEmplacementPoints('Large', 3), null);
});

test('installation: time = EP x cost modifier / workers; DC = 20 + EP; work force limits', () => {
  const entry = { emplacementPoints: 3, cost: 3000, costType: 'base' };
  const q = R.quoteInstallation({ entry, size: 'Colossal (frigate)', unusedEmplacementPoints: 5 });
  assert.equal(q.ok, true);
  assert.equal(q.days, (3 * 50) / 10, 'minimum work force of a frigate is 10');
  assert.equal(q.mechanicsDC, 23);
  assert.equal(q.credits, 150000);
  assert.deepEqual(q.workForce, { used: 10, minimum: 10, maximum: 100 });
  assert.equal(R.quoteInstallation({ entry, size: 'Colossal (frigate)', unusedEmplacementPoints: 5, workers: 100 }).days, 1.5);
  for (const workers of [9, 101, 0, 2.5]) assert.deepEqual(R.quoteInstallation({ entry, size: 'Colossal (frigate)', unusedEmplacementPoints: 5, workers }).reasons, ['WORK_FORCE_OUT_OF_RANGE']);
  // gargantuan or smaller: a single person
  assert.equal(R.quoteInstallation({ entry: { ...entry, cost: 3000 }, size: 'Gargantuan', unusedEmplacementPoints: 5 }).workForce.minimum, 1);
  assert.deepEqual(R.MIN_WORK_FORCE, { huge: 1, gargantuan: 1, colossal: 5, 'colossal (frigate)': 10, 'colossal (cruiser)': 20, 'colossal (station)': 50 });
});

test('lacking emplacement points: +2 days, +5 DC and +20% cost per missing point; the ship is used', () => {
  const entry = { emplacementPoints: 5, cost: 1000, costType: 'flat' };
  const q = R.quoteInstallation({ entry, size: 'Gargantuan', unusedEmplacementPoints: 3 }); // 2 short
  assert.equal(q.shortfall, 2);
  assert.equal(q.days, (5 * 2) / 1 + 2 * 2);
  assert.equal(q.mechanicsDC, 20 + 5 + 10);
  assert.equal(q.credits, 1400);
  assert.deepEqual(q.consequences, ['VEHICLE_BECOMES_USED', 'SYSTEM_DAMAGED_BEYOND_REPAIR_IF_VEHICLE_DISABLED']);
  const ok = R.quoteInstallation({ entry, size: 'Gargantuan', unusedEmplacementPoints: 5 });
  assert.equal(ok.shortfall, 0);
  assert.deepEqual(ok.consequences, []);
});

test('nonstandard modifications double the EP and multiply the cost by 5', () => {
  const entry = { emplacementPoints: 3, cost: 3000, costType: 'base' };
  const std = R.quoteInstallation({ entry, size: 'Gargantuan', unusedEmplacementPoints: 9 });
  const ns = R.quoteInstallation({ entry, size: 'Gargantuan', unusedEmplacementPoints: 9, nonstandard: true });
  assert.equal(ns.emplacementPoints, std.emplacementPoints * 2);
  assert.equal(ns.credits, std.credits * 5);
});

test('nonstandard assessment: only objective cases are decided; the Gamemaster decides the rest', () => {
  const tie = { hyperspace: { capability: 'unavailable' }, defenses: { shieldRating: 0 } };
  const xwing = { hyperspace: { capability: 'equipped' }, defenses: { shieldRating: 15 } };
  const unknown = { hyperspace: {}, defenses: {} };
  const hyper = { name: 'Hyperdrive, Class 2' }, shield = { name: 'Starship Shields, SR 20' }, laser = { name: 'Laser cannon, light' };
  assert.equal(R.nonstandardAssessment(hyper, tie).nonstandard, true);   // the book's TIE example
  assert.equal(R.nonstandardAssessment(shield, tie).nonstandard, true);  // the book's TIE example
  assert.equal(R.nonstandardAssessment(hyper, xwing).nonstandard, false);
  assert.equal(R.nonstandardAssessment(shield, xwing).nonstandard, false);
  assert.equal(R.nonstandardAssessment(hyper, unknown).nonstandard, null);
  assert.equal(R.nonstandardAssessment(shield, unknown).nonstandard, null);
  assert.equal(R.nonstandardAssessment(laser, tie).nonstandard, null);
  assert.equal(R.nonstandardAssessment(hyper, tie, { starshipDesigner: true }).nonstandard, false);
});

test('installation check: fail by less than 10 is partial (retry at half, +5); by 10 or more is total', () => {
  assert.equal(R.installationCheckOutcome({ dc: 25, total: 25 }).outcome, 'SUCCESS');
  assert.equal(R.installationCheckOutcome({ dc: 25, total: 31 }).outcome, 'SUCCESS');
  const partial = R.installationCheckOutcome({ dc: 25, total: 16 });
  assert.equal(partial.outcome, 'PARTIAL_FAILURE');
  assert.deepEqual(partial.retry, { timeFraction: 0.5, costFraction: 0.5, mechanicsBonus: 5 });
  assert.equal(R.installationCheckOutcome({ dc: 25, total: 15 }).outcome, 'TOTAL_FAILURE');
  assert.equal(R.installationCheckOutcome({ dc: 25, total: 15 }).retry, null);
  assert.equal(R.installationCheckOutcome({ dc: NaN, total: 1 }).outcome, 'UNRESOLVED');
});

test('removal takes half the installation time at no cost; resale is a possible quarter, never automatic', () => {
  const r = R.quoteRemoval({ installDays: 6, originalCredits: 25000 });
  assert.deepEqual(r, { days: 3, credits: 0, maximumResaleCredits: 6250, resaleIsAutomatic: false });
});

// ---- evidence files ----
test('evidence file is reproducible from the committed sourcebook text', () => {
  const r = spawnSync(process.execPath, ['tools/audits/vehicles/build-sotg-modification-evidence.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

import { IMPLEMENTED_EFFECT_IDS as IMPLEMENTED } from '../scripts/domain/vehicles/vehicle-modification-effects.js';
test('catalog certification: text-verified and PDF-reviewed movement/defense rows only; every id exists', () => {
  const ids = new Set(catalog.map(c => c.id));
  for (const id of Object.keys(overlay.rows)) assert.ok(ids.has(id), id);
  const status = Object.fromEntries(evidence.catalogComparison.rows.map(r => [r.catalogId, r.status]));
  for (const [id, row] of Object.entries(overlay.rows)) {
    assert.ok(['SOURCE_VERIFIED_TEXT', 'PDF_REVIEWED'].includes(status[id]), id);
    assert.equal(row.evidence, status[id] === 'PDF_REVIEWED' ? 'PDF_REVIEWED' : 'OCR_TEXT');
    assert.equal(row.status, IMPLEMENTED.includes(id) ? 'MECHANIC_SPECIFIED' : 'SOURCE_VERIFIED');
    assert.equal(row.book, 'Starships of the Galaxy');
    assert.ok(['movement', 'defense'].includes(row.table), id + ' table ' + row.table);
    assert.equal(row.pageResolution, 'pdf-table-page');
    assert.equal(row.printedPage, row.table === 'movement' ? 41 : 43, id);
  }
  const { SOURCE_VERIFIED_TEXT, PDF_REVIEWED } = evidence.catalogComparison.counts;
  assert.equal(Object.keys(overlay.rows).length, SOURCE_VERIFIED_TEXT - evidence.catalogComparison.rows.filter(r => r.table === 'weapon' && r.status === 'SOURCE_VERIFIED_TEXT').length + PDF_REVIEWED);
  // the weapon and accessory tables have not been PDF-reviewed and are never certified
  assert.equal(Object.values(overlay.rows).filter(r => r.table === 'weapon').length, 0);
  assert.ok(evidence.catalogComparison.rows.filter(r => r.table === 'weapon').every(r => r.certifiable === false || r.status === 'OCR_ROW_DIFFERS_FROM_CATALOG'));
  const unparsed = evidence.catalogComparison.rows.filter(r => r.status === 'TABLE_NOT_PARSED_NEEDS_PDF');
  assert.ok(unparsed.every(r => r.catalogFile === 'accessories' || r.catalogFile === 'weapon-systems'));
});

test('the PDF review resolves the eight OCR-questionable movement/defense rows and corrects armor-4', () => {
  const reviewed = evidence.catalogComparison.rows.filter(r => r.status === 'PDF_REVIEWED').map(r => r.catalogId).sort();
  assert.deepEqual(reviewed, ['armor-1', 'armor-4', 'maneuvering-jets-2', 'shields-10', 'shields-150', 'shields-40', 'shields-50', 'shields-60']);
  for (const id of reviewed) assert.ok(overlay.rows[id], id);
  const armor4 = catalog.find(c => c.id === 'armor-4');
  assert.equal(armor4.sizeRestriction, 'Colossal (Cruiser) or Larger', 'catalog corrected from "(Frigate)"');
  assert.deepEqual(evidence.catalogComparison.rows.find(r => r.catalogId === 'armor-4').catalogCorrection,
    { field: 'sizeRestriction', original: 'Colossal (Frigate) or Larger', corrected: 'Colossal (Cruiser) or Larger' });
  const byId = Object.fromEntries(catalog.map(c => [c.id, c]));
  assert.deepEqual([byId['armor-1'].emplacementPoints, byId['shields-10'].emplacementPoints, byId['shields-10'].sizeRestriction, byId['shields-40'].emplacementPoints,
    byId['shields-50'].emplacementPoints, byId['shields-60'].emplacementPoints, byId['shields-150'].emplacementPoints, byId['maneuvering-jets-2'].emplacementPoints], [2, 1, null, 2, 3, 3, 7, 2]);
});

test('weapon table transcription is machine-checked; footnote corrections (P6A) are applied but never certified', () => {
  const w = evidence.catalogComparison.rows.filter(r => r.table === 'weapon');
  assert.ok(w.length >= 40);
  const turbo = w.find(r => r.catalogId === 'turbolaser-heavy');
  // P6A applied the footnote (1) size restriction, keeping the old value as legacy evidence
  assert.equal(turbo.status, 'SOURCE_VERIFIED_TEXT');
  const row = JSON.parse(readFileSync('data/vehicle-modifications/weapon-systems.json', 'utf8')).find(r => r.id === 'turbolaser-heavy');
  assert.equal(row.sizeRestriction, 'Colossal or Larger');
  assert.equal(row.legacy.p6a.sizeRestriction.value, 'Colossal (Frigate) or Larger');
  assert.equal(Object.keys(overlay.rows).includes('turbolaser-heavy'), false, 'weapon rows stay uncertified');
});

test('stock frames: PDF-confirmed cells, exact table pages, and the X-wing cross-check', () => {
  const sf = frames.frames.find(f => f.id === 'superiority-fighter');
  assert.deepEqual([sf.size, sf.strength, sf.dexterity, sf.speed, sf.hitPoints, sf.damageReduction, sf.armor], ['Gargantuan', 42, 22, '16/4', 120, 10, 7]);
  assert.equal(sf.certification, 'SOURCE_VERIFIED_TEXT');
  assert.equal(frames.frames.length, 12);
  assert.deepEqual(frames.printedPages, [52, 53]);
  assert.deepEqual(frames.printedTables, { 'Table 3-8 Stock Ship Types': 52, 'Table 3-9 Stock Ship Base Values': 53 });
  const bc = frames.frames.find(f => f.id === 'battlecruiser'), lf = frames.frames.find(f => f.id === 'light-fighter');
  assert.equal(bc.certification, 'PDF_CONFIRMED');
  assert.equal(bc.damageReduction, 20);
  assert.equal(lf.certification, 'PDF_CONFIRMED');
  assert.deepEqual([lf.crew, lf.stockEmplacementPoints], [1, 2]);
  assert.ok(frames.frames.every(f => f.noisy.length === 0 && ['SOURCE_VERIFIED_TEXT', 'PDF_CONFIRMED'].includes(f.certification)));
  assert.equal(evidence.sections.stockShips.printedPages.join(), '52,53');
});

test('J-Type transports have 2 unused emplacement points (Table 3-2, p. 39, PDF review)', () => {
  const j = evidence.unusedEmplacementPoints.rows.find(r => r.ocrName === 'J-Type transports');
  assert.equal(j.unusedEmplacementPoints, 2);
  assert.equal(evidence.unusedEmplacementPoints.printedPages.join(), '39');
});

// ---- Crew Quality (Core Rulebook p. 174, from the PDF) ----
test('crew quality table is the printed one', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(R.CREW_QUALITY)), JSON.parse(JSON.stringify({
    untrained: { attackBonus: -5, checkModifier: 0, clModifier: -1 }, normal: { attackBonus: 0, checkModifier: 5, clModifier: 0 },
    skilled: { attackBonus: 2, checkModifier: 6, clModifier: 1 }, expert: { attackBonus: 5, checkModifier: 8, clModifier: 2 },
    ace: { attackBonus: 10, checkModifier: 12, clModifier: 4 }
  })));
  const review = JSON.parse(readFileSync('data/audits/vehicles/swse-p2-pdf-review.json', 'utf8'));
  for (const [q, v] of Object.entries(review.crewQuality)) assert.deepEqual(JSON.parse(JSON.stringify(R.CREW_QUALITY[q])), v, q);
});

test('hyperdrives on starfighters are always nonstandard (SotG, Hyperdrives)', () => {
  const xwing = { classification: { primaryCategory: 'starfighter' }, hyperspace: { capability: 'equipped' } };
  const freighter = { classification: { primaryCategory: 'space-transport' }, hyperspace: { capability: 'equipped' } };
  assert.deepEqual(R.nonstandardAssessment({ name: 'Hyperdrive, Class 1' }, xwing), { nonstandard: true, basis: 'STARFIGHTER_HYPERDRIVE_ALWAYS_NONSTANDARD' });
  assert.equal(R.nonstandardAssessment({ name: 'Hyperdrive, Class 1' }, freighter).nonstandard, false);
  assert.equal(R.nonstandardAssessment({ name: 'Hyperdrive, Class 1' }, xwing, { starshipDesigner: true }).nonstandard, false);
});

// ---- unused emplacement points ----
const unusedTable = JSON.parse(readFileSync('data/canonical/vehicles/construction/unused-emplacement-points.json', 'utf8'));
test('unused EP table: one entry per published vehicle, book-stated exceptions, general rule 1, unruled cases stay unknown', () => {
  assert.equal(unusedTable.entries.length, 429);
  assert.equal(new Set(unusedTable.entries.map(e => e.sourceEntryKey)).size, 429);
  const by = Object.fromEntries(unusedTable.entries.map(e => [e.sourceEntryKey, e]));
  assert.equal(by['core-incom-t-65b-x-wing-starfighter'].unusedEmplacementPoints, 1);
  assert.equal(by['core-incom-t-65b-x-wing-starfighter'].basis, 'SOTG_GENERAL_RULE');
  assert.equal(by['sotg-corellian-yt-1300-transport'].unusedEmplacementPoints, 10);
  assert.equal(by['sotg-corellian-engineering-corporation-cr70-corvette'].unusedEmplacementPoints, 5);
  assert.equal(by['sotg-corellian-engineering-corporation-cr70-corvette'].basis, 'SOTG_CEC_DEFAULT');
  assert.equal(by['sotg-corellian-engineering-corporation-action-vi-bulk-transport'].unusedEmplacementPoints, 3, 'Table 3-2 overrides the CEC default');
  assert.equal(by['sotg-dynamic-class-freighter'].unusedEmplacementPoints, 6);
  assert.equal(by['re-mobquet-medium-transport'].unusedEmplacementPoints, 10);
  assert.equal(by['re-ykl-37r-nova-courier'].unusedEmplacementPoints, 5);
  assert.equal(by['le-scarlet-star-modified-yt-2400-transport'].basis, 'SOTG_GENERAL_RULE', 'a modified YT is not the stock YT');
  for (const k of ['kotor-amalgamated-hyperdyne-578-r-space-transport', 'kotor-arakyd-industries-lethisk-class-armed-freighter', 'kotor-corellia-stardrive-quartermaster-class-supply-carrier']) {
    assert.equal(by[k].unusedEmplacementPoints, null, k);
    assert.equal(by[k].basis, 'KOTOR_STATBLOCK_EMPLACEMENT_POINTS_UNRULED');
  }
  assert.deepEqual(unusedTable.unmapped.map(u => [u.tableName, u.unusedEmplacementPoints]), [['Blockade runner', 5], ['J-Type transports', 2], ['Republic cruiser', 5]]);
  const r = R.makeUnusedEmplacementResolver(unusedTable);
  assert.deepEqual(r({ identity: { sourceEntryKey: 'sotg-dynamic-class-freighter' } }), { state: 'known', total: 6, basis: 'SOTG_TABLE_3_2' });
  assert.equal(r({ identity: { sourceEntryKey: 'kotor-arakyd-industries-lethisk-class-armed-freighter' } }).state, 'unknown');
  assert.equal(r({ identity: { sourceEntryKey: 'nope' } }).state, 'unknown');
});

test('unused EP table is reproducible', () => {
  const r = spawnSync(process.execPath, ['tools/audits/vehicles/build-unused-emplacement-table.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

// ---- legacy stock-ships.json corrections ----
test('stock-ships.json now matches the published Stock Ships tables field by field', async () => {
  const audit = await import('../tools/audits/vehicles/audit-legacy-stock-ships.mjs');
  const rows = audit.compareFrames();
  assert.equal(rows.filter(r => r.status === 'DISCREPANCY').length, 0, JSON.stringify(rows.filter(r => r.status === 'DISCREPANCY')));
  const legacy = JSON.parse(readFileSync('data/stock-ships.json', 'utf8'));
  const by = Object.fromEntries(legacy.map(s => [s.name, s]));
  assert.deepEqual(['Heavy Freighter', 'Corvette', 'Frigate', 'Cruiser', 'Battlecruiser'].map(n => by[n].strength), [106, 110, 114, 118, 124]);
  assert.equal(by['Light Freighter'].unusedEmplacementPoints, 1);
  assert.equal(by['Corvette'].unusedEmplacementPoints, 1);
  assert.equal(by['Light Freighter'].provenance.corrections.find(c => c.field === 'unusedEmplacementPoints').original, 10);
  assert.deepEqual(by['Battlecruiser'].provenance.corrections.map(c => [c.field, c.original, c.corrected]), [['strength', 100, 124]]);
});

test('the field-by-field comparison detects a regression of any corrected value', async () => {
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const legacy = JSON.parse(readFileSync('data/stock-ships.json', 'utf8'));
  legacy.find(s => s.name === 'Frigate').strength = 60;
  const file = `${mkdtempSync(`${tmpdir()}/stock-`)}/stock.json`;
  writeFileSync(file, JSON.stringify(legacy));
  const out = execFileSync(process.execPath, ['tools/audits/vehicles/audit-legacy-stock-ships.mjs', '--json'], { env: { ...process.env, LEGACY_STOCK_SHIPS_FILE: file }, encoding: 'utf8' });
  const bad = JSON.parse(out).rows.filter(r => r.status === 'DISCREPANCY');
  assert.deepEqual(bad.map(r => [r.frame, r.field, r.legacy, r.published]), [['Frigate', 'strength', 60, 114]]);
});

// ---- catalog effect text ----
test('catalog effect text follows the printed prose; unverifiable rows are marked, not trusted', () => {
  const by = Object.fromEntries(catalog.map(c => [c.id, c]));
  assert.match(by['atmospheric-thrusters'].effect, /10%/);
  assert.match(by['atmospheric-thrusters-advanced'].effect, /25%/);
  assert.match(by['atmospheric-thrusters'].effect, /No effect on starship-scale/);
  assert.doesNotMatch(JSON.stringify(by['atmospheric-thrusters']), /\+2 to Pilot/);
  assert.match(by['combat-thrusters'].effect, /dogfighting/);
  assert.doesNotMatch(by['combat-thrusters'].effect, /\+1 to Pilot/);
  assert.match(by['maneuvering-jets-4'].effect, /\+4 equipment bonus to the starship's Dexterity score/);
  assert.match(by['navicomputer-advanced'].effect, /\+10 equipment bonus/);
  assert.match(by['regenerating-shields'].effect, /by 10/);
  assert.match(by['reinforced-bulkheads-20'].effect, /20%.*do not stack/);
  assert.match(by['sensor-array-2'].effect, /Intelligence score/);
  assert.match(by['cargo-pod-medium'].effect, /cost modifier\) x 5 tons/);
  assert.match(by['droid-repair-team'].effect, /\+13/);
  assert.match(by['shieldbuster-torpedo'].effect, /half damage/);
  for (const c of catalog) {
    assert.ok(['PRINTED_PROSE', 'UNVERIFIED'].includes(c.effectVerification), c.id);
    if (c.effectVerification === 'PRINTED_PROSE') { assert.ok(c.legacy && c.effectSource.book === 'Starships of the Galaxy', c.id); }
  }
  assert.equal(catalog.filter(c => c.effectVerification === 'UNVERIFIED').map(c => c.id).includes('reinforced-keel'), true);
  const r = spawnSync(process.execPath, ['tools/audits/vehicles/apply-printed-effects.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('the deprecated legacy manager doubles EP for nonstandard modifications', () => {
  const code = readFileSync('scripts/apps/vehicle-modification-manager.js', 'utf8');
  assert.match(code, /isNonstandard \? ep \* 2 : ep/);
  assert.doesNotMatch(code, /they do not double EP/);
});
