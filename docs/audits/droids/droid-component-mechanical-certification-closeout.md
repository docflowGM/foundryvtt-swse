> **OFFICIAL ERRATA CORRECTION (2026-11-02):** This closeout recorded 99 historical Core+SGD source PASS and 23 HOLD from base-book reviews. Official Wizards of the Coast Core errata supersedes the old +4 Synchronized Fire Circuits claim with **+5 total**, and changes **Small-or-smaller accessory-weight calculations** to an effective factor of **2 / droid cost factor**. Beginning systems have a carrying-capacity exclusion, and unarmed attacks are light simple weapons. The old batch claims must be read through `data/audits/droids/droid-component-official-errata-authority-001.json`. Further SGD accessory-host scope review remains. The 23 unresolved HOLDs are classified in `data/audits/droids/droid-component-mechanical-hold-triage-001.json`. No runtime migration is certified.

# SWSE Droid Component Mechanical Source Audit — Core + SGD Closeout

**Date:** 2026-11-02. **Branch:** `audit/droid-publication-census-2026-10-29`. **Scope:** Frozen 122 publication identities from the Core Rulebook and *Scavenger's Guide to Droids*. This is a **source-mechanical certification** closeout, not implementation certification.

## Final verified evaluation counts

| Batch | Identity rows reviewed | Source PASS | Source HOLD |
|---|---:|---:|---:|
| MECH-001 | 25 | 25 | 0 |
| MECH-002 | 25 | 19 | 6 |
| MECH-003 | 25 | 17 | 8 |
| MECH-004 | 25 | 18 | 7 |
| MECH-005 | 22 | 20 | 2 |
| **Total** | **122** | **99** | **23** |

All **122 frozen source identities** have received an explicit printed-rule source decision. **99** have a completed published-source specification; **23** have documented source discrepancies, missing numerical definitions, host or pricing interpretation issues and are intentionally held. **Zero identities are unreviewed** within the two-book baseline.

The certification ledger lives in `data/audits/droids/component-mechanical-certification-ledger.json`. Evidence files: `component-mechanical-certification-batch-001.json` through `batch-005.json`. The machine ledger maps each identity to its source packet and PASS/HOLD decision. Independent validator: `node tools/audits/droids/verify_component_mechanical_census_closeout.mjs`.

**Boundary:** These passes certify the printed rules, **not** Garage quotations, chargen legality, follower limitations, Store prices, data migration, combat automation or Foundry V13 behavior. **Production registry certification = 0; cross-application parity = 0; Foundry runtime = 0.**

## Open source HOLDs

| # | Identity | Printed-source blocker / interpretation needed |
|---:|---|---|
| 1 | Walking | Core pp188-189 do not specify whether the one-tenth restricted-system discount applies to the extra-system surcharge when both rules apply. |
| 2 | Wheeled | Core pp188-189 do not specify whether the one-tenth restricted-system discount applies to the extra-system surcharge when both rules apply. |
| 3 | Tracked | Core pp188-189 do not specify whether the one-tenth restricted-system discount applies to the extra-system surcharge when both rules apply. |
| 4 | Hovering | Core pp188-189 do not specify whether the one-tenth restricted-system discount applies to the extra-system surcharge when both rules apply. |
| 5 | Flying | Core pp188-189 do not specify whether the one-tenth restricted-system discount applies to the extra-system surcharge when both rules apply. |
| 6 | Self-Destruct System | Tiny and smaller produce no collateral-damage dice; source formula based on maximum damage does not establish a purchasable price/mass for those sizes. |
| 7 | Climbing Claws | Printed prose and table disagree on price base |
| 8 | Jump Servos | Printed prose and accessory table disagree on cost base |
| 9 | Magnetic Feet | Table uses appendage-based pricing without identifying which appendage belongs to the foot hardware |
| 10 | Burrower Drive | Tiny and smaller have no published self-destruct collateral damage dice, so drill attack damage is unquantified for those sizes |
| 11 | Projectile Hand | 250cr description and double appendage-cost table contradict for some chosen appendages |
| 12 | Remote Limb Control | Prose prices differ from table appendage-based price, and table does not specify basic/deluxe distinction |
| 13 | Rocket Arm | Printed 2000cr fixed price conflicts with four-times-appendage table |
| 14 | Personality Downloader | Custom item has published minimum price/weight, not exact price or mass for a configured sale |
| 15 | Remote Receiver Jammer | Narrative says extremely short range but gives no numerical maximum, preventing deterministic range eligibility. |
| 16 | Remote Receiver Signal Booster | Printed 50% passive extension and up-to-100% temporary extension lack explicit combination/precedence. |
| 17 | Concealed Item | The composite cost expression has ambiguous multiplication grouping and may be adjusted by the GM; exact host/item price not certified. |
| 18 | Droid Oil Bath | Printed Table 3-2 500-credit price conflicts with 100/1,000/5,000/10,000 size-price tiers in prose. External ownership also must be respected. |
| 19 | Earphone Binary-to-Basic Translator | Text describes more expensive earbud version but prints no price or differentiated mass for that version. |
| 20 | Emergency Oxygen Supply | Table 3-2 weight cell prints 20 without mass unit, and prose does not clarify. Cannot certify physical mass or burden. |
| 21 | Interference Generator | Deluxe model expands protection to video/holo but does not have separately printed price/weight; no typed purchasable deluxe variant certified. |
| 22 | Taser | Published SGD p63 description gives weapon behavior but no explicit ranged or melee damage dice; complete executable attack specification requires another printed weapon source/rule cross-reference. |
| 23 | Video Screen | The book states screen sizes vary 50–500mm but does not specify whether this measures width, height or diagonal; no individual screen area is defined, so an exact configured price/mass needs dimensions. |

## Production blockers to resolve separately

1. **One droid cost-factor authority:** Core Table 11-2 printed sizes are Fine 20, Diminutive 10, Tiny 5, Small 2, Medium 1, Large 2, Huge 5, Gargantuan 10, Colossal 20. Shared Garage factors disagree at seven of nine sizes; never implement price overrides on each component to mask it.
2. **Canonical physical host classification:** Integrated chassis systems vs appendage-attached/carried equipment vs controllers and external facility/starship stations must remain distinct. Postcreation installed chassis systems use `system.installedSystems`. The droid equipment pack is not the structural system catalog.
3. **Rule-state and action authority:** Synchronized Fire Circuits +4 total successful Aid Another, not +5; size-scaling hardened bonuses; installed shield rating and SR recovery; delayed turn triggers; finite uses; selected host and action resources.
4. **Source conflicts stay blocked:** Prices with incompatible prose/table formulae, undefined size combinations, custom-build cost minima, or missing special-variant prices are not certified for arbitrary purchasing. No zero-cost fallback.
5. **Migration remains an independent future tranche:** Runtime definitions in `scripts/data/droid-part-schema.js`, raw sources, Garage, PC chargen, follower builder and Store need exact-price and legality fixtures, transactional debit/rollback, and Foundry tests before release.

## Scope limitations

The 122 identities are **Core + SGD only**. Other published SWSE books are not comprehensively censused for additional player-purchasable droid components. The **234 published stock-droid statblocks** are a separate workstream and are not evidence of legality or price. Five unsupported repository-only entries remain untouched; no deletions, merges or actor mutations occurred in these audit batches.

### Reproduction

```sh
node tools/audits/droids/verify_component_mechanical_batch_001.mjs
node tools/audits/droids/verify_component_mechanical_batch_002.mjs
node tools/audits/droids/verify_component_mechanical_batch_003.mjs
node tools/audits/droids/verify_component_mechanical_batch_004.mjs
node tools/audits/droids/verify_component_mechanical_batch_005.mjs
node tools/audits/droids/verify_component_mechanical_census_closeout.mjs
```

Existing local batch validators 003/004/005 passed before transfer. The consolidated cross-batch validator is committed for reproducible verification; no live Foundry session or complete CI test run is claimed here. After pushing, exact GitHub file readback and branch HEAD will be verified separately.
