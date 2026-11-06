import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// SSOT audit N-01 (P0): the Upgrade Workshop must never write raw, unpaid
// `system.installedSystems` on a Vehicle. Vehicle systems are installed only by
// VehicleInstallationService (sealed flags.swse.vehicleInstallations).
// Offline only; not Foundry-tested.
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, actors: { get: () => null }, users: [] } });
const { resetFakeActorEngine, fakeActorEngineCallLog } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');
const { UpgradeService, VEHICLE_WORKSHOP_REFUSAL } = await import('../scripts/engine/upgrades/UpgradeService.js');

const vehicle = (system = {}) => ({
  id: 'veh-1', name: 'Hull', type: 'vehicle', items: [], flags: {},
  system: { credits: 5000, installedSystems: {}, ...system },
  update() { throw new Error('direct actor.update must not be called'); }
});

// 1. Apply: refused, zero mutation, nothing written, no wallet change.
for (const label of ['published-shaped', 'plain']) {
  resetFakeActorEngine();
  const v = label === 'plain' ? vehicle() : vehicle({ source: { published: true } });
  const before = JSON.stringify(v.system);
  await assert.rejects(() => UpgradeService.applyUpgrade({ actor: v, itemId: `vehicle-actor-${v.id}`, upgradeId: 'shield-generator' }),
    err => err.message === VEHICLE_WORKSHOP_REFUSAL);
  assert.equal(fakeActorEngineCallLog.length, 0, `${label}: no ActorEngine call`);
  assert.equal(JSON.stringify(v.system), before, `${label}: system untouched (no installed entry, no credit change)`);
}

// 2. Remove: refused, an existing entry is not deleted for free.
{
  resetFakeActorEngine();
  const v = vehicle({ installedSystems: { 'shield-generator': true } });
  await assert.rejects(() => UpgradeService.removeUpgrade({ actor: v, itemId: `vehicle-actor-${v.id}`, upgradeIndex: 0 }),
    err => err.message === VEHICLE_WORKSHOP_REFUSAL);
  assert.equal(fakeActorEngineCallLog.length, 0);
  assert.deepEqual(Object.keys(v.system.installedSystems), ['shield-generator']);
}

// 3. The workshop no longer offers the vehicle as an upgradeable record.
{
  const v = vehicle();
  const records = UpgradeService.collectOwnedUpgradeRecords(v);
  assert.equal(records.some(r => r.sourceType === 'vehicle-actor'), false);
  assert.equal(UpgradeService.getUpgradeAppSummary(v).totalApplicableItems, 0);
}

// 4. Droid delegation is unchanged (structural: still routes to the Garage engine).
{
  const fs = await import('node:fs');
  const src = fs.readFileSync('scripts/engine/upgrades/UpgradeService.js', 'utf8');
  assert.match(src, /itemId\?\.startsWith\('droid-actor-'\)\) \{\s*const result = await DroidCustomizationEngine\.applyDroidCustomization/);
  assert.doesNotMatch(src, /installedSystems\[upgradeId\]\s*=\s*true/, 'the raw vehicle write must not return');
  assert.doesNotMatch(src, /system\.installedSystems'\s*:\s*installedSystems[\s\S]{0,40}vehicle/);
}
console.log('Vehicle upgrade-writer closure tests passed.');
