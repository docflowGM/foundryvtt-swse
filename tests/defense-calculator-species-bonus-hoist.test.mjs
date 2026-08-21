import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 3 — derived-data + performance optimization, Fix #3:
// DefenseCalculator._collectSpeciesDefenseBonus(actor, defenseType) used to
// independently re-filter actor.items for type === 'species' on every call,
// and DefenseCalculator.calculate() calls it three times per invocation
// (fortitude/reflex/will) for the same unchanged actor state. calculate()
// now filters actor.items for species items once and passes that array
// through via a new optional third parameter; the method still falls back
// to filtering actor.items itself when no array is supplied, so any other
// caller (none currently exist, but the contract stays backward compatible)
// is unaffected.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { DefenseCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js'
);

function makeSpeciesItem(rules) {
  return {
    id: 'species-1',
    type: 'species',
    name: 'Test Species',
    system: {
      structuralTraits: [
        { rules }
      ]
    }
  };
}

// ── passing a pre-filtered speciesItems array is honored instead of re-deriving from actor.items (Test 1) ──

{
  const speciesItem = makeSpeciesItem([{ type: 'defenseModifier', defense: 'reflex', value: 3 }]);
  // actor.items is deliberately empty -- if the method ignored the passed
  // array and re-derived from actor.items, it would find nothing and return 0.
  const actor = { system: {}, items: [], flags: {} };

  const bonus = DefenseCalculator._collectSpeciesDefenseBonus(actor, 'reflex', [speciesItem]);
  assert.equal(bonus, 3, 'a pre-filtered speciesItems array must be used directly instead of re-scanning actor.items');
}

// ── omitting speciesItems falls back to filtering actor.items itself (backward compatible) (Test 2) ──

{
  const speciesItem = makeSpeciesItem([{ type: 'defenseModifier', defense: 'fortitude', value: 2 }]);
  const otherItem = { id: 'w1', type: 'weapon', name: 'Blaster', system: {} };
  const actor = { system: {}, items: [otherItem, speciesItem], flags: {} };

  const bonus = DefenseCalculator._collectSpeciesDefenseBonus(actor, 'fortitude');
  assert.equal(bonus, 2, 'omitting speciesItems must still filter actor.items for type === "species" as before');
}

// ── pre-filtered array and self-derived path produce identical results for the same actor (Test 3) ──

{
  const speciesItem = makeSpeciesItem([{ type: 'defenseModifier', defense: 'will', value: -1 }]);
  const actor = { system: {}, items: [speciesItem], flags: {} };
  const speciesItemsForDefense = actor.items.filter(item => item?.type === 'species');

  const viaSelfDerived = DefenseCalculator._collectSpeciesDefenseBonus(actor, 'will');
  const viaPreFiltered = DefenseCalculator._collectSpeciesDefenseBonus(actor, 'will', speciesItemsForDefense);
  assert.equal(viaPreFiltered, viaSelfDerived, 'passing the equivalent pre-filtered array must not change the result');
  assert.equal(viaPreFiltered, -1);
}

// ── zero species items behaves identically for both call shapes (Test 4) ──

{
  const actor = { system: {}, items: [], flags: {} };
  assert.equal(DefenseCalculator._collectSpeciesDefenseBonus(actor, 'reflex'), 0);
  assert.equal(DefenseCalculator._collectSpeciesDefenseBonus(actor, 'reflex', []), 0);
}

console.log('defense-calculator-species-bonus-hoist.test.mjs: all assertions passed');
