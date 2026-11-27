import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-DC P0 (F-ACT-015): Skill Focus non-stacking is ONE canonical calculation inside DerivedCalculator. It used to be corrected a second time by a
// runtime wrapper around DerivedCalculator.computeAll() installed from force-suite-runtime-repairs.js. Failing before: with no wrapper installed (as
// here) a focused skill carrying a second unrecognized +5 read 17; the canonical result is 12 with the suppression recorded on the skill.
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: () => false }, user: { isGM: true }, actors: { get: () => null } };
const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');

let uid = 0;
const mk = ({ focused, withFeat, extra }) => ({ id: `sf${++uid}`, type: 'character', _stats: { modifiedTime: uid }, effects: [], flags: {},
  items: [{ type: 'class', name: 'Soldier', system: { level: 4, isNonheroic: false } },
    ...(withFeat ? [{ type: 'feat', name: 'Skill Focus', id: 'f1', system: { selectedChoice: 'acrobatics' }, flags: { swse: { selectedChoice: 'acrobatics' } } }] : [])],
  system: { level: 4, size: 'medium', hp: { max: 30, value: 30 }, progression: {}, conditionTrack: { current: 0 },
    attributes: Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map((k) => [k, { base: 10 }])),
    activeEffects: extra ? [{ id: 'e1', name: 'Training boost', target: 'skill.acrobatics', type: 'untyped', value: 5, roundsRemaining: 3 }] : [],
    skills: { acrobatics: { trained: true, focused, miscMod: 0, selectedAbility: 'dex' } } } });
const skill = async (a) => (await DerivedCalculator.computeAll(a))['system.derived.skills'].acrobatics;

{
  const s = await skill(mk({ focused: true, withFeat: true, extra: true }));
  assert.equal(s.total, 2 + 5 + 5, 'half character level 2 + trained 5 + one Skill Focus +5; the duplicate +5 is suppressed');
  assert.equal(s.skillFocusNonStacking, true);
  assert.equal(s.duplicateSkillFocusSuppressed, 5);
  assert.equal(s.math.verified, true, 'the breakdown still sums to the total');
  console.log('  ok  focused + Skill Focus feat + a second +5: counted once');
}
{
  const s = await skill(mk({ focused: true, withFeat: false, extra: true }));
  assert.equal(s.total, 2 + 5 + 5 + 5, 'without the Skill Focus feat for that skill the extra bonus is a genuine, separate modifier (unchanged behavior)');
  console.log('  ok  no Skill Focus feat for the skill: other modifier kept');
}
{
  const s = await skill(mk({ focused: true, withFeat: true, extra: false }));
  assert.equal(s.total, 12);
  assert.equal(s.skillFocusNonStacking, undefined);
  console.log('  ok  nothing to suppress: unchanged');
}
// the runtime wrapper is gone
const repairs = fs.readFileSync('scripts/engine/force/force-suite-runtime-repairs.js', 'utf8');
assert.ok(!/DerivedCalculator\.computeAll\s*=/.test(repairs), 'no computeAll wrapper remains in force-suite-runtime-repairs');
assert.ok(!/installSkillFocusNonStackingGuard|suppressDuplicateSkillFocusInUpdates/.test(repairs));
console.log('derived-skill-focus-single-calculation: ok');
