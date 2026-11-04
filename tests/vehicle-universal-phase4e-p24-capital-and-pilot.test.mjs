import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import * as E from '../scripts/domain/vehicles/vehicle-modification-effects.js';
import { buildInstalledWeaponItemData } from '../scripts/domain/vehicles/vehicle-installed-weapon-items.js';
import { capitalShipAttackPenalty, sizeRank, CAPITAL_SHIP_TARGETING_PENALTY } from '../scripts/domain/vehicles/vehicle-capital-penalty.js';

installSystemsResolver(); installFoundryStubs();
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { resolveVehicleAttackBonus, resolveAbstractCrewAttackBonus } = await import('../scripts/engine/combat/vehicle-attack-math.js');
const { VehicleInstallationService: Svc } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const weapons = load('weapon-systems');
const cert = { ...load('certification-p6a').rows, ...load('certification').rows };
const row = id => ({ ...weapons.find(c => c.id === id), certification: cert[id] });
const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const rules = { ...L.DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: () => ({ state: 'known', total: 10 }), resolveNonstandard: () => ({ nonstandard: false, basis: 'T' }) };
const MOUNT = (role = 'pilot') => Svc.normalizeMount({ mountKey: 'm1', arc: 'omni', operatorRole: role, reason: 'refit' }, { isGM: true, userId: 'gm1', now: 1 }).mount;
const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });

const HULLS = { fighter: 'core-incom-t-65b-x-wing-starfighter', transport: 'core-corellian-yt-1300-transport',
  frigate: 'cw-c-9979-landing-craft', cruiser: 'cw-invisible-hand' };
class Items extends Map { [Symbol.iterator]() { return this.values(); } }

function ship(hullKey, { id = 'laser-cannon-light', role = 'pilot', crew = null, option = null } = {}) {
  const d = structuredClone(docs.find(x => x.flags.swse.canonicalPublication.sourceEntryKey === HULLS[hullKey]));
  const a = Object.assign(d, { id: 'veh1', isOwner: true, items: new Items(), getActiveTokens: () => [token(0, 0)], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  if (crew) a.system.crewPositions = crew;
  const p = L.planVehicleInstallation({ record: a.flags.swse.universalVehicleSource.source, flags: a.flags, catalogEntry: row(id), option: option ? row(option) : null, installId: 'w1', availableCredits: 1e9, rules, mount: MOUNT(role), nonstandard: false });
  assert.equal(p.ok, true, hullKey + ': ' + (p.reasons ?? []).join());
  a.flags.swse.vehicleInstallations = p.nextLedger;
  const item = { id: 'item1', ...buildInstalledWeaponItemData(p.entry), actor: a };
  a.items.set(item.id, item);
  return { vehicle: a, weapon: item };
}
const targetOf = (size, type = 'character') => ({ id: 'tgt', type, items: [], system: size ? { size, defenses: { reflex: { total: 15 } } } : { defenses: { reflex: { total: 15 } } }, getActiveTokens: () => [token(300, 0)] });
const log = [];
globalThis.ui = { notifications: { warn: m => log.push(String(m)), error: m => log.push('ERR ' + m), info() {} } };
const fire = async (vehicle, weapon, target) => {
  log.length = 0; let result = null;
  try { result = await rollAttack(vehicle, weapon, { abstractCrewQuality: 'normal', target }); } catch (e) { log.push('THREW ' + e.message); }
  return { result, log: [...log], entries: (result?.componentLedger ?? []).filter(e => e.id === 'capital-ship-attack-penalty') };
};

test('rule: -20 once, only for a Colossal (frigate)-or-larger attacker against a target smaller than Colossal', () => {
  assert.equal(CAPITAL_SHIP_TARGETING_PENALTY, -20);
  const r = (attackerSize, targetSize, pointDefense) => capitalShipAttackPenalty({ attackerSize, targetSize, pointDefense });
  for (const a of ['Colossal (frigate)', 'Colossal (cruiser)', 'Colossal (station)'])
    for (const t of ['Medium', 'Large', 'Huge', 'Gargantuan', 'small', 'Tiny']) assert.deepEqual(r(a, t), { status: 'APPLIES', value: -20 }, `${a} vs ${t}`);
  for (const a of ['Colossal (frigate)', 'Colossal (cruiser)'])
    for (const t of ['Colossal', 'Colossal (frigate)', 'Colossal (cruiser)', 'Colossal (station)']) assert.equal(r(a, t).value, 0, `${a} vs ${t}`);
  for (const a of ['Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal']) assert.equal(r(a, 'Medium').status, 'NOT_CAPITAL_ATTACKER', a);
  assert.equal(r('Colossal (frigate)', 'Medium', true).status, 'POINT_DEFENSE_EXEMPT');
  assert.equal(r('Colossal (frigate)', null).status, 'TARGET_SIZE_UNKNOWN');
  assert.equal(r('Colossal (frigate)', 'Enormous').status, 'TARGET_SIZE_UNKNOWN');
  assert.equal(r(null, 'Medium').status, 'ATTACKER_SIZE_UNKNOWN');
  assert.equal(sizeRank('Colossal (station)'), sizeRank('Colossal'));
});

test('attacks: starfighter and transport never take the penalty; frigate and cruiser take it exactly once vs small targets', async () => {
  const attackBonus = async (hull, target) => { const { vehicle, weapon } = ship(hull); const r = await fire(vehicle, weapon, target); assert.ok(r.result, hull + ': ' + r.log.join('|')); return r; };
  const base = {};
  for (const hull of ['fighter', 'transport']) {
    for (const size of ['medium', 'huge', 'gargantuan']) { const r = await attackBonus(hull, targetOf(size)); assert.equal(r.entries.length, 0, `${hull} vs ${size}`); }
    base[hull] = (await attackBonus(hull, targetOf('medium'))).result.atkBonus;
  }
  for (const hull of ['frigate', 'cruiser']) {
    const noPen = (await attackBonus(hull, targetOf('colossal', 'vehicle'))).result;
    assert.equal(noPen.componentLedger.filter(e => e.id === 'capital-ship-attack-penalty').length, 0, hull + ' vs Colossal');
    for (const size of ['medium', 'large', 'huge', 'gargantuan']) {
      const r = await attackBonus(hull, targetOf(size));
      assert.equal(r.entries.length, 1, `${hull} vs ${size}: exactly one penalty entry`);
      assert.deepEqual([r.entries[0].value, r.entries[0].applied], [-20, true]);
      assert.equal(r.result.atkBonus, noPen.atkBonus - 20, `${hull} vs ${size}: total includes the penalty once`);
    }
  }
  assert.ok(base.fighter > -20);
});

test('attacks: a vehicle target is sized from its verified record; a Colossal or larger one avoids the penalty', async () => {
  const frigate = ship('frigate');
  const hullDoc = k => structuredClone(docs.find(x => x.flags.swse.canonicalPublication.sourceEntryKey === HULLS[k]));
  const asTarget = k => { const d = hullDoc(k); return Object.assign(d, { id: 'tgt', type: 'vehicle', items: new Items(), getActiveTokens: () => [token(300, 0)], toObject() { const { toObject, items, getActiveTokens, ...r } = this; return structuredClone(r); } }); };
  assert.equal((await fire(frigate.vehicle, frigate.weapon, asTarget('fighter'))).entries.length, 1, 'starfighter (Gargantuan) target');
  assert.equal((await fire(frigate.vehicle, frigate.weapon, asTarget('transport'))).entries.length, 0, 'Colossal transport target');
  assert.equal((await fire(frigate.vehicle, frigate.weapon, asTarget('cruiser'))).entries.length, 0, 'cruiser target');
});

test('attacks: unknown target size is refused for a capital attacker, never guessed', async () => {
  const { vehicle, weapon } = ship('cruiser');
  const r = await fire(vehicle, weapon, targetOf(null));
  assert.equal(r.result, null);
  assert.ok(r.log.some(m => /needs the size of its target/.test(m)), r.log.join('|'));
  const ok = ship('fighter');                                   // a non-capital attacker does not need the target size
  assert.ok((await fire(ok.vehicle, ok.weapon, targetOf(null))).result);
});

test('point-defense exemption comes only from the certified specification, never from names or Item fields', async () => {
  const { vehicle, weapon } = ship('frigate');
  const claim = async () => (await fire(vehicle, weapon, targetOf('medium'))).entries.length;
  assert.equal(await claim(), 1);
  weapon.system.pointDefense = true; weapon.system.range = 'point-defense'; weapon.flags.swse.pointDefense = true;   // editable claims
  assert.equal(await claim(), 1, 'editable fields do not exempt');
  vehicle.name = 'Point-Defense Frigate';
  assert.equal(await claim(), 1, 'names do not exempt');
  // WE-PD: only a CERTIFIED OPTION sealed into the installation can (the point-defense modification, bought with an eligible weapon)
  const pd = ship('frigate', { option: 'point-defense' });
  const pdPenalty = async () => (await fire(pd.vehicle, pd.weapon, targetOf('medium'))).entries.length;
  assert.equal(await pdPenalty(), 0, 'certified point-defense is exempt');
  pd.weapon.system.pointDefense = false; pd.vehicle.name = 'Plain Frigate';
  assert.equal(await pdPenalty(), 0, 'the exemption does not depend on names or editable fields either way');
  assert.equal(await claim(), 1, 'the plain weapon on the same hull still takes the penalty');
});

test('abstract-crew path uses the same authority and the penalty shows in the breakdown', async () => {
  const { vehicle, weapon } = ship('cruiser');
  const r = await resolveAbstractCrewAttackBonus(vehicle, weapon, 'normal', { target: targetOf('medium') });
  assert.equal(r.error, null);
  const e = r.ledger.find(x => x.id === 'capital-ship-attack-penalty');
  assert.deepEqual([e.value, e.category, e.applied], [-20, 'vehicle', true]);
  assert.match(e.reason, /Core Rulebook/);
  assert.equal((await resolveAbstractCrewAttackBonus(vehicle, weapon, 'normal', { target: targetOf(null) })).error, 'capital-ship-target-size-unknown');
});

test('weapons can now be installed on frigate-size and larger hulls', () => {
  for (const hull of ['frigate', 'cruiser']) assert.ok(ship(hull).weapon);
  const src = readFileSync('scripts/domain/vehicles/vehicle-modification-effects.js', 'utf8');
  assert.doesNotMatch(src, /CAPITAL_SHIP_TARGETING_PENALTY_NOT_IMPLEMENTED/);
});

// ---------------------------------------------------------------------------------------------------------------------
// Trained-Pilot +2 on pilot-crewed vehicle weapons
// ---------------------------------------------------------------------------------------------------------------------
const gunnerOf = (id, { trained = true, level = 4 } = {}) => ({ id, name: 'Han', type: 'character', isOwner: true, items: [],
  system: { level, attributes: { dex: { base: 14 }, int: { base: 10 }, str: { base: 10 } }, skills: { pilot: { trained } }, derived: { skills: { pilot: { trained } } } },
  getRollData: () => ({}) });
const pilotBonus = async (gunner, vehicle, weapon) => {
  const real = globalThis.game.actors.get;
  globalThis.game.actors.get = id => (id === gunner.id ? gunner : null);
  try { const r = await resolveVehicleAttackBonus(gunner, vehicle, weapon, { target: targetOf('medium', 'vehicle') }); return r; }
  finally { globalThis.game.actors.get = real; }
};

test('trained Pilot +2: applied for the assigned, trained pilot firing a pilot-crewed certified weapon', async () => {
  const gunner = gunnerOf('p1');
  const { vehicle, weapon } = ship('fighter', { crew: { pilot: { id: 'p1', name: 'Han' } } });
  const r = await pilotBonus(gunner, vehicle, weapon);
  assert.equal(r.error, null, r.warnings.join('|'));
  const e = r.ledger.filter(x => x.id === 'pilot-trained-weapon-crew');
  assert.equal(e.length, 1, 'applied once');
  assert.deepEqual([e[0].value, e[0].applied], [2, true]);
  const untrained = await pilotBonus(gunnerOf('p1', { trained: false }), vehicle, weapon);
  assert.equal(untrained.total, r.total - 2, 'the +2 is the only difference');
});

test('trained Pilot +2: withheld when any condition is missing', async () => {
  const has = r => r.ledger.some(x => x.id === 'pilot-trained-weapon-crew');
  // untrained
  { const { vehicle, weapon } = ship('fighter', { crew: { pilot: { id: 'p1' } } }); assert.equal(has(await pilotBonus(gunnerOf('p1', { trained: false }), vehicle, weapon)), false); }
  // a gunner-crewed weapon (operator gunner) even when fired by the trained pilot
  { const { vehicle, weapon } = ship('fighter', { role: 'gunner', crew: { pilot: { id: 'p1' }, gunner: { id: 'p1' } } }); assert.equal(has(await pilotBonus(gunnerOf('p1'), vehicle, weapon)), false); }
  // the firing actor is not the assigned pilot
  { const { vehicle, weapon } = ship('fighter', { crew: { pilot: { id: 'someone-else' } } }); assert.equal(has(await pilotBonus(gunnerOf('p1'), vehicle, weapon)), false); }
  // no pilot assigned
  { const { vehicle, weapon } = ship('fighter'); assert.equal(has(await pilotBonus(gunnerOf('p1'), vehicle, weapon)), false); }
  // an Item edited to claim pilot crewing does not matter: operator comes from the sealed mount
  { const { vehicle, weapon } = ship('fighter', { role: 'gunner', crew: { pilot: { id: 'p1' } } }); weapon.system.vehicleMount.crewRole = 'pilot'; weapon.system.operatorStation = 'pilot';
    assert.equal(has(await pilotBonus(gunnerOf('p1'), vehicle, weapon)), false); }
  // not a certified installed weapon at all
  { const { vehicle } = ship('fighter', { crew: { pilot: { id: 'p1' } } }); const plain = { id: 'x', name: 'Gun', system: { vehicleMount: { crewRole: 'pilot' } }, actor: vehicle };
    assert.equal(has(await pilotBonus(gunnerOf('p1'), vehicle, plain)), false); }
  // abstract crew never gets it
  { const { vehicle, weapon } = ship('fighter'); assert.equal((await resolveAbstractCrewAttackBonus(vehicle, weapon, 'normal', {})).ledger.some(x => x.id === 'pilot-trained-weapon-crew'), false); }
});

test('generic-crew attacks of an AFTERMARKET weapon on a published ship use the published crew Base Attack, not the legacy tier table', async () => {
  const { vehicle, weapon } = ship('fighter');                       // X-wing: crew quality skilled, published Base Atk +2
  const r = await resolveAbstractCrewAttackBonus(vehicle, weapon, 'skilled', { target: targetOf('medium') });
  const bab = r.ledger.find(e => e.id === 'crew-quality-bab');
  assert.equal(bab.value, 2, 'the legacy tier table would have said 5');
  assert.match(bab.label, /published statblock/);
  assert.equal(r.ledger.find(e => e.id === 'vehicle-int').value, 3);
  assert.equal(r.total, 5, 'matches the X-wing statblock attack line');
});
