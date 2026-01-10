import { DefenseSystem } from "../engine/DefenseSystem.js";
import { SWSELogger } from '../utils/logger.js';
import { SWSEActorDataModel } from './actor-data-model.js';
import { SpeciesTraitEngine } from '../species/species-trait-engine.js';

export class SWSECharacterDataModel extends SWSEActorDataModel {

  /**
   * Helper: Create an attribute schema (base, racial, enhancement, temp)
   */
  static _createAttributeSchema() {
    if (!foundry?.data?.fields) {
      throw new Error('Foundry data fields not available - system initialization error');
    }
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
    if (!foundry?.data?.fields) {
      throw new Error('Foundry data fields not available - system initialization error');
    }
    const fields = foundry.data.fields;
    return {
      trained: new fields.BooleanField({required: true, initial: false}),
      focused: new fields.BooleanField({required: true, initial: false}),
      miscMod: new fields.NumberField({required: true, initial: 0, integer: true}),
      selectedAbility: new fields.StringField({required: true, initial: defaultAbility}),
      favorite: new fields.BooleanField({required: true, initial: false})
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
      gatherInformation: 'cha',
      initiative: 'dex',
      jump: 'str',
      knowledgeBureaucracy: 'int',
      knowledgeGalacticLore: 'int',
      knowledgeLifeSciences: 'int',
      knowledgePhysicalSciences: 'int',
      knowledgeSocialSciences: 'int',
      knowledgeTactics: 'int',
      knowledgeTechnology: 'int',
      mechanics: 'int',
      perception: 'wis',
      persuasion: 'cha',
      pilot: 'dex',
      ride: 'dex',
      stealth: 'dex',
      survival: 'wis',
      swim: 'str',
      treatInjury: 'wis',
      useComputer: 'int',
      useTheForce: 'cha'
    };
  }

  static defineSchema() {
    if (!foundry?.data?.fields) {
      throw new Error('Foundry data fields not available - system initialization error');
    }
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
        temp: new fields.NumberField({required: true, initial: 0, integer: true}),
        bonus: new fields.NumberField({required: true, initial: 0, integer: true})
      }),


      // Condition Track
      conditionTrack: new fields.SchemaField({
        current: new fields.NumberField({required: true, initial: 0, min: 0, max: 5, integer: true}),
        persistent: new fields.BooleanField({required: true, initial: false}),
        penalty: new fields.NumberField({required: true, initial: 0, integer: true})
      }),

      // Level
      level: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 20,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 1;
          const num = Number(value);
          return Number.isNaN(num) ? 1 : Math.floor(num);
        }
      }),

      // Destiny Points
      destinyPoints: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 0, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 0, min: 0, integer: true})
      }),

      // Destiny
      destiny: new fields.SchemaField({
        hasDestiny: new fields.BooleanField({required: true, initial: false}),
        type: new fields.StringField({required: false, initial: ""}),
        fulfilled: new fields.BooleanField({required: true, initial: false}),
        secret: new fields.BooleanField({required: true, initial: false})
      }),

      // Biography
      biography: new fields.StringField({required: false, initial: ""}),

      // Background information for Biography tab
      event: new fields.StringField({required: false, initial: ""}),
      profession: new fields.StringField({required: false, initial: ""}),
      planetOfOrigin: new fields.StringField({required: false, initial: ""}),

      // SWSE-specific system data (mentor survey, build intent, etc.)
      swse: new fields.SchemaField({
        mentorSurveyCompleted: new fields.BooleanField({required: true, initial: false}),
        mentorBuildIntentBiases: new fields.ObjectField({required: true, initial: {}}),
        surveyResponses: new fields.ObjectField({required: true, initial: {}})
      })
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
    // IMPORTANT: ALWAYS update this, don't use if (!this.abilities) conditional
    // because after initial creation, abilities will already exist in the template,
    // and the conditional would prevent recalculation during levelup.
    // This causes ability modifiers to stay at template default (0) instead of using
    // the freshly calculated mod values.
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

    // Apply species trait bonuses BEFORE defense calculation
    this._applySpeciesTraitBonuses();

    this._calculateDefenses(); // Use our overridden version
    // NOTE: Do NOT call _calculateBaseAttack() here - BAB is already calculated by _calculateMulticlassStats()
    this._calculateDamageThreshold();

    // Calculate Force Points
    this._calculateForcePoints();

    // Calculate Destiny Points
    this._calculateDestinyPoints();

    // Override skill calculations with our static skill system
    this._prepareSkills();

    // Calculate initiative AFTER skills are prepared (initiative is a skill)
    this._calculateInitiative();
  }

  /**
   * Calculate armor check penalties and speed reduction from equipped armor
   * SWSE Rules:
   * - Armor check penalty applies to: Acrobatics, Climb, Endurance, Initiative, Jump, Stealth, Swim
   * - Armor check penalty also applies to attack rolls when not proficient
   * - Speed reduction: Medium armor -2 squares, Heavy armor -4 squares (if speed >= 6)
   * - Proficiency: Light (-2), Medium (-5), Heavy (-10) penalty when not proficient
   * - When not proficient, you do NOT gain armor's equipment bonuses
   */
  _calculateArmorEffects() {
    const actor = this.parent;
    const equippedArmor = actor?.items?.find(i => i.type === 'armor' && i.system.equipped);

    // Initialize armor effects
    this.armorCheckPenalty = 0;
    this.effectiveSpeed = this.speed || 6;
    this.armorProficient = true; // Track proficiency status for other calculations

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

    // Store proficiency status for use in defense calculations
    this.armorProficient = isProficient;

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
   * NONHEROIC RULE: Only HEROIC class levels add to defense
   */
  _calculateDefenses() {
    // Ensure defenses object exists
    if (!this.defenses) {
      SWSELogger.warn('Character defenses not initialized, skipping defense calculations');
      return;
    }

    // Use heroicLevel for defense calculations (nonheroic levels don't add to defense)
    // If heroicLevel isn't set yet (before _calculateMulticlassStats), fall back to total level
    const level = this.heroicLevel ?? this.level ?? 1;

    // Ensure individual defense objects exist
    if (!this.defenses.reflex || !this.defenses.fort || !this.defenses.will) {
      SWSELogger.warn('Character defense sub-objects not initialized, skipping defense calculations');
      return;
    }

    // Get condition track penalty
    const conditionPenalty = this.conditionTrack?.penalty || 0;

    // Get equipped armor
    const actor = this.parent;
    const equippedArmor = actor?.items?.find(i => i.type === 'armor' && i.system.equipped);

    // Check for Armored Defense talents
    const talentArmoredDefense = actor?.items?.some(i =>
      i.type === 'talent' && i.name === 'Armored Defense'
    ) || false;
    const hasImprovedArmoredDefense = actor?.items?.some(i =>
      i.type === 'talent' && i.name === 'Improved Armored Defense'
    ) || false;
    const hasArmorMastery = actor?.items?.some(i =>
      i.type === 'talent' && i.name === 'Armor Mastery'
    ) || false;

    // Check for armoredDefenseForAll house rule - all characters get Armored Defense benefit
    const armoredDefenseForAll = game.settings?.get('foundryvtt-swse', 'armoredDefenseForAll') || false;
    const hasArmoredDefense = talentArmoredDefense || armoredDefenseForAll;

    // REFLEX DEFENSE
    let reflexBase = 10;
    let dexMod = this.abilities?.dex?.mod || 0;
    let armorBonus = 0;

    if (equippedArmor) {
      // Get armor bonus (use defenseBonus or armorBonus field)
      armorBonus = equippedArmor.system.defenseBonus || equippedArmor.system.armorBonus || 0;

      // Apply max dex bonus restriction
      let maxDex = equippedArmor.system.maxDexBonus;
      if (Number.isInteger(maxDex)) {
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

    // Add equipment bonus from armor (only if proficient)
    // SWSE Rule: When not proficient with armor, you do NOT gain equipment bonuses
    let equipmentBonus = 0;
    if (equippedArmor && this.armorProficient) {
      equipmentBonus = equippedArmor.system.equipmentBonus || 0;
    }

    // Get species trait bonus for reflex
    const reflexSpeciesBonus = this.defenses.reflex.speciesBonus || 0;

    this.defenses.reflex.total = reflexBase + dexMod + equipmentBonus +
                                  (this.defenses.reflex.classBonus || 0) +
                                  (this.defenses.reflex.misc || 0) +
                                  reflexSpeciesBonus + conditionPenalty;

    // FORTITUDE DEFENSE
    // Droids use STR mod, organics use CON or STR (whichever is higher)
    let fortAbility;
    if (this.isDroid) {
      fortAbility = this.abilities?.str?.mod || 0;
    } else {
      fortAbility = Math.max(this.abilities?.con?.mod || 0, this.abilities?.str?.mod || 0);
    }

    // Add equipment bonus from armor (only if proficient)
    // SWSE Rule: When not proficient with armor, you do NOT gain equipment bonuses
    let armorFortBonus = 0;
    if (equippedArmor && this.armorProficient) {
      armorFortBonus = equippedArmor.system.equipmentBonus || equippedArmor.system.fortBonus || 0;
    }

    // Get species trait bonus for fortitude
    const fortSpeciesBonus = this.defenses.fort.speciesBonus || 0;

    this.defenses.fort.total = 10 + level + fortAbility + armorFortBonus +
                                     (this.defenses.fort.classBonus || 0) +
                                     (this.defenses.fort.misc || 0) +
                                     fortSpeciesBonus + conditionPenalty;

    // WILL DEFENSE
    // Get species trait bonus for will
    const willSpeciesBonus = this.defenses.will.speciesBonus || 0;

    this.defenses.will.total = 10 + level + (this.abilities?.wis?.mod || 0) +
                                (this.defenses.will.classBonus || 0) +
                                (this.defenses.will.misc || 0) +
                                willSpeciesBonus + conditionPenalty;
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
   * - NONHEROIC CHARACTERS: Nonheroic class levels do NOT add to defense (they don't add heroic level)
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
      this.heroicLevel = 0; // Track heroic level separately
      this.nonheroicLevel = 0; // Track nonheroic level separately
      if (this.defenses?.fort && this.defenses?.reflex && this.defenses?.will) {
        this.defenses.fort.classBonus = 0;
        this.defenses.reflex.classBonus = 0;
        this.defenses.will.classBonus = 0;
      }
      return;
    }

    // Calculate total BAB (additive across all classes)
    let totalBAB = 0;

    // Track heroic and nonheroic levels separately
    let heroicLevel = 0;
    let nonheroicLevel = 0;

    // Track highest FLAT defense bonuses (not additive, just take max)
    let maxFortBonus = 0;
    let maxRefBonus = 0;
    let maxWillBonus = 0;

    for (const classItem of classItems) {
      const classLevel = classItem.system.level || 1;
      const classData = classItem.system;
      const isNonheroic = classData.isNonheroic || false;

      // Track heroic vs nonheroic levels
      if (isNonheroic) {
        nonheroicLevel += classLevel;
      } else {
        heroicLevel += classLevel;
      }

      // BAB - Calculate based on class type
      if (isNonheroic) {
        // Nonheroic BAB table (custom progression)
        const nonheroicBAB = this._getNonheroicBAB(classLevel);
        totalBAB += nonheroicBAB;
      } else {
        // Heroic BAB - standard progression
        const babProgression = this._convertBabProgression(classData.babProgression);
        const classBab = Math.floor(classLevel * babProgression);
        totalBAB += classBab;
      }

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
    this.heroicLevel = heroicLevel; // Store for defense calculations
    this.nonheroicLevel = nonheroicLevel; // Store for reference

    // Set defense class bonuses (these get added in parent's _calculateDefenses)
    if (this.defenses?.fort && this.defenses?.reflex && this.defenses?.will) {
      this.defenses.fort.classBonus = maxFortBonus;
      this.defenses.reflex.classBonus = maxRefBonus;
      this.defenses.will.classBonus = maxWillBonus;
    }
  }

  /**
   * Get BAB for nonheroic character at given level
   * SWSE Nonheroic BAB Table:
   * 1: +0, 2: +1, 3: +2, 4: +3, 5: +3, 6: +4, 7: +5, 8: +6, 9: +6, 10: +7
   * 11: +8, 12: +9, 13: +9, 14: +10, 15: +11, 16: +12, 17: +12, 18: +13, 19: +14, 20: +15
   */
  _getNonheroicBAB(level) {
    const nonheroicBABTable = [
      0,  // Level 1
      1,  // Level 2
      2,  // Level 3
      3,  // Level 4
      3,  // Level 5
      4,  // Level 6
      5,  // Level 7
      6,  // Level 8
      6,  // Level 9
      7,  // Level 10
      8,  // Level 11
      9,  // Level 12
      9,  // Level 13
      10, // Level 14
      11, // Level 15
      12, // Level 16
      12, // Level 17
      13, // Level 18
      14, // Level 19
      15  // Level 20
    ];
    return nonheroicBABTable[Math.min(level - 1, 19)] || 0;
  }

  _prepareSkills() {
    // Use camelCase keys to match the schema definition in _getSkillDefinitions()
    const skillData = {
      acrobatics: { defaultAbility: 'dex', untrained: true, armorPenalty: true },
      climb: { defaultAbility: 'str', untrained: true, armorPenalty: true },
      deception: { defaultAbility: 'cha', untrained: true, armorPenalty: false },
      endurance: { defaultAbility: 'con', untrained: true, armorPenalty: true },
      gatherInformation: { defaultAbility: 'cha', untrained: true, armorPenalty: false },
      initiative: { defaultAbility: 'dex', untrained: true, armorPenalty: true },
      jump: { defaultAbility: 'str', untrained: true, armorPenalty: true },
      knowledgeBureaucracy: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledgeGalacticLore: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledgeLifeSciences: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledgePhysicalSciences: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledgeSocialSciences: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledgeTactics: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      knowledgeTechnology: { defaultAbility: 'int', untrained: false, armorPenalty: false },
      mechanics: { defaultAbility: 'int', untrained: true, armorPenalty: false },
      perception: { defaultAbility: 'wis', untrained: true, armorPenalty: false },
      persuasion: { defaultAbility: 'cha', untrained: true, armorPenalty: false },
      pilot: { defaultAbility: 'dex', untrained: true, armorPenalty: false },
      ride: { defaultAbility: 'dex', untrained: true, armorPenalty: false },
      stealth: { defaultAbility: 'dex', untrained: true, armorPenalty: true },
      survival: { defaultAbility: 'wis', untrained: true, armorPenalty: false },
      swim: { defaultAbility: 'str', untrained: true, armorPenalty: true },
      treatInjury: { defaultAbility: 'wis', untrained: true, armorPenalty: false },
      useComputer: { defaultAbility: 'int', untrained: true, armorPenalty: false },
      useTheForce: { defaultAbility: 'cha', untrained: true, armorPenalty: false }
    };

    // Use the already calculated halfLevel property
    const halfLevel = this.halfLevel || 0;

    // Get armor check penalty (calculated in _calculateArmorEffects)
    const armorCheckPenalty = this.armorCheckPenalty || 0;

    // Droids can only use these skills untrained (unless they have Heuristic Processor)
    const droidUntrainedSkills = ['acrobatics', 'climb', 'jump', 'perception'];

    // Get occupation bonus from background (applies +2 to untrained checks for specific skills)
    // This is accessed via actor flags, so we need to check if parent exists
    let occupationBonus = null;
    if (this.parent?.flags?.swse?.occupationBonus) {
      occupationBonus = this.parent.flags.swse.occupationBonus;
    }

    // Get species skill bonuses (calculated in _applySpeciesTraitBonuses)
    const speciesSkillBonuses = this.speciesSkillBonuses || {};

    for (const [skillKey, skill] of Object.entries(this.skills)) {
      const data = skillData[skillKey];
      if (!data) continue;

      // Use selectedAbility if set, otherwise use default
      const abilityKey = skill.selectedAbility || data.defaultAbility;
      const abilityMod = this.attributes[abilityKey]?.mod || 0;

      // Calculate total bonus
      let total = abilityMod + (skill.miscMod || 0);

      // Add species trait bonus for this skill
      const speciesBonus = speciesSkillBonuses[skillKey] || 0;
      if (speciesBonus !== 0) {
        total += speciesBonus;
        skill.speciesBonus = speciesBonus; // Store for display
      }

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

      // Apply occupation bonus from background (only to untrained checks)
      // Occupation bonus gives +2 to specific skills when making untrained checks
      if (!skill.trained && occupationBonus?.skills?.includes(skillKey)) {
        total += occupationBonus.value || 2;
        skill.hasOccupationBonus = true;
      } else {
        skill.hasOccupationBonus = false;
      }

      // Apply armor check penalty if this skill is affected
      if (data.armorPenalty && armorCheckPenalty !== 0) {
        total += armorCheckPenalty; // Note: penalty is negative, so we add it
      }

      // Apply condition track penalty (affects all skills and rolls)
      const conditionPenalty = this.conditionTrack?.penalty || 0;
      total += conditionPenalty; // Note: penalty is negative, so we add it

      // Determine if skill can be used untrained
      let canUseUntrained = data.untrained;

      // Droids have restricted untrained skills
      if (this.isDroid && !skill.trained) {
        canUseUntrained = droidUntrainedSkills.includes(skillKey);
      }

      // Store calculated values
      skill.total = total;
      skill.abilityMod = abilityMod;
      skill.defaultAbility = data.defaultAbility;  // Store default for reference
      skill.untrained = canUseUntrained;
      skill.canUse = skill.trained || canUseUntrained;
    }
  }

  /**
   * Apply species trait bonuses using the Species Trait Engine
   * This method processes all automated species traits and applies their bonuses
   */
  _applySpeciesTraitBonuses() {
    const actor = this.parent;
    if (!actor) return;

    try {
      // Get computed bonuses from species traits
      const bonuses = SpeciesTraitEngine.computeTraitBonuses(actor);

      // Store species trait bonuses for use in defense and skill calculations
      this.speciesTraitBonuses = bonuses;

      // Apply ability bonuses (these stack with racial ability modifiers from species selection)
      // Note: The base racial modifiers (+2 Dex, -2 Con) are already in attributes.racial
      // These are ADDITIONAL bonuses from traits like "Wookiee-Mighty: +4 Strength"
      for (const [ability, bonus] of Object.entries(bonuses.abilities)) {
        if (this.attributes[ability] && bonus !== 0) {
          // Add to the racial component for now (could create separate species.traits component)
          this.attributes[ability].racial = (this.attributes[ability].racial || 0) + bonus;
          // Recalculate total and mod
          const attr = this.attributes[ability];
          attr.total = attr.base + attr.racial + attr.enhancement + attr.temp;
          attr.mod = Math.floor((attr.total - 10) / 2);

          // Update abilities alias
          if (this.abilities[ability]) {
            this.abilities[ability].racial = attr.racial;
            this.abilities[ability].total = attr.total;
            this.abilities[ability].mod = attr.mod;
          }
        }
      }

      // Store defense bonuses for _calculateDefenses to use
      // Initialize defense misc.auto.species if not present
      if (this.defenses) {
        for (const defKey of ['reflex', 'fortitude', 'will']) {
          const defBonus = bonuses.defenses[defKey] || 0;
          if (defBonus !== 0) {
            if (!this.defenses[defKey]) this.defenses[defKey] = {};
            if (!this.defenses[defKey].misc) this.defenses[defKey].misc = 0;
            // Store the species bonus to be added in defense calculation
            this.defenses[defKey].speciesBonus = defBonus;
          }
        }
      }

      // Store skill bonuses for _prepareSkills to use
      this.speciesSkillBonuses = bonuses.skills;

      // Store combat bonuses for attack/damage calculations
      this.speciesCombatBonuses = bonuses.combat;

      // Store special traits (senses, movements, natural weapons, immunities)
      this.speciesSenses = bonuses.senses;
      this.speciesMovements = bonuses.movements;
      this.speciesNaturalWeapons = bonuses.naturalWeapons;
      this.speciesImmunities = bonuses.immunities;
      this.speciesResistances = bonuses.resistances;
      this.speciesProficiencies = bonuses.proficiencies;

    } catch (err) {
      SWSELogger.error('Error applying species trait bonuses:', err);
    }
  }

  _calculateForcePoints() {
    // Ensure forcePoints exists
    if (!this.forcePoints) {
      this.forcePoints = { value: 0, max: 0, die: "1d6" };
    }

    // NONHEROIC RULE: Nonheroic characters do not gain Force Points
    // Only use heroic level for Force Point calculation
    const heroicLevel = this.heroicLevel ?? this.level ?? 1;

    // If character has no heroic levels, they get no Force Points
    if (heroicLevel === 0) {
      this.forcePoints.max = 0;
      this.forcePoints.value = Math.min(this.forcePoints.value, 0);
      this.forcePoints.die = "1d6";
      return;
    }

    // Check for daily Force Points optional rule
    const useDailyForcePoints = game.settings?.get('foundryvtt-swse', 'dailyForcePoints') || false;

    if (useDailyForcePoints) {
      // Daily Force Points based on heroic level ranges
      // 1-5: 1 FP, 6-10: 2 FP, 11-15: 3 FP, 16+: 4 FP
      if (heroicLevel >= 16) {
        this.forcePoints.max = 4;
      } else if (heroicLevel >= 11) {
        this.forcePoints.max = 3;
      } else if (heroicLevel >= 6) {
        this.forcePoints.max = 2;
      } else {
        this.forcePoints.max = 1;
      }
    } else {
      // Standard Force Points: 5 + half heroic level (rounded down)
      this.forcePoints.max = 5 + Math.floor(heroicLevel / 2);
    }

    // Calculate Force Point die based on heroic level
    // 1-7: 1d6, 8-14: 2d6 (take highest), 15+: 3d6 (take highest)
    if (heroicLevel >= 15) {
      this.forcePoints.die = "3d6";
    } else if (heroicLevel >= 8) {
      this.forcePoints.die = "2d6";
    } else {
      this.forcePoints.die = "1d6";
    }
  }

  _calculateDestinyPoints() {
    // Ensure destinyPoints exists
    if (!this.destinyPoints) {
      this.destinyPoints = { value: 0, max: 0 };
    }

    // Ensure destiny exists
    if (!this.destiny) {
      this.destiny = {
        hasDestiny: false,
        type: "",
        fulfilled: false,
        secret: false
      };
    }

    const heroic = this.heroicLevel !== 0;
    const destiny = this.destiny;
    const isDroid = this.isDroid || false;
    const allowDroidDestiny = game.settings?.get('foundryvtt-swse', 'allowDroidDestiny') || false;

    // Droids don't normally get Destiny Points (can be enabled via house rule)
    if (isDroid && !allowDroidDestiny) {
      this.destinyPoints.max = 0;
      this.destinyPoints.value = 0;
      return;
    }

    // If character is not heroic or doesn't have Destiny, they can't use Destiny Points
    if (!heroic || !destiny.hasDestiny) {
      this.destinyPoints.max = 0;
      this.destinyPoints.value = 0;
      return;
    }

    // If Destiny is fulfilled, Destiny Points are locked at current value
    if (destiny.fulfilled) {
      this.destinyPoints.max = this.destinyPoints.value;
      return;
    }

    // Active Destiny: Max = character level (heroic level only)
    this.destinyPoints.max = this.heroicLevel;

    // Clamp value to max
    this.destinyPoints.value = Math.min(
      this.destinyPoints.value,
      this.destinyPoints.max
    );
  }
}
