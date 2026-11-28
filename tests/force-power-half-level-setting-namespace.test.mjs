import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// DC-A01: the optional house rule `forcePowerDamageAddsHalfLevel` is registered under `foundryvtt-swse`; the damage helper must read it through
// HouseRuleService (the only settings reader), not a different namespace. Default off; RAW (Force powers get no half-level) is unchanged when off.
registerFoundryPathLoader();
installFoundryShimGlobals();
const store = new Map();
const KEY = 'foundryvtt-swse.forcePowerDamageAddsHalfLevel';
globalThis.game = globalThis.game ?? {};
globalThis.game.settings = {
  get: (ns, key) => store.get(`${ns}.${key}`),
  set: async (ns, key, v) => { store.set(`${ns}.${key}`, v); return v; },
  settings: { has: (k) => k === KEY },
};
const { getHalfLevelDamageBonus } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js');
const actor = { type: 'character', system: {}, items: [{ type: 'class', name: 'Jedi', system: { level: 6, isNonheroic: false } }] };
const forceCtx = { type: 'force-power', damageType: 'force' };

store.set(KEY, undefined);
assert.equal(getHalfLevelDamageBonus(actor, null, forceCtx), 0, 'default off: Force power damage has no half-level (RAW)');
store.set(KEY, false);
assert.equal(getHalfLevelDamageBonus(actor, null, forceCtx), 0);
store.set(KEY, true);
assert.equal(getHalfLevelDamageBonus(actor, null, forceCtx), 3, 'enabled: half heroic level added to Force power damage');
assert.equal(getHalfLevelDamageBonus(actor, null, { type: 'force-power', damageType: 'fire' }), 0, 'elemental exclusion preserved');
// ordinary weapon damage is unaffected by the setting either way
assert.equal(getHalfLevelDamageBonus(actor, { type: 'weapon' }, { isWeaponDamage: true }), 3);
store.set(KEY, false);
assert.equal(getHalfLevelDamageBonus(actor, { type: 'weapon' }, { isWeaponDamage: true }), 3);
assert.equal(getHalfLevelDamageBonus(actor, null, forceCtx), 0, 'disabled again after enabling');
assert.doesNotMatch(fs.readFileSync('scripts/engine/combat/combat-stat-rules.js', 'utf8'), /settings\?\.get\?\.\('swse'/);
console.log('force-power-half-level-setting-namespace: ok');
