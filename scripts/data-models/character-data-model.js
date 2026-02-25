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
   * SOVEREIGNTY CONSOLIDATION: The following methods have been moved to DerivedCalculator:
   * - _calculateMulticlassStats() — Heroic/nonheroic levels via getLevelSplit()
   * - _getNonheroicBAB() — BAB calculation via BABCalculator
   * - _calculateForcePoints() — Force point max via DerivedCalculator
   * - _calculateDestinyPoints() — Destiny point max via DerivedCalculator
   *
   * Get BAB for nonheroic character at given level (DEPRECATED - kept for reference only)
   *
   * Apply species trait bonuses using the Species Trait Engine
   * This method processes all automated species traits and applies their bonuses
   */
  _applySpeciesTraitBonuses() {
    // NOTE: SpeciesTraitEngine is not implemented - this method is a no-op
    // TODO: Implement species trait bonus system
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
