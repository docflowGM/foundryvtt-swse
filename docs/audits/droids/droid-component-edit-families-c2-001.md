# Droid Component C2 — Seven EDIT family source-fact reviews

**Date:** 2026-11-02  
**Scope:** All seven source identity reconciliation families from frozen 35-case queue.  
**Evidence:** `data/audits/droids/component-edit-families-source-facts-c2-001.json`. Source PDFs visually checked (Core pp.191,195-197, SGD pp.52,54,56,58-59,63). TXT used only for locating text. No production runtime changes.

## Key results

| Canonical printed identity | Source identity | Published price / variants | Current registry issue | Status |
|---|---|---|---|---|
| Remote Processor | Core pp.191,195 | 5/50/500/5000 km = 1,000/10,000/100,000/1,000,000 credits | Existing `remote` external processor; receiver is separate | Source facts reviewed |
| Secondary Battery | Core pp.195-196 | 400 credits, 4 kg, 200 h operation | Live battery-backup only 100 credits/2 kg | Numeric defect, implementation pending |
| Translator Unit | Core pp.195,197 | DC20/15/10/5 = 200/500/1,000/2,000 credits, 1/2/4/8 kg | Three existing named variants have incorrect DC/cost/weight semantics | High-priority variant reconciliation |
| Projectile Hand | SGD pp.52,59 | Prose 250-credit installation; table 'appendage cost ×2' and Licensed | Existing base 250 and no-restriction field; reconcile printed dual pricing | Source price interpretation blocked |
| Laminanium Plating | SGD p.54 | Light 3,000×CF; heavy 20,000×CF; both 15×CF kg | Two live IDs for one printed identity with legitimate light/heavy variants | Typed variant required |
| Communications Countermeasure System | SGD pp.56,59 | 1,000 credits, 3 kg, Restricted | Live name alias, suspicious chargen-only restriction | Printed-source permission unproven |
| Weapon Detector | SGD pp.58,63 | 1,500 credits, 5 kg, Licensed | Live Weapon-Detector Package is alias | Canonical rename/alias pending |

## Exact canonical variants

**Translator Unit (Core Table 11-5 printed p.195):** Four choices, all one published identity. DC20: 200 credits, 1 kg; DC15: 500 credits, 2 kg; DC10: 1,000 credits, 4 kg; DC5: 2,000 credits, 8 kg. When encountering an unknown language, make Intelligence check against the installed variant DC. Printed lower DC = better unit. Current Basic/Advanced/Universal choices do **not** map safely by title or apparent quality; do not silently rewrite owned choices.

**Remote Processor:** Printed external transmitters 5/50/500/5000 km, cost 1k/10k/100k/1m, weight 10/100/1,000/10,000 kg; longer two Military. The remote **receiver** is a distinct 1kg component that **reduces** remote drone cost by 500 credits, is eligible only on droids without internal processors, connects to one controller, and switching controllers requires DC20 Mechanics with tool kit. Remote drone takes -2 Dexterity; do not treat transmitter as droid-body hardware.

**Laminanium Plating (SGD Table 3-1 p.54):** Light: +4 Reflex armor, max DEX +3, penalty -2, Military, 3,000×CF credits, 15×CF weight; Heavy: +12 Reflex armor, max DEX +2, penalty -10, Military/Rare, 20,000×CF credits and 15×CF weight. All variants give +2 equipment Fortitude Defense. Heavy armor running restriction applies. Self-repairing narrative **does not grant numeric HP regeneration**.

**Projectile Hand:** SGD prose says basic tension-spring device costs 250 credits to install, table says price is **appendage cost ×2** (and weight 2×CF, Licensed). Treat as **unresolved combined-price interpretation**, not automatic 250-credit stand-alone purchase. It functions as nonlethal ranged simple weapon (2d8 damage) and can make ranged disarm within 6 squares. The live `projectile-appendage` source has inconsistent availability '-' versus embedded Licensed weapon stats; source table takes precedence.

## Concrete defects and blockers

- **Secondary Battery:** Live cost/weight 100/2 vs published **400/4**; printed runtime is 200 vs 100 hours per recharge.
- **Translator Unit:** Live three variants have DC10/15/20, prices 100/250/500 and weight 1/1/2, but published four variants have *opposite quality order* (lower DC better) and prices 200/500/1000/2000. Do not assign existing players a DC5 unit by inference.
- **Projectile Hand:** Inconsistent source paragraph/table pricing requires rule adjudication, and live restriction field is wrong for Licensed.
- **Communications Countermeasure System:** Restricted means regulated availability, not a blanket printed 'unavailable in chargen'; no such rule proven on these pages.
- **Remote Processor:** Typed external transmitter range and distinct receiver cost-reduction must not be collapsed into one installation, or converted into an extra local processor.
- **Weapon Detector:** Intelligence modifier applies **to Perception made to Search for weapons**, not all Perception.
- **Laminanium:** Armor slot occupancy and actual +2 equipment Fortitude effect require downstream parity; separate published identity from the two purchasable armor grades.

## PDF source correction carried from Sprint 002

The earlier Sprint 002 Courier Compartments record incorrectly treated torso/arm/head as three printed locations. **SGD p.56 explicitly lists torso, arm OR leg, and head** (four locations). This commit amends the source record and checkpoint. The false fourth-location conflict is removed. Oil Bath's conflicting printed prices remain unresolved.

## Next stage and acceptance

All **7/7 EDIT families** now have individual printed-rule packets but **zero** are fully mechanically certified or migrated. The frozen backlog remains historical, unchanged. Next: review five repo-only identities against cross-book sources and live dependencies (Miniaturized Self-Destruct's damage consumer), then extend canonical component identity census beyond Core+SGD. Future implementation must use existing droid authority, test quoted prices in Garage/PC/follower/Store and never manufacture printed license rights.

**Verification:** PDF pages rendered and visually inspected; source data/variant counts and correction invariants checked at authoring time. Full Node/CI/UI/runtime integration and test command `node tools/audits/droids/verify_component_edit_families_c2_001.mjs` are **not** yet asserted executed.
