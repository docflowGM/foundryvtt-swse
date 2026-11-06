import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Droid Gate C-1 -- the Upgrade Workshop's droid removal passes a RAW LEDGER KEY
// to the customization engine. A physical appendage's key is opaque
// ("hand--inst-..."), so the Workshop must address it by its own part id +
// instance id, and must NEVER fall back to a raw ledger delete for an
// identified instance (that would orphan the droidSystems mirror and freeze
// all further customization of the droid).

registerFoundryPathLoader();

const SYSTEM_ID = 'foundryvtt-swse';
function makeActorsCollection(actors = []) {
  const map = new Map(actors.map(a => [a.id, a]));
  return { get: (id) => map.get(id), set: (id, a) => map.set(id, a), [Symbol.iterator]: () => map.values() };
}
function makeFakeDroid({ installedSystems = {}, droidSystems = {} } = {}) {
  const actor = {
    id: 'd1', name: 'Test Droid', type: 'droid', uuid: 'Actor.d1', isOwner: true,
    system: { credits: 10000, droidSystems: { size: 'medium', ...droidSystems }, installedSystems },
    img: 'icons/x.png', items: [], effects: [], flags: { [SYSTEM_ID]: {}, swse: {} },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    toObject() { return JSON.parse(JSON.stringify({ system: actor.system, name: actor.name, img: actor.img, prototypeToken: actor.prototypeToken, items: actor.items, effects: actor.effects, flags: actor.flags })); }
  };
  return actor;
}
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, actors: makeActorsCollection([]), users: [] } });

const { resetFakeActorEngine, fakeActorEngineCallLog } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');
const { DroidCustomizationEngine } = await import('../scripts/engine/customization/droid-customization-engine.js');
const { UpgradeService } = await import('../scripts/engine/upgrades/UpgradeService.js');
const { listLedgerInstances, auditAppendageMirror } = await import('../scripts/domain/droids/droid-appendage-instance.js');

const seq = (...v) => { const q = [...v]; return () => q.shift(); };
const ITEM_ID = 'droid-actor-d1';

async function droidWithTwoHands() {
  const d = makeFakeDroid();
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['hand'] }, { idSource: seq('aaaaaa01') });
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['hand'] }, { idSource: seq('bbbbbb02') });
  return d;
}

// 1. Workshop removal of the SECOND listed hand removes exactly that instance and keeps the mirror consistent.
{
  resetFakeActorEngine();
  const d = await droidWithTwoHands();
  const keys = Object.keys(d.system.installedSystems);
  const index = keys.findIndex(k => d.system.installedSystems[k].instanceId === 'inst-bbbbbb02');
  assert.ok(index >= 0);
  const result = await UpgradeService.removeUpgrade({ actor: d, itemId: ITEM_ID, upgradeIndex: index });
  assert.equal(result.success, true);
  assert.deepEqual(listLedgerInstances(d.system.installedSystems).instances.map(i => i.instanceId), ['inst-aaaaaa01']);
  assert.deepEqual(d.system.droidSystems.appendages.map(a => a.instanceId), ['inst-aaaaaa01']);
  assert.deepEqual(auditAppendageMirror(d.system.installedSystems, d.system.droidSystems), [], 'no orphaned mirror row');
}

// 2. When the engine refuses (a host with a fitted part), the Workshop reports the failure and
// leaves the droid untouched -- it does NOT raw-delete the ledger entry.
{
  resetFakeActorEngine();
  const d = makeFakeDroid({
    installedSystems: {
      'hand--inst-aaaaaa01': { id: 'hand', instanceId: 'inst-aaaaaa01', locationId: 'appendage-slot-1', name: 'Hand', category: 'appendage', slot: 'appendage' },
      'telescopic-appendage': { id: 'telescopic-appendage', hostInstanceId: 'inst-aaaaaa01', name: 'Telescopic Appendage', category: 'appendage', slot: 'appendage.enhancement' }
    },
    droidSystems: { appendages: [{ id: 'hand', instanceId: 'inst-aaaaaa01', locationId: 'appendage-slot-1' }] }
  });
  const before = JSON.stringify(d.system);
  await assert.rejects(() => UpgradeService.removeUpgrade({ actor: d, itemId: ITEM_ID, upgradeIndex: 0 }), /fitted to it|remove that first/i);
  assert.equal(JSON.stringify(d.system), before, 'no raw ledger delete for an identified instance');
  assert.equal(fakeActorEngineCallLog.length, 0);
}

// 3. Legacy (unidentified) entries keep the original behavior: removed through the engine.
{
  resetFakeActorEngine();
  const d = makeFakeDroid({ installedSystems: { 'plasteel-shell': { id: 'plasteel-shell', installedAt: 1 } } });
  const result = await UpgradeService.removeUpgrade({ actor: d, itemId: ITEM_ID, upgradeIndex: 0 });
  assert.equal(result.success, true);
  assert.equal(d.system.installedSystems['plasteel-shell'], undefined);
}

// 4. The Workshop's installed list names an identified instance by its own name, not by its opaque key.
{
  const d = await droidWithTwoHands();
  const rows = UpgradeService.getCurrentUpgrades(d, { sourceType: 'droid-actor', system: d.system });
  assert.equal(rows.length, 2);
  for (const row of rows) assert.ok(!/inst-/.test(row.name), `opaque key leaked into the label: ${row.name}`);
}

// 5. Wave 2A: NO droid raw-ledger fallback. An unrecognized (unidentified) key that the engine
// cannot validate fails closed: error surfaced, ledger/mirror/credits untouched, nothing mutated.
{
  resetFakeActorEngine();
  const d = makeFakeDroid({
    installedSystems: { 'totally-unknown-widget': { id: 'totally-unknown-widget', installedAt: 1 }, 'plasteel-shell': { id: 'plasteel-shell', installedAt: 2 } },
    droidSystems: { accessories: [{ id: 'totally-unknown-widget' }] }
  });
  const before = JSON.stringify(d.system);
  await assert.rejects(() => UpgradeService.removeUpgrade({ actor: d, itemId: ITEM_ID, upgradeIndex: 0 }), /Unknown system|not currently installed|cannot/i);
  assert.equal(JSON.stringify(d.system), before, 'ledger, mirror and credits are untouched');
  assert.equal(d.system.credits, 10000, 'no resale credited');
  assert.equal(fakeActorEngineCallLog.length, 0, 'no ActorEngine mutation at all');
}

// 6. A stale index (entry already gone) is still a harmless no-op, and a vehicle-actor index is untouched by this path.
{
  resetFakeActorEngine();
  const d = makeFakeDroid();
  const r = await UpgradeService.removeUpgrade({ actor: d, itemId: ITEM_ID, upgradeIndex: 5 });
  assert.equal(r.success, true);
  assert.equal(fakeActorEngineCallLog.length, 0);
}

// 7. Valid removal still pays resale exactly once (credits move only through the engine's transaction).
{
  resetFakeActorEngine();
  const d = makeFakeDroid();
  await DroidCustomizationEngine.applyDroidCustomization(d, { add: ['claw'] }, { idSource: seq('cccccc03') });
  const credits = d.system.credits;
  const r = await UpgradeService.removeUpgrade({ actor: d, itemId: ITEM_ID, upgradeIndex: 0 });
  assert.equal(r.success, true);
  assert.ok(d.system.credits > credits, 'resale credited by the transaction');
  assert.equal(listLedgerInstances(d.system.installedSystems).instances.length, 0);
  assert.deepEqual(auditAppendageMirror(d.system.installedSystems, d.system.droidSystems), []);
}

console.log('Droid Gate C-1 Workshop removal tests passed.');
