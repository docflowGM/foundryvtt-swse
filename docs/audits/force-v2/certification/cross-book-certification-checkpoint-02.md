# SWSE Force V2 — Cross-book Certification, Checkpoint 02 (partial)

**Date:** 2026-11-18  
**Branch:** `audit/force-v2-seven-book-packages-v2-9-20261117`  
**Baseline at start:** `896e03d467986f8b06ff91a528ec240ecc18a3a1`  
**Status:** **EXTERNAL IDENTITY RECONCILIATION COMPLETE; RUNTIME OWNERSHIP / SOURCE SCOPE IN PROGRESS; NOT IMPLEMENTATION READY.**

This checkpoint resumes Checkpoint 01 without modifying its 212 canonical Force-domain definition records, 178 original influence edges, source schemas, or production runtime. The companion machine-readable crosswalk is `cross-book-certification-checkpoint-02-owner-crosswalk.json`.

## 1. Reconciliation results

| Graph external source domain | Identifiers | Canonical owner identity resolved | Owner decision pending |
|---|---:|---:|---:|
| Talent | 44 | 44 | 0 |
| Feat | 9 | 9 | 0 |
| Equipment / modifications | 2 | 1 | 1 |
| Rule / policy | 12 | 0 | 12 |
| **Total** | **67** | **54** | **13** |

The **44 talent references** map uniquely by exact normalized printed name to stable existing production IDs in the seven Phase 3B manifests or Phase 3E canonical additions. **All 9 feat references** map to existing canonical feat identities in `data/audits/feat-provenance-canonical-authority.json`. These are **identity mappings**, not claims of effect execution, executable prerequisite coverage, or absence of a separate production-record defect.

### High-value identities

- `talent/alter/move-massive-object` -> `62d461ae3b0fcfa9` (Phase 3E, Legacy p.55).
- `talent/control/telekinetic-stability` -> `208e1e15e989323f` (Phase 3E, Legacy p.55).
- `talent/dark-side/dark-preservation` -> `192279eaa0b61d36` (Phase 3E, Legacy p.55).
- `core/talent/battle-meditation`, used as an *external graph target* rather than one of the 67 external source IDs, -> `9461c7aa79dd07c6` (Core Jedi Guardian tree).
- `core/feat/force-training` -> `9b7b869a86f39190`, the existing repeatable feat identity, **not** a new Force Power definition.
- `core/feat/skill-focus-use-the-force` -> generic Skill Focus `1592aaedf4b6e40a` with explicit scoped skill `Use the Force`. Do not create an independent Skill Focus (Use the Force) feat identity.
- `sotg/equipment/combat-thrusters` -> existing modification `combat-thrusters` in `data/vehicle-modifications/movement-systems.json`. This is a vehicle-modification installation/effect, **not** a generic consumable equipment item.

### Unresolved equipment

`legacy/equipment/death-sticks` does not resolve to a verified present canonical equipment item. **Do not equate this with the existing weapon named Darkstick.** Before implementation, decide on its canonical consumable identity and actual lifecycle: dose consumption, euphoria onset/expiration, -10 on actual Use the Force checks, +1 morale to attack/personal defenses, and prohibition of Force Point spending. Existing `PoisonEngine` handles some dose/condition/Force Point event patterns, but this is only a possible integration seam; its suitability for Death Sticks is **not certified**. No item ID should be fabricated by a crosswalk.

## 2. Rule-policy ownership queue (12)

These are **event/selection/policy identifiers**, not missing feat/talent/Force Power Items:

| Graph policy ID | Requested owner decision / acceptance boundary |
|---|---|
| `core/rule/telekinetic-descriptor` | Canonical power descriptor/classification and global talent targeting. |
| `core/rule/move-light-object-projectile` | Existing Move Light Object attack/effect resolution, not a new power. |
| `sotg/rule/one-active-attack-pattern` | Attack-pattern active-state constraint, activation/termination. |
| `sotg/rule/fighter-group` | Group identity/errata, crew participation state and scope. |
| `sotg/rule/target-sense-battle-strike` | Correct roll event and damage semantics; distinguish actual Use the Force checks from Pilot checks with changed ability modifier. |
| `sotg/rule/corellian-slip-errata` | Apply official maneuver correction at the maneuver/attack resolver without duplicate definition. |
| `sotg/rule/pilot-nat20` | Starship maneuver recovery from a real Pilot roll with natural 20. |
| `sotg/rule/fp-recovery` | A one-power recovery receipt with exactly one legitimate FP debit. |
| `sotg/rule/rest-recovery` | Restore spent suite copies at the source-defined rest boundary. |
| `kotor/rule/kotor-size-adjusted-fortitude` | Correct domain-target Fortitude thresholds for affected force powers. |
| `kotor/rule/energy-resistance-continuation` | Continued duration/resistance state, including repeat-use boundaries. |
| `fucg/rule/temptation-of-dark-side` | Controlled temporary talent entitlements and cleanup under temptation option. |

Initial candidate source locations, **not yet certified as complete execution owners**:

- FP validation: `scripts/engine/force/force-points-service.js`; FP roll/spend receipt: `scripts/engine/force/force-point-spend-coordinator.js`; actor mutation: `scripts/governance/actor-engine/actor-engine.js`.
- Force use and spent-copy recovery: `scripts/engine/force/force-executor.js`, `scripts/engine/force/force-suite-runtime-repairs.js`.
- Vehicle maneuver spent state: `scripts/engine/StarshipManeuversEngine.js`; progression authority: `scripts/engine/progression/engine/maneuver-authority-engine.js`.
- Damage/condition: `scripts/engine/combat/ConditionEngine.js`, shared damage/effect systems.
- **Do not certify from filenames.** Each policy still requires caller tracing, actual event/receipt contracts, sourcebook adjudication where unresolved, and direct regression coverage.

## 3. Force Power duplicate-copy conflict — validated call chain

**Correct modern V2 design:** `scripts/apps/progression-framework/steps/force-power-step.js` holds a `Map<powerId, count>` and increments/decrements per selected instance. `scripts/apps/progression-framework/shell/mutation/force-plan-builder.js` specifies `allowDuplicates: true` for Force Powers, unlike techniques, secrets and regimens.

**Contradictory legacy chain:**

1. `scripts/engine/progression/engine/force-power-engine.js` `applySelected()` calls `ForceSlotValidator.validateBeforeApply(actor, powerIds)`.
2. `scripts/engine/progression/engine/force-slot-validator.js` calls `ForceAuthorityEngine.validateForceSelection()`.
3. `scripts/engine/progression/engine/force-authority-engine.js` rejects duplicate IDs via a `Set`.
4. `ForcePowerEngine.applySelected()` independently filters out powers matching names already owned.

GitHub code search identified the validator call inside `ForcePowerEngine.applySelected()`, but **no direct external call to `ForcePowerEngine.applySelected()`**. The legacy engine still has other readers for entitlement/suggestion code. The duplicate-copy mutator is therefore **suspect/possibly dormant, not proven unreachable**. Do not inject its duplicate restrictions into V2, and do not remove the complete engine on the strength of one search.

**Required next step:** import/call-graph and dynamic-registration survey, then either delete the obsolete mutator/validator if dead, or converge any active consumer onto instance-aware canonical V2 mutation. Add negative and positive tests around duplicate picks, source-preserving owned instances, exhaustion/recovery and atomic finalization.

## 4. Remaining Checkpoint 02 work / acceptance gate

1. Resolve the 12 rule/policy owners against actual V2 services and behavior; record precise entrypoints, actor/vehicle state owners, tests and any source interpretation blockers.
2. Decide Death Sticks item-vs-status architecture against the canonical equipment system; no speculative ID.
3. Extend the seven supplemental books screen beyond headings and known examples for Force-affecting **existing** feats, talents, species, conditions, environmental effects, equipment, and sidebar rules; preserve difference between *no new Power definitions found* and *no external interactions*.
4. Reconcile official published errata and source claims using primary printed PDFs and independent official errata; note ambiguous or unsupported rulings.
5. Finish Force Power legacy call-graph proof and produce tests for any path that remains active.
6. Keep 12 known blocking editorial issues from Checkpoint 01 in the release-ready aggregation; no runtime certification from this checkpoint.

## 5. Version control and safety

The branch was **two commits ahead and seven behind `main`** when work resumed (GitHub comparison dated 2026-11-18). Recent `main` changes include progression-finalizer and progression-session modifications, so compare/rebase carefully before any later production wiring. No rebases, force-pushes, production Force definitions, actors, or compendium records have been changed here.

**Checkpoint 02 is a partial milestone:** canonical ID reconciliation completed; rule-event ownership and broader supplement rule coverage remain open. **Implementation-ready: false. Runtime certified: false.**
