import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Post-#1019 correction: drives the REAL production path (PanelContextBuilder.buildInventoryPanel ->
// buildConceptSheetViewModel -> template-facing views) and the real InventoryEngine, not template strings.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
// PanelContextBuilder's import graph reaches ApplicationV2 base classes; stub only the class shells (no rendering is exercised).
globalThis.foundry ??= {};
globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {}, DialogV2: class {} };

const { PanelContextBuilder } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js');
const { buildConceptSheetViewModel } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/concept-context.js');
const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { isItemEquipped } = await import('/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js');
const { isItemActivated } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/item-activation-state.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);

const spent = []; let allow = true;
ActionEconomyConsumption.spend = async (_a, type) => { if (!allow) return { allowed: false }; spent.push(type); return { allowed: true }; };
ActorEngine.updateOwnedItems = async (actor, updates) => {
  for (const patch of updates) {
    const item = actor.items.get(patch._id);
    for (const [k, v] of Object.entries(patch)) {
      if (k === '_id') continue;
      const parts = k.split('.'); let node = item;
      for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {});
      node[parts.at(-1)] = v;
    }
  }
};

const mkActor = (items, extra = {}) => { items.get = (id) => items.find((i) => i.id === id); return { id: 'a', type: 'character', items, system: {}, flags: {}, ...extra }; };
const saber = (o = {}, id = 's1') => ({ id, name: 'Lightsaber', type: 'weapon', system: { equipped: false, activated: false, weaponCategory: 'lightsaber', subtype: 'lightsaber', ...o } });
const blaster = (o = {}, id = 'b1') => ({ id, name: 'Blaster Pistol', type: 'weapon', system: { equipped: false, ...o } });

/** the real production chain: panel builder -> concept view model */
function gearEntries(actor) {
  const inventoryPanel = new PanelContextBuilder(actor, { isEditable: true }).buildInventoryPanel();
  const vm = buildConceptSheetViewModel({ actor, inventoryPanel });
  const rows = new Map();
  for (const group of vm.gear?.groups ?? vm.inventory?.groups ?? findGroups(vm)) for (const e of group.entries) rows.set(e.id, e);
  return rows;
}
function findGroups(vm) {
  const stack = [vm];
  while (stack.length) {
    const v = stack.pop();
    if (v && typeof v === 'object') {
      if (Array.isArray(v.groups) && v.groups.some((g) => Array.isArray(g?.entries))) return v.groups;
      stack.push(...Object.values(v));
    }
  }
  return [];
}

{ // 1. hydration: stowed AND drawn rows both receive readiness views
  const a = mkActor([saber({}, 's1'), blaster({ equipped: true }, 'b1')]);
  const rows = gearEntries(a);
  assert.ok(rows.get('s1')?.weaponReadiness, 'stowed saber row hydrated');
  assert.equal(rows.get('s1').weaponReadiness.drawn, false);
  assert.equal(rows.get('s1').weaponReadiness.canDrawStow, true);
  assert.ok(rows.get('b1')?.weaponReadiness, 'drawn blaster row hydrated');
  assert.equal(rows.get('b1').weaponReadiness.drawn, true);
  assert.equal(rows.get('b1').weaponReadiness.drawStowLabel, 'Stow');
}
ok('production Gear ledger hydrates readiness for stowed and drawn weapons');

{ // 2. active saber: stow blocked in view and in engine
  const s = saber({ equipped: true, activated: true });
  const a = mkActor([s]);
  const r = gearEntries(a).get('s1').weaponReadiness;
  assert.equal(r.stowBlocked, true); assert.equal(r.activated, true);
  const res = await InventoryEngine.setWeaponReadied(a, 's1', false);
  assert.equal(res.ok, false); assert.equal(res.reason, 'deactivate-before-stowing'); assert.equal(s.system.equipped, true);
}
ok('active lightsaber stow is blocked in the production view and rejected by the engine');

{ // 3. legacy Equip control can no longer bypass action economy
  const b = blaster({ equipped: false }); const a = mkActor([b]); spent.length = 0;
  await InventoryEngine.toggleEquip(a, 'b1');
  assert.equal(b.system.equipped, true); assert.deepEqual(spent, ['move']);
  await InventoryEngine.toggleEquip(a, 'b1');
  assert.equal(b.system.equipped, false); assert.deepEqual(spent, ['move', 'move']);
  allow = false; spent.length = 0;
  await InventoryEngine.toggleEquip(a, 'b1');
  allow = true;
  assert.equal(b.system.equipped, false, 'failed spend: legacy Equip writes nothing');
}
ok('legacy toggleEquip on an ordinary weapon routes through Draw/Stow (Move) and writes nothing on failed spend');

{ // 4. natural weapons keep their exception (no action spent, no Draw/Stow)
  const nat = { id: 'n1', name: 'Claws', type: 'weapon', system: { equipped: false, naturalWeapon: true }, flags: { swse: { autoEquipped: true } } };
  const a = mkActor([nat]); spent.length = 0;
  await InventoryEngine.toggleEquip(a, 'n1');
  assert.deepEqual(spent, [], 'natural weapon never spends a draw/stow action');
}
ok('natural/auto-equipped weapons keep the legacy path (no action spent)');

{ // 5. legacy-shaped readiness: Stow clears every alias isItemEquipped reads
  for (const legacy of [{ active: true }, { readied: true }, { equippable: { equipped: true, active: true } }, { activation: { active: true } }, { isEquipped: true }]) {
    const b = blaster({ equipped: true, ...legacy }); const a = mkActor([b]);
    assert.equal(isItemEquipped(b, a), true);
    const r = await InventoryEngine.setWeaponReadied(a, 'b1', false);
    assert.equal(r.ok, true, JSON.stringify(legacy));
    assert.equal(isItemEquipped(b, a), false, `stowed reads stowed for ${JSON.stringify(legacy)}`);
    await InventoryEngine.setWeaponReadied(a, 'b1', true);
    assert.equal(isItemEquipped(b, a), true);
  }
}
ok('Draw/Stow reads and writes agree for legacy active/readied/equippable/activation/isEquipped shapes');

{ // 6. legacy system.active saber: deactivation actually deactivates
  const s = saber({ equipped: true, activated: true, active: true }); const a = mkActor([s]);
  assert.equal((await InventoryEngine.setActivated(a, 's1', false)).ok, true);
  assert.equal(isItemActivated(s), false);
  assert.equal((await InventoryEngine.setWeaponReadied(a, 's1', false)).ok, true);
  assert.equal(isItemEquipped(s, a), false);
}
ok('legacy system.active is mirrored on deactivation, so the saber can then be stowed');

// Quick Draw as the feat normalizer stores it (attack-options-feat-normalization-hooks.js drawWeaponSpeedMutation)
const quickDrawRule = {
  type: 'ACTION_SPEED_MUTATION', id: 'quickDraw', label: 'Quick Draw', source: 'Quick Draw', actionId: 'drawOrHolsterWeapon',
  aliases: ['draw', 'drawWeapon', 'holsterWeapon', 'drawOrHolster', 'drawOrReadyWeapon', 'readyWeapon'],
  baseActionCost: 'move', mutatedActionCost: 'swift', requiresWorkflowValidation: true,
  actionEconomy: { from: 'move', to: 'swift', spend: 'swift', workflowRequired: true },
  combinedEffects: [{ requiresFeat: 'Weapon Proficiency (Lightsabers)', actionId: 'drawAndIgniteLightsaber', actionCost: 'swift', advisoryOnly: true }]
};
const quickDrawFeat = () => ({ id: 'f1', name: 'Quick Draw', type: 'feat', system: { abilityMeta: { attackOptionRules: [quickDrawRule] } } });
const lightsaberProf = () => ({ id: 'f2', name: 'Weapon Proficiency (Lightsabers)', type: 'feat', system: {} });

{ // 7. Quick Draw: Draw and Stow cost Swift, not Move
  const b = blaster(); const a = mkActor([b, quickDrawFeat()]); spent.length = 0;
  await InventoryEngine.setWeaponReadied(a, 'b1', true);
  await InventoryEngine.setWeaponReadied(a, 'b1', false);
  assert.deepEqual(spent, ['swift', 'swift']);
}
ok('Quick Draw makes Draw/Stow a Swift via the existing action-speed metadata');

{ // 8. Draw & Ignite: one Swift, only with the combined effect; production view offers it
  const s = saber(); const plain = mkActor([s]); spent.length = 0;
  let r = await InventoryEngine.drawAndActivateLightsaber(plain, 's1');
  assert.equal(r.ok, false); assert.equal(spent.length, 0);
  assert.equal(gearEntries(plain).get('s1').weaponReadiness.canDrawAndIgnite, false);

  const s2 = saber(); const a = mkActor([s2, quickDrawFeat(), lightsaberProf()]);
  assert.equal(gearEntries(a).get('s1').weaponReadiness.canDrawAndIgnite, true);
  r = await InventoryEngine.drawAndActivateLightsaber(a, 's1');
  assert.equal(r.ok, true); assert.deepEqual(spent, ['swift'], 'ONE swift, not draw + activate');
  assert.equal(isItemEquipped(s2, a), true); assert.equal(isItemActivated(s2), true);
  assert.equal(gearEntries(a).get('s1').weaponReadiness.canDrawAndIgnite, false);
}
ok('Draw & Ignite: unavailable without the combined effect; with it, exactly one Swift draws and ignites');

{ // 9. alternate weapons: no lightsaber activation affordance
  const sword = { id: 'ss', name: 'Sith Sword', type: 'weapon', system: { equipped: true } };
  const a = mkActor([sword]);
  const r = gearEntries(a).get('ss').weaponReadiness;
  assert.equal(r.isLightsaber, false); assert.equal(r.canToggleActivated, false); assert.equal(r.canDrawAndIgnite, false);
}
ok('non-lightsaber weapons expose Draw/Stow but no lightsaber activation');

console.log(`Weapon readiness production path: ${n} checks passed.`);
