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
// current primary owner and EXPLICIT (shared) co-owners are recognized by both the resolver and the Vehicle service
const rec = (system, flags) => ({ system, flags });
for (const a of [rec({ ownedByActorId: 'x' }), rec({ assetOwnership: { primaryOwnerActorId: 'x' } }),
  rec({ assetOwnership: { shared: true, ownerActorIds: ['y', 'x'] } })]) {
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
  const records = Object.values(s.other.flags?.[SYSTEM_ID]?.transactions ?? {});
  assert.equal(records.length, 1, 'the GM-funded customization is in the credit audit trail');
  assert.equal(records[0].audit.payerAuthorization.gmOverride, true, 'the GM override is explicit in the audit record');
  assert.equal(records[0].audit.payerAuthorization.basis, 'GM_OVERRIDE');
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
// ---- ownership inconsistency fixes (reviewer) -----------------------------------------------------------------
{
  const clash = { id: 'd', system: { ownedByActorId: 'a', npcProfile: { owner: { actorId: 'b' } } }, flags: {} };
  // self-funding cannot bypass the contradiction rule; neither can a GM or a listed owner
  assert.equal(own.authorizePayer(clash, { id: 'd' }).ok, false, 'self-funded customization is refused while ownership contradicts');
  assert.equal(own.authorizePayer(clash, { id: 'd' }, { isGM: true }).ok, false);
  assert.equal(own.authorizePayer(clash, { id: 'a' }).ok, false);
  assert.equal(own.isRecordedOwnerId(clash, 'a'), false, 'no id is "the" owner when current-ownership records disagree');
  assert.equal(own.isRecordedOwnerId(clash, 'b'), false);
  // historical acquisition provenance is NOT authority: after a transfer the original purchaser cannot spend or receive resale
  const transferred = { id: 'v', system: { ownedByActorId: 'new', storeAcquisition: { ownerActorId: 'buyer' } }, flags: { [SYSTEM_ID]: { storeAcquisition: { ownerActorId: 'buyer' } } } };
  assert.equal(own.resolveAssetOwner(transferred).status, 'RESOLVED', 'a differing purchaser is not a contradiction');
  assert.equal(own.resolveAssetOwner(transferred).ownerId, 'new');
  assert.equal(own.isRecordedOwnerId(transferred, 'new'), true);
  assert.equal(own.isRecordedOwnerId(transferred, 'buyer'), false, 'the original purchaser loses spending authority');
  assert.deepEqual(own.listAcquisitionProvenanceIds(transferred), ['buyer'], 'the purchase record is still kept as evidence');
  assert.equal(own.authorizePayer(transferred, { id: 'buyer' }).ok, false);
  assert.equal(own.authorizePayer(transferred, { id: 'buyer' }, { isGM: true }).gmOverride, true, 'GM override stays explicit');
  // access permission is not ownership; an UNSHARED owner list is residue, not authority
  const accessOnly = { id: 'v', system: { ownedByActorId: 'o', assetOwnership: { accessActorIds: ['viewer'], ownerActorIds: ['old'], shared: false } }, flags: { [SYSTEM_ID]: { assetGrant: { recipientActorIds: ['viewer'] } } } };
  assert.equal(own.isRecordedOwnerId(accessOnly, 'viewer'), false, 'access grant does not confer spending');
  assert.equal(own.isRecordedOwnerId(accessOnly, 'old'), false, 'unshared residual owner list is not authority');
  assert.equal(own.isRecordedOwnerId({ ...accessOnly, system: { ...accessOnly.system, assetOwnership: { ...accessOnly.system.assetOwnership, shared: true } } }, 'old'), true, 'an explicitly shared co-owner is authority');
  // resale credit recipients: a former owner / purchaser / viewer cannot be the payer-receiver
  for (const who of ['buyer', 'viewer', 'old']) assert.equal(own.authorizePayer(accessOnly, { id: who }).ok, false, `${who} cannot receive resale`);
  // audit record
  assert.equal(own.payerAuditRecord(accessOnly, { id: 'o' }, { isGM: false }).basis, 'RECORDED_OWNER');
  assert.equal(own.payerAuditRecord(accessOnly, { id: 'v' }, { isGM: false }).basis, 'SELF_FUNDED');
  const g = own.payerAuditRecord(accessOnly, { id: 'viewer' }, { isGM: true, userId: 'gm-1' });
  assert.equal(g.basis, 'GM_OVERRIDE'); assert.equal(g.gmOverride, true); assert.equal(g.authorizedByUserId, 'gm-1');
  assert.equal(own.payerAuditRecord(accessOnly, { id: 'viewer' }, { isGM: false }).basis, 'REFUSED');
  // agreeing primary + assignment records are fine
  assert.equal(own.resolveAssetOwner({ system: { ownedByActorId: 'a', assetOwnership: { primaryOwnerActorId: 'a' } } }).status, 'RESOLVED');
  // the Vehicle service applies the same rule: contradiction blocks even a GM from the owner-association gate
  const veh = (system) => ({ id: 'veh', name: 'V', type: 'vehicle', system, flags: {}, items: [] });
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, actors: { get: () => null }, users: [] } });
  assert.equal(VehicleInstallationService.isRecordedOwner({ id: 'a' }, veh({ ownedByActorId: 'a', assetOwnership: { primaryOwnerActorId: 'b' } })), false);
  assert.equal(VehicleInstallationService.isRecordedOwner({ id: 'new' }, veh({ ownedByActorId: 'new' })), true);
  const src = (await import('node:fs')).readFileSync('scripts/engine/vehicles/vehicle-installation-service.js', 'utf8');
  assert.match(src.slice(src.indexOf('static #ownerAssociated'), src.indexOf('static #ownerAssociated') + 500), /CONTRADICTORY'\) return false;[\s\S]*isGM === true\) return true/, 'contradiction is checked before the GM allowance');
}
// ---- AssetGrantService: a transfer replaces the primary owner, it does not keep them as a co-owner ------------------------
{
  const { AssetGrantService } = await import('../scripts/engine/assets/AssetGrantService.js');
  const actor = (id, extra = {}) => ({ id, name: id, type: extra.type ?? 'character', uuid: `Actor.${id}`, img: '', ownership: {}, flags: {}, system: extra.system ?? {}, items: [], effects: [], getFlag() { return undefined; } });
  const asset = () => { const a = actor('d1', { type: 'droid', system: { ownedByActorId: 'A', assetOwnership: { primaryOwnerActorId: 'A', ownerActorIds: ['A', 'D'], shared: true, accessActorIds: ['A'] }, storeAcquisition: { ownerActorId: 'A' } } }); return a; };
  const A = actor('A'), B = actor('B'), C = actor('C');
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, actors: { get: () => null }, users: [] } });
  // unshared transfer A -> B
  const d1 = asset();
  await AssetGrantService.grantAssetAccess({ assetActor: d1, recipientActors: [B], primaryOwnerActor: B, shared: false, updateDocumentOwnership: false });
  const o1 = d1.system.assetOwnership;
  assert.equal(d1.system.ownedByActorId, 'B'); assert.equal(o1.primaryOwnerActorId, 'B');
  assert.equal(o1.ownerActorIds.includes('A'), false, 'the previous primary owner is not retained as a co-owner');
  assert.equal(o1.ownerActorIds.includes('D'), true, 'an unrelated explicit co-owner is retained');
  assert.equal(own.authorizePayer(d1, { id: 'A' }).ok, false, 'previous owner / original purchaser can no longer fund or receive resale');
  assert.equal(own.authorizePayer(d1, { id: 'B' }).ok, true);
  assert.equal(own.authorizePayer(d1, { id: 'D' }).ok, o1.shared === true, 'co-owner authority follows the explicit shared flag');
  // shared grant to B and C keeps both as co-owners, still not A
  const d2 = asset();
  await AssetGrantService.grantAssetAccess({ assetActor: d2, recipientActors: [B, C], primaryOwnerActor: B, shared: true, updateDocumentOwnership: false });
  assert.deepEqual([...d2.system.assetOwnership.ownerActorIds].sort(), ['B', 'C', 'D']);
  assert.equal(own.authorizePayer(d2, { id: 'C' }).ok, true, 'explicit co-owner');
  assert.equal(own.authorizePayer(d2, { id: 'A' }).ok, false);
  // re-granting the previous primary explicitly (shared) restores them deliberately
  const d3 = asset();
  await AssetGrantService.grantAssetAccess({ assetActor: d3, recipientActors: [B, A], primaryOwnerActor: B, shared: true, updateDocumentOwnership: false });
  assert.equal(own.authorizePayer(d3, { id: 'A' }).ok, true, 'a deliberate shared re-grant keeps them');
}
console.log('Droid asset payer-authorization tests passed.');
