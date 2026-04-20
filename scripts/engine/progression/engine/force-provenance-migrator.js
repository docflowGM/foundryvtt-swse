/**
 * force-provenance-migrator.js
 * Legacy Force Power Provenance Migration
 *
 * Handles retroactive assignment of provenance metadata to force power items
 * that were created before provenance tracking was implemented.
 *
 * Strategy:
 * - Conservative: Only assign what can be determined with certainty
 * - Honest: Mark ambiguities in legacyIssues array
 * - Recoverable: Allow manual reconciliation via UI dialog
 */

import { ForceProvenanceEngine } from './force-provenance-engine.js';
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export class ForceProvenanceMigrator {
  /**
   * Migrate provenance for an actor if needed
   * Called when actor is opened or during finalization
   * Safe to call multiple times (idempotent after first migration)
   *
   * @param {Actor} actor - The actor to migrate
   * @returns {Promise<boolean>} true if migration was performed, false if already migrated
   */
  static async migrateIfNeeded(actor) {
    if (!actor) {
      return false;
    }

    try {
      // Check if actor has any force powers without provenance
      const powersWithoutProvenance = actor.items.filter(i =>
        i.type === 'forcepower' && !i.system?.provenance?.grantSourceId
      );

      if (powersWithoutProvenance.length === 0) {
        // All powers have provenance, no migration needed
        return false;
      }

      swseLogger.log('[FORCE PROVENANCE] Migrating legacy powers', {
        actor: actor.name,
        powerCount: powersWithoutProvenance.length
      });

      // Perform migration
      await this._performMigration(actor, powersWithoutProvenance);
      return true;
    } catch (e) {
      swseLogger.error('[FORCE PROVENANCE] Migration error', e);
      return false;
    }
  }

  /**
   * Perform the actual migration
   * @private
   */
  static async _performMigration(actor, powersWithoutProvenance) {
    const feats = actor.items.filter(i => i.type === 'feat') || [];
    const fsSensitivity = feats.some(f => f.name?.toLowerCase().includes('force sensitivity'));
    const ftFeats = feats.filter(f => f.name?.toLowerCase().includes('force training'));

    const updates = [];
    const issues = [];
    let powerIndex = 0;

    // Strategy 1: Assign first power to Force Sensitivity (if it exists)
    if (fsSensitivity && powerIndex < powersWithoutProvenance.length) {
      const power = powersWithoutProvenance[powerIndex];
      updates.push({
        _id: power.id,
        'system.provenance': ForceProvenanceEngine.createProvenanceMetadata(
          'force-sensitivity',
          'fs-chargen',
          'baseline',
          true // isLocked: FS powers are immutable
        ),
        'system.provenance.migratedAt': new Date().toISOString()
      });
      powerIndex++;
    }

    // Strategy 2: Assign remaining powers to Force Training
    if (ftFeats.length > 0 && powerIndex < powersWithoutProvenance.length) {
      const remainingPowers = powersWithoutProvenance.slice(powerIndex);

      if (ftFeats.length === 1) {
        // Single FT: assign all remaining to it
        const ftFeat = ftFeats[0];
        const grantId = ftFeat.system?.grantSourceId || 'ft-unknown-legacy';

        for (const power of remainingPowers) {
          updates.push({
            _id: power.id,
            'system.provenance': ForceProvenanceEngine.createProvenanceMetadata(
              'force-training',
              grantId,
              'unknown-legacy',
              false
            ),
            'system.provenance.migratedAt': new Date().toISOString()
          });
        }
      } else {
        // Multiple FT: conservatively assign
        // - Each FT gets 1 baseline
        // - Remainder gets marked as unknown-legacy
        let assignedCount = 0;

        for (let i = 0; i < ftFeats.length && assignedCount < remainingPowers.length; i++) {
          const ftFeat = ftFeats[i];
          const grantId = ftFeat.system?.grantSourceId || `ft-unknown-legacy-${i}`;
          const power = remainingPowers[assignedCount];

          updates.push({
            _id: power.id,
            'system.provenance': ForceProvenanceEngine.createProvenanceMetadata(
              'force-training',
              grantId,
              'baseline',
              false
            ),
            'system.provenance.migratedAt': new Date().toISOString()
          });
          assignedCount++;
        }

        // Remaining powers get conservative unknown-legacy marking
        for (let i = assignedCount; i < remainingPowers.length; i++) {
          const power = remainingPowers[i];
          updates.push({
            _id: power.id,
            'system.provenance': ForceProvenanceEngine.createProvenanceMetadata(
              'force-training',
              'ft-unknown-legacy',
              'unknown-legacy',
              false
            ),
            'system.provenance.migratedAt': new Date().toISOString(),
            'system.provenance.legacyIssues': [
              'Cannot determine which Force Training grant this power originated from'
            ]
          });

          issues.push(
            `Multiple Force Training feats exist; cannot determine origin of power "${power.name}"`
          );
        }
      }
    } else if (powerIndex < powersWithoutProvenance.length) {
      // No grant sources found (shouldn't happen in valid actor, but be defensive)
      const remainingPowers = powersWithoutProvenance.slice(powerIndex);

      for (const power of remainingPowers) {
        updates.push({
          _id: power.id,
          'system.provenance': ForceProvenanceEngine.createProvenanceMetadata(
            'unknown-legacy',
            'unknown-legacy',
            'unknown-legacy',
            false
          ),
          'system.provenance.migratedAt': new Date().toISOString(),
          'system.provenance.legacyIssues': [
            'No Force grant source (FS or FT) found on actor; origin cannot be determined'
          ]
        });

        issues.push(
          `Power "${power.name}" has no identifiable grant source (actor has no FS/FT feats)`
        );
      }
    }

    // Apply updates
    if (updates.length > 0) {
      try {
        const powerUpdates = updates.map(u => ({
          _id: u._id,
          'system.provenance': u['system.provenance']
        }));

        await ActorEngine.updateOwnedItems(actor, powerUpdates, {
          meta: { guardKey: 'force-provenance-migrator' }
        });

        swseLogger.log('[FORCE PROVENANCE] Migration complete', {
          actor: actor.name,
          migratedCount: updates.length,
          issues: issues.length
        });
      } catch (e) {
        swseLogger.error('[FORCE PROVENANCE] Failed to apply updates', e);
        throw e;
      }
    }

    // Update actor with legacy issues
    if (issues.length > 0) {
      try {
        await ActorEngine.updateActor(actor, {
          'system.forceGrantLedger.legacy.issues': issues
        }, { source: 'ForceProvenanceMigrator.storeLegacyIssues' });
      } catch (e) {
        swseLogger.warn('[FORCE PROVENANCE] Failed to store legacy issues', e);
      }
    }
  }

  /**
   * Check if migration is needed for an actor
   * (utility to determine if migration dialog should be shown)
   *
   * @param {Actor} actor - The actor
   * @returns {boolean} true if migration is needed
   */
  static isMigrationNeeded(actor) {
    if (!actor) {
      return false;
    }

    return actor.items.some(i =>
      i.type === 'forcepower' && !i.system?.provenance?.grantSourceId
    );
  }

  /**
   * Get migration summary for display
   * Useful for showing user what will be done before migration
   *
   * @param {Actor} actor - The actor
   * @returns {Object} Summary with counts and notes
   */
  static getMigrationSummary(actor) {
    if (!actor) {
      return {
        needsMigration: false,
        powers: 0,
        fsGrant: false,
        ftGrants: 0,
        ambiguities: []
      };
    }

    const powersWithoutProvenance = actor.items.filter(i =>
      i.type === 'forcepower' && !i.system?.provenance?.grantSourceId
    );

    if (powersWithoutProvenance.length === 0) {
      return {
        needsMigration: false,
        powers: 0,
        fsGrant: false,
        ftGrants: 0,
        ambiguities: []
      };
    }

    const feats = actor.items.filter(i => i.type === 'feat') || [];
    const fsSensitivity = feats.some(f => f.name?.toLowerCase().includes('force sensitivity'));
    const ftFeats = feats.filter(f => f.name?.toLowerCase().includes('force training'));

    const ambiguities = [];
    if (ftFeats.length > 1) {
      ambiguities.push(
        `Multiple Force Training feats exist (${ftFeats.length}); cannot distinguish which granted which power`
      );
    }
    if (!fsSensitivity && !ftFeats.length) {
      ambiguities.push('No Force Sensitivity or Force Training feats found; origin cannot be determined');
    }

    return {
      needsMigration: true,
      powers: powersWithoutProvenance.length,
      fsGrant: fsSensitivity,
      ftGrants: ftFeats.length,
      ambiguities
    };
  }
}
