# Equipment Ecosystem — E4-C0 Execution Checkpoint (amended by E4-C0-C1)

**Phase:** E4-C0 and its correction E4-C0-C1 (documentation only). **Owner rulings recorded:** E4-P1 Approved; E4-P2 Approved with transaction-safety amendments; E4-P3 Approved with stronger provenance requirements; E4-P5 Approved; **E4-P4 revised in E4-C0-C1, awaiting approval**. E4-C1 production implementation, the persistence/consumer cutover, action economy changes, encumbrance, Near-Human, the droid refactor and live testing are **not** authorized or started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **E4-C0 HEAD:** `8aeca6903880a03d65eadf63185b39f1c552c41b` (CI run 39062954658 green). E4-C0 started at `7ddbe32` (CI run 39061819808 green).
**Deliverables:** `docs/architecture/equipment-ecosystem-e4c0-ssot-persistence-contract.md` (proposal for owner approval), `docs/audits/equipment-ecosystem-e4c0-consumer-cutover-manifest.md`, this checkpoint. **Changed nothing else:** no production code, schema, compendium, test, UI, combat, droid or vehicle file.
**Statuses:** analysis `SOURCE_VERIFIED` against repository HEAD only; nothing `IMPLEMENTED`/`OFFLINE_TESTED` by this phase; all runtime assertions `RUNTIME_UNVERIFIED`.

## 1. Headline recommendations (contract §1)
* **Occupancy persistence (E4-P1):** item-owned. `system.weaponPosture` (approved, default `STOWED`) and `system.weaponOccupancy {schemaVersion:1, purpose, appendageIds[]}` live in the same weapon Item document and are written in one update with the weapon's fire-state fields. Rejected: an actor-level map (two documents for one fact, dangling item ids, cascade cleanup) and derived-only (no authoritative source for which appendage holds which item; auto-selection is forbidden). Grip choice stays in FireStateStore; required hands stay derived.
* **Transaction strategy (E4-P2 amended, E4-P4 revised; contract §4):** one coordinator. Callers submit *intents*; one authoritative executor (the primary active GM, via the existing system socket channel; fail closed with `NO_AUTHORITATIVE_EXECUTOR`) deduplicates by `requestId` (bounded map plus durable `lastRequestId` in the Item write), serializes per actor (FIFO), checks OWNER/GM permission, revalidates the caller's basis and Item `revision`, spends the action (existing, with rollback), applies a **field-scoped** Item update, verifies, and compensates only with a **conditional inverse patch** (restore a path only if it still holds the value the plan wrote). `applyMutationPlan({transactional:true})`, `restoreFromSnapshot` and every `SnapshotService` scope are forbidden for the coordinator because they restore whole actors/collections. Outcomes use the honest vocabulary in contract §4.6.
* **Remaining concurrency limitations (contract §4.7):** no compare-and-swap in Foundry; the primary-GM test is per user (two tabs of one GM → two executors); failover/relay loss is covered only by dedup and honest `EXECUTOR_TIMEOUT`; direct owner edits are detected, not prevented; multi-Item `updateEmbeddedDocuments` atomicity is undocumented; all `RUNTIME_UNVERIFIED`.
* **Owner policy question OPQ-1:** may alpha play without a connected GM execute on the actor owner's client under weaker guarantees, or must it fail closed (current proposal)?
* **Natural-weapon identity (E4-P3):** the materializer writes a non-name reference (`grantKey`, species `recordId`, variant, source profile, `baseProfileHash` of the record-derived base profile); an independent pure verifier re-derives the selected publication from the actor's current species selection, confirms an `alwaysArmed` record with that exact id, recomputes the hash from the *record*, and rejects duplicates. It does not compare live Item stats, so legitimate modifications do not break identity; a flag or reference alone is never a verdict. Foundry owners can edit flags; the design gives integrity checking, not protection from a determined owner. Integrated-droid identity stays deferred.
* **Cutover size (manifest §4):** 83 existing files appear in the manifest's modification tables (81 to modify or delete, 2 verify-only), 4 new production files, and about 23 existing weapon-related test files to update or extend (33 existing test files mention equip state; 4 are the new E3 suites and 6 are armor/shield suites that stay); the 38 files found only by the wide grep were inspected, and those that touch weapons are in the manifest tables while the rest are classified nonweapon or unrelated in manifest §3.

## 2. Proposed E4-C1 execution plan (one convergence, several reviewable commits)
Intermediate commits may be non-converged and must say so in the commit message; only the final gate may claim convergence.

| # | Work package | Contents | Interim state |
|---|---|---|---|
| WP1 | Schema and defaults | `template.json` weapon template (+`weaponPosture`, +`weaponOccupancy`, −`equipped`/`dualWielded`/`wieldedTwoHanded`), `item-defaults`, `safe-item-factory`, creation producers | not converged |
| WP2 | Invariants and reader | `weapon-record-invariants.js`, `equipment-state-reader.js` | not converged |
| WP3 | Coordinator and executor | `equipment-state-coordinator.js` (intent, executor routing via the existing socket seam, dedup, per-actor queue, permission/basis checks, field-scoped write, conditional compensation) + FireStateStore non-writing plan builders + `InventoryEngine` weapon entry points rerouted; spend/rollback preserved | not converged |
| WP4 | Writers removed/rerouted | `swse-actor-base`, `inventory-handlers`, `weapon-config-dialog`(delete), item-sheet templates, alchemy, crystal system, light-sync hook | not converged |
| WP5 | Combat readers | `multi-attack.js` choke point, Full Attack, dual wield, reactions, control effects, passive/condition, `CombatEngine`, `combat-stat-rules`, `character-actor` | not converged |
| WP6 | Sheets, rows, templates, caches | shared view-model, row builders, templates, sheet/derived/modifier signatures | not converged |
| WP7 | Natural-weapon binding | materializer reference + `baseProfileHash`, verifier, identity-versus-modifiable field partition, reconciliation, species change handling | not converged |
| WP8 | Guards and deletion | the manifest §5 static/behavioral guards; delete obsolete predicates and files; update allowlist guards | converged candidate |
| WP9 | Convergence review | full offline sweep, CI, checklist below | **single acceptance gate** |

Preserve published mechanics throughout (Draw/Stow, Quick Draw, Draw & Ignite, activation, grip/size, Full Attack/dual-wield, reactions, armor exclusivity, shield coexistence, natural/integrated exceptions, feats/talents, modifications); remove implementation duplication, not rules.

### 2.1 Milestones used by the owner
*Implemented* (canonical functionality exists) → *Tested* (automated verification passes) → *Converged* (all consumers use the canonical authority; competing paths retired) → *Certified* (required verification complete including live Foundry testing, post-merge). A green CI run does not by itself prove convergence; the §3 checklist does.

## 3. Convergence acceptance checklist (for the WP9 gate)
1. Every manifest §2 file is modified, deleted or recorded as verify-only with evidence.
2. The twenty manifest §5 guards exist and pass; no allowlist weakens them.
3. No weapon code path reads or writes legacy `system.equipped`, its aliases, `autoEquipped`, or the legacy grip booleans; armor/shield/equipment paths still do, by explicit allowlist.
4. Exactly one writer of weapon posture/occupancy (the coordinator) and exactly one effective-posture reader path.
5. Natural weapons verified only through the binding verifier; integrated-droid weapons remain pending.
6. All existing suites in manifest §6 pass or are updated with equal-or-stronger assertions; full offline sweep and GitHub Actions are green (the five documented force-power failures stay excluded and untouched).
7. Residual items recorded as `RUNTIME_UNVERIFIED` for post-merge certification: multi-client races and executor failover (contract §4.7), Foundry hook ordering, sheet rendering, live combat flows, token-light sync.

## 4. Open decisions and risks
* **Awaiting owner:** approval of the revised E4-P4 (contract §4); OPQ-1 (no connected GM).
* **Closed by owner rulings:** starter weapons default `STOWED`; unarmed strike is an explicit virtual-attack exception (U-1 closed); weapon effects with `application: 'equipped'` require effective `READIED` (OA-12 closed for weapons).
* **Deferred, unchanged:** mounted/worn weapons (host-mount, wrist/forearm) and integrated-droid identity (`DEFERRED_DROID_REFACTOR`, DR-001…DR-010) stay uncertified; E4-C1 must not certify them.
* **Armor/shield alias normalization** (`normalizeArmorEquipState`, `armor-hydration-defense-hotfix`) is a separate legacy cleanup, outside the weapon cutover.
* Concurrency limits (contract §4.7) and the limits of flag-based provenance (§5). WP7 must publish the identity-bearing versus modifiable field partition from repository evidence.
* Species/anatomy changes must route stale occupancy through the coordinator (contract §3.3).
* Near-Human additional arms and `krevaaki-jatm-2j-04` certification are unchanged prerequisites for full anatomy coverage but do not block the weapon cutover.

## 5. Validation performed
Static repository analysis at HEAD: `ActorEngine` mutation primitives, `SnapshotService` restore contract, `InventoryEngine`, `ActionEconomyConsumption` spend/rollback, absence of any lock/revision mechanism, species natural-weapon materialization and grant reconciliation, `template.json` item types and weapon template, narrow and wide consumer greps (84 / 122 files) with line-level inspection of ambiguous hits, and a script check that every path named in the manifest exists at HEAD. The existing offline suite was run with these documents staged: results are in the PR description (documentation-only change, no behavior change expected).

E4-C0-C1 edited exactly these three documents; no production code, schema, test, compendium or UI file changed. Statuses: `SOURCE_VERIFIED` only; no `IMPLEMENTED`/`OFFLINE_TESTED`/`FOUNDRY_TESTED`.
