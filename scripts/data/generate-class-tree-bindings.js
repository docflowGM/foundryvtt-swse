/**
 * Generate class-talent-tree-bindings from raw compendium data
 * Maps class names to their talent tree IDs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Read JSONL compendium file
 */
function readCompendium(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.error(`Failed to parse line: ${line.substring(0, 100)}`);
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Normalize talent tree name to ID (same logic as TalentTreeNormalizer)
 */
function normalizeTreeName(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '') // Remove smart quotes
    .replace(/\W+/g, '_') // Replace non-word chars with underscore
    .replace(/^_+|_+$/g, ''); // Trim underscores
}

/**
 * Main function
 */
function generateBindings() {
  console.log('📖 Reading compendiums...');

  // Read raw data
  const classesPath = path.join(__dirname, '../../packs/classes.db');
  const treesPath = path.join(__dirname, '../../packs/talent_trees.db');

  const classes = readCompendium(classesPath);
  const trees = readCompendium(treesPath);

  console.log(`  ✓ Loaded ${classes.length} classes`);
  console.log(`  ✓ Loaded ${trees.length} talent trees`);

  // Build name → ID map for talent trees
  const treeNameToId = {};
  trees.forEach(tree => {
    const id = normalizeTreeName(tree.name);
    treeNameToId[tree.name] = id;
    console.log(`  Mapped: "${tree.name}" → "${id}"`);
  });

  // Generate bindings
  console.log('\n🔗 Generating class-talent-tree bindings...');

  const bindings = classes.map(cls => {
    const treeNames = cls.system?.talent_trees || [];
    const treeIds = treeNames
      .map(name => treeNameToId[name])
      .filter(Boolean);

    const binding = {
      class: cls.name,
      treeIds
    };

    if (treeIds.length > 0) {
      console.log(`  ${cls.name}`);
      treeIds.forEach(id => console.log(`    → ${id}`));
    } else {
      console.warn(`  ⚠️ ${cls.name} has no mapped talent trees`);
    }

    return binding;
  });

  // Write output
  const outputPath = path.join(__dirname, '../../data/generated/class-talent-tree-bindings.json');
  fs.writeFileSync(outputPath, JSON.stringify(bindings, null, 2));

  console.log(`\n✅ Generated: ${outputPath}`);
  console.log(`   ${bindings.length} classes`);
  console.log(`   ${bindings.reduce((sum, b) => sum + b.treeIds.length, 0)} total tree assignments`);
}

generateBindings();
