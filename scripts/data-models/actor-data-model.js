export class SWSEActorDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // Abilities
      abilities: new fields.SchemaField({
        str: new fields.SchemaField(this._abilitySchema()),
        dex: new fields.SchemaField(this._abilitySchema()),
        con: new fields.SchemaField(this._abilitySchema()),
        int: new fields.SchemaField(this._abilitySchema()),
        wis: new fields.SchemaField(this._abilitySchema()),
        cha: new fields.SchemaField(this._abilitySchema())
      }),

      // Defenses
      defenses: new fields.SchemaField({
        reflex: new fields.SchemaField(this._defenseSchema()),
        fortitude: new fields.SchemaField(this._defenseSchema()),
        will: new fields.SchemaField(this._defenseSchema())
      }),

      // HP
      hp: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 1,
          min: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 1;
            const num = Number(value);
            return Number.isNaN(num) ? 1 : Math.floor(num);
          }
        }),
        max: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 1,
          min: 1,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 1;
            const num = Number(value);
            return Number.isNaN(num) ? 1 : Math.floor(num);
          }
        }),
        temp: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          min: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        })
      }),

      // Condition Track
      conditionTrack: new fields.SchemaField({
        current: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          min: 0,
          max: 5,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        }),
        persistent: new fields.BooleanField({required: true, initial: false}),
        penalty: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        })
      }),

      // Level & Experience
      level: new fields.NumberField({
        required: true,
        nullable: true,
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
      experience: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 0,
        min: 0,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 0;
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      }),

      // Size (with automatic normalization for backwards compatibility)
      // Note: choices removed to allow clean function to run before validation
      size: new fields.StringField({
        required: true,
        initial: "medium",
        clean: value => {
          // Normalize capitalized values to lowercase for backwards compatibility
          if (typeof value === 'string') {
            const normalized = value.toLowerCase();
            // Map any known valid sizes to their correct form
            const validSizes = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal', 'colossal2'];
            return validSizes.includes(normalized) ? normalized : "medium";
          }
          return "medium";
        },
        validate: value => {
          // Validate after cleaning
          const validSizes = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal', 'colossal2'];
          if (!validSizes.includes(value)) {
            console.warn(`SWSE | Invalid size value "${value}" was auto-corrected to "medium". Valid sizes are: ${validSizes.join(', ')}`);
          }
        }
      }),

      // Combat (with automatic integer coercion for backwards compatibility)
      bab: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
        integer: true
      }),
      baseAttack: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
        integer: true
      }),
      initiative: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
        integer: true
      }),
      speed: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 6,
        min: 0,
        integer: true
      }),
      damageThreshold: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 10,
        integer: true
      }),

      // Skills
      skills: new fields.SchemaField(this._generateSkillsSchema()),

      // Resources
      credits: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 0,
        min: 0,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 0;
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      })
    };
  }

  static _abilitySchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 10,
        min: 1,
        max: 30,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 10;
          const num = Number(value);
          return Number.isNaN(num) ? 10 : Math.floor(num);
        }
      }),
      racial: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 0,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 0;
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      }),
      misc: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 0,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 0;
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      }),
      total: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 10,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 10;
          const num = Number(value);
          return Number.isNaN(num) ? 10 : Math.floor(num);
        }
      }),
      mod: new fields.NumberField({
        required: true,
        nullable: true,
        initial: 0,
        integer: true,
        clean: value => {
          if (value === null || value === undefined || value === "") return 0;
          const num = Number(value);
          return Number.isNaN(num) ? 0 : Math.floor(num);
        }
      })
    };
  }

  static _defenseSchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 10,
        integer: true
      }),
      armor: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
        integer: true
      }),
      ability: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
        integer: true
      }),
      classBonus: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
        integer: true
      }),
      misc: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 0,
        integer: true
      }),
      total: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 10,
        integer: true
      })
    };
  }

  static _generateSkillsSchema() {
    const fields = foundry.data.fields;
    const skills = [
      'acrobatics', 'climb', 'deception', 'endurance', 'gatherInformation',
      'initiative', 'jump', 'knowledge', 'mechanics', 'perception',
      'persuasion', 'pilot', 'ride', 'stealth', 'survival',
      'swim', 'treatInjury', 'useComputer', 'useTheForce'
    ];

    const schema = {};
    for (const skill of skills) {
      schema[skill] = new fields.SchemaField({
        trained: new fields.BooleanField({required: true, initial: false}),
        focused: new fields.BooleanField({required: true, initial: false}),
        armor: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        }),
        misc: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        }),
        total: new fields.NumberField({
          required: true,
          nullable: true,
          initial: 0,
          integer: true,
          clean: value => {
            if (value === null || value === undefined || value === "") return 0;
            const num = Number(value);
            return Number.isNaN(num) ? 0 : Math.floor(num);
          }
        })
      });
    }
    return schema;
  }

  prepareDerivedData() {
    this._calculateAbilities();
    this._applyConditionPenalties();
    this._calculateDefenses();
    this._calculateSkills();
    this._calculateBaseAttack();
    this._calculateDamageThreshold();
    this._calculateInitiative();
  }

  _calculateAbilities() {
    for (const [key, ability] of Object.entries(this.abilities)) {
      ability.total = ability.base + ability.racial + ability.misc;
      ability.mod = Math.floor((ability.total - 10) / 2);
    }
  }

  _applyConditionPenalties() {
    const penalties = [0, -1, -2, -5, -10, 0]; // 0=Normal, 5=Helpless
    this.conditionTrack.penalty = penalties[this.conditionTrack.current] || 0;
  }

  _calculateDefenses() {
    // Ensure defenses object exists
    if (!this.defenses) {
      console.warn('Actor defenses not initialized, skipping defense calculations');
      return;
    }

    const level = this.level || 1;

    // Ensure individual defense objects exist
    if (!this.defenses.reflex || !this.defenses.fortitude || !this.defenses.will) {
      console.warn('Actor defense sub-objects not initialized, skipping defense calculations');
      return;
    }

    // Get condition track penalty
    const conditionPenalty = this.conditionTrack?.penalty || 0;

    // Reflex
    const reflexArmor = this.defenses.reflex.armor > 0 ? this.defenses.reflex.armor : level;
    this.defenses.reflex.total = 10 + reflexArmor + (this.abilities?.dex?.mod || 0) +
                                  (this.defenses.reflex.classBonus || 0) +
                                  (this.defenses.reflex.misc || 0) + conditionPenalty;

    // Fortitude
    const fortAbility = Math.max(this.abilities?.con?.mod || 0, this.abilities?.str?.mod || 0);
    this.defenses.fortitude.total = 10 + level + fortAbility +
                                     (this.defenses.fortitude.classBonus || 0) +
                                     (this.defenses.fortitude.misc || 0) + conditionPenalty;

    // Will
    this.defenses.will.total = 10 + level + (this.abilities?.wis?.mod || 0) +
                                (this.defenses.will.classBonus || 0) +
                                (this.defenses.will.misc || 0) + conditionPenalty;
  }

  _calculateSkills() {
    const halfLevel = Math.floor((this.level || 1) / 2);
    const abilityMap = {
      acrobatics: 'dex', climb: 'str', deception: 'cha',
      endurance: 'con', gatherInformation: 'cha', initiative: 'dex',
      jump: 'str', knowledge: 'int', mechanics: 'int',
      perception: 'wis', persuasion: 'cha', pilot: 'dex',
      ride: 'dex', stealth: 'dex', survival: 'wis',
      swim: 'str', treatInjury: 'wis', useComputer: 'int',
      useTheForce: 'cha'
    };

    for (const [skillKey, skill] of Object.entries(this.skills)) {
      const abilityKey = abilityMap[skillKey];
      const abilityMod = this.abilities[abilityKey]?.mod || 0;

      skill.total = halfLevel + abilityMod + 
                    (skill.trained ? 5 : 0) + 
                    (skill.focused ? 5 : 0) + 
                    skill.armor + skill.misc + 
                    this.conditionTrack.penalty;
      
      // Add mod property (same as total) for template compatibility
      skill.mod = skill.total;
    }
  }

  _calculateDamageThreshold() {
    // Ensure defenses and fortitude are initialized
    if (!this.defenses || !this.defenses.fortitude) {
      console.warn('Actor defenses not initialized, skipping damage threshold calculation');
      return;
    }
    this.damageThreshold = this.defenses.fortitude.total;
  }

  _calculateInitiative() {
    this.initiative = (this.skills.initiative?.total || 0);
  }

  _calculateBaseAttack() {
    // Calculate base attack bonus based on level
    // This is a simple calculation - should be overridden by class-specific logic
    const level = this.level || 1;
    
    // Default to medium progression (3/4 level)
    this.bab = Math.floor(level * 0.75);
    
    // Also set baseAttack for template compatibility
    this.baseAttack = this.bab;
  }
}
