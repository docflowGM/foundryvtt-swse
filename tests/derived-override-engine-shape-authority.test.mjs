import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-DC P0 (owner directive): DerivedOverrideEngine dotted-key overrides vs the FULL objects DerivedCalculator writes. Defense base 18 + an ADD of 2 must be 20;
// before the fix the override read only the dotted key, started from a default of 10 and wrote a stray conflicting `...reflex.total` = 12 next to the
// untouched object value 18. The same applies to hp/initiative objects; plain numeric keys (bab) and dotted-only bundles keep working.
registerFoundryPathLoader();
installFoundryShimGlobals();
const { DerivedOverrideEngine } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/passive/derived-override-engine.js');
const add = (target, amount) => ({ operation: 'ADD', target, value: { type: 'STATIC', amount } });
const actor = { id: 'o1', type: 'character', system: {}, items: [] };

{
  const updates = { 'system.derived.defenses': { reflex: { total: 18 }, fortitude: { total: 15 }, will: { total: 14 } } };
  DerivedOverrideEngine.apply(actor, [add('defense.reflex', 2)], updates);
  assert.equal(updates['system.derived.defenses'].reflex.total, 20, 'base 18 + 2 = 20 on the real object value');
  assert.equal(updates['system.derived.defenses'].fortitude.total, 15, 'other defenses untouched');
  assert.equal('system.derived.defenses.reflex.total' in updates, false, 'no stray conflicting dotted key');
  console.log('  ok  defense object: 18 + 2 = 20');
}
{
  const updates = { 'system.derived.hp': { total: 40, max: 40 }, 'system.derived.initiative': { total: 3 } };
  DerivedOverrideEngine.apply(actor, [add('hp.total', 5), add('initiative.total', 2)], updates);
  assert.equal(updates['system.derived.hp'].total, 45);
  assert.equal(updates['system.derived.initiative'].total, 5);
  assert.equal('system.derived.hp.total' in updates, false);
  console.log('  ok  hp / initiative objects');
}
{
  const updates = { 'system.derived.bab': 7, 'system.derived.defenses.will.total': 12 };
  DerivedOverrideEngine.apply(actor, [add('bab', 1), add('defense.will', 2)], updates);
  assert.equal(updates['system.derived.bab'], 8);
  assert.equal(updates['system.derived.defenses.will.total'], 14, 'an existing dotted key is still the slot');
  console.log('  ok  numeric key and dotted-only bundle unchanged');
}
{
  const updates = {};
  DerivedOverrideEngine.apply(actor, [add('defense.reflex', 2)], updates);
  assert.equal(updates['system.derived.defenses.reflex.total'], 12, 'with nothing computed the documented 10 default still applies (legacy fallback)');
  console.log('  ok  no computed value: legacy default preserved');
}
console.log('derived-override-engine-shape-authority: ok');
