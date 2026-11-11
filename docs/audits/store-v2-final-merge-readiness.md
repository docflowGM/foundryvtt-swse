# Store V2 — Final merge-readiness report

- PR: docflowGM/foundryvtt-swse#1143 (draft; not merged)
- Branch: `claude/busy-wright-dudbyz`
- Code head evaluated: `c82f9fa67992033165bf3165d40bbb887dec3194` (this report is committed on top of it; documentation only)
- Previous reviewed head: `8fcc5e5d75be87fccdf2c331df8aab296eaf27ee`
- Status vocabulary: CODE_COMPLETE / OFFLINE_TESTED / RUNTIME_UNVERIFIED / FOUNDRY_TESTED. **Nothing in this PR is FOUNDRY_TESTED.** No Foundry V13 runtime exists in the build environment (no install, no licence, no world); no live result below is claimed.

## Post-merge update
- PR #1143 was merged into `main` as `33ce3f7622ca5ac458a36d13d0fd941e782cda07` (head `8e3d5e8`), at the project owner's instruction. Exact-head CI at `8e3d5e8`: native-vehicle-packs, targeted, provenance and Rolling system validation all **success**.
- The project owner then reported that **Foundry V13 acceptance is green**. This is an owner-reported result: the per-item results for checklist sections A-M were not supplied to this session, so they are not transcribed here and were not independently observed by the author of this report. Record the per-item results beside each checklist entry to make them traceable.
- Gates below change from UNVERIFIED to **PASS (owner-reported)**: Foundry V13 acceptance, ledger/permission boundary (K), concurrency (M), live former-owner access removal (L5), exact-head CI. Performance (H) is covered only if the owner recorded timings.
- Decision: **GO - merged; FOUNDRY_TESTED on the owner's report.** The documented design limits below (client-local locks, owner-writable `system.credits`) still stand.

## Decision at time of merge (historical): **NO-GO** (runtime acceptance only)
All offline gates pass and no code blocker is known, but financial and asset-ownership changes of this scope require the live Foundry V13 acceptance in `store-v2-foundry-acceptance-checklist.md` (sections A–M). The next step is runtime acceptance, not another architecture phase.

## Scope S0–S9 (summary)
S0 audit/authority ledger · S1 index-first catalog (exact `<pack>.<docId>` ids, on-demand hydration) · S2 strict quotes (typed cost registry, no fail-open) · S3–S4 vehicle new/used pricing · S5 stock-droid certification · S6 legacy retirement · S7 Droid/Vehicle delivery · S8 consolidation/performance (single query predicate, deletions) · Build-a-Droid lifecycle (shared quote authority, GM approval, one-shot launch token) · S9 resale (acquisition provenance by lot, canonical vs GM appraisal, whole-asset sale, recovery).

## Architecture (authorities)
Catalog: Store catalog index (`store-catalog.js`) · Item pricing: typed cost registry + GM policy · Vehicles: published new/used authorities · Droid build: `droid-build-quote.js` · Ships: existing CustomVehicleConstructionService · Purchase: StoreEngine → TransactionEngine · Credits/ledger: LedgerService/TransactionEngine (ledger at `flags.foundryvtt-swse.transactions`) · Acquisition: per-asset ledger line (`lotId`) · Item resale: ResaleService/resale-authority · Asset resale: GM appraisal + TransactionEngine · Mutations: ActorEngine. No shadow ledger or migration was added.

## Fixes in this pass (all OFFLINE_TESTED)
1. **Reconcile hardened** (`TransactionEngine.reconcileAssetSale`): PAID needs record id/Success/Sell/asset-sale context/owner/asset/payout/wallet transition + consistent wallet + seller unlinked + no player access + no conflicting linker/sale; UNPAID needs no record + wallet at pre-sale value + still linked + relationship as recorded + original ownership recorded, then **verified** restoration. Else `unresolved`, `needsReconciliation`, `reconciliationReasons`. Per-asset lock.
2. **BLOCKER found and fixed: ownership was never removed.** Foundry merges `ownership` updates; the old disposition left the seller's `player:3` in place. Now `-=key` deletions (and the same for undo); restoration verified by exact ownership map; a failed revert re-asserts the `sale-pending` marker.
3. **Ledger trust boundary — determined, not assumed.** Code review: no `preUpdateActor` guard, socket, or GM-executor protects `flags.foundryvtt-swse.transactions` or `system.credits`; Foundry gives an OWNER write access to their own Actor. A player can therefore forge a purchase/ledger record, edit `system.credits`, or edit `acquisition` flags directly (RUNTIME_UNVERIFIED: K1–K5 must confirm with real clients). Correction: automatic player-executed credit creation is **closed** (`AUTOMATIC_CREDIT_CREATION_TRUSTED=false`, not a setting; commit boundary refuses `store-sale`). All sales are GM decisions; the GM evidence text states the ledger lives on the seller's Actor. No second ledger and no client-side secret was introduced.
4. Legacy `system.price` / `item.cost` / `item.price` price fallbacks removed (`store-shared.js`, `store-engine.js`).

## Concurrency (reviewed; not overstated)
Locks (`_mutationLocks`, `_creditReconciliations`) are **client-local**. Protections that do span clients: request-id replay check in the owner's ledger, transaction ids, per-lot disposal accounting, asset `sale-pending` marker, fresh-state re-derivation at commit, snapshot-first recovery. Not guaranteed: two clients committing the same purchase/approval inside the same sub-second propagation window (credits are written as absolute values; no server compare-and-set exists). Mitigation by design: every credit-creating operation (all sales, reconcile) is GM-executed; player purchases remain player-executed (double-click is locally guarded). Exactly-once across clients is a **documented limitation**, to be characterised by M1–M3.

## Tests (current code head)
- Full Node suite: 674 pass, 5 fail. The 5 failures are the pre-existing Force-power baseline (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`), unchanged and unrelated to Store files. No Store-related failure.
- `store-v2-*` (all), `ti2-commerce-integrity`, `ti4c0-g24-pending-sale-identity`: pass. `store-v2-s9-resale-authority`: 15 checks incl. reconcile negatives (unrelated record, wrong asset/owner/payout/wallet, link, player access, conflicting transfer/sale, partial restoration, permission-restoration failure, replay, concurrent reconcile, interruption points) and transaction-wide lot allocation.
- Validators: `validate-partials`, `validate-data`, stock-droid certification (194/194), `validate-modification-registry`, `check-shell-mutation-contract`, `check-mutation-paths.sh`: pass. `scripts/validate-store.mjs`: 1 pre-existing failure ("Shell template references raw price fields too frequently"), identical on baseline. eslint `no-undef`: 0 errors on changed files.
- All of the above use stubs for ActorEngine/SnapshotManager/Foundry globals: OFFLINE_TESTED only.

## CI at `c82f9fa` (checked via GitHub)
native-vehicle-packs: success · targeted: success · provenance: success · Rolling system validation: **in progress at time of writing** — must be green before merge.

## Merge gates
| Gate | Result | Evidence |
|---|---|---|
| Offline Store/transaction tests | PASS | 674/679 files pass; only the 5 baseline Force failures |
| Validators / lint | PASS | see Tests (1 pre-existing validate-store failure, same on baseline) |
| Asset-sale recovery & reconcile logic | PASS (offline) | s9 test §8; stubs only |
| Former-owner access removed | PASS (offline) / UNVERIFIED live | merge-semantics fake proves `-=` deletion; L5 live |
| Ledger/permission boundary | UNVERIFIED | code review says owner-writable; automatic credit creation closed; K1–K7 live |
| Cross-client concurrency | UNVERIFIED | documented limitation; M1–M3 live |
| Exact-head CI | UNVERIFIED | 3 of 4 checks green; Rolling system validation pending |
| Foundry V13 acceptance (A–M) | UNVERIFIED | no runtime available; checklist ready, nothing fabricated |
| Performance vs baseline | UNVERIFIED | H section; offline filter timing only |

## Known limitations / deferred (non-blocking)
Table-trust boundary for `system.credits` and purchases (pre-existing; owner-writable by Foundry design); sub-second cross-client races; Suggestion scoring unchanged; chassis-only delivered Store droid sheet needs owner review; `DROID-BUILD-001` awaiting owner ruling; `autoAcceptItemSales` setting is now inert (can be removed in a follow-up).

## Remaining before GO
1. Rolling system validation green at the final head. 2. Execute checklist sections A–M in a disposable V13 world (GM + Player A + Player B), recording results beside each item. 3. Re-review any deviation from K1–K7, L1–L5, M1–M3 as BLOCKER.
