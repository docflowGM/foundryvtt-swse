import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// F-CMB-003 (owner ruling 2026-11-27; Core Rulebook pp. 145-146 and 168-169).
// RAW: DT = Fortitude Defense (or the permitted substitute defense) + size bonus (+ published modifiers such as Improved Damage Threshold +5).
//      Fine..Medium +0, Large +5, Huge +10, Gargantuan +20, Colossal +50. No heroic-level term under RAW.
// OPTIONAL house rule (enableEnhancedMassiveDamage + modifyDamageThresholdFormula): add the selected level modifier ONCE to the correctly calculated RAW
//      DT: fullLevel -> + heroic level; halfLevel -> + floor(heroic level / 2). Size is never added a second time; heroic level is never replaced by
//      total level.
// DerivedCalculator's result is the single authority for character-scale actors; ThresholdEngine consumes it.
registerFoundryPathLoader();
installFoundryShimGlobals();
const settings = {};
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: (_ns, key) => settings[key], set: async () => {}, settings: { has: (fullKey) => Object.prototype.hasOwnProperty.call(settings, fullKey.split('.').slice(1).join('.')) } }, user: { isGM: true }, actors: { get: () => null }, combat: null };
const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');
const { ThresholdEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/threshold-engine.js');

let uid = 0;
const IDT = { type: 'feat', name: 'Improved Damage Threshold', system: { abilityMeta: { resourceRules: { damageThreshold: [{ type: 'FLAT_BONUS', value: 5 }] } } } };
const mk = ({ size = 'medium', heroic = 6, nonheroic = 0, idt = false }) => ({ id: `dt${++uid}`, type: 'character', _stats: { modifiedTime: uid }, effects: [], flags: {},
  items: [
    ...(heroic ? [{ type: 'class', name: 'Soldier', system: { level: heroic, isNonheroic: false } }] : []),
    ...(nonheroic ? [{ type: 'class', name: 'Nonheroic', system: { level: nonheroic, isNonheroic: true } }] : []),
    ...(idt ? [IDT] : [])],
  system: { level: heroic + nonheroic, size, hp: { max: 40, value: 40 }, progression: {}, conditionTrack: { current: 0 },
    attributes: Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map((k) => [k, { base: 10 }])), skills: {} } });
const run = async (a, house = {}) => {
  for (const k of Object.keys(settings)) delete settings[k];
  Object.assign(settings, house);
  DerivedCalculator.clearCaches?.();
  const out = await DerivedCalculator.computeAll(a);
  return { dt: out['system.derived.damageThreshold'], fort: out['system.derived.defenses'].fortitude.total, out };
};
const ENH = (type) => ({ enableEnhancedMassiveDamage: true, modifyDamageThresholdFormula: true, damageThresholdFormulaType: type });

// --- RAW ---
{
  const m = await run(mk({}));
  assert.equal(m.dt, m.fort, 'Medium character: DT = Fortitude Defense');
  const l = await run(mk({ size: 'large' }));
  assert.equal(l.dt, l.fort + 5, 'Large: +5');
  assert.equal((await run(mk({ size: 'huge' }))).dt - (await run(mk({ size: 'huge' }))).fort, 10);
  assert.equal((await run(mk({ size: 'gargantuan' }))).dt - (await run(mk({ size: 'gargantuan' }))).fort, 20);
  const colossal = await run(mk({ size: 'colossal' })); assert.equal(colossal.dt - colossal.fort, 50);
  const mi = await run(mk({ idt: true })); assert.equal(mi.dt, mi.fort + 5, 'Medium + Improved Damage Threshold: +5');
  const li = await run(mk({ size: 'large', idt: true })); assert.equal(li.dt, li.fort + 10, 'Large + IDT: size 5 + 5');
  console.log('  ok  RAW: size table and Improved Damage Threshold');
}
// --- optional house rule: level modifier added once ---
{
  const raw = await run(mk({ size: 'large', heroic: 6 }));
  const full = await run(mk({ size: 'large', heroic: 6 }), ENH('fullLevel'));
  const half = await run(mk({ size: 'large', heroic: 6 }), ENH('halfLevel'));
  assert.equal(full.dt, raw.dt + 6, 'full level: RAW DT + heroic level (size not added again)');
  assert.equal(half.dt, raw.dt + 3, 'half level: RAW DT + floor(heroic / 2)');
  assert.equal(full.dt, full.fort + 5 + 6, 'Large, heroic 6, full-level formula = Fortitude + 5 + 6');
  assert.equal(half.dt, half.fort + 5 + 3);
  const withIdt = await run(mk({ size: 'large', heroic: 6, idt: true }), ENH('fullLevel'));
  assert.equal(withIdt.dt, withIdt.fort + 5 + 5 + 6, 'published feat modifier survives the house rule');
  // only ONE of the two settings is not enough
  assert.equal((await run(mk({ size: 'large', heroic: 6 }), { enableEnhancedMassiveDamage: true })).dt, raw.dt);
  assert.equal((await run(mk({ size: 'large', heroic: 6 }), { modifyDamageThresholdFormula: true })).dt, raw.dt);
  // zero heroic levels: the level modifier is 0, never silently the total character level
  const nh = await run(mk({ heroic: 0, nonheroic: 6 }), ENH('fullLevel'));
  const nhRaw = await run(mk({ heroic: 0, nonheroic: 6 }));
  assert.equal(nh.dt, nhRaw.dt, 'a Nonheroic-only actor has no heroic level to add');
  console.log('  ok  house rule: level modifier once, feats preserved, both settings required, no total-level substitution');
}
// --- the threshold actually used when damage is applied agrees with the derived sheet value (excluding event-specific adjustments) ---
for (const house of [{}, ENH('fullLevel'), ENH('halfLevel')]) {
  const a = mk({ size: 'large', heroic: 6, idt: true });
  const r = await run(a, house);
  a.system.derived = { damageThreshold: r.dt, defenses: r.out['system.derived.defenses'] };
  assert.equal(ThresholdEngine.calculateDamageThreshold(a), r.dt, `ThresholdEngine consumes the derived DT (${JSON.stringify(house)})`);
  const detailed = await ThresholdEngine.getDamageThreshold(a);
  assert.equal(detailed.total, r.dt, 'getDamageThreshold agrees too');
}
console.log('  ok  ThresholdEngine agrees with the derived sheet value');
// --- event-specific adjustment is contextual, never persisted into the normal DT ---
{
  const a = mk({ size: 'large', heroic: 6 });
  const r = await run(a);
  a.system.derived = { damageThreshold: r.dt, defenses: r.out['system.derived.defenses'] };
  const ev = await ThresholdEngine.getDamageThreshold(a, { thresholdAdjustment: -5 });
  assert.equal(ev.total, r.dt - 5, 'attack-specific reduction applies to this event');
  assert.equal(a.system.derived.damageThreshold, r.dt, 'the stored DT is unchanged');
  console.log('  ok  event-specific adjustment stays contextual');
}
// --- vehicles: the vehicle-derived authority; Challenge Level is NOT a RAW DT bonus; the enhanced vehicle formula is an isolated house-rule compatibility path ---
{
  const vehicle = { id: 'v1', type: 'vehicle', name: 'Ship', system: { size: 'colossal (frigate)', challengeLevel: 8, fortitudeDefense: 30, derived: { damageThreshold: 130 }, damageThreshold: 130 } };
  for (const k of Object.keys(settings)) delete settings[k];
  assert.equal(ThresholdEngine.calculateDamageThreshold(vehicle), 130, 'RAW: the vehicle-derived threshold, with no Challenge Level term');
  assert.equal(ThresholdEngine._getVehicleSizeDTModifier('colossal (frigate)'), 100);
  assert.equal(ThresholdEngine._getVehicleSizeDTModifier('colossal (cruiser)'), 200);
  assert.equal(ThresholdEngine._getVehicleSizeDTModifier('colossal (station)'), 500);
  assert.equal(ThresholdEngine._getVehicleSizeDTModifier('large'), 5);
  Object.assign(settings, ENH('fullLevel'));
  assert.equal(ThresholdEngine.calculateDamageThreshold(vehicle), 30 + 8 + 100, 'house-rule compatibility path unchanged: Fortitude + challenge level + size');
  settings.damageThresholdFormulaType = 'halfLevel';
  assert.equal(ThresholdEngine.calculateDamageThreshold(vehicle), 30 + 4 + 100);
  for (const k of Object.keys(settings)) delete settings[k];
  console.log('  ok  vehicles: derived authority, size progression, isolated house-rule path');
}
console.log('damage-threshold-single-authority: ok');
