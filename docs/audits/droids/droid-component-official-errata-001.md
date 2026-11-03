# Droid component official errata correction - ERRATA-001

**Date:** 2026-11-02. **Status:** Source-authority correction only. This overrides conflicting statements in MECH-001/002 and the initial 122-identity closeout without rewriting historical evidence.

**Authority:** Wizards of the Coast, *Saga Edition Errata and Official Clarifications*, October 21, 2008; archival WotC web page mirrored at https://swse.xphilesrealm.com/WizardsOfTheCoast/WotcWebPages/Star%20Wars%20Roleplaying%20Game%20Saga%20Edition%20Errata%20and%20Official%20Clarifications.htm and printed errata PDF https://terceiraterra.com/wp-content/uploads/2025/01/SW_errata_A4_Out2008.pdf. Base Core PDF printed pp186,187,193 was visually reviewed. Search text alone is not the basis for the category determination.

## Four authoritative rules missed in the 122-identity pass

1. **Small-or-smaller accessory weights:** where published accessory weight uses cost factor, use **2 / cost factor** rather than cost factor for sizes Small, Tiny, Diminutive and Fine. Price still uses the normal published size cost factor. For Medium or larger, weight factor equals ordinary cost factor. Explicitly flat weight entries are not transformed. Core p193 puts built-in armor and hardening/shields under Accessories; simple appendages are a separate category. SGD p51 host-specific items require individual physical classification.
2. **Synchronized Fire Circuits (Core p191):** official errata supersedes original +4 with **+5 total** on a successful Aid Another check involving a second receiver-equipped droid linked to the same remote processor. The former audit's claim that catalog +5 was incorrect **must be retracted**. +5 still needs proper targeting and success preconditions; it is not an always-on bonus.
3. **Starting systems' carrying capacity (Core p186, later errata clarification):** starting locomotion, appendages and accessories do **not** count against carrying capacity at character creation. This does not create an unlimited post-creation exemption.
4. **Unarmed attacks and natural weapons (Core p120 clarification):** light simple weapons, all characters proficient. Only published applicable appendage size/damage combinations can actually attack; no extra attack from limb count.

## Cost factor split

| Droid size | Price CF | Correct accessory weight multiplier | Obsolete same-factor weight multiplier |
|---|---:|---:|---:|
| Fine | 20 | 0.1 | 20 |
| Diminutive | 10 | 0.2 | 10 |
| Tiny | 5 | 0.4 | 5 |
| Small | 2 | 1 | 2 |
| Medium | 1 | 1 | 1 |
| Large | 2 | 2 | 2 |
| Huge | 5 | 5 | 5 |
| Gargantuan | 10 | 10 | 10 |
| Colossal | 20 | 20 | 20 |

### Independent size examples

| Example | Price | Current published accessory weight | Prior uncorrected mass |
|---|---:|---:|---:|
| Plasteel Shell / Small | 800 cr | 2 kg | 4 kg |
| Plasteel Shell / Tiny | 2000 cr | 0.8 kg | 10 kg |
| Plasteel Shell / Fine | 8000 cr | 0.2 kg | 40 kg |
| Shield Generator, SR 10 / Small | 10000 cr | 20 kg | 40 kg |
| Shield Generator, SR 10 / Huge | 25000 cr | 100 kg | 100 kg |
| Hardened Systems x2 / Large | 2000 cr | 200 kg | 200 kg |
| Quadanium Plating / Diminutive | 25000 cr | 2 kg | 100 kg |

## Affected identity scope

- **21 certain Core-type accessory identities**: thirteen built-in armors, four Hardened Systems tiers and four Shield Generators. This includes SGD-sourced armor that uses the same Core accessory category.
- **15 further SGD installed or mixed-host systems need an explicit host/accessory review** before mass conversion is certified. Their published formula may still be correct, but the factor argument must be selected using official errata.
- **Appendage and carried-equipment cases are not automatically converted** merely because their numeric formula mentions a cost factor. Core p193 defines Accessories separately from Appendages.
- **One confirmed official replacement**: Synchronized Fire Circuits +4 -> +5 total. All legacy docs and tests that assert +4 are superseded and must be updated in a future controlled code/validation change.

The exact machine-readable target lists, errata sources, numerical examples, runtime acceptance gates and categorization policy are in `data/audits/droids/droid-component-official-errata-authority-001.json`.

## Certification and production boundary

The frozen machine audit remains **122 evaluated / 99 pre-errata PASS / 23 pre-errata HOLD**; these are *historical* source decisions and no longer a sufficient standalone claim of current published-rule completeness until the errata overlay is applied and category edge cases adjudicated. **No production change was authorized or made; zero Garage/chargen/follower/Store and Foundry certification.** The 234 published stock-droid statblocks remain separate.

Acceptance script: `node tools/audits/droids/verify_droid_component_official_errata_001.mjs`. The script checks independent math, selected Core IDs, one typed Synchronized Fire replacement, scope policy and zero production claims. It does not test running Foundry code.