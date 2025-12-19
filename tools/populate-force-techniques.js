#!/usr/bin/env node

/**
 * Script to populate Force Techniques compendium from force-techniques.json
 * Converts JSON data to NDJSON format used by FoundryVTT compendiums
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Paths
const INPUT_FILE = path.join(__dirname, '../data/force-techniques.json');
const OUTPUT_FILE = path.join(__dirname, '../packs/forcetechniques.db');

// Generate a random 16-character hex ID (similar to FoundryVTT IDs)
function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

// Build HTML description from technique data
function buildDescription(technique) {
  let description = `<p>${technique.description}</p>`;

  if (technique.special) {
    description += `<p><strong>Special:</strong> ${technique.special}</p>`;
  }

  if (technique.relatedPower) {
    description += `<p><strong>Related Power:</strong> ${technique.relatedPower}</p>`;
  }

  // Build prerequisites: include both manual prerequisites and related power
  const allPrerequisites = [...(technique.prerequisites || [])];
  if (technique.relatedPower && !allPrerequisites.includes(technique.relatedPower)) {
    allPrerequisites.push(technique.relatedPower);
  }

  if (allPrerequisites.length > 0) {
    description += `<p><strong>Prerequisites:</strong> ${allPrerequisites.join(', ')}</p>`;
  }

  return description;
}

// Convert technique to FoundryVTT item format
function convertTechnique(technique) {
  const description = buildDescription(technique);

  // Build prerequisites string
  const allPrerequisites = [...(technique.prerequisites || [])];
  if (technique.relatedPower && !allPrerequisites.includes(technique.relatedPower)) {
    allPrerequisites.push(technique.relatedPower);
  }
  const prerequisiteString = allPrerequisites.join(', ');

  return {
    _id: generateId(),
    name: technique.name,
    type: 'feat',
    img: 'systems/foundryvtt-swse/assets/icons/force-technique.png',
    system: {
      featType: 'force',
      benefit: technique.description,
      prerequisite: prerequisiteString,
      special: technique.special || '',
      normalText: '',
      sourcebook: technique.source || '',
      page: 0,
      tags: ['force-technique'],
      bonus_feat_for: [],
      uses: {
        current: 0,
        max: 0,
        perDay: false
      },
      description: description,
      relatedPower: technique.relatedPower || ''
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: {
      default: 0
    },
    flags: {}
  };
}

// Main conversion
function main() {
  console.log('Reading force-techniques.json...');
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

  console.log(`Found ${data.techniques.length} Force Techniques`);

  // Convert each technique
  const items = data.techniques.map(technique => {
    console.log(`  - Converting: ${technique.name}`);
    return convertTechnique(technique);
  });

  // Write as NDJSON (one JSON object per line)
  console.log(`\nWriting to ${OUTPUT_FILE}...`);
  const ndjson = items.map(item => JSON.stringify(item)).join('\n') + '\n';
  fs.writeFileSync(OUTPUT_FILE, ndjson, 'utf8');

  console.log(`✓ Successfully created ${items.length} Force Techniques in compendium`);

  // Show file size
  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`✓ Compendium size: ${stats.size} bytes`);
}

// Run
try {
  main();
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
