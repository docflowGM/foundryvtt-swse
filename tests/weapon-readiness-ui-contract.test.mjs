import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Weapon readiness UI contract: Draw/Stow, Activate/Deactivate, Draw & Ignite, Configuration.
// Static: templates/handlers/CSS are wired to ONE authority. Behavioral: InventoryEngine owns the mutations through the existing action economy.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const P = 'templates/actors/character/v2-concept/partials/';
let n = 0;
const ok = (msg) => console.log(`  [${++n}] ${msg} OK`);

// ---- static ----
const card = read(`${P}panels/inventory-weapon-card.hbs`), gear = read(`${P}tabs/gear-tab.hbs`), attacks = read(`${P}panels/attacks-panel.hbs`), armor = read(`${P}panels/inventory-armor-card.hbs`);
for (const a of ['toggle-weapon-readiness', 'toggle-activated', 'change-weapon-configuration']) assert.ok(card.includes(a), `weapon card exposes ${a}`);
ok('weapon card exposes draw/stow, activation and configuration controls');
assert.ok(gear.includes('toggle-weapon-readiness') && gear.includes('draw-and-ignite-lightsaber'), 'gear ledger has Draw/Stow and Draw & Ignite');
ok('Gear ledger exposes Draw/Stow and Draw & Ignite');
assert.ok(attacks.includes('toggle-weapon-readiness') && attacks.includes('toggle-activated'), 'attack panel controls');
ok('Combat attack panel exposes readiness / activation');
assert.ok(armor.includes('toggle-activated'), 'shield card activation');
ok('energy shield card exposes activation');
for (const t of [card, gear, attacks]) assert.ok(/swse-weapon-control/.test(t) || t === gear);
assert.ok(/swse-weapon-control/.test(card) && /swse-weapon-state/.test(card), 'template classes');
ok('templates use swse-weapon-control / swse-weapon-state classes');
for (const t of [card, gear, attacks, armor]) assert.ok(!/\.update\(|setFlag|data-flag/.test(t), 'no template writes');
ok('templates write no item or flag state');

const sheet = read('scripts/sheets/v2/character-like-sheet.js');
for (const a of ['toggle-weapon-readiness', 'draw-and-ignite-lightsaber', 'change-weapon-configuration']) assert.equal(sheet.split(`"${a}"`).length - 1 >= 1, true, `${a} handled`);
assert.ok(sheet.includes('InventoryEngine.toggleWeaponReadied') || sheet.includes('InventoryEngine.setWeaponReadied'), 'sheet routes through engines');
const dlgStart = sheet.indexOf('async _openWeaponConfigurationDialog');
const dlg = sheet.slice(dlgStart, sheet.indexOf('\n  }\n', dlgStart));
assert.ok(dlg.includes('FireStateStore.setConfiguration') && !/\.update\(|setFlag|system\.equipped/.test(dlg), 'configuration dialog writes only through FireStateStore');
ok('sheet routes mutations through InventoryEngine / FireStateStore (single handler path)');

const css = read('styles/sheets/v2-weapon-controls.css');
assert.ok(css.includes('.swse-weapon-control') && css.includes('.swse-weapon-state') && css.includes('.swse-weapon-state-strip'));
assert.ok(!/ActorEngine|Hooks\.|@import/.test(css));
const sys = JSON.parse(read('system.json'));
const styles = sys.styles;
assert.equal(styles.indexOf('styles/sheets/v2-weapon-controls.css'), styles.indexOf('styles/sheets/v2-alive-systems.css') + 1, 'registered right after v2-alive-systems');
ok('v2-weapon-controls.css exists, is presentation-only and registered after v2-alive-systems.css');

// ---- behavioral ----
const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { isItemActivated } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/item-activation-state.js');

const { installCoordinatorHarness, REC } = await import('./helpers/equipment-coordinator-harness.mjs');
const spent = []; let allow = true;
ActionEconomyConsumption.spend = async (_a, type) => { if (!allow) return { allowed: false }; spent.push(type); return { allowed: true }; };
const harness = installCoordinatorHarness(ActorEngine);
const writes = harness.log.itemWrites;
const opts = { deps: harness.deps };
const mk = (items, extra = {}) => { const a = { id: 'a', type: 'character', items, system: {}, flags: {}, ...extra }; items.get = (id) => items.find((i) => i.id === id); return a; };
const saber = (o = {}, record = REC('STOWED', null, [])) => ({ id: 's1', name: 'Lightsaber', type: 'weapon', system: { ...record, activated: false, weaponCategory: 'lightsaber', subtype: 'lightsaber', ...o } });
const held = (purpose = 'hold') => REC('EQUIPPED', purpose, ['natural-arm-1']);

assert.equal(isItemActivated({ system: { activated: true } }), true);
assert.equal(isItemActivated({ system: {} }), false);
ok('isItemActivated is the shared activation reader');

{ // draw / stow: the coordinator owns posture; stowing is a complete intent, drawing needs explicit appendages
  const s = saber({}, held()), a = mk([s]); spent.length = 0;
  let r = await InventoryEngine.setWeaponReadied(a, 's1', false, opts);
  assert.equal(r.ok, true); assert.equal(s.system.weaponPosture, 'STOWED'); assert.deepEqual(spent, ['move']);
  assert.equal(s.system.equipped, undefined, 'no retired alias is written');
  r = await InventoryEngine.setWeaponReadied(a, 's1', true, opts);
  assert.equal(r.ok, false); assert.equal(r.status, 'CHOICE_REQUIRED'); assert.ok(r.choices.some((c) => c.id === 'appendageIds'));
  assert.equal(s.system.weaponPosture, 'STOWED'); assert.deepEqual(spent, ['move'], 'a choice-required draw spends nothing');
  r = await InventoryEngine.requestWeaponPosture(a, { type: 'equip', itemId: 's1', purpose: 'hold', appendageIds: ['natural-arm-1'] }, opts);
  assert.equal(r.ok, true); assert.equal(s.system.weaponPosture, 'EQUIPPED'); assert.deepEqual(spent, ['move', 'move']);
}
ok('Draw / Stow go through the coordinator: posture fields only, a Move action each, and a draw without explicit appendages is CHOICE_REQUIRED');

{ // failed spend writes nothing durable
  const s = saber(), a = mk([s]); writes.length = 0; allow = false;
  const r = await InventoryEngine.requestWeaponPosture(a, { type: 'equip', itemId: 's1', purpose: 'hold', appendageIds: ['natural-arm-1'] }, opts);
  allow = true;
  assert.equal(r.ok, false); assert.equal(r.status, 'FAILED_COMPENSATED');
  assert.equal(s.system.weaponPosture, 'STOWED'); assert.deepEqual(s.system.weaponOccupancy, { schemaVersion: 1, purpose: null, appendageIds: [] });
}
ok('a failed action spend leaves the weapon stowed (owned fields compensated, journal closed)');

{ // stowed cannot activate; drawn can; active cannot stow
  const s = saber(), a = mk([s]); spent.length = 0;
  assert.equal((await InventoryEngine.setActivated(a, 's1', true, opts)).ok, false);
  assert.equal(s.system.activated, false);
  s.system.weaponPosture = 'EQUIPPED'; s.system.weaponOccupancy = { schemaVersion: 1, purpose: 'hold', appendageIds: ['natural-arm-1'] };
  assert.equal((await InventoryEngine.setActivated(a, 's1', true, opts)).ok, true);
  assert.equal(s.system.activated, true); assert.deepEqual(spent, ['swift']);
  const stow = await InventoryEngine.setWeaponReadied(a, 's1', false, opts);
  assert.equal(stow.ok, false); assert.equal(stow.reason, 'deactivate-before-stowing'); assert.equal(s.system.weaponPosture, 'EQUIPPED');
  assert.equal((await InventoryEngine.setActivated(a, 's1', false)).ok, true);
  assert.equal((await InventoryEngine.setWeaponReadied(a, 's1', false, opts)).ok, true);
  assert.equal(s.system.weaponPosture, 'STOWED');
}
ok('stowed saber cannot activate; drawn activates (Swift); active saber cannot stow; inactive can');

{ // Draw & Ignite: without the Quick Draw combined action nothing is written or spent (the supported path is covered by the WP5 suite)
  const s = saber(), a = mk([s]); spent.length = 0; writes.length = 0;
  const r = await InventoryEngine.drawAndActivateLightsaber(a, 's1', { appendageIds: ['natural-arm-1'], grip: 'one-handed', deps: opts.deps });
  assert.equal(r.ok, false); assert.equal(r.status, 'REJECTED_PRECONDITION'); assert.equal(spent.length, 0); assert.equal(writes.length, 0);
}
ok('Draw & Ignite without the Quick Draw combined action is refused by the coordinator and writes and spends nothing');

{ // shield
  const sh = { id: 'sh', name: 'Energy Shield (SR 10)', type: 'armor', system: { equipped: true, armorType: 'shield', shieldRating: 10, currentSR: 0, activated: false, charges: { current: 5, max: 5 } } };
  const a = mk([sh]); spent.length = 0;
  await InventoryEngine.setActivated(a, 'sh', true);
  assert.equal(sh.system.charges.current, 4); assert.equal(sh.system.currentSR, 10); assert.deepEqual(spent, ['swift']);
  await InventoryEngine.setActivated(a, 'sh', false);
  assert.equal(sh.system.currentSR, 0); assert.equal(sh.system.charges.current, 4);
}
ok('shield activation consumes one charge and a Swift; deactivation clears SR');

console.log(`Weapon readiness UI contract: ${n} checks passed.`);
