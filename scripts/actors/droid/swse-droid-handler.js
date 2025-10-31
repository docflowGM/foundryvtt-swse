/**
 * Droid-specific functionality
 */

export class SWSEDroidHandler {
  
  static async applyDroidChassis(actor, chassisItem) {
    // TODO: Complete chassis application
    // - Replace all ability scores
    // - Set size
    // - Set speed
    // - Set HP
    // - Add system slots
    // - Clear incompatible items
    
    const chassis = chassisItem.system;
    
    const updates = {
      'system.abilities': {
        str: { base: chassis.str || 10, racial: 0, temp: 0 },
        dex: { base: chassis.dex || 10, racial: 0, temp: 0 },
        con: { base: chassis.con || 10, racial: 0, temp: 0 },
        int: { base: chassis.int || 10, racial: 0, temp: 0 },
        wis: { base: chassis.wis || 10, racial: 0, temp: 0 },
        cha: { base: chassis.cha || 10, racial: 0, temp: 0 }
      },
      'system.size': chassis.size || 'medium',
      'system.speed.base': chassis.speed || 6,
      'system.hp.max': chassis.hp || 10
    };
    
    await actor.update(updates);
    await actor.createEmbeddedDocuments('Item', [chassisItem.toObject()]);
    
    ui.notifications.info(\`\${actor.name} chassis set to \${chassisItem.name}\`);
  }
}
