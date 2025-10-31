import { SWSEActorDataModel } from './actor-base-model.js';

export class SWSEVehicleDataModel extends SWSEActorDataModel {
  
  static defineSchema() {
    const fields = foundry.data.fields;
    
    return {
      // TODO: Define vehicle schema
      // - Ship Systems (shields, sensors, weapons)
      // - Crew positions
      // - Cargo capacity
      // - Hyperdrive rating
      // - Speed/maneuverability
    };
  }
  
  // TODO: Implement template system
  // When a vehicle Item is dropped, apply its stats to this actor
}
