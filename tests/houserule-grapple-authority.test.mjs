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
//
// Batch-1 certification correction: the initial fix (2026-09-18) kept a
// SECOND, still-known-wrong BAB+STR-only formula as the fallback for when
// system.derived.grappleBonus is unavailable -- exactly the "known-wrong
// fallback" pattern the freeze charter forbids. Replaced with
// combat-stat-rules.js#resolveGrappleBonus(), the SAME canonical formula
// packaged as an independently-callable resolver, so there is only ever
// one grapple formula, not a correct one and a known-wrong one.

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
      get: (ns, key) => {
        if (key === 'grappleEnabled') return true;
        if (key === 'grappleDCBonus') return 1;
        return undefined;
      },
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
const { resolveGrappleBonus } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js'
);

async function captureRollFormula(grappler, target) {
  let capturedFormula = null;
  const originalSafeRoll = RollEngine.safeRoll;
  RollEngine.safeRoll = async (formula) => {
    capturedFormula = formula;
    return { total: 15 };
  };
  try {
    await GrappleMechanics.performGrappleCheck(grappler, target);
  } finally {
    RollEngine.safeRoll = originalSafeRoll;
  }
  return capturedFormula;
}

const target = { system: { attributes: { bab: { value: 0 } } } };

// ---------------------------------------------------------------------------
// Test 1 — with system.derived.grappleBonus present (Gar'ee's certified
// +12), the roll formula must use it directly.
// ---------------------------------------------------------------------------
{
  const grappler = {
    isToken: false,
    system: { derived: { grappleBonus: 12 } }
  };
  const formula = await captureRollFormula(grappler, target);
  assert.equal(formula, '1d20 + 12', 'must roll against the canonical grappleBonus (+12)');
}

// ---------------------------------------------------------------------------
// Test 2 — fallback (no system.derived.grappleBonus) must call the SAME
// canonical resolveGrappleBonus() formula, not a second, independently
// wrong one. A DEX-based grappler (DEX +5 > STR +2, matching Gar'ee) must
// get credit for DEX in the fallback too -- this is exactly the case the
// old BAB+STR-only fallback got wrong.
// ---------------------------------------------------------------------------
{
  const grappler = {
    isToken: false,
    system: {
      attributes: {
        str: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 20, racial: 0, enhancement: 0, temp: 0 },
        bab: { value: 7 } // SchemaAdapters.getBAB() checks this as one candidate path
      }
    }
  };
  const formula = await captureRollFormula(grappler, target);
  assert.equal(formula, '1d20 + 12', 'fallback must use resolveGrappleBonus() (BAB 7 + DEX +5 + size 0 = 12), not BAB+STR-only (9)');
}

// ---------------------------------------------------------------------------
// Test 3 — fallback must also account for size, another term the old
// BAB+STR-only formula omitted entirely.
// ---------------------------------------------------------------------------
{
  const grappler = {
    isToken: false,
    system: {
      size: 'large',
      attributes: {
        str: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        bab: { value: 7 }
      }
    }
  };
  // BAB 7 + STR +2 + large size (+5, per the Core Rulebook's Grapple size
  // modifier table -- see combat-stat-rules.js#GRAPPLE_SIZE_MODIFIERS and
  // tests/grapple-size-modifier-book-values.test.mjs) = 14
  const formula = await captureRollFormula(grappler, target);
  assert.equal(formula, '1d20 + 14', 'fallback must include the size modifier (large = +5), which the old formula omitted');
}

// ---------------------------------------------------------------------------
// Test 4 — resolveGrappleBonus() directly, against Gar'ee's certified
// build: BAB 7 + DEX +5 (beats STR +2) + medium size (0) = 12.
// ---------------------------------------------------------------------------
{
  const garee = {
    system: {
      derived: { bab: 7 },
      attributes: {
        str: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 20, racial: 0, enhancement: 0, temp: 0 }
      }
    }
  };
  assert.equal(resolveGrappleBonus(garee), 12, "resolveGrappleBonus() must match Gar'ee's certified +12");
}

// ---------------------------------------------------------------------------
// Test 5 — getGrappleDC() must read BAB from the canonical
// SchemaAdapters.getBAB() path, not the never-populated
// system.attributes.bab.value it previously read directly.
// ---------------------------------------------------------------------------
{
  const highBabTarget = { system: { derived: { bab: 10 } } };
  const dc = GrappleMechanics.getGrappleDC(highBabTarget);
  // baseDC(10) + targetBAB(10) * dcBonus(1) = 20
  assert.equal(dc, 20, "getGrappleDC() must scale with the target's real BAB (10), not the never-populated system.attributes.bab.value (always 0)");
}

console.log('houserule-grapple-authority.test.mjs: all assertions passed');
