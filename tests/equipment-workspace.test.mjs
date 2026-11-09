import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Equipment workspace (Gear tab): the view model, placement assessment and listeners are PRESENTATION over the existing equipment authorities.
// Real engines (reader, grip/occupancy resolvers, coordinator plan, InventoryEngine) run against an in-memory actor; nothing here re-implements a rule.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {};
globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {}, DialogV2: class {} };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { readCombatReadiness } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js');
const { buildEquipmentWorkspace, categoryOfRow, artOf } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/equipment-workspace-context.js');
const P = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/equipment-workspace-placement.js');
const { installCoordinatorHarness, REC } = await import('./helpers/equipment-coordinator-harness.mjs');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const h = installCoordinatorHarness(ActorEngine);
const mkActor = (items) => { items.get = (id) => items.find((i) => i.id === id); const a = { id: 'a', type: 'character', img: 'portrait.webp', items, system: { size: 'Medium' }, flags: { swse: {} } }; for (const i of items) i.actor = a; return a; };
const saber = (id, name = 'Blade') => ({ id, name, type: 'weapon', img: 'saber.webp', flags: { swse: { canonicalWeapon: { identityKey: 'lightsaber-chassis-archaic-lightsaber' } } }, system: { activated: false, subtype: 'lightsaber', weaponCategory: 'lightsaber', ...REC('STOWED', null, []) } });
const armor = (id) => ({ id, name: 'Armor', type: 'armor', system: { equipped: true } });
const spends = [];
const deps = { ...h.deps, isGm: () => true, ledger: new Map(), resolveActionCost: async () => 'move', isLightsaber: async () => false,
  spendAction: async (_a, type, meta) => { spends.push({ type, meta }); return { allowed: true, committed: true }; }, spendMarkerPresent: async () => false };

const rowOf = (item) => ({ id: item.id, name: item.name, img: item.img, type: item.type, typeLabel: item.type, quantity: 1, weight: 1, value: 0, tags: [], equipped: item.system.equipped === true, isLightsaber: item.type === 'weapon', canEdit: true });
const groupsOf = (actor) => [{ id: 'all', entries: Array.from(actor.items).map(rowOf) }];
const vmOf = (actor, extra = {}) => buildEquipmentWorkspace(actor, { groups: groupsOf(actor), readiness: readCombatReadiness(actor, { resolveSpecies: h.deps.resolveSpecies }), isGM: true, ...extra });

// 1. slots come from anatomy; categories from resolved row flags; nothing invented
{
  const bare = saber('s3', 'Unrecorded'); delete bare.system.weaponPosture; delete bare.system.weaponOccupancy;
  const a = mkActor([saber('s1'), saber('s2', 'Second'), bare, armor('ar')]);
  const vm = vmOf(a);
  assert.equal(vm.available, true);
  assert.ok(vm.slots.length >= 2, 'anatomy supplies appendage slots');
  assert.deepEqual(vm.slots.map((s) => s.id), readCombatReadiness(a, { resolveSpecies: h.deps.resolveSpecies }).state.anatomy.appendages.map((x) => x.id), 'one slot per authoritative appendage, same order');
  assert.ok(vm.slots.every((s) => s.empty && s.occupant === null), 'no occupancy before anything is drawn');
  assert.equal(vm.items.find((i) => i.id === 's1').category, 'weapons');
  assert.equal(vm.items.find((i) => i.id === 'ar').category, 'armor');
  assert.equal(vm.items.find((i) => i.id === 's1').status.label, 'Stowed');
  assert.equal(vm.items.find((i) => i.id === 's3').status.label, 'Not set up', 'an unrecorded weapon is not shown as stowed or drawn');
  assert.equal(vm.tabs.find((t) => t.id === 'weapons').count, 3);
  assert.equal(categoryOfRow({ type: 'armor', isEnergyShield: true }), 'shields');
  assert.equal(categoryOfRow({ type: 'equipment', isImplant: true }), 'implants');
  assert.equal(categoryOfRow({ type: 'equipment' }), 'gear');
}
ok('slots mirror the resolved anatomy; tabs/categories use resolved row flags; an unrecorded weapon is "Not set up"');

// 2. after a real draw the diagram shows the coordinator's occupancy, grip and posture
const actor = mkActor([saber('s1'), saber('s2', 'Second')]);
for (const id of ['s1', 's2']) await InventoryEngine.requestWeaponPosture(actor, { type: 'stow', itemId: id }, { deps });
const drawn = await InventoryEngine.requestWeaponPosture(actor, { type: 'ready', itemId: 's1', appendageIds: ['natural-arm-1'], grip: 'one-handed' }, { deps });
assert.equal(drawn.ok, true);
{
  const vm = vmOf(actor);
  const slot = vm.slots.find((s) => s.id === 'natural-arm-1');
  assert.equal(slot.empty, false); assert.equal(slot.occupant.itemId, 's1'); assert.equal(slot.occupant.purpose, 'wield'); assert.equal(slot.occupant.shared, false);
  const it = vm.items.find((i) => i.id === 's1');
  assert.equal(it.status.label, 'Drawn'); assert.equal(it.heldInLabel, 'Natural Arm 1'); assert.equal(it.attackReady, true);
  assert.equal(vm.items.find((i) => i.id === 's2').status.label, 'Stowed');
  assert.equal(vm.slots.find((s) => s.id === 'natural-arm-2').empty, true);
}
ok('after a coordinator draw: slot occupant, purpose, "Drawn", held-in and attack-ready come from the readiness authority');

// 3. placement assessment is the coordinator's read-only plan; it never writes
{
  const before = JSON.stringify(Array.from(actor.items).map(({ actor: _a, ...i }) => i)); const writes = h.log.itemWrites.length; const spent = spends.length;
  const free = await P.assessPlacement(actor, 's2', ['natural-arm-2'], { deps });
  const one = free.results.find((r) => r.grip === 'one-handed');
  assert.equal(one.verdict, P.PLACEMENT_VERDICT.AVAILABLE); assert.deepEqual(one.action, { actionType: 'move', direction: 'draw' });
  const two = free.results.find((r) => r.grip === 'two-handed');
  assert.notEqual(two.verdict, P.PLACEMENT_VERDICT.AVAILABLE, 'two hands cannot be satisfied by one named appendage: the authority, not the UI, says so');
  const taken = await P.assessPlacement(actor, 's2', ['natural-arm-1'], { deps });
  const clash = taken.results.find((r) => r.grip === 'one-handed');
  assert.equal(clash.verdict, P.PLACEMENT_VERDICT.REQUIRES_CHANGE); assert.ok(clash.blockingItemIds.includes('s1'), 'the colliding weapon is named by the coordinator');
  const moved = await P.assessPlacement(actor, 's1', ['natural-arm-2'], { deps });
  assert.equal(moved.results[0].verdict, P.PLACEMENT_VERDICT.DEFERRED); assert.equal(moved.results[0].decisionId, 'EQ-001', 'changing a drawn weapon is a pending rules decision, surfaced not guessed');
  assert.equal(JSON.stringify(Array.from(actor.items).map(({ actor: _a, ...i }) => i)), before); assert.equal(h.log.itemWrites.length, writes); assert.equal(spends.length, spent);
}
ok('available / requires-change / deferred (EQ-001) verdicts come from planEquipmentIntent; assessing writes and spends nothing');

// 4. submission = the same authority; a refusal changes nothing
{
  const spent = spends.length;
  h.setGm(false);
  const refused = await P.submitPlacement(actor, 's2', ['natural-arm-2'], 'one-handed', { deps: { ...deps, isGm: () => false } });
  assert.equal(refused.ok, false); assert.ok(refused.message, 'the engine message is surfaced');
  assert.equal(actor.items.get('s2').system.weaponPosture, 'STOWED'); assert.equal(spends.length, spent);
  h.setGm(true);
  const done = await P.submitPlacement(actor, 's2', ['natural-arm-2'], 'one-handed', { deps });
  assert.equal(done.ok, true);
  const vm = vmOf(actor);
  assert.equal(vm.slots.find((s) => s.id === 'natural-arm-2').occupant.itemId, 's2');
  assert.deepEqual(vm.items.filter((i) => i.effectivePosture === 'READIED').map((i) => i.id).sort(), ['s1', 's2']);
}
ok('placement submits through InventoryEngine.requestWeaponPosture: non-GM refused with no change, GM commit shows in both hands');

// 5. fail-closed notices come from the authorities
{
  const vm = vmOf(actor, { isGM: false });
  assert.ok(vm.notices.some((x) => /GM client/.test(x.text)), 'players are told draw/stow is executed on a GM client');
  const none = buildEquipmentWorkspace(mkActor([]), { groups: [], readiness: { state: null }, isGM: true });
  assert.equal(none.available, false); assert.equal(none.slots.length, 0); assert.ok(none.notices.length);
}
ok('unreadable state and non-GM clients produce honest notices, not working-looking controls');

// 6. static guarantees: no rule logic, no writes, no hardcoded humanoid hands; every control maps to a real handler
{
  const files = ['equipment-workspace-context.js', 'equipment-workspace-placement.js', 'equipment-workspace-ui.js'].map((f) => [f, fs.readFileSync(`scripts/sheets/v2/character-sheet/${f}`, 'utf8')]);
  for (const [f, src] of files) {
    assert.ok(!/ActorEngine|\.update\(|setFlag|unsetFlag|updateEmbeddedDocuments|updateOwnedItems/.test(src), `${f} writes no document`);
    assert.ok(!/Right Hand|Left Hand|right-hand|left-hand|'two-handed'\s*\?\s*2/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), `${f} hardcodes no hand layout or grip arithmetic`);
  }
  const tpl = fs.readFileSync('templates/actors/character/v2-concept/partials/panels/equipment-workspace.hbs', 'utf8');
  const sheet = fs.readFileSync('scripts/sheets/v2/character-like-sheet.js', 'utf8') + fs.readFileSync('scripts/sheets/v2/character-sheet/combat-ui.js', 'utf8');
  const ui = files.find(([f]) => f.endsWith('-ui.js'))[1];
  for (const a of new Set([...tpl.matchAll(/data-action="([a-z-]+)"/g)].map((m) => m[1]))) assert.ok(sheet.includes(`"${a}"`) || sheet.includes(`'${a}'`) || sheet.includes(`[data-action="${a}"]`), `data-action ${a} has a sheet handler`);
  const slotTpl = fs.readFileSync('templates/actors/character/v2-concept/partials/panels/equipment-slot.hbs', 'utf8');
  for (const a of new Set([...(tpl + slotTpl).matchAll(/<button[^>]*?data-eqw-([a-z-]+)/gs)].map((m) => m[1]))) assert.ok(ui.includes(`data-eqw-${a}`) || ui.includes(`eqw${a[0].toUpperCase()}${a.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`), `data-eqw-${a} is handled`);
  const gearTab = fs.readFileSync('templates/actors/character/v2-concept/partials/tabs/gear-tab.hbs', 'utf8');
  assert.ok(gearTab.includes('equipment-workspace.hbs') && !gearTab.includes('Equipped Loadout'), 'the retired loadout/ledger sections are gone from the Gear tab');
  const preload = fs.readFileSync('scripts/load-templates.js', 'utf8');
  for (const p of ['equipment-workspace.hbs', 'equipment-slot.hbs', 'equipment-art.hbs']) assert.ok(preload.includes(p), `${p} is preloaded`);
  assert.ok(JSON.parse(fs.readFileSync('system.json', 'utf8')).styles.includes('styles/sheets/equipment-workspace.css'));
}
ok('static: no document writes, no hardcoded hand layout, every template control has a handler, retired panels removed, assets registered');

// 7. presentation: artwork fallback, shared-grip display and theme integration are display-only and follow the authorities
{
  assert.deepEqual(artOf('icons/svg/sword.svg', 'fa-gun'), { src: null, glyph: 'fa-gun' }, 'Foundry core placeholder art shows the themed glyph');
  assert.deepEqual(artOf('/images/icons/svg/mystery-man.svg', 'fa-gun').src, null);
  assert.equal(artOf('', 'fa-gun').src, null);
  assert.equal(artOf('worlds/x/blaster.webp', 'fa-gun').src, 'worlds/x/blaster.webp', 'real artwork is kept');
  const row = fs.readFileSync('scripts/sheets/v2/context/RowTransformers.js', 'utf8');
  assert.ok(!row.includes('/images/icons/svg/'), 'row defaults use Foundry\'s real core icon path');

  const a = mkActor([saber('t1', 'Twin Blade'), armor('arm')]);
  const deps = { ...h.deps, isGm: () => true, ledger: new Map(), resolveActionCost: async () => 'move', isLightsaber: async () => false, spendAction: async () => ({ allowed: true, committed: true }), spendMarkerPresent: async () => false };
  await InventoryEngine.requestWeaponPosture(a, { type: 'stow', itemId: 't1' }, { deps });
  const two = await InventoryEngine.requestWeaponPosture(a, { type: 'ready', itemId: 't1', appendageIds: ['natural-arm-1', 'natural-arm-2'], grip: 'two-handed' }, { deps });
  assert.equal(two.ok, true, 'the authority commits the two-appendage grip');
  const vm = buildEquipmentWorkspace(a, { groups: [{ entries: [{ id: 't1', name: 'Twin Blade', type: 'weapon', img: 'icons/svg/sword.svg', isLightsaber: true }, { id: 'arm', name: 'Armor', type: 'armor', equipped: true }] }], isGM: true, readiness: readCombatReadiness(a, { resolveSpecies: h.deps.resolveSpecies }) });
  const held = vm.slots.filter((s) => s.occupant?.itemId === 't1');
  assert.equal(held.length, 2, 'both appendages named by the occupancy assignment show the item');
  assert.ok(held.every((s) => s.occupant.shared && s.occupant.withSlotLabels.length > 0), 'each slot names its grip partner');
  assert.equal(held.filter((s) => s.occupant.isAnchor).length, 1, 'a multi-appendage item is shown in full on exactly one anchor socket (never duplicated)');
  assert.equal(held.find((s) => s.occupant.isAnchor).id, 'natural-arm-1', 'the anchor is the first appendage in the assignment order');
  assert.equal(vm.heldCount, 1);
  assert.equal(vm.protection.armor.item.id, 'arm'); assert.equal(vm.protection.shield.item, null, 'armor and shield are independent positions');
  assert.equal(held[0].occupant.art.glyph, 'fa-jedi'); assert.equal(held[0].occupant.art.src, null);
  assert.ok(vm.tabs.every((t) => /^fa-/.test(t.icon)));
  const css = fs.readFileSync('styles/sheets/equipment-workspace.css', 'utf8');
  const ws2 = buildEquipmentWorkspace(a, { groups: [{ entries: [{ id: 'arm', name: 'Armor', type: 'armor', equipped: true }, { id: 'sh', name: 'Shield', type: 'armor', equipped: true, isEnergyShield: true, activated: true }] }], isGM: true, readiness: readCombatReadiness(a, { resolveSpecies: h.deps.resolveSpecies }) });
  assert.equal(ws2.protection.armor.item.id, 'arm'); assert.equal(ws2.protection.shield.item.id, 'sh', 'armor and an energy shield are shown at the same time');
  assert.equal(ws2.items.find((i) => i.id === 'sh').typeLabel, 'Personal shield', 'an energy shield is labelled as a personal shield');
  assert.equal(ws2.items.find((i) => i.id === 'sh').category, 'shields'); assert.equal(ws2.items.find((i) => i.id === 'arm').category, 'armor');
  const wsU = buildEquipmentWorkspace(a, { groups: [], isGM: true, readiness: readCombatReadiness(a, { resolveSpecies: h.deps.resolveSpecies }), unarmed: { name: 'Unarmed Strike', attackTotal: 3, damageFormula: '1d4' } });
  assert.deepEqual(wsU.unarmed, { name: 'Unarmed Strike', attackLabel: '+3', damageLabel: '1d4' }, 'the always-available unarmed attack is surfaced from the sheet entry');
  assert.ok(fs.readFileSync('templates/actors/character/v2-concept/partials/panels/equipment-workspace.hbs', 'utf8').includes('data-action="roll-unarmed-attack"'), 'unarmed attack keeps its Gear-tab roll control');
  const tplA = fs.readFileSync('templates/actors/character/v2-concept/partials/panels/equipment-workspace.hbs', 'utf8');
  assert.ok(tplA.includes('data-eqw-station="armor"') && tplA.includes('data-eqw-station="shields"'), 'armor and shield have separate positions');
  const gearTab2 = fs.readFileSync('templates/actors/character/v2-concept/partials/tabs/gear-tab.hbs', 'utf8');
  for (const k of ['name="system.credits"', 'data-action="add-item"', 'conceptLayout.gear.totalItems', 'conceptLayout.gear.hasUpgradeableItems']) assert.ok(gearTab2.includes(k), `summary strip keeps ${k}`);
  for (const t of ['--vapor-cyan', '--ink', '--screen', '--swse-concept-accent', '--swse-concept-ink', 'prefers-reduced-motion']) assert.ok(css.includes(t), `workspace CSS reads ${t}`);
  assert.ok(!/--swse-concept-(?:line|text)\b/.test(css), 'no stop-gap token aliases');
}
ok('presentation: art fallback, shared-grip display and theme tokens are display-only and authority-driven');

console.log(`equipment-workspace: ${n} checks ok`);
