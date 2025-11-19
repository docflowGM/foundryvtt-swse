import { SWSELogger } from '../utils/logger.js';
/**
 * Defense Schema Migration
 * Fixes actor data to match the correct defense schema structure
 * 
 * Run this once in the browser console:
 * await game.swse.migrations.fixDefenseSchema()
 */

export class DefenseSchemaMigration {
  
  static async fixDefenseSchema() {
    SWSELogger.log("SWSE | Starting defense schema migration...");
    
    let fixed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const actor of game.actors) {
      try {
        const updates = {};
        let needsUpdate = false;
        
        // Check if defenses are in wrong format
        const defenses = actor.system.defenses;
        
        // If defenses.reflex is a number instead of an object, fix it
        if (typeof defenses?.reflex === 'number') {
          SWSELogger.log(`Fixing ${actor.name} - defenses are numbers`);
          
          updates['system.defenses'] = {
            reflex: {
              base: 10,
              armor: 0,
              ability: 0,
              classBonus: 0,
              misc: defenses.reflex - 10, // Preserve existing total as misc
              total: defenses.reflex
            },
            fortitude: {
              base: 10,
              armor: 0,
              ability: 0,
              classBonus: 0,
              misc: defenses.fortitude - 10,
              total: defenses.fortitude
            },
            will: {
              base: 10,
              armor: 0,
              ability: 0,
              classBonus: 0,
              misc: defenses.will - 10,
              total: defenses.will
            }
          };
          needsUpdate = true;
        }
        // If defenses are objects but missing required fields, add them
        else if (defenses?.reflex && typeof defenses.reflex === 'object') {
          if (!('armor' in defenses.reflex) || !('classBonus' in defenses.reflex)) {
            SWSELogger.log(`Fixing ${actor.name} - defenses missing fields`);
            
            updates['system.defenses.reflex.armor'] = defenses.reflex.armor ?? 0;
            updates['system.defenses.reflex.classBonus'] = defenses.reflex.classBonus ?? 0;
            updates['system.defenses.reflex.ability'] = defenses.reflex.ability ?? 0;
            updates['system.defenses.reflex.base'] = defenses.reflex.base ?? 10;
            
            updates['system.defenses.fortitude.armor'] = defenses.fortitude.armor ?? 0;
            updates['system.defenses.fortitude.classBonus'] = defenses.fortitude.classBonus ?? 0;
            updates['system.defenses.fortitude.ability'] = defenses.fortitude.ability ?? 0;
            updates['system.defenses.fortitude.base'] = defenses.fortitude.base ?? 10;
            
            updates['system.defenses.will.armor'] = defenses.will.armor ?? 0;
            updates['system.defenses.will.classBonus'] = defenses.will.classBonus ?? 0;
            updates['system.defenses.will.ability'] = defenses.will.ability ?? 0;
            updates['system.defenses.will.base'] = defenses.will.base ?? 10;
            
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          await actor.update(updates);
          fixed++;
          SWSELogger.log(`✓ Fixed ${actor.name}`);
        } else {
          skipped++;
        }
        
      } catch (err) {
        SWSELogger.error(`Error fixing ${actor.name}:`, err);
        errors++;
      }
    }
    
    SWSELogger.log("=" .repeat(60));
    SWSELogger.log("SWSE | Defense Schema Migration Complete");
    SWSELogger.log(`✓ Fixed: ${fixed} actors`);
    SWSELogger.log(`○ Skipped: ${skipped} actors (already correct)`);
    if (errors > 0) {
      SWSELogger.log(`✗ Errors: ${errors} actors`);
    }
    SWSELogger.log("=" .repeat(60));
    
    ui.notifications.info(`Defense schema migration complete! Fixed ${fixed} actors.`);
  }
}

// Register globally
if (!game.swse) game.swse = {};
if (!game.swse.migrations) game.swse.migrations = {};
game.swse.migrations.fixDefenseSchema = DefenseSchemaMigration.fixDefenseSchema.bind(DefenseSchemaMigration);

SWSELogger.log("SWSE | Defense migration script loaded. Run: await game.swse.migrations.fixDefenseSchema()");
