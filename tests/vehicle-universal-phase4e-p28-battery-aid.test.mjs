import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { digestUniversalVehicleSource } from '../scripts/domain/vehicles/vehicle-source-digest.js';
import { assessStockWeaponGroups } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';
import { buildStockWeaponItemData, executableModesOf } from '../scripts/domain/vehicles/vehicle-stock-weapon-items.js';
import { resolveVehicleWeaponAuthority } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';
import { planBatteryAid, readPendingAid, AID_REASONS, BATTERY_AID_FLAG } from '../scripts/domain/vehicles/vehicle-battery-aid.js';
import { batteryAidsBattery } from '../scripts/domain/vehicles/vehicle-weapon-battery.js';

installSystemsResolver(); installFoundryStubs();
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { armStockWeaponsOnCreate } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');
const { VehicleBatteryAidService } = await import('../scripts/engine/vehicles/vehicle-battery-aid-service.js');
const { ActionEconomyConsumption } = await import('../scripts/engine/combat/action/action-economy-consumption.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');
const { SWSEChat } = await import('../scripts/chat/swse-chat.js');

const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const keyOf = d => d.flags.swse.canonicalPublication.sourceEntryKey;
const KRAYT = 'sotg-krayt-s-honor';

class Items extends Map {
  [Symbol.iterator]() { return this.values(); }
  get contents() { return [...this.values()]; }
  filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); }
}
const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });
let seq = 0;

/**
 * SYNTHETIC FIXTURE (tests only): the published corpus has exactly one full-battery weapon (Krayt's Honor turbolaser battery), and a
 * battery cannot aid itself. This clones Krayt's Honor and prints a weapon count (4) on its laser cannon battery -- the same
 * evidence shape the published record uses for the turbolaser battery -- and recomputes the record digest, so the vehicle verifies
 * as a source-backed ship with TWO full batteries. It certifies nothing about any published group.
 */
function twoBatteryDoc() {
  const d = structuredClone(docs.find(x => keyOf(x) === KRAYT));
  const src = d.flags.swse.universalVehicleSource.source;
  const g = src.armament.firingGroups.find(x => x.label === 'laser cannon battery');
  g.specialNotes = g.specialNotes.replace('"hardwareCount":"SOURCE_SILENT_CONFIRMED"', '"hardwareCount":4');
  d.flags.swse.universalVehicleSource.recordDigest = digestUniversalVehicleSource(src);
  return d;
}
async function armed(doc, id = 'veh1', { synthetic = false } = {}) {
  const v = Object.assign(structuredClone(doc), { id, isOwner: true, items: new Items(), getActiveTokens: () => [token(0, 0)], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  globalThis.game.user.id = 'u1';
  if (!synthetic) {
    ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const x of data) { const iid = 'i' + (++seq); v.items.set(iid, { id: iid, ...structuredClone(x), actor: v }); } };
    ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const iid of ids) v.items.delete(iid); };
    await armStockWeaponsOnCreate(v, {}, 'u1');
    return v;
  }
  // The synthetic record verifies by digest (what every runtime authority checks) but, by design, NOT against the canonical
  // pack index that Item SYNC requires, so its Items are built with the very builder the sync uses (one Item per executable mode).
  const record = v.flags.swse.universalVehicleSource.source;
  for (const g of assessStockWeaponGroups(record).groups) for (const mode of executableModesOf(g)) {
    const iid = 'i' + (++seq); v.items.set(iid, { id: iid, ...structuredClone(buildStockWeaponItemData(record, g, mode)), actor: v });
  }
  return v;
}
const itemNamed = (v, name) => [...v.items.values()].find(i => i.flags?.swse?.vehicleStockWeapon && i.name === name);
const target = (reflex = 15) => ({ id: 'tgt', type: 'character', items: [], system: { size: 'medium', defenses: { reflex: { total: reflex } } }, getActiveTokens: () => [token(300, 0)] });
globalThis.ui = { notifications: { warn() {}, error() {}, info() {} } };
globalThis.game.settings = { get: () => undefined };

// flag writes land on the in-memory vehicle exactly as ActorEngine.updateActor would apply them
const realUpdate = ActorEngine.updateActor;
const writes = [];
ActorEngine.updateActor = async (actor, data) => {
  writes.push(data);
  for (const [path, value] of Object.entries(data)) {
    const parts = path.split('.'); let o = actor; for (const k of parts.slice(0, -1)) o = (o[k] ??= {}); o[parts.at(-1)] = value;
  }
};
const realPost = SWSEChat.postRoll; const posts = [];
SWSEChat.postRoll = async a => { posts.push(a); return { id: 'm' }; };
test.after(() => { ActorEngine.updateActor = realUpdate; SWSEChat.postRoll = realPost; });

/** Make RollEngine.safeRoll return a fixed natural d20. */
async function withD20(d20, fn) {
  const real = RollEngine.safeRoll;
  RollEngine.safeRoll = async formula => { const b = Number(/1d20\s*\+\s*(-?\d+)/.exec(String(formula))?.[1] ?? 0); const total = d20 + b; return { total, formula, dice: [{ results: [{ result: d20 }] }], toJSON() { return { total, formula }; } }; };
  try { return await fn(); } finally { RollEngine.safeRoll = real; }
}
/** Spend tracking: replace the canonical action-economy authority's spend with a recorder (the contract, not its internals). */
function recordEconomy(allow = true) {
  const real = ActionEconomyConsumption.spend; const calls = [];
  ActionEconomyConsumption.spend = async (actor, type, meta) => { calls.push({ actor: actor?.id, type, name: meta?.actionName }); return { allowed: allow, permitted: allow, committed: allow, rollback: async () => { calls.push({ rollback: true }); } }; };
  return { calls, restore: () => { ActionEconomyConsumption.spend = real; } };
}
const fire = (v, w, d20, reflex = 15) => withD20(d20, () => rollAttack(v, w, { abstractCrewQuality: 'normal', target: target(reflex) }));

// ---------------------------------------------------------------------------------------------------------------------
test('PLAN (pure): +2 per COMPLETE pair of the assisting battery; an incomplete pair gives nothing; the same battery cannot aid itself', () => {
  const mk = (id, w) => ({ itemId: id, battery: w ? { participatingWeapons: w } : null });
  assert.deepEqual([2, 3, 4, 5, 6].map(w => planBatteryAid({ assisting: mk('a', w), aided: mk('b', 3) }).potentialBonus), [2, 2, 4, 4, 6]);
  assert.equal(planBatteryAid({ assisting: mk('a', 1), aided: mk('b', 3) }).reason, AID_REASONS.NO_COMPLETE_PAIR, 'one weapon is no complete pair');
  assert.equal(planBatteryAid({ assisting: mk('a', 4), aided: mk('a', 4) }).reason, AID_REASONS.SAME_BATTERY);
  assert.equal(planBatteryAid({ assisting: mk('a', null), aided: mk('b', 3) }).reason, AID_REASONS.ASSISTING_NOT_A_FULL_BATTERY);
  assert.equal(planBatteryAid({ assisting: mk('a', 4), aided: mk('b', null) }).reason, AID_REASONS.AIDED_NOT_A_FULL_BATTERY);
  assert.equal(planBatteryAid({ assisting: mk('a', 4), aided: mk('b', 3), pending: { consumedAt: null } }).reason, AID_REASONS.ALREADY_PENDING, 'stacking is not assumed');
  assert.equal(planBatteryAid({ assisting: mk('a', 4), aided: mk('b', 3), pending: { consumedAt: 1 } }).ok, true, 'a consumed aid no longer blocks a new one');
  // the resolved outcome decides success: a natural 1 misses even with a big total; a natural 20 hits under 10
  assert.equal(batteryAidsBattery({ attackTotal: 40, assistingWeapons: 4, hit: false }).bonus, 0);
  assert.equal(batteryAidsBattery({ attackTotal: 3, assistingWeapons: 4, hit: true }).bonus, 4);
  assert.equal(batteryAidsBattery({ attackTotal: 99, assistingWeapons: 4, hit: true }).marginHits, 0);
});

test('FIXTURE: the synthetic ship verifies as source-backed and has TWO full batteries (the corpus has one)', async () => {
  const doc = twoBatteryDoc();
  const groups = assessStockWeaponGroups(doc.flags.swse.universalVehicleSource.source).groups;
  assert.deepEqual(groups.filter(g => g.modes?.['full-battery']?.executable).map(g => g.label).sort(), ['laser cannon battery', 'turbolaser battery']);
  const v = await armed(doc, 'veh1', { synthetic: true });
  const turbo = itemNamed(v, 'turbolaser battery'), laser = itemNamed(v, 'laser cannon battery');
  assert.deepEqual([resolveVehicleWeaponAuthority(turbo).battery.participatingWeapons, resolveVehicleWeaponAuthority(laser).battery.participatingWeapons], [3, 4]);
  // the published, unmodified ship still has exactly one full battery
  const real = await armed(docs.find(x => keyOf(x) === KRAYT), 'veh-real');
  assert.equal(itemNamed(real, 'laser cannon battery'), undefined, 'the published ship has no full laser cannon battery (its weapon count is not printed)');
  assert.ok(itemNamed(real, 'turbolaser battery'), 'only the turbolaser battery is a full battery');
});

test('ACTION: a standard action is spent through the canonical economy authority; a success stores ONE pending aid on the aided weapon\'s vehicle', async () => {
  const v = await armed(twoBatteryDoc(), 'veh1', { synthetic: true });
  const turbo = itemNamed(v, 'turbolaser battery'), laser = itemNamed(v, 'laser cannon battery');
  const eco = recordEconomy();
  try {
    posts.length = 0;
    const r = await withD20(10, () => VehicleBatteryAidService.perform({ assistingVehicle: v, assistingItem: laser, aidedItem: turbo, user: { isGM: true } }));
    assert.equal(r.ok, true, r.reason);
    assert.deepEqual([r.hit, r.bonus], [true, 4], 'the laser cannon battery has four weapons: two complete pairs');
    assert.deepEqual(eco.calls, [{ actor: 'veh1', type: 'standard', name: 'Aid Another (battery)' }], 'exactly one standard action');
    const pending = readPendingAid(v, turbo.id);
    assert.deepEqual([pending.aidedItemId, pending.assistingItemId, pending.bonus, pending.consumedAt], [turbo.id, laser.id, 4, null]);
    assert.equal(posts.length, 1, 'the aid roll is on the record');
    assert.equal(readPendingAid(v, laser.id), null, 'nothing is pending on the assisting battery');
    // a second aid while one is pending is refused BEFORE any action is spent
    eco.calls.length = 0;
    const again = await withD20(15, () => VehicleBatteryAidService.perform({ assistingVehicle: v, assistingItem: laser, aidedItem: turbo, user: { isGM: true } }));
    assert.deepEqual([again.ok, again.reason, eco.calls.length], [false, AID_REASONS.ALREADY_PENDING, 0]);
  } finally { eco.restore(); }
});

test('NEXT ATTACK: the aid is +4 on the aided battery\'s next attack roll, shown in the ledger, consumed ONCE; no margin hits come from the aid', async () => {
  const v = await armed(twoBatteryDoc(), 'veh1', { synthetic: true });
  const turbo = itemNamed(v, 'turbolaser battery'), laser = itemNamed(v, 'laser cannon battery');
  const eco = recordEconomy();
  try { await withD20(10, () => VehicleBatteryAidService.perform({ assistingVehicle: v, assistingItem: laser, aidedItem: turbo, user: { isGM: true } })); } finally { eco.restore(); }
  const first = await fire(v, turbo, 5, 15);
  const L1 = first.componentLedger;
  assert.equal(first.atkBonus, 13 + 4, 'the published 13 plus the aid');
  assert.deepEqual(L1.filter(e => e.id === 'battery-aid').map(e => [e.value, e.applied]), [[4, true]]);
  assert.equal(L1.filter(e => e.applied).reduce((s, e) => s + e.value, 0), 17, 'counted once in the total');
  assert.ok(readPendingAid(v, turbo.id) === null, 'consumed by that attack (hit or miss)');
  assert.ok(v.flags.swse[BATTERY_AID_FLAG][turbo.id].consumedAt, 'and recorded as consumed');
  // the next attack gets nothing
  const second = await fire(v, turbo, 5, 15);
  assert.equal(second.atkBonus, 13);
  assert.equal(second.componentLedger.some(e => e.id === 'battery-aid'), false);
  // the margin hits of the aided attack still come from ITS OWN total vs Reflex: 5 + 17 = 22 vs 15 -> margin 7 -> 2 extra hits (capped at 2)
  assert.equal(first.workflowContext.battery.extraHits, 2);
  assert.equal(buildDamageFormula(resolveDamageComposition(v, turbo, { weapon: turbo, combatContext: first.workflowContext })), '(7d10) * 5');
});

test('ONE-TIME and SCOPE: a consumed aid cannot be consumed again; the aid helps only the designated weapon, never its single-weapon sibling or the assisting battery', async () => {
  const v = await armed(twoBatteryDoc(), 'veh1', { synthetic: true });
  const turbo = itemNamed(v, 'turbolaser battery'), laser = itemNamed(v, 'laser cannon battery'), turboOne = itemNamed(v, 'turbolaser battery (single weapon)');
  const eco = recordEconomy();
  try { await withD20(10, () => VehicleBatteryAidService.perform({ assistingVehicle: v, assistingItem: laser, aidedItem: turbo, user: { isGM: true } })); } finally { eco.restore(); }
  const rec = readPendingAid(v, turbo.id);
  // the other weapons are unaffected
  assert.equal((await fire(v, turboOne, 5)).componentLedger.some(e => e.id === 'battery-aid'), false, 'the independent weapon of the same group');
  assert.equal((await fire(v, laser, 5)).componentLedger.some(e => e.id === 'battery-aid'), false, 'the assisting battery');
  assert.ok(readPendingAid(v, turbo.id), 'still pending: those attacks did not consume it');
  // consume twice: only the first counts
  const c1 = await VehicleBatteryAidService.consume(v, turbo.id, rec.aidId), c2 = await VehicleBatteryAidService.consume(v, turbo.id, rec.aidId);
  assert.deepEqual([c1.consumed, c2.consumed, c2.reason], [true, false, 'AID_ALREADY_CONSUMED']);
  assert.equal((await VehicleBatteryAidService.consume(v, turbo.id, 'someone-elses-aid')).consumed, false);
  // a refused or failed attack does not consume: a blocked attack never reaches the roll
  const eco2 = recordEconomy();
  try { await withD20(10, () => VehicleBatteryAidService.perform({ assistingVehicle: v, assistingItem: laser, aidedItem: turbo, user: { isGM: true } })); } finally { eco2.restore(); }
  assert.ok(readPendingAid(v, turbo.id), 'a new aid is allowed once the previous one was consumed');
  v.isOwner = false; globalThis.game.user.isGM = false;
  const blocked = await fire(v, turbo, 5);
  assert.equal(blocked, null, 'the user may not operate this vehicle: the attack is refused');
  assert.ok(readPendingAid(v, turbo.id), 'a refused attack leaves the aid pending');
});

test('FAILURES: a miss against Reflex 10 creates no aid; an unavailable standard action stops everything before the roll', async () => {
  const v = await armed(twoBatteryDoc(), 'veh1', { synthetic: true });
  const turbo = itemNamed(v, 'turbolaser battery'), laser = itemNamed(v, 'laser cannon battery');
  let eco = recordEconomy();
  try {
    // laser cannon battery total is 15; a natural 1 always misses
    const miss = await withD20(1, () => VehicleBatteryAidService.perform({ assistingVehicle: v, assistingItem: laser, aidedItem: turbo, user: { isGM: true } }));
    assert.deepEqual([miss.ok, miss.hit, miss.bonus, miss.record], [true, false, 0, null]);
    assert.equal(readPendingAid(v, turbo.id), null, 'nothing stored');
    assert.equal(eco.calls.length, 1, 'the action was spent: the attempt happened');
  } finally { eco.restore(); }
  eco = recordEconomy(false);
  try {
    const noAction = await withD20(10, () => VehicleBatteryAidService.perform({ assistingVehicle: v, assistingItem: laser, aidedItem: turbo, user: { isGM: true } }));
    assert.deepEqual([noAction.ok, noAction.reason], [false, AID_REASONS.ACTION_UNAVAILABLE]);
    assert.equal(readPendingAid(v, turbo.id), null);
  } finally { eco.restore(); }
  // permissions and eligibility
  assert.equal((await VehicleBatteryAidService.perform({ assistingVehicle: { ...v, isOwner: false }, assistingItem: laser, aidedItem: turbo, user: { isGM: false } })).reason, AID_REASONS.NOT_AUTHORIZED);
  const single = itemNamed(v, 'laser cannon battery (single weapon)');
  assert.equal((await VehicleBatteryAidService.perform({ assistingVehicle: v, assistingItem: single, aidedItem: turbo, user: { isGM: true } })).reason, AID_REASONS.ASSISTING_NOT_A_FULL_BATTERY, 'an independent weapon is not a battery');
  assert.equal((await VehicleBatteryAidService.perform({ assistingVehicle: v, assistingItem: laser, aidedItem: single, user: { isGM: true } })).reason, AID_REASONS.AIDED_NOT_A_FULL_BATTERY);
  // a named gunner on the station needs a roster that does not exist
  v.system.crewPositions = { gunner: { id: 'g1', name: 'Gunner' } };
  const realGet = globalThis.game.actors.get; globalThis.game.actors.get = id => (id === 'g1' ? { id: 'g1', name: 'Gunner', type: 'character', items: [], system: {} } : null);
  try { assert.equal((await VehicleBatteryAidService.perform({ assistingVehicle: v, assistingItem: laser, aidedItem: turbo, user: { isGM: true } })).reason, AID_REASONS.ASSIGNED_CREW); }
  finally { globalThis.game.actors.get = realGet; }
});

test('PUBLISHED SHIPS: with only one full battery nothing can be aided (no group is enabled or changed by this feature)', async () => {
  const real = await armed(docs.find(x => keyOf(x) === KRAYT), 'veh-real');
  const turbo = itemNamed(real, 'turbolaser battery');
  const r = await VehicleBatteryAidService.perform({ assistingVehicle: real, assistingItem: turbo, aidedItem: turbo, user: { isGM: true } });
  assert.deepEqual([r.ok, r.reason], [false, AID_REASONS.SAME_BATTERY]);
  const single = itemNamed(real, 'laser cannon battery (single weapon)');
  assert.equal((await VehicleBatteryAidService.perform({ assistingVehicle: real, assistingItem: single, aidedItem: turbo, user: { isGM: true } })).reason, AID_REASONS.ASSISTING_NOT_A_FULL_BATTERY);
});
