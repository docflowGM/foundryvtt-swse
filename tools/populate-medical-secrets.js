#!/usr/bin/env node

/**
 * Script to populate Medical Secrets compendium from medical-secrets.json
 * Converts JSON data to NDJSON format used by FoundryVTT compendiums
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Paths
const INPUT_FILE = path.join(__dirname, '../data/medical-secrets.json');
const OUTPUT_FILE = path.join(__dirname, '../packs/medicalsecrets.db');

// Generate a random 16-character hex ID (similar to FoundryVTT IDs)
function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

// Build HTML description from secret data
function buildDescription(secret) {
  let description = `<p>${secret.description}</p>`;

  if (secret.special) {
    description += `<p><strong>Special:</strong> ${secret.special}</p>`;
  }

  if (secret.prerequisites && secret.prerequisites.length > 0) {
    description += `<p><strong>Prerequisites:</strong> ${secret.prerequisites.join(', ')}</p>`;
  }

  return description;
}

// Convert secret to FoundryVTT item format
function convertSecret(secret) {
  const description = buildDescription(secret);

  // Build tags array - always include 'medical-secret', add 'homebrew' if applicable
  const tags = ['medical-secret'];
  if (secret.homebrew) {
    tags.push('homebrew');
  }

  return {
    _id: generateId(),
    name: secret.name,
    type: 'feat',
    img: 'systems/foundryvtt-swse/assets/icons/medical-secret.png',
    system: {
      featType: 'medical',
      benefit: secret.description,
      prerequisite: secret.prerequisites ? secret.prerequisites.join(', ') : '',
      special: secret.special || '',
      normalText: '',
      sourcebook: secret.source || 'Core',
      page: 0,
      tags: tags,
      bonus_feat_for: [],
      uses: {
        current: 0,
        max: 0,
        perDay: false
      },
      description: description,
      homebrew: secret.homebrew || false
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
  console.log('Reading medical-secrets.json...');
  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

  console.log(`Found ${data.secrets.length} Medical Secrets`);

  // Convert each secret
  const items = data.secrets.map(secret => {
    console.log(`  - Converting: ${secret.name}`);
    return convertSecret(secret);
  });

  // Write as NDJSON (one JSON object per line)
  console.log(`\nWriting to ${OUTPUT_FILE}...`);
  const ndjson = items.map(item => JSON.stringify(item)).join('\n') + '\n';
  fs.writeFileSync(OUTPUT_FILE, ndjson, 'utf8');

  console.log(`✓ Successfully created ${items.length} Medical Secrets in compendium`);

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
