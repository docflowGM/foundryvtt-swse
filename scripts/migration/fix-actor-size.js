import { SWSELogger } from '../utils/logger.js';
import { ProgressionEngine } from "../progression/engine/progression-engine.js";
/**
 * Actor Size Migration
 * Fixes actor size values to be lowercase to match schema choices
 *
 * Run this once in the browser console:
 * await game.swse.migrations.fixActorSize()
 */

export class ActorSizeMigration {

  static async fixActorSize() {
    // Guard: Ensure SWSE engine is loaded
    if (!globalThis.SWSE?.ActorEngine) {
      SWSELogger.error("SWSE | Migration failed: ActorEngine not available. Please wait for the system to fully load.");
      ui.notifications?.error("Migration failed: SWSE system not fully loaded.");
      return;
    }

    SWSELogger.log("SWSE | Starting actor size migration...");

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    // Valid size choices (lowercase keys)
    const validSizes = [
      'fine', 'diminutive', 'tiny', 'small', 'medium',
      'large', 'huge', 'gargantuan', 'colossal', 'colossal2'
    ];

    for (const actor of game.actors) {
      try {
        const currentSize = actor.system?.size;

        // Skip if no size or already lowercase
        if (!currentSize || currentSize === currentSize.toLowerCase()) {
          skipped++;
          continue;
        }

        // Convert to lowercase
        const newSize = currentSize.toLowerCase();

        // Verify it's a valid size
        if (!validSizes.includes(newSize)) {
          SWSELogger.warn(`Skipping ${actor.name} - invalid size value: ${currentSize}`);
          skipped++;
          continue;
        }

        SWSELogger.log(`Fixing ${actor.name}: "${currentSize}" -> "${newSize}"`);
globalThis.SWSE.actor.update( { 'system.size': newSize });
        fixed++;

      } catch (err) {
        SWSELogger.error(`Error fixing ${actor.name}:`, err);
        errors++;
      }
    }

    SWSELogger.log("=".repeat(60));
    SWSELogger.log("SWSE | Actor Size Migration Complete");
    SWSELogger.log(`✓ Fixed: ${fixed} actors`);
    SWSELogger.log(`○ Skipped: ${skipped} actors (already correct or no size)`);
    if (errors > 0) {
      SWSELogger.log(`✗ Errors: ${errors} actors`);
    }
    SWSELogger.log("=".repeat(60));

    ui.notifications.info(`Actor size migration complete! Fixed ${fixed} actors.`);
  }
}

// Register globally
if (!game.swse) game.swse = {};
if (!game.swse.migrations) game.swse.migrations = {};
game.swse.migrations.fixActorSize = ActorSizeMigration.fixActorSize.bind(ActorSizeMigration);

SWSELogger.log("SWSE | Actor size migration script loaded. Run: await game.swse.migrations.fixActorSize()");
