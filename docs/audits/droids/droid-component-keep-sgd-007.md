# Droid component KEEP-007 — SGD locomotion, shield and utility mechanisms

**Date:** 2026-11-02. **Branch:** `audit/droid-publication-census-2026-10-29`. **Source:** Original rendered *Scavenger's Guide to Droids* PDF; printed pp51-52,58-63 and Table 3-2. **Packet:** `data/audits/droids/component-keep-source-facts-sgd-007.json`.

## Printed installation taxonomy (p51)

**A droid accessory integrated directly into its chassis is a system. Appendage-attached or carried equipment is a possession.** This explicit source distinction means published table entry/presence in `RAW_OVERLAY` cannot automatically license Garage installation. Actor-owned appendages, exterior attached tools, portable controllers and separate handheld devices need host modeling.

## Nine reviewed records

| Identity | Printed cost | Printed weight | Availability | Current live representation |
|---|---|---|---|---|
| Burrower Drive | 200 * sizeCostFactor * selectedSpeedSquared | 50 * sizeCostFactor | Restricted | overlay only |
| Underwater Drive | 20 * sizeCostFactor * selectedSpeedSquared | 10 * sizeCostFactor | Licensed | overlay only |
| Shield Expansion Module | 50 * currentShieldRating * sizeCostFactor | 2 * currentShieldRating * sizeCostFactor | Military | raw + overlay |
| Radiant Heat Element | 200 | 20 * sizeCostFactor | - | overlay only |
| Internal Grapple Gun | 100 * sizeCostFactor | 2 * sizeCostFactor | - | overlay only |
| Mesh Tape Dispenser | 10 * sizeCostFactor | 5 | - | overlay only |
| Micro Shield | 600 * sizeCostFactor | 10 * sizeCostFactor | Licensed | overlay only |
| Survival Kit | 100 | 1 | - | overlay only |
| Taser | 250 | 2 | Licensed | overlay only |

Eight of nine are **overlay-only and have no source price or weight in the shared registry**, so the generic default cost helper may return zero; a completed purchase was not tested.

## Highest-risk defects

**Shield Expansion Module** (SGD pp59,62). Printed cost is **50×selected shield SR×size cost factor** credits, weight **2×SR×cost factor** kg, Military. The raw cost/weight callbacks accept `shieldRating` but default to **SR5**. `computeDroidPartCost` calls function-valued price with only the droid cost factor; without the actual SR a Medium SR20 module can quote **250 credits/10kg instead of 1,000 credits/40kg**. This issue is separate from the previously identified wrong size-factor map (seven of nine sizes).

**Shield protection** activates with a standard action, protects a **selected adjacent square**, gives only a **Medium or smaller occupant** the droid's current SR while the occupant remains adjacent. Host droid must be Small+; Small/Medium max one module, Large+ max two for different squares. Tracking an attached ally rather than a square would be incorrect.

**Burrower Drive** (SGD pp52,59): 200×CF×speed² credits, 50×CF kg, Restricted. Underground vertical/horizontal movement at half speed. Successful melee drill attacks deal droid's published Self-Destruct damage by size and inflict **-1 persistent condition step on the attacking droid per successful hit**; not a free heavy melee weapon.

**Underwater Drive** (pp52,59): 20×CF×speed² credits, 10×CF kg, Licensed; swim speed equals land speed. Printed example of factory inclusion on water-world models is not universal free equipment for PC builders.

**Radiant Heat Element** (pp58,61): 200 credits, 20×CF kg. Highest setting damages adjacent characters who **end** their turns there for 1d4 fire; droid itself loses 1 HP each turn. Requires active setting, not always-on aura.

**Mesh Tape Dispenser** (pp58,60): 10×CF credits and **flat 5kg**, targets within appendage reach (normally adjacent); successful melee entangle can choose arms (-2 attacks / DEX skills) or legs (-2 speed squares / no running). Pin feat + successful opposed grapple extends pin **until tape is removed**.

**Micro Shield** (pp58,60): Installed model costs 600×CF and weighs 10×CF, Licensed; swift activation gives +1 equipment Reflex. **Separate handheld** model costs 400 credits, powered continuously one hour per energy cell; separate economy/ownership host.

**Internal Grapple Gun** (pp58,60): 100×CF credits, 2×CF kg; standard-action grapple firing, internal 10-square/15m cord, removable as free action; external magazine to 100m is a separately sized resource, not unlimited range.

**Survival Kit** (pp58,63): 100 credits, 1kg; +4 **total** to a droid's successful Aid Another on Survival, not +4 in addition to base +2. Contains tools/consumables; exact physical system versus carried host requires source-backed modeling.

**Taser** (pp58,63): 250 credits, 2kg, Licensed; ranged nonlethal organic incapacitation, ion-like effects on droids, usable in melee as electroshock probe. The SGD paragraph supplies **no numeric damage dice**, so overlay's 2d6 needs other printed authority before an executable weapon certificate.

## Source/production statuses

Nine source-fact rows, **11 issue records**, cumulative **99** component source-fact rows (**72 KEEP-track rows**). These are **not counts of uniquely certified published component identities**. Zero full mechanical certificates, production migrations, app parity tests or Foundry runtime certifications.

This audit is source-only. Authoring-time record/offset/uniqueness checks passed; committed standalone Node script remains unexecuted:

```sh
node tools/audits/droids/verify_component_keep_source_facts_sgd_007.mjs
```

Next: reconcile coverage of all 92 KEEP identities by canonical identity (not row count), then review any uncovered SGD parts and extend beyond Core+SGD. Keep the published 234-statblock project separate.
