# Phase 3 — Final Owner Policy Packet

Status: `AWAITING_OWNER_FINAL_PHASE3_RULINGS`. One consolidated packet, grouped by tag. No recommendation is made; full ID lists are in the JSON.

- tagGroups: 162
- tagsOwnerDefinitionRequired: 131
- tagsPartiallyDefined: 31
- tagsFullyDefinedWithOpenRecordGap: 0
- unresolvedRecordFindings: 196
- ontologyGaps: 3

## Ontology-gap questions

- `condition_track`: State whether Condition Track movement requires a vocabulary tag; no tag exists or is authorized.
- `full_round_action`: State whether Full-round action requires a vocabulary tag; no tag exists or is authorized.
- `recurring_ion_mechanics`: State whether Recurring ion mechanics (no ion tag; ion != stun) requires a vocabulary tag; no tag exists or is authorized.

## `ability_enhancement` — OWNER_DEFINITION_REQUIRED

Usage: 49 records (13 feats / 36 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when ability_enhancement applies.

Examples:
- Weapon Finesse (FEAT `252b67d6e31c377e`, Saga Edition Core Rulebook p.89); tags melee, lightsaber, precision, ability_enhancement; “With a light melee weapon or lightsaber, use Dexterity modifier instead of Strength modifier on attack rolls. Use Dexterity instead of Strength for attacks with light melee weapons and lightsabers.”
- Predictive Defense (FEAT `25aaf859b6109c02`, Galaxy at War p.25); tags defense, ability_enhancement; “Use either Dexterity modifier or Intelligence modifier to determine Reflex Defense. Use Dexterity or Intelligence to determine Reflex Defense.”
- Fortifying Recovery (FEAT `28a02f0e5412dd53`, Galaxy at War p.23); tags recovery, healing, survivability, resilience, ability_enhancement; “When taking the Recover action, gain bonus HP equal to 2 x Constitution bonus, minimum 2. Damage is removed from these bonus HP first. Remaining bonus HP disappear at encounter end. Bonus HP do not stack. Recover also gr”
- Noble Fencing Style (TALENT `00c3231e4a4173fa`, Knights of the Old Republic Campaign Guide p.27); tags melee, precision, ability_enhancement, lightsaber; “This style of swordplay uses wit and force of personality to increase accuracy, taunting and distracting an opponent with feints, misdirection, and deception. When using a light melee weapon or a lightsaber that you are ”
- Knowledge and Defense (TALENT `06ab0e40780ea63d`, Jedi Academy Training Manual p.75); tags defense, ambush_defense, survivability, ability_enhancement; “You add your Wisdom bonus to your Reflex Defense whenever your Dexterity bonus would normally be denied to you.”

## `action_economy` — PARTIALLY_OWNER_DEFINED

Usage: 647 records (82 feats / 565 talents). Existing policies: ACTION_TYPE_POLICY, FULL_ROUND_ACTION_POLICY. Unresolved records: 0.

- Q: Define when action_economy applies.

Examples:
- Resurgence (FEAT `005e922d0430d86b`, Scum and Villainy p.24); tags recovery, move_action, action_economy; “Detailed Benefit: when you catch your second wind, immediately gain a move action that must be used immediately. The printed table summarizes this as a bonus swift action, creating an internal source conflict. Detailed r”
- Unwavering Focus (FEAT `0214e9586b6c8bb5`, Rebellion Era Campaign Guide p.36); tags mind-affecting, will_defense, defense, reaction, action_economy, skills; “When targeted by a mind-affecting effect requiring a skill check against Will Defense, as a reaction impose -2 on that skill check. React to a mind-affecting skill check against your Will by imposing -2 on the check.”
- Fast Surge (FEAT `05d8053002347946`, Rebellion Era Campaign Guide p.29); tags recovery, healing, action_economy; “On your turn, catch a second wind as a free action instead of a swift action. Catch a second wind as a free action on your turn.”
- Supervising Droid (TALENT `0025737e7198390e`, Scavenger's Guide to Droids p.27); tags droid, ally_support, support, teamwork, skills, standard_action, swift_action, action_economy, once-per-encounter, reliability; “You are programmed to oversee other droids. You can use each of the following actions once per encounter: • Combat Support: As a standard action, you automatically aid another on an allied droid's attack roll, provided y”
- Soft to Solid (TALENT `004732cba6bfa4a7`, Jedi Academy Training Manual p.81); tags force, reaction, action_economy, force_point_spend, resource_spend, damage_reduction, defense, resilience, survivability; “As a reaction when you are damaged by an attack, you can spend a Force Point to increase the rigidity of your skin, gaining DR 10 until the end of your next turn.”

## `alchemy` — OWNER_DEFINITION_REQUIRED

Usage: 6 records (0 feats / 6 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when alchemy applies.

Examples:
- Rapid Alchemy (TALENT `69420a9a5ff5d8b9`, Jedi Academy Training Manual p.21); tags alchemy, crafting, modification, weapon_empowerment, equipment, melee, standard_action, action_economy, precision, damage_bonus, sustained_damage, burst_damage, setup; “Asa standard action, you can perform minor alchemical alterations to a melee weapon you wield. For the remainder of the encounter, you gain a +2 equipment bonus on attack rolls with that weapon, Addition-ally, once befor”
- Sith Alchemy Specialist (TALENT `9bee4563b328def7`, Jedi Academy Training Manual p.22); tags crafting, dark_side, dark_side_score, force, alchemy, modification, equipment, force_point_spend, resource_spend; “You can modify an object with Sith alchemy so that it gains a specific trait. Specific traits are listed on Table 1-1. You can only perform one modification at a time. Unless otherwise noted, you cannot grant more than o”

## `ally-trigger` — OWNER_DEFINITION_REQUIRED

Usage: 26 records (2 feats / 24 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when ally-trigger applies.

Examples:
- Justice Seeker (FEAT `3595086bb17d4303`, Rebellion Era Campaign Guide p.34); tags ally-trigger, damage_bonus; “Gain +2 damage on attacks against targets that have damaged one of your allies since the end of your last turn. Gain +2 damage against a target that has harmed one of your allies since your last turn ended.”
- Jedi Familiarity (FEAT `fc56de4d0d15c95c`, Clone Wars Campaign Guide p.31); tags force, force_support, ally-trigger, force-point, resource_recovery, once-per-encounter; “Once per encounter, when an ally's Force power or Force talent targets or affects you, gain one temporary Force Point. The temporary Force Point expires at encounter end. No benefit if that Force power/talent damages you”
- Oath of Duty (TALENT `001ae84d5862af55`, Legacy Era Campaign Guide p.45); tags ally-trigger, lightsaber, durability, survivability, scaling, positioning; “When an ally within 12 squares of you and within your line of sight hits with a lightsaber attack, you gain bonus hit points equal to 3 x your class level until the end of your next turn. Damage is subtracted from the bo”
- Friend or Foe (TALENT `014d291a6e16cc12`, Legacy Era Campaign Guide p.27); tags ally-trigger, reaction, action_economy, ranged, counterattack, control, positioning, evasion; “Whenever an ally within your line of sight is missed by a ranged attack, you can (as a reaction, once per turn) designate one enemy adjacent to that ally. Compare the attack roll of the missed attack to the Reflex Defens”

## `ally_support` — OWNER_DEFINITION_REQUIRED

Usage: 285 records (20 feats / 265 talents). Existing policies: none. Unresolved records: 51.

- Q: Define when `ally_support` applies. State whether records whose canonical text matches K.ally in the observed wording forms qualify.

Examples:
- Wary Sentries (FEAT `0053d97632b02e4a`, Galaxy at War p.30); tags teamwork, perception, awareness, scaling, reliability; forms OTHER
- Mounted Regiment (FEAT `0e9aa3d941f4eb80`, Galaxy at War p.29); tags teamwork, ride, mount, rider, beast, defense, reaction, action_economy, scaling; forms OTHER
- Ascension Specialists (FEAT `125c328c4573890a`, Galaxy at War p.28); tags teamwork, climb, movement, mobility, scaling; forms OTHER
- Justice Seeker (FEAT `3595086bb17d4303`, Rebellion Era Campaign Guide p.34); tags ally-trigger, damage_bonus; forms OTHER
- Separatist Military Training (FEAT `477b62d36e012719`, Clone Wars Campaign Guide p.31); tags teamwork, positioning, precision; forms OTHER

## `ambush` — OWNER_DEFINITION_REQUIRED

Usage: 46 records (7 feats / 39 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `ambush` applies. State whether records whose canonical text matches F.ambush in the observed wording forms qualify.

Examples:
- K'tara Training (FEAT `1dfbddf5f1aa57c3`, Galaxy at War p.27); tags martial_arts, unarmed, melee, ambush, damage_bonus, stun, control, once-per-encounter, swift_action, action_economy, setup; “One unarmed attack during your turn deals +1 damage die against a flat-footed enemy. Once per encounter after unarmed damage to a target denied Dexterity to Reflex, make a free unarmed attack vs Fortitude; on success, ta”
- Maniacal Charge (FEAT `4330126d10dccd71`, The Unknown Regions p.27); tags intimidation, persuasion, movement, mobility, attack_of_opportunity, ambush, setup, control, action_economy; “During a charge, a free-action Intimidate check can suppress attacks of opportunity from enemies passed and make the charge target flat-footed until the next turn.”
- Deadly Sniper (FEAT `6fb0f56dd9b9b75c`, Scum and Villainy p.21); tags ranged, sniper, ambush, precision, damage_bonus, sustained_damage; “Detailed Benefit: when making a ranged attack against a target unaware of you, gain +2 attack and +1 die damage on the first attack each turn. The printed summary table differs in wording and does not cleanly preserve th”
- Unreadable (TALENT `01bcee2365b82ce6`, Scum and Villainy p.14); tags will_defense, defense, resilience, social, deception, feint, ambush, setup; “You gain a +5 bonus to your Will Defense against skill checks made to read your emotions and influence your attitude. In addition, whenever you successfully feint a target in combat, that target is flat-footed against al”
- Sudden Strike (TALENT `08c80cfea1a3b886`, Scum and Villainy p.15); tags mobility, positioning, ambush, precision_damage, burst_damage, setup, sustained_damage; “Whenever you would gain the benefit of the Skirmisher talent and you successfully hit your opponent, you deal sneak attack damage in addition to the normal damage dealt by the attack.”

## `ambush_defense` — OWNER_DEFINITION_REQUIRED

Usage: 17 records (2 feats / 15 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `ambush_defense` applies. State whether records whose canonical text matches F.ambush_defense in the observed wording forms qualify.

Examples:
- Bad Feeling (FEAT `37aa58a3833bf34a`, The Force Unleashed Campaign Guide p.32); tags surprise_round, move_action, action_economy, movement, mobility, ambush_defense, initiative; “You may always take a move action during a surprise round, even if surprised. If not surprised, that move action is in addition to the actions you normally receive in the surprise round. Always gain a move action in the ”
- Combat Reflexes (FEAT `7146640744fdf052`, Saga Edition Core Rulebook p.83); tags attack_of_opportunity, reaction, action_economy, scaling, ambush_defense; “Gain additional attacks of opportunity per round equal to your Dexterity modifier. You may make attacks of opportunity while flat-footed. You still cannot make more than one attack of opportunity for the same provoking a”
- Force Warning (TALENT `0178e98b17ab2bcc`, Knights of the Old Republic Campaign Guide p.40); tags force, initiative, ally_support, support, teamwork, reroll, reliability, ambush_defense, surprise_round, scaling, awareness; “Allies within 12 squares can choose to reroll their Initiative checks at the start of combat but must take the second result, even if it is worse. Furthermore, if any allies within 12 squares are surprised at the start o”
- Knowledge and Defense (TALENT `06ab0e40780ea63d`, Jedi Academy Training Manual p.75); tags defense, ambush_defense, survivability, ability_enhancement; “You add your Wisdom bonus to your Reflex Defense whenever your Dexterity bonus would normally be denied to you.”

## `anti-force` — OWNER_DEFINITION_REQUIRED

Usage: 25 records (2 feats / 23 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when anti-force applies.

Examples:
- Unstoppable Force (FEAT `0a6c87a410bee1f2`, Clone Wars Campaign Guide p.31); tags force_defense, anti-force, defense, will_defense, use_the_force, force; “Gain +5 insight to Fortitude Defense and Will Defense against any attack or effect requiring a Use the Force check. Gain +5 insight Fortitude and Will against attacks/effects resolved with Use the Force.”
- Pall of the Dark Side (FEAT `8d164553709dd068`, Clone Wars Campaign Guide p.31); tags dark_side, dark_side_score, use_the_force, force, stealth, detection, force_defense, anti-force; “Add one-half your Dark Side Score, minimum +1, to Use the Force checks made to resist detection via Sense Force. Add half your Dark Side Score, minimum +1, when resisting Sense Force detection.”
- Steel Mind (TALENT `19ba6767726bdc86`, Legacy Era Campaign Guide p.40); tags anti-force, force, mind-affecting, force_defense, will_defense, resilience; “If you resist the effects of a mind-affecting Force power, the user of that power cannot attempt to use the same power against you for the rest of the encounter.”
- Telekinetic Resistance (TALENT `203464310c5c2492`, Legacy Era Campaign Guide p.40); tags anti-force, force, telekinesis, mobility, movement, defense, resilience; “Whenever you are targeted by a Force power that moves you, you reduce the distance you are moved by half.”

## `armor` — OWNER_DEFINITION_REQUIRED

Usage: 31 records (7 feats / 24 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when armor applies.

Examples:
- Tech Specialist (FEAT `42e2404790756700`, Saga Edition Web Enhancement 1: The Tech Specialist p.3); tags tech, mechanics, modification, equipment, armor, droid, vehicle, ability_enhancement, durability, defense, skills, mobility, shields, weapon_empowerment, precision, damage_bonus; “Modify a device, armor, weapon, droid, or vehicle with one special trait unless otherwise noted. Normally only one Tech Specialist benefit may be applied to an item, and the same benefit cannot be applied more than once.”
- Grand Army of the Republic Training (FEAT `72146d8a36d77736`, Clone Wars Campaign Guide p.31); tags armor, defense, will_defense, equipment; “If your worn armor grants an equipment bonus to Fortitude Defense, also apply that armor's equipment bonus to Will Defense. While proficient in your armor, apply its Fortitude equipment bonus to Will Defense too.”
- Armor Proficiency (Light) (FEAT `773ec00effc7e96f`, Saga Edition Core Rulebook p.82); tags armor, equipment, skills, acrobatics, climb, endurance, initiative, jump, stealth, swim; “Wear light armor without its nonproficiency attack/skill penalties and gain its special equipment bonuses. Use light armor without nonproficiency penalties and gain its special equipment bonuses.”
- Armored Spacer (TALENT `0bf26c4fb8622e0b`, Force Unleashed Campaign Guide p.52); tags armor, equipment, space, survivability; “You can use armored spacesuits as if you had the Armor Proficiency (heavy) feat.”
- Cortosis Retaliation (TALENT `22ce14b57f9b8c1a`, Legacy Era Campaign Guide p.45); tags armor, equipment, lightsaber, melee, counterattack, attack_of_opportunity, reaction, action_economy; “Whenever you successfully use a cortosis gauntlet to parry an attack made with a lightsaber, you may make an immediate attack of opportunity against the attacker.”

## `awareness` — OWNER_DEFINITION_REQUIRED

Usage: 44 records (9 feats / 35 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when awareness applies.

Examples:
- Wary Sentries (FEAT `0053d97632b02e4a`, Galaxy at War p.30); tags teamwork, perception, awareness, scaling, reliability; “Gain +3 competence on Perception checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, take 10 on Perception checks even when ”
- Sharp Senses (FEAT `2357f4a68fe571fb`, Rebellion Era Campaign Guide p.35); tags perception, awareness, force_point_spend, resource_spend, force_multiplier; “Whenever you spend a Force Point to add to Perception, increase the die type by two steps (d6 to d10, or d8 to d12). Force Points added to Perception use a die two steps larger.”
- Keen Scent (FEAT `46d70ac7db6872f6`, Rebellion Era Campaign Guide p.34); tags senses, detection, awareness; “The range of your Scent ability increases to 20 squares. Your Scent ability has a range of 20 squares.”
- Force Warning (TALENT `0178e98b17ab2bcc`, Knights of the Old Republic Campaign Guide p.40); tags force, initiative, ally_support, support, teamwork, reroll, reliability, ambush_defense, surprise_round, scaling, awareness; “Allies within 12 squares can choose to reroll their Initiative checks at the start of combat but must take the second result, even if it is worse. Furthermore, if any allies within 12 squares are surprised at the start o”
- Search and Destroy (TALENT `1907d80212a12c68`, Galaxy at War p.31); tags move_action, action_economy, ally_support, support, teamwork, leadership, command, morale, perception, skills, recon, detection, awareness; “As a move action, you give all squad members a +2 morale bonus to Perception checks until the end of your next turn.”

## `beast` — OWNER_DEFINITION_REQUIRED

Usage: 14 records (5 feats / 9 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when beast applies.

Examples:
- Mounted Regiment (FEAT `0e9aa3d941f4eb80`, Galaxy at War p.29); tags teamwork, ride, mount, rider, beast, defense, reaction, action_economy, scaling; “Gain +3 competence on Ride checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, once per round as a reaction when your mount ”
- Mounted Defense (FEAT `acb7efcc70769b9f`, Threats of the Galaxy p.127); tags mount, ride, rider, beast, vehicle, defense, evasion, once-per-encounter; “While riding a beast or speeder bike, as passenger or pilot, once per encounter redirect an attack made against you to the mount or vehicle. Choose to redirect after the attack roll result is known but before damage or o”
- Mounted Combat (FEAT `af5caa92d8fc0e3a`, The Unknown Regions p.27); tags mount, ride, rider, beast, movement, mobility, swift_action, reaction, action_economy, defense, evasion, endurance; “Uses Ride to boost a living mount's speed as a swift action and, once per round as a reaction, can negate a weapon hit against rider or mount with a successful Ride check.”
- Soothing Presence (TALENT `0a65325a98b108a7`, Jedi Academy Training Manual p.18); tags beast, social, manipulation, control, reliability; “Whenever you encounter a beast with an unfriendly attitude toward you, you automatically shift its attitude to indifferent (no skill check required).”
- Beast Trick (TALENT `6c374ec52e710f11`, Knights of the Old Republic Campaign Guide p.53); tags force, force_power_synergy, beast, mind-affecting, control, manipulation, telepathy, force_offense; “You can use the mind trick Force power on creatures of Intelligence 2 and lower. However, a beast with an Intelligence of 2 or less still cannot perform any complex action or understand complex commands it wouldn't other”

## `beast_companion` — OWNER_DEFINITION_REQUIRED

Usage: 6 records (0 feats / 6 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when beast_companion applies.

Examples:
- Bonded Mount (TALENT `9c88f3f82e6e2082`, Jedi Academy Training Manual p.18); tags force, beast, beast_companion, mount, rider, force_point_spend, resource_spend, action_economy, defense, will_defense, senses, telepathy, survivability, exploration; “Whenever you encounter a domesticated beast with a friendly or helpful attitude toward you, you can spend a Force Point as a full-round action to bond the beast to you as a mount. A bonded mount shares an empathic link w”
- Akk Dog Trainer's Actions (TALENT `ad7fd3e1a2b04c30`, Clone Wars Campaign Guide p.57); tags beast_companion, followers, ally_support, support, teamwork, standard_action, action_economy, melee, ranged, damage_bonus, burst_damage, precision, sustained_damage, targeting, damage_threshold; “You and your akk dog have bonded through the Force and can fight in concert. You can use any of the following actions on your turn. Attack in Concert: As a standard action, you can make a melee or ranged attack against a”

## `biotech` — OWNER_DEFINITION_REQUIRED

Usage: 18 records (2 feats / 16 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when biotech applies.

Examples:
- Biotech Surgery (FEAT `77dba0a49c63e42d`, Legacy Era Campaign Guide p.35); tags biotech, medical, medicine, treat_injury, implant; “Install a biotech prosthesis onto a living being. Surgery takes 1 uninterrupted hour followed by a DC 20 Treat Injury check; failure permits another attempt after another uninterrupted hour. Self-installation is allowed ”
- Biotech Specialist (FEAT `bf6c01fa590a3f75`, Legacy Era Campaign Guide p.34); tags biotech, tech, mechanics, modification, equipment, armor, vehicle, weapon_empowerment, ability_enhancement, durability, skills, mobility, treat_injury, medical; “Modify Yuuzhan Vong biotech devices, armor, weapons, or vehicles with one of the printed biotech traits. Only one modification may be performed at a time; normal one-benefit-per-item and no-duplicate-benefit limits apply”
- Adrenaline Implant (TALENT `2fdf215a5da99e00`, Legacy Era Campaign Guide p.47); tags once-per-encounter, standard_action, action_economy, biotech, implant, equipment, ally_support, support, durability, survivability, scaling, treat_injury; “Once per encounter as a standard action, you can give one adjacent living creature an adrenaline implant. The target must be willing to receive this implant, which grants the target 10 bonus hit points at the start of ea”
- Precision Implant (TALENT `58e37d40d3aa7d4b`, Legacy Era Campaign Guide p.47); tags once-per-encounter, standard_action, action_economy, biotech, implant, equipment, ally_support, support, precision, treat_injury; “Once per encounter as a standard action, you can give one adjacent living creature a precision implant. The target must be willing to receive this implant, which grants the target a +1 equipment bonus on attack rolls unt”

## `block` — OWNER_DEFINITION_REQUIRED

Usage: 16 records (0 feats / 16 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when block applies.

Examples:
- Defensive Acuity (TALENT `0bc102751285d17c`, Legacy Era Campaign Guide p.27); tags fighting_defensively, lightsaber, melee, damage_bonus, sustained_damage, block, deflect, use_the_force, force_defense, defense, force; “When you take the fight defensively action, you deal +1 die of damage with lightsaber attacks and gain a +2 circumstance bonus on Use the Force checks made to negate an attack with the Block or Deflect talents. These ben”
- Praetoria Ishu (TALENT `16aa9efd54967320`, Legacy Era Campaign Guide p.45); tags force, use_the_force, block, deflect, lightsaber, melee_defense, ranged_defense, ally_support, support, teamwork, defense, positioning; “You can use the Block talent to negate a melee attack made against an adjacent ally. In addition, you can use the Deflect talent to negate a ranged attack made against an adjacent ally.”

## `burst_damage` — OWNER_DEFINITION_REQUIRED

Usage: 94 records (11 feats / 83 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `burst_damage` applies. State whether records whose canonical text matches D.burst_damage in the observed wording forms qualify.

Examples:
- Burst Fire (FEAT `0d4d7c147c48cdab`, Saga Edition Core Rulebook p.82); tags ranged, damage_bonus, burst_damage, targeting; “Official errata removes Strength 13 as a prerequisite. With an autofire-capable ranged weapon in autofire mode, make a single-target attack at -5 for +2 damage dice. Does not stack with Deadeye or Rapid Shot extra damage”
- Flèche (FEAT `29173ea2d8416eea`, Galaxy of Intrigue p.27); tags melee, movement, mobility, critical_hit, once-per-encounter, burst_damage; “Once per encounter when charging, any natural attack roll of 17 or higher becomes a critical hit. Once per encounter during a charge, turn a natural 17+ attack roll into a critical hit.”
- Power Attack (FEAT `3f76464c43c73f84`, Saga Edition Core Rulebook p.87); tags melee, precision, damage_bonus, burst_damage; “Before attacking, choose a value up to base attack bonus; subtract it from all melee attacks and add it to all melee damage until your next turn. With a two-handed weapon, or one-handed weapon wielded in two hands, add t”
- Simultaneous Strike (TALENT `040e50766b518ea6`, Jedi Academy Training Manual p.89); tags unarmed, martial_arts, melee, standard_action, action_economy, burst_damage, positioning; “As a standard action, you can make two unarmed attacks, each against different targets.”
- Sudden Strike (TALENT `08c80cfea1a3b886`, Scum and Villainy p.15); tags mobility, positioning, ambush, precision_damage, burst_damage, setup, sustained_damage; “Whenever you would gain the benefit of the Skirmisher talent and you successfully hit your opponent, you deal sneak attack damage in addition to the normal damage dealt by the attack.”

## `command` — OWNER_DEFINITION_REQUIRED

Usage: 11 records (0 feats / 11 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when command applies.

Examples:
- Fall Back (TALENT `16b020752725d7a9`, Galaxy at War p.31); tags move_action, action_economy, ally_support, support, teamwork, leadership, command, mobility, positioning, evasion, attack_of_opportunity; “As a move action, you can enable each member of your squad to immediately move two squares. This movement does not provoke an attack of opportunity.”
- Search and Destroy (TALENT `1907d80212a12c68`, Galaxy at War p.31); tags move_action, action_economy, ally_support, support, teamwork, leadership, command, morale, perception, skills, recon, detection, awareness; “As a move action, you give all squad members a +2 morale bonus to Perception checks until the end of your next turn.”

## `concealment` — OWNER_DEFINITION_REQUIRED

Usage: 55 records (5 feats / 50 talents). Existing policies: none. Unresolved records: 1.

- Q: Define when `concealment` applies. State whether records whose canonical text matches I.concealment in the observed wording forms qualify.

Examples:
- Stealthy Withdrawal (TALENT `c483676cb3c07cb3`, Legacy Era Campaign Guide p.42); tags ally_support, support, teamwork, stealth, skills, infiltration, evasion, mobility, movement, action_economy; forms OTHER

## `condition_removal` — OWNER_DEFINITION_REQUIRED

Usage: 32 records (5 feats / 27 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `condition_removal` applies. State whether records whose canonical text matches J.condition_removal in the observed wording forms qualify.

Examples:
- Quick Comeback (FEAT `21a0af5ef58172a0`, Rebellion Era Campaign Guide p.34); tags damage_threshold, condition_removal, recovery, swift_action, action_economy; “When an attack deals damage at least equal to your Damage Threshold and moves you down the condition track, until end of your next turn you can move +1 CT as a single swift action. Use only once per attack that moved you”
- Shake It Off (FEAT `3036290329d5b3e6`, Saga Edition Core Rulebook p.88); tags condition_removal, recovery, swift_action, action_economy; “Spend two swift actions instead of three to move +1 step on the condition track. Recover +1 CT in two swift actions instead of three.”
- Recovering Surge (FEAT `5ba03b04f0f1c7d7`, Rebellion Era Campaign Guide p.30); tags condition_removal, recovery, healing; “Whenever you catch a second wind, move +1 step on the condition track. Catching a second wind also moves you +1 step on the condition track.”
- Hardiness (TALENT `038fcce2b039ece5`, Clone Wars Campaign Guide p.56); tags force, force_point_spend, resource_spend, recovery, condition_removal, swift_action, action_economy; “You can spend a Force Point to reduce the number of Swift Actions it takes you to move +1 step along to Condition Track by one.”
- Resilience (TALENT `0dde210ea6d197ef`, Saga Edition Core Rulebook p.40); tags force, force_point_spend, resource_spend, swift_action, action_economy, recovery, condition_removal, resilience, survivability; “You can spend a Force Point as a swift action to move +2 steps along the condition track.”

## `control` — PARTIALLY_OWNER_DEFINED (broad)

Usage: 254 records (46 feats / 208 talents). Existing policies: SPECIFIC_OVER_BROAD_POLICY. Unresolved records: 0.

- Q: Define when `control` applies. State whether records whose canonical text matches  in the observed wording forms qualify.

Examples:
- Battering Attack (FEAT `01dee6f32bbd8f85`, Galaxy at War p.22); tags melee, control, battlefield_control, movement, positioning; “Whenever Bantha Rush successfully moves a creature, also knock that creature prone. A successful Bantha Rush also knocks the moved target prone.”
- Staggering Attack (FEAT `192923f60db38831`, Galaxy at War p.26); tags melee, skills, control, precision; “With a melee weapon, choose -2 attack; if the attack deals damage, target takes -2 skill checks until end of your next turn. Alternatively choose -5 attack; on damage, target takes -5 skill checks until end of your next ”
- Wrruushi Training (FEAT `1d0291d930abda15`, Galaxy at War p.28); tags martial_arts, unarmed, melee, survivability, resilience, control, once-per-encounter, critical_hit, damage; “Once per round after a successful unarmed attack, gain bonus HP equal to Constitution modifier; damage removes these first, leftovers expire at encounter end, and they do not stack. Once per encounter, make an unarmed at”
- Reverse Strength (TALENT `002c2d4fd8383a3e`, Galaxy of Intrigue p.23); tags grapple, control, battlefield_control, melee, unarmed, damage, scaling; “You know how to use an opponent's strength against it. Whenever you successfully grapple an opponent, you deal damage equal to the opponent's Strength modifier (minimum 1 point).”
- Friend or Foe (TALENT `014d291a6e16cc12`, Legacy Era Campaign Guide p.27); tags ally-trigger, reaction, action_economy, ranged, counterattack, control, positioning, evasion; “Whenever an ally within your line of sight is missed by a ranged attack, you can (as a reaction, once per turn) designate one enemy adjacent to that ally. Compare the attack roll of the missed attack to the Reflex Defens”

## `counterattack` — OWNER_DEFINITION_REQUIRED

Usage: 46 records (5 feats / 41 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `counterattack` applies. State whether records whose canonical text matches H.counterattack in the observed wording forms qualify.

Examples:
- Stand Tall (FEAT `51a2fdd9a7965111`, Galaxy of Intrigue p.29); tags ally_support, support, teamwork, reaction, action_economy, counterattack, once-per-encounter; “Once per encounter when you take damage, every ally within 6 squares and line of sight may, as a reaction, make one attack against the creature that damaged you. Once per encounter when damaged, nearby visible allies may”
- Hijkata Training (FEAT `6dcb59b199dba6a1`, Galaxy at War p.26); tags martial_arts, unarmed, melee, attack_of_opportunity, counterattack, control, once-per-encounter, ally_support, support, teamwork, reaction, action_economy, movement, mobility; “Once per round after an adjacent enemy damages you with a melee attack, make an unarmed AoO at -5 against that enemy even if the attack normally would not provoke. Once per encounter after damaging an enemy with an unarm”
- Crossfire (FEAT `6e3b0ca6413e607c`, The Force Unleashed Campaign Guide p.33); tags ranged, cover, counterattack, targeting; “If a ranged attack misses a target with soft cover, immediately make an attack with the same weapon and attack bonus against the creature providing that soft cover. Usable only once per round. Once per round, a ranged mi”
- Friend or Foe (TALENT `014d291a6e16cc12`, Legacy Era Campaign Guide p.27); tags ally-trigger, reaction, action_economy, ranged, counterattack, control, positioning, evasion; “Whenever an ally within your line of sight is missed by a ranged attack, you can (as a reaction, once per turn) designate one enemy adjacent to that ally. Compare the attack roll of the missed attack to the Reflex Defens”
- Risk for Reward (TALENT `04b9cb3683c6e485`, Rebellion Era Campaign Guide p.25); tags reaction, action_economy, counterattack, attack_of_opportunity, melee, ranged; “Once per turn, when an enemy damages you with an Attack of Opportunity, you can make a single melee or ranged attack against a target in range as a Reaction.”

## `cover` — OWNER_DEFINITION_REQUIRED

Usage: 38 records (10 feats / 28 talents). Existing policies: none. Unresolved records: 7.

- Q: Define when `cover` applies. State whether records whose canonical text matches I.cover in the observed wording forms qualify.

Examples:
- Tech Specialist (FEAT `42e2404790756700`, Saga Edition Web Enhancement 1: The Tech Specialist p.3); tags tech, mechanics, modification, equipment, armor, droid, vehicle, ability_enhancement, durability, defense, skills, mobility, shields, weapon_empowerment, precision, damage_bonus; forms OTHER
- Lead From the Front (TALENT `a67a1a657fe5665c`, Rebellion Era Campaign Guide p.24); tags ranged, ally_support, support, teamwork, target-designation, precision, morale, initiative, setup; forms OTHER
- Seek and Destroy (TALENT `adacf682b6ccf21c`, Clone Wars Campaign Guide p.25); tags ambush, melee, mobility, movement, stealth, concealment, detection, evasion, setup, perception; forms OTHER
- Stealthy Withdrawal (TALENT `c483676cb3c07cb3`, Legacy Era Campaign Guide p.42); tags ally_support, support, teamwork, stealth, skills, infiltration, evasion, mobility, movement, action_economy; forms OTHER
- Fast Talker (TALENT `eeed98748becb161`, Force Unleashed Campaign Guide p.27); tags deception, social, skills, standard_action, action_economy, skill_mastery, reliability; forms OTHER

## `crafting` — OWNER_DEFINITION_REQUIRED

Usage: 38 records (2 feats / 36 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when crafting applies.

Examples:
- Scavenger (FEAT `6cf1898b8c3c837c`, The Force Unleashed Campaign Guide p.35); tags crafting, resources, perception, equipment, mechanics; “Spend 1 hour scavenging materials from vehicles or objects. Make a Perception check and produce raw materials worth check result × 30 credits. Materials must be applied to constructing one specific object. You may scaven”
- Starship Designer (FEAT `e9147ce66a783fbb`, Starships of the Galaxy p.20); tags tech, mechanics, crafting, modification, vehicle, durability, shields, weapon_empowerment, precision; “Design a starship from scratch using the printed time/DC/cost scaling procedure. Other Mechanics-trained characters can Aid Another; additional Starship Designer holders reduce effective cost for design-time calculation.”
- Greater Force Talisman (TALENT `0c636cdbb63cdba3`, Saga Edition Core Rulebook p.214); tags force, force_point_spend, resource_spend, talisman, crafting, equipment, empowerment, defense, survivability, action_economy; “You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you. Creating the Talisman takes a Full-Round Action. While you wear or carry th”
- Focused Force Talisman (TALENT `12eea831f06c45f7`, Clone Wars Campaign Guide p.40); tags force, talisman, crafting, equipment, empowerment, force_power_synergy, force_capacity, resource_recovery, recovery, force_point_spend, resource_spend; “When you create a Force talisman, you can select a single Force power from your Force suite. Whenever you are wearing this talisman and activate the selected Force power, you can spend a Force Point to immediately regain”

## `critical_hit` — PARTIALLY_OWNER_DEFINED

Usage: 27 records (6 feats / 21 talents). Existing policies: CRITICAL_SUCCESS_POLICY, SPECIFIC_OVER_BROAD_POLICY. Unresolved records: 0.

- Q: Define when critical_hit applies.

Examples:
- Wrruushi Training (FEAT `1d0291d930abda15`, Galaxy at War p.28); tags martial_arts, unarmed, melee, survivability, resilience, control, once-per-encounter, critical_hit, damage; “Once per round after a successful unarmed attack, gain bonus HP equal to Constitution modifier; damage removes these first, leftovers expire at encounter end, and they do not stack. Once per encounter, make an unarmed at”
- Flèche (FEAT `29173ea2d8416eea`, Galaxy of Intrigue p.27); tags melee, movement, mobility, critical_hit, once-per-encounter, burst_damage; “Once per encounter when charging, any natural attack roll of 17 or higher becomes a critical hit. Once per encounter during a charge, turn a natural 17+ attack roll into a critical hit.”
- Triple Crit (FEAT `3d4a4e93ced26712`, Saga Edition Core Rulebook p.89); tags critical_hit, damage_bonus, weapon_specialization; “Choose one weapon, including unarmed attack if desired. Critical hits with the selected weapon deal triple damage instead of double. Repeatable for different weapons; effects do not stack. Choose a proficient weapon; its”
- Extended Critical Range (heavy weapons) (TALENT `04985a42930dff2a`, Force Unleashed Campaign Guide p.42); tags heavy_weapon, ranged, critical_hit, precision, weapon_training; “When you are using a heavy weapon, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other ”
- Martial Resurgence (TALENT `0fb750f0f0e6f767`, Jedi Academy Training Manual p.89); tags unarmed, martial_arts, melee, critical_hit, force, force_power_synergy, force_capacity, resource_recovery, recovery, critical_success; “You recover all spent Force powers, adding them to your Force suite again, whenever you roll a natural 20 on an unarmed attack.”

## `damage` — OWNER_DEFINITION_REQUIRED

Usage: 42 records (21 feats / 21 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when damage applies.

Examples:
- Grazing Shot (FEAT `1228a537592ad145`, Galaxy of Intrigue p.27); tags ranged, targeting, positioning, action_economy, damage; “After a successful ranged attack against one target, make a second attack against another target in direct line of sight and within 6 squares of the first. If the second attack succeeds, roll damage once and divide it eq”
- Wrruushi Training (FEAT `1d0291d930abda15`, Galaxy at War p.28); tags martial_arts, unarmed, melee, survivability, resilience, control, once-per-encounter, critical_hit, damage; “Once per round after a successful unarmed attack, gain bonus HP equal to Constitution modifier; damage removes these first, leftovers expire at encounter end, and they do not stack. Once per encounter, make an unarmed at”
- Hold Together (FEAT `2eb0c304d99ef6ee`, The Unknown Regions p.26); tags vehicle, reaction, action_economy, force_point_spend, resource_spend, durability, damage; “As a reaction, spends a Force Point to delay the effect of damage dealt to a Colossal-or-smaller vehicle being ridden in or piloted until the end of the round.”
- Reverse Strength (TALENT `002c2d4fd8383a3e`, Galaxy of Intrigue p.23); tags grapple, control, battlefield_control, melee, unarmed, damage, scaling; “You know how to use an opponent's strength against it. Whenever you successfully grapple an opponent, you deal damage equal to the opponent's Strength modifier (minimum 1 point).”
- Dark Healing (TALENT `008b28849b74234d`, Saga Edition Core Rulebook p.223); tags force, force_point_spend, resource_spend, standard_action, action_economy, ranged, force_offense, healing, recovery, damage, scaling; “You can spend a Force Point to heal wounds by drawing life energy from another creature within 6 squares of you. Using this ability is a Standard Action, and you must succeed on a ranged attack roll. If the attack equals”

## `damage_reduction` — OWNER_DEFINITION_REQUIRED

Usage: 32 records (4 feats / 28 talents). Existing policies: none. Unresolved records: 2.

- Q: Define when `damage_reduction` applies. State whether records whose canonical text matches I.damage_reduction in the observed wording forms qualify.

Examples:
- Akk Dog Trainer's Actions (TALENT `ad7fd3e1a2b04c30`, Clone Wars Campaign Guide p.57); tags beast_companion, followers, ally_support, support, teamwork, standard_action, action_economy, melee, ranged, damage_bonus, burst_damage, precision, sustained_damage, targeting; forms OTHER
- Sith Alchemy (TALENT `eb4f3e8660bc476589d0323d4cc00845`, Jedi Academy Training Manual p.21); tags force, dark_side, dark_side_score, alchemy, crafting, equipment, armor, talisman, weapon_empowerment, empowerment, modification, force_point_spend, resource_spend, damage_bonus, force_offense, force_power_synergy, lightsaber, melee, block, deflect, swift_action, action_economy, scaling; forms OTHER

## `dark_side` — OWNER_DEFINITION_REQUIRED

Usage: 41 records (1 feats / 40 talents). Existing policies: none. Unresolved records: 3.

- Q: Define when `dark_side` applies. State whether records whose canonical text matches N.dark_side in the observed wording forms qualify.

Examples:
- Dark Scourge (TALENT `08fc3247755c5ebe`, Saga Edition Core Rulebook p.223); tags precision, targeting, melee, ranged; forms OTHER
- Force Harmony (TALENT `5b949c8cd8e78ee8`, Jedi Academy Training Manual p.16); tags force, force_point_spend, resource_spend, once-per-encounter, resources; forms OTHER
- Attuned (TALENT `bd797d3f83d0f61f`, Clone Wars Campaign Guide p.53); tags force, light_side, force_power_synergy, critical_success, action_economy, force_capacity, resource_recovery, recovery; forms OTHER

## `dark_side_score` — OWNER_DEFINITION_REQUIRED

Usage: 18 records (1 feats / 17 talents). Existing policies: none. Unresolved records: 5.

- Q: Define when `dark_side_score` applies. State whether records whose canonical text matches N.dark_side_score in the observed wording forms qualify.

Examples:
- Focused Attack (TALENT `2fc019fa8c4108a7`, Clone Wars Campaign Guide p.53); tags force, light_side, dark_side, force_point_spend, resource_spend, reroll, reliability, precision; forms OTHER
- Resist the Dark Side (TALENT `3331d4b2b88e446f`, Saga Edition Core Rulebook p.41); tags force, dark_side, force_defense, anti-force, defense, resilience; forms OTHER
- Sith Reverence (TALENT `81b2b88df9600ca7`, Clone Wars Campaign Guide p.56); tags dark_side, morale, precision, teamwork, positioning; forms OTHER
- Dark Side Bane (TALENT `97a771d1f4627521`, Legacy Era Campaign Guide p.27); tags force, force_power_synergy, dark_side, targeting, damage_bonus, sustained_damage, scaling; forms OTHER
- Attuned (TALENT `bd797d3f83d0f61f`, Clone Wars Campaign Guide p.53); tags force, light_side, force_power_synergy, critical_success, action_economy, force_capacity, resource_recovery, recovery; forms OTHER

## `deception` — PARTIALLY_OWNER_DEFINED

Usage: 48 records (10 feats / 38 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when deception applies.

Examples:
- Disturbing Presence (FEAT `25ba21b021086a71`, Galaxy of Intrigue p.27); tags deception, acrobatics, skill_substitution, movement, mobility, attack_of_opportunity, evasion, infiltration; “DC 15 Deception allows movement through an enemy's threatened area or fighting space without provoking. Each threatened or occupied square traversed this way costs 2 squares of movement. DC 15 Deception lets you move thr”
- Hideous Visage (FEAT `2956acfbfd27967d`, Scum and Villainy p.22); tags deception, fear, mind-affecting, will_defense, control, battlefield_control, movement, swift_action, action_economy, once-per-encounter; “Once per encounter as a swift action, make Deception vs one opponent's Will Defense; the target must be able to see you. On success, move it 1 square away and impose -1 attacks until start of your next turn. Mind-affecti”
- Impersonate (FEAT `2def724bf673c2fc`, Scum and Villainy p.23); tags deception, social, infiltration, manipulation; “Use Deception to alter your features to a specific person and change your voice to match. Always treat impersonating a specific person as a Moderate Deception. Use Shapeshift and Deception to impersonate a specific perso”
- Unreadable (TALENT `01bcee2365b82ce6`, Scum and Villainy p.14); tags will_defense, defense, resilience, social, deception, feint, ambush, setup; “You gain a +5 bonus to your Will Defense against skill checks made to read your emotions and influence your attitude. In addition, whenever you successfully feint a target in combat, that target is flat-footed against al”
- Protocol (TALENT `058898a456a9a8fb`, Force Unleashed Campaign Guide p.103); tags ally_support, support, teamwork, skills, deception, knowledge, persuasion, social, reliability; “You always succeed on attempts to aid another on Deception, Knowledge, and Persuasion checks (no check required).”

## `defense` — OWNER_DEFINITION_REQUIRED

Usage: 283 records (60 feats / 223 talents). Existing policies: none. Unresolved records: 2.

- Q: Define when `defense` applies. State whether records whose canonical text matches A.cost_reaction in the observed wording forms qualify.

Examples:
- Dive for Cover (FEAT `2866d953b4b6245d`, Galaxy at War p.23); tags jump, reaction, action_economy, movement, mobility, cover, ranged_defense, evasion; forms OTHER
- Reactive Stealth (TALENT `810160a476804e61`, Galaxy of Intrigue p.22); tags ranged, reaction, action_economy, mobility, positioning, stealth, concealment, cover, evasion; forms OTHER

## `deflect` — OWNER_DEFINITION_REQUIRED

Usage: 17 records (0 feats / 17 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when deflect applies.

Examples:
- Defensive Acuity (TALENT `0bc102751285d17c`, Legacy Era Campaign Guide p.27); tags fighting_defensively, lightsaber, melee, damage_bonus, sustained_damage, block, deflect, use_the_force, force_defense, defense, force; “When you take the fight defensively action, you deal +1 die of damage with lightsaber attacks and gain a +2 circumstance bonus on Use the Force checks made to negate an attack with the Block or Deflect talents. These ben”
- Praetoria Ishu (TALENT `16aa9efd54967320`, Legacy Era Campaign Guide p.45); tags force, use_the_force, block, deflect, lightsaber, melee_defense, ranged_defense, ally_support, support, teamwork, defense, positioning; “You can use the Block talent to negate a melee attack made against an adjacent ally. In addition, you can use the Deflect talent to negate a ranged attack made against an adjacent ally.”

## `detection` — OWNER_DEFINITION_REQUIRED

Usage: 37 records (5 feats / 32 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when detection applies.

Examples:
- Keen Scent (FEAT `46d70ac7db6872f6`, Rebellion Era Campaign Guide p.34); tags senses, detection, awareness; “The range of your Scent ability increases to 20 squares. Your Scent ability has a range of 20 squares.”
- Pall of the Dark Side (FEAT `8d164553709dd068`, Clone Wars Campaign Guide p.31); tags dark_side, dark_side_score, use_the_force, force, stealth, detection, force_defense, anti-force; “Add one-half your Dark Side Score, minimum +1, to Use the Force checks made to resist detection via Sense Force. Add half your Dark Side Score, minimum +1, when resisting Sense Force detection.”
- Deep Sight (FEAT `e4de79f4993a6690`, Rebellion Era Campaign Guide p.31); tags senses, detection, concealment, awareness; “Gain darkvision and ignore concealment, including total concealment, from darkness. You cannot perceive colors in total darkness. Gain darkvision that ignores darkness concealment, but you cannot see color in total darkn”
- Search and Destroy (TALENT `1907d80212a12c68`, Galaxy at War p.31); tags move_action, action_economy, ally_support, support, teamwork, leadership, command, morale, perception, skills, recon, detection, awareness; “As a move action, you give all squad members a +2 morale bonus to Perception checks until the end of your next turn.”
- Creeping Approach (TALENT `2931a9052148e79a`, Force Unleashed Campaign Guide p.49); tags stealth, infiltration, swift_action, action_economy, target-designation, detection, awareness, control, concealment, perception; “As a swift action, you can designate a single opponent within 12 squares that is unaware of you as the target of this talent. Until the beginning of your next turn, that target may not make Perception checks to notice yo”

## `double_weapon` — OWNER_DEFINITION_REQUIRED

Usage: 10 records (4 feats / 6 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when double_weapon applies.

Examples:
- Dual Weapon Mastery I (FEAT `84d8866a57381620`, Saga Edition Core Rulebook p.84); tags dual_wield, double_weapon, full_attack, precision, sustained_damage; “When full-attacking with two weapons or both ends of a double weapon, take -5 instead of -10 on all attacks until the start of your next turn. Benefit applies only with weapons you are proficient with. Reduce two-weapon/”
- Long Haft Strike (FEAT `b60e581b6c102cfc`, Jedi Academy Training Manual p.23); tags lightsaber, lightsaber_polearm, double_weapon; “When using a lightsaber pike or long-handle lightsaber, you may attack with both ends and treat the weapon as a double weapon. Use the individual weapon description for two-ended attack details. Treat a lightsaber pike o”
- Dual Weapon Mastery II (FEAT `c7c99a77ebee1c0c`, Saga Edition Core Rulebook p.84); tags dual_wield, double_weapon, full_attack, precision, sustained_damage; “Reduce the two-weapon/double-weapon Full Attack penalty to -2 instead of -10, with proficient weapons. Reduce two-weapon/double-weapon Full Attack penalty to -2.”
- Twin Weapon Style (TALENT `5ea9a4c30dff1ac8`, Jedi Academy Training Manual p.21); tags dual_wield, double_weapon, standard_action, action_economy, burst_damage, sustained_damage, targeting; “As a standard action, whenever you are wielding two weapons (or a double weapon), you can make one attack with each weapon (or each end of a double-weapon). Each attack must be against a different target”
- Wan-Shen Kata (TALENT `ae3fd778e4a34798`, Jedi Academy Training Manual p.81); tags melee, double_weapon, grapple, control, precision, full_attack, sustained_damage, weapon_training; “You treat the wan-shen as a Medium weapon instead of a Large weapon. You can use the Pin and Trip feats with a wan-shen, substituting your attack bonus with the wan-shen for your grapple check You must have your wan-shen”

## `droid` — OWNER_DEFINITION_REQUIRED

Usage: 52 records (8 feats / 44 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when droid applies.

Examples:
- Expert Droid Repair (FEAT `029c3935e9bed6eb`, Clone Wars Campaign Guide p.29); tags droid, mechanics, repair, tech, scaling; “Repair a number of droids simultaneously equal to your Intelligence bonus. Make Mechanics checks separately for each droid as normal. Unlike Experienced Medic, the printed feat text does not state a minimum of 2. Repair ”
- Tech Specialist (FEAT `42e2404790756700`, Saga Edition Web Enhancement 1: The Tech Specialist p.3); tags tech, mechanics, modification, equipment, armor, droid, vehicle, ability_enhancement, durability, defense, skills, mobility, shields, weapon_empowerment, precision, damage_bonus; “Modify a device, armor, weapon, droid, or vehicle with one special trait unless otherwise noted. Normally only one Tech Specialist benefit may be applied to an item, and the same benefit cannot be applied more than once.”
- Leader of Droids (FEAT `59e495de34a23def`, Clone Wars Campaign Guide p.31); tags droid, leadership, mind-affecting, ally_support, support, empowerment; “When you provide a beneficial mind-affecting effect to allies, choose a number of allied droids equal to your Intelligence modifier, minimum 1. Chosen willing droids may ignore their immunity to mind-affecting effects fo”
- Supervising Droid (TALENT `0025737e7198390e`, Scavenger's Guide to Droids p.27); tags droid, ally_support, support, teamwork, skills, standard_action, swift_action, action_economy, once-per-encounter, reliability; “You are programmed to oversee other droids. You can use each of the following actions once per encounter: • Combat Support: As a standard action, you automatically aid another on an allied droid's attack roll, provided y”
- Weapons Power Surge (TALENT `09e7eeda16a7814f`, Scavenger's Guide to Droids p.27); tags droid, damage_bonus, burst_damage, once-per-encounter, action_economy, resource_spend, equipment, power_systems; “Once per encounter, as a free action, you can increase the damage dealt by one of your weapons by 1 or 2 damage dice in exchange for moving -1 step on the condition track for each die increased. The weapon must be perman”

## `durability` — OWNER_DEFINITION_REQUIRED

Usage: 49 records (6 feats / 43 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when durability applies.

Examples:
- Hold Together (FEAT `2eb0c304d99ef6ee`, The Unknown Regions p.26); tags vehicle, reaction, action_economy, force_point_spend, resource_spend, durability, damage; “As a reaction, spends a Force Point to delay the effect of damage dealt to a Colossal-or-smaller vehicle being ridden in or piloted until the end of the round.”
- Tech Specialist (FEAT `42e2404790756700`, Saga Edition Web Enhancement 1: The Tech Specialist p.3); tags tech, mechanics, modification, equipment, armor, droid, vehicle, ability_enhancement, durability, defense, skills, mobility, shields, weapon_empowerment, precision, damage_bonus; “Modify a device, armor, weapon, droid, or vehicle with one special trait unless otherwise noted. Normally only one Tech Specialist benefit may be applied to an item, and the same benefit cannot be applied more than once.”
- Superior Tech (FEAT `a717435c8094e7fb`, Scum and Villainy p.24); tags tech, mechanics, modification, equipment, armor, droid, vehicle, ability_enhancement, durability, defense, perception, skills, sensors, shields, mobility, weapon_empowerment, precision, damage_bonus; “Choose one category: armor, weapons, droids, vehicles, or devices; install advanced traits for that category in place of normal Tech Specialist traits. Pay one-fifth item cost or 2,000 credits, whichever is greater; work”
- Oath of Duty (TALENT `001ae84d5862af55`, Legacy Era Campaign Guide p.45); tags ally-trigger, lightsaber, durability, survivability, scaling, positioning; “When an ally within 12 squares of you and within your line of sight hits with a lightsaber attack, you gain bonus hit points equal to 3 x your class level until the end of your next turn. Damage is subtracted from the bo”
- Skill Confidence (TALENT `07cd591fb8dccb39`, Galaxy of Intrigue p.21); tags skills, skill_mastery, critical_success, durability, scaling, action_economy, setup; “When you select this talent, choose one skill. Whenever you roll a natural 19 or a natural 20 on a skill check with that skill, you gain the benefits of the Critical Skill Success talent and also gain bonus hit points eq”

## `empowerment` — OWNER_DEFINITION_REQUIRED (broad)

Usage: 39 records (2 feats / 37 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `empowerment` applies. State whether records whose canonical text matches  in the observed wording forms qualify.

Examples:
- Leader of Droids (FEAT `59e495de34a23def`, Clone Wars Campaign Guide p.31); tags droid, leadership, mind-affecting, ally_support, support, empowerment; “When you provide a beneficial mind-affecting effect to allies, choose a number of allied droids equal to your Intelligence modifier, minimum 1. Chosen willing droids may ignore their immunity to mind-affecting effects fo”
- Unleashed (FEAT `bcc7f3fe56008a28`, The Force Unleashed Campaign Guide p.35); tags empowerment, resource_spend, resources; “Spend a Destiny Point to activate Unleashed abilities. Force Sensitivity is additionally required to activate Unleashed abilities for Force powers and talents. Normally Unleashed abilities and powers are unavailable with”
- Greater Force Talisman (TALENT `0c636cdbb63cdba3`, Saga Edition Core Rulebook p.214); tags force, force_point_spend, resource_spend, talisman, crafting, equipment, empowerment, defense, survivability, action_economy; “You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you. Creating the Talisman takes a Full-Round Action. While you wear or carry th”
- Infuse Weapon (TALENT `0df15b0ea7721c50`, Force Unleashed Campaign Guide p.93); tags force, force_point_spend, resource_spend, empowerment, weapon_empowerment, equipment, melee, damage_reduction, durability, damage_bonus, sustained_damage, action_economy; “You can spend a Force Point to infuse an unpowered melee weapon (one that does not require an energy cell) with the strength of the Force, making it resistant to the attacks of other weapons. Infusing the weapon takes a ”

## `equipment` — OWNER_DEFINITION_REQUIRED

Usage: 132 records (22 feats / 110 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when equipment applies.

Examples:
- Grapple Resistance (FEAT `09faea502795c45f`, Legacy Era Campaign Guide p.36); tags grab, grapple, defense, equipment; “Gain +5 Reflex Defense against enemy grab and grapple attacks. Gain +5 on all opposed grapple checks. Objects you hold or carry gain +5 Reflex Defense when attacked. Gain +5 defenses/checks against grabs and grapples, an”
- Exotic Weapon Proficiency (FEAT `1ea7da65feb15b18`, Saga Edition Core Rulebook p.84); tags exotic_weapon, weapon_training, equipment; “Choose one exotic weapon; make attacks with it without the normal -5 nonproficiency penalty. Repeatable for a different exotic weapon each time. Become proficient with one chosen exotic weapon; repeatable for other exoti”
- Lightning Draw (FEAT `1f594024b4757109`, Scum and Villainy p.23); tags standard_action, action_economy, equipment, once-per-encounter; “Once per encounter, draw a holstered weapon and attack with it as a single standard action. Once per encounter, draw a holstered weapon and attack as one standard action.”
- Weapons Power Surge (TALENT `09e7eeda16a7814f`, Scavenger's Guide to Droids p.27); tags droid, damage_bonus, burst_damage, once-per-encounter, action_economy, resource_spend, equipment, power_systems; “Once per encounter, as a free action, you can increase the damage dealt by one of your weapons by 1 or 2 damage dice in exchange for moving -1 step on the condition track for each die increased. The weapon must be perman”
- Siang Lance Mastery (TALENT `0bbfcac85b09416a`, Rebellion Era Campaign Guide p.37); tags lightsaber_polearm, ranged, precision, weapon_training, equipment; “You treat a siang lance as a rifle instead of as an exotic weapon. Additionally, you gain a +1 bonus to attack rolls with a siang lance. This talent counts as the Weapon Focus (siang lance) feat for the purpose of satisf”

## `evasion` — OWNER_DEFINITION_REQUIRED

Usage: 125 records (23 feats / 102 talents). Existing policies: none. Unresolved records: 1.

- Q: Define when `evasion` applies. State whether records whose canonical text matches I.evasion in the observed wording forms qualify.

Examples:
- Targeted Area (FEAT `9c904590c02fb30a`, The Unknown Regions p.28); tags ranged, damage_bonus, targeting, precision; forms OTHER

## `exotic_weapon` — PARTIALLY_OWNER_DEFINED

Usage: 10 records (1 feats / 9 talents). Existing policies: OPEN_GENERIC_SCOPE_POLICY. Unresolved records: 0.

- Q: Define when `exotic_weapon` applies. State whether records whose canonical text matches O.exotic_weapon in the observed wording forms qualify.

Examples:
- Exotic Weapon Proficiency (FEAT `1ea7da65feb15b18`, Saga Edition Core Rulebook p.84); tags exotic_weapon, weapon_training, equipment; “Choose one exotic weapon; make attacks with it without the normal -5 nonproficiency penalty. Repeatable for a different exotic weapon each time. Become proficient with one chosen exotic weapon; repeatable for other exoti”
- Empower Siang Lance (TALENT `2bae1dc009d4f2d2`, Rebellion Era Campaign Guide p.37); tags force, force_point_spend, resource_spend, weapon_empowerment, empowerment, equipment, exotic_weapon, ranged, damage_bonus, sustained_damage, action_economy; “You can spend a Force Point to empower a siang lance, which takes a full-round action. After the siang lance is empowered, it deals an additional die of damage when you wield it. Others who wield the weapon do not gain t”
- Discblade Arc (TALENT `3d7da7d62139a6e9`, Jedi Academy Training Manual p.91); tags exotic_weapon, ranged, burst_damage, targeting, positioning, action_economy; “As a full-round action, you can make an area attack with your discblade, striking three targets, all of which must be within point blank range for your discblade. This attack uses the area attack rules; you make one atta”

## `exploration` — OWNER_DEFINITION_REQUIRED

Usage: 26 records (2 feats / 24 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when exploration applies.

Examples:
- Veteran Spacer (FEAT `423c5fffe7abe449`, Rebellion Era Campaign Guide p.36); tags use_computer, space, vehicle, exploration, skills; “Gain +5 species bonus to Use Computer checks made to perform astrogation aboard a starship. Gain +5 species to Use Computer checks for starship astrogation.”
- Hyperblazer (FEAT `cab4954728195119`, The Unknown Regions p.26); tags use_computer, space, exploration, skills; “Halves astrogation calculation time and Use Computer penalties in the hyperspace tangle and halves time to map new hyperspace routes.”
- Silent Movement (TALENT `084f71defa56162a`, Unknown Regions p.21); tags stealth, skills, mobility, exploration, ally_support, support, teamwork, reliability; “You never suffer unfavorable circumstances from environmental effects associated with noise when you sneak using Stealth. Once per round, when you make a Stealth check, you can automatically use the aid another action on”
- Planetary Attunement (TALENT `1204459eaaff9efa`, Jedi Academy Training Manual p.75); tags force, force_point_spend, resource_spend, exploration, survival, nature, defense, mobility, senses, precognition, planning, action_economy; “Whenever you arrive on a new planet, you can spend 10 minutes and a Force Point to acclimate yourself to the planet's unique ebb and flow of Force energy. While on the planet, you gain a +2 Force bonus to all defenses ag”

## `fear` — OWNER_DEFINITION_REQUIRED

Usage: 28 records (5 feats / 23 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when fear applies.

Examples:
- Hideous Visage (FEAT `2956acfbfd27967d`, Scum and Villainy p.22); tags deception, fear, mind-affecting, will_defense, control, battlefield_control, movement, swift_action, action_economy, once-per-encounter; “Once per encounter as a swift action, make Deception vs one opponent's Will Defense; the target must be able to see you. On success, move it 1 square away and impose -1 attacks until start of your next turn. Mind-affecti”
- Dreadful Countenance (FEAT `2e5ada2de01fff4d`, Behind the Threat: The Sith, Part 2 — The Becoming p.web-article-archived-rendering-page-4-of-4); tags persuasion, use_the_force, force, fear, reroll, reliability, social; “Whenever you make a Persuasion check or Use the Force check to activate a fear effect, you may reroll the check. You must accept the reroll result even if it is worse. Reroll Persuasion or Use the Force checks used to ac”
- Frightening Cleave (FEAT `8b2f7862b3c76e61`, The Unknown Regions p.24); tags fear, mind-affecting, battlefield_control, control, melee, scaling, skills; “After using Cleave, nearby visible enemies suffer stacking penalties to Reflex Defense, attack rolls, and skill checks against the user until encounter end; mind-affecting.”
- Notorious (TALENT `09744041cdcc9e22`, Saga Edition Core Rulebook p.210); tags persuasion, intimidation, social, skills, fear, reroll, reliability; “Your reputation as a crime lord is known throughout the galaxy, even on fringe worlds. When you are not disguised, you may reroll any Persuasion checks made to intimidate others, keeping the better result.”
- Cower Enemies (TALENT `0e36a04342959256`, Force Unleashed Campaign Guide p.42); tags persuasion, intimidation, social, skills, fear, control, battlefield_control; “When you use the Persuasion skill to intimidate, you can intimidate all targets in a 6-square cone (originating from your square) instead of intimidating a single target. All other limitations to the intimidation use of ”

## `feint` — OWNER_DEFINITION_REQUIRED

Usage: 8 records (1 feats / 7 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when feint applies.

Examples:
- Combat Trickery (FEAT `9ad13542c8370aef`, The Unknown Regions p.24); tags deception, feint, swift_action, action_economy, setup, will_defense, force_point_spend, resource_spend, control; “Two successive swift actions make a Deception check against Will Defense; success leaves the target flat-footed against the next attack, and a Force Point can extend the penalty until encounter end.”
- Unreadable (TALENT `01bcee2365b82ce6`, Scum and Villainy p.14); tags will_defense, defense, resilience, social, deception, feint, ambush, setup; “You gain a +5 bonus to your Will Defense against skill checks made to read your emotions and influence your attitude. In addition, whenever you successfully feint a target in combat, that target is flat-footed against al”
- Cunning Distraction (TALENT `3340f268613c0349`, Scum and Villainy p.31); tags deception, social, skills, feint, reaction, action_economy, mobility, movement; “When you successfully feint an opponent in combat, you can immediately move up to one-half your speed as a reaction.”

## `fighting_defensively` — OWNER_DEFINITION_REQUIRED

Usage: 10 records (3 feats / 7 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when fighting_defensively applies.

Examples:
- Melee Defense (FEAT `3a847230d573a623`, Saga Edition Core Rulebook p.86); tags melee, melee_defense, defense, fighting_defensively, precision, standard_action, action_economy; “When using a standard action for a melee attack, take an attack penalty up to -5 and add the same amount as dodge Reflex Defense. The chosen amount cannot exceed base attack bonus and lasts until the start of your next t”
- Resolute Stance (FEAT `63dbb0e9623f7fce`, Galaxy of Intrigue p.28); tags fighting_defensively, defense, will_defense, resilience, setup; “When fighting defensively, gain +2 morale Will Defense. If you make no attacks until your next turn, gain +5 morale Will Defense until the start of that turn. Fighting Defensively grants +2 morale Will, or +5 if you make”
- Wary Defender (FEAT `d6e528de87b25b95`, Clone Wars Campaign Guide p.32); tags fighting_defensively, defense, will_defense, resilience; “When you Fight Defensively, gain +2 competence to Fortitude Defense and Will Defense until the beginning of your next turn. Fighting Defensively also grants +2 competence Fortitude and Will until your next turn.”
- Defensive Acuity (TALENT `0bc102751285d17c`, Legacy Era Campaign Guide p.27); tags fighting_defensively, lightsaber, melee, damage_bonus, sustained_damage, block, deflect, use_the_force, force_defense, defense, force; “When you take the fight defensively action, you deal +1 die of damage with lightsaber attacks and gain a +2 circumstance bonus on Use the Force checks made to negate an attack with the Block or Deflect talents. These ben”
- Unarmed Parry (TALENT `379019c29b37d717`, Threats of the Galaxy p.53); tags unarmed, martial_arts, melee, fighting_defensively, melee_defense, defense, reaction, action_economy, opposed_check, evasion; “When you fight defensively, as a reaction you can negate a melee attack by making a successful unarmed attack roll. If your attack roll equals or exceeds the attack roll of the incoming melee attack, the attack is negate”

## `flanking` — OWNER_DEFINITION_REQUIRED

Usage: 11 records (0 feats / 11 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when flanking applies.

Examples:
- Dirty Tactics (TALENT `1e7a0010a589b870`, Scum and Villainy p.14); tags once-per-encounter, standard_action, action_economy, ally_support, support, teamwork, flanking, melee, precision, battlefield_control; “Once per encounter, as a standard action, you can grant a tactical advantage to all allies within your line of sight. When any ally flanks an opponent, that ally gains a +4 flanking bonus on melee attack rolls instead of”
- Flanking Fire (TALENT `1f6b9d509a07f881`, Scum and Villainy p.28); tags pistol, ranged, dual_wield, flanking, full_attack, standard_action, action_economy, sustained_damage, positioning; “Whenever you are flanked by two or more opponents and are wielding two pistols, you can make a full attack action as a standard action instead of a full-round action. This is provided that you target only opponents that ”

## `followers` — OWNER_DEFINITION_REQUIRED

Usage: 23 records (0 feats / 23 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when followers applies.

Examples:
- Protector Actions (TALENT `254b51a34600e2ef`, Clone Wars Campaign Guide p.23); tags followers, ally_support, support, teamwork, standard_action, action_economy, melee, ranged, counterattack, reaction, mobility, movement, control, battlefield_control, defense, targeting; “You and your Followers have learned to work together to great effect, ensuring that you remain safe while allowing them to do their duty. You can use any of the following actions on your turn: Bodyguard: As a Standard Ac”
- Undying Loyalty (TALENT `2a209f3e58d8528c`, Clone Wars Campaign Guide p.23); tags followers, minion, ally_support, support, survivability, durability; “Each of your Followers gains the Toughness Feat.”

## `force` — OWNER_DEFINITION_REQUIRED

Usage: 301 records (11 feats / 290 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when force applies.

Examples:
- Unstoppable Force (FEAT `0a6c87a410bee1f2`, Clone Wars Campaign Guide p.31); tags force_defense, anti-force, defense, will_defense, use_the_force, force; “Gain +5 insight to Fortitude Defense and Will Defense against any attack or effect requiring a Use the Force check. Gain +5 insight Fortitude and Will against attacks/effects resolved with Use the Force.”
- Force Regimen Mastery (FEAT `1e0222988b4e8714`, Jedi Academy Training Manual p.23); tags force, scaling, force_training; “Learn Force regimens equal to 1 + Wisdom modifier, minimum 1. Repeatable; each copy grants another 1 + Wisdom modifier regimens, minimum 1. If Wisdom modifier permanently increases, immediately gain additional regimens e”
- Dreadful Countenance (FEAT `2e5ada2de01fff4d`, Behind the Threat: The Sith, Part 2 — The Becoming p.web-article-archived-rendering-page-4-of-4); tags persuasion, use_the_force, force, fear, reroll, reliability, social; “Whenever you make a Persuasion check or Use the Force check to activate a fear effect, you may reroll the check. You must accept the reroll result even if it is worse. Reroll Persuasion or Use the Force checks used to ac”
- Soft to Solid (TALENT `004732cba6bfa4a7`, Jedi Academy Training Manual p.81); tags force, reaction, action_economy, force_point_spend, resource_spend, damage_reduction, defense, resilience, survivability; “As a reaction when you are damaged by an attack, you can spend a Force Point to increase the rigidity of your skin, gaining DR 10 until the end of your next turn.”
- Dark Healing (TALENT `008b28849b74234d`, Saga Edition Core Rulebook p.223); tags force, force_point_spend, resource_spend, standard_action, action_economy, ranged, force_offense, healing, recovery, damage, scaling; “You can spend a Force Point to heal wounds by drawing life energy from another creature within 6 squares of you. Using this ability is a Standard Action, and you must succeed on a ranged attack roll. If the attack equals”

## `force-point` — OWNER_DEFINITION_REQUIRED

Usage: 9 records (6 feats / 3 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when force-point applies.

Examples:
- Confident Success (FEAT `139a80972fc3b8ee`, Rebellion Era Campaign Guide p.31); tags gather_information, investigation, social, force-point, resource_recovery; “Whenever you successfully use Gather Information to Learn Secret Information, gain 1 Force Point. You can gain no more than 3 Force Points per level this way, and cannot hold more Force Points than you gained upon reachi”
- Force Boon (FEAT `53444cc061d81627`, Saga Edition Core Rulebook p.85); tags force, force-point, resource_recovery, resources, scaling, force_capacity; “Gain three additional Force Points at each level. Gain 3 additional Force Points each level.”
- Unswerving Resolve (FEAT `98d9c2c211a7a458`, Jedi Academy Training Manual p.24); tags fear, mind-affecting, force-point, resource_recovery; “When a fear or mind-affecting effect targets you and fails to affect you, gain a temporary Force Point. The temporary Force Point expires at the end of your next turn if unused. If you negate the contingent effect in any”
- Skill Boon (TALENT `1cbf8a40f7972aa4`, Galaxy of Intrigue p.21); tags skills, skill_mastery, force-point, force_point_spend, resource_spend, force_multiplier, scaling; “When you select this talent, choose one skill. Whenever you spend a Force Point to add to that skill, increase the die type of your Force Point by one step (i.e. from d6 to d8, d8 to d10, or d10 to d12), to a maximum of ”
- Skillful Recovery (TALENT `323cc243fef47675`, Galaxy of Intrigue p.21); tags skills, skill_mastery, force-point, force_capacity, resources, setup; “When you select this talent, choose one skill. Whenever you fail a skill check with that skill, you gain one temporary Force Point. That Force Point can only be spent to add to a skill check with the skill you chose for ”

## `force_control` — OWNER_DEFINITION_REQUIRED

Usage: 2 records (0 feats / 2 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when force_control applies.

Examples:
- Stifle Conflict (TALENT `9db016b2e528beb4`, Jedi Academy Training Manual p.87); tags force, force_power_synergy, force_control, damage, nonlethal, stun; “You can choose to have any Force power you activate deal stun damage instead of normal damage.”
- Many Shades of the Force (TALENT `d444b28e15a5a9c3`, Jedi Academy Training Manual p.73); tags force, force_power_synergy, force_control, dark_side, light_side; “Choose one Force power with the [dark side] or [light side] descriptor in your Force suite. That power is no longer considered to have that descriptor for you.”

## `force_defense` — OWNER_DEFINITION_REQUIRED

Usage: 32 records (2 feats / 30 talents). Existing policies: none. Unresolved records: 3.

- Q: Define when `force_defense` applies. State whether records whose canonical text matches N.force_defense in the observed wording forms qualify.

Examples:
- Reap Retribution (TALENT `902c2cef66cf4df6`, Rebellion Era Campaign Guide p.23); tags force, anti-force, target-designation, damage_bonus, sustained_damage, setup; forms OTHER
- Akk Dog Master (TALENT `b265aa9dd35c4c5b`, Clone Wars Campaign Guide p.57); tags beast_companion, followers, force, force_power_synergy, ally_support, support, teamwork, scaling, empowerment; forms OTHER
- Inspire Fear I (TALENT `cf4b1e5b126a2a7e`, Saga Edition Core Rulebook p.210); tags fear, mind-affecting, control, battlefield_control, defense, survivability, scaling, use_the_force, force; forms OTHER

## `force_multiplier` — OWNER_DEFINITION_REQUIRED

Usage: 14 records (6 feats / 8 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when force_multiplier applies.

Examples:
- Sharp Senses (FEAT `2357f4a68fe571fb`, Rebellion Era Campaign Guide p.35); tags perception, awareness, force_point_spend, resource_spend, force_multiplier; “Whenever you spend a Force Point to add to Perception, increase the die type by two steps (d6 to d10, or d8 to d12). Force Points added to Perception use a die two steps larger.”
- Strong in the Force (FEAT `71892687abbed346`, Saga Edition Core Rulebook p.88); tags force, force_point_spend, resource_spend, force_multiplier; “When spending a Force Point to adjust an attack roll, skill check, or ability check, roll d8s instead of d6s. Use d8s instead of d6s for Force Points added to attacks, skills, or ability checks.”
- Master Tracker (FEAT `d133d3fad058c35f`, Rebellion Era Campaign Guide p.34); tags survival, tracking, nature, force_point_spend, resource_spend, force_multiplier; “Whenever you spend a Force Point to add to Survival, increase the die type by two steps (d6 to d10, or d8 to d12). Force Points added to Survival use a die two steps larger.”
- Recall (TALENT `0890f9e1c0858993`, Rebellion Era Campaign Guide p.23); tags force, force_power_synergy, force_capacity, resource_recovery, recovery, force_multiplier, force_point_spend, resource_spend; “Whenever you spend a Force Point to return a Force Power to your Force Power Suite, you regain two Force Powers instead of one.”
- Skill Boon (TALENT `1cbf8a40f7972aa4`, Galaxy of Intrigue p.21); tags skills, skill_mastery, force-point, force_point_spend, resource_spend, force_multiplier, scaling; “When you select this talent, choose one skill. Whenever you spend a Force Point to add to that skill, increase the die type of your Force Point by one step (i.e. from d6 to d8, d8 to d10, or d10 to d12), to a maximum of ”

## `force_offense` — OWNER_DEFINITION_REQUIRED

Usage: 23 records (0 feats / 23 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when force_offense applies.

Examples:
- Dark Healing (TALENT `008b28849b74234d`, Saga Edition Core Rulebook p.223); tags force, force_point_spend, resource_spend, standard_action, action_economy, ranged, force_offense, healing, recovery, damage, scaling; “You can spend a Force Point to heal wounds by drawing life energy from another creature within 6 squares of you. Using this ability is a Standard Action, and you must succeed on a ranged attack roll. If the attack equals”
- Telekinetic Strike (TALENT `196b54d69bd54983`, Jedi Academy Training Manual p.89); tags force, force_offense, unarmed, martial_arts, melee, force_point_spend, resource_spend, damage_bonus, burst_damage, scaling; “Whenever you make a successful unarmed attack, you can add the result of a Force Point roll to the damage instead of the attack roll (see “Using Force Points" on page 93 of the Saga Edition core rulebook).”

## `force_power` — OWNER_DEFINITION_REQUIRED

Usage: 5 records (3 feats / 2 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `force_power` applies. State whether records whose canonical text matches N.force_power in the observed wording forms qualify.

Examples:
- Forceful Recovery (FEAT `627b92fefdc552d2`, Galaxy of Intrigue p.27); tags force, force_power, resource_recovery, recovery, force_capacity; “Whenever you catch a second wind, choose one expended Force power and return it to your Force suite. Catch a second wind to recover one expended Force power.”
- Force Training (FEAT `9b7b869a86f39190`, Saga Edition Core Rulebook p.85); tags force, force_power, force_training, force_capacity, scaling; “Gain Force powers equal to 1 + Wisdom modifier, minimum 1; duplicate powers are allowed. Official errata: every additional Force Training selection also grants 1 + Wisdom modifier powers. If Wisdom modifier permanently i”
- Jedi Heritage (FEAT `d3c4ae9f793b8573`, Rebellion Era Campaign Guide p.34); tags force, force_training, force_power, force_capacity, scaling; “For determining Force powers gained from Force Training, treat Wisdom as 4 points higher. This grants two extra Force powers for each Force Training feat. Treat Wisdom as 4 higher for Force Training power count, granting”
- Taint of the Dark Side (TALENT `3f5b1b3566f16ff5`, Knights of the Old Republic Campaign Guide p.39); tags force, dark_side, dark_side_score, force_capacity, force_power, resources, once-per-encounter; “Add one Force power with the [dark side] descriptor to your Force suite. Once per encounter you can use that Force power with the [dark side] descriptor without increasing your Dark Side Score.”
- Krath Surge (TALENT `ca30265867f3dcb1`, Knights of the Old Republic Campaign Guide p.60); tags force, dark_side, force_power_synergy, force_power, once-per-encounter, swift_action, action_economy, damage_bonus, burst_damage, empowerment; “Once per encounter, using rudimentary Sith sorcery, you channel dark side energy in a manner that boosts one use of a Force power. As a swift action, you can add 1 die of damage (if the power deals damage) or extend the ”

## `force_power_synergy` — OWNER_DEFINITION_REQUIRED

Usage: 82 records (0 feats / 82 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when force_power_synergy applies.

Examples:
- Recall (TALENT `0890f9e1c0858993`, Rebellion Era Campaign Guide p.23); tags force, force_power_synergy, force_capacity, resource_recovery, recovery, force_multiplier, force_point_spend, resource_spend; “Whenever you spend a Force Point to return a Force Power to your Force Power Suite, you regain two Force Powers instead of one.”
- Swift Power (TALENT `09609e71ba6cd4aa`, Saga Edition Core Rulebook p.101); tags force, force_power_synergy, swift_action, move_action, standard_action, action_economy; “Once per day, you can use 3 Force power that normally takes a standard action or move action as a swift action.”

## `force_support` — OWNER_DEFINITION_REQUIRED

Usage: 24 records (1 feats / 23 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when force_support applies.

Examples:
- Jedi Familiarity (FEAT `fc56de4d0d15c95c`, Clone Wars Campaign Guide p.31); tags force, force_support, ally-trigger, force-point, resource_recovery, once-per-encounter; “Once per encounter, when an ally's Force power or Force talent targets or affects you, gain one temporary Force Point. The temporary Force Point expires at encounter end. No benefit if that Force power/talent damages you”
- Knowledge of the Force (TALENT `04eca2813630e8d4`, Knights of the Old Republic Campaign Guide p.58); tags force, use_the_force, force_support, ally_support, support, teamwork, skills, reaction, action_economy, force_point_spend, resource_spend; “You can use your scholarly knowledge of the Force to help others reach their full potential. You can spend a Force Point as a reaction to aid another ally within 6 squares on a Use the Force check, following the normal r”
- Healing Boost (TALENT `0e6a784501100693`, Clone Wars Campaign Guide p.41); tags force, force_power_synergy, force_support, healing, scaling, support, medical, medicine; “When healing somebody through Vital Transfer, the amount of damage healed increases by 1 point per your Class Level.”

## `force_training` — OWNER_DEFINITION_REQUIRED

Usage: 6 records (4 feats / 2 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `force_training` applies. State whether records whose canonical text matches N.force_training in the observed wording forms qualify.

Examples:
- Force Regimen Mastery (FEAT `1e0222988b4e8714`, Jedi Academy Training Manual p.23); tags force, scaling, force_training; “Learn Force regimens equal to 1 + Wisdom modifier, minimum 1. Repeatable; each copy grants another 1 + Wisdom modifier regimens, minimum 1. If Wisdom modifier permanently increases, immediately gain additional regimens e”
- Force Training (FEAT `9b7b869a86f39190`, Saga Edition Core Rulebook p.85); tags force, force_power, force_training, force_capacity, scaling; “Gain Force powers equal to 1 + Wisdom modifier, minimum 1; duplicate powers are allowed. Official errata: every additional Force Training selection also grants 1 + Wisdom modifier powers. If Wisdom modifier permanently i”
- Jedi Heritage (FEAT `d3c4ae9f793b8573`, Rebellion Era Campaign Guide p.34); tags force, force_training, force_power, force_capacity, scaling; “For determining Force powers gained from Force Training, treat Wisdom as 4 points higher. This grants two extra Force powers for each Force Training feat. Treat Wisdom as 4 higher for Force Training power count, granting”
- Regimen Aptitude (TALENT `605e0a2ac655e184`, Jedi Academy Training Manual p.18); tags force, force_training, skills; “You gain a +5 Force bonus on skill checks made to perform a Force regimen (see page 10).”
- Telekinetic Prodigy (TALENT `7af4caf439358120`, Force Unleashed Campaign Guide p.88); tags force, force_capacity, force_power_synergy, telekinesis, force_training, resources; “When you take the Force Training feat and select move object as one of your Force powers, you can also select one extra power to add to your Force suite for free. This power must be one of the powers affected by the Tele”

## `galactic_lore` — OWNER_DEFINITION_REQUIRED

Usage: 8 records (1 feats / 7 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when galactic_lore applies.

Examples:
- Elder's Knowledge (FEAT `6ba02f4dd4c3bfe5`, The Unknown Regions p.24); tags knowledge, galactic_lore, skill_substitution, skills, once-per-encounter, perception, survival, treat_injury; “Once per encounter substitutes Knowledge (social sciences) or Knowledge (galactic lore) for a Wisdom or Wisdom-related check.”
- Six Questions (TALENT `46946e7208f1cf05`, Force Unleashed Campaign Guide p.50); tags knowledge, galactic_lore, skills, swift_action, action_economy, investigation, recon, target-designation, awareness; “You have mastered the basic Bothan philosophy of Six Questions to glean more information from contacts through fewer questions. As a swift action, you can make a Knowledge (galactic lore) check against a DC equal to 15 +”
- Spynet Agent (TALENT `648d9634a3795988`, Force Unleashed Campaign Guide p.50); tags investigation, knowledge, galactic_lore, social, social_network, network, skill_substitution, skills, reroll, reliability, gather_information; “You can use your Gather Information check modifier instead of your Knowledge (galactic lore) check modifier when making Knowledge (galactic lore) checks. You are considered trained in the Knowledge (galactic lore) skill ”

## `healing` — OWNER_DEFINITION_REQUIRED

Usage: 53 records (12 feats / 41 talents). Existing policies: none. Unresolved records: 7.

- Q: Define when `healing` applies. State whether records whose canonical text matches J.healing in the observed wording forms qualify.

Examples:
- Resurgence (FEAT `005e922d0430d86b`, Scum and Villainy p.24); tags recovery, move_action, action_economy; forms OTHER
- Forceful Recovery (FEAT `627b92fefdc552d2`, Galaxy of Intrigue p.27); tags force, force_power, resource_recovery, recovery, force_capacity; forms OTHER
- Aggressive Surge (TALENT `147f70a2b815f34e`, Rebellion Era Campaign Guide p.26); tags once-per-encounter, action_economy, mobility, movement, melee, burst_damage; forms OTHER
- Soothe (TALENT `3713870862584269`, Clone Wars Campaign Guide p.41); tags force, force_power_synergy, force_support, support, recovery, condition_removal, medical, medicine; forms OTHER
- Reduce Defense (TALENT `874ffa6b66cf2c37`, Force Unleashed Campaign Guide p.42); tags critical_hit, melee, ranged, control, battlefield_control, defense, targeting, setup; forms OTHER

## `heavy_weapon` — PARTIALLY_OWNER_DEFINED

Usage: 5 records (1 feats / 4 talents). Existing policies: OPEN_GENERIC_SCOPE_POLICY. Unresolved records: 0.

- Q: Define when `heavy_weapon` applies. State whether records whose canonical text matches O.heavy_weapon in the observed wording forms qualify.

Examples:
- Heavy Hitter (FEAT `a16df0d4edf3e7bf`, The Unknown Regions p.26); tags heavy_weapon, vehicle, ranged, damage_bonus, scaling, damage_threshold, battlefield_control, movement, control; “With a weapon emplacement or vehicle weapon, adds damage based on attack margin; exceeding damage threshold prevents the target from attacking next turn and reduces its speed.”
- Extended Critical Range (heavy weapons) (TALENT `04985a42930dff2a`, Force Unleashed Campaign Guide p.42); tags heavy_weapon, ranged, critical_hit, precision, weapon_training; “When you are using a heavy weapon, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other ”
- Multiattack Proficiency (heavy weapons) (TALENT `1b3d5d3260391867`, Saga Edition Core Rulebook p.212); tags heavy_weapon, full_attack, sustained_damage, precision, weapon_training; “Whenever you make multiple attacks with any type of heavy weapon as a full attack action, you reduce the penalty on your attack rolls by 2. You can take this talent multiple times; each time, reduce the penalty by an add”

## `illusion` — OWNER_DEFINITION_REQUIRED

Usage: 5 records (0 feats / 5 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when illusion applies.

Examples:
- Illusion (TALENT `708a47d1be414990`, Force Unleashed Campaign Guide p.87); tags force, use_the_force, force_point_spend, resource_spend, standard_action, action_economy, illusion, deception, mind-affecting, control, manipulation, will_defense, scaling; “As a standard action, you can spend a Force Point to create an illusion that seems perfectly real to anyone who views it. You designate the form and complexity of the illusion, as well as its size and location, and make ”
- Masquerade (TALENT `86fbb269a17a8c5e`, Jedi Academy Training Manual p.15); tags force, illusion, deception, social, skills, use_the_force, skill_substitution, infiltration, concealment; “You can use the Illusion talent to create a disguise for yourself. You use the result of your Use the Force check made to create the illusion for the purposes of creating a deceptive appearance, as per the application of”

## `implant` — OWNER_DEFINITION_REQUIRED

Usage: 9 records (3 feats / 6 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when implant applies.

Examples:
- Biotech Surgery (FEAT `77dba0a49c63e42d`, Legacy Era Campaign Guide p.35); tags biotech, medical, medicine, treat_injury, implant; “Install a biotech prosthesis onto a living being. Surgery takes 1 uninterrupted hour followed by a DC 20 Treat Injury check; failure permits another attempt after another uninterrupted hour. Self-installation is allowed ”
- Cybernetic Surgery (FEAT `b3965f7a31f310ec`, Saga Edition Core Rulebook p.83); tags treat_injury, medical, medicine, implant, tech; “Install a cybernetic prosthesis/device on a living being with 1 hour of uninterrupted work and a DC 20 Treat Injury check. Failure does not install it; retry after another uninterrupted hour. Self-installation takes -5 o”
- Implant Training (FEAT `ce009e054ef1681f`, Knights of the Old Republic Campaign Guide p.33); tags implant, resilience, survivability; “You are not moved one extra step down the condition track when an implant would normally cause that extra step. Official KOTOR errata confirms this condition-track protection and supersedes the printed table's conflictin”
- Adrenaline Implant (TALENT `2fdf215a5da99e00`, Legacy Era Campaign Guide p.47); tags once-per-encounter, standard_action, action_economy, biotech, implant, equipment, ally_support, support, durability, survivability, scaling, treat_injury; “Once per encounter as a standard action, you can give one adjacent living creature an adrenaline implant. The target must be willing to receive this implant, which grants the target 10 bonus hit points at the start of ea”
- Precision Implant (TALENT `58e37d40d3aa7d4b`, Legacy Era Campaign Guide p.47); tags once-per-encounter, standard_action, action_economy, biotech, implant, equipment, ally_support, support, precision, treat_injury; “Once per encounter as a standard action, you can give one adjacent living creature a precision implant. The target must be willing to receive this implant, which grants the target a +1 equipment bonus on attack rolls unt”

## `improvised_weapon` — OWNER_DEFINITION_REQUIRED

Usage: 7 records (1 feats / 6 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when improvised_weapon applies.

Examples:
- Improvised Weapon Mastery (FEAT `b754b5e064c20cc0`, The Unknown Regions p.27); tags improvised_weapon, weapon_training, damage_bonus, melee, ranged; “Treats improvised weapons as simple weapons, removes normal penalties, allows simple-weapon feats/talents to apply, and adds 1d6 damage on a hit.”
- Improvised Weapon Master (TALENT `17cdb585c58c2f19`, Jedi Academy Training Manual p.21); tags improvised_weapon, melee, weapon_training, precision; “You take no penalty on attack rolls with improvised weapons.”
- Make Do (TALENT `95ae8969ac50b180`, Scum and Villainy p.18); tags improvised_weapon, precision, weapon_training; “When fighting with an improvised weapon, you take no penalty on your attack rolls.”

## `infiltration` — OWNER_DEFINITION_REQUIRED

Usage: 38 records (5 feats / 33 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when infiltration applies.

Examples:
- Disturbing Presence (FEAT `25ba21b021086a71`, Galaxy of Intrigue p.27); tags deception, acrobatics, skill_substitution, movement, mobility, attack_of_opportunity, evasion, infiltration; “DC 15 Deception allows movement through an enemy's threatened area or fighting space without provoking. Each threatened or occupied square traversed this way costs 2 squares of movement. DC 15 Deception lets you move thr”
- Impersonate (FEAT `2def724bf673c2fc`, Scum and Villainy p.23); tags deception, social, infiltration, manipulation; “Use Deception to alter your features to a specific person and change your voice to match. Always treat impersonating a specific person as a Moderate Deception. Use Shapeshift and Deception to impersonate a specific perso”
- Covert Operatives (FEAT `75daa55c22ffed5e`, Galaxy at War p.28); tags teamwork, stealth, infiltration, movement, mobility, scaling; “Gain +3 competence on Stealth checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, when moving more than your speed or more t”
- Electronic Sabotage (TALENT `0290634450ab1637`, Force Unleashed Campaign Guide p.27); tags use_computer, slicing, tech, skills, standard_action, action_economy, control, network, infiltration; “You excel at causing havoc with computers and electronics. As a standard action, you can lock down a computer terminal by making a Use Computer check, making it potentially difficult for anyone else to access. That compu”
- Improved Stealth (TALENT `073115894cad8cf9`, Saga Edition Core Rulebook p.49); tags stealth, skills, infiltration, reroll, reliability; “You may choose to reroll any Stealth check, but the result of the reroll must be accepted, even if it is worse.”

## `initiative` — PARTIALLY_OWNER_DEFINED

Usage: 27 records (5 feats / 22 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when initiative applies.

Examples:
- Bad Feeling (FEAT `37aa58a3833bf34a`, The Force Unleashed Campaign Guide p.32); tags surprise_round, move_action, action_economy, movement, mobility, ambush_defense, initiative; “You may always take a move action during a surprise round, even if surprised. If not surprised, that move action is in addition to the actions you normally receive in the surprise round. Always gain a move action in the ”
- Perfect Intuition (FEAT `5a2ba2f28bc5ee01`, Rebellion Era Campaign Guide p.34); tags initiative, reroll, reliability; “Whenever you reroll an Initiative check, always keep the better result, even if multiple reroll abilities apply. Initiative rerolls always keep the better result.”
- Armor Proficiency (Light) (FEAT `773ec00effc7e96f`, Saga Edition Core Rulebook p.82); tags armor, equipment, skills, acrobatics, climb, endurance, initiative, jump, stealth, swim; “Wear light armor without its nonproficiency attack/skill penalties and gain its special equipment bonuses. Use light armor without nonproficiency penalties and gain its special equipment bonuses.”
- Force Intuition (TALENT `00deb8b4cce303b6`, Saga Edition Core Rulebook p.40); tags force, use_the_force, initiative, skills, skill_substitution, reroll, reliability, vehicle, pilot; “You can use your Use the Force check modifier instead of your Initiative modifier when making Initiative checks. You are considered Trained in the Initiative skill. If you are entitled to an Initiative check reroll, you ”
- Force Warning (TALENT `0178e98b17ab2bcc`, Knights of the Old Republic Campaign Guide p.40); tags force, initiative, ally_support, support, teamwork, reroll, reliability, ambush_defense, surprise_round, scaling, awareness; “Allies within 12 squares can choose to reroll their Initiative checks at the start of combat but must take the second result, even if it is worse. Furthermore, if any allies within 12 squares are surprised at the start o”

## `intimidation` — OWNER_DEFINITION_REQUIRED

Usage: 20 records (4 feats / 16 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when intimidation applies.

Examples:
- Maniacal Charge (FEAT `4330126d10dccd71`, The Unknown Regions p.27); tags intimidation, persuasion, movement, mobility, attack_of_opportunity, ambush, setup, control, action_economy; “During a charge, a free-action Intimidate check can suppress attacks of opportunity from enemies passed and make the charge target flat-footed until the next turn.”
- Demoralizing Strike (FEAT `691b3a9309b28e60`, Galaxy of Intrigue p.27); tags attack_of_opportunity, persuasion, intimidation, social, control, action_economy; “After successfully dealing damage with an attack of opportunity, immediately make a Persuasion check to Intimidate that opponent as a free action. Damage an opponent with an AoO to immediately Intimidate it as a free act”
- Silver Tongue (FEAT `8ff15069dbf6270d`, Galaxy of Intrigue p.29); tags persuasion, intimidation, social, manipulation, standard_action, action_economy; “Intimidate a creature or Change Attitude as a standard action instead of the normal full-round action. Intimidate or Change Attitude as a standard action.”
- Notorious (TALENT `09744041cdcc9e22`, Saga Edition Core Rulebook p.210); tags persuasion, intimidation, social, skills, fear, reroll, reliability; “Your reputation as a crime lord is known throughout the galaxy, even on fringe worlds. When you are not disguised, you may reroll any Persuasion checks made to intimidate others, keeping the better result.”
- Cower Enemies (TALENT `0e36a04342959256`, Force Unleashed Campaign Guide p.42); tags persuasion, intimidation, social, skills, fear, control, battlefield_control; “When you use the Persuasion skill to intimidate, you can intimidate all targets in a 6-square cone (originating from your square) instead of intimidating a single target. All other limitations to the intimidation use of ”

## `intrigue` — OWNER_DEFINITION_REQUIRED

Usage: 3 records (2 feats / 1 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when intrigue applies.

Examples:
- Expert Briber (FEAT `a6890bb21adad47e`, Galaxy of Intrigue p.27); tags persuasion, social, resources, intrigue; “Detailed printed Benefit: when using the Haggle application of Persuasion, reduce by 10 the DC to reduce the price of the item haggled over. The chapter summary describes the feat more broadly as reducing the time and co”
- Fringe Benefits (FEAT `b1299c242802a260`, Rebellion Era Campaign Guide p.33); tags resources, social, intrigue; “Whenever you buy goods on the black market, reduce the cost multiplier by 2, minimum x1. Reduce black-market cost multipliers by 2, minimum x1.”
- Revealing Secrets (TALENT `71908efcdb7e6711`, Galaxy of Intrigue p.25); tags investigation, intrigue, skills, social, social_network, network, resources, gather_information; “Your investigations reveal information that your target thought was secret. When you make a Gather Information check to learn secret information, the DC is reduced by 10 and the bribery cost is reduced to one-fifth the o”

## `investigation` — OWNER_DEFINITION_REQUIRED

Usage: 31 records (2 feats / 29 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when investigation applies.

Examples:
- Confident Success (FEAT `139a80972fc3b8ee`, Rebellion Era Campaign Guide p.31); tags gather_information, investigation, social, force-point, resource_recovery; “Whenever you successfully use Gather Information to Learn Secret Information, gain 1 Force Point. You can gain no more than 3 Force Points per level this way, and cannot hold more Force Points than you gained upon reachi”
- Informer (FEAT `f313d17068d1cdea`, The Force Unleashed Campaign Guide p.33); tags perception, investigation, skill_substitution, skills, social, reliability, gather_information, reroll; “Use your Perception modifier instead of Gather Information for Gather Information checks and count as trained in Gather Information for this use. If entitled to a Gather Information reroll, reroll the substituted Percept”
- Guardian Spirit (TALENT `0b18181b971fc505`, Jedi Academy Training Manual p.16); tags force, search_your_feelings, visions, precognition, investigation, recon, use_the_force, resources, force_capacity, force_point_spend, resource_spend, force_power_synergy; “You have a guardian spirit watching over you from the realm of the Force, providing you with insight and advice. Your guardian spirit might be an old mentor or an ancient member of your Force tradition who has chosen to ”
- Jedi Network (TALENT `251462d5e3aaa4ce`, Legacy Era Campaign Guide p.42); tags social_network, resources, equipment, investigation, healing, medical, infiltration, ally_support, support, teamwork, reliability, gather_information; “You have access to a network of Jedi sympathizers. While in a civilized area, you can call upon this network of allies once per game session for one of the following purposes: Acquire Equipment or Funds: You can use your”

## `jury_rig` — OWNER_DEFINITION_REQUIRED

Usage: 8 records (0 feats / 8 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when jury_rig applies.

Examples:
- Fast Repairs (TALENT `36f8497081dce05a`, Starships of the Galaxy p.16); tags mechanics, skills, jury_rig, vehicle, equipment, durability, survivability, scaling; “Whenever you jury-rig an object or vehicle, the vehicle gains a number of temporary hit points equal to the result of your Mechanics check. Damage is subtracted from these temporary hit points first, and temporary hit po”
- Quick Fix (TALENT `3e6f7edaeec04a06`, Starships of the Galaxy p.17); tags once-per-encounter, jury_rig, mechanics, skills, tech, vehicle, equipment, recovery, condition_removal, durability; “Once per encounter, you may jury-rig an object or vehicle that is not disabled. All normal benefits and penalties for jury-rigging still apply.”

## `knowledge` — PARTIALLY_OWNER_DEFINED

Usage: 35 records (6 feats / 29 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when knowledge applies.

Examples:
- Cut the Red Tape (FEAT `2bb34366776f0371`, Galaxy of Intrigue p.27); tags knowledge, gather_information, skill_substitution, skills, reroll, reliability; “Use Knowledge (Bureaucracy) modifier in place of Gather Information. If entitled to a Gather Information reroll, reroll the substituted Knowledge check under the same restrictions. Count as trained in Gather Information ”
- Elder's Knowledge (FEAT `6ba02f4dd4c3bfe5`, The Unknown Regions p.24); tags knowledge, galactic_lore, skill_substitution, skills, once-per-encounter, perception, survival, treat_injury; “Once per encounter substitutes Knowledge (social sciences) or Knowledge (galactic lore) for a Wisdom or Wisdom-related check.”
- Mind of Reason (FEAT `987bdca14576cf2f`, Rebellion Era Campaign Guide p.34); tags skill_substitution, skills, knowledge, mechanics, use_computer; “Use your Wisdom bonus instead of your Intelligence bonus for all Intelligence-based skill checks. Use Wisdom bonus instead of Intelligence bonus for Intelligence-based skill checks.”
- Protocol (TALENT `058898a456a9a8fb`, Force Unleashed Campaign Guide p.103); tags ally_support, support, teamwork, skills, deception, knowledge, persuasion, social, reliability; “You always succeed on attempts to aid another on Deception, Knowledge, and Persuasion checks (no check required).”
- Insight of the Force (TALENT `0adc25cfaa35147a`, Clone Wars Campaign Guide p.41); tags force, use_the_force, knowledge, skills, skill_substitution, reroll, reliability; “You can make a Use the Force check in place of a Knowledge check for any Knowledge skill you are not Trained in. You are considered Trained in that Knowledge skill for the purposes of using this Talent. If you are entitl”

## `leadership` — OWNER_DEFINITION_REQUIRED

Usage: 18 records (3 feats / 15 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `leadership` applies. State whether records whose canonical text matches K.leadership in the observed wording forms qualify.

Examples:
- Leader of Droids (FEAT `59e495de34a23def`, Clone Wars Campaign Guide p.31); tags droid, leadership, mind-affecting, ally_support, support, empowerment; “When you provide a beneficial mind-affecting effect to allies, choose a number of allied droids equal to your Intelligence modifier, minimum 1. Chosen willing droids may ignore their immunity to mind-affecting effects fo”
- Natural Leader (FEAT `d41076e442832c3e`, The Force Unleashed Campaign Guide p.34); tags leadership, social_network, resources, scaling; “Become leader of an organization of your design. Organization scale equals one-half heroic level plus Charisma bonus. Begin with +10 organization score for the new organization. Found an organization with scale based on ”
- Officer Candidacy Training (FEAT `d976f03c298fb1be`, Galaxy at War p.25); tags leadership, social_network, social; “Gain +2 to Rank and Privilege organization score. Gain +2 Rank and Privilege organization score.”
- Band Together (TALENT `03123bd5c86beaa0`, Unknown Regions p.19); tags ally_support, support, teamwork, leadership, target-designation, damage_bonus, will_defense, persuasion, social, mind-affecting, control, swift_action, action_economy, once-per-encounter, sustained_damage; “You can use each of the following actions once per encounter. Directed Attack: As a swift action, designate one enemy character or vehicle; until the end of your next turn, whenever an ally within 12 squares hits that ta”
- Fall Back (TALENT `16b020752725d7a9`, Galaxy at War p.31); tags move_action, action_economy, ally_support, support, teamwork, leadership, command, mobility, positioning, evasion, attack_of_opportunity; “As a move action, you can enable each member of your squad to immediately move two squares. This movement does not provoke an attack of opportunity.”

## `light_side` — OWNER_DEFINITION_REQUIRED

Usage: 8 records (0 feats / 8 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when light_side applies.

Examples:
- Focused Attack (TALENT `2fc019fa8c4108a7`, Clone Wars Campaign Guide p.53); tags force, light_side, dark_side, force_point_spend, resource_spend, reroll, reliability, precision; “You can spend a Force Point to reroll an attack against a creature with a Dark Side Score of 1 or higher, keeping the better of the two rolls.”
- Surge of Light (TALENT `8223d30bfce0c14d`, Clone Wars Campaign Guide p.53); tags force, light_side, force_power_synergy, force_capacity, resource_recovery, recovery, swift_action, action_economy, once-per-encounter; “Once per encounter, as a swift action, you can return any Force power with the [light side] descriptor to your suite without spending a Force Point. You can select this talent multiple times. Each time you select it, you”

## `lightsaber` — PARTIALLY_OWNER_DEFINED

Usage: 77 records (3 feats / 74 talents). Existing policies: CLOSED_SCOPE_POLICY, OPEN_GENERIC_SCOPE_POLICY. Unresolved records: 3.

- Q: Define when `lightsaber` applies. State whether records whose canonical text matches O.lightsaber in the observed wording forms qualify.

Examples:
- Flurry (FEAT `0536f81eff886234`, Knights of the Old Republic Campaign Guide p.33); tags melee, precision, defense; forms CLOSED_DIRECT/OTHER
- Infuse Weapon (TALENT `0df15b0ea7721c50`, Force Unleashed Campaign Guide p.93); tags force, force_point_spend, resource_spend, empowerment, weapon_empowerment, equipment, melee, damage_reduction, durability, damage_bonus, sustained_damage; forms OTHER
- Precision Fire (TALENT `bef731c3743c2c7f`, Legacy Era Campaign Guide p.40); tags anti-force, ranged, precision, targeting, deflect, setup; forms OTHER

## `lightsaber_polearm` — OWNER_DEFINITION_REQUIRED

Usage: 2 records (1 feats / 1 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when lightsaber_polearm applies.

Examples:
- Long Haft Strike (FEAT `b60e581b6c102cfc`, Jedi Academy Training Manual p.23); tags lightsaber, lightsaber_polearm, double_weapon; “When using a lightsaber pike or long-handle lightsaber, you may attack with both ends and treat the weapon as a double weapon. Use the individual weapon description for two-ended attack details. Treat a lightsaber pike o”
- Siang Lance Mastery (TALENT `0bbfcac85b09416a`, Rebellion Era Campaign Guide p.37); tags lightsaber_polearm, ranged, precision, weapon_training, equipment; “You treat a siang lance as a rifle instead of as an exotic weapon. Additionally, you gain a +1 bonus to attack rolls with a siang lance. This talent counts as the Weapon Focus (siang lance) feat for the purpose of satisf”

## `manipulation` — OWNER_DEFINITION_REQUIRED

Usage: 35 records (5 feats / 30 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when manipulation applies.

Examples:
- Impersonate (FEAT `2def724bf673c2fc`, Scum and Villainy p.23); tags deception, social, infiltration, manipulation; “Use Deception to alter your features to a specific person and change your voice to match. Always treat impersonating a specific person as a Moderate Deception. Use Shapeshift and Deception to impersonate a specific perso”
- Silver Tongue (FEAT `8ff15069dbf6270d`, Galaxy of Intrigue p.29); tags persuasion, intimidation, social, manipulation, standard_action, action_economy; “Intimidate a creature or Change Attitude as a standard action instead of the normal full-round action. Intimidate or Change Attitude as a standard action.”
- Disarming Charm (FEAT `9567c9e2fe8416e6`, Rebellion Era Campaign Guide p.31); tags persuasion, deception, social, manipulation; “After successfully using Change Attitude on a target, gain +2 circumstance on all Deception and Persuasion checks against that target for 24 hours. Successful Change Attitude grants +2 circumstance Deception/Persuasion a”
- Soothing Presence (TALENT `0a65325a98b108a7`, Jedi Academy Training Manual p.18); tags beast, social, manipulation, control, reliability; “Whenever you encounter a beast with an unfriendly attitude toward you, you automatically shift its attitude to indifferent (no skill check required).”
- Dampen Presence (TALENT `236e5a8ef7bbcfa6`, Force Unleashed Campaign Guide p.24); tags force, use_the_force, swift_action, action_economy, mind-affecting, will_defense, stealth, concealment, infiltration, social, manipulation; “When you interact with another sentient creature, you can use a swift action to reduce the impression you leave on it. When you have finished interacting with the creature, you make a Use the Force check, and if the chec”

## `martial_arts` — OWNER_DEFINITION_REQUIRED

Usage: 38 records (12 feats / 26 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when martial_arts applies.

Examples:
- Wrruushi Training (FEAT `1d0291d930abda15`, Galaxy at War p.28); tags martial_arts, unarmed, melee, survivability, resilience, control, once-per-encounter, critical_hit, damage; “Once per round after a successful unarmed attack, gain bonus HP equal to Constitution modifier; damage removes these first, leftovers expire at encounter end, and they do not stack. Once per encounter, make an unarmed at”
- K'tara Training (FEAT `1dfbddf5f1aa57c3`, Galaxy at War p.27); tags martial_arts, unarmed, melee, ambush, damage_bonus, stun, control, once-per-encounter, swift_action, action_economy, setup; “One unarmed attack during your turn deals +1 damage die against a flat-footed enemy. Once per encounter after unarmed damage to a target denied Dexterity to Reflex, make a free unarmed attack vs Fortitude; on success, ta”
- Martial Arts II (FEAT `5bedd71f0eead6b9`, Saga Edition Core Rulebook p.86); tags martial_arts, unarmed, melee, damage_bonus, defense; “Increase unarmed damage one additional die step. Gain another +1 dodge Reflex Defense, stacking with Martial Arts I. Increase unarmed damage another die step and gain another +1 dodge Reflex.”
- Simultaneous Strike (TALENT `040e50766b518ea6`, Jedi Academy Training Manual p.89); tags unarmed, martial_arts, melee, standard_action, action_economy, burst_damage, positioning; “As a standard action, you can make two unarmed attacks, each against different targets.”
- Martial Resurgence (TALENT `0fb750f0f0e6f767`, Jedi Academy Training Manual p.89); tags unarmed, martial_arts, melee, critical_hit, force, force_power_synergy, force_capacity, resource_recovery, recovery, critical_success; “You recover all spent Force powers, adding them to your Force suite again, whenever you roll a natural 20 on an unarmed attack.”

## `mechanics` — PARTIALLY_OWNER_DEFINED

Usage: 51 records (15 feats / 36 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when mechanics applies.

Examples:
- Expert Droid Repair (FEAT `029c3935e9bed6eb`, Clone Wars Campaign Guide p.29); tags droid, mechanics, repair, tech, scaling; “Repair a number of droids simultaneously equal to your Intelligence bonus. Make Mechanics checks separately for each droid as normal. Unlike Experienced Medic, the printed feat text does not state a minimum of 2. Repair ”
- Technical Experts (FEAT `18779d9a72b47a12`, Galaxy at War p.29); tags teamwork, mechanics, skills, scaling, ally_support, support, tech; “Gain +3 competence on Mechanics checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, when using Aid Another to assist an ally”
- Signature Device (FEAT `313095ada7504547`, Scum and Villainy p.24); tags tech, mechanics, modification, equipment, reliability, swift_action, action_economy; “Designate one weapon, armor, vehicle, or other item as your signature item. You may Take 10 on Mechanics checks to modify it. It may have two Tech Specialist traits; installing the second requires DC 30 Mechanics. Only o”
- Repairs on the Fly (TALENT `16dd1c81c5145dd8`, Clone Wars Campaign Guide p.45); tags mechanics, tech, skills, repair, healing, recovery, durability, standard_action, action_economy, droid, vehicle; “You can use the Repair application of the Mechanics skill to Repair Droid or Repair Object as a Standard Action. You can gain the benefits of this Talent only once per day per Droid, object, or Vehicle Repaired.”
- Repair Self (TALENT `177198e388ad4e3ca6fe85d3b6b399f5`, Force Unleashed Campaign Guide p.47); tags droid, mechanics, tech, skills, self_repair, repair, healing, recovery, durability, survivability, scaling; “When you repair yourself (using the repair droid application of the Mechanics skill), you repair 1 additional hit point for each point by which your check exceeds the DC.”

## `medical` — OWNER_DEFINITION_REQUIRED

Usage: 38 records (7 feats / 31 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when medical applies.

Examples:
- Wilderness First Aid (FEAT `171f0d8d997c8bbc`, The Unknown Regions p.28); tags survival, nature, medical, treat_injury, healing, skills; “Once per day, a successful Survival check lets Basic Survival count as having a medpac for Treat Injury checks until day end.”
- Medical Team (FEAT `1d27dfb8ce491836`, Galaxy at War p.29); tags teamwork, treat_injury, medical, medicine, healing, scaling, ally_support, support; “Gain +3 competence on Treat Injury checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, when you Aid Another an ally with thi”
- Experienced Medic (FEAT `5e1e84d933295217`, Clone Wars Campaign Guide p.29); tags medical, medicine, treat_injury, healing, ally_support, support, scaling; “Perform surgery on a number of creatures simultaneously equal to your Intelligence bonus, minimum 2. Make Treat Injury checks separately for each creature as normal. Perform surgery on multiple creatures at once: Intelli”
- Healing Boost (TALENT `0e6a784501100693`, Clone Wars Campaign Guide p.41); tags force, force_power_synergy, force_support, healing, scaling, support, medical, medicine; “When healing somebody through Vital Transfer, the amount of damage healed increases by 1 point per your Class Level.”
- Force Treatment (TALENT `181da7f36b9fba9d`, Saga Edition Core Rulebook p.214); tags force, use_the_force, treat_injury, medicine, medical, skills, skill_substitution, reroll, reliability, healing, recovery, support; “You can make a Use the Force check in place of a Treat Injury check. You are considered Trained in the Treat Injury Skill. If you are entitled to a Treat Injury check reroll, you may reroll your Use the Force check inste”

## `medicine` — OWNER_DEFINITION_REQUIRED

Usage: 25 records (5 feats / 20 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `medicine` applies. State whether records whose canonical text matches J.medicine in the observed wording forms qualify.

Examples:
- Medical Team (FEAT `1d27dfb8ce491836`, Galaxy at War p.29); tags teamwork, treat_injury, medical, medicine, healing, scaling, ally_support, support; “Gain +3 competence on Treat Injury checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, when you Aid Another an ally with thi”
- Experienced Medic (FEAT `5e1e84d933295217`, Clone Wars Campaign Guide p.29); tags medical, medicine, treat_injury, healing, ally_support, support, scaling; “Perform surgery on a number of creatures simultaneously equal to your Intelligence bonus, minimum 2. Make Treat Injury checks separately for each creature as normal. Perform surgery on multiple creatures at once: Intelli”
- Biotech Surgery (FEAT `77dba0a49c63e42d`, Legacy Era Campaign Guide p.35); tags biotech, medical, medicine, treat_injury, implant; “Install a biotech prosthesis onto a living being. Surgery takes 1 uninterrupted hour followed by a DC 20 Treat Injury check; failure permits another attempt after another uninterrupted hour. Self-installation is allowed ”
- Healing Boost (TALENT `0e6a784501100693`, Clone Wars Campaign Guide p.41); tags force, force_power_synergy, force_support, healing, scaling, support, medical, medicine; “When healing somebody through Vital Transfer, the amount of damage healed increases by 1 point per your Class Level.”
- Force Treatment (TALENT `181da7f36b9fba9d`, Saga Edition Core Rulebook p.214); tags force, use_the_force, treat_injury, medicine, medical, skills, skill_substitution, reroll, reliability, healing, recovery, support; “You can make a Use the Force check in place of a Treat Injury check. You are considered Trained in the Treat Injury Skill. If you are entitled to a Treat Injury check reroll, you may reroll your Use the Force check inste”

## `meditation` — OWNER_DEFINITION_REQUIRED

Usage: 2 records (0 feats / 2 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when meditation applies.

Examples:
- Reading the Flame (TALENT `12f61917f809a3fb`, Legacy Era Campaign Guide p.59); tags force, force_power_synergy, use_the_force, visions, search_your_feelings, precognition, meditation, reroll, reliability; “You can enter a trance by staring into a flame of any size, gaining insight into the workings of the galaxy by meditating on the flame's movement. Whenever you use the farseeing power or the Search Your Feelings applicat”
- Precognitive Meditation (TALENT `f8ac7fecc8d3c8ff`, Jedi Academy Training Manual p.75); tags force, meditation, precognition, visions, planning, setup, force_point_spend, resource_spend, defense, evasion, vehicle, pilot, resource_recovery; “Once per day, you can spend 10 minutes meditating to seek visions of the future. At that time, you can spend a Force Point as a part of this meditation. Once during the rest of the day, whenever you or a vehicle you pilo”

## `melee` — PARTIALLY_OWNER_DEFINED

Usage: 308 records (57 feats / 251 talents). Existing policies: CLOSED_SCOPE_POLICY, OPEN_GENERIC_SCOPE_POLICY. Unresolved records: 11.

- Q: Define when `melee` applies. State whether records whose canonical text matches O.melee in the observed wording forms qualify.

Examples:
- Knife Trick (FEAT `61c053191d05d0a2`, Scum and Villainy p.23); tags attack_of_opportunity, stealth, concealment, equipment, action_economy; forms OTHER
- Charging Fire (FEAT `a945e2f5ffb5a7ed`, Saga Edition Core Rulebook p.82); tags ranged, movement, mobility, positioning; forms OTHER
- Precise Shot (FEAT `c180eee7d3bc29b2`, Saga Edition Core Rulebook p.87); tags ranged, precision, positioning; forms OTHER
- Acrobatic Dodge (FEAT `cda6cb7b58f96a2f`, The Unknown Regions p.24); tags reaction, action_economy, movement, mobility, evasion, attack_of_opportunity, once-per-encounter, force_point_spend, resource_spend; forms OTHER
- Visionary Defense (TALENT `153f4b3c6510023d`, Knights of the Old Republic Campaign Guide p.25); tags force, force_power_synergy, visions, use_the_force, reaction, action_economy, ally_support, support, teamwork, defense, melee_defense, ranged_defense, will_defense, resource_spend; forms OTHER

## `melee_defense` — OWNER_DEFINITION_REQUIRED

Usage: 23 records (2 feats / 21 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `melee_defense` applies. State whether records whose canonical text matches I.melee_defense in the observed wording forms qualify.

Examples:
- Melee Defense (FEAT `3a847230d573a623`, Saga Edition Core Rulebook p.86); tags melee, melee_defense, defense, fighting_defensively, precision, standard_action, action_economy; “When using a standard action for a melee attack, take an attack penalty up to -5 and add the same amount as dodge Reflex Defense. The chosen amount cannot exceed base attack bonus and lasts until the start of your next t”
- Mechanical Martial Arts (FEAT `b9d4eb946079b555`, Scavenger's Guide to Droids p.24); tags martial_arts, unarmed, melee, control, melee_defense, attack_of_opportunity; “After damaging an enemy with an unarmed attack, impose -5 on all melee attack and damage rolls until the start of your next turn. If an organic enemy is struck during an attack of opportunity, the penalty lasts until the”
- Visionary Defense (TALENT `153f4b3c6510023d`, Knights of the Old Republic Campaign Guide p.25); tags force, force_power_synergy, visions, use_the_force, reaction, action_economy, ally_support, support, teamwork, defense, melee_defense, ranged_defense, will_defense, resource_spend; “As a reaction, you can make a Use the Force check after you or an ally within 12 squares is the target of a melee or ranged attack (but before the results of the attack roll are known), removing one use of the farseeing ”
- Praetoria Ishu (TALENT `16aa9efd54967320`, Legacy Era Campaign Guide p.45); tags force, use_the_force, block, deflect, lightsaber, melee_defense, ranged_defense, ally_support, support, teamwork, defense, positioning; “You can use the Block talent to negate a melee attack made against an adjacent ally. In addition, you can use the Deflect talent to negate a ranged attack made against an adjacent ally.”

## `mind-affecting` — OWNER_DEFINITION_REQUIRED

Usage: 80 records (10 feats / 70 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when mind-affecting applies.

Examples:
- Unwavering Focus (FEAT `0214e9586b6c8bb5`, Rebellion Era Campaign Guide p.36); tags mind-affecting, will_defense, defense, reaction, action_economy, skills; “When targeted by a mind-affecting effect requiring a skill check against Will Defense, as a reaction impose -2 on that skill check. React to a mind-affecting skill check against your Will by imposing -2 on the check.”
- Hideous Visage (FEAT `2956acfbfd27967d`, Scum and Villainy p.22); tags deception, fear, mind-affecting, will_defense, control, battlefield_control, movement, swift_action, action_economy, once-per-encounter; “Once per encounter as a swift action, make Deception vs one opponent's Will Defense; the target must be able to see you. On success, move it 1 square away and impose -1 attacks until start of your next turn. Mind-affecti”
- Binary Mind (FEAT `33905755bbb1ca10`, Rebellion Era Campaign Guide p.31); tags mind-affecting, defense, reliability; “Whenever an enemy uses a mind-affecting effect against you, that enemy rolls twice and keeps the lower result. Enemies roll mind-affecting attempts twice against you and keep the lower result.”
- Band Together (TALENT `03123bd5c86beaa0`, Unknown Regions p.19); tags ally_support, support, teamwork, leadership, target-designation, damage_bonus, will_defense, persuasion, social, mind-affecting, control, swift_action, action_economy, once-per-encounter, sustained_damage; “You can use each of the following actions once per encounter. Directed Attack: As a swift action, designate one enemy character or vehicle; until the end of your next turn, whenever an ally within 12 squares hits that ta”
- Closed Mind (TALENT `084423db749d2bb3`, Jedi Academy Training Manual p.18); tags mind-affecting, will_defense, defense, resilience, reroll, reliability; “Whenever a creature uses a mind-affecting effect on you that targets your Will Defense, it must roll the attack roll or skill check twice, taking the lower result.”

## `minion` — OWNER_DEFINITION_REQUIRED

Usage: 13 records (0 feats / 13 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when minion applies.

Examples:
- Undying Loyalty (TALENT `2a209f3e58d8528c`, Clone Wars Campaign Guide p.23); tags followers, minion, ally_support, support, survivability, durability; “Each of your Followers gains the Toughness Feat.”
- Attract Minion (TALENT `2b31cb2ea7ad64b9`, Saga Edition Core Rulebook p.210); tags minion, followers, ally_support, support, scaling; “You attract a loyal Minion. The Minion is a Nonheroic character with a Class Level equal to your heroic level - 2 (minimum 1). You may select this Talent multiple times; each time you select this Talent, you gain another”

## `modification` — OWNER_DEFINITION_REQUIRED

Usage: 29 records (6 feats / 23 talents). Existing policies: none. Unresolved records: 3.

- Q: Define when `modification` applies. State whether records whose canonical text matches L.modification in the observed wording forms qualify.

Examples:
- Infuse Weapon (TALENT `0df15b0ea7721c50`, Force Unleashed Campaign Guide p.93); tags force, force_point_spend, resource_spend, empowerment, weapon_empowerment, equipment, melee, damage_reduction, durability, damage_bonus, sustained_damage; forms OTHER
- Power of the Dark Side (TALENT `627bd3abd30b973f`, Saga Edition Core Rulebook p.101); tags force, dark_side, dark_side_score, force_point_spend, resource_spend, force_multiplier, precision, reroll, reliability; forms OTHER
- Scripted Routines (TALENT `8d0657e7ade688bd`, Scavenger's Guide to Droids p.29); tags droid, once-per-encounter, action_economy, skills, scaling, defense, ability_enhancement; forms OTHER

## `morale` — OWNER_DEFINITION_REQUIRED

Usage: 35 records (0 feats / 35 talents). Existing policies: none. Unresolved records: 10.

- Q: Define when `morale` applies. State whether records whose canonical text matches K.morale in the observed wording forms qualify.

Examples:
- Logic Upgrade: Self-Defense (FEAT `191aacaecaa92ce1`, Knights of the Old Republic Campaign Guide p.34); tags defense, reaction, action_economy, once-per-encounter; forms OTHER
- Ample Foraging (FEAT `223a5c14f2ea4737`, Rebellion Era Campaign Guide p.31); tags survival, nature, ally_support, support, defense, resilience; forms OTHER
- Hideous Visage (FEAT `2956acfbfd27967d`, Scum and Villainy p.22); tags deception, fear, mind-affecting, will_defense, control, battlefield_control, movement, swift_action, action_economy, once-per-encounter; forms OTHER
- Dreadful Countenance (FEAT `2e5ada2de01fff4d`, Behind the Threat: The Sith, Part 2 — The Becoming p.web-article-archived-rendering-page-4-of-4); tags persuasion, use_the_force, force, fear, reroll, reliability, social; forms OTHER
- Resolute Stance (FEAT `63dbb0e9623f7fce`, Galaxy of Intrigue p.28); tags fighting_defensively, defense, will_defense, resilience, setup; forms OTHER

## `mount` — OWNER_DEFINITION_REQUIRED

Usage: 10 records (5 feats / 5 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when mount applies.

Examples:
- Mounted Regiment (FEAT `0e9aa3d941f4eb80`, Galaxy at War p.29); tags teamwork, ride, mount, rider, beast, defense, reaction, action_economy, scaling; “Gain +3 competence on Ride checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, once per round as a reaction when your mount ”
- Mounted Defense (FEAT `acb7efcc70769b9f`, Threats of the Galaxy p.127); tags mount, ride, rider, beast, vehicle, defense, evasion, once-per-encounter; “While riding a beast or speeder bike, as passenger or pilot, once per encounter redirect an attack made against you to the mount or vehicle. Choose to redirect after the attack roll result is known but before damage or o”
- Mounted Combat (FEAT `af5caa92d8fc0e3a`, The Unknown Regions p.27); tags mount, ride, rider, beast, movement, mobility, swift_action, reaction, action_economy, defense, evasion, endurance; “Uses Ride to boost a living mount's speed as a swift action and, once per round as a reaction, can negate a weapon hit against rider or mount with a successful Ride check.”
- Terrain Guidance (TALENT `598c2b9b9bb1136f`, Unknown Regions p.22); tags mount, ride, rider, mobility, exploration, skills, swift_action, action_economy; “When in control of your mount, you can make a DC 20 Ride check as a swift action to negate the effect of difficult terrain on your mount's speed.”
- Command Beast (TALENT `6f158211516da82a`, Saga Edition Core Rulebook p.107); tags beast, nature, control, mount, ride, rider; “Whenever you manage to shift the attitude of a beast to indifferent or friendly, you may treat that creature as a domesticated animal, but for you only. Additionally, you may use this beast as a mount, provided it is at ”

## `nature` — OWNER_DEFINITION_REQUIRED

Usage: 11 records (8 feats / 3 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when nature applies.

Examples:
- Scion of Dorin (FEAT `08a15012d82f0d16`, Rebellion Era Campaign Guide p.35); tags defense, resilience, nature; “Gain +5 species Fortitude Defense against all natural hazards. Gain +5 species Fortitude against natural hazards.”
- Wilderness First Aid (FEAT `171f0d8d997c8bbc`, The Unknown Regions p.28); tags survival, nature, medical, treat_injury, healing, skills; “Once per day, a successful Survival check lets Basic Survival count as having a medpac for Treat Injury checks until day end.”
- Ample Foraging (FEAT `223a5c14f2ea4737`, Rebellion Era Campaign Guide p.31); tags survival, nature, ally_support, support, defense, resilience; “When you use Basic Survival, every creature that consumes the food you find gains +2 morale Fortitude Defense until the start of the next day. Food found with Basic Survival grants consumers +2 morale Fortitude until the”
- Planetary Attunement (TALENT `1204459eaaff9efa`, Jedi Academy Training Manual p.75); tags force, force_point_spend, resource_spend, exploration, survival, nature, defense, mobility, senses, precognition, planning, action_economy; “Whenever you arrive on a new planet, you can spend 10 minutes and a Force Point to acclimate yourself to the planet's unique ebb and flow of Force energy. While on the planet, you gain a +2 Force bonus to all defenses ag”
- Command Beast (TALENT `6f158211516da82a`, Saga Edition Core Rulebook p.107); tags beast, nature, control, mount, ride, rider; “Whenever you manage to shift the attitude of a beast to indifferent or friendly, you may treat that creature as a domesticated animal, but for you only. Additionally, you may use this beast as a mount, provided it is at ”

## `network` — OWNER_DEFINITION_REQUIRED

Usage: 11 records (1 feats / 10 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when network applies.

Examples:
- Sensor Link (FEAT `e95252c02d2ae129`, Scavenger's Guide to Droids p.24); tags sensors, perception, network, ally_support, support, swift_action, action_economy, awareness; “As a swift action, broadcast audio, visual, and special sensor input to a droid ally, comlink, communications system, or holographic receiver within 24 squares. The ally knows what you know and may Aid Another on your Pe”
- Electronic Sabotage (TALENT `0290634450ab1637`, Force Unleashed Campaign Guide p.27); tags use_computer, slicing, tech, skills, standard_action, action_economy, control, network, infiltration; “You excel at causing havoc with computers and electronics. As a standard action, you can lock down a computer terminal by making a Use Computer check, making it potentially difficult for anyone else to access. That compu”
- Force Cloak (TALENT `2c18952e0c014127`, Saga Edition Core Rulebook p.107); tags force, swift_action, action_economy, concealment, stealth, infiltration, tech, sensors, network; “As a swift action, you can surround yourself with an invisible bubble of Force power that shields you and anything you're carrying from electronic surveillance. The bubble also blocks all electronic sensors and communica”

## `nonlethal` — PARTIALLY_OWNER_DEFINED

Usage: 10 records (1 feats / 9 talents). Existing policies: STUN_POLICY. Unresolved records: 0.

- Q: Define when nonlethal applies.

Examples:
- Brink of Death (FEAT `f4e8244a4c8bb9a0`, Legacy Era Campaign Guide p.35); tags nonlethal, damage; “When an attack would deal enough damage to kill a target, you may instead reduce that target to 0 hit points, leaving it unconscious but alive. Normal 0-hit-point rules then apply. Choose to leave a target unconscious at”
- Recruit Enemy (TALENT `43ac0c4b1759507a`, Rebellion Era Campaign Guide p.41); tags once-per-encounter, persuasion, social, skills, will_defense, mind-affecting, control, manipulation, nonlethal, target-designation, survivability, damage_threshold; “Once per encounter when you deal damage to a living creature that is equal to or greater than the target's current Hit Points and the target's Damage Threshold (that is, when you deal enough damage to kill the target), y”
- Nonlethal Tactics (TALENT `475fef43d75f3bff`, Force Unleashed Campaign Guide p.45); tags ranged, stun, nonlethal, precision, damage_bonus, sustained_damage; “When you are using a ranged weapon set to stun, stun grenades, nets, or stun batons, you gain a +1 bonus on your attack roll and deal +1 die of stun damage.”

## `offense_melee` — OWNER_DEFINITION_REQUIRED

Usage: 10 records (0 feats / 10 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when offense_melee applies.

Examples:
- Greater Penetrating Attack (TALENT `1718ec6cdf765a57`, Saga Edition Core Rulebook p.212); tags weapon_training, damage_reduction, melee, ranged, offense_melee, offense_ranged, targeting, sustained_damage; “Choose one exotic weapon or weapon group with which you are proficient. When you make a successful attack with the chosen weapon, treat the target's damage reduction as 10 points lower when determining the result of your”
- Droid Smash (TALENT `236bf4d940eb6b12`, Force Unleashed Campaign Guide p.103); tags melee, offense_melee, damage_bonus, scaling, ability_enhancement, sustained_damage; “You can use your mechanical strength when wielding a melee weapon. You add 2 x your Strength bonus to melee damage rolls when wielding a weapon in one hand.”

## `offense_ranged` — OWNER_DEFINITION_REQUIRED

Usage: 16 records (0 feats / 16 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when offense_ranged applies.

Examples:
- Greater Penetrating Attack (TALENT `1718ec6cdf765a57`, Saga Edition Core Rulebook p.212); tags weapon_training, damage_reduction, melee, ranged, offense_melee, offense_ranged, targeting, sustained_damage; “Choose one exotic weapon or weapon group with which you are proficient. When you make a successful attack with the chosen weapon, treat the target's damage reduction as 10 points lower when determining the result of your”
- Boarder (TALENT `34669d959223b187`, Force Unleashed Campaign Guide p.52); tags ranged, offense_ranged, cover, precision, space, targeting; “You are skilled at boarding hostile vessels. You ignore cover (but not improved cover) with your character-scale ranged attacks while aboard a Starship or space station.”

## `opposed_check` — OWNER_DEFINITION_REQUIRED

Usage: 25 records (0 feats / 25 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when opposed_check applies.

Examples:
- Blind Spot (TALENT `0be2881047fe9919`, Starships of the Galaxy p.17); tags vehicle, pilot, skills, swift_action, action_economy, opposed_check, mobility, positioning, precision, defense, evasion, targeting; “You can fly a vehicle you pilot so close to a target at least two sizes larger than your vehicle that it is difficult for the target to avoid or attack you. You must be adjacent to the target (at starship scale) to use t”
- Keep Them Reeling (TALENT `24bf81bc6d74fafd`, Rebellion Era Campaign Guide p.28); tags swift_action, action_economy, initiative, opposed_check, target-designation, ambush, precision, setup; “Once per turn as a swift action, you can make an Initiative check, opposed by the Initiative check of your prime target. If your check result equals or exceeds your prime target's check result, your target is flat-footed”

## `overwatch` — OWNER_DEFINITION_REQUIRED

Usage: 5 records (0 feats / 5 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `overwatch` applies. State whether records whose canonical text matches H.overwatch in the observed wording forms qualify.

Examples:
- Summon Aid (TALENT `107b66a6cc86e6d6`, Galaxy at War p.19); tags reaction, ally_support, support, teamwork, melee, mobility, positioning, action_economy, battlefield_control, overwatch; “Once per round, as a reaction, when an enemy moves adjacent to you, you can enable one ally within your line of sight to immediately make a charge attack against the triggering enemy. The ally you choose must be able to ”
- Extended Threat (TALENT `4699879601d8891c`, Unknown Regions p.30); tags ranged, attack_of_opportunity, positioning, battlefield_control, overwatch; “When using a ranged weapon eligible to make attacks of opportunity, you threaten all squares within a 2-square radius.”

## `perception` — PARTIALLY_OWNER_DEFINED

Usage: 51 records (12 feats / 39 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when perception applies.

Examples:
- Wary Sentries (FEAT `0053d97632b02e4a`, Galaxy at War p.30); tags teamwork, perception, awareness, scaling, reliability; “Gain +3 competence on Perception checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, take 10 on Perception checks even when ”
- Sharp Senses (FEAT `2357f4a68fe571fb`, Rebellion Era Campaign Guide p.35); tags perception, awareness, force_point_spend, resource_spend, force_multiplier; “Whenever you spend a Force Point to add to Perception, increase the die type by two steps (d6 to d10, or d8 to d12). Force Points added to Perception use a die two steps larger.”
- Improved Sleight of Hand (FEAT `58d3d0aece0f3bdc`, The Unknown Regions p.26); tags deception, stealth, concealment, swift_action, action_economy, equipment, perception; “Uses Deception as an additional opposed barrier when palming objects with Stealth and enables simultaneously drawing and palming a small weapon, with later swift-action re-palming.”
- Observant (TALENT `175c46931a9e474a`, Scavenger's Guide to Droids p.27); tags perception, persuasion, social, skills, reliability, action_economy; “You enhance your persuasiveness by applying data obtained through observation. Whenever you would fail a Persuasion check, you can roll a Perception check as a free action, with a DC equal to the DC of the Persuasion che”
- Search and Destroy (TALENT `1907d80212a12c68`, Galaxy at War p.31); tags move_action, action_economy, ally_support, support, teamwork, leadership, command, morale, perception, skills, recon, detection, awareness; “As a move action, you give all squad members a +2 morale bonus to Perception checks until the end of your next turn.”

## `persuasion` — PARTIALLY_OWNER_DEFINED

Usage: 73 records (12 feats / 61 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when persuasion applies.

Examples:
- Dreadful Countenance (FEAT `2e5ada2de01fff4d`, Behind the Threat: The Sith, Part 2 — The Becoming p.web-article-archived-rendering-page-4-of-4); tags persuasion, use_the_force, force, fear, reroll, reliability, social; “Whenever you make a Persuasion check or Use the Force check to activate a fear effect, you may reroll the check. You must accept the reroll result even if it is worse. Reroll Persuasion or Use the Force checks used to ac”
- Maniacal Charge (FEAT `4330126d10dccd71`, The Unknown Regions p.27); tags intimidation, persuasion, movement, mobility, attack_of_opportunity, ambush, setup, control, action_economy; “During a charge, a free-action Intimidate check can suppress attacks of opportunity from enemies passed and make the charge target flat-footed until the next turn.”
- Unwavering Resolve (FEAT `53f600d68f3afdc3`, Clone Wars Campaign Guide p.32); tags will_defense, defense, deception, persuasion, social; “Gain +5 insight to Will Defense against Deception and Persuasion checks. Gain +5 insight Will Defense against Deception and Persuasion.”
- Band Together (TALENT `03123bd5c86beaa0`, Unknown Regions p.19); tags ally_support, support, teamwork, leadership, target-designation, damage_bonus, will_defense, persuasion, social, mind-affecting, control, swift_action, action_economy, once-per-encounter, sustained_damage; “You can use each of the following actions once per encounter. Directed Attack: As a swift action, designate one enemy character or vehicle; until the end of your next turn, whenever an ally within 12 squares hits that ta”
- Protocol (TALENT `058898a456a9a8fb`, Force Unleashed Campaign Guide p.103); tags ally_support, support, teamwork, skills, deception, knowledge, persuasion, social, reliability; “You always succeed on attempts to aid another on Deception, Knowledge, and Persuasion checks (no check required).”

## `pilot` — PARTIALLY_OWNER_DEFINED

Usage: 51 records (7 feats / 44 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when pilot applies.

Examples:
- Vehicular Combat (FEAT `1f2f70d34a17667d`, Saga Edition Core Rulebook p.89); tags pilot, vehicle, reaction, action_economy, defense, evasion, weapon_training; “Once per round as a reaction while piloting a vehicle/starship, negate a weapon hit with Pilot vs the triggering attack roll. While piloting, count as proficient with pilot-operated vehicle weapons. Once per round, Pilot”
- Gunnery Specialist (FEAT `70962165bed8e5ed`, Clone Wars Campaign Guide p.31); tags vehicle, ranged, weapon_training, reroll, reliability, once-per-encounter, pilot; “While serving as a vehicle gunner, count as proficient with vehicle weapons. Once per encounter, reroll a vehicle-weapon attack after learning the result but before damage; keep the second result even if worse. This feat”
- Flawless Pilot (FEAT `87969fb8b12ff507`, Rebellion Era Campaign Guide p.33); tags pilot, vehicle, reroll, reliability; “Whenever you reroll a Pilot check, always keep the better result, even if multiple reroll abilities apply. Pilot rerolls always keep the better result.”
- Force Intuition (TALENT `00deb8b4cce303b6`, Saga Edition Core Rulebook p.40); tags force, use_the_force, initiative, skills, skill_substitution, reroll, reliability, vehicle, pilot; “You can use your Use the Force check modifier instead of your Initiative modifier when making Initiative checks. You are considered Trained in the Initiative skill. If you are entitled to an Initiative check reroll, you ”
- Watch This (TALENT `0b04910aaabc51ba`, Scum and Villainy p.26); tags vehicle, pilot, mobility, movement, positioning, evasion; “You can move into or through a space occupied by a vehicle of Colossal (frigate) size or larger without causing a collision. Additionally, if you pilot a Colossal or smaller vehicle, you can occupy the same space as a ve”

## `pistol` — PARTIALLY_OWNER_DEFINED

Usage: 17 records (1 feats / 16 talents). Existing policies: CLOSED_SCOPE_POLICY, OPEN_GENERIC_SCOPE_POLICY. Unresolved records: 3.

- Q: Define when `pistol` applies. State whether records whose canonical text matches O.pistol in the observed wording forms qualify.

Examples:
- Sport Hunter (FEAT `8778b4271420f789`, Galaxy at War p.25); tags ranged, weapon_training, damage_bonus, reroll, reliability, precision, targeting, setup; forms OTHER
- Disabler (FEAT `94023012303ad257`, Galaxy at War p.23); tags ranged, weapon_empowerment, precision, damage_bonus, battlefield_control, droid, vehicle; forms OTHER
- Blaster Turret I (TALENT `7b56d0b92582ae88`, Force Unleashed Campaign Guide p.57); tags crafting, tech, equipment, ranged, targeting, target-designation, once-per-encounter, standard_action, action_economy, sustained_damage; forms OTHER

## `planning` — OWNER_DEFINITION_REQUIRED

Usage: 5 records (0 feats / 5 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when planning applies.

Examples:
- Planetary Attunement (TALENT `1204459eaaff9efa`, Jedi Academy Training Manual p.75); tags force, force_point_spend, resource_spend, exploration, survival, nature, defense, mobility, senses, precognition, planning, action_economy; “Whenever you arrive on a new planet, you can spend 10 minutes and a Force Point to acclimate yourself to the planet's unique ebb and flow of Force energy. While on the planet, you gain a +2 Force bonus to all defenses ag”
- Turn the Tide (TALENT `4a3fdcd0f32062b2`, Unknown Regions p.31); tags tactics, knowledge, skills, initiative, control, battlefield_control, planning, once-per-encounter, reroll, ally_support, support, teamwork, reliability, action_economy; “Once per encounter, after the first round of combat, make a Knowledge (tactics) check as a full-round action and compare the result to the Will Defense of all enemies within 12 squares and line of sight. Affected enemies”

## `poison` — OWNER_DEFINITION_REQUIRED

Usage: 10 records (1 feats / 9 talents). Existing policies: none. Unresolved records: 1.

- Q: Define when `poison` applies. State whether records whose canonical text matches J.poison in the observed wording forms qualify.

Examples:
- Force Treatment (TALENT `181da7f36b9fba9d`, Saga Edition Core Rulebook p.214); tags force, use_the_force, treat_injury, medicine, medical, skills, skill_substitution, reroll, reliability, healing, recovery, support; forms OTHER

## `positioning` — PARTIALLY_OWNER_DEFINED

Usage: 217 records (33 feats / 184 talents). Existing policies: SPECIFIC_OVER_BROAD_POLICY. Unresolved records: 0.

- Q: Define when positioning applies.

Examples:
- Improved Charge (FEAT `0166fcdddc548545`, Saga Edition Core Rulebook p.85); tags movement, mobility, positioning; “Charge without moving in a straight line and change direction to avoid obstacles; all other charge rules still apply. Charge around obstacles instead of only in a straight line.”
- Battering Attack (FEAT `01dee6f32bbd8f85`, Galaxy at War p.22); tags melee, control, battlefield_control, movement, positioning; “Whenever Bantha Rush successfully moves a creature, also knock that creature prone. A successful Bantha Rush also knocks the moved target prone.”
- Point-Blank Shot (FEAT `05459ac4d439f229`, Saga Edition Core Rulebook p.87); tags ranged, precision, damage_bonus, positioning; “Gain +1 on ranged attack and damage rolls against targets within point-blank range. Gain +1 ranged attack and damage within point-blank range.”
- Oath of Duty (TALENT `001ae84d5862af55`, Legacy Era Campaign Guide p.45); tags ally-trigger, lightsaber, durability, survivability, scaling, positioning; “When an ally within 12 squares of you and within your line of sight hits with a lightsaber attack, you gain bonus hit points equal to 3 x your class level until the end of your next turn. Damage is subtracted from the bo”
- Friend or Foe (TALENT `014d291a6e16cc12`, Legacy Era Campaign Guide p.27); tags ally-trigger, reaction, action_economy, ranged, counterattack, control, positioning, evasion; “Whenever an ally within your line of sight is missed by a ranged attack, you can (as a reaction, once per turn) designate one enemy adjacent to that ally. Compare the attack roll of the missed attack to the Reflex Defens”

## `power_systems` — OWNER_DEFINITION_REQUIRED

Usage: 19 records (3 feats / 16 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when power_systems applies.

Examples:
- Mon Calamari Shipwright (FEAT `bb16070b5fdfccf4`, Rebellion Era Campaign Guide p.34); tags vehicle, mechanics, condition_removal, recovery, swift_action, action_economy, reliability, power_systems; “Spend only two swift actions to move a vehicle you occupy +1 step on the condition track. Automatically succeed on Mechanics checks to reroute power. Normally reroute power takes three swift actions. Reroute vehicle powe”
- Vehicle Systems Expertise (FEAT `d7736c072de9b86c`, Legacy Era Campaign Guide p.37); tags vehicle, mechanics, shields, power_systems, swift_action, action_economy, once-per-encounter, resource_recovery; “Recharge Shields or Reroute Power using two swift actions instead of three. Once per encounter, attempt either action as one swift action with a DC 30 Mechanics check. Recharge Shields or Reroute Power in two swift actio”
- Shield Surge (FEAT `e3b2b8360fb05d82`, Scavenger's Guide to Droids p.25); tags vehicle, shields, damage_reduction, durability, reaction, action_economy, resource_spend, power_systems; “As a reaction when your vehicle takes damage above its shield rating, after SR is reduced, reduce vehicle damage by up to the remaining SR. Immediately reduce SR one-for-one by the damage prevented. Recharge Shields cann”
- Weapons Power Surge (TALENT `09e7eeda16a7814f`, Scavenger's Guide to Droids p.27); tags droid, damage_bonus, burst_damage, once-per-encounter, action_economy, resource_spend, equipment, power_systems; “Once per encounter, as a free action, you can increase the damage dealt by one of your weapons by 1 or 2 damage dice in exchange for moving -1 step on the condition track for each die increased. The weapon must be perman”
- On-Board System Link (TALENT `31461ebe45c5f4c9`, Scavenger's Guide to Droids p.26); tags vehicle, tech, power_systems, shields, swift_action, action_economy; “While aboard a starship or vehicle and plugged into the ship's systems by scomp link, droid socket, or basic data port, you can reroute power or recharge shields as two swift actions instead of three.”

## `precision` — OWNER_DEFINITION_REQUIRED (broad)

Usage: 242 records (68 feats / 174 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `precision` applies. State whether records whose canonical text matches  in the observed wording forms qualify.

Examples:
- Spray Shot (FEAT `0066c394e5d636fb`, Clone Wars Campaign Guide p.31); tags ranged, targeting, precision; “When using a weapon set on autofire, you may reduce the targeted autofire area to 1 square. Reduce an autofire attack's area to a single square.”
- Flurry (FEAT `0536f81eff886234`, Knights of the Old Republic Campaign Guide p.33); tags melee, precision, defense; “While wielding only light weapons or lightsabers, take -5 Reflex Defense and gain +2 on melee attack rolls until the start of your next turn. May substitute for Point Blank Shot when qualifying for elite trooper. Trade -”
- Point-Blank Shot (FEAT `05459ac4d439f229`, Saga Edition Core Rulebook p.87); tags ranged, precision, damage_bonus, positioning; “Gain +1 on ranged attack and damage rolls against targets within point-blank range. Gain +1 ranged attack and damage within point-blank range.”
- Noble Fencing Style (TALENT `00c3231e4a4173fa`, Knights of the Old Republic Campaign Guide p.27); tags melee, precision, ability_enhancement, lightsaber; “This style of swordplay uses wit and force of personality to increase accuracy, taunting and distracting an opponent with feints, misdirection, and deception. When using a light melee weapon or a lightsaber that you are ”
- Weapon Shift (TALENT `032242fb87215e06`, Clone Wars Campaign Guide p.40); tags melee, ranged, precision, weapon_training; “If you use a Ranged Weapon as a Melee Weapon (as with the Gun Club Talent), you gain a +2 bonus to melee attack rolls with that Weapon.”

## `precision_damage` — OWNER_DEFINITION_REQUIRED

Usage: 7 records (0 feats / 7 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when precision_damage applies.

Examples:
- Sudden Strike (TALENT `08c80cfea1a3b886`, Scum and Villainy p.15); tags mobility, positioning, ambush, precision_damage, burst_damage, setup, sustained_damage; “Whenever you would gain the benefit of the Skirmisher talent and you successfully hit your opponent, you deal sneak attack damage in addition to the normal damage dealt by the attack.”
- Sneak Attack (TALENT `1505abc8babeeb84`, Saga Edition Core Rulebook p.46); tags melee, ranged, precision_damage, ambush, setup, damage_bonus, sustained_damage, scaling; “Any time your opponent is Flat-Footed or otherwise denied its Dexterity bonus to Reflex Defense, you deal an additional 1d6 points of damage with a successful melee or ranged attack. You must be within 6 squares of the t”

## `precognition` — OWNER_DEFINITION_REQUIRED

Usage: 15 records (0 feats / 15 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when precognition applies.

Examples:
- Temporal Awareness (TALENT `028e4e50565971ee`, Scum and Villainy p.26); tags force, visions, precognition, once-per-encounter, reaction, action_economy, mobility, movement, evasion; “Once per encounter, as a reaction to any enemy's attack, you can move up to your speed.”
- Guardian Spirit (TALENT `0b18181b971fc505`, Jedi Academy Training Manual p.16); tags force, search_your_feelings, visions, precognition, investigation, recon, use_the_force, resources, force_capacity, force_point_spend, resource_spend, force_power_synergy; “You have a guardian spirit watching over you from the realm of the Force, providing you with insight and advice. Your guardian spirit might be an old mentor or an ancient member of your Force tradition who has chosen to ”

## `pursuit` — OWNER_DEFINITION_REQUIRED

Usage: 30 records (0 feats / 30 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when pursuit applies.

Examples:
- Strike and Run (TALENT `119725589e32a35a`, Knights of the Old Republic Campaign Guide p.28); tags once-per-encounter, reaction, action_economy, melee, ranged, mobility, movement, positioning, pursuit; “Once per encounter, as a reaction after successfully damaging an opponent with a melee or ranged attack, you can move your speed.”
- Lingering Debilitation (TALENT `1250a3dac18104eb`, Unknown Regions p.31); tags ranged, control, battlefield_control, pursuit, once-per-encounter, treat_injury; “Once per encounter, when you successfully use Debilitating Shot to move a target character -1 step on the condition track, the target suffers a persistent condition requiring 4 hours of rest or a DC 25 Treat Injury check”

## `ranged` — PARTIALLY_OWNER_DEFINED

Usage: 272 records (54 feats / 218 talents). Existing policies: CLOSED_SCOPE_POLICY, OPEN_GENERIC_SCOPE_POLICY. Unresolved records: 7.

- Q: Define when `ranged` applies. State whether records whose canonical text matches O.ranged in the observed wording forms qualify.

Examples:
- Tool Frenzy (FEAT `203f7fa521105d0b`, Scavenger's Guide to Droids p.25); tags unarmed, melee, precision, standard_action, action_economy, defense; forms OTHER
- Dive for Cover (FEAT `2866d953b4b6245d`, Galaxy at War p.23); tags jump, reaction, action_economy, movement, mobility, cover, ranged_defense, evasion; forms OTHER
- Visionary Defense (TALENT `153f4b3c6510023d`, Knights of the Old Republic Campaign Guide p.25); tags force, force_power_synergy, visions, use_the_force, reaction, action_economy, ally_support, support, teamwork, defense, melee_defense, ranged_defense, will_defense, resource_spend; forms OTHER
- Praetoria Ishu (TALENT `16aa9efd54967320`, Legacy Era Campaign Guide p.45); tags force, use_the_force, block, deflect, lightsaber, melee_defense, ranged_defense, ally_support, support, teamwork, defense, positioning; forms OTHER
- Champion (TALENT `a7aea0411eb4fbc0`, Unknown Regions p.23); tags once-per-encounter, recovery, condition_removal, resilience, survivability, fear, mind-affecting, damage_threshold, control, melee, unarmed, burst_damage, scaling, precision, healing; forms OTHER

## `ranged_defense` — OWNER_DEFINITION_REQUIRED

Usage: 25 records (2 feats / 23 talents). Existing policies: none. Unresolved records: 1.

- Q: Define when `ranged_defense` applies. State whether records whose canonical text matches I.ranged_defense in the observed wording forms qualify.

Examples:
- Sniper Shot (FEAT `94fc90a53d747f84`, Knights of the Old Republic Campaign Guide p.35); tags ranged, precision, defense; forms OTHER

## `recon` — OWNER_DEFINITION_REQUIRED

Usage: 31 records (0 feats / 31 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when recon applies.

Examples:
- Guardian Spirit (TALENT `0b18181b971fc505`, Jedi Academy Training Manual p.16); tags force, search_your_feelings, visions, precognition, investigation, recon, use_the_force, resources, force_capacity, force_point_spend, resource_spend, force_power_synergy; “You have a guardian spirit watching over you from the realm of the Force, providing you with insight and advice. Your guardian spirit might be an old mentor or an ancient member of your Force tradition who has chosen to ”
- Search and Destroy (TALENT `1907d80212a12c68`, Galaxy at War p.31); tags move_action, action_economy, ally_support, support, teamwork, leadership, command, morale, perception, skills, recon, detection, awareness; “As a move action, you give all squad members a +2 morale bonus to Perception checks until the end of your next turn.”

## `recovery` — OWNER_DEFINITION_REQUIRED

Usage: 96 records (17 feats / 79 talents). Existing policies: none. Unresolved records: 5.

- Q: Define when `recovery` applies. State whether records whose canonical text matches J.recovery in the observed wording forms qualify.

Examples:
- Pinpoint Accuracy (FEAT `47c92eae6c1a0b84`, Scavenger's Guide to Droids p.24); tags ranged, precision, targeting, control; forms OTHER
- Aggressive Surge (TALENT `147f70a2b815f34e`, Rebellion Era Campaign Guide p.26); tags once-per-encounter, action_economy, mobility, movement, melee, burst_damage; forms OTHER
- Share Force Technique (TALENT `7d02251f13fd5645`, Jedi Academy Training Manual p.20); tags force, force_support, ally_support, support, teamwork, swift_action, action_economy, empowerment, use_the_force; forms OTHER
- Unstoppable (TALENT `9c0c0966b7c7c30e`, Knights of the Old Republic Campaign Guide p.45); tags once-per-encounter, defense, resilience, survivability, damage_threshold; forms OTHER
- Rising Panic (TALENT `d091b5f6b34b4967`, Unknown Regions p.33); tags force, use_the_force, force_offense, reaction, action_economy, ally-trigger, control, battlefield_control, fear, mind-affecting, will_defense; forms OTHER

## `repair` — OWNER_DEFINITION_REQUIRED

Usage: 14 records (2 feats / 12 talents). Existing policies: none. Unresolved records: 4.

- Q: Define when `repair` applies. State whether records whose canonical text matches J.repair in the observed wording forms qualify.

Examples:
- Power Surge (TALENT `77d09ca0a54f4c36`, Force Unleashed Campaign Guide p.48); tags droid, power_systems, swift_action, action_economy, melee, offense_melee, precision, damage_bonus, sustained_damage, mobility, movement, scaling, setup, mechanics; forms OTHER
- Preserving Shot (TALENT `a594f0b9ff786a6c`, Force Unleashed Campaign Guide p.52); tags vehicle, ranged, offense_ranged, nonlethal, damage_threshold, control, battlefield_control, movement, power_systems, targeting, mechanics; forms OTHER
- Hotwired Processor (TALENT `e9a5fe40ce95a053`, Force Unleashed Campaign Guide p.47); tags droid, tech, ability_enhancement, skills, ranged, precision, swift_action, action_economy, scaling, sustained_damage, mechanics; forms OTHER
- Power Boost (TALENT `eb503c1c3fb945a6`, Scavenger's Guide to Droids p.28); tags droid, power_systems, mobility, movement, scaling, setup, mechanics; forms OTHER

## `resilience` — OWNER_DEFINITION_REQUIRED

Usage: 96 records (30 feats / 66 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when resilience applies.

Examples:
- Galactic Alliance Military Training (FEAT `03593bdccdd70fa2`, Legacy Era Campaign Guide p.36); tags damage_threshold, resilience, survivability, once-per-encounter; “The first time in an encounter that an attack exceeds your damage threshold, you do not move down the condition track. Ignore the condition-track movement from the first attack each encounter that exceeds your damage thr”
- Increased Resistance (FEAT `0365722a629eed1f`, Rebellion Era Campaign Guide p.34); tags defense, resilience, survivability; “Whenever an attack or skill check targets Fortitude Defense and fails to equal or exceed it, gain +2 circumstance Fortitude until the start of your next turn. After an enemy fails against your Fortitude Defense, gain +2 ”
- Scion of Dorin (FEAT `08a15012d82f0d16`, Rebellion Era Campaign Guide p.35); tags defense, resilience, nature; “Gain +5 species Fortitude Defense against all natural hazards. Gain +5 species Fortitude against natural hazards.”
- Soft to Solid (TALENT `004732cba6bfa4a7`, Jedi Academy Training Manual p.81); tags force, reaction, action_economy, force_point_spend, resource_spend, damage_reduction, defense, resilience, survivability; “As a reaction when you are damaged by an attack, you can spend a Force Point to increase the rigidity of your skin, gaining DR 10 until the end of your next turn.”
- Unreadable (TALENT `01bcee2365b82ce6`, Scum and Villainy p.14); tags will_defense, defense, resilience, social, deception, feint, ambush, setup; “You gain a +5 bonus to your Will Defense against skill checks made to read your emotions and influence your attitude. In addition, whenever you successfully feint a target in combat, that target is flat-footed against al”

## `resources` — OWNER_DEFINITION_REQUIRED (broad)

Usage: 60 records (14 feats / 46 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `resources` applies. State whether records whose canonical text matches  in the observed wording forms qualify.

Examples:
- Channel Rage (FEAT `14f0d916e9228368`, Galaxy of Intrigue p.25); tags defense, will_defense, resilience, resource_spend, resources; “Once per day, instead of entering rage, gain +5 Will Defense until the end of the encounter. Using this benefit counts as using your rage ability for that day. Once per day, spend your Rage use to gain +5 Will Defense fo”
- Starship Tactics (FEAT `376d805d1b73f7e6`, Starships of the Galaxy p.20); tags vehicle, space, tactics, resources, scaling; “Add starship maneuvers equal to 1 + Wisdom modifier, minimum 1. The same maneuver may be added more than once. The feat is repeatable; each copy grants another 1 + Wisdom modifier maneuvers, minimum 1. If Wisdom modifier”
- Extra Second Wind (FEAT `4e57ee834c301ad8`, Saga Edition Core Rulebook p.85); tags recovery, healing, resources, scaling; “Gain one additional second wind per day, while retaining the normal one-second-wind-per-encounter limit. A nonheroic character taking this feat for the first time gains one second wind per day. Repeatable; each selection”
- Illicit Dealings (TALENT `0681e1ea8e72f362`, Force Unleashed Campaign Guide p.27); tags persuasion, social, skills, resources, reroll, reliability; “Smugglers have a knack for locating and negotiating illicit deals. When using Persuasion to haggle for restricted, military, or illegal goods you may roll twice, keeping the better result.”
- Guardian Spirit (TALENT `0b18181b971fc505`, Jedi Academy Training Manual p.16); tags force, search_your_feelings, visions, precognition, investigation, recon, use_the_force, resources, force_capacity, force_point_spend, resource_spend, force_power_synergy; “You have a guardian spirit watching over you from the realm of the Force, providing you with insight and advice. Your guardian spirit might be an old mentor or an ancient member of your Force tradition who has chosen to ”

## `ride` — PARTIALLY_OWNER_DEFINED

Usage: 11 records (5 feats / 6 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when ride applies.

Examples:
- Mounted Regiment (FEAT `0e9aa3d941f4eb80`, Galaxy at War p.29); tags teamwork, ride, mount, rider, beast, defense, reaction, action_economy, scaling; “Gain +3 competence on Ride checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, once per round as a reaction when your mount ”
- Mounted Defense (FEAT `acb7efcc70769b9f`, Threats of the Galaxy p.127); tags mount, ride, rider, beast, vehicle, defense, evasion, once-per-encounter; “While riding a beast or speeder bike, as passenger or pilot, once per encounter redirect an attack made against you to the mount or vehicle. Choose to redirect after the attack roll result is known but before damage or o”
- Mounted Combat (FEAT `af5caa92d8fc0e3a`, The Unknown Regions p.27); tags mount, ride, rider, beast, movement, mobility, swift_action, reaction, action_economy, defense, evasion, endurance; “Uses Ride to boost a living mount's speed as a swift action and, once per round as a reaction, can negate a weapon hit against rider or mount with a successful Ride check.”
- Directed Action (TALENT `3a34ce2ef55c41b1`, Scavenger's Guide to Droids p.28); tags droid, standard_action, action_economy, ally_support, support, teamwork, skills, ability_enhancement, command, deception, mechanics, persuasion, pilot, ride, treat_injury, use_computer; “As a standard action, you allow one droid that can hear and understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a free action. The droid can replace ”
- Terrain Guidance (TALENT `598c2b9b9bb1136f`, Unknown Regions p.22); tags mount, ride, rider, mobility, exploration, skills, swift_action, action_economy; “When in control of your mount, you can make a DC 20 Ride check as a swift action to negate the effect of difficult terrain on your mount's speed.”

## `rider` — OWNER_DEFINITION_REQUIRED

Usage: 10 records (5 feats / 5 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when rider applies.

Examples:
- Mounted Regiment (FEAT `0e9aa3d941f4eb80`, Galaxy at War p.29); tags teamwork, ride, mount, rider, beast, defense, reaction, action_economy, scaling; “Gain +3 competence on Ride checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, once per round as a reaction when your mount ”
- Mounted Defense (FEAT `acb7efcc70769b9f`, Threats of the Galaxy p.127); tags mount, ride, rider, beast, vehicle, defense, evasion, once-per-encounter; “While riding a beast or speeder bike, as passenger or pilot, once per encounter redirect an attack made against you to the mount or vehicle. Choose to redirect after the attack roll result is known but before damage or o”
- Mounted Combat (FEAT `af5caa92d8fc0e3a`, The Unknown Regions p.27); tags mount, ride, rider, beast, movement, mobility, swift_action, reaction, action_economy, defense, evasion, endurance; “Uses Ride to boost a living mount's speed as a swift action and, once per round as a reaction, can negate a weapon hit against rider or mount with a successful Ride check.”
- Terrain Guidance (TALENT `598c2b9b9bb1136f`, Unknown Regions p.22); tags mount, ride, rider, mobility, exploration, skills, swift_action, action_economy; “When in control of your mount, you can make a DC 20 Ride check as a swift action to negate the effect of difficult terrain on your mount's speed.”
- Command Beast (TALENT `6f158211516da82a`, Saga Edition Core Rulebook p.107); tags beast, nature, control, mount, ride, rider; “Whenever you manage to shift the attitude of a beast to indifferent or friendly, you may treat that creature as a domesticated animal, but for you only. Additionally, you may use this beast as a mount, provided it is at ”

## `scaling` — OWNER_DEFINITION_REQUIRED

Usage: 192 records (31 feats / 161 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when scaling applies.

Examples:
- Wary Sentries (FEAT `0053d97632b02e4a`, Galaxy at War p.30); tags teamwork, perception, awareness, scaling, reliability; “Gain +3 competence on Perception checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, take 10 on Perception checks even when ”
- Expert Droid Repair (FEAT `029c3935e9bed6eb`, Clone Wars Campaign Guide p.29); tags droid, mechanics, repair, tech, scaling; “Repair a number of droids simultaneously equal to your Intelligence bonus. Make Mechanics checks separately for each droid as normal. Unlike Experienced Medic, the printed feat text does not state a minimum of 2. Repair ”
- Mounted Regiment (FEAT `0e9aa3d941f4eb80`, Galaxy at War p.29); tags teamwork, ride, mount, rider, beast, defense, reaction, action_economy, scaling; “Gain +3 competence on Ride checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, once per round as a reaction when your mount ”
- Oath of Duty (TALENT `001ae84d5862af55`, Legacy Era Campaign Guide p.45); tags ally-trigger, lightsaber, durability, survivability, scaling, positioning; “When an ally within 12 squares of you and within your line of sight hits with a lightsaber attack, you gain bonus hit points equal to 3 x your class level until the end of your next turn. Damage is subtracted from the bo”
- Reverse Strength (TALENT `002c2d4fd8383a3e`, Galaxy of Intrigue p.23); tags grapple, control, battlefield_control, melee, unarmed, damage, scaling; “You know how to use an opponent's strength against it. Whenever you successfully grapple an opponent, you deal damage equal to the opponent's Strength modifier (minimum 1 point).”

## `science` — OWNER_DEFINITION_REQUIRED

Usage: 8 records (1 feats / 7 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when science applies.

Examples:
- Nature Specialist (FEAT `f965ca153bb13aaf`, Rebellion Era Campaign Guide p.34); tags knowledge, science, nature, force_point_spend, resource_spend, force_multiplier; “Whenever you spend a Force Point to add to Knowledge (Life Sciences), increase the die type by two steps (d6 to d10, or d8 to d12). Force Points added to Knowledge (Life Sciences) use a die two steps larger.”
- Modify Poison (TALENT `661899f73e20f2ce`, Threats of the Galaxy p.13); tags poison, medical, science, knowledge, skills, modification, crafting; “You can modify the delivery method of a poison (contact, ingested, inhaled, injury) to another delivery method by succeeding on a Knowledge (life sciences) check (DC equal to the poison's Treat Injury DC). The poison's c”
- Science Analyzer (TALENT `739397eded522cd8`, Scavenger's Guide to Droids p.26); tags knowledge, science, skills, ability_enhancement; “You use your extensive databanks to better analyze scientific data. You can add double your Intelligence modifier to your Knowledge (life sciences) or Knowledge (physical sciences) skill check.”

## `search_your_feelings` — OWNER_DEFINITION_REQUIRED

Usage: 5 records (0 feats / 5 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when search_your_feelings applies.

Examples:
- Guardian Spirit (TALENT `0b18181b971fc505`, Jedi Academy Training Manual p.16); tags force, search_your_feelings, visions, precognition, investigation, recon, use_the_force, resources, force_capacity, force_point_spend, resource_spend, force_power_synergy; “You have a guardian spirit watching over you from the realm of the Force, providing you with insight and advice. Your guardian spirit might be an old mentor or an ancient member of your Force tradition who has chosen to ”
- Reading the Flame (TALENT `12f61917f809a3fb`, Legacy Era Campaign Guide p.59); tags force, force_power_synergy, use_the_force, visions, search_your_feelings, precognition, meditation, reroll, reliability; “You can enter a trance by staring into a flame of any size, gaining insight into the workings of the galaxy by meditating on the flame's movement. Whenever you use the farseeing power or the Search Your Feelings applicat”

## `self_repair` — OWNER_DEFINITION_REQUIRED

Usage: 3 records (0 feats / 3 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when self_repair applies.

Examples:
- Repair Self (TALENT `177198e388ad4e3ca6fe85d3b6b399f5`, Force Unleashed Campaign Guide p.47); tags droid, mechanics, tech, skills, self_repair, repair, healing, recovery, durability, survivability, scaling; “When you repair yourself (using the repair droid application of the Mechanics skill), you repair 1 additional hit point for each point by which your check exceeds the DC.”
- Soft Reset (TALENT `2739921a657a49a496885c456bcace65`, Force Unleashed Campaign Guide p.47); tags droid, self_repair, recovery, condition_removal, durability, resilience, survivability, damage_threshold; “You are adept at rerouting your internal electronics. If you are moved to the bottom of the condition track by any means other than taking damage exceeding your damage threshold, you automatically move +1 step along the ”

## `senses` — OWNER_DEFINITION_REQUIRED

Usage: 23 records (2 feats / 21 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when senses applies.

Examples:
- Keen Scent (FEAT `46d70ac7db6872f6`, Rebellion Era Campaign Guide p.34); tags senses, detection, awareness; “The range of your Scent ability increases to 20 squares. Your Scent ability has a range of 20 squares.”
- Deep Sight (FEAT `e4de79f4993a6690`, Rebellion Era Campaign Guide p.31); tags senses, detection, concealment, awareness; “Gain darkvision and ignore concealment, including total concealment, from darkness. You cannot perceive colors in total darkness. Gain darkvision that ignores darkness concealment, but you cannot see color in total darkn”
- Planetary Attunement (TALENT `1204459eaaff9efa`, Jedi Academy Training Manual p.75); tags force, force_point_spend, resource_spend, exploration, survival, nature, defense, mobility, senses, precognition, planning, action_economy; “Whenever you arrive on a new planet, you can spend 10 minutes and a Force Point to acclimate yourself to the planet's unique ebb and flow of Force energy. While on the planet, you gain a +2 Force bonus to all defenses ag”
- Heightened Awareness (TALENT `2db9534917366b8d`, Clone Wars Campaign Guide p.53); tags force, perception, skills, senses, awareness, force_point_spend, resource_spend, ability_enhancement, scaling; “You can spend a Force Point to add your Charisma bonus to your Perception check. You can select this talent multiple times. Each time you select this talent, you add your Charisma bonus an additional time.”

## `sensors` — OWNER_DEFINITION_REQUIRED

Usage: 10 records (2 feats / 8 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when sensors applies.

Examples:
- Superior Tech (FEAT `a717435c8094e7fb`, Scum and Villainy p.24); tags tech, mechanics, modification, equipment, armor, droid, vehicle, ability_enhancement, durability, defense, perception, skills, sensors, shields, mobility, weapon_empowerment, precision, damage_bonus; “Choose one category: armor, weapons, droids, vehicles, or devices; install advanced traits for that category in place of normal Tech Specialist traits. Pay one-fifth item cost or 2,000 credits, whichever is greater; work”
- Sensor Link (FEAT `e95252c02d2ae129`, Scavenger's Guide to Droids p.24); tags sensors, perception, network, ally_support, support, swift_action, action_economy, awareness; “As a swift action, broadcast audio, visual, and special sensor input to a droid ally, comlink, communications system, or holographic receiver within 24 squares. The ally knows what you know and may Aid Another on your Pe”
- Vehicle Sneak (TALENT `0c5026168620dbae`, Knights of the Old Republic Campaign Guide p.29); tags vehicle, pilot, stealth, skills, infiltration, concealment, space, sensors, evasion; “You know how to fly and operate your vehicle in order to hide its approach visually, decrease the noise it produces, and minimize its sensor signature. Treat your ship as two size categories smaller when attempting Steal”
- Force Cloak (TALENT `2c18952e0c014127`, Saga Edition Core Rulebook p.107); tags force, swift_action, action_economy, concealment, stealth, infiltration, tech, sensors, network; “As a swift action, you can surround yourself with an invisible bubble of Force power that shields you and anything you're carrying from electronic surveillance. The bubble also blocks all electronic sensors and communica”

## `setup` — OWNER_DEFINITION_REQUIRED (broad)

Usage: 177 records (28 feats / 149 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `setup` applies. State whether records whose canonical text matches  in the observed wording forms qualify.

Examples:
- K'tara Training (FEAT `1dfbddf5f1aa57c3`, Galaxy at War p.27); tags martial_arts, unarmed, melee, ambush, damage_bonus, stun, control, once-per-encounter, swift_action, action_economy, setup; “One unarmed attack during your turn deals +1 damage die against a flat-footed enemy. Once per encounter after unarmed damage to a target denied Dexterity to Reflex, make a free unarmed attack vs Fortitude; on success, ta”
- Close Combat Escape (FEAT `1ec2b64343aca60e`, Scum and Villainy p.21); tags acrobatics, grapple, evasion, swift_action, action_economy, melee, unarmed, setup, control; “After successfully using Acrobatics to escape a grapple, spend a swift action to make one melee or unarmed attack against the former grappler. On a hit, deal normal damage and the opponent is flat-footed until the start ”
- Relentless Attack (FEAT `30cb2abcd11bf1bd`, Jedi Academy Training Manual p.23); tags reliability, precision, targeting, setup; “Choose one weapon group or exotic weapon for which you have Double Attack. After missing a target with that weapon, gain +2 competence on your next attack against that same target made before the end of your next turn. R”
- Unreadable (TALENT `01bcee2365b82ce6`, Scum and Villainy p.14); tags will_defense, defense, resilience, social, deception, feint, ambush, setup; “You gain a +5 bonus to your Will Defense against skill checks made to read your emotions and influence your attitude. In addition, whenever you successfully feint a target in combat, that target is flat-footed against al”
- Victorious Force Mastery (TALENT `0742d901c13ea130`, Clone Wars Campaign Guide p.56); tags force, force_capacity, resource_recovery, recovery, action_economy, setup; “Whenever an enemy you have damaged in this encounter is reduced to 0 Hit Points, you may automatically return one spent Force Power to your Force Power Suite as a Free Action.”

## `shields` — OWNER_DEFINITION_REQUIRED

Usage: 17 records (6 feats / 11 talents). Existing policies: none. Unresolved records: 4.

- Q: Define when `shields` applies. State whether records whose canonical text matches M.shields in the observed wording forms qualify.

Examples:
- Force Cloak (TALENT `2c18952e0c014127`, Saga Edition Core Rulebook p.107); tags force, swift_action, action_economy, concealment, stealth, infiltration, tech, sensors, network; forms OTHER
- Dedicated Guardian (TALENT `562148487d7aa43c`, Galaxy of Intrigue p.24); tags ally_support, ally-trigger, support, teamwork, defense, evasion, damage_reduction, flanking, positioning, melee, reaction, swift_action, action_economy, once-per-encounter, survivability; forms OTHER
- Fortified Body (TALENT `6714ab8e28708f50`, Saga Edition Core Rulebook p.214); tags force, defense, resilience, survivability, poison, medical; forms OTHER
- Harm's Way (TALENT `fde8157b6d097e12`, Saga Edition Core Rulebook p.52); tags swift_action, action_economy, ally_support, support, teamwork, defense, survivability, positioning; forms OTHER

## `skill_mastery` — OWNER_DEFINITION_REQUIRED

Usage: 19 records (2 feats / 17 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when skill_mastery applies.

Examples:
- Quick Skill (FEAT `95020f2ce5ad0e88`, Knights of the Old Republic Campaign Guide p.34); tags skills, skill_mastery, reliability, once-per-encounter; “Once per encounter, either Take 10 when rushed on one trained skill check unless that skill forbids it, or Take 20 on one trained skill in half the normal time. Taking 20 normally requires 20 times the normal check time.”
- Feat of Strength (FEAT `9af3ba38a2c671b8`, Legacy Era Campaign Guide p.35); tags skills, skill_mastery, reliability, once-per-encounter, climb, jump, swim, endurance, action_economy; “Once per encounter as a full-round action, Take 20 on one Strength check or a Strength-based skill check in which you are trained, even while distracted or threatened. After the first use in an encounter, make a DC 15 En”
- Skill Confidence (TALENT `07cd591fb8dccb39`, Galaxy of Intrigue p.21); tags skills, skill_mastery, critical_success, durability, scaling, action_economy, setup; “When you select this talent, choose one skill. Whenever you roll a natural 19 or a natural 20 on a skill check with that skill, you gain the benefits of the Critical Skill Success talent and also gain bonus hit points eq”
- Skill Boon (TALENT `1cbf8a40f7972aa4`, Galaxy of Intrigue p.21); tags skills, skill_mastery, force-point, force_point_spend, resource_spend, force_multiplier, scaling; “When you select this talent, choose one skill. Whenever you spend a Force Point to add to that skill, increase the die type of your Force Point by one step (i.e. from d6 to d8, d8 to d10, or d10 to d12), to a maximum of ”

## `skill_substitution` — OWNER_DEFINITION_REQUIRED

Usage: 38 records (7 feats / 31 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when skill_substitution applies.

Examples:
- Disturbing Presence (FEAT `25ba21b021086a71`, Galaxy of Intrigue p.27); tags deception, acrobatics, skill_substitution, movement, mobility, attack_of_opportunity, evasion, infiltration; “DC 15 Deception allows movement through an enemy's threatened area or fighting space without provoking. Each threatened or occupied square traversed this way costs 2 squares of movement. DC 15 Deception lets you move thr”
- Cut the Red Tape (FEAT `2bb34366776f0371`, Galaxy of Intrigue p.27); tags knowledge, gather_information, skill_substitution, skills, reroll, reliability; “Use Knowledge (Bureaucracy) modifier in place of Gather Information. If entitled to a Gather Information reroll, reroll the substituted Knowledge check under the same restrictions. Count as trained in Gather Information ”
- Elder's Knowledge (FEAT `6ba02f4dd4c3bfe5`, The Unknown Regions p.24); tags knowledge, galactic_lore, skill_substitution, skills, once-per-encounter, perception, survival, treat_injury; “Once per encounter substitutes Knowledge (social sciences) or Knowledge (galactic lore) for a Wisdom or Wisdom-related check.”
- Force Intuition (TALENT `00deb8b4cce303b6`, Saga Edition Core Rulebook p.40); tags force, use_the_force, initiative, skills, skill_substitution, reroll, reliability, vehicle, pilot; “You can use your Use the Force check modifier instead of your Initiative modifier when making Initiative checks. You are considered Trained in the Initiative skill. If you are entitled to an Initiative check reroll, you ”
- Insight of the Force (TALENT `0adc25cfaa35147a`, Clone Wars Campaign Guide p.41); tags force, use_the_force, knowledge, skills, skill_substitution, reroll, reliability; “You can make a Use the Force check in place of a Knowledge check for any Knowledge skill you are not Trained in. You are considered Trained in that Knowledge skill for the purposes of using this Talent. If you are entitl”

## `skills` — OWNER_DEFINITION_REQUIRED

Usage: 320 records (39 feats / 281 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when skills applies.

Examples:
- Unwavering Focus (FEAT `0214e9586b6c8bb5`, Rebellion Era Campaign Guide p.36); tags mind-affecting, will_defense, defense, reaction, action_economy, skills; “When targeted by a mind-affecting effect requiring a skill check against Will Defense, as a reaction impose -2 on that skill check. React to a mind-affecting skill check against your Will by imposing -2 on the check.”
- Conditioning (FEAT `0ac76f1c0c1677cb`, Knights of the Old Republic Campaign Guide p.32); tags reroll, reliability, skills, defense, reaction, action_economy, once-per-encounter, resilience, climb, jump, swim, endurance; “Reroll any Strength- or Constitution-based skill check for a skill in which you are trained; accept the second result. Once per encounter as a reaction, add your Strength bonus to Fortitude Defense until the beginning of”
- Skill Focus (FEAT `1592aaedf4b6e40a`, Saga Edition Core Rulebook p.88); tags skills; “Choose one trained skill and gain +5 competence on checks with it. Repeatable for a different trained skill; effects do not stack on the same skill. Choose a trained skill for +5 competence; repeatable for different skil”
- Supervising Droid (TALENT `0025737e7198390e`, Scavenger's Guide to Droids p.27); tags droid, ally_support, support, teamwork, skills, standard_action, swift_action, action_economy, once-per-encounter, reliability; “You are programmed to oversee other droids. You can use each of the following actions once per encounter: • Combat Support: As a standard action, you automatically aid another on an allied droid's attack roll, provided y”
- Force Intuition (TALENT `00deb8b4cce303b6`, Saga Edition Core Rulebook p.40); tags force, use_the_force, initiative, skills, skill_substitution, reroll, reliability, vehicle, pilot; “You can use your Use the Force check modifier instead of your Initiative modifier when making Initiative checks. You are considered Trained in the Initiative skill. If you are entitled to an Initiative check reroll, you ”

## `slicing` — OWNER_DEFINITION_REQUIRED

Usage: 11 records (1 feats / 10 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when slicing applies.

Examples:
- Slicer Team (FEAT `77c897590b4000f6`, Galaxy at War p.29); tags teamwork, use_computer, skills, scaling, ally_support, support, tech, slicing; “Gain +3 competence on Use Computer checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, when using Aid Another to assist an a”
- Electronic Sabotage (TALENT `0290634450ab1637`, Force Unleashed Campaign Guide p.27); tags use_computer, slicing, tech, skills, standard_action, action_economy, control, network, infiltration; “You excel at causing havoc with computers and electronics. As a standard action, you can lock down a computer terminal by making a Use Computer check, making it potentially difficult for anyone else to access. That compu”
- Electronic Forgery (TALENT `319c5ded54dbc4e6`, Force Unleashed Campaign Guide p.27); tags use_computer, tech, slicing, skills, deception, social, skill_substitution, infiltration; “You can use your Use Computer modifier in place of your Deception modifier to create a deceptive appearance with forged electronic documents.”

## `sniper` — OWNER_DEFINITION_REQUIRED

Usage: 16 records (3 feats / 13 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when sniper applies.

Examples:
- Sniper (FEAT `56367f3943ee8c17`, Saga Edition Core Rulebook p.88); tags ranged, sniper, cover, precision, targeting; “Always ignore soft cover from characters, creatures, or droids on ranged attacks. Ignore creature-provided soft cover with ranged attacks.”
- Deadeye (FEAT `6e47c132fbedde08`, Saga Edition Core Rulebook p.84); tags ranged, targeting, setup, damage_bonus, precision, sniper; “After aiming, a successful ranged attack deals +1 weapon die. Does not stack with Burst Fire or Rapid Shot extra damage. Aim before a ranged hit to deal +1 weapon die; does not stack with Burst Fire or Rapid Shot.”
- Deadly Sniper (FEAT `6fb0f56dd9b9b75c`, Scum and Villainy p.21); tags ranged, sniper, ambush, precision, damage_bonus, sustained_damage; “Detailed Benefit: when making a ranged attack against a target unaware of you, gain +2 attack and +1 die damage on the first attack each turn. The printed summary table differs in wording and does not cleanly preserve th”
- Sniping Master (TALENT `216f5ea65b7c04fb`, Scum and Villainy p.29); tags ranged, sniper, swift_action, action_economy, targeting, setup; “By taking only a single swift action, you can aim at a target that is not within point blank range.”
- Sniping Marksman (TALENT `28b781d7186a03a9`, Scum and Villainy p.29); tags once-per-encounter, ranged, sniper, armor, precision, targeting; “Once per encounter, when you make a ranged attack against a target that is not at point blank range, you can ignore your target's armor bonus to Reflex Defense.”

## `social` — OWNER_DEFINITION_REQUIRED

Usage: 111 records (17 feats / 94 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when social applies.

Examples:
- Confident Success (FEAT `139a80972fc3b8ee`, Rebellion Era Campaign Guide p.31); tags gather_information, investigation, social, force-point, resource_recovery; “Whenever you successfully use Gather Information to Learn Secret Information, gain 1 Force Point. You can gain no more than 3 Force Points per level this way, and cannot hold more Force Points than you gained upon reachi”
- Impersonate (FEAT `2def724bf673c2fc`, Scum and Villainy p.23); tags deception, social, infiltration, manipulation; “Use Deception to alter your features to a specific person and change your voice to match. Always treat impersonating a specific person as a Moderate Deception. Use Shapeshift and Deception to impersonate a specific perso”
- Dreadful Countenance (FEAT `2e5ada2de01fff4d`, Behind the Threat: The Sith, Part 2 — The Becoming p.web-article-archived-rendering-page-4-of-4); tags persuasion, use_the_force, force, fear, reroll, reliability, social; “Whenever you make a Persuasion check or Use the Force check to activate a fear effect, you may reroll the check. You must accept the reroll result even if it is worse. Reroll Persuasion or Use the Force checks used to ac”
- Unreadable (TALENT `01bcee2365b82ce6`, Scum and Villainy p.14); tags will_defense, defense, resilience, social, deception, feint, ambush, setup; “You gain a +5 bonus to your Will Defense against skill checks made to read your emotions and influence your attitude. In addition, whenever you successfully feint a target in combat, that target is flat-footed against al”
- Band Together (TALENT `03123bd5c86beaa0`, Unknown Regions p.19); tags ally_support, support, teamwork, leadership, target-designation, damage_bonus, will_defense, persuasion, social, mind-affecting, control, swift_action, action_economy, once-per-encounter, sustained_damage; “You can use each of the following actions once per encounter. Directed Attack: As a swift action, designate one enemy character or vehicle; until the end of your next turn, whenever an ally within 12 squares hits that ta”

## `social_network` — OWNER_DEFINITION_REQUIRED

Usage: 14 records (2 feats / 12 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when social_network applies.

Examples:
- Natural Leader (FEAT `d41076e442832c3e`, The Force Unleashed Campaign Guide p.34); tags leadership, social_network, resources, scaling; “Become leader of an organization of your design. Organization scale equals one-half heroic level plus Charisma bonus. Begin with +10 organization score for the new organization. Found an organization with scale based on ”
- Officer Candidacy Training (FEAT `d976f03c298fb1be`, Galaxy at War p.25); tags leadership, social_network, social; “Gain +2 to Rank and Privilege organization score. Gain +2 Rank and Privilege organization score.”
- Jedi Network (TALENT `251462d5e3aaa4ce`, Legacy Era Campaign Guide p.42); tags social_network, resources, equipment, investigation, healing, medical, infiltration, ally_support, support, teamwork, reliability, gather_information; “You have access to a network of Jedi sympathizers. While in a civilized area, you can call upon this network of allies once per game session for one of the following purposes: Acquire Equipment or Funds: You can use your”
- Detective (TALENT `27dd504c877a4de5`, Galaxy of Intrigue p.24); tags investigation, tracking, pursuit, skills, social, social_network, resources, gather_information; “You are skilled in locating individuals and using research and surveillance to learn some of their most intimate secrets. When you make a Gather Information check to locate an individual, the DC is reduced by 10, and the”

## `space` — OWNER_DEFINITION_REQUIRED

Usage: 22 records (4 feats / 18 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `space` applies. State whether records whose canonical text matches M.space in the observed wording forms qualify.

Examples:
- Starship Tactics (FEAT `376d805d1b73f7e6`, Starships of the Galaxy p.20); tags vehicle, space, tactics, resources, scaling; “Add starship maneuvers equal to 1 + Wisdom modifier, minimum 1. The same maneuver may be added more than once. The feat is repeatable; each copy grants another 1 + Wisdom modifier maneuvers, minimum 1. If Wisdom modifier”
- Veteran Spacer (FEAT `423c5fffe7abe449`, Rebellion Era Campaign Guide p.36); tags use_computer, space, vehicle, exploration, skills; “Gain +5 species bonus to Use Computer checks made to perform astrogation aboard a starship. Gain +5 species to Use Computer checks for starship astrogation.”
- Hyperblazer (FEAT `cab4954728195119`, The Unknown Regions p.26); tags use_computer, space, exploration, skills; “Halves astrogation calculation time and Use Computer penalties in the hyperspace tangle and halves time to map new hyperspace routes.”
- Armored Spacer (TALENT `0bf26c4fb8622e0b`, Force Unleashed Campaign Guide p.52); tags armor, equipment, space, survivability; “You can use armored spacesuits as if you had the Armor Proficiency (heavy) feat.”
- Vehicle Sneak (TALENT `0c5026168620dbae`, Knights of the Old Republic Campaign Guide p.29); tags vehicle, pilot, stealth, skills, infiltration, concealment, space, sensors, evasion; “You know how to fly and operate your vehicle in order to hide its approach visually, decrease the noise it produces, and minimize its sensor signature. Treat your ship as two size categories smaller when attempting Steal”

## `spellcasting` — OWNER_DEFINITION_REQUIRED

Usage: 1 records (0 feats / 1 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when spellcasting applies.

Examples:
- Adept Spellcaster (TALENT `12b7eb5d32bd440e`, Saga Edition Core Rulebook p.107); tags force, force_power_synergy, spellcasting, use_the_force, reroll, reliability, action_economy, swift_action, move_action, standard_action; “You may use any Force power that normally requires a swift action, move action, or standard action as a full-round action instead. If you choose to do so, you may reroll your Use the Force check to activate that power, b”

## `stealth` — PARTIALLY_OWNER_DEFINED

Usage: 65 records (10 feats / 55 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when stealth applies.

Examples:
- Improved Sleight of Hand (FEAT `58d3d0aece0f3bdc`, The Unknown Regions p.26); tags deception, stealth, concealment, swift_action, action_economy, equipment, perception; “Uses Deception as an additional opposed barrier when palming objects with Stealth and enables simultaneously drawing and palming a small weapon, with later swift-action re-palming.”
- Knife Trick (FEAT `61c053191d05d0a2`, Scum and Villainy p.23); tags attack_of_opportunity, stealth, concealment, equipment, action_economy; “Official errata: if you have a successfully concealed weapon, you threaten squares as though armed with a melee weapon. When an attack of opportunity is available, you may draw a successfully concealed weapon and make th”
- Covert Operatives (FEAT `75daa55c22ffed5e`, Galaxy at War p.28); tags teamwork, stealth, infiltration, movement, mobility, scaling; “Gain +3 competence on Stealth checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, when moving more than your speed or more t”
- Improved Stealth (TALENT `073115894cad8cf9`, Saga Edition Core Rulebook p.49); tags stealth, skills, infiltration, reroll, reliability; “You may choose to reroll any Stealth check, but the result of the reroll must be accepted, even if it is worse.”
- Silent Movement (TALENT `084f71defa56162a`, Unknown Regions p.21); tags stealth, skills, mobility, exploration, ally_support, support, teamwork, reliability; “You never suffer unfavorable circumstances from environmental effects associated with noise when you sneak using Stealth. Once per round, when you make a Stealth check, you can automatically use the aid another action on”

## `support` — OWNER_DEFINITION_REQUIRED (broad)

Usage: 306 records (21 feats / 285 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `support` applies. State whether records whose canonical text matches  in the observed wording forms qualify.

Examples:
- Technical Experts (FEAT `18779d9a72b47a12`, Galaxy at War p.29); tags teamwork, mechanics, skills, scaling, ally_support, support, tech; “Gain +3 competence on Mechanics checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, when using Aid Another to assist an ally”
- Medical Team (FEAT `1d27dfb8ce491836`, Galaxy at War p.29); tags teamwork, treat_injury, medical, medicine, healing, scaling, ally_support, support; “Gain +3 competence on Treat Injury checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, when you Aid Another an ally with thi”
- Ample Foraging (FEAT `223a5c14f2ea4737`, Rebellion Era Campaign Guide p.31); tags survival, nature, ally_support, support, defense, resilience; “When you use Basic Survival, every creature that consumes the food you find gains +2 morale Fortitude Defense until the start of the next day. Food found with Basic Survival grants consumers +2 morale Fortitude until the”
- Supervising Droid (TALENT `0025737e7198390e`, Scavenger's Guide to Droids p.27); tags droid, ally_support, support, teamwork, skills, standard_action, swift_action, action_economy, once-per-encounter, reliability; “You are programmed to oversee other droids. You can use each of the following actions once per encounter: • Combat Support: As a standard action, you automatically aid another on an allied droid's attack roll, provided y”
- Force Warning (TALENT `0178e98b17ab2bcc`, Knights of the Old Republic Campaign Guide p.40); tags force, initiative, ally_support, support, teamwork, reroll, reliability, ambush_defense, surprise_round, scaling, awareness; “Allies within 12 squares can choose to reroll their Initiative checks at the start of combat but must take the second result, even if it is worse. Furthermore, if any allies within 12 squares are surprised at the start o”

## `surprise_round` — OWNER_DEFINITION_REQUIRED

Usage: 20 records (2 feats / 18 talents). Existing policies: none. Unresolved records: 2.

- Q: Define when `surprise_round` applies. State whether records whose canonical text matches F.surprise_round in the observed wording forms qualify.

Examples:
- Reset Initiative (TALENT `97eeb67b9428f0eb`, Force Unleashed Campaign Guide p.28); tags initiative, once-per-encounter, action_economy; forms OTHER
- Commander's Prerogative (TALENT `d18f6de464dc42cf`, Unknown Regions p.31); tags initiative, action_economy, ally_support, support, teamwork, setup, once-per-encounter; forms OTHER

## `survivability` — OWNER_DEFINITION_REQUIRED (broad)

Usage: 171 records (22 feats / 149 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `survivability` applies. State whether records whose canonical text matches  in the observed wording forms qualify.

Examples:
- Galactic Alliance Military Training (FEAT `03593bdccdd70fa2`, Legacy Era Campaign Guide p.36); tags damage_threshold, resilience, survivability, once-per-encounter; “The first time in an encounter that an attack exceeds your damage threshold, you do not move down the condition track. Ignore the condition-track movement from the first attack each encounter that exceeds your damage thr”
- Increased Resistance (FEAT `0365722a629eed1f`, Rebellion Era Campaign Guide p.34); tags defense, resilience, survivability; “Whenever an attack or skill check targets Fortitude Defense and fails to equal or exceed it, gain +2 circumstance Fortitude until the start of your next turn. After an enemy fails against your Fortitude Defense, gain +2 ”
- Pitiless Warrior (FEAT `08896a9f860ebca9`, Rebellion Era Campaign Guide p.34); tags survivability, resource_recovery; “Whenever you reduce a target to 0 HP, gain bonus HP equal to 5 + one-half your level. Damage removes bonus HP first; leftovers expire at encounter end; bonus HP do not stack. Dropping a target to 0 HP grants temporary bo”
- Oath of Duty (TALENT `001ae84d5862af55`, Legacy Era Campaign Guide p.45); tags ally-trigger, lightsaber, durability, survivability, scaling, positioning; “When an ally within 12 squares of you and within your line of sight hits with a lightsaber attack, you gain bonus hit points equal to 3 x your class level until the end of your next turn. Damage is subtracted from the bo”
- Soft to Solid (TALENT `004732cba6bfa4a7`, Jedi Academy Training Manual p.81); tags force, reaction, action_economy, force_point_spend, resource_spend, damage_reduction, defense, resilience, survivability; “As a reaction when you are damaged by an attack, you can spend a Force Point to increase the rigidity of your skin, gaining DR 10 until the end of your next turn.”

## `survival` — PARTIALLY_OWNER_DEFINED

Usage: 10 records (7 feats / 3 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when survival applies.

Examples:
- Wilderness First Aid (FEAT `171f0d8d997c8bbc`, The Unknown Regions p.28); tags survival, nature, medical, treat_injury, healing, skills; “Once per day, a successful Survival check lets Basic Survival count as having a medpac for Treat Injury checks until day end.”
- Ample Foraging (FEAT `223a5c14f2ea4737`, Rebellion Era Campaign Guide p.31); tags survival, nature, ally_support, support, defense, resilience; “When you use Basic Survival, every creature that consumes the food you find gains +2 morale Fortitude Defense until the start of the next day. Food found with Basic Survival grants consumers +2 morale Fortitude until the”
- Nikto Survival (FEAT `6179746c48e30c26`, The Unknown Regions p.28); tags survival, reroll, reliability, nature; “In the selected Nikto subspecies' favored environment, rerolls Survival checks and keeps the better result.”
- Planetary Attunement (TALENT `1204459eaaff9efa`, Jedi Academy Training Manual p.75); tags force, force_point_spend, resource_spend, exploration, survival, nature, defense, mobility, senses, precognition, planning, action_economy; “Whenever you arrive on a new planet, you can spend 10 minutes and a Force Point to acclimate yourself to the planet's unique ebb and flow of Force energy. While on the planet, you gain a +2 Force bonus to all defenses ag”
- Expert Tracker (TALENT `16e18057bc92365c`, Saga Edition Core Rulebook p.49); tags survival, skills, tracking, pursuit, mobility, exploration; “You take no penalty on Survival checks made to follow tracks while moving your normal speed. Without this talent, you take a -5 penalty on Survival checks made to follow tracks while moving your normal speed.”

## `tactics` — OWNER_DEFINITION_REQUIRED

Usage: 16 records (2 feats / 14 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when tactics applies.

Examples:
- Starship Tactics (FEAT `376d805d1b73f7e6`, Starships of the Galaxy p.20); tags vehicle, space, tactics, resources, scaling; “Add starship maneuvers equal to 1 + Wisdom modifier, minimum 1. The same maneuver may be added more than once. The feat is repeatable; each copy grants another 1 + Wisdom modifier maneuvers, minimum 1. If Wisdom modifier”
- Tactical Genius (FEAT `da8e272f5dae09b9`, Starships of the Galaxy p.21); tags vehicle, space, tactics, resource_recovery, critical_success, pilot; “Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll. Normal rule reminder: only a natural 20 on a Pilot check to activate a starship maneuver normally restores all”
- Irregular Tactics (TALENT `2be9f49f9c675bfb`, Unknown Regions p.31); tags tactics, knowledge, skills, support, teamwork, defense; “After using the share talent special quality, make a Knowledge (tactics) check as a free action. The result replaces the DC of any talents that use Knowledge (tactics) from the Military Tactics tree used against you or y”
- Coordinated Tactics (TALENT `4559e2e975f552fa`, Clone Wars Campaign Guide p.26); tags followers, minion, ally_support, support, teamwork, tactics; “Each of your Followers gains the Coordinated Attack Feat, provided he or she meets the prerequisite. If your Follower later meets the prerequisite for the Feat, they gain the Feat at that time.”

## `talisman` — OWNER_DEFINITION_REQUIRED

Usage: 8 records (0 feats / 8 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when talisman applies.

Examples:
- Greater Force Talisman (TALENT `0c636cdbb63cdba3`, Saga Edition Core Rulebook p.214); tags force, force_point_spend, resource_spend, talisman, crafting, equipment, empowerment, defense, survivability, action_economy; “You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you. Creating the Talisman takes a Full-Round Action. While you wear or carry th”
- Focused Force Talisman (TALENT `12eea831f06c45f7`, Clone Wars Campaign Guide p.40); tags force, talisman, crafting, equipment, empowerment, force_power_synergy, force_capacity, resource_recovery, recovery, force_point_spend, resource_spend; “When you create a Force talisman, you can select a single Force power from your Force suite. Whenever you are wearing this talisman and activate the selected Force power, you can spend a Force Point to immediately regain”

## `target-designation` — OWNER_DEFINITION_REQUIRED (broad)

Usage: 78 records (3 feats / 75 talents). Existing policies: none. Unresolved records: 31.

- Q: Define when `target-designation` applies. State whether records whose canonical text matches F.designate in the observed wording forms qualify.

Examples:
- Signature Device (FEAT `313095ada7504547`, Scum and Villainy p.24); tags tech, mechanics, modification, equipment, reliability; forms OTHER
- Hijkata Training (FEAT `6dcb59b199dba6a1`, Galaxy at War p.26); tags martial_arts, unarmed, melee, attack_of_opportunity, counterattack, control, once-per-encounter, ally_support, support, teamwork, reaction, action_economy, movement, mobility; forms OTHER
- Logic Upgrade: Tactician (FEAT `a75d5d6b3ce5bc6f`, Knights of the Old Republic Campaign Guide p.34); tags ally_support, support, teamwork, precision, once-per-encounter; forms OTHER
- Friend or Foe (TALENT `014d291a6e16cc12`, Legacy Era Campaign Guide p.27); tags ally-trigger, reaction, action_economy, ranged, counterattack, control, positioning, evasion; forms OTHER
- Force Warning (TALENT `0178e98b17ab2bcc`, Knights of the Old Republic Campaign Guide p.40); tags force, initiative, ally_support, support, teamwork, reroll, reliability, ambush_defense, surprise_round, scaling, awareness; forms OTHER

## `targeting` — OWNER_DEFINITION_REQUIRED (broad)

Usage: 153 records (30 feats / 123 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `targeting` applies. State whether records whose canonical text matches  in the observed wording forms qualify.

Examples:
- Spray Shot (FEAT `0066c394e5d636fb`, Clone Wars Campaign Guide p.31); tags ranged, targeting, precision; “When using a weapon set on autofire, you may reduce the targeted autofire area to 1 square. Reduce an autofire attack's area to a single square.”
- Burst Fire (FEAT `0d4d7c147c48cdab`, Saga Edition Core Rulebook p.82); tags ranged, damage_bonus, burst_damage, targeting; “Official errata removes Strength 13 as a prerequisite. With an autofire-capable ranged weapon in autofire mode, make a single-target attack at -5 for +2 damage dice. Does not stack with Deadeye or Rapid Shot extra damage”
- Grazing Shot (FEAT `1228a537592ad145`, Galaxy of Intrigue p.27); tags ranged, targeting, positioning, action_economy, damage; “After a successful ranged attack against one target, make a second attack against another target in direct line of sight and within 6 squares of the first. If the second attack succeeds, roll damage once and divide it eq”
- Dark Scourge (TALENT `08fc3247755c5ebe`, Saga Edition Core Rulebook p.223); tags precision, targeting, melee, ranged; “You have dedicated your life to wiping out the Jedi, and your hatred of them knows no bounds. Against Jedi characters (that is, characters belonging to The Jedi), you gain a +1 Dark Side bonus on attack rolls.”
- Blind Spot (TALENT `0be2881047fe9919`, Starships of the Galaxy p.17); tags vehicle, pilot, skills, swift_action, action_economy, opposed_check, mobility, positioning, precision, defense, evasion, targeting; “You can fly a vehicle you pilot so close to a target at least two sizes larger than your vehicle that it is difficult for the target to avoid or attack you. You must be adjacent to the target (at starship scale) to use t”

## `teamwork` — OWNER_DEFINITION_REQUIRED

Usage: 276 records (24 feats / 252 talents). Existing policies: none. Unresolved records: 10.

- Q: Define when `teamwork` applies. State whether records whose canonical text matches K.teamwork in the observed wording forms qualify.

Examples:
- Tech Specialist (FEAT `42e2404790756700`, Saga Edition Web Enhancement 1: The Tech Specialist p.3); tags tech, mechanics, modification, equipment, armor, droid, vehicle, ability_enhancement, durability, defense, skills, mobility, shields, weapon_empowerment, precision, damage_bonus; forms OTHER
- Superior Tech (FEAT `a717435c8094e7fb`, Scum and Villainy p.24); tags tech, mechanics, modification, equipment, armor, droid, vehicle, ability_enhancement, durability, defense, perception, skills, sensors, shields, mobility, weapon_empowerment, precision, damage_bonus; forms OTHER
- Starship Designer (FEAT `e9147ce66a783fbb`, Starships of the Galaxy p.20); tags tech, mechanics, crafting, modification, vehicle, durability, shields, weapon_empowerment, precision; forms OTHER
- Sensor Link (FEAT `e95252c02d2ae129`, Scavenger's Guide to Droids p.24); tags sensors, perception, network, ally_support, support, swift_action, action_economy, awareness; forms OTHER
- Flanking Fire (TALENT `1f6b9d509a07f881`, Scum and Villainy p.28); tags pistol, ranged, dual_wield, flanking, full_attack, standard_action, action_economy, sustained_damage, positioning; forms OTHER

## `tech` — OWNER_DEFINITION_REQUIRED (broad)

Usage: 67 records (12 feats / 55 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when `tech` applies. State whether records whose canonical text matches  in the observed wording forms qualify.

Examples:
- Expert Droid Repair (FEAT `029c3935e9bed6eb`, Clone Wars Campaign Guide p.29); tags droid, mechanics, repair, tech, scaling; “Repair a number of droids simultaneously equal to your Intelligence bonus. Make Mechanics checks separately for each droid as normal. Unlike Experienced Medic, the printed feat text does not state a minimum of 2. Repair ”
- Technical Experts (FEAT `18779d9a72b47a12`, Galaxy at War p.29); tags teamwork, mechanics, skills, scaling, ally_support, support, tech; “Gain +3 competence on Mechanics checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, when using Aid Another to assist an ally”
- Signature Device (FEAT `313095ada7504547`, Scum and Villainy p.24); tags tech, mechanics, modification, equipment, reliability, swift_action, action_economy; “Designate one weapon, armor, vehicle, or other item as your signature item. You may Take 10 on Mechanics checks to modify it. It may have two Tech Specialist traits; installing the second requires DC 30 Mechanics. Only o”
- Electronic Sabotage (TALENT `0290634450ab1637`, Force Unleashed Campaign Guide p.27); tags use_computer, slicing, tech, skills, standard_action, action_economy, control, network, infiltration; “You excel at causing havoc with computers and electronics. As a standard action, you can lock down a computer terminal by making a Use Computer check, making it potentially difficult for anyone else to access. That compu”
- Personalized Modifications (TALENT `111b0a9d1f8d5111`, Starships of the Galaxy p.17); tags tech, modification, equipment, standard_action, action_economy, precision, damage_bonus, melee, ranged, sustained_damage; “As a standard action, you may tweak the settings, grips, and moving parts of a powered weapon you wield, tailoring it to your needs. For the remainder of the encounter, you gain a +1 equipment bonus on attack rolls and a”

## `telekinesis` — OWNER_DEFINITION_REQUIRED

Usage: 13 records (0 feats / 13 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when telekinesis applies.

Examples:
- Telekinetic Power (TALENT `11cae48e1213c407`, Saga Edition Core Rulebook p.100); tags force, force_power_synergy, telekinesis, critical_success, action_economy, use_the_force; “Whenever you roll a natural 20 on your Use the Force check to activate Force disarm, Force grip, Force slam, Force thrust, or move object, you may choose to use that Force power again immediately as a free action. You ma”
- Telekinetic Resistance (TALENT `203464310c5c2492`, Legacy Era Campaign Guide p.40); tags anti-force, force, telekinesis, mobility, movement, defense, resilience; “Whenever you are targeted by a Force power that moves you, you reduce the distance you are moved by half.”

## `telepath` — OWNER_DEFINITION_REQUIRED

Usage: 2 records (0 feats / 2 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when telepath applies.

Examples:
- Perfect Telepathy (TALENT `2da74bc3f4d45d2d`, Jedi Academy Training Manual p.18); tags force, use_the_force, telepathy, telepath, social; “You can communicate in full sentences and complete thoughts when you use the Telepathy aspect of the Use the Force skill, instead of just in basic phrases. However, the target of your telepathy can still only communicate”
- Mind Probe (TALENT `ccaa66ed749e3317`, Jedi Academy Training Manual p.18); tags force, use_the_force, telepathy, telepath, mind-affecting, investigation, social, knowledge, skills, infiltration, will_defense, action_economy, resources, gather_information; “When you touch a living creature with an Intelligence of 3 or higher, you can use the Force to probe its mind for secrets. You must be adjacent to the target, and using the mind probe is a full-round action. If the targe”

## `telepathy` — OWNER_DEFINITION_REQUIRED

Usage: 10 records (0 feats / 10 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when telepathy applies.

Examples:
- Telepathic Link (TALENT `25dd9d9b3b66c048`, Knights of the Old Republic Campaign Guide p.53); tags force, telepathy, ally_support, support, teamwork, swift_action, action_economy, force_power_synergy, force_capacity, resources, force_support, once-per-encounter; “You form an enhanced telepathic link with a willing ally with the Force Sensitivity feat as a swift action. The link is maintained until you choose to remove it (no action required). As long as you remain within one kilo”
- Perfect Telepathy (TALENT `2da74bc3f4d45d2d`, Jedi Academy Training Manual p.18); tags force, use_the_force, telepathy, telepath, social; “You can communicate in full sentences and complete thoughts when you use the Telepathy aspect of the Use the Force skill, instead of just in basic phrases. However, the target of your telepathy can still only communicate”

## `temporary-talent` — OWNER_DEFINITION_REQUIRED

Usage: 3 records (1 feats / 2 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when temporary-talent applies.

Examples:
- Adaptable Talent (FEAT `25ce950a142f969d`, Galaxy of Intrigue p.25); tags temporary-talent; “Choose one talent you qualify for from a class you possess. Once per day after at least 6 hours of rest, swap one current talent for the chosen talent. The swapped-out talent cannot be a prerequisite for another talent y”
- Done It All (TALENT `d376f165f1a47281`, Galaxy of Intrigue p.20); tags temporary-talent, force_point_spend, resource_spend, action_economy; “When you select this talent, choose two talents (from any nonprestige class) that you do not possess but for which you meet the prerequisites. Once per turn on your turn, you can spend a Force Point as a free action to g”
- Quick Study (TALENT `fd37b68c6fb620f6`, Unknown Regions p.23); tags temporary-talent, once-per-encounter; “Once per encounter, if an enemy attacks you using a non-Force-related talent, you can use the same talent against it on your next turn. You must use an appropriate weapon or item if required, but you do not need to meet ”

## `tracking` — OWNER_DEFINITION_REQUIRED

Usage: 6 records (1 feats / 5 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when tracking applies.

Examples:
- Master Tracker (FEAT `d133d3fad058c35f`, Rebellion Era Campaign Guide p.34); tags survival, tracking, nature, force_point_spend, resource_spend, force_multiplier; “Whenever you spend a Force Point to add to Survival, increase the die type by two steps (d6 to d10, or d8 to d12). Force Points added to Survival use a die two steps larger.”
- Expert Tracker (TALENT `16e18057bc92365c`, Saga Edition Core Rulebook p.49); tags survival, skills, tracking, pursuit, mobility, exploration; “You take no penalty on Survival checks made to follow tracks while moving your normal speed. Without this talent, you take a -5 penalty on Survival checks made to follow tracks while moving your normal speed.”
- Detective (TALENT `27dd504c877a4de5`, Galaxy of Intrigue p.24); tags investigation, tracking, pursuit, skills, social, social_network, resources, gather_information; “You are skilled in locating individuals and using research and surveillance to learn some of their most intimate secrets. When you make a Gather Information check to locate an individual, the DC is reduced by 10, and the”

## `trap` — OWNER_DEFINITION_REQUIRED

Usage: 10 records (0 feats / 10 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when trap applies.

Examples:
- Prepared Explosive (TALENT `32029a2f0dbb7104`, Clone Wars Campaign Guide p.45); tags trap, crafting, equipment, control, battlefield_control, movement, positioning, setup; “When you use a Mine or other fixed (non-Grenade) Explosive, you can choose to have the Burst radius of the Explosive become Difficult Terrain after the Explosive has detonated. Alternatively, if you plant a Mine or fixed”
- Shaped Explosion (TALENT `7ab4fcbe5a8b7714`, Force Unleashed Campaign Guide p.57); tags trap, crafting, burst_damage, battlefield_control, positioning, targeting, setup; “You know how to set charges to direct a blast in a specific direction or manner. You can shape an explosion caused by explosives or mines that you set into a line or a cone instead of a radius. The length of the line is ”

## `treat_injury` — PARTIALLY_OWNER_DEFINED

Usage: 40 records (9 feats / 31 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when treat_injury applies.

Examples:
- Wilderness First Aid (FEAT `171f0d8d997c8bbc`, The Unknown Regions p.28); tags survival, nature, medical, treat_injury, healing, skills; “Once per day, a successful Survival check lets Basic Survival count as having a medpac for Treat Injury checks until day end.”
- Medical Team (FEAT `1d27dfb8ce491836`, Galaxy at War p.29); tags teamwork, treat_injury, medical, medicine, healing, scaling, ally_support, support; “Gain +3 competence on Treat Injury checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, when you Aid Another an ally with thi”
- Experienced Medic (FEAT `5e1e84d933295217`, Clone Wars Campaign Guide p.29); tags medical, medicine, treat_injury, healing, ally_support, support, scaling; “Perform surgery on a number of creatures simultaneously equal to your Intelligence bonus, minimum 2. Make Treat Injury checks separately for each creature as normal. Perform surgery on multiple creatures at once: Intelli”
- Lingering Debilitation (TALENT `1250a3dac18104eb`, Unknown Regions p.31); tags ranged, control, battlefield_control, pursuit, once-per-encounter, treat_injury; “Once per encounter, when you successfully use Debilitating Shot to move a target character -1 step on the condition track, the target suffers a persistent condition requiring 4 hours of rest or a DC 25 Treat Injury check”
- Force Treatment (TALENT `181da7f36b9fba9d`, Saga Edition Core Rulebook p.214); tags force, use_the_force, treat_injury, medicine, medical, skills, skill_substitution, reroll, reliability, healing, recovery, support; “You can make a Use the Force check in place of a Treat Injury check. You are considered Trained in the Treat Injury Skill. If you are entitled to a Treat Injury check reroll, you may reroll your Use the Force check inste”

## `unarmed` — PARTIALLY_OWNER_DEFINED

Usage: 56 records (23 feats / 33 talents). Existing policies: CLOSED_SCOPE_POLICY, OPEN_GENERIC_SCOPE_POLICY. Unresolved records: 0.

- Q: Define when unarmed applies.

Examples:
- Wrruushi Training (FEAT `1d0291d930abda15`, Galaxy at War p.28); tags martial_arts, unarmed, melee, survivability, resilience, control, once-per-encounter, critical_hit, damage; “Once per round after a successful unarmed attack, gain bonus HP equal to Constitution modifier; damage removes these first, leftovers expire at encounter end, and they do not stack. Once per encounter, make an unarmed at”
- K'tara Training (FEAT `1dfbddf5f1aa57c3`, Galaxy at War p.27); tags martial_arts, unarmed, melee, ambush, damage_bonus, stun, control, once-per-encounter, swift_action, action_economy, setup; “One unarmed attack during your turn deals +1 damage die against a flat-footed enemy. Once per encounter after unarmed damage to a target denied Dexterity to Reflex, make a free unarmed attack vs Fortitude; on success, ta”
- Close Combat Escape (FEAT `1ec2b64343aca60e`, Scum and Villainy p.21); tags acrobatics, grapple, evasion, swift_action, action_economy, melee, unarmed, setup, control; “After successfully using Acrobatics to escape a grapple, spend a swift action to make one melee or unarmed attack against the former grappler. On a hit, deal normal damage and the opponent is flat-footed until the start ”
- Reverse Strength (TALENT `002c2d4fd8383a3e`, Galaxy of Intrigue p.23); tags grapple, control, battlefield_control, melee, unarmed, damage, scaling; “You know how to use an opponent's strength against it. Whenever you successfully grapple an opponent, you deal damage equal to the opponent's Strength modifier (minimum 1 point).”
- Simultaneous Strike (TALENT `040e50766b518ea6`, Jedi Academy Training Manual p.89); tags unarmed, martial_arts, melee, standard_action, action_economy, burst_damage, positioning; “As a standard action, you can make two unarmed attacks, each against different targets.”

## `use_computer` — PARTIALLY_OWNER_DEFINED

Usage: 26 records (6 feats / 20 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when use_computer applies.

Examples:
- Gearhead (FEAT `3b9b60551a3379ce`, Knights of the Old Republic Campaign Guide p.33); tags tech, mechanics, use_computer, skills, action_economy, once-per-encounter; “Once per encounter, accelerate Mechanics and Use Computer checks: full-round→standard, standard→move, move→swift. Checks requiring multiple swift actions require one fewer swift action. Checks taking more than a full rou”
- Veteran Spacer (FEAT `423c5fffe7abe449`, Rebellion Era Campaign Guide p.36); tags use_computer, space, vehicle, exploration, skills; “Gain +5 species bonus to Use Computer checks made to perform astrogation aboard a starship. Gain +5 species to Use Computer checks for starship astrogation.”
- Slicer Team (FEAT `77c897590b4000f6`, Galaxy at War p.29); tags teamwork, use_computer, skills, scaling, ally_support, support, tech, slicing; “Gain +3 competence on Use Computer checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, when using Aid Another to assist an a”
- Electronic Sabotage (TALENT `0290634450ab1637`, Force Unleashed Campaign Guide p.27); tags use_computer, slicing, tech, skills, standard_action, action_economy, control, network, infiltration; “You excel at causing havoc with computers and electronics. As a standard action, you can lock down a computer terminal by making a Use Computer check, making it potentially difficult for anyone else to access. That compu”
- Instinctive Navigation (TALENT `2d392f2b63b738ed`, Jedi Academy Training Manual p.17); tags force, use_the_force, skill_substitution, use_computer, pilot, vehicle, space, sensors, skills, exploration; “You can substitute your Use the Force skill for any Use Computer check made to astrogate or operate sensors while you are the pilot of a vehicle.”

## `use_the_force` — PARTIALLY_OWNER_DEFINED

Usage: 122 records (4 feats / 118 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when use_the_force applies.

Examples:
- Unstoppable Force (FEAT `0a6c87a410bee1f2`, Clone Wars Campaign Guide p.31); tags force_defense, anti-force, defense, will_defense, use_the_force, force; “Gain +5 insight to Fortitude Defense and Will Defense against any attack or effect requiring a Use the Force check. Gain +5 insight Fortitude and Will against attacks/effects resolved with Use the Force.”
- Dreadful Countenance (FEAT `2e5ada2de01fff4d`, Behind the Threat: The Sith, Part 2 — The Becoming p.web-article-archived-rendering-page-4-of-4); tags persuasion, use_the_force, force, fear, reroll, reliability, social; “Whenever you make a Persuasion check or Use the Force check to activate a fear effect, you may reroll the check. You must accept the reroll result even if it is worse. Reroll Persuasion or Use the Force checks used to ac”
- Pall of the Dark Side (FEAT `8d164553709dd068`, Clone Wars Campaign Guide p.31); tags dark_side, dark_side_score, use_the_force, force, stealth, detection, force_defense, anti-force; “Add one-half your Dark Side Score, minimum +1, to Use the Force checks made to resist detection via Sense Force. Add half your Dark Side Score, minimum +1, when resisting Sense Force detection.”
- Force Intuition (TALENT `00deb8b4cce303b6`, Saga Edition Core Rulebook p.40); tags force, use_the_force, initiative, skills, skill_substitution, reroll, reliability, vehicle, pilot; “You can use your Use the Force check modifier instead of your Initiative modifier when making Initiative checks. You are considered Trained in the Initiative skill. If you are entitled to an Initiative check reroll, you ”
- Knowledge of the Force (TALENT `04eca2813630e8d4`, Knights of the Old Republic Campaign Guide p.58); tags force, use_the_force, force_support, ally_support, support, teamwork, skills, reaction, action_economy, force_point_spend, resource_spend; “You can use your scholarly knowledge of the Force to help others reach their full potential. You can spend a Force Point as a reaction to aid another ally within 6 squares on a Use the Force check, following the normal r”

## `vehicle` — OWNER_DEFINITION_REQUIRED

Usage: 97 records (23 feats / 74 talents). Existing policies: none. Unresolved records: 19.

- Q: Define when `vehicle` applies. State whether records whose canonical text matches M.vehicle in the observed wording forms qualify.

Examples:
- Burst Fire (FEAT `0d4d7c147c48cdab`, Saga Edition Core Rulebook p.82); tags ranged, damage_bonus, burst_damage, targeting; forms OTHER
- Power Attack (FEAT `3f76464c43c73f84`, Saga Edition Core Rulebook p.87); tags melee, precision, damage_bonus, burst_damage; forms OTHER
- Scavenger (FEAT `6cf1898b8c3c837c`, The Force Unleashed Campaign Guide p.35); tags crafting, resources, perception, equipment, mechanics; forms OTHER
- Power Blast (FEAT `935212056c7968c8`, Knights of the Old Republic Campaign Guide p.34); tags ranged, precision, damage_bonus, swift_action, action_economy; forms OTHER
- Rapid Shot (FEAT `94b8751efb03536a`, Saga Edition Core Rulebook p.88); tags ranged, precision, damage_bonus, burst_damage; forms OTHER

## `visions` — OWNER_DEFINITION_REQUIRED

Usage: 23 records (0 feats / 23 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when visions applies.

Examples:
- Temporal Awareness (TALENT `028e4e50565971ee`, Scum and Villainy p.26); tags force, visions, precognition, once-per-encounter, reaction, action_economy, mobility, movement, evasion; “Once per encounter, as a reaction to any enemy's attack, you can move up to your speed.”
- Guardian Spirit (TALENT `0b18181b971fc505`, Jedi Academy Training Manual p.16); tags force, search_your_feelings, visions, precognition, investigation, recon, use_the_force, resources, force_capacity, force_point_spend, resource_spend, force_power_synergy; “You have a guardian spirit watching over you from the realm of the Force, providing you with insight and advice. Your guardian spirit might be an old mentor or an ancient member of your Force tradition who has chosen to ”

## `weapon_empowerment` — OWNER_DEFINITION_REQUIRED

Usage: 18 records (5 feats / 13 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when weapon_empowerment applies.

Examples:
- Tech Specialist (FEAT `42e2404790756700`, Saga Edition Web Enhancement 1: The Tech Specialist p.3); tags tech, mechanics, modification, equipment, armor, droid, vehicle, ability_enhancement, durability, defense, skills, mobility, shields, weapon_empowerment, precision, damage_bonus; “Modify a device, armor, weapon, droid, or vehicle with one special trait unless otherwise noted. Normally only one Tech Specialist benefit may be applied to an item, and the same benefit cannot be applied more than once.”
- Disabler (FEAT `94023012303ad257`, Galaxy at War p.23); tags ranged, weapon_empowerment, precision, damage_bonus, battlefield_control, droid, vehicle; “Ion grenade: burst radius becomes 3 squares instead of 2. Ion pistol: damage dice increase from d6 to d8. Ion rifle: treat it as an accurate weapon. Gain weapon-specific benefits when attacking with a proficient ion gren”
- Superior Tech (FEAT `a717435c8094e7fb`, Scum and Villainy p.24); tags tech, mechanics, modification, equipment, armor, droid, vehicle, ability_enhancement, durability, defense, perception, skills, sensors, shields, mobility, weapon_empowerment, precision, damage_bonus; “Choose one category: armor, weapons, droids, vehicles, or devices; install advanced traits for that category in place of normal Tech Specialist traits. Pay one-fifth item cost or 2,000 credits, whichever is greater; work”
- Infuse Weapon (TALENT `0df15b0ea7721c50`, Force Unleashed Campaign Guide p.93); tags force, force_point_spend, resource_spend, empowerment, weapon_empowerment, equipment, melee, damage_reduction, durability, damage_bonus, sustained_damage, action_economy; “You can spend a Force Point to infuse an unpowered melee weapon (one that does not require an energy cell) with the strength of the Force, making it resistant to the attacks of other weapons. Infusing the weapon takes a ”
- Empower Siang Lance (TALENT `2bae1dc009d4f2d2`, Rebellion Era Campaign Guide p.37); tags force, force_point_spend, resource_spend, weapon_empowerment, empowerment, equipment, exotic_weapon, ranged, damage_bonus, sustained_damage, action_economy; “You can spend a Force Point to empower a siang lance, which takes a full-round action. After the siang lance is empowered, it deals an additional die of damage when you wield it. Others who wield the weapon do not gain t”

## `weapon_specialization` — OWNER_DEFINITION_REQUIRED

Usage: 10 records (2 feats / 8 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when weapon_specialization applies.

Examples:
- Triple Crit (FEAT `3d4a4e93ced26712`, Saga Edition Core Rulebook p.89); tags critical_hit, damage_bonus, weapon_specialization; “Choose one weapon, including unarmed attack if desired. Critical hits with the selected weapon deal triple damage instead of double. Repeatable for different weapons; effects do not stack. Choose a proficient weapon; its”
- Weapon Focus (FEAT `c41814601364b643`, Saga Edition Core Rulebook p.89); tags weapon_specialization, weapon_training, precision; “Choose one exotic weapon or weapon group, including unarmed strike or grapple if desired, and gain +1 attacks with it. Repeatable for different selections; effects do not stack on the same selection. Choose a proficient ”
- Weapon Specialization (discblade) (TALENT `5854b821895ffdd9`, Jedi Academy Training Manual p.91); tags exotic_weapon, melee, weapon_specialization, damage_bonus, sustained_damage; “You gain a +2 bonus on melee damage rolls with your discblade.”
- Weapon Specialization (TALENT `869168cd679ee5d1`, Saga Edition Core Rulebook p.53); tags weapon_specialization, weapon_training, melee, ranged, damage_bonus, sustained_damage; “Choose a single Exotic Weapon or weapon group with which you are proficient. You gain a +2 bonus on damage rolls with such weapons. You may select this Talent multiple times. Each time you select this Talent, it applies ”

## `weapon_training` — OWNER_DEFINITION_REQUIRED

Usage: 65 records (11 feats / 54 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when weapon_training applies.

Examples:
- Primitive Warrior (FEAT `047f06ec480d841f`, Rebellion Era Campaign Guide p.34); tags melee, damage_bonus, weapon_training; “Deal +1 die of damage with simple melee weapons. Deal +1 damage die with simple melee weapons.”
- Exotic Weapon Proficiency (FEAT `1ea7da65feb15b18`, Saga Edition Core Rulebook p.84); tags exotic_weapon, weapon_training, equipment; “Choose one exotic weapon; make attacks with it without the normal -5 nonproficiency penalty. Repeatable for a different exotic weapon each time. Become proficient with one chosen exotic weapon; repeatable for other exoti”
- Vehicular Combat (FEAT `1f2f70d34a17667d`, Saga Edition Core Rulebook p.89); tags pilot, vehicle, reaction, action_economy, defense, evasion, weapon_training; “Once per round as a reaction while piloting a vehicle/starship, negate a weapon hit with Pilot vs the triggering attack roll. While piloting, count as proficient with pilot-operated vehicle weapons. Once per round, Pilot”
- Weapon Shift (TALENT `032242fb87215e06`, Clone Wars Campaign Guide p.40); tags melee, ranged, precision, weapon_training; “If you use a Ranged Weapon as a Melee Weapon (as with the Gun Club Talent), you gain a +2 bonus to melee attack rolls with that Weapon.”
- Extended Critical Range (heavy weapons) (TALENT `04985a42930dff2a`, Force Unleashed Campaign Guide p.42); tags heavy_weapon, ranged, critical_hit, precision, weapon_training; “When you are using a heavy weapon, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other ”

## `will_defense` — OWNER_DEFINITION_REQUIRED

Usage: 107 records (21 feats / 86 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when will_defense applies.

Examples:
- Unwavering Focus (FEAT `0214e9586b6c8bb5`, Rebellion Era Campaign Guide p.36); tags mind-affecting, will_defense, defense, reaction, action_economy, skills; “When targeted by a mind-affecting effect requiring a skill check against Will Defense, as a reaction impose -2 on that skill check. React to a mind-affecting skill check against your Will by imposing -2 on the check.”
- Unstoppable Force (FEAT `0a6c87a410bee1f2`, Clone Wars Campaign Guide p.31); tags force_defense, anti-force, defense, will_defense, use_the_force, force; “Gain +5 insight to Fortitude Defense and Will Defense against any attack or effect requiring a Use the Force check. Gain +5 insight Fortitude and Will against attacks/effects resolved with Use the Force.”
- Channel Rage (FEAT `14f0d916e9228368`, Galaxy of Intrigue p.25); tags defense, will_defense, resilience, resource_spend, resources; “Once per day, instead of entering rage, gain +5 Will Defense until the end of the encounter. Using this benefit counts as using your rage ability for that day. Once per day, spend your Rage use to gain +5 Will Defense fo”
- Unreadable (TALENT `01bcee2365b82ce6`, Scum and Villainy p.14); tags will_defense, defense, resilience, social, deception, feint, ambush, setup; “You gain a +5 bonus to your Will Defense against skill checks made to read your emotions and influence your attitude. In addition, whenever you successfully feint a target in combat, that target is flat-footed against al”
- Band Together (TALENT `03123bd5c86beaa0`, Unknown Regions p.19); tags ally_support, support, teamwork, leadership, target-designation, damage_bonus, will_defense, persuasion, social, mind-affecting, control, swift_action, action_economy, once-per-encounter, sustained_damage; “You can use each of the following actions once per encounter. Directed Attack: As a swift action, designate one enemy character or vehicle; until the end of your next turn, whenever an ally within 12 squares hits that ta”

## `acrobatics` — PARTIALLY_OWNER_DEFINED

Usage: 16 records (10 feats / 6 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when acrobatics applies.

Examples:
- Tumble Defense (FEAT `1e21ddf471811265`, Knights of the Old Republic Campaign Guide p.35); tags melee, attack_of_opportunity, battlefield_control, control, movement, acrobatics; “When an opponent tumbles through a square you threaten with a melee weapon, add your base attack bonus to that Acrobatics DC. If the target fails, you may make an attack of opportunity as normal. Cannot be used while fla”
- Close Combat Escape (FEAT `1ec2b64343aca60e`, Scum and Villainy p.21); tags acrobatics, grapple, evasion, swift_action, action_economy, melee, unarmed, setup, control; “After successfully using Acrobatics to escape a grapple, spend a swift action to make one melee or unarmed attack against the former grappler. On a hit, deal normal damage and the opponent is flat-footed until the start ”
- Disturbing Presence (FEAT `25ba21b021086a71`, Galaxy of Intrigue p.27); tags deception, acrobatics, skill_substitution, movement, mobility, attack_of_opportunity, evasion, infiltration; “DC 15 Deception allows movement through an enemy's threatened area or fighting space without provoking. Each threatened or occupied square traversed this way costs 2 squares of movement. DC 15 Deception lets you move thr”
- Mobile Combatant (TALENT `198b68c0ca770ad7`, Force Unleashed Campaign Guide p.24); tags swift_action, action_economy, mobility, movement, positioning, pursuit, target-designation, attack_of_opportunity, acrobatics; “When you end your movement adjacent to an opponent, you can spend a swift action to activate this talent. If the designated opponent moves or withdraws before the beginning of your next turn, you can choose to move with ”
- Directed Movement (TALENT `510d4b2aadbbc2de`, Scavenger's Guide to Droids p.28); tags droid, ally_support, support, teamwork, move_action, action_economy, mobility, movement, skills, ability_enhancement, acrobatics, climb, jump, stealth, swim; “As a move action, you allow one droid that can hear and understand you to move up to its speed. The droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relevant a”

## `climb` — PARTIALLY_OWNER_DEFINED

Usage: 12 records (10 feats / 2 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when climb applies.

Examples:
- Conditioning (FEAT `0ac76f1c0c1677cb`, Knights of the Old Republic Campaign Guide p.32); tags reroll, reliability, skills, defense, reaction, action_economy, once-per-encounter, resilience, climb, jump, swim, endurance; “Reroll any Strength- or Constitution-based skill check for a skill in which you are trained; accept the second result. Once per encounter as a reaction, add your Strength bonus to Fortitude Defense until the beginning of”
- Ascension Specialists (FEAT `125c328c4573890a`, Galaxy at War p.28); tags teamwork, climb, movement, mobility, scaling, move_action, action_economy; “Gain +3 competence on Climb checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, climb at half speed as a move action or norm”
- Risk Taker (FEAT `6ef0920984de0ed0`, Galaxy at War p.25); tags climb, jump, reliability, movement, mobility, force_point_spend, resource_spend, evasion; “You fall from a Climb check only when you fail by 10 or more instead of 5 or more. After a failed Jump that would not land safely, spend a Force Point as a free action and add its roll to jump distance. You must land in ”
- Directed Movement (TALENT `510d4b2aadbbc2de`, Scavenger's Guide to Droids p.28); tags droid, ally_support, support, teamwork, move_action, action_economy, mobility, movement, skills, ability_enhancement, acrobatics, climb, jump, stealth, swim; “As a move action, you allow one droid that can hear and understand you to move up to its speed. The droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relevant a”
- Speedclimber (TALENT `bfb04c89df257f8b`, Unknown Regions p.21); tags skills, mobility, exploration, climb; “You do not take the penalty when using the Accelerated Climbing application of the Climb skill.”

## `endurance` — PARTIALLY_OWNER_DEFINED

Usage: 10 records (9 feats / 1 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when endurance applies.

Examples:
- Conditioning (FEAT `0ac76f1c0c1677cb`, Knights of the Old Republic Campaign Guide p.32); tags reroll, reliability, skills, defense, reaction, action_economy, once-per-encounter, resilience, climb, jump, swim, endurance; “Reroll any Strength- or Constitution-based skill check for a skill in which you are trained; accept the second result. Once per encounter as a reaction, add your Strength bonus to Fortitude Defense until the beginning of”
- Armor Proficiency (Light) (FEAT `773ec00effc7e96f`, Saga Edition Core Rulebook p.82); tags armor, equipment, skills, acrobatics, climb, endurance, initiative, jump, stealth, swim; “Wear light armor without its nonproficiency attack/skill penalties and gain its special equipment bonuses. Use light armor without nonproficiency penalties and gain its special equipment bonuses.”
- Armor Proficiency (Heavy) (FEAT `859d6b9f49118499`, Saga Edition Core Rulebook p.82); tags armor, equipment, skills, acrobatics, climb, endurance, initiative, jump, stealth, swim; “Wear heavy armor without its nonproficiency attack/skill penalties and gain its special equipment bonuses. Use heavy armor without nonproficiency penalties and gain its special equipment bonuses.”
- Pursuit (TALENT `25f285b1cf4cff35`, Force Unleashed Campaign Guide p.45); tags mobility, movement, pursuit, reroll, reliability, endurance; “When running, you are not restricted to a straight line (see “Endurance,” page 66 of the Saga Edition core rulebook) and you can reroll Endurance checks, using the better result, while running.”

## `gather_information` — PARTIALLY_OWNER_DEFINED

Usage: 16 records (4 feats / 12 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when gather_information applies.

Examples:
- Confident Success (FEAT `139a80972fc3b8ee`, Rebellion Era Campaign Guide p.31); tags gather_information, investigation, social, force-point, resource_recovery; “Whenever you successfully use Gather Information to Learn Secret Information, gain 1 Force Point. You can gain no more than 3 Force Points per level this way, and cannot hold more Force Points than you gained upon reachi”
- Cut the Red Tape (FEAT `2bb34366776f0371`, Galaxy of Intrigue p.27); tags knowledge, gather_information, skill_substitution, skills, reroll, reliability; “Use Knowledge (Bureaucracy) modifier in place of Gather Information. If entitled to a Gather Information reroll, reroll the substituted Knowledge check under the same restrictions. Count as trained in Gather Information ”
- Friends in Low Places (FEAT `e18eecc0f21a95f4`, Scum and Villainy p.21); tags gather_information, knowledge, skill_substitution, skills, equipment, resources, social; “When acquiring a license for a Restricted or Military object, substitute Gather Information for Knowledge (Bureaucracy). Reduce the Black Market cost multiplier of such items by 1. Use Gather Information for Restricted/M”
- Jedi Network (TALENT `251462d5e3aaa4ce`, Legacy Era Campaign Guide p.42); tags social_network, resources, equipment, investigation, healing, medical, infiltration, ally_support, support, teamwork, reliability, gather_information; “You have access to a network of Jedi sympathizers. While in a civilized area, you can call upon this network of allies once per game session for one of the following purposes: Acquire Equipment or Funds: You can use your”
- Detective (TALENT `27dd504c877a4de5`, Galaxy of Intrigue p.24); tags investigation, tracking, pursuit, skills, social, social_network, resources, gather_information; “You are skilled in locating individuals and using research and surveillance to learn some of their most intimate secrets. When you make a Gather Information check to locate an individual, the DC is reduced by 10, and the”

## `jump` — PARTIALLY_OWNER_DEFINED

Usage: 12 records (10 feats / 2 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when jump applies.

Examples:
- Conditioning (FEAT `0ac76f1c0c1677cb`, Knights of the Old Republic Campaign Guide p.32); tags reroll, reliability, skills, defense, reaction, action_economy, once-per-encounter, resilience, climb, jump, swim, endurance; “Reroll any Strength- or Constitution-based skill check for a skill in which you are trained; accept the second result. Once per encounter as a reaction, add your Strength bonus to Fortitude Defense until the beginning of”
- Dive for Cover (FEAT `2866d953b4b6245d`, Galaxy at War p.23); tags jump, reaction, action_economy, movement, mobility, cover, ranged_defense, evasion; “Once per turn, as a reaction to being targeted by a ranged attack, make a horizontal Jump check. If you land in a square providing cover from the attacker, gain that cover bonus against the triggering attack even though ”
- Risk Taker (FEAT `6ef0920984de0ed0`, Galaxy at War p.25); tags climb, jump, reliability, movement, mobility, force_point_spend, resource_spend, evasion; “You fall from a Climb check only when you fail by 10 or more instead of 5 or more. After a failed Jump that would not land safely, spend a Force Point as a free action and add its roll to jump distance. You must land in ”
- Rebound Leap (TALENT `1b41d42e6adb0d46`, Jedi Academy Training Manual p.89); tags unarmed, martial_arts, melee, mobility, movement, positioning, skills, action_economy, jump; “Whenever you reduce an opponent to 0 hit points with an unarmed attack, you can make a Jump check as a free action, moving a distance as determined by the results of your Jump check. You can use the surge power as normal”
- Directed Movement (TALENT `510d4b2aadbbc2de`, Scavenger's Guide to Droids p.28); tags droid, ally_support, support, teamwork, move_action, action_economy, mobility, movement, skills, ability_enhancement, acrobatics, climb, jump, stealth, swim; “As a move action, you allow one droid that can hear and understand you to move up to its speed. The droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relevant a”

## `swim` — PARTIALLY_OWNER_DEFINED

Usage: 11 records (10 feats / 1 talents). Existing policies: none. Unresolved records: 0.

- Q: Define when swim applies.

Examples:
- Conditioning (FEAT `0ac76f1c0c1677cb`, Knights of the Old Republic Campaign Guide p.32); tags reroll, reliability, skills, defense, reaction, action_economy, once-per-encounter, resilience, climb, jump, swim, endurance; “Reroll any Strength- or Constitution-based skill check for a skill in which you are trained; accept the second result. Once per encounter as a reaction, add your Strength bonus to Fortitude Defense until the beginning of”
- Aquatic Specialists (FEAT `55483fd350b3ba28`, Galaxy at War p.28); tags teamwork, swim, movement, mobility, scaling, move_action, action_economy; “Gain +3 competence on Swim checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, swim at half speed as a move action or full s”
- Perfect Swimmer (FEAT `70c842436bbb6330`, Rebellion Era Campaign Guide p.34); tags swim, reroll, reliability; “Whenever you reroll a Swim check, always keep the better result, even if multiple reroll abilities apply. Swim rerolls always keep the better result.”
- Directed Movement (TALENT `510d4b2aadbbc2de`, Scavenger's Guide to Droids p.28); tags droid, ally_support, support, teamwork, move_action, action_economy, mobility, movement, skills, ability_enhancement, acrobatics, climb, jump, stealth, swim; “As a move action, you allow one droid that can hear and understand you to move up to its speed. The droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relevant a”
