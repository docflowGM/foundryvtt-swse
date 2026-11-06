/**
 * WE-PD (Complete Weapon Ecosystem): the POINT-DEFENSE weapon modification (Starships of the Galaxy, Weapon Systems and Table 3-5, p. 47).
 * It is an OPTION chosen when an eligible weapon is bought (+4,000 credits per weapon, no extra emplacement points, Colossal or larger
 * hulls only; blaster cannons, laser cannons and light ion cannons only) that removes the Core -20 capital-ship penalty against targets
 * smaller than Colossal. Purchase (real TransactionEngine charge) -> job -> sealed entry -> Item -> attack -> removal.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import * as J from '../scripts/domain/vehicles/vehicle-installation-jobs.js';
import * as E from '../scripts/domain/vehicles/vehicle-modification-effects.js';
import { classifyInstalledVehicleWeapon } from '../scripts/domain/vehicles/vehicle-attack-provenance.js';
import { resolveVehicleWeaponAuthority, resolveVehicleWeaponDamage } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';

installSystemsResolver(); installFoundryStubs();
const { VehicleInstallationService: S } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('../scripts/engine/progression/utils/snapshot-manager.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { rollDamage } = await import('../scripts/combat/rolls/damage.js');
const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');
const { SWSEChat } = await import('../scripts/chat/swse-chat.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const weapons = load('weapon-systems');
const cert = { ...load('certification-p6a').rows, ...load('certification').rows };
const printed = JSON.parse(readFileSync('data/audits/vehicles/p6a/print-verified-components-v2.json', 'utf8'));
const ranges = JSON.parse(readFileSync('data/vehicle-weapon-ranges.json', 'utf8'));
const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const catalogRow = id => ({ ...weapons.find(c => c.id === id), certification: cert[id] });
const HULLS = { fighter: 'core-incom-t-65b-x-wing-starfighter', frigate: 'cw-c-9979-landing-craft' };

// base weapon, damage, EP, base price: the seven bases the source names ("blaster cannons, laser cannons, and light ion cannons")
const ELIGIBLE = [
  ['blaster-cannon-light', 1, 1200], ['blaster-cannon-medium', 1, 2500], ['blaster-cannon-heavy', 2, 5500],
  ['laser-cannon-light', 1, 1500], ['laser-cannon-medium', 1, 4000], ['laser-cannon-heavy', 2, 6000], ['ion-cannon-light', 1, 2000]
];
const INELIGIBLE = ['ion-cannon-medium', 'ion-cannon-heavy', 'turbolaser-light', 'turbolaser-medium', 'turbolaser-heavy', 'proton-torpedo-launcher', 'concussion-missile-launcher-light'];
const PD = 4000;

class Items extends Map {
  [Symbol.iterator]() { return this.values(); }
  get contents() { return [...this.values()]; }
  filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); }
}
const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });
const rules = { resolveEpBudget: () => ({ state: 'known', total: 40 }), resolveUninstallRefund: () => null, allowEpShortfall: false, resolveNonstandard: () => ({ nonstandard: false, basis: 'FIXTURE' }) };
const GM_MOUNT = { mountKey: 'turret-1', arc: 'omni', operatorRole: 'pilot', reason: 'hardpoint fitted at the yard' };

let src, vehicle, owner, items, seq = 0;
function world({ hull = 'fighter', credits = 200000 } = {}) {
  src = structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === HULLS[hull]));
  src.system.ownedByActorId = 'owner1';
  items = new Items();
  vehicle = { ...src, id: 'veh1', name: 'Test hull', isOwner: true, items, getActiveTokens: () => [token(0, 0)], getRollData: () => ({}), toObject() { return structuredClone(src); } };
  owner = { id: 'owner1', name: 'Owner', isOwner: true, system: { credits }, flags: {}, toObject() { return { system: this.system }; }, getFlag: () => [] };
  Object.assign(globalThis.game, { user: Object.assign(globalThis.game.user ?? {}, { id: 'gm1', isGM: true }), actors: { get: id => ({ owner1: owner, veh1: vehicle })[id], contents: [] }, users: new Map() });
  ActorEngine.applyMutationPlan = async (actor, plan) => {
    if (actor.id === 'veh1') for (const [k, v] of Object.entries(plan.set ?? {})) { const m = /^flags\.swse\.(.+)$/.exec(k); if (m) src.flags.swse[m[1]] = structuredClone(v); }
    if (plan.set?.['system.credits'] !== undefined) actor.system.credits = plan.set['system.credits'];
  };
  const snaps = new Map();
  SnapshotManager.createSnapshot = async actor => { const t = snaps.size + 1; snaps.set(`${actor.id}:${t}`, { credits: actor.system?.credits, flags: structuredClone(src.flags) }); return { timestamp: t }; };
  SnapshotManager.getSnapshot = (_actor, ts) => ({ schemaVersion: 2, scope: 'full-actor', timestamp: ts });   // TI-2: recovery must be retrievable from the actor
  SnapshotManager.restoreSnapshot = async (actor, ts) => { const s = snaps.get(`${actor.id}:${ts}`); if (s && actor.id === 'owner1') actor.system.credits = s.credits; if (s && actor.id === 'veh1') src.flags = s.flags; return true; };
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const d of data) { const id = 'i' + (++seq); items.set(id, { id, ...structuredClone(d), actor: vehicle }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) items.delete(id); };
  S.rules = rules;
}
const catalogOf = (id, optionId = null) => new Map([[id, catalogRow(id)], ...(optionId ? [[optionId, catalogRow(optionId)]] : [])]);
const key = hull => HULLS[hull];
const jobs = hull => J.readJobs(src.flags, key(hull)).jobs;
const ledger = hull => L.readCertifiedInstallations(src.flags, key(hull)).entries;
const managed = () => items.contents.filter(i => i.flags?.swse?.vehicleInstalledWeapon);

/** The published procedure with an optional weapon option: pay, log the time, the check succeeds, the ledger is sealed and the Item exists. */
async function buy(id, hull, optionId = null, mountKey = 'turret-1') {
  const catalog = catalogOf(id, optionId);
  const start = await S.startJob({ ownerActor: owner, vehicle, catalogId: id, optionId, catalog, mount: { ...GM_MOUNT, mountKey } });
  if (!start.success) return { start };
  const job = jobs(hull).at(-1);
  assert.equal((await S.logWorkDays({ ownerActor: owner, vehicle, jobId: job.jobId, days: J.describeJob(job).daysRequired })).success, true);
  const done = await S.recordCheck({ ownerActor: owner, vehicle, jobId: job.jobId, total: 99 });
  assert.equal(done.success, true, `${id}: ${JSON.stringify(done)}`);
  return { start, done, job, entry: ledger(hull).at(-1), weapon: managed().at(-1) };
}

const log = [];
globalThis.ui = { notifications: { warn: m => log.push(String(m)), error: m => log.push('ERR ' + m), info() {} } };
globalThis.game.settings = globalThis.game.settings ?? { get: () => undefined };
const smallTarget = { id: 'tgt', type: 'character', items: [], system: { size: 'medium', defenses: { reflex: { total: 15 } } }, getActiveTokens: () => [token(300, 0)] };
const colossalTarget = { id: 'tgt2', type: 'vehicle', items: [], system: { size: 'colossal', defenses: { reflex: { total: 15 } } }, getActiveTokens: () => [token(300, 0)] };
const fire = async (veh, weapon, target = smallTarget) => {
  log.length = 0; let result = null;
  try { result = await rollAttack(veh, weapon, { abstractCrewQuality: 'normal', target }); } catch (e) { log.push('THREW ' + e.message); }
  return { result, log: [...log], blocked: result === null };
};


const ep = id => weapons.find(w => w.id === id).emplacementPoints;
const penalty = r => r.componentLedger.filter(e => e.id === 'capital-ship-attack-penalty');

test('SOURCE: the point-defense row equals its PDF-verified Table 3-5 cells; the eligible bases are exactly the three the text names; it cannot be installed alone', () => {
  const pd = weapons.find(w => w.id === 'point-defense');
  assert.deepEqual([pd.emplacementPoints, pd.availability, pd.cost, pd.costType, pd.sizeRestriction], [0, 'Restricted', 4000, 'modifier', 'Colossal (Frigate) or Larger']);
  const rows = []; (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.source?.table === '3-5' && /point-defense/i.test(o.printedName ?? '')) rows.push(o); Object.values(o).forEach(walk); } })(printed);
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].emplacementPoints, rows[0].availability, rows[0].cost, rows[0].sizeRestriction, rows[0].source.printedPage], [0, 'Restricted', { kind: 'addition', value: 4000, printed: '+4000' }, 'Colossal or larger starships only', 47]);
  const fx = E.EFFECTS['point-defense'];
  assert.deepEqual([fx.kind, fx.extraCredits, fx.extraEmplacementPoints, fx.pointDefense, fx.rangeSlug], ['weapon-option', 4000, 0, true, 'point-defense']);
  assert.deepEqual([...fx.eligibleBases].sort(), ELIGIBLE.map(e => e[0]).sort(), 'blaster cannons, laser cannons and LIGHT ion cannons');
  assert.equal(cert['point-defense'].status, 'MECHANIC_SPECIFIED'); assert.equal(cert['point-defense'].effectTest, 'tests/vehicle-universal-phase4e-p34-point-defense.test.mjs');
  assert.ok(ranges.some(r => r.slug === 'point-defense'));
  // a weapon option is bought WITH a weapon
  const alone = L.planVehicleInstallation({ record: actors.find(a => a.system.vehicleSourceEntryKey === HULLS.frigate).flags.swse.universalVehicleSource.source, flags: { swse: {} }, catalogEntry: catalogRow('point-defense'), installId: 'x', availableCredits: 1e9, rules,
    mount: S.normalizeMount(GM_MOUNT, { isGM: true, userId: 'gm1', now: 1 }).mount, nonstandard: false });
  assert.ok(alone.reasons.includes('WEAPON_OPTION_REQUIRES_A_BASE_WEAPON'));
});

for (const [id, baseEp, basePrice] of ELIGIBLE) {
  test(`${id}: bought with point defense -> +4,000 credits, no extra EP, no capital-ship penalty; the same weapon without it keeps the penalty; removal`, async () => {
    world({ hull: 'frigate' });
    const c0 = owner.system.credits;
    const pdBuy = await buy(id, 'frigate', 'point-defense');
    assert.equal(pdBuy.start.success, true, JSON.stringify(pdBuy.start));
    assert.equal(c0 - owner.system.credits, basePrice + PD, 'the base price plus the printed 4,000 per weapon');
    const { entry, weapon } = pdBuy;
    assert.deepEqual([entry.catalogId, entry.epCost, entry.priceCredits, entry.executable, entry.option?.catalogId, entry.option?.pointDefense, entry.option?.extraCredits],
      [id, baseEp, basePrice + PD, true, 'point-defense', true, PD]);
    assert.equal(entry.name, `${weapons.find(w => w.id === id).name} (Point-Defense)`);
    assert.equal(weapon.name, entry.name);
    assert.equal(weapon.system.damage, E.EFFECTS[id].damage, 'the weapon itself is unchanged');
    assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).kind, 'CERTIFIED_INSTALLATION');
    const auth = resolveVehicleWeaponAuthority(weapon);
    assert.deepEqual([auth.installed.pointDefense, auth.installed.rangeSlug], [true, 'point-defense']);

    // ATTACK: no -20 against a target smaller than Colossal (Core p. 170; SotG)
    const small = await fire(vehicle, weapon, smallTarget);
    assert.equal(small.blocked, false, small.log.join('|'));
    assert.equal(penalty(small.result).length, 0, 'a point-defense weapon takes no penalty');

    // CONTROL: the same weapon bought plainly on the same hull takes the -20 once
    const plain = await buy(id, 'frigate', null, 'turret-2');
    assert.equal(plain.entry.option, undefined); assert.equal(plain.entry.priceCredits, basePrice);
    const ctrl = await fire(vehicle, plain.weapon, smallTarget);
    assert.equal(penalty(ctrl.result).length, 1); assert.equal(penalty(ctrl.result)[0].value, -20);
    assert.equal(ctrl.result.atkBonus, small.result.atkBonus - 20, 'identical except for the -20');

    // damage is the ordinary vehicle damage of the base weapon
    const d = resolveVehicleWeaponDamage(weapon);
    assert.equal(d.ok, true); assert.equal(d.printed, E.EFFECTS[id].damage);

    // REMOVAL revokes the point-defense weapon and leaves the other
    const rm = await S.uninstall({ ownerActor: owner, vehicle, installId: entry.installId });
    assert.equal(rm.success, true, JSON.stringify(rm));
    assert.deepEqual(managed().map(i => i.id), [plain.weapon.id]);
    assert.equal((await fire(vehicle, weapon)).blocked, true);
  });
}

test('eligibility: other weapons and starfighter hulls are refused before any charge; the option never changes the weapon it is not allowed on', async () => {
  for (const id of INELIGIBLE) {
    world({ hull: 'frigate' });
    const r = await buy(id, 'frigate', 'point-defense');
    assert.equal(r.start.success, false, id);
    assert.ok(r.start.reasons.includes('OPTION_BASE_WEAPON_INELIGIBLE'), `${id}: ${r.start.reasons}`);
    assert.equal(owner.system.credits, 200000, `${id}: nothing charged`);
    assert.equal(jobs('frigate').length, 0);
  }
  // a starfighter hull cannot carry point defense, even with an eligible weapon
  world({ hull: 'fighter' });
  const r = await buy('laser-cannon-light', 'fighter', 'point-defense');
  assert.equal(r.start.success, false);
  assert.ok(r.start.reasons.includes('OPTION_SIZE_INELIGIBLE'), r.start.reasons.join());
  assert.equal(owner.system.credits, 200000);
  // the ordinary purchase of the same weapon on that hull is unaffected
  assert.equal((await buy('laser-cannon-light', 'fighter')).entry.priceCredits, 1500);
  // an unknown or non-option row cannot be passed as an option
  world({ hull: 'frigate' });
  assert.deepEqual((await buy('laser-cannon-light', 'frigate', 'blaster-cannon-light')).start.reasons.filter(x => x === 'NOT_A_WEAPON_OPTION'), ['NOT_A_WEAPON_OPTION']);
  assert.deepEqual((await S.startJob({ ownerActor: owner, vehicle, catalogId: 'laser-cannon-light', optionId: 'nope', catalog: catalogOf('laser-cannon-light'), mount: GM_MOUNT })).reasons, ['OPTION_NOT_IN_CATALOG']);
  // the option cannot be bought as a weapon of its own
  const alone = await S.startJob({ ownerActor: owner, vehicle, catalogId: 'point-defense', catalog: catalogOf('point-defense'), mount: GM_MOUNT });
  assert.equal(alone.success, false); assert.ok(alone.reasons.includes('WEAPON_OPTION_REQUIRES_A_BASE_WEAPON'));
  assert.equal(owner.system.credits, 200000);
});

test('price integrity: a catalog row with a changed point-defense price or EP is refused, not trusted; GM instant installation takes the same path', async () => {
  world({ hull: 'frigate' });
  const base = catalogRow('laser-cannon-light'), opt = catalogRow('point-defense');
  const plan = o => L.planVehicleInstallation({ record: src.flags.swse.universalVehicleSource.source, flags: { swse: {} }, catalogEntry: base, option: o, installId: 'x', availableCredits: 1e9, rules,
    mount: S.normalizeMount(GM_MOUNT, { isGM: true, userId: 'gm1', now: 1 }).mount, nonstandard: false });
  assert.deepEqual([plan(opt).ok, plan(opt).entry.priceCredits], [true, 5500]);
  assert.ok(plan({ ...opt, cost: 1 }).reasons.includes('OPTION_PRICE_DIFFERS_FROM_CERTIFIED_ROW'));
  assert.ok(plan({ ...opt, costType: 'flat' }).reasons.includes('OPTION_PRICE_DIFFERS_FROM_CERTIFIED_ROW'));
  assert.ok(plan({ ...opt, emplacementPoints: 3 }).reasons.includes('OPTION_EP_DIFFERS_FROM_CERTIFIED_ROW'));
  assert.ok(plan({ ...opt, certification: { status: 'SOURCE_VERIFIED' } }).reasons.includes('OPTION_UNCERTIFIED'));
  const c0 = owner.system.credits;
  const r = await S.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: 'blaster-cannon-heavy', optionId: 'point-defense', catalog: catalogOf('blaster-cannon-heavy', 'point-defense'), reason: 'refit', mount: GM_MOUNT });
  assert.equal(r.success, true, JSON.stringify(r));
  assert.equal(c0 - owner.system.credits, 5500 + PD);
  assert.deepEqual([managed()[0].name, ledger('frigate')[0].epCost], ['Blaster Cannon, Heavy (Point-Defense)', 2]);
});

test('seal: the option is part of the sealed entry; adding, removing or editing it breaks the seal and revokes the weapon; the Item cannot claim it', async () => {
  world({ hull: 'frigate' });
  const plain = await buy('laser-cannon-light', 'frigate');
  const raw = () => src.flags.swse.vehicleInstallations;
  // forging point defense onto a plain weapon: the entry digest no longer matches, the entry is not trusted, the weapon cannot fire
  raw()[0].option = { catalogId: 'point-defense', label: 'Point-Defense', extraCredits: 4000, extraEmplacementPoints: 0, pointDefense: true, rangeSlug: 'point-defense' };
  assert.equal(ledger('frigate').length, 0);
  assert.equal((await fire(vehicle, plain.weapon)).blocked, true);
  // the Item's own name cannot grant the exemption either
  world({ hull: 'frigate' });
  const p2 = await buy('laser-cannon-light', 'frigate');
  p2.weapon.name = 'Laser Cannon, Light (Point-Defense)';
  assert.equal((await fire(vehicle, p2.weapon)).blocked, true, 'a renamed Item is refused');
  // and removing the option from a point-defense entry also breaks the seal
  world({ hull: 'frigate' });
  const p3 = await buy('laser-cannon-light', 'frigate', 'point-defense');
  delete raw()[0].option;
  assert.equal(ledger('frigate').length, 0);
  assert.equal((await fire(vehicle, p3.weapon)).blocked, true);
});

test('SHEET: only a Colossal (frigate)-or-larger hull is offered the option; the actions pass it only with a weapon', async () => {
  const { buildVehicleSchemaViewModel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-schema-view-model.js');
  const { runShipyardAction } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-shipyard-actions.js');
  const wrapActor = a => ({ ...structuredClone(a), id: 'v1', isOwner: true, items: [], toObject: () => structuredClone(a) });
  const catalog = new Map([...['laser-cannon-light', 'point-defense'].map(id => [id, catalogRow(id)])]);
  const frig = buildVehicleSchemaViewModel(wrapActor(actors.find(a => a.system.vehicleSourceEntryKey === HULLS.frigate)), { catalog, isGM: true, canAct: true }).shipyard;
  const figh = buildVehicleSchemaViewModel(wrapActor(actors.find(a => a.system.vehicleSourceEntryKey === HULLS.fighter)), { catalog, isGM: true, canAct: true }).shipyard;
  assert.deepEqual(frig.weaponOptions.map(o => [o.id, o.extraCredits]), [['point-defense', 4000]]); assert.equal(frig.hasWeaponOptions, true);
  assert.equal(figh.hasWeaponOptions, false);
  assert.ok(!frig.options.some(o => o.id === 'point-defense'), 'the option is not listed as an installable component of its own');
  const calls = [];
  const service = { startJob: async a => { calls.push(['start', a.catalogId, a.optionId ?? null]); return { success: true }; }, gmInstantInstall: async a => { calls.push(['instant', a.catalogId, a.optionId ?? null]); return { success: true }; } };
  const o1 = { id: 'o1', type: 'character' };
  const deps = { service, notify: { info() {}, warn() {} }, askReason: async () => 'r', askMount: async () => ({ mountKey: 'm', arc: 'omni', operatorRole: 'pilot', reason: 'r' }),
    game: { user: { isGM: true, character: o1 }, actors: { get: () => o1, contents: [o1] } } };
  const veh = { id: 'v1', isOwner: true, system: { ownedByActorId: 'o1' }, flags: { swse: {} } };
  await runShipyardAction({ action: 'start-job', catalogId: 'laser-cannon-light', optionId: 'point-defense', vehicle: veh }, deps);
  await runShipyardAction({ action: 'start-job', catalogId: 'armor-1', optionId: 'point-defense', vehicle: veh }, deps);
  await runShipyardAction({ action: 'gm-instant', catalogId: 'laser-cannon-light', optionId: 'point-defense', vehicle: veh }, deps);
  assert.deepEqual(calls, [['start', 'laser-cannon-light', 'point-defense'], ['start', 'armor-1', null], ['instant', 'laser-cannon-light', 'point-defense']], 'an option rides only with a weapon');
});
