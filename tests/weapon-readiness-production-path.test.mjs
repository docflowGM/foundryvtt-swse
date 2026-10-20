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

const { installCoordinatorHarness, REC } = await import('./helpers/equipment-coordinator-harness.mjs');
const spent = []; let allow = true;
ActionEconomyConsumption.spend = async (_a, type) => { if (!allow) return { allowed: false }; spent.push(type); return { allowed: true, committed: true }; };
const harness = installCoordinatorHarness(ActorEngine);
const opts = { deps: harness.deps };

const mkActor = (items, extra = {}) => { items.get = (id) => items.find((i) => i.id === id); const a = { id: 'a', type: 'character', items, system: {}, flags: {}, ...extra }; for (const i of items) i.actor = a; return a; }; // owned Items carry .actor
const saber = (o = {}, id = 's1') => ({ id, name: 'Lightsaber', type: 'weapon', system: { equipped: false, activated: false, weaponCategory: 'lightsaber', subtype: 'lightsaber', ...o } });
const blaster = (o = {}, id = 'b1') => ({ id, name: 'Blaster Pistol', type: 'weapon', system: { equipped: false, ...o } });

/** the real production chain: panel builder -> concept view model (explicit vm.gear paths) */
function gearVm(actor) {
  const inventoryPanel = new PanelContextBuilder(actor, { isEditable: true }).buildInventoryPanel();
  const vm = buildConceptSheetViewModel({ actor, inventoryPanel });
  assert.ok(Array.isArray(vm.gear?.groups), 'vm.gear.groups exists');
  return vm.gear;
}
function gearEntries(actor) {
  const rows = new Map();
  for (const group of gearVm(actor).groups) for (const e of group.entries) rows.set(e.id, e);
  return rows;
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
  const s = saber({ equipped: true, activated: true, ...REC('EQUIPPED', 'hold', ['natural-arm-1']) });
  const a = mkActor([s]);
  const r = gearEntries(a).get('s1').weaponReadiness;
  assert.equal(r.stowBlocked, true); assert.equal(r.activated, true);
  const res = await InventoryEngine.setWeaponReadied(a, 's1', false, opts);
  assert.equal(res.ok, false); assert.equal(res.reason, 'deactivate-before-stowing'); assert.equal(s.system.weaponPosture, 'EQUIPPED');
}
ok('active lightsaber stow is blocked in the production view and rejected by the engine (coordinator plan)');

{ // 3. legacy Equip control routes through the coordinator and can no longer bypass action economy
  const b = blaster({ ...REC('EQUIPPED', 'hold', ['natural-arm-1']) }); const a = mkActor([b]); spent.length = 0;
  await InventoryEngine.toggleEquip(a, 'b1');
  assert.equal(b.system.weaponPosture, 'STOWED'); assert.deepEqual(spent, ['move']);
  assert.equal(b.system.equipped, false, 'the retired alias is never written (fixture value untouched)');
  const r = await InventoryEngine.toggleEquip(a, 'b1');
  assert.equal(r.ok, false); assert.equal(r.status, 'CHOICE_REQUIRED');
  assert.equal(b.system.weaponPosture, 'STOWED'); assert.deepEqual(spent, ['move'], 'a draw without explicit appendages spends nothing');
  const w = harness.log.itemWrites.length;
  harness.setGm(false);
  const denied = await InventoryEngine.requestWeaponPosture(a, { type: 'equip', itemId: 'b1', purpose: 'hold', appendageIds: ['natural-arm-1'] }, opts);
  harness.setGm(true);
  assert.equal(denied.ok, false); assert.equal(denied.status, 'REJECTED_NOT_GM'); assert.equal(harness.log.itemWrites.length, w); assert.deepEqual(spent, ['move']);
}
ok('legacy toggleEquip on an ordinary weapon routes through the coordinator (stow = Move; draw = CHOICE_REQUIRED) and a non-GM client writes and spends nothing');

{ // 4. natural / integrated weapons: identity is not certified, the coordinator refuses and writes nothing
  const nat = { id: 'n1', name: 'Claws', type: 'weapon', system: { equipped: false, naturalWeapon: true, ...REC('STOWED', null, []) }, flags: { swse: { isNaturalWeapon: true, alwaysArmed: true, autoEquipped: true } } };
  const integ = { id: 'i1', name: 'Integrated Blaster', type: 'weapon', system: { equipped: false, integrated: true, weaponCategory: 'pistols', ...REC('STOWED', null, []) } };
  for (const [item, actor, label] of [[nat, mkActor([nat]), 'natural'], [integ, mkActor([integ], { type: 'droid', system: { isDroid: true } }), 'integrated']]) {
    const before = JSON.stringify(item.system); spent.length = 0; const w = harness.log.itemWrites.length;
    assert.equal(isItemEquipped(item, actor), true, `${label} reads readied (legacy reader, migrated in a later work package)`);
    const gear = gearVm(actor);
    const row = gear.groups.flatMap((g) => g.entries).find((e) => e.id === item.id);
    assert.equal(row.weaponReadiness.alwaysReadied, true, `${label} flagged always-readied`);
    assert.equal(row.weaponReadiness.canDrawStow, false, `${label}: no Draw/Stow control`);
    assert.equal(row.canToggleEquip, false, `${label}: no legacy Equip control`);
    for (const attempt of [() => InventoryEngine.setWeaponReadied(actor, item.id, false, opts), () => InventoryEngine.toggleWeaponReadied(actor, item.id, opts), () => InventoryEngine.toggleEquip(actor, item.id)]) {
      const r = await attempt();
      assert.equal(r?.ok, false); assert.equal(r?.reason, 'weapon-identity-uncertified');
    }
    assert.deepEqual(spent, [], `${label}: no action spent`);
    assert.equal(JSON.stringify(item.system), before, `${label}: nothing written`);
    assert.equal(harness.log.itemWrites.length, w);
  }
}
ok('natural and integrated-droid weapons: no Draw/Stow UI; direct stow/toggle are refused by the coordinator (identity uncertified) and spend and write nothing');

{ // 5. legacy aliases are never written: stow changes only the coordinator-owned fields
  for (const legacy of [{ active: true }, { readied: true }, { equippable: { equipped: true, active: true } }, { activation: { active: true } }, { isEquipped: true }, { equipped: true }]) {
    const b = blaster({ ...REC('EQUIPPED', 'hold', ['natural-arm-1']), ...legacy }); const a = mkActor([b]); const before = JSON.stringify(legacy);
    const r = await InventoryEngine.setWeaponReadied(a, 'b1', false, opts);
    assert.equal(r.ok, true, JSON.stringify(legacy));
    assert.equal(b.system.weaponPosture, 'STOWED');
    for (const [k, v] of Object.entries(legacy)) assert.equal(JSON.stringify({ [k]: b.system[k] }), JSON.stringify({ [k]: v }), `${k} is left untouched`);
    assert.ok(harness.log.itemWrites.at(-1).every((u) => Object.keys(u).every((key) => key === '_id' || ['system.weaponPosture', 'system.weaponOccupancy', 'flags.swse.fireState.wielded', 'flags.swse.fireState.v'].includes(key))), 'only coordinator-owned paths are sent');
  }
}
ok('Stow never writes a retired equip alias (active/readied/equippable/activation/isEquipped/equipped stay untouched); only coordinator-owned paths are sent');

{ // 6. legacy system.active saber: deactivation still mirrors, then it can be stowed
  const s = saber({ ...REC('EQUIPPED', 'hold', ['natural-arm-1']), activated: true, active: true }); const a = mkActor([s]);
  assert.equal((await InventoryEngine.setActivated(a, 's1', false, opts)).ok, true);
  assert.equal(isItemActivated(s), false);
  assert.equal((await InventoryEngine.setWeaponReadied(a, 's1', false, opts)).ok, true);
  assert.equal(s.system.weaponPosture, 'STOWED'); assert.equal(s.system.active, false);
}
ok('legacy system.active is mirrored on deactivation (activation authority), so the saber can then be stowed');

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

{ // 7. Quick Draw: Draw and Stow cost Swift, not Move (existing action-speed metadata, priced by the coordinator)
  const b = blaster(REC('STOWED', null, [])); const a = mkActor([b, quickDrawFeat()]); spent.length = 0;
  await InventoryEngine.requestWeaponPosture(a, { type: 'equip', itemId: 'b1', purpose: 'hold', appendageIds: ['natural-arm-1'] }, opts);
  await InventoryEngine.setWeaponReadied(a, 'b1', false, opts);
  assert.deepEqual(spent, ['swift', 'swift']);
}
ok('Quick Draw makes Draw/Stow a Swift via the existing action-speed metadata');

{ // 8. Draw & Ignite: the view still offers it with the combined effect, but the engine needs coordinator support and does nothing until then
  const s = saber(); const plain = mkActor([s]); spent.length = 0; const w = harness.log.itemWrites.length;
  let r = await InventoryEngine.drawAndActivateLightsaber(plain, 's1');
  assert.equal(r.ok, false); assert.equal(spent.length, 0);
  assert.equal(gearEntries(plain).get('s1').weaponReadiness.canDrawAndIgnite, false);

  const s2 = saber(); const a = mkActor([s2, quickDrawFeat(), lightsaberProf()]);
  assert.equal(gearEntries(a).get('s1').weaponReadiness.canDrawAndIgnite, true);
  // E4-C1 WP5: the combined action is a coordinator intent over a STOWED record. This saber has no record at all (no posture is assumed), so the plan
  // is refused and nothing is written or spent.
  r = await InventoryEngine.drawAndActivateLightsaber(a, 's1', opts);
  assert.equal(r.ok, false); assert.equal(r.status, 'REJECTED_PRECONDITION'); assert.deepEqual(spent, []);
  assert.equal(s2.system.weaponPosture, undefined, 'posture untouched'); assert.equal(isItemActivated(s2), false); assert.equal(harness.log.itemWrites.length, w);
}
ok('Draw & Ignite from the sheet path: a weapon with no record is refused by the coordinator and nothing is written or spent; the committed path is covered by the WP5 suite');

{ // 9. alternate weapons: no lightsaber activation affordance
  const sword = { id: 'ss', name: 'Sith Sword', type: 'weapon', system: { equipped: true } };
  const a = mkActor([sword]);
  const r = gearEntries(a).get('ss').weaponReadiness;
  assert.equal(r.isLightsaber, false); assert.equal(r.canToggleActivated, false); assert.equal(r.canDrawAndIgnite, false);
}
ok('non-lightsaber weapons expose Draw/Stow but no lightsaber activation');

console.log(`Weapon readiness production path: ${n} checks passed.`);
