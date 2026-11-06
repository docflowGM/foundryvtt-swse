# Droid V2 - U-0 Cross-Surface Convergence Audit (2026-11-06)

**Branch:** `feature/v2-unified-u0-convergence-audit`, stacked on `feature/v2-unified-gate-c3a-creation-ledger` (PR #1115 head `b76c55d`; exact-head CI green: Rolling 620 passed / 0 failed / 5 documented exclusions, Droid targeted success).
**Nature:** READ-ONLY. This checkpoint adds this report and one report-only census tool (`tools/audit-droid-actor-classification-sites.mjs`). No production code, data, test, workflow or source-review disposition changed; nothing was deleted. No Foundry V13 runtime test was performed.

## 0. Method and evidence limits

Evidence was gathered by reading the named consumers, tracing imports and call sites, running a pattern census over `scripts/`, tallying the canonical source-book data, and measuring the legacy `droids` pack. Statements are tagged:

- **READ** - established by reading the cited file and line at the baseline head.
- **MEASURED** - produced by a command whose output is in the appendix.
- **NOT REPRODUCED** - inferred from code; no test or runtime exercise was run in this pass. These are findings to verify in U-1, not proven defects.

The site census is a regular-expression survey (it cannot see multi-line conditions, helper-wrapped tests or dynamic access). It shows WHERE to look; no site is changed on its evidence alone.

Relationship classes used below: `SHARED_AUTHORITY`, `INTENTIONAL_CONTEXT_DIFFERENCE`, `DIVERGENT_AUTHORITY`, `UNVERIFIED`, `SOURCE_RULING_REQUIRED`.

## 1. Findings

### 1.1 Confirmed (READ) divergences

| ID | Finding | Evidence | Consequence |
|---|---|---|---|
| **F1** | Component modifiers are gated on the Foundry actor TYPE only. | `ModifierEngine.js:344` (`if (actor.type === 'droid')`) and `:1658` (`if (actor.type !== 'droid') return`). | An NPC-typed droid follower (`type: 'npc'`, `system.isDroid: true`, the production follower shape from `follower-mutation-planning.js:225`) collects no droid-part modifiers, even though Gate C-3A now seeds its ledger. Installed follower hardware currently has no modifier effect. |
| **F2** | The feat/talent droid-system prerequisite collector is a second evidence authority with a different contract from the Garage's. | `scripts/domain/droids/droid-part-schema.js:643-668` `collectActorDroidSystemParts`, called through `actorMeetsDroidSystemRequirement` (`:675`) from `scripts/data/prerequisite-checker.js:77`. It reads `system.droidSystems` (draft / stock / display), the caller's `pending` draft and integrated embedded Items; it never reads `system.installedSystems`. If no processor is found it SYNTHESIZES a Heuristic Processor (`:661-666`) whenever the actor "looks droid": `actorType === 'droid' \|\| /droid/.test(species) \|\| droidSystems present \|\| pending present`. | After creation, a prerequisite such as "requires Heuristic Processor" can be satisfied by a synthesized default or by a draft/mirror record while the ledger holds something else; ledger-only hardware is invisible to it. Classification here uses the species NAME and mere presence of a draft. |
| **F3** | Damage resolution and damage categorization classify droids differently. | `damage-resolution-engine.js:417,454,466` (type-only: `npc` -> unconscious / dead; `droid` -> disabled / destroyed at 0 HP) vs `damage-packet-rules.js:176` (`type === 'droid' \|\| droidState \|\| system.isDroid`). | The same NPC-typed droid follower is a "droid" for damage-packet category but an "npc" for the 0-HP outcome. (Runtime-risky area; not reproduced.) |
| **F4** | There is no single "is this actor a droid" contract. | Census (section 4): type-only, type-or-flag, flag-only and a name/draft-inference idiom coexist in rules-bearing code. | Each consumer answers differently for the NPC-typed follower and for species named like a droid. |
| **F5** | The Store's stock-droid conversion has an unvalidated fallback. | `droid-factory.js:66-82`: if `StockDroidNormalizer` / `StockDroidImporterEngine` throws, the source record is cloned (`...actorObj`, `type: 'droid'`) instead. The clone sets no `droidCalculationMode` and no stock-import provenance. | A published statblock record that fails normalization becomes a playable-derived actor over unconverted statblock fields, neither stock-protected nor normalized. (Code-read; the failure path was NOT REPRODUCED.) |
| **F6** | Whole-droid Store listings carry no canonical model identity. | `store-checkout.js:145-178,431-453`: price is `droidTemplate.finalCost` from the listing; the legacy pack `packs/droids.db` has 194 records: 171 with `droidSystems`, **0** with `installedSystems`, **0** with `droidCalculationMode`, **0** with `stockDroidImport` (MEASURED). `DroidTemplateDataLoader` reads only `foundryvtt-swse.droids`. | No store-bought droid is linked to a source-census entry (`sourceEntryKey`), and the stock path leaves the ledger empty by design (reconciliation is an explicit later action). |

### 1.2 Architectural gaps

| ID | Gap |
|---|---|
| **G1** | `scripts/patches/follower-droid-garage-hotfix.js` mixes two jobs in one global monkey-patch: (a) type adaptation (a `Proxy` that reports `type: 'droid'`) and (b) wallet routing (the follower's owner pays; `TransactionEngine.executeAssetCustomizationTransaction` is wrapped). Semantic droid recognition lives in its private `isFollowerDroid`. It patches four `DroidCustomizationEngine` statics and `CustomizationBayApp.prototype._prepareContext` at runtime. |
| **G2** | The Garage's own gates are type-only (`CustomizationBayApp` `actorMatchesMode` at `:346`, engine type checks, `UpgradeService.js:131` Workshop record). They work for followers only through G1's proxy. |
| **G3** | There is no model-to-construction projection. The canonical source entries (`data/canonical/droids/source-books/*.json`, 234 entries) are all `pdf-reviewed / partial / not-tested` (MEASURED); the R2 Series Astromech entry has `systems: {}`, `equipment: {}` and `pcConstruction: { heroEligibility: 'allowed' }`. There is no certified configuration to project into components today. |
| **G4** | Acquisition is not modelled below the whole droid: no contract connects buying a component, possessing it (embedded Item) and installing it (ledger). |
| **G5** | Four places define a "Heuristic Processor default": the builder default (`droid-builder-step.js` ~l.140-215, "always free in chargen"), `StockDroidNormalizer` (`:193`, labelled an assumption), `DROID_REQUIRED_PARTS` in `domain/droids/droid-part-schema.js:83`, and the prerequisite collector's synthesis (F2). |
| **G6** | The stock normalizer's assumed components (`:193-198`: Heuristic Processor, Walking locomotion, two Hand appendages with `location: 'leftArm'/'rightArm'`) are display assumptions. They ARE correctly excluded from reconciliation (`droid-converted-system-reconciliation-classifier.js:46`, `ASSUMED_DEFAULT_PREFIX`), but any future model projection must not consume them. |

### 1.3 Intentional context differences (SHOULD stay different)

Chargen grants initial equipment without a debit; the Store charges for a whole droid at the listing price; followers have restricted construction categories; the Garage requires a confirmed installed host; the follower's OWNER pays (wallet identity differs from asset identity); stock-statblock droids suppress component modifiers already baked into published totals (`shouldSuppressComponentModifiers`); a stock droid is converted only by an explicit confirmed action. None of these is a different component definition.

### 1.4 Missing source evidence and open rulings (not decided here)

0 of 234 source entries are mechanically certified (identity PDF-reviewed, mechanical `partial`, runtime `not-tested`; 10 astromech-like entries across Clone Wars, Core, Force Unleashed, SGD and Threats are in that state). 23 component HOLDs remain. Open: DROID-RD-001, -002, -003, SGD-HOST-002. **Two U-1 items change follower mechanics and are flagged for an explicit owner go-ahead before implementation** (see 6.4): follower droid-part modifiers (F1) and the follower 0-HP outcome (F3). Neither is decided here.

## 2. Authority matrix

| Surface | Definitions / identity | Eligibility | Price / mass | Evidence class | Actor types accepted | Effects applied by | Writer | Wallet | Failure / rollback | Model provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| Chargen (`DroidBuilderStep`) | `data/droid-systems.js` via `data/droid-part-schema.js` | typed prerequisites, draft mode | `resolveDroidBuilderQuote` (builder consumer) | draft -> ledger at finalization (C-3A) | `droid` (chargen target) | `ModifierEngine` | `DroidSubtypeAdapter` mutation plan via ActorEngine | none (grant; budget accounting) | fail-closed before plan returns | none |
| Follower creation | same builder family (`FollowerDroidBuilderStep` extends `DroidBuilderStep`) | same + follower category limits | same consumer | draft -> ledger (C-3A) | `npc` + `isDroid` | **none (F1)** | `FollowerCreator` via ActorEngine in a rollback transaction | none (no debit) | transaction rollback | none |
| Garage | same definitions | `evaluateInstallationEligibility` (C-2) | `resolveDroidPartQuoteDetailed` (POST_CREATION) | confirmed ledger | `droid` only (proxy lets followers in) | `ModifierEngine` | `DroidCustomizationEngine` through `TransactionEngine` | droid, or owner for followers (G1) | TransactionEngine restore | n/a |
| Follower Garage bridge | proxy reports `type: 'droid'` | inherits Garage | inherits | ledger | `npc` follower | n/a | n/a (wraps) | **owner** | inherits | n/a |
| Workshop (`UpgradeService`) | same | via engine | via engine | ledger | `droid` records only | n/a | engine (no fallback writer, 2A) | per engine | fail closed | n/a |
| Store (whole droid) | listing record from legacy pack | `isStoreItemPurchasable` policy | **listing `finalCost`, not component quote** | none / statblock | creates `droid` | stock mode suppression | `DroidFactory` + checkout | buyer | checkout transaction | **none (F6)** |
| Stock import | `StockDroidNormalizer` (+ assumptions G6) | n/a | published totals preserved | `droidSystems` snapshot (display), ledger empty | `droid` | suppressed in statblock mode | importer, then explicit reconciliation | none | n/a | `flags.swse.stockDroidImport` |
| Sheet Systems resolver | resolver read model | n/a | `computeDroidPartCost` (display) | all sources (ledger > Item > draft) | any | n/a (read) | none | none | n/a | n/a |
| `ModifierEngine` | resolver | n/a | n/a | resolver, all sources | **`droid` only (F1)** | itself | n/a | n/a | n/a | n/a |
| Feat/talent prerequisites | second schema (F2) | `actorMeetsDroidSystemRequirement` | n/a | **draft + pending + Items + synthesis (F2)** | name/draft inference | n/a | n/a | n/a | n/a | n/a |
| Derived / combat | n/a | n/a | n/a | n/a | mixed idioms (F3, F4) | `derived-calculator`, damage engines | n/a | n/a | n/a | n/a |

### Relationship classification

| Relationship | Class |
|---|---|
| Chargen vs follower builder definitions, quote and prerequisites | `SHARED_AUTHORITY` (same builder consumer and definitions) |
| Chargen / follower / Garage installed-state record (`installedSystems`) | `SHARED_AUTHORITY` after C-3A (one ledger; verified offline) |
| Garage vs Workshop write path | `SHARED_AUTHORITY` after 2A |
| Chargen grant vs Store charge vs Garage purchase (policy) | `INTENTIONAL_CONTEXT_DIFFERENCE` |
| Stock-statblock suppression vs playable-derived effects | `INTENTIONAL_CONTEXT_DIFFERENCE` |
| Follower owner-pays wallet vs droid asset | `INTENTIONAL_CONTEXT_DIFFERENCE` |
| Droid recognition across ModifierEngine / derived / combat / prerequisites / Garage | `DIVERGENT_AUTHORITY` (F1-F4) |
| Prerequisite evidence (second schema) vs installed-component resolver | `DIVERGENT_AUTHORITY` (F2) |
| Follower Garage access (proxy) | `DIVERGENT_AUTHORITY` as a permanent contract (G1) |
| Store whole-droid vs custom build vs stock model, canonical identity | `UNVERIFIED` (G3, F6); model equivalence cannot be asserted from names |
| Processor behaviors (Heuristic vs Basic vs Remote skill / proficiency permissions) | `UNVERIFIED` (no mechanical consumer proven in this pass) |
| Astromech factory configuration | `SOURCE_RULING_REQUIRED` / missing source (entries `systems: {}`, 0/234 certified) |
| Fitting hosts (Telescopic Appendage, Micro Shield, Silence-Bubble Generator), Stabilized Mount, Workshop cap | `SOURCE_RULING_REQUIRED` (DROID-RD-001/-002/-003, SGD-HOST-002) |

## 3. Competing-implementation inventory (no deletions in U-0)

| File / area | Class | Note |
|---|---|---|
| `scripts/data/droid-systems.js`, `scripts/data/droid-part-schema.js` | canonical authority | definitions + runtime adapter |
| `droid-component-quote-authority.js`, `-source-review.js`, `-prerequisites.js`, `droid-installation-eligibility.js` | canonical authority | quote / source clearance / typed prerequisites / eligibility |
| `droid-installed-component-resolver.js`, `droid-appendage-instance.js`, `droid-initial-installation*.js` | canonical authority | evidence read model, identity, creation seeding |
| `scripts/domain/droids/droid-part-schema.js` | **duplicate (evidence collector, F2, G5) + legitimate adapter (alias / UUID lookup)** | split in U-2; keep alias lookup |
| `scripts/domain/droids/droid-system-definitions.js` | compatibility facade (dormant) | only dead consumers |
| `droid-modification-factory.js`, `droid-transaction-service.js`, `droid-slot-governance.js`, `scripts/apps/droid-builder-app.js` (+ `stock-droid-conversion-dialog.js`) | dead (previously verified unreferenced) | C-3C |
| `scripts/patches/follower-droid-garage-hotfix.js` | compatibility bridge (G1) | replace after U-1 |
| `scripts/engine/droids/droid-factory.js` | legitimate adapter with an unvalidated fallback (F5) | U-3 / U-4 |
| `scripts/core/droid-template-data-loader.js` | legacy pack reader | U-3 |
| `StockDroidNormalizer` assumed defaults | legitimate adapter + assumption (G6) | must not feed projections |
| Four "Heuristic default" sites (G5) | duplicate construction grant | consolidate in U-2 |
| Per-file type / flag tests (section 4) | duplicate classification | U-1 |

## 4. Actor-classification census (MEASURED, heuristic)

`node tools/audit-droid-actor-classification-sites.mjs` (vehicle-domain files excluded; 530 sites):

| Area | TYPE_ONLY | TYPE_OR_FLAG | FLAG_ONLY | EXTENDED_HEURISTIC |
|---|---:|---:|---:|---:|
| RULES (engine, actors, governance, domain, data, items, utils, core) | 52 | 21 | 116 | 1 |
| UI (sheets, apps, ui, holonet, patches, dev, debug) | 66 | 23 | 224 | 8 |
| OTHER | 8 | 1 | 10 | 0 |

The single RULES `EXTENDED_HEURISTIC` site is `domain/droids/droid-part-schema.js:661` (F2). Examples of RULES `TYPE_ONLY` sites that matter for followers: `ModifierEngine.js:344,1658`, `damage-resolution-engine.js:417,454,466`, `canonical-special-effects.js:179`, `ally-assignment-service.js:767`, `droid-customization-engine.js:344,376,443,579`, `UpgradeService.js:131`, `AssetGrantService.js:51,150`. Examples of `TYPE_OR_FLAG`: `derived-calculator.js:510`, `hp-calculator.js:53`, `defense-calculator.js:709`, `SecondWindEngine.js:82`, `poison-engine.js:683`, `damage-packet-rules.js:176`. FLAG_ONLY is large because `isDroid` is also used as a local variable; it is NOT a count of defects. U-1 uses this tool as a ratchet (section 6.6), not as a defect list.

## 5. Case-study specification (parity fixtures)

For each case the fixture asserts canonical identities and mechanical effects, never final statistics alone. "Today" states what can be exercised now.

| # | Case | Shared (must match) | May differ (context) | Today |
|---|---|---|---|---|
| 1 | Custom playable astromech (component set: Heuristic Processor, a locomotion, hands/tools per builder) | component ids, quote basis, effects | grant vs charge, PC progression | Buildable from components; seeding + eligibility covered offline (C-3A, C-2). No model claim is made. |
| 2 | Store-purchased published astromech | canonical component ids, if the model's configuration were certified | price (listing), statblock totals | **Blocked by missing source evidence (G3):** entry `systems: {}`; 0/234 certified. Test can only assert the limitation and the stock-mode path. |
| 3 | NPC-typed droid follower with a certified modifier component | same component effect as the `droid` actor | follower progression, base totals | **Fails today (F1)**; this is the U-1 acceptance fixture. |
| 4 | Stock-statblock droid, then explicit conversion | no double-count before conversion; ledger + reconciliation after | mode | Mode adapter and reconciliation covered by existing tests; cross-surface comparison to be added. |
| 5 | Two identical hands | distinct instance ids, opaque locations | origin (chargen / follower) | Covered for chargen and follower (C-1, C-3A). Stock path: assumed hands are display-only (G6). |
| 6 | Heuristic vs Basic / Remote processor | component ids and quotes | permissions | Quotes covered; **behavior consumers `UNVERIFIED`**. |
| 7 | Size-dependent price | identical quote | n/a | Covered (135 arithmetic fixtures + Wave 2B). |
| 8 | Component needing a confirmed physical host | host from ledger only | n/a | Covered (Wave 2B); fitting hosts with open rulings stay blocked. |
| 9 | Source-HOLD component | blocked everywhere | n/a | Covered (source review gate; initial-build subset). |
| 10 | Possessed (embedded Item) vs installed | Item = present, never confirmed | acquisition path | Evidence classes covered (Wave 2B); acquisition-to-installation contract absent (G4). |

## 6. U-1 patch plan (shared actor classification) - NOT implemented

### 6.1 Contract

New pure module `scripts/domain/droids/droid-rules-profile.js` (no Foundry imports; deps injected):

```js
resolveDroidRulesProfile(actor, { pending } = {}) -> {
  foundryType,                 // actor.type, untouched
  isDroidRules,                // does this actor follow droid rules?
  kind,                        // PLAYABLE_DROID | DROID_NPC | DROID_FOLLOWER | STOCK_STATBLOCK_DROID
                               // | CONVERTED_PLAYABLE_DROID | NON_DROID | UNCLASSIFIED
  calculationMode,             // reuses resolveDroidCalculationMode(); never re-derived here
  isFollower,                  // same markers the follower hotfix and planner already use
  signals: [{ code, source }], // which explicit signals decided it
  confidence                   // EXPLICIT | NONE
}
shouldCollectDroidComponentModifiers(actor) -> boolean   // the ModifierEngine gate, pure, testable under Node
```

Signals are EXPLICIT only: `actor.type === 'droid'`; `system.isDroid === true`; `flags['foundryvtt-swse'].isDroid`; the follower droid-config markers already used by `follower-droid-garage-hotfix.js` and `follower-mutation-planning.js`. **Never** the display name, species text or mere presence of `droidSystems` (those yield `UNCLASSIFIED`, reported, not guessed). Foundry `vehicle` actors are `NON_DROID` (vehicle-format droid entities keep their vehicle authority; out of scope).

### 6.2 Files (exact)

| File | Change |
|---|---|
| `scripts/domain/droids/droid-rules-profile.js` | new, pure |
| `scripts/engine/effects/modifiers/ModifierEngine.js` | `:344` and `:1658` gate through `shouldCollectDroidComponentModifiers` (two lines) |
| `scripts/patches/follower-droid-garage-hotfix.js` | `isFollowerDroid` delegates to the profile; wallet routing and the proxy are kept unchanged |
| `tools/audit-droid-actor-classification-sites.mjs` | add a ratchet flag (`--max-rules-type-only=N`), run in the droid workflow |
| `tests/droid-rules-profile.test.mjs` | new |
| `.github/workflows/droid-v2-gate-a.yml` | add the profile test and the ratchet |

Explicitly NOT in U-1 (each needs its own review): `damage-resolution-engine` and other combat sites (F3, runtime-risky), the prerequisite collector (F2, U-2), Garage engine type gates and removing the proxy (needs the same preview / apply / transaction tests passing without it), `derived-calculator` and its siblings (already flag-aware).

### 6.3 Tests and fixtures

- Profile matrix: playable `droid`; `droid` in stock-statblock mode; converted droid; NPC follower (`type: 'npc'`, `system.isDroid`, follower markers) with and without droid config; ordinary NPC; ordinary character; organic follower; vehicle; actor with only a `/droid/` species name (must be `UNCLASSIFIED`); actor with only `droidSystems` (must be `UNCLASSIFIED`); flag spoofing on the wrong container.
- Modifier parity (case 3): NPC follower and `droid` with identical ledger hardware produce identical component modifiers; ordinary NPC produces none; stock-statblock droid still withholds them (reuses `shouldSuppressComponentModifiers`). `ModifierEngine` cannot load under plain Node (documented), so the gate is the extracted pure function plus a source-contract assertion that both sites call it, following `droid-hardened-source-modifier-consumption`.
- Hotfix: `isFollowerDroid` unchanged for every existing follower fixture; wallet routing tests unchanged.

### 6.4 Behavior changes that need an explicit owner go-ahead before U-1 is coded

1. **Follower component modifiers (F1).** Followers that currently get no droid-part modifiers would start receiving them. That changes follower totals. It is the consistent outcome (same component, same rule) but it is a mechanics change, so it is flagged rather than assumed.
2. **Follower 0-HP outcome (F3).** Adopting the profile in `damage-resolution-engine` would change what happens to an NPC-typed droid follower at 0 HP. Deferred to a separately reviewed U-1b.

### 6.5 Mutation checks (to be added with U-1)

Profile ignores `system.isDroid`; profile accepts species name; profile accepts `droidSystems` presence; modifier gate reverts to type-only at either site; stock-statblock suppression bypassed for followers; ordinary NPC classified as droid; proxy classification diverges from the profile.

### 6.6 CI enforcement

The profile test joins the droid workflow and the rolling suite. The census ratchet fails if RULES `TYPE_ONLY` sites in `scripts/engine/effects/modifiers/` or the follower patch regrow, and records the total so later waves can lower it.

## 7. Subsequent waves (plan only)

- **U-2 Component identity and prerequisites.** One prerequisite API with an explicit context: `PENDING_BUILD` (draft + pending selections authoritative, Chargen and follower creation) vs `COMPLETED_ACTOR` (resolver-confirmed ledger authoritative; embedded Items present-not-confirmed; no synthesized Heuristic Processor; no name-based classification). Thin compatibility adapters keep `actorMeetsDroidSystemRequirement`'s public signature until callers move. Consolidate the four Heuristic-default sites (G5).
- **U-3 Model projection.** Read-only adapter from source entries to existing contracts; prototype with ONE entry only after its `systems` / `equipment` are mechanically certified (none are today). Remove the `DroidFactory` clone fallback only after the normalization failure modes are enumerated (F5). Link store listings to `sourceEntryKey`.
- **U-4 Commerce.** Component acquisition vs installation (Item vs ledger), reusing `StoreEngine`, `TransactionEngine`, `ActorEngine`, `DroidFactory`, `DroidCustomizationEngine` in their existing roles; revalidate price and eligibility at commit; never convert a missing price to free.
- **U-5 Presentation.** Garage instance picker (C-3B) on the shared contracts; shared component fact labels across the four interfaces; then C-3C dead-module removal.
- **U-6 Runtime.** Foundry V13 disposable-world certification of create / purchase / install / remove / reload / combat for PC, NPC follower, stock import and Store.

## 8. Restrictions honored

No merge, no `main`, no ActorEngine / TransactionEngine change, no new component database or installation engine, no source HOLD promoted, no ruling on DROID-RD-001/-002/-003 or SGD-HOST-002, no stock-statblock auto-conversion, no legacy-equipment reconciliation, no deletion. The 99 PASS / 23 HOLD boundary and all certification limits are unchanged.

## Appendix - commands run (all read-only)

- `node tools/audit-droid-actor-classification-sites.mjs` (and `--list=RULES:TYPE_ONLY`, `--list=:EXTENDED_HEURISTIC`, `--list=RULES:TYPE_OR_FLAG`).
- Source-book tally: 14 files, `sourceEntries` total **234**; every entry's `certification` = `identityStatus: pdf-reviewed`, `mechanicalStatus: partial`, `runtimeStatus: not-tested` (234 / 234); census listing sum 13+46+24+40+11+22+8+0+12+15+5+3+29+6 = 234 (`droid-publication-census.md`). 10 astromech-like entries (CLONE-DROID-006, CORE-DROID-002, FORCE-DROID-002, SGD-DROID-031, SGD-DROID-034, THREATS-DROID-003/-004/-005 and two further). R2 entry: `systems {}`, `equipment {}`, `pcConstruction {heroEligibility: 'allowed'}`.
- Legacy pack (`packs/droids.db`): 194 records; 171 `droidSystems`; 0 `installedSystems`; 0 `droidCalculationMode`; 0 `stockDroidImport`; 194 `type: droid`.
- Line-level reads: `ModifierEngine.js:340-346,1655-1660`; `domain/droids/droid-part-schema.js:643-715`; `data/prerequisite-checker.js:77`; `damage-resolution-engine.js:412-470`; `damage-packet-rules.js:170-178`; `droid-factory.js:56-131`; `store-checkout.js:140-180,425-455`; `stock-droid-normalizer.js:185-200`; `follower-droid-garage-hotfix.js:1-123`; `customization-bay-app.js:346`; `follower-mutation-planning.js:222-262`.

## Appendix: pre-existing guard failure observed during U-0 (not changed)

`node tools/check-droid-customization-validation-authority.mjs --strict` exits 1 on the U-0 base (b76c55d) and without the U-0 files (verified by stashing them): check "5: installed-state verification" expects `normalizeDroidCustomizationChangeSet()` to call `collectInstalledDroidPartIds()`. This guard is **not** one of the five guards run by `.github/workflows/droid-v2-gate-a.yml`, so CI does not cover it. Whether the guard is stale or the normalizer lost its check is **UNVERIFIED**; U-0 is read-only and does not change either. Recommended for U-1 review: read the normalizer and decide whether to repair the guard or add it to CI.
