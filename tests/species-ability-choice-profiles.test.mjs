import assert from 'node:assert/strict';
import { makeActor, selectSpecies, SpeciesRegistry } from './helpers/species-actor-sim.mjs';

// Published profiles with mutually exclusive modifier sets (Devaronian male/female, Arkanian Offshoot STR/DEX) use the
// EXISTING ability-choice mechanism inside one verified profile; the legacy variants stay resolvable for existing actors.
globalThis.window ??= globalThis;
globalThis.addEventListener ??= () => {}; globalThis.removeEventListener ??= () => {};
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
globalThis.sessionStorage ??= globalThis.localStorage;
globalThis.document ??= { addEventListener() {}, createElement() { return { style: {}, classList: { add() {}, remove() {} }, addEventListener() {} }; }, body: {} };
globalThis.navigator ??= { userAgent: 'node' };
const f = (globalThis.foundry ??= {});
f.applications ??= {}; f.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: B => B, DialogV2: class {} };
const { SpeciesStep } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/species-step.js');
const quiet = async fn => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };

const racial = a => Object.fromEntries(Object.entries(a.system.attributes).map(([k, v]) => [k, v.racial || 0]));
const step = () => { const s = Object.create(SpeciesStep.prototype); s._selectedVariantBySpeciesId = new Map(); s._selectedAbilityChoiceBySpeciesId = new Map(); return s; };

// ---- Devaronian (Legacy Era Campaign Guide p.214): male or female, no default ----
{
  const dev = SpeciesRegistry.getByName('Devaronian');
  const st = step();
  assert.equal(st._requiresAbilityChoice(st._variantAppliedEntry(dev)), true, 'a choice is required before confirming');
  const options = st._formatSpeciesAbilityChoices(st._variantAppliedEntry(dev));
  assert.deepEqual(options.map(o => o.id), ['male', 'female']);
  assert.match(options[0].label, /Male/); assert.match(options[1].label, /Female/);
  assert.deepEqual(st._formatSpeciesVariants(dev), [], 'the legacy "Female" variant is not offered next to the choice');
  assert.equal(options.filter(o => o.isSelected).length, 0);
  st._selectedAbilityChoiceBySpeciesId.set(dev.id, { id: 'female', label: 'Female', mods: options[1].mods });
  assert.deepEqual(st._formatSpeciesAbilityChoices(st._variantAppliedEntry(dev)).map(o => o.isSelected), [false, true], 'selection is by option id even though both options start with Dexterity');

  const actor = makeActor();
  await quiet(() => selectSpecies(actor, 'Devaronian', null, { strict: true, abilityChoice: { id: 'male', label: 'Male', mods: options[0].mods } }));
  assert.deepEqual(racial(actor), { str: 0, dex: 2, con: 0, int: 0, wis: -2, cha: -2 }, 'male set');
  assert.equal(actor.system.speciesVariant.sourceProfileId, 'LEG-2C-13');
  await quiet(() => selectSpecies(actor, 'Devaronian', null, { strict: true, abilityChoice: { id: 'female', label: 'Female', mods: options[1].mods } }));
  assert.deepEqual(racial(actor), { str: 0, dex: -2, con: 0, int: 2, wis: 2, cha: 0 }, 'female set replaces the male set (no stacking)');
  await quiet(() => selectSpecies(actor, 'Devaronian', null, { strict: true, abilityChoice: { id: 'female', label: 'Female', mods: options[1].mods } }));
  assert.deepEqual(racial(actor), { str: 0, dex: -2, con: 0, int: 2, wis: 2, cha: 0 }, 'idempotent');
  assert.equal(actor.flags.swse.speciesTraitIds.includes('conditional-bonus-feat'), true);

  // Existing actors that recorded the legacy variant still restore it unchanged.
  const legacy = makeActor();
  await quiet(() => selectSpecies(legacy, 'Devaronian', 'devaronian-female'));
  assert.equal(legacy.system.speciesVariant.id, 'devaronian-female');
  assert.equal(dev.variants.find(v => v.id === 'devaronian-female').supersededBy, 'devaronian-leg-2c-13', 'legacy id preserved, provenance recorded');
}

// ---- Arkanian Offshoot (Knights of the Old Republic): +2 Strength or +2 Dexterity, always -2 Constitution ----
{
  const ark = SpeciesRegistry.getByName('Arkanian Offshoot');
  const st = step();
  const options = st._formatSpeciesAbilityChoices(st._variantAppliedEntry(ark));
  assert.equal(options.length, 2);
  for (const [i, expected] of [[0, { str: 2, dex: 0, con: -2, int: 0, wis: 0, cha: 0 }], [1, { str: 0, dex: 2, con: -2, int: 0, wis: 0, cha: 0 }]]) {
    const actor = makeActor();
    await quiet(() => selectSpecies(actor, 'Arkanian Offshoot', null, { strict: true, abilityChoice: { id: options[i].id, label: options[i].label, mods: options[i].mods } }));
    assert.deepEqual(racial(actor), expected, `option ${i}`);
  }
}
console.log('PASS: species ability-choice profiles');
