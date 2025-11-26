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
      level: new fields.NumberField({required: true, initial: 1, min: 1, max: 20, integer: true}),

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
    const level = this.level || 1;
    this.halfLevel = Math.floor(level / 2);

    // Calculate Condition Track penalty
    // Official SWSE: Normal(0), -1(1), -2(2), -5(3), -10(4), Helpless(5)
    if (this.conditionTrack) {
      const conditionStep = this.conditionTrack.current || 0;
      const penalties = [0, -1, -2, -5, -10, 0]; // Helpless doesn't have numeric penalty
      this.conditionTrack.penalty = penalties[conditionStep] || 0;
    }

    // Calculate armor effects (check penalty and speed reduction) BEFORE skills
    this._calculateArmorEffects();

    // Calculate multiclass BAB and defenses BEFORE calling parent
    this._calculateMulticlassStats();

    // Call parent methods individually (skip parent's prepareDerivedData to avoid wrong level usage)
    this._calculateAbilities();
    this._applyConditionPenalties();
    this._calculateDefenses(); // Use our overridden version
    // NOTE: Do NOT call _calculateBaseAttack() here - BAB is already calculated by _calculateMulticlassStats()
    this._calculateDamageThreshold();
    this._calculateInitiative();

    // Calculate Force Points
    this._calculateForcePoints();

    // Override skill calculations with our static skill system
    this._prepareSkills();
  }

  /**
   * Calculate armor check penalties and speed reduction from equipped armor
   * SWSE Rules:
   * - Armor check penalty applies to: Acrobatics, Climb, Endurance, Initiative, Jump, Stealth, Swim
   * - Armor check penalty also applies to attack rolls when not proficient
   * - Speed reduction: Medium armor -2 squares, Heavy armor -4 squares (if speed >= 6)
   * - Proficiency: Light (-2), Medium (-5), Heavy (-10) penalty when not proficient
   */
  _calculateArmorEffects() {
    const actor = this.parent;
    const equippedArmor = actor?.items?.find(i => i.type === 'armor' && i.system.equipped);

    // Initialize armor effects
    this.armorCheckPenalty = 0;
    this.effectiveSpeed = this.speed || 6;

    if (!equippedArmor) {
      return; // No armor equipped
    }

    const armorType = equippedArmor.system.armorType?.toLowerCase() || 'light';

    // Check for armor proficiency
    const armorProficiencies = actor?.items?.filter(i =>
      (i.type === 'feat' || i.type === 'talent') &&
      i.name.toLowerCase().includes('armor proficiency')
    ) || [];

    // Determine if character is proficient with this armor
    let isProficient = false;
    for (const prof of armorProficiencies) {
      const profName = prof.name.toLowerCase();
      if (profName.includes('light') && armorType === 'light') isProficient = true;
      if (profName.includes('medium') && (armorType === 'light' || armorType === 'medium')) isProficient = true;
      if (profName.includes('heavy')) isProficient = true; // Heavy includes all armor
    }

    // Calculate armor check penalty
    if (isProficient) {
      // Proficient: Use armor's base check penalty
      this.armorCheckPenalty = equippedArmor.system.armorCheckPenalty || 0;
    } else {
      // Not proficient: Additional penalties based on armor type
      const basePenalty = equippedArmor.system.armorCheckPenalty || 0;
      const proficiencyPenalty = {
        'light': -2,
        'medium': -5,
        'heavy': -10
      }[armorType] || -2;
      this.armorCheckPenalty = basePenalty + proficiencyPenalty;
    }

    // Calculate speed reduction
    const baseSpeed = this.speed || 6;
    let speedPenalty = equippedArmor.system.speedPenalty || 0;

    // SWSE standard speed penalties if not specified in armor
    if (speedPenalty === 0 && baseSpeed >= 6) {
      if (armorType === 'medium') {
        speedPenalty = 2;
      } else if (armorType === 'heavy') {
        speedPenalty = 4;
      }
    }

    this.effectiveSpeed = Math.max(1, baseSpeed - speedPenalty);
  }

  /**
   * Override parent's _calculateDefenses to use character level
   */
  _calculateDefenses() {
    // Ensure defenses object exists
    if (!this.defenses) {
      SWSELogger.warn('Character defenses not initialized, skipping defense calculations');
      return;
    }

    const level = this.level || 1;

    // Ensure individual defense objects exist
    if (!this.defenses.reflex || !this.defenses.fortitude || !this.defenses.will) {
      SWSELogger.warn('Character defense sub-objects not initialized, skipping defense calculations');
      return;
    }

    // Get condition track penalty
    const conditionPenalty = this.conditionTrack?.penalty || 0;

    // Get equipped armor
    const actor = this.parent;
    const equippedArmor = actor?.items?.find(i => i.type === 'armor' && i.system.equipped);

    // Check for Armored Defense talents
    const hasArmoredDefense = actor?.items?.some(i =>
      i.type === 'talent' && i.name === 'Armored Defense'
    ) || false;
    const hasImprovedArmoredDefense = actor?.items?.some(i =>
      i.type === 'talent' && i.name === 'Improved Armored Defense'
    ) || false;
    const hasArmorMastery = actor?.items?.some(i =>
      i.type === 'talent' && i.name === 'Armor Mastery'
    ) || false;

    // REFLEX DEFENSE
    let reflexBase = 10;
    let dexMod = this.abilities?.dex?.mod || 0;
    let armorBonus = 0;

    if (equippedArmor) {
      // Get armor bonus (use defenseBonus or armorBonus field)
      armorBonus = equippedArmor.system.defenseBonus || equippedArmor.system.armorBonus || 0;

      // Apply max dex bonus restriction
      let maxDex = equippedArmor.system.maxDexBonus;
      if (maxDex !== null && maxDex !== undefined && Number.isInteger(maxDex)) {
        // Armor Mastery talent increases max dex bonus by +1
        if (hasArmorMastery) {
          maxDex += 1;
        }
        dexMod = Math.min(dexMod, maxDex);
      }

      // Calculate reflex defense based on armor and talents
      // SWSE Rules: Armor bonus REPLACES heroic level unless you have talents
      if (hasImprovedArmoredDefense) {
        // Reflex Defense = max(level + floor(armor/2), armor)
        reflexBase += Math.max(level + Math.floor(armorBonus / 2), armorBonus);
      } else if (hasArmoredDefense) {
        // Reflex Defense = max(level, armor)
        reflexBase += Math.max(level, armorBonus);
      } else {
        // No talent: Armor REPLACES heroic level
        reflexBase += armorBonus;
      }

      // Store armor bonus for reference (used by character sheet)
      this.defenses.reflex.armor = armorBonus;
    } else {
      // No armor equipped: use heroic level
      reflexBase += level;
      this.defenses.reflex.armor = 0;
    }

    this.defenses.reflex.total = reflexBase + dexMod +
                                  (this.defenses.reflex.classBonus || 0) +
                                  (this.defenses.reflex.misc || 0) + conditionPenalty;

    // FORTITUDE DEFENSE
    // Droids use STR mod, organics use CON or STR (whichever is higher)
    let fortAbility;
    if (this.isDroid) {
      fortAbility = this.abilities?.str?.mod || 0;
    } else {
      fortAbility = Math.max(this.abilities?.con?.mod || 0, this.abilities?.str?.mod || 0);
    }

    // Add equipment bonus from armor (always applied)
    const armorFortBonus = equippedArmor?.system.fortBonus || 0;

    this.defenses.fortitude.total = 10 + level + fortAbility + armorFortBonus +
                                     (this.defenses.fortitude.classBonus || 0) +
                                     (this.defenses.fortitude.misc || 0) + conditionPenalty;

    // WILL DEFENSE
    this.defenses.will.total = 10 + level + (this.abilities?.wis?.mod || 0) +
                                (this.defenses.will.classBonus || 0) +
                                (this.defenses.will.misc || 0) + conditionPenalty;
  }

  /**
   * Convert BAB progression string to numeric multiplier
   * @param {string} progression - "slow", "medium", or "fast"
   * @returns {number} - Per-level BAB multiplier
   */
  _convertBabProgression(progression) {
    if (typeof progression === 'number') return progression;

    const progressionMap = {
      'slow': 0.5,
      'medium': 0.75,
      'fast': 1.0
    };

    return progressionMap[progression] || 0.75; // default to medium
  }

  /**
   * Calculate BAB and defenses for multiclassed characters
   * SWSE Rules:
   * - BAB is additive across all classes
   * - Defense bonuses are FLAT per class and do NOT scale with class level
   * - When multiclassing, use the HIGHEST defense bonus from any class (not additive)
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

    // Calculate total BAB (additive across all classes)
    let totalBAB = 0;

    // Track highest FLAT defense bonuses (not additive, just take max)
    let maxFortBonus = 0;
    let maxRefBonus = 0;
    let maxWillBonus = 0;

    for (const classItem of classItems) {
      const classLevel = classItem.system.level || 1;
      const classData = classItem.system;

      // BAB - Add from each class (SWSE multiclass rule: additive)
      // Convert string progression to numeric multiplier
      const babProgression = this._convertBabProgression(classData.babProgression);
      const classBab = Math.floor(classLevel * babProgression);
      totalBAB += classBab;

      // Defenses - Track maximum FLAT bonus from any class (SWSE multiclass rule: highest wins)
      // Defense bonuses do NOT scale with class level - they are flat per class
      // Example: Jedi gives +1/+1/+1 at all levels, Jedi Knight gives +2/+2/+2 at all levels
      const classFort = Number(classData.defenses?.fortitude) || 0;
      const classRef = Number(classData.defenses?.reflex) || 0;
      const classWill = Number(classData.defenses?.will) || 0;

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
      acrobatics: { defaultAbility: 'dex', untrained: true, armorPenalty: true },
      climb: { defaultAbility: 'str', untrained: true, armorPenalty: true },
      deception: { defaultAbility: 'cha', untrained: true, armorPenalty: false },
      endurance: { defaultAbility: 'con', untrained: true, armorPenalty: true },
      gather_information: { defaultAbility: 'cha', untrained: true, armorPenalty: false },
      initiative: { defaultAbility: 'dex', untrained: true, armorPenalty: true },
      jump: { defaultAbility: 'str', untrained: true, armorPenalty: true },
      knowledge_bureaucracy: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledge_galactic_lore: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledge_life_sciences: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledge_physical_sciences: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledge_social_sciences: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledge_tactics: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledge_technology: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      mechanics: { defaultAbility: 'int', untrained: true, armorPenalty: false },
      perception: { defaultAbility: 'wis', untrained: true, armorPenalty: false },
      persuasion: { defaultAbility: 'cha', untrained: true, armorPenalty: false },
      pilot: { defaultAbility: 'dex', untrained: true, armorPenalty: false },
      ride: { defaultAbility: 'dex', untrained: true, armorPenalty: false },
      stealth: { defaultAbility: 'dex', untrained: true, armorPenalty: true },
      survival: { defaultAbility: 'wis', untrained: true, armorPenalty: false },
      swim: { defaultAbility: 'str', untrained: true, armorPenalty: true },
      treat_injury: { defaultAbility: 'wis', untrained: true, armorPenalty: false },
      use_computer: { defaultAbility: 'int', untrained: true, armorPenalty: false },
      use_the_force: { defaultAbility: 'cha', untrained: false, armorPenalty: false }
    };

    // Use the already calculated halfLevel property
    const halfLevel = this.halfLevel || 0;

    // Get armor check penalty (calculated in _calculateArmorEffects)
    const armorCheckPenalty = this.armorCheckPenalty || 0;

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

      // Apply armor check penalty if this skill is affected
      if (data.armorPenalty && armorCheckPenalty !== 0) {
        total += armorCheckPenalty; // Note: penalty is negative, so we add it
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

    const level = this.level || 1;

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
