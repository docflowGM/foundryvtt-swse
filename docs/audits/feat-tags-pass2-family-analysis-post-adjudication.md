# Feat Tags — Pass 2 Family / Chain Analysis (evidence only)

Authority: `data/audits/feat-tags-pass2-semantic-authority.json` — Pass 2 working authority, owner adjudication Batch 1. Candidate families from certified evidence. Family membership is not semantic proof; prerequisite relationships do not imply tags; same weapon family or publication category does not imply identical tags. PASS2_OWNER_REVIEW marks a difference to review, never an automatic correction.

Text evidence: `data/audits/feat-provenance-canonical-authority.json`; prerequisite text unavailable for 22 feats; 111 prerequisite name-reference edges.

## Statistics

- Assignments: 353; approved vocabulary: 187; tags used: 153; zero-use approved tags: 34; singleton tags: 18
- Tags per feat: min 1, max 18, mean 5.122
- Tags used in feats but not in talents: 6; used in talents but not in feats: 34
- New skill tags: acrobatics 10, climb 10, endurance 9, gather_information 4, jump 10, swim 10
- Production vs authority delta: canonicalPresentInProduction 351; canonicalMissingFromProduction 2; recordsExactlyMatching 0; tagsToAddTotal 1537; tagsToRemoveTotal 3073; tagsToRemoveOutsideVocabulary 2755; tagsAlreadyMatchingTotal 271

### Top 25 tags

| Tag | Feats |
| --- | ---: |
| `action_economy` | 74 |
| `precision` | 68 |
| `defense` | 60 |
| `melee` | 57 |
| `movement` | 56 |
| `ranged` | 54 |
| `mobility` | 48 |
| `control` | 46 |
| `damage_bonus` | 43 |
| `skills` | 39 |
| `once-per-encounter` | 35 |
| `positioning` | 33 |
| `reliability` | 33 |
| `battlefield_control` | 32 |
| `scaling` | 31 |
| `resilience` | 30 |
| `targeting` | 30 |
| `attack_of_opportunity` | 29 |
| `setup` | 28 |
| `teamwork` | 24 |
| `evasion` | 23 |
| `reaction` | 23 |
| `unarmed` | 23 |
| `vehicle` | 23 |
| `equipment` | 22 |

### Most common tag combinations

| Feats | Tags |
| ---: | --- |
| 4 | `burst_damage`, `damage_bonus`, `melee`, `precision` |
| 3 | `acrobatics`, `armor`, `climb`, `endurance`, `equipment`, `initiative`, `jump`, `skills`, `stealth`, `swim` |
| 3 | `double_weapon`, `dual_wield`, `full_attack`, `precision`, `sustained_damage` |
| 3 | `precision`, `ranged`, `targeting` |
| 3 | `skills` |
| 2 | `action_economy`, `damage`, `positioning`, `ranged`, `targeting` |
| 2 | `action_economy`, `melee`, `setup`, `sustained_damage` |
| 2 | `ally_support`, `defense`, `nature`, `resilience`, `support`, `survival` |
| 2 | `attack_of_opportunity`, `battlefield_control`, `control`, `precision`, `setup` |
| 2 | `attack_of_opportunity`, `defense`, `evasion`, `mobility`, `movement` |
| 2 | `attack_of_opportunity`, `evasion`, `mobility`, `movement`, `positioning` |
| 2 | `battlefield_control`, `control`, `melee`, `movement`, `positioning` |
| 2 | `battlefield_control`, `ranged`, `targeting` |
| 2 | `control`, `damage`, `grapple`, `restrain` |
| 2 | `damage_bonus`, `defense`, `martial_arts`, `melee`, `unarmed` |

### Singleton tags (18)

`dark_side`, `dark_side_score`, `exotic_weapon`, `feint`, `force_support`, `galactic_lore`, `heavy_weapon`, `improvised_weapon`, `lightsaber_polearm`, `network`, `nonlethal`, `pistol`, `poison`, `science`, `slicing`, `stun`, `temporary-talent`, `tracking`

### Zero-use approved tags (34)

`alchemy`, `beast_companion`, `block`, `command`, `deflect`, `flanking`, `followers`, `force_control`, `force_offense`, `force_power_synergy`, `illusion`, `jury_rig`, `light_side`, `meditation`, `minion`, `morale`, `offense_melee`, `offense_ranged`, `opposed_check`, `overwatch`, `planning`, `precision_damage`, `precognition`, `pursuit`, `recon`, `search_your_feelings`, `self_repair`, `spellcasting`, `talisman`, `telekinesis`, `telepath`, `telepathy`, `trap`, `visions`

### Feat-only tags

`acrobatics`, `climb`, `endurance`, `gather_information`, `jump`, `swim`

### Talent-only tags (approved, used by talents, not by feats)

`alchemy`, `beast_companion`, `block`, `command`, `deflect`, `flanking`, `followers`, `force_control`, `force_offense`, `force_power_synergy`, `illusion`, `jury_rig`, `light_side`, `meditation`, `minion`, `morale`, `offense_melee`, `offense_ranged`, `opposed_check`, `overwatch`, `planning`, `precision_damage`, `precognition`, `pursuit`, `recon`, `search_your_feelings`, `self_repair`, `spellcasting`, `talisman`, `telekinesis`, `telepath`, `telepathy`, `trap`, `visions`

## Owner dispositions

| Status | Families |
| --- | ---: |
| PASS2_OWNER_APPROVED | 3 |
| PASS2_OWNER_CORRECTED | 0 |
| PASS2_FALSE_POSITIVE | 1 |
| PASS2_INTENTIONAL_DIVERGENCE | 5 |
| PASS2_INVALID_FAMILY_REFERENCE | 1 |

Residual unadjudicated evidence: none.

## Family asymmetry counts

| Kind | Families | PASS2_OWNER_REVIEW | Identical tag sets |
| --- | ---: | ---: | ---: |
| CERTIFIED_TIER_FAMILY | 3 | 0 | 2 |
| NAME_PATTERN_FAMILY | 2 | 0 | 0 |
| OWNER_NAMED_CHAIN | 7 | 0 | 3 |
| PREREQUISITE_PARENT_GROUP | 44 | 0 | 6 |
| PUBLICATION_CATEGORY_FAMILY | 5 | 0 | 0 |
| TEXT_KEYED_FAMILY | 4 | 0 | 0 |

## Owner-named chain members that are not canonical feats

- Rapid Shot / Improved Rapid Shot: Improved Rapid Shot — **PASS2_INVALID_FAMILY_REFERENCE**

## Families

### armor-proficiency — CERTIFIED_TIER_FAMILY

Members: 3; intersection: `acrobatics`, `armor`, `climb`, `endurance`, `equipment`, `initiative`, `jump`, `skills`, `stealth`, `swim`

| Member | Tags |
| --- | --- |
| Armor Proficiency (Light) (`773ec00effc7e96f`) | `armor`, `equipment`, `skills`, `acrobatics`, `climb`, `endurance`, `initiative`, `jump`, `stealth`, `swim` |
| Armor Proficiency (Medium) (`d445051370a88a7f`) | `armor`, `equipment`, `skills`, `acrobatics`, `climb`, `endurance`, `initiative`, `jump`, `stealth`, `swim` |
| Armor Proficiency (Heavy) (`859d6b9f49118499`) | `armor`, `equipment`, `skills`, `acrobatics`, `climb`, `endurance`, `initiative`, `jump`, `stealth`, `swim` |

### dual-weapon-mastery — CERTIFIED_TIER_FAMILY

Members: 3; intersection: `double_weapon`, `dual_wield`, `full_attack`, `precision`, `sustained_damage`

| Member | Tags |
| --- | --- |
| Dual Weapon Mastery I (`84d8866a57381620`) | `dual_wield`, `double_weapon`, `full_attack`, `precision`, `sustained_damage` |
| Dual Weapon Mastery II (`c7c99a77ebee1c0c`) | `dual_wield`, `double_weapon`, `full_attack`, `precision`, `sustained_damage` |
| Dual Weapon Mastery III (`ea684defcd3222ca`) | `dual_wield`, `double_weapon`, `full_attack`, `precision`, `sustained_damage` |

### martial-arts — CERTIFIED_TIER_FAMILY — **PASS2_INTENTIONAL_DIVERGENCE**

Owner ruling basis: Martial Arts I alone records the Core cross-rule interaction that lets an otherwise unarmed character threaten and make attacks of opportunity. Martial Arts II and III independently advance unarmed damage and dodge Reflex Defense only. Prerequisite inheritance is not semantic inheritance; attack_of_opportunity is not propagated to II or III.

Prior flag: PASS2_OWNER_REVIEW; evidence retained: member tag sets differ (1 non-shared tag(s)).

Residual evidence (closed by owner ruling, retained): member tag sets still differ (1 non-shared tag(s)).

Review reasons: member tag sets differ (1 non-shared tag(s)).

Members: 3; intersection: `damage_bonus`, `defense`, `martial_arts`, `melee`, `unarmed`

| Member | Tags |
| --- | --- |
| Martial Arts I (`92f927c92ded9fcf`) | `martial_arts`, `unarmed`, `melee`, `damage_bonus`, `defense`, `attack_of_opportunity` |
| Martial Arts II (`5bedd71f0eead6b9`) | `martial_arts`, `unarmed`, `melee`, `damage_bonus`, `defense` |
| Martial Arts III (`97dbebe63aa6af79`) | `martial_arts`, `unarmed`, `melee`, `damage_bonus`, `defense` |

### Military Training feats — NAME_PATTERN_FAMILY

Members: 7; intersection: —

| Member | Tags |
| --- | --- |
| Galactic Alliance Military Training (`03593bdccdd70fa2`) | `damage_threshold`, `resilience`, `survivability`, `once-per-encounter` |
| Republic Military Training (`2bdb31b248f680e3`) | `cover`, `damage_reduction`, `reaction`, `action_economy`, `once-per-encounter`, `defense` |
| Separatist Military Training (`477b62d36e012719`) | `teamwork`, `positioning`, `precision` |
| Sith Military Training (`526109c14cc81285`) | `damage`, `damage_threshold`, `battlefield_control`, `control`, `mind-affecting`, `reaction`, `action_economy`, `once-per-encounter` |
| Grand Army of the Republic Training (`72146d8a36d77736`) | `armor`, `defense`, `will_defense`, `equipment` |
| Imperial Military Training (`7de37c473be72f87`) | `mind-affecting`, `condition_removal`, `recovery`, `once-per-encounter`, `action_economy` |
| Rebel Military Training (`b4c1dbb468777c09`) | `movement`, `mobility`, `positioning`, `defense`, `evasion` |

### Mounted / riding feats — NAME_PATTERN_FAMILY

Members: 5; intersection: `beast`, `mount`, `ride`, `rider`

| Member | Tags |
| --- | --- |
| Mounted Regiment (`0e9aa3d941f4eb80`) | `teamwork`, `ride`, `mount`, `rider`, `beast`, `defense`, `reaction`, `action_economy`, `scaling` |
| Mounted Defense (`acb7efcc70769b9f`) | `mount`, `ride`, `rider`, `beast`, `vehicle`, `defense`, `evasion`, `once-per-encounter` |
| Mounted Combat (`af5caa92d8fc0e3a`) | `mount`, `ride`, `rider`, `beast`, `movement`, `mobility`, `swift_action`, `reaction`, `action_economy`, `defense`, `evasion`, `endurance` |
| Momentum Strike (`cf278001c780f3f9`) | `mount`, `ride`, `rider`, `beast`, `vehicle`, `melee`, `damage_bonus`, `movement`, `mobility` |
| Trample (`e5a77e8e4754fa5b`) | `mount`, `ride`, `rider`, `beast`, `melee`, `movement`, `mobility`, `battlefield_control`, `damage` |

### Cleave -> Great Cleave — OWNER_NAMED_CHAIN — **PASS2_OWNER_APPROVED**

Owner ruling basis: Great Cleave: Great Cleave explicitly uses the Cleave mechanic with the per-round limit removed. Cleave's drop-an-enemy trigger/setup remains part of the mechanic.

Members: 2; intersection: `action_economy`, `melee`, `setup`, `sustained_damage`

| Member | Tags |
| --- | --- |
| Cleave (`32d1cd4b09ec0d3b`) | `melee`, `action_economy`, `sustained_damage`, `setup` |
| Great Cleave (`8a5cb28f625d6f02`) | `melee`, `action_economy`, `sustained_damage`, `setup` |

### Double Attack -> Triple Attack — OWNER_NAMED_CHAIN

Members: 2; intersection: `full_attack`, `precision`, `sustained_damage`

| Member | Tags |
| --- | --- |
| Double Attack (`357807a5ceb77203`) | `full_attack`, `sustained_damage`, `precision` |
| Triple Attack (`648a4f16669056f0`) | `full_attack`, `sustained_damage`, `precision` |

### Grapple family (Pin / Crush / Throw / Trip) — OWNER_NAMED_CHAIN — **PASS2_INTENTIONAL_DIVERGENCE**

Owner ruling basis: Remaining tag-set differences are mechanically justified: Pin restrains and prevents actions/movement; Crush deals damage through an established Pin; Throw forcibly relocates the target, knocks it prone and ends the grapple; Trip knocks the target prone. The Batch 1 corrections already set the common grapple/unarmed/melee semantics; tag parity is not forced. Member-level Batch 1 rulings (approved/corrected) remain recorded on the feat records.

Prior flag: PASS2_OWNER_REVIEW; evidence retained: member tag sets differ (5 non-shared tag(s)).

Residual evidence (closed by owner ruling, retained): member tag sets still differ (5 non-shared tag(s)).

Review reasons: member tag sets differ (5 non-shared tag(s)).

Members: 4; intersection: `control`, `grab`, `grapple`, `melee`, `unarmed`

| Member | Tags |
| --- | --- |
| Pin (`c238f3f722689a3a`) | `grab`, `grapple`, `restrain`, `control`, `unarmed`, `melee`, `battlefield_control` |
| Crush (`7bc21d4a74b95be5`) | `grab`, `grapple`, `restrain`, `unarmed`, `damage`, `control`, `melee` |
| Throw (`3eed0b4f1227cf91`) | `grab`, `grapple`, `control`, `movement`, `positioning`, `damage`, `unarmed`, `melee`, `battlefield_control` |
| Trip (`a8511e47656ef4dd`) | `grab`, `grapple`, `control`, `battlefield_control`, `melee`, `unarmed` |

### Power Attack / Powerful Charge / Bantha Rush — OWNER_NAMED_CHAIN — **PASS2_INTENTIONAL_DIVERGENCE**

Owner ruling basis: The common `melee` relationship is real, but the differing tags represent differing mechanics: Power Attack is an attack-for-damage trade; Powerful Charge is movement/charge plus attack/damage enhancement; Bantha Rush is forced movement/control. Tag parity is not forced.

Prior flag: PASS2_OWNER_REVIEW; evidence retained: member tag sets differ (8 non-shared tag(s)).

Residual evidence (closed by owner ruling, retained): member tag sets still differ (8 non-shared tag(s)).

Review reasons: member tag sets differ (8 non-shared tag(s)).

Members: 3; intersection: `melee`

| Member | Tags |
| --- | --- |
| Power Attack (`3f76464c43c73f84`) | `melee`, `precision`, `damage_bonus`, `burst_damage` |
| Powerful Charge (`e73873cdc77a6451`) | `melee`, `movement`, `mobility`, `positioning`, `precision`, `damage_bonus`, `burst_damage` |
| Bantha Rush (`fc1e5f0a2367debb`) | `melee`, `battlefield_control`, `control`, `movement`, `positioning` |

### Ranged precision family — OWNER_NAMED_CHAIN — **PASS2_INTENTIONAL_DIVERGENCE**

Owner ruling basis: `ranged` + `precision` is the valid common core. Aim, cover, positioning, range-band, sniper, setup, targeting, and damage tags remain mechanic-specific.

Prior flag: PASS2_OWNER_REVIEW; evidence retained: member tag sets differ (6 non-shared tag(s)).

Residual evidence (closed by owner ruling, retained): member tag sets still differ (6 non-shared tag(s)).

Review reasons: member tag sets differ (6 non-shared tag(s)).

Members: 6; intersection: `precision`, `ranged`

| Member | Tags |
| --- | --- |
| Point-Blank Shot (`05459ac4d439f229`) | `ranged`, `precision`, `damage_bonus`, `positioning` |
| Precise Shot (`c180eee7d3bc29b2`) | `ranged`, `precision`, `positioning` |
| Sniper (`56367f3943ee8c17`) | `ranged`, `sniper`, `cover`, `precision`, `targeting` |
| Careful Shot (`62fdf44c56b24507`) | `ranged`, `targeting`, `setup`, `precision` |
| Deadeye (`6e47c132fbedde08`) | `ranged`, `targeting`, `setup`, `damage_bonus`, `precision`, `sniper` |
| Far Shot (`b5a8d5899e02139c`) | `ranged`, `targeting`, `precision` |

### Rapid Strike / Improved Rapid Strike — OWNER_NAMED_CHAIN

Members: 2; intersection: `burst_damage`, `damage_bonus`, `melee`, `precision`

| Member | Tags |
| --- | --- |
| Rapid Strike (`ccb33e58342499a3`) | `melee`, `precision`, `damage_bonus`, `burst_damage` |
| Improved Rapid Strike (`cb6aea7e256e4c8c`) | `melee`, `damage_bonus`, `precision`, `burst_damage` |

### Tech Specialist family — OWNER_NAMED_CHAIN — **PASS2_INTENTIONAL_DIVERGENCE**

Owner ruling basis: The valid common core is tech + mechanics + modification + equipment. The wider object/trait tags on Tech Specialist and Superior Tech are justified by their modification tables; Signature Device's `reliability` is justified by its take-10 mechanic; Hasty Modification does not inherit the parent feat's entire semantic payload.

Prior flag: PASS2_OWNER_REVIEW; evidence retained: member tag sets differ (15 non-shared tag(s)).

Residual evidence (closed by owner ruling, retained): member tag sets still differ (15 non-shared tag(s)).

Review reasons: member tag sets differ (15 non-shared tag(s)).

Members: 4; intersection: `equipment`, `mechanics`, `modification`, `tech`

| Member | Tags |
| --- | --- |
| Tech Specialist (`42e2404790756700`) | `tech`, `mechanics`, `modification`, `equipment`, `armor`, `droid`, `vehicle`, `ability_enhancement`, `durability`, `defense`, `skills`, `mobility`, `shields`, `weapon_empowerment`, `precision`, `damage_bonus` |
| Superior Tech (`a717435c8094e7fb`) | `tech`, `mechanics`, `modification`, `equipment`, `armor`, `droid`, `vehicle`, `ability_enhancement`, `durability`, `defense`, `perception`, `skills`, `sensors`, `shields`, `mobility`, `weapon_empowerment`, `precision`, `damage_bonus` |
| Signature Device (`313095ada7504547`) | `tech`, `mechanics`, `modification`, `equipment`, `reliability` |
| Hasty Modification (`40429365d8f28219`) | `tech`, `mechanics`, `modification`, `equipment` |

### Aiming Accuracy and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `precision`, `ranged`, `targeting`

| Member | Tags |
| --- | --- |
| Aiming Accuracy (`80805c30ea6dd11e`) | `ranged`, `precision`, `targeting`, `setup` |
| Pinpoint Accuracy (`47c92eae6c1a0b84`) | `ranged`, `precision`, `targeting`, `control` |

### Armor Proficiency (Light) and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 3; intersection: `acrobatics`, `armor`, `climb`, `endurance`, `equipment`, `initiative`, `jump`, `skills`, `stealth`, `swim`

| Member | Tags |
| --- | --- |
| Armor Proficiency (Light) (`773ec00effc7e96f`) | `armor`, `equipment`, `skills`, `acrobatics`, `climb`, `endurance`, `initiative`, `jump`, `stealth`, `swim` |
| Armor Proficiency (Heavy) (`859d6b9f49118499`) | `armor`, `equipment`, `skills`, `acrobatics`, `climb`, `endurance`, `initiative`, `jump`, `stealth`, `swim` |
| Armor Proficiency (Medium) (`d445051370a88a7f`) | `armor`, `equipment`, `skills`, `acrobatics`, `climb`, `endurance`, `initiative`, `jump`, `stealth`, `swim` |

### Armor Proficiency (Medium) and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `acrobatics`, `armor`, `climb`, `endurance`, `equipment`, `initiative`, `jump`, `skills`, `stealth`, `swim`

| Member | Tags |
| --- | --- |
| Armor Proficiency (Medium) (`d445051370a88a7f`) | `armor`, `equipment`, `skills`, `acrobatics`, `climb`, `endurance`, `initiative`, `jump`, `stealth`, `swim` |
| Armor Proficiency (Heavy) (`859d6b9f49118499`) | `armor`, `equipment`, `skills`, `acrobatics`, `climb`, `endurance`, `initiative`, `jump`, `stealth`, `swim` |

### Attack Combo (Melee) and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `attack_of_opportunity`, `damage_bonus`, `melee`, `setup`, `sustained_damage`, `unarmed`

| Member | Tags |
| --- | --- |
| Attack Combo (Melee) (`5f479944307731d1`) | `melee`, `unarmed`, `damage_bonus`, `sustained_damage`, `setup`, `attack_of_opportunity` |
| Attack Combo (Fire and Strike) (`52f1a7f7eb33a1f4`) | `melee`, `ranged`, `unarmed`, `damage_bonus`, `sustained_damage`, `setup`, `attack_of_opportunity` |

### Attack Combo (Ranged) and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `attack_of_opportunity`, `damage_bonus`, `ranged`, `setup`, `sustained_damage`

| Member | Tags |
| --- | --- |
| Attack Combo (Ranged) (`b573d4f48af37b42`) | `ranged`, `damage_bonus`, `sustained_damage`, `setup`, `attack_of_opportunity` |
| Attack Combo (Fire and Strike) (`52f1a7f7eb33a1f4`) | `melee`, `ranged`, `unarmed`, `damage_bonus`, `sustained_damage`, `setup`, `attack_of_opportunity` |

### Bantha Rush and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 3; intersection: `battlefield_control`, `melee`, `movement`, `positioning`

| Member | Tags |
| --- | --- |
| Bantha Rush (`fc1e5f0a2367debb`) | `melee`, `battlefield_control`, `control`, `movement`, `positioning` |
| Battering Attack (`01dee6f32bbd8f85`) | `melee`, `control`, `battlefield_control`, `movement`, `positioning` |
| Improved Bantha Rush (`34bc0c5808778bf5`) | `melee`, `battlefield_control`, `movement`, `positioning` |

### Burst Fire and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `targeting`

| Member | Tags |
| --- | --- |
| Burst Fire (`0d4d7c147c48cdab`) | `ranged`, `damage_bonus`, `burst_damage`, `targeting` |
| Suppression Fire (`b3984239e21c64ca`) | `support`, `battlefield_control`, `control`, `cover`, `fear`, `mind-affecting`, `will_defense`, `teamwork`, `targeting` |

### Careful Shot and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `precision`, `ranged`, `setup`, `targeting`

| Member | Tags |
| --- | --- |
| Careful Shot (`62fdf44c56b24507`) | `ranged`, `targeting`, `setup`, `precision` |
| Steadying Position (`8b1a9adee4e2e78e`) | `ranged`, `targeting`, `setup`, `precision`, `positioning`, `control` |

### Charging Fire and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `mobility`, `movement`, `ranged`

| Member | Tags |
| --- | --- |
| Charging Fire (`a945e2f5ffb5a7ed`) | `ranged`, `movement`, `mobility`, `positioning` |
| Mandalorian Training (`6723270208549f73`) | `ranged`, `precision`, `defense`, `mobility`, `movement`, `will_defense` |

### Cleave and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `action_economy`, `melee`, `setup`, `sustained_damage`

| Member | Tags |
| --- | --- |
| Cleave (`32d1cd4b09ec0d3b`) | `melee`, `action_economy`, `sustained_damage`, `setup` |
| Great Cleave (`8a5cb28f625d6f02`) | `melee`, `action_economy`, `sustained_damage`, `setup` |

### Combat Reflexes and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 6; intersection: `attack_of_opportunity`

| Member | Tags |
| --- | --- |
| Combat Reflexes (`7146640744fdf052`) | `attack_of_opportunity`, `reaction`, `action_economy`, `scaling`, `ambush_defense` |
| Tactical Advantage (`2942c0676644251b`) | `attack_of_opportunity`, `movement`, `mobility`, `positioning`, `evasion` |
| Opportunistic Retreat (`513f0d9e7eb6965b`) | `attack_of_opportunity`, `movement`, `mobility`, `positioning`, `evasion` |
| Hijkata Training (`6dcb59b199dba6a1`) | `martial_arts`, `unarmed`, `melee`, `attack_of_opportunity`, `counterattack`, `control`, `once-per-encounter`, `ally_support`, `support`, `teamwork`, `reaction`, `action_economy`, `movement`, `mobility` |
| Opportunistic Trickery (`8cf12d528b0d0478`) | `attack_of_opportunity`, `control`, `battlefield_control`, `setup`, `precision` |
| Improved Opportunistic Trickery (`bb7a952715116e00`) | `attack_of_opportunity`, `control`, `battlefield_control`, `setup`, `precision` |

### Conditioning and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `climb`, `defense`, `jump`, `swim`

| Member | Tags |
| --- | --- |
| Conditioning (`0ac76f1c0c1677cb`) | `reroll`, `reliability`, `skills`, `defense`, `reaction`, `action_economy`, `once-per-encounter`, `resilience`, `climb`, `jump`, `swim`, `endurance` |
| Increased Agility (`be1b2f8015c971a5`) | `movement`, `mobility`, `defense`, `climb`, `jump`, `swim` |

### Controlled Rage and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: —

| Member | Tags |
| --- | --- |
| Controlled Rage (`c120ef1fe27225af`) | `action_economy` |
| Focused Rage (`c2da9691c1bb9742`) | `skills` |

### Coordinated Attack and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 4; intersection: `teamwork`

| Member | Tags |
| --- | --- |
| Coordinated Attack (`964f0781b3e3fc37`) | `teamwork`, `ally_support`, `support`, `battlefield_control`, `control`, `precision`, `reliability` |
| Blaster Barrage (`50903195fbb5d090`) | `ranged`, `ally_support`, `support`, `teamwork`, `precision`, `target-designation`, `targeting` |
| Swarm (`643c54c206ed5f64`) | `melee`, `precision`, `teamwork`, `positioning`, `scaling` |
| Coordinated Barrage (`c51d23038e2862e6`) | `ally_support`, `support`, `teamwork`, `damage_bonus`, `scaling` |

### Crush and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 4; intersection: `grapple`, `restrain`

| Member | Tags |
| --- | --- |
| Crush (`7bc21d4a74b95be5`) | `grab`, `grapple`, `restrain`, `unarmed`, `damage`, `control`, `melee` |
| Pincer (`09d4eedfce05c6a3`) | `grapple`, `restrain`, `swift_action`, `action_economy`, `sustained_damage` |
| Rancor Crush (`931fae85d3d53c07`) | `grapple`, `restrain`, `damage`, `control` |
| Bone Crusher (`eccb2b4dbdbfa324`) | `grapple`, `restrain`, `damage`, `control` |

### Dodge and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 8; intersection: —

| Member | Tags |
| --- | --- |
| Dodge (`45366d4f3a5e443d`) | `defense`, `evasion`, `target-designation`, `targeting` |
| Improved Charge (`0166fcdddc548545`) | `movement`, `mobility`, `positioning` |
| Slippery Maneuver (`03e16cbf16cdc81d`) | `defense`, `evasion`, `movement`, `mobility`, `attack_of_opportunity` |
| Moving Target (`34071c4705615ce8`) | `movement`, `mobility`, `positioning`, `defense`, `evasion` |
| Tae-Jitsu Training (`6b6a0dc594ad4e3c`) | `martial_arts`, `unarmed`, `melee`, `critical_hit`, `damage_bonus`, `defense`, `target-designation`, `targeting`, `swift_action`, `action_economy`, `once-per-encounter`, `control` |
| Erratic Target (`99e4f98cbcbdd9e1`) | `movement`, `mobility`, `defense`, `evasion` |
| A Few Maneuvers (`b3dfdfd783cf16be`) | `vehicle`, `pilot`, `defense`, `ranged_defense`, `evasion` |
| Mobility (`ff8eaa4e2f6d1cf1`) | `movement`, `mobility`, `attack_of_opportunity`, `defense`, `evasion` |

### Double Attack and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 5; intersection: —

| Member | Tags |
| --- | --- |
| Double Attack (`357807a5ceb77203`) | `full_attack`, `sustained_damage`, `precision` |
| Relentless Attack (`30cb2abcd11bf1bd`) | `reliability`, `precision`, `targeting`, `setup` |
| Rapid Assault (`4be60753991eec43`) | `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend` |
| Triple Attack (`648a4f16669056f0`) | `full_attack`, `sustained_damage`, `precision` |
| Savage Attack (`aaa730a68f195111`) | `full_attack`, `sustained_damage`, `damage_bonus`, `setup` |

### Dual Weapon Mastery I and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 5; intersection: —

| Member | Tags |
| --- | --- |
| Dual Weapon Mastery I (`84d8866a57381620`) | `dual_wield`, `double_weapon`, `full_attack`, `precision`, `sustained_damage` |
| Rapid Assault (`4be60753991eec43`) | `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend` |
| K'thri Training (`b00e0a883da4edda`) | `martial_arts`, `unarmed`, `melee`, `swift_action`, `action_economy`, `once-per-encounter`, `damage`, `reroll`, `reliability`, `full_attack` |
| Dual Weapon Mastery II (`c7c99a77ebee1c0c`) | `dual_wield`, `double_weapon`, `full_attack`, `precision`, `sustained_damage` |
| Dual Weapon Mastery III (`ea684defcd3222ca`) | `dual_wield`, `double_weapon`, `full_attack`, `precision`, `sustained_damage` |

### Dual Weapon Mastery II and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `double_weapon`, `dual_wield`, `full_attack`, `precision`, `sustained_damage`

| Member | Tags |
| --- | --- |
| Dual Weapon Mastery II (`c7c99a77ebee1c0c`) | `dual_wield`, `double_weapon`, `full_attack`, `precision`, `sustained_damage` |
| Dual Weapon Mastery III (`ea684defcd3222ca`) | `dual_wield`, `double_weapon`, `full_attack`, `precision`, `sustained_damage` |

### Extra Second Wind and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 3; intersection: `healing`, `recovery`

| Member | Tags |
| --- | --- |
| Extra Second Wind (`4e57ee834c301ad8`) | `recovery`, `healing`, `resources`, `scaling` |
| Vitality Surge (`a12f6fd51e121a30`) | `recovery`, `healing`, `resilience` |
| Unstoppable Combatant (`fa8a56961708bbdc`) | `recovery`, `healing`, `resources` |

### Force Sensitivity and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 6; intersection: `force`

| Member | Tags |
| --- | --- |
| Force Sensitivity (`ddbeb23013d9e917`) | `use_the_force`, `force`, `force_training` |
| Force Regimen Mastery (`1e0222988b4e8714`) | `force`, `scaling`, `force_training` |
| Force Boon (`53444cc061d81627`) | `force`, `force-point`, `resource_recovery`, `resources`, `scaling` |
| Forceful Recovery (`627b92fefdc552d2`) | `force`, `force_power`, `resource_recovery`, `recovery`, `force_capacity` |
| Force Training (`9b7b869a86f39190`) | `force`, `force_power`, `force_training`, `force_capacity`, `scaling` |
| Jedi Heritage (`d3c4ae9f793b8573`) | `force`, `force_training`, `force_power`, `force_capacity`, `scaling` |

### Force Training and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `force`, `force_capacity`, `force_power`

| Member | Tags |
| --- | --- |
| Force Training (`9b7b869a86f39190`) | `force`, `force_power`, `force_training`, `force_capacity`, `scaling` |
| Forceful Recovery (`627b92fefdc552d2`) | `force`, `force_power`, `resource_recovery`, `recovery`, `force_capacity` |

### Lightning Draw and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `action_economy`, `equipment`

| Member | Tags |
| --- | --- |
| Lightning Draw (`1f594024b4757109`) | `standard_action`, `action_economy`, `equipment`, `once-per-encounter` |
| Knife Trick (`61c053191d05d0a2`) | `attack_of_opportunity`, `stealth`, `concealment`, `equipment`, `action_economy` |

### Martial Arts I and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 12; intersection: `martial_arts`, `melee`, `unarmed`

| Member | Tags |
| --- | --- |
| Martial Arts I (`92f927c92ded9fcf`) | `martial_arts`, `unarmed`, `melee`, `damage_bonus`, `defense`, `attack_of_opportunity` |
| Wrruushi Training (`1d0291d930abda15`) | `martial_arts`, `unarmed`, `melee`, `survivability`, `resilience`, `control`, `once-per-encounter`, `critical_hit`, `damage` |
| K'tara Training (`1dfbddf5f1aa57c3`) | `martial_arts`, `unarmed`, `melee`, `ambush`, `damage_bonus`, `stun`, `control`, `once-per-encounter`, `swift_action`, `action_economy`, `setup` |
| Martial Arts II (`5bedd71f0eead6b9`) | `martial_arts`, `unarmed`, `melee`, `damage_bonus`, `defense` |
| Tae-Jitsu Training (`6b6a0dc594ad4e3c`) | `martial_arts`, `unarmed`, `melee`, `critical_hit`, `damage_bonus`, `defense`, `target-designation`, `targeting`, `swift_action`, `action_economy`, `once-per-encounter`, `control` |
| Hijkata Training (`6dcb59b199dba6a1`) | `martial_arts`, `unarmed`, `melee`, `attack_of_opportunity`, `counterattack`, `control`, `once-per-encounter`, `ally_support`, `support`, `teamwork`, `reaction`, `action_economy`, `movement`, `mobility` |
| Stava Training (`836f80dd762cf155`) | `martial_arts`, `unarmed`, `melee`, `grab`, `grapple`, `restrain`, `control`, `movement`, `mobility`, `ability_enhancement` |
| Martial Arts III (`97dbebe63aa6af79`) | `martial_arts`, `unarmed`, `melee`, `damage_bonus`, `defense` |
| K'thri Training (`b00e0a883da4edda`) | `martial_arts`, `unarmed`, `melee`, `swift_action`, `action_economy`, `once-per-encounter`, `damage`, `reroll`, `reliability`, `full_attack` |
| Teräs Käsi Training (`b0feacaeae4860e9`) | `martial_arts`, `unarmed`, `melee`, `damage_threshold`, `damage_bonus` |
| Mechanical Martial Arts (`b9d4eb946079b555`) | `martial_arts`, `unarmed`, `melee`, `control`, `melee_defense`, `attack_of_opportunity` |
| Echani Training (`f362e5a4ad0a98bd`) | `martial_arts`, `unarmed`, `melee`, `damage_bonus`, `control`, `once-per-encounter`, `critical_hit` |

### Martial Arts II and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `damage_bonus`, `defense`, `martial_arts`, `melee`, `unarmed`

| Member | Tags |
| --- | --- |
| Martial Arts II (`5bedd71f0eead6b9`) | `martial_arts`, `unarmed`, `melee`, `damage_bonus`, `defense` |
| Martial Arts III (`97dbebe63aa6af79`) | `martial_arts`, `unarmed`, `melee`, `damage_bonus`, `defense` |

### Melee Defense and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 3; intersection: `melee`

| Member | Tags |
| --- | --- |
| Melee Defense (`3a847230d573a623`) | `melee`, `melee_defense`, `defense`, `fighting_defensively`, `precision`, `standard_action`, `action_economy` |
| Whirlwind Attack (`600f43af4edb16f7`) | `melee`, `battlefield_control`, `sustained_damage`, `targeting` |
| Improved Disarm (`ce473e52f90b160a`) | `melee`, `control`, `reliability` |

### Mobility and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `mobility`, `movement`

| Member | Tags |
| --- | --- |
| Mobility (`ff8eaa4e2f6d1cf1`) | `movement`, `mobility`, `attack_of_opportunity`, `defense`, `evasion` |
| Improved Charge (`0166fcdddc548545`) | `movement`, `mobility`, `positioning` |

### Multi-Grab and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `control`, `grab`, `grapple`

| Member | Tags |
| --- | --- |
| Multi-Grab (`821e127ba3b83c1a`) | `grab`, `grapple`, `standard_action`, `action_economy`, `control` |
| Knock Heads (`c0bd186e6fb23619`) | `grab`, `grapple`, `unarmed`, `damage`, `damage_threshold`, `control` |

### Opportunistic Trickery and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `attack_of_opportunity`, `battlefield_control`, `control`, `precision`, `setup`

| Member | Tags |
| --- | --- |
| Opportunistic Trickery (`8cf12d528b0d0478`) | `attack_of_opportunity`, `control`, `battlefield_control`, `setup`, `precision` |
| Improved Opportunistic Trickery (`bb7a952715116e00`) | `attack_of_opportunity`, `control`, `battlefield_control`, `setup`, `precision` |

### Pin and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 5; intersection: `grapple`, `restrain`

| Member | Tags |
| --- | --- |
| Pin (`c238f3f722689a3a`) | `grab`, `grapple`, `restrain`, `control`, `unarmed`, `melee`, `battlefield_control` |
| Pincer (`09d4eedfce05c6a3`) | `grapple`, `restrain`, `swift_action`, `action_economy`, `sustained_damage` |
| Crush (`7bc21d4a74b95be5`) | `grab`, `grapple`, `restrain`, `unarmed`, `damage`, `control`, `melee` |
| Rancor Crush (`931fae85d3d53c07`) | `grapple`, `restrain`, `damage`, `control` |
| Bone Crusher (`eccb2b4dbdbfa324`) | `grapple`, `restrain`, `damage`, `control` |

### Power Attack and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 3; intersection: `melee`

| Member | Tags |
| --- | --- |
| Power Attack (`3f76464c43c73f84`) | `melee`, `precision`, `damage_bonus`, `burst_damage` |
| Cleave (`32d1cd4b09ec0d3b`) | `melee`, `action_economy`, `sustained_damage`, `setup` |
| Great Cleave (`8a5cb28f625d6f02`) | `melee`, `action_economy`, `sustained_damage`, `setup` |

### Precise Shot and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 7; intersection: —

| Member | Tags |
| --- | --- |
| Precise Shot (`c180eee7d3bc29b2`) | `ranged`, `precision`, `positioning` |
| Pinpoint Accuracy (`47c92eae6c1a0b84`) | `ranged`, `precision`, `targeting`, `control` |
| Sniper (`56367f3943ee8c17`) | `ranged`, `sniper`, `cover`, `precision`, `targeting` |
| Crossfire (`6e3b0ca6413e607c`) | `ranged`, `cover`, `counterattack`, `targeting` |
| Deadeye (`6e47c132fbedde08`) | `ranged`, `targeting`, `setup`, `damage_bonus`, `precision`, `sniper` |
| Aiming Accuracy (`80805c30ea6dd11e`) | `ranged`, `precision`, `targeting`, `setup` |
| Meat Shield (`e85f36d48d9c6989`) | `cover`, `defense`, `survivability`, `positioning` |

### Quick Draw and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 3; intersection: `action_economy`

| Member | Tags |
| --- | --- |
| Quick Draw (`44705a692e2f01a6`) | `equipment`, `swift_action`, `action_economy` |
| Lightning Draw (`1f594024b4757109`) | `standard_action`, `action_economy`, `equipment`, `once-per-encounter` |
| Return Fire (`80c52cf7838095c1`) | `ranged`, `reaction`, `action_economy`, `counterattack`, `once-per-encounter` |

### Rapid Shot and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 4; intersection: `ranged`

| Member | Tags |
| --- | --- |
| Rapid Shot (`94b8751efb03536a`) | `ranged`, `precision`, `damage_bonus`, `burst_damage` |
| Collateral Damage (`4cc4f4afdcf6e4f8`) | `ranged`, `targeting`, `positioning`, `action_economy`, `damage` |
| Staggering Attack (`c9c4130a55761330`) | `melee`, `ranged`, `damage_bonus`, `control`, `battlefield_control`, `movement`, `positioning`, `attack_of_opportunity` |
| Hobbling Strike (`ccc7a6e191e811a4`) | `melee`, `ranged`, `control`, `battlefield_control`, `movement`, `mobility` |

### Rapid Strike and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 5; intersection: `melee`

| Member | Tags |
| --- | --- |
| Rapid Strike (`ccb33e58342499a3`) | `melee`, `precision`, `damage_bonus`, `burst_damage` |
| Wicked Strike (`5bef5e65e532ba7c`) | `melee`, `targeting`, `positioning`, `action_economy`, `damage` |
| Staggering Attack (`c9c4130a55761330`) | `melee`, `ranged`, `damage_bonus`, `control`, `battlefield_control`, `movement`, `positioning`, `attack_of_opportunity` |
| Improved Rapid Strike (`cb6aea7e256e4c8c`) | `melee`, `damage_bonus`, `precision`, `burst_damage` |
| Hobbling Strike (`ccc7a6e191e811a4`) | `melee`, `ranged`, `control`, `battlefield_control`, `movement`, `mobility` |

### Running Attack and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 5; intersection: `mobility`, `movement`

| Member | Tags |
| --- | --- |
| Running Attack (`4d6a68d553fb0449`) | `movement`, `mobility`, `positioning`, `melee`, `ranged` |
| Stava Training (`836f80dd762cf155`) | `martial_arts`, `unarmed`, `melee`, `grab`, `grapple`, `restrain`, `control`, `movement`, `mobility`, `ability_enhancement` |
| Rebel Military Training (`b4c1dbb468777c09`) | `movement`, `mobility`, `positioning`, `defense`, `evasion` |
| Fleet-Footed (`e896798c6d194345`) | `movement`, `mobility`, `positioning` |
| Strafe (`f4604b0d477e5fe7`) | `ranged`, `battlefield_control`, `targeting`, `movement`, `mobility` |

### Skill Focus and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 3; intersection: —

| Member | Tags |
| --- | --- |
| Skill Focus (`1592aaedf4b6e40a`) | `skills` |
| Impersonate (`2def724bf673c2fc`) | `deception`, `social`, `infiltration`, `manipulation` |
| Informer (`f313d17068d1cdea`) | `perception`, `investigation`, `skill_substitution`, `skills`, `social`, `reliability`, `gather_information`, `reroll` |

### Sniper and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `precision`, `ranged`, `sniper`

| Member | Tags |
| --- | --- |
| Sniper (`56367f3943ee8c17`) | `ranged`, `sniper`, `cover`, `precision`, `targeting` |
| Deadly Sniper (`6fb0f56dd9b9b75c`) | `ranged`, `sniper`, `ambush`, `precision`, `damage_bonus` |

### Starship Tactics and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: `space`, `tactics`, `vehicle`

| Member | Tags |
| --- | --- |
| Starship Tactics (`376d805d1b73f7e6`) | `vehicle`, `space`, `tactics`, `resources`, `scaling` |
| Tactical Genius (`da8e272f5dae09b9`) | `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot` |

### Tech Specialist and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 6; intersection: `mechanics`

| Member | Tags |
| --- | --- |
| Tech Specialist (`42e2404790756700`) | `tech`, `mechanics`, `modification`, `equipment`, `armor`, `droid`, `vehicle`, `ability_enhancement`, `durability`, `defense`, `skills`, `mobility`, `shields`, `weapon_empowerment`, `precision`, `damage_bonus` |
| Signature Device (`313095ada7504547`) | `tech`, `mechanics`, `modification`, `equipment`, `reliability` |
| Hasty Modification (`40429365d8f28219`) | `tech`, `mechanics`, `modification`, `equipment` |
| Superior Tech (`a717435c8094e7fb`) | `tech`, `mechanics`, `modification`, `equipment`, `armor`, `droid`, `vehicle`, `ability_enhancement`, `durability`, `defense`, `perception`, `skills`, `sensors`, `shields`, `mobility`, `weapon_empowerment`, `precision`, `damage_bonus` |
| Vehicle Systems Expertise (`d7736c072de9b86c`) | `vehicle`, `mechanics`, `shields`, `power_systems`, `swift_action`, `action_economy`, `once-per-encounter`, `resource_recovery` |
| Starship Designer (`e9147ce66a783fbb`) | `tech`, `mechanics`, `crafting`, `modification`, `vehicle`, `durability`, `shields`, `weapon_empowerment`, `precision` |

### Trip and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 3; intersection: `battlefield_control`, `control`, `melee`

| Member | Tags |
| --- | --- |
| Trip (`a8511e47656ef4dd`) | `grab`, `grapple`, `control`, `battlefield_control`, `melee`, `unarmed` |
| Battering Attack (`01dee6f32bbd8f85`) | `melee`, `control`, `battlefield_control`, `movement`, `positioning` |
| Throw (`3eed0b4f1227cf91`) | `grab`, `grapple`, `control`, `movement`, `positioning`, `damage`, `unarmed`, `melee`, `battlefield_control` |

### Vehicular Combat and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 4; intersection: `vehicle`

| Member | Tags |
| --- | --- |
| Vehicular Combat (`1f2f70d34a17667d`) | `pilot`, `vehicle`, `reaction`, `action_economy`, `defense`, `evasion`, `weapon_training` |
| Starship Tactics (`376d805d1b73f7e6`) | `vehicle`, `space`, `tactics`, `resources`, `scaling` |
| A Few Maneuvers (`b3dfdfd783cf16be`) | `vehicle`, `pilot`, `defense`, `ranged_defense`, `evasion` |
| Tactical Genius (`da8e272f5dae09b9`) | `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot` |

### Weapon Focus and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 5; intersection: —

| Member | Tags |
| --- | --- |
| Weapon Focus (`c41814601364b643`) | `weapon_specialization`, `weapon_training`, `precision` |
| Return Fire (`80c52cf7838095c1`) | `ranged`, `reaction`, `action_economy`, `counterattack`, `once-per-encounter` |
| Autofire Assault (`c973e43c85382068`) | `ranged`, `sustained_damage`, `damage_bonus`, `targeting`, `setup`, `precision` |
| Critical Strike (`d9ecf143e6a9f889`) | `critical_hit`, `melee`, `swift_action`, `action_economy`, `setup`, `precision` |
| Autofire Sweep (`fbd561777651635e`) | `ranged`, `battlefield_control`, `targeting` |

### Weapon Proficiency and direct dependents — PREREQUISITE_PARENT_GROUP

Members: 2; intersection: —

| Member | Tags |
| --- | --- |
| Weapon Proficiency (`ecc2471ac96ec2d4`) | `weapon_training`, `equipment` |
| Suppression Fire (`b3984239e21c64ca`) | `support`, `battlefield_control`, `control`, `cover`, `fear`, `mind-affecting`, `will_defense`, `teamwork`, `targeting` |

### MARTIAL_ARTS_FEAT — PUBLICATION_CATEGORY_FAMILY

Members: 7; intersection: `martial_arts`, `melee`, `unarmed`

| Member | Tags |
| --- | --- |
| Wrruushi Training (`1d0291d930abda15`) | `martial_arts`, `unarmed`, `melee`, `survivability`, `resilience`, `control`, `once-per-encounter`, `critical_hit`, `damage` |
| K'tara Training (`1dfbddf5f1aa57c3`) | `martial_arts`, `unarmed`, `melee`, `ambush`, `damage_bonus`, `stun`, `control`, `once-per-encounter`, `swift_action`, `action_economy`, `setup` |
| Tae-Jitsu Training (`6b6a0dc594ad4e3c`) | `martial_arts`, `unarmed`, `melee`, `critical_hit`, `damage_bonus`, `defense`, `target-designation`, `targeting`, `swift_action`, `action_economy`, `once-per-encounter`, `control` |
| Hijkata Training (`6dcb59b199dba6a1`) | `martial_arts`, `unarmed`, `melee`, `attack_of_opportunity`, `counterattack`, `control`, `once-per-encounter`, `ally_support`, `support`, `teamwork`, `reaction`, `action_economy`, `movement`, `mobility` |
| Stava Training (`836f80dd762cf155`) | `martial_arts`, `unarmed`, `melee`, `grab`, `grapple`, `restrain`, `control`, `movement`, `mobility`, `ability_enhancement` |
| K'thri Training (`b00e0a883da4edda`) | `martial_arts`, `unarmed`, `melee`, `swift_action`, `action_economy`, `once-per-encounter`, `damage`, `reroll`, `reliability`, `full_attack` |
| Teräs Käsi Training (`b0feacaeae4860e9`) | `martial_arts`, `unarmed`, `melee`, `damage_threshold`, `damage_bonus` |

### RIDING_FEAT — PUBLICATION_CATEGORY_FAMILY

Members: 2; intersection: `beast`, `mount`, `ride`, `rider`, `vehicle`

| Member | Tags |
| --- | --- |
| Mounted Defense (`acb7efcc70769b9f`) | `mount`, `ride`, `rider`, `beast`, `vehicle`, `defense`, `evasion`, `once-per-encounter` |
| Momentum Strike (`cf278001c780f3f9`) | `mount`, `ride`, `rider`, `beast`, `vehicle`, `melee`, `damage_bonus`, `movement`, `mobility` |

### SKILL_CHALLENGE_FEAT — PUBLICATION_CATEGORY_FAMILY

Members: 3; intersection: `reliability`, `skills`

| Member | Tags |
| --- | --- |
| Skill Challenge: Catastrophic Avoidance (`2cc20fb67232f92f`) | `skills`, `reliability` |
| Skill Challenge: Last Resort (`db547ac84af63b06`) | `skills`, `reroll`, `reliability`, `ally_support`, `support` |
| Skill Challenge: Recovery (`ef64dc738a6afeeb`) | `skills`, `recovery`, `reliability` |

### SPECIES_FEAT — PUBLICATION_CATEGORY_FAMILY

Members: 48; intersection: —

Member list and per-member tags are in the JSON.

### TEAM_FEAT — PUBLICATION_CATEGORY_FAMILY

Members: 13; intersection: `scaling`, `teamwork`

| Member | Tags |
| --- | --- |
| Wary Sentries (`0053d97632b02e4a`) | `teamwork`, `perception`, `awareness`, `scaling`, `reliability` |
| Mounted Regiment (`0e9aa3d941f4eb80`) | `teamwork`, `ride`, `mount`, `rider`, `beast`, `defense`, `reaction`, `action_economy`, `scaling` |
| Ascension Specialists (`125c328c4573890a`) | `teamwork`, `climb`, `movement`, `mobility`, `scaling` |
| Technical Experts (`18779d9a72b47a12`) | `teamwork`, `mechanics`, `skills`, `scaling`, `ally_support`, `support`, `tech` |
| Medical Team (`1d27dfb8ce491836`) | `teamwork`, `treat_injury`, `medical`, `medicine`, `healing`, `scaling`, `ally_support`, `support` |
| Aquatic Specialists (`55483fd350b3ba28`) | `teamwork`, `swim`, `movement`, `mobility`, `scaling` |
| Unhindered Approach (`72183c573d1cc44e`) | `teamwork`, `jump`, `movement`, `mobility`, `scaling` |
| Nimble Team (`752b00692fa5376b`) | `teamwork`, `acrobatics`, `movement`, `mobility`, `scaling` |
| Covert Operatives (`75daa55c22ffed5e`) | `teamwork`, `stealth`, `infiltration`, `movement`, `mobility`, `scaling` |
| Slicer Team (`77c897590b4000f6`) | `teamwork`, `use_computer`, `skills`, `scaling`, `ally_support`, `support`, `tech`, `slicing` |
| Unified Squadron (`b1970c18996d44dd`) | `teamwork`, `pilot`, `vehicle`, `scaling`, `reliability` |
| Tireless Squad (`b648515a5e8dd612`) | `teamwork`, `endurance`, `skills`, `scaling`, `ally_support`, `support`, `resilience` |
| Wilderness Specialists (`daf0594fbb48e61e`) | `teamwork`, `survival`, `nature`, `scaling`, `ally_support`, `support` |

### Attack of opportunity text — TEXT_KEYED_FAMILY — **PASS2_OWNER_APPROVED**

Owner ruling basis: Martial Arts I: The certified canonical content authority explicitly records the Core combat-rule interaction that Martial Arts I allows an unarmed character to threaten and make attacks of opportunity. Not propagated to Martial Arts II or III from prerequisites; each feat is adjudicated on its own rules.

Members: 26; intersection: `attack_of_opportunity`

Member list and per-member tags are in the JSON.

### Force Point text — TEXT_KEYED_FAMILY

Members: 22; intersection: —

Member list and per-member tags are in the JSON.

### Reroll text — TEXT_KEYED_FAMILY — **PASS2_OWNER_APPROVED**

Owner ruling basis: Cut the Red Tape: The feat explicitly preserves entitlement to Gather Information rerolls when making the substituted Knowledge (bureaucracy) check. | Informer: Informer explicitly carries eligible Gather Information rerolls onto the substituted Perception check; aligned with the reroll-inheritance treatment used elsewhere in the shared ontology.

Members: 19; intersection: `reliability`, `reroll`

Member list and per-member tags are in the JSON.

### Skill substitution text — TEXT_KEYED_FAMILY — **PASS2_FALSE_POSITIVE**

Owner ruling basis: Flurry: Flurry substitutes for a feat when qualifying for a prestige class, not one skill for another. | Weapon Finesse: Weapon Finesse substitutes Dexterity for Strength on attack rolls, not a skill. | Droid Shield Mastery: Changes Endurance success/action timing, not skill identity; it already carries `endurance`.

Prior flag: PASS2_OWNER_REVIEW; evidence retained: 3 member(s) lack every expected candidate tag.

Review reasons: 3 member(s) lack every expected candidate tag.

Members: 9; intersection: —

| Member | Tags |
| --- | --- |
| Flurry (`0536f81eff886234`) | `melee`, `precision`, `defense` |
| Weapon Finesse (`252b67d6e31c377e`) | `melee`, `lightsaber`, `precision`, `ability_enhancement` |
| Disturbing Presence (`25ba21b021086a71`) | `deception`, `acrobatics`, `skill_substitution`, `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `infiltration` |
| Cut the Red Tape (`2bb34366776f0371`) | `knowledge`, `gather_information`, `skill_substitution`, `skills`, `reroll`, `reliability` |
| Elder's Knowledge (`6ba02f4dd4c3bfe5`) | `knowledge`, `galactic_lore`, `skill_substitution`, `skills`, `once-per-encounter`, `perception`, `survival`, `treat_injury` |
| Mind of Reason (`987bdca14576cf2f`) | `skill_substitution`, `skills`, `knowledge`, `mechanics`, `use_computer` |
| Droid Shield Mastery (`d518e8c1220af930`) | `shields`, `resource_recovery`, `reliability`, `swift_action`, `action_economy`, `endurance` |
| Friends in Low Places (`e18eecc0f21a95f4`) | `gather_information`, `knowledge`, `skill_substitution`, `skills`, `equipment`, `resources`, `social` |
| Informer (`f313d17068d1cdea`) | `perception`, `investigation`, `skill_substitution`, `skills`, `social`, `reliability`, `gather_information`, `reroll` |

Hub prerequisite groups, full member tag arrays, and every prerequisite edge are in the JSON.
