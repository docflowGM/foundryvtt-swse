import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Asset Bay ownership follows the CANONICAL recorded-owner authority (droid-asset-owner.js, the contract payer authorization also uses): current
// primary owner, or an explicit co-owner while sharing is active. Access grants, historical purchasers, inactive co-owner lists, document
// permission, a shared Foundry user and a shared display name are NOT possession. Access-only assets stay visible in the Asset Bay, labelled.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
const { listOwnedAssets, assetModifyAuthorization, assetOwnershipEvidence, AssetBaySurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/AssetBaySurfaceService.js');
const { authorizePayer } = await import('/systems/foundryvtt-swse/scripts/domain/droids/droid-asset-owner.js');

let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const pc = (id, name = id) => ({ id, uuid: `Actor.${id}`, name, type: 'character', img: '', system: {}, flags: {}, getFlag: () => null, items: [], isOwner: true });
const ship = (id, system = {}, extra = {}) => ({ id, uuid: `Actor.${id}`, name: id, type: 'vehicle', img: '', system, flags: {}, isOwner: true, ...extra });
const world = (actors, user = { id: 'u1', isGM: false }) => { globalThis.game = { user, actors: { contents: actors, get: (id) => actors.find((a) => a.id === id) ?? null }, users: new Map() }; return user; };
const ids = (list) => list.map((a) => a.actorId).sort();
const bay = async (owner, user) => (await AssetBaySurfaceService.buildViewModel(owner, { bayMode: 'shipyard', epTable: null })).assets;

// 1. current primary owner (every canonical primary field) is the owner and may modify
{
  const a = pc('A'); const user = world([a]);
  for (const system of [{ ownedByActorId: 'A' }, { assetOwnership: { primaryOwnerActorId: 'A' } }]) {
    const v = ship('v', system); world([a, v]);
    assert.equal(assetOwnershipEvidence(v, a).status, 'OWNER'); assert.deepEqual(ids(listOwnedAssets(a, { user })), ['v']);
    assert.equal(assetModifyAuthorization({ user, ownerActor: a, assetActor: v }).allowed, true);
  }
  ok('1: the current primary owner (ownedByActorId / assetOwnership.primaryOwnerActorId) owns the vehicle and may modify');
}
// 2. explicit co-owner only while sharing is active
{
  const a = pc('A'); const b = pc('B');
  const shared = ship('s', { ownedByActorId: 'A', assetOwnership: { shared: true, ownerActorIds: ['B'] } }); const user = world([a, b, shared]);
  assert.equal(assetOwnershipEvidence(shared, b).status, 'CO_OWNER'); assert.deepEqual(ids(listOwnedAssets(b, { user })), ['s']);
  assert.equal(assetModifyAuthorization({ user, ownerActor: b, assetActor: shared }).allowed, true);
  ok('2: an active explicit shared co-owner owns it');
}
// 3. inactive / historical co-owner list is residue, not ownership
{
  const a = pc('A'); const b = pc('B');
  const old = ship('o', { ownedByActorId: 'A', assetOwnership: { shared: false, ownerActorIds: ['B'] } }); const user = world([a, b, old]);
  assert.equal(assetOwnershipEvidence(old, b).matches, false); assert.deepEqual(ids(listOwnedAssets(b, { user })), []);
  assert.equal(assetModifyAuthorization({ user, ownerActor: b, assetActor: old }).allowed, false);
  ok('3: an unshared (inactive) co-owner list grants nothing');
}
// 4. access-only recipient: visible and labelled in the Asset Bay, never a possession, never Modify
{
  const a = pc('A'); const b = pc('B');
  const v = ship('x', { ownedByActorId: 'A', assetOwnership: { accessActorIds: ['B'] } }, { flags: { 'foundryvtt-swse': { assetGrant: { recipientActorIds: ['C'] } } } }); const user = world([a, b, v]);
  assert.equal(assetOwnershipEvidence(v, b).status, 'ACCESS_ONLY');
  assert.deepEqual(ids(listOwnedAssets(b, { user })), [], 'not a possession');
  const row = (await bay(b, user)).find((x) => x.actorId === 'x');
  assert.ok(row, 'the Asset Bay still shows it'); assert.equal(row.accessOnly, true); assert.equal(row.ownedByThisActor, false); assert.equal(row.canModify, false); assert.equal(row.modifyBlockedReason, 'ACCESS_ONLY'); assert.match(row.ownershipLabel, /Access only/);
  const viaGrantFlag = ship('g', { ownedByActorId: 'A' }, { flags: { 'foundryvtt-swse': { assetGrant: { recipientActorIds: ['B'] } } } }); world([a, b, viaGrantFlag]);
  assert.equal(assetOwnershipEvidence(viaGrantFlag, b).status, 'ACCESS_ONLY');
  ok('4: access-only (access list or grant recipient): shown and labelled in the Asset Bay, not a possession, Modify blocked even with document permission');
}
// 5. original purchaser after transfer keeps nothing
{
  const a = pc('A'); const b = pc('B');
  const moved = ship('m', { ownedByActorId: 'B', storeAcquisition: { ownerActorId: 'A' } }); const user = world([a, b, moved]);
  assert.equal(assetOwnershipEvidence(moved, a).status, 'FORMER_OWNER'); assert.deepEqual(ids(listOwnedAssets(a, { user })), []);
  assert.equal(assetModifyAuthorization({ user, ownerActor: a, assetActor: moved }).reason, 'FORMER_OWNER');
  assert.equal(assetOwnershipEvidence(moved, b).status, 'OWNER');
  ok('5: the original purchaser after a transfer is a former owner: no possession, no Modify');
}
// 6. contradictory primary owners: nobody owns it, a GM included
{
  const a = pc('A'); const b = pc('B');
  const bad = ship('c', { ownedByActorId: 'A', assetOwnership: { primaryOwnerActorId: 'B' } }); const user = world([a, b, bad]);
  for (const who of [a, b]) { assert.equal(assetOwnershipEvidence(bad, who).status, 'CONTRADICTORY'); assert.deepEqual(ids(listOwnedAssets(who, { user })), []); }
  assert.equal(assetModifyAuthorization({ user, ownerActor: a, assetActor: bad }).reason, 'OWNERSHIP_CONTRADICTORY');
  const gm = { id: 'gm', isGM: true }; world([a, b, bad], gm);
  assert.equal(assetModifyAuthorization({ user: gm, ownerActor: a, assetActor: bad }).reason, 'OWNERSHIP_CONTRADICTORY', 'a GM repairs the data first, as with payer authorization');
  assert.equal(authorizePayer(bad, a, { isGM: true }).ok, false, 'the same fact the transaction authority enforces');
  ok('6: contradictory primary owner records fail closed for everyone, GM included (matches payer authorization)');
}
// 7. two characters, same name; 8. same Foundry user controlling several characters
{
  const h1 = pc('h1', 'Han'); const h2 = pc('h2', 'Han'); const v = ship('f', { ownedByActorId: 'h1', ownedByActorName: 'Han' });
  const user = world([h1, h2, v]);
  assert.deepEqual(ids(listOwnedAssets(h1, { user })), ['f']); assert.deepEqual(ids(listOwnedAssets(h2, { user })), []);
  assert.equal(assetModifyAuthorization({ user, ownerActor: h2, assetActor: v }).allowed, false);
  const legacy = ship('l', { ownerActorName: 'Han' }); world([h1, h2, legacy]);
  assert.equal(assetOwnershipEvidence(legacy, h1).status, 'NAME_ONLY'); assert.deepEqual(ids(listOwnedAssets(h1, { user })), []);
  assert.equal(assetModifyAuthorization({ user, ownerActor: h1, assetActor: legacy }).reason, 'OWNER_IDENTITY_UNRESOLVED');
  ok('7-8: a shared display name or a shared Foundry user (both characters document-owned by the same user) is not possession');
}
// 9. stale / deleted owner
{
  const a = pc('A'); const orphan = ship('z', { ownedByActorId: 'deleted-owner' }); const user = world([a, orphan]);
  assert.deepEqual(ids(listOwnedAssets(a, { user })), []);
  a.system.ownedActors = [{ id: 'gone', type: 'droid', name: 'Gone' }]; world([a, orphan]);
  const stale = listOwnedAssets(a, { user }).find((x) => x.name === 'Gone');
  assert.equal(stale.isLinked, false); assert.equal(stale.canOpenSheet, false); assert.equal(stale.canModify, false);
  ok('9: a deleted owner transfers nothing to anyone; a stale actor reference is an unresolved link that cannot be opened or modified');
}
// 10. GM override versus ordinary ownership; droids follow the same contract
{
  const a = pc('A'); const unlinked = ship('u'); const player = world([a, unlinked]);
  assert.equal(assetModifyAuthorization({ user: player, ownerActor: a, assetActor: unlinked }).reason, 'NOT_LINKED_AS_PROPERTY');
  const gm = { id: 'gm', isGM: true }; world([a, unlinked], gm);
  assert.equal(assetModifyAuthorization({ user: gm, ownerActor: a, assetActor: unlinked }).allowed, true, 'a GM may override ordinary non-ownership');
  const droid = { id: 'd', type: 'droid', name: 'R2', system: { ownedByActorId: 'other' }, flags: {}, isOwner: true };
  assert.equal(assetModifyAuthorization({ user: player, ownerActor: a, assetActor: droid }).allowed, false, 'a droid the user can edit but does not own is not modifiable');
  droid.system.ownedByActorId = 'A'; assert.equal(assetModifyAuthorization({ user: player, ownerActor: a, assetActor: droid }).allowed, true);
  const view = ship('vo', {}, { isOwner: false }); view.system.ownedByActorId = 'A';
  assert.equal(assetModifyAuthorization({ user: player, ownerActor: a, assetActor: view }).reason, 'NO_DOCUMENT_PERMISSION');
  ok('10: GM override differs from ordinary ownership; droids use the same canonical contract; document permission is still required');
}
// the possessions status says when ownership is not established
{
  const a = pc('A'); const linked = ship('rl', {}); a.system.ownedActors = [{ id: 'rl', type: 'vehicle' }]; const user = world([a, linked]);
  const { buildEquipmentWorkspace } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/equipment-workspace-context.js');
  const ws = buildEquipmentWorkspace({ id: 'x', items: [] }, { groups: [], readiness: { state: null }, assets: listOwnedAssets(a, { user }) });
  assert.equal(ws.entries.find((e) => e.id === 'rl').statusLabel, 'Linked · ownership not established');
  ok('a relationship-linked asset without recorded ownership is labelled "ownership not established" in the possessions browser');
}
console.log(`asset-bay-ownership-hardening: ${n} checks ok`);
