# SWSE Vehicle Canonicalization — Clone Wars Phase 2B Checkpoint 2

**Scope:** *Clone Wars Campaign Guide*, printed pp. **137–139** (five separate ship publication identities) with adjacent surrounding Jedi starship section reviewed. This is a **PDF primary-source close read**, **not** full field-and-physical-mount mechanical certification and **not** authorization for production changes.

**Primary source:** original user-provided scanned PDF, SHA-256 `3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6`; physical PDF index (zero-based) equals printed page. TXT is only a navigation aid. The PDF image, including neighboring variant prose and complete listed weapon rows, was inspected on pages 137–139. Printed page 136 contains character material and page 140 continues with a speeder/other material rather than another part of these ship statblocks.

## Cumulative state — after Checkpoint 2

| Source audit gate | Outcome |
|---|---:|
| Original Clone Wars publication-specific identities | **41 / 41 preserved** |
| Checkpoint 1 source close reads (unchanged) | **13** |
| Checkpoint 2 new complete close reads | **5** |
| Cumulative source close reads | **18 / 41** |
| Source close reads outstanding | **23** |
| Strict field/physical weapon mount certificates | **0 / 41** |
| Strict complete mechanical certifications outstanding | **41** |
| Cumulative weapon attack group rows inventoried | **28** (20 + 8) |
| Attack groups with hardware count source-silent | **19** |
| Attack groups with firing arc source-silent | **28** |
| Attack groups with battery composition source-silent | **28** |
| Preserved printed internal conflicts | **1** (Seltiss-2, from CP1) |
| Local discovery-only schema cases | **12** (7 + 5) |
| Prior *Starships of the Galaxy* schema-discovery cases | **155**; retained independently |
| Full book source review finished | **No** |
| Full book mechanical certification finished | **No** |

The completed 13 CP1 records are **unchanged**: their source fields, printed pages, weapon groups, and conflicting Seltiss-2 attack entries were preserved byte-for-byte at the canonical JSON record level. The CP2 validator hashes these entire prior records and optionally cross-checks the original CP1 ZIP.

## Five printed ship entries

| Phase 1 publication identity | Printed page | Printed mechanical signature | Weapon groups |
|---|---:|---|---:|
| `cw-delta-7-aethersprite-interceptor-high-speed-variant` | 137 | CL 10; Dex 24; Init +13; Ref 18 (FF 11); HP 65; fly 18 / 6; max 1,260 km/h | 1 |
| `cw-delta-7-aethersprite-interceptor-high-maneuver-variant` | 137 | CL 10; Dex 30; Init +16; Ref 21 (FF 11); HP 65; fly 16 / 5; max 1,150 km/h | 1 |
| `cw-azure-angel` | 138 | CL 12; Dex 28; Init +19; Ref 20 (FF 11); HP 71; fly 18 / 6; payload 16 proton torpedoes | 2 |
| `cw-eta-2-actis-interceptor-high-maneuver-variant` | 139 | CL 11; Dex 32; Init +21; Ref 22 (FF 11); HP 70; armor +3; **no SR printed** | 2 |
| `cw-eta-2-actis-interceptor-heavy-defenses-variant` | 139 | CL 11; Dex 26; Init +18; Ref 20 (FF 12); HP 77; armor +4; **SR 15 printed** | 2 |

The five are **Huge starfighters** with Fort 22, DR 10 and damage threshold 32. The Delta-7s and Azure Angel have STR 34, INT 14 and CON —. The Eta-2 configurations likewise print STR 34, INT 14 and CON —. Each carries a printed +5 astromech fighting-space cover line, but that is **not** a weapon firing arc, hardware count or additional laser mount.

### Delta-7 — High-Speed vs High-Maneuver (p. 137)

Both configurations print **laser cannons +9 (+4 autofire), 6d10×2**, operated by the pilot. Both have **SR 15**, crew **1 plus astromech (expert)**, cargo **none**, passenger **none**, consumables **none (one week with booster ring)**, hyperdrive **×1 with booster ring**, astromech **10-jump memory**, and conditional Mechanics/Use Computer **+13** (normal +8). Their costs are deliberately different: **High-Speed 385,000 credits (290,000 used)**; **High-Maneuver 210,000 (160,000 used)**. Both are `Military (Jedi only)`.

**Critical conditional rule:** The High-Speed ship's Pilot +13 becomes **+20 when increasing vehicle speed**. That bonus does not replace normal Pilot +13 and is not granted to the High-Maneuver ship. High-Speed trades Dex/Initiative/Reflex for higher flight speed; these are separate, explicitly printed variants, not properties inherited by all Delta-7s.

### Azure Angel (p. 138)

Anakin Skywalker's uniquely and extensively modified Delta-7 is explicitly named **Azure Angel** and prints **CL 12**. Its **laser cannons +14 (+9 autofire), 7d10×2**, and **proton torpedoes +14, 9d10×2** are two separate pilot-operated attack groups. The printed **16 proton torpedoes** is an ammunition payload, **not** 16 launchers or launch tubes.

Further printed values: HP 71; SR 15; Initiative +19; Perception +12; Reflex 20 (flat-footed 11); 18 / 6 flight; 1,260 km/h; Pilot +19; Mechanics and Use Computer **+12, +13 with astromech**; crew **1 plus astromech (ace)**; consumables **one week**; **hyperdrive ×1**; astromech **10-jump memory**; no passengers/cargo/carried craft. Printed **availability: none; cost: Not available for sale**. Do not substitute a numeric market cost or copy the booster-ring condition from the two generic Delta-7 variants onto this unique ship.

### Eta-2 — High-Maneuver vs Heavy-Defenses (p. 139)

The Eta-2 ships are separate **CL 11** configurations. Both print **fly 16 / 6**, max **1,500 km/h**, **60 kg** cargo, **2 days** consumables (**1 week with booster ring**), **×1 hyperdrive with booster ring**, **10-jump astromech memory**, crew **1 plus astromech (ace)**, and pilot-operated **laser cannons +14 (+9 autofire), 4d10×2** plus **ion cannons +14 (+9 autofire), 4d10×2 ion**.

Differences must remain explicit:

| Field | High-Maneuver | Heavy-Defenses |
|---|---:|---:|
| Dexterity | 32 | 26 |
| Initiative | +21 | +18 |
| Pilot | +21 | +18 |
| Reflex / flat-footed | 22 / 11 | 20 / 12 |
| Armor bonus | +3 | +4 |
| Hit points | 70 | 77 |
| Shields | `SOURCE_SILENT_CONFIRMED` | **SR 15** |
| New / used price, credits | 320,000 / 240,000 | 310,000 / 230,000 |

**Do not transform source silence into SR 0** or import Heavy-Defenses SR 15 into the High-Maneuver variant. Their printed weapon-family rows are otherwise identical: a variant identity remains distinct even where the attack profile is shared.

## Weapon-mount reconciliation

The CP2 tranche adds **8 printed attack group rows**, not eight certified physical mounts. No printed statblock/prose in these five establishes exhaustive external barrel count, launcher hardware count, firing arc, or per-mount battery composition. `SOURCE_SILENT_CONFIRMED` is an affirmative close-read result, not a placeholder indicating review wasn't performed.

Each new weapon group retains its `weaponLabel`, pilot station, attack bonus, damage expression, printed page and conditional autofire bonus where applicable. The five ships remain **uncertified** for strict full mechanical/physical weapon-mount gates; no missing mount data were invented. Pay particular attention to the **Azure Angel's 16-round proton torpedo payload** and **both Eta-2 ion groups**, whose firing and damage type must not be collapsed into a generic laser group.

## Discovery-only schema cases

Prior seven cases (`CWCP1-01`–`CWCP1-07`) remain intact. The five **new** cases are:

| Case | Open schema question |
|---|---|
| `CWCP2-01` | Optional booster-ring conditional hyperdrive and consumable capacities without accidental stock installation |
| `CWCP2-02` | Astromech-derived skill-substitution values and 10-jump onboard astrogation memory |
| `CWCP2-03` | Delta-7 High-Speed situational Pilot +20 for acceleration only |
| `CWCP2-04` | Named unsalable Azure Angel configuration; unpriced economics; torpedo payload distinct from launcher hardware |
| `CWCP2-05` | Missing shield field vs explicit SR 15 in two published Eta-2 configurations |

These remain **discovery-only** rather than additions to a frozen universal vehicle schema or implementation values in production data. Do not merge the 155 prior SotG cases into this 12-case Clone Wars count.

## QA, integration, and Git status

**Validation performed against this package:**

- All 41 distinct keys and all 18 reviewed records remain present; 23 still pending.
- Entire old CP1 reviewed entry objects have matching SHA-256 canonical-JSON digests; the original CP1 ZIP was additionally used for direct cross-check.
- Original scanned PDF hash matches the CP1 source identity/hash.
- CP2 source sentinels check five separate identities, printed pages, weapons and damage types, critical variant differences, conditional booster-ring rules, hyperdrive, SR state and unique Azure Angel economics.
- All 28 attack groups reconcile against the derived mount backlog; 19 hardware counts/28 arcs/28 battery composition fields remain source-silent.
- One CP1 contradictory Seltiss-2 ranged/weapon attack bonus remains explicitly preserved: +2 vs +4.
- The five CP2 local schema discoveries are new entries, original seven remain, and production remains untouched.

The validator accepts `--require-phase1` for integration with the actual repository's `data/audits/vehicles/swse-phase1-vehicle-provenance.json`. **That file is intentionally not duplicated in the changed-files-only ZIP.** The standalone overlay test therefore flags the full Phase 1 file comparison as not locally run; the original publication identities/pages were inherited from the CP1 authority snapshot, and the integration gate should be rerun against the live repository before commit. The historical Phase 0B gate still fails (12 invalid fixtures; 2,112 unclassified null/empty values, per handoff); CP2 does not represent it as passing. The SotG cumulative 15 validators were not rerun because the full 93-file audit archive was not integrated into the test overlay.

**Remote branch verified:** `audit/vehicle-phase-0-1-canonical-foundation` at `a5e728273acd1b0352f31fbd235f7378081770d8`; the earlier CP1 and SotG Phase 2 packages have **not** been pushed by this workflow. No GitHub write, production compendium edit, field hydration, or schema freeze is claimed. The checkpoint ZIP includes only five new CP2 repository-relative files and relies on the retained CP1 ZIP for its earlier historical reports.

### Next tranche: Republic/Clone Wars ships on printed pp. 166–173

Seven Phase 1 publication entries await the next source close-read: CR-20 Troop Carrier (166), Consular-class Cruiser Charger c70 Retrofit (170), Kappa-class Shuttle (171), MedStar-class Frigate (171), Nu-class Attack Shuttle (172), Pelta-class Medical Frigate (172), Koensayr BTL-S1 Y-wing (173). Treat **Charger c70 Retrofit** separately from the SotG stock Consular-class Cruiser. Preserve the existing Phase 1 entry keys, cross-book variants, and source-page facts without production mutation.
