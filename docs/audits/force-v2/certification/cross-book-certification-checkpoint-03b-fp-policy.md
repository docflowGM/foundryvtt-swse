# SWSE Force V2 — Checkpoint 03B: RAW Force Point Spending & Transaction Policy

**Date:** 2026-11-18  
**Repo/branch:** `docflowGM/foundryvtt-swse` — `audit/force-v2-seven-book-packages-v2-9-20261117`  
**Baseline:** `377d5e3686ad40c8843c891fde5a1a714020b10e`  
**Companion contract:** `cross-book-certification-checkpoint-03b-fp-policy.json`  
**Status:** **RAW + static runtime call-site audit complete. No production fixes or Foundry runtime tests in this checkpoint.**

## Executive decision

**Reuse existing ForcePointsService as the canonical rules authorization authority and ActorEngine as the only resource/actor mutation authority.** Keep ForcePointSpendCoordinator for paid roll bonus execution, not as another wallet, and converge `createForcePointTransaction` to the same authorization and exact-refund contract. Retire the monkey-patched ForcePointsService overrides *only after* the canonical implementation and all consumers are proven covered. Do not create a second spending engine, a compatibility crosswalk, or a fabricated item.

The primary defect is not "does the actor have a Force Point?" It is that *source-specific authorization, per-round exceptions, restricted bonus entries, and actual committed resource effects have become separate disconnected decisions*.

## Source authority and core rulings

Books were read from the uploaded PDFs (Core p.93, Core p.149; JATM pp.11–13), navigated with the corresponding DJVU texts, and cross-checked with the October 21, 2008 official Core errata. Rules source priority: printed RAW **as amended by official errata**. Code comments and house-rule defaults cannot override the book.

- **Core p.93:** An ordinary FP bonus is a free action on your own turn, applied to one attack/skill/ability roll; level bands roll 1d6, 2d6 keep best, or 3d6 keep best. Unless an explicit exception says otherwise, spend **one FP per round maximum**. The ability to avoid death is a **reaction**; reducing DSS costs a **swift** action.
- **Official Core errata p.93:** Return one spent Force Power to the suite as a **reaction**, not the original swift misprint. Core p.96 also says reaction. No Force Readiness feat prerequisite attaches to this explicit permission.
- **Starships p.24:** An expended starship maneuver can likewise be recovered by **one FP reaction**, with one spent instance returned.
- **KOTOR Force Readiness feat:** Permits FP spending as a free action off-turn but preserves **all other restrictions**. It is not an unlimited-spending feat.
- **JATM p.11–12, Sparring Practice:** With qualifying DC, FP added to a **Block activation UTF check** does not count against the round limit; qualifying higher tiers grant 1 or 2 temporary FPs restricted to that Block use.
- **JATM p.12, Training Remote:** Identical kind of exception for **Deflect activation UTF checks**, not Block.
- **JATM p.13, Vo'ren's Third Cadence (DC33):** Off-turn Block/Deflect bonus spend is specifically permitted and does not count against the round limit. This is not a global free pass.
- **JATM p.13, Vo'ren's Fourth Cadence (DC38):** FP spent as **reaction** to avoid a concentration check after taking damage while maintaining a Force Power; no general one-FP-per-round exemption is stated here.
- **Official Core errata p.41:** Block/Deflect may spend FP to negate an attack on an adjacent ally; each use must be attached to the actual attack/reaction, not a generic FP roll permission.
- **Core p.96:** Prohibition on FP *modifying the Use the Force activation check* for a [dark side] Power, or a [light side] Power if DSS is at least 1. Do not broaden this into a ban on every separately documented FP Power option.
- **Core p.149:** Condition step 3 is **-5**, step 4 is **-10**, and step 5 is **helpless**. The current service's assertion that >=3 means helpless is incorrect.
- **Core p.102 + official errata:** The Force Point Recovery technique returns one FP spent during an encounter at its end; errata removes the second paragraph permitting repeated selection. Do not enforce superseded stacking text.

Official errata primary-source archive: <https://www.swse.xphilesrealm.com/Errata/SWRGP-Errata.pdf>.

**Special caveat:** The code creates a source-restricted "Guardian Spirit" bonus FP; source-book RAW for that exact talent was *not independently reverified in this pass*. Its current presence demonstrates the data contract requires entry-level eligibility. Do not assert its description is certified RAW until the relevant page is reviewed.

## Findings — 13 verified or reachability-qualified issues

| ID | Priority | Category | Code evidence |
|---|---|---|---|
| 03B-F01 | P0 | failed paid roll silently continues | `scripts/engine/roll/roll-core.js:67-86` |
| 03B-F02 | P0 | refund pool corruption | `scripts/engine/force/force-point-spend-coordinator.js:126-188; scripts/engine/roll/roll-core.js:93-97,238-250` |
| 03B-F03 | P0 | round cap bypass | `scripts/governance/actor-engine/actor-engine.js:2007-2087` |
| 03B-F04 | P0 | restricted bonus wallet bypass | `scripts/governance/actor-engine/actor-engine.js:2014-2087; scripts/engine/feats/force-point-service-runtime-patches.js:6-65` |
| 03B-F05 | P0 | reaction permission blind spot | `scripts/engine/force/force-points-service.js:324-330; scripts/engine/feats/force-point-service-runtime-patches.js:48-54; scripts/utils/force-points.js:250-264` |
| 03B-F06 | P0 | no atomic outcome with fp | `scripts/engine/force/force-executor.js:1063-1084; scripts/utils/force-points.js:214-229,251-267` |
| 03B-F07 | P1 | ignored authority options | `scripts/engine/talent/lightsaber-form-engine.js:281; scripts/governance/actor-engine/actor-engine.js:2007` |
| 03B-F08 | P0 | wrong condition track level | `scripts/engine/force/force-points-service.js:356-366; scripts/engine/combat/ConditionEngine.js:28-89` |
| 03B-F09 | P1 | misleading existing static test | `tests/force-point-transaction-integrity.test.mjs:31-33` |
| 03B-F10 | P1 | transaction partial spend | `scripts/governance/actor-engine/actor-engine.js:2047-2087` |
| 03B-F11 | P1 | no source context on roll spend | `scripts/engine/force/force-point-spend-coordinator.js:39-58; scripts/engine/roll/roll-core.js:199-209` |
| 03B-F12 | P1 | legacy direct roll uncertified | `scripts/utils/force-points.js:19-89` |
| 03B-F13 | P1 | source errata repeat selection | `Core Rulebook p102 / official October 2008 errata` |

### The five highest-impact transaction failures

**1. Requested paid roll may silently continue unpaid.**  
`scripts/engine/roll/roll-core.js:67–86` catches a failed `ForcePointSpendCoordinator.rollAndSpend()`, logs a warning and continues constructing/executing a roll with FP bonus zero. That is a mechanical distinction the user never approved: a denied resource purchase cannot silently become an ordinary check. A paid request should fail closed or return a clearly differentiated pending choice to continue without FP.

**2. Current refunds can change the resource category.**  
`scripts/engine/force/force-point-spend-coordinator.js:126–188` and `scripts/engine/roll/roll-core.js:238–250` refund via `ActorEngine.gainForcePoints()`. That method (`actor-engine.js:1967+`) only replenishes ordinary `system.forcePoints.value`. However `ActorEngine.spendForcePoints()` consumes bonus entries first. Therefore a failed paid roll can turn a source-limited, expiring bonus FP into a normal FP, or lose the point at a normal cap. The separate attack `createForcePointTransaction()` already tracks source entries; reuse its relevant receipt pattern, not its independent wallet or chat lifecycle as a competing authority.

**3. Per-round legality is not enforced at the mutation boundary.**  
`ActorEngine.spendForcePoints(actor, amount)` deducts resources but does not check a counted FP use in the current round, or validate an exact exception. Many talent and feature actions invoke this mutator directly. `ForcePointsService.validateSpend()` also lacks a round-ledger check. A caller that forgets validation can spend multiple counted FPs in one round.

**4. Restricted bonus points behave like unrestricted money.**  
The bonus pool schema carries `source`, `restrictions`, `expires`, `encounterId` and sometimes `round` and `turn`. The runtime patch totals all positive entries; the mutator spends from the first available entries without checking source or expiration. The JATM regimens supply RAW-restricted Block/Deflect bonus points. Current `GuardianSpiritActions` explicitly stores another restricted bonus type. Eligibility must be tested against the *current use* before selecting any bonus entry; expiration must be evaluated before availability and again at commit.

**5. The runtime incorrectly interprets the condition track.**  
`ForcePointsService._isSpendingPrevented()` rejects at `conditionTrack.current >= 3`, claiming this means helpless. The Core p.149 table and the repository's `ConditionEngine` use 0–5, with helpless at **5**. This presently suppresses FP expenditure for characters suffering -5 and -10 penalties even when the printed rules do not bar the action. The permanent fix must use the canonical condition/action capability, not substitute another hard-coded numeric threshold.

### Other required convergence work

- `ForcePointsService.validateSpend` and the registered monkey-patch interpret any flagged reaction or off-turn FP spend as needing Force Readiness. That is wrong for Core recovery, Starships recovery, and avoiding death. Some callers omit `isReaction`, causing the opposite bug: missing authorization.
- `ForceExecutor.recoverForcePowers()` charges before validating the spent Item. `ForcePointsUtil.avoidDeath` and `reduceDarkSide` debit and then separately mutate the result: failed consequence writes are not inherently rolled back.
- Djem So caller `LightsaberFormEngine:281` passes `allowOncePerRoundOverride` and `source` in a third argument to `ActorEngine.spendForcePoints(actor,1,options)`, but the actual mutator signature accepts **two arguments** and ignores the third. The printed scope of that override still needs exact per-talent review before it can be granted.
- `ForcePointsUtil.rollForcePoint()` rolls the dice and displays a bonus without a visible resource deduction. **No active caller was certified in this pass**; classify as a legacy reachability question, not a confirmed live exploit or user-facing defect.
- `tests/force-point-transaction-integrity.test.mjs` is a **static architectural test** that currently asserts the inappropriate normal-only `gainForcePoints` refund exists. It must be revised to behavioral conservation tests rather than preserved as an unquestioned authority.

## Consumer/entrypoint scan (18 high-value files)

This is a **targeted** static caller inventory, not a proof that no other dynamic calls exist. Method references inside many helpers may fan out to additional actions. For each entrypoint, implementation work must prove the live call chain before replacement.

| File | Relevant lines | Domain | Present coverage |
|---|---|---|---|
| `scripts/engine/roll/roll-core.js` | 200 | roll bonus coordinator | partial |
| `scripts/engine/force/force-point-spend-coordinator.js` | 57, 118, 186 | roll bonus validation spend refund | partial |
| `scripts/governance/actor-engine/actor-engine.js` | 1837, 1967, 2007 | central mutation | missing round and source guards |
| `scripts/utils/force-points.js` | 214, 225, 251, 262 | DSS decrease and death rescue | partial |
| `scripts/engine/force/force-executor.js` | 300, 623, 1065 | Power option and recovery | mixed |
| `scripts/engine/force/force-power-final-integration.js` | 85 | Negate Energy optional healing | direct |
| `scripts/components/force-suite.js` | 308 | legacy force suite recovery | direct |
| `scripts/combat/rolls/force-point-transaction.js` | 69, 125 | attack transactions with source aware rollback | partial |
| `scripts/engine/talent/lightsaber-form-engine.js` | 281, 311 | Djem So Juyo | direct ignored third arg |
| `scripts/engine/talent/guardian-spirit-actions.js` | 181 | Guardian Spirit | direct |
| `scripts/engine/talent/jedi-prestige-talent-actions.js` | 245, 296, 326, 427 | prestige talent options | direct |
| `scripts/engine/talent/sith-talent-actions.js` | 158 | shared Sith helper | direct |
| `scripts/engine/talent/force-adept-talent-actions.js` | 236 | shared Force Adept helper | direct |
| `scripts/engine/talent/lightsaber-talent-actions.js` | 253, 311, 460, 482 | lightsaber abilities | direct |
| `scripts/engine/talent/consular-talent-actions.js` | 377, 556, 571, 745, 841 | consular abilities | direct |
| `scripts/engine/talent/sentinel-talent-actions.js` | 346, 427 | sentinel abilities | direct |
| `scripts/combat/rolls/enhanced-rolls.js` | 1875 | older enhanced roll | direct |
| `scripts/engine/feats/meta-resource-feat-resolver.js` | 525, 795, 930 | meta resource feat | direct |

## Proposed single authoritative transaction contract

`ForcePointsService.authorizeSpend(actor, typedContext)` must be the **single policy owner**. It never mutates. A valid authorization must be derived from **verified** actor capabilities, active regimens, source-specific exception IDs, current combat/round, particular roll and selected source instance. Client-supplied `isReaction`, `ignoreLimit`, or `allowOncePerRoundOverride` are inputs requiring verification, **not proofs**.

**Input shape (design only):**

```text
actorId; requestedCount; useKind; abilitySourceRef
rollDomain; targetItemInstanceId; actionTiming
combatId; combatRound; combatantId; sourceEventId
intendedExceptionIds; requestId; isGMAdjudicated
```

The service produces an immutable, single-use authorization decision. `ActorEngine` re-evaluates current eligibility and spends using the same actor-scoped transaction, not stale UI state. The spend receipt records the exact normal amount and bonus entry IDs/amounts actually used, action/round identity, whether this counted against the per-round limit, and the exact source proving any exception. A follow-up outcome either commits successfully or performs a **source-exact compensating rollback** when still legally refundable.

**Critical sequence:** resolve selected target and effect preconditions -> validate eligible FP sources & round/action -> authorize -> revalidate at commit -> debit resource and record same-round spend -> execute paid action -> finalize. Concurrent clicks with same request/event ID share a single result. An unverified two-client race is not considered safe; implementation must serialize on the authoritative actor owner and test it.

**Outside combat:** no arbitrary wall-clock "round" or unconditional unlimited bypass. Request an authoritative in-scene/adjudicated round context where needed, and record it.

**Scope:** Existing `ForcePointsService`, `ActorEngine`, `ForcePointSpendCoordinator`, `RollCore`, and existing attack `createForcePointTransaction`. Avoid new wallet fields competing with `system.forcePoints.value` and `flags.swse.bonusForcePoints`. A single round-usage receipt is permissible as new transactional state, not a migrated legacy alias.

## Proposed acceptance plan

49 regression scenarios are specified in companion JSON, all marked **NOT EXECUTED**. Required categories and high-priority cases:

**Counted vs exempt spends:** `fp-round-cap`, `fp-new-round`, `vorens-round`, `force-readiness-cap`.

**Off-turn and reaction legality:** `core-power-reaction`, `sotg-maneuver-reaction`, `rescue-reaction`, `vorens-fourth-reaction`, `block-adjacent-errata`, `deflect-adjacent-errata`.

**Source-limited FP:** `block-regimen-reject-other`, `deflect-regimen-reject-other`, `guardian-expire`, `no-eligible-bonus`.

**Exact accounting:** `bonus-refund`, `mixed-refund`, `rollback-at-normal-max`, `concurrent-two`, `spend-partial`.

**Ability and condition legality:** `descriptor-dark`, `descriptor-light-dss`, `spend-wrong-condition-3`, `spend-wrong-condition-4`.

**Roll and respec integrity:** `roll-paid-failure`, `technique-errata`, `force-recover-invalid`.

### Tests to extend, not replace

- `tests/force-point-transaction-integrity.test.mjs`: replace the incorrect static refund expectation and add negative cross-source invariants.
- `tests/equipment-e4c1-wp5-c3b-force-point-lifecycle.test.mjs`: reuse existing real `ActorEngine` graft/shim to test bonus-entry conservation, same-round double-spend, and single-flight semantics.
- `tests/helpers/real-force-point-engine.mjs`: use real `spendForcePoints()` and `gainForcePoints()` with in-memory persistence; do not rely on a fake spender that always succeeds.
- `tests/attack-transaction-rollback.test.mjs`: add paid-FP roll rollback cases that verify the *actual source* of refunded points, not just integer balance.
- Foundry v13 live tests must verify reaction timing, two clients, malformed/stale authorization, GM event adjudication, and entry-level bonus expirations. Static text checks cannot certify those outcomes.

## Work packages

1. **03B-1 — Policy API + source adjudication.** Implement typed use kinds/exception lookup *inside* `ForcePointsService`; verify the producers/owners of the temporary regimen and Guardian Spirit grants. Remove fragile free-text permission checks. Keep normal RAW default strict.
2. **03B-2 — Single transactional mutator.** Make `ActorEngine.spendForcePoints()` consume a verified context/receipt and update counted round use and exact source pools together, with no partial spend. Use existing `ActorEngine.applyMutationPlan(transactional)` where multi-document rollback is required; ensure no competing ledger. Confirm concurrency strategy in Foundry.
3. **03B-3 — Roll pipeline and refunds.** `RollCore` fails closed on denied requested paid bonus, and both FP coordinator and attack transaction use exact source restoration; replace static tests that enshrine normal-only refunds.
4. **03B-4 — Actions and domain consumers.** Route Core recovery, starship recovery, death rescue, DSS reduction, Power-specific options and all audited talent-action callers to the centralized policy. Prove callback reachability; eliminate legacy direct path only after coverage.
5. **03B-5 — Official exceptions and test coverage.** Certify and integrate KOTOR Force Readiness and JATM block/deflect/cadence exemptions, Core adjacent Block/Deflect and source-specific temporary FP; execute all 49 cases and fail-shut state tests.
6. **03B-6 — Clean cutover gate.** Retire `force-point-service-runtime-patches.js` policy override once internal service owns source-aware bonus rules. No migration, shim, or shadow validator. Confirm branch diff against `main` before production implementation.

## Completion certification

**Audit/source contracts:** 17 / 17.  
**Targeted high-value entrypoint files scanned:** 18.  
**Prioritized findings:** 13.  
**Proposed regression cases:** 49.  
**Executable Foundry test cases passed:** 0 (not run).  
**Production code changed:** No.

**Checkpoint 03B disposition:** Ready for code implementation planning and independent source/adjudication review. **Not runtime-certified and not safe to merge as completed rules behavior.**
