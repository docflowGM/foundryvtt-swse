#!/usr/bin/env node
/**
 * Link Compendium Assets
 *
 * Links compendium documents to existing asset images.
 *
 * Usage:
 *   node tools/assets/link-compendium-assets.mjs [--write] [--pack=name] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');

// Try to load better-sqlite3
let Database;
try {
  Database = (await import('better-sqlite3')).default;
} catch (e) {
  // Not available - will skip SQLite packs
}

// Parse CLI args
const args = process.argv.slice(2);
const writeMode = args.includes('--write');
const dryRun = args.includes('--dry-run') || !writeMode;
const packFilter = args.find(a => a.startsWith('--pack='))?.split('=')[1];

// Asset inventory from build-asset-inventory.mjs
let assetInventory = {};
try {
  const inventoryPath = path.join(PROJECT_ROOT, 'docs/reports/asset-inventory.json');
  if (fs.existsSync(inventoryPath)) {
    assetInventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  }
} catch (e) {
  console.warn('Asset inventory not found. Run build-asset-inventory.mjs first.');
}

/**
 * Normalize a name for matching
 */
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ýÿ]/g, 'y')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[\s\-_'`"()]/g, '');
}

/**
 * Find best matching asset for a document name
 */
function findMatchingAsset(docName, inventory) {
  if (!inventory || !inventory.normalized) return null;

  const normalized = normalize(docName);
  const matches = inventory.normalized[normalized] || [];

  if (matches.length > 0) {
    // Prefer .webp, then .png
    const webpMatch = matches.find(m => m.ext === '.webp');
    if (webpMatch) return webpMatch.relativePath;
    const pngMatch = matches.find(m => m.ext === '.png');
    if (pngMatch) return pngMatch.relativePath;
    return matches[0].relativePath;
  }

  return null;
}

/**
 * Process an NDJSON pack file
 */
async function processNDJSONPack(filePath, packName, assetCategory) {
  const inventory = assetInventory[assetCategory];
  const results = { linked: 0, skipped: 0, errors: 0, updates: [] };

  if (!inventory) {
    console.warn(`No asset inventory for ${assetCategory}`);
    return results;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const outputLines = [];

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const doc = JSON.parse(line);
      const oldImg = doc.img;
      const assetPath = findMatchingAsset(doc.name, inventory);

      if (assetPath && (oldImg?.includes('mystery-man') || oldImg?.includes('item-bag') || oldImg?.includes('default'))) {
        // Update to the matching asset
        doc.img = assetPath;
        results.linked++;
        results.updates.push({
          name: doc.name,
          from: oldImg,
          to: assetPath
        });
      } else if (!assetPath && oldImg?.includes('mystery-man')) {
        results.skipped++;
      } else {
        results.skipped++;
      }

      outputLines.push(JSON.stringify(doc));
    } catch (error) {
      console.error(`Error processing line in ${packName}:`, error.message);
      outputLines.push(line);
      results.errors++;
    }
  }

  // Write back if in write mode
  if (!dryRun && writeMode) {
    fs.writeFileSync(filePath, outputLines.join('\n') + '\n');
  }

  return results;
}

/**
 * Process a SQLite pack file
 */
function processSQLitePack(filePath, packName, assetCategory) {
  if (!Database) {
    console.log(`  ⚠ SQLite support not available, skipping ${packName}`);
    return { linked: 0, skipped: 0, errors: 1 };
  }

  const inventory = assetInventory[assetCategory];
  const results = { linked: 0, skipped: 0, errors: 0, updates: [] };

  if (!inventory) {
    console.warn(`No asset inventory for ${assetCategory}`);
    return results;
  }

  try {
    const db = new Database(filePath);
    const rows = db.prepare('SELECT _id, name, img FROM items').all();

    const updates = [];

    for (const row of rows) {
      const oldImg = row.img;
      const assetPath = findMatchingAsset(row.name, inventory);

      if (assetPath && (oldImg?.includes('mystery-man') || oldImg?.includes('item-bag') || oldImg?.includes('default'))) {
        updates.push({ id: row._id, newImg: assetPath });
        results.linked++;
        results.updates.push({
          name: row.name,
          from: oldImg,
          to: assetPath
        });
      } else if (!assetPath && oldImg?.includes('mystery-man')) {
        results.skipped++;
      } else {
        results.skipped++;
      }
    }

    // Apply updates if in write mode
    if (!dryRun && writeMode && updates.length > 0) {
      const updateStmt = db.prepare('UPDATE items SET img = ? WHERE _id = ?');
      for (const update of updates) {
        updateStmt.run(update.newImg, update.id);
      }
    }

    db.close();
  } catch (error) {
    console.error(`Error processing ${packName}:`, error.message);
    results.errors++;
  }

  return results;
}

/**
 * Fix mentor portrait paths
 */
function fixMentorPortraits() {
  const mentorPath = path.join(PROJECT_ROOT, 'data/mentor-dialogues.json');
  const results = { fixed: 0, notFound: 0, invalid: 0, updates: [] };

  if (!fs.existsSync(mentorPath)) {
    console.log('Mentor dialogues file not found');
    return results;
  }

  const data = JSON.parse(fs.readFileSync(mentorPath, 'utf8'));
  const mentorInventory = assetInventory.mentors;

  if (!mentorInventory) {
    console.warn('No mentor asset inventory');
    return results;
  }

  const mentors = data.mentors || {};

  for (const [mentorKey, mentor] of Object.entries(mentors)) {
    if (!mentor.portrait) continue;

    const portraitPath = mentor.portrait;
    const fullPath = path.join(PROJECT_ROOT, portraitPath);
    const exists = fs.existsSync(fullPath);

    // Extract the filename
    const filename = path.basename(portraitPath);
    const ext = path.extname(filename);
    const stem = path.basename(filename, ext);
    const normalized = normalize(stem);

    // Look for the asset with the same normalized name
    const assetMatches = mentorInventory.normalized[normalized] || [];

    if (!exists && assetMatches.length > 0) {
      // Fix to the first available matching asset
      const oldPath = portraitPath;
      mentor.portrait = assetMatches[0].relativePath;
      results.fixed++;
      results.updates.push({
        mentor: mentorKey,
        from: oldPath,
        to: mentor.portrait
      });
      console.log(`  Fixed ${stem}: ${oldPath} → ${mentor.portrait}`);
    } else if (!exists) {
      results.notFound++;
      console.log(`  ⚠ No matching asset for ${stem}`);
    }
  }

  if (!dryRun && writeMode && results.fixed > 0) {
    fs.writeFileSync(mentorPath, JSON.stringify(data, null, 2));
  }

  return results;
}

/**
 * Main function
 */
async function main() {
  console.log('Compendium Asset Linker');
  console.log('======================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

  const packs = [
    { name: 'classes', path: 'packs/classes.db', category: 'classes', format: 'ndjson' },
    { name: 'species', path: 'packs/species.db', category: 'species', format: 'ndjson' },
    { name: 'feats', path: 'packs/feats.db', category: 'feats', format: 'ndjson' },
    { name: 'forcepowers', path: 'packs/forcepowers.db', category: 'forcePowers', format: 'ndjson' },
    { name: 'lightsaberformpowers', path: 'packs/lightsaberformpowers.db', category: 'forcePowers', format: 'sqlite' }
  ];

  const allResults = {
    packs: {},
    mentors: {},
    total: { linked: 0, fixed: 0, errors: 0 }
  };

  // Process packs
  for (const pack of packs) {
    if (packFilter && !packFilter.includes(pack.name)) continue;

    const packPath = path.join(PROJECT_ROOT, pack.path);
    if (!fs.existsSync(packPath)) {
      console.log(`⚠ Pack not found: ${pack.name}`);
      continue;
    }

    console.log(`\nProcessing ${pack.name}...`);
    let results;

    if (pack.format === 'sqlite') {
      results = processSQLitePack(packPath, pack.name, pack.category);
    } else {
      results = await processNDJSONPack(packPath, pack.name, pack.category);
    }

    allResults.packs[pack.name] = results;
    allResults.total.linked += results.linked;
    allResults.total.errors += results.errors;

    console.log(`  Linked: ${results.linked}`);
    console.log(`  Skipped: ${results.skipped}`);
    if (results.errors > 0) {
      console.log(`  Errors: ${results.errors}`);
    }
    if (results.updates.length > 0 && results.updates.length <= 5) {
      results.updates.forEach(u => {
        console.log(`    - ${u.name}`);
      });
    }
  }

  // Fix mentor portraits
  console.log('\nFixing mentor portrait paths...');
  const mentorResults = fixMentorPortraits();
  allResults.mentors = mentorResults;
  allResults.total.fixed = mentorResults.fixed;
  console.log(`  Fixed: ${mentorResults.fixed}`);
  console.log(`  Not found: ${mentorResults.notFound}`);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total assets linked: ${allResults.total.linked}`);
  console.log(`Total paths fixed: ${allResults.total.fixed}`);
  if (allResults.total.errors > 0) {
    console.log(`Total errors: ${allResults.total.errors}`);
  }

  if (dryRun) {
    console.log('\n(DRY RUN - no files were modified)');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
