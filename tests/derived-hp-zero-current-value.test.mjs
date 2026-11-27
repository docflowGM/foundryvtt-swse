import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-DC P0 (owner directive): a current HP of 0 must not be replaced by max (truthy fallback). The derived mirror of a downed actor reads 0, not full HP.
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: () => false }, user: { isGM: true }, actors: { get: () => null } };
const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');
let uid = 0;
const mk = (hp) => ({ id: `hp${++uid}`, type: 'character', _stats: { modifiedTime: uid }, effects: [], flags: {}, items: [],
  system: { level: 1, size: 'medium', hp, progression: {}, conditionTrack: { current: 0 }, attributes: Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map((k) => [k, { base: 10 }])), skills: {} } });
const derivedHp = async (hp) => (await DerivedCalculator.computeAll(mk(hp)))['system.derived.hp'];

assert.equal((await derivedHp({ value: 0, max: 20 })).value, 0, 'current HP 0 stays 0');
assert.equal((await derivedHp({ value: 7, max: 20 })).value, 7);
assert.equal((await derivedHp({ value: 20, max: 20 })).value, 20);
assert.equal((await derivedHp({ max: 20 })).value, 20, 'a missing current value falls back to max');
assert.equal((await derivedHp({ value: null, max: 20 })).value, 20, 'null is missing, not zero');
assert.equal((await derivedHp({ value: 0, max: 20 })).max, 20, 'max is unaffected');
console.log('derived-hp-zero-current-value: ok');
