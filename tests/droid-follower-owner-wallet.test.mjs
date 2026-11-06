import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Step 1 (C3 -> direct authority): an NPC-typed droid follower is customized with the OWNER paying and the
// FOLLOWER receiving the hardware change, through explicit walletActor/assetActor - no Proxy, no monkey patch.
// Offline: wallet movement is the fake ActorEngine applying the real engines' mutations. Not Foundry-tested.
registerFoundryPathLoader();
const SYSTEM_ID = 'foundryvtt-swse';
const PART = 'plasteel-shell';
const { resolveAssetOwnerId } = await import('../scripts/domain/droids/droid-asset-owner.js');

// 1. One owner definition covers purchase links and follower links; no owner -> null; no guessing from names.
assert.equal(resolveAssetOwnerId({ system: { ownedByActorId: 'a' } }), 'a');
assert.equal(resolveAssetOwnerId({ flags: { swse: { ownedByActorId: 'b' } } }), 'b');
assert.equal(resolveAssetOwnerId({ flags: { [SYSTEM_ID]: { ownedByActorId: 'c' } } }), 'c');
assert.equal(resolveAssetOwnerId({ system: { npcProfile: { owner: { actorId: 'd' } } } }), 'd');
assert.equal(resolveAssetOwnerId({ flags: { swse: { follower: { ownerId: 'e' } } } }), 'e');
assert.equal(resolveAssetOwnerId({ system: { ownedByActorId: '  ' } }), null);
assert.equal(resolveAssetOwnerId({ name: 'Owner: Han' }), null);
assert.equal(resolveAssetOwnerId(null), null);

const { resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');
const { DroidCustomizationEngine } = await import('../scripts/engine/customization/droid-customization-engine.js');
const { computeDroidPartCost } = await import('../scripts/data/droid-part-schema.js');
const { UpgradeService } = await import('../scripts/engine/upgrades/UpgradeService.js');

const mk = (id, type, system, extra = {}) => {
  const a = { id, name: id, type, isOwner: true, uuid: `Actor.${id}`, img: '', items: [], effects: [], flags: { [SYSTEM_ID]: {}, swse: {} }, system,
    getFlag(s, k) { return this.flags?.[s]?.[k]; },
    toObject() { return JSON.parse(JSON.stringify({ system: a.system, name: a.name, img: a.img, items: a.items, effects: a.effects, flags: a.flags })); }, ...extra };
  a.items.get = () => null;
  return a;
};
const world = new Map();
const setup = ({ confirmed = true, ownerCredits = 5000 } = {}) => {
  resetFakeActorEngine(); world.clear();
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, actors: { get: (id) => world.get(id) ?? null }, users: [] } });
  const owner = mk('owner', 'character', { credits: ownerCredits });
  const follower = mk('fdroid', 'npc', { credits: 0, isDroid: true, isFollower: true, npcProfile: { owner: { actorId: 'owner' } }, droidSystems: { size: 'medium' }, installedSystems: confirmed ? { [PART]: { installedAt: 1 } } : {} });
  world.set('owner', owner); world.set('fdroid', follower);
  return { owner, follower };
};
const price = (follower) => Math.floor(computeDroidPartCost(follower, { id: PART }) * 0.5);

// 2. Engine: removal credits the OWNER, not the follower; the follower's ledger changes.
{
  const { owner, follower } = setup();
  const r = await DroidCustomizationEngine.applyDroidCustomization(follower, { remove: [PART] }, { walletActor: owner });
  assert.equal(r.success, true, r.error);
  assert.equal(owner.system.credits, 5000 + price(follower), 'owner receives the resale');
  assert.equal(follower.system.credits, 0, 'follower wallet untouched');
  assert.equal(follower.system.installedSystems[PART], undefined, 'follower hardware removed');
}

// 3. Engine: purchase debits the OWNER; insufficient owner credits refuse with nothing written (follower funds are irrelevant).
{
  const { owner, follower } = setup({ confirmed: false });
  const cost = computeDroidPartCost(follower, { id: PART });
  const ok = await DroidCustomizationEngine.applyDroidCustomization(follower, { add: [PART] }, { walletActor: owner });
  assert.equal(ok.success, true, ok.error);
  assert.equal(owner.system.credits, 5000 - cost);
  assert.equal(follower.system.credits, 0);
  assert.ok(follower.system.installedSystems[PART], 'hardware recorded on the follower');
  const s2 = setup({ confirmed: false, ownerCredits: 1 });
  s2.follower.system.credits = 999999; // a rich follower must not pay
  const refused = await DroidCustomizationEngine.applyDroidCustomization(s2.follower, { add: [PART] }, { walletActor: s2.owner });
  assert.equal(refused.success, false);
  assert.equal(s2.owner.system.credits, 1); assert.equal(s2.follower.system.credits, 999999);
  assert.equal(s2.follower.system.installedSystems[PART], undefined);
}

// 4. Upgrade Workshop passes the owner as payer for a follower droid (and the droid itself otherwise).
{
  const { owner, follower } = setup({ confirmed: false });
  const cost = computeDroidPartCost(follower, { id: PART });
  await UpgradeService.applyUpgrade({ actor: follower, itemId: `droid-actor-${follower.id}`, upgradeId: PART });
  assert.equal(owner.system.credits, 5000 - cost, 'Workshop purchase is owner-funded');
  assert.equal(follower.system.credits, 0);
  assert.ok(follower.system.installedSystems[PART]);
  const s = setup({ confirmed: false });
  s.follower.system.npcProfile = {}; s.follower.system.credits = 5000; // no owner link: the droid pays for itself (unchanged default)
  await UpgradeService.applyUpgrade({ actor: s.follower, itemId: `droid-actor-${s.follower.id}`, upgradeId: PART });
  assert.equal(s.owner.system.credits, 5000);
  assert.equal(s.follower.system.credits, 5000 - cost);
}

// 5. The retired bridge stays gone.
{
  const fs = await import('node:fs');
  assert.equal(fs.existsSync('scripts/patches/follower-droid-garage-hotfix.js'), false);
  assert.doesNotMatch(fs.readFileSync('scripts/patches/runtime-bugfix-hotfixes-init.js', 'utf8'), /DroidGarageHotfix/);
}
console.log('Droid follower owner-wallet tests passed.');
