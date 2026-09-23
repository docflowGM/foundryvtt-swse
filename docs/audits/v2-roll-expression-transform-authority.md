# V2 Roll Expression / Transformation Authority

Status: **INFRASTRUCTURE IMPLEMENTED AND TESTED.** Establishes the
three-way distinction this phase exists to enforce forever — a **static
modifier** changes a number, a **formula term** adds dice, a **roll
transform** changes how the base dice are rolled — as an explicit,
typed contract layer alongside (not instead of) the certified Attack
Bonus and Damage SSOT authorities. Certified numeric Modifier stacking
(ModifierEngine/ModifierUtils) is **not reopened, not redesigned, and
not extended to accept string values** — that contract is proven
unchanged in this document's own test suite.

Companion ledger entry: `docs/audits/v2-math-integrity-authority-ledger.md`, "Domain: Roll Expression / Transformation" section.

---

## 1. First Principle

Foundry's own `Roll` class already accepts and executes real formula
strings — including keep/drop/explode/reroll modifiers — through the
exact code path this repo already uses (`RollCore._executeRoll()`:
`new Roll(formula, rollData); await roll.evaluate();`). The limitation
this phase closes was never Foundry's dice engine; it was that this
repo's *rules layer* had no typed way to say "this string is a real
formula" vs. "this string is a keyword that resolves to a number,"
and no shared authority for constructing a base-roll transform in
canonical Foundry syntax instead of hand-rolled JS post-processing.

**No second dice parser was written.** `roll-formula-validator.js`
delegates every validation call to `Roll.validate()` — Foundry's own
static method — with no competing implementation. Production code
never parses, interprets, or hand-rolls Foundry dice-term grammar
itself; it only *constructs* formula strings from semantic
descriptions (`{operation: "keepHighest", diceCount: 2, keep: 1}` →
`"2d20kh1"`) and hands them to Foundry to validate and execute.

## 2. Phase A — Formula Surface Audit

Repo-wide inventory of every current formula-like field/system
(`formula`, `diceFormula`, `bonusFormula`, `attackModifierFormula`,
`damageModifierFormula`, `rollFormula`, critical bonus formula,
additional dice, reroll/keep/drop/explode behavior), traced to its
actual producer/consumer:

| # | Producer | Field / Mechanic | Classification | Disposition |
|---|---|---|---|---|
| 1 | `RollCore._constructFormula()` (`scripts/engine/roll/roll-core.js:247`) | `baseDice + baseBonus + modifierTotal + forcePointBonus` | STATIC_MODIFIER composition (purely additive, no base-roll transform support) | Untouched — `compose-roll.js` is an additive alternative, not a replacement |
| 2 | `RollCore.executeFormula()` / `RollEngine.safeRoll()` | arbitrary formula string, generic pass-through | Already-safe arbitrary-formula consumer | Untouched; confirms the first principle in production |
| 3 | `RollEngine.rollAbilityScore()` (`scripts/engine/roll-engine.js:88`) | `"4d6dl"` | **BASE_ROLL_TRANSFORM, already live, already canonical Foundry syntax** | Untouched — no migration needed, it was already correct |
| 4 | `CustomRollEngine.buildFormula()` (`scripts/engine/roll/custom-roll-engine.js`) | player-typed free-text formula, GM "Custom Roll" dialog | Already-safe arbitrary-formula consumer (ephemeral player input, not persisted rules metadata) | Untouched |
| 5 | `ForcePointSpendCoordinator.rollAndSpend()` (pre-migration) | `new Roll(${diceCount}${dieSize})` + manual `Math.max(...results)` when `diceCount > 1` | **BASE_ROLL_TRANSFORM implemented as JS post-processing, NOT Foundry syntax** | **MIGRATED this phase** — see §6 |
| 6 | `DEFAULT_ATTACK_OPTIONS.attackModifierFormula` / `.damageModifierFormula` (`scripts/engine/combat/combat-option-resolver.js`, `scripts/engine/feats/combat-mobility-power-feat-normalization-hooks.js`, `scripts/engine/feats/core-attack-option-normalization-hooks.js`) | `"value"`, `"-value"`, `"halfLevel"`, `"halfLevelMinusOne"`, `"level"`/`"classLevel"`/`"characterLevel"`/`"heroicLevel"`/`"actorLevel"`, `"context.<key>"` | **LEGACY_KEYWORD — a closed vocabulary that resolves deterministically to a number, never a Foundry formula** | Adapter documented (`legacy-keyword-adapter.js`); certified inline switch (`collectAttackModifiers()`, line ~331) untouched |
| 7 | `defenseModifier.valueFormula` (same file, e.g. Melee Defense's dodge bonus) | `"value"`, `"selectedValue"`, `"negativeSelectedValue"` | Same LEGACY_KEYWORD pattern, defense-domain — not a dice formula at all | Out of this phase's dice-roll scope; flagged only |
| 8 | `getCriticalDamageBonusFormula()` / `RULES.CRITICAL_DAMAGE_BONUS` (`scripts/engine/combat/combat-roll-math.js:1048`, `scripts/combat/utils/combat-utils.js`) | free-form dice-formula string, joined with `" + "`, appended to Damage after the critical multiplier | **FORMULA_TERM, already arbitrary, already live** | Untouched — already correct |
| 9 | `damage-talent-contributions.js#resolveTalentDamageContributions()` (Sneak Attack) | `"${count}d6"` | FORMULA_TERM | **Adapter added this phase** (`resolveTalentDamageFormulaTerms()`) — see §6; core logic untouched |
| 10 | `damage-item-dice-contributions.js` (Force Item / Inquisition) | dice-term strings | FORMULA_TERM | Untouched, deferred (already correct, no live bug) |
| 11 | `resolveDamageComposition()`/`buildDamageFormula()` (Damage SSOT) | `dice.base`, `dice.dieStepIncreases`, `dice.extraWeaponDice`, `dice.otherDiceTerms`, critical multiplier wrap | Mixed: base-dice-shape mutation (swap `NdX` → `NdY`, a structural rewrite of the base term, not a Roll-grammar modifier) + FORMULA_TERM (extra dice) + a multiplicative critical wrap | **Not reopened this phase** — Damage SSOT is certified and explicitly off-limits to redesign |
| 12 | `species-reroll-handler.js` | re-invokes `RollEngine.safeRoll(formula)` a second time with the **same** formula, offers the player the better of two independent full rolls | **RESULT_TRANSFORM / SPECIAL_EXECUTION** — a whole-roll re-execution, not a per-die Foundry `r`/`ro` modifier | Untouched, confirmed still live (§9 proof 26) |
| 13 | `houserule-mechanics.js#applyCriticalDamage()` `'exploding'` mode | `baseRoll.formula.replace(/d(\d+)/g, 'd$1x')` | **BASE_ROLL_TRANSFORM, already canonical Foundry `x` syntax, already live** | Untouched, confirmed still live (§9 proof 26). **Flagged, not fixed** (out of this phase's scope — a house-rule bug, not a roll-expression-authority gap): this branch chains `.evaluate({async:true})` onto the already-awaited return of `rollEngine.safeRoll(...)`, which resolves to a `Roll` (not a thenable with `.evaluate`) — a likely latent defect in an optional, currently-unwired house rule. Documented for a future house-rules correction round. |
| 14 | `houserule-mechanics.js#applyCriticalDamage()` `'maxplus'` mode | `await baseRoll.reroll()` — Foundry's own `Roll.prototype.reroll()` API | RESULT_TRANSFORM, real Foundry API, already live | Untouched |
| 15 | `RIDER_EFFECT` / `FORCE_POINT_DIE_STEP` (attack-option-adapter/attack-primitives system) | rule-type records in `feats.db` | **DEAD/UNWIRED** | Already confirmed by `docs/audits/v2-damage-modifier-authority-audit-correction-1.md` §1 — cross-referenced, not re-audited |
| 16 | `RULES.EXTEND_CRITICAL_RANGE` / `RULES.MODIFY_CRITICAL_MULTIPLIER` (`ResolutionContext`) | numeric threshold/multiplier adjustments | Not a dice formula at all — numeric rule parameters | Already documented in the Damage audit; out of this phase's scope |

**Answering Phase A3's explicit distinction request:** `+2 competence`
→ STATIC_MODIFIER. Sneak Attack `"1d6"` → FORMULA_TERM.
`damageModifierFormula: "halfLevel"` → LEGACY_KEYWORD resolving
deterministically to STATIC_MODIFIER (never a formula). `"4d6dl"` /
`"2d8x"` → BASE_ROLL_TRANSFORM. A critical bonus `"1d6"` → FORMULA_TERM.
No current mechanic was forced into the wrong bucket to make the
inventory tidier.

## 3. Phase A2 — Confirmed Foundry Grammar

This repo is a Foundry **module**, not the Foundry application — the
real `Roll`/`DiceTerm` classes are only defined at runtime inside
Foundry itself, so they cannot be executed under this test harness's
plain Node environment (the same documented boundary this repo's test
suite already accepts for RollEngine/SWSEChat/AmmoSystem, e.g.
`tests/stock-droid-damage-math.test.mjs`'s own "Test 7" precedent).

What **is** confirmed, from two independent angles:

1. **Direct production evidence.** `RollEngine.rollAbilityScore()`
   already constructs and successfully executes `"4d6dl"` (drop-lowest)
   through the exact `new Roll(formula); roll.evaluate()` path every
   other roll in this system uses. `houserule-mechanics.js` already
   constructs and executes `"NdXx"` (exploding) the same way. Both are
   live, unmodified by this phase, and are the strongest available
   proof that this project's actual Foundry environment accepts this
   grammar — not documentation, a working production code path.
2. **Foundry's own public, versioned Roll/DiceTerm API**, stable across
   the version range this project targets: `khN`/`klN` (keep
   highest/lowest, count optional), `dhN`/`dlN` (drop highest/lowest,
   count optional), `x`/`xo` (explode / explode once, optional
   comparison+threshold), `r`/`ro` (reroll / reroll once, comparison+
   threshold), and standard `+`/`-` arithmetic combination with
   parenthetical grouping.

`roll-formula-validator.js` delegates to `Roll.validate()` for all of
this — it does not hardcode or reimplement the grammar. This document's
own test suite (`tests/roll-expression-transform-authority.test.mjs`)
proves the construction/composition logic against `TestRoll`, an
explicitly-labeled, test-only structural reproduction of that same
grammar (see the test file's own header) — **not** a claim that the
live Foundry client was executed. Full behavioral confirmation against
the live client is outside this harness's reach.

## 4. Stop Gate A — Answered

1. **Which live mechanics already use arbitrary formula strings
   safely?** `RollCore.executeFormula()`/`RollEngine.safeRoll()`
   (generic), `RollEngine.rollAbilityScore()` (`"4d6dl"`),
   `CustomRollEngine` (player-typed), `getCriticalDamageBonusFormula()`/
   `RULES.CRITICAL_DAMAGE_BONUS` (Damage's own critical bonus),
   `damage-item-dice-contributions.js` (Force Item/Inquisition),
   `houserule-mechanics.js`'s exploding-critical construction.
2. **Which fields are misleadingly named `*Formula` but are actually
   keyword evaluators?** `attackModifierFormula`/`damageModifierFormula`
   (row 6 above) and `defenseModifier.valueFormula` (row 7).
3. **Which domains need FORMULA_TERM support?** Damage (already has it
   — Sneak Attack, Force Item/Inquisition, critical bonus formula).
4. **Which domains need ROLL_TRANSFORM support?** Force Point's bonus
   die (migrated this phase). Ability-score generation and the
   houserule exploding-critical mode already had it, correctly, and
   needed no migration.
5. **Which existing reroll/keep/drop mechanics already have specialized
   execution authorities that should be reused instead of replaced?**
   `species-reroll-handler.js`'s whole-roll reroll (reuses
   `RollEngine.safeRoll`) and `houserule-mechanics.js`'s
   `Roll.prototype.reroll()`-based mode — both untouched, both still
   the correct authority for their mechanic.
6. **Can arbitrary roll formulas be safely accepted from persisted
   metadata?** Yes, conditioned on: validating through `Roll.validate()`
   before use (never a second parser); never rolling during
   preparation (proven, §9); never `eval`/`Function`; fail-closed with
   a diagnostic reason on anything malformed (proven, §9). No current
   persisted feat/talent record actually grants a base-roll transform
   (confirmed by the audit above) — the infrastructure is proven with
   synthetic contributions per this phase's explicit instruction not to
   manufacture new SWSE rules to demonstrate the framework.

## 5. Contracts (Phase B/C/D)

All under `scripts/engine/roll/expression/`:

- **`roll-contribution-types.js`** — `ROLL_CONTRIBUTION_KIND`
  (`staticModifier` / `formulaTerm` / `baseRollTransform` /
  `resultTransform`), `ROLL_TRANSFORM_OPERATION` (`keepHighest` /
  `keepLowest` / `dropHighest` / `dropLowest` / `explode` /
  `explodeOnce` / `reroll` / `rerollOnce`), `makeRollContribution()`,
  `makeLedgerEntry()`. Deliberately NOT added to `ModifierTypes.js` —
  that module's `Modifier.value: number` contract stays exactly as
  strict as it already was (proven, §9 STATIC 3).
- **`roll-formula-validator.js`** — `validateRollFormula(formula)` /
  `isValidRollFormula(formula)`, delegating entirely to
  `Roll.validate()`. The one place a candidate string is checked before
  it can become a `FORMULA_TERM` or a compiled `BASE_ROLL_TRANSFORM`.
- **`roll-formula-term-resolver.js`** — `resolveFormulaTerm(raw)` /
  `resolveFormulaContributions(candidates)`. Validates, tags provenance,
  fails closed per-term (one bad term never discards its siblings).
  Formula strings are never rolled or averaged here.
- **`roll-transform-resolver.js`** — `resolveRollTransforms(actor,
  domain, context)` (currently a pass-through over
  `context.rollTransforms` — see §7 for why) and
  `applyRollTransforms(baseFormula, transforms, context)`, which
  compiles semantic operations into canonical Foundry syntax, enforces
  the conflict policy (§6), and re-validates the compiled result before
  returning it.
- **`legacy-keyword-adapter.js`** — `resolveLegacyModifierFormula(keyword,
  params)`, the documented, independently-testable specification of the
  `attackModifierFormula`/`damageModifierFormula` keyword vocabulary
  (§2 row 6). An unrecognized keyword is a fail-closed rejection, never
  a guessed value.
- **`compose-roll.js`** — `composeRoll({baseFormula, staticModifierTotal,
  formulaTerms, transformedBaseFormula})`, the final, pure (no
  execution, no randomness) assembly step and preview-breakdown
  builder.

## 6. Conflict Policy (Roll Transforms)

Deterministic, documented, **non-combining** — no SWSE-specific
combination semantics are guessed at:

- **Exact-duplicate transforms** (same operation + parameters) from any
  number of sources collapse to a single application; every duplicate
  beyond the first is logged "duplicate identical transform suppressed".
- **Distinct, non-identical transforms never combine into one formula.**
  The highest-`priority` transform wins (ties broken by input order);
  every other distinct transform is suppressed with reason "conflicting
  base-roll transform (non-combining policy)".
- **Take 10 / Take 20 (`context.isTakeX`) suppresses every transform**
  unconditionally, reason "incompatible with Take 10/20" — a transform
  never applies to a fixed take-X result.
- A transform can only be applied to a **bare `NdX` base term**; a
  compound/pre-formatted base formula fails closed with a clear reason
  rather than risk malformed syntax concatenation.
- The compiled result is always re-validated through
  `Roll.validate()`; a compiled-but-invalid formula fails closed to the
  unmodified base formula.

## 7. Final Composition Flow

```
rule sources
  │
  ├── static numeric modifiers ──► ModifierEngine / ModifierUtils (unchanged) ──► number
  ├── formula terms ─────────────► resolveFormulaContributions() ──► validated formula strings
  └── roll transforms ───────────► resolveRollTransforms()/applyRollTransforms() ──► transformed base formula string
                                            │
                                            ▼
                                     composeRoll({...})
                                            │
                                            ▼
                                   canonical formula string
                                            │
                                            ▼
                              RollCore/RollEngine (new Roll(), evaluate())
```

Attack: `resolveAttackBonus()` (certified, unchanged) supplies the
numeric total; `resolveAttackRollTransforms()`-shaped callers would
supply `context.rollTransforms`; `composeRoll()` assembles the final
string. Nothing here recreates BAB/ability/enhancement/feat math.

Damage: `resolveDamageComposition()`/`buildDamageFormula()` remain the
certified authority for dice shape, extra weapon dice, die steps, and
the critical wrap — unmodified. `damage-talent-contributions.js`'s new
`resolveTalentDamageFormulaTerms()` is an additive, side-by-side view of
the same Sneak Attack dice through the FORMULA_TERM contract, proven
byte-identical to the certified authority's own output (§9 DAMAGE 19).

## 8. `resolveRollTransforms()` — Why It's a Pass-Through Today

The repo currently has **no** feat/talent metadata that *grants* a
base-roll transform (no declarative "roll twice, keep highest" record
anywhere in `feats.db`/`talents.db`) — confirmed by the Phase A audit
(§2). Building a scanning registry with nothing real to scan would be
exactly the "manufacture new SWSE rules merely to demonstrate the
framework" this phase is explicitly told not to do. `resolveRollTransforms()`
therefore accepts an explicit, pre-collected `context.rollTransforms`
array — the natural seam a future declarative producer plugs into
without this module's conflict/compose logic changing at all — and the
only two live BASE_ROLL_TRANSFORM producers today
(`RollEngine.rollAbilityScore()`'s `"4d6dl"`, and the migrated Force
Point keep-highest) each construct their transform directly rather than
through a registry scan that has nothing to scan.

## 9. Migration Log

**Migrated:**
- **Force Point bonus die** (`scripts/engine/force/force-point-spend-coordinator.js`).
  Before: `new Roll(`${diceCount}${dieSize}`)`, then
  `diceCount > 1 ? Math.max(...results) : total` — a keep-highest
  mechanic implemented as JS post-processing over raw per-die results.
  After: `applyRollTransforms(`1${dieSize}`, diceCount > 1 ?
  [keepHighestTransform] : [])` compiles to the canonical
  `${diceCount}d${faces}kh1` when `diceCount > 1` (unchanged plain-die
  formula when `diceCount === 1`, matching historical behavior exactly);
  `fpRoll.total` is read directly — Foundry's own `kh1` already marks
  the dropped dice inactive, no manual `Math.max` needed. The receipt
  now also carries `rollTransformLedger` for diagnosability. Proven in
  §9 FORCE POINT 25: the compiled formula for every diceCount the game
  actually produces (1/2/3), and 25 trials each for diceCount 2 and 3
  proving `Roll.total` always equals the max of all rolled results.

**Adapted (additive, not rewired):**
- **Sneak Attack** (`scripts/engine/combat/damage-talent-contributions.js`).
  New `resolveTalentDamageFormulaTerms()` wraps the certified
  `resolveTalentDamageContributions()`'s own `bonusDice` strings through
  the FORMULA_TERM validator. The certified function's logic (talent
  count × d6, denied-Dex gate) is untouched; `resolveDamageComposition()`
  keeps consuming the original `{bonusDice, breakdown}` shape unchanged.
  Proven byte-identical to the certified output in §9 DAMAGE 19.

**Explicitly deferred (infrastructure proven with synthetic data only,
no production wiring this phase, per the authorizing command):**
- Attack's own base-d20 transform composition (`resolveAttackRollTransforms()`/
  `composeAttackFormula()`) — no production caller wired; `composeRoll()`
  is proven against a transformed base + the certified numeric total as
  inputs, not against a live `resolveAttackBonus()` invocation.
- Damage's `dice.otherDiceTerms`/extra-dice representation refinement
  to consume `FORMULA_TERM` contributions directly inside
  `buildDamageFormula()` — not done; Damage SSOT stays untouched this
  phase.
- Force Item/Inquisition dice adapters (row 10) — already correct,
  left as-is.
- Any repo-wide conversion of feat/talent metadata — explicitly out of
  scope ("do not convert every current feat/talent in one pass").

**Not touched at all (confirmed still correct/live):** species reroll
handler, houserule exploding-critical and `maxplus`/reroll modes,
`RollEngine.rollAbilityScore()`'s existing `"4d6dl"`,
`getCriticalDamageBonusFormula()`.

## 10. Persisted-Data Security Boundary

- Every formula this authority accepts is validated through
  `Roll.validate()` before use — never a second parser, never a guess.
- No `eval`/`Function`/template-code execution anywhere in this phase's
  code.
- A malformed contribution fails closed with a diagnostic reason (never
  throws past its own call site, never discards sibling contributions).
- No document-path mutation of any kind occurs in this layer — it is
  pure string construction/validation.

## 11. No Early Randomness

Proven directly (`tests/roll-expression-transform-authority.test.mjs`,
"NO EARLY RANDOMNESS" section): `Math.random` is monkey-patched and
counted across five repeated rounds of formula-term resolution,
transform resolution/application, roll composition, legacy-keyword
resolution, and Sneak Attack formula-term adaptation — zero calls.
Only an explicit `new TestRoll(formula).evaluate()` call consumes
randomness.

## 12. What This Phase Did Not Do (by design)

Per the authorizing command's explicit DO-NOT-DO list: `Modifier.value`
was not made to accept strings; `ModifierEngine` was not replaced;
Attack Bonus and Damage SSOT were not redesigned or reopened; Action
Authority was not production-wired; Damage Threshold/mitigation was not
touched; no repo-wide feat/talent conversion was performed; Foundry's
dice parser was not replaced; `eval` was not used; legacy
`*ModifierFormula` fields were not silently reinterpreted as arbitrary
formulas; no feat-name-specific logic was added to the generic
transformer.

## 13. Validation

`tests/roll-expression-transform-authority.test.mjs` (28/28) plus the
full existing certified suite set re-run clean — see the ledger entry
and STOP/REPORT for exact counts.
