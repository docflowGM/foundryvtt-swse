# Progression Evidence Authority & Manual Completion - Implementation Report (cumulative)

Branch `claude/clever-shannon-pwf22k-evidence`, stacked on PR #1146 head `8b14ee7` (PR #1145 `44cc3c7`). PRs #1145 and #1146 are not modified.
Addendum: `docs/audits/reconciliation-v2-manual-completion-addendum.md`. Owner decisions Q1-Q8 and C1-C8 apply as approved.

## Checkpoint A - mutation integrity (C4 / C2 / C1) - IMPLEMENTED, Node-tested
**Defect confirmed statically.** The reconcile route (`_openProgressionReconciliationStep`, `singleStep: false`) reaches `AbilityScorePlanBuilder.buildLevelUpSet` through
`phase4BuildFinalizerAbilitySet` with `manifest = plan.set['flags.swse.levelUpEntitlementManifest'] || null`, which is `null` for reconciliation sessions. The builder took its level
only from `manifest.characterLevel` (null / 0), although the attribute step had already committed the correct `abilityIncreaseLevel` and `slotId` in `draftSelections.attributes`.
Scores were increased but the history record had no valid level, which the reconciler ignores - the entitlement stayed open and a second Apply added the increase again.
The single-step writer (`_compileSingleStepAttributeSet`) fell back to the actor's CURRENT level.

**Fix.**
- New `mutation/ability-increase-guard.js`: `resolveEntitlementLevel` takes the level from `attr.abilityIncreaseLevel`, the slot id (`ability-increase-level-N`) and the manifest; any
  present-but-invalid value (null/0/negative/non-integer/non-id string) or disagreeing sources FAIL CLOSED; no source fails closed; no fallback to the current level.
  `assertEntitlementOpen`: one active record per entitlement - an existing entry for the level blocks a new additive application (C1/C2).
- `AbilityScorePlanBuilder.buildLevelUpSet` (the LIVE writer) uses the resolver, stamps `entitlementId`, and no longer replaces by level (it refuses instead). Throws before any score is computed.
- `ProgressionFinalizer._applyMutationPlan` is now the guarded transaction boundary for BOTH finalize paths (`finalize`, `finalizeSingleStep`): `beginAbilityIncreaseTransaction` refuses an invalid level,
  a concurrent duplicate from this client, an entitlement recorded since preparation, and any increased score that no longer equals the value the plan was built from. Refusals return before ActorEngine is called.
- `_compileSingleStepAttributeSet` no longer supplies the actor's level.
- The dead inline ability block in `ProgressionFinalizer` was deliberately NOT edited (C5).

**Residual (not eliminated).** Foundry has no document transaction. Writes are absolute (`base = old + delta`), so two identical stale submissions cannot stack, and the boundary re-read narrows the window,
but two DIFFERENT selections prepared from the same stale read by two clients and committed within that window are not provably prevented. Fail-closed where detectable; documented as an open limitation.

**Tests.** `tests/ability-increase-entitlement-integrity.test.mjs` (11 groups): normal level-up records the entering level; chargen fabricates no history; the level-9-actor / level-8-entitlement regression through the real
finalizer compile (and the old builder fails it); fail-closed identity matrix; single-step; apply-once with level 4 record untouched and the reconciler seeing level 8 filled and no level 9 slot; duplicate refusal at the
boundary and at a fresh compile; same-client concurrency; stale scores; failed mutation records nothing and releases the guard. ActorEngine is a stub applying `plan.set`; real ActorEngine / Foundry behavior is untested.

## Checkpoint B - canonical completion reader - IMPLEMENTED, Node-tested
`reconciliation/progression-completion-reader.js` is the ONE read-only interpretation of the persisted progression evidence (first domain: ability-score increases from
`system.progression.abilityIncreaseHistory`). API: `getEntitlementCompletion(actor, entitlementId, ctx)`, `getAbilityIncreaseCompletion`, batch `getAbilityIncreaseCompletions`. The entitlement COUNT and the
deferred-rules flag are supplied by the caller from the existing authorities (`_abilityIncreaseCountForActor`, RECON-002/003); the reader owns no rules, writes nothing, and never reconstructs history from current scores.

Per entitlement it returns: stable id, type, level, expected count, applied / attested / GM-authorized selections, remaining unknown, classification (`SYSTEM_VERIFIED`, `SYSTEM_COMMITTED_UNVERIFIED`,
`PLAYER_ATTESTED`, `GM_AUTHORIZED`, `PARTIAL`, `UNVERIFIABLE`; `CONFIRMED_DISCREPANCY` is never produced from history alone), `provenShortfall`, evidence sources, session references, verification state,
conflicts and preserved legacy records.

Rules implemented from the approved decisions: Q2 - a record with no recognised provenance is preserved and shown but is UNVERIFIABLE, never trusted as system evidence (a recognised writer label only claims a
source: `SYSTEM_COMMITTED_UNVERIFIED`; `SYSTEM_VERIFIED` requires a recorded `verification.state === 'verified'`, which nothing writes yet - Checkpoint C); Q3 - partial manual evidence leaves the remainder
unknown (not an open finding) while a short SYSTEM record remains a proven shortfall; Q1/C7 - deferred (droid / Nonheroic) entitlements ignore attestations; C1 - system and manual records for one level are reported as a conflict and the
system record wins; withdrawn / superseded records do not count; duplicates merge (no double counting); C6 - `lastAbilityIncrease` never overrides the history and is supplementary only for an untracked level.

Reconciler integration: `_buildAbilityIncreaseSlots` now derives status and counts from the reader; its private history parser (`_readAbilityIncreaseHistory` + three helpers) was removed (no competing reader). Behavior change by decision (Q2):
a history record with no recognised `source` used to fill the slot and now shows as unverifiable. Existing slot ids, labels and the open / unverifiable / filled semantics are otherwise unchanged; slots gain a `completion` block.
Other domains are NOT migrated to the reader (feats, talents, skills, Force, HP keep their existing readers until proven equivalent).

Tests: `tests/progression-completion-reader.test.mjs` (13 groups); `tests/reconciliation-v2-contract.test.mjs` 14b updated and 14c / 14d added.

## Checkpoint C - verified progression evidence for ability increases - IMPLEMENTED, Node-tested
After `ActorEngine` reports success, `ProgressionFinalizer._applyMutationPlan` (the single transaction boundary for `finalize` and `finalizeSingleStep`) calls `_recordAbilityIncreaseVerification`:
`verifyAbilityIncreaseCommit` compares the plan's intended effect with what the actor now holds (each increased score equals the planned value; the canonical history contains the planned record for the
entitlement) and the result is written as a `verification` block on that SAME history record (`state: 'verified' | 'failed'`, `verifiedAt`, `sessionId` from `system.progression.completedSessionId`, `checks`, `reasons`).
Nothing is labelled verified in the plan; no second receipt array exists; a failed check is recorded as `failed` and the reader keeps `SYSTEM_COMMITTED_UNVERIFIED`; if the marker cannot be persisted the finalization still
succeeds and the record stays committed-unverified; a failed mutation records no evidence; a later manual score edit does not erase the historical record (C8). Plans without an ability increase are untouched.
Scope: ability increases only. HP history, feat / talent certification (`progressionCertifications`, `_certifyProgressionSession`) and the level-up receipt keep their existing behavior and are not re-labelled; no other domain is marked verified.
Tests: `tests/ability-increase-verification.test.mjs` (7 groups; ActorEngine stubbed).

## STOP - acceptance gate before Checkpoint D
Per the assignment, Checkpoint A must be accepted before manual acknowledgments are enabled. Checkpoints D (acknowledgment / correction / withdrawal / GM supersession mutations), E (Character Review: Already Applied, Apply Increases,
Review Progress) and F (integration, Foundry acceptance) are NOT started. Open items carried forward: the cross-client race residual (Checkpoint A), Apply for a level that already has a PARTIAL system record is blocked (no completion route yet - needs an owner decision), Q1-Q8 are encoded in the reader but have no UI yet.

## Correction checkpoint EVD-01 … EVD-05 (independent review of b478776)
**Provenance note.** The review message referred to a "previously issued EVD-01 through EVD-05 correction directive" that was not available in this session; the corrections below were implemented from the five findings and their one-line
descriptions in the review. Where a finding left a choice open the conservative option was taken and is listed under "Assumptions". Checkpoints D, E, F were NOT started.

**EVD-01 - unknown counts stay unknown.** `strictCount` (positive integer, else `null`). The reader's `expectedCount` was `Number.isFinite(Number(x)) ? Number(x) : null`, i.e. `Number(null) === 0` (the same coercion class as the earlier `Number(null)` defects); it now stays `null`,
`remainingUnknown` stays `null`, and with an unknown count NOTHING is called complete or short whatever the evidence (the evidence is still shown). The builder refuses to award against an unknown or mismatched count
(`ENTITLEMENT_COUNT_UNKNOWN` / `ENTITLEMENT_COUNT_MISMATCH`: selected total must equal the entitled count).

**EVD-02 - the entitlement must exist.** Before any score is computed the builder requires an injected existence check and refuses without one (`ENTITLEMENT_UNVALIDATED`) or when it fails (`ENTITLEMENT_NOT_FOUND`). The check uses the canonical authorities, not a cadence re-derived here:
`ProgressionFinalizer._abilityEntitlementCheck` - a normal level-up is checked against the level-up manifest (`abilityIncreases.required`, `count`, same entering level); a reconcile / single-step application against the reconciler's slot list
(`ability-increase-level-N` must exist; a deferred droid / Nonheroic slot is refused with `ENTITLEMENT_COUNT_DEFERRED`, RECON-002/003). The SAME check runs again at the transaction boundary (`beginAbilityIncreaseTransaction`) so an entitlement that disappeared
between preparation and commit (for example the level changed) commits nothing. A record without a `transactionId` is refused.

**EVD-03 - every intended effect and the exact transaction identity.** Each record now carries a unique `transactionId`. `verifyAbilityIncreaseCommit` matches the history record by that id (not by timestamp or level), requires it to appear exactly once with the
planned entitlement id and increases, requires `lastAbilityIncrease` to be the same transaction, and checks ALL six permanent bases: selected scores equal the planned values and every other score equals the pre-commit snapshot taken at the boundary (no snapshot => fails closed).
The persisted marker records `transactionId` and `checks {scores, record, latest}`.

**EVD-04 - no overwrite of newer history.** The marker write re-reads the history, locates the record by transaction id, refuses to resurrect a missing record, is idempotent for an already-verified record, rebuilds the array from the CURRENT state, and makes a last synchronous
comparison immediately before `updateActor`; if newer history landed it rebuilds (two attempts) instead of overwriting. The race test fails when that comparison is removed. **Residual:** Foundry has no compare-and-set, so a change inside the final check-to-call gap is not provably excluded.

**EVD-05 - mixed system + attested evidence.** The reader combines system-applied and manual selections per ability under the canonical allocation rule (`ProgressionRules.getAbilityIncreaseAllocationMode`, cap 1 or 2). A short system record completed by an attestation is `PLAYER_ATTESTED` with `mixed: true` (weakest link)
and both parts listed; overlap beyond the cap is not double counted and is reported; manual evidence only fills what the system evidence has not satisfied (never relabels a complete system record, never exceeds the entitlement); a short system record with no manual statement stays a proven shortfall,
and any manual statement leaves the remainder unknown (Q3); an active GM statement outranks player attestations (Q5). Apply remains refused while ANY record exists for the level (`assertEntitlementOpen`), so mixed evidence cannot be double applied. No attestation writer exists yet (Checkpoint D).

**Assumptions / decisions for the owner.**
1. EVD-02 is enforced at the `ProgressionFinalizer` transaction boundary (the single path every progression plan takes to `ActorEngine.applyMutationPlan`), not inside `ActorEngine` itself, because `ActorEngine` (governance) must not depend on progression modules. A caller that bypasses the finalizer and calls `ActorEngine.applyMutationPlan` directly is not covered. Moving the check into ActorEngine needs a dependency decision.
2. "Every intended mechanical effect" covers the six permanent ability bases, the history record and the latest-event record. Derived consequences of an increase (the CON-driven HP delta, INT-driven skill training, modifiers) are not verified here.
3. Behavior changes: Apply now requires the selected total to equal the entitled count; the reconcile-route Apply is refused for deferred (droid / Nonheroic) slots; a level-up whose manifest count is unknown is refused.
4. Apply for a level that already has a partial system or manual record stays blocked (no completion route until D).

**Verification (Node harness, ActorEngine stubbed).** New / extended: `ability-increase-entitlement-integrity` (EVD-01c, EVD-02a-e), `ability-increase-verification` (EVD-03a-d, EVD-04a-b), `progression-completion-reader` (EVD-01a-b, EVD-05a-e). Full sweep of all `tests/*.test.mjs`
(170 s per-test limit): only the same five force-power baseline failures (also red at PR #1145's merge base). Validators: partials, data, `system.json` pass. Foundry V13 acceptance: not performed.

## Final evidence-integrity corrections EVR-01 … EVR-05 (independent review of 4862d1e)
Owner decisions applied: progression legality stays in `ProgressionFinalizer` (ActorEngine stays generic); verification covers the direct ability-base changes and transaction records only (derived HP / skills / modifiers are not implicitly certified);
system Apply consumes exactly the source-established count (unknown fails closed; invalid allocations are rejected, not clamped); any existing partial system or manual record blocks automatic Apply; cross-client race protection stays an unverified runtime limitation.

**EVR-01 - complete contract at the final boundary.** The history record now stores the contract it was built under (`entitledCount`, `allocationMode`). `beginAbilityIncreaseTransaction` re-reads, from the canonical authorities supplied by the finalizer, existence, the CURRENT count,
deferred status and the CURRENT allocation rule, and refuses a stale plan: `ENTITLEMENT_NOT_FOUND`, `ENTITLEMENT_COUNT_DEFERRED`, `ENTITLEMENT_COUNT_UNKNOWN`, `ENTITLEMENT_CHANGED` (count differs from compile time), `ALLOCATION_RULE_UNKNOWN` / `ALLOCATION_RULE_CHANGED`; the recorded selection is re-validated
against the current cap and count; duplicate / in-flight / changed-score checks remain. No formula is duplicated (existence and count come from the level-up manifest or the reconciler slot list).

**EVR-02 - exact plan / evidence equivalence, before and after commit.** Before commit (`checkPlanEvidenceEquivalence`): every declared positive increase has exactly one `base` mutation equal to the actor's CURRENT base + delta; no other ability-score key (`base`, `temp`, `racial`, `system.abilities.*`) is touched;
the plan's history carries this transaction exactly once and identical to the latest-event record. A record that claims +2 with only one score mutation is refused before ActorEngine (`PLAN_EVIDENCE_MISMATCH`). After commit, verification no longer trusts the plan's own numbers: a declared increase must equal the verified PRE-COMMIT base + delta, every other score must equal its pre-commit base
(no snapshot => fails closed), the history must hold this transaction once as planned, and `lastAbilityIncrease` must match the exact transaction, entitlement and selection (not only the id). A partially verified result is `failed`, never `SYSTEM_VERIFIED`.

**EVR-03 - a partial historical record is not a proven error.** `provenShortfall` is never set from history. A short record - recognised writer, verified or not - keeps its known part and leaves the remainder unknown (`PARTIAL`), so the reconciler shows it as `unverifiable` and never `open`; a confirmed missing-increase would need independent evidence the history cannot supply.
Behavior change from 4862d1e: a short system record used to be an open finding; it is now informational (contract test 14b rewritten).

**EVR-04 - malformed selections are rejected.** `validateAbilitySelection` (shared by the builder and the boundary) validates the submitted selection as given: excess on one ability, negative, fractional, non-numeric, `null`, numeric strings, unknown ability keys, a non-object selection, a total different from the entitled count, and an unreadable allocation rule are all refusals. Nothing is clamped, rounded or dropped. An empty selection is "nothing to apply".

**EVR-05 - deferred Droid / Nonheroic.** For a rules-deferred entitlement (RECON-002/003) the reader classifies the entitlement `UNVERIFIABLE` whatever the history (even a verified record), keeps the recorded selections visible, reports `remainingUnknown: null`, and never counts attestations. Previously recorded increases no longer read as a satisfied entitlement.

**Tests.** `ability-increase-entitlement-integrity` (EVR-01a-e, EVR-02a-c, EVR-04), `ability-increase-verification` (EVR-02d-e), `progression-completion-reader` (EVR-03 / EVR-05 updates), `reconciliation-v2-contract` 14b. Mutation checks: removing the equivalence check or the count revalidation makes the new tests fail.
Full sweep of all `tests/*.test.mjs`: only the same five force-power baseline failures (also red at PR #1145's merge base); no new failures. Validators: partials, data, `system.json` pass. Node harness only; ActorEngine stubbed; Foundry V13 not tested.

**Remaining limitations.** (1) Cross-client concurrency: Foundry has no compare-and-set. Absolute score writes, the in-process in-flight set, the fresh boundary re-read and the pre-write history comparison narrow the window; two different selections prepared from the same stale read by two clients and committed inside that window, or a change inside the final
check-to-call gap of the verification write, are not provably excluded. Needs Foundry V13 testing. (2) Callers that bypass `ProgressionFinalizer` and call `ActorEngine.applyMutationPlan` directly are not covered (owner-approved separation). (3) Derived effects of an increase are not verified. (4) Apply for a level with any existing record stays blocked; completing the remainder needs Checkpoint D's separately evidenced workflow.
Checkpoints D, E and F remain stopped.

## EVI-06 - stale history replacement during the main mutation (independent review of add8b8c)
**Finding (static, accepted).** `AbilityScorePlanBuilder.buildLevelUpSet` writes `system.progression.abilityIncreaseHistory` as `[...history at compile time, new record]`, which REPLACES the actor's array. The boundary checked only the entitlement being applied, so a prepared level 8 plan
could overwrite a newer change to another entitlement's record (an edit, addition, acknowledgment, withdrawal, supersession, or verification block).

**Second defect found while fixing it.** The plan's "pre-existing history" was a SHALLOW copy: its entries were the actor's own live objects, so an in-place edit of an entry also changed the plan's copy and no comparison could ever see it. The builder now takes a deep snapshot (`structuredClone`) of the history at compile time; the plan no longer aliases actor data.

**Fix.** `checkPlannedHistoryFresh` (in `ability-increase-guard.js`, called from `beginAbilityIncreaseTransaction` at the ProgressionFinalizer boundary): the new transaction record is identified by its `transactionId` and separated from the plan's history; the remainder must be IDENTICAL in content to the actor's CURRENT canonical history
(order-insensitive - the builder sorts by level - but exact in content, including `status`, `source`, `evidence`, `verification`, `increases`, `transactionId`). Any record the plan expects that was edited or removed, and any newer record in the actor that the plan would overwrite, refuses the mutation with
`HISTORY_CHANGED` before ActorEngine runs; nothing is merged. All earlier guards (entitlement contract, allocation, exact plan/evidence equivalence, in-flight, changed scores) are unchanged; writes still go through ActorEngine; no second ledger, migration or shim.

**Tests** (`ability-increase-entitlement-integrity`, EVI-06a-i): unchanged level 4 history succeeds and is preserved; a level 4 edit, an added level 12 record, an added manual acknowledgment, a withdrawn / superseded / removed record, and a changed verification block each refuse the stale level 8 plan with ActorEngine never called, no score changed, and the newer evidence intact;
a refusal with several concurrent changes erases or reverts nothing; a fresh plan compiled from the latest state proceeds and keeps the newer records; an out-of-order but unchanged history is not stale. Removing the guard makes the tests fail. Node harness, ActorEngine stubbed.
Full sweep: only the same five force-power baseline failures (red at PR #1145's merge base); validators pass. Foundry V13: not tested.

**Limitation (unchanged, not claimed fixed).** This closes the DETECTABLE stale-plan case. The final synchronous check and the Foundry update are separate steps and Foundry offers no compare-and-set, so a change landing between them is not provably excluded; it needs Foundry V13 testing. Checkpoints D, E, F remain stopped pending review.

### EVI-06a - record multiplicity (final review correction)
`checkPlannedHistoryFresh` compared the planned pre-existing records with the actor's current records using membership (`includes`), so `[A, A, B]` and `[A, B, B]` (same members, same length) were accepted. It now builds a count per canonical record on both sides and reports any record whose
count differs, so removed / duplicated-away copies and newly added / duplicated copies are both detected, while ordering alone is still ignored. Deep snapshot, entitlement / allocation / plan-equivalence guards and the single ActorEngine write path are unchanged.
Tests EVI-06a-1…5 (`ability-increase-entitlement-integrity`): `[A,A,B]`→`[A,B,B]` refused; two identical → one refused; one → two identical refused; the same records in a different order accepted and every copy kept; ordinary progression still commits and the earlier stale cases still refuse. Refusals leave the current history intact and never call ActorEngine.
The previous (membership) implementation fails the new tests. Full sweep: only the five force-power baseline failures; validators pass. Node harness only; the cross-client race remains a Foundry V13 item.

## Checkpoint D - manual completion acknowledgments (mutation layer, no UI) - IMPLEMENTED, Node-tested
**Scope.** `mutation/ability-acknowledgment-service.js`: `acknowledge` (full / partial / repeatable remainder, player or GM origin), `correct`, `withdraw`, `supersede` (GM). No UI (Checkpoint E) and no Foundry certification (F). Reconciliation, the reader and `getAbilityIncreaseCompletion` remain read-only.

**Contract (D1-D2).** Records live in the existing canonical `system.progression.abilityIncreaseHistory` and are explicitly NOT system transactions: `source: 'manual-attestation'`, `evidence: 'player-confirmed' | 'gm-authorized'`, `appliedBySystem: false`, a stable `acknowledgmentId`, `entitlementId` / `level`, `increases`,
`attestedBy` / `attestedByName`, `timestamp`, `status: 'active' | 'withdrawn' | 'superseded'`, and the rule context it was made under (`entitledCount`, `allocationMode`). Replacement links: `correctionOf` / `supersedes` on the new record, `supersededBy` / `supersessionKind` on the old one; `withdrawnBy/At` on a withdrawn one.
No transaction id, no verification block, no `lastAbilityIncrease` write, and never a score, HP or derived-statistic write: the only key patched is the history, through the injected ActorEngine (`updateActor`, guard key `ability-acknowledgment`).

**Validation (D3).** From injected canonical authorities (the finalizer's `_abilityEntitlementCheck` in the tests): the entitlement exists, its count is source-established (`strictCount`), it is not rules-deferred (droid / Nonheroic rejected), the allocation rule is readable. The selection is checked as submitted (`validateSelectionShape`, never clamped);
it must fit the remaining capacity computed through the READER (no ability above the per-ability cap once existing system + active manual evidence is counted -> `OVERLAPPING_CLAIM`; total within the count -> `EXCEEDS_ENTITLEMENT`); a complete system record refuses (`ALREADY_SATISFIED`). Identical active statements are idempotent (`unchanged`).
Everything is revalidated immediately before the write (entitlement, count, allocation rule, and the history compared with the snapshot - order-insensitive, multiplicity-sensitive, shared `historiesMatch` with the EVI-06 guard), and a per-actor-level in-flight set refuses a concurrent operation from this client.

**Mixed evidence (D4).** The reader's blanket "GM statement outranks player attestations" rule was removed: GM supersession now deactivates the INTENDED record (status `superseded`) and unrelated active player statements keep counting. GM statements are tallied first so a shared capacity goes to the GM part and an overlapping player claim is reported, not double counted.
A system part plus an attested remainder is `PLAYER_ATTESTED` (`mixed: true`, both parts listed, still `committed-unverified`); the label is `GM_AUTHORIZED` only when every manual part is GM.

**Permissions (D5).** `acknowledge`: the user must be able to modify the actor (injected `canModify`, default `actor.canUserModify`, fail-closed); `origin: 'gm'` requires a GM. `correct` / `withdraw`: the original author while they can still modify the actor, or a GM; another owner is refused; a player cannot change a GM statement.
`supersede`: GM only. Withdrawn / superseded records are kept and never counted, cannot be resurrected (`NOT_ACTIVE`), and system-applied records can never be targeted (`NOT_A_MANUAL_RECORD`). GM correction of someone else's statement is recorded as a GM-authorized replacement. These records are provenance, not security: actor owners can edit documents directly.

**Tests** (`tests/ability-acknowledgment-service.test.mjs`, 18 groups; reader tests updated for D4): full / partial / completing acknowledgments persist with no score or `lastAbilityIncrease` change; idempotence; invalid, overlapping and excessive claims; a system record never overwritten; partial system + complementary attestation; withdrawal; correction history; GM supersession of the intended record only; unauthorized correction / supersession /
non-owner / forged GM origin; deferred and unknown entitlements, missing dependencies; house-rule revalidation; stale-history refusal; concurrent operation refusal; interplay with system Apply (an acknowledgment blocks a new Apply and makes a prepared Apply stale); read-only reconciliation with no confirmed discrepancy from missing history. Removing the stale-history check or the author check makes the tests fail.
Full sweep (all `tests/*.test.mjs`): only the five force-power baseline failures; validators pass. ActorEngine is a stub; Foundry V13 not tested.

**Remaining limitations / questions.** (1) Cross-client race: the check-to-write gap is not a compare-and-set; two clients preparing from the same stale read are narrowed, not excluded. (2) No wiring yet: the production `deps` factory (real ActorEngine, `ProgressionRules.getAbilityIncreaseAllocationMode`, the finalizer entitlement check, `game.user`) is left to Checkpoint E so the service stays rule-free and testable.
(3) Whether a GM should be able to withdraw a GM-authorized statement made by a different GM is allowed here (any GM); an owner decision could restrict it. (4) `supersede` of an unchanged selection by a GM is recorded as a GM-authorized replacement (it is how a GM adopts a player's statement). Checkpoints E and F not started.
