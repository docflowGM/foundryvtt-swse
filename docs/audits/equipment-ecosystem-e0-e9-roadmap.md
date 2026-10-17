# Universal Equipment Ecosystem — E0–E9 Roadmap

**Status:** planning document. **Only E0 and E1 are authorized.** Approval of this roadmap is not authorization to implement any later phase; each phase needs its own explicit owner instruction.
**Audited commit:** `185dac1bded12f5e40cb851539c0a912f42fc24d`.
**Companion documents:** baseline, consumer matrix, authority contract v1, handoff.

All "future code targets" below are **suggestions taken from the owner-approved plan or derived from the matrix**; paths marked *(new)* do not exist today. Decision IDs (`OA-n`, `SRC-n`) are defined in the authority contract §12.

## 0. Ground rules that apply to every phase

1. One bounded PR per phase (E5 has two), each recording: starting commit, exact modified files, baseline and post-change test results, known unsupported cases, migration impact, changed mechanical outcomes.
2. No phase starts until the preceding phase's contract is approved. E7 and E8 never share a PR.
3. No phase touches the modification registries/ledgers/executor/certification flags, the immutable v1.5 modification snapshot, or decision records D-004, D-005, D-006, D-010, D-011, D-013, D-014, D-015.
4. No phase resolves a published-rules question. A rules question found during a phase is recorded with source, evidence, affected subsystem and options, marked `DEFERRED_RULES_REVIEW`, and unrelated work continues.
5. Existing tests (baseline §2) are the regression floor; a phase that changes mechanical outcomes must say so explicitly and be separately approved.
6. Certification statuses are tracked separately (`SOURCE_VERIFIED`, `DATA_RECONCILED`, `MECHANIC_SPECIFIED`, `IMPLEMENTED`, `OFFLINE_TESTED`, `FOUNDRY_TESTED`, `DEFERRED_RULES_REVIEW`); offline tests never imply `FOUNDRY_TESTED`.
7. If `main` moves between phases, report the divergence; do not silently rebase.

## 1. Phase overview

| Phase | Purpose | Production behaviour | Depends on | Blocking owner approvals |
|---|---|---|---|---|
| E0 | Baseline and dependency inventory | unchanged | — | none (**complete in this PR**) |
| E1 | Authority contract | unchanged | E0 | review of this PR |
| E2 | Anatomy and species/droid capability resolution (read-only) | unchanged | E1 approved | OA-7, OA-8, OA-4; SRC-1, SRC-4, SRC-5, SRC-7 for any data written |
| E3 | Equipment Capability Resolver (pure) | unchanged | E2 | OA-2 (if state is persisted), SRC-3 |
| E4 | Equipment Transition Planner (pure) | unchanged | E3 | OA-11 |
| E5A | State adapter + read-only compatibility projection | unchanged | E3, E4 | OA-1, OA-2, OA-3 |
| E5B | Coordinator execution + transaction tests, initially unwired | none until wired | E5A | OA-9, OA-10 |
| E6 | Mounts, integrated weapons, attachments | bounded changes | E5 | OA-6, SRC-3, SRC-5 |
| E7 | Combat integration | **deliberate mechanical cutover** | E5B, E6 | OA-1, OA-11, OA-12, OA-14 |
| E8 | Unified V2 sheet interface | player-visible cutover | E7 certified | OA-5, OA-10 |
| E9 | Migration, regression and release certification | release decision | E8 | migration/backup approval |

## 2. E0 — Repository baseline and dependency inventory (this PR)

- **Scope:** inventory of producers/consumers, authority map, baseline tests, migration-risk register. Docs only.
- **Out of scope:** any behaviour or file outside the five authorized documents.
- **Deliverables:** baseline document, consumer matrix (72 rows).
- **Acceptance gate:** every reader/writer classified with a disposition; baseline results recorded accurately; no counters or certification statuses changed.
- **Risks surfaced:** R-1…R-9 (matrix §6).

## 3. E1 — Universal equipment authority contract (this PR)

- **Scope:** posture semantics, activation independence, anatomy and manipulator capability model, mounted-vs-handheld relationships, component boundaries, compatibility principles, migration and test boundaries, unresolved decisions.
- **Out of scope:** schema selection, adapters, migrations, templates, CSS.
- **Deliverables:** authority contract v1, this roadmap, handoff.
- **Acceptance gate:** owner review; resolution (approve/modify/reject) of the OA/SRC items that block E2.

## 4. E2 — Anatomy and species capability resolution

- **Purpose:** produce effective anatomy (manipulators with stable IDs and capabilities) from species snapshot, installed droid components, explicit alterations and the two-arm default; read-only.
- **Dependencies:** approved anatomy data location (OA-7), droid ID scheme (OA-8), unusable-appendage representation (OA-4).
- **In scope:** a read-only anatomy resolver; only the minimal source-data extension the owner approves; consumption of `resolveInstalledDroidComponents` rather than re-parsing Garage fields; preservation of the complete-snapshot no-inheritance contract (an unlisted variant field is dropped by `applyCompleteSnapshot` unless whitelisted — baseline §6.2).
- **Out of scope:** hand allocation, grip legality, any mutation, any species data not supplied as source-verified, parsing prose to infer anatomy, the legacy `multiLimb` migration artifact.
- **Future code targets (suggestions):** `scripts/species/` small anatomy adapter/extension; `scripts/domain/droids/` read-only appendage-capability projection; *(new)* `scripts/engine/equipment/anatomy-resolver.js`; canonical species data and its builder only for owner-approved, source-verified exceptions.
- **Acceptance gate:** humans resolve to two hands; Codru-Ji (once `SRC-1` is ruled and data supplied) to four; installed droid appendages recognised individually; non-manipulating appendages (e.g. probe, `canManipulate:false`) never become hands; missing/disabled/unreconciled droid appendages never produce a working hand; publication snapshots unchanged for unaffected species (`species-*` baseline suites still pass).
- **Risks:** silent field drop through the snapshot whitelist; name-based special cases; droid same-type collapse in the installed-component resolver and same-type replacement in the Garage installer (baseline §7.2).

## 5. E3 — Equipment Capability Resolver

- **Purpose:** pure calculation of functional manipulators, occupancy, supported grips, mounted equipment, host dependencies, conflicts and unresolved prerequisites.
- **Dependencies:** E2; `SRC-3` for mounted/worn zero-occupancy statements; `OA-2` if posture/occupancy is persisted.
- **In scope:** allocation by stable appendage ID respecting quantity **and** capability; reuse of `resolveWielding`, `resolveEffectiveWieldingSize`, canonical worn facts (`wornClassOf`), droid part capabilities.
- **Out of scope:** attack counts, feats/talents/bonuses, action spending, dice, UI, mutations, any assumption that a worn weapon occupies zero hands unless a source-supported statement exists.
- **Future code targets:** *(new)* `scripts/engine/equipment/equipment-capability-resolver.js` (the folder already exists and holds `equipment-normalizer.js`, `equipment-skill-hook-resolver.js`).
- **Acceptance gate:** pure tests prove consistent assignments, conflict detection, mounted-weapon zero-hand handling **only where a source supports it**, source-specific exceptions; an architectural test shows the module imports no mutation/spend/UI code; no runtime item mutations.
- **Risks:** capability-blind subtraction (two tool appendages ≠ two hands); confusing physical capacity with combat permission.

## 6. E4 — Equipment Transition Planner

- **Purpose:** non-mutating previews for Equip/Ready/Stow/Activate (+ Attach/Detach when authorized): legality, missing requirements, Assisted Hand Management choices, expected final configuration, action requirements asked from existing authorities.
- **Dependencies:** E3; `OA-11` (whether EQUIPPED-but-not-READIED counts for attack lists).
- **In scope:** conflict resolution options (stow, holster where supported, drop, cancel); affordability check using `resolveActionCost`/`ActionEconomyConsumption` queries.
- **Out of scope:** execution, spending, a private action-cost table, automatic dropping/stowing.
- **Future code targets:** *(new)* `scripts/engine/equipment/equipment-transition-planner.js`.
- **Acceptance gate:** planning never mutates (asserted by tests that freeze documents and the economy); canceled prompts leave state unchanged; every suggested configuration is consistent with the resolver.
- **Risks:** duplicating action-cost logic; plan/execute drift.

## 7. E5A — State adapter and read-only compatibility projection

- **Purpose:** derive one effective equipment view from legacy aliases, `FS` facts and any approved new state, without writing.
- **Dependencies:** `OA-1` (legacy mapping), `OA-2` (state home), `OA-3` (dual-write window).
- **In scope:** the read-only `effectiveEquipmentState`-style adapter; splitting posture aliases from activation aliases; an `ambiguous` report for legacy-only states; invalidation keys for caches and the light-sync watch list.
- **Out of scope:** redirecting any production button; changing any reader's behaviour.
- **Future code targets:** *(new)* `scripts/engine/equipment/equipment-state-adapter.js`; no edits to readers yet.
- **Acceptance gate:** old actors interpret exactly as before under the approved legacy mapping (parity tests over the matrix reader set); production behaviour unchanged.
- **Risks:** R-1 (activation aliases counted as equipped), R-3 (alias disagreement), R-7 (cache keys).

## 8. E5B — Equipment State Coordinator

- **Purpose:** execute approved transitions: request → plan → confirm → revalidate → execute through `InventoryEngine`/`FireStateStore`/`ActionEconomyConsumption`/`ActorEngine` → verify → recover.
- **Dependencies:** E5A; `OA-9` (atomicity strategy), `OA-10` (armor donning/removal handling).
- **In scope:** revalidation, bounded recovery, failure outcomes of authority contract §10, reuse of the existing mutation guard semantics.
- **Out of scope:** wiring sheet buttons (initially unwired), becoming a combat engine, directly mutating documents, modification workflows.
- **Future code targets:** *(new)* `scripts/engine/equipment/equipment-state-coordinator.js`; targeted delegation hooks in `scripts/engine/inventory/InventoryEngine.js` only after approval.
- **Acceptance gate:** transaction and concurrency tests pass **before** any live sheet adopts it; an insufficient-action request produces no partial mutation; two simultaneous requests → the stale one is revalidated; light-sync and recalculation side effects covered; `FS` writes in a transition are strict.
- **Risks:** economy rollback is last-entry undo (contract §7.2); no serialization of concurrent requests; post-write side effects outside rollback.

## 9. E6 — Mounts, integrated weapons and attachments

- **Purpose:** project weapon-to-weapon, armor-hosted and droid-hosted relationships into one read interface while each keeps its own owner.
- **Dependencies:** E5; `OA-6` (host relationship representation), `SRC-3`, `SRC-5`.
- **In scope:** reading `FireStateStore` host mounts unchanged; defining armor→weapon and droid part→weapon host links; keeping physical attach/detach separate from permanent modification; preserving host identity across equip/stow/transfer/removal.
- **Out of scope:** creating a parallel mount process, enabling the modification executor, changing modification certification, deleting weapons when a host is removed.
- **Future code targets:** `scripts/items/weapon-runtime/` adapters; `scripts/domain/droids/` link projection; armor-host data only as approved.
- **Acceptance gate:** correctly mounted wrist-style weapons consume no ordinary hand **if and only if the approved source statement says so**; removing a host makes dependents unavailable while the attachment record is retained; detaching never deletes weapon or host; missing mount data is never proof of a functional mount; `weapon-phase-5d-i-d-b1-mounting` stays green.
- **Risks:** treating `system.weaponMount === true` (a bare boolean, matrix G2) as a host link; stale `mountedHostId` after host deletion.

## 10. E7 — Combat integration (deliberate mechanical cutover)

- **Purpose:** combat consumes verified facts (chosen weapon, effective grip, occupied manipulators, host availability) — it does not compute anatomy.
- **Dependencies:** E5B, E6; `OA-1`, `OA-11`, `OA-12`, `OA-14`.
- **In scope:** migrating each consumer in matrix §4.D-F to its approved predicate class; attack preflight; weapon selection; grip validation feeding the **existing** Strength-damage authority; multiweapon via `DualWieldCombatShapeResolver`; reaction eligibility; retiring or rerouting heuristic two-handed tests (D5, D6) as an engineering step.
- **Out of scope:** attack-count changes, stock range/proficiency reconciliation until `SRC-6` is independently sourced, changing action economy.
- **Acceptance gate:** no prohibited physical configuration can attack; legal mounted weapons remain eligible; two-handed melee Strength follows the verified grip; light weapons are not doubled; **identical results whenever the relevant physical state is unchanged** (parity run over the full baseline suite plus new tests for D2, D6, D10, D11 gaps).
- **Risks:** R-1/R-2 (predicate divergence), the narrow readers that ignore the canonical predicate, direct-id attack path (D1/D2), cache invalidation (R-7).

## 11. E8 — Unified V2 sheet interface

- **Purpose:** one shared equipment projection for character, NPC and droid sheets; Hands & Mounts display; Equip/Ready/Stow/Activate controls; Assisted Hand Management prompts; contextual attachment controls.
- **Dependencies:** E7 mechanically certified; `OA-5`, `OA-10`.
- **In scope:** reuse of `buildWeaponReadinessView`, `RowTransformers`, existing weapon/armor cards and handlers; collapsing the three predicate copies (E2, E4, E5 in the matrix) into the shared view; deciding the reuse target between the two template families (`v2` partials vs `v2-concept`, baseline §3.1).
- **Out of scope:** sheet-side mechanical calculation or direct mutation, a new actor sheet, changes to Draw & Ignite conditions.
- **Acceptance gate:** all three sheets consume the same projection; no sheet-specific hand math; handlers route only through the coordinator; render-signature includes the new state (E6 in the matrix).
- **Risks:** presentation masking mechanical gaps; misleading Stow on fixed mounted weapons.

## 12. E9 — Migration, regression and release certification

- **Purpose:** legacy actor/item compatibility, durable-state migration if any, rollback/backup, Foundry v13 runtime testing on character/NPC/droid workflows, performance and release verification.
- **Dependencies:** E8; migration/backup approval.
- **In scope:** reversible migration or backup before any owned-item state change; a report of ambiguous legacy states; two separate certifications (data compatibility; runtime behaviour); pruning decisions for dead writers (`OA-13`).
- **Acceptance gate:** `FOUNDRY_TESTED` evidence for each supported workflow; existing worlds migrated or safely interpreted; modification data and certification flags untouched.
- **Risks:** declaring the new system default on the strength of isolated unit tests.

## 13. Cross-phase risk register

| ID | Risk | Phases | Mitigation |
|---|---|---|---|
| R-1 | `isItemEquipped` couples posture and activation | E5A, E7 | split predicate; adapter returns separate facts |
| R-2 | ≥8 divergent reader predicates | E5A, E7, E8 | per-reader disposition (contract §4.4), parity tests |
| R-3 | writers cover fewer aliases than readers | E5A, E9 | dual-write policy OA-3; alias census (matrix §2) |
| R-4 | no occupancy record | E3 | new resolver output; persist only per OA-2 |
| R-5 | armor equip spends no action | E5B, E8 | OA-10 / SRC-2 before any change |
| R-6 | attack paths not gated on drawn state in `attacks.js` / direct-id | E7 | explicit preflight contract; tests for D1/D2 |
| R-7 | caches keyed on `equipped` only | E5A, E7 | add state revision to signatures; name the invalidating change |
| R-8 | light-sync field watch list | E5, E6 | extend list with new paths |
| R-9 | creation-time producers emit `equipped:true` | E9 | legacy mapping OA-1; migration inventory |
| R-10 | droid same-type appendages collapse in the resolver and appear to be replaced by the Garage installer; `additional-N` location is length-derived; three appendage-capability sources | E2 | OA-8 ID scheme and a decision on installer behaviour before E2 data (installer is Garage logic: not changed by this project without separate authorization) |
| R-11 | snapshot whitelist drops unlisted fields | E2 | OA-7; tests against `species-*` suites |
| R-12 | multi-item atomicity unproven | E5B | OA-9; concurrency/transaction tests first |
| R-13 | two sheet template families | E8 | choose reuse target |
| R-14 | unresolved rules (SRC-1…SRC-7) | E2, E3, E6 | register entries; block affected rows, not the book |

## 14. Required owner approvals (consolidated)

Before E2: roadmap/contract approval; OA-7, OA-8, OA-4; the SRC items needed for any anatomy data actually written (SRC-1, SRC-4, SRC-5, SRC-7).
Before E3: OA-2 if state persists; SRC-3 for any mounted/worn occupancy claim.
Before E5A: OA-1, OA-2, OA-3.
Before E5B: OA-9, OA-10.
Before E6: OA-6.
Before E7: OA-1 (final), OA-11, OA-12, OA-14.
Before E8: OA-5, OA-10.
Before E9: migration/backup strategy; OA-13.
