// Extracted static feat prerequisite/content authority.
import { normalizeAuthorityKey } from "./authority-key-normalizer.js";

export const FEAT_PREREQUISITE_AUTHORITY = {
  "acrobatic_strike": {
    "name": "Acrobatic Strike",
    "prerequisite": "Trained in Acrobatics",
    "benefit": "Gain +2 competence bonus on next attack against opponent you Tumble past.",
    "description": "Gain +2 competence bonus on next attack against opponent you Tumble past."
  },
  "armor_proficiency_heavy": {
    "name": "Armor Proficiency (Heavy)",
    "prerequisite": "Armor Proficiency (Light), Armor Proficiency (Medium)",
    "benefit": "No penalty on attacks and no Armor Check Penalty while wearing Light Armor, Medium Armor, or Heavy Armor.",
    "description": "No penalty on attacks and no Armor Check Penalty while wearing Light Armor, Medium Armor, or Heavy Armor."
  },
  "armor_proficiency_light": {
    "name": "Armor Proficiency (Light)",
    "prerequisite": "None",
    "benefit": "No penalty on attacks and no Armor Check Penalty while wearing Light Armor.",
    "description": "No penalty on attacks and no Armor Check Penalty while wearing Light Armor."
  },
  "armor_proficiency_medium": {
    "name": "Armor Proficiency (Medium)",
    "prerequisite": "Armor Proficiency (Light)",
    "benefit": "No penalty on attacks and no Armor Check Penalty while wearing Light Armor or Medium Armor.",
    "description": "No penalty on attacks and no Armor Check Penalty while wearing Light Armor or Medium Armor."
  },
  "bantha_rush": {
    "name": "Bantha Rush",
    "prerequisite": "Strength 13, Base Attack Bonus +1",
    "benefit": "Push opponent 1 square after making a successful melee attack.",
    "description": "Push opponent 1 square after making a successful melee attack."
  },
  "burst_fire": {
    "name": "Burst Fire",
    "prerequisite": "Proficient with Heavy Weapons",
    "benefit": "Take a -5 penalty on an Autofire attack to gain +2 dice of damage.",
    "description": "Take a -5 penalty on an Autofire attack to gain +2 dice of damage."
  },
  "careful_shot": {
    "name": "Careful Shot",
    "prerequisite": "Point-Blank Shot, Base Attack Bonus +2",
    "benefit": "If you Aim, gain +1 bonus on the attack roll.",
    "description": "If you Aim, gain +1 bonus on the attack roll."
  },
  "charging_fire": {
    "name": "Charging Fire",
    "prerequisite": "Base Attack Bonus +4",
    "benefit": "Make ranged attack at end of a Charge; take a -2 penalty to Reflex Defense.",
    "description": "Make ranged attack at end of a Charge; take a -2 penalty to Reflex Defense."
  },
  "cleave": {
    "name": "Cleave",
    "prerequisite": "Strength 13, Power Attack",
    "benefit": "Extra melee attack after dropping target.",
    "description": "Extra melee attack after dropping target."
  },
  "combat_reflexes": {
    "name": "Combat Reflexes",
    "prerequisite": "None",
    "benefit": "Gain additional Attacks of Opportunity.",
    "description": "Gain additional Attacks of Opportunity."
  },
  "coordinated_attack": {
    "name": "Coordinated Attack",
    "prerequisite": "Base Attack Bonus +2",
    "benefit": "Automatic success with Aid Another action at Point-Blank Range.",
    "description": "Automatic success with Aid Another action at Point-Blank Range."
  },
  "crush": {
    "name": "Crush",
    "prerequisite": "Pin, Base Attack Bonus +1",
    "benefit": "Deal Unarmed or Claw damage to a Pinned opponent.",
    "description": "Deal Unarmed or Claw damage to a Pinned opponent."
  },
  "cybernetic_surgery": {
    "name": "Cybernetic Surgery",
    "prerequisite": "Trained in Treat Injury",
    "benefit": "Install a Cybernetic Prosthesis onto a living being.",
    "description": "Install a Cybernetic Prosthesis onto a living being."
  },
  "deadeye": {
    "name": "Deadeye",
    "prerequisite": "Point-Blank Shot, Precise Shot, Base Attack Bonus +4",
    "benefit": "If you Aim, deal extra damage.",
    "description": "If you Aim, deal extra damage."
  },
  "dodge": {
    "name": "Dodge",
    "prerequisite": "Dexterity 13",
    "benefit": "Gain a +1 dodge bonus to Reflex Defense against a selected target.",
    "description": "Gain a +1 dodge bonus to Reflex Defense against a selected target."
  },
  "double_attack": {
    "name": "Double Attack",
    "prerequisite": "Base Attack Bonus +6",
    "benefit": "Make an extra attack with chosen weapon during Full Attack, -5 penalty to all attacks.",
    "description": "Make an extra attack with chosen weapon during Full Attack, -5 penalty to all attacks."
  },
  "dreadful_rage": {
    "name": "Dreadful Rage",
    "prerequisite": "Rage Species Trait, Base Attack Bonus +1",
    "benefit": "Rage bonus to attacks and damage increases to +5.",
    "description": "Rage bonus to attacks and damage increases to +5."
  },
  "dual_weapon_mastery_i": {
    "name": "Dual Weapon Mastery I",
    "prerequisite": "Dexterity 13, Base Attack Bonus +1",
    "benefit": "Take a -5 penalty on attacks when attacking with two weapons, or both ends of a double weapon.",
    "description": "Take a -5 penalty on attacks when attacking with two weapons, or both ends of a double weapon."
  },
  "dual_weapon_mastery_ii": {
    "name": "Dual Weapon Mastery II",
    "prerequisite": "Dexterity 15, Base Attack Bonus +6, Dual Weapon Mastery I",
    "benefit": "Take a -2 penalty on attacks when attacking with two weapons, or both ends of a double weapon.",
    "description": "Take a -2 penalty on attacks when attacking with two weapons, or both ends of a double weapon."
  },
  "dual_weapon_mastery_iii": {
    "name": "Dual Weapon Mastery III",
    "prerequisite": "Dexterity 17, Base Attack Bonus +11, Dual Weapon Mastery I, Dual Weapon Mastery II",
    "benefit": "Take no penalty on attacks when attacking with two weapons, or both ends of a double weapon.",
    "description": "Take no penalty on attacks when attacking with two weapons, or both ends of a double weapon."
  },
  "exotic_weapon_proficiency": {
    "name": "Exotic Weapon Proficiency",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Wield an Exotic Weapon without penalty.",
    "description": "Wield an Exotic Weapon without penalty."
  },
  "extra_rage": {
    "name": "Extra Rage",
    "prerequisite": "Rage Species Trait",
    "benefit": "Rage one additional time per day.",
    "description": "Rage one additional time per day."
  },
  "extra_second_wind": {
    "name": "Extra Second Wind",
    "prerequisite": "Trained in Endurance",
    "benefit": "Gain an additional Second Wind per day.",
    "description": "Gain an additional Second Wind per day."
  },
  "far_shot": {
    "name": "Far Shot",
    "prerequisite": "Point-Blank Shot",
    "benefit": "Range penalties for Short-, Medium-, and Long-ranged attacks are reduced.",
    "description": "Range penalties for Short-, Medium-, and Long-ranged attacks are reduced."
  },
  "force_boon": {
    "name": "Force Boon",
    "prerequisite": "Force Sensitivity",
    "benefit": "Gain three additional Force Points at each level.",
    "description": "Gain three additional Force Points at each level."
  },
  "force_sensitivity": {
    "name": "Force Sensitivity",
    "prerequisite": "Non-Droid",
    "benefit": "You can make Use the Force checks and gain access to Force Talents.",
    "description": "You can make Use the Force checks and gain access to Force Talents."
  },
  "force_training": {
    "name": "Force Training",
    "prerequisite": "Force Sensitivity",
    "benefit": "Learn a number of Force Powers equal to 1 + your Wisdom modifier (minimum 1).",
    "description": "Learn a number of Force Powers equal to 1 + your Wisdom modifier (minimum 1)."
  },
  "great_cleave": {
    "name": "Great Cleave",
    "prerequisite": "Strength 13, Power Attack, Cleave, Base Attack Bonus +4",
    "benefit": "No limit to Cleave attacks each round.",
    "description": "No limit to Cleave attacks each round."
  },
  "improved_charge": {
    "name": "Improved Charge",
    "prerequisite": "Dexterity 13, Dodge, Mobility",
    "benefit": "You can Charge without moving in a straight line.",
    "description": "You can Charge without moving in a straight line."
  },
  "improved_defenses": {
    "name": "Improved Defenses",
    "prerequisite": "None",
    "benefit": "Gain +1 bonus to all Defenses.",
    "description": "Gain +1 bonus to all Defenses."
  },
  "improved_disarm": {
    "name": "Improved Disarm",
    "prerequisite": "Intelligence 13, Melee Defense",
    "benefit": "Gain +5 bonus on melee attacks to Disarm an opponent.",
    "description": "Gain +5 bonus on melee attacks to Disarm an opponent."
  },
  "improved_damage_threshold": {
    "name": "Improved Damage Threshold",
    "prerequisite": "None",
    "benefit": "Damage Threshold increases by 5 points.",
    "description": "Damage Threshold increases by 5 points."
  },
  "linguist": {
    "name": "Linguist",
    "prerequisite": "Intelligence 13",
    "benefit": "Gain bonus Languages equal to 1 + your Intelligence modifier (minimum 1).",
    "description": "Gain bonus Languages equal to 1 + your Intelligence modifier (minimum 1)."
  },
  "martial_arts_i": {
    "name": "Martial Arts I",
    "prerequisite": "None",
    "benefit": "Increases damage from Unarmed attacks by one die step; gain +1 bonus to Reflex Defense.",
    "description": "Increases damage from Unarmed attacks by one die step; gain +1 bonus to Reflex Defense."
  },
  "martial_arts_ii": {
    "name": "Martial Arts II",
    "prerequisite": "Martial Arts I, Base Attack Bonus +3",
    "benefit": "Increases damage from Unarmed attacks by one die step; gain +1 bonus to Reflex Defense.",
    "description": "Increases damage from Unarmed attacks by one die step; gain +1 bonus to Reflex Defense."
  },
  "martial_arts_iii": {
    "name": "Martial Arts III",
    "prerequisite": "Martial Arts I, Martial Arts II, Base Attack Bonus +6",
    "benefit": "Increases damage from Unarmed attacks by one die step; gain +1 bonus to Reflex Defense.",
    "description": "Increases damage from Unarmed attacks by one die step; gain +1 bonus to Reflex Defense."
  },
  "melee_defense": {
    "name": "Melee Defense",
    "prerequisite": "Intelligence 13",
    "benefit": "Trade attack bonus on melee attacks for a dodge bonus to Reflex Defense.",
    "description": "Trade attack bonus on melee attacks for a dodge bonus to Reflex Defense."
  },
  "mighty_swing": {
    "name": "Mighty Swing",
    "prerequisite": "Strength 13",
    "benefit": "Spend two Swift Actions to deal extra damage in melee.",
    "description": "Spend two Swift Actions to deal extra damage in melee."
  },
  "mobility": {
    "name": "Mobility",
    "prerequisite": "Dexterity 13, Dodge",
    "benefit": "Gain +5 dodge bonus to Reflex Defense against some Attacks of Opportunity.",
    "description": "Gain +5 dodge bonus to Reflex Defense against some Attacks of Opportunity."
  },
  "pin": {
    "name": "Pin",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Grappled opponent is Pinned for one round, can't move, and and loses its Dexterity bonus to Reflex Defense.",
    "description": "Grappled opponent is Pinned for one round, can't move, and and loses its Dexterity bonus to Reflex Defense."
  },
  "point_blank_shot": {
    "name": "Point-Blank Shot",
    "prerequisite": "None",
    "benefit": "+1 bonus on ranged attacks and damage against foes within Point-Blank Range.",
    "description": "+1 bonus on ranged attacks and damage against foes within Point-Blank Range."
  },
  "power_attack": {
    "name": "Power Attack",
    "prerequisite": "Strength 13",
    "benefit": "Trade attack bonus for damage on melee attacks (up to your Base Attack Bonus).",
    "description": "Trade attack bonus for damage on melee attacks (up to your Base Attack Bonus)."
  },
  "powerful_charge": {
    "name": "Powerful Charge",
    "prerequisite": "Medium or larger sized, Base Attack Bonus +1",
    "benefit": "Gain +2 bonus on your attack roll while Charging, and deal extra damage.",
    "description": "Gain +2 bonus on your attack roll while Charging, and deal extra damage."
  },
  "precise_shot": {
    "name": "Precise Shot",
    "prerequisite": "Point-Blank Shot",
    "benefit": "No -5 penalty for shooting into melee.",
    "description": "No -5 penalty for shooting into melee."
  },
  "quick_draw": {
    "name": "Quick Draw",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Draw weapon as a Swift Action.",
    "description": "Draw weapon as a Swift Action."
  },
  "rapid_shot": {
    "name": "Rapid Shot",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Take a -2 penalty on a ranged attack roll to deal +1 die of damage.",
    "description": "Take a -2 penalty on a ranged attack roll to deal +1 die of damage."
  },
  "rapid_strike": {
    "name": "Rapid Strike",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Take a -2 penalty on a melee attack roll to deal +1 die of damage.",
    "description": "Take a -2 penalty on a melee attack roll to deal +1 die of damage."
  },
  "running_attack": {
    "name": "Running Attack",
    "prerequisite": "Dexterity 13",
    "benefit": "Move before and after making an attack.",
    "description": "Move before and after making an attack."
  },
  "shake_it_off": {
    "name": "Shake It Off",
    "prerequisite": "Constitution 13, Trained in Endurance",
    "benefit": "Spend two Swift Actions to move +1 step along the Condition Track.",
    "description": "Spend two Swift Actions to move +1 step along the Condition Track."
  },
  "skill_focus": {
    "name": "Skill Focus",
    "prerequisite": "None",
    "benefit": "Gain +5 competence bonus on Skill Checks with one Trained Skill.",
    "description": "Gain +5 competence bonus on Skill Checks with one Trained Skill."
  },
  "skill_training": {
    "name": "Skill Training",
    "prerequisite": "None",
    "benefit": "You become Trained in one Class Skill.",
    "description": "You become Trained in one Class Skill."
  },
  "sniper": {
    "name": "Sniper",
    "prerequisite": "Point-Blank Shot, Precise Shot, Base Attack Bonus +4",
    "benefit": "You ignore Soft Cover when making a ranged attack.",
    "description": "You ignore Soft Cover when making a ranged attack."
  },
  "strong_in_the_force": {
    "name": "Strong in the Force",
    "prerequisite": "None",
    "benefit": "Roll d8s instead of d6s when you spend a Force Point.",
    "description": "Roll d8s instead of d6s when you spend a Force Point."
  },
  "surgical_expertise": {
    "name": "Surgical Expertise",
    "prerequisite": "Trained in Treat Injury",
    "benefit": "You can perform Surgery in 10 minutes instead of 1 hour.",
    "description": "You can perform Surgery in 10 minutes instead of 1 hour."
  },
  "throw": {
    "name": "Throw",
    "prerequisite": "Trip, Base Attack Bonus +1",
    "benefit": "Throw a Grappled opponent up to 1 square beyond your reach and deal damage.",
    "description": "Throw a Grappled opponent up to 1 square beyond your reach and deal damage."
  },
  "toughness": {
    "name": "Toughness",
    "prerequisite": "None",
    "benefit": "Gain +1 Hit Point per Character Level.",
    "description": "Gain +1 Hit Point per Character Level."
  },
  "trip": {
    "name": "Trip",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Trip an opponent that you've Grappled, knocking it Prone.",
    "description": "Trip an opponent that you've Grappled, knocking it Prone."
  },
  "triple_attack": {
    "name": "Triple Attack",
    "prerequisite": "Base Attack Bonus +11, Double Attack (Chosen Weapon)",
    "benefit": "Make second extra attack with chosen weapon during Full Attack, additional -5 penalty to all attacks.",
    "description": "Make second extra attack with chosen weapon during Full Attack, additional -5 penalty to all attacks."
  },
  "triple_crit": {
    "name": "Triple Crit",
    "prerequisite": "Base Attack Bonus +8",
    "benefit": "Deal triple damage on a Critical Hit.",
    "description": "Deal triple damage on a Critical Hit."
  },
  "vehicular_combat": {
    "name": "Vehicular Combat",
    "prerequisite": "Trained in Pilot",
    "benefit": "Negate one attack per round against the Vehicle you're piloting.",
    "description": "Negate one attack per round against the Vehicle you're piloting."
  },
  "weapon_finesse": {
    "name": "Weapon Finesse",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Use Dexterity modifier instead of Strength modifier on attack rolls with Light Melee Weapons and Lightsabers.",
    "description": "Use Dexterity modifier instead of Strength modifier on attack rolls with Light Melee Weapons and Lightsabers."
  },
  "weapon_focus": {
    "name": "Weapon Focus",
    "prerequisite": "Proficient with Chosen Weapon",
    "benefit": "+1 bonus on attack rolls with chosen weapon.",
    "description": "+1 bonus on attack rolls with chosen weapon."
  },
  "weapon_proficiency": {
    "name": "Weapon Proficiency",
    "prerequisite": "None",
    "benefit": "Ignore -5 penalty on attack rolls with weapons of a particular type.",
    "description": "Ignore -5 penalty on attack rolls with weapons of a particular type."
  },
  "whirlwind_attack": {
    "name": "Whirlwind Attack",
    "prerequisite": "Dexterity 13, Intelligence 13, Melee Defense, Base Attack Bonus +4",
    "benefit": "Make one melee attack against each opponent within reach.",
    "description": "Make one melee attack against each opponent within reach."
  },
  "starship_designer": {
    "name": "Starship Designer",
    "prerequisite": "Tech Specialist, Trained in Mechanics",
    "benefit": "You are trained to design (and redesign) Starships.",
    "description": "You are trained to design (and redesign) Starships."
  },
  "starship_tactics": {
    "name": "Starship Tactics",
    "prerequisite": "Vehicular Combat, Trained in Pilot",
    "benefit": "You are trained to make use of Starship Maneuvers and are skilled at space combat.",
    "description": "You are trained to make use of Starship Maneuvers and are skilled at space combat."
  },
  "tactical_genius": {
    "name": "Tactical Genius",
    "prerequisite": "Starship Tactics, Vehicular Combat, Trained in Pilot",
    "benefit": "You are a master at using multiple starship tactics over the course of long space combats.",
    "description": "You are a master at using multiple starship tactics over the course of long space combats."
  },
  "tech_specialist": {
    "name": "Tech Specialist",
    "prerequisite": "Trained in Mechanics",
    "benefit": "You can make custom modifications to Armor, Weapons, Vehicles, Droids, and Devices.",
    "description": "You can make custom modifications to Armor, Weapons, Vehicles, Droids, and Devices."
  },
  "a_few_maneuvers": {
    "name": "A Few Maneuvers",
    "prerequisite": "Dodge, Vehicular Combat",
    "benefit": "You can weave, juke, and roll to avoid enemy fire in the thick of combat.",
    "description": "You can weave, juke, and roll to avoid enemy fire in the thick of combat."
  },
  "momentum_strike": {
    "name": "Momentum Strike",
    "prerequisite": "Trained in Pilot or Ride",
    "benefit": "You know how to put the weight of your momentum into attacks while riding a Mount or Speeder Bike.",
    "description": "You know how to put the weight of your momentum into attacks while riding a Mount or Speeder Bike."
  },
  "mounted_defense": {
    "name": "Mounted Defense",
    "prerequisite": "Trained in Pilot or Ride",
    "benefit": "You are able to react to incoming attacks, using you Mount or Speeder Bike to absorb attacks against you.",
    "description": "You are able to react to incoming attacks, using you Mount or Speeder Bike to absorb attacks against you."
  },
  "suppression_fire": {
    "name": "Suppression Fire",
    "prerequisite": "Strength 13, Burst Fire, Weapon Proficiency (Heavy Weapons)",
    "benefit": "You can lay down a hail of blaster fire to pin your opponents.",
    "description": "You can lay down a hail of blaster fire to pin your opponents."
  },
  "accelerated_strike": {
    "name": "Accelerated Strike",
    "prerequisite": "Base Attack Bonus +6",
    "benefit": "Once per encounter, make a Full Attack as a Standard Action.",
    "description": "Once per encounter, make a Full Attack as a Standard Action."
  },
  "conditioning": {
    "name": "Conditioning",
    "prerequisite": "Strength 13, Constitution 13",
    "benefit": "Reroll Strength and Constitution based Skill Checks.",
    "description": "Reroll Strength and Constitution based Skill Checks."
  },
  "critical_strike": {
    "name": "Critical Strike",
    "prerequisite": "Base Attack Bonus +9, Weapon Focus (Chosen Weapon)",
    "benefit": "Increase critical threat range of an attack.",
    "description": "Increase critical threat range of an attack."
  },
  "echani_training": {
    "name": "Echani Training",
    "prerequisite": "Dexterity 13, Martial Arts I",
    "benefit": "In Unarmed combat, increase damage, and knock opponent Prone on Critical Hit.",
    "description": "In Unarmed combat, increase damage, and knock opponent Prone on Critical Hit."
  },
  "flurry": {
    "name": "Flurry",
    "prerequisite": "Dexterity 13",
    "benefit": "Increases attack bonus, with penalties to Reflex Defense.",
    "description": "Increases attack bonus, with penalties to Reflex Defense."
  },
  "force_readiness": {
    "name": "Force Readiness",
    "prerequisite": "None",
    "benefit": "Spend Force Points even if it is not your turn.",
    "description": "Spend Force Points even if it is not your turn."
  },
  "gearhead": {
    "name": "Gearhead",
    "prerequisite": "None",
    "benefit": "Make Mechanics and Use Computer checks quickly.",
    "description": "Make Mechanics and Use Computer checks quickly."
  },
  "implant_training": {
    "name": "Implant Training",
    "prerequisite": "Possess an Implant",
    "benefit": "You don't move additional steps down the Condition Track due to your Implants.",
    "description": "You don't move additional steps down the Condition Track due to your Implants."
  },
  "improved_rapid_strike": {
    "name": "Improved Rapid Strike",
    "prerequisite": "Rapid Strike",
    "benefit": "Trade -5 penalty on attack roll for +2 dice of damage when using a Light Melee Weapon.",
    "description": "Trade -5 penalty on attack roll for +2 dice of damage when using a Light Melee Weapon."
  },
  "increased_agility": {
    "name": "Increased Agility",
    "prerequisite": "Conditioning",
    "benefit": "Increase Climb Speed, Swim Speed, and Jump distance by 2 squares.",
    "description": "Increase Climb Speed, Swim Speed, and Jump distance by 2 squares."
  },
  "logic_upgrade_self_defense": {
    "name": "Logic Upgrade: Self-Defense",
    "prerequisite": "Droid",
    "benefit": "Grant yourself +2 to the Defense of your choice for 1 round.",
    "description": "Grant yourself +2 to the Defense of your choice for 1 round."
  },
  "logic_upgrade_tactician": {
    "name": "Logic Upgrade: Tactician",
    "prerequisite": "Droid, Base Attack Bonus +4",
    "benefit": "Grant a +5 bonus to attack with a successful Aid Another attempt.",
    "description": "Grant a +5 bonus to attack with a successful Aid Another attempt."
  },
  "mandalorian_training": {
    "name": "Mandalorian Training",
    "prerequisite": "Charging Fire",
    "benefit": "Gain a +2 bonus on attack rolls when using the Charging Fire feat.",
    "description": "Gain a +2 bonus on attack rolls when using the Charging Fire feat."
  },
  "poison_resistance": {
    "name": "Poison Resistance",
    "prerequisite": "Constitution 13",
    "benefit": "You are inherently more resistant to Poison.",
    "description": "You are inherently more resistant to Poison."
  },
  "power_blast": {
    "name": "Power Blast",
    "prerequisite": "None",
    "benefit": "Trade attack bonus for damage on ranged attacks (up to your Base Attack Bonus).",
    "description": "Trade attack bonus for damage on ranged attacks (up to your Base Attack Bonus)."
  },
  "quick_skill": {
    "name": "Quick Skill",
    "prerequisite": "None",
    "benefit": "Take 10 on Skill Checks when rushed, Take 20 in half of the normal time.",
    "description": "Take 10 on Skill Checks when rushed, Take 20 in half of the normal time."
  },
  "republic_military_training": {
    "name": "Republic Military Training",
    "prerequisite": "None",
    "benefit": "When behind Cover, you can reduce the damage of an incoming attack.",
    "description": "When behind Cover, you can reduce the damage of an incoming attack."
  },
  "sith_military_training": {
    "name": "Sith Military Training",
    "prerequisite": "None",
    "benefit": "Upon debilitating an opponent, you can cause other opponents to lose heart.",
    "description": "Upon debilitating an opponent, you can cause other opponents to lose heart."
  },
  "sniper_shot": {
    "name": "Sniper Shot",
    "prerequisite": "None",
    "benefit": "Increase accuracy at a -5 Reflex Defense penalty.",
    "description": "Increase accuracy at a -5 Reflex Defense penalty."
  },
  "tumble_defense": {
    "name": "Tumble Defense",
    "prerequisite": "None",
    "benefit": "Your martial ability makes it harder for opponents to Tumble past.",
    "description": "Your martial ability makes it harder for opponents to Tumble past."
  },
  "withdrawal_strike": {
    "name": "Withdrawal Strike",
    "prerequisite": "Base Attack Bonus +5",
    "benefit": "Adjacent opponents can not use the Withdraw Action.",
    "description": "Adjacent opponents can not use the Withdraw Action."
  },
  "advantageous_attack": {
    "name": "Advantageous Attack",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Add full Heroic Level to attacks against slower enemies.",
    "description": "Add full Heroic Level to attacks against slower enemies."
  },
  "advantageous_cover": {
    "name": "Advantageous Cover",
    "prerequisite": "Trained in Stealth",
    "benefit": "Gain additional benefits from Cover.",
    "description": "Gain additional benefits from Cover."
  },
  "angled_throw": {
    "name": "Angled Throw",
    "prerequisite": "Dexterity 13",
    "benefit": "Ignore Cover with Grenades and grenadelike weapons.",
    "description": "Ignore Cover with Grenades and grenadelike weapons."
  },
  "bad_feeling": {
    "name": "Bad Feeling",
    "prerequisite": "None",
    "benefit": "Always have a Move Action during the Surprise Round.",
    "description": "Always have a Move Action during the Surprise Round."
  },
  "blaster_barrage": {
    "name": "Blaster Barrage",
    "prerequisite": "Coordinated Attack",
    "benefit": "Automatically Aid Another when using Autofire attacks.",
    "description": "Automatically Aid Another when using Autofire attacks."
  },
  "controlled_rage": {
    "name": "Controlled Rage",
    "prerequisite": "Rage Species Trait",
    "benefit": "Enter Rage as a Free Action, and end Rage at will.",
    "description": "Enter Rage as a Free Action, and end Rage at will."
  },
  "crossfire": {
    "name": "Crossfire",
    "prerequisite": "Point-Blank Shot, Precise Shot, Base Attack Bonus +6",
    "benefit": "Redirect missed attacks against Soft Cover.",
    "description": "Redirect missed attacks against Soft Cover."
  },
  "cunning_attack": {
    "name": "Cunning Attack",
    "prerequisite": "None",
    "benefit": "Gain +2 bonus on attack rolls against Flat-Footed enemies.",
    "description": "Gain +2 bonus on attack rolls against Flat-Footed enemies."
  },
  "focused_rage": {
    "name": "Focused Rage",
    "prerequisite": "Rage Species Trait, Controlled Rage",
    "benefit": "When Raging, use Skills that require patience at a -5 penalty.",
    "description": "When Raging, use Skills that require patience at a -5 penalty."
  },
  "improved_bantha_rush": {
    "name": "Improved Bantha Rush",
    "prerequisite": "Strength 15, Bantha Rush, Base Attack Bonus +1",
    "benefit": "Push foes away a number of squares equal to Strength modifier.",
    "description": "Push foes away a number of squares equal to Strength modifier."
  },
  "informer": {
    "name": "Informer",
    "prerequisite": "Trained in Perception",
    "benefit": "Gather Information with Perception skill, and do it faster.",
    "description": "Gather Information with Perception skill, and do it faster."
  },
  "mighty_throw": {
    "name": "Mighty Throw",
    "prerequisite": "Strength 13",
    "benefit": "Add Strength bonus to ranged attack rolls.",
    "description": "Add Strength bonus to ranged attack rolls."
  },
  "natural_leader": {
    "name": "Natural Leader",
    "prerequisite": "Charisma 13",
    "benefit": "You become the leader of an Organization.",
    "description": "You become the leader of an Organization."
  },
  "powerful_rage": {
    "name": "Powerful Rage",
    "prerequisite": "Rage Species Trait",
    "benefit": "Gain a +4 bonus on Strength checks and Strength-based Skill Checks.",
    "description": "Gain a +4 bonus on Strength checks and Strength-based Skill Checks."
  },
  "rapport": {
    "name": "Rapport",
    "prerequisite": "Wisdom 13",
    "benefit": "Grant an additional +2 bonus when using the Aid Another action.",
    "description": "Grant an additional +2 bonus when using the Aid Another action."
  },
  "recall": {
    "name": "Recall",
    "prerequisite": "Trained in Knowledge (Any)",
    "benefit": "Reroll Knowledge skill check, keeping the better result.",
    "description": "Reroll Knowledge skill check, keeping the better result."
  },
  "savage_attack": {
    "name": "Savage Attack",
    "prerequisite": "Double Attack (Chosen Weapon)",
    "benefit": "Add +1 die of damage when successful on a Full Attack.",
    "description": "Add +1 die of damage when successful on a Full Attack."
  },
  "scavenger": {
    "name": "Scavenger",
    "prerequisite": "None",
    "benefit": "Gather materials for building objects",
    "description": "Gather materials for building objects"
  },
  "strafe": {
    "name": "Strafe",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Attack multiple targets as you move past them.",
    "description": "Attack multiple targets as you move past them."
  },
  "swarm": {
    "name": "Swarm",
    "prerequisite": "Coordinated Attack",
    "benefit": "Gain +1 bonus on melee attack rolls when allies are adjacent.",
    "description": "Gain +1 bonus on melee attack rolls when allies are adjacent."
  },
  "unleashed": {
    "name": "Unleashed",
    "prerequisite": "Have a Destiny, Gamemaster's Approval",
    "benefit": "Unlocks Unleashed Abilities.",
    "description": "Unlocks Unleashed Abilities."
  },
  "burst_of_speed": {
    "name": "Burst of Speed",
    "prerequisite": "Trained in Endurance",
    "benefit": "Move Speed twice as Move Action.",
    "description": "Move Speed twice as Move Action."
  },
  "close_combat_escape": {
    "name": "Close Combat Escape",
    "prerequisite": "Trained in Acrobatics",
    "benefit": "Escape Grapple and attack.",
    "description": "Escape Grapple and attack."
  },
  "collateral_damage": {
    "name": "Collateral Damage",
    "prerequisite": "Rapid Shot, Base Attack Bonus +6",
    "benefit": "Gain extra attack upon hitting the first target.",
    "description": "Gain extra attack upon hitting the first target."
  },
  "cornered": {
    "name": "Cornered",
    "prerequisite": "None",
    "benefit": "When unable to Withdraw, +2 on attacks.",
    "description": "When unable to Withdraw, +2 on attacks."
  },
  "deadly_sniper": {
    "name": "Deadly Sniper",
    "prerequisite": "Sniper, Trained in Stealth, Base Attack Bonus +9",
    "benefit": "Gain +2 bonus on your ranged attack roll and deal +1 die of damage.",
    "description": "Gain +2 bonus on your ranged attack roll and deal +1 die of damage."
  },
  "deceptive_drop": {
    "name": "Deceptive Drop",
    "prerequisite": "Trained in Initiative",
    "benefit": "Flat-Footed targets knocked Prone on Surprise Round.",
    "description": "Flat-Footed targets knocked Prone on Surprise Round."
  },
  "desperate_gambit": {
    "name": "Desperate Gambit",
    "prerequisite": "None",
    "benefit": "Reroll missed attack by taking a penalty to Reflex Defense.",
    "description": "Reroll missed attack by taking a penalty to Reflex Defense."
  },
  "duck_and_cover": {
    "name": "Duck and Cover",
    "prerequisite": "Trained in Stealth",
    "benefit": "You dive for Cover when you avoid Area Attacks.",
    "description": "You dive for Cover when you avoid Area Attacks."
  },
  "fleet_footed": {
    "name": "Fleet-Footed",
    "prerequisite": "Running Attack",
    "benefit": "+2 Speed when making a Running Attack.",
    "description": "+2 Speed when making a Running Attack."
  },
  "friends_in_low_places": {
    "name": "Friends in Low Places",
    "prerequisite": "Trained in Gather Information",
    "benefit": "Reduce Black Market cost multiplier for Restricted Items by 1.",
    "description": "Reduce Black Market cost multiplier for Restricted Items by 1."
  },
  "hasty_modification": {
    "name": "Hasty Modification",
    "prerequisite": "Tech Specialist",
    "benefit": "Swap one Trait for another Trait.",
    "description": "Swap one Trait for another Trait."
  },
  "hideous_visage": {
    "name": "Hideous Visage",
    "prerequisite": "Shapeshift Species Trait",
    "benefit": "Deception check to push opponent away.",
    "description": "Deception check to push opponent away."
  },
  "impersonate": {
    "name": "Impersonate",
    "prerequisite": "Shapeshift Species Trait, Skill Focus (Deception)",
    "benefit": "Shapeshift to impersonate a specific person.",
    "description": "Shapeshift to impersonate a specific person."
  },
  "impetuous_move": {
    "name": "Impetuous Move",
    "prerequisite": "Constitution 13",
    "benefit": "Move when you catch a Second Wind.",
    "description": "Move when you catch a Second Wind."
  },
  "impulsive_flight": {
    "name": "Impulsive Flight",
    "prerequisite": "None",
    "benefit": "Withdraw faster.",
    "description": "Withdraw faster."
  },
  "knife_trick": {
    "name": "Knife Trick",
    "prerequisite": "Lightning Draw, Quick Draw, Trained in Stealth",
    "benefit": "Attack of Opportunity with concealed weapon to greater effect.",
    "description": "Attack of Opportunity with concealed weapon to greater effect."
  },
  "lightning_draw": {
    "name": "Lightning Draw",
    "prerequisite": "Quick Draw",
    "benefit": "Draw and fire as a Standard Action.",
    "description": "Draw and fire as a Standard Action."
  },
  "metamorph": {
    "name": "Metamorph",
    "prerequisite": "Constitution 13, Shapeshift Species Trait, Trained in Deception",
    "benefit": "Change your size.",
    "description": "Change your size."
  },
  "opportunistic_retreat": {
    "name": "Opportunistic Retreat",
    "prerequisite": "Combat Reflexes",
    "benefit": "Sacrifice Attack of Opportunity to move at half speed.",
    "description": "Sacrifice Attack of Opportunity to move at half speed."
  },
  "resurgence": {
    "name": "Resurgence",
    "prerequisite": "Trained in Endurance",
    "benefit": "Gain bonus Move Action when you catch your Second Wind.",
    "description": "Gain bonus Move Action when you catch your Second Wind."
  },
  "signature_device": {
    "name": "Signature Device",
    "prerequisite": "Tech Specialist",
    "benefit": "Install two Traits.",
    "description": "Install two Traits."
  },
  "slippery_maneuver": {
    "name": "Slippery Maneuver",
    "prerequisite": "Dodge",
    "benefit": "Dodge two targets, Withdraw at full Speed.",
    "description": "Dodge two targets, Withdraw at full Speed."
  },
  "staggering_attack": {
    "name": "Staggering Attack",
    "prerequisite": "Sneak Attack or Rapid Shot or Rapid Strike",
    "benefit": "Forgo extra damage to push back opponent.",
    "description": "Forgo extra damage to push back opponent."
  },
  "stay_up": {
    "name": "Stay Up",
    "prerequisite": "Trained in Endurance",
    "benefit": "Move 1 step down Condition Track to reduce damage.",
    "description": "Move 1 step down Condition Track to reduce damage."
  },
  "superior_tech": {
    "name": "Superior Tech",
    "prerequisite": "Intelligence 17, Tech Specialist, 9th level",
    "benefit": "Install superior equipment upgrades.",
    "description": "Install superior equipment upgrades."
  },
  "tactical_advantage": {
    "name": "Tactical Advantage",
    "prerequisite": "Combat Reflexes",
    "benefit": "Make Attack of Opportunity and move 1 square.",
    "description": "Make Attack of Opportunity and move 1 square."
  },
  "wicked_strike": {
    "name": "Wicked Strike",
    "prerequisite": "Rapid Strike",
    "benefit": "Gain extra attack on a second target upon damaging the first target.",
    "description": "Gain extra attack on a second target upon damaging the first target."
  },
  "anointed_hunter": {
    "name": "Anointed Hunter",
    "prerequisite": "Nelvaanian",
    "benefit": "Move 2 or more squares and gain a +1 bonus on attacks with Thrown Weapons until the end of your turn.",
    "description": "Move 2 or more squares and gain a +1 bonus on attacks with Thrown Weapons until the end of your turn."
  },
  "artillery_shot": {
    "name": "Artillery Shot",
    "prerequisite": "None",
    "benefit": "You increase the efficiency of your Burst and Splash weapon attacks.",
    "description": "You increase the efficiency of your Burst and Splash weapon attacks."
  },
  "coordinated_barrage": {
    "name": "Coordinated Barrage",
    "prerequisite": "Coordinated Attack, Base Attack Bonus +5",
    "benefit": "Allow an ally to deal more damage when you aid their attack.",
    "description": "Allow an ally to deal more damage when you aid their attack."
  },
  "droidcraft": {
    "name": "Droidcraft",
    "prerequisite": "Trained in Mechanics",
    "benefit": "Repair a Droid in 10 minutes instead of 1 hour.",
    "description": "Repair a Droid in 10 minutes instead of 1 hour."
  },
  "droid_hunter": {
    "name": "Droid Hunter",
    "prerequisite": "None",
    "benefit": "Deal +2 damage to Droid enemies, or +4 when using an Ion Weapon.",
    "description": "Deal +2 damage to Droid enemies, or +4 when using an Ion Weapon."
  },
  "experienced_medic": {
    "name": "Experienced Medic",
    "prerequisite": "Trained in Treat Injury",
    "benefit": "Perform Surgery on multiple creatures simultaneously.",
    "description": "Perform Surgery on multiple creatures simultaneously."
  },
  "expert_droid_repair": {
    "name": "Expert Droid Repair",
    "prerequisite": "Trained in Mechanics",
    "benefit": "Repair multiple Droids simultaneously.",
    "description": "Repair multiple Droids simultaneously."
  },
  "flash_and_clear": {
    "name": "Flash and Clear",
    "prerequisite": "None",
    "benefit": "Gain Concealment against a target you damage with a Burst or Splash weapon.",
    "description": "Gain Concealment against a target you damage with a Burst or Splash weapon."
  },
  "flood_of_fire": {
    "name": "Flood of Fire",
    "prerequisite": "None",
    "benefit": "Ignore enemies' dodge and deflection bonus to Reflex Defense when making Area Attacks with a weapon set on Autofire.",
    "description": "Ignore enemies' dodge and deflection bonus to Reflex Defense when making Area Attacks with a weapon set on Autofire."
  },
  "grand_army_of_the_republic_training": {
    "name": "Grand Army of the Republic Training",
    "prerequisite": "Armor Proficiency (Light)",
    "benefit": "Apply your armor's Equipment bonus to your Will Defense.",
    "description": "Apply your armor's Equipment bonus to your Will Defense."
  },
  "gunnery_specialist": {
    "name": "Gunnery Specialist",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Reroll an attack made with a Vehicle Weapon.",
    "description": "Reroll an attack made with a Vehicle Weapon."
  },
  "jedi_familiarity": {
    "name": "Jedi Familiarity",
    "prerequisite": "None",
    "benefit": "Gain one temporary Force Point when targeted by an ally's Force Power or Force Talent.",
    "description": "Gain one temporary Force Point when targeted by an ally's Force Power or Force Talent."
  },
  "leader_of_droids": {
    "name": "Leader of Droids",
    "prerequisite": "None",
    "benefit": "Allied Droids benefit from your beneficial Mind-Affecting effects.",
    "description": "Allied Droids benefit from your beneficial Mind-Affecting effects."
  },
  "overwhelming_attack": {
    "name": "Overwhelming Attack",
    "prerequisite": "None",
    "benefit": "Any attempt to negate your attack takes a -5 penalty on the attack roll or Skill Check.",
    "description": "Any attempt to negate your attack takes a -5 penalty on the attack roll or Skill Check."
  },
  "pall_of_the_dark_side": {
    "name": "Pall of the Dark Side",
    "prerequisite": "Dark Side Score 1+",
    "benefit": "Add half your Dark Side Score to Use the Force checks to resist detection.",
    "description": "Add half your Dark Side Score to Use the Force checks to resist detection."
  },
  "separatist_military_training": {
    "name": "Separatist Military Training",
    "prerequisite": "None",
    "benefit": "Gain a +1 bonus on an attack roll while adjacent to an ally.",
    "description": "Gain a +1 bonus on an attack roll while adjacent to an ally."
  },
  "spray_shot": {
    "name": "Spray Shot",
    "prerequisite": "None",
    "benefit": "When using a weapon set on Autofire, you can reduce the area to 1 square.",
    "description": "When using a weapon set on Autofire, you can reduce the area to 1 square."
  },
  "trench_warrior": {
    "name": "Trench Warrior",
    "prerequisite": "None",
    "benefit": "When you have Cover against an enemy's ranged attacks, gain a +1 bonus on attack rolls against that enemy.",
    "description": "When you have Cover against an enemy's ranged attacks, gain a +1 bonus on attack rolls against that enemy."
  },
  "unstoppable_force": {
    "name": "Unstoppable Force",
    "prerequisite": "None",
    "benefit": "Gain a +5 bonus to Fortitude Defense and Will Defense against any effect requiring a Use the Force check.",
    "description": "Gain a +5 bonus to Fortitude Defense and Will Defense against any effect requiring a Use the Force check."
  },
  "unwavering_resolve": {
    "name": "Unwavering Resolve",
    "prerequisite": "Trained in Perception",
    "benefit": "Gain a +5 bonus to Will Defense against Deception and Persuasion checks.",
    "description": "Gain a +5 bonus to Will Defense against Deception and Persuasion checks."
  },
  "wary_defender": {
    "name": "Wary Defender",
    "prerequisite": "None",
    "benefit": "Gain a +2 bonus to Fortitude Defense and Will Defense while Fighting Defensively.",
    "description": "Gain a +2 bonus to Fortitude Defense and Will Defense while Fighting Defensively."
  },
  "attack_combo_fire_and_strike": {
    "name": "Attack Combo (Fire and Strike)",
    "prerequisite": "Attack Combo (Melee), Attack Combo (Ranged), Base Attack Bonus +9",
    "benefit": "Deal +1 die of damage on Unarmed, melee, or ranged attacks until the end of your next turn after hitting an enemy with two Unarmed, melee, or ranged attacks.",
    "description": "Deal +1 die of damage on Unarmed, melee, or ranged attacks until the end of your next turn after hitting an enemy with two Unarmed, melee, or ranged attacks."
  },
  "attack_combo_melee": {
    "name": "Attack Combo (Melee)",
    "prerequisite": "Base Attack Bonus +3",
    "benefit": "Deal +1 die of damage on Unarmed or melee attacks until the end of your next turn after hitting an enemy with two Unarmed or melee attacks.",
    "description": "Deal +1 die of damage on Unarmed or melee attacks until the end of your next turn after hitting an enemy with two Unarmed or melee attacks."
  },
  "attack_combo_ranged": {
    "name": "Attack Combo (Ranged)",
    "prerequisite": "Base Attack Bonus +3",
    "benefit": "Deal +1 die of damage on ranged attacks until the end of your next turn after hitting an enemy with two ranged attacks.",
    "description": "Deal +1 die of damage on ranged attacks until the end of your next turn after hitting an enemy with two ranged attacks."
  },
  "autofire_assault": {
    "name": "Autofire Assault",
    "prerequisite": "Weapon Focus (Chosen Weapon)",
    "benefit": "Decrease penalty on Autofire attack and inflict extra damage when sustaining fire in the same squares in consecutive rounds.",
    "description": "Decrease penalty on Autofire attack and inflict extra damage when sustaining fire in the same squares in consecutive rounds."
  },
  "autofire_sweep": {
    "name": "Autofire Sweep",
    "prerequisite": "Weapon Focus (Chosen Weapon)",
    "benefit": "Sweep a wide area while using Autofire mode.",
    "description": "Sweep a wide area while using Autofire mode."
  },
  "biotech_specialist": {
    "name": "Biotech Specialist",
    "prerequisite": "Trained in Mechanics",
    "benefit": "Make custom modifications to Yuuzhan Vong Biotech.",
    "description": "Make custom modifications to Yuuzhan Vong Biotech."
  },
  "biotech_surgery": {
    "name": "Biotech Surgery",
    "prerequisite": "Trained in Treat Injury",
    "benefit": "Install a Bio-Implant on a living being.",
    "description": "Install a Bio-Implant on a living being."
  },
  "brink_of_death": {
    "name": "Brink of Death",
    "prerequisite": "None",
    "benefit": "Attacks that would kill your enemy reduces them to 0 Hit Points instead.",
    "description": "Attacks that would kill your enemy reduces them to 0 Hit Points instead."
  },
  "fatal_hit": {
    "name": "Fatal Hit",
    "prerequisite": "Strength 13, Dexterity 13",
    "benefit": "You automatically kill an enemy that you reduce to 0 Hit Points, and you can perform a Coup de Grace as a Standard Action.",
    "description": "You automatically kill an enemy that you reduce to 0 Hit Points, and you can perform a Coup de Grace as a Standard Action."
  },
  "feat_of_strength": {
    "name": "Feat of Strength",
    "prerequisite": "Strength 15",
    "benefit": "Take 10 or Take 20 on one Strength check or related Skill Check per encounter.",
    "description": "Take 10 or Take 20 on one Strength check or related Skill Check per encounter."
  },
  "galactic_alliance_military_training": {
    "name": "Galactic Alliance Military Training",
    "prerequisite": "None",
    "benefit": "You do not move down the Condition Track the first time an attack exceeds your Damage Threshold.",
    "description": "You do not move down the Condition Track the first time an attack exceeds your Damage Threshold."
  },
  "grapple_resistance": {
    "name": "Grapple Resistance",
    "prerequisite": "None",
    "benefit": "Gain a +5 bonus to resist Grab and Grapple attacks.",
    "description": "Gain a +5 bonus to resist Grab and Grapple attacks."
  },
  "knock_heads": {
    "name": "Knock Heads",
    "prerequisite": "Dexterity 13, Strength 13, Multi-Grab",
    "benefit": "You may knock two opponents' heads together after a successful Multi-Grab.",
    "description": "You may knock two opponents' heads together after a successful Multi-Grab."
  },
  "multi_grab": {
    "name": "Multi-Grab",
    "prerequisite": "Dexterity 13",
    "benefit": "You may Grab two opponents as a Standard Action.",
    "description": "You may Grab two opponents as a Standard Action."
  },
  "rancor_crush": {
    "name": "Rancor Crush",
    "prerequisite": "Strength 15, Crush, Pin, Base Attack Bonus +1",
    "benefit": "Move an enemy -1 step down the Condition Track when using the Crush feat.",
    "description": "Move an enemy -1 step down the Condition Track when using the Crush feat."
  },
  "return_fire": {
    "name": "Return Fire",
    "prerequisite": "Dexterity 15, Quick Draw, Weapon Focus (Chosen Weapon)",
    "benefit": "You may make a single ranged attack as a Reaction to a ranged attack against you that misses.",
    "description": "You may make a single ranged attack as a Reaction to a ranged attack against you that misses."
  },
  "returning_bug": {
    "name": "Returning Bug",
    "prerequisite": "Weapon Proficiency (Simple Weapons)",
    "benefit": "Thrown Razor Bugs and Thud Bugs return to your hand immediately.",
    "description": "Thrown Razor Bugs and Thud Bugs return to your hand immediately."
  },
  "vehicle_systems_expertise": {
    "name": "Vehicle Systems Expertise",
    "prerequisite": "Tech Specialist, Trained in Mechanics",
    "benefit": "Recharge Shields or Reroute Power on a Vehicle faster than normal.",
    "description": "Recharge Shields or Reroute Power on a Vehicle faster than normal."
  },
  "zero_range": {
    "name": "Zero Range",
    "prerequisite": "Point-Blank Shot",
    "benefit": "Gain a +1 bonus on your attack roll and deal +1 die of damage when making a ranged attack against an adjacent target or a target in your Fighting Space.",
    "description": "Gain a +1 bonus on your attack roll and deal +1 die of damage when making a ranged attack against an adjacent target or a target in your Fighting Space."
  },
  "follow_through": {
    "name": "Follow Through",
    "prerequisite": "None",
    "benefit": "Move when you reduce an enemy to 0 Hit Points.",
    "description": "Move when you reduce an enemy to 0 Hit Points."
  },
  "force_regimen_mastery": {
    "name": "Force Regimen Mastery",
    "prerequisite": "Force Sensitivity, Trained in Use the Force",
    "benefit": "Learn a number of Force Regimens equal to 1 + your Wisdom modifier (minimum of 1).",
    "description": "Learn a number of Force Regimens equal to 1 + your Wisdom modifier (minimum of 1)."
  },
  "long_haft_strike": {
    "name": "Long Haft Strike",
    "prerequisite": "None",
    "benefit": "You can wield a long-handled weapon as a Double Weapon.",
    "description": "You can wield a long-handled weapon as a Double Weapon."
  },
  "relentless_attack": {
    "name": "Relentless Attack",
    "prerequisite": "Double Attack (Chosen Weapon)",
    "benefit": "Gain a bonus on attack rolls after missing a target.",
    "description": "Gain a bonus on attack rolls after missing a target."
  },
  "unswerving_resolve": {
    "name": "Unswerving Resolve",
    "prerequisite": "Base Attack Bonus +2",
    "benefit": "Whenever you resist a Fear or Mind-Affecting effect, you gain a temporary Force Point.",
    "description": "Whenever you resist a Fear or Mind-Affecting effect, you gain a temporary Force Point."
  },
  "assured_attack": {
    "name": "Assured Attack",
    "prerequisite": "None",
    "benefit": "Reroll the lowest damage die when making a successful attack.",
    "description": "Reroll the lowest damage die when making a successful attack."
  },
  "deft_charge": {
    "name": "Deft Charge",
    "prerequisite": "None",
    "benefit": "Take Swift Actions, Reactions, and Free Actions after you Charge before your turn ends.",
    "description": "Take Swift Actions, Reactions, and Free Actions after you Charge before your turn ends."
  },
  "fast_surge": {
    "name": "Fast Surge",
    "prerequisite": "None",
    "benefit": "Catch a Second Wind as a Free Action on your turn.",
    "description": "Catch a Second Wind as a Free Action on your turn."
  },
  "imperial_military_training": {
    "name": "Imperial Military Training",
    "prerequisite": "None",
    "benefit": "Negate one Mind-Affecting effect per encounter.",
    "description": "Negate one Mind-Affecting effect per encounter."
  },
  "moving_target": {
    "name": "Moving Target",
    "prerequisite": "Dodge",
    "benefit": "Gain a bonus to Reflex Defense when you remain mobile.",
    "description": "Gain a bonus to Reflex Defense when you remain mobile."
  },
  "prime_shot": {
    "name": "Prime Shot",
    "prerequisite": "Point-Blank Shot",
    "benefit": "Gain a bonus to attack rolls when closer to your target than your allies.",
    "description": "Gain a bonus to attack rolls when closer to your target than your allies."
  },
  "rapid_reaction": {
    "name": "Rapid Reaction",
    "prerequisite": "None",
    "benefit": "React twice to the same trigger once per encounter.",
    "description": "React twice to the same trigger once per encounter."
  },
  "rebel_military_training": {
    "name": "Rebel Military Training",
    "prerequisite": "Running Attack",
    "benefit": "Gain a dodge bonus to Reflex Defense when using Running Attack.",
    "description": "Gain a dodge bonus to Reflex Defense when using Running Attack."
  },
  "recovering_surge": {
    "name": "Recovering Surge",
    "prerequisite": "None",
    "benefit": "Move up the Condition Track when you catch a Second Wind.",
    "description": "Move up the Condition Track when you catch a Second Wind."
  },
  "unstoppable_combatant": {
    "name": "Unstoppable Combatant",
    "prerequisite": "Extra Second Wind",
    "benefit": "Catch more than one Second Wind in an encounter.",
    "description": "Catch more than one Second Wind in an encounter."
  },
  "vehicular_surge": {
    "name": "Vehicular Surge",
    "prerequisite": "Trained in Pilot",
    "benefit": "Once per day, gain Bonus Hit Points for a Vehicle you Pilot.",
    "description": "Once per day, gain Bonus Hit Points for a Vehicle you Pilot."
  },
  "vitality_surge": {
    "name": "Vitality Surge",
    "prerequisite": "Extra Second Wind",
    "benefit": "Catch a Second Wind even when not at or below half Hit Points.",
    "description": "Catch a Second Wind even when not at or below half Hit Points."
  },
  "bantha_herder": {
    "name": "Bantha Herder",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Move a target damaged by your attack.",
    "description": "Move a target damaged by your attack."
  },
  "battering_attack": {
    "name": "Battering Attack",
    "prerequisite": "Bantha Rush, Trip",
    "benefit": "Knock an opponent Prone when you use Bantha Rush.",
    "description": "Knock an opponent Prone when you use Bantha Rush."
  },
  "destructive_force": {
    "name": "Destructive Force",
    "prerequisite": "None",
    "benefit": "Deal damage to adjacent targets when you damage objects and Vehicles.",
    "description": "Deal damage to adjacent targets when you damage objects and Vehicles."
  },
  "disabler": {
    "name": "Disabler",
    "prerequisite": "None",
    "benefit": "Gain benefits when using certain Ion weapons.",
    "description": "Gain benefits when using certain Ion weapons."
  },
  "dive_for_cover": {
    "name": "Dive for Cover",
    "prerequisite": "Trained in Jump",
    "benefit": "Jump for Cover as a Reaction.",
    "description": "Jump for Cover as a Reaction."
  },
  "fight_through_pain": {
    "name": "Fight Through Pain",
    "prerequisite": "None",
    "benefit": "Use your Will Defense to determine your Damage Threshold.",
    "description": "Use your Will Defense to determine your Damage Threshold."
  },
  "forceful_blast": {
    "name": "Forceful Blast",
    "prerequisite": "Weapon Proficiency (Simple Weapons), Base Attack Bonus +1",
    "benefit": "Move a target damaged by your Grenade attack.",
    "description": "Move a target damaged by your Grenade attack."
  },
  "force_of_personality": {
    "name": "Force of Personality",
    "prerequisite": "Charisma 13",
    "benefit": "Use Wisdom or Charisma to determine Will Defense.",
    "description": "Use Wisdom or Charisma to determine Will Defense."
  },
  "fortifying_recovery": {
    "name": "Fortifying Recovery",
    "prerequisite": "Constitution 13",
    "benefit": "Gain Bonus Hit Points when you Recover.",
    "description": "Gain Bonus Hit Points when you Recover."
  },
  "mission_specialist": {
    "name": "Mission Specialist",
    "prerequisite": "None",
    "benefit": "Grant bonus to allies' Untrained Skill Checks with a particular Skill.",
    "description": "Grant bonus to allies' Untrained Skill Checks with a particular Skill."
  },
  "never_surrender": {
    "name": "Never Surrender",
    "prerequisite": "Trained in Endurance",
    "benefit": "Make an Endurance check to prevent falling to 0 Hit Points.",
    "description": "Make an Endurance check to prevent falling to 0 Hit Points."
  },
  "officer_candidacy_training": {
    "name": "Officer Candidacy Training",
    "prerequisite": "None",
    "benefit": "Gain a bonus to your Rank and Privilege Score.",
    "description": "Gain a bonus to your Rank and Privilege Score."
  },
  "opportunistic_shooter": {
    "name": "Opportunistic Shooter",
    "prerequisite": "None",
    "benefit": "Gain a bonus to Attacks of Opportunity with ranged weapons.",
    "description": "Gain a bonus to Attacks of Opportunity with ranged weapons."
  },
  "pistoleer": {
    "name": "Pistoleer",
    "prerequisite": "Weapon Proficiency (Pistols)",
    "benefit": "Gain benefits when using certain Pistols.",
    "description": "Gain benefits when using certain Pistols."
  },
  "predictive_defense": {
    "name": "Predictive Defense",
    "prerequisite": "Intelligence 13",
    "benefit": "Use Dexterity or Intelligence to determine Reflex Defense.",
    "description": "Use Dexterity or Intelligence to determine Reflex Defense."
  },
  "resilient_strength": {
    "name": "Resilient Strength",
    "prerequisite": "Strength 13",
    "benefit": "Use Strength or Constitution to determine Fortitude Defense.",
    "description": "Use Strength or Constitution to determine Fortitude Defense."
  },
  "riflemaster": {
    "name": "Riflemaster",
    "prerequisite": "Weapon Proficiency (Rifles)",
    "benefit": "Gain benefits when using certain Rifles.",
    "description": "Gain benefits when using certain Rifles."
  },
  "risk_taker": {
    "name": "Risk Taker",
    "prerequisite": "Trained in Climb or Jump",
    "benefit": "Improve your chances of success with Climb or Jump checks.",
    "description": "Improve your chances of success with Climb or Jump checks."
  },
  "sport_hunter": {
    "name": "Sport Hunter",
    "prerequisite": "Weapon Proficiency (Pistols) or Weapon Proficiency (Rifles)",
    "benefit": "Gain benefits with certain slugthrowers and sporting weapons.",
    "description": "Gain benefits with certain slugthrowers and sporting weapons."
  },
  "steadying_position": {
    "name": "Steadying Position",
    "prerequisite": "Careful Shot",
    "benefit": "Deny target's Dexterity bonus to Reflex Defense when you are Prone and Aiming.",
    "description": "Deny target's Dexterity bonus to Reflex Defense when you are Prone and Aiming."
  },
  "aiming_accuracy": {
    "name": "Aiming Accuracy",
    "prerequisite": "Droid, Point-Blank Shot, Precise Shot",
    "benefit": "After aiming as a Full-Round Action, gain a +5 on next weapon attack.",
    "description": "After aiming as a Full-Round Action, gain a +5 on next weapon attack."
  },
  "damage_conversion": {
    "name": "Damage Conversion",
    "prerequisite": "Droid, Dexterity 13",
    "benefit": "Take additional Hit Point damage instead of moving down the Condition Track.",
    "description": "Take additional Hit Point damage instead of moving down the Condition Track."
  },
  "distracting_droid": {
    "name": "Distracting Droid",
    "prerequisite": "Droid",
    "benefit": "Attempt to deny enemies within 6 squares their next Move Action, with a chance to make enemies Flat-Footed.",
    "description": "Attempt to deny enemies within 6 squares their next Move Action, with a chance to make enemies Flat-Footed."
  },
  "droid_focus": {
    "name": "Droid Focus",
    "prerequisite": "Trained in Mechanics and Use Computer",
    "benefit": "+1 bonus to certain Skills and Defenses when dealing with a selected class of Droid.",
    "description": "+1 bonus to certain Skills and Defenses when dealing with a selected class of Droid."
  },
  "droid_shield_mastery": {
    "name": "Droid Shield Mastery",
    "prerequisite": "Droid, Shield Generator (Droid Accessory)",
    "benefit": "Automatically Recharge Shields in two Swift Actions.",
    "description": "Automatically Recharge Shields in two Swift Actions."
  },
  "erratic_target": {
    "name": "Erratic Target",
    "prerequisite": "Droid with Hovering or Flying Locomotion, Dexterity 13, Dodge",
    "benefit": "Reduce Speed by up to 2 squares to increase dodge bonus to Reflex Defense.",
    "description": "Reduce Speed by up to 2 squares to increase dodge bonus to Reflex Defense."
  },
  "ion_shielding": {
    "name": "Ion Shielding",
    "prerequisite": "Droid with Strength 13 or Cyborg Hybrid with Constitution 13",
    "benefit": "Move only -1 step on Condition Track when Ion damage exceeds Damage Threshold.",
    "description": "Move only -1 step on Condition Track when Ion damage exceeds Damage Threshold."
  },
  "logic_upgrade_skill_swap": {
    "name": "Logic Upgrade: Skill Swap",
    "prerequisite": "Droid, Basic Processor",
    "benefit": "Swap a Trained Skill for an Untrained Skill on the fly.",
    "description": "Swap a Trained Skill for an Untrained Skill on the fly."
  },
  "mechanical_martial_arts": {
    "name": "Mechanical Martial Arts",
    "prerequisite": "Droid, Martial Arts I, Base Attack Bonus +1",
    "benefit": "Give an enemy a -5 penalty on attack and damage rolls for one round after striking it in Unarmed combat.",
    "description": "Give an enemy a -5 penalty on attack and damage rolls for one round after striking it in Unarmed combat."
  },
  "multi_targeting": {
    "name": "Multi-Targeting",
    "prerequisite": "Droid, Intelligence 13",
    "benefit": "You can spread your Aim action across multiple consecutive rounds.",
    "description": "You can spread your Aim action across multiple consecutive rounds."
  },
  "pincer": {
    "name": "Pincer",
    "prerequisite": "Droid with Claw or Hand Appendage, Base Attack Bonus +1, Pin, Crush",
    "benefit": "Maintain Pin feat and make subsequent Grapple checks as a Swift Action. Apply Crush to each check.",
    "description": "Maintain Pin feat and make subsequent Grapple checks as a Swift Action. Apply Crush to each check."
  },
  "pinpoint_accuracy": {
    "name": "Pinpoint Accuracy",
    "prerequisite": "Droid, Aiming Accuracy, Point-Blank Shot, Precise Shot",
    "benefit": "Move target -1 step on the Condition Track when you hit with Aiming Accuracy.",
    "description": "Move target -1 step on the Condition Track when you hit with Aiming Accuracy."
  },
  "sensor_link": {
    "name": "Sensor Link",
    "prerequisite": "Droid or Cyborg Hybrid",
    "benefit": "Share sensor data instantly with an ally.",
    "description": "Share sensor data instantly with an ally."
  },
  "shield_surge": {
    "name": "Shield Surge",
    "prerequisite": "Droid or Cyborg Hybrid, Trained in Mechanics",
    "benefit": "Trade Vehicle's Shield Rating for damage taken.",
    "description": "Trade Vehicle's Shield Rating for damage taken."
  },
  "slammer": {
    "name": "Slammer",
    "prerequisite": "Small or larger Droid with 2+ Appendages, Strength 13",
    "benefit": "Double Strength bonus to damage rolls on this special melee attack.",
    "description": "Double Strength bonus to damage rolls on this special melee attack."
  },
  "tool_frenzy": {
    "name": "Tool Frenzy",
    "prerequisite": "Small or larger Droid with 2+ Tool Appendages",
    "benefit": "Gain +2 to attack rolls and damage rolls with nonweapon Appendages in exchange for a -2 penalty to Reflex Defense.",
    "description": "Gain +2 to attack rolls and damage rolls with nonweapon Appendages in exchange for a -2 penalty to Reflex Defense."
  },
  "turn_and_burn": {
    "name": "Turn and Burn",
    "prerequisite": "Droid with Hovering, Flying, Wheeled, or Tracked Locomotion; Dexterity 13",
    "benefit": "Withdraw by clearing threatened squares in up to 2 squares of movement, move your Speed when using the Withdraw Action. Withdraw as a Reaction by spending a Force Point.",
    "description": "Withdraw by clearing threatened squares in up to 2 squares of movement, move your Speed when using the Withdraw Action. Withdraw as a Reaction by spending a Force Point."
  },
  "adaptable_talent": {
    "name": "Adaptable Talent",
    "prerequisite": "None",
    "benefit": "Temporarily gain access to an additional Talent.",
    "description": "Temporarily gain access to an additional Talent."
  },
  "bone_crusher": {
    "name": "Bone Crusher",
    "prerequisite": "Crush, Pin",
    "benefit": "Move damaged Grappled opponent -1 step on the Condition Track.",
    "description": "Move damaged Grappled opponent -1 step on the Condition Track."
  },
  "brilliant_defense": {
    "name": "Brilliant Defense",
    "prerequisite": "Intelligence 13",
    "benefit": "Add your Intelligence bonus to your Reflex Defense as a Reaction.",
    "description": "Add your Intelligence bonus to your Reflex Defense as a Reaction."
  },
  "channel_rage": {
    "name": "Channel Rage",
    "prerequisite": "Rage Species Trait",
    "benefit": "Instead of Raging, gain +5 to Will Defense.",
    "description": "Instead of Raging, gain +5 to Will Defense."
  },
  "cut_the_red_tape": {
    "name": "Cut the Red Tape",
    "prerequisite": "Trained in Knowledge (Bureaucracy)",
    "benefit": "Use Knowledge (Bureaucracy) in place of Gather Information.",
    "description": "Use Knowledge (Bureaucracy) in place of Gather Information."
  },
  "demoralizing_strike": {
    "name": "Demoralizing Strike",
    "prerequisite": "Charisma 13",
    "benefit": "Make an Intimidation check when you deal damage with an Attack of Opportunity.",
    "description": "Make an Intimidation check when you deal damage with an Attack of Opportunity."
  },
  "disturbing_presence": {
    "name": "Disturbing Presence",
    "prerequisite": "Trained in Deception",
    "benefit": "Make a Deception check to move through a Threatened Area without provoking Attacks of Opportunity.",
    "description": "Make a Deception check to move through a Threatened Area without provoking Attacks of Opportunity."
  },
  "expert_briber": {
    "name": "Expert Briber",
    "prerequisite": "Charisma 13",
    "benefit": "Reduce the time and cost of Bribery attempts.",
    "description": "Reduce the time and cost of Bribery attempts."
  },
  "fl_che": {
    "name": "Flèche",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "When Charging, turn any natural attack roll of 17+ into a Critical Hit.",
    "description": "When Charging, turn any natural attack roll of 17+ into a Critical Hit."
  },
  "forceful_recovery": {
    "name": "Forceful Recovery",
    "prerequisite": "Force Sensitivity, Force Training",
    "benefit": "Regain one Force Power when you catch a Second Wind.",
    "description": "Regain one Force Power when you catch a Second Wind."
  },
  "grazing_shot": {
    "name": "Grazing Shot",
    "prerequisite": "Point-Blank Shot",
    "benefit": "Strike two targets in direct line of sight, dealing half damage to each.",
    "description": "Strike two targets in direct line of sight, dealing half damage to each."
  },
  "hobbling_strike": {
    "name": "Hobbling Strike",
    "prerequisite": "Sneak Attack or Rapid Shot or Rapid Strike",
    "benefit": "Reduce the target's Speed instead of dealing damage.",
    "description": "Reduce the target's Speed instead of dealing damage."
  },
  "improved_opportunistic_trickery": {
    "name": "Improved Opportunistic Trickery",
    "prerequisite": "Combat Reflexes, Opportunistic Trickery",
    "benefit": "Sacrifice Attack of Opportunity to reduce target's Reflex Defense by 5.",
    "description": "Sacrifice Attack of Opportunity to reduce target's Reflex Defense by 5."
  },
  "indomitable_personality": {
    "name": "Indomitable Personality",
    "prerequisite": "Charisma 13",
    "benefit": "Add your Charisma bonus to your Will Defense as a Reaction.",
    "description": "Add your Charisma bonus to your Will Defense as a Reaction."
  },
  "master_of_disguise": {
    "name": "Master of Disguise",
    "prerequisite": "Trained in Deception, Charisma 13",
    "benefit": "Gain +5 to creating a Deceptive Appearance or a Forged Document, and reduce the penalty for rushing.",
    "description": "Gain +5 to creating a Deceptive Appearance or a Forged Document, and reduce the penalty for rushing."
  },
  "meat_shield": {
    "name": "Meat Shield",
    "prerequisite": "Point-Blank Shot, Precise Shot, Base Attack Bonus +4",
    "benefit": "Gain Cover bonus equal to opponent's Cover bonus.",
    "description": "Gain Cover bonus equal to opponent's Cover bonus."
  },
  "opportunistic_trickery": {
    "name": "Opportunistic Trickery",
    "prerequisite": "Combat Reflexes, Sneak Attack",
    "benefit": "Sacrifice Attack of Opportunity to reduce target's Reflex Defense by 2.",
    "description": "Sacrifice Attack of Opportunity to reduce target's Reflex Defense by 2."
  },
  "recurring_success": {
    "name": "Recurring Success",
    "prerequisite": "None",
    "benefit": "Gain extra use of a 1/encounter Talent or Feat.",
    "description": "Gain extra use of a 1/encounter Talent or Feat."
  },
  "resolute_stance": {
    "name": "Resolute Stance",
    "prerequisite": "Base Attack Bonus +1",
    "benefit": "Gain +2 or +5 to Will Defense when you Fight Defensively.",
    "description": "Gain +2 or +5 to Will Defense when you Fight Defensively."
  },
  "sadistic_strike": {
    "name": "Sadistic Strike",
    "prerequisite": "None",
    "benefit": "Move opponents -1 step on the Condition Track when you deliver a Coup de Grace.",
    "description": "Move opponents -1 step on the Condition Track when you deliver a Coup de Grace."
  },
  "silver_tongue": {
    "name": "Silver Tongue",
    "prerequisite": "Trained in Persuasion",
    "benefit": "Intimidate a creature or change its Attitude as a Standard Action.",
    "description": "Intimidate a creature or change its Attitude as a Standard Action."
  },
  "skill_challenge_catastrophic_avoidance": {
    "name": "Skill Challenge: Catastrophic Avoidance",
    "prerequisite": "None",
    "benefit": "Catastrophic Failures in a Skill Challenge occur less frequently, and with milder results.",
    "description": "Catastrophic Failures in a Skill Challenge occur less frequently, and with milder results."
  },
  "skill_challenge_last_resort": {
    "name": "Skill Challenge: Last Resort",
    "prerequisite": "None",
    "benefit": "Reroll a third failed Skill Check during a Skill Challenge, keeping the better result.",
    "description": "Reroll a third failed Skill Check during a Skill Challenge, keeping the better result."
  },
  "skill_challenge_recovery": {
    "name": "Skill Challenge: Recovery",
    "prerequisite": "None",
    "benefit": "Treat a Skill Challenge as if it had the Recovery effect.",
    "description": "Treat a Skill Challenge as if it had the Recovery effect."
  },
  "stand_tall": {
    "name": "Stand Tall",
    "prerequisite": "None",
    "benefit": "When you take damage, nearby allies attack your attacker.",
    "description": "When you take damage, nearby allies attack your attacker."
  },
  "wookiee_grip": {
    "name": "Wookiee Grip",
    "prerequisite": "Strength 13",
    "benefit": "Wield two-handed weapons in a single hand.",
    "description": "Wield two-handed weapons in a single hand."
  },
  "acrobatic_ally": {
    "name": "Acrobatic Ally",
    "prerequisite": "Dexterity 13, Strength 13, Trained in Acrobatics",
    "benefit": "Hoist or toss an ally of your size or smaller up to 2 squares.",
    "description": "Hoist or toss an ally of your size or smaller up to 2 squares."
  },
  "acrobatic_dodge": {
    "name": "Acrobatic Dodge",
    "prerequisite": "Dexterity 13, Mobility, Skill Focus (Acrobatics)",
    "benefit": "When a melee attack misses you, move into an adjacent square without provoking an Attack of Opportunity.",
    "description": "When a melee attack misses you, move into an adjacent square without provoking an Attack of Opportunity."
  },
  "combat_trickery": {
    "name": "Combat Trickery",
    "prerequisite": "Trained in Deception",
    "benefit": "Spend two Swift Actions to make Deception check to make enemy Flat-Footed.",
    "description": "Spend two Swift Actions to make Deception check to make enemy Flat-Footed."
  },
  "elders_knowledge": {
    "name": "Elder's Knowledge",
    "prerequisite": "Skill Focus (Knowledge (Social Sciences)) or Skill Focus (Knowledge (Galactic Lore))",
    "benefit": "Substitute a Knowledge (Social Sciences) or Knowledge (Galactic Lore) skill check for a Wisdom-related Skill Check.",
    "description": "Substitute a Knowledge (Social Sciences) or Knowledge (Galactic Lore) skill check for a Wisdom-related Skill Check."
  },
  "frightening_cleave": {
    "name": "Frightening Cleave",
    "prerequisite": "Strength 13, Cleave, Power Attack, Base Attack Bonus +4",
    "benefit": "When you use the Cleave feat, each enemy within 6 squares and line of sight takes a penalty to Reflex Defense, Skill Checks, and attack rolls against you.",
    "description": "When you use the Cleave feat, each enemy within 6 squares and line of sight takes a penalty to Reflex Defense, Skill Checks, and attack rolls against you."
  },
  "grab_back": {
    "name": "Grab Back",
    "prerequisite": "Dexterity 13",
    "benefit": "As a Reaction, make a Grab or Grapple attack following a failed Grab or Grapple attack made against you.",
    "description": "As a Reaction, make a Grab or Grapple attack following a failed Grab or Grapple attack made against you."
  },
  "halt": {
    "name": "Halt",
    "prerequisite": "Trip, Weapon Focus (Chosen Weapon), Base Attack Bonus +8",
    "benefit": "Knock an enemy Prone after a successful Attack of Opportunity, immediately end the target's remaining Actions when also exceeding its Damage Threshold.",
    "description": "Knock an enemy Prone after a successful Attack of Opportunity, immediately end the target's remaining Actions when also exceeding its Damage Threshold."
  },
  "heavy_hitter": {
    "name": "Heavy Hitter",
    "prerequisite": "Weapon Focus (Heavy Weapons)",
    "benefit": "Add +1 point of damage for every 5 points rolled above the target's Reflex Defense, plus additional benefits when you exceed the target's Damage Threshold.",
    "description": "Add +1 point of damage for every 5 points rolled above the target's Reflex Defense, plus additional benefits when you exceed the target's Damage Threshold."
  },
  "hold_together": {
    "name": "Hold Together",
    "prerequisite": "Trained in Mechanics",
    "benefit": "Delay the damage caused to a Vehicle until the end of the round.",
    "description": "Delay the damage caused to a Vehicle until the end of the round."
  },
  "hyperblazer": {
    "name": "Hyperblazer",
    "prerequisite": "Trained in Use Computer",
    "benefit": "Cut all calculation time and Use Computer penalties by half when making Use Computer checks for Astrogation in the Hyperspace tangle. Reduce Hyperspace mapping time by half.",
    "description": "Cut all calculation time and Use Computer penalties by half when making Use Computer checks for Astrogation in the Hyperspace tangle. Reduce Hyperspace mapping time by half."
  },
  "improved_sleight_of_hand": {
    "name": "Improved Sleight of Hand",
    "prerequisite": "Dexterity 15, Skill Focus (Deception), Trained in Stealth",
    "benefit": "Use Deception to aid your Stealth check to use Sleight of Hand; use Stealth to draw and palm a weapon simultaneously.",
    "description": "Use Deception to aid your Stealth check to use Sleight of Hand; use Stealth to draw and palm a weapon simultaneously."
  },
  "improvised_weapon_mastery": {
    "name": "Improvised Weapon Mastery",
    "prerequisite": "Weapon Proficiency (Simple Weapons)",
    "benefit": "Treat Improvised Weapons as Simple Weapons, deal +1d6 points of damage.",
    "description": "Treat Improvised Weapons as Simple Weapons, deal +1d6 points of damage."
  },
  "instinctive_attack": {
    "name": "Instinctive Attack",
    "prerequisite": "Non-Droid",
    "benefit": "Spend a Force Point to reroll an attack and take the better result.",
    "description": "Spend a Force Point to reroll an attack and take the better result."
  },
  "instinctive_defense": {
    "name": "Instinctive Defense",
    "prerequisite": "Non-Droid",
    "benefit": "Spend a Force Point to increase all Defenses by +2 for 1 round.",
    "description": "Spend a Force Point to increase all Defenses by +2 for 1 round."
  },
  "intimidator": {
    "name": "Intimidator",
    "prerequisite": "Trained in Persuasion",
    "benefit": "When you successfully Intimidate, enemy takes -5 to Skill Checks and -2 to attack for one round.",
    "description": "When you successfully Intimidate, enemy takes -5 to Skill Checks and -2 to attack for one round."
  },
  "maniacal_charge": {
    "name": "Maniacal Charge",
    "prerequisite": "None",
    "benefit": "Intimidate your enemies when Charging, preventing adjacent characters from making Attacks of Opportunity and denying your target its Dexterity bonus.",
    "description": "Intimidate your enemies when Charging, preventing adjacent characters from making Attacks of Opportunity and denying your target its Dexterity bonus."
  },
  "mounted_combat": {
    "name": "Mounted Combat",
    "prerequisite": "Trained in Ride",
    "benefit": "Increase Speed and avoid attacks when riding a Mount.",
    "description": "Increase Speed and avoid attacks when riding a Mount."
  },
  "nikto_survival": {
    "name": "Nikto Survival",
    "prerequisite": "Nikto",
    "benefit": "Reroll Survival checks in native environment.",
    "description": "Reroll Survival checks in native environment."
  },
  "targeted_area": {
    "name": "Targeted Area",
    "prerequisite": "Base Attack Bonus +5",
    "benefit": "Deal an additional 5 points of damage against one target within a successful Area Attack.",
    "description": "Deal an additional 5 points of damage against one target within a successful Area Attack."
  },
  "trample": {
    "name": "Trample",
    "prerequisite": "Trained in Ride",
    "benefit": "When using the Mounted Charge Action, attack enemies between you and your target.",
    "description": "When using the Mounted Charge Action, attack enemies between you and your target."
  },
  "wilderness_first_aid": {
    "name": "Wilderness First Aid",
    "prerequisite": "Trained in Survival",
    "benefit": "Use basic Survival skills as if you have a Medpac for Treat Injury checks.",
    "description": "Use basic Survival skills as if you have a Medpac for Treat Injury checks."
  },
  "dreadful_countenance": {
    "name": "Dreadful Countenance",
    "prerequisite": "Charisma 13, Member of The Sith",
    "benefit": "Marked as Sith, your appearance inspires awe, dread, and fear in all who view it.",
    "description": "Marked as Sith, your appearance inspires awe, dread, and fear in all who view it."
  },
  "rapid_assault": {
    "name": "Rapid Assault",
    "prerequisite": "Double Attack or Dual Weapon Mastery I, Base Attack Bonus +6",
    "benefit": "Through focus and raw determination, you can make multiple attacks even after moving.",
    "description": "Through focus and raw determination, you can make multiple attacks even after moving."
  },
  "hijkata_training": {
    "name": "Hijkata Training",
    "prerequisite": "Combat Reflexes, Martial Arts I",
    "benefit": "Make counterattacks. Impose penalties to enemy attacks.",
    "description": "Make counterattacks. Impose penalties to enemy attacks."
  },
  "ktara_training": {
    "name": "K'tara Training",
    "prerequisite": "Martial Arts I, Trained in Stealth",
    "benefit": "Deal extra damage against Flat-Footed enemy. Render target Mute.",
    "description": "Deal extra damage against Flat-Footed enemy. Render target Mute."
  },
  "kthri_training": {
    "name": "K'thri Training",
    "prerequisite": "Dual Weapon Mastery I, Martial Arts I",
    "benefit": "Make swift Unarmed attacks. Deal half damage on misses.",
    "description": "Make swift Unarmed attacks. Deal half damage on misses."
  },
  "stava_training": {
    "name": "Stava Training",
    "prerequisite": "Martial Arts I, Running Attack",
    "benefit": "Grab and Grapple as a larger creature. Grab after Charging.",
    "description": "Grab and Grapple as a larger creature. Grab after Charging."
  },
  "tae_jitsu_training": {
    "name": "Tae-Jitsu Training",
    "prerequisite": "Dodge, Martial Arts I, Trained in Initiative",
    "benefit": "Deal more damage on critical hits. Use Dodge against enemies.",
    "description": "Deal more damage on critical hits. Use Dodge against enemies."
  },
  "ter_s_k_si_training": {
    "name": "Teräs Käsi Training",
    "prerequisite": "Strength 13, Martial Arts I",
    "benefit": "Treat target's Damage Threshold as lower.",
    "description": "Treat target's Damage Threshold as lower."
  },
  "wrruushi_training": {
    "name": "Wrruushi Training",
    "prerequisite": "Constitution 13, Martial Arts I, Wookiee",
    "benefit": "Gain bonus hit points on Unarmed attacks. Deny target Equipment bonus.",
    "description": "Gain bonus hit points on Unarmed attacks. Deny target Equipment bonus."
  },
  "nimble_team": {
    "name": "Nimble Team",
    "prerequisite": "Trained in Acrobatics",
    "benefit": "Gain bonuses on Acrobatics checks when near allies.",
    "description": "Gain bonuses on Acrobatics checks when near allies."
  },
  "ascension_specialists": {
    "name": "Ascension Specialists",
    "prerequisite": "Trained in Climb",
    "benefit": "Gain bonuses on Climb checks when near allies.",
    "description": "Gain bonuses on Climb checks when near allies."
  },
  "tireless_squad": {
    "name": "Tireless Squad",
    "prerequisite": "Trained in Endurance",
    "benefit": "Gain bonuses on Endurance checks when near allies.",
    "description": "Gain bonuses on Endurance checks when near allies."
  },
  "unhindered_approach": {
    "name": "Unhindered Approach",
    "prerequisite": "Trained in Jump",
    "benefit": "Gain bonuses on Jump checks checks when near allies.",
    "description": "Gain bonuses on Jump checks checks when near allies."
  },
  "technical_experts": {
    "name": "Technical Experts",
    "prerequisite": "Trained in Mechanics",
    "benefit": "Gain bonuses on Mechanics checks when near allies.",
    "description": "Gain bonuses on Mechanics checks when near allies."
  },
  "wary_sentries": {
    "name": "Wary Sentries",
    "prerequisite": "Trained in Perception",
    "benefit": "Gain bonuses on Perception checks when near allies.",
    "description": "Gain bonuses on Perception checks when near allies."
  },
  "unified_squadron": {
    "name": "Unified Squadron",
    "prerequisite": "Trained in Pilot",
    "benefit": "Gain bonuses on Pilot checks checks when near allies.",
    "description": "Gain bonuses on Pilot checks checks when near allies."
  },
  "mounted_regiment": {
    "name": "Mounted Regiment",
    "prerequisite": "Trained in Ride",
    "benefit": "Gain bonuses on Ride checks when near allies.",
    "description": "Gain bonuses on Ride checks when near allies."
  },
  "covert_operatives": {
    "name": "Covert Operatives",
    "prerequisite": "Trained in Stealth",
    "benefit": "Gain bonuses on Stealth checks when near allies.",
    "description": "Gain bonuses on Stealth checks when near allies."
  },
  "wilderness_specialists": {
    "name": "Wilderness Specialists",
    "prerequisite": "Trained in Survival",
    "benefit": "Gain bonuses on Survival checks when near allies.",
    "description": "Gain bonuses on Survival checks when near allies."
  },
  "aquatic_specialists": {
    "name": "Aquatic Specialists",
    "prerequisite": "Trained in Swim",
    "benefit": "Gain bonuses on Swim checks when near allies.",
    "description": "Gain bonuses on Swim checks when near allies."
  },
  "medical_team": {
    "name": "Medical Team",
    "prerequisite": "Trained in Treat Injury",
    "benefit": "Gain bonuses on Treat Injury checks when near allies.",
    "description": "Gain bonuses on Treat Injury checks when near allies."
  },
  "slicer_team": {
    "name": "Slicer Team",
    "prerequisite": "Trained in Use Computer",
    "benefit": "Gain bonuses on Use Computer checks when near allies.",
    "description": "Gain bonuses on Use Computer checks when near allies."
  },
  "bothan_will": {
    "name": "Bothan Will",
    "prerequisite": "Bothan",
    "benefit": "Gain a bonus to Will Defense when an enemy fails to overcome your iron will.",
    "description": "Gain a bonus to Will Defense when an enemy fails to overcome your iron will."
  },
  "confident_success": {
    "name": "Confident Success",
    "prerequisite": "Bothan",
    "benefit": "Gain a Force Point when you successfully Learn Secret Information.",
    "description": "Gain a Force Point when you successfully Learn Secret Information."
  },
  "lasting_influence": {
    "name": "Lasting Influence",
    "prerequisite": "Bothan",
    "benefit": "After a successful Persuasion check, gain a bonus to future Persuasion checks.",
    "description": "After a successful Persuasion check, gain a bonus to future Persuasion checks."
  },
  "binary_mind": {
    "name": "Binary Mind",
    "prerequisite": "Cerean",
    "benefit": "Enemies must roll twice, keeping the lower result, on Mind-Affecting effects.",
    "description": "Enemies must roll twice, keeping the lower result, on Mind-Affecting effects."
  },
  "mind_of_reason": {
    "name": "Mind of Reason",
    "prerequisite": "Cerean",
    "benefit": "Use Wisdom instead of Intelligence for Intelligence-based Skill Checks.",
    "description": "Use Wisdom instead of Intelligence for Intelligence-based Skill Checks."
  },
  "perfect_intuition": {
    "name": "Perfect Intuition",
    "prerequisite": "Cerean",
    "benefit": "Reroll Initiative checks, always keeping the better result.",
    "description": "Reroll Initiative checks, always keeping the better result."
  },
  "flawless_pilot": {
    "name": "Flawless Pilot",
    "prerequisite": "Duros",
    "benefit": "Reroll Pilot checks, always keeping the better result.",
    "description": "Reroll Pilot checks, always keeping the better result."
  },
  "spacers_surge": {
    "name": "Spacer's Surge",
    "prerequisite": "Duros",
    "benefit": "Gain a temporary Force Point when you roll a Natural 20 on a Pilot check.",
    "description": "Gain a temporary Force Point when you roll a Natural 20 on a Pilot check."
  },
  "veteran_spacer": {
    "name": "Veteran Spacer",
    "prerequisite": "Duros",
    "benefit": "Gain a bonus to Use Computer checks made to Astrogate.",
    "description": "Gain a bonus to Use Computer checks made to Astrogate."
  },
  "ample_foraging": {
    "name": "Ample Foraging",
    "prerequisite": "Ewok",
    "benefit": "Grant a bonus to allies' Fortitude Defense by foraging.",
    "description": "Grant a bonus to allies' Fortitude Defense by foraging."
  },
  "forest_stalker": {
    "name": "Forest Stalker",
    "prerequisite": "Ewok",
    "benefit": "Reroll Stealth checks, always keeping the better result.",
    "description": "Reroll Stealth checks, always keeping the better result."
  },
  "keen_scent": {
    "name": "Keen Scent",
    "prerequisite": "Ewok",
    "benefit": "Increase the range of your Scent ability by 20 squares.",
    "description": "Increase the range of your Scent ability by 20 squares."
  },
  "increased_resistance": {
    "name": "Increased Resistance",
    "prerequisite": "Gamorrean",
    "benefit": "Gain a bonus to Fortitude Defense when an enemy fails to affect you.",
    "description": "Gain a bonus to Fortitude Defense when an enemy fails to affect you."
  },
  "primitive_warrior": {
    "name": "Primitive Warrior",
    "prerequisite": "Gamorrean",
    "benefit": "Deal +1 die of damage with Simple Weapons (Melee).",
    "description": "Deal +1 die of damage with Simple Weapons (Melee)."
  },
  "quick_comeback": {
    "name": "Quick Comeback",
    "prerequisite": "Gamorrean",
    "benefit": "Recover quickly after being moved down the Condition Track by damage.",
    "description": "Recover quickly after being moved down the Condition Track by damage."
  },
  "gungan_weapon_master": {
    "name": "Gungan Weapon Master",
    "prerequisite": "Gungan",
    "benefit": "Increase the die type when adding Force Points to attacks with an Atlatl or Cesta.",
    "description": "Increase the die type when adding Force Points to attacks with an Atlatl or Cesta."
  },
  "perfect_swimmer": {
    "name": "Perfect Swimmer",
    "prerequisite": "Gungan",
    "benefit": "Reroll Swim checks, always keeping the better result.",
    "description": "Reroll Swim checks, always keeping the better result."
  },
  "warrior_heritage": {
    "name": "Warrior Heritage",
    "prerequisite": "Gungan",
    "benefit": "Gain a bonus to Will Defense when using an Atlatl or Cesta.",
    "description": "Gain a bonus to Will Defense when using an Atlatl or Cesta."
  },
  "devastating_bellow": {
    "name": "Devastating Bellow",
    "prerequisite": "Ithorian",
    "benefit": "Deal more damage with your Bellow attacks.",
    "description": "Deal more damage with your Bellow attacks."
  },
  "nature_specialist": {
    "name": "Nature Specialist",
    "prerequisite": "Ithorian",
    "benefit": "Increase the die type when adding Force Points to a Knowledge (Life Sciences) check.",
    "description": "Increase the die type when adding Force Points to a Knowledge (Life Sciences) check."
  },
  "strong_bellow": {
    "name": "Strong Bellow",
    "prerequisite": "Ithorian",
    "benefit": "Use your Bellow ability without moving down the Condition Track.",
    "description": "Use your Bellow ability without moving down the Condition Track."
  },
  "justice_seeker": {
    "name": "Justice Seeker",
    "prerequisite": "Kel Dor",
    "benefit": "Gain a bonus to damage rolls against those who harm your allies.",
    "description": "Gain a bonus to damage rolls against those who harm your allies."
  },
  "read_the_winds": {
    "name": "Read the Winds",
    "prerequisite": "Kel Dor",
    "benefit": "Detect hidden enemies within 10 squares of you.",
    "description": "Detect hidden enemies within 10 squares of you."
  },
  "scion_of_dorin": {
    "name": "Scion of Dorin",
    "prerequisite": "Kel Dor",
    "benefit": "Gain a bonus to Fortitude Defense against Atmospheric Hazards.",
    "description": "Gain a bonus to Fortitude Defense against Atmospheric Hazards."
  },
  "fast_swimmer": {
    "name": "Fast Swimmer",
    "prerequisite": "Mon Calamari",
    "benefit": "Gain a bonus to your Swim Speed.",
    "description": "Gain a bonus to your Swim Speed."
  },
  "mon_calamari_shipwright": {
    "name": "Mon Calamari Shipwright",
    "prerequisite": "Mon Calamari",
    "benefit": "Reroute Power more quickly and without the risk of failure.",
    "description": "Reroute Power more quickly and without the risk of failure."
  },
  "sharp_senses": {
    "name": "Sharp Senses",
    "prerequisite": "Mon Calamari",
    "benefit": "Increase the die type when adding Force Points to a Perception check.",
    "description": "Increase the die type when adding Force Points to a Perception check."
  },
  "clawed_subspecies": {
    "name": "Clawed Subspecies",
    "prerequisite": "Quarren",
    "benefit": "Deal damage with sharp claws on Unarmed attacks.",
    "description": "Deal damage with sharp claws on Unarmed attacks."
  },
  "deep_sight": {
    "name": "Deep Sight",
    "prerequisite": "Quarren",
    "benefit": "Gain Darkvision and ignore Total Concealment from darkness.",
    "description": "Gain Darkvision and ignore Total Concealment from darkness."
  },
  "shrewd_bargainer": {
    "name": "Shrewd Bargainer",
    "prerequisite": "Quarren",
    "benefit": "Suppress opponents' insight and morale bonuses to Will Defense.",
    "description": "Suppress opponents' insight and morale bonuses to Will Defense."
  },
  "fringe_benefits": {
    "name": "Fringe Benefits",
    "prerequisite": "Rodian",
    "benefit": "Reduce the cost multiplier of goods bought on the Black Market.",
    "description": "Reduce the cost multiplier of goods bought on the Black Market."
  },
  "hunters_instincts": {
    "name": "Hunter's Instincts",
    "prerequisite": "Rodian",
    "benefit": "Reroll Perception checks, always keeping the better result.",
    "description": "Reroll Perception checks, always keeping the better result."
  },
  "master_tracker": {
    "name": "Master Tracker",
    "prerequisite": "Rodian",
    "benefit": "Increase the die type when adding Force Points to a Survival check.",
    "description": "Increase the die type when adding Force Points to a Survival check."
  },
  "darkness_dweller": {
    "name": "Darkness Dweller",
    "prerequisite": "Sullustan",
    "benefit": "Impose a penalty to Stealth checks made when close to you.",
    "description": "Impose a penalty to Stealth checks made when close to you."
  },
  "disarming_charm": {
    "name": "Disarming Charm",
    "prerequisite": "Sullustan",
    "benefit": "Gain a bonus to Skill Checks on targets whose Attitude you have improved.",
    "description": "Gain a bonus to Skill Checks on targets whose Attitude you have improved."
  },
  "sure_climber": {
    "name": "Sure Climber",
    "prerequisite": "Sullustan",
    "benefit": "Gain a Climb Speed of 4 squares.",
    "description": "Gain a Climb Speed of 4 squares."
  },
  "pitiless_warrior": {
    "name": "Pitiless Warrior",
    "prerequisite": "Trandoshan",
    "benefit": "Gain Bonus Hit Points whenever you take down a foe.",
    "description": "Gain Bonus Hit Points whenever you take down a foe."
  },
  "regenerative_healing": {
    "name": "Regenerative Healing",
    "prerequisite": "Trandoshan",
    "benefit": "Regain more Hit Points (but more slowly) when you catch a Second Wind.",
    "description": "Regain more Hit Points (but more slowly) when you catch a Second Wind."
  },
  "thick_skin": {
    "name": "Thick Skin",
    "prerequisite": "Trandoshan",
    "benefit": "Gain a +2 Species bonus to your Fortitude Defense.",
    "description": "Gain a +2 Species bonus to your Fortitude Defense."
  },
  "imperceptible_liar": {
    "name": "Imperceptible Liar",
    "prerequisite": "Twi'lek",
    "benefit": "Increase the die type when adding Force Points to a Deception check.",
    "description": "Increase the die type when adding Force Points to a Deception check."
  },
  "jedi_heritage": {
    "name": "Jedi Heritage",
    "prerequisite": "Twi'lek, Force Sensitivity",
    "benefit": "Gain extra Force Powers when you take the Force Training Feat.",
    "description": "Gain extra Force Powers when you take the Force Training Feat."
  },
  "survivor_of_ryloth": {
    "name": "Survivor of Ryloth",
    "prerequisite": "Twi'lek",
    "benefit": "Make Survival checks to resist Extreme Heat and Extreme Cold.",
    "description": "Make Survival checks to resist Extreme Heat and Extreme Cold."
  },
  "bowcaster_marksman": {
    "name": "Bowcaster Marksman",
    "prerequisite": "Wookiee",
    "benefit": "Gain a bonus to damage rolls when you spend a Force Point on a Bowcaster attack.",
    "description": "Gain a bonus to damage rolls when you spend a Force Point on a Bowcaster attack."
  },
  "resurgent_vitality": {
    "name": "Resurgent Vitality",
    "prerequisite": "Wookiee",
    "benefit": "Gain additional Hit Points when catching a Second Wind.",
    "description": "Gain additional Hit Points when catching a Second Wind."
  },
  "wroshyr_rage": {
    "name": "Wroshyr Rage",
    "prerequisite": "Wookiee",
    "benefit": "Gain Bonus Hit Points when Raging.",
    "description": "Gain Bonus Hit Points when Raging."
  },
  "inborn_resilience": {
    "name": "Inborn Resilience",
    "prerequisite": "Zabrak",
    "benefit": "Reduce one Defense bonus but increase another.",
    "description": "Reduce one Defense bonus but increase another."
  },
  "instinctive_perception": {
    "name": "Instinctive Perception",
    "prerequisite": "Zabrak",
    "benefit": "Gain a temporary Force Point when your Perception reroll is lower.",
    "description": "Gain a temporary Force Point when your Perception reroll is lower."
  },
  "unwavering_focus": {
    "name": "Unwavering Focus",
    "prerequisite": "Zabrak",
    "benefit": "Impose a penalty to Skill Checks for Mind-Affecting effects that target you.",
    "description": "Impose a penalty to Skill Checks for Mind-Affecting effects that target you."
  }
};

export { normalizeAuthorityKey };
