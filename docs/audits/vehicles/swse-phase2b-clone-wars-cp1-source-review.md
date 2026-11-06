# SWSE Vehicle Canonicalization — Clone Wars Phase 2B Checkpoint 1

**Audit scope:** *Clone Wars Campaign Guide*, primary-source close-read, printed pp. 76–85 (plus adjoining Barloz p. 75 narrative and p. 77 deck plan). **Not full book mechanical certification.**

**Primary authority:** the original user-supplied scanned PDF, SHA-256 `3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6`. For this copy, printed page `n` corresponds to zero-based PDF index `n` (physical one-based PDF page `n + 1`). OCR/TXT is navigation only; the statblocks and surrounding prose were inspected visually on the PDF.

## Checkpoint result

| Gate | Result |
|---|---:|
| Prior Phase 1 Clone Wars publication identities retained | **41/41** |
| Primary PDF close reads added | **13** |
| Book-wide primary PDF close reads complete | **13/41** |
| Source close reads still outstanding | **28** |
| Weapon attack-group rows reviewed | **20** |
| Attack rows with physical hardware count source-silent | **11** |
| Attack rows with firing arc source-silent | **20** |
| Attack rows with battery-composition field source-silent | **20** |
| Strict complete field-and-physical-mount certificates | **0/41** |
| Preserved source-conflict findings | **1** |
| New Clone Wars discovery-only cases | **7** |
| Existing SotG discovery cases modified | **0** |
| Universal vehicle schema frozen / production hydration authorized | **No / No** |

These counts describe **verified publication text, not real-world physical gun totals**. A group can be printed with a precise attack bonus but without a complete physical barrel count or firing arc. Neither omission authorizes guessing or inserting zero.

## Reviewed source identities and distinctions

| Printed page(s) | Source entry | CL | Important observations |
|---|---|---:|---|
| 75–77 | Barloz-class Freighter | 7 | Single turret-mounted **laser cannon**, crew copilot operates weapon; p.77 stock deck plan shows a turret gunwell but cannot establish an external arc. The Justifier gunship is a modification. |
| 76 | G9 Rigger | 6 | Pilot's double light lasers **and** copilot's light lasers are two attack groups, not an OR choice. *Twilight* is a separately modified example. |
| 78 | GS-100 Salvage Ship | 8 | The Ranged line expressly says **two medium laser cannons**. Passengers are 20 droids; *Vulture's Claw* is modified, not stock. |
| 78–79 | KR-TB Doomtreader | 8 | Stock dual lasers controlled by pilot, optional astromech **+13 Mechanics / Use Computer** (instead of +5). Do not inherit *Hell's Anvil* solar ionization cannons. |
| 79–80 | Pursuer-class Enforcement Ship | 7 | One pilot, seven seats categorized **two passengers plus five prisoners**; distinct twin blaster and ion weapon groups. *Slave II* modifications are not stock. |
| 80 | Ubrikkian Seltiss-2 Caravel | 9 | Main hull carries detachable cabin, and stock hyperdrive is **not standard**. **Printed conflict:** Ranged laser battery `+2`, weapon attack entry `Atk +4` (`-1 autofire`). Both preserved. |
| 80–81 | Ubrikkian Seltiss-2 Caravel Cabin | 3 | Independent **Huge** detachable transport statblock; 50 HP, SR 10, crew 1, six passengers. No printed Ranged or Hyperdrive line. Distinct identity, not a second whole caravel. |
| 81 | Dagger-class Starfighter | 6 | Narrative expressly establishes a hyperdrive and a navicomputer storing **three jumps**, but no drive multiplier. Shields and comprehensive life support are explicitly absent in prose. |
| 82 | Dianoga-class Assault Starfighter | 7 | Narrative verifies **four fire-linked laser cannons** plus a heavy ion cannon. Weapon groups fire as OR alternatives. |
| 82 | Freefall-class Starfighter | 8 | Four separate crew stations; operating with four gives individual **+1 duty-related checks and rolls**. Bomb chute used by bombardier; **20 proton bombs** are payload, not twenty chutes. |
| 83 | MorningStar-A Assault Starfighter | 8 | A-model has light lasers, **one concussion missile launcher**, four missiles. Text also describes distinct B/C configurations, not eligible to overwrite this A-model. |
| 84 | S40K Phoenix Hawk-class Light Pinnace | 7 | Crew printed as **1 or 2**, not exactly two; pilot controls heavy blaster and light ion groups. Cramped conditions have no printed numeric modifier. |
| 85 | Scurrg H-6 Prototype Bomber | 10 | **Six forward laser cannons**, one laser turret, and bomblet generator. Generator produces **one sphere per 10 rounds**, stores at most **10**, can be replaced with standard bomb chute; asterisked **−20** penalty versus sub-Colossal targets. *Havoc* has distinct astromech crew configuration and drive. |

All reviewed entries preserve complete statblock fields, source-status flags, printed attack expressions and near-statblock narrative mechanics. `SOURCE_SILENT_CONFIRMED` is used for reviewed but unprinted fields, not to claim that the equipment is absent. The one Seltiss discrepancy is recorded as `SOURCE_CONFLICT_PRESERVED` rather than resolved by expectation or arithmetic.

## Mechanical-certification backlog

`swse-phase2b-clone-wars-cp1-weapon-mount-backlog.json` contains every one of the 41 publication keys, its page, reviewed state and attack-row source-silence indices. The 13 reviewed records retain outstanding gate requirements for physical mounts, battery composition, and arcs or another explicit future schema policy for source-confirmed silence. Twenty-eight additional records have not yet received Phase 2B complete close reads. No ship is declared strictly mechanically certified in CP1.

The seven discovery-only cases in `swse-phase2c-clone-wars-cp1-schema-discovery.json` cover the Seltiss attack disagreement, independently flyable detachable cabins, Dagger drive without a printed multiplier, station-specific Freefall crew bonuses, stateful Scurrg bomblet production, stock versus adjacent named modifications, and field-level source-confirmed silence. These cases do **not** modify the 155 previous SotG discovery cases and do **not** freeze the universal schema.

## Validation and repository boundaries

The CP1 validator `tools/audits/vehicles/check_clone_wars_phase2b_cp1.py` checks unique Phase 1 source identifiers and original printed pages (when the authoritative Phase 1 provenance is available in the repo), 41/13/28 review arithmetic, mount backlog counts, field statuses, PDF fingerprint, and explicit high-risk ship sentinels. A test run passed with a minimal local identity reference reconstructed from the live remote Phase 1 GitHub list; the actual 263-KB repository provenance file was not materialized in this test workspace. The validator will compare against that complete file when overlaid in the real repo. This validation is structural and **does not replace the PDF visual inspection**.

The known remote branch `audit/vehicle-phase-0-1-canonical-foundation` was queried and still pointed to `a5e728273acd1b0352f31fbd235f7378081770d8` when this checkpoint began. That branch currently contains the Phase 0/1 files but does **not** contain the cumulative local SotG CP2–16 audit history. The supplied CP16 ZIP has only **five files**, not the full earlier 93-file audit chain. Accordingly, the SotG 15-validator cumulative regression suite and Phase 0B gate were **not** misrepresented as freshly run here. Historical Phase 0B blockers remain **12 version-invalid fixtures** and **2,112 unclassified blank/null positions**, pending independent repair.

**No files were committed or pushed.** This is a partial Clone Wars checkpoint, not a book completion, and the remote cumulative SotG audit history still requires safe reconciliation before a full-book push. Production packs, actor records, compendium data, Foundry V2 runtime logic, migration logic, and generalized vehicle schema have not been modified by this checkpoint.

## Required next action

Continue Phase 2B with **printed pp. 137–139 (five Phase 1 records)**: Azure Angel, two separate Delta-7 variant statblocks, and two separate Eta-2 variant statblocks. Verify source mechanics visually and preserve exact publication identities. Then proceed to pp. 166–173, 203–211, and 220–221. At the book's complete source review, reconcile the full cumulative audit history, run old applicable gates without hiding known failures, and commit/push only once the complete defensible audit package is independently verified.
