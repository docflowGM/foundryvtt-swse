/**
import { SWSELogger } from '../../utils/logger.js';
 * Vehicle-specific functionality
 * Handles applying vehicle templates to vehicle actors
 */

export class SWSEVehicleHandler {
  
  /**
   * Apply a vehicle template Item to a vehicle Actor
   * This transforms the actor into the templated vehicle
   */
  static async applyVehicleTemplate(actor, vehicleItem) {
    if (actor.type !== 'vehicle') {
      ui.notifications.warn('Can only apply vehicle templates to vehicle actors!');
      return false;
    }

    if (vehicleItem.type !== 'equipment' && vehicleItem.type !== 'vehicle') {
      ui.notifications.warn('Invalid vehicle template item!');
      return false;
    }

    SWSELogger.log('SWSE | Applying vehicle template:', vehicleItem.name);

    const template = vehicleItem.system;

    // Build update object - the template now uses the migrated schema
    const updates = {
      name: vehicleItem.name,
      img: vehicleItem.img || actor.img,

      // Attributes (copy from template if present)
      'system.attributes': template.attributes || {
        str: { base: 10, racial: 0, temp: 0 },
        dex: { base: 10, racial: 0, temp: 0 },
        con: { base: 10, racial: 0, temp: 0 },
        int: { base: 10, racial: 0, temp: 0 },
        wis: { base: 10, racial: 0, temp: 0 },
        cha: { base: 10, racial: 0, temp: 0 }
      },

      // Hull (already in correct format)
      'system.hull.value': template.hull?.value || template.hull?.max || 50,
      'system.hull.max': template.hull?.max || 50,

      // Shields (already in correct format)
      'system.shields.value': template.shields?.value || 0,
      'system.shields.max': template.shields?.max || 0,

      // Defenses (already flattened in migrated schema)
      'system.reflexDefense': template.reflexDefense || 10,
      'system.fortitudeDefense': template.fortitudeDefense || 10,
      'system.flatFooted': template.flatFooted || template.reflexDefense || 10,
      'system.damageThreshold': template.damageThreshold || 30,
      'system.damageReduction': template.damageReduction || 0,

      // Armor and crew quality
      'system.armorBonus': template.armorBonus || 0,
      'system.usePilotLevel': template.usePilotLevel !== undefined ? template.usePilotLevel : false,
      'system.crewQuality': template.crewQuality || 'normal',

      // Movement
      'system.speed': template.speed || '12 squares',
      'system.starshipSpeed': template.starshipSpeed || null,
      'system.maxVelocity': template.maxVelocity || '800 km/h',
      'system.maneuver': template.maneuver || '+0',
      'system.initiative': template.initiative || '+0',

      // Combat stats
      'system.baseAttackBonus': template.baseAttackBonus || '+0',

      // Size and type
      'system.size': template.size || 'Colossal',
      'system.type': template.type || 'Vehicle',

      // Crew & Cargo
      'system.crew': template.crew || '1',
      'system.passengers': template.passengers || '0',
      'system.cargo': template.cargo || '100 kg',
      'system.consumables': template.consumables || '1 week',

      // Hyperdrive
      'system.hyperdrive_class': template.hyperdrive_class || null,
      'system.backup_class': template.backup_class || null,

      // Cost
      'system.cost.new': template.cost?.new || 0,
      'system.cost.used': template.cost?.used || 0,

      // Weapons (already in correct format)
      'system.weapons': template.weapons || [],

      // Sensors
      'system.senses': template.senses || 'Perception +0',

      // Condition Track
      'system.conditionTrack': template.conditionTrack || { current: 0, penalty: 0 },

      // Cover
      'system.cover': template.cover || 'total',

      // Crew positions
      'system.crewPositions': template.crewPositions || {
        pilot: null,
        copilot: null,
        gunner: null,
        engineer: null,
        shields: null,
        commander: null
      },

      // Additional fields
      'system.carried_craft': template.carried_craft || null,
      'system.crewNotes': template.crewNotes || '',
      'system.tags': template.tags || [],
      'system.description': template.description || '',
      'system.sourcebook': template.sourcebook || '',
      'system.page': template.page || null
    };

    await globalThis.SWSE.ActorEngine.updateActor(actor, updates);

    ui.notifications.info(`${vehicleItem.name} applied to ${actor.name}`);
    return true;
  }
  
  /**
   * Extract size from crew_size string
   * e.g., "1 (Expert Crew Quality)" -> try to infer size
   */
  static _extractSize(crewString) {
    // This is a heuristic - you may want to add size explicitly to your JSON
    if (!crewString) return 'Colossal';
    
    // Could add logic here to infer size from crew requirements
    // For now, return a default
    return 'Colossal';
  }
  
  /**
   * Check if an item is a vehicle template
   */
  static isVehicleTemplate(item) {
    if (!item) return false;

    // Check if it has vehicle-specific properties (migrated schema)
    const sys = item.system;
    return (
      (item.type === 'equipment' || item.type === 'vehicle') &&
      (sys.hull || sys.damageThreshold || sys.reflexDefense || sys.type)
    );
  }
}
