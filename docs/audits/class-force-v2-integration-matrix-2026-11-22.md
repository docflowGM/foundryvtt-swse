# Class/Force ↔ Force V2 integration — slice status and per-contract matrix

**Branch:** `integration/class-force-v2-20261122` (isolated; base = Force V2 head `046f7389c`, PR #1165, pinned game-night line preserved). **Not for `main`. #1165 untouched, no rebase, no force-push.** Owner direction: PR #1171 comment, 2026-11-21. Nothing here is `FOUNDRY_TESTED`; all results are offline (Node + Foundry shim). No rules were decided.

## 1. Slice status

| Slice | Chain phases (PR tip) | Result | Integration SHA | Conflicts |
| --- | --- | --- | --- | --- |
| 1 | 6J Fallen Jedi gate, 6K Fearless/Indomitable policy, 6L Prophet vision finalization (#1123 tip `46f14a92b`) | **Merged clean** | `eb7aa5379` | 0 |
| 2 | 6M Jedi Master Serenity (#1124 tip `ba1c52256`) | **Merged, 1 file / 2 hunks resolved** | `b890deeda` | `roll-core.js` |
| 3a | 6N Sith Lord Temptation (#1125 tip `4c6803c23`), V2 authority wins | **Merged, 6 files / 7 hunks resolved to V2** | `49ee4b70d` | `force-engine`, `spend-coordinator`, `roll-core`, `actor-engine` (2), 2 tests |
| 3b | Temptation Force Point trigger re-keyed to V2's finalize outbox (owner-approved design) | **Implemented, offline-tested** | `95928930a` | — |
| 3c | Temptation eligibility judged at the SPEND commit (Decision C) | **Implemented, offline-tested** | `ccd024b3a` | — |
| 3d | Separate durable Destiny Point ledger + outbox (Decision B) | **Implemented, offline-tested** | `e1abed3a7` | — |
| 4+ | 6O…6AE (#1126–#1164) | **Not started**; must be re-derived on V2 receipts (see §6) | — | 7–9 files each |

Dry-merge conflict counts of each chain tip against the V2 head: 6J/6K/6L = 0, 6M = 1 (`roll-core.js`), 6N = 6, 6O–6X = 4–7, 6Y–6AE = 9 (adds `reaction-engine.js`, `reaction-registry.js`).

## 2. Verification

Focused matrix (force / reaction / receipt / temptation / serenity / prophet / fearless / indomitable / fallen / sith / progression-finalizer / turn / class-phase-6 / roll-expression / actor-engine / roll tests):

| Point | Pass | Fail | Notes |
| --- | ---: | ---: | --- |
| V2 head baseline | 43 | 5 | the 5 are the documented pre-existing Force-power-track failures CI already excludes (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`) |
| After slice 1 | 46 | 5 | +3 new class-phase-6j/6k/6l tests; **0 regressions** |
| After slice 2 | 58 (63 tests incl. broadened `roll-` pattern) | 5 | +`class-phase-6m-serenity-temporal-roll`; **0 new failures** |
| Progression / level-up / chargen / finalizer tests after slice 1 | 52 | 0 | `progression-finalizer.js` auto-merged and verified behaviorally |

## 3. Slice 3 — why it is not a textual merge

| Contract | Force V2 (authoritative; kept) | Class/Force 6N | Required resolution |
| --- | --- | --- | --- |
| Spend authority | `ActorEngine.spendForcePoints(actor, n, context)`: `requestId`, `ForcePointsService.authorizeSpend`, per-actor `withForcePointQueue` | `spendForcePoints(actor, n, options)` with `{deferResourceEvent}` and a post-commit hook | Keep V2 signature/queue/authorization; drop 6N's rewrite of the function body |
| Receipt model | persisted ledger `flags.swse.forcePointLedger.receipts`, states `committed → finalized`; `finalizeForcePointSpend(actor, receipt)` after the paid effect really occurred; finalized receipts count toward round limit and are never refundable | ad-hoc `swse.resourceSpent` hook with a random receipt id (`ActorEngine` and `RollCore` each emit one) | Temptation must be keyed to **V2's receipt id**, not a second receipt |
| Failed paid roll | RollCore finalizes only after the paid check executed; refunds do not apply after application | "Failed paid rolls are refunded and must never trigger Temptation" | Equivalent intent: trigger only on a **finalized** V2 receipt |
| `force-engine.js` | V2 removed the direct spend block | 6N routes it through `ActorEngine.spendForcePoints(actor, 1)` | V2 wins (delete) |
| `spend-coordinator` | passes `spendContext` | passes `{deferResourceEvent:true}` | `deferResourceEvent` obsolete if the trigger moves to finalize |
| take-X guard (slice 2) | "a fixed take-X result cannot silently discard a requested paid bonus" | n/a (Serenity) | **Resolved in slice 2:** V2 guard kept first and unchanged |

**Proposed design (engineering, no rules change):** V2 already pairs every paid spend with `finalizeForcePointSpend` (call sites: `swse-actor-base.js:310`, `force-point-transaction.js:158`, `force-suite.js:332`, `reaction-engine.js:423`, `contracted-force-point.js:53`). Emit the Temptation trigger from the single `committed → finalized` transition in `ActorEngine.finalizeForcePointSpend`, carrying V2's `receiptId`, and delete 6N's two hook emitters and `deferResourceEvent`. This preserves 6N's rule "only an actual positive authoritative spend triggers Temptation, never inferred from pool deltas" and its "failed paid rolls never trigger".

**Open items before slice 3 can be implemented**
1. **Un-finalized spends:** `enhanced-rolls.js:1875` and `meta-resource-feat-resolver.js` (3 sites) call `spendForcePoints` in the lines inspected without an adjacent finalize. Each must be audited: a spend that is never finalized would never trigger Temptation, which would silently weaken 6N's behavior. 6X ("close reachable Dark Side talent Force Point receipt bypasses") and 6Y–6AA (paid reaction receipts) touch exactly these paths and overlap V2's own reaction finalization.
2. **Take-X + Force Point under Serenity:** V2's guard returns its error even for a Serenity-eligible actor. This is the conservative combination; if different behavior is wanted it is an owner decision, not made here.
3. Later phases (6T ordinary-only Watchcircle spend, 6Y–6AA reactions) overlap V2's reaction work and must be re-derived on V2 receipts, not merged.

## 4. Gate before anything leaves this branch
Combined focused tests green after every slice; separate acceptance review; `main` untouched; never marked `FOUNDRY_TESTED` without a live Foundry v13 run.


## 5. Slice 3 as built (owner decision, PR #1171 comment, 2026-11-21)

**Trigger design.** The Sith Lord Temptation Force Point trigger derives only from the FIRST `committed → finalized` transition of a receipt in the **target actor's own** V2 ledger, carrying that receipt's original `receiptId`.

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Only a positive, actual finalized spend qualifies | outbox built from the finalized ledger receipt; `spent` must be a safe integer ≥ 1 | `class-force-v2-temptation-trigger` #2, #4 |
| Rollback, pending receipt, failed/cancelled roll, invalid event never trigger | a `committed` or rolled-back receipt is never finalized, so no outbox record exists; the consumer also requires `state === 'finalized'` | #2, #4, #5 |
| `alreadyFinalized` retry never duplicates | only the first transition records/delivers (`firstFinalization`); consumer also dedupes on `receiptId` | #3, #9 |
| Do not trust caller-supplied `committed:true` / payloads | consumer cross-checks the target's own ledger: receipt id, owner, FINALIZED, amount, source; `swse.resourceSpent` accepts **Destiny only** | #5 |
| Finalization write completes before the trigger; durable evidence | trigger recorded in the SAME `updateActor` write that sets `state: 'finalized'`; delivered afterwards | #7 (write applied, then threw → reconciled once) |
| Never invoke a writer under the locked queue | delivery happens after `withForcePointQueue` releases; `ackForcePointTrigger` takes the queue separately | design; #6 |
| Listener failure / disconnect does not lose the consequence or re-charge | trigger stays `pending` in the ledger; `dispatchForcePointTriggers` / `reconcileForcePointTriggers` (on `ready`) re-deliver; FP never refunded or re-charged | #6 |
| Never reverse an applied paid effect for a notification failure | finality and spend untouched by any trigger failure | #6 |
| Timing window / target / encounter / owner-selected consequence | window judged from the context captured at finalization (round/turn/combat id), so a late replay equals processing at the spend; consequence stays `pending-target-choice`; one choice per active source per spend | #8, #10 |
| GM spends on a player's actor; permission | GM or owner only | #11 |
| Overlapping marks, concurrent finalization | queue serializes; exactly one transition | #9, #10 |
| Pending-trigger receipts survive the 200-receipt retention bound | retention skips `trigger.state === 'pending'` | #12 |

Mutation checks (tests fail when the safeguard is removed): trusting committed receipts; recording a trigger on `alreadyFinalized` retries; removing V2's take-X guard.

**Serenity take-X + Force Point (owner-accepted).** `RollCore.execute` refuses `isTakeX && useForce` before any debit or Serenity consumption. `class-force-v2-serenity-takex-denial` proves the denial leaves the Force Point balance, ledger and Serenity entitlement byte-identical, runs no roll/take-X/paid logic, is idempotent, and that legal retries (Serenity-only take-X → real roll; normal paid roll; ordinary take-X) proceed.

## 6. Coverage audit — every Force Point writer

**A. Receipt-based spends that never finalized (fixed here):** `enhanced-rolls.js` (secret enhancement), `meta-resource-feat-resolver.js` ×3 (attack reroll, full-attack reroll, temporary defense rule), `force-power-final-integration.js` (Negate Energy healing), `guardian-spirit-actions.js` (Manifest Guardian Spirit). Each now finalizes after the paid effect occurred (a failure to persist finality is logged, never undoes the effect). Already correct: `swse-actor-base`, `force-point-transaction`, `force-suite`, `reaction-engine`, `contracted-force-point`, `force-engine`, `force-executor`, `starship-maneuver-suite`, `temptation-of-the-dark-side`, `lightsaber-talent-actions`, `utils/force-points`; the spend coordinator is finalized by its RollCore/transaction callers.

**B. Direct decrements that bypass the V2 ledger entirely (NOT changed — owner decision needed):** these write `system.forcePoints.value` without a receipt, so they can never trigger Temptation and also bypass V2's authorization and round limits.

| File | Site | Use |
| --- | --- | --- |
| `scripts/engine/combat/combat-executor.js` | 68, 130 | Force use in combat/initiative |
| `scripts/engine/combat/threshold-engine.js` | 498, 556 | Last Grasp; engineer Force Point |
| `scripts/engine/combat/weapons-engine.js` | 391–392 | weapon Force Point spend (also writes `resources.forcePoints`) |
| `scripts/engine/abilities/active/active-adapter.js` | 181 | ability cost (reads `forcePoints.available`) |
| `scripts/apps/force-alchemy/force-alchemy-mechanics-service.js` | 404 (cost), 426 (restore) | Force Alchemy |

Routing these through `ActorEngine.spendForcePoints` would start enforcing V2's restrictions and round caps on them, which is a gameplay change and therefore not made here. (`swse-actor-base.js:354` is a regain, not a spend.) Chain phases 6X (Dark Side talent receipt bypasses) and 6Y–6AA (paid reaction receipts) target some of these paths and must be re-derived on V2 receipts, not merged.

**C. Destiny Points.** Destiny has no V2 receipt ledger. The Temptation Destiny trigger keeps 6N's existing post-commit event (`ActorEngine.spendDestinyPoints`, emitted only after the pool write; `swse-actor-base` now routes through it) and is not mixed into the Force Point ledger. Known limit: its `receiptId` is a random id, so de-duplication relies on the consumer's stored-event check and it has no durable outbox. A durable Destiny receipt would need its own design.

## 7. Open items and risks (all offline; nothing FOUNDRY_TESTED)
1. **Cross-client delivery.** Hooks and the Force Point queue are per-client; Foundry has no cross-client compare-and-swap. The outbox makes delivery recoverable, not distributed-exactly-once.
2. **Late replay after expiry.** If the GM's expiry hook marks the mark `expired` before a pending trigger is reconciled, the consequence is not recreated (the mark is no longer active). Reconcile runs on `ready` to keep that window small. Whether an expired-but-spent-in-window mark should still apply is a rules-adjacent question, not decided here.
3. **Direct decrement writers (§6B)** and **Destiny durability (§6C)** need owner decisions.
4. **Slices 4+ (6O–6AE)** — typed Fearless/Indomitable ingress (6O/6Q/6R/6S), Prophet GM review (6P), sheet controls (6P), receipt/reaction work (6T–6AE) — are not merged. Several overlap work V2 already did (reaction finalization) and must be re-derived on V2's receipts.
5. Combined focused matrix: 145 tests, 140 pass, the same 5 documented pre-existing failures (unresolved `/systems/...` imports; identical cause on the V2 head).


## 8. Architectural rule: rules-aware, GM-controlled time (project owner, 2026-11-23)

> SWSE V2 recognizes and tracks published durations, but the GM controls the advancement and adjudication of game time. Automatic expiration is permitted when supported by authoritative combat or game-clock events, and the GM retains final control. Duration determines whether an action qualifies **when it happens**; it must not retroactively invalidate an action that already qualified.

| Duration type | Examples | System | GM |
| --- | --- | --- | --- |
| Combat-event | until the start of your next turn; until the end of the encounter | may automate from combat turn/round events when unambiguous | can override |
| Measured | 1 minute, 10 minutes, 1 hour | records the duration; may compute expiry against the campaign clock; never equates real-world time with game time | authoritative |
| Narrative | until a rest ends; until the GM judges a task done | tracks status only; invents no completion event | adjudicates |

**Applied to this branch**
- **Temptation window** = a combat-event duration (until the Sith Lord's next turn). It is automated from combat state, captured **at the spend** on the actor's own receipt (Decision C), and the GM can still end or edit a mark.
- **Late delivery never erases a qualified consequence.** A spend that qualified when made still yields its target-owned choice after the mark expires, the encounter ends, or a client reconnects. An expired mark is never reactivated, and nothing applies until the target owner or GM chooses.
- **No wall-clock expiry anywhere in the trigger path.** The earlier 24-hour "stale trigger" timeout was removed for exactly this reason; `recordedAt` is informational only.
- **Open follow-up (not changed):** other V2 effects that expire on a wall-clock or `worldTime` basis should be audited against this rule (Force Powers, regimens, rests, equipment effects, temporary bonuses). Out of scope for this slice; recorded so it is not lost.


## 9. Decision B as built — separate durable Destiny Point ledger (slice 3d)

| Requirement | Implementation |
| --- | --- |
| Separate typed ledger; never mixed with Force Points | `flags.swse.destinyPointLedger`, its own queue and outbox; a Destiny spend never touches `forcePointLedger` (asserted structurally and by behavior) |
| Authenticated amount/owner, unique request id | receipt `{receiptId, requestId, actorId, spent}`; duplicate `requestId` rejected, no re-charge |
| Atomic debit | the pool write and the receipt are ONE `updateActor` call |
| Commit / finalize / rollback | `spendDestinyPoints` → `finalizeDestinyPointSpend` or `rollbackDestinyPointSpend` (exact, one-shot, only that receipt; an intervening grant survives; a finalized spend is never refundable) |
| Durable pending trigger, recoverable delivery | trigger recorded in the same write as finality, delivered after the lock; `dispatchDestinyPointTriggers`; reconciled on `ready` |
| Decision C parity | `spendEvidence` captured on the Destiny receipt at the spend; late replay after GM expiry / encounter end / reconnect yields exactly one choice; before-mark, after-expiry and after-window spends never qualify |
| Printed magnitude and owner choice preserved | Destiny consequence is 2 steps; every consequence stays `pending-target-choice` |
| No forged ids across ledgers | a Force receipt id cannot satisfy a Destiny event and vice versa; wrong-source events rejected |
| Never backfill fabricated history | no migration; actors without a Destiny ledger simply start one on their next spend |

**Destiny spenders cut over (3):** `swse-actor-base.useDestinyPoint`, the `enhanced-rolls` Destiny option, and the `reaction-registry` `destiny-point` fallback. The fallback never imported `ActorEngine` (so it could not have spent); it now spends through the ledger, and its card reports "Not Spent" when no point was spent instead of always claiming success. Other writes to `system.destinyPoints.value` are grants/resets (`force-disciple-features`, `follower-species-materialization-hotfix`), not spends, and are unchanged.

**Correction to the slice-3d commit message:** it states "Focused matrix 172 tests". The run reported **169 tests, 164 pass, 5 fail** (the same 5 documented pre-existing failures: unresolved `/systems/...` imports, identical cause on the V2 head). The conclusion is unchanged; the count in that message is wrong.

## 10. Decision A — reachability classification and cutover plan (nothing changed yet)

Classification uses `NOT_FOUND_STATIC` for "a static search found no caller": that is **not** proof of dead code and not authority to delete. Runtime dispatch (templates, `game.swse`, string registrations, dynamic imports, hooks, macros) has not been ruled out.

| Site | Static reachability | Finding | Planned cutover |
| --- | --- | --- | --- |
| `combat-executor.executeInitiative` (130) | **reachable**: character sheet 6689/6720 | `SWSEInitiative` already pays through `RollCore` (V2 spend + finalize) and reports `usedForce` only when a Force die applied; the executor's fallback debit fires when V2 declined or applied nothing, so it can charge a point V2's authorization refused | delete the fallback debit; V2 `RollCore` is the sole authority |
| `combat-executor.executeAttack` (68) | `NOT_FOUND_STATIC` (no sheet caller) | same fallback; `CombatEngine.rollAttack` has no canonical paid-bonus path | keep the API; **fail closed** when `options.force` is passed (no unauthorized debit) |
| `threshold-engine.executeLastGrasp` / `attemptEmergencyPatch` | `NOT_FOUND_STATIC` | direct debit; Emergency Patch charges "regardless of outcome" | keep the APIs; route through V2 `ability-option`; preserve the existing charge-regardless behavior and record it as an open rules question |
| `weapons-engine.attuneLightsaber` | **reachable**: workbench → `MirajAttunementApp` | writes both `system.forcePoints.value` and `system.resources.forcePoints.value`, then the item flag | one canonical pool; V2 spend → flag write → finalize; exact rollback if the flag write fails |
| `active-adapter.handleEffect` | **reachable**: ability coordinator `register` | applies the effect before charging and reads `forcePoints.available` | spend first; denial means no effect; finalize after; exact rollback on failure |
| Force Alchemy service | **reachable**: workbench app | subtracts FP with credits/DSS and rolls back by restoring an OLD FP snapshot | never restore a historical balance; exact receipt rollback, or fail closed for that rite |

**Important constraint discovered (V2 owner ruling FP-RD-003):** an `ability-option` Force Point spend requires a typed contract in `ABILITY_OPTION_CONTRACTS` (10 abilities certified today) **or** explicit GM adjudication with a recorded reason. Routing the sites above through V2 therefore makes uncontracted abilities fail closed for players until a certified contract (trigger event, action timing) or a GM-adjudication UI exists. Authoring contracts would invent rules and is out of scope for the implementer; each such site is recorded as blocked-by-contract, not silently weakened.

## 11. Decision A cutover — direct Force Point writers (as built, 2026-11-23)

| Site | Reachability | Result | Test |
| --- | --- | --- | --- |
| `CombatExecutor.executeInitiative` fallback debit | reachable (sheet) | deleted; V2 pays via RollCore | `class-force-v2-direct-fp-cutover` |
| `CombatExecutor.executeAttack` `options.force` | `NOT_FOUND_STATIC` | kept, fails closed | same |
| `WeaponsEngine.attuneLightsaber` | reachable (workbench) | V2 spend → effect → finalize; exact rollback; applied-but-unacked finalizes | `class-force-v2-attunement-cutover` |
| `ActiveAdapter.handleEffect` | reachable (`register`) | pay first, effect, finalize; nothing applied ⇒ exact rollback; some applied ⇒ finalize | `class-force-v2-active-adapter-cutover` |
| `ThresholdEngine.executeLastGrasp` / `attemptEmergencyPatch` | `NOT_FOUND_STATIC` | kept; V2 spend + immediate finalize (charge-regardless preserved, not decided: **FP-RD-015**) | `class-force-v2-threshold-cutover` |
| Force Alchemy `applyResourceCosts` / `revertResourceCosts` | reachable (workbench app) | FP via V2 spend, exact receipt rollback, finalize after success; no whole-balance snapshot restore | `class-force-v2-alchemy-cutover` |

**Impact (FP-RD-003):** abilities without a certified contract (attunement, active abilities, Last Grasp, Emergency Patch, Force Alchemy rites) now fail closed for players unless a GM supplies a recorded adjudication. This is intended by Decision A; the contract table is the owner's to extend.

**Not changed (follow-up):** Force Alchemy credits and Dark Side Score are still written by the service with snapshot rollback; credits belong under `TransactionEngine` and the multi-resource atomicity needs its own audited design. A failed DSP/credit write after a successful FP spend rolls the FP receipt back exactly; a later failure restores DSP/credits from the snapshot as before.

## 12. Reviewer follow-ups (PR #1171 comment, 2026-11-23) — status

**Per-ability map, first pass (the eight `forcePoints`-cost entries in `data/talent-granted-abilities.json`).** `ActiveAdapter` spends under `active-ability:<id>`; **none of the eight has an `ABILITY_OPTION_CONTRACTS` entry under that ref**, so each fails closed for players and runs only under a recorded GM adjudication:

| id | Contract today | Printed source / cost / trigger / action | UI reachability | Next |
| --- | --- | --- | --- | --- |
| Regain via Force Point, severing-strike, shien, acrobatic-recovery, force-haze, improved-dark-rage, surge-of-power, Enhanced Recovery | none (denied without GM adjudication) | **not yet verified** (needs book page + trigger + action cost per ability; some may already be covered by differently-keyed contracts such as `talent-activation` entries and should be re-keyed rather than duplicated) | not yet audited | certify published abilities in priority order; owner supplies/approves each contract |

Fail-closed is a safe state, not functional completion; this table is the work list for contract certification.

**Duration audit corrections (done):** `species-activated-ability-engine.js` wrote an inert wall-clock `flags.swse.energySurge.expiresAt` (no reader anywhere); removed. Round-based expiry via `durationRounds` is untouched. `ForcePointsService._eligibleBonusEntries` compares numeric `expires` to `Date.now()`, but every reachable producer writes a *string* expiry (`'encounter'`, `'end_of_turn'`, `'end_next_turn'`), which that branch rejects (fail closed); the comparison is inert and annotated. The earlier "all `Date.now` uses are infrastructure/UI" statement was too broad and is withdrawn.

**FP-RD-015 (owner ruling 2026-11-23 recorded):** Emergency Patch consumes the point on a failed check (owner-adopted house-rule policy); the enabled setting plus a typed `house-rule` contract (`threshold:lastGrasp`, `threshold:emergencyPatch`) authorizes ordinary player use with no per-use adjudication, V2 round cap still applies (tested). Last Grasp timing remains deferred. Previously: reclassified as an optional house rule (both settings default off); the "printed text" wording was wrong and is corrected; the reviewer's policy is recorded as an unadopted owner-review proposal. `NOT_FOUND_STATIC` APIs remain preserved.

**Matrix freshness:** re-run on head after these edits over the focused set (`tests/*force*`, `class-*`, `v2-*`, temptation, serenity, species): **103 test files, 98 pass, 5 fail**. The five are the original baseline failures (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`); no new failures. "169" in §8 counted individual tests from an earlier selection; this run counts **files**.

**Force Alchemy:** FP is exactly compensated, but credits/DSP still use snapshot rollback, so the multi-resource rite is **not** certified atomic and should not be relied on for partial-failure safety until the TransactionEngine-based design is reviewed.
