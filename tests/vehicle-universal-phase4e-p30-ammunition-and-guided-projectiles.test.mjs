import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { digestUniversalVehicleSource } from '../scripts/domain/vehicles/vehicle-source-digest.js';
import { assessStockWeaponGroups } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';
import { buildStockWeaponItemData, executableModesOf, planStockWeaponItemSync } from '../scripts/domain/vehicles/vehicle-stock-weapon-items.js';
import { resolveVehicleWeaponAuthority } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';
import * as L from '../scripts/domain/vehicles/vehicle-ammunition-ledger.js';
import * as P from '../scripts/domain/vehicles/vehicle-guided-projectile.js';

installSystemsResolver(); installFoundryStubs();
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');
const { VehicleAmmunitionService } = await import('../scripts/engine/vehicles/vehicle-ammunition-service.js');
const { VehicleProjectileService } = await import('../scripts/engine/vehicles/vehicle-projectile-service.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');
const { SWSEChat } = await import('../scripts/chat/swse-chat.js');

const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const keyOf = d => d.flags.swse.canonicalPublication.sourceEntryKey;
const ARC = 'sotg-incom-subpro-arc-170-starfighter';          // Starships of the Galaxy p. 61: its group evidence prints payloadCount 6

class Items extends Map {
  [Symbol.iterator]() { return this.values(); }
  get contents() { return [...this.values()]; }
  filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); }
}
const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });
let seq = 0;

/**
 * SYNTHETIC FIXTURE (tests only). No published group has a verified single launcher, so this clones the ARC-170 and prints a launcher
 * count of 1 on its proton torpedoes (the evidence shape the records use), recomputing the record digest. The vehicle then verifies as
 * source-backed with a COMPLETE launcher family (payload 6, proton torpedo launcher capacity 3). Item sync would reject it by design,
 * so the Item is built with the sync's own builder. It certifies nothing about any published group.
 */
function launcherDoc({ launchers = 1 } = {}) {
  const d = structuredClone(docs.find(x => keyOf(x) === ARC));
  const src = d.flags.swse.universalVehicleSource.source;
  const g = src.armament.firingGroups.find(x => x.label === 'proton torpedoes');
  g.specialNotes = g.specialNotes.replace('"hardwareCount":"SOURCE_SILENT_CONFIRMED"', `"hardwareCount":${launchers}`);
  d.flags.swse.universalVehicleSource.recordDigest = digestUniversalVehicleSource(src);
  return d;
}
function ship(doc = launcherDoc(), id = 'veh1') {
  const v = Object.assign(structuredClone(doc), { id, isOwner: true, items: new Items(), getActiveTokens: () => [token(0, 0)], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  const record = v.flags.swse.universalVehicleSource.source;
  for (const g of assessStockWeaponGroups(record).groups) for (const mode of executableModesOf(g)) {
    const iid = 'i' + (++seq); v.items.set(iid, { id: iid, ...structuredClone(buildStockWeaponItemData(record, g, mode)), actor: v });
  }
  return v;
}
const itemNamed = (v, name) => [...v.items.values()].find(i => i.flags?.swse?.vehicleStockWeapon && i.name === name);
const vtarget = (reflex = 15, id = 'tgt') => ({ id, type: 'vehicle', items: [], system: { size: 'medium', defenses: { reflex: { total: reflex } } }, getActiveTokens: () => [token(300, 0)] });
const log = [];
globalThis.ui = { notifications: { warn: m => log.push(String(m)), error: m => log.push('ERR ' + m), info() {} } };
globalThis.game.settings = { get: () => undefined };
globalThis.game.user.id = 'u1';

// owned-item and actor writes land on the in-memory objects as ActorEngine would apply them (the '==' replace syntax included)
const real = { items: ActorEngine.updateOwnedItems, actor: ActorEngine.updateActor, post: SWSEChat.postRoll };
ActorEngine.updateOwnedItems = async (actor, updates) => { for (const u of updates) { const item = actor.items.get(u._id); for (const [path, value] of Object.entries(u)) { if (path === '_id') continue; const parts = path.split('.'); let o = item; for (const k of parts.slice(0, -1)) o = (o[k] ??= {}); const last = parts.at(-1); o[last.startsWith('==') ? last.slice(2) : last] = structuredClone(value); } } };
ActorEngine.updateActor = async (actor, data) => { for (const [path, value] of Object.entries(data)) { const parts = path.split('.'); let o = actor; for (const k of parts.slice(0, -1)) o = (o[k] ??= {}); o[parts.at(-1)] = structuredClone(value); } };
SWSEChat.postRoll = async () => ({ id: 'm' });
test.after(() => { ActorEngine.updateOwnedItems = real.items; ActorEngine.updateActor = real.actor; SWSEChat.postRoll = real.post; });

async function withD20(d20, fn) {
  const r0 = RollEngine.safeRoll;
  RollEngine.safeRoll = async formula => { const b = Number(/1d20\s*\+\s*(-?\d+)/.exec(String(formula))?.[1] ?? 0); const total = d20 + b; return { total, formula, dice: [{ results: [{ result: d20 }] }], toJSON() { return { total, formula }; } }; };
  try { return await fn(); } finally { RollEngine.safeRoll = r0; }
}
const shoot = (v, w, d20, { reflex = 15, aim = false, followUp = null, target = vtarget(reflex) } = {}) => withD20(d20, async () => { log.length = 0; return rollAttack(v, w, { abstractCrewQuality: 'normal', target, ...(aim ? { aim: true } : {}), ...(followUp ? { guidedFollowUp: followUp } : {}) }); });
const ledgerOf = w => w.flags.swse.vehicleAmmo;
const conserved = l => l.loaded + l.reserve + l.expended === l.payload;
const withCombat = (actors, round, fn) => { const prev = globalThis.game.combat; globalThis.game.combat = { id: 'c1', round, combatants: { contents: actors.map(a => ({ actor: a })) } }; return Promise.resolve(fn()).finally(() => { globalThis.game.combat = prev; }); };

// =====================================================================================================================
// The ledger (pure)
// =====================================================================================================================
test('FAMILY: a launcher is complete only with a printed payload, an exactly-designated launcher with a certified capacity, and ONE verified launcher', () => {
  const g = (label, evidence, battery = null) => ({ label, evidence, battery });
  assert.equal(L.resolveLauncherFamily(g('proton torpedoes', { payloadCount: 6, hardwareCount: 1 })).status, 'complete');
  const done = L.resolveLauncherFamily(g('proton torpedoes', { payloadCount: 6, hardwareCount: 1 })).family;
  assert.deepEqual([done.payload, done.capacity, done.launcherId, done.launchers, done.allocation, done.guided], [6, 3, 'proton-torpedo-launcher', 1, 'single-launcher-verified', true]);
  // the launcher count is not verified (source silent / more than one): the allocation must be GM-certified before it can fire
  assert.equal(L.resolveLauncherFamily(g('proton torpedoes', { payloadCount: 6, hardwareCount: 'SOURCE_SILENT_CONFIRMED' })).status, 'allocation-required');
  assert.equal(L.resolveLauncherFamily(g('proton torpedoes', { payloadCount: 6, hardwareCount: 2 })).status, 'allocation-required');
  assert.equal(L.resolveLauncherFamily(g('proton torpedoes', { payloadCount: 6, hardwareCount: 1 }, { gunners: 3 })).status, 'allocation-required', 'a battery of launchers is ambiguous');
  // no payload is NOT unlimited ammunition; a designation that is not an exact catalog designation identifies nothing
  assert.deepEqual(L.resolveLauncherFamily(g('proton torpedoes', { hardwareCount: 1 })).reasons, [L.AMMO_REASONS.PAYLOAD_NOT_PRINTED]);
  assert.deepEqual(L.resolveLauncherFamily(g('concussion missiles', { payloadCount: 6, hardwareCount: 1 })).reasons, [L.AMMO_REASONS.LAUNCHER_NOT_IDENTIFIED], 'the size is not stated');
  assert.deepEqual(L.resolveLauncherFamily(g('medium concussion missile', { payloadCount: 6, hardwareCount: 1 })).reasons, [L.AMMO_REASONS.LAUNCHER_NOT_IDENTIFIED], 'exact match only');
  assert.equal(L.resolveLauncherFamily(g('medium concussion missiles', { payloadCount: 20, hardwareCount: 1 })).family.capacity, 16);
});

test('LEDGER: initial loading convention, conservation, idempotent atomic spend, single-unit refund, GM reload that creates nothing', () => {
  const family = L.resolveLauncherFamily({ label: 'proton torpedoes', evidence: { payloadCount: 6, hardwareCount: 1 } }).family;
  let l = L.initialLedger(family);
  assert.deepEqual([l.loaded, l.reserve, l.expended, l.capacity], [3, 3, 0, 3], 'loaded = min(payload 6, capacity 3); reserve = 3');
  assert.deepEqual(L.initialLedger({ ...family, payload: 2 }) && [L.initialLedger({ ...family, payload: 2 }).loaded, L.initialLedger({ ...family, payload: 2 }).reserve], [2, 0], 'a small payload loads fully');
  assert.equal(L.validateLedger(l, family).ok, true);
  // a launch spends one unit; the same attack id spends once; conservation holds throughout
  const s1 = L.planLaunch(l, { attackId: 'a1' }); assert.deepEqual([s1.ok, s1.replay, s1.ledger.loaded, s1.ledger.expended], [true, false, 2, 1]);
  const again = L.planLaunch(s1.ledger, { attackId: 'a1' }); assert.deepEqual([again.replay, again.ledger.loaded], [true, 2], 'idempotent');
  assert.ok(conserved(s1.ledger));
  // refund undoes exactly that one spend, once
  const r = L.planRefund(s1.ledger, 'a1'); assert.deepEqual([r.ledger.loaded, r.ledger.expended], [3, 0]);
  assert.equal(L.planRefund(r.ledger, 'a1').reason, L.AMMO_REASONS.NO_RECEIPT, 'a refund cannot be repeated');
  assert.equal(L.planRefund(l, 'nope').reason, L.AMMO_REASONS.NO_RECEIPT);
  // empty launcher
  let e = l; for (const id of ['x1', 'x2', 'x3']) e = L.planLaunch(e, { attackId: id }).ledger;
  assert.deepEqual([e.loaded, e.reserve, e.expended], [0, 3, 3]);
  assert.equal(L.planLaunch(e, { attackId: 'x4' }).reason, L.AMMO_REASONS.EMPTY);
  // GM reload moves reserve to loaded, never more than the reserve or the capacity, never creating ammunition
  const rl = L.planGmReload(e, {}); assert.deepEqual([rl.moved, rl.ledger.loaded, rl.ledger.reserve, rl.ledger.expended], [3, 3, 0, 3]);
  assert.equal(L.planGmReload(rl.ledger, {}).reason, L.AMMO_REASONS.NOTHING_TO_RELOAD);
  assert.equal(L.planGmReload(e, { amount: 1 }).moved, 1);
  assert.ok(conserved(rl.ledger));
  // tampering is detected
  for (const bad of [{ loaded: 99 }, { expended: 0 }, { payload: 100 }, { launchers: 2 }]) assert.equal(L.validateLedger({ ...e, ...bad }, family).ok, false, JSON.stringify(bad));
  // a family the source does not allocate: GM-certified launchers and loaded, bounded by payload and capacity x launchers
  const pending = L.resolveLauncherFamily({ label: 'proton torpedoes', evidence: { payloadCount: 6, hardwareCount: 'SOURCE_SILENT_CONFIRMED' } }).family;
  const ok = L.planGmAllocation(pending, { launchers: 2, loaded: 6 }); assert.deepEqual([ok.ok, ok.ledger.loaded, ok.ledger.reserve, ok.ledger.allocation], [true, 6, 0, 'gm-certified']);
  assert.equal(L.planGmAllocation(pending, { launchers: 1, loaded: 4 }).reason, L.AMMO_REASONS.ALLOCATION_INVALID, 'more than the launcher holds');
  assert.equal(L.planGmAllocation(family, { launchers: 1, loaded: 3 }).reason, L.AMMO_REASONS.ALLOCATION_INVALID, 'a verified single launcher needs no allocation');
  assert.deepEqual([L.launchUnits({ firedLaunchers: 2 }), L.launchUnits({}), L.launchUnits({ firedLaunchers: 0 })], [2, 1, 1], 'fire-linked launchers spend one unit per linked launcher');
});

test('PROJECTILE (pure): Reflex 30 / 10 HP / -5; created only by an AIMED, GUIDED MISS; one follow-up attempt; keeps its target and launcher', () => {
  assert.deepEqual([P.PROJECTILE.reflexDefense, P.PROJECTILE.hitPoints, P.PROJECTILE.followUpPenalty], [30, 10, -5]);
  assert.equal(P.shouldCreateProjectile({ guided: true, aimed: true, hit: false }), true);
  for (const c of [{ guided: true, aimed: false, hit: false }, { guided: true, aimed: true, hit: true }, { guided: false, aimed: true, hit: false }, { guided: true, aimed: true, hit: null }]) assert.equal(P.shouldCreateProjectile(c), false, JSON.stringify(c));
  const rec = P.createProjectile({ projectileId: 'p1', launcherItemId: 'w', vehicleId: 'v', targetId: 't', attackBonus: 12, attackId: 'a', combat: { id: 'c', round: 1 } });
  assert.deepEqual([rec.state, rec.hp, rec.reflexDefense], ['awaiting-follow-up', 10, 30]);
  assert.deepEqual(P.planFollowUp(rec, { launcherItemId: 'w', targetId: 't', combat: { id: 'c', round: 2 } }), { ok: true, attackBonus: 7, penalty: -5, baseBonus: 12 });
  assert.equal(P.planFollowUp(rec, { launcherItemId: 'w', targetId: 't', combat: { id: 'c', round: 1 } }).reason, P.PROJECTILE_REASONS.NOT_DUE, 'the same round is not the next turn');
  assert.equal(P.planFollowUp(rec, { launcherItemId: 'w', targetId: 'other', combat: { id: 'c', round: 2 } }).reason, P.PROJECTILE_REASONS.WRONG_TARGET);
  assert.equal(P.planFollowUp(rec, { launcherItemId: 'z', targetId: 't' }).reason, P.PROJECTILE_REASONS.WRONG_LAUNCHER);
  assert.equal(P.planFollowUp(rec, { launcherItemId: 'w', targetId: 't' }).ok, true, 'outside a combat there is no turn structure');
  const done = P.resolveFollowUp(rec, { hit: false });
  assert.equal(done.state, 'self-destructed'); assert.equal(P.planFollowUp(done, { launcherItemId: 'w', targetId: 't' }).reason, P.PROJECTILE_REASONS.NOT_AWAITING, 'a second miss ends it: no retries');
  assert.equal(P.resolveFollowUp(rec, { hit: true }).state, 'hit');
  // interception: Reflex 30, 10 HP
  assert.deepEqual([P.interceptProjectile(rec, { attackTotal: 29, damage: 99 }).hit, P.interceptProjectile(rec, { attackTotal: 30, damage: 4 }).record.hp], [false, 6]);
  assert.equal(P.interceptProjectile(rec, { attackTotal: 30, damage: 10 }).record.state, 'shot-down');
  assert.equal(P.interceptProjectile(P.interceptProjectile(rec, { attackTotal: 30, damage: 10 }).record, { attackTotal: 40, damage: 1 }).reason, P.PROJECTILE_REASONS.NOT_AWAITING);
});

// =====================================================================================================================
// The gate and the corpus
// =====================================================================================================================
test('CORPUS: no published group has a verified single launcher; 18 have payload + launcher but need a GM allocation; none is armed', () => {
  const all = docs.flatMap(d => assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.map(g => ({ key: keyOf(d), g })));
  const ammo = all.filter(x => x.g.reasons.includes('STOCK_AMMUNITION_LIMITED_UNTRACKED') || x.g.ammunition);
  assert.equal(ammo.length, 169);
  assert.equal(ammo.filter(x => x.g.ammunition).length, 0, 'no complete family');
  assert.equal(ammo.filter(x => x.g.ammunitionPending).length, 18);
  assert.ok(ammo.filter(x => x.g.ammunitionPending).every(x => x.g.reasons.includes(L.AMMO_REASONS.ALLOCATION_REQUIRED) && !x.g.executable));
  assert.equal(ammo.filter(x => x.g.executable).length, 0, 'finite ammunition is never executable without a complete family');
});

test('FIXTURE: the synthetic ship has a COMPLETE launcher family and arms one Item whose ledger starts loaded 3 / reserve 3', () => {
  const doc = launcherDoc();
  const t = assessStockWeaponGroups(doc.flags.swse.universalVehicleSource.source).groups.find(g => g.label === 'proton torpedoes');
  assert.equal(t.executable, true, t.reasons.join(','));
  assert.deepEqual([t.ammunition.payload, t.ammunition.capacity, t.ammunition.allocation, t.area.squares], [6, 3, 'single-launcher-verified', 4]);
  const v = ship(doc); const w = itemNamed(v, 'proton torpedoes');
  assert.ok(w);
  const a = resolveVehicleWeaponAuthority(w);
  assert.equal(a.ammunition.guided, true);
  assert.deepEqual([ledgerOf(w).loaded, ledgerOf(w).reserve, ledgerOf(w).expended], [3, 3, 0]);
  // two launchers would not be a verified single launcher: refused again
  assert.equal(assessStockWeaponGroups(launcherDoc({ launchers: 2 }).flags.swse.universalVehicleSource.source).groups.find(g => g.label === 'proton torpedoes').executable, false);
  // Item sync: the Item is stable, and replacing a stale Item carries the SPENT ledger over (a resync cannot refill a launcher)
  const rec = doc.flags.swse.universalVehicleSource.source;
  const spent = L.planLaunch(ledgerOf(w), { attackId: 'old' }).ledger;
  const stale = { id: 'stale', name: 'edited name', system: structuredClone(w.system), flags: structuredClone(w.flags) }; stale.flags.swse.vehicleAmmo = spent;
  const plan = planStockWeaponItemSync({ items: [stale], record: rec });
  assert.equal(plan.deleteIds.length, 1);
  const replacement = plan.create.find(d => d.name === 'proton torpedoes');
  assert.deepEqual([replacement.flags.swse.vehicleAmmo.loaded, replacement.flags.swse.vehicleAmmo.expended], [2, 1], 'the replacement keeps the spent ledger');
  assert.deepEqual(planStockWeaponItemSync({ items: [], record: rec }).create.find(d => d.name === 'proton torpedoes').flags.swse.vehicleAmmo.loaded, 3, 'a brand-new Item starts loaded');
});

// =====================================================================================================================
// End to end: launch -> ledger -> lock-on -> follow-up -> interception
// =====================================================================================================================
test('LAUNCH: one unit per launch, hit or miss; an unaimed miss leaves no projectile; the damage formula is the ordinary one', async () => {
  const v = ship(); const w = itemNamed(v, 'proton torpedoes');
  const hit = await shoot(v, w, 15, { reflex: 15 });                   // hits
  assert.ok(hit, log.join('|')); assert.equal(hit.isHit, true);
  assert.deepEqual([ledgerOf(w).loaded, ledgerOf(w).expended, conserved(ledgerOf(w))], [2, 1, true]);
  assert.equal(hit.guidedProjectile, undefined);
  const miss = await shoot(v, w, 2, { reflex: 40 });                   // misses, not aimed
  assert.equal(miss.isHit, false);
  assert.deepEqual([ledgerOf(w).loaded, ledgerOf(w).expended], [1, 2], 'a miss spends the unit too');
  assert.equal(miss.guidedProjectile, undefined, 'only an AIMED launch locks on');
  assert.equal(buildDamageFormula(resolveDamageComposition(v, w, { weapon: w })), '(9d10) * 2');
  assert.deepEqual(VehicleProjectileService.awaiting(v), []);
});

test('REFUSED / FAILED attacks spend nothing: wrong scale, no permission, empty launcher, tampered ledger, a roll that throws', async () => {
  const v = ship(); const w = itemNamed(v, 'proton torpedoes');
  const before = structuredClone(ledgerOf(w));
  // character scale: the splash needs the multi-target engine that does not exist
  const chr = await shoot(v, w, 15, { target: { ...vtarget(), type: 'character' } });
  assert.equal(chr, null); assert.match(log.join('|'), /STOCK_AREA_CHARACTER_SCALE_AREA_NOT_IMPLEMENTED/);
  // no permission
  v.isOwner = false; globalThis.game.user.isGM = false;
  assert.equal(await shoot(v, w, 15), null); assert.match(log.join('|'), /ATTACK_USER_NOT_AUTHORIZED/);
  v.isOwner = true;
  assert.deepEqual(ledgerOf(w), before, 'nothing was spent');
  // a roll that throws AFTER the unit was spent: refunded exactly once
  const r0 = RollEngine.safeRoll; RollEngine.safeRoll = async () => { throw new Error('dice exploded'); };
  await assert.rejects(rollAttack(v, w, { abstractCrewQuality: 'normal', target: vtarget() }), /dice exploded/);
  RollEngine.safeRoll = r0;
  assert.deepEqual([ledgerOf(w).loaded, ledgerOf(w).expended, conserved(ledgerOf(w))], [3, 0, true], 'the failed attack cost nothing');
  // a hand-edited ledger is refused, not trusted
  w.flags.swse.vehicleAmmo.loaded = 99;
  assert.equal(await shoot(v, w, 15), null); assert.match(log.join('|'), /AMMO_LEDGER_INVALID/);
  w.flags.swse.vehicleAmmo = structuredClone(before);
  // a ledger that is gone is rebuilt from the source (a full launcher, never an unlimited one)
  delete w.flags.swse.vehicleAmmo;
  const ok = await shoot(v, w, 15); assert.ok(ok);
  assert.deepEqual([ledgerOf(w).loaded, ledgerOf(w).payload], [2, 6]);
});

test('EMPTY LAUNCHER: refused before any cost; a GM reload moves reserve to loaded (creating nothing); a player cannot reload', async () => {
  const v = ship(); const w = itemNamed(v, 'proton torpedoes');
  for (let i = 0; i < 3; i++) assert.ok(await shoot(v, w, 15), log.join('|'));
  assert.deepEqual([ledgerOf(w).loaded, ledgerOf(w).reserve, ledgerOf(w).expended], [0, 3, 3]);
  assert.equal(await shoot(v, w, 15), null); assert.match(log.join('|'), /AMMO_LAUNCHER_EMPTY/);
  assert.equal((await VehicleAmmunitionService.gmReload(v, w, { user: { isGM: false } })).reason, L.AMMO_REASONS.GM_ONLY);
  const r = await VehicleAmmunitionService.gmReload(v, w, { user: { isGM: true, id: 'gm' } });
  assert.deepEqual([r.ok, r.moved, ledgerOf(w).loaded, ledgerOf(w).reserve, ledgerOf(w).expended], [true, 3, 3, 0, 3]);
  assert.ok(conserved(ledgerOf(w)));
  assert.equal((await VehicleAmmunitionService.gmReload(v, w, { user: { isGM: true } })).reason, L.AMMO_REASONS.NOTHING_TO_RELOAD, 'no ammunition is created');
});

test('LOCK-ON: an aimed launch that misses leaves ONE projectile; its follow-up uses the same bonus -5, no ammunition, no new launch, once', async () => {
  const v = ship(); const w = itemNamed(v, 'proton torpedoes');
  const launch = await shoot(v, w, 2, { reflex: 40, aim: true });
  assert.equal(launch.isHit, false);
  const proj = launch.guidedProjectile;
  assert.ok(proj, 'a projectile exists'); assert.deepEqual([proj.state, proj.targetId, proj.launcherItemId, proj.attackBonus], ['awaiting-follow-up', 'tgt', w.id, launch.atkBonus]);
  assert.deepEqual([ledgerOf(w).loaded, ledgerOf(w).expended], [2, 1], 'the launch cost one unit');
  assert.equal(VehicleProjectileService.awaiting(v).length, 1);
  // out of combat there is no turn structure: the follow-up may be made; with a combat it must be a later round
  const early = await withCombat([v, vtarget()], 1, async () => { v.flags.swse.guidedProjectiles[proj.id].createdRound = 1; v.flags.swse.guidedProjectiles[proj.id].createdCombatId = 'c1'; return shoot(v, w, 20, { followUp: proj.id }); });
  assert.equal(early, null); assert.match(log.join('|'), /PROJECTILE_FOLLOW_UP_NOT_DUE/);
  assert.equal(VehicleProjectileService.awaiting(v).length, 1, 'a refused follow-up does not consume the projectile');
  // wrong target
  assert.equal(await shoot(v, w, 20, { followUp: proj.id, target: vtarget(15, 'someone-else') }), null);
  assert.match(log.join('|'), /PROJECTILE_FOLLOW_UP_MUST_KEEP_ITS_TARGET/);
  // the follow-up: same bonus with -5, against the target's Reflex, and NOTHING is spent
  const fu = await withCombat([v, vtarget()], 2, () => shoot(v, w, 19, { followUp: proj.id, reflex: 15 }));
  assert.ok(fu, log.join('|'));
  assert.equal(fu.atkBonus, launch.atkBonus - 5);
  assert.deepEqual(fu.componentLedger.map(e => [e.id, e.value]), [['guided-launch-attack-bonus', launch.atkBonus], ['guided-follow-up-penalty', -5]]);
  assert.deepEqual([ledgerOf(w).loaded, ledgerOf(w).expended, conserved(ledgerOf(w))], [2, 1, true], 'the follow-up is not another launch');
  assert.equal(fu.isHit, true); assert.equal(VehicleProjectileService.read(v, proj.id).state, 'hit');
  // no unlimited retries
  assert.equal(await shoot(v, w, 20, { followUp: proj.id }), null); assert.match(log.join('|'), /PROJECTILE_NOT_AWAITING_ITS_FOLLOW_UP/);
  // a second miss self-destructs the projectile
  const l2 = await shoot(v, w, 2, { reflex: 40, aim: true });
  const fu2 = await shoot(v, w, 2, { followUp: l2.guidedProjectile.id, reflex: 40 });
  assert.equal(fu2.isHit, false); assert.equal(VehicleProjectileService.read(v, l2.guidedProjectile.id).state, 'self-destructed');
  assert.equal(await shoot(v, w, 20, { followUp: l2.guidedProjectile.id, reflex: 40 }), null);
  assert.deepEqual([ledgerOf(w).loaded, ledgerOf(w).expended], [1, 2], 'two launches, two units; both follow-ups free');
});

test('INTERCEPTION: a projectile awaiting its return attack has Reflex 30 and 10 HP; shooting it down ends it', async () => {
  const v = ship(); const w = itemNamed(v, 'proton torpedoes');
  const launch = await shoot(v, w, 2, { reflex: 40, aim: true });
  const id = launch.guidedProjectile.id;
  assert.equal((await VehicleProjectileService.intercept(v, id, { attackTotal: 29, damage: 50 })).hit, false);
  assert.equal(VehicleProjectileService.read(v, id).hp, 10);
  const partial = await VehicleProjectileService.intercept(v, id, { attackTotal: 30, damage: 4 });
  assert.deepEqual([partial.hit, VehicleProjectileService.read(v, id).hp, VehicleProjectileService.read(v, id).state], [true, 6, 'awaiting-follow-up']);
  await VehicleProjectileService.intercept(v, id, { attackTotal: 35, damage: 6 });
  assert.equal(VehicleProjectileService.read(v, id).state, 'shot-down');
  assert.equal(await shoot(v, w, 20, { followUp: id }), null); assert.match(log.join('|'), /PROJECTILE_NOT_AWAITING_ITS_FOLLOW_UP/);
  assert.deepEqual([ledgerOf(w).loaded, ledgerOf(w).expended], [2, 1], 'the shot-down projectile was one launch; nothing more');
  // a non-guided launcher has no lock-on
});

test('GM ALLOCATION: a launcher whose count the source does not verify fires only after a GM certifies launchers and loaded', async () => {
  const v = ship(launcherDoc({ launchers: 2 }));                              // not a verified single launcher: not armed by the gate
  assert.equal(itemNamed(v, 'proton torpedoes'), undefined, 'the gate does not arm an uncertified allocation');
  // the pending family can still be certified on an Item a GM places (service-level): launchers 2, loaded 6 (2 x 3) -> reserve 0
  const family = L.resolveLauncherFamily({ label: 'proton torpedoes', evidence: { payloadCount: 6, hardwareCount: 2 } }).family;
  const fake = { id: 'iX', name: 'proton torpedoes', flags: { swse: {} }, actor: null };
  const vv = { id: 'vv', items: new Items() }; fake.actor = vv; vv.items.set('iX', fake);
  const svc = await import('../scripts/engine/vehicles/vehicle-ammunition-service.js');
  const realFamily = svc.VehicleAmmunitionService.familyOf; svc.VehicleAmmunitionService.familyOf = () => family;
  try {
    assert.equal((await svc.VehicleAmmunitionService.ensureLedger(vv, fake)).reason, L.AMMO_REASONS.LEDGER_MISSING, 'no allocation, no firing');
    assert.equal((await svc.VehicleAmmunitionService.gmCertifyAllocation(vv, fake, { launchers: 2, loaded: 6, user: { isGM: false } })).reason, L.AMMO_REASONS.GM_ONLY);
    const ok = await svc.VehicleAmmunitionService.gmCertifyAllocation(vv, fake, { launchers: 2, loaded: 6, user: { isGM: true, id: 'gm' } });
    assert.deepEqual([ok.ok, fake.flags.swse.vehicleAmmo.loaded, fake.flags.swse.vehicleAmmo.reserve, fake.flags.swse.vehicleAmmo.allocation], [true, 6, 0, 'gm-certified']);
    assert.equal((await svc.VehicleAmmunitionService.gmCertifyAllocation(vv, fake, { launchers: 1, loaded: 3, user: { isGM: true } })).ok, false, 'an allocation is certified once');
    const s = await svc.VehicleAmmunitionService.spendLaunch(vv, fake, { attackId: 'z1', firedLaunchers: 2 });
    assert.deepEqual([s.ok, fake.flags.swse.vehicleAmmo.loaded, fake.flags.swse.vehicleAmmo.expended], [true, 4, 2], 'two fire-linked launchers spend two units');
  } finally { svc.VehicleAmmunitionService.familyOf = realFamily; }
});
