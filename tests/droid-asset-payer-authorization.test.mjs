import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Reviewer item (ownership/wallet): payers are authorized, never guessed. Offline only; not Foundry-tested.
registerFoundryPathLoader();
const SYSTEM_ID = 'foundryvtt-swse';
const PART = 'plasteel-shell';
const own = await import('../scripts/domain/droids/droid-asset-owner.js');
const { resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');
const { DroidCustomizationEngine } = await import('../scripts/engine/customization/droid-customization-engine.js');
const { UpgradeService } = await import('../scripts/engine/upgrades/UpgradeService.js');
const { computeDroidPartCost } = await import('../scripts/data/droid-part-schema.js');
const { VehicleInstallationService } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');

// ---- pure resolver -------------------------------------------------------------------------------------------
assert.equal(own.resolveAssetOwner({}).status, 'NONE');
assert.equal(own.resolveAssetOwner({ system: { ownedByActorId: 'a' } }).status, 'RESOLVED');
assert.equal(own.resolveAssetOwner({ system: { ownedByActorId: 'a', storeAcquisition: { ownerActorId: 'a' } } }).status, 'RESOLVED', 'agreeing records are not a contradiction');
const bad = own.resolveAssetOwner({ system: { ownedByActorId: 'a', npcProfile: { owner: { actorId: 'b' } } } });
assert.equal(bad.status, 'CONTRADICTORY'); assert.deepEqual(bad.ownerIds.sort(), ['a', 'b']);
assert.equal(own.resolveAssetOwner({ system: { ownedByActorId: 'gone' } }, { getActor: () => null }).status, 'MISSING_ACTOR');
assert.equal(own.resolveAssetOwnerId({ system: { ownedByActorId: 'a', npcProfile: { owner: { actorId: 'b' } } } }), null, 'contradiction never yields an id');
// every record the Vehicle service recognized is still recognized (parity), plus co-owners
const rec = (system, flags) => ({ system, flags });
for (const a of [rec({ ownedByActorId: 'x' }), rec({ storeAcquisition: { ownerActorId: 'x' } }), rec({ assetOwnership: { primaryOwnerActorId: 'x' } }),
  rec({}, { [SYSTEM_ID]: { storeAcquisition: { ownerActorId: 'x' } } }), rec({ assetOwnership: { ownerActorIds: ['y', 'x'] } })]) {
  assert.equal(own.isRecordedOwnerId(a, 'x'), true);
  assert.equal(VehicleInstallationService.isRecordedOwner({ id: 'x' }, a), true, 'VehicleInstallationService uses the shared definition');
  assert.equal(own.isRecordedOwnerId(a, 'z'), false);
}
assert.equal(VehicleInstallationService.isRecordedOwner({ id: 'z' }, rec({ ownedByActorId: 'x' })), false);

// payer authorization table
const asset = { id: 'd', system: { ownedByActorId: 'o' }, flags: {} };
assert.equal(own.authorizePayer(asset, { id: 'd' }).ok, true, 'self-funded');
assert.equal(own.authorizePayer(asset, { id: 'o' }).ok, true, 'recorded owner');
assert.equal(own.authorizePayer(asset, { id: 'stranger' }).ok, false, 'stranger refused');
const gm = own.authorizePayer(asset, { id: 'stranger' }, { isGM: true });
assert.equal(gm.ok, true); assert.equal(gm.gmOverride, true, 'GM exception is explicit');
assert.equal(own.authorizePayer(asset, null, { isGM: true }).ok, false, 'no payer actor');
const contradictory = { id: 'd', system: { ownedByActorId: 'a', npcProfile: { owner: { actorId: 'b' } } }, flags: {} };
assert.equal(own.authorizePayer(contradictory, { id: 'a' }, { isGM: true }).ok, false, 'contradictory records refused even for a GM');
assert.equal(own.authorizePayer({ id: 'u', system: {}, flags: {} }, { id: 'someones-character' }).ok, false, 'unowned asset: a user character is NOT a default payer');

// ---- engine + workshop ---------------------------------------------------------------------------------------
const mk = (id, type, system) => { const a = { id, name: id, type, isOwner: true, uuid: `Actor.${id}`, img: '', items: [], effects: [], flags: { [SYSTEM_ID]: {}, swse: {} }, system,
  getFlag(s, k) { return this.flags?.[s]?.[k]; }, toObject() { return JSON.parse(JSON.stringify({ system: a.system, name: a.name, img: a.img, items: a.items, effects: a.effects, flags: a.flags })); } }; a.items.get = () => null; return a; };
const world = new Map();
const setup = ({ isGM, droidSystem = {}, ownerCredits = 5000 }) => {
  resetFakeActorEngine(); world.clear();
  installFoundryShimGlobals({ game: { user: { isGM, id: 'u1' }, actors: { get: id => world.get(id) ?? null }, users: [] } });
  const owner = mk('owner', 'character', { credits: ownerCredits });
  const other = mk('other', 'character', { credits: 9000 });
  const droid = mk('d1', 'droid', { credits: 0, droidSystems: { size: 'medium' }, installedSystems: {}, ...droidSystem });
  for (const a of [owner, other, droid]) world.set(a.id, a);
  return { owner, other, droid };
};
const cost = (droid) => computeDroidPartCost(droid, { id: PART });

{ // non-GM: recorded owner pays; a different character cannot, nothing is written
  const s = setup({ isGM: false, droidSystem: { ownedByActorId: 'owner' } });
  const refused = await DroidCustomizationEngine.applyDroidCustomization(s.droid, { add: [PART] }, { walletActor: s.other });
  assert.equal(refused.success, false); assert.match(refused.error, /not a recorded owner/);
  assert.equal(s.other.system.credits, 9000); assert.deepEqual(s.droid.system.installedSystems, {});
  const ok = await DroidCustomizationEngine.applyDroidCustomization(s.droid, { add: [PART] }, { walletActor: s.owner });
  assert.equal(ok.success, true, ok.error); assert.equal(s.owner.system.credits, 5000 - cost(s.droid));
}
{ // non-GM, unowned droid: another character is not a default payer; the droid itself still can be
  const s = setup({ isGM: false }); s.droid.system.credits = 5000;
  assert.equal((await DroidCustomizationEngine.applyDroidCustomization(s.droid, { add: [PART] }, { walletActor: s.other })).success, false);
  assert.equal(s.other.system.credits, 9000);
  assert.equal((await DroidCustomizationEngine.applyDroidCustomization(s.droid, { add: [PART] })).success, true, 'self-funded default unchanged');
}
{ // GM override is explicit and works
  const s = setup({ isGM: true, droidSystem: { ownedByActorId: 'owner' } });
  const r = await DroidCustomizationEngine.applyDroidCustomization(s.droid, { add: [PART] }, { walletActor: s.other });
  assert.equal(r.success, true, r.error); assert.equal(s.other.system.credits, 9000 - cost(s.droid));
}
{ // contradictory records: refused for everyone, preview included; nothing written
  const s = setup({ isGM: true, droidSystem: { ownedByActorId: 'owner', npcProfile: { owner: { actorId: 'other' } } } });
  const p = DroidCustomizationEngine.previewDroidCustomization(s.droid, { add: [PART] }, { walletActor: s.owner });
  assert.equal(p.success, false); assert.match(p.error, /contradictory ownership/);
  await assert.rejects(() => UpgradeService.applyUpgrade({ actor: s.droid, itemId: 'droid-actor-d1', upgradeId: PART }), /contradictory ownership/);
  assert.equal(s.owner.system.credits, 5000);
}
{ // deleted owner: the Workshop refuses instead of silently self-funding
  const s = setup({ isGM: false, droidSystem: { ownedByActorId: 'owner' } }); world.delete('owner'); s.droid.system.credits = 5000;
  await assert.rejects(() => UpgradeService.applyUpgrade({ actor: s.droid, itemId: 'droid-actor-d1', upgradeId: PART }), /no longer exists/);
  assert.equal(s.droid.system.credits, 5000); assert.deepEqual(s.droid.system.installedSystems, {});
}
console.log('Droid asset payer-authorization tests passed.');
