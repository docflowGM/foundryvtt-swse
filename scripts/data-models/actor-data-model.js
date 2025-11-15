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
          initial: 1,
          min: 0,
          integer: true,
          clean: value => Math.floor(Number(value) || 1)
        }),
        max: new fields.NumberField({
          required: true,
          initial: 1,
          min: 1,
          integer: true,
          clean: value => Math.floor(Number(value) || 1)
        }),
        temp: new fields.NumberField({
          required: true,
          initial: 0,
          min: 0,
          integer: true,
          clean: value => Math.floor(Number(value) || 0)
        })
      }),

      // Condition Track
      conditionTrack: new fields.SchemaField({
        current: new fields.NumberField({
          required: true,
          initial: 0,
          min: 0,
          max: 5,
          integer: true,
          clean: value => Math.floor(Number(value) || 0)
        }),
        persistent: new fields.BooleanField({required: true, initial: false}),
        penalty: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
          clean: value => Math.floor(Number(value) || 0)
        })
      }),

      // Level & Experience
      level: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 20,
        integer: true,
        clean: value => Math.floor(Number(value) || 1)
      }),
      experience: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      }),

      // Size (with automatic normalization for backwards compatibility)
      size: new fields.StringField({
        required: true,
        initial: "medium",
        choices: {
          "fine": "Fine",
          "diminutive": "Diminutive",
          "tiny": "Tiny",
          "small": "Small",
          "medium": "Medium",
          "large": "Large",
          "huge": "Huge",
          "gargantuan": "Gargantuan",
          "colossal": "Colossal",
          "colossal2": "Colossal (Frigate)"
        },
        clean: value => {
          // Normalize capitalized values to lowercase for backwards compatibility
          if (typeof value === 'string') {
            return value.toLowerCase();
          }
          return value;
        }
      }),

      // Combat (with automatic integer coercion for backwards compatibility)
      bab: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      }),
      baseAttack: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      }),
      initiative: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      }),
      speed: new fields.NumberField({
        required: true,
        initial: 6,
        min: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 6)
      }),
      damageThreshold: new fields.NumberField({
        required: true,
        initial: 10,
        integer: true,
        clean: value => Math.floor(Number(value) || 10)
      }),

      // Skills
      skills: new fields.SchemaField(this._generateSkillsSchema()),

      // Resources
      credits: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      })
    };
  }

  static _abilitySchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({
        required: true,
        initial: 10,
        min: 1,
        max: 30,
        integer: true,
        clean: value => Math.floor(Number(value) || 10)
      }),
      racial: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      }),
      misc: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      }),
      total: new fields.NumberField({
        required: true,
        initial: 10,
        integer: true,
        clean: value => Math.floor(Number(value) || 10)
      }),
      mod: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      })
    };
  }

  static _defenseSchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({
        required: true,
        initial: 10,
        integer: true,
        clean: value => Math.floor(Number(value) || 10)
      }),
      armor: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      }),
      ability: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      }),
      classBonus: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      }),
      misc: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        clean: value => Math.floor(Number(value) || 0)
      }),
      total: new fields.NumberField({
        required: true,
        initial: 10,
        integer: true,
        clean: value => Math.floor(Number(value) || 10)
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
          initial: 0,
          integer: true,
          clean: value => Math.floor(Number(value) || 0)
        }),
        misc: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
          clean: value => Math.floor(Number(value) || 0)
        }),
        total: new fields.NumberField({
          required: true,
          initial: 0,
          integer: true,
          clean: value => Math.floor(Number(value) || 0)
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

    // Reflex
    const reflexArmor = this.defenses.reflex.armor > 0 ? this.defenses.reflex.armor : level;
    this.defenses.reflex.total = 10 + reflexArmor + (this.abilities?.dex?.mod || 0) +
                                  (this.defenses.reflex.classBonus || 0) + (this.defenses.reflex.misc || 0);

    // Fortitude
    const fortAbility = Math.max(this.abilities?.con?.mod || 0, this.abilities?.str?.mod || 0);
    this.defenses.fortitude.total = 10 + level + fortAbility +
                                     (this.defenses.fortitude.classBonus || 0) + (this.defenses.fortitude.misc || 0);

    // Will
    this.defenses.will.total = 10 + level + (this.abilities?.wis?.mod || 0) +
                                (this.defenses.will.classBonus || 0) + (this.defenses.will.misc || 0);
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
