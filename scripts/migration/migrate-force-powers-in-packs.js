#!/usr/bin/env node
/**
 * Migrate Force Power Types in Pack SQLite Databases
 *
 * This script migrates force power documents in the SQLite pack databases
 * from the old type 'forcepower' to the canonical type 'force-power'.
 *
 * Usage:
 *   node scripts/migration/migrate-force-powers-in-packs.js
 *
 * Requirements:
 *   - better-sqlite3 (install with: npm install better-sqlite3)
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');

let Database;
try {
  Database = (await import('better-sqlite3')).default;
} catch (e) {
  console.error('ERROR: better-sqlite3 not found.');
  console.error('Install it with: npm install better-sqlite3');
  process.exit(1);
}

const PACKS_TO_MIGRATE = [
  { name: 'forcepowers', path: 'packs/forcepowers.db' },
  { name: 'lightsaberformpowers', path: 'packs/lightsaberformpowers.db' }
];

async function migratePackDatabase(packInfo) {
  const dbPath = path.join(PROJECT_ROOT, packInfo.path);
  console.log(`\n=== Migrating pack: ${packInfo.name} (${dbPath}) ===`);

  try {
    const db = new Database(dbPath);

    // Check if the items table exists
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='items'"
    ).all();

    if (tables.length === 0) {
      console.warn(`No 'items' table found in ${packInfo.name}`);
      db.close();
      return { migrated: 0, skipped: 0, errors: 0 };
    }

    // Find all items with type 'forcepower'
    const oldItems = db.prepare(
      "SELECT _id, name, type FROM items WHERE type = 'forcepower'"
    ).all();

    console.log(`Found ${oldItems.length} items with type 'forcepower'`);

    let migrated = 0;
    let errors = 0;

    // Update each item
    const updateStmt = db.prepare("UPDATE items SET type = 'force-power' WHERE _id = ?");

    for (const item of oldItems) {
      try {
        updateStmt.run(item._id);
        console.log(`  ✓ Migrated: ${item.name} (${item._id})`);
        migrated++;
      } catch (error) {
        console.error(`  ✗ Error migrating ${item._id}: ${error.message}`);
        errors++;
      }
    }

    // Verify the update
    const verifyCount = db.prepare(
      "SELECT COUNT(*) as count FROM items WHERE type = 'force-power'"
    ).get();

    console.log(`\nVerification: ${verifyCount.count} items now have type 'force-power'`);

    db.close();

    return { migrated, skipped: 0, errors };

  } catch (error) {
    console.error(`Fatal error while migrating ${packInfo.name}:`, error.message);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

async function main() {
  console.log('Force Power Type Migration Script');
  console.log('=================================\n');

  let totalMigrated = 0;
  let totalErrors = 0;

  for (const packInfo of PACKS_TO_MIGRATE) {
    const result = await migratePackDatabase(packInfo);
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
