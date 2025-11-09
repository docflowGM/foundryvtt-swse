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
    if (actor.type !== 'vehicle') {
      ui.notifications.warn('Can only apply vehicle templates to vehicle actors!');
      return false;
    }
    
    if (vehicleItem.type !== 'equipment' && vehicleItem.type !== 'vehicle') {
      ui.notifications.warn('Invalid vehicle template item!');
      return false;
    }
    
    console.log('SWSE | Applying vehicle template:', vehicleItem.name);
    
    const template = vehicleItem.system;
    
    // Build update object, mapping JSON structure to vehicle data model
    const updates = {
      name: vehicleItem.name,
      'system.vehicleType': template.vehicle_type || 'Vehicle',
      'system.size': this._extractSize(template.crew_size) || 'Colossal',
      'system.speed': template.speed || '12 squares',
      
      // Hull (from hit_points)
      'system.hull.value': template.hit_points || 50,
      'system.hull.max': template.hit_points || 50,
      
      // Shields (default to 0 if not specified)
      'system.shields.value': template.shields?.value || 0,
      'system.shields.max': template.shields?.max || 0,
      
      // Defenses
      'system.reflexDefense': template.defenses?.reflex || 10,
      'system.fortitudeDefense': template.defenses?.fortitude || 10,
      'system.damageThreshold': template.damage_threshold || 30,
      'system.damageReduction': template.damage_reduction || 0,
      
      // Movement
      'system.maneuver': template.maneuver || '+0',
      
      // Crew & Cargo
      'system.crew': template.crew_size || '1',
      'system.passengers': template.passengers || '0',
      'system.cargo': template.cargo_capacity || '100 kg',
      'system.consumables': template.consumables || '1 week',
      
      // Hyperdrive
      'system.hyperdrive': template.hyperdrive_class || 'None',
      
      // Cost
      'system.cost.new': template.cost?.new || 0,
      'system.cost.used': template.cost?.used || 0,
      
      // Description & Tags
      'system.description': template.description || '',
      'system.tags': template.tags || []
    };
    
    // Handle weapons if they exist and are properly formatted
    if (template.weapons && Array.isArray(template.weapons)) {
      const validWeapons = template.weapons.filter(w => 
        w.name && !w.name.toLowerCase().includes('categories')
      );
      
      if (validWeapons.length > 0) {
        updates['system.weapons'] = validWeapons.map(w => ({
          name: w.name || 'Weapon',
          arc: w.arc || 'Forward',
          bonus: w.bonus || '+0',
          damage: w.damage || '0d0',
          range: w.range || 'Close'
        }));
      }
    }
    
    await actor.update(updates);
    
    ui.notifications.info(`${actor.name} configured as ${vehicleItem.name}`);
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
    
    // Check if it has vehicle-specific properties
    const sys = item.system;
    return (
      (item.type === 'equipment' || item.type === 'vehicle') &&
      (sys.vehicle_type || sys.hit_points || sys.damage_threshold)
    );
  }
}
