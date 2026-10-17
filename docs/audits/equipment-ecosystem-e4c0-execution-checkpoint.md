# Equipment Ecosystem — E4-C0 Execution Checkpoint

**Phase:** E4-C0 only (documentation). E4-C1 production implementation, the persistence/consumer cutover, action economy changes, encumbrance, Near-Human, the droid refactor and live testing are **not** authorized or started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `7ddbe32d2f4f74fed2ec2a3057f469a23084cf74` (clean tree; E3-A5-C1 CI run 39061819808 green, completed 19:24:16Z).
**Deliverables:** `docs/architecture/equipment-ecosystem-e4c0-ssot-persistence-contract.md` (proposal for owner approval), `docs/audits/equipment-ecosystem-e4c0-consumer-cutover-manifest.md`, this checkpoint. **Changed nothing else:** no production code, schema, compendium, test, UI, combat, droid or vehicle file.
**Statuses:** analysis `SOURCE_VERIFIED` against repository HEAD only; nothing `IMPLEMENTED`/`OFFLINE_TESTED` by this phase; all runtime assertions `RUNTIME_UNVERIFIED`.

## 1. Headline recommendations (contract §1)
* **Occupancy persistence (E4-P1):** item-owned. `system.weaponPosture` (approved, default `STOWED`) and `system.weaponOccupancy {schemaVersion:1, purpose, appendageIds[]}` live in the same weapon Item document and are written in one update with the weapon's fire-state fields. Rejected: an actor-level map (two documents for one fact, dangling item ids, cascade cleanup) and derived-only (no authoritative source for which appendage holds which item; auto-selection is forbidden). Grip choice stays in FireStateStore; required hands stay derived.
* **Transaction strategy (E4-P2):** a single coordinator: read → resolve with the existing pure resolvers → plan → explicit confirmation of any choice → re-read and revalidate a basis fingerprint → spend actions (existing, with rollback) → one `ActorEngine.applyMutationPlan(…, {transactional:true})` → verify persisted result → compensate on failure, reporting `PARTIAL_FAILURE` honestly. The repository establishes *snapshot-based compensating rollback*, not cross-document atomicity; the contract does not claim more.
* **Concurrency (E4-P4):** no lock, revision token or server-side check exists. Proposed: per-actor in-process queue + basis revalidation + post-write verification; the cross-client race is documented as residual risk.
* **Natural-weapon identity (E4-P3):** the materializer writes a non-name reference (`grantKey`, species `recordId`, variant, source profile); an independent pure verifier re-derives the selected publication from the actor's current species selection, confirms an `alwaysArmed` record with that exact id, binds Item content to the record, and rejects duplicates. A reference or flag alone is never a verdict. Foundry owners can edit flags; the design gives integrity checking, not protection from a determined owner. Integrated-droid identity stays deferred.
* **Cutover size (manifest §4):** 83 existing files appear in the manifest's modification tables (81 to modify or delete, 2 verify-only), 4 new production files, and about 23 existing weapon-related test files to update or extend (33 existing test files mention equip state; 4 are the new E3 suites and 6 are armor/shield suites that stay); the 38 files found only by the wide grep were inspected, and those that touch weapons are in the manifest tables while the rest are classified nonweapon or unrelated in manifest §3.

## 2. Proposed E4-C1 execution plan (one convergence, several reviewable commits)
Intermediate commits may be non-converged and must say so in the commit message; only the final gate may claim convergence.

| # | Work package | Contents | Interim state |
|---|---|---|---|
| WP1 | Schema and defaults | `template.json` weapon template (+`weaponPosture`, +`weaponOccupancy`, −`equipped`/`dualWielded`/`wieldedTwoHanded`), `item-defaults`, `safe-item-factory`, creation producers | not converged |
| WP2 | Invariants and reader | `weapon-record-invariants.js`, `equipment-state-reader.js` | not converged |
| WP3 | Coordinator | `equipment-state-coordinator.js` + `InventoryEngine` weapon entry points rerouted; spend/rollback preserved | not converged |
| WP4 | Writers removed/rerouted | `swse-actor-base`, `inventory-handlers`, `weapon-config-dialog`(delete), item-sheet templates, alchemy, crystal system, light-sync hook | not converged |
| WP5 | Combat readers | `multi-attack.js` choke point, Full Attack, dual wield, reactions, control effects, passive/condition, `CombatEngine`, `combat-stat-rules`, `character-actor` | not converged |
| WP6 | Sheets, rows, templates, caches | shared view-model, row builders, templates, sheet/derived/modifier signatures | not converged |
| WP7 | Natural-weapon binding | materializer reference, verifier, reconciliation, species change handling | not converged |
| WP8 | Guards and deletion | the manifest §5 static/behavioral guards; delete obsolete predicates and files; update allowlist guards | converged candidate |
| WP9 | Convergence review | full offline sweep, CI, checklist below | **single acceptance gate** |

Preserve published mechanics throughout (Draw/Stow, Quick Draw, Draw & Ignite, activation, grip/size, Full Attack/dual-wield, reactions, armor exclusivity, shield coexistence, natural/integrated exceptions, feats/talents, modifications); remove implementation duplication, not rules.

### 2.1 Milestones used by the owner
*Implemented* (canonical functionality exists) → *Tested* (automated verification passes) → *Converged* (all consumers use the canonical authority; competing paths retired) → *Certified* (required verification complete including live Foundry testing, post-merge). A green CI run does not by itself prove convergence; the §3 checklist does.

## 3. Convergence acceptance checklist (for the WP9 gate)
1. Every manifest §2 file is modified, deleted or recorded as verify-only with evidence.
2. The twelve manifest §5 guards exist and pass; no allowlist weakens them.
3. No weapon code path reads or writes legacy `system.equipped`, its aliases, `autoEquipped`, or the legacy grip booleans; armor/shield/equipment paths still do, by explicit allowlist.
4. Exactly one writer of weapon posture/occupancy (the coordinator) and exactly one effective-posture reader path.
5. Natural weapons verified only through the binding verifier; integrated-droid weapons remain pending.
6. All existing suites in manifest §6 pass or are updated with equal-or-stronger assertions; full offline sweep and GitHub Actions are green (the five documented force-power failures stay excluded and untouched).
7. Residual items recorded as `RUNTIME_UNVERIFIED` for post-merge certification: multi-client races, Foundry hook ordering, sheet rendering, live combat flows, token-light sync.

## 4. Open decisions and risks
* Owner approvals: E4-P1…E4-P5 (contract §1); confirm starter and creation-time weapons default to `STOWED`.
* **U-1 unarmed strike:** the virtual unarmed attack currently masquerades as an `equipped` weapon; it needs an explicit named exception in the weapon-selection authority.
* **OA-12 effect scope:** effects with `application: 'equipped'` need a defined meaning for weapons (proposed: effective READIED).
* **Mounted/worn weapons** (host-mount, wrist/forearm) and **integrated-droid identity** remain uncertified and deferred.
* **Armor/shield alias normalization** (`normalizeArmorEquipState`, `armor-hydration-defense-hotfix`) is a separate legacy cleanup, outside the weapon cutover.
* **Concurrency** residual risk (contract §4.4) and the limits of flag-based provenance (§5).
* Species/anatomy changes must route stale occupancy through the coordinator (contract §3.3).
* Near-Human additional arms and `krevaaki-jatm-2j-04` certification are unchanged prerequisites for full anatomy coverage but do not block the weapon cutover.

## 5. Validation performed
Static repository analysis at HEAD: `ActorEngine` mutation primitives, `SnapshotService` restore contract, `InventoryEngine`, `ActionEconomyConsumption` spend/rollback, absence of any lock/revision mechanism, species natural-weapon materialization and grant reconciliation, `template.json` item types and weapon template, narrow and wide consumer greps (84 / 122 files) with line-level inspection of ambiguous hits, and a script check that every path named in the manifest exists at HEAD. The existing offline suite was run with these documents staged: results are in the PR description (documentation-only change, no behavior change expected).
