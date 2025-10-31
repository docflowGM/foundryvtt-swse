/**
 * Character Data Model
 * Extends base actor model with character-specific fields
 */

import { SWSEActorDataModel } from './actor-data-model.js';

export class SWSECharacterDataModel extends SWSEActorDataModel {
  
  static defineSchema() {
    const schema = super.defineSchema();
    const fields = foundry.data.fields;
    
    // Add character-specific fields
    return {
      ...schema,
      
      // Destiny Points (character-only)
      destinyPoints: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 1, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 1, min: 0, integer: true})
      }),
      
      // Dark Side Score
      darkSideScore: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "Dark Side Score"
      }),
      
      // Force Power Suite
      forceSuite: new fields.SchemaField({
        size: new fields.NumberField({required: true, initial: 6, min: 0, integer: true}),
        powers: new fields.ArrayField(new fields.StringField())
      }),
      
      // Languages
      languages: new fields.ArrayField(
        new fields.StringField(),
        {label: "Known Languages"}
      ),
      
      // Carrying Capacity
      carryingCapacity: new fields.SchemaField({
        light: new fields.NumberField({required: true, initial: 0}),
        medium: new fields.NumberField({required: true, initial: 0}),
        heavy: new fields.NumberField({required: true, initial: 0}),
        current: new fields.NumberField({required: true, initial: 0})
      })
    };
  }
  
  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Calculate carrying capacity
    this._prepareCarryingCapacity();
    
    // Check Force alignment
    this._prepareForceAlignment();
  }
  
  _prepareCarryingCapacity() {
    const strScore = this.abilities.str.total;
    const sizeMultiplier = this._getSizeMultiplier();
    
    this.carryingCapacity.light = Math.floor(strScore * 10 * sizeMultiplier);
    this.carryingCapacity.medium = Math.floor(strScore * 20 * sizeMultiplier);
    this.carryingCapacity.heavy = Math.floor(strScore * 30 * sizeMultiplier);
  }
  
  _getSizeMultiplier() {
    const multipliers = {
      fine: 0.125,
      diminutive: 0.25,
      tiny: 0.5,
      small: 0.75,
      medium: 1,
      large: 2,
      huge: 4,
      gargantuan: 8,
      colossal: 16
    };
    return multipliers[this.size] || 1;
  }
  
  _prepareForceAlignment() {
    // Check if Dark Side Score >= half level
    const halfLevel = Math.floor(this.level / 2);
    this.isDarkSide = this.darkSideScore >= halfLevel;
  }
}
