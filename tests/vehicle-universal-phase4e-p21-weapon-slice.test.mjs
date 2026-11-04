import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import * as E from '../scripts/domain/vehicles/vehicle-modification-effects.js';
import { buildInstalledWeaponItemData, planInstalledWeaponItemSync } from '../scripts/domain/vehicles/vehicle-installed-weapon-items.js';
import { classifyInstalledVehicleWeapon } from '../scripts/domain/vehicles/vehicle-attack-provenance.js';

installSystemsResolver(); installFoundryStubs();
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');
const { VehicleInstallationService: Svc } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const weapons = load('weapon-systems');
const cert = { ...load('certification-p6a').rows, ...load('certification').rows };
const row = id => ({ ...weapons.find(c => c.id === id), certification: cert[id] });
const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';
const rules = { ...L.DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: () => ({ state: 'known', total: 4 }), resolveNonstandard: () => ({ nonstandard: false, basis: 'T' }) };
const GM_MOUNT = Svc.normalizeMount({ mountKey: 'nose', arc: 'forward', operatorRole: 'pilot', reason: 'Nose hardpoint fitted at Mos Eisley' }, { isGM: true, userId: 'gm1', now: 1 }).mount;
const recOf = a => a.flags.swse.universalVehicleSource.source;
const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });

function ship() {
  const d = structuredClone(docs.find(x => x.flags.swse.canonicalPublication.sourceEntryKey === XW));
  return Object.assign(d, { id: 'veh1', isOwner: true, items: new Map(), getActiveTokens: () => [token(0, 0)], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
}
const plan = (a, id, mount = GM_MOUNT, installId = 'w1') => L.planVehicleInstallation({ record: recOf(a), flags: a.flags, catalogEntry: row(id), installId, availableCredits: 1e9, rules, mount, nonstandard: false });
function armed() {
  const a = ship(); const p = plan(a, 'laser-cannon-light');
  assert.equal(p.ok, true, (p.reasons ?? []).join());
  a.flags.swse.vehicleInstallations = p.nextLedger;
  const item = { id: 'item1', ...buildInstalledWeaponItemData(p.entry) };
  item.actor = a; a.items.set(item.id, item);
  return { vehicle: a, weapon: item, entry: p.entry };
}

test('certification: the light laser cannon row is PDF-verified and certified as a weapon specification', () => {
  const printed = JSON.parse(readFileSync('data/audits/vehicles/p6a/print-verified-components-v2.json', 'utf8'));
  const pr = JSON.stringify(printed);
  assert.match(pr, /"printedName":"Laser cannon, light","damage":"3d10x2","damageStatus":"PDF_VERIFIED","emplacementPoints":1,"emplacementPointsPrinted":"1","availability":"Licensed","cost":\{"kind":"flat","credits":1500/);
  const r = row('laser-cannon-light');
  assert.deepEqual([r.damage, r.emplacementPoints, r.availability, r.cost, r.costType, r.sizeRestriction], ['3d10x2', 1, 'Licensed', 1500, 'flat', null]);
  assert.equal(cert['laser-cannon-light'].status, 'MECHANIC_SPECIFIED');
  assert.equal(E.EFFECTS['laser-cannon-light'].kind, 'weapon');
  // the same path extends only to rows with identical rules: the medium and heavy laser cannons (PDF-verified rows)
  for (const [id, dmg] of [['laser-cannon-medium', '4d10x2'], ['laser-cannon-heavy', '5d10x2']]) {
    assert.equal(cert[id].status, 'MECHANIC_SPECIFIED', id);
    assert.equal(row(id).damage, dmg);
    assert.match(pr, new RegExp(`"printedName":"Laser cannon, ${id.split('-').pop()}","damage":"${dmg}","damageStatus":"PDF_VERIFIED"`));
  }
  // WE-1 promoted the blaster cannons, ion cannons and turbolasers (below); configurations, launchers and ammunition are not
  // promoted by that: each needs its own sourced mechanic.
  for (const id of ['shieldbuster-torpedo-launcher', 'concussion-missile-light', 'tractor-beam', 'gravity-well-projector', 'fire-linked-optional'])
    assert.notEqual(cert[id]?.status, 'MECHANIC_SPECIFIED', id + ' is not promoted automatically');
});

test('mount provenance (V-P2-04): only a GM certifies, with a reason; caller-supplied provenance is refused', () => {
  assert.deepEqual(Svc.normalizeMount({ mountKey: 'n', arc: 'forward', operatorRole: 'pilot' }, { isGM: false }).mount, { mountKey: 'n', arc: 'forward', operatorRole: 'pilot' });
  assert.equal(Svc.normalizeMount({ mountKey: 'n', arc: 'forward', operatorRole: 'pilot' }, { isGM: true }).error, 'MOUNT_CERTIFICATION_REASON_REQUIRED');
  assert.equal(Svc.normalizeMount({ mountKey: 'n', arc: 'forward', operatorRole: 'pilot', evidence: { book: 'Fake', page: 1 } }, { isGM: false }).error, 'MOUNT_PROVENANCE_SET_BY_SERVICE_ONLY');
  assert.equal(Svc.normalizeMount({ mountKey: 'n', arc: 'forward', operatorRole: 'pilot', certification: { basis: 'GM_ADJUDICATED', gmUserId: 'x', reason: 'r', approvedAt: 1 } }, { isGM: false }).error, 'MOUNT_PROVENANCE_SET_BY_SERVICE_ONLY');
  assert.deepEqual(GM_MOUNT.certification, { basis: 'GM_ADJUDICATED', gmUserId: 'gm1', approvedAt: 1, reason: 'Nose hardpoint fitted at Mos Eisley' });
});

test('installation: GM-certified mount + certified row -> executable sealed entry; every other validation still applies', () => {
  const a = ship();
  const ok = plan(a, 'laser-cannon-light');
  assert.equal(ok.ok, true);
  assert.equal(ok.entry.executable, true);
  assert.equal(ok.entry.mount.basis, 'GM_ADJUDICATED');
  assert.equal(ok.entry.mount.evidence, null, 'a GM-adjudicated mount is never recorded as printed evidence');
  assert.equal(ok.entry.priceCredits, 1500);
  assert.equal(ok.entry.epCost, 1);
  // uncertified mount (non-GM request) -> refused
  assert.ok(plan(a, 'laser-cannon-light', { mountKey: 'nose', arc: 'forward', operatorRole: 'pilot' }).reasons.includes('WEAPON_MOUNT_UNCERTIFIED'));
  assert.ok(plan(a, 'laser-cannon-light', null).reasons.includes('WEAPON_MOUNT_UNCERTIFIED'));
  assert.ok(plan(a, 'laser-cannon-light', { ...GM_MOUNT, arc: 'sideways' }).reasons.includes('WEAPON_MOUNT_ARC_INVALID'));
  assert.ok(plan(a, 'laser-cannon-light', { ...GM_MOUNT, operatorRole: 'cook' }).reasons.includes('WEAPON_MOUNT_OPERATOR_INVALID'));
  // a GM mount does not certify an uncertified weapon row; a configuration is bought only WITH a weapon
  assert.ok(plan(a, 'shieldbuster-torpedo-launcher').reasons.includes('MODIFICATION_EFFECT_NOT_IMPLEMENTED'));
  assert.ok(plan(a, 'autoblaster').reasons.includes('WEAPON_OPTION_REQUIRES_A_BASE_WEAPON'));
  // capital hulls accept weapons now: the Core -20 is applied at attack time (p24)
  const capital = structuredClone(docs.find(d => d.flags.swse.universalVehicleSource.source.classification.printedSize === 'Colossal (frigate)'));
  assert.equal(L.planVehicleInstallation({ record: capital.flags.swse.universalVehicleSource.source, flags: capital.flags, catalogEntry: row('laser-cannon-light'), installId: 'c1', availableCredits: 1e9, rules, mount: GM_MOUNT, nonstandard: false }).ok, true);
  // cost, EP, mount uniqueness and duplicate ids
  a.flags.swse.vehicleInstallations = ok.nextLedger;
  assert.ok(plan(a, 'laser-cannon-light', GM_MOUNT, 'w2').reasons.includes('WEAPON_MOUNT_KEY_IN_USE'));
  assert.ok(L.planVehicleInstallation({ record: recOf(a), flags: a.flags, catalogEntry: row('laser-cannon-light'), installId: 'w3', availableCredits: 100, rules, mount: { ...GM_MOUNT, mountKey: 'wing' }, nonstandard: false }).reasons.includes('INSUFFICIENT_CREDITS'));
  const tight = { ...rules, resolveEpBudget: () => ({ state: 'known', total: 1 }) };
  // over the EP budget: the published shortfall penalties apply (SotG: +20% cost, +2 days, +5 DC per missing point)
  const over = L.planVehicleInstallation({ record: recOf(a), flags: a.flags, catalogEntry: row('laser-cannon-light'), installId: 'w4', availableCredits: 1e9, rules: tight, mount: { ...GM_MOUNT, mountKey: 'wing' }, nonstandard: false });
  assert.deepEqual([over.entry.quote.shortfall, over.entry.priceCredits, over.entry.quote.mechanicsDC], [1, 1800, 26]);
  assert.ok(L.planVehicleInstallation({ record: recOf(a), flags: a.flags, catalogEntry: row('laser-cannon-light'), installId: 'w4', availableCredits: 1e9, rules: { ...tight, allowEpShortfall: false }, mount: { ...GM_MOUNT, mountKey: 'wing' }, nonstandard: false }).reasons.includes('EP_EXCEEDED'));
  // a changed catalog damage string is not silently trusted
  assert.ok(L.planVehicleInstallation({ record: recOf(a), flags: { swse: {} }, catalogEntry: { ...row('laser-cannon-light'), damage: '9d10x2' }, installId: 'w5', availableCredits: 1e9, rules, mount: GM_MOUNT, nonstandard: false }).reasons.includes('WEAPON_DAMAGE_DIFFERS_FROM_CERTIFIED_ROW'));
});

test('owned Item: created from the certified spec for an executable entry; removed when the installation is gone', async () => {
  const { entry } = armed();
  const data = buildInstalledWeaponItemData(entry);
  assert.equal(data.name, 'Laser Cannon, Light');
  assert.equal(data.system.damage, '3d10x2');
  assert.deepEqual([data.system.vehicleMount.installId, data.system.vehicleMount.crewRole, data.system.vehicleMount.arc, data.system.vehicleMount.mountBasis], ['w1', 'pilot', 'forward', 'GM_ADJUDICATED']);
  assert.equal(planInstalledWeaponItemSync({ items: [], entries: [entry] }).create.length, 1);
  assert.equal(planInstalledWeaponItemSync({ items: [{ id: 'i1', ...data }], entries: [entry] }).create.length, 0, 'idempotent');
  assert.deepEqual(planInstalledWeaponItemSync({ items: [{ id: 'i1', ...data }, { id: 'personal', name: 'Blaster', flags: {} }], entries: [] }).deleteIds, ['i1'], 'only Shipyard-created weapon Items are removed');
  assert.equal(buildInstalledWeaponItemData({ ...entry, executable: false }), null);
  // the service applies the plan through ActorEngine
  const calls = [];
  const a = ship(); a.flags.swse.vehicleInstallations = [entry];
  a.items = new (class extends Map { [Symbol.iterator]() { return this.values(); } })();   // iterates documents like Foundry
  ActorEngine.createEmbeddedDocuments = async (actor, name, d) => { calls.push(['create', name, d.length]); d.forEach((x, i) => a.items.set('n' + i, { id: 'n' + i, ...structuredClone(x), actor: a })); };
  ActorEngine.deleteEmbeddedDocuments = async (actor, name, ids) => { calls.push(['delete', name, ids]); };
  const r = await Svc.syncWeaponItems(a, { stock: false });   // aftermarket Items only (stock arming is covered by p25)
  assert.equal(r.success, true, JSON.stringify(r));
  assert.deepEqual(calls, [['create', 'Item', 1]]);
});

const log = [];
globalThis.ui = { notifications: { warn: m => log.push('WARN ' + m), error: m => log.push('ERR ' + m), info() {} } };
const fire = async (vehicle, weapon, t = { id: 'tgt', type: 'character', items: [], system: { defenses: { reflex: { total: 15 } } }, getActiveTokens: () => [token(500, 0)] }) => {
  log.length = 0;
  let result = null;
  try { result = await rollAttack(vehicle, weapon, { abstractCrewQuality: 'normal', target: t }); } catch (e) { log.push('THREW ' + e.message); }
  return { result, blocked: log.some(m => /blocked|requires/.test(m)), log: [...log] };
};

test('attack: the installed laser cannon fires through the existing preflight and vehicle attack math', async () => {
  const { vehicle, weapon } = armed();
  assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).kind, 'CERTIFIED_INSTALLATION');
  const r = await fire(vehicle, weapon);
  assert.equal(r.blocked, false, r.log.join('|'));
  assert.equal(r.result.attackDomain, 'vehicle-abstract-crew');
  assert.equal(r.result.atkBonus, 2 + 3, 'normal crew BAB +2 and X-wing Intelligence 16 (+3)');
  // behind the forward arc
  assert.equal((await fire(vehicle, weapon, { id: 'tgt', type: 'character', items: [], getActiveTokens: () => [token(-500, 0)] })).blocked, true);
  // a user who does not own the vehicle
  const g = globalThis.game.user; vehicle.isOwner = false;
  assert.equal((await fire(vehicle, weapon)).log.some(m => /ATTACK_USER_NOT_AUTHORIZED/.test(m)), true);
  vehicle.isOwner = true; globalThis.game.user = g;
});

test('removal or invalidation revokes execution', async () => {
  let { vehicle, weapon } = armed();
  vehicle.flags.swse.vehicleInstallations = L.planVehicleUninstall({ record: recOf(vehicle), flags: vehicle.flags, installId: 'w1' }).nextLedger;
  assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).reason, 'SOURCE_BACKED_WEAPON_WITHOUT_CERTIFIED_INSTALLATION');
  assert.equal((await fire(vehicle, weapon)).blocked, true);
  ({ vehicle, weapon } = armed());
  vehicle.flags.swse.vehicleInstallations[0].mount.arc = 'aft';            // tampered sealed entry
  assert.equal((await fire(vehicle, weapon)).blocked, true);
  ({ vehicle, weapon } = armed());
  weapon.system.vehicleMount.crewRole = 'gunner';                          // Item edited away from the sealed mount
  assert.equal((await fire(vehicle, weapon)).blocked, true);
});

test('the heavy laser cannon uses the same path: 2 EP, 6,000 credits, 5d10 x 2', () => {
  const a = ship(); const p = plan(a, 'laser-cannon-heavy');
  assert.equal(p.ok, true, (p.reasons ?? []).join());
  assert.deepEqual([p.entry.epCost, p.entry.priceCredits, p.entry.executable], [2, 6000, true]);
  a.flags.swse.vehicleInstallations = p.nextLedger;
  const item = { id: 'h1', ...buildInstalledWeaponItemData(p.entry), actor: a }; a.items.set(item.id, item);
  assert.equal(buildDamageFormula(resolveDamageComposition(a, item, { weapon: item })), '(5d10) * 2');
  assert.equal(classifyInstalledVehicleWeapon(a, item).kind, 'CERTIFIED_INSTALLATION');
});

test('damage: Core vehicle formula (weapon dice x multiplier); never the printed string as dice; no ability or half level', () => {
  const { vehicle, weapon } = armed();
  const formula = ctx => buildDamageFormula(resolveDamageComposition(vehicle, weapon, { weapon, ...ctx }));
  assert.equal(formula({}), '(3d10) * 2');
  assert.equal(formula({ isCritical: true }), '((3d10) * 2) * 2', 'a natural 20 doubles the damage');
  // a heroic gunner rolling: still the Core vehicle formula
  const gunner = { id: 'p', type: 'character', items: [], system: { level: 10, attributes: { str: { base: 18 }, dex: { base: 16 } } } };
  assert.equal(buildDamageFormula(resolveDamageComposition(gunner, weapon, { weapon })), '(3d10) * 2');
  // an ordinary character weapon Item is unaffected
  const pistol = { id: 'bp', name: 'Blaster Pistol', type: 'weapon', system: { damage: '3d6' }, flags: {}, actor: gunner };
  assert.notEqual(resolveDamageComposition(gunner, pistol, { weapon: pistol }).bonus.flags?.vehicleWeaponFormula, true);
});

test('Shipyard UI: a GM is asked for the mount of a weapon; a player cannot supply one', async () => {
  const { runShipyardAction } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-shipyard-actions.js');
  const calls = [];
  const service = { startJob: async a => { calls.push(['startJob', a.mount]); return { success: true }; }, gmInstantInstall: async a => { calls.push(['gmInstant', a.mount, a.reason]); return { success: true }; } };
  const owner = { id: 'o1', type: 'character' };
  const mk = isGM => ({ service, notify: { info() {}, warn() {} }, askReason: async () => 'refit', game: { user: { isGM, character: owner }, actors: { get: () => owner, contents: [owner] } },
    askMount: async () => ({ mountKey: 'nose', arc: 'forward', operatorRole: 'pilot', reason: 'refit' }) });
  const vehicle = { id: 'veh1', isOwner: true, system: { ownerActorId: 'o1' }, flags: { swse: { vehicleOwner: { actorId: 'o1' } } } };
  const gm = mk(true), player = mk(false);
  await runShipyardAction({ action: 'start-job', catalogId: 'laser-cannon-light', vehicle }, gm);
  await runShipyardAction({ action: 'start-job', catalogId: 'laser-cannon-light', vehicle }, player);
  await runShipyardAction({ action: 'start-job', catalogId: 'armor-1', vehicle }, gm);
  await runShipyardAction({ action: 'gm-instant', catalogId: 'laser-cannon-light', vehicle }, gm);
  const cancelled = await runShipyardAction({ action: 'start-job', catalogId: 'laser-cannon-light', vehicle }, { ...gm, askMount: async () => null });
  const started = calls.filter(c => c[0] === 'startJob');
  if (!started.length) return assert.fail('owner resolution failed: ' + JSON.stringify(calls));
  assert.deepEqual(started.map(c => c[1]), [{ mountKey: 'nose', arc: 'forward', operatorRole: 'pilot', reason: 'refit' }, null, null], 'GM weapon: mount asked; player weapon: none (service refuses); non-weapon: none');
  assert.deepEqual(calls.find(c => c[0] === 'gmInstant').slice(1), [{ mountKey: 'nose', arc: 'forward', operatorRole: 'pilot', reason: 'refit' }, 'refit']);
  assert.deepEqual(cancelled.reasons, ['CANCELLED']);
});
