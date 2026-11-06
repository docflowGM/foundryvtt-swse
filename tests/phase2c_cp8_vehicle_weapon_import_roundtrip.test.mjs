import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

/**
 * Isolated test for the PRODUCTION normalizeWeapons function, not a copied
 * replacement implementation. The surrounding importer has Foundry-only
 * absolute module imports, so extract just the pure normalization function.
 */
const source = readFileSync(new URL('../scripts/engine/import/vehicle-import-normalizer.js', import.meta.url), 'utf8');
const begin = source.indexOf('const VEHICLE_WEAPON_PRESERVED_FIELDS = Object.freeze([');
const end = source.indexOf('/**\n * Normalize subsystems:', begin);
assert.ok(begin >= 0 && end > begin, 'production weapon normalizer must remain discoverable');
const segment = source.slice(begin, end);
const scope = {safeString: (value, fallback = '') => typeof value === 'string' ? value : fallback};
runInNewContext(segment + '\nglobalThis.__normalized = normalizeWeapons;', scope);
const normalize = scope.__normalized;

const ghtrocRow = Object.freeze({
  id: '4d5b3422047f5eb8-weapon-1',
  name: 'Double Laser Cannons',
  baseName: 'Double Laser Cannon',
  attackType: 'ranged',
  arc: 'forward',
  firingArc: 'fixed-forward',
  sourcePage: 88,
  weaponGroupKey: 'sotg-ghtroc-720-double-laser-cannons',
  sourceEntryKey: 'sotg-ghtroc-industries-class-720-freighter',
  station: 'gunner',
  operatorStation: 'gunner',
  mountId: 'ghtroc-720-fixed-forward-1',
  mountCount: 1,
  hardwareCount: 1,
  battery: false,
  batteryCount: 1,
  damage: '4d10x2',
  printedAttackTotal: '+1',
  range: 'Laser Cannons',
  pointDefense: false,
  modifiers: [],
  fireControl: null,
  rawSource: 'Double laser cannons (gunner): Atk +1 (-4 autofire), Dmg 4d10x2',
  parseConfidence: 'published-source',
  untrustedInjectedProof: 'should be removed'
});

test('retains Ghtroc installed-row ID, singular physical mount and station', () => {
  const [row] = normalize([ghtrocRow]);
  for (const key of ['id','weaponGroupKey','sourceEntryKey','arc','firingArc',
                      'operatorStation','station','mountId','mountCount',
                      'hardwareCount','printedAttackTotal','damage','sourcePage'])
    assert.equal(row[key], ghtrocRow[key], key);
});
test('Ghtroc printed flat total remains provenance, not invented additive attackBonus', () => {
  const [row] = normalize([ghtrocRow]);
  assert.equal(row.printedAttackTotal, '+1');
  assert.equal(Object.hasOwn(row, 'bonus'), false);
  assert.equal(Object.hasOwn(row, 'attackBonus'), false);
});
test('does not promote injected proof or arbitrary object properties', () => {
  const [row] = normalize([ghtrocRow]);
  assert.equal(Object.hasOwn(row,'untrustedInjectedProof'),false);
});
test('retains recognized legacy metadata and current shipyard provenance', () => {
  const [row] = normalize([{
    id:'legacy-weapon',name:'Ion Cannon',sourceModificationId:'mod-installed',
    count:2,weaponSystemSlug:'ion-cannon',rangeProfileSlug:'ion-cannons',
    bonus:'+3',attackBonus:'+3'
  }]);
  assert.equal(row.sourceModificationId,'mod-installed');
  assert.equal(row.id,'legacy-weapon');
  assert.equal(row.count,2);
  assert.equal(row.bonus,'+3');
  assert.equal(row.attackBonus,'+3');
  assert.equal(row.weaponSystemSlug,'ion-cannon');
});
test('does not fabricate an ID for older rows', () => {
  const [row] = normalize([{name:'Autoblaster',damage:'4d10'}]);
  assert.equal(Object.hasOwn(row,'id'),false);
});
test('continues rejecting corrupted generic category placeholders', () => {
  const rows=normalize([{name:'Add Category'},ghtrocRow,{name:'Planetary Starship Weapons'}]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].name,'Double Laser Cannons');
});
test('null/empty data do not yield weapons', () => {
  assert.equal(normalize(null).length,0);
  assert.equal(normalize([null,{}, {name:''}]).length,0);
});
