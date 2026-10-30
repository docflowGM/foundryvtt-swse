import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import { sealLedgerEntry } from '../scripts/domain/vehicles/vehicle-installation-ledger.js';

installSystemsResolver(); installFoundryStubs();
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { FireStateStore } = await import('../scripts/engine/combat/fire-state-store.js');

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';
const mount = { mountKey: 'm1', arc: 'forward', operatorRole: 'pilot', evidence: { book: 'B', page: 1 } };

// rollAttack runs the vehicle gate before ammunition, action costs and dice. A gate denial
// returns null with a "blocked" warning; anything else means the gate allowed the attack and
// the cost pipeline would begin (it then fails on our stubs, which is irrelevant here).
const warnings = [];
globalThis.ui = { notifications: { warn: m => warnings.push(String(m)), error: m => warnings.push('ERR ' + m), info() {} } };
const isDenial = () => warnings.some(m => /Vehicle attack blocked|Vehicle attack was blocked|Vehicle-mounted weapon requires/.test(m));
let reachedCosts = 0;

const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });
function build({ executable = true, ledger = true, itemOver = {}, crew = null, itemsAsRow = false } = {}) {
  const a = structuredClone(actors.find(x => x.system.vehicleSourceEntryKey === XW));
  if (ledger) a.flags.swse.vehicleInstallations = [sealLedgerEntry({ installId: 'inst1', catalogId: 'fx', name: 'Fixture Cannon',
    category: 'Weapon', sourceEntryKey: XW, certification: { status: 'MECHANIC_SPECIFIED', book: 'B', page: 1 },
    epCost: 1, priceCredits: 1, mount, executable, installedAt: 1 })];
  if (crew) a.system.crewPositions = crew;
  const weapon = { id: 'item1', name: 'Fixture Cannon', type: 'weapon', system: { vehicleMount: { installId: 'inst1', crewRole: 'pilot' }, ...itemOver } };
  if (itemsAsRow) a.system.weapons = [{ name: 'Fixture Cannon', sourceModificationId: 'm', crewRole: 'pilot' }];
  const vehicle = { ...a, id: 'veh1', type: 'vehicle', items: new Map(itemsAsRow ? [] : [[weapon.id, weapon]]), getActiveTokens: () => [token(0, 0)] };
  weapon.actor = vehicle;
  return { vehicle, weapon: itemsAsRow ? { id: 'system-weapons-0', name: 'Fixture Cannon', system: {} } : weapon };
}
const target = (x, y) => ({ id: 'tgt', type: 'character', items: [], getActiveTokens: () => [token(x, y)] });
const fire = async ({ vehicle, weapon }, t = target(500, 0), options = {}) => {
  warnings.length = 0;
  let out;
  try { out = { result: await rollAttack(vehicle, weapon, { abstractCrewQuality: 'normal', target: t, ...options }) }; }
  catch (e) { out = { threw: e.message }; }
  reachedCosts = isDenial() ? 0 : 1;
  out.warnings = [...warnings];
  return out;
};

test('forged system.weapons row never reaches ammo/action costs', async () => {
  const r = await fire(build({ itemsAsRow: true, ledger: false }));
  assert.equal(reachedCosts, 0);
  assert.equal(r.result ?? null, null);
  assert.match(r.warnings.join('|'), /blocked|requires/);
});

test('weapon Item with no ledger installation is denied before costs', async () => {
  await fire(build({ ledger: false }));
  assert.equal(reachedCosts, 0);
});

test('sealed but non-executable installation (what the planner writes) is denied before costs', async () => {
  await fire(build({ executable: false }));
  assert.equal(reachedCosts, 0);
});

test('printed stock attack groups cannot be fired through any roll option', async () => {
  const x = build({ ledger: false });
  for (const options of [{ weaponGroupKey: 'core-incom-t-65b-x-wing-starfighter-printed-attack-1' }, { vehicleActor: x.vehicle }, { crewStation: 'gunner' }]) {
    await fire(x, target(500, 0), options);
    assert.equal(reachedCosts, 0);
  }
});

test('an executable certified installation passes the gate only with a legal arc and a resolvable crew station', async () => {
  const good = await fire(build());
  assert.equal(reachedCosts, 1, 'gate allowed; costs would begin: ' + JSON.stringify(good));
  // behind the forward-arc mount
  await fire(build(), target(-500, 0));
  assert.equal(reachedCosts, 0);
  // no target
  await fire(build(), null);
  assert.equal(reachedCosts, 0);
  // assigned crew actor that no longer exists
  await fire(build({ crew: { pilot: { id: 'gone', name: 'Ghost' } } }));
  assert.equal(reachedCosts, 0);
});

test('the station comes from the sealed mount, not editable Item fields', async () => {
  // Item says gunner, ledger says pilot: classification already refuses the mismatch
  await fire(build({ itemOver: { vehicleMount: { installId: 'inst1', crewRole: 'gunner' } } }));
  assert.equal(reachedCosts, 0);
  // Item claims an unrelated operatorStation; the certified pilot station is what is evaluated
  await fire(build({ itemOver: { operatorStation: 'gunner' } }));
  assert.equal(reachedCosts, 1);
});

test('a source-backed vehicle with a tampered publication record is denied (no legacy fallback)', async () => {
  const x = build();
  x.vehicle.flags.swse.universalVehicleSource.source.durability.hitPoints = 1;
  await fire(x);
  assert.equal(reachedCosts, 0);
});
