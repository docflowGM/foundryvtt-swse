# Phase 2 — Architectural reconciliation and simplification audit

**Audited commit:** `f734b4d33f0e7603856b262f06dd705cc02ab5b8` · **Status:** audit-only; no production code, schema, data, pack, test or existing document was changed. Every domain was compared against its Phase 1 contract. Nothing here is `live-foundry-verified`.

**Backlog:** [`data/audits/architecture-census/findings/finding-register.json`](../../../data/audits/architecture-census/findings/finding-register.json) (also `.csv`; human table: [phase-2-finding-register.md](phase-2-finding-register.md)). Regenerate/verify: `node tools/architecture-census/assemble-findings.mjs [--check]`.

## 1. Executive summary

The V2 framework has the right authorities: ActorEngine, TransactionEngine, the progression shell/finalizer, AbilityEngine/ModifierEngine, the customization workbench and HouseRuleService all exist, are reachable and are widely used. Its problems are **erosion around those authorities**, not missing architecture:

- **Bypasses.** 331 live direct document writes outside ActorEngine (203 of them flag writes, for which ActorEngine already has `updateActorFlags`/`unsetActorFlag`); 74 chat bypasses; several credit movements outside TransactionEngine.
- **A large runtime patch layer.** 108 live monkey-patch sites in 41 modules plus 17 hotfix modules. Several are order-dependent wrapper chains on core entry points (8 wrappers on `CombatOptionResolver.collectAttackModifiers`, 4 on `ForceExecutor.executeForcePower`; `DerivedCalculator.computeAll` is replaced at init). The documented "no runtime patching" architecture is not what runs.
- **Dead weight.** About 52.9k SLOC (≈10% of the 525k runtime SLOC) is statically confirmed dead. Several "implemented" features documented in audits live only in that dead code.
- **A small number of real correctness defects** sit where two authorities disagree, chiefly the bonus Force Point pool, Force Point maximum, damage threshold under a house rule, follower defenses and store/Holonet rollback.

No subsystem needs a rewrite. The evidence supports **targeted cleanup plus a few consolidations**, sequenced behind guardrails.

## 2. Counts (all 30 code-bearing domains compared)

| Measure | Value |
|---|---:|
| Findings | **274** (critical 2 · high 29 · medium 105 · low 110 · info 28) |
| Confirmed / suspected | 248 / 26 |
| Owner decision required | 84 |
| Findings that are rules questions | 14 (90 rules items overall: 59 already in the register, **31 new**, see [rules-questions-for-register.md](rules-questions-for-register.md)) |
| Ownership conflicts (bypass, ownership, presentation rules, unauthorized persistence, contradictions, interfaces, dependency) | 88 |
| Duplicate-authority findings | 26 (**25 confirmed**; plus 11 multiple-writer and 7 duplicate-schema findings) |
| Dead-code findings | 43; statically confirmed dead SLOC **52,886** (whole unreachable files only) |
| Legacy/compatibility findings | 25 (20 legacy-compat + 5 wrapper-indirection) |
| Consolidation opportunities | 22 (6 consolidation, 5 duplicate-normalization, 11 oversized-module) |
| Performance hypotheses | 17 (1 confirmed, 16 suspected, none measured) |
| Documentation candidates | 25 (none deleted) |
| Unimplemented integrations | 10 |

Coordinator re-verification (independent of the domain investigator): `F-TAL-007`/`F-FRC-003`, `F-CMB-004`, `F-MEN-002`. Each is recorded in the register as `coordinatorVerified`.

## 3. Top architectural risks (confirmed)

| # | Finding | Why it matters |
|---|---|---|
| 1 | **F-TAL-007 / F-FRC-003 (critical)**: bonus Force Point pool split across two flag scopes. `SWSEActorBase.setFlag('swse')` redirects to `flags['foundryvtt-swse']`, `getFlag` prefers that copy, but `ActorEngine.spendForcePoints` debits literal `flags.swse.bonusForcePoints`. After a Guardian Spirit (or sheet) write of the pool, debits become invisible and bonus points can be re-spent. Six independent pool builders. | Wrong resource economy on a live path; no test covers `guardian-spirit-actions.js`. Root cause is the global flag-scope compatibility patch (`F-INF-005`, `F-PAT-005`). |
| 2 | **F-STO-001 (high)**: store purchase rollback leaves already-created droid/vehicle actors and still reports `rolledBack: true`. **F-HOL-002 (high)**: Holonet trade/payout rollback is its own atomicity engine (whole-actor overwrite, item delete-and-recreate without `keepId`). | Violates A-10 atomicity, in the trade/store area the owner marked runtime-risky. |
| 3 | **F-FRC-002 (high)**: Force Point maximum computed by two formulas; `ForcePointsService.getMax` has no callers, so the `dailyForcePoints` house rule never affects the stored maximum. **F-CMB-003 (high)**: damage threshold under the enhanced-massive-damage house rule differs between sheet and resolution. **F-NPC-003 (high)**: three follower defense computations disagree. | Displayed and applied mechanics diverge; each needs a ruling on which formula is canonical (recorded as deferred, not decided). |
| 4 | **F-PAT-001 / F-PRG-001 / F-ACT-015 / F-PAT-004 (high)**: 108 live monkey-patch sites; wrapper chains on combat and Force entry points; `DerivedCalculator.computeAll` replaced by the Force domain at init; a ProgressionFinalizer method that exists only because of a side-effect import in the talents domain (`F-PRG-002`). | Behavior depends on module evaluation order; contracts cannot be enforced or tested in isolation; the main obstacle to every later consolidation. |
| 5 | **Credits outside TransactionEngine** (`F-UIS-001` sheet edits, `F-FRC-005` Force Alchemy, `F-ABL-002` lineage awards, `F-PRG-003` chargen summary staging credits mid-wizard, progression `GRANT_CREDITS` double-grant on partial failure, `F-VEH-006` Party Fund ammo). | A-10 single source of truth. Some paths are owner-approved workflows, so these need a decision (`F-VEH-006`, Holonet Party Fund) rather than a blanket fix. |
| 6 | **F-FEA-001 (high)**: 36 ungated `createItem`/`updateItem` listeners (18 feat families) run and write metadata on every connected client, on every item update. **F-FEA-003**: those hooks hard-code feat rules that diverge from `data/canonical/feats.json`. | Multi-client write races plus measurable overhead; a second feat authority. |
| 7 | **F-GOV-001 (high)**: A-02 has no runtime enforcement. `MutationInterceptor` writes a context nothing reads; 55 governance modules are unreachable (Sentinel layers, `CR-08`). | The architecture claims enforcement it does not have. |
| 8 | Live features that do not work: **F-CMB-004** Combat Action Browser calls a method that does not exist (the only definition is in an orphan adapter); **F-TAL-003** Master Advisor reads a field `combatTurn` never carries; **F-MEN-002** `SuggestionEngineCoordinator.initialize()` is never called; **F-VEH-001** vehicle import wizard unwired with a false "no implementation" message; **F-GAM** PvP wagers never escrow. | User-visible defects or silently disabled systems. |

## 4. Top simplification opportunities

| Opportunity | Evidence | Benefit | Risk |
|---|---|---|---|
| **Delete statically confirmed dead modules** (governance 10.0k, infrastructure 6.8k incl. the stale `scripts/holonet/scripts/core/*` copy, unreachable patch modules 5.6k, mentor 3.6k, house-rule V1 initializer 3.1k, `skill-uses.js` 2.6k, 49 orphan feat modules 2.5k, combat 2.4k, …) | `dead-code-candidates.json` | −52.9k SLOC (≈10%), fewer false leads; several cycles break | Low with OSI checklist; macro/global use must be ruled out per module (legacy class E) |
| **Reroute flag writes to `ActorEngine.updateActorFlags`/`unsetActorFlag`** | 203 of 331 A-02 sites; talents 72, combat, follower hotfixes | Restores the single mutation gate without new API | Low–medium; mechanical changes with tests |
| **Collapse the flag-scope compatibility patch** (`swse` ↔ `foundryvtt-swse`) to one scope, via one migration | `F-INF-005`, `F-PAT-005`, root of `F-TAL-007` | Removes a global `Document.prototype` patch and a class of split-state bugs | Medium; data migration (runtime-risk area) |
| **Fold runtime patches into their owners** (progression steps, PrerequisiteChecker, CombatOptionResolver, ForceExecutor, DerivedCalculator) | `F-PAT-001`, `F-PRG-001`, `F-FEA-002`, `F-FRC-008`, `F-TAL-006` | Deterministic behavior; makes contracts testable | Medium; each fold is its own PR with regression tests |
| **One Force Point pool builder, one maximum formula** | `F-FRC-002/003`, `F-TAL-007` | Fixes the critical defect and removes six clones | Medium; rules decision on maximum |
| **One credit path** (TransactionEngine for sheet edits, alchemy, lineage, progression grants) | §3 row 5 | A-10 compliance; idempotent grants | Medium; owner decisions for Party Fund workflows |
| **One feat-metadata hook with GM gating**, reading canonical data | `F-FEA-001/003` | −34 listeners per update; single feat authority | Medium |
| **Seams for oversized modules** (`holonet-messenger-service` 7k, `character-like-sheet` 6.8k, `actor-engine` 4.9k, `prerequisite-checker` 4k, workbench 3.8k, ModifierEngine 2.1k) | `oversized-module` findings propose concrete seams | Reviewable units; fewer cross-responsibility edits | Medium; do after patches are folded |
| **Break cheap cycles** (unused imports, re-exports, dead writers) | `F-ACT-001`, `F-EQP-002`, `F-PRG-*` | Removes 4 of 9 static cycles with no behavior change | Low |

What not to do: merge modules to cut file counts, introduce new frameworks or managers, or re-architect the domain graph before the patch layer is gone (`F-X-002` explains the order).

## 5. Major dependency and integration problems

- All 31 code-bearing domains form one strongly connected component. There are 9 file-level cycles (52 files), and the largest couples actor derived math with combat math (`F-ACT-001`).
- Engines import UI: 45 live engine→UI edges in 36 modules (`P-A07`). ModifierEngine depends upward on combat (`CR-05`).
- Hidden composition: hotfixes and patches load through side-effect imports (`squad-actions-init.js`, `F-INF`/`F-PRG-002`). Settings are registered in four places (`F-INF`).
- Pack pipeline: all 11 declared vehicle packs are generated at release from `data/canonical/vehicles/vehicles.json`. Tracked `packs/vehicles-*.db` files are retired input, and `canonical-ship-pack.yml` is pinned to a stale branch (`CR-VEH-02`, refines `CR-12`).

## 6. Performance investigation (hypotheses, not measurements)

There are 17 performance findings: 1 confirmed structurally (`F-FEA-001`) and 16 suspected. The main ones:
- Passive-ability re-registration runs 2–3 times per mutation (`F-ACT-011`).
- The prerequisite integrity pass runs on every `recalcAll` (`F-GOV-004`).
- `getSuggestions` writes flags on a read path (`F-MEN-006`).
- Global `renderApplicationV2` DOM repair runs on every render (`F-CMB-011`, `F-UIS-010`).
- Encumbrance is computed twice per prepare (`F-EQP-006`).
- Holonet and games rewrite whole world-setting arrays per message or move (`F-HOL-008`, `F-GAM-006`).
- Explicit full renders follow mutations (`F-UIS-013`).

**Recommended instrumentation** (behind a disabled-by-default diagnostics setting, per OSI): counters and `performance.now()` spans around `ActorEngine.recalcAll`, `DerivedCalculator.computeAll`, passive re-registration, `SWSEV2CharacterLikeSheet._prepareContext`, the `updateItem`/`createItem` listener fan-out (count per event), and Holonet setting writes. Measure in a live Foundry V13 world with a level-10 character, a droid and a vehicle before and after waves 2–3. No performance improvement is claimed until it has been measured.

## 7. Documentation consolidation candidates (none deleted)

25 documentation findings. The main candidates:
- Correct or retire the stale constitutional sections (`F-X-003`, `CR-01`…`CR-09`).
- Commit the owner standing instructions (`F-X-004`).
- Append the 31 new rules questions to the register (`F-X-005`).
- Re-label audit documents that call dead modules "implemented" (e.g. `skill-uses.js`, 49 feat modules).

Each domain sidecar lists its own candidates, such as docs that the new contract would supersede or that should be linked as historical evidence. PR [docflowGM/foundryvtt-swse#1184](https://github.com/docflowGM/foundryvtt-swse/pull/1184) is independent: it is open and removes six already-verified obsolete docs, including `docs/migrations/readme.md` (`F-MIG-004`).

## 8. Remaining unimplemented mechanics and certification requirements

From the Phase 1 ledger ([unresolved-ledger.md](../../architecture/v2-contracts/unresolved-ledger.md)):

| Status | Items |
|---|---:|
| `FOUNDRY_ACCEPTANCE_REQUIRED` | 100, including every Force V2 acceptance row A1–L1, droid runtime certification (0/122 components runtime-certified), vehicle and NPC live checks, and the Step 1 runbook (**not executed**) |
| `DEFERRED_RULES_REVIEW` | 77 |
| `UNIMPLEMENTED` | 38 |

The `UNIMPLEMENTED` items include the GM Datapad procedural generator UI and commit phase (`scripts/generation/**`, 150 test-only modules: a planned integration, not dead code), the vehicle import wizard wiring, Suggestion coordinator initialization, and holonet notification emitters that never fire.

## 9. Proposed Phase 3 remediation priorities (dependency-ordered)

The wave assignment for every finding is in `remediation-roadmap.json`. The recommended sequence:

1. **Wave 0 — Guardrails (S).** Add the census `--check` and the invariant probes to CI, non-blocking at first, then as a ratchet (`F-X-001`). Widen the chat and monkey-patch probes to the patterns found in `B-CHT` and `B-PAT`.
2. **Wave 1 — Owner decisions (no code).**
   - Rule on `CR-03` (rules-authority model) and `CR-04` (ActorEngine as gate or as orchestrator).
   - Commit the owner standing instructions (`F-X-004`) and append the 31 new rules questions (`F-X-005`).
   - Decide the credit-workflow exceptions: Party Fund ammo (`F-VEH-006`), Holonet Party Fund, and the chargen credit staging (`F-PRG-003`).
   - Rule on the Force Point maximum formula, the damage threshold formula, and follower Fortitude.
3. **Fix the two critical and three atomicity defects first**, each as its own small PR with regression tests and a Foundry acceptance row:
   - `F-TAL-007` / `F-FRC-003` (single bonus-pool path and scope)
   - `F-STO-001`
   - `F-HOL-002`
   - the progression `GRANT_CREDITS` idempotency
4. **Wave 2 — Delete the statically confirmed dead code** (≈52.9k SLOC), directory by directory, after the per-module macro/global check. Start with governance, the infrastructure duplicates, the unreachable patch modules and the orphan feat modules. Also remove the dead D&D crit-confirmation paths (A-18). Each deletion PR updates any audit doc that cites the deleted module.
5. **Wave 3 — Reroutes.**
   - Flag writes to `updateActorFlags`/`unsetActorFlag` (talents first: 72 sites).
   - Chat bypasses to `SWSEChat`.
   - Engine settings reads to `HouseRuleService`.
   - Credit paths to TransactionEngine, per the Wave 1 decisions.
   - Gate the feat metadata hooks to the GM and reduce them to one listener.
6. **Wave 4 — Consolidate duplicate authorities.** Force Point pool and maximum, Dark Side Score owner, BAB (three implementations in progression, plus PrerequisiteChecker), the condition-track table, class loaders and the Nonheroic definition, skill-key normalizers, and the two readiness validators. Rules-sensitive items wait for the Wave 1 rulings.
7. **Wave 5 — Structural.**
   - Fold the runtime patches into their owners.
   - Collapse the flag-scope patch with one migration.
   - Break the cycles.
   - Add seams to the oversized modules.
   - Take the instrumented performance measurements.
8. **Wave 6 — Unimplemented integrations**, once the owner prioritizes them: generator UI, vehicle import wiring, Suggestion coordinator, holonet emitters, PvP wager escrow.

**Expected benefits:**
- Roughly 10% less runtime code.
- One writer per persistent fact for actor state, credits and Force Points.
- Deterministic module behavior, with the patch layer removed.
- Contracts that CI can enforce.

**Main risks:**
- Waves 3–5 touch runtime-risk areas: damage, credits, Force Points, progression finalization and migrations.
- Every PR there needs focused offline tests **and** a Foundry V13 acceptance row before it can be called complete.

## 10. Limitations

- **Static and offline only.** No Foundry V13 world was available, so no claim here is `live-foundry-verified`. Several findings depend on Foundry behavior that still needs checking live: `combatTurn` arguments, flag-scope persistence, V1 hook names on V2 apps, and item ids without `keepId`.
- **Investigators.** Six parallel investigators produced the domain evidence. The coordinator validated every sidecar mechanically (schema, unique IDs, 1,946 `path:line` references resolve at `f734b4d`) and re-verified the critical findings plus two high findings by reading the code. The other findings rest on the investigators' reading.
- **Probes are lower bounds.** Domain audits found more sites than the regex/AST probes did; for example, 108 monkey-patch sites against 20 from the probe.
- **Reachability is static.** Macros in packs, console use of `game.swse.*` globals and module APIs can reach code the census marks unreachable. Every deletion therefore keeps the legacy class E/F check.
- **Git history** at the audited commit is a single squashed commit, so intent was established from documents rather than history.
