# SWSE Droid Source Mechanics — Deepening Sprint 006–010 (M6)

**Verified:** 2026-11-02  
**Branch:** `audit/droid-publication-census-2026-10-29`  
**Printed source:** *Scavenger's Guide to Droids*, pp. **78–87** (PDF page indices 78–87, one-based 79–88). Each of the ten printed pages was rendered at 1.55× and visually compared with embedded PDF text.

## Certification status

This checkpoint covers **five further** publication entries: `SGD-DROID-006` through `SGD-DROID-010`. Together with sprint 001–005, **10/46 SGD records** now have detailed follow-up coverage of their published variants, protocol actions and creation/vehicle authority. The existing **46/46 structural hydration** remains complete; **0/46 strict source-mechanical certifications** and **0 runtime certifications** remain honest. This is source evidence only, **not an implementation, actor or compendium release**.

### This sprint's new typed claims

| Measure | This sprint | First ten cumulatively |
|---|---:|---:|
| Deep source-mechanics records | **5** | **10** |
| Named nonfactory variants | **13** | **28** |
| Protocol and conditional action statements | **22** | **41** |
| Additional heroic creation claims | **1** | **5** |
| Additional source-only constraints | **9** | **15** |
| New printed contradictions | **3** | **4** |
| Source pages visually reviewed | **10** | **20** |

All appended rules have `executionStatus: source-only`, with the exact SGD source name, printed page and `verifiedBy: pdf-visual`. The other **41 source ledger entries** were unchanged by the M6 data commit.

## Records and source-mechanical findings

### SGD-DROID-006 — Colicoid Infiltrator-Series Droid (printed pp.78–79)

The nonheroic Colicoid Infiltrator is **not PC-eligible**. The printed statblock contains **four tool appendages** and six distinct possession types, including two vibroblades, two blaster rifles and a silence-bubble generator; this is not six extra arms or automatic attack permission.

Three modifications are now explicitly preserved:

- **Communications Beacon** removes holographic disguiser and silence generator and installs a long-range comlink, scrambler and relay with separate **DC 15 Mechanics** operations (30 minutes, 15 minutes, one hour); retrains Stealth feats to Use Computer; **500 km** relay range applies to the completed variant only.
- **Heavy Weapons Turret** changes rifle/blade configuration to printed heavy-weapon alternatives. **More than two missile launchers** additionally displace disguiser and silence generator; four missiles can launch before an ally must reload. Weapon change **DC 15 Mechanics / 15 minutes per weapon**, plus heavy-weapons proficiency retraining.
- **Walking Throne** reconstructs body and fixes limbs and weapons, then installs a seat using **DC 20 / DC 15 / DC 15 Mechanics** and times 4 hours / 2 hours / 30 minutes. Source text is not permission to grant an occupant a new vehicle or free turret control.

Printed `Penetrate Hull` at maximum **16** damage applies **only** to vehicle hull, solid walls or doors. Other source actions: Create Diversion, Rapid Shot, Sneak and Snipe.

### SGD-DROID-007 — CZ-Series Secretary Droid (pp.80–81)

The CZ main statblock's special features include **Comlink Jammer** and **Comlink Relay**. The printed **protocol** introduces multiple contradictions, all preserved unresolved:

1. `SGD-007-COMLINK-JAMMER-ACTION-CONFLICT`: **main standard action vs protocol one swift action**.
2. `SGD-007-COMLINK-JAMMER-DURATION-CONFLICT`: effect until **droid's next turn** vs **owner's next turn**.
3. `SGD-007-TRANSLATOR-PRESENCE-CONFLICT`: translator **absent from main Systems**, but `translator unit (DC 10)` is in protocol Vital Systems. The protocol is **not** permission to add stock-installed equipment.

CZ heroic creation uses the stock protocol chassis, recommended noble/Linguist; **Comlink Jammer and Relay in lieu of the default translator**, not alongside it. Printed encrypted long-range comlink and Locked Access are to be purchased separately.

The **Identity Thief** modification removes Comlink Jammer, changes skill/feat and needs **DC25 Mechanics / 8 hours**; its two-step Deception simplicity benefit applies only to impersonation via **remote communication**. The **Pirate HoloNet Transceiver** costs **50,000** for transceiver plus **3,000** for adapters/buffers and needs **DC30 Mechanics / 2 days**; actual real-time holograms additionally need suitable recorder/projector. **Slicer's Proxy** uses *another actor's* previously stored Use Computer check results, limited by the droid's **Intelligence modifier** and the command's ordinary time. It is not the CZ's own free access to Slicer talents.

### SGD-DROID-008 — DP-2 Probe Droid (pp.82–83): vehicle-primary

The source is a **Large starfighter/ground vehicle (speeder)** with a protocol droid-style alternate view. It must **remain a single vehicle-primary publication claim**, not be split into a fresh droid Actor.

Additional printed source facts captured as vehicle-owned evidence:

- Fly **12 character-scale squares**, **3 starship-scale squares**, maximum **575 km/h**.
- **Cargo 15 kg**, **2 days consumables**, **16 space beacon payload**, **no passengers**, fighting space **2×2** character scale or **1 square** starship scale, cover none.
- One claw, blaster cannon, space-beacon launcher belong to the printed vehicle. Neither the vehicle-source identity link nor V2 mount/weapon IDs have been independently certified, and `vehicleLink` is left unset instead of inventing a reference.

Five source protocol actions are recorded, all source-only: Extended Sensor Range, Extended Weapon Range (requires line of effect for DP-2 and master), Patch Job, Reconnoiter and Telemetry.

**Blockade Breaker** displaces beacon launcher with **starship SR25 shield** (DC35 Mechanics, 4 hours, 1,500 credits raw materials), dedicated secondary battery (4 hours, 1,000 credits materials), maneuvering jets (8 hours, 2,000 credits; +2 Dexterity). **Courier** displaces launcher with **20 kg storage**, upgraded sublight, holo disguise and **×8 hyperdrive**; printed **starship-scale speed 4**, package **31,300 credits / 2 days / single DC35 Mechanics**. These are modifications, not factory base stats.

### SGD-DROID-009 — Droideka Mark II (pp.84–85)

The book explicitly prohibits this Mark II as a playable droid hero. Printed **walking 2 / wheeled 10** require the exclusive conversion: **two swift movement actions** in the same turn are needed to enter wheeled movement. The protocol links laser cannons to two tool appendages; the two **ion cannons** are additionally listed as possessions but their physical mount linkage is **not independently established**. All nine source attack expressions stay nonexecutable.

**Magnetic Starship Turret:** remove shield generator **DC20 Mechanics ~30 minutes**; magnetic coupler **DC25 Mechanics / 1 hour**. If the GM allows an incomplete installation, failure to hold to hull is tested by Acrobatics against the **pilot's Pilot check DC** on each pilot check.

**Sith Jedi Hunter:** gyroscope **DC20 Mechanics / 1 hour** reduces wheeled speed to **3** while granting +2 defense **only vs Force push, pull and slam**. Rewired simultaneous blasters (**DC25 Use Computer / 30 minutes**) fire as a **full-round action** and increase Block/Deflect Use the Force DC by 10. Replacing ion cannons with high-frequency emitters (**DC25 Mechanics / 1 hour**) reduces incoming lightsaber damage by **1d8 per attack**, but **engaging emitters reduces the droid's shields to 0**. Do not offer SR20 and engaged emitters simultaneously.

### SGD-DROID-010 — DT-16 Destructor Battle Droid (pp.86–87)

The baseline lists **two arm-concealed rifles**, a **separate tool-appendage grenade launcher**, and **12 frag grenades**. The protocol Barrage costs **three swift actions**, launches three grenades against adjacent opponents and temporarily protects nearby allies with **+2 circumstance Reflex** against those opponents. The action is source-only until grenade targeting/consumption and condition expiry are certified.

Printed variants:

- **Sentry:** darkvision, glowrod (DC15 Mechanics / 1 hour), comlink (same), **stun grenades** instead of frag, and replace Toughness with Skill Focus (Perception).
- **Antivehicle Defense:** add **two shoulder tool mounts** with **DC20 Mechanics / 2 hours**, separate launchers plus **10 kg storage** for two additional missile magazines. Auto-magazine mechanism **DC25 Mechanics / 1 day** reduces magazine replacement from full-round to standard action; replace Toughness with Far Shot. These shoulder mounts **are not additional hands**.
- **Light Construction:** **remove the rifles and launcher**, expand storage ≥10 kg, exchange hands for claws (**DC20 Mechanics / 2 hours**), add second tool appendage (**DC20 Mechanics / 1 hour**), install laser cutter, arc welder and Diagnostics Package, and change trained Perception to Mechanics. No hidden retained firepower from base loadout.

## Verifications, errors corrected, and explicit limits

After the new M6 ledger commit, custom recursive draft schema type/enum/required/additional-property checks were repeated against **all 46 source records**. All **46/46** passed, as did **46/46** custom field-state null/empty checks, census identity/name/page parity, and preservation of `operationStatus: source-only` on every printed attack.

One schema error was caught and repaired: `vehicleLink.relationKind` is restricted to *same-publication-actor*, *shared-model-family* or *alternate-view*. A synthetic `primary-vehicle-only` value was removed. DP-2's printed vehicle primacy remains correctly expressed in `classification.primaryActorAuthority: vehicle`. Likewise, an M5 accidental explicit-empty possessions array on AD was removed instead of pretending no equipment was printed.

**Not run:** repository's Python Draft202012 JSON Schema validator against the remote ledger; full Foundry V13 runtime and combat integration tests. **Not done:** production compendium rebuild, weapon mount certification, class/feat/talent mechanic equivalence, resolving source conflicts, vehicle actor import, merging to main.

**Concurrent collaborator safety:** while the M6 pass was being authored, another contributor pushed independent `component-source-facts-sprint-002` files to the same audit branch. The updated stock ledger was based on the then-current head; none of the component files was rewritten or reverted.

## Recommended next batch

Review `SGD-DROID-011`–`SGD-DROID-015` against **printed pp.88–97**: Duelist Elite Training, E522 Assassin, EI-9 Network Security, EV-Series Supervisor, and FLTCH-Series Battle Droid. Continue the same schema-safe program: separate optional variants, origin/protocol contradictions, and exact physical installed vs carried weapons; keep certifications partial until executable-field prerequisites and all source rule identities are fully verified.

After `SGD-DROID-015`, the first *15* of 46 will have completed the full **variant/protocol/source-mechanics deepening**, a prerequisite for—not equivalent to—strict full source-mechanical certification.

**Evidence:** `data/audits/droids/sgd-source-mechanics-sprint-001-005.json`, `data/audits/droids/sgd-source-mechanics-sprint-006-010.json`, and both detailed sprint checkpoints. Cross-workstream component refactor remains a separate handoff, not a source of stock droid authority.
