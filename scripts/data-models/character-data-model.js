import { SWSEActorDataModel } from './actor-data-model.js';

/**
 * Character Data Model for SWSE
 * This defines the complete data structure for player characters.
 * Every field here represents a piece of information the system tracks.
 */
export class SWSECharacterDataModel extends SWSEActorDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Force-specific fields that only characters have
      forcePoints: new fields.SchemaField({
        value: new fields.NumberField({
          required: true, 
          initial: 5, 
          min: 0,
          label: "Current Force Points"
        }),
        max: new fields.NumberField({
          required: true, 
          initial: 5, 
          min: 0,
          label: "Maximum Force Points"
        }),
        darkSide: new fields.NumberField({
          required: true,
          initial: 0,
          min: 0,
          label: "Dark Side Score"
        })
      }),

      // Destiny Points for dramatic moments
      destinyPoints: new fields.NumberField({
        required: true,
        initial: 1,
        min: 0,
        label: "Destiny Points"
      }),

      // Second Wind - the emergency healing ability
      secondWind: new fields.SchemaField({
        used: new fields.BooleanField({
          required: true,
          initial: false,
          label: "Second Wind Used"
        }),
        healing: new fields.NumberField({
          required: true,
          initial: 0,
          label: "Second Wind Healing Amount"
        })
      }),

      // Force Powers Suite Management
      forceSuite: new fields.SchemaField({
        maxPowers: new fields.NumberField({
          required: true,
          initial: 0,
          label: "Maximum Suite Powers"
        }),
        rechargeRate: new fields.StringField({
          required: true,
          initial: "encounter",
          choices: ["encounter", "daily", "scene"],
          label: "Suite Recharge Rate"
        })
      }),

      // Character background and roleplay information
      background: new fields.SchemaField({
        species: new fields.StringField({initial: "Human"}),
        age: new fields.NumberField({initial: 25, min: 1}),
        height: new fields.StringField({initial: ""}),
        weight: new fields.StringField({initial: ""}),
        eyes: new fields.StringField({initial: ""}),
        hair: new fields.StringField({initial: ""}),
        skin: new fields.StringField({initial: ""}),
        homeland: new fields.StringField({initial: ""}),
        affiliation: new fields.StringField({initial: ""}),
        description: new fields.HTMLField({initial: ""})
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    // Calculate Force-specific derived values
    this._calculateForceRerollDice();
    this._calculateSecondWind();
    this._calculateForceSuiteSize();
  }

  _calculateForceRerollDice() {
    // Force Point dice scale with level
    const level = this.parent.system.level || 1;
    if (level >= 15) this.forceRerollDice = '3d6';
    else if (level >= 8) this.forceRerollDice = '2d6';
    else this.forceRerollDice = '1d6';
  }

  _calculateSecondWind() {
    // Second Wind heals 1/4 max HP
    const maxHP = this.hp.max || 1;
    this.secondWind.healing = Math.floor(maxHP / 4);
  }

  _calculateForceSuiteSize() {
    // Base suite size is 6, can be modified by talents
    let suiteSize = 6;

    // Check for talent bonuses (would need item checking)
    // This is where you'd look for "Greater Force Powers" talent

    this.forceSuite.maxPowers = suiteSize;
  }
}
