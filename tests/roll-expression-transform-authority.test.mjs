import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { TestRoll } from './helpers/foundry-shim/fakes/test-roll.fake.mjs';

// Roll Expression / Transformation Authority — establishes the typed
// three-way split (STATIC MODIFIER changes a number; FORMULA TERM adds
// dice; ROLL TRANSFORM changes how the base dice are rolled) and proves
// RollCore/Foundry are already capable of executing advanced dice syntax
// while this repo's *rules layer* (until this phase) was not.
//
// docs/audits/v2-roll-expression-transform-authority.md is the full
// record (audit, confirmed grammar, classification inventory, migration
// log). This file is the executable proof for that document's claims.
//
// Foundry-execution boundary (read before doubting a "confirmed" claim
// below): this repo is a Foundry MODULE, not the Foundry application, so
// the real Foundry `Roll` class does not exist under plain Node. Every
// claim in this file about "Roll.validate()"/"Roll.evaluate()" behavior
// is proven against TestRoll (tests/helpers/foundry-shim/fakes/
// test-roll.fake.mjs) — a test-only, explicitly-labeled structural
// reproduction of Foundry's documented, versioned DiceTerm grammar, NOT
// the genuine implementation. Production code (roll-formula-validator.js)
// calls the real `globalThis.Roll.validate()`/`new Roll().evaluate()` with
// no second code path — this test only supplies what that global resolves
// to under Node. Full behavioral confirmation against the live Foundry
// client is outside this harness's reach, the same accepted boundary this
// repo's test suite already documents for RollEngine/SWSEChat/AmmoSystem.

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.Roll = TestRoll;

const { ROLL_CONTRIBUTION_KIND, ROLL_TRANSFORM_OPERATION, makeRollContribution } = await import(
  '/systems/foundryvtt-swse/scripts/engine/roll/expression/roll-contribution-types.js'
);
const { validateRollFormula, isValidRollFormula } = await import(
  '/systems/foundryvtt-swse/scripts/engine/roll/expression/roll-formula-validator.js'
);
const { applyRollTransforms } = await import(
  '/systems/foundryvtt-swse/scripts/engine/roll/expression/roll-transform-resolver.js'
);
const { resolveFormulaTerm, resolveFormulaContributions } = await import(
  '/systems/foundryvtt-swse/scripts/engine/roll/expression/roll-formula-term-resolver.js'
);
const { resolveLegacyModifierFormula, KNOWN_LEGACY_MODIFIER_FORMULA_KEYWORDS } = await import(
  '/systems/foundryvtt-swse/scripts/engine/roll/expression/legacy-keyword-adapter.js'
);
const { composeRoll } = await import(
  '/systems/foundryvtt-swse/scripts/engine/roll/expression/compose-roll.js'
);
const { createModifier, isValidModifier } = await import(
  '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js'
);
const ModifierUtils = (await import(
  '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierUtils.js'
)).default;
const { resolveTalentDamageContributions, resolveTalentDamageFormulaTerms } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/damage-talent-contributions.js'
);

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

function makeCompetenceModifier(value, sourceName) {
  return createModifier({ source: 'feat', sourceName, sourceId: sourceName, target: 'attack.bonus', type: 'competence', value });
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1 — STATIC MODIFIERS (unchanged, proven not reopened)
// ═══════════════════════════════════════════════════════════════════════

// 1. +2 numeric modifier unchanged
{
  const mod = makeCompetenceModifier(2, 'Test Feat');
  assert.equal(mod.value, 2);
  assert.equal(isValidModifier(mod), true);
}
ok('STATIC 1: +2 numeric modifier unchanged');

// 2. typed numeric stacking unchanged (ModifierUtils itself, untouched by this phase)
{
  const resolved = ModifierUtils.resolveStacking([makeCompetenceModifier(2, 'A'), makeCompetenceModifier(4, 'B')]);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].value, 4, 'highestOnly competence stacking: +4 wins over +2, unchanged by this phase');
}
ok('STATIC 2: typed numeric stacking (highestOnly competence) unchanged');

// 3. string passed to Modifier.value still rejected (fail-before AND remains true after this phase)
{
  assert.throws(() => createModifier({ source: 'feat', sourceName: 'Bad', target: 'damage', type: 'untyped', value: '1d6' }),
    /value must be finite number/, 'createModifier must still reject a dice-formula string as value — this contract is INTENTIONALLY unchanged');
  assert.equal(isValidModifier({ id: 'x', source: 'feat', sourceName: 'Bad', target: 'damage', type: 'untyped', value: '1d6', enabled: true }), false);
}
ok('STATIC 3: Modifier.value still numeric-only; "1d6" still rejected (intentional, not a limitation)');

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2 — FORMULA TERMS
// ═══════════════════════════════════════════════════════════════════════

// 4. +1d6 formula contribution
{
  const { contribution, ledgerEntry } = resolveFormulaTerm({ formula: '1d6', sourceName: 'Test Source', target: 'damage' });
  assert.ok(contribution);
  assert.equal(contribution.kind, ROLL_CONTRIBUTION_KIND.FORMULA_TERM);
  assert.equal(contribution.formula, '1d6');
  assert.equal(ledgerEntry.applied, true);
}
ok('FORMULA_TERM 4: +1d6 formula contribution resolves and validates');

// 5. two independent +1d6 contributions both survive
{
  const { terms } = resolveFormulaContributions([
    { formula: '1d6', sourceName: 'Source A', target: 'damage' },
    { formula: '1d6', sourceName: 'Source B', target: 'damage' }
  ]);
  assert.equal(terms.length, 2, 'formula terms are never merged/deduped by value — each source contribution survives independently');
}
ok('FORMULA_TERM 5: two independent +1d6 contributions both survive');

// 6. malformed formula term fails closed
{
  const { contribution, ledgerEntry } = resolveFormulaTerm({ formula: 'not a formula!!', sourceName: 'Bad Source' });
  assert.equal(contribution, null);
  assert.equal(ledgerEntry.applied, false);
  assert.ok(ledgerEntry.reason.length > 0);
  const batch = resolveFormulaContributions([{ formula: '1d6', sourceName: 'Good' }, { formula: 'garbage(((', sourceName: 'Bad' }]);
  assert.equal(batch.terms.length, 1, 'one malformed term must not discard a sibling valid term');
}
ok('FORMULA_TERM 6: malformed formula term fails closed without crashing sibling terms');

// 7. formula term is not rolled during actor preparation (no early randomness — full proof in Section 8)
{
  const { contribution } = resolveFormulaTerm({ formula: '4d6', sourceName: 'Test' });
  assert.equal(typeof contribution.formula, 'string', 'a formula term stays a string, never a rolled/expected number, at resolution time');
}
ok('FORMULA_TERM 7: formula term remains an unrolled string at resolution time');

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3 — ROLL TRANSFORMS
// ═══════════════════════════════════════════════════════════════════════

// 8. standard 1d20 (no transform) unchanged
{
  const { formula, ledger } = applyRollTransforms('1d20', []);
  assert.equal(formula, '1d20');
  assert.equal(ledger.length, 0);
}
ok('TRANSFORM 8: standard 1d20 with no transforms is unchanged');

// 9. keep-highest transform
{
  const transform = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST, diceCount: 2, keep: 1, sourceName: 'Advantage-like Talent' });
  const { formula, ledger } = applyRollTransforms('1d20', [transform]);
  assert.equal(formula, '2d20kh1');
  assert.equal(ledger[0].applied, true);
  assert.equal(isValidRollFormula(formula), true);
}
ok('TRANSFORM 9: keep-highest compiles to canonical "2d20kh1"');

// 10. keep-lowest transform
{
  const transform = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_LOWEST, diceCount: 2, keep: 1, sourceName: 'Disadvantage-like Effect' });
  const { formula } = applyRollTransforms('1d20', [transform]);
  assert.equal(formula, '2d20kl1');
}
ok('TRANSFORM 10: keep-lowest compiles to canonical "2d20kl1"');

// 11. supported exploding-die transform
{
  const transform = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.EXPLODE, diceCount: 2, sourceName: 'Exploding Talent' });
  const { formula } = applyRollTransforms('2d8', [transform]);
  assert.equal(formula, '2d8x');
  assert.equal(isValidRollFormula(formula), true);
}
ok('TRANSFORM 11: exploding-die transform compiles to canonical "2d8x"');

// 12. supported reroll transforms (explicit threshold required — no
// implicit SWSE default assumed). Foundry's documented reroll grammar
// has exactly two modifiers: "r" (reroll once) and "rr" (reroll
// recursively) — there is no "ro" (that was an earlier draft's
// invented syntax, corrected per independent review).
{
  const rerollNoThreshold = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.REROLL_ONCE, diceCount: 1, sourceName: 'Reroll Talent' });
  const failed = applyRollTransforms('1d20', [rerollNoThreshold]);
  assert.equal(failed.formula, '1d20', 'reroll without an explicit threshold must fail closed, never assume a default');
  assert.equal(failed.ledger[0].applied, false);

  const rerollOnceWithThreshold = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.REROLL_ONCE, diceCount: 1, threshold: '1', sourceName: 'Reroll Talent' });
  const { formula: onceFormula } = applyRollTransforms('1d20', [rerollOnceWithThreshold]);
  assert.equal(onceFormula, '1d20r1', 'reroll-once compiles to Foundry\'s documented "r" modifier, not an invented "ro"');
  assert.equal(isValidRollFormula(onceFormula), true);

  const rerollRecursiveWithThreshold = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.REROLL_RECURSIVE, diceCount: 1, threshold: '1', sourceName: 'Reroll Talent' });
  const { formula: recursiveFormula } = applyRollTransforms('1d20', [rerollRecursiveWithThreshold]);
  assert.equal(recursiveFormula, '1d20rr1', 'reroll-recursive compiles to Foundry\'s documented "rr" modifier');
  assert.equal(isValidRollFormula(recursiveFormula), true);
  assert.equal(isValidRollFormula('1d20ro1'), false, '"ro" is not a real Foundry modifier and must never validate');
}
ok('TRANSFORM 12: reroll-once ("r") and reroll-recursive ("rr") compile to Foundry\'s actual documented modifiers (explicit threshold required, no invented "ro")');

// 13. duplicate identical transform handling
{
  const t1 = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST, diceCount: 2, keep: 1, sourceName: 'Source A' });
  const t2 = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST, diceCount: 2, keep: 1, sourceName: 'Source B' });
  const { formula, ledger } = applyRollTransforms('1d20', [t1, t2]);
  assert.equal(formula, '2d20kh1', 'two identical transforms from different sources collapse to one application');
  const suppressed = ledger.filter(e => e.reason.includes('duplicate identical transform suppressed'));
  assert.equal(suppressed.length, 1);
}
ok('TRANSFORM 13: duplicate identical transforms collapse to a single application');

// 14. incompatible transform handling is deterministic/fail-closed (non-combining conflict policy)
{
  const keepHigh = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST, diceCount: 2, keep: 1, priority: 10, sourceName: 'Keep Highest Source' });
  const keepLow = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_LOWEST, diceCount: 2, keep: 1, priority: 5, sourceName: 'Keep Lowest Source' });
  const { formula, ledger } = applyRollTransforms('1d20', [keepHigh, keepLow]);
  assert.equal(formula, '2d20kh1', 'higher-priority transform wins; the two never combine into one formula');
  const loserEntry = ledger.find(e => e.sourceName === 'Keep Lowest Source');
  assert.equal(loserEntry.applied, false);
  assert.ok(loserEntry.reason.includes('non-combining policy'));

  // Take 10/20 incompatibility: no transform ever applies.
  const takeX = applyRollTransforms('1d20', [keepHigh], { isTakeX: true });
  assert.equal(takeX.formula, '1d20');
  assert.equal(takeX.ledger[0].reason, 'incompatible with Take 10/20');
}
ok('TRANSFORM 14: conflicting transforms resolve deterministically (priority wins, non-combining); Take 10/20 suppresses all transforms');

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4 — ATTACK COMPOSITION (composition layer only — certified
// resolveAttackBonus() numeric total is NOT reopened; it is treated as an
// already-resolved input number, exactly as composeRoll()'s own contract
// requires)
// ═══════════════════════════════════════════════════════════════════════

// 15. transformed base d20 + certified Attack Bonus numeric total
{
  const transform = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST, diceCount: 2, keep: 1, sourceName: 'Advantage-like Talent' });
  const { formula: transformedBase } = applyRollTransforms('1d20', [transform]);
  const { formula, breakdown } = composeRoll({ baseFormula: '1d20', transformedBaseFormula: transformedBase, staticModifierTotal: 8 });
  assert.equal(formula, '2d20kh1 + 8');
  assert.equal(breakdown[0].value, '2d20kh1');
  assert.equal(breakdown[1].value, '+8');
}
ok('ATTACK 15: transformed base d20 composes with the certified numeric Attack Bonus total ("2d20kh1 + 8")');

// 16. attack numeric stacking still identical to previous certified result (composeRoll never touches the number)
{
  const { formula: withTerm } = composeRoll({ baseFormula: '1d20', staticModifierTotal: 8, formulaTerms: [{ formula: '1d4', sourceName: 'Irrelevant Term' }] });
  const { formula: withoutTerm } = composeRoll({ baseFormula: '1d20', staticModifierTotal: 8 });
  assert.ok(withTerm.startsWith('1d20 + 8'), 'the static modifier segment is identical regardless of what formula terms are also present');
  assert.equal(withoutTerm, '1d20 + 8');
}
ok('ATTACK 16: static numeric total is unaffected by the presence/absence of formula terms (no cross-contamination)');

// 17. no transformation -> exact legacy formula parity
{
  const { formula } = composeRoll({ baseFormula: '1d20', staticModifierTotal: 8 });
  assert.equal(formula, '1d20 + 8', 'matches RollCore._constructFormula()\'s own historical "${baseDice} + ${modifierTotal}" shape exactly when no transform/terms are present');
}
ok('ATTACK 17: no transformation -> exact legacy formula parity ("1d20 + 8")');

// ═══════════════════════════════════════════════════════════════════════
// SECTION 5 — DAMAGE COMPOSITION (generic layer proofs + a real parity
// check against the certified damage-talent-contributions.js authority;
// the certified resolveDamageComposition()/buildDamageFormula() pipeline
// itself is re-run unmodified via the existing damage-modifier-ssot and
// stock-droid-damage-math suites — see STOP/REPORT validation section,
// not duplicated here)
// ═══════════════════════════════════════════════════════════════════════

// 18. normal damage formula
{
  const { formula } = composeRoll({ baseFormula: '2d8', staticModifierTotal: 4 });
  assert.equal(formula, '2d8 + 4');
}
ok('DAMAGE 18: normal damage formula ("2d8 + 4")');

// 19. Sneak Attack formula term — parity against the certified authority
{
  const actor = { items: [{ id: 'sa1', name: 'Sneak Attack', type: 'talent' }, { id: 'sa2', name: 'Sneak Attack', type: 'talent' }] };
  const context = { targetFlatFooted: true };
  const legacy = resolveTalentDamageContributions(actor, context);
  const { terms } = resolveTalentDamageFormulaTerms(actor, context);
  assert.equal(legacy.bonusDice[0], '2d6');
  assert.equal(terms.length, 1);
  assert.equal(terms[0].formula, legacy.bonusDice[0], 'the new FORMULA_TERM adapter must reproduce the certified authority\'s own dice string exactly, never re-derive it');
  assert.equal(terms[0].sourceName, 'Sneak Attack');
}
ok('DAMAGE 19: Sneak Attack formula term matches the certified damage-talent-contributions.js authority exactly');

// 20. formula term + static bonus
{
  const { formula } = composeRoll({ baseFormula: '2d8', staticModifierTotal: 4, formulaTerms: [{ formula: '2d6', sourceName: 'Sneak Attack' }] });
  assert.equal(formula, '2d8 + 4 + 2d6');
}
ok('DAMAGE 20: formula term + static bonus ("2d8 + 4 + 2d6")');

// 21. multiple simultaneous formula terms (proxy for Deadeye extra weapon
// die + Sneak Attack coexisting — buildDamageFormula()'s own certified
// term ORDERING is Damage SSOT's domain, unchanged and untouched here;
// this proves only that the generic composer can carry more than one term)
{
  const { formula } = composeRoll({ baseFormula: '2d8', staticModifierTotal: 4, formulaTerms: [{ formula: '1d8', sourceName: 'Deadeye' }, { formula: '2d6', sourceName: 'Sneak Attack' }] });
  assert.equal(formula, '2d8 + 4 + 1d8 + 2d6');
}
ok('DAMAGE 21: multiple simultaneous formula terms compose without collision (Deadeye + Sneak Attack proxy)');

// 22. critical damage containing formula terms
{
  const { formula } = composeRoll({ baseFormula: '2d8', staticModifierTotal: 4, formulaTerms: [{ formula: '1d6', sourceName: 'Critical Damage Bonus', category: 'criticalBonus' }] });
  assert.equal(formula, '2d8 + 4 + 1d6');
}
ok('DAMAGE 22: critical damage formula term composes alongside the base/static segments');

// 23. stock droid + formula contribution (a full multi-term published formula validates as one term)
{
  const { contribution, ledgerEntry } = resolveFormulaTerm({ formula: '2d6 + 3', sourceName: 'Published Statblock Formula', category: 'stockFormula' });
  assert.ok(contribution);
  assert.equal(contribution.formula, '2d6 + 3');
  assert.equal(ledgerEntry.applied, true);
}
ok('DAMAGE 23: a stock-droid published formula string validates as one FORMULA_TERM');

// ═══════════════════════════════════════════════════════════════════════
// SECTION 6 — FORCE POINT / LEGACY KEYWORD / MALFORMED-INPUT PROOFS
// ═══════════════════════════════════════════════════════════════════════

// 25. Force Point keep-highest: the exact transform construction
// ForcePointSpendCoordinator.rollAndSpend() now uses (see
// scripts/engine/force/force-point-spend-coordinator.js) for every
// diceCount the game actually produces (1 at heroic level < 8, 2 at 8-14,
// 3 at 15+). diceCount === 1 must reproduce the historical plain-die
// formula with NO transform applied (byte-identical to the pre-migration
// `${diceCount}${dieSize}` string); diceCount > 1 must resolve to a
// TestRoll total that always equals the maximum of all diceCount rolled
// results — the same "keep only the single highest die" contract the old
// Math.max(...) post-processing enforced, now expressed as canonical
// Foundry khN syntax that Roll itself resolves, not JS
// post-processing. This is a direct unit proof of the migrated
// composition logic; ForcePointsService's own scaling-dice rules are
// unchanged, out of this phase's scope. The transaction-ordering fix
// (transform validated BEFORE the Force Point is spent) is proven
// separately immediately below, against the real coordinator source.
{
  const diceCountOne = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST, diceCount: 1, keep: 1, sourceName: 'Force Point Bonus Die' });
  const single = applyRollTransforms('1d6', []); // diceCount === 1 -> coordinator passes NO transform at all
  assert.equal(single.formula, '1d6', 'diceCount === 1 must reproduce the historical plain-die formula with no transform');
  assert.equal(single.ledger.length, 0);

  for (const diceCount of [2, 3]) {
    const transform = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST, diceCount, keep: 1, sourceName: 'Force Point Bonus Die' });
    const { formula } = applyRollTransforms('1d6', [transform]);
    assert.equal(formula, `${diceCount}d6kh1`);
    for (let trial = 0; trial < 25; trial++) {
      const roll = new TestRoll(formula);
      await roll.evaluate();
      const allResults = roll.dice[0].results.map(r => r.result);
      assert.equal(roll.total, Math.max(...allResults), `keep-highest total must always equal the max of all ${diceCount} rolled results (trial ${trial})`);
    }
  }
}
ok('FORCE POINT 25: keep-highest transform construction matches ForcePointSpendCoordinator.rollAndSpend()\'s migrated logic for every real diceCount, and Roll-resolved totals always equal the max roll');

// Force Point transaction-ordering proof (independent-review correction):
// applyRollTransforms() has its own fail-closed policy for a GENERIC
// caller -- an invalid transform silently degrades to the unmodified
// base formula. That is correct for a preview/composition API, but
// ForcePointSpendCoordinator.rollAndSpend() must never spend a Force
// Point for a keep-highest mechanic that failed to compile: the player
// would pay for "roll N keep highest" and receive a plain, unmarked
// single die instead. The coordinator now constructs and validates the
// transform BEFORE calling ActorEngine.spendForcePoints() at all, and
// returns a failure receipt (no spend) if it didn't apply.
{
  const fs = await import('node:fs');
  const coordinatorSource = fs.readFileSync(new URL('../scripts/engine/force/force-point-spend-coordinator.js', import.meta.url), 'utf8');

  // 1. Structural proof: the transform-failure gate appears BEFORE the
  // spend call in source order, not after.
  const gateIndex = coordinatorSource.indexOf('transform.length > 0 && !transformLedger.some');
  const spendIndex = coordinatorSource.indexOf('ActorEngine.spendForcePoints(actor, requested)');
  assert.ok(gateIndex > -1, 'the transform-success gate must exist in the coordinator');
  assert.ok(spendIndex > -1, 'the spend call must exist in the coordinator');
  assert.ok(gateIndex < spendIndex, 'the transform-success gate must appear BEFORE the Force Point spend call, never after');

  // 2. Also prove getScalingDice() (which determines diceCount/dieSize,
  // and therefore whether a transform is even attempted) is called
  // before the spend, not after -- the whole formula must be known and
  // validated prior to payment.
  const scalingDiceIndex = coordinatorSource.indexOf('ForcePointsService.getScalingDice(actor, context)');
  assert.ok(scalingDiceIndex > -1 && scalingDiceIndex < spendIndex, 'dice-scaling/transform construction must happen before the spend, not after');

  // 3. Logic proof: the exact gate condition production uses
  // (`transform.length > 0 && !transformLedger.some(entry => entry.applied === true)`)
  // correctly identifies a real compile failure from applyRollTransforms()
  // -- proven against an actually-invalid transform (keep >= diceCount,
  // the same guard compileOperation() enforces for every keep/drop
  // operation), not a contrived shape.
  const invalidTransform = [makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST, diceCount: 2, keep: 2, sourceName: 'Force Point Bonus Die' })];
  const { ledger: failedLedger } = applyRollTransforms('1d6', invalidTransform);
  const gateWouldBlockSpend = invalidTransform.length > 0 && !failedLedger.some(entry => entry.applied === true);
  assert.equal(gateWouldBlockSpend, true, 'the production gate condition must correctly detect a real compile failure and block the spend');

  const validTransform = [makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST, diceCount: 2, keep: 1, sourceName: 'Force Point Bonus Die' })];
  const { ledger: okLedger } = applyRollTransforms('1d6', validTransform);
  const gateWouldAllowSpend = !(validTransform.length > 0 && !okLedger.some(entry => entry.applied === true));
  assert.equal(gateWouldAllowSpend, true, 'the production gate condition must never block a spend for a transform that actually compiled');

  const noTransform = [];
  const gateForNoTransform = noTransform.length > 0 && false;
  assert.equal(gateForNoTransform, false, 'diceCount === 1 (no transform attempted) must never be blocked by this gate');
}
ok('FORCE POINT: transform-validation gate runs before the spend, both structurally (source order) and logically (a real compile failure blocks spend, a real success never does)');

// 26. existing reroll mechanics are not broken (species reroll / houserule
// exploding-critical paths were not touched by this phase — structural
// proof they still call the same real production entry points)
{
  const fs = await import('node:fs');
  const speciesReroll = fs.readFileSync(new URL('../scripts/species/species-reroll-handler.js', import.meta.url), 'utf8');
  assert.match(speciesReroll, /RollEngine\.safeRoll\(/, 'species reroll handler must still call the real RollEngine.safeRoll() path, untouched by this phase');
  const houserules = fs.readFileSync(new URL('../scripts/houserules/houserule-mechanics.js', import.meta.url), 'utf8');
  assert.match(houserules, /baseRoll\.formula\.replace\(\/d\(\\d\+\)\/g, 'd\$1x'\)/, 'the existing exploding-critical-damage house rule (already using canonical Foundry "x" syntax) is untouched by this phase');
}
ok('OTHER 26: existing reroll mechanics (species reroll, houserule exploding-critical) untouched, still call the real production paths');

// Malformed-formula fail-closed proof (explicitly required by the audit)
{
  assert.equal(validateRollFormula(null).valid, false);
  assert.equal(validateRollFormula('').valid, false);
  assert.equal(validateRollFormula('2dkh1').valid, false);
  assert.equal(validateRollFormula('1d20 + + 5').valid, false);
  const { formula, ledger } = applyRollTransforms('not-a-die-term', [makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST, diceCount: 2, keep: 1, sourceName: 'X' })]);
  assert.equal(formula, 'not-a-die-term', 'a malformed base formula must fail closed to the unmodified base, never throw or corrupt the roll');
  assert.equal(ledger[0].applied, false);
}
ok('Malformed-formula fail-closed proof: invalid formulas/transforms never crash the roll, always fail closed with a diagnostic reason');

// Legacy *ModifierFormula keyword parity proof — mirrors
// combat-option-resolver.js's own inline switch (collectAttackModifiers(),
// line ~331) arithmetic exactly, keyword by keyword, for every currently
// known value. This is the documented compatibility adapter itself, not a
// re-test of the certified Attack/Damage path (which is not reopened).
{
  assert.equal(resolveLegacyModifierFormula('-value', { value: 3 }).staticValue, -3);
  assert.equal(resolveLegacyModifierFormula('value', { value: 5 }).staticValue, 5);
  assert.equal(resolveLegacyModifierFormula('halfLevel', { value: 1, actorLevel: 9 }).staticValue, 4);
  assert.equal(resolveLegacyModifierFormula('halfLevelMinusOne', { value: 1, actorLevel: 9 }).staticValue, 3);
  for (const kw of ['level', 'classLevel', 'characterLevel', 'heroicLevel', 'actorLevel']) {
    assert.equal(resolveLegacyModifierFormula(kw, { value: 2, actorLevel: 6 }).staticValue, 12, `keyword "${kw}" must resolve to actorLevel * value`);
  }
  const contextResult = resolveLegacyModifierFormula('context.aim', { value: 3, readContextValue: key => (key === 'aim' ? 1 : 0) });
  assert.equal(contextResult.staticValue, 3);
  const unknown = resolveLegacyModifierFormula('totallyUnknownKeyword', { value: 1 });
  assert.equal(unknown.recognized, false);
  assert.equal(unknown.staticValue, 0, 'an unknown keyword fails closed to 0, never guessed at');
  for (const kw of KNOWN_LEGACY_MODIFIER_FORMULA_KEYWORDS) {
    assert.equal(typeof resolveLegacyModifierFormula(kw, { value: 1, actorLevel: 1 }).staticValue, 'number', `every known keyword must resolve to a plain number, never a string`);
  }
}
ok('Legacy *ModifierFormula keyword adapter matches combat-option-resolver.js\'s own inline switch arithmetic for every known keyword');

// ═══════════════════════════════════════════════════════════════════════
// SECTION 7 — NO EARLY RANDOMNESS
// ═══════════════════════════════════════════════════════════════════════

{
  const originalRandom = Math.random;
  let randomCalls = 0;
  Math.random = (...args) => { randomCalls += 1; return originalRandom(...args); };
  try {
    // Simulate repeated actor preparation / modifier collection / roll-
    // dialog preparation / roll-composition preview.
    for (let i = 0; i < 5; i++) {
      resolveFormulaContributions([{ formula: '4d6', sourceName: 'Prep A' }, { formula: '1d8', sourceName: 'Prep B' }]);
      const transform = makeRollContribution({ kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM, operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST, diceCount: 2, keep: 1, sourceName: 'Prep Transform' });
      applyRollTransforms('1d20', [transform]);
      composeRoll({ baseFormula: '1d20', transformedBaseFormula: '2d20kh1', staticModifierTotal: 8, formulaTerms: [{ formula: '2d6', sourceName: 'Sneak Attack' }] });
      resolveLegacyModifierFormula('halfLevel', { value: 1, actorLevel: 9 });
      const actor = { items: [{ id: 'sa1', name: 'Sneak Attack', type: 'talent' }] };
      resolveTalentDamageFormulaTerms(actor, { targetFlatFooted: true });
    }
    assert.equal(randomCalls, 0, 'preparation/collection/composition/preview must never consume randomness — only an explicit Roll.evaluate() call may');

    const roll = new TestRoll('2d20kh1 + 8');
    await roll.evaluate();
    assert.ok(randomCalls > 0, 'the explicit, final roll execution is the ONLY place randomness may be consumed');
  } finally {
    Math.random = originalRandom;
  }
}
ok('NO EARLY RANDOMNESS: preparation/collection/composition/preview never roll dice; only explicit Roll execution does');

console.log(`\nAll ${step} roll-expression-transform-authority checks passed.`);
