# Rolling-System Alignment — Phase 1

Static audit + surgical correctness fixes. No general-purpose roll engine was
created; existing authorities (RollCore, ModifierEngine, ActorEngine,
combat-roll-math.js, SWSEChat) were extended, not replaced. This document is
honest about what is proven by static inspection/executable unit tests versus
what still needs verification inside a running Foundry VTT v13 world.

## Files inspected

- `scripts/engine/roll/roll-core.js`
- `scripts/engine/roll-engine.js`
- `scripts/engine/force/force-points-service.js`
- `scripts/engine/effects/modifiers/ModifierEngine.js`
- `scripts/engine/effects/modifiers/ModifierUtils.js`
- `scripts/engine/combat/combat-roll-math.js`
- `scripts/chat/swse-chat.js`
- `scripts/combat/rolls/attacks.js`
- `scripts/combat/rolls/enhanced-rolls.js`
- `scripts/rolls/roll-config.js`
- `scripts/rolls/skills.js`, `scripts/rolls/saves.js`, `scripts/rolls/defenses.js`, `scripts/rolls/force-powers.js`
- `scripts/engine/combat/SWSEInitiative.js`, `scripts/engine/combat/combat-executor.js`, `scripts/engine/combat/CombatEngine.js`
- `scripts/engine/force/force-executor.js`, `scripts/engine/force/force-regimen-executor.js`
- `scripts/governance/actor-engine/actor-engine.js`
- `scripts/combat/systems/vehicle/vehicle-weapons.js`
- `scripts/engine/combat/full-attack-executor.js`
- `docs/systems/COMBAT_MATH_SSOT.md`, `scripts/engine/combat/ARCHITECTURE.md`, `docs/architecture/ENGINE-ARCHITECTURE.md`, `tools/check-combat-math-ssot.mjs`
- Pre-existing audits under `docs/audits/combat-phase-0*.md` / `.json` (used to cross-check, not assumed accurate)

## Roll entry points found

- `RollCore.execute()` — canonical d20-check pipeline (skills, saves, defenses,
  force powers, force regimens, initiative). Callers with `rollOptions.useForce`:
  `scripts/rolls/skills.js`, `saves.js`, `defenses.js`, `force-powers.js`,
  `scripts/engine/combat/SWSEInitiative.js`, `scripts/engine/force/force-executor.js`,
  `scripts/engine/force/force-regimen-executor.js`.
- `RollEngine.safeRoll()` — thin formula facade over `RollCore.executeFormula()`,
  throws on failure. Used by `scripts/combat/rolls/attacks.js` for the attack/damage
  formula rolls.
- `scripts/combat/rolls/attacks.js` — canonical weapon attack/damage path; delegates
  math to `combat-roll-math.js` (`resolveAttackBonus`/`resolveDamageBonus`).
- `scripts/combat/rolls/enhanced-rolls.js` (`SWSERoll`) — large (1700+ line) legacy
  compatibility facade with its own `rollAttack`, `rollAutofire`, `rollBulkAttack`,
  `rollFullAttack`, `rollDamage`, `rollSkill`, `rollSave`, `rollInitiative`,
  `rollUseTheForce`, and its own Force Point spend flow (`promptForcePointUse`).
- `scripts/combat/systems/vehicle/vehicle-weapons.js` — vehicle weapon attacks;
  `missileSecondAttack` rolls independently, `fireMissile`/`fireWeaponBattery` take an
  injected `rollAttack` callback (in practice wired to the legacy `SWSERoll`, not the
  canonical `attacks.js` path).

## Defects confirmed (static inspection + executable tests where noted)

1. **Force Point bonus dice were rolled and validated but never paid for.**
   `RollCore.applyForcePointLogic()` called `ForcePointsService.canSpend()` and
   rolled the bonus die, then returned `spent: pointsToSpend` without any
   `ActorEngine` mutation. Every caller (`skills.js`, `saves.js`, `defenses.js`,
   `force-powers.js` via `RollCore.execute`) got the bonus for free. Confirmed by
   reading `RollCore.execute()`/`applyForcePointLogic()` before the fix and
   corroborated by the fact that three *other* call sites had grown ad hoc
   compensating spends to work around this (see #2).

2. **Three ad hoc compensating Force Point spends existed, which would have
   double-spent once #1 was fixed.**
   - `scripts/engine/combat/SWSEInitiative.js` — a direct
     `ActorEngine.updateActor(actor, {'system.forcePoints.value': fp - 1})` after
     every initiative roll that used a Force Point (bypassing
     `ForcePointsService`/`spendForcePoints` entirely — the exact "ad hoc
     actor.update()" pattern the project wants to avoid).
   - `scripts/engine/force/force-executor.js` (Use the Force power activation) —
     called `ActorEngine.spendForcePoints(actor, 1)` after the roll, using the
     correct authority method but for the wrong reason (compensating for #1).
   - `scripts/engine/force/force-regimen-executor.js` — another direct
     `ActorEngine.updateActor(...)` with hand-rolled arithmetic, same pattern as
     SWSEInitiative.
   All three were removed; RollCore now pays for the bonus itself, exactly once.

3. **Modifier breakdown was not filtered by domain and was fed a different
   modifier set than the total.** `RollCore._buildModifierBreakdown(allModifiers,
   domain)` accepted `domain` but never used it — it grouped every collected
   modifier by broad category (`feat`, `item`, `talent`, ...) regardless of which
   roll domain (e.g. `skill.acrobatics` vs `defense.reflex`) they targeted. It was
   also fed `allModifiers`, a locally-filtered list built independently of
   whatever `ModifierEngine.aggregateTarget()` internally used to compute
   `modifierTotal` — so the two numbers could disagree even before the missing
   domain filter is considered. Confirmed by direct code reading; the numeric
   invariant (`sum(breakdown) === total` for any partition of one `applied`
   array) is proven by an executable test
   (`tests/modifier-breakdown-builder.test.mjs`).

4. **Attack hit/critical interpretation did not authoritatively handle natural 1,
   and duplicated the natural-20/threat logic in more than one place.**
   `scripts/combat/rolls/attacks.js` computed `isHit = roll.total >= targetReflex`
   with no override for a natural 1, so a natural 1 with a large enough bonus
   still registered as a hit. This matches the pre-existing project audit at
   `docs/audits/combat-phase-0c-attack-roll-audit.md` ("Natural 1 automatic miss
   needs verification... high-severity rules gap") and
   `docs/audits/combat-phase-0c-attack-roll-seam-ledger.json`. `rollFullAttack()`
   additionally re-derived critical threat from `attack.dice[0]?.results` — a
   property that does not exist on the `rollAttack()` result object (only
   `attack.roll.dice` does), so this branch would throw if ever exercised.
   `scripts/combat/systems/vehicle/vehicle-weapons.js`'s `missileSecondAttack`
   had the same bare `roll.total >= targetReflex` pattern with no natural-1/20
   handling at all.

5. **`scripts/combat/rolls/enhanced-rolls.js` (legacy `SWSERoll`) performs an
   actual critical-confirmation roll**, via `analyzeCriticalThreat()` +
   `rollCriticalConfirmation()` (imported from `scripts/rolls/roll-config.js`) for
   non-natural-20 threats in `rollAutofire()` and its full-attack path. SWSE does
   not use a confirmation roll (a threat that is otherwise a hit is a confirmed
   critical) — this is a real rules defect, but confirmed to be **isolated to
   the legacy facade**, not the canonical `attacks.js` path.

6. **Transaction safety for attack-roll costs was already structurally
   correct.** `rollAttack()`/`rollAttackAndDamageWithNarration()` already wrap
   `AmmoSystem.spendForWorkflow()` *and* the attack roll itself
   (`RollEngine.safeRoll`, which throws on failure) inside one `try` block whose
   `catch` rolls back both ammo and action-option costs
   (`AmmoSystem.rollbackSpend`, `actionOptionSpend.rollback()`). No fix was
   needed here beyond documenting the stage model in-code; see "Defects not
   confirmed" below.

## Defects not confirmed / found but out of Phase 1 scope

- **`scripts/engine/combat/combat-executor.js` `resolveHit()`** computes
  `isHit = attackRoll >= targetDefense` independently (flagged by the new
  `tools/check-attack-outcome-ssot.mjs` guard). Not migrated in this pass —
  unclear how live this code path is relative to the canonical `attacks.js`;
  needs a caller-mapping pass before touching it.
- **`scripts/engine/rolls/swse-roll-engine.js`** has its own
  `isCritical = d20?.result === 20 && (category === 'attack' || ...)` used for
  chat component formatting. Flagged, not migrated (display-formatting code,
  not a hit/miss authority, but should eventually read from
  `AttackOutcomeResolver` output instead of re-deriving).
- **`scripts/ui/shell/roll-companion.js`** has a defensive fallback
  `result?.critConfirmed ?? result?.isCritical ?? ... ?? (kind === 'attack' &&
  d20Result === 20)`. Already prefers an upstream authoritative flag before
  falling back to re-deriving; lower risk, flagged for visibility only.
- **`force-executor.js`/`force-regimen-executor.js` `isCritical = ... === 20`**
  are Use-the-Force/Force-Regimen check "critical success" flavor flags, not
  weapon-attack criticals. The new static guard flags them as false positives
  for attack-outcome duplication; naming collision worth a Phase 2 look, not a
  bug.
- **`scripts/combat/rolls/enhanced-rolls.js` and `scripts/rolls/roll-config.js`**
  (confirmation-roll defect, #5 above) — deliberately not rewritten. This file
  is ~1700 lines and is explicitly called out in prior audits as a legacy
  compatibility surface with "context-shape drift"; migrating it is a Phase 2+
  project, not a Phase 1 correctness patch.
- **`vehicle-weapons.js` `fireMissile`/`fireWeaponBattery`** take an injected
  `rollAttack` callback that is wired (at call sites) to the legacy `SWSERoll`,
  not the canonical `attacks.js`. Only the self-contained `missileSecondAttack`
  (no injected dependency) was fixed in this pass; the injected-callback paths
  require tracing every call site before they can be safely repointed.
- **Skill roll "skip static modifiers" architecture** (`rollSkill` passes
  `skipStaticModifiers: true` and trusts `derivedSkill.total` to already include
  every static modifier ModifierEngine would otherwise add) — not a Phase 1
  defect by itself, but it means the modifier-breakdown fix in this domain only
  covers *contextual* modifiers, matching pre-existing behavior exactly (see
  "architecture chosen" below). Full skill-total/ModifierEngine parity is out of
  scope.
- **Proficiency default-to-true, name-based feat/talent detection in
  `combat-roll-math.js`** — noted during audit (pre-existing, from the earlier
  hand-off audit), not touched; unrelated to the five required fix areas.

## Architecture chosen

No new roll engine. Extended existing authorities:

- **ForcePointSpendCoordinator** (new,
  `scripts/engine/force/force-point-spend-coordinator.js`) — the "authoritative
  transaction" the task asked for. Sequences
  `ForcePointsService.validateSpend()` → `ActorEngine.spendForcePoints()` →
  roll the bonus die → refund via `ActorEngine.gainForcePoints()` if the die
  roll fails. `ActorEngine` remains the only code that mutates
  `system.forcePoints.value`; the coordinator only sequences calls to it.
  `RollCore.applyForcePointLogic()` is now a thin adapter over this coordinator.
- **`ModifierEngine.resolveTarget()` / `resolveTargetFromModifiers()`** (new
  methods on the existing `ModifierEngine`, not a second engine) — one
  resolution pass that returns `{ total, applied, suppressed, breakdown,
  ledger }` built from the exact same `applied` array. `RollCore.execute()` now
  calls this once per roll instead of computing `modifierTotal` via
  `aggregateTarget()` and the breakdown via a separate, unfiltered pass.
- **`modifier-breakdown-builder.js`** (new, zero imports, pure functions) —
  `buildSourceBreakdown`, `buildModifierLedger`, `buildLedgerFromComponents`,
  `buildInvocationLedgerEntry`. Does not re-implement stacking/condition/context
  rules; only groups and labels an already-resolved `applied` list. Reused by
  both `ModifierEngine` (modifier-sourced ledgers) and `attacks.js`
  (`combat-roll-math.js` components adapted into the same ledger shape without
  touching the resolver).
- **`AttackOutcomeResolver`** (new, `scripts/engine/combat/attack-outcome-resolver.js`,
  zero imports, pure function) — single authority for natural-1 (automatic
  miss), natural-20 (automatic hit + critical, no confirmation roll), and
  expanded-threat-range critical logic. Wired into `attacks.js`
  (`rollAttack`, `rollAttackAndDamageWithNarration`, `rollFullAttack`'s threat
  check) and `vehicle-weapons.js` (`missileSecondAttack`).
- **`tools/check-attack-outcome-ssot.mjs`** (new, modeled on the existing
  `check-combat-math-ssot.mjs`) — report-only static guard that flags ad hoc
  `isHit`/`isCritical`/`hits`/`critConfirmed` assignments outside an allowlist,
  so new duplication is visible instead of silent. Already surfaced 5 real
  pre-existing sites (see "Defects not confirmed" above).

## Exact files changed

```
scripts/combat/rolls/attacks.js
scripts/combat/systems/vehicle/vehicle-weapons.js
scripts/engine/combat/SWSEInitiative.js
scripts/engine/effects/modifiers/ModifierEngine.js
scripts/engine/force/force-executor.js
scripts/engine/force/force-points-service.js
scripts/engine/force/force-regimen-executor.js
scripts/engine/roll/roll-core.js
```

New files:

```
scripts/engine/combat/attack-outcome-resolver.js
scripts/engine/effects/modifiers/modifier-breakdown-builder.js
scripts/engine/force/force-point-spend-coordinator.js
tools/check-attack-outcome-ssot.mjs
tests/attack-outcome-resolver.test.mjs
tests/attack-outcome-ssot-check.test.mjs
tests/attack-outcome-wiring.test.mjs
tests/attack-transaction-rollback.test.mjs
tests/force-point-transaction-integrity.test.mjs
tests/modifier-breakdown-builder.test.mjs
tests/modifier-total-breakdown-parity.test.mjs
docs/audits/rolling-system-alignment-phase-1.md (this file)
```

No feats, talents, progression, sheets, or unrelated UI files were touched.

## Tests added

This repo has no `package.json`/test runner; existing `tests/*.test.mjs` files
are plain Node scripts, some importable directly (pure logic or
`readFile`-based static assertions) and some not, because most engine modules
use absolute `/systems/foundryvtt-swse/...` import specifiers that only
resolve inside Foundry's module loader (confirmed: 4 of the 10 pre-existing
test files already fail with `ERR_MODULE_NOT_FOUND` under plain `node`, for
this exact reason, before any of this pass's changes). New tests follow the
same convention and are honest about which category they're in:

**Genuinely executable under plain Node** (zero-Foundry-dependency pure
modules, imported by relative path):
- `tests/attack-outcome-resolver.test.mjs` — natural 1 auto-miss, natural 20
  auto-hit+crit, ordinary hit/miss, expanded threat range (confirms hit vs.
  denies on an otherwise-miss), no-target-defense mode, and an identical-input
  identical-output check standing in for "chat context and damage workflow
  context must see the same outcome."
- `tests/modifier-breakdown-builder.test.mjs` — `sum(breakdown) ===
  modifierTotal` for an arbitrary `applied` set, an unrelated-domain modifier
  never appearing in a breakdown built from an already-domain-filtered list,
  net-zero source buckets dropped, suppressed-modifier tagging, and the
  `combat-roll-math.js` components → ledger adapter.

**Static source-text guards** (read the changed files as text; run under
plain Node without needing the Foundry loader, same pattern as the pre-existing
`tests/startup-bootstrap-regression.test.mjs`):
- `tests/force-point-transaction-integrity.test.mjs` — RollCore delegates to
  the coordinator (doesn't re-implement validation), refunds on main-roll
  failure, the coordinator validates→spends→rolls→rolls-back in the right
  order, `ForcePointsService` still has zero mutation calls, and all three
  compensating ad hoc spends are gone.
- `tests/modifier-total-breakdown-parity.test.mjs` — `_buildModifierBreakdown`
  is gone, `RollCore.execute()` uses one `ModifierEngine.resolveTarget()` call
  per branch, and `ModifierEngine`'s new resolver filters by `target` before
  building the breakdown/ledger.
- `tests/attack-outcome-wiring.test.mjs` — both attack entry points call
  `AttackOutcomeResolver.resolve()`, the old bare `roll.total >= targetReflex`
  pattern is gone from the canonical path and from the vehicle missile path,
  and chat/damage-workflow/attackResult all read `outcome.automaticMiss` /
  `outcome.automaticHit` instead of re-deriving them.
- `tests/attack-transaction-rollback.test.mjs` — proves `RollEngine.safeRoll`
  throws on failure and that both attack entry points execute that roll inside
  the same `try` whose `catch` rolls back ammo and action-option costs.
- `tests/attack-outcome-ssot-check.test.mjs` — smoke-tests the new guard script
  itself (exits 0 in report mode).

Existing guard extended (not modified, still passes as-is):
`tools/check-combat-math-ssot.mjs`.

## Commands run

```
node --check <each changed/added .js file>          # syntax validation
node tools/ci-smoke-check.mjs                        # repo-wide syntax sweep
node tools/check-combat-math-ssot.mjs                 # existing combat-math SSOT guard
node tools/check-attack-outcome-ssot.mjs              # new attack-outcome SSOT guard
node tests/<each>.test.mjs                            # every test file, old and new
```

## Test results

- All 11 changed/added `.js` files: `node --check` passes.
- `tools/ci-smoke-check.mjs`: 2 pre-existing failures, both in files never
  touched by this pass (`tools/audit-nonheroic-weapon-damage.mjs`,
  `tools/audit-npc-source-attribution.mjs` — template-literal syntax issues
  unrelated to rolling/combat). Confirmed pre-existing by running the same
  check before making any changes.
- `tools/check-combat-math-ssot.mjs`: passes, unchanged from baseline (roll
  path, breakdown path, and legacy wrappers still delegate to
  `combat-roll-math.js`).
- `tools/check-attack-outcome-ssot.mjs`: runs clean (exit 0, report mode);
  surfaces 1 known-debt site (`enhanced-rolls.js`) and 5 new-to-this-guard
  warnings (all pre-existing code, see "Defects not confirmed" above) for
  human follow-up.
- `tests/*.test.mjs`: 17 files total (10 pre-existing + 7 new). 12 pass, 5 fail
  — the failures are the same 5 as the pre-existing baseline
  (`force-power-final-integration.test.mjs`, `phase3-force-power-corrections.test.mjs`,
  `phase4-force-modifier-automation.test.mjs`, `phase5-force-healing-mitigation.test.mjs`,
  `phase6-force-direct-damage.test.mjs`), all failing with `ERR_MODULE_NOT_FOUND`
  for the same absolute-import reason, confirmed present before this pass's
  changes and untouched by it. All 7 new test files pass. Zero new failures.

## Remaining Phase 2 work

1. Migrate `scripts/combat/rolls/enhanced-rolls.js`'s attack/autofire/full-attack
   paths off their own critical-confirmation roll and onto `AttackOutcomeResolver`.
2. Trace `vehicle-weapons.js`'s injected `rollAttack` callback to its real call
   sites and repoint them at the canonical `attacks.js` path (or give vehicles
   their own resolver per the "inspect crew/vehicle context" constraint).
3. Investigate `combat-executor.js#resolveHit()` and `swse-roll-engine.js`'s
   independent critical derivation surfaced by the new static guard.
4. Build a canonical, immutable `RollContext` and normalize target resolution
   once per workflow (per the pre-existing `docs/audits/combat-phase-0a...`
   findings) — Phase 1 did not touch target-resolution ambiguity.
5. Extend the component-ledger shape to `rollDamage()` and skill/save/defense
   rolls (Phase 1 only applied it to `RollCore`'s modifier breakdown and the
   canonical attack-bonus path).
6. Decide whether `combat-executor.js`'s dead-looking initiative fallback spend
   (`ActorEngine.apply(actor, {'system.forcePoints.value': ...})`, guarded by
   `result?.usedForce !== true` and never actually reached given current
   wiring) should be deleted outright once someone confirms it is truly
   unreachable.

## Runtime verification still needed in Foundry VTT v13

Everything above is static analysis plus Node-executable unit tests for the
pure logic modules. None of the following has been verified against a live
Foundry world, and this pass does not claim it has:

- That spending a Force Point in the actual character sheet UI (skill roll,
  save, defense roll, initiative roll, Use the Force power) now decrements
  `system.forcePoints.value` by exactly 1 and the chat card shows the correct
  bonus.
- That a forced roll-execution failure (e.g. a malformed formula) actually
  triggers the refund path end-to-end inside Foundry's `Roll` class (the logic
  was verified by reading `RollEngine.safeRoll`'s throw behavior, not by
  triggering a real Foundry roll failure).
- That the modifier breakdown now displayed anywhere in the UI (if/when a
  consumer starts reading `breakdown.modifierBreakdown`) shows correct,
  domain-scoped values — today nothing in `scripts/chat/swse-chat.js` actually
  renders `modifierBreakdown`, so this fix has no visible UI surface yet to
  manually verify against.
- That natural 1/20 attack resolution changes actual chat output and damage
  buttons in a live attack against a token target (hit/miss text, critical
  damage multiplier button behavior).
- That the vehicle missile lock-on second-attack flow still behaves correctly
  end-to-end (chat messages, missile state clearing) with the new outcome
  object in place.
- Performance/caching impact of `ModifierEngine.resolveTarget()` bypassing the
  `aggregateAll()` cache path that `aggregateTarget()` uses when no runtime
  context is present — `RollCore.execute()` almost always passes a non-empty
  context in practice, so this is expected to be a non-issue, but it has not
  been profiled.

## Implementation summary

**Fixed**
- Force Point bonus dice now cost exactly 1 (or the requested amount) Force
  Point, spent through `ActorEngine.spendForcePoints()` before the bonus die is
  rolled, refunded through `ActorEngine.gainForcePoints()` if the bonus die (or
  the main check roll) fails to execute after payment.
- Three ad hoc compensating Force Point spends removed (`SWSEInitiative.js`,
  `force-executor.js`, `force-regimen-executor.js`) that would have
  double-spent once the above was fixed.
- `RollCore`'s modifier breakdown is now built from the same domain-filtered,
  stacking-resolved `applied` array that produces `modifierTotal`, for both the
  normal and Take 10/20 paths — `sum(breakdown) === modifierTotal` by
  construction, proven by an executable test.
- Natural 1 now authoritatively forces a miss, and natural 20 authoritatively
  forces a hit + critical (no confirmation roll) in the canonical attack path
  and the vehicle missile second-attack path.
- Fixed a live crash in `rollFullAttack()` (`attack.dice[0]` on an object that
  has no `dice` property).

**Hardened**
- Attack-roll cost transaction safety (ammo + action-option spend rollback on
  roll-execution failure) was found to already be structurally correct;
  documented the commit/rollback stage model in-code rather than adding a new
  transaction layer.
- Added a component-ledger shape (`{id, label, value, category, sourceId,
  sourceName, domain, applied, reason}`) applied to `RollCore`'s modifier
  resolution and the canonical attack-bonus breakdown, adapting
  `combat-roll-math.js`'s existing `{label: value}` components without
  rewriting that resolver.
- Added `tools/check-attack-outcome-ssot.mjs`, a report-only static guard
  against new independent hit/critical interpretation.

**Tests**
- 2 genuinely executable pure-logic test files (natural-1/20/threat rules;
  breakdown/ledger sum-parity and domain-isolation).
- 5 static source-text guard tests (Force Point wiring, modifier
  total/breakdown wiring, attack-outcome wiring, transaction rollback, SSOT
  guard smoke test).
- Confirmed zero regressions in the 10 pre-existing test files and both
  pre-existing SSOT/smoke-check scripts.

**Remaining risks**
- `enhanced-rolls.js`/`roll-config.js`'s confirmation-roll defect is real and
  unfixed (Phase 2).
- Vehicle attacks routed through the legacy `SWSERoll` callback (not
  `missileSecondAttack`) are unfixed (Phase 2).
- `combat-executor.js#resolveHit()` and `swse-roll-engine.js`'s independent
  critical derivation are unfixed, newly surfaced by the static guard
  (Phase 2).
- No UI currently renders `modifierBreakdown`, so the breakdown-parity fix,
  while numerically correct by construction, has no manual-verification
  surface yet.

**Runtime checks required**
- All Force Point spend UI flows (skills, saves, defenses, initiative, Use the
  Force) in a live Foundry v13 world.
- A real roll-execution failure to confirm the refund path fires correctly
  against Foundry's actual `Roll` class.
- A live attack roll against a token target to confirm natural 1/20/threat
  behavior and chat/damage-button output.
- The vehicle missile lock-on second-attack flow end-to-end.

This pass does not claim the rolling system is fully unified. The strongest
area remains ordinary weapon attack/damage math; the legacy `enhanced-rolls.js`
facade, vehicle attacks routed through it, and several smaller independent
hit/critical derivations remain as documented, visible technical debt for
Phase 2.
