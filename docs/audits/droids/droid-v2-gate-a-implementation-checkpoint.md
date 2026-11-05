# Droid V2 clean-cut implementation — Gate A checkpoint

**Branch:** `feature/droid-v2-component-quote-gate-a`  
**Base:** `ebc440f475b2fefd26f9368d99d01592e2abac23`  
**PR:** https://github.com/docflowGM/foundryvtt-swse/pull/1106  
**Status:** WIP / unmerged. Do not authorize installation, commerce or deployment.

## User decisions

- No active player droids. **Do not implement legacy actor migrations**, compatibility shims, dual-read ledgers or upgrades solely to preserve historical actor data. A clean cutover is intended.
- All surviving production fields must have a real consumer or a deliberate explicit block. Text-only or read-only UI presentation is not evidence that a mechanical field is implemented. A correct new resolver is insufficient if the old direct calculators remain active.

## Implemented in this PR

1. `scripts/domain/droids/droid-component-quote-authority.js`: pure single price/weight factor table for all nine Core sizes, official Small-or-smaller accessory-weight exception, source price/mass evaluation with `BLOCKED` and `null` instead of silent zero, explicit range/variant, minimum/maximum size, SR-dependent shield expansion, and deliberate blocking of unmodeled tiered prices (`costWithHigherDefense`, `costIncrement`, `weightIncrement`).
2. `scripts/data/droid-part-schema.js`: uses the pure quote as its price/weight authority. `hydrateDroidPart` carries status and blocking reason. Numeric values on an installed instance cannot override source quotation.
3. `scripts/engine/customization/droid-customization-engine.js`: Garage surfaces quote-blocked state and aborts unknown/unpriced purchase or resale in preview. Transaction engine remains the owner of actual asset/credit mutations.
4. `scripts/engine/progression/droids/droid-trait-rules.js`: seven supported playable size packages' price factors derive from the nine-size pure authority; Fine/Diminutive **cannot** become playable merely because their price factors exist.
5. `scripts/apps/progression-framework/steps/droid-builder-step.js`: builder purchases, size repricing, blocked-value validation and movement speed use pure builder quote delegation. Locomotion/processor replacement checks the net budget requirement. Character-chassis grants are charged at zero only after validating the printed source quote. Removing locomotion/enhancements reprices all dependents. Distinct appendage- and locomotion-enhancement routing supported.
6. `scripts/apps/progression-framework/steps/droid-builder-view-model.js` and `templates/apps/progression-framework/steps/droid-builder-work-surface.hbs`: available-system preview uses the same quote, explicitly disables blocked variants, shows `Unavailable` rather than fake `0 cr`; appendage enhancement action subtype retained. Display quote for shield expansion derives SR from a unique installed generator.
7. Follower `FollowerDroidBuilderStep` inherits the revised builder purchase logic and source quoting; follower-specific permission matrix remains separately owned.
8. Test files `tests/droid-component-quote-authority.test.mjs`, `tests/droid-part-source-quote-adapter.test.mjs`, `tests/droid-builder-v2-quote-integration.test.mjs` cover pure factors, published examples, missing prices/mass, Garage adapter, preview/chargen entry points, resizing, variants, shield SR, stationary speed, and unknown purchases.

## Active field-to-consumer matrix

| Field / input | Authoritative behavior | Consumer |
|---|---|---|
| `size`, `price`, `accessoryWeight` | Nine-size factor lookup; no Medium fallback | Pure quote; part adapter; char builder; view model; Garage |
| `definition`, `sourcePath`, `category`, `subcategory` | Price/weight formula and accessory-vs-locomotion classification | Pure quote and builder routing |
| `speed` | Explicit speed for locomotion source formulas, including stationary zero | Builder purchase/refresh; VM preview; adapter |
| `variant`, `rangeOptions` | Variant must be explicit and exact; cannot select first by default | Pure quote, preview hard-stop, purchase hard-stop |
| `appendageBaseCost`, `appendageBaseWeight`, `baseLocomotionCost` | Dependent quote inputs; missing base blocks | Pure quote; builder's selected locomotion MSRP |
| `selectedInstalledShieldRating`, source `sr` | Derived from one installed shield generator; drives price and mass | Builder; VM; pure quote |
| `sizeMinimum`, `minSize`, `maxSize` | Invalid chassis size blocks quote | Pure quote and VM existing compatibility checks |
| `costWithHigherDefense`, `costIncrement`, `weightIncrement` | Unselected multi-tier model blocked; no misleading base-price purchase | Pure quote |
| `status`, `blockingReason` | Mandatory hard stop; not a free quote | Part hydration; Garage; builder; VM disabled reasons |
| `credits`, `kg` | Source-verified numeric output or null | All above adapters, installed draft fields, budgets and totals |
| `isGranted`, `isDefault` | Construction entitlements applied after source quote | Builder state, repricing, spend ledger, VM grant price |
| `quoteCostLabel` | Published-quote rendering, never blank or fake zero | Handlebars available-system cards |

## Unresolved field and authority gaps — **not complete**

- **Source/status/host gates:** 122 Core+SGD audited identities include 99 historical source PASS (provisional under errata) and 23 HOLD. A valid numeric quote still does **not** prove source legality. Do not merge while held items could reach a final install or purchase. The 137 source fixtures and 26 V2 acceptances are not yet executed as application parity tests.
- **Permissions and physical ownership:** `availability`, legal purchaser, install host/appendage, actor physical equipment owner, restrictions, action/resource prerequisites and possession-vs-chassis classification have not been unified into the purchase grant. Garage quote success must not be treated as installation permission.
- **Unconsumed mechanical fields:** `runningSpeedMultiplier`, `armorBonus`, `maxDexBonus`, `armorCheckPenalty`, `specialBonus`, `behavioralInhibitors`, `createsUnarmedAttack`, `weaponStats`, processor inhibition and other printed flags require proof of a real calculation/action consumer, not just presence in `DROID_SYSTEMS` or a read-only panel. These need a field-by-field ownership audit before completion.
- **Grant/source conflict:** `DROID_SYSTEMS.processors.heuristic.isFree = false` and current chargen's starting free Heuristic grant disagree. Do not silently resolve this without Core printed-rule and creation-package adjudication.
- **Downstream:** `DroidSystemsResolver` display and installed/possessed authority, Store checkout, legal owner, rollback parity, faction permissions, follower-only gates and Foundry runtime remain uncertified.
- **Source data:** `droid-systems.js` includes numeric definitions for some source-HOLD identities and leaves other source-known component variants absent. An incomplete source catalog cannot be declared production-ready just because it is now quoted consistently.

## CI and test boundary

A first CI run at `fa4642f` passed the new focused quote/adapter tests and reported **428 passed, 1 failed** in rolling-system tests; the failure was the separate `phase-5c-canonical-production-negative.test.mjs` classification-freshness check for numerous `data/audits/droids/*` files. The newer builder tests and changes still require a complete exact-head CI result. Do not claim all regression tests pass or that Foundry ran.

## Next safe implementation

1. Obtain exact-head CI results for the new builder integration tests, correct any failures.
2. Reconcile the published Core+SGD identity/source/errata/status registry and explicit HOLD gate before enabling actual installation.
3. Complete catalog field ownership/consumption mapping and eliminate unused runtime fields or wire them to a designated authority.
4. Remove remaining independently priced UI and Store/actor paths; implement transaction parity under the existing TransactionEngine.
5. Validate all 26 migration acceptances and 137 source expectations, followed by manual Foundry V13 behavior after merge.

**Policy:** no actor compatibility layer, no competing SSOT, and no production authorization while source legality or a mechanical consumer is unresolved.


## 2026-11-05 — Source review authority and field-consumer checkpoint

**New source-review gate.** `scripts/data/generated-droid-component-source-status.js` is produced deterministically from `component-mechanical-certification-ledger.json` by `tools/build-droid-component-source-status.mjs`. The targeted CI performs `--check` to catch changes in either direction. It retains 122 exact published identities, 99 source PASS and 23 source HOLD. These are source facts, not application certifications.

`scripts/domain/droids/droid-component-source-review.js` resolves known source identity, conditional holds, unrecognized definitions and false legacy aliases. The same source decision precedes numeric quoting from the PC/follower builder, preview and Garage's `droid-part-schema`. The five locomotion-composition HOLDs permit numeric calculation only for **explicit unrestricted first-system initial construction**; not additional or restricted locomotion and never post-creation by default. Other HOLDs remain blocked. This is **not yet** a host/slot/possession or retail authorization gate.

**Translator mismatch:** Core's certified Translator Unit has four separately priced DC/weight tiers (DC20: 200 cr/1 kg; DC15: 500 cr/2 kg; DC10: 1,000 cr/4 kg; DC5: 2,000 cr/8 kg). The existing `basic-translator`, `advanced-translator` and `universal-translator` entries are not those four source tiers. They are blocked until a canonical variant model and real user selection are implemented. Do not restore old fixtures or silently map aliases to a cheaper tier. Existing Garage debit/resale regression tests now use the source-reviewed Plasteel Shell to preserve their financial/rollback coverage.

**Shared quote consumer:** `scripts/domain/droids/droid-builder-quote-consumer.js` is called by the actual builder and preview. It derives selected locomotion MSRP for enhancements, actual selected speed, and an installed shield generator's SR. No duplicate price formula is supposed to survive in the view model. The direct Foundry `DroidBuilderStep` import is not runnable in a bare Node test due to the `ApplicationV2` shell dependency; the targeted tests exercise the pure production dependency service and live preview, and source-inspect the builder delegation. This must not be described as a Foundry UI runtime test.

**SGD-HOST-002 verification:** `tests/droid-sgd-host002-arithmetic.test.mjs` executes **126 accessory source arithmetic examples + 9 locomotion exception examples** using the pure quote function, including the corrected mass for Gyroscopic Stabilizers. Three accessories (Courier Compartments, Radiant Heat Element, Silence-Bubble Generator) have fixed *credit* prices while their accessory *mass* scales; the fixtures prove this difference. The remaining **two physical-host exception cases** are asserted as unresolved evidence, **not** exercised Store/actor installation outcomes. Thus **135 arithmetic fixtures executed; zero live Foundry host certifications**.

**Field-consumption reality:** `tools/audit-droid-source-field-ownership.mjs` enumerates the 84 current source definition records and each unique direct field on those records. The initial verified inventory finds **48 unique direct fields**:
- **14** have an active quote/source-gate treatment (not necessarily every printed mechanical effect).
- **9** are principally presentation fields, which must not be counted as rules execution.
- **25** still require concrete mechanical consumer proof or an explicit source-correct block/removal. They include armor bonuses/penalties, heavy-armor running speed, processor behavioral inhibitors, size/dependency restrictions, appendage attack capabilities and specialized weapon properties.

The audit CI intentionally rejects a newly introduced or renamed unclassified field. Its separate `--certify` mode **must fail** until the 25 uncertain direct fields are independently proven. Nested rule payloads (`specialBonus`, `weaponStats` and others) need a subsequent field-level pass; do not treat the 48 top-level census as nested mechanical completion.

**Remaining hard blockers:** four-variant Translator Unit and other omitted canonical items; 23 source HOLD scenarios outside printed safe subsets; physical integrated/possessed/handheld host decisions; actual enforced legality/availability; inventory/encumbrance and condition/combat effect application; Store atomic asset+wallet transactions; full follower/PC/Garage/Store parity; live Foundry V13 validation. No legacy-actor migration is needed or planned.

**CI boundary:** targeted `Droid V2 Gate A (targeted)` runs quote, source snapshot, source HOLD, live preview, old Garage wallet/rollback, and SGD-HOST-002 numerical tests. The broad rolling suite still contains an independently observed `phase-5c-canonical-production-negative.test.mjs` stale classification issue for audit data that predates this implementation; do not hide or waive this failing guard in order to merge.
