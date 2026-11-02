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
- **Enforcer Resources (Force Unleashed p. 44):** Delivery is a GM-approved equipment entitlement, not credits or a store purchase. Eligible entries must be priced Restricted/Military source documents that Store V2 actually loaded from a compendium (`__storeSource` match). World copies retaining old `sourceId` are rejected. Deliver and defer use one per-actor in-client decision lock, with ledger read inside that lock.
- **Command Cover:** The existing `CombatStatusResolver` cover-suppression predicate is exported and reused by attack target-defense paths. Command Cover and ordinary cover remain the higher applicable cover bonus, not an additive pair; explicit cover suppression blocks both.

## Test coverage added or expanded

- Enforcer world-source/copy/mismatched pack cases, priced availability and one-time ledger resolution.
- Enforcer per-actor overlapping decisions and release-after-failure.
- Share Talent scene mismatch, moved targets, repeated token and actor identities, combat membership, range in Foundry v13 scene-distance units, GM confirmation.
- Share Talent typed provenance/waiver spoof resistance, canonical V2 action-spend wiring and touched-leg rollback evidence.
- Officer talent picker and activation-source rejection of borrowed temporary talent Items.
- Command Cover suppression use in both contextual target-defense and getTargetDefense access.

## Evidence / certification gates

- Prior PR #1094 head `a46962e2dcaa68e7179cf3fa14bece729affd6ca` passed rolling CI, run 41521610934.
- Later commits require their **own exact-head CI**; do not apply prior run results to later heads.
- **No live Foundry v13 tests** have been executed in this review. Do not claim live readiness based on Node/regex tests alone.

## Known boundaries still requiring implementation or live verification

1. Officer temporary talent **mechanical benefits** across the canonical talent effects system, including active-use talents, and encounter-end removal across linked/unlinked/synthetic actor cases.
2. Multi-actor rollback and V2 action-spend recovery under simulated failure. `ActionEconomyConsumption` stores turn state separately from legacy `system.actionEconomy`; reconcile legacy consumers under a distinct controlled action-economy convergence effort.
3. Enforcer Resources **cross-client** GM concurrency and level-up-vs-equipment-delivery races: the in-client lock does not guarantee distributed atomicity. Real Store V2 vehicle creation, linking, and rollback require Foundry runtime tests.
4. Command Cover target context/cover suppression across unusual token topology, alternate attack callers, hex grids and elevation.
5. Prerequisite waiver recognition is scoped to actor integrity tracking; other talent activation rules may still require canonical downstream inspection.

**Merge policy:** PR remains draft until exact-head CI passes, independent review adjudicates blockers, and Foundry v13 integration is verified. Nothing here certifies the entire 37-class feature system.
