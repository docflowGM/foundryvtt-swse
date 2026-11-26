import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// F-UIS-005 (3M): the Second Wind panel's base healing is SecondWindRules.calculateHealingAmount (the authority ActorEngine.applySecondWind uses), not a
// local max(floor(HP/4), CON) copy.
globalThis.window = globalThis.window || {}; window.addEventListener ??= () => {}; registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x'; globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
const { PanelContextBuilder } = await import('../scripts/sheets/v2/context/PanelContextBuilder.js');
const { SecondWindRules } = await import('../scripts/engine/combat/SecondWindRules.js');
const build = (system, type = 'character') => { const b = Object.create(PanelContextBuilder.prototype); b.system = system; b.actor = { type }; b.sheet = { isEditable: true }; b._validatePanelContext = () => {}; return b.buildSecondWindPanel(); };
test('panel base healing equals the rules authority for a range of HP / CON values', () => {
  for (const [hp, con] of [[40, 10], [40, 18], [100, 12], [7, 8], [1, 10], [200, 20]]) {
    const panel = build({ hp: { max: hp }, attributes: { con: { total: con } } });
    assert.equal(panel.baseHealing, SecondWindRules.calculateHealingAmount(hp, con), `hp ${hp} con ${con}`);
  }
});
test('a droid has no CON contribution', () => {
  assert.equal(build({ hp: { max: 40 }, attributes: { con: { total: 18 } } }, 'droid').baseHealing, SecondWindRules.calculateHealingAmount(40, 0));
});
test('a stored positive override still wins', () => {
  assert.equal(build({ hp: { max: 40 }, attributes: { con: { total: 10 } }, secondWind: { healing: 25 } }).healing, 25);
});
