/**
 * Centralized Drag-Drop Handler for SWSE
 * Handles dropping Items onto Actors with automatic stat application
 */

export class SWSEDropHandler {
  
  static async handleDrop(actor, data) {
    // TODO: Route drop events by item type
    
    if (data.type !== 'Item') return;
    
    const item = await Item.implementation.fromDropData(data);
    if (!item) return;
    
    switch (item.type) {
      case 'species':
        return this.handleSpeciesDrop(actor, item);
      case 'class':
        return this.handleClassDrop(actor, item);
      case 'feat':
        return this.handleFeatDrop(actor, item);
      case 'talent':
        return this.handleTalentDrop(actor, item);
      case 'forcepower':
        return this.handleForcePowerDrop(actor, item);
      case 'droid-chassis':
        return this.handleDroidChassisDrop(actor, item);
      case 'vehicle-template':
        return this.handleVehicleTemplateDrop(actor, item);
      default:
        return this.handleDefaultDrop(actor, item);
    }
  }
  
  static async handleSpeciesDrop(actor, species) {
    // TODO: Apply species bonuses
    // - Ability score modifiers
    // - Size
    // - Speed
    // - Special abilities/features
    
    await actor.createEmbeddedDocuments('Item', [species.toObject()]);
    
    // Apply racial bonuses
    const updates = {
      'system.abilities.str.racial': species.system.abilityMods?.str || 0,
      'system.abilities.dex.racial': species.system.abilityMods?.dex || 0,
      // ... etc
      'system.size': species.system.size || 'medium',
      'system.speed.base': species.system.speed || 6
    };
    
    await actor.update(updates);
    
    ui.notifications.info(\`Applied \${species.name} racial traits\`);
  }
  
  static async handleClassDrop(actor, classItem) {
    // TODO: Add class level
    // - Grant class features for this level
    // - Update BAB progression
    // - Update defense bonuses
    // - Add class skills
    
    await actor.createEmbeddedDocuments('Item', [classItem.toObject()]);
  }
  
  static async handleDroidChassisDrop(actor, chassis) {
    // TODO: Apply droid chassis template
    // - Replace ALL actor stats with chassis stats
    // - Set ability scores
    // - Set defenses
    // - Set HP
    // - Set speed
    // - Add system slots
    
    const updates = {
      'system.abilities.str.base': chassis.system.abilities?.str || 10,
      'system.abilities.dex.base': chassis.system.abilities?.dex || 10,
      // ... complete stat replacement
    };
    
    await actor.update(updates);
    
    ui.notifications.info(\`Applied \${chassis.name} droid chassis\`);
  }
  
  static async handleVehicleTemplateDrop(actor, template) {
    // TODO: Apply vehicle template
    // - Replace ALL vehicle stats
    // - Set ship systems
    // - Set weapons
    // - Set crew requirements
    // - Set cargo capacity
    
    await actor.update({
      'system.type': template.system.vehicleType,
      'system.shields': template.system.shields,
      // ... complete vehicle stat replacement
    });
    
    ui.notifications.info(\`Applied \${template.name} vehicle template\`);
  }
  
  static async handleForcePowerDrop(actor, power) {
    // TODO: Add to known powers
    // - Check prerequisites
    // - Add to Force Powers list
    // - Optionally add to active suite
  }
  
  static async handleFeatDrop(actor, feat) {
    // TODO: Add feat
    // - Check prerequisites
    // - Apply passive bonuses automatically
    // - Trigger recalculation
  }
  
  static async handleTalentDrop(actor, talent) {
    // TODO: Add talent
    // - Check tree prerequisites
    // - Validate class access
    // - Apply bonuses
  }
  
  static async handleDefaultDrop(actor, item) {
    // Standard item addition
    return actor.createEmbeddedDocuments('Item', [item.toObject()]);
  }
}
