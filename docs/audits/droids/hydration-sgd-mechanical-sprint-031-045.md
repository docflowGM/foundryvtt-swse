# Scavenger's Guide to Droids — Mechanical Sprint M4 (031–045)

**Checkpoint date:** 2026-11-02  
**Audit branch:** `audit/droid-publication-census-2026-10-29`  
**Source-ledger commit:** `fcf29cd636efd3f922f375adaac3d74d5ac7a895`  
**Audit-manifest commit:** `277c51cd9d262b01df0900b59021f1ef84d15649`  
**Draft 2020-12 validator source commit:** `8644ebcb40a75edd7faba2ac133de09a80afea99`  
**Primary rulebook:** *Scavenger's Guide to Droids*, printed pages 128–157 (30 printed pages).

## Accepted sprint boundary and scope

This sprint covers exactly `SGD-DROID-031` through `SGD-DROID-045` (15 publication-specific claims). It follows batches `001–015` and `016–030`; the earlier 30 records were not changed in this commit. Exactly **45 of 46** SGD claims have now been through the dedicated source-structure hydration sprint. Entry `046` remains to be addressed.

The 15 entries gained **115 printed-system component instances**, **41 separate physical locations**, **17 movement entries**, **25 possession types** with **27 printed quantity units**, and structured classes/progression. The evidence also inventories **66 printed feat lines**, **20 printed talent lines**, and **43 printed attacks** without upgrading a printed attack to an installed or executable permission.

The frozen source census remains **46/46 SGD**, **234/234 total**. **Strict source-mechanical certification is 0/46 SGD and 0/234 overall**, because per-weapon ownership, canonical individual feats/talents, conditional action economy and source contradictions remain unresolved. Runtime testing is separate and explicitly deferred until the code has been committed and merged. There was no production compendium, runtime mechanics, main branch or vehicle authority mutation.

## Identity and evidence matrix

| ID | Printed source record | Components | Physical locations | Movement entries | Possession types | Source-mechanical status |
|---|---|---:|---:|---:|---:|---|
| 031 | R8-Series Astromech Droid | 15 | 5 | 2 | 7 | Partial |
| 032 | RWW-Series Protocol Droid | 6 | 2 | 1 | 0 | **Conflict** |
| 033 | RX-Series Pilot Droid | 6 | 3 | 1 | 0 | Partial |
| 034 | S19 Astromech Droid | 12 | 7 | 1 | 2 | Partial |
| 035 | SD-9-Series Battle Droid | 11 | 2 | 1 | 2 | Partial |
| 036 | SD-X-Series Stealth Battle Droid | 10 | 2 | 1 | 1 | Partial |
| 037 | LEP-Series Service Droid | 8 | 4 | 1 | 0 | Partial |
| 038 | Shadow Droid | 3 | 0 | 1 | 5 | Partial |
| 039 | Colicoid T4 Turret Droid | 9 | 3 | 1 | 2 | **Conflict** |
| 040 | TC-SC Infiltration Droid | 6 | 2 | 1 | 2 | Partial |
| 041 | TT-8L Gatekeeper Droid | 5 | 1 | 1 | 0 | **Conflict** |
| 042 | V2-Series Commando Droid | 5 | 2 | 1 | 1 | Partial |
| 043 | V6-Series Pilot Droid | 5 | 2 | 1 | 0 | Partial |
| 044 | X-1 Viper Droid | 7 | 4 | 1 | 2 | Partial |
| 045 | XLT-014 Labor Droid | 7 | 2 | 2 | 1 | Partial |

**Important:** printed possession types are not certified equipment actor items; `catalogRef` is provided only for a directly recognized canonical droid-part identity. A statblock's component inventory does not establish original factory status or starting PC purchases; absent item data remains omitted, not `[]`. Unassigned languages have not been turned into free selections.

## Printed-source mechanical findings

- **031 — R8 astromech:** Wheeled **6 squares** and exclusive walking **4 squares** remain separate choices. Its astrogation buffer is a possession with **6 memory units**, not a second installed movement component. It has individually named electroshock and laser-welder possessions and source-only attack lines.
- **032 — RWW protocol:** The OCR-index systems line contained text from the next heading; corrected against the printed Systems line. Main Mimic prose says a **swift-action Deception reroll, accepting the second result**; the protocol version describes **+2 on Deception**. Recorded `SGD-032-MIMIC-EFFECT-CONFLICT`, **unresolved**.
- **033 — RX pilot / 034 — S19 astromech:** Flight/hover and tracked modes use printed locomotion only. The RX's Pilot missile/torpedo reaction is encounter-limited; S19's repair-time reduction has a **10-minute minimum**. S19 carries a holorecorder and tool kit independently of its installed diagnostics and astrogation buffer.
- **035 — SD-9:** The book lists **two physical tool mounts**, not two free tool appendages. **SR 15 against ion damage only** and the laser-reflective armor's **+11 versus blasters/lasers** are conditional, not stacked onto all attacks. Multiple heavy repeating blaster/plasma-cannon rows are choice/action evidence, not unrestricted combined attacks.
- **036 — SD-X / 037 — LEP:** SD-X's concealed vibrodaggers extend by **swift action**; the blaster rifle is a separate printed possession. LEP's **two hand and two probe appendages** are four distinct physical identities. Absence of a printed Possessions line was *not* fabricated into an explicit zero inventory.
- **038 — Shadow Droid:** The book prints an untyped **6-square speed**, **flying 16 squares (character scale)** and **flying 4 squares (starship scale)**. These scales were separated; no invented walking locomotion or duplicate vehicle entity was added. Starship weapons and owner-mediated Force Point actions require vehicle/Force rules authority before certification.
- **039 — Colicoid T4 turret:** Remote receiver, synchronized fire circuits and **two blaster cannons** with one modified grenade launcher (four thermal detonators) are distinct. The Cutting Laser's main text uses a **standard action**, whereas its protocol block gives **two swift actions**; recorded `SGD-039-CUTTING-LASER-ACTION-CONFLICT`, **unresolved**.
- **040 — TC-SC / 041 — TT-8L:** The TC-SC carries separately listed concealed pistol and knife; mount authority remains ungranted. TT-8L is **stationary (Speed 0)** with one telescoping tool appendage and no assumed walking motor. Stubborn protects the droid in the main rules prose but the **master** in the protocol block; recorded `SGD-041-STUBBORN-TARGET-CONFLICT`, **unresolved**.
- **042 — V2 / 043 — V6:** V2's blaster rifle is a listed possession, not a grant of new attack actions. V6 remains a wheeled pilot assistant, not a source for generic independent starship control.
- **044 — X-1 / 045 — XLT-014:** X-1 has two twin blaster cannons, one grenade launcher, and restricted autofire/burst/molecular-shielding options. XLT-014 has a remote receiver plus walking and **limited hovering** systems, and a separate video-recorder possession; the receiver is not silently substituted with a local heuristic processor.

## Validation executed and not executed

**Executed directly against the fetched GitHub ledger:**

1. **46/46** recursive JSON schema shape checks, using custom JavaScript matching type, enum, required property, reference and additional-property checks.
2. **46/46** null-and-empty field state source proof checks.
3. **15/15** frozen source identity, names and printed-page parity, unique component identity and physical-location/movement linkage.
4. **15/15** non-executable attack row, CON null and no fabricated activation/factory defaults checks.
5. **9/9** focused positive/negative source-safety assertions, including vehicle-scale flight, stationary droid, limited hover, exclusive locomotion and the three unresolved contradictions.
6. All three written GitHub artifacts were retrieved after commit for **exact content readback**.

**Added but not executed against the GitHub ledger:** `tools/audits/droids/verify_sgd_ledger.py`. This new reusable, read-only command uses the real Python `jsonschema.Draft202012Validator`, performs the source pointer/negative permission checks and rejects five deliberately malformed source fixtures. Run it from a checked-out repo with `python tools/audits/droids/verify_sgd_ledger.py`. **Do not treat this new test as passed merely because it was added.** Python code was syntax-checked locally in isolation, but the repo ledger could not be materialized into the local runtime during this sprint.

**Not executed:** upstream `tools/audits/droids/verify_schema.py` over this remote ledger; full repository test suite; machine-level Foundry V13 tests; complete source-mechanical certification. The custom checks do not replace strict Draft 2020-12 acceptance.

## Git checkpoint and next target

Committed files:
- `data/canonical/droids/source-books/sgd.json`
- `data/audits/droids/sgd-mechanical-sprint-031-045.json`
- `tools/audits/droids/verify_sgd_ledger.py`
- This checkpoint document.

**Next:** close `SGD-DROID-046` (YVH-Series Battle Droid), then stop issuing structural-hydration completion credits and move into **independent source-mechanical certification of all 46 SGD records**, starting with exact feat/talent identities, weapon mounts/resource/attack-choice proof, protocol conflicts, and legal PC construction. Record unresolved issues as partial/blocked, never as certified by inference.
