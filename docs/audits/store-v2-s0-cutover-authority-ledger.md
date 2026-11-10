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

## 7. Phase roadmap and honest status

| Phase | Scope | Status in this branch |
|---|---|---|
| S0 | Audit | `CODE_COMPLETE` (this document + JSON). Live baseline **not run**. |
| S1 | Canonical index-first catalog; delete regex/alias/dedupe | **NOT STARTED** — requires per-pack field inventory from a live index and replacement of ~2,400 lines feeding the UI; unsafe without runtime. Blockers B1, B2. |
| S2 | Strict quote/commit | **PARTIAL**, `CODE_COMPLETE` for exact pricing/fail-closed/review (offline-tested). Offer references, history projection, approval rebalancing remain. |
| S3 | Weapons/armor/equipment | NOT STARTED (depends S1); purchase source preservation already tested. |
| S4 | Vehicles | NOT STARTED beyond retained guards; remove `game.actors.get` fallback in checkout (needs S1). |
| S5 | Droids / Build Droid | NOT STARTED. Needs certified stock-provenance decision (see §9, Q1). |
| S6 | Build Ship | `CODE_COMPLETE` — `createCustomStarship` launches `openShipDesigner`; offline-tested by static guard; not Foundry-tested. |
| S7 | Modifications | NOT STARTED. Registry has `selectable: 0`, `implementation: 0` [V] → Store must not sell; no code change needed beyond gating when built. |
| S8 | UI convergence + retirement | **PARTIAL**: legacy `store/store.js` deleted. Remainder depends S1–S5. |

Each started phase is tracked independently: `CODE_COMPLETE` ≠ `CI_VERIFIED` ≠ `INTEGRATION_VERIFIED` ≠ `FOUNDRY_TESTED`. Only offline Node tests were run.

### Per-phase plan for what remains (exit criteria)

- **S1** — build `StoreCatalogIndex` from `pack.getIndex({fields})` per canonical pack; listing id = pack UUID; refuse missing identity; delete `loader.js` cache, `index.js` dedupe/quality, `categorizer.js` regex, `normalizer.js` alias, `compendium-schema.js`. *Exit:* no `getDocuments()` in browse path; deterministic counts; grep guards for `localStorage`, `_id ||`, regex classification. Negative: duplicate names across publications stay distinct; world actors never listed.
- **S2b** — `StoreOffer {sourceUuid, qty, condition, basePrice, policyRevision, finalAmount, status}`; cart holds references; GM approval reconstructs the offer and refuses on mismatch; `purchaseHistory` becomes a read projection of the TransactionEngine ledger; delete mirror writes after readers move.
- **S3/S4** — consume S1 listings; add owned-record parity postcondition; remove vehicle `game.actors.get` fallback.
- **S5** — explicit certified-stock marker in the droid source; delete statblock ranking; Build Droid final-quote verification at finalization.
- **S7** — gated blocked/reference display; sale only when the Modification V2 ledger `selectable` is non-empty and the domain installer certifies.
- **S8** — single typed read model + one filter/search engine; atomic switch; live GM+player Foundry acceptance and benchmark.

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
