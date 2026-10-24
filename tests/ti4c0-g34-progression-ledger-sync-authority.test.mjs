/**
 * TI4-C0 / G34 — the progression-ledger reconciliation hotfix must run only on an authorized GM client and must write class-item levels through
 * ActorEngine (the mutation authority), never with a direct `actor.updateEmbeddedDocuments`.
 *
 * Defect: `registerProgressionLedgerReconciliationHotfix()` installs `Hooks.once('ready')` and `updateActor` / `createItem` / `updateItem` handlers
 * that every client runs (Foundry fires document hooks on all clients). Each client — players included — computed the ledger and, when a class Item's
 * level disagreed with `system.progression.classLevels`, wrote to the actor directly with `actor.updateEmbeddedDocuments('Item', …)`.
 *
 * Real production code under test: the hotfix module (its real hook handlers, ledger builder and sync). Narrowly injected: `Hooks` (recorded so the
 * handlers can be invoked as Foundry would), `game.user` / `game.users` / `game.actors`, and `ActorEngine.updateEmbeddedDocuments` (a recording model that
 * applies the updates to a plain actor and fires the item/actor hooks synchronously, as Foundry does during a write). A plain actor's own
 * `updateEmbeddedDocuments` counts DIRECT writes. Level: L1 (offline, one client). Multi-client behaviour (L2) is not tested or claimed.
 *
 * The runner RECORDS each case's failure so a fail-before run shows exactly which behaviours are missing.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || {};
window.addEventListener ??= () => {}; window.removeEventListener ??= () => {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B, DialogV2: class {} } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const handlers = { ready: [], updateActor: [], createItem: [], updateItem: [] };
globalThis.Hooks = {
  once: (name, fn) => { (handlers[name] ??= []).push(fn); },
  on: (name, fn) => { (handlers[name] ??= []).push(fn); },
  callAll() {}
};

const { registerProgressionLedgerReconciliationHotfix } = await import('/systems/foundryvtt-swse/scripts/patches/progression-ledger-reconciliation-hotfix.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
assert.equal(registerProgressionLedgerReconciliationHotfix(), true, 'the hotfix registers its hooks');
assert.equal(registerProgressionLedgerReconciliationHotfix(), false, 'registration is idempotent');
const quiet = () => {};
const savedConsole = { info: console.info, warn: console.warn };
console.info = quiet; console.warn = quiet;

const savedEngine = ActorEngine.updateEmbeddedDocuments; const savedGame = globalThis.game;
const probe = { engineCalls: [], directCalls: [], directWrites: 0, fireHooksDuringWrite: true, failEngine: null, gate: null, hookFires: 0 };

const setPath = (obj, path, value) => { const parts = path.split('.'); let t = obj; for (let i = 0; i < parts.length - 1; i++) t = (t[parts[i]] ??= {}); t[parts.at(-1)] = value; };
async function applyWrite(actor, updates) {
  if (probe.gate) await probe.gate;
  if (probe.failEngine) throw new Error(probe.failEngine);
  for (const u of updates) {
    const item = actor.items.get(u._id); if (!item) continue;
    for (const [k, v] of Object.entries(u)) { if (k !== '_id') setPath(item, k, v); }
  }
  if (probe.fireHooksDuringWrite) {                                  // Foundry fires these hooks DURING the awaited write
    probe.hookFires++;
    for (const u of updates) { const item = actor.items.get(u._id); for (const fn of handlers.updateItem) fn(item, {}, {}, 'gm1'); }
    for (const fn of handlers.updateActor) fn(actor, { system: { level: actor.system.level } }, {}, 'gm1');
  }
  return updates;
}
function mkItem(id, name, level, over = {}) {
  return { id, name, type: 'class', system: { className: name, classId: name.toLowerCase(), level }, flags: {}, ...over };
}
function mkActor({ id = 'A1', level = 5, classLevels, items, owner = true } = {}) {
  const actor = { id, name: `Actor ${id}`, isOwner: owner, system: { level, progression: { classLevels: classLevels ?? { soldier: 3, scout: 2 } } },
    items: items ?? [mkItem('i_sol', 'Soldier', 1), mkItem('i_sco', 'Scout', 1)] };
  actor.items.get = (x) => actor.items.find((i) => i.id === x) ?? null;
  actor.updateEmbeddedDocuments = async (embeddedName, updates) => { probe.directWrites++; probe.directCalls.push({ actorId: actor.id, embeddedName, updates: JSON.parse(JSON.stringify(updates)) }); return applyWrite(actor, updates); };   // a DIRECT write: counted, never allowed
  return actor;
}
function install({ isGM = true, userId = 'gm1', activeGM, actors = [] } = {}) {
  Object.assign(probe, { engineCalls: [], directCalls: [], directWrites: 0, fireHooksDuringWrite: true, failEngine: null, gate: null, hookFires: 0 });
  const users = { activeGM };
  globalThis.game = { ...(savedGame ?? {}), user: { id: userId, isGM }, users, actors: Object.assign([...actors], { get: (id) => actors.find((a) => a?.id === id) ?? null }) };
  ActorEngine.updateEmbeddedDocuments = async (actor, embeddedName, updates, options = {}) => {
    probe.engineCalls.push({ actorId: actor.id, embeddedName, updates: JSON.parse(JSON.stringify(updates)), options });
    return applyWrite(actor, updates);
  };
}
function restoreAll() { ActorEngine.updateEmbeddedDocuments = savedEngine; globalThis.game = savedGame; }
const runReady = async () => { for (const fn of handlers.ready) fn(); await settle(); };
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0)); };
const levels = (a) => Object.fromEntries(a.items.map((i) => [i.id, i.system.level]));
const totalWrites = () => probe.engineCalls.length + probe.directWrites;

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { restoreAll(); }
}

/* ============================================================================================== */
/* authorized GM execution                                                                            */
/* ============================================================================================== */
await check('1. GM ready scan reconciles class-item levels to the ledger THROUGH ActorEngine (and not with a direct actor write)', async () => {
  const a = mkActor(); install({ actors: [a] });
  await runReady();
  assert.deepEqual(levels(a), { i_sol: 3, i_sco: 2 });
  assert.equal(probe.directWrites, 0, 'no direct actor.updateEmbeddedDocuments');
  assert.equal(probe.engineCalls.length, 1);
  assert.equal(probe.engineCalls[0].embeddedName, 'Item');
  assert.equal(typeof probe.engineCalls[0].options.source, 'string', 'the ActorEngine call names its source');
});

await check('2. the update payload is preserved: item ids, the three level fields, className/classId kept, ledger flags; unrelated items untouched', async () => {
  const gear = { id: 'i_gear', name: 'Blaster', type: 'weapon', system: { level: 9 }, flags: {} };
  const a = mkActor({ items: [mkItem('i_sol', 'Soldier', 1), mkItem('i_sco', 'Scout', 2, { system: { className: 'Scout', classId: 'custom-scout-id', level: 2 } }), gear] });
  install({ actors: [a] });
  await runReady();
  const ups = probe.engineCalls[0].updates;
  assert.deepEqual(ups.map((u) => u._id), ['i_sol'], 'only the class item whose level disagrees is updated');
  assert.equal(ups[0]['system.level'], 3); assert.equal(ups[0]['system.levels'], 3); assert.equal(ups[0]['system.classLevel'], 3);
  assert.equal(ups[0]['system.className'], 'Soldier'); assert.equal(ups[0]['system.classId'], 'soldier');
  assert.equal(ups[0]['flags.swse.progression.ledgerSynced'], true); assert.equal(ups[0]['flags.swse.progression.ledgerSyncReason'], 'ready-ledger-scan');
  assert.equal(a.items.get('i_gear').system.level, 9, 'a non-class item is never touched');
  assert.equal(a.items.get('i_sco').system.classId, 'custom-scout-id');
});

/* ============================================================================================== */
/* non-GM clients never write                                                                         */
/* ============================================================================================== */
await check('3. a NON-GM client never reconciles: the ready scan and every hook path perform no write at all', async () => {
  const a = mkActor({ owner: true }); install({ isGM: false, userId: 'player1', actors: [a] });
  await runReady();
  for (const fn of handlers.updateActor) fn(a, { system: { progression: { classLevels: { soldier: 3 } } } });
  for (const fn of handlers.updateActor) fn(a, { system: { level: 5 } });
  for (const fn of handlers.createItem) fn(a.items[0]);
  for (const fn of handlers.updateItem) fn(a.items[0]);
  await settle();
  assert.equal(totalWrites(), 0, 'no write of any kind from a player client');
  assert.deepEqual(levels(a), { i_sol: 1, i_sco: 1 }, 'the actor is untouched');
});

await check('4. with several GMs online only the ACTIVE GM reconciles; a passive GM does not, and a GM with no active-GM election still does', async () => {
  const a = mkActor(); install({ isGM: true, userId: 'gm2', activeGM: { id: 'gm1' }, actors: [a] });
  await runReady();
  assert.equal(totalWrites(), 0, 'a GM that is not the active GM does not write');
  const b = mkActor(); install({ isGM: true, userId: 'gm1', activeGM: { id: 'gm1' }, actors: [b] });
  await runReady(); assert.equal(probe.engineCalls.length, 1, 'the active GM reconciles through ActorEngine');
  const c = mkActor(); install({ isGM: true, userId: 'gm1', activeGM: undefined, actors: [c] });
  await runReady(); assert.equal(probe.engineCalls.length, 1, 'no election information: the GM gate alone applies');
});

/* ============================================================================================== */
/* idempotence, recursion and concurrency                                                             */
/* ============================================================================================== */
await check('5. repeated invocations write nothing once the class items agree with the ledger', async () => {
  const a = mkActor(); install({ actors: [a] });
  await runReady(); const first = totalWrites();
  await runReady();
  for (const fn of handlers.updateActor) fn(a, { system: { level: 5 } });
  await settle();
  assert.equal(first, 1); assert.equal(totalWrites(), 1, 'no further writes');
});

await check('6. update-hook recursion: the hooks fired DURING the write do not trigger a nested or follow-up write', async () => {
  const a = mkActor(); install({ actors: [a] }); probe.fireHooksDuringWrite = true;
  await runReady(); await settle();
  assert.equal(totalWrites(), 1, 'exactly one write');
  assert.ok(probe.hookFires >= 1, 'the item/actor hooks really fired during the write');
});

await check('7. concurrent same-client triggers for one actor produce one write (the in-flight guard)', async () => {
  const a = mkActor(); install({ actors: [a] });
  let release; probe.gate = new Promise((res) => { release = res; }); probe.fireHooksDuringWrite = false;
  const triggers = () => { for (const fn of handlers.updateActor) fn(a, { system: { level: 5 } }); };
  triggers(); await settle(); triggers(); for (const fn of handlers.createItem) fn(a.items[0]); await settle();
  release(); await settle();
  assert.equal(totalWrites(), 1);
  assert.deepEqual(levels(a), { i_sol: 3, i_sco: 2 });
});

await check('8. a non-authoritative ledger (levels do not total the character level) writes nothing', async () => {
  const a = mkActor({ level: 9 }); install({ actors: [a] });
  await runReady();
  assert.equal(totalWrites(), 0);
});

/* ============================================================================================== */
/* malformed data and authority failures                                                              */
/* ============================================================================================== */
await check('9. malformed progression data and items never throw and never produce a bad update; valid parts still reconcile', async () => {
  const bad = mkActor({ id: 'BAD', level: 3, classLevels: { soldier: 3, junk: null, neg: -2, nan: 'x', obj: {} } });
  bad.items = Object.assign([mkItem(undefined, 'Soldier', 1, { id: undefined, _id: undefined }), null, { type: 'class' }, mkItem('i_ok', 'Soldier', 1)], { get: () => null });
  const noItems = mkActor({ id: 'NOITEMS' }); noItems.items = undefined;
  const nullLedger = mkActor({ id: 'NL' }); nullLedger.system.progression = null;
  install({ actors: [null, undefined, bad, noItems, nullLedger, mkActor({ id: 'OK' })] });
  await runReady();
  const ids = [...probe.engineCalls, ...probe.directCalls].flatMap((c) => c.updates.map((u) => u._id));
  assert.ok(ids.every((id) => typeof id === 'string' && id.length), 'no update without a usable item id');
  assert.ok([...probe.engineCalls, ...probe.directCalls].some((c) => c.actorId === 'OK'), 'a healthy actor is still reconciled');
  assert.equal(probe.directWrites, 0, 'and not with a direct write');
  assert.equal(probe.directWrites, 0);
});

await check('10. an ActorEngine failure is contained: no throw, NO direct-write fallback, the guard is released and a later trigger can retry', async () => {
  const a = mkActor(); install({ actors: [a] }); probe.failEngine = 'engine refused';
  await runReady();
  assert.equal(probe.engineCalls.length, 1); assert.equal(probe.directWrites, 0, 'no fallback to a direct write');
  assert.deepEqual(levels(a), { i_sol: 1, i_sco: 1 }, 'nothing was half-applied');
  probe.failEngine = null;
  for (const fn of handlers.updateActor) fn(a, { system: { level: 5 } });
  await settle();
  assert.equal(probe.engineCalls.length, 2, 'the in-flight guard was released after the failure');
  assert.deepEqual(levels(a), { i_sol: 3, i_sco: 2 });
});

await check('11. hook filtering is unchanged: updateActor without progression/level changes, and createItem/updateItem for non-class or unowned items, do nothing', async () => {
  const a = mkActor(); install({ actors: [a] });
  for (const fn of handlers.updateActor) fn(a, { name: 'renamed' });
  for (const fn of handlers.updateActor) fn(a, {});
  for (const fn of handlers.createItem) fn({ type: 'weapon', parent: a });
  for (const fn of handlers.createItem) fn({ type: 'class', parent: null });
  for (const fn of handlers.updateItem) fn({ type: 'class', parent: null });
  await settle();
  assert.equal(totalWrites(), 0);
  for (const fn of handlers.createItem) fn({ type: 'class', parent: a });
  await settle();
  assert.equal(probe.engineCalls.length, 1, 'a class item created on an actor still reconciles it');
  assert.equal(probe.engineCalls[0].updates.length, 2);
});

await check('12. the hotfix contains no direct embedded-document write (source check)', async () => {
  const src = await readFile(new URL('../scripts/patches/progression-ledger-reconciliation-hotfix.js', import.meta.url), 'utf8');
  assert.ok(!/\bactor\.updateEmbeddedDocuments\s*\(/.test(src), 'no actor.updateEmbeddedDocuments call');
  assert.ok(!/\.update\(/.test(src.replace(/\/\/.*$/gm, '')), 'no document .update(');
  assert.ok(/ActorEngine\.updateEmbeddedDocuments\(/.test(src), 'writes go through ActorEngine');
});

console.info = savedConsole.info; console.warn = savedConsole.warn;
const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0 G34 progression ledger sync authority: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
