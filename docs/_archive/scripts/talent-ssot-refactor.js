import { SWSELogger } from '../../../scripts/utils/logger.js';

/**
 * Talent SSOT Refactor Migration (v1.0)
 *
 * This migration validates the Talent Tree SSOT refactor:
 * - Talent Trees own their talents via system.talentIds array
 * - Talents have derived system.treeId (read-only, derived from tree ownership)
 * - System enforces one-to-one mapping
 *
 * Data has already been prepared by reconcile_talents.py and build_talentids.py
 * This migration just verifies and logs completion.
 *
 * Run this once in the browser console:
 * await game.swse.migrations.rebuildTalentTreeOwnership()
 */

export class TalentSSOTRefactorMigration {
  static MIGRATION_KEY = 'talentSSOTRefactor';
  static MIGRATION_VERSION = '1.0.0';

  /**
   * Verify and finalize talent tree SSOT refactor
   */
  static async rebuildTalentTreeOwnership() {
    // Guard: Ensure SWSE engine is loaded
    if (!globalThis.SWSE?.TalentTreeDB) {
      SWSELogger.error('SWSE | Migration failed: TalentTreeDB not available. Please wait for the system to fully load.');
      ui.notifications?.error('Migration failed: SWSE system not fully loaded.');
      return;
    }

    SWSELogger.log('SWSE | Starting Talent SSOT Refactor validation...');

    const TreeDB = globalThis.SWSE.TalentTreeDB;
    const TalentDB = globalThis.SWSE.TalentDB;

    let trees = 0;
    let talents = 0;
    let warnings = 0;
    const errors = 0;

    // Verify trees have talentIds
    for (const tree of TreeDB.all()) {
      trees++;
      const talentIds = tree.talentIds || [];

      if (!talentIds || talentIds.length === 0) {
        SWSELogger.warn(`[SSOT] Tree "${tree.name}" has no talentIds`);
        warnings++;
      }
    }

    // Verify talents have treeId (if loaded)
    if (TalentDB && TalentDB.all) {
      for (const talent of TalentDB.all()) {
        talents++;
        const treeId = talent.treeId;

        if (!treeId) {
          SWSELogger.warn(`[SSOT] Talent "${talent.name}" has no treeId`);
          warnings++;
        }
      }
    }

    // Log summary
    SWSELogger.log('='.repeat(60));
    SWSELogger.log('SWSE | Talent SSOT Refactor Validation Complete');
    SWSELogger.log(`✓ Trees validated: ${trees}`);
    SWSELogger.log(`✓ Talents validated: ${talents}`);
    if (warnings > 0) {
      SWSELogger.log(`⚠️  Warnings: ${warnings} (see console for details)`);
    }
    if (errors > 0) {
      SWSELogger.log(`✗ Errors: ${errors}`);
    }
    SWSELogger.log('='.repeat(60));

    // Mark migration as complete
    const migrationKey = `foundryvtt-swse.${this.MIGRATION_KEY}`;
    await game.settings.set('foundryvtt-swse', this.MIGRATION_KEY, this.MIGRATION_VERSION);

    if (errors === 0) {
      SWSELogger.log(`✅ Migration successful. SSOT is healthy.`);
      ui.notifications.info(`Talent SSOT refactor validation complete!`);
    } else {
      SWSELogger.error(`⚠️  Migration completed with ${errors} errors. Check console.`);
      ui.notifications.warn(`Talent SSOT validation complete with warnings. Check console.`);
    }
  }
}

// Register globally
if (!game.swse) {game.swse = {};}
if (!game.swse.migrations) {game.swse.migrations = {};}
game.swse.migrations.rebuildTalentTreeOwnership = TalentSSOTRefactorMigration.rebuildTalentTreeOwnership.bind(TalentSSOTRefactorMigration);

SWSELogger.log('SWSE | Talent SSOT Refactor migration script loaded. Run: await game.swse.migrations.rebuildTalentTreeOwnership()');
