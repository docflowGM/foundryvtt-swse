import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Batch 1, round 7: Grabbed/Grappled/Pinned no
// longer carry a bogus flat -5 Reflex Defense penalty
// (docs/audits/v2-math-integrity-authority-ledger.md, "Certification-
// correction addendum 7"; docs/audits/combat-phase-0f-grapple-ion-seam-
// ledger.json's "grapple-grabbed-reflex-penalty" and
// "grapple-pinned-condition-track-override" entries).
//
// The real SWSE rules:
//   Grabbed:  cannot move; -2 on attack rolls except natural/light
//             weapons. NO Reflex Defense penalty.
//   Grappled: same baseline restrictions as Grabbed. NO Reflex penalty.
//   Pinned:   loses its POSITIVE Dexterity bonus to Reflex Defense -- a
//             component-aware reduction (a Dex -1 character loses nothing
//             further; a Dex +5 character loses exactly 5), not a flat
//             universal number.
//
// grapple-state-engine.js previously applied
// `system.defenses.reflex.bonus += -5` (a Foundry ActiveEffect ADD-mode
// change) to all three states -- a number that appears nowhere in the
// published rules text, and which DefenseCalculator's canonical Reflex
// total does not even read as an input (grep-confirmed: `reflexState.bonus`
// is never consulted anywhere in defense-calculator.js). Fixed by removing
// the ActiveEffect changes entirely for all three states and computing
// Pin's real, component-aware Dex-bonus removal directly in
// DefenseCalculator.calculate() (mirroring the same philosophy already
// certified for flat-footed Reflex's own Dex-bonus removal -- see
// flat-footed-dodge-bonus-authority.test.mjs), via the actor's live
// grapple state (grapple-state-query.js, a dependency-free leaf module
// shared with GrappleStateEngine so this is one state-lookup authority,
// not two).
//
// This test live-executes the real DefenseCalculator.calculate() (not a
// reimplementation) against actors carrying real ActiveEffect-shaped
// Grabbed/Grappled/Pinned state, proving the canonical Reflex total.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { DefenseCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js'
);

function actorWithDex(dexBase, grappleState = null) {
  const effects = grappleState
    ? [{ flags: { swse: { grappleState: { state: grappleState, sourceId: 'attacker-1' } } } }]
    : [];
  return {
    type: 'character',
    effects,
    system: {
      attributes: { dex: { base: dexBase, racial: 0, enhancement: 0, temp: 0 } },
      abilities: {},
      defenses: {},
      conditionTrack: { current: 0 }
    },
    items: []
  };
}

// ─── 1. Grabbed and Grappled: no Reflex penalty at all ─────────────────────

{
  const baseline = await DefenseCalculator.calculate(actorWithDex(20, null), [], {}, {});
  const grabbed = await DefenseCalculator.calculate(actorWithDex(20, 'grabbed'), [], {}, {});
  const grappled = await DefenseCalculator.calculate(actorWithDex(20, 'grappled'), [], {}, {});
  assert.equal(baseline.reflex.total, 15, 'sanity: dex 20 (mod +5) with no state gives Reflex 15 (10 + 5)');
  assert.equal(grabbed.reflex.total, 15, 'Grabbed must not reduce Reflex Defense at all');
  assert.equal(grappled.reflex.total, 15, 'Grappled must not reduce Reflex Defense at all');
  assert.equal(grabbed.reflex.pinnedDexReduction, -0, 'Grabbed must report zero Pin-specific Dex reduction');
  assert.equal(grappled.reflex.pinnedDexReduction, -0, 'Grappled must report zero Pin-specific Dex reduction');
}

console.log('  [1/3] Grabbed and Grappled apply no Reflex Defense penalty at all OK');

// ─── 2. Pinned: component-aware removal of the POSITIVE Dex bonus only ────

{
  const cases = [
    { label: 'Dex +5 contribution', dexBase: 20, expectedBaseline: 15, expectedReduction: 5 },
    { label: 'Dex +1 contribution', dexBase: 12, expectedBaseline: 11, expectedReduction: 1 },
    { label: 'Dex +0 contribution', dexBase: 10, expectedBaseline: 10, expectedReduction: 0 },
    { label: 'Dex -1 contribution (a penalty, not a bonus)', dexBase: 8, expectedBaseline: 9, expectedReduction: 0 }
  ];
  for (const { label, dexBase, expectedBaseline, expectedReduction } of cases) {
    const baseline = await DefenseCalculator.calculate(actorWithDex(dexBase, null), [], {}, {});
    const pinned = await DefenseCalculator.calculate(actorWithDex(dexBase, 'pinned'), [], {}, {});
    assert.equal(baseline.reflex.total, expectedBaseline, `[Pinned, ${label}] sanity baseline`);
    assert.equal(pinned.reflex.total, expectedBaseline - expectedReduction, `[Pinned, ${label}] Reflex total must remove exactly the positive Dex contribution, never a Dex penalty`);
    assert.equal(pinned.reflex.pinnedDexReduction, -expectedReduction, `[Pinned, ${label}] the removal must be an explicit, provable line item`);
    assert.equal(
      pinned.reflex.base + pinned.reflex.abilityMod + pinned.reflex.miscBonus + pinned.reflex.speciesBonus + pinned.reflex.stateBonus + pinned.reflex.adjustment + pinned.reflex.conditionPenalty + pinned.reflex.pinnedDexReduction,
      pinned.reflex.total,
      `[Pinned, ${label}] every listed reflex part, including pinnedDexReduction, must sum to the displayed total`
    );
  }
}

console.log('  [2/3] Pinned removes exactly the positive Dex bonus (never a Dex penalty), as an explicit line item that sums to the total OK');

// ─── 3. Regression guard: no grapple state may write a flat Reflex bonus ───
//        via an ActiveEffect change. Reads the real source directly rather
//        than only testing today's computed values, so a future edit that
//        reintroduces `system.defenses.reflex.bonus` on any of the three
//        states fails this test even before it could reach a live actor.

{
  const source = readFileSync(
    new URL('../scripts/engine/combat/grapple-state-engine.js', import.meta.url),
    'utf8'
  );
  // Checks for the actual change-object shape (a quoted key), not prose --
  // this file's own history comment mentions the string
  // "system.defenses.reflex.bonus" without quoting it as an object key.
  assert.ok(!/['"]system\.defenses\.reflex\.bonus['"]/.test(source), 'grapple-state-engine.js must never write system.defenses.reflex.bonus for any state');
  assert.ok(!/value:\s*-5/.test(source), 'grapple-state-engine.js must not carry a flat -5 ActiveEffect change for any grapple state');
}

console.log('  [3/3] Repository-wide guard: grapple-state-engine.js contains no flat Reflex-bonus ActiveEffect change for any state OK');

console.log('grapple-state-defense-effects.test.mjs: all assertions passed');
