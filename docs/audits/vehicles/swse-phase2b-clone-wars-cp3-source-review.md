# SWSE Vehicle Canonicalization — Clone Wars Phase 2B, Checkpoint 3

**Status:** Third source-review tranche complete for printed pp. **166–173**, encompassing **7 publication-specific ships**. The book is **25/41 visually close-read**, **16 pending**, and **0/41 strict full mechanical/physical-mount certified**. The same existing **41 Phase 1 source identities** are preserved. Production ship data, packs, runtime vehicle automation, universal schema, and Phase 3 hydration are **not modified**.

## Source authority and scope

- Original source authority: user-provided scanned *Clone Wars Campaign Guide*, SHA-256 `3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6`.
- In this copy, **zero-based PDF page index n corresponds to printed page n**, i.e., physical PDF page n+1. Printed pp. 166, 170, 171, 172, and 173 were visually read along with their immediate narrative context; pages 167–169 contain adjacent vehicle material, but do not contribute extra ship statblock identities to the existing ship census.
- Searchable TXT is a navigation layer, **not** the authority for mechanical transcription.
- Phase 1 vehicle provenance blob SHA `21f2178eb6a610d3b52ecdc8549f93724c77fbc4` was rechecked on GitHub, branch `audit/vehicle-phase-0-1-canonical-foundation`, HEAD `a5e728273acd1b0352f31fbd235f7378081770d8` as verified at this checkpoint.
- Every physical weapon count, firing arc, battery composition, skill station, payload, and conditional modifier stays separate. A source-silent field is **not zero**, and an attack group or five-gunner battery is **not five physical weapon barrels**.

## Cumulative checkpoint census

| Scope | CP2 | Added CP3 | CP3 cumulative |
|---|---:|---:|---:|
| Publication-specific ship identities | 41 | 0 | **41** |
| Complete primary scanned-PDF source reviews | 18 | **7** | **25** |
| Source identities awaiting full close read | 23 | −7 | **16** |
| Attack-group rows inventoried | 28 | **17** | **45** |
| Strict full mechanical/weapon-mount certificates | 0 | 0 | **0** |
| Hardware-count source-silent attack groups | 19 | 14 | **33** |
| Firing-arc source-silent attack groups | 28 | 17 | **45** |
| Battery-composition source-silent attack groups | 28 | 11 | **39** |
| Local discovery-only schema cases | 12 | **8** | **20** |
| Printed contradictory-attack source conflicts | 1 | 0 | **1** |

Source-review completion is intentionally not synonymous with strict mechanical certification; **41 strict certificates remain outstanding**, including all 25 source-reviewed ships.

## Seven publication-specific close reads

### 1. CR-20 Troop Carrier — printed p. 166

- `cw-cr-20-troop-carrier`; **CL 13**, Colossal space transport, crew **6 expert**, 40 passengers, 15 tons cargo, 12 speeder bikes; 2 weeks consumables; drive **×3** with **×12** backup; Military/Restricted cost **680,000 / 265,000 credits**.
- Init **−1**, Perception **+8**, Ref **11** (flat-footed 10), Fort **38**, SR **25**, DR **15**, HP **300**, threshold **88**; fly **12** character / **3** starship, max **850 km/h**.
- Two distinct fire-linked **medium turbolaser** attack rows: **pilot +10 (+5 autofire), 6d10×5**; **co-pilot +8 (+3 autofire), 6d10×5**. Attacks are not proof of physical turret count. Narration establishes troop-equipment racks that can hold a dozen BARC/74-Z speeder bikes, not installed ship weapons.

### 2. Consular-class Cruiser — Charger c70 Retrofit — printed p. 170

- `cw-consular-class-cruiser-charger-c70-retrofit`; **CL 16**, Colossal frigate/capital ship; crew **8 skilled**, 20 troop passengers, cargo **6,000 tons**, 6 months supplies; drive **×1.5**, advanced navicomputer, Military price **1,650,000 / 700,000 credits**.
- Init **+0**, Ref **18** (flat-footed 14), Fort **36**, SR **120**, DR **15**, HP **960**, threshold **139**, fly **3** starship-scale squares.
- **Two** light turbolaser cannon **batteries** at **+8**, **3 gunners** in printed battery row, **3d10×5**; **two** point-defense medium laser **cannons** at **+4**, **4d10×2**. Capital turbolaser conditional printed **−12** vs smaller-than-Colossal targets, following the **−20** attack penalty footnote; do not apply indiscriminately to separately designated point defense.
- **Identity guard:** This armed wartime Charger c70 retrofit is not the unarmed stock Consular cruiser in *Starships of the Galaxy*. Battery count does not reveal barrel count in each battery.

### 3. Kappa-class Shuttle — printed p. 171

- `cw-kappa-class-shuttle`; **CL 11**, Colossal transport, crew **4 expert**, 40 passengers, cargo **50 tons**, 1 month supplies, drive **×2** with **×18** backup and onboard nav computer; **2 AT-RT walkers OR 2 ISP platforms**; Military availability, **not available for sale**.
- Ref **16** (flat-footed 14), Fort **26**, SR **25**, DR **15**, HP **130**, threshold **76**, fly **12** character / **4** starship, **820 km/h**.
- **Co-pilot double blaster cannons +7, 5d10×2 (starship scale)** and **two heavy repeating blaster cannons +2, 3d10 (character scale, autofire-only)**. Narrative explicitly says two blaster cannons for space and two anti-personnel heavy repeaters. Keep weapon scale and gunner station separate.
- The troop cabin can be reconfigured for vehicles/cargo/munitions or up to two extra squads, **not all at once**; modification details/time are not quantified.

### 4. MedStar-class Frigate — printed p. 171

- `cw-medstar-class-frigate`; **CL 15**, Colossal frigate/capital ship; **440 skilled crew**, **655 passengers**, **4,800 tons cargo**, three-year consumables, up to **12 Colossal vessels** as carried craft, drive **×1** with **×10** backup; Licensed price **4,875,000 / 2,550,000 credits**.
- Init **−3**, Ref **13** (flat-footed 12), Fort **34**, SR **100**, DR **15**, HP **680**, threshold **134**, fly **2** starship squares.
- **One** turbolaser battery **+13, 4d10×5 (5 gunners)**; **two** point-defense laser cannon batteries **+13 (+8 autofire), 2d10×2 (5 gunners)**; a tractor beam station **+5**, grapple **+51**, for pilot/copilot/gunner. Five gunners are **not** five physical guns.
- Medical hospital mission and escort recommendation are narrative context, **not** an inherent free escort ship grant.

### 5. Nu-class Attack Shuttle — printed p. 172

- `cw-nu-class-attack-shuttle`; **CL 12**, Colossal transport, **2 expert crew**, 30 passengers, 2 tons cargo, 2 days supplies, Military price **85,000 / 50,000 credits**.
- Init **+2**, Ref **17** (flat-footed 14), Fort **25**, SR **30**, DR **15**, HP **110**, **printed threshold 25**; fly **12** character / **4** starship, **850 km/h**.
- Pilot **medium laser cannons +9, 4d10×2**; copilot **double light laser cannons +7 (+2 autofire), 4d10×2**. Preserve their separate crew stations.
- **No hyperdrive or navigation value is printed.** Ledger records `SOURCE_SILENT_CONFIRMED` for the field; that is not an assertion that the vessel cannot travel through hyperspace or that the multiplier is zero.

### 6. Pelta-class Medical Frigate — printed pp. 172–173

- `cw-pelta-class-medical-frigate`; **CL 16**, Colossal frigate/capital ship. Statblock **begins on p. 172 and continues p. 173**. Crew **900 skilled**, **300 troop passengers**, **275 tons cargo**, one month consumables, drive **×2** (**×16 backup**), Military availability, **not available for sale**.
- Init **−2**, Ref **13** (flat-footed 11), Fort **35**, SR **100**, DR **15**, HP **760**, threshold **135**; fly **3** starship squares.
- **Two** light turbolaser batteries **+17 (−3 smaller than Colossal), 3d10×5**, **6 gunners**; **three** point-defense light laser cannon batteries **+17 (+12 autofire), 4d10×2**, **6 gunners**; a tractor beam battery **+11 (−9 smaller than Colossal)**, grapple **+47**, **3 gunners**. These are battery quantities and gunners, not directly a physical barrel census.
- **Printed editorial anomaly:** statblock literally prints `Atk Options if any`, preserved as source text but **not promoted to a usable action**.
- Narrative wing-folding and modular interior can change the frigate's role; the refit requires facilities and hours/days. Do **not** implement as a costless combat transformation.

### 7. Koensayr BTL-S1 Y-wing — printed p. 173

- `cw-koensayr-btl-s1-y-wing`; **CL 10**, Gargantuan starfighter, **2 skilled crew plus astromech**; 130 kg cargo, 1 week supplies, **10 proton torpedoes**, drive **×2** with astromech **10-jump memory**, Military price **127,000 / 63,000 credits**.
- Init **+3**, Ref **15** (flat-footed 12), Fort **25**, SR **10**, DR **10**, HP **110**, threshold **45**; fly **12** character / **3** starship, **950 km/h**.
- Pilot **medium laser cannons +7, 4d10×2**; gunner **double light ion cannons +5 (+0 autofire), 4d10×2 ion**; gunner **proton torpedoes +5, 9d10×2, 4-square splash**. Printed Ranged attacks combine **lasers + ion** OR **lasers + torpedo**, not all three families simultaneously.
- Astromech conditionally replaces Mechanics/Use Computer **+6** with **+13**. Narrative says rear swiveling gunnery bubble gives a greater angle of fire for the ion guns, **but does not supply numerical arcs**. Ten torpedoes are ammunition, **not ten tubes**.

## Mechanical certification backlog

Physical gun/launcher totals, structural battery membership, station-to-mount topology, and quantified arcs remain incomplete, even when one publication enumerates batteries or specific cannon quantities. All **17** new attack groups have source-silent arcs. The mount backlog records source-silent slots **by attack group**, not by distinct hull and not by inferred installed hardware count.

A printed charge of “not available for sale” must not become zero credits, and absent hyperdrives must not be borrowed from a stock or neighboring variant. **Strict full source-field and physical weapon-mount certification remains 0/41**; this is not a failed source review, but a separate and stricter downstream acceptance gate.

## CP2 corrective addendum (transparent source-error correction)

While checking source continuity, I directly examined printed **p. 138**, where **Azure Angel explicitly prints `SR 15`** in its defenses. The **CP2 JSON ledger erroneously omitted SR 15 and labeled shields `SOURCE_SILENT_CONFIRMED`**, whereas the accompanying CP2 narrative report correctly listed SR 15. This was a **prior transcription error, not a conflict between two printed sources**.

The new **cumulative CP3 ledger corrects Azure Angel to SR 15**, changes its source shield state to `PDF_VERIFIED`, removes the false shield-silence blocker, and adds a dated-source-page correction finding. **The original CP2 ZIP is not modified.** The other **17 CP1/CP2 source-reviewed entry objects remain byte-equivalent under canonical JSON SHA-256 comparison**. Old CP2 validator is correctly run on its own original overlay, not on the corrective cumulative ledger. The printed Seltiss-2 attack disagreement **+2 vs +4** remains unchanged and is still the one counted printed source conflict.

## Discovery-only schema tests

The first **12** CP1/CP2 test cases remain unchanged. Eight CP3 cases add:

| Case | Unresolved schema behavior |
|---|---|
| CWCP3-01 | Battery quantity vs weapon barrel count vs number of gunners |
| CWCP3-02 | Separate character-scale anti-personnel and starship-scale shuttle fire |
| CWCP3-03 | Pelta modular interior / folding wings with shipyard time and facility constraints |
| CWCP3-04 | Nu-class source-silent hyperdrive field |
| CWCP3-05 | BTL-S1 simultaneous fire alternatives and gunner/astromech conditionals |
| CWCP3-06 | −20 size targeting penalty applied at the proper capital weapon row |
| CWCP3-07 | Pelta malformed `Atk Options if any` text and multi-page statblock |
| CWCP3-08 | Carried-craft capacities and alternate interior loadouts |

These **20 local discovery cases** do not modify the separate **155 SotG discovery-only cases** and do not authorize a frozen schema or production changes.

## QA and remaining integration gates

- **PASS**: CP3 package structural validator (41 identities, 25 source-read, 16 pending, 45 attack groups and 0 strict mechanical certificates).
- **PASS**: source PDF SHA-256 fingerprint check, all seven CP3 high-risk ship-specific mechanic sentinels, mount-backlog group arithmetic, all 20 discovery-only case IDs and original Seltiss-2 +2/+4 discrepancy.
- **PASS**: exact CP2 ZIP comparison — 17 old reviewed source record objects unchanged, one explicit Azure Angel SR 15 correction; all 12 previous discovery cases unchanged.
- **PASS**: preceding CP2 structural validator on the original CP2 files and original PDF fingerprint.
- **CHECKED REMOTELY**: 41 Phase 1 provenance identities and seven tranche source-page identifiers still live on the audit GitHub branch (provenance blob SHA matches stored reference). **Full `--require-phase1` local run not completed** because the checked-in provenance file was not in the standalone changed-files overlay; run after restoring into the repository.
- **NOT RUN**: the 15 SotG-specific validators and the full Phase 0B validation suite, because the complete SotG repository audit history is not restored in this small checkpoint overlay. The inherited historical Phase 0B blockers (**12 invalid fixtures; 2,112 null/empty positions unclassified**) are still outstanding.
- **GitHub**: branch remains at `a5e7282` and **no audit package has been committed/pushed in this pass**. CP1/CP2 and SotG cumulative files must be reconciled before making book-level commits. No production vehicle files modified.

### Next tranche

Proceed to CP4 **printed pages 203–211**, the Confederacy ship sections (**14** Phase 1 records), including the separately statblocked **Invisible Hand** and **Providence-class Destroyer**, **Soulless One** and generic **Belbullab**, **Diamond-class Cruiser**, and **Droch-class Boarding Ship**. Expect the next cumulative source review target to be **39/41**, with final **Sabaoth Destroyer** and **Sabaoth Starfighter** on pp. **220–221**. Commit/push only after safe repository reconciliation and completed book-level source-review package.
