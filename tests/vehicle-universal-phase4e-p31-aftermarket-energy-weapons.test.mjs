/**
 * WE-1 (Complete Weapon Ecosystem): the plain aftermarket blaster cannons, ion cannons and turbolasers of Starships of the
 * Galaxy Table 3-5 (p. 47) through the SAME Shipyard path the laser cannons use:
 *   purchase (real TransactionEngine credit charge) -> installation job -> sealed ledger entry -> owned Item -> attack ->
 *   damage -> removal.
 * Every row is exercised individually; nothing here is a stock statblock (stock execution is covered by p25-p30).
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
import { resolveCertifiedInstalledWeapon, resolveVehicleWeaponDamage } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';

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

// id, printed damage (catalog form), EP, credits, availability, smallest hull, damage type
const ROWS = [
  ['blaster-cannon-light', '3d10x2', 1, 1200, 'Licensed', 'fighter', null],
  ['blaster-cannon-medium', '4d10x2', 1, 2500, 'Restricted', 'fighter', null],
  ['blaster-cannon-heavy', '5d10x2', 2, 5500, 'Military', 'fighter', null],
  ['ion-cannon-light', '3d10x2 (Ion)', 1, 2000, 'Licensed', 'fighter', 'ion'],
  ['ion-cannon-medium', '5d10x2 (Ion)', 2, 3000, 'Restricted', 'fighter', 'ion'],
  ['ion-cannon-heavy', '3d10x5 (Ion)', 5, 6000, 'Military', 'frigate', 'ion'],
  ['turbolaser-light', '3d10x5', 2, 5000, 'Military', 'frigate', null],
  ['turbolaser-medium', '5d10x5', 5, 10000, 'Military', 'frigate', null],
  ['turbolaser-heavy', '7d10x5', 10, 20000, 'Military', 'frigate', null]
];

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
  SnapshotManager.restoreSnapshot = async (actor, ts) => { const s = snaps.get(`${actor.id}:${ts}`); if (s && actor.id === 'owner1') actor.system.credits = s.credits; if (s && actor.id === 'veh1') src.flags = s.flags; return true; };
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const d of data) { const id = 'i' + (++seq); items.set(id, { id, ...structuredClone(d), actor: vehicle }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) items.delete(id); };
  S.rules = rules;
}
const catalogOf = id => new Map([[id, catalogRow(id)]]);
const key = hull => HULLS[hull];
const jobs = hull => J.readJobs(src.flags, key(hull)).jobs;
const ledger = hull => L.readCertifiedInstallations(src.flags, key(hull)).entries;
const managed = () => items.contents.filter(i => i.flags?.swse?.vehicleInstalledWeapon);

/** The published procedure: pay (start), the GM logs the work time, the Mechanics check succeeds, the ledger is sealed and the Item exists. */
async function buy(id, hull) {
  const catalog = catalogOf(id);
  const start = await S.startJob({ ownerActor: owner, vehicle, catalogId: id, catalog, mount: GM_MOUNT });
  assert.equal(start.success, true, `${id}: ${JSON.stringify(start)}`);
  const job = jobs(hull)[0];
  const days = J.describeJob(job).daysRequired;
  assert.equal((await S.logWorkDays({ ownerActor: owner, vehicle, jobId: job.jobId, days })).success, true);
  const done = await S.recordCheck({ ownerActor: owner, vehicle, jobId: job.jobId, total: 99 });
  assert.equal(done.success, true, `${id}: ${JSON.stringify(done)}`);
  return { start, done, job };
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

// ----------------------------------------------------------------------------------------------------------------------
test('SOURCE: every row equals the PDF-verified Table 3-5 cell set (damage, EP, availability, cost, size footnote) and is certified', () => {
  const pr = new Map();
  (function walk(o) { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.source?.table === '3-5' && o.printedName) pr.set(o.printedName.toLowerCase(), o); Object.values(o).forEach(walk); } })(printed);
  for (const [id, damage, ep, credits, availability, hull, type] of ROWS) {
    const catalog = weapons.find(w => w.id === id);
    const printedRow = pr.get(catalog.name.toLowerCase().replace(/^(\w+) (\w+), (\w+)$/, (_, a, b, c) => `${a} ${b}, ${c}`));
    assert.ok(printedRow, `${id}: a PDF-verified printed row exists (${catalog.name})`);
    assert.equal(printedRow.damageStatus, 'PDF_VERIFIED', id);
    assert.equal(printedRow.verification, 'PDF_VISUAL_REVIEW', id);
    assert.deepEqual([catalog.damage, catalog.emplacementPoints, catalog.availability, catalog.cost, catalog.costType], [damage, ep, availability, credits, 'flat'], `${id}: catalog row`);
    assert.deepEqual([printedRow.emplacementPoints, printedRow.availability, printedRow.cost.credits, printedRow.source.printedPage], [ep, availability, credits, 47], `${id}: printed row`);
    // the printed damage cell ("3d10x2 ion") and the catalog form ("3d10x2 (Ion)") state the same dice, multiplier and type
    assert.equal(printedRow.damage.replace(/ ion$/, ' (Ion)'), damage, `${id}: printed damage`);
    assert.equal(/ion/i.test(printedRow.damage), type === 'ion');
    // the size footnote: Colossal or larger only for the capital rows
    assert.equal(printedRow.sizeRestriction === 'Colossal or larger starships only', hull === 'frigate', `${id}: size footnote`);
    assert.equal(catalog.sizeRestriction === 'Colossal (Frigate) or Larger', hull === 'frigate', `${id}: catalog size restriction`);
    assert.equal(cert[id].status, 'MECHANIC_SPECIFIED', id);
    assert.equal(cert[id].printedPage, 47); assert.equal(cert[id].table, '3-5');
    assert.equal(E.EFFECTS[id].kind, 'weapon'); assert.equal(E.EFFECTS[id].damage, damage);
    assert.equal(cert[id].effectTest, 'tests/vehicle-universal-phase4e-p31-aftermarket-energy-weapons.test.mjs', id);
    assert.ok(ranges.some(r => r.slug === E.EFFECTS[id].rangeSlug), `${id}: Table 10-2 range row ${E.EFFECTS[id].rangeSlug}`);
  }
  // the family tags are the printed family, nothing inferred from anything else
  assert.deepEqual(Object.fromEntries(ROWS.map(r => [r[0], E.EFFECTS[r[0]].family])), {
    'blaster-cannon-light': 'blaster', 'blaster-cannon-medium': 'blaster', 'blaster-cannon-heavy': 'blaster',
    'ion-cannon-light': 'ion', 'ion-cannon-medium': 'ion', 'ion-cannon-heavy': 'ion',
    'turbolaser-light': 'turbolaser', 'turbolaser-medium': 'turbolaser', 'turbolaser-heavy': 'turbolaser' });
  // rows the Core / SotG text restricts further are still NOT promoted by this slice
  for (const id of ['ion-cannon-hapan-triple', 'autoblaster', 'cannon-double', 'cannon-quad', 'fire-linked-2'])
    assert.notEqual(cert[id]?.status, 'MECHANIC_SPECIFIED', id);
});

for (const [id, damage, ep, credits, availability, hull, type] of ROWS) {
  test(`${id}: purchase -> install -> Item -> attack -> damage -> removal`, async () => {
    world({ hull });
    const before = owner.system.credits;

    // PURCHASE + INSTALLATION: the real credit transaction charges the printed price; EP is reserved then counted; the ledger is sealed
    const { start, done } = await buy(id, hull);
    assert.equal(before - owner.system.credits, credits, 'the printed price was charged once');
    assert.equal(start.job.attempts.at(-1).priceCredits ?? start.job.priceCredits ?? credits, credits);
    const [entry] = ledger(hull);
    assert.ok(entry, 'a sealed ledger entry exists');
    assert.deepEqual([entry.catalogId, entry.epCost, entry.priceCredits, entry.executable, entry.mount.basis, entry.mount.operatorRole], [id, ep, credits, true, 'GM_ADJUDICATED', 'pilot']);
    assert.equal(entry.certification.status, 'MECHANIC_SPECIFIED');

    // OWNED ITEM: created from the certified specification by the installation itself
    assert.equal(done.weaponItems.success, true, JSON.stringify(done.weaponItems));
    const weapon = managed().find(i => i.flags.swse.vehicleInstalledWeapon.installId === entry.installId);
    assert.ok(weapon, 'the Item exists');
    assert.deepEqual([weapon.name, weapon.system.damage, weapon.system.vehicleMount.arc], [weapons.find(w => w.id === id).name, damage, 'omni']);
    assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).kind, 'CERTIFIED_INSTALLATION');
    assert.equal(resolveCertifiedInstalledWeapon(weapon).ok, true);

    // ATTACK: the same vehicle attack runtime as every other vehicle weapon
    const hit = await fire(vehicle, weapon, smallTarget);
    assert.equal(hit.blocked, false, hit.log.join('|'));
    assert.equal(hit.result.attackDomain, 'vehicle-abstract-crew');
    const capital = hit.result.componentLedger.filter(e => e.id === 'capital-ship-attack-penalty');
    if (hull === 'frigate') { assert.equal(capital.length, 1, 'a capital ship takes the Core -20 against a smaller target, once'); assert.equal(capital[0].value, -20); }
    else assert.equal(capital.length, 0, 'a starfighter never takes it');
    if (hull === 'frigate') assert.equal((await fire(vehicle, weapon, colossalTarget)).result.componentLedger.filter(e => e.id === 'capital-ship-attack-penalty').length, 0, 'no penalty against a Colossal target');

    // DAMAGE: weapon dice x printed multiplier, the printed type only where the table prints it, never a name guess
    const [, dice, mult] = /^(\d+d10)x(\d+)/.exec(damage);
    const d = resolveVehicleWeaponDamage(weapon);
    assert.deepEqual(d, { ok: true, formula: dice, multiplier: Number(mult), damageType: type, printed: damage });
    assert.equal(buildDamageFormula(resolveDamageComposition(vehicle, weapon, { weapon })), `(${dice}) * ${mult}`);
    assert.deepEqual(resolveDamageComposition(vehicle, weapon, { weapon }).damageTypes, type ? [type] : []);
    const posted = [];
    const realPost = SWSEChat.postRoll, realSafe = RollEngine.safeRoll, realSWSE = globalThis.SWSE;
    SWSEChat.postRoll = async arg => { posted.push(arg); return { id: 'm' }; };
    const roller = { safeRoll: async f => ({ total: 44, formula: f, dice: [], toJSON() { return { total: 44 }; } }) };
    RollEngine.safeRoll = roller.safeRoll; globalThis.SWSE = { ...(realSWSE ?? {}), RollEngine: roller };
    try { await rollDamage(vehicle, weapon, { target: smallTarget }); } finally { SWSEChat.postRoll = realPost; RollEngine.safeRoll = realSafe; globalThis.SWSE = realSWSE; }
    assert.equal(posted.length, 1);
    assert.equal(posted[0].roll.swseDamageFormula, `(${dice}) * ${mult}`);
    if (type) { assert.equal(posted[0].context.damageType, type); assert.ok(posted[0].context.damageTypes.includes(type)); }
    else assert.notEqual(posted[0].context.damageType, 'ion');

    // TAMPERING: the Item cannot change what the sealed entry certifies (for the ion rows that includes the damage type)
    const edited = { ...structuredClone({ ...weapon, actor: undefined }), id: 'edited', actor: vehicle };
    edited.system.damage = damage.replace(' (Ion)', '');
    if (type) { assert.equal(resolveCertifiedInstalledWeapon(edited).ok, false); assert.equal(classifyInstalledVehicleWeapon(vehicle, edited).kind, 'UNRESOLVED'); }

    // REMOVAL: the ledger entry is gone, the Item is deleted, and the old Item can no longer fire; no credits move without a refund ruling
    const afterPurchase = owner.system.credits;
    const rm = await S.uninstall({ ownerActor: owner, vehicle, installId: entry.installId });
    assert.equal(rm.success, true, JSON.stringify(rm));
    assert.equal(ledger(hull).length, 0);
    assert.equal(managed().length, 0, 'the Shipyard-created Item was removed');
    assert.equal(owner.system.credits, afterPurchase, 'no refund policy is decided: no credit movement');
    assert.equal((await fire(vehicle, weapon)).blocked, true, 'the removed weapon cannot fire');
    assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).reason, 'WEAPON_NOT_OWNED_BY_VEHICLE');
    // even a stale copy of the Item that somehow survives the deletion is revoked by the missing ledger entry
    items.set(weapon.id, weapon);
    assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).reason, 'SOURCE_BACKED_WEAPON_WITHOUT_CERTIFIED_INSTALLATION');
    assert.equal((await fire(vehicle, weapon)).blocked, true, 'a surviving stale Item cannot fire');
  });
}

test('GM instant installation uses the same certified path and charge for a representative row of each family', async () => {
  for (const [id, , , credits, , hull] of [ROWS[0], ROWS[3], ROWS[6]]) {
    world({ hull });
    const before = owner.system.credits;
    const r = await S.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: id, catalog: catalogOf(id), reason: 'refit', mount: GM_MOUNT });
    assert.equal(r.success, true, `${id}: ${JSON.stringify(r)}`);
    assert.equal(before - owner.system.credits, credits);
    assert.equal(managed().length, 1);
    assert.equal(classifyInstalledVehicleWeapon(vehicle, managed()[0]).kind, 'CERTIFIED_INSTALLATION');
  }
});

test('hull restriction: heavy ion cannons and all turbolasers refuse a starfighter and are accepted by a Colossal (frigate) hull', async () => {
  for (const [id, , , , , hull] of ROWS.filter(r => r[5] === 'frigate')) {
    world({ hull: 'fighter' });
    const refused = await S.startJob({ ownerActor: owner, vehicle, catalogId: id, catalog: catalogOf(id), mount: GM_MOUNT });
    assert.equal(refused.success, false, id);
    assert.ok(refused.reasons.some(r => r.startsWith('SIZE_')), `${id}: ${refused.reasons.join()}`);
    assert.equal(owner.system.credits, 200000, 'a refused purchase charges nothing');
    world({ hull });
    assert.equal((await S.startJob({ ownerActor: owner, vehicle, catalogId: id, catalog: catalogOf(id), mount: GM_MOUNT })).success, true, id);
  }
  // the ordinary cannons carry no size restriction
  for (const [id] of ROWS.filter(r => r[5] === 'fighter')) { world({ hull: 'fighter' }); assert.equal((await S.startJob({ ownerActor: owner, vehicle, catalogId: id, catalog: catalogOf(id), mount: GM_MOUNT })).success, true, id); }
});

test('purchase integrity: insufficient credits, an uncertified mount and a changed catalog damage string each refuse before any charge', async () => {
  world({ credits: 100 });
  let r = await S.startJob({ ownerActor: owner, vehicle, catalogId: 'blaster-cannon-light', catalog: catalogOf('blaster-cannon-light'), mount: GM_MOUNT });
  assert.ok(r.reasons.includes('INSUFFICIENT_CREDITS')); assert.equal(owner.system.credits, 100);
  world();
  r = await S.startJob({ ownerActor: owner, vehicle, catalogId: 'ion-cannon-light', catalog: catalogOf('ion-cannon-light'), mount: null });
  assert.ok(r.reasons.includes('WEAPON_MOUNT_UNCERTIFIED')); assert.equal(owner.system.credits, 200000);
  // a player cannot certify a mount (V-P2-04): the service refuses before the planner
  globalThis.game.user.isGM = false;
  const player = await S.startJob({ ownerActor: owner, vehicle, catalogId: 'ion-cannon-light', catalog: catalogOf('ion-cannon-light'), mount: GM_MOUNT });
  assert.ok(player.reasons.includes('WEAPON_MOUNT_UNCERTIFIED')); assert.equal(owner.system.credits, 200000);
  globalThis.game.user.isGM = true;
  const bad = L.planVehicleInstallation({ record: src.flags.swse.universalVehicleSource.source, flags: { swse: {} }, catalogEntry: { ...catalogRow('ion-cannon-light'), damage: '3d10x2' }, installId: 'x', availableCredits: 1e9, rules, mount: S.normalizeMount(GM_MOUNT, { isGM: true, userId: 'gm1', now: 1 }).mount, nonstandard: false });
  assert.ok(bad.reasons.includes('WEAPON_DAMAGE_DIFFERS_FROM_CERTIFIED_ROW'), 'dropping the printed Ion type from the catalog row is refused, not trusted');
});
