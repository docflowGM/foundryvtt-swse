#!/usr/bin/env node
/**
 * Inspect Pack Contents
 *
 * Analyzes pack database files to determine the types of documents they contain
 * and reports any mismatches with system.json declarations.
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
  console.warn('better-sqlite3 not available - will skip SQLite packs');
}

async function inspectNDJSONPack(filePath) {
  const results = { count: 0, types: {}, samples: {} };

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const doc = JSON.parse(line);
      const type = doc.type || 'unknown';

      if (!results.types[type]) {
        results.types[type] = 0;
        results.samples[type] = [];
      }

      results.types[type]++;
      if (results.samples[type].length < 3) {
        results.samples[type].push(`${doc.name} (${doc._id})`);
      }

      results.count++;
    } catch (e) {
      // Ignore parse errors
    }
  }

  return results;
}

function inspectSQLitePack(filePath) {
  if (!Database) {
    return { error: 'better-sqlite3 not available' };
  }

  try {
    const db = new Database(filePath);

    // Check if this is an actors or items table
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND (name='actors' OR name='items')"
    ).all();

    if (tables.length === 0) {
      db.close();
      return { error: 'No actors or items table found' };
    }

    const tableName = tables[0].name;
    const results = { count: 0, types: {}, samples: {}, table: tableName };

    const rows = db.prepare(`SELECT _id, name, type FROM ${tableName}`).all();

    for (const row of rows) {
      const type = row.type || 'unknown';

      if (!results.types[type]) {
        results.types[type] = 0;
        results.samples[type] = [];
      }

      results.types[type]++;
      if (results.samples[type].length < 3) {
        results.samples[type].push(`${row.name} (${row._id})`);
      }

      results.count++;
    }

    db.close();
    return results;
  } catch (error) {
    return { error: error.message };
  }
}

function getFileType(filePath) {
  try {
    const head = fs.readFileSync(filePath, 'utf-8', 0, 100).toString();
    if (head.startsWith('{')) return 'json';
    if (head.startsWith('[')) return 'json-array';
    return 'unknown';
  } catch (e) {
    // Assume SQLite
    return 'sqlite';
  }
}

async function inspectPack(packName, filePath) {
  console.log(`\n=== ${packName} ===`);

  if (!fs.existsSync(filePath)) {
    console.log(`  ✗ Pack file not found: ${filePath}`);
    return null;
  }

  const fileType = getFileType(filePath);
  console.log(`  Format: ${fileType}`);

  let results;
  if (fileType === 'sqlite') {
    results = inspectSQLitePack(filePath);
  } else {
    results = await inspectNDJSONPack(filePath);
  }

  if (results.error) {
    console.log(`  ✗ Error: ${results.error}`);
    return null;
  }

  console.log(`  Documents: ${results.count}`);
  console.log(`  Table: ${results.table || 'N/A'}`);
  console.log(`  Types:`);

  for (const [type, count] of Object.entries(results.types).sort()) {
    console.log(`    - ${type}: ${count}`);
    if (results.samples[type]) {
      results.samples[type].forEach(sample => {
        console.log(`      • ${sample}`);
      });
    }
  }

  return results;
}

async function main() {
  console.log('Pack Content Inspector');
  console.log('=====================');

  // Packs to inspect
  const packsToInspect = [
    { name: 'heroic', path: 'packs/heroic.db', declaredType: 'Item' },
    { name: 'nonheroic', path: 'packs/nonheroic.db', declaredType: 'Item' },
    { name: 'npc', path: 'packs/npc.db', declaredType: 'Actor' },
    { name: 'beasts', path: 'packs/beasts.db', declaredType: 'Actor' },
    { name: 'vehicles', path: 'packs/vehicles.db', declaredType: 'Item' },
    { name: 'vehicles-starships', path: 'packs/vehicles-starships.db', declaredType: 'Item' },
    { name: 'vehicles-stations', path: 'packs/vehicles-stations.db', declaredType: 'Item' },
    { name: 'vehicles-walkers', path: 'packs/vehicles-walkers.db', declaredType: 'Item' },
    { name: 'vehicles-speeders', path: 'packs/vehicles-speeders.db', declaredType: 'Item' }
  ];

  const findings = {};

  for (const pack of packsToInspect) {
    const results = await inspectPack(pack.name, path.join(PROJECT_ROOT, pack.path));
    findings[pack.name] = {
      ...results,
      declaredType: pack.declaredType
    };
  }

  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log('Pack Type Mismatches:');

  for (const [packName, findings_obj] of Object.entries(findings)) {
    if (!findings_obj || findings_obj.error) {
      console.log(`  ${packName}: ERROR - ${findings_obj?.error || 'unknown error'}`);
      continue;
    }

    const declaredType = findings_obj.declaredType;
    const actualTypes = Object.keys(findings_obj.types);

    // Determine expected document type
    let expectedDocType;
    if (declaredType === 'Actor') {
      expectedDocType = 'Actor';
    } else {
      expectedDocType = 'Item';
    }

    // Check if actual types match expectation
    let mismatch = false;
    if (declaredType === 'Actor') {
      // Should contain actor types: character, npc, droid, vehicle, beast
      const actorTypes = ['character', 'npc', 'droid', 'vehicle', 'beast'];
      mismatch = !actualTypes.some(t => actorTypes.includes(t));
    } else {
      // Should contain item types
      const actorTypes = ['character', 'npc', 'droid', 'vehicle', 'beast'];
      mismatch = actualTypes.some(t => actorTypes.includes(t));
    }

    if (mismatch && findings_obj.count > 0) {
      console.log(`  ✗ ${packName}: declared as ${declaredType}, contains ${actualTypes.join(', ')}`);
    } else if (findings_obj.count === 0) {
      console.log(`  ⚠ ${packName}: EMPTY (declared as ${declaredType})`);
    } else {
      console.log(`  ✓ ${packName}: OK (${declaredType} pack with ${actualTypes.join(', ')})`);
    }
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
