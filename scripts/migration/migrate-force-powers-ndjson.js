#!/usr/bin/env node
/**
 * Migrate Force Power Types in NDJSON Pack Files
 *
 * This script migrates force power documents in NDJSON pack files
 * from the old type 'forcepower' to the canonical type 'force-power'.
 *
 * Usage:
 *   node scripts/migration/migrate-force-powers-ndjson.js
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const PACKS_TO_MIGRATE = [
  { name: 'forcepowers', path: 'packs/forcepowers.db' }
];

async function migrateNDJSONPack(packInfo) {
  const filePath = path.join(PROJECT_ROOT, packInfo.path);
  console.log(`\n=== Migrating NDJSON pack: ${packInfo.name} (${filePath}) ===`);

  if (!fs.existsSync(filePath)) {
    console.warn(`Pack file not found: ${filePath}`);
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const outputLines = [];

  try {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      try {
        if (!line.trim()) continue;

        const doc = JSON.parse(line);

        if (doc.type === 'forcepower') {
          console.log(`  Migrating: ${doc.name} (${doc._id})`);
          doc.type = 'force-power';
          migrated++;
        } else if (doc.type === 'force-power') {
          skipped++;
        } else {
          console.warn(`  Unexpected type in ${packInfo.name}: ${doc.type} for ${doc.name}`);
          skipped++;
        }

        outputLines.push(JSON.stringify(doc));
      } catch (error) {
        console.error(`  Error parsing line: ${error.message}`);
        // Try to re-add the original line
        outputLines.push(line);
        errors++;
      }
    }

    // Write back to file
    console.log(`\nWriting migrated pack back to disk...`);
    fs.writeFileSync(filePath, outputLines.join('\n') + '\n');

    console.log(`\n${packInfo.name} migration summary:`);
    console.log(`  Migrated: ${migrated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);

    return { migrated, skipped, errors };

  } catch (error) {
    console.error(`Fatal error while migrating ${packInfo.name}:`, error.message);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

async function main() {
  console.log('Force Power Type Migration Script (NDJSON)');
  console.log('==========================================\n');

  let totalMigrated = 0;
  let totalErrors = 0;

  for (const packInfo of PACKS_TO_MIGRATE) {
    const result = await migrateNDJSONPack(packInfo);
    totalMigrated += result.migrated;
    totalErrors += result.errors;
  }

  console.log('\n=== Migration Summary ===');
  console.log(`Total migrated: ${totalMigrated}`);
  console.log(`Total errors: ${totalErrors}`);

  if (totalErrors === 0) {
    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } else {
    console.log('\n✗ Migration completed with errors');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
