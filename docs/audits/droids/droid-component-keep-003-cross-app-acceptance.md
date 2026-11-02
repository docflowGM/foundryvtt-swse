# Droid component cross-application pricing authority — KEEP-003 acceptance fixtures

**Date:** 2026-11-02. **Scope:** Source-grounded *test specifications*, not executed tests. **Evidence:** `data/audits/droids/component-keep-003-cross-app-fixtures.json`. Source: Core pp.187–190,194–195,197, rendered and visually checked in prior KEEP packets. Live code inspected on `audit/droid-publication-census-2026-10-29`.

## What the code actually delegates

The Garage's `DroidCustomizationEngine` imports `computeDroidPartCost` and `getDroidCostFactor` from `scripts/data/droid-part-schema.js` and uses them for part entries and system costs. PC chargen's `DroidBuilderStep` imports `getDroidSizeCostFactor` from `scripts/engine/progression/droids/droid-trait-rules.js`, and its `_calculateLocomotionCost()` calls the **raw DROID_SYSTEMS source cost formula**. Thus source cost factors and purchase policy do not currently originate in one authority.

The shared `resolveVariantCost()` passes **size cost factor** as the first argument to any function-valued `source.cost`. This correctly supplies inputs to some ordinary appendages but is wrong for **Telescopic Appendage / Climbing Claws**, whose raw callbacks expect **selected appendage cost**. The shared weight helper similarly passes cost factor to a Telescopic weight callback that expects **base appendage weight**. An explicit caller-supplied price can mask this, so this is a static *default-path* problem, not evidence every UI path is wrong.

Follower builder is a consumer of draft droid state, while Store checkout is the purchase boundary. Their full item-specific quote/debit behavior is **not** verified by these source inspections, and is therefore marked `NOT_TESTED`.

## Nine source-expected fixtures

| ID | Purchase scenario | Published result | Status |
|---|---|---|---|
| PAR-LOCO-001 | Small SR5 published factor | 5000 credits | specification only |
| PAR-LOCO-002 | Medium Telescopic Hand cost | 100 credits | specification only |
| PAR-LOCO-003 | Medium Stabilized Tool mount | 50 credits | specification only |
| PAR-LOCO-004 | Medium Walking base locomotion | 360 credits | specification only |
| PAR-LOCO-005 | Extra Legs with Medium Walking | 720 credits | specification only |
| PAR-LOCO-006 | Secondary locomotion cost surcharge | 1000 credits | specification only |
| PAR-LOCO-007 | Restricted locomotion 1/10 price | 36 credits | specification only |
| PAR-LOCO-008 | Climbing Claws printed cost conflict | **BLOCKED: printed prices conflict** | specification only |
| PAR-LOCO-009 | Jump Servos printed cost conflict | **BLOCKED: printed prices conflict** | specification only |

Important examples: **Small SR5** costs 5,000 credits and weighs 20kg, while shared Garage factor gives 1,250 credits/5kg; **Medium Telescopic Hand** should price at 100 credits/10kg (twice 50-credit, 5kg Hand), while generic function-value handling receives CF 1 and computes 2; **Medium Stabilized Mount** is 50 credits/10kg, current raw formulas produce 125/2. **Medium Walking** base is 360 credits; the default chargen grant may correctly waive that purchase debit while preserving its printed source value.

Core p188 additional locomotion costs (second: 500×CF, etc) and p189 exclusive/limited restrictions (1/10 ordinary cost) are distinct adjustments needing complete host-level tests. **Climbing Claws and Jump Servos are deliberately blocked from assigning canonical prices**, because printed descriptive paragraph and Table 11-5 differ in cost base. The packet preserves both possible examples, not an adjudication.

## Required implementation certification

1. Price = published part + selected actual appendage/locomotion host + actual size + variant + applicable purchase-mode grants/discounts. No unsupported cost factor table or bare *function callback* may override printed host relationships.
2. Give all four consumers fixtures for price preview, validation, exact debit, rollback, physical mount and installation ledger, plus follower-only exceptions. These are **future tests**, not already passed.
3. Never automatically offer a new independent locomotion system without any required higher-order additional-system charge and legible restrictions.
4. Do not silently convert price conflicts into a user-visible free component.
5. Restrict publication evidence to this Core packet; a later SGD check may add rules, not authorize changes here.

**No runtime files changed; no tests executed.** This checkpoint is a handoff-ready acceptance contract for an approved future production migration.
