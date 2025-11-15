import { SWSEActorDataModel } from './actor-data-model.js';

export class SWSECharacterDataModel extends SWSEActorDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // Droid Status
      isDroid: new fields.BooleanField({required: true, initial: false}),
      droidDegree: new fields.StringField({required: false, initial: ""}),

      // Attributes
      attributes: new fields.SchemaField({
        str: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          enhancement: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        dex: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          enhancement: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        con: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          enhancement: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        int: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          enhancement: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        wis: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          enhancement: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        cha: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          enhancement: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        })
      }),

      // STATIC SKILLS - Always present
      skills: new fields.SchemaField({
        acrobatics: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        climb: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        deception: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        endurance: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        gather_information: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        initiative: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        jump: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        knowledge_bureaucracy: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        knowledge_galactic_lore: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        knowledge_life_sciences: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        knowledge_physical_sciences: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        knowledge_social_sciences: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        knowledge_tactics: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        knowledge_technology: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        mechanics: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        perception: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        persuasion: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        pilot: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        ride: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        stealth: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        survival: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        swim: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        treat_injury: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        use_computer: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        use_the_force: new fields.SchemaField({
          trained: new fields.BooleanField({required: true, initial: false}),
          focusMod: new fields.NumberField({required: true, initial: 0, integer: true}),
          miscMod: new fields.NumberField({required: true, initial: 0, integer: true})
        })
      }),

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

    // Calculate Condition Track penalty
    // Official SWSE: Normal(0), -1(1), -2(2), -5(3), -10(4), Helpless(5)
    if (this.conditionTrack) {
      const conditionStep = this.conditionTrack.current || 0;
      const penalties = [0, -1, -2, -5, -10, 0]; // Helpless doesn't have numeric penalty
      this.conditionTrack.penalty = penalties[conditionStep] || 0;
    }

    // Call parent to calculate defenses, skills, etc.
    super.prepareDerivedData();

    // Calculate Force Points
    this._calculateForcePoints();

    // Override skill calculations with our static skill system
    this._prepareSkills();
  }

  _prepareSkills() {
    const skillData = {
      acrobatics: { ability: 'dex', untrained: true },
      climb: { ability: 'str', untrained: true },
      deception: { ability: 'cha', untrained: true },
      endurance: { ability: 'con', untrained: true },
      gather_information: { ability: 'cha', untrained: true },
      initiative: { ability: 'dex', untrained: true },
      jump: { ability: 'str', untrained: true },
      knowledge_bureaucracy: { ability: 'int', untrained: false },
      knowledge_galactic_lore: { ability: 'int', untrained: false },
      knowledge_life_sciences: { ability: 'int', untrained: false },
      knowledge_physical_sciences: { ability: 'int', untrained: false },
      knowledge_social_sciences: { ability: 'int', untrained: false },
      knowledge_tactics: { ability: 'int', untrained: false },
      knowledge_technology: { ability: 'int', untrained: false },
      mechanics: { ability: 'int', untrained: true },
      perception: { ability: 'wis', untrained: true },
      persuasion: { ability: 'cha', untrained: true },
      pilot: { ability: 'dex', untrained: true },
      ride: { ability: 'dex', untrained: true },
      stealth: { ability: 'dex', untrained: true },
      survival: { ability: 'wis', untrained: true },
      swim: { ability: 'str', untrained: true },
      treat_injury: { ability: 'wis', untrained: true },
      use_computer: { ability: 'int', untrained: true },
      use_the_force: { ability: 'cha', untrained: false }
    };

    const halfLevel = Math.floor(this.level.heroic / 2);

    // Droids can only use these skills untrained (unless they have Heuristic Processor)
    const droidUntrainedSkills = ['acrobatics', 'climb', 'jump', 'perception'];

    for (const [skillKey, skill] of Object.entries(this.skills)) {
      const data = skillData[skillKey];
      if (!data) continue;

      const abilityMod = this.attributes[data.ability]?.mod || 0;

      // Calculate total bonus
      let total = abilityMod + skill.miscMod;

      // Add training bonus (+5)
      if (skill.trained) {
        total += 5;
      }

      // Add half level (always, even untrained)
      total += halfLevel;

      // Add skill focus bonus
      total += skill.focusMod;

      // Determine if skill can be used untrained
      let canUseUntrained = data.untrained;

      // Droids have restricted untrained skills
      if (this.isDroid && !skill.trained) {
        canUseUntrained = droidUntrainedSkills.includes(skillKey);
        // TODO: Check for Heuristic Processor feat to override this
      }

      // Store calculated values
      skill.total = total;
      skill.ability = data.ability;
      skill.abilityMod = abilityMod;
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
