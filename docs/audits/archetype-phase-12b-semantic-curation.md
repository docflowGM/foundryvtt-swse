SWSE Archetype Semantic Curation Authority

Phase: 12B — Archetype Semantic Curation
Status: ROLLING AUTHORITY — NEXT TRANCHE READY / BASELINE PENDING
Certified: 70 / 297 archetypes
Current execution: 12B-SCOUT-04 — 20 new records
Required baseline: cb973c9a1b6f2955eb56651f878e61d46aed6cd5
Runtime target: data/archetypes.json
Frozen ontology: data/audits/talent-feat-phase3-final-ontology.json — 190 tags

> Replace the pending baseline with the successful 12B-SCOUT-03 commit before execution. Do not infer a SHA.

Curation rules

1. Narrative identity defines what the archetype is.
2. Signature exact mechanics show how that identity is expressed.
3. Supporting mechanics reinforce but do not automatically define identity.
4. Only the frozen 190-tag ontology may be used.
5. Class is a route, not ownership.
6. Parent tags do not automatically inherit to specializations.
7. Recommended feat/talent tags are evidence, not a bag of tags to copy wholesale.
8. Optional routes stay supporting unless the archetype itself requires them.

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
|`chiss_sky_walker`            |Chiss Sky-walker            |04     |`force`, `force_power`, `precognition`, `space`, `use_the_force`, `visions`|`exploration`, `force_training`, `galactic_lore`, `perception`, `pilot`                        |
|`givin_astrogator`            |Givin Astrogator            |04     |`knowledge`, `science`, `space`, `use_computer`                            |`exploration`, `galactic_lore`, `perception`, `pilot`                                          |
|`duros_hyperspace_trailblazer`|Duros Hyperspace Trailblazer|04     |`exploration`, `pilot`, `space`, `use_computer`                            |`galactic_lore`, `perception`, `pursuit`, `survival`, `vehicle`                                |
|`sullustan_rebel_navigator`   |Sullustan Rebel Navigator   |04     |`pilot`, `space`, `tactics`, `use_computer`                                |`galactic_lore`, `perception`, `teamwork`, `vehicle`                                           |
|`hotshot_racer`               |Hotshot Racer               |04     |`initiative`, `pilot`, `pursuit`, `vehicle`                                |`deception`, `mobility`, `movement`, `perception`                                              |
|`swoop_racer`                 |Swoop Racer                 |04     |`initiative`, `movement`, `pilot`, `pursuit`, `vehicle`                    |`endurance`, `mobility`, `perception`                                                          |
|`verpine_hive_engineer`       |Verpine Hive Engineer       |04     |`crafting`, `mechanics`, `modification`, `repair`, `tech`                  |`knowledge`, `science`, `teamwork`, `use_computer`                                             |
|`sluissi_shipwright`          |Sluissi Shipwright          |04     |`crafting`, `mechanics`, `modification`, `repair`, `space`, `tech`         |`knowledge`, `pilot`, `use_computer`, `vehicle`                                                |
|`deep_space_surveyor`         |Deep Space Surveyor         |04     |`exploration`, `perception`, `science`, `space`                            |`knowledge`, `pilot`, `survival`, `vehicle`                                                    |
|`wilderness_guide`            |Wilderness Guide            |04     |`exploration`, `perception`, `support`, `survival`                         |`endurance`, `knowledge`, `ride`, `survivability`, `tracking`                                  |
|`antarian_ranger`             |Antarian Ranger             |04     |`ally_support`, `recon`, `support`, `survival`, `teamwork`                 |`initiative`, `perception`, `stealth`, `tactics`, `tracking`                                   |
|`relic_hunter`                |Relic Hunter                |04     |`exploration`, `investigation`, `perception`, `pursuit`                    |`galactic_lore`, `stealth`, `survival`, `use_computer`                                         |
|`trandoshan_jagannath_hunter` |Trandoshan Jagannath Hunter |04     |`perception`, `pursuit`, `survival`, `tracking`                            |`climb`, `endurance`, `initiative`, `ranged`, `resilience`, `targeting`                        |
|`togruta_pack_hunter`         |Togruta Pack Hunter         |04     |`flanking`, `perception`, `survival`, `teamwork`, `tracking`               |`initiative`, `pursuit`, `ranged`, `stealth`                                                   |
|`rodian_great_hunter`         |Rodian Great Hunter         |04     |`perception`, `pursuit`, `survival`, `tracking`                            |`initiative`, `ranged`, `stealth`, `targeting`                                                 |
|`barabel_great_hunter`        |Barabel Great Hunter        |04     |`perception`, `pursuit`, `resilience`, `survival`, `tracking`              |`climb`, `endurance`, `initiative`, `ranged`                                                   |
|`tusken_bantha_rider`         |Tusken Bantha Rider         |04     |`beast`, `mount`, `ride`, `rider`, `survival`                              |`endurance`, `initiative`, `perception`, `resilience`                                          |
|`gungan_kaadu_cavalier`       |Gungan Kaadu Cavalier       |04     |`beast`, `mount`, `ride`, `rider`                                          |`initiative`, `mobility`, `movement`, `perception`, `survival`                                 |
|`aing_tii_monk`               |Aing-Tii Monk               |04     |`force`, `force_power`, `mobility`, `space`, `use_the_force`               |`exploration`, `force_training`, `telekinesis`, `visions`, `will_defense`                      |
|`force_pilgrim`               |Force Pilgrim               |04     |`exploration`, `force`, `force_power`, `survival`, `use_the_force`         |`force_training`, `galactic_lore`, `perception`, `resilience`, `visions`                       |

Revision Log

REV-001 — Scavenger resources removal

Retained exactly from the prior rolling authority: resources is removed from Scavenger because the ontology means spendable game resources, not salvage/material resources.

Current Tranche — 12B-SCOUT-04

Selection: the next 20 Scout-first specializations in dataset order after unknown_regions_navigator. This does not imply Scout ownership.

chiss_sky_walker, givin_astrogator, duros_hyperspace_trailblazer, sullustan_rebel_navigator, hotshot_racer, swoop_racer, verpine_hive_engineer, sluissi_shipwright, deep_space_surveyor, wilderness_guide, antarian_ranger, relic_hunter, trandoshan_jagannath_hunter, togruta_pack_hunter, rodian_great_hunter, barabel_great_hunter, tusken_bantha_rider, gungan_kaadu_cavalier, aing_tii_monk, force_pilgrim

Certified Record Notes

Chiss Sky-walker (chiss_sky_walker)

• Identity: Force-guided Chiss navigation tradition expression that uses precognitive perception and the Force to cross dangerous space rather than relying only on conventional astrogation.
• Primary: force, force_power, precognition, space, use_the_force, visions
• Supporting: exploration, force_training, galactic_lore, perception, pilot

Givin Astrogator (givin_astrogator)

• Identity: Species-specific mathematical astrogator whose identity is precise scientific calculation, stellar knowledge, and computer-assisted hyperspace navigation.
• Primary: knowledge, science, space, use_computer
• Supporting: exploration, galactic_lore, perception, pilot

Duros Hyperspace Trailblazer (duros_hyperspace_trailblazer)

• Identity: Duros explorer-pilot who opens and tests new hyperspace routes through expert astrogation, piloting, and frontier navigation.
• Primary: exploration, pilot, space, use_computer
• Supporting: galactic_lore, perception, pursuit, survival, vehicle

Sullustan Rebel Navigator (sullustan_rebel_navigator)

• Identity: Sullustan military/rebel navigator who combines astrogation and piloting with tactical route planning and coordinated fleet movement.
• Primary: pilot, space, tactics, use_computer
• Supporting: galactic_lore, perception, teamwork, vehicle

Hotshot Racer (hotshot_racer)

• Identity: Showy competitive pilot who wins through fast reactions, aggressive maneuver, pursuit, and calculated risk.
• Primary: initiative, pilot, pursuit, vehicle
• Supporting: deception, mobility, movement, perception

Swoop Racer (swoop_racer)

• Identity: High-speed repulsorlift racer whose identity is acceleration, reaction time, dangerous movement, and endurance under extreme racing conditions.
• Primary: initiative, movement, pilot, pursuit, vehicle
• Supporting: endurance, mobility, perception

Verpine Hive Engineer (verpine_hive_engineer)

• Identity: Verpine technical specialist whose identity is collaborative engineering, fabrication, modification, repair, and precise systems work.
• Primary: crafting, mechanics, modification, repair, tech
• Supporting: knowledge, science, teamwork, use_computer

Sluissi Shipwright (sluissi_shipwright)

• Identity: Species-specific starship builder and maintainer centered on construction, modification, repair, and technical mastery of spacecraft.
• Primary: crafting, mechanics, modification, repair, space, tech
• Supporting: knowledge, pilot, use_computer, vehicle

Deep Space Surveyor (deep_space_surveyor)

• Identity: Scientific explorer who maps and evaluates remote space through observation, physical science, piloting, and survival beyond established routes.
• Primary: exploration, perception, science, space
• Supporting: knowledge, pilot, survival, vehicle

Wilderness Guide (wilderness_guide)

• Identity: Field guide who gets other people safely through wild terrain by reading the environment, finding routes, tracking hazards, and supporting less-capable travelers.
• Primary: exploration, perception, support, survival
• Supporting: endurance, knowledge, ride, survivability, tracking

Antarian Ranger (antarian_ranger)

• Identity: Antarian Ranger expression centered on supporting Force-users and allies through reconnaissance, fieldcraft, teamwork, and practical protective service.
• Primary: ally_support, recon, support, survival, teamwork
• Supporting: initiative, perception, stealth, tactics, tracking

Relic Hunter (relic_hunter)

• Identity: Adventure-oriented seeker of lost artifacts who locates, investigates, and physically pursues relics through ruins and hazardous frontier sites.
• Primary: exploration, investigation, perception, pursuit
• Supporting: galactic_lore, stealth, survival, use_computer

Trandoshan Jagannath Hunter (trandoshan_jagannath_hunter)

• Identity: Trandoshan hunter pursuing worthy prey as a culturally significant hunt, emphasizing relentless tracking, field endurance, resilience, and ranged pursuit.
• Primary: perception, pursuit, survival, tracking
• Supporting: climb, endurance, initiative, ranged, resilience, targeting

Togruta Pack Hunter (togruta_pack_hunter)

• Identity: Togruta hunter whose identity is coordinated group hunting, spatial awareness, flanking, perception, and survival rather than solitary pursuit.
• Primary: flanking, perception, survival, teamwork, tracking
• Supporting: initiative, pursuit, ranged, stealth

Rodian Great Hunter (rodian_great_hunter)

• Identity: Rodian expression of the celebrated hunter ideal, centered on finding quarry, tracking it through the field, and bringing it down through practiced hunting skill.
• Primary: perception, pursuit, survival, tracking
• Supporting: initiative, ranged, stealth, targeting

Barabel Great Hunter (barabel_great_hunter)

• Identity: Barabel hunter expression defined by relentless pursuit, physical toughness, wilderness competence, and the ability to continue the hunt through hardship.
• Primary: perception, pursuit, resilience, survival, tracking
• Supporting: climb, endurance, initiative, ranged

Tusken Bantha Rider (tusken_bantha_rider)

• Identity: Tusken mounted wilderness expression centered on the bantha bond, riding, desert survival, endurance, and mounted travel.
• Primary: beast, mount, ride, rider, survival
• Supporting: endurance, initiative, perception, resilience

Gungan Kaadu Cavalier (gungan_kaadu_cavalier)

• Identity: Gungan mounted warrior/traveler centered on kaadu riding, mobile action, maneuver, and coordinated rider-mount movement.
• Primary: beast, mount, ride, rider
• Supporting: initiative, mobility, movement, perception, survival

Aing-Tii Monk (aing_tii_monk)

• Identity: Aing-Tii Force-tradition practitioner whose identity is freedom of travel and unusual manipulation of time and space through powers such as Fold Space and Phase.
• Primary: force, force_power, mobility, space, use_the_force
• Supporting: exploration, force_training, telekinesis, visions, will_defense

Force Pilgrim (force_pilgrim)

• Identity: Wandering Force mystic who travels through difficult places in pursuit of spiritual experience, lore, visions, and self-reliant understanding of the Force.
• Primary: exploration, force, force_power, survival, use_the_force
• Supporting: force_training, galactic_lore, perception, resilience, visions

Claude Execution Contract — Next Run

1. Replace the pending baseline with the successful 12B-SCOUT-03 commit and verify ancestry.
2. Apply only currentExecution.newRecordIds.
3. Replace exactly the four semantic fields: metadata.tags.primary, metadata.tags.supporting, metadata.tags.all, metadata.tagProvenance.
4. Do not change the 50 previously certified records without an explicit revision.
5. Do not change mechanics, exactRefs, routes, classes, abilities, skills, talents, feats, Force data, species, backgrounds, narrative data, scoring, BuildIntent, SuggestionScorer, Mentor, UI ranking, or ontology.
6. Validate every tag against the frozen ontology.
7. Run Phase 12A validation/tests and Phase 12B overlay --check.
8. Stop rather than infer on any mismatch.

Progress

• Certified: 70 / 297
• New this tranche: 20
• Remaining after application: 227
• Next: continue Scout-first specializations in dataset order.
• Shadow scoring: still deferred.
