SWSE Archetype Semantic Curation Authority

Phase: 12B — Archetype Semantic Curation
Status: ROLLING AUTHORITY — NEXT TRANCHE READY / BASELINE PENDING
Certified: 110 / 297 archetypes
Current execution: 12B-SCOUNDREL-06 — 20 new records
Required baseline: db1582c8ea55b7b6919c7e753ff97be22b6fb6e0
Runtime target: data/archetypes.json
Frozen ontology: data/audits/talent-feat-phase3-final-ontology.json — 190 tags

> Replace the pending baseline with the successful 12B-SCOUT-SCOUNDREL-05 commit before execution. Do not infer or substitute a SHA.

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

|ID                              |Archetype                     |Tranche|Primary                                                                        |Supporting                                                                                     |
|--------------------------------|------------------------------|------:|-------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
|`fringer`                       |Fringer                       |01     |`exploration`, `perception`, `survivability`, `survival`                       |`endurance`, `mechanics`, `mobility`, `pilot`, `repair`, `resilience`, `tech`                  |
|`scavenger`                     |Scavenger                     |01     |`equipment`, `mechanics`, `tech`                                               |`crafting`, `modification`, `perception`, `repair`, `survivability`, `survival`, `use_computer`|
|`bounty_hunter`                 |Bounty Hunter                 |01     |`investigation`, `perception`, `pursuit`, `survival`, `tracking`               |`gather_information`, `initiative`, `precision`, `ranged`, `social`, `stealth`, `targeting`    |
|`sector_ranger`                 |Sector Ranger                 |01     |`investigation`, `perception`, `pursuit`, `survival`, `tracking`               |`control`, `initiative`, `knowledge`, `pilot`, `ranged`                                        |
|`frontier_marshal`              |Frontier Marshal              |01     |`ally_support`, `leadership`, `perception`, `persuasion`, `support`            |`control`, `gather_information`, `initiative`, `social`, `survival`, `tactics`, `teamwork`     |
|`force_hunter`                  |Force Hunter                  |01     |`anti-force`, `perception`, `pursuit`, `survival`, `tracking`                  |`force`, `force_power`, `precision`, `ranged`, `resilience`, `stealth`, `targeting`            |
|`sniper`                        |Sniper                        |01     |`precision`, `ranged`, `setup`, `sniper`, `targeting`                          |`ambush`, `concealment`, `control`, `initiative`, `perception`, `stealth`                      |
|`saboteur`                      |Saboteur                      |01     |`infiltration`, `mechanics`, `stealth`, `tech`, `trap`                         |`burst_damage`, `cover`, `crafting`, `equipment`, `setup`, `use_computer`                      |
|`partisan`                      |Partisan                      |01     |`ambush`, `infiltration`, `stealth`, `survival`, `tactics`                     |`deception`, `evasion`, `initiative`, `perception`, `social`                                   |
|`pilot`                         |Pilot                         |01     |`pilot`, `pursuit`, `space`, `vehicle`                                         |`initiative`, `mechanics`, `mobility`, `perception`, `tactics`, `teamwork`                     |
|`astrogator`                    |Astrogator                    |02     |`exploration`, `pilot`, `space`, `use_computer`                                |`knowledge`, `perception`, `vehicle`                                                           |
|`racer`                         |Racer                         |02     |`initiative`, `pilot`, `pursuit`, `vehicle`                                    |`mobility`, `movement`, `perception`, `space`                                                  |
|`disaster_responder`            |Disaster Responder            |02     |`ally_support`, `recovery`, `support`, `survivability`, `treat_injury`         |`endurance`, `healing`, `mechanics`, `medical`, `perception`, `repair`, `survival`             |
|`explorer`                      |Explorer                      |02     |`exploration`, `perception`, `survival`                                        |`endurance`, `knowledge`, `mobility`, `pilot`, `space`, `vehicle`                              |
|`pathfinder`                    |Pathfinder                    |02     |`exploration`, `mobility`, `perception`, `survival`                            |`endurance`, `evasion`, `stealth`, `support`, `survivability`                                  |
|`survivalist`                   |Survivalist                   |02     |`endurance`, `resilience`, `survivability`, `survival`                         |`climb`, `mobility`, `perception`, `recovery`, `swim`                                          |
|`search_and_rescue_specialist`  |Search-and-Rescue Specialist  |02     |`ally_support`, `perception`, `recovery`, `support`, `survival`, `tracking`    |`endurance`, `healing`, `medical`, `pilot`, `survivability`, `treat_injury`                    |
|`first_contact_specialist`      |First-Contact Specialist      |02     |`exploration`, `knowledge`, `persuasion`, `social`                             |`gather_information`, `perception`, `support`                                                  |
|`galactic_archaeologist`        |Galactic Archaeologist        |02     |`exploration`, `investigation`, `knowledge`, `perception`                      |`survival`, `use_computer`                                                                     |
|`prospector`                    |Prospector                    |02     |`exploration`, `perception`, `survival`                                        |`endurance`, `knowledge`, `mechanics`, `mobility`                                              |
|`naturalist`                    |Naturalist                    |02     |`exploration`, `knowledge`, `perception`, `survival`                           |`beast`, `treat_injury`                                                                        |
|`colony_pioneer`                |Colony Pioneer                |02     |`crafting`, `mechanics`, `support`, `survival`                                 |`ally_support`, `endurance`, `leadership`, `repair`, `survivability`, `tech`                   |
|`beast_hunter`                  |Beast Hunter                  |02     |`beast`, `perception`, `pursuit`, `survival`, `tracking`                       |`endurance`, `initiative`, `precision`, `ranged`, `stealth`, `targeting`                       |
|`beast_handler`                 |Beast Handler                 |02     |`beast`, `perception`, `survival`                                              |`beast_companion`, `persuasion`, `ride`, `support`                                             |
|`beast_rider`                   |Beast Rider                   |02     |`beast`, `mount`, `ride`, `rider`, `survival`                                  |`endurance`, `initiative`, `mobility`, `movement`, `perception`                                |
|`devaronian_wanderer`           |Devaronian Wanderer           |02     |`exploration`, `mobility`, `perception`, `survival`                            |`endurance`, `mechanics`, `pilot`, `survivability`, `tech`                                     |
|`blazing_chain_raider`          |Blazing Chain Raider          |02     |`force`, `force_power`, `force_training`, `pilot`, `space`                     |`damage`, `fear`, `intimidation`, `social`, `vehicle`                                          |
|`salvager`                      |Salvager                      |02     |`equipment`, `exploration`, `mechanics`, `repair`, `tech`                      |`crafting`, `droid`, `modification`, `perception`, `survival`, `use_computer`                  |
|`scavenger_droid`               |Scavenger Droid               |02     |`droid`, `jury_rig`, `mechanics`, `repair`, `survivability`, `tech`            |`crafting`, `equipment`, `modification`, `perception`, `survival`, `use_computer`              |
|`jawa_sandcrawler_salvager`     |Jawa Sandcrawler Salvager     |02     |`equipment`, `jury_rig`, `mechanics`, `repair`, `tech`                         |`crafting`, `modification`, `perception`, `survival`, `use_computer`, `vehicle`                |
|`skip_tracer`                   |Skip Tracer                   |03     |`gather_information`, `investigation`, `perception`, `pursuit`, `tracking`     |`deception`, `knowledge`, `social`, `use_computer`                                             |
|`gand_findsman`                 |Gand Findsman                 |03     |`force`, `force_power`, `perception`, `precognition`, `tracking`               |`force_training`, `pursuit`, `survival`, `use_the_force`, `visions`                            |
|`ubese_masked_hunter`           |Ubese Masked Hunter           |03     |`perception`, `pursuit`, `ranged`, `survival`, `tracking`                      |`initiative`, `precision`, `stealth`, `targeting`, `use_computer`                              |
|`shistavanen_tracker`           |Shistavanen Tracker           |03     |`perception`, `pursuit`, `survival`, `tracking`                                |`endurance`, `initiative`, `mobility`, `stealth`                                               |
|`trianii_ranger`                |Trianii Ranger                |03     |`pilot`, `pursuit`, `tactics`, `vehicle`                                       |`initiative`, `perception`, `ranged`, `survival`                                               |
|`kiffu_guardian`                |Kiffu Guardian                |03     |`command`, `defense`, `leadership`, `perception`                               |`initiative`, `resilience`, `survival`, `will_defense`                                         |
|`defel_shadow_operative`        |Defel Shadow Operative        |03     |`concealment`, `infiltration`, `stealth`                                       |`deception`, `perception`, `precision`, `ranged`, `use_computer`                               |
|`seyugi_dervish`                |Seyugi Dervish                |03     |`dark_side`, `force`, `force_power`, `martial_arts`, `stealth`, `unarmed`      |`fear`, `force_training`, `mobility`, `precision`, `use_the_force`                             |
|`recon_scout`                   |Recon Scout                   |03     |`perception`, `recon`, `stealth`, `tactics`                                    |`initiative`, `leadership`, `survival`, `teamwork`                                             |
|`polis_massan_field_medic`      |Polis Massan Field Medic      |03     |`ally_support`, `healing`, `medical`, `support`, `treat_injury`                |`endurance`, `knowledge`, `medicine`, `perception`, `recovery`, `survivability`                |
|`demolitions_specialist`        |Demolitions Specialist        |03     |`burst_damage`, `mechanics`, `setup`, `tech`, `trap`                           |`cover`, `crafting`, `equipment`, `infiltration`, `stealth`, `use_computer`                    |
|`guerrilla`                     |Guerrilla                     |03     |`ambush`, `infiltration`, `stealth`, `survival`, `tactics`                     |`deception`, `evasion`, `initiative`, `planning`, `recon`, `teamwork`                          |
|`ace_pilot`                     |Ace Pilot                     |03     |`pilot`, `pursuit`, `space`, `vehicle`                                         |`evasion`, `initiative`, `mobility`, `tactics`                                                 |
|`squadron_leader`               |Squadron Leader               |03     |`command`, `leadership`, `pilot`, `tactics`, `teamwork`                        |`ally_support`, `initiative`, `persuasion`, `space`, `support`, `vehicle`                      |
|`test_pilot`                    |Test Pilot                    |03     |`mechanics`, `pilot`, `tech`, `vehicle`                                        |`equipment`, `initiative`, `perception`, `use_computer`                                        |
|`gunship_pilot`                 |Gunship Pilot                 |03     |`heavy_weapon`, `pilot`, `ranged`, `tactics`, `vehicle`                        |`initiative`, `offense_ranged`, `perception`, `space`, `targeting`                             |
|`bush_pilot`                    |Bush Pilot                    |03     |`exploration`, `pilot`, `survival`, `vehicle`                                  |`mechanics`, `mobility`, `perception`, `repair`, `space`                                       |
|`pilot_droid`                   |Pilot Droid                   |03     |`droid`, `pilot`, `tech`, `use_computer`, `vehicle`                            |`initiative`, `mechanics`, `modification`, `perception`                                        |
|`iktotchi_precognitive_pilot`   |Iktotchi Precognitive Pilot   |03     |`force`, `force_power`, `pilot`, `precognition`, `vehicle`                     |`force_training`, `initiative`, `perception`, `space`, `use_the_force`, `visions`              |
|`unknown_regions_navigator`     |Unknown Regions Navigator     |03     |`exploration`, `galactic_lore`, `pilot`, `space`, `survival`                   |`knowledge`, `perception`, `vehicle`                                                           |
|`chiss_sky_walker`              |Chiss Sky-walker              |04     |`force`, `force_power`, `precognition`, `space`, `use_the_force`, `visions`    |`exploration`, `force_training`, `galactic_lore`, `perception`, `pilot`                        |
|`givin_astrogator`              |Givin Astrogator              |04     |`knowledge`, `science`, `space`, `use_computer`                                |`exploration`, `galactic_lore`, `perception`, `pilot`                                          |
|`duros_hyperspace_trailblazer`  |Duros Hyperspace Trailblazer  |04     |`exploration`, `pilot`, `space`, `use_computer`                                |`galactic_lore`, `perception`, `pursuit`, `survival`, `vehicle`                                |
|`sullustan_rebel_navigator`     |Sullustan Rebel Navigator     |04     |`pilot`, `space`, `tactics`, `use_computer`                                    |`galactic_lore`, `perception`, `teamwork`, `vehicle`                                           |
|`hotshot_racer`                 |Hotshot Racer                 |04     |`initiative`, `pilot`, `pursuit`, `vehicle`                                    |`deception`, `mobility`, `movement`, `perception`                                              |
|`swoop_racer`                   |Swoop Racer                   |04     |`initiative`, `movement`, `pilot`, `pursuit`, `vehicle`                        |`endurance`, `mobility`, `perception`                                                          |
|`verpine_hive_engineer`         |Verpine Hive Engineer         |04     |`crafting`, `mechanics`, `modification`, `repair`, `tech`                      |`knowledge`, `science`, `teamwork`, `use_computer`                                             |
|`sluissi_shipwright`            |Sluissi Shipwright            |04     |`crafting`, `mechanics`, `modification`, `repair`, `space`, `tech`             |`knowledge`, `pilot`, `use_computer`, `vehicle`                                                |
|`deep_space_surveyor`           |Deep Space Surveyor           |04     |`exploration`, `perception`, `science`, `space`                                |`knowledge`, `pilot`, `survival`, `vehicle`                                                    |
|`wilderness_guide`              |Wilderness Guide              |04     |`exploration`, `perception`, `support`, `survival`                             |`endurance`, `knowledge`, `ride`, `survivability`, `tracking`                                  |
|`antarian_ranger`               |Antarian Ranger               |04     |`ally_support`, `recon`, `support`, `survival`, `teamwork`                     |`initiative`, `perception`, `stealth`, `tactics`, `tracking`                                   |
|`relic_hunter`                  |Relic Hunter                  |04     |`exploration`, `investigation`, `perception`, `pursuit`                        |`galactic_lore`, `stealth`, `survival`, `use_computer`                                         |
|`trandoshan_jagannath_hunter`   |Trandoshan Jagannath Hunter   |04     |`perception`, `pursuit`, `survival`, `tracking`                                |`climb`, `endurance`, `initiative`, `ranged`, `resilience`, `targeting`                        |
|`togruta_pack_hunter`           |Togruta Pack Hunter           |04     |`flanking`, `perception`, `survival`, `teamwork`, `tracking`                   |`initiative`, `pursuit`, `ranged`, `stealth`                                                   |
|`rodian_great_hunter`           |Rodian Great Hunter           |04     |`perception`, `pursuit`, `survival`, `tracking`                                |`initiative`, `ranged`, `stealth`, `targeting`                                                 |
|`barabel_great_hunter`          |Barabel Great Hunter          |04     |`perception`, `pursuit`, `resilience`, `survival`, `tracking`                  |`climb`, `endurance`, `initiative`, `ranged`                                                   |
|`tusken_bantha_rider`           |Tusken Bantha Rider           |04     |`beast`, `mount`, `ride`, `rider`, `survival`                                  |`endurance`, `initiative`, `perception`, `resilience`                                          |
|`gungan_kaadu_cavalier`         |Gungan Kaadu Cavalier         |04     |`beast`, `mount`, `ride`, `rider`                                              |`initiative`, `mobility`, `movement`, `perception`, `survival`                                 |
|`aing_tii_monk`                 |Aing-Tii Monk                 |04     |`force`, `force_power`, `mobility`, `space`, `use_the_force`                   |`exploration`, `force_training`, `telekinesis`, `visions`, `will_defense`                      |
|`force_pilgrim`                 |Force Pilgrim                 |04     |`exploration`, `force`, `force_power`, `survival`, `use_the_force`             |`force_training`, `galactic_lore`, `perception`, `resilience`, `visions`                       |
|`force_hermit`                  |Force Hermit                  |05     |`force`, `force_power`, `resilience`, `survival`, `use_the_force`              |`endurance`, `force_training`, `galactic_lore`, `meditation`, `perception`                     |
|`warden_of_the_sky`             |Warden of the Sky             |05     |`force`, `force_power`, `pilot`, `space`, `unarmed`                            |`force_training`, `martial_arts`, `mobility`, `stealth`, `survival`, `use_the_force`           |
|`nightsister`                   |Nightsister                   |05     |`dark_side`, `force`, `force_power`, `spellcasting`, `use_the_force`           |`beast`, `fear`, `force_training`, `stealth`, `survival`                                       |
|`smuggler`                      |Smuggler                      |05     |`deception`, `pilot`, `social`, `space`                                        |`gather_information`, `mechanics`, `persuasion`, `use_computer`, `vehicle`                     |
|`free_trader`                   |Free Trader                   |05     |`knowledge`, `persuasion`, `social`                                            |`deception`, `gather_information`, `pilot`, `use_computer`, `vehicle`                          |
|`pirate`                        |Pirate                        |05     |`intimidation`, `pilot`, `pursuit`, `space`                                    |`deception`, `fear`, `initiative`, `ranged`, `social`, `vehicle`                               |
|`gambler`                       |Gambler                       |05     |`deception`, `perception`, `social`                                            |`gather_information`, `persuasion`, `reliability`, `reroll`                                    |
|`con_artist`                    |Con Artist                    |05     |`deception`, `manipulation`, `persuasion`, `social`                            |`gather_information`, `intrigue`, `knowledge`, `perception`                                    |
|`fixer`                         |Fixer                         |05     |`gather_information`, `intrigue`, `persuasion`, `social_network`               |`deception`, `knowledge`, `social`, `use_computer`                                             |
|`information_broker`            |Information Broker            |05     |`gather_information`, `intrigue`, `social_network`, `use_computer`             |`deception`, `knowledge`, `perception`, `social`, `tech`                                       |
|`gunslinger`                    |Gunslinger                    |05     |`initiative`, `pistol`, `precision`, `ranged`                                  |`damage`, `mobility`, `perception`, `targeting`                                                |
|`courier`                       |Courier                       |05     |`mobility`, `movement`, `pilot`, `vehicle`                                     |`initiative`, `perception`, `space`, `survival`, `use_computer`                                |
|`spy`                           |Spy                           |05     |`deception`, `infiltration`, `stealth`                                         |`concealment`, `gather_information`, `perception`, `persuasion`, `social`, `use_computer`      |
|`slicer`                        |Slicer                        |05     |`slicing`, `tech`, `use_computer`                                              |`knowledge`, `mechanics`, `perception`                                                         |
|`assassin`                      |Assassin                      |05     |`ambush`, `infiltration`, `precision`, `stealth`, `targeting`                  |`concealment`, `deception`, `initiative`, `perception`, `ranged`                               |
|`mechanic`                      |Mechanic                      |05     |`mechanics`, `repair`, `tech`                                                  |`crafting`, `droid`, `equipment`, `jury_rig`, `modification`, `use_computer`                   |
|`outlaw_tech`                   |Outlaw Tech                   |05     |`jury_rig`, `mechanics`, `modification`, `tech`, `use_computer`                |`crafting`, `deception`, `equipment`, `repair`, `slicing`                                      |
|`droidsmith`                    |Droidsmith                    |05     |`crafting`, `droid`, `mechanics`, `modification`, `repair`, `tech`             |`equipment`, `use_computer`                                                                    |
|`inventor`                      |Inventor                      |05     |`crafting`, `equipment`, `mechanics`, `modification`, `tech`                   |`knowledge`, `science`, `use_computer`                                                         |
|`electronic_warfare_specialist` |Electronic Warfare Specialist |05     |`control`, `sensors`, `slicing`, `tech`, `use_computer`                        |`initiative`, `mechanics`, `perception`, `support`                                             |
|`shipwright`                    |Shipwright                    |06     |`crafting`, `mechanics`, `repair`, `space`, `tech`                             |`modification`, `pilot`, `use_computer`, `vehicle`                                             |
|`entertainer`                   |Entertainer                   |06     |`persuasion`, `social`                                                         |`acrobatics`, `deception`, `gather_information`, `perception`                                  |
|`blockade_runner`               |Blockade Runner               |06     |`evasion`, `pilot`, `pursuit`, `space`, `vehicle`                              |`deception`, `initiative`, `mobility`, `use_computer`                                          |
|`jawa_droid_peddler`            |Jawa Droid Peddler            |06     |`droid`, `equipment`, `mechanics`, `persuasion`, `social`                      |`gather_information`, `modification`, `repair`, `tech`, `use_computer`                         |
|`herglic_free_trader`           |Herglic Free Trader           |06     |`knowledge`, `persuasion`, `social`                                            |`deception`, `gather_information`, `pilot`, `use_computer`, `vehicle`                          |
|`toydarian_junk_merchant`       |Toydarian Junk Merchant       |06     |`equipment`, `persuasion`, `social`                                            |`deception`, `gather_information`, `knowledge`, `tech`                                         |
|`privateer`                     |Privateer                     |06     |`pilot`, `space`, `tactics`, `vehicle`                                         |`initiative`, `leadership`, `persuasion`, `ranged`, `teamwork`                                 |
|`weequay_pirate_captain`        |Weequay Pirate Captain        |06     |`intimidation`, `leadership`, `pilot`, `space`                                 |`deception`, `fear`, `initiative`, `persuasion`, `vehicle`                                     |
|`zygerrian_corsair`             |Zygerrian Corsair             |06     |`intimidation`, `leadership`, `pilot`, `space`                                 |`deception`, `fear`, `initiative`, `persuasion`, `teamwork`, `vehicle`                         |
|`squib_salvage_broker`          |Squib Salvage Broker          |06     |`equipment`, `gather_information`, `mechanics`, `persuasion`, `social`         |`modification`, `perception`, `repair`, `tech`, `use_computer`                                 |
|`fence`                         |Fence                         |06     |`deception`, `gather_information`, `intrigue`, `social_network`                |`knowledge`, `perception`, `persuasion`, `social`                                              |
|`ryn_network_gatherer`          |Ryn Network Gatherer          |06     |`gather_information`, `network`, `social_network`                              |`deception`, `knowledge`, `perception`, `social`, `use_computer`                               |
|`undercover_lawman`             |Undercover Lawman             |06     |`deception`, `infiltration`, `investigation`                                   |`gather_information`, `perception`, `persuasion`, `social`, `stealth`                          |
|`imperial_agent`                |Imperial Agent                |06     |`deception`, `infiltration`, `stealth`                                         |`gather_information`, `perception`, `social`, `use_computer`                                   |
|`rebel_operative`               |Rebel Operative               |06     |`infiltration`, `recon`, `stealth`                                             |`deception`, `gather_information`, `perception`, `survival`, `tactics`                         |
|`emperors_hand`                 |Emperor’s Hand                |06     |`dark_side`, `force`, `force_power`, `infiltration`, `stealth`, `use_the_force`|`deception`, `force_training`, `initiative`, `perception`, `precision`                         |
|`bothan_spynet_operative`       |Bothan SpyNet Operative       |06     |`deception`, `gather_information`, `infiltration`, `network`, `stealth`        |`perception`, `social_network`, `use_computer`                                                 |
|`clawdite_facechanger_operative`|Clawdite Facechanger Operative|06     |`deception`, `infiltration`, `manipulation`, `stealth`                         |`gather_information`, `perception`, `persuasion`, `social`                                     |
|`slicer_droid`                  |Slicer Droid                  |06     |`droid`, `slicing`, `tech`, `use_computer`                                     |`mechanics`, `modification`, `perception`, `self_repair`                                       |
|`freighter_captain`             |Freighter Captain             |06     |`leadership`, `pilot`, `space`, `teamwork`, `vehicle`                          |`persuasion`, `support`, `use_computer`                                                        |

Revision Log

REV-001 — Scavenger resources removal

Retained exactly from the rolling authority.

Current Tranche — 12B-SCOUNDREL-06

Selection is deterministic: the next 20 Scoundrel-first records after electronic_warfare_specialist. Two Scoundrel-first records remain afterward: salvage_engineer and repair_droid.

shipwright, entertainer, blockade_runner, jawa_droid_peddler, herglic_free_trader, toydarian_junk_merchant, privateer, weequay_pirate_captain, zygerrian_corsair, squib_salvage_broker, fence, ryn_network_gatherer, undercover_lawman, imperial_agent, rebel_operative, emperors_hand, bothan_spynet_operative, clawdite_facechanger_operative, slicer_droid, freighter_captain

Certified Record Notes

Shipwright (shipwright)

• Identity: Starship construction and maintenance specialist defined by building, repairing, and technically improving spacecraft rather than merely piloting them.
• Primary: crafting, mechanics, repair, space, tech
• Supporting: modification, pilot, use_computer, vehicle

Entertainer (entertainer)

• Identity: Performance-focused social specialist whose identity is holding attention, influencing an audience, and navigating social situations through presence and practiced performance.
• Primary: persuasion, social
• Supporting: acrobatics, deception, gather_information, perception

Blockade Runner (blockade_runner)

• Identity: High-risk transport pilot who defeats interdiction through speed, evasive maneuver, route knowledge, and ship handling under pursuit.
• Primary: evasion, pilot, pursuit, space, vehicle
• Supporting: deception, initiative, mobility, use_computer

Jawa Droid Peddler (jawa_droid_peddler)

• Identity: Jawa merchant-technician who acquires, repairs, modifies, evaluates, and sells droids and technological goods.
• Primary: droid, equipment, mechanics, persuasion, social
• Supporting: gather_information, modification, repair, tech, use_computer

Herglic Free Trader (herglic_free_trader)

• Identity: Herglic expression of the independent merchant, centered on negotiation, commercial knowledge, contacts, and mobile trade.
• Primary: knowledge, persuasion, social
• Supporting: deception, gather_information, pilot, use_computer, vehicle

Toydarian Junk Merchant (toydarian_junk_merchant)

• Identity: Toydarian merchant expression centered on bargaining and extracting value from junk, equipment, and technical goods.
• Primary: equipment, persuasion, social
• Supporting: deception, gather_information, knowledge, tech

Privateer (privateer)

• Identity: Legally or politically sanctioned raider whose identity combines armed space operations, piloting, tactical action, and coordinated shipboard combat.
• Primary: pilot, space, tactics, vehicle
• Supporting: initiative, leadership, persuasion, ranged, teamwork

Weequay Pirate Captain (weequay_pirate_captain)

• Identity: Weequay pirate leader who commands raiders through reputation, intimidation, piloting, and practical authority aboard pirate vessels.
• Primary: intimidation, leadership, pilot, space
• Supporting: deception, fear, initiative, persuasion, vehicle

Zygerrian Corsair (zygerrian_corsair)

• Identity: Zygerrian corsair leader centered on coercive raiding, command, intimidation, and coordinated spaceborne predation.
• Primary: intimidation, leadership, pilot, space
• Supporting: deception, fear, initiative, persuasion, teamwork, vehicle

Squib Salvage Broker (squib_salvage_broker)

• Identity: Squib salvage dealer who combines technical appraisal and recovery knowledge with contacts, negotiation, and the resale of recovered equipment.
• Primary: equipment, gather_information, mechanics, persuasion, social
• Supporting: modification, perception, repair, tech, use_computer

Fence (fence)

• Identity: Criminal intermediary who converts stolen or illicit goods into usable value through contacts, deception, information gathering, and discreet networks.
• Primary: deception, gather_information, intrigue, social_network
• Supporting: knowledge, perception, persuasion, social

Ryn Network Gatherer (ryn_network_gatherer)

• Identity: Ryn information specialist whose identity is broad interpersonal networking and gathering information through distributed social contacts.
• Primary: gather_information, network, social_network
• Supporting: deception, knowledge, perception, social, use_computer

Undercover Lawman (undercover_lawman)

• Identity: Law-enforcement investigator who penetrates criminal or hostile groups through deception and infiltration while pursuing investigative objectives.
• Primary: deception, infiltration, investigation
• Supporting: gather_information, perception, persuasion, social, stealth

Imperial Agent (imperial_agent)

• Identity: Covert Imperial operative centered on infiltration, deception, secrecy, and intelligence work inside hostile or suspect environments.
• Primary: deception, infiltration, stealth
• Supporting: gather_information, perception, social, use_computer

Rebel Operative (rebel_operative)

• Identity: Field intelligence and special-operations agent who combines stealth, reconnaissance, infiltration, and practical survival in support of resistance missions.
• Primary: infiltration, recon, stealth
• Supporting: deception, gather_information, perception, survival, tactics

Emperor’s Hand (emperors_hand)

• Identity: Intrinsic dark-side Force operative serving as a covert personal instrument of the Emperor, combining Force powers with infiltration, stealth, and targeted violence.
• Primary: dark_side, force, force_power, infiltration, stealth, use_the_force
• Supporting: deception, force_training, initiative, perception, precision

Bothan SpyNet Operative (bothan_spynet_operative)

• Identity: Bothan intelligence operative defined by infiltration and information acquisition within the Spynet’s galaxy-spanning network of agents and contacts.
• Primary: deception, gather_information, infiltration, network, stealth
• Supporting: perception, social_network, use_computer

Clawdite Facechanger Operative (clawdite_facechanger_operative)

• Identity: Species-specific infiltrator who weaponizes shapeshifting and deception to assume identities, penetrate organizations, and remain concealed.
• Primary: deception, infiltration, manipulation, stealth
• Supporting: gather_information, perception, persuasion, social

Slicer Droid (slicer_droid)

• Identity: Droid specialized for computer intrusion and electronic exploitation, combining slicing with machine resilience and technical self-maintenance.
• Primary: droid, slicing, tech, use_computer
• Supporting: mechanics, modification, perception, self_repair

Freighter Captain (freighter_captain)

• Identity: Working starship captain whose identity is piloting, crew leadership, coordinated shipboard operations, and keeping a transport moving through space.
• Primary: leadership, pilot, space, teamwork, vehicle
• Supporting: persuasion, support, use_computer

Claude Execution Contract — Next Run

1. Replace the pending baseline with the successful 12B-SCOUT-SCOUNDREL-05 commit and verify ancestry.
2. Apply only the 20 IDs in currentExecution.newRecordIds.
3. Replace exactly metadata.tags.primary, metadata.tags.supporting, metadata.tags.all, and metadata.tagProvenance.
4. Do not change any of the 90 previously certified records without an explicit revision.
5. Do not change mechanics, exactRefs, routes, classes, abilities, skills, talents, feats, Force data, species, backgrounds, narrative data, scoring, BuildIntent, SuggestionScorer, Mentor, UI ranking, or ontology.
6. Validate every supplied tag against the frozen ontology.
7. Run Phase 12A validation/tests and Phase 12B overlay --check.
8. Stop rather than infer on any mismatch.

Progress

• Certified: 110 / 297
• Scout-first: 73 / 73 complete
• Scoundrel-first after this tranche: 37 / 39
• New this tranche: 20
• Remaining uncurated after application: 187
• Next: finish the final 2 Scoundrel-first records, then transition deterministically to the next first-foundation bucket.
• Shadow scoring: still deferred.
