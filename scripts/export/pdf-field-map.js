/**
 * PDF field mapping - maps SWSE_EXPORT_MODEL paths to PDF AcroForm field names.
 * This is the TEMPLATE-SPECIFIC layer.
 *
 * IMPORTANT: These field names must be extracted from the actual PDF using:
 * scripts/export/discover-pdf-fields.js
 */

export const PDF_FIELD_MAP = {
  // Header
  "header.name": "CHARACTERNAME",
  "header.player": "PLAYERNAME",
  "header.class": "CLASS",
  "header.species": "SPECIES",
  "header.level": "LVL",
  "header.age": "AGE",
  "header.gender": "GENDER",
  "header.height": "HEIGHT",
  "header.weight": "WEIGHT",
  "header.destiny": "DESTINY",

  // Ability Scores
  "abilities.str.score": "STRENGTH",
  "abilities.str.mod": "STR_MOD",
  "abilities.dex.score": "DEXTERITY",
  "abilities.dex.mod": "DEX_MOD",
  "abilities.con.score": "CONSTITUTION",
  "abilities.con.mod": "CON_MOD",
  "abilities.int.score": "INTELLIGENCE",
  "abilities.int.mod": "INT_MOD",
  "abilities.wis.score": "WISDOM",
  "abilities.wis.mod": "WIS_MOD",
  "abilities.cha.score": "CHARISMA",
  "abilities.cha.mod": "CHA_MOD",

  // HP & Threshold
  "hp.total": "HITPOINTS",
  "damageThreshold": "DMG_THRESHOLD",

  // Defenses
  "defenses.fort.total": "FORT",
  "defenses.fort.class": "CLASS_BONUS_FORT",
  "defenses.fort.level": "LVL_ARMOR_BONUS_FORT",
  "defenses.fort.misc": "MISC_MOD_FORT",

  "defenses.ref.total": "REF_DEF",
  "defenses.ref.class": "CLASS_BONUS_REF",
  "defenses.ref.level": "LVL_ARMOR_BONUS_REF",
  "defenses.ref.misc": "MISC_MOD_REF",

  "defenses.will.total": "WILL_DEF",
  "defenses.will.class": "CLASS_BONUS_WILL",
  "defenses.will.level": "LVL_ARMOR_BONUS_WILL",
  "defenses.will.misc": "MISC_MOD_WILL",

  // Combat
  "combat.speed": "SPEED",
  "combat.initiative": "INITIATIVE",
  "combat.perception": "PERCEPTION",
  "combat.baseAttack": "BASE_ATTACK",

  // Force & Destiny
  "force.forcePoints": "FORCE_POINTS",
  "force.destinyPoints": "DESTINY_POINTS",

  // Experience
  "xp": "XP",

  // Weapons (4 rows max)
  "weapons.0.name": "WEAPON_NAME_01",
  "weapons.0.attack": "WEAPON_ATK_01",
  "weapons.0.damage": "WEAPON_DMG_01",
  "weapons.0.crit": "WEAPON_CRIT_01",
  "weapons.0.type": "WEAPON_TYPE_01",
  "weapons.0.notes": "WEAPON_NOTES_01",

  "weapons.1.name": "WEAPON_NAME_02",
  "weapons.1.attack": "WEAPON_ATK_02",
  "weapons.1.damage": "WEAPON_DMG_02",
  "weapons.1.crit": "WEAPON_CRIT_02",
  "weapons.1.type": "WEAPON_TYPE_02",
  "weapons.1.notes": "WEAPON_NOTES_02",

  "weapons.2.name": "WEAPON_NAME_03",
  "weapons.2.attack": "WEAPON_ATK_03",
  "weapons.2.damage": "WEAPON_DMG_03",
  "weapons.2.crit": "WEAPON_CRIT_03",
  "weapons.2.type": "WEAPON_TYPE_03",
  "weapons.2.notes": "WEAPON_NOTES_03",

  "weapons.3.name": "WEAPON_NAME_04",
  "weapons.3.attack": "WEAPON_ATK_04",
  "weapons.3.damage": "WEAPON_DMG_04",
  "weapons.3.crit": "WEAPON_CRIT_04",
  "weapons.3.type": "WEAPON_TYPE_04",
  "weapons.3.notes": "WEAPON_NOTES_04",

  // Skills (20 skills total)
  "skills.acrobatics.total": "SKILL_BONUS_01",
  "skills.acrobatics.trained": "TRAINED_01",
  "skills.acrobatics.focus": "SKILL_FOCUS_01",

  "skills.climb.total": "SKILL_BONUS_02",
  "skills.climb.trained": "TRAINED_02",
  "skills.climb.focus": "SKILL_FOCUS_02",

  "skills.deception.total": "SKILL_BONUS_03",
  "skills.deception.trained": "TRAINED_03",
  "skills.deception.focus": "SKILL_FOCUS_03",

  "skills.endurance.total": "SKILL_BONUS_04",
  "skills.endurance.trained": "TRAINED_04",
  "skills.endurance.focus": "SKILL_FOCUS_04",

  "skills.gatherInfo.total": "SKILL_BONUS_05",
  "skills.gatherInfo.trained": "TRAINED_05",
  "skills.gatherInfo.focus": "SKILL_FOCUS_05",

  "skills.initiative.total": "SKILL_BONUS_06",
  "skills.initiative.trained": "TRAINED_06",
  "skills.initiative.focus": "SKILL_FOCUS_06",

  "skills.jump.total": "SKILL_BONUS_07",
  "skills.jump.trained": "TRAINED_07",
  "skills.jump.focus": "SKILL_FOCUS_07",

  "skills.knowledge1.total": "SKILL_BONUS_08",
  "skills.knowledge1.label": "KNOWLEDGE08",

  "skills.knowledge2.total": "SKILL_BONUS_09",
  "skills.knowledge2.label": "KNOWLEDGE09",

  "skills.mechanics.total": "SKILL_BONUS_10",
  "skills.mechanics.trained": "TRAINED_10",
  "skills.mechanics.focus": "SKILL_FOCUS_10",

  "skills.perception.total": "SKILL_BONUS_11",
  "skills.perception.trained": "TRAINED_11",
  "skills.perception.focus": "SKILL_FOCUS_11",

  "skills.persuasion.total": "SKILL_BONUS_12",
  "skills.persuasion.trained": "TRAINED_12",
  "skills.persuasion.focus": "SKILL_FOCUS_12",

  "skills.pilot.total": "SKILL_BONUS_13",
  "skills.pilot.trained": "TRAINED_13",
  "skills.pilot.focus": "SKILL_FOCUS_13",

  "skills.ride.total": "SKILL_BONUS_14",
  "skills.ride.trained": "TRAINED_14",
  "skills.ride.focus": "SKILL_FOCUS_14",

  "skills.stealth.total": "SKILL_BONUS_15",
  "skills.stealth.trained": "TRAINED_15",
  "skills.stealth.focus": "SKILL_FOCUS_15",

  "skills.survival.total": "SKILL_BONUS_16",
  "skills.survival.trained": "TRAINED_16",
  "skills.survival.focus": "SKILL_FOCUS_16",

  "skills.swim.total": "SKILL_BONUS_17",
  "skills.swim.trained": "TRAINED_17",
  "skills.swim.focus": "SKILL_FOCUS_17",

  "skills.treatInjury.total": "SKILL_BONUS_18",
  "skills.treatInjury.trained": "TRAINED_18",
  "skills.treatInjury.focus": "SKILL_FOCUS_18",

  "skills.useComputer.total": "SKILL_BONUS_19",
  "skills.useComputer.trained": "TRAINED_19",
  "skills.useComputer.focus": "SKILL_FOCUS_19",

  "skills.useTheForce.total": "SKILL_BONUS_20",
  "skills.useTheForce.trained": "TRAINED_20",
  "skills.useTheForce.focus": "SKILL_FOCUS_20",

  // Equipment (15 items max)
  "equipment.0.name": "EQUIP_NAME_01",
  "equipment.0.weight": "EQUIP_WEIGHT_01",

  "equipment.1.name": "EQUIP_NAME_02",
  "equipment.1.weight": "EQUIP_WEIGHT_02",

  "equipment.2.name": "EQUIP_NAME_03",
  "equipment.2.weight": "EQUIP_WEIGHT_03",

  "equipment.3.name": "EQUIP_NAME_04",
  "equipment.3.weight": "EQUIP_WEIGHT_04",

  "equipment.4.name": "EQUIP_NAME_05",
  "equipment.4.weight": "EQUIP_WEIGHT_05",

  "equipment.5.name": "EQUIP_NAME_06",
  "equipment.5.weight": "EQUIP_WEIGHT_06",

  "equipment.6.name": "EQUIP_NAME_07",
  "equipment.6.weight": "EQUIP_WEIGHT_07",

  "equipment.7.name": "EQUIP_NAME_08",
  "equipment.7.weight": "EQUIP_WEIGHT_08",

  "equipment.8.name": "EQUIP_NAME_09",
  "equipment.8.weight": "EQUIP_WEIGHT_09",

  "equipment.9.name": "EQUIP_NAME_10",
  "equipment.9.weight": "EQUIP_WEIGHT_10",

  "equipment.10.name": "EQUIP_NAME_11",
  "equipment.10.weight": "EQUIP_WEIGHT_11",

  "equipment.11.name": "EQUIP_NAME_12",
  "equipment.11.weight": "EQUIP_WEIGHT_12",

  "equipment.12.name": "EQUIP_NAME_13",
  "equipment.12.weight": "EQUIP_WEIGHT_13",

  "equipment.13.name": "EQUIP_NAME_14",
  "equipment.13.weight": "EQUIP_WEIGHT_14",

  "equipment.14.name": "EQUIP_NAME_15",
  "equipment.14.weight": "EQUIP_WEIGHT_15",

  "totalWeight": "TOTAL_WEIGHT",
  "money": "MONEY",

  // Languages (6 max)
  "languages.0": "LANGUAGE_01",
  "languages.1": "LANGUAGE_02",
  "languages.2": "LANGUAGE_03",
  "languages.3": "LANGUAGE_04",
  "languages.4": "LANGUAGE_05",
  "languages.5": "LANGUAGE_06",

  // Talents (10 max)
  "talents.0": "TALENT_01",
  "talents.1": "TALENT_02",
  "talents.2": "TALENT_03",
  "talents.3": "TALENT_04",
  "talents.4": "TALENT_05",
  "talents.5": "TALENT_06",
  "talents.6": "TALENT_07",
  "talents.7": "TALENT_08",
  "talents.8": "TALENT_09",
  "talents.9": "TALENT_10",

  // Force Powers (14 max)
  "forcePowers.0": "FORCEPOWER_01",
  "forcePowers.1": "FORCEPOWER_02",
  "forcePowers.2": "FORCEPOWER_03",
  "forcePowers.3": "FORCEPOWER_04",
  "forcePowers.4": "FORCEPOWER_05",
  "forcePowers.5": "FORCEPOWER_06",
  "forcePowers.6": "FORCEPOWER_07",
  "forcePowers.7": "FORCEPOWER_08",
  "forcePowers.8": "FORCEPOWER_09",
  "forcePowers.9": "FORCEPOWER_10",
  "forcePowers.10": "FORCEPOWER_11",
  "forcePowers.11": "FORCEPOWER_12",
  "forcePowers.12": "FORCEPOWER_13",
  "forcePowers.13": "FORCEPOWER_14",

  // Feats (18 max with names and pages)
  "feats.0.name": "FEATNAME_01",
  "feats.0.page": "FEATPAGE_01",

  "feats.1.name": "FEATNAME_02",
  "feats.1.page": "FEATPAGE_02",

  "feats.2.name": "FEATNAME_03",
  "feats.2.page": "FEATPAGE_03",

  "feats.3.name": "FEATNAME_04",
  "feats.3.page": "FEATPAGE_04",

  "feats.4.name": "FEATNAME_05",
  "feats.4.page": "FEATPAGE_05",

  "feats.5.name": "FEATNAME_06",
  "feats.5.page": "FEATPAGE_06",

  "feats.6.name": "FEATNAME_07",
  "feats.6.page": "FEATPAGE_07",

  "feats.7.name": "FEATNAME_08",
  "feats.7.page": "FEATPAGE_08",

  "feats.8.name": "FEATNAME_09",
  "feats.8.page": "FEATPAGE_09",

  "feats.9.name": "FEATNAME_10",
  "feats.9.page": "FEATPAGE_10",

  "feats.10.name": "FEATNAME_11",
  "feats.10.page": "FEATPAGE_11",

  "feats.11.name": "FEATNAME_12",
  "feats.11.page": "FEATPAGE_12",

  "feats.12.name": "FEATNAME_13",
  "feats.12.page": "FEATPAGE_13",

  "feats.13.name": "FEATNAME_14",
  "feats.13.page": "FEATPAGE_14",

  "feats.14.name": "FEATNAME_15",
  "feats.14.page": "FEATPAGE_15",

  "feats.15.name": "FEATNAME_16",
  "feats.15.page": "FEATPAGE_16",

  "feats.16.name": "FEATNAME_17",
  "feats.16.page": "FEATPAGE_17",

  "feats.17.name": "FEATNAME_18",
  "feats.17.page": "FEATPAGE_18",
};
