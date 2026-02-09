#!/usr/bin/env node

/**
 * TALENT MIGRATION SCRIPT - Classify Orphaned Talents
 *
 * Reads the talent classification mapping and updates talents.db with correct tree assignments
 * Step 1: Load talents.db and talent_trees.db
 * Step 2: Build name → ID lookup for all talent trees
 * Step 3: For each talent in mapping, find and update its record
 * Step 4: Save updated talents.db
 * Step 5: Regenerate talent-trees.registry.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = path.join(__dirname, '../../packs');
const DATA = path.join(__dirname, '../../data');

console.log('═'.repeat(60));
console.log('ORPHANED TALENT MIGRATION');
console.log('═'.repeat(60));

// STEP 1: Load data files
console.log('\n[1/5] Loading talent classification mapping...');
let classificationMapping;
try {
  const mappingPath = path.join(DATA, 'talent-classification-mapping.json');
  const mappingData = fs.readFileSync(mappingPath, 'utf8');
  classificationMapping = JSON.parse(mappingData);
  console.log(`  ✓ Loaded mapping for ${Object.keys(classificationMapping.talents).length} talents`);
} catch (err) {
  console.error(`  ✗ Failed to load classification mapping: ${err.message}`);
  process.exit(1);
}

console.log('[2/5] Loading talents.db...');
const talents = [];
try {
  const talentsPath = path.join(BASE, 'talents.db');
  const talentsFile = fs.readFileSync(talentsPath, 'utf8');
  for (const line of talentsFile.split('\n')) {
    if (line.trim()) {
      talents.push(JSON.parse(line));
    }
  }
  console.log(`  ✓ Loaded ${talents.length} talents`);
} catch (err) {
  console.error(`  ✗ Failed to load talents.db: ${err.message}`);
  process.exit(1);
}

console.log('[3/5] Loading talent_trees.db...');
const trees = [];
const treeNameToId = {};
try {
  const treesPath = path.join(BASE, 'talent_trees.db');
  const treesFile = fs.readFileSync(treesPath, 'utf8');
  for (const line of treesFile.split('\n')) {
    if (line.trim()) {
      const tree = JSON.parse(line);
      trees.push(tree);
      // Build lookup by name (normalized)
      const treeName = tree.name;
      const normalizedName = treeName.toLowerCase().replace(/\s+/g, '_');
      treeNameToId[normalizedName] = tree._id;
      treeNameToId[treeName] = tree._id; // Also store original name
    }
  }
  console.log(`  ✓ Loaded ${trees.length} talent trees`);
  console.log(`  ✓ Built ${Object.keys(treeNameToId).length} name lookups`);
} catch (err) {
  console.error(`  ✗ Failed to load talent_trees.db: ${err.message}`);
  process.exit(1);
}

// STEP 2: Map talent names to IDs
console.log('\n[4/5] Processing talent assignments...');

const talentByName = {};
for (const talent of talents) {
  talentByName[talent.name] = talent;
}

let updated = 0;
const notFound = [];
const errors = [];

for (const [talentName, treeNameOrId] of Object.entries(classificationMapping.talents)) {
  // Find the talent
  const talent = talentByName[talentName];
  if (!talent) {
    notFound.push(talentName);
    continue;
  }

  // Find the tree ID
  const treeId = treeNameToId[treeNameOrId] || treeNameToId[treeNameOrId.toLowerCase().replace(/\s+/g, '_')];

  if (!treeId) {
    errors.push(`  ✗ Tree not found for "${treeNameOrId}" (talent: "${talentName}")`);
    continue;
  }

  // Update talent
  if (!talent.system) {
    talent.system = {};
  }

  const oldTreeId = talent.system.treeId;
  const oldTreeName = talent.system.talent_tree;

  talent.system.treeId = treeId;
  talent.system.talent_tree = (trees.find(t => t._id === treeId) || {}).name || treeNameOrId;

  updated++;
  console.log(`  ✓ "${talentName}" → ${talent.system.talent_tree} (${treeId})`);
}

console.log(`\n  Summary:`);
console.log(`    - Updated: ${updated}`);
console.log(`    - Not found: ${notFound.length}`);
console.log(`    - Errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n  Errors:');
  errors.forEach(e => console.log(e));
}

if (notFound.length > 0) {
  console.log(`\n  Talents not found in database (${notFound.length}):`);
  notFound.slice(0, 10).forEach(name => console.log(`    - ${name}`));
  if (notFound.length > 10) {
    console.log(`    ... and ${notFound.length - 10} more`);
  }
}

// STEP 3: Save updated talents.db
console.log('\n[5/5] Saving updated talents.db...');
try {
  const talentsPath = path.join(BASE, 'talents.db');
  const output = talents.map(t => JSON.stringify(t)).join('\n');
  fs.writeFileSync(talentsPath, output);
  console.log('  ✓ Saved talents.db');
} catch (err) {
  console.error(`  ✗ Failed to save talents.db: ${err.message}`);
  process.exit(1);
}

// STEP 4: Regenerate registry (if registry builder exists)
console.log('\n[Bonus] Regenerating talent-trees.registry.json...');
try {
  const registryBuilderPath = path.join(__dirname, '../data/build-talent-tree-registry.js');
  if (fs.existsSync(registryBuilderPath)) {
    await import(registryBuilderPath);
    console.log('  ✓ Registry rebuilt');
  } else {
    console.log('  ℹ Registry builder not found (optional)');
  }
} catch (err) {
  console.log(`  ℹ Registry rebuild skipped: ${err.message}`);
}

console.log('\n' + '═'.repeat(60));
console.log(`✅ MIGRATION COMPLETE - ${updated} talents classified`);
console.log('═'.repeat(60));
