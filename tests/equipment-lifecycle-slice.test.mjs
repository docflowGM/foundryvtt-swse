import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Equipment lifecycle slice through production entry points, GM-local: acquire (ActorEngine) -> attack refused while stowed -> Draw from the sheet
// with the hands/grip choice (InventoryEngine -> coordinator) -> sheet shows Drawn -> attack (rollAttack readiness gate + AmmoSystem spend) ->
// out of ammo -> the sheet's Reload workflow picks the drawn weapon -> attack again -> Stow -> attack refused -> remove the item. Dice, chat and the
// action-economy store are the only stubs (counted); persistence is the shared in-memory ActorEngine harness.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {};
globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {}, DialogV2: class {} };
globalThis.foundry.applications.sheets ??= { ActorSheetV2: class {}, ItemSheetV2: class {}, JournalSheet: class {} };
globalThis.foundry.applications.ux ??= { DragDrop: { implementation: class {} }, TextEditor: { implementation: {} } };
globalThis.CONFIG ??= { SWSE: {}, Actor: {}, Item: {}, statusEffects: [] };
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = { callAll() {}, on() {}, once() {}, off() {} };
globalThis.ChatMessage = { getSpeaker: () => ({}), create: async () => ({}) };

const F = await import('./helpers/ready-weapon-fixture.mjs');
await F.installReadinessEnvironment();
const A_ = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
const { isWeaponReadied } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js');
const { requestWithPostureChoices } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/weapon-posture-choice-dialog.js');
const { PanelContextBuilder } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js');
const { buildConceptSheetViewModel } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/concept-context.js');
const { SWSEV2CharacterLikeSheet } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-like-sheet.js');
const { installCoordinatorHarness } = await import('./helpers/equipment-coordinator-harness.mjs');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const quiet = (fn) => async (...a) => { const l = console.log; const w = console.warn; const e = console.error; console.log = console.warn = console.error = () => {}; try { return await fn(...a); } finally { console.log = l; console.warn = w; console.error = e; } };

// ---- persistence + the counted stubs (dice, chat, action economy) ----
installCoordinatorHarness(ActorEngine);
const c = { rolls: 0, chat: 0, spends: [] };
RollEngine.safeRoll = async (f) => { c.rolls += 1; return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
SWSEChat.postRoll = async () => { c.chat += 1; return {}; };
ActionEconomyConsumption.spend = async (_a, type, meta) => { c.spends.push({ type, source: meta?.source ?? null }); return { allowed: true, committed: true, rollback: async () => {} }; };
AmmoSystem.isTrackingEnabled = () => true; // the optional ammunition-tracking house rule is ON for this table
ActorEngine.createEmbeddedDocuments = async (actor, name, data) => { const made = data.map((d, i) => ({ id: d._id ?? `new${i}`, ...JSON.parse(JSON.stringify(d)), actor })); actor.items.push(...made); return made; };
ActorEngine.deleteEmbeddedDocuments = async (actor, name, ids) => { for (const id of ids) actor.items.splice(actor.items.findIndex((i) => i.id === id), 1); return ids; };

const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const PROF = [{ id: 'pf0', type: 'feat', name: 'Weapon Proficiency (Pistols)', flags: {}, system: {} }];
const items = [...PROF]; items.get = (id) => items.find((i) => i.id === id); items.filter = Array.prototype.filter.bind(items);
const actor = { id: 'a1', name: 'Tester', type: 'character', flags: { swse: {} }, effects: [], items, getFlag() { return undefined; }, getRollData() { return {}; },
  system: { species: 'Human', size: 'Medium', bab: 6, level: 6, attributes: { str: ab(0), dex: ab(3), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 }, weaponProficiencies: ['pistols'] } };
for (const i of items) i.actor = actor;
const target = { id: 't1', name: 'Dummy', type: 'npc', flags: { swse: {} }, effects: [], items: Object.assign([], { get: () => null }), getFlag() { return undefined; }, system: { size: 'medium', hp: { value: 30, max: 30 }, conditionTrack: { current: 0 }, derived: { defenses: { reflex: { total: 12 }, fortitude: { total: 12 }, will: { total: 10 } } } } };
const attack = quiet((w) => A_.rollAttack(actor, w, { suppressChat: true, target }));
const quietSync = (fn) => (...a) => { const l = console.log; const w = console.warn; const e = console.error; console.log = console.warn = console.error = () => {}; try { return fn(...a); } finally { console.log = l; console.warn = w; console.error = e; } };
const view = quietSync(() => { const vm = buildConceptSheetViewModel({ actor, inventoryPanel: new PanelContextBuilder(actor, { isEditable: true }).buildInventoryPanel() }); for (const g of vm.gear.groups) for (const e of g.entries) if (e.id === 'bp') return e.weaponReadiness; return null; });
const ammo = () => actor.items.get('bp').system.ammunition.current;
const sheet = Object.create(SWSEV2CharacterLikeSheet.prototype, { actor: { value: actor }, requestSurfaceRender: { value: async () => {} } });

{
  // acquire: the blaster arrives as a new owned Item with no posture record (STOWED until the first coordinator write)
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', [{ _id: 'bp', name: 'Blaster Pistol', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: F.PISTOL_KEY } } }, system: { ammunition: { current: 2, max: 2 } } }]);
  const w = actor.items.get('bp');
  assert.ok(w); assert.equal(isWeaponReadied(actor, 'bp'), false);
  const v = view(); assert.equal(v.drawn, false); assert.equal(v.drawStowLabel, 'Draw');
  assert.equal(await attack(w), null, 'a stowed weapon cannot attack'); assert.equal(c.rolls, 0); assert.equal(ammo(), 2, 'nothing spent');
  ok('1: an acquired weapon has no posture yet: sheet offers Draw, attack is refused with nothing rolled or spent');
}
{
  // declining the set-up changes nothing
  const r = await requestWithPostureChoices(actor.items.get('bp'), () => InventoryEngine.toggleWeaponReadied(actor, 'bp'), () => assert.fail('no draw'),
    { initialize: () => assert.fail('no set-up'), confirmInitialize: async () => false });
  assert.equal(r.cancelled, true); assert.equal(actor.items.get('bp').system.weaponPosture, undefined); assert.equal(c.spends.length, 0);
  const src = (await import('node:fs')).readFileSync('scripts/sheets/v2/character-like-sheet.js', 'utf8');
  assert.equal((src.match(/initialize: \(\) => InventoryEngine\.requestWeaponPosture\(this\.actor, \{ type: "stow", itemId \}\)/g) ?? []).length, 2, 'both sheet draw buttons offer the set-up');
  ok('1b: an unrecorded weapon is never given a posture without the user confirming; declining writes nothing');
}
{
  // draw from the sheet: CHOICE_REQUIRED -> hands/grip -> committed with the same request id
  let firstId = null; let confirmed = 0;
  const r = await requestWithPostureChoices(actor.items.get('bp'),
    async () => { const x = await InventoryEngine.toggleWeaponReadied(actor, 'bp'); firstId = x.requestId; return x; },
    (choice) => InventoryEngine.setWeaponReadied(actor, 'bp', true, choice),
    { initialize: () => InventoryEngine.requestWeaponPosture(actor, { type: 'stow', itemId: 'bp' }), confirmInitialize: async () => { confirmed += 1; return true; },
      prompt: async (_i, choices) => { assert.deepEqual(choices.map((x) => x.id), ['appendageIds', 'grip']); return { appendageIds: ['natural-arm-1'], grip: 'one-handed' }; } });
  assert.equal(confirmed, 1, 'the unrecorded weapon is set up only after the user confirms');
  assert.equal(r.status, 'COMMITTED', r.message); assert.equal(r.requestId, firstId, 'the choice follow-up keeps the draw request id');
  assert.equal(isWeaponReadied(actor, 'bp'), true);
  const v = view(); assert.equal(v.drawn, true, 'the sheet shows the drawn weapon'); assert.equal(v.ready, true); assert.equal(v.drawStowLabel, 'Stow');
  assert.deepEqual(c.spends.map((s) => s.type), ['move'], 'draw costs one Move action');
  ok('2: Draw from the sheet: choice dialog -> READIED (verified), one Move action, sheet now shows Drawn/Stow');
}
{
  // attack spends ammunition through the existing authority; an empty weapon is refused
  const w = actor.items.get('bp');
  assert.ok(await attack(w), 'first shot'); assert.equal(ammo(), 1);
  assert.ok(await attack(w), 'second shot'); assert.equal(ammo(), 0);
  const rolls = c.rolls;
  assert.equal(await attack(w), null, 'no ammunition left'); assert.equal(c.rolls, rolls, 'nothing rolled'); assert.equal(ammo(), 0);
  ok('3: attacks roll and spend one round each; an empty weapon is refused before rolling');
}
{
  // the sheet Reload workflow (production method) finds the drawn weapon without an explicit id and refills it
  const before = c.spends.length;
  const res = await quiet(() => SWSEV2CharacterLikeSheet.prototype._executeReloadCombatWorkflow.call(sheet, { action: { id: 'reload' } }, {}))();
  assert.ok(res?.success !== false && res, JSON.stringify(res) + JSON.stringify(notes.warn));
  assert.equal(ammo(), 2, 'reloaded to full'); assert.equal(c.spends.length, before + 1, 'reload spends its action');
  assert.ok(await attack(actor.items.get('bp')), 'can fire again'); assert.equal(ammo(), 1);
  ok('4: sheet Reload picks the drawn weapon, refills it, spends its action; firing resumes');
}
{
  // stow: posture back to STOWED, attack refused, then release (remove) the item
  const r = await InventoryEngine.toggleWeaponReadied(actor, 'bp');
  assert.equal(r.status, 'COMMITTED'); assert.equal(isWeaponReadied(actor, 'bp'), false);
  const v = view(); assert.equal(v.drawn, false); assert.equal(v.drawStowLabel, 'Draw');
  assert.equal(await attack(actor.items.get('bp')), null, 'a stowed weapon cannot attack');
  await InventoryEngine.removeItem(actor, 'bp');
  assert.equal(actor.items.get('bp'), undefined, 'removed');
  ok('5: Stow -> STOWED (sheet shows Draw), attack refused; the item can then be removed');
}
{
  // a weapon whose draw did not finish cannot be removed until a GM resolves it
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', [{ _id: 'bp2', name: 'Blaster Pistol', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: F.PISTOL_KEY } } }, system: { ammunition: { current: 2, max: 2 } } }]);
  assert.equal((await InventoryEngine.requestWeaponPosture(actor, { type: 'stow', itemId: 'bp2' })).status, 'COMMITTED');
  let calls = 0;
  const fenced = await InventoryEngine.setWeaponReadied(actor, 'bp2', true, { appendageIds: ['natural-arm-1'], grip: 'one-handed', deps: { fence: async () => (++calls < 3) } });
  assert.equal(fenced.status, 'EXECUTOR_FENCED');
  const refused = await InventoryEngine.removeItem(actor, 'bp2');
  assert.equal(refused.reason, 'unresolved-equipment-transaction'); assert.ok(actor.items.get('bp2'), 'the item and its evidence stay');
  assert.ok(notes.warn.some((m) => /GM must resolve/.test(m)));
  ok('6: an unfinished equipment change blocks removing the item (the evidence stays for G36)');
}
{
  // a legacy weapon (equipped marker, no record) is not treated as drawn by the entry points; the sheet asks before recording it as stowed
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', [{ _id: 'lg', name: 'Old Blaster', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: F.PISTOL_KEY } } }, system: { equipped: true } }]);
  const before = c.spends.length; let asked = 0;
  const r = await requestWithPostureChoices(actor.items.get('lg'), () => InventoryEngine.toggleWeaponReadied(actor, 'lg'), () => assert.fail('declined'),
    { initialize: () => assert.fail('declined'), confirmInitialize: async () => { asked += 1; return false; } });
  assert.equal(asked, 1); assert.equal(r.cancelled, true); assert.equal(actor.items.get('lg').system.weaponPosture, undefined); assert.equal(c.spends.length, before);
  ok('7: a legacy unrecorded weapon also needs the explicit set-up; declining writes and spends nothing');
}
console.log(`equipment-lifecycle-slice: ${n} checks ok`);
