import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Follower/NPC equipment parity. The retired follower hotfix put an Equip/Unequip button on `.swse-npc-gear-row` that called InventoryEngine.toggleEquip
// (weapons were already redirected to the equipment-state coordinator). The shared inspector's controls call the same authorities; nothing is duplicated.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {}; globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {}, DialogV2: class {} };
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { buildActorEquipmentWorkspace } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/concept-context.js');
const { PanelContextBuilder } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js');
const { readCombatReadiness } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/combat-readiness.js');
const { installCoordinatorHarness, REC } = await import('./helpers/equipment-coordinator-harness.mjs');
const h = installCoordinatorHarness(ActorEngine);

let n = 0; const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const setPath = (obj, path, value) => { const parts = path.split('.'); let node = obj; for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {}); node[parts.at(-1)] = value; };
const saber = (id) => ({ id, name: 'Training Saber', type: 'weapon', system: { weight: 1.5, activated: false, subtype: 'lightsaber', weaponCategory: 'lightsaber', ...REC('STOWED', null, []) }, flags: { swse: { canonicalWeapon: { identityKey: 'lightsaber-chassis-archaic-lightsaber' } } } });
const item = (id, name, type, system = {}) => ({ id, name, type, system: { weight: 1, equipped: false, ...system } });
function follower() {
  const items = [item('tool', 'Utility Belt', 'equipment'), item('a1', 'Padded Armor', 'armor'), item('a2', 'Heavy Armor', 'armor'), item('sh', 'Energy Shield', 'armor', { shield: { isEnergyShield: true } }), saber('w1')];
  items.get = (id) => items.find((i) => i.id === id);
  const a = { id: 'f1', type: 'npc', img: 'f.webp', items, system: { follower: true }, flags: { swse: { follower: { ownerActorId: 'pc' } } },
    updateEmbeddedDocuments: async (_k, ups) => { for (const u of ups) { const it = items.get(u._id); for (const [p, v] of Object.entries(u)) if (p !== '_id') setPath(it, p, v); } } };
  for (const i of items) i.actor = a; return a;
}
const equipped = (a, id) => a.items.get(id).system.equipped === true;
const view = (a, editable = true) => buildActorEquipmentWorkspace(a, { inventoryPanel: new PanelContextBuilder(a, { isEditable: editable }).buildInventoryPanel(), attacks: [], readiness: readCombatReadiness(a, { resolveSpecies: h.deps.resolveSpecies }) });

// 1. the inspector offers the same Equip/Unequip the hotfix button did, per item kind (semantics are not interchangeable)
{
  const ws = view(follower());
  const byId = Object.fromEntries(ws.items.map((i) => [i.id, i]));
  assert.equal(byId.tool.canToggleEquip, true); assert.equal(byId.tool.armorStats, null);
  assert.equal(byId.a1.canToggleEquip, true); assert.ok(byId.a1.armorStats, 'armor is presented as wear/remove');
  assert.equal(byId.sh.canToggleEquip, true); assert.equal(byId.sh.category, 'shields');
  assert.equal(byId.w1.canToggleEquip, false, 'a weapon has no free equip toggle'); assert.equal(byId.w1.weaponReadiness?.canDrawStow, true, 'it has the coordinator-backed Draw/Stow instead');
  const tpl = fs.readFileSync('templates/actors/character/v2-concept/partials/panels/equipment-workspace.hbs', 'utf8');
  assert.ok(tpl.includes('data-action="equip"') && tpl.includes('data-action="toggle-weapon-readiness"') && tpl.includes('data-action="toggle-activated"'));
  const sheet = fs.readFileSync('scripts/sheets/v2/character-like-sheet.js', 'utf8');
  assert.ok(/case "equip":\s*\n\s*await InventoryEngine\.toggleEquip\(this\.actor, itemId\);/.test(sheet), 'the inspector Equip control calls the same InventoryEngine.toggleEquip the old follower button called');
  ok('ordinary gear, armor, shield: equip controls present (same engine call as the old button); weapon: Draw/Stow instead of a free toggle');
}

// 2. behaviour through the real engine: equipment, body armor exclusivity, shield independence
{
  const f = follower();
  await InventoryEngine.toggleEquip(f, 'tool'); assert.equal(equipped(f, 'tool'), true);
  await InventoryEngine.toggleEquip(f, 'tool'); assert.equal(equipped(f, 'tool'), false);
  await InventoryEngine.toggleEquip(f, 'a1'); assert.equal(equipped(f, 'a1'), true);
  await InventoryEngine.toggleEquip(f, 'a2'); assert.equal(equipped(f, 'a2'), true); assert.equal(equipped(f, 'a1'), false, 'a second body armor replaces the first');
  await InventoryEngine.toggleEquip(f, 'sh'); assert.equal(equipped(f, 'sh'), true); assert.equal(equipped(f, 'a2'), true, 'a shield does not displace body armor');
  const ws = view(f); assert.equal(ws.protection.armor.item?.id, 'a2'); assert.equal(ws.protection.shield.item?.id, 'sh');
  await InventoryEngine.toggleEquip(f, 'sh'); assert.equal(equipped(f, 'sh'), false); assert.equal(equipped(f, 'a2'), true);
  ok('equip/unequip gear; wear/remove armor with body-armor exclusivity; shield independent of armor; loadout reflects it');
}

// 3. weapons: authorization is the coordinator's, identical for a follower (GM executes; a non-GM request is refused with no change and no spend)
{
  const spends = [];
  const deps = { ...h.deps, ledger: new Map(), resolveActionCost: async () => 'move', isLightsaber: async () => false, spendAction: async (_a, type, meta) => { spends.push({ type, meta }); return { allowed: true, committed: true }; }, spendMarkerPresent: async () => false };
  const f = follower();
  const refused = await InventoryEngine.toggleWeaponReadied(f, 'w1', { deps: { ...deps, isGm: () => false } });
  assert.equal(refused?.ok === true, false); assert.equal(f.items.get('w1').system.weaponPosture, 'STOWED'); assert.equal(spends.length, 0);
  const viaEquip = await InventoryEngine.toggleEquip(f, 'w1'); // the old follower button's path: redirected, never a legacy equipped flag
  assert.notEqual(f.items.get('w1').system.equipped, true, 'toggleEquip never writes a legacy equipped flag on a weapon'); assert.ok(!('equipped' in f.items.get('w1').system), 'no legacy field was created');
  ok('follower weapon Draw/Stow: non-GM refused, nothing changed or spent; the old Equip path still routes to the coordinator (no legacy flag)');
}

// 4. permissions: write controls follow the sheet permission exactly as for a character
{
  const rw = view(follower(), true); const ro = view(follower(), false);
  assert.ok(rw.items.every((i) => i.canEdit === true) && ro.items.every((i) => i.canEdit === false && i.canDelete === false && i.canCustomize === false));
  ok('read-only follower view hides edit/delete/customize; the equip engine calls stay behind ActorEngine/document permissions');
}

// 5. follower Store, progression and statblock surfaces preserved
{
  const npc = fs.readFileSync('templates/actors/npc/v2/partials/npc-concept-content.hbs', 'utf8');
  const hotfix = fs.readFileSync('scripts/patches/follower-npc-sheet-parity-hotfix.js', 'utf8');
  for (const sel of ['section.tab[data-tab="gear"]', '.swse-npc-card__header', '.swse-npc-badges']) assert.ok(hotfix.includes(sel), `hotfix still targets ${sel}`);
  assert.ok(/data-tab="gear"/.test(npc) && npc.includes('class="tab flexcol"') && npc.includes('swse-npc-card__header') && npc.includes('swse-npc-badges'), 'the template still provides every hook the Store injection needs');
  assert.ok(hotfix.includes("data-action = 'open-follower-store'") || hotfix.includes("'open-follower-store'"));
  for (const keep of ['npc-progression-panel.hbs', 'npc-owner-panel.hbs', 'npc-play-statblock-panel.hbs', 'npc-statblock-authority-panel.hbs', 'npc-relationships-panel.hbs']) assert.ok(npc.includes(keep), `${keep} still rendered`);
  assert.ok(fs.readFileSync('scripts/sheets/v2/npc-actor-sheet.js', 'utf8').includes('launchFollowerProgression'));
  assert.ok(!npc.includes('equip-follower-item') && !npc.includes('swse-npc-gear-row'), 'the retired row control is not duplicated');
  ok('Store hooks, progression, owner, statblock and relationship panels are intact; no duplicate equip handler');
}
console.log(`equipment-follower-capability-parity: ${n} checks ok`);
