/**
 * Base Actor Data Model for SWSE
 * Provides shared schema and validation
 */
export class SWSEActorDataModel extends foundry.abstract.DataModel {
  
  static defineSchema() {
    const fields = foundry.data.fields;
    
    return {
      // TODO: Define complete actor schema
      // - Ability scores
      // - Defenses (Reflex, Fortitude, Will)
      // - HP, Damage Threshold
      // - Condition Track
      // - Skills
      // - Level, Size, Speed
      // - BAB, Initiative
    };
  }
  
  prepareDerivedData() {
    // TODO: Calculate ability modifiers
    // TODO: Calculate defenses
    // TODO: Calculate condition penalties
  }
}
