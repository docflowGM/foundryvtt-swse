import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';

installSystemsResolver(); installFoundryStubs();
const { VehicleInstallationService } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
const { TransactionEngine } = await import('../scripts/engine/store/transaction-engine.js');
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('../scripts/engine/progression/utils/snapshot-manager.js');

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';
const fixtureRules = { resolveEpBudget: () => ({ state: 'known', total: 4 }), resolveUninstallRefund: () => null, allowEpShortfall: false, resolveNonstandard: () => ({ nonstandard: false, basis: 'FIXTURE' }) };
const catalogRow = (over = {}) => ({ id: 'fx', name: 'Fixture Plating', category: 'Defense', emplacementPoints: 2, cost: 1000,
  costType: 'flat', availability: 'Licensed', sizeRestriction: null,
  certification: { status: 'MECHANIC_SPECIFIED', book: 'B', page: 1 }, ...over });
const catalog = new Map([['fx', catalogRow()], ['fx2', catalogRow({ id: 'fx2' })]]);

function world({ ownerOwns = 'owner1', gm = false } = {}) {
  const src = structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === XW));
  src.system.ownedByActorId = ownerOwns;
  const vehicle = { ...src, id: 'veh1', name: 'Red Five', isOwner: true, toObject() { return structuredClone(src); } };
  const owner = { id: 'owner1', name: 'Wedge', isOwner: true, system: { credits: 5000 }, flags: {}, toObject() { return { system: this.system }; },
    getFlag: () => [] };
  globalThis.game = { user: { id: 'u1', isGM: gm, name: 'U' }, actors: { get: id => ({ owner1: owner, veh1: vehicle })[id], contents: [] }, users: new Map() };
  return { vehicle, owner };
}

function patchEngines({ failAsset = false } = {}) {
  const log = { applied: [], snapshots: [], restores: [] };
  const orig = { apply: ActorEngine.applyMutationPlan, snap: SnapshotManager.createSnapshot, restore: SnapshotManager.restoreSnapshot };
  ActorEngine.applyMutationPlan = async (actor, plan) => {
    if (actor.id === 'veh1' && failAsset) throw new Error('asset write failed');
    log.applied.push({ actor: actor.id, keys: Object.keys(plan.set ?? {}) });
    if (plan.set?.['system.credits'] !== undefined) actor.system.credits = plan.set['system.credits'];
  };
  SnapshotManager.createSnapshot = async (actor) => { const s = { timestamp: log.snapshots.length + 1, credits: actor.system?.credits }; log.snapshots.push({ id: actor.id, ...s }); return s; };
  SnapshotManager.restoreSnapshot = async (actor, ts) => {
    log.restores.push(actor.id);
    const snap = log.snapshots.find(s => s.id === actor.id && s.timestamp === ts);
    if (actor.id === 'owner1' && snap) actor.system.credits = snap.credits;
    return true;
  };
  return { log, restore: () => { ActorEngine.applyMutationPlan = orig.apply; SnapshotManager.createSnapshot = orig.snap; SnapshotManager.restoreSnapshot = orig.restore; } };
}

test('install: credits and ledger settle in one transaction, charged exactly once, base untouched', async () => {
  const { vehicle, owner } = world();
  const p = patchEngines(); VehicleInstallationService.rules = fixtureRules;
  try {
    const r = await VehicleInstallationService.install({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
    assert.equal(r.success, true, JSON.stringify(r));
    assert.equal(owner.system.credits, 4000);
    const assetWrites = p.log.applied.filter(a => a.actor === 'veh1');
    assert.equal(assetWrites.length, 1);
    assert.ok(assetWrites[0].keys.includes('flags.swse.vehicleInstallations'));
    assert.ok(!assetWrites[0].keys.some(k => k.includes('universalVehicleSource') || k.startsWith('system.')));
    assert.equal(p.log.applied.filter(a => a.actor === 'owner1').length, 1);
  } finally { p.restore(); VehicleInstallationService.rules = L.DEFAULT_VEHICLE_INSTALLATION_RULES; }
});

test('rollback: a failed asset write restores both actors and reports failure; no credit change survives', async () => {
  const { vehicle, owner } = world();
  const p = patchEngines({ failAsset: true }); VehicleInstallationService.rules = fixtureRules;
  try {
    const r = await VehicleInstallationService.install({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
    assert.equal(r.success, false);
    assert.deepEqual(r.reasons, ['TRANSACTION_FAILED']);
    assert.equal(owner.system.credits, 5000, 'wallet restored to its pre-transaction value');
    assert.ok(p.log.restores.includes('owner1'));
    assert.ok(p.log.restores.includes('veh1'));
    // the ledger-write authorization does not outlive the failed transaction
    assert.equal(L.isLedgerUpdateAllowed('veh1', { flags: { swse: { vehicleInstallations: [] } } }), false);
  } finally { p.restore(); VehicleInstallationService.rules = L.DEFAULT_VEHICLE_INSTALLATION_RULES; }
});

test('denied plans write nothing and charge nothing', async () => {
  const { vehicle, owner } = world();
  const p = patchEngines();
  try {
    // default rules: EP budget unruled
    const r = await VehicleInstallationService.install({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
    assert.equal(r.success, false);
    assert.ok(r.reasons.includes('EP_BUDGET_UNKNOWN'));
    assert.equal(p.log.applied.length, 0);
    assert.equal(owner.system.credits, 5000);
  } finally { p.restore(); }
});

test('owner/vehicle association: an actor that does not own the vehicle cannot modify it', async () => {
  const { vehicle, owner } = world({ ownerOwns: 'someone-else' });
  const p = patchEngines(); VehicleInstallationService.rules = fixtureRules;
  try {
    const r = await VehicleInstallationService.install({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
    assert.deepEqual(r.reasons, ['OWNER_VEHICLE_NOT_ASSOCIATED']);
    assert.equal(p.log.applied.length, 0);
    // a GM may act for the table
    world({ ownerOwns: 'someone-else', gm: true });
    const gm = await VehicleInstallationService.install({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
    assert.equal(gm.success, true);
  } finally { p.restore(); VehicleInstallationService.rules = L.DEFAULT_VEHICLE_INSTALLATION_RULES; }
});

test('concurrent requests on one vehicle: the second is refused while the first is in flight', async () => {
  const { vehicle, owner } = world();
  const p = patchEngines(); VehicleInstallationService.rules = fixtureRules;
  try {
    const [a, b] = await Promise.all([
      VehicleInstallationService.install({ ownerActor: owner, vehicle, catalogId: 'fx', catalog }),
      VehicleInstallationService.install({ ownerActor: owner, vehicle, catalogId: 'fx2', catalog })
    ]);
    const results = [a, b];
    assert.equal(results.filter(r => r.success).length, 1);
    assert.deepEqual(results.find(r => !r.success).reasons, ['INSTALLATION_IN_PROGRESS']);
    assert.equal(owner.system.credits, 4000, 'charged once');
    // the lock is released afterwards
    const c = await VehicleInstallationService.install({ ownerActor: owner, vehicle, catalogId: 'fx2', catalog });
    assert.notDeepEqual(c.reasons, ['INSTALLATION_IN_PROGRESS']);
  } finally { p.restore(); VehicleInstallationService.rules = L.DEFAULT_VEHICLE_INSTALLATION_RULES; }
});

// ---------- pure planner integrity ----------
const record = () => actors.find(a => a.system.vehicleSourceEntryKey === XW).flags.swse.universalVehicleSource.source;
const flagsWith = ledger => { const f = structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === XW).flags); f.swse.vehicleInstallations = ledger; return f; };
const plan = (over = {}) => L.planVehicleInstallation({ record: record(), flags: flagsWith([]), catalogEntry: catalogRow(), installId: 'i1', availableCredits: 5000, rules: fixtureRules, ...over });

test('duplicate installation ids are refused, including ids held by unverified entries', () => {
  const first = plan();
  assert.equal(first.ok, true);
  assert.deepEqual(plan({ flags: flagsWith(first.nextLedger) }).reasons, ['DUPLICATE_INSTALL_ID']);
  assert.deepEqual(plan({ installId: '' }).reasons, ['INSTALL_ID_MISSING']);
  const withJunk = plan({ flags: flagsWith([{ installId: 'i1', forged: true }]) });
  assert.ok(withJunk.reasons.includes('DUPLICATE_INSTALL_ID'));
  assert.ok(withJunk.reasons.includes('LEDGER_CONTAINS_UNVERIFIED_ENTRIES'));
  // a different id on a clean ledger is fine; EP accounting still applies
  const second = plan({ flags: flagsWith(first.nextLedger), installId: 'i2' });
  assert.equal(second.ok, true);
  assert.deepEqual(plan({ flags: flagsWith(second.nextLedger), installId: 'i3' }).reasons, ['EP_EXCEEDED']);
});

test('installing never rewrites the published hull: the plan only extends the ledger', () => {
  const flags = flagsWith([]);
  const before = JSON.stringify(flags.swse.universalVehicleSource);
  const r = L.planVehicleInstallation({ record: record(), flags, catalogEntry: catalogRow(), installId: 'i1', availableCredits: 5000, rules: fixtureRules });
  assert.equal(JSON.stringify(flags.swse.universalVehicleSource), before);
  assert.equal(r.nextLedger.length, 1);
  assert.deepEqual(Object.keys(r), ['ok', 'reasons', 'entry', 'cost', 'nextLedger']);
});
