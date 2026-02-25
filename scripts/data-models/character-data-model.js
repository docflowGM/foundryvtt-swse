import { DefenseSystem } from '../engine/DefenseSystem.js';
import { SWSELogger } from '../utils/logger.js';
import { SWSEActorDataModel } from './actor-data-model.js';
import { warnIfMixedTracks } from '../utils/hardening.js';

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
      base: new fields.NumberField({ required: true, initial: 10, integer: true }),
      racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
      enhancement: new fields.NumberField({ required: true, initial: 0, integer: true }),
      temp: new fields.NumberField({ required: true, initial: 0, integer: true })
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
      trained: new fields.BooleanField({ required: true, initial: false }),
      focused: new fields.BooleanField({ required: true, initial: false }),
      miscMod: new fields.NumberField({ required: true, initial: 0, integer: true }),
      selectedAbility: new fields.StringField({ required: true, initial: defaultAbility }),
      favorite: new fields.BooleanField({ required: true, initial: false })
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
      isDroid: new fields.BooleanField({ required: true, initial: false }),
      droidDegree: new fields.StringField({ required: false, initial: '' }),

      // Attributes (override parent abilities with enhanced attributes)
      attributes: new fields.SchemaField(attributeSchema),

      // STATIC SKILLS - Always present
      skills: new fields.SchemaField(skillsSchema),

      // HP
      hp: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 30, min: 0, integer: true }),
        max: new fields.NumberField({ required: true, initial: 30, min: 1, integer: true }),
        temp: new fields.NumberField({ required: true, initial: 0, integer: true }),
        bonus: new fields.NumberField({ required: true, initial: 0, integer: true })
      }),


      // Condition Track
      conditionTrack: new fields.SchemaField({
        current: new fields.NumberField({ required: true, initial: 0, min: 0, max: 5, integer: true }),
        persistent: new fields.BooleanField({ required: true, initial: false })
      }),

      // Mount System — rider state
      mounted: new fields.SchemaField({
        isMounted: new fields.BooleanField({ required: true, initial: false }),
        mountId: new fields.StringField({ required: false, nullable: true, initial: null })
      }),

      // Mount System — mount state (when this actor IS a mount)
      mount: new fields.SchemaField({
        riderIds: new fields.ArrayField(
          new fields.StringField({ required: true, initial: '' }),
          { required: true, initial: [] }
        )
      }),

      // Level
      level: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 20,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === '') {return 1;}
          const num = Number(value);
          return Number.isNaN(num) ? 1 : Math.floor(num);
        }
      }),

      // Destiny Points
      destinyPoints: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
        max: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true })
      }),

      // Destiny
      destiny: new fields.SchemaField({
        hasDestiny: new fields.BooleanField({ required: true, initial: false }),
        type: new fields.StringField({ required: false, initial: '' }),
        fulfilled: new fields.BooleanField({ required: true, initial: false }),
        secret: new fields.BooleanField({ required: true, initial: false })
      }),

      // Biography
      biography: new fields.StringField({ required: false, initial: '' }),

      // Background information for Biography tab
      event: new fields.StringField({ required: false, initial: '' }),
      profession: new fields.StringField({ required: false, initial: '' }),
      planetOfOrigin: new fields.StringField({ required: false, initial: '' }),

      // SWSE-specific system data (mentor survey, build intent, etc.)
      swse: new fields.SchemaField({
        mentorSurveyCompleted: new fields.BooleanField({ required: true, initial: false }),
        mentorBuildIntentBiases: new fields.ObjectField({ required: true, initial: {} }),
        surveyResponses: new fields.ObjectField({ required: true, initial: {} })
      }),

      // Progression integrity & legality tracking
      meta: new fields.SchemaField({
        schemaVersion: new fields.NumberField({ required: true, initial: 1, integer: true }),
        streetLegal: new fields.BooleanField({ required: true, initial: true }),
        lastValidation: new fields.SchemaField({
          passed: new fields.BooleanField({ required: true, initial: true }),
          errors: new fields.ArrayField(
            new fields.StringField({ required: true, initial: '' }),
            { required: true, initial: [] }
          ),
          timestamp: new fields.NumberField({ required: true, initial: 0, integer: true })
        })
      }),

      // Droid Systems (AppV2-compliant, first-class document data)
      droidSystems: new fields.SchemaField({
        // Core droid identity
        degree: new fields.StringField({
          required: true,
          initial: '',
          choices: ['Third-Degree', 'Second-Degree', 'First-Degree']
        }),
        size: new fields.StringField({
          required: true,
          initial: 'Medium',
          choices: ['Tiny', 'Small', 'Medium', 'Large', 'Huge']
        }),

        // Primary systems (exactly one of each required)
        locomotion: new fields.SchemaField({
          id: new fields.StringField({ required: true, initial: '' }),
          name: new fields.StringField({ required: true, initial: '' }),
          cost: new fields.NumberField({ required: true, initial: 0 }),
          speed: new fields.NumberField({ required: true, initial: 0 })
        }),

        processor: new fields.SchemaField({
          id: new fields.StringField({ required: true, initial: '' }),
          name: new fields.StringField({ required: true, initial: '' }),
          cost: new fields.NumberField({ required: true, initial: 0 }),
          bonus: new fields.NumberField({ required: true, initial: 0 })
        }),

        // Array systems
        appendages: new fields.ArrayField(
          new fields.SchemaField({
            id: new fields.StringField({ required: true, initial: '' }),
            name: new fields.StringField({ required: true, initial: '' }),
            type: new fields.StringField({ required: true, initial: '' }),
            cost: new fields.NumberField({ required: true, initial: 0 })
          }),
          { required: true, initial: [] }
        ),

        accessories: new fields.ArrayField(
          new fields.SchemaField({
            id: new fields.StringField({ required: true, initial: '' }),
            name: new fields.StringField({ required: true, initial: '' }),
            cost: new fields.NumberField({ required: true, initial: 0 })
          }),
          { required: true, initial: [] }
        ),

        // Budget tracking
        credits: new fields.SchemaField({
          total: new fields.NumberField({ required: true, initial: 0 }),
          spent: new fields.NumberField({ required: true, initial: 0 }),
          remaining: new fields.NumberField({ required: true, initial: 0 })
        })
      }, { required: true, initial: {} })
    };
  }

  /**
   * PHASE C: V14 ASYNC COMPATIBILITY
   * This method MUST remain synchronous per Foundry's requirement.
   * prepareDerivedData() cannot be async in v13 or v14.
   * All derived calculations are synchronous and complete before returning.
   * For future v14+ async operations, see prepareDataAsync() stub below.
   */
  prepareDerivedData() {
    // SOVEREIGNTY CONSOLIDATION: All derived computation delegated to DerivedCalculator.
    // This method intentionally does nothing.
  }

  /**
   * Apply mounted movement override.
   * When mounted, use mount's speed instead of character's own.
   * Does NOT mutate base speed; only overrides effectiveSpeed.
   */
  _applyMountedMovement() {
    if (!this.mounted?.isMounted) return;

    const mountId = this.mounted.mountId;
    if (!mountId) return;

    const mount = game.actors?.get(mountId);
    if (!mount) return;

    this.effectiveSpeed = mount.system.speed ?? mount.system.effectiveSpeed ?? this.effectiveSpeed;
  }

  /**
   * SOVEREIGNTY CONSOLIDATION: _applyEnhancedDamageThreshold() moved to DerivedCalculator.computeAll()
   * Damage threshold is now computed exclusively in DerivedCalculator and written to
   * system.derived.damageThreshold. No longer computed in DataModel.
   */

  /**
   * Calculate armor check penalties and speed reduction from equipped armor
   * SWSE Rules:
   * - Armor check penalty applies to: Acrobatics, Climb, Endurance, Initiative, Jump, Stealth, Swim
   * - Armor check penalty also applies to attack rolls when not proficient
   * - Speed reduction: Medium armor -2 squares, Heavy armor -4 squares (if speed >= 6)
   * - Proficiency: Light (-2), Medium (-5), Heavy (-10) penalty when not proficient
   * - When not proficient, you do NOT gain armor's equipment bonuses
   */


  /**
   * Helper: Compute misc defense bonuses from auto and user components
   * @param {object} defense - Defense object with misc.auto and misc.user properties
   * @returns {number} - Total misc bonuses
   */
  _computeDefenseMisc(defense) {
    if (!defense?.misc) {return 0;}

    let total = 0;

    // Sum all auto bonuses
    if (defense.misc.auto) {
      for (const key in defense.misc.auto) {
        total += Number(defense.misc.auto[key] || 0);
      }
    }

    // Add user bonuses
    if (defense.misc.user) {
      total += Number(defense.misc.user.extra || 0);
    }

    return total;
  }

  /**
   * Convert BAB progression string to numeric multiplier
   * @param {string} progression - "slow", "medium", or "fast"
   * @returns {number} - Per-level BAB multiplier
   */
  _convertBabProgression(progression) {
    if (typeof progression === 'number') {return progression;}

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
    if (!actor || !actor.items) {return;}

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
    warnIfMixedTracks(actor, '_calculateMulticlassStats');
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

  /**
   * SOVEREIGNTY CONSOLIDATION: _prepareSkills() moved to DerivedCalculator.computeAll()
   * Skill totals are now computed exclusively in DerivedCalculator and written to
   * system.derived.skills[skillKey].total. No longer computed in DataModel.
   *
   * Apply species trait bonuses using the Species Trait Engine
   * This method processes all automated species traits and applies their bonuses
   */
  _applySpeciesTraitBonuses() {
    // NOTE: SpeciesTraitEngine is not implemented - this method is a no-op
    // TODO: Implement species trait bonus system
  }

  _calculateForcePoints() {
    // Ensure forcePoints exists
    if (!this.forcePoints) {
      this.forcePoints = { value: 0, max: 0, die: '1d6' };
    }

    // CANONICAL AUTHORITY: ForcePointsService
    // This method mirrors ForcePointsService.getMax() for derived data calculation
    // Uses totalLevel (heroic + nonheroic) for max calculation

    const heroicLevel = this.heroicLevel ?? 0;
    const nonheroicLevel = this.nonheroicLevel ?? 0;
    const totalLevel = heroicLevel + nonheroicLevel;

    // If character has no levels, they get no Force Points
    if (totalLevel === 0) {
      this.forcePoints.max = 0;
      this.forcePoints.value = Math.min(this.forcePoints.value, 0);
      this.forcePoints.die = '1d6';
      return;
    }

    // Determine Force Point base (5, 6, or 7)
    // Note: This is a simplified version; full prestige logic is in ForcePointsService
    // For accurate prestige detection, rely on ForcePointsService at runtime
    let base = 5;

    // Check persistent flags (if available via parent actor context)
    // This is best-effort; full detection happens in ForcePointsService
    if (this.parent?.getFlag?.('swse', 'hasBase7FP')) {
      base = 7;
    } else if (this.parent?.getFlag?.('swse', 'hasPrestigeFPBonus')) {
      base = 6;
    }

    // Check for daily Force Points optional rule
    const useDailyForcePoints = game.settings?.get('foundryvtt-swse', 'dailyForcePoints') || false;

    if (useDailyForcePoints) {
      // Daily Force Points based on total level ranges
      // 1-5: 1 FP, 6-10: 2 FP, 11-15: 3 FP, 16+: 4 FP
      if (totalLevel >= 16) {
        this.forcePoints.max = 4;
      } else if (totalLevel >= 11) {
        this.forcePoints.max = 3;
      } else if (totalLevel >= 6) {
        this.forcePoints.max = 2;
      } else {
        this.forcePoints.max = 1;
      }
    } else {
      // Standard Force Points: base + floor(totalLevel / 2)
      this.forcePoints.max = base + Math.floor(totalLevel / 2);
    }

    // Store die SIZE only (d6 or d8)
    // Heroic level scaling (1/2/3 dice count) is handled by ForcePointsService.getScalingDice()
    // Die size upgrade (d8) is handled by ModifierEngine (domain: "force.dieSize")
    this.forcePoints.die = 'd6'; // Default; d8 set by feats/talents via ModifierEngine
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
        type: '',
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

  /**
   * PHASE C: V14+ Async Preparation Stub
   *
   * In Foundry v14+, if async derived data operations become necessary,
   * this method can be implemented to handle them asynchronously.
   *
   * Current architecture: All derived data is synchronous (required).
   * Future path: If V14 requires async operations, implement this method
   * and ensure it's called at the appropriate lifecycle point.
   *
   * DO NOT call this in v13. This is scaffolding for future compatibility.
   */
  async prepareDataAsync() {
    // Stub: Future implementation for v14+ async operations
    // This preserves synchronous prepareDerivedData() contract while
    // allowing async operations if needed in future Foundry versions.
    return Promise.resolve();
  }
}
