import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for the Math Integrity Freeze's first confirmed-fix
// batch (docs/audits/v2-math-integrity-authority-ledger.md, Grapple
// domain): GrappleMechanics.performGrappleCheck()
// (scripts/houserules/houserule-grapple.js) built its d20 roll formula
// from `bab + strMod` only -- omitting size modifier and species bonus,
// and hardcoding STR even for a DEX-based grappler -- rather than reading
// the canonical system.derived.grappleBonus (BAB + best of STR/DEX + size
// + species, computed by derived-calculator.js).
//
// Fail-before proof: Gar'ee's certified Grapple = +12 (BAB 7 + DEX +5 +
// size 0) requires the DEX-vs-STR "better of" comparison (his DEX +5 >
// STR +2). The old formula would compute 7 + 2 = 9 instead.

registerFoundryPathLoader();
// grappleEnabled() reads game.settings.get('foundryvtt-swse', 'grappleEnabled')
// via HouseRuleService, which additionally requires settings.set (readiness
// check) and settings.settings.has(fullKey) (registration check) before it
// will trust a registered value instead of silently falling back -- enable
// all three so performGrappleCheck() doesn't short-circuit before reaching
// the formula under test.
installFoundryShimGlobals({
  game: {
    settings: {
      get: (ns, key) => (key === 'grappleEnabled' ? true : undefined),
      set: () => {},
      settings: { has: () => true }
    }
  }
});

const { GrappleMechanics } = await import(
  '/systems/foundryvtt-swse/scripts/houserules/houserule-grapple.js'
);
const { RollEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/roll-engine.js'
);

function gareeShapedGrappler({ derivedGrapple } = {}) {
  return {
    isToken: false,
    system: {
      attributes: { bab: { value: 7 }, str: { mod: 2 } },
      ...(derivedGrapple !== undefined ? { derived: { grappleBonus: derivedGrapple } } : {})
    }
  };
}

const target = { system: { attributes: { bab: { value: 0 } } } };

// ---------------------------------------------------------------------------
// Test 1 — with system.derived.grappleBonus present (Gar'ee's certified
// +12), the roll formula must use it, not BAB+STR-only.
// ---------------------------------------------------------------------------
{
  let capturedFormula = null;
  const originalSafeRoll = RollEngine.safeRoll;
  RollEngine.safeRoll = async (formula) => {
    capturedFormula = formula;
    return { total: 15 };
  };
  try {
    await GrappleMechanics.performGrappleCheck(gareeShapedGrappler({ derivedGrapple: 12 }), target);
  } finally {
    RollEngine.safeRoll = originalSafeRoll;
  }
  assert.equal(capturedFormula, '1d20 + 12', 'must roll against the canonical grappleBonus (+12), not the old BAB+STR-only formula (+9)');
}

// ---------------------------------------------------------------------------
// Test 2 — fallback still applies when system.derived.grappleBonus is
// absent (e.g. an actor whose derived data hasn't been computed yet),
// preserving prior behavior for that edge case.
// ---------------------------------------------------------------------------
{
  let capturedFormula = null;
  const originalSafeRoll = RollEngine.safeRoll;
  RollEngine.safeRoll = async (formula) => {
    capturedFormula = formula;
    return { total: 15 };
  };
  try {
    await GrappleMechanics.performGrappleCheck(gareeShapedGrappler(), target);
  } finally {
    RollEngine.safeRoll = originalSafeRoll;
  }
  assert.equal(capturedFormula, '1d20 + 9', 'must fall back to BAB+STR when derived.grappleBonus is unavailable');
}

console.log('houserule-grapple-authority.test.mjs: all assertions passed');
