import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression coverage for the Math Integrity Freeze's Grapple domain
// (docs/audits/v2-math-integrity-authority-ledger.md), completing the
// SSOT extraction a second certification review required: this repo
// previously had TWO independent implementations of the grapple formula
// (BAB + best of STR/DEX + size + species) -- derived-calculator.js's
// inline system.derived.grappleBonus block, and
// combat-stat-rules.js#resolveGrappleBonus() -- that happened to agree
// today but were not a single source of truth. Extracted the arithmetic
// into combat-stat-rules.js#computeGrappleBonus({bab, strMod, dexMod,
// sizeMod, speciesBonus}), a pure function over already-resolved inputs.
// derived-calculator.js now supplies its own fresh current-pass inputs to
// it directly (not via resolveGrappleBonus(actor), since some of those
// values may not be written back onto `actor` yet mid-pass);
// resolveGrappleBonus(actor) resolves the same inputs from a live actor
// via SchemaAdapters and delegates to the same function.
//
// This extraction also fixed an independently-discovered defect found
// while doing it: derived-calculator.js read `bab.total` for the BAB
// term, but BABCalculator.calculate() always returns a plain number, not
// an object -- so `bab.total` was always `undefined` and
// system.derived.grappleBonus was always NaN. This was silently masked
// on the character sheet by PanelContextBuilder.js's
// `Number.isFinite(grappleCandidate)` guard falling back to its own
// (correct) duplicate formula, so no player-visible symptom was ever
// produced -- but the canonical derived value itself has never actually
// worked until this fix.
//
// Required invariant, proven below across 5 input combinations (STR>DEX,
// DEX>STR, Medium, Large, a species grapple bonus):
//   computeGrappleBonus() === DerivedCalculator's system.derived.grappleBonus
//                          === resolveGrappleBonus(actor)
//                          === the grapple roll modifier (houserule-grapple.js)

registerFoundryPathLoader();
installFoundryShimGlobals({
  game: {
    settings: {
      get: (ns, key) => (key === 'grappleEnabled' ? true : (key === 'grappleDCBonus' ? 0 : undefined)),
      set: () => {},
      settings: { has: () => true }
    }
  }
});

const { DerivedCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js'
);
const { resolveGrappleBonus, computeGrappleBonus } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js'
);
const { GrappleMechanics } = await import(
  '/systems/foundryvtt-swse/scripts/houserules/houserule-grapple.js'
);
const { RollEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/roll-engine.js'
);

function actorFor({ str, dex, size = 'medium', speciesGrapple = 0 }) {
  return {
    type: 'character',
    name: 'Grapple SSOT Parity Test',
    system: {
      level: 8,
      size,
      skills: {},
      progression: { classLevels: [] },
      attributes: {
        str: { base: str, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: dex, racial: 0, enhancement: 0, temp: 0 }
      },
      speciesCombatBonuses: speciesGrapple ? { grapple: speciesGrapple } : undefined,
      hp: { max: 50, value: 50 }
    },
    items: []
  };
}

async function rollFormulaGrappleBonus(grappler) {
  let capturedFormula = null;
  const originalSafeRoll = RollEngine.safeRoll;
  RollEngine.safeRoll = async (formula) => {
    capturedFormula = formula;
    return { total: 15 };
  };
  try {
    await GrappleMechanics.performGrappleCheck(grappler, { system: {} });
  } finally {
    RollEngine.safeRoll = originalSafeRoll;
  }
  const match = /^1d20 \+ (-?\d+)$/.exec(capturedFormula ?? '');
  return match ? Number(match[1]) : null;
}

const cases = [
  { label: 'STR > DEX, medium size', str: 16, dex: 10, size: 'medium', speciesGrapple: 0 },
  { label: 'DEX > STR, medium size (Gar\'ee-shaped)', str: 14, dex: 20, size: 'medium', speciesGrapple: 0 },
  { label: 'medium size, equal STR/DEX', str: 12, dex: 12, size: 'medium', speciesGrapple: 0 },
  { label: 'large size', str: 14, dex: 10, size: 'large', speciesGrapple: 0 },
  { label: 'species grapple bonus', str: 14, dex: 10, size: 'medium', speciesGrapple: 4 }
];

for (const { label, str, dex, size, speciesGrapple } of cases) {
  const actor = actorFor({ str, dex, size, speciesGrapple });

  // Path 1: DerivedCalculator's own current-pass computation.
  const updates = await DerivedCalculator.computeAll(actor);
  const derivedValue = updates['system.derived.grappleBonus'];

  // Path 2: resolveGrappleBonus(actor), reading a live actor whose
  // derived BAB has been applied (simulating post-prepare state).
  const liveActor = actorFor({ str, dex, size, speciesGrapple });
  liveActor.system.derived = { bab: updates['system.derived.bab'] ?? 0 };
  const resolvedValue = resolveGrappleBonus(liveActor);

  // Path 3: computeGrappleBonus() called directly with the same raw inputs.
  const strMod = Math.floor((str - 10) / 2);
  const dexMod = Math.floor((dex - 10) / 2);
  const { getGrappleSizeModifier } = await import(
    '/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js'
  );
  const directValue = computeGrappleBonus({
    bab: updates['system.derived.bab'] ?? 0,
    strMod,
    dexMod,
    sizeMod: getGrappleSizeModifier(size),
    speciesBonus: speciesGrapple
  });

  // Path 4: the actual grapple roll formula (houserule-grapple.js), reading
  // the same live actor as path 2.
  const rollValue = await rollFormulaGrappleBonus(liveActor);

  assert.ok(Number.isFinite(derivedValue), `[${label}] DerivedCalculator's grappleBonus must be a real number, not NaN/undefined`);
  assert.equal(resolvedValue, derivedValue, `[${label}] resolveGrappleBonus() must match DerivedCalculator's grappleBonus`);
  assert.equal(directValue, derivedValue, `[${label}] computeGrappleBonus() must match DerivedCalculator's grappleBonus`);
  assert.equal(rollValue, derivedValue, `[${label}] the actual grapple roll modifier must match DerivedCalculator's grappleBonus`);
}

console.log('grapple-bonus-ssot-parity.test.mjs: all assertions passed (computeGrappleBonus === DerivedCalculator === resolveGrappleBonus === roll modifier, across 5 input combinations)');
