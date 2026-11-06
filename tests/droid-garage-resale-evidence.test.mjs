import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// U-0 finding F7 (clean-break correction): Garage removal and resale are
// authorized ONLY by a confirmed, well-formed `system.installedSystems` ledger
// record. Mirror (`droidSystems`), embedded-Item, stock-statblock display and
// malformed/disabled evidence must never remove hardware or credit the wallet.
// Every case asserts the PREVIEW and the applied WALLET, not just a message.
// Offline: the wallet movement is the fake ActorEngine applying the real
// engine's mutation; not Foundry-tested.

registerFoundryPathLoader();
const SYSTEM_ID = 'foundryvtt-swse';
const PART = 'plasteel-shell';
const { resetFakeActorEngine, fakeActorEngineCallLog } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');
const { DroidCustomizationEngine } = await import('../scripts/engine/customization/droid-customization-engine.js');
const { computeDroidPartCost } = await import('../scripts/data/droid-part-schema.js');

function droid({ ledger = {}, droidSystems = {}, items = [], stock = false } = {}) {
  const actor = {
    id: 'droid-1', name: 'Probe', type: 'droid', uuid: 'Actor.droid-1', isOwner: true,
    system: { credits: 10000, ...(stock ? { droidCalculationMode: 'stock-statblock' } : {}), droidSystems: { size: 'medium', ...droidSystems }, installedSystems: ledger },
    img: '', items, effects: [], flags: { [SYSTEM_ID]: {}, swse: {} },
    getFlag(s, k) { return this.flags?.[s]?.[k]; },
    toObject() { return JSON.parse(JSON.stringify({ system: actor.system, name: actor.name, img: actor.img, items: actor.items, effects: actor.effects, flags: actor.flags })); }
  };
  return actor;
}
const gm = () => installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, actors: { get: () => null }, users: [] } });
const mirror = { id: PART, name: 'Plasteel Shell' };
const item = { id: 'item-1', name: 'Plasteel Shell', type: 'equipment', flags: { [SYSTEM_ID]: { droidPart: { id: PART } } }, system: { droidPart: { id: PART } } };

async function removeAndMeasure(make, request = { remove: [PART] }) {
  gm();
  const preview = DroidCustomizationEngine.previewDroidCustomization(make(), request);
  resetFakeActorEngine();
  const actor = make();
  const applied = await DroidCustomizationEngine.applyDroidCustomization(actor, request);
  return { preview, applied, actor, mutations: fakeActorEngineCallLog.length };
}

const REFUSED = [
  ['mirror-only (empty ledger)', () => droid({ droidSystems: { armor: mirror } }), /no confirmed installation record/],
  ['embedded Item only', () => droid({ items: [item] }), /no confirmed installation record/],
  ['stock-statblock display-only factory hardware', () => droid({ droidSystems: { armor: mirror }, stock: true }), /no confirmed installation record/],
  ['ledger installed:false', () => droid({ ledger: { [PART]: { installed: false } } }), /not currently installed/],
  ['malformed ledger entry', () => droid({ ledger: { [PART]: 'junk' } }), /not currently installed/],
  ['ledger installed:false + mirror present', () => droid({ ledger: { [PART]: { installed: false } }, droidSystems: { armor: mirror } }), /not currently installed/]
];
for (const [label, make, message] of REFUSED) {
  const r = await removeAndMeasure(make);
  assert.equal(r.preview.success, false, `${label}: preview must refuse`);
  assert.match(r.preview.error, message, label);
  assert.equal(r.applied.success, false, `${label}: apply must refuse`);
  assert.equal(r.actor.system.credits, 10000, `${label}: wallet must not move`);
  assert.equal(r.mutations, 0, `${label}: no actor mutation may be issued`);
}

// Control: a confirmed ledger record is still sellable exactly once.
{
  const make = () => droid({ ledger: { [PART]: { installedAt: 1 } } });
  const expected = Math.floor(computeDroidPartCost(make(), { id: PART }) * 0.5);
  const r = await removeAndMeasure(make);
  assert.equal(r.preview.success, true, r.preview.error);
  assert.equal(r.applied.success, true, r.applied.error);
  assert.equal(r.actor.system.credits, 10000 + expected, 'confirmed hardware is resold exactly once');
  const again = await DroidCustomizationEngine.applyDroidCustomization(r.actor, { remove: [PART] });
  assert.equal(again.success, false, 'a repeated removal must be refused');
  assert.equal(r.actor.system.credits, 10000 + expected, 'repeat removal must not pay again');
}

// Confirmed ledger + stale mirror duplicate: the confirmed record decides; one sale.
{
  const make = () => droid({ ledger: { [PART]: { installedAt: 1 } }, droidSystems: { armor: mirror } });
  const expected = Math.floor(computeDroidPartCost(make(), { id: PART }) * 0.5);
  const r = await removeAndMeasure(make);
  assert.equal(r.applied.success, true, r.applied.error);
  assert.equal(r.actor.system.credits, 10000 + expected);
}

// Present-but-unconfirmed hardware still blocks buying a second copy (present evidence blocks conflicts).
{
  gm();
  const preview = DroidCustomizationEngine.previewDroidCustomization(droid({ droidSystems: { armor: mirror } }), { add: [PART] });
  assert.equal(preview.success, false);
  assert.match(preview.error, /already installed/);
}

// Clean-break: droid identity for the Garage is the shared rules profile, so an npc-typed droid
// follower is customized WITHOUT type impersonation, under the same confirmed-ledger rule.
{
  const follower = (extra) => { const a = droid(extra); a.type = 'npc'; a.system.isDroid = true; a.system.isFollower = true; return a; };
  gm();
  const confirmedF = follower({ ledger: { [PART]: { installedAt: 1 } } });
  const ok = DroidCustomizationEngine.previewDroidCustomization(confirmedF, { remove: [PART] });
  assert.equal(ok.success, true, ok.error);
  const mirrorF = follower({ droidSystems: { armor: mirror } });
  const refused = DroidCustomizationEngine.previewDroidCustomization(mirrorF, { remove: [PART] });
  assert.equal(refused.success, false);
  assert.match(refused.error, /no confirmed installation record/);
  const notDroid = droid({}); notDroid.type = 'npc';
  assert.equal(DroidCustomizationEngine.previewDroidCustomization(notDroid, { add: [PART] }).success, false, 'a non-droid npc is not customizable as a droid');
  const fs = await import('node:fs');
  assert.equal(fs.existsSync('scripts/patches/follower-droid-garage-hotfix.js'), false, 'no follower type-impersonation patch exists');
  const eng = fs.readFileSync('scripts/engine/customization/droid-customization-engine.js', 'utf8');
  assert.doesNotMatch(eng, /actor\.type !== 'droid'/, 'the engine gates on the shared profile');
}

console.log('Droid Garage resale-evidence (F7) tests passed.');
