SWSE Archetype Semantic Curation Authority

Phase: 12B — Archetype Semantic Curation
Status: ROLLING AUTHORITY — NEXT TRANCHE READY / BASELINE PENDING
Certified: 50 / 297 archetypes
Current execution: 12B-SCOUT-03 — 20 new records
Required baseline for current execution: 25395ae96f8341d0b6df8acb341181f09eb4e436
Runtime target: data/archetypes.json
Frozen ontology: data/audits/talent-feat-phase3-final-ontology.json — 190 tags

> Replace the pending baseline with the successful commit returned by Claude for 12B-SCOUT-02 before executing this tranche. Do not infer or substitute a SHA.

Purpose

This is the rolling human owner authority for archetype semantic curation. The companion JSON is the machine authority. Claude is an executor: it applies certified arrays exactly and does not decide semantic meaning.

Companion: archetype-phase-12b-semantic-curation-next20.json

Curation rules

1. Narrative identity defines what the archetype is.
2. Signature exact mechanics show how that identity is expressed.
3. Supporting mechanics reinforce but do not automatically define identity.
4. Only the frozen 190-tag ontology may be used.
5. Class is a route, not ownership.
6. Parent tags do not automatically inherit to specializations.
7. Recommended feat/talent tags are evidence, not a bag of tags to copy wholesale.
8. Optional routes stay supporting unless the archetype itself requires them.

Primary tags

Identity-defining evidence. A strong match should meaningfully support recognition of the archetype.

Supporting tags

Strongly characteristic but nonessential evidence. They reinforce the archetype without becoming requirements.

────────

Rolling Certified Census

|ID                            |Archetype                   |Tranche|Primary                                                                    |Supporting                                                                                     |
|------------------------------|----------------------------|------:|---------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
|`fringer`                     |Fringer                     |01     |`exploration`, `perception`, `survivability`, `survival`                   |`endurance`, `mechanics`, `mobility`, `pilot`, `repair`, `resilience`, `tech`                  |
|`scavenger`                   |Scavenger                   |01     |`equipment`, `mechanics`, `tech`                                           |`crafting`, `modification`, `perception`, `repair`, `survivability`, `survival`, `use_computer`|
|`bounty_hunter`               |Bounty Hunter               |01     |`investigation`, `perception`, `pursuit`, `survival`, `tracking`           |`gather_information`, `initiative`, `precision`, `ranged`, `social`, `stealth`, `targeting`    |
|`sector_ranger`               |Sector Ranger               |01     |`investigation`, `perception`, `pursuit`, `survival`, `tracking`           |`control`, `initiative`, `knowledge`, `pilot`, `ranged`                                        |
|`frontier_marshal`            |Frontier Marshal            |01     |`ally_support`, `leadership`, `perception`, `persuasion`, `support`        |`control`, `gather_information`, `initiative`, `social`, `survival`, `tactics`, `teamwork`     |
|`force_hunter`                |Force Hunter                |01     |`anti-force`, `perception`, `pursuit`, `survival`, `tracking`              |`force`, `force_power`, `precision`, `ranged`, `resilience`, `stealth`, `targeting`            |
|`sniper`                      |Sniper                      |01     |`precision`, `ranged`, `setup`, `sniper`, `targeting`                      |`ambush`, `concealment`, `control`, `initiative`, `perception`, `stealth`                      |
|`saboteur`                    |Saboteur                    |01     |`infiltration`, `mechanics`, `stealth`, `tech`, `trap`                     |`burst_damage`, `cover`, `crafting`, `equipment`, `setup`, `use_computer`                      |
|`partisan`                    |Partisan                    |01     |`ambush`, `infiltration`, `stealth`, `survival`, `tactics`                 |`deception`, `evasion`, `initiative`, `perception`, `social`                                   |
|`pilot`                       |Pilot                       |01     |`pilot`, `pursuit`, `space`, `vehicle`                                     |`initiative`, `mechanics`, `mobility`, `perception`, `tactics`, `teamwork`                     |
|`astrogator`                  |Astrogator                  |02     |`exploration`, `pilot`, `space`, `use_computer`                            |`knowledge`, `perception`, `vehicle`                                                           |
|`racer`                       |Racer                       |02     |`initiative`, `pilot`, `pursuit`, `vehicle`                                |`mobility`, `movement`, `perception`, `space`                                                  |
|`disaster_responder`          |Disaster Responder          |02     |`ally_support`, `recovery`, `support`, `survivability`, `treat_injury`     |`endurance`, `healing`, `mechanics`, `medical`, `perception`, `repair`, `survival`             |
|`explorer`                    |Explorer                    |02     |`exploration`, `perception`, `survival`                                    |`endurance`, `knowledge`, `mobility`, `pilot`, `space`, `vehicle`                              |
|`pathfinder`                  |Pathfinder                  |02     |`exploration`, `mobility`, `perception`, `survival`                        |`endurance`, `evasion`, `stealth`, `support`, `survivability`                                  |
|`survivalist`                 |Survivalist                 |02     |`endurance`, `resilience`, `survivability`, `survival`                     |`climb`, `mobility`, `perception`, `recovery`, `swim`                                          |
|`search_and_rescue_specialist`|Search-and-Rescue Specialist|02     |`ally_support`, `perception`, `recovery`, `support`, `survival`, `tracking`|`endurance`, `healing`, `medical`, `pilot`, `survivability`, `treat_injury`                    |
|`first_contact_specialist`    |First-Contact Specialist    |02     |`exploration`, `knowledge`, `persuasion`, `social`                         |`gather_information`, `perception`, `support`                                                  |
|`galactic_archaeologist`      |Galactic Archaeologist      |02     |`exploration`, `investigation`, `knowledge`, `perception`                  |`survival`, `use_computer`                                                                     |
|`prospector`                  |Prospector                  |02     |`exploration`, `perception`, `survival`                                    |`endurance`, `knowledge`, `mechanics`, `mobility`                                              |
|`naturalist`                  |Naturalist                  |02     |`exploration`, `knowledge`, `perception`, `survival`                       |`beast`, `treat_injury`                                                                        |
|`colony_pioneer`              |Colony Pioneer              |02     |`crafting`, `mechanics`, `support`, `survival`                             |`ally_support`, `endurance`, `leadership`, `repair`, `survivability`, `tech`                   |
|`beast_hunter`                |Beast Hunter                |02     |`beast`, `perception`, `pursuit`, `survival`, `tracking`                   |`endurance`, `initiative`, `precision`, `ranged`, `stealth`, `targeting`                       |
|`beast_handler`               |Beast Handler               |02     |`beast`, `perception`, `survival`                                          |`beast_companion`, `persuasion`, `ride`, `support`                                             |
|`beast_rider`                 |Beast Rider                 |02     |`beast`, `mount`, `ride`, `rider`, `survival`                              |`endurance`, `initiative`, `mobility`, `movement`, `perception`                                |
|`devaronian_wanderer`         |Devaronian Wanderer         |02     |`exploration`, `mobility`, `perception`, `survival`                        |`endurance`, `mechanics`, `pilot`, `survivability`, `tech`                                     |
|`blazing_chain_raider`        |Blazing Chain Raider        |02     |`force`, `force_power`, `force_training`, `pilot`, `space`                 |`damage`, `fear`, `intimidation`, `social`, `vehicle`                                          |
|`salvager`                    |Salvager                    |02     |`equipment`, `exploration`, `mechanics`, `repair`, `tech`                  |`crafting`, `droid`, `modification`, `perception`, `survival`, `use_computer`                  |
|`scavenger_droid`             |Scavenger Droid             |02     |`droid`, `jury_rig`, `mechanics`, `repair`, `survivability`, `tech`        |`crafting`, `equipment`, `modification`, `perception`, `survival`, `use_computer`              |
|`jawa_sandcrawler_salvager`   |Jawa Sandcrawler Salvager   |02     |`equipment`, `jury_rig`, `mechanics`, `repair`, `tech`                     |`crafting`, `modification`, `perception`, `survival`, `use_computer`, `vehicle`                |
|`skip_tracer`                 |Skip Tracer                 |03     |`gather_information`, `investigation`, `perception`, `pursuit`, `tracking` |`deception`, `knowledge`, `social`, `use_computer`                                             |
|`gand_findsman`               |Gand Findsman               |03     |`force`, `force_power`, `perception`, `precognition`, `tracking`           |`force_training`, `pursuit`, `survival`, `use_the_force`, `visions`                            |
|`ubese_masked_hunter`         |Ubese Masked Hunter         |03     |`perception`, `pursuit`, `ranged`, `survival`, `tracking`                  |`initiative`, `precision`, `stealth`, `targeting`, `use_computer`                              |
|`shistavanen_tracker`         |Shistavanen Tracker         |03     |`perception`, `pursuit`, `survival`, `tracking`                            |`endurance`, `initiative`, `mobility`, `stealth`                                               |
|`trianii_ranger`              |Trianii Ranger              |03     |`pilot`, `pursuit`, `tactics`, `vehicle`                                   |`initiative`, `perception`, `ranged`, `survival`                                               |
|`kiffu_guardian`              |Kiffu Guardian              |03     |`command`, `defense`, `leadership`, `perception`                           |`initiative`, `resilience`, `survival`, `will_defense`                                         |
|`defel_shadow_operative`      |Defel Shadow Operative      |03     |`concealment`, `infiltration`, `stealth`                                   |`deception`, `perception`, `precision`, `ranged`, `use_computer`                               |
|`seyugi_dervish`              |Seyugi Dervish              |03     |`dark_side`, `force`, `force_power`, `martial_arts`, `stealth`, `unarmed`  |`fear`, `force_training`, `mobility`, `precision`, `use_the_force`                             |
|`recon_scout`                 |Recon Scout                 |03     |`perception`, `recon`, `stealth`, `tactics`                                |`initiative`, `leadership`, `survival`, `teamwork`                                             |
|`polis_massan_field_medic`    |Polis Massan Field Medic    |03     |`ally_support`, `healing`, `medical`, `support`, `treat_injury`            |`endurance`, `knowledge`, `medicine`, `perception`, `recovery`, `survivability`                |
|`demolitions_specialist`      |Demolitions Specialist      |03     |`burst_damage`, `mechanics`, `setup`, `tech`, `trap`                       |`cover`, `crafting`, `equipment`, `infiltration`, `stealth`, `use_computer`                    |
|`guerrilla`                   |Guerrilla                   |03     |`ambush`, `infiltration`, `stealth`, `survival`, `tactics`                 |`deception`, `evasion`, `initiative`, `planning`, `recon`, `teamwork`                          |
|`ace_pilot`                   |Ace Pilot                   |03     |`pilot`, `pursuit`, `space`, `vehicle`                                     |`evasion`, `initiative`, `mobility`, `tactics`                                                 |
|`squadron_leader`             |Squadron Leader             |03     |`command`, `leadership`, `pilot`, `tactics`, `teamwork`                    |`ally_support`, `initiative`, `persuasion`, `space`, `support`, `vehicle`                      |
|`test_pilot`                  |Test Pilot                  |03     |`mechanics`, `pilot`, `tech`, `vehicle`                                    |`equipment`, `initiative`, `perception`, `use_computer`                                        |
|`gunship_pilot`               |Gunship Pilot               |03     |`heavy_weapon`, `pilot`, `ranged`, `tactics`, `vehicle`                    |`initiative`, `offense_ranged`, `perception`, `space`, `targeting`                             |
|`bush_pilot`                  |Bush Pilot                  |03     |`exploration`, `pilot`, `survival`, `vehicle`                              |`mechanics`, `mobility`, `perception`, `repair`, `space`                                       |
|`pilot_droid`                 |Pilot Droid                 |03     |`droid`, `pilot`, `tech`, `use_computer`, `vehicle`                        |`initiative`, `mechanics`, `modification`, `perception`                                        |
|`iktotchi_precognitive_pilot` |Iktotchi Precognitive Pilot |03     |`force`, `force_power`, `pilot`, `precognition`, `vehicle`                 |`force_training`, `initiative`, `perception`, `space`, `use_the_force`, `visions`              |
|`unknown_regions_navigator`   |Unknown Regions Navigator   |03     |`exploration`, `galactic_lore`, `pilot`, `space`, `survival`               |`knowledge`, `perception`, `vehicle`                                                           |

────────

Revision Log

REV-001 — Scavenger resources removal

The tranche-1 Scavenger record used resources as a primary tag. This is incorrect under the frozen ontology: resources means spendable game resources, not salvage, material resources, or valuable junk.

Certified correction:

• remove resources from scavenger.metadata.tags.primary;
• remove it from metadata.tags.all;
• remove it from metadata.tagProvenance.phase12b.curated.primary;
• make no other Scavenger semantic change in this revision.

This remains an explicit owner revision and is retained in the rolling history.

────────

Current Tranche — 12B-SCOUT-03

Selection is deterministic: continue Scout-first specializations in dataset order immediately after jawa_sandcrawler_salvager. This does not imply Scout ownership.

Current 20 new records:

skip_tracer, gand_findsman, ubese_masked_hunter, shistavanen_tracker, trianii_ranger, kiffu_guardian, defel_shadow_operative, seyugi_dervish, recon_scout, polis_massan_field_medic, demolitions_specialist, guerrilla, ace_pilot, squadron_leader, test_pilot, gunship_pilot, bush_pilot, pilot_droid, iktotchi_precognitive_pilot, unknown_regions_navigator

Certified Record Notes

Skip Tracer (skip_tracer)

• Identity: Information-and-records hunter who locates fugitives, debtors, missing people, or hidden targets by following social, bureaucratic, and electronic trails.
• Primary: gather_information, investigation, perception, pursuit, tracking
• Supporting: deception, knowledge, social, use_computer
• Foundation routes: scout, scoundrel
• Signature skills: gatherInformation, perception
• Signature talent trees: Bounty Hunter; Awareness
• Signature talents: Detective; Acute Senses
• Signature feats: skill_focus

Gand Findsman (gand_findsman)

• Identity: Gand tradition specialist who combines supernatural foresight with tracking and fieldcraft to locate a chosen quarry.
• Primary: force, force_power, perception, precognition, tracking
• Supporting: force_training, pursuit, survival, use_the_force, visions
• Foundation routes: scout
• Signature skills: perception, survival
• Signature talent trees: Gand Findsman; Bounty Hunter; Awareness
• Signature talents: Findsman Ceremonies; Hunter’s Mark; Acute Senses
• Signature feats: force_training, skill_focus

Ubese Masked Hunter (ubese_masked_hunter)

• Identity: Species-specific bounty-hunter expression built around patient pursuit, ranged lethality, survival, and masked/stealthy field operations.
• Primary: perception, pursuit, ranged, survival, tracking
• Supporting: initiative, precision, stealth, targeting, use_computer
• Foundation routes: scout, soldier
• Signature skills: perception, survival
• Signature talent trees: Bounty Hunter; Awareness
• Signature talents: Nowhere to Hide; Acute Senses
• Signature feats: skill_focus, point_blank_shot

Shistavanen Tracker (shistavanen_tracker)

• Identity: Species-specific tracker whose identity is relentless wilderness pursuit supported by exceptional senses, stealth, and endurance.
• Primary: perception, pursuit, survival, tracking
• Supporting: endurance, initiative, mobility, stealth
• Foundation routes: scout
• Signature skills: survival, perception
• Signature talent trees: Bounty Hunter; Awareness
• Signature talents: Nowhere to Hide; Acute Senses
• Signature feats: skill_focus

Trianii Ranger (trianii_ranger)

• Identity: Trianii patrol-warrior expression centered on protecting Trianii space through piloting, pursuit, small-unit tactics, and hard field competence.
• Primary: pilot, pursuit, tactics, vehicle
• Supporting: initiative, perception, ranged, survival
• Foundation routes: scout, soldier
• Signature skills: perception, survival
• Signature talent trees: Enforcement; Awareness
• Signature talents: Cover Bracing; Acute Senses
• Signature feats: skill_focus

Kiffu Guardian (kiffu_guardian)

• Identity: Kiffar/Kiffu guardian tradition expression centered on respected protective authority, vigilance, command presence, and personal resilience.
• Primary: command, defense, leadership, perception
• Supporting: initiative, resilience, survival, will_defense
• Foundation routes: scout, soldier
• Signature skills: perception
• Signature talent trees: Enforcement
• Signature talents: Respected Officer
• Signature feats: skill_focus, unwavering_resolve

Defel Shadow Operative (defel_shadow_operative)

• Identity: Defel covert operative who weaponizes natural concealment for infiltration, stealth, observation, and precise attacks from obscurity.
• Primary: concealment, infiltration, stealth
• Supporting: deception, perception, precision, ranged, use_computer
• Foundation routes: scout, scoundrel
• Signature skills: stealth
• Signature talent trees: Spy; Infiltration
• Signature talents: Blend In; Concealed Weapon Expert
• Signature feats: advantageous_cover, point_blank_shot

Seyugi Dervish (seyugi_dervish)

• Identity: Force-sensitive assassin trained for quiet, rapid kills through stealth, unarmed/martial combat, dark-side Force use, mobility, and fear.
• Primary: dark_side, force, force_power, martial_arts, stealth, unarmed
• Supporting: fear, force_training, mobility, precision, use_the_force
• Foundation routes: scout, scoundrel
• Signature skills: stealth, useTheForce
• Signature talent trees: Seyugi Dervish; Assassin
• Signature talents: Seyugi Cyclone
• Signature feats: force_training, skill_focus, advantageous_cover

Recon Scout (recon_scout)

• Identity: Military reconnaissance specialist who moves ahead of the main body to observe, infiltrate, report, and guide small-unit tactical action.
• Primary: perception, recon, stealth, tactics
• Supporting: initiative, leadership, survival, teamwork
• Foundation routes: scout, soldier
• Signature skills: stealth, perception
• Signature talent trees: Reconnaissance; Camouflage; Commando
• Signature talents: Reconnaissance Team Leader; Ghost Assailant; Tough as Nails
• Signature feats: skill_focus

Polis Massan Field Medic (polis_massan_field_medic)

• Identity: Species-specific battlefield medic focused on keeping allies alive under field conditions through treatment, recovery, and calm support.
• Primary: ally_support, healing, medical, support, treat_injury
• Supporting: endurance, knowledge, medicine, perception, recovery, survivability
• Foundation routes: scout, noble
• Signature skills: treatInjury, perception
• Signature talent trees: Advanced Medicine; Survivor
• Signature talents: Extra First Aid; Sprint
• Signature feats: surgical_expertise

Demolitions Specialist (demolitions_specialist)

• Identity: Sabotage specialist who prepares, places, bypasses, or defeats explosive and technical hazards through Mechanics and deliberate setup.
• Primary: burst_damage, mechanics, setup, tech, trap
• Supporting: cover, crafting, equipment, infiltration, stealth, use_computer
• Foundation routes: scout, soldier
• Signature skills: mechanics, stealth
• Signature talent trees: Sabotage; Military Engineer; Slicer
• Signature talents: Device Jammer; Tech Savant; Trace
• Signature feats: skill_focus, flash_and_clear

Guerrilla (guerrilla)

• Identity: Irregular fighter who relies on concealment, ambush, infiltration, local survival knowledge, planning, and hit-and-fade tactics against stronger forces.
• Primary: ambush, infiltration, stealth, survival, tactics
• Supporting: deception, evasion, initiative, planning, recon, teamwork
• Foundation routes: scout, soldier, scoundrel
• Signature skills: stealth, survival
• Signature talent trees: Revolutionary; Reconnaissance; Outlaw
• Signature talents: Revolutionary Rhetoric; Reconnaissance Team Leader; Preternatural Senses
• Signature feats: skill_focus

Ace Pilot (ace_pilot)

• Identity: Elite vehicle/starfighter operator defined by superior pursuit, evasion, maneuver, and combat piloting in space.
• Primary: pilot, pursuit, space, vehicle
• Supporting: evasion, initiative, mobility, tactics
• Foundation routes: scout, scoundrel
• Signature skills: pilot
• Signature talent trees: Expert Pilot; Wingman; Spacer
• Signature talents: Relentless Pursuit; Lose Pursuit; Starship Raider
• Signature feats: vehicular_combat

Squadron Leader (squadron_leader)

• Identity: Pilot-commander who coordinates multiple craft as a fighting unit through leadership, tactics, communication, and team maneuver.
• Primary: command, leadership, pilot, tactics, teamwork
• Supporting: ally_support, initiative, persuasion, space, support, vehicle
• Foundation routes: scout, noble, soldier
• Signature skills: pilot, persuasion
• Signature talent trees: Squadron Leader; Wingman; Expert Pilot
• Signature talents: Begin Attack Run; Escort Pilot; Vehicular Evasion
• Signature feats: vehicular_combat

Test Pilot (test_pilot)

• Identity: Technical pilot who evaluates unfamiliar, experimental, modified, or stressed vehicles by combining expert piloting with Mechanics and systems knowledge.
• Primary: mechanics, pilot, tech, vehicle
• Supporting: equipment, initiative, perception, use_computer
• Foundation routes: scout, scoundrel
• Signature skills: pilot, mechanics
• Signature talent trees: Expert Pilot; Spacer
• Signature talents: Relentless Pursuit; Starship Raider
• Signature feats: vehicular_combat

Gunship Pilot (gunship_pilot)

• Identity: Combat pilot specialized in heavily armed vehicles where piloting, gunnery, ranged fire, target selection, and tactical vehicle employment converge.
• Primary: heavy_weapon, pilot, ranged, tactics, vehicle
• Supporting: initiative, offense_ranged, perception, space, targeting
• Foundation routes: scout, soldier
• Signature skills: pilot, initiative
• Signature talent trees: Expert Pilot; Gunner; Spacer
• Signature talents: Elusive Dogfighter; Expert Gunner; Starship Raider
• Signature feats: vehicular_combat, gunnery_specialist

Bush Pilot (bush_pilot)

• Identity: Frontier pilot who reaches isolated or hazardous locations and keeps a craft functioning where navigation, terrain, survival, and repair matter as much as raw flying skill.
• Primary: exploration, pilot, survival, vehicle
• Supporting: mechanics, mobility, perception, repair, space
• Foundation routes: scout, scoundrel
• Signature skills: pilot, survival
• Signature talent trees: Expert Pilot; Survivor; Spacer
• Signature talents: Keep It Together; Evasion; Spacehound
• Signature feats: vehicular_combat

Pilot Droid (pilot_droid)

• Identity: Droid pilot identity combining vehicle operation with computer integration, technical competence, autonomous modification, and machine precision.
• Primary: droid, pilot, tech, use_computer, vehicle
• Supporting: initiative, mechanics, modification, perception
• Foundation routes: scout, scoundrel
• Signature skills: pilot, useComputer
• Signature talent trees: Expert Pilot; Autonomy; Spacer
• Signature talents: Vehicular Evasion; Modification Specialist; Starship Raider
• Signature feats: vehicular_combat

Iktotchi Precognitive Pilot (iktotchi_precognitive_pilot)

• Identity: Iktotchi pilot whose Force sensitivity and precognition directly shape vehicle handling, anticipation, perception, and spaceflight.
• Primary: force, force_power, pilot, precognition, vehicle
• Supporting: force_training, initiative, perception, space, use_the_force, visions
• Foundation routes: scout
• Signature skills: pilot, perception
• Signature talent trees: Expert Pilot; Awareness; Spacer
• Signature talents: Vehicular Evasion; Acute Senses; Spacehound
• Signature feats: force_training, skill_focus, vehicular_combat

Unknown Regions Navigator (unknown_regions_navigator)

• Identity: Deep-space navigator specialized in charting dangerous, poorly mapped regions where survival, galactic lore, piloting, and exploration overlap.
• Primary: exploration, galactic_lore, pilot, space, survival
• Supporting: knowledge, perception, vehicle
• Foundation routes: scout
• Signature skills: survival
• Signature talent trees: Hyperspace Explorer; Master Scout; Spacer
• Signature talents: Deep-Space Gambit; Starship Raider
• Signature feats: vehicular_combat

────────

Claude Execution Contract — Next Run

The companion JSON is authoritative. For this run Claude must:

1. Replace PENDING_12B_SCOUT_02_COMMIT with the successful commit returned by 12B-SCOUT-02, then verify that commit is an ancestor of the working branch.
2. Apply only the 20 IDs in currentExecution.newRecordIds.
3. For each execution record replace exactly:
  • metadata.tags.primary
  • metadata.tags.supporting
  • metadata.tags.all
  • metadata.tagProvenance
4. Do not change any of the 30 already-certified records unless a future explicit revision is added.
5. Do not change mechanics, exactRefs, routes, classes, abilities, skills, talents, feats, Force data, species, backgrounds, narrative data, scoring, BuildIntent, SuggestionScorer, Mentor, UI ranking, or the ontology.
6. Validate every supplied tag against the frozen 190-tag ontology.
7. Run the Phase 12A SSOT validator/tests and the Phase 12B overlay --check contract established in 12B-SCOUT-02.
8. Stop rather than infer if any authority mismatch occurs.

────────

Progress

• Certified in this rolling authority: 50 / 297
• Applied before 12B-SCOUT-02: 10 / 297
• Expected applied after successful 12B-SCOUT-02: 30 / 297
• New in 12B-SCOUT-03: 20
• Remaining uncurated after 12B-SCOUT-03 application: 247
• Next selection rule: continue Scout-first specializations in dataset order.
• Shadow scoring: still deferred.
