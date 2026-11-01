# P6A Starship Component PDF Authority — v2

**Scope:** Independently inspected *Starships of the Galaxy* (weapon and accessory tables plus relevant prose), *Scum and Villainy* (Table 2-10), the weapon-system introductory passages of *Clone Wars Campaign Guide* and *Rebellion Era Campaign Guide*, *Galaxy at War* Table 2-7, the *Legacy Era* gravity-mine pricing sidebar, and the *Threats of the Galaxy* discord missile descriptions. The accompanying JSON includes exact printed pages, PDF page indices, numeric values, and individual dispositions for all **91** P6A worksheet IDs. **This is source evidence, not automatic mechanical certification.**

## Reviewed printed tables

| Book | Source table | Printed page | PDF page (1 based) | Rows |
|---|---|---:|---:|---:|
| Starships of the Galaxy | 3-3 Movement Systems | 41 | 42 | 27 |
| Starships of the Galaxy | 3-4 Defense Systems | 43 | 44 | 29 |
| Starships of the Galaxy | 3-5 Weapon Systems | 47 | 48 | 43 |
| Starships of the Galaxy | 3-7 Starship Accessories | 49 | 50 | 35 |
| Scum and Villainy | 2-10 Starship Systems | 58 | 59 | 32 |
| Galaxy at War | 2-7 Vehicle Weapons | 67 | 68 | 3 |
| Legacy Era Campaign Guide | Gravity Mines sidebar | 191 | 192 | 3 |

`reviewedWorksheetItems` maps all 91 original review requests to verified table rows, verified prose, or explicitly incomplete evidence. `reviewedTables` provides authoritative table cells; `proseOnlyOptions` and `supplementalProseOnlySystems` preserve additional published claims without making them up as fixed-price products.

## High-priority findings

**Baffled Drive is table-listed.** *Scum and Villainy* p. 58 Table 2-10 explicitly lists Baffled Drive, **1 EP, Military, Colossal or larger, 100,000 credits base**. It should not be marked statblock-only. This is an identity/reconciliation correction, **not** permission to install immediately.

**The three disputed SotG costs are visibly printed:** Stygium cloaking device **100,000,000 credits base**; Hangar Bay **10 credits base**; Concealed Hangar Bay **1,000 credits base** (p. 49). These are unusual printed values and must be checked against errata before production correction.

**Weapon special values:** standard space mine **7d10x2** is legible in the prose on printed p. 46 even though its p. 47 table glyph is damaged. A dash in a table means **not stated/applicable**, not necessarily numeric zero. Cannon enhancements and launcher options use incremental EP/multipliers, not equivalent fixed weapon purchases.

**Sourcebook scope distinction:** Clone Wars Campaign Guide p. 162 and Rebellion Era Campaign Guide p. 130 provide weapon descriptions and vehicle statblocks. They do **not**, in those passages, provide universal independently purchasable cost/EP tables. Do not substitute an individual ship's weapon statblock for catalog costs or EP. Leave unsupported economic values unknown, or investigate additional source pages.

**Additional source entries:** *Legacy Era Campaign Guide* p. 191 prints the gravity mine launcher at 2 EP and 5,000 credits, standard mine at 1,000 credits and magnetic mine at 4,000 credits (both mine EP cells are dashes). *Threats of the Galaxy* p. 142 prints a discord missile launcher at 2 EP, Restricted, 4,000 credits and missile at Restricted, 1,000 credits with no separate EP figure.

**New SotG variant rules:** armor-piercing concussion missiles grant penetration 10 but incur a -5 attack penalty; launcher capacity options add 20% or 25% per extra missile/torpedo/mine with printed capacity ceilings; detachable cargo pods cost x5. The source does not separately state EP charges for these variants.

## Evidence and certification separation

1. `PDF_VISUAL_REVIEW` confirms only specific table cells or prose claims in this external dataset.
2. Map source identities carefully. `suggestedCatalogId` is not a claim that canonical identity has been reconciled.
3. Any printed unknown, absent, ambiguous, or unstated value stays **null/unknown**, never zero unless the page prints zero.
4. A table record is not `MECHANIC_SPECIFIED` until its accompanying prose and special rules are implemented and tested.
5. Installation and weapon execution remain controlled by existing seals, EP, cost, actor authority, and attack preflight gates.
6. Do not overwrite the 429 native vehicle publication records.

## Remaining evidence gap

The *Galaxy at War* defoliator-shell EP table cell on printed p. 67 is a **dash**, confirmed visually. It is not a printed numeric zero. The JSON records `emplacementPoints: null` and `emplacementPointsPrinted: '—'`, leaving the accounting semantics explicit rather than inventing a 0 EP charge.

Published errata, additional cross-book identities, the mechanical specification of prose-only systems, and full live Foundry V13 validation are separate work items. The JSON does not claim these are finished.

## Claude integration directive

Import this JSON under `data/audits/vehicles/p6a/` as **source evidence**, not as an executable catalog. Reconcile each `reviewedWorksheetItems` entry with the current P6A registry and 187-record catalog, update the census generator and machine-checks, and produce a discrepancy list before mutating production data. Preserve previous IDs/migration mappings, document source and mechanical status separately, keep all weapon execution authority disabled until explicit certification, and keep PR #1092 draft. Verify the printed-source pages and errata for unusual values before promotion.
