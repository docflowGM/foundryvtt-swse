# SWSE Archetype Semantic Curation Authority

**Phase:** 12B — Archetype Semantic Curation  
**Status:** ROLLING AUTHORITY — NEXT TRANCHE READY / BASELINE PENDING  
**Certified:** 250 / 297 archetypes  
**Current execution:** 12B-SOLDIER-01 — 40 new records  
**Required baseline:** `8390b5352b9c4a3805091e2cb1254b62a816e9bc`  
**Runtime target:** `data/archetypes.json`  
**Frozen ontology:** `data/audits/talent-feat-phase3-final-ontology.json` — 190 tags

> Replace the pending baseline with the successful 12B-NOBLE-11 commit before execution. Do not infer or substitute a SHA.

## Selection

This tranche begins Soldier-first deterministically in dataset order and covers the first 40 Soldier-first records, from `enforcer` through `gungan_organic_tech_defender`. After application, Soldier-first is 40 / 53 complete.

## Curation rules

1. Narrative identity defines what the archetype is.
2. Signature exact mechanics show how that identity is expressed.
3. Supporting mechanics reinforce but do not automatically define identity.
4. Only the frozen 190-tag ontology may be used.
5. Class is a route, not ownership.
6. Parent tags do not automatically inherit to specializations.
7. Recommended feat/talent tags are evidence, not a bag of tags to copy wholesale.
8. Optional routes stay supporting unless the archetype itself requires them.
9. Narrow ontology tags retain their mechanical meaning; ordinary-English resemblance is insufficient.
10. Overlap is acceptable when genuinely supported; differentiation must be evidence-backed.

## Rolling Certified Census

| ID | Archetype | Tranche | Primary | Supporting |
|---|---|---:|---|---|
| `fringer` | Fringer | 01 | `exploration`, `perception`, `survivability`, `survival` | `endurance`, `mechanics`, `mobility`, `pilot`, `repair`, `resilience`, `tech` |
| `scavenger` | Scavenger | 01 | `equipment`, `mechanics`, `tech` | `crafting`, `modification`, `perception`, `repair`, `survivability`, `survival`, `use_computer` |
| `bounty_hunter` | Bounty Hunter | 01 | `investigation`, `perception`, `pursuit`, `survival`, `tracking` | `gather_information`, `initiative`, `precision`, `ranged`, `social`, `stealth`, `targeting` |
| `sector_ranger` | Sector Ranger | 01 | `investigation`, `perception`, `pursuit`, `survival`, `tracking` | `control`, `initiative`, `knowledge`, `pilot`, `ranged` |
| `frontier_marshal` | Frontier Marshal | 01 | `ally_support`, `leadership`, `perception`, `persuasion`, `support` | `control`, `gather_information`, `initiative`, `social`, `survival`, `tactics`, `teamwork` |
| `force_hunter` | Force Hunter | 01 | `anti-force`, `perception`, `pursuit`, `survival`, `tracking` | `force`, `force_power`, `precision`, `ranged`, `resilience`, `stealth`, `targeting` |
| `sniper` | Sniper | 01 | `precision`, `ranged`, `setup`, `sniper`, `targeting` | `ambush`, `concealment`, `control`, `initiative`, `perception`, `stealth` |
| `saboteur` | Saboteur | 01 | `infiltration`, `mechanics`, `stealth`, `tech`, `trap` | `burst_damage`, `cover`, `crafting`, `equipment`, `setup`, `use_computer` |
| `partisan` | Partisan | 01 | `ambush`, `infiltration`, `stealth`, `survival`, `tactics` | `deception`, `evasion`, `initiative`, `perception`, `social` |
| `pilot` | Pilot | 01 | `pilot`, `pursuit`, `space`, `vehicle` | `initiative`, `mechanics`, `mobility`, `perception`, `tactics`, `teamwork` |
| `astrogator` | Astrogator | 02 | `exploration`, `pilot`, `space`, `use_computer` | `knowledge`, `perception`, `vehicle` |
| `racer` | Racer | 02 | `initiative`, `pilot`, `pursuit`, `vehicle` | `mobility`, `movement`, `perception`, `space` |
| `disaster_responder` | Disaster Responder | 02 | `ally_support`, `recovery`, `support`, `survivability`, `treat_injury` | `endurance`, `healing`, `mechanics`, `medical`, `perception`, `repair`, `survival` |
| `explorer` | Explorer | 02 | `exploration`, `perception`, `survival` | `endurance`, `knowledge`, `mobility`, `pilot`, `space`, `vehicle` |
| `pathfinder` | Pathfinder | 02 | `exploration`, `mobility`, `perception`, `survival` | `endurance`, `evasion`, `stealth`, `support`, `survivability` |
| `survivalist` | Survivalist | 02 | `endurance`, `resilience`, `survivability`, `survival` | `climb`, `mobility`, `perception`, `recovery`, `swim` |
| `search_and_rescue_specialist` | Search-and-Rescue Specialist | 02 | `ally_support`, `perception`, `recovery`, `support`, `survival`, `tracking` | `endurance`, `healing`, `medical`, `pilot`, `survivability`, `treat_injury` |
| `first_contact_specialist` | First-Contact Specialist | 02 | `exploration`, `knowledge`, `persuasion`, `social` | `gather_information`, `perception`, `support` |
| `galactic_archaeologist` | Galactic Archaeologist | 02 | `exploration`, `investigation`, `knowledge`, `perception` | `survival`, `use_computer` |
| `prospector` | Prospector | 02 | `exploration`, `perception`, `survival` | `endurance`, `knowledge`, `mechanics`, `mobility` |
| `naturalist` | Naturalist | 02 | `exploration`, `knowledge`, `perception`, `survival` | `beast`, `treat_injury` |
| `colony_pioneer` | Colony Pioneer | 02 | `crafting`, `mechanics`, `support`, `survival` | `ally_support`, `endurance`, `leadership`, `repair`, `survivability`, `tech` |
| `beast_hunter` | Beast Hunter | 02 | `beast`, `perception`, `pursuit`, `survival`, `tracking` | `endurance`, `initiative`, `precision`, `ranged`, `stealth`, `targeting` |
| `beast_handler` | Beast Handler | 02 | `beast`, `perception`, `survival` | `beast_companion`, `persuasion`, `ride`, `support` |
| `beast_rider` | Beast Rider | 02 | `beast`, `mount`, `ride`, `rider`, `survival` | `endurance`, `initiative`, `mobility`, `movement`, `perception` |
| `devaronian_wanderer` | Devaronian Wanderer | 02 | `exploration`, `mobility`, `perception`, `survival` | `endurance`, `mechanics`, `pilot`, `survivability`, `tech` |
| `blazing_chain_raider` | Blazing Chain Raider | 02 | `force`, `force_power`, `force_training`, `pilot`, `space` | `damage`, `fear`, `intimidation`, `social`, `vehicle` |
| `salvager` | Salvager | 02 | `equipment`, `exploration`, `mechanics`, `repair`, `tech` | `crafting`, `droid`, `modification`, `perception`, `survival`, `use_computer` |
| `scavenger_droid` | Scavenger Droid | 02 | `droid`, `jury_rig`, `mechanics`, `repair`, `survivability`, `tech` | `crafting`, `equipment`, `modification`, `perception`, `survival`, `use_computer` |
| `jawa_sandcrawler_salvager` | Jawa Sandcrawler Salvager | 02 | `equipment`, `jury_rig`, `mechanics`, `repair`, `tech` | `crafting`, `modification`, `perception`, `survival`, `use_computer`, `vehicle` |
| `skip_tracer` | Skip Tracer | 03 | `gather_information`, `investigation`, `perception`, `pursuit`, `tracking` | `deception`, `knowledge`, `social`, `use_computer` |
| `gand_findsman` | Gand Findsman | 03 | `force`, `force_power`, `perception`, `precognition`, `tracking` | `force_training`, `pursuit`, `survival`, `use_the_force`, `visions` |
| `ubese_masked_hunter` | Ubese Masked Hunter | 03 | `perception`, `pursuit`, `ranged`, `survival`, `tracking` | `initiative`, `precision`, `stealth`, `targeting`, `use_computer` |
| `shistavanen_tracker` | Shistavanen Tracker | 03 | `perception`, `pursuit`, `survival`, `tracking` | `endurance`, `initiative`, `mobility`, `stealth` |
| `trianii_ranger` | Trianii Ranger | 03 | `pilot`, `pursuit`, `tactics`, `vehicle` | `initiative`, `perception`, `ranged`, `survival` |
| `kiffu_guardian` | Kiffu Guardian | 03 | `investigation`, `perception`, `pursuit` | `defense`, `initiative`, `leadership`, `persuasion`, `resilience`, `social`, `survival`, `will_defense` |
| `defel_shadow_operative` | Defel Shadow Operative | 03 | `concealment`, `infiltration`, `stealth` | `deception`, `perception`, `precision`, `ranged`, `use_computer` |
| `seyugi_dervish` | Seyugi Dervish | 03 | `dark_side`, `force`, `force_power`, `martial_arts`, `stealth`, `unarmed` | `fear`, `force_training`, `mobility`, `precision`, `use_the_force` |
| `recon_scout` | Recon Scout | 03 | `perception`, `recon`, `stealth`, `tactics` | `initiative`, `leadership`, `survival`, `teamwork` |
| `polis_massan_field_medic` | Polis Massan Field Medic | 03 | `ally_support`, `healing`, `medical`, `support`, `treat_injury` | `endurance`, `knowledge`, `medicine`, `perception`, `recovery`, `survivability` |
| `demolitions_specialist` | Demolitions Specialist | 03 | `burst_damage`, `mechanics`, `setup`, `tech`, `trap` | `cover`, `crafting`, `equipment`, `infiltration`, `stealth`, `use_computer` |
| `guerrilla` | Guerrilla | 03 | `ambush`, `infiltration`, `stealth`, `survival`, `tactics` | `deception`, `evasion`, `initiative`, `planning`, `recon`, `teamwork` |
| `ace_pilot` | Ace Pilot | 03 | `evasion`, `pilot`, `pursuit`, `space`, `vehicle` | `initiative`, `mobility`, `tactics` |
| `squadron_leader` | Squadron Leader | 03 | `command`, `leadership`, `pilot`, `tactics`, `teamwork` | `ally_support`, `initiative`, `persuasion`, `space`, `support`, `vehicle` |
| `test_pilot` | Test Pilot | 03 | `mechanics`, `pilot`, `tech`, `vehicle` | `equipment`, `initiative`, `perception`, `use_computer` |
| `gunship_pilot` | Gunship Pilot | 03 | `heavy_weapon`, `pilot`, `ranged`, `tactics`, `vehicle` | `initiative`, `offense_ranged`, `perception`, `space`, `targeting` |
| `bush_pilot` | Bush Pilot | 03 | `exploration`, `pilot`, `survival`, `vehicle` | `mechanics`, `mobility`, `perception`, `repair`, `space` |
| `pilot_droid` | Pilot Droid | 03 | `droid`, `pilot`, `tech`, `use_computer`, `vehicle` | `initiative`, `mechanics`, `modification`, `perception` |
| `iktotchi_precognitive_pilot` | Iktotchi Precognitive Pilot | 03 | `force`, `force_power`, `pilot`, `precognition`, `vehicle` | `force_training`, `initiative`, `perception`, `space`, `use_the_force`, `visions` |
| `unknown_regions_navigator` | Unknown Regions Navigator | 03 | `exploration`, `galactic_lore`, `pilot`, `space`, `survival` | `knowledge`, `perception`, `vehicle` |
| `chiss_sky_walker` | Chiss Sky-walker | 04 | `force`, `force_power`, `precognition`, `space`, `use_the_force`, `visions` | `exploration`, `force_training`, `galactic_lore`, `perception`, `pilot` |
| `givin_astrogator` | Givin Astrogator | 04 | `knowledge`, `science`, `space`, `use_computer` | `exploration`, `galactic_lore`, `perception`, `pilot` |
| `duros_hyperspace_trailblazer` | Duros Hyperspace Trailblazer | 04 | `exploration`, `pilot`, `space`, `use_computer` | `galactic_lore`, `perception`, `pursuit`, `survival`, `vehicle` |
| `sullustan_rebel_navigator` | Sullustan Rebel Navigator | 04 | `pilot`, `space`, `tactics`, `use_computer` | `galactic_lore`, `perception`, `teamwork`, `vehicle` |
| `hotshot_racer` | Hotshot Racer | 04 | `initiative`, `pilot`, `pursuit`, `vehicle` | `deception`, `mobility`, `movement`, `perception` |
| `swoop_racer` | Swoop Racer | 04 | `initiative`, `movement`, `pilot`, `pursuit`, `vehicle` | `endurance`, `mobility`, `perception` |
| `verpine_hive_engineer` | Verpine Hive Engineer | 04 | `crafting`, `mechanics`, `modification`, `repair`, `tech` | `knowledge`, `science`, `teamwork`, `use_computer` |
| `sluissi_shipwright` | Sluissi Shipwright | 04 | `crafting`, `mechanics`, `modification`, `repair`, `space`, `tech` | `knowledge`, `pilot`, `use_computer`, `vehicle` |
| `deep_space_surveyor` | Deep Space Surveyor | 04 | `exploration`, `perception`, `science`, `space` | `knowledge`, `pilot`, `survival`, `vehicle` |
| `wilderness_guide` | Wilderness Guide | 04 | `exploration`, `perception`, `support`, `survival` | `endurance`, `knowledge`, `ride`, `survivability`, `tracking` |
| `antarian_ranger` | Antarian Ranger | 04 | `ally_support`, `recon`, `support`, `survival`, `teamwork` | `initiative`, `perception`, `stealth`, `tactics`, `tracking` |
| `relic_hunter` | Relic Hunter | 04 | `exploration`, `investigation`, `perception`, `pursuit` | `galactic_lore`, `stealth`, `survival`, `use_computer` |
| `trandoshan_jagannath_hunter` | Trandoshan Jagannath Hunter | 04 | `perception`, `pursuit`, `survival`, `tracking` | `climb`, `endurance`, `initiative`, `ranged`, `resilience`, `targeting` |
| `togruta_pack_hunter` | Togruta Pack Hunter | 04 | `flanking`, `perception`, `survival`, `teamwork`, `tracking` | `initiative`, `pursuit`, `ranged`, `stealth` |
| `rodian_great_hunter` | Rodian Great Hunter | 04 | `perception`, `pursuit`, `survival`, `tracking` | `initiative`, `ranged`, `stealth`, `targeting` |
| `barabel_great_hunter` | Barabel Great Hunter | 04 | `perception`, `pursuit`, `resilience`, `survival`, `tracking` | `climb`, `endurance`, `initiative`, `ranged` |
| `tusken_bantha_rider` | Tusken Bantha Rider | 04 | `beast`, `mount`, `ride`, `rider`, `survival` | `endurance`, `initiative`, `perception`, `resilience` |
| `gungan_kaadu_cavalier` | Gungan Kaadu Cavalier | 04 | `beast`, `mount`, `ride`, `rider` | `initiative`, `mobility`, `movement`, `perception`, `survival` |
| `aing_tii_monk` | Aing-Tii Monk | 04 | `force`, `force_power`, `mobility`, `space`, `use_the_force` | `exploration`, `force_training`, `telekinesis`, `visions`, `will_defense` |
| `force_pilgrim` | Force Pilgrim | 04 | `exploration`, `force`, `force_power`, `survival`, `use_the_force` | `force_training`, `galactic_lore`, `perception`, `resilience`, `visions` |
| `force_hermit` | Force Hermit | 05 | `force`, `force_power`, `resilience`, `survival`, `use_the_force` | `endurance`, `force_training`, `galactic_lore`, `meditation`, `perception` |
| `warden_of_the_sky` | Warden of the Sky | 05 | `force`, `force_power`, `pilot`, `space`, `unarmed` | `force_training`, `martial_arts`, `mobility`, `stealth`, `survival`, `use_the_force` |
| `nightsister` | Nightsister | 05 | `dark_side`, `force`, `force_power`, `spellcasting`, `use_the_force` | `beast`, `fear`, `force_training`, `stealth`, `survival` |
| `smuggler` | Smuggler | 05 | `deception`, `pilot`, `social`, `space` | `gather_information`, `mechanics`, `persuasion`, `use_computer`, `vehicle` |
| `free_trader` | Free Trader | 05 | `knowledge`, `persuasion`, `social` | `deception`, `gather_information`, `pilot`, `use_computer`, `vehicle` |
| `pirate` | Pirate | 05 | `intimidation`, `pilot`, `pursuit`, `space` | `deception`, `fear`, `initiative`, `ranged`, `social`, `vehicle` |
| `gambler` | Gambler | 05 | `deception`, `perception`, `social` | `gather_information`, `persuasion`, `reliability`, `reroll` |
| `con_artist` | Con Artist | 05 | `deception`, `manipulation`, `persuasion`, `social` | `gather_information`, `intrigue`, `knowledge`, `perception` |
| `fixer` | Fixer | 05 | `gather_information`, `intrigue`, `persuasion`, `social_network` | `deception`, `knowledge`, `social`, `use_computer` |
| `information_broker` | Information Broker | 05 | `gather_information`, `intrigue`, `social_network`, `use_computer` | `deception`, `knowledge`, `perception`, `social`, `tech` |
| `gunslinger` | Gunslinger | 05 | `initiative`, `pistol`, `precision`, `ranged` | `damage`, `mobility`, `perception`, `targeting` |
| `courier` | Courier | 05 | `mobility`, `movement`, `pilot`, `vehicle` | `initiative`, `perception`, `space`, `survival`, `use_computer` |
| `spy` | Spy | 05 | `deception`, `infiltration`, `stealth` | `concealment`, `gather_information`, `perception`, `persuasion`, `social`, `use_computer` |
| `slicer` | Slicer | 05 | `slicing`, `tech`, `use_computer` | `knowledge`, `mechanics`, `perception` |
| `assassin` | Assassin | 05 | `ambush`, `infiltration`, `precision`, `stealth`, `targeting` | `concealment`, `deception`, `initiative`, `perception`, `ranged` |
| `mechanic` | Mechanic | 05 | `mechanics`, `repair`, `tech` | `crafting`, `droid`, `equipment`, `jury_rig`, `modification`, `use_computer` |
| `outlaw_tech` | Outlaw Tech | 05 | `jury_rig`, `mechanics`, `modification`, `tech`, `use_computer` | `crafting`, `deception`, `equipment`, `repair`, `slicing` |
| `droidsmith` | Droidsmith | 05 | `crafting`, `droid`, `mechanics`, `modification`, `repair`, `tech` | `equipment`, `use_computer` |
| `inventor` | Inventor | 05 | `crafting`, `equipment`, `mechanics`, `modification`, `tech` | `knowledge`, `science`, `use_computer` |
| `electronic_warfare_specialist` | Electronic Warfare Specialist | 05 | `control`, `slicing`, `tech`, `use_computer` | `initiative`, `mechanics`, `perception`, `sensors` |
| `shipwright` | Shipwright | 06 | `crafting`, `mechanics`, `repair`, `space`, `tech` | `modification`, `pilot`, `use_computer`, `vehicle` |
| `entertainer` | Entertainer | 06 | `persuasion`, `social` | `acrobatics`, `deception`, `gather_information`, `perception` |
| `blockade_runner` | Blockade Runner | 06 | `evasion`, `pilot`, `pursuit`, `space`, `vehicle` | `deception`, `initiative`, `mobility`, `use_computer` |
| `jawa_droid_peddler` | Jawa Droid Peddler | 06 | `droid`, `equipment`, `mechanics`, `persuasion`, `social` | `gather_information`, `modification`, `repair`, `tech`, `use_computer` |
| `herglic_free_trader` | Herglic Free Trader | 06 | `exploration`, `gather_information`, `persuasion`, `social` | `knowledge`, `pilot`, `resilience`, `social_network`, `vehicle` |
| `toydarian_junk_merchant` | Toydarian Junk Merchant | 06 | `equipment`, `persuasion`, `social` | `deception`, `gather_information`, `knowledge`, `tech` |
| `privateer` | Privateer | 06 | `pilot`, `space`, `tactics`, `vehicle` | `initiative`, `leadership`, `persuasion`, `ranged`, `teamwork` |
| `weequay_pirate_captain` | Weequay Pirate Captain | 06 | `intimidation`, `leadership`, `pilot`, `space` | `deception`, `fear`, `initiative`, `persuasion`, `vehicle` |
| `zygerrian_corsair` | Zygerrian Corsair | 06 | `intimidation`, `leadership`, `pilot`, `space` | `control`, `deception`, `fear`, `initiative`, `persuasion`, `teamwork`, `vehicle` |
| `squib_salvage_broker` | Squib Salvage Broker | 06 | `equipment`, `gather_information`, `mechanics`, `persuasion`, `social` | `modification`, `perception`, `repair`, `tech`, `use_computer` |
| `fence` | Fence | 06 | `deception`, `gather_information`, `intrigue`, `social_network` | `knowledge`, `perception`, `persuasion`, `social` |
| `ryn_network_gatherer` | Ryn Network Gatherer | 06 | `gather_information`, `network`, `social_network` | `deception`, `knowledge`, `perception`, `social`, `use_computer` |
| `undercover_lawman` | Undercover Lawman | 06 | `deception`, `infiltration`, `investigation` | `gather_information`, `perception`, `persuasion`, `social`, `stealth` |
| `imperial_agent` | Imperial Agent | 06 | `deception`, `infiltration`, `stealth` | `gather_information`, `perception`, `social`, `use_computer` |
| `rebel_operative` | Rebel Operative | 06 | `infiltration`, `recon`, `stealth` | `deception`, `gather_information`, `perception`, `survival`, `tactics` |
| `emperors_hand` | Emperor's Hand | 06 | `dark_side`, `force`, `force_power`, `infiltration`, `stealth`, `use_the_force` | `deception`, `force_training`, `initiative`, `perception`, `precision` |
| `bothan_spynet_operative` | Bothan SpyNet Operative | 06 | `deception`, `gather_information`, `infiltration`, `network`, `stealth` | `perception`, `social_network`, `use_computer` |
| `clawdite_facechanger_operative` | Clawdite Facechanger Operative | 06 | `deception`, `infiltration`, `stealth` | `gather_information`, `manipulation`, `perception`, `persuasion`, `social` |
| `slicer_droid` | Slicer Droid | 06 | `droid`, `slicing`, `tech`, `use_computer` | `ion`, `mechanics`, `modification`, `perception` |
| `freighter_captain` | Freighter Captain | 06 | `leadership`, `pilot`, `space`, `teamwork`, `vehicle` | `persuasion`, `support`, `use_computer` |
| `salvage_engineer` | Salvage Engineer | 07 | `equipment`, `jury_rig`, `mechanics`, `repair`, `tech` | `crafting`, `modification`, `perception`, `survival`, `use_computer` |
| `repair_droid` | Repair Droid | 07 | `droid`, `mechanics`, `repair`, `tech`, `use_computer` | `equipment`, `ion`, `jury_rig`, `modification`, `perception` |
| `crime_boss` | Crime Boss | 07 | `intrigue`, `leadership`, `minion`, `social` | `deception`, `fear`, `gather_information`, `persuasion`, `social_network` |
| `cantina_proprietor` | Cantina Proprietor | 07 | `gather_information`, `perception`, `persuasion`, `social`, `social_network` | `deception`, `intrigue`, `knowledge` |
| `investigator` | Investigator | 07 | `gather_information`, `investigation`, `perception` | `knowledge`, `planning`, `persuasion`, `use_computer` |
| `spymaster` | Spymaster | 07 | `intrigue`, `leadership`, `planning`, `social_network` | `deception`, `gather_information`, `infiltration`, `persuasion`, `tactics`, `use_computer` |
| `journalist` | Journalist | 07 | `gather_information`, `investigation`, `persuasion`, `social` | `knowledge`, `perception`, `use_computer` |
| `naval_officer` | Naval Officer | 07 | `command`, `leadership`, `space`, `tactics`, `teamwork` | `ally_support`, `knowledge`, `persuasion`, `pilot`, `support`, `vehicle` |
| `fleet_strategist` | Fleet Strategist | 07 | `command`, `planning`, `space`, `tactics` | `ally_support`, `knowledge`, `leadership`, `perception`, `support`, `teamwork`, `use_computer` |
| `quartermaster` | Quartermaster | 07 | `equipment`, `knowledge`, `support` | `ally_support`, `mechanics`, `perception`, `persuasion`, `tech`, `use_computer` |
| `resistance_leader` | Resistance Leader | 07 | `leadership`, `persuasion`, `social`, `support` | `ally_support`, `deception`, `gather_information`, `tactics`, `teamwork` |
| `ship_captain` | Ship Captain | 07 | `command`, `leadership`, `pilot`, `space`, `vehicle` | `ally_support`, `persuasion`, `support`, `teamwork`, `use_computer` |
| `cyberneticist` | Cyberneticist | 07 | `implant`, `mechanics`, `medical`, `tech` | `knowledge`, `medicine`, `modification`, `perception`, `treat_injury` |
| `scientist` | Scientist | 07 | `knowledge`, `science` | `perception`, `tech`, `use_computer` |
| `doctor` | Doctor | 07 | `ally_support`, `healing`, `medicine`, `support`, `treat_injury` | `knowledge`, `medical`, `perception` |
| `activist` | Activist | 07 | `gather_information`, `persuasion`, `social` | `deception`, `leadership`, `manipulation` |
| `aristocrat` | Aristocrat | 07 | `leadership`, `persuasion`, `resources`, `social` | `deception`, `intrigue`, `knowledge`, `social_network` |
| `bureaucrat` | Bureaucrat | 07 | `knowledge`, `social` | `intrigue`, `persuasion`, `use_computer` |
| `celebrity` | Celebrity | 07 | `deception`, `persuasion`, `social` | `gather_information`, `manipulation`, `perception` |
| `community_leader` | Community Leader | 07 | `ally_support`, `leadership`, `persuasion`, `social`, `support` | `gather_information`, `morale`, `perception`, `teamwork` |
| `corporate_operator` | Corporate Operator | 08 | `intrigue`, `leadership`, `persuasion`, `social` | `deception`, `gather_information`, `knowledge`, `social_network`, `use_computer` |
| `courtier` | Courtier | 08 | `deception`, `intrigue`, `persuasion`, `social` | `gather_information`, `manipulation`, `perception` |
| `diplomat` | Diplomat | 08 | `knowledge`, `persuasion`, `social` | `gather_information`, `leadership`, `perception`, `reliability` |
| `educator` | Educator | 08 | `ally_support`, `knowledge`, `support` | `persuasion`, `skill_mastery` |
| `merchant_prince` | Merchant Prince | 08 | `leadership`, `minion`, `persuasion`, `social` | `deception`, `gather_information`, `intrigue`, `social_network` |
| `planetary_governor` | Planetary Governor | 08 | `leadership`, `persuasion`, `social` | `intrigue`, `knowledge`, `perception`, `social_network` |
| `propagandist` | Propagandist | 08 | `deception`, `manipulation`, `persuasion`, `social` | `gather_information`, `intrigue`, `planning`, `use_computer` |
| `revolutionary_statesman` | Revolutionary Statesman | 08 | `leadership`, `persuasion`, `social`, `support` | `ally_support`, `gather_information`, `intrigue`, `morale` |
| `spiritual_leader` | Spiritual Leader | 08 | `ally_support`, `leadership`, `persuasion`, `social`, `support` | `knowledge`, `morale`, `perception` |
| `dark_side_cultist` | Dark-Side Cultist | 08 | `dark_side`, `force`, `force_power`, `force_training`, `talisman`, `use_the_force` | `deception`, `fear`, `manipulation`, `persuasion`, `social` |
| `force_mystic` | Force Mystic | 08 | `force`, `force_power`, `force_training`, `meditation`, `use_the_force` | `force_support`, `galactic_lore`, `perception`, `precognition`, `telepathy`, `visions` |
| `force_seer` | Force Seer | 08 | `force`, `force_power`, `force_training`, `perception`, `precognition`, `use_the_force`, `visions` | `force_support`, `galactic_lore`, `telepathy`, `tracking` |
| `force_witch` | Force Witch | 08 | `force`, `force_power`, `force_training`, `nature`, `survival`, `use_the_force` | `deception`, `healing`, `perception`, `telepathy`, `tracking` |
| `falleen_black_sun_noble` | Falleen Black Sun Noble | 08 | `intrigue`, `leadership`, `social`, `social_network` | `deception`, `fear`, `gather_information`, `persuasion`, `tactics` |
| `hutt_kajidic_lorda` | Hutt Kajidic Lorda | 08 | `intrigue`, `leadership`, `social`, `social_network` | `deception`, `fear`, `gather_information`, `persuasion`, `planning` |
| `forensic_specialist` | Forensic Specialist | 08 | `investigation`, `perception`, `science` | `gather_information`, `knowledge`, `planning`, `use_computer` |
| `counterintelligence_officer` | Counterintelligence Officer | 08 | `deception`, `infiltration`, `investigation` | `gather_information`, `perception`, `stealth`, `use_computer` |
| `handler` | Handler | 08 | `leadership`, `planning`, `social_network`, `support` | `ally_support`, `deception`, `gather_information`, `persuasion`, `tactics` |
| `investigative_journalist` | Investigative Journalist | 08 | `gather_information`, `investigation`, `perception`, `social` | `knowledge`, `persuasion`, `planning`, `use_computer` |
| `holonet_reporter` | HoloNet Reporter | 08 | `gather_information`, `persuasion`, `social` | `knowledge`, `perception`, `use_computer` |
| `war_correspondent` | War Correspondent | 09 | `gather_information`, `perception`, `survival` | `endurance`, `persuasion`, `social` |
| `chiss_expansionary_fleet_officer` | Chiss Expansionary Fleet Officer | 09 | `command`, `leadership`, `space`, `tactics`, `teamwork` | `ally_support`, `defense`, `perception`, `pilot`, `support` |
| `hapan_battle_dragon_officer` | Hapan Battle Dragon Officer | 09 | `command`, `leadership`, `pilot`, `space`, `tactics`, `vehicle` | `ally_support`, `perception`, `support`, `teamwork` |
| `mon_calamari_rebel_admiral` | Mon Calamari Rebel Admiral | 09 | `command`, `leadership`, `planning`, `space`, `tactics`, `teamwork` | `ally_support`, `perception`, `support`, `use_computer` |
| `logistics_officer` | Logistics Officer | 09 | `equipment`, `knowledge`, `support`, `use_computer` | `ally_support`, `mechanics`, `persuasion`, `tech` |
| `rebel_cell_leader` | Rebel Cell Leader | 09 | `leadership`, `persuasion`, `social_network`, `support` | `ally_support`, `deception`, `gather_information`, `manipulation`, `teamwork` |
| `underground_organizer` | Underground Organizer | 09 | `intrigue`, `leadership`, `planning`, `social_network` | `deception`, `gather_information`, `persuasion`, `stealth` |
| `droid_revolutionary` | Droid Revolutionary | 09 | `droid`, `leadership`, `persuasion`, `social`, `support` | `ally_support`, `deception`, `gather_information`, `use_computer` |
| `gree_technology_keeper` | Gree Technology Keeper | 09 | `knowledge`, `mechanics`, `tech` | `jury_rig`, `modification`, `perception`, `skill_mastery`, `use_computer` |
| `rakatan_force_tech_scion` | Rakatan Force-Tech Scion | 09 | `force`, `force_power`, `mechanics`, `tech`, `use_the_force` | `force_training`, `ion`, `jury_rig`, `telekinesis`, `use_computer`, `weapon_empowerment` |
| `mon_calamari_fleet_architect` | Mon Calamari Fleet Architect | 09 | `crafting`, `mechanics`, `space`, `tech`, `vehicle` | `knowledge`, `modification`, `perception`, `use_computer` |
| `xenobiologist` | Xenobiologist | 09 | `knowledge`, `nature`, `science` | `medicine`, `perception`, `survival`, `treat_injury` |
| `droid_behavioral_specialist` | Droid Behavioral Specialist | 09 | `droid`, `science`, `tech` | `knowledge`, `mechanics`, `perception`, `social`, `use_computer` |
| `yuuzhan_vong_shaper` | Yuuzhan Vong Shaper | 09 | `biotech`, `crafting`, `implant`, `modification`, `repair` | `knowledge`, `medical`, `medicine`, `science`, `treat_injury` |
| `kaminoan_cloner` | Kaminoan Cloner | 09 | `biotech`, `medical`, `science` | `knowledge`, `perception`, `treat_injury`, `use_computer` |
| `kaminoan_geneticist` | Kaminoan Geneticist | 09 | `biotech`, `knowledge`, `science` | `medical`, `perception`, `treat_injury`, `use_computer` |
| `arkanian_geneticist` | Arkanian Geneticist | 09 | `biotech`, `knowledge`, `science` | `medical`, `perception`, `tech`, `treat_injury` |
| `ssi_ruuk_entechment_technologist` | Ssi-Ruuk Entechment Technologist | 09 | `droid`, `power_systems`, `science`, `tech` | `knowledge`, `mechanics`, `perception`, `use_computer` |
| `celegian_philosopher_scientist` | Celegian Philosopher-Scientist | 09 | `knowledge`, `science`, `telepathy` | `perception`, `skill_mastery`, `social` |
| `surgeon` | Surgeon | 09 | `medical`, `medicine`, `treat_injury` | `ally_support`, `healing`, `knowledge`, `perception`, `skill_mastery`, `support` |
| `medical_droid` | Medical Droid | 10 | `droid`, `medical`, `medicine`, `treat_injury` | `ally_support`, `healing`, `mechanics`, `perception`, `support`, `use_computer` |
| `selkath_kolto_steward` | Selkath Kolto Steward | 10 | `healing`, `medicine`, `persuasion`, `social` | `ally_support`, `knowledge`, `medical`, `perception`, `support`, `treat_injury` |
| `academic_archaeologist` | Academic Archaeologist | 10 | `exploration`, `galactic_lore`, `investigation`, `knowledge` | `perception`, `use_computer` |
| `xenoarchaeologist` | Xenoarchaeologist | 10 | `exploration`, `galactic_lore`, `investigation`, `knowledge`, `science` | `nature`, `perception`, `survival` |
| `archaeological_expedition_leader` | Archaeological Expedition Leader | 10 | `exploration`, `investigation`, `knowledge`, `leadership` | `ally_support`, `galactic_lore`, `perception`, `persuasion`, `support`, `survival` |
| `droid_rights_activist` | Droid Rights Activist | 10 | `droid`, `persuasion`, `social` | `gather_information`, `knowledge`, `manipulation`, `use_computer` |
| `zygerrian_abolitionist` | Zygerrian Abolitionist | 10 | `gather_information`, `persuasion`, `social` | `deception`, `knowledge`, `manipulation`, `perception` |
| `hutt_kajidic_heir` | Hutt Kajidic Heir | 10 | `intrigue`, `leadership`, `social`, `social_network` | `deception`, `gather_information`, `persuasion` |
| `royal_heir` | Royal Heir | 10 | `leadership`, `persuasion`, `social` | `intrigue`, `knowledge`, `perception`, `social_network` |
| `hapan_court_noble` | Hapan Court Noble | 10 | `intrigue`, `persuasion`, `social` | `deception`, `leadership`, `perception`, `social_network` |
| `sith_pureblood_scion` | Sith Pureblood Scion | 10 | `leadership`, `persuasion`, `social` | `dark_side`, `force`, `force_power`, `force_training`, `galactic_lore`, `intrigue`, `perception`, `use_the_force` |
| `yuuzhan_vong_intendant` | Yuuzhan Vong Intendant | 10 | `deception`, `intrigue`, `persuasion`, `social` | `gather_information`, `leadership`, `resources`, `social_network` |
| `holostar` | Holostar | 10 | `deception`, `persuasion`, `social` | `gather_information`, `manipulation`, `perception` |
| `mandalorian_clan_leader` | Mandalorian Clan Leader | 10 | `command`, `leadership`, `tactics`, `teamwork` | `ally_support`, `endurance`, `persuasion`, `support` |
| `ithorian_herdship_steward` | Ithorian Herdship Steward | 10 | `leadership`, `nature`, `persuasion`, `support` | `ally_support`, `knowledge`, `perception`, `survival`, `teamwork` |
| `corporate_agent` | Corporate Agent | 10 | `intrigue`, `leadership`, `persuasion`, `social_network` | `deception`, `gather_information`, `knowledge`, `social`, `use_computer` |
| `corporate_troubleshooter` | Corporate Troubleshooter | 10 | `control`, `gather_information`, `investigation` | `knowledge`, `leadership`, `perception`, `persuasion`, `use_computer` |
| `quarren_deep_sea_industrialist` | Quarren Deep Sea Industrialist | 10 | `leadership`, `social`, `tech` | `knowledge`, `persuasion`, `social_network`, `use_computer` |
| `geonosian_foundry_master` | Geonosian Foundry Master | 10 | `crafting`, `droid`, `leadership`, `mechanics`, `tech` | `equipment`, `knowledge`, `use_computer` |
| `neimoidian_trade_viceroy` | Neimoidian Trade Viceroy | 10 | `intrigue`, `leadership`, `persuasion`, `social` | `deception`, `gather_information`, `knowledge`, `social_network` |
| `skakoan_techno_union_technocrat` | Skakoan Techno Union Technocrat | 11 | `knowledge`, `leadership`, `tech` | `ally_support`, `control`, `intrigue`, `persuasion`, `resources`, `skill_mastery`, `social`, `support`, `use_computer` |
| `koorivar_corporate_magnate` | Koorivar Corporate Magnate | 11 | `intrigue`, `leadership`, `persuasion`, `social_network` | `ally_support`, `control`, `deception`, `gather_information`, `knowledge`, `social`, `support` |
| `political_fixer` | Political Fixer | 11 | `gather_information`, `intrigue`, `manipulation`, `persuasion`, `social_network` | `deception`, `perception`, `social` |
| `hutt_majordomo` | Hutt Majordomo | 11 | `intrigue`, `manipulation`, `persuasion`, `social` | `deception`, `gather_information`, `knowledge`, `social_network` |
| `chiss_house_agent` | Chiss House Agent | 11 | `deception`, `gather_information`, `intrigue`, `social` | `knowledge`, `manipulation`, `persuasion`, `social_network` |
| `zeltron_empathic_courtier` | Zeltron Empathic Courtier | 11 | `manipulation`, `perception`, `persuasion`, `social` | `deception`, `gather_information` |
| `negotiator` | Negotiator | 11 | `manipulation`, `persuasion`, `social` | `knowledge`, `perception` |
| `mediator` | Mediator | 11 | `ally_support`, `persuasion`, `social`, `support` | `gather_information`, `knowledge`, `manipulation`, `perception` |
| `protocol_droid` | Protocol Droid | 11 | `droid`, `knowledge`, `persuasion`, `social` | `ally_support`, `gather_information`, `support`, `use_computer` |
| `senator` | Senator | 11 | `intrigue`, `leadership`, `persuasion`, `social` | `ally_support`, `gather_information`, `knowledge`, `social_network`, `support` |
| `caamasi_memory_keeper` | Caamasi Memory Keeper | 11 | `knowledge`, `telepathy` | `ally_support`, `galactic_lore`, `perception`, `persuasion`, `support` |
| `anomid_technical_diplomat` | Anomid Technical Diplomat | 11 | `knowledge`, `persuasion`, `social`, `tech` | `ally_support`, `perception`, `skill_mastery`, `support`, `use_computer` |
| `bith_virtuoso` | Bith Virtuoso | 11 | `perception`, `persuasion`, `social` | `deception`, `knowledge`, `reliability`, `reroll` |
| `muun_banking_magnate` | Muun Banking Magnate | 11 | `knowledge`, `persuasion`, `resources`, `social` | `gather_information`, `reliability`, `reroll`, `social_network`, `use_computer` |
| `yuuzhan_vong_priest` | Yuuzhan Vong Priest | 11 | `ally_support`, `leadership`, `persuasion`, `social`, `support` | `deception`, `galactic_lore`, `manipulation`, `perception` |
| `kissai_dark_priest` | Kissai Dark Priest | 11 | `alchemy`, `dark_side`, `force`, `force_power`, `use_the_force` | `fear`, `force_training`, `galactic_lore`, `persuasion`, `social` |
| `tyia_adept` | Tyia Adept | 11 | `ally_support`, `force`, `force_support`, `healing`, `support`, `use_the_force` | `force_defense`, `force_power`, `force_training`, `perception`, `treat_injury` |
| `fallanassi_adept` | Fallanassi Adept | 11 | `force`, `illusion`, `stealth`, `use_the_force` | `concealment`, `deception`, `force_power`, `force_training`, `perception` |
| `baran_do_sage` | Baran Do Sage | 11 | `force`, `investigation`, `perception`, `precognition`, `use_the_force`, `visions` | `force_power`, `force_training`, `knowledge`, `telepathy` |
| `miraluka_force_seer` | Miraluka Force Seer | 11 | `force`, `perception`, `precognition`, `senses`, `use_the_force`, `visions` | `force_power`, `force_training`, `galactic_lore`, `telepath`, `telepathy` |
| `enforcer` | Enforcer | 12 | `investigation`, `persuasion`, `pursuit`, `social` | `endurance`, `evasion`, `perception`, `ranged`, `survivability` |
| `security_specialist` | Security Specialist | 12 | `ally_support`, `perception`, `support`, `tech`, `use_computer` | `control`, `mechanics`, `nonlethal`, `stun`, `survivability` |
| `bodyguard` | Bodyguard | 12 | `ally_support`, `perception`, `support`, `survivability` | `endurance`, `melee`, `mobility`, `positioning`, `weapon_training` |
| `mercenary` | Mercenary | 12 | `endurance`, `initiative`, `melee`, `survivability` | `ally_support`, `damage_threshold`, `perception`, `support`, `survival`, `weapon_specialization` |
| `commando` | Commando | 12 | `infiltration`, `perception`, `recon`, `stealth` | `initiative`, `mechanics`, `survival`, `teamwork`, `trap` |
| `veteran` | Veteran | 12 | `endurance`, `perception`, `resilience`, `survivability` | `ally_support`, `initiative`, `mobility`, `support`, `teamwork` |
| `warrior` | Warrior | 12 | `endurance`, `melee`, `resilience`, `survivability` | `control`, `initiative`, `perception`, `ranged`, `weapon_specialization` |
| `combat_medic` | Combat Medic | 12 | `ally_support`, `healing`, `medical`, `medicine`, `support`, `treat_injury` | `endurance`, `knowledge`, `perception`, `recovery`, `survivability` |
| `combat_engineer` | Combat Engineer | 12 | `mechanics`, `modification`, `repair`, `tech` | `ally_support`, `crafting`, `equipment`, `knowledge`, `support`, `use_computer`, `vehicle` |
| `field_commander` | Field Commander | 12 | `ally_support`, `command`, `leadership`, `support`, `tactics`, `teamwork` | `knowledge`, `morale`, `perception`, `persuasion`, `social` |
| `starship_gunner` | Starship Gunner | 12 | `ranged`, `space`, `targeting`, `vehicle` | `initiative`, `perception`, `precision`, `teamwork` |
| `armorer` | Armorer | 12 | `armor`, `equipment`, `mechanics`, `modification`, `tech` | `crafting`, `defense`, `knowledge`, `repair`, `use_computer` |
| `warrior_priest` | Warrior-Priest | 12 | `melee`, `perception`, `persuasion`, `social` | `force`, `force_defense`, `force_power`, `force_support`, `force_training`, `knowledge` |
| `force_warrior` | Force Warrior | 12 | `force`, `force_offense`, `force_power`, `force_training`, `melee`, `use_the_force` | `force_defense`, `initiative`, `martial_arts`, `mobility`, `resilience`, `telekinesis` |
| `syndicate_enforcer` | Syndicate Enforcer | 12 | `nonlethal`, `persuasion`, `social`, `stun` | `control`, `endurance`, `fear`, `intimidation`, `survivability` |
| `koorivar_fusilier` | Koorivar Fusilier | 12 | `ally_support`, `cover`, `ranged`, `support` | `evasion`, `mechanics`, `perception`, `survivability`, `tech` |
| `diplomatic_security_agent` | Diplomatic Security Agent | 12 | `ally_support`, `perception`, `persuasion`, `support` | `gather_information`, `knowledge`, `nonlethal`, `positioning`, `social`, `stun` |
| `imperial_royal_guard` | Imperial Royal Guard | 12 | `ally_support`, `melee`, `support`, `survivability` | `damage_threshold`, `endurance`, `mobility`, `perception`, `positioning`, `weapon_training` |
| `hapan_royal_guard` | Hapan Royal Guard | 12 | `ally_support`, `leadership`, `melee`, `support` | `endurance`, `full_attack`, `perception`, `persuasion`, `social`, `survivability` |
| `wookiee_life_debt_protector` | Wookiee Life-Debt Protector | 12 | `ally_support`, `endurance`, `support`, `survivability` | `melee`, `mobility`, `perception`, `positioning`, `survival`, `weapon_training` |
| `gamorrean_clan_guard` | Gamorrean Clan Guard | 12 | `ally_support`, `endurance`, `melee`, `support` | `cover`, `perception`, `survivability`, `weapon_training` |
| `noghri_honor_bodyguard` | Noghri Honor Bodyguard | 12 | `ally_support`, `melee`, `perception`, `support` | `control`, `endurance`, `full_attack`, `heavy_weapon`, `survivability`, `survival` |
| `assassin_droid` | Assassin Droid | 12 | `ambush`, `droid`, `precision_damage`, `stealth` | `defense`, `infiltration`, `perception`, `tech`, `use_computer` |
| `morgukai_warrior` | Morgukai Warrior | 12 | `anti-force`, `endurance`, `martial_arts`, `melee`, `perception` | `concealment`, `detection`, `evasion`, `senses`, `stealth`, `survival`, `weapon_specialization` |
| `breacher` | Breacher | 12 | `infiltration`, `mechanics`, `melee`, `tech` | `ally_support`, `endurance`, `mobility`, `positioning`, `ranged`, `support`, `vehicle` |
| `boarding_marine` | Boarding Marine | 12 | `endurance`, `initiative`, `melee`, `space`, `teamwork` | `ally_support`, `defense`, `perception`, `support`, `survivability` |
| `shock_trooper` | Shock Trooper | 12 | `ally_support`, `ranged`, `support`, `teamwork` | `cover`, `damage_threshold`, `defense`, `offense_ranged`, `perception`, `survivability` |
| `noghri_death_commando` | Noghri Death Commando | 12 | `ambush`, `infiltration`, `perception`, `recon`, `stealth` | `mechanics`, `ranged`, `survival`, `teamwork`, `trap` |
| `battle_droid_veteran` | Battle Droid Veteran | 12 | `droid`, `endurance`, `perception`, `self_repair`, `survivability` | `initiative`, `recovery`, `repair`, `tactics`, `trap` |
| `clone_veteran` | Clone Veteran | 12 | `endurance`, `perception`, `survivability`, `tactics` | `ally_support`, `evasion`, `initiative`, `support`, `teamwork`, `treat_injury` |
| `mandalorian_warrior` | Mandalorian Warrior | 12 | `endurance`, `initiative`, `melee`, `mobility` | `damage_threshold`, `defense`, `perception`, `tactics`, `weapon_specialization` |
| `clan_champion` | Clan Champion | 12 | `control`, `endurance`, `initiative`, `melee` | `full_attack`, `mind-affecting`, `perception`, `weapon_training` |
| `yuuzhan_vong_warrior` | Yuuzhan Vong Warrior | 12 | `anti-force`, `endurance`, `initiative`, `melee`, `resilience` | `biotech`, `control`, `perception`, `weapon_training` |
| `tusken_tribal_warrior` | Tusken Tribal Warrior | 12 | `endurance`, `initiative`, `melee` | `control`, `mobility`, `perception`, `ranged`, `weapon_training` |
| `wookiee_clan_champion` | Wookiee Clan Champion | 12 | `control`, `endurance`, `grapple`, `melee` | `damage_threshold`, `initiative`, `mobility`, `perception`, `survivability` |
| `cathar_clan_warrior` | Cathar Clan Warrior | 12 | `endurance`, `initiative`, `melee`, `offense_melee` | `damage_threshold`, `mobility`, `perception`, `weapon_specialization` |
| `nagai_duelist` | Nagai Duelist | 12 | `full_attack`, `initiative`, `melee`, `weapon_specialization` | `control`, `perception`, `ranged`, `weapon_training` |
| `massassi_temple_warrior` | Massassi Temple Warrior | 12 | `endurance`, `grapple`, `melee`, `resilience` | `control`, `dark_side`, `force`, `force_offense`, `force_power`, `force_training`, `perception`, `survivability` |
| `nightbrother` | Nightbrother | 12 | `endurance`, `grapple`, `initiative`, `melee` | `control`, `mobility`, `perception`, `ranged`, `resilience`, `weapon_specialization` |
| `gungan_organic_tech_defender` | Gungan Organic-Tech Defender | 12 | `ally_support`, `mechanics`, `modification`, `support`, `tech` | `cover`, `crafting`, `damage_threshold`, `defense`, `equipment`, `trap`, `use_computer` |

## Tranche 12 — Soldier-first identities

### Enforcer (`enforcer`)

- **Identity:** Professional enforcement operative defined by locating and apprehending suspects while using institutional/social authority; personal staying power and ranged suppression reinforce the role.
- **Primary:** investigation, persuasion, pursuit, social
- **Supporting:** endurance, evasion, perception, ranged, survivability

### Security Specialist (`security_specialist`)

- **Identity:** Professional protector of facilities, cargo, data, or people whose identity combines threat awareness, security systems, and direct protective intervention.
- **Primary:** ally_support, perception, support, tech, use_computer
- **Supporting:** control, mechanics, nonlethal, stun, survivability

### Bodyguard (`bodyguard`)

- **Identity:** Dedicated personal protector whose defining mechanics keep another creature alive through interception, repositioning, and close protective presence.
- **Primary:** ally_support, perception, support, survivability
- **Supporting:** endurance, melee, mobility, positioning, weapon_training

### Mercenary (`mercenary`)

- **Identity:** Contract soldier whose identity is battlefield readiness, endurance, practical close combat, and surviving repeated engagements rather than allegiance to a particular cause.
- **Primary:** endurance, initiative, melee, survivability
- **Supporting:** ally_support, damage_threshold, perception, support, survival, weapon_specialization

### Commando (`commando`)

- **Identity:** Small-team special-operations fighter defined by covert entry, reconnaissance, stealth, and mission-focused operations behind or ahead of conventional forces.
- **Primary:** infiltration, perception, recon, stealth
- **Supporting:** initiative, mechanics, survival, teamwork, trap

### Veteran (`veteran`)

- **Identity:** Experienced combat survivor whose identity is durability, awareness, and learned resilience, with enough battlefield experience to steady and coordinate others.
- **Primary:** endurance, perception, resilience, survivability
- **Supporting:** ally_support, initiative, mobility, support, teamwork

### Warrior (`warrior`)

- **Identity:** Direct combatant defined by physical staying power, close fighting, determination, and the ability to keep functioning through hostile effects.
- **Primary:** endurance, melee, resilience, survivability
- **Supporting:** control, initiative, perception, ranged, weapon_specialization

### Combat Medic (`combat_medic`)

- **Identity:** Battlefield caregiver whose core identity is preserving allied lives through Treat Injury, medical procedure, healing, and emergency recovery under fire.
- **Primary:** ally_support, healing, medical, medicine, support, treat_injury
- **Supporting:** endurance, knowledge, perception, recovery, survivability

### Combat Engineer (`combat_engineer`)

- **Identity:** Battlefield technical specialist who keeps machinery useful under fire, modifies equipment, solves vehicle and infrastructure problems, and directly supports the unit through engineering.
- **Primary:** mechanics, modification, repair, tech
- **Supporting:** ally_support, crafting, equipment, knowledge, support, use_computer, vehicle

### Field Commander (`field_commander`)

- **Identity:** Battlefield leader whose primary weapon is coordinated action: issuing orders, shaping tactics, maintaining unit effectiveness, and enabling allies to succeed as a force.
- **Primary:** ally_support, command, leadership, support, tactics, teamwork
- **Supporting:** knowledge, morale, perception, persuasion, social

### Starship Gunner (`starship_gunner`)

- **Identity:** Starship weapons specialist whose identity is acquiring targets and delivering ranged fire from a vehicle weapons station as part of a coordinated crew.
- **Primary:** ranged, space, targeting, vehicle
- **Supporting:** initiative, perception, precision, teamwork

### Armorer (`armorer`)

- **Identity:** Protective-equipment specialist who fits, maintains, repairs, and modifies armor as equipment rather than treating armor merely as a passive defense bonus.
- **Primary:** armor, equipment, mechanics, modification, tech
- **Supporting:** crafting, defense, knowledge, repair, use_computer

### Warrior-Priest (`warrior_priest`)

- **Identity:** Martial spiritual authority whose baseline identity joins combat discipline with social/religious guidance; its Force route is explicitly optional and therefore remains supporting.
- **Primary:** melee, perception, persuasion, social
- **Supporting:** force, force_defense, force_power, force_support, force_training, knowledge

### Force Warrior (`force_warrior`)

- **Identity:** Intrinsic Force combatant who experiences the Force through bodily discipline, movement, martial skill, and direct offensive/defensive Force application.
- **Primary:** force, force_offense, force_power, force_training, melee, use_the_force
- **Supporting:** force_defense, initiative, martial_arts, mobility, resilience, telekinesis

### Syndicate Enforcer (`syndicate_enforcer`)

- **Identity:** Organized-crime enforcer who turns social pressure and calibrated violence into compliance, with published nonlethal/stun tactics reinforcing apprehension and intimidation rather than indiscriminate lethality.
- **Primary:** nonlethal, persuasion, social, stun
- **Supporting:** control, endurance, fear, intimidation, survivability

### Koorivar Fusilier (`koorivar_fusilier`)

- **Identity:** Corporate-security fusilier whose battlefield identity emphasizes ranged protection, use of cover, and direct intervention on behalf of protected personnel or assets.
- **Primary:** ally_support, cover, ranged, support
- **Supporting:** evasion, mechanics, perception, survivability, tech

### Diplomatic Security Agent (`diplomatic_security_agent`)

- **Identity:** Protector of diplomats and negotiations who must combine social awareness with escort work and nonlethal intervention so security does not destroy the diplomatic mission.
- **Primary:** ally_support, perception, persuasion, support
- **Supporting:** gather_information, knowledge, nonlethal, positioning, social, stun

### Imperial Royal Guard (`imperial_royal_guard`)

- **Identity:** Elite sovereign protector defined by absolute personal protection, close-combat readiness, endurance, and willingness to interpose or reposition to keep the principal alive.
- **Primary:** ally_support, melee, support, survivability
- **Supporting:** damage_threshold, endurance, mobility, perception, positioning, weapon_training

### Hapan Royal Guard (`hapan_royal_guard`)

- **Identity:** Courtly royal protector whose identity combines direct physical protection with loyalty-inspiring presence and disciplined melee readiness.
- **Primary:** ally_support, leadership, melee, support
- **Supporting:** endurance, full_attack, perception, persuasion, social, survivability

### Wookiee Life-Debt Protector (`wookiee_life_debt_protector`)

- **Identity:** Wookiee protector whose life-debt identity is expressed through extreme endurance, personal sacrifice, and physically staying with or moving to defend the protected ally.
- **Primary:** ally_support, endurance, support, survivability
- **Supporting:** melee, mobility, perception, positioning, survival, weapon_training

### Gamorrean Clan Guard (`gamorrean_clan_guard`)

- **Identity:** Clan guard built around close protection, physical endurance, and straightforward melee defense of others rather than command or social authority.
- **Primary:** ally_support, endurance, melee, support
- **Supporting:** cover, perception, survivability, weapon_training

### Noghri Honor Bodyguard (`noghri_honor_bodyguard`)

- **Identity:** Noghri honor-bound protector combining exceptional awareness and close violence with direct damage interception for the protected ally.
- **Primary:** ally_support, melee, perception, support
- **Supporting:** control, endurance, full_attack, heavy_weapon, survivability, survival

### Assassin Droid (`assassin_droid`)

- **Identity:** Droid designed or modified to kill efficiently through stealth, ambush, and precision-style exploitation, with machine-specific technical and defensive systems reinforcing the role.
- **Primary:** ambush, droid, precision_damage, stealth
- **Supporting:** defense, infiltration, perception, tech, use_computer

### Morgukai Warrior (`morgukai_warrior`)

- **Identity:** Morgukai martial hunter whose defining distinction is fighting Force-users without being a Force-user, backed by direct Force-detection resistance and disciplined close combat.
- **Primary:** anti-force, endurance, martial_arts, melee, perception
- **Supporting:** concealment, detection, evasion, senses, stealth, survival, weapon_specialization

### Breacher (`breacher`)

- **Identity:** Entry specialist whose identity is getting the team through barriers and into contested spaces using close assault and technical problem-solving; explosive tags are not inferred without selected explosive mechanics.
- **Primary:** infiltration, mechanics, melee, tech
- **Supporting:** ally_support, endurance, mobility, positioning, ranged, support, vehicle

### Boarding Marine (`boarding_marine`)

- **Identity:** Marine specialized for fighting inside ships and stations, where endurance, coordinated close action, and readiness matter inside confined space-combat environments.
- **Primary:** endurance, initiative, melee, space, teamwork
- **Supporting:** ally_support, defense, perception, support, survivability

### Shock Trooper (`shock_trooper`)

- **Identity:** Heavy assault trooper whose selected package emphasizes fighting shoulder-to-shoulder, supporting comrades, and applying hard ranged pressure in the most contested parts of the battlefield.
- **Primary:** ally_support, ranged, support, teamwork
- **Supporting:** cover, damage_threshold, defense, offense_ranged, perception, survivability

### Noghri Death Commando (`noghri_death_commando`)

- **Identity:** Noghri special-operations killer defined by covert approach, reconnaissance, stealth, and lethal infiltration, with demolitions retained as supporting mission capability.
- **Primary:** ambush, infiltration, perception, recon, stealth
- **Supporting:** mechanics, ranged, survival, teamwork, trap

### Battle Droid Veteran (`battle_droid_veteran`)

- **Identity:** Experienced battle droid defined by machine durability, accumulated combat awareness, and direct self-repair rather than generic organic veteran resilience.
- **Primary:** droid, endurance, perception, self_repair, survivability
- **Supporting:** initiative, recovery, repair, tactics, trap

### Clone Veteran (`clone_veteran`)

- **Identity:** Clone survivor whose identity combines battlefield experience, tactical analysis, awareness, and durable service, with continued support of squadmates after years of combat.
- **Primary:** endurance, perception, survivability, tactics
- **Supporting:** ally_support, evasion, initiative, support, teamwork, treat_injury

### Mandalorian Warrior (`mandalorian_warrior`)

- **Identity:** Mandalorian cultural warrior defined mechanically by aggressive close combat, battlefield movement, readiness, and staying power; armor is not added merely from cultural imagery.
- **Primary:** endurance, initiative, melee, mobility
- **Supporting:** damage_threshold, defense, perception, tactics, weapon_specialization

### Clan Champion (`clan_champion`)

- **Identity:** Chosen martial representative of a clan or culture, built around direct melee presence and forcing opponents to reckon with the champion rather than simply maximizing damage.
- **Primary:** control, endurance, initiative, melee
- **Supporting:** full_attack, mind-affecting, perception, weapon_training

### Yuuzhan Vong Warrior (`yuuzhan_vong_warrior`)

- **Identity:** Warrior-caste Yuuzhan Vong whose identity is disciplined close combat, pain tolerance, and living-weapon culture; species Force immunity is supporting anti-Force evidence, never Force identity.
- **Primary:** anti-force, endurance, initiative, melee, resilience
- **Supporting:** biotech, control, perception, weapon_training

### Tusken Tribal Warrior (`tusken_tribal_warrior`)

- **Identity:** Tusken combatant defined by endurance, readiness, and practical tribal melee fighting, with entangling and ranged suppression retained as secondary battlefield tools.
- **Primary:** endurance, initiative, melee
- **Supporting:** control, mobility, perception, ranged, weapon_training

### Wookiee Clan Champion (`wookiee_clan_champion`)

- **Identity:** Wookiee champion whose direct mechanical distinction is powerful close control through grappling and movement denial, backed by exceptional physical endurance.
- **Primary:** control, endurance, grapple, melee
- **Supporting:** damage_threshold, initiative, mobility, perception, survivability

### Cathar Clan Warrior (`cathar_clan_warrior`)

- **Identity:** Cathar clan fighter defined by aggressive melee offense, readiness, endurance, and mobile close combat rather than ranged or command identity.
- **Primary:** endurance, initiative, melee, offense_melee
- **Supporting:** damage_threshold, mobility, perception, weapon_specialization

### Nagai Duelist (`nagai_duelist`)

- **Identity:** Nagai duelist focused on trained weapon mastery, rapid multiattack melee exchanges, and control through disarming rather than generic warrior durability.
- **Primary:** full_attack, initiative, melee, weapon_specialization
- **Supporting:** control, perception, ranged, weapon_training

### Massassi Temple Warrior (`massassi_temple_warrior`)

- **Identity:** Massassi temple warrior defined first as a brutal, resilient martial combatant. Its Sith-taught Force route is optional, so Force and dark-side semantics remain supporting rather than primary.
- **Primary:** endurance, grapple, melee, resilience
- **Supporting:** control, dark_side, force, force_offense, force_power, force_training, perception, survivability

### Nightbrother (`nightbrother`)

- **Identity:** Dathomirian Nightbrother defined as a cultural martial identity centered on physical prowess, ritual combat, survival, and imposed social role; no dark-side tag is inferred without direct dark-side mechanics.
- **Primary:** endurance, grapple, initiative, melee
- **Supporting:** control, mobility, perception, ranged, resilience, weapon_specialization

### Gungan Organic-Tech Defender (`gungan_organic_tech_defender`)

- **Identity:** Gungan combat engineer/defender whose certified mechanics establish engineering, protective warding, breaching explosives, and equipment modification. Biotech is intentionally not inferred from the name alone.
- **Primary:** ally_support, mechanics, modification, support, tech
- **Supporting:** cover, crafting, damage_threshold, defense, equipment, trap, use_computer

## Tranche QA

- New records checked: **40 / 40**
- Cumulative certified records structurally checked: **250 / 250**
- New/cumulative unknown ontology tags: **0**
- Primary/supporting collisions: **0**
- Broken `all` unions: **0**
- Known hard implication violations: **0**
- High-overlap bodyguard, warrior, commando, and veteran profiles were manually reviewed rather than automatically differentiated.

- Enforcer follows the prior Kiffu Guardian correction: Enforcement is investigator/quarry-apprehension oriented. Respected Officer supports persuasion/social but does not turn the archetype into command/leadership.
- Security Specialist and Bodyguard receive ally_support only where selected Protection mechanics directly benefit another creature; generic protective flavor alone is not enough.
- Combat Medic promotes healing/medical/medicine/treat_injury because the selected Advanced Medicine package directly performs therapeutic treatment and recovery under fire.
- Combat Engineer does not inherit every explosive semantic from the Military Engineer tree. Its selected package centers mechanics, repair, modification, tech, vehicle problem-solving, and equipment work.
- Warrior-Priest keeps all Force semantics supporting because Phase 7 explicitly classifies its Force route as optional rather than intrinsic.
- Morgukai Warrior promotes anti-force because Force Blank directly impairs Force-based detection while the archetype itself has no Force access.
- Breacher is not automatically tagged trap or burst_damage: this specific selected package does not include Breaching Explosive or Demolitionist, despite the ordinary-language breacher concept.
- Assassin Droid promotes droid because machine identity is structural and required, while ambush/precision_damage/stealth describe the selected killer package.
- Yuuzhan Vong Warrior receives no Force tags. Species Force Immunity supports anti-force, while living-weapon culture supports biotech only as a secondary identity signal.
- Massassi Temple Warrior keeps Force, Force-power, and dark-side semantics supporting because its Sith-taught Force route is one of the project's explicitly optional Force identities.
- Nightbrother receives no dark_side tag. Project narrative authority treats Nightbrothers as a distinct Dathomirian cultural-warrior fantasy, and this record has no direct Force/dark-side mechanics.
- Gungan Organic-Tech Defender does not receive biotech from the name alone. The certified package proves engineering, protection, explosives, equipment, and modification; no direct biological-technology mechanic was established in this pass.
- Mandalorian Warrior does not receive armor merely because Mandalorian culture is visually armor-centric; this record's selected mechanics do not directly operate on armor.
- Bodyguard-family overlap is retained where it is real, but each specialization promotes a different evidence-backed axis: ranged cover (Koorivar), diplomacy/nonlethal intervention, sovereign melee protection, loyalty leadership, endurance/life-debt, clan melee protection, or Noghri close-control capability.

## Claude Execution Contract — Next Run

1. Replace `PENDING_12B_NOBLE_11_COMMIT` with the successful 12B-NOBLE-11 commit and verify that commit is an ancestor of the working branch.
2. Apply only the 40 IDs in `currentExecution.newRecordIds`; there are no revision IDs in this tranche.
3. For each execution record replace exactly `metadata.tags.primary`, `metadata.tags.supporting`, `metadata.tags.all`, and `metadata.tagProvenance`.
4. Do not change any of the 210 previously certified records or any carried-forward revision-log ruling.
5. Do not change mechanics, exactRefs, routes, classes, abilities, skills, talents, feats, Force data, species, backgrounds, narrative data, scoring, BuildIntent, SuggestionScorer, Mentor, UI ranking, or ontology.
6. Validate all supplied tags against the frozen 190-tag ontology.
7. Run Phase 12A validation/tests and Phase 12B overlay `--check`.
8. Stop rather than infer if the baseline authority does not match.
9. Commit and push only after successful validation, then report the actual commit SHA.

## Progress

- Certified: **250 / 297**
- Scout-first: **73 / 73 complete**
- Scoundrel-first: **39 / 39 complete**
- Noble-first: **98 / 98 complete**
- Soldier-first: **40 / 53**
- Jedi-first: **0 / 34**
- New this tranche: **40**
- Revision-log entries carried forward: **8**
- Remaining uncurated after application: **47**
- Next: finish the remaining **13 Soldier-first** records, beginning with `squad_leader`, then transition to Jedi-first.
- Shadow scoring: still deferred.
