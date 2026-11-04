/**
 * WE-0: the unified weapon-family readiness matrix. The matrix is generated; this test keeps it honest:
 * every catalog weapon row is accounted for, every derived status follows from code/data (not from prose), a family is never
 * counted operational while a blocker is open, and nothing is live-verified.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { EFFECTS } from '../scripts/domain/vehicles/vehicle-modification-effects.js';

const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const inventory = read('data/audits/vehicles/weapon-ecosystem-inventory.json');
const matrix = read('data/audits/vehicles/weapon-ecosystem-readiness.json');
const catalog = read('data/vehicle-modifications/weapon-systems.json');
const cert = { ...read('data/vehicle-modifications/certification-p6a.json').rows, ...read('data/vehicle-modifications/certification.json').rows };
const coverage = read('data/audits/vehicles/stock-weapon-coverage.json');
const row = id => matrix.rows.find(r => r.id === id);

test('the generated matrix and report are up to date with the inventory, the registry and the stock coverage', () => {
  const r = spawnSync(process.execPath, ['tools/audits/vehicles/build-weapon-ecosystem-readiness.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('inventory: every one of the catalog weapon rows belongs to exactly one inventory row; no unknown ids; blockers are catalogued', () => {
  const ids = inventory.rows.flatMap(r => r.catalogIds);
  assert.equal(ids.length, new Set(ids).size, 'no catalog row is listed twice');
  assert.deepEqual([...new Set(ids)].sort(), catalog.map(c => c.id).sort());
  assert.equal(catalog.length, 63);
  for (const r of inventory.rows) {
    assert.ok(r.established.length > 0 && r.sources.length > 0, r.id + ' cites its source facts');
    for (const code of r.blockers) assert.ok(inventory.blockerCatalog[code], `${r.id}: ${code}`);
  }
  // the 17 families of the Complete Weapon Ecosystem Addendum and its configurations are all present
  const have = new Set(inventory.rows.map(r => r.id));
  for (const id of ['laser-cannons', 'blaster-cannons', 'autoblasters', 'turbolasers', 'ion-cannons', 'hapan-triple-ion-cannon', 'mass-driver-and-projectile-cannons', 'proton-torpedoes',
    'concussion-missiles', 'armor-piercing-concussion-missiles', 'shieldbuster-torpedoes', 'space-mines', 'ion-bombs', 'tractor-beams', 'gravity-well-projectors', 'docking-guns', 'superlaser',
    'double-cannons', 'triple-cannons', 'quad-cannons', 'fire-linked-weapons', 'optional-fire-link', 'cannon-enhancements', 'weapon-batteries', 'point-defense', 'autofire', 'burst-fire'])
    assert.ok(have.has(id), id);
});

test('aftermarket column is computed from the certified effects registry, not from prose', () => {
  const installable = matrix.rows.flatMap(r => r.catalogRows).filter(c => c.installable).map(c => c.id).sort();
  assert.deepEqual(installable, Object.entries(EFFECTS).filter(([, e]) => e.kind === 'weapon').map(([id]) => id).sort());
  assert.equal(matrix.totals.aftermarketInstallableRows, 16);
  for (const id of ['laser-cannons', 'blaster-cannons', 'turbolasers', 'ion-cannons', 'proton-torpedoes', 'concussion-missiles']) {
    assert.equal(row(id).aftermarket.status, 'OFFLINE_TESTED_INSTALL_FIRE_REMOVE', id);
    assert.equal(row(id).sourceCertification, 'MECHANIC_SPECIFIED', id);
    assert.equal(row(id).attackExecution, 'OFFLINE_TESTED', id);
  }
  // the shieldbuster launcher, mines, bombs, tractor beams, gravity wells and every configuration are not installable
  for (const id of ['shieldbuster-torpedoes', 'space-mines', 'ion-bombs', 'tractor-beams', 'gravity-well-projectors', 'docking-guns', 'autoblasters',
    'hapan-triple-ion-cannon', 'double-cannons', 'quad-cannons', 'fire-linked-weapons', 'cannon-enhancements', 'point-defense'])
    assert.equal(row(id).aftermarket.status, 'NOT_INSTALLABLE', id);
  // ammunition rows are consumables, counted separately from installable weapon rows
  assert.ok(row('proton-torpedoes').aftermarket.consumableRows >= 1);
  // a certified-looking status without an effect is impossible
  for (const c of matrix.rows.flatMap(r => r.catalogRows)) if (c.certification === 'MECHANIC_SPECIFIED') assert.ok(EFFECTS[c.id], c.id);
});

test('stock column: groups are partitioned by family (no group counted twice); coverage totals match the gate output; configurations are overlays', () => {
  const owners = matrix.rows.filter(r => r.stock.basis.startsWith('PARTITION'));
  assert.equal(owners.reduce((n, r) => n + r.stock.groups, 0) + matrix.totals.stockGroupsUnclassified, 846);
  assert.equal(matrix.totals.stockGroups, coverage.totals.groups);
  assert.equal(matrix.totals.stockOfflineExecutableGroups, coverage.totals.offlineExecutableGroups);
  assert.ok(owners.reduce((n, r) => n + r.stock.offlineExecutable, 0) <= coverage.totals.offlineExecutableGroups, 'families own at most the executable groups; the remainder are in unclassified labels');
  for (const id of ['double-cannons', 'triple-cannons', 'quad-cannons', 'fire-linked-weapons', 'weapon-batteries', 'point-defense', 'autofire'])
    assert.match(row(id).stock.basis, /^OVERLAY/, id);
  // the report-only label classification: spot checks
  assert.ok(row('ion-cannons').stock.groups >= 60 && row('tractor-beams').stock.groups >= 50 && row('proton-torpedoes').stock.groups >= 50);
  // stock rows that are plain damage run; every launcher/tractor/gravity group is still refused (the AFTERMARKET launcher family is complete; no STOCK one is)
  for (const id of ['proton-torpedoes', 'concussion-missiles', 'tractor-beams', 'gravity-well-projectors', 'shieldbuster-torpedoes', 'space-mines']) assert.equal(row(id).stock.offlineExecutable, 0, id);
  // a configuration run from printed statblock values is NOT a configuration implementation
  for (const id of ['double-cannons', 'triple-cannons', 'quad-cannons', 'fire-linked-weapons']) {
    assert.equal(row(id).attackExecution, 'STOCK_PRINTED_VALUES_ONLY', id);
    assert.ok(row(id).openBlockers.some(b => b.code === 'CONFIGURATION_NOT_IMPLEMENTED'), id);
  }
});

test('honesty: nothing is live-verified; no family is operational while a blocker is open; rules questions are named, not resolved', () => {
  assert.equal(matrix.totals.liveVerifiedFamilies, 0);
  for (const r of matrix.rows) {
    assert.equal(r.liveFoundryVerification, 'NOT_VERIFIED', r.id);
    if (r.openBlockers.length) assert.equal(r.overall, 'NOT_FULLY_OPERATIONAL', r.id);
    else assert.equal(r.overall, 'OFFLINE_OPERATIONAL_LIVE_PENDING', r.id);
  }
  // range automation is the one blocker every damaging weapon still carries
  for (const id of ['laser-cannons', 'blaster-cannons', 'turbolasers', 'ion-cannons']) assert.ok(row(id).openBlockers.some(b => b.code === 'RANGE_BAND_NOT_AUTOMATED'), id);
  assert.equal(matrix.totals.familiesFullyOperationalOffline, matrix.rows.filter(r => r.openBlockers.length === 0).length);
  // rules gaps are classified RULES_DEFERRED and carry no recommended ruling
  for (const [code, b] of Object.entries(inventory.blockerCatalog)) if (b.class === 'RULES_DEFERRED') { assert.doesNotMatch(b.text, /recommend|should be|we propose/i, code); assert.match(b.text, /Register V-P6[AC]-\d\d/); }
  // every authored claim of tested behaviour names a test file that exists
  for (const r of inventory.rows) for (const f of Object.values(r.evidence ?? {})) assert.ok(fs.existsSync(f), `${r.id}: ${f}`);
});
