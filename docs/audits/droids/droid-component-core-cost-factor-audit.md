# Droid component cost-factor authority — Core rule comparison

**Reviewed 2026-11-02**, original visually inspected Core PDF, printed p.187, **Table 11-2: Droid Sizes**. Source fact audit only, no code or actor mutation.

## Verified matrix

| Size | Printed SWSE factor | Garage/shared schema | Chargen trait package |
|---|---:|---:|---:|
| fine | 20 | 0.125 | not defined |
| diminutive | 10 | 0.2 | not defined |
| tiny | 5 | 0.25 | 5 |
| small | 2 | 0.5 | 2 |
| medium | 1 | 1 | 1 |
| large | 2 | 2 | 2 |
| huge | 5 | 4 | 5 |
| gargantuan | 10 | 8 | 10 |
| colossal | 20 | 16 | 20 |

**7 of 9** shared schema factors disagree (Medium and Large match). The progression module matches all **seven** sizes it defines, but Fine/Diminutive lack packages and unknown sizes default to Medium.

Source authority is the printed table, not either implementation. A Small-droid SR5 shield has base price **2,500 × 2 = 5,000 credits** and weight **10 × 2 = 20 kg**. The shared schema computes **2,500 × 0.5 = 1,250 credits** and **10 × 0.5 = 5 kg** if the source part formula is applied through that helper. Thus a fourfold misquote before any transaction adjustments.

This affects locomotion, appendages, armor, shield generators, hardened systems and accessory multipliers. Do not fix item-by-item. One authority and cross-application deterministic fixtures are required before runtime migration, while actor installation ownership, size validity and wallet rollback must also be tested.

**Status:** Published facts PDF-verified; static cross-code inconsistency verified; zero full mechanical, pricing parity, or Foundry runtime certifications. No production changes.

Machine packet: `data/audits/droids/component-core-cost-factor-audit.json`.

Validation after checkout:

```sh
node tools/audits/droids/verify_component_core_cost_factor_audit.mjs
```

Authoring-time assertions: 9 factors, 7 shared mismatches, 0 progression mismatches among defined sizes. Node/CI/Foundry not executed here.
