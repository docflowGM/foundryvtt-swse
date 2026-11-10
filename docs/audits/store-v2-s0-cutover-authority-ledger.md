# Store V2 — S0 Authority Ledger and Clean-Break Master Handoff

**Repository:** `docflowGM/foundryvtt-swse` · **Baseline:** `main` @ `c19e0a4d7a98abbd3d5e3ce5c06c9f3895f93c27` (verified unchanged at audit time; HEAD of working branch `claude/busy-wright-dudbyz` was the same commit before this work).
**Method:** static source inspection plus offline Node tests. **No Foundry V13 runtime session was available. Nothing here is `FOUNDRY_TESTED`.**
Evidence labels: **[V]** verified in source, **[I]** inference from source, **[?]** unresolved/needs runtime.
Machine-readable table: `store-v2-s0-coverage.json`.

## 1. Executive assessment

The Store is a partly-V2 system: an AppV2 shell surface (`scripts/ui/shell/StoreSurfaceController.js`, `StoreSurfaceService.js`, `scripts/apps/store/store-main.js`) over a legacy-shaped catalog pipeline (`scripts/engine/store/{loader,normalizer,categorizer,index,compendium-schema,cost-registry}.js`). The transaction layer (`StoreEngine` → `TransactionEngine` → `ActorEngine`, purchase lock, compensation, vehicle pre-debit eligibility) is sound and is retained. The catalog pipeline guesses identity, category and price and must be replaced (S1). The earlier roadmap's findings X01–X19 were re-checked; corrections are in §8.

## 2. Baseline

- Working branch `claude/busy-wright-dudbyz`, cut from `main` c19e0a4. No unrelated uncommitted work. [V]
- Open PRs / other branches: only `main` and this branch exist locally and on `origin`. [V]

## 3. Domain authority maps (sole authority per field)

| Domain | Identity | Classification | Cost / availability | Creation | Postcondition |
|---|---|---|---|---|---|
| Weapons / armor / gear | source Item UUID + `flags.swse.canonicalWeapon` (weapons) | item `type` + domain resolvers (`resolveArmorData`, weapon runtime) | source `system` economics; GM overlay in `policy-service.js` | `createItemPlans` keeps full source doc (tested: `tests/store-v2-purchase-integrity.test.mjs`) | **absent** (no parity check after add) |
| Vehicles | `VehiclePackDataLoader` source entry key | published category; runtime projection | `getVehicleConditionCost`, `evaluateVehicleMerchantPurchase` | `VehicleFactory` plans via `createVehiclePlans` (pre-debit) | partial (tests p5) |
| Stock droids | **no certified identity** — `index.js` ranks by "statblock quality" | `categorizer.js` degree/regex | `finalCost` from store index | `DroidFactory` + `StockDroidNormalizer` (refuses on failure) | none |
| Build Droid | progression builder (`buildDroidWithBuilder`, `launchNewProgression`) | — | front door checks a minimum credit amount only | builder finalizer | **no verified final quote at charge** [?] |
| Build Ship | `CustomVehicleConstructionService`, `ship designer` (`construction-designer-ui.js: openShipDesigner`) | certified frames | service quote, GM approval/funding | service delivery | service-owned |
| Modifications | `data/modifications/status-ledger-v1.json` | registry | per-domain installers | `modification-install-service.js`, `vehicle-installation-service.js`, droid customization | ledger |

## 4. Store consumer inventory and classification (C1–C5)

| Path | Role | Class | Disposition |
|---|---|---|---|
| `store/store.js` (`SWSEStore extends FormApplication`) | direct `actor.update` credits; unregistered; template `templates/apps/store.html` absent; settings under wrong namespace | **C4 → DELETED in this branch** (grep: zero importers, not in `system.json`) | DELETE ✔ |
| `scripts/engine/store/store-engine.js` | purchase orchestration | C1, hardened | KEEP; 5% tolerance + fail-open removed ✔ |
| `scripts/engine/store/transaction-engine.js` | credits/rollback authority | C1 | KEEP |
| `scripts/engine/store/placement-router.js` | used by `transaction-engine.js:1984` | C1 (reachable) | KEEP (audit X18 "if unused" does not apply) |
| `scripts/engine/store/loader.js` | `pack.getDocuments()` per subtype; persistent `localStorage` cache; `LEGACY_CACHE_KEYS` purge | C2/C3 | REPLACE (S1) |
| `scripts/engine/store/normalizer.js` | `obj._id \|\| obj.id \|\| __storeSource.documentId` alias identity | C2/C3 | REPLACE (S1) |
| `scripts/engine/store/categorizer.js` | name/regex vehicle & droid classification (lines ~260–275), range-regex weapon fallback (~100) | C2 | REPLACE (S1) |
| `scripts/engine/store/index.js` | slug-of-attributes dedupe, `getComparableStoreCost`, statblock-quality winner | C2 | REPLACE (S1) |
| `scripts/engine/store/compendium-schema.js` | generic SSOT claim, requires legacy `_id`/`system.cost` | C2 | REPLACE with domain validators (S1) |
| `scripts/engine/store/cost-registry.js` | `costNumeric`-first legacy interpretation | C2 | REPLACE (S1/S2) |
| `scripts/apps/store/store-checkout.js` | cart + checkout (UI-only intent) | C2 | REWIRE; strict quote ✔, Build Ship routed ✔ |
| `scripts/apps/store/store-{main,shared,filters,description-resolver}.js`, `StoreSurfaceService.js` | overlapping read models | C2 | CONSOLIDATE (S8) |
| `purchaseHistory` flag mirror (`store-checkout.js: logPurchaseToHistory`, readers in `store-main.js`, `StoreSurfaceService.js`, `surface-store.hbs`, `store-card-grid.hbs`, `gm-store-dashboard.js`, `gm-datapad.js`, `GMApprovalOperationsService.js`) | parallel ledger vs `TransactionEngine` actor ledger | C3 (many readers — not safe to drop blind) | REPLACE by ledger projection (S2b) |
| `scripts/ui/shell/gm/*` Store GM services | policy/approval UI | C1/C2 | KEEP; `GMApprovalOperationsService._approveStoreItemPurchase` silently rebalances line prices to the approval total — REWIRE to refuse on mismatch (S2b) |
| `modification-intent-builder`, `item-customization-workbench`, `UpgradeService` | customization | C5 | quarantine; unchanged |

## 5. Transaction findings

1. **5% price tolerance — FIXED.** `StoreEngine._validatePricesAtPurchaseTime` now requires exact equality; non-finite/missing/negative line quotes refuse; a thrown error fails closed (was `valid: true`). `revalidateCart` item branch also exact.
2. **Silent reprice — FIXED.** `revalidateCartItems` rewrote cart prices and checkout then proceeded; checkout now aborts with `priceReviewRequired`, persists the updated cart, charges nothing. Staged-customization lines are no longer overwritten with the base listing price.
3. Quick-buy droid/vehicle passed the *template* (new-condition `finalCost`) to the engine while charging a different amount; now the verified final amount is passed as the line price. [V]
4. Already correct and retained: purchase lock (`withPurchaseLock`), `revalidateCart` fail-closed catch (audit X06 was partly stale here), vehicle pre-debit source/eligibility compile, inventory reservation, committed-vs-bookkeeping separation.
5. **Open:** cart still stores listing clones, not offer references; the server (GM client) is not an independent price authority for player-client carts [I] — needs an offer contract (S2b). GM approval path rebalancing (above). No post-grant postcondition for item/droid delivery.

## 6. Performance baseline (theoretical — **not measured**)

`loader.js:224` hydrates every pack document and serializes to `localStorage` (`CACHE_KEY`), then normalizes/categorizes/sorts. No timings were taken (no Foundry host). Proposed targets, to be calibrated on the S0 live baseline: cold open < 1.5 s, warm open < 300 ms, filter/search < 100 ms, detail selection < 150 ms, zero full-document hydrations before a product is inspected.

## 7. Phase roadmap and status (updated after the S1-S8 implementation pass)

Statuses are independent: `CODE_COMPLETE` / `OFFLINE_TESTED` / `FOUNDRY_TESTED`. **Nothing is `FOUNDRY_TESTED`**; every Foundry-runtime behaviour below is `RUNTIME_UNVERIFIED` (pack.getIndex field retrieval, fromUuid hydration, UI rendering from index-only `system`, shell/GM flows).

| Phase | Implemented | Deleted | Authority now |
|---|---|---|---|
| S1 catalog | `store-catalog.js` (explicit canonical packs via `pack.getIndex`, exact ids `<pack>.<docId>`, on-demand `hydrateStoreListing`, per-session memo, no browser storage), `store-taxonomy.js` (classification from `system.subcategory`/`armorType`/`equipmentBucket`/`degree`/vehicle pack registry; missing = `Unclassified`), `cost-registry.js` (published `system.cost`; vehicles via `buildCanonicalVehicleCostRecord`), vehicle index now carries published `economics` | `loader.js`, `normalizer.js`, `categorizer.js`, `index.js` (dedupe + statblock-quality ranking), `compendium-schema.js`, UI-side name/regex vehicle+droid classifiers, `STORE_RULES` cache keys + `USED_CONDITION_MULTIPLIER`, aggregate-pack fallbacks, world Items/droid Actors as stock | canonical pack records + domain registries |
| S2 | exact pricing/fail-closed (previous commit); GM approval re-quotes every line from the live catalog (`store-approval-quote.js`) and refuses on any drift, rebuilds items/droids/vehicles from the canonical source (never player `itemData`), no price rebalancing; `purchaseHistory` mirror writes removed, history reads `TransactionEngine.getActorTransactions`; staged customization dropped if its base price changed | `logPurchaseToHistory`, mirror writes in 3 files, GM-datapad legacy rows | `StoreEngine` -> `TransactionEngine` ledger |
| S3 | covered by S1 (weapons/armor/gear listings from canonical fields; purchases keep the hydrated source record: flags, effects, `_stats.compendiumSource`; existing `store-v2-purchase-integrity` test passes against the new catalog) | - | weapon/armor/equipment domains |
| S4 | vehicle condition explicit end to end; `getVehicleConditionCost` has no cross-condition/base fallback; Store never defaults a vehicle to New (purchaser chooses when both prices are published; single price auto-resolves to that condition); used-only vehicles supported; GM approval re-quotes per condition; strict source-entry identity at purchase | `buyVehicle` quick-buy path incl. `game.actors.get` and index-alias fallbacks | `getPublishedVehiclePrices` / `evaluateVehicleMerchantPurchase` |
| S5 | stock droids listed only if in `data/store/stock-droid-certification.json` (generated by `tools/generate-stock-droid-certification.mjs`; pinned `recordHash`; 194/194 certified by the stock normalizer/importer dry run - **note: the normalizer is lenient, so certification is traceable provenance + pipeline acceptance, not a mechanical audit**); `DroidFactory` stock mode requires explicit pack provenance, not record shape | `buildDroidFromTemplate` (legacy `droidSystems.degree/size`), `buyDroid`, `buyService`, `deductDroidCredits`, `submitDraft*ForApproval`, draft builders | `StockDroidNormalizer` + `StockDroidImporterEngine` via `DroidFactory` |
| S6 | Build Ship launches existing `openShipDesigner` (previous commit) | retired-builder toast | `CustomVehicleConstructionService` |
| S7 | no new sales path; customization stays on its existing lane. Production modification registry still `selectable: 0` - **HOLD_CERTIFICATION** | - | Modification V2 / domain installers |
| S8 | architecture-negative test guards the retirement (`store-v2-s8-architecture.test.mjs`) | see above | - |

### Follow-up pass (transaction closure + S8)

| Item | Result | Evidence |
|---|---|---|
| Build a Droid via Store | **Disabled (fail closed).** Lifecycle audit: the Store launched the progression builder in single-step mode with `storeMode`/`requireApproval`/`storeDroidApproval` that nothing consumes; `finalizeSingleStep` had no `droidBuilder` domain (it would throw); the only priced-queue code had no callers; builder per-part prices and `isGranted` flags live on client-held entries, so a server re-quote needs the builder's species/grant logic (not re-implemented here). `buildDroidWithBuilder` no longer launches; the finalizer returns `STORE_DROID_BUILD_COMMERCE_UNAVAILABLE` for `droidBuilder`. | `tests/store-v2-s2-commerce-closure.test.mjs` |
| Pending droid approval | Refuses zero/missing cost; requires explicit GM authorization of the exact amount (recorded as `priceAuthority: gm-authorized-declared-cost`); only from `PENDING`; engine refuses second charge. The price remains the build's *declared* figure, GM-authorized, not independently re-quoted. | same test + `ti3-progression-followers-approvals` |
| Customized purchases | **Fail closed everywhere**: workbench no longer stages them, `addItemToCart` ignores staged/price overrides, `createItemPlans` throws, `revalidateCartItems` removes them, `verifyApprovalQuote` refuses (`CUSTOMIZATION_QUOTE_UNVERIFIABLE`), approval plans never rebuild them. No provisional pricing was invented. | closure + approval-quote tests |
| Droid eligibility | Manifest records `sourceIdentity`, `importAcceptance`, `mechanicalCertification: NOT_PERFORMED` separately. Content hashes are enforced at the source-validation boundary (`store-v2-s1-catalog` test, generator `--check`); the runtime catalog re-checks the pinned id/name/degree against the live index. | s1 catalog test |
| Vehicle condition | Factory refuses a missing/invalid condition; condition is in the cart line, approval request, re-quote, factory build and transaction audit line. | closure + p0/p3/p5 tests |
| S8 consolidation | One navigation predicate `matchesStoreQuery` (store-shared.js) replaces three parallel filter pipelines (store-main loop, shell re-filter, controller DOM re-filter); it runs on the catalog listing before any card view-model is built; the shell no longer re-filters; the controller's instant filter handles only search + availability. Duplicate helpers (`normalizeStoreFilterValue`, `normalizeAvailabilityText`, `positiveCreditOrNull`, `resolveVehicleStoreCosts`, `vehiclePriceStatusLabel`, category/navigation keys) now have one definition; category keys are an exact map of canonical categories (no substring guessing). | `store-v2-s8-query`, `store-v2-s8-architecture` |
| Deleted in S8 | `store-filters.js`, `apps/store/store-constants.js`, six unreferenced templates, dead exports (`createCustomDroid`, `categorizeEquipment`, `sortWeapons`, `sortArmor`, `calculateFinalCost`, `applyPricingAll`, `isPricingFrozen`, `clearStoreCatalog`, `STORE_RULES`, `GLYPH_KEYS`), unused imports. | reachability grep + eslint no-undef clean |

Offline measurement (pure code, NOT Foundry): 1,038 listings x 600 filter passes in ~190 ms (~0.3 ms per full-catalog pass). Expected, unmeasured improvements: no per-session hydration of ~600 pack documents and 429 vehicle actors, no JSON serialization of documents to localStorage, one filter pass instead of three, view-models built only for matching items.

### Remaining open items
1. **Build a Droid** needs a re-quotable design snapshot (builder quote function over a snapshot that server-side rejects client `isGranted` flags) before it can be re-enabled. Architectural decision for the owner: whether the builder's grant rules (species bonus equipment, starting heuristic processor) are to be treated as authoritative data the Store may re-derive, or whether Build Droid stays GM-priced.
2. **Suggestion scoring** still scores all weapons/armor/gear on first load (`store-main.js` `_generateSuggestionsForAllItems`); changing it alters default sort order. Needs live measurement first.
3. `store-main.js` still builds the legacy window's card view-model that the shell reuses; further unification of `StoreSurfaceService` decorations is possible but was not required for the single-authority goals.
4. `scripts/validate-store.mjs` reports 1 failing check ("Shell template references raw price fields too frequently"); identical on the baseline commit, left untouched.
5. Request records created before this change that contain only `itemData` are refused on approval and must be resubmitted (intentional).
6. All Foundry behaviour remains `RUNTIME_UNVERIFIED`: see `store-v2-foundry-acceptance-checklist.md`.

### Foundry acceptance tests required (not run)
Player+GM: cold/warm open; category switch; select weapon/armor/gear/droid/vehicle (detail shows description/statblock via hydration); add each to cart; vehicle with both prices -> choose New then Used, price shown = price charged = ledger entry = approval; used-only/new-only vehicles; checkout with GM price change mid-session (must stop for review); concurrent double-click; approval-required item: player request -> GM approve (re-quote) and GM approve after price change (must refuse); insufficient funds; buy certified stock droid (stock-statblock mode, no double equipment); Build Ship from Store opens designer; Build Droid payment behaviour (item 1).

## 8. Corrections to the prior audit (re-verified)

- X06: `revalidateCart` already failed closed in its catch; the fail-open path was only `StoreEngine._validatePricesAtPurchaseTime` (fixed).
- X18: `PlacementRouter` is imported by `transaction-engine.js:41` — not dead.
- X01: `store/store.js` unreachable → deleted.
- X15 confirmed: `status-ledger-v1.json` has `implementation: 0`, `selectable: 0` (blockers: 7).
- X12 confirmed and fixed (S6).

## 9. Questions / blockers for the project owner (no game rules are being decided)

- **Q1 (engineering policy, not rules):** which droid source records are "certified stock"? Needs an explicit marker field decision before S5 can delete the quality ranking.
- **Q2:** may `purchaseHistory` flag history on existing actors be left as inert data (recommended: yes, no deletion) while readers move to the ledger?
- **B1:** a live Foundry V13 host for S0 baseline timings and counts.
- **B2:** per-pack canonical field inventory (needs running index) to define the S1 index field list.
- No entries were added to `swse-rules-decisions-pending.md`; nothing here required a rules ruling.

## 10. Verification run

```
node --check scripts/apps/store/store-checkout.js scripts/engine/store/store-engine.js
node tests/store-v2-s2-strict-quote.test.mjs            # new
node tests/vehicle-universal-phase4e-p5-store-transaction.test.mjs
node tests/vehicle-universal-phase4e-p3-store-eligibility.test.mjs
node tests/store-v2-purchase-integrity.test.mjs
node tests/ti2-commerce-integrity.test.mjs
```
Foundry runtime: **not run**.
