SWSE Archetype Semantic Curation Authority

Phase: 12B — Archetype Semantic Curation
Status: ROLLING AUTHORITY — NEXT TRANCHE READY / BASELINE PENDING
Certified: 150 / 297 archetypes
Current execution: 12B-NOBLE-08 — 20 new records
Required baseline: e8a2c7b7375e089cf0382fce62f1bd11433a74fd
Runtime target: data/archetypes.json
Frozen ontology: data/audits/talent-feat-phase3-final-ontology.json — 190 tags

> Replace the pending baseline with the successful 12B-SCOUNDREL-NOBLE-07 commit before execution. Do not infer or substitute a SHA.

Selection

This tranche continues Noble-first deterministically in dataset order immediately after community_leader, covering corporate_operator through holonet_reporter.

Curation rules

1. Narrative identity defines what the archetype is.
2. Signature exact mechanics show how that identity is expressed.
3. Supporting mechanics reinforce but do not automatically define identity.
4. Only the frozen 190-tag ontology may be used.
5. Class is a route, not ownership.
6. Parent tags do not automatically inherit to specializations.
7. Recommended feat/talent tags are evidence, not a bag of tags to copy wholesale.
8. Optional routes stay supporting unless the archetype itself requires them.
9. Narrow ontology tags retain their mechanical meaning; ordinary-English resemblance is insufficient.

Rolling Certified Census

|ID                              |Archetype                     |Tranche|Primary                                                                                           |Supporting                                                                                             |
|--------------------------------|------------------------------|------:|--------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
|`fringer`                       |Fringer                       |01     |`exploration`, `perception`, `survivability`, `survival`                                          |`endurance`, `mechanics`, `mobility`, `pilot`, `repair`, `resilience`, `tech`                          |
|`scavenger`                     |Scavenger                     |01     |`equipment`, `mechanics`, `tech`                                                                  |`crafting`, `modification`, `perception`, `repair`, `survivability`, `survival`, `use_computer`        |
|`bounty_hunter`                 |Bounty Hunter                 |01     |`investigation`, `perception`, `pursuit`, `survival`, `tracking`                                  |`gather_information`, `initiative`, `precision`, `ranged`, `social`, `stealth`, `targeting`            |
|`sector_ranger`                 |Sector Ranger                 |01     |`investigation`, `perception`, `pursuit`, `survival`, `tracking`                                  |`control`, `initiative`, `knowledge`, `pilot`, `ranged`                                                |
|`frontier_marshal`              |Frontier Marshal              |01     |`ally_support`, `leadership`, `perception`, `persuasion`, `support`                               |`control`, `gather_information`, `initiative`, `social`, `survival`, `tactics`, `teamwork`             |
|`force_hunter`                  |Force Hunter                  |01     |`anti-force`, `perception`, `pursuit`, `survival`, `tracking`                                     |`force`, `force_power`, `precision`, `ranged`, `resilience`, `stealth`, `targeting`                    |
|`sniper`                        |Sniper                        |01     |`precision`, `ranged`, `setup`, `sniper`, `targeting`                                             |`ambush`, `concealment`, `control`, `initiative`, `perception`, `stealth`                              |
|`saboteur`                      |Saboteur                      |01     |`infiltration`, `mechanics`, `stealth`, `tech`, `trap`                                            |`burst_damage`, `cover`, `crafting`, `equipment`, `setup`, `use_computer`                              |
|`partisan`                      |Partisan                      |01     |`ambush`, `infiltration`, `stealth`, `survival`, `tactics`                                        |`deception`, `evasion`, `initiative`, `perception`, `social`                                           |
|`pilot`                         |Pilot                         |01     |`pilot`, `pursuit`, `space`, `vehicle`                                                            |`initiative`, `mechanics`, `mobility`, `perception`, `tactics`, `teamwork`                             |
|`astrogator`                    |Astrogator                    |02     |`exploration`, `pilot`, `space`, `use_computer`                                                   |`knowledge`, `perception`, `vehicle`                                                                   |
|`racer`                         |Racer                         |02     |`initiative`, `pilot`, `pursuit`, `vehicle`                                                       |`mobility`, `movement`, `perception`, `space`                                                          |
|`disaster_responder`            |Disaster Responder            |02     |`ally_support`, `recovery`, `support`, `survivability`, `treat_injury`                            |`endurance`, `healing`, `mechanics`, `medical`, `perception`, `repair`, `survival`                     |
|`explorer`                      |Explorer                      |02     |`exploration`, `perception`, `survival`                                                           |`endurance`, `knowledge`, `mobility`, `pilot`, `space`, `vehicle`                                      |
|`pathfinder`                    |Pathfinder                    |02     |`exploration`, `mobility`, `perception`, `survival`                                               |`endurance`, `evasion`, `stealth`, `support`, `survivability`                                          |
|`survivalist`                   |Survivalist                   |02     |`endurance`, `resilience`, `survivability`, `survival`                                            |`climb`, `mobility`, `perception`, `recovery`, `swim`                                                  |
|`search_and_rescue_specialist`  |Search-and-Rescue Specialist  |02     |`ally_support`, `perception`, `recovery`, `support`, `survival`, `tracking`                       |`endurance`, `healing`, `medical`, `pilot`, `survivability`, `treat_injury`                            |
|`first_contact_specialist`      |First-Contact Specialist      |02     |`exploration`, `knowledge`, `persuasion`, `social`                                                |`gather_information`, `perception`, `support`                                                          |
|`galactic_archaeologist`        |Galactic Archaeologist        |02     |`exploration`, `investigation`, `knowledge`, `perception`                                         |`survival`, `use_computer`                                                                             |
|`prospector`                    |Prospector                    |02     |`exploration`, `perception`, `survival`                                                           |`endurance`, `knowledge`, `mechanics`, `mobility`                                                      |
|`naturalist`                    |Naturalist                    |02     |`exploration`, `knowledge`, `perception`, `survival`                                              |`beast`, `treat_injury`                                                                                |
|`colony_pioneer`                |Colony Pioneer                |02     |`crafting`, `mechanics`, `support`, `survival`                                                    |`ally_support`, `endurance`, `leadership`, `repair`, `survivability`, `tech`                           |
|`beast_hunter`                  |Beast Hunter                  |02     |`beast`, `perception`, `pursuit`, `survival`, `tracking`                                          |`endurance`, `initiative`, `precision`, `ranged`, `stealth`, `targeting`                               |
|`beast_handler`                 |Beast Handler                 |02     |`beast`, `perception`, `survival`                                                                 |`beast_companion`, `persuasion`, `ride`, `support`                                                     |
|`beast_rider`                   |Beast Rider                   |02     |`beast`, `mount`, `ride`, `rider`, `survival`                                                     |`endurance`, `initiative`, `mobility`, `movement`, `perception`                                        |
|`devaronian_wanderer`           |Devaronian Wanderer           |02     |`exploration`, `mobility`, `perception`, `survival`                                               |`endurance`, `mechanics`, `pilot`, `survivability`, `tech`                                             |
|`blazing_chain_raider`          |Blazing Chain Raider          |02     |`force`, `force_power`, `force_training`, `pilot`, `space`                                        |`damage`, `fear`, `intimidation`, `social`, `vehicle`                                                  |
|`salvager`                      |Salvager                      |02     |`equipment`, `exploration`, `mechanics`, `repair`, `tech`                                         |`crafting`, `droid`, `modification`, `perception`, `survival`, `use_computer`                          |
|`scavenger_droid`               |Scavenger Droid               |02     |`droid`, `jury_rig`, `mechanics`, `repair`, `survivability`, `tech`                               |`crafting`, `equipment`, `modification`, `perception`, `survival`, `use_computer`                      |
|`jawa_sandcrawler_salvager`     |Jawa Sandcrawler Salvager     |02     |`equipment`, `jury_rig`, `mechanics`, `repair`, `tech`                                            |`crafting`, `modification`, `perception`, `survival`, `use_computer`, `vehicle`                        |
|`skip_tracer`                   |Skip Tracer                   |03     |`gather_information`, `investigation`, `perception`, `pursuit`, `tracking`                        |`deception`, `knowledge`, `social`, `use_computer`                                                     |
|`gand_findsman`                 |Gand Findsman                 |03     |`force`, `force_power`, `perception`, `precognition`, `tracking`                                  |`force_training`, `pursuit`, `survival`, `use_the_force`, `visions`                                    |
|`ubese_masked_hunter`           |Ubese Masked Hunter           |03     |`perception`, `pursuit`, `ranged`, `survival`, `tracking`                                         |`initiative`, `precision`, `stealth`, `targeting`, `use_computer`                                      |
|`shistavanen_tracker`           |Shistavanen Tracker           |03     |`perception`, `pursuit`, `survival`, `tracking`                                                   |`endurance`, `initiative`, `mobility`, `stealth`                                                       |
|`trianii_ranger`                |Trianii Ranger                |03     |`pilot`, `pursuit`, `tactics`, `vehicle`                                                          |`initiative`, `perception`, `ranged`, `survival`                                                       |
|`kiffu_guardian`                |Kiffu Guardian                |03     |`investigation`, `perception`, `pursuit`                                                          |`defense`, `initiative`, `leadership`, `persuasion`, `resilience`, `social`, `survival`, `will_defense`|
|`defel_shadow_operative`        |Defel Shadow Operative        |03     |`concealment`, `infiltration`, `stealth`                                                          |`deception`, `perception`, `precision`, `ranged`, `use_computer`                                       |
|`seyugi_dervish`                |Seyugi Dervish                |03     |`dark_side`, `force`, `force_power`, `martial_arts`, `stealth`, `unarmed`                         |`fear`, `force_training`, `mobility`, `precision`, `use_the_force`                                     |
|`recon_scout`                   |Recon Scout                   |03     |`perception`, `recon`, `stealth`, `tactics`                                                       |`initiative`, `leadership`, `survival`, `teamwork`                                                     |
|`polis_massan_field_medic`      |Polis Massan Field Medic      |03     |`ally_support`, `healing`, `medical`, `support`, `treat_injury`                                   |`endurance`, `knowledge`, `medicine`, `perception`, `recovery`, `survivability`                        |
|`demolitions_specialist`        |Demolitions Specialist        |03     |`burst_damage`, `mechanics`, `setup`, `tech`, `trap`                                              |`cover`, `crafting`, `equipment`, `infiltration`, `stealth`, `use_computer`                            |
|`guerrilla`                     |Guerrilla                     |03     |`ambush`, `infiltration`, `stealth`, `survival`, `tactics`                                        |`deception`, `evasion`, `initiative`, `planning`, `recon`, `teamwork`                                  |
|`ace_pilot`                     |Ace Pilot                     |03     |`evasion`, `pilot`, `pursuit`, `space`, `vehicle`                                                 |`initiative`, `mobility`, `tactics`                                                                    |
|`squadron_leader`               |Squadron Leader               |03     |`command`, `leadership`, `pilot`, `tactics`, `teamwork`                                           |`ally_support`, `initiative`, `persuasion`, `space`, `support`, `vehicle`                              |
|`test_pilot`                    |Test Pilot                    |03     |`mechanics`, `pilot`, `tech`, `vehicle`                                                           |`equipment`, `initiative`, `perception`, `use_computer`                                                |
|`gunship_pilot`                 |Gunship Pilot                 |03     |`heavy_weapon`, `pilot`, `ranged`, `tactics`, `vehicle`                                           |`initiative`, `offense_ranged`, `perception`, `space`, `targeting`                                     |
|`bush_pilot`                    |Bush Pilot                    |03     |`exploration`, `pilot`, `survival`, `vehicle`                                                     |`mechanics`, `mobility`, `perception`, `repair`, `space`                                               |
|`pilot_droid`                   |Pilot Droid                   |03     |`droid`, `pilot`, `tech`, `use_computer`, `vehicle`                                               |`initiative`, `mechanics`, `modification`, `perception`                                                |
|`iktotchi_precognitive_pilot`   |Iktotchi Precognitive Pilot   |03     |`force`, `force_power`, `pilot`, `precognition`, `vehicle`                                        |`force_training`, `initiative`, `perception`, `space`, `use_the_force`, `visions`                      |
|`unknown_regions_navigator`     |Unknown Regions Navigator     |03     |`exploration`, `galactic_lore`, `pilot`, `space`, `survival`                                      |`knowledge`, `perception`, `vehicle`                                                                   |
|`chiss_sky_walker`              |Chiss Sky-walker              |04     |`force`, `force_power`, `precognition`, `space`, `use_the_force`, `visions`                       |`exploration`, `force_training`, `galactic_lore`, `perception`, `pilot`                                |
|`givin_astrogator`              |Givin Astrogator              |04     |`knowledge`, `science`, `space`, `use_computer`                                                   |`exploration`, `galactic_lore`, `perception`, `pilot`                                                  |
|`duros_hyperspace_trailblazer`  |Duros Hyperspace Trailblazer  |04     |`exploration`, `pilot`, `space`, `use_computer`                                                   |`galactic_lore`, `perception`, `pursuit`, `survival`, `vehicle`                                        |
|`sullustan_rebel_navigator`     |Sullustan Rebel Navigator     |04     |`pilot`, `space`, `tactics`, `use_computer`                                                       |`galactic_lore`, `perception`, `teamwork`, `vehicle`                                                   |
|`hotshot_racer`                 |Hotshot Racer                 |04     |`initiative`, `pilot`, `pursuit`, `vehicle`                                                       |`deception`, `mobility`, `movement`, `perception`                                                      |
|`swoop_racer`                   |Swoop Racer                   |04     |`initiative`, `movement`, `pilot`, `pursuit`, `vehicle`                                           |`endurance`, `mobility`, `perception`                                                                  |
|`verpine_hive_engineer`         |Verpine Hive Engineer         |04     |`crafting`, `mechanics`, `modification`, `repair`, `tech`                                         |`knowledge`, `science`, `teamwork`, `use_computer`                                                     |
|`sluissi_shipwright`            |Sluissi Shipwright            |04     |`crafting`, `mechanics`, `modification`, `repair`, `space`, `tech`                                |`knowledge`, `pilot`, `use_computer`, `vehicle`                                                        |
|`deep_space_surveyor`           |Deep Space Surveyor           |04     |`exploration`, `perception`, `science`, `space`                                                   |`knowledge`, `pilot`, `survival`, `vehicle`                                                            |
|`wilderness_guide`              |Wilderness Guide              |04     |`exploration`, `perception`, `support`, `survival`                                                |`endurance`, `knowledge`, `ride`, `survivability`, `tracking`                                          |
|`antarian_ranger`               |Antarian Ranger               |04     |`ally_support`, `recon`, `support`, `survival`, `teamwork`                                        |`initiative`, `perception`, `stealth`, `tactics`, `tracking`                                           |
|`relic_hunter`                  |Relic Hunter                  |04     |`exploration`, `investigation`, `perception`, `pursuit`                                           |`galactic_lore`, `stealth`, `survival`, `use_computer`                                                 |
|`trandoshan_jagannath_hunter`   |Trandoshan Jagannath Hunter   |04     |`perception`, `pursuit`, `survival`, `tracking`                                                   |`climb`, `endurance`, `initiative`, `ranged`, `resilience`, `targeting`                                |
|`togruta_pack_hunter`           |Togruta Pack Hunter           |04     |`flanking`, `perception`, `survival`, `teamwork`, `tracking`                                      |`initiative`, `pursuit`, `ranged`, `stealth`                                                           |
|`rodian_great_hunter`           |Rodian Great Hunter           |04     |`perception`, `pursuit`, `survival`, `tracking`                                                   |`initiative`, `ranged`, `stealth`, `targeting`                                                         |
|`barabel_great_hunter`          |Barabel Great Hunter          |04     |`perception`, `pursuit`, `resilience`, `survival`, `tracking`                                     |`climb`, `endurance`, `initiative`, `ranged`                                                           |
|`tusken_bantha_rider`           |Tusken Bantha Rider           |04     |`beast`, `mount`, `ride`, `rider`, `survival`                                                     |`endurance`, `initiative`, `perception`, `resilience`                                                  |
|`gungan_kaadu_cavalier`         |Gungan Kaadu Cavalier         |04     |`beast`, `mount`, `ride`, `rider`                                                                 |`initiative`, `mobility`, `movement`, `perception`, `survival`                                         |
|`aing_tii_monk`                 |Aing-Tii Monk                 |04     |`force`, `force_power`, `mobility`, `space`, `use_the_force`                                      |`exploration`, `force_training`, `telekinesis`, `visions`, `will_defense`                              |
|`force_pilgrim`                 |Force Pilgrim                 |04     |`exploration`, `force`, `force_power`, `survival`, `use_the_force`                                |`force_training`, `galactic_lore`, `perception`, `resilience`, `visions`                               |
|`force_hermit`                  |Force Hermit                  |05     |`force`, `force_power`, `resilience`, `survival`, `use_the_force`                                 |`endurance`, `force_training`, `galactic_lore`, `meditation`, `perception`                             |
|`warden_of_the_sky`             |Warden of the Sky             |05     |`force`, `force_power`, `pilot`, `space`, `unarmed`                                               |`force_training`, `martial_arts`, `mobility`, `stealth`, `survival`, `use_the_force`                   |
|`nightsister`                   |Nightsister                   |05     |`dark_side`, `force`, `force_power`, `spellcasting`, `use_the_force`                              |`beast`, `fear`, `force_training`, `stealth`, `survival`                                               |
|`smuggler`                      |Smuggler                      |05     |`deception`, `pilot`, `social`, `space`                                                           |`gather_information`, `mechanics`, `persuasion`, `use_computer`, `vehicle`                             |
|`free_trader`                   |Free Trader                   |05     |`knowledge`, `persuasion`, `social`                                                               |`deception`, `gather_information`, `pilot`, `use_computer`, `vehicle`                                  |
|`pirate`                        |Pirate                        |05     |`intimidation`, `pilot`, `pursuit`, `space`                                                       |`deception`, `fear`, `initiative`, `ranged`, `social`, `vehicle`                                       |
|`gambler`                       |Gambler                       |05     |`deception`, `perception`, `social`                                                               |`gather_information`, `persuasion`, `reliability`, `reroll`                                            |
|`con_artist`                    |Con Artist                    |05     |`deception`, `manipulation`, `persuasion`, `social`                                               |`gather_information`, `intrigue`, `knowledge`, `perception`                                            |
|`fixer`                         |Fixer                         |05     |`gather_information`, `intrigue`, `persuasion`, `social_network`                                  |`deception`, `knowledge`, `social`, `use_computer`                                                     |
|`information_broker`            |Information Broker            |05     |`gather_information`, `intrigue`, `social_network`, `use_computer`                                |`deception`, `knowledge`, `perception`, `social`, `tech`                                               |
|`gunslinger`                    |Gunslinger                    |05     |`initiative`, `pistol`, `precision`, `ranged`                                                     |`damage`, `mobility`, `perception`, `targeting`                                                        |
|`courier`                       |Courier                       |05     |`mobility`, `movement`, `pilot`, `vehicle`                                                        |`initiative`, `perception`, `space`, `survival`, `use_computer`                                        |
|`spy`                           |Spy                           |05     |`deception`, `infiltration`, `stealth`                                                            |`concealment`, `gather_information`, `perception`, `persuasion`, `social`, `use_computer`              |
|`slicer`                        |Slicer                        |05     |`slicing`, `tech`, `use_computer`                                                                 |`knowledge`, `mechanics`, `perception`                                                                 |
|`assassin`                      |Assassin                      |05     |`ambush`, `infiltration`, `precision`, `stealth`, `targeting`                                     |`concealment`, `deception`, `initiative`, `perception`, `ranged`                                       |
|`mechanic`                      |Mechanic                      |05     |`mechanics`, `repair`, `tech`                                                                     |`crafting`, `droid`, `equipment`, `jury_rig`, `modification`, `use_computer`                           |
|`outlaw_tech`                   |Outlaw Tech                   |05     |`jury_rig`, `mechanics`, `modification`, `tech`, `use_computer`                                   |`crafting`, `deception`, `equipment`, `repair`, `slicing`                                              |
|`droidsmith`                    |Droidsmith                    |05     |`crafting`, `droid`, `mechanics`, `modification`, `repair`, `tech`                                |`equipment`, `use_computer`                                                                            |
|`inventor`                      |Inventor                      |05     |`crafting`, `equipment`, `mechanics`, `modification`, `tech`                                      |`knowledge`, `science`, `use_computer`                                                                 |
|`electronic_warfare_specialist` |Electronic Warfare Specialist |05     |`control`, `slicing`, `tech`, `use_computer`                                                      |`initiative`, `mechanics`, `perception`, `sensors`                                                     |
|`shipwright`                    |Shipwright                    |06     |`crafting`, `mechanics`, `repair`, `space`, `tech`                                                |`modification`, `pilot`, `use_computer`, `vehicle`                                                     |
|`entertainer`                   |Entertainer                   |06     |`persuasion`, `social`                                                                            |`acrobatics`, `deception`, `gather_information`, `perception`                                          |
|`blockade_runner`               |Blockade Runner               |06     |`evasion`, `pilot`, `pursuit`, `space`, `vehicle`                                                 |`deception`, `initiative`, `mobility`, `use_computer`                                                  |
|`jawa_droid_peddler`            |Jawa Droid Peddler            |06     |`droid`, `equipment`, `mechanics`, `persuasion`, `social`                                         |`gather_information`, `modification`, `repair`, `tech`, `use_computer`                                 |
|`herglic_free_trader`           |Herglic Free Trader           |06     |`exploration`, `gather_information`, `persuasion`, `social`                                       |`knowledge`, `pilot`, `resilience`, `social_network`, `vehicle`                                        |
|`toydarian_junk_merchant`       |Toydarian Junk Merchant       |06     |`equipment`, `persuasion`, `social`                                                               |`deception`, `gather_information`, `knowledge`, `tech`                                                 |
|`privateer`                     |Privateer                     |06     |`pilot`, `space`, `tactics`, `vehicle`                                                            |`initiative`, `leadership`, `persuasion`, `ranged`, `teamwork`                                         |
|`weequay_pirate_captain`        |Weequay Pirate Captain        |06     |`intimidation`, `leadership`, `pilot`, `space`                                                    |`deception`, `fear`, `initiative`, `persuasion`, `vehicle`                                             |
|`zygerrian_corsair`             |Zygerrian Corsair             |06     |`intimidation`, `leadership`, `pilot`, `space`                                                    |`control`, `deception`, `fear`, `initiative`, `persuasion`, `teamwork`, `vehicle`                      |
|`squib_salvage_broker`          |Squib Salvage Broker          |06     |`equipment`, `gather_information`, `mechanics`, `persuasion`, `social`                            |`modification`, `perception`, `repair`, `tech`, `use_computer`                                         |
|`fence`                         |Fence                         |06     |`deception`, `gather_information`, `intrigue`, `social_network`                                   |`knowledge`, `perception`, `persuasion`, `social`                                                      |
|`ryn_network_gatherer`          |Ryn Network Gatherer          |06     |`gather_information`, `network`, `social_network`                                                 |`deception`, `knowledge`, `perception`, `social`, `use_computer`                                       |
|`undercover_lawman`             |Undercover Lawman             |06     |`deception`, `infiltration`, `investigation`                                                      |`gather_information`, `perception`, `persuasion`, `social`, `stealth`                                  |
|`imperial_agent`                |Imperial Agent                |06     |`deception`, `infiltration`, `stealth`                                                            |`gather_information`, `perception`, `social`, `use_computer`                                           |
|`rebel_operative`               |Rebel Operative               |06     |`infiltration`, `recon`, `stealth`                                                                |`deception`, `gather_information`, `perception`, `survival`, `tactics`                                 |
|`emperors_hand`                 |Emperor’s Hand                |06     |`dark_side`, `force`, `force_power`, `infiltration`, `stealth`, `use_the_force`                   |`deception`, `force_training`, `initiative`, `perception`, `precision`                                 |
|`bothan_spynet_operative`       |Bothan SpyNet Operative       |06     |`deception`, `gather_information`, `infiltration`, `network`, `stealth`                           |`perception`, `social_network`, `use_computer`                                                         |
|`clawdite_facechanger_operative`|Clawdite Facechanger Operative|06     |`deception`, `infiltration`, `stealth`                                                            |`gather_information`, `manipulation`, `perception`, `persuasion`, `social`                             |
|`slicer_droid`                  |Slicer Droid                  |06     |`droid`, `slicing`, `tech`, `use_computer`                                                        |`ion`, `mechanics`, `modification`, `perception`                                                       |
|`freighter_captain`             |Freighter Captain             |06     |`leadership`, `pilot`, `space`, `teamwork`, `vehicle`                                             |`persuasion`, `support`, `use_computer`                                                                |
|`salvage_engineer`              |Salvage Engineer              |07     |`equipment`, `jury_rig`, `mechanics`, `repair`, `tech`                                            |`crafting`, `modification`, `perception`, `survival`, `use_computer`                                   |
|`repair_droid`                  |Repair Droid                  |07     |`droid`, `mechanics`, `repair`, `tech`, `use_computer`                                            |`equipment`, `ion`, `jury_rig`, `modification`, `perception`                                           |
|`crime_boss`                    |Crime Boss                    |07     |`intrigue`, `leadership`, `minion`, `social`                                                      |`deception`, `fear`, `gather_information`, `persuasion`, `social_network`                              |
|`cantina_proprietor`            |Cantina Proprietor            |07     |`gather_information`, `perception`, `persuasion`, `social`, `social_network`                      |`deception`, `intrigue`, `knowledge`                                                                   |
|`investigator`                  |Investigator                  |07     |`gather_information`, `investigation`, `perception`                                               |`knowledge`, `planning`, `persuasion`, `use_computer`                                                  |
|`spymaster`                     |Spymaster                     |07     |`intrigue`, `leadership`, `planning`, `social_network`                                            |`deception`, `gather_information`, `infiltration`, `persuasion`, `tactics`, `use_computer`             |
|`journalist`                    |Journalist                    |07     |`gather_information`, `investigation`, `persuasion`, `social`                                     |`knowledge`, `perception`, `use_computer`                                                              |
|`naval_officer`                 |Naval Officer                 |07     |`command`, `leadership`, `space`, `tactics`, `teamwork`                                           |`ally_support`, `knowledge`, `persuasion`, `pilot`, `support`, `vehicle`                               |
|`fleet_strategist`              |Fleet Strategist              |07     |`command`, `planning`, `space`, `tactics`                                                         |`ally_support`, `knowledge`, `leadership`, `perception`, `support`, `teamwork`, `use_computer`         |
|`quartermaster`                 |Quartermaster                 |07     |`equipment`, `knowledge`, `support`                                                               |`ally_support`, `mechanics`, `perception`, `persuasion`, `tech`, `use_computer`                        |
|`resistance_leader`             |Resistance Leader             |07     |`leadership`, `persuasion`, `social`, `support`                                                   |`ally_support`, `deception`, `gather_information`, `tactics`, `teamwork`                               |
|`ship_captain`                  |Ship Captain                  |07     |`command`, `leadership`, `pilot`, `space`, `vehicle`                                              |`ally_support`, `persuasion`, `support`, `teamwork`, `use_computer`                                    |
|`cyberneticist`                 |Cyberneticist                 |07     |`implant`, `mechanics`, `medical`, `tech`                                                         |`knowledge`, `medicine`, `modification`, `perception`, `treat_injury`                                  |
|`scientist`                     |Scientist                     |07     |`knowledge`, `science`                                                                            |`perception`, `tech`, `use_computer`                                                                   |
|`doctor`                        |Doctor                        |07     |`ally_support`, `healing`, `medicine`, `support`, `treat_injury`                                  |`knowledge`, `medical`, `perception`                                                                   |
|`activist`                      |Activist                      |07     |`gather_information`, `persuasion`, `social`                                                      |`deception`, `leadership`, `manipulation`                                                              |
|`aristocrat`                    |Aristocrat                    |07     |`leadership`, `persuasion`, `resources`, `social`                                                 |`deception`, `intrigue`, `knowledge`, `social_network`                                                 |
|`bureaucrat`                    |Bureaucrat                    |07     |`knowledge`, `social`                                                                             |`intrigue`, `persuasion`, `use_computer`                                                               |
|`celebrity`                     |Celebrity                     |07     |`deception`, `persuasion`, `social`                                                               |`gather_information`, `manipulation`, `perception`                                                     |
|`community_leader`              |Community Leader              |07     |`ally_support`, `leadership`, `persuasion`, `social`, `support`                                   |`gather_information`, `morale`, `perception`, `teamwork`                                               |
|`corporate_operator`            |Corporate Operator            |08     |`intrigue`, `leadership`, `persuasion`, `social`                                                  |`deception`, `gather_information`, `knowledge`, `social_network`, `use_computer`                       |
|`courtier`                      |Courtier                      |08     |`deception`, `intrigue`, `persuasion`, `social`                                                   |`gather_information`, `manipulation`, `perception`                                                     |
|`diplomat`                      |Diplomat                      |08     |`knowledge`, `persuasion`, `social`                                                               |`gather_information`, `leadership`, `perception`, `reliability`                                        |
|`educator`                      |Educator                      |08     |`ally_support`, `knowledge`, `support`                                                            |`persuasion`, `skill_mastery`                                                                          |
|`merchant_prince`               |Merchant Prince               |08     |`leadership`, `minion`, `persuasion`, `social`                                                    |`deception`, `gather_information`, `intrigue`, `social_network`                                        |
|`planetary_governor`            |Planetary Governor            |08     |`leadership`, `persuasion`, `social`                                                              |`intrigue`, `knowledge`, `perception`, `social_network`                                                |
|`propagandist`                  |Propagandist                  |08     |`deception`, `manipulation`, `persuasion`, `social`                                               |`gather_information`, `intrigue`, `planning`, `use_computer`                                           |
|`revolutionary_statesman`       |Revolutionary Statesman       |08     |`leadership`, `persuasion`, `social`, `support`                                                   |`ally_support`, `gather_information`, `intrigue`, `morale`                                             |
|`spiritual_leader`              |Spiritual Leader              |08     |`ally_support`, `leadership`, `persuasion`, `social`, `support`                                   |`knowledge`, `morale`, `perception`                                                                    |
|`dark_side_cultist`             |Dark-Side Cultist             |08     |`dark_side`, `force`, `force_power`, `force_training`, `talisman`, `use_the_force`                |`deception`, `fear`, `manipulation`, `persuasion`, `social`                                            |
|`force_mystic`                  |Force Mystic                  |08     |`force`, `force_power`, `force_training`, `meditation`, `use_the_force`                           |`force_support`, `galactic_lore`, `perception`, `precognition`, `telepathy`, `visions`                 |
|`force_seer`                    |Force Seer                    |08     |`force`, `force_power`, `force_training`, `perception`, `precognition`, `use_the_force`, `visions`|`force_support`, `galactic_lore`, `telepathy`, `tracking`                                              |
|`force_witch`                   |Force Witch                   |08     |`force`, `force_power`, `force_training`, `nature`, `survival`, `use_the_force`                   |`deception`, `healing`, `perception`, `telepathy`, `tracking`                                          |
|`falleen_black_sun_noble`       |Falleen Black Sun Noble       |08     |`intrigue`, `leadership`, `social`, `social_network`                                              |`deception`, `fear`, `gather_information`, `persuasion`, `tactics`                                     |
|`hutt_kajidic_lorda`            |Hutt Kajidic Lorda            |08     |`intrigue`, `leadership`, `social`, `social_network`                                              |`deception`, `fear`, `gather_information`, `persuasion`, `planning`                                    |
|`forensic_specialist`           |Forensic Specialist           |08     |`investigation`, `perception`, `science`                                                          |`gather_information`, `knowledge`, `planning`, `use_computer`                                          |
|`counterintelligence_officer`   |Counterintelligence Officer   |08     |`deception`, `infiltration`, `investigation`                                                      |`gather_information`, `perception`, `stealth`, `use_computer`                                          |
|`handler`                       |Handler                       |08     |`leadership`, `planning`, `social_network`, `support`                                             |`ally_support`, `deception`, `gather_information`, `persuasion`, `tactics`                             |
|`investigative_journalist`      |Investigative Journalist      |08     |`gather_information`, `investigation`, `perception`, `social`                                     |`knowledge`, `persuasion`, `planning`, `use_computer`                                                  |
|`holonet_reporter`              |HoloNet Reporter              |08     |`gather_information`, `persuasion`, `social`                                                      |`knowledge`, `perception`, `use_computer`                                                              |

Revision Log

REV-001 — Scavenger resources removal

• Record: scavenger
• Ruling: Remove resources from primary, all, and phase12b curated primary; make no other Scavenger semantic change.

REV-002 — Kiffu Guardian semantic QA correction

• Record: kiffu_guardian
• Ruling: The prior profile over-weighted command/leadership from Respected Officer. The Enforcement identity is fundamentally investigator/quarry-apprehension oriented; command is not identity-defining.
• Certified primary: investigation, perception, pursuit
• Certified supporting: defense, initiative, leadership, persuasion, resilience, social, survival, will_defense

REV-003 — Ace Pilot semantic QA correction

• Record: ace_pilot
• Ruling: Promotes evasion to identity-defining. Ace Pilot should not be semantically identical to generic Pilot at the primary layer; its defining published expression is outmaneuvering and surviving dogfights.
• Certified primary: evasion, pilot, pursuit, space, vehicle
• Certified supporting: initiative, mobility, tactics

REV-004 — Slicer Droid semantic QA correction

• Record: slicer_droid
• Ruling: Removes self_repair, which was not supported by the selected mechanics. Ion Resistance directly supports ion instead.
• Certified primary: droid, slicing, tech, use_computer
• Certified supporting: ion, mechanics, modification, perception

REV-005 — Electronic Warfare Specialist semantic QA correction

• Record: electronic_warfare_specialist
• Ruling: Sensors remains characteristic but was too specific to be primary from the selected evidence. Removes generic support, which was not directly established by the signature package.
• Certified primary: control, slicing, tech, use_computer
• Certified supporting: initiative, mechanics, perception, sensors

REV-006 — Clawdite Facechanger Operative semantic QA correction

• Record: clawdite_facechanger_operative
• Ruling: Shapeshifting/disguise is already captured by infiltration. manipulation is valid as a secondary social-influence signal but was too broad as a primary identity tag.
• Certified primary: deception, infiltration, stealth
• Certified supporting: gather_information, manipulation, perception, persuasion, social

REV-007 — Herglic Free Trader semantic QA correction

• Record: herglic_free_trader
• Ruling: The prior profile was an exact duplicate of Free Trader. Herglic free-trader identity has source-backed exploration, mercantile-network, social-contact, and sturdy/risk-taking differentiation; this is not arbitrary uniqueness.
• Certified primary: exploration, gather_information, persuasion, social
• Certified supporting: knowledge, pilot, resilience, social_network, vehicle

REV-008 — Zygerrian Corsair semantic QA correction

• Record: zygerrian_corsair
• Ruling: Adds control as a supporting identity signal for the coercive/slaving corsair expression; preserves the pirate-captain overlap without leaving the Zygerrian expression nearly indistinguishable.
• Certified primary: intimidation, leadership, pilot, space
• Certified supporting: control, deception, fear, initiative, persuasion, teamwork, vehicle

Current Tranche — 12B-NOBLE-08

Current 20 new records:

corporate_operator, courtier, diplomat, educator, merchant_prince, planetary_governor, propagandist, revolutionary_statesman, spiritual_leader, dark_side_cultist, force_mystic, force_seer, force_witch, falleen_black_sun_noble, hutt_kajidic_lorda, forensic_specialist, counterintelligence_officer, handler, investigative_journalist, holonet_reporter

Certified Record Notes

Corporate Operator (corporate_operator)

• Identity: Institutional power broker who works through corporate hierarchies, policy, persuasion, leadership, and connected professional networks.
• Primary: intrigue, leadership, persuasion, social
• Supporting: deception, gather_information, knowledge, social_network, use_computer

Courtier (courtier)

• Identity: Palace or elite-society operator whose identity is social maneuvering, deception, persuasion, and intrigue inside status-conscious circles.
• Primary: deception, intrigue, persuasion, social
• Supporting: gather_information, manipulation, perception

Diplomat (diplomat)

• Identity: Professional negotiator who resolves disputes and represents interests through persuasion, social knowledge, reliability, and institutional fluency.
• Primary: knowledge, persuasion, social
• Supporting: gather_information, leadership, perception, reliability

Educator (educator)

• Identity: Teacher or mentor whose identity is transferring knowledge and improving other characters through instruction, reassurance, and mastery of learned skills.
• Primary: ally_support, knowledge, support
• Supporting: persuasion, skill_mastery

Merchant Prince (merchant_prince)

• Identity: Commercial magnate who combines social authority, subordinate agents, negotiation, contacts, and political-economic influence.
• Primary: leadership, minion, persuasion, social
• Supporting: deception, gather_information, intrigue, social_network

Planetary Governor (planetary_governor)

• Identity: Civil authority responsible for governing a world or region through leadership, persuasion, institutions, and political relationships.
• Primary: leadership, persuasion, social
• Supporting: intrigue, knowledge, perception, social_network

Propagandist (propagandist)

• Identity: Opinion-shaper who deliberately manipulates public attitudes through persuasive messaging, deception, intrigue, and planned communication.
• Primary: deception, manipulation, persuasion, social
• Supporting: gather_information, intrigue, planning, use_computer

Revolutionary Statesman (revolutionary_statesman)

• Identity: Political leader who turns a revolutionary cause into organized public leadership, sustaining allies through rhetoric, morale, and institutional legitimacy.
• Primary: leadership, persuasion, social, support
• Supporting: ally_support, gather_information, intrigue, morale

Spiritual Leader (spiritual_leader)

• Identity: Non-Force spiritual authority who guides and inspires a community through persuasion, morale, leadership, and direct social support.
• Primary: ally_support, leadership, persuasion, social, support
• Supporting: knowledge, morale, perception

Dark-Side Cultist (dark_side_cultist)

• Identity: Cult devotee whose identity is explicit dark-side Force practice, talisman use, fear, and manipulative religious or occult influence.
• Primary: dark_side, force, force_power, force_training, talisman, use_the_force
• Supporting: deception, fear, manipulation, persuasion, social

Force Mystic (force_mystic)

• Identity: Contemplative Force practitioner centered on broad mystical practice, meditation, Force powers, intuition, and revelatory experience rather than a specific martial tradition.
• Primary: force, force_power, force_training, meditation, use_the_force
• Supporting: force_support, galactic_lore, perception, precognition, telepathy, visions

Force Seer (force_seer)

• Identity: Force practitioner whose identity is foresight: sensing future outcomes, interpreting visions, perceiving danger, and using precognition to guide action.
• Primary: force, force_power, force_training, perception, precognition, use_the_force, visions
• Supporting: force_support, galactic_lore, telepathy, tracking

Force Witch (force_witch)

• Identity: Wilderness-oriented Force practitioner whose identity blends Force power with nature, survival, tracking, healing, and subtle mental influence; witch-like flavor alone does not imply the ontology’s spellcasting mechanic.
• Primary: force, force_power, force_training, nature, survival, use_the_force
• Supporting: deception, healing, perception, telepathy, tracking

Falleen Black Sun Noble (falleen_black_sun_noble)

• Identity: Falleen Black Sun power broker whose identity is criminal intrigue, organization leadership, social networks, reputation, and coordinated underworld influence.
• Primary: intrigue, leadership, social, social_network
• Supporting: deception, fear, gather_information, persuasion, tactics

Hutt Kajidic Lorda (hutt_kajidic_lorda)

• Identity: Hutt clan lord whose power rests on kajidic networks, long-term schemes, reputation, social authority, and criminal-political influence.
• Primary: intrigue, leadership, social, social_network
• Supporting: deception, fear, gather_information, persuasion, planning

Forensic Specialist (forensic_specialist)

• Identity: Investigator who reconstructs events from physical evidence through perception, scientific analysis, records, and disciplined investigative method.
• Primary: investigation, perception, science
• Supporting: gather_information, knowledge, planning, use_computer

Counterintelligence Officer (counterintelligence_officer)

• Identity: Defensive intelligence specialist who uncovers hostile operations by combining investigation with deception, infiltration knowledge, surveillance awareness, and covert tradecraft.
• Primary: deception, infiltration, investigation
• Supporting: gather_information, perception, stealth, use_computer

Handler (handler)

• Identity: Intelligence manager who recruits, directs, protects, and coordinates agents through planning, leadership, contacts, and operational support.
• Primary: leadership, planning, social_network, support
• Supporting: ally_support, deception, gather_information, persuasion, tactics

Investigative Journalist (investigative_journalist)

• Identity: Reporter who pursues hidden facts and wrongdoing through investigation, source development, perception, records, and persistent information gathering.
• Primary: gather_information, investigation, perception, social
• Supporting: knowledge, persuasion, planning, use_computer

HoloNet Reporter (holonet_reporter)

• Identity: Public-facing reporter who gathers information and communicates it persuasively through HoloNet-era media and computer-assisted reporting.
• Primary: gather_information, persuasion, social
• Supporting: knowledge, perception, use_computer

Tranche QA

• New records checked: 20 / 20
• Cumulative certified records structurally checked: 150 / 150
• Unknown ontology tags: 0
• Primary/supporting collisions: 0
• Broken all unions: 0
• Hard implication violations: 0
• High-overlap new-record pairs were reviewed rather than automatically differentiated.
• spellcasting was deliberately not assigned to Force Witch; the frozen ontology requires an explicit published spellcasting/witchcraft mechanic, and witch-like narrative flavor alone is insufficient.
• Force Mystic, Force Seer, and Force Witch are separated by their actual identities: broad mystical/meditative Force practice, precognition/visions, and nature/survival-oriented Force practice respectively.
• Hutt Kajidic Lorda and Falleen Black Sun Noble retain significant overlap because both are criminal elites; their distinction is expressed through planning/reputation versus coordinated Black Sun influence, without inventing unsupported species mechanics.

Claude Execution Contract — Next Run

1. Replace PENDING_12B_SCOUNDREL_NOBLE_07_COMMIT with the successful 12B-SCOUNDREL-NOBLE-07 commit and verify ancestry.
2. Apply only the 20 IDs in currentExecution.newRecordIds.
3. For each execution record replace exactly metadata.tags.primary, metadata.tags.supporting, metadata.tags.all, and metadata.tagProvenance.
4. Do not change any of the 130 previously certified records or the seven carried-forward QA revisions.
5. Do not change mechanics, exactRefs, routes, classes, abilities, skills, talents, feats, Force data, species, backgrounds, narrative data, scoring, BuildIntent, SuggestionScorer, Mentor, UI ranking, or ontology.
6. Validate all supplied tags against the frozen 190-tag ontology.
7. Run Phase 12A validation/tests and Phase 12B overlay --check.
8. Stop rather than infer if the baseline authority does not match.

Progress

• Certified: 150 / 297
• Scout-first: 73 / 73 complete
• Scoundrel-first: 39 / 39 complete
• Noble-first: 38 / 98
• New this tranche: 20
• Carried-forward QA revisions: 7
• Remaining uncurated after application: 147
• Next: continue Noble-first records in dataset order.
• Shadow scoring: still deferred.
