/**
 * Tractor-beam notation (engineering-only batch, no new rule): a tractor beam prints a grapple modifier where other weapons print dice. The records write that
 * one fact in several spellings. The gate reads every spelling of the DAMAGE TERM for a tractor designation and nothing else: a non-tractor weapon, a real
 * damage expression, a flat damage penalty and an absent grapple figure are all still handled exactly as before, and every newly executable group still passes
 * every other gate (operator, attack total, arc, size figure) on facts its own record prints.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { parseStockFiringGroup, assessStockWeaponGroups } = await import('../scripts/domain/vehicles/vehicle-stock-weapon-groups.js');

const group = (label, notes) => ({ groupKey: 'g', label, attackBonusPrinted: 10, specialNotes: notes });
const parse = (label, notes) => parseStockFiringGroup(group(label, notes));

test('SPELLINGS: every written form of "no damage, grapple +N" is read for a tractor beam', () => {
  for (const notes of ['Published damage: — (grapple +65). Operator: gunner.', 'Damage - (grapple +194); station gunner;', 'Printed damage grapple +68; operator gunner;', 'Printed operator pilot; damage grapple +36; printed p192;', 'Published damage: none. Operator: gunner.']) {
    const p = parse('tractor beam', notes);
    assert.equal(p.tractorBeam, true, notes);
    assert.ok(!p.reasons.includes('STOCK_DAMAGE_NOT_PRINTED_IN_RECORD'), notes);
    assert.equal(p.damage.none, true);
  }
  assert.equal(parse('tractor beam', 'Damage - (grapple +194); station gunner;').tractorGrapple, 194);
  assert.equal(parse('tractor beam', 'Printed damage grapple +68; operator gunner;').tractorGrapple, 68);
});

test('NEGATIVES: only a tractor designation, only the damage term', () => {
  // a non-tractor weapon with the same spelling is NOT given "no damage"
  for (const label of ['harpoon gun', 'boarding drill', 'plasma beam cutter']) {
    const p = parse(label, 'Damage - (grapple +24); pilot;');
    assert.ok(p.reasons.includes('STOCK_DAMAGE_NOT_PRINTED_IN_RECORD'), label);
    assert.ok(!p.tractorBeam);
  }
  // real dice are never replaced by the dash reading
  const dice = parse('tractor beam', 'Published damage: 3d10x2. Operator: gunner.');
  assert.equal(dice.damage.raw, '3d10x2'); assert.ok(!dice.tractorBeam);
  // a grapple figure elsewhere in the notes is not a damage term
  assert.ok(parse('tractor beam', 'Published damage: 5d10. Operator: gunner. grapple +10').damage.dice === 5);
});

test('CORPUS: exactly the nine groups whose notation changed became executable, each through every other gate', () => {
  const NINE = ['fucg-neutron-star-bulk-cruiser-attack-2', 'fucg-venator-class-star-destroyer-attack-5', 'gaw-corona-class-armed-transport-source-attack-4', 'gaw-koensayr-ilh-kk-citadel-class-cruiser-source-attack-4',
    'sotg-eclipse-group-6', 'sotg-fondor-shipyards-super-star-destroyer-group-4', 'sotg-kuat-drive-yards-nebulon-b-frigate-group-3', 'sotg-loronar-corporation-strike-class-medium-cruiser-group-4', 'sotg-lusankya-group-5'];
  const seen = new Map();
  for (const l of readFileSync('data/canonical/vehicles/vehicles.json', 'utf8').trim().split('\n')) {
    const r = JSON.parse(l);
    for (const g of assessStockWeaponGroups(r).groups) if (NINE.includes(g.groupKey)) seen.set(g.groupKey, g);
  }
  assert.deepEqual([...seen.keys()].sort(), [...NINE].sort());
  for (const [k, g] of seen) {
    assert.equal(g.executable, true, k);
    assert.equal(g.tractorBeam, true, k);
    assert.ok(Number.isFinite(g.tractorGrapple) && g.tractorGrapple > 0, k + ' carries its printed grapple modifier');
    assert.ok(g.operator, k);
    assert.deepEqual(g.reasons, [], k);
  }
});

test('CONSERVATION: tractor groups that stay refused keep their other, unrelated refusals', () => {
  const still = [];
  for (const l of readFileSync('data/canonical/vehicles/vehicles.json', 'utf8').trim().split('\n')) {
    const r = JSON.parse(l);
    for (const g of assessStockWeaponGroups(r).groups) if (/tractor/i.test(g.label) && !g.executable) still.push(g);
  }
  assert.ok(still.length > 0);
  for (const g of still) {
    assert.ok(g.reasons.length > 0);
    // none is blocked only by the notation any more; a remaining damage refusal comes with other, independent causes
    if (g.reasons.includes('STOCK_DAMAGE_NOT_PRINTED_IN_RECORD')) assert.ok(g.reasons.length > 1, g.groupKey);
  }
});

test('AUTOFIRE ON THE DAMAGE LINE: accepted only when it reconciles with the printed total by the -5 autofire penalty; every other qualifier still refuses', () => {
  const at = (total, notes, label = 'laser cannon') => parseStockFiringGroup({ groupKey: 'g', label, attackBonusPrinted: total, specialNotes: notes });
  // total 9, "+4 autofire": 9 - 4 = 5 (reconciles) -> no qualifier refusal, and the weapon is autofire-capable
  const ok = at(9, 'Published damage: 5d10, +4 autofire. Operator: pilot.');
  assert.ok(!ok.reasons.includes('STOCK_DAMAGE_QUALIFIED')); assert.equal(ok.damageLineAutofire, 4); assert.equal(ok.autofireCapable, true);
  assert.ok(!at(2, 'Published damage: 3d10, -3 autofire. Operator: gunner.').reasons.includes('STOCK_DAMAGE_QUALIFIED'));
  assert.ok(!at(5, 'Published damage: 4d10, +0 autofire. Operator: gunner.').reasons.includes('STOCK_DAMAGE_QUALIFIED'));
  // a figure that does NOT reconcile is not "corrected": the group stays refused
  const bad = at(9, 'Published damage: 5d10, +3 autofire. Operator: pilot.');
  assert.ok(bad.reasons.includes('STOCK_DAMAGE_QUALIFIED')); assert.equal(bad.damageLineAutofire, undefined); assert.ok(!bad.autofireCapable);
  // other qualifiers, and "autofire only" (no figure), stay refused
  assert.ok(at(9, 'Published damage: 3d10, autofire only. Operator: pilot.').reasons.includes('STOCK_DAMAGE_QUALIFIED'));
  assert.ok(at(7, 'Published damage: 5d10x5, heavy concussion warhead. Operator: gunner.').reasons.includes('STOCK_DAMAGE_QUALIFIED'));
  assert.ok(at(9, 'Published damage: 5d10, +4 autofire and stun. Operator: pilot.').reasons.includes('STOCK_DAMAGE_QUALIFIED'));
});

test('CORPUS: exactly three groups became executable through the damage-line autofire figure', () => {
  const got = [];
  for (const l of readFileSync('data/canonical/vehicles/vehicles.json', 'utf8').trim().split('\n')) {
    const r = JSON.parse(l);
    for (const g of assessStockWeaponGroups(r).groups) if (g.damageLineAutofire !== undefined) got.push([g.groupKey, g.executable, g.autofireCapable]);
  }
  assert.deepEqual(got.map(x => x[0]).sort(), ['cw-grievous-wheel-bike-modified-tsmeu-6-source-attack-1', 'cw-oevvaor-jet-catamaran-source-attack-1', 'cw-raddaugh-gnasp-fluttercraft-source-attack-1']);
  assert.ok(got.every(x => x[1] === true && x[2] === true));
});
