/**
 * talents.js - Comprehensive Talent Effect Definitions
 *
 * This module defines Active Effects for SWSE talents that can be
 * automatically applied when a talent is added to a character.
 *
 * Effect modes:
 *   0 = CUSTOM
 *   1 = MULTIPLY
 *   2 = ADD
 *   3 = DOWNGRADE
 *   4 = UPGRADE
 *   5 = OVERRIDE
 */

export const TALENT_EFFECTS = {
  // ============================================================================
  // DEFENSE TALENTS
  // ============================================================================

  "Defensive Mobility": {
    effects: [{
      key: "system.defenses.reflex.misc",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 Reflex Defense when moving"
  },

  "Improved Defenses": {
    effects: [{
      key: "system.defenses.fortitude.misc",
      mode: 2,
      value: "1",
      priority: 20
    }, {
      key: "system.defenses.reflex.misc",
      mode: 2,
      value: "1",
      priority: 20
    }, {
      key: "system.defenses.will.misc",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 to all defenses"
  },

  "Second Skin": {
    effects: [{
      key: "system.defenses.reflex.armorBonus",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 armor bonus to Reflex Defense"
  },

  "Juggernaut": {
    effects: [{
      key: "system.damageThreshold.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Damage Threshold"
  },

  "Tough as Nails": {
    effects: [{
      key: "system.damageThreshold.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Damage Threshold"
  },

  "Hardiness": {
    effects: [{
      key: "system.defenses.fortitude.misc",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 Fortitude Defense"
  },

  "Resilience": {
    effects: [{
      key: "system.defenses.fortitude.misc",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 Fortitude Defense"
  },

  "Iron Will": {
    effects: [{
      key: "system.defenses.will.misc",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 Will Defense"
  },

  "Strong in the Force": {
    effects: [{
      key: "system.defenses.will.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Will Defense"
  },

  "Force Resistance": {
    effects: [{
      key: "system.defenses.will.forceResistance",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Will Defense vs Force powers"
  },

  "Improved Force Resistance": {
    effects: [{
      key: "system.defenses.will.forceResistance",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "Additional +5 Will Defense vs Force powers"
  },

  // ============================================================================
  // DAMAGE REDUCTION TALENTS
  // ============================================================================

  "Damage Reduction 5": {
    effects: [{
      key: "system.damageReduction",
      mode: 5,
      value: "5",
      priority: 20
    }],
    description: "DR 5"
  },

  "Improved Damage Reduction": {
    effects: [{
      key: "system.damageReduction",
      mode: 2,
      value: "2",
      priority: 25
    }],
    description: "+2 DR"
  },

  // ============================================================================
  // ATTACK BONUS TALENTS
  // ============================================================================

  "Weapon Focus": {
    effects: [{
      key: "system.attacks.weaponGroup",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 attack with weapon group"
  },

  "Greater Weapon Focus": {
    effects: [{
      key: "system.attacks.weaponGroup",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "Additional +1 attack with weapon group"
  },

  "Point Blank Shot": {
    effects: [{
      key: "system.attacks.pointBlank",
      mode: 2,
      value: "1",
      priority: 20
    }, {
      key: "system.damage.pointBlank",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 attack and damage at point blank range"
  },

  "Careful Shot": {
    effects: [{
      key: "system.attacks.ranged.aimed",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 to aimed ranged attacks"
  },

  "Deadeye": {
    effects: [{
      key: "system.attacks.ranged.misc",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 to ranged attacks"
  },

  "Multiattack Proficiency (Rifles)": {
    effects: [{
      key: "system.attacks.rifles.multiattack",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "Reduce multiattack penalty by 2 with rifles"
  },

  "Multiattack Proficiency (Heavy Weapons)": {
    effects: [{
      key: "system.attacks.heavy.multiattack",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "Reduce multiattack penalty by 2 with heavy weapons"
  },

  "Multiattack Proficiency (Pistols)": {
    effects: [{
      key: "system.attacks.pistols.multiattack",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "Reduce multiattack penalty by 2 with pistols"
  },

  "Multiattack Proficiency (Simple Weapons)": {
    effects: [{
      key: "system.attacks.simple.multiattack",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "Reduce multiattack penalty by 2 with simple weapons"
  },

  "Multiattack Proficiency (Advanced Melee Weapons)": {
    effects: [{
      key: "system.attacks.advancedMelee.multiattack",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "Reduce multiattack penalty by 2 with advanced melee"
  },

  "Multiattack Proficiency (Lightsabers)": {
    effects: [{
      key: "system.attacks.lightsabers.multiattack",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "Reduce multiattack penalty by 2 with lightsabers"
  },

  // ============================================================================
  // DAMAGE BONUS TALENTS
  // ============================================================================

  "Weapon Specialization": {
    effects: [{
      key: "system.damage.weaponGroup",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 damage with weapon group"
  },

  "Greater Weapon Specialization": {
    effects: [{
      key: "system.damage.weaponGroup",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "Additional +2 damage with weapon group"
  },

  "Melee Smash": {
    effects: [{
      key: "system.damage.melee",
      mode: 2,
      value: "1d6",
      priority: 20
    }],
    description: "+1d6 melee damage (two-handed)"
  },

  "Devastating Attack (Lightsabers)": {
    effects: [{
      key: "system.combat.lightsabers.thresholdReduction",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "Reduce target's damage threshold by 5 with lightsabers"
  },

  "Devastating Attack (Rifles)": {
    effects: [{
      key: "system.combat.rifles.thresholdReduction",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "Reduce target's damage threshold by 5 with rifles"
  },

  "Devastating Attack (Heavy Weapons)": {
    effects: [{
      key: "system.combat.heavy.thresholdReduction",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "Reduce target's damage threshold by 5 with heavy weapons"
  },

  "Devastating Attack (Pistols)": {
    effects: [{
      key: "system.combat.pistols.thresholdReduction",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "Reduce target's damage threshold by 5 with pistols"
  },

  "Devastating Attack (Advanced Melee Weapons)": {
    effects: [{
      key: "system.combat.advancedMelee.thresholdReduction",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "Reduce target's damage threshold by 5 with advanced melee"
  },

  "Devastating Attack (Simple Weapons)": {
    effects: [{
      key: "system.combat.simple.thresholdReduction",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "Reduce target's damage threshold by 5 with simple weapons"
  },

  "Penetrating Attack (Lightsabers)": {
    effects: [{
      key: "system.combat.lightsabers.ignoreDR",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Ignore DR with lightsabers"
  },

  "Penetrating Attack (Rifles)": {
    effects: [{
      key: "system.combat.rifles.ignoreDR",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Ignore DR with rifles"
  },

  "Penetrating Attack (Heavy Weapons)": {
    effects: [{
      key: "system.combat.heavy.ignoreDR",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Ignore DR with heavy weapons"
  },

  "Penetrating Attack (Pistols)": {
    effects: [{
      key: "system.combat.pistols.ignoreDR",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Ignore DR with pistols"
  },

  "Penetrating Attack (Advanced Melee Weapons)": {
    effects: [{
      key: "system.combat.advancedMelee.ignoreDR",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Ignore DR with advanced melee"
  },

  "Penetrating Attack (Simple Weapons)": {
    effects: [{
      key: "system.combat.simple.ignoreDR",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Ignore DR with simple weapons"
  },

  // ============================================================================
  // SKILL TALENTS
  // ============================================================================

  "Skill Focus (Acrobatics)": {
    effects: [{
      key: "system.skills.acrobatics.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Acrobatics"
  },

  "Skill Focus (Climb)": {
    effects: [{
      key: "system.skills.climb.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Climb"
  },

  "Skill Focus (Deception)": {
    effects: [{
      key: "system.skills.deception.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Deception"
  },

  "Skill Focus (Endurance)": {
    effects: [{
      key: "system.skills.endurance.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Endurance"
  },

  "Skill Focus (Gather Information)": {
    effects: [{
      key: "system.skills.gatherInformation.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Gather Information"
  },

  "Skill Focus (Initiative)": {
    effects: [{
      key: "system.skills.initiative.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Initiative"
  },

  "Skill Focus (Jump)": {
    effects: [{
      key: "system.skills.jump.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Jump"
  },

  "Skill Focus (Knowledge)": {
    effects: [{
      key: "system.skills.knowledge.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Knowledge"
  },

  "Skill Focus (Mechanics)": {
    effects: [{
      key: "system.skills.mechanics.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Mechanics"
  },

  "Skill Focus (Perception)": {
    effects: [{
      key: "system.skills.perception.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Perception"
  },

  "Skill Focus (Persuasion)": {
    effects: [{
      key: "system.skills.persuasion.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Persuasion"
  },

  "Skill Focus (Pilot)": {
    effects: [{
      key: "system.skills.pilot.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Pilot"
  },

  "Skill Focus (Ride)": {
    effects: [{
      key: "system.skills.ride.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Ride"
  },

  "Skill Focus (Stealth)": {
    effects: [{
      key: "system.skills.stealth.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Stealth"
  },

  "Skill Focus (Survival)": {
    effects: [{
      key: "system.skills.survival.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Survival"
  },

  "Skill Focus (Swim)": {
    effects: [{
      key: "system.skills.swim.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Swim"
  },

  "Skill Focus (Treat Injury)": {
    effects: [{
      key: "system.skills.treatInjury.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Treat Injury"
  },

  "Skill Focus (Use Computer)": {
    effects: [{
      key: "system.skills.useComputer.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Use Computer"
  },

  "Skill Focus (Use the Force)": {
    effects: [{
      key: "system.skills.useTheForce.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Use the Force"
  },

  // ============================================================================
  // SKILL TRAINING TALENTS
  // ============================================================================

  "Educated": {
    effects: [{
      key: "system.skills.knowledge.trained",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Trained in all Knowledge skills"
  },

  // ============================================================================
  // FORCE TALENTS
  // ============================================================================

  "Force Training": {
    effects: [{
      key: "system.forcePowers.max",
      mode: 2,
      value: "3",
      priority: 20
    }],
    description: "+3 Force powers known"
  },

  "Telekinetic Savant": {
    effects: [{
      key: "system.useTheForce.telekinetic",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 to telekinetic Force power checks"
  },

  "Telekinetic Prodigy": {
    effects: [{
      key: "system.useTheForce.telekinetic",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 to telekinetic Force power checks"
  },

  "Force Perception": {
    effects: [{
      key: "system.useTheForce.senseForce",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 to Sense Force checks"
  },

  "Heightened Awareness": {
    effects: [{
      key: "system.skills.perception.misc",
      mode: 2,
      value: "2",
      priority: 20
    }, {
      key: "system.skills.initiative.misc",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 Perception and Initiative"
  },

  "Force Intuition": {
    effects: [{
      key: "system.useTheForce.initiative",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Use UTF instead of Initiative"
  },

  "Visions": {
    effects: [{
      key: "system.forceVisions",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Gain Force Visions ability"
  },

  "Force Focus": {
    effects: [{
      key: "system.useTheForce.focus",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 to UTF checks to maintain Force powers"
  },

  "Equilibrium": {
    effects: [{
      key: "system.darkSide.equilibrium",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Reduce Dark Side Score gain"
  },

  "Force Point Recovery": {
    effects: [{
      key: "system.forcePoints.recovery",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 Force Point recovery"
  },

  "Jedi Heritage": {
    effects: [{
      key: "system.forcePoints.bonus",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 Force Point bonus"
  },

  "Empower Weapon": {
    effects: [{
      key: "system.lightsaber.empower",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Empower lightsaber damage"
  },

  // ============================================================================
  // LIGHTSABER FORM TALENTS
  // ============================================================================

  "Shii-Cho": {
    effects: [{
      key: "system.lightsaberForm.shiicho",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Shii-Cho lightsaber form"
  },

  "Makashi": {
    effects: [{
      key: "system.lightsaberForm.makashi",
      mode: 5,
      value: "true",
      priority: 20
    }, {
      key: "system.defenses.reflex.vsMelee",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "Makashi form +1 Reflex vs melee"
  },

  "Soresu": {
    effects: [{
      key: "system.lightsaberForm.soresu",
      mode: 5,
      value: "true",
      priority: 20
    }, {
      key: "system.defenses.reflex.vsRanged",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "Soresu form +1 Reflex vs ranged"
  },

  "Shien": {
    effects: [{
      key: "system.lightsaberForm.shien",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Shien lightsaber form"
  },

  "Djem So": {
    effects: [{
      key: "system.lightsaberForm.djemso",
      mode: 5,
      value: "true",
      priority: 20
    }, {
      key: "system.damage.lightsaber",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "Djem So form +1 lightsaber damage"
  },

  "Niman": {
    effects: [{
      key: "system.lightsaberForm.niman",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Niman lightsaber form"
  },

  "Juyo": {
    effects: [{
      key: "system.lightsaberForm.juyo",
      mode: 5,
      value: "true",
      priority: 20
    }, {
      key: "system.attacks.lightsaber",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "Juyo form +2 lightsaber attack"
  },

  "Vaapad": {
    effects: [{
      key: "system.lightsaberForm.vaapad",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Vaapad lightsaber form"
  },

  "Sokan": {
    effects: [{
      key: "system.lightsaberForm.sokan",
      mode: 5,
      value: "true",
      priority: 20
    }, {
      key: "system.speed.bonus",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "Sokan form +1 square speed"
  },

  "Trakata": {
    effects: [{
      key: "system.lightsaberForm.trakata",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Trakata lightsaber form"
  },

  // ============================================================================
  // SPEED TALENTS
  // ============================================================================

  "Evasion": {
    effects: [{
      key: "system.evasion",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Evasion ability"
  },

  "Improved Evasion": {
    effects: [{
      key: "system.improvedEvasion",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Improved Evasion ability"
  },

  "Fleet Footed": {
    effects: [{
      key: "system.speed.base",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 square base speed"
  },

  "Long Stride": {
    effects: [{
      key: "system.speed.base",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 squares base speed"
  },

  "Swift Strider": {
    effects: [{
      key: "system.speed.base",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 square base speed"
  },

  "Rapid Reaction": {
    effects: [{
      key: "system.skills.initiative.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Initiative"
  },

  // ============================================================================
  // HIT POINT TALENTS
  // ============================================================================

  "Toughness": {
    effects: [{
      key: "system.attributes.hp.max",
      mode: 2,
      value: "3",
      priority: 20
    }],
    description: "+3 hit points"
  },

  "Improved Toughness": {
    effects: [{
      key: "system.attributes.hp.max",
      mode: 2,
      value: "6",
      priority: 20
    }],
    description: "+6 hit points"
  },

  "Extra Second Wind": {
    effects: [{
      key: "system.secondWind.uses",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 second wind use per day"
  },

  // ============================================================================
  // SCOUNDREL TALENTS
  // ============================================================================

  "Sneak Attack": {
    effects: [{
      key: "system.sneakAttack.dice",
      mode: 2,
      value: "1d6",
      priority: 20
    }],
    description: "+1d6 sneak attack damage"
  },

  "Improved Sneak Attack": {
    effects: [{
      key: "system.sneakAttack.dice",
      mode: 2,
      value: "1d6",
      priority: 25
    }],
    description: "Additional +1d6 sneak attack damage"
  },

  "Master Sneak Attack": {
    effects: [{
      key: "system.sneakAttack.dice",
      mode: 2,
      value: "1d6",
      priority: 30
    }],
    description: "Additional +1d6 sneak attack damage"
  },

  "Skirmisher": {
    effects: [{
      key: "system.damage.skirmish",
      mode: 2,
      value: "1d6",
      priority: 20
    }],
    description: "+1d6 damage when moving"
  },

  "Improved Skirmisher": {
    effects: [{
      key: "system.damage.skirmish",
      mode: 2,
      value: "1d6",
      priority: 25
    }],
    description: "Additional +1d6 skirmish damage"
  },

  "Lucky Shot": {
    effects: [{
      key: "system.attacks.luckyShot",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Lucky Shot ability"
  },

  "Gambler": {
    effects: [{
      key: "system.gambling.bonus",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 gambling checks"
  },

  "Fortune's Favor": {
    effects: [{
      key: "system.destiny.reroll",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Fortune's Favor reroll ability"
  },

  "Knack": {
    effects: [{
      key: "system.skills.untrained.bonus",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 to untrained skill checks"
  },

  // ============================================================================
  // NOBLE TALENTS
  // ============================================================================

  "Inspire Confidence": {
    effects: [{
      key: "system.inspire.confidence",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Inspire Confidence ability"
  },

  "Inspire Haste": {
    effects: [{
      key: "system.inspire.haste",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Inspire Haste ability"
  },

  "Bolster Ally": {
    effects: [{
      key: "system.inspire.bolster",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Bolster Ally ability"
  },

  "Ignite Fervor": {
    effects: [{
      key: "system.inspire.fervor",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Ignite Fervor ability"
  },

  "Presence": {
    effects: [{
      key: "system.skills.persuasion.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Persuasion"
  },

  "Weaken Resolve": {
    effects: [{
      key: "system.inspire.weakenResolve",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Weaken Resolve ability"
  },

  "Demand Surrender": {
    effects: [{
      key: "system.inspire.demandSurrender",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Demand Surrender ability"
  },

  "Coordinate": {
    effects: [{
      key: "system.coordinate.bonus",
      mode: 2,
      value: "1",
      priority: 20
    }],
    description: "+1 Coordinate bonus"
  },

  "Rally": {
    effects: [{
      key: "system.rally.enabled",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Rally ability"
  },

  // ============================================================================
  // SCOUT TALENTS
  // ============================================================================

  "Acute Senses": {
    effects: [{
      key: "system.skills.perception.misc",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 Perception"
  },

  "Expert Tracker": {
    effects: [{
      key: "system.skills.survival.tracking",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Survival to track"
  },

  "Improved Stealth": {
    effects: [{
      key: "system.skills.stealth.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Stealth"
  },

  "Hidden Movement": {
    effects: [{
      key: "system.stealth.hiddenMovement",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Hidden Movement ability"
  },

  "Total Concealment": {
    effects: [{
      key: "system.stealth.totalConcealment",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Total Concealment ability"
  },

  "Surefooted": {
    effects: [{
      key: "system.movement.surefooted",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Ignore difficult terrain"
  },

  "Bantha Rush": {
    effects: [{
      key: "system.attacks.charge",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 charge attacks"
  },

  "Improved Initiative": {
    effects: [{
      key: "system.skills.initiative.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Initiative"
  },

  // ============================================================================
  // SOLDIER TALENTS
  // ============================================================================

  "Armor Proficiency (Light)": {
    effects: [{
      key: "system.armor.proficiency.light",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Proficient with light armor"
  },

  "Armor Proficiency (Medium)": {
    effects: [{
      key: "system.armor.proficiency.medium",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Proficient with medium armor"
  },

  "Armor Proficiency (Heavy)": {
    effects: [{
      key: "system.armor.proficiency.heavy",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Proficient with heavy armor"
  },

  "Indomitable": {
    effects: [{
      key: "system.condition.indomitable",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Indomitable ability"
  },

  "Battle Hardened": {
    effects: [{
      key: "system.defenses.will.misc",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 Will Defense vs fear"
  },

  "Gun Club": {
    effects: [{
      key: "system.damage.gunClub",
      mode: 2,
      value: "1d6",
      priority: 20
    }],
    description: "+1d6 rifle melee damage"
  },

  "Armored Defense": {
    effects: [{
      key: "system.defenses.reflex.armoredDefense",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Armored Defense ability"
  },

  "Improved Armored Defense": {
    effects: [{
      key: "system.defenses.reflex.improvedArmoredDefense",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Improved Armored Defense"
  },

  // ============================================================================
  // VEHICLE TALENTS
  // ============================================================================

  "Vehicular Combat": {
    effects: [{
      key: "system.vehicle.combat",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Vehicular Combat ability"
  },

  "Full Throttle": {
    effects: [{
      key: "system.vehicle.fullThrottle",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Full Throttle ability"
  },

  "Starship Tactics": {
    effects: [{
      key: "system.vehicle.starshipTactics",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Starship Tactics ability"
  },

  "Attack Pattern Delta": {
    effects: [{
      key: "system.vehicle.attackPattern",
      mode: 5,
      value: "delta",
      priority: 20
    }],
    description: "Attack Pattern Delta"
  },

  "Evasive Action": {
    effects: [{
      key: "system.vehicle.evasiveAction",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Evasive Action ability"
  },

  "Expert Pilot": {
    effects: [{
      key: "system.skills.pilot.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Pilot"
  },

  "Hyperdriven": {
    effects: [{
      key: "system.vehicle.hyperdriven",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Hyperdriven ability"
  },

  // ============================================================================
  // TECH SPECIALIST TALENTS
  // ============================================================================

  "Tech Specialist": {
    effects: [{
      key: "system.skills.mechanics.misc",
      mode: 2,
      value: "2",
      priority: 20
    }, {
      key: "system.skills.useComputer.misc",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 Mechanics and Use Computer"
  },

  "Jury-Rigger": {
    effects: [{
      key: "system.mechanics.juryRig",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Jury-Rig ability"
  },

  "Quick Fix": {
    effects: [{
      key: "system.mechanics.quickFix",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Quick Fix ability"
  },

  "Hotwire": {
    effects: [{
      key: "system.mechanics.hotwire",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Hotwire ability"
  },

  "Master Slicer": {
    effects: [{
      key: "system.skills.useComputer.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Use Computer"
  },

  // ============================================================================
  // FORCE ADEPT TALENTS
  // ============================================================================

  "Force Sensitive": {
    effects: [{
      key: "system.forceSensitive",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Force Sensitive"
  },

  "Strong in the Dark Side": {
    effects: [{
      key: "system.darkSide.strong",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Strong in the Dark Side"
  },

  "Sith Alchemy": {
    effects: [{
      key: "system.sithAlchemy",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Sith Alchemy ability"
  },

  "Dark Healing": {
    effects: [{
      key: "system.darkHealing",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Dark Healing ability"
  },

  "Power of the Dark Side": {
    effects: [{
      key: "system.forcePowers.darkSide.bonus",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 to dark side Force powers"
  },

  // ============================================================================
  // BEAST TALENTS
  // ============================================================================

  "Animal Affinity": {
    effects: [{
      key: "system.skills.ride.misc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Ride"
  },

  "Beast Trick": {
    effects: [{
      key: "system.beastTrick",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Beast Trick ability"
  },

  "Mounted Combat": {
    effects: [{
      key: "system.mounted.combat",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Mounted Combat ability"
  },

  "Mounted Defense": {
    effects: [{
      key: "system.mounted.defense",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Mounted Defense ability"
  },

  // ============================================================================
  // UNARMED COMBAT TALENTS
  // ============================================================================

  "Martial Arts I": {
    effects: [{
      key: "system.unarmed.damage",
      mode: 2,
      value: "1d6",
      priority: 20
    }],
    description: "+1d6 unarmed damage"
  },

  "Martial Arts II": {
    effects: [{
      key: "system.unarmed.damage",
      mode: 2,
      value: "1d6",
      priority: 25
    }],
    description: "Additional +1d6 unarmed damage"
  },

  "Martial Arts III": {
    effects: [{
      key: "system.unarmed.damage",
      mode: 2,
      value: "1d6",
      priority: 30
    }],
    description: "Additional +1d6 unarmed damage"
  },

  "Stunning Strike": {
    effects: [{
      key: "system.unarmed.stunningStrike",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Stunning Strike ability"
  },

  "Unbalance Opponent": {
    effects: [{
      key: "system.combat.unbalance",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Unbalance Opponent ability"
  },

  // ============================================================================
  // DROID TALENTS
  // ============================================================================

  "Droid Defense": {
    effects: [{
      key: "system.defenses.reflex.droid",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "+2 Reflex Defense"
  },

  "Improved Droid Defense": {
    effects: [{
      key: "system.defenses.reflex.droid",
      mode: 2,
      value: "2",
      priority: 25
    }],
    description: "Additional +2 Reflex Defense"
  },

  "Droid Mastery": {
    effects: [{
      key: "system.droid.mastery",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Droid Mastery ability"
  },

  // ============================================================================
  // FORCE POWER ENHANCEMENTS
  // ============================================================================

  "Improved Force Slam": {
    effects: [{
      key: "system.forcePowers.slam.damage",
      mode: 2,
      value: "1d6",
      priority: 20
    }],
    description: "+1d6 Force Slam damage"
  },

  "Improved Force Grip": {
    effects: [{
      key: "system.forcePowers.grip.damage",
      mode: 2,
      value: "1d6",
      priority: 20
    }],
    description: "+1d6 Force Grip damage"
  },

  "Improved Force Lightning": {
    effects: [{
      key: "system.forcePowers.lightning.damage",
      mode: 2,
      value: "1d6",
      priority: 20
    }],
    description: "+1d6 Force Lightning damage"
  },

  "Improved Force Thrust": {
    effects: [{
      key: "system.forcePowers.thrust.damage",
      mode: 2,
      value: "1d6",
      priority: 20
    }],
    description: "+1d6 Force Thrust damage"
  },

  "Improved Mind Trick": {
    effects: [{
      key: "system.forcePowers.mindTrick.dc",
      mode: 2,
      value: "5",
      priority: 20
    }],
    description: "+5 Mind Trick DC"
  },

  "Improved Move Object": {
    effects: [{
      key: "system.forcePowers.moveObject.range",
      mode: 2,
      value: "6",
      priority: 20
    }],
    description: "+6 squares Move Object range"
  },

  "Improved Rebuke": {
    effects: [{
      key: "system.forcePowers.rebuke.damage",
      mode: 2,
      value: "1d6",
      priority: 20
    }],
    description: "+1d6 Rebuke damage"
  },

  // ============================================================================
  // GRAPPLING TALENTS
  // ============================================================================

  "Improved Grab": {
    effects: [{
      key: "system.grapple.improvedGrab",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Improved Grab ability"
  },

  "Crush": {
    effects: [{
      key: "system.grapple.crush",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Crush ability"
  },

  "Pin": {
    effects: [{
      key: "system.grapple.pin",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Pin ability"
  },

  // ============================================================================
  // MISCELLANEOUS TALENTS
  // ============================================================================

  "Linguist": {
    effects: [{
      key: "system.languages.bonus",
      mode: 2,
      value: "3",
      priority: 20
    }],
    description: "+3 bonus languages"
  },

  "Dual Weapon Mastery I": {
    effects: [{
      key: "system.dualWield.penalty",
      mode: 2,
      value: "2",
      priority: 20
    }],
    description: "Reduce dual wield penalty by 2"
  },

  "Dual Weapon Mastery II": {
    effects: [{
      key: "system.dualWield.penalty",
      mode: 2,
      value: "2",
      priority: 25
    }],
    description: "Reduce dual wield penalty by additional 2"
  },

  "Dual Weapon Mastery III": {
    effects: [{
      key: "system.dualWield.extraAttack",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Extra attack with off-hand"
  },

  "Double Attack (Rifles)": {
    effects: [{
      key: "system.doubleAttack.rifles",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Double Attack with rifles"
  },

  "Double Attack (Pistols)": {
    effects: [{
      key: "system.doubleAttack.pistols",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Double Attack with pistols"
  },

  "Double Attack (Lightsabers)": {
    effects: [{
      key: "system.doubleAttack.lightsabers",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Double Attack with lightsabers"
  },

  "Double Attack (Heavy Weapons)": {
    effects: [{
      key: "system.doubleAttack.heavy",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Double Attack with heavy weapons"
  },

  "Double Attack (Advanced Melee Weapons)": {
    effects: [{
      key: "system.doubleAttack.advancedMelee",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Double Attack with advanced melee"
  },

  "Triple Attack (Rifles)": {
    effects: [{
      key: "system.tripleAttack.rifles",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Triple Attack with rifles"
  },

  "Triple Attack (Pistols)": {
    effects: [{
      key: "system.tripleAttack.pistols",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Triple Attack with pistols"
  },

  "Triple Attack (Lightsabers)": {
    effects: [{
      key: "system.tripleAttack.lightsabers",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Triple Attack with lightsabers"
  },

  "Triple Attack (Heavy Weapons)": {
    effects: [{
      key: "system.tripleAttack.heavy",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Triple Attack with heavy weapons"
  },

  "Triple Attack (Advanced Melee Weapons)": {
    effects: [{
      key: "system.tripleAttack.advancedMelee",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Triple Attack with advanced melee"
  },

  // ============================================================================
  // CRITICAL HIT TALENTS
  // ============================================================================

  "Savage Attack": {
    effects: [{
      key: "system.criticalHit.extraDamage",
      mode: 2,
      value: "1d6",
      priority: 20
    }],
    description: "+1d6 critical hit damage"
  },

  "Critical Strike": {
    effects: [{
      key: "system.criticalHit.extendedRange",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Extended critical hit range"
  },

  // ============================================================================
  // LEADERSHIP TALENTS
  // ============================================================================

  "Born Leader": {
    effects: [{
      key: "system.leadership.bornLeader",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Born Leader ability"
  },

  "Commanding Presence": {
    effects: [{
      key: "system.leadership.commandingPresence",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Commanding Presence ability"
  },

  "Lead by Example": {
    effects: [{
      key: "system.leadership.leadByExample",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Lead by Example ability"
  },

  "Share Talent": {
    effects: [{
      key: "system.leadership.shareTalent",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Share Talent ability"
  },

  "Distant Command": {
    effects: [{
      key: "system.leadership.distantCommand",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Distant Command ability"
  },

  "Trust": {
    effects: [{
      key: "system.leadership.trust",
      mode: 5,
      value: "true",
      priority: 20
    }],
    description: "Trust ability"
  }
};

/**
 * Get talent effect definition by name
 * @param {string} talentName - Name of the talent
 * @returns {Object|null} - Effect definition or null if not found
 */
export function getTalentEffects(talentName) {
  return TALENT_EFFECTS[talentName] || null;
}

/**
 * Check if a talent has effects defined
 * @param {string} talentName - Name of the talent
 * @returns {boolean}
 */
export function hasTalentEffects(talentName) {
  return talentName in TALENT_EFFECTS;
}

/**
 * Build Active Effect data for a talent
 * @param {string} talentName - Name of the talent
 * @returns {Array} - Array of Active Effect change objects
 */
export function buildTalentEffectChanges(talentName) {
  const definition = TALENT_EFFECTS[talentName];
  if (!definition) return [];

  return definition.effects.map(effect => ({
    key: effect.key,
    mode: effect.mode,
    value: effect.value,
    priority: effect.priority || 20
  }));
}

/**
 * Create a complete Active Effect document data for a talent
 * @param {string} talentName - Name of the talent
 * @param {string} icon - Icon path
 * @returns {Object|null} - Active Effect document data or null
 */
export function createTalentActiveEffect(talentName, icon = "icons/svg/item-bag.svg") {
  const definition = TALENT_EFFECTS[talentName];
  if (!definition) return null;

  return {
    name: talentName,
    icon: icon,
    changes: buildTalentEffectChanges(talentName),
    disabled: false,
    duration: {},
    flags: {
      swse: {
        source: "talent",
        talentName: talentName
      }
    }
  };
}

/**
 * Get all talent names that have effects defined
 * @returns {Array<string>}
 */
export function getAllDefinedTalents() {
  return Object.keys(TALENT_EFFECTS);
}

/**
 * Get count of defined talent effects
 * @returns {number}
 */
export function getDefinedTalentCount() {
  return Object.keys(TALENT_EFFECTS).length;
}

// Log initialization
console.log(`[SWSE] Talent Effects module loaded with ${getDefinedTalentCount()} talent definitions`);
