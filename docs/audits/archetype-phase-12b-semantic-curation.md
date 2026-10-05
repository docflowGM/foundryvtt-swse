# SWSE Archetype Semantic Curation Authority

**Phase:** 12B — Archetype Semantic Curation  
**Status:** ROLLING AUTHORITY — NEXT TRANCHE READY / BASELINE VERIFIED  
**Certified:** 190 / 297 archetypes  
**Current execution:** 12B-NOBLE-10 — 20 new records  
**Required baseline:** `b65bb4091a980b64a7cd3ac3d19c6fdb62b505c7`  
**Runtime target:** `data/archetypes.json`  
**Frozen ontology:** `data/audits/talent-feat-phase3-final-ontology.json` — 190 tags

> Verify `b65bb4091a980b64a7cd3ac3d19c6fdb62b505c7` is an ancestor of the working branch before execution. Do not infer or substitute a SHA.

## Selection

This tranche continues Noble-first deterministically in dataset order immediately after `surgeon`, covering `medical_droid` through `neimoidian_trade_viceroy`.

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

## Revision Log

### REV-001 — Scavenger resources removal

- **Record:** `scavenger`
- **Ruling:** Remove resources from primary, all, and phase12b curated primary; make no other Scavenger semantic change.

### REV-002 — Kiffu Guardian semantic QA correction

- **Record:** `kiffu_guardian`
- **Ruling:** The prior profile over-weighted command/leadership from Respected Officer. The Enforcement identity is fundamentally investigator/quarry-apprehension oriented; command is not identity-defining.
- **Certified primary:** investigation, perception, pursuit
- **Certified supporting:** defense, initiative, leadership, persuasion, resilience, social, survival, will_defense

### REV-003 — Ace Pilot semantic QA correction

- **Record:** `ace_pilot`
- **Ruling:** Promotes evasion to identity-defining. Ace Pilot should not be semantically identical to generic Pilot at the primary layer; its defining published expression is outmaneuvering and surviving dogfights.
- **Certified primary:** evasion, pilot, pursuit, space, vehicle
- **Certified supporting:** initiative, mobility, tactics

### REV-004 — Slicer Droid semantic QA correction

- **Record:** `slicer_droid`
- **Ruling:** Removes self_repair, which was not supported by the selected mechanics. Ion Resistance directly supports ion instead.
- **Certified primary:** droid, slicing, tech, use_computer
- **Certified supporting:** ion, mechanics, modification, perception

### REV-005 — Electronic Warfare Specialist semantic QA correction

- **Record:** `electronic_warfare_specialist`
- **Ruling:** Sensors remains characteristic but was too specific to be primary from the selected evidence. Removes generic support, which was not directly established by the signature package.
- **Certified primary:** control, slicing, tech, use_computer
- **Certified supporting:** initiative, mechanics, perception, sensors

### REV-006 — Clawdite Facechanger Operative semantic QA correction

- **Record:** `clawdite_facechanger_operative`
- **Ruling:** Shapeshifting/disguise is already captured by infiltration. manipulation is valid as a secondary social-influence signal but was too broad as a primary identity tag.
- **Certified primary:** deception, infiltration, stealth
- **Certified supporting:** gather_information, manipulation, perception, persuasion, social

### REV-007 — Herglic Free Trader semantic QA correction

- **Record:** `herglic_free_trader`
- **Ruling:** The prior profile was an exact duplicate of Free Trader. Herglic free-trader identity has source-backed exploration, mercantile-network, social-contact, and sturdy/risk-taking differentiation; this is not arbitrary uniqueness.
- **Certified primary:** exploration, gather_information, persuasion, social
- **Certified supporting:** knowledge, pilot, resilience, social_network, vehicle

### REV-008 — Zygerrian Corsair semantic QA correction

- **Record:** `zygerrian_corsair`
- **Ruling:** Adds control as a supporting identity signal for the coercive/slaving corsair expression; preserves the pirate-captain overlap without leaving the Zygerrian expression nearly indistinguishable.
- **Certified primary:** intimidation, leadership, pilot, space
- **Certified supporting:** control, deception, fear, initiative, persuasion, teamwork, vehicle


## Current Tranche — 12B-NOBLE-10

Current 20 new records: `medical_droid`, `selkath_kolto_steward`, `academic_archaeologist`, `xenoarchaeologist`, `archaeological_expedition_leader`, `droid_rights_activist`, `zygerrian_abolitionist`, `hutt_kajidic_heir`, `royal_heir`, `hapan_court_noble`, `sith_pureblood_scion`, `yuuzhan_vong_intendant`, `holostar`, `mandalorian_clan_leader`, `ithorian_herdship_steward`, `corporate_agent`, `corporate_troubleshooter`, `quarren_deep_sea_industrialist`, `geonosian_foundry_master`, `neimoidian_trade_viceroy`.

## Certified Record Notes

### Medical Droid (`medical_droid`)

- **Identity:** Droid medical specialist defined by diagnosis, treatment, surgery, and direct patient care rather than generic droid technical work.
- **Primary:** droid, medical, medicine, treat_injury
- **Supporting:** ally_support, healing, mechanics, perception, support, use_computer

### Selkath Kolto Steward (`selkath_kolto_steward`)

- **Identity:** Selkath medical-diplomatic steward of Manaan's kolto tradition, combining healing expertise with negotiation and responsible social administration.
- **Primary:** healing, medicine, persuasion, social
- **Supporting:** ally_support, knowledge, medical, perception, support, treat_injury

### Academic Archaeologist (`academic_archaeologist`)

- **Identity:** Scholar of ancient cultures whose identity is research, historical interpretation, evidence-driven investigation, and exploration through academic expertise.
- **Primary:** exploration, galactic_lore, investigation, knowledge
- **Supporting:** perception, use_computer

### Xenoarchaeologist (`xenoarchaeologist`)

- **Identity:** Archaeologist specializing in alien civilizations and environments, blending ancient-culture investigation with life-science expertise and field survival.
- **Primary:** exploration, galactic_lore, investigation, knowledge, science
- **Supporting:** nature, perception, survival

### Archaeological Expedition Leader (`archaeological_expedition_leader`)

- **Identity:** Field scholar who leads archaeological teams, directs exploration, manages people, and keeps an expedition functioning while pursuing discoveries.
- **Primary:** exploration, investigation, knowledge, leadership
- **Supporting:** ally_support, galactic_lore, perception, persuasion, support, survival

### Droid Rights Activist (`droid_rights_activist`)

- **Identity:** Political and social advocate for droid equality whose identity is persuasion around droid issues rather than technical droid construction or repair.
- **Primary:** droid, persuasion, social
- **Supporting:** gather_information, knowledge, manipulation, use_computer

### Zygerrian Abolitionist (`zygerrian_abolitionist`)

- **Identity:** Zygerrian activist defined by persuasion, information gathering, and organized opposition to slavery rather than inherited Zygerrian coercive culture.
- **Primary:** gather_information, persuasion, social
- **Supporting:** deception, knowledge, manipulation, perception

### Hutt Kajidic Heir (`hutt_kajidic_heir`)

- **Identity:** Heir to a Hutt kajidic whose identity is lineage-based influence, criminal-political networks, leadership expectations, and family connections.
- **Primary:** intrigue, leadership, social, social_network
- **Supporting:** deception, gather_information, persuasion

### Royal Heir (`royal_heir`)

- **Identity:** Dynastic successor defined by public authority, leadership expectations, diplomacy, and inherited institutional relationships.
- **Primary:** leadership, persuasion, social
- **Supporting:** intrigue, knowledge, perception, social_network

### Hapan Court Noble (`hapan_court_noble`)

- **Identity:** Elite Hapan court operator whose identity is intrigue, persuasion, status-conscious social maneuvering, and political relationships.
- **Primary:** intrigue, persuasion, social
- **Supporting:** deception, leadership, perception, social_network

### Sith Pureblood Scion (`sith_pureblood_scion`)

- **Identity:** Aristocratic Sith-descended scion whose core identity is lineage, authority, persuasion, and social position; the established Force route remains optional and therefore supporting.
- **Primary:** leadership, persuasion, social
- **Supporting:** dark_side, force, force_power, force_training, galactic_lore, intrigue, perception, use_the_force

### Yuuzhan Vong Intendant (`yuuzhan_vong_intendant`)

- **Identity:** Yuuzhan Vong political-administrative caste member defined by deception, intrigue, institutional influence, and control of material or financial assets rather than warrior-caste combat.
- **Primary:** deception, intrigue, persuasion, social
- **Supporting:** gather_information, leadership, resources, social_network

### Holostar (`holostar`)

- **Identity:** Highly visible entertainment celebrity who manages public image and influence through deception, persuasion, and social presence.
- **Primary:** deception, persuasion, social
- **Supporting:** gather_information, manipulation, perception

### Mandalorian Clan Leader (`mandalorian_clan_leader`)

- **Identity:** Clan authority whose identity is command, leadership, coordinated tactics, teamwork, and responsibility for Mandalorian followers.
- **Primary:** command, leadership, tactics, teamwork
- **Supporting:** ally_support, endurance, persuasion, support

### Ithorian Herdship Steward (`ithorian_herdship_steward`)

- **Identity:** Ithorian civic and ecological steward whose leadership is tied to community welfare, natural environments, herdship stewardship, and cooperative support.
- **Primary:** leadership, nature, persuasion, support
- **Supporting:** ally_support, knowledge, perception, survival, teamwork

### Corporate Agent (`corporate_agent`)

- **Identity:** Company representative and power broker who advances institutional interests through intrigue, leadership, persuasion, contacts, and corporate networks.
- **Primary:** intrigue, leadership, persuasion, social_network
- **Supporting:** deception, gather_information, knowledge, social, use_computer

### Corporate Troubleshooter (`corporate_troubleshooter`)

- **Identity:** Problem-solving corporate operative who investigates problems and applies social or coercive control rather than functioning as a generic executive.
- **Primary:** control, gather_information, investigation
- **Supporting:** knowledge, leadership, perception, persuasion, use_computer

### Quarren Deep Sea Industrialist (`quarren_deep_sea_industrialist`)

- **Identity:** Quarren industrial leader whose identity combines organizational authority and social influence with technical knowledge of large-scale industry.
- **Primary:** leadership, social, tech
- **Supporting:** knowledge, persuasion, social_network, use_computer

### Geonosian Foundry Master (`geonosian_foundry_master`)

- **Identity:** Industrial production leader centered on manufacturing, droids, mechanics, and technical systems in the Geonosian foundry tradition.
- **Primary:** crafting, droid, leadership, mechanics, tech
- **Supporting:** equipment, knowledge, use_computer

### Neimoidian Trade Viceroy (`neimoidian_trade_viceroy`)

- **Identity:** Corporate-political leader defined by trade influence, negotiation, leadership, intrigue, and wide commercial relationships.
- **Primary:** intrigue, leadership, persuasion, social
- **Supporting:** deception, gather_information, knowledge, social_network

## Tranche QA

- New records checked: **20 / 20**
- Cumulative certified records structurally checked: **190 / 190**
- New-tranche unknown ontology tags: **0**
- Primary/supporting collisions: **0**
- Broken `all` unions: **0**
- Known hard implication violations: **0**
- High-overlap profiles were manually reviewed rather than automatically differentiated.
- Academic Archaeologist does **not** receive `science` merely because archaeology is academic; Xenoarchaeologist receives `science` because life sciences are signature evidence.
- Archaeological Expedition Leader does **not** receive `teamwork` merely for leading a team; `ally_support` + `support` capture the selected unilateral aid mechanics.
- Yuuzhan Vong Intendant does **not** receive `planning` from the name *Contingency Plan*; the selected talent is reactive, not advance planning. `resources` remains supported by Wealth because it grants spendable credits.
- Mandalorian Clan Leader does **not** receive `morale`; Unwavering Ally is not a morale/fear mechanic.
- Corporate Troubleshooter does **not** receive `stun`; Slowing Stun does not itself require or modify stun damage/mode. `control` remains valid because it directly restricts movement.
- Geonosian Foundry Master keeps `crafting` but not `modification`; manufacturing is creation, not automatically modification of an existing item.
- Sith Pureblood Scion keeps Force/dark-side tags supporting because its established Force route is optional, not intrinsic.

## Claude Execution Contract — Next Run

1. Verify `b65bb4091a980b64a7cd3ac3d19c6fdb62b505c7` is an ancestor of the working branch.
2. Apply only the 20 IDs in `currentExecution.newRecordIds`; there are no revision IDs in this tranche.
3. For each execution record replace exactly `metadata.tags.primary`, `metadata.tags.supporting`, `metadata.tags.all`, and `metadata.tagProvenance`.
4. Do not change any of the 170 previously certified records or any carried-forward revision-log ruling.
5. Do not change mechanics, exactRefs, routes, classes, abilities, skills, talents, feats, Force data, species, backgrounds, narrative data, scoring, BuildIntent, SuggestionScorer, Mentor, UI ranking, or ontology.
6. Validate all supplied tags against the frozen 190-tag ontology.
7. Run Phase 12A validation/tests and Phase 12B overlay `--check`.
8. Stop rather than infer if the baseline authority does not match.

## Progress

- Certified: **190 / 297**
- Scout-first: **73 / 73 complete**
- Scoundrel-first: **39 / 39 complete**
- Noble-first: **78 / 98**
- New this tranche: **20**
- Revision-log entries carried forward: **8**
- Remaining uncurated after application: **107**
- Next: continue Noble-first records in dataset order.
- Shadow scoring: still deferred.
