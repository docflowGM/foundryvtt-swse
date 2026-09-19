import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for the Math Integrity Freeze's first confirmed-fix
// batch (docs/audits/v2-math-integrity-authority-ledger.md, Damage
// Threshold domain): ThresholdEngine.computeBaseThreshold() (the base
// used by getDamageThreshold(), a live consumer of
// scripts/engine/combat/damage-resolution-engine.js:277) always
// recomputed `fortitude.total + sizeMod` from scratch, ignoring
// MetaResourceFeatResolver's feat-rule bonuses (e.g. Improved Damage
// Threshold's +5 flat bonus, "use Will as base" rules) that
// DerivedCalculator already folds into the canonical, sheet-displayed
// system.derived.damageThreshold.
//
// Fail-before proof (captured before this fix): an actor with Fortitude
// 20 and a stored system.derived.damageThreshold of 25 (fort 20 +
// Improved Damage Threshold's +5) produced computeBaseThreshold() === 20
// -- silently dropping the feat bonus.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { ThresholdEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/threshold-engine.js'
);
const { ModifierEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js'
);

// ---------------------------------------------------------------------------
// Test 1 — with system.derived.damageThreshold populated (the normal case
// for any actor that has gone through prepareDerivedData), it must be
// trusted as-is, including any feat-rule bonus it already includes.
// ---------------------------------------------------------------------------
{
  const actor = {
    type: 'character',
    system: {
      size: 'medium',
      derived: {
        defenses: { fortitude: { total: 20 } },
        damageThreshold: 25 // fort 20 + Improved Damage Threshold's +5
      }
    },
    items: []
  };
  assert.equal(
    ThresholdEngine.computeBaseThreshold(actor), 25,
    'must agree with the canonical, feat-rule-aware system.derived.damageThreshold (25), not recompute fort+size (20)'
  );
}

// ---------------------------------------------------------------------------
// Test 2 — an actor with no feat bonus (derived.damageThreshold equals
// fort+size exactly) must still produce the correct number -- proves the
// fix isn't "always add 5."
// ---------------------------------------------------------------------------
{
  const actor = {
    type: 'character',
    system: {
      size: 'medium',
      derived: {
        defenses: { fortitude: { total: 18 } },
        damageThreshold: 18 // no feat bonus, no size bonus
      }
    },
    items: []
  };
  assert.equal(ThresholdEngine.computeBaseThreshold(actor), 18, 'an actor with no feat bonus must resolve to fort total unchanged');
}

// ---------------------------------------------------------------------------
// Test 3 — fallback path: an actor whose derived data hasn't been
// computed yet (no system.derived.damageThreshold at all) must still
// fall back to the raw fort+size formula, preserving prior behavior for
// that edge case.
// ---------------------------------------------------------------------------
{
  const actor = {
    type: 'character',
    system: {
      size: 'medium',
      derived: { defenses: { fortitude: { total: 20 } } }
    },
    items: []
  };
  assert.equal(ThresholdEngine.computeBaseThreshold(actor), 20, 'must fall back to fort+size when derived.damageThreshold is unavailable');
}

// ---------------------------------------------------------------------------
// Test 4 — getDamageThreshold() must NOT double-count a static
// "defense.damageThreshold" ModifierEngine modifier that's already folded
// into the canonical system.derived.damageThreshold. DerivedCalculator
// builds that field via modifierMap['defense.damageThreshold'], and
// modifierMap comes from ModifierEngine.aggregateAll(), which internally
// calls the SAME getAllModifiers() this function re-queries -- so
// re-adding those modifiers on top of the canonical base double-counts
// them. Fail-before proof (captured before this fix): a stored 25 (fort
// 20 + a +5 modifier, already included) became 30 once
// computeBaseThreshold() started returning the canonical value.
// ---------------------------------------------------------------------------
{
  const actor = {
    system: {
      size: 'medium',
      derived: {
        defenses: { fortitude: { total: 20 } },
        damageThreshold: 25 // fort 20 + a +5 static modifier, already included
      }
    },
    items: []
  };
  const originalGetAllModifiers = ModifierEngine.getAllModifiers;
  ModifierEngine.getAllModifiers = async () => [
    { target: 'defense.damageThreshold', value: 5, enabled: true }
  ];
  try {
    const result = await ThresholdEngine.getDamageThreshold(actor, {});
    assert.equal(result.total, 25, 'must not double-count a static DT modifier already folded into the canonical base (25, not 30)');
  } finally {
    ModifierEngine.getAllModifiers = originalGetAllModifiers;
  }
}

// ---------------------------------------------------------------------------
// Test 5 — the fallback path (no canonical system.derived.damageThreshold
// yet) must still correctly apply static ModifierEngine DT modifiers,
// since in that case they were never included in `base` to begin with.
// ---------------------------------------------------------------------------
{
  const actor = {
    system: {
      size: 'medium',
      derived: { defenses: { fortitude: { total: 20 } } }
    },
    items: []
  };
  const originalGetAllModifiers = ModifierEngine.getAllModifiers;
  ModifierEngine.getAllModifiers = async () => [
    { target: 'defense.damageThreshold', value: 5, enabled: true }
  ];
  try {
    const result = await ThresholdEngine.getDamageThreshold(actor, {});
    assert.equal(result.total, 25, 'fallback path (no canonical value) must still apply the static modifier once (fort20+size0+modifier5)');
  } finally {
    ModifierEngine.getAllModifiers = originalGetAllModifiers;
  }
}

console.log('damage-threshold-authority.test.mjs: all assertions passed');
