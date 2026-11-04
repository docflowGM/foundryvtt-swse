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
