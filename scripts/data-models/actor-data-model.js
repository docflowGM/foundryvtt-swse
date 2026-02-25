import { SWSELogger } from '../utils/logger.js';

export class SWSEActorDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    if (!foundry?.data?.fields) {
      throw new Error('Foundry data fields not available - system initialization error');
    }
    const fields = foundry.data.fields;

    // Base schema with common actor fields
    return {
      // Abilities
      abilities: new fields.SchemaField({
        str: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        dex: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        con: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        int: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        wis: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        cha: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        })
      }),

      // Condition Track
      conditionTrack: new fields.SchemaField({
        current: new fields.NumberField({ required: true, initial: 0, min: 0, max: 5, integer: true }),
        persistent: new fields.BooleanField({ required: true, initial: false })
      }),

      // Defenses
      defenses: new fields.SchemaField({
        reflex: new fields.SchemaField({
          total: new fields.NumberField({ required: true, initial: 12, integer: true }),
          armor: new fields.NumberField({ required: true, initial: 0, integer: true }),
          classBonus: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.SchemaField({
            auto: new fields.SchemaField({}),
            user: new fields.SchemaField({})
          }),
          ability: new fields.StringField({ required: true, initial: 'dex' }),
          source: new fields.StringField({ required: false, initial: 'level' }),
          level: new fields.NumberField({ required: false, initial: 0, integer: true })
        }),
        fort: new fields.SchemaField({
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          classBonus: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.SchemaField({
            auto: new fields.SchemaField({}),
            user: new fields.SchemaField({})
          }),
          ability: new fields.StringField({ required: true, initial: 'con' }),
          level: new fields.NumberField({ required: false, initial: 0, integer: true })
        }),
        will: new fields.SchemaField({
          total: new fields.NumberField({ required: true, initial: 11, integer: true }),
          classBonus: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.SchemaField({
            auto: new fields.SchemaField({}),
            user: new fields.SchemaField({})
          }),
          ability: new fields.StringField({ required: true, initial: 'wis' }),
          level: new fields.NumberField({ required: false, initial: 0, integer: true })
        }),
        flatFooted: new fields.SchemaField({
          total: new fields.NumberField({ required: true, initial: 10, integer: true })
        })
      }),

      // Level
      level: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 20,
        integer: true
      }),

      // Skills (base empty, will be extended in child classes)
      skills: new fields.SchemaField({}),

      // Size
      size: new fields.StringField({ required: false, initial: 'medium' }),

      // Speed
      speed: new fields.NumberField({ required: true, initial: 6, min: 0 }),

      // JSON-backed + progression-owned fields (kept permissive)
      languages: new fields.ArrayField(new fields.StringField({ required: true, initial: '' }), { required: true, initial: [] }),
      languageIds: new fields.ArrayField(new fields.StringField({ required: true, initial: '' }), { required: true, initial: [] }),
      languageUuids: new fields.ArrayField(new fields.StringField({ required: true, initial: '' }), { required: true, initial: [] }),
      backgroundId: new fields.StringField({ required: false, initial: '' }),
      backgroundUuid: new fields.StringField({ required: false, initial: '' }),
      progression: new fields.ObjectField({ required: true, initial: {} }),

      // SOVEREIGNTY CONSOLIDATION: Derived values (computed exclusively by DerivedCalculator)
      // These are OUTPUT-ONLY fields. Never write to them except through DerivedCalculator.
      derived: new fields.SchemaField({
        // Derived ability scores and modifiers
        attributes: new fields.SchemaField({
          str: new fields.SchemaField({
            base: new fields.NumberField({ required: true, initial: 10, integer: true }),
            racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
            enhancement: new fields.NumberField({ required: true, initial: 0, integer: true }),
            temp: new fields.NumberField({ required: true, initial: 0, integer: true }),
            total: new fields.NumberField({ required: true, initial: 10, integer: true }),
            mod: new fields.NumberField({ required: true, initial: 0, integer: true })
          }),
          dex: new fields.SchemaField({
            base: new fields.NumberField({ required: true, initial: 10, integer: true }),
            racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
            enhancement: new fields.NumberField({ required: true, initial: 0, integer: true }),
            temp: new fields.NumberField({ required: true, initial: 0, integer: true }),
            total: new fields.NumberField({ required: true, initial: 10, integer: true }),
            mod: new fields.NumberField({ required: true, initial: 0, integer: true })
          }),
          con: new fields.SchemaField({
            base: new fields.NumberField({ required: true, initial: 10, integer: true }),
            racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
            enhancement: new fields.NumberField({ required: true, initial: 0, integer: true }),
            temp: new fields.NumberField({ required: true, initial: 0, integer: true }),
            total: new fields.NumberField({ required: true, initial: 10, integer: true }),
            mod: new fields.NumberField({ required: true, initial: 0, integer: true })
          }),
          int: new fields.SchemaField({
            base: new fields.NumberField({ required: true, initial: 10, integer: true }),
            racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
            enhancement: new fields.NumberField({ required: true, initial: 0, integer: true }),
            temp: new fields.NumberField({ required: true, initial: 0, integer: true }),
            total: new fields.NumberField({ required: true, initial: 10, integer: true }),
            mod: new fields.NumberField({ required: true, initial: 0, integer: true })
          }),
          wis: new fields.SchemaField({
            base: new fields.NumberField({ required: true, initial: 10, integer: true }),
            racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
            enhancement: new fields.NumberField({ required: true, initial: 0, integer: true }),
            temp: new fields.NumberField({ required: true, initial: 0, integer: true }),
            total: new fields.NumberField({ required: true, initial: 10, integer: true }),
            mod: new fields.NumberField({ required: true, initial: 0, integer: true })
          }),
          cha: new fields.SchemaField({
            base: new fields.NumberField({ required: true, initial: 10, integer: true }),
            racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
            enhancement: new fields.NumberField({ required: true, initial: 0, integer: true }),
            temp: new fields.NumberField({ required: true, initial: 0, integer: true }),
            total: new fields.NumberField({ required: true, initial: 10, integer: true }),
            mod: new fields.NumberField({ required: true, initial: 0, integer: true })
          })
        }),

        // Derived defenses
        defenses: new fields.SchemaField({
          fortitude: new fields.SchemaField({
            base: new fields.NumberField({ required: true, initial: 10, integer: true }),
            total: new fields.NumberField({ required: true, initial: 10, integer: true }),
            adjustment: new fields.NumberField({ required: true, initial: 0, integer: true })
          }),
          reflex: new fields.SchemaField({
            base: new fields.NumberField({ required: true, initial: 10, integer: true }),
            total: new fields.NumberField({ required: true, initial: 10, integer: true }),
            adjustment: new fields.NumberField({ required: true, initial: 0, integer: true })
          }),
          will: new fields.SchemaField({
            base: new fields.NumberField({ required: true, initial: 10, integer: true }),
            total: new fields.NumberField({ required: true, initial: 10, integer: true }),
            adjustment: new fields.NumberField({ required: true, initial: 0, integer: true })
          })
        }),

        // Derived initiative
        initiative: new fields.SchemaField({
          dexModifier: new fields.NumberField({ required: true, initial: 0, integer: true }),
          adjustment: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),

        // Derived HP and damage threshold
        hp: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          max: new fields.NumberField({ required: true, initial: 10, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          value: new fields.NumberField({ required: true, initial: 10, integer: true }),
          adjustment: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),

        damageThreshold: new fields.NumberField({ required: true, initial: 0, integer: true }),

        // Base attack bonus
        bab: new fields.NumberField({ required: true, initial: 0, integer: true }),
        babAdjustment: new fields.NumberField({ required: true, initial: 0, integer: true }),

        // Force and Destiny points
        forcePoints: new fields.SchemaField({
          wisdom: new fields.NumberField({ required: true, initial: 0, integer: true }),
          classBonus: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),

        destinyPoints: new fields.SchemaField({
          charisma: new fields.NumberField({ required: true, initial: 0, integer: true }),
          classBonus: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),

        // Modifier engine output
        modifiers: new fields.ObjectField({ required: true, initial: {} })
      })
    };
  }

  /* -------------------------------------------------------------------------- */
  /* DERIVED DATA (CORE RULE ENGINE)                                            */
  /* -------------------------------------------------------------------------- */

  prepareDerivedData() {
    // SOVEREIGNTY CONSOLIDATION: All derived math has moved to DerivedCalculator.
    // This method intentionally does nothing to prevent dual-authority computation.
    // DerivedCalculator.computeAll() is the SOLE authority for all derived values.
  }

}