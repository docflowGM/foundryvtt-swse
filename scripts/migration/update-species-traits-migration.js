import { SWSELogger } from '../utils/logger.js';

/**
 * Species Traits Update Migration
 *
 * Updates all species in the species compendium with their racial traits
 * from the species-traits.json data file.
 *
 * Runs automatically on world ready (GM only).
 */

export class UpdateSpeciesTraitsMigration {

  static MIGRATION_VERSION = "1.1.216"; // Bumped to re-run with improved update logic
  static MIGRATION_KEY = "speciesTraitsUpdate";

  /**
   * Check if migration has been run for current version
   */
  static async needsMigration() {
    try {
      const lastVersion = game.settings.get('foundryvtt-swse', this.MIGRATION_KEY);
      return lastVersion !== this.MIGRATION_VERSION;
    } catch (err) {
      // Setting not yet registered, so migration needs to run
      return true;
    }
  }

  /**
   * Mark migration as complete
   */
  static async markComplete() {
    await game.settings.set('foundryvtt-swse', this.MIGRATION_KEY, this.MIGRATION_VERSION);
  }

  /**
   * Main migration entry point
   */
  static async run() {
    // Only GMs can run migrations
    if (!game.user.isGM) {
      SWSELogger.log("SWSE | Skipping species traits update (not GM)");
      return;
    }

    // Check if migration needed
    if (!(await this.needsMigration())) {
      SWSELogger.log("SWSE | Species traits already updated");
      return;
    }

    SWSELogger.log("SWSE | Starting species traits update...");
    ui.notifications.info("Updating species traits, please wait...");

    let totalUpdated = 0;
    let totalNotFound = 0;
    let totalErrors = 0;
    const notFoundSpecies = [];

    try {
      // Load the species traits data
      let speciesTraitsData;
      try {
        const response = await fetch('systems/foundryvtt-swse/data/species-traits.json');
        if (!response.ok) {
          return;
        }
        speciesTraitsData = await response.json();
      } catch (error) {
        SWSELogger.error('SWSE | Failed to load species-traits.json:', error);
        ui.notifications.error('Failed to load species-traits.json!');
        return { totalUpdated, totalNotFound, totalErrors };
      }

      // Get the species compendium
      const speciesPack = game.packs.get('foundryvtt-swse.species');

      if (!speciesPack) {
        SWSELogger.error('SWSE | Species compendium not found');
        ui.notifications.error('Species compendium not found!');
        return { totalUpdated, totalNotFound, totalErrors };
      }

      // Ensure the pack is unlocked
      const wasLocked = speciesPack.locked;
      if (wasLocked) {
        SWSELogger.log('SWSE | Unlocking species compendium temporarily...');
        await speciesPack.configure({ locked: false });
      }

      // Load the compendium index
      await speciesPack.getIndex();

      // Process each species
      for (const speciesData of speciesTraitsData) {
        try {
          // Find the species in the compendium
          const speciesIndex = speciesPack.index.find(
            i => i.name.toLowerCase() === speciesData.name.toLowerCase()
          );

          if (!speciesIndex) {
            SWSELogger.warn(`SWSE | Species not found in compendium: ${speciesData.name}`);
            totalNotFound++;
            notFoundSpecies.push(speciesData.name);
            return;
          }

          // Update the species document using the pack's document class
          // This avoids full document validation issues with embedded-like arrays
          // by going through the static updateDocuments method with explicit pack context
          try {
            // Use updateDocuments with the pack option for more direct control
            // This bypasses some of the document merging logic that can cause
            // "_id required" errors when the document has complex array fields
            await Item.updateDocuments(
              [{
                _id: speciesIndex._id,
                'system.racialTraits': speciesData.racialTraits
              }],
              { pack: speciesPack.collection }
            );
          } catch (updateError) {
            // If the update fails, log the error but don't crash the migration
            // This can happen if the document has complex nested data that
            // Foundry v13 validation struggles with
            SWSELogger.warn(`SWSE | Could not update ${speciesData.name}: ${updateError.message}`);
            totalErrors++;
            return;
          }

          totalUpdated++;

          // Log progress every 20 updates
          if (totalUpdated % 20 === 0) {
            SWSELogger.log(`SWSE | Progress: ${totalUpdated} updated, ${totalNotFound} not found, ${totalErrors} errors`);
          }

        } catch (error) {
          SWSELogger.error(`SWSE | Error updating ${speciesData.name}:`, error);
          totalErrors++;
        }
      }

      // Re-lock the compendium if it was locked before
      if (wasLocked) {
        await speciesPack.configure({ locked: true });
        SWSELogger.log('SWSE | Re-locked species compendium');
      }

    } catch (err) {
      SWSELogger.error("SWSE | Species traits update failed:", err);
      totalErrors++;
    }

    // Summary
    SWSELogger.log("=".repeat(60));
    SWSELogger.log("SWSE | Species Traits Update Complete");
    SWSELogger.log(`✓ Updated: ${totalUpdated} species`);
    SWSELogger.log(`⚠ Not Found: ${totalNotFound} species`);
    if (totalErrors > 0) {
      SWSELogger.log(`✗ Errors: ${totalErrors}`);
    }

    if (notFoundSpecies.length > 0) {
      SWSELogger.log("Species not found in compendium:");
      notFoundSpecies.forEach(name => SWSELogger.log(`  - ${name}`));
    }

    SWSELogger.log("=".repeat(60));

    // Mark migration as complete
    await this.markComplete();

    if (totalUpdated > 0) {
      ui.notifications.info(`Species traits updated! ${totalUpdated} species updated.`);
    } else if (totalNotFound > 0) {
      ui.notifications.warn(`Species traits update complete with ${totalNotFound} species not found.`);
    }

    return { totalUpdated, totalNotFound, totalErrors };
  }
}

// Register migration to run on ready
Hooks.once('init', () => {
  // Make migration available via game.swse.migrations
  if (!game.swse) game.swse = {};
  if (!game.swse.migrations) game.swse.migrations = {};
  game.swse.migrations.updateSpeciesTraits = UpdateSpeciesTraitsMigration.run.bind(UpdateSpeciesTraitsMigration);
});

Hooks.once('ready', async () => {
  // Auto-run migration on world ready (GM only)
  if (game.user.isGM) {
    try {
      await UpdateSpeciesTraitsMigration.run();
    } catch (err) {
      SWSELogger.error("SWSE | Species traits update migration failed:", err);
    }
  }
});
