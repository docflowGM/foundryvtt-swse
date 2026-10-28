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
const { getDefaultItemSystem } = await import('/systems/foundryvtt-swse/scripts/items/item-defaults.js');

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
// creation applies the type's system defaults the way Foundry merges template.json (WP1: an ordinary weapon is created STOWED); `raw: true` skips them
ActorEngine.createEmbeddedDocuments = async (actor, name, data, { raw = false } = {}) => { const made = data.map((d, i) => { const x = JSON.parse(JSON.stringify(d)); if (!raw) x.system = getDefaultItemSystem(x.type, x.system ?? {}); return { id: d._id ?? `new${i}`, ...x, actor }; }); actor.items.push(...made); return made; };
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
  // acquire: the blaster arrives with the WP1 creation default (STOWED, empty occupancy); no action is spent
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', [{ _id: 'bp', name: 'Blaster Pistol', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: F.PISTOL_KEY } } }, system: { ammunition: { current: 2, max: 2 } } }]);
  const w = actor.items.get('bp');
  assert.ok(w); assert.equal(w.system.weaponPosture, 'STOWED'); assert.equal(isWeaponReadied(actor, 'bp'), false);
  const v = view(); assert.equal(v.drawn, false); assert.equal(v.drawStowLabel, 'Draw');
  assert.equal(await attack(w), null, 'a stowed weapon cannot attack'); assert.equal(c.rolls, 0); assert.equal(ammo(), 2, 'nothing spent');
  ok('1: an acquired weapon is created STOWED: sheet offers Draw, attack is refused with nothing rolled or spent');
}
{
  // draw from the sheet: CHOICE_REQUIRED -> hands/grip -> committed with the same request id
  let firstId = null; let confirmed = 0;
  const r = await requestWithPostureChoices(actor.items.get('bp'),
    async () => { const x = await InventoryEngine.toggleWeaponReadied(actor, 'bp'); firstId = x.requestId; return x; },
    (choice) => InventoryEngine.setWeaponReadied(actor, 'bp', true, choice),
    { initialize: () => InventoryEngine.requestWeaponPosture(actor, { type: 'stow', itemId: 'bp' }), confirmInitialize: async () => { confirmed += 1; return true; },
      prompt: async (_i, choices) => { assert.deepEqual(choices.map((x) => x.id), ['appendageIds', 'grip']); return { appendageIds: ['natural-arm-1'], grip: 'one-handed' }; } });
  assert.equal(confirmed, 0, 'a correctly initialized new weapon is drawn directly (no set-up prompt)');
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
  let calls = 0;
  const fenced = await InventoryEngine.setWeaponReadied(actor, 'bp2', true, { appendageIds: ['natural-arm-1'], grip: 'one-handed', deps: { fence: async () => (++calls < 3) } });
  assert.equal(fenced.status, 'EXECUTOR_FENCED');
  const refused = await InventoryEngine.removeItem(actor, 'bp2');
  assert.equal(refused.reason, 'unresolved-equipment-transaction'); assert.ok(actor.items.get('bp2'), 'the item and its evidence stay');
  assert.ok(notes.warn.some((m) => /GM must resolve/.test(m)));
  ok('6: an unfinished equipment change blocks removing the item (the evidence stays for G36)');
}
{
  // R2: a weapon with NO posture record (created before the WP1 default; legacy equipped marker) is shown as "Not set up / Set up", never as
  // Stow; its click only records it as stowed after the user confirms (no draw, no action); declining writes nothing
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', [{ _id: 'lg', name: 'Old Blaster', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: F.PISTOL_KEY } } }, system: { equipped: true } }], { raw: true });
  const rowOf = quietSync((id) => { const vm = buildConceptSheetViewModel({ actor, inventoryPanel: new PanelContextBuilder(actor, { isEditable: true }).buildInventoryPanel() }); for (const g of vm.gear.groups) for (const e of g.entries) if (e.id === id) return e.weaponReadiness; return null; });
  let v = rowOf('lg');
  assert.equal(v.needsSetup, true); assert.equal(v.drawn, false); assert.equal(v.stateLabel, 'Not set up'); assert.equal(v.drawStowLabel, 'Set up'); assert.equal(v.canDrawAndIgnite, false);
  const before = c.spends.length;
  const click = (confirm) => requestWithPostureChoices(actor.items.get('lg'), () => InventoryEngine.toggleWeaponReadied(actor, 'lg'), () => assert.fail('set-up never draws'),
    { initialize: () => InventoryEngine.requestWeaponPosture(actor, { type: 'stow', itemId: 'lg' }), confirmInitialize: async () => confirm, prompt: async () => assert.fail('set-up never asks for hands') });
  const declined = await click(false);
  assert.equal(declined.cancelled, true); assert.equal(actor.items.get('lg').system.weaponPosture, undefined);
  const setUp = await click(true);
  assert.equal(setUp.setUp, true); assert.equal(setUp.status, 'COMMITTED'); assert.equal(actor.items.get('lg').system.weaponPosture, 'STOWED');
  assert.equal(c.spends.length, before, 'recording the position costs no action');
  v = rowOf('lg'); assert.equal(v.needsSetup, false); assert.equal(v.drawStowLabel, 'Draw');
  const src = (await import('node:fs')).readFileSync('scripts/sheets/v2/character-like-sheet.js', 'utf8');
  assert.equal((src.match(/initialize: \(\) => InventoryEngine\.requestWeaponPosture\(this\.actor, \{ type: "stow", itemId \}\)/g) ?? []).length, 2, 'both sheet draw buttons route set-up through the coordinator');
  ok('7: an unrecorded weapon shows "Set up"; the click only records it STOWED after confirmation (no draw, no action); then it shows Draw');
}
{
  // R1: a malformed equipment journal blocks weapon removal through InventoryEngine.removeItem; other items are still removable
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', [{ _id: 'bp3', name: 'Blaster Pistol', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: F.PISTOL_KEY } } }, system: {} }, { _id: 'med', name: 'Medpac', type: 'equipment', system: {} }]);
  const saved = actor.flags.swse.equipmentTxn;
  actor.flags.swse.equipmentTxn = { schemaVersion: 1, entries: 'garbage' };
  const refused = await InventoryEngine.removeItem(actor, 'bp3');
  assert.equal(refused.reason, 'equipment-journal-unreadable'); assert.ok(actor.items.get('bp3'), 'the weapon stays');
  assert.ok(notes.warn.some((m) => /journal is unreadable/.test(m)));
  await InventoryEngine.removeItem(actor, 'med'); assert.equal(actor.items.get('med'), undefined, 'a non-weapon item is still removable');
  actor.flags.swse.equipmentTxn = saved;
  await InventoryEngine.removeItem(actor, 'bp3'); assert.equal(actor.items.get('bp3'), undefined, 'with a readable journal and nothing pending, removal works');
  ok('8: an unreadable journal blocks removing weapons (this route only); valid-journal and non-weapon removals still work');
}
{
  // clean break: the attacks-panel rescue lists only READY weapons; an activated-but-stowed saber or a legacy `equipped: true` weapon is not an attack
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', [
    { _id: 'sab', name: 'Lightsaber', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: F.SABER_KEY } } }, system: { activated: true, active: true, damage: '2d8' } },
    { _id: 'old', name: 'Old Blaster', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: F.PISTOL_KEY } } }, system: { equipped: true, damage: '3d6' } },
    { _id: 'rdy', name: 'Blaster Pistol', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: F.PISTOL_KEY } } }, system: { damage: '3d6' } },
  ]);
  assert.equal((await InventoryEngine.setWeaponReadied(actor, 'rdy', true, { appendageIds: ['natural-arm-2'], grip: 'one-handed' })).status, 'COMMITTED');
  const listed = quietSync(() => SWSEV2CharacterLikeSheet.prototype._buildAttacksFallback.call({}, actor, {}))().map((a) => a.weaponId).filter((id) => ['sab', 'old', 'rdy'].includes(id));
  assert.deepEqual(listed, ['rdy']);
  ok('9: attack rows come from the readiness authority only (no rows for stowed-but-activated or legacy-equipped weapons)');
}
console.log(`equipment-lifecycle-slice: ${n} checks ok`);
