#!/usr/bin/env node

/**
 * Compendium V2 ID Migration - Node.js Version
 * Operates directly on NDJSON .db files
 *
 * Usage: node scripts/maintenance/migrate-ndjson-to-v2-ids.js
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKS_DIR = path.join(__dirname, '../../packs');

/**
 * Load all items from an NDJSON pack file
 */
async function loadPackItems(filename) {
  const items = [];
  const filePath = path.join(PACKS_DIR, filename);

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        items.push(JSON.parse(line));
      } catch (err) {
        console.error(`Error parsing line in ${filename}:`, err.message);
      }
    }
  }

  return items;
}

/**
 * Build name→ID map from pack
 */
async function buildNameToIdMap(filename) {
  const items = await loadPackItems(filename);
  const map = {};

  for (const item of items) {
    if (item.name && item._id) {
      map[item.name] = item._id;
    }
  }

  console.log(`  Built map from ${filename}: ${Object.keys(map).length} items`);
  return map;
}

/**
 * Write items back to NDJSON file
 */
async function writePackItems(filename, items) {
  const filePath = path.join(PACKS_DIR, filename);
  const backup = filePath + '.backup';

  // Create backup
  fs.copyFileSync(filePath, backup);
  console.log(`  Created backup: ${backup}`);

  // Write new file
  const output = items.map(item => JSON.stringify(item)).join('\n') + '\n';
  fs.writeFileSync(filePath, output);
  console.log(`  Wrote ${items.length} items to ${filename}`);
}

/**
 * FIX #1: talents.db system.class names → IDs
 */
async function migratetalentClassNames(classMap) {
  console.log('\n[FIX #1] talents.db system.class names → IDs');

  const items = await loadPackItems('talents.db');
  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.system?.class) {
      skipped++;
      continue;
    }

    const className = item.system.class;
    const classId = classMap[className];

    if (!classId) {
      console.warn(`  ⚠️  No class found for talent "${item.name}": "${className}"`);
      failed++;
      continue;
    }

    if (classId !== item.system.class) {
      item.system.class = classId;
      fixed++;
    }
  }

  await writePackItems('talents.db', items);
  console.log(`  ✅ Fixed: ${fixed}, ❌ Failed: ${failed}, ⏭️  Skipped: ${skipped}`);

  return { fixed, failed, skipped };
}

/**
 * FIX #2: classes.db system.talent_trees names → IDs
 */
async function migrateClassTalentTrees(treeMap) {
  console.log('\n[FIX #2] classes.db system.talent_trees names → IDs');

  const items = await loadPackItems('classes.db');
  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of items) {
    if (!Array.isArray(item.system?.talent_trees)) {
      skipped++;
      continue;
    }

    const trees = item.system.talent_trees;
    const convertedTrees = [];
    let treesChanged = false;

    for (const treeName of trees) {
      const treeId = treeMap[treeName];
      if (!treeId) {
        console.warn(`  ⚠️  No talent tree found for class "${item.name}": "${treeName}"`);
        failed++;
        convertedTrees.push(treeName);
        continue;
      }
      convertedTrees.push(treeId);
      treesChanged = true;
    }

    if (treesChanged) {
      item.system.talent_trees = convertedTrees;
      fixed++;
    }
  }

  await writePackItems('classes.db', items);
  console.log(`  ✅ Fixed: ${fixed}, ❌ Failed: ${failed}, ⏭️  Skipped: ${skipped}`);

  return { fixed, failed, skipped };
}

/**
 * FIX #3: feats.db system.bonus_feat_for names → IDs
 */
async function migrateFeatBonusClassNames(classMap) {
  console.log('\n[FIX #3] feats.db system.bonus_feat_for names → IDs');

  const items = await loadPackItems('feats.db');
  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of items) {
    if (!Array.isArray(item.system?.bonus_feat_for)) {
      skipped++;
      continue;
    }

    const bonusFor = item.system.bonus_feat_for;
    const convertedNames = [];
    let namesChanged = false;

    for (const className of bonusFor) {
      const classId = classMap[className];
      if (!classId) {
        console.warn(`  ⚠️  No class found for feat "${item.name}": "${className}"`);
        failed++;
        convertedNames.push(className);
        continue;
      }
      convertedNames.push(classId);
      namesChanged = true;
    }

    if (namesChanged) {
      item.system.bonus_feat_for = convertedNames;
      fixed++;
    }
  }

  await writePackItems('feats.db', items);
  console.log(`  ✅ Fixed: ${fixed}, ❌ Failed: ${failed}, ⏭️  Skipped: ${skipped}`);

  return { fixed, failed, skipped };
}

/**
 * FIX #4: Clean talent tree triple fallback pattern
 */
async function cleanupTalentTreeFallbacks() {
  console.log('\n[FIX #4] Clean talent tree fallback pattern');

  const items = await loadPackItems('talents.db');
  let cleaned = 0;
  let skipped = 0;

  for (const item of items) {
    const hasTree = item.system?.tree;
    const hasTalentTree = item.system?.talent_tree;
    const hasTreeId = item.system?.treeId;

    if (!hasTreeId) {
      skipped++;
      continue;
    }

    let hasUpdates = false;
    if (hasTree) {
      delete item.system.tree;
      hasUpdates = true;
    }
    if (hasTalentTree) {
      delete item.system.talent_tree;
      hasUpdates = true;
    }

    if (hasUpdates) {
      cleaned++;
    }
  }

  await writePackItems('talents.db', items);
  console.log(`  ✅ Cleaned: ${cleaned}, ⏭️  Skipped: ${skipped}`);

  return { cleaned, skipped };
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 COMPENDIUM V2 ID MIGRATION - STARTING');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('This migration converts all name-based compendium references to IDs');
  console.log(`Operating on: ${PACKS_DIR}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const results = {
      timestamp: new Date().toISOString(),
      fixes: {}
    };

    console.log('⏳ Building name→ID maps from compendiums...\n');
    const classMap = await buildNameToIdMap('classes.db');
    const treeMap = await buildNameToIdMap('talent_trees.db');

    results.fixes.talentClasses = await migratetalentClassNames(classMap);
    results.fixes.classTrees = await migrateClassTalentTrees(treeMap);
    results.fixes.featBonus = await migrateFeatBonusClassNames(classMap);
    results.fixes.fallbackCleanup = await cleanupTalentTreeFallbacks();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nResults summary:');
    console.table({
      'Talent class names': results.fixes.talentClasses.fixed,
      'Class talent_trees': results.fixes.classTrees.fixed,
      'Feat bonus classes': results.fixes.featBonus.fixed,
      'Fallback cleanup': results.fixes.fallbackCleanup.cleaned
    });
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📋 Full results:', JSON.stringify(results, null, 2));

    return results;
  } catch (err) {
    console.error('❌ CRITICAL ERROR:', err);
    process.exit(1);
  }
}

// Run migration
migrate().then(() => {
  console.log('✅ Migration completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
