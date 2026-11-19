import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: class {}
};
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
const handlers = {};
globalThis.Hooks = { on: (name, fn) => { (handlers[name] ??= []).push(fn); }, once() {}, callAll() {} };

const { registerFeatHousekeepingRuntimePatches } = await import('/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-housekeeping-runtime-patches.js');
const { AbilityEngine } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js');
let cleared = 0;
AbilityEngine.clearAcquisitionCache = () => { cleared += 1; };
registerFeatHousekeepingRuntimePatches();

assert.ok(handlers.updateSetting?.length, 'the updateSetting handler is registered');
// Every handler must run without throwing (this used to throw "HOUSERULE_GRANT_SETTINGS is not defined").
for (const key of ['foundryvtt-swse.weaponFinesseDefault', 'foundryvtt-swse.someUnrelatedSetting']) {
  for (const fn of handlers.updateSetting) assert.doesNotThrow(() => fn({ key }), key);
}
assert.ok(cleared >= 1, 'a grant-bearing setting clears the acquisition cache');
const before = cleared;
for (const fn of handlers.updateSetting) fn({ key: 'foundryvtt-swse.someUnrelatedSetting' });
assert.equal(cleared, before, 'an unrelated setting does not clear it');
for (const fn of handlers['swse:houserule-changed'] ?? []) assert.doesNotThrow(() => fn('dodgeDefault'));
console.log('PASS: house-rule updateSetting handler runs; grant-bearing settings clear the acquisition cache, unrelated ones do not');
