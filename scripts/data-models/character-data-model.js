import { SWSELogger } from '../utils/logger.js';
import { SWSEActorDataModel } from './actor-data-model.js';

export class SWSECharacterDataModel extends SWSEActorDataModel {

  /**
   * Helper: Create an attribute schema (base, racial, enhancement, temp)
   */
  static _createAttributeSchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({required: true, initial: 10, integer: true}),
      racial: new fields.NumberField({required: true, initial: 0, integer: true}),
      enhancement: new fields.NumberField({required: true, initial: 0, integer: true}),
      temp: new fields.NumberField({required: true, initial: 0, integer: true})
    };
  }

  /**
   * Helper: Create a skill schema
   */
  static _createSkillSchema(defaultAbility) {
    const fields = foundry.data.fields;
    return {
      trained: new fields.BooleanField({required: true, initial: false}),
      focused: new fields.BooleanField({required: true, initial: false}),
      miscMod: new fields.NumberField({required: true, initial: 0, integer: true}),
      selectedAbility: new fields.StringField({required: true, initial: defaultAbility})
    };
  }

  /**
   * Define all skills with their default abilities
   */
  static _getSkillDefinitions() {
    return {
      acrobatics: 'dex',
      climb: 'str',
      deception: 'cha',
      endurance: 'con',
      gather_information: 'cha',
      initiative: 'dex',
      jump: 'str',
      knowledge_bureaucracy: 'int',
      knowledge_galactic_lore: 'int',
      knowledge_life_sciences: 'int',
      knowledge_physical_sciences: 'int',
      knowledge_social_sciences: 'int',
      knowledge_tactics: 'int',
      knowledge_technology: 'int',
      mechanics: 'int',
      perception: 'wis',
      persuasion: 'cha',
      pilot: 'dex',
      ride: 'dex',
      stealth: 'dex',
      survival: 'wis',
      swim: 'str',
      treat_injury: 'wis',
      use_computer: 'int',
      use_the_force: 'cha'
    };
  }

  static defineSchema() {
    const fields = foundry.data.fields;
    const parentSchema = super.defineSchema();

    // Build attributes schema from all ability scores
    const attributeSchema = {};
    for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      attributeSchema[ability] = new fields.SchemaField(this._createAttributeSchema());
    }

    // Build skills schema from skill definitions
    const skillsSchema = {};
    const skillDefinitions = this._getSkillDefinitions();
    for (const [skillKey, defaultAbility] of Object.entries(skillDefinitions)) {
      skillsSchema[skillKey] = new fields.SchemaField(this._createSkillSchema(defaultAbility));
    }

    return {
      ...parentSchema, // Inherit all parent fields (size, defenses, abilities, etc.)

      // Droid Status
      isDroid: new fields.BooleanField({required: true, initial: false}),
      droidDegree: new fields.StringField({required: false, initial: ""}),

      // Attributes (override parent abilities with enhanced attributes)
      attributes: new fields.SchemaField(attributeSchema),

      // STATIC SKILLS - Always present
      skills: new fields.SchemaField(skillsSchema),

      // HP
      hp: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 30, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 30, min: 1, integer: true}),
        temp: new fields.NumberField({required: true, initial: 0, integer: true})
      }),


      // Condition Track
      conditionTrack: new fields.SchemaField({
        current: new fields.NumberField({required: true, initial: 0, min: 0, max: 5, integer: true}),
        persistent: new fields.BooleanField({required: true, initial: false}),
        penalty: new fields.NumberField({required: true, initial: 0, integer: true})
      }),

      // Level
      level: new fields.SchemaField({
        heroic: new fields.NumberField({required: true, initial: 1, min: 1, max: 20, integer: true})
      }),

      // Biography
      biography: new fields.StringField({required: false, initial: ""})
    };
  }

  prepareDerivedData() {
    // Ensure attributes exist
    if (!this.attributes) {
      this.attributes = {
        str: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        con: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        int: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        wis: { base: 10, racial: 0, enhancement: 0, temp: 0 },
        cha: { base: 10, racial: 0, enhancement: 0, temp: 0 }
      };
    }

    // Calculate ability modifiers for attributes
    for (const [key, ability] of Object.entries(this.attributes)) {
      const total = ability.base + ability.racial + ability.enhancement + ability.temp;
      ability.total = total;
      ability.mod = Math.floor((total - 10) / 2);
    }

    // Create abilities alias for parent class compatibility
    if (!this.abilities) {
      this.abilities = {};
      for (const [key, attr] of Object.entries(this.attributes)) {
        this.abilities[key] = {
          base: attr.base || 10,
          racial: attr.racial || 0,
          misc: (attr.enhancement || 0) + (attr.temp || 0),
          total: attr.total || 10,
          mod: attr.mod || 0
        };
      }
    }

    // Calculate half level (for skills and other calculations)
    const heroicLevel = this.level?.heroic || 1;
    this.halfLevel = Math.floor(heroicLevel / 2);

    // Calculate Condition Track penalty
    // Official SWSE: Normal(0), -1(1), -2(2), -5(3), -10(4), Helpless(5)
    if (this.conditionTrack) {
      const conditionStep = this.conditionTrack.current || 0;
      const penalties = [0, -1, -2, -5, -10, 0]; // Helpless doesn't have numeric penalty
      this.conditionTrack.penalty = penalties[conditionStep] || 0;
    }

    // Calculate multiclass BAB and defenses BEFORE calling parent
    this._calculateMulticlassStats();

    // Call parent methods individually (skip parent's prepareDerivedData to avoid wrong level usage)
    this._calculateAbilities();
    this._applyConditionPenalties();
    this._calculateDefenses(); // Use our overridden version
    this._calculateBaseAttack();
    this._calculateDamageThreshold();
    this._calculateInitiative();

    // Calculate Force Points
    this._calculateForcePoints();

    // Override skill calculations with our static skill system
    this._prepareSkills();
  }

  /**
   * Override parent's _calculateDefenses to use character level structure
   * Characters have level.heroic instead of level as a number
   */
  _calculateDefenses() {
    // Ensure defenses object exists
    if (!this.defenses) {
      SWSELogger.warn('Character defenses not initialized, skipping defense calculations');
      return;
    }

    const level = this.level?.heroic || 1;

    // Ensure individual defense objects exist
    if (!this.defenses.reflex || !this.defenses.fortitude || !this.defenses.will) {
      SWSELogger.warn('Character defense sub-objects not initialized, skipping defense calculations');
      return;
    }

    // Get condition track penalty
    const conditionPenalty = this.conditionTrack?.penalty || 0;

    // Reflex Defense = 10 + armor bonus OR level (whichever is higher) + Dex mod + class bonus + misc + condition penalty
    const reflexArmor = this.defenses.reflex.armor > 0 ? this.defenses.reflex.armor : level;
    this.defenses.reflex.total = 10 + reflexArmor + (this.abilities?.dex?.mod || 0) +
                                  (this.defenses.reflex.classBonus || 0) +
                                  (this.defenses.reflex.misc || 0) + conditionPenalty;

    // Fortitude Defense = 10 + level + Con or Str mod (whichever is higher) + class bonus + misc + condition penalty
    const fortAbility = Math.max(this.abilities?.con?.mod || 0, this.abilities?.str?.mod || 0);
    this.defenses.fortitude.total = 10 + level + fortAbility +
                                     (this.defenses.fortitude.classBonus || 0) +
                                     (this.defenses.fortitude.misc || 0) + conditionPenalty;

    // Will Defense = 10 + level + Wis mod + class bonus + misc + condition penalty
    this.defenses.will.total = 10 + level + (this.abilities?.wis?.mod || 0) +
                                (this.defenses.will.classBonus || 0) +
                                (this.defenses.will.misc || 0) + conditionPenalty;
  }

  /**
   * Calculate BAB and defenses for multiclassed characters
   * SWSE Rules:
   * - BAB is additive across all classes
   * - Defenses take the highest bonus from any class for each defense type
   */
  _calculateMulticlassStats() {
    // Get actor instance to access items
    const actor = this.parent;
    if (!actor || !actor.items) return;

    // Get all class items
    const classItems = actor.items.filter(i => i.type === 'class');

    if (classItems.length === 0) {
      // No classes, use defaults
      this.bab = 0;
      if (this.defenses) {
        this.defenses.fortitude.classBonus = 0;
        this.defenses.reflex.classBonus = 0;
        this.defenses.will.classBonus = 0;
      }
      return;
    }

    // Calculate total BAB (additive)
    let totalBAB = 0;

    // Track highest defense bonuses
    let maxFortBonus = 0;
    let maxRefBonus = 0;
    let maxWillBonus = 0;

    for (const classItem of classItems) {
      const classLevel = classItem.system.level || 1;
      const classData = classItem.system;

      // BAB - Add from each class (SWSE multiclass rule)
      const babProgression = Number(classData.babProgression) || 0.75;
      const classBab = Math.floor(classLevel * babProgression);
      totalBAB += classBab;

      // Defenses - Track maximum for each (SWSE multiclass rule)
      const fortPerLevel = Number(classData.defenses?.fortitude) || 0;
      const refPerLevel = Number(classData.defenses?.reflex) || 0;
      const willPerLevel = Number(classData.defenses?.will) || 0;

      const classFort = fortPerLevel * classLevel;
      const classRef = refPerLevel * classLevel;
      const classWill = willPerLevel * classLevel;

      maxFortBonus = Math.max(maxFortBonus, classFort);
      maxRefBonus = Math.max(maxRefBonus, classRef);
      maxWillBonus = Math.max(maxWillBonus, classWill);
    }

    // Set calculated values
    this.bab = totalBAB;
    this.baseAttack = totalBAB; // For compatibility

    // Set defense class bonuses (these get added in parent's _calculateDefenses)
    if (this.defenses) {
      this.defenses.fortitude.classBonus = maxFortBonus;
      this.defenses.reflex.classBonus = maxRefBonus;
      this.defenses.will.classBonus = maxWillBonus;
    }
  }

  _prepareSkills() {
    const skillData = {
      acrobatics: { defaultAbility: 'dex', untrained: true },
      climb: { defaultAbility: 'str', untrained: true },
      deception: { defaultAbility: 'cha', untrained: true },
      endurance: { defaultAbility: 'con', untrained: true },
      gather_information: { defaultAbility: 'cha', untrained: true },
      initiative: { defaultAbility: 'dex', untrained: true },
      jump: { defaultAbility: 'str', untrained: true },
      knowledge_bureaucracy: { defaultAbility: 'int', untrained: false },
      knowledge_galactic_lore: { defaultAbility: 'int', untrained: false },
      knowledge_life_sciences: { defaultAbility: 'int', untrained: false },
      knowledge_physical_sciences: { defaultAbility: 'int', untrained: false },
      knowledge_social_sciences: { defaultAbility: 'int', untrained: false },
      knowledge_tactics: { defaultAbility: 'int', untrained: false },
      knowledge_technology: { defaultAbility: 'int', untrained: false },
      mechanics: { defaultAbility: 'int', untrained: true },
      perception: { defaultAbility: 'wis', untrained: true },
      persuasion: { defaultAbility: 'cha', untrained: true },
      pilot: { defaultAbility: 'dex', untrained: true },
      ride: { defaultAbility: 'dex', untrained: true },
      stealth: { defaultAbility: 'dex', untrained: true },
      survival: { defaultAbility: 'wis', untrained: true },
      swim: { defaultAbility: 'str', untrained: true },
      treat_injury: { defaultAbility: 'wis', untrained: true },
      use_computer: { defaultAbility: 'int', untrained: true },
      use_the_force: { defaultAbility: 'cha', untrained: false }
    };

    // Use the already calculated halfLevel property
    const halfLevel = this.halfLevel || 0;

    // Droids can only use these skills untrained (unless they have Heuristic Processor)
    const droidUntrainedSkills = ['acrobatics', 'climb', 'jump', 'perception'];

    for (const [skillKey, skill] of Object.entries(this.skills)) {
      const data = skillData[skillKey];
      if (!data) continue;

      // Use selectedAbility if set, otherwise use default
      const abilityKey = skill.selectedAbility || data.defaultAbility;
      const abilityMod = this.attributes[abilityKey]?.mod || 0;

      // Calculate total bonus
      let total = abilityMod + (skill.miscMod || 0);

      // Add training bonus (+5)
      if (skill.trained) {
        total += 5;
      }

      // Add half level (always, even untrained)
      total += halfLevel;

      // Add skill focus bonus (+5 if focused checkbox is checked)
      if (skill.focused) {
        total += 5;
      }

      // Determine if skill can be used untrained
      let canUseUntrained = data.untrained;

      // Droids have restricted untrained skills
      if (this.isDroid && !skill.trained) {
        canUseUntrained = droidUntrainedSkills.includes(skillKey);
        // TODO: Check for Heuristic Processor feat to override this
      }

      // Store calculated values
      skill.total = total;
      skill.ability = abilityKey;  // Store the selected ability
      skill.abilityMod = abilityMod;
      skill.defaultAbility = data.defaultAbility;  // Store default for reference
      skill.untrained = canUseUntrained;
      skill.canUse = skill.trained || canUseUntrained;
    }
  }

  _calculateForcePoints() {
    // Ensure forcePoints exists
    if (!this.forcePoints) {
      this.forcePoints = { value: 5, max: 5, die: "1d6" };
    }

    const level = this.level?.heroic || 1;

    // Check for daily Force Points optional rule
    const useDailyForcePoints = game.settings?.get('swse', 'dailyForcePoints') || false;

    if (useDailyForcePoints) {
      // Daily Force Points based on level ranges
      // 1-5: 1 FP, 6-10: 2 FP, 11-15: 3 FP, 16+: 4 FP
      if (level >= 16) {
        this.forcePoints.max = 4;
      } else if (level >= 11) {
        this.forcePoints.max = 3;
      } else if (level >= 6) {
        this.forcePoints.max = 2;
      } else {
        this.forcePoints.max = 1;
      }
    } else {
      // Standard Force Points: 5 + half level (rounded down)
      this.forcePoints.max = 5 + Math.floor(level / 2);
    }

    // Calculate Force Point die based on level
    // 1-7: 1d6, 8-14: 2d6 (take highest), 15+: 3d6 (take highest)
    if (level >= 15) {
      this.forcePoints.die = "3d6";
    } else if (level >= 8) {
      this.forcePoints.die = "2d6";
    } else {
      this.forcePoints.die = "1d6";
    }
  }
}
