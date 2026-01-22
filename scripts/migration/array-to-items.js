import { SWSELogger } from '../utils/logger.js';
import { ProgressionEngine } from "../progression/engine/progression-engine.js";
/**
 * Migration Utilities
 * Converts old array-based storage to Item-based architecture
 */

export class SWSEMigration {
  
  /**
   * Migrate all actors from arrays to Items
   */
  static async migrateWorld() {
    ui.notifications.info("Starting SWSE migration...");
    
    let actorCount = 0;
    let itemsCreated = 0;
    
    for (const actor of game.actors) {
      const result = await this.migrateActor(actor);
      if (result) {
        actorCount++;
        itemsCreated += result;
      }
    }
    
    ui.notifications.info(`Migration complete! Migrated ${actorCount} actors, created ${itemsCreated} items.`);
  }
  
  /**
   * Migrate a single actor
   */
  static async migrateActor(actor) {
    SWSELogger.log(`Migrating actor: ${actor.name}`);
    
    const updates = [];
    let itemsCreated = 0;
    
    // Migrate feats array
    if (actor.system.feats && Array.isArray(actor.system.feats) && actor.system.feats.length > 0) {
      for (const feat of actor.system.feats) {
        if (feat.name) {
          updates.push({
            name: feat.name,
            type: 'feat',
            system: {
              description: feat.description || '',
              prerequisite: feat.prerequisite || '',
              benefit: feat.benefit || ''
            }
          });
        }
      }
    }
    
    // Migrate talents array
    if (actor.system.talents && Array.isArray(actor.system.talents) && actor.system.talents.length > 0) {
      for (const talent of actor.system.talents) {
        if (talent.name) {
          updates.push({
            name: talent.name,
            type: 'talent',
            system: {
              tree: talent.tree || '',
              description: talent.description || '',
              benefit: talent.benefit || ''
            }
          });
        }
      }
    }
    
    // Migrate weapons array
    if (actor.system.weapons && Array.isArray(actor.system.weapons) && actor.system.weapons.length > 0) {
      for (const weapon of actor.system.weapons) {
        if (weapon.name) {
          updates.push({
            name: weapon.name,
            type: 'weapon',
            system: {
              damage: weapon.damage || '1d6',
              attackBonus: weapon.attackBonus || 0,
              attackAttribute: weapon.attackAttr || 'str',
              equipped: weapon.equipped || false,
              description: weapon.description || ''
            }
          });
        }
      }
    }
    
    // Create all items
    if (updates.length > 0) {
      await actor.createEmbeddedDocuments('Item', updates);
      itemsCreated = updates.length;
      
      // Clear old arrays
        'system.feats': [],
        'system.talents': [],
        'system.weapons': []
      });
globalThis.SWSE.actor.update( {
        'system.feats': [],
        'system.talents': [],
        'system.weapons': []
      });


      
      SWSELogger.log(`  Created ${itemsCreated} items for ${actor.name}`);
    }
    
    return itemsCreated;
  }
  
  /**
   * Verify migration
   */
  static verifyMigration() {
    const issues = [];
    
    for (const actor of game.actors) {
      // Check for remaining array data
      if (actor.system.feats?.length > 0) {
        issues.push(`${actor.name}: Still has feats array (${actor.system.feats.length} items)`);
      }
      if (actor.system.talents?.length > 0) {
        issues.push(`${actor.name}: Still has talents array (${actor.system.talents.length} items)`);
      }
      if (actor.system.weapons?.length > 0) {
        issues.push(`${actor.name}: Still has weapons array (${actor.system.weapons.length} items)`);
      }
      
      // Check Item structure
      const invalidItems = actor.items.filter(i => !i.system || typeof i.system !== 'object');
      if (invalidItems.length > 0) {
        issues.push(`${actor.name}: Has ${invalidItems.length} invalid items`);
      }
    }
    
    if (issues.length === 0) {
      ui.notifications.info('✓ Migration verification passed!');
      SWSELogger.log('Migration verification passed!');
    } else {
      ui.notifications.warn(`Found ${issues.length} migration issues - check console`);
      SWSELogger.warn('Migration issues found:', issues);
    }
    
    return issues;
  }
  
  /**
   * Create backup before migration
   */
  static async createBackup() {
    const backup = {
      version: game.system.version,
      timestamp: Date.now(),
      actors: game.actors.map(a => a.toObject())
    };
    
    await game.settings.register('foundryvtt-swse', 'migrationBackup', {
      scope: 'world',
      config: false,
      type: String,
      default: '{}'
    });
    
    await game.settings.set('foundryvtt-swse', 'migrationBackup', JSON.stringify(backup));
    ui.notifications.info('Backup created successfully');
  }
}

// Register console commands
window.SWSEMigration = SWSEMigration;
