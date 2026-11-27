import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// DC-A08: Initiative is a SKILL; after computeAll the published `derived.initiative.total` is the initiative skill total (half character level +
// ability + training/misc), never the early Dexterity-only seed. Condition-track penalty is applied once.
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: () => false }, user: { isGM: true }, actors: { get: () => null } };
const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');
const mk = (id, ct, trained) => ({
  id, type: 'character', _stats: { modifiedTime: 1 }, effects: [], flags: {},
  items: [{ type: 'class', name: 'Soldier', system: { level: 6, isNonheroic: false } }],
  system: { level: 6, size: 'medium', hp: { max: 40, value: 40 }, progression: {}, conditionTrack: { current: ct }, derived: { damage: { conditionPenalty: ct === 2 ? -2 : 0 } },
    attributes: { str: { base: 10 }, dex: { base: 14 }, con: { base: 10 }, int: { base: 10 }, wis: { base: 10 }, cha: { base: 10 } },
    skills: { initiative: { trained, focused: false, miscMod: 0, selectedAbility: 'dex' } } },
});
for (const [id, ct, trained, expected] of [['init-a', 0, false, 3 + 2], ['init-b', 0, true, 3 + 2 + 5], ['init-c', 2, false, 3 + 2 - 2]]) {
  const out = await DerivedCalculator.computeAll(mk(id, ct, trained));
  const skill = out['system.derived.skills'].initiative.total;
  const init = out['system.derived.initiative'];
  assert.equal(skill, expected, `${id}: skill total`);
  assert.equal(init.total, skill, `${id}: derived.initiative.total equals the initiative skill total (not the Dex-only seed)`);
}
console.log('derived-initiative-final-authority: ok');
