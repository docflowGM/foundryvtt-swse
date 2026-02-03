/**
 * PDF field mapping - maps SWSE_EXPORT_MODEL paths to PDF AcroForm field names.
 * This is the TEMPLATE-SPECIFIC layer.
 *
 * IMPORTANT: These field names must be extracted from the actual PDF using:
 * scripts/export/discover-pdf-fields.js
 */

export const PDF_FIELD_MAP = {
  // Header (Page 1)
  "header.name": "CharacterName",
  "header.player": "Player",
  "header.class": "Class",
  "header.species": "Species",
  "header.level": "Level",
  "header.age": "Age",
  "header.gender": "Gender",
  "header.height": "Height",
  "header.weight": "Weight",
  "header.destiny": "Destiny",

  // Ability Scores (Page 1)
  "abilities.str.score": "STR",
  "abilities.str.mod": "STR_Mod",
  "abilities.dex.score": "DEX",
  "abilities.dex.mod": "DEX_Mod",
  "abilities.con.score": "CON",
  "abilities.con.mod": "CON_Mod",
  "abilities.int.score": "INT",
  "abilities.int.mod": "INT_Mod",
  "abilities.wis.score": "WIS",
  "abilities.wis.mod": "WIS_Mod",
  "abilities.cha.score": "CHA",
  "abilities.cha.mod": "CHA_Mod",

  // HP & Threshold
  "hp.total": "HP_Max",
  "hp.current": "HP_Current",
  "damageThreshold": "DamageThreshold",

  // Defenses (Page 1)
  "defenses.fort.total": "Fort_Total",
  "defenses.fort.armor": "Fort_Armor",
  "defenses.fort.class": "Fort_Class",
  "defenses.fort.ability": "Fort_Ability",
  "defenses.fort.misc": "Fort_Misc",

  "defenses.ref.total": "Ref_Total",
  "defenses.ref.armor": "Ref_Armor",
  "defenses.ref.class": "Ref_Class",
  "defenses.ref.ability": "Ref_Ability",
  "defenses.ref.misc": "Ref_Misc",

  "defenses.will.total": "Will_Total",
  "defenses.will.armor": "Will_Armor",
  "defenses.will.class": "Will_Class",
  "defenses.will.ability": "Will_Ability",
  "defenses.will.misc": "Will_Misc",

  // Combat (Page 1)
  "combat.speed": "Speed",
  "combat.initiative": "Initiative",
  "combat.perception": "Perception",
  "combat.baseAttack": "BaseAttack",

  // Force & Destiny
  "force.forcePoints": "ForcePoints",
  "force.destinyPoints": "DestinyPoints",

  // Condition & Dark Side
  "condition.state": "Condition",
  "condition.darkSideScore": "DarkSideScore",

  // Weapons (Page 1, 4 rows)
  "weapons.0.name": "Weapon1_Name",
  "weapons.0.attack": "Weapon1_Attack",
  "weapons.0.damage": "Weapon1_Damage",
  "weapons.0.crit": "Weapon1_Crit",
  "weapons.0.type": "Weapon1_Type",
  "weapons.0.notes": "Weapon1_Notes",

  "weapons.1.name": "Weapon2_Name",
  "weapons.1.attack": "Weapon2_Attack",
  "weapons.1.damage": "Weapon2_Damage",
  "weapons.1.crit": "Weapon2_Crit",
  "weapons.1.type": "Weapon2_Type",
  "weapons.1.notes": "Weapon2_Notes",

  "weapons.2.name": "Weapon3_Name",
  "weapons.2.attack": "Weapon3_Attack",
  "weapons.2.damage": "Weapon3_Damage",
  "weapons.2.crit": "Weapon3_Crit",
  "weapons.2.type": "Weapon3_Type",
  "weapons.2.notes": "Weapon3_Notes",

  "weapons.3.name": "Weapon4_Name",
  "weapons.3.attack": "Weapon4_Attack",
  "weapons.3.damage": "Weapon4_Damage",
  "weapons.3.crit": "Weapon4_Crit",
  "weapons.3.type": "Weapon4_Type",
  "weapons.3.notes": "Weapon4_Notes",

  // Skills (Page 2)
  "skills.acrobatics.total": "Acrobatics_Total",
  "skills.acrobatics.half": "Acrobatics_Half",
  "skills.acrobatics.ability": "Acrobatics_Ability",
  "skills.acrobatics.trained": "Acrobatics_Trained",
  "skills.acrobatics.focus": "Acrobatics_Focus",

  "skills.climb.total": "Climb_Total",
  "skills.climb.half": "Climb_Half",
  "skills.climb.ability": "Climb_Ability",
  "skills.climb.trained": "Climb_Trained",
  "skills.climb.focus": "Climb_Focus",

  "skills.deception.total": "Deception_Total",
  "skills.deception.half": "Deception_Half",
  "skills.deception.ability": "Deception_Ability",
  "skills.deception.trained": "Deception_Trained",
  "skills.deception.focus": "Deception_Focus",

  "skills.endurance.total": "Endurance_Total",
  "skills.endurance.half": "Endurance_Half",
  "skills.endurance.ability": "Endurance_Ability",
  "skills.endurance.trained": "Endurance_Trained",
  "skills.endurance.focus": "Endurance_Focus",

  "skills.gatherInfo.total": "GatherInfo_Total",
  "skills.gatherInfo.half": "GatherInfo_Half",
  "skills.gatherInfo.ability": "GatherInfo_Ability",
  "skills.gatherInfo.trained": "GatherInfo_Trained",
  "skills.gatherInfo.focus": "GatherInfo_Focus",

  "skills.initiative.total": "Initiative_Total",
  "skills.initiative.half": "Initiative_Half",
  "skills.initiative.ability": "Initiative_Ability",
  "skills.initiative.trained": "Initiative_Trained",
  "skills.initiative.focus": "Initiative_Focus",

  "skills.jump.total": "Jump_Total",
  "skills.jump.half": "Jump_Half",
  "skills.jump.ability": "Jump_Ability",
  "skills.jump.trained": "Jump_Trained",
  "skills.jump.focus": "Jump_Focus",

  "skills.knowledge1.total": "Knowledge1_Total",
  "skills.knowledge1.label": "Knowledge1_Label",

  "skills.knowledge2.total": "Knowledge2_Total",
  "skills.knowledge2.label": "Knowledge2_Label",

  "skills.mechanics.total": "Mechanics_Total",
  "skills.mechanics.half": "Mechanics_Half",
  "skills.mechanics.ability": "Mechanics_Ability",
  "skills.mechanics.trained": "Mechanics_Trained",
  "skills.mechanics.focus": "Mechanics_Focus",

  "skills.perception.total": "Perception_Total",
  "skills.perception.half": "Perception_Half",
  "skills.perception.ability": "Perception_Ability",
  "skills.perception.trained": "Perception_Trained",
  "skills.perception.focus": "Perception_Focus",

  "skills.persuasion.total": "Persuasion_Total",
  "skills.persuasion.half": "Persuasion_Half",
  "skills.persuasion.ability": "Persuasion_Ability",
  "skills.persuasion.trained": "Persuasion_Trained",
  "skills.persuasion.focus": "Persuasion_Focus",

  "skills.pilot.total": "Pilot_Total",
  "skills.pilot.half": "Pilot_Half",
  "skills.pilot.ability": "Pilot_Ability",
  "skills.pilot.trained": "Pilot_Trained",
  "skills.pilot.focus": "Pilot_Focus",

  "skills.ride.total": "Ride_Total",
  "skills.ride.half": "Ride_Half",
  "skills.ride.ability": "Ride_Ability",
  "skills.ride.trained": "Ride_Trained",
  "skills.ride.focus": "Ride_Focus",

  "skills.stealth.total": "Stealth_Total",
  "skills.stealth.half": "Stealth_Half",
  "skills.stealth.ability": "Stealth_Ability",
  "skills.stealth.trained": "Stealth_Trained",
  "skills.stealth.focus": "Stealth_Focus",

  "skills.survival.total": "Survival_Total",
  "skills.survival.half": "Survival_Half",
  "skills.survival.ability": "Survival_Ability",
  "skills.survival.trained": "Survival_Trained",
  "skills.survival.focus": "Survival_Focus",

  "skills.swim.total": "Swim_Total",
  "skills.swim.half": "Swim_Half",
  "skills.swim.ability": "Swim_Ability",
  "skills.swim.trained": "Swim_Trained",
  "skills.swim.focus": "Swim_Focus",

  "skills.treatInjury.total": "TreatInjury_Total",
  "skills.treatInjury.half": "TreatInjury_Half",
  "skills.treatInjury.ability": "TreatInjury_Ability",
  "skills.treatInjury.trained": "TreatInjury_Trained",
  "skills.treatInjury.focus": "TreatInjury_Focus",

  "skills.useComputer.total": "UseComputer_Total",
  "skills.useComputer.half": "UseComputer_Half",
  "skills.useComputer.ability": "UseComputer_Ability",
  "skills.useComputer.trained": "UseComputer_Trained",
  "skills.useComputer.focus": "UseComputer_Focus",

  "skills.useTheForce.total": "UseTheForce_Total",
  "skills.useTheForce.half": "UseTheForce_Half",
  "skills.useTheForce.ability": "UseTheForce_Ability",
  "skills.useTheForce.trained": "UseTheForce_Trained",
  "skills.useTheForce.focus": "UseTheForce_Focus",

  // Text blocks (Page 2)
  "feats": "Feats",
  "talents": "Talents",
  "forcePowers": "ForcePowers",
  "equipment": "Equipment",
  "languages": "Languages"
};
