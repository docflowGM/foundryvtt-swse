# SWSE Species Canonicalization — Final Book-Sweep Health Report

**Date:** October 13, 2026  
**Repository:** `docflowGM/foundryvtt-swse`  
**Branch:** `audit/species-book-by-book-canonical`

**Verdict:** The 12-book published-rule comparison and final omitted-block sweep are documented, but **full species provenance and actor-runtime certification are not complete**. This is a read-only source health assessment and correction queue, **not authorization for a mass rewrite**.

## 161-record census

| Measure | Result |
|---|---:|
| Production species records | **161** |
| Source-audited species/profile identities | **121** |
| Ordinary non-droid species in audited entries | **119** |
| Non-genetic profiles audited | **2** — Near-Human generator and Sorcerer of Rhand transformation |
| Explicit excluded droid identities | **1** — Replica Droid |
| Additional non-droid pack records needing primary-source provenance | **39** |
| Confirmed published identities missing from pack in verified source blocks | **0 identified** |
| Clean species in reviewed source scope | **6** |
| Recorded issues (Core legacy issues + later findings) | **302** |
| `CHANGE_REQUIRED` / `REVIEW_REQUIRED` / `NO_CHANGE` finding | **97 / 204 / 1** |
| Applied source fixes / live actor certifications | **0 / 0** |

The 121-record count is **not** 121 biological species: 119 ordinary species plus two special profiles. Every published racial block verified in the 12 audited books is represented in the pack, but that does not certify outside supplemental sources or the 39 unmatched non-droid records. All 302 findings remain `applied:false`.

## Source-comparison positives and caveats

**Explicitly clean source records:** Altiri, Anarrian, Duros, Human, Vultan, Zeltron. `NO_CHANGE` means the inspected published fields align; it does not prove a working actor grant, vision calculation or reroll.

**Final sweep correction:** Core p284–285 has playable Aqualish and Hutt rules that the original Core chapter-2 audit missed. The same section has materially different Core Neimoidian and Yuuzhan Vong source claims. *The Force Unleashed* p192 prints Chiss; its stats agree with *Unknown Regions* p126, not the current Legacy-based pack. All five source-specific claims have been appended and committed without rewriting historical findings. The name Elom in *Galaxy of Intrigue* is a planetary reference; no extra Elom racial block was invented from that search match.

**Major source conflicts kept separate:** Bith (*Threats* vs *Galaxy of Intrigue*), Chiss (*Force Unleashed* / *Unknown Regions* vs *Legacy*), Neimoidian (Core vs *Galaxy of Intrigue*), Krevaaki (*Jedi Academy* vs *Unknown Regions*), Barabel (*Scum and Villainy* vs *Galaxy at War*), and Chadra-Fan (*Legacy* vs *Unknown Regions*). Source version choice must precede any merged trait data.

## 39 unmatched non-droid pack records

An existing source hint or lore mention **is not evidence of a playable species mechanics block**. Each of these records needs a primary printed source or official Wizards web locator, or an explicit supplemental/homebrew classification. None is presumed incorrect or eligible for removal.

| # | Name | Foundry ID | Current source hint |
|---:|---|---|---|
| 1 | Aing-Tii | `species-aing-tii` | Unknown Regions |
| 2 | Amani | `species-amani` | None |
| 3 | Anomid | `species-anomid` | Scum & Villainy |
| 4 | Anx | `species-anx` | FU |
| 5 | Arcona | `species-arcona` | Clone Wars |
| 6 | Bardottan | `species-bardottan` | Clone Wars |
| 7 | Besalisk | `species-besalisk` | Clone Wars |
| 8 | Chevin | `species-chevin` | FU |
| 9 | Drall | `species-drall` | Corella System |
| 10 | Dressellian | `species-dressellian` | Rebellion |
| 11 | Elom | `species-elom` | FU |
| 12 | Geonosian | `species-geonosian` | None |
| 13 | Gree | `species-gree` | Clone Wars |
| 14 | Gundark | `species-gundark` | Scavenger |
| 15 | Hapan | `species-hapan` | Legacy |
| 16 | Hiss'sssi | `species-hiss-sssi` | Legacy |
| 17 | Jenet | `species-jenet` | Rebellion |
| 18 | Kal-Dexar | `species-kal-dexar` | Clone Wars |
| 19 | Kessurian | `species-kessurian` | Scum & Villainy |
| 20 | Kiffar | `species-kiffar` | FU |
| 21 | Koorivar | `species-koorivar` | Clone Wars |
| 22 | Kubaz | `species-kubaz` | Rebellion |
| 23 | Mirialan | `species-mirialan` | KOTOR |
| 24 | Mustafarian | `species-mustafarian` | Rebellion |
| 25 | Muun | `species-muun` | Rebellion |
| 26 | Nazren | `species-nazren` | None |
| 27 | Nerf (Uplifted) | `species-nerf-uplifted` | Scavenger |
| 28 | Noghri | `species-noghri` | Threats |
| 29 | Ortolan | `species-ortolan` | Rebellion |
| 30 | Pau'an | `species-pau-an` | Clone Wars |
| 31 | Phindian | `species-phindian` | None |
| 32 | Polis Massan | `species-polis-massan` | None |
| 33 | Quermian | `species-quermian` | Clone Wars |
| 34 | Sith (Pureblood) | `species-sith-pureblood` | KOTOR |
| 35 | Skakoan | `species-skakoan` | None |
| 36 | Stereb | `species-stereb` | None |
| 37 | Theelin | `species-theelin` | Legacy |
| 38 | Tusken Raider | `species-tusken-raider` | None |
| 39 | Vaathkree | `species-vaathkree` | Unknown Regions |

The one excluded `Replica Droid` record is not part of the 39 and remains out of audit scope.

## Priority corrections sourced from the ledger

| Priority | Finding | Species | Recorded defect | Printed locator |
|---|---|---|---|---|
| P0 | `SWP-CORE-AQUALISH-01` | Aqualish | Unprinted Ferocity always-on melee damage | Saga Edition Core Rulebook, p.284 |
| P0 | `SWP-CORE-HUTT-01` | Hutt | Unprinted Fortitude +5 typed defense | Saga Edition Core Rulebook, p.284 |
| P0 | `GOI-05-01` | Gotal | Gotal emotional reading incorrectly rendered as general blindsense | Galaxy of Intrigue, p.14 |
| P0 | `GOI-12-01` | Nyriaanan | Nyriaanan unprinted flight speed | Galaxy of Intrigue, p.144 |
| P0 | `JATM-02-01` | Celegian | Celegian untrained Telepathy exception incorrectly grants Force Training | Jedi Academy Training Manual, p.106 |
| P0 | `THR-03-01` | Mantellian Savrip | Mantellian Savrip double/wrong Dexterity modifier | Threats of the Galaxy, p.117 |
| P0 | `TFU-01-01` | Aleena | Aleena malformed languages | The Force Unleashed Campaign Guide, p.13-14 |
| P0 | `LEG-13-01` | Devaronian | Devaronian male stat profile | Legacy Era Campaign Guide, p.214 |
| P0 | `LEG-13-02` | Devaronian | Devaronian female stat profile | Legacy Era Campaign Guide, p.214 |
| P1 | `THR-03-02` | Mantellian Savrip | Mantellian Savrip natural claws and poison | Threats of the Galaxy, p.117 |
| P1 | `UR-14-01` | Lugubraa | Lugubraa separate tooth natural attack | The Unknown Regions, p.135 |
| P1 | `KOTOR-03-01` | Cathar | Cathar claw die size | Knights of the Old Republic Campaign Guide, p.12 |
| P1 | `UR-12-01` | Ebruchi | Ebruchi Constitution prerequisite | The Unknown Regions, p.127 |
| P1 | `UR-17-01` | Tof | Tof Mighty Swing prerequisite | The Unknown Regions, p.149 |
| P1 | `UR-16-01` | Ssi-Ruuk | Ssi-Ruuk contaminated with Tof lore | The Unknown Regions, p.147 |
| P1 | `UR-15-01` | Sorcerer of Rhand | Sorcerer of Rhand missing ability penalties | The Unknown Regions, p.143 |
| P1 | `GOI-08-01` | Neimoidian | Neimoidian stray language token | Galaxy of Intrigue, p.18 |
| P1 | `CW-10-01` | Republic Clone | Republic Clone one +2 ability choice | The Clone Wars Campaign Guide, p.91 |
| P2 | `UR-18-01` | Vagaari | Vagaari Frightening Visage conditional context | The Unknown Regions, p.153 |

The full **exact targets**, current values, printed-rule comparisons, and surgical actions for these examples are machine-readable in `data/audits/species-final-provenance-census.json`; **all other findings** remain in the complete rolling JSON. Some Core issue targets use the legacy `issues[]` schema and must be read as such, not silently omitted from totals.

## Surgical correction queue — no production authorization yet

### 1. P0 — Unsafe typed passives and fabricated powers

**Modify only:** `data/species-traits-migrated.json`, `packs/species.db (only for proven source defects)`. **Source finding IDs:** `SWP-CORE-AQUALISH-01`, `SWP-CORE-HUTT-01`, `GOI-05-01`, `GOI-12-01`, `JATM-02-01`. **Regression gate:** Untargeted attacks, defenses, senses and movement no longer gain unauthorized modifiers; the published legitimate narrow benefit remains.

### 2. P0 — Ability scores, corrupted strings, and level-one variant choices

**Modify only:** `packs/species.db`. **Source finding IDs:** `THR-03-01`, `TFU-01-01`, `LEG-13-01`, `LEG-13-02`, `UR-15-01`, `CW-10-01`, `GOI-08-01`. **Regression gate:** On newly created actors, correct ability offsets, legal language tokens, exactly one clone +2 and legal male/female alternatives; keep IDs.

### 3. P1 — Natural weapon records and on-hit conditional effects

**Modify only:** `packs/species.db`, `data/species-traits-migrated.json`. **Source finding IDs:** `THR-03-02`, `UR-14-01`, `KOTOR-03-01`. **Regression gate:** Exact natural weapon count, attack die/type, no duplicate claw or poison weapon; poison only on qualifying claw damage.

### 4. P1 — First-level species feat eligibility and skill gates

**Modify only:** `packs/species.db`, `scripts/species/species-grant-ledger-builder.js (only if a failing test establishes runtime need)`. **Source finding IDs:** `UR-12-01`, `UR-17-01`, `CW-10-01`. **Regression gate:** Racial feat granted only if actual prerequisite holds; once-only grants; class skills resolve before skill training.

### 5. P1 — Vision, immunities, and conditional bonuses

**Modify only:** `data/species-traits-migrated.json`, `packs/species.db`. **Source finding IDs:** `SWP-CORE-HUTT-01`, `JATM-02-01`. **Regression gate:** Printed specific affected defense and Use the Force conditions, not unconditional or blanket Force immunity.

### 6. P2 — Special activated racial actions

**Modify only:** `existing species action/passive consumers only where tested`. **Source finding IDs:** `UR-18-01`, `UR-16-01`. **Regression gate:** Use correct range, action, attire/failure predicates and once-per-encounter charges; do not invent token position automation.

### 7. HOLD — Cross-book printed conflicts and variants

**Modify only:** `rolling source ledger and existing supported variants`. **Source finding IDs:** see explicit provenance/conflict inventory. **Regression gate:** Choose explicit source precedence; never merge Bith, Chiss, Neimoidian, Krevaaki or Barabel contradictory printings into an invented composite.

### 8. HOLD — Unverified 39 pack identities

**Modify only:** `source provenance documentation only`. **Source finding IDs:** see explicit provenance/conflict inventory. **Regression gate:** Find official primary book/page or Wizards web source or mark supplemental/homebrew/unconfirmed; no production deletion on absence of evidence.

## Targeted Claude task templates for a future approved patch pass

**Repo:** `C:\Users\Owner\Documents\GitHub\foundryvtt-swse` (`--repo "C:\Users\Owner\Documents\GitHub\foundryvtt-swse"` for tooling that supports this flag). **Start each pass by reading current branch/file SHAs**; never patch from stale memory.

**Pass A — typed rule bugs:** 'Read the final provenance census and rolling audit findings for Aqualish, Hutt, Gotal, Nyriaanan and Celegian. Compare exact printed-rule targets to the current `data/species-traits-migrated.json`. Modify only those executable rules with confirmed source mismatches. Add positive and negative tests; preserve all existing Foundry IDs. Do not redesign species engines or introduce alternative registries.'

**Pass B — data/variant bugs:** 'Inspect the current `packs/species.db` records for Aleena, male/female Devaronian, Republic Clone, Mantellian Savrip and Sorcerer of Rhand. Implement only source-backed corrections not blocked by publication-version ambiguities. Validate new first-level actors. Make only changed-files patches; no database rewrite.'

**Pass C — weapons/grants:** 'Fix one racial natural-weapon or conditional bonus-feat family at a time using the printed findings and existing grant ledger. Verify exact damage dice/type, duplicate prevention, prerequisite legality, and single acquisition. Do not expand into droid chassis or general CharGen redesign.'

**Pass D — unresolved provenance:** 'For each of the 39 unmatched non-droid species, obtain exact published book/page or official web rules and label its status. Record proven new source claims without touching production data. Mark missing/ambiguous sources as unresolved, not invalid.'

For every eventual correction: verify before/after values, preserve stable IDs, test first-level and condition-dependent paths, read back committed production files, then and only then flip the corresponding ledger `applied` status. Do not create a parallel SpeciesRegistry, replace SpeciesGrantLedgerBuilder, or stage a wholesale migration.

## Completion gates

1. Resolve the remaining 39 pack-only non-droid source identities (or label their actual supplemental provenance).
2. Document explicit source/variant precedence for contradictory books.
3. Execute Foundry actor/CharGen regressions for racial grants, movement, vision, Force gating, conditions and natural weapons.
4. Apply and verify small production corrections before certification.

**The published-book research is ready for surgical remediation; complete species corpus provenance and functioning Foundry runtime are not yet certified.**
