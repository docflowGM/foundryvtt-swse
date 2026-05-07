#!/usr/bin/env node
/**
 * Build Asset Inventory
 *
 * Scans asset directories and creates mappings for linking to compendium documents.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');

/**
 * Normalize a filename for matching purposes
 */
function normalizeForMatching(name) {
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
    .replace(/[\s\-_'`"]/g, '')
    .replace(/[()]/g, '');
}

/**
 * Scan a directory for assets
 */
function scanAssetDirectory(dirPath, category) {
  const fullPath = path.join(PROJECT_ROOT, dirPath);
  const assets = {
    category,
    path: dirPath,
    files: [],
    normalized: {},
    extensions: {}
  };

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠ Directory not found: ${dirPath}`);
    return assets;
  }

  try {
    const files = fs.readdirSync(fullPath);

    for (const file of files) {
      const fullFile = path.join(fullPath, file);
      const stat = fs.statSync(fullFile);

      if (stat.isFile() && /\.(webp|png|jpg|jpeg|svg|gif)$/i.test(file)) {
        const ext = path.extname(file).toLowerCase();
        const stem = path.basename(file, ext);
        const normalized = normalizeForMatching(stem);
        const relativePath = `${dirPath}/${file}`;

        assets.files.push({
          file,
          stem,
          ext,
          relativePath,
          normalized
        });

        if (!assets.normalized[normalized]) {
          assets.normalized[normalized] = [];
        }
        assets.normalized[normalized].push({
          file,
          stem,
          ext,
          relativePath
        });

        if (!assets.extensions[ext]) {
          assets.extensions[ext] = 0;
        }
        assets.extensions[ext]++;
      }
    }

    assets.files.sort((a, b) => a.file.localeCompare(b.file));
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error.message);
  }

  return assets;
}

/**
 * Main function
 */
function main() {
  console.log('Asset Inventory Builder');
  console.log('=======================\n');

  const inventories = {
    classes: scanAssetDirectory('assets/class', 'Classes'),
    feats: scanAssetDirectory('assets/feats', 'Feats'),
    species: scanAssetDirectory('assets/species', 'Species'),
    forcePowers: scanAssetDirectory('assets/icons/force-powers', 'Force Powers'),
    mentors: scanAssetDirectory('assets/mentors', 'Mentors')
  };

  // Report
  for (const [key, inv] of Object.entries(inventories)) {
    console.log(`\n=== ${inv.category} ===`);
    console.log(`Path: ${inv.path}`);
    console.log(`Total files: ${inv.files.length}`);
    console.log(`Extensions: ${Object.entries(inv.extensions).map(([ext, count]) => `${ext}: ${count}`).join(', ')}`);
    console.log(`Sample files:`);
    inv.files.slice(0, 5).forEach(f => {
      console.log(`  - ${f.file}`);
    });
    if (inv.files.length > 5) {
      console.log(`  ... and ${inv.files.length - 5} more`);
    }
  }

  // Save inventory to file
  const inventoryPath = path.join(PROJECT_ROOT, 'docs/reports/asset-inventory.json');
  const dir = path.dirname(inventoryPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(inventoryPath, JSON.stringify(inventories, null, 2));
  console.log(`\n✓ Inventory saved to ${inventoryPath}`);
}

main();
