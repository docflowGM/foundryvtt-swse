import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Droid component operation gate: a component being visible, hydrated from the catalog or carrying a weapon profile is not permission to OPERATE it.
// Attack / self-destruct require ledger-confirmed, enabled hardware. Enforced in the handlers (not only by disabled buttons).
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.CONFIG ??= { SWSE: {} };
globalThis.Hooks ??= { on() {}, once() {}, call() {} };
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
class AppV2 { static DEFAULT_OPTIONS = {}; }
globalThis.foundry.applications = { api: { ApplicationV2: AppV2, HandlebarsApplicationMixin: (B) => class extends B { static PARTS = {}; }, DialogV2: class {} }, sheets: { ActorSheetV2: AppV2 }, ux: {} };

const { authorizeDroidComponentOperation: gate, DROID_OPERATION_STATUS: S } = await import('../scripts/domain/droids/droid-component-operation-gate.js');
const { normalizeDroidPartId, getDroidPartDefinition } = await import('../scripts/data/droid-part-schema.js');
const { SWSEV2DroidSheet } = await import('../scripts/sheets/v2/droid-actor-sheet.js');
const deps = { normalizeId: normalizeDroidPartId, getDefinition: getDroidPartDefinition };

let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const mkItems = (items) => ({ get: (id) => items.find((i) => i.id === id) ?? null, find: (f) => items.find(f), filter: (f) => items.filter(f), map: (f) => items.map(f), [Symbol.iterator]: () => items[Symbol.iterator](), contents: items, size: items.length });
const sdItem = { id: 'sd1', type: 'droid-system', name: 'Self-Destruct System', system: { droidPartId: 'self-destruct-system', category: 'weapon', integrated: true, weaponProfile: { name: 'Self-Destruct System', mode: 'area', selfDestruct: true, damageBySize: { medium: '6d6' } } }, flags: {} };
const droid = (system = {}, items = [], extra = {}) => ({ id: 'd1', type: 'droid', name: 'Unit', items: mkItems(items), system: { droidSystems: { size: 'medium' }, ...system }, flags: { swse: {} }, ...extra });
const ledger = (id, over = {}) => ({ installedSystems: { [id]: { installed: true, enabled: true, ...over } } });

// 1. unit statuses
{
  assert.equal(gate(droid(ledger('self-destruct-system')), { ruleId: 'self-destruct-system' }, deps).status, S.OPERABLE);
  assert.equal(gate(droid(ledger('self-destruct-system', { enabled: false })), { ruleId: 'self-destruct-system' }, deps).status, S.DISABLED);
  assert.equal(gate(droid({ droidSystems: { size: 'medium', weapons: [{ id: 'self-destruct-system', name: 'Self-Destruct System' }] } }), { ruleId: 'self-destruct-system' }, deps).status, S.DRAFT);
  const item = { id: 'i1', type: 'droid-system', name: 'Taser', system: { droidPartId: 'taser', category: 'weapon', integrated: true }, flags: {} };
  assert.equal(gate(droid({}, [item]), { ruleId: 'taser' }, deps).status, S.ITEM_ONLY);
  assert.equal(gate(droid({}), { ruleId: 'taser' }, deps).status, S.UNRESOLVED);
  assert.equal(gate({ ...droid(ledger('taser')), type: 'character' }, { ruleId: 'taser' }, deps).status, S.NOT_DROID);
  assert.equal(gate(droid(ledger('taser'), [], {}), { ruleId: 'taser' }, deps).ok, true);
  ok('ledger+enabled operable; disabled / draft / item-only / unresolved / non-droid all refuse with a reason');
}

// handler harness
const calls = { attack: 0, updates: 0, confirm: 0, chat: 0, warn: [] };
globalThis.ui = { notifications: { warn: (m) => calls.warn.push(m), info() {} } };
globalThis.Dialog = { confirm: async () => { calls.confirm++; return false; } };
globalThis.ChatMessage = { create: async () => { calls.chat++; return {}; }, getSpeaker: () => ({}) };
globalThis.Roll = class { constructor() {} async evaluate() { return this; } async toMessage() { return {}; } };
const reset = () => { calls.attack = calls.updates = calls.confirm = calls.chat = 0; calls.warn.length = 0; };
const runUse = async (actor, dataset) => {
  const fake = { actor, _runCanonicalAttackWithPreroll: async () => { calls.attack++; return 'ATTACK'; } };
  return SWSEV2DroidSheet.prototype._useDroidPartFromButton.call(fake, { dataset });
};

// 2. Use handler: non-operable weapon / self-destruct never attacks or prompts
{
  const cases = {
    draft: droid({ droidSystems: { size: 'medium', weapons: [{ id: 'taser', name: 'Taser' }] } }),
    disabled: droid(ledger('taser', { enabled: false })),
    itemOnly: droid({}, [{ id: 'i1', type: 'droid-system', name: 'Taser', system: { droidPartId: 'taser', category: 'weapon', integrated: true }, flags: {} }]),
    unresolved: droid({}),
  };
  for (const [label, actor] of Object.entries(cases)) {
    reset();
    const r = await runUse(actor, { partRuleId: 'taser', partName: 'Taser' });
    assert.equal(r, null, `${label}: no attack result`); assert.equal(calls.attack, 0, `${label}: attack must not run`); assert.ok(calls.warn.length === 1, `${label}: user told why`);
  }
  // self-destruct: the profile comes from an embedded item; without ledger confirmation it never prompts or fires
  const sdCases = { itemOnly: droid({}, [sdItem]), disabled: droid(ledger('self-destruct-system', { enabled: false }), [sdItem]) };
  for (const [label, actor] of Object.entries(sdCases)) {
    reset();
    const sd = await runUse(actor, { partId: 'sd1' });
    assert.equal(sd, null, label); assert.equal(calls.confirm, 0, `${label}: self-destruct must not even prompt`); assert.equal(calls.attack, 0); assert.equal(calls.warn.length, 1, label);
  }
  ok('draft / disabled / item-only / unresolved parts cannot attack or self-destruct (handler enforced; user warned; no confirm prompt)');
}

// 3. legitimate installed hardware keeps its operations
{
  reset();
  const r = await runUse(droid(ledger('taser')), { partRuleId: 'taser', partName: 'Taser' });
  assert.equal(r, 'ATTACK'); assert.equal(calls.attack, 1); assert.equal(calls.warn.length, 0);
  reset();
  await runUse(droid(ledger('self-destruct-system'), [sdItem]), { partId: 'sd1' });
  assert.equal(calls.confirm, 1, 'installed self-destruct still reaches its confirmation dialog');
  ok('ledger-confirmed, enabled parts keep attack and self-destruct (confirmation preserved)');
}

// 4. describe-only parts stay open regardless of installation evidence
{
  reset();
  const r = await runUse(droid({}), { partRuleId: 'heuristic-processor', partName: 'Heuristic Processor' });
  assert.equal(r, null); assert.equal(calls.warn.length, 0, 'describing a non-mechanical part is not gated'); assert.equal(calls.attack, 0);
  ok('descriptive Use (no mechanical effect) is not gated');
}
// 5. roll-weapon: integrated droid hardware is gated in the handler; handheld weapons are not evaluated by the gate
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../scripts/sheets/v2/character-like-sheet.js', import.meta.url), 'utf8');
  const i = src.indexOf('isIntegratedWeaponItem(item)'); assert.ok(i > 0, 'integrated branch present');
  const block = src.slice(i, i + 700);
  assert.match(block, /authorizeDroidComponentOperation\(/); assert.match(block, /if \(!gate\.ok\)[\s\S]*return;/);
  assert.ok(src.indexOf('item.roll', i) > src.indexOf('gate.ok', i), 'gate precedes the roll');
  ok('shared roll-weapon handler gates integrated hardware before rolling; ordinary handheld weapons stay outside the gate');
}
// 6. identity must agree exactly (each case failed against the previous fallback behavior)
{
  const inst = (id, instanceId, over = {}) => [`${id}--${instanceId}`, { id, instanceId, locationId: `loc-${instanceId}`, installed: true, enabled: true, category: 'weapon', ...over }];
  const two = droid({ installedSystems: Object.fromEntries([inst('taser', 'iA'), inst('taser', 'iB')]) });
  // a stale/wrong instance never falls back to another installation of the same part
  let r = gate(two, { instanceId: 'iZ', ruleId: 'taser' }, deps);
  assert.equal(r.ok, false); assert.equal(r.status, S.UNRESOLVED);
  // exact instance works
  assert.equal(gate(two, { instanceId: 'iA', ruleId: 'taser' }, deps).ok, true);
  // instance + canonical that disagree: refuse
  const mixed = droid({ installedSystems: Object.fromEntries([inst('taser', 'iA'), inst('flamethrower', 'iB')]) });
  assert.equal(gate(mixed, { instanceId: 'iA', ruleId: 'flamethrower' }, deps).ok, false, 'iA is a taser, not a flamethrower');
  assert.equal(gate(mixed, { instanceId: 'iA', ruleId: 'taser' }, deps).ok, true);
  // several identical installations need the instance
  assert.equal(gate(two, { ruleId: 'taser' }, deps).ok, false);
  // an instance-less bare reference to a single installation still works
  assert.equal(gate(droid(ledger('taser')), { ruleId: 'taser' }, deps).ok, true);
  ok('wrong instance, mismatched canonical, and ambiguous identical installations are refused; exact identity still works');
}

// 7. an uninstalled integrated Item never inherits a same-type installation
{
  const item = (id) => ({ id, type: 'droid-system', name: 'Taser', system: { droidPartId: 'taser', category: 'weapon', integrated: true }, flags: {} });
  const hw = { installedSystems: { 'taser--iA': { id: 'taser', instanceId: 'iA', locationId: 'loc-A', installed: true, enabled: true, category: 'weapon' } } };
  const actor = droid(hw, [item('stray')]);
  // the stray Item is not behind the installed instance: it is item-only, not operable
  const stray = gate(actor, { itemId: 'stray', ruleId: 'taser' }, deps);
  assert.equal(stray.ok, false); assert.equal(stray.status, S.ITEM_ONLY);
  // naming the installed instance together with the stray Item is an identity mismatch
  assert.equal(gate(actor, { itemId: 'stray', instanceId: 'iA', ruleId: 'taser' }, deps).ok, false);
  // an Item id that is not in any record is refused (cannot fall back to canonical type)
  assert.equal(gate(actor, { itemId: 'ghost', ruleId: 'taser' }, deps).ok, false);
  // a single ledger entry (no instance) with exactly one Item: that Item is the installation
  assert.equal(gate(droid(ledger('taser'), [item('only')]), { itemId: 'only', ruleId: 'taser' }, deps).ok, true);
  // two Items collapsing into one non-instance installation cannot be told apart: fail closed
  assert.equal(gate(droid(ledger('taser'), [item('a'), item('b')]), { itemId: 'b', ruleId: 'taser' }, deps).ok, false);
  // handler level: the Use handler passes the Item identity, so the stray Item cannot attack
  reset();
  const out = await runUse(actor, { partId: 'stray' });
  assert.equal(out, null); assert.equal(calls.attack, 0);
  ok('an uninstalled integrated Item sharing a type with installed hardware is item-only and cannot attack; ambiguous Item sets fail closed');
}

// 8. browser presentation uses the same exact matcher (no stale-instance fallback)
{
  const { buildDroidComponentBrowser } = await import('../scripts/sheets/v2/droid-sheet/droid-component-browser.js');
  const { DroidSystemsResolver } = await import('../scripts/sheets/v2/droid-sheet/droid-systems-resolver.js');
  const hand = (i) => [`hand--inst-h${i}`, { id: 'hand', instanceId: `inst-h${i}`, locationId: `slot-${i}`, installed: true, enabled: true, category: 'appendage', slot: 'appendage' }];
  const actor = droid({ installedSystems: Object.fromEntries([hand(1), hand(2)]) });
  const b = buildDroidComponentBrowser(actor, new DroidSystemsResolver(actor).resolve(), { canOpenGarage: true });
  assert.equal(b.entries.filter((e) => e.category === 'appendage' && e.status.key === 'confirmed').length, 2);
  const { findInstalledComponent } = await import('../scripts/domain/droids/droid-component-operation-gate.js');
  const comps = (await import('../scripts/domain/droids/droid-installed-component-resolver.js')).resolveInstalledDroidComponents(actor, { normalizeId: normalizeDroidPartId, getDefinition: getDroidPartDefinition }).components;
  assert.equal(findInstalledComponent(comps, { instanceId: 'inst-gone', ruleId: 'hand' }, normalizeDroidPartId).component, null, 'stale instance resolves to nothing, not to another hand');
  ok('the browser and the gate share one exact matcher; a stale instance resolves to nothing');
}
console.log(`droid-component-operation-gate: ${n} checks passed`);
