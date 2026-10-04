# Pass 3C — Cross-Domain Analysis (facts only)

Domain-only tags: 0 feat-only, 34 talent-only. Co-tag differences listed where |P(co-tag|tag, feat) − P(co-tag|tag, talent)| >= 0.25.

Feat-only: —

Talent-only: `alchemy`, `beast_companion`, `block`, `command`, `deflect`, `flanking`, `followers`, `force_control`, `force_offense`, `force_power_synergy`, `illusion`, `jury_rig`, `light_side`, `meditation`, `minion`, `morale`, `offense_melee`, `offense_ranged`, `opposed_check`, `overwatch`, `planning`, `precision_damage`, `precognition`, `pursuit`, `recon`, `search_your_feelings`, `self_repair`, `spellcasting`, `talisman`, `telekinesis`, `telepath`, `telepathy`, `trap`, `visions`

| Tag | Feat % | Talent % | Feat/Talent ratio | Domain | Co-tag differences (feat vs talent rate) |
| --- | --- | --- | --- | --- | --- |
| `ability_enhancement` | 3.683 | 3.033 | 1.214 | BOTH_DOMAINS | defense 0.538/0.139; mobility 0.308/0.028; resilience 0.308/0.056 |
| `action_economy` | 23.229 | 47.599 | 0.488 | BOTH_DOMAINS | force 0/0.273; support 0.049/0.319; ally_support 0.049/0.315 |
| `alchemy` | 0 | 0.505 | — | TALENT_ONLY | — |
| `ally-trigger` | 0.567 | 2.022 | 0.28 | BOTH_DOMAINS | force-point 0.5/0; force_support 0.5/0; resource_recovery 0.5/0; action_economy 0/0.417 |
| `ally_support` | 5.666 | 22.325 | 0.254 | BOTH_DOMAINS | action_economy 0.2/0.672 |
| `ambush` | 1.983 | 3.286 | 0.604 | BOTH_DOMAINS | precision 0.571/0.205 |
| `ambush_defense` | 0.567 | 1.264 | 0.448 | BOTH_DOMAINS | attack_of_opportunity 0.5/0; movement 0.5/0.067; reaction 0.5/0.067; action_economy 1/0.6 |
| `anti-force` | 0.567 | 1.938 | 0.292 | BOTH_DOMAINS | use_the_force 1/0.391; force_defense 1/0.478; dark_side_score 0.5/0.087; will_defense 0.5/0.174 |
| `armor` | 1.983 | 2.022 | 0.981 | BOTH_DOMAINS | skills 0.857/0.042; acrobatics 0.429/0; climb 0.429/0; durability 0.429/0 |
| `attack_of_opportunity` | 8.215 | 5.055 | 1.625 | BOTH_DOMAINS | positioning 0.172/0.533; action_economy 0.31/0.633 |
| `awareness` | 2.55 | 2.949 | 0.865 | BOTH_DOMAINS | skills 0/0.629; recon 0/0.514; action_economy 0.111/0.571; force 0/0.4 |
| `battlefield_control` | 9.348 | 13.985 | 0.668 | BOTH_DOMAINS | action_economy 0.121/0.464 |
| `beast` | 1.416 | 0.758 | 1.868 | BOTH_DOMAINS | ride 1/0.111; force 0/0.778; mount 1/0.222; rider 1/0.222 |
| `beast_companion` | 0 | 0.505 | — | TALENT_ONLY | — |
| `biotech` | 0.567 | 1.348 | 0.42 | BOTH_DOMAINS | medical 1/0.375; action_economy 0/0.563; ability_enhancement 0.5/0; armor 0.5/0 |
| `block` | 0 | 1.348 | — | TALENT_ONLY | — |
| `burst_damage` | 3.116 | 6.992 | 0.446 | BOTH_DOMAINS | precision 0.545/0.133; action_economy 0.091/0.494; damage_bonus 0.727/0.47 |
| `command` | 0 | 0.927 | — | TALENT_ONLY | — |
| `concealment` | 1.416 | 4.212 | 0.336 | BOTH_DOMAINS | force 0/0.5; infiltration 0/0.36; equipment 0.4/0.06; evasion 0/0.34 |
| `condition_removal` | 1.416 | 2.275 | 0.623 | BOTH_DOMAINS | support 0/0.519; survivability 0/0.444; ally_support 0/0.407; scaling 0/0.296 |
| `control` | 13.031 | 17.523 | 0.744 | BOTH_DOMAINS | unarmed 0.304/0.043 |
| `counterattack` | 1.416 | 3.454 | 0.41 | BOTH_DOMAINS | melee 0.2/0.634; once-per-encounter 0.6/0.341 |
| `cover` | 2.833 | 2.359 | 1.201 | BOTH_DOMAINS | swift_action 0/0.393; positioning 0.2/0.571; action_economy 0.2/0.5; setup 0/0.286 |
| `crafting` | 0.567 | 3.033 | 0.187 | BOTH_DOMAINS | mechanics 1/0.194; action_economy 0/0.5; durability 0.5/0; perception 0.5/0 |
| `critical_hit` | 1.7 | 1.769 | 0.961 | BOTH_DOMAINS | once-per-encounter 0.667/0.048; damage_bonus 0.5/0; ranged 0/0.381; martial_arts 0.5/0.143 |
| `critical_success` | 0.567 | 1.095 | 0.517 | BOTH_DOMAINS | pilot 1/0; vehicle 1/0.077; resource_recovery 1/0.231; force 0/0.615 |
| `damage` | 5.949 | 1.769 | 3.363 | BOTH_DOMAINS | scaling 0/0.476; force 0/0.429; ranged 0.095/0.381; standard_action 0.095/0.381 |
| `damage_bonus` | 12.181 | 9.267 | 1.314 | BOTH_DOMAINS | sustained_damage 0.14/0.645 |
| `damage_reduction` | 1.133 | 2.359 | 0.48 | BOTH_DOMAINS | resilience 0.5/0.143; reaction 0.5/0.179; melee 0/0.286; once-per-encounter 0.5/0.214 |
| `damage_threshold` | 4.249 | 2.949 | 1.441 | BOTH_DOMAINS | damage 0.333/0; ranged 0.067/0.371 |
| `dark_side` | 0.283 | 3.37 | 0.084 | BOTH_DOMAINS | detection 1/0.025; stealth 1/0.025; anti-force 1/0.125; force_defense 1/0.125 |
| `dark_side_score` | 0.283 | 1.432 | 0.198 | BOTH_DOMAINS | detection 1/0.059; force_defense 1/0.059; stealth 1/0.059; anti-force 1/0.118 |
| `deception` | 2.833 | 3.201 | 0.885 | BOTH_DOMAINS | skills 0.2/0.921; reliability 0/0.342; action_economy 0.3/0.579 |
| `defense` | 16.997 | 18.787 | 0.905 | BOTH_DOMAINS | force 0.017/0.291; action_economy 0.25/0.52; survivability 0.133/0.39 |
| `deflect` | 0 | 1.432 | — | TALENT_ONLY | — |
| `detection` | 1.416 | 2.696 | 0.525 | BOTH_DOMAINS | action_economy 0/0.5; recon 0/0.469; force 0.2/0.625; skills 0/0.406 |
| `double_weapon` | 1.133 | 0.505 | 2.242 | BOTH_DOMAINS | melee 0/0.667; weapon_training 0/0.5; precision 0.75/0.333; action_economy 0/0.333 |
| `droid` | 2.266 | 3.707 | 0.611 | BOTH_DOMAINS | action_economy 0/0.591; damage_bonus 0.5/0.068; weapon_empowerment 0.375/0; mechanics 0.625/0.295 |
| `dual_wield` | 1.133 | 1.516 | 0.747 | BOTH_DOMAINS | precision 0.75/0.056; double_weapon 0.75/0.167; ranged 0/0.556; melee 0/0.5 |
| `durability` | 1.7 | 3.623 | 0.469 | BOTH_DOMAINS | vehicle 1/0.186; survivability 0/0.698; modification 0.667/0; shields 0.667/0 |
| `empowerment` | 0.567 | 3.117 | 0.182 | BOTH_DOMAINS | force 0/0.676; equipment 0/0.622; mind-affecting 0.5/0; action_economy 0/0.486 |
| `equipment` | 6.232 | 9.267 | 0.673 | BOTH_DOMAINS | action_economy 0.227/0.536; force 0/0.273 |
| `evasion` | 6.516 | 8.593 | 0.758 | BOTH_DOMAINS | movement 0.739/0.363; action_economy 0.304/0.618; mobility 0.739/0.48; ally_support 0/0.255 |
| `exotic_weapon` | 0.283 | 0.758 | 0.374 | BOTH_DOMAINS | equipment 1/0.111; ranged 0/0.556; weapon_training 1/0.444; action_economy 0/0.444 |
| `exploration` | 0.567 | 2.022 | 0.28 | BOTH_DOMAINS | space 1/0.167; use_computer 1/0.167; skills 1/0.375; mobility 0/0.5 |
| `fear` | 1.416 | 1.938 | 0.731 | BOTH_DOMAINS | intimidation 0/0.391; survivability 0/0.391; defense 0/0.348; persuasion 0.2/0.478 |
| `feint` | 0.283 | 0.59 | 0.48 | BOTH_DOMAINS | force_point_spend 1/0; resource_spend 1/0; social 0/0.857; will_defense 1/0.143 |
| `fighting_defensively` | 0.85 | 0.59 | 1.441 | BOTH_DOMAINS | resilience 0.667/0.143; will_defense 0.667/0.143; melee 0.333/0.714; precision 0.333/0 |
| `flanking` | 0 | 0.927 | — | TALENT_ONLY | — |
| `followers` | 0 | 1.938 | — | TALENT_ONLY | — |
| `force` | 3.116 | 24.431 | 0.128 | BOTH_DOMAINS | action_economy 0/0.531; force_training 0.364/0.007; resource_spend 0.091/0.4; force_power_synergy 0/0.283 |
| `force-point` | 1.7 | 0.253 | 6.725 | BOTH_DOMAINS | resource_recovery 1/0; skill_mastery 0/1; skills 0/1; force_point_spend 0/0.667 |
| `force_capacity` | 1.133 | 3.033 | 0.374 | BOTH_DOMAINS | force_power 0.75/0.028; scaling 0.75/0.083; force_power_synergy 0/0.583; action_economy 0/0.556 |
| `force_control` | 0 | 0.168 | — | TALENT_ONLY | — |
| `force_defense` | 0.567 | 2.527 | 0.224 | BOTH_DOMAINS | anti-force 1/0.367; action_economy 0/0.533; use_the_force 1/0.5; dark_side_score 0.5/0.033 |
| `force_multiplier` | 1.7 | 0.674 | 2.522 | BOTH_DOMAINS | force 0.167/0.75; dark_side 0/0.5; force_power_synergy 0/0.5; reliability 0/0.5 |
| `force_offense` | 0 | 1.938 | — | TALENT_ONLY | — |
| `force_point_spend` | 4.533 | 10.699 | 0.424 | BOTH_DOMAINS | force 0.063/0.843; force_multiplier 0.375/0.047 |
| `force_power` | 0.85 | 0.168 | 5.044 | BOTH_DOMAINS | dark_side 0/1; once-per-encounter 0/1; force_training 0.667/0; scaling 0.667/0 |
| `force_power_synergy` | 0 | 6.908 | — | TALENT_ONLY | — |
| `force_support` | 0.283 | 1.938 | 0.146 | BOTH_DOMAINS | ally-trigger 1/0; force-point 1/0; support 0/1; resource_recovery 1/0.043 |
| `force_training` | 1.133 | 0.168 | 6.725 | BOTH_DOMAINS | scaling 0.75/0; force_power 0.5/0; force_power_synergy 0/0.5; resources 0/0.5 |
| `full_attack` | 2.266 | 2.106 | 1.076 | BOTH_DOMAINS | weapon_training 0/0.48; melee 0.125/0.52; ranged 0/0.32; double_weapon 0.375/0.12 |
| `galactic_lore` | 0.283 | 0.59 | 0.48 | BOTH_DOMAINS | perception 1/0; survival 1/0; treat_injury 1/0; action_economy 0/0.857 |
| `grab` | 2.55 | 0.59 | 4.323 | BOTH_DOMAINS | unarmed 0.667/0; restrain 0.333/0.857; damage 0.333/0; grapple 1/0.714 |
| `grapple` | 3.683 | 0.927 | 3.974 | BOTH_DOMAINS | precision 0/0.364; unarmed 0.538/0.182; damage 0.385/0.091; force 0/0.273 |
| `healing` | 3.399 | 3.454 | 0.984 | BOTH_DOMAINS | support 0.167/0.634; survivability 0.167/0.537; skills 0.083/0.439; force 0/0.317 |
| `heavy_weapon` | 0.283 | 0.337 | 0.841 | BOTH_DOMAINS | battlefield_control 1/0; control 1/0; damage_bonus 1/0; damage_threshold 1/0 |
| `illusion` | 0 | 0.421 | — | TALENT_ONLY | — |
| `implant` | 0.85 | 0.505 | 1.681 | BOTH_DOMAINS | action_economy 0/0.833; ally_support 0/0.833; equipment 0/0.833; once-per-encounter 0/0.833 |
| `improvised_weapon` | 0.283 | 0.505 | 0.56 | BOTH_DOMAINS | damage_bonus 1/0.333; melee 1/0.333; ranged 1/0.333; burst_damage 0/0.333 |
| `infiltration` | 1.416 | 2.78 | 0.509 | BOTH_DOMAINS | concealment 0/0.545; skills 0.2/0.727; action_economy 0/0.455; stealth 0.4/0.727 |
| `initiative` | 1.416 | 1.853 | 0.764 | BOTH_DOMAINS | acrobatics 0.6/0; armor 0.6/0; climb 0.6/0; endurance 0.6/0 |
| `intimidation` | 1.133 | 1.348 | 0.841 | BOTH_DOMAINS | fear 0/0.563; skills 0.25/0.813; attack_of_opportunity 0.5/0; social 0.5/1 |
| `intrigue` | 0.567 | 0.084 | 6.725 | BOTH_DOMAINS | gather_information 0/1; investigation 0/1; network 0/1; skills 0/1 |
| `investigation` | 0.567 | 2.443 | 0.232 | BOTH_DOMAINS | social 1/0.276; gather_information 1/0.414; force-point 0.5/0; resource_recovery 0.5/0 |
| `jury_rig` | 0 | 0.674 | — | TALENT_ONLY | — |
| `knowledge` | 1.7 | 2.443 | 0.696 | BOTH_DOMAINS | action_economy 0/0.655; skill_substitution 0.667/0.069; investigation 0/0.379; support 0/0.379 |
| `leadership` | 0.85 | 1.264 | 0.673 | BOTH_DOMAINS | teamwork 0/1; action_economy 0/0.733; ally_support 0.333/1; social_network 0.667/0 |
| `light_side` | 0 | 0.674 | — | TALENT_ONLY | — |
| `lightsaber` | 0.85 | 6.234 | 0.136 | BOTH_DOMAINS | precision 0.667/0.203; action_economy 0/0.405; force 0/0.405; lightsaber_polearm 0.333/0 |
| `lightsaber_polearm` | 0.283 | 0.084 | 3.363 | BOTH_DOMAINS | double_weapon 1/0; equipment 0/1; lightsaber 1/0; precision 0/1 |
| `manipulation` | 1.416 | 2.527 | 0.56 | BOTH_DOMAINS | control 0/0.9; skills 0/0.767; action_economy 0.2/0.6; mind-affecting 0/0.4 |
| `martial_arts` | 3.399 | 2.19 | 1.552 | BOTH_DOMAINS | once-per-encounter 0.5/0; damage_bonus 0.583/0.154; sustained_damage 0/0.308; control 0.583/0.308 |
| `mechanics` | 4.249 | 3.033 | 1.401 | BOTH_DOMAINS | skills 0.467/0.861; modification 0.4/0.111; shields 0.267/0; weapon_empowerment 0.267/0 |
| `medical` | 1.983 | 2.612 | 0.759 | BOTH_DOMAINS | recovery 0/0.516; skills 0.286/0.677; survivability 0/0.387; reliability 0/0.29 |
| `medicine` | 1.416 | 1.685 | 0.841 | BOTH_DOMAINS | skills 0/0.85; recovery 0/0.65; survivability 0/0.5; implant 0.4/0 |
| `meditation` | 0 | 0.168 | — | TALENT_ONLY | — |
| `melee` | 16.147 | 21.146 | 0.764 | BOTH_DOMAINS | unarmed 0.386/0.131 |
| `melee_defense` | 0.567 | 1.769 | 0.32 | BOTH_DOMAINS | lightsaber 0/0.524; attack_of_opportunity 0.5/0; standard_action 0.5/0; fighting_defensively 0.5/0.048 |
| `mind-affecting` | 2.833 | 5.897 | 0.48 | BOTH_DOMAINS | social 0/0.414; force 0/0.3 |
| `minion` | 0 | 1.095 | — | TALENT_ONLY | — |
| `mobility` | 13.598 | 12.3 | 1.106 | BOTH_DOMAINS | action_economy 0.271/0.685 |
| `modification` | 1.7 | 1.938 | 0.877 | BOTH_DOMAINS | mechanics 1/0.174; durability 0.667/0; vehicle 0.667/0.043; tech 1/0.435 |
| `morale` | 0 | 2.949 | — | TALENT_ONLY | — |
| `mount` | 1.416 | 0.421 | 3.363 | BOTH_DOMAINS | beast 1/0.4; movement 0.6/0; evasion 0.4/0; exploration 0/0.4 |
| `move_action` | 1.416 | 3.454 | 0.41 | BOTH_DOMAINS | ally_support 0/0.537; support 0/0.537; movement 0.8/0.317; mobility 0.8/0.366 |
| `movement` | 15.864 | 10.531 | 1.506 | BOTH_DOMAINS | action_economy 0.25/0.64 |
| `nature` | 2.266 | 0.253 | 8.967 | BOTH_DOMAINS | exploration 0/0.667; force 0/0.667; senses 0/0.667; survival 0.75/0.333 |
| `network` | 0.283 | 0.842 | 0.336 | BOTH_DOMAINS | perception 1/0; ally_support 1/0.1; awareness 1/0.1; support 1/0.1 |
| `nonlethal` | 0.283 | 0.758 | 0.374 | BOTH_DOMAINS | damage 1/0.111; stun 0/0.667; ranged 0/0.556; control 0/0.444 |
| `offense_melee` | 0 | 0.842 | — | TALENT_ONLY | — |
| `offense_ranged` | 0 | 1.348 | — | TALENT_ONLY | — |
| `once-per-encounter` | 9.915 | 14.827 | 0.669 | BOTH_DOMAINS | — |
| `opposed_check` | 0 | 2.106 | — | TALENT_ONLY | — |
| `overwatch` | 0 | 0.421 | — | TALENT_ONLY | — |
| `perception` | 3.399 | 3.286 | 1.035 | BOTH_DOMAINS | skills 0.333/0.795; recon 0/0.41; action_economy 0.167/0.513; force 0/0.308 |
| `persuasion` | 3.399 | 5.139 | 0.661 | BOTH_DOMAINS | skills 0.167/0.902; battlefield_control 0.083/0.393; control 0.333/0.639; social 0.667/0.967 |
| `pilot` | 1.983 | 3.707 | 0.535 | BOTH_DOMAINS | skills 0/0.455; critical_success 0.286/0; weapon_training 0.286/0; mobility 0/0.273 |
| `pistol` | 0.283 | 1.348 | 0.21 | BOTH_DOMAINS | ambush 1/0.063; weapon_training 1/0.063; precision 1/0.125; action_economy 0/0.688 |
| `planning` | 0 | 0.421 | — | TALENT_ONLY | — |
| `poison` | 0.283 | 0.758 | 0.374 | BOTH_DOMAINS | damage_reduction 1/0; defense 1/0.222; medical 0/0.778; resilience 1/0.222 |
| `positioning` | 9.348 | 15.501 | 0.603 | BOTH_DOMAINS | action_economy 0.152/0.538; teamwork 0.061/0.315 |
| `power_systems` | 0.85 | 1.348 | 0.63 | BOTH_DOMAINS | vehicle 1/0.25; equipment 0/0.625; shields 0.667/0.25; mobility 0/0.375 |
| `precision` | 19.263 | 14.659 | 1.314 | BOTH_DOMAINS | action_economy 0.088/0.385 |
| `precision_damage` | 0 | 0.59 | — | TALENT_ONLY | — |
| `precognition` | 0 | 1.264 | — | TALENT_ONLY | — |
| `pursuit` | 0 | 2.527 | — | TALENT_ONLY | — |
| `ranged` | 15.297 | 18.366 | 0.833 | BOTH_DOMAINS | action_economy 0.093/0.491; precision 0.611/0.284; melee 0.111/0.408 |
| `ranged_defense` | 0.567 | 1.938 | 0.292 | BOTH_DOMAINS | evasion 1/0.261; jump 0.5/0; mobility 0.5/0; movement 0.5/0 |
| `reaction` | 6.516 | 11.036 | 0.59 | BOTH_DOMAINS | force 0/0.298; ally_support 0.087/0.359; support 0.087/0.359 |
| `recon` | 0 | 2.612 | — | TALENT_ONLY | — |
| `recovery` | 4.816 | 6.655 | 0.724 | BOTH_DOMAINS | support 0/0.405; force 0.059/0.43; ally_support 0/0.316; skills 0.059/0.316 |
| `reliability` | 9.348 | 11.963 | 0.781 | BOTH_DOMAINS | skills 0.273/0.634; force 0.03/0.296 |
| `repair` | 0.567 | 1.011 | 0.56 | BOTH_DOMAINS | skills 0/1; recovery 0/0.75; droid 1/0.417; durability 0/0.583 |
| `reroll` | 5.382 | 7.582 | 0.71 | BOTH_DOMAINS | skills 0.263/0.622; force 0.053/0.378 |
| `resilience` | 8.499 | 5.56 | 1.528 | BOTH_DOMAINS | force 0/0.409; action_economy 0.1/0.409 |
| `resource_recovery` | 3.683 | 2.106 | 1.749 | BOTH_DOMAINS | force 0.231/0.88; force_power_synergy 0/0.64; recovery 0.154/0.76; force_capacity 0.154/0.72 |
| `resource_spend` | 5.382 | 11.794 | 0.456 | BOTH_DOMAINS | force 0.053/0.829; force_multiplier 0.316/0.043; use_the_force 0/0.25 |
| `resources` | 3.966 | 3.875 | 1.023 | BOTH_DOMAINS | force 0.071/0.543; force_capacity 0.071/0.478 |
| `restrain` | 1.7 | 0.59 | 2.882 | BOTH_DOMAINS | damage 0.5/0; unarmed 0.5/0; action_economy 0.167/0.571; grab 0.5/0.857 |
| `ride` | 1.416 | 0.505 | 2.802 | BOTH_DOMAINS | beast 1/0.167; skills 0/0.667; movement 0.6/0; defense 0.6/0.167 |
| `rider` | 1.416 | 0.421 | 3.363 | BOTH_DOMAINS | beast 1/0.4; movement 0.6/0; cover 0/0.4; evasion 0.4/0 |
| `scaling` | 8.782 | 13.564 | 0.647 | BOTH_DOMAINS | action_economy 0.129/0.447 |
| `science` | 0.283 | 0.59 | 0.48 | BOTH_DOMAINS | force_multiplier 1/0; force_point_spend 1/0; nature 1/0; resource_spend 1/0 |
| `search_your_feelings` | 0 | 0.421 | — | TALENT_ONLY | — |
| `self_repair` | 0 | 0.253 | — | TALENT_ONLY | — |
| `senses` | 0.567 | 1.769 | 0.32 | BOTH_DOMAINS | force 0/0.952; recon 0/0.619; action_economy 0/0.524; use_the_force 0/0.524 |
| `sensors` | 0.567 | 0.674 | 0.841 | BOTH_DOMAINS | perception 1/0.125; ability_enhancement 0.5/0; armor 0.5/0; concealment 0/0.5 |
| `setup` | 7.932 | 12.553 | 0.632 | BOTH_DOMAINS | — |
| `shields` | 1.7 | 0.927 | 1.834 | BOTH_DOMAINS | durability 0.667/0; mechanics 0.667/0; vehicle 0.833/0.273; ranged 0/0.545 |
| `skill_mastery` | 0.567 | 1.432 | 0.396 | BOTH_DOMAINS | once-per-encounter 1/0.059; climb 0.5/0; endurance 0.5/0; jump 0.5/0 |
| `skill_substitution` | 1.983 | 2.612 | 0.759 | BOTH_DOMAINS | force 0/0.548; use_the_force 0/0.548; knowledge 0.571/0.065; gather_information 0.429/0.065 |
| `skills` | 11.048 | 23.673 | 0.467 | BOTH_DOMAINS | action_economy 0.154/0.48 |
| `slicing` | 0.283 | 0.842 | 0.336 | BOTH_DOMAINS | ally_support 1/0; scaling 1/0; support 1/0; teamwork 1/0 |
| `sniper` | 0.85 | 1.095 | 0.776 | BOTH_DOMAINS | precision 1/0.385; control 0/0.462; damage_bonus 0.667/0.231; action_economy 0/0.385 |
| `social` | 4.816 | 7.919 | 0.608 | BOTH_DOMAINS | skills 0.176/0.862; control 0.059/0.532; action_economy 0.118/0.511; battlefield_control 0/0.319 |
| `social_network` | 0.567 | 1.011 | 0.56 | BOTH_DOMAINS | leadership 1/0; skills 0/0.667; gather_information 0/0.583; investigation 0/0.583 |
| `space` | 1.133 | 1.516 | 0.747 | BOTH_DOMAINS | tactics 0.5/0; exploration 0.5/0.222; pursuit 0/0.278; ranged 0/0.278 |
| `spellcasting` | 0 | 0.084 | — | TALENT_ONLY | — |
| `standard_action` | 3.116 | 11.879 | 0.262 | BOTH_DOMAINS | skills 0/0.34; ranged 0/0.305; teamwork 0/0.27 |
| `stealth` | 2.833 | 4.634 | 0.611 | BOTH_DOMAINS | equipment 0.5/0.055; concealment 0.2/0.582; evasion 0/0.364; armor 0.3/0 |
| `stun` | 0.283 | 0.927 | 0.306 | BOTH_DOMAINS | once-per-encounter 1/0; ambush 1/0.091; martial_arts 1/0.091; swift_action 1/0.091 |
| `support` | 5.949 | 24.01 | 0.248 | BOTH_DOMAINS | action_economy 0.19/0.632 |
| `surprise_round` | 0.567 | 1.516 | 0.374 | BOTH_DOMAINS | battlefield_control 0.5/0; control 0.5/0; mobility 0.5/0.056; movement 0.5/0.056 |
| `survivability` | 6.232 | 12.553 | 0.496 | BOTH_DOMAINS | resilience 0.682/0.208; action_economy 0.136/0.463; support 0/0.309; ally_support 0/0.295 |
| `survival` | 1.983 | 0.253 | 7.846 | BOTH_DOMAINS | exploration 0/1; mobility 0/0.667; nature 0.857/0.333; ally_support 0.429/0 |
| `sustained_damage` | 4.533 | 9.941 | 0.456 | BOTH_DOMAINS | setup 0.438/0.11 |
| `swift_action` | 6.516 | 17.607 | 0.37 | BOTH_DOMAINS | force 0/0.316; teamwork 0/0.306; support 0.043/0.34; ally_support 0.043/0.33 |
| `tactics` | 0.567 | 1.179 | 0.48 | BOTH_DOMAINS | space 1/0; support 0/0.786; teamwork 0/0.786; vehicle 1/0.214 |
| `talisman` | 0 | 0.674 | — | TALENT_ONLY | — |
| `target-designation` | 0.85 | 6.318 | 0.135 | BOTH_DOMAINS | targeting 1/0.387; defense 0.667/0.133; setup 0/0.347; martial_arts 0.333/0 |
| `targeting` | 8.499 | 10.362 | 0.82 | BOTH_DOMAINS | — |
| `teamwork` | 6.799 | 21.23 | 0.32 | BOTH_DOMAINS | action_economy 0.208/0.659; scaling 0.625/0.183; ally_support 0.542/0.917; support 0.583/0.933 |
| `tech` | 3.399 | 4.634 | 0.734 | BOTH_DOMAINS | mechanics 0.833/0.491; weapon_empowerment 0.333/0; modification 0.5/0.182; action_economy 0.167/0.455 |
| `telekinesis` | 0 | 1.095 | — | TALENT_ONLY | — |
| `telepath` | 0 | 0.168 | — | TALENT_ONLY | — |
| `telepathy` | 0 | 0.842 | — | TALENT_ONLY | — |
| `temporary-talent` | 0.283 | 0.168 | 1.681 | BOTH_DOMAINS | action_economy 0/0.5; force_point_spend 0/0.5; once-per-encounter 0/0.5; resource_spend 0/0.5 |
| `tracking` | 0.283 | 0.421 | 0.673 | BOTH_DOMAINS | force_multiplier 1/0; force_point_spend 1/0; nature 1/0; pursuit 0/1 |
| `trap` | 0 | 0.842 | — | TALENT_ONLY | — |
| `treat_injury` | 2.55 | 2.612 | 0.976 | BOTH_DOMAINS | recovery 0/0.484; support 0.222/0.613; survivability 0/0.387; skills 0.333/0.677 |
| `unarmed` | 6.516 | 2.78 | 2.344 | BOTH_DOMAINS | control 0.609/0.273; damage_bonus 0.435/0.121; burst_damage 0/0.273; grab 0.261/0 |
| `use_computer` | 1.7 | 1.685 | 1.009 | BOTH_DOMAINS | tech 0.333/0.75; slicing 0.167/0.45; mechanics 0.5/0.25; network 0/0.25 |
| `use_the_force` | 1.133 | 9.941 | 0.114 | BOTH_DOMAINS | action_economy 0/0.534; anti-force 0.5/0.076; force_defense 0.5/0.127; resource_spend 0/0.297 |
| `vehicle` | 6.516 | 6.234 | 1.045 | BOTH_DOMAINS | support 0/0.257 |
| `visions` | 0 | 1.938 | — | TALENT_ONLY | — |
| `weapon_empowerment` | 1.416 | 1.095 | 1.293 | BOTH_DOMAINS | vehicle 1/0; mechanics 0.8/0; tech 0.8/0; force 0/0.769 |
| `weapon_specialization` | 0.567 | 0.674 | 0.841 | BOTH_DOMAINS | melee 0/0.875; sustained_damage 0/0.625; critical_hit 0.5/0; precision 0.5/0.125 |
| `weapon_training` | 3.116 | 4.549 | 0.685 | BOTH_DOMAINS | sustained_damage 0/0.444; equipment 0.364/0.093 |
| `will_defense` | 5.949 | 7.245 | 0.821 | BOTH_DOMAINS | action_economy 0.238/0.721; skills 0.048/0.442; control 0.238/0.57; force 0.048/0.36 |
| `acrobatics` | 2.833 | 0.505 | 5.604 | BOTH_DOMAINS | skills 0.3/0.833; mobility 0.4/0.833; attack_of_opportunity 0.5/0.167; reliability 0/0.333 |
| `climb` | 2.833 | 0.168 | 16.813 | BOTH_DOMAINS | mobility 0.4/1; ally_support 0/0.5; droid 0/0.5; endurance 0.5/0 |
| `endurance` | 2.55 | 0.084 | 30.263 | BOTH_DOMAINS | pursuit 0/1; mobility 0.111/1; movement 0.111/1; reroll 0.111/1 |
| `gather_information` | 1.133 | 1.011 | 1.121 | BOTH_DOMAINS | skill_substitution 0.75/0.167; social_network 0/0.583; investigation 0.5/1; network 0/0.333 |
| `jump` | 2.833 | 0.168 | 16.813 | BOTH_DOMAINS | action_economy 0.3/1; mobility 0.4/1; movement 0.4/1; ally_support 0/0.5 |
| `swim` | 2.833 | 0.084 | 33.626 | BOTH_DOMAINS | ally_support 0/1; droid 0/1; support 0/1; ability_enhancement 0.1/1 |
