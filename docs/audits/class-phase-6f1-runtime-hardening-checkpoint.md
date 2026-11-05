# Class Phase 6F-1 — Runtime integrity checkpoint

**Date:** 2026-11-02  
**Base:** main at `62169f621e15409268ca8f91efd846a3a2c118d9` (merged PR #1093)  
**Review:** Draft PR #1094 (`fix/class-phase-6f1-runtime-hardening`)  
**Status:** Changes pushed; exact-head CI and Foundry v13 live certification must be confirmed separately.

## Scope and authorities

- **Officer Share Talent (Core p. 222):** Previous permanent even-Officer-level talent selections remain intact. Runtime activation checks active combat/turn, GM confirmation of target allegiance and sight/hearing, remeasures token ranges and verifies scene/encounter identity at action time. Recipient talent Items are temporary clones of the Officer's owned canonical talent, with exact provenance and encounter cleanup. Mutation legs are tracked BEFORE entering ActorEngine, so the outer verified recovery checks a potentially partially changed leg.
- **Temporary prerequisites:** `isOfficerSharedTalentPrerequisiteWaived` recognizes only typed, internally consistent temporary Officer grants; `PrerequisiteIntegrityChecker` exempts those, not ordinary talent Items. The waiver does not authorize arbitrary acquisition.
- **Permanent talent ownership:** `isPermanentOfficerTalentItem` is the shared predicate used in both Officer acquisition options and activation's source Item lookup. Borrowed Share Talent clones, other temporary talents, and temporary-flagged Items are ineligible to become permanent selections or to be re-shared.
- **Action economy:** Share Talent now uses `ActionEconomyConsumption.spend(officer,'standard',...)` and refuses a noncommitted/no-op result. This is the V2 action authority. `SWSECombatant.useAction('standard')` is a legacy path which incorrectly consumes a move action; no global combatant rewrite is attempted in this class-scoped PR.
- **Encounter expiry / linked effects:** `planOfficerShareTalentExpiry` selects only proven temporary shared talents of the exact encounter and their owned ActiveEffects using the existing `foundryvtt-swse.talentEffect.talentItemId` provenance. One transactional ActorEngine delete removes effect IDs before Item IDs; permanent talents and effects from other encounters are untouched. Cleanup actor deduplication uses actor UUID to preserve separate synthetic token actors, not just shared world Actor IDs. The Officer's active turn is checked again just before action spend after asynchronous grant mutations.
- **Failure-injected transaction coverage:** `executeOfficerShareTalentTransaction` is a pure orchestration layer using the real ActorEngine method contracts via injection. It captures snapshots before any grants, tracks an Actor before its mutation leg starts, rechecks the current turn before spending, and demands an actual V2 committed standard action. The new `tests/officer-share-talent-transaction.test.mjs` exercises success, recipient failure after a partial write, Officer ledger failure, no-op spend, turn advancement, and inexact rollback; any unverified recovery is labeled INDETERMINATE.
- **Enforcer Resources (Force Unleashed p. 44):** Delivery is a GM-approved equipment entitlement, not credits or a store purchase. Eligible entries must be priced Restricted/Military source documents that Store V2 actually loaded from a compendium (`__storeSource` match). World copies retaining old `sourceId` are rejected. Deliver and defer use one per-actor in-client decision lock, with ledger read inside that lock.
- **Command Cover:** The existing `CombatStatusResolver` cover-suppression predicate is exported and reused by attack target-defense paths. Command Cover and ordinary cover remain the higher applicable cover bonus, not an additive pair; explicit cover suppression blocks both.

## Test coverage added or expanded

- Enforcer world-source/copy/mismatched pack cases, priced availability and one-time ledger resolution.
- Enforcer per-actor overlapping decisions and release-after-failure.
- Share Talent scene mismatch, moved targets, repeated token and actor identities, combat membership, range in Foundry v13 scene-distance units, GM confirmation.
- Share Talent typed provenance/waiver spoof resistance, canonical V2 action-spend wiring and touched-leg rollback evidence.
- Officer talent picker and activation-source rejection of borrowed temporary talent Items.
- Provenance-scoped temporary Item + ActiveEffect expiry with cross-encounter preservation, ambiguous identity refusals, and synthetic Actor UUID deduplication.
- Second current-turn check immediately before spending a standard action.
- Command Cover suppression use in both contextual target-defense and getTargetDefense access.

## Continuation: source-rule and cleanup review

- **Core p. 222 verified from the supplied text:** Share Talent recipients are allies within 10 squares who can see and hear the Officer; they are NOT required to be combat tracker participants. The dialog and scene resolver now include eligible scene actors outside initiative, while the Officer must still act on the current encounter turn.
- **Allegiance adjudication:** The Core rule does not define allies by Foundry token disposition. The scene/dialog no longer reject neutral/hostile-labeled tokens solely by UI disposition; only a GM's explicit `confirmedAllies` and `confirmedSenses` approval authorizes each selected target. This does not automatically infer allegiance, visibility or hearing.
- **Synthetic recipients:** Scene checks, duplicate prevention, daily-use receipt references and the share plan now use synthetic Actor UUIDs when available, avoiding conflation of separate unlinked tokens created from the same base Actor template.
- **Expiry failure isolation:** A malformed encounter-tagged share grant fails explicitly with GM-review evidence instead of being silently skipped. Each recipient cleanup is attempted separately using the same transactional ActorEngine path. An error does not prevent cleanup of other actors; failures are reported and the system never claims a successful full encounter cleanup.
- **More complete failure reporting:** The injectable `executeOfficerShareTalentExpiry` isolates per-actor failures, preserves evidence of successfully cleaned actors, and returns both `expired` and `failures`; service raises a GM-facing incomplete-cleanup error if any recipient failed. Tests exercise a malformed recipient and an ActorEngine throw while verifying later recipients are still processed.
- **Enforcer vehicle ownership metadata:** The existing StoreAcquisitionService now retains the caller-supplied source for owner links and relationship records. Ordinary store purchases still default to `store`; Enforcer grants remain identified as `Enforcer Resources` rather than appearing as purchased assets.
- **Talent runtime certification:** The passive/active talent engines are distributed. The legacy `initializeTalentEffectsHooks()` function is present, but a repository search located no corresponding index registration. Therefore neither copying a talent Item nor the standalone hook's existence proves that all Officer-shared talent effects execute. No global hook registration was added without a separate duplicate-effect audit.

## Evidence / certification gates

- Prior PR #1094 head `a46962e2dcaa68e7179cf3fa14bece729affd6ca` passed rolling CI, run 41521610934.
- Later commits require their **own exact-head CI**; do not apply prior run results to later heads.
- **No live Foundry v13 tests** have been executed in this review. Do not claim live readiness based on Node/regex tests alone.

## Known boundaries still requiring implementation or live verification

1. Officer temporary talent **mechanical benefits** across the canonical talent effects system, including active-use talents, and encounter-end removal on unloaded scenes and concurrent hook callbacks. The expiry plan now covers currently discoverable synthetic actors and linked effects, but live certification remains necessary.
2. Multi-actor rollback and V2 action-spend recovery are covered by injected pure tests, but require live Foundry document/event replay. `ActionEconomyConsumption` stores turn state separately from legacy `system.actionEconomy`; reconcile legacy consumers in a separate action-economy convergence effort. `ActionEconomyConsumption` stores turn state separately from legacy `system.actionEconomy`; reconcile legacy consumers under a distinct controlled action-economy convergence effort.
3. Enforcer Resources **cross-client** GM concurrency and level-up-vs-equipment-delivery races: the in-client lock does not guarantee distributed atomicity. Real Store V2 vehicle creation, linking, and rollback require Foundry runtime tests.
4. Command Cover target context/cover suppression across unusual token topology, alternate attack callers, hex grids and elevation.
5. Prerequisite waiver recognition is scoped to actor integrity tracking; other talent activation rules may still require canonical downstream inspection.

**Merge policy:** PR remains draft until exact-head CI passes, independent review adjudicates blockers, and Foundry v13 integration is verified. Nothing here certifies the entire 37-class feature system.
