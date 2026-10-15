import assert from 'node:assert/strict';
import { makeActor, selectSpecies } from './helpers/species-actor-sim.mjs';

// SPECIES-RD-017 — project owner ruling (Option A): the printed Clone Wars Campaign Guide rule is canonical.
// Fixed array Str 15 Dex 13 Con 10 Int 12 Wis 10 Cha 8, plus exactly +2 to ONE chosen ability score. The earlier two-separate-+1
// allocation survives only as the optional house rule `republicCloneAbilityAllocation = two_different_plus_one`.
globalThis.window ??= globalThis;
globalThis.addEventListener ??= () => {}; globalThis.removeEventListener ??= () => {};
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
globalThis.sessionStorage ??= globalThis.localStorage;
globalThis.document ??= { addEventListener() {}, createElement() { return { style: {}, classList: { add() {}, remove() {} }, addEventListener() {} }; }, body: {} };
globalThis.navigator ??= { userAgent: 'node' };
const f = (globalThis.foundry ??= {});
f.applications ??= {}; f.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: B => B, DialogV2: class {} };
const { AttributeStep } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/attribute-step.js');
const { HouseRuleService } = await import('/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js');
const quiet = async fn => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };

const actor = makeActor();
const { ctx } = await quiet(() => selectSpecies(actor, 'Republic Clone', null, { strict: true }));
const override = ctx.metadata.attributeGenerationOverride;
assert.deepEqual(override.fixedScores, { str: 15, dex: 13, con: 10, int: 12, wis: 10, cha: 8 });
assert.deepEqual([override.allocationPoints, override.maxPerAbility, override.singleScore], [2, 2, true], 'canonical: +2 to one score');

function stepWith(setting) {
  HouseRuleService.getString = (key, fallback) => (key === 'republicCloneAbilityAllocation' && setting ? setting : fallback);
  const step = Object.create(AttributeStep.prototype);
  step._method = 'species-fixed'; step._committed = false;
  step._attributes = { ...override.fixedScores };
  step._getSpeciesAttributeOverride = () => override;
  step._getAssignableAbilityKeys = () => ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  return step;
}
const can = (s, key, d = 1) => s._canAdjustSpeciesFixed({}, key, d);
const bump = (s, key) => { assert.ok(can(s, key), `${key} +1 allowed`); s._attributes[key] += 1; };
const status = s => s._getSpeciesFixedAllocationStatus({});

// ---- Canonical (default) ----
{
  const s = stepWith(null);
  bump(s, 'str');
  assert.equal(status(s).complete, false, '+1 on one score is not yet the printed +2');
  assert.equal(can(s, 'dex'), false, 'a second score is closed: the bonus is not split');
  bump(s, 'str');
  assert.deepEqual(status(s).allocations, { str: 2 });
  assert.equal(status(s).complete, true);
  assert.equal(can(s, 'str'), false, 'no more than +2');
  assert.equal(can(s, 'dex'), false);
  assert.equal(can(s, 'str', -1), true, 'can step back');
  s._attributes.str -= 1; assert.equal(can(s, 'dex'), false, 'still holding +1 on Str: Dex stays closed');
  s._attributes.str -= 1; assert.equal(can(s, 'dex'), true, 'after removing it all, any score may be chosen');
  // Every score is a legal single choice.
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) { const t = stepWith(null); bump(t, key); bump(t, key); assert.equal(status(t).complete, true, key); }
  assert.match(String(Object.create(AttributeStep.prototype)._resolveSpeciesAllocation(override).helpText), /exactly one/);
}
// ---- Optional house rule: two separate +1 increases to different abilities ----
{
  const s = stepWith('two_different_plus_one');
  bump(s, 'str'); bump(s, 'dex');
  assert.equal(status(s).complete, true);
  assert.equal(can(s, 'str'), false, 'the house rule does not allow stacking (one per ability)');
  assert.equal(can(s, 'con'), false, 'and not a third point');
  assert.match(String(Object.create(AttributeStep.prototype)._resolveSpeciesAllocation(override).helpText), /separate \+1/);
  const stacked = stepWith('two_different_plus_one'); bump(stacked, 'str');
  assert.equal(can(stacked, 'str'), false, 'cannot put both points on one ability under the house rule');
}
// ---- Existing characters keep their stored ability scores ----
{
  const existing = makeActor();
  for (const [k, v] of Object.entries({ str: 17, dex: 13, con: 10, int: 12, wis: 10, cha: 8 })) existing.system.attributes[k].base = v;   // an older clone: +2 Str or two +1s, whichever
  const before = structuredClone(existing.system.attributes);
  existing.system.species = { name: 'Republic Clone' };
  await quiet(() => selectSpecies(existing, 'Republic Clone'));
  assert.deepEqual(Object.fromEntries(Object.entries(existing.system.attributes).map(([k, v]) => [k, v.base])), Object.fromEntries(Object.entries(before).map(([k, v]) => [k, v.base])), 'stored base scores untouched');
}
console.log('PASS: species Republic Clone allocation (RD-017)');
