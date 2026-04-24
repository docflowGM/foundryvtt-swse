// Auto-generated from feats.txt and talents.txt.
// Canonical prerequisite/content authority for feat and talent hydration.

function normalizeAuthorityKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[‘’‛′']/g, '')
    .replace(/[‐-―]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

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

export const TALENT_PREREQUISITE_AUTHORITY = {
  "armor_mastery": {
    "name": "Armor Mastery",
    "prerequisite": "Armored Defense",
    "benefit": "The maximum Dexterity bonus of your Armor improves by +1. You must be proficient with the Armor you are wearing to gain this benefit.",
    "description": "The maximum Dexterity bonus of your Armor improves by +1. You must be proficient with the Armor you are wearing to gain this benefit."
  },
  "armored_defense": {
    "name": "Armored Defense",
    "prerequisite": "",
    "benefit": "When calculating your Reflex Defense, you may add either your Heroic Level or your Armor bonus, whichever is higher. You must be proficient with the Armor you are wearing to gain this benefit.",
    "description": "When calculating your Reflex Defense, you may add either your Heroic Level or your Armor bonus, whichever is higher. You must be proficient with the Armor you are wearing to gain this benefit."
  },
  "improved_armored_defense": {
    "name": "Improved Armored Defense",
    "prerequisite": "Armored Defense",
    "benefit": "When calculating your Reflex Defense, you may add your Heroic Level plus one-half your Armor bonus (rounded down), or your Armor bonus, whichever is higher. You must be proficient with the Armor you are wearing to gain this benefit.",
    "description": "When calculating your Reflex Defense, you may add your Heroic Level plus one-half your Armor bonus (rounded down), or your Armor bonus, whichever is higher. You must be proficient with the Armor you are wearing to gain this benefit."
  },
  "juggernaut": {
    "name": "Juggernaut",
    "prerequisite": "Armored Defense",
    "benefit": "Your Armor does not reduce your Speed or the distance you can move while Running. You must be proficient with the Armor you are wearing to gain this benefit.",
    "description": "Your Armor does not reduce your Speed or the distance you can move while Running. You must be proficient with the Armor you are wearing to gain this benefit."
  },
  "second_skin": {
    "name": "Second Skin",
    "prerequisite": "Armored Defense",
    "benefit": "When wearing Armor with which you are proficient, your Armor bonus to your Reflex Defense and Equipment bonus to your Fortitude Defense each increases by +1.",
    "description": "When wearing Armor with which you are proficient, your Armor bonus to your Reflex Defense and Equipment bonus to your Fortitude Defense each increases by +1."
  },
  "shield_expert": {
    "name": "Shield Expert",
    "prerequisite": "Armor Proficiency (Light)",
    "benefit": "You are an expert in using Energy Shields for maximum effectiveness. Once per encounter, you can spend a Swift Action to regain 10 points of SR (up to the shield's maximum) on an active Energy Shield.",
    "description": "You are an expert in using Energy Shields for maximum effectiveness. Once per encounter, you can spend a Swift Action to regain 10 points of SR (up to the shield's maximum) on an active Energy Shield."
  },
  "acute_senses": {
    "name": "Acute Senses",
    "prerequisite": "",
    "benefit": "You may reroll any Perception check, but the result of the reroll must be accepted, even if it is worse. This Talent applies to Use Computer checks made to perceive enemy ships (see Use Sensors).",
    "description": "You may reroll any Perception check, but the result of the reroll must be accepted, even if it is worse. This Talent applies to Use Computer checks made to perceive enemy ships (see Use Sensors)."
  },
  "expert_tracker": {
    "name": "Expert Tracker",
    "prerequisite": "Acute Senses",
    "benefit": "You take no penalty on Survival checks made to Follow Tracks while moving your normal Speed.",
    "description": "You take no penalty on Survival checks made to Follow Tracks while moving your normal Speed."
  },
  "improved_initiative": {
    "name": "Improved Initiative",
    "prerequisite": "Acute Senses",
    "benefit": "You may choose to reroll any Initiative check, but the result of the reroll must be accepted, even if it is worse.",
    "description": "You may choose to reroll any Initiative check, but the result of the reroll must be accepted, even if it is worse."
  },
  "keen_shot": {
    "name": "Keen Shot",
    "prerequisite": "Acute Senses",
    "benefit": "You take no penalty on your attack roll when attacking a target with Concealment (but not Total Concealment).",
    "description": "You take no penalty on your attack roll when attacking a target with Concealment (but not Total Concealment)."
  },
  "uncanny_dodge_i": {
    "name": "Uncanny Dodge I",
    "prerequisite": "Acute Senses, Improved Initiative",
    "benefit": "You retain your Dexterity bonus to your Reflex Defense regardless of being caught Flat-Footed or struck by a hidden attacker. You still lose your Dexterity bonus to your Reflex Defense if you are Immobilized.",
    "description": "You retain your Dexterity bonus to your Reflex Defense regardless of being caught Flat-Footed or struck by a hidden attacker. You still lose your Dexterity bonus to your Reflex Defense if you are Immobilized.\n\nIf you are the Pilot, this Talent applies to your Vehicle."
  },
  "uncanny_dodge_ii": {
    "name": "Uncanny Dodge II",
    "prerequisite": "Acute Senses, Improved Initiative, Uncanny Dodge I",
    "benefit": "You cannot be Flanked. You can react to opponents on opposite sides of you as easily as you can react to a single attacker.",
    "description": "You cannot be Flanked. You can react to opponents on opposite sides of you as easily as you can react to a single attacker.\n\nIf you are the Pilot, this Talent applies to your Vehicle."
  },
  "reset_initiative": {
    "name": "Reset Initiative",
    "prerequisite": "Acute Senses, Improved Initiative, Trained in Initiative",
    "benefit": "Once per encounter, at any time after the first round (that is, the first full round after the Surprise Round, if one occurs), you can set your Initiative Count to your current Initiative +5.",
    "description": "Once per encounter, at any time after the first round (that is, the first full round after the Surprise Round, if one occurs), you can set your Initiative Count to your current Initiative +5."
  },
  "weak_point": {
    "name": "Weak Point",
    "prerequisite": "Acute Senses, Keen Shot",
    "benefit": "Once per encounter, you can use a Swift Action to ignore the Damage Reduction of a single target within your line of sight for the rest of your turn.",
    "description": "Once per encounter, you can use a Swift Action to ignore the Damage Reduction of a single target within your line of sight for the rest of your turn."
  },
  "hunters_mark": {
    "name": "Hunter's Mark",
    "prerequisite": "",
    "benefit": "If you Aim before making a ranged attack, you move the target character -1 step along the Condition Track if the attack deals damage. This Talent can be used only against characters, not objects or Vehicles.",
    "description": "If you Aim before making a ranged attack, you move the target character -1 step along the Condition Track if the attack deals damage. This Talent can be used only against characters, not objects or Vehicles."
  },
  "hunters_target": {
    "name": "Hunter's Target",
    "prerequisite": "Hunter's Mark",
    "benefit": "Once per encounter as a Free Action, you may designate an opponent. For the rest of the encounter, when you succeed on a melee or ranged attack against that opponent, you gain a bonus on damage equal to your Class Level.",
    "description": "Once per encounter as a Free Action, you may designate an opponent. For the rest of the encounter, when you succeed on a melee or ranged attack against that opponent, you gain a bonus on damage equal to your Class Level."
  },
  "notorious": {
    "name": "Notorious",
    "prerequisite": "",
    "benefit": "Your skill as a Bounty Hunter is known throughout the galaxy, even on fringe worlds. When you are not Disguised, you may reroll any Persuasion checks made to Intimidate, keeping the better of the two results.",
    "description": "Your skill as a Bounty Hunter is known throughout the galaxy, even on fringe worlds. When you are not Disguised, you may reroll any Persuasion checks made to Intimidate, keeping the better of the two results."
  },
  "nowhere_to_hide": {
    "name": "Nowhere to Hide",
    "prerequisite": "",
    "benefit": "You may choose to reroll any Gather Information checks made to Locate Individual, but you must accept the result of the reroll, even if it is worse.",
    "description": "You may choose to reroll any Gather Information checks made to Locate Individual, but you must accept the result of the reroll, even if it is worse."
  },
  "relentless": {
    "name": "Relentless",
    "prerequisite": "Hunter's Mark, Hunter's Target",
    "benefit": "This Talent applies only to an opponent you've designated as your Hunter's Target. Any attack or effect originating from the target that would normally move you along the Condition Track does not, in fact, move you along the Condition Track.",
    "description": "This Talent applies only to an opponent you've designated as your Hunter's Target. Any attack or effect originating from the target that would normally move you along the Condition Track does not, in fact, move you along the Condition Track."
  },
  "ruthless_negotiator": {
    "name": "Ruthless Negotiator",
    "prerequisite": "Notorious",
    "benefit": "When Haggling over the price of a bounty, you can reroll your Persuasion check, keeping the better result.",
    "description": "When Haggling over the price of a bounty, you can reroll your Persuasion check, keeping the better result."
  },
  "detective": {
    "name": "Detective",
    "prerequisite": "",
    "benefit": "You are skilled in locating individuals and using research and surveillance to learn some of their most intimate secrets. When you make a Gather Information check to locate an individual, the DC is reduced by 10, and the time and bribery cost are reduced by half.",
    "description": "You are skilled in locating individuals and using research and surveillance to learn some of their most intimate secrets. When you make a Gather Information check to locate an individual, the DC is reduced by 10, and the time and bribery cost are reduced by half."
  },
  "dread": {
    "name": "Dread",
    "prerequisite": "Hunter's Mark, Hunter's Target",
    "benefit": "As a Standard Action, you can instill bone-chilling fear in an opponent whom you selected for your Hunter's Target. Make a Persuasion check against your target's Will Defense. If you equal or exceed your target's Will Defense, that target takes a -5 penalty to its Will Defense.",
    "description": "As a Standard Action, you can instill bone-chilling fear in an opponent whom you selected for your Hunter's Target. Make a Persuasion check against your target's Will Defense. If you equal or exceed your target's Will Defense, that target takes a -5 penalty to its Will Defense.\n\nThis is a Mind-Affecting effect. The penalty remains as long as you have line of sight to your target and immediately ends if the line of sight is broken."
  },
  "electronic_trail": {
    "name": "Electronic Trail",
    "prerequisite": "Nowhere to Hide, Trained in Use Computer",
    "benefit": "Once you have located a target using Gather Information, you can track its electronic presence. Once per day, you receive a catalog of the target's Electronic Trail, which includes the amount and location of credits spent, the routes of any public transportation taken, and the sites viewed on the HoloNet while the target was logged in using its primary identity.",
    "description": "Once you have located a target using Gather Information, you can track its electronic presence. Once per day, you receive a catalog of the target's Electronic Trail, which includes the amount and location of credits spent, the routes of any public transportation taken, and the sites viewed on the HoloNet while the target was logged in using its primary identity.\n\nTo receive this information, you must have access to a computer or Datapad plus access to a network or The HoloNet. This Electronic Trail does not reveal bank balances or other secret information, which requires a separate Gather Information check."
  },
  "familiar_enemies": {
    "name": "Familiar Enemies",
    "prerequisite": "Familiar Foe",
    "benefit": "You can apply your Familiar Foe bonus against a second enemy. If you can see both enemies simultaneously in the same round, you need to spend only a single Full-Round Action observing them.",
    "description": "You can apply your Familiar Foe bonus against a second enemy. If you can see both enemies simultaneously in the same round, you need to spend only a single Full-Round Action observing them."
  },
  "otherwise_you_must_spend_a_separate_full_round_action_on_each_enemy": {
    "name": "Otherwise, you must spend a separate Full-Round Action on each enemy.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "familiar_situation": {
    "name": "Familiar Situation",
    "prerequisite": "Familiar Foe",
    "benefit": "You can apply your Familiar Foe bonus to your Fortitude Defense and Will Defense against attacks and actions taken against you by the target of your Familiar Foe special quality.",
    "description": "You can apply your Familiar Foe bonus to your Fortitude Defense and Will Defense against attacks and actions taken against you by the target of your Familiar Foe special quality."
  },
  "fearsome": {
    "name": "Fearsome",
    "prerequisite": "Notorious",
    "benefit": "Your reputation precedes you, striking fear in your target. Any opponent within 6 squares whose level is equal to or less than your Heroic Level takes a -1 penalty on attack rolls made against you.",
    "description": "Your reputation precedes you, striking fear in your target. Any opponent within 6 squares whose level is equal to or less than your Heroic Level takes a -1 penalty on attack rolls made against you."
  },
  "jedi_hunter": {
    "name": "Jedi Hunter",
    "prerequisite": "",
    "benefit": "You are skilled at fighting Jedi and other Force-users. You gain a +1 insight bonus to your Fortitude Defense and Will Defense, and deal +1 die of damage against characters who have the Force Sensitivity feat.",
    "description": "You are skilled at fighting Jedi and other Force-users. You gain a +1 insight bonus to your Fortitude Defense and Will Defense, and deal +1 die of damage against characters who have the Force Sensitivity feat."
  },
  "nowhere_to_run": {
    "name": "Nowhere to Run",
    "prerequisite": "Hunter's Mark, Hunter's Target, Nowhere to Hide",
    "benefit": "Once per turn, whenever an opponent whom you selected for your Hunter's Target attempts to Withdraw, you can make an Attack of Opportunity against that target.",
    "description": "Once per turn, whenever an opponent whom you selected for your Hunter's Target attempts to Withdraw, you can make an Attack of Opportunity against that target."
  },
  "quick_cuffs": {
    "name": "Quick Cuffs",
    "prerequisite": "Quick Draw",
    "benefit": "You are fast with the binders. As a Swift Action, when you successfully use the Grab Action against a target, you can use Binder Cuffs or similar restraints to bind one of the target's arms to one of your arms or to an adjacent object.",
    "description": "You are fast with the binders. As a Swift Action, when you successfully use the Grab Action against a target, you can use Binder Cuffs or similar restraints to bind one of the target's arms to one of your arms or to an adjacent object.\n\nYou cannot use improvised materials, such as Mesh Tape, for this Talent, and the binders must be in your hands or readily available. You and the target both take a -2 penalty to attack rolls and Reflex Defense while bound together."
  },
  "revealing_secrets": {
    "name": "Revealing Secrets",
    "prerequisite": "Detective",
    "benefit": "Your investigations reveal information that your target though was secret. When you make a Gather Information check to learn secret information, the DC is reduced by 10 and the bribery cost is reduced to one-fifth the original cost.",
    "description": "Your investigations reveal information that your target though was secret. When you make a Gather Information check to learn secret information, the DC is reduced by 10 and the bribery cost is reduced to one-fifth the original cost."
  },
  "signature_item": {
    "name": "Signature Item",
    "prerequisite": "",
    "benefit": "You are famous for using certain items, and you have become skilled at wielding them. You select a single weapon, suit of armor, Vehicle, or other item. While wielding that weapon, wearing that armor, piloting that Vehicle, or otherwise using that item, you gain a +2 morale bonus on opposed Skill Checks.",
    "description": "You are famous for using certain items, and you have become skilled at wielding them. You select a single weapon, suit of armor, Vehicle, or other item. While wielding that weapon, wearing that armor, piloting that Vehicle, or otherwise using that item, you gain a +2 morale bonus on opposed Skill Checks.\n\nYou can select this Talent multiple times. Each time you do so, you choose a new object to be your Signature Item. The effects of multiple Signature Items are cumulative with one another, increasing this morale bonus by 1 point each time."
  },
  "tag": {
    "name": "Tag",
    "prerequisite": "Hunter's Mark, Hunter's Target",
    "benefit": "Whenever you damage an opponent whom you selected for your Hunter's Target, all allies gain a +2 bonus on their next attack roll against that opponent until the start of your next turn.",
    "description": "Whenever you damage an opponent whom you selected for your Hunter's Target, all allies gain a +2 bonus on their next attack roll against that opponent until the start of your next turn."
  },
  "expert_grappler": {
    "name": "Expert Grappler",
    "prerequisite": "",
    "benefit": "You gain a +2 competence bonus on Grapple attacks.",
    "description": "You gain a +2 competence bonus on Grapple attacks."
  },
  "gun_club": {
    "name": "Gun Club",
    "prerequisite": "",
    "benefit": "You can use a ranged weapon as a melee weapon without taking a penalty on your attack roll. The weapon is otherwise treated as a Club in all respects.",
    "description": "You can use a ranged weapon as a melee weapon without taking a penalty on your attack roll. The weapon is otherwise treated as a Club in all respects.\n\nIf you are using a Rifle with a mounted Bayonet or Vibrobayonet, you may wield that weapon as a Double Weapon. The Bayonet or Vibrobayonet end is treated normally, and the other end is treated as a Club."
  },
  "melee_smash": {
    "name": "Melee Smash",
    "prerequisite": "",
    "benefit": "You deal +1 point of damage with melee attacks.",
    "description": "You deal +1 point of damage with melee attacks."
  },
  "stunning_strike": {
    "name": "Stunning Strike",
    "prerequisite": "Melee Smash",
    "benefit": "When you damage an opponent with a melee attack, your opponents move an additional -1 step along the Condition Track if your damage roll result equals or exceeds the target's Damage Threshold.",
    "description": "When you damage an opponent with a melee attack, your opponents move an additional -1 step along the Condition Track if your damage roll result equals or exceeds the target's Damage Threshold."
  },
  "unbalance_opponent": {
    "name": "Unbalance Opponent",
    "prerequisite": "Expert Grappler",
    "benefit": "You are skilled at keeping your opponents off balance in melee combat. At the beginning of your turn, you can choose to designate an opponent no more than one size category larger or smaller than you. That opponent doesn't get to add their Strength bonus on attack rolls when targeting you.",
    "description": "You are skilled at keeping your opponents off balance in melee combat. At the beginning of your turn, you can choose to designate an opponent no more than one size category larger or smaller than you. That opponent doesn't get to add their Strength bonus on attack rolls when targeting you.\n\n(If the opponent has a Strength penalty, they still suffer from that penalty.) The opponent's Strength modifier applies to damage, as usual. You can select a new opponent on your next turn."
  },
  "bayonet_master": {
    "name": "Bayonet Master",
    "prerequisite": "Gun Club",
    "benefit": "When you take a Full Attack Action, you can treat a ranged weapon with a Bayonet (or Vibrobayonet) as a Double Weapon. You can attack with the Bayonet (or Vibrobayonet) and club a target with your ranged Weapon (as with the Gun Club Talent), ignoring the normal penalties for attacking with both ends of a Double Weapon.",
    "description": "When you take a Full Attack Action, you can treat a ranged weapon with a Bayonet (or Vibrobayonet) as a Double Weapon. You can attack with the Bayonet (or Vibrobayonet) and club a target with your ranged Weapon (as with the Gun Club Talent), ignoring the normal penalties for attacking with both ends of a Double Weapon."
  },
  "cantina_brawler": {
    "name": "Cantina Brawler",
    "prerequisite": "",
    "benefit": "While Flanked, you gain a +2 bonus on Unarmed attack rolls and damage rolls.",
    "description": "While Flanked, you gain a +2 bonus on Unarmed attack rolls and damage rolls."
  },
  "counterpunch": {
    "name": "Counterpunch",
    "prerequisite": "",
    "benefit": "When you Fight Defensively, any adjacent creature that attacks you provokes an Attack of Opportunity from you.",
    "description": "When you Fight Defensively, any adjacent creature that attacks you provokes an Attack of Opportunity from you."
  },
  "crowd_control": {
    "name": "Crowd Control",
    "prerequisite": "Entangler",
    "benefit": "You can Grab two adjacent creatures at a time.",
    "description": "You can Grab two adjacent creatures at a time."
  },
  "devastating_melee_smash": {
    "name": "Devastating Melee Smash",
    "prerequisite": "Melee Smash",
    "benefit": "Once per encounter, you can attempt a Devastating Melee Smash. You must declare this special melee attack before making the attack roll. If the attack rolls succeeds, add half your level to the damage, instead of the normal +1 bonus for the Melee Smash Talent.",
    "description": "Once per encounter, you can attempt a Devastating Melee Smash. You must declare this special melee attack before making the attack roll. If the attack rolls succeeds, add half your level to the damage, instead of the normal +1 bonus for the Melee Smash Talent.\n\nThe damage from this Talent does not stack with any damage bonus provided by the Powerful Charge feat."
  },
  "disarm_and_engage": {
    "name": "Disarm and Engage",
    "prerequisite": "",
    "benefit": "When you successfully Disarm an opponent, you can make an immediate free attack with the disarmed weapon at a -5 penalty. If you are not proficient with the weapon, you take the penalty for nonproficiency as well.",
    "description": "When you successfully Disarm an opponent, you can make an immediate free attack with the disarmed weapon at a -5 penalty. If you are not proficient with the weapon, you take the penalty for nonproficiency as well."
  },
  "entangler": {
    "name": "Entangler",
    "prerequisite": "",
    "benefit": "When Grabbing a target, you take a -2 penalty to your attack roll (instead of the normal -5 penalty). Until the target breaks the Grab, it takes a -5 penalty to attack rolls, including those made with Natural and Light Weapons (instead of the normal -2 penalty).",
    "description": "When Grabbing a target, you take a -2 penalty to your attack roll (instead of the normal -5 penalty). Until the target breaks the Grab, it takes a -5 penalty to attack rolls, including those made with Natural and Light Weapons (instead of the normal -2 penalty)."
  },
  "experienced_brawler": {
    "name": "Experienced Brawler",
    "prerequisite": "Melee Smash, Stunning Strike",
    "benefit": "You know how to fight when the odds are against you. You can use each of the following actions as a Standard Action once per encounter:",
    "description": "You know how to fight when the odds are against you. You can use each of the following actions as a Standard Action once per encounter:\n\nAvoid Attack: Make a single melee attack against an opponent within your Reach. Until the beginning of your next turn, you gain a +5 dodge bonus to your Reflex Defense against a single attack as a Reaction.\nFortified Mind: Make a single melee attack against an opponent within your Reach. Until the beginning of your next turn, you gain a +5 bonus to either your Fortitude Defense or Will Defense against a single attack as a Reaction.\nFocused Stance: Make a single melee attack against an opponent within your Reach. At any time until the beginning of your next turn, as a Reaction, you can move up to 2 squares. This movement does not provoke Attacks of Opportunity."
  },
  "grabber": {
    "name": "Grabber",
    "prerequisite": "",
    "benefit": "You do not take a -5 penalty when using the Grab Action.",
    "description": "You do not take a -5 penalty when using the Grab Action."
  },
  "hammerblow": {
    "name": "Hammerblow",
    "prerequisite": "",
    "benefit": "If you are Unarmed and holding no items, you double your Strength bonus to Unarmed attack rolls.",
    "description": "If you are Unarmed and holding no items, you double your Strength bonus to Unarmed attack rolls.\n\nMake Do\n\nWhen fighting with an Improvised Weapon, you take no penalty on your attack rolls."
  },
  "man_down": {
    "name": "Man Down",
    "prerequisite": "",
    "benefit": "Whenever an ally within 6 squares is reduced to 0 Hit Points, you can immediately move up to your speed toward that ally as a Reaction. This movement does not provoke Attacks of Opportunity.",
    "description": "Whenever an ally within 6 squares is reduced to 0 Hit Points, you can immediately move up to your speed toward that ally as a Reaction. This movement does not provoke Attacks of Opportunity."
  },
  "pick_a_fight": {
    "name": "Pick a Fight",
    "prerequisite": "Cantina Brawler",
    "benefit": "During the Surprise Round, you and all allies within 6 squares of you gain a +1 morale bonus on attack rolls. Additionally, until the end of the encounter, you retain this bonus to attack rolls against any target you or your allies damage during the Surprise Round.",
    "description": "During the Surprise Round, you and all allies within 6 squares of you gain a +1 morale bonus on attack rolls. Additionally, until the end of the encounter, you retain this bonus to attack rolls against any target you or your allies damage during the Surprise Round."
  },
  "reverse_strength": {
    "name": "Reverse Strength",
    "prerequisite": "",
    "benefit": "You know how to use an opponent's strength against it. Whenever you successfully Grapple an opponent, you deal damage equal to the opponent's Strength modifier (minimum 1 point).",
    "description": "You know how to use an opponent's strength against it. Whenever you successfully Grapple an opponent, you deal damage equal to the opponent's Strength modifier (minimum 1 point)."
  },
  "strong_grab": {
    "name": "Strong Grab",
    "prerequisite": "",
    "benefit": "When you successfully Grab an opponent, they must use a Full-Round Action instead of a Standard Action to break the Grab.",
    "description": "When you successfully Grab an opponent, they must use a Full-Round Action instead of a Standard Action to break the Grab."
  },
  "sucker_punch": {
    "name": "Sucker Punch",
    "prerequisite": "",
    "benefit": "When your melee attack damages an opponent that is denied its Dexterity bonus to its Reflex Defense, that opponent cannot take Attacks of Opportunity until the end of its next turn.",
    "description": "When your melee attack damages an opponent that is denied its Dexterity bonus to its Reflex Defense, that opponent cannot take Attacks of Opportunity until the end of its next turn."
  },
  "unrelenting_assault": {
    "name": "Unrelenting Assault",
    "prerequisite": "Melee Smash",
    "benefit": "You launch yourself at your foe, attacking with weapons, limbs, or anything else available. Whenever you miss with a melee attack or the attack is negated, you still deal your Strength bonus in damage to the target (minimum 1), or 2 x your Strength bonus if you attack with a weapon you are wielding two-handed.",
    "description": "You launch yourself at your foe, attacking with weapons, limbs, or anything else available. Whenever you miss with a melee attack or the attack is negated, you still deal your Strength bonus in damage to the target (minimum 1), or 2 x your Strength bonus if you attack with a weapon you are wielding two-handed."
  },
  "hidden_movement": {
    "name": "Hidden Movement",
    "prerequisite": "Improved Stealth",
    "benefit": "You're very good at hiding when mobile. You take no penalty on your Stealth check when moving your normal Speed. This Talent applies to Stealth checks made while Piloting a Starship (see Starship Stealth).",
    "description": "You're very good at hiding when mobile. You take no penalty on your Stealth check when moving your normal Speed. This Talent applies to Stealth checks made while Piloting a Starship (see Starship Stealth)."
  },
  "improved_stealth": {
    "name": "Improved Stealth",
    "prerequisite": "",
    "benefit": "You may choose to reroll any Stealth check, but the result of the reroll must be accepted, even if it is worse. This Talent applies to Stealth checks made while Piloting a Starship (see Starship Stealth).",
    "description": "You may choose to reroll any Stealth check, but the result of the reroll must be accepted, even if it is worse. This Talent applies to Stealth checks made while Piloting a Starship (see Starship Stealth)."
  },
  "total_concealment": {
    "name": "Total Concealment",
    "prerequisite": "Hidden Movement, Improved Stealth",
    "benefit": "Any situation that would give you Concealment grants you Total Concealment instead.",
    "description": "Any situation that would give you Concealment grants you Total Concealment instead."
  },
  "dig_in": {
    "name": "Dig In",
    "prerequisite": "",
    "benefit": "When Prone, you can spend a Swift Action to gain Concealment until the start of your next turn. If you stand up or move, you lose this benefit.",
    "description": "When Prone, you can spend a Swift Action to gain Concealment until the start of your next turn. If you stand up or move, you lose this benefit."
  },
  "extended_ambush": {
    "name": "Extended Ambush",
    "prerequisite": "Improved Stealth",
    "benefit": "",
    "description": ""
  },
  "ghost_assailant": {
    "name": "Ghost Assailant",
    "prerequisite": "",
    "benefit": "If you start your turn with Total Concealment or Total Cover from a target, during that turn you can make a Stealth check as a Swift Action, opposed by the target's Perception check. If you succeed, the target is considered Flat-Footed against you until the end of your turn.",
    "description": "If you start your turn with Total Concealment or Total Cover from a target, during that turn you can make a Stealth check as a Swift Action, opposed by the target's Perception check. If you succeed, the target is considered Flat-Footed against you until the end of your turn."
  },
  "hide_in_plain_sight": {
    "name": "Hide in Plain Sight",
    "prerequisite": "Hidden Movement, Improved Stealth",
    "benefit": "Once per encounter, when you are within 2 squares of Cover or Concealment, you can move to that Cover or Concealment and make a Stealth check to hide as a single Move Action.",
    "description": "Once per encounter, when you are within 2 squares of Cover or Concealment, you can move to that Cover or Concealment and make a Stealth check to hide as a single Move Action."
  },
  "hunker_down": {
    "name": "Hunker Down",
    "prerequisite": "",
    "benefit": "Whenever you benefit from Cover, you can spend a Standard Action to Hunker Down and maximize the benefit of the Cover. You increase the benefit of Cover to Improved Cover or Improved Cover to Total Cover.",
    "description": "Whenever you benefit from Cover, you can spend a Standard Action to Hunker Down and maximize the benefit of the Cover. You increase the benefit of Cover to Improved Cover or Improved Cover to Total Cover."
  },
  "shadow_striker": {
    "name": "Shadow Striker",
    "prerequisite": "Hidden Movement, Improved Stealth",
    "benefit": "You excel at fighting from the shadows, hitting your opponents when they least expect it. You can use each of the following actions once per encounter as a Standard Action:",
    "description": "You excel at fighting from the shadows, hitting your opponents when they least expect it. You can use each of the following actions once per encounter as a Standard Action:\n\nBlinding Strike: Make a single melee or ranged attack against an opponent within Range. If you damage the target, you gain Total Concealment against that target until the beginning of your next turn.\nConfusing Strike: Make a single melee or ranged attack against an opponent within Range. If this opponent is denied its Dexterity bonus to its Reflex Defense, or if you have Concealment from this opponent, a successful attack also causes the opponent to be able to take only a Swift Action on its next turn.\nUnexpected Attack: Make a melee or ranged attack within your Range against an opponent from whom you have Concealment. You gain a +2 bonus on this attack roll if you have Concealment, or a +5 bonus if you have Total Concealment."
  },
  "slip_by": {
    "name": "Slip By",
    "prerequisite": "",
    "benefit": "When you would normally provoke an Attack of Opportunity by moving out of a Threatened Area, you can roll a Stealth check, replacing your Reflex Defense with the results of your Stealth check if it is higher.",
    "description": "When you would normally provoke an Attack of Opportunity by moving out of a Threatened Area, you can roll a Stealth check, replacing your Reflex Defense with the results of your Stealth check if it is higher."
  },
  "battle_analysis": {
    "name": "Battle Analysis",
    "prerequisite": "",
    "benefit": "As a Swift Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, you know which allies and opponents in your line of sight are reduced to at least half of their maximum total Hit Points.",
    "description": "As a Swift Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, you know which allies and opponents in your line of sight are reduced to at least half of their maximum total Hit Points.\n\nIf you succeed at both a DC 15 Knowledge (Tactics) check and a DC 15 Use Computer check, you may use this Talent to determine what Vehicles are reduced to at least half their maximum Hit Points."
  },
  "cover_fire": {
    "name": "Cover Fire",
    "prerequisite": "Battle Analysis",
    "benefit": "When you make a ranged attack with a Pistol or Rifle, all allies within 6 squares of you when you made the attack gain a +1 bonus to Reflex Defense until the start of your next turn. Allies within range don't need to be within your line of sight to gain the bonus.",
    "description": "When you make a ranged attack with a Pistol or Rifle, all allies within 6 squares of you when you made the attack gain a +1 bonus to Reflex Defense until the start of your next turn. Allies within range don't need to be within your line of sight to gain the bonus."
  },
  "demolitionist": {
    "name": "Demolitionist",
    "prerequisite": "",
    "benefit": "When you use the Mechanics skill to Handle Explosives, the explosion deals +2 dice of damage. You may take this Talent multiple times; its effects stack.",
    "description": "When you use the Mechanics skill to Handle Explosives, the explosion deals +2 dice of damage. You may take this Talent multiple times; its effects stack."
  },
  "draw_fire": {
    "name": "Draw Fire",
    "prerequisite": "",
    "benefit": "You can distract opponents and convince them that you are the most tempting (or most dangerous) target in the area. As a Swift Action, make a Persuasion check and compare the result to the Will Defense of all opponents within line of sight.",
    "description": "You can distract opponents and convince them that you are the most tempting (or most dangerous) target in the area. As a Swift Action, make a Persuasion check and compare the result to the Will Defense of all opponents within line of sight.\n\nIf the check result exceeds an opponent's Will Defense, that opponent cannot attack any character within 6 squares of you until the start of your next turn as long as you do not have Cover against that opponent. (The affected opponent may still attack you, however.)\n\nIf you are the Pilot of a Vehicle, you may use this Talent to protect allied Vehicles. You may use it to protect Vehicles no more than one size category larger than your own."
  },
  "harms_way": {
    "name": "Harm's Way",
    "prerequisite": "Trained in Initiative",
    "benefit": "Once per round, you may spend a Swift Action to shield a single adjacent ally from attacks, taking the damage and suffering the ill effects in your ally's stead.",
    "description": "Once per round, you may spend a Swift Action to shield a single adjacent ally from attacks, taking the damage and suffering the ill effects in your ally's stead.\n\nUntil the start of your next turn, any attack made against the protected ally targets you instead. You may elect not to shield your protected ally against a given attack, provided the decision is made before the attack roll is made.\n\nIf you are the Pilot of a Vehicle, you may use this Talent to protect allied Vehicles. You may use it to protect Vehicles no more than one size category larger than your own."
  },
  "indomitable": {
    "name": "Indomitable",
    "prerequisite": "",
    "benefit": "Once per day as a Swift Action, you can move +5 steps on the Condition Track. This does not remove any Persistent Conditions that may be affecting you. This Talent does not affect the Condition Track of a Vehicle.",
    "description": "Once per day as a Swift Action, you can move +5 steps on the Condition Track. This does not remove any Persistent Conditions that may be affecting you. This Talent does not affect the Condition Track of a Vehicle.\n\nYou can select this talent multiple times. Each time you select this Talent, you can use it one additional time per day."
  },
  "tough_as_nails": {
    "name": "Tough as Nails",
    "prerequisite": "",
    "benefit": "You can catch a Second Wind one extra time per day. If you have this Talent and the Extra Second Wind feat, you can catch your Second Wind a total of three times per day.",
    "description": "You can catch a Second Wind one extra time per day. If you have this Talent and the Extra Second Wind feat, you can catch your Second Wind a total of three times per day."
  },
  "coordinated_effort": {
    "name": "Coordinated Effort",
    "prerequisite": "Dedicated Protector, Harm's Way",
    "benefit": "When you use the Aid Another Action to grant a bonus on attack rolls, if you are aiding the target of your Dedicated Protector Talent, that ally also gains a +2 bonus to damage rolls on the attack you aided.",
    "description": "When you use the Aid Another Action to grant a bonus on attack rolls, if you are aiding the target of your Dedicated Protector Talent, that ally also gains a +2 bonus to damage rolls on the attack you aided."
  },
  "dedicated_guardian": {
    "name": "Dedicated Guardian",
    "prerequisite": "Dedicated Protector, Harm's Way",
    "benefit": "You can use each of the following Actions once per encounter:",
    "description": "You can use each of the following Actions once per encounter:\n\nBlast Shield: Spend a Swift Action. Until the end of your next turn, the ally who is under the effects of your Dedicated Protector Talent is treated as having the Evasion Talent for the purposes of determining damage from an Area Attack. If the ally already has Evasion, the damage from a successful Area Attack is reduced by 1 die.\nTake the Pain: Whenever your Dedicated Protector target would move down the Condition Track, you can, as a Reaction, choose to move the same number of steps down the Condition Track instead (preventing the ally from moving down the Condition Track).\nTeam Effort: Spend a Swift Action. Until the end of your next turn, while you are adjacent to your Dedicated Protector target, any enemy that is adjacent to you and to that ally is considered Flanked."
  },
  "dedicated_protector": {
    "name": "Dedicated Protector",
    "prerequisite": "Harm's Way",
    "benefit": "Once per encounter, you can designate one ally within 6 squares of you. Until the end of the encounter, that ally gains a +1 morale bonus to their Reflex Defense as long as it remains adjacent to you. Any individual can only be the target of this Talent once per encounter.",
    "description": "Once per encounter, you can designate one ally within 6 squares of you. Until the end of the encounter, that ally gains a +1 morale bonus to their Reflex Defense as long as it remains adjacent to you. Any individual can only be the target of this Talent once per encounter."
  },
  "defensive_position": {
    "name": "Defensive Position",
    "prerequisite": "Battle Analysis",
    "benefit": "",
    "description": ""
  },
  "hard_target": {
    "name": "Hard Target",
    "prerequisite": "Tough as Nails",
    "benefit": "You can Catch a Second Wind as a Reaction, instead of as a Swift Action.",
    "description": "You can Catch a Second Wind as a Reaction, instead of as a Swift Action."
  },
  "keep_them_at_bay": {
    "name": "Keep Them at Bay",
    "prerequisite": "",
    "benefit": "When you use the Aid Another Action to Suppress an Enemy, that enemy takes a -5 penalty on its next attack instead of the normal -2 penalty. Only 1 character may gain the benefits of this Talent against a given target at a time.",
    "description": "When you use the Aid Another Action to Suppress an Enemy, that enemy takes a -5 penalty on its next attack instead of the normal -2 penalty. Only 1 character may gain the benefits of this Talent against a given target at a time."
  },
  "out_of_harms_way": {
    "name": "Out of Harm's Way",
    "prerequisite": "Harm's Way, Trained in Initiative",
    "benefit": "As a Reaction, when you use the Harm's Way Talent (which still requires a Swift Action to activate), you can move into the square of the ally you are protecting, and move the ally to any legal square adjacent to you. This movement does not provoke Attacks of Opportunity.",
    "description": "As a Reaction, when you use the Harm's Way Talent (which still requires a Swift Action to activate), you can move into the square of the ally you are protecting, and move the ally to any legal square adjacent to you. This movement does not provoke Attacks of Opportunity."
  },
  "channel_aggression": {
    "name": "Channel Aggression",
    "prerequisite": "",
    "benefit": "If you succeed on an attack against a Flanked opponent, or any target that is denied its Dexterity bonus to Reflex Defense, you may spend a Force Point as a Free Action to deal additional damage to the target equal to 1d6 per Class Level (maximum 10d6).",
    "description": "If you succeed on an attack against a Flanked opponent, or any target that is denied its Dexterity bonus to Reflex Defense, you may spend a Force Point as a Free Action to deal additional damage to the target equal to 1d6 per Class Level (maximum 10d6)."
  },
  "channel_anger": {
    "name": "Channel Anger",
    "prerequisite": "Channel Aggression",
    "benefit": "You let your anger swell into a Rage. As a Swift Action, you may spend a Force Point to gain a +2 Rage bonus on melee attack rolls and melee damage rolls for a number of rounds equal to 5 + your Constitution modifier. At the end of this duration, you move -1 step along the Condition Track.",
    "description": "You let your anger swell into a Rage. As a Swift Action, you may spend a Force Point to gain a +2 Rage bonus on melee attack rolls and melee damage rolls for a number of rounds equal to 5 + your Constitution modifier. At the end of this duration, you move -1 step along the Condition Track.\n\nWhile Raging, you cannot use Skills that require patience and concentration, such as Mechanics, Stealth, or Use the Force."
  },
  "crippling_strike": {
    "name": "Crippling Strike",
    "prerequisite": "Channel Aggression",
    "benefit": "Whenever you score a Critical Hit, you may spend a Force Point to also reduce the target's Speed by half until they are fully healed (that is, restored to maximum Hit Points).",
    "description": "Whenever you score a Critical Hit, you may spend a Force Point to also reduce the target's Speed by half until they are fully healed (that is, restored to maximum Hit Points)."
  },
  "embrace_the_dark_side": {
    "name": "Embrace the Dark Side",
    "prerequisite": "Channel Aggression, Channel Anger",
    "benefit": "Whenever you use a Force Power with the [Dark Side] descriptor, you may reroll your Use the Force check, but you must accept the result of the reroll, even if it is worse.",
    "description": "Whenever you use a Force Power with the [Dark Side] descriptor, you may reroll your Use the Force check, but you must accept the result of the reroll, even if it is worse."
  },
  "upon_choosing_this_talent_you_can_no_longer_use_force_powers_with_the_light_side_descriptor": {
    "name": "Upon choosing this Talent, you can no longer use Force Powers with the [Light Side] descriptor.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "dark_side_talisman": {
    "name": "Dark Side Talisman",
    "prerequisite": "",
    "benefit": "You can spend a Force Point to imbue a Weapon or some other portable object with the Dark Side of The Force, creating a Talisman that grants you protection from the Light Side. Creating the Dark Side Talisman takes a Full-Round Action.",
    "description": "You can spend a Force Point to imbue a Weapon or some other portable object with the Dark Side of The Force, creating a Talisman that grants you protection from the Light Side. Creating the Dark Side Talisman takes a Full-Round Action.\n\nWhile you wear or carry the Talisman, you gain a +2 Force bonus to one of your Defenses (Reflex, Fortitude, or Will) against Force Powers with the [Light Side] descriptor.\n\nYou can only have one Dark Side Talisman active at a given time (though you can have both a Dark Side Talisman and a Force Talisman active at the same time), and if your Dark Side Talisman is destroyed, you cannot create another one for 24 hours."
  },
  "greater_dark_side_talisman": {
    "name": "Greater Dark Side Talisman",
    "prerequisite": "Dark Side Talisman",
    "benefit": "You can spend a Force Point to imbue a Weapon or some other portable object with the Dark Side of The Force, creating a Talisman that grants you protection from the Light Side. Creating the Greater Dark Side Talisman takes a Full-Round Action.",
    "description": "You can spend a Force Point to imbue a Weapon or some other portable object with the Dark Side of The Force, creating a Talisman that grants you protection from the Light Side. Creating the Greater Dark Side Talisman takes a Full-Round Action.\n\nWhile you wear or carry the Talisman, you gain a +2 Force bonus to all of your Defenses against Force Powers with the [Light Side] descriptor.\n\nYou can only have one Greater Dark Side Talisman, or Dark Side Talisman, active at a given time (though you can have both a Greater Dark Side Talisman and a Greater Force Talisman active at the same time), and if your Greater Dark Side Talisman is destroyed, you cannot create another one for 24 hours."
  },
  "force_fortification": {
    "name": "Force Fortification",
    "prerequisite": "",
    "benefit": "As a Reaction, you can spend a Force Point to negate a Critical Hit scored against you, and take normal damage instead. You can spend this Force Point even if you've already spent a Force Point earlier in the round.",
    "description": "As a Reaction, you can spend a Force Point to negate a Critical Hit scored against you, and take normal damage instead. You can spend this Force Point even if you've already spent a Force Point earlier in the round."
  },
  "greater_weapon_focus_lightsabers": {
    "name": "Greater Weapon Focus (Lightsabers)",
    "prerequisite": "Weapon Focus (Lightsabers)",
    "benefit": "You gain a +1 bonus on melee attack rolls with Lightsabers. This bonus stacks with the bonus granted by the Weapon Focus (Lightsabers) feat.",
    "description": "You gain a +1 bonus on melee attack rolls with Lightsabers. This bonus stacks with the bonus granted by the Weapon Focus (Lightsabers) feat."
  },
  "greater_weapon_specialization_lightsabers": {
    "name": "Greater Weapon Specialization (Lightsabers)",
    "prerequisite": "Weapon Specialization (Lightsabers), Greater Weapon Focus (Lightsabers)",
    "benefit": "You gain a +2 bonus on melee damage rolls with Lightsabers. This bonus stacks with the bonus granted by the Weapon Specialization (Lightsabers) Talent.",
    "description": "You gain a +2 bonus on melee damage rolls with Lightsabers. This bonus stacks with the bonus granted by the Weapon Specialization (Lightsabers) Talent."
  },
  "multiattack_proficiency_lightsabers": {
    "name": "Multiattack Proficiency (Lightsabers)",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "severing_strike": {
    "name": "Severing Strike",
    "prerequisite": "",
    "benefit": "When you deal damage with a Lightsaber that is equal to or greater than both the target's current Hit Points and the target's Damage Threshold (that is, when you would deal enough damage to kill your target), you may choose to use this Talent.",
    "description": "When you deal damage with a Lightsaber that is equal to or greater than both the target's current Hit Points and the target's Damage Threshold (that is, when you would deal enough damage to kill your target), you may choose to use this Talent.\n\nInstead of dealing full damage, you instead deal half damage to your target and move it -1 step on the Condition Track. In addition, you sever one of your target's arms at the wrist or elbow joint, or one of the target's legs at the knee or ankle joint (your choice).\n\nSevering part of an arm prevents the target from wielding weapons or using tools in that hand, and imposes a -5 penalty on Skill Checks and Ability Checks keyed to Strength and Dexterity.\n\nSevering part of a leg knocks the target Prone, reduces the target's Speed by half, reduces its Carrying Capacity by half, and imposes a -5 penalty on Skill Checks and Ability Checks keyed to Strength and Dexterity.\n\nBecause of the severity of such an injury, losing part of a limb causes a Persistent Condition that can only be removed by having Surgery successfully performed on you. A Cybernetic Prosthesis negates these reductions and penalties."
  },
  "improved_lightsaber_throw": {
    "name": "Improved Lightsaber Throw",
    "prerequisite": "Lightsaber Throw",
    "benefit": "You can spend a Force Point as a Standard Action to throw your Lightsaber at a group of opponents. You make a single ranged attack roll (treating the Lightsaber as a Thrown Weapon) and compare the result to the Reflex Defense of all targets in a 6-square line originating in your square.",
    "description": "You can spend a Force Point as a Standard Action to throw your Lightsaber at a group of opponents. You make a single ranged attack roll (treating the Lightsaber as a Thrown Weapon) and compare the result to the Reflex Defense of all targets in a 6-square line originating in your square.\n\nIf your attack roll result exceeds a target's Reflex Defense, you deal normal Lightsaber damage to that target (dealing half damage if you fail to exceed the target's Reflex Defense). This attack is considered an Area Attack.\n\nYou can pull your Lightsaber back to your hand as a Swift Action by making a DC 20 Use the Force check."
  },
  "improved_riposte": {
    "name": "Improved Riposte",
    "prerequisite": "Block, Riposte",
    "benefit": "When you successfully make a Riposte attack using the Riposte Talent, you do not count the Block Talent use that triggered the Riposte (thus, you take no cumulative penalty to Use the Force checks from that Block attempt).",
    "description": "When you successfully make a Riposte attack using the Riposte Talent, you do not count the Block Talent use that triggered the Riposte (thus, you take no cumulative penalty to Use the Force checks from that Block attempt)."
  },
  "subsequent_block_attempts_before_the_beginning_of_your_next_turn_impose_these_penalties_as_normal": {
    "name": "Subsequent Block attempts before the beginning of your next turn impose these penalties as normal.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "improved_redirect": {
    "name": "Improved Redirect",
    "prerequisite": "Deflect, Redirect Shot",
    "benefit": "Once per turn, when you successfully Redirect an attack using the Redirect Shot Talent, you do not count the Deflect Talent use that triggered the redirected attack (thus, you take no cumulative penalty to Use the Force checks from that Deflect attempt).",
    "description": "Once per turn, when you successfully Redirect an attack using the Redirect Shot Talent, you do not count the Deflect Talent use that triggered the redirected attack (thus, you take no cumulative penalty to Use the Force checks from that Deflect attempt)."
  },
  "subsequent_deflect_attempts_before_the_beginning_of_your_next_turn_impose_these_penalties_as_normal": {
    "name": "Subsequent Deflect attempts before the beginning of your next turn impose these penalties as normal.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "lightsaber_form_savant": {
    "name": "Lightsaber Form Savant",
    "prerequisite": "",
    "benefit": "Once per encounter as a Swift Action, you can return any one spent Force Power with the [Lightsaber Form] descriptor to your Force Power Suite without spending a Force Point.",
    "description": "Once per encounter as a Swift Action, you can return any one spent Force Power with the [Lightsaber Form] descriptor to your Force Power Suite without spending a Force Point.\n\nYou can select this Talent multiple times. Each time you select it, you can use it one additional time per encounter."
  },
  "thrown_lightsaber_mastery": {
    "name": "Thrown Lightsaber Mastery",
    "prerequisite": "Improved Lightsaber Throw, Lightsaber Throw",
    "benefit": "Any target successfully struck by a Lightsaber you Throw moves at half Speed (round down) until the beginning of your next turn.",
    "description": "Any target successfully struck by a Lightsaber you Throw moves at half Speed (round down) until the beginning of your next turn."
  },
  "shoto_master": {
    "name": "Shoto Master",
    "prerequisite": "",
    "benefit": "When you wield both a One-Handed Lightsaber and a Light Lightsaber (typically a Shoto Lightsaber or a Guard Shoto), you can consider the One-Handed Lightsaber to be a Light Weapon.",
    "description": "When you wield both a One-Handed Lightsaber and a Light Lightsaber (typically a Shoto Lightsaber or a Guard Shoto), you can consider the One-Handed Lightsaber to be a Light Weapon.\n\nAdditionally, if you have the Lightsaber Defense Talent, you can activate the Talent as a Free Action on your turn (instead of a Swift Action) whenever you wield both a One-Handed Lightsaber and a Light Lightsaber."
  },
  "elusive_dogfighter": {
    "name": "Elusive Dogfighter",
    "prerequisite": "",
    "benefit": "When engaged in a Dogfight, any enemy pilot engaged in the same Dogfight takes a -10 penalty on attack rolls when you succeed on the opposed Pilot check.",
    "description": "When engaged in a Dogfight, any enemy pilot engaged in the same Dogfight takes a -10 penalty on attack rolls when you succeed on the opposed Pilot check."
  },
  "full_throttle": {
    "name": "Full Throttle",
    "prerequisite": "",
    "benefit": "You can Take 10 on Pilot checks made to Increase Vehicle Speed. In addition, when you use the All-Out Movement Action, your Vehicle moves up to five times its normal Speed (instead of the normal four times).",
    "description": "You can Take 10 on Pilot checks made to Increase Vehicle Speed. In addition, when you use the All-Out Movement Action, your Vehicle moves up to five times its normal Speed (instead of the normal four times)."
  },
  "juke": {
    "name": "Juke",
    "prerequisite": "Vehicular Evasion",
    "benefit": "When you Fly Defensively as the Pilot of a Vehicle, you may negate a weapon hit on your Vehicle using the Vehicular Combat feat one additional time per round.",
    "description": "When you Fly Defensively as the Pilot of a Vehicle, you may negate a weapon hit on your Vehicle using the Vehicular Combat feat one additional time per round."
  },
  "keep_it_together": {
    "name": "Keep it Together",
    "prerequisite": "",
    "benefit": "Once per encounter, when a Vehicle you're Piloting takes damage that equals or exceeds its Damage Threshold, your Vehicle avoids moving down the Condition Track.",
    "description": "Once per encounter, when a Vehicle you're Piloting takes damage that equals or exceeds its Damage Threshold, your Vehicle avoids moving down the Condition Track."
  },
  "relentless_pursuit": {
    "name": "Relentless Pursuit",
    "prerequisite": "",
    "benefit": "You may roll twice for any opposed Pilot check made to initiate a Dogfight, keeping the better result.",
    "description": "You may roll twice for any opposed Pilot check made to initiate a Dogfight, keeping the better result."
  },
  "vehicular_evasion": {
    "name": "Vehicular Evasion",
    "prerequisite": "",
    "benefit": "If the Vehicle you are piloting is hit by an Area Attack, it takes half damage if the attack hits. If the Area Attack misses your Vehicle, it takes no damage. You cannot use this Talent when your Vehicle is stationary or disabled.",
    "description": "If the Vehicle you are piloting is hit by an Area Attack, it takes half damage if the attack hits. If the Area Attack misses your Vehicle, it takes no damage. You cannot use this Talent when your Vehicle is stationary or disabled."
  },
  "blind_spot": {
    "name": "Blind Spot",
    "prerequisite": "",
    "benefit": "You can fly a Vehicle you Pilot so close to a target at least two sizes larger than your Vehicle that it is difficult for the target to avoid or attack you. You must be adjacent to the target (at Starship Scale) to use this Talent.",
    "description": "You can fly a Vehicle you Pilot so close to a target at least two sizes larger than your Vehicle that it is difficult for the target to avoid or attack you. You must be adjacent to the target (at Starship Scale) to use this Talent.\n\nAs a Swift Action, make an opposed Pilot check against the target. If you succeed, you move into the same space as your target. You move with your target if it moves (assuming your Vehicle has sufficient Speed to keep up), and you must make another opposed Pilot check each round as a Swift Action to stay in its Blind Spot.\n\nAs long as you stay in the target's Blind Spot, any attack you make against the target gains a +2 bonus, and the target takes a -2 penalty on attacks made against you."
  },
  "clip": {
    "name": "Clip",
    "prerequisite": "",
    "benefit": "When you use the Ram Action, you reduce the size of your Vehicle by two categories for the purposes of taking Collision damage. The Rammed Vehicle takes damage appropriate to the actual size of your Vehicle.",
    "description": "When you use the Ram Action, you reduce the size of your Vehicle by two categories for the purposes of taking Collision damage. The Rammed Vehicle takes damage appropriate to the actual size of your Vehicle."
  },
  "close_scrape": {
    "name": "Close Scrape",
    "prerequisite": "",
    "benefit": "Whenever you are Piloting a Vehicle of Colossal size or smaller, you may make a Pilot check as a Reaction to turn a Critical Hit into a normal hit. The DC for the Pilot check is equal to the attack roll total of the Critical Hit.",
    "description": "Whenever you are Piloting a Vehicle of Colossal size or smaller, you may make a Pilot check as a Reaction to turn a Critical Hit into a normal hit. The DC for the Pilot check is equal to the attack roll total of the Critical Hit.\n\nIf you are successful, the damage from the attack is not doubled (though it is still considered an automatic hit)."
  },
  "improved_attack_run": {
    "name": "Improved Attack Run",
    "prerequisite": "",
    "benefit": "You do not have to move in a straight line when using the Attack Run Action.",
    "description": "You do not have to move in a straight line when using the Attack Run Action."
  },
  "master_defender": {
    "name": "Master Defender",
    "prerequisite": "",
    "benefit": "When you Fight Defensively, either your Vehicle gains a +5 dodge bonus to its Reflex Defense if you and your Gunners take a -2 penalty to attack rolls, or it gains a +10 dodge bonus if you and your Gunners take a -5 penalty to attack rolls.",
    "description": "When you Fight Defensively, either your Vehicle gains a +5 dodge bonus to its Reflex Defense if you and your Gunners take a -2 penalty to attack rolls, or it gains a +10 dodge bonus if you and your Gunners take a -5 penalty to attack rolls."
  },
  "renowned_pilot": {
    "name": "Renowned Pilot",
    "prerequisite": "",
    "benefit": "Your reputation as a skilled pilot precedes you and bolsters the resolve of your allies. All allies within 6 squares of a Vehicle you Pilot can reroll one Pilot check, keeping the better of the two results.",
    "description": "Your reputation as a skilled pilot precedes you and bolsters the resolve of your allies. All allies within 6 squares of a Vehicle you Pilot can reroll one Pilot check, keeping the better of the two results.\n\nOnce an ally has used this ability, that same ally cannot gain this Talent's benefit during the same encounter."
  },
  "roll_out": {
    "name": "Roll Out",
    "prerequisite": "Elusive Dogfighter",
    "benefit": "You are an expert at escaping Dogfights. When making an opposed check to Disengage from a Dogfight, you can reroll your Pilot check, taking the better result.",
    "description": "You are an expert at escaping Dogfights. When making an opposed check to Disengage from a Dogfight, you can reroll your Pilot check, taking the better result.\n\nIf you fail, you remain in the Dogfight, but the Gunners on your Vehicle do not take penalties to their attack rolls."
  },
  "shunt_damage": {
    "name": "Shunt Damage",
    "prerequisite": "",
    "benefit": "Once per encounter, if your Vehicle takes damage, make a Pilot check and compare the result to the Reflex Defense of one adjacent allied Vehicle. If your check result is higher, the allied Vehicle takes the damage instead.",
    "description": "Once per encounter, if your Vehicle takes damage, make a Pilot check and compare the result to the Reflex Defense of one adjacent allied Vehicle. If your check result is higher, the allied Vehicle takes the damage instead."
  },
  "vehicle_focus": {
    "name": "Vehicle Focus",
    "prerequisite": "Wisdom 13",
    "benefit": "Choose a single type of Vehicle from the following list:",
    "description": "Choose a single type of Vehicle from the following list:"
  },
  "airspeeder": {
    "name": "Airspeeder",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "capital_ship": {
    "name": "Capital Ship",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "space_transport": {
    "name": "Space Transport",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "speeder": {
    "name": "Speeder",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "starfighter": {
    "name": "Starfighter",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "walker": {
    "name": "Walker",
    "prerequisite": "",
    "benefit": "When you are the Pilot or Gunner of that type of Vehicle, you gain a +2 bonus to all attack rolls with its Vehicle Weapons, and may Take 10 on any Pilot checks made while piloting that type of Vehicle, even when you are otherwise unable to.",
    "description": "When you are the Pilot or Gunner of that type of Vehicle, you gain a +2 bonus to all attack rolls with its Vehicle Weapons, and may Take 10 on any Pilot checks made while piloting that type of Vehicle, even when you are otherwise unable to."
  },
  "wingman": {
    "name": "Wingman",
    "prerequisite": "Wisdom 13",
    "benefit": "As a Swift Action, you can make a DC 15 Pilot check to assist any allied Starfighter or Airspeeder within 2 squares at Starship Scale. If you succeed, the Pilot of that Vehicle gains a +5 bonus on all opposed Pilot checks relating to the Dogfight Action until the start of your next turn.",
    "description": "As a Swift Action, you can make a DC 15 Pilot check to assist any allied Starfighter or Airspeeder within 2 squares at Starship Scale. If you succeed, the Pilot of that Vehicle gains a +5 bonus on all opposed Pilot checks relating to the Dogfight Action until the start of your next turn."
  },
  "force_power_adept": {
    "name": "Force Power Adept",
    "prerequisite": "",
    "benefit": "You are skilled at using a particular Force Power. Select one Force Power you know. When using that Force Power, you have the option of spending a Force Point to make two Use the Force checks, keeping the better result.",
    "description": "You are skilled at using a particular Force Power. Select one Force Power you know. When using that Force Power, you have the option of spending a Force Point to make two Use the Force checks, keeping the better result.\n\nThis Talent may be selected multiple times. Its effects do not stack. Each time you select this Talent, you must choose a different Force Power."
  },
  "force_treatment": {
    "name": "Force Treatment",
    "prerequisite": "",
    "benefit": "You can make a Use the Force check in place of a Treat Injury check. You are considered Trained in the Treat Injury Skill. If you are entitled to a Treat Injury check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations).",
    "description": "You can make a Use the Force check in place of a Treat Injury check. You are considered Trained in the Treat Injury Skill. If you are entitled to a Treat Injury check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations)."
  },
  "fortified_body": {
    "name": "Fortified Body",
    "prerequisite": "Equilibrium",
    "benefit": "The Force shields you against ailments, toxins, and radiation poisoning, making you immune to Disease, Poison, and Radiation.",
    "description": "The Force shields you against ailments, toxins, and radiation poisoning, making you immune to Disease, Poison, and Radiation."
  },
  "instrument_of_the_force": {
    "name": "Instrument of the Force",
    "prerequisite": "",
    "benefit": "You are particularly in tune with The Living Force. When you successfully use Search Your Feelings, you gain a Force Point that must be used before the end of the encounter.",
    "description": "You are particularly in tune with The Living Force. When you successfully use Search Your Feelings, you gain a Force Point that must be used before the end of the encounter.\n\nIf you use this Force Point in a manner that would end in unfavorable results (per Search Your Feelings), you raise your Dark Side Score by 1. lf you use the Force Point in an action that would normally raise your Dark Side Score, you raise your Dark Side Score by 2 instead."
  },
  "long_call": {
    "name": "Long Call",
    "prerequisite": "Mystical Link",
    "benefit": "When using the Telepathy ability of Use the Force, you reduce the DC of the Use the Force check by half, as do those Force-users for whom you are a willing telepathic recipient. When attempting to contact an unwilling target, you can reroll and take the better result.",
    "description": "When using the Telepathy ability of Use the Force, you reduce the DC of the Use the Force check by half, as do those Force-users for whom you are a willing telepathic recipient. When attempting to contact an unwilling target, you can reroll and take the better result.\n\nBy spending a Force Point, you can simultaneously contact a number of targets equal to your Charisma modifier (minimum two) with a single Use the Force check."
  },
  "mystical_link": {
    "name": "Mystical Link",
    "prerequisite": "",
    "benefit": "The Force guides you in unexpected ways. As a Standard Action, make a DC 30 Use the Force check. If the check is successful, you gain one of the following benefits, as selected by the Gamemaster:",
    "description": "The Force guides you in unexpected ways. As a Standard Action, make a DC 30 Use the Force check. If the check is successful, you gain one of the following benefits, as selected by the Gamemaster:"
  },
  "one_force_power_is_returned_to_your_force_power_suite": {
    "name": "One Force Power is returned to your Force Power Suite.",
    "prerequisite": "",
    "benefit": "Gain one Force Point that is lost if it is not spent before the end of the encounter.\nGain an additional use of a Force-related Talent or Feat normally restricted to once per encounter.",
    "description": "Gain one Force Point that is lost if it is not spent before the end of the encounter.\nGain an additional use of a Force-related Talent or Feat normally restricted to once per encounter."
  },
  "roll_an_additional_die_when_making_a_use_the_force_check_and_select_the_highest_die_rolled": {
    "name": "Roll an additional die when making a Use the Force check and select the highest die rolled.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "attune_weapon": {
    "name": "Attune Weapon",
    "prerequisite": "",
    "benefit": "You may spend a Force Point to attune a melee weapon. Attuning the weapon takes a Full-Round Action. From that point forward, whenever you wield the attuned weapon, you gain a +1 Force bonus on attack rolls.",
    "description": "You may spend a Force Point to attune a melee weapon. Attuning the weapon takes a Full-Round Action. From that point forward, whenever you wield the attuned weapon, you gain a +1 Force bonus on attack rolls.\n\nThe weapon is attuned to you alone; others who wield the weapon do not gain the Force bonus."
  },
  "empower_weapon": {
    "name": "Empower Weapon",
    "prerequisite": "",
    "benefit": "You may spend a Force Point to empower a melee weapon. Empowering the weapon takes a Full-Round Action. From that point forward, the Empowered Weapon deals an additional die of damage, but only when wielded by you.",
    "description": "You may spend a Force Point to empower a melee weapon. Empowering the weapon takes a Full-Round Action. From that point forward, the Empowered Weapon deals an additional die of damage, but only when wielded by you.\n\nFor example, an empowered Lightsaber deals 3d8 points of damage, instead of 2d8 points of damage. Others who wield the weapon do not gain the bonus damage die."
  },
  "force_talisman": {
    "name": "Force Talisman",
    "prerequisite": "",
    "benefit": "You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you. Creating the Talisman takes a Full-Round Action.",
    "description": "You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you. Creating the Talisman takes a Full-Round Action.\n\nWhile you wear or carry the Talisman on your person, you gain a +1 Force bonus to one of your Defenses (Reflex Defense, Fortitude Defense, or Will Defense).\n\nYou may only have one Force Talisman active at a given time, and if your Force Talisman is destroyed, you may not create another Force Talisman for 24 hours."
  },
  "greater_force_talisman": {
    "name": "Greater Force Talisman",
    "prerequisite": "Force Talisman",
    "benefit": "You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you. Creating the Talisman takes a Full-Round Action.",
    "description": "You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you. Creating the Talisman takes a Full-Round Action.\n\nWhile you wear or carry the Talisman on your person, you gain a +1 Force bonus to all of your Defenses (Reflex Defense, Fortitude Defense, and Will Defense).\n\nYou may only have one Greater Force Talisman active at a given time, and if your Greater Force Talisman is destroyed, you may not create another Greater Force Talisman (or regular Force Talisman) for 24 hours."
  },
  "focused_force_talisman": {
    "name": "Focused Force Talisman",
    "prerequisite": "Force Talisman",
    "benefit": "When you create a Force Talisman, you can select a single Force Power from your Force Power Suite. Whenever you are wearing this Focused Force Talisman and activate the selected Force Power, you can spend a Force Point to immediately regain all your expended uses of that spent Force Power, adding it to your Force Power Suite.",
    "description": "When you create a Force Talisman, you can select a single Force Power from your Force Power Suite. Whenever you are wearing this Focused Force Talisman and activate the selected Force Power, you can spend a Force Point to immediately regain all your expended uses of that spent Force Power, adding it to your Force Power Suite."
  },
  "force_throw": {
    "name": "Force Throw",
    "prerequisite": "Empower Weapon",
    "benefit": "You can hurl Simple Weapons (Melee), or Advanced Melee Weapons your size or smaller as a Standard Action, treating it as a Thrown Weapon. The Thrown Weapon deals normal weapon damage if it hits.",
    "description": "You can hurl Simple Weapons (Melee), or Advanced Melee Weapons your size or smaller as a Standard Action, treating it as a Thrown Weapon. The Thrown Weapon deals normal weapon damage if it hits.\n\nIf the weapon deals piercing or slashing damage, it becomes embedded in your target, remaining there and causing an additional die of damage each round at the end of the target's turn, and also when it is removed (removing the embedded weapon is a Swift Action, and an adjacent ally can remove the embedded weapon for you).\n\nYour target must be within 6 squares of you. The weapon does not automatically return to you, but you can retrieve it with the Move Object Force Power (dealing an additional die of damage in the process, if the weapon is embedded in the target, as above)."
  },
  "greater_focused_force_talisman": {
    "name": "Greater Focused Force Talisman",
    "prerequisite": "Force Talisman, Focused Force Talisman",
    "benefit": "As the Focused Force Talisman Talent, except that a Force Point spent to immediately recover the selected Force Power does not count against the \"one per turn\" restriction on spending Force Points.",
    "description": "As the Focused Force Talisman Talent, except that a Force Point spent to immediately recover the selected Force Power does not count against the \"one per turn\" restriction on spending Force Points."
  },
  "primitive_block": {
    "name": "Primitive Block",
    "prerequisite": "Empower Weapon",
    "benefit": "As a Reaction, you may negate a melee attack by making a successful Use the Force check. The DC of the Use the Force check is equal to the result of the attack roll you wish to negate, and you take a cumulative -5 penalty on your Use the Force checks to use this Talent for every time you have used Primitive Block since the beginning of your last turn.",
    "description": "As a Reaction, you may negate a melee attack by making a successful Use the Force check. The DC of the Use the Force check is equal to the result of the attack roll you wish to negate, and you take a cumulative -5 penalty on your Use the Force checks to use this Talent for every time you have used Primitive Block since the beginning of your last turn.\n\nYou must have an Empowered Weapon drawn to use this Talent, and you must be aware of the attack and not Flat-Footed. You may spend a Force Point to use this Talent to negate an attack against an adjacent character.\n\nYou may use the Primitive Block Talent to negate melee Area Attacks, such as those made by the Whirlwind Attack feat. If you succeed on the Use the Force check, you take half damage if the attack hit, and no damage if the attack missed."
  },
  "fools_luck": {
    "name": "Fool's Luck",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can spend a Force Point to gain one of the following benefits for the rest of the encounter:",
    "description": "As a Standard Action, you can spend a Force Point to gain one of the following benefits for the rest of the encounter:\n\n+1 competence bonus to attack rolls\n+5 competence bonus on Skill Checks\n+1 competence bonus to all your Defenses\nIf you use this Talent to grant yourself a luck bonus to your Defenses, this bonus also applies to the Defenses of any Vehicle you are on (even if you are not the Pilot)."
  },
  "fortunes_favor": {
    "name": "Fortune's Favor",
    "prerequisite": "",
    "benefit": "Whenever you score a Critical Hit with a melee or ranged attack, you gain a free Standard Action. You must take the extra Standard Action before the end of your turn, or else it is lost.",
    "description": "Whenever you score a Critical Hit with a melee or ranged attack, you gain a free Standard Action. You must take the extra Standard Action before the end of your turn, or else it is lost."
  },
  "gambler": {
    "name": "Gambler",
    "prerequisite": "",
    "benefit": "You gain a +2 competence bonus on Wisdom checks when you Gamble. You can select this Talent multiple times; each time you take this Talent, the competence bonus increases by +2.",
    "description": "You gain a +2 competence bonus on Wisdom checks when you Gamble. You can select this Talent multiple times; each time you take this Talent, the competence bonus increases by +2."
  },
  "knack": {
    "name": "Knack",
    "prerequisite": "",
    "benefit": "Once per day, you can reroll a Skill Check and take the better result. You can select this Talent multiple times; each time you select this Talent, you can use it one additional time per day.",
    "description": "Once per day, you can reroll a Skill Check and take the better result. You can select this Talent multiple times; each time you select this Talent, you can use it one additional time per day."
  },
  "lucky_shot": {
    "name": "Lucky Shot",
    "prerequisite": "Knack",
    "benefit": "Once per day, you can reroll an attack roll and take the better result. You can select this Talent multiple times; each time you select this Talent, you can use it one additional time per day.",
    "description": "Once per day, you can reroll an attack roll and take the better result. You can select this Talent multiple times; each time you select this Talent, you can use it one additional time per day."
  },
  "avert_disaster": {
    "name": "Avert Disaster",
    "prerequisite": "Fool's Luck",
    "benefit": "Once per encounter, you can turn a Critical Hit against you into a normal hit.",
    "description": "Once per encounter, you can turn a Critical Hit against you into a normal hit."
  },
  "better_lucky_than_dead": {
    "name": "Better Lucky than Dead",
    "prerequisite": "Fool's Luck",
    "benefit": "Once per encounter, as a Reaction, you gain a +5 luck bonus to any one Defense until the start of your next turn.",
    "description": "Once per encounter, as a Reaction, you gain a +5 luck bonus to any one Defense until the start of your next turn."
  },
  "dumb_luck": {
    "name": "Dumb Luck",
    "prerequisite": "Knack, Lucky Shot",
    "benefit": "You are possessed of incredible luck and an uncanny ability to succeed where others would fail. You can use each of the following actions once per encounter as a Standard Action:",
    "description": "You are possessed of incredible luck and an uncanny ability to succeed where others would fail. You can use each of the following actions once per encounter as a Standard Action:\n\nElude Enemy: Make a single melee or ranged attack against any target within your Range. If you damage the target, you gain a +2 bonus to your Reflex Defense against this target until the beginning of your next turn.\nEscape: Make a single melee or ranged attack against any target within your Range. If that target successfully damages you before the start of your next turn, you can immediately move 2 squares as a Reaction. This movement does not provoke Attacks of Opportunity.\nMake your Own Luck: Make a single melee or ranged attack against any target within your Range. If you miss this target, you gain a +2 bonus on your next attack roll."
  },
  "labyrinthine_mind": {
    "name": "Labyrinthine Mind",
    "prerequisite": "",
    "benefit": "Once per encounter, as a Reaction, you become immune to all Mind-Affecting effects until the end of your next turn (you can choose to ignore this for beneficial effects).",
    "description": "Once per encounter, as a Reaction, you become immune to all Mind-Affecting effects until the end of your next turn (you can choose to ignore this for beneficial effects).\n\nAny Mind-Affecting effects currently afflicting you are also removed, though you can choose to retain any beneficial effects you currently have."
  },
  "lucky_stop": {
    "name": "Lucky Stop",
    "prerequisite": "Knack",
    "benefit": "A successful hit against you is mitigated by an item you just happen to be wearing or carrying, or glances off your armor or clothing in just the right way. Once per encounter, as a Reaction, you can negate the damage from a single attack that would normally reduce you to 0 Hit Points.",
    "description": "A successful hit against you is mitigated by an item you just happen to be wearing or carrying, or glances off your armor or clothing in just the right way. Once per encounter, as a Reaction, you can negate the damage from a single attack that would normally reduce you to 0 Hit Points."
  },
  "ricochet_shot": {
    "name": "Ricochet Shot",
    "prerequisite": "Knack, Lucky Shot",
    "benefit": "When making a ranged attack against a target with Cover, you can choose to reduce the benefit of that target's Cover by one step, from Improved Cover to Cover, or Cover to no Cover.",
    "description": "When making a ranged attack against a target with Cover, you can choose to reduce the benefit of that target's Cover by one step, from Improved Cover to Cover, or Cover to no Cover.\n\nYou deal only half damage with this attack."
  },
  "uncanny_luck": {
    "name": "Uncanny Luck",
    "prerequisite": "Knack, Lucky Shot",
    "benefit": "Once per encounter, you can consider any single d20 roll of 16 or higher to be a Natural 20.",
    "description": "Once per encounter, you can consider any single d20 roll of 16 or higher to be a Natural 20."
  },
  "unlikely_shot": {
    "name": "Unlikely Shot",
    "prerequisite": "Knack, Lucky Shot",
    "benefit": "Once per encounter, you can reroll the damage of one attack, keeping the better of the two results.",
    "description": "Once per encounter, you can reroll the damage of one attack, keeping the better of the two results."
  },
  "barter": {
    "name": "Barter",
    "prerequisite": "",
    "benefit": "You may reroll any Persuasion check made to Haggle. You must, however, accept the results of the reroll, even if it is worse.",
    "description": "You may reroll any Persuasion check made to Haggle. You must, however, accept the results of the reroll, even if it is worse."
  },
  "fringe_savant": {
    "name": "Fringe Savant",
    "prerequisite": "",
    "benefit": "Whenever you roll a Natural 20 on a Skill Check during an encounter, you gain one temporary Force Point. If the Force Point is not used before the end of the encounter, it is lost.",
    "description": "Whenever you roll a Natural 20 on a Skill Check during an encounter, you gain one temporary Force Point. If the Force Point is not used before the end of the encounter, it is lost."
  },
  "long_stride": {
    "name": "Long Stride",
    "prerequisite": "",
    "benefit": "Your Speed increases by 2 squares if you are wearing Light Armor or no Armor. If you have a natural Fly, Climb, or Swim Speed, it increases by 2 squares as well.",
    "description": "Your Speed increases by 2 squares if you are wearing Light Armor or no Armor. If you have a natural Fly, Climb, or Swim Speed, it increases by 2 squares as well.\n\nYou cannot use this Talent if you are wearing Medium Armor or Heavy Armor."
  },
  "jury_rigger": {
    "name": "Jury-Rigger",
    "prerequisite": "",
    "benefit": "You may reroll any Mechanics check made to Jury-Rig. You must, however, accept the result of the reroll, even if it is worse.",
    "description": "You may reroll any Mechanics check made to Jury-Rig. You must, however, accept the result of the reroll, even if it is worse."
  },
  "flee": {
    "name": "Flee",
    "prerequisite": "Long Stride",
    "benefit": "As a Standard Action, you can designate a single opponent and move up to your Speed away from that opponent; this movement does not provoke Attacks of Opportunity from that opponent, though it might provoke as normal for all other opponents.",
    "description": "As a Standard Action, you can designate a single opponent and move up to your Speed away from that opponent; this movement does not provoke Attacks of Opportunity from that opponent, though it might provoke as normal for all other opponents."
  },
  "in_addition_your_speed_increases_by_2_until_the_end_of_your_next_turn": {
    "name": "In addition, your Speed increases by 2 until the end of your next turn.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "sidestep": {
    "name": "Sidestep",
    "prerequisite": "Long Stride",
    "benefit": "You can use a Swift Action to reduce the cost of each move into a diagonal space to 1 until the end of your turn if you are wearing Light Armor or no Armor.",
    "description": "You can use a Swift Action to reduce the cost of each move into a diagonal space to 1 until the end of your turn if you are wearing Light Armor or no Armor.\n\nYou cannot use this Talent if you are wearing Medium Armor or Heavy Armor."
  },
  "surge": {
    "name": "Surge",
    "prerequisite": "Long Stride",
    "benefit": "Once per encounter, you can use a Swift Action to move up to your Speed.",
    "description": "Once per encounter, you can use a Swift Action to move up to your Speed."
  },
  "swift_strider": {
    "name": "Swift Strider",
    "prerequisite": "Long Stride, Sidestep",
    "benefit": "You are skilled at maneuvering on the battlefield thanks to your experience surviving in dangerous places. You can use each of the following actions once per encounter:",
    "description": "You are skilled at maneuvering on the battlefield thanks to your experience surviving in dangerous places. You can use each of the following actions once per encounter:\n\nBlurring Burst: As a Move Action, move up to your Speed, and gain a +2 bonus to your Reflex Defense until the end of the encounter.\nSudden Assault: Make a Charge attack against an enemy within range as a Standard Action. You take no penalty to your Reflex Defense for this attack.\nWeaving Stride: Move up to your Speed as a Move Action. You gain a cumulative +2 dodge bonus to your Reflex Defense for each Attack of Opportunity made against you during this movement. This bonus lasts until the beginning of your next turn."
  },
  "dogfight_gunner": {
    "name": "Dogfight Gunner",
    "prerequisite": "Expert Gunner",
    "benefit": "While your Vehicle is engaged in a Dogfight, you take no penalty on your attack rolls with Vehicle Weapons, even if you are not the Pilot.",
    "description": "While your Vehicle is engaged in a Dogfight, you take no penalty on your attack rolls with Vehicle Weapons, even if you are not the Pilot."
  },
  "expert_gunner": {
    "name": "Expert Gunner",
    "prerequisite": "",
    "benefit": "You gain a +1 bonus on attack rolls made using Vehicle Weapons.",
    "description": "You gain a +1 bonus on attack rolls made using Vehicle Weapons."
  },
  "quick_trigger": {
    "name": "Quick Trigger",
    "prerequisite": "Expert Gunner",
    "benefit": "Whenever an enemy Vehicle moves out of your square, or an adjacent square, you may make a single attack against that Vehicle as an Attack of Opportunity.",
    "description": "Whenever an enemy Vehicle moves out of your square, or an adjacent square, you may make a single attack against that Vehicle as an Attack of Opportunity."
  },
  "system_hit": {
    "name": "System Hit",
    "prerequisite": "Expert Gunner",
    "benefit": "Whenever you deal damage to a Vehicle that equals or exceeds its Damage Threshold, you move that Vehicle an additional -1 step on the Condition Track.",
    "description": "Whenever you deal damage to a Vehicle that equals or exceeds its Damage Threshold, you move that Vehicle an additional -1 step on the Condition Track."
  },
  "crippling_hit": {
    "name": "Crippling Hit",
    "prerequisite": "Expert Gunner, System Hit",
    "benefit": "Whenever you make an attack that causes a Vehicle to move -1 or more steps down the Condition Track, you may also cause it to lose one of the following systems: Hyperdrive, one Weapon System or Weapon Battery, or communications.",
    "description": "Whenever you make an attack that causes a Vehicle to move -1 or more steps down the Condition Track, you may also cause it to lose one of the following systems: Hyperdrive, one Weapon System or Weapon Battery, or communications.\n\nThe system remains inoperable until the target regains all steps on the Condition Track."
  },
  "fast_attack_specialist": {
    "name": "Fast Attack Specialist",
    "prerequisite": "Expert Gunner, Quick Trigger",
    "benefit": "Once per encounter, when Piloting a Vehicle of Gargantuan size or smaller, you can make a Full Attack as a Standard Action. You can spend a Force Point to use this Talent one additional time in an encounter.",
    "description": "Once per encounter, when Piloting a Vehicle of Gargantuan size or smaller, you can make a Full Attack as a Standard Action. You can spend a Force Point to use this Talent one additional time in an encounter."
  },
  "great_shot": {
    "name": "Great Shot",
    "prerequisite": "",
    "benefit": "When firing a Vehicle Weapon, you treat the distance to the target as though it were one Range category less than it actually is. For example, when targeting an opponent at Short Range, you treat it as though it were at least Point-Blank Range for the purpose of determining bonuses or penalties.",
    "description": "When firing a Vehicle Weapon, you treat the distance to the target as though it were one Range category less than it actually is. For example, when targeting an opponent at Short Range, you treat it as though it were at least Point-Blank Range for the purpose of determining bonuses or penalties."
  },
  "overcharged_shot": {
    "name": "Overcharged Shot",
    "prerequisite": "Expert Gunner",
    "benefit": "You know how to overcharge your Vehicle's weapon to produce additional damage. As a Swift Action, you can overcharge your Vehicle's energy weapon and deal +1 die of damage on your next attack in the same turn.",
    "description": "You know how to overcharge your Vehicle's weapon to produce additional damage. As a Swift Action, you can overcharge your Vehicle's energy weapon and deal +1 die of damage on your next attack in the same turn.\n\nHowever, your weapon loses 1 die of damage on its subsequent attacks and cannot be overcharged again, until a full round passes without the weapon firing."
  },
  "synchronized_fire": {
    "name": "Synchronized Fire",
    "prerequisite": "Expert Gunner",
    "benefit": "Once per encounter, you may ready to fire a single weapon at the same target as an ally, and you coordinate with a single weapon of your ally.",
    "description": "Once per encounter, you may ready to fire a single weapon at the same target as an ally, and you coordinate with a single weapon of your ally.\n\nIf both attacks hit, you add the damage of the two weapons together before applying the target's Shield Rating or Damage Reduction, and treat it as a single attack for purposes of exceeding the target's Damage Threshold."
  },
  "debilitating_shot": {
    "name": "Debilitating Shot",
    "prerequisite": "",
    "benefit": "If you Aim before making a ranged attack, you move the target character -1 step along the Condition Track if the attack deals damage. This Talent can be used only against characters, not objects or Vehicles.",
    "description": "If you Aim before making a ranged attack, you move the target character -1 step along the Condition Track if the attack deals damage. This Talent can be used only against characters, not objects or Vehicles."
  },
  "deceptive_shot": {
    "name": "Deceptive Shot",
    "prerequisite": "",
    "benefit": "Select one target in line of sight within 6 squares. You can spend two Swift Actions on the same turn to make a Deception check; if the check result equals or exceeds the target's Will Defense, the target is denied its Dexterity bonus to Reflex Defense against your attacks until the beginning of your next turn.",
    "description": "Select one target in line of sight within 6 squares. You can spend two Swift Actions on the same turn to make a Deception check; if the check result equals or exceeds the target's Will Defense, the target is denied its Dexterity bonus to Reflex Defense against your attacks until the beginning of your next turn."
  },
  "improved_quick_draw": {
    "name": "Improved Quick Draw",
    "prerequisite": "",
    "benefit": "If you are carrying a Pistol (either in your hand or in a holster), you may draw the Pistol and make a single attack during a Surprise Round, even if you are Surprised.",
    "description": "If you are carrying a Pistol (either in your hand or in a holster), you may draw the Pistol and make a single attack during a Surprise Round, even if you are Surprised.\n\nIf you are not Surprised, you may take any single Action of your choice, as normal."
  },
  "knockdown_shot": {
    "name": "Knockdown Shot",
    "prerequisite": "",
    "benefit": "If you Aim before making a ranged attack, and the attack hits, you knock the target Prone in addition to dealing damage. You can't use this Talent to knock down targets two or more size categories bigger than you.",
    "description": "If you Aim before making a ranged attack, and the attack hits, you knock the target Prone in addition to dealing damage. You can't use this Talent to knock down targets two or more size categories bigger than you."
  },
  "multiattack_proficiency_pistols": {
    "name": "Multiattack Proficiency (Pistols)",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "ranged_disarm": {
    "name": "Ranged Disarm",
    "prerequisite": "",
    "benefit": "You can Disarm an opponent using a ranged attack. If your ranged Disarm attack fails, your opponent doesn't get to make a free attack against you.",
    "description": "You can Disarm an opponent using a ranged attack. If your ranged Disarm attack fails, your opponent doesn't get to make a free attack against you."
  },
  "trigger_work": {
    "name": "Trigger Work",
    "prerequisite": "",
    "benefit": "You take no penalty on your attack roll when using the Rapid Shot feat.",
    "description": "You take no penalty on your attack roll when using the Rapid Shot feat."
  },
  "blind_shot": {
    "name": "Blind Shot",
    "prerequisite": "",
    "benefit": "You ignore the penalties on your ranged attack rolls when a target has Concealment or Total Concealment.",
    "description": "You ignore the penalties on your ranged attack rolls when a target has Concealment or Total Concealment."
  },
  "damaging_disarm": {
    "name": "Damaging Disarm",
    "prerequisite": "Ranged Disarm",
    "benefit": "If you successfully Disarm an opponent using a ranged attack, the target also takes half damage from the attack.",
    "description": "If you successfully Disarm an opponent using a ranged attack, the target also takes half damage from the attack."
  },
  "keep_them_honest": {
    "name": "Keep Them Honest",
    "prerequisite": "Careful Shot",
    "benefit": "When using the Aid Another Action to Suppress an Enemy, the enemy instead takes a -5 penalty to all attack rolls until the end of your next turn.",
    "description": "When using the Aid Another Action to Suppress an Enemy, the enemy instead takes a -5 penalty to all attack rolls until the end of your next turn."
  },
  "lingering_debilitation": {
    "name": "Lingering Debilitation",
    "prerequisite": "Debilitating Shot",
    "benefit": "Once per encounter, when you successfully use Debilitating Shot to move a target character -1 step on the Condition Track, the target suffers a Persistent Condition requiring 4 hours of rest or a DC 25 Treat Injury check to remove.",
    "description": "Once per encounter, when you successfully use Debilitating Shot to move a target character -1 step on the Condition Track, the target suffers a Persistent Condition requiring 4 hours of rest or a DC 25 Treat Injury check to remove."
  },
  "mobile_attack_pistols": {
    "name": "Mobile Attack (Pistols)",
    "prerequisite": "Multiattack Proficiency (Pistols), Dual Weapon Mastery I, Weapon Focus (Pistols)",
    "benefit": "",
    "description": ""
  },
  "pistol_duelist": {
    "name": "Pistol Duelist",
    "prerequisite": "",
    "benefit": "You are a master of the elegant, if archaic, custom of dueling with Pistols. You can use each of the following Actions once per encounter as a Standard Action:",
    "description": "You are a master of the elegant, if archaic, custom of dueling with Pistols. You can use each of the following Actions once per encounter as a Standard Action:\n\nEnd Game: You make a single ranged attack with a Pistol against an opponent within Range. The opponent's Damage Threshold is halved (rounded down) for the purpose of this attack.\nSnap Aiming: You make a single ranged attack with the benefits of Aiming.\nStand Ready: You gain a +4 bonus to your Reflex Defense until the end of your next turn and make a single ranged attack."
  },
  "ranged_flank": {
    "name": "Ranged Flank",
    "prerequisite": "",
    "benefit": "If you are within 6 squares of a target and are armed with a Pistol or a Rifle, you can act as though you occupied the nearest square adjacent to the target for purposes of determining whether or not you or any allies are Flanking that target.",
    "description": "If you are within 6 squares of a target and are armed with a Pistol or a Rifle, you can act as though you occupied the nearest square adjacent to the target for purposes of determining whether or not you or any allies are Flanking that target.\n\nYou may only be considered to be Flanking a single target at a time. You must spend a Swift Action on your turn to designate the target you Flank at range."
  },
  "retreating_fire": {
    "name": "Retreating Fire",
    "prerequisite": "",
    "benefit": "When moving away from a pursuing target, if you either Run or use two Move Actions during this turn, you can make a single ranged attack with a -5 penalty as part of your Move Action.",
    "description": "When moving away from a pursuing target, if you either Run or use two Move Actions during this turn, you can make a single ranged attack with a -5 penalty as part of your Move Action.\n\nYou can spend a Force Point to avoid the penalty."
  },
  "slowing_shot": {
    "name": "Slowing Shot",
    "prerequisite": "Debilitating Shot",
    "benefit": "If you successfully use Debilitating Shot, until the target moves to the normal state on the Condition Track or until the end of the encounter, the target's Speed is reduced by 2 squares, and it loses its Dexterity bonus to its Reflex Defense and is considered Flat-Footed.",
    "description": "If you successfully use Debilitating Shot, until the target moves to the normal state on the Condition Track or until the end of the encounter, the target's Speed is reduced by 2 squares, and it loses its Dexterity bonus to its Reflex Defense and is considered Flat-Footed.\n\nThese effects occur in addition to the effect of Debilitating Shot. If you spend a Force Point, the target's Speed is reduced by 4 squares or half of its normal speed, whichever is the greater reduction."
  },
  "swift_shot": {
    "name": "Swift Shot",
    "prerequisite": "",
    "benefit": "Once per encounter, you can make a single ranged attack with a handheld weapon as a Swift Action instead of a Standard Action. However, you cannot use your remaining Actions for an attack.",
    "description": "Once per encounter, you can make a single ranged attack with a handheld weapon as a Swift Action instead of a Standard Action. However, you cannot use your remaining Actions for an attack."
  },
  "inspire_fear_i": {
    "name": "Inspire Fear I",
    "prerequisite": "",
    "benefit": "Your infamy and reputation are such that any opponent whose level is equal to or less than your Character Level takes a -1 penalty on attack rolls and opposed Skill Checks made against you, as well as Use the Force checks made to activate Force Powers against you. This is a Mind-Affecting Fear effect.",
    "description": "Your infamy and reputation are such that any opponent whose level is equal to or less than your Character Level takes a -1 penalty on attack rolls and opposed Skill Checks made against you, as well as Use the Force checks made to activate Force Powers against you. This is a Mind-Affecting Fear effect."
  },
  "inspire_fear_ii": {
    "name": "Inspire Fear II",
    "prerequisite": "Inspire Fear I",
    "benefit": "As Inspire Fear I, except that the penalty increases to -2.",
    "description": "As Inspire Fear I, except that the penalty increases to -2."
  },
  "inspire_fear_iii": {
    "name": "Inspire Fear III",
    "prerequisite": "Inspire Fear I, Inspire Fear II",
    "benefit": "As Inspire Fear I, except that the penalty increases to -5.",
    "description": "As Inspire Fear I, except that the penalty increases to -5."
  },
  "shared_notoriety": {
    "name": "Shared Notoriety",
    "prerequisite": "Notorious",
    "benefit": "When your Minions invoke your name, others take note. If you have Minions, they may reroll any Persuasion checks made to intimidate others, but the result of the reroll must be accepted, even if it is worse.",
    "description": "When your Minions invoke your name, others take note. If you have Minions, they may reroll any Persuasion checks made to intimidate others, but the result of the reroll must be accepted, even if it is worse."
  },
  "fear_me": {
    "name": "Fear Me",
    "prerequisite": "Attract Minion, Inspire Fear I, Inspire Fear II",
    "benefit": "Such is the fear you instill in your minions that when in your presence, they would rather die than disappoint you. Once per encounter, as a Reaction to one of your minions being moved down the Condition Track, you can reduce the number of steps the minion moves down the Condition Track by 1. Additionally, the target regains Hit Points equal to your Heroic Level. If the target is reduced to 0 Hit Points or moved to the bottom of the Condition Track, you cannot use this Talent on that target.",
    "description": "Such is the fear you instill in your minions that when in your presence, they would rather die than disappoint you. Once per encounter, as a Reaction to one of your minions being moved down the Condition Track, you can reduce the number of steps the minion moves down the Condition Track by 1. Additionally, the target regains Hit Points equal to your Heroic Level. If the target is reduced to 0 Hit Points or moved to the bottom of the Condition Track, you cannot use this Talent on that target."
  },
  "frighten": {
    "name": "Frighten",
    "prerequisite": "Attract Minion, Inspire Fear I",
    "benefit": "Once per encounter, you can designate a minion as a Free Action to spread fear among your enemies. At any point before the end of the encounter, you can activate this ability to force all enemies adjacent to your minion to move 1 square away from the minion. This movement does not provoke Attacks of Opportunity. This is a Mind-Affecting effect.",
    "description": "Once per encounter, you can designate a minion as a Free Action to spread fear among your enemies. At any point before the end of the encounter, you can activate this ability to force all enemies adjacent to your minion to move 1 square away from the minion. This movement does not provoke Attacks of Opportunity. This is a Mind-Affecting effect."
  },
  "master_manipulator": {
    "name": "Master Manipulator",
    "prerequisite": "Notorious, Skill Focus (Persuasion)",
    "benefit": "When you make a successful Persuasion check, you can immediately make a second Persuasion check against the same target, even if it is not normally allowed. The second Persuasion check need not be for the same use of the Persuasion skill as the first. For example, if you successfully Change Attitude of the target, you can immediately attempt to Change Attitude a second time, or you can attempt to Intimidate the target instead.",
    "description": "When you make a successful Persuasion check, you can immediately make a second Persuasion check against the same target, even if it is not normally allowed. The second Persuasion check need not be for the same use of the Persuasion skill as the first. For example, if you successfully Change Attitude of the target, you can immediately attempt to Change Attitude a second time, or you can attempt to Intimidate the target instead."
  },
  "small_favor": {
    "name": "Small Favor",
    "prerequisite": "Notorious, Trained in Persuasion",
    "benefit": "You can call in a small favor from someone who owes you. Once per day, make a DC 25 Persuasion check. If the check is successful, an informant gives you information, granting you a +10 competence bonus to one Gather Information or Knowledge check made within the next 24 hours.",
    "description": "You can call in a small favor from someone who owes you. Once per day, make a DC 25 Persuasion check. If the check is successful, an informant gives you information, granting you a +10 competence bonus to one Gather Information or Knowledge check made within the next 24 hours."
  },
  "terrify": {
    "name": "Terrify",
    "prerequisite": "Frighten, Inspire Fear I, Inspire Fear II",
    "benefit": "As a Standard Action, you can make a Persuasion check against a target that is within your line of sight and that is also affected by your Inspire Fear Talent. If you equal or exceed the target's Will Defense, then on its next turn the target must spend at least one Move Action to move away from you. If the target is somehow prevented from doing so, then the penalty from the Inspire Fear Talent doubles until the start of your next turn. This is a Mind-Affecting Fear effect.",
    "description": "As a Standard Action, you can make a Persuasion check against a target that is within your line of sight and that is also affected by your Inspire Fear Talent. If you equal or exceed the target's Will Defense, then on its next turn the target must spend at least one Move Action to move away from you. If the target is somehow prevented from doing so, then the penalty from the Inspire Fear Talent doubles until the start of your next turn. This is a Mind-Affecting Fear effect."
  },
  "unsavory_reputation": {
    "name": "Unsavory Reputation",
    "prerequisite": "Inspire Fear I, Inspire Fear II, Inspire Fear III, Notorious",
    "benefit": "Any opponent that is reduced to half Hit Points or fewer while within 6 squares of you takes a -2 penalty on all attack rolls and Skill Checks for the duration of the encounter. This is a Mind-Affecting Fear effect.",
    "description": "Any opponent that is reduced to half Hit Points or fewer while within 6 squares of you takes a -2 penalty on all attack rolls and Skill Checks for the duration of the encounter. This is a Mind-Affecting Fear effect."
  },
  "presence": {
    "name": "Presence",
    "prerequisite": "",
    "benefit": "You can make a Persuasion check to Intimidate a creature as a Standard Action (instead of a Full-Round Action).",
    "description": "You can make a Persuasion check to Intimidate a creature as a Standard Action (instead of a Full-Round Action)."
  },
  "demand_surrender": {
    "name": "Demand Surrender",
    "prerequisite": "Presence",
    "benefit": "Once per encounter, you can make a Persuasion check as a Standard Action to demand surrender from an opponent who has been reduced to one-half or less of its hit points. If your check result equals or exceeds the target's Will Defense, it surrenders to you and your allies, drops any weapons it is holding, and takes no hostile actions. If the target is higher level than you, it gains a +5 bonus to its Will Defense. If you or any of your allies attack it, it no longer submits to your will and can act normally. You can only use this Talent against a particular target once per encounter. This is a Mind-Affecting effect.",
    "description": "Once per encounter, you can make a Persuasion check as a Standard Action to demand surrender from an opponent who has been reduced to one-half or less of its hit points. If your check result equals or exceeds the target's Will Defense, it surrenders to you and your allies, drops any weapons it is holding, and takes no hostile actions. If the target is higher level than you, it gains a +5 bonus to its Will Defense. If you or any of your allies attack it, it no longer submits to your will and can act normally. You can only use this Talent against a particular target once per encounter. This is a Mind-Affecting effect.\n\nUnlike other Mind-Affecting effects, you need only to hail a Vehicle to Demand Surrender. You can demand surrender of a vehicle that has been reduced to one-half or fewer of its hit points, even if the crew is uninjured. You make your check against the Vehicle's Commander; all Nonheroic crews are assumed to have a Will Defense of 10. If the CL of the target Vehicle is greater than your Heroic Level or the CL of your Vehicle, the target gains a +5 bonus to its Will Defense. You can't use this Talent to Demand Surrender from a Vehicle that is more than one size larger than yours under any circumstances- Star Destroyers don't surrender to X-Wings."
  },
  "improved_weaken_resolve": {
    "name": "Improved Weaken Resolve",
    "prerequisite": "Presence, Weaken Resolve",
    "benefit": "As Weaken Resolve, except that the target doesn't stop fleeing from you if it is wounded.",
    "description": "As Weaken Resolve, except that the target doesn't stop fleeing from you if it is wounded."
  },
  "weaken_resolve": {
    "name": "Weaken Resolve",
    "prerequisite": "Presence",
    "benefit": "Once per round, when you deal damage equal to or greater than the target's Damage Threshold, you can make a Persuasion check as a Free Action; if the result equals or exceeds the target's Will Defense, you fill the target with terror, causing it to flee from you at top speed for 1 minute. The target can't take Standard Actions, Swift Actions, or Full-Round Actions while fleeing, but the target stops fleeing and can act normally if it is wounded. As a Free Action or Reaction, the target can spend a Force Point (if it has not already spent one earlier in the round) to negate the effect. The effect is automatically negated if the target's level is equal to or higher than your Character Level. This is a Mind-Affecting fear effect.",
    "description": "Once per round, when you deal damage equal to or greater than the target's Damage Threshold, you can make a Persuasion check as a Free Action; if the result equals or exceeds the target's Will Defense, you fill the target with terror, causing it to flee from you at top speed for 1 minute. The target can't take Standard Actions, Swift Actions, or Full-Round Actions while fleeing, but the target stops fleeing and can act normally if it is wounded. As a Free Action or Reaction, the target can spend a Force Point (if it has not already spent one earlier in the round) to negate the effect. The effect is automatically negated if the target's level is equal to or higher than your Character Level. This is a Mind-Affecting fear effect.\n\nUnlike with other Mind-Affecting effects, you need only to hail a Vehicle to weaken the crew's resolve. When you deal damage that equals or exceeds a Vehicle's Damage Threshold, you may use this Talent; in addition, you may Ready an Action to use this Talent after any Gunner on your Vehicle deals damage that equals or exceeds a Vehicle's Damage Threshold. You make your check against the Vehicle's Commander; all Nonheroic crews are assumed to have a Will Defense of 10. The effect is automatically negated if the target Vehicle's Challenge Level is greater than your Heroic Level or your Vehicle's Challenge Level."
  },
  "fluster": {
    "name": "Fluster",
    "prerequisite": "Presence, Trained in Persuasion",
    "benefit": "You get under an opponent's skin. Once per encounter, make a Persuasion check to Intimidate one creature within line of sight as a Standard Action. On a success, instead of the normal effect of an Intimidate application of the Persuasion skill, the affected creature can take only a single Swift Action on its next turn. If the target is a higher level than you, it gains a +5 bonus to its Will Defense against the Intimidate check. This is a Mind-Affecting effect.",
    "description": "You get under an opponent's skin. Once per encounter, make a Persuasion check to Intimidate one creature within line of sight as a Standard Action. On a success, instead of the normal effect of an Intimidate application of the Persuasion skill, the affected creature can take only a single Swift Action on its next turn. If the target is a higher level than you, it gains a +5 bonus to its Will Defense against the Intimidate check. This is a Mind-Affecting effect."
  },
  "intimidating_defense": {
    "name": "Intimidating Defense",
    "prerequisite": "Presence, Trained in Persuasion",
    "benefit": "Once per encounter, as a Reaction, you can make a Persuasion check to Intimidate one creature that is making a melee or ranged attack against you, and is within your line of sight. If you succeed, you impose a -5 penalty to that attack roll. If the target is a higher level than you, it gains a +5 bonus to its Will Defense against the Intimidate check.This is a Mind-Affecting effect.",
    "description": "Once per encounter, as a Reaction, you can make a Persuasion check to Intimidate one creature that is making a melee or ranged attack against you, and is within your line of sight. If you succeed, you impose a -5 penalty to that attack roll. If the target is a higher level than you, it gains a +5 bonus to its Will Defense against the Intimidate check.This is a Mind-Affecting effect."
  },
  "bolster_ally": {
    "name": "Bolster Ally",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can bolster an ally within line of sight, moving them +1 step along the Condition Track, and giving them a number of Bonus Hit Points equal to their Character Level, if they're at one-half their maximum Hit Points or less. Damage is subtracted from the Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter go away.",
    "description": "As a Standard Action, you can bolster an ally within line of sight, moving them +1 step along the Condition Track, and giving them a number of Bonus Hit Points equal to their Character Level, if they're at one-half their maximum Hit Points or less. Damage is subtracted from the Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter go away.\n\nYou can't Bolster the same ally more than once in a single encounter, and you can't Bolster yourself."
  },
  "ignite_fervor": {
    "name": "Ignite Fervor",
    "prerequisite": "Bolster Ally, Inspire Confidence",
    "benefit": "Whenever you hit an opponent with a melee or ranged attack, you can (as a Free Action) choose to give one ally within your line of sight a bonus to damage on their next attack equal to their Character Level. Once their fervor has been ignited, the affected ally doesn't need to remain within line of sight of you; if their next attack misses, they lose the bonus to damage granted by this Talent.",
    "description": "Whenever you hit an opponent with a melee or ranged attack, you can (as a Free Action) choose to give one ally within your line of sight a bonus to damage on their next attack equal to their Character Level. Once their fervor has been ignited, the affected ally doesn't need to remain within line of sight of you; if their next attack misses, they lose the bonus to damage granted by this Talent.\n\nYou can't Ignite Fervor on yourself."
  },
  "inspire_confidence": {
    "name": "Inspire Confidence",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can inspire confidence in all allies in your line of sight, granting them a +1 morale bonus on attack rolls, and a +1 morale bonus on Skill Checks for the rest of the encounter, or until you're unconscious or dead. Once Inspired, your allies don't need to remain within line of sight of you.",
    "description": "As a Standard Action, you can inspire confidence in all allies in your line of sight, granting them a +1 morale bonus on attack rolls, and a +1 morale bonus on Skill Checks for the rest of the encounter, or until you're unconscious or dead. Once Inspired, your allies don't need to remain within line of sight of you.\n\nYou can't Inspire Confidence in yourself."
  },
  "inspire_haste": {
    "name": "Inspire Haste",
    "prerequisite": "",
    "benefit": "As a Swift Action, you can encourage one of your allies within line of sight to make haste with a Skill Check. On that ally's next turn, that ally can make a Skill Check that normally requires a Standard Action, as a Move Action instead.",
    "description": "As a Swift Action, you can encourage one of your allies within line of sight to make haste with a Skill Check. On that ally's next turn, that ally can make a Skill Check that normally requires a Standard Action, as a Move Action instead."
  },
  "inspire_zeal": {
    "name": "Inspire Zeal",
    "prerequisite": "Bolster Ally, Inspire Confidence, Ignite Fervor",
    "benefit": "Whenever an ally within line of sight of you makes an attack that moves an opponent down the Condition Track (such as dealing damage that equals of exceeds the target's Damage Threshold), that ally moves the target an additional -1 step down the Condition Track.",
    "description": "Whenever an ally within line of sight of you makes an attack that moves an opponent down the Condition Track (such as dealing damage that equals of exceeds the target's Damage Threshold), that ally moves the target an additional -1 step down the Condition Track."
  },
  "beloved": {
    "name": "Beloved",
    "prerequisite": "Bolster Ally, Inspire Confidence",
    "benefit": "Your allies hold you in such esteem that when you are threatened or injured, you can impel them to action. You can use each of the following actions once per encounter:",
    "description": "Your allies hold you in such esteem that when you are threatened or injured, you can impel them to action. You can use each of the following actions once per encounter:\n\nGuardian: Choose one ally as a Swift Action. As long as you remain within 6 squares of the ally, you gain a +2 bonus to your Reflex Defense until the start of your next turn.\nReprisal: Make a single melee or ranged attack against any target within your Range as a Standard Action. If your attack roll succeeds and if that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a Reaction.\nTo Me!: Spend a Swift Action. Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a Reaction. This movement does not provoke Attacks of Opportunity."
  },
  "willpower": {
    "name": "Willpower",
    "prerequisite": "Inspire Confidence",
    "benefit": "You can share your strength of will with your allies. Once per encounter as a Swift Action, you can grant all allies within line of sight a +2 morale bonus to their Will Defense. This bonus lasts for the remainder of the encounter, and once it is granted your allies need not remain within line of sight of you to retain this bonus.",
    "description": "You can share your strength of will with your allies. Once per encounter as a Swift Action, you can grant all allies within line of sight a +2 morale bonus to their Will Defense. This bonus lasts for the remainder of the encounter, and once it is granted your allies need not remain within line of sight of you to retain this bonus."
  },
  "adept_negotiator": {
    "name": "Adept Negotiator",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can weaken the resolve of one opponent with your words. The target must have an Intelligence of 3 or higher, and it must be able to see, hear, and understand you. Make a Persuasion check; if the result equals or exceeds the target's Will Defense, it moves -1 step along the Condition Track. The target gets a +5 bonus to its Will Defense if it is higher level than you.",
    "description": "As a Standard Action, you can weaken the resolve of one opponent with your words. The target must have an Intelligence of 3 or higher, and it must be able to see, hear, and understand you. Make a Persuasion check; if the result equals or exceeds the target's Will Defense, it moves -1 step along the Condition Track. The target gets a +5 bonus to its Will Defense if it is higher level than you.\n\nIf the target reaches the end of its Condition Track, it does not fall unconscious, instead, it cannot attack you or your allies for the remainder of the encounter unless you or one of your allies attacks it or one of its allies first. This is a Mind-Affecting effect.\n\nYou affect the Condition Track of the specific character (usually the Vehicle's Commander), not a Starship."
  },
  "force_persuasion": {
    "name": "Force Persuasion",
    "prerequisite": "Adept Negotiator",
    "benefit": "You can use your Use the Force modifier instead of your Persuasion check modifier when making a Persuasion check. You are considered Trained in the Persuasion skill. If you are entitled to a Persuasion check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations).",
    "description": "You can use your Use the Force modifier instead of your Persuasion check modifier when making a Persuasion check. You are considered Trained in the Persuasion skill. If you are entitled to a Persuasion check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations)."
  },
  "master_negotiator": {
    "name": "Master Negotiator",
    "prerequisite": "Adept Negotiator",
    "benefit": "If you successfully use the Adept Negotiator Talent, your target moves an additional -1 step along the Condition Track. This is a Mind-Affecting effect. You affect the Condition Track of the specific character (usually the Vehicle's Commander), not a Starship.",
    "description": "If you successfully use the Adept Negotiator Talent, your target moves an additional -1 step along the Condition Track. This is a Mind-Affecting effect. You affect the Condition Track of the specific character (usually the Vehicle's Commander), not a Starship."
  },
  "skilled_advisor": {
    "name": "Skilled Advisor",
    "prerequisite": "",
    "benefit": "You can spend a Full-Round Action advising an ally, thereby granting them a +5 bonus on their next Skill Check. If you spend a Force Point, the bonus increases to +10. The target must be able to (and willing) to hear and understand your voice. You cannot advise yourself. This is a Mind-Affecting effect.",
    "description": "You can spend a Full-Round Action advising an ally, thereby granting them a +5 bonus on their next Skill Check. If you spend a Force Point, the bonus increases to +10. The target must be able to (and willing) to hear and understand your voice. You cannot advise yourself. This is a Mind-Affecting effect."
  },
  "adversary_lore": {
    "name": "Adversary Lore",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can peer into The Force and search for weaknesses in the defenses of your enemies. Make a Use the Force check against the Will Defense of a target creature within 12 squares of you and in your line of sight.",
    "description": "As a Standard Action, you can peer into The Force and search for weaknesses in the defenses of your enemies. Make a Use the Force check against the Will Defense of a target creature within 12 squares of you and in your line of sight.\n\nIf the Skill Check equals or exceeds the target's Will Defense, that target takes a -2 penalty to their Reflex Defense against you and all allies who can hear and understand you until the end of your next turn."
  },
  "aggressive_negotiator": {
    "name": "Aggressive Negotiator",
    "prerequisite": "Adept Negotiator",
    "benefit": "Whenever you damage an opponent with a Lightsaber attack, you can Take 10 on any Persuasion checks you make before the end of your next turn, even if you would not normally be able to.",
    "description": "Whenever you damage an opponent with a Lightsaber attack, you can Take 10 on any Persuasion checks you make before the end of your next turn, even if you would not normally be able to."
  },
  "cleanse_mind": {
    "name": "Cleanse Mind",
    "prerequisite": "",
    "benefit": "Once per turn as a Swift Action, you can remove one ongoing Mind-Affecting effect (such as the effects of Demand Surrender or Weaken Resolve Talents, or the effect of being moved to the end of the Condition Track by the Adept Negotiator Talent, or the ongoing effects of the Mind Trick Force Power) from a single allied target within line of sight.",
    "description": "Once per turn as a Swift Action, you can remove one ongoing Mind-Affecting effect (such as the effects of Demand Surrender or Weaken Resolve Talents, or the effect of being moved to the end of the Condition Track by the Adept Negotiator Talent, or the ongoing effects of the Mind Trick Force Power) from a single allied target within line of sight."
  },
  "collective_visions": {
    "name": "Collective Visions",
    "prerequisite": "Farseeing",
    "benefit": "When you use Farseeing, or a Force Power or Talent that has Farseeing as a prerequisite, other Force-users with Farseeing in their Force Power Suite can Aid Another on your Use the Force check as a Reaction, if they are within 6 squares of you.",
    "description": "When you use Farseeing, or a Force Power or Talent that has Farseeing as a prerequisite, other Force-users with Farseeing in their Force Power Suite can Aid Another on your Use the Force check as a Reaction, if they are within 6 squares of you."
  },
  "consulars_vitality": {
    "name": "Consular's Vitality",
    "prerequisite": "",
    "benefit": "Once per round as a Swift Action, you grant one ally within 12 squares of you (and within your line of sight) Bonus Hit Points equal to 5 + your Charisma modifier.",
    "description": "Once per round as a Swift Action, you grant one ally within 12 squares of you (and within your line of sight) Bonus Hit Points equal to 5 + your Charisma modifier.\n\nThese Bonus Hit Points last until the beginning of your next turn (at which point any remaining Bonus Hit Points are lost), and any damage dealt to that ally comes out of Bonus Hit Points first.\n\nYou take a -5 penalty on all Use the Force checks until the beginning of your next turn."
  },
  "consulars_wisdom": {
    "name": "Consular's Wisdom",
    "prerequisite": "Adept Negotiator",
    "benefit": "Once per encounter as a Swift Action, you can choose one ally within your line of sight that can hear and understand you. Until the end of the encounter, that ally adds your Wisdom bonus to its Will Defense against Mind-Affecting effects.",
    "description": "Once per encounter as a Swift Action, you can choose one ally within your line of sight that can hear and understand you. Until the end of the encounter, that ally adds your Wisdom bonus to its Will Defense against Mind-Affecting effects."
  },
  "entreat_aid": {
    "name": "Entreat Aid",
    "prerequisite": "",
    "benefit": "Once per turn as a Swift Action, you can spend a Force Point to let one adjacent ally use the Aid Another Action (as a Reaction) to assist you with a Skill Check. You must make the Skill Check before the end of your turn, or the benefit of the Aid Another Action is lost.",
    "description": "Once per turn as a Swift Action, you can spend a Force Point to let one adjacent ally use the Aid Another Action (as a Reaction) to assist you with a Skill Check. You must make the Skill Check before the end of your turn, or the benefit of the Aid Another Action is lost."
  },
  "force_of_will": {
    "name": "Force of Will",
    "prerequisite": "",
    "benefit": "You gain a +2 insight bonus to your Will Defense. Also, as a Swift Action, you can spend a Force Point to give all allies within 6 squares of you a +2 insight bonus to their Will Defense that lasts for the remainder of the encounter. This bonus does not extend to allies outside the range of the effect, even if they move within 6 squares of you later on.",
    "description": "You gain a +2 insight bonus to your Will Defense. Also, as a Swift Action, you can spend a Force Point to give all allies within 6 squares of you a +2 insight bonus to their Will Defense that lasts for the remainder of the encounter. This bonus does not extend to allies outside the range of the effect, even if they move within 6 squares of you later on.\n\nAllies who benefit from this Talent must remain within 6 squares of you to retain the insight bonus, and they lose it if you are knocked unconscious or killed. This is a Mind-Affecting effect."
  },
  "guiding_strikes": {
    "name": "Guiding Strikes",
    "prerequisite": "",
    "benefit": "When you deal damage to a target by making a Lightsaber attack on your turn, you can use a Swift Action before the end of your turn to activate this Talent. If you do so, allies adjacent to the target at the time you make the attack gain a +2 circumstance bonus to melee attack rolls against the target until the start of your next turn.",
    "description": "When you deal damage to a target by making a Lightsaber attack on your turn, you can use a Swift Action before the end of your turn to activate this Talent. If you do so, allies adjacent to the target at the time you make the attack gain a +2 circumstance bonus to melee attack rolls against the target until the start of your next turn."
  },
  "improved_consulars_vitality": {
    "name": "Improved Consular's Vitality",
    "prerequisite": "Consular's Vitality",
    "benefit": "Whenever you damage a target with a successful Lightsaber attack, you may use the Consular's Vitality Talent as a Free Action instead of a Swift Action until the start of your next turn.",
    "description": "Whenever you damage a target with a successful Lightsaber attack, you may use the Consular's Vitality Talent as a Free Action instead of a Swift Action until the start of your next turn."
  },
  "know_weakness": {
    "name": "Know Weakness",
    "prerequisite": "Adversary Lore",
    "benefit": "Whenever you use Adversary Lore on a target successfully, that target also takes an additional 1d6 points of damage from any successful attack made against it by you or an ally who can hear and understand you until the end of your next turn.",
    "description": "Whenever you use Adversary Lore on a target successfully, that target also takes an additional 1d6 points of damage from any successful attack made against it by you or an ally who can hear and understand you until the end of your next turn."
  },
  "recall": {
    "name": "Recall",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "renew_vision": {
    "name": "Renew Vision",
    "prerequisite": "Farseeing",
    "benefit": "Once per encounter, you can regain all expended uses of the Farseeing Force Power as a Swift Action.",
    "description": "Once per encounter, you can regain all expended uses of the Farseeing Force Power as a Swift Action."
  },
  "visionary_attack": {
    "name": "Visionary Attack",
    "prerequisite": "Farseeing, WatchCircle Initiate",
    "benefit": "As a Reaction, you can make a Use the Force check after you or an ally within 12 squares misses with a melee or ranged attack, removing one use of the Farseeing Force Power from your active Force Power Suite (as though you had activated the Force Power). If your check result equals or exceeds the Will Defense of the target of that missed attack, the attacker can reroll the missed attack roll.",
    "description": "As a Reaction, you can make a Use the Force check after you or an ally within 12 squares misses with a melee or ranged attack, removing one use of the Farseeing Force Power from your active Force Power Suite (as though you had activated the Force Power). If your check result equals or exceeds the Will Defense of the target of that missed attack, the attacker can reroll the missed attack roll.\n\nThis counts as using the Farseeing Force Power against the target, but this Talent replaces the normal rules and effects of Farseeing. Any attack can only be affected by this Talent once (thus, multiple characters cannot use this Talent on the same attack to allow multiple rerolls).\n\nYou take a cumulative -5 penalty on Use the Force checks until the beginning of your next turn when you use this Talent."
  },
  "visionary_defense": {
    "name": "Visionary Defense",
    "prerequisite": "Farseeing, WatchCircle Initiate",
    "benefit": "As a Reaction, you can make a Use the Force check after you or an ally within 12 squares is the target of a melee or ranged attack (but before the results of the attack roll are known), removing one use of the Farseeing Force Power from your active Force Power Suite (as though you had activated the Force Power).",
    "description": "As a Reaction, you can make a Use the Force check after you or an ally within 12 squares is the target of a melee or ranged attack (but before the results of the attack roll are known), removing one use of the Farseeing Force Power from your active Force Power Suite (as though you had activated the Force Power).\n\nIf your check result equals or exceeds the Will Defense of the attacker, you grant the target of that attack a +5 Force bonus to their Reflex Defense against that attack.\n\nThis counts as using the Farseeing Force Power against the attacker, but this Talent replaces the normal rules and effects of Farseeing. Any attack can only be affected by this Talent once (thus, multiple characters cannot use this Talent on the same attack to allow multiple rerolls).\n\nYou take a cumulative -5 penalty on Use the Force checks until the beginning of your next turn when you use this Talent."
  },
  "watchcircle_initiate": {
    "name": "WatchCircle Initiate",
    "prerequisite": "Farseeing",
    "benefit": "As a Reaction, you can make a DC 15 Use the Force check and remove one use of the Farseeing Force Power from your active Force Power Suite (as though you had just activated the Force Power).",
    "description": "As a Reaction, you can make a DC 15 Use the Force check and remove one use of the Farseeing Force Power from your active Force Power Suite (as though you had just activated the Force Power).\n\nIf successful, you subtract 1 from your Force Point total (this cannot be subtracted from temporary Force Points, and does not count as spending a Force Point), and add 1 to the Force Point total of an ally within line of sight.\n\nThis counts as using the Farseeing Force Power against the target, but this Talent replaces the normal rules and effects of Farseeing."
  },
  "acrobatic_recovery": {
    "name": "Acrobatic Recovery",
    "prerequisite": "",
    "benefit": "If any effect causes you to fall Prone, you can make a DC 20 Acrobatics check to remain on your feet.",
    "description": "If any effect causes you to fall Prone, you can make a DC 20 Acrobatics check to remain on your feet."
  },
  "battle_meditation": {
    "name": "Battle Meditation",
    "prerequisite": "",
    "benefit": "The Jedi technique known as Battle Meditation allows you and your allies to work together seamlessly and with a level of precision that can only come from The Force. As a Full-Round Action, you can spend a Force Point to give you and all allies within 6 squares of you a +1 insight bonus on attack rolls that lasts until the end of the encounter.",
    "description": "The Jedi technique known as Battle Meditation allows you and your allies to work together seamlessly and with a level of precision that can only come from The Force. As a Full-Round Action, you can spend a Force Point to give you and all allies within 6 squares of you a +1 insight bonus on attack rolls that lasts until the end of the encounter.\n\nThis bonus does not extend to allies outside the range of the effect, even if they move within 6 squares of you later on. Allies who benefit from the Battle Meditation must remain within 6 squares of you to retain the insight bonus, and they lose it if you are knocked unconscious or killed. This is a Mind-Affecting effect.\n\nThis affects all allied Gunners within 6 squares at Starship Scale."
  },
  "elusive_target": {
    "name": "Elusive Target",
    "prerequisite": "",
    "benefit": "When fighting an opponent or multiple opponents in melee, other opponents attempting to target you with ranged attacks take a -5 penalty. This penalty is in addition to the normal -5 penalty for firing into melee, making the penalty to target you -10.",
    "description": "When fighting an opponent or multiple opponents in melee, other opponents attempting to target you with ranged attacks take a -5 penalty. This penalty is in addition to the normal -5 penalty for firing into melee, making the penalty to target you -10."
  },
  "force_intuition": {
    "name": "Force Intuition",
    "prerequisite": "",
    "benefit": "You can use your Use the Force check modifier instead of your Initiative modifier when making Initiative checks. You are considered Trained in the Initiative skill. If you are entitled to an Initiative check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations).",
    "description": "You can use your Use the Force check modifier instead of your Initiative modifier when making Initiative checks. You are considered Trained in the Initiative skill. If you are entitled to an Initiative check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations).\n\nYou may use this Talent to determine the Initiative of a Starship if you are the Pilot."
  },
  "resilience": {
    "name": "Resilience",
    "prerequisite": "",
    "benefit": "You can spend a Full-Round Action to move +2 steps up the Condition Track.",
    "description": "You can spend a Full-Round Action to move +2 steps up the Condition Track."
  },
  "close_maneuvering": {
    "name": "Close Maneuvering",
    "prerequisite": "",
    "benefit": "Once per turn, you can use a Swift Action to designate a target. Until the start of your next turn, your movement does not provoke Attacks of Opportunity from that target, provided that you end your movement adjacent to that target.",
    "description": "Once per turn, you can use a Swift Action to designate a target. Until the start of your next turn, your movement does not provoke Attacks of Opportunity from that target, provided that you end your movement adjacent to that target."
  },
  "cover_escape": {
    "name": "Cover Escape",
    "prerequisite": "Block or Deflect",
    "benefit": "When you successfully spend a Force Point to negate a attack against an adjacent ally with the Block or Deflect Talents, that ally can move up to 2 squares as a Free Action. This movement does not provoke Attacks of Opportunity.",
    "description": "When you successfully spend a Force Point to negate a attack against an adjacent ally with the Block or Deflect Talents, that ally can move up to 2 squares as a Free Action. This movement does not provoke Attacks of Opportunity."
  },
  "defensive_acuity": {
    "name": "Defensive Acuity",
    "prerequisite": "",
    "benefit": "When you take the Fight Defensively Action, you deal +1 die of damage with Lightsaber attacks and gain a +2 circumstance bonus on Use the Force checks made to negate an attack with the Block or Deflect Talents. These benefits last until the end of your next turn.",
    "description": "When you take the Fight Defensively Action, you deal +1 die of damage with Lightsaber attacks and gain a +2 circumstance bonus on Use the Force checks made to negate an attack with the Block or Deflect Talents. These benefits last until the end of your next turn."
  },
  "exposing_strike": {
    "name": "Exposing Strike",
    "prerequisite": "",
    "benefit": "When you use a Lightsaber to deal damage to a target, you can spend a Force Point to make that target Flat-Footed until the end of your next turn.",
    "description": "When you use a Lightsaber to deal damage to a target, you can spend a Force Point to make that target Flat-Footed until the end of your next turn."
  },
  "forceful_warrior": {
    "name": "Forceful Warrior",
    "prerequisite": "",
    "benefit": "When you score a Critical Hit with a Lightsaber, you gain 1 temporary Force Point. If the Force Point is not used before the end of the encounter, it is lost.",
    "description": "When you score a Critical Hit with a Lightsaber, you gain 1 temporary Force Point. If the Force Point is not used before the end of the encounter, it is lost."
  },
  "grenade_defense": {
    "name": "Grenade Defense",
    "prerequisite": "",
    "benefit": "You can use the Move Light Object application of the Use the Force skill to cast aside Grenades that are thrown at you. As a Reaction when you are attacked by a Grenade of any kind, you can make a Use the Force check with a DC equal to the attack roll of the incoming Grenade attack.",
    "description": "You can use the Move Light Object application of the Use the Force skill to cast aside Grenades that are thrown at you. As a Reaction when you are attacked by a Grenade of any kind, you can make a Use the Force check with a DC equal to the attack roll of the incoming Grenade attack.\n\nIf your check equals or exceeds the DC, you hurl the Grenade to a location where it explodes harmlessly, negating the attack. Whether or not you are successful, you take a -5 penalty on Use the Force checks until the start of your next turn."
  },
  "guardian_strike": {
    "name": "Guardian Strike",
    "prerequisite": "",
    "benefit": "Whenever you use a Lightsaber to deal damage to a target, that target takes a -2 penalty on attack rolls against any target other than you until the beginning of your next turn.",
    "description": "Whenever you use a Lightsaber to deal damage to a target, that target takes a -2 penalty on attack rolls against any target other than you until the beginning of your next turn."
  },
  "hold_the_line": {
    "name": "Hold the Line",
    "prerequisite": "",
    "benefit": "When you make a successful Attack of Opportunity against a target leaving your Threatened Area, you stop the target's movement, ending its Action.",
    "description": "When you make a successful Attack of Opportunity against a target leaving your Threatened Area, you stop the target's movement, ending its Action."
  },
  "immovable": {
    "name": "Immovable",
    "prerequisite": "",
    "benefit": "You can activate this Talent as a Swift Action. Until the start of your next turn, anyone attempting to move you involuntarily (such as with a Bantha Rush or the Move Object Force Power) takes a -5 penalty to attack rolls or Skill Checks made to use that effect that would move you. An enemy can only take the penalty from this Talent once per attempt, regardless of how many targets have used this Talent.",
    "description": "You can activate this Talent as a Swift Action. Until the start of your next turn, anyone attempting to move you involuntarily (such as with a Bantha Rush or the Move Object Force Power) takes a -5 penalty to attack rolls or Skill Checks made to use that effect that would move you. An enemy can only take the penalty from this Talent once per attempt, regardless of how many targets have used this Talent."
  },
  "improved_battle_meditation": {
    "name": "Improved Battle Meditation",
    "prerequisite": "Battle Meditation",
    "benefit": "You may activate your Battle Meditation Talent as a Swift Action, instead of as a Full-Round Action. The range of the Battle Meditation extends out to 12 squares. Opponents within the radius of your Battle Meditation suffer a -1 penalty to all attack rolls.",
    "description": "You may activate your Battle Meditation Talent as a Swift Action, instead of as a Full-Round Action. The range of the Battle Meditation extends out to 12 squares. Opponents within the radius of your Battle Meditation suffer a -1 penalty to all attack rolls."
  },
  "mobile_combatant": {
    "name": "Mobile Combatant",
    "prerequisite": "",
    "benefit": "When you end your movement adjacent to an opponent, you can spend a Swift Action to activate this Talent. If the designated opponent Moves or Withdraws before the beginning of your next turn, you can choose to move with that opponent, up to a total distance equal to your current speed.",
    "description": "When you end your movement adjacent to an opponent, you can spend a Swift Action to activate this Talent. If the designated opponent Moves or Withdraws before the beginning of your next turn, you can choose to move with that opponent, up to a total distance equal to your current speed.\n\nUnless your opponent uses the Withdraw Action or makes an Acrobatics check to avoid Attacks of Opportunity, its movement provokes an Attack of Opportunity from you for the first square moved as normal (but no subsequent squares in the same movement). If your target moves farther than your speed, you must still end this movement closer to the target than you began."
  },
  "clear_mind": {
    "name": "Clear Mind",
    "prerequisite": "",
    "benefit": "You may reroll any opposed Use the Force check made to oppose Sense Force checks. You must take the result of the reroll, even if it is worse.",
    "description": "You may reroll any opposed Use the Force check made to oppose Sense Force checks. You must take the result of the reroll, even if it is worse."
  },
  "dark_side_sense": {
    "name": "Dark Side Sense",
    "prerequisite": "",
    "benefit": "Jedi following the path of the Sentinel become exceptionally talented at rooting out evil. You may reroll any Use the Force check made to sense the presence and relative location of characters with a Dark Side Score of 1 or higher. You must take the result of the reroll, even if it is worse.",
    "description": "Jedi following the path of the Sentinel become exceptionally talented at rooting out evil. You may reroll any Use the Force check made to sense the presence and relative location of characters with a Dark Side Score of 1 or higher. You must take the result of the reroll, even if it is worse."
  },
  "dark_side_scourge": {
    "name": "Dark Side Scourge",
    "prerequisite": "Dark Side Sense",
    "benefit": "",
    "description": ""
  },
  "force_haze": {
    "name": "Force Haze",
    "prerequisite": "Clear Mind",
    "benefit": "You can spend a Force Point as a Standard Action to create a \"Haze\" that hides you and your allies from the perception of others. You can hide a number of creatures in line of sight equal to your Class Level. Make a Use the Force check and compare the result to the Will Defense of any opponent that moves into line of sight of any creature hidden by your Force Haze. If your check result equals or exceeds the opponent's Will Defense, all hidden creatures are treated as if they had Total Concealment against the opponent.",
    "description": "You can spend a Force Point as a Standard Action to create a \"Haze\" that hides you and your allies from the perception of others. You can hide a number of creatures in line of sight equal to your Class Level. Make a Use the Force check and compare the result to the Will Defense of any opponent that moves into line of sight of any creature hidden by your Force Haze. If your check result equals or exceeds the opponent's Will Defense, all hidden creatures are treated as if they had Total Concealment against the opponent.\n\nThe Force Haze lasts for up to 1 minute but is dismissed instantly if anyone hidden by the Force Haze makes an attack.\n\nYou may use this Talent to hide a single Vehicle while you are on board. The Vehicle can't have a size penalty to Reflex Defense, Initiative, or Pilot checks greater than your Heroic Level. Thus, a Gargantuan Starship (size penalty of -5) can be hidden only by a character of 5th level or higher."
  },
  "resist_the_dark_side": {
    "name": "Resist the Dark Side",
    "prerequisite": "Dark Side Sense",
    "benefit": "You gain a +5 Force bonus to all Defense scores against Force Powers with the [Dark Side] descriptor, and Force Powers originating from any dark Force-user (that is, any Force-use whose Dark Side Score equals their Wisdom score).",
    "description": "You gain a +5 Force bonus to all Defense scores against Force Powers with the [Dark Side] descriptor, and Force Powers originating from any dark Force-user (that is, any Force-use whose Dark Side Score equals their Wisdom score)."
  },
  "dampen_presence": {
    "name": "Dampen Presence",
    "prerequisite": "",
    "benefit": "When you interact with another sentient creature, you can use a Swift Action to reduce the impression you leave on it. When you have finished interacting with the creature, you make a Use the Force check, and if the check result exceeds the target's Will Defense, it does not remember interacting with you once you are gone.",
    "description": "When you interact with another sentient creature, you can use a Swift Action to reduce the impression you leave on it. When you have finished interacting with the creature, you make a Use the Force check, and if the check result exceeds the target's Will Defense, it does not remember interacting with you once you are gone."
  },
  "dark_retaliation": {
    "name": "Dark Retaliation",
    "prerequisite": "Sentinel Strike",
    "benefit": "Once per encounter, you can spend a Force Point to activate a Force Power as a Reaction to being targeted by a Force Power with the [Dark Side] descriptor.",
    "description": "Once per encounter, you can spend a Force Point to activate a Force Power as a Reaction to being targeted by a Force Power with the [Dark Side] descriptor."
  },
  "dark_side_bane": {
    "name": "Dark Side Bane",
    "prerequisite": "Dark Side Sense",
    "benefit": "When you use a damage-dealing Force Power against a creature with a Dark Side Score of 1 or higher, you deal extra damage on a successful hit equal to your Charisma bonus (minimum +1).",
    "description": "When you use a damage-dealing Force Power against a creature with a Dark Side Score of 1 or higher, you deal extra damage on a successful hit equal to your Charisma bonus (minimum +1)."
  },
  "gradual_resistance": {
    "name": "Gradual Resistance",
    "prerequisite": "",
    "benefit": "If you take damage from the use of a Force Power, until the end of the encounter you gain a +2 Force bonus to all Defenses against that Force Power.",
    "description": "If you take damage from the use of a Force Power, until the end of the encounter you gain a +2 Force bonus to all Defenses against that Force Power."
  },
  "master_of_the_great_hunt": {
    "name": "Master of the Great Hunt",
    "prerequisite": "",
    "benefit": "You gain a +1 Force bonus on attack rolls and deal +1 die of damage on Lightsaber attacks made against a Beast with a Dark Side Score of 1+.",
    "description": "You gain a +1 Force bonus on attack rolls and deal +1 die of damage on Lightsaber attacks made against a Beast with a Dark Side Score of 1+."
  },
  "persistent_haze": {
    "name": "Persistent Haze",
    "prerequisite": "Clear Mind, Force Haze",
    "benefit": "Whenever anyone concealed by your use of the Force Haze Talent attacks, you maintain Total Concealment without having to make another Use the Force check. Only those who do not attack remain concealed; the attacker no longer has Total Concealment, even when using his Talent.",
    "description": "Whenever anyone concealed by your use of the Force Haze Talent attacks, you maintain Total Concealment without having to make another Use the Force check. Only those who do not attack remain concealed; the attacker no longer has Total Concealment, even when using his Talent."
  },
  "prime_targets": {
    "name": "Prime Targets",
    "prerequisite": "",
    "benefit": "When you hit a target with a Lightsaber attack, if the target has not been attacked since the end of your last turn, you deal +1 die of damage.",
    "description": "When you hit a target with a Lightsaber attack, if the target has not been attacked since the end of your last turn, you deal +1 die of damage."
  },
  "reap_retribution": {
    "name": "Reap Retribution",
    "prerequisite": "",
    "benefit": "If you take damage from the use of a Force Power, until the end of the encounter you deal an extra 2 points of damage against the creature that used the Force Power against you.",
    "description": "If you take damage from the use of a Force Power, until the end of the encounter you deal an extra 2 points of damage against the creature that used the Force Power against you."
  },
  "sense_primal_force": {
    "name": "Sense Primal Force",
    "prerequisite": "",
    "benefit": "Jedi who spend time in a diverse wilderness learn the nuances of The Living Force at work within a wild ecosystem. When within a natural wilderness area, such as a jungle, a forest, a swamp, or plains, you tap into the vibrant Living Force of the area and can use the Sense Surroundings aspect of the Use the Force skill to detect targets out to a 30-square radius, regardless of line of sight.",
    "description": "Jedi who spend time in a diverse wilderness learn the nuances of The Living Force at work within a wild ecosystem. When within a natural wilderness area, such as a jungle, a forest, a swamp, or plains, you tap into the vibrant Living Force of the area and can use the Sense Surroundings aspect of the Use the Force skill to detect targets out to a 30-square radius, regardless of line of sight."
  },
  "sentinel_strike": {
    "name": "Sentinel Strike",
    "prerequisite": "",
    "benefit": "Any time you attack a Flat-Footed opponent (or one who is denied its Dexterity bonus to its Reflex Defense against you) with a damage-dealing Force Power, or attack with a Lightsaber, you deal an extra +1d6 points of damage with that attack. This Talent does not affect Force Powers with the [Dark Side] descriptor.",
    "description": "Any time you attack a Flat-Footed opponent (or one who is denied its Dexterity bonus to its Reflex Defense against you) with a damage-dealing Force Power, or attack with a Lightsaber, you deal an extra +1d6 points of damage with that attack. This Talent does not affect Force Powers with the [Dark Side] descriptor.\n\nYou can select this Talent multiple times. Each time you select it, your Sentinel Strike damage increases by +1d6 points (maximum +5d6 points of damage)."
  },
  "sentinels_gambit": {
    "name": "Sentinel's Gambit",
    "prerequisite": "",
    "benefit": "Once per encounter, as a Swift Action, you can designate an adjacent opponent with a Dark Side Score of 1 or higher as the target of this Talent. The designated opponent loses its Dexterity bonus to Reflex Defense against your attacks until the end of your next turn.",
    "description": "Once per encounter, as a Swift Action, you can designate an adjacent opponent with a Dark Side Score of 1 or higher as the target of this Talent. The designated opponent loses its Dexterity bonus to Reflex Defense against your attacks until the end of your next turn."
  },
  "sentinels_observation": {
    "name": "Sentinel's Observation",
    "prerequisite": "",
    "benefit": "If you have Concealment against a target, you gain a +2 circumstance bonus on attack rolls against that target.",
    "description": "If you have Concealment against a target, you gain a +2 circumstance bonus on attack rolls against that target."
  },
  "steel_resolve": {
    "name": "Steel Resolve",
    "prerequisite": "",
    "benefit": "When you use a Standard Action to make a melee attack, you can take a penalty between -1 to -5 on your attack roll and add twice that value (+2 to +10) as an insight bonus to your Will Defense. This bonus may not exceed your Base Attack Bonus. The changes to attack rolls and Will Defense last until the start of your next turn.",
    "description": "When you use a Standard Action to make a melee attack, you can take a penalty between -1 to -5 on your attack roll and add twice that value (+2 to +10) as an insight bonus to your Will Defense. This bonus may not exceed your Base Attack Bonus. The changes to attack rolls and Will Defense last until the start of your next turn."
  },
  "unseen_eyes": {
    "name": "Unseen Eyes",
    "prerequisite": "Clear Mind, Force Haze",
    "benefit": "Whenever you use the Force Haze Talent, allies hidden by the Force Haze can reroll any Perception check, keeping the better of the two results. Additionally, allies hidden by the Force Haze gain a +2 bonus on all damage rolls against foes that are unaware of them.",
    "description": "Whenever you use the Force Haze Talent, allies hidden by the Force Haze can reroll any Perception check, keeping the better of the two results. Additionally, allies hidden by the Force Haze gain a +2 bonus on all damage rolls against foes that are unaware of them."
  },
  "born_leader": {
    "name": "Born Leader",
    "prerequisite": "",
    "benefit": "Once per encounter, as a Swift Action, you grant all allies within your line of sight a +1 insight bonus on attack rolls. This effect lasts for as long as they remain within line of sight of you. An ally loses this bonus immediately if line of sight is broken or you are unconscious or dead.",
    "description": "Once per encounter, as a Swift Action, you grant all allies within your line of sight a +1 insight bonus on attack rolls. This effect lasts for as long as they remain within line of sight of you. An ally loses this bonus immediately if line of sight is broken or you are unconscious or dead."
  },
  "coordinate": {
    "name": "Coordinate",
    "prerequisite": "",
    "benefit": "A Noble with this talent has a knack for getting people to work together. When you use this Talent as a Standard Action, all allies within your line of sight grant an additional +1 bonus when they use the Aid Another Action until the start of your next turn.",
    "description": "A Noble with this talent has a knack for getting people to work together. When you use this Talent as a Standard Action, all allies within your line of sight grant an additional +1 bonus when they use the Aid Another Action until the start of your next turn.\n\nYou may select this Talent multiple times; each time you do, the bonus granted by the coordinate ability increases by 1 (to a maximum of +5)."
  },
  "distant_command": {
    "name": "Distant Command",
    "prerequisite": "Born Leader",
    "benefit": "Any ally who gains the benefit of your Born Leader Talent does not lose the benefit if their line of sight to you is broken.",
    "description": "Any ally who gains the benefit of your Born Leader Talent does not lose the benefit if their line of sight to you is broken."
  },
  "fearless_leader": {
    "name": "Fearless Leader",
    "prerequisite": "Born Leader",
    "benefit": "As a Swift Action, you can provide a courageous example for your allies. For the remainder of the encounter, your allies receive a +5 morale bonus to their Will Defense against any Fear effect. Your allies lose this benefit if they lose line of sight to you, or you are killed or knocked unconscious.",
    "description": "As a Swift Action, you can provide a courageous example for your allies. For the remainder of the encounter, your allies receive a +5 morale bonus to their Will Defense against any Fear effect. Your allies lose this benefit if they lose line of sight to you, or you are killed or knocked unconscious."
  },
  "rally": {
    "name": "Rally",
    "prerequisite": "Born Leader, Distant Command",
    "benefit": "Once per encounter, you can rally your allies and bring them back from the edge of defeat. As a Swift Action, any allies within your line of sight who have less than half their total hit points remaining gain a +2 morale bonus to their Reflex Defense and Will Defense, and a +2 bonus to all damage rolls for the remainder of the encounter.",
    "description": "Once per encounter, you can rally your allies and bring them back from the edge of defeat. As a Swift Action, any allies within your line of sight who have less than half their total hit points remaining gain a +2 morale bonus to their Reflex Defense and Will Defense, and a +2 bonus to all damage rolls for the remainder of the encounter.\n\nUnlike other Mind-Affecting Talents, Rally affects both allied Vehicles and characters with less than half their Hit Points. The Vehicle gains a +2 bonus to its Reflex Defense, all crewmembers gain a +2 bonus to their Will Defense so long as they are on board, and all Gunners gain a +2 bonus on damage with Weapon Systems (before multiplier, if any). Any crewmember who has less than half its Hit Points also gains the normal benefits of this Talent even if it leaves the Vehicle, but note that these bonuses do not stack."
  },
  "trust": {
    "name": "Trust",
    "prerequisite": "Born Leader, Coordinate",
    "benefit": "You can give up your Standard Action to give one ally within your line of sight an extra Standard Action or Move Action on their next turn, to do with as they please. The ally does not lose the Action if line of sight is later broken.",
    "description": "You can give up your Standard Action to give one ally within your line of sight an extra Standard Action or Move Action on their next turn, to do with as they please. The ally does not lose the Action if line of sight is later broken."
  },
  "commanding_presence": {
    "name": "Commanding Presence",
    "prerequisite": "Born Leader, Tactical Savvy",
    "benefit": "You excel at leading others into battle, issuing quick commands, demonstrating a gift for strategy, decimating your enemies, and impressing your peers. You can use each of the following Actions once per encounter as a Standard Action:",
    "description": "You excel at leading others into battle, issuing quick commands, demonstrating a gift for strategy, decimating your enemies, and impressing your peers. You can use each of the following Actions once per encounter as a Standard Action:\n\nHold the Line!: Make a single melee or ranged attack against any target within your range. If your attack hits, all allies within 6 squares of you gain a +2 morale bonus to their Defenses until the end of your next turn.\nLead the Assault: Make a single melee or ranged attack against any target within your range. If your attack hits, all allies within 6 squares of you gain a +2 morale bonus to their attack rolls and damage rolls until the end of your next turn.\nTurn the Tide: Make a single melee or ranged attack against any target within your range. If you successfully damage the target, a number of allies equal to your Charisma modifier (minimum 1) can immediately move up to half their Speed as a Free Action."
  },
  "coordinated_leadership": {
    "name": "Coordinated Leadership",
    "prerequisite": "Born Leader, Coordinate",
    "benefit": "You coordinate your actions with other leaders. Choose one Talent you possess from the Leadership Talent Tree. The bonuses you provide with this Talent are now considered to be untyped bonuses, allowing them to stack with the bonuses granted by your allies.",
    "description": "You coordinate your actions with other leaders. Choose one Talent you possess from the Leadership Talent Tree. The bonuses you provide with this Talent are now considered to be untyped bonuses, allowing them to stack with the bonuses granted by your allies."
  },
  "reactionary_attack": {
    "name": "Reactionary Attack",
    "prerequisite": "Born Leader, Trained in Persuasion",
    "benefit": "Once per encounter, as a Reaction to an attack made against you or an ally, you can direct an ally within 6 squares to make an immediate attack as a Reaction against the attacking enemy. The ally you choose must be capable of making an attack against the target.",
    "description": "Once per encounter, as a Reaction to an attack made against you or an ally, you can direct an ally within 6 squares to make an immediate attack as a Reaction against the attacking enemy. The ally you choose must be capable of making an attack against the target."
  },
  "tactical_savvy": {
    "name": "Tactical Savvy",
    "prerequisite": "Born Leader",
    "benefit": "When an ally whom you can see spends a Force Point to enhance an attack roll, the ally gains a bonus to the Force Point roll equal to your Intelligence modifier.",
    "description": "When an ally whom you can see spends a Force Point to enhance an attack roll, the ally gains a bonus to the Force Point roll equal to your Intelligence modifier."
  },
  "unwavering_ally": {
    "name": "Unwavering Ally",
    "prerequisite": "",
    "benefit": "Once per turn, as a Swift Action, you can designate one ally within your line of sight who can hear and understand you. Until the start of your next turn, that ally becomes immune to all effects that render the ally Flat-Footed or that deny the ally a Dexterity bonus to his or her Reflex Defense.",
    "description": "Once per turn, as a Swift Action, you can designate one ally within your line of sight who can hear and understand you. Until the start of your next turn, that ally becomes immune to all effects that render the ally Flat-Footed or that deny the ally a Dexterity bonus to his or her Reflex Defense."
  },
  "block": {
    "name": "Block",
    "prerequisite": "",
    "benefit": "As a Reaction, you may negate a melee attack by making a successful Use the Force check. The DC of the check is equal to the result of the attack roll you wish to negate, and you must take a cumulative -5 penalty on your Use the Force check for every time you have used Block or Deflect since the beginning of your last turn.",
    "description": "As a Reaction, you may negate a melee attack by making a successful Use the Force check. The DC of the check is equal to the result of the attack roll you wish to negate, and you must take a cumulative -5 penalty on your Use the Force check for every time you have used Block or Deflect since the beginning of your last turn.\n\nYou may use the Block Talent to negate melee Area Attacks, such as those made by the Whirlwind Attack Feat. If you succeed on the Use the Force check, you take half damage if the attack hits, and no damage if the attack misses. You may spend a Force Point to use this Talent to negate an attack against an adjacent character.\n\nYou must have a Lightsaber drawn and ignited to use this Talent, and you must be aware of the attack and not Flat-Footed."
  },
  "deflect": {
    "name": "Deflect",
    "prerequisite": "",
    "benefit": "As a Reaction, you may negate a ranged attack by making a successful Use the Force check. The DC of the check is equal to the result of the attack roll you wish to negate, and you take a cumulative -5 penalty on your Use the Force check for every time you used Block or Deflect since the beginning of your last turn. You may spend a Force Point to use this Talent to negate an attack against an adjacent character.",
    "description": "As a Reaction, you may negate a ranged attack by making a successful Use the Force check. The DC of the check is equal to the result of the attack roll you wish to negate, and you take a cumulative -5 penalty on your Use the Force check for every time you used Block or Deflect since the beginning of your last turn. You may spend a Force Point to use this Talent to negate an attack against an adjacent character.\n\nYou can use this Talent to deflect some of the barrage of shots fired from a ranged weapon set on Autofire, or the Force Lightning Force Power. If you succeed on the Use the Force check, you take half damage if the attack hits, and no damage if the attack misses.\n\nYou must have a Lightsaber drawn and ignited to use this Talent, and you must be aware of the attack and not Flat-Footed.\n\nThis Talent cannot be used to negate attacks made by Colossal (Frigate) or larger-size Vehicles unless the attack is made with a Point-Defense Weapon System."
  },
  "lightsaber_defense": {
    "name": "Lightsaber Defense",
    "prerequisite": "",
    "benefit": "As a Swift Action you can use your Lightsaber to parry your opponents' attacks, gaining a +1 deflection bonus to your Reflex Defense until the start of your next turn. You must have a Lightsaber drawn and ignited to use this Talent, and you don't gain the deflection bonus if you are Flat-Footed or otherwise unaware of the incoming attack.",
    "description": "As a Swift Action you can use your Lightsaber to parry your opponents' attacks, gaining a +1 deflection bonus to your Reflex Defense until the start of your next turn. You must have a Lightsaber drawn and ignited to use this Talent, and you don't gain the deflection bonus if you are Flat-Footed or otherwise unaware of the incoming attack.\n\nYou can take this Talent multiple times; each time you take this Talent, the deflection bonus increases by +1 (maximum +3)."
  },
  "weapon_specialization_lightsabers": {
    "name": "Weapon Specialization (Lightsabers)",
    "prerequisite": "Weapon Focus (Lightsabers)",
    "benefit": "You gain a +2 bonus on melee damage rolls with Lightsabers.",
    "description": "You gain a +2 bonus on melee damage rolls with Lightsabers."
  },
  "lightsaber_throw": {
    "name": "Lightsaber Throw",
    "prerequisite": "",
    "benefit": "You can throw a Lightsaber as a Standard Action, treating it as a Thrown weapon (without this Talent, a thrown Lightsaber is considered an Improvised Thrown Weapon). You are considered proficient with the thrown Lightsaber, and you apply the normal Range penalties to the attack roll. The thrown Lightsaber deals normal weapon damage if it hits.",
    "description": "You can throw a Lightsaber as a Standard Action, treating it as a Thrown weapon (without this Talent, a thrown Lightsaber is considered an Improvised Thrown Weapon). You are considered proficient with the thrown Lightsaber, and you apply the normal Range penalties to the attack roll. The thrown Lightsaber deals normal weapon damage if it hits.\n\nIf your target is no more than 6 squares away, you can pull your Lightsaber back to your hand as a Swift Action by making a DC 20 Use the Force check."
  },
  "redirect_shot": {
    "name": "Redirect Shot",
    "prerequisite": "Deflect, Base Attack Bonus +5",
    "benefit": "This Talent allows you to redirect a deflected blaster bolt along a specific trajectory, so that it damages another creature or object in its path. Once per round when you successfully Deflect a blaster bolt, you can make an immediate ranged attack against another target with which you have line of sight.",
    "description": "This Talent allows you to redirect a deflected blaster bolt along a specific trajectory, so that it damages another creature or object in its path. Once per round when you successfully Deflect a blaster bolt, you can make an immediate ranged attack against another target with which you have line of sight.\n\nApply the normal range penalties to the attack roll, not counting the distance the bolt traveled to reach you. If the attack succeeds, it deals normal weapon damage to the target. Only single blaster bolts can be redirected in this manner. Barrages from Autofire weapons and other types of projectiles can't be redirected."
  },
  "cortosis_gauntlet_block": {
    "name": "Cortosis Gauntlet Block",
    "prerequisite": "Armor Proficiency (Light), Armor Proficiency (Medium)",
    "benefit": "You have received additional training in the use of Cortosis Gauntlets. You can use the Block Talent, even when not armed with a Lightsaber, provided you are wearing a Cortosis Gauntlet. If you successfully Block an attack with a Lightsaber while wearing a Cortosis Gauntlet, the attacking Lightsaber is deactivated.",
    "description": "You have received additional training in the use of Cortosis Gauntlets. You can use the Block Talent, even when not armed with a Lightsaber, provided you are wearing a Cortosis Gauntlet. If you successfully Block an attack with a Lightsaber while wearing a Cortosis Gauntlet, the attacking Lightsaber is deactivated."
  },
  "precise_redirect": {
    "name": "Precise Redirect",
    "prerequisite": "Redirect Shot",
    "benefit": "",
    "description": ""
  },
  "whenever_you_successfully_redirect_a_blaster_bolt_and_hit_your_target_the_redirected_attack_deals_1_die_of_damage": {
    "name": "Whenever you successfully Redirect a blaster bolt and hit your target, the redirected attack deals +1 die of damage.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "precision": {
    "name": "Precision",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can make a melee attack with a Lightsaber against an adjacent opponent. If the attack hits, it deals normal damage and also reduces the target's speed to 2 squares until the end of your next turn.",
    "description": "As a Standard Action, you can make a melee attack with a Lightsaber against an adjacent opponent. If the attack hits, it deals normal damage and also reduces the target's speed to 2 squares until the end of your next turn."
  },
  "riposte": {
    "name": "Riposte",
    "prerequisite": "Block, Base Attack Bonus +5",
    "benefit": "As a Reaction once per encounter, you can make a Lightsaber attack against a being whose attack you successfully negated using the Block Talent. Only non-area melee attacks can be Riposted in this manner; you cannot use this Talent when negating the damage from melee Area Attacks (such as those made with the Whirlwind Attack feat).",
    "description": "As a Reaction once per encounter, you can make a Lightsaber attack against a being whose attack you successfully negated using the Block Talent. Only non-area melee attacks can be Riposted in this manner; you cannot use this Talent when negating the damage from melee Area Attacks (such as those made with the Whirlwind Attack feat)."
  },
  "shoto_focus": {
    "name": "Shoto Focus",
    "prerequisite": "",
    "benefit": "Whenever you wield both a one-handed Lightsaber and a Short Lightsaber (or Guard Shoto), you gain a +2 competence bonus on attack rolls made with the Short Lightsaber (or Guard Shoto).",
    "description": "Whenever you wield both a one-handed Lightsaber and a Short Lightsaber (or Guard Shoto), you gain a +2 competence bonus on attack rolls made with the Short Lightsaber (or Guard Shoto)."
  },
  "ataru": {
    "name": "Ataru",
    "prerequisite": "",
    "benefit": "You may add your Dexterity bonus (instead of your Strength bonus) on damage rolls when wielding a Lightsaber. When you wield a Lightsaber two-handed, you may apply double your Dexterity bonus (instead of double your Strength bonus) to the damage.",
    "description": "You may add your Dexterity bonus (instead of your Strength bonus) on damage rolls when wielding a Lightsaber. When you wield a Lightsaber two-handed, you may apply double your Dexterity bonus (instead of double your Strength bonus) to the damage."
  },
  "djem_so": {
    "name": "Djem So",
    "prerequisite": "",
    "benefit": "Once per round when an opponent hits you with a melee attack, you may spend a Force Point as a Reaction to make an immediate attack against that opponent.",
    "description": "Once per round when an opponent hits you with a melee attack, you may spend a Force Point as a Reaction to make an immediate attack against that opponent."
  },
  "jarkai": {
    "name": "Jar'Kai",
    "prerequisite": "Lightsaber Defense, Niman",
    "benefit": "When you use the Lightsaber Defense Talent, you gain twice the normal deflection bonus to your Reflex Defense when you are wielding two Lightsabers.",
    "description": "When you use the Lightsaber Defense Talent, you gain twice the normal deflection bonus to your Reflex Defense when you are wielding two Lightsabers."
  },
  "juyo": {
    "name": "Juyo",
    "prerequisite": "Weapon Focus (Lightsabers), Weapon Specialization (Lightsabers), Base Attack Bonus +10",
    "benefit": "Once per encounter, you may spend a Force Point as a Swift Action to designate a single opponent in your line of sight. For the remainder of the encounter, you may reroll your first attack roll each round against that opponent, keeping the better of the two results.",
    "description": "Once per encounter, you may spend a Force Point as a Swift Action to designate a single opponent in your line of sight. For the remainder of the encounter, you may reroll your first attack roll each round against that opponent, keeping the better of the two results."
  },
  "makashi": {
    "name": "Makashi",
    "prerequisite": "Lightsaber Defense",
    "benefit": "When wielding a single Lightsaber in one hand, the deflection bonus you gain from the Lightsaber Defense Talent increases by 2 (to a maximum of +5).",
    "description": "When wielding a single Lightsaber in one hand, the deflection bonus you gain from the Lightsaber Defense Talent increases by 2 (to a maximum of +5)."
  },
  "niman": {
    "name": "Niman",
    "prerequisite": "",
    "benefit": "When wielding a Lightsaber, you gain a +1 bonus to your Reflex Defense and Will Defense.",
    "description": "When wielding a Lightsaber, you gain a +1 bonus to your Reflex Defense and Will Defense."
  },
  "shien": {
    "name": "Shien",
    "prerequisite": "Deflect, Redirect Shot",
    "benefit": "",
    "description": ""
  },
  "shii_cho": {
    "name": "Shii-Cho",
    "prerequisite": "Block, Deflect",
    "benefit": "When using the Block or Deflect Talents, you only take a -2 penalty on your Use the Force check for every previous Block or Deflect attempt since your last turn.",
    "description": "When using the Block or Deflect Talents, you only take a -2 penalty on your Use the Force check for every previous Block or Deflect attempt since your last turn."
  },
  "sokan": {
    "name": "Sokan",
    "prerequisite": "Acrobatic Recovery",
    "benefit": "You may Take 10 on Acrobatics checks to Tumble, even when distracted or threatened. Additionally, each threatened or occupied square that you Tumble through only counts as 1 square of movement.",
    "description": "You may Take 10 on Acrobatics checks to Tumble, even when distracted or threatened. Additionally, each threatened or occupied square that you Tumble through only counts as 1 square of movement."
  },
  "soresu": {
    "name": "Soresu",
    "prerequisite": "Block, Deflect",
    "benefit": "You may reroll a failed Use the Force check when using the Block or Deflect Talents.",
    "description": "You may reroll a failed Use the Force check when using the Block or Deflect Talents."
  },
  "trakata": {
    "name": "Trakata",
    "prerequisite": "Weapon Focus (Lightsabers), Weapon Specialization (Lightsabers), Base Attack Bonus +12",
    "benefit": "By harnessing the unique characteristics of a Lightsaber, you can catch your opponent off guard by quickly shutting off and reigniting the blade. When wielding a Lightsaber, you may spend two Swift Actions to make a Deception check to Feint in combat.",
    "description": "By harnessing the unique characteristics of a Lightsaber, you can catch your opponent off guard by quickly shutting off and reigniting the blade. When wielding a Lightsaber, you may spend two Swift Actions to make a Deception check to Feint in combat."
  },
  "vaapad": {
    "name": "Vaapad",
    "prerequisite": "Juyo, Weapon Focus (Lightsabers), Weapon Specialization (Lightsabers), Base Attack Bonus +12",
    "benefit": "When attacking with a Lightsaber, you score a critical hit on a natural roll of 19 or 20. However, a natural 19 is not considered an automatic hit; if you roll a natural 19 and still miss the target, you do not score a critical hit.",
    "description": "When attacking with a Lightsaber, you score a critical hit on a natural roll of 19 or 20. However, a natural 19 is not considered an automatic hit; if you roll a natural 19 and still miss the target, you do not score a critical hit."
  },
  "connections": {
    "name": "Connections",
    "prerequisite": "",
    "benefit": "You are able to obtain Licensed, Restricted, Military, or Illegal equipment without having to pay a licensing fee or endure a background check, provided the total cost of the desired Equipment is equal to or less than your Character Level x 1,000 credits.",
    "description": "You are able to obtain Licensed, Restricted, Military, or Illegal equipment without having to pay a licensing fee or endure a background check, provided the total cost of the desired Equipment is equal to or less than your Character Level x 1,000 credits."
  },
  "educated": {
    "name": "Educated",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "thanks_to_your_well_rounded_education_you_may_make_any_knowledge_check_untrained": {
    "name": "Thanks to your well-rounded education, you may make any Knowledge check Untrained.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "spontaneous_skill": {
    "name": "Spontaneous Skill",
    "prerequisite": "Educated",
    "benefit": "Sometimes you surprise others with your skill. Once per day, you may make an Untrained skill check as though you were Trained in the Skill. Exception: you cannot use this Talent to make an Untrained Use the Force check as though you were Trained in the skill, unless you have the Force Sensitivity feat.",
    "description": "Sometimes you surprise others with your skill. Once per day, you may make an Untrained skill check as though you were Trained in the Skill. Exception: you cannot use this Talent to make an Untrained Use the Force check as though you were Trained in the skill, unless you have the Force Sensitivity feat.\n\nYou can select this Talent multiple times; each time you do, you can use it one additional time per day."
  },
  "wealth": {
    "name": "Wealth",
    "prerequisite": "",
    "benefit": "Each time you gain a level (including the level at which you select this Talent), you receive an amount of credits equal to 5,000 x your Class Level. You can spend these credits as you see fit.",
    "description": "Each time you gain a level (including the level at which you select this Talent), you receive an amount of credits equal to 5,000 x your Class Level. You can spend these credits as you see fit.\n\nThe credits appear in a civilized, accessible location of your choice or in your private bank account."
  },
  "engineer": {
    "name": "Engineer",
    "prerequisite": "Educated, Trained in Knowledge (Technology)",
    "benefit": "You are Trained in the Mechanics skill. Additionally, when installing new systems into a Vehicle, the efficiency of your designs reduces the time it takes to install the system by 25%.",
    "description": "You are Trained in the Mechanics skill. Additionally, when installing new systems into a Vehicle, the efficiency of your designs reduces the time it takes to install the system by 25%."
  },
  "influential_friends": {
    "name": "Influential Friends",
    "prerequisite": "Connections",
    "benefit": "You have Influential Contacts within a certain organization, planet, or region who can provide concrete information to you on certain subjects. Once per day, you can have one of these contacts make a Skill Check on your behalf. The contact always Takes 20 on the Skill Check (even if the Skill would normally not allow Taking 20) and has a Skill modifier equal to 5 + one-half your Heroic Level.",
    "description": "You have Influential Contacts within a certain organization, planet, or region who can provide concrete information to you on certain subjects. Once per day, you can have one of these contacts make a Skill Check on your behalf. The contact always Takes 20 on the Skill Check (even if the Skill would normally not allow Taking 20) and has a Skill modifier equal to 5 + one-half your Heroic Level.\n\nContacting your Influential Contacts and receiving the benefit of the Skill Check takes a number of minutes equal to 10 x the Skill Check result."
  },
  "powerful_friends": {
    "name": "Powerful Friends",
    "prerequisite": "Connections, Influential Friends",
    "benefit": "You have a powerful contact who has an extended sphere of influence. The contact could be an Imperial Senator, a high-level military officer, a regional governor, an infamous crime lord, or another person of similar significance.",
    "description": "You have a powerful contact who has an extended sphere of influence. The contact could be an Imperial Senator, a high-level military officer, a regional governor, an infamous crime lord, or another person of similar significance.\n\nOnce per encounter, you can invoke the name or office of your powerful contact and Take 20 on one Persuasion check, with no increase in the time needed to make the check."
  },
  "attract_minion": {
    "name": "Attract Minion",
    "prerequisite": "",
    "benefit": "You attract a loyal Minion. The Minion is a Nonheroic character with a Class Level equal to three-quarters of your Character Level, rounded down.",
    "description": "You attract a loyal Minion. The Minion is a Nonheroic character with a Class Level equal to three-quarters of your Character Level, rounded down.\n\nYou may select this Talent multiple times; each time you select this Talent, you gain another Minion. Normally, you can have only one Minion with you at a time. Any other Minions you have are assumed to be looking after your various interests. If you lose a Minion, you can send for another Minion if you have one (although normal Travel Time still applies).\n\nEach Minion that accompanies you on an adventure is entitled to an equal share of the total Experience Points earned for that adventure. For example, a Minion that accompanies a party of five heroes on an adventure receives one-sixth of the XP that the group earns."
  },
  "impel_ally_i": {
    "name": "Impel Ally I",
    "prerequisite": "",
    "benefit": "You can spend a Swift Action to grant one ally the ability to move its normal speed. The ally must move immediately on your turn, before you do anything else, or else the opportunity is wasted. You can use this Talent up to three times on your turn (spending a Swift Action each time).",
    "description": "You can spend a Swift Action to grant one ally the ability to move its normal speed. The ally must move immediately on your turn, before you do anything else, or else the opportunity is wasted. You can use this Talent up to three times on your turn (spending a Swift Action each time)."
  },
  "impel_ally_ii": {
    "name": "Impel Ally II",
    "prerequisite": "Impel Ally I",
    "benefit": "You can spend two Swift Actions to grant one ally the ability to take a Standard Action or Move Action. The ally must move immediately on your turn, before you do anything else, or else the opportunity is wasted.",
    "description": "You can spend two Swift Actions to grant one ally the ability to take a Standard Action or Move Action. The ally must move immediately on your turn, before you do anything else, or else the opportunity is wasted."
  },
  "attract_superior_minion": {
    "name": "Attract Superior Minion",
    "prerequisite": "Attract Minion, Impel Ally I, Impel Ally II",
    "benefit": "You attract a particularly skilled and powerful Minion. The Minion is a Nonheroic character with a Class Level equal to your Character Level. This Talent otherwise functions as the Attract Minion Talent.",
    "description": "You attract a particularly skilled and powerful Minion. The Minion is a Nonheroic character with a Class Level equal to your Character Level. This Talent otherwise functions as the Attract Minion Talent."
  },
  "bodyguard_i": {
    "name": "Bodyguard I",
    "prerequisite": "Attract Minion",
    "benefit": "Whenever you are adjacent to a minion gained with the Attract Minion Talent, once per turn as a Reaction to being attacked you can redirect the attack against that minion. Compare the attack roll to the minion's Defenses and resolve the attack as normal.",
    "description": "Whenever you are adjacent to a minion gained with the Attract Minion Talent, once per turn as a Reaction to being attacked you can redirect the attack against that minion. Compare the attack roll to the minion's Defenses and resolve the attack as normal."
  },
  "bodyguard_ii": {
    "name": "Bodyguard II",
    "prerequisite": "Attract Minion, Bodyguard I",
    "benefit": "When you redirect an attack to a minion using the Bodyguard I Talent, that minion's relevant Defense Score gains a bonus equal to half your Class Level.",
    "description": "When you redirect an attack to a minion using the Bodyguard I Talent, that minion's relevant Defense Score gains a bonus equal to half your Class Level."
  },
  "bodyguard_iii": {
    "name": "Bodyguard III",
    "prerequisite": "Attract Minion, Bodyguard I, Bodyguard II",
    "benefit": "When you redirect an attack to a minion using the Bodyguard I Talent, that minion can make an immediate melee or ranged attack against your attacker, if the attacker is within Range. Additionally, the bonus provided by the Bodyguard II Talent increases to your full Class Level.",
    "description": "When you redirect an attack to a minion using the Bodyguard I Talent, that minion can make an immediate melee or ranged attack against your attacker, if the attacker is within Range. Additionally, the bonus provided by the Bodyguard II Talent increases to your full Class Level."
  },
  "contingency_plan": {
    "name": "Contingency Plan",
    "prerequisite": "",
    "benefit": "Once per encounter, if you fail an attack roll, a Skill Check, or the use of a Talent that requires an opposed check, you can move up to your Speed as a Reaction.",
    "description": "Once per encounter, if you fail an attack roll, a Skill Check, or the use of a Talent that requires an opposed check, you can move up to your Speed as a Reaction."
  },
  "impel_ally_iii": {
    "name": "Impel Ally III",
    "prerequisite": "Impel Ally I, Impel Ally II",
    "benefit": "Once per encounter, you can spend three Swift Actions on consecutive turns to grant one ally the ability to take a Standard Action and a Move Action. The ally must act immediately on your turn when the final Swift Action is spent, before you do anything else, or the opportunity is wasted.",
    "description": "Once per encounter, you can spend three Swift Actions on consecutive turns to grant one ally the ability to take a Standard Action and a Move Action. The ally must act immediately on your turn when the final Swift Action is spent, before you do anything else, or the opportunity is wasted."
  },
  "inspire_wrath": {
    "name": "Inspire Wrath",
    "prerequisite": "Impel Ally I, Impel Ally II",
    "benefit": "As a Standard Action, you can designate a target to be the object of your allies' wrath. While your allies have line of sight to you or until you are unconscious or dead, your allies gain a +2 morale bonus on attack rolls against the target and a +2 morale bonus on Skill Checks against that target. You can designate a new target on any round by using another Standard Action. You can only use this Talent against one opponent at a time.",
    "description": "As a Standard Action, you can designate a target to be the object of your allies' wrath. While your allies have line of sight to you or until you are unconscious or dead, your allies gain a +2 morale bonus on attack rolls against the target and a +2 morale bonus on Skill Checks against that target. You can designate a new target on any round by using another Standard Action. You can only use this Talent against one opponent at a time."
  },
  "masters_orders": {
    "name": "Master's Orders",
    "prerequisite": "Impel Ally I, Impel Ally II",
    "benefit": "When an ally uses an Action granted to him or her by you, the ally can reroll any attack or check made during that Action, taking the better result.",
    "description": "When an ally uses an Action granted to him or her by you, the ally can reroll any attack or check made during that Action, taking the better result."
  },
  "shelter": {
    "name": "Shelter",
    "prerequisite": "Attract Minion",
    "benefit": "",
    "description": ""
  },
  "whenever_you_are_adjacent_to_a_minion_you_increase_any_cover_bonus_to_your_reflex_defense_by_2": {
    "name": "Whenever you are adjacent to a Minion, you increase any Cover bonus to your Reflex Defense by +2.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "tactical_superiority": {
    "name": "Tactical Superiority",
    "prerequisite": "",
    "benefit": "Spend two Swift Actions to select two allies. Each ally can move 2 squares as a Reaction. This movement does not provoke Attacks of Opportunity.",
    "description": "Spend two Swift Actions to select two allies. Each ally can move 2 squares as a Reaction. This movement does not provoke Attacks of Opportunity."
  },
  "tactical_withdraw": {
    "name": "Tactical Withdraw",
    "prerequisite": "",
    "benefit": "Spend two Swift Actions to grant all allies that are in your line of sight and within 6 squares of you the ability to use the Withdraw Action as a Swift Action until the start of your next turn.",
    "description": "Spend two Swift Actions to grant all allies that are in your line of sight and within 6 squares of you the ability to use the Withdraw Action as a Swift Action until the start of your next turn."
  },
  "urgency": {
    "name": "Urgency",
    "prerequisite": "Impel Ally I, Impel Ally II",
    "benefit": "Once per encounter, you can spend three Swift Actions on consecutive turns to increase the speed of all allies within your line of sight of you by 2. The increased speed lasts until the start of your next turn after the third Swift Action is spent.",
    "description": "Once per encounter, you can spend three Swift Actions on consecutive turns to increase the speed of all allies within your line of sight of you by 2. The increased speed lasts until the start of your next turn after the third Swift Action is spent."
  },
  "wealth_of_allies": {
    "name": "Wealth of Allies",
    "prerequisite": "Attract Minion",
    "benefit": "",
    "description": ""
  },
  "assault_tactics": {
    "name": "Assault Tactics",
    "prerequisite": "",
    "benefit": "As a Move Action, you may designate a single creature or object as the target of an assault. If you succeed on a DC 15 Knowledge (Tactics) check, you and all allies able to hear and understand you deal an additional 1d6 points of damage to the target with each successful melee or ranged attack, until the start of your next turn. This is a Mind-Affecting effect.",
    "description": "As a Move Action, you may designate a single creature or object as the target of an assault. If you succeed on a DC 15 Knowledge (Tactics) check, you and all allies able to hear and understand you deal an additional 1d6 points of damage to the target with each successful melee or ranged attack, until the start of your next turn. This is a Mind-Affecting effect."
  },
  "deployment_tactics": {
    "name": "Deployment Tactics",
    "prerequisite": "",
    "benefit": "You can use your tactical knowledge to direct allies in battle. As a Move Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, you and any allies that can see, hear, and understand you gain a +1 competence bonus on attack rolls against Flanked opponents, or a +1 dodge bonus to Reflex Defense against Attacks of Opportunity (character's choice). The bonus lasts until the start of your next turn. This is a Mind-Affecting effect.",
    "description": "You can use your tactical knowledge to direct allies in battle. As a Move Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, you and any allies that can see, hear, and understand you gain a +1 competence bonus on attack rolls against Flanked opponents, or a +1 dodge bonus to Reflex Defense against Attacks of Opportunity (character's choice). The bonus lasts until the start of your next turn. This is a Mind-Affecting effect.\n\nIf you have the Born Leader Talent or the Battle Analysis Talent, the bonus granted by this Talent increases to +2."
  },
  "field_tactics": {
    "name": "Field Tactics",
    "prerequisite": "Deployment Tactics",
    "benefit": "You know how to use existing terrain to your best advantage. By using a Move Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, you and all allies within 10 squares of you can use whatever Cover is available to gain a +10 Cover bonus to Reflex Defense (instead of the normal +5 Cover bonus). Allies must be able to hear and understand you to gain this benefit, and the bonus lasts until the start of your next turn. This Talent provides no benefit to anyone who doesn't have Cover. This is a Mind-Affecting effect.",
    "description": "You know how to use existing terrain to your best advantage. By using a Move Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, you and all allies within 10 squares of you can use whatever Cover is available to gain a +10 Cover bonus to Reflex Defense (instead of the normal +5 Cover bonus). Allies must be able to hear and understand you to gain this benefit, and the bonus lasts until the start of your next turn. This Talent provides no benefit to anyone who doesn't have Cover. This is a Mind-Affecting effect."
  },
  "one_for_the_team": {
    "name": "One for the Team",
    "prerequisite": "Deployment Tactics",
    "benefit": "As a Reaction, you can choose to take one-half or all of the damage dealt to an adjacent ally by a single attack. Similarly, as a Reaction, an adjacent ally can choose to take one-half or all of the damage dealt to you by a single attack (even if they don't have this Talent).",
    "description": "As a Reaction, you can choose to take one-half or all of the damage dealt to an adjacent ally by a single attack. Similarly, as a Reaction, an adjacent ally can choose to take one-half or all of the damage dealt to you by a single attack (even if they don't have this Talent)."
  },
  "outmaneuver": {
    "name": "Outmaneuver",
    "prerequisite": "Deployment Tactics, Field Tactics",
    "benefit": "An Officer learns to counter the tactics of their enemies. As a Standard Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, opponents in your line of sight lose all competence, insight, and morale bonuses on attack rolls, as well as any dodge bonuses to Reflex Defense, until the start of your next turn.",
    "description": "An Officer learns to counter the tactics of their enemies. As a Standard Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, opponents in your line of sight lose all competence, insight, and morale bonuses on attack rolls, as well as any dodge bonuses to Reflex Defense, until the start of your next turn.\n\nIf one or more enemy Officers are within your line of sight, the highest level Officer among them can attempt to Oppose your Knowledge (Tactics) check as a Reaction. If their Skill Check result is higher than yours, your attempt to Outmaneuver your opponents fails."
  },
  "shift_defense_i": {
    "name": "Shift Defense I",
    "prerequisite": "",
    "benefit": "As a Swift Action, you can take a -2 penalty to one Defense (Reflex, Fortitude, or Will) to gain a +1 competence bonus to another Defense until the start of your next turn.",
    "description": "As a Swift Action, you can take a -2 penalty to one Defense (Reflex, Fortitude, or Will) to gain a +1 competence bonus to another Defense until the start of your next turn."
  },
  "shift_defense_ii": {
    "name": "Shift Defense II",
    "prerequisite": "Shift Defense I",
    "benefit": "As a Swift Action, you can take a -5 penalty to one Defense (Reflex, Fortitude, or Will) to gain a +2 competence bonus to another Defense until the start of your next turn.",
    "description": "As a Swift Action, you can take a -5 penalty to one Defense (Reflex, Fortitude, or Will) to gain a +2 competence bonus to another Defense until the start of your next turn."
  },
  "shift_defense_iii": {
    "name": "Shift Defense III",
    "prerequisite": "Shift Defense I, Shift Defense II",
    "benefit": "As a Swift Action, you can gain a +5 competence bonus to one Defense (Reflex, Fortitude, or Will) by taking a -5 penalty to your other two Defenses.",
    "description": "As a Swift Action, you can gain a +5 competence bonus to one Defense (Reflex, Fortitude, or Will) by taking a -5 penalty to your other two Defenses."
  },
  "tactical_edge": {
    "name": "Tactical Edge",
    "prerequisite": "",
    "benefit": "You can use the Assault Tactics, Deployment Tactics, or Field Tactics Talent as a Swift Action, instead of a Move Action (provided you have the Talent in question).",
    "description": "You can use the Assault Tactics, Deployment Tactics, or Field Tactics Talent as a Swift Action, instead of a Move Action (provided you have the Talent in question)."
  },
  "commanders_prerogative": {
    "name": "Commander's Prerogative",
    "prerequisite": "Trained in Initiative",
    "benefit": "During the first round of combat in an encounter (after the Surprise Round, if any), you can take your turn before any of your allies, but you must use either the Share Talent Prestige Class ability or a Talent from one of the following Talent Trees as part of your turn: Commando Talent Tree, Leadership Talent Tree, or Military Tactics Talent Tree. On the subsequent round, you return to your normal place in the Initiative Order.",
    "description": "During the first round of combat in an encounter (after the Surprise Round, if any), you can take your turn before any of your allies, but you must use either the Share Talent Prestige Class ability or a Talent from one of the following Talent Trees as part of your turn: Commando Talent Tree, Leadership Talent Tree, or Military Tactics Talent Tree. On the subsequent round, you return to your normal place in the Initiative Order."
  },
  "exploit_weakness": {
    "name": "Exploit Weakness",
    "prerequisite": "Assault Tactics",
    "benefit": "When you use the Assault Tactics Talent on an enemy, the target takes a cumulative -1 penalty to its Reflex Defense each time it is damaged by one of your allies (maximum -5 penalty). This penalty applies until the end of your next turn.",
    "description": "When you use the Assault Tactics Talent on an enemy, the target takes a cumulative -1 penalty to its Reflex Defense each time it is damaged by one of your allies (maximum -5 penalty). This penalty applies until the end of your next turn."
  },
  "grand_leader": {
    "name": "Grand Leader",
    "prerequisite": "",
    "benefit": "As a Swift Action, once per encounter, you can grant bonus Hit Points equal to 5 + one-half your Character Level to allies within 20 squares of you and in your line of sight. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from multiple sources do not stack.",
    "description": "As a Swift Action, once per encounter, you can grant bonus Hit Points equal to 5 + one-half your Character Level to allies within 20 squares of you and in your line of sight. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from multiple sources do not stack."
  },
  "irregular_tactics": {
    "name": "Irregular Tactics",
    "prerequisite": "Share Talent (Any)",
    "benefit": "Your tactics confuse enemy commanders and tacticians that can see or otherwise observe your forces in action, such as when using sensors. After using the Share Talent special quality, make a Knowledge (Tactics) check as a Free Action. The result replaces the DC of any Talents that use Knowledge (Tactics) from the Military Tactics Talent Tree used against your or your allies.",
    "description": "Your tactics confuse enemy commanders and tacticians that can see or otherwise observe your forces in action, such as when using sensors. After using the Share Talent special quality, make a Knowledge (Tactics) check as a Free Action. The result replaces the DC of any Talents that use Knowledge (Tactics) from the Military Tactics Talent Tree used against your or your allies."
  },
  "lead_by_example": {
    "name": "Lead by Example",
    "prerequisite": "Share Talent (Any)",
    "benefit": "If you have already used a Talent in an encounter before granting the same Talent to an ally with your Share Talent special quality in the same encounter, any character who benefits from Share Talent gains one of the following bonuses when using that talent (if the Talent can be affected by more than one effect, the character using the Talent selects the desired effect):",
    "description": "If you have already used a Talent in an encounter before granting the same Talent to an ally with your Share Talent special quality in the same encounter, any character who benefits from Share Talent gains one of the following bonuses when using that talent (if the Talent can be affected by more than one effect, the character using the Talent selects the desired effect):"
  },
  "reduce_the_talents_dc_by_5": {
    "name": "Reduce the Talent's DC by 5.",
    "prerequisite": "",
    "benefit": "Gain an additional +2 bonus to any bonus to attack, Defense, or damage used by the Talent.",
    "description": "Gain an additional +2 bonus to any bonus to attack, Defense, or damage used by the Talent."
  },
  "reduce_the_amount_of_damage_taken_by_the_character_through_the_use_of_the_talent_by_10_points": {
    "name": "Reduce the amount of damage taken by the character through the use of the Talent by 10 points.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "turn_the_tide": {
    "name": "Turn the Tide",
    "prerequisite": "Commander's Prerogative, Trained in Initiative",
    "benefit": "Once per encounter, after the first round of combat, you can make a Knowledge (Tactics) check as a Full-Round Action and compare the result to the Will Defense of all enemies with in 12 squares of you and within your line of sight. If your check is successful, affected enemies must reroll their Initiative checks at the start of the next round. Allies within your line of sight can choose whether to reroll their check. Rerolls and other modifiers to the Initiative skill apply normally to this check for all affected targets.",
    "description": "Once per encounter, after the first round of combat, you can make a Knowledge (Tactics) check as a Full-Round Action and compare the result to the Will Defense of all enemies with in 12 squares of you and within your line of sight. If your check is successful, affected enemies must reroll their Initiative checks at the start of the next round. Allies within your line of sight can choose whether to reroll their check. Rerolls and other modifiers to the Initiative skill apply normally to this check for all affected targets."
  },
  "uncanny_defense": {
    "name": "Uncanny Defense",
    "prerequisite": "",
    "benefit": "Once per day, you can add one-half your Officer Class Level to all your Defenses for one round. You must declare that you are using this Talent at the beginning of your turn. The benefits last until the beginning of your next turn.",
    "description": "Once per day, you can add one-half your Officer Class Level to all your Defenses for one round. You must declare that you are using this Talent at the beginning of your turn. The benefits last until the beginning of your next turn."
  },
  "dastardly_strike": {
    "name": "Dastardly Strike",
    "prerequisite": "",
    "benefit": "Whenever you make a successful attack against an opponent that is denied its Dexterity bonus to Reflex Defense, the target moves -1 step along the Condition Track. This Talent can be used only against characters, not objects or Vehicles.",
    "description": "Whenever you make a successful attack against an opponent that is denied its Dexterity bonus to Reflex Defense, the target moves -1 step along the Condition Track. This Talent can be used only against characters, not objects or Vehicles."
  },
  "disruptive": {
    "name": "Disruptive",
    "prerequisite": "",
    "benefit": "By spending two Swift Actions, you can use your knack for causing trouble and instigating chaos to disrupt your enemies. Until the start of your next turn, you suppress all morale and insight bonuses applied to enemies in your line of sight.",
    "description": "By spending two Swift Actions, you can use your knack for causing trouble and instigating chaos to disrupt your enemies. Until the start of your next turn, you suppress all morale and insight bonuses applied to enemies in your line of sight."
  },
  "skirmisher": {
    "name": "Skirmisher",
    "prerequisite": "",
    "benefit": "If you move at least 2 squares before you attack and end your move in a different square from where you started, you gain a +1 bonus on attack rolls until the start of your next turn. You gain the benefit of this Talent with Weapon Systems only if you are the Vehicle's Pilot.",
    "description": "If you move at least 2 squares before you attack and end your move in a different square from where you started, you gain a +1 bonus on attack rolls until the start of your next turn. You gain the benefit of this Talent with Weapon Systems only if you are the Vehicle's Pilot."
  },
  "sneak_attack": {
    "name": "Sneak Attack",
    "prerequisite": "",
    "benefit": "Any time your opponent is Flat-Footed or otherwise denied its Dexterity bonus to Reflex Defense, you deal an additional 1d6 points of damage with a successful melee or ranged attack. You must be within 6 squares of the target to make a Sneak Attack with a ranged weapon.",
    "description": "Any time your opponent is Flat-Footed or otherwise denied its Dexterity bonus to Reflex Defense, you deal an additional 1d6 points of damage with a successful melee or ranged attack. You must be within 6 squares of the target to make a Sneak Attack with a ranged weapon.\n\nYou may select this Talent multiple times. Each time you select it, your Sneak Attack damage increases by +1d6 (Maximum +10d6)."
  },
  "walk_the_line": {
    "name": "Walk the Line",
    "prerequisite": "Disruptive",
    "benefit": "As a Standard Action, you can do or say something that catches your enemies off guard. All opponents within 6 squares of you, and within your line of sight take a -2 penalty to their Defenses until the start of your next turn. The penalty is negated if line of sight is broken.",
    "description": "As a Standard Action, you can do or say something that catches your enemies off guard. All opponents within 6 squares of you, and within your line of sight take a -2 penalty to their Defenses until the start of your next turn. The penalty is negated if line of sight is broken.\n\nThis Talent has a range of 6 squares at Starship Scale."
  },
  "backstabber": {
    "name": "Backstabber",
    "prerequisite": "Sneak Attack",
    "benefit": "You can take advantage of your adversary's distractions, no matter how momentary or fleeting. Once per turn, when you Flank a target, you can treat that target as if they were Flat-Footed for one of your attacks.",
    "description": "You can take advantage of your adversary's distractions, no matter how momentary or fleeting. Once per turn, when you Flank a target, you can treat that target as if they were Flat-Footed for one of your attacks."
  },
  "befuddle": {
    "name": "Befuddle",
    "prerequisite": "",
    "benefit": "If you succeed on a Deception check against a target's Will Defense as a Swift Action, until the start of your next turn you can move though the Threatened Area of that target as part of your Move Action without provoking an Attack of Opportunity.",
    "description": "If you succeed on a Deception check against a target's Will Defense as a Swift Action, until the start of your next turn you can move though the Threatened Area of that target as part of your Move Action without provoking an Attack of Opportunity.\n\nEach Threatened square that you move through counts as 2 squares of movement."
  },
  "cunning_strategist": {
    "name": "Cunning Strategist",
    "prerequisite": "Disruptive, Walk the Line",
    "benefit": "You can create opportunities to chip away at our opponents' defenses. You can use each of the following actions once per encounter as a Standard Action:",
    "description": "You can create opportunities to chip away at our opponents' defenses. You can use each of the following actions once per encounter as a Standard Action:\n\nCreate Opening: Make a single melee or ranged attack against any target within your Range. If you damage the target, the target takes a -5 penalty to their Reflex Defense until the start of your next turn.\nCrippling Attack: Make a single melee or ranged attack against any target within your Range. Until the start of your next turn, the target takes a -2 penalty to their base speed.\nVicious Attack: Make a melee or ranged attack within your Range against two opponents that are within 2 squares of each other. Make separate attack rolls at a -5 penalty against each target, but roll damage once only."
  },
  "hesitate": {
    "name": "Hesitate",
    "prerequisite": "",
    "benefit": "You can fill your opponent with doubt by making a Persuasion check as a Standard Action against a single target that can hear and understand you within 12 squares of you. If your check result equals or exceeds the target's Will Defense, the target takes a -2 penalty to its base speed, and if the target takes a Standard Action, it must also spend its Swift Action.",
    "description": "You can fill your opponent with doubt by making a Persuasion check as a Standard Action against a single target that can hear and understand you within 12 squares of you. If your check result equals or exceeds the target's Will Defense, the target takes a -2 penalty to its base speed, and if the target takes a Standard Action, it must also spend its Swift Action.\n\nThis penalty lasts until the end of the target's next turn."
  },
  "improved_skirmisher": {
    "name": "Improved Skirmisher",
    "prerequisite": "Skirmisher",
    "benefit": "When you move at least 2 squares before your attack and end your move in a different square from where you started, you gain a +1 bonus to all your Defenses until the start of your next turn.",
    "description": "When you move at least 2 squares before your attack and end your move in a different square from where you started, you gain a +1 bonus to all your Defenses until the start of your next turn."
  },
  "improved_sneak_attack": {
    "name": "Improved Sneak Attack",
    "prerequisite": "Sneak Attack, Point-Blank Shot",
    "benefit": "You can use the Sneak Attack Talent against a target within 12 squares, instead of within 6 squares.",
    "description": "You can use the Sneak Attack Talent against a target within 12 squares, instead of within 6 squares."
  },
  "seducer": {
    "name": "Seducer",
    "prerequisite": "",
    "benefit": "You excel at seduction through deception. If you fail a Persuasion check to change a target's Attitude, you can immediately reroll the check using your Deception skill in lieu of your Persuasion skill. You must accept the result of the reroll, even if it is worse.",
    "description": "You excel at seduction through deception. If you fail a Persuasion check to change a target's Attitude, you can immediately reroll the check using your Deception skill in lieu of your Persuasion skill. You must accept the result of the reroll, even if it is worse."
  },
  "seize_object": {
    "name": "Seize Object",
    "prerequisite": "",
    "benefit": "Once per encounter as a Move Action, you can attempt to seize a held, carried, or worn object from an adjacent target by making a Disarm attack, with a +10 bonus on your attack roll.",
    "description": "Once per encounter as a Move Action, you can attempt to seize a held, carried, or worn object from an adjacent target by making a Disarm attack, with a +10 bonus on your attack roll.\n\nIf the attack succeeds, you are now holding the object, and you cannot use this Talent in place of the Disarm Action. You cannot conceal the use of this Talent from the target."
  },
  "sow_confusion": {
    "name": "Sow Confusion",
    "prerequisite": "Hesitate",
    "benefit": "Once per encounter, as a Standard Action, you can make a Deception check and compare the result to the Will Defense of all enemies in your line of sight.",
    "description": "Once per encounter, as a Standard Action, you can make a Deception check and compare the result to the Will Defense of all enemies in your line of sight.\n\nIf the check result equals or exceeds an enemy's Will Defense, that enemy must spend a Swift Action in addition to a Standard Action to make an attack until the start of your next turn."
  },
  "stymie": {
    "name": "Stymie",
    "prerequisite": "",
    "benefit": "Once per round, as a Swift Action, you can designate a target within 12 squares of you and in your line of sight as the target of this Talent. Until the beginning of your turn, you can cause that target to take a -5 penalty on all checks made with a single Skill.",
    "description": "Once per round, as a Swift Action, you can designate a target within 12 squares of you and in your line of sight as the target of this Talent. Until the beginning of your turn, you can cause that target to take a -5 penalty on all checks made with a single Skill.\n\nYou must have line of sight to your target to make use of this Talent, and declare which Skill is to be penalized at the time this Talent is activated. This is a Mind-Affecting effect."
  },
  "sudden_strike": {
    "name": "Sudden Strike",
    "prerequisite": "Skirmisher, Sneak Attack",
    "benefit": "Whenever you would gain the benefit of the Skirmisher Talent and you successfully hit your opponent, you deal Sneak Attack damage in addition to the normal damage dealt by the attack.",
    "description": "Whenever you would gain the benefit of the Skirmisher Talent and you successfully hit your opponent, you deal Sneak Attack damage in addition to the normal damage dealt by the attack."
  },
  "weakening_strike": {
    "name": "Weakening Strike",
    "prerequisite": "Dastardly Strike",
    "benefit": "Whenever you deal damage to an opponent denied its Dexterity bonus to its Reflex Defense, you can choose not to move the target down the Condition Track and instead impose a -5 penalty on all your opponent's attack and melee damage rolls until the end of your next turn.",
    "description": "Whenever you deal damage to an opponent denied its Dexterity bonus to its Reflex Defense, you can choose not to move the target down the Condition Track and instead impose a -5 penalty on all your opponent's attack and melee damage rolls until the end of your next turn."
  },
  "dark_healing": {
    "name": "Dark Healing",
    "prerequisite": "",
    "benefit": "You can spend a Force Point to heal wounds by drawing life energy from another creature within 6 squares of you. Using this ability is a Standard Action, and you must succeed on a ranged attack roll. If the attack equals or exceeds the target's Fortitude Defense, you deal 1d6 points of damage per Class Level to the target, and you heal an equal amount of damage. If the attack fails, there is no effect.",
    "description": "You can spend a Force Point to heal wounds by drawing life energy from another creature within 6 squares of you. Using this ability is a Standard Action, and you must succeed on a ranged attack roll. If the attack equals or exceeds the target's Fortitude Defense, you deal 1d6 points of damage per Class Level to the target, and you heal an equal amount of damage. If the attack fails, there is no effect."
  },
  "dark_scourge": {
    "name": "Dark Scourge",
    "prerequisite": "",
    "benefit": "You have dedicated your life to wiping out the Jedi, and your hatred of them knows no bounds. Against Jedi characters (that is, characters belonging to The Jedi), you gain a +1 Dark Side bonus on attack rolls.",
    "description": "You have dedicated your life to wiping out the Jedi, and your hatred of them knows no bounds. Against Jedi characters (that is, characters belonging to The Jedi), you gain a +1 Dark Side bonus on attack rolls."
  },
  "dark_side_adept": {
    "name": "Dark Side Adept",
    "prerequisite": "",
    "benefit": "Force Powers that are strongly tied to The Dark Side flow through you more easily. You can reroll any Use the Force check made when activating Force Powers with the [Dark Side] descriptor, but you must keep the result of the reroll, even if it is worse.",
    "description": "Force Powers that are strongly tied to The Dark Side flow through you more easily. You can reroll any Use the Force check made when activating Force Powers with the [Dark Side] descriptor, but you must keep the result of the reroll, even if it is worse."
  },
  "dark_side_master": {
    "name": "Dark Side Master",
    "prerequisite": "Dark Side Adept",
    "benefit": "Force Powers that are strongly tied to the Dark Side flow through you more easily. You can reroll any Use the Force check made when activating Force Powers with the [Dark Side] descriptor, and can spend a Force Point to keep the better of the two results.",
    "description": "Force Powers that are strongly tied to the Dark Side flow through you more easily. You can reroll any Use the Force check made when activating Force Powers with the [Dark Side] descriptor, and can spend a Force Point to keep the better of the two results."
  },
  "force_deception": {
    "name": "Force Deception",
    "prerequisite": "",
    "benefit": "You can use your Use the Force modifier instead of your Deception check modifier when making Deception checks, as you use The Force to cloak your vile treachery. You are considered Trained in the Deception skill. If you are entitled to a Deception check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations).",
    "description": "You can use your Use the Force modifier instead of your Deception check modifier when making Deception checks, as you use The Force to cloak your vile treachery. You are considered Trained in the Deception skill. If you are entitled to a Deception check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations)."
  },
  "improved_dark_healing": {
    "name": "Improved Dark Healing",
    "prerequisite": "Dark Healing",
    "benefit": "Your Dark Healing Talent improves. The range of this ability increases to 12 squares, and even if that attack fails, the target takes half damage, while you heal an equal amount of damage.",
    "description": "Your Dark Healing Talent improves. The range of this ability increases to 12 squares, and even if that attack fails, the target takes half damage, while you heal an equal amount of damage."
  },
  "wicked_strike": {
    "name": "Wicked Strike",
    "prerequisite": "Weapon Focus (Lightsabers), Weapon Specialization (Lightsabers)",
    "benefit": "When you score a critical hit with a Lightsaber, you may spend a Force Point to move the target -2 steps along the Condition Track.",
    "description": "When you score a critical hit with a Lightsaber, you may spend a Force Point to move the target -2 steps along the Condition Track."
  },
  "affliction": {
    "name": "Affliction",
    "prerequisite": "",
    "benefit": "Your Force Powers carries the taint of The Dark Side more so than even other Dark Side users. When you damage a single opponent with one of your Force Powers, that target also takes 2d6 points of Force damage at the beginning of its next turn, before taking any Actions.",
    "description": "Your Force Powers carries the taint of The Dark Side more so than even other Dark Side users. When you damage a single opponent with one of your Force Powers, that target also takes 2d6 points of Force damage at the beginning of its next turn, before taking any Actions."
  },
  "dark_healing_field": {
    "name": "Dark Healing Field",
    "prerequisite": "Dark Healing, Improved Dark Healing",
    "benefit": "You can spend a Force Point to heal wounds by drawing life energy from up to three targeted creatures within 12 squares of you. Once per encounter, you can make a Use the Force check. If the check result equals or exceeds a target's Fortitude Defense, the target takes 1d6 points of Force damage per every Sith Apprentice and Sith Lord Class Level you possess.",
    "description": "You can spend a Force Point to heal wounds by drawing life energy from up to three targeted creatures within 12 squares of you. Once per encounter, you can make a Use the Force check. If the check result equals or exceeds a target's Fortitude Defense, the target takes 1d6 points of Force damage per every Sith Apprentice and Sith Lord Class Level you possess.\n\nYou heal half the total damage dealt (cumulative from all targets). If the attack fails, the target takes half damage, and you heal that amount."
  },
  "drain_force": {
    "name": "Drain Force",
    "prerequisite": "Affliction",
    "benefit": "Once per encounter, as a Reaction when you damage a Force-sensitive opponent, the dark taint of your power allows you to sap some of the opponent's strength, and convert it to personal power, regaining one spent Force Power. Additionally, the target loses one Force Point.",
    "description": "Once per encounter, as a Reaction when you damage a Force-sensitive opponent, the dark taint of your power allows you to sap some of the opponent's strength, and convert it to personal power, regaining one spent Force Power. Additionally, the target loses one Force Point."
  },
  "sith_alchemy": {
    "name": "Sith Alchemy",
    "prerequisite": "Dark Side Adept, Dark Side Master",
    "benefit": "Your knowledge of Sith sorcery allows you to imbue talismans and other objects with the power of the Dark Side.",
    "description": "Your knowledge of Sith sorcery allows you to imbue talismans and other objects with the power of the Dark Side.\n\nCreate Sith Talisman: You can spend one Force Point to imbue a portable object with the Dark Side, creating a Sith Talisman that provides offensive strength to a Force Power or Lightsaber attack. Creating the talisman takes a Full-Round Action.\nWhile you wear or carry a Sith Talisman on your person, add 1d6 to damage rolls with your Force Powers. You increase your Dark Side Score by one when you first put on or carry a Sith Talisman.\nYou can only have one Sith Talisman active at any given time, and if it is destroyed, you cannot create another one for 24 hours.\nCreate Sith Weapon: You can alchemically treat a properly prepared weapon to become a Sith Weapon. You may spend a Force Point to imbue the weapon with the properties of the Sith Alchemical Weapon Template (this process takes one hour to complete)."
  },
  "stolen_form": {
    "name": "Stolen Form",
    "prerequisite": "Any One Force Technique, Weapon Focus (Lightsabers)",
    "benefit": "You have learned how to use a Jedi fighting technique to defeat Jedi in combat. Choose one Talent from the Lightsaber Forms Talent Tree; you gain the benefits of this Talent and are considered to have this Talent for the purpose of satisfying prerequisites. You must meet all the prerequisites as normal for the chosen Talent, in addition to the prerequisites of this Talent.",
    "description": "You have learned how to use a Jedi fighting technique to defeat Jedi in combat. Choose one Talent from the Lightsaber Forms Talent Tree; you gain the benefits of this Talent and are considered to have this Talent for the purpose of satisfying prerequisites. You must meet all the prerequisites as normal for the chosen Talent, in addition to the prerequisites of this Talent.\n\nYou can select this Talent multiple times. Each time you select it, choose a different Talent from the Lightsaber Forms Talent Tree."
  },
  "gimmick": {
    "name": "Gimmick",
    "prerequisite": "",
    "benefit": "You can Issue Routine Command to a computer as a Swift Action.",
    "description": "You can Issue Routine Command to a computer as a Swift Action."
  },
  "master_slicer": {
    "name": "Master Slicer",
    "prerequisite": "Gimmick",
    "benefit": "You may choose to reroll any Use Computer check made to Improve Access on a computer, keeping the better of the two results.",
    "description": "You may choose to reroll any Use Computer check made to Improve Access on a computer, keeping the better of the two results."
  },
  "trace": {
    "name": "Trace",
    "prerequisite": "",
    "benefit": "You can substitute your Use Computer Skill for any Gather Information check as long as you have access to a computer network.",
    "description": "You can substitute your Use Computer Skill for any Gather Information check as long as you have access to a computer network."
  },
  "electronic_forgery": {
    "name": "Electronic Forgery",
    "prerequisite": "Trained in Use Computer",
    "benefit": "You can use your Use Computer modifier in place of your Deception modifier to create a deceptive appearance with forged electronic documents.",
    "description": "You can use your Use Computer modifier in place of your Deception modifier to create a deceptive appearance with forged electronic documents."
  },
  "electronic_sabotage": {
    "name": "Electronic Sabotage",
    "prerequisite": "Trained in Use Computer",
    "benefit": "You excel at causing havoc with computers and electronics. As a Standard Action, you can lock down a computer terminal by making a Use Computer check, making it potentially difficult for anyone else to access. That computer is considered Unfriendly to anyone other than you who attempts to use it, and the result of your Use Computer check replaces the computer's Will Defense on an attempt to change its Attitude.",
    "description": "You excel at causing havoc with computers and electronics. As a Standard Action, you can lock down a computer terminal by making a Use Computer check, making it potentially difficult for anyone else to access. That computer is considered Unfriendly to anyone other than you who attempts to use it, and the result of your Use Computer check replaces the computer's Will Defense on an attempt to change its Attitude.\n\nThis effect ends if anyone else succeeds in adjusting the computer's Attitude to Indifferent. You cannot Take 20 on this Use Computer check."
  },
  "security_slicer": {
    "name": "Security Slicer",
    "prerequisite": "Trained in Mechanics",
    "benefit": "You are an expert in electronic security. When you make a Mechanics check to Disable Device, you can do so without the help of a Security Kit. Additionally, something goes wrong only when you fail the Mechanics check by 10 or more.",
    "description": "You are an expert in electronic security. When you make a Mechanics check to Disable Device, you can do so without the help of a Security Kit. Additionally, something goes wrong only when you fail the Mechanics check by 10 or more."
  },
  "virus": {
    "name": "Virus",
    "prerequisite": "Electronic Sabotage, Trained in Use Computer",
    "benefit": "You can substitute a Use Computer check for a Mechanics check when disabling a computerized device. The effort takes 1 minute and the DC is equal to the computer's Will Defense. In addition, whenever anyone accesses the afflicted computer using a Droid or another computer, that computer or Droid's Attitude immediately becomes Unfriendly.",
    "description": "You can substitute a Use Computer check for a Mechanics check when disabling a computerized device. The effort takes 1 minute and the DC is equal to the computer's Will Defense. In addition, whenever anyone accesses the afflicted computer using a Droid or another computer, that computer or Droid's Attitude immediately becomes Unfriendly."
  },
  "hyperdriven": {
    "name": "Hyperdriven",
    "prerequisite": "",
    "benefit": "Once per day while aboard a Starship, you can add your Class Level as a bonus on a single attack roll, Skill Check, or Ability Check. The decision to add this bonus can be made after the result of the check is known.",
    "description": "Once per day while aboard a Starship, you can add your Class Level as a bonus on a single attack roll, Skill Check, or Ability Check. The decision to add this bonus can be made after the result of the check is known."
  },
  "spacehound": {
    "name": "Spacehound",
    "prerequisite": "",
    "benefit": "You take no penalty on attack rolls in Low Gravity or Zero Gravity environments, and you ignore the debilitating effects of Space Sickness. In addition, you are considered proficient with any Starship Weapon.",
    "description": "You take no penalty on attack rolls in Low Gravity or Zero Gravity environments, and you ignore the debilitating effects of Space Sickness. In addition, you are considered proficient with any Starship Weapon."
  },
  "starship_raider": {
    "name": "Starship Raider",
    "prerequisite": "Spacehound",
    "benefit": "You gain a +1 bonus on attack rolls made while aboard a Starship. This bonus applies to attacks made with Starship Weapons, as well as personal weapons used aboard a Starship.",
    "description": "You gain a +1 bonus on attack rolls made while aboard a Starship. This bonus applies to attacks made with Starship Weapons, as well as personal weapons used aboard a Starship."
  },
  "stellar_warrior": {
    "name": "Stellar Warrior",
    "prerequisite": "Spacehound",
    "benefit": "Whenever you roll a Natural 20 on an attack roll made aboard a Starship, you gain one temporary Force Point. If the Force Point is not used before the end of the encounter, it is lost. This Talent works with both Weapon Systems and personal weapons used aboard a Starship.",
    "description": "Whenever you roll a Natural 20 on an attack roll made aboard a Starship, you gain one temporary Force Point. If the Force Point is not used before the end of the encounter, it is lost. This Talent works with both Weapon Systems and personal weapons used aboard a Starship."
  },
  "cramped_quarters_fighting": {
    "name": "Cramped Quarters Fighting",
    "prerequisite": "Spacehound, Starship Raider",
    "benefit": "When adjacent to an obstacle or barrier, you gain a +2 Cover bonus to your Reflex Defense.",
    "description": "When adjacent to an obstacle or barrier, you gain a +2 Cover bonus to your Reflex Defense."
  },
  "deep_space_raider": {
    "name": "Deep Space Raider",
    "prerequisite": "Spacehound, Starship Raider",
    "benefit": "Whether you are taking on military targets on behalf of a resistance movement or you are out for personal gain, you are experienced at raiding Starships and similar targets. You can use each if the following Actions once per encounter:",
    "description": "Whether you are taking on military targets on behalf of a resistance movement or you are out for personal gain, you are experienced at raiding Starships and similar targets. You can use each if the following Actions once per encounter:\n\nClear a Path: Your attack forces an enemy to alter course or move out of your way. You must be fighting aboard a Starship to use this Action. As a Standard Action, make a ranged attack. If the attack hits, on its next turn your target must move its Speed to a square that is not adjacent to you. If the target is an enemy Starfighter engaged in a Dogfight, the target instead must attempt to disengage from the Dogfight.\nCovering Fire: You squeeze off several shots as you escape pursuing enemies. As a Full-Round Action, if you are the Pilot of a Vehicle, you may move the Vehicle up to twice its Speed and make a single ranged attack with one of the Pilot-controlled Vehicle Weapons at any point during that movement. If you hit and deal damage to a Vehicle with this attack, the target Vehicle takes a -2 penalty to attack rolls against your Vehicle until the end of your turn.\nDisabling Fire: Make a ranged attack with your Vehicle Weapon. If you make this attack against a Vehicle and hit and deal damage, you can choose one of the following to take effect until the end of your next turn:"
  },
  "one_of_the_targets_vehicle_weapons_ceases_to_function": {
    "name": "One of the target's Vehicle Weapons ceases to function.",
    "prerequisite": "Spacehound, Stellar Warrior",
    "benefit": "The target's Shield Rating is reduced to 0.\nThe target's Hyperdrive is disabled.\nThe target's Speed is reduced to 2 squares (Character Scale).\nMake a Break for It",
    "description": "The target's Shield Rating is reduced to 0.\nThe target's Hyperdrive is disabled.\nThe target's Speed is reduced to 2 squares (Character Scale).\nMake a Break for It\n\n\nOnce per encounter, while on or in a Vehicle, you can move up to one-half your speed, or move the Vehicle up to one-half its speed if you are the Pilot, as a Swift Action. This movement does not provoke Attacks of Opportunity."
  },
  "evasion": {
    "name": "Evasion",
    "prerequisite": "",
    "benefit": "If you are hit by an Area Attack, you take half damage if the attack hits you. If the area attack misses you, you take no damage. If you are the Pilot, this talent applies to your Vehicle.",
    "description": "If you are hit by an Area Attack, you take half damage if the attack hits you. If the area attack misses you, you take no damage. If you are the Pilot, this talent applies to your Vehicle."
  },
  "extreme_effort": {
    "name": "Extreme Effort",
    "prerequisite": "",
    "benefit": "You can spend two Swift Actions to gain a +5 bonus on a single Strength check or Strength-based Skill Check made during the same round.",
    "description": "You can spend two Swift Actions to gain a +5 bonus on a single Strength check or Strength-based Skill Check made during the same round."
  },
  "sprint": {
    "name": "Sprint",
    "prerequisite": "",
    "benefit": "When you use the Run action, you can move up to five times your Speed (instead of up to four times).",
    "description": "When you use the Run action, you can move up to five times your Speed (instead of up to four times)."
  },
  "surefooted": {
    "name": "Surefooted",
    "prerequisite": "",
    "benefit": "Your Speed is not reduced by Difficult Terrain.",
    "description": "Your Speed is not reduced by Difficult Terrain."
  },
  "controlled_burst": {
    "name": "Controlled Burst",
    "prerequisite": "",
    "benefit": "Your penalty when making an Autofire attack or using the Burst Fire feat is reduced to -2. In addition, if you Brace an Autofire-only weapon, you have no penalty on your attack roll.",
    "description": "Your penalty when making an Autofire attack or using the Burst Fire feat is reduced to -2. In addition, if you Brace an Autofire-only weapon, you have no penalty on your attack roll."
  },
  "exotic_weapon_mastery": {
    "name": "Exotic Weapon Mastery",
    "prerequisite": "",
    "benefit": "You are considered proficient with any Exotic Weapon, even if you don't possess the appropriate Exotic Weapon Proficiency feat.",
    "description": "You are considered proficient with any Exotic Weapon, even if you don't possess the appropriate Exotic Weapon Proficiency feat."
  },
  "greater_devastating_attack": {
    "name": "Greater Devastating Attack",
    "prerequisite": "Greater Weapon Focus (Chosen Weapon), Devastating Attack (Chosen Weapon)",
    "benefit": "Choose a single Exotic Weapon or weapon group with which you're proficient. Whenever you make a successful attack against a target using the chosen Exotic Weapon or weapon from the chosen group, you treat your target's Damage Threshold as if it were 10 points lower when determining the results of your attack.",
    "description": "Choose a single Exotic Weapon or weapon group with which you're proficient. Whenever you make a successful attack against a target using the chosen Exotic Weapon or weapon from the chosen group, you treat your target's Damage Threshold as if it were 10 points lower when determining the results of your attack.\n\nThis replaces the effects of the Devastating Attack Talent."
  },
  "greater_penetrating_attack": {
    "name": "Greater Penetrating Attack",
    "prerequisite": "Greater Weapon Focus (Chosen Weapon), Penetrating Attack (Chosen Weapon)",
    "benefit": "Choose a single Exotic Weapon or weapon group with which you're proficient. Whenever you make a successful attack against a target using the chosen Exotic Weapon or weapon from the chosen group, you treat your target's Damage Reduction as if it were 10 points lower when determining the results of your attack.",
    "description": "Choose a single Exotic Weapon or weapon group with which you're proficient. Whenever you make a successful attack against a target using the chosen Exotic Weapon or weapon from the chosen group, you treat your target's Damage Reduction as if it were 10 points lower when determining the results of your attack.\n\nThis replaces the effects of the Penetrating Attack Talent."
  },
  "greater_weapon_focus": {
    "name": "Greater Weapon Focus",
    "prerequisite": "Weapon Focus (Chosen Weapon)",
    "benefit": "Choose one Exotic Weapon or weapon group with which you're proficient. You gain a +1 bonus on attack rolls with the chosen Exotic Weapon or weapon from the chosen group. This bonus stacks with the bonus granted by the Weapon Focus feat.",
    "description": "Choose one Exotic Weapon or weapon group with which you're proficient. You gain a +1 bonus on attack rolls with the chosen Exotic Weapon or weapon from the chosen group. This bonus stacks with the bonus granted by the Weapon Focus feat.\n\nYou may select this Talent multiple times. Each time you select this Talent, it applies to a different Exotic Weapon or weapon group."
  },
  "greater_weapon_specialization": {
    "name": "Greater Weapon Specialization",
    "prerequisite": "Greater Weapon Focus (Chosen Weapon), Weapon Specialization (Chosen Weapon)",
    "benefit": "Choose one Exotic Weapon or one of the following weapon groups: Advanced Melee Weapons, Heavy Weapons, Pistols, Rifles, or Simple Weapons. You gain a +2 bonus on damage rolls with the chosen Exotic Weapon or a weapon from the chosen group. This bonus stacks with the bonus granted by the Weapon Specialization Talent.",
    "description": "Choose one Exotic Weapon or one of the following weapon groups: Advanced Melee Weapons, Heavy Weapons, Pistols, Rifles, or Simple Weapons. You gain a +2 bonus on damage rolls with the chosen Exotic Weapon or a weapon from the chosen group. This bonus stacks with the bonus granted by the Weapon Specialization Talent.\n\nYou may select this Talent multiple times. Each time you select this Talent, it applies to a different Exotic Weapon or weapon group."
  },
  "multiattack_proficiency_heavy_weapons": {
    "name": "Multiattack Proficiency (Heavy Weapons)",
    "prerequisite": "",
    "benefit": "Whenever you make multiple attacks with any type of Heavy Weapon as a Full-Round Action (see Full Attack), you reduce the penalty on your attack rolls by 2.",
    "description": "Whenever you make multiple attacks with any type of Heavy Weapon as a Full-Round Action (see Full Attack), you reduce the penalty on your attack rolls by 2.\n\nYou can take this Talent multiple times; each time you take this Talent, you reduce the penalty on your attack rolls by an additional 2."
  },
  "multiattack_proficiency_rifles": {
    "name": "Multiattack Proficiency (Rifles)",
    "prerequisite": "",
    "benefit": "Whenever you make multiple attacks with any type of Rifle as a Full-Round Action (see Full Attack), you reduce the penalty on your attack rolls by 2.",
    "description": "Whenever you make multiple attacks with any type of Rifle as a Full-Round Action (see Full Attack), you reduce the penalty on your attack rolls by 2.\n\nYou can take this Talent multiple times; each time you take this Talent, you reduce the penalty on your attack rolls by an additional 2."
  },
  "devastating_attack": {
    "name": "Devastating Attack",
    "prerequisite": "",
    "benefit": "Choose a single Exotic Weapon or weapon group with which you are proficient. Whenever you make a successful attack against a target using such a weapon, you treat your target's Damage Threshold as if it were 5 points lower when determining the result of your attack. If you select Heavy Weapons as the weapon group this Talent applies to, you may also use the Talent with Vehicle Weapon attacks.",
    "description": "Choose a single Exotic Weapon or weapon group with which you are proficient. Whenever you make a successful attack against a target using such a weapon, you treat your target's Damage Threshold as if it were 5 points lower when determining the result of your attack. If you select Heavy Weapons as the weapon group this Talent applies to, you may also use the Talent with Vehicle Weapon attacks.\n\nYou may select this Talent multiple times. Each time you select this Talent, it applies to a different Exotic Weapon or weapon group."
  },
  "penetrating_attack": {
    "name": "Penetrating Attack",
    "prerequisite": "Weapon Focus with chosen Exotic Weapon or Weapon Group",
    "benefit": "Choose a single Exotic Weapon or weapon group with which you are proficient. Whenever you make a successful attack against a target with such a weapon, you treat your target's Damage Reduction as if it were 5 points lower when determining the result of your attack. If you select Heavy Weapons as the weapon group this Talent applies to, you may also use the Talent with Vehicle Weapon attacks.",
    "description": "Choose a single Exotic Weapon or weapon group with which you are proficient. Whenever you make a successful attack against a target with such a weapon, you treat your target's Damage Reduction as if it were 5 points lower when determining the result of your attack. If you select Heavy Weapons as the weapon group this Talent applies to, you may also use the Talent with Vehicle Weapon attacks.\n\nYou may select this Talent multiple times. Each time you select this Talent, it applies to a different Exotic Weapon or weapon group."
  },
  "weapon_specialization": {
    "name": "Weapon Specialization",
    "prerequisite": "Weapon Focus with chosen Exotic Weapon or Weapon Group",
    "benefit": "Choose a single Exotic Weapon or weapon group with which you are proficient. You gain a +2 bonus on damage rolls with such weapons. If you select Heavy Weapons as the weapon group this Talent applies to, you may also use the Talent with Vehicle Weapon attacks.",
    "description": "Choose a single Exotic Weapon or weapon group with which you are proficient. You gain a +2 bonus on damage rolls with such weapons. If you select Heavy Weapons as the weapon group this Talent applies to, you may also use the Talent with Vehicle Weapon attacks.\n\nYou may select this Talent multiple times. Each time you select this Talent, it applies to a different Exotic Weapon or weapon group."
  },
  "autofire_assault": {
    "name": "Autofire Assault",
    "prerequisite": "Weapon Proficiency (Heavy Weapons)",
    "benefit": "When making an Autofire attack, you can Brace a Weapon that is not restricted to Autofire-only. You must be proficient with the Weapon being used to activate this Talent.",
    "description": "When making an Autofire attack, you can Brace a Weapon that is not restricted to Autofire-only. You must be proficient with the Weapon being used to activate this Talent."
  },
  "crushing_assault": {
    "name": "Crushing Assault",
    "prerequisite": "Weapon Specialization",
    "benefit": "You use your attacks to beat down your opponents' defenses. When you successfully damage an opponent using a Bludgeoning weapon that you have the Weapon Specialization Talent for, your next attack against that opponent made before the end of the encounter gains a +2 bonus on the attack roll and to the damage roll. The effects of multiple Crushing Assaults do not stack.",
    "description": "You use your attacks to beat down your opponents' defenses. When you successfully damage an opponent using a Bludgeoning weapon that you have the Weapon Specialization Talent for, your next attack against that opponent made before the end of the encounter gains a +2 bonus on the attack roll and to the damage roll. The effects of multiple Crushing Assaults do not stack."
  },
  "disarming_attack": {
    "name": "Disarming Attack",
    "prerequisite": "Intelligence 13, Improved Disarm, Weapon Specialization",
    "benefit": "Choose a single Exotic Weapon or weapon group with which you are proficient. You ignore a target's armor bonus to Reflex Defense when Disarming with such a weapon. Additionally, as a Free Action, once per encounter, you can grant yourself a +10 bonus on your attack roll when attempting to Disarm an opponent while using such a weapon.",
    "description": "Choose a single Exotic Weapon or weapon group with which you are proficient. You ignore a target's armor bonus to Reflex Defense when Disarming with such a weapon. Additionally, as a Free Action, once per encounter, you can grant yourself a +10 bonus on your attack roll when attempting to Disarm an opponent while using such a weapon."
  },
  "impaling_assault": {
    "name": "Impaling Assault",
    "prerequisite": "Weapon Specialization",
    "benefit": "You can hit your opponents to slow them down. Whenever you successfully damage an opponent using a Piercing weapon that you have the Weapon Specialization Talent for, your opponent reduces its speed by 2 squares until the end of your next turn. The effects of multiple Impaling Assaults do not stack.",
    "description": "You can hit your opponents to slow them down. Whenever you successfully damage an opponent using a Piercing weapon that you have the Weapon Specialization Talent for, your opponent reduces its speed by 2 squares until the end of your next turn. The effects of multiple Impaling Assaults do not stack."
  },
  "improved_suppression_fire": {
    "name": "Improved Suppression Fire",
    "prerequisite": "",
    "benefit": "When you successfully suppress an enemy using the Aid Another Action, that enemy takes a -5 penalty on its attack rolls until the start of your next turn. When targeting an area with an Autofire Weapon, each enemy in the attack area takes a -2 penalty on its attack rolls until the start of your next turn, regardless of whether your attack hits.",
    "description": "When you successfully suppress an enemy using the Aid Another Action, that enemy takes a -5 penalty on its attack rolls until the start of your next turn. When targeting an area with an Autofire Weapon, each enemy in the attack area takes a -2 penalty on its attack rolls until the start of your next turn, regardless of whether your attack hits."
  },
  "stinging_assault": {
    "name": "Stinging Assault",
    "prerequisite": "Weapon Specialization",
    "benefit": "You can deliver nasty injuries that leave your opponents reeling. Whenever you successfully damage an opponent using a Slashing weapon that you have the Weapon Specialization Talent for, your opponent takes a -2 penalty on melee attacks against you until the start of your next turn. The effects of multiple Stinging Assaults do not stack.",
    "description": "You can deliver nasty injuries that leave your opponents reeling. Whenever you successfully damage an opponent using a Slashing weapon that you have the Weapon Specialization Talent for, your opponent takes a -2 penalty on melee attacks against you until the start of your next turn. The effects of multiple Stinging Assaults do not stack."
  },
  "combined_fire": {
    "name": "Combined Fire",
    "prerequisite": "",
    "benefit": "As a Swift Action, you may designate a single creature, Vehicle or object within your line of sight as the target of Combined Fire. Any Weapon Batteries attacking the target deal an extra die of damage for every 2 points by which their attack roll exceeds the target's Reflex Defense (instead of every 3 points).",
    "description": "As a Swift Action, you may designate a single creature, Vehicle or object within your line of sight as the target of Combined Fire. Any Weapon Batteries attacking the target deal an extra die of damage for every 2 points by which their attack roll exceeds the target's Reflex Defense (instead of every 3 points)."
  },
  "fleet_deployment": {
    "name": "Fleet Deployment",
    "prerequisite": "Charisma 13",
    "benefit": "As a Full-Round Action, you can designate a number of Vehicles equal to your Officer Class Level and within your line of sight. Those Vehicles may immediately move a number of squares equal to their speed.",
    "description": "As a Full-Round Action, you can designate a number of Vehicles equal to your Officer Class Level and within your line of sight. Those Vehicles may immediately move a number of squares equal to their speed."
  },
  "fleet_tactics": {
    "name": "Fleet Tactics",
    "prerequisite": "Charisma 13, Fleet Deployment",
    "benefit": "As a Standard Action, you may designate a single Vehicle as the target of a large-scale assault. If you succeed on a DC 15 Knowledge (Tactics) check, all allied Gunners within line of sight deal 1 additional die of damage to the target with each successful ranged attack until the start of your next turn.",
    "description": "As a Standard Action, you may designate a single Vehicle as the target of a large-scale assault. If you succeed on a DC 15 Knowledge (Tactics) check, all allied Gunners within line of sight deal 1 additional die of damage to the target with each successful ranged attack until the start of your next turn.\n\nThis is a Mind-Affecting effect."
  },
  "its_a_trap": {
    "name": "It's a Trap!",
    "prerequisite": "",
    "benefit": "You are skilled at sensing the plans of enemy naval Officers, and counteracting them. Once per encounter as a Reaction, you can grant the Pilot of any single Vehicle within line of sight (including a Vehicle you are commanding) an immediate Move Action.",
    "description": "You are skilled at sensing the plans of enemy naval Officers, and counteracting them. Once per encounter as a Reaction, you can grant the Pilot of any single Vehicle within line of sight (including a Vehicle you are commanding) an immediate Move Action."
  },
  "legendary_commander": {
    "name": "Legendary Commander",
    "prerequisite": "Charisma 13, Intelligence 13, Born Leader",
    "benefit": "When you are the Commander of a Capital Ship, calculate its Reflex Defense using your Heroic Level plus one-half the ship's armor bonus (rounded down), the Pilot's Heroic Level, or the ship's Armor bonus, whichever is highest.",
    "description": "When you are the Commander of a Capital Ship, calculate its Reflex Defense using your Heroic Level plus one-half the ship's armor bonus (rounded down), the Pilot's Heroic Level, or the ship's Armor bonus, whichever is highest.\n\nIn addition, all Gunners on your ship add one-half your Heroic Level, or one-half their Heroic Level, whichever is more, to damage rolls with Vehicle Weapons. Finally, you treat any generic crew as being one quality level higher (maximum of Ace, see Crew Quality)."
  },
  "fast_repairs": {
    "name": "Fast Repairs",
    "prerequisite": "Trained in Mechanics",
    "benefit": "Whenever you Jury-Rig an object or Vehicle, the Vehicle gains a number of temporary Hit Points equal to the result of your Mechanics check. Damage is subtracted from these temporary Hit Points first, and temporary Hit Points go away at the conclusion of the encounter.",
    "description": "Whenever you Jury-Rig an object or Vehicle, the Vehicle gains a number of temporary Hit Points equal to the result of your Mechanics check. Damage is subtracted from these temporary Hit Points first, and temporary Hit Points go away at the conclusion of the encounter."
  },
  "hotwire": {
    "name": "Hotwire",
    "prerequisite": "Trained in Mechanics",
    "benefit": "You can use your Mechanics check modifier instead of your Use Computer check modifier when making Use Computer checks to Improve Access. You are considered Trained in the Use Computer skill for the purposes of using this Talent. If you are entitled to a Use Computer check reroll, you may reroll your Mechanics check instead (subject to the same circumstances and limitations).",
    "description": "You can use your Mechanics check modifier instead of your Use Computer check modifier when making Use Computer checks to Improve Access. You are considered Trained in the Use Computer skill for the purposes of using this Talent. If you are entitled to a Use Computer check reroll, you may reroll your Mechanics check instead (subject to the same circumstances and limitations)."
  },
  "quick_fix": {
    "name": "Quick Fix",
    "prerequisite": "Trained in Mechanics",
    "benefit": "Once per encounter, you may Jury-Rig an object or Vehicle that is not Disabled. All normal benefits and penalties for Jury-Rigging still apply.",
    "description": "Once per encounter, you may Jury-Rig an object or Vehicle that is not Disabled. All normal benefits and penalties for Jury-Rigging still apply."
  },
  "personalized_modifications": {
    "name": "Personalized Modifications",
    "prerequisite": "",
    "benefit": "As a Standard Action, you may tweak the settings, grips, and moving parts of a powered weapon you wield, tailoring it to your needs. For the remainder of a the encounter, you gain a +1 Equipment bonus on attack rolls, and a +2 Equipment bonus on damage rolls with that weapon.",
    "description": "As a Standard Action, you may tweak the settings, grips, and moving parts of a powered weapon you wield, tailoring it to your needs. For the remainder of a the encounter, you gain a +1 Equipment bonus on attack rolls, and a +2 Equipment bonus on damage rolls with that weapon.\n\nYou can use this Talent only on powered weapons (those that require an Energy Cell or Power Pack to operate), including weapons connected to a larger power source (such as Weapon Systems)."
  },
  "begin_attack_run": {
    "name": "Begin Attack Run",
    "prerequisite": "Charisma 13",
    "benefit": "As a Swift Action, you designate a single target. When using the Attack Run Action against that target, Vehicles in your squadron gain a +5 bonus on their attack rolls (instead of the normal +2). You may have only one target designated at a time.",
    "description": "As a Swift Action, you designate a single target. When using the Attack Run Action against that target, Vehicles in your squadron gain a +5 bonus on their attack rolls (instead of the normal +2). You may have only one target designated at a time."
  },
  "regroup": {
    "name": "Regroup",
    "prerequisite": "Charisma 13",
    "benefit": "Once per encounter as a Standard Action, you can move all Vehicles in your squadron +1 step on their Condition Tracks.",
    "description": "Once per encounter as a Standard Action, you can move all Vehicles in your squadron +1 step on their Condition Tracks."
  },
  "squadron_maneuvers": {
    "name": "Squadron Maneuvers",
    "prerequisite": "Charisma 13, Any Talent from either the Expert Pilot Talent Tree or the Gunner Talent Tree",
    "benefit": "Choose one Talent that you already possess. The Talent you select must be from either the Expert Pilot Talent Tree or the Gunner Talent Tree. Once per encounter as a Standard Action, you can impart the benefits of the chosen Talent to all members of your squadron. Once gained, its benefits last until the end of the encounter.",
    "description": "Choose one Talent that you already possess. The Talent you select must be from either the Expert Pilot Talent Tree or the Gunner Talent Tree. Once per encounter as a Standard Action, you can impart the benefits of the chosen Talent to all members of your squadron. Once gained, its benefits last until the end of the encounter."
  },
  "squadron_tactics": {
    "name": "Squadron Tactics",
    "prerequisite": "Charisma 13, Wisdom 13, Starship Tactics, Squadron Maneuvers",
    "benefit": "Once per encounter, when you use a non-attack pattern Starship Maneuver, you grant all ships in your squadron the ability to use the same Starship Maneuver once on their next turn. The Pilot of each ship that chooses to use the Starship Maneuver must make any Pilot checks or attack rolls the Starship Maneuver requires- your success or failure with the Starship Maneuver has no bearing on the success of other units in your squadron.",
    "description": "Once per encounter, when you use a non-attack pattern Starship Maneuver, you grant all ships in your squadron the ability to use the same Starship Maneuver once on their next turn. The Pilot of each ship that chooses to use the Starship Maneuver must make any Pilot checks or attack rolls the Starship Maneuver requires- your success or failure with the Starship Maneuver has no bearing on the success of other units in your squadron."
  },
  "malkite_techniques": {
    "name": "Malkite Techniques",
    "prerequisite": "",
    "benefit": "Once per encounter, you can apply a toxin to any non-Energy Slashing or Piercing weapon as a Standard Action. If an attack roll with that weapon also exceeds the target's Fortitude Defense, that target is Poisoned.",
    "description": "Once per encounter, you can apply a toxin to any non-Energy Slashing or Piercing weapon as a Standard Action. If an attack roll with that weapon also exceeds the target's Fortitude Defense, that target is Poisoned.\n\nEach round on the creature's turn, the Poison makes an attack roll (1d20 + your Heroic Level) against the target's Fortitude Defense. If the attack succeeds, the target takes damage equal to 1d6 + one-half your Heroic Level and moves -1 step along the Condition Track.\n\nA target moved to the end of the Condition Track by the Poison is unconscious but continues to take damage as long as the Poison continues to attack. The Poison attacks each round until it misses, or until the victim is cured with a Treat Injury check (DC 10 + your Heroic Level)."
  },
  "modify_poison": {
    "name": "Modify Poison",
    "prerequisite": "Malkite Techniques",
    "benefit": "You can modify the deliver method of a Poison (Contact, Ingested, Inhaled) to another delivery method by succeeding in a Knowledge (Life Science) check (DC equal to the Poison's Treat Injury DC). The Poison's capabilities and specific effects are unchanged.",
    "description": "You can modify the deliver method of a Poison (Contact, Ingested, Inhaled) to another delivery method by succeeding in a Knowledge (Life Science) check (DC equal to the Poison's Treat Injury DC). The Poison's capabilities and specific effects are unchanged."
  },
  "numbing_poison": {
    "name": "Numbing Poison",
    "prerequisite": "Malkite Techniques",
    "benefit": "Any target you Poison is automatically denied its Dexterity bonus to its Reflex Defense, for a long as it remains Poisoned.",
    "description": "Any target you Poison is automatically denied its Dexterity bonus to its Reflex Defense, for a long as it remains Poisoned."
  },
  "undetectable_poison": {
    "name": "Undetectable Poison",
    "prerequisite": "Malkite Techniques",
    "benefit": "The Treat Injury DC needed to cure a Poison you have use against a target increases by 5.",
    "description": "The Treat Injury DC needed to cure a Poison you have use against a target increases by 5."
  },
  "vicious_poison": {
    "name": "Vicious Poison",
    "prerequisite": "Malkite Techniques",
    "benefit": "Any Poisons you have used against a target gain a +2 bonus to their attack rolls made against that target's Fortitude Defense.",
    "description": "Any Poisons you have used against a target gain a +2 bonus to their attack rolls made against that target's Fortitude Defense."
  },
  "ignore_damage_reduction": {
    "name": "Ignore Damage Reduction",
    "prerequisite": "Teräs Käsi Basics, Martial Arts I",
    "benefit": "When you make an Unarmed attack against a target that has Damage Reduction, and you deal more damage than the target's DR, you ignore the target's DR completely.",
    "description": "When you make an Unarmed attack against a target that has Damage Reduction, and you deal more damage than the target's DR, you ignore the target's DR completely."
  },
  "ter_s_k_si_basics": {
    "name": "Teräs Käsi Basics",
    "prerequisite": "Martial Arts I",
    "benefit": "You deal an additional die of damage with your Unarmed attacks.",
    "description": "You deal an additional die of damage with your Unarmed attacks."
  },
  "ter_s_k_si_mastery": {
    "name": "Teräs Käsi Mastery",
    "prerequisite": "Teräs Käsi Basics, Martial Arts I, Martial Arts II, Martial Arts III",
    "benefit": "If you make only Unarmed attacks during a Full Attack Action, you can take the Full Attack Action as a Standard Action, instead of a Full-Round Action.",
    "description": "If you make only Unarmed attacks during a Full Attack Action, you can take the Full Attack Action as a Standard Action, instead of a Full-Round Action."
  },
  "unarmed_counterstrike": {
    "name": "Unarmed Counterstrike",
    "prerequisite": "Teräs Käsi Basics, Unarmed Parry, Martial Arts I, Martial Arts II",
    "benefit": "When you successfully Parry a melee attack with the Unarmed Parry Talent, you can immediately make an Unarmed attack as a Reaction against that target.",
    "description": "When you successfully Parry a melee attack with the Unarmed Parry Talent, you can immediately make an Unarmed attack as a Reaction against that target."
  },
  "unarmed_parry": {
    "name": "Unarmed Parry",
    "prerequisite": "Teräs Käsi Basics, Martial Arts I, Martial Arts II",
    "benefit": "When you Fight Defensively, as a Reaction you can negate a melee attack by making a successful Unarmed attack roll. If your attack roll equals or exceeds the attack roll of the incoming melee attack, the attack is negated. You must be aware of the attack, and not be Flat-Footed, and you take a cumulative -2 penalty to all attack rolls for each attack roll made since the beginning of your last turn.",
    "description": "When you Fight Defensively, as a Reaction you can negate a melee attack by making a successful Unarmed attack roll. If your attack roll equals or exceeds the attack roll of the incoming melee attack, the attack is negated. You must be aware of the attack, and not be Flat-Footed, and you take a cumulative -2 penalty to all attack rolls for each attack roll made since the beginning of your last turn."
  },
  "9_604": {
    "name": "9,604",
    "prerequisite": "",
    "benefit": "Corporate Power Talent Tree",
    "description": "Corporate Power Talent Tree"
  },
  "save": {
    "name": "Save",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "edit": {
    "name": "Edit",
    "prerequisite": "",
    "benefit": "You are an extension of your corporation, and wield their power as your own.",
    "description": "You are an extension of your corporation, and wield their power as your own."
  },
  "1_competitive_drive": {
    "name": "1\tCompetitive Drive",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "2_competitive_edge": {
    "name": "2\tCompetitive Edge",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "3_corporate_clout": {
    "name": "3\tCorporate Clout",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "4_impose_confusion": {
    "name": "4\tImpose Confusion",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "5_impose_hesitation": {
    "name": "5\tImpose Hesitation",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "6_willful_resolve": {
    "name": "6\tWillful Resolve",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "7_wrong_decision": {
    "name": "7\tWrong Decision",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "competitive_drive": {
    "name": "Competitive Drive",
    "prerequisite": "",
    "benefit": "You are driven to compete and succeed. Once per encounter, you can reroll any Wisdom-, Intelligence-, or Charisma-based Skill Check (except Use the Force), keeping the better of the two results.",
    "description": "You are driven to compete and succeed. Once per encounter, you can reroll any Wisdom-, Intelligence-, or Charisma-based Skill Check (except Use the Force), keeping the better of the two results."
  },
  "competitive_edge": {
    "name": "Competitive Edge",
    "prerequisite": "",
    "benefit": "When you and your allies are not Surprised, you and a number of allies equal to your Charisma modifier (minimum 1), which you designate on your first turn, gain the benefits of the Quick Draw feat for the remainder of the encounter.",
    "description": "When you and your allies are not Surprised, you and a number of allies equal to your Charisma modifier (minimum 1), which you designate on your first turn, gain the benefits of the Quick Draw feat for the remainder of the encounter."
  },
  "corporate_clout": {
    "name": "Corporate Clout",
    "prerequisite": "Impose Hesitation, Wrong Decision",
    "benefit": "You are adept at making deals that make opponents question which side they should be on. Once per encounter, as a Standard Action, you can make a Persuasion check against the Will Defense of an opponent within line of sight.",
    "description": "You are adept at making deals that make opponents question which side they should be on. Once per encounter, as a Standard Action, you can make a Persuasion check against the Will Defense of an opponent within line of sight.\n\nIf your check equals or exceeds the target's Will Defense, the target cannot attack you for the remainder of the encounter. If your check exceeds the target's Will Defense by 5 or more, the target will not attack you or your allies for the remainder of the encounter.\n\nIf your check exceeds the target's Will Defense by 10 or more, the target's Attitude toward you is now Friendly, and the target becomes your ally for the remainder of the encounter, remaining under the control of the Gamemaster. If you or one of your allies attacks the target, the target once again becomes Hostile.\n\nIf the target is a higher level than you, it gains a +5 bonus to its Will Defense. This is a Mind-Affecting Fear effect."
  },
  "impose_confusion": {
    "name": "Impose Confusion",
    "prerequisite": "Impose Hesitation",
    "benefit": "Increase the area of Impose Hesitation to a 12-Square Cone. Also, once per encounter, after making the Persuasion check for Impose Hesitation, you can instead choose to have the targets lose a Standard Action on their next turn.",
    "description": "Increase the area of Impose Hesitation to a 12-Square Cone. Also, once per encounter, after making the Persuasion check for Impose Hesitation, you can instead choose to have the targets lose a Standard Action on their next turn."
  },
  "impose_hesitation": {
    "name": "Impose Hesitation",
    "prerequisite": "",
    "benefit": "As a Standard Action, make a Persuasion check targeting all opponents within a 6-Square Cone. If you equal or exceed the target's Will Defense, the target loses a Swift Action on its next turn, and cannot take Full-Round Actions.",
    "description": "As a Standard Action, make a Persuasion check targeting all opponents within a 6-Square Cone. If you equal or exceed the target's Will Defense, the target loses a Swift Action on its next turn, and cannot take Full-Round Actions.\n\nTargets need to see, hear, and understand you to be affected by this attack. This is a Mind-Affecting effect."
  },
  "willful_resolve": {
    "name": "Willful Resolve",
    "prerequisite": "",
    "benefit": "Once per encounter, you can negate the effects of a single attack roll or Skill Check made against you that targets your Will Defense.",
    "description": "Once per encounter, you can negate the effects of a single attack roll or Skill Check made against you that targets your Will Defense."
  },
  "wrong_decision": {
    "name": "Wrong Decision",
    "prerequisite": "",
    "benefit": "Each time you are attacked, the opponent that attacked you takes a -2 morale penalty to its Will Defense until the end of your next turn. This penalty is not cumulative, so if a target makes multiple attacks against you it only incurs the penalty once per turn.",
    "description": "Each time you are attacked, the opponent that attacked you takes a -2 morale penalty to its Will Defense until the end of your next turn. This penalty is not cumulative, so if a target makes multiple attacks against you it only incurs the penalty once per turn."
  },
  "noble_fencing_style": {
    "name": "Noble Fencing Style",
    "prerequisite": "Trained in Deception and Persuasion",
    "benefit": "This style of swordplay uses wit and force of personality to increase accuracy, taunting and distracting an opponent with feints, misdirection, and deception. When using a light melee weapon or a Lightsaber that you are proficient with, you can use your Charisma modifier instead of your Strength modifier on attack rolls.",
    "description": "This style of swordplay uses wit and force of personality to increase accuracy, taunting and distracting an opponent with feints, misdirection, and deception. When using a light melee weapon or a Lightsaber that you are proficient with, you can use your Charisma modifier instead of your Strength modifier on attack rolls."
  },
  "demoralizing_defense": {
    "name": "Demoralizing Defense",
    "prerequisite": "Noble Fencing Style",
    "benefit": "As a Reaction, you can designate an enemy you have just hit with a melee attack. The enemy takes only half damage from the attack, but takes a -5 penalty on attacks made against you until the end of your next turn. A single target may only be affected by this Talent once per round. This is a Mind-Affecting effect.",
    "description": "As a Reaction, you can designate an enemy you have just hit with a melee attack. The enemy takes only half damage from the attack, but takes a -5 penalty on attacks made against you until the end of your next turn. A single target may only be affected by this Talent once per round. This is a Mind-Affecting effect."
  },
  "leading_feint": {
    "name": "Leading Feint",
    "prerequisite": "Noble Fencing Style",
    "benefit": "Whenever you successfully damage an opponent with a melee attack, you can make a Deception check to Feint against that target as a Swift Action. If successful, you designate an ally within 12 squares; your target is designated Flat-Footed against the first attack that ally makes against your target before the beginning of your next turn.",
    "description": "Whenever you successfully damage an opponent with a melee attack, you can make a Deception check to Feint against that target as a Swift Action. If successful, you designate an ally within 12 squares; your target is designated Flat-Footed against the first attack that ally makes against your target before the beginning of your next turn."
  },
  "personal_affront": {
    "name": "Personal Affront",
    "prerequisite": "Noble Fencing Style, Base Attack Bonus +5",
    "benefit": "Once per encounter, as a Reaction, you can make a single melee attack against an adjacent enemy who just damaged you.",
    "description": "Once per encounter, as a Reaction, you can make a single melee attack against an adjacent enemy who just damaged you."
  },
  "transposing_strike": {
    "name": "Transposing Strike",
    "prerequisite": "Noble Fencing Style, Base Attack Bonus +5",
    "benefit": "When you hit a character with a melee attack, you can choose to have the attack deal only half damage and switch places with that foe. Your foe must be no more than one size category larger than you, and you must end up occupying a space that was previously occupied by your target (And vice versa) to use this Talent. This movement does not provoke Attacks of Opportunity.",
    "description": "When you hit a character with a melee attack, you can choose to have the attack deal only half damage and switch places with that foe. Your foe must be no more than one size category larger than you, and you must end up occupying a space that was previously occupied by your target (And vice versa) to use this Talent. This movement does not provoke Attacks of Opportunity."
  },
  "brutal_attack": {
    "name": "Brutal Attack",
    "prerequisite": "Weapon Focus (Chosen Weapon)",
    "benefit": "Choose a single weapon with which you posses the Weapon Focus feat. Attacks with such weapons that deal damage (including doubling damage from a Critical Hit) exceeding an opponent's Damage Threshold deals +1 die of damage on that attack.",
    "description": "Choose a single weapon with which you posses the Weapon Focus feat. Attacks with such weapons that deal damage (including doubling damage from a Critical Hit) exceeding an opponent's Damage Threshold deals +1 die of damage on that attack.\n\nYou can select this Talent multiple times. Each time you select this Talent, it applies to a different weapon."
  },
  "call_out": {
    "name": "Call Out",
    "prerequisite": "Personal Vendetta",
    "benefit": "When you use the Personal Vendetta Talent, you may designate one target of that Talent to take a -5 penalty to attacks against targets other than you, instead of the normal -2 penalty.",
    "description": "When you use the Personal Vendetta Talent, you may designate one target of that Talent to take a -5 penalty to attacks against targets other than you, instead of the normal -2 penalty."
  },
  "distracting_attack": {
    "name": "Distracting Attack",
    "prerequisite": "Brutal Attack (Chosen Weapon)",
    "benefit": "When you deal damage to a target with a melee or ranged attack, compare the attack roll to the targets' Will Defense. If the attack roll also meets or exceeds the target's Will Defense, the target takes a -2 penalty to their Reflex Defense until the end of your next turn.",
    "description": "When you deal damage to a target with a melee or ranged attack, compare the attack roll to the targets' Will Defense. If the attack roll also meets or exceeds the target's Will Defense, the target takes a -2 penalty to their Reflex Defense until the end of your next turn."
  },
  "exotic_weapons_master": {
    "name": "Exotic Weapons Master",
    "prerequisite": "Exotic Weapon Proficiency (Any)",
    "benefit": "You treat all Exotic Weapons as a single weapon group. If you already have Feats or Talents that grant you proficiency with, or augment the use of, one Exotic Weapon, those Feats now apply to all Exotic Weapons. For example, if you already had Exotic Weapon Proficiency (Shyarn), and Weapon Focus (Shyarn), you are now proficient with, and possess the Weapon Focus Feat for, all Exotic Weapons.",
    "description": "You treat all Exotic Weapons as a single weapon group. If you already have Feats or Talents that grant you proficiency with, or augment the use of, one Exotic Weapon, those Feats now apply to all Exotic Weapons. For example, if you already had Exotic Weapon Proficiency (Shyarn), and Weapon Focus (Shyarn), you are now proficient with, and possess the Weapon Focus Feat for, all Exotic Weapons."
  },
  "lockdown_strike": {
    "name": "Lockdown Strike",
    "prerequisite": "",
    "benefit": "When you hit a moving opponent that is one size category larger than you or smaller with an Attack of Opportunity, you immediately end its current movement.",
    "description": "When you hit a moving opponent that is one size category larger than you or smaller with an Attack of Opportunity, you immediately end its current movement."
  },
  "multiattack_proficiency_exotic_weapons": {
    "name": "Multiattack Proficiency (Exotic Weapons)",
    "prerequisite": "Exotic Weapons Master",
    "benefit": "",
    "description": ""
  },
  "personal_vendetta": {
    "name": "Personal Vendetta",
    "prerequisite": "",
    "benefit": "As a Swift Action, you can taunt all opponents within 12 squares and line of sight; on their next turn, these opponents take a -2 penalty on attack rolls made against any target other than you.",
    "description": "As a Swift Action, you can taunt all opponents within 12 squares and line of sight; on their next turn, these opponents take a -2 penalty on attack rolls made against any target other than you.\n\nThis is a Mind-Affecting effect."
  },
  "unstoppable": {
    "name": "Unstoppable",
    "prerequisite": "",
    "benefit": "You can sometimes shrug off the effect of debilitating attacks. Once per encounter, if you are hit by an attack that would normally knock you down the Condition Track, you can reduce the number of steps you move down the Condition Track by 1 step (to a minimum of 0).",
    "description": "You can sometimes shrug off the effect of debilitating attacks. Once per encounter, if you are hit by an attack that would normally knock you down the Condition Track, you can reduce the number of steps you move down the Condition Track by 1 step (to a minimum of 0)."
  },
  "deep_space_gambit": {
    "name": "Deep-Space Gambit",
    "prerequisite": "",
    "benefit": "Once per encounter, when you or a Vehicle you occupy are the target of an attack roll, you can force your opponent to reroll the attack. The opponent must keep the worse of the two results.",
    "description": "Once per encounter, when you or a Vehicle you occupy are the target of an attack roll, you can force your opponent to reroll the attack. The opponent must keep the worse of the two results."
  },
  "guidance": {
    "name": "Guidance",
    "prerequisite": "Trained in Perception",
    "benefit": "You know how to guide others through treacherous terrain. You may use a Swift Action to point out the path of least resistance to an ally within line of sight who can see, hear, and understand you. The ally ignores the effect of Difficult Terrain on its next turn. You cannot use this Talent on yourself.",
    "description": "You know how to guide others through treacherous terrain. You may use a Swift Action to point out the path of least resistance to an ally within line of sight who can see, hear, and understand you. The ally ignores the effect of Difficult Terrain on its next turn. You cannot use this Talent on yourself."
  },
  "hidden_attacker": {
    "name": "Hidden Attacker",
    "prerequisite": "Trained in Stealth",
    "benefit": "Your shots seem to come from nowhere. Whenever you use the Snipe application of the Stealth skill, you do so as a Swift Action instead of a Move Action.",
    "description": "Your shots seem to come from nowhere. Whenever you use the Snipe application of the Stealth skill, you do so as a Swift Action instead of a Move Action."
  },
  "hyperspace_savant": {
    "name": "Hyperspace Savant",
    "prerequisite": "Trained in Pilot",
    "benefit": "You can substitute your Pilot skill for the Use Computer check made to Astrogate, or Use Sensors while you are the Pilot of a Vehicle.",
    "description": "You can substitute your Pilot skill for the Use Computer check made to Astrogate, or Use Sensors while you are the Pilot of a Vehicle."
  },
  "vehicle_sneak": {
    "name": "Vehicle Sneak",
    "prerequisite": "Trained in Pilot",
    "benefit": "You know how to fly and operate your Vehicle in order to hide its approach visually, decrease the noise it produces, and minimize its sensor signature. Treat your ship as two size categories smaller when attempting Stealth checks.",
    "description": "You know how to fly and operate your Vehicle in order to hide its approach visually, decrease the noise it produces, and minimize its sensor signature. Treat your ship as two size categories smaller when attempting Stealth checks."
  },
  "silent_movement": {
    "name": "Silent Movement",
    "prerequisite": "Trained in Stealth",
    "benefit": "You know how to move silently in almost any environment. You never suffer from unfavorable circumstances from environmental effects associated with noise when you Sneak using the Stealth skill. Once per round, when you make a Stealth check, you can automatically use the Aid Another Action on one ally's Stealth check.",
    "description": "You know how to move silently in almost any environment. You never suffer from unfavorable circumstances from environmental effects associated with noise when you Sneak using the Stealth skill. Once per round, when you make a Stealth check, you can automatically use the Aid Another Action on one ally's Stealth check."
  },
  "defensive_circle": {
    "name": "Defensive Circle",
    "prerequisite": "Battle Meditation, Block or Deflect, Jedi Battle Commander",
    "benefit": "As a Swift Action, you and any allies affected by your Battle Meditation gain a +2 insight bonus to their Reflex Defense, lasting as long as they are affected by your Battle Meditation. Additionally, you gain a +1 bonus to your Use the Force checks to Block and Deflect (as per the Talents) for each adjacent ally wielding a Lightsaber.",
    "description": "As a Swift Action, you and any allies affected by your Battle Meditation gain a +2 insight bonus to their Reflex Defense, lasting as long as they are affected by your Battle Meditation. Additionally, you gain a +1 bonus to your Use the Force checks to Block and Deflect (as per the Talents) for each adjacent ally wielding a Lightsaber."
  },
  "force_revive": {
    "name": "Force Revive",
    "prerequisite": "Battle Meditation, Jedi Battle Commander",
    "benefit": "When an ally affected by your Battle Meditation is reduced to 0 hit points, you can spend a Force Point as a Reaction, allowing that ally to take its Second Wind as a Reaction immediately (though the target still falls Unconscious before the Second Wind is triggered).",
    "description": "When an ally affected by your Battle Meditation is reduced to 0 hit points, you can spend a Force Point as a Reaction, allowing that ally to take its Second Wind as a Reaction immediately (though the target still falls Unconscious before the Second Wind is triggered)."
  },
  "jedi_battle_commander": {
    "name": "Jedi Battle Commander",
    "prerequisite": "Battle Meditation",
    "benefit": "You are trained to direct Jedi in pitched battles. Your Battle Meditation grants a +2 insight bonus on attack rolls instead of the normal +1.",
    "description": "You are trained to direct Jedi in pitched battles. Your Battle Meditation grants a +2 insight bonus on attack rolls instead of the normal +1."
  },
  "slashing_charge": {
    "name": "Slashing Charge",
    "prerequisite": "Block, Riposte, Weapon Focus (Lightsabers)",
    "benefit": "Once per encounter, while making a Charge, you take no cumulative penalty to Use the Force checks for each Block attempt you make during the Charge. When performing Slashing Charge, you can apply the attack bonus granted by the Charge to all Riposte attacks as well. You can declare the use of this ability after you begin the Charge, but must do so before you make your first Riposte attack.",
    "description": "Once per encounter, while making a Charge, you take no cumulative penalty to Use the Force checks for each Block attempt you make during the Charge. When performing Slashing Charge, you can apply the attack bonus granted by the Charge to all Riposte attacks as well. You can declare the use of this ability after you begin the Charge, but must do so before you make your first Riposte attack."
  },
  "mobile_attack_lightsabers": {
    "name": "Mobile Attack (Lightsabers)",
    "prerequisite": "Multiattack Proficiency (Lightsabers), Dual Weapon Mastery I, Weapon Focus (Lightsabers)",
    "benefit": "Immediately after making a Full Attack where you attacked with two Lightsabers (or both ends of a Double-Bladed Lightsaber), you may Move up to your Speed as a Free Action.",
    "description": "Immediately after making a Full Attack where you attacked with two Lightsabers (or both ends of a Double-Bladed Lightsaber), you may Move up to your Speed as a Free Action."
  },
  "dark_deception": {
    "name": "Dark Deception",
    "prerequisite": "",
    "benefit": "You can cloak your intentions with a veil of anger and hate. When another character attempts to sense you through The Force in any way, you can choose to act as though your Dark Side Score equals your Wisdom score.",
    "description": "You can cloak your intentions with a veil of anger and hate. When another character attempts to sense you through The Force in any way, you can choose to act as though your Dark Side Score equals your Wisdom score."
  },
  "additionally_deception_is_now_a_class_skill_for_you": {
    "name": "Additionally, Deception is now a Class Skill for you.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "improved_sentinel_strike": {
    "name": "Improved Sentinel Strike",
    "prerequisite": "Sentinel Strike",
    "benefit": "",
    "description": ""
  },
  "increase_the_damage_dice_of_your_sentinel_strike_to_d8_instead_of_d6": {
    "name": "Increase the damage dice of your Sentinel Strike to d8, instead of d6.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "improved_sentinels_gambit": {
    "name": "Improved Sentinel's Gambit",
    "prerequisite": "Sentinel's Gambit",
    "benefit": "You can use Sentinel's Gambit an additional number of times equal to half your Class Level (minimum 1).",
    "description": "You can use Sentinel's Gambit an additional number of times equal to half your Class Level (minimum 1)."
  },
  "rebuke_the_dark": {
    "name": "Rebuke the Dark",
    "prerequisite": "Rebuke",
    "benefit": "When using the Rebuke Force Power against a Force Power with the [Dark Side] descriptor, roll two dice for the Rebuke attempt, keeping the better of the two results.",
    "description": "When using the Rebuke Force Power against a Force Power with the [Dark Side] descriptor, roll two dice for the Rebuke attempt, keeping the better of the two results."
  },
  "taint_of_the_dark_side": {
    "name": "Taint of the Dark Side",
    "prerequisite": "Dark Deception",
    "benefit": "Add one Force Power with the [Dark Side] descriptor to your Force Power Suite. Once per encounter you can use that Force Power with the [Dark Side] descriptor without increasing your Dark Side Score. If you spend a Force Point or Destiny Point to modify this Force Power in any way, you increase your Dark Side Score as normal.",
    "description": "Add one Force Power with the [Dark Side] descriptor to your Force Power Suite. Once per encounter you can use that Force Power with the [Dark Side] descriptor without increasing your Dark Side Score. If you spend a Force Point or Destiny Point to modify this Force Power in any way, you increase your Dark Side Score as normal."
  },
  "force_warning": {
    "name": "Force Warning",
    "prerequisite": "",
    "benefit": "Allies within 12 squares can choose to reroll their Initiative checks at the start of combat, but must keep the result of the reroll, even if it is worse.",
    "description": "Allies within 12 squares can choose to reroll their Initiative checks at the start of combat, but must keep the result of the reroll, even if it is worse.\n\nFurthermore, if any allies within 12 squares are Surprised at the start of an encounter, but you are not, you can designate a number of those allies equal to your Wisdom modifier (minimum 1); those allies are no longer considered Surprised, and can act normally during the Surprise Round."
  },
  "improved_quick_draw_lightsabers": {
    "name": "Improved Quick Draw (Lightsabers)",
    "prerequisite": "Quick Draw, Weapon Focus (Lightsabers)",
    "benefit": "If you are carrying a Lightsaber (either in your hand or at your belt), you can draw the Lightsaber, ignite it, and make a single attack during the Surprise Round, even if you are Surprised. If you are not Surprised, you can take any single Action of your choice, as normal.",
    "description": "If you are carrying a Lightsaber (either in your hand or at your belt), you can draw the Lightsaber, ignite it, and make a single attack during the Surprise Round, even if you are Surprised. If you are not Surprised, you can take any single Action of your choice, as normal."
  },
  "additionally_once_per_turn_you_may_draw_and_ignite_a_lightsaber_as_a_free_action_on_your_turn": {
    "name": "Additionally, once per turn you may draw and ignite a Lightsaber as a Free Action on your turn.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "sheltering_stance": {
    "name": "Sheltering Stance",
    "prerequisite": "Block or Deflect, Vigilance",
    "benefit": "Whenever you are adjacent to an ally, you may use the Block or Deflect Talents on attacks that target that ally without the need to spend a Force Point.",
    "description": "Whenever you are adjacent to an ally, you may use the Block or Deflect Talents on attacks that target that ally without the need to spend a Force Point."
  },
  "vigilance": {
    "name": "Vigilance",
    "prerequisite": "",
    "benefit": "As a Swift Action you may designate one adjacent ally as the target of this Talent. That target gains a +1 deflection bonus to their Reflex Defense as long as you remain adjacent to them. You may change the target of this Talent as a Swift Action.",
    "description": "As a Swift Action you may designate one adjacent ally as the target of this Talent. That target gains a +1 deflection bonus to their Reflex Defense as long as you remain adjacent to them. You may change the target of this Talent as a Swift Action."
  },
  "watchmans_advance": {
    "name": "Watchman's Advance",
    "prerequisite": "Force Warning",
    "benefit": "When acting in the Surprise Round, you and your allies can take an extra Move Action. Any character can gain only one extra Move Action during the Surprise Round, regardless of the number of characters with this Talent in your group.",
    "description": "When acting in the Surprise Round, you and your allies can take an extra Move Action. Any character can gain only one extra Move Action during the Surprise Round, regardless of the number of characters with this Talent in your group."
  },
  "armored_mandalorian": {
    "name": "Armored Mandalorian",
    "prerequisite": "Dexterity 13, Mandalorian Glory, Proficient with Armor",
    "benefit": "Mandalorians wear armor constantly and learn to adjust to take an impact on the strongest section of their armor. You add your armor's Fortitude Defense bonus as an Equipment bonus to your Elite Trooper Damage Reduction (with a maximum bonus equal to your base Elite Trooper DR).",
    "description": "Mandalorians wear armor constantly and learn to adjust to take an impact on the strongest section of their armor. You add your armor's Fortitude Defense bonus as an Equipment bonus to your Elite Trooper Damage Reduction (with a maximum bonus equal to your base Elite Trooper DR).\n\nAdditionally, if a Lightsaber does not ignore the DR of the armor you are wearing (such as Cortosis Weave/Phrik Alloy General Template), a Lightsaber does not ignore your Elite Trooper Damage Reduction."
  },
  "mandalorian_advance": {
    "name": "Mandalorian Advance",
    "prerequisite": "",
    "benefit": "Veteran Mandalorians know how to move on the battlefield. Once per encounter, on your turn, you can Move up to your Speed as a Free Action before any other Action.",
    "description": "Veteran Mandalorians know how to move on the battlefield. Once per encounter, on your turn, you can Move up to your Speed as a Free Action before any other Action."
  },
  "mandalorian_ferocity": {
    "name": "Mandalorian Ferocity",
    "prerequisite": "Dexterity 13",
    "benefit": "Mandalorians can be ferocious fighters. Select one weapon group or Exotic Weapon you are proficient with. Once per encounter, when making more than one attack in a round, you can add one damage die to each successful hit with the selected weapon group or Exotic Weapon.",
    "description": "Mandalorians can be ferocious fighters. Select one weapon group or Exotic Weapon you are proficient with. Once per encounter, when making more than one attack in a round, you can add one damage die to each successful hit with the selected weapon group or Exotic Weapon.\n\nYou can take this Talent more than once, selecting a different Exotic Weapon or weapon group each time."
  },
  "mandalorian_glory": {
    "name": "Mandalorian Glory",
    "prerequisite": "",
    "benefit": "Above everything else, Mandalorians fight for glory in battle. Once per encounter, when you reduce an opponent's Hit Points to 0, you gain a +5 attack bonus with your next attack roll during the same encounter.",
    "description": "Above everything else, Mandalorians fight for glory in battle. Once per encounter, when you reduce an opponent's Hit Points to 0, you gain a +5 attack bonus with your next attack roll during the same encounter."
  },
  "advantageous_strike": {
    "name": "Advantageous Strike",
    "prerequisite": "",
    "benefit": "You take advantage of your opponent's haste. You gain a +5 bonus on Attacks of Opportunity with melee weapons you are proficient with.",
    "description": "You take advantage of your opponent's haste. You gain a +5 bonus on Attacks of Opportunity with melee weapons you are proficient with."
  },
  "dirty_tricks": {
    "name": "Dirty Tricks",
    "prerequisite": "Trained in Deception",
    "benefit": "You are not above using a few dirty tricks to win. You can use the Feint application of the Deception skill as two Swift Actions against an opponent you Threaten.",
    "description": "You are not above using a few dirty tricks to win. You can use the Feint application of the Deception skill as two Swift Actions against an opponent you Threaten."
  },
  "dual_weapon_flourish_i": {
    "name": "Dual Weapon Flourish I",
    "prerequisite": "Dual Weapon Mastery I, Weapon Finesse",
    "benefit": "When wielding only two light melee weapons or two Lightsabers, whenever you make a single attack as a Standard Action with one weapon, you can make a single attack with the other weapon as a Free Action against the same target. You apply the normal penalties for fighting with two weapons with this attack.",
    "description": "When wielding only two light melee weapons or two Lightsabers, whenever you make a single attack as a Standard Action with one weapon, you can make a single attack with the other weapon as a Free Action against the same target. You apply the normal penalties for fighting with two weapons with this attack."
  },
  "dual_weapon_flourish_ii": {
    "name": "Dual Weapon Flourish II",
    "prerequisite": "Dual Weapon Mastery I, Dual Weapon Mastery II, Dual Weapon Flourish I, Master of Elegance, Weapon Finesse",
    "benefit": "When wielding only two light melee weapons or two Lightsabers, once per turn on your turn, you can make a Full Attack Action as a Standard Action, rather than a Full-Round Action, provided you attack with both weapons during the attack. You apply the normal penalties for fighting with two weapons to both of these attacks.",
    "description": "When wielding only two light melee weapons or two Lightsabers, once per turn on your turn, you can make a Full Attack Action as a Standard Action, rather than a Full-Round Action, provided you attack with both weapons during the attack. You apply the normal penalties for fighting with two weapons to both of these attacks."
  },
  "master_of_elegance": {
    "name": "Master of Elegance",
    "prerequisite": "Dual Weapon Flourish I or Single Weapon Flourish I, Weapon Finesse",
    "benefit": "You may add your Dexterity bonus (instead of your Strength bonus) on damage rolls when wielding a light melee weapon. When you wield a light melee weapon two-handed, you may apply double your Dexterity bonus (instead of double your Strength bonus) to the damage.",
    "description": "You may add your Dexterity bonus (instead of your Strength bonus) on damage rolls when wielding a light melee weapon. When you wield a light melee weapon two-handed, you may apply double your Dexterity bonus (instead of double your Strength bonus) to the damage."
  },
  "multiattack_proficiency_advanced_melee_weapons": {
    "name": "Multiattack Proficiency (Advanced Melee Weapons)",
    "prerequisite": "",
    "benefit": "Whenever you make multiple attacks with Advanced Melee Weapons as a Full Attack Action, you reduce the penalty on your attack rolls by 2 points.",
    "description": "Whenever you make multiple attacks with Advanced Melee Weapons as a Full Attack Action, you reduce the penalty on your attack rolls by 2 points.\n\nYou can take this Talent multiple times; each time you take this Talent, you reduce the penalty on your attack rolls by an additional 2 points."
  },
  "out_of_nowhere": {
    "name": "Out of Nowhere",
    "prerequisite": "Trained in Deception, Weapon Finesse",
    "benefit": "Once per encounter, as a Free Action on your turn, you can make an attack with a light melee weapon or Lightsaber after a successful Feint.",
    "description": "Once per encounter, as a Free Action on your turn, you can make an attack with a light melee weapon or Lightsaber after a successful Feint."
  },
  "single_weapon_flourish_i": {
    "name": "Single Weapon Flourish I",
    "prerequisite": "Double Attack with either Advanced Melee Weapons, an Exotic Weapon (Melee), or Lightsabers; Weapon Finesse",
    "benefit": "When you wield only a single light melee weapon, or a single Lightsaber, and use the Full Attack Action, once per turn; you can Move up to your Speed as a Free Action at any time during your turn.",
    "description": "When you wield only a single light melee weapon, or a single Lightsaber, and use the Full Attack Action, once per turn; you can Move up to your Speed as a Free Action at any time during your turn."
  },
  "single_weapon_flourish_ii": {
    "name": "Single Weapon Flourish II",
    "prerequisite": "Double Attack with either Advanced Melee Weapons, an Exotic Weapon (Melee), or Lightsabers; Master of Elegance, Single Weapon Flourish I, Weapon Finesse",
    "benefit": "When you wield only a single light melee weapon, or a single Lightsaber, once per turn on your turn, you can make a Full Attack Action as a Standard Action, instead of a Full-Round Action.",
    "description": "When you wield only a single light melee weapon, or a single Lightsaber, once per turn on your turn, you can make a Full Attack Action as a Standard Action, instead of a Full-Round Action."
  },
  "jet_pack_training": {
    "name": "Jet Pack Training",
    "prerequisite": "",
    "benefit": "You can activate a Jet Pack as a Free Action on your turn. You need not make Pilot checks to land safely with a Jet Pack.",
    "description": "You can activate a Jet Pack as a Free Action on your turn. You need not make Pilot checks to land safely with a Jet Pack."
  },
  "burning_assault": {
    "name": "Burning Assault",
    "prerequisite": "Jet Pack Training",
    "benefit": "As a Standard Action you can expend one of your Jet Pack's charges to make an attack with the Jet Pack, treating it as a Flamethrower. You cannot use this Talent when you are flying. You are considered proficient in the Flamethrower for purposes of making this attack.",
    "description": "As a Standard Action you can expend one of your Jet Pack's charges to make an attack with the Jet Pack, treating it as a Flamethrower. You cannot use this Talent when you are flying. You are considered proficient in the Flamethrower for purposes of making this attack."
  },
  "improved_trajectory": {
    "name": "Improved Trajectory",
    "prerequisite": "Jet Pack Training",
    "benefit": "You always use the proper trajectories to maximize the efficiency of your rocket-pack burn rates. You increase your fly Speed by 2 squares when using a Jet Pack.",
    "description": "You always use the proper trajectories to maximize the efficiency of your rocket-pack burn rates. You increase your fly Speed by 2 squares when using a Jet Pack."
  },
  "jet_pack_withdraw": {
    "name": "Jet Pack Withdraw",
    "prerequisite": "Jet Pack Training",
    "benefit": "Once per encounter, as a Reaction when an opponent moves adjacent to you, you can expend one charge of your Jet Pack to fly and Move your Speed, or Withdraw.",
    "description": "Once per encounter, as a Reaction when an opponent moves adjacent to you, you can expend one charge of your Jet Pack to fly and Move your Speed, or Withdraw."
  },
  "cheap_shot": {
    "name": "Cheap Shot",
    "prerequisite": "Opportunistic Strike",
    "benefit": "Once per encounter, you can make an Attack of Opportunity against an opponent that takes the Withdraw Action to Withdraw from a space threatened by one of your allies within Point-Blank Range.",
    "description": "Once per encounter, you can make an Attack of Opportunity against an opponent that takes the Withdraw Action to Withdraw from a space threatened by one of your allies within Point-Blank Range."
  },
  "no_escape": {
    "name": "No Escape",
    "prerequisite": "Opportunistic Strike",
    "benefit": "Whenever an opponent uses the Withdraw Action to leave your Threatened Area, that opponent is considered Flat-Footed against you until the end of your next turn.",
    "description": "Whenever an opponent uses the Withdraw Action to leave your Threatened Area, that opponent is considered Flat-Footed against you until the end of your next turn."
  },
  "opportunistic_strike": {
    "name": "Opportunistic Strike",
    "prerequisite": "",
    "benefit": "Once per encounter, you can make an Attack of Opportunity against an opponent within Point-Blank Range (even using a ranged weapon), if that opponent provokes an Attack of Opportunity from one of your allies.",
    "description": "Once per encounter, you can make an Attack of Opportunity against an opponent within Point-Blank Range (even using a ranged weapon), if that opponent provokes an Attack of Opportunity from one of your allies."
  },
  "slippery_strike": {
    "name": "Slippery Strike",
    "prerequisite": "Strike and Run",
    "benefit": "Once per encounter, you can designate an opponent you have just damaged as a Reaction; that opponent cannot make Attacks of Opportunity against you until the end of your next turn.",
    "description": "Once per encounter, you can designate an opponent you have just damaged as a Reaction; that opponent cannot make Attacks of Opportunity against you until the end of your next turn.\n\nYou may use this in conjunction with the Strike and Run Talent, allowing you to benefit from both Talents as a single Reaction."
  },
  "strike_and_run": {
    "name": "Strike and Run",
    "prerequisite": "",
    "benefit": "Once per encounter, as a Reaction after successfully damaging an opponent with a melee or ranged attack, you can Move your Speed.",
    "description": "Once per encounter, as a Reaction after successfully damaging an opponent with a melee or ranged attack, you can Move your Speed."
  },
  "battlefield_medic": {
    "name": "Battlefield Medic",
    "prerequisite": "Steady Under Pressure",
    "benefit": "You can use the First Aid application of the Treat Injury skill on a creature as a Standard Action instead of a Full-Round Action.",
    "description": "You can use the First Aid application of the Treat Injury skill on a creature as a Standard Action instead of a Full-Round Action."
  },
  "bring_them_back": {
    "name": "Bring Them Back",
    "prerequisite": "",
    "benefit": "You can use the Revivify application of the Treat Injury skill on a target that has died anytime within a number of rounds equal to one-half your Heroic Level.",
    "description": "You can use the Revivify application of the Treat Injury skill on a target that has died anytime within a number of rounds equal to one-half your Heroic Level."
  },
  "emergency_team": {
    "name": "Emergency Team",
    "prerequisite": "",
    "benefit": "You are skilled at working on and managing an emergency medical team. Allies automatically succeed on Aid Another attempts when assisting you with Treat Injury checks.",
    "description": "You are skilled at working on and managing an emergency medical team. Allies automatically succeed on Aid Another attempts when assisting you with Treat Injury checks."
  },
  "extra_first_aid": {
    "name": "Extra First Aid",
    "prerequisite": "",
    "benefit": "You can use the First Aid application of the Treat Injury skill one additional time per day on a target that has already received First Aid for the day.",
    "description": "You can use the First Aid application of the Treat Injury skill one additional time per day on a target that has already received First Aid for the day."
  },
  "medical_miracle": {
    "name": "Medical Miracle",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can make a DC 20 Treat Injury check on an adjacent target. If the check is successful, that target immediately uses its Second Wind, even if it is above half Hit Points. If the target has already expended all of its Second Winds for the day, this Talent has no effect.",
    "description": "As a Standard Action, you can make a DC 20 Treat Injury check on an adjacent target. If the check is successful, that target immediately uses its Second Wind, even if it is above half Hit Points. If the target has already expended all of its Second Winds for the day, this Talent has no effect."
  },
  "natural_healing": {
    "name": "Natural Healing",
    "prerequisite": "",
    "benefit": "Your extensive knowledge of Natural Healing allows you to make First Aid, Treat Disease, and Treat Poison checks without a Medical Kit, if you have access to appropriate natural substitutes (as determined by the Gamemaster).",
    "description": "Your extensive knowledge of Natural Healing allows you to make First Aid, Treat Disease, and Treat Poison checks without a Medical Kit, if you have access to appropriate natural substitutes (as determined by the Gamemaster)."
  },
  "second_chance": {
    "name": "Second Chance",
    "prerequisite": "Steady Under Pressure",
    "benefit": "If you fail your Treat Injury check, your patient does not take any additional damage, nor does it die, even if the failed check would normally require it.",
    "description": "If you fail your Treat Injury check, your patient does not take any additional damage, nor does it die, even if the failed check would normally require it."
  },
  "steady_under_pressure": {
    "name": "Steady Under Pressure",
    "prerequisite": "",
    "benefit": "You can choose to reroll any Treat Injury check, keeping the better of the two results.",
    "description": "You can choose to reroll any Treat Injury check, keeping the better of the two results."
  },
  "defensive_electronics": {
    "name": "Defensive Electronics",
    "prerequisite": "",
    "benefit": "You defend your independence from all. When someone tries to Reprogram you, add your Independent Droid Class Level to your Will Defense.",
    "description": "You defend your independence from all. When someone tries to Reprogram you, add your Independent Droid Class Level to your Will Defense."
  },
  "ion_resistance_10": {
    "name": "Ion Resistance 10",
    "prerequisite": "",
    "benefit": "You gain Damage Reduction 10 against Ion damage.",
    "description": "You gain Damage Reduction 10 against Ion damage."
  },
  "soft_reset": {
    "name": "Soft Reset",
    "prerequisite": "",
    "benefit": "You are adept at rerouting your internal electronics. If you are moved to the bottom of the Condition Track by any means other than taking damage exceeding your Damage Threshold, you automatically move +1 step along the Condition Track after being disabled for 2 rounds.",
    "description": "You are adept at rerouting your internal electronics. If you are moved to the bottom of the Condition Track by any means other than taking damage exceeding your Damage Threshold, you automatically move +1 step along the Condition Track after being disabled for 2 rounds."
  },
  "modification_specialist": {
    "name": "Modification Specialist",
    "prerequisite": "",
    "benefit": "You have become skilled at Reprogramming and modifying your own Droid Systems. You do not incur the normal -5 penalty on Mechanics and Use Computer checks to Reprogram yourself or perform self-modifications.",
    "description": "You have become skilled at Reprogramming and modifying your own Droid Systems. You do not incur the normal -5 penalty on Mechanics and Use Computer checks to Reprogram yourself or perform self-modifications."
  },
  "repair_self": {
    "name": "Repair Self",
    "prerequisite": "",
    "benefit": "When you Repair yourself, your Repair 1 additional Hit Point for each point by which your Mechanics check exceeds the DC.",
    "description": "When you Repair yourself, your Repair 1 additional Hit Point for each point by which your Mechanics check exceeds the DC."
  },
  "just_a_droid": {
    "name": "Just a Droid",
    "prerequisite": "",
    "benefit": "You are adept at passing yourself off as an ordinary Droid. You can use each of the following Actions once per encounter.",
    "description": "You are adept at passing yourself off as an ordinary Droid. You can use each of the following Actions once per encounter.\n\nJust Another Droid: You are skilled at using Stealth to sneak past unwary enemies when moving in plain sight. You can use the Sneak application of the Stealth Skill when in plain sight of an enemy, if the enemy has no reason to doubt that you are just another Droid. You are considered Trained in Stealth for this Action.\nJust a Normal Droid: You can reroll Deception checks for Deceptive Appearance to make observers believe that you are carrying out a standard function when attempting to do something atypical for your Droid Model or function. You may keep either result."
  },
  "swift_droid": {
    "name": "Swift Droid",
    "prerequisite": "Any two Talents from the Autonomy Talent Tree",
    "benefit": "You move quickly when caught. You can make a Swift Action as a Reaction after failing a Deception check or a Stealth check.",
    "description": "You move quickly when caught. You can make a Swift Action as a Reaction after failing a Deception check or a Stealth check."
  },
  "spynet_agent": {
    "name": "SpyNet Agent",
    "prerequisite": "Bothan, or two Talents from the Infiltration Talent Tree",
    "benefit": "You can use your Gather Information check modifier instead of your Knowledge (Galactic Lore) check modifier when making Knowledge (Galactic Lore) checks. You are considered Trained in the Knowledge (Galactic Lore) skill for the purpose of using this Talent. If you are entitled to a Knowledge (Galactic Lore) reroll, you can reroll your Gather Information check instead (subject to the same circumstances and limitations).",
    "description": "You can use your Gather Information check modifier instead of your Knowledge (Galactic Lore) check modifier when making Knowledge (Galactic Lore) checks. You are considered Trained in the Knowledge (Galactic Lore) skill for the purpose of using this Talent. If you are entitled to a Knowledge (Galactic Lore) reroll, you can reroll your Gather Information check instead (subject to the same circumstances and limitations)."
  },
  "bothan_resources": {
    "name": "Bothan Resources",
    "prerequisite": "SpyNet Agent",
    "benefit": "Your status within the SpyNet gives you access to additional resources, and you know the best sources for Restricted or Rare items. With a successful DC 20 Gather Information check, you can purchase standard weapons, Equipment, and transport services at 50% of the going rate, or Rare and Restricted weapons, Equipment, and transport services at 75% of the going rate.",
    "description": "Your status within the SpyNet gives you access to additional resources, and you know the best sources for Restricted or Rare items. With a successful DC 20 Gather Information check, you can purchase standard weapons, Equipment, and transport services at 50% of the going rate, or Rare and Restricted weapons, Equipment, and transport services at 75% of the going rate."
  },
  "knowledge_is_life": {
    "name": "Knowledge is Life",
    "prerequisite": "SpyNet Agent",
    "benefit": "As a Swift Action, you can designate a single target within line of sight and make a Knowledge (Galactic Lore) check against a DC equal to 15 + the target's CL. If the check is successful, for the remainder of the encounter you gain a +2 morale bonus to the Defense Score of your choice against that target.",
    "description": "As a Swift Action, you can designate a single target within line of sight and make a Knowledge (Galactic Lore) check against a DC equal to 15 + the target's CL. If the check is successful, for the remainder of the encounter you gain a +2 morale bonus to the Defense Score of your choice against that target."
  },
  "knowledge_is_power": {
    "name": "Knowledge is Power",
    "prerequisite": "SpyNet Agent",
    "benefit": "As a Swift Action, you can designate a single target within line of sight and make a Knowledge (Galactic Lore) check against a DC equal to 15 + the target's CL. If the check is successful, for the remainder of the encounter you score a Critical Hit against that target on a natural roll of 19 or 20.",
    "description": "As a Swift Action, you can designate a single target within line of sight and make a Knowledge (Galactic Lore) check against a DC equal to 15 + the target's CL. If the check is successful, for the remainder of the encounter you score a Critical Hit against that target on a natural roll of 19 or 20.\n\nIf you have another ability that increases your weapon's critical range against that target (such as the Elite Trooper's Extended Critical Range Talent, or the Jedi Knight's Vaapad Talent), you increase this range by 1 (for example, from 19-20 to 18-20). However, anything other than a Natural 20 is not considered an automatic hit; if you roll anything other than a Natural 20 and still miss the target, you do not score a Critical Hit."
  },
  "knowledge_is_strength": {
    "name": "Knowledge is Strength",
    "prerequisite": "SpyNet Agent",
    "benefit": "As a Swift Action, you can designate a single target within line of sight and make a Knowledge (Galactic Lore) check against a DC equal to 15 + the target's CL. If the check is successful, for the remainder of the encounter you gain a +2 morale bonus on attack rolls against that target.",
    "description": "As a Swift Action, you can designate a single target within line of sight and make a Knowledge (Galactic Lore) check against a DC equal to 15 + the target's CL. If the check is successful, for the remainder of the encounter you gain a +2 morale bonus on attack rolls against that target."
  },
  "six_questions": {
    "name": "Six Questions",
    "prerequisite": "SpyNet Agent",
    "benefit": "You have mastered the basic Bothan philosophy of Six Questions to glean more information from contacts through fewer questions. As a Swift Action, you can designate a single target within line of sight and make a Knowledge (Galactic Lore) check against a DC equal to 15 + the target's CL.",
    "description": "You have mastered the basic Bothan philosophy of Six Questions to glean more information from contacts through fewer questions. As a Swift Action, you can designate a single target within line of sight and make a Knowledge (Galactic Lore) check against a DC equal to 15 + the target's CL.\n\nIf the check is successful, you learn a target's Character Level, Classes, Ability Scores, and the target's available Force Points and Destiny Points."
  },
  "deny_move": {
    "name": "Deny Move",
    "prerequisite": "Reduce Mobility",
    "benefit": "When you score a Critical Hit with a melee or ranged attack, your target cannot Move on its next turn.",
    "description": "When you score a Critical Hit with a melee or ranged attack, your target cannot Move on its next turn."
  },
  "extended_critical_range_heavy_weapons": {
    "name": "Extended Critical Range (Heavy Weapons)",
    "prerequisite": "Base Attack Bonus +10, Weapon Proficiency (Heavy Weapons)",
    "benefit": "When you are using a Heavy Weapon, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a Natural 20 is not considered an automatic hit; if you roll anything other than a Natural 20 and still miss the target, you do not score a Critical Hit.",
    "description": "When you are using a Heavy Weapon, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a Natural 20 is not considered an automatic hit; if you roll anything other than a Natural 20 and still miss the target, you do not score a Critical Hit."
  },
  "extended_critical_range_rifles": {
    "name": "Extended Critical Range (Rifles)",
    "prerequisite": "Base Attack Bonus +10, Weapon Proficiency (Rifles)",
    "benefit": "When you are using a Rifle, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a Natural 20 is not considered an automatic hit; if you roll anything other than a Natural 20 and still miss the target, you do not score a Critical Hit.",
    "description": "When you are using a Rifle, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a Natural 20 is not considered an automatic hit; if you roll anything other than a Natural 20 and still miss the target, you do not score a Critical Hit."
  },
  "flurry_attack": {
    "name": "Flurry Attack",
    "prerequisite": "Weapon Proficiency (Chosen Weapon)",
    "benefit": "Choose a single Weapon Group or Exotic Weapon you are proficient with. When you score a Critical Hit with a weapon from that group, you can make one immediate extra attack (in addition to the other effects of a Critical Hit) against a single target within Range.",
    "description": "Choose a single Weapon Group or Exotic Weapon you are proficient with. When you score a Critical Hit with a weapon from that group, you can make one immediate extra attack (in addition to the other effects of a Critical Hit) against a single target within Range.\n\nYou may only use this Talent once per turn. You can select this Talent multiple times. its effects do not stack. Each time you take the Talent, it applies to a new Weapon Group or Exotic Weapon."
  },
  "knockback": {
    "name": "Knockback",
    "prerequisite": "",
    "benefit": "When you score a Critical Hit against a target no more than two size categories larger than you are, you can choose to move that opponent 1 square in any direction as a Free Action.",
    "description": "When you score a Critical Hit against a target no more than two size categories larger than you are, you can choose to move that opponent 1 square in any direction as a Free Action.\n\nYou cannot use this Talent on an opponent that is being Grabbed or Grappled, and you cannot move your target into a solid object or into another creature's Fighting Space."
  },
  "reduce_defense": {
    "name": "Reduce Defense",
    "prerequisite": "",
    "benefit": "When you score a Critical Hit with a melee or ranged attack, your target takes a -2 penalty to their Reflex Defense until it is fully healed (at maximum Hit Points).",
    "description": "When you score a Critical Hit with a melee or ranged attack, your target takes a -2 penalty to their Reflex Defense until it is fully healed (at maximum Hit Points)."
  },
  "reduce_mobility": {
    "name": "Reduce Mobility",
    "prerequisite": "",
    "benefit": "When you score a Critical Hit with a melee or ranged attack, you reduce the target's speed by half until it is fully healed (at maximum Hit Points).",
    "description": "When you score a Critical Hit with a melee or ranged attack, you reduce the target's speed by half until it is fully healed (at maximum Hit Points)."
  },
  "extended_critical_range_simple_weapons": {
    "name": "Extended Critical Range (Simple Weapons)",
    "prerequisite": "Base Attack Bonus +10, Weapon Proficiency (Simple Weapons)",
    "benefit": "When you attack with a Simple Weapon, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a Natural 20 is not considered an automatic hit; if you roll anything other than a Natural 20 and still miss the target, you do not score a Critical Hit.",
    "description": "When you attack with a Simple Weapon, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a Natural 20 is not considered an automatic hit; if you roll anything other than a Natural 20 and still miss the target, you do not score a Critical Hit."
  },
  "cover_bracing": {
    "name": "Cover Bracing",
    "prerequisite": "",
    "benefit": "You can Brace a weapon set on Autofire as a single Swift Action (instead of two) if you are adjacent to an object (including walls, barriers, and Vehicles) that provides you with Cover from all of the target squares.",
    "description": "You can Brace a weapon set on Autofire as a single Swift Action (instead of two) if you are adjacent to an object (including walls, barriers, and Vehicles) that provides you with Cover from all of the target squares."
  },
  "intentional_crash": {
    "name": "Intentional Crash",
    "prerequisite": "Trained in Pilot",
    "benefit": "You know how to intentionally crash an opponent's moving Vehicle. When you successfully deal damage to a Vehicle by Ramming it, your Vehicle takes half damage from the Ram. Additionally, if the target Vehicle is the same size as your Vehicle or smaller, that Vehicle cannot move in the following round.",
    "description": "You know how to intentionally crash an opponent's moving Vehicle. When you successfully deal damage to a Vehicle by Ramming it, your Vehicle takes half damage from the Ram. Additionally, if the target Vehicle is the same size as your Vehicle or smaller, that Vehicle cannot move in the following round."
  },
  "nonlethal_tactics": {
    "name": "Nonlethal Tactics",
    "prerequisite": "",
    "benefit": "When you are using a ranged weapon set to Stun, Stun Grenades, Nets, Riot Shields, or Stun Batons, you gain a +1 bonus on your attack roll and deal +1 die of Stun Damage.",
    "description": "When you are using a ranged weapon set to Stun, Stun Grenades, Nets, Riot Shields, or Stun Batons, you gain a +1 bonus on your attack roll and deal +1 die of Stun Damage."
  },
  "pursuit": {
    "name": "Pursuit",
    "prerequisite": "Dexterity 13",
    "benefit": "When Running, you are not restricted to a straight line; and you can reroll Endurance checks, keeping the better of the two results, while Running.",
    "description": "When Running, you are not restricted to a straight line; and you can reroll Endurance checks, keeping the better of the two results, while Running."
  },
  "respected_officer": {
    "name": "Respected Officer",
    "prerequisite": "",
    "benefit": "You have a reputation that causes allies and opponents to treat you with respect. You automatically improve the Attitude of an Indifferent character to Friendly with no check required.",
    "description": "You have a reputation that causes allies and opponents to treat you with respect. You automatically improve the Attitude of an Indifferent character to Friendly with no check required."
  },
  "slowing_stun": {
    "name": "Slowing Stun",
    "prerequisite": "",
    "benefit": "When you move a target at least -1 step along the Condition Track with an attack, its speed is halved until all conditions are removed.",
    "description": "When you move a target at least -1 step along the Condition Track with an attack, its speed is halved until all conditions are removed."
  },
  "takedown": {
    "name": "Takedown",
    "prerequisite": "",
    "benefit": "When you successfully make a melee attack and deal damage at the end of a Charge, you knock your target Prone as well, provided your opponent is no more than one size category larger than you.",
    "description": "When you successfully make a melee attack and deal damage at the end of a Charge, you knock your target Prone as well, provided your opponent is no more than one size category larger than you."
  },
  "instruction": {
    "name": "Instruction",
    "prerequisite": "",
    "benefit": "Once per encounter, as a Standard Action, you can boost the competence of one of your allies within 6 squares. That individual gains the ability to make a single Skill Check using your Skill modifier (except Use the Force); this Skill Check must be made before the end of the encounter, or the benefit is lost.",
    "description": "Once per encounter, as a Standard Action, you can boost the competence of one of your allies within 6 squares. That individual gains the ability to make a single Skill Check using your Skill modifier (except Use the Force); this Skill Check must be made before the end of the encounter, or the benefit is lost.\n\nYou can select this Talent multiple times. Each time you do so, you gain one additional use of this Talent per encounter."
  },
  "idealist": {
    "name": "Idealist",
    "prerequisite": "Charisma 13",
    "benefit": "Your confidence empowers you, giving you the ability to withstand the harmful influence of others. You can add your Charisma modifier in place of your Wisdom modifier to your Will Defense.",
    "description": "Your confidence empowers you, giving you the ability to withstand the harmful influence of others. You can add your Charisma modifier in place of your Wisdom modifier to your Will Defense."
  },
  "know_your_enemy": {
    "name": "Know Your Enemy",
    "prerequisite": "",
    "benefit": "You are well versed in the strengths and weaknesses of the enemies of your cause. As a Swift Action, you can select a single enemy within line of sight and make a Knowledge (Galactic Lore) check against a DC equal to 15 + the target's CL. If the check is successful, you immediately learn any two (your choice) of the following pieces of information:",
    "description": "You are well versed in the strengths and weaknesses of the enemies of your cause. As a Swift Action, you can select a single enemy within line of sight and make a Knowledge (Galactic Lore) check against a DC equal to 15 + the target's CL. If the check is successful, you immediately learn any two (your choice) of the following pieces of information:"
  },
  "targets_base_attack_bonus_or_attack_bonus_with_a_particular_weapon": {
    "name": "Target's Base Attack Bonus or attack bonus with a particular weapon",
    "prerequisite": "",
    "benefit": "Any one Defense Score\nAny one Skill modifier\nThe presence of any one Talent or Feat (you choose the Talent or Feat, and the Gamemaster reveals whether or not it is present).",
    "description": "Any one Defense Score\nAny one Skill modifier\nThe presence of any one Talent or Feat (you choose the Talent or Feat, and the Gamemaster reveals whether or not it is present)."
  },
  "known_dissident": {
    "name": "Known Dissident",
    "prerequisite": "Know Your Enemy",
    "benefit": "You are a well-know opponent of a large and influential government or organization (such as the Empire or the Corporate Sector Authority). Officials of any level are loath to take action against you, lest they inadvertently promote your cause. As a Standard Action, you can make a Persuasion check against the Will Defense of a single opponent within line of sight that can hear and understand you.",
    "description": "You are a well-know opponent of a large and influential government or organization (such as the Empire or the Corporate Sector Authority). Officials of any level are loath to take action against you, lest they inadvertently promote your cause. As a Standard Action, you can make a Persuasion check against the Will Defense of a single opponent within line of sight that can hear and understand you.\n\nIf the Persuasion check succeeds, that opponent may not attack you or any Vehicle you occupy until the start of your next turn. If the target is of higher level than you, it gains a +5 bonus to its Will Defense, and the target must be able to hear and understand you. If the target is attacked, the effect of this Talent ends.\n\nThis is a Mind-Affecting effect."
  },
  "cower_enemies": {
    "name": "Cower Enemies",
    "prerequisite": "Force Interrogation",
    "benefit": "When you use the Persuasion skill to Intimidate, you can Intimidate all targets in a 6-Square Cone (originating from your square) instead of Intimidating a single target. All other limitations to the Intimidation use of the Persuasion skill still apply.",
    "description": "When you use the Persuasion skill to Intimidate, you can Intimidate all targets in a 6-Square Cone (originating from your square) instead of Intimidating a single target. All other limitations to the Intimidation use of the Persuasion skill still apply."
  },
  "force_interrogation": {
    "name": "Force Interrogation",
    "prerequisite": "",
    "benefit": "When you deal damage to one or more creatures by using a Force Power, you can immediately make a Persuasion check as a Free Action to Intimidate a single target you damaged.",
    "description": "When you deal damage to one or more creatures by using a Force Power, you can immediately make a Persuasion check as a Free Action to Intimidate a single target you damaged."
  },
  "inquisition": {
    "name": "Inquisition",
    "prerequisite": "",
    "benefit": "You are particularly adept at dealing with Force-sensitive foes. You gain a +1 bonus on attack rolls and deal +1 die of damage against targets that have the Force Sensitivity feat.",
    "description": "You are particularly adept at dealing with Force-sensitive foes. You gain a +1 bonus on attack rolls and deal +1 die of damage against targets that have the Force Sensitivity feat."
  },
  "unsettling_presence": {
    "name": "Unsettling Presence",
    "prerequisite": "Force Interrogation",
    "benefit": "You can spend a Force Point as a Standard Action to create an aura of unsettling discomfort around you. You make a Use the Force check when you activate this Talent and compare the check result to the Will Defense of any creature that comes within 6 squares of you.",
    "description": "You can spend a Force Point as a Standard Action to create an aura of unsettling discomfort around you. You make a Use the Force check when you activate this Talent and compare the check result to the Will Defense of any creature that comes within 6 squares of you.\n\nIf your Use the Force check result equals or exceeds the creature's Will Defense, that target takes a -2 penalty on attack rolls and Skill Checks while within 6 squares of you. This aura lasts for the remainder of the encounter."
  },
  "always_ready": {
    "name": "Always Ready",
    "prerequisite": "Trained in Initiative",
    "benefit": "You are accustomed to operating in response to enemy actions. When your Readied Action is triggered, it does not change your Initiative Count.",
    "description": "You are accustomed to operating in response to enemy actions. When your Readied Action is triggered, it does not change your Initiative Count."
  },
  "concealed_weapon_expert": {
    "name": "Concealed Weapon Expert",
    "prerequisite": "",
    "benefit": "You are deadly with an Unarmed strike, Hold-Out Blaster Pistol, Knife, Vibrodagger, or other small concealable weapons (as determined by the Gamemaster). Once per round you can use a Swift Action to reroll an attack using one of these weapons, but you must accept the result of the reroll, even if it is worse.",
    "description": "You are deadly with an Unarmed strike, Hold-Out Blaster Pistol, Knife, Vibrodagger, or other small concealable weapons (as determined by the Gamemaster). Once per round you can use a Swift Action to reroll an attack using one of these weapons, but you must accept the result of the reroll, even if it is worse."
  },
  "creeping_approach": {
    "name": "Creeping Approach",
    "prerequisite": "Trained in Stealth",
    "benefit": "As a Swift Action, you can designate a single opponent within 12 squares that is unaware of you as the target of this Talent. Until the beginning of your next turn, that target may not make Perception checks to notice you, even if you enter the target's line of sight. If you or any of your allies attack the target, the effect of this Talent ends.",
    "description": "As a Swift Action, you can designate a single opponent within 12 squares that is unaware of you as the target of this Talent. Until the beginning of your next turn, that target may not make Perception checks to notice you, even if you enter the target's line of sight. If you or any of your allies attack the target, the effect of this Talent ends."
  },
  "set_for_stun": {
    "name": "Set for Stun",
    "prerequisite": "",
    "benefit": "You are particularly adept with Stun weapons. If you are using a ranged weapon that deals Stun damage (including a lethal weapon set to Stun), you can spend two consecutive Swift Actions in the same round to activate this Talent. If the Stun damage on your next attack exceeds the target's Damage Threshold, you move the target -3 steps along the Condition Track, instead of the normal -2 steps.",
    "description": "You are particularly adept with Stun weapons. If you are using a ranged weapon that deals Stun damage (including a lethal weapon set to Stun), you can spend two consecutive Swift Actions in the same round to activate this Talent. If the Stun damage on your next attack exceeds the target's Damage Threshold, you move the target -3 steps along the Condition Track, instead of the normal -2 steps."
  },
  "silent_takedown": {
    "name": "Silent Takedown",
    "prerequisite": "Trained in Stealth",
    "benefit": "You are skilled at quietly knocking out or eliminating guards and others when they are caught unaware. If you damage an opponent that is unaware of you, that opponent cannot speak or make other noises until the end of your next turn. This is a Stun effect.",
    "description": "You are skilled at quietly knocking out or eliminating guards and others when they are caught unaware. If you damage an opponent that is unaware of you, that opponent cannot speak or make other noises until the end of your next turn. This is a Stun effect."
  },
  "additionally_persuasion_is_now_considered_a_class_skill_for_you": {
    "name": "Additionally, Persuasion is now considered a Class Skill for you.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "dirty_fighting": {
    "name": "Dirty Fighting",
    "prerequisite": "",
    "benefit": "Once per encounter, if you successfully damage an opponent with a melee or ranged attack, you reduce the target's Damage Threshold by 2 points for the remainder of the encounter.",
    "description": "Once per encounter, if you successfully damage an opponent with a melee or ranged attack, you reduce the target's Damage Threshold by 2 points for the remainder of the encounter."
  },
  "feared_warrior": {
    "name": "Feared Warrior",
    "prerequisite": "Commanding Presence",
    "benefit": "Your abilities on the battlefield are well known and feared. When you reduce an opponent to 0 Hit Points with an attack, you can make a Persuasion check as a Free Action against all targets within 6 squares. If your Persuasion check exceeds the target's Will Defense, that target takes a -2 penalty on attack rolls for the remainder of the encounter.",
    "description": "Your abilities on the battlefield are well known and feared. When you reduce an opponent to 0 Hit Points with an attack, you can make a Persuasion check as a Free Action against all targets within 6 squares. If your Persuasion check exceeds the target's Will Defense, that target takes a -2 penalty on attack rolls for the remainder of the encounter.\n\nThis Talent affects any given target only once per encounter. This is a Mind-Affecting Fear effect."
  },
  "focused_warrior": {
    "name": "Focused Warrior",
    "prerequisite": "",
    "benefit": "Your training makes you confident and disciplined in combat. When you successfully deal damage to an opponent in combat, you gain a +5 morale bonus to Will Defense until the start of your next turn. You lose this bonus to Will Defense if you are Surprised or Flat-Footed for any reason.",
    "description": "Your training makes you confident and disciplined in combat. When you successfully deal damage to an opponent in combat, you gain a +5 morale bonus to Will Defense until the start of your next turn. You lose this bonus to Will Defense if you are Surprised or Flat-Footed for any reason."
  },
  "ruthless": {
    "name": "Ruthless",
    "prerequisite": "Dirty Fighting",
    "benefit": "When you deal damage to a target with a melee or ranged attack roll that exceeds the target's Damage Threshold, you gain a +2 bonus on damage rolls against that target for the remainder of the encounter.",
    "description": "When you deal damage to a target with a melee or ranged attack roll that exceeds the target's Damage Threshold, you gain a +2 bonus on damage rolls against that target for the remainder of the encounter."
  },
  "mercenarys_determination": {
    "name": "Mercenary's Determination",
    "prerequisite": "Mercenary's Grit",
    "benefit": "As a Free Action, on your turn, you can spend a Force Point to double your speed for 1 round. You must wait 5 rounds between each use of this ability.",
    "description": "As a Free Action, on your turn, you can spend a Force Point to double your speed for 1 round. You must wait 5 rounds between each use of this ability."
  },
  "mercenarys_grit": {
    "name": "Mercenary's Grit",
    "prerequisite": "",
    "benefit": "When you are affected by any debilitating condition, you can convert the condition's modifier from a penalty to a bonus for 1 round as a Swift Action. At the end of your next turn, move -1 step along the Condition Track.",
    "description": "When you are affected by any debilitating condition, you can convert the condition's modifier from a penalty to a bonus for 1 round as a Swift Action. At the end of your next turn, move -1 step along the Condition Track."
  },
  "mercenarys_teamwork": {
    "name": "Mercenary's Teamwork",
    "prerequisite": "Combined Fire, Coordinated Attack",
    "benefit": "You gain a +2 bonus to damage rolls for each ally that has damaged your target since the end of your last turn (to a maximum of +10).",
    "description": "You gain a +2 bonus to damage rolls for each ally that has damaged your target since the end of your last turn (to a maximum of +10)."
  },
  "armored_spacer": {
    "name": "Armored Spacer",
    "prerequisite": "",
    "benefit": "You can use Armored Space Suits as if you had the Armor Proficiency (Heavy) Feat.",
    "description": "You can use Armored Space Suits as if you had the Armor Proficiency (Heavy) Feat."
  },
  "attract_privateer": {
    "name": "Attract Privateer",
    "prerequisite": "",
    "benefit": "You attract a loyal Privateer Lieutenant. The Lieutenant is a Nonheroic character who has a Class Level equal to three-quarters of your Character Level, rounded down.",
    "description": "You attract a loyal Privateer Lieutenant. The Lieutenant is a Nonheroic character who has a Class Level equal to three-quarters of your Character Level, rounded down.\n\nYou can select this Talent multiple times. Each time you do so, you gain another Privateer. Each Privateer who accompanies you on an adventure is entitled to an equal share of the total Experience Points earned for the adventure. For example, a Privateer who accompanies a party of five heroes on an adventure receives one-sixth of the XP that the group earns."
  },
  "blaster_and_blade_i": {
    "name": "Blaster and Blade I",
    "prerequisite": "Dual Weapon Mastery I, Weapon Proficiency (Advanced Melee Weapons), Weapon Proficiency (Pistols)",
    "benefit": "When you make a single attack with an Advanced Melee Weapon as a Standard Action, you can immediately make an attack with a Pistol as a Free Action, provided you have both the Advanced Melee Weapon and the Pistol in your hands when the melee attack is made. You apply the normal penalties for fighting with two weapons to both of these attacks.",
    "description": "When you make a single attack with an Advanced Melee Weapon as a Standard Action, you can immediately make an attack with a Pistol as a Free Action, provided you have both the Advanced Melee Weapon and the Pistol in your hands when the melee attack is made. You apply the normal penalties for fighting with two weapons to both of these attacks."
  },
  "blaster_and_blade_ii": {
    "name": "Blaster and Blade II",
    "prerequisite": "Blaster and Blade I, Dual Weapon Mastery I, Weapon Proficiency (Advanced Melee Weapons), Weapon Proficiency (Pistols)",
    "benefit": "When you are wielding both an Advanced Melee Weapon and a Pistol, you treat the Advanced Melee Weapon as though you were wielding it two-handed (including doubling your Strength bonus on damage rolls).",
    "description": "When you are wielding both an Advanced Melee Weapon and a Pistol, you treat the Advanced Melee Weapon as though you were wielding it two-handed (including doubling your Strength bonus on damage rolls)."
  },
  "blaster_and_blade_iii": {
    "name": "Blaster and Blade III",
    "prerequisite": "Blaster and Blade I, Blaster and Blade II, Dual Weapon Mastery I, Weapon Proficiency (Advanced Melee Weapons), Weapon Proficiency (Pistols)",
    "benefit": "When you are wielding both an Advanced Melee Weapon and a Pistol, you can make a Full Attack as a Standard Action instead of a Full-Round Action, provided you attack with both weapons.",
    "description": "When you are wielding both an Advanced Melee Weapon and a Pistol, you can make a Full Attack as a Standard Action instead of a Full-Round Action, provided you attack with both weapons."
  },
  "boarder": {
    "name": "Boarder",
    "prerequisite": "",
    "benefit": "You are skilled at boarding hostile vessels. You ignore Cover (but not Improved Cover) with your Character Scale ranged attacks while aboard a Starship or Space Station.",
    "description": "You are skilled at boarding hostile vessels. You ignore Cover (but not Improved Cover) with your Character Scale ranged attacks while aboard a Starship or Space Station."
  },
  "ion_mastery": {
    "name": "Ion Mastery",
    "prerequisite": "",
    "benefit": "You know the typical weaknesses of Vehicles and Droids, and you know how to preserve such targets for capture rather than destroying them. When attacking with Ion weapons, you gain a +1 bonus on attack rolls and deal +1 die of Ion damage.",
    "description": "You know the typical weaknesses of Vehicles and Droids, and you know how to preserve such targets for capture rather than destroying them. When attacking with Ion weapons, you gain a +1 bonus on attack rolls and deal +1 die of Ion damage."
  },
  "preserving_shot": {
    "name": "Preserving Shot",
    "prerequisite": "",
    "benefit": "When you deal damage with a Vehicle Weapon that is equal to or greater than both the target Vehicle's current Hit Points and the target Vehicle's Damage Threshold (that is, when you would deal enough damage to destroy the target Vehicle), you can choose to use this Talent.",
    "description": "When you deal damage with a Vehicle Weapon that is equal to or greater than both the target Vehicle's current Hit Points and the target Vehicle's Damage Threshold (that is, when you would deal enough damage to destroy the target Vehicle), you can choose to use this Talent.\n\nInstead of dealing full damage, you instead deal half damage to your target and move it -1 step along the Condition Track. In addition, you disable the ship's sublight engines and Hyperdrive. The ship cannot move or make a jump to lightspeed until it receives repairs."
  },
  "device_jammer": {
    "name": "Device Jammer",
    "prerequisite": "",
    "benefit": "You can construct a short-range Jammer that affects a specific type of electronic device such as a personal Energy Shields, Comlink, Portable Computer, or Datapad. As a Full-Round Action, you select a particular piece of personal, portable electronic Equipment (any item listed as equipment excluding Droids, Vehicles and Weapons, that has an electronic component) and make a DC 20 Mechanics check to build the Jammer.",
    "description": "You can construct a short-range Jammer that affects a specific type of electronic device such as a personal Energy Shields, Comlink, Portable Computer, or Datapad. As a Full-Round Action, you select a particular piece of personal, portable electronic Equipment (any item listed as equipment excluding Droids, Vehicles and Weapons, that has an electronic component) and make a DC 20 Mechanics check to build the Jammer.\n\nIf the check is successful, all devices of the chosen type cease to function while within 12 squares of your position for the remainder of the encounter. You may only have one Jammer (Device or Droid) active at a time."
  },
  "droid_jammer": {
    "name": "Droid Jammer",
    "prerequisite": "",
    "benefit": "You can construct a short-range Jammer that affects Droids. As a Full-Round Action, you make a Mechanics check to build the Jammer. When a Droid comes within 6 squares of you, compare the result of your Mechanics check to the Droid's Will Defense. If your check result equals or exceeds the Droid's Will Defense, the Droid can only take Swift Actions as long as it remains within the radius of the Jammer.",
    "description": "You can construct a short-range Jammer that affects Droids. As a Full-Round Action, you make a Mechanics check to build the Jammer. When a Droid comes within 6 squares of you, compare the result of your Mechanics check to the Droid's Will Defense. If your check result equals or exceeds the Droid's Will Defense, the Droid can only take Swift Actions as long as it remains within the radius of the Jammer.\n\nDroids that are immune to the effect of a Restraining Bolt are immune to the effects of this Talent. The Jammer functions for the remainder of the encounter. You may only have one Jammer (Device or Droid) active at a time."
  },
  "extreme_explosion": {
    "name": "Extreme Explosion",
    "prerequisite": "Skilled Demolitionist, Shaped Explosion",
    "benefit": "You know how to set large charges and use dozens of charges for extremely large explosives. You increase the Burst radius of any Mines or Explosives by 1 square.",
    "description": "You know how to set large charges and use dozens of charges for extremely large explosives. You increase the Burst radius of any Mines or Explosives by 1 square."
  },
  "mine_mastery": {
    "name": "Mine Mastery",
    "prerequisite": "",
    "benefit": "You can place a Mine as a Standard Action instead of a Full-Round Action.",
    "description": "You can place a Mine as a Standard Action instead of a Full-Round Action."
  },
  "shaped_explosion": {
    "name": "Shaped Explosion",
    "prerequisite": "Skilled Demolitionist",
    "benefit": "You know how to set charges to direct a blast in a specific direction or manner. You can shape an explosion caused by Explosives or Mines that you set into a line or a cone instead of a radius. The length of the line is equal to 2 x the radius of the explosive Burst; the length of the cone is equal to 3 x the radius of the Burst, and either the line or the cone originates from the square where the Explosives are placed.",
    "description": "You know how to set charges to direct a blast in a specific direction or manner. You can shape an explosion caused by Explosives or Mines that you set into a line or a cone instead of a radius. The length of the line is equal to 2 x the radius of the explosive Burst; the length of the cone is equal to 3 x the radius of the Burst, and either the line or the cone originates from the square where the Explosives are placed."
  },
  "skilled_demolitionist": {
    "name": "Skilled Demolitionist",
    "prerequisite": "",
    "benefit": "You can set a Detonator as a Swift Action, and your Explosives never go off as the Detonator is being placed, even if you fail the check by 10 or more. You must still roll to determine if the charge otherwise goes off as planned (see Handle Explosives).",
    "description": "You can set a Detonator as a Swift Action, and your Explosives never go off as the Detonator is being placed, even if you fail the check by 10 or more. You must still roll to determine if the charge otherwise goes off as planned (see Handle Explosives)."
  },
  "art_of_concealment": {
    "name": "Art of Concealment",
    "prerequisite": "",
    "benefit": "Some smugglers are adept at hiding contraband and weapons, even on their person. When making a Stealth check to Conceal an item, you can Take 10 even under pressure. Additionally, you can Conceal an item as a Swift Action.",
    "description": "Some smugglers are adept at hiding contraband and weapons, even on their person. When making a Stealth check to Conceal an item, you can Take 10 even under pressure. Additionally, you can Conceal an item as a Swift Action."
  },
  "fast_talker": {
    "name": "Fast Talker",
    "prerequisite": "Art of Concealment",
    "benefit": "Smugglers must be quick to explain discrepancies in their cover stories. Once per day, you can Take 20 on a Deception check as a Standard Action when attempting to Deceive.",
    "description": "Smugglers must be quick to explain discrepancies in their cover stories. Once per day, you can Take 20 on a Deception check as a Standard Action when attempting to Deceive."
  },
  "hidden_weapons": {
    "name": "Hidden Weapons",
    "prerequisite": "Art of Concealment",
    "benefit": "If you draw a concealed weapon and, before the end of the same round, make an attack against a target that failed to notice the item, the target is considered Flat-Footed against you. You can draw a concealed item or a stowed item as a Move Action. Additionally, if you have the Quick Draw feat, you can reduce this to a Swift Action.",
    "description": "If you draw a concealed weapon and, before the end of the same round, make an attack against a target that failed to notice the item, the target is considered Flat-Footed against you. You can draw a concealed item or a stowed item as a Move Action. Additionally, if you have the Quick Draw feat, you can reduce this to a Swift Action."
  },
  "illicit_dealings": {
    "name": "Illicit Dealings",
    "prerequisite": "",
    "benefit": "Smugglers have a knack for locating and negotiating illicit deals. When using Persuasion to Haggle for Restricted, Military, or Illegal goods you may roll twice, keeping the better of the two results.",
    "description": "Smugglers have a knack for locating and negotiating illicit deals. When using Persuasion to Haggle for Restricted, Military, or Illegal goods you may roll twice, keeping the better of the two results."
  },
  "surprise_strike": {
    "name": "Surprise Strike",
    "prerequisite": "",
    "benefit": "Sometimes a smuggler has to fight his way out of a bad situation. If you fail any Deception check to convey deceptive information, you can initiate combat and make a single Unarmed attack as a Free Action in the Surprise Round (or with a melee or ranged weapon, if you have the Quick Draw feat); all other combatants are considered Surprised even if they are aware of you.",
    "description": "Sometimes a smuggler has to fight his way out of a bad situation. If you fail any Deception check to convey deceptive information, you can initiate combat and make a single Unarmed attack as a Free Action in the Surprise Round (or with a melee or ranged weapon, if you have the Quick Draw feat); all other combatants are considered Surprised even if they are aware of you."
  },
  "computer_language": {
    "name": "Computer Language",
    "prerequisite": "Must have Binary as a learned language",
    "benefit": "You can use your Persuasion modifier instead of your Use Computer modifier when making Use Computer checks. You are considered Trained in the Use Computer skill for the purpose of using this Talent. If you are entitled to a Use Computer check reroll, you can reroll your Persuasion check instead (subject to the same circumstances and limitations).",
    "description": "You can use your Persuasion modifier instead of your Use Computer modifier when making Use Computer checks. You are considered Trained in the Use Computer skill for the purpose of using this Talent. If you are entitled to a Use Computer check reroll, you can reroll your Persuasion check instead (subject to the same circumstances and limitations)."
  },
  "computer_master": {
    "name": "Computer Master",
    "prerequisite": "",
    "benefit": "You can reroll any opposed Use Computer check, keeping the better of the two results.",
    "description": "You can reroll any opposed Use Computer check, keeping the better of the two results."
  },
  "enhanced_manipulation": {
    "name": "Enhanced Manipulation",
    "prerequisite": "Dexterity 15",
    "benefit": "You have improved appendage manipulation routines. You can Take 10 when making any Dexterity-based Skill Check, even if you are threatened or would not normally be able to Take 10.",
    "description": "You have improved appendage manipulation routines. You can Take 10 when making any Dexterity-based Skill Check, even if you are threatened or would not normally be able to Take 10."
  },
  "hotwired_processor": {
    "name": "Hotwired Processor",
    "prerequisite": "",
    "benefit": "You gain temporary processing power, enhancing your mental attributes. When you Hotwire your Processor (a Swift Action), you gain a +5 circumstance bonus on Intelligence and Wisdom based Skill Checks, and a +1 circumstance bonus on ranged attack rolls. A Hotwiring lasts for a number of rounds equal to one-half your Heroic Level (rounded down). When the Hotwiring ends, you move -1 Persistent step along the Condition Track. The penalties imposed by this condition persist until you receive Repairs.",
    "description": "You gain temporary processing power, enhancing your mental attributes. When you Hotwire your Processor (a Swift Action), you gain a +5 circumstance bonus on Intelligence and Wisdom based Skill Checks, and a +1 circumstance bonus on ranged attack rolls. A Hotwiring lasts for a number of rounds equal to one-half your Heroic Level (rounded down). When the Hotwiring ends, you move -1 Persistent step along the Condition Track. The penalties imposed by this condition persist until you receive Repairs."
  },
  "power_surge": {
    "name": "Power Surge",
    "prerequisite": "",
    "benefit": "You temporarily surge your power systems to enhance your physical abilities. When you initiate a Power Surge (a Swift Action), you gain a +1 circumstance bonus on melee attack rolls, +1 die of damage on melee damage rolls, and an increase of 2 square to your speed. A Power Surge lasts for a number of rounds equal to one-half your Heroic Level (rounded down). When the Power Surge ends, you move -1 Persistent step along the Condition Track. The penalties imposed by this condition persist until you receive Repairs.",
    "description": "You temporarily surge your power systems to enhance your physical abilities. When you initiate a Power Surge (a Swift Action), you gain a +1 circumstance bonus on melee attack rolls, +1 die of damage on melee damage rolls, and an increase of 2 square to your speed. A Power Surge lasts for a number of rounds equal to one-half your Heroic Level (rounded down). When the Power Surge ends, you move -1 Persistent step along the Condition Track. The penalties imposed by this condition persist until you receive Repairs."
  },
  "skill_conversion": {
    "name": "Skill Conversion",
    "prerequisite": "",
    "benefit": "When you Reprogram yourself, you can sacrifice a single Trained Skill for a bonus Skill Focus Feat. You must meet the prerequisites for the Feat (you must be Trained in the Skill you choose to gain Skill Focus for), and you can do this only once per Reprogramming.",
    "description": "When you Reprogram yourself, you can sacrifice a single Trained Skill for a bonus Skill Focus Feat. You must meet the prerequisites for the Feat (you must be Trained in the Skill you choose to gain Skill Focus for), and you can do this only once per Reprogramming."
  },
  "power_boost": {
    "name": "Power Boost",
    "prerequisite": "Power Surge",
    "benefit": "You channel your Power Surge into a boost for your Locomotion System. When you initiate a Power Surge, you can use one of the following bonuses with your installed Locomotion System:",
    "description": "You channel your Power Surge into a boost for your Locomotion System. When you initiate a Power Surge, you can use one of the following bonuses with your installed Locomotion System:"
  },
  "jump_4_squares_walking_or_wheeled_locomotion_or": {
    "name": "Jump +4 squares (Walking or Wheeled Locomotion), or",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "increase_hovering_height_by_4_squares_hovering_locomotion": {
    "name": "Increase hovering height by 4 squares (Hovering Locomotion).",
    "prerequisite": "",
    "benefit": "You can use this Talent for a number of rounds equal to one-half your Character Level (rounded down). At the end of a Power Boost, you move -1 Persistent step on the Condition Track . The penalties imposed by this Persistent Condition persist until you receive Repairs. You can use both Power Surge and Power Boost at the same time, but you must move -2 Persistent steps on the Condition Track.",
    "description": "You can use this Talent for a number of rounds equal to one-half your Character Level (rounded down). At the end of a Power Boost, you move -1 Persistent step on the Condition Track . The penalties imposed by this Persistent Condition persist until you receive Repairs. You can use both Power Surge and Power Boost at the same time, but you must move -2 Persistent steps on the Condition Track."
  },
  "blend_in": {
    "name": "Blend In",
    "prerequisite": "",
    "benefit": "You know the tricks of body language and movement that allow you to disguise your appearance without elaborate materials or efforts.",
    "description": "You know the tricks of body language and movement that allow you to disguise your appearance without elaborate materials or efforts.\n\nYou can use your Stealth modifier in place of your Deception modifier for the purpose of creating a Deceptive Appearance. You are considered Trained in Deception skill for the purpose of using this Talent. If you are entitled to a Deception check reroll, you can reroll your Stealth check instead (subject to the same circumstances and conditions)."
  },
  "incognito": {
    "name": "Incognito",
    "prerequisite": "Blend In",
    "benefit": "Spies are adept at concealing their identities, even if not using a physical disguise. You can reroll any Deception check for the purpose of creating a Deceptive Appearance, keeping the better of the two results.",
    "description": "Spies are adept at concealing their identities, even if not using a physical disguise. You can reroll any Deception check for the purpose of creating a Deceptive Appearance, keeping the better of the two results."
  },
  "improved_surveillance": {
    "name": "Improved Surveillance",
    "prerequisite": "Surveillance, Trained in Perception",
    "benefit": "When you successfully use the Surveillance Talent, you grant yourself and your allies a +1 insight bonus to all Defenses against the target.",
    "description": "When you successfully use the Surveillance Talent, you grant yourself and your allies a +1 insight bonus to all Defenses against the target."
  },
  "intimate_knowledge": {
    "name": "Intimate Knowledge",
    "prerequisite": "Surveillance",
    "benefit": "Experienced spies and Scouts remember many details from previous assignments, providing insights on later missions. Once per encounter as a Standard Action, you can Take 20 on a check involving a Knowledge skill you are Trained in, or Take 10 on a check involving a Knowledge skill you are Untrained in, even if circumstances would not normally allow you to Take 10 or Take 20.",
    "description": "Experienced spies and Scouts remember many details from previous assignments, providing insights on later missions. Once per encounter as a Standard Action, you can Take 20 on a check involving a Knowledge skill you are Trained in, or Take 10 on a check involving a Knowledge skill you are Untrained in, even if circumstances would not normally allow you to Take 10 or Take 20."
  },
  "surveillance": {
    "name": "Surveillance",
    "prerequisite": "Trained in Perception",
    "benefit": "As a Full-Round Action, you can make a Perception check against a single target within line of sight. The DC is equal to 15 or the target's Stealth check result (if the target is actively trying to remain hidden), whichever is greater.",
    "description": "As a Full-Round Action, you can make a Perception check against a single target within line of sight. The DC is equal to 15 or the target's Stealth check result (if the target is actively trying to remain hidden), whichever is greater.\n\nIf the check is successful, you grant yourself and all allies within line of sight a +2 insight bonus on attack rolls against that target until the end of your next turn. Your allies must be able to hear and understand you to benefit from this bonus, and they do not lose the benefit if they move out of line of sight after it is used."
  },
  "traceless_tampering": {
    "name": "Traceless Tampering",
    "prerequisite": "",
    "benefit": "Spies specialize in leaving no evidence of their presence when they tamper with advanced electronics or basic mechanical systems. When using Mechanics to Disable Device, you automatically leave no trace when tampering (with no DC increase), and you must fail by 10 or more (instead of 5 or more) before something goes wrong.",
    "description": "Spies specialize in leaving no evidence of their presence when they tamper with advanced electronics or basic mechanical systems. When using Mechanics to Disable Device, you automatically leave no trace when tampering (with no DC increase), and you must fail by 10 or more (instead of 5 or more) before something goes wrong."
  },
  "blaster_turret_i": {
    "name": "Blaster Turret I",
    "prerequisite": "",
    "benefit": "Once per encounter, as a Standard Action you can create a Blaster Turret (Size Tiny, Initiative +4, Perception +4, Reflex Defense 10, 10 Hit Points, Damage Threshold 8) that can be mounted to any flat surface. The Turret fires as a standard Blaster Pistol once per round, using your Base Attack Bonus plus your Intelligence bonus and dealing 3d6 points of Energy damage.",
    "description": "Once per encounter, as a Standard Action you can create a Blaster Turret (Size Tiny, Initiative +4, Perception +4, Reflex Defense 10, 10 Hit Points, Damage Threshold 8) that can be mounted to any flat surface. The Turret fires as a standard Blaster Pistol once per round, using your Base Attack Bonus plus your Intelligence bonus and dealing 3d6 points of Energy damage.\n\nThe Turret fires at any target you designate (a Free Action, once per round on your turn), though you must remain adjacent to the Turret to control it. The Turret is expended at the end of the encounter."
  },
  "blaster_turret_ii": {
    "name": "Blaster Turret II",
    "prerequisite": "Blaster Turret I",
    "benefit": "Your Turret's capabilities increase in the following ways: Initiative +8, Perception +8, Reflex Defense 12, 15 Hit Points, Damage Threshold 10, and the Turret deals 3d8 points of Energy damage. The Turret can be directed by a remote control at a range of 12 squares.",
    "description": "Your Turret's capabilities increase in the following ways: Initiative +8, Perception +8, Reflex Defense 12, 15 Hit Points, Damage Threshold 10, and the Turret deals 3d8 points of Energy damage. The Turret can be directed by a remote control at a range of 12 squares."
  },
  "blaster_turret_iii": {
    "name": "Blaster Turret III",
    "prerequisite": "Blaster Turret I, Blaster Turret II",
    "benefit": "Your Turret gains the ability to fire twice per round, with a -5 penalty on each attack roll, and gains Damage Reduction 5.",
    "description": "Your Turret gains the ability to fire twice per round, with a -5 penalty on each attack roll, and gains Damage Reduction 5."
  },
  "ion_turret": {
    "name": "Ion Turret",
    "prerequisite": "Blaster Turret I",
    "benefit": "You can construct a Turret that is highly effective against Droids. The Turret deals Ion damage instead of normal damage.",
    "description": "You can construct a Turret that is highly effective against Droids. The Turret deals Ion damage instead of normal damage."
  },
  "stun_turret": {
    "name": "Stun Turret",
    "prerequisite": "Blaster Turret I",
    "benefit": "You can construct a nonlethal Turret. The Turret deals Stun damage instead of normal damage.",
    "description": "You can construct a nonlethal Turret. The Turret deals Stun damage instead of normal damage."
  },
  "turret_self_destruct": {
    "name": "Turret Self-Destruct",
    "prerequisite": "Blaster Turret I",
    "benefit": "Your Turret self-destructs automatically when it reaches 0 Hit Points. It explodes in a 2-Square radius, dealing its normal damage. If you are adjacent to the Turret, you can disable this feature as a Reaction.",
    "description": "Your Turret self-destructs automatically when it reaches 0 Hit Points. It explodes in a 2-Square radius, dealing its normal damage. If you are adjacent to the Turret, you can disable this feature as a Reaction."
  },
  "deadly_repercussions": {
    "name": "Deadly Repercussions",
    "prerequisite": "",
    "benefit": "When you reduce a target to 0 Hit Points or move the target to the bottom of the Condition Track, all your opponents within line of sight of both you and your target take a -2 penalty on attack rolls until the beginning of your next turn.",
    "description": "When you reduce a target to 0 Hit Points or move the target to the bottom of the Condition Track, all your opponents within line of sight of both you and your target take a -2 penalty on attack rolls until the beginning of your next turn."
  },
  "manipulating_strike": {
    "name": "Manipulating Strike",
    "prerequisite": "",
    "benefit": "Once per turn when you successfully damage a target with a non-Area Attack, make an Intimidate Persuasion check against the target's Will Defense. If successful, you can determine what the target does with its Swift Action on its next turn. This is a Mind-Affecting effect.",
    "description": "Once per turn when you successfully damage a target with a non-Area Attack, make an Intimidate Persuasion check against the target's Will Defense. If successful, you can determine what the target does with its Swift Action on its next turn. This is a Mind-Affecting effect."
  },
  "improved_manipulating_strike": {
    "name": "Improved Manipulating Strike",
    "prerequisite": "Manipulating Strike Talent",
    "benefit": "Whenever you successfully use the Manipulating Strike Talent, you determine what the target does with its Move Action on its next turn. You cannot move an opponent into a Hazard (such as into lava or off a cliff).",
    "description": "Whenever you successfully use the Manipulating Strike Talent, you determine what the target does with its Move Action on its next turn. You cannot move an opponent into a Hazard (such as into lava or off a cliff)."
  },
  "pulling_the_strings": {
    "name": "Pulling the Strings",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can make a Persuasion check against the Will Defense of a target within 12 squares. If you succeed, you move the target up to half its speed toward you through the safest route, and you make an immediate ranged or melee attack against the the target if it is within Range. You cannot move an opponent into a Hazard (such as into lava or off a cliff).",
    "description": "As a Standard Action, you can make a Persuasion check against the Will Defense of a target within 12 squares. If you succeed, you move the target up to half its speed toward you through the safest route, and you make an immediate ranged or melee attack against the the target if it is within Range. You cannot move an opponent into a Hazard (such as into lava or off a cliff)."
  },
  "findsman_ceremonies": {
    "name": "Findsman Ceremonies",
    "prerequisite": "Force Sensitivity",
    "benefit": "Once per day, you can spend 10 minutes performing rituals that enhance your connection with The Force, receiving visions and portents as a result. At that time, you can spend any number of Force Points in the performance of the ritual, up to the total number you have remaining.",
    "description": "Once per day, you can spend 10 minutes performing rituals that enhance your connection with The Force, receiving visions and portents as a result. At that time, you can spend any number of Force Points in the performance of the ritual, up to the total number you have remaining.\n\nFor the remainder of the day, whenever you make a Perception or Stealth check, make a Use the Force check to use the Farseeing Force Power, or make an attack roll, you can choose to reroll that check, but must accept to the results of the reroll, even if it is worse. You may do this a number of times per day equal to the number of Force Points you spent during the casting of the ritual."
  },
  "at_the_end_of_the_day_you_regain_force_points_equal_to_the_number_of_rerolls_you_have_remaining": {
    "name": "At the end of the day, you regain Force Points equal to the number of rerolls you have remaining.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "findsmans_foresight": {
    "name": "Findsman's Foresight",
    "prerequisite": "Findsman Ceremonies",
    "benefit": "The visions you receive sometimes provide clues about dangerous situations. Whenever you make a Perception check to avoid Surprise, you may roll twice, keeping the better of the two results.",
    "description": "The visions you receive sometimes provide clues about dangerous situations. Whenever you make a Perception check to avoid Surprise, you may roll twice, keeping the better of the two results."
  },
  "omens": {
    "name": "Omens",
    "prerequisite": "Findsman Ceremonies",
    "benefit": "You see Omens in both success and failure. Whenever an ally within 10 squares and line of sight of you rolls a Natural 1 or a Natural 20 on an attack roll, you gain a +2 insight bonus to either your next attack roll made before the end of your next turn, or a +2 insight bonus to your Reflex Defense until the end of your next turn (your choice).",
    "description": "You see Omens in both success and failure. Whenever an ally within 10 squares and line of sight of you rolls a Natural 1 or a Natural 20 on an attack roll, you gain a +2 insight bonus to either your next attack roll made before the end of your next turn, or a +2 insight bonus to your Reflex Defense until the end of your next turn (your choice)."
  },
  "target_visions": {
    "name": "Target Visions",
    "prerequisite": "Findsman Ceremonies",
    "benefit": "You have visions that tell you what your enemies are likely to do even before they do it. Once per encounter, when an enemy creature moves within 6 squares of you, you may make a melee or ranged attack against that target as a Reaction to their movement.",
    "description": "You have visions that tell you what your enemies are likely to do even before they do it. Once per encounter, when an enemy creature moves within 6 squares of you, you may make a melee or ranged attack against that target as a Reaction to their movement."
  },
  "temporal_awareness": {
    "name": "Temporal Awareness",
    "prerequisite": "Findsman Ceremonies",
    "benefit": "",
    "description": ""
  },
  "ambush": {
    "name": "Ambush",
    "prerequisite": "Dirty Tactics",
    "benefit": "During a Surprise Round, before combat begins, if you are not Surprised you can give up your Standard Action to allow all non-Surprised allies within your line of sight to take an extra Move Action during the Surprise Round.",
    "description": "During a Surprise Round, before combat begins, if you are not Surprised you can give up your Standard Action to allow all non-Surprised allies within your line of sight to take an extra Move Action during the Surprise Round.\n\nAllies can spend this Move Action to instead reroll their Initiative checks and take the better of the two results as a Free Action before combat begins."
  },
  "castigate": {
    "name": "Castigate",
    "prerequisite": "",
    "benefit": "You deliver a scathing rebuke against a target to erode its will and fill it with doubt. Make a Persuasion check as a Standard Action against the target's Will Defense. If successful, you impose a -2 penalty to all the target's Defenses until the end of your next turn.",
    "description": "You deliver a scathing rebuke against a target to erode its will and fill it with doubt. Make a Persuasion check as a Standard Action against the target's Will Defense. If successful, you impose a -2 penalty to all the target's Defenses until the end of your next turn.\n\nYou can use this ability only against targets that can clearly hear and understand your language."
  },
  "dirty_tactics": {
    "name": "Dirty Tactics",
    "prerequisite": "",
    "benefit": "Once per encounter, as a Standard Action, you can grant a tactical advantage to all allies within your line of sight. When an ally Flanks an opponent, that ally gains a +4 Flanking bonus on melee attack rolls instead of the normal +2 bonus.",
    "description": "Once per encounter, as a Standard Action, you can grant a tactical advantage to all allies within your line of sight. When an ally Flanks an opponent, that ally gains a +4 Flanking bonus on melee attack rolls instead of the normal +2 bonus.\n\nAllies lose this benefit immediately if line of sight is broken or if you are unconscious or dead, or at the end of the encounter."
  },
  "misplaced_loyalty": {
    "name": "Misplaced Loyalty",
    "prerequisite": "Dirty Tactics",
    "benefit": "As a Swift Action once per turn, you can make a Persuasion check against the Will Defense of all opponents within your line of sight. If successful, a target cannot attack you if one of your allies is within 6 squares of you.",
    "description": "As a Swift Action once per turn, you can make a Persuasion check against the Will Defense of all opponents within your line of sight. If successful, a target cannot attack you if one of your allies is within 6 squares of you.\n\nYou may not gain the benefit of this Talent if another character within 6 squares of you has used this talent since the end of your last turn. You may not use this Talent in the same round as the Soldier's Draw Fire Talent."
  },
  "two_faced": {
    "name": "Two-Faced",
    "prerequisite": "Dirty Tactics, Misplaced Loyalty",
    "benefit": "You have mastered the art of saying one thing and doing another, allowing you to deceive your enemies to keep your machinations hidden. You can use each of the following actions once per encounter as a Standard Action:",
    "description": "You have mastered the art of saying one thing and doing another, allowing you to deceive your enemies to keep your machinations hidden. You can use each of the following actions once per encounter as a Standard Action:\n\nFalse Security: Make a single melee or ranged attack against a target within your Range. At any time before the beginning of your next turn, you can make a single attack against that target as a Reaction if that target attacks you.\nNonthreatening: Make a single melee or ranged attack against a target within your Range. Until the beginning of your next turn, that opponent cannot make any attacks against you except for Attacks of Opportunity. This is a Mind-Affecting effect.\nTricky Target: Make a single melee or ranged attack against a target within your range that has not attacked you since the end of your last turn. You gain a +2 bonus on your attack roll and damage roll for this attack."
  },
  "unreadable": {
    "name": "Unreadable",
    "prerequisite": "",
    "benefit": "You gain a +5 bonus to your Will Defense against Skill Checks made to read your emotions and influence your Attitude. In addition, whenever you successfully Feint a target in combat, that target is Flat-Footed against all your attacks until the end of your next turn.",
    "description": "You gain a +5 bonus to your Will Defense against Skill Checks made to read your emotions and influence your Attitude. In addition, whenever you successfully Feint a target in combat, that target is Flat-Footed against all your attacks until the end of your next turn."
  },
  "close_cover": {
    "name": "Close Cover",
    "prerequisite": "Watch This",
    "benefit": "If you occupy the same space as a Vehicle that is larger than the Vehicle you are Piloting, your Vehicle gains a +5 Cover bonus from the larger Vehicle.",
    "description": "If you occupy the same space as a Vehicle that is larger than the Vehicle you are Piloting, your Vehicle gains a +5 Cover bonus from the larger Vehicle."
  },
  "outrun": {
    "name": "Outrun",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "punch_through": {
    "name": "Punch Through",
    "prerequisite": "",
    "benefit": "If you are the Pilot of a Vehicle, smaller Vehicles that attempt to engage you in a Dogfight take a -10 penalty on their Pilot checks, instead of the normal -5.",
    "description": "If you are the Pilot of a Vehicle, smaller Vehicles that attempt to engage you in a Dogfight take a -10 penalty on their Pilot checks, instead of the normal -5."
  },
  "small_target": {
    "name": "Small Target",
    "prerequisite": "",
    "benefit": "When you are the Pilot of a Colossal or smaller Vehicle, Capital Ship Weapons that take a -20 penalty on attack rolls against your Vehicle (such as Turbolasers) do not automatically score a Critical Hit on your Vehicle on a Natural 20. The attack is only a Critical Hit if the total attack roll (20 + the weapon's attack bonus) would normally hit your Vehicle. Otherwise, the attack deals normal damage.",
    "description": "When you are the Pilot of a Colossal or smaller Vehicle, Capital Ship Weapons that take a -20 penalty on attack rolls against your Vehicle (such as Turbolasers) do not automatically score a Critical Hit on your Vehicle on a Natural 20. The attack is only a Critical Hit if the total attack roll (20 + the weapon's attack bonus) would normally hit your Vehicle. Otherwise, the attack deals normal damage."
  },
  "watch_this": {
    "name": "Watch This",
    "prerequisite": "",
    "benefit": "You can move into or through a space occupied by a Vehicle of Colossal (Frigate) size or larger without causing a Collision. Additionally, if you Pilot a Colossal or smaller Vehicle, you can occupy the same space as a Vehicle of Colossal (Frigate) size or larger.",
    "description": "You can move into or through a space occupied by a Vehicle of Colossal (Frigate) size or larger without causing a Collision. Additionally, if you Pilot a Colossal or smaller Vehicle, you can occupy the same space as a Vehicle of Colossal (Frigate) size or larger."
  },
  "advantageous_positioning": {
    "name": "Advantageous Positioning",
    "prerequisite": "Shift",
    "benefit": "Any opponent that you are Flanking is considered Flat-Footed and is denied its Dexterity bonus to its Reflex Defense against you.",
    "description": "Any opponent that you are Flanking is considered Flat-Footed and is denied its Dexterity bonus to its Reflex Defense against you."
  },
  "get_some_distance": {
    "name": "Get Some Distance",
    "prerequisite": "Advantageous Positioning, Shift",
    "benefit": "Once per encounter as a Standard Action you can make a melee attack against a target and then move up to your speed away from that target. This movement does not provoke an Attack of Opportunity.",
    "description": "Once per encounter as a Standard Action you can make a melee attack against a target and then move up to your speed away from that target. This movement does not provoke an Attack of Opportunity."
  },
  "murderous_arts_i": {
    "name": "Murderous Arts I",
    "prerequisite": "",
    "benefit": "When your successful attack causes an opponent to move -1 step along the Condition Track, that opponent immediately takes an additional +1d6 damage.",
    "description": "When your successful attack causes an opponent to move -1 step along the Condition Track, that opponent immediately takes an additional +1d6 damage."
  },
  "murderous_arts_ii": {
    "name": "Murderous Arts II",
    "prerequisite": "Murderous Arts I",
    "benefit": "",
    "description": ""
  },
  "shift": {
    "name": "Shift",
    "prerequisite": "",
    "benefit": "As a Move Action, you can move 1 square without provoking an Attack of Opportunity.",
    "description": "As a Move Action, you can move 1 square without provoking an Attack of Opportunity."
  },
  "sniping_assassin": {
    "name": "Sniping Assassin",
    "prerequisite": "",
    "benefit": "When you make a ranged attack against a target that is not at Point-Blank Range, you add half your Class Level to your damage roll.",
    "description": "When you make a ranged attack against a target that is not at Point-Blank Range, you add half your Class Level to your damage roll."
  },
  "sniping_marksman": {
    "name": "Sniping Marksman",
    "prerequisite": "Sniping Assassin",
    "benefit": "Once per encounter, when you make a ranged attack against a target that is not at Point-Blank Range, you can ignore your target's Armor bonus to their Reflex Defense.",
    "description": "Once per encounter, when you make a ranged attack against a target that is not at Point-Blank Range, you can ignore your target's Armor bonus to their Reflex Defense."
  },
  "sniping_master": {
    "name": "Sniping Master",
    "prerequisite": "Sniping Assassin, Sniping Marksman",
    "benefit": "",
    "description": ""
  },
  "by_taking_only_a_single_swift_action_you_can_aim_at_a_target_that_is_not_within_point_blank_range": {
    "name": "By taking only a single Swift Action, you can Aim at a target that is not within Point-Blank Range.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "confounding_attack": {
    "name": "Confounding Attack",
    "prerequisite": "Tangle Up, Uncanny Instincts",
    "benefit": "Once per encounter, whenever you would use Uncanny Instincts, you can forgo the movement to make an immediate melee or ranged attack against the opponent that hit you. If your attack is a melee attack that hits and deals damage, you and your opponent immediately switch places; assuming both you and your opponent can end in a legal space.",
    "description": "Once per encounter, whenever you would use Uncanny Instincts, you can forgo the movement to make an immediate melee or ranged attack against the opponent that hit you. If your attack is a melee attack that hits and deals damage, you and your opponent immediately switch places; assuming both you and your opponent can end in a legal space."
  },
  "double_up": {
    "name": "Double Up",
    "prerequisite": "Find an Opening, Seize the Moment",
    "benefit": "Once per encounter, whenever you would use Seize the Moment, you can forgo the extra Swift Action to make an immediate melee or ranged attack against the damaged opponent. If your attack is a ranged attack that hits and deals damage, you treat the damage dealt by you and your ally as though it was one attack for purposes of overcoming Damage Reduction, Shield Rating, and determining whether the damage exceeded the target's Damage Threshold.",
    "description": "Once per encounter, whenever you would use Seize the Moment, you can forgo the extra Swift Action to make an immediate melee or ranged attack against the damaged opponent. If your attack is a ranged attack that hits and deals damage, you treat the damage dealt by you and your ally as though it was one attack for purposes of overcoming Damage Reduction, Shield Rating, and determining whether the damage exceeded the target's Damage Threshold."
  },
  "find_an_opening": {
    "name": "Find an Opening",
    "prerequisite": "Seize the Moment",
    "benefit": "",
    "description": ""
  },
  "opportunistic_defense": {
    "name": "Opportunistic Defense",
    "prerequisite": "Uncanny Instincts",
    "benefit": "Once per encounter, whenever you would use Uncanny Instincts, you can forgo this extra movement and instead increase your Reflex Defense by 5 until the end of your next turn.",
    "description": "Once per encounter, whenever you would use Uncanny Instincts, you can forgo this extra movement and instead increase your Reflex Defense by 5 until the end of your next turn."
  },
  "preternatural_senses": {
    "name": "Preternatural Senses",
    "prerequisite": "",
    "benefit": "Once per encounter, as a Reaction, you can add one-half your Class Level to the Defense Score of your choice.",
    "description": "Once per encounter, as a Reaction, you can add one-half your Class Level to the Defense Score of your choice."
  },
  "seize_the_moment": {
    "name": "Seize the Moment",
    "prerequisite": "",
    "benefit": "Once per round, whenever an ally successfully damages an opponent, you can take a Swift Action as a Reaction.",
    "description": "Once per round, whenever an ally successfully damages an opponent, you can take a Swift Action as a Reaction."
  },
  "tangle_up": {
    "name": "Tangle Up",
    "prerequisite": "Uncanny Instincts",
    "benefit": "As a Standard Action, you can make a non-Area Attack melee or ranged attack against an opponent within Range. If the attack hits, you deal half your normal damage (minimum 1 point), but your opponent loses its next Move Action.",
    "description": "As a Standard Action, you can make a non-Area Attack melee or ranged attack against an opponent within Range. If the attack hits, you deal half your normal damage (minimum 1 point), but your opponent loses its next Move Action."
  },
  "uncanny_instincts": {
    "name": "Uncanny Instincts",
    "prerequisite": "",
    "benefit": "Once per round whenever an opponent successfully deals damage to you, you can move 1 square as a Reaction. This movement does not provoke Attacks of Opportunity.",
    "description": "Once per round whenever an opponent successfully deals damage to you, you can move 1 square as a Reaction. This movement does not provoke Attacks of Opportunity."
  },
  "bloodthirsty": {
    "name": "Bloodthirsty",
    "prerequisite": "",
    "benefit": "You can perform a Coup de Grace as a Move Action. Whenever you successfully perform a Coup de Grace Action and kill the target, all allies within your line of sight gain a +2 morale bonus on attack rolls for the duration of the encounter.",
    "description": "You can perform a Coup de Grace as a Move Action. Whenever you successfully perform a Coup de Grace Action and kill the target, all allies within your line of sight gain a +2 morale bonus on attack rolls for the duration of the encounter."
  },
  "fight_to_the_death": {
    "name": "Fight to the Death",
    "prerequisite": "Bloodthirsty",
    "benefit": "Once per encounter, as a Swift Action, you can fill your companions with renewed vigor. All allies within 6 squares of you heal damage equal to your Heroic Level.",
    "description": "Once per encounter, as a Swift Action, you can fill your companions with renewed vigor. All allies within 6 squares of you heal damage equal to your Heroic Level."
  },
  "keep_them_reeling": {
    "name": "Keep Them Reeling",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can make a single melee attack against a target within Reach. If the attack hits, you deal no damage, but your target must Move or Withdraw away from you on its next turn.",
    "description": "As a Standard Action, you can make a single melee attack against a target within Reach. If the attack hits, you deal no damage, but your target must Move or Withdraw away from you on its next turn."
  },
  "raiders_frenzy": {
    "name": "Raider's Frenzy",
    "prerequisite": "",
    "benefit": "Once per round, when one of your allies within 6 squares successfully damages a target, you grant all your allies within your line of sight a bonus to damage rolls against that target equal to one-half your Class Level until the end of your next turn.",
    "description": "Once per round, when one of your allies within 6 squares successfully damages a target, you grant all your allies within your line of sight a bonus to damage rolls against that target equal to one-half your Class Level until the end of your next turn."
  },
  "raiders_surge": {
    "name": "Raider's Surge",
    "prerequisite": "",
    "benefit": "Once per encounter, as a Standard Action, you can make a Deception or Persuasion check (your choice) against each enemy within your line of sight. If the check result equals or exceeds the enemy's Will Defense, that enemy must Withdraw on its next Action or take a -1 penalty on its attack rolls until the end of the encounter. This is a Mind-Affecting effect.",
    "description": "Once per encounter, as a Standard Action, you can make a Deception or Persuasion check (your choice) against each enemy within your line of sight. If the check result equals or exceeds the enemy's Will Defense, that enemy must Withdraw on its next Action or take a -1 penalty on its attack rolls until the end of the encounter. This is a Mind-Affecting effect."
  },
  "savage_reputation": {
    "name": "Savage Reputation",
    "prerequisite": "Bloodthirsty",
    "benefit": "You have cultivated a Savage Reputation, and when you are recognized, you instill fear in your enemies. All opponents within 6 squares of you take a -1 penalty to all their attack rolls. This is a Mind-Affecting Fear effect.",
    "description": "You have cultivated a Savage Reputation, and when you are recognized, you instill fear in your enemies. All opponents within 6 squares of you take a -1 penalty to all their attack rolls. This is a Mind-Affecting Fear effect."
  },
  "take_them_alive": {
    "name": "Take Them Alive",
    "prerequisite": "",
    "benefit": "Whenever you or any of your allies within 6 squares of you reduces a target to 0 Hit Points, you can choose to treat that opponent as though they had been reduced to 0 Hit Points by Stun damage (and thus, remain stable).",
    "description": "Whenever you or any of your allies within 6 squares of you reduces a target to 0 Hit Points, you can choose to treat that opponent as though they had been reduced to 0 Hit Points by Stun damage (and thus, remain stable)."
  },
  "dash_and_blast": {
    "name": "Dash and Blast",
    "prerequisite": "Dual Weapon Mastery I, Running Attack",
    "benefit": "Once per encounter as a Full-Round Action, when you are wielding two Pistols, you may move up to twice your speed and make a ranged attack with each Pistol. The normal penalties for attacking with two Weapons apply to these attacks.",
    "description": "Once per encounter as a Full-Round Action, when you are wielding two Pistols, you may move up to twice your speed and make a ranged attack with each Pistol. The normal penalties for attacking with two Weapons apply to these attacks."
  },
  "flanking_fire": {
    "name": "Flanking Fire",
    "prerequisite": "Dual Weapon Mastery I",
    "benefit": "Whenever you are Flanked by two (or more) opponents and are wielding two Pistols, you can make a Full Attack Action as a Standard Action instead of a Full-Round Action. This is provided that you target only opponents that Flank you and attack at least two targets.",
    "description": "Whenever you are Flanked by two (or more) opponents and are wielding two Pistols, you can make a Full Attack Action as a Standard Action instead of a Full-Round Action. This is provided that you target only opponents that Flank you and attack at least two targets."
  },
  "guaranteed_shot": {
    "name": "Guaranteed Shot",
    "prerequisite": "Dual Weapon Mastery I",
    "benefit": "If you are wielding two Pistols and make a single ranged attack with one of those Pistols as a Standard Action, even if you miss you deal damage equal to half your Heroic Level to the target. This consumes a single shot from the weapon not making the attack, and the weapon you attack with uses as many shots required by the attack.",
    "description": "If you are wielding two Pistols and make a single ranged attack with one of those Pistols as a Standard Action, even if you miss you deal damage equal to half your Heroic Level to the target. This consumes a single shot from the weapon not making the attack, and the weapon you attack with uses as many shots required by the attack."
  },
  "hailfire": {
    "name": "Hailfire",
    "prerequisite": "Dual Weapon Mastery I",
    "benefit": "When you are wielding two Pistols, as a Standard Action you can make an Autofire attack with one of the Pistols as though the Weapon were set to Autofire, even if the Pistol would not normally be capable of Autofire.",
    "description": "When you are wielding two Pistols, as a Standard Action you can make an Autofire attack with one of the Pistols as though the Weapon were set to Autofire, even if the Pistol would not normally be capable of Autofire.\n\nThe normal penalties for Autofire still apply to this attack roll, and you may split the number of shots consumed between the two Pistols."
  },
  "twin_shot": {
    "name": "Twin Shot",
    "prerequisite": "Dual Weapon Mastery I, Rapid Shot",
    "benefit": "When you are wielding two Pistols, you gain a +2 bonus to damage rolls when using the Rapid Shot feat.",
    "description": "When you are wielding two Pistols, you gain a +2 bonus to damage rolls when using the Rapid Shot feat."
  },
  "cunning_distraction": {
    "name": "Cunning Distraction",
    "prerequisite": "",
    "benefit": "When you successfully Feint an opponent in combat, you can immediately move up to one-half your speed.",
    "description": "When you successfully Feint an opponent in combat, you can immediately move up to one-half your speed."
  },
  "damaging_deception": {
    "name": "Damaging Deception",
    "prerequisite": "Cunning Distraction",
    "benefit": "You know how to distract a target, exposing weak spots that your allies can exploit. As a Standard Action, you can make a Deception check against the Will Defense of any target within your line of sight that can see, hear, and understand you. If successful, the next attack made by one of your allies made before the start of your next turn against that target deals 2 additional dice of damage.",
    "description": "You know how to distract a target, exposing weak spots that your allies can exploit. As a Standard Action, you can make a Deception check against the Will Defense of any target within your line of sight that can see, hear, and understand you. If successful, the next attack made by one of your allies made before the start of your next turn against that target deals 2 additional dice of damage."
  },
  "distracting_shout": {
    "name": "Distracting Shout",
    "prerequisite": "Cunning Distraction",
    "benefit": "Once per encounter, as a Reaction to one of your allies being attacked, you can make a Deception check, replacing the Defense Scores of that ally with the result of your Deception check for the resolution of that attack. If any Defense Scores are higher than the Deception check result, your ally can use that Defense Score instead. If the attack still hits, this does not count as the one use per encounter aspect of this Talent.",
    "description": "Once per encounter, as a Reaction to one of your allies being attacked, you can make a Deception check, replacing the Defense Scores of that ally with the result of your Deception check for the resolution of that attack. If any Defense Scores are higher than the Deception check result, your ally can use that Defense Score instead. If the attack still hits, this does not count as the one use per encounter aspect of this Talent."
  },
  "improved_soft_cover": {
    "name": "Improved Soft Cover",
    "prerequisite": "Innocuous",
    "benefit": "While you occupy a square adjacent to another creature, you can use a Swift Action to gain a +2 Cover bonus to your Reflex Defense until the start of your next turn or until you are no longer adjacent to another creature, whichever comes first.",
    "description": "While you occupy a square adjacent to another creature, you can use a Swift Action to gain a +2 Cover bonus to your Reflex Defense until the start of your next turn or until you are no longer adjacent to another creature, whichever comes first."
  },
  "innocuous": {
    "name": "Innocuous",
    "prerequisite": "",
    "benefit": "As a Swift Action, you can make a Deception check against a single enemy within 6 squares of you and in line of sight. If the check equals or exceeds the target's Will Defense, the target takes a -5 penalty on all attacks made against you until the start of your next turn.",
    "description": "As a Swift Action, you can make a Deception check against a single enemy within 6 squares of you and in line of sight. If the check equals or exceeds the target's Will Defense, the target takes a -5 penalty on all attacks made against you until the start of your next turn."
  },
  "treacherous": {
    "name": "Treacherous",
    "prerequisite": "Improved Soft Cover, Innocuous",
    "benefit": "Whenever you are attacked in combat and adjacent to a creature other than your attacker, you can move 1 square as a Reaction. The attack, intended for you, instead targets the adjacent creature, though if you move away from a creature that Threatens you, it can make an Attack of Opportunity before the original attack is resolved.",
    "description": "Whenever you are attacked in combat and adjacent to a creature other than your attacker, you can move 1 square as a Reaction. The attack, intended for you, instead targets the adjacent creature, though if you move away from a creature that Threatens you, it can make an Attack of Opportunity before the original attack is resolved."
  },
  "double_agent": {
    "name": "Double Agent",
    "prerequisite": "",
    "benefit": "When you roll Initiative at the beginning of combat, also roll a Deception check, comparing the result to the Will Defense of all enemies in line of sight. If your Deception check is successful, that target cannot attack you and does not believe you to be an enemy (though they do not consider you an ally) while this effect is active.",
    "description": "When you roll Initiative at the beginning of combat, also roll a Deception check, comparing the result to the Will Defense of all enemies in line of sight. If your Deception check is successful, that target cannot attack you and does not believe you to be an enemy (though they do not consider you an ally) while this effect is active.\n\nIf you attack or otherwise obviously harm or hinder a target under the effect of this Talent, or one of that target's allies, this effect ends. This is a Mind-Affecting effect."
  },
  "enemy_tactics": {
    "name": "Enemy Tactics",
    "prerequisite": "",
    "benefit": "Whenever an enemy within 12 squares of you and in your line of sight receives an insight or morale bonus from any source, you can also gain that bonus, subject to all the same limitations as the bonus provided to that enemy.",
    "description": "Whenever an enemy within 12 squares of you and in your line of sight receives an insight or morale bonus from any source, you can also gain that bonus, subject to all the same limitations as the bonus provided to that enemy."
  },
  "feed_information": {
    "name": "Feed Information",
    "prerequisite": "",
    "benefit": "As a Swift Action, you can grant one enemy a +1 bonus on its next attack roll made before the beginning of your next turn. Additionally, until the beginning of your next turn, you can designate one ally who receives a +2 bonus on its next attack roll.",
    "description": "As a Swift Action, you can grant one enemy a +1 bonus on its next attack roll made before the beginning of your next turn. Additionally, until the beginning of your next turn, you can designate one ally who receives a +2 bonus on its next attack roll."
  },
  "friendly_fire": {
    "name": "Friendly Fire",
    "prerequisite": "Enemy Tactics",
    "benefit": "If you are engaged in melee combat with an adjacent enemy and are the target of a ranged attack that misses you, compare the attack roll to the Reflex Defense of one adjacent enemy; if the attack equals or exceeds the target's Reflex Defense, that enemy becomes the new target of the attack, which is resolved as normal.",
    "description": "If you are engaged in melee combat with an adjacent enemy and are the target of a ranged attack that misses you, compare the attack roll to the Reflex Defense of one adjacent enemy; if the attack equals or exceeds the target's Reflex Defense, that enemy becomes the new target of the attack, which is resolved as normal."
  },
  "protection": {
    "name": "Protection",
    "prerequisite": "Double Agent",
    "benefit": "As a Standard Action, you can designate one ally and make a Persuasion check, comparing the result against the Will Defense of all enemies in your line of sight who can hear and understand you. If your check result equals or exceeds a target's Will Defense, that target cannot attack the ally you designated until the beginning of your next turn.",
    "description": "As a Standard Action, you can designate one ally and make a Persuasion check, comparing the result against the Will Defense of all enemies in your line of sight who can hear and understand you. If your check result equals or exceeds a target's Will Defense, that target cannot attack the ally you designated until the beginning of your next turn.\n\nCharacters that use this Talent or the Draw Fire Talent cannot be targeted by or benefit from this Talent. You may not benefit from this Talent at the same time as the Misplaced Loyalty Talent."
  },
  "automated_strike": {
    "name": "Automated Strike",
    "prerequisite": "Double Attack",
    "benefit": "As a Swift Action, you can make a DC 15 Knowledge (Tactics) check. If successful, all Droid allies able to hear and understand you gain the benefits of the Double Attack Feat for one Weapon Group with which you are proficient until the end of your next turn.",
    "description": "As a Swift Action, you can make a DC 15 Knowledge (Tactics) check. If successful, all Droid allies able to hear and understand you gain the benefits of the Double Attack Feat for one Weapon Group with which you are proficient until the end of your next turn."
  },
  "droid_defense": {
    "name": "Droid Defense",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can transmit tactical information to all Droid allies that can hear and understand you, granting them a bonus equal to your Intelligence modifier to one of their Defenses (your choice) until the beginning of your next turn.",
    "description": "As a Standard Action, you can transmit tactical information to all Droid allies that can hear and understand you, granting them a bonus equal to your Intelligence modifier to one of their Defenses (your choice) until the beginning of your next turn."
  },
  "droid_mettle": {
    "name": "Droid Mettle",
    "prerequisite": "Droid Defense",
    "benefit": "As a Swift Action once per turn, you can designate a single Droid ally within your line of sight. That Droid ally gains bonus Hit Points equal to 10 + your Class Level.",
    "description": "As a Swift Action once per turn, you can designate a single Droid ally within your line of sight. That Droid ally gains bonus Hit Points equal to 10 + your Class Level."
  },
  "expanded_sensors": {
    "name": "Expanded Sensors",
    "prerequisite": "",
    "benefit": "If you or any of your Droid allies has line of sight to, and is aware of, a target, all Droid allies that can hear and understand you are also considered to have line of sight (but not necessarily line of effect) to that target.",
    "description": "If you or any of your Droid allies has line of sight to, and is aware of, a target, all Droid allies that can hear and understand you are also considered to have line of sight (but not necessarily line of effect) to that target."
  },
  "inspire_competence": {
    "name": "Inspire Competence",
    "prerequisite": "Expanded Sensors",
    "benefit": "As a Swift Action once per turn, you can grant one Droid ally within your line of sight a competence bonus on it's next attack roll made before the start of your next turn equal to half your Class Level. Additionally, any Droid designated as the target of your Network Mind Class Feature is considered to have a Heuristic Processor whenever it is beneficial, even if it does not actually have a Heuristic Processor.",
    "description": "As a Swift Action once per turn, you can grant one Droid ally within your line of sight a competence bonus on it's next attack roll made before the start of your next turn equal to half your Class Level. Additionally, any Droid designated as the target of your Network Mind Class Feature is considered to have a Heuristic Processor whenever it is beneficial, even if it does not actually have a Heuristic Processor."
  },
  "maintain_focus": {
    "name": "Maintain Focus",
    "prerequisite": "",
    "benefit": "As a Swift Action once per turn, you can grant all Droid allies within your line of sight the ability to take the Recover Action as two Swift Actions (instead of as three Swift Actions) until the start of your next turn.",
    "description": "As a Swift Action once per turn, you can grant all Droid allies within your line of sight the ability to take the Recover Action as two Swift Actions (instead of as three Swift Actions) until the start of your next turn."
  },
  "overclocked_troops": {
    "name": "Overclocked Troops",
    "prerequisite": "Droid Defense",
    "benefit": "You push the limits of the Droids under your command. You can spend a Swift Action once per turn to allow each of your Networked allies (see the Network Mind Class Feature) to immediately move up to their Speed.",
    "description": "You push the limits of the Droids under your command. You can spend a Swift Action once per turn to allow each of your Networked allies (see the Network Mind Class Feature) to immediately move up to their Speed."
  },
  "reinforce_commands": {
    "name": "Reinforce Commands",
    "prerequisite": "Droid Defense",
    "benefit": "When you use an ability that grants a Droid ally a morale or insight bonus, increase the value of that bonus by 1.",
    "description": "When you use an ability that grants a Droid ally a morale or insight bonus, increase the value of that bonus by 1."
  },
  "direct": {
    "name": "Direct",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can return one spent Force Power to the Force Power Suite of any ally within 6 squares of you and in your line of sight. The Force Power must have been spent by the ally you designate.",
    "description": "As a Standard Action, you can return one spent Force Power to the Force Power Suite of any ally within 6 squares of you and in your line of sight. The Force Power must have been spent by the ally you designate."
  },
  "impart_knowledge": {
    "name": "Impart Knowledge",
    "prerequisite": "Skilled Advisor",
    "benefit": "You can Aid Another on the Knowledge checks of an ally within 6 squares of you as a Reaction for Knowledge skills you are Trained in.",
    "description": "You can Aid Another on the Knowledge checks of an ally within 6 squares of you as a Reaction for Knowledge skills you are Trained in."
  },
  "insight_of_the_force": {
    "name": "Insight of the Force",
    "prerequisite": "",
    "benefit": "You can make a Use the Force check in place of a Knowledge check for any Knowledge skill you are not Trained in. You are considered Trained in that Knowledge skill for the purposes of using this Talent. If you are entitled to a Knowledge check reroll, you can reroll your Use the Force check instead (subject to the same circumstances and limitations).",
    "description": "You can make a Use the Force check in place of a Knowledge check for any Knowledge skill you are not Trained in. You are considered Trained in that Knowledge skill for the purposes of using this Talent. If you are entitled to a Knowledge check reroll, you can reroll your Use the Force check instead (subject to the same circumstances and limitations)."
  },
  "master_advisor": {
    "name": "Master Advisor",
    "prerequisite": "Skilled Advisor",
    "benefit": "When you use the Skilled Advisor Talent, the ally you aid gains one temporary Force Point at the end of their next turn. If the Force Point is not spent before the end of the encounter, it is lost.",
    "description": "When you use the Skilled Advisor Talent, the ally you aid gains one temporary Force Point at the end of their next turn. If the Force Point is not spent before the end of the encounter, it is lost."
  },
  "scholarly_knowledge": {
    "name": "Scholarly Knowledge",
    "prerequisite": "",
    "benefit": "As a Swift Action, you can reroll a Knowledge check and keep the better of the two results. This can be used with any Knowledge skill you are Trained in.",
    "description": "As a Swift Action, you can reroll a Knowledge check and keep the better of the two results. This can be used with any Knowledge skill you are Trained in."
  },
  "healing_boost": {
    "name": "Healing Boost",
    "prerequisite": "Vital Transfer",
    "benefit": "When healing somebody through Vital Transfer, the amount of damage healed increases by 1 point per your Class Level.",
    "description": "When healing somebody through Vital Transfer, the amount of damage healed increases by 1 point per your Class Level."
  },
  "improved_healing_boost": {
    "name": "Improved Healing Boost",
    "prerequisite": "Healing Boost, Vital Transfer",
    "benefit": "When healing somebody through Vital Transfer, the amount of damage healed increases by 2 points per your Class Level.",
    "description": "When healing somebody through Vital Transfer, the amount of damage healed increases by 2 points per your Class Level."
  },
  "soothe": {
    "name": "Soothe",
    "prerequisite": "Vital Transfer",
    "benefit": "When using Vital Transfer to heal somebody, you can move the target +1 step on the Condition Track instead of healing damage. When doing so, you move -1 step on the Condition Track.",
    "description": "When using Vital Transfer to heal somebody, you can move the target +1 step on the Condition Track instead of healing damage. When doing so, you move -1 step on the Condition Track."
  },
  "inspire_loyalty": {
    "name": "Inspire Loyalty",
    "prerequisite": "",
    "benefit": "You gain a single Follower. Choose either the aggressive, defensive, or utility Follower Template for your follower, generating the follower's statistics based on the rules found in the Followers section. This Follower gains one Armor Proficiency Feat of your choice and becomes Trained in the Perception skill. The Follower must meet the prerequisites for the Armor Proficiency Feat you select.",
    "description": "You gain a single Follower. Choose either the aggressive, defensive, or utility Follower Template for your follower, generating the follower's statistics based on the rules found in the Followers section. This Follower gains one Armor Proficiency Feat of your choice and becomes Trained in the Perception skill. The Follower must meet the prerequisites for the Armor Proficiency Feat you select.\n\nYou can select this Talent multiple times. Each time you do, you gain one additional Follower (maximum of 3 Followers)."
  },
  "undying_loyalty": {
    "name": "Undying Loyalty",
    "prerequisite": "Inspire Loyalty",
    "benefit": "Each of your Followers gains the Toughness Feat.",
    "description": "Each of your Followers gains the Toughness Feat."
  },
  "punishing_protection": {
    "name": "Punishing Protection",
    "prerequisite": "Inspire Loyalty, Base Attack Bonus +5",
    "benefit": "As a Reaction to you being damaged by an attack or a Force Power, one of your followers can make an immediate melee or ranged attack against the target that attacked you. Until the beginning of your next turn, any time you are damaged by an attack or Force Power, another one of your followers can attack that attacking target. This ability can be used once per encounter.",
    "description": "As a Reaction to you being damaged by an attack or a Force Power, one of your followers can make an immediate melee or ranged attack against the target that attacked you. Until the beginning of your next turn, any time you are damaged by an attack or Force Power, another one of your followers can attack that attacking target. This ability can be used once per encounter."
  },
  "protector_actions": {
    "name": "Protector Actions",
    "prerequisite": "Inspire Loyalty",
    "benefit": "You and your Followers have learned to work together to great effect, ensuring that you remain safe while allowing them to do their duty. You can use any of the following actions on your turn:",
    "description": "You and your Followers have learned to work together to great effect, ensuring that you remain safe while allowing them to do their duty. You can use any of the following actions on your turn:\n\nBodyguard: As a Standard Action, you can make a melee or ranged attack against a target within Range. Until the end of your next turn, if that target damages you with an attack or Force Power, as a Reaction you can choose to redirect the attack or Force Power to an adjacent follower; the attack or Force Power is resolved against that ally as normal.\nDiversion Attack: As a Standard Action, you can make a melee or ranged attack against a target within Range. If that target attacks you or one of your allies before the beginning of your next turn, you can move one of your Followers up to its speed directly toward that target.\nThe Best Defense: As a Standard Action, you can make a melee or ranged attack against a target within Range. For each of your followers armed with a ranged weapon and having line of sight to the target, that target takes a -1 penalty on attack rolls until the beginning of your next turn."
  },
  "accurate_blow": {
    "name": "Accurate Blow",
    "prerequisite": "",
    "benefit": "Choose one Exotic Weapon (Melee) or one of the following Weapon Groups in which you are proficient: Advanced Melee Weapons, Lightsabers, or Simple Weapons (Melee). When you make a Melee Attack with a Weapon from the chosen group and the attack roll exceeds the target's Reflex Defense by 5 or more, you deal +1 die of damage with the attack.",
    "description": "Choose one Exotic Weapon (Melee) or one of the following Weapon Groups in which you are proficient: Advanced Melee Weapons, Lightsabers, or Simple Weapons (Melee). When you make a Melee Attack with a Weapon from the chosen group and the attack roll exceeds the target's Reflex Defense by 5 or more, you deal +1 die of damage with the attack."
  },
  "close_quarters_fighter": {
    "name": "Close-Quarters Fighter",
    "prerequisite": "",
    "benefit": "Whenever you occupy the same square as your target or are adjacent to your target, you gain a +1 circumstance bonus to your melee attack rolls against that target.",
    "description": "Whenever you occupy the same square as your target or are adjacent to your target, you gain a +1 circumstance bonus to your melee attack rolls against that target."
  },
  "ignore_armor": {
    "name": "Ignore Armor",
    "prerequisite": "",
    "benefit": "Once per encounter, when you make a melee attack, you can ignore any Armor or Equipment bonuses granted by your target's Armor.",
    "description": "Once per encounter, when you make a melee attack, you can ignore any Armor or Equipment bonuses granted by your target's Armor."
  },
  "improved_stunning_strike": {
    "name": "Improved Stunning Strike",
    "prerequisite": "Stunning Strike",
    "benefit": "When you damage an opponent with a melee attack that moves the target down the Condition Track, the target cannot take any Action requiring a Standard Action or a Full-Round Action on its next turn.",
    "description": "When you damage an opponent with a melee attack that moves the target down the Condition Track, the target cannot take any Action requiring a Standard Action or a Full-Round Action on its next turn."
  },
  "whirling_death": {
    "name": "Whirling Death",
    "prerequisite": "Melee Smash, Unrelenting Assault",
    "benefit": "You twirl your Weapon around you in a blur, creating a circle of death around you. Any enemy target that begins its turn adjacent to you takes damage equal to your Strength bonus. You must be wielding a Melee Weapon to be using this Talent.",
    "description": "You twirl your Weapon around you in a blur, creating a circle of death around you. Any enemy target that begins its turn adjacent to you takes damage equal to your Strength bonus. You must be wielding a Melee Weapon to be using this Talent."
  },
  "breach_cover": {
    "name": "Breach Cover",
    "prerequisite": "",
    "benefit": "When you fire or throw a Weapon with a Burst or Splash radius at a target with Cover, you ignore that Cover.",
    "description": "When you fire or throw a Weapon with a Burst or Splash radius at a target with Cover, you ignore that Cover."
  },
  "breaching_explosive": {
    "name": "Breaching Explosive",
    "prerequisite": "",
    "benefit": "You ignore the Damage Threshold of doors and walls when using Mines and fixed (non-Grenade) Explosives.",
    "description": "You ignore the Damage Threshold of doors and walls when using Mines and fixed (non-Grenade) Explosives."
  },
  "droid_expert": {
    "name": "Droid Expert",
    "prerequisite": "Repairs on the Fly",
    "benefit": "When you Repair a Droid, you Repair 1 additional Hit Point for each point by which your Mechanics check beats the base DC of 20.",
    "description": "When you Repair a Droid, you Repair 1 additional Hit Point for each point by which your Mechanics check beats the base DC of 20."
  },
  "prepared_explosive": {
    "name": "Prepared Explosive",
    "prerequisite": "",
    "benefit": "When you use a Mine or other fixed (non-Grenade) Explosive, you can choose to have the Burst radius of the Explosive become Difficult Terrain after the Explosive has detonated. Alternatively, if you plant a Mine or fixed Explosive in an area of Difficult Terrain, you can have the Explosive deal no damage and instead turn the Difficult Terrain into normal terrain.",
    "description": "When you use a Mine or other fixed (non-Grenade) Explosive, you can choose to have the Burst radius of the Explosive become Difficult Terrain after the Explosive has detonated. Alternatively, if you plant a Mine or fixed Explosive in an area of Difficult Terrain, you can have the Explosive deal no damage and instead turn the Difficult Terrain into normal terrain."
  },
  "problem_solver": {
    "name": "Problem Solver",
    "prerequisite": "",
    "benefit": "As a Swift Action once per turn, you can designate a single Vehicle within your line of sight whose Pilot can hear and understand you. That Pilot's Vehicle ignores Difficult Terrain until the start of your next turn, and the Pilot gains a +5 insight bonus on all Pilot checks made to avoid Hazards and Collisions until the start of your next turn.",
    "description": "As a Swift Action once per turn, you can designate a single Vehicle within your line of sight whose Pilot can hear and understand you. That Pilot's Vehicle ignores Difficult Terrain until the start of your next turn, and the Pilot gains a +5 insight bonus on all Pilot checks made to avoid Hazards and Collisions until the start of your next turn."
  },
  "quick_modifications": {
    "name": "Quick Modifications",
    "prerequisite": "Repairs on the Fly, Tech Specialist",
    "benefit": "When you create a Field-Created Weapon, you can choose one Weapon Modification from the Tech Specialist feat to apply to the created Weapon at the time of creation.",
    "description": "When you create a Field-Created Weapon, you can choose one Weapon Modification from the Tech Specialist feat to apply to the created Weapon at the time of creation."
  },
  "repairs_on_the_fly": {
    "name": "Repairs on the Fly",
    "prerequisite": "",
    "benefit": "You can use the Repair application of the Mechanics skill to Repair Droid or Repair Object as a Standard Action. You can gain the benefits of this Talent only once per day per Droid, object, or Vehicle Repaired.",
    "description": "You can use the Repair application of the Mechanics skill to Repair Droid or Repair Object as a Standard Action. You can gain the benefits of this Talent only once per day per Droid, object, or Vehicle Repaired."
  },
  "sabotage_device": {
    "name": "Sabotage Device",
    "prerequisite": "",
    "benefit": "As a Swift Action, you can sabotage any object or weapon that is powered by an Energy Cell or Power Pack so that it becomes a Grenade. The object or Weapon is then considered to be a Frag Grenade in all ways, but it can be turned back into its original form with another Swift Action.",
    "description": "As a Swift Action, you can sabotage any object or weapon that is powered by an Energy Cell or Power Pack so that it becomes a Grenade. The object or Weapon is then considered to be a Frag Grenade in all ways, but it can be turned back into its original form with another Swift Action."
  },
  "tech_savant": {
    "name": "Tech Savant",
    "prerequisite": "Trained in Knowledge (Technology)",
    "benefit": "As a Standard Action, you can increase the speed of one adjacent Droid or Vehicle that you occupy by 1 square (applied to any method of Locomotion) until the end of your next turn. Any Droid or Vehicle can only benefit from this Talent once per round.",
    "description": "As a Standard Action, you can increase the speed of one adjacent Droid or Vehicle that you occupy by 1 square (applied to any method of Locomotion) until the end of your next turn. Any Droid or Vehicle can only benefit from this Talent once per round."
  },
  "vehicular_boost": {
    "name": "Vehicular Boost",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can make a DC 15 Mechanics check to grant one Vehicle you occupy a number of Bonus Hit Points equal to 5 x your Class Level. Damage is subtracted from the Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from multiple sources do not stack.",
    "description": "As a Standard Action, you can make a DC 15 Mechanics check to grant one Vehicle you occupy a number of Bonus Hit Points equal to 5 x your Class Level. Damage is subtracted from the Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from multiple sources do not stack."
  },
  "advantageous_opening": {
    "name": "Advantageous Opening",
    "prerequisite": "",
    "benefit": "When an enemy or ally in your line of sight rolls a Natural 1 on an attack roll, you can make a melee or ranged attack against a single target within Range.",
    "description": "When an enemy or ally in your line of sight rolls a Natural 1 on an attack roll, you can make a melee or ranged attack against a single target within Range."
  },
  "retribution": {
    "name": "Retribution",
    "prerequisite": "",
    "benefit": "When a target moves one of your allies in your line of sight down the Condition Track by any means, you gain a +2 insight bonus to your attack rolls against that target until the end of your next turn.",
    "description": "When a target moves one of your allies in your line of sight down the Condition Track by any means, you gain a +2 insight bonus to your attack rolls against that target until the end of your next turn."
  },
  "thrive_on_chaos": {
    "name": "Thrive on Chaos",
    "prerequisite": "Advantageous Opening",
    "benefit": "When an enemy or ally within 20 squares of you is reduced to 0 Hit Points, you gain Bonus Hit Points equal to 5 + one-half your Character Level. Damage is subtracted from Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points do not stack.",
    "description": "When an enemy or ally within 20 squares of you is reduced to 0 Hit Points, you gain Bonus Hit Points equal to 5 + one-half your Character Level. Damage is subtracted from Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points do not stack."
  },
  "vindication": {
    "name": "Vindication",
    "prerequisite": "Retribution",
    "benefit": "When an enemy you have damaged is reduced to 0 Hit Points or moved to the bottom of the Condition Track, your next attack made before the end of the encounter deals +1 die of damage.",
    "description": "When an enemy you have damaged is reduced to 0 Hit Points or moved to the bottom of the Condition Track, your next attack made before the end of the encounter deals +1 die of damage."
  },
  "reconnaissance_team_leader": {
    "name": "Reconnaissance Team Leader",
    "prerequisite": "",
    "benefit": "You gain a single Follower. Choose either the Aggressive, Defensive, or Utility Follower Template for your Follower, generating the follower's statistics using the Followers rules. This Follower gains the Skill Training (Perception) and Skill Training (Stealth) Feats. Additionally, whenever you use the Stealth skill, all your Followers can also make Stealth checks as a part of the same Action if they are able to.",
    "description": "You gain a single Follower. Choose either the Aggressive, Defensive, or Utility Follower Template for your Follower, generating the follower's statistics using the Followers rules. This Follower gains the Skill Training (Perception) and Skill Training (Stealth) Feats. Additionally, whenever you use the Stealth skill, all your Followers can also make Stealth checks as a part of the same Action if they are able to.\n\nYou can select this Talent up to three times. Each time you do, you gain one additional Follower."
  },
  "close_combat_assault": {
    "name": "Close-Combat Assault",
    "prerequisite": "Reconnaissance Team Leader",
    "benefit": "Each of your Followers gains the Point-Blank Shot Feat.",
    "description": "Each of your Followers gains the Point-Blank Shot Feat."
  },
  "get_into_position": {
    "name": "Get Into Position",
    "prerequisite": "Reconnaissance Team Leader, Base Attack Bonus +5",
    "benefit": "As a Move Action, you can cause one of your Followers to move up to his or her speed +2 squares.",
    "description": "As a Move Action, you can cause one of your Followers to move up to his or her speed +2 squares."
  },
  "reconnaissance_actions": {
    "name": "Reconnaissance Actions",
    "prerequisite": "Reconnaissance Team Leader",
    "benefit": "You and your reconnaissance team have learned to work together as a cohesive unit and have an established set of tactics, which you have practiced to perfection. You can use any of the following actions on your turn:",
    "description": "You and your reconnaissance team have learned to work together as a cohesive unit and have an established set of tactics, which you have practiced to perfection. You can use any of the following actions on your turn:\n\nForward Scouting: As a Standard Action, you can make a melee or ranged attack against a target in Range. For each of your Followers armed with a ranged weapon who has line of sight to your target, you can grant one ally a +2 insight bonus on attack rolls against the target until the end of your next turn. Thus, if you have multiple armed Followers with line of sight to the target, you can grant the +2 bonus to multiple allies.\nGroup Sniping: As a Standard Action, you can make a melee or ranged attack against a target in Range. For each of your Followers armed with a ranged weapon who has line of sight to your target, you and each of your followers gains a +1 circumstance bonus to Stealth checks until the end of your next turn.\nSweep the Area: As a Standard Action, you can make a melee or ranged attack against a target in Range. For each of your Followers armed with a ranged weapon who has line of sight to your target, you and each of your Followers gains a +1 circumstance bonus on Perception checks until the end of your next turn."
  },
  "higher_yield": {
    "name": "Higher Yield",
    "prerequisite": "Trained in Mechanics",
    "benefit": "Once per encounter, you can choose to deal +1 die of damage with a single Grenade, Mine, or other Explosive.",
    "description": "Once per encounter, you can choose to deal +1 die of damage with a single Grenade, Mine, or other Explosive."
  },
  "rapid_reload": {
    "name": "Rapid Reload",
    "prerequisite": "",
    "benefit": "You can retrieve a stored Energy Cell or Power Pack and reload your Weapon as a single Swift Action.",
    "description": "You can retrieve a stored Energy Cell or Power Pack and reload your Weapon as a single Swift Action."
  },
  "shoulder_to_shoulder": {
    "name": "Shoulder to Shoulder",
    "prerequisite": "",
    "benefit": "Whenever you begin your turn adjacent to an ally, you gain a number of bonus Hit Points equal to your Heroic Level. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from various sources do not stack.",
    "description": "Whenever you begin your turn adjacent to an ally, you gain a number of bonus Hit Points equal to your Heroic Level. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from various sources do not stack."
  },
  "strength_in_numbers": {
    "name": "Strength in Numbers",
    "prerequisite": "",
    "benefit": "If you are within 10 squares of an ally, you can add +2 to your Damage Reduction.",
    "description": "If you are within 10 squares of an ally, you can add +2 to your Damage Reduction."
  },
  "weapon_shift": {
    "name": "Weapon Shift",
    "prerequisite": "Gun Club",
    "benefit": "If you use a Ranged Weapon as a Melee Weapon (as with the Gun Club Talent), you gain a +2 bonus to melee attack rolls with that Weapon.",
    "description": "If you use a Ranged Weapon as a Melee Weapon (as with the Gun Club Talent), you gain a +2 bonus to melee attack rolls with that Weapon."
  },
  "commanding_officer": {
    "name": "Commanding Officer",
    "prerequisite": "",
    "benefit": "You gain a single Follower. Choose either the Aggressive, Defensive, or Utility Follower Template for your Follower, generating the follower's statistics using the rules found in the Followers page. This Follower gains one Armor Proficiency Feat of your choice and Weapon Proficiency (Rifles), in addition to those provided by the Follower Templates. The Follower must meet the prerequisites for the Armor Proficiency Feat you select.",
    "description": "You gain a single Follower. Choose either the Aggressive, Defensive, or Utility Follower Template for your Follower, generating the follower's statistics using the rules found in the Followers page. This Follower gains one Armor Proficiency Feat of your choice and Weapon Proficiency (Rifles), in addition to those provided by the Follower Templates. The Follower must meet the prerequisites for the Armor Proficiency Feat you select.\n\nYou can select this Talent multiple times. Each time you do, you gain one additional Follower (maximum of three Followers)."
  },
  "coordinated_tactics": {
    "name": "Coordinated Tactics",
    "prerequisite": "Commanding Officer",
    "benefit": "Each of your Followers gains the Coordinated Attack Feat, provided he or she meets the prerequisite. If your Follower later meets the prerequisite for the Feat, they gain the Feat at that time.",
    "description": "Each of your Followers gains the Coordinated Attack Feat, provided he or she meets the prerequisite. If your Follower later meets the prerequisite for the Feat, they gain the Feat at that time."
  },
  "fire_at_will": {
    "name": "Fire at Will",
    "prerequisite": "Commanding Officer, Base Attack Bonus +5",
    "benefit": "As a Full-Round Action, you and one of your Followers can make a ranged attack against one target (each) in line of sight. You each take a -5 penalty to your attack rolls.",
    "description": "As a Full-Round Action, you and one of your Followers can make a ranged attack against one target (each) in line of sight. You each take a -5 penalty to your attack rolls."
  },
  "squad_actions": {
    "name": "Squad Actions",
    "prerequisite": "Commanding Officer",
    "benefit": "You and your squad have learned to work together as a team, and have an established set of tactics that you have practiced to perfection. You can use any of the following Actions on your turn.",
    "description": "You and your squad have learned to work together as a team, and have an established set of tactics that you have practiced to perfection. You can use any of the following Actions on your turn.\n\nAutofire Barrage: As a Standard Action, you can make an Autofire attack against legal target spaces. For each of your Followers who is armed with a ranged Weapon set on Autofire and has a line of sight to the area targeted by your Autofire, you can designate one additional square as targeted by your Autofire (that square must be adjacent to your original target area).\nOpen Fire: As a Standard Action, make a ranged attack against a single target. For each of your Followers who is armed with a ranged Weapon and has a line of sight to the target, add +2 to your damage roll on a successful hit.\nPainted Target: As a Standard Action, make a ranged attack against a single target. You gain a competence bonus on your attack roll equal to the number of your Followers who are armed with a ranged Weapon and have line of sight to the target. Thus, if you have three armed Followers with line of sight to the target, you gain a +3 competence bonus on your attack roll."
  },
  "advanced_intel": {
    "name": "Advanced Intel",
    "prerequisite": "Spotter",
    "benefit": "If you are not Surprised at the beginning of combat, you can use the Spotter talent as a Free Action on your first turn, including during the Surprise Round.",
    "description": "If you are not Surprised at the beginning of combat, you can use the Spotter talent as a Free Action on your first turn, including during the Surprise Round."
  },
  "hidden_eyes": {
    "name": "Hidden Eyes",
    "prerequisite": "",
    "benefit": "If you have Concealment from a target, you gain a +5 circumstance bonus on all Perception checks made against that target.",
    "description": "If you have Concealment from a target, you gain a +5 circumstance bonus on all Perception checks made against that target."
  },
  "hunt_the_hunter": {
    "name": "Hunt the Hunter",
    "prerequisite": "",
    "benefit": "When you use a Standard Action to actively look for hidden enemies, you can make a single melee or ranged attack against any one enemy you notice with your Perception check.",
    "description": "When you use a Standard Action to actively look for hidden enemies, you can make a single melee or ranged attack against any one enemy you notice with your Perception check."
  },
  "seek_and_destroy": {
    "name": "Seek and Destroy",
    "prerequisite": "Hidden Eyes",
    "benefit": "If you make a Charge attack against a target that is unaware of you, that target cannot make a Perception check to notice you until after the attack is resolved, even if you move away from Cover or Concealment.",
    "description": "If you make a Charge attack against a target that is unaware of you, that target cannot make a Perception check to notice you until after the attack is resolved, even if you move away from Cover or Concealment."
  },
  "spotter": {
    "name": "Spotter",
    "prerequisite": "",
    "benefit": "As a Move Action, you can make a Perception check with a DC equal to 10 + the CL of a single target enemy in your line of sight. If you succeed on the check, you and all your allies that can hear and understand you gain a +1 insight bonus on attack rolls against that target until the end of your next turn.",
    "description": "As a Move Action, you can make a Perception check with a DC equal to 10 + the CL of a single target enemy in your line of sight. If you succeed on the check, you and all your allies that can hear and understand you gain a +1 insight bonus on attack rolls against that target until the end of your next turn."
  },
  "comrades_in_arms": {
    "name": "Comrades in Arms",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "whenever_you_are_within_3_squares_of_an_ally_you_gain_a_1_circumstance_bonus_on_all_melee_and_ranged_attack_rolls": {
    "name": "Whenever you are within 3 squares of an ally, you gain a +1 circumstance bonus on all melee and ranged attack rolls.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "focused_targeting": {
    "name": "Focused Targeting",
    "prerequisite": "Comrades in Arms",
    "benefit": "When you damage a target with a melee or ranged attack, all allies within 3 squares gain a +2 bonus on damage rolls against that target until the beginning of your next turn.",
    "description": "When you damage a target with a melee or ranged attack, all allies within 3 squares gain a +2 bonus on damage rolls against that target until the beginning of your next turn."
  },
  "phalanx": {
    "name": "Phalanx",
    "prerequisite": "Watch Your Back",
    "benefit": "",
    "description": ""
  },
  "whenever_you_provide_soft_cover_to_an_ally_within_3_squares_you_are_considered_to_be_providing_improved_cover": {
    "name": "Whenever you provide Soft Cover to an ally within 3 squares, you are considered to be providing Improved Cover.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "stick_together": {
    "name": "Stick Together",
    "prerequisite": "Comrades in Arms",
    "benefit": "You can spend a Move Action to activate this Talent. Until the beginning of your next turn, if an ally Moves you can immediately move up to your speed, provided you end your movement within 3 squares of that ally.",
    "description": "You can spend a Move Action to activate this Talent. Until the beginning of your next turn, if an ally Moves you can immediately move up to your speed, provided you end your movement within 3 squares of that ally."
  },
  "watch_your_back": {
    "name": "Watch Your Back",
    "prerequisite": "",
    "benefit": "If you are adjacent to at least one ally, enemies gain no benefit from Flanking you or any adjacent allies.",
    "description": "If you are adjacent to at least one ally, enemies gain no benefit from Flanking you or any adjacent allies."
  },
  "enhanced_vision": {
    "name": "Enhanced Vision",
    "prerequisite": "",
    "benefit": "When actively looking for hidden enemies, you can make a Perception check as a Swift Action instead of a Standard Action.",
    "description": "When actively looking for hidden enemies, you can make a Perception check as a Swift Action instead of a Standard Action."
  },
  "impenetrable_cover": {
    "name": "Impenetrable Cover",
    "prerequisite": "Maximize Cover",
    "benefit": "Whenever you have Cover against a target, you gain Damage Reduction equal to your Class Level against that target until the start of your next turn, provided you still have Cover from the target at the time the attack is made.",
    "description": "Whenever you have Cover against a target, you gain Damage Reduction equal to your Class Level against that target until the start of your next turn, provided you still have Cover from the target at the time the attack is made."
  },
  "invisible_attacker": {
    "name": "Invisible Attacker",
    "prerequisite": "Maximize Cover",
    "benefit": "If your target is unaware of you, your ranged attacks deal +1 die of damage against that target.",
    "description": "If your target is unaware of you, your ranged attacks deal +1 die of damage against that target."
  },
  "mark_the_target": {
    "name": "Mark the Target",
    "prerequisite": "",
    "benefit": "Whenever you damage a target with a non-Area Attack ranged attack, you may designate one ally within your line of sight as a Swift Action. Your target is considered Flat-Footed against that ally's first attack made before the start of your next turn.",
    "description": "Whenever you damage a target with a non-Area Attack ranged attack, you may designate one ally within your line of sight as a Swift Action. Your target is considered Flat-Footed against that ally's first attack made before the start of your next turn."
  },
  "maximize_cover": {
    "name": "Maximize Cover",
    "prerequisite": "",
    "benefit": "When an opponent uses the Aim Action to negate your Cover, you can make a Stealth check opposed by the attacker's Initiative check. If successful, you retain your Cover bonus.",
    "description": "When an opponent uses the Aim Action to negate your Cover, you can make a Stealth check opposed by the attacker's Initiative check. If successful, you retain your Cover bonus."
  },
  "shellshock": {
    "name": "Shellshock",
    "prerequisite": "Soften the Target",
    "benefit": "Whenever you damage a target that is unaware of you with an Area Attack, that target is considered Flat-Footed until the start of your next turn.",
    "description": "Whenever you damage a target that is unaware of you with an Area Attack, that target is considered Flat-Footed until the start of your next turn."
  },
  "soften_the_target": {
    "name": "Soften the Target",
    "prerequisite": "",
    "benefit": "Whenever you damage a target with a ranged attack, you may designate one ally within your line of sight as a Swift Action. The ally you designate ignores the target's Damage Reduction and Shield Rating (if any) until the start of your next turn.",
    "description": "Whenever you damage a target with a ranged attack, you may designate one ally within your line of sight as a Swift Action. The ally you designate ignores the target's Damage Reduction and Shield Rating (if any) until the start of your next turn."
  },
  "triangulate": {
    "name": "Triangulate",
    "prerequisite": "Enhanced Vision",
    "benefit": "If you and at least one other ally have line of sight to and are aware of a target, you and all allies that can hear and understand you can reroll one ranged attack roll against that target, accepting the second result even if it is worse. You and your allies can only gain the benefits of this Talent once per encounter.",
    "description": "If you and at least one other ally have line of sight to and are aware of a target, you and all allies that can hear and understand you can reroll one ranged attack roll against that target, accepting the second result even if it is worse. You and your allies can only gain the benefits of this Talent once per encounter."
  },
  "gang_leader": {
    "name": "Gang Leader",
    "prerequisite": "",
    "benefit": "Once per encounter, when you make a Persuasion check to Intimidate, you gain a +1 bonus on the check for every ally within 6 squares of you and in the target's line of sight (maximum +5 bonus).",
    "description": "Once per encounter, when you make a Persuasion check to Intimidate, you gain a +1 bonus on the check for every ally within 6 squares of you and in the target's line of sight (maximum +5 bonus)."
  },
  "melee_assault": {
    "name": "Melee Assault",
    "prerequisite": "",
    "benefit": "When you make a melee attack against a target that has one or more of your allies adjacent to it, compare the result to the target's Fortitude Defense as well as its Reflex Defense. If the attack hits both Defenses, the attack deals +1 die of damage and the target is knocked Prone.",
    "description": "When you make a melee attack against a target that has one or more of your allies adjacent to it, compare the result to the target's Fortitude Defense as well as its Reflex Defense. If the attack hits both Defenses, the attack deals +1 die of damage and the target is knocked Prone."
  },
  "melee_brute": {
    "name": "Melee Brute",
    "prerequisite": "",
    "benefit": "When you make a melee attack against a target that has one or more of your allies adjacent to it, compare the result to the target's Fortitude Defense as well as its Reflex Defense. If the attack hits both Defenses, the target's Speed is reduced by 2 squares and it takes a -2 penalty to its Reflex Defense until the end of your next turn.",
    "description": "When you make a melee attack against a target that has one or more of your allies adjacent to it, compare the result to the target's Fortitude Defense as well as its Reflex Defense. If the attack hits both Defenses, the target's Speed is reduced by 2 squares and it takes a -2 penalty to its Reflex Defense until the end of your next turn."
  },
  "melee_opportunist": {
    "name": "Melee Opportunist",
    "prerequisite": "",
    "benefit": "Once per encounter, when an ally makes a successful melee attack against a target adjacent to you, you can make a melee attack against that target as a Reaction, with a +2 bonus on the attack roll.",
    "description": "Once per encounter, when an ally makes a successful melee attack against a target adjacent to you, you can make a melee attack against that target as a Reaction, with a +2 bonus on the attack roll."
  },
  "squad_brutality": {
    "name": "Squad Brutality",
    "prerequisite": "",
    "benefit": "When you succeed on a melee attack against a target that has one or more of your allies adjacent to it, you may reroll your damage roll, keeping the better of the two results.",
    "description": "When you succeed on a melee attack against a target that has one or more of your allies adjacent to it, you may reroll your damage roll, keeping the better of the two results."
  },
  "squad_superiority": {
    "name": "Squad Superiority",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "blowback": {
    "name": "Blowback",
    "prerequisite": "",
    "benefit": "When you make an attack with a Rifle that deals damage in excess of your target's Damage Threshold, you can choose to push the target 1 square away from you.",
    "description": "When you make an attack with a Rifle that deals damage in excess of your target's Damage Threshold, you can choose to push the target 1 square away from you."
  },
  "close_contact": {
    "name": "Close Contact",
    "prerequisite": "",
    "benefit": "The Point-Blank Range of any Rifle or Carbine you use is increased by 5 squares. Short Range for the Weapon begins 5 squares later, but still ends at the same distance. You can take this Talent up to two times; each time you take this Talent, you increase the Point-Blank Range of any Rifle or Carbine you use by an additional 5 squares, up to a maximum of 10 squares.",
    "description": "The Point-Blank Range of any Rifle or Carbine you use is increased by 5 squares. Short Range for the Weapon begins 5 squares later, but still ends at the same distance. You can take this Talent up to two times; each time you take this Talent, you increase the Point-Blank Range of any Rifle or Carbine you use by an additional 5 squares, up to a maximum of 10 squares."
  },
  "old_faithful": {
    "name": "Old Faithful",
    "prerequisite": "",
    "benefit": "The Trusty Sidearm Class Feature of the Gunslinger Prestige Class also applies to any Rifle or Carbine that you use.",
    "description": "The Trusty Sidearm Class Feature of the Gunslinger Prestige Class also applies to any Rifle or Carbine that you use."
  },
  "opportunity_fire": {
    "name": "Opportunity Fire",
    "prerequisite": "",
    "benefit": "You gain a +2 bonus on Attacks of Opportunity made with Rifles.",
    "description": "You gain a +2 bonus on Attacks of Opportunity made with Rifles."
  },
  "rifle_master": {
    "name": "Rifle Master",
    "prerequisite": "",
    "benefit": "You treat all Rifles as though they were Accurate Weapons, taking no penalty when firing at targets at Short Range.",
    "description": "You treat all Rifles as though they were Accurate Weapons, taking no penalty when firing at targets at Short Range."
  },
  "shoot_from_the_hip": {
    "name": "Shoot from the Hip",
    "prerequisite": "",
    "benefit": "You can always use a Rifle to make Attacks of Opportunity.",
    "description": "You can always use a Rifle to make Attacks of Opportunity."
  },
  "snap_shot": {
    "name": "Snap Shot",
    "prerequisite": "",
    "benefit": "You do not provoke Attacks of Opportunity while using the Aim Action with a Rifle or Carbine with its Retractable Stock extended.",
    "description": "You do not provoke Attacks of Opportunity while using the Aim Action with a Rifle or Carbine with its Retractable Stock extended."
  },
  "force_blank": {
    "name": "Force Blank",
    "prerequisite": "",
    "benefit": "You are especially hard to detect using The Force. Attempts to detect you using the Sense Surroundings aspect of the Use the Force skill suffer a -10 penalty.",
    "description": "You are especially hard to detect using The Force. Attempts to detect you using the Sense Surroundings aspect of the Use the Force skill suffer a -10 penalty."
  },
  "lightsaber_evasion": {
    "name": "Lightsaber Evasion",
    "prerequisite": "",
    "benefit": "Whenever an enemy misses you with a melee attack with a Lightsaber, you may move up to 2 squares in any direction. This movement does not provoke Attacks of Opportunity.",
    "description": "Whenever an enemy misses you with a melee attack with a Lightsaber, you may move up to 2 squares in any direction. This movement does not provoke Attacks of Opportunity."
  },
  "precision_fire": {
    "name": "Precision Fire",
    "prerequisite": "",
    "benefit": "The Jedi are skilled at blocking and deflecting ranged attacks with their Lightsabers, and you are able to compensate for this to some degree by taking careful shots. Whenever you Aim before making a ranged attack, you increase the difficulty of Deflect attempts to negate your attack by +5.",
    "description": "The Jedi are skilled at blocking and deflecting ranged attacks with their Lightsabers, and you are able to compensate for this to some degree by taking careful shots. Whenever you Aim before making a ranged attack, you increase the difficulty of Deflect attempts to negate your attack by +5."
  },
  "steel_mind": {
    "name": "Steel Mind",
    "prerequisite": "",
    "benefit": "If you resist the effects of a [Mind-Affecting] Force Power, the user of that Force Power cannot attempt to use the same Force Power against you for the remainder of the encounter.",
    "description": "If you resist the effects of a [Mind-Affecting] Force Power, the user of that Force Power cannot attempt to use the same Force Power against you for the remainder of the encounter."
  },
  "strong_willed": {
    "name": "Strong-Willed",
    "prerequisite": "",
    "benefit": "You are trained to resist Jedi mind tricks. You add your Class Level to your Will Defense against Use the Force checks.",
    "description": "You are trained to resist Jedi mind tricks. You add your Class Level to your Will Defense against Use the Force checks."
  },
  "telekinetic_resistance": {
    "name": "Telekinetic Resistance",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "whenever_you_are_targeted_by_a_force_power_that_moves_you_you_reduce_the_distance_you_are_moved_by_half": {
    "name": "Whenever you are targeted by a Force Power that moves you, you reduce the distance you are moved by half.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "disciplined_trickery": {
    "name": "Disciplined Trickery",
    "prerequisite": "",
    "benefit": "Once per turn as a Reaction, you allow one ally within 12 squares of you and within your line of sight to reroll one Deception or Stealth check, but the ally must accept the result of the reroll, even if it is worse.",
    "description": "Once per turn as a Reaction, you allow one ally within 12 squares of you and within your line of sight to reroll one Deception or Stealth check, but the ally must accept the result of the reroll, even if it is worse."
  },
  "group_perception": {
    "name": "Group Perception",
    "prerequisite": "",
    "benefit": "Whenever you roll a Perception check, all allies within 6 squares of you can do so as well, taking the highest result rolled by you or an ally.",
    "description": "Whenever you roll a Perception check, all allies within 6 squares of you can do so as well, taking the highest result rolled by you or an ally."
  },
  "hasty_withdrawal": {
    "name": "Hasty Withdrawal",
    "prerequisite": "",
    "benefit": "As a Swift Action once per turn, you target a number of allies equal to your Charisma bonus (minimum 1). Each targeted ally must be within 12 squares of you and in your line of sight. Each ally you target can take the Withdraw Action immediately as a Free Action. The normal rules for Withdrawing otherwise apply.",
    "description": "As a Swift Action once per turn, you target a number of allies equal to your Charisma bonus (minimum 1). Each targeted ally must be within 12 squares of you and in your line of sight. Each ally you target can take the Withdraw Action immediately as a Free Action. The normal rules for Withdrawing otherwise apply."
  },
  "stalwart_subordinates": {
    "name": "Stalwart Subordinates",
    "prerequisite": "",
    "benefit": "When any ally within 12 squares of you and in your line of sight is targeted by a Skill Check against its Will Defense, the source of that Skill Check (whether a Hazard, a creature, a Droid, or whatever) must roll the Skill Check twice, and take the lowest result.",
    "description": "When any ally within 12 squares of you and in your line of sight is targeted by a Skill Check against its Will Defense, the source of that Skill Check (whether a Hazard, a creature, a Droid, or whatever) must roll the Skill Check twice, and take the lowest result."
  },
  "stay_in_the_fight": {
    "name": "Stay in the Fight",
    "prerequisite": "Stalwart Subordinates",
    "benefit": "As a Swift Action, you remove one Mind-Affecting or Fear effect currently affecting an ally within 12 squares of you and in your line of sight. When you do so, you also grant the target a number of bonus Hit Points equal to 10 + your Class Level.",
    "description": "As a Swift Action, you remove one Mind-Affecting or Fear effect currently affecting an ally within 12 squares of you and in your line of sight. When you do so, you also grant the target a number of bonus Hit Points equal to 10 + your Class Level."
  },
  "stealthy_withdrawal": {
    "name": "Stealthy Withdrawal",
    "prerequisite": "Hasty Withdrawal",
    "benefit": "When an ally Withdraws as a result of your Hasty Withdrawal Talent and ends its Withdraw Action with Cover or Concealment from any enemy target, that ally can make an immediate Stealth check to Sneak as a Free Action.",
    "description": "When an ally Withdraws as a result of your Hasty Withdrawal Talent and ends its Withdraw Action with Cover or Concealment from any enemy target, that ally can make an immediate Stealth check to Sneak as a Free Action."
  },
  "adrenaline_implant": {
    "name": "Adrenaline Implant",
    "prerequisite": "",
    "benefit": "Once per encounter as a Standard Action, you can give one adjacent living creature an Adrenaline Implant. The target must be willing to receive this Implant, which grants the target 10 bonus Hit Points at the start of each of it's turns. These bonus Hit Points do not accumulate. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from different sources do not stack.",
    "description": "Once per encounter as a Standard Action, you can give one adjacent living creature an Adrenaline Implant. The target must be willing to receive this Implant, which grants the target 10 bonus Hit Points at the start of each of it's turns. These bonus Hit Points do not accumulate. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from different sources do not stack."
  },
  "precision_implant": {
    "name": "Precision Implant",
    "prerequisite": "",
    "benefit": "Once per encounter as a Standard Action, you can give one adjacent living creature a Precision Implant. The target must be willing to receive this Implant, which grants the target a +1 Equipment bonus on attack rolls until the end of the encounter.",
    "description": "Once per encounter as a Standard Action, you can give one adjacent living creature a Precision Implant. The target must be willing to receive this Implant, which grants the target a +1 Equipment bonus on attack rolls until the end of the encounter."
  },
  "resilience_implant": {
    "name": "Resilience Implant",
    "prerequisite": "",
    "benefit": "Once per encounter as a Standard Action, you can give one adjacent living creature a Resilience Implant. The target must be willing to receive this Implant, which grants the target a +5 Equipment bonus to it's Damage Threshold until the end of the encounter.",
    "description": "Once per encounter as a Standard Action, you can give one adjacent living creature a Resilience Implant. The target must be willing to receive this Implant, which grants the target a +5 Equipment bonus to it's Damage Threshold until the end of the encounter."
  },
  "speed_implant": {
    "name": "Speed Implant",
    "prerequisite": "",
    "benefit": "Once per encounter as a Standard Action, you can give one adjacent living creature a Speed Implant. The target must be willing to receive this Implant, which increases the target's base Speed by 2 until the end of the encounter.",
    "description": "Once per encounter as a Standard Action, you can give one adjacent living creature a Speed Implant. The target must be willing to receive this Implant, which increases the target's base Speed by 2 until the end of the encounter."
  },
  "strength_implant": {
    "name": "Strength Implant",
    "prerequisite": "",
    "benefit": "Once per encounter as a Standard Action, you can give one adjacent living creature a Strength Implant. The target must be willing to receive this Implant, which allows the target to deal +1 die of damage whenever it hits with a melee attack until the end of the encounter.",
    "description": "Once per encounter as a Standard Action, you can give one adjacent living creature a Strength Implant. The target must be willing to receive this Implant, which allows the target to deal +1 die of damage whenever it hits with a melee attack until the end of the encounter."
  },
  "cover_your_tracks": {
    "name": "Cover Your Tracks",
    "prerequisite": "",
    "benefit": "You are adept at living beneath society's radar. Anyone who attempts to locate you using the Gather Information skill suffers a -5 penalty on their Gather Information checks.",
    "description": "You are adept at living beneath society's radar. Anyone who attempts to locate you using the Gather Information skill suffers a -5 penalty on their Gather Information checks."
  },
  "difficult_to_sense": {
    "name": "Difficult to Sense",
    "prerequisite": "",
    "benefit": "You are skilled at concealing your presence from other Force-users. You may reroll any opposed Use the Force check made to conceal your presence from someone who attempts to sense other Force-users, keeping the better of the two results.",
    "description": "You are skilled at concealing your presence from other Force-users. You may reroll any opposed Use the Force check made to conceal your presence from someone who attempts to sense other Force-users, keeping the better of the two results."
  },
  "force_veil": {
    "name": "Force Veil",
    "prerequisite": "Difficult to Sense",
    "benefit": "Your ability to conceal yourself from other Force-users allows you to reduce the radius within which you can be detected to 10 kilometers (instead of 100 kilometers).",
    "description": "Your ability to conceal yourself from other Force-users allows you to reduce the radius within which you can be detected to 10 kilometers (instead of 100 kilometers)."
  },
  "jedi_network": {
    "name": "Jedi Network",
    "prerequisite": "",
    "benefit": "You have access to a network of Jedi sympathizers. While in a civilized area, you can call upon this network of allies once per game session for one of the following purposes:",
    "description": "You have access to a network of Jedi sympathizers. While in a civilized area, you can call upon this network of allies once per game session for one of the following purposes:\n\nAcquire Equipment or Funds: You can use your contacts to obtain material that might otherwise be Licensed, Restricted, Military, or Illegal, provided the total value of the Equipment does not exceed your Jedi Knight Level x 500 credits. Alternatively, you can obtain a number of credits from your contacts equal to this amount to spend as you see fit.\nObtain Information: Your contacts provide you with information, automatically succeeding on a Gather Information check (and covering the credit cost of the check) provided the DC does not exceed 20.\nReceive Medical Attention: Your contacts provide you and up to three of your allies with medical attention as dispensed by a skilled physician or healer. The length of the treatment cannot exceed 24 hours, but is otherwise free of charge and completely private.\nSecure Safe House: One of your contacts provides a safe redoubt for you and up to three of your allies, for a number of days equal to your Jedi Knight Class Level. While in hiding, you have no contact with anyone other than the individual who is hiding you. Once the allotted time is up, you must leave the Safe House or risk discovery. For each day you remain in hiding past this deadline, the Gamemaster should roll 1d20. On a result of 15 or higher, your Safe House is discovered, and your contact's complicity in keeping you hidden is exposed."
  },
  "armored_augmentation_i": {
    "name": "Armored Augmentation I",
    "prerequisite": "Armor Proficiency with Armor",
    "benefit": "Once per encounter, you may spend a Force Point as a Swift Action to augment your own ability to withstand damage by imbuing the Armor you are wearing with The Force. This allows you to add your Armor bonus to your Reflex Defense to your Damage Threshold until the end of the encounter.",
    "description": "Once per encounter, you may spend a Force Point as a Swift Action to augment your own ability to withstand damage by imbuing the Armor you are wearing with The Force. This allows you to add your Armor bonus to your Reflex Defense to your Damage Threshold until the end of the encounter."
  },
  "armored_augmentation_ii": {
    "name": "Armored Augmentation II",
    "prerequisite": "Armor Proficiency with Armor, Armored Augmentation I",
    "benefit": "Whenever you use the Armored Augmentation I Talent, you also gain Damage Reduction equal to 2 x your Armor's Equipment bonus to your Fortitude Defense.",
    "description": "Whenever you use the Armored Augmentation I Talent, you also gain Damage Reduction equal to 2 x your Armor's Equipment bonus to your Fortitude Defense."
  },
  "cortosis_defense": {
    "name": "Cortosis Defense",
    "prerequisite": "",
    "benefit": "You are adept at using a Cortosis Gauntlet to parry Lightsaber attacks. You gain a +2 bonus when making an opposed Unarmed melee attack roll against a Lightsaber attack.",
    "description": "You are adept at using a Cortosis Gauntlet to parry Lightsaber attacks. You gain a +2 bonus when making an opposed Unarmed melee attack roll against a Lightsaber attack."
  },
  "cortosis_retaliation": {
    "name": "Cortosis Retaliation",
    "prerequisite": "Cortosis Defense",
    "benefit": "Whenever you successfully use a Cortosis Gauntlet to parry an attack made with a Lightsaber, you may make an immediate Attack of Opportunity against the attacker.",
    "description": "Whenever you successfully use a Cortosis Gauntlet to parry an attack made with a Lightsaber, you may make an immediate Attack of Opportunity against the attacker."
  },
  "knights_morale": {
    "name": "Knight's Morale",
    "prerequisite": "",
    "benefit": "When an ally within 12 squares of you and within your line of sight hits with a Lightsaber attack, you gain a +1 morale bonus to all your Defenses until the end of your next turn.",
    "description": "When an ally within 12 squares of you and within your line of sight hits with a Lightsaber attack, you gain a +1 morale bonus to all your Defenses until the end of your next turn."
  },
  "oath_of_duty": {
    "name": "Oath of Duty",
    "prerequisite": "",
    "benefit": "When an ally within 12 squares of you and within your line of sight hits with a Lightsaber attack, you gain bonus Hit Points equal to 3 x your Class Level until the end of your next turn. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from different sources do not stack.",
    "description": "When an ally within 12 squares of you and within your line of sight hits with a Lightsaber attack, you gain bonus Hit Points equal to 3 x your Class Level until the end of your next turn. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from different sources do not stack."
  },
  "praetoria_ishu": {
    "name": "Praetoria Ishu",
    "prerequisite": "Block, Deflect",
    "benefit": "You can use the Block Talent to negate a melee attack made against an adjacent ally. In addition, you can use the Deflect Talent to negate a ranged attack made against an adjacent ally.",
    "description": "You can use the Block Talent to negate a melee attack made against an adjacent ally. In addition, you can use the Deflect Talent to negate a ranged attack made against an adjacent ally."
  },
  "praetoria_vonil": {
    "name": "Praetoria Vonil",
    "prerequisite": "Weapon Focus (Lightsabers)",
    "benefit": "You have mastered the offensive Lightsaber style favored by The Imperial Knights. When wielding a single Lightsaber with two hands, you deal +1 die of damage if you move at least 1 square on your turn before making the attack.",
    "description": "You have mastered the offensive Lightsaber style favored by The Imperial Knights. When wielding a single Lightsaber with two hands, you deal +1 die of damage if you move at least 1 square on your turn before making the attack."
  },
  "strength_of_the_empire": {
    "name": "Strength of the Empire",
    "prerequisite": "Ward",
    "benefit": "When an ally within 12 squares of you and in your line of sight hits with a Lightsaber attack, you deal +1 die of damage with the next Lightsaber attack you make before the end of your next turn.",
    "description": "When an ally within 12 squares of you and in your line of sight hits with a Lightsaber attack, you deal +1 die of damage with the next Lightsaber attack you make before the end of your next turn.\n\nrmored Guard\n\nWhen you use the Ward Talent, your ally's Cover bonus to their Reflex Defense is increased by one-half the Armor bonus of any Natural Armor you possess as well as any Armor you are wearing."
  },
  "bodyguards_sacrifice": {
    "name": "Bodyguard's Sacrifice",
    "prerequisite": "",
    "benefit": "As a Reaction, you can interfere with any successful attack against an adjacent ally. You can choose to take any or all of that attack's damage, and the remainder is dealt to the target as normal. Once you use this Talent, you may not use it again until the end of your next turn.",
    "description": "As a Reaction, you can interfere with any successful attack against an adjacent ally. You can choose to take any or all of that attack's damage, and the remainder is dealt to the target as normal. Once you use this Talent, you may not use it again until the end of your next turn."
  },
  "guards_endurance": {
    "name": "Guard's Endurance",
    "prerequisite": "Ward",
    "benefit": "Whenever you begin your turn adjacent to the target of your Ward Talent, you gain Bonus Hit Points equal to your Character Level until the start of your next turn. Damage is subtracted from the Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from different sources do not stack.",
    "description": "Whenever you begin your turn adjacent to the target of your Ward Talent, you gain Bonus Hit Points equal to your Character Level until the start of your next turn. Damage is subtracted from the Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from different sources do not stack."
  },
  "lifesaver": {
    "name": "Lifesaver",
    "prerequisite": "Bodyguard's Sacrifice",
    "benefit": "Once per encounter as a Reaction, when an ally takes damage that equals or exceeds its Damage Threshold or reduces it to 0 Hit Points, you can move up to your speed provided you end your movement adjacent to that ally. This movement provokes Attacks of Opportunity as normal, you take all of the damage that triggered this Talent's use, and your ally takes no damage.",
    "description": "Once per encounter as a Reaction, when an ally takes damage that equals or exceeds its Damage Threshold or reduces it to 0 Hit Points, you can move up to your speed provided you end your movement adjacent to that ally. This movement provokes Attacks of Opportunity as normal, you take all of the damage that triggered this Talent's use, and your ally takes no damage."
  },
  "roll_with_it": {
    "name": "Roll With It",
    "prerequisite": "Bodyguard's Sacrifice, Take the Hit",
    "benefit": "Whenever you take damage on behalf of an ally through the use of a Talent (including Harm's Way), you gain Damage Reduction equal to your Class Level until the end of your next turn.",
    "description": "Whenever you take damage on behalf of an ally through the use of a Talent (including Harm's Way), you gain Damage Reduction equal to your Class Level until the end of your next turn."
  },
  "take_the_hit": {
    "name": "Take the Hit",
    "prerequisite": "Bodyguard's Sacrifice",
    "benefit": "Whenever you take damage on behalf of an ally through the use of a Talent (including Harm's Way), your Damage Threshold is increased by 5 points.",
    "description": "Whenever you take damage on behalf of an ally through the use of a Talent (including Harm's Way), your Damage Threshold is increased by 5 points."
  },
  "ward": {
    "name": "Ward",
    "prerequisite": "",
    "benefit": "As a Swift Action, designate one adjacent ally. Until the end of your next turn, as long as that ally remains adjacent to you, you are considered to be providing that ally with Soft Cover against all attacks.",
    "description": "As a Swift Action, designate one adjacent ally. Until the end of your next turn, as long as that ally remains adjacent to you, you are considered to be providing that ally with Soft Cover against all attacks.\n\nYou cannot be designated as the target of this Talent (such as, when it is used by an ally) if you have used this Talent since the start of your last turn, and you cannot use this Talent if you are currently designated as another ally's Ward."
  },
  "cast_suspicion": {
    "name": "Cast Suspicion",
    "prerequisite": "",
    "benefit": "As a Swift Action, you can select one enemy within your line of sight. That enemy loses all morale and insight bonuses on attack rolls and cannot be aided (using the Aid Another Action) by its allies until the end of your next turn.",
    "description": "As a Swift Action, you can select one enemy within your line of sight. That enemy loses all morale and insight bonuses on attack rolls and cannot be aided (using the Aid Another Action) by its allies until the end of your next turn."
  },
  "distress_to_discord": {
    "name": "Distress to Discord",
    "prerequisite": "",
    "benefit": "You encourage your allies to sow discord among your enemies by fighting with renewed vigor. Whenever an ally within your line of sight takes its Second Wind, all enemies within 2 squares of that ally lose their Dexterity bonuses to their Reflex Defense until the end of your next turn.",
    "description": "You encourage your allies to sow discord among your enemies by fighting with renewed vigor. Whenever an ally within your line of sight takes its Second Wind, all enemies within 2 squares of that ally lose their Dexterity bonuses to their Reflex Defense until the end of your next turn."
  },
  "friend_or_foe": {
    "name": "Friend or Foe",
    "prerequisite": "Cast Suspicion",
    "benefit": "Whenever an ally within your line of sight is missed by a ranged attack, you can (as a Reaction, once per turn) designate one enemy adjacent to that ally. Compare the attack roll of the missed attack to the Reflex Defense of that enemy; if the attack would hit, the attack targets that enemy and is resolved as normal.",
    "description": "Whenever an ally within your line of sight is missed by a ranged attack, you can (as a Reaction, once per turn) designate one enemy adjacent to that ally. Compare the attack roll of the missed attack to the Reflex Defense of that enemy; if the attack would hit, the attack targets that enemy and is resolved as normal."
  },
  "stolen_advantage": {
    "name": "Stolen Advantage",
    "prerequisite": "Cast Suspicion",
    "benefit": "Whenever an enemy within your line of sight uses the Aid Another Action to grant one of its allies a bonus, you can (as a Reaction) designate one ally within your line of sight. The enemy automatically fails to aid its ally, and the ally you designate gains a +2 bonus on its next attack roll made before the end of your next turn.",
    "description": "Whenever an enemy within your line of sight uses the Aid Another Action to grant one of its allies a bonus, you can (as a Reaction) designate one ally within your line of sight. The enemy automatically fails to aid its ally, and the ally you designate gains a +2 bonus on its next attack roll made before the end of your next turn."
  },
  "true_betrayal": {
    "name": "True Betrayal",
    "prerequisite": "Cast Suspicion, Friend or Foe",
    "benefit": "As a Standard Action, make a Persuasion check against the Will Defense of one enemy within your line of sight that can hear and understand you. If your check result equals or exceeds the target's Will Defense, that target immediately makes an attack (as a Free Action) against another target of your choice.",
    "description": "As a Standard Action, make a Persuasion check against the Will Defense of one enemy within your line of sight that can hear and understand you. If your check result equals or exceeds the target's Will Defense, that target immediately makes an attack (as a Free Action) against another target of your choice.\n\nThis can be a melee attack against an adjacent target or a ranged attack against a target within the attacker's Point-Blank Range. The target gains a +5 bonus to its Will Defense if it is of a higher level than you. This is a Mind-Affecting effect."
  },
  "biotech_mastery": {
    "name": "Biotech Mastery",
    "prerequisite": "Biotech Specialist",
    "benefit": "When using the Biotech Specialist Feat to modify Biotech, you are able to make the appropriate modification in half of the normal time for half the normal cost. In addition, you can Take 10 on the Mechanics check (even when distracted or threatened), but you cannot Take 20.",
    "description": "When using the Biotech Specialist Feat to modify Biotech, you are able to make the appropriate modification in half of the normal time for half the normal cost. In addition, you can Take 10 on the Mechanics check (even when distracted or threatened), but you cannot Take 20."
  },
  "expedient_mending": {
    "name": "Expedient Mending",
    "prerequisite": "Expert Shaper",
    "benefit": "You can temporarily mend a damaged or disabled Biotech device using the Treat Injury Skill as a Standard Action instead of a Full-Round Action.",
    "description": "You can temporarily mend a damaged or disabled Biotech device using the Treat Injury Skill as a Standard Action instead of a Full-Round Action."
  },
  "expert_shaper": {
    "name": "Expert Shaper",
    "prerequisite": "",
    "benefit": "You may reroll any Treat Injury check made to repair or modify a Biotech object, but the result of the reroll must be accepted, even if it is worse.",
    "description": "You may reroll any Treat Injury check made to repair or modify a Biotech object, but the result of the reroll must be accepted, even if it is worse."
  },
  "master_mender": {
    "name": "Master Mender",
    "prerequisite": "Expert Shaper",
    "benefit": "Whenever you temporarily mend a Biotech device using the Treat Injury Skill, the mended device moves +4 steps on the Condition Track. In addition, the mended device only moves -3 steps down the Condition Track at the end of the scene or encounter, and is only disabled if this reduction brings it to -5 steps on the Condition Track.",
    "description": "Whenever you temporarily mend a Biotech device using the Treat Injury Skill, the mended device moves +4 steps on the Condition Track. In addition, the mended device only moves -3 steps down the Condition Track at the end of the scene or encounter, and is only disabled if this reduction brings it to -5 steps on the Condition Track."
  },
  "skilled_implanter": {
    "name": "Skilled Implanter",
    "prerequisite": "Biotech Surgery",
    "benefit": "Whenever you use the Biotech Surgery Feat to install a Bio-Implant, the Bio-Implant's attack bonus against the recipient's Fortitude Defense is halved.",
    "description": "Whenever you use the Biotech Surgery Feat to install a Bio-Implant, the Bio-Implant's attack bonus against the recipient's Fortitude Defense is halved."
  },
  "desperate_measures": {
    "name": "Desperate Measures",
    "prerequisite": "Focus Terror",
    "benefit": "Desperation stems from fear. Once per encounter as a Swift Action, you can instill desperation in all allies within 12 squares of you and in your line of sight, allowing each of them to make an immediate attack at a -5 penalty.",
    "description": "Desperation stems from fear. Once per encounter as a Swift Action, you can instill desperation in all allies within 12 squares of you and in your line of sight, allowing each of them to make an immediate attack at a -5 penalty."
  },
  "focus_terror": {
    "name": "Focus Terror",
    "prerequisite": "",
    "benefit": "Once per encounter as a Swift Action, you can harness the fear felt by your allies and transform it into a powerful motivational tool. All allies within 12 squares of you and in your line of sight move +2 steps along the Condition Track, but suffer a -2 penalty on attack rolls and Skill Checks for a number of rounds equal to your Character Level.",
    "description": "Once per encounter as a Swift Action, you can harness the fear felt by your allies and transform it into a powerful motivational tool. All allies within 12 squares of you and in your line of sight move +2 steps along the Condition Track, but suffer a -2 penalty on attack rolls and Skill Checks for a number of rounds equal to your Character Level."
  },
  "incite_rage": {
    "name": "Incite Rage",
    "prerequisite": "",
    "benefit": "Once per encounter as a Swift Action, you can channel your anger and hatred into your allies. All allies within 12 squares of you and in your line of sight gain a +1 rage bonus on attack rolls, but take a -2 penalty to their Reflex Defense. This effect lasts until the encounter ends, or until you are knocked unconscious or killed.",
    "description": "Once per encounter as a Swift Action, you can channel your anger and hatred into your allies. All allies within 12 squares of you and in your line of sight gain a +1 rage bonus on attack rolls, but take a -2 penalty to their Reflex Defense. This effect lasts until the encounter ends, or until you are knocked unconscious or killed."
  },
  "power_of_hatred": {
    "name": "Power of Hatred",
    "prerequisite": "Incite Rage",
    "benefit": "Once per encounter as a Swift Action, you can inflame the passions of your allies. Each ally within your line of sight who has fewer than half its normal Hit Points gains bonus Hit Points equal to your Character Level. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from multiple sources do not stack.",
    "description": "Once per encounter as a Swift Action, you can inflame the passions of your allies. Each ally within your line of sight who has fewer than half its normal Hit Points gains bonus Hit Points equal to your Character Level. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from multiple sources do not stack."
  },
  "adapt_and_survive": {
    "name": "Adapt and Survive",
    "prerequisite": "",
    "benefit": "When an enemy within 24 squares of you and in your line of sight receives a morale or insight bonus of any kind, you also gain the benefits of that bonus until the end of your next turn.",
    "description": "When an enemy within 24 squares of you and in your line of sight receives a morale or insight bonus of any kind, you also gain the benefits of that bonus until the end of your next turn."
  },
  "defensive_protection": {
    "name": "Defensive Protection",
    "prerequisite": "",
    "benefit": "You can spend a Force Point as a Reaction and add the results of the Force Point to any one of your Defenses, or to one of the Defenses of an adjacent ally. This bonus lasts until the beginning of your next turn.",
    "description": "You can spend a Force Point as a Reaction and add the results of the Force Point to any one of your Defenses, or to one of the Defenses of an adjacent ally. This bonus lasts until the beginning of your next turn."
  },
  "quick_on_your_feet": {
    "name": "Quick on Your Feet",
    "prerequisite": "",
    "benefit": "Once per encounter, you may move up to your Speed as a Reaction.",
    "description": "Once per encounter, you may move up to your Speed as a Reaction."
  },
  "ready_and_willing": {
    "name": "Ready and Willing",
    "prerequisite": "",
    "benefit": "When you Ready an Action, you can choose at any time before the start of your next turn to take your Readied Action at the end of the current turn, after the acting creature, Droid, or Vehicle completes its Action.",
    "description": "When you Ready an Action, you can choose at any time before the start of your next turn to take your Readied Action at the end of the current turn, after the acting creature, Droid, or Vehicle completes its Action."
  },
  "unbalancing_adaptation": {
    "name": "Unbalancing Adaptation",
    "prerequisite": "Adapt and Survive",
    "benefit": "When you use the Adapt and Survive Talent, you also deny the target the bonus that triggered the Talent to one enemy within your line of sight.",
    "description": "When you use the Adapt and Survive Talent, you also deny the target the bonus that triggered the Talent to one enemy within your line of sight."
  },
  "biotech_adept": {
    "name": "Biotech Adept",
    "prerequisite": "",
    "benefit": "You can reroll any Knowledge (Life Science) check, or Treat Injury checks made for Biotech Repair, but you must accept the result of the reroll, even if it is worse.",
    "description": "You can reroll any Knowledge (Life Science) check, or Treat Injury checks made for Biotech Repair, but you must accept the result of the reroll, even if it is worse."
  },
  "bugbite": {
    "name": "Bugbite",
    "prerequisite": "",
    "benefit": "You deal +1 die of damage on attacks made with Razor Bugs and Thud Bugs.",
    "description": "You deal +1 die of damage on attacks made with Razor Bugs and Thud Bugs."
  },
  "curved_throw": {
    "name": "Curved Throw",
    "prerequisite": "Bugbite",
    "benefit": "You can spend a Swift Action to ignore Cover (But not Total Cover) with your next attack with a Thud Bug or a Razor Bug made before the end of your turn.",
    "description": "You can spend a Swift Action to ignore Cover (But not Total Cover) with your next attack with a Thud Bug or a Razor Bug made before the end of your turn."
  },
  "surprising_weapons": {
    "name": "Surprising Weapons",
    "prerequisite": "",
    "benefit": "Whenever you successfully hit an enemy with an Amphistaff, Thud Bug, or Razor Bug, and your attack roll also exceeds the target’s Will Defense, that target is considered Flat-Footed against you until the end of your next turn.",
    "description": "Whenever you successfully hit an enemy with an Amphistaff, Thud Bug, or Razor Bug, and your attack roll also exceeds the target’s Will Defense, that target is considered Flat-Footed against you until the end of your next turn."
  },
  "veiled_biotech": {
    "name": "Veiled Biotech",
    "prerequisite": "Trained in Stealth",
    "benefit": "You gain a +10 competence bonus on Deception and Stealth checks made to conceal any Biotechnology or any Bio-Implants you possess. Additionally, you may draw a concealed Biotech item or Weapon as a Swift Action instead of a Standard Action; if you then make an attack with the Biotech Weapon before the end of your turn, your opponent loses it's Dexterity bonus to it's Reflex Defense against the first attack you make with that Weapon.",
    "description": "You gain a +10 competence bonus on Deception and Stealth checks made to conceal any Biotechnology or any Bio-Implants you possess. Additionally, you may draw a concealed Biotech item or Weapon as a Swift Action instead of a Standard Action; if you then make an attack with the Biotech Weapon before the end of your turn, your opponent loses it's Dexterity bonus to it's Reflex Defense against the first attack you make with that Weapon."
  },
  "charm_beast": {
    "name": "Charm Beast",
    "prerequisite": "",
    "benefit": "You can make a Use the Force check in place of a Persuasion check when attempting to change the Attitude of an undomesticated creature with an Intelligence score of 2 or less. Additionally, you do not take the normal -5 penalty on the check if the creature can't speak or understand your language.",
    "description": "You can make a Use the Force check in place of a Persuasion check when attempting to change the Attitude of an undomesticated creature with an Intelligence score of 2 or less. Additionally, you do not take the normal -5 penalty on the check if the creature can't speak or understand your language.\n\nThis Talent is identical to the Dathomiri Witch Talent of the same name, and both are considered to be the same Talent for the purposes of satisfying prerequisites."
  },
  "bonded_mount": {
    "name": "Bonded Mount",
    "prerequisite": "Charm Beast",
    "benefit": "Whenever you encounter a domesticated Beast with a Friendly or Helpful Attitude toward you, you can spend a Force Point as a Full-Round Action to bond the Beast to you as a mount. A Bonded Mount shares an emphatic link with you, allowing you to sense its emotions as a Free Action.",
    "description": "Whenever you encounter a domesticated Beast with a Friendly or Helpful Attitude toward you, you can spend a Force Point as a Full-Round Action to bond the Beast to you as a mount. A Bonded Mount shares an emphatic link with you, allowing you to sense its emotions as a Free Action.\n\nWhen you Ride a Bonded Mount, your mount uses your Reflex Defense and Will Defense instead of its own. Additionally, if your mount has any special senses (such as Scent, Darkvision, or Low-Light Vision) that you do not possess, you gain the benefits of its special senses as long as you are riding that mount."
  },
  "entreat_beast": {
    "name": "Entreat Beast",
    "prerequisite": "Charm Beast",
    "benefit": "You can use The Force to convince a small Beast to carry objects, deliver messages, or perform other minor tasks for you. If you are near a Beast that is at least Indifferent to you (whether this be a pet you bring with you or a Beast encountered in the wild), you can make a Use the Force check against the Beast's Will Defense as a Swift Action.",
    "description": "You can use The Force to convince a small Beast to carry objects, deliver messages, or perform other minor tasks for you. If you are near a Beast that is at least Indifferent to you (whether this be a pet you bring with you or a Beast encountered in the wild), you can make a Use the Force check against the Beast's Will Defense as a Swift Action.\n\nIf your Skill Check equals or exceeds the Beast's Will Defense, the Beast performs one task for you from the following list:\n\nDeliver an Object: The Beast attempts, to the best of its ability, to deliver one object from your person to another target within 30 squares of you.\nRetrieve an Object: The Beast attempts, to the best of its ability, to retrieve one unattended object within 30 squares of it and its line of sight and bring it to you.\nManipulate a Small Object: The Beast attempts, to the best of its ability, to press a button, pull a lever, or otherwise perform some minor activation of an unattended item within 30 squares."
  },
  "soothing_presence": {
    "name": "Soothing Presence",
    "prerequisite": "Charm Beast",
    "benefit": "Whenever you encounter a Beast with an Unfriendly Attitude toward you, you automatically shift its Attitude to Indifferent (no Skill Check required).",
    "description": "Whenever you encounter a Beast with an Unfriendly Attitude toward you, you automatically shift its Attitude to Indifferent (no Skill Check required)."
  },
  "advertisement": {
    "name": "Advertisement",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "wild_sense": {
    "name": "Wild Sense",
    "prerequisite": "Charm Beast",
    "benefit": "As a Swift Action once per turn, you can make a Use the Force check to touch the mind of a Beast with an Indifferent or better Attitude toward you, provided it is within 12 squares of you and in your line of sight. When you do so, the Beast makes an immediate active Perception check, and you are considered to perceive everything the Beast does, including noticing targets, as though you had made the check.",
    "description": "As a Swift Action once per turn, you can make a Use the Force check to touch the mind of a Beast with an Indifferent or better Attitude toward you, provided it is within 12 squares of you and in your line of sight. When you do so, the Beast makes an immediate active Perception check, and you are considered to perceive everything the Beast does, including noticing targets, as though you had made the check."
  },
  "call_weapon": {
    "name": "Call Weapon",
    "prerequisite": "",
    "benefit": "You can use the Move Light Object application of the Use the Force Skill to call a Lightsaber you built into your hand and ignite it as a Free Action. The Weapon must be in your line of sight to call it to your hand.",
    "description": "You can use the Move Light Object application of the Use the Force Skill to call a Lightsaber you built into your hand and ignite it as a Free Action. The Weapon must be in your line of sight to call it to your hand."
  },
  "lightsaber_specialist": {
    "name": "Lightsaber Specialist",
    "prerequisite": "Masterwork Lightsaber",
    "benefit": "Whenever you are armed with a Lightsaber that you built, you gain a +2 morale bonus on Use the Force checks made to use the Block and Deflect Talents.",
    "description": "Whenever you are armed with a Lightsaber that you built, you gain a +2 morale bonus on Use the Force checks made to use the Block and Deflect Talents."
  },
  "masterwork_lightsaber": {
    "name": "Masterwork Lightsaber",
    "prerequisite": "",
    "benefit": "Whenever you build a Lightsaber (see Advanced Lightsaber Construction), you do so with such expertise that it makes the Weapon even more refined and elegant. When you build a Lightsaber, you can choose to add one extra Lightsaber Accessory or Modification at the time of creation.",
    "description": "Whenever you build a Lightsaber (see Advanced Lightsaber Construction), you do so with such expertise that it makes the Weapon even more refined and elegant. When you build a Lightsaber, you can choose to add one extra Lightsaber Accessory or Modification at the time of creation.\n\nAnd, when you hit a target with a Lightsaber that you built, you can always choose to reroll one damage die from your damage roll, but you must accept the result of the reroll, even if it is worse.\n\nIn addition, you can mentor another character while they construct their own Lightsaber. When you do so, you reduce the Use the Force check DC for Advanced Lightsaber Construction by -5."
  },
  "perfect_attunement": {
    "name": "Perfect Attunement",
    "prerequisite": "Masterwork Lightsaber",
    "benefit": "Whenever you spend a Force Point to add to a Lightsaber attack roll made with a Lightsaber you built, you can add that same amount to the damage roll if the attack hits.",
    "description": "Whenever you spend a Force Point to add to a Lightsaber attack roll made with a Lightsaber you built, you can add that same amount to the damage roll if the attack hits."
  },
  "quick_modification": {
    "name": "Quick Modification",
    "prerequisite": "Masterwork Lightsaber",
    "benefit": "You can spend 1 minute modifying a Lightsaber you have built, removing one Lightsaber Accessory or Lightsaber Modification and putting a different one its place.",
    "description": "You can spend 1 minute modifying a Lightsaber you have built, removing one Lightsaber Accessory or Lightsaber Modification and putting a different one its place.\n\nGamemasters may rule that some modifications cannot be added or removed in this way due to rarity of materials or the difficulty of the Lightsaber Modification (such as adding or removing the Electrum Detail)."
  },
  "apprentice_boon": {
    "name": "Apprentice Boon",
    "prerequisite": "",
    "benefit": "Whenever an ally within 12 squares with a lower Use the Force skill bonus than you makes a Use the Force check, you can spend a Force Point as a Reaction to add to that Use the Force check.",
    "description": "Whenever an ally within 12 squares with a lower Use the Force skill bonus than you makes a Use the Force check, you can spend a Force Point as a Reaction to add to that Use the Force check."
  },
  "use_your_level_to_determine_how_many_dice_to_roll_for_the_force_point": {
    "name": "Use your level to determine how many dice to roll for the Force Point.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "share_force_secret": {
    "name": "Share Force Secret",
    "prerequisite": "At least 1 Force Secret",
    "benefit": "When you take this Talent, choose one Force Secret that you know. Once per turn as a Swift Action, you can grant the use of this Force Secret to one ally within 12 squares of you who is Trained in the Use the Force Skill.",
    "description": "When you take this Talent, choose one Force Secret that you know. Once per turn as a Swift Action, you can grant the use of this Force Secret to one ally within 12 squares of you who is Trained in the Use the Force Skill.\n\nThe target gains the benefit of this Force Secret until the end of your next turn."
  },
  "share_force_technique": {
    "name": "Share Force Technique",
    "prerequisite": "At least 1 Force Technique",
    "benefit": "When you take this Talent, choose one Force Technique that you know. Once per turn as a Swift Action, you can grant the use of this Force Technique to one ally within 12 squares of you who is Trained in the Use the Force Skill.",
    "description": "When you take this Talent, choose one Force Technique that you know. Once per turn as a Swift Action, you can grant the use of this Force Technique to one ally within 12 squares of you who is Trained in the Use the Force Skill.\n\nThe target gains the benefit of this Force Technique until the end of your next turn. You cannot choose the Force Point Recovery Technique for this Talent."
  },
  "share_talent": {
    "name": "Share Talent",
    "prerequisite": "At least 1 Talent from Lightsaber Combat Talent Tree, Duelist Talent Tree, or Lightsaber Forms Talent Tree",
    "benefit": "Choose a Talent that you already possess. The Talent you select must be from the Lightsaber Combat Talent Tree, the Duelist Talent Tree, or the Lightsaber Forms Talent Tree. Once per day, as a Standard Action, you can spend a Force Point to impart the benefits of the chosen Talent to one or more allies, effectively granting them the Talent (even if they don't meet the prerequisites).",
    "description": "Choose a Talent that you already possess. The Talent you select must be from the Lightsaber Combat Talent Tree, the Duelist Talent Tree, or the Lightsaber Forms Talent Tree. Once per day, as a Standard Action, you can spend a Force Point to impart the benefits of the chosen Talent to one or more allies, effectively granting them the Talent (even if they don't meet the prerequisites).\n\nAn ally must be within 12 squares of you, and must be able to see and hear you to gain the Talent; once gained, its benefits last until the end of the encounter.\n\nYou can share the Talent with a number of allies equal to one-half your Class Level (rounded down). Only allies who are Trained in the Use the Force Skill can gain the benefits of the Shared Talent.\n\nYou can take this Talent multiple times. Each time you do so, you must select a different Talent to share with this ability. You can share each Talent with your allies only once per day."
  },
  "transfer_power": {
    "name": "Transfer Power",
    "prerequisite": "Force Training",
    "benefit": "As a Standard Action, you can spend any one use of a Force Power currently in your Force Power Suite, adding a use of that Force Power to the Force Power Suite of any ally Trained in the Use the Force skill. The ally must be within 12 squares of you and in your line of sight.",
    "description": "As a Standard Action, you can spend any one use of a Force Power currently in your Force Power Suite, adding a use of that Force Power to the Force Power Suite of any ally Trained in the Use the Force skill. The ally must be within 12 squares of you and in your line of sight.\n\nWhen your ally uses that Force Power, it disappears from his or her Force Power Suite. If the ally does not use the Force Power before the end of the encounter, it is permanently removed from his or her Force Power Suite."
  },
  "echoes_of_the_force": {
    "name": "Echoes of the Force",
    "prerequisite": "Farseeing",
    "benefit": "You can use the Farseeing Force Power on a location instead of on an individual creature, peering into the location's past to view events that occurred there. Unlike the normal use of the Farseeing Force Power, you are actually looking into the location's past (at a time you designate), and you must be standing in the location being viewed.",
    "description": "You can use the Farseeing Force Power on a location instead of on an individual creature, peering into the location's past to view events that occurred there. Unlike the normal use of the Farseeing Force Power, you are actually looking into the location's past (at a time you designate), and you must be standing in the location being viewed.\n\nThe target DC for your Use the Force check is 20, +1 for each day into the past that you are attempt to scry. When you look into the past, you need only specify a time in a number of days, as you can sense tremors in The Force that focus you visions on meaningful events that day."
  },
  "jedi_quarry": {
    "name": "Jedi Quarry",
    "prerequisite": "",
    "benefit": "As a Swift Action, you can designate a single target creature as the focus of your attentions. You gain a +2 bonus to your Speed any time you spend a Move Action to Move, provided that you end your movement adjacent to the target.",
    "description": "As a Swift Action, you can designate a single target creature as the focus of your attentions. You gain a +2 bonus to your Speed any time you spend a Move Action to Move, provided that you end your movement adjacent to the target.\n\nYou retain this bonus (and may not use this Talent again) until your target surrenders, is reduced to 0 Hit Points, moves to the bottom of the Condition Track, or until the encounter ends."
  },
  "prepared_for_danger": {
    "name": "Prepared for Danger",
    "prerequisite": "Farseeing",
    "benefit": "Whenever you have at least one unspent Farseeing Force Power in your Force Power Suite, you can spend that Farseeing Force Power to regain any one other Force Power as a Swift Action.",
    "description": "Whenever you have at least one unspent Farseeing Force Power in your Force Power Suite, you can spend that Farseeing Force Power to regain any one other Force Power as a Swift Action."
  },
  "sense_deception": {
    "name": "Sense Deception",
    "prerequisite": "",
    "benefit": "Whenever someone makes a Deception or Persuasion Skill Check against your Will Defense, you can make a Use the Force check, replacing your Will Defense with the result of your Use the Force check if it is higher.",
    "description": "Whenever someone makes a Deception or Persuasion Skill Check against your Will Defense, you can make a Use the Force check, replacing your Will Defense with the result of your Use the Force check if it is higher."
  },
  "unclouded_judgement": {
    "name": "Unclouded Judgement",
    "prerequisite": "Sense Deception",
    "benefit": "Whenever you are the target of a Mind-Affecting Force Power or Force Talent, you can spend a Force Point as a Reaction to negate the effects of that Force Power or Force Talent (no Skill Check required).",
    "description": "Whenever you are the target of a Mind-Affecting Force Power or Force Talent, you can spend a Force Point as a Reaction to negate the effects of that Force Power or Force Talent (no Skill Check required)."
  },
  "combat_trance": {
    "name": "Combat Trance",
    "prerequisite": "Battle Strike",
    "benefit": "Whenever you use the Battle Strike Force Power, you gain the Force Power's bonus on attack rolls on your first melee attack made each round until the end of the encounter. If you do not attack in a round, this effect ends.",
    "description": "Whenever you use the Battle Strike Force Power, you gain the Force Power's bonus on attack rolls on your first melee attack made each round until the end of the encounter. If you do not attack in a round, this effect ends."
  },
  "improvised_weapon_mastery": {
    "name": "Improvised Weapon Mastery",
    "prerequisite": "",
    "benefit": "You take no penalty on attack rolls made with Improvised Weapons.",
    "description": "You take no penalty on attack rolls made with Improvised Weapons."
  },
  "twin_weapon_style": {
    "name": "Twin Weapon Style",
    "prerequisite": "",
    "benefit": "As a Standard Action, whenever you are wielding two Weapons (or a Double Weapon), you can make one attack with each Weapon (or each end of a Double Weapon). Each attack must be against a different target.",
    "description": "As a Standard Action, whenever you are wielding two Weapons (or a Double Weapon), you can make one attack with each Weapon (or each end of a Double Weapon). Each attack must be against a different target."
  },
  "twin_weapon_mastery": {
    "name": "Twin Weapon Mastery",
    "prerequisite": "Twin Weapon Style",
    "benefit": "Whenever you use the Twin Weapon Style Talent, you can move 2 squares between each attack. This movement does not provoke Attacks of Opportunity.",
    "description": "Whenever you use the Twin Weapon Style Talent, you can move 2 squares between each attack. This movement does not provoke Attacks of Opportunity."
  },
  "shoto_pin": {
    "name": "Shoto Pin",
    "prerequisite": "Block",
    "benefit": "Whenever you are wielding a light Lightsaber (typically a Shoto Lightsaber) and successfully use the Block Talent to negate a melee attack, the attacker can make no further melee attacks until the start of its next turn or until you are no longer adjacent to it. The effect ends early if you move, attack, or use an action",
    "description": "Whenever you are wielding a light Lightsaber (typically a Shoto Lightsaber) and successfully use the Block Talent to negate a melee attack, the attacker can make no further melee attacks until the start of its next turn or until you are no longer adjacent to it. The effect ends early if you move, attack, or use an action"
  },
  "channel_vitality": {
    "name": "Channel Vitality",
    "prerequisite": "",
    "benefit": "You can fuel your mastery of The Force with your own vitality. As a Swift Action, you can move -1 step down the Condition Track to gain a temporary Force Point. This temporary Force Point lasts until the end of your turn, at which point it is lost if it has not been used.",
    "description": "You can fuel your mastery of The Force with your own vitality. As a Swift Action, you can move -1 step down the Condition Track to gain a temporary Force Point. This temporary Force Point lasts until the end of your turn, at which point it is lost if it has not been used."
  },
  "closed_mind": {
    "name": "Closed Mind",
    "prerequisite": "",
    "benefit": "Whenever a creature uses a Mind-Affecting effect on you that targets your Will Defense, it must roll the attack roll or Skill Check twice, taking the lower result.",
    "description": "Whenever a creature uses a Mind-Affecting effect on you that targets your Will Defense, it must roll the attack roll or Skill Check twice, taking the lower result."
  },
  "esoteric_technique": {
    "name": "Esoteric Technique",
    "prerequisite": "",
    "benefit": "When you spend a Force Point to activate a Force Technique or Force Secret, you gain Bonus Hit Points equal to 10 + your Class Level until the end of the encounter.",
    "description": "When you spend a Force Point to activate a Force Technique or Force Secret, you gain Bonus Hit Points equal to 10 + your Class Level until the end of the encounter."
  },
  "mystic_mastery": {
    "name": "Mystic Mastery",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "regimen_mastery": {
    "name": "Regimen Mastery",
    "prerequisite": "Force Regimen Mastery",
    "benefit": "You gain a +5 Force bonus on Skill Checks made to perform a Force Regimen.",
    "description": "You gain a +5 Force bonus on Skill Checks made to perform a Force Regimen."
  },
  "cause_mutation": {
    "name": "Cause Mutation",
    "prerequisite": "Sith Alchemy",
    "benefit": "You can use your mastery of Sith Alchemy to create mutated abominations. You must have access to a willing (or unconscious) creature to which you will apply the Sith Abomination Template or the Chrysalis Beast Template. You also need a medical lab outfitted for the process, which requires a number of days equal to creature's modified CL. You must spend a Force Point at the completion of the process to complete the transformation. A creature you have mutated is considered to be a domesticated creature, but for you only (unless it was already a domesticated creature before its mutation).",
    "description": "You can use your mastery of Sith Alchemy to create mutated abominations. You must have access to a willing (or unconscious) creature to which you will apply the Sith Abomination Template or the Chrysalis Beast Template. You also need a medical lab outfitted for the process, which requires a number of days equal to creature's modified CL. You must spend a Force Point at the completion of the process to complete the transformation. A creature you have mutated is considered to be a domesticated creature, but for you only (unless it was already a domesticated creature before its mutation)."
  },
  "rapid_alchemy": {
    "name": "Rapid Alchemy",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can perform minor alchemical alterations to a Melee Weapon you wield. For the remainder of the encounter, you gain a +2 Equipment bonus on attack rolls with that Weapon. Additionally, once before the end of the encounter, you can sacrifice this bonus as a Free Action to gain a +5 Equipment bonus on a single damage roll you make with that Weapon.",
    "description": "As a Standard Action, you can perform minor alchemical alterations to a Melee Weapon you wield. For the remainder of the encounter, you gain a +2 Equipment bonus on attack rolls with that Weapon. Additionally, once before the end of the encounter, you can sacrifice this bonus as a Free Action to gain a +5 Equipment bonus on a single damage roll you make with that Weapon."
  },
  "sith_alchemy_specialist": {
    "name": "Sith Alchemy Specialist",
    "prerequisite": "Sith Alchemy",
    "benefit": "You can modify an object with Sith Alchemy so that it gains a specific trait. Specific traits are listed in the Sith Alchemy Table, below. You can only perform one modification at a time. Unless otherwise noted, you cannot grant more than one benefit to a single object, and you cannot apply the same benefit more than once. You must spend a Force Point and devote 1 hour of uninterrupted work to apply a trait to the relevant object, and when you do so, you increase your Dark Side Score by 1.",
    "description": "You can modify an object with Sith Alchemy so that it gains a specific trait. Specific traits are listed in the Sith Alchemy Table, below. You can only perform one modification at a time. Unless otherwise noted, you cannot grant more than one benefit to a single object, and you cannot apply the same benefit more than once. You must spend a Force Point and devote 1 hour of uninterrupted work to apply a trait to the relevant object, and when you do so, you increase your Dark Side Score by 1."
  },
  "mind_probe": {
    "name": "Mind Probe",
    "prerequisite": "",
    "benefit": "When you touch a living creature with an Intelligence score of 3 or higher, you can use The Force to probe its mind for secrets. You must be adjacent to the target, and using the Mind Probe is a Full-Round Action. If the target is unwilling, you must succeed on a Use the Force check, equaling or exceeding the target's Will Defense. This ability otherwise functions exactly as the Gather Information skill's Learn News and Rumors, Learn Secret Information, and Locate Individual applications.",
    "description": "When you touch a living creature with an Intelligence score of 3 or higher, you can use The Force to probe its mind for secrets. You must be adjacent to the target, and using the Mind Probe is a Full-Round Action. If the target is unwilling, you must succeed on a Use the Force check, equaling or exceeding the target's Will Defense. This ability otherwise functions exactly as the Gather Information skill's Learn News and Rumors, Learn Secret Information, and Locate Individual applications.\n\nYour Use the Force check must still exceed the base Gather Information skill DCs in order to retrieve the information you seek, but you need not pay anything in bribes, and you retrieve the information as a part of the Full-Round Action. Failing the Skill Check by 5 or more does not cause someone to notice that you are seeking the information."
  },
  "perfect_telepathy": {
    "name": "Perfect Telepathy",
    "prerequisite": "",
    "benefit": "You can communicate in full sentences and complete thoughts when you use the Telepathy aspect of the Use the Force skill, instead of just in basic phrases. However, the target of your Telepathy can still only communicate in basic emotions or single thoughts.",
    "description": "You can communicate in full sentences and complete thoughts when you use the Telepathy aspect of the Use the Force skill, instead of just in basic phrases. However, the target of your Telepathy can still only communicate in basic emotions or single thoughts."
  },
  "psychic_citadel": {
    "name": "Psychic Citadel",
    "prerequisite": "",
    "benefit": "You gain a Force bonus to your Will Defense equal to your Class Level.",
    "description": "You gain a Force bonus to your Will Defense equal to your Class Level."
  },
  "psychic_defenses": {
    "name": "Psychic Defenses",
    "prerequisite": "Psychic Citadel",
    "benefit": "Whenever another creature targets you with a Force Power with the [Mind-Affecting] descriptor, it automatically takes Force damage equal to 1d6 x your Wisdom modifier (minimum x1).",
    "description": "Whenever another creature targets you with a Force Power with the [Mind-Affecting] descriptor, it automatically takes Force damage equal to 1d6 x your Wisdom modifier (minimum x1)."
  },
  "telepathic_intruder": {
    "name": "Telepathic Intruder",
    "prerequisite": "",
    "benefit": "Whenever you use a Force Power with the [Mind-Affecting] descriptor successfully against a target, until the end of your next turn you gain a +2 Force bonus on Skill Checks made to activate [Mind-Affecting] Force Powers and Force Talents against that same target.",
    "description": "Whenever you use a Force Power with the [Mind-Affecting] descriptor successfully against a target, until the end of your next turn you gain a +2 Force bonus on Skill Checks made to activate [Mind-Affecting] Force Powers and Force Talents against that same target."
  },
  "ambush_specialist": {
    "name": "Ambush Specialist",
    "prerequisite": "",
    "benefit": "If you are not Surprised on the first round of combat in an encounter, you can treat the first round of combat as if it were the Surprise Round for the purposes of Talents and Feats that trigger only during the Surprise Round.",
    "description": "If you are not Surprised on the first round of combat in an encounter, you can treat the first round of combat as if it were the Surprise Round for the purposes of Talents and Feats that trigger only during the Surprise Round.\n\nAdditionally, during the Surprise Round as a Free Action you can designate a target as your Prime Target. You gain a +2 morale bonus to attack rolls against your Prime Target until the end of the encounter."
  },
  "destructive_ambusher": {
    "name": "Destructive Ambusher",
    "prerequisite": "Ambush Specialist",
    "benefit": "",
    "description": ""
  },
  "keep_it_going": {
    "name": "Keep It Going",
    "prerequisite": "Ambush Specialist",
    "benefit": "If you reduce your Prime Target to 0 Hit Points, as a Free Action you can designate another target within your line of sight as your new Prime Target. This new target remains your Prime Target until the end of the encounter.",
    "description": "If you reduce your Prime Target to 0 Hit Points, as a Free Action you can designate another target within your line of sight as your new Prime Target. This new target remains your Prime Target until the end of the encounter."
  },
  "perceptive_ambusher": {
    "name": "Perceptive Ambusher",
    "prerequisite": "Ambush Specialist",
    "benefit": "You gain a +5 circumstance bonus to Perception checks against your Prime Target until the end of the encounter.",
    "description": "You gain a +5 circumstance bonus to Perception checks against your Prime Target until the end of the encounter."
  },
  "spring_the_trap": {
    "name": "Spring the Trap",
    "prerequisite": "",
    "benefit": "If you and all your allies roll higher Initiative checks to start combat than do all your opponents, you automatically gain a Surprise Round, even if the opponents are aware of you when combat begins.",
    "description": "If you and all your allies roll higher Initiative checks to start combat than do all your opponents, you automatically gain a Surprise Round, even if the opponents are aware of you when combat begins."
  },
  "assault_gambit": {
    "name": "Assault Gambit",
    "prerequisite": "",
    "benefit": "Once per turn, as a Standard Action, you can designate one ally and one enemy that have line of effect to each other. The ally and the enemy make opposed Initiative checks, and the winner can make a single immediate melee or ranged attack against the loser. No character can benefit from this Talent more than once per round.",
    "description": "Once per turn, as a Standard Action, you can designate one ally and one enemy that have line of effect to each other. The ally and the enemy make opposed Initiative checks, and the winner can make a single immediate melee or ranged attack against the loser. No character can benefit from this Talent more than once per round."
  },
  "direct_fire": {
    "name": "Direct Fire",
    "prerequisite": "Assault Gambit",
    "benefit": "Once per encounter, as a Swift Action, you can designate one ally and one target that does not have Cover from you. Until the start of your next turn, the ally you designate ignores the target's Cover bonuses to Reflex Defense.",
    "description": "Once per encounter, as a Swift Action, you can designate one ally and one target that does not have Cover from you. Until the start of your next turn, the ally you designate ignores the target's Cover bonuses to Reflex Defense."
  },
  "face_the_foe": {
    "name": "Face the Foe",
    "prerequisite": "",
    "benefit": "If you do not have Cover from a target, you gain a +1 morale bonus to attack rolls against that target.",
    "description": "If you do not have Cover from a target, you gain a +1 morale bonus to attack rolls against that target."
  },
  "lead_from_the_front": {
    "name": "Lead From the Front",
    "prerequisite": "Face the Foe",
    "benefit": "If you do not have Cover from a target that you damaged with a ranged attack, all your allies gain a +2 morale bonus to attack rolls against that target and a +5 circumstance bonus to opposed Initiative checks against that target until the start of your next turn.",
    "description": "If you do not have Cover from a target that you damaged with a ranged attack, all your allies gain a +2 morale bonus to attack rolls against that target and a +5 circumstance bonus to opposed Initiative checks against that target until the start of your next turn."
  },
  "luck_favors_the_bold": {
    "name": "Luck Favors the Bold",
    "prerequisite": "Face the Foe",
    "benefit": "If at least one enemy within your line of sight is aware of you and you do not have Cover against that enemy, at the start of your turn if you are conscious you gain a number of Bonus Hit Points equal to 5 + one-half your Heroic Level. Damage is subtracted from Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter are lost. Bonus Hit Points do not stack.",
    "description": "If at least one enemy within your line of sight is aware of you and you do not have Cover against that enemy, at the start of your turn if you are conscious you gain a number of Bonus Hit Points equal to 5 + one-half your Heroic Level. Damage is subtracted from Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter are lost. Bonus Hit Points do not stack."
  },
  "bigger_bang": {
    "name": "Bigger Bang",
    "prerequisite": "Improvised Device",
    "benefit": "",
    "description": ""
  },
  "capture_droid": {
    "name": "Capture Droid",
    "prerequisite": "",
    "benefit": "Once per encounter, you can use this Talent on an adjacent enemy Droid that has been reduced to 0 Hit Points or moved to the bottom of the Condition Track, but not destroyed.",
    "description": "Once per encounter, you can use this Talent on an adjacent enemy Droid that has been reduced to 0 Hit Points or moved to the bottom of the Condition Track, but not destroyed.\n\nAs a Standard Action, make a Mechanics check against the Droid's Will Defense. If your result equals or exceeds the Droid's Will Defense, the Droid moves +2 steps on the Condition Track, regains 1d8 Hit Points, becomes your ally, and it's Attitude toward you immediately shifts to Friendly.\n\nThe Droid fights on your side until the end of the encounter, at which point it is destroyed."
  },
  "custom_model": {
    "name": "Custom Model",
    "prerequisite": "Improvised Device, Tech Specialist",
    "benefit": "Whenever you create a device with the Improvised Device Talent, you can apply one modification granted by the Tech Specialist Feat to the device. This customization does not affect the value of the item being created.",
    "description": "Whenever you create a device with the Improvised Device Talent, you can apply one modification granted by the Tech Specialist Feat to the device. This customization does not affect the value of the item being created."
  },
  "improved_jury_rig": {
    "name": "Improved Jury-Rig",
    "prerequisite": "",
    "benefit": "You can use the Jury-Rig application of the Mechanics Skill as a Standard Action instead of as a Full-Round Action. Additionally, you are not required to make a Skill Check to successfully Jury-Rig a device or Vehicle, and the device or Vehicle moves +3 steps on the Condition Track instead of +2.",
    "description": "You can use the Jury-Rig application of the Mechanics Skill as a Standard Action instead of as a Full-Round Action. Additionally, you are not required to make a Skill Check to successfully Jury-Rig a device or Vehicle, and the device or Vehicle moves +3 steps on the Condition Track instead of +2."
  },
  "improvised_device": {
    "name": "Improvised Device",
    "prerequisite": "",
    "benefit": "You can create a temporary piece of almost any type of Equipment from the spare parts you have around. To do so, you must make a DC 25 Mechanics check and spend one hour building the device. The object can have a maximum value of 200 credits x your Class Level, it cannot have an availability of Rare or Illegal, and it cannot be unique.",
    "description": "You can create a temporary piece of almost any type of Equipment from the spare parts you have around. To do so, you must make a DC 25 Mechanics check and spend one hour building the device. The object can have a maximum value of 200 credits x your Class Level, it cannot have an availability of Rare or Illegal, and it cannot be unique.\n\nThe device you create must be something that you would be reasonably familiar with, and after 24 hours the object is destroyed. You can use this Talent once per day."
  },
  "bunker_buster": {
    "name": "Bunker Buster",
    "prerequisite": "",
    "benefit": "If you are adjacent to an object that can provide you with Cover from a target, you can Aim at that target as a Move Action.",
    "description": "If you are adjacent to an object that can provide you with Cover from a target, you can Aim at that target as a Move Action."
  },
  "defensive_measures": {
    "name": "Defensive Measures",
    "prerequisite": "Safe Zone",
    "benefit": "",
    "description": ""
  },
  "all_enemies_treat_your_safe_zone_as_difficult_terrain": {
    "name": "All enemies treat your Safe Zone as Difficult Terrain.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "enhance_cover": {
    "name": "Enhance Cover",
    "prerequisite": "",
    "benefit": "As a Swift Action, you can designate a single ally within your line of sight who has Cover from one or more enemies. That ally is considered instead to have Improved Cover against those enemies until the start of your next turn as long as the ally still has Cover.",
    "description": "As a Swift Action, you can designate a single ally within your line of sight who has Cover from one or more enemies. That ally is considered instead to have Improved Cover against those enemies until the start of your next turn as long as the ally still has Cover."
  },
  "escort_fighter": {
    "name": "Escort Fighter",
    "prerequisite": "",
    "benefit": "You can spend a Swift Action to designate one adjacent ally. Until the start of your next turn, if you move, that ally can also move the same number of squares, provided that the ally ends its movement adjacent to you. You cannot move a distance greater than the ally's speed.",
    "description": "You can spend a Swift Action to designate one adjacent ally. Until the start of your next turn, if you move, that ally can also move the same number of squares, provided that the ally ends its movement adjacent to you. You cannot move a distance greater than the ally's speed."
  },
  "launch_point": {
    "name": "Launch Point",
    "prerequisite": "Safe Zone",
    "benefit": "Any ally who starts his or her turn within your Safe Zone and then exits the Safe Zone gains a +2 bonus to attack rolls before the end of that ally's turn, provided that the ally is not within your Safe Zone when the attack is made.",
    "description": "Any ally who starts his or her turn within your Safe Zone and then exits the Safe Zone gains a +2 bonus to attack rolls before the end of that ally's turn, provided that the ally is not within your Safe Zone when the attack is made."
  },
  "obscuring_defenses": {
    "name": "Obscuring Defenses",
    "prerequisite": "Safe Zone",
    "benefit": "",
    "description": ""
  },
  "enemies_that_fire_into_your_safe_zone_take_a_2_penalty_to_attack_rolls": {
    "name": "Enemies that fire into your Safe Zone take a -2 penalty to attack rolls.",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "relocate": {
    "name": "Relocate",
    "prerequisite": "Safe Zone",
    "benefit": "You can dismiss your Safe Zone as a Swift Action, ending its current effects. Any allies in the space your Safe Zone was occupying gain a +2 bonus to their Speed until the start of your next turn. When you use this Talent, you cannot create a new Safe Zone until the start of your next turn.",
    "description": "You can dismiss your Safe Zone as a Swift Action, ending its current effects. Any allies in the space your Safe Zone was occupying gain a +2 bonus to their Speed until the start of your next turn. When you use this Talent, you cannot create a new Safe Zone until the start of your next turn."
  },
  "safe_passage": {
    "name": "Safe Passage",
    "prerequisite": "Escort Fighter",
    "benefit": "Once per turn, you can spend a Move Action to allow one ally within line of sight to move up to its speed as a Reaction. If a target makes an Attack of Opportunity against the ally during its movement, you can make an Attack of Opportunity against that target.",
    "description": "Once per turn, you can spend a Move Action to allow one ally within line of sight to move up to its speed as a Reaction. If a target makes an Attack of Opportunity against the ally during its movement, you can make an Attack of Opportunity against that target."
  },
  "safe_zone": {
    "name": "Safe Zone",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can identify a Safe Zone, within which your allies gain certain advantages. You designate a 4-by-4 square area of the combat area as a Safe Zone; at least 1 square of the Safe Zone must be the square you currently occupy. Each ally who starts his or her turn within the Safe Zone gains a +2 circumstance bonus to his or her Fortitude Defense and Will Defense until the start of the ally's next turn. The Safe Zone lasts until the end of the encounter, and you can have only one Safe Zone in effect at a time.",
    "description": "As a Standard Action, you can identify a Safe Zone, within which your allies gain certain advantages. You designate a 4-by-4 square area of the combat area as a Safe Zone; at least 1 square of the Safe Zone must be the square you currently occupy. Each ally who starts his or her turn within the Safe Zone gains a +2 circumstance bonus to his or her Fortitude Defense and Will Defense until the start of the ally's next turn. The Safe Zone lasts until the end of the encounter, and you can have only one Safe Zone in effect at a time.\n\nYou can create a new Safe Zone as a Standard Action, dismissing the old Safe Zone and replacing it with the new one, but no square of the old Safe Zone can overlap with any square of the new Safe Zone. You cannot create a Safe Zone in a space that overlaps another Pathfinder's Safe Zone."
  },
  "zone_of_recuperation": {
    "name": "Zone of Recuperation",
    "prerequisite": "Safe Zone",
    "benefit": "Any ally who catches a Second Wind while within your Safe Zone regains a number of additional Hit Points equal to your Class Level.",
    "description": "Any ally who catches a Second Wind while within your Safe Zone regains a number of additional Hit Points equal to your Class Level."
  },
  "black_market_buyer": {
    "name": "Black Market Buyer",
    "prerequisite": "",
    "benefit": "When seeking an item from the Black Market, you do not need to make a Gather Information check to locate a Black Market merchant; you automatically succeed.",
    "description": "When seeking an item from the Black Market, you do not need to make a Gather Information check to locate a Black Market merchant; you automatically succeed."
  },
  "excellent_kit": {
    "name": "Excellent Kit",
    "prerequisite": "",
    "benefit": "You always make sure that your allies have the best gear available. Whenever you purchase Weapons, Armor, or other Equipment (either legally or through the Black Market), all gear you purchase has 50% more Hit Points than normal and has 5 more DR than normal.",
    "description": "You always make sure that your allies have the best gear available. Whenever you purchase Weapons, Armor, or other Equipment (either legally or through the Black Market), all gear you purchase has 50% more Hit Points than normal and has 5 more DR than normal.\n\nIn addition, whenever one of your allies makes a Mechanics check on an object that you purchased, that ally gains a +2 Equipment bonus to the check."
  },
  "just_what_is_needed": {
    "name": "Just What is Needed",
    "prerequisite": "",
    "benefit": "You have a knack for finding the best quality replacement parts for broken Equipment. Whenever you use the Repair application of the Mechanics skill, you restore an extra 1d8 Hit Points with a successful Mechanics check, in addition to what you would normally restore.",
    "description": "You have a knack for finding the best quality replacement parts for broken Equipment. Whenever you use the Repair application of the Mechanics skill, you restore an extra 1d8 Hit Points with a successful Mechanics check, in addition to what you would normally restore.\n\nIf you use the Aid Another Action to assist an ally with Repairs, that ally also Repairs an extra 1d8 Hit Points with a successful Mechanics check. Any ally can only benefit from this Talent once per Mechanics check, regardless of how many allies with this Talent aid on the check."
  },
  "only_the_finest": {
    "name": "Only the Finest",
    "prerequisite": "Black Market Buyer",
    "benefit": "Whenever you purchase goods through the Black Market, you can obtain items that have been modified with the Tech Specialist feat without increasing the base value of the items.",
    "description": "Whenever you purchase goods through the Black Market, you can obtain items that have been modified with the Tech Specialist feat without increasing the base value of the items."
  },
  "right_gear_for_the_job": {
    "name": "Right Gear for the Job",
    "prerequisite": "",
    "benefit": "Once per day when an ally makes an Untrained skill check, as a Reaction you can grant that ally a +5 Equipment bonus to the check, and the ally is considered Trained in that Skill for the purpose of using Trained-only applications of the Skill.",
    "description": "Once per day when an ally makes an Untrained skill check, as a Reaction you can grant that ally a +5 Equipment bonus to the check, and the ally is considered Trained in that Skill for the purpose of using Trained-only applications of the Skill.\n\nYou cannot use this Talent to allow an ally to make an Untrained Use the Force check."
  },
  "recruit_enemy": {
    "name": "Recruit Enemy",
    "prerequisite": "",
    "benefit": "Once per encounter when you deal damage to a living creature that is equal to or greater than the target's current Hit Points and the target's Damage Threshold (that is, when you deal enough damage to kill the target), you can use this Talent. Make a Persuasion check against the target's Will Defense; if your result equals or exceeds the target's Will Defense, instead of dealing full damage, you deal half damage to the target and move it -1 step on the Condition Track.",
    "description": "Once per encounter when you deal damage to a living creature that is equal to or greater than the target's current Hit Points and the target's Damage Threshold (that is, when you deal enough damage to kill the target), you can use this Talent. Make a Persuasion check against the target's Will Defense; if your result equals or exceeds the target's Will Defense, instead of dealing full damage, you deal half damage to the target and move it -1 step on the Condition Track.\n\nIn addition, the target becomes your ally, and its Attitude toward you immediately shifts to Friendly. The target fights on your side until the end of the encounter, at which point it departs (or, if the GM wishes, the target might become your ally permanently and join your party). Anyone Hostile to you becomes Hostile to the target.\n\nThis is a Mind-Affecting effect. If the target is a higher level than you, it gains a +5 bonus to its Will Defense. Enemies that cannot be bribed, blackmailed, or seduced (such as Stormtroopers) are immune to this effect."
  },
  "bolstered_numbers": {
    "name": "Bolstered Numbers",
    "prerequisite": "Recruit Enemy",
    "benefit": "Whenever you successfully use Recruit Enemy on a target, you and all allies within line of sight gain a +2 morale bonus to attack rolls until the end of the encounter.",
    "description": "Whenever you successfully use Recruit Enemy on a target, you and all allies within line of sight gain a +2 morale bonus to attack rolls until the end of the encounter."
  },
  "noble_sacrifice": {
    "name": "Noble Sacrifice",
    "prerequisite": "Recruit Enemy",
    "benefit": "Whenever you successfully use Recruit Enemy on a target, if that target is reduced to 0 Hit Points or moved to the bottom of the Condition Track, as a Reaction you can grant yourself and all allies within line of sight a number of Bonus Hit Points equal to 10 + your Class Level.",
    "description": "Whenever you successfully use Recruit Enemy on a target, if that target is reduced to 0 Hit Points or moved to the bottom of the Condition Track, as a Reaction you can grant yourself and all allies within line of sight a number of Bonus Hit Points equal to 10 + your Class Level.\n\nDamage is subtracted from Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter are lost. Bonus Hit Points do not stack. No Bonus Hit Points may be granted if you or an ally reduce the target to 0 Hit Points or move it to the bottom of the Condition Track."
  },
  "team_recruiting": {
    "name": "Team Recruiting",
    "prerequisite": "Recruit Enemy",
    "benefit": "You can use your Recruit Enemy Talent whenever you or an ally would deal enough damage to kill a target, instead of only when you do.",
    "description": "You can use your Recruit Enemy Talent whenever you or an ally would deal enough damage to kill a target, instead of only when you do."
  },
  "find_openings": {
    "name": "Find Openings",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "hit_the_deck": {
    "name": "Hit the Deck",
    "prerequisite": "",
    "benefit": "Whenever you make an Area Attack, each ally in the area takes no damage if your attack roll fails to overcome his or her Reflex Defense, and takes half damage if the attack hits.",
    "description": "Whenever you make an Area Attack, each ally in the area takes no damage if your attack roll fails to overcome his or her Reflex Defense, and takes half damage if the attack hits."
  },
  "lure_closer": {
    "name": "Lure Closer",
    "prerequisite": "Trick Step",
    "benefit": "Once per turn, as a Move Action, you can make a Deception check against the Will Defense of one enemy within 12 squares and within your line of sight. If you check results equals or exceeds the target's Will Defense, the target must move a number of squares equal to half its speed, and each square of movement must bring the target closer to you (though the target does avoid Hazards and obstacles).",
    "description": "Once per turn, as a Move Action, you can make a Deception check against the Will Defense of one enemy within 12 squares and within your line of sight. If you check results equals or exceeds the target's Will Defense, the target must move a number of squares equal to half its speed, and each square of movement must bring the target closer to you (though the target does avoid Hazards and obstacles).\n\nIf the target cannot avoid a Hazard (such as a pit), it stops moving in the nearest safe square. This movement is considered involuntary and does not provoke Attacks of Opportunity. This is a Mind-Affecting effect."
  },
  "risk_for_reward": {
    "name": "Risk for Reward",
    "prerequisite": "Find Openings",
    "benefit": "Once per turn, when an enemy damages you with an Attack of Opportunity, you can make a single melee or ranged attack against a target in range as a Reaction.",
    "description": "Once per turn, when an enemy damages you with an Attack of Opportunity, you can make a single melee or ranged attack against a target in range as a Reaction."
  },
  "trick_step": {
    "name": "Trick Step",
    "prerequisite": "",
    "benefit": "As a Swift Action, make an Initiative check, opposed by the Initiative check of an enemy within your line of sight.",
    "description": "As a Swift Action, make an Initiative check, opposed by the Initiative check of an enemy within your line of sight.\n\nIf your check result equals or exceeds the target's check, the target is considered Flat-Footed against the next attack you make before the end of your turn. If the target's check result is higher, you are considered Flat-Footed against the next attack made by the target before the start of your next turn."
  },
  "aggressive_surge": {
    "name": "Aggressive Surge",
    "prerequisite": "",
    "benefit": "Once per encounter when you catch a Second Wind, you can make a Charge attack as a Free Action, provided that you can make a charge attack against a legal target at the time you catch a Second Wind.",
    "description": "Once per encounter when you catch a Second Wind, you can make a Charge attack as a Free Action, provided that you can make a charge attack against a legal target at the time you catch a Second Wind."
  },
  "blast_back": {
    "name": "Blast Back",
    "prerequisite": "",
    "benefit": "Once per round when you are damaged by an enemy's Area Attack, as a Reaction you can make an immediate melee or ranged attack against the source of the Area Attack, provided that you have line of sight to the attacker and the target is within your melee or ranged reach.",
    "description": "Once per round when you are damaged by an enemy's Area Attack, as a Reaction you can make an immediate melee or ranged attack against the source of the Area Attack, provided that you have line of sight to the attacker and the target is within your melee or ranged reach."
  },
  "fade_away": {
    "name": "Fade Away",
    "prerequisite": "",
    "benefit": "Once per turn when you are damaged by an enemy's attack, as a Reaction you can move up to half your speed. This movement does not provoke Attacks of Opportunity.",
    "description": "Once per turn when you are damaged by an enemy's attack, as a Reaction you can move up to half your speed. This movement does not provoke Attacks of Opportunity."
  },
  "second_strike": {
    "name": "Second Strike",
    "prerequisite": "Blast Back",
    "benefit": "Once per encounter when you miss a target with a single melee or ranged attack, as a Free Action you can move up to half your speed and make a second attack of the same type against a different target. This movement doesn't provoke Attacks of Opportunity.",
    "description": "Once per encounter when you miss a target with a single melee or ranged attack, as a Free Action you can move up to half your speed and make a second attack of the same type against a different target. This movement doesn't provoke Attacks of Opportunity.\n\nIf you have the Combat Reflexes feat, you may use this Talent a number of times per encounter equal to your Dexterity bonus (minimum 1). You may still only use this Talent once per round."
  },
  "swerve": {
    "name": "Swerve",
    "prerequisite": "Fade Away",
    "benefit": "Once per encounter when an enemy makes an Attack of Opportunity against you, as a Reaction you can automatically negate the attack and immediately move up to half your speed. This movement does not provoke Attacks of Opportunity.",
    "description": "Once per encounter when an enemy makes an Attack of Opportunity against you, as a Reaction you can automatically negate the attack and immediately move up to half your speed. This movement does not provoke Attacks of Opportunity.\n\nIf you have the Combat Reflexes feat, you may use this Talent a number of times per encounter equal to your Dexterity bonus (minimum 1). You may still only use this Talent once per round.\n\noncentrate All Fire\nWhen you use the Aid Another Action to aid an ally's attack roll with a Vehicle Weapon, if the attack hits, it deals +1 die of damage. Any ally can only benefit from this Talent once per attack roll, regardless of how many allies with this Talent aid on the attack."
  },
  "escort_pilot": {
    "name": "Escort Pilot",
    "prerequisite": "",
    "benefit": "When a Vehicle that you are Piloting is adjacent to a Vehicle of Colossal size or smaller that is Piloted by an ally, both Vehicles gain a +10 bonus to their Damage Thresholds.",
    "description": "When a Vehicle that you are Piloting is adjacent to a Vehicle of Colossal size or smaller that is Piloted by an ally, both Vehicles gain a +10 bonus to their Damage Thresholds."
  },
  "lose_pursuit": {
    "name": "Lose Pursuit",
    "prerequisite": "",
    "benefit": "When a Vehicle that you are Piloting is adjacent to a Vehicle of Colossal size or smaller that is Piloted by an ally, both you and your ally gain a +5 circumstance bonus to Pilot checks to avoid being pulled into a Dogfight as an Attack of Opportunity.",
    "description": "When a Vehicle that you are Piloting is adjacent to a Vehicle of Colossal size or smaller that is Piloted by an ally, both you and your ally gain a +5 circumstance bonus to Pilot checks to avoid being pulled into a Dogfight as an Attack of Opportunity."
  },
  "run_interference": {
    "name": "Run Interference",
    "prerequisite": "Escort Pilot Talent",
    "benefit": "As a Reaction, you can use your Vehicular Combat Feat to negate an attack against an adjacent Vehicle of Colossal size or smaller that is Piloted by an ally. If you can use Vehicular Combat more than once per round, each use to negate an attack counts toward your limit of uses per round.",
    "description": "As a Reaction, you can use your Vehicular Combat Feat to negate an attack against an adjacent Vehicle of Colossal size or smaller that is Piloted by an ally. If you can use Vehicular Combat more than once per round, each use to negate an attack counts toward your limit of uses per round."
  },
  "wingman_retribution": {
    "name": "Wingman Retribution",
    "prerequisite": "Escort Pilot Talent",
    "benefit": "When a Vehicle of Colossal size or smaller that is Piloted by an ally is damaged by an attack, once per round as a Reaction you can make a Vehicle Weapon attack with a -5 penalty against your ally's attacker.",
    "description": "When a Vehicle of Colossal size or smaller that is Piloted by an ally is damaged by an attack, once per round as a Reaction you can make a Vehicle Weapon attack with a -5 penalty against your ally's attacker."
  },
  "forward_patrol": {
    "name": "Forward Patrol",
    "prerequisite": "Watchful Step",
    "benefit": "At the start of a Surprise Round in which you are not caught by Surprise, you can designate one ally within 6 squares of you as able to retain his or her Dexterity bonus to Reflex Defense during the Surprise Round.",
    "description": "At the start of a Surprise Round in which you are not caught by Surprise, you can designate one ally within 6 squares of you as able to retain his or her Dexterity bonus to Reflex Defense during the Surprise Round."
  },
  "trailblazer": {
    "name": "Trailblazer",
    "prerequisite": "Trained in Survival",
    "benefit": "During your turn, you can spend a Swift Action to allow all allies within 6 square of you and within your line of sight to count the first square of Difficult Terrain as normal terrain each time they move.",
    "description": "During your turn, you can spend a Swift Action to allow all allies within 6 square of you and within your line of sight to count the first square of Difficult Terrain as normal terrain each time they move."
  },
  "watchful_step": {
    "name": "Watchful Step",
    "prerequisite": "",
    "benefit": "You can use your Perception check modifier instead of your Initiative modifier when making Initiative checks. If you are entitled to an Initiative check reroll, you can reroll your Perception check instead (subject to the same circumstances and limitations). You are considered to be Trained in Initiative.",
    "description": "You can use your Perception check modifier instead of your Initiative modifier when making Initiative checks. If you are entitled to an Initiative check reroll, you can reroll your Perception check instead (subject to the same circumstances and limitations). You are considered to be Trained in Initiative."
  },
  "anticipate_movement": {
    "name": "Anticipate Movement",
    "prerequisite": "",
    "benefit": "Once per round, as a Reaction to an enemy within your line of sight moving, you can enable one ally within your line of sight to move up to his or her speed as a Free Action.",
    "description": "Once per round, as a Reaction to an enemy within your line of sight moving, you can enable one ally within your line of sight to move up to his or her speed as a Free Action."
  },
  "forewarn_allies": {
    "name": "Forewarn Allies",
    "prerequisite": "",
    "benefit": "",
    "description": ""
  },
  "get_down": {
    "name": "Get Down",
    "prerequisite": "",
    "benefit": "As a Reaction, when an ally is targeted by a ranged attack, you can enable that ally to drop Prone immediately (imposing the normal -5 penalty for a ranged attack against a Prone target to the triggering attack roll) as a Free Action.",
    "description": "As a Reaction, when an ally is targeted by a ranged attack, you can enable that ally to drop Prone immediately (imposing the normal -5 penalty for a ranged attack against a Prone target to the triggering attack roll) as a Free Action."
  },
  "heavy_fire_zone": {
    "name": "Heavy Fire Zone",
    "prerequisite": "Forewarn Allies",
    "benefit": "Once per turn, as a Swift Action, designate a 3x3 square area within your line of sight. Until the end of your next turn, if a target moves into that area you can enable one ally within your line of sight to make an Attack of Opportunity against that target. The ally you choose must be armed with a Weapon capable of making Attacks of Opportunity, and this counts toward the ally's normal limitations for Attacks of Opportunity made in a round.",
    "description": "Once per turn, as a Swift Action, designate a 3x3 square area within your line of sight. Until the end of your next turn, if a target moves into that area you can enable one ally within your line of sight to make an Attack of Opportunity against that target. The ally you choose must be armed with a Weapon capable of making Attacks of Opportunity, and this counts toward the ally's normal limitations for Attacks of Opportunity made in a round."
  },
  "summon_aid": {
    "name": "Summon Aid",
    "prerequisite": "Get Down",
    "benefit": "Once per round, as a Reaction, when an enemy moves adjacent to you, you can enable one ally within your line of sight to immediately make a Charge attack against the triggering enemy. The ally you choose must be able to Charge the enemy from his or her current square under normal Charge rules.",
    "description": "Once per round, as a Reaction, when an enemy moves adjacent to you, you can enable one ally within your line of sight to immediately make a Charge attack against the triggering enemy. The ally you choose must be able to Charge the enemy from his or her current square under normal Charge rules."
  },
  "cheap_trick": {
    "name": "Cheap Trick",
    "prerequisite": "Trained in Deception",
    "benefit": "When you make a Deception check to Feint against an enemy within 6 squares of you, you can roll twice, keeping the better of the two results.",
    "description": "When you make a Deception check to Feint against an enemy within 6 squares of you, you can roll twice, keeping the better of the two results."
  },
  "easy_prey": {
    "name": "Easy Prey",
    "prerequisite": "Cheap Trick",
    "benefit": "When you make an attack as a Standard Action and successfully hit an enemy, you can choose to reduce the damage you deal by half. That target is then denied its Dexterity bonus to its Reflex Defense against your attacks until the end of your next turn.",
    "description": "When you make an attack as a Standard Action and successfully hit an enemy, you can choose to reduce the damage you deal by half. That target is then denied its Dexterity bonus to its Reflex Defense against your attacks until the end of your next turn."
  },
  "quick_strike": {
    "name": "Quick Strike",
    "prerequisite": "Cheap Trick",
    "benefit": "During the initial round of combat, if you successfully damage an enemy who has not yet acted in the combat, you can make an immediate attack as a Free Action against a different target within 6 squares of the first target.",
    "description": "During the initial round of combat, if you successfully damage an enemy who has not yet acted in the combat, you can make an immediate attack as a Free Action against a different target within 6 squares of the first target."
  },
  "sly_combatant": {
    "name": "Sly Combatant",
    "prerequisite": "Cheap Trick, Easy Prey",
    "benefit": "You quickly move about the battlefield, taking advantage of the chaos of battle. You can use each of the following Actions once per encounter as a Standard Action:",
    "description": "You quickly move about the battlefield, taking advantage of the chaos of battle. You can use each of the following Actions once per encounter as a Standard Action:\n\nDistracting Injury: Make a single melee or ranged attack against any enemy within your range. If the attack successfully hits, that enemy takes a -2 penalty to his or her attack rolls and damage rolls until the end of the encounter.\nMake Them Bleed: Make a single melee or ranged attack against any living creature within your range. If you successfully deal damage as a result of the attack, that enemy gains a Persistent Condition that can be removed only with a successful DC 25 Treat Injury check to perform Surgery.\nStrength in Numbers: Make a single melee or ranged attack against an enemy who is adjacent to one or more of your allies. If you successfully hit that enemy, you gain a +2 bonus to damage for each ally that is adjacent to the target."
  },
  "echani_expertise": {
    "name": "Echani Expertise",
    "prerequisite": "Base Attack Bonus +10",
    "benefit": "When making an Unarmed attack, you extend your critical threat range by 1 (for example, 19-20 instead of 20). However, anything other than a Natural 20 is not considered an automatic hit; if you roll anything other than a Natural 20 and still miss the target, you do not score a Critical Hit.",
    "description": "When making an Unarmed attack, you extend your critical threat range by 1 (for example, 19-20 instead of 20). However, anything other than a Natural 20 is not considered an automatic hit; if you roll anything other than a Natural 20 and still miss the target, you do not score a Critical Hit."
  },
  "hijkata_expertise": {
    "name": "Hijkata Expertise",
    "prerequisite": "",
    "benefit": "When you damage a creature or Droid with an Unarmed attack, the target takes a penalty to its next attack roll equal to your Strength bonus.",
    "description": "When you damage a creature or Droid with an Unarmed attack, the target takes a penalty to its next attack roll equal to your Strength bonus."
  },
  "ktara_expertise": {
    "name": "K'tara Expertise",
    "prerequisite": "",
    "benefit": "Once per turn, when you damage a creature or Droid with an Unarmed attack, you can make an attack to Disarm as a Swift Action. Also, you do not take the -5 penalty to your attack roll if the target is wielding a Weapon with more than one hand.",
    "description": "Once per turn, when you damage a creature or Droid with an Unarmed attack, you can make an attack to Disarm as a Swift Action. Also, you do not take the -5 penalty to your attack roll if the target is wielding a Weapon with more than one hand."
  },
  "kthri_expertise": {
    "name": "K'thri Expertise",
    "prerequisite": "",
    "benefit": "Any enemy that begins its turn adjacent to you takes damage equal to your Strength modifier (minimum 1 point) if you are able to make an Attack of Opportunity against them. You can use this Talent only while wearing Light Armor or no Armor.",
    "description": "Any enemy that begins its turn adjacent to you takes damage equal to your Strength modifier (minimum 1 point) if you are able to make an Attack of Opportunity against them. You can use this Talent only while wearing Light Armor or no Armor."
  },
  "stava_expertise": {
    "name": "Stava Expertise",
    "prerequisite": "",
    "benefit": "When you successfully Grab an enemy, he or she must make an opposed Grab check to break free of your Grab. If you are initiating a Grapple, you can reroll your Grapple check. However, you must accept the result of the reroll, even if it is worse. You can use this Talent only while wearing Light Armor or no Armor.",
    "description": "When you successfully Grab an enemy, he or she must make an opposed Grab check to break free of your Grab. If you are initiating a Grapple, you can reroll your Grapple check. However, you must accept the result of the reroll, even if it is worse. You can use this Talent only while wearing Light Armor or no Armor."
  },
  "tae_jitsu_expertise": {
    "name": "Tae-Jitsu Expertise",
    "prerequisite": "",
    "benefit": "Once per turn, when you damage a creature or Droid with an Unarmed attack, compare your attack roll to the target's Damage Threshold. If your attack roll equals or exceeds the target's Damage Threshold, the target is moved -1 step on the Condition Track, regardless of the damage result of your attack.",
    "description": "Once per turn, when you damage a creature or Droid with an Unarmed attack, compare your attack roll to the target's Damage Threshold. If your attack roll equals or exceeds the target's Damage Threshold, the target is moved -1 step on the Condition Track, regardless of the damage result of your attack."
  },
  "wrruushi_expertise": {
    "name": "Wrruushi Expertise",
    "prerequisite": "Far Shot",
    "benefit": "Once per turn, when you damage a creature or Droid with an Unarmed attack, you can make an attack against the target's Fortitude Defense as a Free Action. If that attack is successful, the target can only take a single Swift Action on their next turn. You can use this Talent only while wearing Light Armor or no Armor.",
    "description": "Once per turn, when you damage a creature or Droid with an Unarmed attack, you can make an attack against the target's Fortitude Defense as a Free Action. If that attack is successful, the target can only take a single Swift Action on their next turn. You can use this Talent only while wearing Light Armor or no Armor.\n\nrecision Shot\n\nWhen using the Aim Action, you gain the benefit of the Point-Blank Shot feat against your target, regardless of Range category."
  },
  "bullseye": {
    "name": "Bullseye",
    "prerequisite": "Draw a Bead, Precision Shot, Sniper",
    "benefit": "Once per encounter, you can designate a single target that you have Aimed at and is not within Point-Blank Range. When making a ranged attack roll against that target, the target is denied its Dexterity bonus to their Reflex Defense when determining the effect of your attack.",
    "description": "Once per encounter, you can designate a single target that you have Aimed at and is not within Point-Blank Range. When making a ranged attack roll against that target, the target is denied its Dexterity bonus to their Reflex Defense when determining the effect of your attack."
  },
  "draw_a_bead": {
    "name": "Draw a Bead",
    "prerequisite": "Precision Shot, Base Attack Bonus +10",
    "benefit": "Once per round, you can spend a single Swift Action to designate a single enemy who is not within Point-Blank Range. When you make a successful ranged attack roll that deals damage against the designated enemy, add your Dexterity bonus (minimum +1) to the damage roll.",
    "description": "Once per round, you can spend a single Swift Action to designate a single enemy who is not within Point-Blank Range. When you make a successful ranged attack roll that deals damage against the designated enemy, add your Dexterity bonus (minimum +1) to the damage roll.\n\nThis effect lasts until the target is unconscious, dead, or leaves your line of sight. You can have only one enemy designated in this manner."
  },
  "pinning_shot": {
    "name": "Pinning Shot",
    "prerequisite": "Precision Shot",
    "benefit": "You can keep your target worrying about where the next shot is coming from instead of trying to flee. When you deal damage to an enemy that you have Aimed at, the target's speed is reduced to 2 squares, and the target cannot take either a Double Move Action or use the Run Action until the end of your next turn.",
    "description": "You can keep your target worrying about where the next shot is coming from instead of trying to flee. When you deal damage to an enemy that you have Aimed at, the target's speed is reduced to 2 squares, and the target cannot take either a Double Move Action or use the Run Action until the end of your next turn.\n\nThis is a Stunning effect."
  },
  "harrying_shot": {
    "name": "Harrying Shot",
    "prerequisite": "Pinning Shot, Precision Shot",
    "benefit": "When you make a successful ranged attack against an enemy that you have Aimed at and the attack deals damage, the target cannot use a Standard Action to make an attack roll on his or her next turn. This is a Stunning effect.",
    "description": "When you make a successful ranged attack against an enemy that you have Aimed at and the attack deals damage, the target cannot use a Standard Action to make an attack roll on his or her next turn. This is a Stunning effect."
  },
  "defensive_jab": {
    "name": "Defensive Jab",
    "prerequisite": "Retaliation Jab",
    "benefit": "When you are Unarmed and take the Fight Defensively Action, you can make a single Unarmed attack as a Free Action against an adjacent target.",
    "description": "When you are Unarmed and take the Fight Defensively Action, you can make a single Unarmed attack as a Free Action against an adjacent target."
  },
  "nimble_dodge": {
    "name": "Nimble Dodge",
    "prerequisite": "",
    "benefit": "If an enemy misses you with a melee attack, as a Reaction you can move up to 2 squares, but you must end your movement adjacent to your attacker.",
    "description": "If an enemy misses you with a melee attack, as a Reaction you can move up to 2 squares, but you must end your movement adjacent to your attacker."
  },
  "retaliation_jab": {
    "name": "Retaliation Jab",
    "prerequisite": "",
    "benefit": "If an enemy misses you with a melee attack, as a Reaction you can automatically deal damage equal to your Strength modifier (minimum 1 point of damage) to your attacker, if the attacker is within your Reach.",
    "description": "If an enemy misses you with a melee attack, as a Reaction you can automatically deal damage equal to your Strength modifier (minimum 1 point of damage) to your attacker, if the attacker is within your Reach."
  },
  "stinging_jab": {
    "name": "Stinging Jab",
    "prerequisite": "",
    "benefit": "When you hit a target with an Unarmed attack, you can choose to deal half damage with your attack. If you do so, your enemy also deals half damage on all melee attacks he or she makes until the end of your next turn.",
    "description": "When you hit a target with an Unarmed attack, you can choose to deal half damage with your attack. If you do so, your enemy also deals half damage on all melee attacks he or she makes until the end of your next turn."
  },
  "stunning_shockboxer": {
    "name": "Stunning Shockboxer",
    "prerequisite": "Stinging Jab",
    "benefit": "When you deal Stun damage to a target with an Unarmed attack, after the Stun is halved, roll one extra die of damage and add that to the damage subtracted from the target's Hit Points.",
    "description": "When you deal Stun damage to a target with an Unarmed attack, after the Stun is halved, roll one extra die of damage and add that to the damage subtracted from the target's Hit Points."
  },
  "fall_back": {
    "name": "Fall Back",
    "prerequisite": "Charisma 13",
    "benefit": "As a Move Action, you can enable each member of your Squad to immediately move two squares. This movement does not provoke an Attack of Opportunity.",
    "description": "As a Move Action, you can enable each member of your Squad to immediately move two squares. This movement does not provoke an Attack of Opportunity."
  },
  "form_up": {
    "name": "Form Up",
    "prerequisite": "Charisma 13",
    "benefit": "As a Move Action, you give all Squad members a +2 morale bonus to their Reflex Defense until the end of your next turn, as long as they are within 6 squares of another Squad member.",
    "description": "As a Move Action, you give all Squad members a +2 morale bonus to their Reflex Defense until the end of your next turn, as long as they are within 6 squares of another Squad member."
  },
  "full_advance": {
    "name": "Full Advance",
    "prerequisite": "Charisma 13",
    "benefit": "As a Move Action, you give all Squad members a +2 morale bonus to damage rolls until the end of your next turn.",
    "description": "As a Move Action, you give all Squad members a +2 morale bonus to damage rolls until the end of your next turn."
  },
  "hold_steady": {
    "name": "Hold Steady",
    "prerequisite": "Charisma 13",
    "benefit": "Once per encounter, as a Standard Action, you move all members of your Squad +1 step on the Condition Track.",
    "description": "Once per encounter, as a Standard Action, you move all members of your Squad +1 step on the Condition Track."
  },
  "search_and_destroy": {
    "name": "Search and Destroy",
    "prerequisite": "Charisma 13",
    "benefit": "As a Move Action, you give all Squad members a +2 morale bonus to Perception checks until the end of your next turn.",
    "description": "As a Move Action, you give all Squad members a +2 morale bonus to Perception checks until the end of your next turn."
  },
  "flurry_of_blows": {
    "name": "Flurry of Blows",
    "prerequisite": "",
    "benefit": "When you make multiple Unarmed attacks as a Full Attack Action, you reduce the penalty to your attack roll by 2. You can take this Talent multiple times. Each time you take this Talent, you reduce the penalty to your attack rolls by an additional 2.",
    "description": "When you make multiple Unarmed attacks as a Full Attack Action, you reduce the penalty to your attack roll by 2. You can take this Talent multiple times. Each time you take this Talent, you reduce the penalty to your attack rolls by an additional 2."
  },
  "hardened_strike": {
    "name": "Hardened Strike",
    "prerequisite": "",
    "benefit": "If you deal damage with an Unarmed attack to a creature or Droid that has Damage Reduction, you reduce the value of that Damage Reduction by 1 until the end of the encounter. Cumulative attacks against the same target do not stack.",
    "description": "If you deal damage with an Unarmed attack to a creature or Droid that has Damage Reduction, you reduce the value of that Damage Reduction by 1 until the end of the encounter. Cumulative attacks against the same target do not stack."
  },
  "punishing_strike": {
    "name": "Punishing Strike",
    "prerequisite": "",
    "benefit": "When you score a Critical Hit with an Unarmed attack, you can make an immediate Unarmed attack (in addition to other effects of a Critical Hit) against a single target within reach. You can use this Talent only once per turn and only while wearing Light Armor or no Armor.",
    "description": "When you score a Critical Hit with an Unarmed attack, you can make an immediate Unarmed attack (in addition to other effects of a Critical Hit) against a single target within reach. You can use this Talent only once per turn and only while wearing Light Armor or no Armor."
  },
  "battlefield_remedy": {
    "name": "Battlefield Remedy",
    "prerequisite": "Trained in Treat Injury",
    "benefit": "You have learned a variety of different ways to treat combat injuries in the field. When you succeed on a Treat Injury check to administer First Aid, the tended creature also moves +1 step on the Condition Track.",
    "description": "You have learned a variety of different ways to treat combat injuries in the field. When you succeed on a Treat Injury check to administer First Aid, the tended creature also moves +1 step on the Condition Track."
  },
  "grizzled_warrior": {
    "name": "Grizzled Warrior",
    "prerequisite": "Seen It All, Tested in Battle",
    "benefit": "You can draw upon your extensive battlefield experience to encourage your comrades and drive your enemies before you. You can use each of the following Actions once per encounter as a Standard Action:",
    "description": "You can draw upon your extensive battlefield experience to encourage your comrades and drive your enemies before you. You can use each of the following Actions once per encounter as a Standard Action:\n\nDefy the Odds: Make a single melee or ranged attack. You immediately gain a number of bonus Hit Points equal to your Constitution score.\nDouble the Pain: When you use the Aid Another Action to provide an ally within 6 squares of you a bonus to his or her attack roll, add one-half your Character Level to the ally's damage roll if the attack is successful.\nGuarded Assault: Make a single melee or ranged attack. You gain a +2 dodge bonus to your Reflex Defense against all attacks until the start of your next turn."
  },
  "reckless": {
    "name": "Reckless",
    "prerequisite": "Tested in Battle",
    "benefit": "You know from first-hand experience that victory goes to those willing to take a chance. You can add your Wisdom bonus (minimum +1) to the damage roll when you make a successful Charge attack.",
    "description": "You know from first-hand experience that victory goes to those willing to take a chance. You can add your Wisdom bonus (minimum +1) to the damage roll when you make a successful Charge attack."
  },
  "seen_it_all": {
    "name": "Seen It All",
    "prerequisite": "Tested in Battle, Trained in Initiative",
    "benefit": "You have seen more action in more places than most people know exist, and little in the galaxy gets you rattled. Any character using a Fear effect on you must roll twice, keeping the lower result on any Skill Checks and attack rolls.",
    "description": "You have seen more action in more places than most people know exist, and little in the galaxy gets you rattled. Any character using a Fear effect on you must roll twice, keeping the lower result on any Skill Checks and attack rolls."
  },
  "tested_in_battle": {
    "name": "Tested in Battle",
    "prerequisite": "",
    "benefit": "When you catch a Second Wind, you move +2 steps on the Condition Track in addition to regaining Hit Points.",
    "description": "When you catch a Second Wind, you move +2 steps on the Condition Track in addition to regaining Hit Points."
  },
  "break_program": {
    "name": "Break Program",
    "prerequisite": "Trained in Use Computer",
    "benefit": "You can use your ability to circumvent Behavioral Inhibitors to temporarily break the programming of a Droid that you have a data link with. Make a Use Computer check opposed by the Droid's Will Defense. Breaking the Droid's programming overrides its Behavioral Inhibitors for a number of rounds equal to your Intelligence bonus.",
    "description": "You can use your ability to circumvent Behavioral Inhibitors to temporarily break the programming of a Droid that you have a data link with. Make a Use Computer check opposed by the Droid's Will Defense. Breaking the Droid's programming overrides its Behavioral Inhibitors for a number of rounds equal to your Intelligence bonus."
  },
  "heuristic_mastery": {
    "name": "Heuristic Mastery",
    "prerequisite": "Wisdom 15",
    "benefit": "You understand the subtleties and limitations of your Heuristic Processor. You can reroll any Untrained Skill Check (except Use the Force), but the result of the reroll must be accepted, even if it is worse. Once per encounter, you can spend a Force Point to reroll any Skill Check (Trained or Untrained), keeping the better of the two results.",
    "description": "You understand the subtleties and limitations of your Heuristic Processor. You can reroll any Untrained Skill Check (except Use the Force), but the result of the reroll must be accepted, even if it is worse. Once per encounter, you can spend a Force Point to reroll any Skill Check (Trained or Untrained), keeping the better of the two results."
  },
  "scripted_routines": {
    "name": "Scripted Routines",
    "prerequisite": "Base Attack Bonus +5",
    "benefit": "Your extensive experience allows you to preset specific routines that give you an advantage in some situations. Once per encounter you can use each of the following Actions:",
    "description": "Your extensive experience allows you to preset specific routines that give you an advantage in some situations. Once per encounter you can use each of the following Actions:\n\nAttack Script: You can use a Feat or a Talent that modifies your attack roll as one Action less (for example, a Full-Round Action becomes a Standard Action, a Standard Action becomes a Move Action, a Move Action becomes a Swift Action, a Swift Action becomes a Free Action).\nDefense Script: You can apply your Independent Spirit bonus a second time during a single encounter.\nSkill Script: While in combat, you can apply a bonus equal to one-half of your Class Level to any single Skill that requires a Standard Action or less to use. You must be Trained in the chosen Skill to activate this ability."
  },
  "ultra_resilient": {
    "name": "Ultra Resilient",
    "prerequisite": "",
    "benefit": "You have advanced subroutines that make you more resistant to the effect of damage. Once per encounter, as a Reaction, you can increase your Damage Threshold with a bonus equal to your Independent Droid level.",
    "description": "You have advanced subroutines that make you more resistant to the effect of damage. Once per encounter, as a Reaction, you can increase your Damage Threshold with a bonus equal to your Independent Droid level."
  },
  "directed_action": {
    "name": "Directed Action",
    "prerequisite": "",
    "benefit": "As a Standard Action, you allow one Droid that can hear and understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a Free Action. The Droid can replace its relevant Ability Score modifier for that check with your Intelligence modifier.",
    "description": "As a Standard Action, you allow one Droid that can hear and understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a Free Action. The Droid can replace its relevant Ability Score modifier for that check with your Intelligence modifier."
  },
  "directed_movement": {
    "name": "Directed Movement",
    "prerequisite": "",
    "benefit": "As a Move Action, you allow one Droid that can hear and understand you to move up to its Speed. The Droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relevant Ability Score modifier for that check with your Intelligence modifier.",
    "description": "As a Move Action, you allow one Droid that can hear and understand you to move up to its Speed. The Droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relevant Ability Score modifier for that check with your Intelligence modifier."
  },
  "full_control": {
    "name": "Full Control",
    "prerequisite": "Directed Action, Directed Movement, Remote Attack",
    "benefit": "As a Full-Round Action, you allow one Droid that can hear and understand you to take the Full Attack Action. The Droid can replace its relevant Ability Score modifier to its attack roll with your Intelligence modifier.",
    "description": "As a Full-Round Action, you allow one Droid that can hear and understand you to take the Full Attack Action. The Droid can replace its relevant Ability Score modifier to its attack roll with your Intelligence modifier."
  },
  "remote_attack": {
    "name": "Remote Attack",
    "prerequisite": "",
    "benefit": "As a Standard Action, you allow one Droid that can hear and understand you to make a melee or ranged attack. The Droid can replace its relevant Ability Score modifier to its attack roll with your Intelligence modifier.",
    "description": "As a Standard Action, you allow one Droid that can hear and understand you to make a melee or ranged attack. The Droid can replace its relevant Ability Score modifier to its attack roll with your Intelligence modifier."
  },
  "fade_out": {
    "name": "Fade Out",
    "prerequisite": "Trained in Stealth",
    "benefit": "You know how to make yourself scarce when dealing with suspicious or hostile beings. You can use your Stealth skill, not Deception, to Create a Diversion to Hide. If you are Trained in the Deception skill, you gain a +5 bonus to your skill check for the purpose to Create a Diversion to Hide.",
    "description": "You know how to make yourself scarce when dealing with suspicious or hostile beings. You can use your Stealth skill, not Deception, to Create a Diversion to Hide. If you are Trained in the Deception skill, you gain a +5 bonus to your skill check for the purpose to Create a Diversion to Hide."
  },
  "keep_together": {
    "name": "Keep Together",
    "prerequisite": "",
    "benefit": "Whenever you are hit or missed by a melee or ranged attack, you can move up to your speed as a Reaction, provided that you end your movement adjacent to an ally. This movement does not provoke Attacks of Opportunity.",
    "description": "Whenever you are hit or missed by a melee or ranged attack, you can move up to your speed as a Reaction, provided that you end your movement adjacent to an ally. This movement does not provoke Attacks of Opportunity."
  },
  "prudent_escape": {
    "name": "Prudent Escape",
    "prerequisite": "",
    "benefit": "Whenever you reduce a target to 0 Hit Points or otherwise render a creature unconscious, you can choose two allies within 6 squares of you and within your line of sight. You and the allies you chose can immediately move up to their Speeds as a Reaction. This movement does not provoke Attacks of Opportunity.",
    "description": "Whenever you reduce a target to 0 Hit Points or otherwise render a creature unconscious, you can choose two allies within 6 squares of you and within your line of sight. You and the allies you chose can immediately move up to their Speeds as a Reaction. This movement does not provoke Attacks of Opportunity."
  },
  "reactive_stealth": {
    "name": "Reactive Stealth",
    "prerequisite": "Trained in Stealth",
    "benefit": "When you are missed by a ranged attack and have Concealment or Cover from the attacker, you can move up to half your Speed as a Reaction and make a Stealth check to become hidden from your attacker, provided you still have Concealment or Cover at the end of your movement.",
    "description": "When you are missed by a ranged attack and have Concealment or Cover from the attacker, you can move up to half your Speed as a Reaction and make a Stealth check to become hidden from your attacker, provided you still have Concealment or Cover at the end of your movement."
  },
  "sizing_up": {
    "name": "Sizing Up",
    "prerequisite": "",
    "benefit": "Once per encounter, you can make a Perception check against the Will Defense of a single target that is within 6 squares of you and within your line of sight. If you succeed, you gain a +2 insight bonus to all Skill Checks and attack rolls against the target until the end of the encounter.",
    "description": "Once per encounter, you can make a Perception check against the Will Defense of a single target that is within 6 squares of you and within your line of sight. If you succeed, you gain a +2 insight bonus to all Skill Checks and attack rolls against the target until the end of the encounter."
  },
  "advanced_planning": {
    "name": "Advanced Planning",
    "prerequisite": "",
    "benefit": "When you roll Initiative for combat, choose one willing ally within your line of sight. You and that ally swap Initiative results.",
    "description": "When you roll Initiative for combat, choose one willing ally within your line of sight. You and that ally swap Initiative results."
  },
  "done_it_all": {
    "name": "Done It All",
    "prerequisite": "",
    "benefit": "When you select this Talent, choose two Talents (from any non-Prestige Class) that you do not possess but for which you meet the prerequisites. Once per turn on your turn, you can spend a Force Point as a Free Action to gain the benefits of one of those Talents until the end of your next turn.",
    "description": "When you select this Talent, choose two Talents (from any non-Prestige Class) that you do not possess but for which you meet the prerequisites. Once per turn on your turn, you can spend a Force Point as a Free Action to gain the benefits of one of those Talents until the end of your next turn."
  },
  "retaliation": {
    "name": "Retaliation",
    "prerequisite": "Advanced Planning",
    "benefit": "Whenever you move down the Condition Track as a result of taking damage that equals or exceeds your Damage Threshold, the next time you hit and damage a creature or a Droid with a melee or a ranged attack before the end of your next turn, you automatically move the target -1 step on the Condition Track.",
    "description": "Whenever you move down the Condition Track as a result of taking damage that equals or exceeds your Damage Threshold, the next time you hit and damage a creature or a Droid with a melee or a ranged attack before the end of your next turn, you automatically move the target -1 step on the Condition Track."
  },
  "bomb_thrower": {
    "name": "Bomb Thrower",
    "prerequisite": "Trained in Mechanics",
    "benefit": "You are skilled in making and handling impromptu Explosives. You gain a +5 bonus to Mechanics checks to Handle Explosives. In addition, you can spend a Full-Round Action to craft the equivalent of a Frag Grenade from spare parts you have on hand. You must have access to the appropriate supplies, such as an old blaster, a Tool Kit, or materials found inside a hangar bay.",
    "description": "You are skilled in making and handling impromptu Explosives. You gain a +5 bonus to Mechanics checks to Handle Explosives. In addition, you can spend a Full-Round Action to craft the equivalent of a Frag Grenade from spare parts you have on hand. You must have access to the appropriate supplies, such as an old blaster, a Tool Kit, or materials found inside a hangar bay."
  },
  "for_the_cause": {
    "name": "For the Cause",
    "prerequisite": "Make an Example",
    "benefit": "Whenever you or an ally within 6 squares of you takes damage that exceeds that character’s Damage Threshold, you and all allies within 6 squares of you gain a +2 bonus to attack rolls and damage rolls until the end of your next turn.",
    "description": "Whenever you or an ally within 6 squares of you takes damage that exceeds that character’s Damage Threshold, you and all allies within 6 squares of you gain a +2 bonus to attack rolls and damage rolls until the end of your next turn.\n\nMake an Example\nWhenever you hit with an attack and deal enough damage to exceed a target’s Damage Threshold, that target takes a -5 penalty to attack rolls against you until the end of your next turn. This is a Mind-Affecting effect."
  },
  "revolutionary_rhetoric": {
    "name": "Revolutionary Rhetoric",
    "prerequisite": "",
    "benefit": "As a Standard Action, you can do or say something that causes an enemy to doubt its motives. Choose one enemy within 12 squares and in your line of sight, and make a Persuasion check against the target’s Will Defense. If you succeed, the target can take only Move Actions and Swift Actions until the end of your next turn. This effect ends if you attack the target. This is a Mind-Affecting effect.",
    "description": "As a Standard Action, you can do or say something that causes an enemy to doubt its motives. Choose one enemy within 12 squares and in your line of sight, and make a Persuasion check against the target’s Will Defense. If you succeed, the target can take only Move Actions and Swift Actions until the end of your next turn. This effect ends if you attack the target. This is a Mind-Affecting effect."
  },
  "guaranteed_boon": {
    "name": "Guaranteed Boon",
    "prerequisite": "",
    "benefit": "Whenever you spend a Force Point to add to a Skill Check in a Skill Challenge and accrue a failure for that Skill Check, you regain that Force Point.",
    "description": "Whenever you spend a Force Point to add to a Skill Check in a Skill Challenge and accrue a failure for that Skill Check, you regain that Force Point."
  },
  "leading_skill": {
    "name": "Leading Skill",
    "prerequisite": "",
    "benefit": "Whenever you earn a success in a Skill Challenge, you gain a +2 insight bonus to your next Skill Check made with a different Skill in the same Skill Challenge.",
    "description": "Whenever you earn a success in a Skill Challenge, you gain a +2 insight bonus to your next Skill Check made with a different Skill in the same Skill Challenge."
  },
  "learn_from_mistakes": {
    "name": "Learn from Mistakes",
    "prerequisite": "",
    "benefit": "Whenever you accrue a failure in a Skill Challenge, you grant the next ally to take an Action in the Skill Challenge a +2 insight bonus to a Skill Check, provided that the ally takes a different Action (and uses a different Skill) than you did.",
    "description": "Whenever you accrue a failure in a Skill Challenge, you grant the next ally to take an Action in the Skill Challenge a +2 insight bonus to a Skill Check, provided that the ally takes a different Action (and uses a different Skill) than you did."
  },
  "try_your_luck": {
    "name": "Try Your Luck",
    "prerequisite": "",
    "benefit": "Whenever you accrue a failure in a Skill Challenge, choose one ally. The next time that ally uses the same Skill that you used to accrue a failure before the end of the Skill Challenge, that ally rolls two dice on the Skill Check, keeping the better of the two results.",
    "description": "Whenever you accrue a failure in a Skill Challenge, choose one ally. The next time that ally uses the same Skill that you used to accrue a failure before the end of the Skill Challenge, that ally rolls two dice on the Skill Check, keeping the better of the two results."
  },
  "assured_skill": {
    "name": "Assured Skill",
    "prerequisite": "",
    "benefit": "When you select this Talent, choose one Skill. Whenever you roll a Skill Check with that Skill, you can choose to lose any competence bonuses to that Skill Check and instead roll twice, keeping either result. You can select this Talent multiple times. Each time you do so, you must choose a different Skill to gain the benefits of this Talent.",
    "description": "When you select this Talent, choose one Skill. Whenever you roll a Skill Check with that Skill, you can choose to lose any competence bonuses to that Skill Check and instead roll twice, keeping either result. You can select this Talent multiple times. Each time you do so, you must choose a different Skill to gain the benefits of this Talent."
  },
  "critical_skill_success": {
    "name": "Critical Skill Success",
    "prerequisite": "",
    "benefit": "Whenever you roll a Natural 20 on a Skill Check, choose one other Skill. Once before the end of your next turn, you can choose to gain a +5 competence bonus to a check with that Skill as a Free Action.",
    "description": "Whenever you roll a Natural 20 on a Skill Check, choose one other Skill. Once before the end of your next turn, you can choose to gain a +5 competence bonus to a check with that Skill as a Free Action."
  },
  "exceptional_skill": {
    "name": "Exceptional Skill",
    "prerequisite": "",
    "benefit": "When you select this Talent, choose one Trained Skill. Whenever you roll a Skill Check with that Skill, a result of 2-7 on the die is always treated as though you had rolled an 8. You can select this Talent multiple times. Each time you do so, you must choose a different Skill to gain the benefits of this Talent.",
    "description": "When you select this Talent, choose one Trained Skill. Whenever you roll a Skill Check with that Skill, a result of 2-7 on the die is always treated as though you had rolled an 8. You can select this Talent multiple times. Each time you do so, you must choose a different Skill to gain the benefits of this Talent."
  },
  "reliable_boon": {
    "name": "Reliable Boon",
    "prerequisite": "",
    "benefit": "Whenever you spend a Force Point to add to a Skill Check, you always reroll a result of 1 on any of your Force Point dice, and continue to reroll until you get a result of 2 or higher.",
    "description": "Whenever you spend a Force Point to add to a Skill Check, you always reroll a result of 1 on any of your Force Point dice, and continue to reroll until you get a result of 2 or higher."
  },
  "skill_boon": {
    "name": "Skill Boon",
    "prerequisite": "",
    "benefit": "When you select this Talent, choose one Trained Skill. Whenever you spend a Force Point to add to that Skill, increase the die type of your Force Point by one step (i.e. from d6 to d8, d8 to d10, d10 to d12), to a maximum of d12. You can select this Talent multiple times. Each time you do so, you must choose a different Skill to gain the benefits of this Talent.",
    "description": "When you select this Talent, choose one Trained Skill. Whenever you spend a Force Point to add to that Skill, increase the die type of your Force Point by one step (i.e. from d6 to d8, d8 to d10, d10 to d12), to a maximum of d12. You can select this Talent multiple times. Each time you do so, you must choose a different Skill to gain the benefits of this Talent."
  },
  "skill_confidence": {
    "name": "Skill Confidence",
    "prerequisite": "Critical Skill Success",
    "benefit": "When you select this Talent, choose one Trained Skill. Whenever you roll a Natural 19 or a Natural 20 on a Skill Check with that Skill, you gain the benefits of the Critical Skill Success Talent and also gain Bonus Hit Points equal to your Charisma modifier. You can select this Talent multiple times. Each time you do so, you must choose a different Skill to gain the benefits of this Talent.",
    "description": "When you select this Talent, choose one Trained Skill. Whenever you roll a Natural 19 or a Natural 20 on a Skill Check with that Skill, you gain the benefits of the Critical Skill Success Talent and also gain Bonus Hit Points equal to your Charisma modifier. You can select this Talent multiple times. Each time you do so, you must choose a different Skill to gain the benefits of this Talent."
  },
  "skillful_recovery": {
    "name": "Skillful Recovery",
    "prerequisite": "",
    "benefit": "When you select this Talent, choose one Trained Skill. Whenever you fail a Skill Check with that Skill, you gain one temporary Force Point. That Force Point can only be spent to add to a Skill Check with the Skill you chose for this Talent. If the Force Point is not spent by the end of the encounter, it is lost.",
    "description": "When you select this Talent, choose one Trained Skill. Whenever you fail a Skill Check with that Skill, you gain one temporary Force Point. That Force Point can only be spent to add to a Skill Check with the Skill you chose for this Talent. If the Force Point is not spent by the end of the encounter, it is lost.\n\nFor the purposes of this Talent, failing a Skill Check means failing to get the minimum possible result from the Skill Check. You can select this Talent multiple times. Each time you do so, you must choose a different Skill to gain the benefits of this Talent."
  },
  "arrogant_bluster": {
    "name": "Arrogant Bluster",
    "prerequisite": "Trained in Persuasion",
    "benefit": "You take on an air of arrogance, allowing you to distract and sway others with your apparent knowledge and experience. When you make a successful Persuasion check to change an enemy's Attitude, the enemy takes a -5 penalty to its Will Defense until the end of your next turn. If you spend a Force Point, the duration is extended to the end of the encounter. This is a Mind-Affecting effect.",
    "description": "You take on an air of arrogance, allowing you to distract and sway others with your apparent knowledge and experience. When you make a successful Persuasion check to change an enemy's Attitude, the enemy takes a -5 penalty to its Will Defense until the end of your next turn. If you spend a Force Point, the duration is extended to the end of the encounter. This is a Mind-Affecting effect."
  },
  "band_together": {
    "name": "Band Together",
    "prerequisite": "Galactic Guidance, Self-Reliant, Trained in Persuasion, Trained in Knowledge (Galactic Lore)",
    "benefit": "You can inspire disparate beings to temporarily ally for a common cause. You can use each of the following Actions once per encounter:",
    "description": "You can inspire disparate beings to temporarily ally for a common cause. You can use each of the following Actions once per encounter:\n\nDirected Attack: As a Swift Action, designate one enemy character or Vehicle as the target of this Talent. Until the end of your next turn, whenever an ally within 12 squares of you hits the target, add 1d6 points of damage to each hit.\nStrength in Numbers: Your allies gain confidence in numbers. As a Swift Action, you grant all allies within 12 squares of you and within your line of sight a +5 bonus to their Will Defense until the end of your next turn. You must have a minimum of two allies to use this Action.\nTemporary Allies: With a successful Persuasion check, you can turn a Gamemaster character with an Attitude toward you of Unfriendly or Indifferent into an ally willing to aid you and follow your direction for the remainder of the encounter. As a Swift Action, you direct the Gamemaster character to attack a target, aid another character, or use a Skill to aid you or your allies. This is a Mind-Affecting effect."
  },
  "galactic_guidance": {
    "name": "Galactic Guidance",
    "prerequisite": "Trained in Knowledge (Galactic Lore)",
    "benefit": "You share your considerable galactic knowledge to inform others' actions and decisions. Once per encounter, as a Reaction, if you succeed on a DC 25 Knowledge (Galactic Lore) check, you enable one ally within 6 squares of you to reroll a failed Intelligence or Wisdom based Skill Check (other than Perception).",
    "description": "You share your considerable galactic knowledge to inform others' actions and decisions. Once per encounter, as a Reaction, if you succeed on a DC 25 Knowledge (Galactic Lore) check, you enable one ally within 6 squares of you to reroll a failed Intelligence or Wisdom based Skill Check (other than Perception)."
  },
  "rant": {
    "name": "Rant",
    "prerequisite": "Trained in Persuasion",
    "benefit": "You are a master of voicing your opinion loudly, continuously, and distractingly. If you succeed in making a Persuasion check to Intimidate an enemy that is within 6 squares of you and that can hear, see, and understand you, you can deny that enemy the use of a Move Action on its next turn, instead of gaining the normal Intimidation results. You grant one ally a Move Action to use immediately (the ally uses the Move Action as a Reaction).",
    "description": "You are a master of voicing your opinion loudly, continuously, and distractingly. If you succeed in making a Persuasion check to Intimidate an enemy that is within 6 squares of you and that can hear, see, and understand you, you can deny that enemy the use of a Move Action on its next turn, instead of gaining the normal Intimidation results. You grant one ally a Move Action to use immediately (the ally uses the Move Action as a Reaction)."
  },
  "self_reliant": {
    "name": "Self-Reliant",
    "prerequisite": "At least one Talent from the Inspiration Talent Tree",
    "benefit": "You need not rely on others when the going gets tough. Once per encounter, you can use one Talent that you possess from the Inspiration Talent Tree on yourself, despite not normally being able to do so.",
    "description": "You need not rely on others when the going gets tough. Once per encounter, you can use one Talent that you possess from the Inspiration Talent Tree on yourself, despite not normally being able to do so."
  },
  "piercing_hit": {
    "name": "Piercing Hit",
    "prerequisite": "Acute Senses, Keen Shot",
    "benefit": "You are skilled at fighting armored characters, taking advantage of their weaknesses. You can use each of the following Actions once per encounter:",
    "description": "You are skilled at fighting armored characters, taking advantage of their weaknesses. You can use each of the following Actions once per encounter:\n\nBinding Hit: You dislodge an enemy's Armor, causing it to hinder the wearer's defenses. Make a melee or ranged attack as a Standard Action. If you hit and damage your target, the target loses its Armor bonus to its Reflex Defense and is Flat-Footed. This effect remains until the target spends a Standard Action to adjust its Armor.\nBlinding Fire: Make a melee or ranged attack as a Standard Action. If the attack hits and damages the target, the target takes a -2 penalty to all attacks until the end of your next turn. Additionally, all other creatures, Droids, and Vehicles have Concealment from the target until the end of your next turn.\nSlowing Shot: Your hit damages your target's Armor so that the target's movement is hindered. Make a melee or ranged attack as a Standard Action. If you hit and damage the target, the target's Speed is reduced by two squares until the end of your next turn."
  },
  "quicktrap": {
    "name": "Quicktrap",
    "prerequisite": "Jury-Rigger, Tripwire",
    "benefit": "You can use the Tripwire Talent as a Move Action instead of a Standard Action.",
    "description": "You can use the Tripwire Talent as a Move Action instead of a Standard Action."
  },
  "speedclimber": {
    "name": "Speedclimber",
    "prerequisite": "Long Stride, Surefooted, Trained in Climb",
    "benefit": "You do not suffer penalties when using the Accelerated Climbing application of the Climb Skill.",
    "description": "You do not suffer penalties when using the Accelerated Climbing application of the Climb Skill."
  },
  "surprisingly_quick": {
    "name": "Surprisingly Quick",
    "prerequisite": "Skill Focus (Initiative)",
    "benefit": "In a Surprise Round, if you are not Surprised, you can take a Swift Action in addition to the one other Action normally allowed. If you are Surprised, you can take a single Swift Action.",
    "description": "In a Surprise Round, if you are not Surprised, you can take a Swift Action in addition to the one other Action normally allowed. If you are Surprised, you can take a single Swift Action.\n\nNormal: In a Surprise Round, if you are not Surprised, you can take a Standard Action, a Move Action, or a Swift Action. If you are Surprised, you can take no Actions."
  },
  "tripwire": {
    "name": "Tripwire",
    "prerequisite": "Jury-Rigger, Trained in Mechanics",
    "benefit": "As a Standard Action, you can set up a simple snare or trap across an opening up to 3 squares wide. You must have the required items to set the trap. Make a successful DC 20 Mechanics check to set the trap. Make a Deception check to conceal the wire. Compare the result of the Deception check to the Perception check of the next creature that passes through that square (-10 if it observes you setting the trap).",
    "description": "As a Standard Action, you can set up a simple snare or trap across an opening up to 3 squares wide. You must have the required items to set the trap. Make a successful DC 20 Mechanics check to set the trap. Make a Deception check to conceal the wire. Compare the result of the Deception check to the Perception check of the next creature that passes through that square (-10 if it observes you setting the trap).\n\nIf the creature fails the Perception check, it takes the indicated use of the trap. If the creature succeeds, it can make a DC 10 Acrobatics check to avoid the wire. Select one of the following options:\n\nClothesline: Requires thin wire, set at neck height. Success results in the target falling Prone in the trapped square, ending its Actions for the turn and taking 1d6 points of damage.\nElectronic Tripwire: Success results in Mine damage (Treat as Frag Grenade, 2-square blast radius centered on one end of the wire). Target is automatically hit; roll 1d20+10 against the Reflex Defense of adjacent targets.\nTripwire: Requires thin wire, set at ankle height. Add 2 to the Deception check result. Success results in the target immediately falling Prone in the trapped square and ending its Actions for the turn."
  },
  "battle_mount": {
    "name": "Battle Mount",
    "prerequisite": "Expert Rider, Terrain Guidance, Trained in Ride",
    "benefit": "You know how to fight from a living mount. You can use each of the following Actions once per encounter:",
    "description": "You know how to fight from a living mount. You can use each of the following Actions once per encounter:\n\nCovered Attack: Once per encounter, when you use the Use Mount as Cover (but not Improved Cover) aspect of the Ride skill, you can make an attack as a Standard Action, but you must have a free hand to do so.\nReduce Profile: You gain additional Cover from your mount. When you succeed in the Use Mount as Cover application of the Ride skill, you gain Improved Cover. If you fail by less than 10, you still gain the benefit of Cover. You gain no benefit if you fail by 10 or more.\nSwift Attack Mount: Once per encounter, the mount you are riding can make an attack as a Swift Action instead of a Standard Action."
  },
  "expert_rider": {
    "name": "Expert Rider",
    "prerequisite": "Trained in Ride",
    "benefit": "You can reroll any Ride check, but the result of the reroll must be accepted, even if it is worse.",
    "description": "You can reroll any Ride check, but the result of the reroll must be accepted, even if it is worse."
  },
  "mechanized_rider": {
    "name": "Mechanized Rider",
    "prerequisite": "Trained in Ride, Trained in Pilot",
    "benefit": "You use your riding experience to improve your skills on a Speeder or a Swoop Bike. When riding a Speeder or a Swoop Bike (or another, similar Vehicle), you can use the following applications of the Ride skill: Fast Mount or Dismount, Soft Fall, Stay in Saddle, and Use Mount as Cover.",
    "description": "You use your riding experience to improve your skills on a Speeder or a Swoop Bike. When riding a Speeder or a Swoop Bike (or another, similar Vehicle), you can use the following applications of the Ride skill: Fast Mount or Dismount, Soft Fall, Stay in Saddle, and Use Mount as Cover."
  },
  "terrain_guidance": {
    "name": "Terrain Guidance",
    "prerequisite": "Trained in Ride",
    "benefit": "You effectively guide your mount through rough terrain. When in control of your mount, you can make a DC 20 Ride check as a Swift Action to negate the effect of Difficult Terrain on your mount's Speed.",
    "description": "You effectively guide your mount through rough terrain. When in control of your mount, you can make a DC 20 Ride check as a Swift Action to negate the effect of Difficult Terrain on your mount's Speed."
  },
  "oafish": {
    "name": "Oafish",
    "prerequisite": "",
    "benefit": "Whether you come by oafishness naturally or it is all an act, you use your lack of sophistication and finesse as an excuse to bluff your way into or out of delicate situations. Once per encounter, when you fail either a Deception or a Persuasion check, you can add a bonus equal to 1d6 + your Wisdom modifier to your Deception or Persuasion check result.",
    "description": "Whether you come by oafishness naturally or it is all an act, you use your lack of sophistication and finesse as an excuse to bluff your way into or out of delicate situations. Once per encounter, when you fail either a Deception or a Persuasion check, you can add a bonus equal to 1d6 + your Wisdom modifier to your Deception or Persuasion check result."
  },
  "outsiders_eye": {
    "name": "Outsider's Eye",
    "prerequisite": "Trained in Perception",
    "benefit": "Your status as an outsider gives you an objective view of enemies and acquaintances. Once per encounter, you can make a DC 20 Perception check as a Standard Action. If the check is successful, you gain your choice of one of the following pieces of information:",
    "description": "Your status as an outsider gives you an objective view of enemies and acquaintances. Once per encounter, you can make a DC 20 Perception check as a Standard Action. If the check is successful, you gain your choice of one of the following pieces of information:"
  },
  "one_defense_score_of_one_character_or_vehicle_within_your_line_of_sight": {
    "name": "One Defense Score of one character or Vehicle within your line of sight",
    "prerequisite": "",
    "benefit": "The identity of the character or the Vehicle within your line of sight that has either the lowest or highest current Hit Points\nThe identity of the character or the Vehicle within your line of sight that has either the lowest or highest position on the Condition Track.",
    "description": "The identity of the character or the Vehicle within your line of sight that has either the lowest or highest current Hit Points\nThe identity of the character or the Vehicle within your line of sight that has either the lowest or highest position on the Condition Track."
  },
  "outsiders_query": {
    "name": "Outsider's Query",
    "prerequisite": "Trained in Persuasion",
    "benefit": "You use your outsider status as an excuse for mistakes, missteps, and social offenses. If you fail a Persuasion check to change a target's Attitude, the target's Attitude toward you does not change. You can also attempt to change the target's Attitude one additional time per encounter.",
    "description": "You use your outsider status as an excuse for mistakes, missteps, and social offenses. If you fail a Persuasion check to change a target's Attitude, the target's Attitude toward you does not change. You can also attempt to change the target's Attitude one additional time per encounter."
  },
  "wary": {
    "name": "Wary",
    "prerequisite": "Outsider's Eye, Trained in Perception",
    "benefit": "Your outsider status makes you cautious, observant, and ready for action. If an enemy fails a Stealth or a Deception check opposed by your Perception check, you can take one Move Action as a Reaction. If multiple enemies fail on the same turn (such as when you detect several enemies sneaking up on you), the number of Move Actions you take cannot exceed your Dexterity modifier (minimum 1).",
    "description": "Your outsider status makes you cautious, observant, and ready for action. If an enemy fails a Stealth or a Deception check opposed by your Perception check, you can take one Move Action as a Reaction. If multiple enemies fail on the same turn (such as when you detect several enemies sneaking up on you), the number of Move Actions you take cannot exceed your Dexterity modifier (minimum 1)."
  },
  "champion": {
    "name": "Champion",
    "prerequisite": "Warrior's Awareness, Warrior's Determination",
    "benefit": "You fight for protection, honor, or glory for yourself and others. You can use each of the following Actions once per encounter:",
    "description": "You fight for protection, honor, or glory for yourself and others. You can use each of the following Actions once per encounter:\n\nChampion's Pride: Your pride and dedication drives you on in the most difficult moments. When you use your Second Wind, you move +1 step on the Condition Track and remove one Fear effect or Mind-Affecting effect in addition to the normal benefit of Second Wind.\nDisarming Hit: When you hit and damage a creature and that damage equals or exceeds the target's Damage Threshold, you can make a Disarm attack against that target as a Free Action. If using a ranged Weapon, you must also have the Ranged Disarm Talent.\nMasterful Strike: You land an impressive blow against your enemy. When making a successful Unarmed or melee attack (except when using a Lightsaber), increase your damage by 2 points for every 5 points by which your attack roll exceeds your target's Reflex Defense."
  },
  "quick_study": {
    "name": "Quick Study",
    "prerequisite": "Warrior's Awareness",
    "benefit": "You excel at turning an enemy's tricks against it. Once per encounter, if an enemy attacks you using a non-Force Talent, you can use the same Talent against it on your next turn. You must use an appropriate Weapon or item, if required by the Talent, although you do not have to have the prerequisites. You can take this Action even if your enemy's attack misses you.",
    "description": "You excel at turning an enemy's tricks against it. Once per encounter, if an enemy attacks you using a non-Force Talent, you can use the same Talent against it on your next turn. You must use an appropriate Weapon or item, if required by the Talent, although you do not have to have the prerequisites. You can take this Action even if your enemy's attack misses you."
  },
  "simple_opportunity": {
    "name": "Simple Opportunity",
    "prerequisite": "Weapon Proficiency (Simple Weapons)",
    "benefit": "You can make Attacks of Opportunity when using a Simple Weapon (Ranged) against a single target. Grenades, as well as other Area Attack Simple Weapons, can not be used with this Talent.",
    "description": "You can make Attacks of Opportunity when using a Simple Weapon (Ranged) against a single target. Grenades, as well as other Area Attack Simple Weapons, can not be used with this Talent."
  },
  "warriors_awareness": {
    "name": "Warrior's Awareness",
    "prerequisite": "",
    "benefit": "You learn your enemy's preferred tactics quickly. When an enemy character makes a melee attack against you for at least the second time in an encounter, make a Perception check as a Reaction. If the check is successful, you gain a +1 bonus to your Reflex Defense and Fortitude Defense against that character until the end of the encounter.",
    "description": "You learn your enemy's preferred tactics quickly. When an enemy character makes a melee attack against you for at least the second time in an encounter, make a Perception check as a Reaction. If the check is successful, you gain a +1 bonus to your Reflex Defense and Fortitude Defense against that character until the end of the encounter.\n\nYou can use this against only one character at a time, until that character is incapacitated or killed, or until you voluntarily switch targets by dropping the use of this Talent for one full round (you can take other Actions normally)."
  },
  "warriors_determination": {
    "name": "Warrior's Determination",
    "prerequisite": "",
    "benefit": "Your natural determination carries you through tough battles. Once per encounter, as a Reaction, you can ignore one non Force-related effect, Talent, Skill, or ability that exceeds your Will Defense. If you spend a Force Point, you can ignore one Mind-Affecting effect, even if it is the result of a Force Power, Force Technique, or Force Secret.",
    "description": "Your natural determination carries you through tough battles. Once per encounter, as a Reaction, you can ignore one non Force-related effect, Talent, Skill, or ability that exceeds your Will Defense. If you spend a Force Point, you can ignore one Mind-Affecting effect, even if it is the result of a Force Power, Force Technique, or Force Secret."
  }
};

export function getCanonicalContentAuthority(type, name) {
  const key = normalizeAuthorityKey(name);
  if (!key) return null;
  if (type === 'feat') return FEAT_PREREQUISITE_AUTHORITY[key] || null;
  if (type === 'talent') return TALENT_PREREQUISITE_AUTHORITY[key] || null;
  return FEAT_PREREQUISITE_AUTHORITY[key] || TALENT_PREREQUISITE_AUTHORITY[key] || null;
}

export function getCanonicalPrerequisiteText(type, name) {
  return getCanonicalContentAuthority(type, name)?.prerequisite || '';
}

export function getCanonicalDescriptionText(type, name) {
  const entry = getCanonicalContentAuthority(type, name);
  return entry?.description || entry?.benefit || '';
}

export function getCanonicalBenefitText(type, name) {
  const entry = getCanonicalContentAuthority(type, name);
  return entry?.benefit || entry?.description || '';
}

export function hasCanonicalAuthority(type, name) {
  return !!getCanonicalContentAuthority(type, name);
}
