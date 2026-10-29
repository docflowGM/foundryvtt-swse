# SWSE Droid Publication Census - Rolling Audit

**State:** Initial Core, Scavenger, KotOR, Clone Wars, Force Unleashed, Galaxy at War, Galaxy of Intrigue, Jedi Academy Training Manual, Legacy Era, Rebellion Era, Scum and Villainy, Starships of the Galaxy, Threats of the Galaxy, and The Unknown Regions census; no full mechanical certification. **Storage:** Conversation workspace only, no GitHub writes.

## Counting contract

- Count **one statblock identity per publication**, not every text mention or alternate formatting of the same entity.
- Repeated factory model stats in another sourcebook count as distinct *publication listings* but may resolve to the same canonical model family at reconciliation.
- A named-character droid statblock counts as its own printed statblock identity and links to its base factory family, if applicable.
- Vehicle-format droids remain counted as droid publications but keep their printed *vehicle* format.
- Record `bookId`, `listingId`, printed pages, TXT anchor and PDF-page mapping; numeric stats from OCR are provisional until field-level certification.

## Published 14-book sourcebook census and original 17-slot request reconciliation

| Sequence | Book | Listings | Status |
|---:|---|---:|---|
| 1 | Saga Edition Core Rulebook | 13 | INITIAL_CENSUS_COMPLETE |
| 2 | Scavenger's Guide to Droids | 46 | INITIAL_CENSUS_COMPLETE |
| 3 | Knights of the Old Republic Campaign Guide | 24 | INITIAL_CENSUS_COMPLETE |
| 4 | Clone Wars Campaign Guide | 40 | INITIAL_CENSUS_COMPLETE |
| 5 | The Force Unleashed Campaign Guide | 11 | INITIAL_CENSUS_COMPLETE |
| 6 | Galaxy at War | 22 | INITIAL_CENSUS_COMPLETE |
| 7 | Galaxy of Intrigue | 8 | INITIAL_CENSUS_COMPLETE |
| 8 | Jedi Academy Training Manual | 0 | INITIAL_CENSUS_COMPLETE |
| 9 | Legacy Era Campaign Guide | 12 | INITIAL_CENSUS_COMPLETE |
| 10 | Rebellion Era Campaign Guide | 15 | INITIAL_CENSUS_COMPLETE |
| 11 | Scum and Villainy | 5 | INITIAL_CENSUS_COMPLETE |
| 12 | Starships of the Galaxy | 3 | INITIAL_CENSUS_COMPLETE |
| 13 | Threats of the Galaxy | 29 | INITIAL_CENSUS_COMPLETE |
| 14 | The Unknown Regions | 6 | INITIAL_CENSUS_COMPLETE |
| 15 | Unmatched 17-slot planning placeholder; not a verified sourcebook | — | UNIDENTIFIED_SCOPE_PLACEHOLDER_NOT_A_BOOK |
| 16 | Unmatched 17-slot planning placeholder; not a verified sourcebook | — | UNIDENTIFIED_SCOPE_PLACEHOLDER_NOT_A_BOOK |
| 17 | Unmatched 17-slot planning placeholder; not a verified sourcebook | — | UNIDENTIFIED_SCOPE_PLACEHOLDER_NOT_A_BOOK |

**Current initial enumeration volume:** **234 publication listings across all 14 identified printed Saga Edition rulebooks/sourcebooks**, including six *Unknown Regions* models. This is a **publication-identity and source-location census**, NOT field-by-field mechanical certification. GAW's GAT autonomous droid-brain vehicle remains counted under the previously approved boundary; the passive-guidance Drop Pod remains excluded. Same-book protocol repetitions and repeated encounter blocks are linked, not additional identities. Original slots 15–17 have no verified book identities, and therefore **no assigned zero counts**.

### Reconciliation of the original 17-book target

Published Saga Edition reference bibliographies consistently identify **14 official Wizards of the Coast rulebooks/sourcebooks**, and these 14 are exactly the distinct primary-book TXT/PDF files supplied for the project. The original count of 17 appears to be an **unreconciled planning target**, not evidence that three printed sourcebooks are missing. Sources checked for the bibliographic count: *Star Wars Saga Edition Wiki — Reference Books* (`https://swse.fandom.com/wiki/Reference_Books`), *Star Wars Saga Edition RPG Omnibus — SWSE Books* (`https://swse-omnibus.fandom.com/wiki/Category:SWSE_Books`), *Wookieepedia — Saga Edition* (`https://starwars.fandom.com/wiki/Saga_Edition`).

*Dawn of Defiance* is a separate downloadable adventure series and the web enhancements, Jedi Counseling articles, and accessories are additional sources rather than unlisted sourcebooks. They may be valuable for an **explicit later expansion census**, but their original primary files have not been supplied in this workspace. This pass does not invent their counts or treat them as included in 234. Maintain slots 15–17 as provenance-preserving scope placeholders until the owner defines their intended materials.

### Deferred Droid-PC identity types (owner directive, 2026-10-29)

The earlier Species refactor intentionally **deferred Shards and replica droids** to the droid-PC integration/refactor. **Do not treat them as organic PCs** or silently apply ordinary-droid rules to a Shard in a droid shell. JATM printed pp.78-79 is the source for Shard exceptions; replica-droid player rules are now PDF-verified in *Threats of the Galaxy* printed p.153; mechanical/runtime integration remains uncertified. This note does **not** increment the statblock census. Full decision DROID-ARCH-002 is in the rolling Rules-to-Schema contract.

## Core Rulebook (13 listing identities)

| ID | Published identity | Printed page | Format | TXT line anchor |
|---|---|---:|---|---:|
| CORE-DROID-001 | 2-1B Medical Droid | 197 | droid-actor | 18637 |
| CORE-DROID-002 | R2 Series Astromech Droid | 198 | droid-actor | 18706 |
| CORE-DROID-003 | 3PO Series Protocol Droid | 198 | droid-actor | 18777 |
| CORE-DROID-004 | B1 Series Battle Droid | 199 | droid-actor | 18837 |
| CORE-DROID-005 | B2 Series Super Battle Droid | 199 | droid-actor | 18884 |
| CORE-DROID-006 | Droideka Series Destroyer Droid | 200 | droid-actor | 18968 |
| CORE-DROID-007 | Dwarf Spider Droid | 201 | droid-actor | 19032 |
| CORE-DROID-008 | Crab Droid Scout | 201 | droid-actor | 19082 |
| CORE-DROID-009 | IG-100 Series MagnaGuard | 202 | droid-actor | 19147 |
| CORE-DROID-010 | Viper Series Probe Droid | 202 | droid-actor | 19224 |
| CORE-DROID-011 | ASP Series Labor Droid | 203 | droid-actor | 19301 |
| CORE-DROID-012 | R2-D2 (Episode VI) | 267 | droid-actor | 25872 |
| CORE-DROID-013 | C-3PO (Episode VI) | 267 | droid-actor | 25942 |

**Core count policy:** 11 sample/factory droids plus 2 named-character statblocks. R2-D2 and C-3PO are distinct named-character presentations, not additional factory model definitions.

## Scavenger's Guide to Droids (46 listing identities)

| ID | Published identity | Printed pages | Format | TXT line anchor |
|---|---|---|---|---:|
| SGD-DROID-001 | 8D Smelter Droid | 68-69 | droid-actor | 6205 |
| SGD-DROID-002 | A9G-Series Archive Droid | 70-71 | droid-actor | 6428 |
| SGD-DROID-003 | AD-Series Weapons Maintenance Droid | 72-73 | droid-actor | 6631 |
| SGD-DROID-004 | Annihilator Droid | 74-75 | droid-actor | 6861 |
| SGD-DROID-005 | BLX Labor Droid | 76-77 | droid-actor | 7095 |
| SGD-DROID-006 | Colicoid Infiltrator-Series Droid | 78-79 | droid-actor | 7278 |
| SGD-DROID-007 | CZ-Series Secretary Droid | 80-81 | droid-actor | 7438 |
| SGD-DROID-008 | DP-2 Probe Droid | 82-83 | vehicle-scale-droid | 7760 |
| SGD-DROID-009 | Droideka Mark II | 84-85 | droid-actor | 7970 |
| SGD-DROID-010 | DT-16 "Destructor" Battle Droid | 86-87 | droid-actor | 8219 |
| SGD-DROID-011 | Duelist Elite Training Droid | 88-89 | droid-actor | 8434 |
| SGD-DROID-012 | E522 Assassin Droid | 90-91 | droid-actor | 8640 |
| SGD-DROID-013 | EI-9 Network Security Droid | 92-93 | droid-actor | 8875 |
| SGD-DROID-014 | EV-Series Supervisor Droid | 94-95 | droid-actor | 9071 |
| SGD-DROID-015 | FLTCH-Series Battle Droid | 96-97 | droid-actor | 9293 |
| SGD-DROID-016 | G2 Repair Droid | 98-99 | droid-actor | 9520 |
| SGD-DROID-017 | GD16-Series Pilot Droid | 100-101 | droid-actor | 9734 |
| SGD-DROID-018 | GX1-Series Battle Droid | 102-103 | droid-actor | 9956 |
| SGD-DROID-019 | GY-I Information Analysis Droid | 104-105 | droid-actor | 10192 |
| SGD-DROID-020 | H-1ME Battle Mechanic Droid | 106-107 | droid-actor | 10371 |
| SGD-DROID-021 | HK-77 Assassin Droid | 108-109 | droid-actor | 10587 |
| SGD-DROID-022 | HKB-3 Hunter-Killer Droid | 110-111 | droid-actor | 10796 |
| SGD-DROID-023 | KM1 Mining Droid | 112-113 | droid-actor | 11027 |
| SGD-DROID-024 | M38 Explorer Droid | 114-115 | droid-actor | 11237 |
| SGD-DROID-025 | MEV-Series Medical Evacuation Droid | 116-117 | droid-actor | 11473 |
| SGD-DROID-026 | MK-Series Maintenance Droid | 118-119 | droid-actor | 11712 |
| SGD-DROID-027 | Model 88-Series Administration Droid | 120-121 | droid-actor | 11923 |
| SGD-DROID-028 | PG-5 Gunnery Droid | 122-123 | droid-actor | 12161 |
| SGD-DROID-029 | PLNK-Series Power Droid | 124-125 | droid-actor | 12403 |
| SGD-DROID-030 | RO-D-Series Droid | 126-127 | droid-actor | 12610 |
| SGD-DROID-031 | R8-Series Astromech Droid | 128-129 | droid-actor | 12861 |
| SGD-DROID-032 | RWW-Series Protocol Droid | 130-131 | droid-actor | 13066 |
| SGD-DROID-033 | RX-Series Pilot Droid | 132-133 | droid-actor | 13277 |
| SGD-DROID-034 | S19 Astromech Droid | 134-135 | droid-actor | 13516 |
| SGD-DROID-035 | SD-9-Series Battle Droid | 136-137 | droid-actor | 13720 |
| SGD-DROID-036 | SD-X-Series Stealth Battle Droid | 138-139 | droid-actor | 13988 |
| SGD-DROID-037 | LEP-Series Service Droid | 140-141 | droid-actor | 14238 |
| SGD-DROID-038 | Shadow Droid | 142-143 | droid-actor | 14458 |
| SGD-DROID-039 | Colicoid T4 Turret Droid | 144-145 | droid-actor | 14671 |
| SGD-DROID-040 | TC-SC Infiltration Droid | 146-147 | droid-actor | 14911 |
| SGD-DROID-041 | TT-8L Gatekeeper Droid | 148-149 | droid-actor | 15117 |
| SGD-DROID-042 | V2-Series Commando Droid | 150-151 | droid-actor | 15329 |
| SGD-DROID-043 | V6-Series Pilot Droid | 152-153 | droid-actor | 15574 |
| SGD-DROID-044 | X-1 Viper Droid | 154-155 | droid-actor | 15775 |
| SGD-DROID-045 | XLT-014 Labor Droid | 156-157 | droid-actor | 16033 |
| SGD-DROID-046 | YVH-Series Battle Droid | 158-159 | droid-actor | 16253 |

**Scavenger count policy:** 46 entries in the Droid Codex (pp.68–159), 12 extra protocol-format views linked to their full statblock rather than separately counted.

### Special handling: DP-2 Probe Droid

- `SGD-DROID-008`, printed p.82–83, source TXT anchor line 7760.
- Published full block: `Large starfighter/ground vehicle (speeder)` with vehicle-style Ref/Fort, HP 40, DR 5, Threshold 19, flight speed, starship-scale speed, crew, payload, cargo and vehicle weapon listings.
- Alternate protocol view: `Large droid (2nd-degree)`; same publication identity, not a second census record.
- **Schema adjustment:** preserve `publishedStatblockFormat=vehicle-scale-droid`, proposed `primaryActorAuthority=vehicle`, and `droidRulesApplicability` as an orthogonal trait classification. Reuse V2 vehicle movement/stat/weapon consumers.
- **Repository verification boundary:** existing V2 vehicle actor/derived-stat code confirmed, **DP-2-specific model identity or mapping not confirmed**. Do not mark a stock record mechanically certified on that basis.


## Knights of the Old Republic Campaign Guide (24 listing identities)

| ID | Published identity | Printed page | Kind / format | TXT line anchor |
|---|---|---:|---|---:|
| KOTOR-DROID-001 | ET-74 Communications Droid | 81 | sample-model / droid-actor | 7661 |
| KOTOR-DROID-002 | GO-TO Infrastructure-Planning Droid | 82 | sample-model / droid-actor | 7727 |
| KOTOR-DROID-003 | T3-Series Utility Droid | 82 | sample-model / droid-actor | 7735 |
| KOTOR-DROID-004 | GE3-Series Protocol Droid | 83 | sample-model / droid-actor | 7866 |
| KOTOR-DROID-005 | GG-Series Hospitality Droid | 84 | sample-model / droid-actor | 7957 |
| KOTOR-DROID-006 | HK-24 Series Assassin Droid | 84 | sample-model / droid-actor | 8033 |
| KOTOR-DROID-007 | Independent HK-Series Droid | 85 | heroic-model-template / droid-actor | 8097 |
| KOTOR-DROID-008 | HK-50 Series Assassin Droid | 85 | sample-model / droid-actor | 8139 |
| KOTOR-DROID-009 | Juggernaut War Droid | 86 | sample-model / droid-actor | 8232 |
| KOTOR-DROID-010 | K-X12 Probe Droid | 86 | sample-model / droid-actor | 8302 |
| KOTOR-DROID-011 | Municipal Patrol Droid Mark I | 87 | sample-model / droid-actor | 8369 |
| KOTOR-DROID-012 | Devastator War Droid | 87 | sample-model / droid-actor | 8377 |
| KOTOR-DROID-013 | Sentinel Droid | 88 | sample-model / droid-actor | 8522 |
| KOTOR-DROID-014 | S6-Series Security/Maintenance Droid | 88 | sample-model / droid-actor | 8592 |
| KOTOR-DROID-015 | T1 Bulk Loader Droid | 88 | sample-model / droid-actor | 8649 |
| KOTOR-DROID-016 | R-8009 Utility Droid | 89 | sample-model / droid-actor | 8708 |
| KOTOR-DROID-017 | Mark I Assault Droid | 165 | sample-model / droid-actor | 16671 |
| KOTOR-DROID-018 | Mark IV Assault Droid | 165 | sample-model / droid-actor | 16705 |
| KOTOR-DROID-019 | Basilisk War Droid | 203 | vehicle-format / vehicle-scale-droid | 20759 |
| KOTOR-DROID-020 | GO-TO (Dark Wars) | 212 | named-character / droid-actor | 21651 |
| KOTOR-DROID-021 | HK-47 (Jedi Civil War) | 213 | named-character / droid-actor | 21768 |
| KOTOR-DROID-022 | T3-M4 (Jedi Civil War) | 216 | named-character / droid-actor | 22222 |
| KOTOR-DROID-023 | Krath War Droid | 222 | sample-model / droid-actor | 23055 |
| KOTOR-DROID-024 | Rakatan Guardian Droid | 223 | sample-model / droid-actor | 23120 |

**KotOR count breakdown:** 16 Chapter V Droid chapter full statblocks (including one playable independent HK-Series hero template); two Sith assault model listings on p.165; one Basilisk vehicle-format droid (p.203); three named droid characters (GO-TO, HK-47, T3-M4, pp.212, 213, 216); and two Krath/Rakatan droid listings on pp.222-223. **16+2+1+3+2=24.**

**Explicit exclusions:** descriptive T1-CW/T1-EX variants without printed full statblocks; HK-47/HK-50 text mentions outside their actual entries; KT-400 Military Droid Carrier (a droid-carrying space transport, not a droid); standard ship-mounted droid crew; repeated captions and table-of-contents references. The printed Basilisk **is included** because it is explicitly a `Huge air vehicle (droid)`.

**Important provenance notes:** KotOR is an image-only PDF, so text is transcribed in `Knights of the Old Republic Campaign Guide_djvu.txt`; individual printed pages verified by PDF page images. Printed page numbers are PDF physical page minus one for the checked sections. `HK-24` is also found in SGD protocol references and was linked to the KotOR listing, not double-counted within SGD.

### KotOR schema deltas discovered

1. `modelPresentationRole` and `listingKind` must distinguish a stock factory model, a *playable starting template* (Independent HK-Series Droid), and a named character (GO-TO, HK-47, T3-M4).
2. `modelFamilyLabel` and `modelListingId` are different from the publication identity; HK-24, HK-50, and HK-47 are related but mechanically separate.
3. `baseModelPlayability` should support printed `can be played as droid heroes` and explicit `cannot be played` annotations; absence is `not-established`, not `false`.
4. Vehicle-form Basilisk requires `crew`/`droidBrain`, `authorizedPassenger`, and optional `operatorOverride` semantics, preserving the printed override of droid-brain attack/skill bonus by authorized passenger.
5. `price.kind` separates fixed purchase price, not-for-sale with estimated value, and unknown; estimated value is never automatically a purchasable price.
6. `movementModes` must support concurrent walk/fly/swim, and vehicle-format dual character-/starship-scale speeds.
7. `systems[]` and `possessions[]` remain distinct; mounts and actual weapons must have separate identities. KotOR Rakatan Guardian explicitly calls its multiple weapons integrated possessions.
8. `specialDroidRules[]` should reference existing feat/talent/ability definitions by canonical id (e.g. Logic Upgrade: Self Defense, Gimmick, special attacks) without embedding a second rules engine.
9. `sourceStatus` must preserve TXT OCR anomalies including `Mark |` for Mark I and `Uedi Civil War` for Jedi Civil War; PDF controls canonical names.

**Printed droid-hero model eligibility:** 6 explicitly allowed, 12 explicitly prohibited, 1 GM-conditional independent HK heroic template; Basilisk and Rakatan model have no equivalent explicit model-hero permission in these entries; three named-character blocks are not stock hero starting models. Counts of these eligibility groups sum to 24. These printed statements are recorded as evidence, not a final chargen eligibility engine.

**Status:** Source-identity census only. No derivation of individual mechanical totals, model price proof, or live runtime certification.

## Schema deltas discovered from the first two books

1. `publishedStatblockFormat`: droid-character or vehicle-format droid, independent of `creatureKind=droid`.
2. `primaryActorAuthority`: derived from printed form/selected representation; avoid duplicating the vehicle stat engine.
3. `modelPresentation[]`: full statblock vs protocol format, each with source page; linked to one publication listing.
4. `modelRelation`: factory model / named variant, so record counts do not become the unique factory count.
5. `publishedBaseStats`: preserve printed totals with separate mechanical certification state; do not blindly recalculate from factory parts.
6. `systemEnumeration[]` and `possessions[]`: distinct source fields, even when OCR merges them.
7. `vehicleDroidTraits`: explicit trait adapter for droid immunities, ion interactions and processor/degree rules without treating every vehicle as a droid.

## Verification gates

- This pass is a **publication identity census** using TXT indices and select PDF/native-text layout checks, not line-by-line certification of all fields.
- Core and Scavenger counts are provisional until a final completeness audit against each book's page order.
- The DP-2 mapping into the existing vehicle refactor is pending a specific repo-record lookup and tests.
- Do not treat unknown/unsurveyed books as having zero droids.
- No file or data has been uploaded to GitHub.


## Clone Wars Campaign Guide (40 source listing identities, inclusive count)

**Primary authority:** *Clone Wars Campaign Guide* TXT-first source plus PDF page-layout verification of character, squad, Republic, Confederacy, vehicle and starship chapters. Printed page = PDF page 1-based minus 1 in this file. **No mechanical field certification, no code cutover or GitHub writes.**

**Counting rationale:** 32 ordinary droid-character models; 1 published B1 squad statblock; 6 autonomous vehicle-format droids (including the Ground Armored Tank whose printed crew is a droid brain); 1 Hyena-class bomber (explicitly identified as a droid starfighter with Crew 0). The **39-count excluding GAT** if the generic-named GAT is excluded. No other transports that merely carry or assist droids are counted.

| ID | Printed identity | Printed statblock p. | Kind | TXT line |
|---|---|---:|---|---:|
| CLONE-DROID-001 | DD-13 Medical Assistant Droid | 66 | character droid | 5673 |
| CLONE-DROID-002 | EW-3 Midwife Droid | 67 | character droid | 5730 |
| CLONE-DROID-003 | IM-6 Medical Droid | 67 | character droid | 5778 |
| CLONE-DROID-004 | SP-4 Analysis Droid | 68 | character droid | 5862 |
| CLONE-DROID-005 | LE Series Repair Droid | 69 | character droid | 5955 |
| CLONE-DROID-006 | P2 Series Astromech Droid | 69 | character droid | 6013 |
| CLONE-DROID-007 | Serv-O-Droid Pit Droid | 70 | character droid | 6083 |
| CLONE-DROID-008 | 5YQ Protocol Droid | 70 | character droid | 6157 |
| CLONE-DROID-009 | BCA-11/X Training Droid | 71 | character droid | 6214 |
| CLONE-DROID-010 | IG-86 Sentinel Droid | 71 | character droid | 6241 |
| CLONE-DROID-011 | CLL-6 Binary Load Lifter | 72 | character droid | 6390 |
| CLONE-DROID-012 | FA-5 Valet Droid | 72 | character droid | 6434 |
| CLONE-DROID-013 | IW-37 Pincer Loader Droid | 73 | character droid | 6483 |
| CLONE-DROID-014 | B1-Series Battle Droid Squad | 95 | squad aggregate | 8396 |
| CLONE-DROID-015 | FX-6 Medical Assistance Droid | 160 | character droid | 15307 |
| CLONE-DROID-016 | FA-4 Pilot Droid | 161 | character droid | 15367 |
| CLONE-DROID-017 | Marksman-H Combat Remote | 162 | character droid | 15508 |
| CLONE-DROID-018 | A-DSD Advanced Dwarf Spider Droid | 188 | character droid | 18087 |
| CLONE-DROID-019 | A-Series Assassin Droid | 189 | character droid | 18169 |
| CLONE-DROID-020 | B1-A Series Air Battle Droid | 190 | character droid | 18260 |
| CLONE-DROID-021 | Battle Droid Assassin | 190 | character droid | 18268 |
| CLONE-DROID-022 | Cold Assault Battle Droid | 191 | character droid | 18397 |
| CLONE-DROID-023 | C-B3 Cortosis Battle Droid | 192 | character droid | 18479 |
| CLONE-DROID-024 | Droid Commando | 192 | character droid | 18559 |
| CLONE-DROID-025 | IG Lancer Combat Droid | 193 | character droid | 18628 |
| CLONE-DROID-026 | IG-110 Lightsaber Droid | 193 | character droid | 18688 |
| CLONE-DROID-027 | JK-13 Security Droid | 194 | character droid | 18778 |
| CLONE-DROID-028 | LM-432 Assault Crab Droid | 194 | character droid | 18869 |
| CLONE-DROID-029 | LR-57 Combat Droid | 195 | character droid | 18948 |
| CLONE-DROID-030 | Octuptarra Combat Tri-Droid | 196 | character droid | 19035 |
| CLONE-DROID-031 | OOM-Series Battle Droid | 196 | character droid | 19104 |
| CLONE-DROID-032 | Spelunker Probe Droid | 197 | character droid | 19175 |
| CLONE-DROID-033 | Ultra Droideka | 198 | character droid | 19251 |
| CLONE-DROID-034 | Ground Armored Tank | 198 | droid-brain vehicle | 19329 |
| CLONE-DROID-035 | IG-227 Hailfire-class Droid Tank | 199 | droid vehicle | 19395 |
| CLONE-DROID-036 | Manta Droid Subfighter | 200 | droid vehicle | 19475 |
| CLONE-DROID-037 | OG-9 Homing Spider Droid | 201 | droid vehicle | 19615 |
| CLONE-DROID-038 | Persuader-class Droid Enforcer | 201 | droid vehicle | 19662 |
| CLONE-DROID-039 | Tri-Droid | 202 | droid vehicle | 19825 |
| CLONE-DROID-040 | Hyena-class Bomber | 208 | droid starship | 20483 |

**Cross-source relationships:** B1-Series squad is derived from Core B1; Battle Droid Assassin is based on a B1 chassis; Cold Assault Battle Droid is based on a B2 chassis; A-DSD is an advanced Dwarf Spider; Ultra Droideka is an enlarged Droideka. These are *related published statblocks*, not replacements for the Core listings.

**Schema-critical discoveries:** (1) a squad is a mechanical aggregate, not another factory chassis; (2) an autonomous vehicle may have `Crew droid brain` or `Crew 0`, separate from organic crew; (3) IG-110 has printed Jedi class levels but is explicitly **not a Jedi**; (4) CLL-6 tray manipulators, a blaster-bearing combat remote and locomotion exceptions require individual capability identity; (5) Clone Wars droid followers follow a separate starting chassis/equipment policy; (6) named character-only exceptions and pricing/creation eligibility cannot be inferred from degree. Detailed integration notes are in Droid Schema v0.5.

**Audit boundary:** PDF pages examined for statblock layout/identity, including OCR collisions on dual-column pages; numeric fields, cost formulas, individual features, weapon damage and effects still require independent mechanic-by-mechanic certification.




## The Force Unleashed Campaign Guide (11 source listing identities)

**Source pass:** Whole-book TXT search for every droid-format statblock plus review of the droid chapters, other actor sections, and vehicle/starship text. Printed-page identities and statblock layouts confirmed against the image-only PDF, with **1-based PDF page = printed page + 1**. This remains an initial **publication identity** census, **not** field-level mechanical certification.

| ID | Printed statblock identity | Printed p. | TXT anchor | Published droid degree | Hero-eligibility text |
|---|---|---:|---:|---|---|
| FORCE-DROID-001 | FX-6 Medical Droid | 103 | 9835 | 1 | EXPLICITLY_PROHIBITED |
| FORCE-DROID-002 | Q7 Series Astromech Droid | 104 | 9933 | 2 | EXPLICITLY_ALLOWED |
| FORCE-DROID-003 | BD-3000 Luxury Droid | 105 | 10059 | 3 | EXPLICITLY_ALLOWED |
| FORCE-DROID-004 | Junk Droid | 106 | 10173 | Not printed | EXPLICITLY_ALLOWED |
| FORCE-DROID-005 | Brute Junk Droid | 107 | 10206 | Not printed | EXPLICITLY_PROHIBITED |
| FORCE-DROID-006 | Behemoth Junk Droid | 107 | 10243 | Not printed | EXPLICITLY_PROHIBITED |
| FORCE-DROID-007 | IT-O Interrogator | 195 | 19621 | 2 | CONDITIONALLY_ALLOWED |
| FORCE-DROID-008 | RA-7 Protocol Droid | 196 | 19732 | 3 | EXPLICITLY_ALLOWED |
| FORCE-DROID-009 | PROXY | 197 | 19802 | 4 | NOT_STATED |
| FORCE-DROID-010 | R-1 Recon Droid | 197 | 19876 | 4 | EXPLICITLY_ALLOWED |
| FORCE-DROID-011 | MSE-6 Repair Droid | 198 | 19978 | 5 | EXPLICITLY_PROHIBITED |

**Classification:** 10 generic/factory/variant droid-character statblocks plus 1 named-character statblock (PROXY). None is presented with a vehicle-format statblock. FX-6 / Q7 / BD-3000 / three junk types are in Chapter VI (pp.103-107); IT-O / RA-7 / PROXY / R-1 / MSE-6 in Chapter X (pp.195-198). No independent-droid prestige class advancement table is counted as a creature statblock. No Human-cyborg Dark Trooper Phase Zero is counted as a droid; its printed cyborg eligibility for droid systems is still a **schema cross-domain rule** (see v0.6).

**Named/factory representation:** PROXY is a unique named droid, `soldier 1/Jedi 9/independent droid 3` and `Force 2` as printed. This is published progression/resource data, not proof of biological Force eligibility. The three junk types (Medium/Large/Huge) are three independently printed statblocks under one narrative family and print **no degree** within their statblocks.

**Published pricing distinctions:** BD-3000 prints 25,000 credits new, 8,000 used; the three junk variants print **not available for sale** and only estimated values (2,610 / 3,200 / 5,000 credits); PROXY has no printed sale price. Preserve distinct source availability, sale and estimate fields, never use an estimate as a store price.

**Host/equipment exceptions:** FX-6 enumerates six hands; IT-O enumerates five tool appendages plus one claw; R-1 narrative calls its blaster integral, but statblock lists it under Possessions; MSE-6 Tiny has reach 0 and a source-specific Will-targeted condition behavior. Source-enumerated components must retain unique instances and their source statements; no fabricated universal extra attack, extra hand, or weapon grant.

**Evidence boundary:** 11/11 identities and pages visually confirmed; the book was checked for other size+droid statblock headings and relevant droid-vehicle terminology. This is not a proof that every droid-named object in narrative is a separate published statblock, nor confirmation of all numeric attacks, costs or powers. Additional published Independent Droid class and degree-gated talents are catalog subjects for rules certification, not publication creature counts.

## Galaxy at War (22 source listing identities)

**Method:** TXT-first whole-book scan of `Galaxy At War_djvu.txt`, including degree sections, battlefield equipment, and all four mini-adventures. Statblock identities / printed pages visually checked against the original PDF. **PDF 1-based page = printed page + 1** in this book. This is a publication census, **not** independent certification of all numerical fields, class progressions, prices or mechanics.

| ID | Published statblock | Printed p. | Format | TXT anchor | Hero eligibility |
|---|---|---:|---|---:|---|
| GAW-DROID-001 | A-Series Medical Droid | 51 | droid character | 4938 | EXPLICITLY_ALLOWED |
| GAW-DROID-002 | KDY-4 Tech Droid | 52 | droid character | 5042 | EXPLICITLY_ALLOWED |
| GAW-DROID-003 | Chiba-DR10 Protocol Droid | 52 | droid character | 5050 | EXPLICITLY_ALLOWED |
| GAW-DROID-004 | Air Assault Super Battle Droid | 53 | droid character | 5173 | EXPLICITLY_PROHIBITED |
| GAW-DROID-005 | Eradicator-Series Battle Droid | 53 | droid character | 5250 | EXPLICITLY_PROHIBITED |
| GAW-DROID-006 | Purge Trooper | 54 | droid character | 5318 | EXPLICITLY_PROHIBITED |
| GAW-DROID-007 | Sniper Droideka | 55 | droid character | 5394 | EXPLICITLY_PROHIBITED |
| GAW-DROID-008 | Tactical Droid | 55 | droid character | 5404 | EXPLICITLY_ALLOWED |
| GAW-DROID-009 | Vigilant 2X Picket Droid | 56 | droid character | 5538 | EXPLICITLY_PROHIBITED |
| GAW-DROID-010 | CLL-M2 Ordnance Lifter Droid | 56 | droid character | 5576 | EXPLICITLY_PROHIBITED |
| GAW-DROID-011 | MR-200 Series Minesweeper Droid | 57 | droid character | 5677 | EXPLICITLY_PROHIBITED |
| GAW-DROID-012 | Automated Sentry Gun | 98 | droid character | 10010 | NOT_STATED |
| GAW-DROID-013 | Arakyd AZ-Series Battle Droid | 181 | droid character | 17777 | NOT_STATED |
| GAW-DROID-014 | B1-Series Battle Droid | 210 | droid character | 20591 | NOT_STATED |
| GAW-DROID-015 | B2-Series Super Battle Droid | 210 | droid character | 20643 | NOT_STATED |
| GAW-DROID-016 | Droideka Series Destroyer Droid | 211 | droid character | 20689 | NOT_STATED |
| GAW-DROID-017 | Droid Commando | 214 | droid character | 21095 | NOT_STATED |
| GAW-DROID-018 | OOM-Series Battle Droid | 215 | droid character | 21169 | NOT_STATED |
| GAW-DROID-019 | Ground Armored Tank | 216 | droid-brain vehicle | 21327 | NOT_APPLICABLE |
| GAW-DROID-020 | B1-Series Battle Droid Squad | 217 | droid squad | 21399 | NOT_APPLICABLE |
| GAW-DROID-021 | Battle Droid Assassin | 218 | droid character | 21609 | NOT_STATED |
| GAW-DROID-022 | LR-57 Combat Droid | 219 | droid character | 21681 | NOT_STATED |

**Source subsections:** 11 droid models in the primary droid chapter (printed pp.51-57); one independently presented stationary sentry gun (p.98); Arakyd AZ-Series in the military mini-adventure (p.181); nine identities from the Operation First Breach adventure on pp.210-219, comprising seven individual droid actors plus one aggregate squad and one autonomous combat vehicle. **Inclusive GAW = 22.** Excluding the autonomous droid-brain GAT gives 21 character/device/squad identities; excluding both GAT and squad gives 20 individual droid actors/devices. (The GAT is also published in Clone Wars; that book already has its separate source listing.)

**Within-book repeat occurrences (not extra model identities):** Automated Sentry Gun (primary p.98, combat variant p.175), B1 (pp.210,212), B2 (pp.210,212), Tactical Droid (pp.55,213), Droideka (pp.211,218), B1 squad (pp.217,220). These six later re-presentations are linked in JSON `alternativePresentations` and `otherStatblockOccurrences`, preserving their own printed-page and text anchors. Particularly, **Sentry Gun p.175 differs mechanically** from the baseline p.98 (Ref 20 vs 15, and Grp -1 vs -5), while scene text explicitly states a +5 cover benefit. **Do not silently treat p.175 as a factory-statblock correction**; record the environmental bonus separately and flag the other discrepancies for later source reconciliation. A squad remains an encounter aggregate, not a new Large factory chassis.

**Explicit boundary cases not counted:** `Drop Pod` (p.62) has a vehicle statblock and `Crew 0 (droid brain)` for automatic descent, but is not itself presented as a droid unit or independent combat entity. The GAT (p.216), by contrast, operates as an autonomous tactical droid-brain war vehicle and remains in the previously adopted inclusive droid-vehicle count. `T8 Loading Vehicle` (p.178) is crewed by a normal organic operator, not a droid. `Cyborg Hybrid` (p.50) allows droid systems excluding processors but is a non-droid host rule, not a droid creature. These are recorded as boundaries in JSON for schema decisions.

**Additional mechanical evidence for schema:** stationarity (`Speed 0`, weapon housing `braced`), more than two appendages and telescoping tool reach, alternate power/charge and detonation sources, conditional remote control/processor shutdown, scene bonuses, and a cyborg system-host exception. More precise data contracts and tests are in v0.7.

**Gate:** 22/22 listing identities and printed pages PDF-attested; all 22 individual full-mechanical certifications pending. No GitHub writes.

## Updated ranking (6 of 17 books)

| Rank | Publication | Listings |
|---:|---|---:|
| 1 | Scavenger's Guide to Droids | 46 |
| 2 | Clone Wars Campaign Guide | 40 (39 excluding GAT) |
| 3 | Knights of the Old Republic Campaign Guide | 24 |
| 4 | Galaxy at War | 22 (21 excluding GAT) |
| 5 | Saga Edition Core Rulebook | 13 |
| 6 | The Force Unleashed Campaign Guide | 11 |
| | **Total** | **156** |

**Next planned source:** *Jedi Academy Training Manual*. The 11 remaining ledger positions are unreviewed (three lack source titles), not zero. No GitHub writes.


## Galaxy of Intrigue (8 source listing identities)

**Method:** TXT-first full-book scan of `Galaxy of Intrigue_djvu.txt`, checking every `size droid (degree)` statblock line and every `Immune droid traits` occurrence, plus narrative droid references and droid-brain vehicle terms. Seven statblocks occur in Chapter III (printed pp.72-75); the eighth occurs in Chapter VII's Deluge adventure (printed p.208). PDF images inspected for all affected pages. **PDF 1-based page = printed page + 1**. M4 and FIII appear side-by-side on printed p.74 and are interleaved in the TXT. This is identity attestation, not field-level mechanical certification.

| ID | Published statblock | Printed page(s) | Format | TXT anchor | Droid hero eligibility |
|---|---|---:|---|---:|---|
| GOI-DROID-001 | 5-BT Threat Analysis Droid | 72 | droid character | 6833 | EXPLICITLY_ALLOWED |
| GOI-DROID-002 | NR-1100 Slicer Droid | 72-73 | droid character | 6897 | EXPLICITLY_PROHIBITED |
| GOI-DROID-003 | 3D-4 Administrative Droid | 73 | droid character | 6961 | EXPLICITLY_ALLOWED |
| GOI-DROID-004 | M4-Series Messenger Droid | 74 | droid character | 7026 | NOT_STATED |
| GOI-DROID-005 | FIII Footman Droid | 74 | droid character | 7034 | EXPLICITLY_PROHIBITED |
| GOI-DROID-006 | BL-Series Battle Legionnaire | 75 | droid character | 7129 | EXPLICITLY_PROHIBITED |
| GOI-DROID-007 | B4J4 Security Droid | 75 | droid character | 7155 | EXPLICITLY_PROHIBITED |
| GOI-DROID-008 | MRD-39B Assassin Droid | 208 | droid character | 19790 | NOT_STATED |

**Source boundary decisions:** Fidelis and Solis (p.74) are named FIII droids but have no unique printed statblocks; A7-E3PO/Aysev (p.101) is described in the Droid Equality Foundation but lacks a statblock; the Prowler's assigned astromech (p.70) is a crew reference, not an independently enumerated model; the earlier Droideka mention is narrative. These are not additional droid identities. This book contains no identified droid-vehicle or droid-squad statblock.

**Mechanical/schema implications:** 5-BT's paired owner warning bracelet is an external accessory relation; NR-1100's unarmed narrative conflicts with its printed blaster attack/possession and stays unresolved; 3D-4 is described as stock unarmed but the exemplar statblock includes a concealed pistol; M4 uses conditional legality depending on installed weapon and cost 88,000 credits; FIII uses two miniaturized rail cannons and Logic Upgrade: Defender; BL-Series has named weapon-equivalence and stabilizer exceptions; B4J4 carries multiple pistols but does not gain automatic extra attacks; MRD-39B has six walking legs but only two claw appendages, integrated weapons, a secondary battery and an encounter-specific <=10 HP self-destruct behavior with **2-square splash**, distinct from NR-1100's **2-square burst**. See schema v0.8.

**Gate:** 8/8 publication identities and printed pages PDF-attested, none fully mechanically field-certified. No GitHub changes.

## Updated ranking (7 of 17 books)

| Rank | Publication | Listings |
|---:|---|---:|
| 1 | Scavenger's Guide to Droids | 46 |
| 2 | Clone Wars Campaign Guide | 40 |
| 3 | Knights of the Old Republic Campaign Guide | 24 |
| 4 | Galaxy at War | 22 |
| 5 | Saga Edition Core Rulebook | 13 |
| 6 | The Force Unleashed Campaign Guide | 11 |
| 7 | Galaxy of Intrigue | 8 |
| | **Total** | **164** |

**Next planned source:** *Jedi Academy Training Manual*. The ten remaining ledger positions are unsurveyed (three lack established titles), not zero. No GitHub writes.


## Jedi Academy Training Manual (0 droid statblock identities; audit round 8)

**Source:** `Jedi Academy Training Manual_djvu.txt`, 15,100 lines, whole-book droid/processor/model/statblock heading sweep. Source PDF: `SW Saga - Jedi Academy Training Manual (optimized).pdf`. Printed p.64 = PDF physical page 65, printed pp.78-79 = PDF physical pp.79-80. These pages were visually inspected. The full book has **zero new droid-character, droid squad, or droid-vehicle statblock identities** under the existing counting rule. This is a surveyed zero, unlike the unsurveyed future books.

| Related printed content | Printed page | TXT line | Census decision |
|---|---:|---:|---|
| Iron Knights Force tradition | 78-79 | 7080 | Not a droid statblock; Shards use droid bodies |
| Shard species traits / Droid Shell | 79 | 7221 | Species trait package, not a factory model |
| Subelectronic converter | 64 | 5824 | Cybernetic equipment rule, not a droid |
| Irek Ismaren (Lord Nyax) | 121 | 11267 | Human with an implant; not a droid |
| Juggernaut/FLTCH model mentions | 78 | 7166 | Reference to models from other books, no JATM reprint |
| Chu'unthor and automation | 148 | 14045 | Starship with droid/automation references, not a droid model |

**Schema relevance:** Although there are no new statblocks, the book establishes a Shard-in-droid-shell integration case that cannot be represented as ordinary `actor.type=droid` with default `noCON` / `noForceAffinity` flags. Shards retain Constitution and can have Force powers. Shard bodies use the specifically allowed accessory list, their printed body cost modifier is x1, and their ion damage classification is **cybernetic creature**, not the usual droid classification. Force Repair and Heal Droid provide carefully scoped healing exceptions. A subelectronic converter permits mind-affecting Force powers against droids as a function of the **attacker's implanted item**, rather than deleting immunity from the target. See schema addendum v0.9.

**Verification:** Book-wide TXT search for droids and droid statblocks, search for `nonheroic` and relevant proper names, and PDF visual checks of decisive printed pages. This certifies the **initial publication census**, not every cross-domain mechanic, talent, or item implementation. No PDF text was OCR'ed for this pass because the supplied TXT provided searchable source text and the PDF was image-backed.


## Legacy Era Campaign Guide (12 listing identities; TXT-first, PDF verified)

**Source:** *Legacy Era Campaign Guide*, Chapter V (*Equipment and Droids*), printed pp.69-77 (PDF 1-based pp.70-78). The complete book TXT was scanned for droid character/statblock signatures, droid immunities/traits, autonomous vehicles, and corroborating appendix entries. 12 droid statblocks found; all are droid-character format, with no droid-format vehicles or squads in this source pass. This is an **identity census**, not field-by-field numerical mechanical certification.

| ID | Printed listing identity | Printed page | TXT anchor | Printed degree | Hero allowed |
|---|---|---:|---:|---|---|
| LEGACY-DROID-001 | PI-Series Medical Assistant Droid | 69 | 6089 | 1 | No |
| LEGACY-DROID-002 | 3Z3 Medical Droid | 70 | 6175 | 1 | Yes |
| LEGACY-DROID-003 | BL-39 Interrogator Droid | 71 | 6244 | 1 | Yes |
| LEGACY-DROID-004 | FEG-Series Pilot Droid | 71 | 6328 | 2 | Yes |
| LEGACY-DROID-005 | Holocam Droid | 72 | 6399 | 2 | No |
| LEGACY-DROID-006 | Roving Eye Observation Droid | 73 | 6479 | 2 | No |
| LEGACY-DROID-007 | Z65 Patrol Droid | 74 | 6524 | 4 | No |
| LEGACY-DROID-008 | LV8-Series Guard Droid | 75 | 6622 | Unstated | No |
| LEGACY-DROID-009 | Aggressor-Series Battle Droid | 76 | 6688 | 4 | Yes |
| LEGACY-DROID-010 | IX-6 Heavy Combat Droid | 76 | 6780 | 4 | No |
| LEGACY-DROID-011 | LON-29 Battle Droid Commander | 77 | 6861 | 4 | No |
| LEGACY-DROID-012 | HV-7 Loading Droid | 77 | 6953 | 5 | Yes |

**Count and rules boundaries:** 5 explicitly allowed heroic models, 7 prohibited. The **LV8-Series Guard Droid (p.75)** has *no degree printed in its statline* although it appears under the Fourth-Degree heading; `identity.degree=null`, contextual degree evidence is separate. The **PI-Series Medical Assistant Droid (p.69)** is visibly printed with a capital I, which the TXT incorrectly resembles `Pl-` (and can be confused with `P1-`). Named *K2-3Z3* and *FEG-13* are narrative mentions, not new printed blocks. The X-83 Twintail's astromech is a crew option, not a new droid listing.

**Schema deltas:** droid-degree `explicit` versus `sourceSectionInference`, expression/comprehension language modes, distinct integrated weapon-mount occupancy, selective carrying-capacity multipliers (HV-7 has x3), droid crew role independent of actor type (FEG pilot), and model-specific baseline versus actual loadout. Details and fixtures: `SWSE_Droid_Rules_to_Schema_v0_10.md` sections `SCHEMA-LEGACY-*`.

**Replica Droid follow-up:** The prior Species-refactor deferral of Shards and replica-droid PCs remains owner decision `DROID-ARCH-002`. Searchable *Threats of the Galaxy* TXT contains a `NEW SPECIES: REPLICA DROID` section (around line 14954), with explicit PC rules; it must be verified from the printed PDF in its own book pass. This cross-book locator is not a Legacy model and does not increment its count.

**Certification:** 12/12 identities and printed page labels verified for census; 0/12 fully field-level mechanically certified. No GitHub writes.


## Rebellion Era Campaign Guide (15 listing identities; TXT-first, PDF verified)

**Source:** `Rebellion Era Campaign Guide_djvu.txt` full-book sweep of printed droid-character statlines, repeated `Immune droid traits` occurrences, chapter and sidebars, named NPCs, and autonomous droid-vehicle terms. PDF: `Star Wars Saga Edition - Rebellion Era Campaign Guide.pdf`; 1-based PDF page is printed page + 1. Specific PDF printed pp.53-57, 110, 127-130, and 143-144 were visually checked. The LOM and BT-16 statblocks on printed p.55 share columns, producing interleaved TXT; PDF used to disambiguate. **This is publication-identity/page attestation, not numeric field certification.**

| ID | Published listing identity | Printed page(s) | TXT heading line | Degree | Hero status |
|---|---|---:|---:|---:|---|
| REBELLION-DROID-001 | FX-7 Medical Droid | 53 | 4659 | 1 | EXPLICITLY_PROHIBITED |
| REBELLION-DROID-002 | R4-Series Agromech Droid | 53-54 | 4736 | 2 | EXPLICITLY_ALLOWED |
| REBELLION-DROID-003 | WED Treadwell Repair Droid | 54 | 4803 | 2 | EXPLICITLY_ALLOWED |
| REBELLION-DROID-004 | LOM-Series Protocol Droid | 55 | 4916 | 3 | EXPLICITLY_ALLOWED |
| REBELLION-DROID-005 | BT-16 Perimeter Security Droid | 55-56 | 4906 | 4 | EXPLICITLY_PROHIBITED |
| REBELLION-DROID-006 | RHTC-560 Hunter Trainer | 57 | 5016 | 4 | EXPLICITLY_PROHIBITED |
| REBELLION-DROID-007 | HT Drone | 57 | 5066 | 4 | EXPLICITLY_PROHIBITED |
| REBELLION-DROID-008 | LV-38 Spotter/Probe Droid | 110 | 10368 | 4 | NOT_STATED |
| REBELLION-DROID-009 | Imperial Espionage Droid | 127 | 12090 | 3 | EXPLICITLY_ALLOWED |
| REBELLION-DROID-010 | Dark Trooper Phase I | 128 | 12165 | 4 | EXPLICITLY_PROHIBITED |
| REBELLION-DROID-011 | Dark Trooper Phase II | 128-129 | 12219 | 4 | EXPLICITLY_PROHIBITED |
| REBELLION-DROID-012 | Dark Trooper Phase III | 129 | 12322 | 4 | EXPLICITLY_PROHIBITED |
| REBELLION-DROID-013 | Imperial City Maintenance Droid | 130 | 12469 | 5 | EXPLICITLY_ALLOWED |
| REBELLION-DROID-014 | 4-LOM | 143 | 13711 | 3 | NOT_STATED |
| REBELLION-DROID-015 | IG-88 | 144 | 13829 | 4 | NOT_STATED |

**Section breakdown:** 7 Chapter III model/drone records (pp.53-57), 1 Alliance LV-38 spotter/probe (p.110), 5 Imperial chapter model records (pp.127-130), and 2 named bounty hunters (pp.143-144). **15 droid-actor blocks, 0 droid squad blocks, 0 qualifying autonomous droid-vehicle blocks**. The LV-38 can be carried as a spotter aboard an ordinary artillery vehicle but that vehicle is not thereby a droid.

**Source boundaries:** 4-LOM has its own published statblock and belongs to the LOM-Series model family; both count as distinct publication identities. One IG-88 statblock is printed, not separate ones for the IG-88A/B/C/D and IG-72 narrative bodies. The Imperial City Maintenance Droid's former RC-M designation is an alias, not a second block. Dark Trooper Phase II/III wearable armor descriptions are equipment rules, not separate droid actors. B'omarr monks adapting BT-16 droids to carry sentient brains are described narratively without a separate mechanical statblock. HT Drone is a distinct statblock from its RHTC-560 controller, whose listed cost explicitly excludes the drones.

**Schema priorities:** stationary FX-7 with 20 hands; independently classified physical appendages rather than action-count multipliers; BT-16 brain occupant vs chassis; HT drone controller/command and lost-link duration; multiple locomotion speeds on HT drone; model-vs-named-statblock identities 4-LOM and LOM; IG-88 consciousness copy is narrative not a duplicated printed body; Dark Trooper wearable suit vs factory droid with overlapping terminology; appropriate weapons as integrated systems vs possessions; phase-specific shield/armor conditional bonuses; separate vehicle crew and spotter droid. See v0.11 addendum.

**Certification:** 15/15 source identity headings and printed page locations PDF-attested, **0/15 fully mechanically certified**. No GitHub changes.

## Updated publication ranking (10 books surveyed)

| Rank | Book | Listings |
|---:|---|---:|
| 1 | Scavenger's Guide to Droids | 46 |
| 2 | Clone Wars Campaign Guide | 40 |
| 3 | Knights of the Old Republic Campaign Guide | 24 |
| 4 | Galaxy at War | 22 |
| 5 | Rebellion Era Campaign Guide | 15 |
| 6 | Saga Edition Core Rulebook | 13 |
| 7 | Legacy Era Campaign Guide | 12 |
| 8 | The Force Unleashed Campaign Guide | 11 |
| 9 | Galaxy of Intrigue | 8 |
| 10 | Jedi Academy Training Manual | 0 |
| | **Total** | **191** |

**Next book:** *Scum and Villainy*. Seven ledger slots remain unreviewed, of which three have yet to be identified as publications.


## Scum and Villainy (5 listing identities; TXT-first, PDF verified)

**Sources:** `Scum and Villainy_djvu.txt` (whole-book droid/statblock candidate sweep) and `SAGA EDITION - Scum and Villainy.pdf` (image-only, physical PDF page = printed page + 1). PDF printed p.96, pp.156-157, and repeated-adventure p.216 visually inspected. No independent droid vehicle or squad statblock found. This is **identity and provenance certification**, not field-level mechanical certification.

| ID | Printed identity | Printed page | TXT anchor | Degree | Model price (new / used) |
|---|---|---:|---:|---:|---|
| SCUM-DROID-001 | Industrial Automaton K-Series Spaceport Control Droid | 96 | 6551 | 3 | 5,500 / unstated |
| SCUM-DROID-002 | Industrial Automaton RX-Series Pilot Droid | 96 | 6584 | 2 | 7,300 / unstated |
| SCUM-DROID-003 | Roche 11-17 Series Mining Droid | 156 | 11406 | 5 | 3,500 / 2,650 |
| SCUM-DROID-004 | Roche 8D8 Smelting Operator Droid | 157 | 11470 | 5 | 2,500 / 1,800 |
| SCUM-DROID-005 | Roche J9 Worker Drone | 157 | 11491 | 3 | 1,200 / 900 |

**Linked repeat:** The Roche 11-17 appears as `11-17 Series Mining Droid (M)` in the *Mining Droid Mishap* encounter, **printed p.216** (TXT line 15182 / PDF p.217). The full statblock is a repeat; its programmed hostile response is **encounter context**, not a new factory model. Linked as `SCUM-ALT-001`; no additional count.

**Source-specific observations:** K-Series (3rd-degree, 2 hand appendages) has a licensed 5,500-credit price and is explicitly hero-eligible. RX-Series (2nd-degree, hovering, 3 claws) has a licensed 7,300-credit price and is explicitly hero-eligible. RX-Series also appears in the Scavenger Codex, but equivalence/mechanical parity has not been certified. Roche 11-17 has magnetic feet, two tools, an independent telescoping appendage, plasma jet, and saw. Roche 8D8 has a model-specific +20 equipment bonus to Fortitude Defense against extreme heat and fire, due to its heat-resistant coating. J9's systems list contains walking locomotion, basic processor, translator unit (DC 5), and vocabulator, but **no hand/claw appendages explicitly enumerated**; do not infer manipulators from its appearance or profession. Do not silently equate Roche **8D8** with Scavenger's **8D Smelter**.

**Modification rules and schema boundaries (not statblock identities):** Printed **p.37** defines equipment upgrade slots; **pp.38-39** provide stripping/size and installation procedures. Printed **p.40** defines the **Droidification** upgrade (two equipment upgrade points, 2,000 credits, Licensed): a non-weapon, non-armor, non-vehicle **device** can become a droid with the indicated ASP labor-droid derived statistics, and retain its original device functions. That creates a device/droid identity crossover, not a new factory chassis or unlimited right to attach droid components. Printed **p.41** explicitly forbids **Memory Upgrade** on droids *including droidified equipment*. Keep equipment upgrade points owned by the modified Item, not merged into droid physical appendage/component capacity. Relevant proposed contract: `SWSE_Droid_Rules_to_Schema_v0_12.md`.

**Gate:** 5/5 printed listing identities and pages PDF-checked; 0 field-level mechanically certified. The repeated mining statblock is separately linked as an occurrence. No GitHub writes.

## Updated ranking (11 of 17 books)

| Rank | Book | Listings |
|---:|---|---:|
| 1 | Scavenger's Guide to Droids | 46 |
| 2 | Clone Wars Campaign Guide | 40 |
| 3 | Knights of the Old Republic Campaign Guide | 24 |
| 4 | Galaxy at War | 22 |
| 5 | Rebellion Era Campaign Guide | 15 |
| 6 | Saga Edition Core Rulebook | 13 |
| 7 | Legacy Era Campaign Guide | 12 |
| 8 | The Force Unleashed Campaign Guide | 11 |
| 9 | Galaxy of Intrigue | 8 |
| 10 | Scum and Villainy | 5 |
| 11 | Jedi Academy Training Manual | 0 |
| | **TOTAL** | **196** |

**Next source:** Starships of the Galaxy. The remaining unreviewed titles must not be treated as zero.


## Starships of the Galaxy (3 listing identities; TXT-first and PDF verified)

**Sources:** `Starships of the Galaxy_djvu.txt`, dedicated **Droid Starfighters** section printed pp.78-79; scanned `SAGA EDITION - Starships of the Galaxy.pdf` PDF one-based pp.79-80 visually checked. Full-book TXT search covered droid starfighters, droid brain, control ships, `Crew 0`, and autonomous/crew patterns. The established vehicle refactor's canonical publication ledger on `feat/vehicle-canonical-census-cutover` independently contains all three exact printed identities and page-reviewed facts. These are new **droid-census cross-index records**, not a new source of vehicle statistics or implementation authority.

| Droid-census ID | Exact printed identity | Printed p. | TXT line | CL | Crew (quality) | Vehicle audit `sourceEntryKey` |
|---|---|---:|---:|---:|---|---|
| SOTG-DROID-001 | Baktoid Armor Workshop Vulture-class Starfighter | 78 | 7405 | 7 | 0 (expert) | `sotg-baktoid-armor-workshop-vulture-class-starfighter` |
| SOTG-DROID-002 | Phlac-Arphocc Automata Industries Droid Tri-Fighter | 79 | 7515 | 9 | 0 (expert) | `sotg-phlac-arphocc-automata-industries-droid-tri-fighter` |
| SOTG-DROID-003 | Haor Chall Engineering Scarab-class Starfighter | 79 | 7566 | 6 | 0 (skilled) | `sotg-haor-chall-engineering-scarab-class-starfighter` |

**Census total: 3** publication-specific autonomous droid starfighters, all vehicle/statship-scale format. No separately statted droid creature, squad or conventional droid-PC model was found in this book. The Vulture has walking (6-square), flying (16-square), and starship-scale (4-square) speed; the other two have only printed flight speeds. The Vulture explicitly prints `Immune droid traits`. A general capability paragraph on printed p.79 gives **droid starfighters** droid immunities and an exception to attack with all their weapons as though each had its own gunner. The shared section also describes usual external command from a Droid Control Ship; independent droid brains are possible but **not assumed standard equipment for every instance**.

**Source boundaries:** The Recusant-class light destroyer is a 300-crew capital ship that uses automated droid technology; the Lucrehulk-class Droid Control Ship is a crewed controller platform. Neither is counted as a droid *identity*. An Escape Pod also has Crew 0, proving `crewCount === 0` cannot establish a droid. The Core Rulebook Vulture is a separate **Core publication claim** in the ship audit; its family relation to this SotG Vulture remains a cross-book reconciliation question, not a reason to collapse source identities. The Lucrehulk controller, Recusant automation and Core Vulture have source-boundary records in the JSON.

### Vehicle refactor reuse and certification boundary

Checked the read-only GitHub branch `feat/vehicle-canonical-census-cutover` (not assumed merged into `main`):

- `data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json` already defines all three droid starfighter source identities, printed statblock field groups and attack-group source evidence. Each is `endPageReviewStatus: PDF_VERIFIED` but `fullFieldCertified:false` and `fullWeaponMountReconciled:false`. Each warns that physical mounts/barrels and firing arcs are not fully established.
- `docs/audits/vehicles/swse-sotg-cp20-final-source-fidelity-closeout.md`: source review completion is not strict mount/mechanical certification; **100 unresolved strict records** at this checkpoint and **zero trusted stock attack grants**.
- `docs/audits/vehicles/swse-phase2c-future-vehicle-droid-modification-dependencies.md`: stock baseline + validated modifications + transient state; preserve separate ship, weapon attack-group, physical mount, arc and operator identities; no duplicate engine.
- `docs/audits/vehicles/swse-sotg-cp23c4c-canonical-import-normalization-blocker.md`: certified-source-to-runtime import is still explicitly blocked for one unrelated 15-ship proposal set because legacy normalizer loses numeric initiative/unknown evidence; do not claim all source-reviewed vehicles are production certified.

**Source identity review:** 3/3 verified against scanned printed pages and ship authority. **Field-level and physical-mount certification:** 0/3. **Trusted Foundry stock attack authorization:** 0/3. Nothing modified in the GitHub repo.

### Ranking (12 of 17 books)

| Rank | Book | Listings |
|---:|---|---:|
| 1 | Scavenger's Guide to Droids | 46 |
| 2 | Clone Wars Campaign Guide | 40 |
| 3 | Knights of the Old Republic Campaign Guide | 24 |
| 4 | Galaxy at War | 22 |
| 5 | Rebellion Era Campaign Guide | 15 |
| 6 | Saga Edition Core Rulebook | 13 |
| 7 | Legacy Era Campaign Guide | 12 |
| 8 | The Force Unleashed Campaign Guide | 11 |
| 9 | Galaxy of Intrigue | 8 |
| 10 | Scum and Villainy | 5 |
| 11 | Starships of the Galaxy | 3 |
| 12 | Jedi Academy Training Manual | 0 |
| | **TOTAL** | **199** |

**Next book:** Threats of the Galaxy, including the previously deferred Replica Droid PC rule family. Five ledger positions remain unreviewed or unidentified.


---

## Threats of the Galaxy — 29 publication identities (Round 13)

**Primary sources:** `Threats of the Galaxy_djvu.txt` and scanned *Threats of the Galaxy* PDF. Chapter III, printed pp.133–160. The PDF index matches the printed-page number (so `pdfPageStart1Based` = printed page + 1). All 29 statblock pages were visually examined by contact montage, with targeted enlarged PDF reviews of B3-A/IG, Replica Droid/Guri, and the Sith Elite Warbot. **This is identity/page certification, not full numerical mechanical certification.**

| ID | Published statblock | Printed page | Printed degree | Hero eligibility | TXT line |
|---|---|---:|---:|---|---:|
| THREATS-DROID-001 | VX Series Artillery Droid | 134 | 4 | PROHIBITED | 12933 |
| THREATS-DROID-002 | ASN-121 Assassin Droid | 135 | 4 | PROHIBITED | 13041 |
| THREATS-DROID-003 | R3 Series Astromech Droid | 136 | 2 | ALLOWED | 13150 |
| THREATS-DROID-004 | R4 Series Astromech Droid | 137 | 2 | ALLOWED | 13263 |
| THREATS-DROID-005 | R5 Series Astromech Droid | 138 | 2 | ALLOWED | 13367 |
| THREATS-DROID-006 | R7 Series Astromech Droid | 138 | 2 | ALLOWED | 13454 |
| THREATS-DROID-007 | R2-R Series Reconnaissance Astromech Droid | 139 | 2 | NOT_STATED | 13535 |
| THREATS-DROID-008 | B3 Series Ultra Battle Droid | 140 | 4 | PROHIBITED | 13588 |
| THREATS-DROID-009 | B3-A Series Ultra Battle Droid | 141 | 4 | PROHIBITED | 13686 |
| THREATS-DROID-010 | IG Series Battle Droid | 141 | 4 | NOT_STATED | 13773 |
| THREATS-DROID-011 | Pistoeka Buzz Droid | 142 | 4 | PROHIBITED | 13833 |
| THREATS-DROID-012 | EVS Construction Droid | 143 | 5 | PROHIBITED | 13963 |
| THREATS-DROID-013 | GRZ-6B Demolitions Droid | 144 | 5 | PROHIBITED | 14045 |
| THREATS-DROID-014 | 3PX Espionage Droid | 145 | 4 | PROHIBITED | 14171 |
| THREATS-DROID-015 | TO-D Interrogation Droid | 146 | 1 | PROHIBITED | 14232 |
| THREATS-DROID-016 | GH-7 Medical Droid | 147 | 1 | ALLOWED | 14329 |
| THREATS-DROID-017 | EG-6 Series Power Droid | 148 | 5 | ALLOWED | 14430 |
| THREATS-DROID-018 | DRK-1 Probe Droid | 149 | 4 | ALLOWED | 14510 |
| THREATS-DROID-019 | M-3PO Series Military Protocol Droid | 150 | 3 | ALLOWED | 14612 |
| THREATS-DROID-020 | TC Series Protocol Droid | 151 | 3 | ALLOWED | 14724 |
| THREATS-DROID-021 | Replica Droid | 152 | — (replica rules: 4th) | ALLOWED | 14795 |
| THREATS-DROID-022 | Guri | 153 | — (replica rules: 4th) | NOT_STATED | 14885 |
| THREATS-DROID-023 | WSB-15 Sabotage Droid | 154 | 4 | PROHIBITED | 15008 |
| THREATS-DROID-024 | 501-Z Police/Security Droid | 155 | 4 | PROHIBITED | 15135 |
| THREATS-DROID-025 | Mark VII Inquisitor Series Seeker Droid | 156 | 4 | PROHIBITED | 15211 |
| THREATS-DROID-026 | Imperial Mark IV Series Sentry Droid | 157 | 4 | PROHIBITED | 15299 |
| THREATS-DROID-027 | SD-6 Hulk Infantry Droid | 158 | 4 | NOT_STATED | 15395 |
| THREATS-DROID-028 | Sith Elite Warbot | 159 | 4 | NOT_STATED | 15533 |
| THREATS-DROID-029 | PK Worker Droid | 160 | 5 | ALLOWED | 15614 |

**Counting:** 27 ordinary droid-character statblocks + 1 general Replica Droid statblock (p.152) + Guri (p.153) = **29**; 0 droid-vehicle statblocks, 0 droid squads. Replica player traits printed p.153 are NOT counted as a separate statblock; Guri IS separately counted as a named-character statblock. A Sith sword and Discord Missile Launcher are equipment, not droids.

**DROID-ARCH-002 resolved source checkpoint:** Replica droids were intentionally punted from the organic Species refactor together with Shards. Their player-facing rules are printed p.153 in a species-traits format, but are **droid PCs**: +2 STR, +2 DEX, -2 CHA, no CON; Small/Medium copied humanoid *shape*, Small has +1 Reflex/+5 Stealth/3/4 carrying and speed 4 vs Medium speed 6; two initial installed systems from the six listed alternatives (integrated comlink, darkvision, diagnostics package, improved sensor package, internal storage subject to size, translator unit DC 15); treated as 4th-degree with normal droid traits/immunities and no maintenance requirement; conditional Skill Focus (Deception) if Deception is trained; Basic plus copied species native language. This is source-verification only. Do NOT infer inheritance of a copied species entire biological trait package. Shards are distinct crystalline occupants of droid shells and retain their JATM-specific Constitution/Force/ion rules.

**Special cases:** B3 and B3-A are separate printed statblocks, with processor/secondary-battery differences; non-fourth-degree behavioral restrictions discussed p.133 remain subject to DROID-RULE-001 source precedence; Pistoeka buzz droids are deployed as three independent actors via discord missiles p.142; Guri has a separate level-10 named replica profile with no implied player starting-level entitlement; the Sith Elite Warbot prints Force Points and Dark Side Score but does not thereby grant general Force-sensitivity to all droids. Do not convert the IG lancer weapon's +1 square reach into a permanent body reach modifier.

**Status:** 29/29 publication identities and printed pages visually cross-checked; general replica PC rules verified on printed p.153; mechanical field-by-field parity, live Foundry behavior, and Hero-PC creation routing are NOT certified. No GitHub writes.


---

## The Unknown Regions — 6 publication identities (Round 14)

**Primary sources:** `Unknown Regions_djvu.txt` (23,661 lines), `SW_Saga_The_Unknown_Regions.pdf` (226 physical pages). **Chapter II: Equipment — Droids**, printed pp.43–47 (PDF physical 1-based pp.44–48). Whole-book TXT and PDF scans for droid-type/trait statblocks detected no additional standalone droid statblocks. Source pages checked as rendered contact images with direct text cross-check. The book expressly gives each model a standard statblock **and** a *Scavenger's Guide* protocol-format presentation; record one listing plus a linked alternate presentation per model.

| ID | Droid model | Printed page(s) | Degree | Hero permission | TXT line |
|---|---|---:|---:|---|---:|
| UNKNOWN-DROID-001 | AS23 Aerial Survey Droid | 43 | 3 | PROHIBITED | 4206 |
| UNKNOWN-DROID-002 | DSH-3 Probe Droid | 44 | 4 | PROHIBITED | 4305 |
| UNKNOWN-DROID-003 | F1 Exploration Droid | 44–45 | 5 | ALLOWED | 4407 |
| UNKNOWN-DROID-004 | MULE Droid | 45–46 | 5 | ALLOWED | 4520 |
| UNKNOWN-DROID-005 | Wanderer Scout Surveyor Droid | 46–47 | 5 | PROHIBITED | 4663 |
| UNKNOWN-DROID-006 | WED-20 Treadwell | 47 | 1 | ALLOWED | 4771 |

**Scope:** Six ordinary droid-character model statblocks, zero qualifying droid-vehicle statblocks, zero droid squads. Three explicitly playable droid-hero models and three explicitly prohibited. Six additional alternate protocol views are *linked presentations*, not extra identities.

**Schema findings and certification blockers:**

- **AS23 Aerial Survey Droid, p.43:** Its airborne **Spotter** support can ignore concealment and reduce a spotted target's cover by one step for qualifying attacks. Preserve its model-scoped conditions; do not promote it to a universal sensor modifier or an extra attack. Flying speed 9.
- **DSH-3 Probe Droid, p.44:** **Easily Hidden** permits taking 10 on Stealth despite distractions/threats. The source explicitly compares it with the DRK-1, but the DSH-3 does not have the same stealth shell or weapon systems. Preserve separate publication identities and conditional model lineage.
- **F1 Exploration Droid, pp.44–45:** Four walking legs and a claw-jaw are separately categorized. Its motion sensor reroll and master-assistance behavior are specific; no species-style movement or free actions inferred from extra legs.
- **MULE Droid, pp.45–46:** Internal storage 10 kg and external cargo 40 kg are distinct capacities. Hover speed 4 with maximum altitude 1 m. **Printed unresolved numerical discrepancy:** Skills Mechanics **+9** vs Self-Diagnostic **+11**, with a +4 benefit to a master's repair check.
- **Wanderer Scout Surveyor Droid, pp.46–47:** Eight walking legs, four tool appendages, one claw, stun weapon, and model-scoped 360-degree-vision protection. **Printed unresolved difference:** main statblock Perception **+6**, but protocol Notice Targets specifies **+12**. Do not auto-reconcile or apply all-time +12.
- **WED-20 Treadwell, p.47:** Seven arms comprise two claws and five tools. It has a +2 scientific Knowledge equipment bonus; the alternate protocol gives a separate assistance presentation. Do not stack two descriptions of one installed system or conflate WED-20 with WED-15.

**Count closure:** 13 previously reviewed sourcebooks (228) + six Unknown Regions statblocks = **234 identities across 14/14 identified printed rulebooks**. Three residual positions in the original 17-slot plan remain unverified scope placeholders. This is not a claim of 234 unique factory models, full mechanics, component legality, or Foundry V13 runtime certification. No GitHub changes.
