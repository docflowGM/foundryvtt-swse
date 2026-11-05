import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LAUNCHER_CAPACITY, launcherStandardCapacity, launcherAcceptsAmmunition } from '../scripts/domain/vehicles/vehicle-launcher-capacity.js';

const weapons = JSON.parse(readFileSync('data/vehicle-modifications/weapon-systems.json', 'utf8'));
const ocr = readFileSync('reference/sourcebooks/Starships of the Galaxy_djvu.txt', 'utf8').replace(/\s+/g, ' ');

test('standard launcher capacities match the printed Starships of the Galaxy text', () => {
  assert.match(ocr, /The ammunition capacity of a concussion missile launcher is determined by its size: light, 6; medium, 16; heavy, 30\. Additional capacity can be added, increasing the cost by 20% for each additional missile \(up to a maximum of double capacity\)/);
  assert.match(ocr, /A standard proton torpedo launcher holds three torpedoes\. Additional capacity may be added, increasing the cost by 25% for each additional torpedo \(up to a maximum of sixteen torpedoes\)/);
  assert.match(ocr, /A standard shieldbuster torpedo holds four torpedoes\. Addi- ?tional capacity may be added, increasing the cost by 25% for each additional torpedo \(up to a maximum of eight torpedoes\)/);
  assert.match(ocr, /All mine launchers hold six mines\. Additional capacity may be added, increasing the cost by 25% per each additional mine \(up to a maximum of twelve mines\)/);
  const std = Object.fromEntries(Object.entries(LAUNCHER_CAPACITY).map(([k, v]) => [k, v.standard]));
  assert.deepEqual(std, { 'concussion-missile-launcher-light': 6, 'concussion-missile-launcher-medium': 16, 'concussion-missile-launcher-heavy': 30,
    'proton-torpedo-launcher': 3, 'shieldbuster-torpedo-launcher': 4, 'space-mine-launcher': 6, 'space-mine-launcher-heavy': 6, 'gravity-mine-launcher': 6, 'ion-bomb-rack': 4 });
  for (const id of Object.keys(LAUNCHER_CAPACITY)) assert.ok(weapons.some(w => w.id === id), id + ' is a catalog launcher');
});

test('expansion is recorded but deferred (V-P6A-03); unprinted launchers are unknown, never 0', () => {
  for (const [id, c] of Object.entries(LAUNCHER_CAPACITY)) assert.equal(c.expansion.status, id === 'ion-bomb-rack' ? 'NOT_PRINTED' : 'DEFERRED_RULES_REVIEW');
  assert.deepEqual([LAUNCHER_CAPACITY['concussion-missile-launcher-medium'].expansion.maximum, LAUNCHER_CAPACITY['proton-torpedo-launcher'].expansion.maximum], [32, 16]);
  for (const id of ['discord-missile-launcher', 'proton-grenade-launcher', 'defoliator-launcher', 'heavy-ordnance-launcher'])
    assert.deepEqual(launcherStandardCapacity(id), { known: false, reason: 'LAUNCHER_CAPACITY_NOT_PRINTED' });
});

test('ammunition compatibility: only the explicit catalog link; any other pairing is unruled', () => {
  const l = id => weapons.find(w => w.id === id);
  assert.equal(launcherAcceptsAmmunition(l('proton-torpedo-launcher'), 'proton-torpedo'), true);
  assert.equal(launcherAcceptsAmmunition(l('space-mine-launcher'), 'space-mine-advanced'), null, 'not printed as incompatible either');
  assert.equal(launcherAcceptsAmmunition(l('heavy-ordnance-launcher'), 'proton-torpedo'), null);
});

test('launchers and ammunition remain uninstallable and nothing expends ammunition', async () => {
  const { EFFECTS } = await import('../scripts/domain/vehicles/vehicle-modification-effects.js');
  // WE-L1 certified five launchers (proton torpedo; light, medium, heavy concussion; shieldbuster) with their consumable ammunition kept OUT of the
  // registry; every other launcher, rack, mine, bomb, shell and grenade stays closed
  const certifiedLaunchers = new Set(['proton-torpedo-launcher', 'shieldbuster-torpedo-launcher', 'space-mine-launcher', 'space-mine-launcher-heavy', 'ion-bomb-rack', 'tractor-beam', 'gravity-well-projector', 'concussion-missile-launcher-light', 'concussion-missile-launcher-medium', 'concussion-missile-launcher-heavy']);
  for (const w of weapons.filter(x => /launcher|rack|missile|torpedo|mine|bomb|shell|grenade/.test(x.id))) assert.equal(EFFECTS[w.id] === undefined, !certifiedLaunchers.has(w.id), w.id);
  for (const w of weapons.filter(x => x.category === 'Ammunition')) assert.equal(EFFECTS[w.id], undefined, w.id + ' is a consumable, never an installation');
  const src = readFileSync('scripts/domain/vehicles/vehicle-launcher-capacity.js', 'utf8');
  assert.doesNotMatch(src, /\b(update|setFlag|createEmbeddedDocuments|AmmoSystem)\b/);
});
