/**
 * Stable Key Migration
 * Migrates from ID-based relationships to stable key-based relationships
 * Runs during system initialization to ensure all documents have keys
 */

import { SWSELogger } from '../utils/logger.js';
import { toStableKey } from '../utils/stable-key.js';

export const StableKeyMigration = {

  /**
   * Run full stable key migration
   * Phase 1-4: Ensure all trees, talents, feats have system.key
   * Phase 5: Convert tree references from treeId to treeKey
   */
  async runFullMigration() {
    try {
      SWSELogger.log('[StableKeyMigration] Starting full migration...');

      // Phase 1-4: Ensure all docs have system.key
      await this.ensureAllTreesHaveKey();
      await this.ensureAllTalentsHaveKey();
      await this.ensureAllFeatsHaveKey();

      // Phase 5: Convert tree references
      await this.convertTalentTreeReferences();

      SWSELogger.log('[StableKeyMigration] Full migration complete');
      return true;
    } catch (err) {
      SWSELogger.error('[StableKeyMigration] Failed:', err);
      return false;
    }
  },

  /**
   * Phase 1: Ensure all talent trees have system.key
   */
  async ensureAllTreesHaveKey() {
    try {
      const pack = game.packs.get('foundryvtt-swse.talent_trees');
      if (!pack) return;

      const index = await pack.getIndex({ fields: ['system', 'name'] });
      let updated = 0;

      for (const entry of index) {
        if (!entry.system?.key) {
          const key = toStableKey(entry.name);
          const doc = await pack.getDocument(entry._id);
          if (doc) {
            await doc.update({ 'system.key': key });
            updated++;
          }
        }
      }

      if (updated > 0) {
        SWSELogger.log(`[StableKeyMigration] Updated ${updated} talent trees with system.key`);
      }
    } catch (err) {
      SWSELogger.warn('[StableKeyMigration] Tree key migration failed:', err);
    }
  },

  /**
   * Phase 2: Ensure all talents have system.key
   */
  async ensureAllTalentsHaveKey() {
    try {
      const pack = game.packs.get('foundryvtt-swse.talents');
      if (!pack) return;

      const index = await pack.getIndex({ fields: ['system', 'name'] });
      let updated = 0;

      for (const entry of index) {
        if (!entry.system?.key) {
          const key = toStableKey(entry.name);
          const doc = await pack.getDocument(entry._id);
          if (doc) {
            await doc.update({ 'system.key': key });
            updated++;
          }
        }
      }

      if (updated > 0) {
        SWSELogger.log(`[StableKeyMigration] Updated ${updated} talents with system.key`);
      }
    } catch (err) {
      SWSELogger.warn('[StableKeyMigration] Talent key migration failed:', err);
    }
  },

  /**
   * Phase 3: Ensure all feats have system.key
   */
  async ensureAllFeatsHaveKey() {
    try {
      const pack = game.packs.get('foundryvtt-swse.feats');
      if (!pack) return;

      const index = await pack.getIndex({ fields: ['system', 'name'] });
      let updated = 0;

      for (const entry of index) {
        if (!entry.system?.key) {
          const key = toStableKey(entry.name);
          const doc = await pack.getDocument(entry._id);
          if (doc) {
            await doc.update({ 'system.key': key });
            updated++;
          }
        }
      }

      if (updated > 0) {
        SWSELogger.log(`[StableKeyMigration] Updated ${updated} feats with system.key`);
      }
    } catch (err) {
      SWSELogger.warn('[StableKeyMigration] Feat key migration failed:', err);
    }
  },

  /**
   * Phase 5: Convert talent tree references from treeId to treeKey
   * Uses TalentTreeDB to map IDs to keys
   */
  async convertTalentTreeReferences(treeDb = null) {
    try {
      const pack = game.packs.get('foundryvtt-swse.talents');
      if (!pack) return;

      const index = await pack.getIndex({ fields: ['system', 'name'] });
      let converted = 0;
      let failed = 0;

      for (const entry of index) {
        const treeId = entry.system?.treeId;
        const treeKey = entry.system?.treeKey;

        // Skip if already has treeKey
        if (treeKey) continue;

        // Convert if has treeId
        if (treeId) {
          try {
            const doc = await pack.getDocument(entry._id);
            if (!doc) continue;

            let key = null;

            // Try to find tree by ID and extract its key
            if (treeDb && treeDb.trees) {
              const tree = treeDb.trees.get(treeId);
              if (tree?.system?.key) {
                key = tree.system.key;
              }
            }

            // Fallback: Try to match by normalized name
            if (!key && doc.system?.talent_tree) {
              key = toStableKey(doc.system.talent_tree);
            }

            if (key) {
              await doc.update({
                'system.treeKey': key,
                'system.-=treeId': null  // Remove old field
              });
              converted++;
            } else {
              SWSELogger.warn(`[StableKeyMigration] Could not convert treeId for talent "${entry.name}"`);
              failed++;
            }
          } catch (err) {
            SWSELogger.warn(`[StableKeyMigration] Failed to convert talent "${entry.name}":`, err);
            failed++;
          }
        }
      }

      if (converted > 0 || failed > 0) {
        SWSELogger.log(`[StableKeyMigration] Converted ${converted} talents to treeKey${failed > 0 ? ` (${failed} failed)` : ''}`);
      }
    } catch (err) {
      SWSELogger.warn('[StableKeyMigration] Tree reference conversion failed:', err);
    }
  }
};
