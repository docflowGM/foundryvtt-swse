# SWSE Vehicle Canonicalization — Clone Wars Phase 2B, Checkpoint 4

**Scope:** exactly the **next ten publication-specific source reviews**, following CP3's first 25. This checkpoint covers the ten Phase 1 records ordered from BC-714 through Punworcca 116; the nearby Sheathipede remains **not reviewed**, even though its full block is on the same scanned page as Punworcca. **Cumulative 35/41 PDF source close reads, 6 pending, 0/41 strict field-and-mount mechanical certificates.** No production compendia, runtime mechanics, vehicle actor data, universal schema freeze, or Phase 3 hydration was changed.

## Authorities, evidence, and notable page-mapping defect

- Authoritative scanned source: user-provided *Clone Wars Campaign Guide* PDF, SHA-256 `3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6`.
- Searchable `Clone Wars Campaign Guide_djvu.txt` was used for navigation only; mechanically unusual printed numbers and actions were read on rendered PDF pages.
- Prior provenance authority: repository `data/audits/vehicles/swse-phase1-vehicle-provenance.json`, blob SHA `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`; current audit branch `audit/vehicle-phase-0-1-canonical-foundation` was checked at `a5e728273acd1b0352f31fbd235f7378081770d8` before this checkpoint.
- **Page inversion and provenance discrepancy requiring controlled correction:** the PDF image at zero-based index **209** is labeled printed **210**, and displays the **Punworcca 116-class Sloop** and Sheathipede. Conversely, PDF index **210** is labeled printed **209**, and displays the Providence / Invisible Hand statblocks. Phase 1 assigns the Punworcca identity key `cw-punworcca-116-class-sloop` the *printed start page 209*, which is inconsistent with the primary scan. This CP4 ledger deliberately **preserves the Phase 1 stored page value (209) and stable identity**, records **actual printed page 210 / image index 209**, and flags a separate provenance correction task. Never silently turn this into a new ship identity or pretend a verified print page is 209.
- Punworcca's `Microtractor-Pressor` specifically references **Weapon Systems, printed p.198**; that page was visually reviewed as supplemental mechanical authority.
- Separate publication identities never merge simply because variants share a name or design. Attack-group rows, physical mounts, gunner stations, battery quantities, firing arcs, and ammunition are independent evidence categories.

## Checkpoint totals

| Measure | CP3 baseline | CP4 additions | CP4 cumulative |
|---|---:|---:|---:|
| Phase 1 ship identity keys | 41 | 0 | **41** |
| Complete primary PDF source close reads | 25 | **10** | **35** |
| Unreviewed ship source entries | 16 | −10 | **6** |
| Strict full mechanical / physical-mount certificates | 0 | 0 | **0** |
| Weapon attack groups catalogued | 45 | **16** | **61** |
| Source-silent physical hardware counts (per attack group) | 33 | 10 | **43** |
| Source-silent firing arcs (per attack group) | 45 | 16 | **61** |
| Source-silent battery composition/quantities (per attack group) | 39 | 14 | **53** |
| Discovery-only local schema cases | 20 | **12** | **32** |
| Existing printed weapon attack conflicts | 1 | 0 | **1** |

The one printed mechanical attack conflict remains the earlier **Seltiss-2 main hull +2 Ranged / +4 weapon-row** conflict. The Punworcca **Phase 1 registry vs scanned print-page discrepancy is separate**, not a second printed mechanical attack conflict. The previous **155 SotG discovery-only cases** remain outside this Clone Wars total. Missing or source-silent values are not zeros.

## The ten new individual printed-statblock close reads

### 1. BC-714 Luxury Transport — printed p.203 — `cw-bc-714-luxury-transport`

**CL 5, Colossal space transport**; Initiative −5, Perception +5; Ref 12 (flat-footed 12), Fort 27, armor +12, **SR 45**, DR 15, HP 135, damage threshold 77. Speed fly **16** character / **2** starship squares, maximum **1,800 km/h**. Str 44, Dex 10, Int 18; BAB +0, grapple +37; Mechanics +5, Pilot −5, Use Computer +5. Crew **17 normal**, passengers **30**, cargo **80 tons**, six-month consumables; **×1 hyperdrive / ×6 backup**, nav computer. Restricted **1,700,000 credits / 980,000 used**.

**No ranged attack or weapon table is printed.** The text describes a fast, comfortable ship that lacks firepower. There are **0 printed attack groups**, but no exhaustive external weapons/mount manifest; do not manufacture installed weapons or treat the entire hull as mechanically certified solely from absence of attack rows. The yacht also includes private staterooms and 20-seat holotheater, neither of which is an attack power.

### 2. Belbullab Heavy Starfighter — printed p.204 — `cw-belbullab-heavy-starfighter`

**CL 13, Gargantuan starfighter**; Init +3, Perception +6, Ref 17 (flat-footed 17), Fort 28, armor +10, Vehicular Combat, **SR 25**, DR 10, HP 160, threshold 48. Speed **16/4**, **1,100 km/h**. Str 47, Dex 14, Int 14; BAB +2, grapple +35; Pilot +3, Use Computer +6; **one skilled pilot**, 140 kg cargo, one-week supplies; **×6 / ×15 backup** with nav computer; Military **168,000 / 125,000 used**.

One shared block explicitly differentiates **Belbullab-22, -23 and -24** instead of publishing three independent statblocks. **The -22 uses two triple laser cannons +6, 5d10×2; the -23 and -24 use two triple laser cannons +6, 6d10×2; the -24 alone has two concussion missile launchers +6, 9d10×2 and twelve missiles.** The `Ranged ... or ...` alternatives must remain conditional. Three **variant-qualified printed weapon rows** are inventoried, not three simultaneously installed weapon families on a stock -22. Count of weapons printed; arcs and internals not resolved.

### 3. *Soulless One* (Modified Belbullab-22) — printed p.204 — `cw-soulless-one-modified-belbullab-22`

**Independent named CL 14** modified Gargantuan fighter; Init +7, Perception +8, Ref **21** (flat-footed 19), Fort 28, SR 25, DR 10, HP 160, threshold 48; speed **16/4**, **1,100 km/h**. Str 47, **Dex 19**, Int 14; BAB +5, grapple +38; Pilot +7, Use Computer +8; one **expert** pilot, 160 kg cargo, **no consumables**; **×2 / ×5 backup** hyperdrive, nav computer; Military, **not available for sale**.

Unique triple lasers **+9 (+4 autofire), 5d10×2**. Narrative states a special **HoloNet transceiver**. Unlike the -24's conditional loadout, the printed Soulless One has **no concussion missile launchers or ammo listed**. Do not overwrite stock Belbullab data with Grievous's better drive or pilot values.

### 4. C-9979 Landing Craft — printed p.205 — `cw-c-9979-landing-craft`

**CL 10, Colossal (frigate) space transport**; Init −5, Perception +5, Ref 11 (flat-footed 11), Fort 34, armor +11, **SR 60**, DR 15, HP 600, threshold 134; fly **12/1**, **590 km/h**; Str 58, Dex 10, Int 16; BAB +0, grapple +49. Crew **88 OOM-Series battle droids (normal)**; passengers **30 repair, 40 OOM command, 39 OOM pilot, 15 OOM security droids**. Cargo 1,800 tons, one-day supplies; carried craft **28 Trade Federation troop carriers, 114 AATs, 11 MTTs**. Military **200,000 / 75,000 used**. **Hyperdrive unprinted**, left source-silent.

Printed attacks: **2 fire-linked laser cannons +3, 5d10×2** and **2 fire-linked blaster cannons +3, 5d10×2**; blasters explicitly autofire-capable. The narrative also establishes removable wings for transport aboard larger vessels and rapid repulsor-track unloading. Neither is a zero-action ship transformation. Do not confuse vehicle cargo and the crew/passenger droid complements with physical weapons.

### 5. CIS-Advanced Starfighter — printed p.206, narrative p.205 — `cw-cis-advanced-starfighter`

**CL 9, Huge fighter**; Init +7, Perception +6, Ref 15 (flat-footed 12), Fort 24, armor +4, Vehicular Combat, SR 25, DR 10, HP 90, threshold 34; fly **16/5**, **1,300 km/h**. Str 38, Dex 15, Int 16; BAB +2, grapple +26; Mechanics +6, Pilot +7, Use Computer +6. One skilled pilot, 190 kg cargo, two-day supplies; **×6 hyperdrive**, nav computer; **24 proton torpedoes**; Military, **not for sale**.

Pilot chooses **heavy blaster cannons +7, 6d10×2 OR proton torpedo launchers +7, 9d10×2**. The heavy blasters have printed autofire eligibility. The torpedo payload is not 24 launchers. The narrative identifies this as an extremely rare prototype, not a generic Eta-2 variant.

### 6. Diamond-class Cruiser — printed p.206 — `cw-diamond-class-cruiser`

**CL 13, Colossal frigate space transport**; Init −4, Perception +5, Ref 13 (flat-footed 12), Fort 35, armor +12, SR 50, DR 15, HP 840, threshold 135; fly **12/1**, **1,450 km/h**. Str 61, Dex 12, Int 17; BAB +0, grapple +50. **148 normal crew**, 45 passengers, 1,380 tons cargo, three-month supplies, **×0.75 / ×4 backup** hyperdrive and nav computer. Carries **600 OG-9 homing spider droids and 2,400 DSD1 dwarf spider droids**; Military **5,000,000 / 2,125,000 used**.

**Two laser cannon batteries +13, 4d10×2** with **six gunners**. The two *batteries* are not two total individual laser barrels. The narrative describes rapid deployment of a dozen OG-9s with escorts in under a minute, without creating an automatic combat attack. This independent identity is the 41st Phase 1 Clone Wars claim, previously omitted from a preliminary 40-claim census.

### 7. Droch-class Boarding Ship — printed p.207 — `cw-droch-class-boarding-ship`

**CL 7, Huge boarding starfighter**; Init +4, Perception +6, Ref 12 (flat-footed 11), Fort 22, armor +3, DR 5, HP 60, threshold 32; fly **12/3**, **850 km/h**. Str 34, Dex 12, Int 14; BAB +2, grapple +24; one pilot, **6 droid troops**, 30 kg cargo, one-day supplies; Restricted **43,000**. **Neither SR nor hyperdrive is printed.** Laser cannon group **+6, 3d10×2** and separate pilot-operated **boarding drill +6**, non-damaging attack line `(grapple +24)`.

**Unique procedural rule:** A standard-action drill attack against an *adjacent ship* attaches the Droch to the target hull on success and moves into its space **without collision**. Subsequent standard-action pilot grapple checks deal **damage equal to the grapple check**, **ignoring the target's SR**. Once cumulative drill damage **exceeds** target damage threshold, it breaches the hull for safe passenger access. Do not replace this with ordinary collision, immediate boarding, standard tractor-beam damage or automatic token movement. **Droch** is the actual printed name; OCR sometimes wrongly says **Oroch**.

### 8. Hardcell-class Transport — printed p.207 — `cw-hardcell-class-transport`

**CL 10, Colossal (frigate) transport**; Init −4, Perception +6, Ref 14 (flat-footed 14), Fort 38, armor +14, Vehicular Combat, **SR 100**, **DR 25**, HP 800, threshold 138; fly **18/1**, **4,900 km/h**. Str 66, Dex 10, Int 18; BAB +2, grapple +55. Crew **190 skilled**, passengers **1,017**, cargo **12,400 tons**, six-month supplies, carries **650 Hailfire-class droid tanks**, **×1 / ×8 backup** hyperdrive, nav computer; Military, **not for sale**.

Two laser cannon **batteries** **+16, 4d10×2**, **six gunners**. **Critical rule:** *incoming* critical hits against a Hardcell deal **triple damage, not double**, not a bonus to its own cannon attacks. Conditional Mechanics and Use Computer values are **+15 with astromech support or +6 without**, per printed footnote. Environmental rule: Skakoans survive in the ship's specially fitted cabins without suits; other species need flight/space suits.

### 9. Hyena-class Bomber — printed p.208 — `cw-hyena-class-bomber`

**CL 7, Huge droid fighter**; **Init +8**, Perception +8, Ref 13 (flat-footed 11), Fort 22, armor +3, DR 5, HP 70, threshold 32; fly **16/4**, **1,150 km/h**. Str 35, Dex 14, Int 14; BAB +5, grapple +27, skills Mechanics/Pilot/Use Computer +8; crew **0 (expert)**, no cover, two-day consumables, Restricted **23,000**. **No SR or hyperdrive printed.** Payload **6 proton torpedoes and 6 concussion missiles**.

**All three weapon groups may fire as though each has its own gunner:** light lasers **+7, 3d10×2**, proton torpedoes **+7, 9d10×2**, light concussion missiles **+7, 7d10×2**. The printed Ranged line uses **and ... and**, not the ordinary pilot `or` choice. This is a deliberate special rule of the automated bomber, not a generic multiattack option available to normal fighters.

### 10. Punworcca 116-class Sloop — **actually printed p.210; PDF index 209** — `cw-punworcca-116-class-sloop`

**CL 6, Gargantuan space transport**; Init **+3** (**+13 FA-4-only**), Perception **+6** (**+4 FA-4-only**), Ref 12 (flat-footed 10), Fort 22, armor +5, **SR 20**, DR 10, HP 60, threshold 42; fly **16/4**, **1,600 km/h**. Str 34, Dex 14, Int 16; BAB **+2** (**+1 FA-4-only**), grapple +29. Crew **2 skilled, or 1 FA-4 pilot droid with 1 optional organic co-pilot**; passengers **11**, cargo **240 kg**, one-week supplies; **×1.5 hyperdrive**, nav computer; Licensed **35,700**.

Printed skills **Mechanics +6**, **Pilot +3 (+13*)**, **Use Computer +6 (+13*)** and **Perception +6 (+4*)**; starred alternatives apply *if the ship has only the FA-4 pilot droid*. Microtractor-pressor **(co-pilot) +2**, **grapple +14**, no damage expression. The referenced **p.198 Weapon Systems** rule says it works like a tractor beam **except grapple bonus is halved**; on a successful grapple it can **push the target 10 character-scale squares (one starship-scale square) away**. Preserve station and conditional crew capability. Count Dooku's antique solar sail is a **named custom modification**, not a stock feature of every Punworcca.

**Do not modify this record's Phase 1 key or stored `printedStatblockStartPage: 209` in a checkpoint-only patch.** This is a *provenance reconciliation blocker*: the actual printed tab is 210 at zero-based PDF index 209, and the adjacent reversed PDF image index 210 shows page 209.

## Current remaining source-review queue — exactly six

| Source entry | Phase 1 assigned printed start page | Next action |
|---|---:|---|
| Sheathipede-class Shuttle | 209 | Close read the same PDF image as Punworcca (actual printed 210); verify printed start against registry. |
| Providence-class Destroyer | 210 | Close read PDF index 210 (image labeled printed 209); retain as generic hull. |
| *Invisible Hand* | 210 | Separate named capital ship record, not a synonym for Providence. |
| Subjugator-class Heavy Cruiser | 211 | Review ion batteries, tactical fire and adjacent narrative. |
| Sabaoth Destroyer | 220 | Review printed statblock and adjacent prose. |
| Sabaoth Starfighter | 221 | Section begins on 220, statblock begins 221. |

**Caution:** this six-entry queue uses **Phase 1's stored page values**, not corrected publication-page assertions. At least the p209/p210 slice needs controlled verification before the final sourcebook page-map closeout.

## Source-silence, strict mechanical certification, and schema discoveries

- The **61** reviewed attack-group rows still have **61 source-silent firing arcs**, **43 source-silent physical hardware-count slots**, and **53 source-silent battery-composition/quantity slots**. These are *per printed attack group*, not 61 ships, not 61 physical guns, and not 61 uninstalled weapons.
- A reported `0/41` strict certificate means unresolved fields and physical mount questions remain. It **does not mean** the 35 PDF source reviews failed. Where sources are silent, mark `SOURCE_SILENT_CONFIRMED`, not zero, absent equipment, or inferred count.
- CP4 adds **12 discovery-only schema cases** `CWCP4-01` through `CWCP4-12`: model-conditional Belbullab groups, unique Soulless One, Droch drill workflow, Hardcell critical damage, Hyena multiweapon firing, Punworcca station/FA-4/microtractor rule, phase1 page mismatch, C-9979 modular wings/carried complements, Diamond batteries, attack-free BC-714, source-silent drives/SR, and Skakoan life-support constraints. The previous **20 cases** are unchanged. The separate **155 SotG cases** remain separate.
- The **historical Phase 0B** gate still reports 12 schema-invalid fixtures and 2,112 unclassified null/empty fields. This checkpoint does not claim to resolve them or authorize vehicle schema freeze / production hydration.

## Validation and GitHub safety

- Independent prior-archive QA: CP1 passed on its own original archive; CP2 passed against its original archive plus CP1; CP3 passed against its original archive plus CP2. None was retroactively mutated.
- CP4 structural validator passed with original PDF SHA-256 and **25 exact unchanged CP1–3 reviewed-entry hashes**, **25 previous mount-backlog rows**, and **20 previous schema-discovery cases** compared against the original CP3 ZIP. All ten new mechanical sentinels passed; 41 source identity keys, 35 reviewed entries, six pending, 61 weapon rows, and zero strict certifications were asserted.
- **Full live repository integration with Phase 1 JSON and the cumulative SotG / Phase 0B suite was not run**. The Phase 1 registry blob and audit branch were checked on GitHub separately. The fixed Phase 1 page mismatch is deliberately only *reported*, not written into GitHub.
- User policy is to commit and push completed books. **This book is not completed yet**, and earlier checkpoint overlays are not pushed, so **no GitHub commit or push is claimed or attempted in CP4**.

Reproduce the CP4 source/invariant tests after extracting the ZIP into a repository-aligned overlay:

```bash
python tools/audits/vehicles/check_clone_wars_phase2b_cp4.py \
  --repo . \
  --source-pdf '/path/to/SAGA EDITION - Clone Wars Campaign Guide.pdf' \
  --previous-cp3-zip '/path/to/SWSE_Vehicle_Clone_Wars_Phase2B_CP3_Changed_Files.zip'
```

When installed on the real repository containing Phase 1 provenance, also use `--require-phase1`. Book final acceptance is still **41/41 PDF close reads**, with strict mechanical certification independently recorded and unresolved mount-source-silence policy decided before any production hydration.
