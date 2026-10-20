# TI4-A — Baseline Classification and Exceptions

Evidence: the three artifacts under `baseline/` (exact heads in `ti4a-report-only-authority-inventory.md` §4). All numbers below come from those artifacts. `SOURCE_VERIFIED` unless marked. **Dispositions in §5 are proposals for independent review; the analyzer's own classification of each record is unchanged (`UNCLASSIFIED`) until a reviewed config change.**

## 1. Totals by protected family (lineage A tip `abb81d919`; B and main differ as noted)

| Family | Direct writers | of which authority-internal / documented exception / Phase 0 / **UNCLASSIFIED** | Delegated calls | Unresolved uses | Read refs |
|---|---:|---|---:|---:|---:|
| credits | 29 | 7 / 3 / 18 / **1** | 54 | 7 | 13 |
| forcePoints | 59 | 4 / 4 / 45 / **6** | 34 | 9 | 26 |
| ammunitionFireState | 6 | 6 / 0 / 0 / **0** | 32 | 6 | 8 |
| actionEconomy | 0 | 0 / 0 / 0 / **0** | 14 | 0 | 0 |
| equipmentState | 3 | 3 / 0 / 0 / **0** | 2 | 13 | 38 |
| upgradeModificationState | 22 | 7 / 0 / 12 / **3** | 3 | 16 | 167 |
| progressionEntitlements | 8 | 3 / 0 / 2 / **3** | 7 | 9 | 28 |
| ownershipFollowersAssignments | 17 | 8 / 0 / 1 / **8** | 22 | 8 | 101 |
| gmApprovalState | 17 | 5 / 0 / 11 / **1** | 2 | 1 | 52 |
| **Total** | **161** | 43 / 7 / 89 / **22** | **170** | **69** | 433 |

Note: the row sums reproduce `totals` in the artifact (161 direct writers, 22 UNCLASSIFIED, 170 delegated, 69 unresolved). The authority-internal, exception and Phase 0 columns sum to 139 (= 161 − 22).

| Tree | Direct writers | Delegated calls | Unresolved | UNCLASSIFIED writers | Informational callers |
|---|---:|---:|---:|---:|---:|
| main `4392c90` | 157 | 163 | 54 | 22 | 72 |
| lineage A `abb81d9` | 161 | 170 | 69 | 22 | 71 |
| lineage B `4e51a15` | 156 | 164 | 54 | 21 | 73 |

Differences between trees are explained by the production changes each lineage contains: lineage A adds the equipment coordinator/journal, `fire-state-store` changes, the Force Point receipt/transaction modules and TI-1 call-site rewiring (more delegated calls, `equipmentState` records appear); lineage B removes one direct credit writer (§5 row 10) and adds the TI-2/TI-3 call sites. Lineage B has no `equipmentState` records because the coordinator is not on that lineage.

## 2. Reconciliation with the accepted Phase 0 census (differences investigated, not forced to agree)

| Phase 0 reference (`ti4-authority-inventory.md`) | Analyzer result | Reconciliation |
|---|---|---|
| **29 inline `ActorEngine.spendForcePoints(` call sites** outside the Force Point authorities (31 literal occurrences in 15 files incl. coordinator and transaction) | lineage A: **31** `spendForcePoints` delegated calls, **2** authority-internal, **29** outside, in **13** files | **Exact agreement.** On `main` and lineage B the count outside authorities is **30**: `combat/rolls/enhanced-rolls.js` has two inline spends there and one on lineage A, because TI-1 moved the attack-roll Force Point spend into `force-point-transaction.js`. |
| **~31 absolute Force Point writers in 10 files** (`forcePoints.value = current-1`): `DarkSidePowers` 6, `talent-effect-engine` 15, `dark-side-devotee-mechanics` 1, `sith-talent-actions` 1, `weapons-engine` 1, `reaction-engine` 1, `combat-executor` 2, `threshold-engine` 2, `reaction-registry` 1, `active-adapter` 1 | the same 10 files in the same counts, except **`weapons-engine.js` = 2** | **Agreement, +1:** `weapons-engine.js:391` (`system.forcePoints.value`) and `:392` (`system.resources.forcePoints.value`) are two paths of one logical write (the legacy mirror path). 31 logical writers reproduce. |
| 6 manual/refill FP writers (`swse-actor-base` 302/345, `character-like-sheet` 6012/6035, `GMWorkspaceSurfaceController` 396, `data/force-points` 345, `follower-species-materialization-hotfix` 237, `actor-sheet-base` 1949) | all present (`DOCUMENTED_EXCEPTION`: `character-like-sheet` 6012/6035, `GMWorkspaceSurfaceController` 396; `PHASE0_INVENTORIED`: the rest) | **Agreement.** `character-like-sheet.js:639` also matches but is a coercion type map (false positive, L8). |
| 6 bonus-pool whole-object writers (`force-executor` 652/688, `force-point-feat-actions` 151, `jedi-prestige-talent-actions` 113, `force-adept-talent-actions` 112/260) | the same 6 sites, plus authority-internal `force-point-spend-receipt.js:90` and `actor-engine.js:2075`, plus `character-like-sheet.js:1425` (exception) | **Agreement.** |
| 4 direct action-economy `ActionEconomyPersistence` callers bypassing `spend` (`action-economy-bindings.js:138`, `condition-track-feat-actions.js:99`, two `resetTurnState` callers) | 4 delegated calls to `ActionEconomyPersistence` in the same 4 files | **Agreement.** |
| `actionEconomy` raw `actor.setFlag` write (`action-economy-persistence.js:152`) | **0 direct writers recorded** | **Analyzer false negative (L1):** the key is `this.FLAG_KEY`, not a literal. The Phase 0 claim stands. |
| Direct credit writers (Phase 0 P33 list) | 29 credits direct writers: 7 authority-internal (`transaction-engine.js`, `ledger-service.js`), 3 documented exceptions (`character-like-sheet.js:635,5981`, `actor-sheet-base.js:1948`), 18 Phase 0-named, **1 UNCLASSIFIED** | agreement on the 28; the 1 is `follower-droid-garage-hotfix.js:131`, see §5 row 10 |
| 63 mapped paths / 14 domains | not comparable: the analyzer inventories *write sites by protected family*, not paths | no claim made |

**Discrepancy in the Phase 0 text found by this investigation** (recorded here; the accepted Phase 0 files are not modified): `ti4-authority-inventory.md` §3 / the gap register described `patches/follower-repeatable-entitlement-hotfix.js` as "GM-gated at `ready` and uses `ActorEngine`". Reading the file shows `ActorEngine.updateEmbeddedDocuments` for the Item update (`:158`) but a **direct `actor.setFlag('foundryvtt-swse','followerSlots', nextSlots)` at `:170`**. (lines as read on lineage B) The hotfix's `ready` hook is GM-gated (`:265-266`), but the `renderApplicationV2` hook that calls `queueRepair` is not (`:260-263`); the flag write runs on whichever client queues the repair. This is an additional ownership/followers direct writer, not a different conclusion about the audit.

## 3. Exceptions (documented, emitted, grant nothing)

Config `EXCEPTIONS` — each entry is a `(file, family)` pair with its reason; the matching records remain in the artifact marked `DOCUMENTED_EXCEPTION` with the note.

| File | Family | Reason (from Phase 0) | Records on lineage A |
|---|---|---|---:|
| `sheets/v2/character-like-sheet.js` | credits | player/GM manual "add credits" control (P33); **no role check recorded — classified, not endorsed** | 2 |
| `sheets/v2/character-like-sheet.js` | forcePoints | manual FP +/- buttons (P14) | 3 (incl. false positive :639) |
| `sheets/v2/actor-sheet-base.js` | credits | manual reset (P33) | 1 |
| `ui/shell/gm/controllers/GMWorkspaceSurfaceController.js` | forcePoints | GM workspace manual FP edit (P14) | 1 |
| `engine/crafting/phase-3-advanced-crystal-system.js` | equipmentState | free crystal activation via `InventoryEngine.setActivated` (P02) | 0 (family does not match its fields, L10) |

An exception is a statement that the audit knew of the site. It is **not** an approval and **not** an authorization; the OD-1 risk matrix and any later enforcement decision may reclassify any of them.

## 4. Analyzer calibration performed (so the baseline can be trusted)

Three defects were found by comparing against Phase 0 and by reading flagged lines, and fixed before the baseline was recorded:

1. **Path with a prefix inside a string** (`'system.forcePoints.value'`) was treated as an embedded fragment, so real payload keys were reported as `unresolved-use`. Fixed: a string that is one dotted path containing the fragment is an exact path.
2. **Optional-call callee** (`actor.getFlag?.('swse','bonusForcePoints')`) lost its name, so a read was reported as unresolved. Fixed.
3. **Local bindings** (`const installedSystems = …`, parameters) were reported as field assignments: **30 false positives** removed. Fixed: a property write needs a preceding `.`.

Plus two scope refinements: authority-call patterns for `FireStateStore` and `FollowerSlotService` were narrowed to mutating methods (read-only getters were wrongly counted), and delegated calls from non-census files are reported as informational callers, not as unclassified writers.

## 5. Proposed dispositions for the 22 UNCLASSIFIED direct writers (lineage A; main identical; lineage B = 21)

Vocabulary: **NEW_REAL** = a genuine direct writer not named by Phase 0 (needs owner classification: authority-internal, exception, or a gap); **PLAN_BUILDER** = writes into a mutation plan applied by a known authority (the document write happens in that authority's path); **FALSE_POSITIVE** = lexical lookalike (L8); **ADAPTER** = returns a payload used by callers.

| # | Record(s) | Family | Proposed disposition | Notes |
|---|---|---|---|---|
| 1 | `apps/minion-creator.js:419` `ownerActor.setFlag(SYSTEM_ID,'followerSlots',slots)` | followers | **NEW_REAL** | not named by Phase 0; a direct slot write outside `FollowerSlotService` |
| 2 | `progression-economy-plan-builder.js:304,389` `set['flags.swse.progressionHistory']` | progression | PLAN_BUILDER | applied through `ProgressionFinalizer._applyMutationPlan` (P48) |
| 3 | `progression-economy-plan-builder.js:318,366` and `progression-finalizer.js:1496,1558` `set['system.forcePoints.value']` (starting/next FP max) | forcePoints | PLAN_BUILDER | progression grants FP maximum at creation/level-up; not a spend |
| 4 | `progression-metadata-plan-builder.js:154` `levelUpEntitlementManifest` | progression | PLAN_BUILDER | same path |
| 5 | `apps/progression-framework/steps/attribute-step.js:407` `SettingsHelper.set('pendingCustomPurchases', …)` | gmApproval | **NEW_REAL** | a progression step enqueues a GM approval request (species attribute override) with a read-modify-write of the shared queue; not named by Phase 0; outside `GMApprovalOperationsService` |
| 6 | `domain/droids/droid-converted-system-reconciliation-service.js:280` | upgrade/modification | PLAN_BUILDER | reconciliation repair plan (Phase 0: the reconciler has no UI caller) |
| 7 | `domain/droids/droid-modification-factory.js:354`, `domain/vehicles/vehicle-modification-factory.js:220` | upgrade/modification | PLAN_BUILDER | applied through the customization transaction (P23) |
| 8 | `domain/followers/follower-talent-detach-plan.js:56,61` | followers | PLAN_BUILDER | consumed by follower hooks auto-detach (P59) |
| 9 | `patches/follower-orphan-transfer-hotfix.js:99,100,225,226` `owner.setFlag('foundryvtt-swse','followerSlots'|'followers')` | followers | **NEW_REAL** | GM-checked in the reassignment paths (`:243`, `:318`) but writes flags directly, outside the follower authorities; not named by Phase 0 |
| 10 | `patches/follower-droid-garage-hotfix.js:131` `'system.credits': creditsAfter` | credits | **NEW_REAL on `main`/lineage A; removed on lineage B** | the patch carried its **own** second credit write plus an audit flag (a parallel mini-ledger); TI-2 (`903269083`) replaced it with a call to the commerce authority — absent from lineage B (verified: no `system.credits` in the file there) |
| 11 | `patches/follower-repeatable-entitlement-hotfix.js:170` `actor.setFlag('foundryvtt-swse','followerSlots', nextSlots)` | followers | **NEW_REAL** (+ Phase 0 correction, §2) | runs on the client that queues the repair |
| 12 | `sheets/v2/character-sheet/form.js:117` | forcePoints | **FALSE_POSITIVE** | `'system.forcePoints.value': 'number'` coercion map (L8) |
| 13 | `utils/schema-adapters.js:298` `setForcePointsUpdate` | forcePoints | ADAPTER | returns `{ 'system.forcePoints.value': v }`. **Indirection finding:** four callers write Force Points through it — `engine/talent/consular-talent-actions.js:206,213` and **`engine/force/force-engine.js:33,53`** — and `force-engine.js` is **not named in the Phase 0 census**. The analyzer reports the adapter, not those callers (L2/L3-style indirection), so these four writers appear nowhere in the inventory by caller. |

Counts: NEW_REAL 7 records (minion-creator 1, attribute-step 1, orphan-transfer 4, repeatable-entitlement 1) + 1 credits record that is real on two heads and removed on lineage B; PLAN_BUILDER 12 records; FALSE_POSITIVE 1; ADAPTER 1. Total 22.

### 5.1 Previously known versus newly discovered

| | Records (lineage A) |
|---|---:|
| Direct writers named by Phase 0 (authority-internal + exception + Phase 0 census) | 139 |
| Newly discovered by the analyzer (UNCLASSIFIED) | 22 |
| — of which genuine, not-in-Phase 0 direct writers needing classification | 8 records (7 + the hotfix credits record) |
| — plan builders, false positive, adapter | 14 |
| Additional indirect Force Point writers found by investigation (via `SchemaAdapters.setForcePointsUpdate`) | 4 sites, not recorded by the analyzer |

## 5b. Known-unobserved writers and certification limits (independent review correction 1, R3)

The baseline does not treat `actionEconomy`, `equipmentState` or the Force Point writer list as fully inventoried. The artifacts record the following audit-verified blind spots as machine-readable, self-verified entries (`knownUnobserved`) and set the three families to `KNOWN_GAPS`:

- **KU-AE-1** — the real action-economy flag write (`ActionEconomyPersistence`, `this.FLAG_KEY`, lines 152 and 180) is invisible to the analyzer; the family shows **0 direct writers** although its authority writes the flag.
- **KU-EQ-1/2/3** — equipment readiness/activation and equip state (`system.activated`, `system.active`, `system.equipped`, shield `currentSR`/`charges.current`) are outside the configured equipment patterns.
- **KU-FP-1** — four Force Point writers go through `SchemaAdapters.setForcePointsUpdate` (formerly noted only in prose in §5 row 13).

Certification limits: no family may be called completely inventoried; a future ratchet may claim only "no new recognized-form writer relative to this baseline"; an artifact claiming completeness is malformed. Full detail: `ti4a-static-analysis-coverage-and-limitations.md` §2b. The unclassified-writer counts in §1 and §5 are unchanged by this correction (record sets are identical; only `coverage` and `knownUnobserved` were added to the artifacts).

## 6. Unresolved uses

69 on lineage A (54 on main/B). They are surfaced, not judged. Seventeen files outside the census carry an unresolved use (listed in each baseline `.md`). Representative classes: field-path lists and schema/validation tables (`progression-finalizer.js:82`, `form.js:253`, `npc-sheet-helpers.js:1120,1146`, `resource-editor.js:147`), log or deprecation messages containing the path, and `unknown-callee` argument forms. None was converted into a writer or dismissed.

## 7. What this baseline is for

A reviewer can use it to (a) see every recognized direct writer of a protected family at three exact heads, (b) review the 22 dispositions once, and (c) later decide a ratchet over **new** records. It does not establish that no other writer exists (`ti4a-static-analysis-coverage-and-limitations.md`).
