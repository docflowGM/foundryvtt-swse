import { SWSEActorDataModel } from './actor-data-model.js';

export class SWSECharacterDataModel extends SWSEActorDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
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

      // Rest of character data
      hp: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 30, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 30, min: 1, integer: true}),
        temp: new fields.NumberField({required: true, initial: 0, integer: true})
      }),

      level: new fields.SchemaField({
        heroic: new fields.NumberField({required: true, initial: 1, min: 1, max: 20, integer: true})
      }),

      defenses: new fields.SchemaField({
        reflex: new fields.NumberField({required: true, initial: 10, integer: true}),
        fortitude: new fields.NumberField({required: true, initial: 10, integer: true}),
        will: new fields.NumberField({required: true, initial: 10, integer: true})
      }),

      biography: new fields.StringField({required: false, initial: ""})
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    // Calculate ability modifiers
    for (const [key, ability] of Object.entries(this.attributes)) {
      const total = ability.base + ability.racial + ability.enhancement + ability.temp;
      ability.total = total;
      ability.mod = Math.floor((total - 10) / 2);
    }

    // Calculate skill totals
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

    for (const [skillKey, skill] of Object.entries(this.skills)) {
      const data = skillData[skillKey];
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
      
      // Store calculated values
      skill.total = total;
      skill.ability = data.ability;
      skill.abilityMod = abilityMod;
      skill.untrained = data.untrained;
      skill.canUse = skill.trained || data.untrained;
    }
  }
}
    // --- Compatibility shim for template expectations ---
    // Ensure `.abilities` exists with { total, mod }
    if (!this.abilities) this.abilities = {};
    try {
      for (const [k, attr] of Object.entries(this.attributes || {})) {
        const total = (attr.base || 0) + (attr.racial || 0) + (attr.enhancement || 0) + (attr.temp || 0);
        const mod = Math.floor((total - 10) / 2);

        this.abilities[k] = {
          base: attr.base || 0,
          total,
          mod
        };
      }
    } catch (err) {
      console.warn("SWSE | abilities shim failure:", err);
    }

    // Normalize defenses into { total } objects
    try {
      const def = this.defenses || {};
      this.defenses = {
        reflex: typeof def.reflex === "number" ? { total: def.reflex } : def.reflex,
        fortitude: typeof def.fortitude === "number" ? { total: def.fortitude } : def.fortitude,
        will: typeof def.will === "number" ? { total: def.will } : def.will
      };
    } catch (err) {
      console.warn("SWSE | defenses shim failure:", err);
    }
    // --- End compatibility shim ---

