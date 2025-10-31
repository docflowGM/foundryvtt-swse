/**
 * Vehicle Data Model
 * Specialized data model for vehicle actors
 */

export class SWSEVehicleDataModel extends foundry.abstract.DataModel {
  
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      // Hit Points
      hp: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 1, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 1, min: 1, integer: true})
      }),
      
      // Shield Points
      shields: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 0, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 0, min: 0, integer: true}),
        rating: new fields.NumberField({required: true, initial: 0, min: 0, integer: true})
      }),
      
      // Defenses
      reflex: new fields.NumberField({required: true, initial: 10, integer: true}),
      fortitude: new fields.NumberField({required: true, initial: 10, integer: true}),
      
      // Damage Reduction
      damageReduction: new fields.NumberField({required: true, initial: 0, min: 0, integer: true}),
      
      // Speed
      speed: new fields.SchemaField({
        space: new fields.NumberField({required: true, initial: 0, min: 0}),
        atmosphere: new fields.NumberField({required: true, initial: 0, min: 0}),
        hyperspace: new fields.StringField({initial: "x1"})
      }),
      
      // Cargo and Passengers
      cargo: new fields.NumberField({required: true, initial: 0, min: 0}),
      passengers: new fields.NumberField({required: true, initial: 0, min: 0, integer: true}),
      
      // Crew
      crew: new fields.SchemaField({
        minimum: new fields.NumberField({required: true, initial: 1, min: 0, integer: true}),
        normal: new fields.NumberField({required: true, initial: 1, min: 0, integer: true})
      }),
      
      // Vehicle Type and Class
      vehicleType: new fields.StringField({
        required: true,
        initial: "starfighter",
        choices: ["starfighter", "transport", "capital", "space-station", "walker", "speeder", "beast"],
        label: "Vehicle Type"
      }),
      
      size: new fields.StringField({
        required: true,
        initial: "colossal",
        choices: ["gargantuan", "colossal", "colossal-frigate", "colossal-cruiser", "colossal-station"],
        label: "Size Category"
      }),
      
      // Cost
      cost: new fields.NumberField({required: true, initial: 0, min: 0}),
      
      // Description
      description: new fields.HTMLField({label: "Description"}),
      notes: new fields.HTMLField({label: "GM Notes"})
    };
  }
  
  prepareDerivedData() {
    // Vehicle-specific calculations
    this._prepareShieldRating();
  }
  
  _prepareShieldRating() {
    // Shield rating affects damage reduction
    if (this.shields.max > 0) {
      this.shields.rating = Math.floor(this.shields.max / 10);
    }
  }
}
