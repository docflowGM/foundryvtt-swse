# Phase 5D-I-D-B5 — weapon stock configuration

Scope: `hasFoldingStock`, `retractableStockOptional`, and the related stock facts already in the closure census.

## Existing authority reused (no second configuration engine)
Stock position is **owned weapon state** (`flags.swse.fireState.stock`, `'extended' | 'retracted'`), written only by `FireStateStore.setStockState`. Extending / folding is the published **Move action**, paid through the action economy (nothing is written when it cannot be paid). The state feeds the structured brace rule (`firingConstraints.braceRule`) and attack-of-opportunity eligibility. The canonical definition is never mutated. All of this existed from 5D-H; B5 adds the missing refusal below and production-record coverage.

## Change
`setStockState` refuses with `no-stock` when the canonical record **states** the absence (`operation.hasFoldingStock === false`: Targeting Blaster Rifle), including a free GM correction; nothing is spent or written. A weapon that merely does not say (the stock is a purchase option or an installed modification) is not guessed at, and a legacy/custom item has no canonical statement either way.

## Dispositions
| Key | Disposition |
| --- | --- |
| hasFoldingStock | IMPLEMENTED (consumer: `fire-state-store.js` `setStockState`) |
| retractableStockOptional | NON_EXECUTABLE (class STORE): a purchase option with a price (Blaster Rifle, Blaster Carbine). It states no attack rule. |

`retractableStockCostCredits`, `costWithoutRetractableStockCredits`, `braceRequiresExtendedStock` and the two attack-of-opportunity stock keys were already classified by the closure census (store data / duplicates of the brace rule and the carbine rule).

## Operational configuration vs persistent modification
Extending / folding a stock is an **operational configuration** (owned state, a Move action). Installing a retractable stock is a **persistent modification** (the `retractable_stock` upgrade through the upgrade authorities). They must not be conflated: neither changes the other. The future modification schema must represent installation and activation separately.

## Finding left unimplemented (needs a source decision)
The Subrepeating Blaster record carries, only in `authorities[].ruleSelectors.conditionalRules`, a planner-layer note that with the stock extended the weapon takes **rifle proficiency and rifle range** treatment (`proficiencyTreatment: rifle`, `rangeTreatment: rifle`, `weaponFamilyPromotion: false`). No runtime module reads it, the record's only attack profile uses the pistol range profile, and the source text for that Core rule is not in the repository. Per the automation policy an uncertain rule is not automated silently. To implement it a source-backed structured carrier is needed (builder amendment) plus consumption in the proficiency and range resolvers keyed to the owned stock state. This is **not** one of the I-D operation keys and is not counted in any counter.

## Counters
Operation keys without a consumer: 42 → 41 unique (47 → 46 raw). I-D: IMPLEMENTED 33 → 34, NON_EXECUTABLE 2 → 3, deferred 30 → 28. 

Foundry smoke: NOT RUN.
