# Droid V2 clean-cut implementation — Gate A work checkpoint

**Branch:** `feature/droid-v2-component-quote-gate-a`  
**Base:** `ebc440f475b2fefd26f9368d99d01592e2abac23`  
**Status:** implementation in progress; not approved for merge or Foundry runtime certification.

## Product constraints

1. **No existing actor migration.** There are no active player droids. Do not ship legacy-state shims, backfill migrations, dual-read ownership fallbacks or data repair on behalf of historical actors. New actors must be correct.
2. **Strict single source of truth.** `scripts/domain/droids/droid-component-quote-authority.js` is the source for price/size/accessory-weight *arithmetic*. Canonical published identity, variants and errata precedence must be joined with the 122-identity authority before claiming legality.
3. **Every authored production field must have a consuming behavior.** Do not create a new large registry of unused prose, modifier flags, host labels or duplicate numbers. The existing `DROID_SYSTEMS` and `droid-part-schema` fields stay available to known downstream owners; any new fields require tests and a specific consumption path.
4. **No false certification.** The 99 pre-errata source PASS and 23 HOLD are historical source-review results, not 99 working purchase paths. The 26 migration and 137 SGD cases have not been executed against this implementation.

## What Gate A currently changes

- Adds one pure size/quote resolver. All nine price and corrected accessory-weight factors are defined once, without defaulting an unknown size to Medium.
- Makes the live `scripts/data/droid-part-schema.js` adapt existing `DROID_SYSTEMS` definitions to that resolver; an unresolved quote returns `null` credits/kg with a `BLOCKED` status instead of `0`.
- Routes `DroidCustomizationEngine` Garage pricing/preview through the same adapter and blocks unquotable adds/removals instead of granting a free purchase/refund.
- Has `droid-trait-rules.js` derive its seven supported size-package price factor fields from the same authority. Fine and Diminutive are supported by pricing but are **not yet playable size packages**.
- Adds pure-quote and part-schema adapter tests. The tests are **committed but have not been executed by a CI or local Node run in this checkout**.

## New quote fields: consumed, not decorative

| Field | Contract | Active consumer |
|---|---|---|
| `size` | Explicit nine-size input, never Medium fallback | V2 resolver factor lookup; part-schema actor adapter |
| `definition` | Existing source model, no duplicate catalog | Part schema to V2 resolver |
| `category` | Accessory vs locomotive mass domain | V2 resolver weight-factor selection |
| `sourcePath` | Original physical rules group | V2 resolver classification / enhancement base branch |
| `speed` | Explicit selected locomotion speed | V2 resolver speed-dependent price |
| `variant` | Exact named/ranged source variant | V2 resolver variant matching and blocking |
| `appendageBaseCost`, `appendageBaseWeight` | Selected base-dependent enhancement inputs | V2 resolver compound price/mass |
| `baseLocomotionCost` | Already quoted base cost | V2 resolver enhancement cost multiplier |
| `status` | `OK` or `BLOCKED` | Part-schema hydration and Garage compatibility |
| `credits` | Exact nonnegative credit quote or `null` | Part-schema cost and Garage transaction preview |
| `kg` | Actual listed/formula mass or `null` | Part-schema hydration and Garage display |
| `blockingReason` | Actionable reason for hard-stop | Part-schema hydration and Garage preview/UI |

The above is **field wiring**, not proof of source completeness. In particular, type-specific host legality, availability restrictions, real installation slot, actor load, construction-only offsets, starting-system encumbrance and mechanical effects need distinct validated consumers and cannot be inferred just because the numeric quote succeeds.

## Follow-on consumer trace / strict acceptance

| Consumer | Current state after Gate A | Remaining convergence |
|---|---|---|
| `scripts/data/droid-part-schema.js` | V2 quote adapter active | Source/errata registry and HOLD/provenance checks |
| `scripts/engine/customization/droid-customization-engine.js` | Null/unresolved purchase and resale fail closed | Variant/host selection UI and installed-system eligibility |
| `scripts/engine/progression/droids/droid-trait-rules.js` | Price factors delegated | Fine/Diminutive only if full size mechanics are verified |
| `scripts/apps/progression-framework/steps/droid-builder-step.js` | **Not yet converted** | Delegate ALL purchasing/preview prices and masses; remove local arithmetic, preserve legal free starting grants |
| `scripts/apps/progression-framework/steps/droid-builder-view-model.js` | **Not yet converted** | Same quote as builder; display unavailable instead of 0; disable invalid action |
| `scripts/apps/progression-framework/steps/follower-steps/follower-droid-builder-step.js` | **Not yet converted** | Consume parent builder authority, validate follower-only restrictions |
| `scripts/sheets/v2/droid-sheet/droid-systems-resolver.js` | Receives part schema price adapter | Preserve `null`/BLOCKED rather than display as free; distinguish draft vs installed |
| `scripts/apps/store/store-checkout.js` | **Not yet converted** | Source/host quote gate, wallet/owner validation, atomic debit/asset mutation/rollback |
| `scripts/domain/droids/droid-installed-component-resolver.js` | Existing ownership resolver unchanged | `system.installedSystems` remains sole postcreation installed ledger |
| `scripts/data/droid-systems.js` | Existing source metadata reused | Move installable equipment to canonical Item authority in bounded gate, with field/behavior inventory |

## Do not merge this incomplete Gate A

Before authorizing further consumers, execute the new tests and all relevant old droid/garage suites. Then implement source HOLD, host/possession and variant authority, including official errata. No production purchase should be allowed on numeric evidence alone, and all four applications must eventually use one decision. The clean-cut instruction removes historical actor migration work **only**; it does not relax published rules or testing.
