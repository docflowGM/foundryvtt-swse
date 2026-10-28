# Equipment Ecosystem — E4-C1 WP2-C1 + WP3-A Checkpoint (NOT CONVERGED)

**Phase:** WP2-C1 (fail-closed reader occupancy boundary) and WP3-A (GM-local coordinator foundation). **WP3-B (remote mutation transport), WP4–WP9 and convergence are not authorized and were not started.**
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `6982a1f04469c739dff3cc7cf3cedbf58e894e99` (CI run 39065712159 green).
**Owner decisions applied:** requester identity is never taken from a payload (GM-local execution only); spend-last approved conditionally (unfinalized changes must not become usable readiness); a lease/epoch is advisory only; SHA-256 helper approved (a digest binds data to data, it authenticates nobody); OPQ-1 closed (no GM, no mutation, no actor-owner fallback).
**Statuses:** `IMPLEMENTED` + `OFFLINE_TESTED`; `RUNTIME_UNVERIFIED`; nothing `FOUNDRY_TESTED`. One rules item is `DEFERRED_RULES_REVIEW` (EQ-001, below).

## 1. WP2-C1 — reader fail-closed boundary (`equipment-state-reader.js`)
Problem: malformed records and natural/integrated-classified Items were dropped from the occupancy input, so a conflicting appendage claim could vanish and another weapon could be certified READIED.
Now (E3-A2 stays the only physical-occupancy authority; no conflict rule is re-implemented):
* **Primary occupancy** is unchanged: only valid, ordinary records are assignments.
* **Probes:** a malformed record, or a valid record on an Item classified natural/integrated, that still names appendages is run through the *same* resolver as a non-certifying probe. A conflict between a probe and an ordinary weapon is an **uncertain collision**; the ordinary weapon becomes `indeterminate` with gate `uncertain-occupancy-collision`. Two valid ordinary records on one appendage remain an **established** conflict (the resolver's `blocked`). A probe never certifies itself and is never read as zero-hand occupancy.
* **Completeness:** a malformed record whose appendage list cannot be read makes `occupancyEvidence.completeness = incomplete`; then no EQUIPPED/READIED is certified (`occupancy-completeness-unestablished`). STOWED weapons and readable-empty claims are unaffected. An absent record claims nothing (the weapon is `undeclared`).
* **Transaction gate:** unresolved journal entries (PREPARED, APPLIED, PARTIAL, INDETERMINATE) withhold every posture of the Items they cover; FINALIZED and NOT_APPLIED release them; an unreadable journal withholds positive readiness. `evaluatePendingTransactions: false` exists only so planning can evaluate a hypothesis.
* New result fields: `occupancyEvidence`, `transactions`, per-weapon `gates`, `summary.withheld`. Consumers must use the top-level `status`/`effectivePosture` (the raw `effective` result is kept as evidence).

## 2. WP3-A — new modules
| File | Role |
|---|---|
| `scripts/engine/equipment/intent-fingerprint.js` | pure canonical serialization + dependency-free SHA-256 (published vectors, node:crypto cross-check, Unicode, stable rejection codes) |
| `scripts/engine/equipment/equipment-transaction-journal.js` | pure journal model (`flags.swse.equipmentTxn`): phases PREPARED/APPLIED/FINALIZED/NOT_APPLIED/PARTIAL/INDETERMINATE, legal transitions, bounded, read-only classification. **Operational evidence, not a second posture SSOT** |
| `scripts/engine/equipment/species-evidence-adapter.js` | async loader of the selected effective species profile through SpeciesRegistry, publication-selection rules and `applySpeciesVariantProfile`; fails closed (`unavailable` + reason); never uses names/descriptions |
| `scripts/engine/equipment/equipment-state-coordinator.js` | `planEquipmentIntent`, `executeEquipmentIntent`, `inspectEquipmentTransaction`, `validateIntent`, `GM_LOCAL_CONTEXT`, `OUTCOME` |

**Intents:** `stow {itemId}`, `equip {itemId, purpose, appendageIds}`, `ready {itemId, appendageIds, grip}`. The caller supplies appendages, purpose and grip explicitly; missing ones yield `CHOICE_REQUIRED` (options listed, nothing chosen). Any other field (including requester identity) is refused (`UNSUPPORTED_FIELD`).
**Pipeline:** read (reader + species evidence) → plan through the same reader with the proposed record overlaid (target must be `established`; other weapons must not change; conflicts are reported, never resolved) → confirmation = caller echoes `planDigest` → serialize per actor (FIFO) → re-plan, `STALE_STATE` on any difference → validate owned paths + record transition → journal PREPARED → field-scoped Item update through `ActorEngine.updateOwnedItems` (`system.weaponPosture`, `system.weaponOccupancy`, `flags.swse.fireState.wielded`/`.v` only) → verify persisted values → journal APPLIED → spend through `ActionEconomyConsumption.spend` with `requestId` in its metadata (a history marker makes the spend idempotent) → journal FINALIZED. The draw/holster cost comes from `resolveActionCost`; the lit-lightsaber stow rule keeps using the visual-profile authority; no rule is duplicated.
**Failure handling:** journal not written → nothing modified; Item write failed/not applied → `NOT_APPLIED`; persisted values neither before nor planned → `INDETERMINATE`, evidence preserved; refused spend → field-scoped conditional compensation → `FAILED_COMPENSATED` (journal `NOT_APPLIED`) or `FAILED_PARTIAL` (journal `PARTIAL`, concurrently changed paths untouched and listed); spend that threw → resolved by its marker, or `INDETERMINATE` if unreadable; journal APPLIED/FINALIZED write failure → `UNRESOLVED_JOURNAL`/`UNRESOLVED_FINALIZE` (never success, readiness withheld, never re-spent). Duplicates: journal then ledger; same id + different intent → `REQUEST_ID_CONFLICT`; a non-finalized duplicate is `DUPLICATE_UNRESOLVED` and is never replayed.
**Because the journal is PREPARED before any write and only FINALIZED releases the withholding, a write whose spend or finalization did not complete never becomes usable readiness.** No `ActionEconomyPersistence.undoLast`, no snapshot restore, no `applyMutationPlan({transactional:true})`, no `toObject()` writes.
**Authority:** execution only with the exact frozen `GM_LOCAL_CONTEXT` object **and** `game.user.isGM`; otherwise `NO_AUTHORITATIVE_EXECUTOR` / `REJECTED_NOT_GM`. No socket handler, no player route, no primary-GM selection, no `game.sessionId`, no lease. `planEquipmentIntent` and `inspectEquipmentTransaction` are read-only.

**Honest limits (unchanged):** two GM tabs, direct document edits and Foundry's lack of compare-and-swap remain possible race sources; per-actor serialization is process-local; compensation is read-compare-restore, not atomic; all behavior is offline-simulated (`RUNTIME_UNVERIFIED`). Species evidence comes from the registry only; a custom/unregistered species, an unrecorded variant or an uninitialized registry yields `unavailable` and nothing beyond STOWED can be established. Droid installed-component certification stays deferred.

## 3. Deferred rules item
**EQ-001 (`DEFERRED_RULES_REVIEW`, appended to `docs/audits/swse-rules-decisions-pending.md`):** the action cost, if any, of changing a drawn weapon between EQUIPPED, READIED or other appendages is not established by any located source (the existing authority prices only draw-from-stowed and holster). The coordinator returns `DEFERRED_RULES_REVIEW` for those intents and writes/spends nothing. Question for the project owner: whether such a change exists as an action and what it costs.

## 4. WP3-B requirements (recorded, not implemented)
1. Authenticated request origin from a verified server-backed mechanism (a payload `requesterUserId` is never identity); whether Foundry v13 offers one for the intended transport is unverified.
2. Executor authorization from that authenticated identity (OWNER/GM on the actor), re-checked per request.
3. Single-executor coordination that does not assume a world-setting lease is atomic; a lease/epoch may only be advisory and cannot authorize a mutation alone.
4. Safe behavior with several GM users and several connections of one GM.
5. Explicit timeout and failover behavior (`UNKNOWN_OUTCOME` reconciled from the journal, never replayed automatically).
6. Offline protocol tests and post-merge Foundry runtime certification.
No remote equipment mutation socket handler is registered.

## 5. Validation
* New suite `tests/equipment-e4c1-wp3a-coordinator.test.mjs` (22 checks): SHA-256 vectors and cross-check, canonicalization, journal model/classification, reader boundary (invalid, incomplete, forged special identity, mixed validity, journal gates), species adapter fail-closed cases, and the coordinator (full pipeline, stow/equip/no-change/deferred, choices and conflicts, authority and no-socket scans, stale/duplicate/id reuse, spend ordering and refusal, spend throw/marker, journal failures, write failures and conditional compensation, indeterminate state, per-actor serialization, no independent rules authority).
* WP1–WP2 suite updated for the reader's new journal import (no assertion weakened).
* `node --check`, `git diff --check`, JSON parse; full offline regression sweep with all new files staged (results in the PR body).
