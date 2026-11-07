import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
registerFoundryPathLoader();
const { legacyInstalledSystemsMayModify } = await import('../scripts/domain/vehicles/vehicle-legacy-modifier-gate.js');
const { classifyVehicleActorSource } = await import('../scripts/domain/vehicles/vehicle-runtime-contract.js');

// SSOT N-06: a forged/stale `system.installedSystems` map must not change a certified vehicle's mechanics.
const v = (flags = {}, system = {}) => ({ type: 'vehicle', system: { installedSystems: { 'shield-generator': true }, ...system }, flags: { swse: flags }, items: [] });

// Unclaimed homebrew hull keeps the legacy (paid, GM-visible) lane.
assert.equal(legacyInstalledSystemsMayModify(v()), true);
// Anything carrying a published-source claim (valid, partial or forged) gets NO legacy modifier.
for (const claim of [{ canonicalPublication: {} }, { universalVehicleSource: {} }, { canonicalPublication: {}, universalVehicleSource: { source: {} } }]) {
  assert.notEqual(classifyVehicleActorSource(v(claim), undefined, { mode: 'runtime' }).kind, 'custom', 'fixture really carries a claim');
  assert.equal(legacyInstalledSystemsMayModify(v(claim)), false, JSON.stringify(Object.keys(claim)));
}
// A rules-legal custom hull (sealed construction record) takes effects from the construction/installation authority.
assert.equal(legacyInstalledSystemsMayModify(v({ vehicleConstruction: { designId: 'd1' } })), false);
// Non-vehicles and missing actors never.
assert.equal(legacyInstalledSystemsMayModify({ type: 'droid', system: {}, flags: {} }), false);
assert.equal(legacyInstalledSystemsMayModify(null), false);

// Structural: ModifierEngine routes both decisions through the shared helpers, with no type fallback.
const me = fs.readFileSync('scripts/engine/effects/modifiers/ModifierEngine.js', 'utf8');
assert.match(me, /^import \{ followsDroidRules[^}]*\} from '[^']*droid-rules-profile\.js';/m, 'static profile import');
assert.match(me, /^import \{ legacyInstalledSystemsMayModify \}/m);
const fn = me.slice(me.indexOf('static _followsDroidRules'), me.indexOf('static async _getDroidModModifiers')).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
assert.doesNotMatch(fn, /actor\??\.type\s*===\s*'droid'/, 'no actor.type fallback in the droid identity gate');
assert.doesNotMatch(fn, /import\(/, 'identity is not resolved through a dynamic import');
assert.match(fn, /return false;/, 'fails closed');
const veh = me.slice(me.indexOf('static async _getVehicleModModifiers'));
assert.match(veh.slice(0, 700), /legacyInstalledSystemsMayModify\(actor\)/);
console.log('Vehicle legacy-modifier gate tests passed.');
