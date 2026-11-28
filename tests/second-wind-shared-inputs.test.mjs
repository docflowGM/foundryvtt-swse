import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// PRG remainder: ONE read of the Second Wind input facts (SecondWindRules.readInputs) serves the engine apply/reset paths and the progression mannequin.
for (const l of ['log', 'info', 'debug', 'warn']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
const { SecondWindRules } = await import('/systems/foundryvtt-swse/scripts/engine/combat/SecondWindRules.js');
const conMod = (a) => Math.floor((Number(a.system.attributes.con.base) - 10) / 2);
const organic = { type: 'character', system: { attributes: { con: { base: 14 } }, defenses: { fortitude: { classBonus: 3 } } }, items: [{ type: 'talent', name: 'Tough as Nails' }] };
assert.deepEqual(SecondWindRules.readInputs(organic, conMod), { isDroid: false, conScore: 14, conMod: 2, fortClassBonus: 3, hasToughAsNails: true });
const droid = { type: 'droid', system: { attributes: { con: { base: 18 } } }, items: [] };
assert.deepEqual(SecondWindRules.readInputs(droid, conMod), { isDroid: true, conScore: 0, conMod: 0, fortClassBonus: 0, hasToughAsNails: false }, 'droids have no Constitution');
assert.deepEqual(SecondWindRules.readInputs({ type: 'npc', system: { isDroid: true, attributes: {} } }, conMod).isDroid, true);
const derived = { type: 'character', system: { derived: { attributes: { con: { total: 16 } } }, attributes: { con: { base: 10 } } }, items: [] };
assert.equal(SecondWindRules.readInputs(derived, () => 3).conScore, 16, 'derived total wins over base');
// no consumer re-derives the inputs inline
for (const f of ['scripts/governance/actor-engine/damage-condition-orchestration.js', 'scripts/apps/progression-framework/shell/mannequin/mannequin-builder.js']) {
  const src = fs.readFileSync(f, 'utf8');
  assert.doesNotMatch(src, /Tough as Nails/, `${f} uses SecondWindRules.readInputs`);
  assert.doesNotMatch(src, /defenses\?\.fortitude\?\.classBonus/, `${f} uses SecondWindRules.readInputs`);
}
process.stdout.write('second-wind-shared-inputs: ok\n');
