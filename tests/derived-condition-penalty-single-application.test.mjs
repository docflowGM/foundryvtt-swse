import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-DC P0 (owner directive): the condition-track penalty to defenses is applied EXACTLY ONCE. Before the fix it was applied by DefenseCalculator AND
// pushed again as a ModifierEngine defense modifier, so a base-20 defense read 18/16/10/1 at steps 1-4. Expected: 20 / 19 / 18 / 15 / 10.
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: () => false }, user: { isGM: true }, actors: { get: () => null } };
const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');
const { ModifierEngine } = await import('/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js');

const mk = (step) => ({ id: 'd' + step, type: 'character', _stats: { modifiedTime: 1 }, effects: [], flags: {},
  items: [{ type: 'class', name: 'Soldier', system: { level: 10, isNonheroic: false, defenses: { fortitude: 2, reflex: 1, will: 0 } } }],
  system: { level: 10, size: 'medium', hp: { max: 50, value: 50 }, progression: {}, conditionTrack: { current: step },
    attributes: Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map((k) => [k, { base: 10 }])), skills: {} } });

const EXPECT = { 0: 20, 1: 19, 2: 18, 3: 15, 4: 10 };
for (const [step, total] of Object.entries(EXPECT)) {
  const out = await DerivedCalculator.computeAll(mk(Number(step)));
  const d = out['system.derived.defenses'];
  for (const key of ['fortitude', 'reflex', 'will']) assert.equal(d[key].total, total, `${key} at condition step ${step}`);
  console.log(`  ok  step ${step}: every defense ${total}`);
}
// the ModifierEngine collector no longer contributes a second defense penalty
const collected = ModifierEngine._getConditionModifiers(mk(3));
assert.deepEqual(collected.filter((m) => String(m.target).startsWith('defense')), [], 'no condition-track defense modifier from ModifierEngine');
console.log('derived-condition-penalty-single-application: ok');
