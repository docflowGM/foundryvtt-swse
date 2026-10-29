import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { classifyInstalledVehicleWeapon } from '../scripts/domain/vehicles/vehicle-attack-provenance.js';
import { authorizeVehicleAttackBeforeCosts, classifyVehicleAttackPreflight } from '../scripts/domain/vehicles/vehicle-attack-preflight.js';
import { sealLedgerEntry, planVehicleInstallation } from '../scripts/domain/vehicles/vehicle-installation-ledger.js';

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';
const base = key => structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === key));
const rec = a => a.flags.swse.universalVehicleSource.source;

const token = (x, y, rotation = 0) => ({ center: { x, y }, document: { rotation } });
function vehicleWith(a, items = [], pos = [0, 0]) {
  const v = { ...a, id: 'veh1', type: 'vehicle', items: new Map(items.map(i => [i.id, i])),
    getActiveTokens: () => [token(...pos, 0)] };
  return v;
}
const target = (x, y) => ({ id: 'tgt', getActiveTokens: () => [token(x, y)] });
const mount = { mountKey: 'm1', arc: 'forward', operatorRole: 'pilot', evidence: { book: 'B', page: 1 } };
const gun = { id: 'item1', name: 'Fixture Cannon', system: { vehicleMount: { installId: 'inst1', crewRole: 'pilot' } } };
function sealedEntry(over = {}, a = base(XW)) {
  return sealLedgerEntry({ installId: 'inst1', catalogId: 'fx', name: 'Fixture Cannon', category: 'Weapon',
    sourceEntryKey: XW, certification: { status: 'MECHANIC_SPECIFIED', book: 'B', page: 1 }, epCost: 1, priceCredits: 1,
    mount, executable: true, installedAt: 1, ...over });
}
function armed(entryOver = {}, itemOver = {}, pos) {
  const a = base(XW);
  a.flags.swse.vehicleInstallations = [sealedEntry(entryOver)];
  const item = { ...gun, ...itemOver, system: { vehicleMount: { ...gun.system.vehicleMount, ...(itemOver.system?.vehicleMount ?? {}) } } };
  return { vehicle: vehicleWith(a, [item], pos), weapon: item };
}

test('forged legacy shipyard exemption cannot make a source-backed row or Item fireable', async () => {
  const a = base(XW);
  a.system.weapons = [{ name: 'Laser', sourceModificationId: 'm' }];
  a.system.modificationData = { modifications: [{ id: 'm', name: 'Laser', category: 'weapon' }] };
  a.system.shipyard = { installedModifications: [{ id: 'm', name: 'Laser' }] };
  const v = vehicleWith(a);
  const row = { id: 'system-weapons-0', name: 'Laser' };
  assert.equal(classifyInstalledVehicleWeapon(v, row).kind, 'UNRESOLVED');
  const item = { id: 'i', name: 'Laser', system: { vehicleMount: { sourceModificationId: 'm' } } };
  v.items.set('i', item);
  assert.equal(classifyInstalledVehicleWeapon(v, item).kind, 'UNRESOLVED');
  for (const w of [row, item]) {
    const r = await authorizeVehicleAttackBeforeCosts({ vehicle: v, weapon: w, target: target(100, 0), attackId: 'a', crewStationResolved: true });
    assert.equal(r.ok, false);
  }
});

test('all 429: printed attack groups and forged rows are never fireable', async () => {
  for (const a of actors) {
    const c = structuredClone(a);
    c.system.weapons = [{ name: 'Forged', sourceModificationId: 'x' }];
    const v = vehicleWith(c);
    const r = await authorizeVehicleAttackBeforeCosts({ vehicle: v, weapon: { id: 'system-weapons-0', name: 'Forged' },
      target: target(100, 0), attackId: 'a', crewStationResolved: true });
    assert.equal(r.ok, false, rec(a).identity.sourceEntryKey);
  }
});

test('sealed but non-executable or unsealed ledger entries do not arm a weapon', async () => {
  // as produced by the P2 planner: executable:false
  let { vehicle, weapon } = armed({ executable: false });
  assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).reason, 'CERTIFIED_INSTALLATION_NOT_EXECUTABLE');
  // unsealed (hand-written) entry
  const a = base(XW);
  const { entryDigest, ...unsealed } = sealedEntry();
  a.flags.swse.vehicleInstallations = [unsealed];
  const v = vehicleWith(a, [{ ...gun }]);
  assert.equal(classifyInstalledVehicleWeapon(v, v.items.get('item1')).reason, 'SOURCE_BACKED_WEAPON_WITHOUT_CERTIFIED_INSTALLATION');
  // entry with a tampered field fails its seal
  a.flags.swse.vehicleInstallations = [{ ...sealedEntry(), epCost: 99 }];
  assert.equal(classifyInstalledVehicleWeapon(vehicleWith(a, [{ ...gun }]), gun).kind, 'UNRESOLVED');
  // Item with no installId at all
  ({ vehicle, weapon } = armed({}, { system: { vehicleMount: { installId: undefined, crewRole: 'pilot' } } }));
  assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).kind, 'UNRESOLVED');
  // planner output never sets executable
  const rules = { resolveEpBudget: () => ({ state: 'known', total: 9 }), resolveUninstallRefund: () => null };
  const plan = planVehicleInstallation({ record: rec(base(XW)), flags: base(XW).flags, installId: 'i', availableCredits: 9, rules, mount,
    catalogEntry: { id: 'w', name: 'W', category: 'Weapon', emplacementPoints: 1, cost: 1, costType: 'flat', availability: 'Common',
      certification: { status: 'MECHANIC_SPECIFIED', book: 'B', page: 1 } } });
  assert.equal(plan.ok, true);
  assert.equal(plan.entry.executable, false);
});

test('an eligible certified installation fires only with target, crew station and legal arc', async () => {
  const { vehicle, weapon } = armed();
  assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).kind, 'CERTIFIED_INSTALLATION');
  const ok = await authorizeVehicleAttackBeforeCosts({ vehicle, weapon, target: target(500, 0), attackId: 'a', crewStationResolved: true });
  assert.equal(ok.ok, true);
  assert.equal(ok.kind, 'CERTIFIED_INSTALLATION');
  const call = over => authorizeVehicleAttackBeforeCosts({ vehicle, weapon, target: target(500, 0), attackId: 'a', crewStationResolved: true, ...over });
  assert.equal((await call({ target: null })).reason, 'TARGET_UNRESOLVED');
  assert.equal((await call({ crewStationResolved: false })).reason, 'CREW_STATION_UNRESOLVED');
  assert.equal((await call({ attackId: '' })).reason, 'ATTACK_SCOPE_UNRESOLVED');
  assert.equal((await call({ target: target(-500, 0) })).reason, 'TARGET_OUTSIDE_CERTIFIED_MOUNT_ARC');
});

test('operator role, name and ownership must match the certified entry', async () => {
  let { vehicle, weapon } = armed({}, { system: { vehicleMount: { installId: 'inst1', crewRole: 'gunner' } } });
  assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).reason, 'INSTALLATION_OPERATOR_ROLE_MISMATCH');
  ({ vehicle, weapon } = armed({}, { name: 'Other Gun' }));
  assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).reason, 'INSTALLATION_WEAPON_NAME_MISMATCH');
  ({ vehicle, weapon } = armed());
  assert.equal(classifyInstalledVehicleWeapon(vehicle, { ...weapon }).reason, 'WEAPON_NOT_OWNED_BY_VEHICLE');
  // an entry sealed for another hull does not arm this one
  ({ vehicle, weapon } = armed({ sourceEntryKey: 'core-tie-fighter' }));
  assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).reason, 'SOURCE_BACKED_WEAPON_WITHOUT_CERTIFIED_INSTALLATION');
});

test('a record that fails digest verification is denied, never downgraded to the legacy exemption', () => {
  const a = base(XW);
  a.flags.swse.universalVehicleSource.source.durability.hitPoints = 1; // breaks recordDigest
  a.system.weapons = [{ name: 'L', sourceModificationId: 'm' }];
  a.system.modificationData = { modifications: [{ id: 'm', name: 'L', category: 'weapon' }] };
  a.system.shipyard = { installedModifications: [{ id: 'm', name: 'L' }] };
  const v = vehicleWith(a);
  assert.equal(classifyVehicleAttackPreflight({ vehicle: v, weapon: { id: 'system-weapons-0', name: 'L' } }).ok, false);
  const item = { id: 'i', name: 'L', system: { vehicleMount: { sourceModificationId: 'm', installId: 'x' } } };
  v.items.set('i', item);
  assert.equal(classifyVehicleAttackPreflight({ vehicle: v, weapon: item }).ok, false);
  // stripping the provenance flags but leaving the source key mirror is still a source claim
  const stripped = base(XW); delete stripped.flags.swse;
  stripped.system.weapons = a.system.weapons; stripped.system.modificationData = a.system.modificationData; stripped.system.shipyard = a.system.shipyard;
  assert.equal(classifyVehicleAttackPreflight({ vehicle: vehicleWith(stripped), weapon: { id: 'system-weapons-0', name: 'L' } }).ok, false);
});

test('custom (non-source) vehicles keep the legacy shipyard path', () => {
  const v = { type: 'vehicle', id: 'c', flags: {}, system: { weapons: [{ name: 'L', sourceModificationId: 'm' }],
    modificationData: { modifications: [{ id: 'm', name: 'L', category: 'weapon' }] },
    shipyard: { installedModifications: [{ id: 'm', name: 'L' }] } }, items: new Map() };
  assert.equal(classifyInstalledVehicleWeapon(v, { id: 'system-weapons-0', name: 'L' }).kind, 'SHIPYARD_MODIFICATION');
});

test('direct rollAttack path is gated before costs and covers the certified kind', () => {
  const code = readFileSync('scripts/combat/rolls/attacks.js', 'utf8');
  const body = code.slice(code.indexOf('export async function rollAttack('));
  const gate = body.indexOf('authorizeVehicleAttackBeforeCosts({');
  assert.ok(gate > 0);
  const firstCost = body.indexOf('FireStateStore.applyOwnedSelection(');
  assert.ok(firstCost > gate, 'vehicle gate precedes owned-selection, ammo and action costs');
  assert.match(code, /installedProvenance\.kind === 'CERTIFIED_INSTALLATION'/);
});

import { authorizeLedgerWrite, clearLedgerWrite, isLedgerUpdateAllowed } from '../scripts/domain/vehicles/vehicle-installation-ledger.js';

test('ledger flag is writable only through an authorized service write', () => {
  const ledger = [sealedEntry({ executable: false })];
  const nested = { flags: { swse: { vehicleInstallations: ledger } } };
  const flat = { 'flags.swse.vehicleInstallations': ledger };
  assert.equal(isLedgerUpdateAllowed('v', { 'system.hp.value': 3 }), true);
  assert.equal(isLedgerUpdateAllowed('v', { flags: { swse: { other: 1 } } }), true);
  for (const c of [nested, flat]) assert.equal(isLedgerUpdateAllowed('v', c), false);
  authorizeLedgerWrite('v', ledger);
  for (const c of [nested, flat]) assert.equal(isLedgerUpdateAllowed('v', c), true);
  // authorization is for those exact contents and that actor only
  assert.equal(isLedgerUpdateAllowed('v', { flags: { swse: { vehicleInstallations: [sealedEntry({ executable: true })] } } }), false);
  assert.equal(isLedgerUpdateAllowed('other', nested), false);
  // deleting the ledger flag is never authorized
  assert.equal(isLedgerUpdateAllowed('v', { flags: { swse: { '-=vehicleInstallations': null } } }), false);
  assert.equal(isLedgerUpdateAllowed('v', { 'flags.swse.-=vehicleInstallations': null }), false);
  clearLedgerWrite('v');
  assert.equal(isLedgerUpdateAllowed('v', nested), false);
});

test('install service authorizes its ledger write around the transaction and registers the hook', () => {
  const svc = readFileSync('scripts/engine/vehicles/vehicle-installation-service.js', 'utf8');
  assert.equal((svc.match(/authorizeLedgerWrite\(vehicle\.id, plan\.nextLedger\)/g) ?? []).length, 2);
  assert.equal((svc.match(/finally \{ clearLedgerWrite\(vehicle\.id\); \}/g) ?? []).length, 2);
  const hooks = readFileSync('scripts/actors/vehicle/vehicle-precreate-hooks.js', 'utf8');
  assert.match(hooks, /Hooks\.on\('preUpdateActor', guardVehicleInstallationLedger\)/);
});
