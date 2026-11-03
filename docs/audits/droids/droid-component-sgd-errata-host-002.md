# SWSE Droid Equipment — ERRATA-SGD-HOST-002

**Source review:** 2026-11-03. Original supplied *Scavenger's Guide to Droids* PDF pp51,52,54–62 (Table 3-1, Table 3-2, descriptions) and official Wizards of the Coast *Saga Edition Errata and Official Clarifications*, Core p186.

**Machine source:** `data/audits/droids/droid-component-sgd-errata-host-002.json`  
**Arithmetic / host-gate fixtures:** `data/audits/droids/droid-component-sgd-errata-host-002-fixtures.json`  
**Validator:** `tools/audits/droids/verify_droid_component_sgd_errata_host_002.mjs`

## Review outcome

All **15** previously flagged SGD host/classification identities have been individually source-reviewed. The source decisions are **12 items in accessory-weight category, 3 explicitly Locomotion (excluded from accessory-weight correction)**. Of the twelve accessories, **10 have established integrated droid hosts**, and **2 retain mounting or equipment-variant questions**. Those two can have a defined accessory-model weight without having a source-authorized chassis installation.

This separates two questions that must never be conflated:

1. **What weight rule applies?** The official errata states that Small-or-smaller droids substitute `2 / droid size cost factor` for their **accessory weight factor**. This does not require the accessory to be a chassis *system*; SGD p51 still calls carried/appendage-attached devices accessories, even though they are **possessions**.
2. **Who owns and installs it?** SGD p51 says an accessory attached to an appendage or carried is a **possession**, not a system integrated directly into the chassis. A correct weight does not authorize writing the item into `system.installedSystems`.

| Canonical component | Printed SGD class | Official weight rule | Small size mass | Host/ownership status |
|---|---|---|---:|---|
| Burrower Drive | LOCOMOTION | Locomotion; no accessory errata | 100 kg | INTEGRATED_LOCOMOTION_DRIVE |
| Gyroscopic Stabilizers | LOCOMOTION | Locomotion; no accessory errata | 8 kg | INTEGRATED_LOCOMOTION_STABILITY |
| Underwater Drive | LOCOMOTION | Locomotion; no accessory errata | 20 kg | INTEGRATED_SWIM_DRIVE |
| Laminanium Plating | ARMOR | Accessory errata | 15 kg | CHASSIS_BUILT_IN_ARMOR |
| Collapsible Construction | ACCESSORY | Accessory errata | 10 kg | CHASSIS_INTEGRATED_FRAME |
| Courier Compartments | ACCESSORY | Accessory errata | 2 kg | CHASSIS_EMBEDDED_STORAGE |
| Electric Defense Grid | ACCESSORY | Accessory errata | 100 kg | ARMOR_OR_OUTER_SHELL_INSTALLED_GRID |
| Hidden Holster | ACCESSORY | Accessory errata | 2 kg | EMBEDDED_LEG_HOUSING |
| Holographic Image Disguiser | ACCESSORY | Accessory errata | 20 kg | CHASSIS_PROCESSOR_AND_PROJECTORS |
| Internal Defenses | ACCESSORY | Accessory errata | 1 kg | CHASSIS_ACCESS_PANEL_DEFENSES |
| Internal Grapple Gun | ACCESSORY | Accessory errata | 2 kg | CHASSIS_INTERNAL_GRAPPLE_REEL |
| Radiant Heat Element | ACCESSORY | Accessory errata | 20 kg | TORSO_INTEGRATED_HEATER |
| Silence-Bubble Generator | ACCESSORY | Accessory errata | 20 kg | **Host/variant unresolved** |
| Shield Expansion Module | SHIELD_GENERATOR | Accessory errata | 10 kg | CHASSIS_INSTALLED_SHIELD_PROJECTOR |
| Micro Shield | ACCESSORY | Accessory errata | 10 kg | **Host/variant unresolved** |

## Factor and numeric acceptance

Source credit cost factors remain **Fine 20, Diminutive 10, Tiny 5, Small 2, Medium 1, Large 2, Huge 5, Gargantuan 10, Colossal 20**. Corrected accessory weight factors are **Fine 0.1, Diminutive 0.2, Tiny 0.4, Small 1, Medium 1, Large 2, Huge 5, Gargantuan 10, Colossal 20**. Fixed printed masses are unchanged, and unlisted variant masses are not zero.

| Example | Source price | Correct weight | Important boundary |
|---|---:|---:|---|
| Small Shield Expansion Module (existing SR5) | 500 cr | 10 kg | Requires an installed shield generator and Small-or-larger host |
| Small Electric Defense Grid | 6,000 cr | 100 kg | Installed in or on armor/outer shell |
| Tiny Courier Compartments | 200 cr | 0.8 kg | Hidden compartment integrated into chassis |
| Small Underwater Drive, speed 6 | 1,440 cr | 20 kg | **Locomotion**, not accessory; regular weight factor |
| Small Silence-Bubble Generator | 3,500 cr | 20 kg | Accessory mass known; physical installation location **not printed** |
| Small appendage-mounted Micro Shield | 1,200 cr | 10 kg | **Possession**, not chassis system; handheld 400-cr variant has separately **unlisted mass** |

The source acceptance file includes **137 cases**: **126 accessory-class numeric variant/size expectations**, **9 locomotion cost/weight exceptions**, **2 explicit host/variant blocks**. This is rules arithmetic and classification evidence, not executed Garage/chargen/follower/Store/Foundry behavior. Numerical results are **not** unconditional eligibility grants. For example, shield expansion requires Small+ and a fitted shield generator; SR20 requires an eligible SR20 shield host.

## Source-backed host conclusions

**Chassis-integrated:** Laminanium Plating (built-in armor), Collapsible Construction (frame), Courier Compartments (internal compartment, including internal arm/leg positions), Electric Defense Grid (armor/shell), Hidden Holster (installed **in** leg), Holographic Image Disguiser (chassis processor + body projectors), Internal Defenses (maintenance/access panels), Internal Grapple Gun (internal cord reel), Radiant Heat Element (torso), Shield Expansion Module (installed projector). All ten use the official accessory-weight factor for Small or smaller.

**Locomotion, not accessories:** Burrower Drive, Gyroscopic Stabilizers, Underwater Drive. Their printed Table 3-2 **Locomotion** subsection retains the normal factor-multiplied weight formula, even if their hardware is integrated into a droid.

**Open physical-host/variant questions (no automatic chassis system installation):**

- **Silence-Bubble Generator:** SGD p62 centers the bubble on a droid but does not name a mounting location. Table 3-2 classifies it as an **Accessory**, so its printed listed-model mass uses the corrected accessory factor. A Small model is 20kg, but the book does not provide a specific chassis slot or proof that every offered configuration is installed.
- **Micro Shield:** SGD p60 says it attaches to an **appendage**. SGD p51 classifies appendage-attached equipment as a **possession**. The listed model has Small price 1,200cr and corrected accessory weight 10kg; a distinct **handheld** model costs 400cr but has no separately printed weight. Neither should automatically populate `system.installedSystems`; treat ownership, coupling, mass and selected purchase variant separately.

## Strict boundaries

- The existing Core+SGD mechanical census remains **122 reviewed, 99 historical source PASS, 23 pre-existing source HOLD**, with official errata precedence required. The two physical host/variant questions in this sprint do **not** promote or replace any of the 23 existing HOLDs.
- No runtime implementation, pack, actor record, source catalog, Store, Garage, PC chargen, follower builder or vehicle was modified.
- Core errata's exclusion of *starting* locomotion/appendages/accessories from carrying-capacity calculations is **different from** post-creation installed equipment's actual physical weight.
- The separate stock-droid statblock audit and uncensused additional sourcebooks are **not** certified by this review.

## Reproduce

```sh
node tools/audits/droids/verify_droid_component_sgd_errata_host_002.mjs
```

GitHub file readback and exact source/fixture reconciliation are performed at checkpoint. The standalone Node test, full CI, application integration tests, and Foundry V13 are not claimed run unless separately recorded.

**Next:** Use the now-source-audited 15 classifications to design a single V2 quote/install authority with explicit `itemHost`, `weightCategory`, `chosenVariant`, `sourceCostFactor`, `sourceWeightFactor`, and `installedSystems` vs possession ledger gates. Implementation remains a separate reviewed change.
