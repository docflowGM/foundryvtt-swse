/**
 * Vehicle-specific functionality
 */

export class SWSEVehicleHandler {
  
  static async applyVehicleTemplate(actor, templateItem) {
    // TODO: Complete vehicle template application
    // - Replace all vehicle stats
    // - Set ship systems
    // - Configure weapons
    // - Set crew requirements
    // - Set cargo capacity
    // - Set hyperdrive rating
    
    const template = templateItem.system;
    
    const updates = {
      'system.vehicleType': template.vehicleType,
      'system.size': template.size,
      'system.speed': template.speed,
      'system.shields': template.shields,
      'system.armor': template.armor,
      'system.hp': template.hp,
      'system.hyperdrive': template.hyperdrive,
      'system.cargo': template.cargo,
      'system.crew': template.crew
    };
    
    await actor.update(updates);
    await actor.createEmbeddedDocuments('Item', [templateItem.toObject()]);
    
    ui.notifications.info(\`\${actor.name} set to \${templateItem.name}\`);
  }
}
