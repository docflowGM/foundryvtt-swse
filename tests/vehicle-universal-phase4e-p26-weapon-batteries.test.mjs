import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { assessStockWeaponGroups } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';
import { resolveVehicleWeaponAuthority, resolveVehicleWeaponDamage } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';
import {
  BATTERY_MAX_WEAPONS, BATTERY_REASONS, batteryAssistanceBonus, batteryMarginHits, expandBatteryDamage, batteryAidsBattery,
  resolveBatteryAttackTotal, establishPublishedBattery
} from '../scripts/domain/vehicles/vehicle-weapon-battery.js';

installSystemsResolver(); installFoundryStubs();
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { armStockWeaponsOnCreate } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');
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

test('ESTABLISHING a published battery: gunners AND the identical-weapon count must both be printed and agree; nothing is inferred', () => {
  assert.equal(establishPublishedBattery({ gunners: 3, weaponCount: 3 }).ok, true);
  assert.equal(establishPublishedBattery({ gunners: 3, weaponCount: 3 }).maxExtraHits, 2);
  assert.equal(establishPublishedBattery({ gunners: 5, weaponCount: null }).reason, BATTERY_REASONS.WEAPON_COUNT_NOT_STATED, 'a source that states only gunners does not state the weapons');
  assert.equal(establishPublishedBattery({ gunners: 3, weaponCount: 4 }).reason, BATTERY_REASONS.GUNNERS_NOT_EQUAL_WEAPONS);
  assert.equal(establishPublishedBattery({ gunners: 3, weaponCount: 7 }).reason, BATTERY_REASONS.WEAPONS_OUT_OF_RANGE);
  assert.equal(establishPublishedBattery({ gunners: 1, weaponCount: 1 }).reason, BATTERY_REASONS.GUNNERS_OUT_OF_RANGE);
});

// ---------------------------------------------------------------------------------------------------------------------
// The stock gate against the real published records
// ---------------------------------------------------------------------------------------------------------------------
test('STOCK GATE: Krayt\'s Honor turbolaser battery (3 gunners, three turbolasers printed) is the one executable published battery', () => {
  const groups = assessStockWeaponGroups(recordOf(KRAYT)).groups;
  const tb = groups.find(g => g.label === 'turbolaser battery');
  assert.equal(tb.executable, true, tb.reasons.join(','));
  assert.deepEqual([tb.damage.raw, tb.operator, tb.attackBonusPrinted], ['5d10x5', 'gunner', 13]);
  assert.deepEqual([tb.battery.gunners, tb.battery.weaponCount, tb.battery.established, tb.battery.participatingWeapons, tb.battery.maxExtraHits], [3, 3, true, 3, 2]);
  assert.match(tb.battery.weaponCountBasis, /THREE turbolasers/);
  assert.equal(tb.attackBasis.kind, 'BAB_PLUS_INT_PLUS_BATTERY_ASSISTANCE');
  assert.deepEqual(tb.attackBasis.components.map(c => [c.id, c.value]), [['crew-bab', 5], ['vehicle-int', 4], ['battery-assistance', 4]], '5 + 4 + two assisting gunners = 13');
  // the same ship's other batteries print gunners but not the number of weapons: refused by name, not by guess
  for (const label of ['laser cannon battery', 'quad laser cannon battery']) {
    const g = groups.find(x => x.label === label);
    assert.equal(g.executable, false);
    assert.ok(g.reasons.includes('STOCK_BATTERY_WEAPON_COUNT_NOT_STATED'), `${label}: ${g.reasons}`);
    assert.equal(g.reasons.includes('STOCK_GROUP_IS_A_WEAPON_BATTERY'), false, 'a printed battery is no longer refused as "a battery"');
  }
  assert.equal(groups.find(g => g.label === 'proton torpedoes').executable, false, 'finite ammunition stays refused');
});

test('STOCK GATE: capital-ship batteries print gunners only (Munificent) or fail another gate (Rendili: flank turrets); nothing is inferred', () => {
  const mun = assessStockWeaponGroups(recordOf('sotg-banking-clan-munificent-class-frigate')).groups.find(g => g.label === 'twin turbolaser battery');
  assert.equal(mun.executable, false);
  assert.deepEqual(mun.reasons, ['STOCK_BATTERY_WEAPON_COUNT_NOT_STATED']);
  assert.equal(mun.attackBasis.kind, 'BAB_PLUS_INT_PLUS_BATTERY_ASSISTANCE', 'its printed +15 IS fully explained: 2 + 5 + four assisting gunners');
  const ren = assessStockWeaponGroups(recordOf('sotg-rendili-star-drive-light-corvette')).groups.find(g => g.label === 'double laser cannon battery');
  assert.equal(ren.battery.established, true, 'six gunners and six turrets are printed');
  assert.deepEqual(ren.reasons, ['STOCK_FIRING_ARC_STATED_UNPARSED'], 'refused only for the flank-turret arc');
});

test('STOCK GATE: facts that disagree or do not reconcile are refused, not repaired (assessment of altered copies; nothing is armed)', () => {
  const alter = (key, label, f) => {
    const r = structuredClone(recordOf(key));
    const g = r.armament.firingGroups.find(x => x.label === label);
    f(g, r); return assessStockWeaponGroups(r).groups.find(x => x.label === label);
  };
  // Munificent twin turbolaser battery is a capital-ship battery: with the weapon count printed it passes every gate, incl. the -20 check
  const withCount = alter('sotg-banking-clan-munificent-class-frigate', 'twin turbolaser battery', g => { g.specialNotes = g.specialNotes.replace('"hardwareCount":"SOURCE_SILENT_CONFIRMED"', '"hardwareCount":5'); });
  assert.equal(withCount.executable, true, withCount.reasons.join(','));
  // gunners and weapons that disagree
  const mismatch = alter('sotg-banking-clan-munificent-class-frigate', 'twin turbolaser battery', g => { g.specialNotes = g.specialNotes.replace('"hardwareCount":"SOURCE_SILENT_CONFIRMED"', '"hardwareCount":4'); });
  assert.deepEqual(mismatch.reasons, ['STOCK_BATTERY_GUNNERS_NOT_EQUAL_TO_PRINTED_WEAPONS']);
  // seven weapons: not a battery
  const seven = alter('sotg-banking-clan-munificent-class-frigate', 'twin turbolaser battery', g => { g.specialNotes = g.specialNotes.replace('"hardwareCount":"SOURCE_SILENT_CONFIRMED"', '"hardwareCount":7'); });
  assert.deepEqual(seven.reasons, ['STOCK_BATTERY_WEAPON_COUNT_OUT_OF_RANGE']);
  // a printed total that is not exactly BAB + Int + the assistance
  const off = alter('sotg-banking-clan-munificent-class-frigate', 'twin turbolaser battery', g => { g.attackBonusPrinted = 16; g.specialNotes = g.specialNotes.replace('"hardwareCount":"SOURCE_SILENT_CONFIRMED"', '"hardwareCount":5'); });
  assert.ok(off.reasons.includes('STOCK_ATTACK_TOTAL_UNEXPLAINED_DELTA'));
  // not printed as a weapon battery: stays refused as a multi-gunner station
  const notBattery = alter(KRAYT, 'turbolaser battery', g => { g.groupKind = 'unknown'; g.batteryMembershipStatus = 'not-stated'; });
  assert.equal(notBattery.executable, false);
  assert.ok(notBattery.reasons.includes('STOCK_OPERATOR_IS_A_STATION_BATTERY'));
});

// ---------------------------------------------------------------------------------------------------------------------
// End to end on the real published ship: arm -> attack -> card context -> damage
// ---------------------------------------------------------------------------------------------------------------------
test('RUNTIME: the battery is armed as one owned Item that mirrors the source group; the printed total is applied once with assistance shown as included', async () => {
  const v = await armed(KRAYT);
  const items = stockItems(v);
  assert.deepEqual(items.map(i => i.name), ['turbolaser battery'], 'only the established battery is armed');
  const w = items[0];
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

test('RUNTIME margin hits: the attack margin over Reflex becomes extra weapon dice before the x5 multiplier, on the one damage authority', async () => {
  const v = await armed(KRAYT); const w = stockItems(v)[0];
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
  const v = await armed(KRAYT); const w = stockItems(v)[0];
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

test('RUNTIME crew: generic (published) crew may fire the battery; a named gunner is refused because the assisting roster is not modelled', async () => {
  const v = await armed(KRAYT); const w = stockItems(v)[0];
  const t = target(15);
  const gm = { isGM: true };
  const abstract = await authorizeVehicleAttackBeforeCosts({ vehicle: v, weapon: w, target: t, attackId: 'a1', crewStationResolved: true, user: gm, operatorActor: null });
  assert.equal(abstract.ok, true, abstract.reason);
  const gunner = { id: 'g1', name: 'Gunner', type: 'character', isOwner: true, items: [], system: {}, getRollData: () => ({}) };
  const named = await authorizeVehicleAttackBeforeCosts({ vehicle: v, weapon: w, target: t, attackId: 'a2', crewStationResolved: true, user: gm, operatorActor: gunner });
  assert.deepEqual([named.ok, named.reason], [false, BATTERY_REASONS.ASSIGNED_CREW_ROSTER_UNMODELED]);
  // a single-operator stock weapon keeps accepting its named gunner (the refusal is specific to batteries)
  const xw = await armed('core-incom-t-65b-x-wing-starfighter'); const xwLaser = stockItems(xw)[0];
  const ok = await authorizeVehicleAttackBeforeCosts({ vehicle: xw, weapon: xwLaser, target: t, attackId: 'a3', crewStationResolved: true, user: gm, operatorActor: gunner });
  assert.equal(ok.ok, true, ok.reason);
});

test('COVERAGE: the corpus has exactly one executable battery; the other printed batteries are refused for the missing weapon count', () => {
  const all = docs.flatMap(d => assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.map(g => ({ key: keyOf(d), g })));
  const batteries = all.filter(x => x.g.battery);
  assert.equal(batteries.length, 104);
  assert.deepEqual(batteries.filter(x => x.g.executable).map(x => `${x.key}:${x.g.label}`), [`${KRAYT}:turbolaser battery`]);
  assert.equal(batteries.filter(x => x.g.battery.weaponCount !== null).length, 2, 'only Krayt\'s Honor and the Rendili corvette print a weapon count');
  assert.equal(batteries.filter(x => x.g.reasons.includes('STOCK_BATTERY_WEAPON_COUNT_NOT_STATED')).length, 102);
  // every refused battery group carries at least one named reason
  assert.ok(batteries.filter(x => !x.g.executable).every(x => x.g.reasons.length > 0));
});
