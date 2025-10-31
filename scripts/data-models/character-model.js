import { SWSEActorDataModel } from './actor-base-model.js';

export class SWSECharacterDataModel extends SWSEActorDataModel {
  
  static defineSchema() {
    const baseSchema = super.defineSchema();
    const fields = foundry.data.fields;
    
    return {
      ...baseSchema,
      // TODO: Add character-specific fields
      // - Force Points
      // - Second Wind
      // - Dark Side Score
      // - Force Sensitivity
      // - Skills with training/focus
    };
  }
}
