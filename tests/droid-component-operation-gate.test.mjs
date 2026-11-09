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
console.log(`droid-component-operation-gate: ${n} checks passed`);
