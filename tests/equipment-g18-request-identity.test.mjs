import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// TI4-B G18: one logical equipment action keeps one request id across retries, so the coordinator's duplicate protection actually applies.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const RI = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-request-identity.js');
const { installCoordinatorHarness, REC } = await import('./helpers/equipment-coordinator-harness.mjs');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const h = installCoordinatorHarness(ActorEngine);
const mkActor = (items) => { items.get = (id) => items.find((i) => i.id === id); const a = { id: 'a', type: 'character', items, system: { size: 'Medium' }, flags: { swse: {} } }; for (const i of items) i.actor = a; return a; };
const weapon = (id) => ({ id, name: 'Blade', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: 'lightsaber-chassis-archaic-lightsaber' } } }, system: { activated: false, subtype: 'lightsaber', weaponCategory: 'lightsaber', ...REC('STOWED', null, []) } });
const ready = (itemId = 's', arm = 'natural-arm-1') => ({ type: 'ready', itemId, appendageIds: [arm], grip: 'one-handed' });
function world({ spendThrows = false, markerThrows = false } = {}) {
  RI._resetRequestRegistryForTests();
  const actor = mkActor([weapon('s'), weapon('o')]);
  const spends = []; const history = [];
  const deps = {
    ...h.deps, isGm: () => true, ledger: new Map(), resolveActionCost: async () => 'move', isLightsaber: async () => false,
    spendAction: async (_a, type, meta) => { if (spendThrows) throw new Error('spend threw'); spends.push({ type, meta }); history.push({ metadata: meta }); return { allowed: true, committed: true }; },
    spendMarkerPresent: async (_a, id) => { if (markerThrows) throw new Error('marker unreadable'); return history.some((x) => x.metadata?.requestId === id); },
  };
  return { actor, deps, spends };
}

{
  // a double click: two concurrent calls for the same logical action share one id; only one execution and one spend happen
  const w = world();
  const [a, b] = await Promise.all([
    InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps }),
    InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps }),
  ]);
  assert.equal(a.requestId, b.requestId, 'the same logical action carries one request id');
  assert.deepEqual([a.status, b.status].sort(), ['COMMITTED', 'DUPLICATE_REPLAYED']);
  assert.equal(w.spends.length, 1, 'the action is paid once');
  assert.equal(w.spends[0].meta.requestId, a.requestId, 'the id reaches the action-economy record');
  assert.equal(w.actor.flags.swse.equipmentTxn.entries.length, 1, 'one journaled transaction');
  assert.equal(w.actor.flags.swse.equipmentTxn.entries[0].requestId, a.requestId, 'the id reaches the journal');
  ok('1: concurrent identical requests share one id: one execution, one spend, the id is in the journal and the spend metadata');
}
{
  // after an unresolved (indeterminate) outcome a retry keeps the id and is never replayed
  const w = world({ spendThrows: true, markerThrows: true });
  const first = await InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps });
  assert.equal(first.status, 'INDETERMINATE');
  const retry = await InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps });
  assert.equal(retry.requestId, first.requestId, 'a retry of an unresolved action keeps its id');
  assert.notEqual(retry.status, 'COMMITTED');
  assert.equal(w.actor.flags.swse.equipmentTxn.entries.length, 1, 'no second transaction starts');
  ok('2: an indeterminate action keeps its id for retries, which never start a second transaction');
}
{
  // a settled action releases its id: the next request is a new logical action with a new id
  const w = world();
  const first = await InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps });
  assert.equal(first.status, 'COMMITTED');
  const stow = await InventoryEngine.requestWeaponPosture(w.actor, { type: 'stow', itemId: 's' }, { deps: w.deps });
  assert.equal(stow.status, 'COMMITTED'); assert.notEqual(stow.requestId, first.requestId);
  const again = await InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps });
  assert.equal(again.status, 'COMMITTED'); assert.notEqual(again.requestId, first.requestId, 'drawing again later is a new action');
  assert.equal(w.spends.length, 3);
  ok('3: different and later requests get distinct ids; each settled action runs once');
}
{
  // the same id with a different intent is refused, nothing written
  const w = world();
  const first = await InventoryEngine.requestWeaponPosture(w.actor, ready('s'), { deps: w.deps });
  const reuse = await InventoryEngine.requestWeaponPosture(w.actor, ready('o', 'natural-arm-2'), { requestId: first.requestId, deps: w.deps });
  assert.equal(reuse.status, 'REQUEST_ID_CONFLICT'); assert.equal(w.spends.length, 1);
  assert.equal(w.actor.items.get('o').system.weaponPosture, 'STOWED');
  ok('4: a request id reused for a different intent is rejected');
}
{
  // CHOICE_REQUIRED returns the id so the follow-up (with the chosen appendages/grip) carries it
  const w = world();
  const ask = await InventoryEngine.requestWeaponPosture(w.actor, { type: 'ready', itemId: 's' }, { deps: w.deps });
  assert.equal(ask.status, 'CHOICE_REQUIRED'); assert.ok(ask.requestId);
  const follow = await InventoryEngine.setWeaponReadied(w.actor, 's', true, { appendageIds: ['natural-arm-1'], grip: 'one-handed', requestId: ask.requestId, deps: w.deps });
  assert.equal(follow.status, 'COMMITTED'); assert.equal(follow.requestId, ask.requestId);
  assert.equal(w.spends[0].meta.requestId, ask.requestId);
  ok('5: the id issued at the first click survives the choice step into execution');
}
console.log(`equipment-g18-request-identity: ${n} checks ok`);
