import { SWSEActorDataModel } from './actor-data-model.js';

export class SWSECharacterDataModel extends SWSEActorDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Force
      forcePoints: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 5, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 5, min: 0, integer: true})
      }),

      darkSideScore: new fields.NumberField({required: true, initial: 0, min: 0, integer: true}),

      destinyPoints: new fields.NumberField({required: true, initial: 1, min: 0, integer: true}),

      // Second Wind
      secondWind: new fields.SchemaField({
        used: new fields.BooleanField({required: true, initial: false}),
        value: new fields.NumberField({required: true, initial: 0, integer: true})
      }),

      // Force Suite
      forceSuite: new fields.SchemaField({
        max: new fields.NumberField({required: true, initial: 0, integer: true})
      }),

      // Character details
      species: new fields.StringField({required: false, initial: "Human"}),
      class: new fields.StringField({required: false, initial: ""}),
      background: new fields.StringField({required: false, initial: ""}),
      size: new fields.StringField({required: false, initial: "Medium"})
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this._calculateSecondWind();
    this._calculateForcePoints();
    this._calculateForceSuite();
  }

  _calculateSecondWind() {
    this.secondWind.value = Math.floor((this.hp.max || 1) / 4) + this.abilities.con.mod;
  }

  _calculateForcePoints() {
    this.forcePoints.max = 5 + Math.floor((this.level || 1) / 2);
  }

  _calculateForceSuite() {
    // Base 6, can be modified by talents
    this.forceSuite.max = 6;
  }
}
