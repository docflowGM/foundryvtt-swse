import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { assessStockWeaponGroups } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';
import { resolveVehicleWeaponAuthority, resolveVehicleWeaponDamage } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';
import {
  BATTERY_MAX_WEAPONS, BATTERY_REASONS, batteryAssistanceBonus, batteryMarginHits, expandBatteryDamage, batteryAidsBattery,
  resolveBatteryAttackTotal, establishPublishedBattery, establishIndependentBatteryWeapon, resolveBatteryWeapons
} from '../scripts/domain/vehicles/vehicle-weapon-battery.js';

installSystemsResolver(); installFoundryStubs();
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { armStockWeaponsOnCreate } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');
const { planStockWeaponItemSync, executableModesOf } = await import('../scripts/domain/vehicles/vehicle-stock-weapon-items.js');
const { authorizeVehicleAttackBeforeCosts } = await import('../scripts/domain/vehicles/vehicle-attack-preflight.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');
const { encodeCombatWorkflowContext, decodeCombatWorkflowContext } = await import('../scripts/engine/combat/workflow/combat-context-serializer.js');

const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const keyOf = d => d.flags.swse.canonicalPublication.sourceEntryKey;
const recordOf = key => docs.find(d => keyOf(d) === key).flags.swse.universalVehicleSource.source;
const KRAYT = 'sotg-krayt-s-honor';

class Items extends Map {
  [Symbol.iterator]() { return this.values(); }
  get contents() { return [...this.values()]; }
  filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); }
}
const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });
let seq = 0;
async function armed(key) {
  const d = structuredClone(docs.find(x => keyOf(x) === key));
  const v = Object.assign(d, { id: 'veh1', isOwner: true, items: new Items(), getActiveTokens: () => [token(0, 0)], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const x of data) { const id = 'i' + (++seq); v.items.set(id, { id, ...structuredClone(x), actor: v }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) v.items.delete(id); };
  globalThis.game.user.id = 'u1';
  await armStockWeaponsOnCreate(v, {}, 'u1');
  return v;
}
const stockItems = v => [...v.items.values()].filter(i => i.flags?.swse?.vehicleStockWeapon);
const itemNamed = (v, name) => stockItems(v).find(i => i.name === name);
const target = (reflex = 15, id = 'tgt') => ({ id, type: 'character', items: [], system: { size: 'medium', defenses: { reflex: { total: reflex } } }, getActiveTokens: () => [token(300, 0)] });
const log = [];
globalThis.ui = { notifications: { warn: m => log.push(String(m)), error: m => log.push('ERR ' + m), info() {} } };
globalThis.game.settings = { get: () => undefined };

/** Fire with a fixed natural d20 (the dice are the only thing replaced). */
async function fireWithD20(vehicle, weapon, d20, reflex) {
  const real = RollEngine.safeRoll;
  RollEngine.safeRoll = async formula => { const b = Number(/1d20\s*\+\s*(-?\d+)/.exec(String(formula))?.[1] ?? 0); const total = d20 + b; return { total, formula, dice: [{ results: [{ result: d20 }] }], toJSON() { return { total, formula }; } }; };
  log.length = 0;
  try { return { result: await rollAttack(vehicle, weapon, { abstractCrewQuality: 'normal', target: target(reflex) }), log: [...log] }; }
  finally { RollEngine.safeRoll = real; }
}
const damageFormula = (v, w, ctx = {}) => buildDamageFormula(resolveDamageComposition(v, w, { weapon: w, ...ctx }));

// ---------------------------------------------------------------------------------------------------------------------
// The battery arithmetic (pure): Core p. 170, owner-verified
// ---------------------------------------------------------------------------------------------------------------------
test('ASSISTANCE: the first assisting gunner gives +2, each additional +2 (2 gunners +2, 3 +4, 4 +6, 6 +10)', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(n => batteryAssistanceBonus(n).bonus), [0, 2, 4, 6, 8, 10]);
  assert.equal(batteryAssistanceBonus(3).assistingGunners, 2);
  for (const bad of [0, 7, 2.5, -1, null, '3']) assert.equal(batteryAssistanceBonus(bad).reason, BATTERY_REASONS.GUNNERS_OUT_OF_RANGE, String(bad));
  assert.equal(BATTERY_MAX_WEAPONS, 6);
});

test('MARGIN HITS: one extra weapon per full 3 points over Reflex Defense; exactly Reflex hits with none; capped by the weapons present', () => {
  const m = (total, def, weapons = 6, hit = true) => batteryMarginHits({ attackTotal: total, targetDefense: def, hit, participatingWeapons: weapons });
  assert.equal(m(20, 20).extraHits, 0, 'exactly Reflex');
  assert.equal(m(22, 20).extraHits, 0, 'exceeds by 2');
  assert.equal(m(23, 20).extraHits, 1, 'by 3');
  assert.equal(m(25, 20).extraHits, 1, 'by 5');
  assert.equal(m(26, 20).extraHits, 2, 'by 6');
  assert.equal(m(35, 20).extraHits, 5, '15 over would be 5 hits');
  assert.equal(m(60, 20, 6).extraHits, 5, 'never more than the other five weapons');
  assert.equal(m(60, 20, 3).extraHits, 2, 'a three-weapon battery has two extra weapons at most');
  assert.equal(m(60, 20, 1).extraHits, 0, 'a single weapon has none');
  assert.equal(m(60, 20, 6, false).extraHits, 0, 'a miss produces none');
  assert.equal(m(10, 20, 6, true).extraHits, 0, 'a natural-20 hit under the defense has no margin');
  assert.equal(m(60, 20, 7).reason, BATTERY_REASONS.WEAPONS_OUT_OF_RANGE, 'a battery has at most six weapons');
  assert.equal(m(60, 20, 0).reason, BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
  assert.equal(batteryMarginHits({ attackTotal: NaN, targetDefense: 1, hit: true, participatingWeapons: 3 }).reason, BATTERY_REASONS.INVALID_INPUT);
});

test('DAMAGE DICE: each extra hit adds ONE weapon die BEFORE the multiplier; extra hits can never exceed the participating weapons', () => {
  const base = { dice: 5, die: 10, multiplier: 5 };
  assert.deepEqual(expandBatteryDamage(base, 2, 6), { ok: true, dice: 7, die: 10, formula: '7d10', multiplier: 5, extraDice: 2 }, '(5d10 + 2d10) x 5');
  assert.equal(expandBatteryDamage(base, 0, 3).formula, '5d10');
  assert.equal(expandBatteryDamage(base, 5, 6).formula, '10d10');
  assert.equal(expandBatteryDamage(base, 3, 3).reason, BATTERY_REASONS.EXTRA_HITS_EXCEED_PARTICIPATING_WEAPONS, 'three weapons: two extra at most');
  assert.equal(expandBatteryDamage({ dice: 3, die: 10 }, 1, 2).multiplier, 1, 'an omitted multiplier stays x1');
  assert.equal(expandBatteryDamage(base, -1, 3).reason, BATTERY_REASONS.INVALID_INPUT);
});

test('BATTERY AIDING BATTERY: attack vs Reflex 10; +2 per two weapons of the assisting battery; no margin hits from assisting weapons', () => {
  assert.deepEqual(batteryAidsBattery({ attackTotal: 9, assistingWeapons: 6 }), { ok: true, succeeded: false, defense: 10, bonus: 0, marginHits: 0 });
  assert.equal(batteryAidsBattery({ attackTotal: 10, assistingWeapons: 6 }).bonus, 6, 'meeting 10 succeeds');
  assert.equal(batteryAidsBattery({ attackTotal: 40, assistingWeapons: 6 }).marginHits, 0, 'however high the roll, assisting weapons make no margin hits');
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(w => batteryAidsBattery({ attackTotal: 12, assistingWeapons: w }).bonus), [0, 2, 2, 4, 4, 6]);
  assert.equal(batteryAidsBattery({ attackTotal: 12, assistingWeapons: 7 }).reason, BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
});

test('CREW AUTHORITY: published totals already contain assistance; assigned crews compute their own; independent firing has none', () => {
  // Krayt's Honor turbolaser battery: printed +13 with 3 gunners = single gunner +9 plus 2 assisting x 2
  const published = resolveBatteryAttackTotal({ crew: 'published', publishedTotal: 13, printedGunners: 3 });
  assert.deepEqual([published.total, published.includedAssistance, published.singleGunnerTotal, published.appliedAssistance, published.marginHitsPossible], [13, 4, 9, 0, true]);
  // an assigned crew uses the primary gunner's OWN total + the assistance of the gunners actually assisting; the published modifier is not used
  const assigned1 = resolveBatteryAttackTotal({ crew: 'assigned', primaryTotal: 7, assistingGunners: 0, publishedTotal: 13, printedGunners: 3 });
  assert.deepEqual([assigned1.total, assigned1.appliedAssistance], [7, 0], 'a lone gunner gets no assistance and not the published +13');
  const assigned3 = resolveBatteryAttackTotal({ crew: 'assigned', primaryTotal: 7, assistingGunners: 2 });
  assert.deepEqual([assigned3.total, assigned3.appliedAssistance], [11, 4]);
  assert.equal(resolveBatteryAttackTotal({ crew: 'assigned', primaryTotal: 7, assistingGunners: 6 }).reason, BATTERY_REASONS.GUNNERS_OUT_OF_RANGE, 'seven gunners are not a battery');
  // independent firing: one weapon alone, no battery assistance, no margin hits
  const independent = resolveBatteryAttackTotal({ crew: 'independent', publishedTotal: 13, printedGunners: 3 });
  assert.deepEqual([independent.total, independent.marginHitsPossible], [9, false]);
  assert.equal(resolveBatteryAttackTotal({ crew: 'nobody' }).reason, BATTERY_REASONS.INVALID_INPUT);
});

test('WEAPONS AND GUNNERS are independent quantities (owner direction V-P6C-02): no equality is required, nothing is inferred', () => {
  assert.equal(establishPublishedBattery({ gunners: 3, weaponCount: 3 }).ok, true);
  assert.equal(establishPublishedBattery({ gunners: 3, weaponCount: 3 }).maxExtraHits, 2);
  // more gunners than weapons, fewer gunners than weapons, a single weapon: all legal; the counts are separate facts
  assert.deepEqual(['5/3', '2/6', '6/1'].map(k => { const [g, w] = k.split('/').map(Number); const r = establishPublishedBattery({ gunners: g, weaponCount: w }); return [r.ok, r.participatingWeapons, r.maxExtraHits]; }), [[true, 3, 2], [true, 6, 5], [true, 1, 0]]);
  assert.equal(establishPublishedBattery({ gunners: 5, weaponCount: null }).reason, BATTERY_REASONS.WEAPON_COUNT_NOT_STATED, 'full-battery mode never guesses the weapons from the gunners');
  assert.equal(establishPublishedBattery({ gunners: 3, weaponCount: 7 }).reason, BATTERY_REASONS.WEAPONS_OUT_OF_RANGE, 'a battery is at most six identical weapons');
  assert.equal(establishPublishedBattery({ gunners: 3, weaponCount: 0 }).reason, BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
  assert.equal(establishPublishedBattery({ gunners: 1, weaponCount: 1 }).reason, BATTERY_REASONS.GUNNERS_OUT_OF_RANGE);
  assert.equal(BATTERY_REASONS.GUNNERS_NOT_EQUAL_WEAPONS, undefined, 'the invented equality refusal no longer exists');
});

test('WEAPON QUANTITIES: total, available and participating weapons are separate; participation never exceeds availability', () => {
  assert.deepEqual(resolveBatteryWeapons({ totalWeapons: 6 }), { ok: true, totalWeapons: 6, availableWeapons: 6, participatingWeapons: 6, maxExtraHits: 5 });
  assert.deepEqual(resolveBatteryWeapons({ totalWeapons: 6, availableWeapons: 4 }), { ok: true, totalWeapons: 6, availableWeapons: 4, participatingWeapons: 4, maxExtraHits: 3 }, 'two destroyed weapons cannot fire');
  assert.deepEqual(resolveBatteryWeapons({ totalWeapons: 6, availableWeapons: 4, participatingWeapons: 2 }).maxExtraHits, 1);
  assert.equal(resolveBatteryWeapons({ totalWeapons: 4, availableWeapons: 5 }).reason, BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
  assert.equal(resolveBatteryWeapons({ totalWeapons: 4, availableWeapons: 3, participatingWeapons: 4 }).reason, BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
  assert.equal(resolveBatteryWeapons({ totalWeapons: 7 }).reason, BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
});

test('INDEPENDENT WEAPON (Core p. 170): one weapon, no assistance, no margin hits; needs only the printed gunners, never a weapon count', () => {
  assert.deepEqual(establishIndependentBatteryWeapon({ gunners: 5 }), { ok: true, mode: 'independent-weapon', gunners: 5, removedAssistance: 8, participatingWeapons: 1, maxExtraHits: 0 });
  assert.equal(establishIndependentBatteryWeapon({ gunners: 1 }).reason, BATTERY_REASONS.GUNNERS_OUT_OF_RANGE);
  assert.equal(establishIndependentBatteryWeapon({}).reason, BATTERY_REASONS.GUNNERS_OUT_OF_RANGE);
  // with one participating weapon there is no extra hit however high the margin
  assert.equal(batteryMarginHits({ attackTotal: 99, targetDefense: 10, hit: true, participatingWeapons: 1 }).extraHits, 0);
});

// ---------------------------------------------------------------------------------------------------------------------
// The stock gate against the real published records
// ---------------------------------------------------------------------------------------------------------------------
test('STOCK GATE: Krayt\'s Honor turbolaser battery (3 gunners, three turbolasers printed) runs in BOTH modes, counted once', () => {
  const groups = assessStockWeaponGroups(recordOf(KRAYT)).groups;
  const tb = groups.find(g => g.label === 'turbolaser battery');
  assert.equal(tb.executable, true, tb.reasons.join(','));
  assert.deepEqual([tb.damage.raw, tb.operator, tb.attackBonusPrinted], ['5d10x5', 'gunner', 13]);
  assert.deepEqual([tb.battery.gunners, tb.battery.weaponCount, tb.battery.fullBattery, tb.battery.independentWeapon, tb.battery.participatingWeapons, tb.battery.maxExtraHits], [3, 3, true, true, 3, 2]);
  assert.match(tb.battery.weaponCountBasis, /THREE turbolasers/);
  assert.deepEqual(executableModesOf(tb), ['full-battery', 'independent-weapon']);
  assert.equal(tb.modes['full-battery'].attackBasis.kind, 'BAB_PLUS_INT_PLUS_BATTERY_ASSISTANCE');
  assert.deepEqual(tb.modes['full-battery'].attackBasis.components.map(c => [c.id, c.value]), [['crew-bab', 5], ['vehicle-int', 4], ['battery-assistance', 4]], '5 + 4 + two assisting gunners = 13');
  const ind = tb.modes['independent-weapon'].attackBasis;
  assert.deepEqual([ind.kind, ind.printed, ind.publishedPrinted, ind.removedAssistance], ['BAB_PLUS_INT_BATTERY_ASSISTANCE_REMOVED', 9, 13, 4], 'the printed 13 minus exactly the 2 x 2 assistance = BAB + Int');
  assert.deepEqual(ind.components.map(c => c.id), ['crew-bab', 'vehicle-int']);
  // the same ship\'s other batteries print gunners but not the number of weapons: INDEPENDENT-WEAPON only
  for (const [label, gunners] of [['laser cannon battery', 4], ['quad laser cannon battery', 2]]) {
    const g = groups.find(x => x.label === label);
    assert.equal(g.executable, true, `${label}: ${g.reasons}`);
    assert.deepEqual(executableModesOf(g), ['independent-weapon'], label);
    assert.deepEqual(g.modes['full-battery'].reasons, ['STOCK_BATTERY_WEAPON_COUNT_NOT_STATED'], 'the full battery needs a printed weapon count');
    assert.equal(g.battery.gunners, gunners);
    assert.equal(g.modes['independent-weapon'].attackBasis.printed, 9);
  }
  assert.equal(groups.find(g => g.label === 'proton torpedoes').executable, false, 'finite ammunition stays refused');
});

test('STOCK GATE: capital-ship batteries (Munificent) run as one independent weapon; Rendili is refused only for its flank-turret arc', () => {
  const mun = assessStockWeaponGroups(recordOf('sotg-banking-clan-munificent-class-frigate')).groups;
  const twin = mun.find(g => g.label === 'twin turbolaser battery');
  assert.equal(twin.executable, true, twin.reasons.join(','));
  assert.deepEqual(executableModesOf(twin), ['independent-weapon']);
  assert.equal(twin.modes['full-battery'].executable, false);
  assert.equal(twin.attackBasis.kind, 'BAB_PLUS_INT_PLUS_BATTERY_ASSISTANCE', 'its printed +15 IS fully explained: 2 + 5 + four assisting gunners at +2');
  assert.deepEqual([twin.modes['independent-weapon'].attackBasis.printed, twin.modes['independent-weapon'].attackBasis.removedAssistance], [7, 8]);
  const ren = assessStockWeaponGroups(recordOf('sotg-rendili-star-drive-light-corvette')).groups.find(g => g.label === 'double laser cannon battery');
  assert.deepEqual([ren.battery.fullBattery, ren.battery.independentWeapon], [true, true], 'six gunners and six turrets are printed');
  assert.deepEqual(ren.reasons, ['STOCK_FIRING_ARC_STATED_UNPARSED'], 'refused (both modes) only for the flank-turret arc');
});

test('STOCK GATE: the counts are independent; facts that do not reconcile are refused, not repaired (assessment of altered copies)', () => {
  const alter = (key, label, f) => {
    const r = structuredClone(recordOf(key));
    const g = r.armament.firingGroups.find(x => x.label === label);
    const groupKey = g.groupKey;
    f(g, r); return assessStockWeaponGroups(r).groups.find(x => x.groupKey === groupKey);
  };
  const MUN = 'sotg-banking-clan-munificent-class-frigate', TWIN = 'twin turbolaser battery';
  const withW = w => g => { g.specialNotes = g.specialNotes.replace('"hardwareCount":"SOURCE_SILENT_CONFIRMED"', `"hardwareCount":${w}`); };
  // five gunners and FIVE weapons, FOUR weapons, SIX weapons: all legal for the full battery (a capital ship, so the -20 check applies)
  for (const w of [5, 4, 6, 2, 1]) {
    const g = alter(MUN, TWIN, withW(w));
    assert.deepEqual(executableModesOf(g), ['full-battery', 'independent-weapon'], `5 gunners / ${w} weapons: ${g.reasons}`);
    assert.deepEqual([g.battery.participatingWeapons, g.battery.maxExtraHits], [w, w - 1]);
  }
  // seven weapons: not a battery in full-battery mode, but the independent weapon still stands
  const seven = alter(MUN, TWIN, withW(7));
  assert.deepEqual(executableModesOf(seven), ['independent-weapon']);
  assert.deepEqual(seven.modes['full-battery'].reasons, ['STOCK_BATTERY_WEAPON_COUNT_OUT_OF_RANGE']);
  // a printed total that is not exactly BAB + Int + the assistance: NEITHER mode can remove the assistance authoritatively
  const off = alter(MUN, TWIN, (g, r) => { withW(5)(g); g.attackBonusPrinted = 16; });
  assert.equal(off.executable, false);
  assert.ok(off.reasons.includes('STOCK_ATTACK_TOTAL_UNEXPLAINED_DELTA'));
  assert.equal(off.modes['independent-weapon'].attackBasis, null, 'no authoritative baseline');
  // a gunner count outside 2..6 breaks both modes
  const sevenGunners = alter(MUN, TWIN, g => { g.specialNotes = g.specialNotes.replace('battery (5 gunners)', 'battery (7 gunners)'); });
  assert.equal(sevenGunners.executable, false);
  assert.ok(sevenGunners.reasons.includes('STOCK_BATTERY_GUNNER_COUNT_OUT_OF_RANGE'));
  // not printed as a weapon battery: stays refused as a multi-gunner station
  const notBattery = alter(KRAYT, 'turbolaser battery', g => { g.groupKind = 'unknown'; g.batteryMembershipStatus = 'not-stated'; });
  assert.equal(notBattery.executable, false);
  assert.ok(notBattery.reasons.includes('STOCK_OPERATOR_IS_A_STATION_BATTERY'));
  // fire-linked weapons loosely called "batteries" are NOT weapon batteries (SotG, Fire-Linked Weapons): never routed to battery rules
  const fireLinked = alter(KRAYT, 'turbolaser battery', g => { g.label = 'fire-linked turbolaser battery'; });
  assert.equal(fireLinked.executable, false);
  assert.ok(fireLinked.reasons.includes('STOCK_FIRE_LINKED_IS_NOT_A_WEAPON_BATTERY'));
  assert.equal(fireLinked.battery, undefined);
});

test('ITEM SYNC: one Item per executable MODE, idempotent; a battery\'s independent weapon is plainly labelled', () => {
  const rec = recordOf(KRAYT);
  const plan = planStockWeaponItemSync({ items: [], record: rec });
  assert.deepEqual(plan.create.map(i => [i.name, i.flags.swse.vehicleStockWeapon.fireMode ?? 'single']).sort((a, b) => a[0].localeCompare(b[0])),
    [['laser cannon battery (single weapon)', 'independent-weapon'], ['quad laser cannon battery (single weapon)', 'independent-weapon'], ['turbolaser battery', 'full-battery'], ['turbolaser battery (single weapon)', 'independent-weapon']]);
  const made = plan.create.map((d, n) => ({ id: 'i' + n, ...structuredClone(d) }));
  assert.deepEqual(planStockWeaponItemSync({ items: made, record: rec }), { create: [], deleteIds: [] }, 'already in sync');
  // a flipped mode flag is a stale Item: replaced, not trusted
  const full = made.find(i => i.name === 'turbolaser battery');
  full.flags.swse.vehicleStockWeapon.fireMode = 'independent-weapon';
  const resync = planStockWeaponItemSync({ items: made, record: rec });
  assert.deepEqual(resync.deleteIds, [full.id], 'the Item whose mode no longer matches its identity is replaced');
  assert.deepEqual(resync.create.map(i => i.name), ['turbolaser battery'], 'and the full battery is recreated');
});

// ---------------------------------------------------------------------------------------------------------------------
// End to end on the real published ship: arm -> attack -> card context -> damage
// ---------------------------------------------------------------------------------------------------------------------
test('RUNTIME: the battery is armed per executable MODE as owned Items mirroring the source; the printed total is applied once with assistance shown as included', async () => {
  const v = await armed(KRAYT);
  assert.deepEqual(stockItems(v).map(i => i.name).sort(), ['laser cannon battery (single weapon)', 'quad laser cannon battery (single weapon)', 'turbolaser battery', 'turbolaser battery (single weapon)']);
  const w = itemNamed(v, 'turbolaser battery');
  const a = resolveVehicleWeaponAuthority(w);
  assert.deepEqual([a.ok, a.origin, a.operator, a.battery.participatingWeapons], [true, 'stock', 'gunner', 3]);
  const r = await fireWithD20(v, w, 10, 15);
  assert.ok(r.result, r.log.join('|'));
  assert.equal(r.result.atkBonus, 13, 'Colossal (not a capital ship): the printed +13 and nothing else');
  const L = r.result.componentLedger;
  assert.equal(L.find(e => e.id === 'published-statblock-attack').value, 13);
  assert.equal(L.find(e => e.id === 'included-battery-assistance').applied, false, 'assistance is shown, never added again');
  assert.equal(L.filter(e => e.applied).reduce((s, e) => s + e.value, 0), 13);
});

test('RUNTIME independent weapon: ONE weapon on the printed total minus exactly the battery assistance; no margin hits however high the roll', async () => {
  const v = await armed(KRAYT); const one = itemNamed(v, 'turbolaser battery (single weapon)');
  const a = resolveVehicleWeaponAuthority(one);
  assert.deepEqual([a.ok, a.operator, a.battery], [true, 'gunner', undefined], 'no battery rules ride on the independent weapon');
  const r = await fireWithD20(v, one, 20, 5);                       // enormous margin
  assert.ok(r.result, r.log.join('|'));
  assert.equal(r.result.atkBonus, 9, '13 printed - 4 assistance = BAB 5 + Int 4');
  const L = r.result.componentLedger;
  assert.equal(L.find(e => e.id === 'published-statblock-attack').value, 9);
  assert.equal(L.some(e => e.id === 'included-battery-assistance'), false, 'the assistance is not part of this attack at all');
  assert.equal(L.filter(e => e.applied).reduce((s, e) => s + e.value, 0), 9);
  assert.equal(r.result.workflowContext.battery, undefined, 'no battery outcome');
  assert.equal(damageFormula(v, one, { combatContext: r.result.workflowContext }), '(5d10) * 5', 'one weapon\'s damage');
  assert.throws(() => damageFormula(v, one, { combatContext: { battery: { extraHits: 1 } } }), /BATTERY_EXTRA_HITS_ON_A_NON_BATTERY/, 'a card cannot give it extra hits');
  assert.deepEqual(resolveVehicleWeaponDamage(one), { ok: true, formula: '5d10', multiplier: 5, damageType: null, printed: '5d10x5' });
  // the battery Item of the same group is a different thing: it still gets the assistance and the margin hits
  const full = await fireWithD20(v, itemNamed(v, 'turbolaser battery'), 20, 5);
  assert.equal(full.result.atkBonus, 13);
  assert.equal(full.result.workflowContext.battery.extraHits, 2);
  // an edited or mislabelled Item is refused
  const bad = itemNamed(v, 'laser cannon battery (single weapon)');
  bad.name = 'laser cannon battery';
  assert.equal(resolveVehicleWeaponAuthority(bad).reason, 'STOCK_WEAPON_ITEM_NAME_MISMATCH');
  const wrongMode = itemNamed(v, 'quad laser cannon battery (single weapon)');
  wrongMode.flags.swse.vehicleStockWeapon.fireMode = 'full-battery';
  assert.match(resolveVehicleWeaponAuthority(wrongMode).reason, /STOCK_WEAPON_MODE_NOT_EXECUTABLE/, 'the source does not support the full battery for this group');
  wrongMode.flags.swse.vehicleStockWeapon.fireMode = undefined;
  assert.equal(resolveVehicleWeaponAuthority(wrongMode).reason, 'STOCK_WEAPON_ITEM_FIRE_MODE_MISMATCH');
});

test('RUNTIME capital ship: the Munificent twin turbolaser battery fires one weapon on BAB + Int with the Core -20 applied once', async () => {
  const v = await armed('sotg-banking-clan-munificent-class-frigate');
  const one = itemNamed(v, 'twin turbolaser battery (single weapon)');
  assert.ok(one, 'armed');
  assert.equal(itemNamed(v, 'twin turbolaser battery'), undefined, 'the full battery is not armed: the weapon count is not printed');
  const r = await fireWithD20(v, one, 10, 15);
  assert.ok(r.result, r.log.join('|'));
  assert.equal(r.result.atkBonus, 7 - 20, 'printed +15 less the 4 assisting gunners at +2, less the capital-ship -20');
  const L = r.result.componentLedger;
  assert.equal(L.filter(e => e.id === 'capital-ship-attack-penalty').length, 1);
  assert.deepEqual(L.filter(e => /^included-/.test(e.id)).map(e => [e.id, e.value]), [['included-crew-bab', 2], ['included-vehicle-int', 5]]);
  assert.equal(damageFormula(v, one, {}), '(4d10) * 5');
  assert.equal(r.result.workflowContext.battery, undefined);
});

test('RUNTIME margin hits: the attack margin over Reflex becomes extra weapon dice before the x5 multiplier, on the one damage authority', async () => {
  const v = await armed(KRAYT); const w = itemNamed(v, 'turbolaser battery');
  const cases = [  // [natural d20, target Reflex, extra hits, damage formula]   attack total = d20 + 13
    [2, 15, 0, '(5d10) * 5'],          // 15 = Reflex exactly: a hit with no extra weapon
    [4, 15, 0, '(5d10) * 5'],          // exceeds by 2
    [5, 15, 1, '(6d10) * 5'],          // by 3
    [7, 15, 1, '(6d10) * 5'],          // by 5
    [8, 15, 2, '(7d10) * 5'],          // by 6 -> two extra weapons = (5d10 + 2d10) x 5
    [20, 5, 2, '(7d10) * 5']           // enormous margin: capped by the three weapons present
  ];
  for (const [d20, reflex, hits, formula] of cases) {
    const r = await fireWithD20(v, w, d20, reflex);
    assert.ok(r.result, r.log.join('|'));
    assert.equal(r.result.isHit, true, `d20 ${d20} vs ${reflex}`);
    assert.equal(r.result.workflowContext.battery?.extraHits ?? 0, hits, `d20 ${d20} vs ${reflex}`);
    assert.equal(damageFormula(v, w, { combatContext: r.result.workflowContext }), formula, `d20 ${d20} vs ${reflex}`);
    assert.doesNotMatch(damageFormula(v, w, { combatContext: r.result.workflowContext }), /x\d/, 'never exploding dice');
  }
  // the outcome survives the chat-card round trip (the Damage button decodes it from the card)
  const hit = await fireWithD20(v, w, 8, 15);
  const decoded = decodeCombatWorkflowContext(encodeCombatWorkflowContext(hit.result.workflowContext));
  assert.equal(decoded.battery.extraHits, 2);
  assert.equal(damageFormula(v, w, { combatContext: decoded }), '(7d10) * 5');
  // a critical doubles the multiplied total once (no extra multiplier, no extra dice)
  assert.equal(damageFormula(v, w, { combatContext: decoded, isCritical: true }), '((7d10) * 5) * 2');
  // the damage ledger records the extra dice as already included
  const comp = resolveDamageComposition(v, w, { weapon: w, combatContext: decoded });
  assert.deepEqual(comp.ledger.filter(e => e.id === 'battery-extra-hit-dice').map(e => [e.value, e.applied]), [[2, false]]);
});

test('RUNTIME: a miss and a natural 1 carry no margin hits; a card cannot claim more hits than weapons, or any hits for a non-battery weapon', async () => {
  const v = await armed(KRAYT); const w = itemNamed(v, 'turbolaser battery');
  const miss = await fireWithD20(v, w, 1, 5);                       // natural 1 against Reflex 5: always a miss
  assert.equal(miss.result.isHit, false);
  assert.equal(miss.result.workflowContext.battery?.extraHits ?? 0, 0);
  const low = await fireWithD20(v, w, 2, 40);                       // 15 vs 40
  assert.equal(low.result.isHit, false);
  assert.equal(low.result.workflowContext.battery?.extraHits ?? 0, 0);
  const forged = { battery: { extraHits: 3 } };                     // three extra hits need four weapons
  assert.throws(() => damageFormula(v, w, { combatContext: forged }), /BATTERY_EXTRA_HITS_EXCEED_PARTICIPATING_WEAPONS/);
  assert.throws(() => damageFormula(v, w, { batteryExtraHits: 'two' }), /BATTERY_INVALID_INPUT|ordinary damage/);
  // a non-battery stock weapon refuses any claimed hits
  const xw = await armed('core-incom-t-65b-x-wing-starfighter'); const xwLaser = stockItems(xw)[0];
  assert.equal(damageFormula(xw, xwLaser, {}), '(6d10) * 2');
  assert.throws(() => damageFormula(xw, xwLaser, { combatContext: { battery: { extraHits: 1 } } }), /BATTERY_EXTRA_HITS_ON_A_NON_BATTERY/);
  assert.deepEqual(resolveVehicleWeaponDamage(xwLaser, { batteryExtraHits: 1 }), { ok: false, reason: BATTERY_REASONS.EXTRA_HITS_ON_A_NON_BATTERY });
  // the edited Item changes nothing
  w.system.damage = '99d10x9';
  assert.throws(() => damageFormula(v, w, {}), /STOCK_WEAPON_ITEM_DAMAGE_DIVERGES_FROM_SOURCE|ordinary damage/);
});

test('RUNTIME crew: generic (published) crew may fire the full battery; a named gunner is refused there (no assisting roster) but may fire the independent weapon', async () => {
  const v = await armed(KRAYT); const w = itemNamed(v, 'turbolaser battery');
  const t = target(15);
  const gm = { isGM: true };
  const abstract = await authorizeVehicleAttackBeforeCosts({ vehicle: v, weapon: w, target: t, attackId: 'a1', crewStationResolved: true, user: gm, operatorActor: null });
  assert.equal(abstract.ok, true, abstract.reason);
  const gunner = { id: 'g1', name: 'Gunner', type: 'character', isOwner: true, items: [], system: {}, getRollData: () => ({}) };
  const named = await authorizeVehicleAttackBeforeCosts({ vehicle: v, weapon: w, target: t, attackId: 'a2', crewStationResolved: true, user: gm, operatorActor: gunner });
  assert.deepEqual([named.ok, named.reason], [false, BATTERY_REASONS.ASSIGNED_CREW_ROSTER_UNMODELED]);
  // the INDEPENDENT weapon is an ordinary single-weapon attack and accepts a named gunner (it needs no roster)
  const one = itemNamed(v, 'turbolaser battery (single weapon)');
  const ind = await authorizeVehicleAttackBeforeCosts({ vehicle: v, weapon: one, target: t, attackId: 'a2b', crewStationResolved: true, user: gm, operatorActor: gunner });
  assert.equal(ind.ok, true, ind.reason);
  // a single-operator stock weapon keeps accepting its named gunner (the refusal is specific to the full battery)
  const xw = await armed('core-incom-t-65b-x-wing-starfighter'); const xwLaser = stockItems(xw)[0];
  const ok = await authorizeVehicleAttackBeforeCosts({ vehicle: xw, weapon: xwLaser, target: t, attackId: 'a3', crewStationResolved: true, user: gm, operatorActor: gunner });
  assert.equal(ok.ok, true, ok.reason);
});

test('COVERAGE: batteries are counted once per group; full-battery and independent-weapon are reported apart', () => {
  const all = docs.flatMap(d => assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.map(g => ({ key: keyOf(d), g })));
  const batteries = all.filter(x => x.g.battery);
  assert.equal(batteries.length, 274);
  const exec = batteries.filter(x => x.g.executable);
  assert.equal(exec.length, 202, 'groups executable in at least one mode, each counted once');
  assert.deepEqual(batteries.filter(x => x.g.modes['full-battery'].executable).map(x => `${x.key}:${x.g.label}`), [`${KRAYT}:turbolaser battery`], 'full-battery needs the printed weapon count');
  assert.equal(batteries.filter(x => x.g.modes['independent-weapon'].executable).length, 202);
  assert.equal(exec.filter(x => executableModesOf(x.g).length === 2).length, 1);
  assert.equal(batteries.filter(x => x.g.battery.weaponCount !== null).length, 2, 'only Krayt\'s Honor and the Rendili corvette print a weapon count');
  assert.equal(all.filter(x => x.g.executable).length, 528, 'the corpus total counts each group once, whatever its modes');
  // every refused battery group carries named reasons; the fire-linked guard matched nothing in the published corpus
  assert.ok(batteries.filter(x => !x.g.executable).every(x => x.g.reasons.length > 0));
  assert.equal(all.filter(x => x.g.reasons.includes('STOCK_FIRE_LINKED_IS_NOT_A_WEAPON_BATTERY')).length, 0);
});
