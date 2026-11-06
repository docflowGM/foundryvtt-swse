# SWSE V2 — Unified Completion Handoff (2026-11-06)

For a NEW Claude session that owns both Vehicle V2 and Droid V2 from `feature/v2-unified-completion`. This document is self-contained; do not depend on earlier chat history. Read `CLAUDE.md` first (the standing "implementer, not rules adjudicator" addendum is mandatory) and `docs/audits/swse-rules-decisions-pending.md` (append-only rulings register).

Permanent rules: do not reinvent the wheel; use every part of the buffalo; one authoritative writer per mechanical state; no parallel installation or transaction systems; no mechanical calculations on V2 sheets; no invented canonical data; no HOLD promotions without evidence; no cosmetic 100% metrics; no production release without live Foundry V13 acceptance; never merge to `main` without explicit owner authorization.

## A. Repository state

| Item | Value |
|---|---|
| `main` | `c367552d8815d9ef6b1157076c31cfc4923b7716` (unchanged since integration began; integration is 0 behind) |
| Integration branch | `integration/v2-vehicles-droids-2026-11` (PR #1109, draft, review only) |
| Unified completion branch (new session) | `feature/v2-unified-completion` (draft PR into the integration branch) |
| Vehicle development branch | `feature/v2-vehicles-next` (PR #1110, draft; fully contained in the integration branch) |
| Droid development branch | `feature/v2-droids-gate-c` — identical to the earlier integration baseline `52591ac`; **contains no Gate C code** |
| Historical PRs | #1092 Vehicle (head `e844aba`), #1106 Droid Gate A (frozen `1f46371`); left open for history, not to be merged |
| Frozen inputs, all contained in the integration branch | Vehicle `e844aba`, Droid `1f46371`, Vehicle follow-up `38ccd27` |

Integration history (regular merges, nothing squashed): main `c367552` → merge of Vehicle `e844aba` → test-fixture alignment → merge of Droid `1f46371` → handoff docs `52591ac` → merge of Vehicle `38ccd27`. The exact final SHAs are reported in PR #1109 and the unified-branch PR.

CI: exact-head runs were green for Vehicle `38ccd27` (Universal Vehicles QA run 326, Rolling run 1209), for Droid `1f46371` (Droid Gate A targeted + Rolling 434/0/5) and for `52591ac` (all three). The supported rolling suite on the merged code passed 613 / 0 failed with the 5 documented exclusions below. **No Foundry V13 runtime verification of either domain has been done.**

Known rolling-suite exclusions (documented in `tools/run-rolling-tests.mjs`, unchanged): `force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`. Do not add exclusions without owner authorization.

### Work deliberately NOT integrated (found in the inventory)

- `audit/droid-two-books-kotor-gaw-2026-11-02` (1 unique commit `9d35bd2db`): Galaxy at War 22-model source-mechanics review, rewrites `data/canonical/droids/source-books/gaw.json`. Not part of the frozen Gate A checkpoint, no exact-head verification seen, touches droid source ledgers → needs the owner's droid-source review before inclusion.
- `docs/droid-semantic-scoring-handoff-20261103` (1 doc commit): semantic archetype scoring rollout plan; documentation only, unrelated to installation.
- `handoff/droid-v2-integration-2026-11-05`: its document was copied into the integration branch.
- The many `feat/class-phase-*` branches are class work unrelated to Vehicle/Droid V2 and were not touched. Old `claude/*` / `fix/*` / `audit/*` branches are historical (their content reached `main` through earlier merges).

## B. Vehicle V2 status

Authority: the canonical 429-record vehicle SSOT (`data/canonical/vehicles/vehicles.json`) generates the 11 native Actor packs (`tools/release/build-packs.mjs`); legacy `packs/vehicles-*.db` files are stale history and are never read.

### Measured coverage at the integrated head (all recomputed, not carried forward)

| Metric | Value |
|---|---|
| Published vehicles accounted for | 429 / 429 |
| Certified unarmed (statblock prints no attack) | 38; 4 more are armed record gaps (`cw-bc-714-luxury-transport`, `cw-sheathipede-class-shuttle`, `goi-corona-limited-luxury-groundspeeder`, `ur-landing-sphere`) |
| Armed vehicles | 391 |
| Stock attack groups, canonical executable | **542 / 846** (62.6%); 304 blocked. History: 528 (owner baseline) → 530 → 539 (tractor notation, +9) → 542 (damage-line autofire, +3) |
| Armed vehicles with ≥1 executable group | 335 / 391 |
| Armed vehicles fully executable | 177 / 391 (45.3%) |
| Group outcomes | CANONICAL_EXECUTABLE 542, IMPLEMENTATION_REQUIRED 161, SOURCE_EVIDENCE_REQUIRED 86, RULES_DECISION_REQUIRED 57 |
| GM-configurable (not canonical) | 102 groups blocked only by the four ammunition facts; 207 battery groups GM-weapon-count configurable |
| Aftermarket catalog | 63 rows = 49 weapon rows + 14 ammunition rows; **30 / 49 weapon rows installable**; 6 weapon families fully operational offline |
| Live-verified | 0 |

Keep outcomes separate and never redefine 100%: *canonically certified* (above), *GM-configured* (labelled `GM_CONFIGURED_EXECUTABLE`, never canonical), *project-convention executable* (none yet; would need a ruling, e.g. V100-01 option), *manual-adjudicated* (proposed outcome in V100-05, not adopted), *blocked*, *live-runtime-verified* (0).

### Implemented (offline-tested, not live)

Source-backed vehicles and certified source ledger; stock weapon groups (digest-verified, `assessStockWeaponGroups`) with arm → attack → damage proof for every executable group; aftermarket Shipyard purchase / install / fire / remove (sealed installation ledger, EP budget, certified effects); weapon families: laser, blaster, ion, turbolaser, torpedo/missile launchers, shieldbuster, space mines, ion bombs, tractor beams, gravity wells, autoblaster; configurations (double/triple/quad/fire-linked, cannon enhancements, point defense, autofire and burst); weapon batteries (Core p.170, full and independent mode, Aid Another); ion damage lifecycle; area/splash miss-half rule; capital-ship −20; automatic range (Table 10-2) from token distance; ammunition ledgers (stock and aftermarket, finite pools, GM grant/reload); initial-ammunition house rule `initialVehicleAmmunitionIncluded`; ship logistics (fuel, consumables, GM-administered docking/maintenance); vehicle-sheet Buy Ammunition shortcuts and the SWSEStore vehicle context; Party Fund purchases with GM approval, rollback and indeterminate handling (routed through main's id-addressed approval identity rule); V2 vehicle sheet presenting engine-derived values (no sheet math).

### Partial / incomplete

304 blocked stock groups (see C); aftermarket rows 19 weapon rows not installable (mass-driver/rail, composite beam, flak pod, proton-grenade, heavy ordnance, ion pulse, microtractor, harpoon, energy bomblet, discord, chaff, defoliator, gravity-mine launcher, docking gun, droid jammer, Hapan triple ion, optional fire-link) mostly for lack of a source-reconciled row; launcher capacity expansion (V-P6A-03) and the reload action (V-P6C-06) are deferred rulings; construction/emplacement works for catalog rows with certified effects only; crew assignment/movement exist for the source-backed models but **Foundry runtime acceptance is outstanding**.

## C. Vehicle 100% completion plan

Evidence reports (all reproducible with `--check`): `docs/audits/vehicles/vehicle-100-percent-completion-analysis.md` (census of every blocked group, taxonomy A–G, shared-blocker/unlock tables, aftermarket accounting, V100 docket), `vehicle-evidence-verification.md` (text-corpus verification, extraction defects with proposed corrections, unarmed re-check, **PDF checklist**), `stock-weapon-coverage.md`, `weapon-ecosystem-readiness.md`, `p6b-deferred-work.md`. Builders live in `tools/audits/vehicles/`; tests `tests/vehicle-universal-phase4e-p5x-*.test.mjs`.

### Owner decisions — ALL PENDING (the owner has not ruled)

- **V100-01 — stock ammunition pools** (register V-P6C-21): may a printed Payload define a pool when no launcher count is printed? 64 groups on 63 vehicles; 17 may resolve by PDF (3 printed counts on ammunition-named groups, 14 never-reviewed counts), 47 are certified silent. Evidence: published capacity is a *launcher* property (SotG pp.45-46); Payload is a carried complement (Core statblock key). Unapproved recommendation: canonical where a count is printed, a distinct `STOCK_POOL_CONVENTION` outcome where silent.
- **V100-02 — missing range assignments**: 46 groups on weapons with no Table 10-2 row; Table 10-2 is an image (not in the text corpus) → PDF research first.
- **V100-03 — published attack totals**: 29 groups (capital ships); 14 reproduce exactly if the record's Base Atk/Int are corrected to the statblock text (extraction defect, needs PDF), 15 stay unexplained; Eclipse prints conflicting +7/+15.
- **V100-04 — qualitative firing arcs**: 5 groups ("forward-mounted", "articulated", "flank turrets", "axial").
- **V100-05 — special-effect devices**: 6 groups; effect text is printed (grapple-notation devices, marker missile, gravity-mine sidebar); decide mechanic reuse vs `GM_ADJUDICATED`.
- **Newly identified, not yet in the docket (add as V100-06):** four size-dependent groups (`cw-subjugator-class-heavy-cruiser-source-attack-1/-2/-4`, `sotg-sienar-fleet-systems-gat-12h-group-2`). Their ships print plain "Colossal"; the runtime's −20 rule covers only Colossal (frigate/cruiser/station), while the statblocks print the explicit "vs smaller than Colossal" figure. Applying it requires deciding whether the printed figure governs. Not implemented.

### PDF verification requirements

The source PDFs are **not** in the repository or the cloud container; the OCR text corpus (`reference/sourcebooks`) is. The owner can provide them privately (never commit copyrighted books). Highest-value batch: the checklist in `vehicle-evidence-verification.md` (119 vehicles, with publication and printed page). Specifically: 14 Base Atk/Int corrections for V100-03 (and the broader scan: Base Atk differs on 8 vehicles, Int on 10 — some are OCR errors); the 14 unreviewed launcher counts; the 12 unreviewed arcs; Table 10-2; 11 payload-line extractions; 16 label-embedded attack lines. Rules for corrections: verify against the PDF, keep publication/page provenance, keep the original value traceable, no new interpretation. OCR alone never changes a certified value.

## D. Droid V2 status

### Gate A (complete, offline-tested, in this baseline)

122 unique Core + Scavenger's Guide to Droids component identities (**99 source-review PASS, 23 HOLD**; HOLD never promoted); one pure quote authority (nine size factors, accessory vs locomotion mass, rejects unknown source/size/price); typed prerequisites (`sizeRestriction`, `requiredLocomotion`, `requiredSystems`, and a unique appendage *instance* for `requiresAppendage`); Hardened Systems tiers as printed size-based replacement (16 tier × size fixtures); 135 SGD-HOST-002 arithmetic fixtures; builder, follower and Garage quote consumers (shared, no UI arithmetic). Reports: `docs/audits/droids/droid-v2-gate-a-implementation-checkpoint.md`, `droid-v2-integration-freeze-handoff-2026-11-05.md`. Generated snapshot: `scripts/data/generated-droid-component-source-status.js` (`tools/build-droid-component-source-status.mjs --check`).

### Gate C — NOT implemented (verified)

`feature/v2-droids-gate-c` has zero commits beyond the baseline and no Gate C code exists anywhere. What was learned during an aborted start (reuse this, do not re-derive):

- **Authority:** `system.installedSystems` is the post-creation installed ledger; `system.droidSystems` is the draft/stock blob and display fallback, never a second ledger. Resolver: `scripts/domain/droids/droid-installed-component-resolver.js` (dedups by canonical part id; precedence ledger > embedded Item > droidSystems > legacy mods). Single mutation authority: `scripts/engine/customization/droid-customization-engine.js` (`applyDroidCustomization`, through `TransactionEngine.executeAssetCustomizationTransaction` and `ActorEngine.applyMutationPlan`); guard `tools/check-droid-installation-write-authority.mjs` lists the approved one-time writers (chargen `default-subtypes.js`, `follower-creator.js`, stock importer, reconciliation service).
- **Known defects Gate C must close:** installed entries are keyed by canonical part id, so a second hand/claw cannot be a distinct instance; `#nextAppendageLocation` and `#upsertArrayEntry` assign locations by type name / array length; Gate A's prerequisites already require `selectedAppendage.instanceId` matching a `droidSystems.appendages[].instanceId`, but nothing assigns one; the builder passes no `selectedAppendage`, so appendage enhancements are fail-closed unpurchasable; the engine's preview treats a valid quote as compatibility (`compatible = !quoteBlocked`) — a price is not an installation permit.
- **Identity vocabulary already defined** by the equipment layer (`scripts/engine/equipment/anatomy-resolver.js`, `droid-appendage-projection.js`): `identity: { slot, instance, part }` with slot = stable location, instance = one physical component, part = canonical definition; the projection deliberately returns *zero* allocatable appendages for legacy evidence and expects a droid schema to provide confirmed slot + instance (E2B). Gate C is the producer of that evidence.
- **Dead parallel logic to remove:** `droid-modification-factory.js`, `droid-transaction-service.js`, `droid-slot-governance.js`, `droid-system-definitions.js`, `scripts/apps/droid-builder-app.js` (the write-authority guard documents them as unreachable; verify references before deleting). Chargen/follower finalize only `droidSystems` today; they must also seed valid ledger entries through the same contract.
- **Do not** build a universal installation engine shared with vehicles; share contracts and tests, not rules.

### Droid open items

23 source HOLDs (5 locomotion price HOLDs permit only the first unrestricted initial-build numeric subset); two source-undetermined physical hosts (Micro Shield — handheld/possessed?, Silence-Bubble Generator); legal availability/purchaser; installed-vs-possessed decision and encumbrance; **16 top-level mechanical-consumer fields without proof** (armor properties, running speed, behavioural inhibitors, weapon capabilities, installation DC, …; `tools/audit-droid-source-field-ownership.mjs --certify` is the future hard gate); canonical Translator Unit four tiers vs the legacy three aliases; 26 V2 migration scenarios uncertified; Droid Store financial atomicity/rollback; no live V13 test. No historical droid migration is needed (no active player droids).

## E. Architecture and shared authorities

| State / decision | Authority |
|---|---|
| Actor mutations | `scripts/governance/actor-engine/actor-engine.js` (`applyMutationPlan`, embedded-document helpers); no direct `actor.update` |
| Credits, asset transactions, rollback | `scripts/engine/store/transaction-engine.js` — TI-2 requires a retrievable full-actor v2 snapshot before a charge; restore must verify; `executeAssetCustomizationTransaction` is the shared customization path (vehicle installs and droid Garage both use it) |
| Store pricing / checkout | `scripts/engine/store/cost-registry.js` (markup + discount; missing price stays null), `scripts/apps/store/store-*.js`, vehicle ammunition store context `store-vehicle-ammunition.js` |
| GM approvals / Party Fund | `scripts/ui/shell/gm/GMApprovalOperationsService.js` — id-addressed identity (main TI-3); Party Fund vehicle requests settle through `VehicleAmmunitionPurchaseService`; `PartyFundAccess` in `holonet-messenger-service.js` |
| Vehicle installation | `vehicle-installation-service.js` + sealed ledger `flags.swse.vehicleInstallations` (guarded flags in `vehicle-installation-ledger.js`); ammunition `vehicle-ammunition-service.js`; logistics `vehicle-logistics-service.js`; the only Scene writer `vehicle-scene-state.js` |
| Vehicle weapon rules | `scripts/domain/vehicles/*` (damage, battery, range, stock groups, ammunition ledger, area, ion); combat entry `scripts/combat/rolls/attacks.js` → attack-domain router → readiness gate (`attack-readiness-gate.js`, main) |
| Droid installed state | `system.installedSystems` via `droid-customization-engine.js`; read model `droid-installed-component-resolver.js`; quotes `droid-component-quote-authority.js`; source status `droid-component-source-review.js` |
| Modifiers | `scripts/engine/effects/modifiers/ModifierEngine.js` (droid parts via `hydrateDroidPart`) |
| Equipment / anatomy | `scripts/engine/equipment/*` (readiness, anatomy, droid appendage projection) |
| Rules rulings | `docs/audits/swse-rules-decisions-pending.md` (append-only) and `CLAUDE.md` |
| Source classification | `tools/lib/canonical-authority-classification.mjs` + generated `data/audits/phase-5c-authority-classification.json/.md` (regenerate with `node tools/build-phase-5c-authority-classification.mjs`; `tests/phase-5c-canonical-production-negative.test.mjs` must stay intact) |

Generated audit files are evidence only, never runtime authority. Remaining duplicate/legacy paths: the five dead droid files above; vehicle legacy `packs/vehicles-*.db` (ignored by the build); two droid-part schemas (`scripts/data/droid-part-schema.js` active, `scripts/domain/droids/droid-part-schema.js` display/projection helpers) — verify before consolidating; embedded droid-part Items remain a lower-precedence read source in the resolver.

Integration lessons (apply to new work): main's TI-2 needs `SnapshotManager.getSnapshot` stubs returning `{schemaVersion:2, scope:'full-actor'}` in test harnesses; main's attack-readiness gate needs the weapon to be an Item in a value-iterating collection (not a bare `Map`); any release/pack test must follow the vehicle SSOT contract.

## F. Completion roadmap (suggested order)

1. **Engineering that needs no new ruling.** (a) Droid Gate C (host eligibility, appendage instance/slot identity, installed-vs-possessed, chargen/follower/Garage through one contract, negative tests, delete dead parallels). (b) Close the two droid guards that fail on `main` and the Gate A guard (see G). (c) Vehicle: remaining notation/integration defects that need no source (see the cause table in the analysis, root causes C/D with printed facts): station-battery/"N gunners" record marking requires PDF; the others are listed per group in `vehicle-100-percent-completion-analysis.json`.
2. **Source research (needs PDFs).** The vehicle checklist; droid HOLD evidence; GaW droid review branch.
3. **Owner decisions.** V100-01…05 (+V100-06); droid physical-host questions.
4. **Mechanical implementation** after each ruling, per group, with positive/negative tests and a measured coverage delta (never change denominators).
5. **Integration testing.** Cross-domain suite on every shared-service change (ActorEngine, TransactionEngine, Store, ModifierEngine, approvals).
6. **Live Foundry V13 acceptance** for both domains: purchase/install/remove persistence across reload, vehicle combat, Party Fund approval, droid Garage, chargen/follower, sheets.
7. **Production-readiness certification**: owner sign-off; only then discuss merging to `main`.

Reuse first: `assessStockWeaponGroups`, the coverage/readiness/analysis builders, `TransactionEngine`, the droid resolver/quote/prerequisite modules, the equipment anatomy projection.

## G. Known failures and risks

- **Droid strict guards** (not in CI; classification verified at this head): `check-droid-authority-ssot --strict` — **introduced by the frozen Droid Gate A checkpoint** (passes on `main`): `droid-component-source-review.js` is flagged as a competing rule table because of its reviewed identity-alias table; allowlist with justification or consume the registry. `check-droid-calculation-mode-authority --strict` — **inherited from `main`**: `vehicle-import-normalizer.js` references `stockDroidAttack.publishedAttackTotal` outside approved sites; `droid-actor-sheet.js` calls `convertToPlayableDerived()` outside the approved call site. `check-droid-reconciliation-authority --strict` — **inherited from `main`**: `droid-actor-sheet.js` calls `applyReconciliation()/rollbackReconciliation()` outside the approved site. The other four droid guards pass.
- Unresolved source cases: all V100 items; 23 droid HOLDs; Eclipse +7/+15 conflict; Micro Shield / Silence-Bubble host.
- Unsupported mechanics: capacity expansion (V-P6A-03), reload action (V-P6C-06), gravity-mine/discord/defoliator/mass-driver launchers, special devices, hyperdrive-activation consumer for gravity wells, advanced mine offering.
- Evidence limits: vehicle statuses are mostly `SOURCE_NOT_YET_VERIFIED` (no PDF); OCR-only observations are provisional.
- Runtime: nothing is Foundry-tested; Node/mocked tests are not acceptance.
- Integration risks: merges touched `GMApprovalOperationsService.js`, `combat-roll-math.js`, `cost-registry.js`, `actor-engine.js` (resolved deliberately, tests green); the unintegrated GaW droid ledger branch will change `data/canonical/droids/source-books/gaw.json` when merged — re-run `phase-5c` classification and the droid source-status check after any droid source change.

## How to start

1. `git checkout feature/v2-unified-completion`; run `node tools/run-rolling-tests.mjs` (expect 613/0/5 excluded) and the `--check` of every builder in `tools/audits/vehicles/` and `tools/build-droid-component-source-status.mjs`.
2. Ask the owner for rulings/PDFs before any item in §C; start with §F.1(a) which needs neither.
3. Work in small PRs targeting `feature/v2-unified-completion` (or the integration branch as the owner directs); after every batch regenerate coverage, run the rolling suite, verify exact-head CI, keep PRs draft.
