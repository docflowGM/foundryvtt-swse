# SWSE V2 - Five-Category Consumer Ledger (verified against HEAD)

| | |
|---|---|
| **Repo** | `docflowGM/foundryvtt-swse` |
| **Scope** | READ-ONLY. Only the three SSOT Markdown files were added; no production file changed. |
| **Observed HEADs** | #1117 / checkout `1d09d4203be7a9ed72b157b1fb1dc3b40bea0b42` (clean tree apart from these docs); #1116 `202082309628ea2c6088e5806ab03a08b7ed77fd`; #1092 `e844aba1bbbb9b2a66f860bf579cf476d43c40f7` (ancestor of #1117 head); `origin/main` `de196e5a4` (contains merge #1109 of the integration branch; #1117 stack is **not** merged); `integration/v2-vehicles-droids-2026-11` `8ad8ca41e` |
| **Date/time** | 2026-11-06 UTC |
| **Evidence level** | `CODE_VERIFIED` = I read the file at this SHA; `TEST_REPRODUCED` = I reran the command in this session; `INFERRED`; `UNVERIFIED`. Nothing `RUNTIME_CONFIRMED`. |
| **Foundry status** | Not Foundry-tested. |
| **Siblings** | [Architecture Map](SWSE_V2_SSOT_Master_Architecture_Map.md) - [Convergence Roadmap](SWSE_V2_SSOT_Convergence_Roadmap_for_Claude.md) |

**Audit/change ledger:** 2026-11-06 v1. The owner's 72-row audit is an **input census**, not an exhaustive defect list.

## 0. How to read this ledger (honest limits)

- **What the 72-row verification is.** An automated, *shallow* check (script in the session scratchpad): for each input row, the cited file exists at HEAD and the cited symbol appears within +/-15 lines of a cited range. All 72 rows passed that check (0 missing files, 0 missing symbols, 0 off-range). That proves the *locations are still valid*, **not** that each behavioral claim is correct. Behavioral claims were re-read by hand only for the rows I mark `REFINED`/`FIXED`/`OPEN_CONFIRMED`/`RESOLVED`; every other row is `CONFIRMED_UNCHANGED` = present, nothing contradicting found, **not independently re-derived**.
- **No repo-wide import graph was generated.** Reachability claims below are targeted `grep` closures over `scripts/ templates/ styles/ tests/ tools/ system.json`; dynamic and computed imports are *not* ruled out. "Candidate" always means "statically unreferenced", never "proven dead".
- **No printed rule was verified by me** (no rulebook files in this environment). Rule pointers are inherited from the input audit and the repo's own ledgers.

## 1. Commands run (all read-only) and results

| Command | SHA | Result |
|---|---|---|
| `git status`, `git rev-parse`, `git merge-base --is-ancestor origin/audit/universal-vehicles-phase1 HEAD` | 1d09d42 | clean; Vehicle #1092 head **is an ancestor** of HEAD; `origin/main` has 2 commits not in HEAD, HEAD has 14 not in main (merge-base `968b25702`) |
| all six `node tools/check-droid-*.mjs --strict` | 1d09d42 | **6/6 PASS** |
| `node tests/droid-*.test.mjs` + `tests/*follower*.test.mjs` (44 files) | 1d09d42 | **44 pass / 0 fail** |
| `node tools/build-phase-5c-authority-classification.mjs --check`, `validate-partials.mjs`, `validate-data.js` | 1d09d42 | PASS |
| `node tools/build-universal-vehicle-phase3-source-preview.mjs --check`; `build-universal-vehicle-canonical.mjs --check` | 1d09d42 | exit 0 |
| `node tools/check-vehicle-{attack-routing,crew-assignment,crew-runtime-ux}-guard.mjs --strict` | 1d09d42 | exit 0 (x3) |
| `node --test tests/vehicle-universal-phase*.test.mjs` | 1d09d42 | **847 tests: 839 pass, 0 fail** (8 not pass/fail: skipped/todo) |
| `node tools/audit-droid-actor-classification-sites.mjs` | 1d09d42 | 531 regex line hits (heuristic; **not** 531 defects) |
| Full `node tools/run-rolling-tests.mjs` | 1d09d42 | **625 passed, 0 failed, 5 documented exclusions** - run earlier in this session at this same SHA (tree unchanged since); *not* re-run for this command. GitHub exact-head checks "Rolling system validation" and "targeted" both `success`. |

## 2. Branch / PR relationships (verified against GitHub + git)

| PR | Head ref @ SHA | Base | State |
|---|---|---|---|
| #1117 | `feature/v2-unified-clean-break-convergence` @ `1d09d42...` | #1116 branch | open draft |
| #1116 | `feature/v2-unified-u0-convergence-audit` @ `2020823...` | #1115 branch | open draft |
| #1115 | `feature/v2-unified-gate-c3a-creation-ledger` @ `b76c55de8` | #1114 branch | open draft |
| #1114 | `...wave-2b-host-eligibility` @ `e0d7a558a` | #1113 | open draft |
| #1113 | `...wave-2-guards` @ `502810b6d` | #1112 | open draft |
| #1112 | `...wave-1` @ `59ab2ab50` | `integration/v2-vehicles-droids-2026-11` | open draft |
| #1092 | `audit/universal-vehicles-phase1` @ `e844aba1b` | `audit/universal-vehicles-phase4d-review-base` | open draft |

Important: `origin/main` already contains "Merge pull request #1109 ... integration/v2-vehicles-droids-2026-11". The integration branch ref is therefore *behind* main's merge commit; the #1112-#1117 stack still needs a retarget/rebase decision (owner). Ancestry of the Vehicle head inside the Droid stack does **not** prove behavioral compatibility.

## 3. The 72-row input census re-verified at HEAD

Status legend: `CONFIRMED_UNCHANGED`, `FIXED_IN_BRANCH` (code fixed on #1117, unmerged, not Foundry-tested), `RESOLVED_IN_BRANCH`, `OPEN_CONFIRMED` (re-read, still true), `OPEN_INFERRED`, `REFINED` (input claim corrected/narrowed by my re-read).

| ID | Input cat. | HEAD status | HEAD cat. | Cited location | Symbol | File exists @HEAD | Symbol found near cited lines | Note |
|---|---|---|---|---|---|---|---|---|
| D-01 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/droids/droid-rules-profile.js:20-73` | `resolveDroidRulesProfile` | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-02 | C5 | RESOLVED_IN_BRANCH | C1 | `scripts/domain/droids/droid-rules-profile.js:75-89` | `componentMayContributeDroidModifiers` | yes | yes | Uniform confirmed-ledger rule landed in 1d09d42 (`droid-rules-profile.js` `componentMayContributeDroidModifiers`); asymmetry gone. |
| D-03 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/droids/droid-installed-component-resolver.js:156-346,421-515` | `resolveInstalledDroidComponents` | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-04 | C1 | FIXED_IN_BRANCH | C1 | `scripts/engine/customization/droid-customization-engine.js:64-82` | `collectInstalledComponents` / `collectConfirmedComponents` | yes | yes | F7 closed in #1117; `collectConfirmedComponents` present; reproduced/closed by `tests/droid-garage-resale-evidence.test.mjs` (rerun, pass). |
| D-05 | C1 | FIXED_IN_BRANCH | C1 | `scripts/engine/customization/droid-customization-engine.js:240-352` | `normalizeDroidCustomizationChangeSet` | yes | yes | Removal gated on `confirmed.has(id)`; guard checks 5a-5d rewritten. |
| D-06 | C1 | FIXED_IN_BRANCH | C1 | `scripts/engine/customization/droid-customization-engine.js:597-733` | `applyDroidCustomization` | yes | yes | Unchanged contract; still not multi-document atomic. |
| D-07 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/droids/droid-appendage-instance.js:60-140,153-229` | Instance/host ID helpers | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-08 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/droids/droid-initial-installation-service.js:82-134` | Initial installation plan/seed | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-09 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/droids/droid-component-source-review.js:44-97` | `resolveDroidComponentSourceReview` | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-10 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/droids/droid-component-quote-authority.js:24-46,77-160,180-263` | Quote and source-staged quote | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-11 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/droids/droid-part-schema.js:494-560` | Alias/UUID/definition lookup | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-12 | C1 | FIXED_IN_BRANCH | C1 | `scripts/domain/droids/droid-part-schema.js:644-672,679-740` | Prerequisite hardware collection/match | yes | n/a | F2 converged: confirmed ledger + explicit draft only; named-part identity match added. |
| D-13 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/actors/droid/droid-mode-adapter.js:60-125,197-210,318-322` | Mode and stock suppression | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-14 | C1 | CONFIRMED | C1 | `scripts/engine/effects/modifiers/ModifierEngine.js:343-348,1667-1740` | Droid modifier pipeline | yes | n/a | Gate uses `_followsDroidRules` + `componentMayContributeDroidModifiers`. |
| D-15 | C3 | OPEN_CONFIRMED | C3 | `scripts/engine/effects/modifiers/ModifierEngine.js:1657-1665` | `_followsDroidRules` fallback | yes | yes | `ModifierEngine.js:1657-1665`: on dynamic-import failure returns `actor?.type === 'droid'`; fallback re-grants type-only permission. Not yet fixed. |
| D-16 | C3 | OPEN_CONFIRMED | C3 | `scripts/patches/follower-droid-garage-hotfix.js:12-49,77-118` | `makeDroidCompatibilityProxy` and monkey patches | yes | yes | Proxy is wallet-view only (no `type` override); registered via `runtime-bugfix-hotfixes-init.js:16,38`, itself imported by `scripts/talents/squad-actions-init.js:6` (unusual registration chain). |
| D-17 | C1 | OPEN_CONFIRMED | C1 | `scripts/patches/follower-droid-garage-hotfix.js:21-29,50-76` | Owner-wallet routing behavior | yes | n/a | Owner-wallet behavior is legitimate; the patch wrapper is the removable part. |
| D-18 | C1 | FIXED_IN_BRANCH | C1 | `scripts/engine/droids/droid-factory.js:61-86` | Stock Droid normalization | yes | n/a | Raw-clone fallback removed (`droid-factory.js`); tested. |
| D-19 | C5 | CONFIRMED_UNCHANGED | C5 | `scripts/engine/droids/droid-factory.js:89-106` | Custom clone creation | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-20 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/apps/progression-framework/steps/droid-builder-step.js:34-47,376-387,774-783` | Builder UI and source quote consumer | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-21 | C2 | CONFIRMED_UNCHANGED | C2 | `scripts/apps/progression-framework/steps/droid-builder-step.js:68-95` | `_initializeDroidState` inference | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-22 | C5 | CONFIRMED_UNCHANGED | C5 | `scripts/apps/progression-framework/steps/droid-builder-adapter.js:21-25,96-115` | `shouldUseDroidBuilder`, hardcoded heuristic requirement | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-23 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/apps/progression-framework/steps/follower-steps/follower-droid-builder-step.js:11-32,122-258` | `FollowerDroidBuilderStep extends DroidBuilderStep` | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-24 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/apps/progression-framework/steps/final-droid-configuration-step.js:427-450` | Final Droid draft commit | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-25 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/apps/customization/customization-bay-app.js:344-348,499-527,1098-1105,1146-1149` | Droid Bay view/actions | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-26 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/engine/upgrades/UpgradeService.js:620-632,708-734` | Droid upgrade application/removal | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-27 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/sheets/v2/droid-sheet/droid-systems-resolver.js:136-155,198-257` | Droid sheet hardware view | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-28 | C5 | CONFIRMED_UNCHANGED | C5 | `scripts/sheets/v2/droid-actor-sheet.js:198-199,294-351,374-432` | Type-locked sheet actions | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-29 | C5 | CONFIRMED_UNCHANGED | C5 | `scripts/apps/store/store-checkout.js:145-178,438-498` | Whole Droid listing, purchase | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-30 | C5 | CONFIRMED_UNCHANGED | C5 | `scripts/engine/store/loader.js:261-266,309-325` | Droid pack sourcing | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| D-31 | C2 | OPEN_CONFIRMED | C2 | `scripts/engine/combat/damage-resolution-engine.js:412-470` | 0-HP disabled/dead decisions | yes | n/a | F3 unchanged; needs printed-source ruling. |
| D-32 | C2 | OPEN_CONFIRMED | C2 | `scripts/engine/combat/damage-packet-rules.js:171-185` | `getDamageTargetCategory` | yes | yes | Packet categorizer still uses its own droid criteria. |
| D-33 | C5 | REFINED | C4_CANDIDATE | `scripts/infrastructure/hooks/assets-hooks.js:10-62` | `createActor` owned asset branch | yes | yes | `scripts/infrastructure/hooks/assets-hooks.js` has NO importer, is not in `hooks/index.js`, root `index.js` is the only `esmodules` entry; no Actor type `follower` exists (template.json types: character, npc, droid, vehicle) and `purchasedBy` flag has no writer anywhere in the repo. Statically unreachable; dynamic-load absence not proven in Foundry. |
| D-34 | C5 | CONFIRMED_UNCHANGED | C5 | `scripts/domain/droids/droid-component-source-review.js:80-96` | Safe locomotion subsets and holds | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-01 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/vehicles/universal-vehicle-pack-registry.js:8-36` | 11 pack registry | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-02 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/core/vehicle-pack-data-loader.js:15-26,56-102` | Native pack index/load | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-03 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/vehicles/vehicle-source-identity.js:13-78,135-154` | Immutable provenance and identity | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-04 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/vehicles/vehicle-runtime-contract.js:34-108,146-241` | `classifyVehicleActorSource` | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-05 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/actors/vehicle/vehicle-precreate-hooks.js:19-30,116-166,181-194` | Registered Actor/Item write guards | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-06 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/vehicles/vehicle-installation-ledger.js:22-23,84-108,180-290,298-322` | Sealed installation ledger/plans | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-07 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/vehicles/vehicle-modification-rules.js:45-105,105-205` | Quote, nonstandard and workforce math | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-08 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/engine/vehicles/vehicle-installation-service.js:109-129,163-225,338-443` | Job, install, uninstall, ammo, sync | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-09 | C3 | CONFIRMED_UNCHANGED | C3 | `scripts/engine/vehicles/vehicle-installation-service.js:103-107` | Deprecated `install` → `gmInstantInstall` | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-10 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/vehicles/vehicle-stock-attack-authority.js:14-38` | `resolveTrustedStockAttackGroup` | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-11 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/vehicles/vehicle-weapon-damage.js:71-179` | `resolveCertifiedInstalledWeapon`, `resolveStockWeapon`, weapon authority | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-12 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/vehicles/vehicle-attack-preflight.js:23-34,51-115` | `authorizeVehicleAttackBeforeCosts` | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-13 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/vehicles/vehicle-evidence-runtime-gate.js:62-93` | GM adjudication receipt | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-14 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/vehicles/vehicle-store-eligibility.js:37-63,90-127` | `evaluateVehiclePurchase` and merchant purchase | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-15 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/domain/vehicles/vehicle-phase4d-runtime-audit.js:17-82,94-198` | Native runtime diagnostics | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-16 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/engine/import/vehicle-import-engine.js:17-94` | Vehicle source import | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-17 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/apps/vehicle-import-wizard.js:277-345` | V13 import UI, diagnostics | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-18 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/sheets/v2/vehicle-actor-sheet.js:1-35` | V2 Vehicle sheet delegates | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-19 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/sheets/v2/vehicle-sheet/vehicle-shipyard-actions.js:52-141` | `runShipyardAction`, `bindShipyardActions` | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-20 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js:9-17,646-735,951-1024` | Weapon/crew/shield/operations view models | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-21 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/sheets/v2/vehicle-sheet/vehicle-weapon-ops.js:6-15,53-176` | Weapon operations binding | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-22 | C2 | REFINED | C2 | `scripts/apps/customization/customization-bay-app.js:584-607,1146-1149` | Vehicle Bay preview/apply | yes | n/a | Bay Shipyard mode DOES charge through TransactionEngine (`customization-bay-app.js` apply with `walletActor`), and `canonicalBlock` refuses published hulls; it is a paid legacy lane for non-canonical vehicles, not a free write. |
| V-23 | C2 | REFINED | C2 | `scripts/engine/customization/vehicle-customization-engine.js:131-151,257-310` | Legacy Vehicle customizer | yes | n/a | Same as V-22. |
| V-24 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/engine/customization/vehicle-customization-engine.js:33-46` | `canonicalBlock` | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-25 | C2 | OPEN_CONFIRMED | C2 | `scripts/engine/upgrades/UpgradeService.js:635-640,736-745` | Vehicle direct add/remove | yes | n/a | `UpgradeService.js:635-640` and `738-745` write raw `system.installedSystems` with NO payment, NO source gate, NO job/EP. `vehicle-precreate-hooks.js` guards flags/provenance, not `system.installedSystems` (0 matches). Reachable at API level via `CommandBus` `APPLY_ITEM_UPGRADE`/`REMOVE_ITEM_UPGRADE` -> `UpgradeCommands`. UI reachability for a vehicle: `SWSEUpgradeApp.openForActor` has no repo caller; `ShellHost.js:100` maps `upgrade` to `workbench`; inline upgrade wiring `ShellHost.js:1169+` may be dormant: UNVERIFIED. |
| V-26 | C5 | CONFIRMED_UNCHANGED | C5 | `scripts/apps/vehicle-modification-manager.js:239-365,405-540` | Old calculation, installability and nonstandard decision | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-27 | C5 | CONFIRMED_UNCHANGED | C5 | `scripts/engine/vehicles/vehicle-factory.js:156-167,182-285,293-345` | Canonical stock refusal / legacy stockShip build | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-28 | C5 | CONFIRMED_UNCHANGED | C5 | `scripts/domain/vehicles/vehicle-transaction-service.js:20-170` | GM review, `approveTransaction` | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-29 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/actors/v2/vehicle-actor.js:17-24` | V2 `computeVehicleDerived` | yes | yes | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| V-30 | C5 | OPEN_INFERRED | C5 | `scripts/engine/effects/modifiers/ModifierEngine.js:1809-1877` | `_getVehicleModModifiers` | yes | yes | `ModifierEngine.js:1809+` reads raw `system.installedSystems` against `vehicle-system-definitions.js`; effect on derived values INFERRED (vehicle derived calls `computeCharacterDerived`). |
| S-01 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/governance/actor-engine/actor-engine.js:42+,209+,318+,438-468` | ActorEngine mutation/recalc | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| S-02 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/engine/store/transaction-engine.js:53-130,304-497,949+` | Commerce coordination | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| S-03 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/engine/store/acquisition-service.js:79-205,244-299` | Actor acquisition / owner links | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| S-04 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/apps/store/store-checkout.js:533-623,878-971` | Factory mutation plan compilation | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| S-05 | C1 | CONFIRMED_UNCHANGED | C1 | `scripts/engine/store/loader.js:309-325` | All-or-nothing Vehicle catalog | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| S-06 | C5 | REFINED | C4_CANDIDATE | `scripts/infrastructure/hooks/assets-hooks.js:10-62` | Owned asset `createActor` hooks | yes | yes | Same evidence as D-33. |
| S-07 | C5 | CONFIRMED_UNCHANGED | C5 | `scripts/apps/store/store-checkout.js:1416-1472,1531-1562` | Draft Vehicle approval path | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |
| S-08 | C5 | CONFIRMED_UNCHANGED | C5 | `scripts/apps/progression-framework/adapters/follower-session-seeder.js:64-170` | Follower creation session seeded from owner | yes | n/a | Verified present; no contradicting evidence found in this pass (shallow check: file+symbol, not behavior). |

Category tally of the **input** classification: C1 48, C2 6, C3 3, C4 0, C5 15 (as reported). At HEAD, by my re-read: F7/F2/F5/D-02 move toward C1; **D-33/S-06 become C4 candidates**; V-22/V-23 stay C2 but are *paid and canonical-blocked*, not free writes; no row is certified C4 by this ledger.

## 4. New or refined findings (full-field)

Field legend per the command: ID; category; domain; severity; repo/branch/SHA; path:function:lines; callers; runtime effect; RAW ref; source status; confidence; disposition; replacement owner; preconditions; acceptance test; blocking decision. All at branch `feature/v2-unified-clean-break-convergence` SHA `1d09d4203be7a9ed72b157b1fb1dc3b40bea0b42` unless noted.

### N-01 - Vehicle raw install/remove in UpgradeService (input V-25) - OPEN_CONFIRMED
- **Cat/domain/severity:** C2 / Vehicle / **P0**.
- **Location:** `scripts/engine/upgrades/UpgradeService.js` `applyUpgrade` `:635-640`, `removeUpgrade` `:738-745` (also record construction `:144-155`).
- **Behavior (CODE_VERIFIED):** `installedSystems[upgradeId] = true` then `ActorEngine.applyMutationPlan(actor, { set: { 'system.installedSystems': ... } })`; removal deletes `Object.keys(...)[upgradeIndex]`. No payer, price, EP, job, source or canonical check.
- **Guard gap (CODE_VERIFIED):** `scripts/actors/vehicle/vehicle-precreate-hooks.js` registers `preCreateActor/preUpdateActor(x3)/preUpdateItem/createActor` (`:184-191`) but contains **0** references to `system.installedSystems`; it protects `flags` ledger/provenance/environment, not this field.
- **Callers:** `CommandBus` `APPLY_ITEM_UPGRADE`/`REMOVE_ITEM_UPGRADE` (`scripts/engine/core/CommandBus.js:107,110`) -> `UpgradeCommands` (`:12,16`) -> service. UI: `ShellHost._wireUpgradeSurfaceEvents` (`ShellHost.js:1166+`) and `SWSEUpgradeApp`. **UI reachability for a vehicle is UNVERIFIED**: `SWSEUpgradeApp.openForActor` (`upgrade-app.js:240`) has no repo caller found; `ShellHost.js:100` maps surface `upgrade` -> `workbench`. API-level reachability (CommandBus, macros, console) is certain.
- **Effect:** unpaid shadow "installed systems" on any `vehicle` Actor incl. published hulls; consumed by `ModifierEngine._getVehicleModModifiers` (N-07).
- **Confidence:** CODE_VERIFIED (write), UNVERIFIED (UI).
- **Disposition:** make both branches refuse (fail closed) now; redirect to Shipyard navigation. **Replacement owner:** `VehicleInstallationService` (existing). **Preconditions:** none to refuse; deletion of the branches only after N-07/V-23 retire the readers. **Acceptance:** negative test that `applyUpgrade({itemId:'vehicle-actor-*'})` throws and performs zero `ActorEngine` calls; Droid delegation unchanged; mutation: re-add the write -> test fails. **Blocking decision:** none (pre-alpha, fail closed).

### N-02 - ModifierEngine droid-identity fallback (input D-15) - OPEN_CONFIRMED
- C3 / Droid / P1. `scripts/engine/effects/modifiers/ModifierEngine.js` `_followsDroidRules` `:1657-1665`; callers `:346` and `:1670`. On a failed dynamic import it logs and returns `actor?.type === 'droid'`, silently restoring type-only identity. CODE_VERIFIED.
- **Disposition:** static import of `droid-rules-profile.js` (it is pure and dependency-free except the mode adapter) or fail closed (return false and surface an error). **Acceptance:** simulated import failure grants no droid-component modifier. Mutation: restore fallback -> fails.

### N-03 - `assets-hooks.js` statically unreachable (inputs D-33, S-06) - REFINED -> C4 candidate
- `scripts/infrastructure/hooks/assets-hooks.js` registers `createActor`/`createItem`. **Negative reachability (targeted, CODE_VERIFIED):** no file imports it (`grep assets-hooks` over the repo returns only the file itself); `hooks/index.js` imports nothing of it; `system.json` `esmodules` = `['index.js']` only; Actor types are `character, npc, droid, vehicle` (`template.json`), so the `actor.type === 'follower'` branch can never match; the `purchasedBy` flag is **read** in this file and **written nowhere** in the repo. Ownership linking is done by `StoreAcquisitionService` via `system.relationships` (`acquisition-service.js:252-266`).
- **Confidence:** CODE_VERIFIED (static); dynamic loading via an auto-loader is **not ruled out**. **Disposition:** quarantine, then delete after a Foundry startup check that the handlers never register. Not an exploit.

### N-04 - Two Shipyards (inputs V-19/V-22) - CODE_VERIFIED, UI effect INFERRED
- The vehicle sheet's `[data-shipyard-action]` buttons delegate to `VehicleInstallationService` (`vehicle-shipyard-actions.js`). The Asset Bay and `VehicleCustomizationRouter.openVehicleCustomization` open `ShellRouter.openSurface(actor,'customization',{mode:'shipyard'})` (`vehicle-customization-router.js`; `ShellHost._openShipyardForAsset` `:796+`), which lands in `CustomizationBayApp` Shipyard mode -> `VehicleCustomizationEngine` (`customization-bay-app.js:584-607,1146-1149`). So a user can reach a **legacy, paid, non-canonical** Shipyard that is *not* `VehicleInstallationService`.
- The legacy engine **does** charge via `TransactionEngine.executeAssetCustomizationTransaction` (`vehicle-customization-engine.js:296`) and **does** refuse published hulls (`canonicalBlock` `:40-46`, applied at `:58,85,138,261`). Severity therefore **P1**, not P0.
- **Disposition:** route Bay Shipyard mode to the vehicle sheet's Shipyard (navigation only). Define custom-hull policy first (Section 6). **Acceptance:** published hull cannot reach any mutation but `VehicleInstallationService`.

### N-05 - Follower hotfix registration chain (input D-16) - OPEN_CONFIRMED
- `scripts/patches/follower-droid-garage-hotfix.js` (120 lines): `isFollowerDroid` delegates to `resolveDroidRulesProfile`; Proxy overrides only `system` credits/currency/wealth; patches `TransactionEngine.executeAssetCustomizationTransaction` (`:51-74`), four `DroidCustomizationEngine` statics, and `CustomizationBayApp._prepareContext`. Registered at `runtime-bugfix-hotfixes-init.js:16,38`, which is imported by `scripts/talents/squad-actions-init.js:6` (an unrelated module). Fragile: the droid Garage for followers depends on a talents init importing a hotfix aggregator.
- **Indispensable behavior it supplies:** (a) owner-wallet affordability in Bay preview, (b) `walletActor`/`assetActor` wiring into the transaction. TransactionEngine and the Bay already accept `walletActor` (`customization-bay-app.js` passes `{walletActor: wallet}` to both engines). **Retire only after** a test proves the owner is charged, the follower mutated, and preview shows owner credits, without the proxy.

### N-06 - Vehicle modifiers read a raw field (input V-30) - OPEN_INFERRED
- `ModifierEngine._getVehicleModModifiers` `:1809+` iterates `actor.system.installedSystems` against `vehicle-system-definitions.js` (10 `effects:` entries) and emits `VEHICLE_MOD` modifiers. Canonical effects flow through `getEffectiveVehicleDerived` / `custom-vehicle-effective.js` instead. Whether the raw path actually reaches derived values is INFERRED (vehicle derived calls `computeCharacterDerived` then `buildVehicleDerived`). **Acceptance:** a test that writes `system.installedSystems` on a published hull and asserts zero effect; then decide if any custom-only use remains.

### N-07 - `vehicle-transaction-service.js` has no references (input V-28) - candidate C4
- `scripts/domain/vehicles/vehicle-transaction-service.js` (238 lines): `grep` for `vehicle-transaction-service` and `VehicleTransactionService` repo-wide (excluding `docs/`) finds only the file itself. `approveTransaction` (`:100`) calls `ActorEngine.applyMutationPlan` on a stored plan (`:134-135`) with no TransactionEngine. Dormant but a latent unpaid-apply path if ever wired. **Disposition:** delete after owner confirms no GM-approval feature depends on it; **evidence:** static only.

### N-08 - Legacy `VehicleModificationManager` pinned by a test (input V-26) - C5
- `scripts/apps/vehicle-modification-manager.js` (545 lines) has **no importer** (repo-wide: only a test and `data/audits/item-phase-0-ssot-census.json` mention it). `tests/vehicle-universal-phase4e-p6-modification-rules.test.mjs:290-293` asserts the *deprecated* manager's text still contains `isNonstandard ? ep * 2 : ep`: a test enforcing abandoned semantics. **Disposition:** delete module and that assertion together (C4 after the test is replaced). Static evidence only.

### N-09 - Droid Store dependency and source counts (inputs D-29, D-30) - OPEN_CONFIRMED
- `packs/droids.db` = **194** lines (rerun); `data/canonical/droids/source-books/*.json` = **234** entries, all `partial` / `not-tested` (rerun). Store reads the legacy pack at `store-constants.js:51`, `loader.js:312,358`, `index.js:84`; `store-checkout.js:145-178,438-498` prices from the listing. Factory configuration of any stock model is **not in the data** (R2 `systems:{}`); constructed-hardware claims are unsupported. **Do not delete the pack** until a read-only listing source replaces it. **Disposition:** honest per-model status (`STOCK_STATBLOCK_ONLY` | `CONSTRUCTED_CERTIFIED` | `UNAVAILABLE_FOR_CONSTRUCTED_HARDWARE`), see Section 7.

### N-10 - Stale/obsolete guard & test assertions
- Fixed on the branch: `check-droid-customization-validation-authority.mjs` check 5 now behavioral (5a-5d), mutation-verified. Remaining: the N-08 test assertion; `tests/droid-gate-c3a-initial-installation.test.mjs` group 18 was rewritten in #1117 (no longer pins "followers get no modifiers").

## 5. Status of prior audit rows (F-series and V-series)

| ID | Prior claim | At HEAD 1d09d42 | Evidence |
|---|---|---|---|
| F1 NPC-type droid modifiers | open | **FIXED_IN_BRANCH** (profile + confirmed-ledger rule, uniform for all droids) | `droid-rules-profile.js`, `ModifierEngine.js:346,1719+`; `tests/droid-rules-profile.test.mjs` pass |
| F2 competing prereq collector | open | **FIXED_IN_BRANCH** | `domain/droids/droid-part-schema.js` `collectActorDroidSystemParts`; `tests/droid-prerequisite-evidence.test.mjs` pass |
| F3 0-HP divergence | open | **OPEN** (needs printed ruling) | `damage-resolution-engine.js:412-470` type-only; D-31/32 |
| F4 no unified identity | partial | **PARTIAL**: profile used by ModifierEngine, Garage engine, UpgradeService, Bay; ~531 regex hits remain (heuristic, many UI) | census tool |
| F5 raw clone fallback | open | **FIXED_IN_BRANCH** | `droid-factory.js`; `tests/droid-factory-stock-contract.test.mjs` pass |
| F6 Store identity | open | **OPEN** (source-blocked) | N-09 |
| F7 mirror-only resale | open | **FIXED_IN_BRANCH** (TEST_REPRODUCED fix: `tests/droid-garage-resale-evidence.test.mjs` pass) | `droid-customization-engine.js` |
| V-F1 UpgradeService vehicle | open | **OPEN_CONFIRMED** (N-01) | |
| V-F2 Bay vehicle authority | open | **OPEN, severity P1** (paid, canonical-blocked) (N-04) | |
| V-F3 vehicle modifier shadow | open | **OPEN_INFERRED** (N-06) | |
| V-F4 VehicleFactory legacy `stockShip` | C5 | **C5 unchanged** (not re-read in depth) | |
| V-F5 VehicleTransactionService | C5 | **C4 candidate** (N-07) | |
| X-F1 same field name, two meanings | by design | **CONFIRMED** | Map Section 5 |
| X-F2 Proxy | open | **OPEN** (N-05) | |
| X-F3 source overstatement | open | **OPEN** (release gate) | N-09 |

## 6. Cross-domain authorizers (who may approve a charge or an install)

| Authorizer | Domain | Charges? | Can write installed state? | Notes |
|---|---|---|---|---|
| `DroidCustomizationEngine` | Droid | via TransactionEngine | yes (sole post-creation) | confirmed-ledger removal |
| `VehicleInstallationService` | Vehicle | via TransactionEngine | yes (sole sealed ledger) | canonical |
| `VehicleCustomizationEngine` | Vehicle | via TransactionEngine | yes, **legacy field** | non-canonical only |
| `UpgradeService` vehicle branch | Vehicle | **no** | yes, **legacy field** | N-01 |
| `VehicleTransactionService.approveTransaction` | Vehicle | **no** | yes via ActorEngine | unreferenced (N-07) |
| `StoreAcquisitionService` | shared | no (ownership only) | relationships | |
| Store checkout `compile*MutationPlans` | shared | yes | creates Actors via factories | |

## 7. Source certification / decision backlog (separate from code work)

| ID | Question | Status | Who decides |
|---|---|---|---|
| DROID-RD-001/-002/-003, SGD-HOST-002 | fitting hosts, Stabilized Mount, Workshop cap | `DEFERRED_RULES_REVIEW` (in `docs/audits/swse-rules-decisions-pending.md`) | project owner |
| F3 | Droid follower 0 HP / ion outcome | needs printed Core ch. VIII/XI pages; **not settled by any file I can read** | owner after source |
| G5 | four Heuristic Processor construction defaults | rules grant; do not remove/extend without source | owner |
| Store per-model status | how to list the 234 models without constructed claims | decision needed | owner |
| Custom (unpublished) vehicles | support boundary, price/EP policy, trust level | **no ruling on file** | owner |
| Vehicle silent arcs | GM-adjudicated vs unrestricted | policy | owner |
| SotG strict certification | 100 outstanding (inherited) | source work | owner/source |
| Vehicle errata/crossbook | target pages | C5 | source work |
| Droid 99 PASS / 23 HOLD | unchanged; never promote | | |

## 8. Suspected dead paths and negative reachability evidence

| Path | Evidence (static) | Not ruled out | Verdict |
|---|---|---|---|
| `infrastructure/hooks/assets-hooks.js` | no importer; not in index/esmodules; `follower` actor type does not exist; `purchasedBy` never written | dynamic auto-loader | C4 candidate (N-03) |
| `domain/vehicles/vehicle-transaction-service.js` | name and class appear nowhere else | dynamic import by string built at runtime | C4 candidate (N-07) |
| `apps/vehicle-modification-manager.js` | importer-free; one test pins its text | same | C5 -> C4 after test change (N-08) |
| `VehicleInstallationService.install` alias | not re-verified by me | | C5 |
| Retired droid modules (builder app, conversion dialog, modification factory, transaction service, slot governance, system-definitions) | deleted in 1d09d42; `tests/droid-dead-surface-removed.test.mjs` pass | computed imports; Foundry app registration | C4 (draft) |

## 9. Zero-confidence gaps (explicitly not traced)

Organic creation/level-up internals; `VehicleFactory` legacy `stockShip` build; GM Store dashboard and `GMApprovalOperationsService` paths; `store-checkout.js` draft-vehicle approval (`:1416-1472,1531-1562`, input S-07); `damage-resolution-engine` indirect callers; V13 hook ordering/registration; crew combat modifiers; ammunition edge cases; 258 SotG attack-group records; all Foundry runtime behavior.

## 10. Full 72-row re-verification table

