# Droid component KEEP-003 — Core locomotion and appendages

**Date:** 2026-11-02. **Branch:** `audit/droid-publication-census-2026-10-29`. **Authority:** Original Core Rulebook PDF (rendered), printed pp. 188–190 and 194, with the accessory introduction on p.193. **Evidence JSON:** `data/audits/droids/component-keep-source-facts-core-003.json`.

## Scope and separation

This tranche checks **16 existing system/variant rule rows** (five base locomotion types, five ordinary appendage types, and six enhancements). The count is a *source fact row tally*, not an assertion of 16 distinct newly certified identities in the frozen 92 KEEP identity census. There are **zero** complete source-mechanical certificates, runtime migrations, cross-app parity certifications, and Foundry runtime certifications.

## Table 11-3: base locomotion — Core p188

| Published type | Speed up to Small / Medium / Large+ (squares) | Base price formula | Printed table weight |
|---|---|---|---|
| Walking | 4 / 6 / 8 | 10 * droidCostFactor * speedSquares^2 | Not specified |
| Wheeled | 6 / 8 / 10 | 5 * droidCostFactor * speedSquares^2 | Not specified |
| Tracked | 4 / 6 / 8 | 20 * droidCostFactor * speedSquares^2 | Not specified |
| Hovering | 6 / 6 / 6 | 100 * droidCostFactor * speedSquares^2 | Not specified |
| Flying | 9 / 12 / 12 | 200 * droidCostFactor * speedSquares^2 | Not specified |

Core p188 also establishes **extra locomotion system surcharges** (second 500×CF; third 1,000×CF; fourth 2,000×CF; fifth 5,000×CF). Core p189 gives **restricted locomotion = 1/10 normal price**, with two distinct restrictions: Exclusive requires a move action to engage/disengage and allows only move/run actions while engaged; Limited requires Endurance after 1 round (DC10, +1 for each later check) or 10 rounds of unavailability. These are *mechanical purchase variants*, not new base locomotion identities.

The broad raw catalog stores per-cost-factor *weights* (walking 5, wheeled 4, tracked 6, hovering 3, flying 3), but **Table 11-3 contains no weight column**. The reviewed printed pages do not verify those formulas. The source cost factor divergence (7/9 sizes) remains separately documented in `component-core-cost-factor-audit.json`.

## Table 11-4: ordinary appendages — Core p190

| Appendage | Credits × CF | Kg × CF | Source unarmed damage (Medium) | Raw `canAttack` |
|---|---:|---:|---|---|
| Probe | 2 | 0.5 | 1 | false |
| Instrument | 5 | 1 | 1d2 | false |
| Tool | 10 | 2 | 1d3 | false |
| Claw | 20 | 5 | 1d4 | true |
| Hand | 50 | 5 | 1d3 | true |

Printed p190 states that droids **can use appendages for unarmed attacks**, damage is size and appendage type dependent and includes Strength modifier, and any number of appendages does **not** increase actions or attacks. Table 11-4 has attack damage for Probe at Medium and larger, Instrument at Small and larger, and Tool at Tiny and larger. Runtime raw definitions for these three have `canAttack: false` / `createsUnarmedAttack: false`. This is a static mechanical mismatch candidate; actual virtual unarmed routing was not tested. A mounted weapon counts as a Tool appendage unless otherwise noted, and mounted tool/weapon purchase price is **not** included with its mount.

The full nine-size printed unarmed damage matrix is preserved in the JSON so follow-on tests can enforce each legal size/type combination.

## Six enhancement rules and reconciliation blockers

- **Extra Legs (Core p189)**: Walking only; doubles Walking locomotion cost; +50% carrying capacity and +5 stability to avoid being knocked prone. Raw `requiresLocomtion` typo instead of `requiredLocomotion` is a static input-schema risk.
- **Jump Servos (pp189,194)**: Walking only; running-start Jump without moving first, reroll failed Jump checks, and take 10 while threatened. **Printed conflict**: descriptive text doubles *Walking locomotion cost*; Table 11-5 says `appendage cost ×2`, and gives weight `2×CF kg`. Both readings retained.
- **Magnetic Feet (pp189,194)**: Walking/Wheeled/Tracked; cling to moving starship hull. Table 11-5 says **appendage cost ×2** (no listed weight), while broad data comment implies the locomotion enhancement multiplier uses base locomotion cost. Price interpretation needs explicit adjudication.
- **Climbing Claws (pp189,194)**: Walking droid gains climbing speed half Walking speed, reroll failed Climb and take 10 threatened. **Printed price conflict**: p189 doubles Walking cost; p194 lists appendage cost ×2. Additionally current entry requires *Hand or Claw appendage*, but printed passage says *Walking locomotion*. Shared default cost helper passes CF into callback that expects appendage cost.
- **Telescopic Appendage (pp190,194)**: Double the chosen appendage's normal reach, **cost ×2 and weight ×2 relative to selected appendage**. Shared `resolveVariantCost()` supplies **droidCostFactor** to any function-valued `source.cost`. The raw callback expects **appendageCost**; raw weight callback expects appendage weight but shared `computeDroidPartWeight()` passes cost factor. This is a direct static input mismatch, not yet a reproduced Garage purchase.
- **Stabilized Mount (p190)**: Source states **five times the Tool appendage's price and weight**, permits wielding larger weapon as if in two hands; cannot create free extra attacks or free mounted weapon. A Medium Tool costs **10 credits, 2kg**, so mount should cost **50 credits, 10kg**. Raw entry instead has **125×CF credits, 2×CF kg**. Both values conflict.

## Disposition

The machine packet contains ten typed findings and the explicit 16-record review matrix. **Neither apparent source conflict is silently reconciled.** Do not replace a printed price with current repo behavior or reverse-engineer factory grants from stock statblocks.

**Production:** no files in `scripts/`, `packs/`, actors, or Store were changed. **Validation:** checked source page offsets and 16/5/5/6 count invariants in authoring. No CI, full Node suite, Garage, charged construction, Store, or Foundry V13 test is claimed.

Run the committed structural validator:
```sh
node tools/audits/droids/verify_component_keep_source_facts_core_003.mjs
```

**Next:** Audit locomotion and appendage component prerequisites across the actual Garage/progression/follower read models; review Core weight-source provenance and the remaining SGD KEEP rule families. Prepare separate safe production migration only after source adjudications and cross-app test fixtures.
