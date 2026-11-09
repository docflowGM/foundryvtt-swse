import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Asset Bay ownership: possession is established by stable actor identity only. A shared display name, visibility, a shared Foundry user or
// document permission never makes a vehicle someone's property, and weak evidence never enables modification.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
const { listOwnedAssets, assetModifyAuthorization } = await import('/systems/foundryvtt-swse/scripts/ui/shell/AssetBaySurfaceService.js');

let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const pc = (id, name) => ({ id, uuid: `Actor.${id}`, name, type: 'character', img: '', system: {}, flags: {}, getFlag: () => null, items: [], isOwner: true });
const vehicle = (id, name, system = {}, extra = {}) => ({ id, uuid: `Actor.${id}`, name, type: 'vehicle', img: '', system, flags: {}, isOwner: true, ...extra });
const droid = (id, name) => ({ id, uuid: `Actor.${id}`, name, type: 'droid', img: '', system: {}, flags: {}, isOwner: true });
const world = (actors, user = { id: 'u1', isGM: false }) => { globalThis.game = { user, actors: { contents: actors, get: (id) => actors.find((a) => a.id === id) ?? null }, users: new Map() }; return user; };
const ids = (list) => list.map((a) => a.actorId).sort();

// 1. two characters with the same name: ownership follows the id
{
  const han1 = pc('han-1', 'Han'); const han2 = pc('han-2', 'Han');
  const ship = vehicle('v-falcon', 'Falcon', { ownedByActorId: 'han-1', ownedByActorName: 'Han' });
  const user = world([han1, han2, ship]);
  assert.deepEqual(ids(listOwnedAssets(han1, { user })), ['v-falcon'], 'the recorded owner id sees it');
  assert.deepEqual(ids(listOwnedAssets(han2, { user })), [], 'a different character with the same display name does not');
  assert.equal(assetModifyAuthorization({ user, ownerActor: han1, assetActor: ship }).allowed, true);
  const other = assetModifyAuthorization({ user, ownerActor: han2, assetActor: ship });
  assert.equal(other.allowed, false); assert.equal(other.reason, 'NOT_LINKED_AS_PROPERTY');
  ok('two characters named alike: only the id-matched owner has the vehicle and may modify it');
}

// 2. name-only owner record (no stable identity) is not possession and says so
{
  const han = pc('han-1', 'Han');
  const legacy = vehicle('v-old', 'Old Skiff', { ownerActorName: 'Han' });
  const user = world([han, legacy]);
  assert.deepEqual(ids(listOwnedAssets(han, { user })), [], 'a name match does not list the vehicle as property');
  const auth = assetModifyAuthorization({ user, ownerActor: han, assetActor: legacy });
  assert.equal(auth.allowed, false); assert.equal(auth.reason, 'OWNER_IDENTITY_UNRESOLVED');
  // even when listed through another recorded link, the weak record is flagged and modification is blocked
  han.system.ownedActors = [{ id: 'v-old', type: 'vehicle' }];
  const listed = listOwnedAssets(han, { user }).find((a) => a.actorId === 'v-old');
  assert.equal(listed.ownerIdentityUnresolved, true); assert.equal(listed.canModify, false); assert.equal(listed.modifyBlockedReason, 'OWNER_IDENTITY_UNRESOLVED'); assert.equal(listed.ownedByThisActor, false);
  ok('a name-only owner record never establishes possession; if the vehicle is listed another way it is flagged unresolved and Modify is blocked');
}

// 3. visible but unlinked assets are not possessions
{
  const han = pc('han-1', 'Han'); const free = vehicle('v-free', 'Anyone\'s Ship'); const stray = droid('d-stray', 'Stray');
  const user = world([han, free, stray]);
  assert.deepEqual(ids(listOwnedAssets(han, { user })), []);
  ok('a visible, document-owned but unlinked Vehicle or Droid is not listed');
}

// 4. genuine links (id / uuid / grant record) are listed
{
  const han = pc('han-1', 'Han'); const granted = vehicle('v-grant', 'Granted', {}, { flags: { 'foundryvtt-swse': { assetGrant: { primaryOwnerActorId: 'han-1' } } } });
  const viaUuid = vehicle('v-uuid', 'ByUuid', { ownerUuid: 'Actor.han-1' }); const d = droid('d-r2', 'R2');
  han.system.ownedActors = [{ id: 'd-r2', type: 'droid' }];
  const user = world([han, granted, viaUuid, d]);
  assert.deepEqual(ids(listOwnedAssets(han, { user })), ['d-r2', 'v-grant', 'v-uuid']);
  ok('genuinely linked assets (ownedActors record, grant flag, owner uuid) are listed');
}

// 5. deleted owner / stale references
{
  const han = pc('han-1', 'Han');
  const orphan = vehicle('v-orphan', 'Orphan', { ownedByActorId: 'deleted-owner' });
  han.system.ownedActors = [{ id: 'gone-droid', type: 'droid', name: 'Gone' }];
  const user = world([han, orphan]);
  assert.ok(!ids(listOwnedAssets(han, { user })).includes('v-orphan'), 'a vehicle whose owner record points at a deleted actor is not claimed by anyone else');
  const stale = listOwnedAssets(han, { user }).find((a) => a.name === 'Gone');
  assert.equal(stale.isLinked, false); assert.equal(stale.canOpenSheet, false); assert.equal(stale.canModify, false);
  ok('a deleted owner is not transferred to anyone, and a stale actor reference is shown as an unresolved link that cannot be opened or modified');
}

// 6. viewers: non-GM with document permission but no relationship, a GM
{
  const han = pc('han-1', 'Han'); const ship = vehicle('v-x', 'Unrelated');
  const player = world([han, ship], { id: 'u2', isGM: false });
  const r = assetModifyAuthorization({ user: player, ownerActor: han, assetActor: ship });
  assert.equal(r.allowed, false); assert.equal(r.reason, 'NOT_LINKED_AS_PROPERTY');
  const viewOnly = vehicle('v-v', 'ViewOnly', { ownedByActorId: 'han-1' }, { isOwner: false });
  assert.equal(assetModifyAuthorization({ user: player, ownerActor: han, assetActor: viewOnly }).reason, 'NO_DOCUMENT_PERMISSION');
  const gm = world([han, ship], { id: 'gm', isGM: true });
  assert.equal(assetModifyAuthorization({ user: gm, ownerActor: han, assetActor: ship }).allowed, true);
  ok('document permission without a possession link cannot modify; link without document permission cannot; the GM can');
}
console.log(`asset-bay-ownership-hardening: ${n} checks ok`);
