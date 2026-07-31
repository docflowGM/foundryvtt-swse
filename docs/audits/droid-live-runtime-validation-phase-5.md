# Droid Stabilization Phase 5 — Live Foundry VTT v13 Validation and Surgical Runtime Fixes

## Environment

**No live Foundry VTT v13 instance was launched during this phase.** This is stated up front, plainly, because Phase 5's own mandatory standard is explicit: a Node test, a mocked Foundry shim, source inspection, a console-only function call, or a successful CI run does not count as live runtime verification, and no row may be marked PASS without one. None of that occurred here — every runtime-matrix row below is marked **BLOCKED** for the reason documented in this section, not PASS.

Before any other work, the environment was searched (not assumed) for a usable Foundry v13 setup:

- No `package.json` exists anywhere in this repository (confirmed by direct check) — there is no npm/Node dependency manifest, no `foundry` CLI package, and no scripted install step of any kind.
- No `foundryconfig.json` exists — this repo has no configured link to a local Foundry `Data` directory, which is the standard mechanism this ecosystem uses to symlink a system/module into a running Foundry install for development.
- No Foundry VTT application, server binary, or `resources.app` directory exists anywhere on this container's filesystem (checked via a filesystem-wide search for `foundryvtt`/`resources.app`/`foundry.js`, restricted to paths outside this repo itself).
- No Foundry license file, activation key, or credential of any kind exists in this environment — Foundry VTT is commercial software requiring a purchased license and the vendor's own application package, neither of which is bundled in this git repository or provisioned in this container.
- `.github/workflows/rolling-system-validation.yml` — this repo's only CI workflow — **documents its own scope explicitly** in its header comment: *"What this workflow does NOT verify: Anything that requires a running Foundry VTT v13 instance (actual dice rolls, chat rendering, DOM click handling, live document mutation)... This is a static/Node-only CI."* This is the repository's own authors confirming, independently of this phase, that no runtime verification has ever been part of this project's automation.
- Chromium and Playwright *are* pre-installed in this container (confirmed at `/opt/pw-browsers`), but a browser has nothing to connect to without a running Foundry server process, a loaded world, and the SWSE system — none of which exist here. Browser automation without a live application behind it cannot produce a runtime result.

**Conclusion**: this environment cannot launch Foundry VTT v13, load the SWSE system, open a world, or exercise any Actor/Item/token/sheet/Garage/Workshop/progression/combat/chat workflow live. This is a genuine, documented environmental limitation, not a choice to skip the work. Per the phase's own instructions, the correct and only honest response is to mark every runtime row **BLOCKED**, not to fabricate results, and to still improve automated coverage for the untested seams where practical — which this phase did (see "Progression guard automated coverage" and "Synthetic-token mutation-targeting coverage" below).

## Fixtures (documented, not executed)

Since nothing could be run live, the fixtures below are written as precise, reproducible specifications — ready for a future session with real Foundry v13 access to build and exercise directly, not as a substitute for having done so.

**Fixture A — Playable custom droid**: create via chargen/Actor.create with `type: 'droid'`, `system.droidCalculationMode: 'playable-derived'` (or simply absent — playable-derived is the safe default per `resolveDroidCalculationMode()`), one embedded Item of `type: 'class'` at level 1, standard ability scores (10 in each), `system.installedSystems` containing one canonical processor id (e.g. `heuristic-processor`) and one canonical locomotion id (e.g. `walking`) each with `provenance: { origin: 'post-import-customization' }`, one integrated weapon Item, and `system.credits` sufficient for at least one Garage purchase (e.g. `5000`). No `flags.swse.stockDroidImport` of any kind.

**Fixture B — Imported stock droid**: run `StockDroidImporterEngine.importDroidTemplate(droidId)` against any `packs/droids.db` entry with published melee or ranged attacks (e.g. an astromech or protocol droid entry with at least one integrated tool/weapon). Verify post-import: `system.droidCalculationMode === 'stock-statblock'`, `system.bab`/`system.defenses.*`/`system.damageThreshold`/`system.initiative`/`system.hp` all populated from the published totals, `flags.swse.stockDroidImport.publishedTotals` and `.originalActorSnapshot` present, at least one embedded weapon Item with `flags.swse.stockDroidAttack.sourceStatblock === true`, and `system.droidSystems` containing at least one parseable source entry (e.g. a sensor or accessory record with a `sourceText`).

**Fixture C — Converted stock droid**: start from a fresh copy of Fixture B, call `DroidStatblockConversionService.convertToPlayableDerived(actor)`, then confirm `flags.swse.stockDroidImport.publishedTotals`/`.originalActorSnapshot` are still present and unmodified, `system.droidCalculationMode === 'playable-derived'`, every stock-attack weapon's `flags.swse.stockDroidAttack.sourceStatblock === false`, and no class/feat/talent/level Items exist unless a GM deliberately added them afterward. Call `DroidConvertedSystemReconciliationService.inspectReconciliation(actor)` and confirm it returns at least one candidate.

**Fixture D — Drifted legacy droid**: take Fixture A, add an embedded Item carrying `flags.swse.droidPartId` for a canonical part id, then directly delete that same id's key from `system.installedSystems` via a console `actor.update()` (simulating a pre-Phase-2 removal that never cleaned up the Item) — this reproduces exactly the drift shape `scripts/domain/droids/droid-installation-reconciler.js#diagnoseDroidInstallationDrift()` is designed to detect (`ORPHANED_ACTIVE_ITEM`). Separately, set one `system.installedSystems` key to a string that does not normalize against any canonical id (e.g. `"totally-unknown-legacy-key"`) to reproduce the malformed-legacy-key fallback path in `UpgradeService.removeUpgrade()`.

**Fixture E — Synthetic-token droid**: place Fixture A (or B/C) on a scene as a **linked** token (`actorLink: true`) and separately as an **unlinked** token (`actorLink: false`) on the same or a different scene. Record `system.installedSystems`, `system.droidCalculationMode`, and embedded Item ids on the base world Actor *before* any token-specific mutation, so a post-mutation diff can confirm whether the base Actor was (correctly, for linked) or was not (correctly, for unlinked) affected.

None of these fixtures were built or exercised — they are provided as exact reproduction steps for whoever next has real Foundry v13 access, per the phase's explicit requirement to "provide exact fixtures and reproduction steps" when no live environment is available.

## Runtime matrix

Every required row is listed below. **Every row is BLOCKED** — no live Foundry v13 environment was available to execute any of them, for the reason documented in "Environment" above. No row is PASS or FAIL, and none is omitted.

### A. Installation authority and economy
| ID | Row | Status |
|---|---|---|
| A1 | Garage install charges credits | BLOCKED — no Foundry environment |
| A2 | Workshop install uses the same authority | BLOCKED — no Foundry environment |
| A3 | Garage removal refund | BLOCKED — no Foundry environment |
| A4 | Workshop removal refund | BLOCKED — no Foundry environment |
| A5 | Insufficient funds rollback | BLOCKED — no Foundry environment |
| A6 | Unknown legacy key removal | BLOCKED — no Foundry environment |

### B. Installed-component resolution
| ID | Row | Status |
|---|---|---|
| B1 | Duplicate representations resolve once | BLOCKED — no Foundry environment |
| B2 | Disabled record | BLOCKED — no Foundry environment |
| B3 | Backup processor | BLOCKED — no Foundry environment |
| B4 | Integrated lightsaber classification | BLOCKED — no Foundry environment |
| B5 | Locomotion Item resolution | BLOCKED — no Foundry environment |
| B6 | Weaponized accessory | BLOCKED — no Foundry environment |

### C. Stock-statblock preservation
| ID | Row | Status |
|---|---|---|
| C1 | Import stock droid | BLOCKED — no Foundry environment |
| C2 | Rerender stability | BLOCKED — no Foundry environment |
| C3 | World reload stability | BLOCKED — no Foundry environment |
| C4 | Current HP persistence | BLOCKED — no Foundry environment |
| C5 | Condition-track behavior | BLOCKED — no Foundry environment |
| C6 | Temporary modifier behavior | BLOCKED — no Foundry environment |

### D. Stock attack pipeline
| ID | Row | Status |
|---|---|---|
| D1 | Published attack total exactly once | BLOCKED — no Foundry environment |
| D2 | Temporary attack modifier | BLOCKED — no Foundry environment |
| D3 | Natural 1 | BLOCKED — no Foundry environment |
| D4 | Natural 20 and critical | BLOCKED — no Foundry environment |
| D5 | Reroll | BLOCKED — no Foundry environment |
| D6 | Damage chat card | BLOCKED — no Foundry environment |
| D7 | Multiple stock profiles | BLOCKED — no Foundry environment |

### E. Conversion
| ID | Row | Status |
|---|---|---|
| E1 | Stock progression blocked | BLOCKED — no Foundry environment (decision logic itself now has Node-level coverage; see below) |
| E2 | Inspect conversion | BLOCKED — no Foundry environment |
| E3 | Convert without reconciliation | BLOCKED — no Foundry environment |
| E4 | Progression after conversion | BLOCKED — no Foundry environment (decision logic itself now has Node-level coverage; see below) |
| E5 | Repeated conversion | BLOCKED — no Foundry environment |

### F. Reconciliation
| ID | Row | Status |
|---|---|---|
| F1 | Exact canonical match | BLOCKED — no Foundry environment (classification logic itself has Node-level coverage since Phase 4) |
| F2 | Alias match | BLOCKED — no Foundry environment (same) |
| F3 | Ambiguous match | BLOCKED — no Foundry environment (same) |
| F4 | Descriptive-only source | BLOCKED — no Foundry environment (same) |
| F5 | Already-canonical system | BLOCKED — no Foundry environment (same) |
| F6 | Post-import customization | BLOCKED — no Foundry environment (same) |
| F7 | Apply reconciliation | BLOCKED — no Foundry environment |
| F8 | Integrated weapon reconciliation | BLOCKED — no Foundry environment |
| F9 | Unmappable weapon | BLOCKED — no Foundry environment |
| F10 | Repeated reconciliation | BLOCKED — no Foundry environment |

### G. Rollback
| ID | Row | Status |
|---|---|---|
| G1 | Roll back reconciliation | BLOCKED — no Foundry environment |
| G2 | Roll back conversion | BLOCKED — no Foundry environment |
| G3 | Repeated rollback | BLOCKED — no Foundry environment |
| G4 | Failed conversion rollback | BLOCKED — no Foundry environment |
| G5 | Failed reconciliation rollback | BLOCKED — no Foundry environment |

### H. Linked and unlinked tokens
| ID | Row | Status |
|---|---|---|
| H1 | Linked token mutation | BLOCKED — no Foundry environment (underlying synthetic-token targeting logic itself has Node-level coverage against the real function; see below) |
| H2 | Unlinked synthetic installation | BLOCKED — no Foundry environment (same) |
| H3 | Unlinked synthetic conversion | BLOCKED — no Foundry environment (same) |
| H4 | Unlinked synthetic rollback | BLOCKED — no Foundry environment (same) |
| H5 | Reload persistence | BLOCKED — no Foundry environment |

### I. Permissions
| ID | Row | Status |
|---|---|---|
| I1 | GM may inspect/install/remove/convert/reconcile/roll back | BLOCKED — no Foundry environment (owner/GM boolean gating itself has Node-level coverage since Phase 4's shim tests) |
| I2 | Owner may perform permitted actions | BLOCKED — no Foundry environment (same) |
| I3 | Observer may inspect but not mutate | BLOCKED — no Foundry environment (this repo's Node-level fakes model permission as a simple owner/non-owner boolean, not Foundry's full permission-level enum — a live environment is required to verify the OBSERVER tier specifically) |
| I4 | Nonowner cannot mutate | BLOCKED — no Foundry environment (same simplification as I3; boolean non-owner case has Node-level coverage) |
| I5 | Direct service invocation enforces permissions | BLOCKED — no Foundry environment (same) |

**Totals: 55 rows required, 55 rows recorded, 0 PASS, 0 FAIL, 55 BLOCKED.** No row was omitted.

## Runtime defects found

**None.** A defect can only be "found" by reproducing it, and reproduction requires exactly the live environment this phase confirmed does not exist. No production runtime behavior was observed, so none could be classified as a fixture error, UI/listener reachability issue, permission failure, ActorEngine targeting issue, resolver error, transaction rollback error, calculation-mode error, stock-attack error, modifier-suppression error, conversion/reconciliation error, or template/context mismatch. Reporting a defect here without having reproduced one would violate the phase's own explicit prohibition on fabricating results.

## Progression guard automated coverage (new this phase)

Phase 4 identified `scripts/apps/progression-framework/progression-entry.js`'s stock-mode progression guard as having zero automated coverage — even the Foundry-shim harness could not load the file (its own transitive imports, `ShellRouter`/`ActorAbilityBridge`, need Foundry surface beyond the shim's scope, confirmed by attempting the import directly: `Cannot read properties of undefined (reading 'api')`).

This phase extracted the guard's actual decision logic into a new pure function, `evaluateProgressionGuard(actor)` (`scripts/actors/droid/droid-mode-adapter.js`), and rewired `launchProgression()` to call it instead of duplicating the check inline — the same extraction pattern already used for `getStockAttackFlatBonus()` (Phase 3) and `shouldSuppressComponentModifiers()` (Phase 4). This is not a refactor for its own sake: it is the smallest change that makes a previously-zero-coverage decision testable at all, without touching or duplicating `launchProgression()`'s own routing logic.

Coverage added (`tests/droid-mode-adapter.test.mjs`), against the 10-item required list:

1. **Stock-statblock droid is blocked** — tested directly; `blocked: true`, correct reason, correct actor-named message.
2. **Playable-derived droid is allowed** — tested directly; `blocked: false`.
3. **Ordinary character is unaffected** — tested directly; a `type: 'character'` actor short-circuits before any droid logic runs.
4. **Ordinary NPC is unaffected** — tested directly, including one carrying a droid-shaped flag by accident, to confirm the `actor.type !== 'droid'` guard is the actual determining factor, not the flag's mere presence.
5. **Legacy inferred stock mode is blocked** — tested directly; an actor with only the pre-Phase-3 `flags.swse.stockDroidImport.importMode` legacy signal (no explicit `system.droidCalculationMode`) is still blocked.
6. **Malformed mode fails safely** — tested directly; an unrecognized explicit mode value resolves to playable-derived (per `resolveDroidCalculationMode`'s own fail-safe behavior) and does not throw or incorrectly block.
7. **Warning text is clear** — tested directly; message is a non-empty, human-readable string even when the actor has no name.
8. **No progression session is created when blocked** — **verified by static code inspection, not an automated assertion**: `launchProgression()`'s guard is an unconditional early `return;` positioned before any `ChargenShell`/`LevelupShell` construction code (confirmed by reading the current function body, quoted verbatim in `docs/audits/droid-converted-system-reconciliation-phase-4.md`'s prior finding and re-confirmed here) — the file's own import-graph weight prevents loading it to assert this behaviorally.
9. **Direct invocation cannot bypass the guard** — **verified by static code inspection**: the guard executes unconditionally at the top of `launchProgression()`, gated on nothing a caller can disable or skip; same limitation as item 8.
10. **Conversion allows progression afterward** — tested directly; flipping `system.droidCalculationMode` from `stock-statblock` to `playable-derived` (exactly what `convertToPlayableDerived()` does) is sufficient on its own to unblock the guard.

**8 of 10 required items now have real, automated Node coverage** (up from 0 before this phase); the remaining 2 (8, 9) are structural claims about `launchProgression()`'s control flow that require either loading that file (confirmed infeasible even through the shim) or live Foundry execution (BLOCKED, per above) to verify behaviorally rather than by reading the code.

## Synthetic-token mutation-targeting coverage (new this phase)

Investigated the "Phase 7 ActorEngine fix" this phase's instructions referenced. Traced it to `scripts/utils/actor-utils.js#applyActorUpdateAtomic` — the function `ActorEngine.updateActor()`/`applyMutationPlan()` actually delegates every real actor mutation to (confirmed by reading `scripts/governance/actor-engine/actor-engine.js`, which imports `applyActorUpdateAtomic` and calls it directly). Its own comment identifies the fix precisely: prior to it, *any* actor whose `collection === null` was unconditionally redirected to `game.actors.get(actor.id)` — the base world Actor sharing that id — even when the actor in hand was an **unlinked token's own synthetic actor** (`actor.isToken === true`), for which `collection === null` is normal, not corruption. The current guard (`if (actor.collection === null && actor.id && !actor.isToken)`) only attempts recovery when the actor is *not* a token — confirmed correct by reading the code, and this fix is unrelated to and predates this droid stabilization effort entirely (it comes from `vehicle-crew-assignment-phase-7`, a different track).

Since every droid conversion/reconciliation/Garage-installation mutation routes through `ActorEngine`, which routes through this exact function, droid mutations automatically benefit from this fix with no droid-specific code required. What was missing was automated confirmation of that fact. `applyActorUpdateAtomic` turned out to be lightweight enough (only imports `logger.js` and `mutation-trace.js`, both already Node-safe) to load and exercise **for real** — not faked — through the Phase 4 Foundry-shim harness, after extending its globals shim with a narrow `foundry.utils.flattenObject` reimplementation and a real `game.actors` `Map`.

New `tests/droid-synthetic-token-mutation-targeting.test.mjs` (5 test blocks, 9 assertions) exercises the **real, unmodified** `applyActorUpdateAtomic`:

1. A world droid Actor (real collection, not a token) updates directly — no recovery detour.
2. A linked droid token Actor (shares the base actor's real collection) — same direct path.
3. **The critical case**: an unlinked synthetic droid token Actor (`collection: null`, `isToken: true`) sharing an id with a base world Actor — confirmed the synthetic actor itself receives the update and the base world actor is **never touched**, which is exactly the historical bug this fix closes.
4. A genuinely detached/corrupted actor reference (`collection: null`, `isToken: false`, i.e. NOT a token) — confirmed recovery correctly redirects to `game.actors.get(id)` in this different case.
5. A detached, non-token actor with no recoverable world actor — confirmed it throws (`"synthetic/unowned and not recoverable"`) rather than silently dropping the mutation.

This is real production-code verification of the exact mechanism every droid mutation this stabilization effort built (conversion, reconciliation, Garage/Workshop installs, rollback) relies on for correct token targeting — the strongest coverage this phase could produce without a live Foundry environment, since it exercises the actual function rather than a description of it.

## Files changed

- `scripts/actors/droid/droid-mode-adapter.js` — added `evaluateProgressionGuard(actor)`.
- `scripts/apps/progression-framework/progression-entry.js` — `launchProgression()` now calls `evaluateProgressionGuard()` instead of duplicating the check inline.
- `tests/droid-mode-adapter.test.mjs` — 9 new test blocks / 19 new assertions for `evaluateProgressionGuard()`.
- `tests/droid-synthetic-token-mutation-targeting.test.mjs` (new) — 5 test blocks / 9 assertions against the real `applyActorUpdateAtomic()`.
- `tests/helpers/foundry-shim/globals.mjs` — added `foundry.utils.flattenObject` and a real `game.actors` `Map`, needed to load `applyActorUpdateAtomic` for real.

No fixture files, instrumentation scripts, or macros were added as repository files — the fixture specifications above are documentation only, since nothing could be executed to validate a macro/script would actually work against a real world. No unrelated file was touched; no new droid features, Garage categories, or sheet changes were made — every change above links directly to either the progression-guard coverage gap or the synthetic-token verification gap Phase 4 identified, not a new runtime defect (since none was reproducible).

## Automated tests (exact counts)

- `node tools/run-rolling-syntax-check.mjs` — **discovered 2107, executed 2107 (2105 non-excluded + 2 documented exclusions), passed 2105, failed 0, skipped 0, excluded 2** (pre-existing, documented, unrelated: `tools/audit-nonheroic-weapon-damage.mjs`, `tools/audit-npc-source-attribution.mjs`).
- `node tools/run-rolling-tests.mjs` — **discovered 50, executed 45, passed 45, failed 0, skipped 0, excluded 5** (pre-existing, documented Force-power-track exclusions unrelated to this work) — up from 44 before this phase, reflecting the one new Phase 5 test file plus the extended assertions in the existing mode-adapter file.
- Focused droid suites, all re-run individually and passing: `droid-installed-component-resolver.test.mjs`, `droid-item-classification.test.mjs`, `droid-installation-reconciler.test.mjs` (Phase 1/2, unmodified), `droid-mode-adapter.test.mjs` (39 blocks / 88 assertions, up from 30/69), `droid-converted-system-reconciliation-classifier.test.mjs` (13/35, Phase 4, unmodified), `droid-phase4-foundry-shim.test.mjs` (15/50, Phase 4, unmodified), `droid-synthetic-token-mutation-targeting.test.mjs` (new, 5/9).
- Combat/vehicle regression: all 8 pre-existing combat/vehicle SSOT guards (`check-combat-math-ssot.mjs`, `check-attack-outcome-ssot.mjs`, `check-critical-confirmation-guard.mjs`, `check-full-attack-reroll-guard.mjs`, `check-reroll-supersession-guard.mjs`, `check-vehicle-attack-routing-guard.mjs`, `check-vehicle-crew-assignment-guard.mjs`, `check-vehicle-crew-runtime-ux-guard.mjs`) re-run, all still pass, unaffected.

No test was merged into a "passed" count if it was actually skipped or excluded — the numbers above separate all four categories explicitly.

## Static guards

- `node tools/check-droid-authority-ssot.mjs --strict` — pass (Phase 1, unaffected).
- `node tools/check-droid-installation-write-authority.mjs --strict` — pass (Phase 2, unaffected).
- `node tools/check-droid-calculation-mode-authority.mjs --strict` — pass; re-verified specifically because this phase modified `progression-entry.js`'s import of `droid-mode-adapter.js` — check 7 (no literal mode-string checks outside the mode adapter) still passes since the guard now calls `evaluateProgressionGuard()` rather than re-implementing the mode comparison inline.
- `node tools/check-droid-reconciliation-authority.mjs --strict` — pass (Phase 4, unaffected).
- `bash tools/check-mutation-paths.sh` — pass; no new direct `actor.update()`/`item.update()`/`ChatMessage.create()` call sites (the one new test file calls a fake actor's own `update()` method inside a Node test, not a real mutation-path source file the guard tracks).

No new static guard was added this phase — none of the surgical changes introduced a new authority-violation shape requiring one (per the instruction to add a guard only when a defect represents a likely-to-recur authority violation; no defect was found to warrant one).

## Integrity baseline

`node tools/check-progression-integrity.mjs` — **44 violations** (`progression-registry-bypass`: 21, `draft-write-bypass`: 23) — **identical to the recorded Phase 3/4 baseline of 44.**

`node tools/check-architecture-boundaries.mjs` — **37 violations** (`direct-actor-mutation`: 6, `progression-registry-bypass`: 31) — **identical to the recorded Phase 3/4 baseline of 37.**

**Both counts are unchanged.** Neither tool's output references `droid-mode-adapter.js`, `progression-entry.js`, or either new/modified test file. Zero new violations were introduced by this phase, confirmed by exact-count comparison against the explicitly recorded baseline, not merely "the tool still passes."

## Remaining risks

- **Every runtime-matrix row across all five phases remains unexecuted.** This is the single largest open risk in the entire droid stabilization effort — the mechanical logic is real, internally consistent, and covered at the Node/shim level to an unusually thorough degree for this codebase, but has never been observed running inside actual Foundry VTT v13.
- Items 8 and 9 of the progression-guard coverage list (no session created when blocked; direct invocation cannot bypass) remain verified by code reading only, not by an automated assertion — `launchProgression()` itself could not be loaded through the shim.
- The permission model tested at the Node level (owner/GM boolean) is a simplification of Foundry's full NONE/LIMITED/OBSERVER/OWNER permission-level enum — row I3 in particular (the OBSERVER tier specifically) has no Node-level equivalent and remains entirely dependent on live verification.
- All of Phase 4's previously-identified risks stand unchanged: reconciliation's sheet button only auto-applies canonical/alias matches (no granular per-candidate selection UI); the fake `ActorEngine` used by most Phase 4 shim tests could drift from the real implementation over time (this phase's new tests deliberately used the *real* `applyActorUpdateAtomic` instead, for exactly this reason, where the import weight allowed it).
- `check-progression-integrity.mjs`/`check-architecture-boundaries.mjs`'s 44/37 pre-existing violations remain unaddressed (correctly out of scope for every phase of this effort so far).

## Merge-readiness decision

**CONDITIONALLY READY.**

Per this phase's own exit criteria: every one of the 35 designated critical rows (A1–A5, B1–B3, C1–C2, C4, C6, D1–D2, D4–D6, E1, E3–E4, F7–F8, F10, G1–G2, G4–G5, H2–H4, I1–I5) is BLOCKED, not FAIL, and every BLOCKED row has an explicit, verified environmental reason (no Foundry VTT v13 installation, license, server, or world exists in this environment). Per the stated rule — *"If any critical row remains BLOCKED because no real Foundry environment was available, merge readiness remains CONDITIONALLY READY"* — this is the correct, and the only honest, classification. It is explicitly **not** READY, because READY requires all critical rows to actually PASS, which requires live execution that did not happen. It is explicitly **not** NOT READY, because that classification is reserved for a critical row that actually FAILED, and none did — nothing was ever executed to fail.

This is unchanged from Phase 4's assessment, and will remain unchanged through any number of additional static/Node-level phases — only live Foundry VTT v13 execution of the critical rows above can move this to READY (if they pass) or NOT READY (if any fails).

PR #937 remains a **draft**, per this phase's explicit instruction to keep it draft unless the audit's own merge-readiness result is READY.
