# TI4-A — Report-Only Authority Inventory (tool and artifacts)

**Status:** report-only. Nothing described here blocks a write, intercepts a call, changes an authority, or alters a balance. Evidence is `SOURCE_VERIFIED` (static analysis of the named source heads) and `TEST_VERIFIED_L1` (offline analyzer tests). No Foundry runtime claim is made.

## 1. What was built

| Artifact | Path | Purpose |
|---|---|---|
| Analyzer library | `tools/lib/ti4-authority-inventory.mjs` | lexer + classifier; pure functions; never writes files |
| Configuration (data) | `tools/lib/ti4-authority-config.mjs` | protected field families, authority files, documented exceptions, Phase 0 census file lists |
| CLI | `tools/ti4-authority-inventory.mjs` | runs the analyzer on a checkout; writes JSON + Markdown artifacts; validates artifacts |
| Offline tests | `tests/ti4a-authority-inventory.test.mjs` (22 checks) + `tests/fixtures/ti4a/scripts/**` (synthetic) | proves behavior; included automatically in the rolling suite |
| Baseline artifacts | `docs/audits/transaction-integrity/ti-4/baseline/ti4a-inventory-*.{json,md}` | the inventory at three exact source heads |

```
node tools/ti4-authority-inventory.mjs [--root <dir>] [--source-ref <label>] [--out-json <f>] [--out-md <f>] [--quiet]
node tools/ti4-authority-inventory.mjs --check-artifact <file.json>
```

Exit codes: **0** analysis completed (reported writers never change this), **1** a malformed artifact in `--check-artifact`, **2** an execution error (bad root, unreadable/unparseable file). There is no `--strict` mode in TI4-A; a blocking ratchet belongs to a later, independently authorized checkpoint.

## 2. What a record means

Each record is `{ id, file, line, col, family, kind, form, authority, matched, expression, classification, note }`.

**Kinds**

| Kind | Meaning |
|---|---|
| `direct-writer` | a write-intent on the family's field: object-payload key (`{'system.credits': v}`), bracket assignment (`u['system.credits'] = v`), property assignment (`x.system.credits = v`, `+=`, `++`), `setFlag/unsetFlag` of the family's flag, or a settings write of the family's setting |
| `delegated-call` | a call to the family's authority API (the write is delegated; the call site is reported, **not judged**) — only mutating methods are listed in the config |
| `unresolved-use` | a protected path/key used in a form the analyzer cannot classify (alias, argument to an unknown callee, embedded in a longer string). Surfaced so it cannot hide a mutation |

Read-only references (property reads, `getFlag`, `getProperty`, comparisons) are **counted per family** (`readReferences`) and are never writers.

**Classification** (assigned per `(file, family)`, in this precedence)

| Value | Meaning |
|---|---|
| `AUTHORITY_INTERNAL` | the file implements the family's authority (config `authorityFiles`) |
| `DOCUMENTED_EXCEPTION` | the Phase 0 audit explicitly classified this `(file, family)` as intentional/manual/compat; the record is still emitted with its reason; **no runtime authority is granted** |
| `PHASE0_INVENTORIED` | the file is named in the accepted Phase 0 audit for that family |
| `UNCLASSIFIED` | none of the above — newly discovered relative to Phase 0 |

`UNCLASSIFIED` **direct writers** are the explicit "unclassified writers" list. `UNCLASSIFIED` **delegated calls** (a caller outside the census calling an authority) are reported as informational callers, not as writers. `PHASE0_INVENTORIED` means "named by the audit", not "approved" or "correct".

### 2b. Coverage and known-unobserved fields in every artifact

Each artifact also carries `coverage` (per family: `inventoryComplete` — always `false` — and `ratchetCoverage` = `KNOWN_GAPS`/`LOWER_BOUND`) and `knownUnobserved` (audit-verified writers the analyzer cannot see, each self-verified against the scanned tree). See `ti4a-static-analysis-coverage-and-limitations.md` §2b. At all three baseline heads `actionEconomy`, `equipmentState` and `forcePoints` are `KNOWN_GAPS`.

## 3. Protected field families (configuration)

| Family | Protected fields (patterns) | Authority API reported as delegated |
|---|---|---|
| `credits` | `system.credits` | `TransactionEngine.execute{Mutation,CreditAdjustment,CreditTransfer,AssetCustomization,AssetApproval,Sale,RollbackCorrection}*`, `LedgerService.buildCreditDelta` |
| `forcePoints` | `forcePoints.value`, `bonusForcePoints` (flag/path) | `ActorEngine.spendForcePoints/gainForcePoints` |
| `ammunitionFireState` | `ammunition.current`, `flags.*.fireState` | `AmmoSystem.{consumeAmmunition,rollbackSpend,setAmmunition,reloadWeapon,spendForWorkflow}`, mutating `FireStateStore.*` |
| `actionEconomy` | `flags.*.actionEconomy` | `ActionEconomyConsumption.spend`, mutating `ActionEconomyPersistence.*` |
| `equipmentState` | `weaponPosture`, `weaponOccupancy`, `equipmentTxn` | `executeEquipmentIntent`, `InventoryEngine.requestWeaponPosture` |
| `upgradeModificationState` | `installedUpgrades`, `installedSystems`, `flags.*.customization` | `UpgradeService.{apply,remove}Upgrade`, `InstallRemoveEngine.*`, `LightsaberConstructionEngine.attemptConstruction` |
| `progressionEntitlements` | `levelUpEntitlementManifest`, `progressionHistory` | `ProgressionFinalizer.{finalize,finalizeSingleStep,resyncPostApplyState}`, `ActorEngine.applyProgression` |
| `ownershipFollowersAssignments` | `flags.*.followers`, `followerSlots` | `AllyAssignmentService.*`, `FollowerSlotService.{reserve,release,grant,revoke}*`, `runFollowerMutationTransaction`, `FollowerCreator.*FromMutation` |
| `gmApprovalState` | `storeAcquisition`; settings `pendingCustomPurchases`, `pendingSales` | `GMApprovalOperationsService.{approve,deny,reject}*` |

The families are exactly the nine required by the TI4-A directive. The config is data, versioned (`ti4a-authority-config/1`), and changing it is a reviewed change.

## 4. Artifacts at the three exact source heads

| Artifact | Source head | Files scanned | Records | Direct writers | Delegated calls | Unresolved | UNCLASSIFIED writers | Informational callers |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `ti4a-inventory-main-4392c90` | `main` `4392c90dc324a0474e9ca470c514f4ec1a8fcc37` (equals the TI4-A branch's `scripts/`) | 2,227 | 374 | 157 | 163 | 54 | 22 | 72 |
| `ti4a-inventory-lineageA-ti1-abb81d9` | #1059 `abb81d9191a1852709c96c8b89be65a7ba9a09b1` (equipment + TI-1) | 2,244 | 400 | 161 | 170 | 69 | 22 | 71 |
| `ti4a-inventory-lineageB-ti3-4e51a15` | #1061 `4e51a15654adddae27da7e8a9ca1dda735771dd4` (TI-2 + TI-3) | 2,227 | 374 | 156 | 164 | 54 | 21 | 73 |

The two lineages were analyzed **in place** from their own worktrees (clean, at the stated heads). They were not merged, rebased, cherry-picked or combined. Re-running the CLI on the same head produces a byte-identical artifact (`cmp` verified; the offline test verifies determinism on a fixture tree).

Per-family tables and the full unclassified lists are in the `.md` beside each `.json`. Classification of each unclassified writer and the comparison against the Phase 0 census are in `ti4a-baseline-classification-and-exceptions.md`.

## 5. How the guard is used (and is not)

- **Used for:** producing a reproducible inventory; diffing two heads; showing a reviewer exactly which direct writers exist and which are not yet classified; seeding a future ratchet baseline.
- **Not used for:** blocking, gating merges, failing CI on a reported writer, runtime interception, or authorizing any writer.
- **CI behavior:** the new offline test runs in the rolling suite. It fails only if the analyzer itself is broken, the committed baseline artifacts are malformed (including an overstated coverage claim), or the live-tree analysis cannot produce a well-formed deterministic artifact. It never compares the live tree to the baseline, so adding a writer does not fail CI.
