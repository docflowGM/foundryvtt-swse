# Class/Force ↔ Force V2 integration — slice status and per-contract matrix

**Branch:** `integration/class-force-v2-20261122` (isolated; base = Force V2 head `046f7389c`, PR #1165, pinned game-night line preserved). **Not for `main`. #1165 untouched, no rebase, no force-push.** Owner direction: PR #1171 comment, 2026-11-21. Nothing here is `FOUNDRY_TESTED`; all results are offline (Node + Foundry shim). No rules were decided.

## 0. CURRENT STATUS (consolidated 2026-11-23; read this first — later sections are historical)

- **Owner directive 2026-11-24 (clean V2 cutover, no compatibility layers) executed:** legacy Dark/Light Side talent graph retired (`149dfea7e`); 6Z fully integrated (`83952b0b9`); the whole 6O–6AE chain is dispositioned.
- **Slices integrated:** 1, 2, 3a–3d, 4 (6O), 5 (6P Prophet review), 6 (6P sheet controls), 7a–7c (6Q, 6R satisfied by 6O, 6S), 8 (6T not merged, exemption), 9 (6U partial). **Chain 6O–6AE fully dispositioned** (integrated, re-derived, satisfied, or held with a named blocker — see the table) (re-derive on V2 receipts, never a blind merge).
- **Decision A (direct Force Point writers):** **§6B/§11 are NOT a complete inventory** — §14 lists more writers; `tests/class-force-v2-direct-fp-writer-classification` now pins every writer file. The legacy Dark/Light Side talent graph was **retired** on the owner's chat authorization (11 files, 7,236 lines, plus 29 dead planners in `talent-effect-engine.js`); see `legacy-fp-retirement-deletion-ledger-2026-11-24.md` and the guard `class-force-v2-legacy-talent-retirement`. Done for initiative, attack (fail closed), attunement, `ActiveAdapter`, Last Grasp, Emergency Patch, Force Alchemy's Force Point part (§11). **Open:** Force Alchemy credits / Dark Side Score snapshot rollback is NOT certified atomic (needs a TransactionEngine-based design).
- **Superseded statements (kept for history):** §12's "eight ActiveAdapter abilities are gated" claim is **wrong** — corrected in §13: no shipped item has a Force Point `abilityMeta.cost`, and the eight cards' metadata was corrected/removed by the talent-granted-abilities audit (`docs/audits/talent-granted-abilities-metadata-audit-2026-11-23.md`).
- **FP-RD-015 (house rules Last Grasp / Emergency Patch):** `REVIEWER_RECOMMENDED / OWNER_CONFIRMATION_PENDING`. Implemented provisionally (typed `house-rule` contracts; failed Emergency Patch check still charges). Last Grasp timing remains `DEFERRED_RULES_REVIEW`. The Mechanics result is still caller-supplied.
- **Dead talent-engine chain fully retired** (wrappers, five mechanics modules, `TalentEffectEngine`, damage no-op + hotfix shim, `ActorEngine.applyTalentEffect`): see `non-force-talent-macro-sweep-2026-11-24.md`.
- **Focused matrix (files, not tests):** 289 files now (247 earlier + actor/governance/mutation/sovereignty/damage/combat), all pass; previously 247 files (force/class/v2/temptation/serenity/species/talent/dsp/reaction/dark/light/phase*) — **247 pass, 0 fail**. The "five baseline failures" were test-harness defects (static imports hoisted above the Foundry path loader), not product defects; the five suites now register the loader themselves and also pass under the CI preload (`tools/run-rolling-tests.mjs` already ran them preloaded), 5 fail — the same five baseline failures (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`; unresolved `/systems/...` imports, identical on the V2 head). 0 new failures.
- **Certification:** everything is offline-tested only. **Nothing is `FOUNDRY_TESTED`.** `main` is untouched; the branch is not authorized for merge.

## 1. Slice status

| Slice | Chain phases (PR tip) | Result | Integration SHA | Conflicts |
| --- | --- | --- | --- | --- |
| 1 | 6J Fallen Jedi gate, 6K Fearless/Indomitable policy, 6L Prophet vision finalization (#1123 tip `46f14a92b`) | **Merged clean** | `eb7aa5379` | 0 |
| 2 | 6M Jedi Master Serenity (#1124 tip `ba1c52256`) | **Merged, 1 file / 2 hunks resolved** | `b890deeda` | `roll-core.js` |
| 3a | 6N Sith Lord Temptation (#1125 tip `4c6803c23`), V2 authority wins | **Merged, 6 files / 7 hunks resolved to V2** | `49ee4b70d` | `force-engine`, `spend-coordinator`, `roll-core`, `actor-engine` (2), 2 tests |
| 3b | Temptation Force Point trigger re-keyed to V2's finalize outbox (owner-approved design) | **Implemented, offline-tested** | `95928930a` | — |
| 3c | Temptation eligibility judged at the SPEND commit (Decision C) | **Implemented, offline-tested** | `ccd024b3a` | — |
| 3d | Separate durable Destiny Point ledger + outbox (Decision B) | **Implemented, offline-tested** | `e1abed3a7` | — |
| 4 | 6O typed effect ingress (Fearless / Indomitable at ActorEngine ActiveEffect creation + ConditionEngine; only the 5 ingress commits `8b641be45`..`288361931` of #1126) | **Cherry-picked clean, 0 conflicts**; offline-tested (5 tests; focused matrix 100 of 105, same 5 baseline failures, 0 new) | `6c50343af` (tip) | 0 |
| 4x | the later #1126 commits `55cbff915`..`619791da0` (Temptation expiry/FP-trigger timing/no-op condition choice) | **Superseded, not merged**: they patch 6N's pre-V2 hook model, which slices 3a–3d replaced with the finalize outbox and spend-time evidence | — | — |
| 5 | 6P Prophet GM vision review (#1127 chain: `1cfaef5d3`, `45a09b6ff`, `28da0c283`, `fd485d608`, `b8a53d6ca`) | **Cherry-picked clean, 0 conflicts**; GM-only dialog, writes through `ActorEngine.applyMutationPlan`, records the narrated vision and leaves Destiny `GM_ADJUDICATED_SEPARATELY` (no rules decided); 3 tests; focused matrix 101 of 106, same 5 baseline failures, 0 new | `7dad3448b` (tip) | 0 |
| 5x | the other commits in the #1127 chain (`51447b5ed`..`d26da3543`: Temptation expiry, FP-trigger timing, no-op condition choice, 6J–6P matrix doc) | **Superseded, not merged** (V2 outbox / spend-time evidence replace them) | — | — |
| 6 | 6P sheet action controls (V13 header controls for Serenity, Temptation, pending target choice; `c6a2e2b6b`, `5cfdfa09b`, `0a1c63e66`, `7b2888451`) | **Cherry-picked clean, 0 conflicts**; routes only to the existing `game.swse.classFeatures` API (verified present in `index.js`), no action/roll logic cloned; 5 tests; focused matrix unchanged: 5 baseline failures, 0 new | `de7ef8a32` (tip) | 0 |
| 6x | the attack-FP receipt commits of the same branch (`3cff5e122`, `5b77139c7`, `cdcc9523a`, `1f5587d7b`, `667bfc76b`, `8f97c3be0`) | **Superseded, not merged**: they emit the Temptation event at attack finalization on the pre-V2 hook; V2's finalize outbox and the cut-over `enhanced-rolls.js` finalize replace them | — | — |
| 7a | 6Q Consular Adept/Master Negotiator and Sentinel Dampen Presence Indomitable gates (`f813ccc52`, `9679088c6`, `4833ed6f8`, `7d957fe53`) | **Cherry-picked clean**; immunity checked before any CT/effect write; the chat card reports immunity, not success; 4 tests | `0ceb04c38` | 0 |
| 7b | 6R typed ActiveEffect admission (#1131) | **`SATISFIED_BY_6O`**: a differential run over 90 actor×descriptor cases found 6O equal or stricter except 6R's extra spellings (`isMindAffecting`, `isFear`, `fear`, comma-separated token strings), which were ported into the 6O ingress; `class-phase-6r-satisfied-by-6o.test.mjs` (4 tests, mutation-checked) | `0ceb04c38` | — |
| 7c | 6S Yarkora Confusion / Caamasi Pacifism Indomitable gates and retirement of the legacy `system.activeEffects` fallback (`bf394b55d`, `21c16474a`, `ee4fbd838`, `7279bf149`, `a4dfdf875`) | **Cherry-picked clean**; the fallback writer is gone (species effects now go only through `ActorEngine.createActiveEffects`); Pacifism checks immunity BEFORE its CT shift; 5 tests | `b217127b7` | 0 |
| 8 | 6T (#1133) | **Not merged; WatchCircle exemption documented** (§14): the canonical talent text says the loss "does not count as spending a Force Point"; compensation added; 3 tests | `607820baa` | — |
| 9 | 6U (#1134) divergent closure | **Partially integrated**: GM-only pending Prophet vision header control (`6e6e6e22b`, `014ea1e46`, `5d1e05580`; 6 sheet-control tests) and the Temptation condition-cap guard hardened with `Number.isSafeInteger(appliedShift)` (an undefined/NaN shift no longer passes) + `fcf49fdf7` test. **Satisfied, not merged:** the ConditionEngine typed ingress and `class-feature-effect-admission.js` (6U's convergence onto the 6R module; the 6O ingress already guards `ConditionEngine.applyConditionStep`, and 6R's extra descriptor spellings were ported in 7b) | `1d2b332e6` + this commit | 0 |
| 10 | 6V (#1149) Temptation next-turn window by combatant identity | **Re-derived, not cherry-picked** (6V patched the pre-V2 `planTemptationSpend`): `temptationWindowOpenAt(mark, snapshot)` decides by round + combatant identity + the initiative ORDER; the order is captured in the spend-time evidence so late replay is judged at the spend; fails closed on missing order/source/current combatant/index mismatch. 5 new tests (source moved later/earlier, boundaries, fail-closed, evidence), the existing 35-check Temptation suite updated to identity fixtures; mutation-checked | this commit | — |
| 11 | 6W (#1150) per-actor Temptation serialization | **Re-derived**: the service's reject-the-second `locks` Set is replaced by the 6W per-actor promise-tail serializer (copied verbatim) so two receipts for one target QUEUE; expiry now computes its plan inside the actor's turn from fresh state. Test W10 (concurrent Force + Destiny receipts both apply), mutation-checked against the old guard | `d274cfb0d` | — |
| 12 | 6X (#1154) Dark Side talent paid-FP receipts | **SUPERSEDED**: it patched the legacy Dark/Light Side graph, which the owner then ordered retired (deleted); there is nothing left to route | — | — |
| 13 | 6Y (#1156) reaction paid spend | Payment/receipt lifecycle **SATISFIED_BY_V2** (`reaction-engine.js` authorizes, spends with an exact receipt, rolls back on handler error, finalizes on success). **A real defect found and fixed:** `SWSEChat.postMessage` has never existed (5 calls in the reaction engine, 9 in `ActiveAdapter`), so the final result message threw a TypeError AFTER the paid reaction completed. All 14 calls now use a failure-isolated `postNoticeCard` over `SWSEChat.postHTML`; guard test `swse-chat-no-phantom-postmessage` | this commit | — |
| 14 | 6Z (#1159) reaction execution admission | **Integrated** (cherry-picked + re-derived): owned-reaction recheck (`collectActorReactionKeys`), defender-control check, trigger / condition / negation recheck before any limit claim, payment or handler (skipped for Block/Deflect/Force Fortification, whose authority is the attacker-side verified attack event); the REGISTERED printed Force Point cost is authoritative (`max(registered, caller)`), so a caller omitting `forcePointCost` can no longer waive it (a real gap on the V2 head); typed attack/damage descriptors and the attacker weapon id are carried through chat buttons and resolved to a real owned weapon Item (`attacks.js`, `full-attack-card-renderer.js`, `swse-roll-engine.js`, `chat-interaction-bridge.js`, `holo-roll.hbs`). `class-phase-6z` adapted to V2 receipts (9 tests incl. an omitted-cost waiver case; mutation-checked) | `cd3c47e34`..this commit | 0 |
| 15 | 6AA (PR number not re-verified) all-or-nothing reaction Force Point payment | **SATISFIED_BY_V2**: `authorizeSpend` allows exactly one point and `reaction-engine.js` rejects any `forcePointCost !== 1` BEFORE spending; the spend, rollback on handler error and finalize on success are one exact receipt | — | — |
| 16 | 6AB (PR number not re-verified) expiry race | **Integrated** (with 6W): the plan is recomputed inside the actor's turn, plus a read-only prefilter so unmarked world actors never take a lock; source-order test | this commit | — |
| 17 | 6AC / 6AD (PR numbers not re-verified) target-mark serialization and exact-turn snapshot | **Re-derived in `activate`**: two NON-nested stages (caster turn: authority, action payment, roll; target turn: fresh plan + write), so two Sith Lords marking each other cannot deadlock and two marks on one target cannot overwrite each other; the exact combat turn is captured before any async step and re-verified before the mark is planned and written (a mark can no longer be stamped on a later turn); mutation-checked source-order tests + serializer FIFO/no-poison/crossed-pair tests. **Caveat:** activation itself needs the full roll stack, so it is exercised by source-order assertions, not end-to-end | this commit | — |
| 18 | 6AE (PR number not re-verified) owner-choice routing | **Integrated** (routing function copied verbatim, wired into the V2 trigger delivery): a GM who performed the spend does not auto-open the choice while an eligible player-owner is connected; fail-closed on unverifiable ownership; 8 tests | this commit | — |
| — | end of the 6O–6AE chain | **Complete: every phase is integrated, re-derived, satisfied by V2, or superseded.** This is a disposition, not a certification: remaining gameplay contracts (e.g. Last Grasp timing, uncertified FP-RD-003 abilities) and live Foundry v13 verification are still open. | — | — |

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

**FP-RD-015 (provisional; owner confirmation pending):** Emergency Patch consumes the point on a failed check (owner-adopted house-rule policy); the enabled setting plus a typed `house-rule` contract (`threshold:lastGrasp`, `threshold:emergencyPatch`) authorizes ordinary player use with no per-use adjudication, V2 round cap still applies (tested). Last Grasp timing remains deferred. Previously: reclassified as an optional house rule (both settings default off); the "printed text" wording was wrong and is corrected; the reviewer's policy is recorded as an unadopted owner-review proposal. `NOT_FOUND_STATIC` APIs remain preserved.

**Matrix freshness:** re-run on head after these edits over the focused set (`tests/*force*`, `class-*`, `v2-*`, temptation, serenity, species): **103 test files, 98 pass, 5 fail**. The five are the original baseline failures (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`); no new failures. "169" in §8 counted individual tests from an earlier selection; this run counts **files**.

**Force Alchemy:** FP is exactly compensated, but credits/DSP still use snapshot rollback, so the multi-resource rite is **not** certified atomic and should not be relied on for partial-failure safety until the TransactionEngine-based design is reviewed.

**FP-RD-015 hardening (2026-11-23, reviewer comment 7106786373):** `attemptEmergencyPatch` now validates a finite Mechanics result and the crewed engineer before paying, and finalizes only after the once-per-encounter flag lands (rejected-not-applied ⇒ exact rollback; applied-but-unacked ⇒ finalize; replay refused, no double charge). `executeLastGrasp` requires `options.vehicle` at 0 hull with this actor as crewed pilot. Real `HouseRuleService` against a stubbed settings API is exercised, including toggle-off. Threshold suite: 14 checks; mutation-checked (removing the check validation or the flag reconciliation fails it). Focused matrix after the change: 103 files, 98 pass, same 5 baseline failures. Open: the Mechanics result is still a caller-supplied number (no verified roll-event source exists); owner provenance of the charge policy is cited to the chat message in the register.

## 13. Correction to the "eight ActiveAdapter Force Point abilities" claim (read-only audit, 2026-11-23)

**The earlier claim (§12 and the review comments) that eight cost-bearing abilities are routed through `ActiveAdapter` and now denied is not supported by the shipped data.**

- `ActiveAdapter.handleEffect` reads its cost from the *item's* `system.abilityMeta.cost`. Across `packs/talents.db`, `packs/feats.db`, `packs/sample-active-abilities.db`, `packs/species-abilities.db` and `packs/class-features.db`, **no item has `abilityMeta.cost.forcePoints > 0`** (the sample pack's three entries are all `0`). So the FP-RD-003 gate currently denies **zero shipped abilities** through this path; it protects future/authored ones.
- The eight entries (Regain via Force Point, Severing Strike, Shien, Acrobatic Recovery, Force Haze, Improved Dark Rage, Surge of Power, Enhanced Recovery) live in `data/talent-granted-abilities.json`, which `TalentActionLinker` loads to link combat-action cards. No code reads their `cost.forcePoints` as a spend (`grep` finds only an unrelated migration-validator read). They are descriptive metadata, **not** a payment path, and none currently charges a Force Point.
- Several of those descriptions do not match published SWSE text as far as this repo's audits show (e.g. `Surge of Power`, `Force Haze` have no source in `docs/audits`; `Improved Dark Rage` appears only in Force Unleashed definition audits). They are `NOT SOURCE_VERIFIED` and must not be turned into automated spends without a source and a ruling. Certifying them is therefore **not** a blocker for player access; it is future work if/when one is wired to spend.
- Net effect: no player-facing regression from the Decision A gate was found in shipped content. The per-ability certification list remains a work list only if an owner chooses to wire any of these as real automated spends.

Open for the owner: whether any of the eight should become an automated Force Point spend at all (each needs printed source, trigger, action cost, and a contract; none is decided here).

## 14. Slice 8 — 6T disposition and an INCOMPLETE earlier Decision A inventory (2026-11-24)

**Correction (mine).** §6B/§10/§11 and my earlier report said no direct Force Point decrement remained "on any path I found". The inventory behind that claim was too narrow (it searched for `system.forcePoints.value` writes in a few engine files). A wider search finds more writers. §6B/§11 are **not** a complete list.

**6T (#1133) — NOT merged, exemption documented.** 6T routes WatchCircle Initiate's loss through the spend path so Temptation fires. The canonical talent text (`packs/talents.db`) says the point is subtracted from the normal total, "cannot be subtracted from temporary Force Points, and **does not count as spending a Force Point**". Treating it as a spend would impose the round cap, the FP-RD-003 contract gate and a Temptation trigger the printed rule says do not apply. So `_spendNormalForcePoint` stays a direct normal-pool subtraction as a **documented ability-specific exemption by source** (Decision A). Engineering change made: a failed ally gain now returns the subtracted point (the transfer is one event). Test: `class-force-v2-watchcircle-exemption` (3 checks). 6T's census doc is superseded by this section.

**Direct Force Point writers found by the wider search** (`grep` for update objects writing `forcePoints`):

| File | Sites | What it is | Reachability |
| --- | --- | --- | --- |
| `scripts/engine/talent/talent-effect-engine.js` | 15 (`build*Plan` planners: Channel Aggression/Anger, Crippling Strike, Dark Side Talisman, Exposing Strike, Dark Retaliation, Skilled Advisor, Apprentice Boon, Dark Healing ×3, Wicked Strike, Drain Force, Sith Talisman) | pure mutation planners that put `system.forcePoints.value: current - 1` into a plan; callers apply the plan | callers: `dark-side-devotee-mechanics.js`, `light-side-talent-mechanics.js`, `scripts/talents/DarkSidePowers.js`. `buildDarkSideTalismanPlan` has no caller. |
| `scripts/talents/DarkSidePowers.js` | 6 | direct FP deductions (`_spendFP`) | entry points installed only by `scripts/talents/dark-side-powers-init.js` |
| `scripts/engine/talent/dark-side-devotee-mechanics.js` | 1 | Dark Side Talisman deduction | installed only by `dark-side-devotee-init.js` / `-macros.js` |
| `scripts/engine/talent/sith-talent-actions.js` | 1 | direct deduction | referenced from the V2 character sheet and `index.js` — **likely reachable**, needs a per-site audit |
| `scripts/engine/combat/reactions/reaction-rule-adapter.js` | 1 | reaction cost write | used by `reaction-engine.js` — needs audit against the V2 reaction finalize path |
| `scripts/sheets/v2/character-like-sheet.js` | 6112–6141 | the sheet's manual +/- Force Point buttons | **not a spend** (user-managed adjustment); left alone |
| `scripts/actors/base/swse-actor-base.js:354`, `GMWorkspaceSurfaceController.js:396`, `actor-engine.js` regain/rollback | — | regain / GM reset / V2 internals | not spends |

**Reachability finding (static, not proof):** `scripts/talents/dark-side-powers-init.js`, `dark-side-devotee-init.js` and `light-side-init.js` are **not imported by `index.js`** (only `squad-actions-init.js` and `minion-actions-init.js` are, and `system.json` loads only `index.js`). Those files install the `window.SWSE.macros.*` / `window.SWSE.talents.*` entry points for the Dark Side and Light Side talent planners, so those planners appear **unreachable from the shipped runtime** (`NOT_FOUND_STATIC` — dynamic or macro use not excluded). This matches the project's classification **E: macro-only/global legacy utility** — deletion or rerouting needs the owner's macro-compatibility policy. Nothing was changed here.

**Impact if rerouted:** each planner would need a V2 `ability-option` contract (published source, trigger, action cost) or GM adjudication; until certified, players would be denied. That is a large behavior change across ~20 talents, so it is held for the owner (see the decision below), not done silently.

**Also audited (no change):** `sith-talent-actions.js` Drain Force reduces the *target's* Force Points as the printed effect of the talent ("the target loses one Force Point"), which is an effect on an opponent, not a spend by the actor, so it is not routed through the spend path. `reaction-rule-adapter.js` only reads a cost number and writes nothing; the V2 reaction engine already spends and finalizes.

**Decision needed (owner):** for the Dark Side / Light Side talent planners and macro entry points — (a) retire them as legacy (the `-init` files are already unimported), (b) certify contracts talent by talent and route them through `spendForcePoints`, or (c) leave them as-is and unreachable. `sith-talent-actions.js` and `reaction-rule-adapter.js` I will audit and fix myself if reachable.

**Update (2026-11-24): reachability manifest and classification guard.** See `docs/audits/legacy-direct-fp-writers-reachability-manifest-2026-11-24.md`. A static import-graph walk from `index.js` shows the FP-debiting planners in `talent-effect-engine.js` are loaded but only invoked by three modules (`light-side-talent-mechanics.js`, `DarkSidePowers.js`, `dark-side-devotee-mechanics.js`) that are **not in the graph** (`UNREACHABLE_SHIPPED`, static; world Macro documents are `EXTERNAL_MACRO_UNVERIFIED`). `tests/class-force-v2-direct-fp-writer-classification.test.mjs` pins every direct-writer file with a class and fails if a legacy file becomes reachable or a new writer is unclassified. The retire/certify/leave choice is still the owner's. WatchCircle's transfer now reconciles exactly (§14 manifest section) and no longer burns Farseeing when the roll dialog is cancelled.

**Reaction payment settlement (2026-11-24, reviewer comment 7120536615):** `forcePointPaidBy` had **no producer anywhere** and was a caller-controlled waiver of the payment; the bypass is removed (the engine always pays through its own V2 receipt). Receipt settlement is now explicit: `settleReactionPayment` tries once more and re-reads the actor's own ledger (a write may have applied before the error), and `resolveReaction` returns `paymentSettlement: 'none' | 'settled' | 'unresolved'`. An applied reaction whose receipt cannot be finalized is NOT refunded and reports `unresolved` (GM reconciliation) instead of a clean success; a failed reaction whose compensation cannot be completed returns failure with the same status. Tests (class-phase-6z, 13): forged `forcePointPaidBy`, finalize applied-but-ack-lost, finalize impossible, compensation refused; the bypass restoration is mutation-checked. Not covered: durable retry/reload reconciliation of a `committed` receipt after the client closes (it stays `committed` on the actor's ledger; a later GM reconciliation tool is not built). For reactions other than Block/Deflect/Force Fortification the chat dataset is source-derived, not an immutable event identity (open runtime/provenance acceptance).

**Unsettled-receipt reconciliation (2026-11-24, reviewer comment 7131435006, part B).** A receipt left `committed` on the actor's own ledger (client closed, write rejected twice) is never settled automatically: whether the paid effect applied is not knowable from the ledger. `ActorEngine.listUnsettledForcePointReceipts(actor)` is a read-only inventory (receipt id, ability source ref, reaction event id, adjudication); `ActorEngine.reconcileForcePointReceipt(actor, receiptId, {decision:'finalize'|'rollback', reason})` is GM-only, requires a written reason, uses the existing exact finalize / rollback, records `reconciliation {decision, reason, userId, worldTime}` on the receipt, and is idempotent (a settled receipt is reported, a finalized spend can never be rolled back). Exposed to GMs as `game.swse.forcePointReceipts.{listUnsettled, reconcile}`. 6 tests (`class-force-v2-receipt-reconciliation`), mutation-checked. Not built: a GM dialog, automatic `ready`-time notice, and attack-event evidence on non-contract reaction receipts.

**Force Alchemy multi-resource costs (2026-11-24, reviewer part A).** Still **not atomic across documents and never claimed to be**; now recoverable. `applyResourceCosts`: FP via the V2 spend; Dark Side Score and credits in ONE actor write computed from FRESH state after the FP spend (insufficient credits at that point returns the exact FP receipt); an error from the write is not trusted (the actor is re-read): applied => cost stands (no double charge), not applied => FP returned, partial => `ForceAlchemyUnresolvedError` (GM review, no automatic retry). `revertResourceCosts` is **inverse-delta on current values for what was actually applied** (the old code restored `before` absolutes, clobbering unrelated concurrent credit / Dark Side Score changes, and wrote both even for an FP-only rite). FP finalization uses the shared `settleForcePointReceipt` (retry + ledger re-read; also now used by the reaction engine); an unfinalizable receipt yields `fpSettlement: 'unresolved'` and stays in `listUnsettledForcePointReceipts`. An unresolved compensation keeps the `applying` slot (`pendingCosts`) as durable evidence instead of clearing it. 9 failure-injection tests (`class-force-v2-alchemy-atomicity`; mutation-checked: no re-read, absolute restore). Credits are still written through `ActorEngine.updateActor`, **not** `TransactionEngine`: that engine documents itself as not multi-document atomic and its credit contexts are store/GM/holonet allow-listed, so routing a rite through it would add no guarantee and needs a bounded extension nobody has designed. Not built: a durable idempotency key across client reloads for the rite itself (the slot's `pendingCosts` flag is the only durable marker), and a GM dialog for the unresolved cases.
