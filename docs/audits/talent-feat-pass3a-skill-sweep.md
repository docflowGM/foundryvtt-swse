# Talent/Feat Pass 3A — Skill Completeness Evidence Sweep (report-only)

19 canonical skills scanned across talent name + Benefit/description text (prerequisites excluded) against the Pass 3A baseline. Lexical evidence only; every raw hit ends in a terminal state.

- Raw hits: **117** across **97** unique talents (owner-reported review set: 117 / 98).
- PASS3A_FALSE_POSITIVE: 4
- PASS3A_INTENTIONAL_GENERIC_SKILL: 9
- PASS3A_OWNER_APPROVED: 74
- PASS3A_OWNER_REVIEW: 5
- PASS3A_ROLE_NOT_SKILL: 3
- PASS3A_TEXT_MATCH_NOT_SKILL: 22

Overlay rulings without a scanner hit: 1 approved additions, 0 dispositions.

## Residual owner review detail

Tooling notes below are NOT rulings. Nothing here was mutated.

### Knowledge and Defense — `knowledge`

- Canonical ID: `06ab0e40780ea63d`; source: Jedi Academy Training Manual p.75
- Existing tags: `defense`, `ambush_defense`, `survivability`, `ability_enhancement`
- Benefit: You add your Wisdom bonus to your Reflex Defense whenever your Dexterity bonus would normally be denied to you.
- Why flagged: The talent NAME "Knowledge and Defense" contains the word Knowledge; the Benefit text does not mention the skill.
- Mechanical reading: Benefit adds the Wisdom bonus to Reflex Defense when Dexterity would be denied. No Knowledge check is made, modified or gated. Reads as a name-only text match.
- Feat-side equivalent: Feat-side `knowledge` is used only where a Knowledge check or substitution is mechanically involved (for example Cut the Red Tape, Mind of Reason); no name-only precedent was tagged.

### Move Massive Object — `use_the_force`

- Canonical ID: `62d461ae3b0fcfa9`; source: Legacy Era Campaign Guide p.55
- Existing tags: `force`, `force_power_synergy`, `telekinesis`, `force_point_spend`, `resource_spend`, `battlefield_control`, `burst_damage`, `ranged`, `control`
- Benefit: When you successfully use the move object power to move an object of Large size or bigger, you can make an area attack with the object instead of throwing it at or dropping it on a single target, as normal for the power. You must spend a Force Point when you activate the power to do this, and the area you target is based on the size of the object: Large, 2x2; Huge, 3x3; Gargantuan, 4x4; Colossal and larger, 6x6. When you use move object to make an area attack with the object you are moving, you compare your Use the Force check to the Reflex Defense of each creature, droid, and vehicle in the target area. If your check equals or exceeds the target's Reflex Defense, it takes damage from the object (as determined by the move object power). Otherwise, the target takes half damage. This is an area effect.
- Why flagged: Benefit text contains "Use the Force check".
- Mechanical reading: Benefit changes how the Use the Force check made for move object is resolved: it is compared to the Reflex Defense of every creature in an area. This reads as a direct Use the Force interaction comparable to the approved Telekinetic Power / Wrath of the Dark Side class, so `use_the_force` (with the already-present `force`) looks like a true positive. Not applied; owner decides.
- Feat-side equivalent: Feat-side `use_the_force` is carried by feats that directly modify or oppose a Use the Force check (for example Force Sensitivity, Unstoppable Force).

### Electronic Trail — `acrobatics`

- Canonical ID: `d26506bfba104470`; source: Galaxy of Intrigue p.24
- Existing tags: `investigation`, `tracking`, `pursuit`, `network`, `tech`, `equipment`, `recon`, `target-designation`
- Benefit: Once you have located a target using Gather Information, you can track its electronic presence. Once per day, you receive a catalog of the target's electronic trail, which includes the amount and location of credits spent, the routes of any public transportation taken, and the sites viewed on the HoloNet while the target was logged in using its primary identity. To receive this information, you must have access to a computer or datapad plus access to a network or the HoloNet. The electronic trail does not reveal bank balances or other secret information, which requires a separate Gather Information check.
- Why flagged: The acrobatics pattern matches the substring "balanc" in "bank balances".
- Mechanical reading: Ordinary English ("bank balances"); no Acrobatics mechanic. Reads as a text match, not a skill. (The separately approved gather_information addition on this record is unaffected.)
- Feat-side equivalent: None.

### Ride the Current — `ride`

- Canonical ID: `df6c20e602190daa`; source: Jedi Academy Training Manual p.77
- Existing tags: `force`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`, `concealment`, `evasion`, `defense`, `recovery`, `healing`, `survivability`
- Benefit: As a reaction to being damaged by an attack or Force power, you can spend a Force Point to gain total concealment from all targets until the end of your next turn. Additionally, if you have not yet taken your second wind, you can do so immediately as a part of this reaction.
- Why flagged: The talent NAME "Ride the Current" contains the word Ride; the Benefit text does not mention the skill.
- Mechanical reading: Benefit is a Force Point reaction granting total concealment and an immediate second wind. No Ride check is involved. Reads as a name-only text match.
- Feat-side equivalent: Feat-side `ride` is used only for mounted-riding mechanics (Mounted Combat, Trample).

### Unbalance Opponent — `acrobatics`

- Canonical ID: `e293cb03d35c2bff`; source: Saga Edition Core Rulebook p.52
- Existing tags: `melee`, `control`, `target-designation`, `melee_defense`, `defense`
- Benefit: You are skilled at keeping your opponents off balance in melee combat. During your action, you designate an opponent no more than one size category larger or smaller than you. That opponent doesn't get to add his Strength bonus on attack rolls when targeting you. (If the opponent has a Strength penalty, he still suffers that penalty.) The opponent's Strength modifier applies to damage, as usual. You can select a new opponent on your next turn.
- Why flagged: The acrobatics pattern matches the substring "balanc" in "off balance" and the name "Unbalance Opponent".
- Mechanical reading: Ordinary English ("off balance"); the Benefit removes the designated opponent's Strength bonus on attacks against the user. No Acrobatics check. Reads as a text match, the same pattern already ruled for Unbalancing Adaptation.
- Feat-side equivalent: None.

## PASS3A_OWNER_REVIEW (5)

| Talent | ID | Source p. | Tag | Excerpt |
| --- | --- | --- | --- | --- |
| Knowledge and Defense | `06ab0e40780ea63d` | Jedi Academy Training Manual 75 | `knowledge` | Knowledge and Defense You add your Wisdom bonus to your Reflex Defense whenever your Dexterity bonu… |
| Move Massive Object | `62d461ae3b0fcfa9` | Legacy Era Campaign Guide 55 | `use_the_force` | …u use move object to make an area attack with the object you are moving, you compare your Use the Force check to the Reflex Defense of each creature, droid, and vehicle in the target area. If y… |
| Electronic Trail | `d26506bfba104470` | Galaxy of Intrigue 24 | `acrobatics` | …atapad plus access to a network or the HoloNet. The electronic trail does not reveal bank balances or other secret information, which requires a separate Gather Information check. Once yo… |
| Ride the Current | `df6c20e602190daa` | Jedi Academy Training Manual 77 | `ride` | Ride the Current As a reaction to being damaged by an attack or Force power, you can spend a F… |
| Unbalance Opponent | `e293cb03d35c2bff` | Saga Edition Core Rulebook 52 | `acrobatics` | Unbalance Opponent You are skilled at keeping your opponents off balance in melee combat. During yo… |

## PASS3A_OWNER_APPROVED (74)

| Talent | ID | Source p. | Tag | Excerpt |
| --- | --- | --- | --- | --- |
| Telekinetic Power | `11cae48e1213c407` | Saga Edition Core Rulebook 100 | `use_the_force` | Telekinetic Power Whenever you roll a natural 20 on your Use the Force check to activate Force disarm, Force grip, Force slam, Force thrust, or move object, you… |
| Lingering Debilitation | `1250a3dac18104eb` | Unknown Regions 31 | `treat_injury` | …ion track, the target suffers a persistent condition requiring 4 hours of rest or a DC 25 Treat Injury check to remove. Once per encounter, when you successfully use Debilitating Shot to move… |
| Mobile Combatant | `198b68c0ca770ad7` | Force Unleashed Campaign Guide 24 | `acrobatics` | …ce equal to your current speed. Unless your opponent uses the withdraw action or makes an Acrobatics check to avoid attacks of opportunity, its movement provokes an attack of opportunity fro… |
| Rebound Leap | `1b41d42e6adb0d46` | Jedi Academy Training Manual 89 | `jump` | …ap Whenever you reduce an opponent to 0 hit points with an unarmed attack, you can make a Jump check as a free action, moving a distance as determined by the results of your Jump check… |
| Jedi Network | `251462d5e3aaa4ce` | Legacy Era Campaign Guide 42 | `gather_information` | …in Information: Your contacts provide you with information, automatically succeeding on a Gather Information check (and covering the credit cost of the check) provided that the DC does not exceed 20… |
| Pursuit | `25f285b1cf4cff35` | Force Unleashed Campaign Guide 45 | `endurance` | Pursuit When running, you are not restricted to a straight line (see “Endurance,” page 66 of the Saga Edition core rulebook) and you can reroll Endurance checks, using t… |
| Detective | `27dd504c877a4de5` | Galaxy of Intrigue 24 | `gather_information` | …g research and surveillance to learn some of their most intimate secrets. When you make a Gather Information check to locate an individual, the DC is reduced by 10, and the time and bribery cost are… |
| Creeping Approach | `2931a9052148e79a` | Force Unleashed Campaign Guide 49 | `perception` | …he target of this talent. Until the beginning of your next turn, that target may not make Perception checks to notice you, even if you enter the target's line of sight. If you or any of your… |
| Share Force Secret | `2dc6ad1667133f2d` | Jedi Academy Training Manual 19 | `use_the_force` | …t the use of this Force secret to one ally within 12 squares of you who is trained in the Use the Force skill. The target gains the benefit of this secret until the end of your next turn. When… |
| Share Talent | `2f00c50f3bf6bf5a` | Jedi Academy Training Manual 20 | `use_the_force` | …lies equal to one-half your class level, rounded down. Only allies who are trained in the Use the Force skill can gain the benefits of the shared talent. You can take this talent multiple time… |
| Adrenaline Implant | `2fdf215a5da99e00` | Legacy Era Campaign Guide 47 | `treat_injury` | …after 8 hours of rest, or by performing successful surgery (as per the application of the Treat Injury skill) on the target. Once per encounter as a standard action, you can give one adjacent… |
| Directed Action | `3a34ce2ef55c41b1` | Scavenger's Guide to Droids 28 | `deception` | …tion As a standard action, you allow one droid that can hear and understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a… |
| Directed Action | `3a34ce2ef55c41b1` | Scavenger's Guide to Droids 28 | `mechanics` | …tandard action, you allow one droid that can hear and understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a free actio… |
| Directed Action | `3a34ce2ef55c41b1` | Scavenger's Guide to Droids 28 | `persuasion` | …ion, you allow one droid that can hear and understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a free action. The droid… |
| Directed Action | `3a34ce2ef55c41b1` | Scavenger's Guide to Droids 28 | `pilot` | …ow one droid that can hear and understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a free action. The droid can re… |
| Directed Action | `3a34ce2ef55c41b1` | Scavenger's Guide to Droids 28 | `ride` | …droid that can hear and understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a free action. The droid can replace… |
| Directed Action | `3a34ce2ef55c41b1` | Scavenger's Guide to Droids 28 | `treat_injury` | …that can hear and understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a free action. The droid can replace its relevant a… |
| Directed Action | `3a34ce2ef55c41b1` | Scavenger's Guide to Droids 28 | `use_computer` | …understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a free action. The droid can replace its relevant ability score modi… |
| Telepathic Influence | `3b30ffbfc3e3270f` | Knights of the Old Republic Campaign Guide 53 | `use_the_force` | …e those who are regularly around you. Whenever you roll a natural 20 on an attack roll or Use the Force check, instead of regaining all your spent Force powers you may instead choose to grant o… |
| Cover Your Tracks | `43ee5741f4b2375c` | Legacy Era Campaign Guide 41 | `gather_information` | …are adept at living beneath society's radar. Anyone who attempts to locate you using the Gather Information skill suffers a -5 penalty on their Gather Information checks. You are adept at living be… |
| Transfer Power | `488aaac69a9829bc` | Jedi Academy Training Manual 20 | `use_the_force` | …our Force suite, adding a use of that power to the Force suite of any ally trained in the Use the Force skill. The ally must be within 12 squares of you and in your line of sight. When your all… |
| Progenitor's Call | `4ebb3a798e36afe6` | Knights of the Old Republic Campaign Guide 61 | `treat_injury` | …y this power once per encounter, and the persistent condition can be removed with a DC 15 Treat Injury check or by resting for 8 hours. This is a mind-affecting effect. You have learned to sen… |
| Directed Movement | `510d4b2aadbbc2de` | Scavenger's Guide to Droids 28 | `acrobatics` | …ow one droid that can hear and understand you to move up to its speed. The droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relev… |
| Directed Movement | `510d4b2aadbbc2de` | Scavenger's Guide to Droids 28 | `climb` | …that can hear and understand you to move up to its speed. The droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relevant abi… |
| Directed Movement | `510d4b2aadbbc2de` | Scavenger's Guide to Droids 28 | `jump` | …an hear and understand you to move up to its speed. The droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relevant ability s… |
| Directed Movement | `510d4b2aadbbc2de` | Scavenger's Guide to Droids 28 | `stealth` | …r and understand you to move up to its speed. The droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relevant ability score modi… |
| Directed Movement | `510d4b2aadbbc2de` | Scavenger's Guide to Droids 28 | `swim` | …tand you to move up to its speed. The droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relevant ability score modifier for… |
| Trace | `54065380bb20e8d8` | Saga Edition Core Rulebook 47 | `gather_information` | Trace You can substitute your Use Computer Skill for any Gather Information check as long as you have access to a computer network. You can substitute your Use Compu… |
| Fluidity | `5567797336fc8571` | Jedi Academy Training Manual 85 | `acrobatics` | …your Use the Force check modifier instead of your Acro-batics check modifier when making Acrobatics checks. If you are entitled to an Acrobatics check reroll, you may reroll your Use the Fo… |
| Precision Implant | `58e37d40d3aa7d4b` | Legacy Era Campaign Guide 47 | `treat_injury` | …after 8 hours of rest, or by performing successful surgery (as per the application of the Treat Injury skill) on the target. Once per encounter as a standard action, you can give one adjacent… |
| Acrobatic Recovery | `5d4a63123e5a5eb4` | Saga Edition Core Rulebook 40 | `acrobatics` | Acrobatic Recovery If any effect causes you to fall Prone, you can make a DC 20 Acrobatics check to remain on your feet. If any effect causes you to fall Prone, you can make a DC 2… |
| Spynet Agent | `648d9634a3795988` | Force Unleashed Campaign Guide 50 | `gather_information` | Spynet Agent You can use your Gather Information check modifier instead of your Knowledge (galactic lore) check modifier when making Knowl… |
| Findsman Ceremonies | `661c2c0665e911f6` | Scum and Villainy 26 | `use_the_force` | …ng. For the remainder of the day, whenever you make a Perception or Stealth check, make a Use the Force check to use the farseeing Force power, or make an attack roll, you can choose to reroll… |
| Ghost Assailant | `6908d612b77c6f92` | Galaxy at War 20 | `perception` | …during that turn you can make a Stealth check as a swift action, opposed by the target's Perception check. If you succeed, the target is considered flat-footed against you until the end of… |
| Mask Presence | `6f7fa0ea2ad38e50` | Jedi Academy Training Manual 79 | `use_the_force` | Mask Presence As a swift action, you become immune to the Sense Force application of the Use the Force skill, and appear to be nothing more than a regular droid in the Force. If you make a Use… |
| Revealing Secrets | `71908efcdb7e6711` | Galaxy of Intrigue 25 | `gather_information` | …ur investigations reveal information that your target thought was secret. When you make a Gather Information check to learn secret information, the DC is reduced by 10 and the bribery cost is reduce… |
| Malkite Techniques | `744c2eaaa48e15af` | Threats of the Galaxy 13 | `treat_injury` | …attack. The poison attacks each round until it misses or until the victim is cured with a Treat Injury check (DC 10 + your heroic level). Once per encounter, you can apply a toxin to any nonen… |
| Power Surge | `77d09ca0a54f4c36` | Force Unleashed Campaign Guide 48 | `mechanics` | …is condition persist until you receive repairs (using the repair droid application of the Mechanics skill). You temporarily surge your power systems to enhance your physical abilities. When… |
| Persistent Haze | `797de6f9dab4d578` | Scum and Villainy 13 | `use_the_force` | …Force Haze talent attacks, you maintain total concealment without having to make another Use the Force check. Only those who do not attack remain concealed; the attacker no longer has total co… |
| Share Force Technique | `7d02251f13fd5645` | Jedi Academy Training Manual 20 | `use_the_force` | …he use of this Force technique to one ally within 12 squares of you who is trained in the Use the Force skill. The target gains the benefit of this technique until the end of your next turn. Yo… |
| Force Suppression | `7fa47c5d2c33ed40` | Knights of the Old Republic Campaign Guide 53 | `use_the_force` | …to negate or redirect a Force power used against you but fail to overcome your opponent's Use the Force check result, you instead lessen the effect of the Force power by one step. For example,… |
| Small Favor | `81e423a476c377fa` | Unknown Regions 29 | `gather_information` | …k. On success, an informant gives you information, granting a +10 competence bonus to one Gather Information or Knowledge check made within the next 24 hours. Once per day, make a DC 25 Persuasion c… |
| Folded Space Mastery | `93bb4f8c058655f9` | Jedi Academy Training Manual 73 | `use_computer` | …s safely to the desired destination. You use your Use the Force check result instead of a Use Computer check, as though calculating a hyperspace jump. This otherwise uses the normal rules for… |
| Resilience Implant | `94b1951d4795f602` | Legacy Era Campaign Guide 47 | `treat_injury` | …after 8 hours of rest, or by performing successful surgery (as per the application of the Treat Injury skill) on the target. Once per encounter as a standard action, you can give one adjacent… |
| Tripwire | `9992fb4ee6ab40df` | Unknown Regions 21 | `acrobatics` | …check if it observed you setting the trap. If the creature succeeds, it can make a DC 10 Acrobatics check to avoid the wire. Choose one option: Clothesline requires thin wire at neck height… |
| Tripwire | `9992fb4ee6ab40df` | Unknown Regions 21 | `perception` | …Deception check to conceal the wire; compare the Deception result to the next creature's Perception check, with -10 to the Perception check if it observed you setting the trap. If the creat… |
| Preserving Shot | `a594f0b9ff786a6c` | Force Unleashed Campaign Guide 52 | `mechanics` | …tspeed until it has received repairs (through use of the repair object application of the Mechanics skill). When you deal damage with a vehicle weapon that is equal to or greater than both… |
| Sly Combatant | `ad4d87fb9aebe330` | Galaxy at War 19 | `treat_injury` | …that enemy gains a persistent condition that can be removed only with a successful DC 25 Treat Injury check to perform surgery. Strength in Numbers: Make a single melee or ranged attack agai… |
| Seek and Destroy | `adacf682b6ccf21c` | Clone Wars Campaign Guide 25 | `perception` | …u make a Charge attack against a target that is unaware of you, that target cannot make a Perception check to notice you until after the attack is resolved, even if you move away from Cover… |
| Force Flow | `b0898acb0a19a3cd` | Knights of the Old Republic Campaign Guide 52 | `use_the_force` | …s through you in an irregular fashion. Whenever you roll a natural 1 on an attack roll or Use the Force check, you gain one temporary Force Point. If you do not spend this Force Point before th… |
| Nowhere to Hide | `b19ce52b1c965015` | Saga Edition Core Rulebook 208 | `gather_information` | Nowhere to Hide You may choose to reroll any Gather Information check made to locate a specific individual, but you must accept the result of the reroll… |
| Speedclimber | `bfb04c89df257f8b` | Unknown Regions 21 | `climb` | Speedclimber You do not take the penalty when using the Accelerated Climbing application of the Climb skill. You do not take the penalty when using the Accelerated Cl… |
| Black Market Buyer | `c006a4be6de26139` | Rebellion Era Campaign Guide 43 | `gather_information` | Black Market Buyer When seeking an item from the Black Market, you do not need to make a Gather Information check to locate a Black Market merchant; you automatically succeed. When seeking an item… |
| Bothan Resources | `c11e9edfda40c53d` | Force Unleashed Campaign Guide 50 | `gather_information` | …rces, and you know the best sources for restricted or rare items. With a successful DC 20 Gather Information check, you can purchase standard weapons, equipment, and transport services at 50% of the… |
| Skilled Demolitionist | `c3a67c14c713a7a3` | Force Unleashed Campaign Guide 57 | `mechanics` | …more. You must still roll to determine if the charge otherwise goes off as planned (see “Mechanics,” page 69 of the Saga Edition core rulebook). You can set a detonator as a swift action,… |
| Consular's Vitality | `c87b8389c8ca6ea9` | Clone Wars Campaign Guide 21 | `use_the_force` | …mage dealt to that ally comes out of bonus hit points first. You take a -5 penalty on all Use the Force checks until the beginning of your next turn. |
| Buried Presence | `c913aa5322934cfd` | Force Unleashed Campaign Guide 92 | `use_the_force` | …you always avoid detection by characters who are using the sense force application of the Use the Force skill, and you cannot be the target of the farseeing power. You may use this as a reactio… |
| Sokan | `c95b1077ab31f9b0` | Saga Edition Core Rulebook 219 | `acrobatics` | Sokan You may take 10 on Acrobatics checks to tumble even when distracted or threatened. Additionally, each threatened or occ… |
| Strength Implant | `cb0dcc59f7ced910` | Legacy Era Campaign Guide 47 | `treat_injury` | …after 8 hours of rest, or by performing successful surgery (as per the application of the Treat Injury skill) on the target. Once per encounter as a standard action, you can give one adjacent… |
| Mind Probe | `ccaa66ed749e3317` | Jedi Academy Training Manual 18 | `gather_information` | …g or exceeding the target's Will Defense. This ability otherwise functions exactly as the Gather Information skill's Learn News and Rumors, Learn Secret Information, and Locate Individual applicatio… |
| Force Blank | `cdcdb85912d9eb67` | Legacy Era Campaign Guide 40 | `use_the_force` | …detect using the Force. Attempts to detect you using the Sense Surroundings aspect of the Use the Force skill suffer a -10 penalty. You are especially hard to detect using the Force. Attempts t… |
| Inspire Fear I | `cf4b1e5b126a2a7e` | Saga Edition Core Rulebook 210 | `use_the_force` | …takes a -1 penalty on attack rolls and opposed skill checks made against you, as well as Use the Force checks made to activate Force powers that target you. This is a mind-affecting fear effec… |
| Electronic Trail | `d26506bfba104470` | Galaxy of Intrigue 24 | `gather_information` | Electronic Trail Once you have located a target using Gather Information, you can track its electronic presence. Once per day, you receive a catalog of the target… |
| Force Immersion | `d2aabaa6848b4a09` | Jedi Academy Training Manual 77 | `perception` | …ctronic notice and notice by conventional means, using the same result as the DC for both Perception checks and Use Computer checks made to detect you. |
| Force Immersion | `d2aabaa6848b4a09` | Jedi Academy Training Manual 77 | `use_computer` | …to detect you with sensors or electronic surveillance must beat your Stealth check with a Use Computer check. You need only roll a single Stealth check to avoid both electronic notice and noti… |
| Silicon Mind | `d2ffe0250af82d28` | Jedi Academy Training Manual 79 | `use_the_force` | …ain a bonus to your Will Defense equal to your Charisma modifier (minimum +1) against all Use the Force checks until the end of your next turn. Other Force-users have a difficult time knowing h… |
| Slashing Charge | `d587fb91aedddd09` | Knights of the Old Republic Campaign Guide 39 | `use_the_force` | …shing Charge Once per encounter, while making a charge, you take no cumulative penalty to Use the Force checks for each Block attempt you make during the charge. When performing slashing charge… |
| Speed Implant | `d6d3b0a2ec01ca9a` | Legacy Era Campaign Guide 47 | `treat_injury` | …after 8 hours of rest, or by performing successful surgery (as per the application of the Treat Injury skill) on the target. Once per encounter as a standard action, you can give one adjacent… |
| Hotwired Processor | `e9a5fe40ce95a053` | Force Unleashed Campaign Guide 47 | `mechanics` | …is condition persist until you receive repairs (using the repair droid application of the Mechanics skill). You gain temporary processing power, enhancing your mental attributes. When you h… |
| Power Boost | `eb503c1c3fb945a6` | Scavenger's Guide to Droids 28 | `mechanics` | …is condition persist until you receive repairs (using the Repair Droid application of the Mechanics skill). You can use both Power Surge and Power Boost at the same time, but you must move… |
| Surveillance | `f23b63464e0aeff7` | Force Unleashed Campaign Guide 28 | `stealth` | …n check against a single target within line of sight. The DCs equal to 15 or the target's Stealth check result (if the target is actively trying to remain hidden), whichever is greater. I… |
| Wrath of the Dark Side | `f5ebaf5d77257e0c` | Force Unleashed Campaign Guide 88 | `use_the_force` | Wrath of the Dark Side When you roll a natural 20 on a Use the Force check to activate a Force power that directly deals damage to a target, you can choose no… |
| Maximize Cover | `f7b8af6b2e6b50c3` | Clone Wars Campaign Guide 47 | `initiative` | …e Aim Action to negate your Cover, you can make a Stealth check opposed by the attacker's Initiative check. If successful, you retain your Cover bonus. When an opponent uses the Aim Action t… |
| Motion of the Future | `ff2201a270efa29e` | Jedi Academy Training Manual 17 | `use_the_force` | …et of an attack or Force power, you can force your attacker to reroll the attack roll (or Use the Force check) against you, keeping the second result. This counts as using the farseeing Force p… |

## PASS3A_FALSE_POSITIVE (4)

| Talent | ID | Source p. | Tag | Excerpt |
| --- | --- | --- | --- | --- |
| Modify Poison | `661899f73e20f2ce` | Threats of the Galaxy 13 | `treat_injury` | …ivery method by succeeding on a Knowledge (life sciences) check (DC equal to the poison's Treat Injury DC). The poison's capabilities and specific effects are unchanged. You can modify the del… |
| Blaster Turret I | `7b56d0b92582ae88` | Force Unleashed Campaign Guide 57 | `initiative` | …rret I Once per encounter, as standard action you can create a blaster turret (Size Tiny, Initiative +4, Perception +4, Reflex Defense 10, 10 hp, Threshold 8) that can be mounted to any flat… |
| Blaster Turret I | `7b56d0b92582ae88` | Force Unleashed Campaign Guide 57 | `perception` | …encounter, as standard action you can create a blaster turret (Size Tiny, Initiative +4, Perception +4, Reflex Defense 10, 10 hp, Threshold 8) that can be mounted to any flat surface. The t… |
| Force Perception | `a358402a9fc26c02` | Saga Edition Core Rulebook 101 | `deception` | …se the Force check instead of a Perception check to avoid surprise, notice enemies, sense deception, or sense influence. You are considered trained in Perception for purposes of using this… |

## PASS3A_INTENTIONAL_GENERIC_SKILL (9)

| Talent | ID | Source p. | Tag | Excerpt |
| --- | --- | --- | --- | --- |
| Heuristic Mastery | `2b6a4a203b72dc79` | Scavenger's Guide to Droids 29 | `use_the_force` | …limitations of your heuristic processor. You can reroll any untrained skill check (except Use the Force), keeping the second result, even if it is worse. Once per encounter, you can spend a For… |
| Channel Anger | `37ee909a7de54768` | Saga Edition Core Rulebook 213 | `mechanics` | …ck. While Raging, you cannot use Skills that require patience and concentration, such as Mechanics, Stealth, or Use the Force. You let your anger swell into a Rage. As a Swift Action, you… |
| Channel Anger | `37ee909a7de54768` | Saga Edition Core Rulebook 213 | `stealth` | …Raging, you cannot use Skills that require patience and concentration, such as Mechanics, Stealth, or Use the Force. You let your anger swell into a Rage. As a Swift Action, you may spend… |
| Channel Anger | `37ee909a7de54768` | Saga Edition Core Rulebook 213 | `use_the_force` | …cannot use Skills that require patience and concentration, such as Mechanics, Stealth, or Use the Force. You let your anger swell into a Rage. As a Swift Action, you may spend a Force Point to… |
| Competitive Drive | `53b0aa17a95ba670` | Knights of the Old Republic Campaign Guide 42 | `use_the_force` | …counter, you can reroll any Wisdom-, Intelligence-, or Charisma-based skill check (except Use the Force) and take the better result. You are driven to compete and succeed. Once per encounter, y… |
| Spontaneous Skill | `85fddc83428358ae` | Saga Edition Core Rulebook 44 | `use_the_force` | …you were Trained in the Skill. Exception: you cannot use this Talent to make an Untrained Use the Force check as though you were Trained in the skill, unless you have the Force Sensitivity feat… |
| Instruction | `b37ac074a7e8de58` | Force Unleashed Campaign Guide 25 | `use_the_force` | …dividual gains the ability to make a single skill check using your skill modifier (except Use the Force); this skill check must be made before the end of the encounter, or the benefit is lost.… |
| Galactic Guidance | `b62303265cab4eeb` | Unknown Regions 20 | `perception` | …and line of sight to reroll a failed Intelligence- or Wisdom-based skill check other than Perception. Once per encounter, as a reaction, if you succeed on a DC 25 Knowledge (galactic lore) c… |
| Right Gear for the Job | `f09f37cda0fc10e1` | Rebellion Era Campaign Guide 43 | `use_the_force` | …lications of the Skill. You cannot use this Talent to allow an ally to make an Untrained Use the Force check. Once per day when an ally makes an Untrained skill check, as a Reaction you can gr… |

## PASS3A_ROLE_NOT_SKILL (3)

| Talent | ID | Source p. | Tag | Excerpt |
| --- | --- | --- | --- | --- |
| It's a Trap! | `8fe560a110d8f4ee` | Starships of the Galaxy 18 | `pilot` | …aval officers and counteracting them. Once per encounter as a reaction, you can grant the pilot of any single vehicle within line of sight (including a vehicle you are commanding) an im… |
| Legendary Commander | `d1683318140f3906` | Starships of the Galaxy 18 | `pilot` | …ex Defense using your heroic level plus one-half the ship's armor bonus (round down), the pilot's heroic level, or the ship's armor bonus, whichever is more. In addition, all gunners on… |
| Dogfight Gunner | `f52cadb1ae252d0c` | Saga Edition Core Rulebook 207 | `pilot` | …t, you take no penalty on your attack rolls with Vehicle Weapons, even if you are not the Pilot. While your Vehicle is engaged in a Dogfight, you take no penalty on your attack rolls wi… |

## PASS3A_TEXT_MATCH_NOT_SKILL (22)

| Talent | ID | Source p. | Tag | Excerpt |
| --- | --- | --- | --- | --- |
| Noble Fencing Style | `00c3231e4a4173fa` | Knights of the Old Republic Campaign Guide 27 | `deception` | …to increase accuracy, taunting and distracting an opponent with feints, misdirection, and deception. When using a light melee weapon or a lightsaber that you are proficient with, you can us… |
| Unbalancing Adaptation | `02bf213d8104b017` | Legacy Era Campaign Guide 30 | `acrobatics` | Unbalancing Adaptation When you use the Adapt and Survive talent, you also deny the bonus that trigge… |
| Knowledge of the Force | `04eca2813630e8d4` | Knights of the Old Republic Campaign Guide 58 | `knowledge` | Knowledge of the Force You can use your scholarly knowledge of the Force to help others reach their… |
| Natural Healing | `2c18d68d5e294dc8` | Force Unleashed Campaign Guide 54 | `knowledge` | Natural Healing Your extensive knowledge of natural healing allows you to make first aid, treat disease, and treat poison (Treat I… |
| Shadow Armor | `4916dbbae0f18ee1` | Legacy Era Campaign Guide 58 | `use_the_force` | Shadow Armor You use the Force to bend light around yourself, wrapping you in shadows and making it difficult for enemie… |
| Force Momentum | `4cb2cf521a4d2175` | Knights of the Old Republic Campaign Guide 58 | `use_the_force` | Force Momentum You use the Force to add to the impact of your melee weapon, increasing your damage. Whenever you spend a F… |
| Long Stride | `618472c99f355949` | Saga Edition Core Rulebook 50 | `climb` | …eases by 2 squares if you are wearing Light Armor or no Armor. If you have a natural Fly, Climb, or Swim Speed, it increases by 2 squares as well. You cannot use this Talent if you are… |
| Long Stride | `618472c99f355949` | Saga Edition Core Rulebook 50 | `swim` | …squares if you are wearing Light Armor or no Armor. If you have a natural Fly, Climb, or Swim Speed, it increases by 2 squares as well. You cannot use this Talent if you are wearing M… |
| Medical Analyzer | `7fb6b7d078bdb493` | Scavenger's Guide to Droids 26 | `knowledge` | Medical Analyzer You use your medical knowledge and advanced droid processor to improve your treatment of medical conditions. When making… |
| Vahl's Flame | `8ba6abad84c6d9ef` | Legacy Era Campaign Guide 59 | `use_the_force` | Vahl's Flame As a swift action, you can use the Force to call forth the sparks of your goddess, wreathing your weapon in flames. Until the begi… |
| Folded Space Mastery | `93bb4f8c058655f9` | Jedi Academy Training Manual 73 | `jump` | …e Force check result instead of a Use Com-puter check, as though calculating a hyperspace jump. This otherwise uses the normal rules for hyperspace travel, though travel is instantaneo… |
| Bonded Mount | `9c88f3f82e6e2082` | Jedi Academy Training Manual 18 | `ride` | …an empathic link with you, allowing you to sense its emotions as a free action. When you ride a bonded mount, your mount uses your Reflex Defense and Will Defense instead of its own,… |
| Preserving Shot | `a594f0b9ff786a6c` | Force Unleashed Campaign Guide 52 | `jump` | …n, you disable the ship's sublight engines and hyperdrive. The ship cannot move or make a jump to lightspeed until it has received repairs (through use of the repair object application… |
| Interrogator | `aab9d63888f12dba` | Force Unleashed Campaign Guide 102 | `knowledge` | …at no biological creature can match, and combine it with the cruel application of medical knowledge. You can use your Treat Injury modifier on a Persuasion check to change attitude or intim… |
| Guard's Endurance | `bffc3826d39f3946` | Legacy Era Campaign Guide 41 | `endurance` | Guard's Endurance Whenever you begin your turn adjacent to the target of your Ward talent (see below), you… |
| Force Direction | `d65ad7fb7a374762` | Knights of the Old Republic Campaign Guide 58 | `use_the_force` | Force Direction You use the Force to guide your ranged attacks to their target. Whenever you spend a Force point to add to… |
| Sith Alchemy | `eb4f3e8660bc476589d0323d4cc00845` | Jedi Academy Training Manual 21 | `knowledge` | Sith Alchemy Your knowledge of Sith alchemy allows you to imbue certain objects with the power of the dark side. You… |
| Power Boost | `eb503c1c3fb945a6` | Scavenger's Guide to Droids 28 | `jump` | …er surge, you can use one of the following bonuses with your installed locomotion system: Jump +4 squares (walking or wheeled locomotion), or increase hovering height by 4 squares (hov… |
| Sith Alchemy | `eeecb3737aabf789` | Knights of the Old Republic Campaign Guide 41 | `knowledge` | Sith Alchemy Your knowledge of Sith sorcery allows you to imbue talismans and other objects with the power of the dar… |
| Force Haze | `f098749cb8767a5f` | Saga Edition Core Rulebook 41 | `perception` | …rce Point as a Standard Action to create a "Haze" that hides you and your allies from the perception of others. You can hide a number of creatures in line of sight equal to your Class Level.… |
| Instrument of the Force | `f0ade00000000001` | Unknown Regions 30 | `use_the_force` | …ble results according to Search Your Feelings, increase your Dark Side Score by 1. If you use the Force Point in an action that would normally increase your Dark Side Score, increase it by 2 in… |
| Unseen Eyes | `f6a7cb3c07ded492` | Clone Wars Campaign Guide 21 | `use_the_force` | Unseen Eyes Whenever you use the Force Haze Talent, allies hidden by the Force Haze can reroll any Perception check, keeping the… |
