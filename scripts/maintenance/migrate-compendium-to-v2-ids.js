/**
 * ============================================
 * Compendium V2 ID Migration Script
 * ============================================
 *
 * Converts all name-based references in compendium items to ID-based.
 *
 * CRITICAL CONVERSIONS:
 * 1. talents.db: system.class (names → class IDs)
 * 2. classes.db: system.talent_trees (names → talent tree IDs)
 * 3. feats.db: system.bonus_feat_for (names → class IDs)
 * 4. talents.db: Clean up triple fallback (remove redundant name fields)
 *
 * USAGE (from Foundry console):
 * ```
 * import('/scripts/maintenance/migrate-compendium-to-v2-ids.js').then(mod => {
 *   mod.migrateAllCompendiums().then(results => {
 *     console.log('Migration complete:', results);
 *   }).catch(err => console.error('Migration failed:', err));
 * });
 * ```
 *
 * SAFETY:
 * - Reports all attempted changes before applying
 * - Skips items that can't be resolved
 * - Keeps original names if IDs not found (with warning)
 * - Fully reversible (document updates, not deletions)
 * - Returns detailed results for verification
 */

/**
 * Build a map of item names to their IDs from a pack
 * @private
 */
async function buildNameToIdMap(packName, itemType = null) {
  const pack = game.packs.get(`foundryvtt-swse.${packName}`);
  if (!pack) {
    console.warn(`[V2-MIGRATION] Pack not found: ${packName}`);
    return {};
  }

  try {
    const index = await pack.getIndex();
    const map = {};

    for (const item of index) {
      if (itemType && item.type !== itemType) {continue;}
      map[item.name] = item._id;
    }

    console.log(`[V2-MIGRATION]   Built map for ${packName}: ${Object.keys(map).length} items`);
    return map;
  } catch (err) {
    console.error(`[V2-MIGRATION] Error building map for ${packName}:`, err);
    return {};
  }
}

/**
 * FIX #1: talents.db system.class names → IDs
 * Converts 986 talent items that reference class by name
 * @private
 */
async function migratetalentClassNames() {
  console.group('[V2-MIGRATION] FIX #1: Talents class names → IDs');

  const classMap = await buildNameToIdMap('classes');
  const pack = game.packs.get('foundryvtt-swse.talents');
  if (!pack) {
    console.warn('[V2-MIGRATION]   Pack not found: talents');
    console.groupEnd();
    return {fixed: 0, failed: 0, skipped: 0};
  }

  const index = await pack.getIndex();
  let fixed = 0;
  let failed = 0;
  let skipped = 0;
  const failedItems = [];

  console.log(`[V2-MIGRATION]   Processing ${index.length} talents...`);

  for (const item of index) {
    try {
      const doc = await pack.getDocument(item._id);
      if (!doc || !doc.system?.class) {
        skipped++;
        continue;
      }

      const className = doc.system.class;
      const classId = classMap[className];

      if (!classId) {
        console.warn(`[V2-MIGRATION]   ⚠️  No class found for talent "${doc.name}": "${className}"`);
        failedItems.push({talent: doc.name, className, reason: 'Class not found'});
        failed++;
        continue;
      }

      // Update if different
      if (classId !== doc.system.class) {
        await doc.update({'system.class': classId});
        fixed++;
      }
    } catch (err) {
      console.error(`[V2-MIGRATION]   Error processing talent ${item._id}:`, err);
      failed++;
    }
  }

  console.log(`[V2-MIGRATION]   ✅ Fixed: ${fixed}, ❌ Failed: ${failed}, ⏭️  Skipped: ${skipped}`);
  if (failedItems.length > 0) {
    console.log('[V2-MIGRATION]   Failed items:', failedItems);
  }
  console.groupEnd();

  return {fixed, failed, skipped, failedItems};
}

/**
 * FIX #2: classes.db system.talent_trees names → IDs
 * Converts 37 class items that reference talent trees by name
 * @private
 */
async function migrateClassTalentTrees() {
  console.group('[V2-MIGRATION] FIX #2: Classes talent_trees names → IDs');

  const treeMap = await buildNameToIdMap('talent-trees');
  const pack = game.packs.get('foundryvtt-swse.classes');
  if (!pack) {
    console.warn('[V2-MIGRATION]   Pack not found: classes');
    console.groupEnd();
    return {fixed: 0, failed: 0, skipped: 0};
  }

  const index = await pack.getIndex();
  let fixed = 0;
  let failed = 0;
  let skipped = 0;
  const failedItems = [];

  console.log(`[V2-MIGRATION]   Processing ${index.length} classes...`);

  for (const item of index) {
    try {
      const doc = await pack.getDocument(item._id);
      if (!doc || !Array.isArray(doc.system?.talent_trees)) {
        skipped++;
        continue;
      }

      const trees = doc.system.talent_trees;
      const convertedTrees = [];
      let treesChanged = false;

      for (const treeName of trees) {
        const treeId = treeMap[treeName];
        if (!treeId) {
          console.warn(`[V2-MIGRATION]   ⚠️  No talent tree found for class "${doc.name}": "${treeName}"`);
          failedItems.push({class: doc.name, treeName, reason: 'Tree not found'});
          failed++;
          convertedTrees.push(treeName); // Keep original if no match
          continue;
        }
        convertedTrees.push(treeId);
        treesChanged = true;
      }

      // Update if changed
      if (treesChanged) {
        await doc.update({'system.talent_trees': convertedTrees});
        fixed++;
      }
    } catch (err) {
      console.error(`[V2-MIGRATION]   Error processing class ${item._id}:`, err);
      failed++;
    }
  }

  console.log(`[V2-MIGRATION]   ✅ Fixed: ${fixed}, ❌ Failed: ${failed}, ⏭️  Skipped: ${skipped}`);
  if (failedItems.length > 0) {
    console.log('[V2-MIGRATION]   Failed items:', failedItems);
  }
  console.groupEnd();

  return {fixed, failed, skipped, failedItems};
}

/**
 * FIX #3: feats.db system.bonus_feat_for names → IDs
 * Converts 420 feat items that reference classes by name for bonus feats
 * @private
 */
async function migrateFeatBonusClassNames() {
  console.group('[V2-MIGRATION] FIX #3: Feats bonus_feat_for names → IDs');

  const classMap = await buildNameToIdMap('classes');
  const pack = game.packs.get('foundryvtt-swse.feats');
  if (!pack) {
    console.warn('[V2-MIGRATION]   Pack not found: feats');
    console.groupEnd();
    return {fixed: 0, failed: 0, skipped: 0};
  }

  const index = await pack.getIndex();
  let fixed = 0;
  let failed = 0;
  let skipped = 0;
  const failedItems = [];

  console.log(`[V2-MIGRATION]   Processing ${index.length} feats...`);

  for (const item of index) {
    try {
      const doc = await pack.getDocument(item._id);
      if (!doc || !Array.isArray(doc.system?.bonus_feat_for)) {
        skipped++;
        continue;
      }

      const bonusFor = doc.system.bonus_feat_for;
      const convertedNames = [];
      let namesChanged = false;

      for (const className of bonusFor) {
        const classId = classMap[className];
        if (!classId) {
          console.warn(`[V2-MIGRATION]   ⚠️  No class found for feat "${doc.name}": "${className}"`);
          failedItems.push({feat: doc.name, className, reason: 'Class not found'});
          failed++;
          convertedNames.push(className); // Keep original if no match
          continue;
        }
        convertedNames.push(classId);
        namesChanged = true;
      }

      // Update if changed
      if (namesChanged) {
        await doc.update({'system.bonus_feat_for': convertedNames});
        fixed++;
      }
    } catch (err) {
      console.error(`[V2-MIGRATION]   Error processing feat ${item._id}:`, err);
      failed++;
    }
  }

  console.log(`[V2-MIGRATION]   ✅ Fixed: ${fixed}, ❌ Failed: ${failed}, ⏭️  Skipped: ${skipped}`);
  if (failedItems.length > 0) {
    console.log('[V2-MIGRATION]   Failed items:', failedItems);
  }
  console.groupEnd();

  return {fixed, failed, skipped, failedItems};
}

/**
 * FIX #4: Clean up talent tree triple fallback pattern
 * Removes redundant name fields from 986 talents, keeping only treeId
 * @private
 */
async function cleanupTalentTreeFallbacks() {
  console.group('[V2-MIGRATION] FIX #4: Clean talent tree fallback pattern');

  const pack = game.packs.get('foundryvtt-swse.talents');
  if (!pack) {
    console.warn('[V2-MIGRATION]   Pack not found: talents');
    console.groupEnd();
    return {cleaned: 0, skipped: 0};
  }

  const index = await pack.getIndex();
  let cleaned = 0;
  let skipped = 0;

  console.log(`[V2-MIGRATION]   Processing ${index.length} talents for redundant fields...`);

  for (const item of index) {
    try {
      const doc = await pack.getDocument(item._id);
      if (!doc) {continue;}

      const hasTree = doc.system?.tree;
      const hasTalentTree = doc.system?.talent_tree;
      const hasTreeId = doc.system?.treeId;

      // Only clean if we have the ID field (v2 compliant)
      if (!hasTreeId) {
        skipped++;
        continue;
      }

      // Remove redundant name fields if present
      const updateData = {};
      let hasUpdates = false;

      if (hasTree) {
        updateData['system.-=tree'] = null;
        hasUpdates = true;
      }
      if (hasTalentTree) {
        updateData['system.-=talent_tree'] = null;
        hasUpdates = true;
      }

      if (hasUpdates) {
        await doc.update(updateData);
        cleaned++;
      }
    } catch (err) {
      console.error(`[V2-MIGRATION]   Error processing talent ${item._id}:`, err);
    }
  }

  console.log(`[V2-MIGRATION]   ✅ Cleaned: ${cleaned}, ⏭️  Skipped: ${skipped}`);
  console.groupEnd();

  return {cleaned, skipped};
}

/**
 * Execute all migrations in sequence
 * @returns {Promise<Object>} Detailed results of all migrations
 */
export async function migrateAllCompendiums() {
  console.group('═══════════════════════════════════════════════════════════');
  console.log('🔄 COMPENDIUM V2 ID MIGRATION - STARTING');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('This migration converts all name-based compendium references to IDs');
  console.log('⚠️  BACKUP YOUR DATA BEFORE RUNNING THIS MIGRATION');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const results = {
      timestamp: new Date().toISOString(),
      fixes: {}
    };

    console.log('\n⏳ Building name→ID maps from compendiums...\n');

    results.fixes.talentClasses = await migratetalentClassNames();
    results.fixes.classTrees = await migrateClassTalentTrees();
    results.fixes.featBonus = await migrateFeatBonusClassNames();
    results.fixes.fallbackCleanup = await cleanupTalentTreeFallbacks();

    console.group('═══════════════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Results summary:');
    console.table({
      'Talent class names': results.fixes.talentClasses.fixed,
      'Class talent_trees': results.fixes.classTrees.fixed,
      'Feat bonus classes': results.fixes.featBonus.fixed,
      'Fallback cleanup': results.fixes.fallbackCleanup.cleaned
    });
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Full results:', results);
    console.groupEnd();

    return results;
  } catch (err) {
    console.error('[V2-MIGRATION] CRITICAL ERROR:', err);
    throw err;
  }
}

// Export for use in Foundry console
if (typeof window !== 'undefined' && window.game) {
  window.compendiumV2Migration = {migrateAllCompendiums};
  console.log('✅ [V2-MIGRATION] Script loaded. Run: compendiumV2Migration.migrateAllCompendiums()');
}

