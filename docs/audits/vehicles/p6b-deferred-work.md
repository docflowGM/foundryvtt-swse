# P6B deferred work (side bucket)

Generated from `data/audits/vehicles/p6b-deferred-work.json` by `tools/audits/vehicles/build-p6b-deferred-work.mjs`; edit the JSON, not this file.

Side bucket for P6B work that could not be implemented safely. Most items concern components that are not certified and stay fail-closed (not installable / not executable). A few concern components that ARE certified and installable where only additional functionality is deferred (P6B-D-009 sensor arrays: no Intelligence consumer; P6B-D-017 hangar bays and cryogenic chambers: no occupancy roster; P6B-D-021/022 custom-design limits). Rendered to docs/audits/vehicles/p6b-deferred-work.md by tools/audits/vehicles/build-p6b-deferred-work.mjs.

## Summary

| Category | Count |
|---|---|
| RULES_DECISION_REQUIRED | 7 |
| SOURCE_EVIDENCE_MISSING | 9 |
| ENGINEERING_COMPLEXITY | 21 |
| LIVE_RUNTIME_PENDING | 1 |
| NONCRITICAL_DEFECT | 4 |
| DEPENDENCY_BLOCKED | 9 |

Open items: 51. Resolved items: 10 (listed at the end).

## Items (by severity)

| ID | Workstream | Component | Category | Severity | Owner ruling | Linked |
|---|---|---|---|---|---|---|
| P6B-D-001 | P6B-1 | reinforced-bulkheads-10, reinforced-bulkheads-20, reinforced-bulkheads-30 | RULES_DECISION_REQUIRED | IMPORTANT | yes | V-P6-01 |
| P6B-D-002 | P6B-1 | sublight-drive-1 .. sublight-drive-6 | RULES_DECISION_REQUIRED | IMPORTANT | yes | V-P6-02 |
| P6B-D-008 | P6B-1 | all 51 offline-integrated effects (P6B-0..3); P6B-0 environment and Pilot check; custom-ship effects | LIVE_RUNTIME_PENDING | IMPORTANT | no | - |
| P6B-D-019 | P6B-3 | remaining weapon systems, launchers and ammunition (laser cannons light/medium/heavy are certified and executable since the weapon slice) | DEPENDENCY_BLOCKED | IMPORTANT | no | V-P2-04, V-P6A-01, V-P6A-02, V-P6A-03, V-P6A-04 |
| P6B-D-026 | P6B-W | ion cannons (light/medium/heavy, Hapan triple) | ENGINEERING_COMPLEXITY | IMPORTANT | no | - |
| P6B-D-032 | P6B-W | launchers: loading, expenditure and capacity expansion | DEPENDENCY_BLOCKED | IMPORTANT | yes | V-P6A-03 |
| P6B-D-033 | STOCK | published stock groups whose printed attack total is not explained by a published rule (336 groups, mostly batteries) | SOURCE_EVIDENCE_MISSING | IMPORTANT | no | - |
| P6B-D-034 | STOCK | published stock weapon batteries and multi-gunner stations (291 groups) | ENGINEERING_COMPLEXITY | IMPORTANT | no | - |
| P6B-D-036 | STOCK | published stock splash, ion and ammunition-limited groups (torpedoes, missiles, ion cannons; 71 splash + 71 ion groups) | DEPENDENCY_BLOCKED | IMPORTANT | no | V-P6A-03 |
| P6B-D-043 | STOCK | weapon batteries crewed by named gunners (assisting roster) | ENGINEERING_COMPLEXITY | IMPORTANT | no | - |
| P6B-D-050 | WEAPON-ECOSYSTEM | weapon configurations: double, triple, quad, fire-linked, optional fire link, cannon enhancements | ENGINEERING_COMPLEXITY | IMPORTANT | no | V-P6C-10, V-P6C-11 |
| P6B-D-051 | WEAPON-ECOSYSTEM | autofire (starship-scale single-target mode), autoblaster and Burst Fire | ENGINEERING_COMPLEXITY | IMPORTANT | no | V-P6C-07, V-P6C-08, V-P6C-09 |
| P6B-D-052 | WEAPON-ECOSYSTEM | point-defense weapon modification: aftermarket option IMPLEMENTED; stock classification and point-defense ranges remain | ENGINEERING_COMPLEXITY | IMPORTANT | no | - |
| P6B-D-054 | WEAPON-ECOSYSTEM | shieldbuster torpedoes, space mines and ion bombs | ENGINEERING_COMPLEXITY | IMPORTANT | no | V-P6C-07 |
| P6B-D-055 | WEAPON-ECOSYSTEM | vehicle tractor beams | ENGINEERING_COMPLEXITY | IMPORTANT | no | - |
| P6B-D-056 | WEAPON-ECOSYSTEM | gravity well projectors | ENGINEERING_COMPLEXITY | IMPORTANT | no | - |
| P6B-D-059 | WEAPON-ECOSYSTEM | Autofire capability of stock weapon groups | SOURCE_EVIDENCE_MISSING | IMPORTANT | no | V-P6C-08 |
| P6B-D-060 | WEAPON-ECOSYSTEM | Swift-action switch to autofire mode | ENGINEERING_COMPLEXITY | IMPORTANT | no | V-P6C-08 |
| P6B-D-061 | WEAPON-ECOSYSTEM | Burst Fire by an operator other than the named gunner; autofire plus battery | DEPENDENCY_BLOCKED | IMPORTANT | no | V-P6C-08 |
| P6B-D-003 | P6B-1 | jamming-suite, jamming-array | ENGINEERING_COMPLEXITY | MINOR | no | V-P6-05, V-P2-04 |
| P6B-D-004 | P6B-1 | combat-thrusters | DEPENDENCY_BLOCKED | MINOR | no | V-P6-05, V-P2-04 |
| P6B-D-005 | P6B-1 | navicomputer-limited | RULES_DECISION_REQUIRED | MINOR | yes | V-P6B-01 |
| P6B-D-006 | P6B-1 | navicomputer (training clause) | NONCRITICAL_DEFECT | MINOR | no | V-P6-05 |
| P6B-D-007 | P6B-1 | com-jammers | SOURCE_EVIDENCE_MISSING | MINOR | no | - |
| P6B-D-009 | P6B-2 | sensor-array-2, sensor-array-4, sensor-array-6 | DEPENDENCY_BLOCKED | MINOR | no | V-P2-04 |
| P6B-D-010 | P6B-2 | cargo pods / extended range on hulls with annotated or unknown printed quantities; smuggler compartments | SOURCE_EVIDENCE_MISSING | MINOR | yes | V-P6B-02 |
| P6B-D-011 | P6B-2 | escape-pod-small, escape-pod-large | RULES_DECISION_REQUIRED | MINOR | yes | V-P6B-05 |
| P6B-D-012 | P6B-2 | passenger-seating, passenger-quarters, medical-suite | RULES_DECISION_REQUIRED | MINOR | yes | V-P6B-06 |
| P6B-D-013 | P6B-2 | slave-circuits-basic, slave-circuits-advanced, slave-circuits-recall | RULES_DECISION_REQUIRED | MINOR | yes | V-P6B-03 |
| P6B-D-014 | P6B-2 | droid-repair-team | ENGINEERING_COMPLEXITY | MINOR | no | - |
| P6B-D-015 | P6B-2 | cargo-jettison, transponders (IFF, masked, disguised x3), cloaking (hibridium, stygium), docking clamps, holonet/hyper transceivers, luxury upgrades | DEPENDENCY_BLOCKED | MINOR | no | - |
| P6B-D-016 | P6B-2 | 25 legacy accessory rows with UNVERIFIED effect text (amphibious seals, auxiliary generators, baffled drive, hidden cargo, holding cells, sensor baffling/decoy/mask, workshop, etc.) | SOURCE_EVIDENCE_MISSING | MINOR | no | - |
| P6B-D-017 | P6B-2 | hangar bays / cryogenic chambers (contents) | ENGINEERING_COMPLEXITY | MINOR | no | - |
| P6B-D-018 | P6B-2 | cargo pods (detachable option) | ENGINEERING_COMPLEXITY | MINOR | no | - |
| P6B-D-020 | P6B-3 | printed stock payloads (e.g. "Printed payload: 6 proton torpedoes") | DEPENDENCY_BLOCKED | MINOR | no | V-P2-04 |
| P6B-D-021 | P6B-3 | custom ships: cargo-dependent and consumables-dependent accessories | DEPENDENCY_BLOCKED | MINOR | no | V-P6B-02 |
| P6B-D-022 | P6B-3 | custom ships: speed and movement effects | ENGINEERING_COMPLEXITY | MINOR | no | - |
| P6B-D-023 | P6B-W | turbolasers and capital-scale (x5) weapons | ENGINEERING_COMPLEXITY | MINOR | no | - |
| P6B-D-024 | P6B-W | pilot +2 for weapons not covered by the sealed installation path | NONCRITICAL_DEFECT | MINOR | no | - |
| P6B-D-025 | P6B-W | blaster-cannon-light/medium/heavy, autoblaster | SOURCE_EVIDENCE_MISSING | MINOR | no | - |
| P6B-D-027 | P6B-W | vehicle weapon range bands | ENGINEERING_COMPLEXITY | MINOR | no | - |
| P6B-D-028 | P6B-W | player-requested weapon mounts | ENGINEERING_COMPLEXITY | MINOR | no | - |
| P6B-D-029 | P6B-W | vehicle weapon damage types (laser cannons) | SOURCE_EVIDENCE_MISSING | MINOR | yes | V-P6B-04 |
| P6B-D-030 | P6B-W | copilot as weapon operator | ENGINEERING_COMPLEXITY | MINOR | no | - |
| P6B-D-031 | P6B-W | weapon mount key uniqueness across pending jobs | NONCRITICAL_DEFECT | MINOR | no | - |
| P6B-D-037 | STOCK | published stock groups whose firing arc is stated but not interpreted, or never reviewed | SOURCE_EVIDENCE_MISSING | MINOR | no | - |
| P6B-D-038 | STOCK | legacy abstract-crew attack tier table (CREW_QUALITY_BONUS) for actors that are not source-backed or constructed | NONCRITICAL_DEFECT | MINOR | no | - |
| P6B-D-039 | STOCK | point-defense weapon modification (catalog row "point-defense", +4,000 credits) | ENGINEERING_COMPLEXITY | MINOR | no | - |
| P6B-D-041 | STOCK | published stock groups with droid, remote or ambiguous operators | ENGINEERING_COMPLEXITY | MINOR | no | - |
| P6B-D-057 | WEAPON-ECOSYSTEM | launcher capacity expansion and the remaining launcher kinds | RULES_DECISION_REQUIRED | MINOR | yes | V-P6A-03, V-P6C-06 |
| P6B-D-058 | WEAPON-ECOSYSTEM | source-specific special weapons without a printed table row | SOURCE_EVIDENCE_MISSING | MINOR | no | - |

## Details

### P6B-D-001 - reinforced-bulkheads-10, reinforced-bulkheads-20, reinforced-bulkheads-30

- **Source:** Starships of the Galaxy pp. 43-44
- **Category / severity:** RULES_DECISION_REQUIRED / IMPORTANT
- **Reason:** Hit points increase by a percentage; the book gives no rounding rule, and it is unruled whether the percentage applies to printed HP only or also to other HP increases.
- **Missing:** Rounding direction and percentage basis.
- **Owner ruling needed:** yes (V-P6-01)
- **Source-supported options:** round down (Core general rounding); round to nearest; percentage of printed HP only vs current maximum
- **Impact:** 3 rows stay SOURCE_VERIFIED and not installable.
- **Recommended action:** Owner rules on V-P6-01; the effect is a one-line hp kind in the effects registry once ruled.

### P6B-D-002 - sublight-drive-1 .. sublight-drive-6

- **Source:** Starships of the Galaxy p. 41, Table 3-3
- **Category / severity:** RULES_DECISION_REQUIRED / IMPORTANT
- **Reason:** Every published hull already has a sublight speed; installing a drive is a replacement, which is unruled (same question as shields/hyperdrives). The 'military vessels only' clause for the fastest drives has no hull 'military' attribute in canonical data.
- **Missing:** Replacement rule (refund, EP of the old drive); a source-backed military-hull classification.
- **Owner ruling needed:** yes (V-P6-02)
- **Source-supported options:** replacement frees the old drive's EP; replacement keeps the old EP consumed; replacement not allowed on stock hulls
- **Impact:** 6 rows stay SOURCE_VERIFIED and not installable; starship-scale speed is never changed by the Shipyard.
- **Recommended action:** Owner rules on V-P6-02; then decide how a hull is classified as military (data field) before enabling the fastest drives.

### P6B-D-003 - jamming-suite, jamming-array

- **Source:** Starships of the Galaxy p. 43
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** The rule is printed clearly, but applying it needs an effect on ANOTHER vehicle: a swift action that picks a target within 6 starship squares, a per-target size-based penalty on Use Computer (communications/sensors) and on fire control (not reducing the Intelligence modifier below +0), and an opposed Use Computer check. None of these consumers exists: no starship-scale range measurement, no cross-actor temporary condition store, and fire control is not used by any executable weapon (V-P2-04).
- **Missing:** Cross-vehicle temporary effect state, starship-scale range check, opposed-check flow, fire-control penalty consumer.
- **Owner ruling needed:** no (V-P6-05, V-P2-04)
- **Impact:** 2 rows stay SOURCE_VERIFIED and not installable.
- **Recommended action:** Build after weapon execution (V-P2-04) exists, using the combat ActiveEffect path for the target condition.

### P6B-D-004 - combat-thrusters

- **Source:** Starships of the Galaxy p. 41
- **Category / severity:** DEPENDENCY_BLOCKED / MINOR
- **Reason:** Effects are 'treated as one size smaller when targeted by capital-ship weapons' and 'treated as a starfighter for dogfighting and starship combat maneuvers'. The system has no dogfight eligibility check, no starship-maneuver eligibility by size, and no executable capital-ship weapon targeting.
- **Missing:** Dogfight / starship maneuver eligibility consumer; capital-weapon targeting (blocked by V-P2-04).
- **Owner ruling needed:** no (V-P6-05, V-P2-04)
- **Impact:** Row stays SOURCE_VERIFIED and not installable.
- **Recommended action:** Implement as a size-category override read by the dogfight and capital-weapon targeting code once those exist.

### P6B-D-005 - navicomputer-limited

- **Source:** Starships of the Galaxy p. 41
- **Category / severity:** RULES_DECISION_REQUIRED / MINOR
- **Reason:** The printed text says only that it stores two jumps' worth of information. It does not state whether it grants the navicomputer's +5 astrogation bonus, or what happens on a third jump.
- **Missing:** Bonus value (if any) and the consequence of exceeding two stored jumps.
- **Owner ruling needed:** yes (V-P6B-01)
- **Source-supported options:** no astrogation bonus; storage limit only; same +5 as a standard navicomputer while within its two stored jumps
- **Impact:** Row stays SOURCE_VERIFIED and not installable.
- **Recommended action:** Owner rules on V-P6B-01.

### P6B-D-006 - navicomputer (training clause)

- **Source:** Starships of the Galaxy p. 41
- **Category / severity:** NONCRITICAL_DEFECT / MINOR
- **Reason:** The +5 bonus is integrated. Any trained-only gate for astrogation in the skill roller is not vehicle-aware, so a navicomputer clause about untrained astrogation has no consumer; the roll is never blocked by the vehicle code either way.
- **Missing:** A trained-only check consumer for Use Computer (astrogate) that can see the vehicle.
- **Owner ruling needed:** no (V-P6-05)
- **Impact:** No incorrect mechanic: the bonus applies; the training permission is not enforced either way.
- **Recommended action:** Wire when the skill roller gains trained-only enforcement for skill uses.

### P6B-D-007 - com-jammers

- **Source:** legacy catalog row (effectVerification UNVERIFIED)
- **Category / severity:** SOURCE_EVIDENCE_MISSING / MINOR
- **Reason:** The row's effect text is legacy and unverified; the census does not match it to a printed SotG row.
- **Missing:** A printed source for the component and its effect.
- **Owner ruling needed:** no
- **Impact:** Row stays reference-only; not installable.
- **Recommended action:** Locate a printed source or retire the legacy row.

### P6B-D-008 - all 51 offline-integrated effects (P6B-0..3); P6B-0 environment and Pilot check; custom-ship effects

- **Source:** -
- **Category / severity:** LIVE_RUNTIME_PENDING / IMPORTANT
- **Reason:** Verified offline (Node tests with Handlebars). Foundry V13 runtime is not available in this environment.
- **Missing:** Live V13 session run of docs/audits/vehicles/p6a-final-acceptance-report.md checklist plus the P6B items in docs/audits/vehicles/p6b-sprint-report.md (recharge shields restores 10 with regenerating shields; SLAM speed Pilot check; astrogation and sensor roll bonuses; cargo-pod Dex effects; a custom ship using installed systems in combat).
- **Owner ruling needed:** no
- **Impact:** Status stays OFFLINE_INTEGRATED_LIVE_PENDING; nothing is marked LIVE_RUNTIME_VERIFIED.
- **Recommended action:** Run the live checklist in a V13 world.

### P6B-D-009 - sensor-array-2, sensor-array-4, sensor-array-6

- **Source:** Starships of the Galaxy pp. 48-53 (Accessories)
- **Category / severity:** DEPENDENCY_BLOCKED / MINOR
- **Reason:** Installed and certified: the effective Intelligence score and modifier are computed and shown. No runtime consumer reads a vehicle's Intelligence yet (vehicle weapon attack rolls are disabled under V-P2-04; printed crew skill modifiers are not recomputed from Intelligence).
- **Missing:** A vehicle attack-roll consumer (fire control) and a source-backed rule for which checks use the vehicle Intelligence modifier.
- **Owner ruling needed:** no (V-P2-04)
- **Impact:** Ledger status EXPOSED_NOT_APPLIED (mechanicallyApplied false) while installable.
- **Recommended action:** Read getEffectiveVehicleDerived().intelligence in P6B-3 weapon attack resolution once V-P2-04 is resolved.

### P6B-D-010 - cargo pods / extended range on hulls with annotated or unknown printed quantities; smuggler compartments

- **Source:** Starships of the Galaxy pp. 48-53 (Accessories)
- **Category / severity:** SOURCE_EVIDENCE_MISSING / MINOR
- **Reason:** V-P6B-02 resolved the unit conversions (owner ruling 2026-11-02): 398 of 429 hulls now have a convertible cargo value and 393 a convertible consumables duration. The remaining hulls print annotated, missing or unusual quantities (e.g. "70 tons (15 tons on shuttle-only models)", "2 days (1 week with booster ring)", "hours", "unlimited"); these are refused individually, never guessed (listed in annotatedCargo / annotatedConsumables). Smuggler compartments stay deferred: the printed text caps hidden cargo at 5% of the original cargo but does not say whether hidden space reduces normal cargo.
- **Missing:** Which value of an annotated quantity applies; whether smuggler compartment space is carved out of normal cargo.
- **Owner ruling needed:** yes (V-P6B-02)
- **Impact:** Planner refuses with CARGO_QUANTITY_ANNOTATED_UNRULED / CARGO_UNKNOWN (31 hulls) or CONSUMABLES_UNIT_CONVERSION_UNRULED / CONSUMABLES_UNKNOWN (36 hulls).
- **Recommended action:** Rule per annotated identity only if a player needs one of these hulls; otherwise leave refused.

### P6B-D-011 - escape-pod-small, escape-pod-large

- **Source:** Starships of the Galaxy pp. 48-53 (Accessories)
- **Category / severity:** RULES_DECISION_REQUIRED / MINOR
- **Reason:** Checked against the SotG text: the prose restricts small lifeboats to Colossal (frigate)+ and large lifeboats to Colossal (cruiser)+ (where the per-bay counts cost modifier/50 and /100 are whole numbers), while the catalog table cells are one size smaller. This is a conflict inside the book.
- **Missing:** Which restriction governs.
- **Owner ruling needed:** yes (V-P6B-05)
- **Source-supported options:** prose restriction; table restriction with a fractional-bay rounding rule
- **Impact:** Not installable.
- **Recommended action:** Owner rules on V-P6B-05; then a per-bay capacity effect like hangar bays.

### P6B-D-012 - passenger-seating, passenger-quarters, medical-suite

- **Source:** Starships of the Galaxy pp. 48-53 (Accessories)
- **Category / severity:** RULES_DECISION_REQUIRED / MINOR
- **Reason:** Checked against the SotG text: the printed formulas really do say "starship's size modifier" (negative for starships), so the catalog paraphrase is faithful and the book itself is defective here.
- **Missing:** How to read "size modifier" in these two formulas.
- **Owner ruling needed:** yes (V-P6B-06)
- **Source-supported options:** cost modifier; absolute size modifier
- **Impact:** Not installable.
- **Recommended action:** Owner rules on V-P6B-06.

### P6B-D-013 - slave-circuits-basic, slave-circuits-advanced, slave-circuits-recall

- **Source:** Starships of the Galaxy pp. 48-53 (Accessories)
- **Category / severity:** RULES_DECISION_REQUIRED / MINOR
- **Reason:** Crew requirement is reduced by 1/3 or 2/3 (never below 1); the rounding of fractional crew is not stated. Recall circuits also need a summon action and an untrained-crew override with no consumer.
- **Missing:** Rounding rule for crew reduction; recall action consumer.
- **Owner ruling needed:** yes (V-P6B-03)
- **Source-supported options:** round down the reduction (crew rounds up); round the remaining crew down; round to nearest
- **Impact:** Not installable.
- **Recommended action:** Owner rules on V-P6B-03.

### P6B-D-014 - droid-repair-team

- **Source:** Starships of the Galaxy pp. 48-53 (Accessories)
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** Automatic deployment when the ship moves down the condition track, a +13 Mechanics jury-rig of 1 step, and a 25% destruction chance when damage exceeds SR. This automates condition-track and damage application (runtime-risky) and depends on the Core jury-rig DC and duration, which the accessory text does not restate.
- **Missing:** Condition-track change hook for vehicles with a safe automation path; Core jury-rig DC/duration reference.
- **Owner ruling needed:** no
- **Impact:** Not installable.
- **Recommended action:** Implement as a GM-prompted (not automatic) roll first, after live testing of vehicle condition track.

### P6B-D-015 - cargo-jettison, transponders (IFF, masked, disguised x3), cloaking (hibridium, stygium), docking clamps, holonet/hyper transceivers, luxury upgrades

- **Source:** Starships of the Galaxy pp. 48-53 (Accessories)
- **Category / severity:** DEPENDENCY_BLOCKED / MINOR
- **Reason:** Action or narrative components with no consumer: no cargo-bay inventory to jettison; no sensor identification/IFF model; no concealment/Stealth consumer for starship combat; no docking state; communications are narrative; luxury maintenance and crew-quality step changes would require recomputing printed statblocks. Masked/disguised transponders also have special installation-failure outcomes (sublight engines destroyed) not modeled by the installation job.
- **Missing:** Consumers listed; installation-failure side effects for transponders.
- **Owner ruling needed:** no
- **Impact:** Not installable; shown as reference only.
- **Recommended action:** Revisit per component when the consuming system exists; transceivers could be enabled as narrative capabilities if the owner wants installable non-mechanical components.

### P6B-D-016 - 25 legacy accessory rows with UNVERIFIED effect text (amphibious seals, auxiliary generators, baffled drive, hidden cargo, holding cells, sensor baffling/decoy/mask, workshop, etc.)

- **Source:** Starships of the Galaxy pp. 48-53 (Accessories)
- **Category / severity:** SOURCE_EVIDENCE_MISSING / MINOR
- **Reason:** P6A verified the printed cost/EP of these Scum and Villainy p. 58 rows from the PDF, but their effect strings are legacy text. The repository OCR of the Scum and Villainy descriptions is largely unreadable, so the effects cannot be verified from it. A readable fragment suggests Personalized Controls grants +1 (one crew position), not the legacy "+2 to Pilot checks", so the legacy strings must not be trusted.
- **Missing:** PDF wording of each Scum and Villainy accessory description.
- **Owner ruling needed:** no
- **Impact:** Reference only; not installable.
- **Recommended action:** PDF prose review of Scum and Villainy (accessory descriptions near p. 58); replace legacy effect strings before any of these rows is certified.

### P6B-D-017 - hangar bays / cryogenic chambers (contents)

- **Source:** Starships of the Galaxy pp. 48-53 (Accessories)
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** Capacity is computed and shown; nothing assigns carried craft or stasis occupants against it (carriedCraft is printed data only).
- **Missing:** A carried-craft/occupant assignment model.
- **Owner ruling needed:** no
- **Impact:** Capacity is informational; no over-capacity enforcement.
- **Recommended action:** Add when a hangar roster UI is built.

### P6B-D-018 - cargo pods (detachable option)

- **Source:** Starships of the Galaxy pp. 48-53 (Accessories)
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** A pod may be made detachable to act as an escape pod for five times the cost; the Shipyard has no purchase-option mechanism.
- **Missing:** Catalog purchase options with cost multipliers.
- **Owner ruling needed:** no
- **Impact:** Only fixed pods can be installed.
- **Recommended action:** Add an option field to catalog rows and the quote.

### P6B-D-019 - remaining weapon systems, launchers and ammunition (laser cannons light/medium/heavy are certified and executable since the weapon slice)

- **Source:** Starships of the Galaxy pp. 44-48; Core Rulebook vehicle combat
- **Category / severity:** DEPENDENCY_BLOCKED / IMPORTANT
- **Reason:** V-P2-04 is resolved (GM-certified mounts). The light, medium and heavy laser cannons now run end to end (certified spec, GM mount, sealed executable entry, owned Item, preflight, vehicle attack math, Core damage formula). Every other weapon row stays uncertified until its own rules are covered: see P6B-D-023..031. Launchers/ammunition still need loading and expenditure authorities.
- **Missing:** Firing-arc policy (V-P2-04); launcher capacity and cost basis (V-P6A-03); armor-piercing missile price (V-P6A-02); triple cannon (V-P6A-01); weapon attack/damage consumer certification.
- **Owner ruling needed:** no (V-P2-04, V-P6A-01, V-P6A-02, V-P6A-03, V-P6A-04)
- **Impact:** Weapons, launchers and ammunition are reference-only; sealed ledger entries keep executable:false; the attack preflight keeps blocking.
- **Recommended action:** Owner rules on V-P2-04 and V-P6A-03 first (they unlock the most); then certify weapon rows one family at a time (lasers, ion, missiles) with mount, arc, ammunition and attack tests.

### P6B-D-020 - printed stock payloads (e.g. "Printed payload: 6 proton torpedoes")

- **Source:** published statblocks (capacity.storageNotes)
- **Category / severity:** DEPENDENCY_BLOCKED / MINOR
- **Reason:** Stock ordnance counts exist only as printed notes. Converting them into a magazine with expenditure needs the attack execution path (P6B-D-019).
- **Missing:** Executable stock attack groups.
- **Owner ruling needed:** no (V-P2-04)
- **Impact:** Payload stays visible as printed text; never decremented.
- **Recommended action:** Parse into a read-only magazine view when stock attacks become executable.

### P6B-D-021 - custom ships: cargo-dependent and consumables-dependent accessories

- **Source:** Starships of the Galaxy p. 52 (stock frames)
- **Category / severity:** DEPENDENCY_BLOCKED / MINOR
- **Reason:** A stock frame includes no cargo space, so cargo pods and extended range have no printed base on a custom design; the planner refuses them (CARGO_UNIT_NOT_TONS / CONSUMABLES_UNIT_CONVERSION_UNRULED) rather than inventing one. Custom ships otherwise use the same effects authority as published hulls (P6B-3).
- **Missing:** A cargo/consumables base for custom designs (frame table values are listed, but the stock-frame rule says the frame includes no cargo space), and V-P6B-02 for unit conversions.
- **Owner ruling needed:** no (V-P6B-02)
- **Impact:** Those accessories are not installable on custom designs.
- **Recommended action:** Decide whether the frame table cargo/consumables apply to a constructed ship.

### P6B-D-022 - custom ships: speed and movement effects

- **Source:** stock frames (speed printed as "16/4")
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** Frame speed is stored as printed text; custom ships keep their own system speed fields, so atmospheric thrusters on a custom design have no structured fly mode to modify (the planner refuses NO_ATMOSPHERIC_FLIGHT_MODE).
- **Missing:** Structured speed modes for stock frames.
- **Owner ruling needed:** no
- **Impact:** Atmospheric thrusters not installable on custom designs.
- **Recommended action:** Parse frame speed into character/starship speed modes in the frame builder.

### P6B-D-023 - turbolasers and capital-scale (x5) weapons

- **Source:** Core Rulebook, Vehicle Combat (Capital Ships); SotG p. 45 (point-defense)
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** The Core -20 against targets smaller than Colossal is implemented (vehicle-capital-penalty.js, in the vehicle attack math) and weapons may now be installed on frigate-size and larger hulls. Turbolasers stay uncertified: capital-scale (x5) damage against smaller-scale targets and their starship-scale ranges have not been verified end to end (the Core range cells are unreadable in the OCR). Update: 4 capital-ship single-gunner turbolaser groups on Colossal (cruiser) hulls (Munificent, Recusant, Venator, Rendili) are executable with the -20 applied once; the statblock vs-smaller figure (printed - 20 in 105 of 107 cases) is verified as a consistency check.
- **Missing:** Verified starship-scale range cells and capital-scale damage application for turbolasers.
- **Owner ruling needed:** no
- **Impact:** Turbolasers (light/medium/heavy, Hapan triple ion) are reference-only.
- **Recommended action:** PDF check of Table 10-2 turbolaser range cells and of damage application of x5 weapons to non-capital targets, then certify.

### P6B-D-024 - pilot +2 for weapons not covered by the sealed installation path

- **Source:** Core Rulebook, Vehicle Combat (attack modifiers)
- **Category / severity:** NONCRITICAL_DEFECT / MINOR
- **Reason:** Core Rulebook printed p. 171 (owner-verified): +2 attack bonus for a character trained in Pilot with a vehicle weapon crewed by the pilot. Implemented in the vehicle attack math for certified installed weapons whose sealed mount operator is the pilot, fired by the vehicle's assigned, Pilot-trained pilot-station Actor. NOT applied to abstract crew (no evidence the printed totals omit it) or to stock/printed attack groups and legacy weapons (their pilot-crewed designation is not authoritative).
- **Missing:** Authoritative pilot-crewed designation for stock printed attacks.
- **Owner ruling needed:** no
- **Impact:** Named pilots firing pilot-crewed weapons may be 2 low; abstract crew unaffected.
- **Recommended action:** Revisit when stock attack groups become executable.

### P6B-D-025 - blaster-cannon-light/medium/heavy, autoblaster

- **Source:** Core Rulebook Table 10-2; SotG pp. 44-47
- **Category / severity:** SOURCE_EVIDENCE_MISSING / MINOR
- **Reason:** Blaster cannon rows are PDF-verified (damage, EP, cost, availability). The starship-scale range cells of Core Table 10-2 are unreadable in the OCR. No weapon's maximum range is enforced today (range penalties follow the band the attacker states, P6B-D-027), so range cells do not change any certified calculation; the blaster's shorter range is therefore a documented limitation, not a guess.
- **Missing:** Table 10-2 blaster cannon starship-scale ranges from the PDF.
- **Owner ruling needed:** no
- **Impact:** Blaster cannons not installable.
- **Recommended action:** Confirm the range row; then certify like laser cannons.

### P6B-D-026 - ion cannons (light/medium/heavy, Hapan triple)

- **Source:** Core Rulebook, ion damage; SotG p. 47
- **Category / severity:** ENGINEERING_COMPLEXITY / IMPORTANT
- **Reason:** The damage formula resolves (e.g. 3d10 x 2, type ion), but ion damage against vehicles (shields, condition track, no hit point loss rules) has not been verified end to end in the damage application path.
- **Missing:** Verified ion-vs-vehicle damage application tests.
- **Owner ruling needed:** no
- **Impact:** Ion cannons not installable.
- **Recommended action:** Audit the ion branch of damage application for vehicle targets, then certify.

### P6B-D-027 - vehicle weapon range bands

- **Source:** Core Rulebook Table 10-2
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** Range penalties (0/-2/-5/-10) are applied from the attack's range band, which the attacker supplies; the band is not derived from token distance and scale (character vs starship).
- **Missing:** Scale context and distance-to-band derivation per weapon family.
- **Owner ruling needed:** no
- **Impact:** An attack without a stated band takes no range penalty.
- **Recommended action:** Derive the band from token distance once a scene scale setting exists.

### P6B-D-028 - player-requested weapon mounts

- **Source:** V-P2-04 owner ruling
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** The Shipyard asks a GM for the mount (key, arc, operator, reason) when a GM begins or instantly installs a certified weapon. A player cannot propose a mount for later GM approval; a player selecting a weapon is refused with WEAPON_MOUNT_UNCERTIFIED and must ask the GM to begin the work.
- **Missing:** A proposed-mount state on installation jobs with a GM approve step.
- **Owner ruling needed:** no
- **Impact:** Weapon installation work is started by the GM.
- **Recommended action:** Add mount proposals to jobs if players need to queue weapon work themselves.

### P6B-D-029 - vehicle weapon damage types (laser cannons)

- **Source:** SotG Table 3-5; Core vehicle weapons
- **Category / severity:** SOURCE_EVIDENCE_MISSING / MINOR
- **Reason:** Only ion weapons print a damage type. Laser cannon damage is left untyped (a name-based "energy" guess is not used).
- **Missing:** A printed damage type for laser cannons, if any.
- **Owner ruling needed:** yes (V-P6B-04)
- **Impact:** Type-dependent DR/resistances do not see laser damage as energy.
- **Recommended action:** Decide whether starship laser damage is typed.

### P6B-D-030 - copilot as weapon operator

- **Source:** Core Rulebook (vehicle weapons operated by pilot/copilot or gunner)
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** The attack-time crew station authority resolves only pilot and gunner stations, so mounts are limited to those operators.
- **Missing:** A copilot station in vehicle-crew-station-evidence.
- **Owner ruling needed:** no
- **Impact:** Copilot-operated mounts cannot be certified.
- **Recommended action:** Add the copilot station to the crew authority.

### P6B-D-031 - weapon mount key uniqueness across pending jobs

- **Source:** -
- **Category / severity:** NONCRITICAL_DEFECT / MINOR
- **Reason:** The planner refuses a mount key already used by an INSTALLED weapon; two pending jobs could still reserve the same key until one completes (the second then fails at completion only if re-planned).
- **Missing:** Mount-key reservation for pending jobs.
- **Owner ruling needed:** no
- **Impact:** A GM could start two jobs on one hardpoint.
- **Recommended action:** Pass pending-job mount keys into the planner like reserved EP.

### P6B-D-032 - launchers: loading, expenditure and capacity expansion

- **Source:** Starships of the Galaxy pp. 45-46
- **Category / severity:** DEPENDENCY_BLOCKED / IMPORTANT
- **Reason:** Standard capacities are now recorded from the printed text (vehicle-launcher-capacity.js). Loading and expending ammunition need a launcher attack path (missiles and torpedoes also carry special rules: splash, penetration, shieldbuster SR loss) and a magazine authority; capacity expansion needs V-P6A-03 (EP and cost basis).
- **Missing:** Launcher attack/ammunition authorities; V-P6A-03 for expansion.
- **Owner ruling needed:** yes (V-P6A-03)
- **Impact:** Launchers and ammunition are not installable; capacity is reference data only.
- **Recommended action:** Build the magazine authority on top of the existing AmmoSystem once one launcher family is certified for attack.

### P6B-D-033 - published stock groups whose printed attack total is not explained by a published rule (336 groups, mostly batteries)

- **Source:** canonical records, armament.firingGroups
- **Category / severity:** SOURCE_EVIDENCE_MISSING / IMPORTANT
- **Reason:** Investigated across 836 groups and 12 books. A printed total is the generic crew's complete attack modifier. It equals crew Base Attack + vehicle Int in 272 groups (delta 0), and exceeds it by exactly +2 on pilot-crewed groups in 231 of 313 cases (the Core p. 171 trained-Pilot rule; Core Rulebook statblocks omit it, later books include it, and the same crew quality prints both, so it is a per-statblock convention). Weapon batteries add +2 per gunner beyond the first (2 gunners +2, 3 +4, 4 +6, 5 +8, 6 +10; 85-98% of each size), matching the SotG fighter-group sentence "+2 on attacks per additional vehicle ... as a weapon battery"; the Core p. 170 battery text itself is unreadable in the OCR. Accepted and executable: delta 0, and +2 on pilot-crewed groups (260 groups after P6C-2A: laser/blaster/mass-driver cannons, plain or xN damage); the printed total is applied ONCE and its components are shown as included, never added again. Still unexplained: about 50 non-battery groups (mostly burst-fire / autofire modes and isolated cases, e.g. -5 printed on "Burst Fire mode" groups) and the battery groups, which also need the battery damage rules.
- **Missing:** Core p. 170 weapon battery text (PDF); the source of the residual single-operator deltas.
- **Owner ruling needed:** no
- **Impact:** Batteries and about 50 single-operator groups stay refused (STOCK_ATTACK_TOTAL_UNEXPLAINED_DELTA).
- **Recommended action:** Read Core p. 170 from the PDF, then design the battery model (P6B-D-034) with the +2 per additional gunner rule.

### P6B-D-034 - published stock weapon batteries and multi-gunner stations (291 groups)

- **Source:** canonical records
- **Category / severity:** ENGINEERING_COMPLEXITY / IMPORTANT
- **Reason:** Capital-ship batteries are operated by several gunners with a battery size and autofire/fire-linked rules that no vehicle mechanic consumes. They are refused rather than treated as one cannon.
- **Missing:** A battery model (members, gunners, linked fire).
- **Owner ruling needed:** no
- **Impact:** Capital-ship stock weapons are reference-only.
- **Recommended action:** Design the battery model on top of the stock group authority once single-weapon groups are live-verified.

### P6B-D-036 - published stock splash, ion and ammunition-limited groups (torpedoes, missiles, ion cannons; 71 splash + 71 ion groups)

- **Source:** canonical records
- **Category / severity:** DEPENDENCY_BLOCKED / IMPORTANT
- **Reason:** Splash/area groups need the area-attack path and a finite-payload magazine. Ion groups: the damage engine only partly models ion (threshold type flag and an ion-shielding cap); the Core vehicle ion rule text is garbled in the OCR (half the ion damage to hit points, plus condition-track effects for droids and vehicles), so ion-versus-vehicle application cannot be verified from the repository. Finite-ammunition groups (missiles, torpedoes, rockets, mines, bombs, grenades, launchers) and ion-labelled groups are denied by wording (STOCK_AMMUNITION_LIMITED_UNTRACKED, STOCK_DAMAGE_ION_UNVERIFIED) so they cannot fire without a magazine authority.
- **Missing:** Core p. 168-169 ion damage text (PDF) and an ion-versus-vehicle damage test; area attack integration; magazine authority.
- **Owner ruling needed:** no (V-P6A-03)
- **Impact:** X-wing proton torpedoes stay reference-only; its laser cannons fire.
- **Recommended action:** Build the magazine authority first (one launcher family), then splash.

### P6B-D-037 - published stock groups whose firing arc is stated but not interpreted, or never reviewed

- **Source:** canonical records, fieldStates armament.firingArcs
- **Category / severity:** SOURCE_EVIDENCE_MISSING / MINOR
- **Reason:** After the V-P6C-01 ruling: 12 groups sit on records with no arc evidence at all (e.g. AAT-1) and 5 groups state arcs the system cannot interpret (turret, articulated, axial keel, flank-mounted turrets). A fixed-forward / forward-firing statement is enforced. The earlier count of 345 unreviewed groups was inflated by reading only one of the two field-state key styles in the canonical records.
- **Missing:** Arc review for the 12 records; interpretation of turret / articulated / flank arcs.
- **Owner ruling needed:** no
- **Impact:** 17 groups not executable for arc reasons.
- **Recommended action:** Review the 12 records; decide how turret arcs are modelled.

### P6B-D-038 - legacy abstract-crew attack tier table (CREW_QUALITY_BONUS) for actors that are not source-backed or constructed

- **Source:** docs/audits/rolling-system-alignment-phase-4.md
- **Category / severity:** NONCRITICAL_DEFECT / MINOR
- **Reason:** The tier table (normal 2, skilled 5, expert 8, ace 10) was an unsourced stand-in (the Phase 4 audit says so) and disagrees with the published crew Base Attack in the corpus (Core: skilled +2, expert +5, ace +10). Source-backed and constructed ships now use their verified crew Base Attack; only legacy/unrecorded vehicles still use the table (and the crew skill router for non-attack checks).
- **Missing:** A decision on whether to retire the legacy table for legacy actors.
- **Owner ruling needed:** no
- **Impact:** Legacy vehicle attacks only.
- **Recommended action:** Replace with the Core crew quality attack column when legacy vehicles are migrated.

### P6B-D-039 - point-defense weapon modification (catalog row "point-defense", +4,000 credits)

- **Source:** Starships of the Galaxy p. 45
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** Point-defense is a modification OF an installed weapon (exempting it from the capital-ship penalty), not a weapon. The Shipyard has no weapon-modification model, so no weapon can be classified point-defense; stock groups labelled point-defense are refused rather than inferred.
- **Missing:** A weapon-modification (modifier) model on installations.
- **Owner ruling needed:** no
- **Impact:** Capital ships cannot field point-defense weapons yet.
- **Recommended action:** Add modifier entries targeting an installed weapon to the sealed ledger.

### P6B-D-041 - published stock groups with droid, remote or ambiguous operators

- **Source:** canonical records; vehicle-crew-station-evidence.js
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** The attack-time crew authority resolves pilot, copilot and gunner stations (copilot added). Droid brains, "virtual droid gunner", "remote pilot", "2 gunners" and ambiguous "pilot or gunner" operators have no defined crew model.
- **Missing:** Copilot station in the attack crew authority; droid operator semantics.
- **Owner ruling needed:** no
- **Impact:** 36 groups refused.
- **Recommended action:** Add the copilot station to the crew authority first; leave droid and ambiguous operators refused until defined.

### P6B-D-043 - weapon batteries crewed by named gunners (assisting roster)

- **Source:** vehicle-crew-actor-authority.js; vehicle-crew-station-evidence.js; Core p. 170
- **Category / severity:** ENGINEERING_COMPLEXITY / IMPORTANT
- **Reason:** Crew assignment holds one actor per station key (gunner, gunner-2, ...). Nothing says which gunner stations belong to which battery, so the assisting gunners of a battery cannot be established. A named gunner on a battery is refused (BATTERY_ASSIGNED_CREW_ROSTER_UNMODELED) rather than inferred from a displayed bonus. The pure arithmetic exists and is tested (resolveBatteryAttackTotal, crew 'assigned').
- **Missing:** A binding from a battery weapon to its assisting gunner stations, validated against the existing crew assignment authority (distinct actors, real stations).
- **Owner ruling needed:** no
- **Impact:** Named-gunner crews cannot fire published batteries; the generic published crew can.
- **Recommended action:** Add a roster binding that references existing crew stations, then wire resolveBatteryAttackTotal('assigned') into the named-gunner attack math.

### P6B-D-050 - weapon configurations: double, triple, quad, fire-linked, optional fire link, cannon enhancements

- **Source:** Starships of the Galaxy, Weapon Systems and Table 3-5 (p. 47)
- **Category / severity:** ENGINEERING_COMPLEXITY / IMPORTANT
- **Reason:** V-P6C-10/V-P6C-11 are resolved (owner rulings 2026-11-04): configured price = base price x the printed multiplier (a total, not a surcharge), extra dice before the vehicle multiplier, alternatives within a group, nothing stacks automatically, enhancements never on turbolasers. The weapon-option mechanism built for point defense (an option sealed into the entry, priced and EP-adjusted through a derived catalog entry) is the carrier.
- **Missing:** A multiplier price kind in the derived entry, extra dice in the certified damage, eligibility per configuration, and tests per configuration through purchase, install, fire and removal.
- **Owner ruling needed:** no (V-P6C-10, V-P6C-11)
- **Impact:** Aftermarket double/triple/quad/fire-linked/enhanced weapons cannot be bought.
- **Recommended action:** Implement double, triple, quad, fire-linked 2 and 4 (energy weapons) and the enhancements one at a time (WE-4).

### P6B-D-051 - autofire (starship-scale single-target mode), autoblaster and Burst Fire

- **Source:** Core Rulebook, Special Combat Rules: Autofire and Vehicle Combat: Scale; Starships of the Galaxy, Cannon Double/Quad and Fire-Linked Weapons (Autofire)
- **Category / severity:** ENGINEERING_COMPLEXITY / IMPORTANT
- **Reason:** V-P6C-07 (miss damage), V-P6C-08 (Burst Fire applies to autofire-capable vehicle weapons, extra dice before the multiplier) and V-P6C-09 (the autoblaster grants autofire to a single-mounted blaster cannon) are resolved. Remaining: the swift-action autofire mode, the -5 attack, Burst Fire with verified feat evidence, the autoblaster configuration.
- **Missing:** Autofire mode switch and the Burst Fire combat option for vehicle weapons (WE-5), the autoblaster (WE-6).
- **Owner ruling needed:** no (V-P6C-07, V-P6C-08, V-P6C-09)
- **Impact:** No autofire for any vehicle weapon.
- **Recommended action:** Build the established part after P6B-D-050; keep the three questions in the register.

### P6B-D-052 - point-defense weapon modification: aftermarket option IMPLEMENTED; stock classification and point-defense ranges remain

- **Source:** Starships of the Galaxy, Weapon Systems: Point-Defense Weapon; Table 3-5; Core Rulebook p. 170
- **Category / severity:** ENGINEERING_COMPLEXITY / IMPORTANT
- **Reason:** WE-PD (2026-11-04): the printed modification (+4,000 credits per weapon, 0 extra EP, Restricted, Colossal or larger only; blaster cannons, laser cannons and light ion cannons only) is an OPTION chosen when an eligible weapon is bought, sealed into the weapon's ledger entry; it removes the Core -20 capital-ship penalty against targets smaller than Colossal through the certified specification (never a name or an Item field). The price is printed as an addition per weapon, so it needed no ruling. 60 stock groups labelled point-defense stay refused: a statblock label is not evidence of the modification (STOCK_POINT_DEFENSE_CLASSIFICATION_UNVERIFIED). The Table 10-2 point-defense range row is recorded on the option but unused until range-band resolution exists (P6B-D-053). GM exceptions to "normally" are not implemented. ACCELERATED (2026-11-04): a statblock designation that PRINTS 'point-defense' (not the notes, not another word) is now the source stating the fact: such stock groups use the point-defense Table 10-2 row and take no capital-ship penalty (18 groups unlocked).
- **Missing:** Stock point-defense classification from structured evidence; point-defense range bands (P6B-D-053); the Hapan triple ion cannon, which acts like a point-defense weapon.
- **Owner ruling needed:** no
- **Impact:** Aftermarket point defense works; stock point-defense groups are not executable.
- **Recommended action:** Resolve with range-band resolution; keep the stock gate name-blind.

### P6B-D-054 - shieldbuster torpedoes, space mines and ion bombs

- **Source:** Starships of the Galaxy, Weapon Systems and Table 3-5
- **Category / severity:** ENGINEERING_COMPLEXITY / IMPORTANT
- **Reason:** Shieldbusters halve damage against anything but shields and remove 10 SR (not 5) when an attack exceeds SR; mines are deployed as a swift action, persist in a square, can be noticed (Stealth +5, Perception reaction, Use Computer reaction), are IFF-immune or command-detonated, and detonate as an area attack on every ship entering; ion bombs work only in an atmosphere at -5, may target the square beneath the ship and deal 5d10 ion damage in a 10-square radius. None is a plain direct-fire missile.
- **Missing:** The shield rule in the damage engine, a persistent mine record with detection and detonation, the bomb atmosphere gate, launcher installation and ammunition rows for each.
- **Owner ruling needed:** no (V-P6C-07)
- **Impact:** Three launcher families cannot be bought or fired.
- **Recommended action:** Implement as separate slices (priority 8).

### P6B-D-055 - vehicle tractor beams

- **Source:** Core Rulebook, Vehicles: Tractor Beams (cited at p. 174 by Starships of the Galaxy); Starships of the Galaxy Table 3-5
- **Category / severity:** ENGINEERING_COMPLEXITY / IMPORTANT
- **Reason:** Not a damage attack: hit on equal or exceeding Reflex, then an opposed grapple check; a grabbed target of the beam vehicle's size or smaller cannot move and loses its Dexterity bonus to Reflex; each round another opposed grapple check to hold, pull up to 10 squares (1 at starship scale) or lose the target; leaving range breaks the hold. 58 stock groups are refused.
- **Missing:** A persistent grab record, the opposed grapple check on vehicles, forced movement, and the range break.
- **Owner ruling needed:** no
- **Impact:** No tractor beam can be fired or bought.
- **Recommended action:** Implement as its own slice (priority 9); never model it with hit-point damage.

### P6B-D-056 - gravity well projectors

- **Source:** Starships of the Galaxy, Weapon Systems: Gravity Well Projectors; Table 3-5
- **Category / severity:** ENGINEERING_COMPLEXITY / IMPORTANT
- **Reason:** Not a damage attack: the operator chooses a 4x4-square (starship scale) area in range and attacks Reflex Defense 10; on success the area becomes a hyperspace interdiction field and a starship starting its turn in it may not activate its hyperdrive that turn.
- **Missing:** A persistent field record, area placement, and a hyperdrive-activation gate.
- **Owner ruling needed:** no
- **Impact:** No gravity well projector can be fired or bought.
- **Recommended action:** Implement as its own slice (priority 10).

### P6B-D-057 - launcher capacity expansion and the remaining launcher kinds

- **Source:** Starships of the Galaxy, Weapon Systems (launcher capacities); Table 3-5
- **Category / severity:** RULES_DECISION_REQUIRED / MINOR
- **Reason:** Extra launcher capacity (+20% / +25% per additional unit up to the printed maximum) is unusable until the emplacement-point effect and the base of the percentage are ruled (V-P6A-03); the shieldbuster, mine, bomb, discord and gravity-mine launchers are not promoted; reload remains a GM operation (V-P6C-06).
- **Missing:** A ruling on capacity expansion; the launcher kinds depend on P6B-D-054.
- **Owner ruling needed:** yes (V-P6A-03, V-P6C-06)
- **Impact:** Launchers carry their standard capacity only.
- **Recommended action:** Hold until V-P6A-03 is ruled.

### P6B-D-058 - source-specific special weapons without a printed table row

- **Source:** Clone Wars Campaign Guide (mass-driver, rail, composite beam, proton grenade); Rebellion Era Campaign Guide (flak pod); statblock-only equipment
- **Category / severity:** SOURCE_EVIDENCE_MISSING / MINOR
- **Reason:** These catalog rows have text descriptions but no printed price, EP or availability row (or appear only inside statblocks); their numbers came from statblocks. They cannot be priced or installed, and each needs its own verified mechanic (for example the composite beam cannon ignores 5 points of SR; the flak pod is an area attack at starship scale with half damage on a miss).
- **Missing:** A reconciled printed source row (or an owner decision to sell them) and an individually verified mechanic per weapon.
- **Owner ruling needed:** no
- **Impact:** Stock groups run only where they are plain damage; none is purchasable.
- **Recommended action:** Reconcile each against its printed source, then implement individually (priority 11).

### P6B-D-059 - Autofire capability of stock weapon groups

- **Source:** Starships of the Galaxy autofire-capable list; stock statblock 'autofire' figures
- **Category / severity:** SOURCE_EVIDENCE_MISSING / IMPORTANT
- **Reason:** Autofire/Burst Fire now execute for installed autofire-capable weapons (double, quad, fire-linked, autoblaster options). A stock group carries no sealed capability, and the printed statblock autofire figures are not a verified capability record, so stock autofire and burst are refused (AUTOFIRE_CAPABILITY_NOT_ESTABLISHED).
- **Missing:** A verified per-group autofire capability (or evidence that the plain laser cannon / light ion cannon / light turbolaser rows are themselves autofire-capable) and the meaning of the printed autofire totals.
- **Owner ruling needed:** no (V-P6C-08)
- **Impact:** Stock vehicles cannot autofire or burst; installed ones can.
- **Recommended action:** Reconcile the capability list against each canonical group, then set it in the group assessment.

### P6B-D-060 - Swift-action switch to autofire mode

- **Source:** Core Rulebook, Special Combat Rules: Autofire
- **Category / severity:** ENGINEERING_COMPLEXITY / IMPORTANT
- **Reason:** Autofire is requested per attack; the swift action to set the weapon to autofire is not charged and the mode is not persisted, the same as the character attack path.
- **Missing:** A persisted per-weapon mode and a swift-action spend through the action economy.
- **Owner ruling needed:** no (V-P6C-08)
- **Impact:** Autofire costs no swift action.
- **Recommended action:** Persist the mode on the Item flag and spend 'swift' through ActionEconomyConsumption.

### P6B-D-061 - Burst Fire by an operator other than the named gunner; autofire plus battery

- **Source:** Core Rulebook (Burst Fire feat, weapon batteries)
- **Category / severity:** DEPENDENCY_BLOCKED / IMPORTANT
- **Reason:** Burst Fire reads the named gunner actor's feat; a pilot-operated weapon with a named pilot and a battery weapon carrying burst dice are refused.
- **Missing:** Operator resolution for pilot-fired weapons and a published rule for burst dice on a battery.
- **Owner ruling needed:** no (V-P6C-08)
- **Impact:** Those combinations are refused, not guessed.
- **Recommended action:** Extend after the operator model batch.

## Resolved items

### P6B-D-035 - published stock groups with capital-scale (x5 or other) multipliers (192 groups) and turbolasers

- **Resolved:** Multipliers other than x2 (x5, x10, ...) are applied exactly as printed through the one damage composition authority (P6C-2A); the groups that remain refused are blocked by batteries, ion, ammunition or other mechanics, not by the multiplier.
- **Was:** Weapon damage x multiplier is the Core rule, but capital-scale damage against smaller-scale targets and starship-scale ranges are not verified end to end, so only the x2 multiplier is executable.

### P6B-D-040 - published stock groups printing a damage dice expression with no multiplier (52 groups; 20 blocked by this alone)

- **Resolved:** Owner ruling 2026-11-03: an omitted multiplier is x1 and neither invalidates a vehicle weapon nor makes it a personal weapon (Core vehicle examples print plain 4d10/5d10). Implemented in vehicle-stock-weapon-groups.js (P6C-2A).
- **Was:** Core says vehicle weapon damage is dice x the listed multiplier, but groups printing plain dice (e.g. "5d10") mix character-scale weapons and autofire/burst values. Treating them as x1 vehicle damage could be wrong, so they are refused (STOCK_DAMAGE_NO_MULTIPLIER).

### P6B-D-042 - published weapon batteries that print gunners but not the number of identical weapons: FULL-BATTERY mode only (independent-weapon mode is implemented)

- **Resolved:** Owner direction 2026-11-03: do not guess the weapon count; support independent single-weapon firing. Implemented in vehicle-weapon-battery.js, vehicle-stock-weapon-groups.js (modes), vehicle-stock-weapon-items.js (one Item per mode).
- **Was:** Core p. 170 caps extra hits by the identical weapons actually participating. A battery statblock prints "battery (N gunners)"; only Krayt's Honor and the Rendili Light Corvette also print the number of weapons. Owner direction 2026-11-03 (V-P6C-02): the weapon count and the gunner count are independent and neither is inferred from the other; the equality requirement written in 2B was an invented restriction and is removed. A battery's weapons may fire independently without battery assistance (Core p. 170), which needs only the printed gunner count: that independent-weapon mode is executable for 64 printed batteries (63 of them independent-only). Full-battery mode (assistance + margin hits) still needs a printed weapon count.

### P6B-D-044 - battery aiding another battery: ordinary single-aid case IMPLEMENTED; multiple assisting batteries/stacking and a sheet button remain

- **Resolved:** Owner addendum 2026-11-04: timing is the published Aid Another rule; ordinary case implemented.
- **Was:** Core p. 170 (Aid Another, PUBLISHED_RULE): a standard action benefiting the ally's next attack roll. Implemented in vehicle-battery-aid.js and vehicle-battery-aid-service.js: the standard action through ActionEconomyConsumption, the aid attack against Reflex Defense 10 through the attack outcome resolver, +2 per complete pair of the assisting battery's weapons, one pending aid per aided battery, applied by the attack ledger to that battery's next attack roll and consumed once (idempotent), no margin hits from the aid. Not done: stacking of several assisting batteries (SOURCE_UNRESOLVED, refused), and the vehicle-sheet button that calls VehicleBatteryAidService.perform (the service is callable; no UI action is wired yet).

### P6B-D-045 - ion damage: ordering with shield rating / damage reduction and 0 HP + threshold (resolved by approved project interpretation)

- **Resolved:** Owner addendum 2026-11-04: approved sequencing and specific-over-general at 0 HP (PROJECT_INTERPRETATION).
- **Was:** Resolved 2026-11-04 as PROJECT_INTERPRETATION V-P6C-04 (owner addendum): vulnerability -> shield rating -> damage reduction -> kept full amount -> HP halving -> threshold on the kept amount; at 0 HP the specific ion disable outcome governs the general destroy outcome for an ion-only hit. Implemented in damage-packet-rules.js and damage-resolution-engine.js; the damage type stays ion for every target and only the ion special effects are switched off for an ordinary organic. Hits that exercise an interpretation report it in result.projectInterpretations.

### P6B-D-046 - R-28 "medium ion cannons" damage typing (Legacy Era Campaign Guide p. 85); AAT-1 vulnerability is implemented

- **Resolved:** AAT-1 part resolved 2026-11-04 (owner addendum, PROJECT_INTERPRETATION).
- **Was:** AAT-1 (Core p. 176): implemented as PROJECT_INTERPRETATION V-P6C-05 through damage-vulnerability-authority.js (x2 on the incoming ion damage before shield rating, damage reduction and halving). R-28: the statblock prints `Medium ion cannons (pilot) Atk +7, Dmg 6d10x2` with no ion type, while the narrative calls 'the fire-linked ion cannons' the ship's 'nonlethal munitions'. The canonical group evidence does not type the damage and canonical records are not edited.

### P6B-D-047 - guided missile and torpedo lock-on: core IMPLEMENTED; automatic turn trigger, sheet actions and interception targeting remain

- **Resolved:** Owner addendum 2026-11-04 (PUBLISHED_RULE, no extra ammunition for the follow-up).
- **Was:** PUBLISHED_RULE (Core, Missiles and Torpedoes) implemented in vehicle-guided-projectile.js and vehicle-projectile-service.js, wired into rollAttack: an AIMED guided launch that MISSES leaves one persistent projectile on the launching vehicle (target, launcher, attack bonus, 10 HP, Reflex 30); its single follow-up attack (rollOptions.guidedFollowUp) uses the same bonus with -5, costs no ammunition and no action, must keep its target and launcher, is due on a later round of the same combat, and ends the projectile (hit) or self-destructs it (second miss); no retries; interception (Reflex 30, 10 HP) shoots it down. Not done: nothing triggers the follow-up automatically at the attacker's next turn (a caller passes guidedFollowUp), no sheet button/chat prompt, the readied-action cost of intercepting is the caller's, and attacking a projectile is not wired into target selection (VehicleProjectileService.intercept is an API).

### P6B-D-048 - area and splash damage: ordinary splash at STARSHIP scale IMPLEMENTED (single target); character-scale multi-target area and explicit starship-scale areas remain

- **Resolved:** Owner addendum 2026-11-04 (PUBLISHED_RULE).
- **Was:** PUBLISHED_RULE (Core, Vehicle Combat): area attacks, including splash and burst-radius weapons, resolve as an attack on a single target in starship scale unless the weapon is specifically listed with a starship-scale area attack. Implemented: vehicle-encounter-scale.js (vehicles-only = starship scale), the gate reads an ordinary N-square splash/burst as an area attached to the group, and the attack preflight resolves it before any cost. Still refused: character-scale encounters (the multi-target engine does not exist) and explicit starship-scale areas (the Subjugator's ion pulse cannons, with hit/miss/recharge riders). WE-3 (2026-11-04, V-P6C-07 resolved): the area-attack miss rule now applies to these single-target resolutions: a miss deals half damage, a hit full.

### P6B-D-049 - finite ammunition ledger: IMPLEMENTED; 18 groups wait for a GM-certified allocation; reload action cost not inferred

- **Resolved:** Owner addendum 2026-11-04 (PROJECT_INTERPRETATION for initial loading and the GM reload).
- **Was:** vehicle-ammunition-ledger.js / vehicle-ammunition-service.js: payload, capacity, loaded, reserve and expended are separate, conservation payload = loaded + reserve + expended is validated at every use (a hand-edited ledger is refused), spending is atomic and idempotent per attack id and refunded when the attack fails, a refused attack spends nothing, the guided follow-up spends nothing, and the ledger does not depend on the optional blaster-charge setting. Initial loading (PROJECT_INTERPRETATION): loaded = min(payload, capacity), reserve = payload - loaded, for a verified single launcher only. Reload is a GM operation that moves reserve to loaded without creating ammunition and invents no action cost. 24 groups print a payload; none has a verified single launcher, so 0 are complete. 18 have payload + an exactly-designated launcher but an unverified launcher count (STOCK_LAUNCHER_ALLOCATION_NOT_CERTIFIED): they are NOT armed and NOT counted, because arming an Item that cannot fire until a GM certifies it needs a sheet action that does not exist. WE-L1 (2026-11-04): AFTERMARKET launchers (proton torpedo; light, medium, heavy concussion) are a complete, tested family: the ledger lives on the vehicle under a guarded flag keyed by installation id, ammunition is bought per unit in one TransactionEngine transaction with the ledger, arrives in reserve, and the sheet offers Buy ammunition and the GM reload.

### P6B-D-053 - vehicle weapon range-band resolution: IMPLEMENTED (WE-2) for every vehicle-managed weapon

- **Resolved:** Implemented in vehicle-weapon-range.js, vehicle-attack-range.js and rollAttack; tested in tests/vehicle-universal-phase4e-p35-vehicle-range.test.mjs (exact boundaries of every Table 10-2 row, both scales, footprints, grid sizes/units, refusals, no override). Five stock groups whose designation names no Table 10-2 row (two mass-driver cannons, 'double lasers', the Proton beam cannon, volcano cannons) are no longer executable; stock executable groups 351 -> 346.
- **Was:** The attack math applies the Core range modifier (0 / -2 / -5 / -10) from a caller-supplied rangeBand; no code resolves the attacker-target distance to a Table 10-2 band for a vehicle weapon, so attacks made from the sheet carry no range modifier. Every promoted weapon names its Table 10-2 row (rangeSlug). WE-2 (2026-11-04): rollAttack resolves the band from the distance between the attacking vehicle's token and the target's token (footprints counted, square or gridless scenes), at the encounter's scale, in the weapon's Table 10-2 row (RangeEngine + data/vehicle-weapon-ranges.json), before any cost; the Core penalties 0/-2/-5/-10 come from the single getRangePenalty authority; a caller-supplied band, distance or explicit penalty is overwritten; an unresolved distance, grid, scale or table and a target beyond long range are refused. Custom designs' legacy weapons (not vehicle-managed) keep the caller-supplied band.
