# Equipment Ecosystem — E4-C0 SSOT Persistence and Transaction Contract

**Status:** E4-P1, E4-P2, E4-P3 and E4-P5 **APPROVED** (with the amendments recorded in §1); E4-P4 **REVISED in E4-C0-C1 and awaiting owner approval** — E4-C1 may not start until it is approved. Documentation only: no schema, production code, test or UI was changed by this checkpoint. All statements about runtime behavior are `RUNTIME_UNVERIFIED` (no live Foundry testing before the full implementation is merged).
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Baseline HEAD:** `7ddbe32d2f4f74fed2ec2a3057f469a23084cf74` (E3-A5-C1; CI run 39061819808 green). **E4-C0 commit** `8aeca69` (CI run 39062954658 green). **Amended by E4-C0-C1.**
**Policy applied:** strict SSOT, fail-closed authority, clean-break refactoring. Existing alpha character data need not be preserved; no compatibility shim, dual-write or fallback reader is proposed. Published SWSE mechanics and existing action-cost authorities are preserved.
**Companion documents:** `docs/audits/equipment-ecosystem-e4c0-consumer-cutover-manifest.md`, `docs/audits/equipment-ecosystem-e4c0-execution-checkpoint.md`; builds on `…-e3a4-clean-break-posture-contract.md` §9 (OA-2/3/11/12/13).

## 1. Owner decisions (recorded)

| ID | Decision | Owner ruling | Recorded amendments |
|---|---|---|---|
| **E4-P1** | Item-owned occupancy: `system.weaponOccupancy` written in the same Item update as `system.weaponPosture` (§3) | **Approved** | Starter and creation-time weapons default to `STOWED` (§6.1). |
| **E4-P2** | One equipment-state coordinator (§4) | **Approved with transaction-safety amendments** | The coordinator may **not** rely on `applyMutationPlan({transactional:true})` / `restoreFromSnapshot` for compensation (they restore whole actors or collections and can clobber unrelated concurrent changes). Writes are field-scoped and compensation is a conditional inverse patch (§4.5). |
| **E4-P3** | Natural-weapon Item identity (§5) | **Approved with stronger provenance requirements** | Provenance is a materializer-written reference plus a base-profile hash; a flag, a name or a reference alone is never a verdict; legitimate modifications must not break identity (§5). |
| **E4-P4** | Cross-client mutation strategy | **Revision required before implementation** — revised in §4.1–§4.7 | Authoritative execution, request deduplication, actor-level serialization, permission checking, stale-state validation, honest failure reporting. **Awaiting owner approval of the revision.** |
| **E4-P5** | One coordinated cutover, several reviewable commits, one final acceptance gate (§7) | **Approved** | Approving E4-P5 does not authorize E4-C1; the cutover starts only on an explicit owner instruction after E4-P4 is approved. |

Additional rulings recorded: starter weapons default `STOWED`; the unarmed strike is an explicit virtual-attack exception; a weapon-sourced effect with `application: 'equipped'` requires effective `READIED`; mounted/worn weapons and integrated-droid weapons stay deferred (§6, §8).

## 2. Evidence (static analysis of HEAD)

* **Schema.** `template.json` Item types are `armor, … weapon, weaponUpgrade, poison, …`; there is **no `lightsaber` Item type** (the `"lightsaber"` branches in `InventoryEngine`/predicates are defensive). The weapon template (`template.json:570-621`) holds the boolean `equipped` (`:602`), `dualWielded`, `wieldedTwoHanded`; nothing models posture or appendage assignment. There is no data-model class beyond `template.json`.
* **Appendage identities** exist as stable strings: biological anatomy appendage ids from species schema v1 (`arm-1`, `tail-1`, `natural-arm-1` default arms, …) and, for droids, only uncertified candidates (droid refactor deferred, DR-001…DR-010).
* **What E3 resolvers need.** `resolvePhysicalOccupancy` consumes explicit `{itemId, purpose, appendageIds}` assignments and refuses to select appendages; it detects slot collisions across items. `resolveEquipmentGrips` takes the grip choice from `ownedState.wielded` / option, which is `flags.swse.fireState.wielded` (FireStateStore) today; `resolveEffectiveEquipmentPosture` evaluates one item's declaration against both.
* **Mutation primitives.** `ActorEngine.updateOwnedItems(actor, updates)` → `updateEmbeddedDocuments` (one `actor.updateEmbeddedDocuments` call, then `recalcAll`); it guarantees nothing across documents beyond what Foundry provides, which the repository does not document. `ActorEngine.applyMutationPlan(actor, plan, {transactional:true})` snapshots `actor.toObject(true)` and, on failure, calls `restoreFromSnapshot` (SnapshotService: identity-checked, verified, bounded compensation, `requireExact`); if the restore itself fails the error is flagged `partialMutationPossible`. That is **compensating rollback, not a database transaction**. The comments calling plans "atomic" are therefore not relied on.
* **Action economy.** `ActionEconomyConsumption.spend()` returns `{allowed, committed, rollback}`; `InventoryEngine.setWeaponReadied` already uses *spend → update → on error `spend.rollback()`*.
* **Not present in the repository:** any per-actor lock/mutex or queue (searched `governance`, `engine/inventory`, `engine/combat/action`), any optimistic-concurrency revision (`_stats.modifiedTime` is only excluded from snapshot comparisons), any server-side validation hook for flags. Foundry owners can edit their own actors' flags and system data.
* **Cache dependencies** (matrix E6/F2/F3): sheet render signature hashes `item.system.equipped` but not `flags.swse.fireState`; derived-calculator and ModifierEngine signatures hash the alias set. Hook `lightsaber-light-sync` `preUpdateItem` watches `equipped`/`active`.

## 3. Occupancy persistence — options and recommendation (E4-P1)

| Criterion | A. Actor-owned map (`actor.system.equipmentState.assignments[]`) | **B. Item-owned record (recommended)** | C. Derived only |
|---|---|---|---|
| Single authority | one map, but posture lives on the Item (OA-2) → two places for "held" | **posture and assignment in the same Item document** | impossible: nothing authoritative says which appendage holds which item; E3-A2 forbids auto-selection |
| Stable ids | references `itemId` (dangling on delete) | **no cross-reference needed for the item**; appendage ids reference anatomy | n/a |
| Item deletion/replacement | needs cascade cleanup; stale rows | **record disappears with the Item**; a replacement starts at default | n/a |
| Reload/reopen | persists | **persists** | cannot reconstruct hands |
| Multiple weapons, independent appendages | yes | yes (each Item holds its own appendage ids) | n/a |
| Two-handed grips | yes | yes (`appendageIds.length === requiredHands`) | n/a |
| Conflict detection | trivially within one doc | **by the E3-A2 resolver across items at read time** (already implemented and tested); coordinator rejects conflicting plans | n/a |
| Anatomy change / disabled / missing | re-evaluate at read time | **re-evaluate at read time** (E3-A2/E3-A5 already block); species change handled by the coordinator (§3.4) | n/a |
| Future droid installs | ids from certified installed components | same ids; droid certification gates readiness | n/a |
| Transaction shape | one actor write + item writes (two documents) | **one Item write per weapon holds posture + occupancy + fire-state** | n/a |
| Duplicate authority risk | high (actor map + item posture) | **none**: posture and occupancy are one record with enforced invariants | none, but unusable |

**Recommendation:** B. **Rejected:** A (two documents to keep consistent for one fact, dangling references, cascade logic) and C (insufficient authoritative data).

### 3.1 Exact fields (weapon Item `system`, `template.json` weapon template)

```
system.weaponPosture  : "STOWED" | "EQUIPPED" | "READIED"      default "STOWED"        (OA-2, approved)
system.weaponOccupancy: { schemaVersion: 1,
                          purpose: null | "hold" | "wield",
                          appendageIds: string[] }              default { 1, null, [] }
```
Grip choice (one-/two-handed) stays in `flags.swse.fireState.wielded` (FireStateStore, unchanged); required hands remain derived from `resolveWielding`/effective size, never stored. Activation stays in `system.activated`. The weapon template's `equipped`, `dualWielded`, `wieldedTwoHanded` are **removed**; `system.equipped` remains the worn state of armor, shields and equipment only.

### 3.2 Invariants (enforced by the coordinator on write; re-checked on read; violations fail closed)
1. `STOWED` ⇔ `purpose === null` ∧ `appendageIds = []`.
2. `EQUIPPED` ⇒ `purpose ∈ {hold, wield}` ∧ `appendageIds` non-empty.
3. `READIED` ⇒ `purpose === "wield"` ∧ `appendageIds.length === requiredHands` (E3-A3) — *effective* readiness is still computed, never read from the enum.
4. `appendageIds` are distinct strings that exist in the effective anatomy; no appendage appears in two Items' records (cross-item, checked by E3-A2).
5. `schemaVersion === 1`; any other value, a missing field on a weapon, or a malformed shape is invalid (no silent default to any posture; no migration code — clean break).
6. A weapon's persisted record never contains hand assignments invented from names, order or legacy flags.
7. Natural weapons carry no occupancy (§5); their posture field is not consulted.
8. Mounted/worn weapons are out of scope until their authority is certified (host/mount relationship is not occupancy).

### 3.3 Lifecycle
* **Create:** the weapon template default (`STOWED`, empty record). Creation-time weapon producers (progression starter equipment and starter lightsaber, follower creation, the droid-integrated weapon materializers) set a posture only through the coordinator or take the template default; none writes `equipped: true`. (`DarkSidePowers` talismans/amulets are `equipment` Items and keep their worn-state `equipped`.) Starter weapons are created `STOWED` (§6.1).
* **Deleted Item:** the record is gone; nothing else references it. **Replaced Item:** new Item, default `STOWED`.
* **Actor reopen/reload:** records load as stored; effective readiness is recomputed.
* **Arm disabled/missing:** the stored record is unchanged; effective posture becomes blocked/indeterminate (E3-A5); the coordinator offers a re-plan, it never silently clears or reassigns.
* **Anatomy/species change:** the species-application path (`apply-canonical-species-to-actor`) must, in its plan, route weapon records whose `appendageIds` no longer exist through the coordinator (clear to `STOWED`) so a stale reference cannot survive.
* **Fire state:** FireStateStore keeps grip choice, tripod, stock, configuration and host, and remains the authority for the weapon operating-state *rules* (§6.2); the coordinator writes FS fields in the same Item update as posture/occupancy when a transition needs both.

### 3.4 Failure behavior
Missing/invalid record → effective posture `undeclared` (E3-A5); an invariant violation found on read → `contradictory`/`blocked` with the original evidence; neither is silently repaired. The coordinator refuses to write a record that violates §3.2 (`INVALID_RECORD`).

## 4. Mutation authority and cross-client safety (E4-P2, revised E4-P4)

### 4.1 Single coordinator and authoritative execution
`equipment-state-coordinator` (E4-C1) is the only writer of `system.weaponPosture`, `system.weaponOccupancy` and the posture-relevant FireStateStore fields. `InventoryEngine.setWeaponReadied`/`toggleWeaponReadied`/`drawAndActivateLightsaber` become thin entry points (activation remains `setActivated`). Armor/shield toggling keeps the `InventoryEngine.toggleEquip` non-weapon branch.

Callers submit an **intent**, never writes: `{requestId, actorId, requesterUserId, intent, basis, confirmations[]}`. Only one **authoritative executor** performs the read → plan → revalidate → write → verify pipeline:
* If the local client is the active primary GM (`HolonetGmAuthority.isPrimaryActiveGm()`, lowest active GM user id — the existing seam), it executes locally.
* Otherwise it relays the intent over the existing system socket channel (`system.foundryvtt-swse`) to the primary GM and awaits a typed outcome (bounded timeout).
* **Fail closed:** if no active GM exists, the outcome is `NO_AUTHORITATIVE_EXECUTOR` and nothing is written. **Owner policy question OPQ-1:** whether alpha play without a connected GM may instead execute on the actor owner's client under the weaker guarantees of §4.7. Claude does not decide this.
* A timeout yields `EXECUTOR_TIMEOUT` with outcome *unknown*; the caller must re-read before retrying (retry with the same `requestId` is safe, §4.2).

### 4.2 Request deduplication
* The executor keeps a bounded TTL map `requestId → outcome` (the existing socket requestId pattern) and replays the stored outcome for a duplicate (`DUPLICATE_REPLAYED`).
* The map is not durable (GM reload or failover). Durable dedup therefore rides in the write itself: the same Item update that writes posture/occupancy also writes `flags.swse.equipmentState = { revision, lastRequestId }`. A re-delivered request whose id equals an affected Item's `lastRequestId` is recognized as already committed and is replayed as success without a second write or a second action spend.

### 4.3 Actor-level serialization
The executor owns one FIFO promise queue per actor; every equipment-state intent for that actor (including the action spend, writes and verification) runs to completion before the next starts. All coordinator writes therefore pass through exactly one queue while a single executor exists. Because §5 guards forbid any other writer of the coordinator-owned fields, same-field interleaving can come only from §4.7 sources.

### 4.4 Permission, stale-state and validation
* **Permission:** the executor requires the requester to hold `OWNER` permission on the actor (or be a GM) via the document permission API, and re-checks it per request. Combat-turn and action-economy authority is the existing authority; the coordinator adds none. The relay is an unauthenticated broadcast with a client-asserted `requesterUserId`; whether Foundry supplies an authenticated sender id to socket receivers is `RUNTIME_UNVERIFIED` and must be established before this check is described as authentication. Until then it is an integrity check, not a security boundary.
* **Stale state:** every intent carries a `basis` the caller saw: per affected Item `{id, revision, weaponPosture, weaponOccupancy, FS fingerprint}`, an anatomy fingerprint (species/variant ids, functional overrides, installed components) and the combat/action snapshot (combat id, round, turn, remaining actions). The executor re-reads inside its queue slot and compares; any mismatch → `STALE_STATE`, nothing written, nothing spent. The `revision` is an integer incremented by the coordinator in the same Item update; a manual edit that bypasses the coordinator is still caught by the posture/occupancy/FS fingerprint.
* **Validation:** the §3.2 invariants and the E3 resolvers run in the executor on freshly read state; client-computed plans are never trusted.

### 4.5 Field-scoped writes and conditional compensation
The coordinator must **not** use `applyMutationPlan({transactional:true})`, `restoreFromSnapshot` or any `SnapshotService` scope (`full-actor`, `transaction-rollback`, `system-and-flags`, `embedded-items`): those restore whole actors or collections and could overwrite unrelated concurrent changes (HP, credits, inventory edits, other items' flags).

1. **Field-scoped update:** the Item update object contains only the owned paths (`system.weaponPosture`, `system.weaponOccupancy`, named `flags.swse.fireState.*` keys, `flags.swse.equipmentState`); never `toObject()`, never a whole `system`/`flags` replacement. Sent through `ActorEngine.updateOwnedItems` (existing authority).
2. **Inverse patch:** before writing, the executor records the before-value of each owned path per Item.
3. **Verify:** after the write, it re-reads and compares each owned path with the plan and recomputes effective posture.
4. **Compensation (compare-then-restore):** on a write error or failed verification it restores a path only if its current value still equals the value the plan wrote (or the unchanged before-value); a path whose current value differs belongs to someone else and is **left untouched** and reported. Nothing outside the owned paths is ever restored.
5. **Action economy:** order is validate → spend (existing `ActionEconomyConsumption.spend`, returns `rollback`) → write → verify; on failure the existing `spend.rollback()` runs. Its own concurrency behavior is the existing authority's and is not changed here.

### 4.6 Outcome vocabulary (honest failure reporting)
`COMMITTED` · `DUPLICATE_REPLAYED` · `CONFIRMATION_REQUIRED` (plan with choices/conflicts, nothing written) · `REJECTED_INVALID` · `REJECTED_PERMISSION` · `STALE_STATE` · `NO_AUTHORITATIVE_EXECUTOR` · `EXECUTOR_TIMEOUT` (unknown) · `FAILED_COMPENSATED` (error, all owned paths and the spend restored) · `FAILED_PARTIAL` (error, with `restoredPaths[]`, `skippedConcurrentPaths[]`, `unrestoredPaths[]`, `spendRolledBack`). The coordinator never reports atomicity it did not achieve.

### 4.7 Remaining limitations (not solved; `RUNTIME_UNVERIFIED`)
1. **No compare-and-swap exists** in Foundry here: a window remains between the executor's final re-read and the server applying `updateEmbeddedDocuments`.
2. The primary-GM test is per *user*: one GM with two browser tabs yields two executors (the same limitation as `HolonetGmAuthority`); their queues are independent, so the §4.4 revision/fingerprint check narrows but does not close the window.
3. GM failover mid-request, relay loss and reload are covered only by `lastRequestId` dedup and `EXECUTOR_TIMEOUT` honesty.
4. Direct edits by an owner/GM of coordinator-owned paths outside the coordinator cannot be prevented; they are detected as `STALE_STATE`/invalid records, not blocked.
5. `updateEmbeddedDocuments` across several Items is not documented as atomic; partial application is detected by verification and handled by §4.5.
6. Offline tests will simulate interleaving, relay and executor failover; real multi-client behavior is verified only post-merge.

## 5. Natural-weapon identity authority (E4-P3, strengthened)

Today `_materializeNaturalWeapons` (`apply-canonical-species-to-actor.js`) creates weapon Items from the record with `flags.swse = {isNaturalWeapon, speciesGranted, sourceSpecies (a display name), alwaysArmed, autoEquipped}` and `system.source: 'species-natural-weapon'`; reconciliation tags `speciesGrantKey = "<speciesId>|<variantId|base>"` and keeps a `speciesGrantManifest`. None records the natural-weapon **record id**, and `hasMaterializerSignature` trusts forgeable flags.

**Provenance reference** (written by the materializer in the creation plan):
`flags.swse.speciesNaturalWeapon = { schemaVersion: 1, grantKey, recordId, variantId, sourceProfileId, baseProfileHash }` — `recordId` from the selected publication's `naturalWeapons[].id`; `baseProfileHash` is a stable hash of the canonical JSON of the **record-derived base profile** (the identity-bearing attack fields the materializer derives: category, ability, damage dice and type, attack-shape fields) at materialization time. No name, description or `isNaturalWeapon` flag is consulted.

**Independent verification** (pure; fed raw evidence by the live adapter): (a) the Item is a `weapon`; (b) `grantKey` equals the key recomputed from the actor's *current* species/variant selection and manifest; (c) the selected publication is a complete snapshot containing a natural weapon whose id equals `recordId` with `alwaysArmed: true`; (d) `baseProfileHash` equals the hash recomputed from that *record* (proves the reference was produced from this record, not from edited Item content); (e) exactly one Item per `recordId`; (f) identity-bearing fields (item type, `speciesNaturalWeapon` reference) are intact. Only the verifier yields `itemBinding: 'verified'`; the E3-A5-C1 prohibition on caller-supplied `bindingVerified`/`trusted` stays.

**Legitimate modifications.** The verifier does **not** compare the Item's live stats to the record. Upgrades, enhancements, feats/talents, active effects, GM edits to non-identity fields, name/image/description changes and ordinary item customization all remain possible and do not affect identity, because identity rests on the reference plus the record-derived `baseProfileHash`, not on current Item content. E4-C1 WP7 must publish the explicit partition of identity-bearing versus modifiable fields from repository evidence; a modification that alters an identity-bearing field makes the binding `unverified` (fail closed). Whether a particular modification is permitted by the rules is not decided here.

**Honest limit:** Foundry owners can edit flags and system data; this provides integrity and consistency against the authoritative species publication, not protection from a determined owner. Species change: reconciliation deletes Items of a different grant using the exact reference. **Out of scope:** integrated-droid weapons stay pending (`DEFERRED_DROID_REFACTOR`, DR-001…DR-010).

## 6. Preserved mechanics and approved semantics
Draw/Stow cost and Quick Draw (`resolveActionCost('drawOrHolsterWeapon')`), Draw & Ignite, lightsaber activation/deactivation (separate), grip/size/tripod rules, Full Attack and dual-wield, reaction eligibility, body-armor exclusivity, energy-shield coexistence, natural weapons, combat feats/talents and weapon modifications are consumed through their existing authorities. Only the *state representation and its readers/writers* are replaced.

### 6.1 Starter weapons, unarmed strike, weapon effects (owner rulings)
* **Starter / creation-time weapons** are created `STOWED` with an empty occupancy record. Nothing is auto-drawn; drawing goes through the coordinator and its action cost.
* **Unarmed strike** is an *explicit virtual-attack exception*: it is not a weapon Item, needs no posture or occupancy, and the weapon-selection authority names it as a virtual attack (replacing the current masquerade as an `equipped` weapon). It does not make any real weapon `READIED`.
* **Weapon-sourced effects with `application: 'equipped'`** apply only while the weapon's **effective** posture is `READIED` (computed by `resolveEffectiveEquipmentPosture`, never the declared enum). Armor, shield and equipment effects keep their worn-state meaning. Activation stays separate.

### 6.2 FireStateStore and the coordinator
FireStateStore remains the authority for weapon operating-state rules (grip choice, configuration, tripod, stock, host/ammunition fire state, readiness prerequisites) and keeps its validation. The coordinator owns *posture and occupancy transition orchestration* — planning, confirmation, executor routing, the combined Item write and compensation. For transitions that need FS changes, E4-C1 gives FS **non-writing plan builders** (they return validated field patches); the coordinator merges them into its single field-scoped Item update. FS no longer performs its own Item write for posture-relevant fields.

## 7. Cutover shape (E4-P5, approved)
One convergence operation executed in reviewable commits (schema+defaults → coordinator+executor+adapter → writers → readers → sheets/templates → caches → natural-weapon binding → guards and deletion). Intermediate commits may be non-converged and are labelled so; acceptance is a single gate (checkpoint §3). No merge, no public deployment, no live testing before the whole ecosystem is implemented and merged. **E4-C1 is not authorized by this document.**

## 8. Open items and deferrals
* **For owner approval:** the revised E4-P4 (§4); OPQ-1 (behavior when no GM is connected).
* **Deferred, unchanged:** mounted/worn weapon posture (host-mount, wrist/forearm) and integrated-droid weapon identity remain uncertified and are not certified by E4-C1 (`DEFERRED_DROID_REFACTOR` for DR-001…DR-010); no rules decision is made for them.
* **Statuses:** this contract is `SOURCE_VERIFIED` against repository HEAD; nothing is `IMPLEMENTED`, `OFFLINE_TESTED` or `FOUNDRY_TESTED`.
