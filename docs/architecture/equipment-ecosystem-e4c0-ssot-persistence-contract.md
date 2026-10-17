# Equipment Ecosystem — E4-C0 SSOT Persistence and Transaction Contract

**Status:** PROPOSED — for owner review and approval. Documentation only: no schema, production code, test or UI was changed by this checkpoint. All statements about runtime behavior are `RUNTIME_UNVERIFIED` (no live Foundry testing before the full implementation is merged).
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Baseline HEAD:** `7ddbe32d2f4f74fed2ec2a3057f469a23084cf74` (E3-A5-C1; CI run 39061819808 green).
**Policy applied:** strict SSOT, fail-closed authority, clean-break refactoring. Existing alpha character data need not be preserved; no compatibility shim, dual-write or fallback reader is proposed. Published SWSE mechanics and existing action-cost authorities are preserved.
**Companion documents:** `docs/audits/equipment-ecosystem-e4c0-consumer-cutover-manifest.md`, `docs/audits/equipment-ecosystem-e4c0-execution-checkpoint.md`; builds on `…-e3a4-clean-break-posture-contract.md` §9 (OA-2/3/11/12/13).

## 1. Decisions requested from the owner

| ID | Decision | Recommendation |
|---|---|---|
| **E4-P1** | Where item-to-appendage occupancy persists | **Item-owned record `system.weaponOccupancy`, written in the same Item update as `system.weaponPosture`** (§3). Not an actor-level map; not derived-only. |
| **E4-P2** | Mutation strategy | One equipment-state coordinator; plan → confirm → revalidate → execute through `ActorEngine` → verify → compensate; repository-established guarantees only (§4). |
| **E4-P3** | Natural-weapon Item identity | Materializer-written, non-name reference **plus** independent re-derivation from the selected species publication and Item content (§5). Integrated-droid identity stays deferred. |
| **E4-P4** | Concurrency stance | Per-actor in-process serialization + basis-fingerprint revalidation + post-write verification; the cross-client race is a documented residual risk, not claimed solved (§4.4). |
| **E4-P5** | Cutover shape | One convergence operation, several reviewable commits, one final acceptance gate (§7). |

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
* **Create:** the weapon template default (`STOWED`, empty record). Creation-time weapon producers (progression starter equipment and starter lightsaber, follower creation, the droid-integrated weapon materializers) set a posture only through the coordinator or take the template default; none writes `equipped: true`. (`DarkSidePowers` talismans/amulets are `equipment` Items and keep their worn-state `equipped`.)
* **Deleted Item:** the record is gone; nothing else references it. **Replaced Item:** new Item, default `STOWED`.
* **Actor reopen/reload:** records load as stored; effective readiness is recomputed.
* **Arm disabled/missing:** the stored record is unchanged; effective posture becomes blocked/indeterminate (E3-A5); the coordinator offers a re-plan, it never silently clears or reassigns.
* **Anatomy/species change:** the species-application path (`apply-canonical-species-to-actor`) must, in its plan, route weapon records whose `appendageIds` no longer exist through the coordinator (clear to `STOWED`) so a stale reference cannot survive.
* **Fire state:** FS keeps grip choice, tripod, stock, configuration and host; the coordinator writes FS changes in the same Item update as posture/occupancy when a transition needs both.

### 3.4 Failure behavior
Missing/invalid record → effective posture `undeclared` (E3-A5); an invariant violation found on read → `contradictory`/`blocked` with the original evidence; neither is silently repaired. The coordinator refuses to write a record that violates §3.2 (`INVALID_RECORD`).

## 4. Mutation authority and atomicity (E4-P2, E4-P4)

### 4.1 Single coordinator
A new `equipment-state-coordinator` (E4-C1) is the only writer of `system.weaponPosture`, `system.weaponOccupancy` and the posture-relevant FireStateStore fields. `InventoryEngine.setWeaponReadied`/`toggleWeaponReadied`/`drawAndActivateLightsaber` become thin entry points that call it (activation remains `setActivated`, separate). All raw weapon writers are removed (manifest §4). Armor/shield toggling keeps `InventoryEngine.toggleEquip` non-weapon branch.

### 4.2 Pipeline
1. **Read** authoritative state through one document adapter: items' `weaponPosture`/`weaponOccupancy`/FS, anatomy inputs (species publication, overrides, installed components), species permissions, action economy.
2. **Resolve** with the existing pure resolvers (anatomy → permissions → occupancy → grips → effective posture); the coordinator creates no rule.
3. **Plan** a complete hypothetical transition `{basis, itemWrites[], actionCost, conflicts[], choices[]}`; action cost through `resolveActionCost` (existing authority, incl. Quick Draw and Draw & Ignite combined effects).
4. **Confirm** any required choice (e.g. which held item to stow to free an appendage). The plan never drops, stows or moves an item on its own.
5. **Revalidate** by re-reading and recomputing the `basis` fingerprint; mismatch → `STALE_STATE`, nothing written.
6. **Execute:** spend the action (existing, returns `rollback`), then apply all item writes in **one** `ActorEngine.applyMutationPlan(actor, {update:{items:[…]}}, {transactional:true, source})`.
7. **Verify** by re-reading the persisted documents, comparing with the plan and recomputing effective posture.
8. **Compensate on failure:** the transactional plan restores the pre-plan snapshot; call `spend.rollback()`; if either compensation fails, return `PARTIAL_FAILURE { partialMutationPossible, spendRolledBack, … }` — never claim atomicity.

### 4.3 What is and is not guaranteed
Guaranteed by the repository: per-call ordering in `applyMutationPlan` (delete → set → update → add), snapshot-based compensating restore with verification, spend rollback. **Not** established: cross-document atomicity of `updateEmbeddedDocuments`, any lock, any server-side check. Therefore the contract is *best-effort with verified outcomes and accurate failure reporting*, and each Item's posture + occupancy + fire state are written inside the same Item update object so a single weapon's record can never be half-updated by the coordinator.

### 4.4 Stale state and concurrency
* `basis` = per affected item `{id, weaponPosture, weaponOccupancy, FS fingerprint}` + anatomy fingerprint (species/variant ids, functional overrides, installed components) + combat/action snapshot (combat id, round, turn, remaining actions) — compared as stable JSON strings.
* A coordinator-owned per-actor promise queue serializes requests in one client. Concurrent requests carrying an older basis are rejected `STALE_STATE`.
* **Residual risk (documented, not solved):** two clients can still interleave between revalidate and write, because Foundry offers no compare-and-swap here. Mitigation: post-write verification detects divergence and reports `PARTIAL_FAILURE`/`STALE_STATE`; execution should occur on the actor-owning client. Offline tests simulate interleaving; real-multi-client behavior is `RUNTIME_UNVERIFIED`.

## 5. Natural-weapon identity authority (E4-P3)

Today `_materializeNaturalWeapons` (`apply-canonical-species-to-actor.js`) creates weapon Items named from the record with `flags.swse = {isNaturalWeapon, speciesGranted, sourceSpecies (a display name), alwaysArmed, autoEquipped}` and `system.source: 'species-natural-weapon'`; reconciliation tags `speciesGrantKey = "<speciesId>|<variantId|base>"` and keeps a `speciesGrantManifest`. None records the species natural-weapon **record id**, and `hasMaterializerSignature` trusts forgeable flags. A flag alone proves nothing.

**Approach**
1. *Reference (written by the materializer in the creation plan):* `flags.swse.speciesNaturalWeapon = { schemaVersion: 1, grantKey, recordId, variantId, sourceProfileId }` — record id from the selected publication's `naturalWeapons[].id` (e.g. `sv-barabel-claws`), never a name.
2. *Independent verification (pure, in the live adapter's evidence path, not the caller):* the verifier receives raw evidence — the Item's type/reference/stats, the actor's current species selection and grant manifest, and the effective species profile re-derived from the selection — and checks: (a) the Item is a `weapon`; (b) `reference.grantKey` equals the key recomputed from the actor's *current* selected species/variant and the manifest; (c) the selected publication is a complete snapshot (E2B/E3-A1 rule) containing a natural weapon whose id equals `recordId` with `alwaysArmed: true`; (d) the Item's materialized content (record-derived damage, type, category, ability) equals what the record produces — content binding; (e) exactly one Item per record id (duplicates rejected); (f) no name, description or `isNaturalWeapon` flag is consulted.
3. *Verdict:* only the verifier can yield `itemBinding: 'verified'`; `resolveEffectiveEquipmentPosture` receives the verifier's raw-evidence result path, not a caller boolean (the E3-A5-C1 prohibition on `bindingVerified`/`trusted` stays). A verified natural weapon is READIED-by-nature with no occupancy.
4. *Species change:* the grant reconciliation already deletes items of a different grant; the new reference makes that exact rather than flag-based.
5. *Honest limit:* Foundry owners can edit flags and system data; this design provides integrity and consistency checking against the authoritative species publication, not protection from a determined owner editing everything. No GM-only field exists to hold a secret.
6. *Out of scope:* integrated-droid weapons stay pending until the droid refactor supplies certified installed-component identity.

## 6. Preservation of existing mechanics
Draw/Stow cost and Quick Draw (`resolveActionCost('drawOrHolsterWeapon')`), Draw & Ignite, lightsaber activation/deactivation (separate), grip/size/tripod rules, Full Attack and dual-wield rules, reaction eligibility, body-armor exclusivity, energy-shield coexistence, natural weapons, combat feats/talents and weapon modifications are consumed through their existing authorities. Only the *state representation and its readers/writers* are replaced.

## 7. Cutover shape (E4-P5)
One convergence operation executed in reviewable commits (schema+defaults → coordinator+adapter → writers → readers → sheets/templates → caches → natural-weapon binding → guards and deletion). Intermediate commits may be non-converged and are labelled so; acceptance is a single gate (§ checkpoint). No merge, no public deployment, no live testing before the whole ecosystem is implemented and merged.

## 8. Open items for the owner
Approve or amend E4-P1…E4-P5; confirm that starter/creation-time weapons default to `STOWED` (not drawn); confirm that mounted/worn-weapon posture and integrated-droid identity remain deferred; confirm the residual cross-client race is acceptable for the alpha.
