import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// F-PAT-001 (3N): the worn-armor preference for the gear Armor Profile was applied by runtime patches of PanelContextBuilder.prototype
// (armor-hydration-defense-hotfix). It is now the builder's own behavior.
globalThis.window = globalThis.window || {}; window.addEventListener ??= () => {}; registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x'; globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
const { PanelContextBuilder } = await import('../scripts/sheets/v2/context/PanelContextBuilder.js');
const { RowTransformers } = await import('../scripts/sheets/v2/context/RowTransformers.js');
RowTransformers.toArmorSummaryRow = (item) => ({ id: item.id, name: item.name });
const shield = { id: 's1', name: 'Energy Shield', type: 'armor', system: { equipped: true, armorType: 'shield', isEnergyShield: true, shield: true } };
const armor = { id: 'a1', name: 'Combat Armor', type: 'armor', system: { equipped: true, armorType: 'medium' } };
const builder = (items) => { const b = Object.create(PanelContextBuilder.prototype); b.actor = { items }; b.sheet = { isEditable: true }; b._actorItems = () => items; b._validatePanelContext = () => {}; return b; };

test('armor summary prefers worn armor over an equipped energy shield', () => {
  const panel = builder([shield, armor]).buildArmorSummaryPanel();
  assert.equal(panel.equippedArmor?.id, 'a1');
  assert.equal(panel.canEdit, true);
});
test('only a shield equipped -> no worn armor is shown', () => {
  assert.equal(builder([shield]).buildArmorSummaryPanel().equippedArmor, null);
});
test('no equipped armor -> null', () => {
  assert.equal(builder([{ ...armor, system: { equipped: false } }]).buildArmorSummaryPanel().equippedArmor, null);
});
test('the runtime panel patches are gone', () => {
  const src = fs.readFileSync('scripts/patches/armor-hydration-defense-hotfix.js', 'utf8');
  assert.ok(!/proto\.buildArmorSummaryPanel\s*=|proto\.buildInventoryPanel\s*=/.test(src));
});
