import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');

// ---------------------------------------------------------------------------
// Test Contract E/F — Asset Bay routing symmetry. Droid and vehicle "modify"
// actions must both resolve through the same inline this.setSurface('customization',
// {...}) call on the CURRENT (owner) shell — neither may special-case through
// VehicleCustomizationRouter/_openShipyardForAsset, which opens/reuses the
// VEHICLE's own separate shell instead of staying in the owner's Holopad
// (docs/audits/garage-shipyard-phase-0-audit.md Audit 2/13). Static source
// check — ApplicationV2/DOM construction is infeasible in this Node harness
// (see BaseSWSEAppV2 -> SWSEApplicationV2's module-top-level
// `foundry.applications.api` access), same constraint documented by every
// other test file in this suite.
// ---------------------------------------------------------------------------
{
  const shellHost = read('scripts/ui/shell/ShellHost.js');
  const modifyStart = shellHost.indexOf("if (action === 'modify')");
  const modifyEnd = shellHost.indexOf("if (action === 'grant-access')", modifyStart);
  assert.ok(modifyStart !== -1, 'Asset Bay "modify" action handler must exist in ShellHost.js');
  assert.ok(modifyEnd !== -1 && modifyEnd > modifyStart, 'Asset Bay "grant-access" action handler must follow "modify"');
  const modifyBlock = shellHost.slice(modifyStart, modifyEnd);
  assert.doesNotMatch(
    modifyBlock,
    /this\._openShipyardForAsset\(/,
    'Asset Bay "modify" must not special-case vehicles through a call to _openShipyardForAsset/VehicleCustomizationRouter — that opens a second, separate shell instead of staying in the owner\'s Holopad'
  );
  assert.match(
    modifyBlock,
    /this\.setSurface\('customization',/,
    'both Garage and Shipyard must route through the same inline setSurface(\'customization\', ...) call'
  );
  // ownerActorId must still be threaded through for both lanes (Part 2).
  assert.match(modifyBlock, /ownerActorId:/, 'ownerActorId must be threaded through the Asset Bay route');

  // VehicleCustomizationRouter itself must be preserved (Part 8) — it is
  // still the correct entry point for direct vehicle-sheet Shipyard access.
  assert.match(shellHost, /_openShipyardForAsset/, 'the direct vehicle-sheet Shipyard route (_openShipyardForAsset) must be preserved, not deleted');
  const routerFile = read('scripts/applications/vehicle/vehicle-customization-router.js');
  assert.match(routerFile, /class VehicleCustomizationRouter/, 'VehicleCustomizationRouter must be preserved for its other callers');
}

// Phase 1 — Garage/Shipyard Corrective Engineering: Foundation (owner/wallet/
// asset authority). Proves that DroidCustomizationEngine.{preview,apply}
// DroidCustomization() and VehicleCustomizationEngine.{preview,apply}
// VehicleCustomization() correctly separate "who pays" (walletActor) from
// "who is modified" (assetActor) instead of hardcoding them to the same
// actor, per docs/audits/garage-shipyard-phase-0-audit.md Audit 14 and the
// Phase 1 command's PART 6 (Cases A-D) and Test Contracts G/H/I/J.
//
// Coverage tier: direct production-path. TransactionEngine and LedgerService
// run for real; only ActorEngine is faked (see
// tests/helpers/foundry-shim/fakes/actor-engine.fake.mjs) — same harness as
// tests/droid-customization-exploit.test.mjs.

registerFoundryPathLoader();

const SYSTEM_ID = 'foundryvtt-swse';

function makeActorsCollection(actors = []) {
  const map = new Map(actors.map(a => [a.id, a]));
  return {
    get: (id) => map.get(id),
    set: (id, actor) => map.set(id, actor),
    [Symbol.iterator]: () => map.values()
  };
}

function makeFakeActor(overrides = {}) {
  const flags = { [SYSTEM_ID]: {}, swse: {}, ...(overrides.flags || {}) };
  const actor = {
    isOwner: true,
    img: 'icons/x.png', items: [], effects: [],
    ...overrides,
    flags,
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    toObject() {
      return JSON.parse(JSON.stringify({
        system: actor.system, name: actor.name, img: actor.img,
        prototypeToken: actor.prototypeToken, items: actor.items,
        effects: actor.effects, flags: actor.flags
      }));
    }
  };
  return actor;
}

function makeFakeDroid(id, credits, overrides = {}) {
  return makeFakeActor({
    id, name: `Droid ${id}`, type: 'droid', uuid: `Actor.${id}`,
    system: { credits, droidSystems: { size: 'medium' }, installedSystems: {}, ...(overrides.system || {}) },
    ...overrides
  });
}

function makeFakeVehicle(id, credits, overrides = {}) {
  return makeFakeActor({
    id, name: `Vehicle ${id}`, type: 'vehicle', uuid: `Actor.${id}`,
    system: {
      credits, type: 'transport', installedSystems: {},
      speed: { base: 0 }, defense: { armor: 0 },
      ...(overrides.system || {})
    },
    ...overrides
  });
}

function makeFakeOwner(id, credits) {
  return makeFakeActor({ id, name: `Owner ${id}`, type: 'character', uuid: `Actor.${id}`, system: { credits } });
}

function asGM(actors = []) {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, actors: makeActorsCollection(actors), users: [] } });
}

const { fakeActorEngineCallLog, resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');
const { DroidCustomizationEngine } = await import('../scripts/engine/customization/droid-customization-engine.js');
const { VehicleCustomizationEngine } = await import('../scripts/engine/customization/vehicle-customization-engine.js');
const { TransactionEngine } = await import('../scripts/engine/store/transaction-engine.js');
const { normalizeDroidPartId, computeDroidPartCost } = await import('../scripts/data/droid-part-schema.js');

const TRANSLATOR_A = 'advanced-translator';
const VEHICLE_SYSTEM = 'engine_basic'; // 5000cr, compatible with 'transport'

// ---------------------------------------------------------------------------
// Case A — owner has enough credits, asset has zero. Customization succeeds
// and debits the OWNER, not the droid/vehicle.
// ---------------------------------------------------------------------------
{
  resetFakeActorEngine();
  const owner = makeFakeOwner('owner-a1', 5000);
  const droid = makeFakeDroid('droid-a1', 0);
  asGM([owner, droid]);

  const cost = computeDroidPartCost(droid, { id: TRANSLATOR_A });
  const preview = DroidCustomizationEngine.previewDroidCustomization(droid, { add: [TRANSLATOR_A] }, { walletActor: owner });
  assert.equal(preview.success, true, preview.error);
  assert.equal(preview.preview.currentCredits, 5000, 'preview must read the WALLET actor\'s credits, not the droid\'s');
  assert.equal(preview.preview.walletActorId, owner.id);

  const result = await DroidCustomizationEngine.applyDroidCustomization(droid, { add: [TRANSLATOR_A] }, { walletActor: owner });
  assert.equal(result.success, true, result.error);
  assert.equal(owner.system.credits, 5000 - cost, 'owner must be debited the purchase cost (Case A: droid)');
  assert.equal(droid.system.credits, 0, 'the droid\'s own (zero) credits must be untouched — it is the asset, not the wallet');
  assert.ok(droid.system.installedSystems[normalizeDroidPartId(TRANSLATOR_A)], 'the system must still be installed on the droid');
}

{
  resetFakeActorEngine();
  const owner = makeFakeOwner('owner-a2', 6000);
  const vehicle = makeFakeVehicle('vehicle-a2', 0);
  asGM([owner, vehicle]);

  const preview = VehicleCustomizationEngine.previewVehicleCustomization(vehicle, { add: [VEHICLE_SYSTEM] }, { walletActor: owner });
  assert.equal(preview.success, true, preview.error);
  assert.equal(preview.preview.currentCredits, 6000, 'preview must read the WALLET actor\'s credits, not the vehicle\'s');

  const result = await VehicleCustomizationEngine.applyVehicleCustomization(vehicle, { add: [VEHICLE_SYSTEM] }, { walletActor: owner });
  assert.equal(result.success, true, result.error);
  assert.equal(owner.system.credits, 6000 - 5000, 'owner must be debited the purchase cost (Case A: vehicle)');
  assert.equal(vehicle.system.credits, 0, 'the vehicle\'s own (zero) credits must be untouched — it is the asset, not the wallet');
  assert.ok(vehicle.system.installedSystems[VEHICLE_SYSTEM], 'the system must still be installed on the vehicle');
}

// ---------------------------------------------------------------------------
// Case B — owner lacks credits, asset has plenty. Customization must FAIL —
// the target asset's own balance must never subsidize an owner-routed buy.
// ---------------------------------------------------------------------------
{
  resetFakeActorEngine();
  const owner = makeFakeOwner('owner-b1', 0);
  const droid = makeFakeDroid('droid-b1', 50000);
  asGM([owner, droid]);

  const preview = DroidCustomizationEngine.previewDroidCustomization(droid, { add: [TRANSLATOR_A] }, { walletActor: owner });
  assert.equal(preview.success, false, 'preview must fail: the paying wallet cannot afford it, regardless of the droid\'s own balance');
  assert.equal(preview.blockingReason, 'Insufficient funds');

  const result = await DroidCustomizationEngine.applyDroidCustomization(droid, { add: [TRANSLATOR_A] }, { walletActor: owner });
  assert.equal(result.success, false);
  assert.equal(owner.system.credits, 0, 'owner credits must be untouched on rejection');
  assert.equal(droid.system.credits, 50000, 'the droid\'s large balance must never be spent — it is not the wallet');
  assert.equal(fakeActorEngineCallLog.length, 0, 'no mutation may occur once the wallet-affordability check rejects the request');
}

{
  resetFakeActorEngine();
  const owner = makeFakeOwner('owner-b2', 0);
  const vehicle = makeFakeVehicle('vehicle-b2', 50000);
  asGM([owner, vehicle]);

  const result = await VehicleCustomizationEngine.applyVehicleCustomization(vehicle, { add: [VEHICLE_SYSTEM] }, { walletActor: owner });
  assert.equal(result.success, false, 'apply must fail: the owner cannot afford it even though the vehicle itself could');
  assert.equal(owner.system.credits, 0);
  assert.equal(vehicle.system.credits, 50000, 'the vehicle\'s large balance must never be spent — it is not the wallet');
  assert.equal(fakeActorEngineCallLog.length, 0, 'no mutation may occur once the wallet-affordability check rejects the request');
}

// ---------------------------------------------------------------------------
// Case C — direct asset-sheet route with no walletActor supplied. Backward-
// compatible fallback: the asset actor pays for itself, exactly as before
// Phase 1 (proves the "direct fallback" contract without breaking the
// pre-existing self-funded behavior droid-customization-exploit.test.mjs
// already locks in for droids).
// ---------------------------------------------------------------------------
{
  resetFakeActorEngine();
  const droid = makeFakeDroid('droid-c1', 10000);
  asGM([droid]);
  const cost = computeDroidPartCost(droid, { id: TRANSLATOR_A });
  const result = await DroidCustomizationEngine.applyDroidCustomization(droid, { add: [TRANSLATOR_A] });
  assert.equal(result.success, true, result.error);
  assert.equal(droid.system.credits, 10000 - cost, 'with no walletActor option, the droid must still fund itself (unchanged default)');
}

{
  resetFakeActorEngine();
  const vehicle = makeFakeVehicle('vehicle-c1', 10000);
  asGM([vehicle]);
  const result = await VehicleCustomizationEngine.applyVehicleCustomization(vehicle, { add: [VEHICLE_SYSTEM] });
  assert.equal(result.success, true, result.error);
  assert.equal(vehicle.system.credits, 10000 - 5000, 'with no walletActor option, the vehicle must still fund itself (unchanged default)');
}

// ---------------------------------------------------------------------------
// Case D — transaction failure leaves no partial system mutation and no
// partial credit movement on EITHER actor (two-actor atomicity).
// ---------------------------------------------------------------------------
{
  resetFakeActorEngine();
  const owner = makeFakeOwner('owner-d1', 1); // affordable at preview-check math only if cost <= 1; force rejection instead
  const droid = makeFakeDroid('droid-d1', 0);
  asGM([owner, droid]);
  const result = await DroidCustomizationEngine.applyDroidCustomization(droid, { add: [TRANSLATOR_A] }, { walletActor: owner });
  assert.equal(result.success, false, 'insufficient owner funds must reject the whole transaction');
  assert.deepEqual(droid.system.installedSystems, {}, 'no system may be installed when the transaction is rejected');
  assert.equal(owner.system.credits, 1, 'owner credits must be untouched — no partial debit');
  assert.equal(fakeActorEngineCallLog.length, 0, 'atomicity: zero mutation calls on either actor when the transaction is rejected');
}

// ---------------------------------------------------------------------------
// Test Contract H — protect the actor ROLES passed into TransactionEngine,
// not merely that some transaction call happened. Wraps the real
// executeAssetCustomizationTransaction to record its args, then restores it.
// ---------------------------------------------------------------------------
{
  resetFakeActorEngine();
  const owner = makeFakeOwner('owner-h1', 5000);
  const droid = makeFakeDroid('droid-h1', 0);
  asGM([owner, droid]);

  const original = TransactionEngine.executeAssetCustomizationTransaction;
  let seenArgs = null;
  TransactionEngine.executeAssetCustomizationTransaction = async function spy(context, options) {
    seenArgs = context;
    return original.call(this, context, options);
  };
  try {
    const result = await DroidCustomizationEngine.applyDroidCustomization(droid, { add: [TRANSLATOR_A] }, { walletActor: owner });
    assert.equal(result.success, true, result.error);
  } finally {
    TransactionEngine.executeAssetCustomizationTransaction = original;
  }
  assert.ok(seenArgs, 'TransactionEngine.executeAssetCustomizationTransaction must have been called');
  assert.equal(seenArgs.actor.id, owner.id, 'actor (wallet role) must be the owner, not the droid');
  assert.equal(seenArgs.assetActor.id, droid.id, 'assetActor role must be the droid, not the owner');
  assert.notEqual(seenArgs.actor.id, seenArgs.assetActor.id, 'wallet and asset must be distinct actors for an owner-routed customization');
}

{
  resetFakeActorEngine();
  const owner = makeFakeOwner('owner-h2', 6000);
  const vehicle = makeFakeVehicle('vehicle-h2', 0);
  asGM([owner, vehicle]);

  const original = TransactionEngine.executeAssetCustomizationTransaction;
  let seenArgs = null;
  TransactionEngine.executeAssetCustomizationTransaction = async function spy(context, options) {
    seenArgs = context;
    return original.call(this, context, options);
  };
  try {
    const result = await VehicleCustomizationEngine.applyVehicleCustomization(vehicle, { add: [VEHICLE_SYSTEM] }, { walletActor: owner });
    assert.equal(result.success, true, result.error);
  } finally {
    TransactionEngine.executeAssetCustomizationTransaction = original;
  }
  assert.ok(seenArgs);
  assert.equal(seenArgs.actor.id, owner.id, 'actor (wallet role) must be the owner, not the vehicle');
  assert.equal(seenArgs.assetActor.id, vehicle.id, 'assetActor role must be the vehicle, not the owner');
}

// ---------------------------------------------------------------------------
// Resale credit also returns to the wallet actor, not the asset (Part 5).
// ---------------------------------------------------------------------------
{
  resetFakeActorEngine();
  const owner = makeFakeOwner('owner-resale1', 1000);
  const droid = makeFakeDroid('droid-resale1', 0, {
    system: { credits: 0, droidSystems: { size: 'medium' }, installedSystems: { [normalizeDroidPartId(TRANSLATOR_A)]: { installedAt: Date.now() } } }
  });
  asGM([owner, droid]);
  const expectedResale = Math.floor(computeDroidPartCost(droid, { id: TRANSLATOR_A }) * 0.5);
  const result = await DroidCustomizationEngine.applyDroidCustomization(droid, { remove: [TRANSLATOR_A] }, { walletActor: owner });
  assert.equal(result.success, true, result.error);
  assert.equal(owner.system.credits, 1000 + expectedResale, 'resale credit must return to the wallet actor');
  assert.equal(droid.system.credits, 0, 'the droid\'s own credits must not receive the resale — it is not the wallet');
}

console.log('Customization Bay foundation (owner/wallet/asset authority) contract tests passed.');
