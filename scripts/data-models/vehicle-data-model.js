import { SWSEActorDataModel } from './actor-data-model.js';

export class SWSEVehicleDataModel extends SWSEActorDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    // Vehicles have different structure
    return {
      // Vehicle stats
      hull: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 50, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 50, min: 1, integer: true})
      }),

      shields: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 0, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 0, min: 0, integer: true})
      }),

      // Defenses
      reflexDefense: new fields.NumberField({required: true, initial: 10, integer: true}),
      fortitudeDefense: new fields.NumberField({required: true, initial: 10, integer: true}),
      damageThreshold: new fields.NumberField({required: true, initial: 30, integer: true}),
      damageReduction: new fields.NumberField({required: true, initial: 0, integer: true}),

      // Movement
      speed: new fields.StringField({required: false, initial: "12 squares"}),
      maneuver: new fields.StringField({required: false, initial: "+0"}),

      // Other vehicle properties
      size: new fields.StringField({required: false, initial: "Colossal"}),
      crew: new fields.StringField({required: false, initial: "1"}),
      passengers: new fields.StringField({required: false, initial: "0"}),
      cargo: new fields.StringField({required: false, initial: "100 kg"}),
      consumables: new fields.StringField({required: false, initial: "1 week"}),
      hyperdrive: new fields.StringField({required: false, initial: "x1"}),
      cost: new fields.SchemaField({
        new: new fields.NumberField({required: true, initial: 0, integer: true}),
        used: new fields.NumberField({required: true, initial: 0, integer: true})
      })
    };
  }
}
