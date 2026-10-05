SWSE Archetype Semantic Curation Authority

Phase: 12B — Archetype Semantic Curation
Status: ROLLING AUTHORITY — NEXT TRANCHE READY / BASELINE PENDING
Certified: 90 / 297 archetypes
Current execution: 12B-SCOUT-SCOUNDREL-05 — 20 new records
Required baseline: 1a2cc8e65bad691ebe04db22389ca9593c8877bd
Runtime target: data/archetypes.json
Frozen ontology: data/audits/talent-feat-phase3-final-ontology.json — 190 tags

> Replace the pending baseline with the successful 12B-SCOUT-04 commit before execution. Do not infer or substitute a SHA.

Selection transition

Scout-first has only three records remaining after force_pilgrim. This tranche therefore closes Scout-first with those three records, then continues deterministically into the first 17 Scoundrel-first records in dataset order. This changes the selection bucket, not semantic ownership.

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

|ID                             |Archetype                    |Tranche|Primary                                                                    |Supporting                                                                                     |
|-------------------------------|-----------------------------|------:|---------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
|`fringer`                      |Fringer                      |01     |`exploration`, `perception`, `survivability`, `survival`                   |`endurance`, `mechanics`, `mobility`, `pilot`, `repair`, `resilience`, `tech`                  |
|`scavenger`                    |Scavenger                    |01     |`equipment`, `mechanics`, `tech`                                           |`crafting`, `modification`, `perception`, `repair`, `survivability`, `survival`, `use_computer`|
|`bounty_hunter`                |Bounty Hunter                |01     |`investigation`, `perception`, `pursuit`, `survival`, `tracking`           |`gather_information`, `initiative`, `precision`, `ranged`, `social`, `stealth`, `targeting`    |
|`sector_ranger`                |Sector Ranger                |01     |`investigation`, `perception`, `pursuit`, `survival`, `tracking`           |`control`, `initiative`, `knowledge`, `pilot`, `ranged`                                        |
|`frontier_marshal`             |Frontier Marshal             |01     |`ally_support`, `leadership`, `perception`, `persuasion`, `support`        |`control`, `gather_information`, `initiative`, `social`, `survival`, `tactics`, `teamwork`     |
|`force_hunter`                 |Force Hunter                 |01     |`anti-force`, `perception`, `pursuit`, `survival`, `tracking`              |`force`, `force_power`, `precision`, `ranged`, `resilience`, `stealth`, `targeting`            |
|`sniper`                       |Sniper                       |01     |`precision`, `ranged`, `setup`, `sniper`, `targeting`                      |`ambush`, `concealment`, `control`, `initiative`, `perception`, `stealth`                      |
|`saboteur`                     |Saboteur                     |01     |`infiltration`, `mechanics`, `stealth`, `tech`, `trap`                     |`burst_damage`, `cover`, `crafting`, `equipment`, `setup`, `use_computer`                      |
|`partisan`                     |Partisan                     |01     |`ambush`, `infiltration`, `stealth`, `survival`, `tactics`                 |`deception`, `evasion`, `initiative`, `perception`, `social`                                   |
|`pilot`                        |Pilot                        |01     |`pilot`, `pursuit`, `space`, `vehicle`                                     |`initiative`, `mechanics`, `mobility`, `perception`, `tactics`, `teamwork`                     |
|`astrogator`                   |Astrogator                   |02     |`exploration`, `pilot`, `space`, `use_computer`                            |`knowledge`, `perception`, `vehicle`                                                           |
|`racer`                        |Racer                        |02     |`initiative`, `pilot`, `pursuit`, `vehicle`                                |`mobility`, `movement`, `perception`, `space`                                                  |
|`disaster_responder`           |Disaster Responder           |02     |`ally_support`, `recovery`, `support`, `survivability`, `treat_injury`     |`endurance`, `healing`, `mechanics`, `medical`, `perception`, `repair`, `survival`             |
|`explorer`                     |Explorer                     |02     |`exploration`, `perception`, `survival`                                    |`endurance`, `knowledge`, `mobility`, `pilot`, `space`, `vehicle`                              |
|`pathfinder`                   |Pathfinder                   |02     |`exploration`, `mobility`, `perception`, `survival`                        |`endurance`, `evasion`, `stealth`, `support`, `survivability`                                  |
|`survivalist`                  |Survivalist                  |02     |`endurance`, `resilience`, `survivability`, `survival`                     |`climb`, `mobility`, `perception`, `recovery`, `swim`                                          |
|`search_and_rescue_specialist` |Search-and-Rescue Specialist |02     |`ally_support`, `perception`, `recovery`, `support`, `survival`, `tracking`|`endurance`, `healing`, `medical`, `pilot`, `survivability`, `treat_injury`                    |
|`first_contact_specialist`     |First-Contact Specialist     |02     |`exploration`, `knowledge`, `persuasion`, `social`                         |`gather_information`, `perception`, `support`                                                  |
|`galactic_archaeologist`       |Galactic Archaeologist       |02     |`exploration`, `investigation`, `knowledge`, `perception`                  |`survival`, `use_computer`                                                                     |
|`prospector`                   |Prospector                   |02     |`exploration`, `perception`, `survival`                                    |`endurance`, `knowledge`, `mechanics`, `mobility`                                              |
|`naturalist`                   |Naturalist                   |02     |`exploration`, `knowledge`, `perception`, `survival`                       |`beast`, `treat_injury`                                                                        |
|`colony_pioneer`               |Colony Pioneer               |02     |`crafting`, `mechanics`, `support`, `survival`                             |`ally_support`, `endurance`, `leadership`, `repair`, `survivability`, `tech`                   |
|`beast_hunter`                 |Beast Hunter                 |02     |`beast`, `perception`, `pursuit`, `survival`, `tracking`                   |`endurance`, `initiative`, `precision`, `ranged`, `stealth`, `targeting`                       |
|`beast_handler`                |Beast Handler                |02     |`beast`, `perception`, `survival`                                          |`beast_companion`, `persuasion`, `ride`, `support`                                             |
|`beast_rider`                  |Beast Rider                  |02     |`beast`, `mount`, `ride`, `rider`, `survival`                              |`endurance`, `initiative`, `mobility`, `movement`, `perception`                                |
|`devaronian_wanderer`          |Devaronian Wanderer          |02     |`exploration`, `mobility`, `perception`, `survival`                        |`endurance`, `mechanics`, `pilot`, `survivability`, `tech`                                     |
|`blazing_chain_raider`         |Blazing Chain Raider         |02     |`force`, `force_power`, `force_training`, `pilot`, `space`                 |`damage`, `fear`, `intimidation`, `social`, `vehicle`                                          |
|`salvager`                     |Salvager                     |02     |`equipment`, `exploration`, `mechanics`, `repair`, `tech`                  |`crafting`, `droid`, `modification`, `perception`, `survival`, `use_computer`                  |
|`scavenger_droid`              |Scavenger Droid              |02     |`droid`, `jury_rig`, `mechanics`, `repair`, `survivability`, `tech`        |`crafting`, `equipment`, `modification`, `perception`, `survival`, `use_computer`              |
|`jawa_sandcrawler_salvager`    |Jawa Sandcrawler Salvager    |02     |`equipment`, `jury_rig`, `mechanics`, `repair`, `tech`                     |`crafting`, `modification`, `perception`, `survival`, `use_computer`, `vehicle`                |
|`skip_tracer`                  |Skip Tracer                  |03     |`gather_information`, `investigation`, `perception`, `pursuit`, `tracking` |`deception`, `knowledge`, `social`, `use_computer`                                             |
|`gand_findsman`                |Gand Findsman                |03     |`force`, `force_power`, `perception`, `precognition`, `tracking`           |`force_training`, `pursuit`, `survival`, `use_the_force`, `visions`                            |
|`ubese_masked_hunter`          |Ubese Masked Hunter          |03     |`perception`, `pursuit`, `ranged`, `survival`, `tracking`                  |`initiative`, `precision`, `stealth`, `targeting`, `use_computer`                              |
|`shistavanen_tracker`          |Shistavanen Tracker          |03     |`perception`, `pursuit`, `survival`, `tracking`                            |`endurance`, `initiative`, `mobility`, `stealth`                                               |
|`trianii_ranger`               |Trianii Ranger               |03     |`pilot`, `pursuit`, `tactics`, `vehicle`                                   |`initiative`, `perception`, `ranged`, `survival`                                               |
|`kiffu_guardian`               |Kiffu Guardian               |03     |`command`, `defense`, `leadership`, `perception`                           |`initiative`, `resilience`, `survival`, `will_defense`                                         |
|`defel_shadow_operative`       |Defel Shadow Operative       |03     |`concealment`, `infiltration`, `stealth`                                   |`deception`, `perception`, `precision`, `ranged`, `use_computer`                               |
|`seyugi_dervish`               |Seyugi Dervish               |03     |`dark_side`, `force`, `force_power`, `martial_arts`, `stealth`, `unarmed`  |`fear`, `force_training`, `mobility`, `precision`, `use_the_force`                             |
|`recon_scout`                  |Recon Scout                  |03     |`perception`, `recon`, `stealth`, `tactics`                                |`initiative`, `leadership`, `survival`, `teamwork`                                             |
|`polis_massan_field_medic`     |Polis Massan Field Medic     |03     |`ally_support`, `healing`, `medical`, `support`, `treat_injury`            |`endurance`, `knowledge`, `medicine`, `perception`, `recovery`, `survivability`                |
|`demolitions_specialist`       |Demolitions Specialist       |03     |`burst_damage`, `mechanics`, `setup`, `tech`, `trap`                       |`cover`, `crafting`, `equipment`, `infiltration`, `stealth`, `use_computer`                    |
|`guerrilla`                    |Guerrilla                    |03     |`ambush`, `infiltration`, `stealth`, `survival`, `tactics`                 |`deception`, `evasion`, `initiative`, `planning`, `recon`, `teamwork`                          |
|`ace_pilot`                    |Ace Pilot                    |03     |`pilot`, `pursuit`, `space`, `vehicle`                                     |`evasion`, `initiative`, `mobility`, `tactics`                                                 |
|`squadron_leader`              |Squadron Leader              |03     |`command`, `leadership`, `pilot`, `tactics`, `teamwork`                    |`ally_support`, `initiative`, `persuasion`, `space`, `support`, `vehicle`                      |
|`test_pilot`                   |Test Pilot                   |03     |`mechanics`, `pilot`, `tech`, `vehicle`                                    |`equipment`, `initiative`, `perception`, `use_computer`                                        |
|`gunship_pilot`                |Gunship Pilot                |03     |`heavy_weapon`, `pilot`, `ranged`, `tactics`, `vehicle`                    |`initiative`, `offense_ranged`, `perception`, `space`, `targeting`                             |
|`bush_pilot`                   |Bush Pilot                   |03     |`exploration`, `pilot`, `survival`, `vehicle`                              |`mechanics`, `mobility`, `perception`, `repair`, `space`                                       |
|`pilot_droid`                  |Pilot Droid                  |03     |`droid`, `pilot`, `tech`, `use_computer`, `vehicle`                        |`initiative`, `mechanics`, `modification`, `perception`                                        |
|`iktotchi_precognitive_pilot`  |Iktotchi Precognitive Pilot  |03     |`force`, `force_power`, `pilot`, `precognition`, `vehicle`                 |`force_training`, `initiative`, `perception`, `space`, `use_the_force`, `visions`              |
|`unknown_regions_navigator`    |Unknown Regions Navigator    |03     |`exploration`, `galactic_lore`, `pilot`, `space`, `survival`               |`knowledge`, `perception`, `vehicle`                                                           |
|`chiss_sky_walker`             |Chiss Sky-walker             |04     |`force`, `force_power`, `precognition`, `space`, `use_the_force`, `visions`|`exploration`, `force_training`, `galactic_lore`, `perception`, `pilot`                        |
|`givin_astrogator`             |Givin Astrogator             |04     |`knowledge`, `science`, `space`, `use_computer`                            |`exploration`, `galactic_lore`, `perception`, `pilot`                                          |
|`duros_hyperspace_trailblazer` |Duros Hyperspace Trailblazer |04     |`exploration`, `pilot`, `space`, `use_computer`                            |`galactic_lore`, `perception`, `pursuit`, `survival`, `vehicle`                                |
|`sullustan_rebel_navigator`    |Sullustan Rebel Navigator    |04     |`pilot`, `space`, `tactics`, `use_computer`                                |`galactic_lore`, `perception`, `teamwork`, `vehicle`                                           |
|`hotshot_racer`                |Hotshot Racer                |04     |`initiative`, `pilot`, `pursuit`, `vehicle`                                |`deception`, `mobility`, `movement`, `perception`                                              |
|`swoop_racer`                  |Swoop Racer                  |04     |`initiative`, `movement`, `pilot`, `pursuit`, `vehicle`                    |`endurance`, `mobility`, `perception`                                                          |
|`verpine_hive_engineer`        |Verpine Hive Engineer        |04     |`crafting`, `mechanics`, `modification`, `repair`, `tech`                  |`knowledge`, `science`, `teamwork`, `use_computer`                                             |
|`sluissi_shipwright`           |Sluissi Shipwright           |04     |`crafting`, `mechanics`, `modification`, `repair`, `space`, `tech`         |`knowledge`, `pilot`, `use_computer`, `vehicle`                                                |
|`deep_space_surveyor`          |Deep Space Surveyor          |04     |`exploration`, `perception`, `science`, `space`                            |`knowledge`, `pilot`, `survival`, `vehicle`                                                    |
|`wilderness_guide`             |Wilderness Guide             |04     |`exploration`, `perception`, `support`, `survival`                         |`endurance`, `knowledge`, `ride`, `survivability`, `tracking`                                  |
|`antarian_ranger`              |Antarian Ranger              |04     |`ally_support`, `recon`, `support`, `survival`, `teamwork`                 |`initiative`, `perception`, `stealth`, `tactics`, `tracking`                                   |
|`relic_hunter`                 |Relic Hunter                 |04     |`exploration`, `investigation`, `perception`, `pursuit`                    |`galactic_lore`, `stealth`, `survival`, `use_computer`                                         |
|`trandoshan_jagannath_hunter`  |Trandoshan Jagannath Hunter  |04     |`perception`, `pursuit`, `survival`, `tracking`                            |`climb`, `endurance`, `initiative`, `ranged`, `resilience`, `targeting`                        |
|`togruta_pack_hunter`          |Togruta Pack Hunter          |04     |`flanking`, `perception`, `survival`, `teamwork`, `tracking`               |`initiative`, `pursuit`, `ranged`, `stealth`                                                   |
|`rodian_great_hunter`          |Rodian Great Hunter          |04     |`perception`, `pursuit`, `survival`, `tracking`                            |`initiative`, `ranged`, `stealth`, `targeting`                                                 |
|`barabel_great_hunter`         |Barabel Great Hunter         |04     |`perception`, `pursuit`, `resilience`, `survival`, `tracking`              |`climb`, `endurance`, `initiative`, `ranged`                                                   |
|`tusken_bantha_rider`          |Tusken Bantha Rider          |04     |`beast`, `mount`, `ride`, `rider`, `survival`                              |`endurance`, `initiative`, `perception`, `resilience`                                          |
|`gungan_kaadu_cavalier`        |Gungan Kaadu Cavalier        |04     |`beast`, `mount`, `ride`, `rider`                                          |`initiative`, `mobility`, `movement`, `perception`, `survival`                                 |
|`aing_tii_monk`                |Aing-Tii Monk                |04     |`force`, `force_power`, `mobility`, `space`, `use_the_force`               |`exploration`, `force_training`, `telekinesis`, `visions`, `will_defense`                      |
|`force_pilgrim`                |Force Pilgrim                |04     |`exploration`, `force`, `force_power`, `survival`, `use_the_force`         |`force_training`, `galactic_lore`, `perception`, `resilience`, `visions`                       |
|`force_hermit`                 |Force Hermit                 |05     |`force`, `force_power`, `resilience`, `survival`, `use_the_force`          |`endurance`, `force_training`, `galactic_lore`, `meditation`, `perception`                     |
|`warden_of_the_sky`            |Warden of the Sky            |05     |`force`, `force_power`, `pilot`, `space`, `unarmed`                        |`force_training`, `martial_arts`, `mobility`, `stealth`, `survival`, `use_the_force`           |
|`nightsister`                  |Nightsister                  |05     |`dark_side`, `force`, `force_power`, `spellcasting`, `use_the_force`       |`beast`, `fear`, `force_training`, `stealth`, `survival`                                       |
|`smuggler`                     |Smuggler                     |05     |`deception`, `pilot`, `social`, `space`                                    |`gather_information`, `mechanics`, `persuasion`, `use_computer`, `vehicle`                     |
|`free_trader`                  |Free Trader                  |05     |`knowledge`, `persuasion`, `social`                                        |`deception`, `gather_information`, `pilot`, `use_computer`, `vehicle`                          |
|`pirate`                       |Pirate                       |05     |`intimidation`, `pilot`, `pursuit`, `space`                                |`deception`, `fear`, `initiative`, `ranged`, `social`, `vehicle`                               |
|`gambler`                      |Gambler                      |05     |`deception`, `perception`, `social`                                        |`gather_information`, `persuasion`, `reliability`, `reroll`                                    |
|`con_artist`                   |Con Artist                   |05     |`deception`, `manipulation`, `persuasion`, `social`                        |`gather_information`, `intrigue`, `knowledge`, `perception`                                    |
|`fixer`                        |Fixer                        |05     |`gather_information`, `intrigue`, `persuasion`, `social_network`           |`deception`, `knowledge`, `social`, `use_computer`                                             |
|`information_broker`           |Information Broker           |05     |`gather_information`, `intrigue`, `social_network`, `use_computer`         |`deception`, `knowledge`, `perception`, `social`, `tech`                                       |
|`gunslinger`                   |Gunslinger                   |05     |`initiative`, `pistol`, `precision`, `ranged`                              |`damage`, `mobility`, `perception`, `targeting`                                                |
|`courier`                      |Courier                      |05     |`mobility`, `movement`, `pilot`, `vehicle`                                 |`initiative`, `perception`, `space`, `survival`, `use_computer`                                |
|`spy`                          |Spy                          |05     |`deception`, `infiltration`, `stealth`                                     |`concealment`, `gather_information`, `perception`, `persuasion`, `social`, `use_computer`      |
|`slicer`                       |Slicer                       |05     |`slicing`, `tech`, `use_computer`                                          |`knowledge`, `mechanics`, `perception`                                                         |
|`assassin`                     |Assassin                     |05     |`ambush`, `infiltration`, `precision`, `stealth`, `targeting`              |`concealment`, `deception`, `initiative`, `perception`, `ranged`                               |
|`mechanic`                     |Mechanic                     |05     |`mechanics`, `repair`, `tech`                                              |`crafting`, `droid`, `equipment`, `jury_rig`, `modification`, `use_computer`                   |
|`outlaw_tech`                  |Outlaw Tech                  |05     |`jury_rig`, `mechanics`, `modification`, `tech`, `use_computer`            |`crafting`, `deception`, `equipment`, `repair`, `slicing`                                      |
|`droidsmith`                   |Droidsmith                   |05     |`crafting`, `droid`, `mechanics`, `modification`, `repair`, `tech`         |`equipment`, `use_computer`                                                                    |
|`inventor`                     |Inventor                     |05     |`crafting`, `equipment`, `mechanics`, `modification`, `tech`               |`knowledge`, `science`, `use_computer`                                                         |
|`electronic_warfare_specialist`|Electronic Warfare Specialist|05     |`control`, `sensors`, `slicing`, `tech`, `use_computer`                    |`initiative`, `mechanics`, `perception`, `support`                                             |

Revision Log

REV-001 — Scavenger resources removal

Retained exactly from the rolling authority: resources is removed from Scavenger because the ontology means spendable game resources, not salvage/material resources.

Current Tranche — 12B-SCOUT-SCOUNDREL-05

Current 20 new records:

force_hermit, warden_of_the_sky, nightsister, smuggler, free_trader, pirate, gambler, con_artist, fixer, information_broker, gunslinger, courier, spy, slicer, assassin, mechanic, outlaw_tech, droidsmith, inventor, electronic_warfare_specialist

Certified Record Notes

Force Hermit (force_hermit)

• Identity: Solitary Force mystic whose identity is self-reliant survival, inward discipline, and sustaining Force practice away from institutions or settled support.
• Primary: force, force_power, resilience, survival, use_the_force
• Supporting: endurance, force_training, galactic_lore, meditation, perception

Warden of the Sky (warden_of_the_sky)

• Identity: Independent Force guardian of the space lanes who hides among ordinary travelers, pilots and navigators while protecting spacers through Force prowess and unarmed combat.
• Primary: force, force_power, pilot, space, unarmed
• Supporting: force_training, martial_arts, mobility, stealth, survival, use_the_force

Nightsister (nightsister)

• Identity: Dathomiri dark-side witch whose identity is spell-like Force practice, dark-side power, survival, fear, and traditional mystical training.
• Primary: dark_side, force, force_power, spellcasting, use_the_force
• Supporting: beast, fear, force_training, stealth, survival

Smuggler (smuggler)

• Identity: Illicit transporter who gets people or cargo through restricted space by combining piloting, deception, contacts, and practical shipboard competence.
• Primary: deception, pilot, social, space
• Supporting: gather_information, mechanics, persuasion, use_computer, vehicle

Free Trader (free_trader)

• Identity: Independent merchant-adventurer whose identity is negotiation, commercial knowledge, social access, and flexible travel between markets.
• Primary: knowledge, persuasion, social
• Supporting: deception, gather_information, pilot, use_computer, vehicle

Pirate (pirate)

• Identity: Spaceborne raider who preys on ships and travelers through piloting, pursuit, intimidation, and armed violence.
• Primary: intimidation, pilot, pursuit, space
• Supporting: deception, fear, initiative, ranged, social, vehicle

Gambler (gambler)

• Identity: Risk-taking social operator who survives on perception, deception, nerve, and luck-driven reliability rather than direct force.
• Primary: deception, perception, social
• Supporting: gather_information, persuasion, reliability, reroll

Con Artist (con_artist)

• Identity: Professional deceiver who manipulates people through lies, persuasion, social reading, and carefully constructed false impressions.
• Primary: deception, manipulation, persuasion, social
• Supporting: gather_information, intrigue, knowledge, perception

Fixer (fixer)

• Identity: Connected intermediary who solves problems by knowing whom to contact, how to navigate institutions, and how to arrange deals or favors.
• Primary: gather_information, intrigue, persuasion, social_network
• Supporting: deception, knowledge, social, use_computer

Information Broker (information_broker)

• Identity: Dealer in valuable information who acquires, verifies, stores, and trades secrets through contacts, computer access, and social networks.
• Primary: gather_information, intrigue, social_network, use_computer
• Supporting: deception, knowledge, perception, social, tech

Gunslinger (gunslinger)

• Identity: Fast-draw ranged specialist whose identity centers on pistols, initiative, precision, and winning firearm confrontations before opponents can respond.
• Primary: initiative, pistol, precision, ranged
• Supporting: damage, mobility, perception, targeting

Courier (courier)

• Identity: Delivery specialist defined by rapid movement, route competence, piloting, and getting a person, package, or message through despite obstacles.
• Primary: mobility, movement, pilot, vehicle
• Supporting: initiative, perception, space, survival, use_computer

Spy (spy)

• Identity: Covert intelligence operative who infiltrates, deceives, observes, gathers information, and avoids detection while operating inside hostile environments.
• Primary: deception, infiltration, stealth
• Supporting: concealment, gather_information, perception, persuasion, social, use_computer

Slicer (slicer)

• Identity: Computer intrusion specialist whose identity is bypassing, manipulating, and exploiting electronic systems through Use Computer and technical expertise.
• Primary: slicing, tech, use_computer
• Supporting: knowledge, mechanics, perception

Assassin (assassin)

• Identity: Purpose-built killer who uses stealth, infiltration, ambush, and precise targeting to eliminate chosen targets efficiently.
• Primary: ambush, infiltration, precision, stealth, targeting
• Supporting: concealment, deception, initiative, perception, ranged

Mechanic (mechanic)

• Identity: General technical specialist who keeps machinery functioning through diagnosis, repair, jury-rigging, modification, and practical systems knowledge.
• Primary: mechanics, repair, tech
• Supporting: crafting, droid, equipment, jury_rig, modification, use_computer

Outlaw Tech (outlaw_tech)

• Identity: Illicit or fringe technician who modifies and improvises equipment outside normal channels, combining technical skill with jury-rigging and slicing.
• Primary: jury_rig, mechanics, modification, tech, use_computer
• Supporting: crafting, deception, equipment, repair, slicing

Droidsmith (droidsmith)

• Identity: Droid-focused technician who builds, repairs, modifies, programs, and maintains droids as a central technical specialty.
• Primary: crafting, droid, mechanics, modification, repair, tech
• Supporting: equipment, use_computer

Inventor (inventor)

• Identity: Creator of new devices and technical solutions whose identity is design, fabrication, experimentation, and equipment modification.
• Primary: crafting, equipment, mechanics, modification, tech
• Supporting: knowledge, science, use_computer

Electronic Warfare Specialist (electronic_warfare_specialist)

• Identity: Technical combat-support specialist who attacks or protects information and sensor systems through slicing, jamming, electronic control, and countermeasures.
• Primary: control, sensors, slicing, tech, use_computer
• Supporting: initiative, mechanics, perception, support

Claude Execution Contract — Next Run

1. Replace PENDING_12B_SCOUT_04_COMMIT with the successful 12B-SCOUT-04 commit and verify ancestry.
2. Apply only the 20 IDs in currentExecution.newRecordIds.
3. For each execution record replace exactly metadata.tags.primary, metadata.tags.supporting, metadata.tags.all, and metadata.tagProvenance.
4. Do not change any of the 70 previously certified records unless a future explicit revision is added.
5. Do not change mechanics, exactRefs, routes, classes, abilities, skills, talents, feats, Force data, species, backgrounds, narrative data, scoring, BuildIntent, SuggestionScorer, Mentor, UI ranking, or the ontology.
6. Validate every supplied tag against the frozen 190-tag ontology.
7. Run the Phase 12A SSOT validator/tests and Phase 12B overlay --check.
8. Stop rather than infer if any authority mismatch occurs.

Progress

• Certified: 90 / 297
• Scout-first: 73 / 73 complete
• New this tranche: 20
• Scoundrel-first newly entered: 17 / 39
• Remaining uncurated after application: 207
• Next: continue Scoundrel-first records in dataset order.
• Shadow scoring: still deferred.
