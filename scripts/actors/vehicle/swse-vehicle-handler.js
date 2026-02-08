import { SWSELogger } from '../../utils/logger.js';
import { parseVehicleSpeedText, formatSquares } from '../../utils/movement-normalizer.js';

/**
 * Vehicle-specific functionality
 * Handles applying vehicle templates to vehicle actors
 */

export class SWSEVehicleHandler {

  /**
   * Apply a vehicle template Item to a vehicle Actor
   * This transforms the actor into the templated vehicle
   */
  static async applyVehicleTemplate(actor, vehicleItem) {
    // Validate inputs
    if (!actor || !vehicleItem) {
      ui.notifications.warn('Missing actor or vehicle item');
      return false;
    }

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
    if (!template) {
      ui.notifications.error('Vehicle item has no system data');
      return false;
    }

    // Helper function to get attribute block with derived fields
    const getAttributeBlock = (attr) => ({
      base: attr?.base ?? 10,
      racial: attr?.racial ?? 0,
      temp: attr?.temp ?? 0
    });

    // Normalize SWSE speed strings into flags + schema-safe strings
    const speedInfo = parseVehicleSpeedText(template.speed ?? template.speedText ?? '');

    const speedString = formatSquares(
      speedInfo.character?.squares ?? template.speed,
      typeof template.speed === 'string' ? template.speed : '12 squares'
    );

    const starshipSpeedString = template.starshipSpeed
      ? (typeof template.starshipSpeed === 'string' ? template.starshipSpeed : formatSquares(template.starshipSpeed, ''))
      : (speedInfo.starship?.squares != null ? formatSquares(speedInfo.starship.squares, '') : null);

    // Build update object - the template now uses the migrated schema
    const updates = {
      name: vehicleItem.name,
      img: vehicleItem.img ?? actor.img,

      // Attributes (copy from template if present, supports both attributes and abilities for compatibility)
      // Vehicles use 'attributes' field (see vehicle-data-model.js), not 'abilities' like characters/droids
      'system.attributes': template.attributes ? {
        str: getAttributeBlock(template.attributes.str),
        dex: getAttributeBlock(template.attributes.dex),
        con: getAttributeBlock(template.attributes.con),
        int: getAttributeBlock(template.attributes.int),
        wis: getAttributeBlock(template.attributes.wis),
        cha: getAttributeBlock(template.attributes.cha)
      } : (template.abilities ? {
        str: getAttributeBlock(template.abilities.str),
        dex: getAttributeBlock(template.abilities.dex),
        con: getAttributeBlock(template.abilities.con),
        int: getAttributeBlock(template.abilities.int),
        wis: getAttributeBlock(template.abilities.wis),
        cha: getAttributeBlock(template.abilities.cha)
      } : {
        str: getAttributeBlock(null),
        dex: getAttributeBlock(null),
        con: getAttributeBlock(null),
        int: getAttributeBlock(null),
        wis: getAttributeBlock(null),
        cha: getAttributeBlock(null)
      }),

      // Hull (use nullish coalescing, not logical OR)
      'system.hull.value': template.hull?.value ?? template.hull?.max ?? 50,
      'system.hull.max': template.hull?.max ?? 50,

      // Shields (use nullish coalescing, not logical OR)
      'system.shields.value': template.shields?.value ?? 0,
      'system.shields.max': template.shields?.max ?? 0,

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
      // VehicleDataModel uses StringField for speed fields.
      'system.speed': speedString,
      ...(starshipSpeedString ? { 'system.starshipSpeed': starshipSpeedString } : {}),
      'system.maxVelocity': speedInfo.maxVelocity || template.maxVelocity || '800 km/h',
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
      'system.cover': template.cover || 'none',

      // Challenge Level
      'system.challengeLevel': template.challengeLevel || 1,

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
      'system.page': template.page || null,

      // Optional vehicle information
      'system.payload': template.payload || '',
      'system.availability': template.availability || '',

      // Store parsed movement so sheets/builders can present type + scale without schema churn
      'flags.swse.movement': {
        raw: speedInfo.raw,
        maxVelocity: speedInfo.maxVelocity,
        modes: speedInfo.modes,
        character: speedInfo.character,
        starship: speedInfo.starship
      }
    };

    // Validate ActorEngine exists
    if (!globalThis.SWSE?.ActorEngine?.updateActor) {
      ui.notifications.error('Actor engine not available');
      SWSELogger.error('SWSE | ActorEngine not found');
      return false;
    }

    try {
      await globalThis.SWSE.ActorEngine.updateActor(actor, updates);
      ui.notifications.info(`${vehicleItem.name} applied to ${actor.name}`);
      return true;
    } catch (error) {
      SWSELogger.error('SWSE | Error applying vehicle template:', error);
      ui.notifications.error('Failed to apply vehicle template');
      return false;
    }
  }

  /**
   * Extract size from crew_size string
   * e.g., "1 (Expert Crew Quality)" -> try to infer size
   */
  static _extractSize(crewString) {
    // This is a heuristic - you may want to add size explicitly to your JSON
    if (!crewString) {return 'Colossal';}

    // Could add logic here to infer size from crew requirements
    // For now, return a default
    return 'Colossal';
  }

  /**
   * Check if an item is a vehicle template
   */
  static isVehicleTemplate(item) {
    if (!item) {return false;}

    // Check if it has vehicle-specific properties (migrated schema)
    const sys = item.system;
    return (
      (item.type === 'equipment' || item.type === 'vehicle') &&
      (sys.hull || sys.damageThreshold || sys.reflexDefense || sys.type)
    );
  }
}
