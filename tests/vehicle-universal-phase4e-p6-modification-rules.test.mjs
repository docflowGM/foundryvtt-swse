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

test('catalog certification: only text-verified rows, every id exists, noisy/differing rows are never certified', () => {
  const ids = new Set(catalog.map(c => c.id));
  for (const id of Object.keys(overlay.rows)) assert.ok(ids.has(id), id);
  const status = Object.fromEntries(evidence.catalogComparison.rows.map(r => [r.catalogId, r.status]));
  for (const id of Object.keys(overlay.rows)) assert.equal(status[id], 'SOURCE_VERIFIED_TEXT', id);
  assert.equal(Object.keys(overlay.rows).length, evidence.catalogComparison.counts.SOURCE_VERIFIED_TEXT);
  for (const id of ['armor-1', 'armor-4', 'shields-10', 'shields-40', 'shields-50', 'shields-60', 'shields-150', 'maneuvering-jets-2', 'anti-boarding-systems', 'reinforced-keel'])
    assert.equal(overlay.rows[id], undefined, id + ' must not be certified from OCR');
  // no overlay row claims MECHANIC_SPECIFIED: effects are not implemented
  for (const row of Object.values(overlay.rows)) { assert.equal(row.status, 'SOURCE_VERIFIED'); assert.equal(row.book, 'Starships of the Galaxy'); assert.ok(Array.isArray(row.printedPageRange)); }
  // weapons and accessories tables are not parseable from the OCR and remain uncertified
  const unparsed = evidence.catalogComparison.rows.filter(r => r.status === 'TABLE_NOT_PARSED_NEEDS_PDF');
  assert.equal(unparsed.length, 126);
  assert.ok(unparsed.every(r => ['accessories', 'weapon-systems'].includes(r.catalogFile)));
});

test('the one printed/catalog disagreement is reported, not silently resolved', () => {
  const armor4 = evidence.catalogComparison.rows.find(r => r.catalogId === 'armor-4');
  assert.equal(armor4.status, 'OCR_ROW_DIFFERS_FROM_CATALOG');
  assert.deepEqual(armor4.differences, [{ field: 'sizeRestriction', printed: 'Colossal (cruiser) or larger', catalog: 'Colossal (Frigate) or Larger' }]);
});

test('stock frames: aligned rows cross-check against the published X-wing (a superiority fighter)', () => {
  const sf = frames.frames.find(f => f.id === 'superiority-fighter');
  assert.deepEqual([sf.size, sf.strength, sf.dexterity, sf.speed, sf.hitPoints, sf.damageReduction, sf.armor], ['Gargantuan', 42, 22, '16/4', 120, 10, 7]);
  assert.equal(sf.certification, 'SOURCE_VERIFIED_TEXT');
  assert.equal(frames.frames.length, 12);
  const bad = frames.frames.filter(f => f.certification !== 'SOURCE_VERIFIED_TEXT').map(f => f.id).sort();
  assert.deepEqual(bad, ['battlecruiser', 'light-fighter']);
  for (const f of frames.frames) assert.equal(f.certification === 'SOURCE_VERIFIED_TEXT', f.noisy.length === 0);
});
