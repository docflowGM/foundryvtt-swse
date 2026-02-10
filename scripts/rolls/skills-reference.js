import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';
/**
 * ==============================================
 * SWSE SKILLS - DATA MODEL & CALCULATIONS
 * Qassets/uick reference for implementation
 * ==============================================
 */

/**
 * COMPLETE SKILLS DATA STRUCTURE
 * Add this to your actor's system schema
 */
const SKILLS_DATA_MODEL = {
  acrobatics: {
    ability: 'dexterity',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  climb: {
    ability: 'strength',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  deception: {
    ability: 'charisma',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  endurance: {
    ability: 'constitution',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  gatherInformation: {
    ability: 'charisma',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  initiative: {
    ability: 'dexterity',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  jump: {
    ability: 'strength',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  knowledge: {
    ability: 'intelligence',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  mechanics: {
    ability: 'intelligence',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  perception: {
    ability: 'wisdom',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  persuasion: {
    ability: 'charisma',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  pilot: {
    ability: 'dexterity',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  ride: {
    ability: 'dexterity',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  stealth: {
    ability: 'dexterity',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  survival: {
    ability: 'wisdom',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  swim: {
    ability: 'strength',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  treatInjury: {
    ability: 'wisdom',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  useComputer: {
    ability: 'intelligence',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0
  },
  useTheForce: {
    ability: 'charisma',
    trained: false,
    focused: false,
    armor: 0,
    misc: 0,
    total: 0,
    trainedOnly: true  // Special: requires Force Sensitivity
  }
};

/**
 * SKILL CALCULATION FORMULAS
 * Implement these in your Actor's prepareData() or prepareDerivedData()
 */

/**
 * Calculate all skill totals
 * Call this in your Actor's prepareData() method
 */
function calculateSkills(actor) {
  const halfLevel = getEffectiveHalfLevel(actor);
  const abilities = actor.system.attributes;

  // Ability name mapping (convert skill ability to actual ability key)
  const abilityMap = {
    'strength': 'str',
    'dexterity': 'dex',
    'constitution': 'con',
    'intelligence': 'int',
    'wisdom': 'wis',
    'charisma': 'cha'
  };

  for (const [skillKey, skill] of Object.entries(actor.system.skills)) {
    // Get the ability modifier
    const abilityKey = abilityMap[skill.selectedAbility] || skill.selectedAbility;
    const ability = abilities[abilityKey];
    const abilityMod = calculateAbilityModifier(ability?.total || 10);

    // Calculate total
    skill.total =
      abilityMod +           // Ability modifier
      halfLevel +             // Half character level
      (skill.trained ? 5 : 0) +  // Trained bonus
      (skill.focused ? 5 : 0) +  // Skill Focus bonus
      (skill.miscMod || 0);      // Miscellaneous modifiers

    // Special case: Use the Force requires training
    if (skillKey === 'useTheForce' && !skill.trained) {
      skill.total = 0;  // Untrained use not allowed
    }
  }
}

/**
 * Calculate ability modifier from ability score
 */
function calculateAbilityModifier(abilityScore) {
  return Math.floor((abilityScore - 10) / 2);
}

/**
 * Get skill modifier including temporary bonuses
 */
function getSkillModifier(actor, skillKey, options = {}) {
  const skill = actor.system.skills[skillKey];
  if (!skill) {return 0;}

  let total = skill.total;

  // Add temporary modifiers
  if (options.cover) {total += 2;}  // Cover bonus
  if (options.concealment) {total += 2;}  // Concealment bonus
  if (options.situational) {total += (options.situational || 0);}

  return total;
}

/**
 * ==============================================
 * EXAMPLE ACTOR INTEGRATION
 * ==============================================
 */

/**
 * Example Actor class with skill calculations
 */
class SWSEActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();

    // Calculate half level
    const level = this.system.level || 1;
    this.system.halfLevel = getEffectiveHalfLevel(this);

    // Calculate ability modifiers
    for (const [key, ability] of Object.entries(this.system.attributes)) {
      ability.total = (ability.base || 10) + (ability.racial || 0) + (ability.misc || 0);
      ability.mod = Math.floor((ability.total - 10) / 2);
    }

    // Calculate all skills
    this._calculateSkills();

    // Calculate initiative (same as Initiative skill)
    this.system.initiative = this.system.skills.initiative.total;

    // Calculate defenses
    this._calculateDefenses();
  }

  _calculateSkills() {
    const halfLevel = this.system.halfLevel;
    const abilities = this.system.attributes;
    const conditionPenalty = this.system.conditionTrack?.penalty || 0;

    const abilityMap = {
      'strength': 'str',
      'dexterity': 'dex',
      'constitution': 'con',
      'intelligence': 'int',
      'wisdom': 'wis',
      'charisma': 'cha'
    };

    for (const [skillKey, skill] of Object.entries(this.system.skills)) {
      const abilityKey = abilityMap[skill.selectedAbility];
      const abilityMod = abilities[abilityKey]?.mod || 0;

      skill.total =
        abilityMod +
        halfLevel +
        (skill.trained ? 5 : 0) +
        (skill.focused ? 5 : 0) +
        (skill.miscMod || 0) +
        conditionPenalty;

      // Use the Force requires training
      if (skillKey === 'useTheForce' && !skill.trained) {
        skill.total = 0;
      }
    }
  }

  _calculateDefenses() {
    const halfLevel = this.system.halfLevel;
    const abilities = this.system.attributes;

    // Reflex Defense
    const reflexDef = this.system.defenses.reflex;
    const reflexAbilityMod = abilities[reflexDef.abilityMod]?.mod || 0;
    reflexDef.total =
      10 +
      (reflexDef.levelArmor || 0) +
      (reflexDef.classBonus || 0) +
      reflexAbilityMod +
      (reflexDef.misc || 0);

    // Fortitude Defense
    const fortDef = this.system.defenses.fortitude;
    const fortAbilityMod = abilities[fortDef.abilityMod]?.mod || 0;
    fortDef.total =
      10 +
      (fortDef.levelArmor || 0) +
      (fortDef.classBonus || 0) +
      fortAbilityMod +
      (fortDef.misc || 0);

    // Will Defense
    const willDef = this.system.defenses.will;
    const willAbilityMod = abilities[willDef.abilityMod]?.mod || 0;
    willDef.total =
      10 +
      (willDef.levelArmor || 0) +
      (willDef.classBonus || 0) +
      willAbilityMod +
      (willDef.misc || 0);
  }

  /**
   * Roll a skill check
   */
  async rollSkill(skillKey, options = {}) {
    const skill = this.system.skills[skillKey];
    if (!skill) {
      ui.notifications.warn(`Skill ${skillKey} not found`);
      return null;
    }

    // Check for trained-only skills
    if (skill.trainedOnly && !skill.trained) {
      ui.notifications.warn(`${skillKey} requires training`);
      return null;
    }

    const modifier = this.getSkillModifier(skillKey, options);
    const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${modifier}`).evaluate({ async: true });

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${skillKey} Check (${modifier >= 0 ? '+' : ''}${modifier})`
    } , { create: true });

    return roll;
  }

  /**
   * Get skill modifier with options
   */
  getSkillModifier(skillKey, options = {}) {
    const skill = this.system.skills[skillKey];
    if (!skill) {return 0;}

    let total = skill.total;

    // Add temporary modifiers
    if (options.cover) {total += 2;}
    if (options.concealment) {total += 2;}
    if (options.situational) {total += options.situational;}

    return total;
  }
}

/**
 * ==============================================
 * SKILL CLASS ASSOCIATIONS
 * Which classes get which skills as class skills
 * ==============================================
 */
const CLASS_SKILLS = {
  Jedi: [
    'acrobatics', 'endurance', 'initiative', 'jump', 'knowledge',
    'mechanics', 'perception', 'pilot', 'useTheForce'
  ],
  Noble: [
    'deception', 'gatherInformation', 'initiative', 'knowledge',
    'perception', 'persuasion', 'pilot', 'ride', 'treatInjury', 'useComputer'
  ],
  Scoundrel: [
    'acrobatics', 'deception', 'gatherInformation', 'initiative',
    'knowledge', 'mechanics', 'perception', 'persuasion', 'pilot',
    'stealth', 'useComputer'
  ],
  Scout: [
    'climb', 'endurance', 'initiative', 'jump', 'knowledge',
    'mechanics', 'perception', 'pilot', 'stealth', 'survival', 'swim'
  ],
  Soldier: [
    'climb', 'endurance', 'initiative', 'jump', 'mechanics',
    'perception', 'pilot', 'swim', 'treatInjury', 'useComputer'
  ]
};

/**
 * Check if a skill is a class skill
 */
function isClassSkill(className, skillKey) {
  return CLASS_SKILLS[className]?.includes(skillKey) || false;
}

/**
 * ==============================================
 * ARMOR PENALTIES
 * Skills affected by armor
 * ==============================================
 */
const ARMOR_PENALTY_SKILLS = [
  'acrobatics',
  'climb',
  'jump',
  'stealth',
  'swim'
];

/**
 * Calculate armor penalty for a skill
 */
function calculateArmorPenalty(actor, skillKey) {
  if (!ARMOR_PENALTY_SKILLS.includes(skillKey)) {
    return 0;
  }

  const armor = actor.system.armor;
  let penalty = 0;

  // Max Dex Bonus affects these skills
  if (armor.maxDexBonus !== null && armor.maxDexBonus !== undefined) {
    const dexMod = actor.system.attributes.dex.mod;
    penalty = Math.max(0, dexMod - armor.maxDexBonus);
  }

  return -penalty;  // Negative value
}

/**
 * ==============================================
 * EXPORTED UTILITIES
 * ==============================================
 */
export {
  SKILLS_DATA_MODEL,
  CLASS_SKILLS,
  ARMOR_PENALTY_SKILLS,
  calculateSkills,
  calculateAbilityModifier,
  getSkillModifier,
  isClassSkill,
  calculateArmorPenalty
};
