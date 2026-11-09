import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Equipment workspace parity: Character, Droid, NPC and Follower share ONE view-model assembly (buildActorEquipmentWorkspace) over the actor's own
// authorities. Actor-specific facts (anatomy, permissions) come from those authorities, never from the adapter.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {}; globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {}, DialogV2: class {} };
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { buildActorEquipmentWorkspace } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/concept-context.js');
const { readCombatReadiness } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js');
const { PanelContextBuilder } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js');
const { installCoordinatorHarness, REC } = await import('./helpers/equipment-coordinator-harness.mjs');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const h = installCoordinatorHarness(ActorEngine);

let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const saber = (id, name = 'Blade') => ({ id, name, type: 'weapon', system: { weight: 1.5, activated: false, subtype: 'lightsaber', weaponCategory: 'lightsaber', ...REC('STOWED', null, []) }, flags: { swse: { canonicalWeapon: { identityKey: 'lightsaber-chassis-archaic-lightsaber' } } } });
const gear = (id, name, type, system = {}) => ({ id, name, type, system: { weight: 1, ...system } });
const mk = (type, items, extra = {}) => { items.get = (id) => items.find((i) => i.id === id); const a = { id: `${type}-1`, type, img: 'p.webp', items, system: { size: 'Medium', ...(extra.system ?? {}) }, flags: { swse: { ...(extra.flags ?? {}) } } }; for (const i of items) i.actor = a; return a; };
const stock = () => [saber('s1', 'Vibroblade'), gear('b1', 'Blaster Pistol', 'weapon'), gear('a1', 'Padded Armor', 'armor', { equipped: true }), gear('sh1', 'Energy Shield', 'armor', { equipped: false, shield: { isEnergyShield: true } }), gear('g1', 'Medpac', 'equipment', { quantity: 3 })];
const humanReady = (a) => readCombatReadiness(a, { resolveSpecies: h.deps.resolveSpecies });
const wsOf = (a, { editable = true, readiness } = {}) => {
  const inv = new PanelContextBuilder(a, { isEditable: editable }).buildInventoryPanel();
  return { inv, ws: buildActorEquipmentWorkspace(a, { inventoryPanel: inv, attacks: [], readiness: readiness ?? humanReady(a) }) };
};

// 1. one implementation: identical input -> identical view model, whatever the actor type
{
  const items = () => stock();
  const base = wsOf(mk('character', items()));
  const props = (w) => ({ tabs: w.tabs, entries: w.entries.map((e) => ({ k: e.key, t: e.tab, n: e.name, s: e.statusLabel })), protection: [w.protection.armor.item?.id, w.protection.shield.item?.id] });
  for (const t of ['npc', 'droid']) {
    const other = wsOf(mk(t, items()), { readiness: humanReady(mk(t, items())) });
    assert.deepEqual(props(other.ws), props(base.ws), `${t} view model equals the character's for the same inventory`);
  }
  assert.deepEqual(base.ws.tabs.map((x) => x.id), ['weapons', 'armor', 'shields', 'gear', 'droids', 'vehicles', 'all']);
  ok('Character / NPC / Droid inventories produce the same seven-tab view model through one assembly');
}

// 2. standard NPC: weapons, armor, shield, gear, then an empty inventory
{
  const npc = mk('npc', stock());
  const { ws } = wsOf(npc);
  const c = Object.fromEntries(ws.tabs.map((t) => [t.id, t.count]));
  assert.deepEqual({ w: c.weapons, a: c.armor, s: c.shields, g: c.gear, all: c.all }, { w: 2, a: 1, s: 1, g: 1, all: 5 });
  assert.equal(ws.protection.armor.item?.name, 'Padded Armor');
  const none = wsOf(mk('npc', [])).ws;
  assert.equal(none.hasEntries, false); assert.equal(none.tabs.length, 7); assert.ok(none.tabs.every((t) => t.count === 0));
  ok('NPC: weapons, armor, shield, gear classified; an empty NPC still yields all seven (empty) tabs');
}

// 3. Follower (an NPC-type actor): same workspace; permissions are the document's, not inferred from ownership links
{
  const follower = mk('npc', stock(), { flags: { follower: { ownerActorId: 'pc-1' } }, system: { follower: true } });
  follower.system.ownedBy = 'pc-1';
  const rw = wsOf(follower, { editable: true }).ws; const ro = wsOf(follower, { editable: false }).ws;
  assert.ok(rw.items.some((i) => i.canEdit === true && i.canDelete === true), 'editable sheet: edit/delete offered');
  assert.ok(ro.items.every((i) => i.canEdit === false && i.canDelete === false && i.canCustomize === false), 'read-only sheet: no edit, delete or customize, regardless of the owner link');
  assert.deepEqual(ro.items.map((i) => i.id).sort(), rw.items.map((i) => i.id).sort());
  ok('Follower: same items; write controls follow the sheet permission, never the owner/follower link');
}

// 4. Droid: unresolved anatomy never invents manipulators; integrated equipment is not forced into hands
{
  const droidItems = [{ id: 'itm_hand', type: 'droid-system', name: 'hand', system: { droidPartId: 'hand', integrated: true }, flags: {} }, saber('w1', 'Held Blade'), gear('iw', 'Integrated Blaster', 'weapon', { integrated: true })];
  const droid = mk('droid', droidItems);
  const ready = readCombatReadiness(droid, { resolveSpecies: () => ({ status: 'unavailable', reason: 'droid' }) });
  const { ws } = wsOf(droid, { readiness: ready });
  assert.equal(ws.hasSlots, false); assert.deepEqual(ws.slots, []); assert.equal(ws.manyAppendages, false);
  assert.ok(ws.notices.some((x) => /Anatomy is (partial|unresolved|missing)/i.test(x.text)), 'unresolved anatomy is stated, not hidden');
  assert.ok(ws.items.some((i) => i.id === 'w1') && ws.items.some((i) => i.id === 'iw'), 'owned weapons are still listed');
  assert.ok(!ws.items.some((i) => i.id === 'itm_hand'), 'an installed droid component is not an ordinary possession');
  ok('Droid with unestablished manipulators: zero slots, anatomy notice, installed components kept out of possessions');
}

// 5. Multi-armed droid: confirmed ledger appendages (explicit capabilities) become real slots; shared occupancy is the authority's
{
  const comp = (i) => ({ canonicalId: 'hand', definition: { slot: 'appendage', category: 'appendage', appendageType: 'hand', source: { canHold: true, canWield: true, canManipulate: true, features: [] } }, slot: 'appendage', category: 'appendage', installed: true, enabled: true, active: false, instanceId: `inst-${i}`, locationId: `loc-${i}`, primarySource: { kind: 'installedLedger' }, sources: [{ kind: 'installedLedger', installed: true, enabled: true }] });
  const droid = mk('droid', [saber('w1', 'Held Blade')]);
  const ready = readCombatReadiness(droid, { resolveSpecies: () => ({ status: 'unavailable', reason: 'droid' }), reader: { getInstalledComponents: () => ({ components: [1, 2, 3, 4].map(comp) }) } });
  const { ws } = wsOf(droid, { readiness: ready });
  assert.equal(ws.slots.length, 4, JSON.stringify(ws.notices)); assert.equal(ws.manyAppendages, true);
  assert.deepEqual(ws.slots.map((s) => s.id), ready.state.anatomy.appendages.map((a) => a.id));
  ok('Multi-armed droid: four ledger-confirmed manipulators become four slots in the authority\'s order');
}

// 6. static: NPC/Follower render the shared workspace, no second inventory list; shared builder everywhere; follower controls and tab access kept
{
  const npc = fs.readFileSync('templates/actors/npc/v2/partials/npc-concept-content.hbs', 'utf8');
  const gearTab = fs.readFileSync('templates/actors/character/v2-concept/partials/tabs/gear-tab.hbs', 'utf8');
  const ws = fs.readFileSync('templates/actors/character/v2-concept/partials/panels/equipment-workspace.hbs', 'utf8');
  assert.ok(npc.includes('equipment-workspace.hbs" workspace=npcConcept.workspace') && gearTab.includes('equipment-workspace.hbs" workspace=conceptLayout.gear.workspace'));
  assert.ok(ws.includes('{{#with workspace as |ws|}}') && !ws.includes('{{#with conceptLayout'), 'the partial takes its view model as an argument');
  assert.ok(!npc.includes('swse-npc-gear-row'), 'the flat NPC gear list is retired');
  assert.ok(npc.includes('swse-npc-card__header') && npc.includes('swse-npc-badges'), 'the gear card header (credits, follower Store injection point) is kept');
  assert.equal((npc.match(/equipment-workspace\.hbs/g) ?? []).length, 1, 'one workspace in the NPC template');
  const sheet = fs.readFileSync('scripts/sheets/v2/npc-actor-sheet.js', 'utf8');
  assert.ok(sheet.includes('buildActorEquipmentWorkspace(actor') && sheet.includes('npcConcept.workspace ='));
  const cx = fs.readFileSync('scripts/sheets/v2/character-sheet/concept-context.js', 'utf8');
  assert.equal((cx.match(/buildEquipmentWorkspace\(/g) ?? []).length, 1, 'exactly one call site of the low-level builder');
  assert.ok(fs.readFileSync('scripts/sheets/v2/npc/npc-sheet-helpers.js', 'utf8').includes('game.user?.isGM === true || actor?.isOwner === true'), 'an editing user always reaches the Gear tab');
  const shared = fs.readFileSync('scripts/sheets/v2/character-like-sheet.js', 'utf8');
  assert.ok(shared.includes('panelContexts,\n        combat'), 'the shared sheet passes hydrated panels to the NPC hook');
  assert.ok(!/ActorEngine|\.update\(|setFlag/.test(fs.readFileSync('scripts/sheets/v2/character-sheet/equipment-workspace-ui.js', 'utf8')));
  ok('static: NPC/Follower use the shared workspace partial (no legacy list), one low-level call site, Gear tab reachable for editors, follower header kept');
}
console.log(`equipment-actor-parity: ${n} checks ok`);
