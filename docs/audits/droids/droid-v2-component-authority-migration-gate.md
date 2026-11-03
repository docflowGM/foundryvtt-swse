# SWSE Droid Components — V2 Quote, Weight, Host and Transaction Gate

**Audit only | 2026-11-03 | Not production authorization**

## Purpose

Prepare a strict, fail-closed implementation boundary for the Foundry VTT v13 V2 migration using the now reviewed Core + SGD source and official errata. The scope is a new **single rules authority** for component pricing, component weight, installed versus possessed equipment, construction eligibility, resource/action prerequisites and transactional application.

**Source evidence:** `data/audits/droids/droid-component-official-errata-authority-001.json`, `data/audits/droids/droid-component-sgd-errata-host-002.json`, `data/audits/droids/droid-component-mechanical-hold-triage-001.json`, and the 122-identity mechanical certification ledger.

**Acceptance packet:** `data/audits/droids/droid-v2-component-migration-acceptance-001.json`. **Reproducible test:** `tools/audits/droids/verify_droid_v2_component_migration_acceptance_001.mjs`. Contains **26 unexecuted source-backed acceptance scenarios**. No module, compendium, actor or Foundry API mutation.

## Verified code points that must converge

| Consumer/authority | Current path | Static discovery and gate |
|---|---|---|
| Primary droid part schema | `scripts/data/droid-part-schema.js` | `getDroidCostFactor()` uses Fine .125, Diminutive .2, Tiny .25, Small .5, Huge 4, Gargantuan 8, Colossal 16 — contradicting printed credit factors. `computeDroidPartCost()` can return **zero on missing definitions**, clamp negative construction credits to zero, or extract minimum of a `5000+` marker as a sale quote. `computeDroidPartWeight()` uses the **same** cost factor, not official small accessory-weight factor. |
| Chargen trait package | `scripts/engine/progression/droids/droid-trait-rules.js` | Correct displayed credit factors for Tiny through Colossal; **Fine and Diminutive do not exist** in `DROID_SIZE_PACKAGES`, and unknown packages fall back to Medium. Do not treat this subset as nine-size canonical authority. |
| PC chargen | `scripts/apps/progression-framework/steps/droid-builder-step.js` | Imports progression size cost factor and calls `DROID_SYSTEMS.locomotion.costFormula(speed,costFactor)` directly. Must not diverge from the shared V2 quote. |
| Garage | `scripts/engine/customization/droid-customization-engine.js` | Calls `computeDroidPartCost()` and `getDroidCostFactor()` from schema. Uses droid draft data and installed component resolution. Price and physical-install authority need one source. |
| Follower builder | `scripts/apps/progression-framework/steps/follower-steps/follower-droid-builder-step.js` | Uses follower-chassis workflow; ensure the same price/weight, printed source legality and installed-versus-possessed host gate. |
| Store checkout | `scripts/apps/store/store-checkout.js` | Needs authoritative quote/availability/owner and atomic purchase/debit/apply/rollback, including source HOLD blocks. |

These are **static code findings**, not measured failures of every UI flow. The relevant source file SHA references are embedded with the acceptance cases so reviewers can detect subsequent changes.

## Required source API contract

Recommended *pure* interface, subject to implementation review:

```js
resolveDroidComponentQuote({
  canonicalId, sourceVariant, size, operationPhase,
  selectedHost, selectedAppendage, actualSpeed,
  locomotionSlotOrdinal, selectedInstalledShieldRating,
  legalPurchaser, physicalEquipmentOwner,
  creditContext, sourceRuleVersion
})
// Returns a discriminated status:
//  { status: 'OK', credits, kg, priceFactor, weightFactor,
//    hostClass, installationEligibility, ruleSource, actionContract }
//  { status: 'BLOCKED' | 'NEEDS_SOURCE_ADJUDICATION',
//    credits: null, kg: null | 'SOURCE_UNLISTED', reasons, ruleSource }
```

The first implementation step is **not** to copy all 122 historical entries blindly. Author a canonical source-aware registry with deliberate variant IDs, source/errata precedence, applicability/ownership scope, and explicit `UNKNOWN` or `HOLD` fields. Do not allow an unrecognized component to become free through `return 0`.

### Rules invariants

- **Separate factor functions:** Credit cost uses Core size factor, while eligible **droid accessory weight** uses the errata replacement factor for Small and smaller; printed **Locomotion** weight retains normal factor. An item may be a droid accessory **and a possession**, as with appendage-mounted Micro Shield.
- **Host authority:** A chassis-integrated accessory can become an installed droid system only with its prerequisites; attached-to-appendage and carried accessories are possessions. Facility/starship stations are external assets. The physical ownership state must be explicit, not inferred from the table's broad "Accessory" heading.
- **Canonical actor ownership:** Postcreation systems use `system.installedSystems` as authority; `system.droidSystems` may represent chargen draft/stock descriptors, never a second granted component ledger. Starting systems have a distinct carrying-capacity exclusion under official errata.
- **Cost safety:** A construction price offset (Remote Receiver -500 credits) cannot create Store cash back; a custom-build 5000+ credit minimum is not exact price; table/prose conflicts remain blocked unless source adjudicated. Required variable inputs (speed, SR, selected appendage, variant, host) cannot silently default to arbitrary values.
- **Combat/rules:** Synchronized Fire Circuits = **+5 on a qualifying successful Aid Another**, from official errata. Shield expansion uses **installed source SR**, not SR5 default. Do not grant new action, weapon damage, weapon proficiency, carrying capacity, or HP regeneration from descriptive flavor.
- **Cross-app:** Garage, PC chargen, follower and Store call the same pure quote/spec authority. App-specific permissions and transaction handling may differ, but arithmetic and source precedence must not. All Store mutations must atomically validate, debit, install/possess, and roll back on failure.

## Ordered authorization gates

| Gate | Required acceptance | Deployment status |
|---|---|---|
| A — Rule-source purity | Price/weight vectors match all official errata and 137 SGD tests, with known source gaps failing closed | **Not implemented** |
| B — Identity and variant migration | Resolve 122 canonical identities, source-specific aliases and variants, five repo-only candidates without destructive data rewrites | **Not implemented** |
| C — Host and state ownership | Enforce chassis vs possession vs external; enforce `system.installedSystems` and prevent draft double grants | **Not implemented** |
| D — Four-app parity | Garage / PC chargen / follower / Store receive same canonical quote and eligibility decisions | **Not tested** |
| E — Commerce | Credit debit, refund policy, invalid-quote rejection, rollback and race/duplicate-buy tests | **Not tested** |
| F — Runtime | Foundry V13 UI, actor reload, shields/actions/installed effects and migration fixtures pass | **Not tested** |

The **26-case acceptance packet** includes Fine/Diminutive fallback guards, Tiny armor and courier mass, Small shield-generator and expansion arithmetic, Small underwater locomotion, accessory-possession Micro Shield, ambiguous Silence-Bubble host, official +5 Synchronized Fire rule, nonrefundable negative construction discount, unresolved custom-build prices, atomic Store behavior and starting/postcreation encumbrance.

## Critical warning on certification counts

The historical Core+SGD mechanical ledger still shows **122 reviewed, 99 initial source PASS, 23 HOLD**. Its 99 successful base-book records are **provisional under the subsequent official errata overlay**; none of the 23 unresolved HOLDs has been promoted by this host-scope review. Source audits and test specifications do not constitute live production implementation, application parity, or Foundry runtime certification.

No structural droid part should be added to `packs/equipment.db` merely to make it purchasable. Preserve the distinct 234-stock-droid publication audit, and do not claim completeness across all other Saga sourcebooks.

**Next engineering decision:** approve a bounded first PR implementing pure rule-factor/quote validation **without altering actor contents or Store transactions**, run focused 26 + 137 source expected-value fixtures, then independently review before widening implementation. This handoff is audit evidence only and does **not** authorize the code change.
