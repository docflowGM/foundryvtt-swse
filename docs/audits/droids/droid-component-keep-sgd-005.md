# Droid component KEEP-005 - eight SGD overlay-only components

**2026-11-02**. Source: *Scavenger's Guide to Droids* printed pp57-61 (PDF pages 58-62), visually checked, particularly Table 3-2 pp58-59. Machine source fact packet: `data/audits/droids/component-keep-source-facts-sgd-005.json`.

All eight IDs exist only as `RAW_OVERLAY` definitions in `scripts/data/droid-part-schema.js`, not the `DROID_SYSTEMS` raw part catalog; **all eight lack cost and weight in the shared live definition**. They are not free source products; the default quote helper may return zero absent explicit override. No completed transaction has been tested.

| Component | Published credits | Published weight | Availability | Source-critical rule |
|---|---|---|---|---|
| Electric Defense Grid | 3000 * costFactor | 100 * costFactor | Restricted | Droid takes damage from melee attack |
| Hidden Holster | 500 * costFactor | 2 * costFactor | Licensed | itemSize, open, drawOrHolster |
| High-Speed Cutting Torch and Welding System | 2500 | 500 | Licensed | weldingTime, torchRangeSquares, torchDamage |
| Holographic Image Disguiser | 20000 * costFactor | 20 * costFactor | Restricted | basic, advanced |
| ID Dodge | 5000 | 1 | Illegal | swap, scope |
| Improved Coordination Circuitry | 1000 | 1 | - | scope, aidAnotherTotalBonus, notAdditionalFour |
| Internal Defenses | 10 * costFactor | 1 * costFactor | Licensed | Unauthorized panel opening |
| Multispectrum Searchlight | 100 | 2 | - | minimumDroidSize, lightRangeKm, lightTypes |

## Critical mechanical acceptance boundaries

**Electric Defense Grid:** 3,000×CF cr, 100×CF kg, Restricted. If a melee attack *damages* the droid, attacker automatically suffers 5 energy damage, **except** when attacking with an energy-damaging melee weapon (including lightsabers). No attack roll from the droid and no effect on a melee attack that fails to damage it.

**Hidden Holster:** 500×CF cr, 2×CF kg, Licensed. Must mount in leg, hold a weapon one size smaller or less. Free action opens device; drawing/holstering is swift, and Quick Draw benefit only applies if droid has **BAB +1**. No blanket free draw for unqualified droids.

**High-Speed Cutting Torch and Welder:** 2,500 cr, **500 kg**, Licensed, Medium or larger. Torch does 4d10 at 1 square. Only after two or more consecutive rounds of contact on an *object* does it ignore 5 DR and reduce object's threshold by 10; not a permanent armor debuff against creatures. Welding is normally half usual duration.

**Holographic Image Disguiser:** 20,000×CF cr and 20×CF kg base, Restricted. Basic supplies +10 equipment to Deception (Deceptive Appearance). Advanced **double price** adds sensor-driven environmental appearance and permits a full-round action disguise at no penalty. Advanced weight is not separately established.

**ID Dodge:** 5,000 cr, 1 kg, Illegal. Can substitute Deception for Use Computer *only* on security devices relying on organic biometrics, not all computer slicing.

**Improved Coordination Circuitry:** 1,000 cr, 1 kg. Purchase is keyed to **one trained skill**. The acting droid must be trained and both droids need circuitry; successful Aid Another yields **+4 total**, not +4 extra. Do not conflate with Synchronized Fire Circuits.

**Internal Defenses:** 10×CF cr, 1×CF kg, Licensed. Unauthorized maintenance-panel opening triggers **1d20+5 vs Fortitude**; success does **1d8 + half heroic level**. System depletes after **10 attacks** or can be disabled by **DC25 Mechanics and 1 hour**. Track use count independently of item installation.

**Multispectrum Searchlight:** 100 cr, 2 kg; handheld or installed, Tiny+ eligible. Visible/IR/UV light up to 6 km; +2 equipment on suitable Search/Notice Perception, stacking with helmet/improved sensor packages. For blinding, standard-action attack vs each target Fortitude in a 6-square cone: on success -5 to specified rolls/skills, on failure -2; all cone targets -10 Stealth; expires end of droid's next turn. Attacks are **not** automatic blinding or simple damage.

## State, tests and next

Source-fact packet rows **8**, cumulative **82** across component sprints, KEEP-track rows **55**. These are **not 55 individually mechanically certified KEEP identities**. No full mechanical, production, application parity or Foundry runtime certificate has been earned, and the printed PDF is authority rather than NPC examples.

In-memory shape checks ensure unique IDs, page mapping and zero promotions. Reproduce:
```sh
node tools/audits/droids/verify_component_keep_source_facts_sgd_005.mjs
```
This standalone Node validator, full application suite, and Foundry UI were **not run** at this checkpoint.

Next: remaining SGD communications and processor controls (Communications Jammer, Remote Receiver Jammer/Signal Booster, Hidden Core, Droid Remote Control, etc.), then review cross-book identity completeness and prepare controlled unified price/permissions tests for Garage, chargen, follower and Store.
