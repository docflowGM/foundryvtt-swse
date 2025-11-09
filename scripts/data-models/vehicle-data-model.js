import { SWSEActorDataModel } from './actor-data-model.js';

export class SWSEVehicleDataModel extends SWSEActorDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // Vehicles have attributes too!
      attributes: new fields.SchemaField({
        str: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        dex: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        con: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        int: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        wis: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        }),
        cha: new fields.SchemaField({
          base: new fields.NumberField({required: true, initial: 10, integer: true}),
          racial: new fields.NumberField({required: true, initial: 0, integer: true}),
          temp: new fields.NumberField({required: true, initial: 0, integer: true})
        })
      }),
      
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

  prepareDerivedData() {
    // Calculate ability modifiers
    for (const [key, ability] of Object.entries(this.attributes)) {
      const total = ability.base + ability.racial + ability.temp;
      ability.total = total;
      ability.mod = Math.floor((total - 10) / 2);
    }
    
    // Ensure defenses are numbers
    this.reflexDefense = Number(this.reflexDefense) || 10;
    this.fortitudeDefense = Number(this.fortitudeDefense) || 10;
    this.damageThreshold = Number(this.damageThreshold) || 30;
    
    // Ensure shield/hull values are numbers
    if (this.shields) {
      this.shields.value = Number(this.shields.value) || 0;
      this.shields.max = Number(this.shields.max) || 0;
    }
    
    if (this.hull) {
      this.hull.value = Number(this.hull.value) || 0;
      this.hull.max = Number(this.hull.max) || 0;
    }
  }
}
